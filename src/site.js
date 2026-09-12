const themeButton=document.getElementById('theme-button');
themeButton.addEventListener('click',()=>{const light=document.documentElement.dataset.theme!=='light';document.documentElement.dataset.theme=light?'light':'dark';themeButton.textContent=light?'พื้นหลังมืด':'พื้นหลังสว่าง';});
document.getElementById('print-button').addEventListener('click',()=>window.print());
const menu=document.getElementById('menu-button');
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));document.body.classList.toggle('menu-open',open);});
const dialog=document.getElementById('search-dialog'),input=document.getElementById('search-input'),results=document.getElementById('search-results'),status=document.getElementById('search-status');
const index=window.QFSearchIndex||[];
function search(){
 const query=input.value.trim().toLocaleLowerCase(),words=query.split(/\s+/).filter(Boolean);
 const matches=index.filter(item=>!query||words.every(w=>(item.title+' '+item.text).toLocaleLowerCase().includes(w))).sort((a,b)=>Number(b.title.toLocaleLowerCase().includes(query))-Number(a.title.toLocaleLowerCase().includes(query))).slice(0,12);
 results.replaceChildren();status.textContent=query?(matches.length?`พบ ${matches.length} หัวข้อ`:'ไม่พบหัวข้อ ลองใช้คำค้นอื่น'):'เลือกหัวข้อ หรือพิมพ์คำที่ต้องการค้นหา';
 for(const item of matches){const a=document.createElement('a');a.href=item.url;const label=document.createElement('small');label.textContent=item.section;const title=document.createElement('strong');title.textContent=item.title;const snippet=document.createElement('span');const at=query?Math.max(0,item.text.toLocaleLowerCase().indexOf(words[0])-40):0;snippet.textContent=(at?'…':'')+item.text.slice(at,at+150)+'…';a.append(label,title,snippet);results.append(a);}
}
function openSearch(){dialog.showModal();search();input.focus();}
document.getElementById('search-button').addEventListener('click',openSearch);
document.getElementById('close-search').addEventListener('click',()=>dialog.close());
input.addEventListener('input',search);
results.addEventListener('click',event=>{
 if(event.target.closest('a')){
  dialog.close();
  const field=document.getElementById('glossary-query');
  if(field){field.value='';field.dispatchEvent(new Event('input'));}
 }
});
dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();dialog.close();}});
document.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();if(!dialog.open)openSearch();}});
// The glossary remains fully readable when JavaScript is unavailable.
const glossaryInput=document.getElementById('glossary-query');
if(glossaryInput){
 const glossaryStatus=document.getElementById('glossary-status');
 const groups=[...document.querySelectorAll('.glossary-group')];
 const fold=s=>s.normalize('NFC').toLocaleLowerCase().replace(/[\u2010-\u2015-]/g,' ').replace(/\s+/g,' ').trim();
 const terms=[...document.querySelectorAll('.glossary-term')].map(element=>({element,text:fold(element.textContent)}));
 function filterGlossary(){
  const words=fold(glossaryInput.value).split(' ').filter(Boolean);let count=0;
  for(const term of terms){const match=words.every(word=>term.text.includes(word));term.element.hidden=!match;if(match)count++;}
  for(const group of groups)group.hidden=![...group.querySelectorAll('.glossary-term')].some(term=>!term.hidden);
  glossaryStatus.textContent=words.length?(count?`พบ ${count} คำ จากทั้งหมด ${terms.length} คำ`:'ไม่พบคำนี้ ลองใช้คำไทย ภาษาอังกฤษ หรือคำย่อ'):`มี ${terms.length} คำ ในอภิธานศัพท์`;
 }
 document.querySelector('.glossary-search').hidden=false;
 glossaryInput.addEventListener('input',filterGlossary);
 window.addEventListener('hashchange',()=>{
  const target=document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if(target){glossaryInput.value='';filterGlossary();target.scrollIntoView();}
 });
 filterGlossary();
}
// Local preview reloads after a successful rebuild; exported files do not poll.
if(location.protocol.startsWith('http')&&['127.0.0.1','localhost'].includes(location.hostname)){
 let version=null,enabled=true;
 const timer=setInterval(async()=>{if(!enabled)return;try{const response=await fetch('__version',{cache:'no-store'});if(!response.ok){enabled=false;clearInterval(timer);return;}const next=await response.text();if(version!==null&&next!==version)location.reload();version=next;}catch{}},1200);
}
