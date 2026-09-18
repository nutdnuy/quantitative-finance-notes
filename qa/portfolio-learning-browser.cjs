const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.LEARNING_PREVIEW_URL||'http://127.0.0.1:8763';
const report={status:'running',states:[],errors:[]};
(async()=>{
 const browser=await chromium.launch();
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 page.on('pageerror',e=>report.errors.push(e.message));
 const set=async(label,value)=>{
  const el=page.getByRole('slider',{name:label,exact:true});
  await el.fill(String(value));await el.dispatchEvent('input');
 };
 try{
  await page.goto(base+'/portfolio-optimization.html');
  const geometry=page.locator('[data-learning="constraints"]');
  await geometry.waitFor();
  assert.match(await geometry.locator('[data-geometry="point"]').innerText(),/0.33, 0.67/);
  await set('ขอบเขต c',3);
  assert.equal(await geometry.locator('[data-geometry="status"]').innerText(),'Slack');
  await geometry.getByRole('button',{name:'x + y = c',exact:true}).click();
  assert.equal(await geometry.locator('[data-geometry="status"]').innerText(),'Binding');
  await geometry.getByRole('button',{name:'ไม่มีข้อจำกัด',exact:true}).click();
  assert.equal(await geometry.locator('[data-geometry="objective"]').innerText(),'0.000');
  await geometry.getByRole('button',{name:'คืนค่าเริ่มต้น',exact:true}).click();
  const target=page.locator('[data-learning="target"]');
  assert.equal(await target.locator('[data-target="budget"]').innerText(),'100.00%');
  await target.getByRole('button',{name:'ตัวอย่าง 20%',exact:true}).click();
  await target.getByRole('button',{name:'Long-only',exact:true}).click();
  assert.match(await target.locator('[data-target="active"]').innerText(),/X1/);
  await set('ผลตอบแทนคาดหวังเป้าหมาย (%)',30);
  await target.locator('[data-target="infeasible"]').waitFor();
  assert.equal(await target.locator('[data-target="return"]').count(),0);
  await target.getByRole('button',{name:'อนุญาต short',exact:true}).click();
  assert.equal(await target.locator('[data-target="return"]').innerText(),'30.00%');
  await target.getByRole('button',{name:'คืนค่าเริ่มต้น',exact:true}).click();
  await page.goto(base+'/black-litterman.html');
  const bl=page.locator('.portfolio-optimization-lab');
  await bl.waitFor();
  await bl.getByRole('button',{name:'ปิด views ทั้งหมด',exact:true}).click();
  assert.equal(await bl.locator('[data-opt="posterior-weight-1"]').innerText(),'40.00%');
  assert.equal(await bl.locator('[data-opt="posterior-risk-free"]').innerText(),'0.00%');
  await bl.getByRole('button',{name:'ลอง views ติดลบ',exact:true}).click();
  assert.ok((await bl.locator('[data-opt^="posterior-return"]').allTextContents()).some(t=>t.includes('-')||t.includes('−')));
  await bl.getByRole('checkbox',{name:'ใช้ view 2',exact:true}).uncheck();
  const before=await bl.locator('[data-opt^="posterior-return"]').allTextContents();
  await set('Q ข้อ 2',30);
  assert.deepEqual(await bl.locator('[data-opt^="posterior-return"]').allTextContents(),before);
  await bl.getByRole('button',{name:'คืนค่าเริ่มต้นของ Black–Litterman',exact:true}).click();
  await page.goto(base+'/portfolio-theory.html');
  const estimation=page.locator('[data-learning="estimation"]');
  await estimation.waitFor();
  assert.match(await estimation.locator('[data-estimation="parameters"]').innerText(),/5,150/);
  await estimation.getByRole('button',{name:'T = 400',exact:true}).click();
  assert.match(await estimation.locator('[data-estimation="se"]').innerText(),/1.000/);
  await estimation.getByRole('button',{name:'N = 500',exact:true}).click();
  assert.match(await estimation.locator('[data-estimation="parameters"]').innerText(),/125,750/);
  assert.match(await estimation.locator('[data-estimation="se"]').innerText(),/1.000/);
  await estimation.getByRole('button',{name:'คืนค่าเริ่มต้น',exact:true}).click();
  for(const [slug,selectors] of [
   ['portfolio-optimization',['[data-learning="constraints"]','[data-learning="target"]']],
   ['black-litterman',['.portfolio-optimization-lab']],
   ['portfolio-theory',['[data-learning="estimation"]']]
  ]){
   await page.goto(base+'/'+slug+'.html');
   await page.locator(selectors[0]).waitFor();
   await page.evaluate(()=>document.fonts.ready);
   await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
   for(const width of [1440,768,390,320])for(const theme of ['light','dark']){
    await page.setViewportSize({width,height:1000});
    await page.evaluate(t=>document.documentElement.setAttribute('data-theme',t),theme);
    await page.waitForTimeout(120);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page overflow');
    const violations=await page.evaluate(async()=> (await axe.run('#content',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.filter(v=>['critical','serious'].includes(v.impact)).map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));
    assert.deepEqual(violations,[]);
    for(let i=0;i<selectors.length;i++){
     const lab=page.locator(selectors[i]);
     assert.equal(await lab.evaluate(e=>/NaN|Infinity|undefined/.test(e.innerText)),false);
     await lab.screenshot({path:path.join(__dirname,`learning-${slug}-${i}-${width}-${theme}.png`)});
    }
    report.states.push({slug,width,theme,violations});
   }
  }
  assert.deepEqual(report.errors,[]);report.status='passed';
 }catch(e){report.status='failed';report.errors.push(e.stack);process.exitCode=1}
 finally{await browser.close();fs.writeFileSync(path.join(__dirname,'portfolio-learning-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2))}
})();
