const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),base=process.env.QA_BASE||'http://127.0.0.1:8763';
const lessons=[['prices-and-returns',1,1,4],['stochastic-processes',1,1,8],['asset-returns-stylized-facts',4,4,18]];
(async()=>{
 const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[],report=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 async function ready(n){await page.waitForFunction(n=>document.querySelectorAll('.lab').length===n,n);await page.evaluate(()=>document.fonts.ready);await page.addStyleTag({content:'html,*{scroll-behavior:auto!important}'});}
 for(const [slug,labs,figures,codes] of lessons){
  for(const theme of ['light','dark'])for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:1100});await page.goto(base+'/'+slug+'.html');await ready(labs);
   await page.evaluate(t=>document.documentElement.setAttribute('data-theme',t),theme);
   assert.equal(await page.locator('.katex-error').count(),0);assert.ok(await page.locator('.portfolio-figure img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0)));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,slug+' '+width);
   await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
   const violations=await page.evaluate(async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));
   assert.deepEqual(violations,[],JSON.stringify({slug,width,theme,violations}));
   const clipped=await page.locator('.lab svg').evaluateAll(ss=>ss.flatMap(s=>[...s.querySelectorAll('text')].filter(t=>{const b=t.getBBox();return b.x< -1||b.x+b.width>s.viewBox.baseVal.width+1}).map(t=>t.textContent)));
   assert.deepEqual(clipped,[],slug+' '+width);
   if([390,1440].includes(width)){
    const target=slug==='prices-and-returns'?'#price-returns-lab':slug==='stochastic-processes'?'#arma-learning-lab':'#calendar-acf-lab';
    await page.locator(target).evaluate(el=>window.scrollTo({top:el.getBoundingClientRect().top+scrollY-70,behavior:'instant'}));
    await page.screenshot({path:path.join(__dirname,`foundations-${slug}-${theme}-${width}.png`)});
   }
   report.push({slug,width,theme,status:'passed'});
  }
  const nb=JSON.parse(fs.readFileSync(path.join(root,'notebooks',slug+'.ipynb')));
  assert.equal(nb.metadata.source.sha256,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,slug+'.md'))).digest('hex'));
  const cs=nb.cells.filter(c=>c.cell_type==='code');assert.equal(cs.length,codes);assert.ok(cs.every(c=>c.execution_count&&c.outputs.every(o=>o.output_type!=='error')));
  assert.equal(nb.cells.reduce((n,c)=>n+Object.keys(c.attachments||{}).length,0),figures);
  await page.goto('file://'+path.join(root,'_site',slug+'.html'));await ready(labs);
 }
 await page.setViewportSize({width:1440,height:1100});
 await page.goto(base+'/prices-and-returns.html');await ready(1);
 const price=page.locator('#price-returns-lab');await price.locator('input').focus();await page.keyboard.press('End');
 for(const name of ['ดัชนีฐาน 100','Log returns']){await price.getByRole('button',{name,exact:true}).click();assert.match(await price.locator('.results').innerText(),/4.000%[\s\S]*3.922%/);}
 await page.goto(base+'/stochastic-processes.html');await ready(1);const arma=page.locator('#arma-learning-lab');
 await arma.getByRole('button',{name:'หักล้างกัน',exact:true}).click();assert.deepEqual(await arma.locator('.results strong').allTextContents(),['1.000000','0.000000']);
 await arma.getByRole('button',{name:'สลับเครื่องหมาย',exact:true}).click();assert.match(await arma.locator('.results').innerText(),/-0.336986/);
 for(const input of await arma.locator('input').all()){await input.focus();await page.keyboard.press('End');assert.doesNotMatch(await arma.locator('.results').innerText(),/NaN|Infinity/);}
 await page.goto(base+'/asset-returns-stylized-facts.html');await ready(4);const cal=page.locator('#calendar-acf-lab');
 assert.match(await cal.locator('.results').innerText(),/-0.009615[\s\S]*0.038462/);await cal.locator('input').first().focus();await page.keyboard.press('Home');assert.deepEqual(await cal.locator('.results strong').allTextContents(),['0.000000','0.000000']);
 await cal.locator('input').first().focus();await page.keyboard.press('End');await cal.locator('input').last().focus();await page.keyboard.press('Home');assert.match(await cal.locator('.results').innerText(),/0.900000/);
 const coverage=JSON.parse(fs.readFileSync(path.join(root,'data/return-foundations-provenance.json'))).coverage;
 for(const slug of lessons.map(x=>x[0])){await page.goto(base+'/'+slug+'.html');for(const row of coverage.filter(x=>x.file===slug+'.md'))assert.equal(await page.locator('#'+row.anchor).count(),1,row.section);}
 await page.goto(base+'/glossary.html#arfima');const query=page.locator('#glossary-query');
 for(const [word,id] of [['ARFIMA','arfima'],['ความเบ้','skewness'],['ส่วนชดเชย','risk-premium']]){await query.fill(word);assert.ok(await page.locator('#'+id).isVisible());}
 await query.fill('zzzzzz');assert.match(await page.locator('#glossary-status').innerText(),/ไม่พบ/);await query.fill('');await page.locator('#arfima a').click();assert.ok(page.url().includes('stochastic-processes.html#arfima'));
 await page.getByRole('button',{name:'Search',exact:false}).click();await page.getByRole('searchbox').fill('ARFIMA');assert.ok(await page.locator('#search-results a[href*="stochastic-processes"]').count()>0);await page.keyboard.press('Escape');
 await page.goto(base);const n=require('yaml').parse(fs.readFileSync(path.join(root,'_toc.yml'),'utf8')).chapters.filter(x=>x.file!=='glossary').length;assert.equal(await page.locator('.welcome-lesson').count(),n);
 for(const slug of lessons.map(x=>x[0]))assert.equal(await page.locator(`.welcome-text-link[href="${slug}.html"]`).count(),1);
 for(const filename of ['foundations-prices-returns','foundations-arma-acf','foundations-distribution-tails']){await page.goto(base+'/assets/images/'+filename+'.svg');await page.screenshot({path:path.join(__dirname,filename+'.png')});}
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(__dirname,'return-foundations-report.json'),JSON.stringify({status:'passed',responsive:report,checks:['Three interactive labs and keyboard limits','31 coverage targets','Glossary and site search','Welcome navigation','Offline mounts','30 executed notebook cells and six attachments','No browser errors']},null,2));console.log('Foundations browser passed: 24 responsive/theme states, interactive limits, coverage, glossary/search, offline and notebooks.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
