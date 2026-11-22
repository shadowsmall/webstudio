"use strict";
/* ===== WebStudio – instruments supplémentaires ===== */
Object.assign(TYPE_NAMES,{crash:'Crash',rim:'Rimshot',shaker:'Shaker',conga:'Conga',fm:'FM Synth',supersaw:'Super Saw',organ:'Orgue',sub808:'808 Bass',kspluck:'Guitare pluck',epiano:'Piano électrique',strings:'Cordes'});
Object.assign(HUES,{crash:45,rim:210,shaker:70,conga:25,fm:300,supersaw:140,organ:35,sub808:10,kspluck:100,epiano:230,strings:170});
DRUMS.push('crash','rim','shaker','conga');
SYNTHS.push('fm','supersaw','organ','sub808','kspluck','epiano','strings');

const ENGINE_NAMES={sub:'Soustractive (2 osc.)',fm:'FM',super:'Super saw',organ:'Additive (orgue)',b808:'808',ks:'Corde pincée'};
Object.keys(PRESETS).forEach(k=>{if(!PRESETS[k].engine)PRESETS[k].engine='sub';});
Object.assign(PRESETS,{
  fm:{engine:'fm',wave:'sine',detune:0,cutoff:12000,res:.7,fenv:0,attack:.003,decay:.5,sustain:.35,release:.35,gain:.6,ratio:2,index:2.5,ienv:3},
  supersaw:{engine:'super',wave:'sawtooth',detune:25,cutoff:4500,res:1,fenv:2000,attack:.01,decay:.6,sustain:.8,release:.45,gain:.4,voices:7,spread:.8},
  organ:{engine:'organ',wave:'sine',detune:3,cutoff:9000,res:.5,fenv:0,attack:.008,decay:.1,sustain:1,release:.08,gain:.45,d1:1,d2:.7,d3:.45,d4:.3},
  sub808:{engine:'b808',wave:'sine',detune:0,cutoff:4000,res:.7,fenv:0,attack:.002,decay:1.4,sustain:.5,release:.25,gain:.9,glide:.08,drive:.35},
  kspluck:{engine:'ks',wave:'sawtooth',detune:0,cutoff:7000,res:.5,fenv:0,attack:.001,decay:1,sustain:1,release:.12,gain:.9,bright:.6,damp:.995},
  epiano:{engine:'fm',wave:'sine',detune:4,cutoff:7000,res:.5,fenv:0,attack:.002,decay:1.2,sustain:.25,release:.5,gain:.55,ratio:1,index:1.2,ienv:5},
  strings:{engine:'super',wave:'sawtooth',detune:14,cutoff:2600,res:.7,fenv:300,attack:.35,decay:1,sustain:.85,release:.9,gain:.35,voices:5,spread:1}
});
/* [clé, min, max, libellé, format, log, défaut] */
const ENG_PARAMS={
  fm:[['ratio',.25,16,'Ratio',v=>'×'+v.toFixed(2),false,2],['index',0,12,'Index',v=>v.toFixed(2),false,2],['ienv',0,10,'Env. index',v=>v.toFixed(1),false,3]],
  super:[['voices',1,9,'Voix',v=>String(Math.round(v)),false,7],['spread',0,1,'Stéréo',fmtPct,false,.8]],
  organ:[['d1',0,1,'Fondamentale',fmtPct,false,1],['d2',0,1,'Octave',fmtPct,false,.7],['d3',0,1,'Quinte',fmtPct,false,.45],['d4',0,1,'2e octave',fmtPct,false,.3]],
  b808:[['glide',.005,.5,'Glide',fmtMs,true,.08],['drive',0,1,'Saturation',fmtPct,false,.35]],
  ks:[['bright',0,1,'Brillance',fmtPct,false,.6],['damp',.95,.9995,'Tenue',v=>(v*100).toFixed(2)+'%',false,.995]]
};

