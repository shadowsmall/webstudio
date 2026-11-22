"use strict";
/* ===== WebStudio – outils, gammes, thèmes, menus et démarrage des modules ===== */
const SCALES={'Aucune':null,'Majeur':[0,2,4,5,7,9,11],'Mineur':[0,2,3,5,7,8,10],'Mineur harmonique':[0,2,3,5,7,8,11],'Dorien':[0,2,3,5,7,9,10],
  'Phrygien':[0,1,3,5,7,8,10],'Mixolydien':[0,2,4,5,7,9,10],'Penta majeure':[0,2,4,7,9],'Penta mineure':[0,3,5,7,10],'Blues':[0,3,5,6,7,10]};
const defScale=()=>({root:0,name:'Aucune'});
if(!S.scale||!SCALES.hasOwnProperty(S.scale.name))S.scale=defScale();
const _bpT=baseProject;baseProject=function(){const P=_bpT();P.scale=defScale();return P;};
const _nT=normalize;normalize=function(P){P=_nT(P);if(!P.scale||!SCALES.hasOwnProperty(P.scale.name))P.scale=defScale();return P;};

const inScale=n=>{const sc=SCALES[S.scale.name];return !sc||sc.includes(((n-S.scale.root)%12+12)%12);};
function snapScale(n){if(inScale(n))return n;for(let d=1;d<6;d++){if(inScale(n-d))return n-d;if(inScale(n+d))return n+d;}return n;}
function markScale(){
  const sc=S.scale||defScale(),on=!!SCALES[sc.name];
  [...$('#prRows').children].forEach((r,k)=>{const n=PR_HI-k;r.classList.toggle('insc',on&&inScale(n));r.classList.toggle('scr',on&&((n-sc.root)%12+12)%12===0);});
}

/* ---- Outils du piano roll ---- */
let prClip=null;
function prEdit(fn){
  const ch=S.channels[S.sel];if(!ch)return;const len=patLen(S.pat);
  ch.notes[S.pat]=fn(ch.notes[S.pat]||[],len,ch).filter(n=>n.s>=0&&n.s<len).map(n=>{n.l=clamp(n.l,1,len-n.s);return n;});
  renderPRNotes();renderRack();commit();
}
function genMelody(){
  const ch=S.channels[S.sel];if(!ch){alert('Sélectionne d\'abord un canal.');return;}
  const len=patLen(S.pat),old=ch.notes[S.pat]||[];
  if(old.length&&!confirm('Remplacer les notes de « '+ch.name+' » dans ce pattern ?'))return;
  const out=[];
  if(DRUMS.includes(ch.type)){
    const dens={kick:.3,snare:.15,clap:.15,hat:.6,ohat:.1,tom:.12,perc:.15,crash:.03,rim:.2,shaker:.6,conga:.25}[ch.type]||.25;
    for(let s=0;s<len;s++){const strong=s%4===0;if(Math.random()<dens*(strong?1.8:1))out.push({s,n:60,l:1,v:strong?.85:(Math.random()<.5?.45:.75)});}
  }else{
    const sc=SCALES[S.scale.name]||SCALES['Penta mineure'],low=['bass','sub808'].includes(ch.type)||(ch.synth&&ch.synth.engine==='b808');
    const base=(low?4:5)*12+S.scale.root;let deg=0;
    for(let s=0;s<len;){
      const l=Math.min([1,2,2,2,4][Math.floor(Math.random()*5)],len-s);
      if(Math.random()<.78){
        deg=clamp(deg+Math.round((Math.random()-.5)*4),-3,sc.length+3);
 const o=Math.floor(deg/sc.length),n=base+o*12+sc[((deg%sc.length)+sc.length)%sc.length];
 out.push({s,n:clamp(n,PR_LO,PR_HI),l,v:.65+Math.random()*.3});
      }
      s+=l;
    }
  }
  ch.notes[S.pat]=out;renderPRNotes();renderRack();commit();
  setHint('Généré : '+out.length+' notes. Relance pour une autre variante (Ctrl+Z pour annuler).');
}
const PR_TOOLS=[
  ['gen','🎲 Générer une mélodie / un rythme',genMelody],
  ['legato','Legato (prolonger jusqu\'à la note suivante)',()=>prEdit(ns=>{const st=[...new Set(ns.map(n=>n.s))].sort((a,b)=>a-b);ns.forEach(n=>{const nx=st.find(s=>s>n.s);n.l=(nx==null?Infinity:nx)-n.s;});return ns;})],
  ['rev','Rétrograde (inverser dans le temps)',()=>prEdit((ns,len)=>ns.map(n=>Object.assign(n,{s:len-n.s-n.l})))],
  ['flip','Miroir (inverser les hauteurs)',()=>prEdit(ns=>{if(!ns.length)return ns;const a=Math.min(...ns.map(n=>n.n)),b=Math.max(...ns.map(n=>n.n));ns.forEach(n=>{n.n=a+b-n.n;});return ns;})],
  ['x2','Ralentir (durées ×2)',()=>prEdit(ns=>ns.map(n=>Object.assign(n,{s:n.s*2,l:n.l*2})))],
  ['d2','Accélérer (durées ÷2)',()=>prEdit(ns=>ns.map(n=>Object.assign(n,{s:Math.floor(n.s/2),l:Math.max(1,Math.round(n.l/2))})))],
  ['snap','Accrocher les notes à la gamme',()=>{if(!SCALES[S.scale.name]){alert('Choisis d\'abord une gamme.');return;}prEdit(ns=>ns.map(n=>Object.assign(n,{n:snapScale(n.n)})));}],
  ['o+','Octave +1',()=>transpose(12)],['o-','Octave −1',()=>transpose(-12)],
  ['vel','Vélocités aléatoires',humanize],
  ['dedup','Supprimer les doublons',()=>prEdit(ns=>{const seen=new Set();return ns.filter(n=>{const k=n.s+':'+n.n;if(seen.has(k))return false;seen.add(k);return true;});})],
  ['copy','Copier les notes',()=>{const ch=S.channels[S.sel];if(ch){prClip=clone(ch.notes[S.pat]||[]);setHint(prClip.length+' note(s) copiée(s)');}}],
  ['paste','Coller les notes',()=>{if(!prClip){setHint('Rien à coller');return;}prEdit(ns=>ns.concat(clone(prClip)));}]
];
let prRootSel=null,prScaleSel=null;
(function(){
  const wt=$('#w-pr .wt'),sp=wt.querySelector('.sp');
  prRootSel=selBox(NN.map((n,i)=>[i,n]),S.scale.root,v=>{S.scale.root=+v;markScale();commit();});prRootSel.dataset.hint='Tonique de la gamme';
  prScaleSel=selBox(Object.keys(SCALES).map(k=>[k,k==='Aucune'?'Gamme : aucune':k]),S.scale.name,v=>{S.scale.name=v;markScale();commit();});
  prScaleSel.dataset.hint='Gamme : surligne ses notes dans le piano roll';
  const tools=selBox([['','🛠 Outils…']].concat(PR_TOOLS.map(t=>[t[0],t[1]])),'',v=>{tools.value='';const f=PR_TOOLS.find(x=>x[0]===v);if(f)f[2]();});
  tools.dataset.hint='Outils du piano roll';
  wt.insertBefore(prRootSel,sp);wt.insertBefore(prScaleSel,sp);wt.insertBefore(tools,sp);
})();

