/* entre. posts, premium status and evidence-backed support. */
(function(){
'use strict';
const mod={};
const data={posts:[],postLoading:false,postBefore:null,postMore:false,premium:null,premiumIds:new Set(),support:[],supportBusy:false,checkoutBusy:false,premiumChecking:false,expandedPostComments:new Set(),webCheckoutOpen:false,webConfig:null,webPayment:null,webBusy:false,webStatusText:'',webError:'',webChecking:false,webBrick:null,commentsPost:null,commentsRows:[],commentsHasMore:false,commentsBusy:false,commentsError:''};
const call=async(name,params)=>{const r=await db.rpc(name,params||{});if(r.error)throw r.error;return r.data;};
const premium=id=>Boolean(id&&(data.premiumIds.has(id)||(id===state.session?.user?.id&&data.premium?.active===true)));
const badge=p=>premium(p?.id)?'<span class="verified-mark" title="Assinante entre. Premium" aria-label="Perfil verificado Premium">'+ico('check',12)+'</span>':'';
async function refreshPremium(){
 if(!state.session?.user)return;
 try{
  const r=await call('entre_premium_overview');
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
  renderView();
 }catch(e){toast(infoError(e),true);}finally{data.postLoading=false;}
}

function commentCard(c){
 const own=c.author_id===state.session?.user?.id;
 return '<article class="full-comment" data-comment-id="'+Number(c.id)+'"><span class="comment-initial">'+esc(initials(c.name))+'</span>'+
 '<div class="full-comment-content"><div class="full-comment-top"><strong>'+esc(c.name||'Pessoa')+
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
 '<div><span>ENTRE. · COMUNIDADE</span><h2>Comentários</h2><p>'+esc(title)+'</p></div>'+
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
 return heading('UMA COMUNIDADE DE VERDADE','Feed <em>da comunidade.</em>','Compartilhe ideias, conheça pontos de vista e converse com respeito. Publicações são públicas para usuários conectados.')+
 '<section class="posts-shell"><div class="posts-stream"><form id="postCreateForm" class="post-compose"><div class="post-compose-top">'+avatar(state.profile)+'<div><strong>O que você quer compartilhar?</strong><small>Seu espaço para começar uma conversa.</small></div>'+badge(state.profile)+'</div>'+
 '<textarea name="body" minlength="3" maxlength="900" placeholder="Uma ideia, uma pergunta ou uma legenda para sua foto ou vídeo…"></textarea>'+ (window.entreMedia?.composeMarkup?.()||'')+
 '<div class="post-compose-footer"><small>Texto, foto ou vídeo · respeite os outros.</small><button type="submit" class="ui-btn btn-dark btn-sm">Publicar '+ico('arrow',15)+'</button></div></form>'+
 (data.posts.length?data.posts.map(p=>{
  const person={id:p.author_id,display_name:p.author_name,avatar_path:p.author_avatar,avatar_uploaded_at:p.author_avatar_uploaded_at};
  const own=p.author_id===state.session?.user?.id;
  return '<article class="post-card '+(p.premium?'premium-surface':'')+'"><div class="post-card-head">'+avatar(person)+
  '<div class="post-author"><strong>'+esc(p.author_name||'Pessoa')+badge(person)+'</strong><small>'+new Date(p.created_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})+'</small></div>'+
  (own?'<button type="button" class="post-remove" data-action="postDelete" data-id="'+Number(p.id)+'" aria-label="Apagar meu post">'+ico('trash',16)+'</button>':'')+'</div>'+
  (p.body?'<p class="post-body">'+esc(p.body)+'</p>':'')+(window.entreMedia?.postMarkup?.(p)||'')+'<div class="post-interactions"><button type="button" class="'+(p.liked?'liked':'')+'" data-action="postLike" data-id="'+Number(p.id)+'">'+ico('heart',17)+' '+Number(p.likes||0)+' curtidas</button><span>'+ico('chat',15)+' '+(p.comments?.length||0)+' comentários recentes</span></div>'+
  '<button type="button" class="post-comments-launch" data-action="postCommentsOpen" data-id="'+Number(p.id)+'">'+ico('chat',18)+' <span>Ver comentários e participar</span>'+ico('arrow',16)+'</button></article>';
 }).join(''):'<div class="social-empty"><h3>A comunidade está começando.</h3><p>Seu post pode ser o primeiro. Faça uma pergunta ou compartilhe uma ideia.</p></div>')+
 (data.postMore?'<button class="ui-btn btn-outline" data-action="postsMore">Carregar mais posts</button>':'')+'</div>'+
 '<aside class="posts-aside"><strong>Um espaço para conversas reais</strong><p>Não compartilhe telefone, dados pessoais, endereços nem informações íntimas. Respeito e privacidade são essenciais.</p><button type="button" data-action="nav" data-view="support" class="ui-btn btn-outline btn-sm">Reportar um problema</button></aside></section>'+commentsOverlay();
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
 if(a==='postDelete'){
  if(!confirm('Apagar esta publicação e seus comentários?'))return true;
  const oldPost=data.posts.find(p=>Number(p.id)===id);
  await call('entre_post_delete',{_post:id});await window.entreMedia?.removePostMedia?.(oldPost);await loadPosts();toast('Post apagado.');return true;
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
  await call('entre_post_comment_delete',{_comment:id});await loadCommentPage();await loadPosts();toast('Comentário apagado.');return true;
 }
 if(a==='postLike'){await call('entre_post_like',{_post:id});await loadPosts();return true;}
 return false;
}
async function postForm(form){
 const body=form.elements.body?.value?.trim();
 if(form.id==='postCreateForm'){
  if(window.entreMedia?.pending?.()){
   await window.entreMedia.publish(body||'');await loadPosts();return true;
  }
  if(!body||body.length<3||body.length>900)throw Error('Post precisa ter de 3 a 900 caracteres.');
  await call('entre_post_create',{_body:body});await loadPosts();toast('Seu post foi publicado.');return true;
 }
 if(form.classList.contains('post-comment-edit-form')){
  if(!body||body.length<2||body.length>420)throw Error('Comentário precisa ter de 2 a 420 caracteres.');
  await call('entre_post_comment_edit',{_comment:Number(form.dataset.comment),_body:body});
  await loadCommentPage();await loadPosts();toast('Comentário atualizado.');return true;
 }
 if(form.classList.contains('post-comment-report-form')){
  await call('entre_post_comment_report',{_comment:Number(form.dataset.comment),_reason:form.elements.reason.value,_details:form.elements.details.value.trim()});
  await loadCommentPage();toast('Denúncia enviada para moderação.');return true;
 }
 if(form.classList.contains('post-comment-form')){
  if(!body||body.length<2||body.length>420)throw Error('Comentário precisa ter de 2 a 420 caracteres.');
  await call('entre_post_comment',{_post:Number(form.dataset.post),_body:body});
  await loadCommentPage();await loadPosts();toast('Comentário publicado.');document.getElementById('commentDialogInput')?.focus();return true;
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
 return heading('ENTRE. PREMIUM','Uma experiência <em>mais sua.</em>','Mais opções para se conectar, destaque no perfil e suporte prioritário.')+
 '<section class="premium-checkout"><div class="premium-pitch"><span class="premium-label">✧ ENTRE. PREMIUM</span><h3>Seja notado.<br><em>Conecte-se do seu jeito.</em></h3><p>Personalize quem você encontra, destaque seu perfil e tenha um canal direto de suporte.</p>'+
 '<div class="premium-perks"><div>'+ico('check',19)+' <span>Filtro Premium de gênero no Ao Vivo</span></div>'+
 '<div>'+ico('star',19)+' <span>Selo de destaque no perfil</span></div>'+
 '<div>'+ico('chat',19)+' <span>Atendimento prioritário pelo WhatsApp</span></div></div></div>'+
 '<div class="premium-checkout-card"><span>PREMIUM · 30 DIAS</span><h3>'+(price()||'Valor a definir')+'</h3>'+
 '<p>'+(price()?'Pague uma vez pelo navegador com Pix ou cartão. Acesso válido por 30 dias, sem renovação automática nesta opção.':'Defina o preço no painel administrativo para habilitar o checkout.')+'</p>'+
 (active?'<div class="premium-confirmed">'+ico('check',19)+' Sua assinatura está ativa.</div>'+
  '<button type="button" class="ui-btn btn-dark premium-whatsapp" data-action="premiumWhatsapp">'+ico('chat',18)+' WhatsApp prioritário</button>'+
  (data.premium.paid_until?'<small>Válida até '+new Date(data.premium.paid_until).toLocaleDateString('pt-BR')+'</small>':''):
  '<button type="button" class="ui-btn btn-dark premium-buy" data-action="premiumCheckout" '+(enabled?'':'disabled')+'>'+ico('shield',17)+' '+(data.checkoutBusy?'Abrindo pagamento…':'Pagar aqui com Pix ou cartão')+'</button>')+
 '<div class="web-payment-status" id="webPaymentStatus" role="status">'+webPaymentStatusMarkup()+'</div>'+
 '<div class="web-checkout-embed" '+(data.webCheckoutOpen&&!active?'':'hidden')+'><div id="connectPaymentBrick" aria-label="Pagamento seguro com Pix ou cartão"></div></div>'+
 '<button type="button" class="ui-btn btn-outline" data-action="premiumVerify" '+(data.webChecking?'disabled':'')+'>'+ico('refresh',17)+' '+(data.webChecking?'Verificando…':'Já paguei · verificar pagamento')+'</button>'+
 '<small>Seus dados de cartão são tratados nos componentes seguros do Mercado Pago. O acesso só é liberado após confirmação na API do provedor.</small></div></section>';
}
async function openPremiumWhatsapp(){
 if(!data.premium?.active)throw Error('O atendimento prioritário exige Premium ativo.');
 const url=await call('entre_premium_whatsapp');
 if(typeof url!=='string'||!/^https:\/\/wa\.me\/[0-9]{10,15}(?:\?|$)/.test(url))throw Error('Link de suporte não disponível.');
 window.location.assign(url);
}
async function loadMercadoPagoSDK(){
 if(window.MercadoPago)return;
 if(!data.mpScriptPromise)data.mpScriptPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://sdk.mercadopago.com/js/v2';script.async=true;
  script.onload=resolve;script.onerror=()=>reject(Error('Não foi possível carregar o formulário de pagamento.'));document.head.appendChild(script);
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
async function renderWebBrick(){
 if(!data.webCheckoutOpen||!data.webConfig?.public_key||!document.getElementById('connectPaymentBrick'))return;
 await unmountPaymentBrick();
 await loadMercadoPagoSDK();
 const mp=new window.MercadoPago(data.webConfig.public_key,{locale:'pt-BR'});
 const builder=mp.bricks();
 data.webBrick=await builder.create('payment','connectPaymentBrick',{
  initialization:{amount:Number(data.webConfig.price_cents)/100},
  customization:{paymentMethods:{creditCard:'all',bankTransfer:'all'}},
  callbacks:{
   onReady:()=>{data.webError='';refreshWebStatus();},
   onError:(error)=>{console.warn('Payment Brick',error);data.webError='Não foi possível carregar o pagamento. Atualize e tente novamente.';refreshWebStatus();},
   onSubmit:async({formData})=>{
    data.webBusy=true;data.webError='';data.webStatusText='Processando seu pagamento de forma segura…';refreshWebStatus();
    try{
     const {data:result,error}=await db.functions.invoke('entre-premium-web',{body:{action:'pay',request_id:crypto.randomUUID(),form_data:formData}});
     if(error||!result||result.error)throw Error(result?.error||'Não foi possível enviar o pagamento.');
     data.webPayment=result;
     if(result.status==='approved'){
      await refreshPremium();data.webCheckoutOpen=false;await unmountPaymentBrick();renderView();
      toast('Pagamento aprovado! Seu Premium foi liberado.');
     }else if(result.status==='pending'||result.status==='in_process'){
      data.webStatusText='Aguardando confirmação';refreshWebStatus();
      document.getElementById('webPaymentStatus')?.scrollIntoView({behavior:'smooth',block:'center'});
     }else{
      data.webError='Pagamento recusado ou cancelado. Tente novamente.';refreshWebStatus();
     }
    }catch(error){data.webError=infoError(error);refreshWebStatus();throw error;}
    finally{data.webBusy=false;}
   }
  }
 });
}
async function checkout(){
 if(data.checkoutBusy)return;
 if(data.premium?.active){toast('Você já é Premium.');return;}
 if(!data.premium?.checkout_enabled||!price()){toast('A administração precisa habilitar as cobranças.',true);return;}
 data.checkoutBusy=true;data.webError='';renderView();
 try{
  const {data:config,error}=await db.functions.invoke('entre-premium-web',{body:{action:'config'}});
  if(error||!config?.enabled||!config?.public_key)throw Error(config?.message||'Pagamento Pix/cartão no navegador ainda não está configurado.');
  data.webConfig=config;data.webCheckoutOpen=true;data.webStatusText='';
  renderView();await renderWebBrick();
 }catch(error){data.webError=infoError(error);data.webCheckoutOpen=false;renderView();toast(data.webError,true);}
 finally{data.checkoutBusy=false;}
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
     toast('Pagamento confirmado. Premium ativo!');return;
    }
   }
  }
  await refreshPremium();
  if(data.premium?.active){data.webCheckoutOpen=false;await unmountPaymentBrick();renderView();toast('Premium confirmado!');}
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
function supportView(){
 return heading('CUIDAR DO ENTRE.','Central de <em>suporte.</em>','Relate problemas do site ou da sua conta. Imagens são opcionais e ajudam na análise, mas nunca são obrigatórias.')+
 '<div class="support-access"><div class="support-access-card"><span>SUPORTE PADRÃO</span><h3>Problemas com o site, conta ou pagamento</h3><p>Envie um protocolo para a equipe. O envio para o e-mail de suporte ocorre quando a integração está configurada.</p><a href="#supportTicketForm" class="ui-btn btn-outline">Abrir chamado</a></div><div class="support-access-card premium"><span>SUPORTE PREMIUM</span><h3>WhatsApp direto e prioritário</h3><p>Exclusivo para assinantes com pagamento confirmado.</p>'+(data.premium?.active?'<button type="button" class="ui-btn btn-dark" data-action="premiumWhatsapp">Abrir WhatsApp Premium</button>':'<button type="button" class="ui-btn btn-outline" data-action="nav" data-view="premium">Conhecer Premium</button>')+'</div></div>'+ 
  '<div class="support-layout"><form class="support-ticket-form" id="supportTicketForm">'+ 
 '<div class="field"><label for="supportCategory">O que aconteceu?</label><select name="category" id="supportCategory" required><option value="bug">Erro no site ou aplicativo</option><option value="account">Problema na conta</option><option value="other">Pagamento ou assinatura</option><option value="security">Segurança e privacidade</option><option value="other">Outra dificuldade</option></select></div>'+
 '<div class="field"><label for="supportSubject">Assunto</label><input type="text" name="subject" id="supportSubject" minlength="5" maxlength="120" placeholder="Descreva o problema em poucas palavras" required></div>'+
 '<div class="field"><label for="supportDescription">O que aconteceu? Explique os detalhes.</label><textarea name="description" id="supportDescription" minlength="20" maxlength="3000" rows="6" required placeholder="Conte o que tentou fazer, o que apareceu e quando aconteceu."></textarea></div>'+
 '<div class="field"><label for="supportProof">Anexos (opcionais)</label><input type="file" name="proof" id="supportProof" accept="image/png,image/jpeg,image/webp,application/pdf" multiple><small>Se quiser, anexe até 3 imagens ou PDF (5 MB cada). Não envie senhas, documentos nem dados bancários.</small></div>'+
 '<button class="ui-btn btn-dark" type="submit" '+(data.supportBusy?'disabled':'')+'>Enviar relato '+ico('send',17)+'</button>'+
 '<p class="support-security">'+ico('lock',14)+' As provas ficam em armazenamento privado, acessíveis à equipe autorizada.</p></form>'+
 '<aside class="support-contact"><span class="premium-label">SUPORTE ENTRE.</span><h3>Estamos aqui para ouvir.</h3><p>Seu relato é salvo com um número de protocolo. Envio por e-mail será confirmado apenas quando a integração estiver configurada.</p><strong>Contato da equipe</strong><span>Atendimento por protocolo dentro do aplicativo. O e-mail separado de suporte será configurado pelo administrador.</span>'+
 (data.premium?.active?'<button type="button" class="ui-btn btn-outline" data-action="premiumWhatsapp">WhatsApp Premium '+ico('arrow',16)+'</button>':
 '<button type="button" class="ui-btn btn-outline btn-sm" data-action="nav" data-view="premium">Conhecer suporte Premium</button>')+'</aside></div>'+
 (data.support.length?'<section class="support-history"><h3>Meus protocolos</h3>'+data.support.map(t=>'<div><strong>#'+Number(t.id)+' · '+esc(t.subject)+'</strong><small>'+esc(t.status)+' · '+new Date(t.created_at).toLocaleDateString('pt-BR')+(t.email_status==='sent'?' · E-mail enviado':' · Recebido no sistema')+'</small></div>').join('')+'</section>':'');
}
async function loadSupport(){try{const rows=await call('entre_my_support_tickets');data.support=Array.isArray(rows)?rows:[];}catch(e){console.warn('Support',e);}}
async function submitSupport(form){
 if(data.supportBusy)return;
 const files=[...(form.elements.proof?.files||[])];
 if(files.length>3)throw Error('Anexe no máximo 3 arquivos.');
 for(const file of files)if(file.size>5242880||!['image/png','image/jpeg','image/webp','application/pdf'].includes(file.type))throw Error('Use imagem ou PDF de até 5 MB.');
 data.supportBusy=true;const button=form.querySelector('[type=submit]');if(button)button.disabled=true;
 try{
  const id=await call('entre_support_create',{_category:form.elements.category.value,_subject:form.elements.subject.value,_description:form.elements.description.value});
  const paths=[];
  for(const file of files){
   const ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','application/pdf':'pdf'}[file.type];
   const path=state.session.user.id+'/'+id+'/'+crypto.randomUUID()+'.'+ext;
   const response=await db.storage.from('entre-support-evidence').upload(path,file,{contentType:file.type,upsert:false});
   if(response.error)throw response.error;
   paths.push(path);
  }
  await call('entre_support_submit',{_ticket:Number(id),_paths:paths});
  let sent=false;
  try{
   const {data:mail,error}=await db.functions.invoke('entre-support-email',{body:{ticket_id:Number(id)}});
   if(!error&&mail?.email_status==='sent')sent=true;
  }catch(e){console.warn('Email pending',e);}
  await loadSupport();renderView();
  toast('Protocolo #'+id+' registrado'+(files.length?' com '+files.length+' anexo(s)':' sem anexos')+'. '+(sent?'E-mail enviado.':'A equipe pode consultar seu chamado no painel.'));
 }finally{data.supportBusy=false;if(button?.isConnected)button.disabled=false;}
}
async function enter(view){
 if(view==='posts')await loadPosts();
 if(view==='premium'){await refreshPremium();renderView();if(data.webCheckoutOpen&&!data.premium?.active)void renderWebBrick().catch(e=>{data.webError=infoError(e);refreshWebStatus();});}
 if(view==='support'){await Promise.all([loadSupport(),refreshPremium()]);renderView();}
}
Object.assign(mod,{data,isPremium:premium,badge,loadBadges,refreshPremium,loadPosts,postsView,postAction,postForm,premiumView,checkout,verifyPremium,copyPix,unmountPaymentBrick,openPremiumWhatsapp,supportView,submitSupport,loadSupport,enter});
window.entreExtras=mod;
})();
