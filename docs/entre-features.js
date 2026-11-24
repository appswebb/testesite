/* CONNECT posts, premium status and evidence-backed support. */
(function(){
'use strict';
const mod={};
const data={posts:[],postLoading:false,postBefore:null,postMore:false,premium:null,premiumIds:new Set(),support:[],supportBusy:false,checkoutBusy:false,premiumChecking:false,expandedPostComments:new Set(),webCheckoutOpen:false,webConfig:null,webPayment:null,webBusy:false,webStatusText:'',webError:'',webChecking:false,commentsPost:null,commentsRows:[],commentsHasMore:false,commentsBusy:false,commentsError:''};
const call=async(name,params)=>{const r=await db.rpc(name,params||{});if(r.error)throw r.error;return r.data;};
const premium=id=>Boolean(id&&(data.premiumIds.has(id)||(id===state.session?.user?.id&&data.premium?.active===true)));
const badge=p=>premium(p?.id)?'<span class="verified-mark" title="Assinante CONNECT Premium" aria-label="Perfil verificado Premium">'+ico('check',12)+'</span>':'';
async function refreshPremium(){
 if(!state.session?.user)return;
 try{
  const uid=state.session.user.id;const r=await call('entre_premium_overview');
  if(state.session?.user?.id!==uid)return;
  data.premium=r||{active:false};
  const recur=await db.rpc('connect_asaas_recurring_overview');if(state.session?.user?.id!==uid)return;data.premium.recurring=recur.error?{}:(recur.data||{});
  if(data.premium.active)data.premiumIds.add(state.session.user.id);
  else data.premiumIds.delete(state.session.user.id);
 }catch(e){console.warn('Premium unavailable',e);data.premium={active:false,checkout_enabled:false};}
}
async function loadBadges(profiles){
 const ids=[...new Set((profiles||[]).map(p=>p?.id).filter(Boolean))].slice(0,120);
 if(!ids.length)return;
 try{const active=await call('entre_premium_badges',{_ids:ids});for(const id of ids)data.premiumIds.delete(id);for(const id of(Array.isArray(active)?active:[]))data.premiumIds.add(id);}
 catch(e){console.warn('Badge status',e);}
}
async function loadPosts(more=false){
 if(data.postLoading)return;syncFeedOwner();const uid=state.session?.user?.id;data.postLoading=true;feedError='';
 try{
  const rows=await call('entre_posts_feed',{_before:more?data.postBefore:null});
  if(state.session?.user?.id!==uid)return;
  const arr=Array.isArray(rows)?rows:[];
  data.posts=more?data.posts.concat(arr):arr;
  data.postMore=arr.length===15;
  data.postBefore=data.posts[data.posts.length-1]?.id||null;
  await Promise.allSettled(data.posts.filter(p=>p.author_avatar).map(p=>signAvatar({id:p.author_id,display_name:p.author_name,avatar_path:p.author_avatar,avatar_uploaded_at:p.author_avatar_uploaded_at})));
  await window.entreMedia?.signPosts?.(data.posts);
  const ids=data.posts.filter(p=>p.premium).map(p=>p.author_id);
  for(const id of ids)data.premiumIds.add(id);
  feedLoaded=true;
 }catch(e){feedError=infoError(e);toast(feedError,true);}finally{data.postLoading=false;if(state.session?.user?.id===uid&&state.view==='posts')renderView();}
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
  data.commentsRows=more?data.commentsRows.concat(next):next;
  data.commentsHasMore=response?.has_more===true;
 }catch(error){data.commentsError=infoError(error);}
 finally{data.commentsBusy=false;if(data.commentsPost===post)renderView();}
}

// Keep the composer draft across feed refreshes and media selection, scoped to the current account.
let feedDraft='',feedDraftOwner=null,feedLoaded=false,feedError='',feedOwner=null,feedPublishing=false;
function syncFeedOwner(){
 const uid=state.session?.user?.id||null;
 if(feedDraftOwner!==uid){feedDraftOwner=uid;feedDraft='';window.entreMedia?.clearMedia?.();}
 if(feedOwner!==uid){feedOwner=uid;feedLoaded=false;feedError='';}
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
 (data.postMore?'<button type="button" class="cf-load-more" data-action="postsMore">Ver mais publicações '+ico('chevron',16)+'</button>':'')+'</div></section>'+commentsOverlay();
}
async function postAction(a,btn){
 const id=Number(btn.dataset.id);
 if(a==='postsRefresh'){await loadPosts();return true;}
 if(a==='feedComposeFocus'){document.getElementById('connectPostBody')?.focus();return true;}
 if(a==='postCommentsOpen'){
  data.commentsPost=id;data.commentsRows=[];data.commentsError='';data.commentsHasMore=false;
  renderView();await loadCommentPage();document.getElementById('commentDialogInput')?.focus();return true;
 }
 if(a==='postCommentsClose'){data.commentsPost=null;data.commentsRows=[];data.commentsError='';renderView();return true;}
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
   if(state.session?.user?.id===uid){feedDraft='';const field=document.getElementById('connectPostBody');if(field)field.value='';await loadPosts();}return true;
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
const terminalPayment=['CONFIRMED','RECEIVED','REFUNDED','REFUND_REQUESTED','REFUND_IN_PROGRESS','PARTIALLY_REFUNDED','CHARGEBACK_REQUESTED','CHARGEBACK_DISPUTE','AWAITING_CHARGEBACK_REVERSAL','DELETED','EXPIRED','ERROR','RECEIVED_IN_CASH','none'];
const paymentPending=status=>Boolean(status&&!terminalPayment.includes(status));
function invoiceLink(value){try{const u=new URL(value);if(u.protocol==='https:'&&['asaas.com','www.asaas.com'].includes(u.hostname)&&!u.username&&!u.password)return '<a class="cc-pay-button" target="_blank" rel="noopener noreferrer" href="'+esc(u.href)+'">Pagar cartão no Asaas '+ico('arrow',18)+'</a>';}catch(_){}return '';}
function paymentSeconds(p=data.webPayment){const end=Date.parse(p?.expires_at||'');return Number.isFinite(end)?Math.max(0,Math.ceil((end-Date.now())/1000)):null;}
function paymentClock(seconds){return seconds===null?'30 minutos':Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');}
function webPaymentStatusMarkup(){
 const p=data.webPayment||{},status=p.status||'';
 const error=data.webError?'<p role="alert" class="web-pay-error">'+esc(data.webError)+'</p>':'';
 if(['CONFIRMED','RECEIVED'].includes(status))return error+'<div class="web-pay-success">'+ico('check',20)+' Pagamento confirmado pelo Asaas. Consulte seu Premium.</div>';
 if(status==='EXPIRED'||status==='DELETED')return error+'<div class="web-pay-expired"><strong>'+ico('clock',18)+' Tentativa expirada</strong><p>Escolha Pix ou cartão para iniciar uma nova compra.</p></div>';
 const remaining=paymentSeconds(p);
 if(paymentPending(status)&&remaining===0)return error+'<div class="web-pay-pending"><strong>'+ico('clock',18)+' Prazo encerrado</strong><p>Verificando o encerramento da cobrança no Asaas. Aguarde a confirmação para evitar pagamento duplicado.</p><button type="button" class="ui-btn btn-outline" data-action="premiumVerify">Verificar agora</button></div>';
 if(paymentPending(status))return error+'<div class="web-pay-pending"><strong>'+ico('clock',18)+' '+(status==='OVERDUE'?'Cobrança vencida':'Aguardando confirmação')+'</strong><p>Esta tentativa fica disponível por até 30 minutos desde a criação, mesmo se você sair. Depois, poderá escolher outra forma de pagamento.</p><p class="web-pay-countdown">Tempo restante: <strong id="connectPaymentClock">'+esc(paymentClock(remaining))+'</strong></p>'+ (p.pix_qr_base64&&/^[a-zA-Z0-9+/=]+$/.test(p.pix_qr_base64)?'<img class="web-pix-qr" alt="QR Code Pix" src="data:image/png;base64,'+esc(p.pix_qr_base64)+'">':'')+(p.pix_code?'<label for="webPixCode">Pix Copia e Cola</label><textarea id="webPixCode" readonly>'+esc(p.pix_code)+'</textarea><button type="button" class="ui-btn btn-outline" data-action="premiumCopyPix">Copiar código Pix</button>':'')+invoiceLink(p.invoice_url)+(p.qr_unavailable?'<p>QR Code ainda indisponível. Verifique novamente.</p>':'')+'<button type="button" class="ui-btn btn-outline" data-action="premiumVerify">'+ico('refresh',17)+' Verificar pagamento</button></div>';
 if(status&&status!=='none')return error+'<p class="web-pay-error">Última cobrança: '+esc(status)+'. Nenhum novo acesso foi liberado.</p>';
 return error+(data.webStatusText?'<p>'+esc(data.webStatusText)+'</p>':'');
}
function premiumView(onboarding=false){
 const active=data.premium?.active,enabled=data.premium?.checkout_enabled&&price()&&!data.checkoutBusy;
 const rows=items=>'<ul class="cp-plan-list">'+items.map(v=>'<li>'+ico('check',17)+'<span>'+v+'</span></li>').join('')+'</ul>';
 return '<section class="cp-plan-page"><div class="cp-plan-heading"><h2>Escolha seu plano</h2><p>'+(onboarding?'Seu perfil está pronto. Escolha como começar no CONNECT.':'Dois planos. A mesma comunidade.')+'</p></div><div class="cp-plan-grid">'+
 '<article class="cp-plan"><span class="cp-plan-eyebrow">NORMAL</span><h3>Gratuito</h3><div class="cp-plan-price">R$ 0</div><p>Conheça pessoas e participe da comunidade.</p>'+rows(['50 encontros encontrados por dia em texto e vídeo','Conversas, posts e salas','Banner de perfil com foto','Temas claro, escuro e cor personalizada'])+
 (onboarding?'<button type="button" class="ui-btn btn-outline onboarding-plan-cta" data-action="onboardingFree">'+(active?'Continuar para o CONNECT':'Continuar no plano gratuito')+' '+ico('arrow',17)+'</button>':'<div class="cp-plan-state">'+(active?'Incluído no Premium':ico('check',17)+' Seu plano atual')+'</div>')+'</article>'+
 '<article class="cp-plan cp-plan-paid"><span class="cp-plan-eyebrow">'+ico('crown',18)+' PREMIUM</span><h3>Mais possibilidades</h3><div class="cp-plan-price">'+(price()||'Valor a definir')+'<small> / mês</small></div><p>Todos os recursos do Normal, mais:</p>'+rows(['Encontros ilimitados por texto e vídeo','Banner animado em GIF','Filtro de gênero no Ao vivo','Selo de destaque no perfil','Atendimento prioritário pelo WhatsApp'])+
 (active?'<div class="cp-plan-state">'+ico('check',17)+' Premium ativo'+(data.premium.paid_until?' · até '+new Date(data.premium.paid_until).toLocaleDateString('pt-BR'):'')+'</div><button type="button" class="ui-btn btn-outline" data-action="premiumWhatsapp">'+ico('chat',17)+' WhatsApp prioritário</button>':'')+
 (!active?'<div class="cp-plan-purchase"><strong>Assinatura mensal</strong><p>Renovação automática no cartão. Cancele quando quiser.</p>'+(enabled?'<a class="ui-btn btn-dark onboarding-plan-cta" href="./checkout.html'+(onboarding?'?onboarding=1':'')+'" '+(onboarding?'':'target="_blank" rel="noopener"')+'>Contratar Premium '+ico('arrow',17)+'</a>':'<button type="button" class="ui-btn btn-dark" disabled>Compra indisponível</button>')+'</div>':'')+ 
 '<small class="cp-plan-footnote">Cobrança mensal mediante autorização no checkout.</small>'+(data.premium?.recurring?.can_cancel?'<a class="ui-btn btn-outline" href="./checkout.html">Gerenciar assinatura</a>':'')+'</article></div></section>';
}
function checkoutView(){
 if(data.checkoutOwner!==state.session?.user?.id){data.webPayment=null;data.webCheckoutOpen=false;data.webError='';}
 const pending=paymentPending(data.webPayment?.status);
 const active=data.premium?.active===true;
 const ready=data.webCheckoutOpen&&!data.checkoutBusy;
 const method=data.checkoutMethod||'pix';
 const form='<div class="cp-pix-choice"><div class="cc-pay-method-head">'+ico('lock',20)+'<div><strong>'+ (method==='pix'?'Pagamento instantâneo':'Cartão de crédito')+'</strong><p>'+ (method==='pix'?'Informe os dados do titular para gerar o Pix.':'Informe os dados do titular para abrir a fatura segura do Asaas.')+'</p></div></div><form id="connectPixForm"><div class="cc-fields"><label>Nome<input name="first_name" required maxlength="80" autocomplete="given-name" placeholder="Nome"></label><label>Sobrenome<input name="last_name" required maxlength="80" autocomplete="family-name" placeholder="Sobrenome"></label></div><label>Documento<select name="document_type"><option value="CPF">CPF</option><option value="CNPJ">CNPJ</option></select></label><label>Número do documento<input name="document_number" required inputmode="numeric" maxlength="18" autocomplete="off" placeholder="Somente números"></label><button class="cc-pay-button" type="submit">'+(method==='pix'?'Gerar Pix de ':'Continuar para cartão · ')+esc(price()||'')+' '+ico('arrow',18)+'</button></form></div>';
 return '<section class="cc-checkout"><header class="cc-head"><button type="button" data-action="nav" data-view="premium" class="cc-back">'+ico('chevron',17)+' Voltar aos planos</button><span>'+ico('lock',16)+' Ambiente seguro</span></header><div class="cc-grid"><aside class="cc-summary"><div class="cc-brand"><img src="./connect-glass.svg" alt="" width="66" height="44"><span>CONNECT / PREMIUM</span></div><div class="cc-summary-main"><small>PLANO PREMIUM · 30 DIAS</small><h2>Seu mundo, mais conectado.</h2><p>Mais possibilidades para viver a comunidade do seu jeito.</p><div class="cc-price">'+esc(price()||'—')+'<small> / 30 dias</small></div></div><ul><li>'+ico('check',18)+' Filtros exclusivos no Ao vivo</li><li>'+ico('check',18)+' Banner animado no perfil</li><li>'+ico('check',18)+' Selo de destaque Premium</li><li>'+ico('check',18)+' WhatsApp prioritário</li></ul><div class="cc-total"><span>Total a pagar</span><strong>'+esc(price()||'—')+'</strong></div><p class="cc-note">Pagamento único. Sem renovação automática.</p></aside><main class="cc-payment"><span class="cc-step">CONTRATAÇÃO / PREMIUM</span><h2>Conclua sua assinatura.</h2><p>Escolha como deseja pagar. Seu acesso será liberado após a confirmação.</p>'+
 (active?'<div class="web-pay-success">'+ico('check',20)+' Seu Premium está ativo.</div><button type="button" class="cc-pay-button" data-action="nav" data-view="premium">Ver minha assinatura</button>':!ready?'<div class="cc-loading">'+(data.checkoutBusy?'Preparando pagamento seguro…':esc(data.webError||'Checkout indisponível.'))+'</div>'+(!data.checkoutBusy?'<button type="button" class="cc-pay-button" data-action="premiumCheckout">Tentar novamente</button>':''):'<div class="cc-methods" role="group" aria-label="Forma de pagamento"><button type="button" data-checkout-method="pix" aria-pressed="'+(method==='pix')+'" '+(pending?'disabled':'')+'>'+ico('bolt',22)+'<span>Pix<small>À vista</small></span></button><button type="button" data-checkout-method="card" aria-pressed="'+(method==='card')+'" '+(pending?'disabled':'')+'>'+ico('card',22)+'<span>Cartão<small>Crédito</small></span></button></div>'+(!pending?form:'')+'<div id="webPaymentStatus" aria-live="polite">'+webPaymentStatusMarkup()+'</div>')+
 '<div class="cc-security">'+ico('shield',20)+'<div><strong>Processado pelo Asaas</strong><small>Os dados do cartão são preenchidos diretamente no Asaas.</small></div></div><button type="button" class="cc-help" data-action="nav" data-view="support">Precisa de ajuda? Fale com o suporte '+ico('arrow',15)+'</button></main></div></section>';
}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-checkout-method]');if(!b||b.disabled||state.view!=='checkout'||data.webBusy||paymentPending(data.webPayment?.status))return;const method=b.dataset.checkoutMethod;if(!['pix','card'].includes(method)||method===data.checkoutMethod)return;const previous=document.getElementById('connectPixForm');const values=previous?Object.fromEntries(new FormData(previous)):{};data.checkoutMethod=method;data.webError='';renderView();const next=document.getElementById('connectPixForm');if(next)for(const [name,value] of Object.entries(values)){const field=next.elements.namedItem(name);if(field&&typeof value==='string')field.value=value;}});
async function openPremiumWhatsapp(){
 if(!data.premium?.active)throw Error('O atendimento prioritário exige Premium ativo.');
 const url=await call('entre_premium_whatsapp');location.assign(whatsappLink(url,{body:'Olá! Sou assinante Premium do CONNECT e gostaria de atendimento.'}));
}
function refreshWebStatus(){const el=document.getElementById('webPaymentStatus');if(el)el.innerHTML=webPaymentStatusMarkup();}
async function unmountPaymentBrick(){}
const asaasErrors={production_configuration_missing:'Configuração Asaas de produção incompleta.',asaas_http_401:'A chave de produção não foi aceita pelo Asaas.',asaas_http_403:'Asaas recusou a operação. Verifique a conta e as permissões.',asaas_http_400:'Asaas não aceitou os dados da cobrança. Confira nome e documento.',invalid_buyer_data:'Confira os dados do titular.',customer_document_mismatch:'O documento não corresponde ao titular já cadastrado. Contate o suporte.',pending_or_duplicate:'Já existe uma cobrança em andamento ou o Premium está ativo.',account_unavailable:'Conta indisponível para compras.',unauthorized:'Entre novamente na sua conta.'};
async function asaasCall(body){const r=await db.functions.invoke('connect-asaas-pay',{body});let result=r.data;if(r.error){try{result=await r.error.context?.json?.()||result;}catch(_){}}if(r.error||!result||result.error){const code=result?.error;const details=Array.isArray(result?.provider_codes)?result.provider_codes.filter(x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(x)).slice(0,5):[];throw Error(((details.includes('invalid_billingType')?'Esta forma de pagamento está indisponível no Asaas no momento.':asaasErrors[code])||('Falha no pagamento'+(code&&/^[a-z0-9_]+$/.test(code)?' ('+code+')':'.')))+(details.length?' · Código Asaas: '+details.join(', '):''));}return result;}
async function submitPix(form){
 if(data.webBusy||!data.webCheckoutOpen||paymentPending(data.webPayment?.status))return;
 const fields=new FormData(form),type=String(fields.get('document_type')),number=String(fields.get('document_number')).replace(/\D/g,''),first=String(fields.get('first_name')).trim(),last=String(fields.get('last_name')).trim();
 if(!first||!last||!((type==='CPF'&&number.length===11)||(type==='CNPJ'&&number.length===14))){data.webError='Confira nome, sobrenome e número do documento.';refreshWebStatus();return;}
 const button=form.querySelector('button[type=submit]'),uid=state.session?.user?.id;data.webBusy=true;button.disabled=true;data.webError='';data.webStatusText='Criando cobrança no Asaas…';refreshWebStatus();
 try{const p=await asaasCall({action:'pay',request_id:crypto.randomUUID(),name:first+' '+last,cpf_cnpj:number,method:data.checkoutMethod==='card'?'CREDIT_CARD':'PIX'});
 if(state.session?.user?.id!==uid||state.view!=='checkout')return;
 data.webPayment=p;data.webStatusText='';form.reset();if(['CONFIRMED','RECEIVED'].includes(p.status))await refreshPremium();
 renderView();
 }catch(e){if(state.session?.user?.id===uid&&state.view==='checkout'){data.webError=e.message;data.webStatusText='';refreshWebStatus();}}
 finally{data.webBusy=false;if(button.isConnected)button.disabled=false;}
}
document.addEventListener('submit',e=>{if(e.target?.id!=='connectPixForm')return;e.preventDefault();e.stopImmediatePropagation();void submitPix(e.target);},true);
async function leavePremium(){data.webCheckoutOpen=false;data.webError='';}
async function checkout(){
 if(!document.body?.classList.contains('checkout-page')){location.assign('./checkout.html');return;}const uid=state.session?.user?.id;if(!uid||data.checkoutBusy||data.webBusy)return;
 if(data.checkoutOwner!==uid){data.webPayment=null;data.webConfig=null;data.webCheckoutOpen=false;data.checkoutOwner=uid;}
 if(data.premium?.active){renderView();return;}data.checkoutBusy=true;data.webError='';renderView();
 try{const config=await asaasCall({action:'config'});if(!config.enabled||config.environment!=='production')throw Error('Compras indisponíveis no momento.');
 const p=await asaasCall({action:'status'});if(state.session?.user?.id!==uid||state.view!=='checkout')return;
 data.webConfig=config;data.webPayment=p.status==='none'?null:p;data.checkoutMethod=p.method==='CREDIT_CARD'?'card':'pix';data.webCheckoutOpen=true;
 }catch(e){data.webError=e.message;data.webCheckoutOpen=false;}
 finally{data.checkoutBusy=false;if(state.session?.user?.id===uid&&state.view==='checkout')renderView();}
}
async function verifyPremium(){if(data.webChecking||data.webBusy||!state.session?.user)return;const uid=state.session.user.id;data.webChecking=true;
 try{const p=await asaasCall({action:'status'});if(state.session?.user?.id!==uid||state.view!=='checkout')return;const old=data.webPayment?.status;data.webPayment=p;data.webError='';await refreshPremium();if(old!==p.status||data.premium?.active)renderView();else refreshWebStatus();}
 catch(e){if(state.session?.user?.id===uid&&state.view==='checkout'){data.webError=e.message;refreshWebStatus();}}finally{data.webChecking=false;}
}
async function copyPix(){
 if(paymentSeconds()===0){toast('O prazo terminou. Verificando a cobrança.');void verifyPremium();return;}
 const code=data.webPayment?.pix_code;
 if(!code)return;
 try{await navigator.clipboard.writeText(code);toast('Código Pix copiado.');}
 catch(e){const el=document.getElementById('webPixCode');el?.select();toast('Selecione e copie o código Pix.');}
}
let expiredCheckFor='';
setInterval(()=>{
 if(state.view!=='checkout'||document.visibilityState!=='visible'||!paymentPending(data.webPayment?.status))return;
 const remaining=paymentSeconds(),clock=document.getElementById('connectPaymentClock');
 if(clock)clock.textContent=paymentClock(remaining);
 if(remaining===0&&expiredCheckFor!==data.webPayment?.expires_at){expiredCheckFor=data.webPayment?.expires_at;refreshWebStatus();void verifyPremium();}
},1000);
document.addEventListener('visibilitychange',()=>{if(state.view==='checkout'&&!document.hidden&&paymentPending(data.webPayment?.status)){refreshWebStatus();void verifyPremium();}});
setInterval(()=>{if(state.view==='checkout'&&document.visibilityState==='visible'&&
 paymentPending(data.webPayment?.status)&&!data.webChecking)
 void verifyPremium().catch(e=>console.warn('Payment verification',e));},12000);
const supportCategories={bug:'Erro no aplicativo',account:'Conta e acesso',payment:'Pagamento ou assinatura',security:'Segurança e privacidade',other:'Outro assunto'};
function whatsappLink(base,message){
 if(typeof base!=='string'||!/^https:\/\/wa\.me\/[0-9]{10,15}(?:\?|$)/.test(base))throw Error('WhatsApp de suporte indisponível.');
 return base.split('?')[0]+'?text='+encodeURIComponent(message.body);
}
function supportView(){
 return '<section class="csup-page"><header class="csup-intro"><h2>Como podemos ajudar?</h2><p>Envie seu relato diretamente à equipe CONNECT. Acompanhe as respostas pelo protocolo.</p></header>'+prioritySupport()+'<form id="supportTicketForm" class="csup-form"><div class="csup-fields"><h3>Novo chamado</h3><div class="field"><label for="supportCategory">Categoria</label><select name="category" id="supportCategory">'+Object.entries(supportCategories).map(([v,label])=>'<option value="'+v+'">'+label+'</option>').join('')+'</select></div><div class="field"><label for="supportSubject">Assunto</label><input name="subject" id="supportSubject" minlength="5" maxlength="120" required placeholder="Resuma o problema"></div><div class="field"><label for="supportDescription">Descrição</label><textarea name="description" id="supportDescription" minlength="20" maxlength="3000" required rows="5" placeholder="Como podemos ajudar?"></textarea></div><div class="field"><label for="supportProof">Provas (opcionais)</label><input name="proof" id="supportProof" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" multiple><small>Até 3 arquivos de 5 MB. Enviados ao painel em armazenamento privado.</small></div><p class="csup-privacy">'+ico('lock',15)+' Não inclua senhas ou dados bancários.</p><button class="ui-btn btn-dark csup-submit" type="submit" '+(data.supportBusy?'disabled':'')+'>Enviar chamado '+ico('arrow',18)+'</button></div></form><button type="button" class="ui-btn btn-outline" data-action="nav" data-view="protocols">Meus protocolos '+ico('arrow',16)+'</button></section>';
}
function prioritySupport(){const active=data.premium?.active===true;return '<article class="csup-priority"><div class="csup-priority-icon">'+ico('crown',24)+'</div><div><small>CONNECT PREMIUM</small><h3>Atendimento prioritário</h3><p>'+(active?'Seu plano inclui suporte pelo WhatsApp.':'Tenha um canal direto de atendimento pelo WhatsApp ao adquirir o Premium.')+'</p></div><button type="button" class="ui-btn btn-dark" '+(active?'data-action="premiumWhatsapp"':'data-action="premiumFeatureNotice" data-feature="O atendimento prioritário pelo WhatsApp"')+'>'+(active?'Falar no WhatsApp':'Conhecer Premium')+'</button></article>';}
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
 if(view==='premium'){await refreshPremium();if(state.view==='premium'&&!data.webCheckoutOpen)renderView();}
 if(view==='checkout'){await refreshPremium();if(state.view==='checkout')await checkout();}
 if(view==='support'){await refreshPremium();if(state.view==='support')renderView();}
 if(view==='protocols'){protocolQuery='';data.support=[];await loadSupport();}
}
Object.assign(mod,{data,isPremium:premium,badge,loadBadges,refreshPremium,loadPosts,postsView,postAction,postForm,premiumView,checkoutView,checkout,verifyPremium,copyPix,unmountPaymentBrick,leavePremium,openPremiumWhatsapp,supportView,protocolsView,submitSupport,loadSupport,enter});
window.entreExtras=mod;
})();
