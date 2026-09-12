const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const base = process.env.STOCHASTIC_PREVIEW_URL || 'http://127.0.0.1:8763';
const chapter = 'applied-stochastic-calculus.html';
const notebook = 'notebooks/applied-stochastic-calculus.ipynb';
const labIds = ['qv-ito-lab', 'gbm-euler-lab', 'correlated-noise-lab'];
const axePath = require.resolve('axe-core/axe.min.js');
const report = { status: 'running', checks: [], states: [], failures: [], pageErrors: [], failedResponses: [], externalRequests: [] };
const close = (actual, expected, tolerance = 1e-4) => assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance, `${actual} != ${expected} (tolerance ${tolerance})`);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => report.pageErrors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) report.failedResponses.push({ url: response.url(), status: response.status() }); });
  page.on('request', request => { if (!request.url().startsWith(base) && !/^(file:|data:|blob:)/.test(request.url())) report.externalRequests.push(request.url()); });
  async function check(name, action) {
    try { await action(); report.checks.push(name); }
    catch (error) { report.failures.push({ name, message: error.message }); }
  }
  async function loadChapter(url = base + '/' + chapter) {
    await page.goto(url, { waitUntil: 'networkidle' });
    for (const id of labIds) await page.locator('#' + id + ' .lab').waitFor();
    await page.evaluate(() => document.fonts.ready);
  }
  async function menu(open) {
    if (page.viewportSize().width <= 800 && (await page.locator('#menu-button').getAttribute('aria-expanded') === 'true') !== open) await page.locator('#menu-button').click();
  }
  async function theme(value) {
    if (await page.locator('html').getAttribute('data-theme') !== value) { await menu(true); await page.locator('#theme-button').click(); }
    await menu(false);
  }
  const number = async (kind, key) => parseFloat((await page.locator(`[data-${kind}="${key}"]`).innerText()).replaceAll(',', '').replaceAll('−', '-'));
  async function chartGeometry() {
    const selector = labIds.map(id => '#' + id + ' .chart svg').join(',');
    const svgs = page.locator(selector);
    assert.ok(await svgs.count() >= 3, 'All three labs need visible charts');
    const issues = await svgs.evaluateAll(charts => charts.flatMap(svg => {
      const width = svg.viewBox.baseVal.width, height = svg.viewBox.baseVal.height;
      const title = svg.querySelector('title')?.textContent;
      const desc = svg.querySelector('desc')?.textContent;
      if (!title || !desc) return [{ title, issue: 'Chart needs an accessible title and description' }];
      const bad = [];
      for (const shape of svg.querySelectorAll('polygon, polyline, circle')) {
        const points = shape.tagName === 'circle' ? [[Number(shape.getAttribute('cx')), Number(shape.getAttribute('cy'))]] : shape.getAttribute('points').trim().split(/\s+/).map(pair => pair.split(',').map(Number));
        for (const [x, y] of points) if (!Number.isFinite(x) || !Number.isFinite(y) || x < 51 - .02 || x > width - 20 + .02 || y < 30 - .02 || y > height - 48 + .02) bad.push({ title, shape: shape.tagName, point: [x, y], width, height });
      }
      return bad;
    }));
    assert.deepEqual(issues, [], 'Chart geometry must be finite and inside the plot');
  }
  async function scan(name, onChapter = true) {
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    await page.addScriptTag({ path: axePath });
    const result = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
    report.states.push({ name, overflow, violations: result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) });
    if (onChapter) {
      await chartGeometry();
      for (const id of labIds) {
        const lab = page.locator('#' + id); await lab.scrollIntoViewIfNeeded();
        await lab.screenshot({ path: path.join(__dirname, `${name}-${id}.png`), style: '.book-mobile-header { visibility: hidden !important; }' });
      }
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(__dirname, `${name}.png`), fullPage: true });
    assert.ok(overflow.scrollWidth <= overflow.width, `${name}: page overflows ${overflow.scrollWidth - overflow.width}px`);
    assert.equal(result.violations.length, 0, `${name}: ${result.violations.map(v => v.id).join(', ')}`);
  }
  async function localLinks() {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'build-manifest.json'), 'utf8')), documents = {};
    for (const item of manifest.pages) {
      const html = fs.readFileSync(path.join(root, item.href), 'utf8');
      documents[item.href] = await page.evaluate(source => {
        const doc = new DOMParser().parseFromString(source, 'text/html');
        return { ids: [...doc.querySelectorAll('[id]')].map(e => e.id), links: [...doc.querySelectorAll('a[href],img[src]')].map(e => e.getAttribute('href') || e.getAttribute('src')) };
      }, html);
    }
    let checked = 0, anchors = 0; const missing = [];
    for (const [file, doc] of Object.entries(documents)) for (const ref of doc.links) {
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(ref)) continue;
      const url = new URL(ref, pathToFileURL(path.join(root, file))), target = decodeURIComponent(url.pathname), relative = path.relative(root, target);
      if (!fs.existsSync(target)) missing.push(`${file}: missing ${ref}`);
      else if (url.hash && relative.endsWith('.html')) { if (!documents[relative]?.ids.includes(decodeURIComponent(url.hash.slice(1)))) missing.push(`${file}: missing anchor ${ref}`); anchors++; }
      checked++;
    }
    report.localLinks = { checked, anchors, missing }; assert.deepEqual(missing, []);
  }
  async function notebookCheck() {
    const nb = JSON.parse(fs.readFileSync(path.join(root, notebook), 'utf8'));
    assert.equal(nb.nbformat, 4);
    const code = nb.cells.filter(cell => cell.cell_type === 'code' && (Array.isArray(cell.source) ? cell.source.join('') : cell.source).trim());
    assert.ok(code.length >= 3, 'Notebook should execute all three experiment topics');
    for (const cell of code) {
      assert.ok(Number.isInteger(cell.execution_count), 'Notebook code cell has not been executed');
      assert.equal(cell.outputs.some(output => output.output_type === 'error'), false, 'Notebook contains an execution error');
    }
    report.notebook = { codeCells: code.length, executed: code.length, bytes: fs.statSync(path.join(root, notebook)).size };
  }
  async function qvInteractions() {
    const lab = page.locator('#qv-ito-lab'), reset = lab.getByRole('button', { name: 'คืนค่าเริ่มต้นของ Quadratic variation', exact: true });
    await reset.click();
    close(await number('qv', 'value'), .924346, 1e-6); close(await number('qv', 'terminal'), -1.101549, 1e-6);
    const baseline = await lab.locator('.results, .calculation-strip').allTextContents();
    const terminal = await number('qv', 'terminal');
    const first = lab.getByRole('button', { name: '16 ก้าว', exact: true });
    await first.focus(); await first.press('Space'); assert.equal(await first.getAttribute('aria-pressed'), 'true');
    await page.keyboard.press('Tab'); await page.keyboard.press('Enter'); assert.equal(await lab.getByRole('button', { name: '64 ก้าว', exact: true }).getAttribute('aria-pressed'), 'true');
    for (const n of [16, 64, 256, 1024, 4096]) {
      await lab.getByRole('button', { name: `${n.toLocaleString('en-US')} ก้าว`, exact: true }).click();
      const q = await number('qv', 'value'), w = await number('qv', 'terminal');
      close(w, terminal, 1e-6); close(await number('qv', 'rms'), Math.sqrt(2 / n), 1e-6);
      close(await number('qv', 'ito-left'), .5 * (w * w - q), 2e-6);
      close(await number('qv', 'ito-limit'), .5 * (w * w - 1), 2e-6);
      close(await number('qv', 'identity-error'), 0, 1e-11);
      assert.ok(q > 0); assert.equal(await lab.locator('polyline').first().evaluate(shape => shape.getAttribute('points').trim().split(/\s+/).length), n + 1);
      const monotonic = await lab.locator('polyline').first().evaluate(shape => {
        const y = shape.getAttribute('points').trim().split(/\s+/).map(pair => Number(pair.split(',')[1]));
        return y.every((value, i) => i === 0 || value <= y[i - 1] + 1e-9);
      });
      assert.equal(monotonic, true, 'Cumulative quadratic variation must not decrease'); await chartGeometry();
    }
    await lab.getByRole('button', { name: 'สุ่มเส้นทาง Brownian ใหม่', exact: true }).click();
    assert.notEqual(await number('qv', 'terminal'), terminal); assert.match(await lab.locator('.seed').innerText(), /74/);
    await reset.click(); assert.deepEqual(await lab.locator('.results, .calculation-strip').allTextContents(), baseline);
  }
  async function gbmInteractions() {
    const lab = page.locator('#gbm-euler-lab'), reset = lab.getByRole('button', { name: 'คืนค่าเริ่มต้นของ Exact และ Euler', exact: true });
    const mu = lab.getByRole('slider', { name: 'Drift μ', exact: true }), sigma = lab.getByRole('slider', { name: 'Volatility σ', exact: true });
    const reseed = lab.getByRole('button', { name: 'สุ่มเส้นทางสำหรับ GBM ใหม่', exact: true });
    await reset.click(); close(await number('gbm-euler', 'exact'), 86.9089); close(await number('gbm-euler', 'euler'), 86.7745);
    const baseline = await lab.locator('.results').innerText(), terminal = await number('gbm-euler', 'terminal');
    for (const n of [4, 16, 64, 256, 1024]) {
      await lab.getByRole('button', { name: `${n.toLocaleString('en-US')} ก้าว`, exact: true }).click();
      close(await number('gbm-euler', 'terminal'), terminal, 1e-6);
      const exact = await number('gbm-euler', 'exact'), euler = await number('gbm-euler', 'euler');
      close(exact, 100 * Math.exp(.1 - .5 * .2 ** 2 + .2 * terminal), .0001);
      close(await number('gbm-euler', 'error'), Math.abs(euler - exact), .0002);
      assert.equal(await lab.locator('polyline').count(), 2);
      for (const line of await lab.locator('polyline').all()) assert.equal(await line.evaluate(shape => shape.getAttribute('points').trim().split(/\s+/).length), n + 1);
      await chartGeometry();
    }
    await mu.focus(); await mu.press('Home'); await mu.press('ArrowRight'); assert.equal(await mu.inputValue(), '-9');
    await sigma.focus(); await sigma.press('Home'); assert.equal(await sigma.inputValue(), '0');
    await mu.fill('10');
    for (const n of [4, 64]) {
      await lab.getByRole('button', { name: `${n} ก้าว`, exact: true }).click();
      close(await number('gbm-euler', 'exact'), 100 * Math.exp(.1), .00006);
      close(await number('gbm-euler', 'euler'), 100 * (1 + .1 / n) ** n, .00006);
      assert.ok(await number('gbm-euler', 'error') > 0, 'Zero volatility does not remove Euler drift discretization error');
    }
    const deterministicPrices = [await number('gbm-euler', 'exact'), await number('gbm-euler', 'euler')];
    await reseed.click(); assert.deepEqual([await number('gbm-euler', 'exact'), await number('gbm-euler', 'euler')], deterministicPrices);
    await mu.fill('0'); close(await number('gbm-euler', 'exact'), 100); close(await number('gbm-euler', 'euler'), 100); close(await number('gbm-euler', 'error'), 0);
    await reset.click(); await lab.getByRole('button', { name: '4 ก้าว', exact: true }).click(); await mu.fill('-10'); await sigma.fill('100');
    for (let i = 0; i < 8; i++) await reseed.click();
    await lab.getByRole('alert').waitFor(); assert.match(await lab.getByRole('alert').innerText(), /ก้าว 4/);
    assert.match(await lab.locator('.seed').innerText(), /81/); assert.ok(await number('gbm-euler', 'euler') < 0); assert.ok(await number('gbm-euler', 'exact') > 0);
    await chartGeometry();
    await reset.click(); assert.equal(await lab.getByRole('alert').count(), 0); assert.equal(await lab.locator('.results').innerText(), baseline);
  }
  async function scatterStats() {
    return page.locator('#correlated-noise-lab svg').evaluate(svg => {
      const w = svg.viewBox.baseVal.width, h = svg.viewBox.baseVal.height;
      const firstTick = [...svg.querySelectorAll('text')].find(text => Number(text.getAttribute('y')) === h - 26);
      const extent = Math.abs(Number(firstTick.textContent));
      const pairs = [...svg.querySelectorAll('circle')].map(point => [((Number(point.getAttribute('cx')) - 51) / (w - 71) - .5) * 2 * extent, (.5 - (Number(point.getAttribute('cy')) - 30) / (h - 78)) * 2 * extent]);
      const n = pairs.length, mx = pairs.reduce((s, p) => s + p[0], 0) / n, my = pairs.reduce((s, p) => s + p[1], 0) / n;
      let xx = 0, yy = 0, xy = 0; for (const [x, y] of pairs) { xx += (x - mx) ** 2; yy += (y - my) ** 2; xy += (x - mx) * (y - my); }
      return { count: n, pairs, varianceX: xx / (n - 1), varianceY: yy / (n - 1), correlation: xy / Math.sqrt(xx * yy) };
    });
  }
  async function correlationInteractions() {
    const lab = page.locator('#correlated-noise-lab'), reset = lab.getByRole('button', { name: 'คืนค่าเริ่มต้นของ Correlation', exact: true });
    const rho = lab.getByRole('slider', { name: 'Correlation เป้าหมาย ρ', exact: true });
    await reset.click(); close(await number('correlation', 'target'), .6); close(await number('correlation', 'sample'), .6124);
    const baseline = await lab.locator('.results').innerText(), original = await scatterStats();
    assert.equal(original.count, 2048); close(original.correlation, await number('correlation', 'sample'), .00006);
    close(original.varianceX, await number('correlation', 'variance-x'), .00006); close(original.varianceY, await number('correlation', 'variance-y'), .00006);
    assert.notEqual(await number('correlation', 'sample'), await number('correlation', 'target'));
    await rho.focus(); await rho.press('Home'); await rho.press('ArrowRight'); assert.equal(await rho.inputValue(), '-99');
    for (const value of [-100, 0, 100]) {
      await rho.fill(String(value)); close(await number('correlation', 'target'), value / 100);
      const plotted = await scatterStats(); assert.equal(plotted.count, 2048);
      close(plotted.correlation, await number('correlation', 'sample'), .00006);
      for (let i = 0; i < plotted.count; i++) {
        close(plotted.pairs[i][0], original.pairs[i][0], 1e-10);
        if (value !== 0) close(plotted.pairs[i][1], value / 100 * plotted.pairs[i][0], 1e-10);
      }
      if (value === 0) assert.ok(Math.abs(plotted.correlation) < .08, 'Independent finite sample should have small correlation');
      else close(plotted.correlation, value / 100, 1e-12);
      await chartGeometry();
    }
    await lab.getByRole('button', { name: 'สุ่มคู่ช็อกใหม่', exact: true }).click(); assert.match(await lab.locator('.seed').innerText(), /31416/);
    assert.notEqual(await number('correlation', 'variance-x'), Number(original.varianceX.toFixed(4)));
    await reset.click(); assert.equal(await lab.locator('.results').innerText(), baseline);
  }
  const terms = [
    ['quadratic-variation', 'Quadratic variation', 'ความแปรผันกำลังสอง', 'quadratic-variation'],
    ['mean-square-convergence', 'Mean-square convergence', 'การลู่เข้าแบบค่าเฉลี่ยกำลังสอง', 'quadratic-variation'],
    ['ito-integral', 'Itô integral', 'ปริพันธ์อิโต', 'ito-integral'],
    ['itos-lemma', 'Itô’s lemma', 'บทตั้งของอิโต', 'ito-lemma'],
    ['ornstein-uhlenbeck', 'Vasicek', 'ออร์นสไตน์', 'ou'],
    ['mean-reversion', 'Mean reversion', 'การกลับเข้าหาค่ากลาง', 'ou'],
    ['stationary-distribution', 'Stationary distribution', 'การแจกแจงคงตัว', 'ou'],
    ['euler-maruyama', 'Euler–Maruyama', 'ออยเลอร์', 'simulation'],
    ['discretization-error', 'Discretization error', 'ความคลาดเคลื่อนจากการแบ่งช่วง', 'simulation'],
    ['correlated-increments', 'Correlated increments', 'ก้าวสุ่มที่มีสหสัมพันธ์', 'correlation']
  ];
  try {
    await loadChapter();
    await check('Chapter, three labs, complete mathematics, section anchors and Notebook links', async () => {
      assert.equal(await page.locator('h1').innerText(), 'Applied Stochastic Calculus');
      const markdown = fs.readFileSync(path.join(root, 'applied-stochastic-calculus.md'), 'utf8');
      const expectedEquations = [...markdown.matchAll(/\$\$([\s\S]+?)\$\$/g)].length;
      assert.ok(expectedEquations > 20); assert.equal(await page.locator('.katex').count(), expectedEquations); assert.equal(await page.locator('.katex-error').count(), 0);
      assert.equal(await page.locator('.lab').count(), 3);
      for (const [, id] of markdown.matchAll(/<section[^>]+id="([^"]+)"/g)) assert.equal(await page.locator('section#' + id).count(), 1);
      assert.equal(await page.locator('.book-sidebar-footer a[download]').first().getAttribute('href'), notebook);
      assert.ok(await page.locator(`#content a[href="${notebook}"]`).count());
      assert.equal(await page.locator(`.book-nav a[href="${chapter}"]`).getAttribute('aria-current'), 'page');
    });
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 }); await loadChapter();
      await check(`Explanatory details and long equations remain keyboard-accessible at ${width}px`, async () => {
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
      await check(`Quadratic variation: refinement, finite Itô identity, theoretical RMS, keyboard and seed/reset at ${width}px`, qvInteractions);
      await check(`GBM: shared Brownian terminal, exact/Euler, sigma zero, negative Euler and seed/reset at ${width}px`, gbmInteractions);
      await check(`Correlation: all plotted samples, moments, rho endpoints, keyboard and seed/reset at ${width}px`, correlationInteractions);
      const answers = page.locator('#practice details'); assert.ok(await answers.count() > 0);
      for (const detail of await answers.all()) assert.notEqual(await detail.getAttribute('open'), null);
      for (const mode of ['light', 'dark']) { await theme(mode); await check(`Chapter ${width}px ${mode}: accessibility, overflow and chart geometry with answers open`, () => scan(`stochastic-${width}-${mode}`)); }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await check('Welcome and sidebar navigation reach Applied Stochastic Calculus', async () => {
      await page.goto(base + '/index.html'); await page.getByRole('link', { name: 'เปิดบท Applied Stochastic Calculus →', exact: true }).click();
      await page.locator('#qv-ito-lab .lab').waitFor(); assert.ok(page.url().endsWith('/' + chapter));
      await page.locator('.book-nav a[href="index.html"]').click(); await page.locator(`.book-nav a[href="${chapter}"]`).click(); assert.equal(await page.locator('h1').innerText(), 'Applied Stochastic Calculus');
    });
    await check('Site search: English/Thai, exact glossary destination, keyboard and Escape', async () => {
      await page.keyboard.press('Control+k'); await page.locator('#search-input').fill('stochastic calculus');
      assert.ok(await page.locator(`#search-results a[href^="${chapter}"]`).count());
      await page.locator('#search-input').fill('quadratic variation'); assert.ok(await page.locator('#search-results a[href="glossary.html#quadratic-variation"]').count());
      await page.locator('#search-input').fill('ความแปรผันกำลังสอง'); const entry = page.locator('#search-results a[href="glossary.html#quadratic-variation"]');
      await entry.focus(); await page.keyboard.press('Enter'); await page.waitForURL('**/glossary.html#quadratic-variation'); assert.equal(await page.locator('.glossary-term#quadratic-variation').isVisible(), true);
      await page.keyboard.press('Control+k'); await page.keyboard.press('Escape'); assert.equal(await page.locator('#search-dialog').evaluate(dialog => dialog.open), false);
    });
    await check('Ten glossary terms: English/Thai filters, exact anchors and keyboard return links', async () => {
      for (const [id, english, thai, anchor] of terms) {
        await page.goto(base + '/glossary.html#' + id);
        const entry = page.locator('.glossary-term#' + id), input = page.locator('#glossary-query'); assert.equal(await entry.isVisible(), true);
        for (const word of [english, thai]) { await input.fill(word); assert.equal(await entry.isVisible(), true); assert.match(await page.locator('#glossary-status').innerText(), /พบ \d+ คำ/); }
        const back = entry.getByRole('link', { name: 'ดูในบทเรียน', exact: true }); assert.equal(await back.getAttribute('href'), chapter + '#' + anchor);
        await back.focus(); await page.keyboard.press('Enter'); await page.waitForURL('**/' + chapter + '#' + anchor); assert.equal(await page.locator('section#' + anchor).count(), 1);
      }
    });
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 }); await page.goto(base + '/glossary.html#quadratic-variation');
      await check(`Glossary empty results, keyboard and clearing filter on hash navigation at ${width}px`, async () => {
        const input = page.locator('#glossary-query'); await input.focus(); await page.keyboard.type('not-a-real-term-25145');
        assert.equal(await page.locator('.glossary-term:visible').count(), 0); assert.match(await page.locator('#glossary-status').innerText(), /ไม่พบ/);
        await input.press('ControlOrMeta+a'); await input.press('Backspace'); assert.ok(await page.locator('.glossary-term:visible').count() > 10);
        await input.fill('Itô integral'); await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.getAttribute('href')), chapter + '#ito-integral');
        await input.fill('no-match-before-hash-change'); await page.evaluate(() => { location.hash = 'ito-integral'; });
        await page.waitForFunction(() => document.querySelector('#glossary-query').value === ''); assert.equal(await page.locator('.glossary-term#ito-integral').isVisible(), true);
      });
      for (const mode of ['light', 'dark']) { await theme(mode); await check(`Glossary ${width}px ${mode}: accessibility and overflow`, () => scan(`stochastic-glossary-${width}-${mode}`, false)); }
    }
    await check('Mobile site search in English and Thai', async () => {
      await menu(true); await page.locator('#search-button').click(); await page.locator('#search-input').fill('stochastic calculus'); assert.ok(await page.locator(`#search-results a[href^="${chapter}"]`).count());
      await page.locator('#search-input').fill('ความแปรผันกำลังสอง'); assert.ok(await page.locator('#search-results a[href="glossary.html#quadratic-variation"]').count()); await page.keyboard.press('Escape'); await menu(false);
    });
    await check('Offline file:// chapter, all three labs and search with zero network requests', async () => {
      const requests = [], record = request => { if (/^https?:/.test(request.url())) requests.push(request.url()); };
      page.on('request', record);
      try {
        await loadChapter(pathToFileURL(path.join(root, chapter)).href); await qvInteractions(); await gbmInteractions(); await correlationInteractions();
        await page.keyboard.press('Control+k'); await page.locator('#search-input').fill('stochastic calculus'); assert.ok(await page.locator(`#search-results a[href^="${chapter}"]`).count()); await page.keyboard.press('Escape');
      } finally { page.off('request', record); }
      assert.deepEqual(requests, []);
    });
    await check('All generated pages: local files, downloads and exact HTML anchors exist', localLinks);
    await check('Chapter Notebook is valid and all nonempty code cells executed without errors', notebookCheck);
  } catch (error) {
    report.failures.push({ name: 'QA setup or navigation', message: error.message });
  } finally {
    report.status = report.failures.length || report.pageErrors.length || report.failedResponses.length || report.externalRequests.length ? 'needs-fix' : 'passed';
    fs.writeFileSync(path.join(__dirname, 'stochastic-calculus-browser-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ status: report.status, passedChecks: report.checks.length, scannedStates: report.states.length, failures: report.failures, pageErrors: report.pageErrors, failedResponses: report.failedResponses, externalRequests: report.externalRequests, localLinks: report.localLinks, notebook: report.notebook }, null, 2));
    await browser.close(); if (report.status !== 'passed') process.exitCode = 1;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
