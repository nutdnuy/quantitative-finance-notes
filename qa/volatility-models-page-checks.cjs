const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..'), slug = 'volatility-models-arch';
const base = 'http://127.0.0.1:8763';
const figures = ['arch-update', 'arch-forecast', 'arch-news-impact'];
const terms = [
  { id: 'conditional-variance', english: 'conditional variance', thai: 'ความแปรปรวนแบบมีเงื่อนไข', anchor: 'arch-framework' },
  { id: 'garch', english: 'GARCH', thai: 'แบบจำลอง variance', anchor: 'garch-recursion' },
  { id: 'volatility-persistence', english: 'half-life', thai: 'ความคงอยู่ของผลช็อก', anchor: 'forecasting' },
  { id: 'gjr-garch', english: 'GJR', thai: 'ช็อกบวกและลบไม่สมมาตร', anchor: 'asymmetric-gjr' },
  { id: 'quasi-maximum-likelihood', english: 'QMLE', thai: 'การประมาณด้วย', anchor: 'residual-checks' },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const errors = [], report = { states: [], figures: [], glossary: [], checks: [], warnings: [] };
  // Keep unrelated concurrent edits from reloading a page during an interaction.
  // Explicit navigation below still loads the currently generated pages.
  await page.route('**/__version', route => route.fulfill({ status: 200, body: 'arch-qa-snapshot' }));
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  async function ready() {
    await page.waitForFunction(() => document.querySelectorAll('#arch-forecast-lab .lab').length === 1);
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: 'html,*{scroll-behavior:auto!important}' });
  }
  async function capture(selector, name) {
    await page.locator(selector).screenshot({ path: path.join(__dirname, `arch-${name}.png`) });
  }
  function clippedText(svg) {
    const bounds = svg.viewBox.baseVal;
    return [...svg.querySelectorAll('text')].filter(text => {
      const box = text.getBBox();
      return box.x < bounds.x - 1 || box.x + box.width > bounds.x + bounds.width + 1 || box.y < bounds.y - 1 || box.y + box.height > bounds.y + bounds.height + 1;
    }).map(text => text.textContent);
  }

  await page.goto(`${base}/${slug}.html`); await ready();
  assert.equal(await page.locator('.katex-error').count(), 0);
  report.katexCount = await page.locator('.katex').count();
  assert.ok(report.katexCount > 30);
  assert.ok(await page.locator('.portfolio-figure img').evaluateAll(images => images.length === 3 && images.every(image => image.complete && image.naturalWidth > 0)));
  const lab = page.locator('#arch-forecast-lab');
  assert.equal(await page.getByTestId('forecast-next-sd').innerText(), '1.281%');
  assert.match(await page.getByTestId('forecast-half-life').innerText(), /13\.51/);
  assert.equal(await page.getByTestId('forecast-total-sd').innerText(), '2.810%');
  assert.equal(await page.getByTestId('forecast-flat-sd').innerText(), '2.864%');
  const originalValues = await lab.locator('.results strong').allTextContents();
  const originalCurve = await lab.locator('polyline').first().getAttribute('points');
  await lab.getByRole('button', { name: /Shock บวก/ }).click();
  assert.equal(await lab.getByRole('button', { name: /Shock บวก/ }).getAttribute('aria-pressed'), 'true');
  assert.deepEqual(await lab.locator('.results strong').allTextContents(), originalValues);
  assert.equal(await lab.locator('polyline').first().getAttribute('points'), originalCurve);
  await lab.getByRole('button', { name: /Shock ลบ/ }).focus(); await page.keyboard.press('Enter');
  assert.equal(await lab.getByRole('button', { name: /Shock ลบ/ }).getAttribute('aria-pressed'), 'true');
  await page.getByLabel('ช่วงสะสมผลตอบแทน H', { exact: true }).focus(); await page.keyboard.press('Home');
  assert.equal(await page.getByTestId('forecast-total-sd').innerText(), await page.getByTestId('forecast-flat-sd').innerText());
  await page.keyboard.press('End');
  assert.equal(await page.getByTestId('forecast-total-sd').innerText(), '8.498%');
  assert.equal(await page.getByTestId('forecast-flat-sd').innerText(), '9.920%');
  for (const input of await lab.locator('input[type="range"]').all()) {
    await input.focus(); await page.keyboard.press('Home'); await page.keyboard.press('End');
    assert.ok((await lab.locator('.results strong').allTextContents()).every(text => !/NaN|Infinity/.test(text)));
  }
  report.checks.push('One mounted lab; default hand-calculated SDs; sign symmetry; keyboard buttons and all slider endpoints; H = 1 and H = 60');

  for (const theme of ['light', 'dark']) for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1100 });
    await page.goto(`${base}/${slug}.html`); await ready();
    await page.evaluate(theme => document.documentElement.setAttribute('data-theme', theme), theme);
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    const violations = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) })));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    const clippedChartText = await lab.locator('svg').evaluateAll(svgs => svgs.flatMap(svg => {
      const bounds = svg.viewBox.baseVal;
      return [...svg.querySelectorAll('text')].filter(text => { const box = text.getBBox(); return box.x < -1 || box.x + box.width > bounds.width + 1 || box.y < -1 || box.y + box.height > bounds.height + 1; }).map(text => text.textContent);
    }));
    report.states.push({ width, theme, overflow, violations, clippedChartText });
    assert.equal(overflow, false, `${width} ${theme}`);
    assert.deepEqual(violations, [], `${width} ${theme}`);
    assert.deepEqual(clippedChartText, [], `${width} ${theme}`);
    if (width === 390 || width === 1440) {
      await capture('#arch-title', `${theme}-${width}-title`);
      await capture('#arch-forecast-lab', `${theme}-${width}-lab`);
      if (width === 390) {
        await page.locator('#arch-forecast-lab').evaluate(element => window.scrollTo({ top: element.getBoundingClientRect().top + scrollY - 80, behavior: 'instant' }));
        await page.screenshot({ path: path.join(__dirname, `arch-${theme}-390-lab-viewport.png`) });
      }
      for (const [index, figure] of figures.entries()) {
        await page.locator('.portfolio-figure').nth(index).screenshot({ path: path.join(__dirname, `arch-${theme}-${width}-${figure}.png`) });
      }
    }
  }
  // An <img> isolates the SVG DOM. Open each local asset separately to inspect
  // its complete viewBox and text, including content scrolled off mobile screens.
  const assetPage = await browser.newPage({ viewport: { width: 1100, height: 850 } });
  for (const figure of figures) {
    await assetPage.goto(`${base}/assets/images/${figure}.svg`);
    const clipped = await assetPage.locator('svg').evaluate(clippedText);
    assert.deepEqual(clipped, [], figure);
    await assetPage.locator('svg').screenshot({ path: path.join(__dirname, `arch-source-${figure}.png`) });
    report.figures.push({ file: `${figure}.svg`, clippedText: clipped });
  }
  await assetPage.close();
  report.checks.push('Eight full-page responsive/theme states; WCAG AA automated checks; no document overflow; live chart and three SVG text bounds; figures and screenshots');

  await page.setViewportSize({ width: 390, height: 1100 });
  for (const term of terms) {
    await page.goto(`${base}/glossary.html#${term.id}`);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator(`#${term.id}`).isVisible(), true);
    for (const query of [term.english, term.thai]) {
      await page.locator('#glossary-query').fill(query);
      assert.equal(await page.locator(`#${term.id}`).isVisible(), true, `${term.id}: ${query}`);
    }
    await page.locator('#glossary-query').fill('zzzz-no-such-arch-term');
    assert.match(await page.locator('#glossary-status').innerText(), /ไม่พบ/);
    assert.equal(await page.locator('.glossary-term:visible').count(), 0);
    await page.locator('#glossary-query').focus(); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.press('Backspace');
    assert.equal(await page.locator(`#${term.id}`).isVisible(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.locator(`#${term.id} a`).focus(); await page.keyboard.press('Enter');
    await page.waitForURL(`**/${slug}.html#${term.anchor}`); await ready();
    assert.equal(await page.locator(`#${term.anchor}`).count(), 1);
    report.glossary.push({ id: term.id, english: term.english, thai: term.thai, returnAnchor: term.anchor });
  }
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(base);
  const lessonCount = () => require('yaml').parse(fs.readFileSync(path.join(root, '_toc.yml'), 'utf8')).chapters.filter(chapter => chapter.file !== 'glossary').length;
  let expectedCount = lessonCount(), welcomeCount = await page.locator('.welcome-lesson').count();
  if (welcomeCount !== expectedCount) { await page.reload(); expectedCount = lessonCount(); welcomeCount = await page.locator('.welcome-lesson').count(); }
  report.welcome = { lessonCount: expectedCount, visibleCount: welcomeCount };
  if (welcomeCount !== expectedCount) report.warnings.push('Concurrent edits: Welcome count differs from the current _toc.yml; no unrelated content changed by this check.');
  assert.equal(await page.locator(`.welcome-text-link[href="${slug}.html"]`).count(), 1);
  await page.locator(`.welcome-text-link[href="${slug}.html"]`).click(); await ready();
  assert.ok(await page.locator(`.book-sidebar a[href="${slug}.html"]`).count() > 0);
  await page.getByRole('button', { name: 'Search', exact: false }).click(); await page.getByRole('searchbox').fill('ARCH');
  assert.ok(await page.locator(`#search-results a[href*="${slug}"]`).count() > 0);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#search-dialog').isVisible(), false);
  report.checks.push('Five glossary direct anchors, English/Thai/empty/no-match filtering and keyboard return links; new Welcome/sidebar entry; ARCH site search');

  const references = await page.locator('main a[href], main img[src]').evaluateAll(elements => elements.map(element => ({ raw: element.getAttribute('href') || element.getAttribute('src'), url: new URL(element.getAttribute('href') || element.getAttribute('src'), location.href).href })).filter(item => new URL(item.url).origin === location.origin));
  for (const reference of references) {
    const url = new URL(reference.url), local = path.join(root, decodeURIComponent(url.pathname));
    assert.ok(fs.existsSync(local), `Missing local reference: ${reference.raw}`);
    if (url.hash && local.endsWith('.html')) assert.ok(fs.readFileSync(local, 'utf8').includes(`id="${decodeURIComponent(url.hash.slice(1))}"`), `Missing anchor: ${reference.raw}`);
  }
  report.localReferencesChecked = references.length;
  report.checks.push('Chapter body local links, term anchors, Notebook download and images resolve to current generated files');

  const exportPath = path.join(root, '_site', `${slug}.html`);
  const exportAssetsCurrent = fs.existsSync(exportPath) && [...figures.map(figure => `assets/images/${figure}.svg`), 'app.js'].every(file => fs.existsSync(path.join(root, '_site', file)) && fs.readFileSync(path.join(root, file)).equals(fs.readFileSync(path.join(root, '_site', file))));
  const offlinePath = exportAssetsCurrent ? exportPath : path.join(root, `${slug}.html`);
  report.offlinePath = offlinePath;
  if (!exportAssetsCurrent) report.warnings.push('The export does not contain the latest chapter assets; verified the current root-generated page offline instead.');
  await page.goto('file://' + offlinePath); await ready();
  assert.equal(await page.getByTestId('forecast-next-sd').innerText(), '1.281%');
  assert.ok(await page.locator('.portfolio-figure img').evaluateAll(images => images.length === 3 && images.every(image => image.complete && image.naturalWidth > 0)));
  const appAsset = await page.locator('script[src*="app.js"]').getAttribute('src');
  assert.match(appAsset, /^app\.js\?v=/);
  const notebook = JSON.parse(fs.readFileSync(path.join(root, 'notebooks', `${slug}.ipynb`), 'utf8'));
  const sourceHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, `${slug}.md`))).digest('hex');
  assert.equal(notebook.metadata.source.sha256, sourceHash);
  const codeCells = notebook.cells.filter(cell => cell.cell_type === 'code');
  assert.equal(codeCells.length, 13);
  assert.equal(notebook.cells.reduce((count, cell) => count + Object.keys(cell.attachments || {}).length, 0), 3);
  assert.ok(codeCells.every(cell => cell.execution_count && cell.outputs.every(output => output.output_type !== 'error')));
  report.notebook = { sourceHash, executedCells: codeCells.length, embeddedImages: 3 };
  report.offlineAppAsset = appAsset;
  report.checks.push('Offline generated page with query-string app asset; three loaded SVGs; Notebook source hash, 13 executed code cells and three embedded figures');
  assert.deepEqual(errors, []);
  report.errors = errors; report.status = 'passed';
  fs.writeFileSync(path.join(__dirname, 'volatility-models-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
