// Génère webstudio/st-run.html : test du message d'accueil et de l'enregistrement dans un dossier (OPFS simule le dossier Documents\WebStudio)
const fs=require('fs');
let h=fs.readFileSync('webstudio/index.html','utf8');
const pre=`<script>window.__log=[];window.onerror=(m,s,l,c)=>{__log.push('ERREUR: '+m+' @'+(s||'').split('/').pop()+':'+l+':'+c);};
window.addEventListener('unhandledrejection',e=>__log.push('PROMESSE: '+(e.reason&&e.reason.stack||e.reason)));
window.alert=m=>__log.push('ALERT: '+m);window.confirm=m=>{__log.push('CONFIRM: '+m);return true;};window.prompt=(m,d)=>{__log.push('PROMPT: '+m+' ['+d+']');return 'Mon test';};
const _ce=console.error;console.error=(...a)=>{__log.push('CONSOLE: '+a.join(' '));_ce(...a);};</script>`;
const post=`<script>
const L=m=>{__log.push(m);let p=document.getElementById('TESTLOG');if(!p){p=document.createElement('pre');p.id='TESTLOG';document.body.appendChild(p);}p.textContent=__log.join('\\n');},Q=s=>document.querySelector(s),QA=s=>[...document.querySelectorAll(s)];
const W=ms=>new Promise(r=>setTimeout(r,ms));
setTimeout(async()=>{try{
  L('isSecureContext='+isSecureContext+' showDirectoryPicker='+(typeof showDirectoryPicker)+' url='+location.protocol);
  L('IndexedDB utilisable='+await new Promise(r=>{try{const q=indexedDB.open('ws-probe',1);q.onupgradeneeded=()=>q.result.createObjectStore('x');q.onsuccess=()=>{try{const t=q.result.transaction('x','readwrite');t.objectStore('x').put(1,'a');t.oncomplete=()=>r(true);t.onerror=()=>r('err tx');}catch(e){r('exc '+e.message);}};q.onerror=()=>r('err '+q.error);}catch(e){r('exc '+e.message);}}));
  if(location.protocol==='file:'){L('FIN');return;}
  const bg=Q('.wsw-bg');L('accueil affiché='+!!bg+(bg?' titre="'+bg.querySelector('h1').textContent+'" boutons='+[...bg.querySelectorAll('.wsw-f button')].map(b=>b.textContent).join(' / '):''));
  L('pastille='+(Q('#wsPill')&&Q('#wsPill').textContent));
  L('menu FICHIER='+QA('#menus .menu')[0].querySelectorAll('.mi').length+' items, dernier="'+[...QA('#menus .menu')[0].querySelectorAll('.mi span')].map(s=>s.textContent).slice(-2).join(' / ')+'"');
  if(bg)bg.remove();
  const root=await navigator.storage.getDirectory();try{await root.removeEntry('WebStudio',{recursive:true});}catch(e){}
  const d=await root.getDirectoryHandle('WebStudio',{create:true});
  L('1er branchement (dossier vide) : projet repris='+await WSData.connect(d));
  const ls=async x=>{const a=[];for await(const [n,e] of x.entries())a.push(n+(e.kind==='directory'?'\\\\':''));return a.sort().join(', ');};
  L('  contenu : '+await ls(d));
  S.bpm=137;commit();L('  pastille juste après modif='+Q('#wsPill').textContent);await W(1300);
  const pj=JSON.parse(await (await (await d.getFileHandle('projet-en-cours.json')).getFile()).text());L('  bpm dans projet-en-cours.json='+pj.bpm+' ; pastille='+Q('#wsPill').textContent);
  L('  reglages.json='+await (await (await d.getFileHandle('reglages.json')).getFile()).text().then(t=>t.replace(/\\s+/g,' ')));
  await saveProject();L('  Projets : '+(await WSData.listProjects()).join(', '));
  S.bpm=90;
  L('relance simulée : projet repris='+await WSData.connect(d)+' bpm='+S.bpm);
  setTheme('vert');await W(200);L('  thème dans reglages.json='+JSON.parse(await (await (await d.getFileHandle('reglages.json')).getFile()).text()).theme);setTheme('orange',true);
  S.bpm=100;commit();await WSData.flush();L('  flush immédiat : bpm fichier='+JSON.parse(await (await (await d.getFileHandle('projet-en-cours.json')).getFile()).text()).bpm);
  L('  handle mémorisé en IndexedDB='+await new Promise(r=>{const q=indexedDB.open('webstudio-fs',1);q.onsuccess=()=>{const g=q.result.transaction('h').objectStore('h').get('dir');g.onsuccess=()=>r(!!g.result&&g.result.name);g.onerror=()=>r('err');};q.onerror=()=>r('err');}));
  WSData.showWelcome(true);L('message d accueil rouvert='+!!Q('.wsw-bg'));Q('.wsw-bg').remove();
  await WSData.disconnect();L('après déconnexion : pastille='+Q('#wsPill').textContent);
  await root.removeEntry('WebStudio',{recursive:true});
}catch(e){L('EXC: '+(e.stack||e));}
L('FIN');},1200);</script>`;
h=h.replace('<head>','<head>'+pre).replace(/<\/body>(?![\s\S]*<\/body>)/,post+'</body>');
fs.writeFileSync('webstudio/st-run.html',h);
console.log('st-run.html écrit');
