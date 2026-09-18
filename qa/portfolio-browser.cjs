const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const base = process.env.PORTFOLIO_PREVIEW_URL || 'http://127.0.0.1:8763';
const report = { status: 'running', checks: [], states: [], errors: [] };
const close = (actual, expected, tolerance = .0001) => assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) report.errors.push(`${response.status()} ${response.url()}`); });
  const lab = page.locator('.portfolio-lab');
  const output = key => lab.locator(`[data-portfolio="${key}"]`);
  const value = async key => parseFloat((await output(key).innerText()).replaceAll(',', ''));
  const reset = () => lab.getByRole('button', { name: 'คืนค่าเริ่มต้นของพอร์ต', exact: true }).click();

  async function geometry() {
    const errors = await lab.locator('svg[role="img"]').evaluateAll(charts => charts.flatMap(svg => {
      const errors = [], { width, height } = svg.viewBox.baseVal;
      if (!svg.querySelector('title')?.textContent || !svg.querySelector('desc')?.textContent) errors.push('Missing accessible chart text');
      for (const shape of svg.querySelectorAll('circle, polyline')) {
        const points = shape.tagName === 'circle' ? [[Number(shape.getAttribute('cx')), Number(shape.getAttribute('cy'))]] : shape.getAttribute('points').trim().split(/\s+/).map(pair => pair.split(',').map(Number));
        if (points.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y) || x < 51 - .01 || x > width - 20 + .01 || y < 30 - .01 || y > height - 48 + .01)) errors.push('Invalid chart coordinate');
      }
      return errors;
    }));
    assert.deepEqual(errors, []);
    assert.equal(await lab.locator('svg[role="img"]').count(), 1);
    assert.equal(await lab.evaluate(element => /NaN|Infinity|undefined/.test(element.innerText)), false);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false, 'Page must not overflow horizontally');
  }

  async function interactions() {
    await reset(); close(await value('mean'), 9); close(await value('sigma'), 12.04);
    close(await value('sharpe'), .5813); close(await value('gmv-weight'), 14.29);
    close(await value('max-sharpe-weight'), 41.18); close(await value('max-sharpe'), .5863);
    const weight = lab.getByRole('slider', { name: 'น้ำหนักสินทรัพย์ A', exact: true });
    const correlation = lab.getByRole('slider', { name: 'Correlation ρ ระหว่าง A กับ B', exact: true });
    await weight.focus(); await weight.press('Home'); close(await value('mean'), 6); close(await value('sigma'), 10); close(await value('weight-b'), 100);
    await weight.press('End'); close(await value('mean'), 12); close(await value('sigma'), 20); close(await value('weight-b'), 0);
    await weight.press('ArrowLeft'); assert.equal(await weight.inputValue(), '99');
    await reset(); await correlation.focus(); await correlation.press('End');
    close(await value('sigma'), 15); close(await value('unrestricted-gmv'), -100);
    close(await value('gmv-weight'), 0); close(await value('max-sharpe-weight'), 100); await geometry();
    await correlation.press('Home');
    close(await value('sigma'), 5); close(await value('gmv-weight'), 33.33); close(await value('gmv-sigma'), 0);
    assert.equal(await output('arbitrage').count(), 1); assert.equal(await output('max-sharpe').count(), 0);
    assert.equal(await lab.locator('polyline.secondary-line').count(), 0); await geometry();
    await correlation.press('ArrowRight'); assert.equal(await correlation.inputValue(), '-0.95');
    assert.equal(await output('arbitrage').count(), 0); assert.equal(await lab.locator('polyline.secondary-line').count(), 1);
    await reset(); close(await value('mean'), 9); close(await value('sigma'), 12.04); await geometry();
  }

  try {
    for (const width of [1440, 360]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
      await page.goto(`${base}/portfolio-theory.html`, { waitUntil: 'networkidle' });
      await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
      await lab.waitFor(); await page.evaluate(() => document.fonts.ready);
      await interactions(); report.checks.push(`Keyboard sliders, endpoint weights, rho ±1, CAL and reset at ${width}px`);
      for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => document.documentElement.setAttribute('data-theme', theme), theme);
        await geometry();
        await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
        const violations = await page.evaluate(async () => (await axe.run(document.querySelector('.portfolio-lab'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => node.target) })));
        report.states.push({ width, theme, violations });
        assert.deepEqual(violations.filter(item => ['serious', 'critical'].includes(item.impact)), []);
        await page.evaluate(() => document.activeElement?.blur());
        const viewport = page.viewportSize(), bounds = await lab.boundingBox();
        await page.setViewportSize({ width, height: Math.max(viewport.height, Math.ceil(bounds.height) + 160) });
        await lab.evaluate(element => element.scrollIntoView({ behavior: 'instant', block: 'start' }));
        await lab.screenshot({ path: path.join(__dirname, `portfolio-${width}-${theme}.png`), style: '.book-mobile-header { visibility: hidden !important; }' });
        await page.setViewportSize(viewport);
      }
    }
    assert.deepEqual(report.errors, []); report.status = 'passed';
  } catch (error) { report.status = 'failed'; report.errors.push(error.stack); process.exitCode = 1; }
  finally {
    await browser.close();
    fs.writeFileSync(path.join(__dirname, 'portfolio-browser-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  }
})();
