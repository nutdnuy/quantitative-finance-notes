const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const base = process.env.BLACK_SCHOLES_PREVIEW_URL || 'http://127.0.0.1:8763';
const chapter = 'black-scholes-model.html';
const notebook = 'notebooks/black-scholes-model.ipynb';
const labIds = ['black-scholes-price-lab', 'black-scholes-hedge-lab'];
const axePath = require.resolve('axe-core/axe.min.js');
const report = { status: 'running', checks: [], states: [], failures: [], pageErrors: [], failedResponses: [], externalRequests: [] };
const close = (actual, expected, tolerance = .0001) => assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance, `${actual} != ${expected} (tolerance ${tolerance})`);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => report.pageErrors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) report.failedResponses.push({ url: response.url(), status: response.status() }); });
  page.on('request', request => { if (!request.url().startsWith(base) && !/^(file:|data:|blob:)/.test(request.url())) report.externalRequests.push(request.url()); });
  const number = async (kind, key) => parseFloat((await page.locator(`[data-${kind}="${key}"]`).innerText()).replaceAll(',', '').replaceAll('−', '-'));
  async function check(name, action) {
    try { await action(); report.checks.push(name); }
    catch (error) { report.failures.push({ name, message: error.message }); }
  }
  async function loadChapter(url = `${base}/${chapter}`) {
    await page.goto(url, { waitUntil: 'networkidle' });
    for (const id of labIds) await page.locator(`#${id} .lab`).waitFor();
    await page.evaluate(() => document.fonts.ready);
  }
  async function menu(open) {
    if (page.viewportSize().width <= 800 && (await page.locator('#menu-button').getAttribute('aria-expanded') === 'true') !== open) await page.locator('#menu-button').click();
  }
  async function theme(value) {
    if (await page.locator('html').getAttribute('data-theme') !== value) { await menu(true); await page.locator('#theme-button').click(); }
    await menu(false);
  }
  async function chartGeometry() {
    const charts = page.locator(labIds.map(id => `#${id} .chart svg`).join(','));
    assert.equal(await charts.count(), 2);
    const issues = await charts.evaluateAll(items => items.flatMap(svg => {
      const width = svg.viewBox.baseVal.width, height = svg.viewBox.baseVal.height, errors = [];
      if (!svg.querySelector('title')?.textContent || !svg.querySelector('desc')?.textContent) errors.push('Chart requires accessible title and description');
      for (const shape of svg.querySelectorAll('polyline, circle')) {
        const points = shape.tagName === 'circle' ? [[Number(shape.getAttribute('cx')), Number(shape.getAttribute('cy'))]] : shape.getAttribute('points').trim().split(/\s+/).map(pair => pair.split(',').map(Number));
        if (points.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y) || x < 51 - .02 || x > width - 20 + .02 || y < 30 - .02 || y > height - 48 + .02)) errors.push('Invalid or clipped chart data');
      }
      return errors;
    }));
    assert.deepEqual(issues, []);
  }
  async function outputsFit() {
    const issues = await page.locator('[data-bs], [data-bs-hedge]').evaluateAll(items => items.flatMap(element => {
      const rect = element.getBoundingClientRect(), lab = element.closest('.lab').getBoundingClientRect();
      const parent = element.closest('.results > div, .calculation-strip')?.getBoundingClientRect();
      const text = element.textContent;
      return (!text.trim() || /NaN|Infinity|null|undefined/.test(text) || element.scrollWidth > element.clientWidth + 2 && getComputedStyle(element).display === 'block' || rect.left < lab.left || rect.right > lab.right + 2 || parent && rect.right > parent.right + 2) ? [{ text, width: rect.width, parentWidth: parent?.width }] : [];
    }));
    assert.deepEqual(issues, [], 'All numeric outputs must fit their containers');
  }
  async function scan(name, onChapter = true) {
    await page.evaluate(() => document.fonts.ready);
    await page.addScriptTag({ path: axePath });
    const result = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
    const overflow = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    report.states.push({ name, overflow, violations: result.violations.map(v => ({ id: v.id, impact: v.impact, targets: v.nodes.map(n => n.target) })) });
    if (onChapter) {
      await chartGeometry(); await outputsFit();
      for (const id of labIds) {
        const lab = page.locator('#' + id); await lab.scrollIntoViewIfNeeded();
        await lab.screenshot({ path: path.join(__dirname, `${name}-${id}.png`), style: '.book-mobile-header { visibility: hidden !important; }' });
      }
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(__dirname, `${name}.png`), fullPage: true });
    assert.ok(overflow.scrollWidth <= overflow.width, `${name}: horizontal page overflow`);
    assert.deepEqual(result.violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => v.id), [], `${name}: serious/critical accessibility violations`);
  }
  async function priceInteractions() {
    const lab = page.locator('#black-scholes-price-lab'), reset = lab.getByRole('button', { name: 'คืนค่าเริ่มต้นของราคา Black–Scholes', exact: true });
    await reset.click();
    close(await number('bs', 'price'), 10.4506); close(await number('bs', 'delta'), .6368);
    close(await number('bs', 'cash'), -53.2325); close(await number('bs', 'gamma'), .018762, .000001);
    close(await number('bs', 'd1'), .35); close(await number('bs', 'd2'), .15); close(await number('bs', 'vega-point'), .3752);
    const baseline = await lab.locator('.results, .calculation-strip').allTextContents();
    const put = lab.getByRole('button', { name: 'Put: สิทธิขาย', exact: true });
    await put.focus(); await put.press('Space'); assert.equal(await put.getAttribute('aria-pressed'), 'true');
    close(await number('bs', 'price'), 5.5735); close(await number('bs', 'delta'), -.3632);
    assert.ok(await number('bs', 'cash') > 0); await chartGeometry(); await outputsFit();
    for (const label of ['ราคาหุ้น S', 'ราคาใช้สิทธิ K', 'Volatility σ', 'เวลาคงเหลือ τ', 'ดอกเบี้ย r ทบต้นต่อเนื่อง']) {
      await reset.click();
      const slider = lab.getByRole('slider', { name: label, exact: true });
      await slider.focus(); await slider.press('Home'); assert.equal(await slider.inputValue(), await slider.getAttribute('min'));
      await chartGeometry(); await outputsFit();
      await slider.press('ArrowRight'); close(Number(await slider.inputValue()), Number(await slider.getAttribute('min')) + Number(await slider.getAttribute('step')));
      await slider.press('End'); assert.equal(await slider.inputValue(), await slider.getAttribute('max'));
      await chartGeometry(); await outputsFit();
      if (label !== 'ราคาใช้สิทธิ K') assert.ok(await number('bs', 'price') > 10.4506, `${label} should raise this default Call price`);
      else assert.ok(await number('bs', 'price') < 10.4506);
    }
    await reset.click(); assert.deepEqual(await lab.locator('.results, .calculation-strip').allTextContents(), baseline);
    for (const line of await lab.locator('polyline:not(.event-line)').all()) assert.equal(await line.evaluate(shape => shape.getAttribute('points').trim().split(/\s+/).length), 101);
    const tangent = await lab.locator('polyline.event-line').evaluate(shape => shape.getAttribute('points').trim().split(/\s+/).map(pair => pair.split(',').map(Number)));
    assert.equal(tangent.length, 3);
    const marker = await lab.locator('circle.expected-point').evaluate(shape => [Number(shape.getAttribute('cx')), Number(shape.getAttribute('cy'))]);
    close(tangent[1][0], marker[0]); close(tangent[1][1], marker[1]);
  }
  async function hedgeInteractions() {
    const lab = page.locator('#black-scholes-hedge-lab'), reset = lab.getByRole('button', { name: 'คืนค่าเริ่มต้นของ Delta hedge', exact: true });
    await reset.click(); close(await number('bs-hedge', 'initial-value'), 10.4506);
    close(await number('bs-hedge', 'terminal-stock'), 87.2349); close(await number('bs-hedge', 'wealth'), .5333); close(await number('bs-hedge', 'payoff'), 0);
    const baseline = await lab.locator('.results').innerText(), terminal = await number('bs-hedge', 'terminal-stock');
    const first = lab.getByRole('button', { name: '16 step', exact: true });
    await first.focus(); await first.press('Space'); assert.equal(await first.getAttribute('aria-pressed'), 'true');
    await page.keyboard.press('Tab'); await page.keyboard.press('Enter'); assert.equal(await lab.getByRole('button', { name: '64 step', exact: true }).getAttribute('aria-pressed'), 'true');
    for (const [n, error] of [[16, .8661], [64, .5333], [256, .2207]]) {
      await lab.getByRole('button', { name: `${n} step`, exact: true }).click();
      close(await number('bs-hedge', 'terminal-stock'), terminal); close(await number('bs-hedge', 'error'), error);
      close(await number('bs-hedge', 'wealth') - await number('bs-hedge', 'payoff'), await number('bs-hedge', 'error'), .0002);
      for (const line of await lab.locator('polyline').all()) assert.equal(await line.evaluate(shape => shape.getAttribute('points').trim().split(/\s+/).length), n + 1);
      await chartGeometry(); await outputsFit();
    }
    const put = lab.getByRole('button', { name: 'Hedge Put', exact: true }); await put.click();
    close(await number('bs-hedge', 'initial-value'), 5.5735); close(await number('bs-hedge', 'payoff'), 100 - terminal); close(await number('bs-hedge', 'error'), .2207);
    await lab.getByRole('button', { name: 'สุ่มเส้นทางสำหรับ Delta hedge ใหม่', exact: true }).click();
    assert.notEqual(await number('bs-hedge', 'terminal-stock'), terminal); assert.match(await lab.locator('.seed').innerText(), /74/);
    await chartGeometry(); await reset.click(); assert.equal(await lab.locator('.results').innerText(), baseline);
  }
  async function chapterLinks() {
    const refs = await page.locator('#content a[href], .book-sidebar-footer a[download]').evaluateAll(items => items.map(item => item.getAttribute('href')));
    let checked = 0, anchors = 0;
    for (const ref of [...new Set(refs)]) {
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(ref)) continue;
      const url = new URL(ref, pathToFileURL(path.join(root, chapter))), target = decodeURIComponent(url.pathname);
      assert.ok(fs.existsSync(target), `Missing ${ref}`);
      if (url.hash && target.endsWith('.html')) {
        const found = await page.evaluate(({ html, id }) => new DOMParser().parseFromString(html, 'text/html').getElementById(id) !== null, { html: fs.readFileSync(target, 'utf8'), id: decodeURIComponent(url.hash.slice(1)) });
        assert.equal(found, true, `Missing anchor ${ref}`); anchors++;
      }
      checked++;
    }
    report.localLinks = { checked, anchors };
  }
  try {
    await loadChapter();
    await check('Chapter title, two mounted labs, equation rendering, section anchors and Notebook links', async () => {
      assert.equal(await page.locator('h1').innerText(), 'Black-Scholes Model');
      const markdown = fs.readFileSync(path.join(root, 'black-scholes-model.md'), 'utf8');
      const equations = [...markdown.matchAll(/\$\$([\s\S]+?)\$\$/g)].length;
      assert.ok(equations >= 8); assert.equal(await page.locator('.katex-error').count(), 0); assert.equal(await page.locator('.equation .katex').count(), equations);
      assert.equal(await page.locator('.lab').count(), 2);
      for (const [, id] of markdown.matchAll(/<section[^>]+id="([^"]+)"/g)) assert.equal(await page.locator('section#' + id).count(), 1);
      assert.equal(await page.locator('.book-sidebar-footer a[download]').first().getAttribute('href'), notebook);
      assert.ok(await page.locator(`#content a[href="${notebook}"]`).count());
      assert.equal(await page.locator(`.book-nav a[href="${chapter}"]`).getAttribute('aria-current'), 'page');
    });
    for (const width of [1440, 360]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 }); await loadChapter();
      await check(`Price lab defaults, Call/Put, all slider endpoints, keyboard and reset at ${width}px`, priceInteractions);
      await check(`Hedge lab nested grids, path identity, Call/Put, keyboard and seed/reset at ${width}px`, hedgeInteractions);
      await check(`Expandable explanations and horizontal equations remain keyboard-accessible at ${width}px`, async () => {
        for (const detail of await page.locator('#content details').all()) {
          if (await detail.getAttribute('open') === null) { await detail.locator('summary').focus(); await page.keyboard.press('Enter'); }
          assert.notEqual(await detail.getAttribute('open'), null);
        }
        for (const equation of await page.locator('.equation').all()) {
          assert.equal(await equation.getAttribute('tabindex'), '0');
          if (await equation.evaluate(element => element.scrollWidth > element.clientWidth + 1)) {
            await equation.focus(); await equation.press('ArrowRight');
            await page.waitForFunction(element => element.scrollLeft > 0, await equation.elementHandle());
            await equation.evaluate(element => { element.scrollLeft = 0; });
          }
        }
      });
      for (const mode of ['light', 'dark']) { await theme(mode); await check(`Chapter ${width}px ${mode}: readable outputs, plot geometry, overflow and accessibility`, () => scan(`black-scholes-${width}-${mode}`)); }
    }
    await loadChapter();
    await check('Chapter links and glossary anchors resolve to generated local files', chapterLinks);
    const glossaryRefs = [...new Set(await page.locator('#content a[href^="glossary.html#"]').evaluateAll(items => items.map(item => item.getAttribute('href'))))];
    await check('Referenced glossary entries are visible on direct links and their lesson return links exist', async () => {
      assert.ok(glossaryRefs.length >= 3);
      for (const ref of glossaryRefs) {
        await page.goto(`${base}/${ref}`);
        const id = ref.split('#')[1], entry = page.locator('.glossary-term#' + id);
        assert.equal(await entry.isVisible(), true, ref);
        const href = await entry.locator('a[href]').last().getAttribute('href');
        const target = new URL(href, pathToFileURL(path.join(root, 'glossary.html')));
        assert.ok(fs.existsSync(decodeURIComponent(target.pathname)), href);
      }
    });
    await check('New glossary term search, empty results, keyboard and direct-anchor recovery', async () => {
      await page.goto(`${base}/glossary.html`);
      const newTerm = await page.locator(`.glossary-term:has(a[href^="${chapter}#"])`).first().getAttribute('id');
      const entry = page.locator('.glossary-term#' + newTerm), input = page.locator('#glossary-query');
      const title = await entry.locator('h3').innerText(), [english, thai] = title.split(/\s+—\s+/);
      for (const query of [english, thai].filter(Boolean)) { await input.fill(query); assert.equal(await entry.isVisible(), true); }
      await input.fill('unmatched-black-scholes-term'); assert.equal(await page.locator('.glossary-term:visible').count(), 0);
      await input.focus(); await input.press('ControlOrMeta+a'); await input.press('Backspace'); assert.ok(await page.locator('.glossary-term:visible').count() > 10);
      await input.fill('another-unmatched-term'); await page.evaluate(id => { location.hash = id; }, newTerm);
      await page.waitForFunction(() => document.querySelector('#glossary-query').value === ''); assert.equal(await entry.isVisible(), true);
      const back = entry.locator(`a[href^="${chapter}#"]`).first(); await back.focus(); await page.keyboard.press('Enter');
      await page.waitForURL('**/' + chapter + '#*'); assert.equal(await page.locator(new URL(page.url()).hash).count(), 1);
    });
    await page.goto(`${base}/glossary.html`); await theme('light');
    await check('Glossary at 360px: overflow and accessibility', () => scan('black-scholes-glossary-360-light', false));
    await check('New chapter can be found through site search', async () => {
      await page.keyboard.press('Control+k'); await page.locator('#search-input').fill('Black');
      const result = page.locator(`#search-results a[href^="${chapter}"]`).first(); assert.equal(await result.isVisible(), true);
      await result.focus(); await page.keyboard.press('Enter'); await page.waitForURL('**/' + chapter + '*');
      await page.keyboard.press('Control+k'); await page.keyboard.press('Escape'); assert.equal(await page.locator('#search-dialog').evaluate(dialog => dialog.open), false);
    });
    await check('Executed Notebook has correct header and is included in the Pages export', async () => {
      const source = fs.readFileSync(path.join(root, notebook), 'utf8'), nb = JSON.parse(source);
      assert.equal(nb.nbformat, 4); assert.match(nb.cells.filter(cell => cell.cell_type === 'markdown').map(cell => Array.isArray(cell.source) ? cell.source.join('') : cell.source).join('\n'), /Black[–-]Scholes Model/);
      const code = nb.cells.filter(cell => cell.cell_type === 'code' && (Array.isArray(cell.source) ? cell.source.join('') : cell.source).trim());
      assert.ok(code.length >= 2); for (const cell of code) { assert.ok(Number.isInteger(cell.execution_count)); assert.equal(cell.outputs.some(output => output.output_type === 'error'), false); }
      assert.equal(fs.readFileSync(path.join(root, '_site', notebook), 'utf8'), source);
      report.notebook = { executedCodeCells: code.length, bytes: Buffer.byteLength(source) };
    });
    await check('Offline exported chapter runs both labs and search without network requests', async () => {
      const requests = [], record = request => { if (/^https?:/.test(request.url())) requests.push(request.url()); };
      page.on('request', record);
      try {
        await loadChapter(pathToFileURL(path.join(root, '_site', chapter)).href);
        await priceInteractions(); await hedgeInteractions();
        await page.keyboard.press('Control+k'); await page.locator('#search-input').fill('Black'); assert.ok(await page.locator(`#search-results a[href^="${chapter}"]`).count()); await page.keyboard.press('Escape');
      } finally { page.off('request', record); }
      assert.deepEqual(requests, []);
    });
  } catch (error) {
    report.failures.push({ name: 'QA setup or navigation', message: error.message });
  } finally {
    report.status = report.failures.length || report.pageErrors.length || report.failedResponses.length || report.externalRequests.length ? 'needs-fix' : 'passed';
    fs.writeFileSync(path.join(__dirname, 'black-scholes-browser-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ status: report.status, passedChecks: report.checks.length, scannedStates: report.states.length, failures: report.failures, pageErrors: report.pageErrors, failedResponses: report.failedResponses, externalRequests: report.externalRequests, localLinks: report.localLinks, notebook: report.notebook }, null, 2));
    await browser.close(); if (report.status !== 'passed') process.exitCode = 1;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
