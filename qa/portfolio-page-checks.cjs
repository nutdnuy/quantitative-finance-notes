const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const pageURL = name => pathToFileURL(path.join(root, name)).href;
const report = { status: 'running', checks: [], states: [], errors: [], externalRequests: [] };

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url())) report.externalRequests.push(request.url()); });
  try {
    await page.goto(pageURL('portfolio-theory.html'));
    await page.locator('.portfolio-lab').waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('.portfolio-figure img').count(), 4);
    assert.equal(await page.locator('.portfolio-figure img').evaluateAll(images => images.every(i => i.complete && i.naturalWidth > 0)), true);
    assert.equal(await page.locator('.katex-error').count(), 0);
    assert.ok(await page.locator('.katex').count() > 25);
    assert.equal(await page.locator('.book-nav a[aria-current="page"]').innerText(), 'Portfolio Theory');
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => document.documentElement.setAttribute('data-theme', theme), theme);
        await page.evaluate(() => scrollTo(0, 0));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}/${theme}: overflow`);
        await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
        const violations = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, impact: v.impact, targets: v.nodes.map(n => n.target) })));
        report.states.push({ width, theme, violations });
        assert.deepEqual(violations.filter(v => ['serious', 'critical'].includes(v.impact)), []);
        await page.screenshot({ path: path.join(__dirname, `portfolio-page-${width}-${theme}.png`) });
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    for (let i = 0; i < 4; i++) await page.locator('.portfolio-figure').nth(i).screenshot({ path: path.join(__dirname, `portfolio-figure-${i+1}.png`) });
    await page.locator('#exercises summary').click();
    assert.match(await page.locator('#exercises details').innerText(), /99,000/);
    report.checks.push('Offline chapter, four local images, equations, native navigation, six responsive/theme states, accessible figures and exercise disclosure');

    await page.goto(pageURL('glossary.html'));
    const field = page.locator('#glossary-query');
    for (const query of ['covariance', 'ความแปรปรวนร่วม', 'Sharpe']) {
      await field.fill(query);
      assert.match(await page.locator('#glossary-status').innerText(), /พบ/);
      assert.ok(await page.locator('.glossary-term:visible').count() > 0);
    }
    await field.fill('no-match-portfolio-xyz');
    assert.match(await page.locator('#glossary-status').innerText(), /ไม่พบ/);
    await page.goto(pageURL('glossary.html')+'#efficient-frontier');
    assert.equal(await page.locator('#efficient-frontier').isVisible(), true);
    await page.locator('#efficient-frontier a').click();
    assert.ok(page.url().endsWith('portfolio-theory.html#efficient-frontier'));
    await page.locator('#search-button').click();
    await page.locator('#search-input').fill('Portfolio');
    assert.ok(await page.locator('#search-results a[href*="portfolio-theory.html"]').count() > 0);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#search-dialog').evaluate(d => d.open), false);
    report.checks.push('Thai/English glossary filtering, empty results, direct term anchor, return link, site search and Escape');
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.externalRequests, []);
    report.status = 'passed';
  } catch (error) {
    report.status = 'failed'; report.errors.push(error.stack); process.exitCode = 1;
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(__dirname, 'portfolio-page-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  }
})();