/* ---- Patterns / playlist ---- */
function doublePattern(){
  const p=S.pat,L=patLen(p);if(L*2>64){alert('Longueur maximale : 4 mesures.');return;}
  S.channels.forEach(c=>{const ns=c.notes[p]||[];c.notes[p]=ns.concat(ns.map(n=>Object.assign({},n,{s:n.s+L})));});
  S.patterns[p].len=L*2;renderAll();commit();setHint('Pattern doublé : '+(L*2/16)+' mesure(s)');
}
function fillTrack(){
  const t=S.tracks.findIndex((_,i)=>!S.clips.some(c=>c.t===i));if(t<0){alert('Aucune piste libre dans la playlist.');return;}
  const w=Math.max(1,patLen(S.pat)/16);for(let b=0;b<8;b+=w)S.clips.push({t,b,p:S.pat});
  renderPL();commit();setHint('Pattern placé sur 8 mesures, piste '+(t+1));
}
let tapTimes=[];
function tapTempo(){
  const now=performance.now();tapTimes=tapTimes.filter(x=>now-x<2500);tapTimes.push(now);
  if(tapTimes.length<2){setHint('Tap tempo : continue de cliquer en rythme…');return;}
  const iv=(tapTimes[tapTimes.length-1]-tapTimes[0])/(tapTimes.length-1);
  S.bpm=clamp(Math.round(60000/iv),20,300);renderToolbar();applyParams(E);commitSoon();setHint('Tap tempo : '+S.bpm+' BPM');
}

/* ---- Thèmes ---- */
const THEMES={orange:['Orange (classique)',''],bleu:['Bleu','hue-rotate(185deg)'],vert:['Vert','hue-rotate(80deg)'],violet:['Violet','hue-rotate(245deg)'],clair:['Clair','invert(.9) hue-rotate(180deg)']};
function setTheme(k,silent){
  if(!THEMES[k])k='orange';document.body.style.filter=THEMES[k][1];
  try{localStorage.setItem('webstudio2-theme',k);}catch(e){}
  if(!silent)setHint('Thème : '+THEMES[k][0]);
}
try{setTheme(localStorage.getItem('webstudio2-theme')||'orange',true);}catch(e){}

