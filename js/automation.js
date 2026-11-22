"use strict";
/* ===== WebStudio – clips d'automation (joués en mode SONG) =====
   S.autos = [{tgt:'ch:ID:vol' | 'ins:K:pan' | 'fx:K:J:param', on:true, pts:[{s:pas, v:0..1}]}] */
let autoQ=[];
const AU_H=70;
if(!Array.isArray(S.autos))S.autos=[];
const _bpA=baseProject;baseProject=function(){const P=_bpA();P.autos=[];return P;};
const _nA=normalize;normalize=function(P){P=_nA(P);if(!Array.isArray(P.autos))P.autos=[];return P;};

function autoTargets(){
  const L=[];
  S.channels.forEach(c=>{
    L.push(['ch:'+c.id+':vol',c.name+' – Volume'],['ch:'+c.id+':pan',c.name+' – Pan'],['ch:'+c.id+':pitch',c.name+' – Hauteur']);
    if(c.synth)L.push(['ch:'+c.id+':cutoff',c.name+' – Cutoff'],['ch:'+c.id+':res',c.name+' – Résonance']);
  });
  S.inserts.forEach((ins,k)=>{
    const nm=k?k+'. '+ins.name:'Master';
    L.push(['ins:'+k+':vol',nm+' – Volume'],['ins:'+k+':pan',nm+' – Pan']);
    ins.fx.forEach((f,j)=>{if(f&&FX[f.type])FX[f.type].params.forEach(pp=>L.push(['fx:'+k+':'+j+':'+pp[0],nm+' – '+FX[f.type].name+' – '+pp[3]]));});
  });
  return L;
}
function autoRange(tgt){
  const p=tgt.split(':');
  if(p[0]==='ch')return{vol:[0,1],pan:[-1,1],cutoff:[60,16000,1],res:[.1,20],pitch:[-24,24]}[p[2]]||null;
  if(p[0]==='ins')return{vol:[0,1.25],pan:[-1,1]}[p[2]]||null;
  if(p[0]==='fx'){const f=S.inserts[p[1]]&&S.inserts[p[1]].fx[p[2]];if(!f||!FX[f.type])return null;
    const pp=FX[f.type].params.find(x=>x[0]===p[3]);return pp?[pp[1],pp[2],pp[5]?1:0]:null;}
  return null;
}
const autoMap=(r,v)=>r[2]?r[0]*Math.pow(r[1]/r[0],v):r[0]+(r[1]-r[0])*v;
const autoUnmap=(r,x)=>clamp(r[2]?Math.log(x/r[0])/Math.log(r[1]/r[0]):(x-r[0])/(r[1]-r[0]),0,1);
function autoVal(a,g){
  const P=a.pts;if(!P.length)return null;if(g<=P[0].s)return P[0].v;
  for(let k=1;k<P.length;k++)if(g<=P[k].s){const A=P[k-1],B=P[k];return B.s===A.s?B.v:A.v+(B.v-A.v)*(g-A.s)/(B.s-A.s);}
  return P[P.length-1].v;
}
function autoGet(tgt){
  const p=tgt.split(':');
  if(p[0]==='ch'){const c=S.channels.find(c=>c.id==p[1]);if(!c)return null;
    if(p[2]==='vol'||p[2]==='pan'||p[2]==='pitch')return c[p[2]];return c.synth?c.synth[p[2]]:null;}
  if(p[0]==='ins'){const i=S.inserts[p[1]];return i?i[p[2]]:null;}
  if(p[0]==='fx'){const f=S.inserts[p[1]]&&S.inserts[p[1]].fx[p[2]];return f?f.p[p[3]]:null;}
  return null;
}
function fmtAuto(tgt,x){
  const p=tgt.split(':');
  if(p[0]==='fx'){const f=S.inserts[p[1]]&&S.inserts[p[1]].fx[p[2]],pp=f&&FX[f.type]&&FX[f.type].params.find(q=>q[0]===p[3]);return pp&&pp[4]?pp[4](x):x.toFixed(2);}
  const F={vol:fmtPct,pan:fmtPan,cutoff:fmtHz,res:v=>v.toFixed(1),pitch:fmtSt}[p[2]];
  return F?F(x):x.toFixed(2);
}
/* Appelée par le séquenceur à chaque pas en mode SONG (lecture et export) */
function autoApply(EE,g,t){
  if(!S.autos||!S.autos.length)return;
  const anySolo=S.channels.some(c=>c.solo);let fxActs=null;
  S.autos.forEach(a=>{
    if(a.on===false)return;const v=autoVal(a,g);if(v==null)return;const r=autoRange(a.tgt);if(!r)return;
    const x=autoMap(r,v),p=a.tgt.split(':');
    if(p[0]==='ch'){
      const i=S.channels.findIndex(c=>c.id==p[1]);if(i<0)return;const c=S.channels[i],n=EE.ch[i];
      if(p[2]==='vol'){if(n)n.g.gain.setValueAtTime((!c.mute&&(!anySolo||c.solo))?x:0,t);}
      else if(p[2]==='pan'){if(n)n.p.pan.setValueAtTime(x,t);}
      else{EE.ov=EE.ov||{};(EE.ov[c.id]=EE.ov[c.id]||{})[p[2]]=p[2]==='pitch'?Math.round(x):x;}
    }else if(p[0]==='ins'){
      const n=EE.ins[p[1]],ins=S.inserts[p[1]];if(!n||!ins)return;
      if(p[2]==='vol')n.fader.gain.setValueAtTime(ins.mute?0:x,t);else n.pan.pan.setValueAtTime(x,t);
    }else if(p[0]==='fx'){
      const u=EE.ins[p[1]]&&EE.ins[p[1]].fx[p[2]],f=S.inserts[p[1]]&&S.inserts[p[1]].fx[p[2]];if(!u||!f)return;
      fxActs=fxActs||{};const key=p[1]+':'+p[2];(fxActs[key]=fxActs[key]||{u,p:Object.assign({},f.p)}).p[p[3]]=x;
    }
  });
  if(fxActs){
    const run=()=>Object.values(fxActs).forEach(o=>o.u.set(o.p));
    if(typeof OfflineAudioContext!=='undefined'&&EE.ac instanceof OfflineAudioContext){
      try{EE.ac.suspend(t).then(()=>{run();EE.ac.resume();}).catch(()=>{});}catch(e){}
    }else autoQ.push({t,run});
  }
}
function autoChOverride(EE,ch){
  const o=EE.ov&&EE.ov[ch.id];if(!o)return ch;
  const c=Object.assign({},ch);if(o.pitch!=null)c.pitch=o.pitch;
  if(ch.synth){c.synth=Object.assign({},ch.synth);if(o.cutoff!=null)c.synth.cutoff=o.cutoff;if(o.res!=null)c.synth.res=o.res;}
  return c;
}
function autoReset(){
  autoQ=[];if(!E)return;E.ov={};
  E.ch.forEach(n=>{n.g.gain.cancelScheduledValues(0);n.p.pan.cancelScheduledValues(0);});
  E.ins.forEach(x=>{x.fader.gain.cancelScheduledValues(0);x.pan.pan.cancelScheduledValues(0);});
  applyParams(E);
}
const _stopA=stop;stop=function(){_stopA();autoReset();};
const _tmA=toggleMode;toggleMode=function(){_tmA();if(S.mode!=='song')autoReset();};

