/* CONNECT posts, premium status and evidence-backed support. */
(function(){
'use strict';
const mod={};
const data={posts:[],postLoading:false,postBefore:null,postMore:false,premium:null,premiumIds:new Set(),support:[],supportBusy:false,checkoutBusy:false,premiumChecking:false,expandedPostComments:new Set(),webCheckoutOpen:false,webConfig:null,webPayment:null,webBusy:false,webStatusText:'',webError:'',webChecking:false,commentsPost:null,commentsRows:[],commentsHasMore:false,commentsBusy:false,commentsError:''};
const call=async(name,params)=>{const r=await db.rpc(name,params||{});if(r.error)throw r.error;return r.data;};
const premium=id=>Boolean(id&&(id===state.session?.user?.id?(data.premiumOwner===id&&data.premium?.active===true&&Date.parse(data.premium.paid_until)>Date.now()):data.premiumIds.has(id)));
const badge=p=>premium(p?.id)?'<span class="verified-mark" title="Assinante CONNECT Premium" aria-label="Perfil verificado Premium">'+ico('check',12)+'</span>':'';
let premiumRefreshSeq=0;
async function refreshPremium(){
 const uid=state.session?.user?.id;if(!uid){data.premium=null;data.premiumOwner=null;return;}
 const seq=++premiumRefreshSeq;
 if(data.premiumOwner!==uid){data.premium=null;data.premiumOwner=uid;data.premiumIds.clear();}
 try{
  const r=await call('entre_premium_overview');
  if(state.session?.user?.id!==uid||seq!==premiumRefreshSeq)return;
  data.premium=r||{active:false};data.premiumOwner=uid;
  if(premium(uid))data.premiumIds.add(uid);else data.premiumIds.delete(uid);
 }catch(e){if(state.session?.user?.id!==uid||seq!==premiumRefreshSeq)return;console.warn('Premium unavailable',e);data.premium={active:false,checkout_enabled:false};data.premiumIds.delete(uid);}
}
async function loadBadges(profiles){
 const ids=[...new Set((profiles||[]).map(p=>p?.id).filter(Boolean))].slice(0,120);
 const owner=state.session?.user?.id;if(!ids.length||!owner)return;
 try{const active=await call('entre_premium_badges',{_ids:ids});if(state.session?.user?.id!==owner)return;for(const id of ids)data.premiumIds.delete(id);for(const id of(Array.isArray(active)?active:[]))data.premiumIds.add(id);}
 catch(e){console.warn('Badge status',e);}
}
let feedLoadQueued=false,feedLoadSeq=0;
async function loadPosts(more=false){
 syncFeedOwner();const uid=state.session?.user?.id;if(!uid)return;if(data.postLoading){if(!more)feedLoadQueued=true;return;}const seq=++feedLoadSeq;data.postLoading=true;feedError='';
 try{
  const rows=await call('entre_posts_feed',{_before:more?data.postBefore:null});
  if(state.session?.user?.id!==uid)return;
  const arr=Array.isArray(rows)?rows:[];
  const next=more?Array.from(new Map(data.posts.concat(arr).map(p=>[String(p.id),p])).values()):arr;
  await Promise.allSettled(arr.filter(p=>p.author_avatar).map(p=>signAvatar({id:p.author_id,display_name:p.author_name,avatar_path:p.author_avatar,avatar_uploaded_at:p.author_avatar_uploaded_at})));
  if(state.session?.user?.id!==uid||seq!==feedLoadSeq)return;
  await window.entreMedia?.signPosts?.(arr);
  if(state.session?.user?.id!==uid||seq!==feedLoadSeq)return;
  data.posts=next.slice(-45);data.feedWindowShifted=more&&(data.feedWindowShifted||next.length>45);data.postMore=arr.length===15;data.postBefore=next.at(-1)?.id||null;
  for(const p of data.posts){if(p.premium)data.premiumIds.add(p.author_id);else data.premiumIds.delete(p.author_id);}
  feedLoaded=true;
 }catch(e){if(state.session?.user?.id===uid&&seq===feedLoadSeq){feedError=infoError(e);toast(feedError,true);}}finally{data.postLoading=false;if(state.session?.user?.id===uid&&state.view==='posts')renderView(true);if(feedLoadQueued){feedLoadQueued=false;if(state.session?.user?.id&&state.view==='posts')void loadPosts();}}
}

function commentCard(c){
 const own=c.author_id===state.session?.user?.id;
 return '<article class="full-comment" data-comment-id="'+Number(c.id)+'"><span class="comment-initial"'+profileTarget(c.author_id)+ '>'+esc(initials(c.name))+'</span>'+
 '<div class="full-comment-content"><div class="full-comment-top"><strong>'+profileName(c.author_id,c.name)+
 (c.premium?' <span class="verified-mark">'+ico('check',11)+'</span>':'')+
 '</strong><small>'+new Date(c.created_at).toLocaleDateString('pt-BR')+(c.edited_at?' · editado':'')+'</small></div>'+
 '<p>'+esc(c.body)+'</p><div class="full-comment-buttons">'+
 (own?'<button type="button" data-action="postCommentEdit" data-id="'+Number(c.id)+'">Editar</button>'+
 '<button type="button" data-action="postCommentDelete" data-id="'+Number(c.id)+'">Apagar</button>':
 '<button type="button" data-action="postCommentReport" data-id="'+Number(c.id)+'">Denunciar</button>')+'</div>'+
 (own?'<form class="post-comment-edit-form comment-inline-form" data-comment="'+Number(c.id)+'" hidden>'+
 '<input name="body" required minlength="2" maxlength="420" value="'+esc(c.body)+'"><button type="submit">Salvar edição</button>'+
 '<button type="button" data-action="postCommentCancel" data-id="'+Number(c.id)+'">Cancelar</button></form>':
 '<form class="post-comment-report-form comment-inline-form" data-comment="'+Number(c.id)+'" hidden>'+
 '<label>Motivo<select name="reason"><option value="abuse">Assédio</option><option value="spam">Spam</option><option value="hate">Discurso de ódio</option><option value="other">Outro</option></select></label>'+
 '<textarea name="details" maxlength="600" placeholder="Detalhes opcionais"></textarea><button type="submit">Enviar denúncia</button>'+
 '<button type="button" data-action="postCommentCancel" data-id="'+Number(c.id)+'">Cancelar</button></form>')+'</div></article>';
}
function commentsOverlay(){
 if(!data.commentsPost)return '';
 const p=data.posts.find(p=>Number(p.id)===Number(data.commentsPost));
 const title=p?.author_name?'Post de '+p.author_name:'Comentários do post';
 return '<div class="comments-overlay" id="commentsOverlay" role="dialog" aria-modal="true" aria-label="Comentários da publicação">'+
 '<div class="comments-dialog"><header class="comments-dialog-header">'+
 '<div><span>CONNECT · COMUNIDADE</span><h2>Comentários</h2><p>'+esc(title)+'</p></div>'+
 '<button class="comments-dialog-close" type="button" data-action="postCommentsClose" aria-label="Fechar comentários">'+ico('close',20)+'</button></header>'+
 '<div class="comments-dialog-list" id="commentsDialogList" tabindex="0">'+
 (data.commentsError?'<div class="comments-dialog-message" role="status">'+esc(data.commentsError)+'</div>':'')+
 (data.commentsRows.length?data.commentsRows.map(commentCard).join(''):
 '<div class="comments-dialog-empty">'+ico('chat',36)+'<strong>'+(data.commentsBusy?'Carregando comentários…':'Ninguém comentou ainda')+'</strong>'+
 '<p>Seja a primeira pessoa a participar da conversa.</p></div>')+
 (data.commentsWindowShifted?'<button type="button" class="comments-more" data-action="postCommentsRecent">Voltar aos comentários recentes</button>':'')+
 (data.commentsHasMore?'<button type="button" data-action="postCommentsMore" class="comments-more" '+(data.commentsBusy?'disabled':'')+'>Carregar mais comentários</button>':'')+
 '</div><footer class="comments-dialog-footer"><form class="post-comment-form" data-post="'+Number(data.commentsPost)+'">'+
 '<label class="sr-only" for="commentDialogInput">Escreva um comentário</label>'+
 '<input name="body" id="commentDialogInput" required minlength="2" maxlength="420" placeholder="Escreva um comentário…">'+
 '<button type="submit" aria-label="Publicar comentário">'+ico('send',19)+'</button></form><small>Respeite as outras pessoas. Moderação ativa.</small></footer></div></div>';
}
async function loadCommentPage(more=false){
 if(!data.commentsPost||data.commentsBusy)return;
 const post=data.commentsPost;
 data.commentsBusy=true;data.commentsError='';
 try{
  const before=more?data.commentsRows.at(-1)?.id||null:null;
  const response=await call('entre_post_comments_page',{_post:post,_before:before});
  if(post!==data.commentsPost)return;
  const next=Array.isArray(response?.items)?response.items:[];
  const merged=more?data.commentsRows.concat(next):next;data.commentsWindowShifted=more&&(data.commentsWindowShifted||merged.length>45);data.commentsRows=merged.slice(-45);
  data.commentsHasMore=response?.has_more===true;
 }catch(error){data.commentsError=infoError(error);}
 finally{data.commentsBusy=false;if(data.commentsPost===post)renderView(true);}
}

// Keep the composer draft across feed refreshes and media selection, scoped to the current account.
let feedDraft='',feedDraftOwner=null,feedLoaded=false,feedError='',feedOwner=null,feedPublishing=false;
function syncFeedOwner(){
 const uid=state.session?.user?.id||null;
 if(feedDraftOwner!==uid){feedDraftOwner=uid;feedDraft='';window.entreMedia?.clearMedia?.();}
 if(feedOwner!==uid){feedOwner=uid;feedLoaded=false;feedError='';data.posts=[];data.feedWindowShifted=false;data.commentsWindowShifted=false;data.postBefore=null;data.postMore=false;data.expandedPostComments.clear();data.commentsPost=null;data.commentsRows=[];}
}
document.addEventListener('input',e=>{if(e.target?.matches?.('#postCreateForm textarea[name="body"]')){syncFeedOwner();feedDraft=e.target.value;const count=document.getElementById('connectFeedCount');if(count)count.textContent=String(feedDraft.length)+'/900';}});
function feedTime(value){
 const at=Date.parse(value);if(!Number.isFinite(at))return '';
 const min=Math.max(0,Math.floor((Date.now()-at)/60000));
 return min<1?'Agora':min<60?min+' min':min<1440?Math.floor(min/60)+' h':min<10080?Math.floor(min/1440)+' d':new Date(at).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
}
function postsView(){
 syncFeedOwner();
 const rows=Array.isArray(data.posts)?data.posts:[],first=String(state.profile?.display_name||'').trim().split(/\s+/)[0];
 return '<section class="posts-shell connect-feed-v3" aria-label="Início da comunidade"><div class="posts-stream">'+
 '<header class="cf-welcome"><div class="cf-welcome-copy"><span class="cf-eyebrow"><i></i> SUA COMUNIDADE</span><h2>'+(first?'Olá, '+esc(first)+'.':'O que está acontecendo?')+'</h2><p>Compartilhe momentos. Conheça novas pessoas.</p></div><img src="./connect-glass.svg?v=showcase-v17" width="88" height="58" alt="" aria-hidden="true"></header>'+
 '<div class="cf-quick-links" aria-label="Atalhos"><button type="button" data-action="nav" data-view="connect"><span class="cf-quick-icon">'+ico('bolt',19)+'</span><span><strong>Ao vivo</strong><small>Uma nova conexão</small></span>'+ico('chevron',14)+'</button><button type="button" data-action="nav" data-view="online"><span class="cf-quick-icon">'+ico('users',19)+'</span><span><strong>Descobrir</strong><small>Pessoas online</small></span>'+ico('chevron',14)+'</button></div>'+
 '<section class="cn-feed-composer"><form id="postCreateForm" class="post-compose cn-inline-post"><div class="cf-compose-top">'+avatar(state.profile)+'<div class="cf-compose-field"><label class="sr-only" for="connectPostBody">Escreva uma publicação</label><textarea id="connectPostBody" name="body" minlength="3" maxlength="900" rows="2" placeholder="O que você quer compartilhar?">'+esc(feedDraft)+'</textarea></div></div>'+
 '<div class="cf-compose-media">'+(window.entreMedia?.composeMarkup?.()||'')+'</div><div class="post-compose-footer"><span id="connectFeedCount" class="cf-compose-count">'+feedDraft.length+'/900</span><button type="submit" class="ui-btn btn-dark btn-sm" '+(feedPublishing?'disabled':'')+'>'+ (feedPublishing?'Publicando…':'Publicar')+' '+ico('arrow',15)+'</button></div></form></section>'+
 '<div class="cf-feed-header"><div><small>FEED</small><h3>Publicações recentes</h3></div><button type="button" class="cf-refresh" data-action="postsRefresh" aria-label="Atualizar publicações" title="Atualizar" '+(data.postLoading?'disabled':'')+'>'+ico('refresh',18)+'</button></div>'+
 (rows.length?rows.map(p=>{
  const person={id:p.author_id,display_name:p.author_name,avatar_path:p.author_avatar,avatar_uploaded_at:p.author_avatar_uploaded_at};
  const own=p.author_id===state.session?.user?.id,liked=Boolean(p.liked),count=Math.max(0,Number(p.likes)||0);
  return '<article class="post-card cf-post '+(p.premium?'premium-surface':'')+'" data-feed-post="'+Number(p.id)+'"><div class="post-card-head">'+avatar(person)+
  '<div class="post-author"><strong>'+profileName(p.author_id,p.author_name)+badge(person)+'</strong><small title="'+esc(new Date(p.created_at).toLocaleString('pt-BR'))+'">'+esc(feedTime(p.created_at))+(p.edited_at?' · Editada':'')+'</small></div>'+
  (own?'<details class="cf-post-menu"><summary aria-label="Opções da publicação"><span aria-hidden="true">···</span></summary><div class="cf-post-menu-pop"><button type="button" data-action="postEdit" data-id="'+Number(p.id)+'">'+ico('edit',16)+' Editar</button><button type="button" data-action="postDelete" data-id="'+Number(p.id)+'">'+ico('trash',16)+' Excluir</button></div></details>':'')+'</div>'+
  (p.body?'<p class="post-body">'+esc(p.body)+'</p>':'')+(window.entreMedia?.postMarkup?.(p)||'')+
  '<div class="post-interactions cf-post-actions"><button type="button" class="'+(liked?'liked':'')+'" aria-pressed="'+liked+'" aria-label="'+(liked?'Remover curtida':'Curtir publicação')+'" data-action="postLike" data-id="'+Number(p.id)+'">'+ico('heart',20)+' <span>'+count+' '+(count===1?'curtida':'curtidas')+'</span></button><button type="button" class="post-comments-launch" data-action="postCommentsOpen" data-id="'+Number(p.id)+'">'+ico('chat',20)+' <span>Comentar</span></button></div></article>';
 }).join(''):(data.postLoading||!feedLoaded&&!feedError?'<div class="cf-feed-empty" role="status"><span class="cf-empty-icon">'+ico('refresh',25)+'</span><h3>Carregando publicações…</h3><p>Preparando seu feed.</p></div>':feedError?'<div class="cf-feed-empty" role="status"><span class="cf-empty-icon">'+ico('refresh',25)+'</span><h3>Não foi possível atualizar</h3><p>Tente novamente.</p><button type="button" data-action="postsRefresh">Atualizar feed</button></div>':'<div class="cf-feed-empty"><span class="cf-empty-icon">'+ico('chat',28)+'</span><h3>Toda conversa começa com um oi.</h3><p>Seja a primeira pessoa a compartilhar um momento com a comunidade.</p><button type="button" data-action="feedComposeFocus">Criar publicação '+ico('arrow',15)+'</button></div>'))+
 (data.feedWindowShifted?'<button type="button" class="cf-load-more" data-action="postsRefresh">Voltar às publicações recentes</button>':'')+
 (data.postMore?'<button type="button" class="cf-load-more" data-action="postsMore">Ver mais publicações '+ico('chevron',16)+'</button>':'')+'</div></section>'+commentsOverlay();
}
async function postAction(a,btn){
 const id=Number(btn.dataset.id);
 if(a==='postsRefresh'){await loadPosts();return true;}
 if(a==='feedComposeFocus'){document.getElementById('connectPostBody')?.focus();return true;}
 if(a==='postCommentsOpen'){
  data.commentsPost=id;data.commentsRows=[];data.commentsWindowShifted=false;data.commentsError='';data.commentsHasMore=false;
  renderView();await loadCommentPage();document.getElementById('commentDialogInput')?.focus();return true;
 }
 if(a==='postCommentsClose'){data.commentsPost=null;data.commentsRows=[];data.commentsError='';renderView();return true;}
 if(a==='postCommentsRecent'){await loadCommentPage();return true;}
 if(a==='postCommentsMore'){await loadCommentPage(true);return true;}
 if(a==='postsMore'){await loadPosts(true);return true;}
 if(a==='postEdit'){
  const p=data.posts.find(x=>Number(x.id)===id);if(!p||p.author_id!==state.session?.user?.id)return true;
  const user=state.session.user.id,d=document.createElement('dialog');d.className='cp-msg-dialog';d.setAttribute('aria-label','Editar publicação');
  d.innerHTML='<header><strong>Editar publicação</strong><button type="button" aria-label="Fechar" data-post-edit-close>×</button></header><form><textarea maxlength="900" rows="5" aria-label="Texto da publicação">'+esc(p.body||'')+'</textarea><button type="submit">Salvar alteração</button></form>';
  d.addEventListener('click',e=>{if(e.target===d||e.target.closest('[data-post-edit-close]'))d.close()});d.addEventListener('close',()=>d.remove());
  d.addEventListener('submit',async e=>{e.preventDefault();e.stopPropagation();const button=d.querySelector('[type=submit]'),body=d.querySelector('textarea').value.trim();if(button.disabled)return;if(state.session?.user?.id!==user){d.close();return}if(body.length<3&&!(p.media_path&&!body)){toast('Use de 3 a 900 caracteres.',true);return}button.disabled=true;try{await call('connect_post_edit',{_post:id,_body:body});d.close();await loadPosts();toast('Publicação atualizada.');}catch(error){toast(infoError(error),true);button.disabled=false;}});
  document.body.append(d);d.showModal();return true;
 }
 if(a==='postDelete'){
  if(!confirm('Apagar esta publicação e seus comentários?'))return true;
  const oldPost=data.posts.find(p=>Number(p.id)===id);
  const removed=await call('entre_post_delete',{_post:id});if(removed!==true)throw Error('Publicação indisponível.');await window.entreMedia?.removePostMedia?.(oldPost);await loadPosts();toast('Post apagado.',false,'delete');return true;
 }
 if(a==='postCommentEdit'||a==='postCommentReport'||a==='postCommentCancel'){
  const card=btn.closest('[data-comment-id]');if(!card)return true;
  const edit=card.querySelector('.post-comment-edit-form'),report=card.querySelector('.post-comment-report-form');
  if(edit)edit.hidden=a!=='postCommentEdit';
  if(report)report.hidden=a!=='postCommentReport';
  const text=card.querySelector('.full-comment-content>p, .post-comment-content>p');
  if(text)text.hidden=a==='postCommentEdit';
  btn.closest('.comment-actions')?.removeAttribute('open');
  if(a==='postCommentEdit')edit?.querySelector('input')?.focus();
  return true;
 }
 if(a==='postCommentDelete'){
  if(!confirm('Apagar este comentário definitivamente?'))return true;
  await call('entre_post_comment_delete',{_comment:id});await loadCommentPage();await loadPosts();toast('Comentário apagado.',false,'delete');return true;
 }
 if(a==='postLike'){if(btn.disabled)return true;btn.disabled=true;try{await call('entre_post_like',{_post:id});window.connectSound?.play?.('like');await loadPosts();}finally{if(btn.isConnected)btn.disabled=false;}return true;}
 return false;
}
async function postForm(form){
 const body=form.elements.body?.value?.trim();
 if(form.id==='postCreateForm'){
  if(feedPublishing)return true;const uid=state.session?.user?.id;feedPublishing=true;const button=form.querySelector('[type=submit]');if(button)button.disabled=true;
  try{
   if(window.entreMedia?.pending?.())await window.entreMedia.publish(body||'');
   else{if(!body||body.length<3||body.length>900)throw Error('Post precisa ter de 3 a 900 caracteres.');await call('entre_post_create',{_body:body});toast('Seu post foi publicado.',false,'publish');}
   if(state.session?.user?.id===uid){if(feedDraft.trim()===(body||'')){feedDraft='';const field=document.getElementById('connectPostBody');if(field)field.value='';}await loadPosts();}return true;
  }finally{feedPublishing=false;if(state.session?.user?.id===uid&&state.view==='posts')renderView();else if(button?.isConnected)button.disabled=false;}
 }
 if(form.classList.contains('post-comment-edit-form')){
  if(!body||body.length<2||body.length>420)throw Error('Comentário precisa ter de 2 a 420 caracteres.');
  await call('entre_post_comment_edit',{_comment:Number(form.dataset.comment),_body:body});
  await loadCommentPage();await loadPosts();toast('Comentário atualizado.',false,'success');return true;
 }
 if(form.classList.contains('post-comment-report-form')){
  await call('entre_post_comment_report',{_comment:Number(form.dataset.comment),_reason:form.elements.reason.value,_details:form.elements.details.value.trim()});
  await loadCommentPage();toast('Denúncia enviada para moderação.');return true;
 }
 if(form.classList.contains('post-comment-form')){
  if(!body||body.length<2||body.length>420)throw Error('Comentário precisa ter de 2 a 420 caracteres.');
  await call('entre_post_comment',{_post:Number(form.dataset.post),_body:body});
  await loadCommentPage();await loadPosts();toast('Comentário publicado.',false,'send');document.getElementById('commentDialogInput')?.focus();return true;
 }
 return false;
}
document.addEventListener('toggle',event=>{
 const sheet=event.target;
 if(!(sheet instanceof HTMLDetailsElement)||!sheet.matches('[data-post-comment-sheet]'))return;
 const id=Number(sheet.dataset.postCommentSheet);
 if(sheet.open)data.expandedPostComments.add(id);else data.expandedPostComments.delete(id);
},true);
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&data.commentsPost){data.commentsPost=null;data.commentsRows=[];renderView();}
});
const price=()=>Number.isInteger(data.premium?.price_cents)&&data.premium.price_cents>0
 ?(data.premium.price_cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):null;
