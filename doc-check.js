// Vérification statique de documentation.html (fichier temporaire, peut être supprimé)
const fs=require('fs'),vm=require('vm');
const h=fs.readFileSync(process.argv[2],'utf8');
const ids=new Set([...h.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]));
const hrefs=[...h.matchAll(/href="#([^"]+)"/g)].map(m=>m[1]);
const bad=hrefs.filter(x=>!ids.has(x));
const dup=[...h.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]).filter((x,i,a)=>a.indexOf(x)!==i);
const js=(h.match(/<script>([\s\S]*?)<\/script>/)||[])[1]||'';
let syn='OK';try{new vm.Script(js);}catch(e){syn=e.message;}
console.log('sections:',(h.match(/<section /g)||[]).length,'| h3 avec id:',(h.match(/<h3 id=/g)||[]).length);
console.log('liens internes:',hrefs.length,'| cassés:',bad.length?bad.join(','):'aucun','| id en double:',dup.length?dup.join(','):'aucun');
console.log('syntaxe JS:',syn);
