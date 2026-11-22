/* ============================================================
   Import des projets FL Studio (.flp)
   Lecture du format de fichier tel qu'il est documenté publiquement
   par la communauté (en-tête FLhd + bloc d'événements FLdt).
   Importés : tempo, canaux (nom, type deviné), patterns et notes,
   playlist (clips de patterns). Non importés : plugins tiers, réglages
   internes des plugins, audio des samples, automation, effets du mixeur.
   ============================================================ */
function parseFLP(ab){
  const d=new Uint8Array(ab),dv=new DataView(ab);
  const tag=o=>String.fromCharCode(d[o],d[o+1],d[o+2],d[o+3]);
  if(d.length<22||tag(0)!=='FLhd')throw new Error('ce fichier n’est pas un projet FL Studio.');
  const hl=dv.getUint32(4,true),ppq=dv.getUint16(12,true)||96;
  let p=8+hl;
  if(tag(p)!=='FLdt')throw new Error('bloc de données introuvable.');
  const end=Math.min(d.length,p+8+dv.getUint32(p+4,true));p+=8;
  const R={ppq,version:'',bpm:0,chans:{},pats:{},items:null,skipped:0};
  const latin=new TextDecoder('latin1'),u16=new TextDecoder('utf-16le');
  let utf16=false,major=0,cur=null,curPat=null,late=false;
  const txt=b=>(utf16?u16:latin).decode(b).replace(/\0/g,'').trim();
  while(p<end){
    const id=d[p++];let v=0,b=null;
    if(id<64){v=d[p];p+=1;}
    else if(id<128){v=dv.getUint16(p,true);p+=2;}
    else if(id<192){v=dv.getUint32(p,true);p+=4;}
    else{let n=0,sh=0,c;do{c=d[p++];n+=(c&127)*Math.pow(2,sh);sh+=7;}while(c&128&&p<end);
      b=d.subarray(p,Math.min(end,p+n));p+=n;}
    switch(id){
      case 199:{R.version=latin.decode(b).replace(/\0/g,'');const m=R.version.split('.').map(Number);
        major=m[0]||0;utf16=major>11||(major===11&&(m[1]||0)>=5);break;}
      case 156:R.bpm=v/1000;break;  // tempo (×1000)
      case 66:if(!R.bpm)R.bpm=v;break;      // ancien tempo
      case 64:cur=R.chans[v]={idx:v,name:'',plugin:'',sample:'',kind:-1};break; // nouveau canal
      case 21:if(cur&&!late)cur.kind=v;break;      // type de canal
      case 201:if(cur&&!late&&!cur.plugin)cur.plugin=txt(b);break; // nom du plugin
      case 203:if(cur&&!late&&!cur.name)cur.name=txt(b);break;     // nom du canal
      case 196:if(cur&&!late)cur.sample=txt(b);break;     // chemin du sample
      case 65:curPat=R.pats[v]=R.pats[v]||{id:v,name:'',notes:[]};break; // nouveau pattern
      case 193:if(curPat)curPat.name=txt(b);break; // nom du pattern
      case 224:if(curPat)for(let o=0;o+24<=b.length;o+=24){const q=b.byteOffset+o;   // notes
          curPat.notes.push({pos:dv.getUint32(q,true),ch:dv.getUint16(q+6,true),len:dv.getUint32(q+8,true),
     key:dv.getUint16(q+12,true),vel:dv.getUint8(q+21)});}
        break;
      case 99:late=true;break;       // nouvel arrangement
      case 233:{late=true;if(R.items)break;        // playlist (1er arrangement)
        // taille d'un clip selon la version (32, 60 ou 80 octets) : on garde celle où chaque clip
        // porte bien la base de pattern 20480 (0x5000)
        const ok=sz=>{if(!b.length||b.length%sz)return false;
   for(let o=0;o+sz<=b.length;o+=sz)if(dv.getUint16(b.byteOffset+o+4,true)!==20480)return false;return true;};
        const sz=[80,60,32].find(ok)||(major>=21?60:32);
 R.items=[];
 for(let o=0;o+sz<=b.length;o+=sz){const q=b.byteOffset+o;
   const pos=dv.getUint32(q,true),base=dv.getUint16(q+4,true),idx=dv.getUint16(q+6,true),
     len=dv.getUint32(q+8,true),trv=dv.getUint16(q+12,true);
   if(idx<=base){R.skipped++;continue;}      // clip audio / automation
   let t=499-trv;if(t<0||t>499)t=198-trv;
   R.items.push({pos,len,pat:idx-base,track:t});}
        break;}
    }
  }
  return R;
}

