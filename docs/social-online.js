
/* Online directory: 12 people per request, opt-in visibility. */
(function(){
const api=window.entreSocial,s=api.data;
function personCard(p){
 const follow=p.follow_status,allowed=p.allow_requests||follow==='accepted'||p.follower_status==='accepted';
 return '<article class="online-person"><div class="online-person-head"><span class="person-online-indicator"></span> ONLINE AGORA</div>'+
 '<div class="online-person-content">'+avatar(p,'large')+'<div><h3>'+esc(p.display_name)+', '+Number(p.age)+'</h3><small>'+esc(genders[p.gender]||'Pessoa')+'</small></div></div>'+
 '<p class="online-person-bio">'+esc(p.bio||'Que tal começar com um oi?')+'</p>'+
 '<div class="online-person-actions"><button type="button" class="ui-btn btn-outline btn-sm" data-action="socialFollow" data-id="'+esc(p.id)+'"'+(follow==='pending'||follow==='accepted'?' disabled':'')+'>'+
 (follow==='accepted'?'✓ Seguindo':follow==='pending'?'Pedido enviado':'+ Seguir')+'</button>'+
 '<button type="button" class="ui-btn btn-dark btn-sm" data-action="socialChat" data-id="'+esc(p.id)+'">'+ico('chat',15)+' Conversar</button></div>'+
 (!allowed?'<small class="online-restriction">Não aceita conversas de desconhecidos. Siga e aguarde o aceite.</small>':'')+'</article>';
}
function inbox(){
 if(!s.follows.length&&!s.chats.length)return '';
 let rows=s.follows.map(f=>'<article class="inbox-item"><div><strong>'+esc(f.display_name)+'</strong><p>Quer seguir você. Aceitar libera a conversa.</p></div><div><button class="ui-btn btn-dark btn-sm" data-action="followAccept" data-id="'+esc(f.sender)+'">Aceitar</button><button class="ui-btn btn-quiet btn-sm" data-action="followDecline" data-id="'+esc(f.sender)+'">Recusar</button></div></article>').join('');
 rows+=s.chats.map(f=>'<article class="inbox-item"><div><strong>'+esc(f.display_name)+'</strong><p>Quer iniciar uma conversa.</p></div><div><button class="ui-btn btn-dark btn-sm" data-action="chatAccept" data-id="'+Number(f.id)+'">Aceitar</button><button class="ui-btn btn-quiet btn-sm" data-action="chatDecline" data-id="'+Number(f.id)+'">Recusar</button></div></article>').join('');
 return '<section class="social-inbox"><div class="online-section-title"><h3>Solicitações recebidas</h3><span class="social-inbox-counter">'+(s.follows.length+s.chats.length)+'</span></div>'+rows+'</section>';
}
function onlineView(){
 const v=Boolean(s.presence.visible),d=Boolean(s.presence.allow_requests);
 return heading('GENTE DE VERDADE','Pessoas <em>online.</em>','Somente perfis que escolheram aparecer. Carregamos grupos de 12 para economizar dados.')+
 '<div class="online-controls"><div><strong>Meu perfil na lista</strong><p>'+(v?'Visível enquanto você estiver no site.':'Você está invisível para a lista de pessoas online.')+'</p></div>'+
 '<button class="social-switch '+(v?'is-on':'')+'" type="button" role="switch" aria-checked="'+v+'" data-action="onlineVisibility">'+(v?'Visível':'Invisível')+'</button></div>'+
 '<div class="online-controls"><div><strong>Conversas de desconhecidos</strong><p>'+(d?'Você decide se aceita cada convite.':'Só seguidores aceitos podem conversar sem convite.')+'</p></div>'+
 '<button class="social-switch '+(d?'is-on':'')+'" type="button" role="switch" aria-checked="'+d+'" data-action="onlineDirect">'+(d?'Liberadas':'Bloqueadas')+'</button></div>'+
 inbox()+'<div class="online-section-title"><h3>Explorar perfis <span class="live-dot"></span></h3><small>Ativos nos últimos 90 segundos</small></div>'+
 (s.online.length?'<div class="online-card-grid">'+s.online.map(personCard).join('')+'</div>':
 '<div class="social-empty">'+ico('user',30)+'<h3>'+(s.loaded?'Nenhuma pessoa visível agora.':'Carregando perfis…')+'</h3><p>A lista respeita a escolha de privacidade de cada pessoa.</p></div>')+
 (s.hasMore?'<div class="social-more"><button class="ui-btn btn-outline" data-action="onlineMore">Carregar mais 12 pessoas</button></div>':'')+
 (s.offset>0?'<div class="social-more"><button class="ui-btn btn-quiet" data-action="onlineRestart">Voltar ao início</button></div>':'')+
 '<div id="onlineScrollAnchor" aria-hidden="true"></div>';
}
Object.assign(api,{onlineView,inbox,personCard});
})();
