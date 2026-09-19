const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root=path.resolve(__dirname,'..'), slug='asset-returns-stylized-facts';
const base=process.env.QA_BASE||'http://127.0.0.1:8763';
const lessonCount=require('yaml').parse(fs.readFileSync(path.join(root,'_toc.yml'),'utf8')).chapters.filter(c=>c.file!=='glossary').length;
(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  const errors=[],report={states:[],checks:[]};
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  async function ready(){
    await page.waitForFunction(()=>document.querySelectorAll('.lab').length===4);
    await page.evaluate(()=>document.fonts.ready);
    await page.addStyleTag({content:'html,*{scroll-behavior:auto!important}'});
  }
  async function capture(id,name){
    await page.locator(id).evaluate(el=>window.scrollTo({top:el.getBoundingClientRect().top+scrollY-65,behavior:'instant'}));
    await page.screenshot({path:path.join(__dirname,`stylized-${name}.png`)});
  }
  await page.goto(`${base}/${slug}.html`);await ready();
  assert.equal(await page.locator('.katex-error').count(),0);
  assert.ok(await page.locator('.katex').count()>30);
  assert.ok(await page.locator('.portfolio-figure img').evaluateAll(images=>images.length===4&&images.every(i=>i.complete&&i.naturalWidth>0)));
  const cluster=page.locator('#clustering-lab'), mix=page.locator('#variance-mixture-lab'), rv=page.locator('#realized-volatility-lab');
  assert.match(await cluster.locator('.results').innerText(),/0.330[\s\S]*1.701%[\s\S]*5.025/);
  await cluster.locator('button').nth(1).click();
  assert.match(await cluster.locator('.results').innerText(),/0.074[\s\S]*1.701%[\s\S]*5.025/);
  await cluster.locator('button').nth(0).click();await cluster.locator('button').nth(2).click();
  assert.match(await cluster.locator('.results strong').first().innerText(),/0.052/);
  await cluster.locator('button').nth(4).click();
  assert.equal(await cluster.locator('button').nth(4).getAttribute('aria-pressed'),'true');
  assert.match(await mix.locator('.results').innerText(),/11.219[\s\S]*2.969%/);
  await mix.locator('input').nth(1).focus();await page.keyboard.press('Home');
  assert.match(await mix.locator('.results').innerText(),/3.000[\s\S]*0.270%/);
  const curves=await mix.locator('polyline').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('points')));
  const coordinates=curves.map(s=>s.split(/[ ,]/).map(Number));
  assert.ok(coordinates[0].every((v,i)=>Math.abs(v-coordinates[1][i])<1e-9),'Normal-limit curves coincide within floating-point precision');
  await mix.locator('input').nth(0).focus();await page.keyboard.press('End');
  assert.match(await mix.locator('.results').innerText(),/3.000/);
  assert.match(await rv.locator('.results').innerText(),/1.067%[\s\S]*0.997%/);
  await rv.locator('input').focus();await page.keyboard.press('Home');
  let rvValues=await rv.locator('.results strong').allTextContents();assert.equal(rvValues[0],rvValues[1]);
  await rv.locator('button').last().click();
  assert.match(await rv.locator('.results').innerText(),/1 .*390/);
  await rv.locator('input').focus();await page.keyboard.press('End');
  rvValues=await rv.locator('.results strong').allTextContents();assert.notEqual(rvValues[0],rvValues[1]);
  report.checks.push('Default outputs; shuffle invariance; all ACF modes; mixture-to-Normal limit; zero noise and endpoint sampling; keyboard sliders');
  for(const theme of ['light','dark']){
    for(const width of [320,390,768,1440]){
      await page.setViewportSize({width,height:1100});await page.goto(`${base}/${slug}.html`);await ready();
      await page.evaluate(theme=>{localStorage.setItem('theme',theme);document.documentElement.setAttribute('data-theme',theme);},theme);
      await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
      const violations=await page.evaluate(async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
      const clippedChartText=await page.locator('.lab svg').evaluateAll(svgs=>svgs.flatMap(svg=>[...svg.querySelectorAll('text')].filter(t=>{const b=t.getBBox();return b.x < -1 || b.x+b.width > svg.viewBox.baseVal.width+1;}).map(t=>t.textContent)));
      report.states.push({width,theme,overflow,violations,clippedChartText});
      assert.equal(overflow,false,JSON.stringify({width,theme}));
      assert.deepEqual(violations,[],JSON.stringify({width,theme,violations}));
      assert.deepEqual(clippedChartText,[],JSON.stringify({width,theme,clippedChartText}));
      if(width===390||width===1440){
        for(const id of ['#stylized-facts-title','#clustering-lab','#variance-mixture-lab','#realized-volatility-lab'])await capture(id,`${theme}-${width}-${id.slice(1)}`);
      }
    }
  }
  await page.setViewportSize({width:1440,height:1100});
  await page.evaluate(()=>document.documentElement.setAttribute('data-theme','light'));
  for(const id of ['#volatility-clustering .portfolio-figure','#intraday-seasonality .portfolio-figure','#realized-variance .portfolio-figure'])await capture(id,id.split(' ')[0].slice(1)+'-figure');
  await page.goto(`${base}/glossary.html#autocorrelation`);
  await page.locator('#glossary-query').fill('autocorrelation');assert.equal(await page.locator('#autocorrelation').isVisible(),true);
  await page.locator('#glossary-query').fill('\u0e2b\u0e32\u0e07\u0e2b\u0e19\u0e32');assert.equal(await page.locator('#fat-tails').isVisible(),true);
  await page.locator('#glossary-query').fill('zzzzz');assert.match(await page.locator('#glossary-status').innerText(),/\u0e44\u0e21\u0e48\u0e1e\u0e1a/);
  await page.locator('#glossary-query').fill('');await page.locator('#realized-variance a').click();assert.ok(page.url().includes(`${slug}.html#realized-variance`));
  await page.goto(base);assert.equal(await page.locator('.welcome-lesson').count(),lessonCount);
  await page.locator(`.welcome-text-link[href="${slug}.html"]`).click();await ready();
  await page.getByRole('button',{name:'Search',exact:false}).click();await page.getByRole('searchbox').fill('realized variance');
  assert.ok(await page.locator(`#search-results a[href*="${slug}"]`).count()>0);await page.keyboard.press('Escape');
  report.checks.push('Eight responsive/theme states; WCAG AA automated checks; chart text bounds; new glossary terms and Thai/English/empty search; navigation and site search');
  await page.goto('file://'+path.join(root,'_site',slug+'.html'));await ready();
  assert.match(await page.locator('#variance-mixture-lab .results').innerText(),/11.219/);
  const notebook=JSON.parse(fs.readFileSync(path.join(root,'notebooks',slug+'.ipynb')));
  const source=fs.readFileSync(path.join(root,slug+'.md'));
  assert.equal(notebook.metadata.source.sha256,crypto.createHash('sha256').update(source).digest('hex'));
  assert.equal(notebook.cells.filter(c=>c.cell_type==='code').length,18);
  assert.equal(notebook.cells.reduce((n,c)=>n+Object.keys(c.attachments||{}).length,0),4);
  assert.ok(notebook.cells.filter(c=>c.cell_type==='code').every(c=>c.execution_count&&c.outputs.every(o=>o.output_type!=='error')));
  report.checks.push('Offline export mounts all four labs; notebook source hash, four embedded figures and eighteen executed code cells');
  assert.deepEqual(errors,[]);report.errors=errors;report.status='passed';
  fs.writeFileSync(path.join(__dirname,'stylized-facts-report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
