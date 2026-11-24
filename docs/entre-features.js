/* CONNECT posts, premium status and evidence-backed support. */
(function(){
'use strict';
const mod={};
const data={posts:[],postLoading:false,postBefore:null,postMore:false,premium:null,premiumIds:new Set(),support:[],supportBusy:false,checkoutBusy:false,premiumChecking:false,expandedPostComments:new Set(),webCheckoutOpen:false,webConfig:null,webPayment:null,webBusy:false,webStatusText:'',webError:'',webChecking:false,webBrick:null,commentsPost:null,commentsRows:[],commentsHasMore:false,commentsBusy:false,commentsError:''};
const call=async(name,params)=>{const r=await db.rpc(name,params||{});if(r.error)throw r.error;return r.data;};
const premium=id=>Boolean(id&&(data.premiumIds.has(id)||(id===state.session?.user?.id&&data.premium?.active===true)));
const badge=p=>premium(p?.id)?'<span class="verified-mark" title="Assinante CONNECT Premium" aria-label="Perfil verificado Premium">'+ico('check',12)+'</span>':'';
async function refreshPremium(){
 if(!state.session?.user)return;
 try{
  const uid=state.session.user.id;const r=await call('entre_premium_overview');
  if(state.session?.user?.id!==uid)return;
  data.premium=r||{active:false};
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
 if(data.postLoading)return;data.postLoading=true;
 try{
  const rows=await call('entre_posts_feed',{_before:more?data.postBefore:null});
  const arr=Array.isArray(rows)?rows:[];
  data.posts=more?data.posts.concat(arr):arr;
  data.postMore=arr.length===15;
  data.postBefore=data.posts[data.posts.length-1]?.id||null;
  await Promise.allSettled(data.posts.filter(p=>p.author_avatar).map(p=>signAvatar({id:p.author_id,display_name:p.author_name,avatar_path:p.author_avatar,avatar_uploaded_at:p.author_avatar_uploaded_at})));
  await window.entreMedia?.signPosts?.(data.posts);
  const ids=data.posts.filter(p=>p.premium).map(p=>p.author_id);
  for(const id of ids)data.premiumIds.add(id);
  if(state.view==='posts')renderView();
 }catch(e){toast(infoError(e),true);}finally{data.postLoading=false;}
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

function postsView(){
 return '<section class="posts-shell"><div class="posts-stream">'+'<section class="cn-feed-composer"><div class="cn-compose-heading">'+avatar(state.profile)+'<div><strong>Criar</strong><small>Compartilhe com a comunidade</small></div></div><form id="postCreateForm" class="post-compose cn-inline-post">'+
 '<textarea name="body" minlength="3" maxlength="900" placeholder="O que você quer publicar?"></textarea>'+ (window.entreMedia?.composeMarkup?.()||'')+
 '<div class="post-compose-footer"><button type="submit" class="ui-btn btn-dark btn-sm">Publicar post '+ico('arrow',15)+'</button></div></form></section>'+
 (data.posts.length?data.posts.map(p=>{
  const person={id:p.author_id,display_name:p.author_name,avatar_path:p.author_avatar,avatar_uploaded_at:p.author_avatar_uploaded_at};
  const own=p.author_id===state.session?.user?.id;
  return '<article class="post-card '+(p.premium?'premium-surface':'')+'"><div class="post-card-head">'+avatar(person)+
  '<div class="post-author"><strong>'+profileName(p.author_id,p.author_name)+badge(person)+'</strong><small>'+new Date(p.created_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})+(p.edited_at?' · Editada':'')+'</small></div>'+
  (own?'<button type="button" class="post-remove" data-action="postEdit" data-id="'+Number(p.id)+'" aria-label="Editar publicação">'+ico('edit',16)+'</button><button type="button" class="post-remove" data-action="postDelete" data-id="'+Number(p.id)+'" aria-label="Apagar meu post">'+ico('trash',16)+'</button>':'')+'</div>'+
  (p.body?'<p class="post-body">'+esc(p.body)+'</p>':'')+(window.entreMedia?.postMarkup?.(p)||'')+'<div class="post-interactions"><button type="button" class="'+(p.liked?'liked':'')+'" data-action="postLike" data-id="'+Number(p.id)+'">'+ico('heart',17)+' '+Number(p.likes||0)+' curtidas</button><span>'+ico('chat',15)+' '+(p.comments?.length||0)+' comentários recentes</span></div>'+
  '<button type="button" class="post-comments-launch" data-action="postCommentsOpen" data-id="'+Number(p.id)+'">'+ico('chat',18)+' <span>Ver comentários e participar</span>'+ico('arrow',16)+'</button></article>';
 }).join(''):'<div class="social-empty"><h3>Nenhuma publicação ainda.</h3><p>Compartilhe sua primeira publicação.</p></div>')+
 (data.postMore?'<button class="ui-btn btn-outline" data-action="postsMore">Carregar mais posts</button>':'')+'</div></section>'+commentsOverlay();
}
async function postAction(a,btn){
 const id=Number(btn.dataset.id);
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
 if(a==='postLike'){await call('entre_post_like',{_post:id});window.connectSound?.play?.('like');await loadPosts();return true;}
 return false;
}
async function postForm(form){
 const body=form.elements.body?.value?.trim();
 if(form.id==='postCreateForm'){
  if(window.entreMedia?.pending?.()){
   await window.entreMedia.publish(body||'');await loadPosts();return true;
  }
  if(!body||body.length<3||body.length>900)throw Error('Post precisa ter de 3 a 900 caracteres.');
  await call('entre_post_create',{_body:body});await loadPosts();toast('Seu post foi publicado.',false,'publish');return true;
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
function webPaymentStatusMarkup(){
 const p=data.webPayment||{},status=String(p.status||'');
 if(data.webError)return '<p class="web-pay-error">'+esc(data.webError)+'</p>';
 if(status==='approved')return '<div class="web-pay-success">'+ico('check',20)+' Pagamento aprovado. Premium liberado.</div>';
 if(status==='rejected'||status==='cancelled')return '<p class="web-pay-error">Pagamento não aprovado. Tente novamente.</p>';
 if(status==='pending'||status==='in_process'){
  return '<div class="web-pay-pending"><strong>'+ico('clock',18)+' Aguardando confirmação do pagamento</strong>'+
   '<p>O site confere o pagamento com o Mercado Pago. Assim que for aprovado, o Premium é ativado.</p>'+
   (p.pix_qr_base64?'<img class="web-pix-qr" alt="Código QR para Pix" src="data:image/png;base64,'+esc(p.pix_qr_base64)+'">':'')+
   (p.pix_code?'<label for="webPixCode">Pix Copia e Cola</label><textarea id="webPixCode" readonly>'+esc(p.pix_code)+'</textarea><button type="button" class="ui-btn btn-outline" data-action="premiumCopyPix">Copiar código Pix</button>':'')+
   '<button type="button" class="ui-btn btn-outline" data-action="premiumVerify">'+ico('refresh',17)+' Verificar pagamento</button></div>';
 }
 return data.webStatusText?'<p>'+esc(data.webStatusText)+'</p>':'';
}
function premiumView(){
 const active=data.premium?.active,enabled=data.premium?.checkout_enabled&&price()&&!data.checkoutBusy;
 const rows=items=>'<ul class="cp-plan-list">'+items.map(v=>'<li>'+ico('check',17)+'<span>'+v+'</span></li>').join('')+'</ul>';
 return '<section class="cp-plan-page"><div class="cp-plan-heading"><h2>Escolha seu plano</h2><p>Dois planos. A mesma comunidade.</p></div><div class="cp-plan-grid">'+
 '<article class="cp-plan"><span class="cp-plan-eyebrow">NORMAL</span><h3>Gratuito</h3><div class="cp-plan-price">R$ 0</div><p>Conheça pessoas e participe da comunidade.</p>'+rows(['Encontros por texto e vídeo','Conversas, posts e salas','Banner de perfil com foto','Temas claro, escuro e cor personalizada'])+
 '<div class="cp-plan-state">'+(active?'Incluído no Premium':ico('check',17)+' Seu plano atual')+'</div></article>'+
 '<article class="cp-plan cp-plan-paid"><span class="cp-plan-eyebrow">'+ico('crown',18)+' PREMIUM</span><h3>Mais possibilidades</h3><div class="cp-plan-price">'+(price()||'Valor a definir')+'<small> / mês</small></div><p>Todos os recursos do Normal, mais:</p>'+rows(['Banner animado em GIF','Filtro de gênero no Ao vivo','Selo de destaque no perfil','Atendimento prioritário pelo WhatsApp'])+
 (active?'<div class="cp-plan-state">'+ico('check',17)+' Premium ativo'+(data.premium.paid_until?' · até '+new Date(data.premium.paid_until).toLocaleDateString('pt-BR'):'')+'</div><button type="button" class="ui-btn btn-outline" data-action="premiumWhatsapp">'+ico('chat',17)+' WhatsApp prioritário</button>':'')+
 (!active?'<div class="cp-plan-purchase"><strong>Premium por 30 dias</strong><p>Pagamento único por Pix ou cartão, sem renovação automática.</p><button type="button" class="ui-btn btn-dark" data-action="premiumCheckout" '+(!enabled?'disabled':'')+'>'+(data.checkoutBusy?'Carregando…':'Comprar Premium')+'</button></div>':'')+ (data.webCheckoutOpen?'<div class="cp-web-checkout"><h3>Pagamento seguro</h3><div class="cp-pix-choice"><h4>Pix</h4><p>Preencha os dados do titular para gerar o QR Code.</p><form id="connectPixForm"><label>Nome<input name="first_name" required maxlength="80" autocomplete="given-name"></label><label>Sobrenome<input name="last_name" required maxlength="80" autocomplete="family-name"></label><label>Documento<select name="document_type"><option value="CPF">CPF</option><option value="CNPJ">CNPJ</option></select></label><label>Número do documento<input name="document_number" required inputmode="numeric" maxlength="18" autocomplete="off"></label><button class="ui-btn btn-dark" type="submit">Gerar Pix</button></form></div><h4>Ou pague com cartão</h4><div id="connectPaymentBrick"></div><div id="webPaymentStatus" aria-live="polite">'+webPaymentStatusMarkup()+'</div></div>':data.webError?'<p role="alert" class="web-pay-error">'+esc(data.webError)+'</p>':'')+ (window.entreRecurring?.view?.()||'')+
 '<small class="cp-plan-footnote">O pagamento único não gera cobranças automáticas.</small></article></div></section>';
}
async function openPremiumWhatsapp(){
 if(!data.premium?.active)throw Error('O atendimento prioritário exige Premium ativo.');
 const url=await call('entre_premium_whatsapp');location.assign(whatsappLink(url,{body:'Olá! Sou assinante Premium do CONNECT e gostaria de atendimento.'}));
}
async function loadMercadoPagoSDK(){
 if(window.MercadoPago)return;
 if(!data.mpScriptPromise)data.mpScriptPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://sdk.mercadopago.com/js/v2';script.async=true;
  script.onload=resolve;script.onerror=()=>{data.mpScriptPromise=null;script.remove();reject(Error('Não foi possível carregar o formulário de pagamento.'));};document.head.appendChild(script);
 });
 await data.mpScriptPromise;
 if(!window.MercadoPago)throw Error('Formulário de pagamento indisponível.');
}
function refreshWebStatus(){
 const area=document.getElementById('webPaymentStatus');
 if(area)area.innerHTML=webPaymentStatusMarkup();
}
async function unmountPaymentBrick(){
 const brick=data.webBrick;data.webBrick=null;
 if(brick?.unmount)try{await brick.unmount();}catch(e){console.warn('Payment Brick cleanup',e);}
}
const payErrors={buyer_identification_required:'Confira o CPF ou CNPJ informado.',buyer_name_required:'Informe nome e sobrenome.',invalid_payment_method:'Meio de pagamento inválido.',invalid_payment_form:'Formulário incompleto.',invalid_payment_request:'Solicitação inválida. Tente novamente.',invalid_card_token:'Confira os dados do cartão.',payment_already_pending_or_unavailable:'Já existe um pagamento em andamento ou o plano está indisponível. Verifique o pagamento antes de tentar novamente.',payment_reservation_failed:'Não foi possível registrar a compra. Tente novamente mais tarde.',provider_credentials_rejected:'O Mercado Pago recusou as credenciais da loja.',payment_rejected_by_provider:'O Mercado Pago não aceitou a solicitação. Confira os dados ou contate o suporte.',web_checkout_not_configured:'Checkout indisponível. Confira as credenciais de produção.',login_required:'Entre novamente na sua conta.'};
async function paymentResult(response){let result=response.data;if(response.error){try{result=await response.error.context?.json?.()||result;}catch(_){}}
 if(response.error||!result||result.error){const code=result?.error;const message=payErrors[code]||'Não foi possível gerar o pagamento. Tente novamente.';throw Error(message+(code&&/^[a-z_]+$/.test(code)?' ('+code+')':''));}return result;}
async function submitPix(form){
 if(data.webBusy||!data.webCheckoutOpen)return;
 if(data.webPayment?.payment_id&&['pending','in_process'].includes(data.webPayment.status)){refreshWebStatus();toast('Já existe um Pix pendente. Use o código abaixo.');return;}
 const fields=new FormData(form),type=String(fields.get('document_type')),number=String(fields.get('document_number')).replace(/\D/g,'');
 const first=String(fields.get('first_name')).trim(),last=String(fields.get('last_name')).trim();
 if(!first||!last||!((type==='CPF'&&number.length===11)||(type==='CNPJ'&&number.length===14))){data.webError='Confira nome, sobrenome e número do documento.';refreshWebStatus();return;}
 const button=form.querySelector('button[type=submit]'),uid=state.session?.user?.id;data.webBusy=true;button.disabled=true;data.webError='';data.webStatusText='Gerando Pix…';refreshWebStatus();
 try{const result=await paymentResult(await db.functions.invoke('entre-premium-web',{body:{action:'pay',request_id:crypto.randomUUID(),form_data:{payment_method_id:'pix',payer:{first_name:first,last_name:last,identification:{type,number}}}}}));
 if(state.session?.user?.id!==uid||state.view!=='premium')return;
 data.webPayment=result;form.reset();
 if(result.status==='approved'){await refreshPremium();data.webCheckoutOpen=false;await unmountPaymentBrick();renderView();toast('Pagamento aprovado!');return;}
 if(result.status==='pending'||result.status==='in_process'){data.webStatusText='Aguardando pagamento';if(!result.pix_code&&!result.pix_qr_base64)data.webError='Pagamento criado, mas o código Pix não foi retornado. Não gere outra cobrança; contate o suporte.';}
 else data.webError='Pagamento não aprovado. Confira os dados.';
 refreshWebStatus();document.getElementById('webPaymentStatus')?.scrollIntoView({block:'center'});
 }catch(error){data.webError=String(error.message||error);refreshWebStatus();toast(data.webError,true);}
 finally{data.webBusy=false;if(button.isConnected)button.disabled=false;}
}
document.addEventListener('submit',e=>{if(e.target?.id!=='connectPixForm')return;e.preventDefault();e.stopImmediatePropagation();void submitPix(e.target);},true);
async function renderWebBrick(){
 if(!data.webCheckoutOpen||!data.webConfig?.public_key||!document.getElementById('connectPaymentBrick'))return;
 await unmountPaymentBrick();
 await loadMercadoPagoSDK();
 const mp=new window.MercadoPago(data.webConfig.public_key,{locale:'pt-BR'});
 const builder=mp.bricks();
 data.webBrick=await builder.create('payment','connectPaymentBrick',{
  initialization:{amount:Number(data.webConfig.price_cents)/100,payer:{email:state.session?.user?.email||''}},
  customization:{paymentMethods:{creditCard:'all'}},
  callbacks:{
   onReady:()=>{data.webError='';refreshWebStatus();},
   onError:(error)=>{console.warn('Payment Brick',error);data.webError='Não foi possível carregar o pagamento. Atualize e tente novamente.';refreshWebStatus();},
   onSubmit:async({formData})=>{
    if(data.webBusy||data.webPayment?.payment_id&&['pending','in_process'].includes(data.webPayment.status))throw Error('Já existe um pagamento em andamento.');
    data.webBusy=true;data.webError='';data.webStatusText='Processando seu pagamento de forma segura…';refreshWebStatus();
    try{
     const result=await paymentResult(await db.functions.invoke('entre-premium-web',{body:{action:'pay',request_id:crypto.randomUUID(),form_data:formData}}));
     data.webPayment=result;
     if(result.status==='approved'){
      await refreshPremium();data.webCheckoutOpen=false;await unmountPaymentBrick();renderView();
      toast('Pagamento aprovado! Seu Premium foi liberado.',false,'success');
     }else if(result.status==='pending'||result.status==='in_process'){
      data.webStatusText='Aguardando confirmação';refreshWebStatus();
      document.getElementById('webPaymentStatus')?.scrollIntoView({behavior:'smooth',block:'center'});
     }else{
      data.webError='Pagamento recusado ou cancelado. Tente novamente.';refreshWebStatus();
     }
    }catch(error){data.webError=String(error.message||error);refreshWebStatus();throw error;}
    finally{data.webBusy=false;}
   }
  }
 });
}
async function leavePremium(){data.webCheckoutOpen=false;data.webError='';await unmountPaymentBrick();}
async function checkout(){
 if(data.checkoutBusy||data.webBusy)return;
 if(data.premium?.active){toast('Você já é Premium.');return;}
 if(!data.premium?.checkout_enabled||!price()){toast('A administração precisa habilitar as cobranças.',true);return;}
 data.checkoutBusy=true;data.webError='';renderView();
 try{
  const {data:config,error}=await db.functions.invoke('entre-premium-web',{body:{action:'config'}});
  if(error)throw Error('Não foi possível conectar ao checkout. Verifique sua sessão e tente novamente.');
  if(!config?.enabled||!config?.public_key)throw Error(config?.message||'O checkout não está habilitado com credenciais de produção.');
  if(state.view!=='premium')return;data.webConfig=config;data.webCheckoutOpen=true;data.webStatusText='';
  renderView();try{await renderWebBrick();}catch(error){console.warn('Card checkout unavailable');const card=document.getElementById('connectPaymentBrick');if(card)card.textContent='Cartão indisponível no momento. Você ainda pode gerar Pix acima.';}
 }catch(error){data.webError=infoError(error);data.webCheckoutOpen=false;renderView();toast(data.webError,true);}
 finally{data.checkoutBusy=false;const btn=document.querySelector('[data-action="premiumCheckout"]');if(btn){btn.disabled=!data.premium?.checkout_enabled;btn.textContent='Comprar Premium';}}
}
async function verifyPremium(){
 if(data.webChecking)return;
 data.webChecking=true;data.webError='';refreshWebStatus();
 try{
  if(data.webPayment?.payment_id){
   const {data:status,error}=await db.functions.invoke('entre-premium-web',{body:{action:'status'}});
   if(!error&&status&&!status.error){
    data.webPayment={...data.webPayment,...status};
    if(status.status==='approved'){
     await refreshPremium();data.webCheckoutOpen=false;await unmountPaymentBrick();renderView();
     toast('Pagamento confirmado. Premium ativo!',false,'success');return;
    }
   }
  }
  await refreshPremium();
  if(data.premium?.active){data.webCheckoutOpen=false;await unmountPaymentBrick();renderView();toast('Premium confirmado!',false,'success');}
  else{refreshWebStatus();toast('Pagamento ainda não foi confirmado.');}
 }finally{data.webChecking=false;refreshWebStatus();}
}
async function copyPix(){
 const code=data.webPayment?.pix_code;
 if(!code)return;
 try{await navigator.clipboard.writeText(code);toast('Código Pix copiado.');}
 catch(e){const el=document.getElementById('webPixCode');el?.select();toast('Selecione e copie o código Pix.');}
}
setInterval(()=>{if(state.view==='premium'&&document.visibilityState==='visible'&&
 data.webPayment?.payment_id&&['pending','in_process'].includes(data.webPayment.status)&&!data.webChecking)
 void verifyPremium().catch(e=>console.warn('Payment verification',e));},12000);
const supportCategories={bug:'Erro no aplicativo',account:'Conta e acesso',payment:'Pagamento ou assinatura',security:'Segurança e privacidade',other:'Outro assunto'};
function whatsappLink(base,message){
 if(typeof base!=='string'||!/^https:\/\/wa\.me\/[0-9]{10,15}(?:\?|$)/.test(base))throw Error('WhatsApp de suporte indisponível.');
 return base.split('?')[0]+'?text='+encodeURIComponent(message.body);
}
function supportView(){
 return '<section class="csup-page"><header class="csup-intro"><h2>Como podemos ajudar?</h2><p>Envie seu relato diretamente à equipe CONNECT. Acompanhe as respostas pelo protocolo.</p></header>'+prioritySupport()+'<form id="supportTicketForm" class="csup-form"><div class="csup-fields"><h3>Novo chamado</h3><div class="field"><label for="supportCategory">Categoria</label><select name="category" id="supportCategory">'+Object.entries(supportCategories).map(([v,label])=>'<option value="'+v+'">'+label+'</option>').join('')+'</select></div><div class="field"><label for="supportSubject">Assunto</label><input name="subject" id="supportSubject" minlength="5" maxlength="120" required placeholder="Resuma o problema"></div><div class="field"><label for="supportDescription">Descrição</label><textarea name="description" id="supportDescription" minlength="20" maxlength="3000" required rows="5" placeholder="Como podemos ajudar?"></textarea></div><div class="field"><label for="supportProof">Provas (opcionais)</label><input name="proof" id="supportProof" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" multiple><small>Até 3 arquivos de 5 MB. Enviados ao painel em armazenamento privado.</small></div><p class="csup-privacy">'+ico('lock',15)+' Não inclua senhas ou dados bancários.</p><button class="ui-btn btn-dark csup-submit" type="submit" '+(data.supportBusy?'disabled':'')+'>Enviar chamado '+ico('arrow',18)+'</button></div></form><button type="button" class="ui-btn btn-outline" data-action="nav" data-view="protocols">Meus protocolos '+ico('arrow',16)+'</button></section>';
}
function prioritySupport(){const active=data.premium?.active===true;return '<article class="csup-priority"><div class="csup-priority-icon">'+ico('crown',24)+'</div><div><small>CONNECT PREMIUM</small><h3>Atendimento prioritário</h3><p>'+(active?'Seu plano inclui suporte pelo WhatsApp.':'Tenha um canal direto de atendimento pelo WhatsApp ao adquirir o Premium.')+'</p></div><button type="button" class="ui-btn btn-dark" '+(active?'data-action="premiumWhatsapp"':'data-action="nav" data-view="premium"')+'>'+(active?'Falar no WhatsApp':'Conhecer Premium')+'</button></article>';}
function protocolsView(){if(supportOwner!==state.session?.user?.id)data.support=[];return '<section class="csup-page"><header class="csup-intro"><h2>Meus protocolos</h2><p>Acompanhe e gerencie seus chamados de suporte.</p></header><button type="button" class="ui-btn btn-dark" data-action="nav" data-view="support">Novo chamado</button><section class="csup-history"><div id="cpSupportHistory">'+supportHistory()+'</div></section></section>';}
function supportHistory(){const labels={submitted:'Aguardando resposta',reviewing:'Em atendimento',resolved:'Resolvido',cancelled:'Cancelado'};return data.support.length?data.support.map(t=>'<article class="csup-ticket"><strong>#'+Number(t.id)+' · '+esc(t.subject)+'</strong><small class="csup-ticket-status" data-status="'+esc(t.status)+'">'+esc(labels[t.status]||t.status)+'</small><div class="csup-ticket-actions"><button class="ui-btn btn-outline" type="button" data-support-thread="'+Number(t.id)+'">Abrir protocolo</button>'+(['submitted','reviewing'].includes(t.status)?'<button class="ui-btn btn-outline" type="button" data-support-cancel="'+Number(t.id)+'">Cancelar</button>':'')+'</div></article>').join(''):'<p class="csup-note">Nenhum protocolo ainda.</p>';}
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
 if(state.session?.user?.id===uid){form.reset();await loadSupport();nav('protocols');toast('Protocolo #'+id+' enviado à equipe.');}
 }catch(e){if(!submitted&&paths.length&&state.session?.user?.id===uid)await db.storage.from('entre-support-evidence').remove(paths).catch(()=>{});throw e;}finally{data.supportBusy=false;if(button?.isConnected)button.disabled=false;}
}
async function enter(view){
 if(view==='posts')await loadPosts();
 if(view==='premium'){await refreshPremium();await window.entreRecurring?.loadStatus?.();if(state.view==='premium'&&!data.webCheckoutOpen)renderView();}
 if(view==='support'){await refreshPremium();if(state.view==='support')renderView();}
 if(view==='protocols'){data.support=[];await loadSupport();}
}
Object.assign(mod,{data,isPremium:premium,badge,loadBadges,refreshPremium,loadPosts,postsView,postAction,postForm,premiumView,checkout,verifyPremium,copyPix,unmountPaymentBrick,leavePremium,openPremiumWhatsapp,supportView,protocolsView,submitSupport,loadSupport,enter});
window.entreExtras=mod;
})();
