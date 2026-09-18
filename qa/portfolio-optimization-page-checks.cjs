const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
const pageURL=name=>pathToFileURL(path.join(root,name)).href;
const report={status:'running',checks:[],states:[],errors:[],externalRequests:[]};
const chapters=[['portfolio-optimization','Optimization Problem',11],['black-litterman','Black–Litterman',3]];
const terms=[['objective-function','optimization-problem'],['gradient','gradient-hessian'],['hessian','gradient-hessian'],['ordinary-least-squares','regression-optimization'],['generalized-least-squares','regression-optimization'],['lagrange-multiplier','lagrange-method'],['reverse-optimization','black-litterman'],['black-litterman','black-litterman'],['kkt-conditions','inequality-constraints'],['active-weight','benchmark-active']];
(async()=>{
 const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))report.externalRequests.push(r.url())});
 try{
  for(const [slug,title,count] of chapters){
   await page.goto(pageURL(`${slug}.html`));await page.waitForFunction(()=>document.querySelectorAll('.katex').length>10);await page.evaluate(()=>document.fonts.ready);
   assert.equal((await page.locator('#content h1').first().innerText()).trim(),title);
   assert.equal((await page.locator('.book-nav a[aria-current="page"]').innerText()).trim(),title);
   assert.equal(await page.locator('.katex-error').count(),0);
   const source=fs.readFileSync(path.join(root,`${slug}.md`),'utf8'); const expectedMath=(source.match(/\\\(/g)||[]).length+(source.match(/\$\$/g)||[]).length/2;
   assert.equal(await page.locator('#content .katex').count(),expectedMath, 'Every inline and display equation renders');
   assert.deepEqual(await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return ids.filter((id,i)=>ids.indexOf(id)!==i)}),[], 'No duplicate anchors');
   const images=page.locator('#content .portfolio-figure img');assert.equal(await images.count(),count);
   const states=await images.evaluateAll(imgs=>imgs.map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0})));
   assert.ok(states.every(s=>s.loaded));assert.ok(states.every(s=>s.src.includes('black-litterman')===(slug==='black-litterman')));
   assert.equal(await page.locator('#black-litterman-lab').count(),slug==='black-litterman'?1:0);
   assert.ok(await page.locator(`a[href="notebooks/${slug}.ipynb"]`).count()>0);
   const notebook=JSON.parse(fs.readFileSync(path.join(root,`notebooks/${slug}.ipynb`),'utf8'));
   assert.equal(notebook.metadata.source.path,`${slug}.md`);
   assert.ok(notebook.cells.filter(c=>c.cell_type==='code').every(c=>c.execution_count>0&&!c.outputs.some(o=>o.output_type==='error')));
   const attachments=notebook.cells.flatMap(c=>Object.keys(c.attachments||{}));assert.equal(attachments.filter(name=>name.endsWith('.svg')).length,count);assert.equal(attachments.filter(name=>name.endsWith('.jpg')).length,1);
   assert.equal(notebook.cells.some(c=>c.cell_type==='code'&&c.source.includes('LAMBDA_MARKET')),slug==='black-litterman');
   if(slug==='black-litterman'){
    await page.locator('#black-litterman-lab .lab').waitFor();
    assert.equal(await page.locator('a[download][href$=".excalidraw"]').count(),1);
   }
   const summary=page.locator('#exercises summary');await summary.focus();await page.keyboard.press('Enter');assert.notEqual(await page.locator('#exercises details').getAttribute('open'),null);
   await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
   for(const width of [1440,390,320])for(const theme of ['light','dark']){
    await page.setViewportSize({width,height:900});await page.evaluate(t=>document.documentElement.setAttribute('data-theme',t),theme);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    const violations=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));
    assert.deepEqual(violations,[]);report.states.push({slug,width,theme,violations});
    await page.screenshot({path:path.join(__dirname,`${slug}-page-${width}-${theme}.png`)});
   }
   report.checks.push(`${slug}: sidebar, title, ${count} local images, independent executed Notebook, keyboard answers and six viewport/theme states`);
  }
  // Historical anchors remain usable and lead readers to the new chapter.
  await page.goto(pageURL('portfolio-optimization.html')+'#black-litterman');
  await page.locator('#black-litterman a[href="black-litterman.html#black-litterman"]').click();await page.waitForURL('**/black-litterman.html#black-litterman');
  for(const [id,anchor] of terms){
   const slug=['black-litterman','reverse-optimization'].includes(id)?'black-litterman':'portfolio-optimization';
   await page.goto(pageURL('glossary.html')+'#'+id);const entry=page.locator(`.glossary-term#${id}`);assert.ok(await entry.isVisible());
   const labels=(await entry.locator('h3').innerText()).split(/\s+—\s+/);for(const query of labels){await page.locator('#glossary-query').fill(query);assert.ok(await entry.isVisible())}
   await entry.locator(`a[href="${slug}.html#${anchor}"]`).first().focus();await page.keyboard.press('Enter');await page.waitForURL(`**/${slug}.html#${anchor}`);assert.equal(await page.locator(`#${anchor}`).count(),1);
  }
  await page.goto(pageURL('glossary.html'));await page.locator('#glossary-query').fill('no-match-opt-918');assert.equal(await page.locator('.glossary-term:visible').count(),0);
  await page.keyboard.press('Control+k');for(const [slug,title] of chapters){await page.locator('#search-input').fill(title);assert.ok(await page.locator(`#search-results a[href^="${slug}.html"]`).count()>0)}await page.keyboard.press('Escape');
  report.checks.push('Old Black–Litterman anchor, Thai/English glossary searches and updated backlinks, empty results and site search');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);report.status='passed';
 }catch(e){report.status='failed';report.errors.push(e.stack);process.exitCode=1}finally{await browser.close();fs.writeFileSync(path.join(__dirname,'portfolio-optimization-page-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2))}
})();
