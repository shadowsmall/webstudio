"use strict";
/* ===== WebStudio – séquenceur étendu : arpégiateur + automation ===== */
function arpStep(EE,ch,i,ns,l,t,sd){
  const A=ch.arp,r=A.rate||1,held=ns.filter(n=>n.s<=l&&l<n.s+n.l);if(!held.length)return;
  const st=Math.min(...held.map(n=>n.s)),vel=Math.max(...held.map(n=>n.v));
  const keys=[...new Set(held.map(n=>n.n))].sort((a,b)=>a-b),oc=clamp(A.oct|0,1,4),all=[];
  for(let o=0;o<oc;o++)keys.forEach(k=>all.push(k+12*o));
  let seq=all;
  if(A.mode==='down')seq=all.slice().reverse();
  else if(A.mode==='updown'&&all.length>2)seq=all.concat(all.slice(1,-1).reverse());
  const len=r*sd*clamp(A.gate||.8,.05,1);
  const fire=(idx,tt)=>{
    if(A.mode==='chord'){keys.forEach(n=>playCh(EE,ch,i,tt,n,len,vel));return;}
    const n=A.mode==='random'?seq[Math.floor(Math.random()*seq.length)]:seq[idx%seq.length];
    playCh(EE,ch,i,tt,n,len,vel);
  };
  if(r<1){const sub=Math.round(1/r);for(let k=0;k<sub;k++)fire((l-st)*sub+k,t+k*sd/sub);}
  else if((l-st)%r===0)fire((l-st)/r,t);
}
scheduleStep=function(EE,g,t,sd,mode){
  if(mode==='song'&&typeof autoApply==='function')autoApply(EE,g,t);
  stepEvents(g,mode,(p,l)=>{
    S.channels.forEach((ch,i)=>{
      const ns=ch.notes[p];if(!ns||!ns.length)return;
      if(ch.arp&&ch.arp.on)arpStep(EE,ch,i,ns,l,t,sd);
      else for(const n of ns)if(n.s===l)playCh(EE,ch,i,t,n.n,n.l*sd,n.v);
    });
  });
};
