const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root=path.resolve(__dirname,'..'), slug='regulation-basel';
const base=process.env.BASE_URL||'http://127.0.0.1:8763';
const labs=['basel-capital-lab','basel-liquidity-lab','basel-irb-lab'];
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1100}});
 const errors=[],report={states:[],checks:[]};
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 async function ready(){await page.waitForFunction(()=>document.querySelectorAll('.lab').length===3);await page.evaluate(()=>document.fonts.ready);await page.addStyleTag({content:'html,*{scroll-behavior:auto!important}'});}
 async function capture(id,name){await page.locator(id).evaluate(el=>window.scrollTo({top:el.getBoundingClientRect().top+scrollY-65,behavior:'instant'}));await page.screenshot({path:path.join(__dirname,`basel-${name}.png`)});}
 await page.goto(`${base}/${slug}.html`);await ready();
 assert.equal(await page.locator('.katex-error').count(),0);
 assert.ok(await page.locator('.katex').count()>40);
 assert.ok(await page.locator('.portfolio-figure img').evaluateAll(images=>images.length===3&&images.every(i=>i.complete&&i.naturalWidth>0)));
 const capital=page.locator('#basel-capital-lab'),lcr=page.locator('#basel-liquidity-lab'),irb=page.locator('#basel-irb-lab');
 assert.match(await capital.innerText(),/11\.67%/);assert.match(await capital.innerText(),/580/);
 await capital.locator('input').nth(0).focus();await page.keyboard.press('End');assert.match(await capital.innerText(),/7\.50%/);
 await capital.locator('input').nth(1).focus();await page.keyboard.press('End');assert.match(await capital.innerText(),/2\.33%/);
 await capital.locator('input').nth(2).focus();await page.keyboard.press('Home');assert.match(await capital.locator('.results').innerText(),/400/);
 assert.match(await lcr.locator('.results').innerText(),/120\.00%/);
 await lcr.locator('input').nth(2).focus();await page.keyboard.press('End');assert.match(await lcr.locator('.results').innerText(),/40\.00[\s\S]*300\.00%/);
 await lcr.locator('input').nth(0).focus();await page.keyboard.press('Home');assert.match(await lcr.locator('.results').innerText(),/100\.00%/);
 assert.match(await irb.locator('.results').innerText(),/0\.45[\s\S]*6\.31[\s\S]*7\.39[\s\S]*92\.32%/);
 await irb.locator('input').nth(2).focus();await page.keyboard.press('Home');assert.match(await irb.locator('.results').innerText(),/5\.86/);
 const curves=await irb.locator('polyline').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('points')));assert.equal(curves[0],curves[1]);
 await irb.locator('input').nth(0).focus();await page.keyboard.press('End');await irb.locator('input').nth(1).focus();await page.keyboard.press('End');await irb.locator('input').nth(2).focus();await page.keyboard.press('End');assert.doesNotMatch(await irb.innerText(),/NaN|Infinity/);
 report.checks.push('Numeric defaults, buffer/leverage/floor controls, binding inflow cap, keyboard slider boundaries, M=1 coincident curves');
 for(const theme of ['light','dark'])for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:1100});await page.goto(`${base}/${slug}.html`);await ready();
  await page.evaluate(theme=>{localStorage.setItem('theme',theme);document.documentElement.setAttribute('data-theme',theme);},theme);
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  const violations=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  const clippedChartText=await page.locator('.lab svg').evaluateAll(svgs=>svgs.flatMap(svg=>[...svg.querySelectorAll('text')].filter(t=>{const b=t.getBBox();return b.x < -1 || b.x+b.width > svg.viewBox.baseVal.width+1;}).map(t=>t.textContent)));
  report.states.push({width,theme,overflow,violations,clippedChartText});
  assert.equal(overflow,false,JSON.stringify({width,theme}));assert.deepEqual(violations,[],JSON.stringify({width,theme,violations}));assert.deepEqual(clippedChartText,[],JSON.stringify({width,theme,clippedChartText}));
  if(width===390||width===1440)for(const id of ['basel-title',...labs])await capture('#'+id,`${theme}-${width}-${id}`);
 }
 await page.setViewportSize({width:1440,height:1100});await page.evaluate(()=>document.documentElement.setAttribute('data-theme','light'));
 for(const id of ['capital-and-rwa','liquidity-coverage','irb-formula'])await capture(`#${id} .portfolio-figure`,`${id}-figure`);
 // Verify direct anchors for the lesson and every new glossary definition.
 for(const id of ['capital-and-rwa','leverage-and-floor','liquidity-coverage','stable-funding','expected-credit-loss','asrf-model','irb-formula'])assert.equal(await page.locator('#'+id).count(),1);
 await page.goto(`${base}/glossary.html#risk-weighted-assets`);
 const query=page.locator('#glossary-query');await query.fill('liquidity');assert.equal(await page.locator('#liquidity-coverage-ratio').isVisible(),true);
 await query.fill('สภาพคล่อง');assert.equal(await page.locator('#liquidity-coverage-ratio').isVisible(),true);
 await query.fill('zzzznoresult');assert.match(await page.locator('#glossary-status').innerText(),/ไม่พบ/);
 await query.fill('');await page.locator('#internal-ratings-based a').focus();await page.keyboard.press('Enter');await ready();assert.ok(page.url().endsWith(`${slug}.html#irb-formula`));
 await page.goto(`${base}/glossary.html#asrf`);await page.setViewportSize({width:320,height:1100});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.goto(base);await page.locator(`.welcome-text-link[href="${slug}.html"]`).click();await ready();
 assert.ok(await page.locator(`.book-sidebar a[href="${slug}.html"]`).count()>0);
 await page.setViewportSize({width:1440,height:1100});await page.getByRole('button',{name:'Search',exact:false}).click();await page.getByRole('searchbox').fill('ASRF');assert.ok(await page.locator(`#search-results a[href*="${slug}"]`).count()>0);await page.keyboard.press('Escape');
 report.checks.push('Eight responsive/theme states and automated WCAG AA checks; chart text bounds; glossary Thai/English/empty search, anchors, keyboard and mobile; welcome/sidebar/site search');
 await page.goto('file://'+path.join(root,'_site',slug+'.html'));await ready();assert.match(await page.locator('#basel-irb-lab .results').innerText(),/92\.32%/);
 const notebook=JSON.parse(fs.readFileSync(path.join(root,'notebooks',slug+'.ipynb'))),source=fs.readFileSync(path.join(root,slug+'.md'));
 assert.equal(notebook.metadata.source.sha256,crypto.createHash('sha256').update(source).digest('hex'));
 assert.equal(notebook.cells.filter(c=>c.cell_type==='code').length,11);assert.equal(notebook.cells.reduce((n,c)=>n+Object.keys(c.attachments||{}).length,0),3);
 assert.ok(notebook.cells.filter(c=>c.cell_type==='code').every(c=>c.execution_count&&c.outputs.every(o=>o.output_type!=='error')));
 const html=fs.readFileSync(path.join(root,'_site',slug+'.html'),'utf8');
 for(const match of html.matchAll(/href="([a-z0-9-]+\.html)#([^"]+)"/g)){
  const target=fs.readFileSync(path.join(root,'_site',match[1]),'utf8');
  assert.ok(target.includes('id="'+decodeURIComponent(match[2])+'"'),`Missing local anchor ${match[1]}#${match[2]}`);
 }
 report.checks.push('Offline labs, all chapter local fragment links, notebook source hash, three embedded figures, eleven executed cells');
 assert.deepEqual(errors,[]);report.errors=errors;report.status='passed';
 fs.writeFileSync(path.join(__dirname,'basel-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
