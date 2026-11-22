// Génère webstudio/flp-run.html : copie de index.html + import automatique d'un .flp, pour test dans Edge headless
const fs=require('fs');
const flp=process.argv[2];
let h=fs.readFileSync('webstudio/index.html','utf8');
const b64=fs.readFileSync(flp).toString('base64');
const pre=`<script>window.__log=[];window.onerror=(m,s,l,c,e)=>{__log.push('ERREUR: '+m+' @'+(s||'').split('/').pop()+':'+l+':'+c);};
window.addEventListener('unhandledrejection',e=>__log.push('PROMESSE: '+(e.reason&&e.reason.stack||e.reason)));
window.alert=m=>__log.push('ALERT (bloquée): '+m);window.confirm=m=>{__log.push('CONFIRM (bloquée, répond non): '+m);return false;};
setInterval(()=>{const b=document.getElementById('flpOk');if(b){__log.push('DIALOGUE: '+document.getElementById('flpDlgText').textContent.replace(/\\n+/g,' | '));b.click();}},300);
const _ce=console.error;console.error=(...a)=>{__log.push('CONSOLE: '+a.join(' '));_ce(...a);};</script>`;
const post=`<script>setTimeout(()=>{try{
  const bin=atob('${b64}'),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
  const f=new File([u],'demo.flp');
  __log.push('typeof importFLP='+typeof importFLP+' accept='+document.getElementById('fileProj').accept);
  const dt=new DataTransfer();dt.items.add(f);
  if(location.hash==='#drop'){window.dispatchEvent(new DragEvent('drop',{dataTransfer:dt,bubbles:true,cancelable:true}));}
  else{const fp=document.getElementById('fileProj');fp.files=dt.files;fp.dispatchEvent(new Event('change'));}
}catch(e){__log.push('EXC: '+e.stack);}
setTimeout(()=>{try{__log.push('S: patterns='+S.patterns.length+' channels='+S.channels.length+' clips='+S.clips.length+' mode='+S.mode+' bpm='+S.bpm);
  __log.push('playlist DOM clips='+document.querySelectorAll('#plTracks .clip, .clip').length);}catch(e){__log.push('EXC2: '+e.stack);}
  const pre=document.createElement('pre');pre.id='TESTLOG';pre.textContent=__log.join('\\n');document.body.appendChild(pre);},2500);},800);</script>`;
h=h.replace('<head>','<head>'+pre).replace(/<\/body>(?![\s\S]*<\/body>)/,post+'</body>');
fs.writeFileSync('webstudio/flp-run.html',h);
console.log('flp-run.html écrit');
