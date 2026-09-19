const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const slug = 'numerical-methods', chapter = `${slug}.html`;
const base = process.env.NUMERICAL_BASE_URL || 'http://127.0.0.1:8763';
const report = { status: 'running', checks: [], states: [], failures: [], pageErrors: [], failedResponses: [], externalRequests: [] };
const close = (actual, expected, tolerance = .00011) => assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance, `${actual} != ${expected} (tolerance ${tolerance})`);
const terms = ['finite-difference', 'boundary-condition', 'numerical-stability', 'domain-truncation'];

(async () => {
  const { monteCarloPrice, explicitFiniteDifference } = await import('../src/numerical-methods.mjs');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => report.pageErrors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) report.failedResponses.push({ url: response.url(), status: response.status() }); });
  page.on('request', request => { if (!request.url().startsWith(base) && !/^(file:|data:|blob:)/.test(request.url())) report.externalRequests.push(request.url()); });
  const mc = page.locator('#numerical-mc-lab'), fd = page.locator('#numerical-fd-lab');
  const number = async (lab, key) => {
    const output = page.locator(`[data-numerical-${lab}="${key}"]`);
    if (!await output.count()) return NaN;
    const text = (await output.innerText()).replaceAll(',', '').replaceAll('−', '-');
    return Number(text.match(/[-+]?\d+(?:\.\d+)?/)?.[0] ?? NaN);
  };
  const reset = lab => lab.getByRole('button', { name: 'คืนค่าเริ่มต้น', exact: true });
  async function check(name, action) {
    try { await action(); report.checks.push(name); }
    catch (error) { report.failures.push({ name, message: error.message }); }
  }
  async function load(url = `${base}/${chapter}`) {
    await page.goto(url, { waitUntil: 'networkidle' });
    for (const lab of [mc, fd]) await lab.locator('.lab').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: 'html,*{scroll-behavior:auto!important}' });
  }
  async function setRange(lab, label, value) {
    const slider = lab.getByRole('slider', { name: label, exact: true });
    const min = Number(await slider.getAttribute('min')), step = Number(await slider.getAttribute('step') || 1);
    const count = Math.round((value - min) / step);
    assert.ok(count >= 0 && count <= 500 && Math.abs(min + count * step - value) < 1e-9, `Reachable keyboard value for ${label}`);
    await slider.focus(); await slider.press('Home');
    for (let i = 0; i < count; i++) await slider.press('ArrowRight');
    close(Number(await slider.inputValue()), value, 1e-9);
  }
  async function setTheme(theme) {
    const mobile = page.viewportSize().width <= 800;
    if (mobile && await page.locator('#menu-button').getAttribute('aria-expanded') !== 'true') await page.locator('#menu-button').click();
    if (await page.locator('html').getAttribute('data-theme') !== theme) await page.locator('#theme-button').click();
    if (mobile && await page.locator('#menu-button').getAttribute('aria-expanded') === 'true') await page.locator('#menu-button').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
  }
  async function capture(id, name) {
    await page.locator(id).evaluate(element => window.scrollTo({ top: element.getBoundingClientRect().top + scrollY - 65, behavior: 'instant' }));
    await page.screenshot({ path: path.join(__dirname, `numerical-${name}.png`) });
  }
  async function scan(name, charts = true) {
    await page.evaluate(() => document.fonts.ready);
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    const violations = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, impact: v.impact, targets: v.nodes.map(n => n.target) })));
    const overflow = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    const geometry = charts ? await page.locator('.lab svg').evaluateAll(svgs => svgs.flatMap(svg => {
      const errors = [], width = svg.viewBox.baseVal.width, height = svg.viewBox.baseVal.height;
      if (!svg.querySelector('title')?.textContent || !svg.querySelector('desc')?.textContent) errors.push('Chart requires title and description');
      for (const text of svg.querySelectorAll('text')) {
        const box = text.getBBox();
        if (box.x < -1 || box.y < -1 || box.x + box.width > width + 1 || box.y + box.height > height + 1) errors.push(`Clipped chart text: ${text.textContent}`);
      }
      for (const shape of svg.querySelectorAll('polyline,polygon,circle')) {
        const points = shape.tagName.toLowerCase() === 'circle' ? [[Number(shape.getAttribute('cx')), Number(shape.getAttribute('cy'))]] : (shape.getAttribute('points') || '').trim().split(/\s+/).filter(Boolean).map(pair => pair.split(',').map(Number));
        if (points.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y) || x < -1 || x > width + 1 || y < -1 || y > height + 1)) errors.push('Non-finite or clipped chart data');
      }
      return errors;
    })) : [];
    const outputs = charts ? await page.locator('.lab .results strong').evaluateAll(elements => elements.flatMap(element => {
      const box = element.getBoundingClientRect(), parent = element.parentElement.getBoundingClientRect();
      return /NaN|Infinity|null|undefined/.test(element.textContent) || box.right > parent.right + 2 || box.left < parent.left - 2 ? [element.textContent] : [];
    })) : [];
    report.states.push({ name, overflow, violations, geometry, outputs });
    assert.ok(overflow.scrollWidth <= overflow.width, `${name}: page overflow`);
    assert.deepEqual(violations, [], `${name}: accessibility`);
    assert.deepEqual(geometry, [], `${name}: chart geometry`);
    assert.deepEqual(outputs, [], `${name}: result layout`);
  }
  async function mcInteractions() {
    await reset(mc).click();
    close(await number('mc', 'price'), 9.250405771689943); close(await number('mc', 'benchmark'), 9.413403383853016);
    close(await number('mc', 'se'), .13919777836121008);
    const baseline = await mc.locator('.results').innerText();
    const seedText = await mc.locator('.seed').innerText();
    const sampleSelect = mc.getByLabel('จำนวนตัวอย่าง N', { exact: true });
    assert.deepEqual(await sampleSelect.locator('option').evaluateAll(items => items.map(item => item.value)), ['100', '1000', '10000', '40000', '100000']);
    for (const samples of [100, 1000, 40000, 100000, 1000, 10000]) {
      await sampleSelect.selectOption(String(samples));
      const expected = monteCarloPrice({ samples });
      close(await number('mc', 'price'), expected.price); close(await number('mc', 'se'), expected.se);
      assert.equal(await mc.locator('.seed').innerText(), seedText);
    }
    const prefix = monteCarloPrice({ samples: 1000 }), extended = monteCarloPrice({ samples: 100000 });
    assert.deepEqual(prefix.terminalPreview, extended.terminalPreview);
    assert.deepEqual(prefix.checkpoints.at(-1), extended.checkpoints.find(row => row.n === 1000));
    await mc.getByRole('button', { name: 'สุ่มชุดใหม่', exact: true }).click();
    assert.notEqual(await mc.locator('.seed').innerText(), seedText);
    assert.notEqual(await mc.locator('.results').innerText(), baseline);
    await reset(mc).focus(); await page.keyboard.press('Enter');
    assert.equal(await mc.locator('.results').innerText(), baseline); assert.equal(await mc.locator('.seed').innerText(), seedText);
    const put = mc.getByRole('button', { name: 'Put', exact: true }); await put.focus(); await put.press('Space');
    assert.equal(await put.getAttribute('aria-pressed'), 'true'); close(await number('mc', 'price'), monteCarloPrice({ kind: 'put' }).price);
    await reset(mc).click();
    for (const label of ['ราคาหุ้น S', 'Volatility σ']) {
      const slider = mc.getByRole('slider', { name: label, exact: true });
      await slider.focus(); await slider.press('ArrowRight');
      assert.notEqual(await mc.locator('.results').innerText(), baseline);
      await reset(mc).click();
    }
    await sampleSelect.focus(); await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement !== document.body), true);
  }
  async function fdInteractions() {
    await reset(fd).click();
    close(await number('fd', 'price'), 9.352555601587659); close(await number('fd', 'benchmark'), 9.413403383853016);
    const baseline = await fd.locator('.results').innerText();
    const timeSelect = fd.getByLabel('จำนวน time step L', { exact: true });
    assert.deepEqual(await timeSelect.locator('option').evaluateAll(items => items.map(item => item.value)), ['100', '250', '1000', '4000', '16000']);
    await timeSelect.selectOption('100');
    assert.equal(Number.isFinite(await number('fd', 'price')), false);
    assert.doesNotMatch((await fd.locator('.results').allTextContents()).join(''), /9\.3526/);
    const repair = fd.getByRole('button', { name: 'ปรับ time step ให้ผ่านเกณฑ์', exact: true });
    await repair.focus(); await repair.press('Enter');
    const repairedSteps = Number(await timeSelect.inputValue());
    assert.ok(repairedSteps >= 250);
    close(await number('fd', 'price'), explicitFiniteDifference({ timeSteps: repairedSteps }).price);
    await reset(fd).click();
    await setRange(fd, 'ดอกเบี้ย r', 5);
    assert.equal(Number.isFinite(await number('fd', 'price')), false);
    assert.doesNotMatch((await fd.locator('.results').allTextContents()).join(''), /9\.3526/);
    await timeSelect.selectOption('16000');
    assert.equal(Number.isFinite(await number('fd', 'price')), false, 'A smaller dt must not hide negative spatial coefficients');
    if (await repair.isVisible()) assert.equal(await repair.isDisabled(), true);
    await reset(fd).click(); assert.equal(await fd.locator('.results').innerText(), baseline);
    const put = fd.getByRole('button', { name: 'Put', exact: true }); await put.focus(); await put.press('Space');
    assert.equal(await put.getAttribute('aria-pressed'), 'true'); close(await number('fd', 'price'), explicitFiniteDifference({ kind: 'put' }).price);
    await reset(fd).click();
    for (const label of ['จำนวนช่วงราคา M', 'ราคาหุ้น S', 'Volatility σ']) {
      const slider = fd.getByRole('slider', { name: label, exact: true });
      await slider.focus(); await slider.press('ArrowRight');
      assert.notEqual(await fd.locator('.results').innerText(), baseline);
      await reset(fd).click();
    }
  }
  async function localLinks() {
    const refs = [...new Set(await page.locator('#content a[href], .book-sidebar-footer a[download]').evaluateAll(items => items.map(item => item.getAttribute('href'))))];
    let checked = 0, anchors = 0;
    for (const ref of refs) {
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(ref)) continue;
      const url = new URL(ref, pathToFileURL(path.join(root, chapter))), target = decodeURIComponent(url.pathname);
      assert.ok(fs.existsSync(target), `Missing target: ${ref}`);
      if (url.hash && target.endsWith('.html')) {
        const found = await page.evaluate(({ html, id }) => new DOMParser().parseFromString(html, 'text/html').getElementById(id) !== null, { html: fs.readFileSync(target, 'utf8'), id: decodeURIComponent(url.hash.slice(1)) });
        assert.equal(found, true, `Missing anchor: ${ref}`); anchors++;
      }
      checked++;
    }
    report.localLinks = { checked, anchors };
  }
  try {
    await load();
    await check('Lesson title, both mounted labs, rendered maths, all three local figures, Notebook and current TOC', async () => {
      assert.equal(await page.locator('h1').innerText(), 'Introduction to Numerical Methods');
      const source = fs.readFileSync(path.join(root, `${slug}.md`), 'utf8');
      const equations = [...source.matchAll(/\$\$([\s\S]+?)\$\$/g)].length;
      assert.ok(equations >= 10); assert.equal(await page.locator('.equation .katex').count(), equations);
      assert.equal(await page.locator('.katex-error').count(), 0); assert.equal(await page.locator('.lab').count(), 2);
      for (const [, id] of source.matchAll(/<section[^>]+id="([^"]+)"/g)) assert.equal(await page.locator(`section#${id}`).count(), 1);
      assert.ok(await page.locator('.portfolio-figure img').evaluateAll(images => images.length === 3 && images.every(image => image.complete && image.naturalWidth > 0 && image.getAttribute('src').startsWith('assets/'))));
      assert.equal(await page.locator(`.book-nav a[href="${chapter}"]`).getAttribute('aria-current'), 'page');
      assert.equal(await page.locator('.book-sidebar-footer a[download]').first().getAttribute('href'), `notebooks/${slug}.ipynb`);
    });
    await check('Every local chapter reference and linked HTML anchor resolves', localLinks);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1050 }); await load();
      await check(`MC defaults, sample sizes, prefix identity, seed/reset, Put and keyboard at ${width}px`, mcInteractions);
      await check(`FD defaults, unsafe time/spatial grids, repair, Put/reset and keyboard at ${width}px`, fdInteractions);
    }
    for (const width of [320, 390, 768, 1440]) for (const theme of ['light', 'dark']) {
      await page.setViewportSize({ width, height: 1050 }); await load(); await setTheme(theme);
      await check(`Lesson ${width}px ${theme}: overflow, outputs, SVG bounds and WCAG AA`, () => scan(`lesson-${width}-${theme}`));
      if (width === 390 || width === 1440) for (const id of ['#numerical-methods-title', '#numerical-mc-lab', '#numerical-fd-lab']) await capture(id, `${width}-${theme}-${id.slice(1)}`);
    }
    await check('Glossary direct anchors, Thai/English/empty searches, keyboard recovery and lesson return links', async () => {
      for (const id of terms) {
        await page.goto(`${base}/glossary.html#${id}`);
        const entry = page.locator(`.glossary-term#${id}`), input = page.locator('#glossary-query');
        assert.equal(await entry.isVisible(), true);
        const title = await entry.locator('h3').innerText(), parts = title.split(/\s+[—–]\s+/);
        assert.equal(parts.length, 2, `Bilingual glossary heading: ${id}`);
        for (const query of parts) { await input.fill(query); assert.equal(await entry.isVisible(), true); }
        await input.fill('unmatched-numerical-term-921'); assert.equal(await page.locator('.glossary-term:visible').count(), 0);
        assert.match(await page.locator('#glossary-status').innerText(), /ไม่พบ/);
        await input.focus(); await input.press('ControlOrMeta+a'); await input.press('Backspace');
        assert.equal(await entry.isVisible(), true);
        const back = entry.locator(`a[href^="${chapter}#"]`).first(); await back.focus(); await back.press('Enter');
        await page.waitForURL(`**/${chapter}#*`); assert.equal(await page.locator(new URL(page.url()).hash).count(), 1);
      }
      await page.goto(`${base}/glossary.html`); await page.locator('#glossary-query').fill('unmatched-numerical-term-921');
      await page.evaluate(() => { location.hash = 'finite-difference'; });
      await page.waitForFunction(() => document.querySelector('#glossary-query').value === '');
      assert.equal(await page.locator('#finite-difference').isVisible(), true);
    });
    await page.setViewportSize({ width: 320, height: 1050 });
    await page.goto(`${base}/glossary.html`); await setTheme('light');
    await check('Glossary at 320px: overflow and WCAG AA', () => scan('glossary-320-light', false));
    await check('Welcome count follows TOC, new lesson card and keyboard site search work', async () => {
      await page.setViewportSize({ width: 1440, height: 1050 }); await page.goto(base);
      const lessonCount = require('yaml').parse(fs.readFileSync(path.join(root, '_toc.yml'), 'utf8')).chapters.filter(item => item.file !== 'glossary').length;
      assert.equal(await page.locator('.welcome-lesson').count(), lessonCount);
      await page.locator(`.welcome-text-link[href="${chapter}"]`).click(); await load();
      await page.keyboard.press('Control+k'); await page.locator('#search-input').fill('finite difference');
      assert.ok(await page.locator(`#search-results a[href^="${chapter}"]`).count() > 0);
      await page.keyboard.press('Escape'); assert.equal(await page.locator('#search-dialog').evaluate(dialog => dialog.open), false);
      report.lessonCount = lessonCount;
    });
    await check('Notebook source hash, executed cells, three embedded figures and identical Pages export', async () => {
      const notebookPath = path.join(root, 'notebooks', `${slug}.ipynb`), text = fs.readFileSync(notebookPath, 'utf8'), notebook = JSON.parse(text);
      const source = fs.readFileSync(path.join(root, `${slug}.md`));
      assert.equal(notebook.metadata.source.sha256, crypto.createHash('sha256').update(source).digest('hex'));
      const code = notebook.cells.filter(cell => cell.cell_type === 'code' && (Array.isArray(cell.source) ? cell.source.join('') : cell.source).trim());
      assert.ok(code.length >= 3);
      assert.ok(code.every(cell => Number.isInteger(cell.execution_count) && cell.execution_count > 0 && cell.outputs.every(output => output.output_type !== 'error')));
      assert.equal(notebook.cells.reduce((count, cell) => count + Object.keys(cell.attachments || {}).length, 0), 3);
      assert.equal(fs.readFileSync(path.join(root, '_site', 'notebooks', `${slug}.ipynb`), 'utf8'), text);
      report.notebook = { executedCodeCells: code.length, attachments: 3, sha256: notebook.metadata.source.sha256 };
    });
    await check('Offline exported page runs both labs, interactions and search without HTTP requests', async () => {
      const requests = [], record = request => { if (/^https?:/.test(request.url())) requests.push(request.url()); };
      page.on('request', record);
      try {
        await load(pathToFileURL(path.join(root, '_site', chapter)).href);
        await mcInteractions(); await fdInteractions();
        await page.keyboard.press('Control+k'); await page.locator('#search-input').fill('finite difference');
        assert.ok(await page.locator(`#search-results a[href^="${chapter}"]`).count() > 0); await page.keyboard.press('Escape');
      } finally { page.off('request', record); }
      assert.deepEqual(requests, []);
    });
  } catch (error) {
    report.failures.push({ name: 'Setup or navigation', message: error.message });
  } finally {
    report.status = report.failures.length || report.pageErrors.length || report.failedResponses.length || report.externalRequests.length ? 'needs-fix' : 'passed';
    fs.writeFileSync(path.join(__dirname, 'numerical-methods-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    await browser.close(); if (report.status !== 'passed') process.exitCode = 1;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
