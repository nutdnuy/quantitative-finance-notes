const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');

const root = path.resolve(process.env.EXOTIC_QA_ROOT || path.join(__dirname, '..'));
const base = process.env.EXOTIC_QA_BASE || 'http://127.0.0.1:8763';
const slug = 'exotic-options';
const chapters = require('yaml').parse(fs.readFileSync(path.join(root, '_toc.yml'), 'utf8')).chapters;
const glossaryTerms = [
  ['exotic-option', 'exotic option', 'เงื่อนไขจาก vanilla', 'contract-features'],
  ['path-state-variable', 'path state variable', 'ตัวแปรสรุปประวัติ', 'state-variables'],
  ['asian-option', 'asian option', 'อ้างอิงราคาเฉลี่ย', 'contract-menu'],
  ['barrier-option', 'barrier option', 'เงื่อนไขแตะระดับราคา', 'barrier-monitoring'],
  ['fixing-update', 'fixing', 'วันสังเกตและกฎอัปเดต', 'discrete-updates'],
];
const defaults = { S0: 100, K: 100, H: 130, sigma: 20, r: 3, T: 1, steps: 12, count: 12000, seed: 2535 };
const estimateKeys = ['vanilla', 'asian', 'outDiscrete', 'inDiscrete', 'outContinuous', 'inContinuous'];
const format = (value, digits = 3) => value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

