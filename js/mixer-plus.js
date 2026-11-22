"use strict";
/* ===== WebStudio – mixer étendu : nouveaux effets, préréglages de chaîne, menus clic droit façon FL Studio ===== */

/* ---------- utilitaires ---------- */
const mpDb=d=>Math.pow(10,d/20);
const mpBq=(ac,type,f,q)=>{const x=ac.createBiquadFilter();x.type=type;x.frequency.value=f;if(q!=null)x.Q.value=q;return x;};
const mpCurves={};
function mpSoftCurve(k){const key='s'+k.toFixed(2);if(mpCurves[key])return mpCurves[key];
  const n=2048,c=new Float32Array(n),t=Math.tanh(k);for(let i=0;i<n;i++){const x=i*2/(n-1)-1;c[i]=Math.tanh(k*x)/t;}return mpCurves[key]=c;}
function mpRectCurve(){if(!mpCurves.rect){const n=1025,c=new Float32Array(n);for(let i=0;i<n;i++)c[i]=Math.abs(i*2/(n-1)-1);mpCurves.rect=c;}return mpCurves.rect;}
const mpIRs=new Map();
function mpHallIR(ac,size){
  const s=Math.round(size*10)/10,key=ac.sampleRate+':'+s;if(mpIRs.has(key))return mpIRs.get(key);
  if(mpIRs.size>24)mpIRs.clear();
  const sr=ac.sampleRate,len=Math.max(1,Math.floor(sr*s)),b=ac.createBuffer(2,len,sr),fade=sr*.004;
  for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.exp(-6.9*i/len)*(i<fade?i/fade:1);}
  mpIRs.set(key,b);return b;
}
const mpSync=(E,u)=>{(E.sync||(E.sync=[])).push(u);return u;};
const MP_GATES=[['1/16','x.'],['1/8','xx..'],['1/4','xxxx....'],['Pointé','x.xx.xx.x.xx.xx.'],['Trance','xx.xx.x.xx.xx.x.'],['Haché','x.x.xxx.x.x.x.xx']];
const MP_DIVS=[['1 temps',4],['2 temps',8],['1/2 temps',2],['1 mesure',16]];
const MP_EQF=[60,150,400,1000,2500,6000,14000];
const onOff=(a,b)=>v=>v>=.5?b:a;

