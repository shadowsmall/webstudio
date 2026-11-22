"use strict";
/* ===== WebStudio – effets supplémentaires + envois (sends) du mixer ===== */
const fHz=v=>v.toFixed(2)+' Hz';
function crushCurve(bits){const n=4096,c=new Float32Array(n),q=Math.pow(2,bits-1);for(let i=0;i<n;i++){const x=i*2/(n-1)-1;c[i]=Math.round(x*q)/q;}return c;}
Object.assign(FX,{
  phaser:{name:'Phaser',def:{rate:.4,depth:.7,fb:.5,mix:.5},
    params:[['rate',.05,8,'Vitesse',fHz,true],['depth',0,1,'Profondeur',fmtPct],['fb',0,.9,'Feedback',fmtPct],['mix',0,1,'Mix',fmtPct]],
    make(E){const ac=E.ac,i=ac.createGain(),o=ac.createGain(),dry=ac.createGain(),w=ac.createGain(),fb=ac.createGain(),fd=ac.createDelay(.01),lfo=ac.createOscillator(),lg=ac.createGain();
      const aps=[0,1,2,3].map(k=>{const f=ac.createBiquadFilter();f.type='allpass';f.frequency.value=600+k*500;f.Q.value=.7;lg.connect(f.frequency);return f;});
      for(let k=0;k<3;k++)aps[k].connect(aps[k+1]);
      i.connect(dry);dry.connect(o);i.connect(aps[0]);aps[3].connect(w);w.connect(o);aps[3].connect(fb);fb.connect(fd);fd.connect(aps[0]);
      lfo.connect(lg);lfo.start();
      return{in:i,out:o,nodes:[i,o,dry,w,fb,fd,lfo,lg,...aps],set(p){lfo.frequency.value=p.rate;lg.gain.value=p.depth*500;fb.gain.value=p.fb;w.gain.value=p.mix;dry.gain.value=1-p.mix*.5;}};}},
  flanger:{name:'Flanger',def:{rate:.25,depth:.6,fb:.6,mix:.5},
    params:[['rate',.05,5,'Vitesse',fHz,true],['depth',0,1,'Profondeur',fmtPct],['fb',0,.95,'Feedback',fmtPct],['mix',0,1,'Mix',fmtPct]],
    make(E){const ac=E.ac,i=ac.createGain(),o=ac.createGain(),dry=ac.createGain(),w=ac.createGain(),fb=ac.createGain(),d=ac.createDelay(.05),lfo=ac.createOscillator(),lg=ac.createGain();
      d.delayTime.value=.007;lfo.connect(lg);lg.connect(d.delayTime);lfo.start();
      i.connect(dry);dry.connect(o);i.connect(d);d.connect(w);w.connect(o);d.connect(fb);fb.connect(d);
      return{in:i,out:o,nodes:[i,o,dry,w,fb,d,lfo,lg],set(p){lfo.frequency.value=p.rate;lg.gain.value=p.depth*.004;fb.gain.value=p.fb;w.gain.value=p.mix;dry.gain.value=1-p.mix*.5;}};}},
  crush:{name:'Bitcrusher',def:{bits:6,mix:1},
    params:[['bits',1,16,'Bits',v=>Math.round(v)+' bits'],['mix',0,1,'Mix',fmtPct]],
    make(E){const ac=E.ac,i=ac.createGain(),o=ac.createGain(),ws=ac.createWaveShaper(),dry=ac.createGain(),w=ac.createGain();
      i.connect(dry);dry.connect(o);i.connect(ws);ws.connect(w);w.connect(o);let cur=-1;
      return{in:i,out:o,nodes:[i,o,ws,dry,w],set(p){const b=Math.round(p.bits);if(b!==cur){cur=b;ws.curve=crushCurve(b);}w.gain.value=p.mix;dry.gain.value=1-p.mix;}};}},
  stereo:{name:'Largeur stéréo',def:{width:1.4},
    params:[['width',0,2,'Largeur',v=>v<.02?'Mono':fmtPct(v)]],
    make(E){const ac=E.ac,i=ac.createGain(),sp=ac.createChannelSplitter(2),m=ac.createChannelMerger(2),ll=ac.createGain(),rr=ac.createGain(),lr=ac.createGain(),rl=ac.createGain();
      i.connect(sp);sp.connect(ll,0);ll.connect(m,0,0);sp.connect(rl,1);rl.connect(m,0,0);sp.connect(rr,1);rr.connect(m,0,1);sp.connect(lr,0);lr.connect(m,0,1);
      return{in:i,out:m,nodes:[i,sp,m,ll,rr,lr,rl],set(p){const a=(1+p.width)/2,b=(1-p.width)/2;ll.gain.value=rr.gain.value=a;lr.gain.value=rl.gain.value=b;}};}},
  tremolo:{name:'Trémolo',def:{rate:4,depth:.6},
    params:[['rate',.1,20,'Vitesse',fHz,true],['depth',0,1,'Profondeur',fmtPct]],
    make(E){const ac=E.ac,g=ac.createGain(),lfo=ac.createOscillator(),lg=ac.createGain();lfo.connect(lg);lg.connect(g.gain);lfo.start();
      return{in:g,out:g,nodes:[g,lfo,lg],set(p){lfo.frequency.value=p.rate;g.gain.value=1-p.depth/2;lg.gain.value=p.depth/2;}};}},
  autopan:{name:'Auto-pan',def:{rate:.5,depth:.8},
    params:[['rate',.05,10,'Vitesse',fHz,true],['depth',0,1,'Profondeur',fmtPct]],
    make(E){const ac=E.ac,pn=ac.createStereoPanner(),lfo=ac.createOscillator(),lg=ac.createGain();lfo.connect(lg);lg.connect(pn.pan);lfo.start();
      return{in:pn,out:pn,nodes:[pn,lfo,lg],set(p){lfo.frequency.value=p.rate;lg.gain.value=p.depth;}};}},
  limiter:{name:'Limiteur',def:{thr:-6,gain:1.5},
    params:[['thr',-30,0,'Seuil',v=>v.toFixed(1)+' dB'],['gain',.5,4,'Gain',v=>'×'+v.toFixed(2)]],
    make(E){const ac=E.ac,c=ac.createDynamicsCompressor(),g=ac.createGain();c.ratio.value=20;c.knee.value=0;c.attack.value=.001;c.release.value=.1;c.connect(g);
      return{in:c,out:g,nodes:[c,g],set(p){c.threshold.value=p.thr;g.gain.value=p.gain;}};}}
});

