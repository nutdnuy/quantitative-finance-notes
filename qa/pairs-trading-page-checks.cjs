const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..'), base = process.env.QA_BASE || 'http://127.0.0.1:8763';
const lessons = [
  { slug: 'statistical-arbitrage', lab: 'pair-hedge-lab', charts: 1, svg: 1, photo: 1 },
  { slug: 'pairs-trading-cointegration', lab: 'pair-cointegration-lab', charts: 2, svg: 1, photo: 0 },
  { slug: 'pairs-trading-backtest', lab: 'pair-backtest-lab', charts: 2, svg: 1, photo: 0 },
  { slug: 'pairs-trading-ml', lab: null, charts: 0, svg: 5, photo: 0 },
];
const glossaryTerms = [
  ['pairs-trading', 'pairs trading', 'ซื้อ'],
  ['cointegration', 'cointegration', 'ร่วม'],
  ['pair-spread', 'spread', 'ส่วนต่าง'],
  ['pair-z-score', 'z score', 'ช่วงข้อมูล'],
  ['gross-notional', 'gross notional', 'มูลค่า'],
  ['pair-drawdown', 'drawdown', 'สูงสุด'],
];
const fmt = value => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

(async () => {
  const numerical = await import(pathToFileURL(path.join(root, 'src/pairs-trading.mjs')).href);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
  const errors = [], report = { status: 'running', states: [], checks: [], glossary: [], screenshots: [] };
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.route('**/__version', route => route.fulfill({ body: 'pairs-qa-snapshot' }));

  async function ready(lesson) {
    await page.waitForFunction(count => document.querySelectorAll('.lab').length === count, lesson.lab ? 1 : 0);
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: 'html,*{scroll-behavior:auto!important}' });
    assert.equal(await page.locator('.lab .chart svg').count(), lesson.charts, lesson.slug);
    for (const img of await page.locator('.pairs-figure img').all()) {
      await img.scrollIntoViewIfNeeded();
      await img.evaluate(image => image.decode());
    }
    const images = await page.locator('.pairs-figure img').evaluateAll(imgs => imgs.map(img => ({
      src: img.getAttribute('src'), loaded: img.complete && img.naturalWidth > 0, alt: img.alt,
    })));
    assert.ok(images.every(img => img.loaded && img.alt.trim().length > 8), lesson.slug + ' loaded and described images');
    assert.equal(images.filter(img => img.src.endsWith('.svg')).length, lesson.svg);
    assert.equal(images.filter(img => !img.src.endsWith('.svg')).length, lesson.photo);
  }
  async function open(lesson) { await page.goto(`${base}/${lesson.slug}.html`); await ready(lesson); }
  async function capture(selector, filename) {
    await page.locator(selector).first().evaluate(element => window.scrollTo({ top: element.getBoundingClientRect().top + scrollY - 65, behavior: 'instant' }));
    await page.screenshot({ path: path.join(__dirname, filename) }); report.screenshots.push(filename);
  }
  async function keyboardValue(range, value) {
    const min = Number(await range.getAttribute('min')), step = Number(await range.getAttribute('step'));
    await range.focus(); await page.keyboard.press('Home');
    for (let i = 0; i < Math.round((value - min) / step); i++) await page.keyboard.press('ArrowRight');
    assert.equal(Number(await range.inputValue()), value);
  }
  async function keyboardClick(button) { await button.focus(); await page.keyboard.press('Enter'); }
  async function assertChartBounds(context) {
    const clipped = await page.locator('.lab .chart svg').evaluateAll(svgs => svgs.flatMap(svg => [...svg.querySelectorAll('text')].flatMap(text => {
      const box = text.getBBox(), vb = svg.viewBox.baseVal;
      return box.x < -1 || box.x + box.width > vb.width + 1 || box.y < -1 || box.y + box.height > vb.height + 1
        ? [{ text: text.textContent, x: box.x, right: box.x + box.width, svgWidth: vb.width }] : [];
    })));
    assert.deepEqual(clipped, [], JSON.stringify({ context, clipped }));
  }
  async function downloadLedger(name) {
    const event = page.waitForEvent('download');
    await page.getByRole('button', { name: 'ดาวน์โหลดบัญชีรายวัน CSV', exact: true }).click();
    const download = await event, file = path.join(__dirname, name);
    assert.equal(download.suggestedFilename(), 'pairs-trading-simulation-ledger.csv');
    await download.saveAs(file);
    const [header, ...lines] = fs.readFileSync(file, 'utf8').trim().split('\n'), columns = header.split(',');
    assert.equal(lines.length, 250); assert.equal(columns[0], 'day');
    const rows = lines.map(line => Object.fromEntries(line.split(',').map((value, i) => [columns[i], columns[i] === 'pendingType' ? value : Number(value)])));
    assert.equal(rows[0].day, 251); assert.equal(rows.at(-1).day, 500);
    return rows;
  }
  function assertBacktestRows(rows, expected) {
    rows.forEach((row, i) => {
      for (const key of ['day', 'a', 'b', 'z', 'qA', 'qB', 'cash', 'equity', 'fee', 'borrow', 'dailyPnl']) {
        assert.ok(Math.abs(row[key] - expected.rows[i][key]) < 1e-8, `download ${i} ${key}`);
      }
    });
  }

  try {
    const runLayout = !process.argv.includes('--interactions-only');
    if (!runLayout) {
      const previous = JSON.parse(fs.readFileSync(path.join(__dirname, 'pairs-trading-page-report.json'), 'utf8'));
      assert.equal(previous.states.length, 24, 'A complete responsive pass is required before an interaction-only retry');
      report.states = previous.states; report.screenshots = previous.screenshots;
    }
    for (const lesson of runLayout ? lessons : []) {
      for (const theme of ['light', 'dark']) for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: 1100 }); await open(lesson);
        await page.evaluate(theme => document.documentElement.setAttribute('data-theme', theme), theme);
        assert.equal(await page.locator('.katex-error').count(), 0, lesson.slug + ' math');
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
        assert.equal(overflow, false, `${lesson.slug} ${theme} ${width} overflow`);
        await assertChartBounds(`${lesson.slug} ${theme} ${width}`);
        await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
        const violations = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
        assert.deepEqual(violations, [], JSON.stringify({ slug: lesson.slug, theme, width, violations }));
        report.states.push({ slug: lesson.slug, theme, width, overflow, violations, status: 'passed' });
        if (width !== 320) {
          if (lesson.lab) await capture(`#${lesson.lab}`, `pairs-${lesson.slug}-${theme}-${width}.png`);
          if (lesson.slug === 'statistical-arbitrage') await capture('.book-main', `pairs-series-intro-${theme}-${width}.png`);
          if (lesson.slug === 'pairs-trading-ml') await capture('.pairs-figure', `pairs-ml-heatmap-${theme}-${width}.png`);
        }
      }
      const response = await page.request.get(`${base}/notebooks/pairs-trading.ipynb`);
      assert.ok(response.ok(), lesson.slug + ' notebook link');
      assert.ok(await page.locator('a[href="notebooks/pairs-trading.ipynb"]').count() > 0);
    }
    report.checks.push('24 responsive/theme states: rendered images, five native charts, KaTeX, WCAG A/AA, chart label bounds and document overflow');

    await page.setViewportSize({ width: 1440, height: 1100 });
    await open(lessons[0]);
    const hedge = page.locator('#pair-hedge-lab');
    assert.match(await hedge.locator('.results').innerText(), /400.00/);
    await keyboardClick(hedge.getByRole('button', { name: 'ถ่วงด้วย Market beta', exact: true }));
    assert.equal(await hedge.getByRole('button', { name: 'ถ่วงด้วย Market beta', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.match(await hedge.locator('.results').innerText(), /250.00/);
    await keyboardValue(hedge.locator('input').nth(1), 0);
    for (const key of ['Home', 'End']) {
      await hedge.locator('input').first().focus(); await page.keyboard.press(key);
      assert.match(await hedge.locator('.results strong').first().innerText(), /^0.00/);
    }
    await open(lessons[1]);
    const coint = page.locator('#pair-cointegration-lab'), residualLine = coint.locator('.chart').nth(1).locator('.primary-line');
    const original = await residualLine.getAttribute('points');
    await coint.locator('input').focus(); await page.keyboard.press('Home');
    assert.notEqual(await residualLine.getAttribute('points'), original);
    await keyboardClick(coint.getByRole('button', { name: 'ใช้ h ที่สร้างข้อมูล = 1.20', exact: true }));
    assert.equal(Number(await coint.locator('input').inputValue()), 1.2);
    await keyboardClick(coint.getByRole('button', { name: 'ความสัมพันธ์เปลี่ยนหลังวัน 250', exact: true }));
    assert.notEqual(await residualLine.getAttribute('points'), original);
    assert.match(await coint.locator('p[role="status"]').innerText(), /random walk/);
    await assertChartBounds('cointegration broken');

    await open(lessons[2]); const backtest = page.locator('#pair-backtest-lab');
    const defaults = numerical.runPairBacktest();
    assert.match(await backtest.locator('.results strong').first().innerText(), new RegExp(fmt(defaults.metrics.netPnl).replace('.', '\\.')));
    const defaultRows = await downloadLedger('pairs-ledger-default.csv'); assertBacktestRows(defaultRows, defaults);
    await backtest.locator('input').nth(1).focus(); await page.keyboard.press('End');
    const costly = numerical.runPairBacktest({ feeBps: 40 }), costlyRows = await downloadLedger('pairs-ledger-costly.csv');
    assertBacktestRows(costlyRows, costly);
    assert.ok(costlyRows.at(-1).equity < defaultRows.at(-1).equity);
    assert.deepEqual(costlyRows.map(row => [row.qA, row.qB]), defaultRows.map(row => [row.qA, row.qB]));
    await keyboardClick(backtest.getByRole('button', { name: 'ความสัมพันธ์เปลี่ยนหลังวัน 250', exact: true }));
    const broken = numerical.runPairBacktest({ data: numerical.generatePairData({ broken: true }), feeBps: 40 });
    assert.equal((await backtest.locator('.results strong').first().innerText()).replace(/\s*USD$/, '').trim(), fmt(broken.metrics.netPnl));
    await backtest.locator('summary').click();
    assert.ok(await backtest.getByRole('cell', { name: 'Stop', exact: true }).count() > 0);
    await page.setViewportSize({ width: 320, height: 1100 }); await assertChartBounds('backtest broken costly at320');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    report.checks.push('Keyboard sliders/scenarios and hedge cancellation; CSV matches math; increased costs lower equity without changing positions; structural-break stop shown');

    await page.setViewportSize({ width: 1440, height: 1100 });
    for (const [id, english, thai] of glossaryTerms) {
      await page.goto(`${base}/glossary.html#${id}`);
      const term = page.locator(`#${id}`), query = page.locator('#glossary-query');
      assert.equal(await term.isVisible(), true, id + ' direct anchor');
      await query.fill(english); assert.equal(await term.isVisible(), true, id + ' English');
      await query.fill(thai); assert.equal(await term.isVisible(), true, id + ' Thai');
      await query.fill('zzzz-no-pairs-term'); assert.equal(await page.locator('.glossary-term:visible').count(), 0);
      assert.match(await page.locator('#glossary-status').innerText(), /ไม่พบ/);
      await query.focus(); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.press('Backspace');
      const back = term.locator('a[href*=".html#"]').first(), href = await back.getAttribute('href');
      await Promise.all([page.waitForURL(new URL(href, base + '/').href), keyboardClick(back)]);
      const url = new URL(page.url()); assert.equal(url.pathname + url.hash, '/' + href);
      assert.equal(await page.locator(url.hash).count(), 1, id + ' lesson return');
      report.glossary.push({ id, english, thai, href, status: 'passed' });
    }
    await page.locator('#search-button').click();
    for (const [query, target] of [['Cointegration', 'pairs-trading-cointegration'], ['Z-score', 'pairs-trading-backtest'], ['Clustering', 'pairs-trading-ml']]) {
      await page.locator('#search-input').fill(query);
      assert.ok(await page.locator(`#search-results a[href*="${target}"]`).count() > 0, query + ' site search');
    }
    await page.keyboard.press('Escape'); assert.equal(await page.locator('#search-dialog').isVisible(), false);
    report.checks.push('Six glossary IDs: direct anchors, Thai/English search, empty results, keyboard clearing and lesson returns; site search and Escape');

    const offline = await browser.newPage({ viewport: { width: 390, height: 1100 } }), external = [], offlineErrors = [];
    offline.on('pageerror', error => offlineErrors.push(error.message));
    offline.on('request', request => { if (/^https?:/.test(request.url())) external.push(request.url()); });
    await offline.route(/^https?:/, route => route.abort());
    for (const lesson of lessons) {
      await offline.goto(pathToFileURL(path.join(root, '_site', lesson.slug + '.html')).href);
      await offline.waitForFunction(n => document.querySelectorAll('.lab').length === n, lesson.lab ? 1 : 0);
      await offline.evaluate(() => document.fonts.ready);
      for (const img of await offline.locator('.pairs-figure img').all()) { await img.scrollIntoViewIfNeeded(); await img.evaluate(img => img.decode()); }
      assert.equal(await offline.locator('.lab .chart svg').count(), lesson.charts);
      assert.equal(await offline.locator('.katex-error').count(), 0);
      assert.ok(await offline.locator('a[href="notebooks/pairs-trading.ipynb"]').count() > 0);
    }
    assert.ok(fs.existsSync(path.join(root, '_site/notebooks/pairs-trading.ipynb')));
    assert.deepEqual(external, []); assert.deepEqual(offlineErrors, []); await offline.close();
    const notebook = JSON.parse(fs.readFileSync(path.join(root, 'notebooks/pairs-trading.ipynb'), 'utf8'));
    const code = notebook.cells.filter(cell => cell.cell_type === 'code');
    assert.ok(code.length > 0 && code.every(cell => cell.execution_count > 0 && cell.outputs.every(output => output.output_type !== 'error')));
    report.checks.push('Four offline file pages mount with all figures and no HTTP requests; exported notebook exists and all code cells executed without errors');

    assert.deepEqual(errors, []); report.status = 'passed';
    fs.writeFileSync(path.join(__dirname, 'pairs-trading-page-report.json'), JSON.stringify(report, null, 2));
    console.log('Pairs pages passed: 24 responsive/theme states, 3 labs/5 charts, 8 SVGs/1 photo, keyboard and ledger CSV, 6 glossary terms/search, offline assets and executed notebook.');
  } finally {
    fs.writeFileSync(path.join(__dirname, 'pairs-trading-page-report.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