/* ---------- nouveaux effets ---------- */
Object.assign(FX,{
  softclip:{name:'Soft Clipper',def:{drive:.3,ceil:-.3},
    params:[['drive',0,1,'Drive',fmtPct],['ceil',-12,0,'Plafond',fmtDb]],
    make(E){const ac=E.ac,ws=ac.createWaveShaper(),o=ac.createGain();ws.oversample='4x';ws.connect(o);
      return{in:ws,out:o,nodes:[ws,o],set(p){ws.curve=mpSoftCurve(.5+p.drive*6);o.gain.value=mpDb(p.ceil);}};}},
  maximus:{name:'Maximus (multibande)',def:{xlo:200,xhi:3000,thr:-20,ratio:3,lo:0,mid:0,hi:0,out:0},
    params:[['xlo',60,600,'Coupure basse',fmtHz,true],['xhi',1500,10000,'Coupure haute',fmtHz,true],['thr',-48,0,'Seuil',v=>v.toFixed(0)+' dB'],
      ['ratio',1,20,'Ratio',v=>v.toFixed(1)+':1'],['lo',-12,12,'Graves',fmtDb],['mid',-12,12,'Médiums',fmtDb],['hi',-12,12,'Aigus',fmtDb],['out',-12,12,'Sortie',fmtDb]],
    make(E){const ac=E.ac,i=ac.createGain(),o=ac.createGain();
      const l1=mpBq(ac,'lowpass',200,.707),l2=mpBq(ac,'lowpass',200,.707),m1=mpBq(ac,'highpass',200,.707),m2=mpBq(ac,'highpass',200,.707),
 m3=mpBq(ac,'lowpass',3000,.707),m4=mpBq(ac,'lowpass',3000,.707),h1=mpBq(ac,'highpass',3000,.707),h2=mpBq(ac,'highpass',3000,.707);
      const C=[0,1,2].map(()=>ac.createDynamicsCompressor()),G=[0,1,2].map(()=>ac.createGain());
      i.connect(l1);l1.connect(l2);l2.connect(C[0]);
      i.connect(m1);m1.connect(m2);m2.connect(m3);m3.connect(m4);m4.connect(C[1]);
      i.connect(h1);h1.connect(h2);h2.connect(C[2]);
      C.forEach((c,k)=>{c.connect(G[k]);G[k].connect(o);c.knee.value=6;c.attack.value=[.012,.006,.003][k];c.release.value=[.25,.15,.1][k];});
      return{in:i,out:o,nodes:[i,o,l1,l2,m1,m2,m3,m4,h1,h2,...C,...G],set(p){
 [l1,l2,m1,m2].forEach(f=>f.frequency.value=p.xlo);[m3,m4,h1,h2].forEach(f=>f.frequency.value=Math.max(p.xhi,p.xlo*2));
        C.forEach(c=>{c.threshold.value=p.thr;c.ratio.value=p.ratio;});
        const mk=mpDb(-p.thr*(1-1/p.ratio)*.25);G[0].gain.value=mpDb(p.lo)*mk;G[1].gain.value=mpDb(p.mid)*mk;G[2].gain.value=mpDb(p.hi)*mk;o.gain.value=mpDb(p.out);}};}},
  eq7:{name:'EQ paramétrique 7 bandes',def:{g0:0,g1:0,g2:0,g3:0,g4:0,g5:0,g6:0},
    params:MP_EQF.map((f,k)=>['g'+k,-15,15,fmtHz(f),fmtDb]),
    make(E){const ac=E.ac,B=MP_EQF.map((f,k)=>mpBq(ac,k===0?'lowshelf':k===6?'highshelf':'peaking',f,1.1));
      for(let k=0;k<6;k++)B[k].connect(B[k+1]);
      return{in:B[0],out:B[6],nodes:B,set(p){B.forEach((b,k)=>b.gain.value=p['g'+k]);}};}},
  exciter:{name:'Exciteur (brillance)',def:{freq:3500,drive:.5,amt:.3},
    params:[['freq',1000,12000,'Fréquence',fmtHz,true],['drive',0,1,'Drive',fmtPct],['amt',0,1,'Quantité',fmtPct]],
    make(E){const ac=E.ac,i=ac.createGain(),o=ac.createGain(),h1=mpBq(ac,'highpass',3500,.707),h2=mpBq(ac,'highpass',3500,.707),ws=ac.createWaveShaper(),w=ac.createGain();
      i.connect(o);i.connect(h1);h1.connect(h2);h2.connect(ws);ws.connect(w);w.connect(o);
      return{in:i,out:o,nodes:[i,o,h1,h2,ws,w],set(p){h1.frequency.value=h2.frequency.value=p.freq;ws.curve=distCurve(1+p.drive*50);w.gain.value=p.amt*.6;}};}},
  bassboost:{name:'Bass Boost (sub)',def:{freq:80,boost:6,punch:.3},
    params:[['freq',30,250,'Fréquence',fmtHz,true],['boost',0,15,'Boost',fmtDb],['punch',0,1,'Saturation',fmtPct]],
    make(E){const ac=E.ac,i=ac.createGain(),o=ac.createGain(),ls=mpBq(ac,'lowshelf',80),lp=mpBq(ac,'lowpass',120,.707),ws=ac.createWaveShaper(),w=ac.createGain();
      ws.curve=distCurve(20);i.connect(ls);ls.connect(o);i.connect(lp);lp.connect(ws);ws.connect(w);w.connect(o);
      return{in:i,out:o,nodes:[i,o,ls,lp,ws,w],set(p){ls.frequency.value=p.freq;ls.gain.value=p.boost;lp.frequency.value=p.freq*1.5;w.gain.value=p.punch*.5;}};}},
  lofi:{name:'Lo-Fi',def:{low:250,high:4000,bits:10,mix:1},
    params:[['low',20,2000,'Coupe-bas',fmtHz,true],['high',1000,20000,'Coupe-haut',fmtHz,true],['bits',2,16,'Bits',v=>Math.round(v)+' bits'],['mix',0,1,'Mix',fmtPct]],
    make(E){const ac=E.ac,i=ac.createGain(),o=ac.createGain(),dry=ac.createGain(),w=ac.createGain(),hp=mpBq(ac,'highpass',250,.707),lp=mpBq(ac,'lowpass',4000,.707),ws=ac.createWaveShaper();
      i.connect(dry);dry.connect(o);i.connect(hp);hp.connect(lp);lp.connect(ws);ws.connect(w);w.connect(o);let cur=-1;
      return{in:i,out:o,nodes:[i,o,dry,w,hp,lp,ws],set(p){hp.frequency.value=p.low;lp.frequency.value=p.high;const b=Math.round(p.bits);if(b!==cur){cur=b;ws.curve=crushCurve(b);}w.gain.value=p.mix;dry.gain.value=1-p.mix;}};}},
  autowah:{name:'Auto-wah',def:{base:300,sens:.6,q:6,mix:1},
    params:[['base',80,2000,'Fréquence',fmtHz,true],['sens',0,1,'Sensibilité',fmtPct],['q',.5,20,'Résonance',v=>v.toFixed(1)],['mix',0,1,'Mix',fmtPct]],
    make(E){const ac=E.ac,i=ac.createGain(),o=ac.createGain(),dry=ac.createGain(),w=ac.createGain(),f=mpBq(ac,'lowpass',300,6),rect=ac.createWaveShaper(),env=mpBq(ac,'lowpass',8,.5),eg=ac.createGain();
      rect.curve=mpRectCurve();i.connect(dry);dry.connect(o);i.connect(f);f.connect(w);w.connect(o);i.connect(rect);rect.connect(env);env.connect(eg);eg.connect(f.frequency);
      return{in:i,out:o,nodes:[i,o,dry,w,f,rect,env,eg],set(p){f.frequency.value=p.base;f.Q.value=p.q;eg.gain.value=p.sens*6000;w.gain.value=p.mix;dry.gain.value=1-p.mix;}};}},
  ringmod:{name:'Ring Modulator',def:{freq:220,mix:.5},
    params:[['freq',20,3000,'Fréquence',fmtHz,true],['mix',0,1,'Mix',fmtPct]],
    make(E){const ac=E.ac,i=ac.createGain(),o=ac.createGain(),dry=ac.createGain(),rm=ac.createGain(),w=ac.createGain(),osc=ac.createOscillator();
      rm.gain.value=0;osc.connect(rm.gain);osc.start();i.connect(dry);dry.connect(o);i.connect(rm);rm.connect(w);w.connect(o);
      return{in:i,out:o,nodes:[i,o,dry,rm,w,osc],set(p){osc.frequency.value=p.freq;w.gain.value=p.mix;dry.gain.value=1-p.mix;}};}},
  trancegate:{name:'Trance Gate (synchro tempo)',def:{pat:0,depth:1,smooth:.004},
    params:[['pat',0,MP_GATES.length-1,'Motif',v=>MP_GATES[Math.round(v)][0]],['depth',0,1,'Profondeur',fmtPct],['smooth',.001,.03,'Lissage',fmtMs,true]],
    make(E){const g=E.ac.createGain();let P={pat:0,depth:1,smooth:.004};
      return mpSync(E,{in:g,out:g,nodes:[g],set(p){P=p;},
        tick(st,t){const s=MP_GATES[clamp(Math.round(P.pat),0,MP_GATES.length-1)][1];g.gain.setTargetAtTime(s[st%s.length]==='x'?1:1-P.depth,t,P.smooth);},
        reset(){g.gain.cancelScheduledValues(0);g.gain.value=1;}});}},
  pump:{name:'Sidechain / Pump (synchro tempo)',def:{div:0,depth:.8,rel:.18},
    params:[['div',0,MP_DIVS.length-1,'Cadence',v=>MP_DIVS[Math.round(v)][0]],['depth',0,1,'Profondeur',fmtPct],['rel',.03,.6,'Relâchement',fmtMs,true]],
    make(E){const g=E.ac.createGain();let P={div:0,depth:.8,rel:.18};
      return mpSync(E,{in:g,out:g,nodes:[g],set(p){P=p;},
 tick(st,t){const n=MP_DIVS[clamp(Math.round(P.div),0,MP_DIVS.length-1)][1];if(st%n)return;
          g.gain.cancelScheduledValues(t);g.gain.setTargetAtTime(1-P.depth,t,.003);g.gain.setTargetAtTime(1,t+.012,P.rel/3);},
        reset(){g.gain.cancelScheduledValues(0);g.gain.value=1;}});}},
  pingpong:{name:'Delay ping-pong',def:{time:.75,fb:.45,mix:.3},
    params:[['time',.25,2,'Temps',v=>(Math.round(v*4)/4)+' temps'],['fb',0,.9,'Feedback',fmtPct],['mix',0,1,'Mix',fmtPct]],
    make(E){const ac=E.ac,i=ac.createGain(),o=ac.createGain(),mono=ac.createGain(),dl=ac.createDelay(4),dr=ac.createDelay(4),f1=ac.createGain(),f2=ac.createGain(),mg=ac.createChannelMerger(2),w=ac.createGain();
      mono.channelCount=1;mono.channelCountMode='explicit';
      i.connect(o);i.connect(mono);mono.connect(dl);dl.connect(mg,0,0);dl.connect(f1);f1.connect(dr);dr.connect(mg,0,1);dr.connect(f2);f2.connect(dl);mg.connect(w);w.connect(o);
      return{in:i,out:o,nodes:[i,o,mono,dl,dr,f1,f2,mg,w],set(p){const d=clamp((Math.round(p.time*4)/4)*60/S.bpm,.01,4);dl.delayTime.value=dr.delayTime.value=d;f1.gain.value=Math.sqrt(p.fb);f2.gain.value=Math.sqrt(p.fb);w.gain.value=p.mix;}};}},
  hall:{name:'Reverb Hall (taille réglable)',def:{size:3,pre:.02,damp:7000,mix:.35},
    params:[['size',.5,8,'Taille',v=>v.toFixed(1)+' s',true],['pre',0,.25,'Pré-délai',fmtMs],['damp',1000,18000,'Amorti',fmtHz,true],['mix',0,1,'Mix',fmtPct]],
    make(E){const ac=E.ac,i=ac.createGain(),o=ac.createGain(),pd=ac.createDelay(.5),cv=ac.createConvolver(),lp=mpBq(ac,'lowpass',7000,.5),w=ac.createGain();let cur=-1;
      i.connect(o);i.connect(pd);pd.connect(cv);cv.connect(lp);lp.connect(w);w.connect(o);
      return{in:i,out:o,nodes:[i,o,pd,cv,lp,w],set(p){const s=Math.round(p.size*10)/10;if(s!==cur){cur=s;cv.buffer=mpHallIR(ac,s);}pd.delayTime.value=p.pre;lp.frequency.value=p.damp;w.gain.value=p.mix;}};}},
  utility:{name:'Utilitaire (gain, pan, mono, phase)',def:{gain:0,pan:0,mono:0,phase:0},
    params:[['gain',-24,24,'Gain',fmtDb],['pan',-1,1,'Pan',fmtPan],['mono',0,1,'Mono',onOff('Stéréo','Mono')],['phase',0,1,'Phase',onOff('Normale','Inversée')]],
    make(E){const ac=E.ac,i=ac.createGain(),st=ac.createGain(),mn=ac.createGain(),pn=ac.createStereoPanner();
      mn.channelCount=1;mn.channelCountMode='explicit';i.connect(st);st.connect(pn);i.connect(mn);mn.connect(pn);
      return{in:i,out:pn,nodes:[i,st,mn,pn],set(p){i.gain.value=mpDb(p.gain)*(p.phase>=.5?-1:1);const m=p.mono>=.5;st.gain.value=m?0:1;mn.gain.value=m?1:0;pn.pan.value=p.pan;}};}}
});

