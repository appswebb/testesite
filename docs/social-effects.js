
(function(){
const api=window.entreSocial;
api.showMatchAnimation=function(peer){
 if(state.motionOff)return;
 document.getElementById('entre-meeting')?.remove();
 const el=document.createElement('div');
 el.id='entre-meeting';el.className='meet-overlay';el.setAttribute('role','status');
 el.className='connect-match-effect';el.innerHTML='<div class="connect-match-core"><img src="./connect-glass.svg?v=showcase-v17" alt=""><strong>Vocês se encontraram.</strong><small>Seu encontro de cinco minutos começou.</small></div>';
 document.body.append(el);setTimeout(()=>el.remove(),1450);
};
api.showEndAnimation=function(){toast('Encontro encerrado.',false,'end');};

api.chatToolbar=function(pair){
 if(pair.status!=='connected')return '<div class="chat-origin-bar"><div><strong>'+ico('clock',14)+' Chat ao vivo · temporário</strong><small>Sem salvar, mover ou arquivar. Apenas um match dos dois libera uma conversa permanente.</small></div></div>';
 return '<div class="chat-origin-bar"><div><strong>Conversa permanente</strong><small>Começou em '+(pair.origin==='online'?'Pessoas online':'Chat ao vivo')+' · só vocês podem ler.</small></div><div class="chat-origin-actions">'+api.conversationMenu(pair)+'</div></div>';
};

api.historyButton=function(){return api.data.hasEarlier?'<button type="button" class="older-messages" data-action="messagesOlder">Carregar 30 mensagens anteriores</button>':'';};
api.olderMessages=async function(){
 if(!state.pair||!state.messages?.length)return;
 const id=state.messages[0].id,list=document.getElementById('messageList'),beforeHeight=list?.scrollHeight||0;
 try{
  const r=await db.from('entre_messages').select('id,body,sender_id,created_at,edited_at,deleted_at').eq('pair_id',state.pair.id).is('deleted_at',null).lt('id',id).order('id',{ascending:false}).limit(30);
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
