import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {webcrypto} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const adapter=readFileSync(fileURLToPath(new URL('../docs/pages-adapter.js',import.meta.url)),'utf8');
const text=new TextEncoder(), decoder=new TextDecoder();
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const bytes=s=>text.encode(s);
const pack=str=>{const b=bytes(str);return Uint8Array.from([b.length>>8,b.length&255,...b]);};
function packet(h,p){let n=p.length;const len=[];do{let b=n%128;n=Math.floor(n/128);if(n)b|=128;len.push(b)}while(n);return Uint8Array.from([h,...len,...p]);}
function parse(raw){const b=new Uint8Array(raw);let size=0,i=1,mult=1,oct;do{oct=b[i++];size+=(oct&127)*mult;mult*=128;}while(oct&128);return {h:b[0],data:b.slice(i,i+size)};}
function serverMessage(ws,header,data){ws.onmessage?.({data:packet(header,data).buffer});}
const sockets=new Set(),retain=new Map();
class Socket {
  static OPEN=1;
  constructor(url,protocol){
    assert.equal(protocol,'mqtt');assert.match(url,/wss:\/\//);
    this.readyState=0;this.subscribed=false;sockets.add(this);
    queueMicrotask(()=>{this.readyState=1;this.onopen?.();});
  }
  send(raw){
    const {h,data}=parse(raw),kind=h>>4;
    if(kind===1){queueMicrotask(()=>serverMessage(this,0x20,Uint8Array.of(0,0)));}
    if(kind===8){this.subscribed=true;queueMicrotask(()=>{
      serverMessage(this,0x90,Uint8Array.of(data[0],data[1],0));
      for(const [topic,payload] of retain)queueMicrotask(()=>publishTo(this,topic,payload));
    });}
    if(kind===3){const n=(data[0]<<8)|data[1];const topic=decoder.decode(data.slice(2,2+n));let p=2+n,id=0;
      if(h&2){id=(data[p]<<8)|data[p+1];p+=2;}
      const payload=data.slice(p);
      if(h&1){if(payload.length)retain.set(topic,payload);else retain.delete(topic);}
      for(const sock of sockets)if(sock.subscribed)queueMicrotask(()=>publishTo(sock,topic,payload));
      if(h&2)queueMicrotask(()=>serverMessage(this,0x40,Uint8Array.of(id>>8,id&255)));
    }
  }
  close(){this.readyState=3;sockets.delete(this);this.onclose?.();}
}
function publishTo(sock,topic,payload){if(sock.readyState!==1)return;serverMessage(sock,0x30,Uint8Array.from([...pack(topic),...payload]));}
function browser(){
  const store=new Map();
  const window={localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},crypto:webcrypto,fetch:()=>Promise.reject(Error('network must not be used')),addEventListener(){}};
  const vars={window,location:new URL('https://appswebb.github.io/testesite/'),URL,Response,EventTarget,MessageEvent,WebSocket:Socket,TextEncoder,TextDecoder,Uint8Array,setTimeout,clearTimeout,setInterval:()=>0,clearInterval:()=>{},queueMicrotask,Date,Map,Set,Promise};
  runInNewContext(adapter,vars);
  const api=async(path,method='GET',body)=>{const res=await window.fetch(path,{method,body:body===undefined?undefined:JSON.stringify(body)});const data=await res.json();if(!res.ok)throw Error(data.error);return data;};
  return {api,subscribe:room=>new window.EventSource(`/api/events?room=${room}`)};
}

test('GitHub Pages: two actual independent clients share rooms, messages, presence, edits, reactions and deletes',async()=>{
  const a=browser(),b=browser();
  const alice=(await a.api('/api/session','POST',{name:'Alice'})).me;
  const bob=(await b.api('/api/session','POST',{name:'Bruno'})).me;
  const as=a.subscribe('geral'),bs=b.subscribe('geral');
  const people=[];
  bs.addEventListener('presence',e=>people.push(JSON.parse(e.data).users));
  await pause(60);
  const list=await b.api('/api/rooms');
  assert.ok(list.rooms.some(r=>r.id==='geral'));
  await pause(1100);
  assert.ok(people.some(users=>users.some(p=>p.name==='Alice')&&users.some(p=>p.name==='Bruno')));
  const created=await a.api('/api/rooms/geral/messages','POST',{text:'Olá, ao vivo!'});
  await pause(50);
  const bMsgs=await b.api('/api/rooms/geral/messages');
  assert.equal(bMsgs.messages.at(-1).text,'Olá, ao vivo!');
  assert.equal(bMsgs.messages.at(-1).userId,alice.id);
  await a.api(`/api/rooms/geral/messages/${created.message.id}`,'PATCH',{text:'Mensagem editada'});
  await pause(70);
  assert.equal((await b.api('/api/rooms/geral/messages')).messages.at(-1).text,'Mensagem editada');
  await b.api('/api/rooms/geral/reactions','POST',{messageId:created.message.id,emoji:'🔥'});
  await pause(70);
  assert.deepEqual((await a.api('/api/rooms/geral/messages')).messages.at(-1).reactions['🔥'],[bob.id]);
  await a.api(`/api/rooms/geral/messages/${created.message.id}`,'DELETE');
  await pause(70);
  assert.equal((await b.api('/api/rooms/geral/messages')).messages.at(-1).deleted,true);
  const newRoom=(await a.api('/api/rooms','POST',{name:'Sala da galera',description:'Papo livre',icon:'zap'})).room;
  await pause(40);
  assert.ok((await b.api('/api/rooms')).rooms.some(r=>r.id===newRoom.id));
  as.close();bs.close();
});