/* Catégories (menus et listes d'effets) */
const FX_CATS=[['Dynamique',['comp','limiter','maximus','softclip','pump']],
  ['Égaliseur & filtres',['eq','eq7','filter','bassboost','exciter','lofi','autowah']],
  ['Modulation',['chorus','flanger','phaser','tremolo','autopan','ringmod','trancegate']],
  ['Délai & réverbe',['delay','pingpong','reverb','hall']],
  ['Distorsion',['dist','crush']],
  ['Stéréo & utilitaires',['stereo','utility']]];
function fxCats(){const seen=new Set(),out=FX_CATS.map(([c,ks])=>[c,ks.filter(k=>FX[k]&&!seen.has(k)&&seen.add(k))]);
  const rest=Object.keys(FX).filter(k=>!seen.has(k));if(rest.length)out.push(['Autres',rest]);return out.filter(c=>c[1].length);}

/* Préréglages de chaîne d'effets */
const FX_CHAINS={
  'Mastering doux':[['eq7',{g0:1,g1:.5,g3:-.5,g5:1,g6:1.5}],['maximus',{thr:-18,ratio:2.5}],['stereo',{width:1.15}],['limiter',{thr:-3,gain:1.25}],['softclip',{drive:.15,ceil:-.5}]],
  'Master fort (club)':[['bassboost',{freq:70,boost:4,punch:.25}],['maximus',{thr:-26,ratio:4,lo:1,hi:1.5}],['exciter',{freq:4000,drive:.4,amt:.2}],['stereo',{width:1.25}],['limiter',{thr:-6,gain:1.8}],['softclip',{drive:.45,ceil:-1.5}]],
  'Master transparent':[['eq',{low:1,high:1}],['comp',{thr:-12,ratio:2,gain:1.15}],['limiter',{thr:-2,gain:1.1}],['softclip',{drive:0,ceil:-.3}]],
  'Lo-fi / chill':[['lofi',{low:120,high:6000,bits:10,mix:.6}],['chorus',{rate:.4,depth:.3,mix:.25}],['hall',{size:2.5,mix:.25}],['comp',{thr:-20,ratio:3,gain:1.3}]],
  'Voix':[['filter',{type:1,freq:90,q:.7}],['comp',{thr:-22,ratio:4,gain:1.5}],['eq7',{g1:-2,g4:2,g6:2}],['pingpong',{time:.75,fb:.3,mix:.15}],['hall',{size:1.8,mix:.2}]],
  'Batterie punchy':[['eq',{low:3,mid:-2,high:2}],['comp',{thr:-20,ratio:5,gain:1.6}],['softclip',{drive:.35,ceil:-1}]],
  'Sidechain EDM (basse / pad)':[['pump',{div:0,depth:.85,rel:.2}],['eq',{low:2,high:1}]],
  'Ambiance (grosse réverbe)':[['chorus',{rate:.3,depth:.4,mix:.3}],['hall',{size:6,pre:.05,mix:.5}]],
  'Trance gate':[['trancegate',{pat:4,depth:1}],['pingpong',{time:.5,fb:.35,mix:.25}]]
};
function applyChain(si,name){
  const ins=S.inserts[si],L=FX_CHAINS[name];if(!ins||!L)return;
  ins.fx=Array(NFX).fill(null);
  L.forEach(([t,o],j)=>{if(FX[t])ins.fx[j]={type:t,on:true,p:Object.assign(clone(FX[t].def),o)};});
  S.selIns=si;fxChanged();setHint('Préréglage « '+name+' » chargé sur '+(si?'l\'insert '+si:'le Master'));
}

