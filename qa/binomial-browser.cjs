const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..'), base = process.env.BINOMIAL_PREVIEW_URL || 'http://127.0.0.1:8763';
const axePath = require.resolve('axe-core/axe.min.js');
const report = { status: 'running', checks: [], states: [], failures: [], pageErrors: [], failedResponses: [], externalRequests: [] };
const terms = [
  ['binomial-model', 'Binomial Model', 'ทวินาม', 'one-step'],
  ['recombining-tree', 'Recombining tree', 'กิ่งกลับมารวมกัน', 'two-step'],
  ['backward-induction', 'Backward induction', 'การคำนวณย้อนกลับ', 'two-step'],
  ['dynamic-hedging', 'Dynamic hedging', 'การปรับพอร์ตป้องกัน', 'dynamic-hedging'],
  ['self-financing', 'Self financing', 'เงินภายในพอร์ต', 'dynamic-hedging']
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', error => report.pageErrors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) report.failedResponses.push({ url: response.url(), status: response.status() }); });
  page.on('request', request => {
    if (!request.url().startsWith(base) && !/^(file:|data:)/.test(request.url())) report.externalRequests.push(request.url());
  });
  async function check(name, action) {
    try { await action(); report.checks.push(name); }
    catch (error) { report.failures.push({ name, message: error.message }); }
  }
  async function loadChapter(url = base + '/binomial-model.html') {
    await page.goto(url); await page.locator('[data-binomial="price"]').waitFor();
    await page.evaluate(() => document.fonts.ready);
  }
  async function menu(open) {
    if (page.viewportSize().width <= 800 && (await page.locator('#menu-button').getAttribute('aria-expanded') === 'true') !== open) await page.locator('#menu-button').click();
  }
  async function theme(value) {
    if (await page.locator('html').getAttribute('data-theme') !== value) { await menu(true); await page.locator('#theme-button').click(); }
    await menu(false);
  }
  async function scan(name, screenshotTarget) {
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    await page.addScriptTag({ path: axePath });
    const axe = await page.evaluate(() => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
    report.states.push({ name, overflow, violations: axe.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) });
    if (screenshotTarget) {
      await screenshotTarget.scrollIntoViewIfNeeded();
      await screenshotTarget.screenshot({ path: path.join(__dirname, name + '-section.png') });
    }
    else await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(__dirname, name + '.png') });
    assert.equal(overflow.scrollWidth <= overflow.width, true, `${name}: page overflows ${overflow.scrollWidth - overflow.width}px`);
    assert.equal(axe.violations.length, 0, `${name}: accessibility violations: ${axe.violations.map(v => v.id).join(', ')}`);
  }
  const number = async key => parseFloat((await page.locator(`[data-binomial="${key}"]`).innerText()).replaceAll(',', ''));
  async function interactions() {
    const lab = page.locator('#binomial-lab');
    await lab.getByRole('button', { name: 'คืนค่าเริ่มต้น', exact: true }).click();
    assert.equal(await number('price'), 5.25); assert.equal(await number('q'), .5); assert.equal(await number('delta'), .525); assert.equal(await number('cash'), -47.25);
    assert.equal(await lab.locator('tbody tr').count(), 3);
    const mid = lab.getByRole('button', { name: '2. ย้อนมาครึ่งปี', exact: true });
    await mid.focus(); await page.keyboard.press('Enter');
    assert.equal(await lab.locator('tbody tr').count(), 2); assert.match(await lab.locator('table').innerText(), /10\.5000/);
    await page.keyboard.press('Tab'); await page.keyboard.press('Space');
    assert.equal(await lab.locator('tbody tr').count(), 1); assert.match(await lab.locator('table').innerText(), /5\.2500/);
    const p = lab.getByRole('slider', { name: 'โอกาสหุ้นขึ้นในโลกจริง p', exact: true });
    await p.focus(); await p.press('Home'); await p.press('ArrowRight');
    assert.equal(await p.inputValue(), '2'); assert.equal(await number('price'), 5.25); assert.equal(await number('physical-expectation'), .0084);
    await lab.getByRole('button', { name: 'Put: สิทธิขาย', exact: true }).click();
    assert.equal(await number('price'), 5.25); assert.ok(await number('delta') < 0);
    await lab.getByRole('slider', { name: 'ราคาใช้สิทธิ K', exact: true }).fill('110');
    assert.ok(await number('price') > 5.25);
    await lab.getByRole('slider', { name: 'หุ้นขึ้นต่อ step (u − 1)', exact: true }).fill('15');
    await lab.getByRole('slider', { name: 'หุ้นลงต่อ step (1 − d)', exact: true }).fill('15');
    assert.ok(Number.isFinite(await number('price')));
    await lab.getByRole('button', { name: 'คืนค่าเริ่มต้น', exact: true }).click();
    const r = lab.getByRole('slider', { name: 'อัตราดอกเบี้ย r ต่อปี', exact: true });
    await r.focus(); await r.press('End');
    await lab.getByRole('alert').waitFor(); assert.equal(await lab.locator('[data-binomial="price"]').count(), 0);
    await lab.getByRole('button', { name: 'คืนค่าเริ่มต้น', exact: true }).click();
    assert.equal(await number('price'), 5.25); assert.equal(await number('physical-expectation'), 7.56);
    assert.equal(await lab.locator('tbody tr').count(), 3);
  }

  try {
    await loadChapter();
    await check('Chapter title, rendered mathematics, image and page-specific Notebook links', async () => {
      assert.equal(await page.locator('h1').innerText(), 'Binomial Model');
      assert.ok(await page.locator('.katex').count() >= 20); assert.equal(await page.locator('.katex-error').count(), 0);
      assert.equal(await page.locator('img[src="assets/diagrams/binomial-two-step.svg"]').evaluate(img => img.complete && img.naturalWidth > 0), true);
      assert.equal(await page.locator('.book-sidebar-footer a[download]').first().getAttribute('href'), 'notebooks/binomial-model.ipynb');
      assert.ok(await page.locator('#content a[href="notebooks/binomial-model.ipynb"]').count());
      assert.equal(await page.locator('.book-nav a[href="binomial-model.html"]').getAttribute('aria-current'), 'page');
    });
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
      await loadChapter();
      await check(`Lab inputs, backward stages, keyboard, p independence, Put and reset at ${width}px`, interactions);
      for (const mode of ['light', 'dark']) {
        await theme(mode);
        await check(`Chapter ${width}px ${mode}: accessibility and overflow`, () => scan(`binomial-${width}-${mode}`, page.locator('#binomial-lab')));
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await check('Welcome and sidebar navigation reach Binomial Model', async () => {
      await page.goto(base + '/index.html');
      await page.getByRole('link', { name: 'เปิดบท Binomial Model →', exact: true }).click();
      await page.locator('[data-binomial="price"]').waitFor(); assert.ok(page.url().endsWith('/binomial-model.html'));
      await page.locator('.book-nav a[href="index.html"]').click();
      await page.locator('.book-nav a[href="binomial-model.html"]').click();
      assert.equal(await page.locator('h1').innerText(), 'Binomial Model');
    });
    await check('Site search English/Thai, keyboard opening, exact glossary links and Escape', async () => {
      await page.keyboard.press('Control+k'); await page.locator('#search-input').fill('binomial');
      assert.ok(await page.locator('#search-results a[href^="binomial-model.html"]').count());
      assert.ok(await page.locator('#search-results a[href="glossary.html#binomial-model"]').count());
      await page.locator('#search-input').fill('ทวินาม');
      const term = page.locator('#search-results a[href="glossary.html#binomial-model"]');
      assert.equal(await term.count(), 1); await term.focus(); await page.keyboard.press('Enter');
      await page.waitForURL('**/glossary.html#binomial-model'); assert.equal(await page.locator('#binomial-model').isVisible(), true);
      await page.keyboard.press('Control+k'); await page.keyboard.press('Escape');
      assert.equal(await page.locator('#search-dialog').evaluate(dialog => dialog.open), false);
    });
    await check('New glossary terms: Thai/English filtering, exact anchors and return links', async () => {
      for (const [id, english, thai, anchor] of terms) {
        await page.goto(base + '/glossary.html#' + id);
        const entry = page.locator('.glossary-term#' + id), input = page.locator('#glossary-query');
        assert.equal(await entry.isVisible(), true);
        for (const word of [english, thai]) { await input.fill(word); assert.equal(await entry.isVisible(), true); assert.match(await page.locator('#glossary-status').innerText(), /พบ \d+ คำ/); }
        const back = entry.getByRole('link', { name: 'ดูในบทเรียน', exact: true });
        assert.equal(await back.getAttribute('href'), 'binomial-model.html#' + anchor);
        await back.focus(); await page.keyboard.press('Enter'); await page.waitForURL('**/binomial-model.html#' + anchor);
        assert.equal(await page.locator('section#' + anchor).count(), 1);
      }
    });
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
      await page.goto(base + '/glossary.html#binomial-model');
      await check(`Glossary keyboard and empty results at ${width}px`, async () => {
        const input = page.locator('#glossary-query');
        await input.focus(); await page.keyboard.type('not-a-real-term-9183');
        assert.equal(await page.locator('.glossary-term:visible').count(), 0); assert.match(await page.locator('#glossary-status').innerText(), /ไม่พบ/);
        await input.press('ControlOrMeta+a'); await input.press('Backspace');
        assert.ok(await page.locator('.glossary-term:visible').count() > 5);
        await input.fill('Backward induction'); await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.getAttribute('href')), 'binomial-model.html#two-step');
        await input.fill('no-match-before-hash-change');
        await page.evaluate(() => { location.hash = 'backward-induction'; });
        await page.waitForFunction(() => document.querySelector('#glossary-query').value === '');
        assert.equal(await page.locator('.glossary-term#backward-induction').isVisible(), true);
      });
      for (const mode of ['light', 'dark']) {
        await theme(mode);
        await check(`Glossary ${width}px ${mode}: accessibility and overflow`, () => scan(`binomial-glossary-${width}-${mode}`, page.locator('#group-binomial')));
      }
    }
    await check('Mobile site search reaches the new chapter in Thai and English', async () => {
      await menu(true); await page.locator('#search-button').click();
      await page.locator('#search-input').fill('binomial'); assert.ok(await page.locator('#search-results a[href^="binomial-model.html"]').count());
      await page.locator('#search-input').fill('ทวินาม'); assert.ok(await page.locator('#search-results a[href="glossary.html#binomial-model"]').count());
      await page.keyboard.press('Escape'); await menu(false);
    });
    await check('Offline file:// chapter, lab and site search work without network', async () => {
      await loadChapter(pathToFileURL(path.join(root, 'binomial-model.html')).href);
      await interactions(); await page.keyboard.press('Control+k'); await page.locator('#search-input').fill('Binomial');
      assert.ok(await page.locator('#search-results a[href^="binomial-model.html"]').count()); await page.keyboard.press('Escape');
      assert.equal(await page.locator('img[src="assets/diagrams/binomial-two-step.svg"]').evaluate(img => img.complete && img.naturalWidth > 0), true);
    });
    await check('All generated pages: local links, downloads and exact HTML anchors exist', async () => {
      const manifest = JSON.parse(fs.readFileSync(path.join(root, 'build-manifest.json'), 'utf8'));
      const documents = {};
      for (const item of manifest.pages) {
        const html = fs.readFileSync(path.join(root, item.href), 'utf8');
        documents[item.href] = await page.evaluate(source => {
          const doc = new DOMParser().parseFromString(source, 'text/html');
          return { ids: [...doc.querySelectorAll('[id]')].map(e => e.id), links: [...doc.querySelectorAll('a[href], img[src]')].map(e => e.getAttribute('href') || e.getAttribute('src')) };
        }, html);
      }
      let localLinks = 0, anchors = 0;
      const missing = [];
      for (const [file, doc] of Object.entries(documents)) for (const ref of doc.links) {
        if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(ref)) continue;
        const url = new URL(ref, pathToFileURL(path.join(root, file)));
        const target = decodeURIComponent(url.pathname), relative = path.relative(root, target);
        if (!fs.existsSync(target)) missing.push(`${file}: missing ${ref}`);
        else if (url.hash && relative.endsWith('.html')) {
          if (!documents[relative]?.ids.includes(decodeURIComponent(url.hash.slice(1)))) missing.push(`${file}: missing anchor ${ref}`);
          anchors++;
        }
        localLinks++;
      }
      report.localLinks = { checked: localLinks, anchors, missing }; assert.deepEqual(missing, []);
    });
  } catch (error) {
    report.failures.push({ name: 'QA setup or navigation', message: error.message });
  } finally {
    report.status = report.failures.length || report.pageErrors.length || report.failedResponses.length || report.externalRequests.length ? 'needs-fix' : 'passed';
    fs.writeFileSync(path.join(__dirname, 'binomial-browser-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ status: report.status, passedChecks: report.checks.length, scannedStates: report.states.length, failures: report.failures, pageErrors: report.pageErrors, failedResponses: report.failedResponses, externalRequests: report.externalRequests, localLinks: report.localLinks }, null, 2));
    await browser.close();
    if (report.status !== 'passed') process.exitCode = 1;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
