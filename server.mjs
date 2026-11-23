import http from 'node:http';
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, statSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const publicRoot = resolve(root, 'public');
const dataDir = resolve(process.env.DATA_DIR || join(root, 'data'));
const dataFile = join(dataDir, 'store.json');
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
const MAX_MESSAGES = 3000;
const ROOM_LIMIT = 40;
const COLORS = ['#D9FC6C','#A9BFFF','#FFB6A7','#D3ACFF','#89E6D3','#FFC884'];
const ICONS = ['message-circle','music-2','lightbulb','moon','shuffle','coffee','gamepad-2','heart','zap'];
const EMOJIS = ['❤️','🔥','😂','👏','⚡'];
const now = () => new Date().toISOString();

const defaultRooms = [
  { id:'geral', name:'Praça central', description:'Tudo começa com uma boa conversa.', icon:'message-circle', createdAt:now(), system:true },
  { id:'musica', name:'No repeat', description:'Sons, artistas e descobertas.', icon:'music-2', createdAt:now(), system:true },
  { id:'ideias', name:'Fora da caixa', description:'Ideias que merecem ser ouvidas.', icon:'lightbulb', createdAt:now(), system:true },
  { id:'madrugada', name:'Depois das 00h', description:'Conversas sem hora para acabar.', icon:'moon', createdAt:now(), system:true },
  { id:'aleatorio', name:'Sem contexto', description:'O assunto é o que aparecer.', icon:'shuffle', createdAt:now(), system:true },
];
mkdirSync(dataDir, { recursive:true });
let db;
try {
  db = JSON.parse(readFileSync(dataFile, 'utf8'));
  if (!Array.isArray(db.rooms) || !db.messages || !db.sessions) throw Error('Formato inválido');
} catch (err) {
  if (existsSync(dataFile)) throw new Error(`Não foi possível abrir ${dataFile}: ${err.message}`);
  db = { rooms:defaultRooms, messages:Object.fromEntries(defaultRooms.map(r => [r.id, []])), sessions:{} };
  persist();
}
function persist() {
  const tmp = `${dataFile}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(db), { mode:0o600 });
  renameSync(tmp, dataFile);
}

const connections = new Map();
const limiter = new Map();
let streamCounter = 0;
const roomById = id => db.rooms.find(r => r.id === id);
const cookie = req => (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('freq_session='))?.slice('freq_session='.length) || '';
function currentUser(req) { const token = cookie(req); return token && db.sessions[token] ? { ...db.sessions[token], token } : null; }
function userPublic(user) { return { id:user.id, name:user.name, color:user.color }; }
function setCookie(res, token, req) {
  const secure = req.socket.encrypted || req.headers['x-forwarded-proto'] === 'https';
  res.setHeader('Set-Cookie', `freq_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure ? '; Secure' : ''}`);
}
function respond(res, status, value) {
  if (res.writableEnded) return;
  res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' });
  res.end(JSON.stringify(value));
}
function error(res, status, message) { respond(res, status, { error:message }); }
async function parseBody(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw Object.assign(new Error('Envie JSON.'), { status:415 });
  let body = ''; let size = 0;
  for await (const part of req) {
    size += part.length;
    if (size > 16_384) throw Object.assign(new Error('Requisição grande demais.'), { status:413 });
    body += part.toString('utf8');
  }
  try { return JSON.parse(body || '{}'); } catch { throw Object.assign(new Error('JSON inválido.'), { status:400 }); }
}
function validName(raw) {
  if (typeof raw !== 'string') return null;
  const name = raw.trim().replace(/\s+/g,' ');
  return name.length >= 2 && name.length <= 24 && /^[\p{L}\p{N} ._-]+$/u.test(name) ? name : null;
}
function validText(raw) {
  if (typeof raw !== 'string') return null;
  const msg = raw.trim();
  if (!msg || msg.length > 1200 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(msg)) return null;
  return msg;
}
function hit(key, count, ms) {
  const t = Date.now(); const entries = (limiter.get(key) || []).filter(x => t-x < ms);
  if (entries.length >= count) { limiter.set(key, entries); return false; }
  entries.push(t); limiter.set(key, entries); return true;
}
setInterval(() => { const t=Date.now(); for (const [key,times] of limiter) if (!times.some(x => t-x < 180_000)) limiter.delete(key); },60_000).unref();
function presence(roomId) {
  const found = new Map();
  for (const conn of connections.values()) if (conn.roomId === roomId) found.set(conn.user.id, userPublic(conn.user));
  return [...found.values()];
}
function onlineTotal() { return new Set([...connections.values()].map(c => c.user.id)).size; }
function roomSummary(room) {
  const messages = db.messages[room.id] || [];
  const last = [...messages].reverse().find(m => !m.deleted);
  return { ...room, online:presence(room.id).length, lastMessage: last ? { name:last.userName, text:last.text, at:last.createdAt } : null };
}
function roomsPayload() { return { rooms:db.rooms.map(roomSummary), totalOnline:onlineTotal() }; }
function event(res, type, data) { if (!res.writableEnded && !res.destroyed) res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`); }
function roomEvent(roomId, type, payload, exceptUserId=null) {
  for (const conn of connections.values()) if (conn.roomId === roomId && conn.user.id !== exceptUserId) event(conn.res,type,payload);
}
function globalRoomsEvent() { const payload=roomsPayload(); for (const conn of connections.values()) event(conn.res,'rooms',payload); }
function updatePresence(roomId) {
  roomEvent(roomId,'presence',{ roomId, users:presence(roomId) });
  globalRoomsEvent();
}
function requireUser(req,res) { const user=currentUser(req); if (!user) error(res,401,'Entre para continuar.'); return user; }
function originAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}

