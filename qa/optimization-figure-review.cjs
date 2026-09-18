const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1080,height:740},deviceScaleFactor:1});
 const files=fs.readdirSync('assets/images').filter(f=>/^optimization-.*\.svg$/.test(f)).sort();const results=[];
 for(const file of files){
  await page.goto('file://'+path.resolve('assets/images',file));await page.evaluate(()=>document.fonts.ready);
  const result=await page.evaluate(()=>{const svg=document.documentElement;const {width,height}=svg.viewBox.baseVal;const texts=[...svg.querySelectorAll('text')].map(e=>{const b=e.getBBox();return {text:e.textContent,x:b.x,y:b.y,w:b.width,h:b.height}});return {width,height,overflow:texts.filter(b=>b.x<0||b.y<0||b.x+b.w>width||b.y+b.h>height),collisions:texts.flatMap((a,i)=>texts.slice(i+1).filter(b=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y).map(b=>[a.text,b.text]))}});
  await page.setViewportSize({width:result.width,height:result.height});await page.screenshot({path:`qa/review-${file}.png`});results.push({file,...result});
 }
 for(let group=0;group<4;group++){
  const batch=files.slice(group*4,group*4+4);if(!batch.length)continue;
  await page.setViewportSize({width:1080,height:820});
  fs.writeFileSync('/tmp/optimization-contact-review.html', `<body style="margin:0;background:#eee;display:grid;grid-template-columns:540px 540px">${batch.map(f=>`<img style="width:540px;height:390px;object-fit:contain;background:white" src="file://${path.resolve('assets/images',f)}">`).join('')}</body>`);
  await page.goto('file:///tmp/optimization-contact-review.html');
  await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth));await page.screenshot({path:`qa/optimization-contact-${group+1}.png`});
 }
 fs.writeFileSync('qa/optimization-figure-review.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));await browser.close();assert.equal(results.flatMap(r=>r.overflow).length,0,'Text outside SVG');assert.equal(results.flatMap(r=>r.collisions).length,0,'Text overlaps');
})().catch(e=>{console.error(e);process.exitCode=1});