/* Synchro tempo (trance gate, pump) : appelés à chaque pas du séquenceur */
const _ssMP=scheduleStep;
scheduleStep=function(EE,g,t,sd,mode){_ssMP(EE,g,t,sd,mode);if(EE&&EE.sync)EE.sync.forEach(u=>{try{u.tick(g,t,sd);}catch(e){}});};
const _stopMP=stop;
stop=function(){_stopMP();if(E&&E.sync)E.sync.forEach(u=>{try{u.reset();}catch(e){}});};

/* ---------- dialogues intégrés (remplacent prompt/confirm, parfois bloqués) ---------- */
function mpDialog(title,text,withInput,val){
  return new Promise(res=>{
    const bg=el('div','wsdlg-bg'),d=el('div','wsdlg');d.appendChild(el('div','wsdlg-t',title));
    if(text)d.appendChild(el('div','wsdlg-p',text));
    let inp=null;if(withInput){inp=el('input','txt');inp.value=val==null?'':val;d.appendChild(inp);}
    const bs=el('div','btns'),ok=el('button','fxbtn','OK'),no=el('button','fxbtn','Annuler');bs.append(ok,no);d.appendChild(bs);
    const done=v=>{bg.remove();document.removeEventListener('keydown',kd,true);res(v);};
    const kd=e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();done(inp?inp.value:true);}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();done(inp?null:false);}else e.stopPropagation();};
    ok.onclick=()=>done(inp?inp.value:true);no.onclick=()=>done(inp?null:false);
    bg.onmousedown=e=>{if(e.target===bg)done(inp?null:false);};
    document.addEventListener('keydown',kd,true);
    bg.appendChild(d);document.body.appendChild(bg);if(inp){inp.focus();inp.select();}else ok.focus();
  });
}
const wsAsk=(title,val,text)=>mpDialog(title,text,true,val);
const wsConfirm=(title,text)=>mpDialog(title,text,false);

/* ---------- menu contextuel générique ---------- */
let ctxStack=[];
function ctxClose(level){level=level||0;while(ctxStack.length>level)ctxStack.pop().remove();}
function ctxMenu(x,y,items,level,flipX){
  level=level||0;ctxClose(level);
  const m=el('div','ctxm');m.oncontextmenu=e=>e.preventDefault();
  items.forEach(it=>{
    if(!it)return;
    if(it.sep){m.appendChild(el('div','ctxsep'));return;}
    if(it.head!=null){m.appendChild(el('div','ctxhead',it.head));return;}
    const r=el('div','ctxi'+(it.disabled?' dis':'')+(it.sub?' hassub':''));
    r.append(el('span','ctxck',it.check?'✓':''),el('span','ctxl',it.label),el('span','ctxk',it.sub?'▸':(it.key||'')));
    const openSub=()=>{ctxClose(level+1);if(!it.sub||it.disabled)return;const b=r.getBoundingClientRect();
      ctxMenu(b.right-2,b.top-4,typeof it.sub==='function'?it.sub():it.sub,level+1,b.left+2);};
    r.onmouseenter=openSub;
    r.onclick=e=>{e.stopPropagation();if(it.disabled)return;if(it.sub){openSub();return;}ctxClose(0);if(it.act)it.act();};
    m.appendChild(r);
  });
  m.style.left='0px';m.style.top='0px';document.body.appendChild(m);
  const w=m.offsetWidth,h=m.offsetHeight,W=innerWidth,H=innerHeight;
  if(x+w>W-2)x=flipX!=null?Math.max(2,flipX-w):Math.max(2,W-w-2);
  if(y+h>H-2)y=Math.max(2,H-h-2);
  m.style.left=x+'px';m.style.top=y+'px';m.style.zIndex=100000+level;
  ctxStack.push(m);return m;
}
function mpMenuAt(btn,items){const b=btn.getBoundingClientRect();ctxMenu(b.left,b.bottom+2,items);}
document.addEventListener('mousedown',e=>{if(ctxStack.length&&!(e.target.closest&&e.target.closest('.ctxm')))ctxClose(0);},true);
document.addEventListener('keydown',e=>{if(ctxStack.length&&e.key==='Escape'){e.preventDefault();e.stopPropagation();ctxClose(0);}},true);
document.addEventListener('wheel',e=>{if(ctxStack.length&&!(e.target.closest&&e.target.closest('.ctxm')))ctxClose(0);},true);
window.addEventListener('blur',()=>ctxClose(0));
window.addEventListener('resize',()=>ctxClose(0));

