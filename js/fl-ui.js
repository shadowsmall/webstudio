"use strict";
/* ===== WebStudio – interface et clics droits façon FL Studio =====
   Chargé après mixer-plus.js : réutilise ctxMenu, wsAsk, wsConfirm, mpIdx et les menus existants (réordonnés / renommés comme dans FL). */

/* ---------- couleurs (canaux, inserts, pistes) ---------- */
const FL_HUES=[['Rouge',0],['Brique',14],['Orange',28],['Jaune',52],['Citron',78],['Vert',115],['Menthe',150],['Cyan',182],['Azur',200],['Bleu',222],['Indigo',245],['Violet',272],['Magenta',298],['Rose',326]];
const flCol=h=>h==null?'#59646c':`hsl(${h},55%,52%)`;
function flColorItems(cur,set,allowNone){
  const L=FL_HUES.map(([n,h])=>({label:n,swatch:flCol(h),check:cur===h,act:()=>set(h)}));
  L.push({sep:1},{label:'Couleur aléatoire',act:()=>set(Math.floor(Math.random()*360))});
  if(allowNone)L.push({label:'Couleur par défaut',check:cur==null,act:()=>set(null)});
  return L;
}
/* ctxMenu : ajoute les pastilles de couleur (it.swatch) */
const _ctxFL=ctxMenu;
ctxMenu=function(x,y,items,level,flipX){
  const m=_ctxFL(x,y,items,level,flipX),rows=[...m.children];let k=0;
  items.forEach(it=>{if(!it)return;const r=rows[k++];if(!r||it.swatch==null)return;const c=r.querySelector('.ctxck');if(!c)return;
    c.textContent='';const s=el('span','ctxsw');s.style.background=it.swatch;if(it.check)s.style.outline='2px solid #fff';c.appendChild(s);});
  return m;
};
const flPick=(arr,p,extra)=>{const it=arr.find(x=>x&&x.label&&x.label.startsWith(p));return it?Object.assign({},it,extra||{}):null;};

/* ---------- automation depuis un bouton / fader (comme FL) ---------- */
function flKnobTarget(k){
  let x;
  if(k.closest('#masterKnob'))return'ins:0:vol';
  if((x=k.closest('#rack .crow'))){const c=S.channels[mpIdx(x,'.crow')];if(!c)return null;const n=[...x.querySelectorAll('.knob')].indexOf(k);return n===0?'ch:'+c.id+':pan':n===1?'ch:'+c.id+':vol':null;}
  if((x=k.closest('#strips .strip')))return'ins:'+mpIdx(x,'.strip')+':pan';
  if((x=k.closest('#fxPanel > .slot'))){const j=mpIdx(x,'.slot'),f=S.inserts[S.selIns].fx[j];if(!f||!FX[f.type])return null;
    const n=[...x.querySelectorAll('.kgrid .knob')].indexOf(k),pp=FX[f.type].params[n];return pp?'fx:'+S.selIns+':'+j+':'+pp[0]:null;}
  return null;
}
function flAutoItems(tgt,cur){
  const r=tgt&&autoRange(tgt),au=r&&S.autos&&S.autos.find(a=>a.tgt===tgt);
  return[{label:'Modifier les événements',disabled:!au,act:()=>{toggleWin('w-auto',true);setHint('Fenêtre Automation : modifie la courbe de ce paramètre.');}},
    {label:'Initialiser le morceau avec cette position',disabled:!au,act:()=>{const v=autoUnmap(r,cur);
      if(au.pts.length&&au.pts[0].s<=0)au.pts[0].v=v;else au.pts.unshift({s:0,v});renderAuto();commit();setHint('Valeur de départ de l\'automation mise à jour');}},
    {label:'Créer un clip d\'automation',disabled:!r,act:()=>addAuto(tgt)}];
}
const _kiFL=knobItems;
knobItems=function(k){
  const O=_kiFL(k),P=(p,x)=>flPick(O,p,x),tgt=flKnobTarget(k);
  return[O[0],...flAutoItems(tgt,k._ws.get()),{sep:1},P('Saisir une valeur'),P('Réinitialiser'),P('Minimum'),P('Maximum'),{sep:1},P('Copier la valeur'),P('Coller la valeur')];
};
function flFaderItems(i){
  const ins=S.inserts[i],set=v=>{ins.vol=clamp(v,0,1.25);applyParams(E);renderMixer();if(!i)renderToolbar();commit();};
  return[{head:'Volume '+ins.name+' : '+fmtPct(ins.vol)},...flAutoItems('ins:'+i+':vol',ins.vol),{sep:1},
    {label:'Saisir une valeur…',act:()=>wsAsk('Volume '+ins.name,String(Math.round(ins.vol*100)),'En %, de 0 à 125').then(s=>{
      if(s==null)return;const v=parseFloat(String(s).replace(',','.'));if(!isNaN(v))set(v/100);})},
    {label:'Réinitialiser',key:'80%',act:()=>set(.8)},{label:'Minimum',key:'0%',act:()=>set(0)},{label:'Maximum',key:'125%',act:()=>set(1.25)}];
}