const hz=n=>440*Math.pow(2,(n-69)/12);
function vStart(a,s,t,dur,vel){
  const g=a.createGain(),lp=a.createBiquadFilter();lp.type='lowpass';lp.Q.value=s.res;
  lp.frequency.setValueAtTime(clamp(s.cutoff+s.fenv,30,20000),t);
  lp.frequency.setTargetAtTime(clamp(s.cutoff,30,20000),t+.005,Math.max(.02,s.decay/2));
  const peak=s.gain*vel*.45,at=Math.max(.002,s.attack),r=Math.max(.01,s.release);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+at);g.gain.setTargetAtTime(peak*s.sustain,t+at,Math.max(.01,s.decay/3));
  const end=dur!=null?t+Math.max(at,dur):null;if(end!=null)g.gain.setTargetAtTime(0,end,r/4);
  lp.connect(g);return{g,lp,r,end,t};
}
function vDone(a,v,out,srcs){
  v.g.connect(out);
  srcs.forEach(o=>{o.start(v.t);if(v.end!=null)o.stop(v.end+v.r+.1);});
  return{g:v.g,oscs:srcs,r:v.r,a};
}
const ksCache=new Map();
function ksBuf(a,f,s){
  const sr=a.sampleRate,N=Math.max(2,Math.round(sr/f)),br=clamp(s.bright==null?.6:s.bright,0,1),dp=clamp(s.damp==null?.995:s.damp,.9,.9999);
  const key=sr+'|'+N+'|'+br.toFixed(2)+'|'+dp.toFixed(4);let b=ksCache.get(key);
  if(!b){
    if(ksCache.size>200)ksCache.clear();
    const len=Math.floor(sr*2.5);b=a.createBuffer(1,len,sr);const d=b.getChannelData(0);let lp=0;
    for(let i=0;i<N;i++){lp+=(Math.random()*2-1-lp)*(.1+br*.9);d[i]=lp;}
    for(let i=N;i<len;i++)d[i]=dp*.5*(d[i-N]+(i>N?d[i-N-1]:0));
    ksCache.set(key,b);
  }
  return{b,rate:f*(N+.5)/sr};
}
const ENGINES={
  fm(a,s,f,v){const c=a.createOscillator(),m=a.createOscillator(),mg=a.createGain();c.type='sine';m.type='sine';
    c.frequency.value=f;c.detune.value=s.detune||0;m.frequency.value=f*(s.ratio||1);
    const I=f*(s.index==null?1:s.index);mg.gain.setValueAtTime(I*(1+(s.ienv||0)),v.t);mg.gain.setTargetAtTime(I,v.t+.002,Math.max(.02,s.decay/3));
    m.connect(mg);mg.connect(c.frequency);c.connect(v.lp);return[c,m];},
  super(a,s,f,v){const N=clamp(Math.round(s.voices||7),1,9),o=[];
    for(let k=0;k<N;k++){const x=N>1?k/(N-1)*2-1:0,osc=a.createOscillator(),p=a.createStereoPanner(),g=a.createGain();
      osc.type=s.wave||'sawtooth';osc.frequency.value=f;osc.detune.value=x*s.detune;p.pan.value=x*(s.spread==null?.8:s.spread);g.gain.value=1/Math.sqrt(N);
      osc.connect(g);g.connect(p);p.connect(v.lp);o.push(osc);}
    return o;},
  organ(a,s,f,v){return[1,2,3,4].map((h,k)=>{const o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.value=f*h;
    o.detune.value=(k%2?1:-1)*(s.detune||0);const d=s['d'+(k+1)];g.gain.value=(d==null?.5:d)*.6;o.connect(g);g.connect(v.lp);return o;});},
  b808(a,s,f,v){const o=a.createOscillator(),ws=a.createWaveShaper();o.type='sine';
    o.frequency.setValueAtTime(f*2,v.t);o.frequency.exponentialRampToValueAtTime(f,v.t+Math.max(.005,s.glide||.05));
    ws.curve=distCurve((s.drive||0)*25);o.connect(ws);ws.connect(v.lp);return[o];},
  ks(a,s,f,v){const src=a.createBufferSource(),k=ksBuf(a,f,s);src.buffer=k.b;src.playbackRate.value=k.rate;src.connect(v.lp);return[src];}
};

const dEnv=(g,peak,t,d)=>{g.gain.setValueAtTime(peak,t);g.gain.exponentialRampToValueAtTime(.001,t+d);};
const XDRUMS={
  crash(EE,out,t,p,vel,k){const a=EE.ac,n=a.createBufferSource(),hp=a.createBiquadFilter(),g=a.createGain();
    n.buffer=EE.noise;n.loop=true;hp.type='highpass';hp.frequency.value=4500*p;dEnv(g,.45*vel,t,1.6*k);
    n.connect(hp);hp.connect(g);g.connect(out);n.start(t);n.stop(t+1.7*k);
    const bp=a.createBiquadFilter(),g2=a.createGain();bp.type='bandpass';bp.frequency.value=8000*p;bp.Q.value=.8;dEnv(g2,.18*vel,t,1.1*k);bp.connect(g2);g2.connect(out);
    [2,3,4.16,5.43,6.79,8.21].forEach(r=>{const o=a.createOscillator();o.type='square';o.frequency.value=r*120*p;o.connect(bp);o.start(t);o.stop(t+1.2*k);});},
  rim(EE,out,t,p,vel,k){const a=EE.ac,o=a.createOscillator(),g=a.createGain(),bp=a.createBiquadFilter();
    o.type='triangle';o.frequency.value=1700*p;bp.type='bandpass';bp.frequency.value=2200*p;bp.Q.value=3;dEnv(g,.9*vel,t,.045*k);
    o.connect(bp);bp.connect(g);g.connect(out);o.start(t);o.stop(t+.08*k+.02);
    const n=a.createBufferSource(),g2=a.createGain();n.buffer=EE.noise;dEnv(g2,.3*vel,t,.015);n.connect(g2);g2.connect(bp);n.start(t);n.stop(t+.03);},
  shaker(EE,out,t,p,vel,k){const a=EE.ac,n=a.createBufferSource(),bp=a.createBiquadFilter(),g=a.createGain();
    n.buffer=EE.noise;bp.type='bandpass';bp.frequency.value=6500*p;bp.Q.value=1.4;
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.45*vel,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+.02+.1*k);
    n.connect(bp);bp.connect(g);g.connect(out);n.start(t);n.stop(t+.2*k+.05);},
  conga(EE,out,t,p,vel,k){const a=EE.ac,o=a.createOscillator(),g=a.createGain();o.type='sine';
    o.frequency.setValueAtTime(380*p,t);o.frequency.exponentialRampToValueAtTime(300*p,t+.06);dEnv(g,.8*vel,t,.3*k);
    o.connect(g);g.connect(out);o.start(t);o.stop(t+.35*k+.05);}
};

