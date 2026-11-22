// Mini serveur statique de test : node webstudio/serve-test.js (sert le dossier webstudio sur http://localhost:8765)
const http=require('http'),fs=require('fs'),path=require('path');
const root=path.join(__dirname),types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(!f.startsWith(root)){r.writeHead(403);return r.end();}
  fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});r.end(d);});
}).listen(8765,()=>console.log('serveur http://localhost:8765'));