/* ---------- Channel rack ---------- */
let flStepClip=null;
function flInsertCh(i,t){const n=S.channels.length;addChannel(t);if(t==='sampler'||S.channels.length<=n)return;
  const c=S.channels.pop();S.channels.splice(i+1,0,c);S.sel=i+1;rebuild();renderAll();commit();}
const _mpChFL=mpChannelItems;
mpChannelItems=function(i){
  const O=_mpChFL(i),P=(p,x)=>flPick(O,p,x),ch=S.channels[i],ns=ch.notes[S.pat]||[],len=patLen(S.pat);
  const fillN=n=>{const a=[];for(let s=0;s<len;s+=n)a.push({s,n:60,l:1,v:.85});ch.notes[S.pat]=a;renderRack();renderPRNotes();commit();};
  const mix=O.find(x=>x&&x.label==='Insert du mixer');
  return[O[0],P('Piano roll'),P('Réglages du canal',{label:'Fenêtre du canal'}),
    {sep:1},
    P('Renommer…',{key:'F2'}),
    {label:'Changer la couleur',sub:()=>flColorItems(ch.color,h=>{ch.color=h;renderRack();renderPR();commit();})},
    {sep:1},
    {label:'Insérer',sub:()=>Object.keys(TYPE_NAMES).map(t=>({label:TYPE_NAMES[t],act:()=>flInsertCh(i,t)}))},
    P('Remplacer l\'instrument',{label:'Remplacer'}),
    P('Dupliquer',{label:'Cloner',key:'Alt+C'}),
    P('Supprimer…',{key:'Alt+Suppr'}),
    {sep:1},
    {label:'Couper les pas',disabled:!ns.length,act:()=>{flStepClip=clone(ns);ch.notes[S.pat]=[];renderRack();renderPRNotes();commit();}},
    {label:'Copier les pas',disabled:!ns.length,act:()=>{flStepClip=clone(ns);setHint('Pas de « '+ch.name+' » copiés');}},
    {label:'Coller les pas',disabled:!flStepClip,act:()=>{ch.notes[S.pat]=clone(flStepClip).filter(n=>n.s<len);renderRack();renderPRNotes();commit();}},
    P('Effacer les notes',{label:'Effacer'}),
    {sep:1},
    P('Remplir chaque 2'),P('Remplir chaque 4'),P('Remplir chaque 8'),
    {label:'Remplir chaque…',act:()=>wsAsk('Remplir chaque … pas','3','Nombre de pas entre deux notes (1 à '+len+')').then(v=>{const n=parseInt(v);if(n>=1&&n<=len)fillN(n);})},
    P('Décaler les pas à gauche',{label:'Décaler à gauche'}),P('Décaler les pas à droite',{label:'Décaler à droite'}),
    {sep:1},
    mix?Object.assign({},mix,{label:'Piste du mixer'}):null,
    mix?{label:'Affecter une piste de mixer libre',act:()=>mix.sub()[0].act()}:null,
    {sep:1},
    P('Couper (mute)',{label:'Couper le son'}),P('Solo'),
    P('Monter',{key:'Alt+↑'}),P('Descendre',{key:'Alt+↓'})];
};

