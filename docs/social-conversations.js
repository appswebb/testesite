(function(){
'use strict';
const api=window.entreSocial,d=api.data;
const DAY=86400000;
function conversationMenu(pair){
 const pref=api.pref(pair),folder=pref.folder||pair.origin||'live',archived=Boolean(pref.archived_at);
 return '<details class="conversation-menu" data-pair-menu="'+esc(pair.id)+'">'+
 '<summary title="Opções da conversa" aria-label="Opções da conversa">'+ico('more',20)+'</summary>'+
 '<div class="conversation-menu-panel" role="group" aria-label="Organizar conversa">'+
 '<span class="conversation-menu-title">Organizar conversa</span>'+
 '<button type="button" data-action="'+(pref.pinned?'conversationUnpin':'conversationPin')+'" data-id="'+esc(pair.id)+'">'+(pref.pinned?'Desafixar':'Fixar no topo')+'</button>'+
 '<button type="button" data-action="'+(archived?'conversationRestore':'conversationArchive')+'" data-id="'+esc(pair.id)+'">'+(archived?'Tirar do arquivo':'Arquivar conversa')+'</button>'+
 '<label class="conversation-move-label" for="folder-'+esc(pair.id)+'">Mover para</label>'+
 '<select id="folder-'+esc(pair.id)+'" aria-label="Mover conversa para uma categoria" data-social-folder="'+esc(pair.id)+'">'+
 '<option value="live"'+(folder==='live'?' selected':'')+'>Ao vivo</option>'+
 '<option value="online"'+(folder==='online'?' selected':'')+'>Online</option>'+
 '<option value="other"'+(folder==='other'?' selected':'')+'>Outras</option></select>'+
 '<span class="conversation-menu-divider"></span>'+
 '<button class="conversation-delete" type="button" data-action="conversationDeletePrompt" data-id="'+esc(pair.id)+'">Apagar conversa</button>'+
 '</div></details>';
}
function row(pair){
 const peer=state.pairsProfiles?.[pair.id]||{id:pair.a===state.session.user.id?pair.b:pair.a,display_name:'Sua conversa'};
 const p=api.pref(pair),archived=Boolean(p.archived_at);
 return '<article class="conversation-entry '+(p.pinned?'is-pinned':'')+'">'+
 '<button class="convo-card" type="button" data-action="openpair" data-id="'+esc(pair.id)+'">'+
 avatar(peer)+'<div class="convo-details"><strong>'+esc(peer.display_name)+'</strong>'+
 '<p>'+(archived?'Arquivada':p.pinned?'Fixada · conversa permanente':'Conversa permanente')+'</p>'+
 '<small>Começou em '+(pair.origin==='online'?'Pessoas online':'Chat ao vivo')+'</small></div>'+
 '<span class="conversation-card-arrow">'+ico('chevron',17)+'</span></button>'+conversationMenu(pair)+'</article>';
}
function conversationsView(){
 const filters=[['all','Todas'],['live','Ao vivo'],['online','Online'],['other','Outras'],['archived','Arquivadas']];
 const pairs=state.pairs.filter(p=>p.status==='connected'&&!api.isHidden?.(p.id));
 pairs.sort((a,b)=>Number(Boolean(api.pref(b).pinned))-Number(Boolean(api.pref(a).pinned))||new Date(b.last_activity_at||b.created_at)-new Date(a.last_activity_at||a.created_at));
 const selected=pairs.filter(p=>{const x=api.pref(p);return d.filter==='archived'?Boolean(x.archived_at):!x.archived_at&&(d.filter==='all'||d.filter===(x.folder||p.origin||'live'));}).slice(0,50);
 return heading('MATCH CONFIRMADO','Suas <em>conversas.</em>','Aqui ficam os chats permanentes. Para organizar ou apagar, use o menu de três pontos ao lado de cada conversa.')+
 '<div class="conversation-tabs">'+filters.map(f=>'<button type="button" data-action="convoFilter" data-value="'+f[0]+'" class="'+(d.filter===f[0]?'active':'')+'">'+f[1]+'</button>').join('')+'</div>'+
 (selected.length?'<div class="convo-list conversation-list-v2">'+selected.map(row).join('')+'</div>':
 '<div class="social-empty"><h3>Nenhuma conversa nesta categoria.</h3><p>As conversas aparecem quando os dois escolhem continuar, ou quando um pedido para seguir é aceito.</p><button class="ui-btn btn-dark btn-sm" data-action="nav" data-view="connect">Conhecer alguém</button></div>')+
 '<p class="retention-small">Apagar uma conversa remove o histórico apenas da sua conta. Se chegar uma nova mensagem, o chat volta sem as mensagens que você apagou.</p>';
}
function recentPair(pair,now){
 const peer=state.pairsProfiles?.[pair.id]||{id:pair.a===state.session.user.id?pair.b:pair.a,display_name:'Pessoa indisponível'};
 const closed=new Date(pair.closed_at||pair.expires_at||pair.created_at).getTime();
 const hours=Math.max(1,Math.ceil((closed+DAY-now)/3600000));
 return '<article class="recent-connection">'+avatar(peer,'large')+'<div class="recent-connection-body"><strong>'+esc(peer.display_name)+'</strong><small>Encontro ao vivo encerrado · '+hours+'h restantes</small><p>Se quiserem se reencontrar, envie um pedido para seguir. A conversa normal só é liberada após o aceite.</p></div><div class="recent-actions"><button class="ui-btn btn-outline btn-sm" type="button" data-action="profileOpen" data-id="'+esc(peer.id)+'">Ver perfil</button><button class="ui-btn btn-dark btn-sm" type="button" data-action="socialFollow" data-id="'+esc(peer.id)+'">Seguir</button></div></article>';
}
function connectionsView(){
 const now=Date.now();
 const pairs=state.pairs.filter(p=>p.status==='closed'&&p.origin==='live'&&
  new Date(p.closed_at||p.expires_at||p.created_at).getTime()>now-DAY &&
  new Date(p.closed_at||p.expires_at||p.created_at).getTime()<=now);
 return heading('ATÉ 24 HORAS','Suas <em>conexões.</em>','Pessoas de encontros ao vivo encerrados ficam aqui por apenas 24 horas. Nenhum chat temporário é salvo.')+
 '<div class="connections-info"><strong>Gostou de alguém?</strong><p>Abra o perfil ou envie uma solicitação para seguir. Se a pessoa aceitar, vocês poderão conversar normalmente na aba Conversas.</p></div>'+
 (pairs.length?'<div class="recent-connections">'+pairs.slice(0,40).map(p=>recentPair(p,now)).join('')+'</div>':
 '<div class="social-empty">'+ico('link',30)+'<h3>Nenhuma conexão recente.</h3><p>Depois de um encontro ao vivo que não virou match, o perfil fica disponível por 24 horas. Aproveite para seguir quem você gostaria de reencontrar.</p><button class="ui-btn btn-dark btn-sm" data-action="nav" data-view="connect">Conhecer alguém ao vivo</button></div>');
}
function profileModal(){
 const p=d.socialProfile;if(!p)return '';
 return '<div class="modal-backdrop" id="modalBackdrop"><div class="modal-card social-profile-modal" role="dialog" aria-modal="true" aria-labelledby="socialProfileTitle">'+
 '<div class="social-profile-person">'+avatar(p,'large')+'<div><h2 id="socialProfileTitle">'+esc(p.display_name)+'</h2><small>'+esc(p.age||'')+(p.age?' anos · ':'')+esc(genders[p.gender]||'')+'</small></div></div>'+
 '<p>'+esc(p.bio||'Esta pessoa ainda não escreveu uma apresentação.')+'</p>'+
 '<div class="modal-actions"><button class="ui-btn btn-outline btn-sm" data-action="closemodal">Fechar</button>'+
 '<button class="ui-btn btn-dark btn-sm" data-action="socialFollow" data-id="'+esc(p.id)+'">Solicitar para seguir</button></div></div></div>';
}
Object.assign(api,{conversationsView,conversationRow:row,conversationMenu,connectionsView,profileModal});
})();
