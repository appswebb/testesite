import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve,relative} from 'node:path';

// The accent may be selected by a user at runtime. No static UI stylesheet
// may ship the retired forest/sage/lime/teal palette.
const docs=resolve(process.cwd(),'docs');
function files(folder){
 return readdirSync(folder,{withFileTypes:true}).flatMap(entry=>{
  const p=resolve(folder,entry.name);
  return entry.isDirectory()?files(p):(/\.(css|js|html|svg)$/.test(entry.name)?[p]:[]);
 });
}
function legacyGreen(r,g,b){
 const v=[r,g,b].map(x=>x/255),high=Math.max(...v),low=Math.min(...v),delta=high-low;
 if(!delta)return false;
 const l=(high+low)/2,s=delta/(1-Math.abs(2*l-1));
 let h=high===v[0]?((v[1]-v[2])/delta)%6:high===v[1]?(v[2]-v[0])/delta+2:(v[0]-v[1])/delta+4;
 h=(h*60+360)%360;
 return h>=65&&h<=184&&s>.064&&delta*255>=4;
}
function hexValue(hex){
 let s=hex.slice(1);
 if(s.length===3||s.length===4)s=s.slice(0,3).split('').map(c=>c+c).join('');
 if(s.length===8)s=s.slice(0,6);
 if(s.length!==6)return null;
 return [0,2,4].map(i=>parseInt(s.slice(i,i+2),16));
}
test('legacy green colors are not hardcoded in site pages, app scripts or styles',()=>{
 const failures=[];
 for(const file of files(docs)){
  const source=readFileSync(file,'utf8');
  for(const hit of source.matchAll(/#[0-9a-fA-F]{3,8}\b/g)){
   const color=hexValue(hit[0]);
   if(color&&legacyGreen(...color))failures.push(relative(docs,file)+': '+hit[0]);
  }
  for(const hit of source.matchAll(/\brgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+)?\s*\)/gi)){
   const rgb=hit.slice(1,4).map(Number);
   if(legacyGreen(...rgb))failures.push(relative(docs,file)+': '+hit[0]);
  }
 }
 assert.deepEqual(failures,[],'Use neutral CSS tokens or user-selected --ui-accent, not forest/teal/green');
});

test('installable PNG icons cannot reintroduce the retired green palette',()=>{
 for(const size of [192,512]){
  const file=readFileSync(resolve(docs,'icons','icon-'+size+'.png'));
  assert.equal(file.subarray(1,4).toString(),'PNG');
  let off=8,palette=null;
  while(off+12<=file.length){
   const len=file.readUInt32BE(off),type=file.toString('ascii',off+4,off+8);
   if(type==='PLTE'){palette=file.subarray(off+8,off+8+len);break}
   off+=len+12;
   if(type==='IEND')break;
  }
  assert.ok(palette,'Icon palette is missing at '+size+'px');
  for(let i=0;i<palette.length;i+=3){
   assert.ok(!legacyGreen(palette[i],palette[i+1],palette[i+2]),'Old green in icon '+size+'px palette entry '+i/3);
  }
 }
});
