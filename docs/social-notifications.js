(function(){
'use strict';
const api=window.entreSocial;
function summary(n){
 const p=n.actor_name||'Uma pessoa';
 return ({follow:p+' quer seguir você.',follow_accepted:p+' aceitou seu pedido.',chat_request:p+' quer conversar com você.',chat_accepted:p+' aceitou conversar.',message:'Nova mensagem de '+p+'.',matched:'Um encontro começou!',ended:'Um encontro terminou.',retention:'A conversa está perto de 20 dias sem mensagens ou anexos. Ela poderá ser excluída para os dois participantes.',account_suspended:'Sua conta foi suspensa pela moderação. Verifique o motivo e o recurso disponível.',account_restored:'Sua conta foi reativada. Você já pode voltar a usar o CONNECT.',system:'Novidades da plataforma.',bulletin:'Novo aviso oficial da administração.',poll:'Nova enquete oficial disponível.',bulletin_reply:p+' respondeu a um aviso oficial.'})[n.kind]||'Você tem uma novidade.';
}
function notificationEntry(n){
 const following=n.kind==='follow'||n.kind==='follow_accepted';
 const title=({follow:'Nova solicitação de seguir',follow_accepted:'Solicitação aceita'})[n.kind]||summary(n);
 const pending=n.kind==='follow'&&api.data.follows?.some(f=>f.sender===n.actor_id);
 const actor=n.actor_name||'Uma pessoa';
 const label=following?'<strong>'+esc(actor)+'</strong><span class="notification-message">'+(n.kind==='follow'?'quer seguir você.':'aceitou sua solicitação para seguir.')+'</span>':'<strong>'+esc(title)+'</strong>';
 return '<article class="notification-entry cn-notice-entry '+(n.read_at?'':'is-unread')+(following?' cn-notice-follow':'')+'"><div class="cn-notice-main"><button type="button" class="notification-item" data-action="notificationOpen" data-id="'+Number(n.id)+'" data-pair="'+esc(n.pair_id||'')+'" data-bulletin="'+Number(n.bulletin_id||0)+'" data-kind="'+esc(n.kind)+'"><span class="notification-icon">'+(following?'<span class="cn-notice-initial">'+esc(actor.trim().slice(0,1).toUpperCase()||'?')+'</span><span class="cn-notice-mini">'+ico('users',12)+'</span>':ico(n.kind==='message'?'chat':n.kind==='matched'?'heart':n.kind==='poll'||n.kind==='bulletin'?'megaphone':n.kind==='account_suspended'||n.kind==='account_restored'?'shield':'bell',18))+'</span><span class="notification-copy">'+(following?'<span class="cn-notice-label">'+esc(title)+'</span>':'')+label+'<small>'+esc(new Date(n.created_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}))+'</small></span></button><button type="button" class="notification-dismiss" aria-label="Remover notificação" data-action="notificationsDismiss" data-id="'+Number(n.id)+'">'+ico('close',16)+'</button></div>'+(pending?'<div class="cn-notice-actions"><button type="button" class="ui-btn btn-dark btn-sm" data-action="followAccept" data-id="'+esc(n.actor_id)+'">'+ico('check',15)+' Aceitar</button><button type="button" class="ui-btn btn-outline btn-sm" data-action="followDecline" data-id="'+esc(n.actor_id)+'">Recusar</button></div>':n.kind==='follow'?'<div class="cn-notice-actions"><button type="button" class="ui-btn btn-outline btn-sm" data-action="nav" data-view="online">Ver solicitações '+ico('chevron',14)+'</button></div>':'')+'</article>';
}
function notificationsView(){
 const d=api.data,personal=d.notifications.filter(n=>!['bulletin','poll'].includes(n.kind)),hasItems=personal.length>0,tab=d.notificationTab||'personal';
 const tabs='<div class="cn-notification-tabs" role="group" aria-label="Tipo de notificação">'+[['personal','Notificações'],['bulletins','Avisos'],['polls','Enquetes']].map(([id,label])=>'<button type="button" data-action="notificationTab" data-value="'+id+'" aria-pressed="'+String(tab===id)+'">'+label+'</button>').join('')+'</div>';
 if(tab!=='personal')return tabs+'<section class="notifications-official">'+(api.bulletinsView?.(tab==='polls'?'poll':'notice')||'')+'</section>';
 return tabs+
 '<div class="notification-controls"><strong>'+d.unread+' não lidas</strong>'+
 '<div><button type="button" class="ui-btn btn-outline btn-sm" data-action="notificationsRead"'+(!d.unread?' disabled':'')+'>Marcar como lidas</button>'+
 '<button type="button" class="ui-btn btn-quiet btn-sm notification-clear-all" data-action="notificationsClear"'+(!hasItems?' disabled':'')+'>Limpar tudo</button>'+
'</div></div>'+
 (hasItems?'<div class="notification-list">'+personal.map(notificationEntry).join('')+'</div>':
 '<div class="social-empty"><h3>Nenhuma notificação por enquanto.</h3><p>As notificações ficam disponíveis por até 24 horas.</p></div>')+
 (d.notiMore?'<div class="social-more"><button type="button" class="ui-btn btn-outline" data-action="notificationsMore">Carregar mais 15</button></div>':'')+
 '<p class="retention-small">Limpar notificações não apaga mensagens nem cancela solicitações de seguir.</p>';
}
Object.assign(api,{notificationsView,summary});
})();
