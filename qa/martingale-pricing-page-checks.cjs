const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');

const root = path.resolve(process.env.MARTINGALE_QA_ROOT || path.join(__dirname, '..')), slug = 'martingale-pricing';
const base = process.env.MARTINGALE_QA_BASE || 'http://127.0.0.1:8763';
const chapters = require('yaml').parse(fs.readFileSync(path.join(root, '_toc.yml'), 'utf8')).chapters;
const lessonCount = chapters.filter(chapter => chapter.file !== 'glossary').length;
const chapterIndex = chapters.findIndex(chapter => chapter.file === slug);
const glossaryTerms = [
  ['filtration', 'filtration', 'ลำดับข้อมูล', 'market-and-information'],
  ['martingale', 'martingale', 'กระบวนการที่ค่าเฉลี่ยอนาคต', 'discounted-martingale'],
  ['radon-nikodym-density', 'radon nikodym', 'น้ำหนักสำหรับเปลี่ยนมาตรวัด', 'girsanov'],
  ['girsanov-theorem', 'girsanov', 'ทฤษฎีบทการเปลี่ยน', 'girsanov'],
  ['market-price-of-risk', 'market price of risk', 'ผลตอบแทนส่วนเกินต่อหน่วย', 'girsanov'],
  ['complete-market', 'complete market', 'ตลาดที่เลียนแบบ', 'fundamental-pricing'],
  ['numeraire', 'numeraire', 'หน่วยสินทรัพย์ที่ใช้วัดมูลค่า', 'numeraire'],
  ['feynman-kac', 'feynman kac', 'ความเชื่อมโยงระหว่าง', 'feynman-kac'],
  ['black-76', 'black 76', 'สูตร European Option', 'black-76'],
];
const displayed = value => value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });

