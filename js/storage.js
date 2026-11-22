/* =====================================================================
   WebStudio – message d'accueil au premier lancement
   + données enregistrées sur le PC, dans un dossier séparé du code :
     Documents\WebStudio\
       projet-en-cours.json   (le projet ouvert, sauvegardé automatiquement)
       samples.json    (les sons importés)
       reglages.json   (thème, date de création…)
       Projets\        (Fichier > Enregistrer… / Ctrl+S)
       LISEZ-MOI.txt
   Utilise l'API « File System Access » (Edge / Chrome). Le navigateur garde
   seulement l'accès au dossier (IndexedDB), pas les données.
   ===================================================================== */
(function(){
const DB='webstudio-fs',ST='h',FOLDER='WebStudio',F_PROJ='projet-en-cours.json',F_SMP='samples.json',F_CFG='reglages.json',D_PROJ='Projets',WELC='webstudio2-welcomed';
const FS_OK=typeof window.showDirectoryPicker==='function';
let dir=null,cfg={},wT=null,pend=null,sT=null,state='none',lastErr='';

/* ---------- IndexedDB (mémorise seulement le « droit d'accès » au dossier) ---------- */
function idb(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(ST);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
async function idbGet(k){const d=await idb();return new Promise((res,rej)=>{const q=d.transaction(ST).objectStore(ST).get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);});}
async function idbSet(k,v){const d=await idb();return new Promise((res,rej)=>{const t=d.transaction(ST,'readwrite');t.objectStore(ST).put(v,k);t.oncomplete=()=>res();t.onerror=()=>rej(t.error);});}
async function idbDel(k){const d=await idb();return new Promise(res=>{const t=d.transaction(ST,'readwrite');t.objectStore(ST).delete(k);t.oncomplete=t.onerror=()=>res();});}

/* ---------- fichiers ---------- */
async function readF(name,d=dir){try{return await (await (await d.getFileHandle(name)).getFile()).text();}catch(e){return null;}}
async function writeF(name,txt,d=dir){const w=await (await d.getFileHandle(name,{create:true})).createWritable();await w.write(txt);await w.close();}
async function perm(h,ask){if(!h.queryPermission)return true;const o={mode:'readwrite'};if(await h.queryPermission(o)==='granted')return true;return ask?(await h.requestPermission(o))==='granted':false;}
const safeName=s=>(s||'').replace(/[\\/:*?"<>|]+/g,'-').trim().slice(0,60);
const README='Dossier de données de WebStudio\r\n================================\r\n\r\n'+
 'projet-en-cours.json : le projet ouvert, enregistré automatiquement à chaque modification.\r\n'+
 'samples.json : les sons importés dans le projet en cours.\r\n'+
 'reglages.json : tes réglages (thème…).\r\n'+
 'Projets\\ : les projets enregistrés avec Fichier > Enregistrer… (Ctrl+S).\r\n\r\n'+
 'Tu peux sauvegarder ou copier ce dossier sur un autre PC : au lancement, choisis-le et tout revient.\r\n';

/* ---------- écriture (sauvegarde auto) ---------- */
function setState(s,e){state=s;if(e)lastErr=String(e&&e.message||e);pill();}
async function writeProj(j){try{await writeF(F_PROJ,j);setState('ok');}catch(e){setState('err',e);}}
async function writeSmp(){try{await writeF(F_SMP,JSON.stringify(SAMPLES));setState('ok');}catch(e){setState('err',e);}}
async function saveCfg(){if(!dir)return;try{await writeF(F_CFG,JSON.stringify(cfg,null,2));}catch(e){}}
function flush(){if(!dir)return Promise.resolve();const p=[];if(pend!=null){clearTimeout(wT);p.push(writeProj(pend));pend=null;}if(sT){clearTimeout(sT);sT=null;p.push(writeSmp());}return Promise.all(p);}

const _saveLS=saveLS;
saveLS=function(j){_saveLS(j);if(!dir)return;pend=j;clearTimeout(wT);setState('saving');wT=setTimeout(()=>{const t=pend;pend=null;writeProj(t);},700);};
const _saveSmp=saveSamples;
saveSamples=function(){
  if(!dir)return _saveSmp();
  try{localStorage.setItem('webstudio2-samples',JSON.stringify(SAMPLES));}catch(e){}   // copie de secours facultative
  clearTimeout(sT);sT=setTimeout(()=>{sT=null;writeSmp();},700);
};
if(typeof setTheme==='function'){const _st=setTheme;setTheme=function(k,s){_st(k,s);cfg.theme=k;saveCfg();};}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush();});
window.addEventListener('beforeunload',()=>{flush();});

/* ---------- chargement ---------- */
function applyProject(txt,smp){
  const d=JSON.parse(txt);if(!d||!Array.isArray(d.channels)||!Array.isArray(d.patterns))throw new Error('format');
  try{stop();}catch(e){}
  if(smp!==undefined)SAMPLES=smp||{};else SAMPLES=d.samples||{};
  delete d.samples;S=normalize(d);
  Object.keys(SAMPLES).forEach(id=>{try{loadSample(id);}catch(e){}});
  afterLoad();
}
async function connect(h){
  dir=h;try{await idbSet('dir',h);}catch(e){}
  const txt=await readF(F_PROJ);let loaded=false;
  if(txt){
    let smp={};try{smp=JSON.parse(await readF(F_SMP)||'{}')||{};}catch(e){}
    try{applyProject(txt,smp);lastSnap=JSON.stringify(S);undoS=[];redoS=[];loaded=true;
      try{localStorage.setItem('webstudio2',lastSnap);}catch(e){}}catch(e){setHint('projet-en-cours.json illisible : le projet actuel est conservé.');}
  }
  if(!loaded){await writeProj(JSON.stringify(S));await writeSmp();}
  await dir.getDirectoryHandle(D_PROJ,{create:true});
  try{cfg=JSON.parse(await readF(F_CFG)||'{}')||{};}catch(e){cfg={};}
  cfg.app='WebStudio';cfg.cree_le=cfg.cree_le||new Date().toISOString();cfg.dernier_lancement=new Date().toISOString();
  if(cfg.theme&&typeof setTheme==='function')setTheme(cfg.theme,true);else{try{cfg.theme=localStorage.getItem('webstudio2-theme')||'orange';}catch(e){}}
  await saveCfg();
  if(await readF('LISEZ-MOI.txt')==null){try{await writeF('LISEZ-MOI.txt',README);}catch(e){}}
  try{localStorage.setItem(WELC,'1');}catch(e){}
  setState('ok');
  setHint(loaded?'Projet repris depuis le dossier « '+dir.name+' »':'Dossier « '+dir.name+' » prêt : tes données y sont enregistrées automatiquement');
  return loaded;
}
async function pickFolder(){
  if(!FS_OK){alert('Ce navigateur ne permet pas d\'enregistrer dans un dossier du PC. Utilise Microsoft Edge ou Google Chrome.');return false;}
  let h;try{h=await window.showDirectoryPicker({id:'webstudio-data',mode:'readwrite',startIn:'documents'});}catch(e){return false;}  // annulé
  try{
    if(h.name!==FOLDER)h=await h.getDirectoryHandle(FOLDER,{create:true});
    if(!(await perm(h,true))){alert('Sans l\'autorisation de modification, WebStudio ne peut pas enregistrer dans ce dossier.');return false;}
    await connect(h);return true;
  }catch(e){alert('Impossible d\'utiliser ce dossier : '+(e.message||e)+'\nEssaie un autre dossier (par exemple Documents).');return false;}
}
async function disconnect(){await flush();dir=null;await idbDel('dir');setState('none');setHint('Dossier déconnecté : les données restent seulement dans le navigateur.');}

/* ---------- projets enregistrés (Documents\WebStudio\Projets) ---------- */
const _saveProject=saveProject;
saveProject=async function(){
  if(!dir)return _saveProject();
  const t=new Date(),z=n=>String(n).padStart(2,'0'),stamp=t.getFullYear()+'-'+z(t.getMonth()+1)+'-'+z(t.getDate())+'_'+z(t.getHours())+'h'+z(t.getMinutes());
  const def=safeName(S.name||S.title||'')||('projet-'+stamp);
  const n=prompt('Nom du projet (enregistré dans '+dir.name+'\\'+D_PROJ+') :',def);if(n==null)return;
  const name=(safeName(n)||def).replace(/\.json$/i,'')+'.json';
  try{const pd=await dir.getDirectoryHandle(D_PROJ,{create:true});
    await writeF(name,JSON.stringify(Object.assign({},S,{samples:SAMPLES})),pd);setHint('Projet enregistré : '+dir.name+'\\'+D_PROJ+'\\'+name);}
  catch(e){alert('Échec de l\'enregistrement : '+(e.message||e));}
};
async function listProjects(){const pd=await dir.getDirectoryHandle(D_PROJ,{create:true}),L=[];
  for await(const [n,h] of pd.entries())if(h.kind==='file'&&/\.json$/i.test(n))L.push(n);return L.sort((a,b)=>a.localeCompare(b));}
async function openFromFolder(anchor){
  if(!dir){$('#fileProj').click();return;}
  let L=[];try{L=await listProjects();}catch(e){}
  const items=L.length?L.map(n=>({label:n.replace(/\.json$/i,''),act:()=>openProject(n)})):[{label:'(aucun projet enregistré)',disabled:true}];
  items.push({sep:1},{label:'Ouvrir un autre fichier…',act:()=>$('#fileProj').click()});
  showMenu(anchor||$('#wsPill'),items);
}
async function openProject(n){
  if(!confirm('Ouvrir « '+n.replace(/\.json$/i,'')+' » ? (le projet actuel sera remplacé)'))return;
  try{const pd=await dir.getDirectoryHandle(D_PROJ);const t=await readF(n,pd);applyProject(t);saveSamples();commit();setHint('Projet ouvert : '+n);}
  catch(e){alert('Projet illisible : '+n);}
}

/* ---------- interface ---------- */
const css=`
.wsw-bg{position:fixed;inset:0;background:rgba(10,12,14,.72);z-index:10000;display:flex;align-items:center;justify-content:center;font:13px "Segoe UI",Tahoma,Arial,sans-serif}
.wsw{width:min(560px,92vw);max-height:90vh;overflow:auto;background:#3b4349;color:#dfe5e8;border:1px solid #5d676e;border-radius:6px;box-shadow:0 18px 60px rgba(0,0,0,.6)}
.wsw-h{padding:18px 22px 12px;background:linear-gradient(#4a545b,#3b4349);border-bottom:1px solid #2b3236;border-radius:6px 6px 0 0}
.wsw-h h1{margin:0;font-size:20px;color:#fff}.wsw-h p{margin:4px 0 0;color:#aeb9bf}
.wsw-b{padding:14px 22px}.wsw-b h2{font-size:13px;margin:14px 0 6px;color:#f3a43c;text-transform:uppercase;letter-spacing:.5px}
.wsw-b ul{margin:0;padding-left:18px;line-height:1.6}.wsw-b code{background:#2b3236;padding:1px 5px;border-radius:3px;color:#cfe3ec}
.wsw-tree{background:#2b3236;border-radius:4px;padding:8px 12px;font:12px Consolas,monospace;line-height:1.55;color:#cfe3ec;white-space:pre}
.wsw-note{color:#9aa7ae;font-size:12px;margin-top:8px}
.wsw-f{display:flex;gap:8px;justify-content:flex-end;padding:12px 22px 18px;flex-wrap:wrap}
.wsw-f button{font:inherit;padding:8px 14px;border-radius:4px;border:1px solid #5d676e;background:#4a545b;color:#e6ecef;cursor:pointer}
.wsw-f button:hover{background:#56616a}.wsw-f .pri{background:#e8892b;border-color:#f3a43c;color:#1d1d1d;font-weight:600}.wsw-f .pri:hover{background:#f39a3e}
#wsPill{margin-left:8px;padding:2px 9px;border-radius:10px;border:1px solid #5d676e;background:#2f363b;color:#cfd8dc;font-size:11px;cursor:pointer;white-space:nowrap;align-self:center}
#wsPill.ok{border-color:#5f9e5a;color:#b9e3b4}#wsPill.saving{border-color:#c9a13c;color:#f0d68c}#wsPill.err{border-color:#c0504a;color:#ffb3ae}`;
function injectCss(){if($('#wsStorageCss'))return;const s=document.createElement('style');s.id='wsStorageCss';s.textContent=css;document.head.appendChild(s);}
function pill(){
  let p=$('#wsPill');if(!p){const tb=$('#tb1');if(!tb)return;p=document.createElement('button');p.id='wsPill';tb.appendChild(p);
    p.onclick=e=>{e.stopPropagation();showMenu(p,pillItems());};}
  p.className=dir?state:'';
  p.textContent=dir?('💾 '+dir.name+(state==='saving'?' · enregistrement…':state==='err'?' · erreur !':' ✓')):'💾 Navigateur seulement';
  p.dataset.hint=dir?(state==='err'?'Erreur d\'écriture : '+lastErr:'Données enregistrées automatiquement dans le dossier « '+dir.name+' » de ton PC · clic : options')
    :'Les données ne sont gardées que dans le navigateur · clic : choisir un dossier sur le PC';
}
function pillItems(){
  return dir?[{label:'Dossier : '+dir.name,disabled:true},{sep:1},{label:'Enregistrer maintenant',act:()=>flush().then(()=>setHint('Tout est enregistré dans « '+dir.name+' »'))},
      {label:'Enregistrer une copie dans Projets…',act:()=>saveProject()},{label:'Ouvrir un projet de Projets…',act:()=>openFromFolder()},{sep:1},
      {label:'Changer de dossier…',act:pickFolder},{label:'Déconnecter le dossier',act:disconnect},{sep:1},{label:'Revoir le message d\'accueil',act:()=>showWelcome(true)}]
    :[{label:'Choisir un dossier sur le PC…',act:pickFolder},{sep:1},{label:'Revoir le message d\'accueil',act:()=>showWelcome(true)}];
}
function showMenu(anchor,items){
  if(typeof mpMenuAt==='function')return mpMenuAt(anchor,items);
  const r=anchor.getBoundingClientRect();if(typeof ctxMenu==='function')ctxMenu(r.left,r.bottom,items);
}
function dialog(html,buttons){
  injectCss();const bg=document.createElement('div');bg.className='wsw-bg';bg.innerHTML='<div class="wsw">'+html+'<div class="wsw-f"></div></div>';
  const f=bg.querySelector('.wsw-f'),close=()=>bg.remove();
  buttons.forEach(([txt,cls,fn])=>{const b=document.createElement('button');b.textContent=txt;if(cls)b.className=cls;b.onclick=async()=>{if(await fn()!==false)close();};f.appendChild(b);});
  document.body.appendChild(bg);const pri=f.querySelector('.pri');if(pri)pri.focus();return bg;
}
function showWelcome(again){
  const fs=FS_OK?`<h2>Où sont gardées tes données ?</h2>
    <p>Choisis ton dossier <b>Documents</b> : WebStudio y crée un dossier <code>WebStudio</code> et y enregistre tout automatiquement, en dehors du code de l'application.</p>
    <div class="wsw-tree">Documents\\WebStudio\\
  ├─ projet-en-cours.json   ← sauvegarde automatique
  ├─ samples.json    ← tes sons importés
  ├─ reglages.json   ← thème et réglages
  └─ Projets\\        ← Fichier › Enregistrer (Ctrl+S)</div>
    <p class="wsw-note">Dans la fenêtre qui s'ouvre, sélectionne « Documents » puis clique sur « Sélectionner un dossier », et accepte l'autorisation de modification. Tu peux aussi choisir un dossier qui contient déjà tes données : ton travail sera repris.</p>`
   :`<h2>Où sont gardées tes données ?</h2><p>Ce navigateur ne permet pas d'écrire dans un dossier du PC : tes données resteront dans la mémoire du navigateur. Pour les enregistrer dans <code>Documents\\WebStudio</code>, ouvre WebStudio avec <b>Microsoft Edge</b> ou <b>Google Chrome</b>.</p>`;
  dialog(`<div class="wsw-h"><h1>🎹 Bienvenue dans WebStudio</h1><p>Ton studio de musique dans le navigateur, inspiré de FL Studio.</p></div>
  <div class="wsw-b">
    <h2>Pour bien démarrer</h2>
    <ul>
      <li><b>Channel Rack</b> : clique sur les pas pour créer un rythme, clic droit pour les effacer.</li>
      <li><b>Piano roll</b> : écris tes mélodies note par note.</li>
      <li><b>Playlist</b> : place tes patterns pour construire le morceau.</li>
      <li><b>Mixer</b> : règle les volumes et ajoute des effets.</li>
      <li><b>Clic droit</b> presque partout : menus comme dans FL Studio (automation, couleurs, renommer…).</li>
      <li><code>Ctrl+Z</code> annuler · <code>Ctrl+S</code> enregistrer · <code>Ctrl+R</code> exporter en WAV.</li>
    </ul>${fs}
  </div>`,
  FS_OK?[[again?'Fermer':'Plus tard','',()=>{try{localStorage.setItem(WELC,'1');}catch(e){}if(!again)setHint('Tu pourras choisir le dossier plus tard avec le bouton 💾 en haut.');}],
         [dir?'📁 Changer de dossier…':'📁 Choisir le dossier (Documents)','pri',async()=>{const ok=await pickFolder();return ok;}]]
       :[['Commencer','pri',()=>{try{localStorage.setItem(WELC,'1');}catch(e){}}]]);
}
function showReconnect(h){
  dialog(`<div class="wsw-h"><h1>🎹 Bon retour dans WebStudio</h1><p>Tes données sont dans le dossier « ${h.name} » de ton PC.</p></div>
  <div class="wsw-b"><p>Par sécurité, le navigateur redemande l'accès au dossier à chaque lancement. Clique sur <b>Reprendre</b> puis accepte : ton projet revient exactement où tu l'avais laissé.</p></div>`,
  [['Continuer sans le dossier','',()=>{setHint('Dossier non connecté : clique sur 💾 en haut pour le reconnecter.');}],
   ['▶ Reprendre mon travail','pri',async()=>{try{if(!(await perm(h,true)))return false;await connect(h);}catch(e){alert('Dossier inaccessible ('+(e.message||e)+'). Choisis-le à nouveau.');idbDel('dir');pickFolder();}}]]);
}

/* ---------- menu Fichier ---------- */
const _MENUS=MENUS;
MENUS=function(){const m=_MENUS(),f=m['FICHIER'];
  if(f){const i=f.findIndex(x=>Array.isArray(x)&&/^Ouvrir/.test(x[0]));if(i>=0)f[i]=['Ouvrir…','Ctrl+O',()=>dir?openFromFolder($('#menus .menu')):$('#fileProj').click()];
    f.push('-',['Dossier de données…',()=>showMenu($('#wsPill'),pillItems())],['Message d\'accueil',()=>showWelcome(true)]);}
  if(m['AIDE'])m['AIDE'].unshift(['Documentation complète',()=>window.open('documentation.html','_blank')],'-');
  return m;};
{const box=$('#menus');if(box&&typeof buildMenus==='function'){box.innerHTML='';buildMenus();}}

/* ---------- démarrage ---------- */
async function boot(){
  injectCss();pill();
  let h=null;if(FS_OK){try{h=await idbGet('dir');}catch(e){}}
  if(h){let g=false;try{g=await perm(h,false);}catch(e){}
    if(g){try{await connect(h);}catch(e){showReconnect(h);}}else showReconnect(h);}
  else{let w=null;try{w=localStorage.getItem(WELC);}catch(e){}if(!w)showWelcome(false);}
  pill();
}
window.WSData={connect,pickFolder,disconnect,flush,showWelcome,listProjects,dir:()=>dir,state:()=>state};
boot();
})();