async function handleApi(req, res, url) {
  const pathname = url.pathname;
  if (req.method !== 'GET' && !originAllowed(req)) return error(res,403,'Origem não autorizada.');
  if (pathname === '/api/health' && req.method === 'GET') return respond(res,200,{ ok:true, connected:onlineTotal(), uptime:Math.round(process.uptime()) });
  if (pathname === '/api/me' && req.method === 'GET') {
    const me = currentUser(req); return respond(res,200,{ me:me ? userPublic(me) : null });
  }
  if (pathname === '/api/session' && req.method === 'POST') {
    const body=await parseBody(req); const name=validName(body.name);
    if (!name) return error(res,400,'Apelido: 2 a 24 caracteres; letras, números, espaços, ponto, _ ou -.');
    const ip = req.socket.remoteAddress || 'unknown';
    if (!hit(`join:${ip}`,12,60_000)) return error(res,429,'Muitas entradas. Tente novamente em instantes.');
    let user=currentUser(req);
    if (!user) {
      const token=randomBytes(32).toString('hex');
      user={id:randomUUID(),name,color:COLORS[Math.floor(Math.random()*COLORS.length)],createdAt:now(),token};
      const {token:_,...stored}=user; db.sessions[token]=stored; setCookie(res,token,req);
    } else { db.sessions[user.token].name=name; user.name=name; }
    persist();
    return respond(res,200,{ me:userPublic(user) });
  }
  if (pathname === '/api/logout' && req.method === 'POST') {
    const user=currentUser(req);
    if (user) {
      delete db.sessions[user.token]; persist();
      for (const [key,c] of [...connections]) if (c.user.id === user.id) c.res.end();
    }
    res.setHeader('Set-Cookie','freq_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    return respond(res,200,{ok:true});
  }
  const user=requireUser(req,res);
  if (!user) return;
  if (pathname === '/api/profile' && req.method === 'PATCH') {
    const body=await parseBody(req); const name=validName(body.name);
    if (!name) return error(res,400,'Digite um apelido válido (2 a 24 caracteres).');
    db.sessions[user.token].name=name; persist();
    for (const c of connections.values()) if (c.user.id === user.id) c.user.name=name;
    for (const room of db.rooms) roomEvent(room.id,'presence',{roomId:room.id,users:presence(room.id)});
    return respond(res,200,{me:userPublic({...user,name})});
  }
  if (pathname === '/api/rooms' && req.method === 'GET') return respond(res,200,roomsPayload());
  if (pathname === '/api/rooms' && req.method === 'POST') {
    if (!hit(`room:${user.id}`,2,60_000)) return error(res,429,'Aguarde antes de criar mais salas.');
    if (db.rooms.length >= ROOM_LIMIT) return error(res,409,'Limite de salas atingido.');
    const body=await parseBody(req);
    const name=typeof body.name === 'string' ? body.name.trim().replace(/\s+/g,' ') : '';
    const description=typeof body.description === 'string' ? body.description.trim() : '';
    if (name.length < 3 || name.length > 30 || /[<>\r\n]/.test(name)) return error(res,400,'Nome da sala: de 3 a 30 caracteres.');
    if (description.length > 100 || /[<>\r\n]/.test(description)) return error(res,400,'Descrição inválida (máximo 100 caracteres).');
    const icon=ICONS.includes(body.icon) ? body.icon : 'message-circle';
    const room={id:`sala-${randomBytes(5).toString('hex')}`,name,description:description || 'Um espaço para conversar.',icon,createdAt:now(),system:false,createdBy:user.id};
    db.rooms.push(room); db.messages[room.id]=[]; persist(); globalRoomsEvent();
    return respond(res,201,{room:roomSummary(room)});
  }
  if (pathname === '/api/events' && req.method === 'GET') {
    const roomId=url.searchParams.get('room') || 'geral';
    if (!roomById(roomId)) return error(res,404,'Sala não encontrada.');
    res.writeHead(200,{
      'Content-Type':'text/event-stream; charset=utf-8',
      'Cache-Control':'no-cache, no-transform',
      'Connection':'keep-alive',
      'X-Accel-Buffering':'no'
    });
    res.write(': connected\n\n');
    const key=++streamCounter;
    connections.set(key,{user,roomId,res});
    event(res,'ready',{roomId,userId:user.id});
    updatePresence(roomId);
    const heartbeat=setInterval(() => { if (!res.destroyed) res.write(': ping\n\n'); },20_000);
    res.on('close',() => { clearInterval(heartbeat); if (connections.delete(key)) updatePresence(roomId); });
    return;
  }
  const msgPath=pathname.match(/^\/api\/rooms\/([^/]+)\/messages(?:\/([^/]+))?$/);
  if (msgPath) {
    const roomId=decodeURIComponent(msgPath[1]), msgId=msgPath[2] && decodeURIComponent(msgPath[2]);
    if (!roomById(roomId)) return error(res,404,'Sala não encontrada.');
    const list=db.messages[roomId];
    if (req.method === 'GET' && !msgId) {
      const before=url.searchParams.get('before');
      const index=before ? list.findIndex(m => m.id===before) : list.length;
      if (index<0) return error(res,400,'Cursor inválido.');
      const start=Math.max(0,index-60);
      return respond(res,200,{ messages:list.slice(start,index),hasMore:start>0 });
    }
    if (req.method === 'POST' && !msgId) {
      if (!hit(`msg:${user.id}`,7,10_000)) return error(res,429,'Você está enviando mensagens rápido demais.');
      const body=await parseBody(req); const message=validText(body.text);
      if (!message) return error(res,400,'Escreva uma mensagem de até 1.200 caracteres.');
      let replyTo=null;
      if (body.replyTo) {
        const original=list.find(m=>m.id===body.replyTo);
        if (original && !original.deleted) replyTo={id:original.id,userName:original.userName,text:original.text.slice(0,130)};
      }
      const created={id:randomUUID(),roomId,userId:user.id,userName:user.name,userColor:user.color,text:message,replyTo,createdAt:now(),editedAt:null,deleted:false,reactions:{}};
      list.push(created); if(list.length>MAX_MESSAGES) list.splice(0,list.length-MAX_MESSAGES);
      persist(); roomEvent(roomId,'message',created); globalRoomsEvent();
      return respond(res,201,{message:created});
    }
    if (msgId && (req.method==='PATCH' || req.method==='DELETE')) {
      const item=list.find(m=>m.id===msgId);
      if (!item) return error(res,404,'Mensagem não encontrada.');
      if (item.userId !== user.id) return error(res,403,'Você só pode alterar suas mensagens.');
      if (item.deleted) return error(res,409,'Mensagem excluída.');
      if (req.method==='PATCH') {
        const body=await parseBody(req), message=validText(body.text);
        if (!message) return error(res,400,'Mensagem inválida.');
        item.text=message; item.editedAt=now();
      } else { item.deleted=true; item.text=''; item.reactions={}; }
      persist(); roomEvent(roomId,'message_update',item); globalRoomsEvent();
      return respond(res,200,{message:item});
    }
  }
  const roomAction=pathname.match(/^\/api\/rooms\/([^/]+)\/(reactions|typing)$/);
  if (roomAction && req.method==='POST') {
    const roomId=decodeURIComponent(roomAction[1]);
    if (!roomById(roomId)) return error(res,404,'Sala não encontrada.');
    const body=await parseBody(req);
    if (roomAction[2]==='typing') {
      if (!hit(`typing:${user.id}`,12,10_000)) return respond(res,200,{ok:true});
      roomEvent(roomId,'typing',{userId:user.id,name:user.name},user.id);
      return respond(res,200,{ok:true});
    }
    if (!EMOJIS.includes(body.emoji)) return error(res,400,'Reação inválida.');
    const msg=db.messages[roomId].find(m=>m.id===body.messageId);
    if (!msg || msg.deleted) return error(res,404,'Mensagem não encontrada.');
    const users=msg.reactions[body.emoji] || [];
    const index=users.indexOf(user.id);
    if (index===-1) users.push(user.id); else users.splice(index,1);
    if(users.length) msg.reactions[body.emoji]=users; else delete msg.reactions[body.emoji];
    persist(); roomEvent(roomId,'message_update',msg);
    return respond(res,200,{message:msg});
  }
  return error(res,404,'Rota não encontrada.');
}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.webp':'image/webp','.woff2':'font/woff2'};
function serveStatic(req,res,url) {
  if (req.method!=='GET' && req.method!=='HEAD') return error(res,405,'Método não permitido.');
  let pathname;
  try { pathname=decodeURIComponent(url.pathname); } catch { return error(res,400,'URL inválida.'); }
  const path=resolve(publicRoot,`.${pathname === '/' ? '/index.html' : pathname}`);
  if (path!==publicRoot && !path.startsWith(publicRoot+sep)) return error(res,403,'Acesso negado.');
  try {
    if (!statSync(path).isFile()) return error(res,404,'Arquivo não encontrado.');
  } catch { return error(res,404,'Arquivo não encontrado.'); }
  res.writeHead(200,{ 'Content-Type':mime[extname(path)] || 'application/octet-stream','Cache-Control':extname(path)==='.html'?'no-cache':'public, max-age=3600' });
  if (req.method==='HEAD') return res.end();
  createReadStream(path).pipe(res);
}
const server=http.createServer(async (req,res) => {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  let url;
  try { url=new URL(req.url,`http://${req.headers.host || 'localhost'}`); } catch { return error(res,400,'URL inválida.'); }
  try { if(url.pathname.startsWith('/api/')) await handleApi(req,res,url); else serveStatic(req,res,url); }
  catch(e) { console.error('Request error:',e); if(!res.headersSent) error(res,e.status || 500,e.status ? e.message : 'Erro interno do servidor.'); else res.end(); }
});
server.listen(port,host,() => console.log(`freq. — http://localhost:${server.address().port}`));
function shutdown() { for(const c of connections.values()) c.res.end(); server.close(()=>process.exit(0)); setTimeout(()=>process.exit(0),2000).unref(); }
process.on('SIGTERM',shutdown); process.on('SIGINT',shutdown);