/* ---------- knob : même comportement + accès externe (menu clic droit) ---------- */
let knobClip=null;
knob=function(val,min,max,def,on,hint,fmt,log){
  const k=el('div','knob');
  const toPos=v=>log?Math.log(Math.max(v,min*1e-6)/min)/Math.log(max/min):(v-min)/(max-min);
  const toVal=p=>log?min*Math.pow(max/min,p):min+(max-min)*p;
  let pos=clamp(toPos(val),0,1);
  const show=()=>k.style.setProperty('--r',(-135+270*pos)+'deg');show();
  const fv=v=>fmt?fmt(v):(+v).toFixed(2);
  const label=()=>hint+' : '+fv(toVal(pos));
  const upd=p=>{pos=clamp(p,0,1);show();on(toVal(pos));setHint(label());};
  k.onmousedown=e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();const y0=e.clientY,p0=pos;
    const mv=ev=>upd(p0+(y0-ev.clientY)/(ev.shiftKey?600:150));
    const up=()=>{document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);commit();};
    document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up);setHint(label());};
  k.ondblclick=()=>{upd(toPos(def));commit();};
  k.onwheel=e=>{e.preventDefault();upd(pos-Math.sign(e.deltaY)*.03);commitSoon();};
  k.onmouseenter=()=>setHint(label());
  k._ws={hint,min,max,def,fv,get:()=>toVal(pos),set:v=>{upd(toPos(clamp(v,min,max)));commit();}};
  return k;
};
function knobItems(k){
  const K=k._ws,cur=K.get();
  return[{head:K.hint+' : '+K.fv(cur)},
    {label:'Réinitialiser',key:K.fv(K.def),act:()=>K.set(K.def)},
    {label:'Saisir une valeur…',act:()=>{
      const pct=K.fv(1)==='100%';
      wsAsk(K.hint,pct?String(Math.round(cur*1000)/10):String(+cur.toFixed(4)),'Entre '+K.fv(K.min)+' et '+K.fv(K.max)+(pct?' (en %)':'')).then(s=>{
 if(s==null)return;let v=parseFloat(String(s).replace(',','.'));if(isNaN(v))return;if(pct)v/=100;K.set(v);});}},
    {sep:1},
    {label:'Minimum',key:K.fv(K.min),act:()=>K.set(K.min)},
    {label:'Maximum',key:K.fv(K.max),act:()=>K.set(K.max)},
    {sep:1},
    {label:'Copier la valeur',act:()=>{knobClip=cur;setHint('Valeur copiée : '+K.fv(cur));}},
    {label:'Coller la valeur',disabled:knobClip==null,act:()=>K.set(knobClip)}];
}

/* ---------- actions mixer ---------- */
let fxClip=null,chainClip=null,insSolo=0,insSoloPrev=null;
function fxChanged(){rebuild();renderMixer();commit();}
function addFxTo(si,k){const ins=S.inserts[si],j=ins.fx.findIndex(f=>!f);
  if(j<0){setHint('Les '+NFX+' slots de cet insert sont pleins');return;}
  ins.fx[j]={type:k,on:true,p:clone(FX[k].def)};S.selIns=si;fxChanged();toggleWin('w-mix',true);setHint(FX[k].name+' ajouté dans le slot '+(j+1));}
