const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname,'..');
const slug = 'value-at-risk-expected-shortfall';
const base = 'http://127.0.0.1:8763';
(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1050}});
  const errors=[],report={states:[],checks:[]};
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  async function ready(){
    await page.waitForFunction(()=>document.querySelectorAll('.lab').length===3);
    await page.evaluate(()=>document.fonts.ready);
    await page.addStyleTag({content:'html,*{scroll-behavior:auto!important}'});
  }
  async function capture(id,name){
    await page.locator(id).evaluate(el=>window.scrollTo({top:el.getBoundingClientRect().top+scrollY-65,behavior:'instant'}));
    await page.screenshot({path:path.join(__dirname,`tail-${name}.png`)});
  }
  await page.goto(`${base}/${slug}.html`);await ready();
  assert.equal(await page.locator('.katex-error').count(),0);
  assert.ok(await page.locator('.katex').count()>30);
  assert.ok(await page.locator('.portfolio-figure img').evaluateAll(images=>images.length===3&&images.every(i=>i.complete&&i.naturalWidth>0)));
  assert.match(await page.locator('#normal-tail-lab .results').innerText(),/5,141.23/);
  assert.match(await page.locator('#normal-tail-lab .results').innerText(),/5,890.12/);
  assert.match(await page.locator('#portfolio-tail-lab .results').innerText(),/28.74/);
  const empirical=page.locator('#empirical-tail-lab');
  await empirical.locator('input').focus();await page.keyboard.press('End');
  assert.match(await empirical.locator('.results').innerText(),/10.00%[\s\S]*60.00%/);
  await empirical.getByRole('button',{name:'97.5%',exact:true}).click();
  assert.match(await empirical.locator('.results').innerText(),/2.00%[\s\S]*28.40%/);
  const horizon=page.locator('#normal-tail-lab input').nth(2);
  await horizon.focus();await horizon.press('End');
  assert.match(await page.locator('#normal-tail-lab .results').innerText(),/16,257.99/);
  await page.locator('#portfolio-tail-lab input').nth(1).focus();await page.keyboard.press('ArrowRight');
  assert.match(await page.locator('#portfolio-tail-lab .lab-note').innerText(),/1,073.00/);
  report.checks.push('Default Python references; keyboard sliders; fixed VaR/changing ES; fractional 97.5% tail; horizon; repriced portfolio');
  for(const theme of ['light','dark']){
    for(const width of [320,390,768,1440]){
      await page.setViewportSize({width,height:1050});
      await page.goto(`${base}/${slug}.html`);await ready();
      await page.evaluate(theme=>{localStorage.setItem('theme',theme);document.documentElement.setAttribute('data-theme',theme);},theme);
      await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
      const violations=await page.evaluate(async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
      report.states.push({width,theme,overflow,violations});
      assert.equal(overflow,false,JSON.stringify({width,theme}));
      assert.deepEqual(violations,[],JSON.stringify({width,theme,violations}));
      if(width===390||width===1440){
        for(const id of ['#tail-risk-title','#empirical-tail-lab','#normal-tail-lab','#portfolio-tail-lab'])await capture(id,`${theme}-${width}-${id.slice(1)}`);
      }
    }
  }
  await page.setViewportSize({width:1440,height:1050});
  await page.evaluate(()=>document.documentElement.setAttribute('data-theme','light'));
  for(const id of ['#expected-shortfall .portfolio-figure','#distribution-checks .portfolio-figure','#backtesting .portfolio-figure'])await capture(id,id.split(' ')[0].slice(1)+'-figure');
  await page.goto(`${base}/glossary.html#expected-shortfall`);
  await page.locator('#glossary-query').fill('Expected Shortfall');
  assert.equal(await page.locator('#expected-shortfall').isVisible(),true);
  await page.locator('#glossary-query').fill('ขาดทุน');assert.equal(await page.locator('#value-at-risk').isVisible(),true);
  await page.locator('#glossary-query').fill('zzzzz');assert.match(await page.locator('#glossary-status').innerText(),/ไม่พบ/);
  await page.locator('#glossary-query').fill('');
  await page.locator('#expected-shortfall a').click();assert.ok(page.url().includes(`${slug}.html#expected-shortfall`));
  await page.goto(base);assert.equal(await page.locator('.welcome-lesson').count(),9);
  await page.getByRole('link',{name:'เปิดบท VaR และ ES →',exact:true}).click();await ready();
  await page.getByRole('button',{name:'Search',exact:false}).click();await page.getByRole('searchbox').fill('Expected Shortfall');
  assert.ok(await page.locator(`#search-results a[href*="${slug}"]`).count()>0);
  await page.keyboard.press('Escape');
  report.checks.push('Welcome ninth chapter; glossary Thai/English/empty search and return link; site search; responsive/light/dark accessibility');
  await page.goto('file://'+path.join(root,'_site',slug+'.html'));await ready();
  assert.match(await page.locator('#normal-tail-lab .results').innerText(),/5,141.23/);
  const notebook=JSON.parse(fs.readFileSync(path.join(root,'notebooks',slug+'.ipynb')));
  const source=fs.readFileSync(path.join(root,slug+'.md'));
  assert.equal(notebook.metadata.source.sha256,crypto.createHash('sha256').update(source).digest('hex'));
  assert.equal(notebook.cells.filter(c=>c.cell_type==='code').length,9);
  assert.equal(notebook.cells.reduce((n,c)=>n+Object.keys(c.attachments||{}).length,0),3);
  assert.ok(notebook.cells.filter(c=>c.cell_type==='code').every(c=>c.execution_count&&c.outputs.every(o=>o.output_type!=='error')));
  report.checks.push('Offline export mounts all labs; notebook source hash, three embedded figures and nine executed cells');
  assert.deepEqual(errors,[]);report.errors=errors;report.status='passed';
  fs.writeFileSync(path.join(__dirname,'tail-risk-report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
