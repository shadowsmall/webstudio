// Lit #TESTLOG d'une page ouverte dans Edge (--remote-debugging-port=9333) jusqu'à "FIN" ou délai dépassé
const port=9333,limit=+(process.argv[2]||60000),t0=Date.now();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  let page=null;
  while(!page&&Date.now()-t0<15000){try{const l=await (await fetch(`http://127.0.0.1:${port}/json`)).json();page=l.find(p=>p.type==='page'&&/mix-run|fl-run|st-run/.test(p.url));}catch(e){}if(!page)await sleep(300);}
  if(!page){console.log('page introuvable');process.exit(1);}
  const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
  let id=0;const pend={};ws.onmessage=m=>{const d=JSON.parse(m.data);if(pend[d.id]){pend[d.id](d);delete pend[d.id];}};
  const ev=expr=>new Promise(r=>{const i=++id;pend[i]=r;ws.send(JSON.stringify({id:i,method:'Runtime.evaluate',params:{expression:expr,returnByValue:true}}));});
  let txt='';
  while(Date.now()-t0<limit){const r=await ev("(document.getElementById('TESTLOG')||{}).textContent||''");txt=r.result&&r.result.result&&r.result.result.value||'';if(/\nFIN$/.test(txt))break;await sleep(500);}
  console.log(txt||'(journal vide)');ws.close();process.exit(0);
})();