function flpGuessType(s,isSampler){
  s=s.toLowerCase();
  const rules=[[/kick|\bbd\b|bass ?drum/,'kick'],[/808/,'sub808'],[/snare|\bsd\b|\bsnr\b/,'snare'],[/clap|\bclp\b/,'clap'],
    [/open.?h(i|at)|\boh\b|ohat/,'ohat'],[/hi.?hats?|\bhh\b|hats?\b/,'hat'],[/crash|cymbal|\bride\b|\bcym/,'crash'],
    [/\brim/,'rim'],[/shak|tamb/,'shaker'],[/conga|bongo/,'conga'],[/\btoms?\b/,'tom'],[/perc|cowbell|\bbell\b/,'perc'],
    [/bass|\bsub\b|\bbas\b/,'bass'],[/\bpad|atmos/,'pad'],[/string|violin|cello|\bstr\b/,'strings'],[/pluck|harp|guitar|\bplk\b/,'pluck'],
    [/piano|keys?\b|rhodes|\bep\b/,'epiano'],[/organ/,'organ'],[/super ?saw|trance/,'supersaw'],[/\bfm\b|\bdx|toxic/,'fm'],
    [/lead|3x ?osc|synth|sytrus|harmor|serum|vital|massive|nexus|sakura|flex|transistor|saw/,'lead']];
  for(const [re,t] of rules)if(re.test(s)&&TYPE_NAMES[t])return t;
  return isSampler?'sampler':'lead';
}

/* Fenêtre de dialogue intégrée (remplace confirm/alert, que le navigateur peut bloquer) */
function flpDialog(text,buttons){
  return new Promise(res=>{
    const old=document.getElementById('flpDlg');if(old)old.remove();
    const ov=document.createElement('div');ov.id='flpDlg';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center';
    const box=document.createElement('div');
    box.style.cssText='background:#2b3136;color:#dfe5e8;border:1px solid #5a646b;border-radius:6px;padding:16px 18px;max-width:560px;max-height:80vh;overflow:auto;font:13px/1.45 Segoe UI,sans-serif;white-space:pre-wrap;box-shadow:0 8px 30px #000';
    const msg=document.createElement('div');msg.id='flpDlgText';msg.textContent=text;box.appendChild(msg);
    const row=document.createElement('div');row.style.cssText='margin-top:14px;text-align:right';
    const close=v=>{ov.remove();document.removeEventListener('keydown',key,true);res(v);};
    const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(buttons[0][1]);}
      else if(e.key==='Enter'){e.preventDefault();e.stopPropagation();close(buttons[buttons.length-1][1]);}};
    buttons.forEach(([label,val,id])=>{const b=document.createElement('button');b.textContent=label;if(id)b.id=id;
      b.style.cssText='margin-left:8px;padding:5px 16px;cursor:pointer;background:#3d464d;color:#fff;border:1px solid #6b767e;border-radius:4px';
      b.onclick=()=>close(val);row.appendChild(b);});
    box.appendChild(row);ov.appendChild(box);document.body.appendChild(ov);
    document.addEventListener('keydown',key,true);row.lastChild.focus();
  });
}