addFxToSel=function(k){addFxTo(S.selIns,k);};
function soloIns(i){
  if(insSolo===i){if(insSoloPrev)S.inserts.forEach((x,k)=>{x.mute=!!insSoloPrev[k];});insSolo=0;insSoloPrev=null;}
  else{if(!insSolo)insSoloPrev=S.inserts.map(x=>x.mute);S.inserts.forEach((x,k)=>{if(k)x.mute=k!==i;});insSolo=i;}
  applyParams(E);renderMixer();commit();
}
function fxTypeItems(cb,cur){return fxCats().map(([c,ks])=>({label:c,sub:()=>ks.map(k=>({label:FX[k].name,check:k===cur,act:()=>cb(k)}))}));}
function mpChainItems(si){
  return Object.keys(FX_CHAINS).map(n=>({label:n,act:()=>{
    const ins=S.inserts[si];if(!ins.fx.some(Boolean)){applyChain(si,n);return;}
    wsConfirm('Préréglage « '+n+' »','Remplacer les effets actuels de « '+ins.name+' » ?').then(ok=>{if(ok)applyChain(si,n);});}}));
}
function mpStripItems(i){
  const ins=S.inserts[i],ch=S.channels[S.sel],has=ins.fx.some(Boolean),routed=S.channels.filter(c=>c.ins===i);
  return[{head:(i?'Insert '+i+' – ':'')+ins.name},
    {label:'Renommer…',act:()=>wsAsk('Nom de l\'insert',ins.name).then(n=>{if(n){ins.name=n;renderMixer();renderSettings();commit();}})},
    {label:'Couper (mute)',check:ins.mute,act:()=>{ins.mute=!ins.mute;applyParams(E);renderMixer();commit();}},
    i?{label:'Solo',check:insSolo===i,act:()=>soloIns(i)}:null,
    {label:'Volume par défaut',key:'80%',act:()=>{ins.vol=.8;applyParams(E);renderMixer();if(!i)renderToolbar();commit();}},
    {label:'Centrer le panoramique',act:()=>{ins.pan=0;applyParams(E);renderMixer();commit();}},
    {sep:1},
    {label:'Préréglages de chaîne d\'effets',sub:()=>mpChainItems(i)},
    {label:'Ajouter un effet',sub:()=>fxTypeItems(k=>addFxTo(i,k))},
    {label:'Bypasser tous les effets',disabled:!has,check:has&&ins.fx.every(f=>!f||f.on===false),act:()=>{const off=!ins.fx.every(f=>!f||f.on===false);ins.fx.forEach(f=>{if(f)f.on=!off;});fxChanged();}},
    {label:'Copier la chaîne d\'effets',disabled:!has,act:()=>{chainClip=clone(ins.fx);setHint('Chaîne d\'effets copiée');}},
    {label:'Coller la chaîne d\'effets',disabled:!chainClip,act:()=>{ins.fx=clone(chainClip);while(ins.fx.length<NFX)ins.fx.push(null);fxChanged();}},
    {label:'Effacer tous les effets',disabled:!has,act:()=>{ins.fx=Array(NFX).fill(null);fxChanged();}},
    {sep:1},
    ch?{label:'Router « '+ch.name+' » ici',check:ch.ins===i,act:()=>{ch.ins=i;rebuild();renderRack();renderMixer();renderSettings();commit();}}:null,
    {label:'Canaux routés ici ('+routed.length+')',disabled:!routed.length,sub:()=>routed.map(c=>({label:c.name,act:()=>{selectCh(S.channels.indexOf(c));toggleWin('w-set',true);}}))},
    {sep:1},
    {label:'Réinitialiser l\'insert…',act:()=>wsConfirm('Réinitialiser','Remettre « '+ins.name+' » à zéro (volume, pan, mute, effets, envois) ?').then(ok=>{
      if(!ok)return;Object.assign(ins,{vol:.8,pan:0,mute:false,fx:Array(NFX).fill(null)});if(i)ins.sends=[null,null];fxChanged();})}];
}
function mpSlotItems(si,j){
  const ins=S.inserts[si],f=ins.fx[j],def=f&&FX[f.type];
  const swap=d=>{const a=ins.fx[j];ins.fx[j]=ins.fx[j+d];ins.fx[j+d]=a;fxChanged();};
  return[{head:'Slot '+(j+1)+' – '+(def?def.name:'vide')},
    {label:def?'Remplacer par':'Choisir un effet',sub:()=>fxTypeItems(k=>{ins.fx[j]={type:k,on:true,p:clone(FX[k].def)};fxChanged();},f&&f.type)},
    def?{label:'Bypass (désactivé)',check:f.on===false,act:()=>{f.on=f.on===false;fxChanged();}}:null,
    def?{label:'Réinitialiser les paramètres',act:()=>{f.p=clone(def.def);fxChanged();}}:null,
    {sep:1},
    {label:'Monter',key:'▲',disabled:j===0,act:()=>swap(-1)},
    {label:'Descendre',key:'▼',disabled:j>=ins.fx.length-1,act:()=>swap(1)},
    {sep:1},
    {label:'Copier l\'effet',disabled:!f,act:()=>{fxClip=clone(f);setHint('Effet copié : '+def.name);}},
    {label:'Coller l\'effet',disabled:!fxClip,act:()=>{ins.fx[j]=clone(fxClip);fxChanged();}},
    {label:'Vider le slot',disabled:!f,act:()=>{ins.fx[j]=null;fxChanged();}}];
}