const purchaseWhatsapp=()=> 'https://wa.me/5518988234267?text='+encodeURIComponent('Olá! Quero contratar o CONNECT Premium. Vou informar o e-mail cadastrado para a liberação.');
function premiumView(onboarding=false){
 const active=premium(state.session?.user?.id), cost=price()||'Valor a consultar';
 const rows=items=>'<ul class="cp-plan-list">'+items.map(v=>'<li>'+ico('check',17)+'<span>'+v+'</span></li>').join('')+'</ul>';
 if(onboarding)return '<section class="cx-plan-offer"><div class="cx-plan-intro"><span>ÚLTIMA ETAPA</span><h1>Mais possibilidades.</h1><p>Comece grátis ou aproveite todos os benefícios do Premium.</p></div><article class="cx-premium-offer"><header class="cx-offer-head"><div><span class="cx-offer-label">'+ico('crown',16)+' CONNECT PREMIUM</span><div class="cx-offer-price">'+esc(cost)+'<small> / mês</small></div><p>Mais liberdade para conhecer pessoas.</p></div><div class="cx-offer-emblem" aria-hidden="true">'+ico('crown',36)+'</div></header><div class="cx-offer-benefits">'+[['bolt','Encontros ilimitados','Texto e vídeo'],['users','Filtro de gênero','Escolha quem conhecer'],['crown','Selo Premium','Destaque no perfil'],['image','Banner animado','Personalize com GIF']].map(([icon,title,desc])=>'<div class="cx-offer-benefit"><span>'+ico(icon,19)+'</span><div><strong>'+title+'</strong><small>'+desc+'</small></div></div>').join('')+'</div>'+(active?'<div class="cx-offer-active">'+ico('check',17)+' Seu Premium está ativo.</div>':'')+'<div class="cx-offer-purchase"><p>'+ico('chat',17)+' <span>Contratação pelo WhatsApp. A equipe libera o acesso após confirmar o pagamento.</span></p><a class="ui-btn btn-dark" href="'+esc(purchaseWhatsapp())+'" target="_blank" rel="noopener noreferrer">'+ico('chat',18)+' '+(active?'Renovar pelo WhatsApp':'Comprar no WhatsApp')+'</a><button type="button" class="ui-btn btn-outline" data-action="premiumVerify">Já paguei · Atualizar acesso</button><small>Renovação manual, sem cobrança automática.</small></div></article><button type="button" class="ui-btn btn-outline cx-continue-free" data-action="onboardingFree">'+(active?'Continuar com Premium':'Continuar grátis')+' '+ico('arrow',18)+'</button><div class="cx-free-summary">'+ico('shield',18)+'<span>O gratuito inclui 50 encontros por dia, conversas, posts e salas. Você pode ativar o Premium depois.</span></div></section>';
 const normal=onboarding?['50 encontros por dia','Conversas, posts e salas','Banner com foto','Temas claro e escuro']:['50 encontros encontrados por dia em texto e vídeo','Conversas, posts e salas','Banner de perfil com foto','Temas claro e escuro'];
 const premiumItems=onboarding?['Encontros ilimitados','Banner animado GIF','Filtro de gênero','Selo Premium']:['Encontros ilimitados por texto e vídeo','Banner animado em GIF','Filtro de gênero no Ao vivo','Selo de destaque no perfil'];
 return '<section class="cp-plan-page'+(onboarding?' cp-plan-onboarding':'')+'"><div class="cp-plan-heading"><h2>Escolha seu plano</h2><p>'+(onboarding?'Escolha como começar no CONNECT.':'Dois planos. A mesma comunidade.')+'</p></div><div class="cp-plan-grid">'+
 '<article class="cp-plan"><span class="cp-plan-eyebrow">NORMAL</span><h3>Gratuito</h3><div class="cp-plan-price">R$ 0</div><p>Conheça pessoas e participe da comunidade.</p>'+rows(normal)+(onboarding?'<button type="button" class="ui-btn btn-outline onboarding-plan-cta" data-action="onboardingFree">Continuar grátis '+ico('arrow',17)+'</button>':'<div class="cp-plan-state">'+(active?'Incluído no Premium':ico('check',17)+' Seu plano atual')+'</div>')+'</article>'+
 '<article class="cp-plan cp-plan-paid"><span class="cp-plan-eyebrow">'+ico('crown',18)+' PREMIUM</span><h3>'+(onboarding?'Premium':'Mais possibilidades')+'</h3><div class="cp-plan-price">'+esc(cost)+'<small> / mês</small></div><p>Todos os recursos do Normal, mais:</p>'+rows(premiumItems)+
 (active?'<div class="cp-plan-state">'+ico('check',17)+' Premium ativo'+(data.premium.paid_until?' · até '+new Date(data.premium.paid_until).toLocaleDateString('pt-BR'):'')+'</div>':'')+
 '<div class="cp-plan-purchase"><strong>'+(active?'Renovar acesso':'Contratar Premium')+'</strong><p>Compra pelo WhatsApp. Informe seu e-mail cadastrado. A equipe libera o acesso após confirmar o pagamento.</p><a class="ui-btn btn-dark onboarding-plan-cta" href="'+esc(purchaseWhatsapp())+'" target="_blank" rel="noopener noreferrer">'+ico('chat',16)+' '+(active?'Renovar pelo WhatsApp':'Comprar no WhatsApp')+'</a><button type="button" class="ui-btn btn-outline onboarding-plan-cta cp-plan-refresh" data-action="premiumVerify">Atualizar acesso</button></div>'+
 '<small class="cp-plan-footnote">Renovação manual. Sem cobrança automática no aplicativo.</small></article></div></section>';
}
function checkoutView(){return premiumView(false);}
async function openPremiumWhatsapp(){window.open(purchaseWhatsapp(),'_blank','noopener,noreferrer');}
async function unmountPaymentBrick(){}
async function leavePremium(){data.webCheckoutOpen=false;data.webError='';}
async function checkout(){await openPremiumWhatsapp();}
async function verifyPremium(){
 if(data.premiumChecking||!state.session?.user)return;
 data.premiumChecking=true;const uid=state.session.user.id;
 try{await refreshPremium();if(state.session?.user?.id!==uid)return;
 if(data.premium?.active&&typeof onboardingPlanPending==='function'&&onboardingPlanPending()){await finishOnboarding(null);return;}
 if(typeof onboardingPlanPending==='function'&&onboardingPlanPending()&&typeof render==='function')render();else if(typeof renderView==='function')renderView();if(typeof toast==='function')toast(data.premium?.active?'Seu Premium está ativo.':'O Premium ainda não foi liberado.');
 }finally{data.premiumChecking=false;}
}
async function copyPix(){return;}
const supportCategories={bug:'Erro no aplicativo',account:'Conta e acesso',payment:'Pagamento ou assinatura',security:'Segurança e privacidade',other:'Outro assunto'};
function whatsappLink(base,message){
 if(typeof base!=='string'||!/^https:\/\/wa\.me\/[0-9]{10,15}(?:\?|$)/.test(base))throw Error('WhatsApp de suporte indisponível.');
 return base.split('?')[0]+'?text='+encodeURIComponent(message.body);
}
function supportView(){
 return '<section class="csup-page"><header class="csup-intro"><h2>Como podemos ajudar?</h2><p>Envie seu relato diretamente à equipe CONNECT. Acompanhe as respostas pelo protocolo.</p></header>'+'<form id="supportTicketForm" class="csup-form"><div class="csup-fields"><h3>Novo chamado</h3><div class="field"><label for="supportCategory">Categoria</label><select name="category" id="supportCategory">'+Object.entries(supportCategories).map(([v,label])=>'<option value="'+v+'">'+label+'</option>').join('')+'</select></div><div class="field"><label for="supportSubject">Assunto</label><input name="subject" id="supportSubject" minlength="5" maxlength="120" required placeholder="Resuma o problema"></div><div class="field"><label for="supportDescription">Descrição</label><textarea name="description" id="supportDescription" minlength="20" maxlength="3000" required rows="5" placeholder="Como podemos ajudar?"></textarea></div><div class="field"><label for="supportProof">Provas (opcionais)</label><input name="proof" id="supportProof" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" multiple><small>Até 3 arquivos de 5 MB. Enviados ao painel em armazenamento privado.</small></div><p class="csup-privacy">'+ico('lock',15)+' Não inclua senhas ou dados bancários.</p><button class="ui-btn btn-dark csup-submit" type="submit" '+(data.supportBusy?'disabled':'')+'>Enviar chamado '+ico('arrow',18)+'</button></div></form><button type="button" class="ui-btn btn-outline" data-action="nav" data-view="protocols">Meus protocolos '+ico('arrow',16)+'</button></section>';
}