function importFLP(f){
  setHint('Lecture de '+f.name+'…');
  f.arrayBuffer().then(ab=>{
    const R=parseFLP(ab),step=R.ppq/4,bar=R.ppq*4;
    const ids=Object.values(R.pats).filter(pt=>pt.notes.length).map(pt=>pt.id).sort((a,b)=>a-b);
    if(!Object.keys(R.chans).length&&!ids.length)throw new Error('aucun canal ni pattern trouvé (fichier vide ou format non reconnu).');
    return flpDialog('Importer « '+f.name+' »'+(R.version?' (FL Studio '+R.version+')':'')+' ?\n\nLe projet actuel sera remplacé (pense à l’enregistrer avant).',
      [['Annuler',false],['Importer',true,'flpOk']]).then(ok=>{if(!ok){setHint('Import annulé');return;}
    const P=baseProject(),map={},MAXSEG=8;let cut=0,lost=0,outside=0;
    // un pattern FL plus long que 4 mesures est découpé en plusieurs patterns de 4 mesures
    P.patterns=[];
    ids.forEach(id=>{const pt=R.pats[id],nm=pt.name||'Pattern '+id;
      const mx=pt.notes.reduce((a,n)=>Math.max(a,Math.ceil((n.pos+Math.max(1,n.len))/step)),1);
      let nseg=Math.ceil(mx/64);if(nseg>MAXSEG){cut++;nseg=MAXSEG;}
      map[id]=[];
      for(let k=0;k<nseg;k++){map[id].push(P.patterns.length);
        P.patterns.push({name:(nseg>1?nm.slice(0,17)+' '+(k+1)+'/'+nseg:nm).slice(0,24),len:clamp(Math.ceil((mx-k*64)/16)*16,16,64)});}
    });
    const isDrum=t=>!SYNTHS.includes(t)&&t!=='sampler';
    const base=s=>s.split(/[\\/]/).pop();
    const mk=(type,name)=>{const ch=newChannel(P,type,(name||TYPE_NAMES[type]).slice(0,24));P.channels.push(ch);return ch;};
    const chMap={},kits={},missing=[];
    Object.values(R.chans).sort((a,b)=>a.idx-b.idx).forEach(c=>{
      if(c.kind===3||c.kind===5)return;     // calques et clips d'automation
      const name=c.name||c.plugin||(c.sample?base(c.sample).replace(/\.[^.]+$/,''):'Canal '+(c.idx+1));
      if(/fpc|drum ?kit|battery|slicex|slicer|drumaxx/i.test(c.plugin)){kits[c.idx]={name,chans:{}};return;}
      const t=flpGuessType(name+' '+c.plugin+' '+base(c.sample||''),c.kind===0||!!c.sample);
      const ch=chMap[c.idx]=mk(t,name);
      if(t==='sampler'&&c.sample)ch.file=base(c.sample);
    });
    const inv={};Object.entries(GM_DRUM).forEach(([ty,n])=>{if(TYPE_NAMES[ty])inv[n]=ty;});
    ids.forEach(id=>{const segs=map[id];
      R.pats[id].notes.forEach(n=>{
 const s0=Math.round(n.pos/step),k=Math.floor(s0/64);if(k>=segs.length){lost++;return;}
 const pi=segs[k],len=P.patterns[pi].len,s=s0-k*64;if(s>=len){lost++;return;}
        const v=clamp((n.vel||100)/128,.05,1);
        if(kits[n.ch]){const k=kits[n.ch],ty=inv[n.key]||(n.key<37?'kick':n.key<41?'snare':n.key<47?'hat':n.key<52&&TYPE_NAMES.crash?'crash':'perc');
   const ch=k.chans[ty]||(k.chans[ty]=mk(ty,k.name+' '+TYPE_NAMES[ty]));ch.notes[pi].push({s,n:60,l:1,v});return;}
        const ch=chMap[n.ch];if(!ch){lost++;return;}
        if(isDrum(ch.type)){ch.notes[pi].push({s,n:60,l:1,v});return;}
        let m=n.key;while(m<PR_LO)m+=12;while(m>PR_HI)m-=12;
        ch.notes[pi].push({s,n:m,l:clamp(Math.round(n.len/step)||1,1,len-s),v});
      });});
    const total=P.channels.length;
    if(!P.patterns.length){P.patterns=[{name:'Pattern 1',len:16}];P.channels.forEach(c=>c.notes=[[]]);}
    if(ids.length)P.channels=P.channels.filter(c=>c.notes.some(a=>a.length));
    else P.channels=P.channels.slice(0,NINS);
    P.channels.forEach(c=>{if(c.type==='sampler'&&c.file)missing.push(c.file);});
    P.channels.forEach((c,i)=>{c.ins=i<NINS?i+1:0;if(c.ins)P.inserts[c.ins].name=c.name;});
    // playlist : les pistes FL utilisées sont regroupées sur les NTRACKS pistes disponibles
    const its=(R.items||[]).filter(it=>map[it.pat]);
    const trs=[...new Set(its.map(it=>it.track))].sort((a,b)=>a-b),tmap={};
    trs.forEach((t,i)=>{tmap[t]=i;if(i<NTRACKS)P.tracks[i].name='Piste FL '+(t+1);});
    its.forEach(it=>{const t=tmap[it.track],b0=Math.round(it.pos/bar),lb=Math.max(1,Math.round(it.len/bar));
      if(t>=NTRACKS){outside++;return;}
      map[it.pat].forEach((pi,k)=>{const b=b0+k*4;if(k*4>=lb)return;if(b>=NBARS){outside++;return;}
        if(!P.clips.some(c=>c.t===t&&c.b===b))P.clips.push({t,b,p:pi});});
    });
    if(P.clips.length)P.mode='song';
    if(R.bpm)P.bpm=clamp(Math.round(R.bpm),20,300);
    stop();SAMPLES={};saveSamples();S=normalize(P);afterLoad();commit();
    const lines=['Projet FL Studio importé'+(R.version?' (version '+R.version+')':'')+' :',
      '• '+S.patterns.length+' pattern(s), '+S.channels.length+' canal(aux), '+S.clips.length+' clip(s) dans la playlist, tempo '+S.bpm+' BPM'];
    if(total>S.channels.length)lines.push('• '+(total-S.channels.length)+' canal(aux) sans notes ignoré(s)');
    if(cut||lost)lines.push('• '+cut+' pattern(s) de plus de '+(MAXSEG*4)+' mesures raccourci(s), '+lost+' note(s) non reprise(s)');
    if(outside)lines.push('• '+outside+' clip(s) hors de la playlist ('+NTRACKS+' pistes × '+NBARS+' mesures) ignoré(s)');
    if(R.skipped)lines.push('• '+R.skipped+' clip(s) audio ou d’automation ignoré(s)');
    if(missing.length)lines.push('• Samples à recharger dans les canaux Sampler : '+[...new Set(missing)].slice(0,8).join(', ')+(missing.length>8?'…':''));
    lines.push('','Les plugins et leurs réglages ne sont pas repris : chaque canal reçoit l’instrument intégré le plus proche (deviné d’après son nom).');
    setHint('Projet FL Studio importé : '+f.name);
    return flpDialog(lines.join('\n'),[['OK',true,'flpOk']]);
    });
  }).catch(e=>{console.error('[Import FLP]',f.name,e);setHint('Échec de l’import de '+f.name);
    flpDialog('Impossible d’importer ce projet FL Studio : '+((e&&e.message)||e)+'\n\n(Détail technique dans la console : F12 > Console)',[['OK',true,'flpOk']]);});
}

(function(){
  const fi=el('input');fi.type='file';fi.id='fileFlp';fi.accept='.flp';fi.hidden=true;document.body.appendChild(fi);
  fi.onchange=e=>{const f=e.target.files[0];if(f)importFLP(f);e.target.value='';};
  const fp=$('#fileProj'),open0=fp.onchange;fp.accept='.json,.flp';
  fp.onchange=e=>{const f=e.target.files[0];if(f&&/\.flp$/i.test(f.name)){importFLP(f);e.target.value='';}else open0(e);};
  window.addEventListener('drop',e=>{
    const fl=[...e.dataTransfer.files].filter(f=>/\.flp$/i.test(f.name));if(!fl.length)return;
    e.preventDefault();e.stopImmediatePropagation();document.body.classList.remove('drag');importFLP(fl[0]);
  },true);
})();
