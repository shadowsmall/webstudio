// Génère webstudio/fl-run.html : index.html + test automatique de l'interface FL (fenêtres, clics droits, raccourcis)
const fs=require('fs');
let h=fs.readFileSync('webstudio/index.html','utf8');
const pre=`<script>window.__log=[];window.onerror=(m,s,l,c)=>{__log.push('ERREUR: '+m+' @'+(s||'').split('/').pop()+':'+l+':'+c);};
window.addEventListener('unhandledrejection',e=>__log.push('PROMESSE: '+(e.reason&&e.reason.stack||e.reason)));
window.alert=m=>__log.push('ALERT: '+m);window.confirm=m=>{__log.push('CONFIRM: '+m);return false;};window.prompt=m=>{__log.push('PROMPT: '+m);return null;};
const _ce=console.error;console.error=(...a)=>{__log.push('CONSOLE: '+a.join(' '));_ce(...a);};</script>`;
const post=`<script>
const L=m=>{__log.push(m);let p=document.getElementById('TESTLOG');if(!p){p=document.createElement('pre');p.id='TESTLOG';document.body.appendChild(p);}p.textContent=__log.join('\\n');},Q=s=>document.querySelector(s),QA=s=>[...document.querySelectorAll(s)];
const W=ms=>new Promise(r=>setTimeout(r,ms));
const ctx=(node)=>{if(!node){L('  NŒUD ABSENT');return;}const r=node.getBoundingClientRect();node.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:r.left+3,clientY:r.top+3}));};
const menuLabels=()=>QA('.ctxm').map(m=>[...m.children].map(c=>c.textContent.trim()).filter(Boolean).join(' | '));
const close=()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
const clickItem=(txt)=>{const it=QA('.ctxm .ctxi').find(x=>x.textContent.trim().startsWith(txt));if(!it){L('  item introuvable: '+txt);return false;}it.dispatchEvent(new MouseEvent('mouseenter'));it.click();return true;};
const key=(code,o={})=>document.dispatchEvent(new KeyboardEvent('keydown',Object.assign({code,key:code,bubbles:true,cancelable:true},o)));
const zone=async(nom,node)=>{L('--- '+nom);ctx(node);await W(30);L('  '+(menuLabels()[0]||'(aucun menu)'));close();await W(20);};
setTimeout(async()=>{try{
  const wins=QA('.win');L('fenêtres='+wins.length+' avec ▼/–/□='+wins.filter(w=>w.querySelector('.wopt')&&w.querySelector('.wmin')&&w.querySelector('.wmax')).length);
  const css=getComputedStyle(document.body);L('fond body='+css.backgroundColor+' police='+css.fontFamily.slice(0,40));
  const w0=wins.find(w=>w.offsetParent!==null)||wins[0];
  w0.querySelector('.wmax').click();L('agrandir : maxi='+w0.classList.contains('maxi'));w0.querySelector('.wmax').click();L('restaurer : maxi='+w0.classList.contains('maxi'));
  w0.querySelector('.wmin').click();L('réduire : collapsed='+w0.classList.contains('collapsed'));w0.querySelector('.wmin').click();
  await zone('barre de titre '+w0.id,w0.querySelector('.wt'));
  await zone('nom de canal',Q('#rack .crow .cname'));
  L('--- couleur canal');ctx(Q('#rack .crow .cname'));await W(20);const it=QA('.ctxm .ctxi').find(x=>x.textContent.includes('couleur'));
  if(it){it.dispatchEvent(new MouseEvent('mouseenter'));await W(20);L('  sous-menu: '+(menuLabels()[1]||'aucun')+' ; pastilles='+QA('.ctxsw').length);const sw=QA('.ctxm')[1]&&QA('.ctxm')[1].querySelector('.ctxi:nth-child(3)');if(sw)sw.click();L('  couleur canal 0='+S.channels[0].color);}else L('  pas d item couleur');close();await W(20);
  await zone('tranche mixer',Q('#strips .strip .sname'));
  await zone('fader mixer',Q('#strips .fader'));
  await zone('slot effet',Q('#fxPanel > .slot .slh'));
  const kn=Q('#fxPanel .knob')||Q('.knob');await zone('bouton rotatif',kn);
  L('--- automation depuis bouton rotatif');ctx(kn);await W(20);const auto=QA('.ctxm .ctxi').find(x=>x.textContent.includes('automation'));
  if(auto){auto.click();await W(50);L('  OK, fenêtre automation visible='+(Q('#w-auto')?Q('#w-auto').offsetParent!==null:'absente'));}else L('  item automation introuvable');close();await W(20);
  await zone('en-tête de piste',Q('#plTracks .plth span')||Q('#plTracks .plth'));
  await zone('sélecteur de pattern',Q('#patSel'));
  const nc=S.channels.length;S.sel=0;key('KeyC',{altKey:true});await W(30);L('Alt+C : canaux '+nc+' -> '+S.channels.length);
  const pat=S.pat;key('F4');await W(30);L('F4 : pattern '+pat+' -> '+S.pat);
  const ncl=S.clips.length,cl=Q('#plTracks .clip');if(cl){cl.dispatchEvent(new MouseEvent('mousedown',{button:2,bubbles:true,cancelable:true}));document.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));L('clic droit clip : clips '+ncl+' -> '+S.clips.length);}else L('aucun clip dans la playlist');
  L('menus ouverts restants='+QA('.ctxm').length);
}catch(e){L('EXC: '+e.stack);}
L('FIN');},900);</script>`;
h=h.replace('<head>','<head>'+pre).replace(/<\/body>(?![\s\S]*<\/body>)/,post+'</body>');
fs.writeFileSync('webstudio/fl-run.html',h);
console.log('fl-run.html écrit');