/* Lecture : nouveaux sons + moteurs de synthèse + surcharge par l'automation */
const _playCh0=playCh;
playCh=function(EE,ch,i,t,n,dur,v){
  const node=EE.ch[i];if(!node||!ch)return null;
  if(typeof autoChOverride==='function')ch=autoChOverride(EE,ch);
  if(XDRUMS[ch.type]){XDRUMS[ch.type](EE,node.in,t,semi(ch.pitch+n-60),v,ch.decay||1);return null;}
  if(ch.synth&&SYNTHS.includes(ch.type)){
    const e=ch.synth.engine||'sub';
    if(e!=='sub'&&ENGINES[e]){const a=EE.ac,s=ch.synth,vv=vStart(a,s,t,dur,v);return vDone(a,vv,node.in,ENGINES[e](a,s,hz(n+ch.pitch),vv));}
  }
  return _playCh0(EE,ch,i,t,n,dur,v);
};

/* Réglages du canal : moteur de synthèse + arpégiateur */
const _rsInstr=renderSettings;
renderSettings=function(){
  _rsInstr();
  const ch=S.channels[S.sel];if(!ch)return;
  const box=$('#setBody'),act=[...box.querySelectorAll('.sec')].pop(),wrap=el('div');
  const sec=t=>wrap.appendChild(el('div','sec',t)),grid=()=>{const g=el('div','kgrid');wrap.appendChild(g);return g;};
  if(ch.synth&&SYNTHS.includes(ch.type)){
    const s=ch.synth;sec('Moteur de synthèse');
    const r=el('div','setrow'),es=selBox(Object.entries(ENGINE_NAMES),s.engine||'sub',v=>{
      s.engine=v;(ENG_PARAMS[v]||[]).forEach(p=>{if(s[p[0]]==null)s[p[0]]=p[6];});renderSettings();commit();previewCh(S.sel,60);});
    r.append(el('span','lab','Synthèse'),es);wrap.appendChild(r);
    const ps=ENG_PARAMS[s.engine];
    if(ps){const g=grid();ps.forEach(([k,mn,mx,lb,fm,lg,df])=>{if(s[k]==null)s[k]=df;g.append(kctl(lb,s[k],mn,mx,df,v=>{s[k]=k==='voices'?Math.round(v):v;},fm,lg));});}
  }
  if(ch.synth||ch.type==='sampler'){
    const A=ch.arp||(ch.arp={on:false,mode:'up',rate:1,oct:1,gate:.8});
    sec('Arpégiateur');
    const r=el('div','setrow'),cb=el('input'),l=el('label');cb.type='checkbox';cb.checked=!!A.on;cb.onchange=()=>{A.on=cb.checked;commit();};
    l.append(cb,' Activer');
    const ms=selBox([['up','Montant'],['down','Descendant'],['updown','Aller-retour'],['random','Aléatoire'],['chord','Accord répété']],A.mode,v=>{A.mode=v;commit();});
    const rs=selBox([[.5,'1/32'],[1,'1/16'],[2,'1/8'],[4,'1/4']],A.rate,v=>{A.rate=+v;commit();});
    ms.dataset.hint="Ordre de l'arpège";rs.dataset.hint="Vitesse de l'arpège";
    r.append(l,ms,rs);wrap.appendChild(r);
    const g=grid();
    g.append(kctl('Octaves',A.oct,1,4,1,v=>{A.oct=Math.round(v);},v=>String(Math.round(v))));
    g.append(kctl('Gate',A.gate,.1,1,.8,v=>{A.gate=v;},fmtPct));
    wrap.appendChild(el('div','lab',"Les notes tenues dans le piano roll sont jouées une par une pendant la lecture."));
  }
  if(act)box.insertBefore(wrap,act);else box.appendChild(wrap);
};