(async () => {
  const numerical = await import(pathToFileURL(path.join(root, 'src/exotic-options.mjs')).href);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const report = { base, checks: [], states: [], glossary: [], failures: [], errors: [] };
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) report.errors.push(`${response.status()} ${response.url()}`); });
  // Other tasks may save chapters during QA; keep each loaded interaction stable.
  await page.route('**/__version', route => route.fulfill({ body: 'exotic-options-qa-snapshot' }));
  const pathLab = page.locator('#exotic-path-lab');
  const mcLab = page.locator('#exotic-monte-carlo-lab');
  async function ready() {
    await page.waitForFunction(() => document.querySelectorAll('[data-exotic-lab]').length === 2);
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: 'html,*{scroll-behavior:auto!important}' });
  }
  async function openLesson() { await page.goto(`${base}/${slug}.html`); await ready(); }
  async function check(name, operation) {
    try { await operation(); report.checks.push(name); console.log(`PASS ${name}`); }
    catch (error) { report.failures.push({ name, message: error.message }); console.error(`FAIL ${name}: ${error.message}`); }
  }
  async function capture(id, name) {
    await page.locator(id).evaluate(element => window.scrollTo({ top: element.getBoundingClientRect().top + scrollY - 65, behavior: 'instant' }));
    await page.screenshot({ path: path.join(__dirname, `exotic-${name}.png`) });
  }
  async function keyboardValue(range, value) {
    const minimum = Number(await range.getAttribute('min')), step = Number(await range.getAttribute('step'));
    await range.focus(); await page.keyboard.press('Home');
    for (let n = 0; n < Math.round((value - minimum) / step); n++) await page.keyboard.press('ArrowRight');
    assert.equal(Number(await range.inputValue()), value);
  }
  async function pathRows() { return pathLab.locator('tbody tr').evaluateAll(rows => rows.map(row => [...row.querySelectorAll('td')].map(cell => cell.textContent))); }
  async function verifyPaths(K = 100, H = 130, terminal = 110) {
    const results = [[100, 110, 120, 110, terminal], [100, 140, 90, 100, terminal]].map(prices => numerical.pathPayoffs({ prices, K, H }));
    const expected = ['terminal', 'average', 'hit', 'vanilla', 'asian', 'outDiscrete'].map(key => results.map(row => key === 'hit' ? (row.hit ? 'ชน' : 'ไม่ชน') : format(row[key], 2)));
    assert.deepEqual(await pathRows(), expected);
  }
  async function mcRows() { return mcLab.locator('tbody tr').evaluateAll(rows => rows.map(row => [...row.querySelectorAll('td')].map(cell => cell.textContent))); }
  async function verifyMC(parameters = defaults) {
    const expected = numerical.simulateExotics({ ...parameters, r: parameters.r / 100, sigma: parameters.sigma / 100 });
    const values = estimateKeys.map(key => { const row = expected.estimates[key]; return [format(row.mean), format(row.se), `${format(row.low)} ถึง ${format(row.high)}`]; });
    assert.deepEqual(await mcRows(), values);
    assert.equal(await mcLab.locator('.results strong').first().innerText(), `${format(expected.bsPrice)} ดอลลาร์`);
    assert.match(await mcLab.locator('.status-text').innerText(), new RegExp(`seed ${parameters.seed}`));
    assert.ok(expected.estimates.outContinuous.mean <= expected.estimates.outDiscrete.mean + 1e-12);
    for (const suffix of ['Discrete', 'Continuous']) assert.ok(Math.abs(expected.estimates[`in${suffix}`].mean + expected.estimates[`out${suffix}`].mean - expected.estimates.vanilla.mean) < 1e-10);
    return expected;
  }
  async function applyMC() {
    await mcLab.getByRole('button', { name: 'คำนวณราคาจากค่าที่เลือก', exact: true }).click();
    await mcLab.locator('.status-text').filter({ hasText: 'ผลด้านล่างใช้' }).waitFor();
  }
  try {
    await check('Ready: two labs, three loaded lesson images, valid KaTeX and named controls', async () => {
      await openLesson();
      assert.equal(await page.locator('.katex-error').count(), 0);
      assert.ok(await page.locator('.katex').count() > 40);
      assert.ok(await page.locator('.portfolio-figure img').evaluateAll(images => images.length === 3 && images.every(image => image.complete && image.naturalWidth > 0 && image.alt.trim())));
      assert.equal(await page.getByRole('slider').count(), 9);
      assert.equal(await page.getByRole('combobox').count(), 2);
      assert.deepEqual(await page.locator('.lab input, .lab select').evaluateAll(inputs => inputs.filter(input => !input.labels?.length).map(input => input.outerHTML)), []);
      await verifyPaths(); await verifyMC();
      assert.deepEqual((await pathRows()).slice(3), [['10.00', '10.00'], ['12.50', '10.00'], ['10.00', '0.00']]);
    });
    await check('Path lab: keyboard strike/barrier/shared endpoint controls, touch event, reset', async () => {
      await openLesson();
      await keyboardValue(pathLab.getByRole('slider').nth(1), 145); await verifyPaths(100, 145, 110);
      assert.deepEqual((await pathRows()).at(-1), ['10.00', '10.00']);
      await keyboardValue(pathLab.getByRole('slider').nth(0), 110); await verifyPaths(110, 145, 110);
      await keyboardValue(pathLab.getByRole('slider').nth(2), 150); await verifyPaths(110, 145, 150);
      assert.deepEqual((await pathRows())[0], ['150.00', '150.00']);
      assert.deepEqual((await pathRows()).at(-1), ['0.00', '0.00']);
      await keyboardValue(pathLab.getByRole('slider').nth(1), 100); await verifyPaths(110, 100, 150);
      await pathLab.getByRole('button', { name: 'คืนค่าตัวอย่าง', exact: true }).focus(); await page.keyboard.press('Enter'); await verifyPaths();
    });
    await check('MC: draft pending/apply, every dropdown, seed reproducibility/reset, zero volatility and initial barrier hit', async () => {
      await openLesson();
      const baseline = await mcRows();
      await keyboardValue(mcLab.getByRole('slider').nth(1), 105);
      assert.match(await mcLab.locator('.status-text').innerText(), /มีค่าที่เปลี่ยนแล้ว/);
      assert.deepEqual(await mcRows(), baseline);
      await applyMC(); await verifyMC({ ...defaults, K: 105 });
      await mcLab.getByRole('button', { name: 'สุ่ม seed ใหม่และคำนวณ', exact: true }).click(); await verifyMC({ ...defaults, K: 105, seed: 2536 });
      await mcLab.getByRole('button', { name: 'คืนค่าเริ่มต้น', exact: true }).click(); await verifyMC(); assert.deepEqual(await mcRows(), baseline);
      await mcLab.getByRole('combobox', { name: 'เส้นทาง N', exact: true }).selectOption('1000');
      for (const steps of [4, 52, 252, 12]) {
        await mcLab.getByRole('combobox', { name: 'ช่วงตรวจ m', exact: true }).selectOption(String(steps));
        await applyMC(); await verifyMC({ ...defaults, steps, count: 1000 });
      }
      for (const count of [24000, 12000]) {
        await mcLab.getByRole('combobox', { name: 'เส้นทาง N', exact: true }).selectOption(String(count));
        await applyMC(); await verifyMC({ ...defaults, count });
      }
      await keyboardValue(mcLab.getByRole('slider').nth(3), 0); await applyMC(); await verifyMC({ ...defaults, sigma: 0 });
      assert.ok((await mcRows()).every(row => row[1] === '0.000'));
      await mcLab.getByRole('button', { name: 'คืนค่าเริ่มต้น', exact: true }).click();
      await keyboardValue(mcLab.getByRole('slider').nth(2), 100); await applyMC(); await verifyMC({ ...defaults, H: 100 });
      let rows = await mcRows();
      assert.deepEqual(rows[2], ['0.000', '0.000', '0.000 ถึง 0.000']); assert.deepEqual(rows[4], rows[2]);
      assert.deepEqual(rows[3], rows[0]); assert.deepEqual(rows[5], rows[0]);
      await keyboardValue(mcLab.getByRole('slider').nth(0), 140); await applyMC(); await verifyMC({ ...defaults, H: 100, S0: 140 });
      rows = await mcRows(); assert.equal(rows[2][0], '0.000'); assert.equal(rows[4][0], '0.000');
      await mcLab.locator('summary').focus(); await page.keyboard.press('Enter'); assert.equal(await mcLab.locator('details').getAttribute('open'), '');
      assert.match(await mcLab.locator('details').innerText(), /In \+ Out = Vanilla/);
      await mcLab.getByRole('button', { name: 'คืนค่าเริ่มต้น', exact: true }).click(); await verifyMC();
    });
    for (const theme of ['light', 'dark']) for (const width of [320, 390, 768, 1440]) {
      await check(`Layout/accessibility ${width}px ${theme}`, async () => {
        await page.setViewportSize({ width, height: 1100 }); await openLesson();
        await page.evaluate(theme => { localStorage.setItem('theme', theme); document.documentElement.setAttribute('data-theme', theme); }, theme);
        await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
        const violations = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(violation => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.map(node => node.target) })));
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
        const clippedLabels = await page.locator('.lab svg').evaluateAll(svgs => svgs.flatMap(svg => [...svg.querySelectorAll('text')].filter(text => { const box = text.getBBox(); return box.x < -1 || box.x + box.width > svg.viewBox.baseVal.width + 1 || box.y < -1 || box.y + box.height > svg.viewBox.baseVal.height + 1; }).map(text => text.textContent)));
        report.states.push({ width, theme, overflow, violations, clippedLabels });
        if (width === 390 || width === 1440) for (const id of ['exotic-path-lab', 'exotic-monte-carlo-lab']) await capture(`#${id}`, `${theme}-${width}-${id}`);
        assert.equal(overflow, false); assert.deepEqual(violations, []); assert.deepEqual(clippedLabels, []);
      });
    }
    await check('Glossary: all five English/Thai filters, direct anchors, empty state and keyboard return links', async () => {
      await page.setViewportSize({ width: 1440, height: 1100 });
      for (const [id, english, thai, anchor] of glossaryTerms) {
        await page.goto(`${base}/glossary.html#${id}`);
        assert.equal(await page.locator(`#${id}`).isVisible(), true);
        assert.equal(new URL(page.url()).hash, `#${id}`);
        for (const query of [english, thai]) { await page.locator('#glossary-query').fill(query); assert.equal(await page.locator(`#${id}`).isVisible(), true); }
        await page.locator('#glossary-query').fill('zzzz-no-glossary-result');
        assert.match(await page.locator('#glossary-status').innerText(), /ไม่พบ/); assert.equal(await page.locator('.glossary-term:visible').count(), 0);
        await page.locator('#glossary-query').focus(); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.press('Backspace');
        await page.locator(`#${id} a`).focus(); await page.keyboard.press('Enter'); await ready();
        assert.equal(new URL(page.url()).pathname, `/${slug}.html`); assert.equal(new URL(page.url()).hash, `#${anchor}`);
        assert.equal(await page.locator(`#${anchor}`).isVisible(), true);
        report.glossary.push({ id, english, thai, anchor, passed: true });
      }
    });
    await check('Navigation: home card/count, sidebar neighbors/current state, Thai/English search and mobile menu', async () => {
      await page.goto(base);
      assert.equal(await page.locator('.welcome-lesson').count(), chapters.filter(chapter => chapter.file !== 'glossary').length);
      await page.locator(`.welcome-text-link[href="${slug}.html"]`).click(); await ready();
      assert.equal(await page.locator(`.book-nav a[href="${slug}.html"]`).getAttribute('aria-current'), 'page');
      const links = await page.locator('.book-nav a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
      const index = chapters.findIndex(chapter => chapter.file === slug), position = links.indexOf(`${slug}.html`);
      for (const offset of [-1, 1]) if (chapters[index + offset]) {
        const href = `${chapters[index + offset].file}.html`; assert.equal(links[position + offset], href);
        await page.locator(`.book-nav a[href="${href}"]`).click();
        assert.equal(await page.locator(`.book-nav a[href="${href}"]`).getAttribute('aria-current'), 'page');
        await page.locator(`.book-nav a[href="${slug}.html"]`).click(); await ready();
      }
      for (const query of ['Exotic', 'วัน fixing']) {
        await page.locator('#search-button').click(); await page.getByRole('searchbox').fill(query);
        assert.ok(await page.locator(`#search-results a[href*="${slug}"]`).count() > 0);
        await page.keyboard.press('Escape'); assert.equal(await page.locator('#search-dialog').isVisible(), false);
      }
      await page.setViewportSize({ width: 390, height: 1100 }); await page.locator('#menu-button').click();
      assert.equal(await page.locator('#menu-button').getAttribute('aria-expanded'), 'true');
      assert.equal(await page.locator(`.book-nav a[href="${slug}.html"]`).isVisible(), true); await page.locator('#menu-button').click();
    });
    await check('Notebook: matching lesson SHA-256, nine executed cells and three embedded SVGs', async () => {
      const notebook = JSON.parse(fs.readFileSync(path.join(root, 'notebooks', `${slug}.ipynb`), 'utf8'));
      const codeCells = notebook.cells.filter(cell => cell.cell_type === 'code');
      assert.equal(notebook.metadata.source.sha256, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, `${slug}.md`))).digest('hex'));
      assert.equal(codeCells.length, 9);
      assert.ok(codeCells.every((cell, index) => cell.execution_count === index + 1 && cell.outputs.length > 0 && cell.outputs.every(output => output.output_type !== 'error')));
      const attachments = notebook.cells.flatMap(cell => Object.entries(cell.attachments || {}));
      assert.equal(attachments.length, 3); assert.ok(attachments.every(([name, body]) => name.endsWith('.svg') && Object.keys(body).includes('image/svg+xml')));
    });
    await check('Offline export: local images, both labs and interactions, notebook matches source', async () => {
      await page.goto(pathToFileURL(path.join(root, '_site', `${slug}.html`)).href); await ready();
      assert.ok(await page.locator('.portfolio-figure img').evaluateAll(images => images.length === 3 && images.every(image => image.complete && image.naturalWidth > 0)));
      await verifyPaths(); await verifyMC();
      await keyboardValue(pathLab.getByRole('slider').nth(1), 145); await verifyPaths(100, 145, 110);
      await mcLab.getByRole('combobox', { name: 'เส้นทาง N', exact: true }).selectOption('1000'); await applyMC(); await verifyMC({ ...defaults, count: 1000 });
      assert.equal(fs.readFileSync(path.join(root, '_site', 'notebooks', `${slug}.ipynb`), 'utf8'), fs.readFileSync(path.join(root, 'notebooks', `${slug}.ipynb`), 'utf8'));
    });
    await check('No browser exceptions or failed HTTP responses', async () => assert.deepEqual(report.errors, []));
  } finally {
    report.status = report.failures.length ? 'failed' : 'passed';
    fs.writeFileSync(path.join(__dirname, 'exotic-options-page-report.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
  console.log(JSON.stringify(report, null, 2));
  if (report.failures.length) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
