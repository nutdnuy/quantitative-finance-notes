const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const chapter = 'portfolio-optimization.html';
const chapterTitle = 'Portfolio Optimization & Black–Litterman';
const pageURL = name => pathToFileURL(path.join(root, name)).href;
const axePath = require.resolve('axe-core/axe.min.js');
const editableDiagram = 'assets/diagrams/optimization-black-litterman-roadmap.excalidraw';
const figures = [
  'assets/images/optimization-types.svg',
  'assets/images/optimization-curvature.svg',
  'assets/images/optimization-covariance.svg',
  'assets/images/optimization-ols.svg',
  'assets/images/optimization-gls.svg',
  'assets/images/optimization-lagrange.svg',
  'assets/images/optimization-target-allocation.svg',
  'assets/images/optimization-frontier.svg',
  'assets/images/optimization-target-weights.svg',
  'assets/images/optimization-black-litterman-roadmap.svg',
  'assets/images/optimization-black-litterman-beliefs.svg',
  'assets/images/optimization-black-litterman-weights.svg',
  'assets/images/optimization-kkt.svg',
  'assets/images/optimization-active.svg',
];
const terms = [
  ['objective-function', 'optimization-problem'],
  ['decision-variable', 'optimization-problem'],
  ['optimization-constraint', 'optimization-problem'],
  ['gradient', 'gradient-hessian'],
  ['hessian', 'gradient-hessian'],
  ['ordinary-least-squares', 'regression-optimization'],
  ['generalized-least-squares', 'regression-optimization'],
  ['lagrange-multiplier', 'lagrange-method'],
  ['black-litterman', 'black-litterman'],
  ['kkt-conditions', 'inequality-constraints'],
  ['active-weight', 'benchmark-active'],
];
const report = {
  status: 'running',
  checks: [],
  states: [],
  figures: [],
  glossary: [],
  errors: [],
  externalRequests: [],
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('request', request => {
    if (/^https?:/i.test(request.url())) report.externalRequests.push(request.url());
  });

  try {
    await page.goto(pageURL(chapter), { waitUntil: 'load' });
    await page.locator('#content').waitFor();
    await page.locator('#portfolio-optimization-lab .portfolio-optimization-lab').waitFor();
    await page.evaluate(() => document.fonts.ready);

    assert.equal((await page.locator('#content h1').first().innerText()).trim(), chapterTitle);
    assert.equal((await page.locator('.book-nav a[aria-current="page"]').innerText()).trim(), chapterTitle);
    assert.equal(await page.locator('.katex-error').count(), 0);
    assert.ok(await page.locator('.katex').count() >= 30, 'Expected at least 30 rendered KaTeX expressions');
    report.checks.push('Offline file chapter, title, current sidebar entry and KaTeX rendering');

    const images = page.locator('#content .portfolio-figure img');
    assert.equal(await images.count(), figures.length);
    const imageState = await images.evaluateAll(items => items.map(image => ({
      src: image.getAttribute('src'),
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    })));
    assert.deepEqual(imageState.map(item => item.src).sort(), [...figures].sort());
    assert.equal(imageState.every(item => item.complete && item.naturalWidth > 0 && item.naturalHeight > 0), true);
    assert.equal(imageState.every(item => item.src && !/^(?:https?:)?\/\//i.test(item.src)), true);
    report.figures = imageState;

    const editable = page.locator(`#content a[href="${editableDiagram}"][download]`);
    assert.equal(await editable.count(), 1);
    assert.equal(fs.existsSync(path.join(root, editableDiagram)), true, `Missing editable diagram ${editableDiagram}`);
    report.checks.push('Fourteen complete local SVG figures and downloadable Excalidraw source');

    const details = page.locator('#content details');
    assert.ok(await details.count() > 0);
    for (const detail of await details.all()) {
      if (await detail.getAttribute('open') === null) {
        await detail.locator('summary').focus();
        await page.keyboard.press('Enter');
      }
      assert.notEqual(await detail.getAttribute('open'), null);
    }
    const answer = await page.locator('#exercises details').innerText();
    assert.match(answer, /1\.245108/);
    assert.match(answer, /24\.5108%/);
    assert.match(answer, /w_1=0|w₁\s*=\s*0/);
    assert.match(answer, /1\s*[\u2212-]\s*1\s*=\s*0/);
    report.checks.push('Exercise answers open from the keyboard and retain the budget, borrowing, binding-constraint and active-weight checks');

    await page.addScriptTag({ path: axePath });
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
      for (const theme of ['light', 'dark']) {
        await page.evaluate(value => document.documentElement.setAttribute('data-theme', value), theme);
        await page.evaluate(() => scrollTo(0, 0));
        await page.evaluate(() => document.fonts.ready);
        const overflow = await page.evaluate(() => ({
          viewport: innerWidth,
          document: document.documentElement.scrollWidth,
          body: document.body.scrollWidth,
        }));
        assert.ok(overflow.document <= overflow.viewport && overflow.body <= overflow.viewport, `${width}/${theme}: horizontal overflow`);
        const violations = await page.evaluate(async () => (await axe.run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
        })).violations.map(item => ({
          id: item.id,
          impact: item.impact,
          targets: item.nodes.map(node => node.target),
        })));
        assert.deepEqual(violations.filter(item => ['serious', 'critical'].includes(item.impact)), []);
        report.states.push({ width, theme, overflow, violations });
        await page.screenshot({ path: path.join(__dirname, `portfolio-optimization-page-${width}-${theme}.png`) });
      }
    }
    report.checks.push('No overflow and no serious or critical axe violations at 1440, 390 and 320 pixels in both themes');

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    for (let index = 0; index < figures.length; index++) {
      const slug = path.basename(figures[index], '.svg');
      await page.locator('#content .portfolio-figure').nth(index).screenshot({
        path: path.join(__dirname, `portfolio-optimization-figure-${String(index + 1).padStart(2, '0')}-${slug}.png`),
      });
    }
    report.checks.push('Each of the fourteen figures has an isolated QA screenshot');

    for (const [id, anchor] of terms) {
      await page.goto(`${pageURL('glossary.html')}#${id}`, { waitUntil: 'load' });
      const entry = page.locator(`.glossary-term#${id}`);
      const field = page.locator('#glossary-query');
      assert.equal(await entry.isVisible(), true, `Missing glossary term ${id}`);
      const heading = (await entry.locator('h3').innerText()).trim();
      const labels = heading.split(/\s+—\s+/).map(value => value.trim()).filter(Boolean);
      assert.ok(labels.length >= 2, `${id}: expected English and Thai labels separated by an em dash`);
      for (const query of [labels[0], labels[1]]) {
        await field.fill(query);
        assert.equal(await entry.isVisible(), true, `${id}: search failed for ${query}`);
        assert.match(await page.locator('#glossary-status').innerText(), /พบ/);
      }
      const expectedBacklink = `${chapter}#${anchor}`;
      const backlink = entry.locator(`a[href="${expectedBacklink}"]`);
      assert.ok(await backlink.count() > 0, `${id}: missing ${expectedBacklink}`);
      await backlink.first().focus();
      await page.keyboard.press('Enter');
      await page.waitForURL(`**/${chapter}#${anchor}`);
      assert.equal(await page.locator(`section#${anchor}`).count(), 1);
      report.glossary.push({ id, english: labels[0], thai: labels[1], backlink: expectedBacklink });
    }

    await page.goto(pageURL('glossary.html'), { waitUntil: 'load' });
    const field = page.locator('#glossary-query');
    await field.fill('no-match-portfolio-optimization-7219');
    assert.equal(await page.locator('.glossary-term:visible').count(), 0);
    assert.match(await page.locator('#glossary-status').innerText(), /ไม่พบ/);
    await field.press('ControlOrMeta+a');
    await field.press('Backspace');
    assert.ok(await page.locator('.glossary-term:visible').count() >= terms.length);
    report.checks.push('Eleven new glossary terms support English and Thai filtering, direct anchors, empty results and exact lesson backlinks');

    await page.keyboard.press('Control+k');
    await page.locator('#search-input').fill('Portfolio Optimization');
    assert.ok(await page.locator(`#search-results a[href^="${chapter}"]`).count() > 0);
    await page.locator('#search-input').fill('Black–Litterman');
    assert.ok(await page.locator(`#search-results a[href^="${chapter}"]`).count() > 0);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#search-dialog').evaluate(dialog => dialog.open), false);
    report.checks.push('Site search finds the chapter by both Portfolio Optimization and Black–Litterman and closes with Escape');

    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.externalRequests, []);
    report.status = 'passed';
  } catch (error) {
    report.status = 'failed';
    report.errors.push(error.stack);
    process.exitCode = 1;
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(__dirname, 'portfolio-optimization-page-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  }
})().catch(error => {
  report.status = 'failed';
  report.errors.push(error.stack);
  console.error(error);
  process.exitCode = 1;
});