/* ---------- Mixer ---------- */
function flSaveIns(i){
  const ins=S.inserts[i],data={webstudioInsert:1,name:ins.name,vol:ins.vol,pan:ins.pan,color:ins.color==null?null:ins.color,fx:ins.fx};
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,1)],{type:'application/json'}));
  a.download=(ins.name||'piste').replace(/[\\/:*?"<>|]+/g,'_')+'.wsmix.json';document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);setHint('État de la piste enregistré');
}
function flLoadIns(i){
  const inp=document.createElement('input');inp.type='file';inp.accept='.json';
  inp.onchange=()=>{const f=inp.files[0];if(!f)return;f.text().then(t=>{
    let d;try{d=JSON.parse(t);}catch(e){d=null;}
    if(!d||!d.webstudioInsert||!Array.isArray(d.fx)){setHint('Fichier invalide : ce n\'est pas un état de piste WebStudio');return;}
    const ins=S.inserts[i];ins.fx=d.fx.slice(0,NFX).map(x=>x&&FX[x.type]?{type:x.type,on:x.on!==false,p:Object.assign(clone(FX[x.type].def),x.p||{})}:null);
    while(ins.fx.length<NFX)ins.fx.push(null);
    if(typeof d.vol==='number')ins.vol=clamp(d.vol,0,1.25);if(typeof d.pan==='number')ins.pan=clamp(d.pan,-1,1);
    if(d.color!=null)ins.color=d.color;if(i&&d.name)ins.name=String(d.name).slice(0,40);
    fxChanged();setHint('État de piste chargé : '+f.name);});};
  inp.click();
}
const _mpStFL=mpStripItems;
mpStripItems=function(i){
  const O=_mpStFL(i),P=(p,x)=>flPick(O,p,x),ins=S.inserts[i],routed=S.channels.filter(c=>c.ins===i),ch=S.channels[S.sel];
  return[O[0],P('Renommer…'),
    {label:'Changer la couleur',sub:()=>flColorItems(ins.color,h=>{ins.color=h;renderMixer();commit();},true)},
    i?{label:'Nom auto',disabled:!routed.length,act:()=>{ins.name=routed[0].name;renderMixer();renderSettings();commit();}}:null,
    {sep:1},
    ch?{label:'Lier le canal sélectionné à cette piste',key:'Ctrl+L',check:ch.ins===i,act:()=>{ch.ins=i;rebuild();renderRack();renderMixer();renderSettings();commit();}}:null,
    P('Canaux routés'),
    {sep:1},
    P('Préréglages de chaîne'),P('Ajouter un effet'),P('Bypasser tous',{label:'Désactiver tous les effets'}),
    P('Copier la chaîne'),P('Coller la chaîne'),P('Effacer tous',{label:'Effacer la chaîne d\'effets'}),
    {sep:1},
    P('Couper (mute)',{label:'Couper le son'}),P('Solo'),P('Volume par défaut'),P('Centrer'),
    {sep:1},
    {label:'Fichier',sub:()=>[{label:'Enregistrer l\'état de la piste…',act:()=>flSaveIns(i)},{label:'Ouvrir un état de piste…',act:()=>flLoadIns(i)}]},
    P('Réinitialiser')];
};
const _mpSlFL=mpSlotItems;
mpSlotItems=function(si,j){
  const O=_mpSlFL(si,j),P=(p,x)=>flPick(O,p,x),f=S.inserts[si].fx[j];
  return[O[0],f?P('Remplacer par',{label:'Remplacer'}):P('Choisir un effet',{label:'Sélectionner'}),
    {sep:1},
    f?{label:'Activé',check:f.on!==false,act:()=>{f.on=f.on===false;fxChanged();}}:null,
    P('Réinitialiser les param'),
    {sep:1},
    P('Monter',{label:'Déplacer vers le haut'}),P('Descendre',{label:'Déplacer vers le bas'}),
    {sep:1},
    P('Copier l\'effet',{label:'Copier'}),P('Coller l\'effet',{label:'Coller'}),P('Vider le slot',{label:'Supprimer'})];
};

/* ---------- Playlist ---------- */
const _mpTrFL=mpTrackItems;
mpTrackItems=function(ti){
  const O=_mpTrFL(ti),P=(p,x)=>flPick(O,p,x),t=S.tracks[ti],mine=S.clips.filter(c=>c.t===ti);
  const soloed=!t.mute&&S.tracks.every((x,k)=>k===ti||x.mute),last=S.tracks.length-1;
  return[O[0],P('Renommer…'),
    {label:'Changer la couleur',sub:()=>flColorItems(t.color,h=>{t.color=h;renderPL();commit();},true)},
    {label:'Nom auto',disabled:!mine.length,act:()=>{const c=mine.slice().sort((a,b)=>a.b-b.b)[0];t.name=S.patterns[c.p].name;renderPL();commit();}},
    {sep:1},
    {label:'Insérer une piste',disabled:S.clips.some(c=>c.t===last),act:()=>{
      S.clips.forEach(c=>{if(c.t>=ti)c.t++;});S.tracks.splice(ti,0,{name:'Nouvelle piste',mute:false});S.tracks.pop();renderPL();commit();}},
    {label:'Supprimer la piste…',act:()=>wsConfirm('Supprimer la piste','Supprimer « '+t.name+' »'+(mine.length?' et ses '+mine.length+' clip(s)':'')+' ?').then(ok=>{
      if(!ok)return;S.clips=S.clips.filter(c=>c.t!==ti);S.clips.forEach(c=>{if(c.t>ti)c.t--;});
      S.tracks.splice(ti,1);S.tracks.push({name:'Piste '+(S.tracks.length+1),mute:false});renderPL();commit();})},
    P('Monter'),P('Descendre'),
    {sep:1},
    P('Couper (mute)',{label:'Couper le son'}),
    {label:'Solo',check:soloed,act:()=>{S.tracks.forEach((x,k)=>{x.mute=soloed?false:k!==ti;});renderPL();commit();}},
    {sep:1},
    P('Ajouter «'),P('Vider la piste')];
};
function flFirstEmpty(){
  for(let k=0;k<S.patterns.length;k++)if(S.channels.every(c=>!(c.notes[k]||[]).length)){setPat(k);setHint('Premier pattern vide : '+S.patterns[k].name);return;}
  newPattern();setHint('Aucun pattern vide : nouveau pattern créé');
}
function flSplit(){
  const p=S.pat,used=S.channels.filter(c=>(c.notes[p]||[]).length);
  if(used.length<2){setHint('Il faut au moins 2 canaux avec des notes pour diviser ce pattern');return;}
  const first=S.patterns.length;
  used.forEach(c=>{S.patterns.push({name:S.patterns[p].name+' – '+c.name,len:patLen(p)});S.channels.forEach(x=>x.notes.push(x===c?clone(c.notes[p]):[]));});
  setPat(first);commit();setHint('Pattern divisé en '+used.length+' patterns (un par canal)');
}
const _mpPaFL=mpPatternItems;
mpPatternItems=function(){
  const O=_mpPaFL(),P=(p,x)=>flPick(O,p,x),n=S.patterns.length,used=S.channels.filter(c=>(c.notes[S.pat]||[]).length).length;
  return[O[0],...O.slice(1,1+n),{sep:1},
    {label:'Trouver le premier vide',key:'F4',act:flFirstEmpty},
    P('Nouveau pattern'),P('Cloner'),P('Renommer…'),
    {label:'Diviser par canal',disabled:used<2,act:flSplit},
    {sep:1},P('Vider…'),P('Supprimer…')];
};

/* ---------- fenêtres façon FL : ▼ options, réduire, agrandir, focus ---------- */
function flCollapse(w){
  if(w.classList.contains('collapsed')){w.style.height=w._flh||'';w.classList.remove('collapsed');}
  else{if(w.classList.contains('maxi'))flMax(w);w._flh=w.style.height||w.offsetHeight+'px';w.style.height=(w.querySelector('.wt').offsetHeight+2)+'px';w.classList.add('collapsed');}
}
function flMax(w){
  if(w.classList.contains('maxi')){Object.assign(w.style,w._flr||{});w.classList.remove('maxi');}
  else{if(w.classList.contains('collapsed'))flCollapse(w);const s=w.style;w._flr={left:s.left,top:s.top,width:s.width,height:s.height};
    Object.assign(s,{left:'0px',top:'0px',width:$('#ws').clientWidth+'px',height:$('#ws').clientHeight+'px'});w.classList.add('maxi');}
  focusWin(w);
}
function flWinItems(w){
  const id=w.id,ttl=w.querySelector('.ttl'),L=[{head:ttl?ttl.textContent:'Fenêtre'}],ch=S.channels[S.sel];
  const spec={
    'w-rack':()=>[{label:'Ajouter un canal',sub:()=>Object.keys(TYPE_NAMES).map(t=>({label:TYPE_NAMES[t],act:()=>addChannel(t)}))},
      ch?{label:'Canal « '+ch.name+' »',sub:()=>mpChannelItems(S.sel)}:null,{label:'Patterns',sub:()=>mpPatternItems()}],
    'w-mix':()=>[{label:'Insert « '+S.inserts[S.selIns].name+' »',sub:()=>mpStripItems(S.selIns)}],
    'w-pl':()=>[{label:'Patterns',sub:()=>mpPatternItems()},
      {label:'Vider la playlist…',disabled:!S.clips.length,act:()=>wsConfirm('Vider la playlist','Supprimer les '+S.clips.length+' clips de la playlist ?').then(ok=>{if(ok){S.clips=[];renderPL();commit();}})}],
    'w-pr':()=>[...[...w.querySelectorAll('.wt [data-tr]')].map(b=>({label:'Transposer '+b.textContent,act:()=>b.click()})),
      $('#prHum')?{label:'Humaniser',act:()=>$('#prHum').click()}:null,$('#prClr')?{label:'Vider',act:()=>$('#prClr').click()}:null]
  };
  if(spec[id])L.push(...spec[id](),{sep:1});
  L.push({label:'Réduire',check:w.classList.contains('collapsed'),act:()=>flCollapse(w)},
    {label:'Agrandir',check:w.classList.contains('maxi'),act:()=>flMax(w)},
    {label:'Fermer',act:()=>toggleWin(id,false)},{sep:1},{label:'Réorganiser les fenêtres',act:()=>layoutWins()});
  return L;
}
function flChrome(w){
  if(!w||w._flc)return;const wt=w.querySelector(':scope > .wt'),x=wt&&wt.querySelector(':scope > .x');if(!x)return;w._flc=1;
  const o=el('button','wopt','▼'),mn=el('button','wmin','–'),mx=el('button','wmax','□');
  o.dataset.hint='Options de la fenêtre (ou clic droit sur la barre de titre)';mn.dataset.hint='Réduire / dérouler';mx.dataset.hint='Agrandir / restaurer (double-clic sur le titre)';
  wt.prepend(o);x.before(mn,mx);
  o.onclick=e=>{e.stopPropagation();mpMenuAt(o,flWinItems(w));};mn.onclick=()=>flCollapse(w);mx.onclick=()=>flMax(w);
  wt.addEventListener('dblclick',e=>{if(!e.target.closest('button,select,input,.knob'))flMax(w);});
}
const _fwFL=focusWin;
focusWin=function(w){_fwFL(w);$$('.win.flfocus').forEach(x=>{if(x!==w)x.classList.remove('flfocus');});w.classList.add('flfocus');};
const _lwFL=layoutWins;
layoutWins=function(){$$('.win').forEach(w=>w.classList.remove('maxi','collapsed'));_lwFL();};
const _mwFL=makeWin;
makeWin=function(...a){const r=_mwFL(...a);flChrome(r.w);return r;};
$$('.win').forEach(flChrome);
window.addEventListener('resize',()=>$$('.win.maxi').forEach(w=>Object.assign(w.style,{width:$('#ws').clientWidth+'px',height:$('#ws').clientHeight+'px'})));

/* ---------- aiguillage clic droit supplémentaire (avant celui de mixer-plus) ---------- */
window.addEventListener('contextmenu',e=>{
  const t=e.target;if(!t||!t.closest||t.closest('.ctxm,.wsdlg-bg'))return;
  let items=null,x;
  if(t.closest('#strips .fader')&&(x=t.closest('#strips .strip'))){const i=mpIdx(x,'.strip');if(S.selIns!==i){S.selIns=i;renderMixer();}items=flFaderItems(i);}
  else if((x=t.closest('.win > .wt'))&&!t.closest('button,select,input,.knob'))items=flWinItems(x.parentNode);
  if(!items)return;e.preventDefault();e.stopPropagation();ctxMenu(e.clientX,e.clientY,items);
},true);
/* Playlist : clic droit (et glisser) = supprimer les clips survolés, comme FL */
window.addEventListener('mousedown',e=>{
  if(e.button!==2||!e.target.closest)return;const c0=e.target.closest('#plTracks .clip');if(!c0)return;
  e.preventDefault();e.stopPropagation();let n=0;
  const del=d=>{const ci=+d.dataset.ci;if(!S.clips[ci])return;S.clips.splice(ci,1);n++;renderPL();};
  del(c0);
  const ov=ev=>{const d=ev.target.closest&&ev.target.closest('#plTracks .clip');if(d)del(d);};
  const up=()=>{document.removeEventListener('mouseover',ov);document.removeEventListener('mouseup',up);if(n)commit();};
  document.addEventListener('mouseover',ov);document.addEventListener('mouseup',up);
},true);

/* ---------- raccourcis FL : F2, F4, Alt+C, Alt+Suppr, Alt+↑/↓, Ctrl+L ---------- */
document.addEventListener('keydown',e=>{
  if(typing(e)||ctxStack.length||document.querySelector('.wsdlg-bg'))return;
  const k=e.code,ch=S.channels[S.sel],chIt=p=>{const it=ch&&flPick(_mpChFL(S.sel),p);if(it&&!it.disabled)it.act();};
  if(e.altKey&&!e.ctrlKey){
    if(k==='KeyC'&&ch){e.preventDefault();cloneChannel();}
    else if(k==='Delete'&&ch){e.preventDefault();chIt('Supprimer…');}
    else if(k==='ArrowUp'&&ch){e.preventDefault();chIt('Monter');}
    else if(k==='ArrowDown'&&ch){e.preventDefault();chIt('Descendre');}
    return;
  }
  if(e.ctrlKey&&!e.shiftKey&&k==='KeyL'&&ch){e.preventDefault();ch.ins=S.selIns;rebuild();renderRack();renderMixer();renderSettings();commit();
    setHint('« '+ch.name+' » lié à '+(S.selIns?'l\'insert '+S.selIns:'Master'));return;}
  if(e.ctrlKey||e.metaKey)return;
  if(k==='F2'&&ch){e.preventDefault();chIt('Renommer…');}
  else if(k==='F4'){e.preventDefault();e.stopImmediatePropagation();flFirstEmpty();}
});

/* ---------- rendu : couleurs, aides ---------- */
const _rmFL=renderMixer;
renderMixer=function(){_rmFL();
  $$('#strips .strip').forEach((s,i)=>{const c=S.inserts[i]&&S.inserts[i].color;if(c!=null)s.style.borderTopColor=flCol(c);});
  $$('#strips .fader').forEach(f=>f.dataset.hint=(f.dataset.hint||'Volume')+' · clic droit : menu (automation, valeur…)');};
const _rplFL=renderPL;
renderPL=function(){_rplFL();
  $$('#plTracks .plth').forEach((th,ti)=>{const t=S.tracks[ti];if(t&&t.color!=null)th.style.borderLeftColor=flCol(t.color);});
  $$('#plTracks .clip').forEach(d=>d.dataset.hint='Glisser : déplacer · clic : éditer · clic droit (glisser) : supprimer');};
{const f=$('.rackfoot .lab');if(f)f.textContent='Clic : poser un pas · clic droit : effacer · clic droit sur le nom : menu du canal';}
{const h=$('#helpBody');if(h){const d=el('div');d.innerHTML='<br><b>Clics droits (façon FL Studio)</b> : bouton rotatif / fader = automation, saisir une valeur, copier/coller · nom de canal = menu du canal · '+
  'pas = effacer · tranche du mixer = menu de la piste · slot d\'effet = menu de l\'effet · en-tête de piste = menu de la piste · clip = supprimer (glisser pour plusieurs) · barre de titre = options de la fenêtre<br>'+
  '<kbd>F2</kbd> renommer le canal · <kbd>F4</kbd> premier pattern vide · <kbd>Alt+C</kbd> cloner le canal · <kbd>Alt+Suppr</kbd> supprimer le canal · <kbd>Alt+↑</kbd>/<kbd>Alt+↓</kbd> déplacer le canal · <kbd>Ctrl+L</kbd> lier le canal à l\'insert sélectionné';h.appendChild(d);}}
