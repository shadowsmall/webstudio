// Test hors navigateur de js/flp.js (fichier temporaire, peut être supprimé)
const fs=require('fs');
const src=fs.readFileSync('webstudio/js/flp.js','utf8');
global.TYPE_NAMES={kick:'Kick',snare:'Snare',clap:'Clap',hat:'Hi-hat',ohat:'Open hat',tom:'Tom',perc:'Cowbell',bass:'Synth Bass',lead:'Synth Lead',pad:'Synth Pad',pluck:'Synth Pluck',sampler:'Sampler',crash:'Crash',rim:'Rim',shaker:'Shaker',conga:'Conga',fm:'FM',supersaw:'Super Saw',organ:'Orgue',sub808:'808',kspluck:'KS',epiano:'E-Piano',strings:'Cordes'};
global.SYNTHS=['bass','lead','pad','pluck','fm','supersaw','organ','sub808','kspluck','epiano','strings'];
global.GM_DRUM={kick:36,snare:38,clap:39,hat:42,ohat:46,tom:45,perc:56,crash:49,rim:37,shaker:70,conga:63};
Object.assign(global,{NINS:12,NTRACKS:32,NBARS:160,PR_LO:24,PR_HI:96,SAMPLES:{},S:null});
global.clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
global.baseProject=()=>({bpm:128,mode:'pat',patterns:[{name:'Pattern 1',len:16}],channels:[],nextId:1,
  tracks:Array.from({length:32},(_,i)=>({name:'Piste '+(i+1)})),clips:[],inserts:Array.from({length:13},()=>({name:''}))});
global.newChannel=(P,type,name)=>({id:P.nextId++,type,name,notes:P.patterns.map(()=>[])});
global.normalize=P=>P;
['stop','saveSamples','afterLoad','commit','setHint'].forEach(k=>global[k]=()=>{});
global.confirm=()=>true;
let done;global.alert=m=>{console.log(m);done();};
eval(src.slice(0,src.lastIndexOf('(function(){')).replace(/^function (\w+)/gm,'global.$1=function $1'));
(async()=>{
  for(const f of process.argv.slice(2)){
    const buf=fs.readFileSync(f),ab=buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.length);
    await new Promise(r=>{done=r;importFLP({name:f.split(/[\\/]/).pop(),arrayBuffer:()=>Promise.resolve(ab)});});
    const P=global.S,errs=[];
    P.channels.forEach(c=>c.notes.forEach((a,pi)=>a.forEach(n=>{const L=P.patterns[pi].len;
      if(!(n.s>=0&&n.s<L&&n.l>=1&&n.s+n.l<=L&&n.n>=24&&n.n<=96&&n.v>0&&n.v<=1))errs.push(c.name+' p'+pi+' '+JSON.stringify(n));})));
    P.clips.forEach(c=>{if(!(c.t>=0&&c.t<32&&c.b>=0&&c.b<160&&P.patterns[c.p]))errs.push('clip '+JSON.stringify(c));});
    console.log('Canaux :',P.channels.map(c=>c.name+' → '+c.type).join(' | '));
    console.log('Incohérences :',errs.length,errs.slice(0,3).join(' ; '),'\n');
  }
})();
