
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
 return '<div class="chat-origin-bar"><div><strong>'+ico('spark',14)+' Começou em '+(pair.origin==='online'?'Pessoas online':'Chat ao vivo')+'</strong><small>Mova a conversa para outra aba</small></div>'+
 '<div class="chat-origin-actions"><select aria-label="Mover conversa" data-social-folder="'+esc(pair.id)+'">'+
 '<option value="live"'+(folder==='live'?' selected':'')+'>Ao vivo</option><option value="online"'+(folder==='online'?' selected':'')+'>Online</option><option value="other"'+(folder==='other'?' selected':'')+'>Outras</option></select>'+
 '<button data-action="'+(p.pinned?'conversationUnpin':'conversationPin')+'" data-id="'+esc(pair.id)+'">'+(p.pinned?'★':'☆')+'</button>'+
 '<button data-action="'+(archived?'conversationRestore':'conversationArchive')+'" data-id="'+esc(pair.id)+'">'+(archived?'Restaurar':'Arquivar')+'</button></div></div>';
};

})();
