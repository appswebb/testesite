
(function(){
const api=window.entreSocial;
function summary(n){
 const p=n.actor_name||'Uma pessoa';
 return ({follow:p+' quer seguir você.',follow_accepted:p+' aceitou seu pedido.',chat_request:p+' quer conversar com você.',chat_accepted:p+' aceitou conversar.',message:'Nova mensagem de '+p+'.',matched:'Um encontro começou!',ended:'Um encontro terminou.',retention:'A conversa está perto de 10 dias sem mensagens. O texto poderá expirar.',system:'Novidades da plataforma.'})[n.kind]||'Você tem uma novidade.';
}
function notificationsView(){
 const data=api.data;
 return heading('NOVIDADES IMPORTANTES','Notificações<em>.</em>','Pedidos de seguidores, convites, mensagens e encontros. Carregamento em lotes de 15.')+
 '<div class="notification-controls"><strong>'+data.unread+' não lidas</strong><div><button class="ui-btn btn-outline btn-sm" data-action="notificationsRead">Marcar como lidas</button>'+
 ('Notification'in window&&Notification.permission!=='granted'?'<button class="ui-btn btn-quiet btn-sm" data-action="notificationsPermission">Ativar aviso do navegador</button>':'')+'</div></div>'+
 (data.notifications.length?'<div class="notification-list">'+data.notifications.map(n=>
 '<button class="notification-item '+(n.read_at?'':'is-unread')+'" data-action="notificationOpen" data-id="'+n.id+'" data-pair="'+esc(n.pair_id||'')+'">'+
 '<span class="notification-icon">'+ico(n.kind==='message'?'chat':n.kind==='matched'?'heart':'spark',18)+'</span><span><strong>'+esc(summary(n))+'</strong><small>'+new Date(n.created_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})+'</small></span>'+ico('chevron',16)+'</button>').join('')+'</div>':
 '<div class="social-empty"><h3>Nenhuma novidade por enquanto.</h3><p>Novos convites e mensagens aparecerão aqui.</p></div>')+
 (data.notiMore?'<div class="social-more"><button class="ui-btn btn-outline" data-action="notificationsMore">Carregar mais 15</button></div>':'');
}
Object.assign(api,{notificationsView,summary});
})();