/* ---- Menus, navigateur, barre d'outils ---- */
const _MENUS0=MENUS;
MENUS=function(){
  const m=_MENUS0();
  m['FICHIER'].splice(6,0,['Exporter les pistes séparées (WAV)…',exportStems],['Exporter en MIDI…','Ctrl+M',exportMidi],['Importer un fichier MIDI…',()=>$('#fileMidi').click()],['Importer un projet FL Studio (.flp)…',()=>$('#fileFlp').click()]);
  m['PATTERNS'].push('-',['Doubler la longueur',doublePattern],['Remplir une piste libre (8 mesures)',fillTrack],['Premier pattern vide','F4',flFirstEmpty]);
  m['OUTILS']=PR_TOOLS.map(t=>[t[1],t[2]]).concat(['-',['Tap tempo',tapTempo]]);
  m['VUE'].splice(6,0,['Automation','F10',()=>toggleWin('w-auto')]);
  m['OPTIONS'].push('-',['Activer un clavier MIDI',enableMidi],['Enregistrer le micro (marche/arrêt)',toggleMic],['Enregistrer la sortie audio (marche/arrêt)',toggleOutRec],'-')
  Object.keys(THEMES).forEach(k=>m['OPTIONS'].push(['Thème : '+THEMES[k][0],()=>setTheme(k)]));
  const order=['FICHIER','ÉDITION','AJOUTER','PATTERNS','OUTILS','VUE','OPTIONS','AIDE'];
  return Object.fromEntries(order.filter(k=>m[k]).map(k=>[k,m[k]]));
};
const _rb0=renderBrowser;
renderBrowser=function(){
  _rb0();const b=$('#browser');
  const sec=(title,items)=>{const h=el('div','bh','▾ '+title),list=el('div','bl');
    items.forEach(([label,fn,hint])=>{const it=el('div','bi',label);it.dataset.hint=hint||label;it.onclick=fn;list.appendChild(it);});
    h.onclick=()=>{list.classList.toggle('closed');h.textContent=(list.classList.contains('closed')?'▸ ':'▾ ')+title;};b.append(h,list);};
  sec('Outils',[
    ['🎲 Générer une mélodie',genMelody,'Crée une mélodie (ou un rythme) dans la gamme choisie, pour le canal sélectionné'],
    ['📈 Automation',()=>toggleWin('w-auto',true),'Courbes de volume, pan, filtre, effets… (mode SONG)'],
    ['🎹 Activer un clavier MIDI',enableMidi],['🎙 Enregistrer le micro',toggleMic],['⏺ Enregistrer la sortie',toggleOutRec],
    ['📥 Importer un fichier MIDI',()=>$('#fileMidi').click()],['🍓 Importer un projet FL Studio (.flp)',()=>$('#fileFlp').click(),'Ouvre un fichier .flp : tempo, canaux, patterns, notes et playlist'],['🎼 Exporter en MIDI',exportMidi],['📦 Exporter les pistes séparées',exportStems]]);
  sec('Thèmes',Object.keys(THEMES).map(k=>['🎨 '+THEMES[k][0],()=>setTheme(k)]));
};
const _raT=renderAll;
renderAll=function(){_raT();if(prRootSel){prRootSel.value=S.scale.root;prScaleSel.value=S.scale.name;}markScale();};

document.addEventListener('keydown',e=>{
  if(typing(e))return;
  if(e.code==='F10'){e.preventDefault();toggleWin('w-auto');}
  else if(e.code==='F4'&&!e.ctrlKey&&!e.altKey){e.preventDefault();newPattern();}
  else if((e.ctrlKey||e.metaKey)&&e.code==='KeyM'){e.preventDefault();exportMidi();}
});

(function(){
  const hb=$('#helpBody');if(!hb)return;const d=el('div','helpx');
  d.innerHTML='<h3>Nouveautés</h3><table>'+
    [['F10','Fenêtre Automation (courbes jouées en mode SONG)'],['F4','Premier pattern vide (en crée un s\'il n\'y en a pas)'],['Ctrl+M','Exporter en MIDI'],
     ['Piano roll','Gamme, tonique et menu 🛠 Outils (générer, legato, miroir, copier/coller…)'],
     ['Réglages du canal','Moteur de synthèse (FM, Super saw, Orgue, 808, Corde pincée) et arpégiateur'],
     ['Mixer','7 nouveaux effets et 2 envois (sends) par insert'],
     ['🎙 / ⏺','Enregistrer le micro (nouveau sampler) / la sortie audio'],
     ['Glisser un .mid','Importe le fichier MIDI dans un nouveau pattern']]
    .map(r=>'<tr><td><b>'+r[0]+'</b></td><td>'+r[1]+'</td></tr>').join('')+'</table>';
  hb.appendChild(d);
})();

/* ---- Démarrage ---- */
$('#bStop').onclick=()=>stop();
$('#menus').innerHTML='';buildMenus();renderBrowser();
(function(){const s=$('#addChType');s.innerHTML='';Object.keys(TYPE_NAMES).forEach(t=>s.append(new Option(TYPE_NAMES[t],t)));})();
addTbtn('Auto','Automation (F10)',()=>toggleWin('w-auto'));
addTbtn('🎙','Enregistrer le micro → nouveau canal Sampler',toggleMic,'tbMic');
addTbtn('⏺','Enregistrer la sortie audio (tout ce que tu entends)',toggleOutRec,'tbOut');
addTbtn('Tap','Tap tempo : clique en rythme',tapTempo);
renderAll();lastSnap=JSON.stringify(S);
setHint('WebStudio prêt : automation, MIDI, nouveaux instruments et effets chargés.');
