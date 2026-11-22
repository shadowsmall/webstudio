"use strict";
/* ===== WebStudio – export des pistes séparées, export / import MIDI ===== */
const GM_DRUM={kick:36,snare:38,clap:39,hat:42,ohat:46,tom:45,perc:56,crash:49,rim:37,shaker:70,conga:63};

async function exportStems(){
  ensureAudio();
  const song=S.mode==='song'&&songLenSteps()>0,steps=song?songLenSteps():patLen(S.pat),sd=60/S.bpm/4,sr=44100,dur=steps*sd+3;
  const groups=[];for(let k=1;k<=NINS;k++)if(S.channels.some(c=>c.ins===k))groups.push(k);
  if(S.channels.some(c=>!c.ins))groups.push(0);
  if(!groups.length){alert('Rien à exporter.');return;}
  if(!confirm(groups.length+' fichiers WAV vont être téléchargés (un par insert du mixer utilisé), à partir du '+(song?'morceau (playlist)':'pattern courant')+'. Continuer ?'))return;
  try{
    for(let n=0;n<groups.length;n++){
      const k=groups[n];setHint('Rendu des pistes séparées : '+(n+1)+'/'+groups.length+'…');
      const oc=new OfflineAudioContext(2,Math.ceil(dur*sr),sr),OE=buildEngine(oc,oc.destination,false);
      OE.ins.forEach((x,i)=>{if(i&&i!==k)x.fader.disconnect();});
      if(k)S.channels.forEach((c,i)=>{if(!c.ins&&OE.ch[i])OE.ch[i].p.disconnect();});
      for(let g=0;g<steps;g++)scheduleStep(OE,g,.02+g*sd+((g%2)?S.swing*sd*.66:0),sd,song?'song':'pat');
      const buf=await oc.startRendering();
      const name=(k?String(k).padStart(2,'0')+'-'+S.inserts[k].name:'00-Master direct').replace(/[\\/:*?"<>|]/g,'_');
      download(wavBlob(buf),name+'.wav');await new Promise(r=>setTimeout(r,500));
    }
    setHint('Export des pistes séparées terminé ('+groups.length+' fichiers).');
  }catch(e){setHint("Erreur pendant l'export : "+e.message);}
}

function exportMidi(){
  const song=S.mode==='song'&&songLenSteps()>0,T=24,enc=new TextEncoder();
  const vlq=n=>{const b=[n&127];while(n>>=7)b.unshift((n&127)|128);return b;};
  const u32=n=>[n>>>24&255,n>>>16&255,n>>>8&255,n&255],u16=n=>[n>>8&255,n&255],str=s=>[...enc.encode(s)];
  const trk=evs=>{evs.sort((a,b)=>a.t-b.t||a.o-b.o);let last=0;const d=[];
    evs.forEach(e=>{vlq(e.t-last).forEach(x=>d.push(x));e.b.forEach(x=>d.push(x));last=e.t;});
    d.push(0,0xff,0x2f,0);return str('MTrk').concat(u32(d.length),d);};
  const mpq=Math.round(60000000/S.bpm),tracks=[];
  tracks.push(trk([{t:0,o:0,b:[0xff,0x51,3,mpq>>16&255,mpq>>8&255,mpq&255]},{t:0,o:0,b:[0xff,0x58,4,4,2,24,8]}]));
  let mc=0;const nextCh=()=>{const c=mc++%15;return c>=9?c+1:c;};
  S.channels.forEach(ch=>{
    const drum=DRUMS.includes(ch.type),notes=[];
    if(song)S.clips.forEach(c=>{if(S.tracks[c.t]&&S.tracks[c.t].mute)return;(ch.notes[c.p]||[]).forEach(n=>notes.push({s:c.b*16+n.s,l:n.l,n:n.n,v:n.v}));});
    else(ch.notes[S.pat]||[]).forEach(n=>notes.push(n));
    if(!notes.length)return;
    const c=drum?9:nextCh(),nm=str(ch.name),evs=[{t:0,o:0,b:[0xff,0x03].concat(vlq(nm.length),nm)}];
    notes.forEach(n=>{
      const key=clamp(drum?(GM_DRUM[ch.type]||36)+(n.n-60):n.n+ch.pitch,0,127),vel=clamp(Math.round(n.v*127),1,127);
      evs.push({t:n.s*T,o:1,b:[0x90|c,key,vel]},{t:(n.s+n.l)*T,o:0,b:[0x80|c,key,0]});
    });
    tracks.push(trk(evs));
  });
  if(tracks.length<2){alert('Aucune note à exporter.');return;}
  const bytes=str('MThd').concat(u32(6),u16(1),u16(tracks.length),u16(96));
  tracks.forEach(t=>t.forEach(x=>bytes.push(x)));
  download(new Blob([new Uint8Array(bytes)],{type:'audio/midi'}),(song?'song':'pattern')+'-webstudio.mid');
  setHint('Export MIDI terminé ('+(tracks.length-1)+' piste(s)).');
}

function importMidiFile(f){
  f.arrayBuffer().then(ab=>{
    const d=new Uint8Array(ab);let p=0;
    const rd=n=>{let v=0;for(let i=0;i<n;i++)v=v*256+d[p++];return v;};
    const rv=()=>{let v=0,b;do{b=d[p++];v=v*128+(b&127);}while(b&128&&p<d.length);return v;};
    const tag=()=>String.fromCharCode(d[p],d[p+1],d[p+2],d[p+3]);
    if(tag()!=='MThd')throw new Error('format');p=4;
    const hl=rd(4);rd(2);const nt=rd(2),div=rd(2);p=8+hl;
    if(div&0x8000)throw new Error('smpte');
    const tracks=[];let bpm=null;
    for(let k=0;k<nt&&p+8<=d.length;k++){
      if(tag()!=='MTrk')break;p+=4;const len=rd(4),end=Math.min(d.length,p+len);
      let t=0,rs=0,name='',drum=false;const on={},notes=[];
      while(p<end){
        t+=rv();let st=d[p];if(st&0x80){p++;if(st<0xf0)rs=st;}else st=rs;
 if(st===0xff){const ty=d[p++],l=rv();
   if(ty===3&&!name)name=new TextDecoder().decode(d.slice(p,p+l));
          if(ty===0x51&&bpm==null)bpm=Math.round(60000000/((d[p]<<16)|(d[p+1]<<8)|d[p+2]));p+=l;}
        else if(st===0xf0||st===0xf7)p+=rv();
        else{const cmd=st&0xf0,c=st&15,a=d[p++],b=(cmd===0xc0||cmd===0xd0)?0:d[p++];
          if(cmd===0x90&&b>0){if(c===9)drum=true;(on[a]=on[a]||[]).push({t,v:b/127});}
   else if(cmd===0x80||(cmd===0x90&&b===0)){const s=on[a]&&on[a].shift();if(s)notes.push({t0:s.t,t1:t,n:a,v:s.v});}}
      }
      p=end;if(notes.length)tracks.push({name,notes,drum});
    }
    if(!tracks.length){alert('Aucune note trouvée dans ce fichier MIDI.');return;}
    const q=div/4;let maxS=0;
    tracks.forEach(tr=>tr.notes.forEach(n=>{n.s=Math.round(n.t0/q);n.l=Math.max(1,Math.round((n.t1-n.t0)/q));maxS=Math.max(maxS,n.s+1);}));
    const len=clamp(Math.ceil(maxS/16)*16,16,64),pi=S.patterns.length;
    S.patterns.push({name:('MIDI '+f.name.replace(/\.midi?$/i,'')).slice(0,24),len});S.channels.forEach(c=>c.notes.push([]));
    const mk=(type,name)=>{const ch=newChannel(S,type,name);const k=freeIns();ch.ins=k;if(k)S.inserts[k].name=ch.name;S.channels.push(ch);return ch;};
    const inv={};Object.entries(GM_DRUM).forEach(([ty,n])=>inv[n]=ty);
    tracks.forEach((tr,k)=>{
      const ns=tr.notes.filter(n=>n.s<len);
      if(tr.drum){
        const by={};ns.forEach(n=>{const ty=inv[n.n]||(n.n<37?'kick':n.n<41?'snare':n.n<47?'hat':n.n<52?'crash':'perc');(by[ty]=by[ty]||[]).push(n);});
        Object.entries(by).forEach(([ty,list])=>{const ch=S.channels.find(c=>c.type===ty)||mk(ty);
   list.forEach(n=>ch.notes[pi].push({s:n.s,n:60,l:1,v:n.v}));});
      }else{
        const avg=ns.reduce((a,n)=>a+n.n,0)/Math.max(1,ns.length);
 const ch=mk(avg<52?'bass':avg<64?'epiano':'lead',(tr.name||'MIDI '+(k+1)).slice(0,24));
 ns.forEach(n=>{let m=n.n;while(m<PR_LO)m+=12;while(m>PR_HI)m-=12;ch.notes[pi].push({s:n.s,n:m,l:clamp(n.l,1,len-n.s),v:n.v});});
      }
    });
    if(bpm)S.bpm=clamp(bpm,20,300);
    S.pat=pi;rebuild();renderAll();commit();
    setHint('MIDI importé dans le pattern « '+S.patterns[pi].name+' »'+(maxS>64?' (tronqué à 4 mesures)':''));
  }).catch(()=>alert('Fichier MIDI invalide ou non pris en charge.'));
}
(function(){
  const fm=el('input');fm.type='file';fm.id='fileMidi';fm.accept='.mid,.midi,audio/midi';fm.hidden=true;document.body.appendChild(fm);
  fm.onchange=e=>{const f=e.target.files[0];if(f)importMidiFile(f);e.target.value='';};
  window.addEventListener('drop',e=>{
    const fs=[...e.dataTransfer.files],isMid=f=>/\.midi?$/i.test(f.name),mids=fs.filter(isMid);if(!mids.length)return;
    e.preventDefault();e.stopImmediatePropagation();document.body.classList.remove('drag');
    mids.forEach(importMidiFile);const rest=fs.filter(f=>!isMid(f));if(rest.length)importSampleFiles(rest);
  },true);
})();
