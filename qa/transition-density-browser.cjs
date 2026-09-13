const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..'), base = process.env.TRANSITION_PREVIEW_URL || 'http://127.0.0.1:8763';
const chapter = 'transition-density-functions.html', notebook = 'notebooks/transition-density-functions.ipynb';
const axePath = require.resolve('axe-core/axe.min.js');
const report = { status: 'running', checks: [], states: [], failures: [], pageErrors: [], failedResponses: [], externalRequests: [] };
const terms = [
  ['trinomial-random-walk', 'Trinomial random walk', 'การเดินสุ่มสามทาง', 'walk'],
  ['probability-mass', 'Probability mass', 'มวลความน่าจะเป็น', 'density'],
  ['transition-density', 'Transition density', 'ความหนาแน่นของความน่าจะเป็นในการเปลี่ยนสถานะ', 'density'],
  ['markov-property', 'Markov property', 'สมบัติมาร์คอฟ', 'backward'],
  ['diffusion-coefficient', 'Diffusion coefficient', 'สัมประสิทธิ์การแพร่', 'scaling'],
  ['forward-kolmogorov', 'Forward Kolmogorov', 'โคลโมโกรอฟไปข้างหน้า', 'forward'],
  ['backward-kolmogorov', 'Backward Kolmogorov', 'โคลโมโกรอฟย้อนกลับ', 'backward'],
  ['taylor-expansion', 'Taylor expansion', 'การขยายเทย์เลอร์', 'forward'],
  ['similarity-solution', 'Similarity solution', 'คำตอบที่คงรูป', 'similarity'],
  ['dirac-delta', 'Dirac delta', 'เดลตาของดิแรก', 'dirac']
];
const close = (actual, expected, tolerance = 1e-4) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', error => report.pageErrors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) report.failedResponses.push({ url: response.url(), status: response.status() }); });
  page.on('request', request => { if (!request.url().startsWith(base) && !/^(file:|data:)/.test(request.url())) report.externalRequests.push(request.url()); });
  async function check(name, action) {
    try { await action(); report.checks.push(name); }
    catch (error) { report.failures.push({ name, message: error.message }); }
  }
  async function loadChapter(url = base + '/' + chapter) {
    await page.goto(url); await page.locator('[data-density="probability"]').waitFor(); await page.locator('[data-trinomial="mass"]').waitFor();
    await page.evaluate(() => document.fonts.ready);
  }
  async function menu(open) {
    if (page.viewportSize().width <= 800 && (await page.locator('#menu-button').getAttribute('aria-expanded') === 'true') !== open) await page.locator('#menu-button').click();
  }
  async function theme(value) {
    if (await page.locator('html').getAttribute('data-theme') !== value) { await menu(true); await page.locator('#theme-button').click(); }
    await menu(false);
  }
  const number = async (kind, key) => parseFloat((await page.locator(`[data-${kind}="${key}"]`).innerText()).replaceAll(',', ''));
  async function chartGeometry() {
    const issues = await page.locator('#transition-density-lab .chart svg, #trinomial-density-lab .chart svg').evaluateAll(svgs => svgs.flatMap(svg => {
      const width = svg.viewBox.baseVal.width, height = svg.viewBox.baseVal.height;
      return [...svg.querySelectorAll('polygon, polyline')].flatMap(shape => {
        const points = shape.getAttribute('points').trim().split(/\s+/).map(pair => pair.split(',').map(Number));
        return points.filter(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y) || x < 51 - .01 || x > width - 20 + .01 || y < 30 - .01 || y > height - 48 + .01).map(point => ({ chart: svg.querySelector('title').textContent, shape: shape.tagName, point, width, height }));
      });
    }));
    assert.deepEqual(issues, [], 'Chart shapes must have finite coordinates inside the plot');
  }
  async function scan(name, onChapter = true) {
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    await page.addScriptTag({ path: axePath });
    const result = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
    report.states.push({ name, overflow, violations: result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) });
    if (onChapter) {
      await chartGeometry();
      for (const [id, suffix] of [['transition-density-lab', 'density-chart'], ['trinomial-density-lab', 'trinomial-chart']]) {
        const chart = page.locator('#' + id + ' .chart'); await chart.scrollIntoViewIfNeeded();
        await chart.screenshot({ path: path.join(__dirname, `${name}-${suffix}.png`) });
      }
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(__dirname, name + '.png') });
    assert.equal(overflow.scrollWidth <= overflow.width, true, `${name}: page overflows ${overflow.scrollWidth - overflow.width}px`);
    assert.equal(result.violations.length, 0, `${name}: ${result.violations.map(v => v.id).join(', ')}`);
  }
  async function densityInteractions() {
    const lab = page.locator('#transition-density-lab');
    const reset = lab.getByRole('button', { name: 'คืนค่าเริ่มต้นของความหนาแน่น', exact: true });
    await reset.click(); close(await number('density', 'probability'), 52.0499877813); close(await number('density', 'mean'), 1); close(await number('density', 'variance'), 2); close(await number('density', 'sd'), Math.SQRT2);
    await lab.getByRole('slider', { name: 'เวลาที่ผ่านไป τ', exact: true }).fill('0.25');
    close(await number('density', 'probability'), 84.270079295);
    const bandBounds = await lab.locator('.chart svg').evaluate(svg => {
      const x = [...svg.querySelectorAll('.event-line')].map(line => Number(line.getAttribute('x1')));
      const points = svg.querySelector('polygon.band').getAttribute('points').trim().split(/\s+/).map(pair => Number(pair.split(',')[0]));
      return { bounds: x, low: Math.min(...points), high: Math.max(...points) };
    });
    close(bandBounds.low, Math.min(...bandBounds.bounds)); close(bandBounds.high, Math.max(...bandBounds.bounds));
    for (const a of ['2', '3']) {
      await lab.getByRole('slider', { name: 'ขอบล่างของช่วง a', exact: true }).fill(a);
      await lab.getByRole('alert').waitFor(); assert.equal(await lab.locator('[data-density="probability"]').count(), 0);
      assert.equal(await lab.locator('polygon.band,.event-line').count(), 0);
    }
    await reset.click();
    const start = lab.getByRole('slider', { name: 'จุดเริ่มต้น y', exact: true });
    await start.focus(); await start.press('Home'); await start.press('ArrowRight'); close(await number('density', 'mean'), -1.9);
    await lab.getByRole('slider', { name: 'สัมประสิทธิ์ c', exact: true }).fill('0.2');
    const time = lab.getByRole('slider', { name: 'เวลาที่ผ่านไป τ', exact: true });
    await time.focus(); await time.press('Home'); assert.equal(await time.inputValue(), '0.05'); close(await number('density', 'variance'), .004);
    await lab.getByRole('slider', { name: 'ขอบล่างของช่วง a', exact: true }).fill('-6');
    await lab.getByRole('slider', { name: 'ขอบบนของช่วง b', exact: true }).fill('6'); close(await number('density', 'probability'), 100);
    await chartGeometry();
    await lab.getByRole('slider', { name: 'สัมประสิทธิ์ c', exact: true }).fill('2'); await time.press('End');
    close(await number('density', 'variance'), 16); await chartGeometry();
    assert.match(await lab.innerText(), /ไม่ใช่ความน่าจะเป็น/); assert.match(await lab.innerText(), /Dirac delta/);
    await reset.click(); close(await number('density', 'probability'), 52.0499877813);
  }
  async function trinomialInteractions() {
    const lab = page.locator('#trinomial-density-lab'), reset = lab.getByRole('button', { name: 'คืนค่าเริ่มต้นของ Trinomial', exact: true });
    await reset.click(); close(await number('trinomial', 'mass'), 100); close(await number('trinomial', 'variance'), 2); close(await number('trinomial', 'mean'), 0); close(await number('trinomial', 'point-mass'), 44);
    const five = lab.getByRole('button', { name: '5 step', exact: true }); await five.focus(); await page.keyboard.press('Space'); assert.equal(await five.getAttribute('aria-pressed'), 'true');
    await page.keyboard.press('Tab'); await page.keyboard.press('Enter'); assert.equal(await lab.getByRole('button', { name: '10 step', exact: true }).getAttribute('aria-pressed'), 'true');
    const alpha = lab.getByRole('slider', { name: 'โอกาสลงหนึ่ง step α และโอกาสขึ้นหนึ่ง step α', exact: true });
    await alpha.focus(); await alpha.press('Home'); await alpha.press('ArrowRight'); assert.equal(await alpha.inputValue(), '0.15');
    for (const n of [2, 20, 100]) {
      await lab.getByRole('button', { name: `${n} step`, exact: true }).click();
      for (const value of ['0.1', '0.4']) {
        await alpha.fill(value); close(await number('trinomial', 'mass'), 100); close(await number('trinomial', 'variance'), 2); close(await number('trinomial', 'mean'), 0);
        assert.equal(await lab.locator('polygon.band').evaluate(shape => shape.getAttribute('points').trim().split(/\s+/).length), 2 + 2 * (2 * n + 1));
        await chartGeometry();
      }
    }
    assert.match(await lab.innerText(), /ความสูงของแท่ง = โอกาสที่จุด \/ h/); assert.match(await lab.innerText(), /หน่วย y/); assert.match(await lab.innerText(), /ครบทุกจุด/);
    await reset.click(); close(await number('trinomial', 'point-mass'), 44);
  }

  try {
    await loadChapter();
    await check('Chapter, two labs, rendered mathematics, illustration and Notebook links', async () => {
      assert.equal(await page.locator('h1').innerText(), 'Transition Density Functions');
      const expectedEquations = [...fs.readFileSync(path.join(root, 'transition-density-functions.md'), 'utf8').matchAll(/\$\$([\s\S]+?)\$\$/g)].length;
      assert.equal(await page.locator('.lab').count(), 2); assert.ok(expectedEquations > 0); assert.equal(await page.locator('.katex').count(), expectedEquations); assert.equal(await page.locator('.katex-error').count(), 0);
      assert.equal(await page.locator('.option-tree img').evaluate(img => img.complete && img.naturalWidth > 0), true);
      assert.equal(await page.locator('.book-sidebar-footer a[download]').first().getAttribute('href'), notebook);
      assert.ok(await page.locator(`#content a[href="${notebook}"]`).count());
      assert.equal(await page.locator(`.book-nav a[href="${chapter}"]`).getAttribute('aria-current'), 'page');
      assert.equal(await page.getByRole('link', { name: 'เปิดภาพขนาดเต็ม', exact: true }).getAttribute('href'), 'assets/diagrams/kolmogorov-directions.svg');
    });
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 }); await loadChapter();
      await check(`Density controls, interval shading, invalid/reset, tau minimum and keyboard at ${width}px`, densityInteractions);
      await check(`Trinomial refinement, alpha, exact support, mass/variance and keyboard at ${width}px`, trinomialInteractions);
      await check(`Diagram focus and horizontal scrolling at ${width}px`, async () => {
        const diagram = page.locator('.option-tree'); assert.equal(await diagram.getAttribute('tabindex'), '0'); await diagram.focus();
        if (await diagram.evaluate(element => element.scrollWidth > element.clientWidth)) {
          await diagram.press('ArrowRight'); await page.waitForFunction(() => document.querySelector('.option-tree').scrollLeft > 0);
          await diagram.evaluate(element => { element.scrollLeft = 0; });
        }
      });
      for (const detail of await page.locator('#practice details').all()) { await detail.locator('summary').focus(); await page.keyboard.press('Enter'); assert.equal(await detail.getAttribute('open') !== null, true); }
      for (const mode of ['light', 'dark']) { await theme(mode); await check(`Chapter ${width}px ${mode}: accessibility, overflow and chart bounds with practice answers open`, () => scan(`transition-${width}-${mode}`)); }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await check('Welcome and sidebar navigation reach the new chapter', async () => {
      await page.goto(base + '/index.html'); await page.getByRole('link', { name: 'เปิดบท Transition Density Functions →', exact: true }).click();
      await page.locator('[data-density="probability"]').waitFor(); assert.ok(page.url().endsWith('/' + chapter));
      await page.locator('.book-nav a[href="index.html"]').click(); await page.locator(`.book-nav a[href="${chapter}"]`).click(); assert.equal(await page.locator('h1').innerText(), 'Transition Density Functions');
    });
    await check('Site search: English and Thai, keyboard, exact glossary destination and Escape', async () => {
      await page.keyboard.press('Control+k'); await page.locator('#search-input').fill('transition density');
      assert.ok(await page.locator(`#search-results a[href^="${chapter}"]`).count()); assert.ok(await page.locator('#search-results a[href="glossary.html#transition-density"]').count());
      await page.locator('#search-input').fill('เดลตาของดิแรก'); const term = page.locator('#search-results a[href="glossary.html#dirac-delta"]');
      await term.focus(); await page.keyboard.press('Enter'); await page.waitForURL('**/glossary.html#dirac-delta'); assert.equal(await page.locator('.glossary-term#dirac-delta').isVisible(), true);
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
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 }); await page.goto(base + '/glossary.html#transition-density');
      await check(`Glossary empty results, keyboard and clearing filter on hash navigation at ${width}px`, async () => {
        const input = page.locator('#glossary-query'); await input.focus(); await page.keyboard.type('not-a-real-term-7219');
        assert.equal(await page.locator('.glossary-term:visible').count(), 0); assert.match(await page.locator('#glossary-status').innerText(), /ไม่พบ/);
        await input.press('ControlOrMeta+a'); await input.press('Backspace'); assert.ok(await page.locator('.glossary-term:visible').count() > 10);
        await input.fill('Dirac delta'); await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.getAttribute('href')), chapter + '#dirac');
        await input.fill('no-match-before-hash-change'); await page.evaluate(() => { location.hash = 'dirac-delta'; });
        await page.waitForFunction(() => document.querySelector('#glossary-query').value === ''); assert.equal(await page.locator('.glossary-term#dirac-delta').isVisible(), true);
      });
      for (const mode of ['light', 'dark']) { await theme(mode); await check(`Glossary ${width}px ${mode}: accessibility and overflow`, () => scan(`transition-glossary-${width}-${mode}`, false)); }
    }
    await check('Mobile site search in English and Thai', async () => {
      await menu(true); await page.locator('#search-button').click(); await page.locator('#search-input').fill('transition density'); assert.ok(await page.locator(`#search-results a[href^="${chapter}"]`).count());
      await page.locator('#search-input').fill('เดลตาของดิแรก'); assert.ok(await page.locator('#search-results a[href="glossary.html#dirac-delta"]').count()); await page.keyboard.press('Escape'); await menu(false);
    });
    await check('Offline file:// chart interactions, diagram and search without network', async () => {
      await loadChapter(pathToFileURL(path.join(root, chapter)).href); await densityInteractions(); await trinomialInteractions();
      await page.keyboard.press('Control+k'); await page.locator('#search-input').fill('transition density'); assert.ok(await page.locator(`#search-results a[href^="${chapter}"]`).count()); await page.keyboard.press('Escape');
      assert.equal(await page.locator('.option-tree img').evaluate(img => img.complete && img.naturalWidth > 0), true);
    });
    await check('All generated pages: local files, downloads and exact HTML anchors exist', async () => {
      const manifest = JSON.parse(fs.readFileSync(path.join(root, 'build-manifest.json'), 'utf8')), documents = {};
      for (const item of manifest.pages) {
        const html = fs.readFileSync(path.join(root, item.href), 'utf8');
        documents[item.href] = await page.evaluate(source => {
          const doc = new DOMParser().parseFromString(source, 'text/html');
          return { ids: [...doc.querySelectorAll('[id]')].map(e => e.id), links: [...doc.querySelectorAll('a[href],img[src]')].map(e => e.getAttribute('href') || e.getAttribute('src')) };
        }, html);
      }
      let localLinks = 0, anchors = 0; const missing = [];
      for (const [file, doc] of Object.entries(documents)) for (const ref of doc.links) {
        if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(ref)) continue;
        const url = new URL(ref, pathToFileURL(path.join(root, file))), target = decodeURIComponent(url.pathname), relative = path.relative(root, target);
        if (!fs.existsSync(target)) missing.push(`${file}: missing ${ref}`);
        else if (url.hash && relative.endsWith('.html')) { if (!documents[relative]?.ids.includes(decodeURIComponent(url.hash.slice(1)))) missing.push(`${file}: missing anchor ${ref}`); anchors++; }
        localLinks++;
      }
      report.localLinks = { checked: localLinks, anchors, missing }; assert.deepEqual(missing, []);
    });
  } catch (error) {
    report.failures.push({ name: 'QA setup or navigation', message: error.message });
  } finally {
    report.status = report.failures.length || report.pageErrors.length || report.failedResponses.length || report.externalRequests.length ? 'needs-fix' : 'passed';
    fs.writeFileSync(path.join(__dirname, 'transition-density-browser-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ status: report.status, passedChecks: report.checks.length, scannedStates: report.states.length, failures: report.failures, pageErrors: report.pageErrors, failedResponses: report.failedResponses, externalRequests: report.externalRequests, localLinks: report.localLinks }, null, 2));
    await browser.close(); if (report.status !== 'passed') process.exitCode = 1;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