let protocolQuery='';
function protocolsView(){if(supportOwner!==state.session?.user?.id){data.support=[];protocolQuery='';}return '<section class="csup-page csup-protocols"><header class="csup-intro"><h2>Meus protocolos</h2><p>Seus chamados são excluídos automaticamente 10 dias após a criação, incluindo as respostas e anexos.</p></header><div class="csup-toolbar"><button type="button" class="ui-btn btn-dark" data-action="nav" data-view="support">Novo chamado '+ico('plus',16)+'</button><label class="csup-search">'+ico('search',18)+'<input type="search" inputmode="numeric" data-protocol-search maxlength="20" placeholder="Digite o número do protocolo" value="'+esc(protocolQuery)+'" aria-label="Buscar protocolo pelo número"></label></div><section class="csup-history"><div id="cpSupportHistory">'+supportHistory()+'</div></section></section>';}
function supportHistory(){const labels={submitted:'Aguardando resposta',reviewing:'Em atendimento',resolved:'Resolvido',cancelled:'Cancelado'};const rows=data.support.filter(t=>!protocolQuery||String(t.id)===protocolQuery);return rows.length?rows.map(t=>'<article class="csup-ticket"><div class="csup-ticket-top"><small>PROTOCOLO #'+esc(String(t.id))+'</small><small class="csup-ticket-status" data-status="'+esc(t.status)+'">'+esc(labels[t.status]||t.status)+'</small></div><strong>'+esc(t.subject)+'</strong><small>Expira em '+new Date(new Date(t.created_at).getTime()+864000000).toLocaleDateString('pt-BR')+'</small><div class="csup-ticket-actions"><button class="ui-btn btn-outline" type="button" data-support-thread="'+esc(String(t.id))+'">'+ico('chat',16)+' Abrir</button>'+(['submitted','reviewing'].includes(t.status)?'<button class="ui-btn btn-outline" type="button" data-support-cancel="'+esc(String(t.id))+'">Cancelar</button>':'')+'<button class="ui-btn btn-quiet csup-delete" type="button" data-support-delete="'+esc(String(t.id))+'" aria-label="Apagar protocolo">'+ico('trash',16)+' Apagar</button></div></article>').join(''):'<p class="csup-note">'+(protocolQuery?'Nenhum protocolo seu com esse número.':'Nenhum protocolo ainda.')+'</p>';}
document.addEventListener('input',e=>{if(!e.target.matches?.('[data-protocol-search]'))return;protocolQuery=e.target.value.replace(/\\D/g,'');const root=document.getElementById('cpSupportHistory');if(root)root.innerHTML=supportHistory();});
document.addEventListener('click',async e=>{const b=e.target.closest?.('[data-support-delete]');if(!b||b.disabled||!confirm('Apagar este protocolo definitivamente? O chamado e suas respostas não poderão ser recuperados.'))return;b.disabled=true;try{await call('connect_support_delete',{_ticket:b.dataset.supportDelete});await loadSupport();toast('Protocolo apagado.');}catch(error){toast(infoError(error),true);}finally{b.disabled=false;}});
let supportOwner=null,supportSeq=0;
async function loadSupport(){const uid=state.session?.user?.id;if(!uid)return;if(supportOwner!==uid){data.support=[];supportOwner=uid;}const seq=++supportSeq;try{const rows=await call('entre_my_support_tickets');if(state.session?.user?.id!==uid||seq!==supportSeq)return;data.support=Array.isArray(rows)?rows:[];const root=document.getElementById('cpSupportHistory');if(root&&root.innerHTML!==supportHistory())root.innerHTML=supportHistory();}catch(e){console.warn('Support unavailable');}}
document.addEventListener('click',async e=>{const b=e.target.closest?.('[data-support-cancel]');if(!b||b.disabled||!confirm('Cancelar este protocolo? O histórico será mantido, mas o atendimento será encerrado.'))return;b.disabled=true;try{await call('connect_support_cancel',{_ticket:Number(b.dataset.supportCancel)});await loadSupport();toast('Protocolo cancelado.');}catch(error){toast(infoError(error),true);}finally{b.disabled=false;}});
async function submitSupport(form){
 if(data.supportBusy)return;const uid=state.session?.user?.id;if(!uid)throw Error('Entre na sua conta.');
 const category=form.elements.category.value,subject=form.elements.subject.value.trim(),description=form.elements.description.value.trim(),files=[...(form.elements.proof?.files||[])];
 if(!Object.hasOwn(supportCategories,category)||subject.length<5||subject.length>120||description.length<20||description.length>3000)throw Error('Confira o assunto e a descrição.');
 if(files.length>3||files.some(f=>f.size>5242880||!['image/png','image/jpeg','image/webp','application/pdf'].includes(f.type)))throw Error('Até 3 imagens ou PDFs de 5 MB.');
 data.supportBusy=true;const button=form.querySelector('[type=submit]');if(button)button.disabled=true;const paths=[];let submitted=false;
 try{const id=await call('entre_support_create',{_category:category==='payment'?'other':category,_subject:subject,_description:description});
 for(const file of files){if(state.session?.user?.id!==uid)throw Error('Sessão alterada.');const ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','application/pdf':'pdf'}[file.type];const path=uid+'/'+id+'/'+crypto.randomUUID()+'.'+ext;const r=await db.storage.from('entre-support-evidence').upload(path,file,{contentType:file.type,upsert:false});if(r.error)throw r.error;paths.push(path);}
 await call('entre_support_submit',{_ticket:Number(id),_paths:paths});submitted=true;
 if(state.session?.user?.id===uid){form.reset();protocolQuery='';nav('protocols');toast('Protocolo #'+id+' enviado à equipe.');}
 }catch(e){if(!submitted&&paths.length&&state.session?.user?.id===uid)await db.storage.from('entre-support-evidence').remove(paths).catch(()=>{});throw e;}finally{data.supportBusy=false;if(button?.isConnected)button.disabled=false;}
}
async function enter(view){
 if(view==='posts')await loadPosts();
 if(view==='premium'){await refreshPremium();if(state.view==='premium'&&!data.webCheckoutOpen)renderView(true);}
 if(view==='checkout'){await refreshPremium();if(state.view==='checkout')renderView(true);}
 if(view==='support'){await refreshPremium();if(state.view==='support')renderView(true);}
 if(view==='protocols'){protocolQuery='';data.support=[];await loadSupport();}
}
function resetAccount(){syncFeedOwner();data.premium=null;data.premiumOwner=null;data.premiumIds.clear();data.support=[];protocolQuery='';supportOwner=null;supportSeq++;premiumRefreshSeq++;}
Object.assign(mod,{data,resetAccount,isPremium:premium,badge,loadBadges,refreshPremium,loadPosts,postsView,postAction,postForm,premiumView,checkoutView,checkout,verifyPremium,copyPix,unmountPaymentBrick,leavePremium,openPremiumWhatsapp,supportView,protocolsView,submitSupport,loadSupport,enter});
window.entreExtras=mod;
})();