/* ---- Fenêtre Automation ---- */
function fillAutoTargets(s){
  const v=s.value;s.innerHTML='';s.append(new Option('— Paramètre à automatiser —',''));
  autoTargets().forEach(([k,l])=>s.append(new Option(l,k)));s.value=v;
}
function addAuto(tgt){
  if(!tgt){setHint("Choisis d'abord un paramètre dans la liste.");return;}
  const r=autoRange(tgt),cur=autoGet(tgt),v=(cur!=null&&r)?autoUnmap(r,cur):.5;
  S.autos.push({tgt,on:true,pts:[{s:0,v}]});renderAuto();commit();toggleWin('w-auto',true);
  setHint('Automation créée : clique dans la courbe pour ajouter des points (mode SONG pour l\'entendre).');
}
function renderAuto(){
  const box=$('#auLanes');if(!box)return;box.innerHTML='';
  const T=Object.fromEntries(autoTargets());
  if(!S.autos.length)box.appendChild(el('div','lab au-empty',"Aucune automation. Choisis un paramètre en haut puis « + Ajouter ». Clic : ajouter un point · glisser : déplacer · clic droit : supprimer. Les automations sont jouées en mode SONG."));
  S.autos.forEach((a,ai)=>{
    const row=el('div','aurow'),th=el('div','auth'),led=el('div','led'+(a.on!==false?' on':''));
    led.onclick=()=>{a.on=a.on===false;renderAuto();commit();};led.dataset.hint='Activer / désactiver cette automation';
    const nm=el('span','aunm',T[a.tgt]||'(cible supprimée)');nm.title=nm.textContent;
    const del=el('span','audel','✕');del.dataset.hint='Supprimer cette automation';del.onclick=()=>{S.autos.splice(ai,1);renderAuto();commit();};
    th.append(led,nm,del);
    const cv=el('canvas','aucv');cv.width=NBARS*BARW;cv.height=AU_H;row.append(th,cv);box.appendChild(row);
    drawAuto(cv,a);bindAuto(cv,a);
  });
  $('#auInner').style.width=(110+NBARS*BARW)+'px';
}
function drawAuto(cv,a){
  const c=cv.getContext('2d'),W=cv.width,H=cv.height;
  c.fillStyle='#2f353a';c.fillRect(0,0,W,H);
  c.fillStyle='rgba(255,155,47,.07)';c.fillRect(0,0,songLenSteps()/16*BARW,H);
  for(let b=0;b<NBARS;b++){c.fillStyle=b%4?'#3a4147':'#535c63';c.fillRect(b*BARW,0,1,H);}
  if(!a.pts.length)return;
  const X=s=>s/16*BARW,Y=v=>H-4-v*(H-8),off=a.on===false;
  c.strokeStyle=off?'#777':'#ff9b2f';c.fillStyle=off?'rgba(120,120,120,.2)':'rgba(255,155,47,.2)';c.lineWidth=2;
  c.beginPath();c.moveTo(0,Y(a.pts[0].v));a.pts.forEach(p=>c.lineTo(X(p.s),Y(p.v)));c.lineTo(W,Y(a.pts[a.pts.length-1].v));c.stroke();
  c.lineTo(W,H);c.lineTo(0,H);c.closePath();c.fill();
  c.fillStyle='#fff';a.pts.forEach(p=>{c.beginPath();c.arc(X(p.s),Y(p.v),4,0,7);c.fill();});
}
function bindAuto(cv,a){
  cv.oncontextmenu=e=>e.preventDefault();
  cv.onmousedown=e=>{
    e.preventDefault();const H=cv.height;
    const pos=ev=>{const r=cv.getBoundingClientRect();return{s:clamp(Math.round((ev.clientX-r.left)/BARW*16),0,NBARS*16),v:clamp(1-(ev.clientY-r.top-4)/(H-8),0,1),x:ev.clientX-r.left,y:ev.clientY-r.top};};
    const p0=pos(e);let hit=a.pts.find(p=>Math.abs(p.s/16*BARW-p0.x)<7&&Math.abs(H-4-p.v*(H-8)-p0.y)<7);
    if(e.button===2){if(hit&&a.pts.length>1){a.pts.splice(a.pts.indexOf(hit),1);drawAuto(cv,a);commit();}return;}
    if(e.button!==0)return;
    if(!hit){hit={s:p0.s,v:p0.v};a.pts.push(hit);a.pts.sort((x,y)=>x.s-y.s);drawAuto(cv,a);}
    const r=autoRange(a.tgt);
    const show=()=>setHint('Mesure '+(Math.floor(hit.s/16)+1)+' · pas '+(hit.s%16+1)+' → '+(r?fmtAuto(a.tgt,autoMap(r,hit.v)):fmtPct(hit.v)));show();
    const mv=ev=>{const p=pos(ev);hit.s=p.s;hit.v=p.v;a.pts.sort((x,y)=>x.s-y.s);drawAuto(cv,a);show();};
    const up=()=>{document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);commit();};
    document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up);
  };
}
(function initAuto(){
  const tsel=el('select');tsel.className='autsel';tsel.dataset.hint='Paramètre à automatiser';tsel.onfocus=()=>fillAutoTargets(tsel);fillAutoTargets(tsel);
  const w=makeWin('w-auto','Automation',[tsel,btn('+ Ajouter',()=>addAuto(tsel.value),"Crée une courbe d'automation pour ce paramètre")]);
  w.wb.innerHTML='<div id="auScroll"><div id="auInner"><div id="auLanes"></div><div id="auHead"></div></div></div>';
  const W=$('#ws').clientWidth,H=$('#ws').clientHeight;
  place('w-auto',40,Math.round(H*.3),Math.max(320,Math.min(W-80,980)),Math.max(200,Math.round(H*.4)));
  renderAuto();
})();
const _raA=renderAll;renderAll=function(){_raA();renderAuto();};
const _lwA=layoutWins;layoutWins=function(){_lwA();const W=$('#ws').clientWidth,H=$('#ws').clientHeight;
  place('w-auto',40,Math.round(H*.3),Math.max(320,Math.min(W-80,980)),Math.max(200,Math.round(H*.4)));toggleWin('w-auto',false);};
(function autoLoop(){
  requestAnimationFrame(autoLoop);
  if(ac)while(autoQ.length&&autoQ[0].t<=ac.currentTime)autoQ.shift().run();
  const ph=$('#plHead'),ah=$('#auHead');if(ah&&ph){ah.style.display=ph.style.display;ah.style.left=ph.style.left;}
})();