/* Envois : un insert peut alimenter un insert de numéro supérieur (pas de boucle possible) */
const _be0=buildEngine;
buildEngine=function(a,dest,live){
  const EE=_be0(a,dest,live);
  S.inserts.forEach((ins,i)=>{
    if(!i||!Array.isArray(ins.sends))return;
    EE.ins[i].sendG=[];
    ins.sends.forEach((sd,j)=>{
      if(!sd||!(sd.to>i)||!EE.ins[sd.to])return;
      const g=a.createGain();g.gain.value=sd.amt;EE.nodes.push(g);EE.ins[i].fader.connect(g);g.connect(EE.ins[sd.to].input);EE.ins[i].sendG[j]=g;
    });
  });
  return EE;
};
const _rfp0=renderFxPanel;
renderFxPanel=function(){
  _rfp0();
  const si=S.selIns,ins=S.inserts[si];if(!si||!ins)return;
  if(!Array.isArray(ins.sends))ins.sends=[null,null];
  const box=$('#fxPanel'),slot=el('div','slot');
  slot.appendChild(el('div','slh','↪ Envois (sends)'));
  ins.sends.forEach((sd,j)=>{
    const r=el('div','setrow'),opts=[['','— Envoi '+(j+1)+' : aucun —']];
    for(let k=si+1;k<=NINS;k++)opts.push([k,k+'. '+S.inserts[k].name]);
    const s=selBox(opts,sd?sd.to:'',v=>{ins.sends[j]=v?{to:+v,amt:sd?sd.amt:.5}:null;rebuild();renderFxPanel();commit();});
    s.dataset.hint="Envoie une copie du son vers un autre insert (ex. un bus de reverb)";
    r.appendChild(s);
    if(sd)r.appendChild(kctl('Niveau',sd.amt,0,1,.5,v=>{sd.amt=v;const x=E&&E.ins[si]&&E.ins[si].sendG&&E.ins[si].sendG[j];if(x)x.gain.value=v;},fmtPct));
    slot.appendChild(r);
  });
  if(si===NINS)slot.appendChild(el('div','lab',"Le dernier insert ne peut pas envoyer plus loin."));
  box.appendChild(slot);
};
