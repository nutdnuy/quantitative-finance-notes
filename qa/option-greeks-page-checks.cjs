const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');

const root = path.resolve(process.env.GREEKS_QA_ROOT || path.join(__dirname, '..'));
const base = process.env.BASE_URL || process.env.GREEKS_QA_BASE || 'http://127.0.0.1:8763';
const slug = 'option-greeks';
const reportPath = path.join(__dirname, 'option-greeks-page-report.json');
const figures = ['option-greeks-taylor', 'option-greeks-higher-profiles', 'option-greeks-delta-probability'];
const labIds = ['greeks-shock-lab', 'greeks-conventions-lab', 'greeks-higher-lab'];
const terms = [
  { id: 'vanna', english: 'Vanna', thai: 'ความไวของ Delta', anchor: 'higher-greeks' },
  { id: 'vomma', english: 'Vomma', thai: 'ความโค้งของราคา', anchor: 'higher-greeks' },
  { id: 'cost-of-carry', english: 'Cost of carry', thai: 'อัตราถือครองสุทธิ', anchor: 'model-and-market' },
  { id: 'risk-neutral-density', english: 'risk neutral density', thai: 'ความหนาแน่นภายใต้มาตรวัด', anchor: 'probability-greeks' },
];
const displayed = (value, digits = 4) => value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

function textOutsideSvg(svg) {
  const bounds = svg.viewBox.baseVal;
  return [...svg.querySelectorAll('text')].flatMap(text => {
    const box = text.getBBox(), transform = text.getCTM();
    if (!transform) return [];
    // getBBox uses the text's own coordinates; account for translated groups.
    const inverse = svg.getCTM().inverse();
    const points = [[box.x, box.y], [box.x + box.width, box.y], [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]].map(([x, y]) => {
      const point = svg.createSVGPoint(); point.x = x; point.y = y;
      return point.matrixTransform(transform).matrixTransform(inverse);
    });
    const outside = points.some(point => point.x < bounds.x - 1 || point.x > bounds.x + bounds.width + 1 || point.y < bounds.y - 1 || point.y > bounds.y + bounds.height + 1);
    return outside ? [{ text: text.textContent, x: Math.min(...points.map(point => point.x)), right: Math.max(...points.map(point => point.x)), width: bounds.width }] : [];
  });
}

