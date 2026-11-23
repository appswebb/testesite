/*
 * freq. GitHub Pages adapter — browser-only transport over a public MQTT relay.
 * GitHub Pages hosts the frontend. A public broker routes real-time messages.
 * Rooms and messages are PUBLIC on that broker; no private content or auth.
 */
(() => {
  'use strict';
  const ROOT = 'freq-v1-appswebb-testesite-112326';
  const BROKER = 'wss://broker.emqx.io:8084/mqtt';
  const utf8 = new TextEncoder();
  const decode = new TextDecoder();
  const local = window.localStorage;
  const DEFAULT = [
    ['geral','Praça central','Tudo começa com uma boa conversa.','message-circle'],
    ['musica','No repeat','Sons, artistas e descobertas.','music-2'],
    ['ideias','Fora da caixa','Ideias que merecem ser ouvidas.','lightbulb'],
    ['madrugada','Depois das 00h','Conversas sem hora para acabar.','moon'],
    ['aleatorio','Sem contexto','O assunto é o que aparecer.','shuffle']
  ].map(([id,name,description,icon]) => ({id,name,description,icon,system:true}));
  const rooms = new Map(DEFAULT.map(room => [room.id,room]));
  const histories = new Map();
  const presence = new Map();
  const subscriptions = new Set();
  const readJson = (key) => { try { return JSON.parse(local.getItem(key) || 'null'); } catch { return null; } };
  const uuid = () => window.crypto.randomUUID?.() || Array.from(window.crypto.getRandomValues(new Uint8Array(16)), x=>x.toString(16).padStart(2,'0')).join('');
  const tabId = uuid();
  let me = readJson('freq_public_user');
  let connection = null, connecting = null, connected = false, packetId = 1, generation = 0;
  let pulseTimer = null, reconnectTimer = null, activeRoom = null, lastAttempt = 0, initialSync = false;
  const ackWaiters = new Map();
  const nameOK = n => typeof n === 'string' && n.trim().length >= 2 && n.trim().length <= 24 && /^[\p{L}\p{N} ._-]+$/u.test(n.trim());
  const packedString = s => { const b = utf8.encode(s); return Uint8Array.from([b.length >> 8, b.length & 255, ...b]); };
  const joinBytes = (...arrays) => {const n=arrays.reduce((v,a)=>v+a.length,0),out=new Uint8Array(n);let i=0;for(const a of arrays){out.set(a,i);i+=a.length;}return out;};
  function varint(n) { const out=[]; do {let v=n%128;n=Math.floor(n/128);if(n)v|=128;out.push(v);}while(n);return Uint8Array.from(out); }
  function packet(header,payload) { return joinBytes(Uint8Array.of(header),varint(payload.length),payload); }
  function sendBinary(data) {if(!connected || connection?.readyState!==WebSocket.OPEN)throw new Error('Sem conexão ao vivo. Aguarde a reconexão.');connection.send(data);}
  function emitTo(room,type,data) {
    for(const target of subscriptions) if(!target.closed && (type==='rooms'||type==='ready'||type==='error'||target.room===room)) {
      target.dispatchEvent(new MessageEvent(type,{data: JSON.stringify(data)}));
    }
  }
  function getPeople(room) {
    const now = Date.now(), people = new Map();
    for(const [topic,item] of presence) {
      if(now-item.at>68000){presence.delete(topic);continue;}
      if(item.room!==room || !item.user?.id)continue;
      people.set(item.user.id, item.user);
    }
    if(me && room===activeRoom)people.set(me.id,me);
    return [...people.values()];
  }
  function roomsPayload() {
    const arr=[...rooms.values()].slice(0,40).map(room=>{
      const list=[...(histories.get(room.id)?.values()||[])].filter(x=>!x.deleted).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
      const last=list[0];
      return {...room,online:getPeople(room.id).length,lastMessage:last?{name:last.userName,text:last.text,at:last.createdAt}:null};
    });
    return {rooms:arr,totalOnline:new Set([...presence.values()].filter(x=>Date.now()-x.at<68000).map(x=>x.user?.id)).size+(me&&![...presence.values()].some(x=>x.user?.id===me.id)?1:0)};
  }
  function updatePresence(room){emitTo(room,'presence',{roomId:room,users:getPeople(room)});emitTo(room,'rooms',roomsPayload());}
  function updateRooms(){emitTo(null,'rooms',roomsPayload());}
  function publish(topic,value,{retain=false,ack=false}={}) {
    if(!connected)return Promise.reject(new Error('Sem conexão ao vivo. Aguarde a reconexão.'));
    const raw=typeof value==='string'?value:JSON.stringify(value);
    const body=utf8.encode(raw), head=packedString(topic);
    if(!ack){sendBinary(packet(0x30|(retain?1:0),joinBytes(head,body)));return Promise.resolve();}
    const id=nextPacketId(),pub=packet(0x32|(retain?1:0),joinBytes(head,Uint8Array.of(id>>8,id&255),body));
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{ackWaiters.delete(id);reject(new Error('Não foi possível confirmar o envio.'));},7000);
      ackWaiters.set(id,{resolve,reject,timer});
      try{sendBinary(pub);}catch(error){clearTimeout(timer);ackWaiters.delete(id);reject(error);}
    });
  }
  function nextPacketId(){packetId=packetId%65535+1;return packetId;}
  function presenceTopic(room){return `${ROOT}/presence/${room}/${tabId}`;}
  function pulse(){
    if(!me || !activeRoom || !connected)return;
    const item={room:activeRoom,user:me,at:Date.now()};
    presence.set(presenceTopic(activeRoom),item);
    publish(presenceTopic(activeRoom),item,{retain:true}).catch(()=>{});
    updatePresence(activeRoom);
  }
  function offline(room){
    if(!room)return;
    presence.delete(presenceTopic(room));updatePresence(room);
    if(connected)publish(presenceTopic(room),'',{retain:true}).catch(()=>{});
  }
  function onPayload(topic,raw){
    if(!topic.startsWith(`${ROOT}/`))return;
    const fields=topic.slice(ROOT.length+1).split('/');
    const type=fields[0],room=fields[1];
    if(type==='presence') {
      if(!raw){presence.delete(topic);updatePresence(room);return;}
      try {
        const item=JSON.parse(raw);
        if(item.room!==room||!item.user||typeof item.at!=='number'||typeof item.user.id!=='string'||typeof item.user.name!=='string')return;
        presence.set(topic,item);updatePresence(room);
      }catch { /* Ignore malformed public messages */ }
    }else if(type==='room'){
      if(!raw)return;
      try {
        const value=JSON.parse(raw);
        if(typeof value.id!=='string'||value.id!==room||!/^sala-[a-f0-9]{12}$/.test(room)||typeof value.name!=='string'||value.name.length>30)return;
        rooms.set(value.id,{...value,system:false});updateRooms();
      }catch { /* Ignore malformed public messages */ }
    }else if(type==='message') {
      if(!raw)return;
      try {
        const item=JSON.parse(raw);
        if(item.roomId!==room||item.id!==fields[2]||typeof item.id!=='string'||!/^m-[a-f0-9-]{10,50}$/.test(item.id)||typeof item.text!=='string'||item.text.length>1200||typeof item.userName!=='string'||item.userName.length>24||!item.userId||!Number.isFinite(Date.parse(item.createdAt)))return;
        if(!histories.has(room))histories.set(room,new Map());
        const saved=histories.get(room),previous=saved.get(item.id);
        saved.set(item.id,item);
        emitTo(room,previous?'message_update':'message',item);
        updateRooms();
      }catch { /* Ignore malformed public messages */ }
    }else if(type==='typing'){
      if(!raw)return;
      try{const item=JSON.parse(raw);if(item.roomId===room && item.userId && typeof item.name==='string')emitTo(room,'typing',item);}catch{}
    }
  }
  function mqttFrame(bytes){
    const b=new Uint8Array(bytes);let offset=1,mult=1,len=0,octet;
    do {if(offset>=b.length)return;octet=b[offset++];len+=(octet&127)*mult;mult*=128;}while((octet&128)&&offset<6);
    if(offset+len>b.length)return;
    const data=b.subarray(offset,offset+len),kind=b[0]>>4;
    if(kind===2){
      if(data[1]!==0){connection?.close();return;}
      // Subscribe to all project topics so retained public rooms/messages are loaded.
      const id=nextPacketId();sendBinary(packet(0x82,joinBytes(Uint8Array.of(id>>8,id&255),packedString(`${ROOT}/#`),Uint8Array.of(0))));
    }else if(kind===9){
      if(data[2]===0x80){connection?.close();return;}
      initialSync=true;
      pulse();setTimeout(()=>{if(connected){emitTo(null,'ready',{});updateRooms();if(activeRoom)updatePresence(activeRoom);}},300);
    }else if(kind===3){
      if(data.length<2)return;
      const n=(data[0]<<8)|data[1];if(2+n>data.length)return;
      const topic=decode.decode(data.subarray(2,2+n));let p=2+n;
      if((b[0]&6)>>1){if(p+2>data.length)return;const id=(data[p]<<8)|data[p+1];p+=2;sendBinary(packet(0x40,Uint8Array.of(id>>8,id&255)));}
      onPayload(topic,decode.decode(data.subarray(p)));
    }else if(kind===4){
      const id=(data[0]<<8)|data[1],waiter=ackWaiters.get(id);
      if(waiter){clearTimeout(waiter.timer);ackWaiters.delete(id);waiter.resolve();}
    }
  }
  function scheduleReconnect(){
    if(reconnectTimer)return;
    const backoff=Math.min(10000,Math.max(1000,Date.now()-lastAttempt<4000?3500:1000));
    reconnectTimer=setTimeout(()=>{reconnectTimer=null;connect().catch(()=>{});},backoff);
  }
  function connect() {
    if(connected)return Promise.resolve();
    if(connecting)return connecting;
    const thisGeneration=++generation;lastAttempt=Date.now();
    connecting=new Promise((resolve,reject)=>{
      let started=false,completed=false;
      function finish(err){if(completed)return;completed=true;clearTimeout(timeout);connecting=null;err?reject(err):resolve();}
      let ws;
      try{ws=new WebSocket(BROKER,'mqtt');}catch(err){reject(err);connecting=null;scheduleReconnect();return;}
      connection=ws;ws.binaryType='arraybuffer';
      const timeout=setTimeout(()=>{if(!connected){ws.close();finish(new Error('Tempo de conexão esgotado.'));}},9000);
      ws.onopen=()=>{
        if(thisGeneration!==generation)return;
        connected=true;started=true;
        const payload=joinBytes(packedString('MQTT'),Uint8Array.of(4,2,0,50),packedString(`freq_${tabId.slice(0,18)}`));
        sendBinary(packet(0x10,payload));
        clearTimeout(timeout);finish();
        if(!pulseTimer)pulseTimer=setInterval(()=>{if(connected){try{sendBinary(packet(0xc0,new Uint8Array(0)));pulse();}catch{} }for(const room of rooms.keys())updatePresence(room);},25000);
      };
      ws.onmessage=e=>{if(thisGeneration===generation)mqttFrame(e.data);};
      ws.onerror=()=>{if(!started)finish(new Error('Conexão com o serviço público de chat indisponível.'));};
      ws.onclose=()=>{
        if(thisGeneration!==generation)return;
        connected=false;initialSync=false;emitTo(null,'error',{});
        for(const wait of ackWaiters.values()){clearTimeout(wait.timer);wait.reject(new Error('Conexão interrompida.'));}ackWaiters.clear();
        if(!started)finish(new Error('Servidor de mensagens indisponível.'));
        scheduleReconnect();
      };
    });
    return connecting;
  }
  // A minimal EventSource-compatible adapter for the existing UI.
  class LiveEvents extends EventTarget {
    constructor(url){
      super();this.closed=false;this.room=new URL(url,location.origin).searchParams.get('room')||'geral';
      subscriptions.add(this);
      if(activeRoom!==this.room){offline(activeRoom);activeRoom=this.room;}
      if(connected && initialSync){queueMicrotask(()=>{if(!this.closed){this.dispatchEvent(new MessageEvent('ready',{data:'{}'}));pulse();updateRooms();updatePresence(this.room);}});}
      else connect().catch(()=>{emitTo(null,'error',{});});
    }
    close(){if(this.closed)return;this.closed=true;subscriptions.delete(this);if(this.room===activeRoom){offline(this.room);activeRoom=null;}}
  }
  function success(value,status=200){return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});}
  function failure(message,status=400){return success({error:message},status);}
  function snapshot(room,before){
    const all=[...(histories.get(room)?.values()||[])].sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt));
    const i=before?all.findIndex(x=>x.id===before):all.length;
    const end=i<0?0:i;
    return {messages:all.slice(Math.max(0,end-60),end),hasMore:end>60};
  }
  async function api(path,options={}){
    const method=options.method||'GET',url=new URL(path,location.origin),p=url.pathname.split('/').filter(Boolean);
    if(p[0]!=='api')return failure('Caminho não encontrado.',404);
    let body={};try{if(options.body)body=JSON.parse(options.body);}catch{return failure('JSON inválido.');}
    if(p[1]==='me'&&method==='GET')return success({me});
    if(p[1]==='session'&&method==='POST'){
      if(!nameOK(body.name))return failure('Apelido: 2 a 24 caracteres; letras, números, espaços, ponto, _ ou -.');
      me=me||{id:uuid(),color:['#D9FC6C','#A9BFFF','#FFB6A7','#D3ACFF','#89E6D3','#FFC884'][Math.floor(Math.random()*6)]};
      me.name=body.name.trim();local.setItem('freq_public_user',JSON.stringify(me));pulse();return success({me});
    }
    if(p[1]==='logout'&&method==='POST'){
      offline(activeRoom);me=null;local.removeItem('freq_public_user');return success({ok:true});
    }
    if(!me)return failure('Entre para continuar.',401);
    if(p[1]==='profile'&&method==='PATCH'){
      if(!nameOK(body.name))return failure('Digite um apelido válido (2 a 24 caracteres).');
      me.name=body.name.trim();local.setItem('freq_public_user',JSON.stringify(me));pulse();return success({me});
    }
    if(p[1]==='rooms'&&p.length===2&&method==='GET')return success(roomsPayload());
    if(p[1]==='rooms'&&p.length===2&&method==='POST'){
      const name=typeof body.name==='string'?body.name.trim():'';
      const description=typeof body.description==='string'?body.description.trim():'';
      if(name.length<3||name.length>30||/[<>\r\n]/.test(name))return failure('Nome da sala: de 3 a 30 caracteres.');
      if(description.length>100||/[<>\r\n]/.test(description))return failure('Descrição inválida (máximo 100 caracteres).');
      if(rooms.size>=40)return failure('Limite de salas atingido.',409);
      const room={id:`sala-${uuid().replace(/-/g,'').slice(0,12)}`,name,description:description||'Um espaço para conversar.',icon:['message-circle','music-2','lightbulb','moon','shuffle','coffee','gamepad-2','heart','zap'].includes(body.icon)?body.icon:'message-circle',createdBy:me.id,createdAt:new Date().toISOString()};
      try{await publish(`${ROOT}/room/${room.id}`,room,{retain:true,ack:true});rooms.set(room.id,room);updateRooms();return success({room:{...room,online:0,lastMessage:null}},201);}catch(err){return failure(err.message,503);}
    }
    if(p[1]==='rooms'&&p.length>=4){
      const room=p[2];if(!rooms.has(room))return failure('Sala não encontrada.',404);
      if(p[3]==='messages'&&p.length===4&&method==='GET'){
        try{await connect();await new Promise(resolve=>setTimeout(resolve,initialSync?550:1300));if(!connected||!initialSync)throw Error('Ainda conectando ao serviço de conversa.');return success(snapshot(room,url.searchParams.get('before')));}catch(err){return failure(err.message,503);}
      }
      if(p[3]==='messages'&&p.length===4&&method==='POST'){
        const text=typeof body.text==='string'?body.text.trim():'';
        if(!text||text.length>1200)return failure('Mensagem inválida (máximo de 1.200 caracteres).');
        const parent=histories.get(room)?.get(body.replyTo);
        const message={id:`m-${uuid()}`,roomId:room,userId:me.id,userName:me.name,userColor:me.color,text,createdAt:new Date().toISOString(),editedAt:null,deleted:false,reactions:{},replyTo:parent?{userName:parent.userName,text:parent.text}:null};
        try{await publish(`${ROOT}/message/${room}/${message.id}`,message,{retain:true,ack:true});onPayload(`${ROOT}/message/${room}/${message.id}`,JSON.stringify(message));return success({message},201);}catch(err){return failure(err.message,503);}
      }
      if(p[3]==='messages'&&p.length===5&&(method==='PATCH'||method==='DELETE')){
        const old=histories.get(room)?.get(p[4]);if(!old)return failure('Mensagem não encontrada.',404);
        if(old.userId!==me.id)return failure('Você só pode alterar mensagens próprias.',403);
        const text=typeof body.text==='string'?body.text.trim():'';
        if(method==='PATCH'&&(!text||text.length>1200))return failure('Mensagem inválida.');
        const item={...old,text:method==='PATCH'?text:old.text,deleted:method==='DELETE',editedAt:new Date().toISOString()};
        try{await publish(`${ROOT}/message/${room}/${item.id}`,item,{retain:true,ack:true});onPayload(`${ROOT}/message/${room}/${item.id}`,JSON.stringify(item));return success({message:item});}catch(err){return failure(err.message,503);}
      }
      if(p[3]==='reactions'&&method==='POST'){
        const old=histories.get(room)?.get(body.messageId);if(!old)return failure('Mensagem não encontrada.',404);
        if(!['❤️','🔥','😂','👏','⚡'].includes(body.emoji))return failure('Reação não permitida.');
        const r={...old.reactions},who=new Set(r[body.emoji]||[]);who.has(me.id)?who.delete(me.id):who.add(me.id);r[body.emoji]=[...who];
        const item={...old,reactions:r};
        try{await publish(`${ROOT}/message/${room}/${item.id}`,item,{retain:true,ack:true});onPayload(`${ROOT}/message/${room}/${item.id}`,JSON.stringify(item));return success({message:item});}catch(err){return failure(err.message,503);}
      }
      if(p[3]==='typing'&&method==='POST'){
        if(connected)publish(`${ROOT}/typing/${room}/${tabId}`,{roomId:room,userId:me.id,name:me.name},{retain:false}).catch(()=>{});
        return success({ok:true});
      }
    }
    return failure('Rota desconhecida.',404);
  }
  if (typeof document !== 'undefined') {
    document.getElementById('liveChip')?.classList.add('offline');
    const label = document.getElementById('liveLabel');
    if (label) label.textContent = 'CONECTANDO';
  }
  const oldFetch=window.fetch.bind(window);
  window.fetch=(input,options)=>{
    const value=typeof input==='string'?input:input?.url;
    if(typeof value==='string'&&/^\/api\//.test(value))return api(value,options);
    return oldFetch(input,options);
  };
  window.EventSource=LiveEvents;
  window.addEventListener('pagehide',()=>offline(activeRoom));
  window.addEventListener('online',()=>{if(!connected)connect().catch(()=>{});});
  setInterval(()=>{if(activeRoom)updatePresence(activeRoom);},16000);
})();
