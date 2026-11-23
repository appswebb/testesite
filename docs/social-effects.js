
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
})();