/* ---------- actions rack (channel rack) ---------- */
function replaceInstr(i,t){
  const o=S.channels[i];if(!o)return;const c=newChannel(S,t);
  Object.assign(c,{notes:o.notes,ins:o.ins,vol:o.vol,pan:o.pan,mute:o.mute,solo:o.solo});
  if(o.name!==TYPE_NAMES[o.type])c.name=o.name;
  S.channels[i]=c;S.sel=i;rebuild();renderAll();commit();
  if(t==='sampler'){pendingSampleCh=i;$('#fileSmp').click();}
}
function mpChannelItems(i){
  const ch=S.channels[i],len=patLen(S.pat),ns=ch.notes[S.pat]||[];
  const fill=n=>{const a=[];for(let s=0;s<len;s+=n)a.push({s,n:60,l:1,v:.85});ch.notes[S.pat]=a;renderRack();renderPRNotes();commit();};
  const shift=d=>{ns.forEach(n=>n.s=((n.s+d)%len+len)%len);renderRack();renderPRNotes();commit();};
  const move=d=>{const j=i+d;if(j<0||j>=S.channels.length)return;const a=S.channels[i];S.channels[i]=S.channels[j];S.channels[j]=a;S.sel=j;rebuild();renderAll();commit();};
  const setIns=k=>{ch.ins=k;rebuild();renderRack();renderMixer();renderSettings();commit();};
  return[{head:ch.name+' ('+TYPE_NAMES[ch.type]+')'},
    {label:'Renommer…',act:()=>wsAsk('Nom du canal',ch.name).then(n=>{if(n){ch.name=n;renderRack();renderPR();renderSettings();renderFxPanel();commit();}})},
    {label:'Piano roll',act:()=>{selectCh(i);toggleWin('w-pr',true);}},
    {label:'Réglages du canal',act:()=>{selectCh(i);toggleWin('w-set',true);}},
    {sep:1},
    {label:'Remplir chaque 2 pas',act:()=>fill(2)},
    {label:'Remplir chaque 4 pas',act:()=>fill(4)},
    {label:'Remplir chaque 8 pas',act:()=>fill(8)},
    {label:'Décaler les pas à droite',key:'→',disabled:!ns.length,act:()=>shift(1)},
    {label:'Décaler les pas à gauche',key:'←',disabled:!ns.length,act:()=>shift(-1)},
    {label:'Effacer les notes du pattern',disabled:!ns.length,act:()=>{ch.notes[S.pat]=[];renderRack();renderPRNotes();commit();}},
    {sep:1},
    {label:'Insert du mixer',key:ch.ins?String(ch.ins):'M',sub:()=>{
      const L=[{label:'Prochain insert libre',act:()=>{const k=freeIns();if(!k){setHint('Aucun insert libre');return;}if(/^Insert \d+$/.test(S.inserts[k].name))S.inserts[k].name=ch.name;setIns(k);}},{sep:1},
        {label:'Master',check:ch.ins===0,act:()=>setIns(0)}];
      for(let k=1;k<=NINS;k++)L.push({label:k+'. '+S.inserts[k].name,check:ch.ins===k,act:()=>setIns(k)});return L;}},
    {label:'Remplacer l\'instrument',sub:()=>Object.keys(TYPE_NAMES).map(t=>({label:TYPE_NAMES[t],check:ch.type===t,act:()=>{if(t!==ch.type)replaceInstr(i,t);}}))},
    {sep:1},
    {label:'Couper (mute)',check:ch.mute,act:()=>{ch.mute=!ch.mute;applyParams(E);renderRack();commit();}},
    {label:'Solo',check:ch.solo,act:()=>{ch.solo=!ch.solo;applyParams(E);renderRack();commit();}},
    {label:'Monter',key:'▲',disabled:i===0,act:()=>move(-1)},
    {label:'Descendre',key:'▼',disabled:i>=S.channels.length-1,act:()=>move(1)},
    {label:'Dupliquer',act:()=>{S.sel=i;cloneChannel();}},
    {label:'Supprimer…',act:()=>wsConfirm('Supprimer','Supprimer le canal « '+ch.name+' » ?').then(ok=>{
      if(!ok)return;S.channels.splice(i,1);S.sel=clamp(S.sel>i?S.sel-1:S.sel,0,Math.max(0,S.channels.length-1));rebuild();renderAll();commit();})}];
}

/* ---------- playlist et patterns ---------- */
function mpTrackItems(ti){
  const t=S.tracks[ti],n=S.clips.filter(c=>c.t===ti).length;
  const swap=d=>{const j=ti+d;if(j<0||j>=S.tracks.length)return;const a=S.tracks[ti];S.tracks[ti]=S.tracks[j];S.tracks[j]=a;
    S.clips.forEach(c=>{if(c.t===ti)c.t=j;else if(c.t===j)c.t=ti;});renderPL();commit();};
  return[{head:t.name},
    {label:'Renommer…',act:()=>wsAsk('Nom de la piste',t.name).then(v=>{if(v){t.name=v;renderPL();commit();}})},
    {label:'Couper (mute)',check:t.mute,act:()=>{t.mute=!t.mute;renderPL();commit();}},
    {sep:1},
    {label:'Monter',key:'▲',disabled:ti===0,act:()=>swap(-1)},
    {label:'Descendre',key:'▼',disabled:ti>=S.tracks.length-1,act:()=>swap(1)},
    {sep:1},
    {label:'Ajouter « '+S.patterns[S.pat].name+' » à la fin',act:()=>{let e=0;S.clips.forEach(c=>{if(c.t===ti)e=Math.max(e,c.b+Math.ceil(patLen(c.p)/16));});
      if(e>=NBARS){setHint('La piste est pleine');return;}S.clips.push({t:ti,b:e,p:S.pat});renderPL();commit();}},
    {label:'Vider la piste ('+n+' clip'+(n>1?'s':'')+')',disabled:!n,act:()=>{S.clips=S.clips.filter(c=>c.t!==ti);renderPL();commit();}}];
}
function mpPatternItems(){
  const p=S.patterns[S.pat];
  return[{head:'Patterns'},
    ...S.patterns.map((q,k)=>({label:(k+1)+'. '+q.name,check:k===S.pat,act:()=>setPat(k)})),
    {sep:1},
    {label:'Nouveau pattern',act:newPattern},
    {label:'Cloner « '+p.name+' »',act:clonePattern},
    {label:'Renommer…',act:()=>wsAsk('Nom du pattern',p.name).then(n=>{if(n){p.name=n;renderAll();commit();}})},
    {label:'Vider…',act:()=>wsConfirm('Vider','Vider le pattern « '+p.name+' » ?').then(ok=>{if(ok){S.channels.forEach(c=>c.notes[S.pat]=[]);renderAll();commit();}})},
    {label:'Supprimer…',disabled:S.patterns.length<2,act:()=>wsConfirm('Supprimer','Supprimer le pattern « '+p.name+' » et ses clips ?').then(ok=>{
      if(!ok)return;const k=S.pat;S.patterns.splice(k,1);S.channels.forEach(c=>c.notes.splice(k,1));
      S.clips=S.clips.filter(c=>c.p!==k).map(c=>({t:c.t,b:c.b,p:c.p>k?c.p-1:c.p}));S.pat=Math.max(0,k-1);renderAll();commit();})}];
}

