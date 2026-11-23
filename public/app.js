(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const I = ['message-circle','music-2','lightbulb','moon','shuffle','coffee','gamepad-2','heart','zap'];
  const reactionOptions = ['❤️','🔥','😂','👏','⚡'];
  const state = {
    me:null, rooms:[], roomId:null, messages:[], people:[], totalOnline:0,
    hasMore:false, source:null, generation:0, isLoading:false, pending:[],
    replyTo:null, sending:false, typing:new Map(), lastTyping:0,
    seen:{}, seenReady:false, toastTimer:0, roomLoadError:false
  };
  const els = {
    roomsList:$('roomsList'),roomCount:$('roomCount'),chatContent:$('chatContent'),
    messageList:$('messageList'),messageInput:$('messageInput'),messageForm:$('messageForm'),
    peopleList:$('peopleList'),peopleCount:$('peopleCount'),emptyState:$('emptyState'),
    loadMoreBtn:$('loadMoreBtn'),jumpBottom:$('jumpBottom'),typingStatus:$('typingStatus'),
    replyPreview:$('replyPreview'),welcome:$('welcomeOverlay'),modal:$('modalBackdrop')
  };
  const svgNS='http://www.w3.org/2000/svg';
  function node(tag, className='', text) {
    const el=document.createElement(tag);
    if (className) el.className=className;
    if (text!==undefined) el.textContent=text;
    return el;
  }
  function icon(name, className='') {
    const svg=document.createElementNS(svgNS,'svg');
    if(className) svg.setAttribute('class',className);
    const use=document.createElementNS(svgNS,'use');
    use.setAttribute('href',`#i-${I.includes(name) || ['reply','pencil','trash','smile','x','plus','check'].includes(name) ? name : 'message-circle'}`);
    svg.append(use);return svg;
  }
  function initials(name) {return [...(name || '?').trim()].slice(0,2).join('').toUpperCase();}
  function avatar(user) {
    const a=node('span','avatar',initials(user.name));
    a.style.background=user.color || '#d9fc6c';
    a.style.color='#192016';
    a.title=user.name;
    return a;
  }
  function buttonIcon(symbol,label,handler,extraClass='') {
    const btn=node('button',extraClass);
    btn.type='button';btn.title=label;btn.setAttribute('aria-label',label);
    btn.append(icon(symbol));btn.addEventListener('click',handler);return btn;
  }
  function toast(message, isError=false) {
    const el=$('toast');el.textContent=message;el.classList.toggle('error',isError);el.classList.add('show');
    clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>el.classList.remove('show'),3500);
  }
  async function api(path,{method='GET',body}={}) {
    const options={method,credentials:'same-origin',headers:{}};
    if(body!==undefined){options.headers['Content-Type']='application/json';options.body=JSON.stringify(body);}
    let response;
    try{response=await fetch(path,options);}catch{throw Error('Sem conexão com o servidor. Verifique a internet.');}
    let data;
    try{data=await response.json();}catch{throw Error('Resposta inesperada do servidor.');}
    if(!response.ok)throw Error(data.error || `Erro ${response.status}`);
    return data;
  }
  function formatTime(date){return new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit'}).format(new Date(date));}
  function dayKey(date){return new Date(date).toLocaleDateString('en-CA');}
  function formatDay(date){
    const d=new Date(date);const today=new Date();
    if(d.toDateString()===today.toDateString())return 'HOJE';
    const prev=new Date(today);prev.setDate(today.getDate()-1);
    if(d.toDateString()===prev.toDateString())return 'ONTEM';
    return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'long'}).format(d).toUpperCase();
  }
  function updateMe() {
    if(!state.me)return;
    $('selfName').textContent=state.me.name;
    const a=$('selfAvatar');a.textContent=initials(state.me.name);a.style.background=state.me.color;
  }
  function selectSidebar(active) {
    $('sidebar').classList.toggle('open',active);
    $('sidebarShade').classList.toggle('visible',active);
  }
  function renderRooms() {
    els.roomsList.replaceChildren();
    $('roomCount').textContent=state.rooms.length;
    for(const room of state.rooms) {
      const active=room.id===state.roomId;
      const entry=node('button',`room-item${active?' active':''}`);entry.type='button';
      entry.setAttribute('aria-current',active?'page':'false');
      const pict=node('span','room-icon');pict.append(icon(room.icon));entry.append(pict);
      const meta=node('span','room-meta');meta.append(node('strong','',room.name));
      meta.append(node('small','',room.lastMessage ? `${room.lastMessage.name}: ${room.lastMessage.text}` : room.description));
      entry.append(meta);
      const count=node('span',`room-online${room.online?'':' zero'}`,String(room.online));
      count.title=`${room.online} pessoa(s) online`;entry.append(count);
      if(state.seenReady && !active && room.lastMessage && state.seen[room.id] && new Date(room.lastMessage.at).getTime() > state.seen[room.id]) entry.append(node('span','room-unread'));
      entry.addEventListener('click',()=>{selectSidebar(false);switchRoom(room.id);});
      els.roomsList.append(entry);
    }
  }
  function showRoomHeader() {
    const room=state.rooms.find(r=>r.id===state.roomId);if(!room)return;
    $('headerRoomName').textContent=room.name;$('headerRoomDesc').textContent=room.description;
    $('rightRoomName').textContent=room.name;$('rightRoomDesc').textContent=room.description;
    $('headerRoomIcon').replaceChildren(icon(room.icon));
    $('headerOnline').textContent=`${room.online} online`;
  }
  function renderPeople() {
    $('peopleCount').textContent=state.people.length;
    els.peopleList.replaceChildren();
    if(!state.people.length) {
      els.peopleList.append(node('p','people-empty','Ninguém conectado a esta sala no momento.'));
      return;
    }
    const sorted=[...state.people].sort((a,b)=>a.id===state.me?.id?-1:b.id===state.me?.id?1:a.name.localeCompare(b.name));
    for(const person of sorted) {
      const el=node('div','people-item');el.append(avatar(person));
      const label=node('div');label.append(node('strong','',person.name));
      label.append(node('small','',person.id===state.me?.id?'Você · online':'Online agora'));
      el.append(label,node('span','presence-dot'));els.peopleList.append(el);
    }
  }
  function renderMessage(m) {
    const mine=m.userId===state.me?.id;
    const item=node('article',`msg${mine?' mine':''}${m.deleted?' deleted':''}`);
    item.dataset.messageId=m.id;
    item.append(avatar({name:m.userName,color:m.userColor}));
    const body=node('div','msg-body');const byline=node('div','msg-byline');
    byline.append(node('strong','',m.userName));
    if(mine)byline.append(node('span','you-tag','VOCÊ'));
    const time=node('time','',formatTime(m.createdAt));time.dateTime=m.createdAt;byline.append(time);
    if(m.editedAt&&!m.deleted)byline.append(node('time','','(editada)'));
    body.append(byline);
    if(m.replyTo){const quote=node('div','msg-reply');quote.append(node('b','',m.replyTo.userName),document.createTextNode(m.replyTo.text));body.append(quote);}
    body.append(node('div','msg-content',m.deleted?'Mensagem apagada':m.text));
    if(!m.deleted){
      const reactions=node('div','reactions');
      for(const emoji of reactionOptions){
        const ids=m.reactions?.[emoji]||[];
        if(!ids.length)continue;
        const r=node('button',`reaction${ids.includes(state.me?.id)?' mine':''}`,`${emoji} ${ids.length}`);
        r.type='button';r.title=`Reagir com ${emoji}`;
        r.addEventListener('click',()=>react(m,emoji));reactions.append(r);
      }
      if(reactions.childNodes.length)body.append(reactions);
    }
    item.append(body);
    if(!m.deleted){
      const actions=node('div','msg-actions');
      actions.append(buttonIcon('smile','Reagir',e=>{e.stopPropagation();toggleReactions(item,m);}),buttonIcon('reply','Responder',()=>setReply(m)));
      if(mine){actions.append(buttonIcon('pencil','Editar',()=>openEdit(m)),buttonIcon('trash','Apagar',()=>deleteMessage(m),'danger'));}
      item.append(actions);
    }
    return item;
  }
  function closeReactions(){document.querySelectorAll('.reaction-menu').forEach(el=>el.remove());}
  function toggleReactions(item,m){
    const existing=item.querySelector('.reaction-menu');closeReactions();if(existing)return;
    const menu=node('div','reaction-menu');
    for(const emoji of reactionOptions){const b=node('button','',emoji);b.type='button';b.title=`Reagir com ${emoji}`;
      b.addEventListener('click',e=>{e.stopPropagation();closeReactions();react(m,emoji);});menu.append(b);}
    item.querySelector('.msg-actions').append(menu);
  }
  async function react(m,emoji){
    try{const out=await api(`/api/rooms/${encodeURIComponent(state.roomId)}/reactions`,{method:'POST',body:{messageId:m.id,emoji}});applyMessageUpdate(out.message);}catch(err){toast(err.message,true);}
  }
  function renderAllMessages({keepPosition=false}={}) {
    const content=els.chatContent, previousTop=content.scrollTop, previousHeight=content.scrollHeight;
    els.messageList.replaceChildren();
    let lastDay='';
    for(const m of state.messages){
      const day=dayKey(m.createdAt);
      if(day!==lastDay){els.messageList.append(node('div','message-divider',formatDay(m.createdAt)));lastDay=day;}
      els.messageList.append(renderMessage(m));
    }
    els.emptyState.classList.toggle('hidden',state.messages.length!==0);
    els.loadMoreBtn.classList.toggle('hidden',!state.hasMore);
    if(keepPosition)content.scrollTop=previousTop+content.scrollHeight-previousHeight;
  }
  function applyMessageUpdate(item){
    if(item.roomId!==state.roomId)return;
    if(state.isLoading){state.pending.push({type:'message_update',data:item});return;}
    const index=state.messages.findIndex(m=>m.id===item.id);
    if(index<0)return;
    state.messages[index]=item;
    const existing=[...els.messageList.querySelectorAll('[data-message-id]')].find(el=>el.dataset.messageId===item.id);
    if(existing)existing.replaceWith(renderMessage(item));
  }
  function nearBottom(){const c=els.chatContent;return c.scrollHeight-c.scrollTop-c.clientHeight<160;}
  function scrollBottom(smooth=false){const c=els.chatContent;c.scrollTo({top:c.scrollHeight,behavior:smooth?'smooth':'instant'});els.jumpBottom.classList.add('hidden');}
  function receivedMessage(m){
    if(m.roomId!==state.roomId)return;
    if(state.isLoading){state.pending.push({type:'message',data:m});return;}
    if(state.messages.some(x=>x.id===m.id))return;
    const auto=nearBottom();state.messages.push(m);renderAllMessages();
    if(auto)scrollBottom(true);else els.jumpBottom.classList.remove('hidden');
    state.seen[state.roomId]=Date.now();
  }
  function updateTyping(){
    const active=[...state.typing.values()].filter(x=>Date.now()-x.time<2800 && x.userId!==state.me?.id);
    if(!active.length){els.typingStatus.replaceChildren();return;}
    const names=active.map(x=>x.name);
    const dots=node('span','typing-bubbles');dots.append(node('i'),node('i'),node('i'));
    els.typingStatus.replaceChildren(dots,node('span','',`${names.slice(0,2).join(' e ')} ${names.length===1?'está':'estão'} digitando...`));
  }
  setInterval(()=>{
    for(const [id,item] of state.typing)if(Date.now()-item.time>2800)state.typing.delete(id);
    updateTyping();
  },650);
  function startEvents(roomId,generation){
    if(state.source){state.source.close();state.source=null;}
    const source=new EventSource(`/api/events?room=${encodeURIComponent(roomId)}`);
    state.source=source;
    source.addEventListener('ready',()=>{
      if(generation!==state.generation)return;
      const wasOffline=$('liveChip').classList.contains('offline');
      $('liveChip').classList.remove('offline');$('liveLabel').textContent='LIVE';
      if(wasOffline)reconcileLatest(roomId,generation);
    });
    source.addEventListener('rooms',event=>{
      if(generation!==state.generation)return;
      const data=JSON.parse(event.data);
      state.rooms=data.rooms;state.totalOnline=data.totalOnline;
      if(!state.seenReady){for(const room of data.rooms)state.seen[room.id]=room.lastMessage ? Date.parse(room.lastMessage.at):0;state.seenReady=true;}
      renderRooms();showRoomHeader();
    });
    source.addEventListener('presence',event=>{
      if(generation!==state.generation)return;
      const data=JSON.parse(event.data);if(data.roomId!==state.roomId)return;
      state.people=data.users;renderPeople();$('headerOnline').textContent=`${data.users.length} online`;
    });
    source.addEventListener('message',event=>{
      if(generation!==state.generation)return;receivedMessage(JSON.parse(event.data));
    });
    source.addEventListener('message_update',event=>{
      if(generation!==state.generation)return;applyMessageUpdate(JSON.parse(event.data));
    });
    source.addEventListener('typing',event=>{
      if(generation!==state.generation)return;
      const item=JSON.parse(event.data);state.typing.set(item.userId,{...item,time:Date.now()});updateTyping();
    });
    source.addEventListener('error',()=>{
      if(generation!==state.generation)return;
      $('liveChip').classList.add('offline');$('liveLabel').textContent='RECONECTANDO';
    });
  }
  async function reconcileLatest(roomId,generation) {
    try {
      const data=await api(`/api/rooms/${encodeURIComponent(roomId)}/messages`);
      if(generation!==state.generation || state.isLoading)return;
      const stick=nearBottom(),previous=new Map(state.messages.map(m=>[m.id,m]));
      for(const msg of data.messages)previous.set(msg.id,msg);
      state.messages=[...previous.values()].sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt));
      renderAllMessages();if(stick)scrollBottom();
    }catch { /* o evento SSE tentará novamente */ }
  }
  async function switchRoom(roomId) {
    if(!state.rooms.some(r=>r.id===roomId)){toast('Sala não encontrada.',true);return;}
    const generation=++state.generation;
    state.roomId=roomId;state.messages=[];state.people=[];state.pending=[];state.typing.clear();state.hasMore=false;state.isLoading=true;state.replyTo=null;
    state.seen[roomId]=Date.now();
    localStorage.setItem('freq_room',roomId);
    const url=new URL(window.location.href);url.searchParams.set('room',roomId);history.replaceState({},'',url);
    els.messageList.replaceChildren();els.emptyState.classList.add('hidden');els.loadMoreBtn.classList.add('hidden');els.jumpBottom.classList.add('hidden');
    clearReply();renderRooms();renderPeople();showRoomHeader();updateTyping();
    startEvents(roomId,generation);
    try{
      const result=await api(`/api/rooms/${encodeURIComponent(roomId)}/messages`);
      if(generation!==state.generation)return;
      const merged=new Map(result.messages.map(m=>[m.id,m]));
      for(const evt of state.pending) {
        if(evt.type==='message')merged.set(evt.data.id,evt.data);
        if(evt.type==='message_update' && merged.has(evt.data.id))merged.set(evt.data.id,evt.data);
      }
      state.messages=[...merged.values()].sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt));
      state.pending=[];state.hasMore=result.hasMore;state.isLoading=false;
      renderAllMessages();requestAnimationFrame(()=>scrollBottom());
    }catch(err){if(generation!==state.generation)return;state.isLoading=false;toast(err.message,true);}
  }
  async function loadOlder() {
    if(!state.hasMore || state.isLoading || !state.messages.length)return;
    state.isLoading=true;els.loadMoreBtn.disabled=true;
    const generation=state.generation,roomId=state.roomId,firstId=state.messages[0].id;
    try{
      const data=await api(`/api/rooms/${encodeURIComponent(roomId)}/messages?before=${encodeURIComponent(firstId)}`);
      if(generation!==state.generation)return;
      const ids=new Set(state.messages.map(m=>m.id));
      state.messages=[...data.messages.filter(m=>!ids.has(m.id)),...state.messages];
      state.hasMore=data.hasMore;renderAllMessages({keepPosition:true});
      const pending=state.pending.splice(0);state.isLoading=false;
      for(const evt of pending){if(evt.type==='message')receivedMessage(evt.data);else applyMessageUpdate(evt.data);}
    }catch(err){if(generation===state.generation)toast(err.message,true);}finally{if(generation===state.generation){state.isLoading=false;els.loadMoreBtn.disabled=false;}}
  }
  async function loadInitialRooms() {
    const data=await api('/api/rooms');state.rooms=data.rooms;state.totalOnline=data.totalOnline;
    if(!state.seenReady){for(const room of data.rooms)state.seen[room.id]=room.lastMessage ? Date.parse(room.lastMessage.at) : 0;state.seenReady=true;}
    const fromURL=new URLSearchParams(location.search).get('room');
    const selected=fromURL || localStorage.getItem('freq_room') || 'geral';
    renderRooms();await switchRoom(data.rooms.some(r=>r.id===selected)?selected:data.rooms[0].id);
  }
  async function sendMessage(e){
    e.preventDefault();if(state.sending || !state.me || !state.roomId)return;
    const text=els.messageInput.value.trim();if(!text)return;
    if(text.length>1200)return toast('Máximo de 1.200 caracteres.',true);
    const room=state.roomId;state.sending=true;$('sendBtn').disabled=true;
    try{
      const result=await api(`/api/rooms/${encodeURIComponent(room)}/messages`,{method:'POST',body:{text,replyTo:state.replyTo?.id || null}});
      if(room===state.roomId){receivedMessage(result.message);els.messageInput.value='';resizeComposer();clearReply();scrollBottom(true);els.messageInput.focus();}
    }catch(err){toast(err.message,true);}finally{state.sending=false;$('sendBtn').disabled=false;}
  }
  function resizeComposer(){
    const input=els.messageInput;input.style.height='auto';input.style.height=Math.min(input.scrollHeight,142)+'px';
    $('charCount').textContent=input.value.length>950 ? `${input.value.length}/1200`:'';
  }
  function setReply(m){state.replyTo=m;$('replyName').textContent=m.userName;$('replyText').textContent=m.text;els.replyPreview.classList.remove('hidden');els.messageInput.focus();}
  function clearReply(){state.replyTo=null;els.replyPreview.classList.add('hidden');}
  function closeModal(){els.modal.classList.add('hidden');$('modalBody').replaceChildren();}
  function modalBase(eyebrow,title,desc){
    $('modalEyebrow').textContent=eyebrow;$('modalTitle').textContent=title;$('modalDescription').textContent=desc;
    $('modalBody').replaceChildren();els.modal.classList.remove('hidden');
    return $('modalBody');
  }
  function field(label,placeholder,maxLength,value=''){
    const wrap=node('div','modal-field');const l=node('label','',label);const input=node('input');
    input.placeholder=placeholder;input.maxLength=maxLength;input.value=value;input.required=true;l.append(input);
    wrap.append(l);return {wrap,input};
  }
  function submit(label){const b=node('button','modal-submit',label);b.type='submit';return b;}
  function errorPlace(){const p=node('p','modal-error');p.setAttribute('role','alert');return p;}
  function openCreateRoom(){
    const body=modalBase('CRIE SUA FREQUÊNCIA','Abra uma nova sala.','Escolha um assunto e convide outras pessoas para entrar na conversa.');
    const form=node('form');const n=field('NOME DA SALA','Ex.: Conversas de café',30);const d=field('SOBRE O QUE VOCÊS VÃO FALAR?','Uma descrição curtinha',100);
    d.input.required=false;form.append(n.wrap,d.wrap);
    const picker=node('div','modal-field');picker.append(node('label','','ÍCONE DA SALA'));
    const icons=node('div','icon-picker');let selectedIcon='message-circle';
    for(const name of I){
      const b=node('button',`icon-choice${name===selectedIcon?' selected':''}`);b.type='button';b.title=name;b.append(icon(name));
      b.addEventListener('click',()=>{selectedIcon=name;icons.querySelectorAll('button').forEach(el=>el.classList.remove('selected'));b.classList.add('selected');});icons.append(b);
    }
    picker.append(icons);form.append(picker);const btn=submit('Criar sala ↗'),errorEl=errorPlace();form.append(btn,errorEl);body.append(form);
    form.addEventListener('submit',async e=>{
      e.preventDefault();btn.disabled=true;errorEl.textContent='';
      try{
        const result=await api('/api/rooms',{method:'POST',body:{name:n.input.value,description:d.input.value,icon:selectedIcon}});
        closeModal();const rooms=await api('/api/rooms');state.rooms=rooms.rooms;
        renderRooms();await switchRoom(result.room.id);toast('Sua sala está ao vivo!');
      }catch(err){errorEl.textContent=err.message;}finally{btn.disabled=false;}
    });n.input.focus();
  }
  function openRename(){
    const body=modalBase('SUA IDENTIDADE','Como quer ser chamado?','Seu novo apelido aparecerá para as pessoas conectadas.');
    const form=node('form');const f=field('APELIDO','Seu apelido',24,state.me.name);const btn=submit('Salvar apelido');const errorEl=errorPlace();form.append(f.wrap,btn,errorEl);body.append(form);
    form.addEventListener('submit',async e=>{e.preventDefault();btn.disabled=true;try{
      const result=await api('/api/profile',{method:'PATCH',body:{name:f.input.value}});state.me=result.me;updateMe();closeModal();toast('Apelido atualizado.');
    }catch(err){errorEl.textContent=err.message;}finally{btn.disabled=false;}});f.input.focus();f.input.select();
  }
  function openEdit(m){
    const body=modalBase('EDIÇÃO DE MENSAGEM','Ajustar mensagem.','Sua mensagem será atualizada para todos na sala.');
    const form=node('form');const fieldWrap=node('div','modal-field');const label=node('label','','MENSAGEM');const input=node('textarea','modal-textarea');input.value=m.text;input.maxLength=1200;input.rows=5;input.required=true;label.append(input);fieldWrap.append(label);const btn=submit('Salvar mensagem');const err=errorPlace();form.append(fieldWrap,btn,err);body.append(form);
    form.addEventListener('submit',async e=>{e.preventDefault();btn.disabled=true;try{
      const room=m.roomId;const result=await api(`/api/rooms/${encodeURIComponent(room)}/messages/${encodeURIComponent(m.id)}`,{method:'PATCH',body:{text:input.value}});applyMessageUpdate(result.message);closeModal();toast('Mensagem editada.');
    }catch(e){err.textContent=e.message;}finally{btn.disabled=false;}});input.focus();
  }
  async function deleteMessage(m){
    if(!window.confirm('Apagar esta mensagem para todos nesta sala?'))return;
    try{const result=await api(`/api/rooms/${encodeURIComponent(m.roomId)}/messages/${encodeURIComponent(m.id)}`,{method:'DELETE'});applyMessageUpdate(result.message);toast('Mensagem apagada.');}
    catch(e){toast(e.message,true);}
  }
  async function shareRoom(){
    if(!state.roomId)return;
    const link=`${location.origin}/?room=${encodeURIComponent(state.roomId)}`;
    try{await navigator.clipboard.writeText(link);toast('Link da sala copiado!');}
    catch{window.prompt('Copie o link da sala:',link);}
  }
  async function logout(){
    if(!window.confirm('Deseja sair? Seu histórico de mensagens continuará na sala.'))return;
    try{await api('/api/logout',{method:'POST'});}catch(err){toast(err.message,true);return;}
    if(state.source)state.source.close();window.location.href='/';
  }
  function wire() {
    $('joinForm').addEventListener('submit',async e=>{
      e.preventDefault();const btn=$('joinSubmit');btn.disabled=true;$('joinError').textContent='';
      try{const result=await api('/api/session',{method:'POST',body:{name:$('joinName').value}});state.me=result.me;updateMe();
        els.welcome.classList.add('hidden');await loadInitialRooms();els.messageInput.focus();
      }catch(err){$('joinError').textContent=err.message;}finally{btn.disabled=false;}
    });
    els.messageForm.addEventListener('submit',sendMessage);
    els.messageInput.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();els.messageForm.requestSubmit();}});
    els.messageInput.addEventListener('input',()=>{
      resizeComposer();const t=Date.now();if(!state.me||!state.roomId||!els.messageInput.value.trim()||t-state.lastTyping<1400)return;
      state.lastTyping=t;api(`/api/rooms/${encodeURIComponent(state.roomId)}/typing`,{method:'POST',body:{}}).catch(()=>{});
    });
    document.querySelectorAll('.quick-emoji').forEach(b=>b.addEventListener('click',()=>{
      const input=els.messageInput;const start=input.selectionStart,end=input.selectionEnd;
      input.setRangeText(b.dataset.emoji,start,end,'end');input.focus();resizeComposer();
    }));
    $('cancelReply').addEventListener('click',clearReply);
    $('loadMoreBtn').addEventListener('click',loadOlder);
    $('jumpBottom').addEventListener('click',()=>scrollBottom(true));
    els.chatContent.addEventListener('scroll',()=>{if(nearBottom())els.jumpBottom.classList.add('hidden');},{passive:true});
    $('startTalkingBtn').addEventListener('click',()=>els.messageInput.focus());
    $('shareBtn').addEventListener('click',shareRoom);
    $('mobileMenuBtn').addEventListener('click',()=>selectSidebar(true));
    $('sidebarShade').addEventListener('click',()=>selectSidebar(false));
    $('infoToggle').addEventListener('click',()=>$('rightPane').classList.add('open'));
    $('closeInfo').addEventListener('click',()=>$('rightPane').classList.remove('open'));
    $('createRoomBtn').addEventListener('click',()=>{selectSidebar(false);openCreateRoom();});
    $('profileBtn').addEventListener('click',()=>{$('profileMenu').classList.toggle('hidden');$('profileBtn').setAttribute('aria-expanded',String(!$('profileMenu').classList.contains('hidden')));});
    $('renameBtn').addEventListener('click',()=>{$('profileMenu').classList.add('hidden');openRename();});
    $('logoutBtn').addEventListener('click',()=>{$('profileMenu').classList.add('hidden');logout();});
    $('modalClose').addEventListener('click',closeModal);
    els.modal.addEventListener('click',e=>{if(e.target===els.modal)closeModal();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();closeReactions();selectSidebar(false);$('rightPane').classList.remove('open');$('profileMenu').classList.add('hidden');}});
    document.addEventListener('click',e=>{
      if(!e.target.closest('.msg-actions'))closeReactions();
      if(!e.target.closest('.profile-wrap'))$('profileMenu').classList.add('hidden');
    });
    window.addEventListener('pagehide',()=>state.source?.close());
  }
  async function boot() {
    wire();
    try{
      const result=await api('/api/me');
      if(!result.me){els.welcome.classList.remove('hidden');$('joinName').focus();return;}
      state.me=result.me;updateMe();await loadInitialRooms();
    }catch(err){toast(err.message,true);els.welcome.classList.remove('hidden');$('joinError').textContent='Verifique se o servidor está funcionando.';}
  }
  boot();
})();