(async () => {
  const numerical = await import(pathToFileURL(path.join(root, 'src/option-greeks.mjs')).href);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const errors = [], report = { checks: [], interactions: [], states: [], figures: [], glossary: [], warnings: [] };
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  // Concurrent work can rebuild the book; keep the current interaction stable.
  await page.route('**/__version', route => route.fulfill({ body: 'option-greeks-qa-snapshot' }));
  async function ready() {
    await page.waitForFunction(ids => ids.every(id => document.querySelectorAll(`#${id} .lab`).length === 1), labIds);
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: 'html,*{scroll-behavior:auto!important}' });
    for (const image of await page.locator('.portfolio-figure img').all()) {
      await image.scrollIntoViewIfNeeded();
      await image.evaluate(element => element.decode());
    }
  }
  async function openLesson() { await page.goto(`${base}/${slug}.html`); await ready(); }
  async function keyboardValue(range, value) {
    const minimum = Number(await range.getAttribute('min')), step = Number(await range.getAttribute('step'));
    await range.focus(); await page.keyboard.press('Home');
    for (let n = 0; n < Math.round((value - minimum) / step); n++) await page.keyboard.press('ArrowRight');
    assert.ok(Math.abs(Number(await range.inputValue()) - value) < 1e-8);
  }
  async function assertNumber(selector, value, digits = 4) {
    const expected = displayed(value, digits);
    await page.locator(selector).filter({ hasText: expected }).waitFor();
    const actual = (await page.locator(selector).innerText()).replace(/\s*ดอลลาร์$/, '').trim();
    assert.equal(actual, expected, selector);
  }
  async function verifyShock(kind) {
    const input = await page.locator('#greeks-shock-lab input').evaluateAll(inputs => inputs.map(element => Number(element.value)));
    const [S, volatility, days, ds, dvol] = input;
    const parameters = { S, K: 100, r: .05, b: .05, sigma: volatility / 100, T: days / 365, kind };
    const result = numerical.optionGreeks(parameters), dv = dvol / 100;
    const first = result.delta * ds + result.vega * dv;
    const second = first + .5 * result.gamma * ds ** 2 + result.vanna * ds * dv + .5 * result.vomma * dv ** 2;
    const exact = numerical.optionGreeks({ ...parameters, S: S + ds, sigma: parameters.sigma + dv }).price - result.price;
    for (const [key, expected] of [['exact', exact], ['first', first], ['second', second], ['vega-point', result.vega / 100]]) await assertNumber(`[data-greeks-shock="${key}"]`, expected);
  }
  async function verifyConvention(kind) {
    const [S, carry, T, fraction] = await page.locator('#greeks-conventions-lab input').evaluateAll(inputs => inputs.map(element => Number(element.value)));
    const parameters = { S, K: 100, r: .05, b: carry / 100, sigma: .2, T, kind };
    const result = numerical.optionGreeks(parameters), delta = (kind === 'call' ? 1 : -1) * result.A * fraction / 100;
    const strike = numerical.strikeFromDelta({ ...parameters, delta });
    await assertNumber('[data-greeks-conventions="delta"]', result.delta);
    await assertNumber('[data-greeks-conventions="strike"]', strike);
    await assertNumber('[data-greeks-conventions="mirror"]', numerical.deltaMirror({ ...parameters, K: strike }));
    await assertNumber('[data-greeks-conventions="probability-mirror"]', numerical.probabilityMirror({ ...parameters, K: strike }));
    assert.equal(await page.locator('[data-greeks-conventions="probability"]').innerText(), `${displayed(result.itmProbability * 100, 2)}%`);
  }
  async function verifyHigher(kind, metric) {
    const [S, volatility, days] = await page.locator('#greeks-higher-lab input').evaluateAll(inputs => inputs.map(element => Number(element.value)));
    const result = numerical.optionGreeks({ S, K: 100, r: .05, b: .05, sigma: volatility / 100, T: days / 365, kind });
    const scale = { gamma: 1, vanna: .01, vomma: .0001, charm: 1 / 365 }[metric];
    await assertNumber('[data-greeks-higher="selected"]', result[metric] * scale, 6);
    await assertNumber('[data-greeks-higher="delta"]', result.delta);
    await assertNumber('[data-greeks-higher="vega-point"]', result.vega / 100);
    await assertNumber('[data-greeks-higher="theta-day"]', result.theta / 365);
    assert.match(await page.locator('#greeks-higher-lab svg title').textContent(), new RegExp(`${metric}.*${kind}`, 'i'));
  }
  async function capture(selector, name) {
    // Tall element screenshots otherwise place the sticky mobile header across
    // the middle of the captured element. This affects capture only, not QA.
    await page.locator(selector).screenshot({ path: path.join(__dirname, `option-greeks-${name}.png`), style: '.book-mobile-header{visibility:hidden!important}' });
  }

  try {
    await openLesson();
    assert.equal(await page.locator('.katex-error').count(), 0);
    report.katexCount = await page.locator('.katex').count(); assert.ok(report.katexCount > 50);
    assert.equal(await page.locator('.lab').count(), 3);
    assert.equal(await page.locator('.portfolio-figure img').count(), 3);
    assert.ok(await page.locator('.portfolio-figure img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)));
    await verifyShock('call'); await verifyConvention('call'); await verifyHigher('call', 'gamma');
    // These BSM benchmark values are independent fixed regression expectations.
    assert.match(await page.locator('#greeks-shock-lab .results p').first().innerText(), /ราคาเดิม 10\.4506/);
    await assertNumber('[data-greeks-conventions="delta"]', .6368);
    assert.equal(await page.locator('[data-greeks-conventions="probability"]').innerText(), '55.96%');
    await assertNumber('[data-greeks-higher="selected"]', .018762, 6);
    await assertNumber('[data-greeks-higher="vega-point"]', .3752);
    report.checks.push('Three lab mounts; all displayed defaults match numerical engine; independent BSM price/Delta/probability/Gamma/Vega benchmarks');

    for (const kind of ['call', 'put']) {
      const buttonName = kind === 'call' ? 'Call' : 'Put';
      for (const id of labIds) {
        const button = page.locator(`#${id}`).getByRole('button', { name: buttonName, exact: true });
        await button.focus(); await page.keyboard.press('Enter'); assert.equal(await button.getAttribute('aria-pressed'), 'true');
      }
      await verifyShock(kind); await verifyConvention(kind);
      for (const [metric, label] of [['gamma', 'Gamma'], ['vanna', 'Vanna'], ['vomma', 'Vomma'], ['charm', 'Charm']]) {
        const button = page.locator('#greeks-higher-lab').getByRole('button', { name: label, exact: true });
        await button.focus(); await page.keyboard.press('Space'); assert.equal(await button.getAttribute('aria-pressed'), 'true');
        await verifyHigher(kind, metric);
        report.interactions.push({ kind, metric, selected: await page.locator('[data-greeks-higher="selected"]').innerText() });
      }
    }
    for (const id of labIds) {
      const lab = page.locator(`#${id}`);
      for (const input of await lab.locator('input[type="range"]').all()) {
        const label = await input.evaluate(element => document.querySelector(`label[for="${CSS.escape(element.id)}"]`).textContent);
        for (const [key, attribute] of [['Home', 'min'], ['End', 'max']]) {
          await input.focus(); await page.keyboard.press(key);
          assert.ok(Math.abs(Number(await input.inputValue()) - Number(await input.getAttribute(attribute))) < 1e-8, `${id} ${label} ${key}`);
          if (id === 'greeks-shock-lab') await verifyShock('put');
          if (id === 'greeks-conventions-lab') await verifyConvention('put');
          if (id === 'greeks-higher-lab') await verifyHigher('put', 'charm');
          assert.ok((await lab.innerText()).match(/NaN|Infinity/) === null, `${id}: finite output`);
        }
        report.interactions.push({ lab: id, slider: label, endpoints: 'keyboard Home/End verified against model' });
      }
      await lab.getByRole('button', { name: /^คืนค่าเริ่มต้น/ }).click();
    }
    const shock = page.locator('#greeks-shock-lab');
    await keyboardValue(shock.locator('input[type="range"]').nth(3), 0);
    await keyboardValue(shock.locator('input[type="range"]').nth(4), 0);
    for (const kind of ['Call', 'Put']) {
      await shock.getByRole('button', { name: kind, exact: true }).click();
      for (const key of ['exact', 'first', 'second']) await assertNumber(`[data-greeks-shock="${key}"]`, 0);
    }
    await shock.getByRole('button', { name: /^คืนค่าเริ่มต้น/ }).click();
    report.checks.push('All Call/Put and four higher-Greek chart modes; all 12 slider minimum/maximum values by keyboard; all resets; zero-shock parity for Call and Put');

    for (const theme of ['light', 'dark']) for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1100 }); await openLesson();
      await page.evaluate(theme => document.documentElement.setAttribute('data-theme', theme), theme);
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const violations = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })));
      const overflow = await page.evaluate(() => ({ document: document.documentElement.scrollWidth > innerWidth, width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
      const clipped = [];
      for (const id of labIds) for (const svg of await page.locator(`#${id} svg`).all()) clipped.push(...await svg.evaluate(textOutsideSvg));
      for (const metric of ['Vanna', 'Vomma', 'Charm']) {
        await page.locator('#greeks-higher-lab').getByRole('button', { name: metric, exact: true }).click();
        clipped.push(...(await page.locator('#greeks-higher-lab svg').evaluate(textOutsideSvg)).map(item => ({ ...item, metric })));
      }
      await page.locator('#greeks-higher-lab').getByRole('button', { name: 'Gamma', exact: true }).click();
      report.states.push({ width, theme, overflow, violations, clippedText: clipped });
      assert.equal(overflow.document, false, `${width} ${theme} document overflow`);
      assert.deepEqual(violations, [], `${width} ${theme} WCAG AA`);
      assert.deepEqual(clipped, [], `${width} ${theme} SVG text bounds`);
      if (width === 390 || width === 1440) {
        await capture('#option-greeks-title', `${theme}-${width}-title`);
        for (const id of labIds) await capture(`#${id}`, `${theme}-${width}-${id}`);
        for (const figure of figures) await capture(`.portfolio-figure:has(img[src*="${figure}"])`, `${theme}-${width}-${figure.replace('option-greeks-', '')}`);
      }
    }
    report.checks.push('Light/dark desktop/tablet/mobile at 320, 390, 768, 1440: automated WCAG AA, document overflow and live SVG text bounds');
    const assetPage = await browser.newPage({ viewport: { width: 1100, height: 850 } });
    for (const figure of figures) {
      await assetPage.goto(`${base}/assets/images/${figure}.svg`); await assetPage.evaluate(() => document.fonts.ready);
      const clipped = await assetPage.locator('svg').evaluate(textOutsideSvg);
      report.figures.push({ file: `${figure}.svg`, clippedText: clipped }); assert.deepEqual(clipped, [], figure);
      await assetPage.locator('svg').screenshot({ path: path.join(__dirname, `option-greeks-source-${figure.replace('option-greeks-', '')}.png`) });
    }
    await assetPage.close();

    await page.setViewportSize({ width: 390, height: 1100 });
    for (const term of terms) {
      await page.goto(`${base}/glossary.html#${term.id}`); await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator(`#${term.id}`).isVisible(), true);
      for (const query of [term.english, term.thai]) { await page.locator('#glossary-query').fill(query); assert.equal(await page.locator(`#${term.id}`).isVisible(), true, `${term.id}: ${query}`); }
      await page.locator('#glossary-query').fill('zzzz-no-such-option-greeks-term');
      assert.match(await page.locator('#glossary-status').innerText(), /ไม่พบ/); assert.equal(await page.locator('.glossary-term:visible').count(), 0);
      await page.locator('#glossary-query').focus(); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.press('Backspace');
      assert.equal(await page.locator(`#${term.id}`).isVisible(), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.locator(`#${term.id} a`).focus(); await page.keyboard.press('Enter');
      await page.waitForURL(`**/${slug}.html#${term.anchor}`); await ready(); assert.equal(await page.locator(`#${term.anchor}`).count(), 1);
      report.glossary.push(term);
    }
    await page.setViewportSize({ width: 1440, height: 1100 }); await openLesson();
    await page.getByRole('button', { name: 'Search', exact: false }).click();
    for (const query of ['Vanna', 'Know Your Weapon', 'ความไว']) {
      await page.getByRole('searchbox').fill(query);
      assert.ok(await page.locator(`#search-results a[href*="${slug}"]`).count() > 0, `site search ${query}`);
    }
    await page.keyboard.press('Escape'); assert.equal(await page.locator('#search-dialog').isVisible(), false);
    report.checks.push('Four glossary direct anchors, Thai/English/no-match/empty search and keyboard return links; global search English/title/Thai and Escape');

    const references = await page.locator('a[href], img[src], script[src], link[href]').evaluateAll(elements => elements.map(element => ({ raw: element.getAttribute('href') || element.getAttribute('src'), url: new URL(element.getAttribute('href') || element.getAttribute('src'), location.href).href })).filter(item => new URL(item.url).origin === location.origin));
    for (const reference of references) {
      const url = new URL(reference.url), local = path.join(root, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
      assert.ok(fs.existsSync(local), `Missing local reference: ${reference.raw}`);
      if (url.hash && local.endsWith('.html')) assert.ok(fs.readFileSync(local, 'utf8').includes(`id="${decodeURIComponent(url.hash.slice(1))}"`), `Missing anchor: ${reference.raw}`);
    }
    report.localReferencesChecked = references.length;
    assert.ok(await page.locator(`.book-sidebar a[href="${slug}.html"]`).count() > 0);
    await page.goto(base); assert.equal(await page.locator(`.welcome-text-link[href="${slug}.html"]`).count(), 1);
    report.checks.push('All local links/assets and target anchors from chapter page; current Welcome and sidebar entries without a hardcoded lesson count');

    const exportPath = path.join(root, '_site', `${slug}.html`);
    assert.ok(fs.existsSync(exportPath), 'Exported option-greeks.html is required for offline QA');
    report.exportAssetsCurrent = ['app.js', ...figures.map(figure => `assets/images/${figure}.svg`)].every(file => fs.existsSync(path.join(root, '_site', file)) && fs.readFileSync(path.join(root, file)).equals(fs.readFileSync(path.join(root, '_site', file))));
    if (!report.exportAssetsCurrent) report.warnings.push('Concurrent edits: export app/assets differ from current root build; offline export tested separately. Rebuild final export before publishing.');
    await page.goto(pathToFileURL(exportPath).href); await ready();
    await verifyShock('call'); await verifyConvention('call'); await verifyHigher('call', 'gamma');
    assert.ok(await page.locator('.portfolio-figure img').evaluateAll(images => images.length === 3 && images.every(image => image.complete && image.naturalWidth > 0)));
    const notebook = JSON.parse(fs.readFileSync(path.join(root, 'notebooks', `${slug}.ipynb`), 'utf8'));
    const sourceHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, `${slug}.md`))).digest('hex');
    assert.equal(notebook.metadata.source.sha256, sourceHash);
    const codeCells = notebook.cells.filter(cell => cell.cell_type === 'code');
    assert.equal(codeCells.length, 13);
    const attachments = notebook.cells.reduce((count, cell) => count + Object.keys(cell.attachments || {}).length, 0); assert.equal(attachments, 3);
    assert.ok(codeCells.every(cell => Number.isInteger(cell.execution_count) && cell.execution_count > 0 && cell.outputs.every(output => output.output_type !== 'error')));
    report.notebook = { sourceHash, executedCells: codeCells.length, embeddedImages: attachments };
    report.checks.push('Offline exported page: three mounted interactive labs and figures; Notebook current source hash, 13 executed code cells, no errors and 3 embedded figures');
    report.errors = errors; assert.deepEqual(errors, []); report.status = 'passed';
  } catch (error) {
    report.status = 'failed'; report.failure = error.stack; report.errors = errors;
    await page.screenshot({ path: path.join(__dirname, 'option-greeks-failure.png'), fullPage: false }).catch(() => {});
    throw error;
  } finally {
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2)); await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
