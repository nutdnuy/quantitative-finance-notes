const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {spawnSync,spawn}=require('node:child_process');
const root=__dirname,port=Number(process.env.PORT||8763);
let version=Date.now().toString(),timer;
function build(){const r=spawnSync(process.execPath,[path.join(root,'build.cjs')],{cwd:root,stdio:'inherit'});if(r.status===0)version=Date.now().toString();else console.error('Build failed. Fix the source file and save again.');return r.status===0;}
if(!build())process.exit(1);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.md':'text/plain; charset=utf-8','.yml':'text/plain; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.csv':'text/csv; charset=utf-8','.ipynb':'application/x-ipynb+json'};
const server=http.createServer((req,res)=>{
 if(req.url==='/__version'){res.writeHead(200,{'Content-Type':'text/plain','Cache-Control':'no-store'});res.end(version);return;}
 let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
 const file=path.resolve(root,'.'+(name==='/'?'/index.html':name)),relative=path.relative(root,file);
 if(relative.startsWith('..')||relative.split(path.sep).some(p=>p.startsWith('.')||p==='node_modules'||p==='revisions')){res.writeHead(403);res.end('Forbidden');return;}
 fs.stat(file,(error,stat)=>{if(error||!stat.isFile()){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});fs.createReadStream(file).pipe(res);});
});
server.on('error',error=>{if(error.code==='EADDRINUSE')console.error(`Port ${port} is already in use. Open http://127.0.0.1:${port} or choose another PORT.`);else console.error(error);process.exit(1);});
server.listen(port,'127.0.0.1',()=>{console.log(`\nPreview: http://127.0.0.1:${port}\nSave a Markdown, YAML, CSS, or source file to rebuild. Ctrl+C stops the preview.\n`);if(process.env.OPEN_BROWSER==='1'&&process.platform==='darwin')spawn('open',[`http://127.0.0.1:${port}`],{stdio:'ignore'});});
const watcher=fs.watch(root,{recursive:true},(event,name)=>{
 if(!name||/(^|\/)(node_modules|revisions|\.git|qa)\//.test(name))return;
 const watched=(/^[^/]+\.(md|yml|css)$/.test(name)||/^src\//.test(name)||/^assets\/images\//.test(name));
 if(watched){clearTimeout(timer);timer=setTimeout(build,250);}
});
process.on('SIGINT',()=>{watcher.close();server.close(()=>process.exit(0));});
