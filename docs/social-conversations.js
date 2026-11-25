(function(){
'use strict';
const api=window.entreSocial,d=api.data;
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
 avatar(peer)+'<div class="convo-details"><strong>'+profileName(peer.id,peer.display_name,peer.username)+(window.entreExtras?.badge?.(peer)||'')+'</strong>'+
 '<p>'+(peer.username?'@'+esc(peer.username)+' · ':'')+(archived?'Arquivada':p.pinned?'Fixada · conversa permanente':'Conversa permanente')+'</p>'+
 '<small>Começou em '+(pair.origin==='online'?'Pessoas online':'Chat ao vivo')+'</small></div>'+
 '<span class="cp-chat-count" data-chat-unread="'+esc(pair.id)+'" hidden></span><span class="conversation-card-arrow">'+ico('chevron',17)+'</span></button>'+conversationMenu(pair)+'</article>';
}
function conversationsView(){
 const filters=[['all','Todas'],['live','Ao vivo'],['online','Online'],['other','Outras'],['archived','Arquivadas']];
 const pairs=state.pairs.filter(p=>p.status==='connected'&&!api.isHidden?.(p.id));
 pairs.sort((a,b)=>Number(Boolean(api.pref(b).pinned))-Number(Boolean(api.pref(a).pinned))||new Date(b.last_activity_at||b.created_at)-new Date(a.last_activity_at||a.created_at));
 const selected=pairs.filter(p=>{const x=api.pref(p);return d.filter==='archived'?Boolean(x.archived_at):!x.archived_at&&(d.filter==='all'||d.filter===(x.folder||p.origin||'live'));}).slice(0,50);
 return heading('MATCH CONFIRMADO','Suas <em>conversas.</em>','Organize suas conversas, fixe ou arquive contatos.')+
 (window.entreSearch?.conversationSearchMarkup?.()||'')+
 '<div class="conversation-tabs">'+filters.map(f=>'<button type="button" data-action="convoFilter" data-value="'+f[0]+'" class="'+(d.filter===f[0]?'active':'')+'">'+f[1]+'</button>').join('')+'</div>'+
 (selected.length?'<div class="convo-list conversation-list-v2">'+selected.map(row).join('')+'</div>':
 '<div class="social-empty"><h3>Nenhuma conversa nesta categoria.</h3><p>As conversas aparecem após uma conexão aceita.</p><button class="ui-btn btn-dark btn-sm" data-action="nav" data-view="connect">Conhecer alguém</button></div>')+
 '<p class="retention-small">Após 20 dias sem novas mensagens ou anexos de nenhum dos participantes, a conversa inteira é excluída para ambos, inclusive se estiver fixada ou arquivada. Apagar manualmente remove o histórico apenas da sua conta.</p>';
}
function profileModal(){
 const p=d.socialProfile;if(!p)return '';
 const handle=esc(p.username||''),preview=p.id===state.session?.user?.id;
 return '<div class="modal-backdrop" id="modalBackdrop"><div class="modal-card social-profile-modal cp-visitor" role="dialog" aria-modal="true" aria-labelledby="socialProfileTitle">'+
 '<div class="cp-visitor-top"><strong>'+(preview?'Visualização como visitante':'Perfil')+'</strong><button type="button" class="cp-icon-button" data-action="closemodal" aria-label="Fechar perfil">'+ico('close',20)+'</button></div>'+
 '<div class="cp-visitor-scroll"><div class="cp-banner" data-cp-handle="'+handle+'" aria-label="Banner do perfil"></div><div class="cp-visitor-body"><div class="cp-visitor-avatar">'+avatar(p,'large')+'</div><div class="cp-person-title"><h2 id="socialProfileTitle">'+esc(p.display_name||'Pessoa do CONNECT')+'</h2>'+ (window.entreExtras?.badge?.(p)||'')+'</div>'+
 '<span class="person-handle">'+(handle?'@'+handle:'')+'</span><small class="cp-person-meta">'+esc(p.age||'')+(p.age?' anos · ':'')+esc(genders[p.gender]||'')+'</small>'+
 (window.connectRelationships?.stats?.(p.id)||'')+'<div class="cp-bio"><strong>Sobre</strong><p>'+esc(p.bio||'Esta pessoa ainda não escreveu uma apresentação.')+'</p></div>'+
 '</div></div><footer class="cp-visitor-footer">'+(preview?'<p class="cpv-notice">Esta é a visualização que outras pessoas têm do seu perfil. As ações abaixo são apenas uma prévia.</p><div class="cp-visitor-actions"><button type="button" class="ui-btn btn-dark" disabled>'+ico('chat',17)+' Solicitar conversa</button><button type="button" class="ui-btn btn-outline btn-sm" disabled>Seguir</button></div>':(window.connectProfileVisits?.note?.()||'')+'<div class="cp-visitor-actions"><button type="button" class="ui-btn btn-dark" data-action="socialChat" data-id="'+esc(p.id)+'">'+ico('chat',17)+' Conversar</button>'+ (window.connectRelationships?.followButton?.(p.id,p.follow_status)||'')+'</div>')+
 (handle?'<button type="button" class="cp-share-link" data-action="copyUsernameLink" data-username="'+handle+'">'+ico('link',17)+' Compartilhar perfil</button>':'')+'</footer></div></div>';
}

let conversationDialog=null;
function closeConversationMenu(){if(conversationDialog){const el=conversationDialog;conversationDialog=null;if(el.open)el.close();el.remove();}}
document.addEventListener('click',e=>{
 const trigger=e.target.closest?.('.conversation-menu>summary');
 if(trigger){e.preventDefault();e.stopPropagation();closeConversationMenu();const panel=trigger.parentElement.querySelector('.conversation-menu-panel');if(!panel)return;
 const dialog=document.createElement('dialog');dialog.className='cp-conversation-dialog';dialog.setAttribute('aria-label','Opções da conversa');
 dialog.innerHTML='<header><strong>Opções da conversa</strong><button type="button" class="cp-dialog-close" aria-label="Fechar">×</button></header>'+panel.innerHTML;
 conversationDialog=dialog;document.body.append(dialog);
 dialog.addEventListener('close',()=>{if(conversationDialog===dialog){conversationDialog=null;dialog.remove();if(trigger.isConnected)trigger.focus();}});
 dialog.addEventListener('click',event=>{if(event.target.closest('.cp-dialog-close')||event.target===dialog)closeConversationMenu();else if(event.target.closest('[data-action]'))queueMicrotask(closeConversationMenu);});
 dialog.addEventListener('change',event=>{if(event.target.matches('[data-social-folder]'))queueMicrotask(closeConversationMenu)});
 dialog.showModal();return;}
},true);

Object.assign(api,{conversationsView,conversationRow:row,conversationMenu,profileModal});
})();
