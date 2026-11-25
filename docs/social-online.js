
/* Online directory: 12 people per request, opt-in visibility. */
(function(){
const api=window.entreSocial,s=api.data;
function personCard(p){
 const recent=Date.now()-new Date(p.last_seen).getTime()>90000;const follow=p.follow_status,allowed=p.allow_requests||follow==='accepted'||p.follower_status==='accepted';
 return '<article class="online-person cx-online-card '+(window.entreExtras?.isPremium?.(p.id)?'premium-surface':'')+'"><div class="cx-online-cover"><div class="cx-online-rings" aria-hidden="true"></div><span class="cx-online-status"><i class="person-online-indicator '+(recent?'is-reconnecting':'')+'"></i>'+ (recent?'Ativo há pouco':'Online')+'</span></div>'+
 '<div class="cx-online-body"><div class="online-person-content">'+avatar(p,'large')+'<div class="cp-online-identity"><h3>'+profileName(p.id,p.display_name,p.username)+(window.entreExtras?.badge?.(p)||'')+'</h3>'+(p.username?'<small class="person-handle">'+profileName(p.id,'@'+p.username,p.username)+'</small>':'')+'<div class="cx-online-meta"><span>'+esc(genders[p.gender]||'Pessoa')+'</span>'+(Number(p.age)>0?'<span>'+Number(p.age)+' anos</span>':'')+'</div></div></div>'+
 (p.bio?'<p class="online-person-bio">'+esc(p.bio)+'</p>':'<p class="online-person-bio cx-online-no-bio">Sem biografia</p>')+
 '<div class="online-person-actions">'+(window.connectRelationships?.followButton?.(p.id,follow)||'')+
 '<button type="button" class="ui-btn '+(allowed?'btn-dark':'btn-outline')+' btn-sm" data-action="socialChat" data-id="'+esc(p.id)+'" '+(!allowed?'disabled':'')+'>'+ico(allowed?'chat':'lock',15)+' Solicitar conversa</button></div>'+
 (!allowed?'<small class="online-restriction">'+ico('lock',12)+' Pedidos de desconhecidos bloqueados.</small>':'')+'</div></article>';
}
function inbox(){
 if(!s.follows.length&&!s.chats.length)return '';
 let rows=s.follows.map(f=>'<article class="inbox-item"><div><strong>'+profileName(f.sender,f.display_name)+'</strong><p>Quer seguir você. Aceitar libera a conversa.</p></div><div><button class="ui-btn btn-dark btn-sm" data-action="followAccept" data-id="'+esc(f.sender)+'">Aceitar</button><button class="ui-btn btn-quiet btn-sm" data-action="followDecline" data-id="'+esc(f.sender)+'">Recusar</button></div></article>').join('');
 rows+=s.chats.map(f=>'<article class="inbox-item"><div><strong>'+profileName(f.sender,f.display_name)+'</strong><p>Quer iniciar uma conversa.</p></div><div><button class="ui-btn btn-dark btn-sm" data-action="chatAccept" data-id="'+Number(f.id)+'">Aceitar</button><button class="ui-btn btn-quiet btn-sm" data-action="chatDecline" data-id="'+Number(f.id)+'">Recusar</button></div></article>').join('');
 return '<section class="social-inbox"><div class="online-section-title"><h3>Solicitações recebidas</h3><span class="social-inbox-counter">'+(s.follows.length+s.chats.length)+'</span></div>'+rows+'</section>';
}
function onlineView(){
 const v=Boolean(s.presence.visible),d=Boolean(s.presence.allow_requests);
 return '<div class="cn-online-top"><div class="connect-community-totals" aria-label="Indicadores da comunidade"><span class="cc-stat cc-stat-online" title="Pessoas visíveis nos últimos cinco minutos"><i class="cc-presence-dot" aria-hidden="true"></i><strong data-connect-online-count>—</strong><small>online</small></span><span class="cc-stat cc-stat-accounts" title="Contas existentes com perfil criado no CONNECT"><strong data-connect-account-count>—</strong><small>contas criadas</small></span></div><details class="cn-online-filter" '+(s.onlineFilterOpen?'open':'')+'><summary aria-label="Filtros de descoberta" title="Filtros">'+ico('sliders',16)+'<span class="cc-filter-label">Filtros</span></summary><div class="cn-online-filter-panel"><div class="online-controls"><div><strong>Meu perfil na lista</strong></div><button class="social-switch '+(v?'is-on':'')+'" type="button" role="switch" aria-checked="'+v+'" data-action="onlineVisibility">'+(v?'Visível':'Invisível')+'</button></div><div class="online-controls"><div><strong>Conversas de desconhecidos</strong></div><button class="social-switch '+(d?'is-on':'')+'" type="button" role="switch" aria-checked="'+d+'" data-action="onlineDirect">'+(d?'Liberadas':'Bloqueadas')+'</button></div></div></details></div>'+
 inbox()+
 (s.online.length?'<div class="online-card-grid">'+s.online.map(personCard).join('')+'</div>':
 '<div class="social-empty">'+ico('users',30)+'<h3>'+(s.onlineError?'Não foi possível carregar os perfis.':s.loaded?'Ainda não há perfis visíveis.':'Carregando pessoas…')+'</h3><p>A lista mostra perfis visíveis ativos ou em reconexão recente.</p><button type="button" class="ui-btn btn-dark btn-sm" data-action="nav" data-view="connect">Encontrar alguém ao vivo</button></div>')+
 (s.hasMore?'<div class="social-more"><button class="ui-btn btn-outline" data-action="onlineMore">Carregar mais 12 pessoas</button></div>':'')+
 (s.offset>0?'<div class="social-more"><button class="ui-btn btn-quiet" data-action="onlineRestart">Voltar ao início</button></div>':'')+
 '<div id="onlineScrollAnchor" aria-hidden="true"></div>';
}
document.addEventListener('toggle',event=>{if(event.target.matches?.('.cn-online-filter'))s.onlineFilterOpen=event.target.open},true);
Object.assign(api,{onlineView,inbox,personCard});
})();
