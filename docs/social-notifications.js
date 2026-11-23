(function(){
'use strict';
const api=window.entreSocial;
function summary(n){
 const p=n.actor_name||'Uma pessoa';
 return ({follow:p+' quer seguir você.',follow_accepted:p+' aceitou seu pedido.',chat_request:p+' quer conversar com você.',chat_accepted:p+' aceitou conversar.',message:'Nova mensagem de '+p+'.',matched:'Um encontro começou!',ended:'Um encontro terminou.',retention:'A conversa está perto de 10 dias sem mensagens. O texto poderá expirar.',account_suspended:'Sua conta foi suspensa pela moderação. Verifique o motivo e o recurso disponível.',account_restored:'Sua conta foi reativada. Você já pode voltar a usar o CONNECT.',system:'Novidades da plataforma.',bulletin:'Novo aviso oficial da administração.',poll:'Nova enquete oficial: seu voto é obrigatório.',bulletin_reply:p+' respondeu a um aviso oficial.'})[n.kind]||'Você tem uma novidade.';
}
function notificationsView(){
 const d=api.data,hasItems=d.notifications.length>0;
 return heading('ATIVIDADE ENTRE PESSOAS','Notificações<em>.</em>','Pedidos, mensagens, encontros e avisos oficiais reunidos em um só lugar.')+
 '<div class="notification-controls"><strong>'+d.unread+' não lidas</strong>'+
 '<div><button type="button" class="ui-btn btn-outline btn-sm" data-action="notificationsRead"'+(!d.unread?' disabled':'')+'>Marcar como lidas</button>'+
 '<button type="button" class="ui-btn btn-quiet btn-sm notification-clear-all" data-action="notificationsClear"'+(!hasItems?' disabled':'')+'>Limpar tudo</button>'+
 ('Notification'in window&&Notification.permission!=='granted'?'<button type="button" class="ui-btn btn-quiet btn-sm" data-action="notificationsPermission">Ativar avisos no navegador</button>':'')+'</div></div>'+
 (hasItems?'<div class="notification-list">'+d.notifications.map(n=>
 '<article class="notification-entry '+(n.read_at?'':'is-unread')+'">'+
 '<button type="button" class="notification-item" data-action="notificationOpen" data-id="'+Number(n.id)+'" data-pair="'+esc(n.pair_id||'')+'" data-bulletin="'+Number(n.bulletin_id||0)+'">'+
 '<span class="notification-icon">'+ico(n.kind==='message'?'chat':n.kind==='matched'?'heart':n.kind==='poll'||n.kind==='bulletin'?'megaphone':n.kind==='account_suspended'||n.kind==='account_restored'?'shield':'bell',18)+'</span>'+
 '<span class="notification-copy"><strong>'+esc(summary(n))+'</strong><small>'+new Date(n.created_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})+'</small></span>'+
 ico('chevron',16)+'</button>'+
 '<button type="button" class="notification-dismiss" aria-label="Remover notificação" title="Remover notificação" data-action="notificationsDismiss" data-id="'+Number(n.id)+'">'+ico('close',16)+'</button></article>').join('')+'</div>':
 '<div class="social-empty"><h3>Nenhuma notificação por enquanto.</h3><p>Solicitações, aceitações e mensagens aparecerão aqui por até 24 horas. Você também pode apagar a qualquer momento. Os comunicados oficiais aparecem logo abaixo.</p></div>')+
 (d.notiMore?'<div class="social-more"><button type="button" class="ui-btn btn-outline" data-action="notificationsMore">Carregar mais 15</button></div>':'')+
 '<p class="retention-small">Limpar notificações não apaga mensagens nem cancela solicitações de seguir.</p>'+ 
  '<section class="notifications-official">'+(api.bulletinsView?.()||'')+'</section>';
}
Object.assign(api,{notificationsView,summary});
})();
