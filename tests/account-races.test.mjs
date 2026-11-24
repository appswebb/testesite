import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../docs/'+p,import.meta.url),'utf8');
const app=read('app.js');
test('old conversation response cannot overwrite another account',async()=>{
 const state={session:{user:{id:'a'}},profile:{id:'a'},pairs:[{id:'keep'}],pairsProfiles:{}};
 let finish;const pending=new Promise(r=>{finish=r});const db={from:()=>({select:()=>({or:()=>({in:()=>({order:()=>({limit:()=>pending})})})})})};
 const fn=new Function('state','db','window','signAvatar',app.slice(app.indexOf('let pairsLoadSeq=0;'),app.indexOf('async function initializeAccount()'))+';return loadPairs;')(state,db,{},()=>{});
 const work=fn();state.session={user:{id:'b'}};finish({data:[{id:'old'}]});await work;assert.deepEqual(state.pairs,[{id:'keep'}]);
});
test('avatar and conversation queries verify the current user before writing',()=>{assert.match(app,/state\.session\?\.user\?\.id!==owner\)return false/);assert.match(app,/revision!==messageRevision/);assert.match(app,/status==='SUBSCRIBED'&&state\.session\?\.user\?\.id===owner/);assert.match(app,/state\.pairs=pairs;state\.pairsProfiles=map/);});
test('feed clears private account-specific data and preserves a newly typed draft',()=>{const s=read('entre-features.js');assert.match(s,/feedOwner=uid;feedLoaded=false;feedError='';data\.posts=\[\]/);assert.match(s,/feedDraft\.trim\(\)===\(body\|\|''\)/);assert.match(s,/seq!==feedLoadSeq/);});
test('social state is cleared when account changes',()=>{const s=read('social-core.js');const a=s.indexOf('let socialOwner=null,'),b=s.indexOf('async function init()',a);const state={session:{user:{id:'a'}}},data={notifications:[{id:1}],online:[{}],bulletins:[{}]};const reset=new Function('state','data','resetForeground',s.slice(a,b)+';return resetAccount;')(state,data,()=>{});reset();data.notifications=[{id:9}];state.session={user:{id:'b'}};reset();assert.deepEqual(data.notifications,[]);assert.deepEqual(data.online,[]);assert.deepEqual(data.bulletins,[]);});
