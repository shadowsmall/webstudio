"use strict";
/* ===== WebStudio – utilitaires d'interface partagés par les modules ===== */
function makeWin(id,title,tools){
  const w=el('div','win'),wt=el('div','wt'),wb=el('div','wb'),x=el('button','x','×');
  w.id=id;w.style.display='none';wt.appendChild(el('span','ttl',title));
  (tools||[]).forEach(t=>wt.appendChild(t));wt.append(el('span','sp'),x);w.append(wt,wb);$('#ws').appendChild(w);
  w.addEventListener('mousedown',()=>focusWin(w));
  wt.addEventListener('mousedown',e=>{
    if(e.target.closest('button,select,input,.knob'))return;e.preventDefault();
    const r=w.getBoundingClientRect(),wr=$('#ws').getBoundingClientRect(),dx=e.clientX-r.left,dy=e.clientY-r.top;
    const mv=ev=>{w.style.left=clamp(ev.clientX-wr.left-dx,-r.width+80,wr.width-80)+'px';w.style.top=clamp(ev.clientY-wr.top-dy,0,wr.height-30)+'px';};
    const up=()=>{document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);};
    document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up);
  });
  x.onclick=()=>toggleWin(id,false);
  return{w,wt,wb};
}
function selBox(opts,val,on){const s=el('select');opts.forEach(([v,t])=>s.append(new Option(t,v)));s.value=String(val);s.onchange=()=>on(s.value);return s;}
function btn(txt,fn,hint){const b=el('button','btn',txt);b.onclick=fn;if(hint)b.dataset.hint=hint;return b;}
let tbLast=null;
function addTbtn(txt,hint,fn,id){
  const b=el('button','tbtn',txt);b.dataset.hint=hint;b.onclick=fn;if(id)b.id=id;
  const ref=tbLast||$('[data-win="w-mix"]');ref.after(b);tbLast=b;return b;
}
