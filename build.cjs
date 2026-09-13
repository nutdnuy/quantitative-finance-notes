const fs=require('node:fs');
const {createHash}=require('node:crypto');
const path=require('node:path');
const yaml=require('yaml');
const esbuild=require('esbuild');
const katex=require('./assets/katex/katex.js');
const root=__dirname;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plain=s=>s.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const slug=s=>plain(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'');
function safeFile(file){if(!/^[a-z0-9][a-z0-9-]*$/.test(file))throw Error(`Use a simple filename without extension: ${file}`);return file;}
async function build(){
 const {marked}=await import('marked');
 const config=yaml.parse(fs.readFileSync(path.join(root,'_config.yml'),'utf8'));
 const cover=className=>`<div class="brand-cover ${className}" role="img" aria-label="${escape(config.logo_alt)}"><img class="brand-row-primary" src="${escape(config.logo)}" alt="" width="1024" height="228"><img class="brand-row-secondary" src="${escape(config.logo_secondary)}" alt="" width="1024" height="228"></div>`;
 const toc=yaml.parse(fs.readFileSync(path.join(root,'_toc.yml'),'utf8'));
 const sourcePages=[{file:toc.root},...(toc.chapters||[])];
 const seen=new Set();
 const pages=sourcePages.map((item,index)=>{
  const file=safeFile(item.file);if(seen.has(file))throw Error(`Duplicate page: ${file}`);seen.add(file);
  let source=fs.readFileSync(path.join(root,file+'.md'),'utf8'),meta={};
  const fm=source.match(/^---\n([\s\S]*?)\n---\n/);if(fm){meta=yaml.parse(fm[1]);source=source.slice(fm[0].length);}
  const equations=[];
  source=source.replace(/\$\$([\s\S]+?)\$\$/g,(_,tex)=>{const n=equations.length;equations.push(katex.renderToString(tex.trim(),{displayMode:true,throwOnError:true,output:'htmlAndMathml',strict:'ignore'}));return `<div class="equation math-display" tabindex="0" role="group" aria-label="สมการ" data-math="${n}">EQUATION_${n}_END</div>`;});
  let body=marked.parse(source).replace(/EQUATION_(\d+)_END/g,(_,i)=>equations[Number(i)]).replaceAll('<pre>','<pre tabindex="0" aria-label="ตัวอย่างโค้ด Python">');
  const headings=[],ids=new Map();
  body=body.replace(/<h([1-3])>([\s\S]*?)<\/h\1>/g,(_,level,text)=>{let base=slug(text)||'heading',n=(ids.get(base)||0)+1;ids.set(base,n);const id=n===1?base:`${base}-${n}`;if(level==='2')headings.push({id,title:plain(text)});return `<h${level} id="${id}">${text}</h${level}>`;});
  body=body.replace(/href="([a-z0-9-]+)\.md(#[^"]*)?"(?! download)/g,(_,file,hash='')=>`href="${file===toc.root?'index':file}.html${hash}"`);
  body=body.replace(/<a href="glossary\.html#[^"]+"/g,link=>link+' class="glossary-link"');
  return {file,href:index===0?'index.html':file+'.html',title:item.title||meta.title||file,description:meta.description||config.title,notebook:meta.notebook||config.notebook,body,headings,home:index===0};
 });
 const icon=fs.readFileSync(path.join(root,'assets/icons/search.svg'),'utf8').replace(/<svg\b/,'<svg aria-hidden="true" focusable="false"');
 const search=[];
 for(const page of pages){
  search.push({title:page.title,section:page.title,url:page.href,text:plain(page.body).slice(0,800)});
  const chunks=page.body.split(/(?=<h2\b)/);
  for(const chunk of chunks){const h=chunk.match(/^<h2 id="([^"]+)">([\s\S]*?)<\/h2>/);if(h)search.push({title:plain(h[2]),section:page.title,url:page.href+'#'+h[1],text:plain(chunk.replace(/<span class="katex">[\s\S]*?<\/span>/g,'')).slice(0,2500)});}
  // Index definitions separately so search opens the exact term, even in long groups.
  for(const term of page.body.matchAll(/<section\b(?=[^>]*class="glossary-term")(?=[^>]*id="([^"]+)")[^>]*>([\s\S]*?)<\/section>/g)){
   const heading=term[2].match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/);
   if(heading)search.push({title:plain(heading[1]),section:page.title,url:page.href+'#'+term[1],text:plain(term[2])});
  }
  const nav=pages.map(p=>`<a class="book-link${p.file===page.file?' current':''}" href="${p.href}"${p.file===page.file?' aria-current="page"':''}>${escape(p.title)}</a>`).join('');
  const localNav=page.home?'':`<details class="page-contents" open><summary>ในหน้านี้</summary><nav aria-label="หัวข้อในหน้านี้">${page.headings.map(h=>`<a href="#${escape(h.id)}">${escape(h.title)}</a>`).join('')}</nav></details>`;
  const github=config.repository?.url?`<a href="${escape(config.repository.url)}">GitHub</a>`:'';
  const html=`<!doctype html><html lang="${escape(config.language||'th')}" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escape(page.description)}"><title>${escape(page.title)} · ${escape(config.title)}</title><link rel="stylesheet" href="assets/katex/katex.min.css"><link rel="stylesheet" href="style.css"><link rel="stylesheet" href="book.css"><link rel="icon" href="data:,"></head><body class="book ${page.home?'welcome-page':'lesson-page'}">
<a class="skip-link" href="#content">ข้ามไปเนื้อหา</a>
<header class="book-mobile-header"><a href="index.html">${escape(config.title)}</a><button id="menu-button" aria-expanded="false" aria-controls="book-sidebar">สารบัญ</button></header>
<div class="book-layout"><aside id="book-sidebar" class="book-sidebar"><a href="index.html" class="cover-link" aria-label="กลับหน้า Welcome">${cover('book-cover')}</a><a class="book-name" href="index.html">${escape(config.title)}</a>
<button class="search-trigger" id="search-button">${icon}<span>Search</span><kbd>⌘ K</kbd></button>
<nav class="book-nav" aria-label="สารบัญ">${nav}</nav>${localNav}
<div class="book-sidebar-footer"><a href="${escape(page.notebook)}" download>ดาวน์โหลด Notebook</a><a href="${page.file}.md" download>ไฟล์ Markdown หน้านี้</a>${github}<button id="theme-button">พื้นหลังมืด</button></div></aside>
<main class="book-main ${page.home?'welcome-main':'chapter'}" id="content"><div class="page-topline"><span>${escape(config.title)}</span><button id="print-button">พิมพ์หน้านี้</button></div>${page.home?cover('mobile-cover'):''}${page.body}<footer class="book-footer">${escape(config.title)}<span>โดย ${escape(config.author)}</span></footer></main></div>
<dialog id="search-dialog" aria-labelledby="search-title"><div class="search-dialog-heading"><h2 id="search-title">ค้นหาในสมุดบันทึก</h2><button id="close-search" aria-label="ปิดการค้นหา">ปิด</button></div><label for="search-input" class="sr-only">คำค้นหา</label><input id="search-input" type="search" placeholder="ลองค้นหา volatility หรือ ความผันผวน" autocomplete="off"><p id="search-status" role="status"></p><div id="search-results"></div></dialog>
<script src="search-index.js" defer></script><script src="site.js" defer></script>${page.home?'':'<script src="app.js" defer></script>'}</body></html>`;
  fs.writeFileSync(path.join(root,page.href),html);
  // Keep the familiar book entry URL alongside the directory index.
  if(page.home&&page.file!=='index')fs.writeFileSync(path.join(root,page.file+'.html'),html);
 }
 fs.writeFileSync(path.join(root,'search-index.js'),'window.QFSearchIndex='+JSON.stringify(search).replaceAll('<','\\u003c')+';');
 await esbuild.build({entryPoints:[path.join(root,'src/labs.jsx')],outfile:path.join(root,'app.js'),bundle:true,format:'iife',jsx:'automatic',minify:true,define:{'process.env.NODE_ENV':'"production"'},legalComments:'linked',target:['es2022']});
 fs.copyFileSync(path.join(root,'src/site.js'),path.join(root,'site.js'));
 const assets=['app.js','site.js','search-index.js','style.css','book.css'];
 const htmlFiles=new Set(pages.map(p=>p.href));
 for(const p of pages)if(p.home)htmlFiles.add(p.file+'.html');
 for(const file of htmlFiles){
  const target=path.join(root,file);let html=fs.readFileSync(target,'utf8');
  for(const asset of assets){const hash=createHash('sha256').update(fs.readFileSync(path.join(root,asset))).digest('hex').slice(0,12);html=html.replaceAll('"'+asset+'"','"'+asset+'?v='+hash+'"');}
  fs.writeFileSync(target,html);
 }
 fs.writeFileSync(path.join(root,'build-manifest.json'),JSON.stringify({pages:pages.map(({file,href,title})=>({file,href,title})),searchEntries:search.length},null,2));
 console.log(`Built ${pages.length} pages; Welcome is the first page. Sources: _config.yml, _toc.yml, Markdown.`);
}
build().catch(e=>{console.error(e);process.exit(1);});
