import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import net from 'node:net';

const projectRoot=resolve(import.meta.dirname,'..');
const delay = ms => new Promise(resolve => setTimeout(resolve,ms));
async function freePort(){
  const server=net.createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;
}
async function startServer(port,dataDir){
  const child=spawn(process.execPath,['server.mjs'],{cwd:projectRoot,env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:dataDir},stdio:['ignore','pipe','pipe']});
  let logs='';child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>logs+=d);
  for(let i=0;i<80;i++){
    if(child.exitCode!==null)throw Error('O servidor encerrou: '+logs);
    try{const res=await fetch(`http://127.0.0.1:${port}/api/health`);if(res.ok)return child;}catch{}
    await delay(50);
  }
  child.kill('SIGTERM');throw Error('O servidor não iniciou: '+logs);
}
function sessionRequest(base,cookie=''){
  return async (path,method='GET',body,extraHeaders={})=>{
    const options={method,headers:{...extraHeaders}};
    if(cookie)options.headers.Cookie=cookie;
    if(body!==undefined){options.headers['Content-Type']='application/json';options.body=JSON.stringify(body);}
    const response=await fetch(base+path,options);
    const data=await response.json();
    return {response,data,cookie:response.headers.get('set-cookie')?.split(';')[0]};
  };
}
async function connectEvents(url,cookie){
  const ctrl=new AbortController();
  const resp=await fetch(url,{headers:{Cookie:cookie},signal:ctrl.signal});
  assert.equal(resp.status,200);
  const decoder=new TextDecoder();let buffer='';const captured=[];const waiters=[];
  async function consume(){
    try{for await(const chunk of resp.body){buffer+=decoder.decode(chunk,{stream:true});
      let split;
      while((split=buffer.indexOf('\n\n'))!==-1){
        const frame=buffer.slice(0,split);buffer=buffer.slice(split+2);
        const match=frame.match(/(?:^|\n)event: ([^\n]+)/);
        const matchData=frame.match(/(?:^|\n)data: ([^\n]+)/);
        if(!match || !matchData)continue;
        const item={type:match[1],data:JSON.parse(matchData[1])};captured.push(item);
        for(const waiter of [...waiters])if(waiter.type===item.type && waiter.predicate(item.data)){
          waiters.splice(waiters.indexOf(waiter),1);clearTimeout(waiter.timer);waiter.resolve(item.data);
        }
      }
    }}catch(err){if(err.name!=='AbortError')throw err;}
  }
  const promise=consume();
  function waitFor(type,predicate=()=>true,ms=4000){
    const match=captured.find(x=>x.type===type&&predicate(x.data));
    if(match)return Promise.resolve(match.data);
    return new Promise((resolve,reject)=>{
      const waiter={type,predicate,resolve,timer:setTimeout(()=>{
        waiters.splice(waiters.indexOf(waiter),1);reject(Error(`Evento ${type} não chegou`));
      },ms)};waiters.push(waiter);
    });
  }
  return {waitFor,close:()=>ctrl.abort(),promise};
}

test('conversas reais em duas sessões: presença, mensagens, edição, reação, exclusão e salas', {timeout:30000},async()=>{
  const temp=mkdtempSync(join(tmpdir(),'freq-test-'));
  const port=await freePort();const base=`http://127.0.0.1:${port}`;
  const server=await startServer(port,temp);
  const sources=[];
  try{
    const guest=sessionRequest(base);
    const noAuth=await guest('/api/rooms');assert.equal(noAuth.response.status,401);
    const invalid=await guest('/api/session','POST',{name:'<script>'});assert.equal(invalid.response.status,400);
    const joinedA=await guest('/api/session','POST',{name:'Pessoa A'});
    const joinedB=await guest('/api/session','POST',{name:'Pessoa B'});
    assert.equal(joinedA.response.status,200);assert.equal(joinedB.response.status,200);
    assert.ok(joinedA.cookie?.includes('freq_session='));
    const alice=sessionRequest(base,joinedA.cookie), bob=sessionRequest(base,joinedB.cookie);
    const streamA=await connectEvents(`${base}/api/events?room=geral`,joinedA.cookie);sources.push(streamA);
    const streamB=await connectEvents(`${base}/api/events?room=geral`,joinedB.cookie);sources.push(streamB);
    const present=await streamA.waitFor('presence',d=>d.users.length===2);
    assert.deepEqual(new Set(present.users.map(u=>u.name)),new Set(['Pessoa A','Pessoa B']));
    const text='Olá! Essa mensagem é realmente compartilhada em tempo real.';
    const sent=await alice('/api/rooms/geral/messages','POST',{text});
    assert.equal(sent.response.status,201);
    assert.equal((await streamB.waitFor('message',m=>m.id===sent.data.message.id)).text,text);
    const history=await bob('/api/rooms/geral/messages');
    assert.equal(history.data.messages.at(-1).text,text);
    const typed=await bob('/api/rooms/geral/typing','POST',{});
    assert.equal(typed.response.status,200);
    assert.equal((await streamA.waitFor('typing',m=>m.name==='Pessoa B')).name,'Pessoa B');
    const edit=await alice(`/api/rooms/geral/messages/${sent.data.message.id}`,'PATCH',{text:'Mensagem atualizada'});
    assert.equal(edit.response.status,200);
    assert.equal((await streamB.waitFor('message_update',m=>m.id===sent.data.message.id && m.editedAt)).text,'Mensagem atualizada');
    const forbidden=await bob(`/api/rooms/geral/messages/${sent.data.message.id}`,'DELETE');
    assert.equal(forbidden.response.status,403);
    const react=await bob('/api/rooms/geral/reactions','POST',{messageId:sent.data.message.id,emoji:'❤️'});
    assert.equal(react.response.status,200);
    assert.equal(react.data.message.reactions['❤️'].length,1);
    const deleted=await alice(`/api/rooms/geral/messages/${sent.data.message.id}`,'DELETE');
    assert.equal(deleted.response.status,200);
    assert.equal(deleted.data.message.deleted,true);
    assert.equal(deleted.data.message.text,'');
    const created=await alice('/api/rooms','POST',{name:'Minha conversa',description:'Só papo interessante',icon:'coffee'});
    assert.equal(created.response.status,201);
    const roomList=await bob('/api/rooms');
    assert.equal(roomList.data.rooms.find(r=>r.id===created.data.room.id).name,'Minha conversa');
    const crossOrigin=await alice('/api/rooms','POST',{name:'Outra sala'}, {'Origin':'https://origem-externa.com'});
    assert.equal(crossOrigin.response.status,403);
    const disk=JSON.parse(readFileSync(join(temp,'store.json'),'utf8'));
    assert.equal(disk.rooms.some(r=>r.name==='Minha conversa'),true);
    assert.equal(disk.messages.geral[0].deleted,true);
    assert.ok(disk.sessions[joinedA.cookie.split('=')[1]],'Sessão persistida');
  } finally {
    for(const source of sources)source.close();
    server.kill('SIGTERM');
    await Promise.race([new Promise(r=>server.once('exit',r)),delay(1500)]);
    rmSync(temp,{recursive:true,force:true});
  }
});
