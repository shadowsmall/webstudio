"use strict";
/* ===== WebStudio – clavier MIDI, enregistrement du micro et de la sortie ===== */
let midiAcc=null;const midiHeld={};
function enableMidi(){
  if(!navigator.requestMIDIAccess){alert('Ton navigateur ne gère pas le Web MIDI (utilise Chrome ou Edge).');return;}
  navigator.requestMIDIAccess().then(m=>{
    midiAcc=m;
    const bind=()=>{let n=0;m.inputs.forEach(inp=>{inp.onmidimessage=onMidi;n++;});
      setHint(n?'MIDI activé : '+n+' appareil(s). Tu joues sur le canal sélectionné.':'MIDI activé, aucun clavier détecté : branche-le, il sera reconnu automatiquement.');};
    bind();m.onstatechange=bind;
  }).catch(()=>alert('Accès MIDI refusé.'));
}
function onMidi(e){
  const st=e.data[0],d1=e.data[1],d2=e.data[2],cmd=st&0xf0;
  if(cmd===0x90&&d2>0){
    if(midiHeld[d1])noteOff(midiHeld[d1]);
    const pv=S.prVel;S.prVel=d2/127;midiHeld[d1]=noteOn(S.sel,d1)||{};S.prVel=pv;
  }else if(cmd===0x80||(cmd===0x90&&d2===0)){
    if(midiHeld[d1]){noteOff(midiHeld[d1]);delete midiHeld[d1];}
  }else if(cmd===0xB0&&d1===7){
    const ch=S.channels[S.sel];if(ch){ch.vol=d2/127;applyParams(E);commitSoon();}
  }
}

let micRec=null,micStream=null,outRec=null,outDest=null;
function recBtnState(){
  const m=$('#tbMic'),o=$('#tbOut');
  if(m)m.classList.toggle('rec',!!micRec);if(o)o.classList.toggle('rec',!!outRec);
}
async function toggleMic(){
  if(micRec){micRec.stop();return;}
  if(!navigator.mediaDevices||!window.MediaRecorder){alert("L'enregistrement audio n'est pas disponible dans ce navigateur.");return;}
  ensureAudio();
  try{micStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});}
  catch(e){alert("Accès au micro refusé ou indisponible. Si la page est ouverte comme fichier, essaie plutôt http://localhost:5173.");return;}
  const chunks=[];micRec=new MediaRecorder(micStream);
  micRec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  micRec.onstop=()=>{
    micStream.getTracks().forEach(t=>t.stop());const type=micRec.mimeType||'audio/webm';micRec=null;recBtnState();
    const d=new Date(),name='Micro '+[d.getHours(),d.getMinutes(),d.getSeconds()].map(x=>String(x).padStart(2,'0')).join('-')+(type.includes('ogg')?'.ogg':'.webm');
    importSampleFiles([new File([new Blob(chunks,{type})],name,{type})]);
  };
  micRec.start();recBtnState();setHint('🎙 Enregistrement du micro… reclique sur 🎙 pour arrêter. Le son deviendra un canal Sampler.');
}
function connectOut(){if(outDest&&E&&E.masterAn){try{E.masterAn.connect(outDest);}catch(e){}}}
function toggleOutRec(){
  if(outRec){outRec.stop();return;}
  if(!window.MediaRecorder){alert("L'enregistrement audio n'est pas disponible dans ce navigateur.");return;}
  ensureAudio();outDest=ac.createMediaStreamDestination();connectOut();
  const chunks=[];outRec=new MediaRecorder(outDest.stream);
  outRec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  outRec.onstop=()=>{
    const type=outRec.mimeType||'audio/webm';outRec=null;
    try{E.masterAn.disconnect(outDest);}catch(e){}outDest=null;recBtnState();
    download(new Blob(chunks,{type}),'enregistrement-webstudio.'+(type.includes('ogg')?'ogg':'webm'));setHint('Enregistrement de la sortie téléchargé.');
  };
  outRec.start();recBtnState();setHint('⏺ Enregistrement de tout ce que tu entends… reclique sur ⏺ pour arrêter et télécharger.');
}
const _rbM=rebuild;rebuild=function(){_rbM();connectOut();};
