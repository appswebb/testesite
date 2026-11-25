/* CONNECT Moments + opt-in discovery. No fake content; isolated storage and account-scoped requests. */
(()=>{
'use strict';
const bucket='connect-moments';
const interests={musica:'Música',games:'Games',cinema:'Cinema',esportes:'Esportes',tecnologia:'Tecnologia',arte:'Arte',viagens:'Viagens',livros:'Livros',pets:'Pets',gastronomia:'Gastronomia',fitness:'Fitness',natureza:'Natureza',estudos:'Estudos',fotografia:'Fotografia'};
const goals={amizade:'Amizade',relacionamento:'Relacionamento',conversar:'Conversar',comunidade:'Comunidade'};
const reasons={harassment:'Assédio',hate:'Ódio ou violência',spam:'Spam',underage:'Menor de idade',fake:'Perfil falso',other:'Outro motivo'};
const questions=['Qual foi a melhor parte do seu dia?','Qual música você ouviria no repeat?','Qual lugar você tem vontade de conhecer?','Qual filme você recomenda?','Se pudesse aprender algo novo agora, o que seria?','O que faz você rir de verdade?','Qual seria seu fim de semana perfeito?','Qual hobby você gostaria de compartilhar?'];
let owner=null,epoch=0,host=null,observer=null,expiryTimer=0,visibleCard=null,muted=true,working=false,rows=[],activeDialog=null;
const uid=()=>state.session?.user?.id||null;
const $=id=>document.getElementById(id);
const alive=(id,view)=>uid()===id&&state.view===view&&!state.suspension&&!maintenanceIsActive();
const safe=(value)=>esc(String(value??''));
async function rpc(name,args={}){const {data,error}=await db.rpc(name,args);if(error)throw error;return data;}
function dispose(){
 epoch++;observer?.disconnect();observer=null;clearTimeout(expiryTimer);expiryTimer=0;visibleCard=null;
 host?.querySelectorAll('video').forEach(v=>{v.pause();v.removeAttribute('src');v.load()});
 if(activeDialog){activeDialog.close?.();activeDialog.remove();activeDialog=null}
 host=null;rows=[];
}
function momentsView(){return '<section class="cx-next" id="cxMoments"><div class="cx-next-head"><div><small>CONNECT · 24H</small><h2>Moments</h2><p>Um instante do seu dia. Uma nova conexão.</p></div><button type="button" class="cx-next-btn" data-cx-next="upload-toggle">+ Criar</button></div><details id="cxMomentComposer" class="cx-next-panel"><summary>Publicar um vídeo curto</summary><form id="cxMomentUpload"><label>Vídeo MP4 ou WebM<input name="clip" type="file" accept="video/mp4,video/webm" required></label><label>Legenda<textarea name="caption" maxlength="180" rows="2" placeholder="O que está acontecendo?"></textarea></label><small>Até 30 segundos na interface, 6 MB e 3 publicações a cada 24 horas. O vídeo desaparece após 24 horas.</small><button class="cx-next-btn" type="submit">Publicar Moment</button><p id="cxUploadStatus" role="status"></p></form></details><div class="cx-next-tools"><span>Arraste para ver o próximo</span><button type="button" data-cx-next="refresh" class="cx-next-plain">Atualizar</button></div><div id="cxMomentFeed" class="cx-moment-feed" aria-live="polite"><div class="cx-next-empty">Carregando Moments…</div></div></section>'}
function discoverView(){return '<section class="cx-next" id="cxDiscover"><div class="cx-next-head"><div><small>CONNECT · AFINIDADES</small><h2>Descubra pessoas</h2><p>Descubra afinidades e pessoas diferentes de você, mesmo quando não estão online.</p></div></div><div id="cxDiscoverySettings" class="cx-next-panel">Carregando suas preferências…</div><div class="cx-next-tools"><strong>Para você · novas possibilidades</strong><button type="button" class="cx-next-plain" data-cx-next="discover-refresh">Novas sugestões</button></div><div class="cx-discover-grid" id="cxDiscoverPeople"><div class="cx-next-empty">Buscando pessoas…</div></div></section>'}
function countdown(row){const mins=Math.max(0,Math.ceil((Date.parse(row.expires_at)-Date.now())/60000));return mins>=60?Math.floor(mins/60)+'h '+mins%60+'min':mins+'min'}
function momentCard(m){return '<article class="cx-moment" data-moment-id="'+safe(m.id)+'"><video playsinline muted loop preload="none" aria-label="Moment de '+safe(m.display_name)+'"></video><div class="cx-moment-shade"></div><div class="cx-moment-top"><span>EXPIRA EM '+safe(countdown(m))+'</span><button type="button" data-cx-next="sound" aria-label="Ativar ou silenciar áudio">Som</button></div><div class="cx-moment-bottom"><div><a class="cx-moment-person" href="./perfil.html?u='+encodeURIComponent(m.username||'')+'">@'+safe(m.username||m.display_name)+'</a><p>'+safe(m.caption)+'</p></div><div class="cx-moment-actions"><button type="button" data-cx-next="like" aria-pressed="'+!!m.liked+'">'+(m.liked?'♥':'♡')+' <span>'+Number(m.likes||0)+'</span></button><button type="button" data-cx-next="comments">Comentar · '+Number(m.comments||0)+'</button>'+(m.author_id===uid()?'<button type="button" data-cx-next="remove">Excluir</button>':'<button type="button" data-cx-next="report">Denunciar</button>')+'</div></div><button class="cx-moment-play" type="button" data-cx-next="play" aria-label="Reproduzir vídeo">▶</button><p class="cx-moment-error" hidden role="status"></p></article>'}
async function activate(card,manual=false){
 if(!card||!card.isConnected)return;
 const id=card.dataset.momentId,m=rows.find(x=>x.id===id),video=card.querySelector('video'),ticket=epoch,account=uid();
 if(!m||Date.parse(m.expires_at)<=Date.now())return;
 if(visibleCard&&visibleCard!==card){const old=visibleCard.querySelector('video');old?.pause();old?.removeAttribute('src');old?.load();}
 visibleCard=card;if(document.hidden)return;
 const error=card.querySelector('.cx-moment-error'),button=card.querySelector('.cx-moment-play');
 if(!video.src||!video.getAttribute('src')){
  try{
   const seconds=Math.max(1,Math.min(120,Math.floor((Date.parse(m.expires_at)-Date.now())/1000)));
   const {data,error:e}=await db.storage.from(bucket).createSignedUrl(m.path,seconds);
   if(e||!data?.signedUrl)throw e||Error('Vídeo indisponível');
   if(epoch!==ticket||!alive(account,'moments')||visibleCard!==card||!card.isConnected||document.hidden)return;
   video.src=data.signedUrl;
  }catch(e){if(card.isConnected){error.hidden=false;error.textContent='Vídeo indisponível. Toque para tentar novamente.';button.hidden=false;}return;}
 }
 if(!card.isConnected||visibleCard!==card||document.hidden)return;
 error.hidden=true;video.muted=muted;
 try{await video.play();button.hidden=true;}catch(_){button.hidden=false;}
}
function scheduleExpiry(){clearTimeout(expiryTimer);const times=rows.map(m=>Date.parse(m.expires_at)).filter(t=>t>Date.now());if(times.length)expiryTimer=setTimeout(()=>{if(state.view!=='moments')return;rows=rows.filter(m=>Date.parse(m.expires_at)>Date.now());paintMoments();},Math.max(100,Math.min(...times)-Date.now()+50));}
function paintMoments(){
 const feed=$('cxMomentFeed');if(!feed)return;
 observer?.disconnect();observer=null;visibleCard=null;
 rows=rows.filter(m=>Date.parse(m.expires_at)>Date.now());feed.innerHTML=rows.length?rows.map(momentCard).join(''):'<div class="cx-next-empty"><strong>Nenhum Moment por enquanto</strong><p>Seja a primeira pessoa a compartilhar um vídeo.</p><button class="cx-next-btn" type="button" data-cx-next="upload-toggle">Criar Moment</button></div>';
 if(rows.length){
  if('IntersectionObserver' in window){observer=new IntersectionObserver(entries=>{for(const e of entries){if(e.isIntersecting&&e.intersectionRatio>=.65)void activate(e.target);else if(e.target===visibleCard&&e.intersectionRatio<.35){const v=e.target.querySelector('video');v?.pause();v?.removeAttribute('src');v?.load();visibleCard=null;}}},{root:feed,threshold:[.25,.65]});feed.querySelectorAll('.cx-moment').forEach(c=>observer.observe(c));}
  else void activate(feed.querySelector('.cx-moment'));
 }
 scheduleExpiry();
}
async function loadMoments(){const id=uid(),ticket=epoch;try{const data=await rpc('connect_moments_feed');if(ticket!==epoch||!alive(id,'moments'))return;rows=Array.isArray(data)?data:[];paintMoments();}catch(e){if(ticket===epoch&&alive(id,'moments'))$('cxMomentFeed').textContent='Não foi possível carregar os Moments. Tente atualizar.';}}
function videoDuration(file){return new Promise((resolve,reject)=>{const v=document.createElement('video'),url=URL.createObjectURL(file);let t;function end(error){clearTimeout(t);v.removeAttribute('src');v.load();URL.revokeObjectURL(url);if(error)reject(error);else resolve();}v.preload='metadata';v.onloadedmetadata=()=>{if(!Number.isFinite(v.duration)||v.duration<=0||v.duration>30.1)end(Error('O vídeo deve ter até 30 segundos.'));else if(!v.videoWidth||!v.videoHeight)end(Error('Arquivo de vídeo inválido.'));else end();};v.onerror=()=>end(Error('Não foi possível abrir o vídeo.'));t=setTimeout(()=>end(Error('Não foi possível validar o vídeo.')),10000);v.src=url;});}
async function publish(form){
 if(working)return;const id=uid(),file=form.elements.clip.files?.[0],caption=form.elements.caption.value.trim(),status=$('cxUploadStatus'),button=form.querySelector('button[type=submit]');let reservation=null;
 if(!file||!['video/mp4','video/webm'].includes(file.type)||file.size>6291456||file.size<1){status.textContent='Escolha MP4 ou WebM de até 6 MB.';return;}
 working=true;button.disabled=true;status.textContent='Validando vídeo…';
 try{await videoDuration(file);if(!alive(id,'moments'))return;status.textContent='Enviando…';reservation=await rpc('connect_moment_reserve',{_format:file.type==='video/mp4'?'mp4':'webm'});if(uid()!==id)throw Error('Sua sessão mudou.');
 const {error}=await db.storage.from(bucket).upload(reservation.path,file,{contentType:file.type,cacheControl:'0',upsert:false});if(error)throw error;
 if(uid()!==id)throw Error('Sua sessão mudou.');await rpc('connect_moment_publish',{_id:reservation.id,_caption:caption});reservation=null;
 if(alive(id,'moments')&&form.isConnected){form.reset();status.textContent='Publicado!';$('cxMomentComposer').open=false;await loadMoments();toast('Moment publicado por até 24 horas.');}
 }catch(e){if(reservation&&uid()===id)try{await rpc('connect_moment_remove',{_id:reservation.id})}catch(_){}if(form.isConnected)status.textContent=e.message||'Não foi possível publicar.';}finally{working=false;if(button.isConnected)button.disabled=false;}
}
function dialog(title,body){activeDialog?.close?.();activeDialog?.remove();const d=document.createElement('dialog');d.className='cx-next-dialog';d.dataset.cxView=state.view;d.dataset.cxPair=state.pair?.id||'';d.innerHTML='<header><strong>'+safe(title)+'</strong><button type="button" data-cx-next="close-dialog" aria-label="Fechar">×</button></header>'+body;document.body.append(d);activeDialog=d;d.addEventListener('close',()=>{if(activeDialog===d)activeDialog=null;d.remove()},{once:true});d.showModal();return d;}
async function comments(m){
 const account=uid(),d=dialog('Comentários','<div id="cxMomentComments" class="cx-next-comments">Carregando…</div><form id="cxMomentCommentForm" data-id="'+safe(m.id)+'"><input name="body" required minlength="2" maxlength="300" placeholder="Escreva um comentário"><button class="cx-next-btn" type="submit">Enviar</button></form>');await refreshComments(m.id,d,account);
}
async function refreshComments(id,d,account){try{const items=await rpc('connect_moment_comments_list',{_id:id});if(uid()!==account||!d.isConnected)return;d.querySelector('#cxMomentComments').innerHTML=items.length?items.map(c=>'<article><strong>'+safe(c.display_name)+'</strong><p>'+safe(c.body)+'</p>'+(c.author_id===account?'<button class="cx-next-plain" type="button" data-cx-next="remove-comment" data-id="'+Number(c.id)+'" data-moment="'+safe(id)+'">Excluir</button>':'')+'</article>').join(''):'<p>Ainda não há comentários.</p>';}catch(e){if(d.isConnected)d.querySelector('#cxMomentComments').textContent='Comentários indisponíveis.';}}
function interestMarkup(me){return '<form id="cxDiscoveryForm"><h3>Seus interesses</h3><p>Opcional: escolha até 8. Seus interesses ajudam a personalizar, mas não limitam quem você pode conhecer. Você decide se aparece nas recomendações.</p><div class="cx-interest-grid">'+Object.entries(interests).map(([key,label])=>'<label><input type="checkbox" name="interest" value="'+key+'" '+(me.interests?.includes(key)?'checked':'')+'><span>'+label+'</span></label>').join('')+'</div><label>O que procura?<select name="goal">'+Object.entries(goals).map(([key,label])=>'<option value="'+key+'" '+(me.goal===key?'selected':'')+'>'+label+'</option>').join('')+'</select></label><label class="cx-discover-opt"><input name="visible" type="checkbox" '+(me.visible?'checked':'')+'> Permitir que meu perfil apareça na descoberta</label><button class="cx-next-btn" type="submit">Salvar preferências</button></form>'}
let discoveryRotation=0;
async function loadDiscover(settings=true){
 const account=uid(),ticket=epoch;try{if(settings){const me=await rpc('connect_discovery_me');if(!alive(account,'discover')||epoch!==ticket)return;$('cxDiscoverySettings').innerHTML=interestMarkup(me);}const people=await rpc('connect_discovery_people_v2',{_rotation:discoveryRotation});if(!alive(account,'discover')||epoch!==ticket)return;
 await Promise.allSettled(people.map(signAvatar));if(!alive(account,'discover')||epoch!==ticket)return;
 $('cxDiscoverPeople').innerHTML=people.length?people.map(p=>'<article class="cx-next-person">'+avatar(p,'large')+'<div><strong>'+safe(p.display_name)+', '+Number(p.age)+'</strong><small>@'+safe(p.username)+' · '+(p.online?'Online':'Perfil disponível')+'</small><p class="cx-discover-reason">'+safe(p.reason==='shared'?(Number(p.common)===1?'1 interesse em comum':Number(p.common)+' interesses em comum'):p.reason==='goal'?'Objetivos parecidos':'Uma nova possibilidade')+' · '+safe(goals[p.goal]||'Conversar')+'</p><div class="cx-interest-tags">'+p.interests.map(t=>'<span>'+safe(interests[t]||t)+'</span>').join('')+'</div><a class="cx-next-btn" href="./perfil.html?u='+encodeURIComponent(p.username||'')+'">Ver perfil</a></div></article>').join(''):'<div class="cx-next-empty"><strong>A descoberta está começando</strong><p>Quando outras pessoas permitirem aparecer na descoberta, elas serão sugeridas, mesmo sem interesses selecionados.</p><button type="button" class="cx-next-btn" data-action="nav" data-view="online">Ver pessoas online</button></div>';
 }catch(e){if(alive(account,'discover')&&epoch===ticket){$('cxDiscoverPeople').textContent='Não foi possível carregar. Tente novamente.';if(settings)$('cxDiscoverySettings').textContent='Preferências indisponíveis.';}}
}
function afterRender(){
 if(activeDialog&&(activeDialog.dataset.cxView!==state.view||activeDialog.dataset.cxPair!==(state.pair?.id||''))){activeDialog.close();activeDialog=null;}
 const next=$('cxMoments')||$('cxDiscover'),id=uid();
 if(owner!==id){dispose();owner=id;muted=true;discoveryRotation=0;}
 if(next===host)return;dispose();host=next;if(!next)return;
 if(next.id==='cxMoments')void loadMoments();else void loadDiscover();
}
document.addEventListener('visibilitychange',()=>{if(typeof state==='undefined')return;if(document.hidden){visibleCard?.querySelector('video')?.pause();}else if(state.view==='moments'&&visibleCard)void activate(visibleCard);});
document.addEventListener('click',async e=>{
 const b=e.target.closest?.('[data-cx-next]');if(!b||b.disabled)return;
 const action=b.dataset.cxNext,card=b.closest('.cx-moment'),m=rows.find(r=>r.id===card?.dataset.momentId),account=uid();
 try{
 if(action==='extend'){const pair=state.pair?.id;if(!pair)return;b.disabled=true;const result=await rpc('connect_encounter_extend',{_pair:pair});if(uid()!==account||state.pair?.id!==pair)return;await refreshPair();if(result.status==='waiting')toast('Pedido enviado. A extensão depende do aceite da outra pessoa.');else toast('Mais cinco minutos para vocês!');return;}
 if(action==='chat-search'){if(state.pair?.status!=='connected')return;dialog('Pesquisar mensagens','<form id="cxChatSearch" data-pair="'+safe(state.pair.id)+'"><input name="query" minlength="2" maxlength="80" required placeholder="Buscar nesta conversa"><button type="submit" class="cx-next-btn">Pesquisar</button></form><div id="cxSearchResults" class="cx-next-comments"><p>Digite uma palavra para pesquisar o histórico disponível.</p></div>');return;}
 if(action==='ice'){const input=$('messageInput');if(input&&!input.value){input.value=questions[Math.floor(Math.random()*questions.length)];input.dispatchEvent(new Event('input',{bubbles:true}));input.focus({preventScroll:true});}else if(input)toast('Envie ou apague sua mensagem antes de escolher uma sugestão.');return;}
 if(action==='upload-toggle'){const d=$('cxMomentComposer');if(d){d.open=!d.open;if(d.open)d.scrollIntoView({block:'nearest'});}return;}
 if(action==='refresh'){await loadMoments();return;}
 if(action==='discover-refresh'){discoveryRotation=(discoveryRotation+1)%100000;await loadDiscover(false);return;}
 if(action==='close-dialog'){activeDialog?.close();return;}
 if(action==='remove-comment'){if(confirm('Excluir seu comentário?')){const d=activeDialog;await rpc('connect_moment_comment_remove',{_id:Number(b.dataset.id)});if(d?.isConnected)await refreshComments(b.dataset.moment,d,account);}return;}
 if(!m)return;
 if(action==='play'){await activate(card,true);return;}
 if(action==='sound'){muted=!muted;card.querySelector('video').muted=muted;b.textContent=muted?'Som':'Silenciar';return;}
 b.disabled=true;
 if(action==='like'){const value=await rpc('connect_moment_like',{_id:m.id,_liked:!m.liked});if(uid()===account&&card.isConnected){m.likes=Math.max(0,Number(m.likes)+(value?1:-1));m.liked=value;b.setAttribute('aria-pressed',String(value));b.innerHTML=(value?'♥':'♡')+' <span>'+m.likes+'</span>';}}
 if(action==='comments')await comments(m);
 if(action==='remove'&&confirm('Excluir este Moment?')){await rpc('connect_moment_remove',{_id:m.id});if(alive(account,'moments'))await loadMoments();}
 if(action==='report')dialog('Denunciar Moment','<form id="cxMomentReport" data-id="'+safe(m.id)+'"><label>Motivo<select name="reason">'+Object.entries(reasons).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+'</select></label><p>O vídeo será ocultado para você. A equipe poderá revisar a denúncia.</p><button type="submit" class="cx-next-btn">Enviar denúncia</button></form>');
 }catch(e){toast(e.message||'Não foi possível concluir.',true);}finally{if(b.isConnected)b.disabled=false;}
});
document.addEventListener('submit',async e=>{
 const form=e.target;if(!['cxMomentUpload','cxDiscoveryForm','cxMomentCommentForm','cxMomentReport','cxChatSearch'].includes(form.id))return;e.preventDefault();
 if(form.id==='cxMomentUpload'){await publish(form);return;}
 const b=form.querySelector('button[type=submit]');if(b.disabled)return;b.disabled=true;
 try{
 if(form.id==='cxChatSearch'){const d=activeDialog,account=uid(),pair=form.dataset.pair;const result=await rpc('connect_chat_search',{_pair:pair,_query:form.elements.query.value});if(uid()===account&&state.pair?.id===pair&&d?.isConnected){d.querySelector('#cxSearchResults').innerHTML=result.length?result.map(m=>'<article><strong>'+(m.sender_id===account?'Você':'Contato')+' · '+safe(new Date(m.created_at).toLocaleString('pt-BR'))+'</strong><p>'+safe(m.body)+'</p></article>').join(''):'<p>Nenhuma mensagem encontrada.</p>';}return;}
 if(form.id==='cxDiscoveryForm'){const selected=[...form.querySelectorAll('input[name=interest]:checked')].map(x=>x.value);if(selected.length>8)throw Error('Escolha até 8 interesses.');await rpc('connect_discovery_save',{_interests:selected,_goal:form.elements.goal.value,_visible:form.elements.visible.checked});toast('Preferências salvas.');if(state.view==='discover')await loadDiscover(false);}
 if(form.id==='cxMomentCommentForm'){const d=activeDialog;await rpc('connect_moment_comment',{_id:form.dataset.id,_body:form.elements.body.value});if(d?.isConnected){form.reset();await refreshComments(form.dataset.id,d,uid());}}
 if(form.id==='cxMomentReport'){await rpc('connect_moment_report',{_id:form.dataset.id,_reason:form.elements.reason.value});activeDialog?.close();toast('Denúncia enviada.');if(state.view==='moments')await loadMoments();}
 }catch(e){toast(e.message||'Não foi possível concluir.',true);}finally{if(b.isConnected)b.disabled=false;}
});
const appRoot=document.getElementById('app');if(appRoot)new MutationObserver(()=>{if(host&&!host.isConnected)dispose();if(activeDialog&&typeof state!=='undefined'&&(state.suspension||maintenanceIsActive()||!state.session)){activeDialog.close();activeDialog=null;}}).observe(appRoot,{childList:true,subtree:true});
function extensionMarkup(pair){if(pair.extended_at)return '<span class="cx-extension-note">+5 min</span>';const mine=pair.a===uid()?pair.extension_a:pair.extension_b,other=pair.a===uid()?pair.extension_b:pair.extension_a;return '<button type="button" class="cx-ice cx-extension" data-cx-next="extend" '+(mine?'disabled':'')+'>'+ (mine?'Aguardando +5 min':other?'Aceitar +5 min':'+5 min')+'</button>'}
window.connectNext={momentsView,discoverView,afterRender,extensionMarkup};
})();
