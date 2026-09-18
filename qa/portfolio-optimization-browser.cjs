const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const base = process.env.PORTFOLIO_OPTIMIZATION_PREVIEW_URL || 'http://127.0.0.1:8763';
const chapter = 'black-litterman.html';
const axePath = require.resolve('axe-core/axe.min.js');
const report = { status: 'running', checks: [], states: [], failures: [], pageErrors: [], failedResponses: [], externalRequests: [] };
const close = (actual, expected, tolerance = 1e-4) => assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => report.pageErrors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) report.failedResponses.push({ url: response.url(), status: response.status() }); });
  page.on('request', request => { if (!request.url().startsWith(base) && !/^(file:|data:|blob:)/.test(request.url())) report.externalRequests.push(request.url()); });
  const lab = page.locator('#black-litterman-lab .portfolio-optimization-lab');
  const output = key => lab.locator(`[data-opt="${key}"]`);
  const number = async key => parseFloat((await output(key).innerText()).replaceAll(',', '').replaceAll('−', '-').replace('%', ''));

  async function check(name, action) {
    try { await action(); report.checks.push(name); }
    catch (error) { report.failures.push({ name, message: error.message }); }
  }

  async function loadChapter() {
    await page.goto(`${base}/${chapter}`, { waitUntil: 'networkidle' });
    await lab.waitFor(); await page.evaluate(() => document.fonts.ready);
  }

  async function geometry() {
    const svg = lab.locator('svg[role="img"]');
    assert.equal(await svg.count(), 1);
    const issues = await svg.evaluate(element => {
      const problems = [], bounds = element.viewBox.baseVal;
      if (!element.querySelector('title')?.textContent || !element.querySelector('desc')?.textContent) problems.push('missing accessible chart text');
      for (const dot of element.querySelectorAll('circle[data-series]')) {
        const x = Number(dot.getAttribute('cx')), y = Number(dot.getAttribute('cy')), r = Number(dot.getAttribute('r'));
        if (![x,y,r].every(Number.isFinite) || x-r < 0 || y-r < 0 || x+r > bounds.width || y+r > bounds.height) problems.push('invalid return marker geometry');
      }
      return problems;
    });
    assert.deepEqual(issues, []);
    assert.equal(await lab.locator('circle[data-series]').count(), 8);
    for (let i = 0; i < 4; i++) {
      const cx = Number(await lab.locator('circle[data-series="posterior"]').nth(i).getAttribute('cx'));
      close((cx - 92) / 576 * 30, await number(`posterior-return-${i}`), .00051);
    }
    assert.equal(await lab.evaluate(element => /NaN|Infinity|null|undefined/.test(element.innerText)), false);
  }

  async function interactions() {
    const reset = lab.getByRole('button', { name: 'คืนค่าเริ่มต้นของ Black–Litterman', exact: true });
    const risk = lab.getByRole('slider', { name: 'Risk aversion λ', exact: true });
    const uncertainty = lab.getByRole('slider', { name: 'ตัวคูณความไม่แน่นอนของ view', exact: true });
    await reset.click();
    close(await number('prior-return-0'), 2.092, .001); close(await number('posterior-return-0'), 1.678, .001);
    close(await number('posterior-return-3'), 22.717, .001);
    close(await number('market-weight-1'), 40); close(await number('prior-weight-1'), 40);
    close(await number('posterior-weight-0'), 9.87, .01); close(await number('posterior-weight-1'), 16.59, .01);
    close(await number('posterior-weight-2'), 40.13, .01); close(await number('posterior-weight-3'), 10, .01);
    close(await number('posterior-risk-free'), 23.41, .01); close(await number('prior-risk-free'), 0, .01);
    const baselineReturns = await lab.locator('[data-opt^="posterior-return-"]').allTextContents();
    const baseline = await lab.locator('.table-wrap, .results, .calculation-strip').allTextContents();

    await risk.focus(); await risk.press('Home'); assert.equal(await risk.inputValue(), '0.5');
    assert.deepEqual(await lab.locator('[data-opt^="posterior-return-"]').allTextContents(), baselineReturns);
    assert.ok(await number('posterior-risk-free') < 0);
    await risk.press('ArrowRight'); close(Number(await risk.inputValue()), .55);
    await risk.press('End'); assert.equal(await risk.inputValue(), '6'); assert.ok(await number('posterior-risk-free') > 70);
    await geometry();

    await reset.click();
    const baselineViewOne = Math.abs(await number('posterior-view-1') - 10);
    const baselineViewTwo = Math.abs(await number('posterior-view-2') - 3);
    await uncertainty.focus(); await uncertainty.press('Home'); assert.equal(await uncertainty.inputValue(), '0.25');
    assert.ok(Math.abs(await number('posterior-view-1') - 10) < baselineViewOne);
    assert.ok(Math.abs(await number('posterior-view-2') - 3) < baselineViewTwo);
    await uncertainty.press('ArrowRight'); close(Number(await uncertainty.inputValue()), .5);
    await uncertainty.press('End'); assert.equal(await uncertainty.inputValue(), '4');
    assert.ok(Math.abs(await number('posterior-view-1') - 10) > baselineViewOne);
    assert.ok(Math.abs(await number('posterior-view-2') - 3) > baselineViewTwo);
    await geometry();

    await reset.click();
    assert.deepEqual(await lab.locator('.table-wrap, .results, .calculation-strip').allTextContents(), baseline);
    assert.equal(await lab.locator('tbody tr').count(), 8);
    await geometry();
  }

  async function scan(width, theme) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    await page.evaluate(value => document.documentElement.setAttribute('data-theme', value), theme);
    await page.evaluate(() => scrollTo(0, 0)); await page.evaluate(() => document.fonts.ready);
    await page.addScriptTag({ path: axePath });
    const result = await page.evaluate(async () => axe.run(document.querySelector('#black-litterman-lab'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
    const overflow = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    const serious = result.violations.filter(item => ['serious', 'critical'].includes(item.impact));
    report.states.push({ width, theme, overflow, violations: result.violations.map(item => ({ id: item.id, impact: item.impact, targets: item.nodes.map(node => node.target) })) });
    assert.ok(overflow.scrollWidth <= overflow.width, `${width}/${theme}: horizontal page overflow`);
    assert.deepEqual(serious, [], `${width}/${theme}: serious or critical accessibility violation`);
    await geometry();
    await lab.screenshot({ path: path.join(__dirname, `portfolio-optimization-${width}-${theme}.png`), style: '.book-mobile-header { visibility: hidden !important; }' });
  }

  try {
    await check('Chapter mounts the deterministic Black–Litterman lab', loadChapter);
    if (!report.failures.length) await check('Default values, both keyboard sliders, reset and view-confidence direction agree with the model', interactions);
    if (!report.failures.length) for (const width of [1440, 360]) for (const theme of ['light', 'dark']) {
      await check(`No overflow or serious accessibility issue at ${width}px in ${theme} theme`, () => scan(width, theme));
    }
    await check('No page errors, failed responses or external requests', async () => {
      assert.deepEqual(report.pageErrors, []); assert.deepEqual(report.failedResponses, []); assert.deepEqual(report.externalRequests, []);
    });
    report.status = report.failures.length ? 'failed' : 'passed';
    if (report.failures.length) process.exitCode = 1;
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(__dirname, 'portfolio-optimization-browser-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  }
})();
