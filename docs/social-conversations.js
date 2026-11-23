
(function(){
const api=window.entreSocial,d=api.data;
function row(pair){
 const peer=state.pairsProfiles?.[pair.id]||{id:pair.a===state.session.user.id?pair.b:pair.a,display_name:'Sua conexão'};
 const p=api.pref(pair),folder=p.folder||pair.origin||'live',archived=!!p.archived_at;
 return '<article class="conversation-entry"><button class="convo-card" data-action="openpair" data-id="'+esc(pair.id)+'">'+avatar(peer)+'<div class="convo-details"><strong>'+esc(peer.display_name)+'</strong><p>'+esc(archived?'Arquivada':pair.status==='closed'?'Encontro encerrado':'Conversa liberada')+'</p><small>Começou em '+(pair.origin==='online'?'Pessoas online':'Chat ao vivo')+'</small></div>'+ico('chevron')+'</button>'+
 '<div class="conversation-entry-actions"><button data-action="'+(p.pinned?'conversationUnpin':'conversationPin')+'" data-id="'+esc(pair.id)+'">'+(p.pinned?'★ Fixada':'☆ Fixar')+'</button>'+
 '<label>Mover <select data-social-folder="'+esc(pair.id)+'"><option value="live"'+(folder==='live'?' selected':'')+'>Ao vivo</option><option value="online"'+(folder==='online'?' selected':'')+'>Online</option><option value="other"'+(folder==='other'?' selected':'')+'>Outras</option></select></label>'+
 '<button data-action="'+(archived?'conversationRestore':'conversationArchive')+'" data-id="'+esc(pair.id)+'">'+(archived?'Restaurar':'Arquivar')+'</button></div></article>';
}
function conversationsView(){
 const filters=[['all','Todas'],['live','Ao vivo'],['online','Online'],['other','Outras'],['archived','Arquivadas']];
 const pairs=state.pairs.filter(p=>['closed','connected'].includes(p.status));
 pairs.sort((a,b)=>Number(!!api.pref(b).pinned)-Number(!!api.pref(a).pinned)||new Date(b.last_activity_at||b.created_at)-new Date(a.last_activity_at||a.created_at));
 const selected=pairs.filter(p=>{const x=api.pref(p);return d.filter==='archived'?!!x.archived_at:!x.archived_at&&(d.filter==='all'||d.filter===(x.folder||p.origin||'live'));}).slice(0,50);
 return heading('SEU HISTÓRICO','Suas <em>conversas.</em>','Após 10 dias de inatividade, o conteúdo do chat é removido. O contato continua salvo.')+
 '<div class="conversation-tabs">'+filters.map(f=>'<button data-action="convoFilter" data-value="'+f[0]+'" class="'+(d.filter===f[0]?'active':'')+'">'+f[1]+'</button>').join('')+'</div>'+
 (selected.length?'<div class="convo-list conversation-list-v2">'+selected.map(row).join('')+'</div>':'<div class="social-empty"><h3>Nenhuma conversa nesta aba.</h3><button class="ui-btn btn-dark" data-action="nav" data-view="online">Ver pessoas online</button></div>')+
 '<p class="retention-small">Arquivar não apaga mensagens na hora. Textos vencem após 10 dias sem atividade; a conexão com a pessoa permanece.</p>';
}
Object.assign(api,{conversationsView,conversationRow:row});
})();
