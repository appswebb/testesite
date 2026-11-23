
(function(){
const api=window.entreSocial;
api.showMatchAnimation=function(peer){
 if(state.motionOff||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 document.getElementById('entre-meeting')?.remove();
 const el=document.createElement('div');
 el.id='entre-meeting';el.className='meet-overlay';el.setAttribute('role','status');
 el.innerHTML='<div class="meet-content"><span>UMA CONEXÃO DE VERDADE</span><div class="meet-stage"><div class="meet-person meet-left">'+esc(initials(state.profile?.display_name))+'</div><b class="meet-spark">✳</b><div class="meet-person meet-right">'+esc(initials(peer?.display_name))+'</div></div><h2>Vocês se <em>encontraram.</em></h2><p>Agora é você e '+esc(peer?.display_name||'alguém')+'. Cinco minutos para se conhecer.</p></div>';
 document.body.append(el);setTimeout(()=>el.remove(),2500);
};
api.showEndAnimation=function(){
 document.getElementById('entre-ended')?.remove();
 const el=document.createElement('div');el.id='entre-ended';el.className='ended-toast';
 el.setAttribute('role','status');el.innerHTML='✓ <span><strong>Encontro encerrado.</strong><small>Seu histórico continua salvo.</small></span>';
 document.body.append(el);setTimeout(()=>el.remove(),1850);
};

api.chatToolbar=function(pair){
 const p=api.pref(pair),folder=p.folder||pair.origin||'live',archived=!!p.archived_at;
 return '<div class="chat-origin-bar"><div><strong>'+ico('spark',14)+' Começou em '+(pair.origin==='online'?'Pessoas online':'Chat ao vivo')+'</strong><small>Textos expiram após 10 dias sem atividade; o contato fica salvo.</small></div>'+
 '<div class="chat-origin-actions"><select aria-label="Mover conversa" data-social-folder="'+esc(pair.id)+'">'+
 '<option value="live"'+(folder==='live'?' selected':'')+'>Ao vivo</option><option value="online"'+(folder==='online'?' selected':'')+'>Online</option><option value="other"'+(folder==='other'?' selected':'')+'>Outras</option></select>'+
 '<button data-action="'+(p.pinned?'conversationUnpin':'conversationPin')+'" data-id="'+esc(pair.id)+'">'+(p.pinned?'★':'☆')+'</button>'+
 '<button data-action="'+(archived?'conversationRestore':'conversationArchive')+'" data-id="'+esc(pair.id)+'">'+(archived?'Restaurar':'Arquivar')+'</button></div></div>';
};

api.historyButton=function(){return api.data.hasEarlier?'<button type="button" class="older-messages" data-action="messagesOlder">Carregar 30 mensagens anteriores</button>':'';};
api.olderMessages=async function(){
 if(!state.pair||!state.messages?.length)return;
 const id=state.messages[0].id,list=document.getElementById('messageList'),beforeHeight=list?.scrollHeight||0;
 try{
  const r=await db.from('entre_messages').select('id,body,sender_id,created_at').eq('pair_id',state.pair.id).lt('id',id).order('id',{ascending:false}).limit(30);
  if(r.error)throw r.error;
  const older=(r.data||[]).reverse();
  api.data.hasEarlier=older.length===30;
  state.messages=older.concat(state.messages).slice(0,120);
  renderView();
  requestAnimationFrame(()=>{const box=document.getElementById('messageList');if(box)box.scrollTop=Math.max(0,box.scrollHeight-beforeHeight);});
 }catch(e){toast(infoError(e),true);}
};
let scrollObserver=null;
api.afterRender=function(){
 if(scrollObserver){scrollObserver.disconnect();scrollObserver=null;}
 if(state.view!=='online'||!api.data.hasMore||api.data.busy)return;
 const node=document.getElementById('onlineScrollAnchor');
 if(!node||!('IntersectionObserver'in window))return;
 scrollObserver=new IntersectionObserver(entries=>{
  if(!entries.some(x=>x.isIntersecting)||api.data.busy||!api.data.hasMore)return;
  scrollObserver.disconnect();
  api.loadOnline(false).then(()=>renderView());
 },{rootMargin:'0px 0px 140px 0px'});
 scrollObserver.observe(node);
};

})();