(async () => {
  const numerical = await import(pathToFileURL(path.join(root, 'src/martingale-pricing.mjs')).href);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const errors = [], report = { states: [], checks: [], glossary: [] };
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  // A source edit during QA must not reload a partially tested interaction.
  await page.route('**/__version', route => route.fulfill({ body: 'martingale-qa-snapshot' }));
  async function ready() {
    await page.waitForFunction(() => document.querySelectorAll('.lab').length === 2);
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: 'html,*{scroll-behavior:auto!important}' });
  }
  async function openLesson() {
    await page.goto(`${base}/${slug}.html`);
    await ready();
  }
  async function capture(id, name) {
    await page.locator(id).evaluate(element => window.scrollTo({ top: element.getBoundingClientRect().top + scrollY - 65, behavior: 'instant' }));
    await page.screenshot({ path: path.join(__dirname, `martingale-${name}.png`) });
  }
  async function keyboardValue(range, value) {
    const minimum = Number(await range.getAttribute('min')), step = Number(await range.getAttribute('step'));
    await range.focus();
    await page.keyboard.press('Home');
    for (let n = 0; n < Math.round((value - minimum) / step); n++) await page.keyboard.press('ArrowRight');
    assert.equal(Number(await range.inputValue()), value);
  }
  async function verifyMeasure() {
    const values = await page.locator('#measure-change-lab input').evaluateAll(inputs => inputs.map(input => Number(input.value)));
    const model = numerical.measureChangeExperiment({ mu: values[0] / 100, r: values[1] / 100, sigma: values[2] / 100, tau: values[3] });
    for (const [id, expected] of [['measure-analytic', model.analytic.price], ['measure-physical', model.physicalCall.mean], ['measure-neutral', model.riskNeutralCall.mean], ['measure-weighted', model.weightedCall.mean]]) {
      await page.getByTestId(id).filter({ hasText: displayed(expected) }).waitFor();
      assert.equal(await page.getByTestId(id).innerText(), displayed(expected));
    }
    assert.ok(await page.locator('#measure-change-lab .lab-note').filter({ hasText: `SE ${model.weights.se.toFixed(4)}` }).count() > 0);
  }
  async function verifyExtension(mode, kind) {
    const values = await page.locator('#pricing-extensions-lab input').evaluateAll(inputs => inputs.map(input => Number(input.value)));
    const [underlying, K, r] = values;
    const sigma = values[mode === 'spot' ? 4 : 3] / 100, tau = values[mode === 'spot' ? 5 : 4];
    const model = mode === 'spot' ? numerical.generalizedEuropean({ S: underlying, K, R: r / 100 * tau, D: values[3] / 100 * tau, A: sigma ** 2 * tau, kind }) : numerical.black76({ F: underlying, K, R: r / 100 * tau, A: sigma ** 2 * tau, kind });
    await page.getByTestId('extension-price').filter({ hasText: displayed(model.price) }).waitFor();
    assert.equal(await page.getByTestId('extension-price').innerText(), displayed(model.price));
    assert.equal(await page.getByTestId('extension-parity').innerText(), displayed(model.call - model.put));
  }

  try {
    await openLesson();
    assert.equal(await page.locator('.katex-error').count(), 0);
    assert.ok(await page.locator('.katex').count() > 30);
    await verifyMeasure(); await verifyExtension('spot', 'call');
    assert.equal(await page.getByTestId('measure-analytic').innerText(), '10.4506');
    assert.equal(await page.getByTestId('extension-price').innerText(), '9.2270');
    const measure = page.locator('#measure-change-lab'), extensions = page.locator('#pricing-extensions-lab');
    const initialQ = await page.getByTestId('measure-neutral').innerText();
    const initialPhysical = await page.getByTestId('measure-physical').innerText();
    await measure.locator('input').first().focus(); await page.keyboard.press('Home'); await verifyMeasure();
    assert.equal(await page.getByTestId('measure-analytic').innerText(), '10.4506');
    assert.equal(await page.getByTestId('measure-neutral').innerText(), initialQ);
    assert.notEqual(await page.getByTestId('measure-physical').innerText(), initialPhysical);
    await keyboardValue(measure.locator('input').first(), 5); await verifyMeasure();
    const identical = await Promise.all(['measure-physical', 'measure-neutral', 'measure-weighted'].map(id => page.getByTestId(id).innerText()));
    assert.equal(identical[0], identical[1]); assert.equal(identical[1], identical[2]);
    for (let i = 0; i < 4; i++) for (const key of ['Home', 'End']) {
      await measure.locator('input').nth(i).focus(); await page.keyboard.press(key); await verifyMeasure();
    }
    await openLesson();
    await extensions.getByRole('button', { name: 'Put', exact: true }).click(); await verifyExtension('spot', 'put');
    assert.equal(await page.getByTestId('extension-price').innerText(), '6.3301');
    await extensions.getByRole('button', { name: 'Futures · Black-76', exact: true }).click(); await verifyExtension('futures', 'put');
    assert.equal(await extensions.locator('input').count(), 5);
    assert.equal(await page.getByTestId('extension-price').innerText(), '7.5771');
    await extensions.getByRole('button', { name: 'Call', exact: true }).focus(); await page.keyboard.press('Enter');
    await verifyExtension('futures', 'call');
    assert.equal(await extensions.getByRole('button', { name: 'Call', exact: true }).getAttribute('aria-pressed'), 'true');
    for (const mode of ['futures', 'spot']) {
      await extensions.getByRole('button', { name: mode === 'spot' ? 'หุ้นจ่ายเงินปันผล' : 'Futures · Black-76', exact: true }).click();
      for (let i = 0; i < (mode === 'spot' ? 6 : 5); i++) for (const key of ['Home', 'End']) {
        await extensions.locator('input').nth(i).focus(); await page.keyboard.press(key); await verifyExtension(mode, 'call');
      }
    }
    await extensions.locator('input').last().focus(); await page.keyboard.press('Home'); await verifyExtension('spot', 'call');
    assert.match(await extensions.locator('.results').innerText(), /ไม่กำหนดที่ขอบเขตนี้/);
    report.checks.push('Two lab defaults match numerical helpers; changing mu leaves analytic and direct Q estimates unchanged; mu=r makes P/Q/weighted estimates identical; Call/Put and spot/futures modes; all sliders at Home/End; keyboard activation and expiry limit');

    for (const theme of ['light', 'dark']) for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1100 }); await openLesson();
      await page.evaluate(theme => document.documentElement.setAttribute('data-theme', theme), theme);
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const violations = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(violation => ({ id: violation.id, nodes: violation.nodes.map(node => node.target) })));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      const clippedChartText = await page.locator('.lab svg').evaluateAll(svgs => svgs.flatMap(svg => [...svg.querySelectorAll('text')].filter(text => { const box = text.getBBox(); return box.x < -1 || box.x + box.width > svg.viewBox.baseVal.width + 1; }).map(text => text.textContent)));
      report.states.push({ width, theme, overflow, violations, clippedChartText });
      assert.equal(overflow, false, JSON.stringify({ width, theme }));
      assert.deepEqual(violations, [], JSON.stringify({ width, theme, violations }));
      assert.deepEqual(clippedChartText, [], JSON.stringify({ width, theme, clippedChartText }));
      if (width === 390 || width === 1440) for (const id of ['measure-change-lab', 'pricing-extensions-lab']) await capture(`#${id}`, `${theme}-${width}-${id}`);
    }
    report.checks.push('320/390/768/1440 light and dark: no document overflow, clipped chart labels, or automated WCAG A/AA violations; lab screenshots at 390/1440');

    await page.setViewportSize({ width: 1440, height: 1100 });
    for (const [id, english, thai, lessonAnchor] of glossaryTerms) {
      await page.goto(`${base}/glossary.html#${id}`);
      assert.equal(await page.locator(`#${id}`).isVisible(), true);
      assert.equal(new URL(page.url()).hash, `#${id}`);
      await page.locator('#glossary-query').fill(english); assert.equal(await page.locator(`#${id}`).isVisible(), true);
      await page.locator('#glossary-query').fill(thai); assert.equal(await page.locator(`#${id}`).isVisible(), true);
      await page.locator('#glossary-query').fill('zzzz-no-glossary-result');
      assert.match(await page.locator('#glossary-status').innerText(), /ไม่พบ/);
      assert.equal(await page.locator('.glossary-term:visible').count(), 0);
      await page.locator('#glossary-query').focus(); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.press('Backspace');
      await page.locator(`#${id} a`).focus(); await page.keyboard.press('Enter'); await ready();
      assert.equal(new URL(page.url()).pathname, `/${slug}.html`); assert.equal(new URL(page.url()).hash, `#${lessonAnchor}`);
      assert.equal(await page.locator(`#${lessonAnchor}`).isVisible(), true);
      report.glossary.push({ id, english, thai, lessonAnchor, passed: true });
    }
    await page.goto(base);
    assert.equal(await page.locator('.welcome-lesson').count(), lessonCount);
    await page.locator(`.welcome-text-link[href="${slug}.html"]`).click(); await ready();
    assert.equal(await page.locator(`.book-nav a[href="${slug}.html"]`).getAttribute('aria-current'), 'page');
    const navigation = await page.locator('.book-nav a').evaluateAll(links => links.map(link => link.getAttribute('href')));
    const position = navigation.indexOf(`${slug}.html`);
    assert.equal(navigation[position - 1], `${chapters[chapterIndex - 1].file}.html`);
    assert.equal(navigation[position + 1], `${chapters[chapterIndex + 1].file}.html`);
    for (const neighbor of [chapters[chapterIndex - 1], chapters[chapterIndex + 1]]) {
      await page.locator(`.book-nav a[href="${neighbor.file}.html"]`).click();
      assert.equal(await page.locator(`.book-nav a[href="${neighbor.file}.html"]`).getAttribute('aria-current'), 'page');
      await page.locator(`.book-nav a[href="${slug}.html"]`).click(); await ready();
    }
    for (const query of ['Girsanov', 'เปลี่ยนมาตรวัด']) {
      await page.locator('#search-button').click(); await page.getByRole('searchbox').fill(query);
      assert.ok(await page.locator(`#search-results a[href*="${slug}"]`).count() > 0);
      await page.keyboard.press('Escape'); assert.equal(await page.locator('#search-dialog').isVisible(), false);
    }
    await page.setViewportSize({ width: 390, height: 1100 });
    await page.locator('#menu-button').click();
    assert.equal(await page.locator('#menu-button').getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator(`.book-nav a[href="${slug}.html"]`).isVisible(), true);
    await page.locator('#menu-button').click();
    report.checks.push('All nine glossary terms: direct anchors, English/Thai filters, empty results and keyboard return links; welcome card/count; sidebar current/previous/next links; mobile menu; Thai/English site search and Escape');

    await page.goto(pathToFileURL(path.join(root, '_site', `${slug}.html`)).href); await ready();
    await verifyMeasure(); await verifyExtension('spot', 'call');
    await page.locator('#pricing-extensions-lab').getByRole('button', { name: 'Futures · Black-76', exact: true }).click(); await verifyExtension('futures', 'call');
    const source = fs.readFileSync(path.join(root, `${slug}.md`));
    const notebook = JSON.parse(fs.readFileSync(path.join(root, 'notebooks', `${slug}.ipynb`), 'utf8'));
    const codeCells = notebook.cells.filter(cell => cell.cell_type === 'code');
    assert.equal(notebook.metadata.source.sha256, crypto.createHash('sha256').update(source).digest('hex'));
    assert.equal(codeCells.length, 7);
    assert.ok(codeCells.every((cell, index) => cell.execution_count === index + 1 && cell.outputs.length > 0 && cell.outputs.every(output => output.output_type !== 'error')));
    assert.equal(fs.readFileSync(path.join(root, '_site', 'notebooks', `${slug}.ipynb`), 'utf8'), fs.readFileSync(path.join(root, 'notebooks', `${slug}.ipynb`), 'utf8'));
    report.checks.push('Offline export mounts both labs and supports mode changes; notebook SHA-256 matches lesson, all seven code cells executed with outputs and no errors, exported notebook matches source');
    assert.deepEqual(errors, []);
    report.errors = errors; report.status = 'passed';
    fs.writeFileSync(path.join(__dirname, 'martingale-pricing-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