/* ---------- aiguillage du clic droit ---------- */
const mpIdx=(node,sel)=>[...node.parentNode.querySelectorAll(':scope > '+sel)].indexOf(node);
document.addEventListener('contextmenu',e=>{
  const t=e.target;if(!t||!t.closest)return;
  if(t.closest('.ctxm,.wsdlg-bg')){e.preventDefault();return;}
  let items=null,x;
  if((x=t.closest('.knob'))&&x._ws)items=knobItems(x);
  else if((x=t.closest('#strips .strip'))){
    const i=mpIdx(x,'.strip');
    if(t.closest('.led')&&i>0){e.preventDefault();e.stopPropagation();soloIns(i);return;}
    if(S.selIns!==i){S.selIns=i;renderMixer();}
    items=mpStripItems(i);
  }
  else if((x=t.closest('#fxPanel > .slot'))){const j=mpIdx(x,'.slot');if(j>=0&&j<S.inserts[S.selIns].fx.length)items=mpSlotItems(S.selIns,j);}
  else if(t.closest('#rack .st')){if(e.shiftKey)return;e.preventDefault();e.stopPropagation();return;}
  else if(t.closest('#rack .led'))return;
  else if((x=t.closest('#rack .crow'))){const i=mpIdx(x,'.crow');if(S.channels[i]){selectCh(i);items=mpChannelItems(i);}}
  else if((x=t.closest('#plTracks .plth'))){const ti=mpIdx(x.closest('.plrow'),'.plrow');if(S.tracks[ti])items=mpTrackItems(ti);}
  else if(t.closest('#patSel,#plPat'))items=mpPatternItems();
  if(!items)return;
  e.preventDefault();e.stopPropagation();ctxMenu(e.clientX,e.clientY,items);
},true);

/* Step sequencer : clic droit = effacer (glisser pour effacer plusieurs pas), Maj+clic droit = note fantôme */
document.addEventListener('mousedown',e=>{
  if(e.button!==2||e.shiftKey||!e.target.closest)return;const b=e.target.closest('#rack .st');if(!b)return;
  e.preventDefault();let changed=false;
  const erase=x=>{const i=mpIdx(x.closest('.crow'),'.crow'),s=+x.dataset.s,ch=S.channels[i];if(!ch)return;const ns=ch.notes[S.pat]||[];
    if(!ns.some(n=>n.s===s))return;ch.notes[S.pat]=ns.filter(n=>n.s!==s);changed=true;renderRack();if(i===S.sel)renderPRNotes();};
  erase(b);
  const ov=ev=>{const x=ev.target.closest&&ev.target.closest('#rack .st');if(x)erase(x);};
  const up=()=>{document.removeEventListener('mouseover',ov);document.removeEventListener('mouseup',up);if(changed)commit();};
  document.addEventListener('mouseover',ov);document.addEventListener('mouseup',up);
},true);

/* ---------- rendu : listes d'effets groupées, barre d'outils FX, aides ---------- */
function mpGroupSelect(sel,j){
  const v=sel.value;sel.innerHTML='';sel.append(new Option('— Slot '+(j+1)+' vide —',''));
  fxCats().forEach(([c,ks])=>{const g=document.createElement('optgroup');g.label=c;ks.forEach(k=>g.append(new Option(FX[k].name,k)));sel.append(g);});
  sel.value=v;
}
const _rfpMP=renderFxPanel;
renderFxPanel=function(){
  _rfpMP();
  const box=$('#fxPanel'),si=S.selIns,ins=S.inserts[si];if(!box||!ins)return;
  [...box.querySelectorAll(':scope > .slot')].slice(0,ins.fx.length).forEach((slot,j)=>{
    const sel=slot.querySelector('.slh select');if(sel)mpGroupSelect(sel,j);
    slot.dataset.hint='Clic droit : menu de l\'effet (choisir, bypass, déplacer, copier/coller…)';});
  const bar=el('div','fxtools'),b1=el('button','fxbtn','Préréglages ▾'),b2=el('button','fxbtn','+ Effet ▾'),b3=el('button','fxbtn','Menu ▾');
  b1.dataset.hint='Charger une chaîne d\'effets toute prête (mastering, voix, lo-fi…)';b2.dataset.hint='Ajouter un effet dans le premier slot libre';b3.dataset.hint='Menu de l\'insert (identique au clic droit sur la tranche)';
  b1.onclick=()=>mpMenuAt(b1,mpChainItems(si));b2.onclick=()=>mpMenuAt(b2,fxTypeItems(k=>addFxTo(si,k)));b3.onclick=()=>mpMenuAt(b3,mpStripItems(si));
  bar.append(b1,b2,b3);
  const lab=box.querySelector(':scope > .lab')||box.firstChild;if(lab)lab.after(bar);else box.prepend(bar);
};
const _rmMP=renderMixer;
renderMixer=function(){_rmMP();
  $$('#strips .sname').forEach(n=>n.dataset.hint='Double-clic : renommer · clic droit : menu (effets, préréglages, routage…)');
  $$('#strips .strip .led').forEach((n,i)=>{if(i)n.dataset.hint='Mute de l\'insert (clic droit : solo)';});};
const _rrMP=renderRack;
renderRack=function(){_rrMP();
  $$('#rack .cname').forEach(n=>n.dataset.hint='Clic : réglages · clic droit : menu du canal');
  $$('#rack .steps').forEach(n=>n.dataset.hint='Clic : poser/retirer · clic droit (glisser) : effacer · Maj+clic droit : note fantôme');};
const _rplMP=renderPL;
renderPL=function(){_rplMP();$$('#plTracks .plth span').forEach(n=>n.dataset.hint='Double-clic : renommer · clic droit : menu de la piste');};
