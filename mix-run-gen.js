// Génère webstudio/mix-run.html : index.html + test automatique des effets et menus clic droit (Edge headless)
const fs=require('fs');
let h=fs.readFileSync('webstudio/index.html','utf8');
const pre=`<script>window.__log=[];window.onerror=(m,s,l,c)=>{__log.push('ERREUR: '+m+' @'+(s||'').split('/').pop()+':'+l+':'+c);};
window.addEventListener('unhandledrejection',e=>__log.push('PROMESSE: '+(e.reason&&e.reason.stack||e.reason)));
window.alert=m=>__log.push('ALERT: '+m);window.confirm=m=>{__log.push('CONFIRM: '+m);return false;};window.prompt=m=>{__log.push('PROMPT: '+m);return null;};
const _ce=console.error;console.error=(...a)=>{__log.push('CONSOLE: '+a.join(' '));_ce(...a);};</script>`;
const post=`<script>
const L=m=>{__log.push(m);let p=document.getElementById('TESTLOG');if(!p){p=document.createElement('pre');p.id='TESTLOG';document.body.appendChild(p);}p.textContent=__log.join('\\n');},Q=s=>document.querySelector(s),QA=s=>[...document.querySelectorAll(s)];
const ctx=(node)=>{const r=node.getBoundingClientRect();node.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:r.left+3,clientY:r.top+3}));};
const menuLabels=()=>QA('.ctxm').map(m=>[...m.children].map(c=>c.textContent.trim()).join(' | '));
const clickItem=(txt)=>{const it=QA('.ctxm .ctxi').find(x=>x.querySelector('.ctxl').textContent.startsWith(txt));if(!it){L('  item introuvable: '+txt);return false;}it.dispatchEvent(new MouseEvent('mouseenter'));it.click();return true;};
async function renderTest(label){
  const oc=new OfflineAudioContext(2,44100*2,44100),EE=buildEngine(oc,oc.destination,false),sd=60/S.bpm/4;
  for(let g=0;g<30;g++)scheduleStep(EE,g,.02+g*sd,sd,'pat');
  const b=await oc.startRendering();let pk=0,nan=0;for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<d.length;i++){const v=d[i];if(v!==v)nan++;else if(Math.abs(v)>pk)pk=Math.abs(v);}}
  L(label+' : crête='+pk.toFixed(3)+(nan?' NaN='+nan:'')+(EE.sync?' sync='+EE.sync.length:''));
}
setTimeout(async()=>{try{
  L('NFX='+NFX+' slots master='+S.inserts[0].fx.length+' nb effets='+Object.keys(FX).length);
  S.pat=0;
  const keep=clone(S.inserts[0].fx);
  await renderTest('sans effet');
  for(const k of ['softclip','maximus','eq7','exciter','bassboost','lofi','autowah','ringmod','trancegate','pump','pingpong','hall','utility']){
    S.inserts[0].fx=Array(NFX).fill(null);S.inserts[0].fx[0]={type:k,on:true,p:clone(FX[k].def)};await renderTest('FX '+k);}
  for(const n of Object.keys(FX_CHAINS)){applyChain(0,n);await renderTest('Chaîne '+n);}
  S.inserts[0].fx=keep;S.selIns=0;rebuild();renderMixer();

  L('--- clic droit tranche Master');ctx(Q('#strips .strip .sname'));L('  '+menuLabels().join(' || '));
  QA('.ctxm .ctxi').find(x=>x.textContent.includes('Préréglages')).dispatchEvent(new MouseEvent('mouseenter'));
  L('  menus ouverts='+QA('.ctxm').length+' ; sous-menu: '+menuLabels()[1]);
  clickItem('Mastering doux');await new Promise(r=>setTimeout(r,50));
  const ok=Q('.wsdlg .btns .fxbtn');if(ok){L('  dialogue: '+Q('.wsdlg').textContent);ok.click();}
  await new Promise(r=>setTimeout(r,50));
  L('  master fx='+S.inserts[0].fx.filter(Boolean).map(f=>f.type).join(','));
  L('  slots affichés='+QA('#fxPanel > .slot').length+' optgroups slot1='+QA('#fxPanel > .slot select')[0].querySelectorAll('optgroup').length+' barre='+(!!Q('.fxtools')));

  L('--- clic droit slot 2');ctx(QA('#fxPanel > .slot')[1].querySelector('.slh'));L('  '+menuLabels()[0]);
  clickItem('Monter');L('  ordre='+S.inserts[0].fx.filter(Boolean).map(f=>f.type).join(','));

  L('--- clic droit knob');ctx(Q('#fxPanel .knob'));L('  '+menuLabels()[0]);clickItem('Maximum');L('  après Maximum : '+JSON.stringify(S.inserts[0].fx[0].p));

  L('--- clic droit led insert 1 (solo)');ctx(QA('#strips .strip')[1].querySelector('.led'));L('  mutes='+S.inserts.map(x=>x.mute?1:0).join(''));
  ctx(QA('#strips .strip')[1].querySelector('.led'));L('  après 2e clic='+S.inserts.map(x=>x.mute?1:0).join(''));

  L('--- clic droit canal 0');ctx(Q('#rack .crow .cname'));L('  '+menuLabels()[0]);
  clickItem('Renommer');await new Promise(r=>setTimeout(r,30));const inp=Q('.wsdlg input');
  if(inp){inp.value='Kick test';Q('.wsdlg .btns .fxbtn').click();}await new Promise(r=>setTimeout(r,30));L('  nom canal 0='+S.channels[0].name);
  const before=S.channels[0].notes[0].length,st=QA('#rack .crow')[0].querySelector('.st.on');
  if(st){st.dispatchEvent(new MouseEvent('mousedown',{button:2,bubbles:true,cancelable:true}));document.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));}
  L('  notes canal 0 avant/après clic droit sur un pas='+before+'/'+S.channels[0].notes[0].length);

  L('--- clic droit piste playlist');ctx(Q('#plTracks .plth span'));L('  '+menuLabels()[0]);document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));L('  menus après Échap='+QA('.ctxm').length);
  L('--- clic droit sélecteur de pattern');ctx(Q('#patSel'));L('  '+menuLabels()[0]);document.body.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));L('  menus après clic ailleurs='+QA('.ctxm').length);
}catch(e){L('EXC: '+e.stack);}
L('FIN');},800);</script>`;
h=h.replace('<head>','<head>'+pre).replace(/<\/body>(?![\s\S]*<\/body>)/,post+'</body>');
fs.writeFileSync('webstudio/mix-run.html',h);
console.log('mix-run.html écrit');
