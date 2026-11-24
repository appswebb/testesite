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
  if(state.view==='posts')renderView();
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
 return '<section class="posts-shell"><div class="posts-stream">'+(window.entreStories?.markup?.()||'')+'<section class="cn-feed-composer"><div class="cn-compose-heading">'+avatar(state.profile)+'<div><strong>Criar</strong><small>Compartilhe com a comunidade</small></div></div><form id="postCreateForm" class="post-compose cn-inline-post">'+
 '<textarea name="body" minlength="3" maxlength="900" placeholder="O que você quer publicar?"></textarea>'+ (window.entreMedia?.composeMarkup?.()||'')+
 '<div class="post-compose-footer"><button type="submit" class="ui-btn btn-dark btn-sm">Publicar post '+ico('arrow',15)+'</button></div></form></section>'+
 (data.posts.length?data.posts.map(p=>{
  const person={id:p.author_id,display_name:p.author_name,avatar_path:p.author_avatar,avatar_uploaded_at:p.author_avatar_uploaded_at};
  const own=p.author_id===state.session?.user?.id;
  return '<article class="post-card '+(p.premium?'premium-surface':'')+'"><div class="post-card-head">'+avatar(person)+
  '<div class="post-author"><strong>'+esc(p.author_name||'Pessoa')+badge(person)+'</strong><small>'+new Date(p.created_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})+'</small></div>'+
  (own?'<button type="button" class="post-remove" data-action="postDelete" data-id="'+Number(p.id)+'" aria-label="Apagar meu post">'+ico('trash',16)+'</button>':'')+'</div>'+
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
 if(a==='postDelete'){
  if(!confirm('Apagar esta publicação e seus comentários?'))return true;
  const oldPost=data.posts.find(p=>Number(p.id)===id);
  await call('entre_post_delete',{_post:id});await window.entreMedia?.removePostMedia?.(oldPost);await loadPosts();toast('Post apagado.',false,'delete');return true;
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
 '<article class="cp-plan"><span class="cp-plan-eyebrow">NORMAL</span><h3>Gratuito</h3><div class="cp-plan-price">R$ 0</div><p>Conheça pessoas e participe da comunidade.</p>'+rows(['Encontros por texto e vídeo','Conversas, posts, stories, salas e lives','Banner de perfil com foto','Temas claro, escuro e cor personalizada'])+
 '<div class="cp-plan-state">'+(active?'Incluído no Premium':ico('check',17)+' Seu plano atual')+'</div></article>'+
 '<article class="cp-plan cp-plan-paid"><span class="cp-plan-eyebrow">'+ico('crown',18)+' PREMIUM</span><h3>Mais possibilidades</h3><div class="cp-plan-price">'+(window.entreRecurring?.price?.()||'Valor a definir')+'<small> / mês</small></div><p>Todos os recursos do Normal, mais:</p>'+rows(['Banner animado em GIF','Filtro de gênero no Ao vivo','Selo de destaque no perfil','Atendimento prioritário pelo WhatsApp'])+
 (active?'<div class="cp-plan-state">'+ico('check',17)+' Premium ativo'+(data.premium.paid_until?' · até '+new Date(data.premium.paid_until).toLocaleDateString('pt-BR'):'')+'</div><button type="button" class="ui-btn btn-outline" data-action="nav" data-view="support">'+ico('chat',17)+' WhatsApp prioritário</button>':'')+
 (window.entreRecurring?.view?.()||'<p>Carregando assinatura mensal…</p>')+
 '<small class="cp-plan-footnote">Cobrança mensal automática no cartão. Cancele a renovação quando quiser.</small></article></div></section>';
}
async function openPremiumWhatsapp(){if(!data.premium?.active)throw Error('O atendimento prioritário exige Premium ativo.');const url=await call('entre_premium_whatsapp');whatsappLink(url,{body:''});document.querySelector('[data-view="support"][data-action="nav"]')?.click();if(state.view!=='support'){const btn=document.createElement('button');btn.dataset.action='nav';btn.dataset.view='support';btn.hidden=true;document.body.append(btn);btn.click();btn.remove();}}
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
      toast('Pagamento aprovado! Seu Premium foi liberado.',false,'success');
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
const SUPPORT_EMAIL='connectapp.w@gmail.com';
const supportCategories={bug:'Erro no aplicativo',account:'Conta e acesso',payment:'Pagamento ou assinatura',security:'Segurança e privacidade',other:'Outro assunto'};
const supportProviders={default:'Aplicativo de e-mail padrão',gmail:'Gmail (web)',outlook:'Outlook (web)'};
let supportHandoff=null;
function supportMessage({id,category,subject,description,name,handle,channel,files=0}){
 const premium=channel==='whatsapp';
 const title='[CONNECT'+(premium?' PREMIUM':'')+'] #'+id+' · '+subject.replace(/[\r\n]+/g,' ');
 const body=[
 premium?'Olá, equipe CONNECT! Sou assinante Premium e preciso de atendimento.':'Olá, equipe CONNECT! Preciso de ajuda com o aplicativo.',
 '',
 'CHAMADO DE SUPORTE'+(premium?' PREMIUM':''),
 'Protocolo: #'+id,
 'Nome: '+(name||'Pessoa do CONNECT'),
 'Perfil: '+(handle?'@'+handle:'Não informado'),
 'Categoria: '+(supportCategories[category]||supportCategories.other),
 'Assunto: '+subject,
 '',
 'DESCRIÇÃO',
 description,
 '',
 files?'Anexos: '+files+' arquivo(s) registrados no protocolo privado.':'Anexos: nenhum.',
 '',
 'Obrigado pela atenção!'
 ].join('\n');
 return {title,body};
}
function emailLink(provider,message){
 const e=encodeURIComponent(SUPPORT_EMAIL),subject=encodeURIComponent(message.title),body=encodeURIComponent(message.body);
 if(provider==='gmail')return 'https://mail.google.com/mail/?view=cm&fs=1&to='+e+'&su='+subject+'&body='+body;
 if(provider==='outlook')return 'https://outlook.live.com/mail/0/deeplink/compose?to='+e+'&subject='+subject+'&body='+body;
 return 'mailto:'+SUPPORT_EMAIL+'?subject='+subject+'&body='+body;
}
function whatsappLink(base,message){
 if(typeof base!=='string'||!/^https:\/\/wa\.me\/[0-9]{10,15}(?:\?|$)/.test(base))throw Error('WhatsApp de suporte indisponível.');
 return base.split('?')[0]+'?text='+encodeURIComponent(message.body);
}
function supportView(){
 const active=data.premium?.active===true, handoff=supportHandoff?.uid===state.session?.user?.id?supportHandoff:null;
 return '<section class="csup-page"><header class="csup-intro"><h2>Como podemos ajudar?</h2><p>Escolha o canal, descreva o problema e envie a mensagem pelo aplicativo de sua preferência.</p></header>'+
 '<form id="supportTicketForm" class="csup-form">'+
 '<fieldset class="csup-channels"><legend>Canal de atendimento</legend>'+
 '<label class="csup-channel"><input type="radio" name="channel" value="email" checked><span class="csup-channel-icon">'+ico('mail',23)+'</span><span class="csup-channel-copy"><strong>E-mail</strong><small>Disponível para todas as contas</small></span><span class="csup-tag">Normal</span></label>'+
 '<label class="csup-channel '+(!active?'csup-locked':'')+'"><input type="radio" name="channel" value="whatsapp" '+(!active?'disabled':'')+'><span class="csup-channel-icon">'+ico('chat',23)+'</span><span class="csup-channel-copy"><strong>WhatsApp</strong><small>'+(active?'Atendimento direto e prioritário':'Exclusivo para assinantes ativos')+'</small></span><span class="csup-tag">Premium '+ico(active?'check':'lock',12)+'</span></label>'+
 (!active?'<button type="button" class="csup-upgrade" data-action="nav" data-view="premium">Conhecer Premium '+ico('arrow',15)+'</button>':'')+'</fieldset>'+
 '<div class="csup-fields"><h3>Sobre o seu problema</h3>'+
 '<div class="field"><label for="supportCategory">Categoria</label><select name="category" id="supportCategory" required>'+Object.entries(supportCategories).map(([v,label])=>'<option value="'+v+'">'+label+'</option>').join('')+'</select></div>'+
 '<div class="field"><label for="supportSubject">Assunto</label><input type="text" name="subject" id="supportSubject" minlength="5" maxlength="120" placeholder="Resuma o problema" required></div>'+
 '<div class="field"><label for="supportDescription">Descreva o que aconteceu</label><textarea name="description" id="supportDescription" minlength="20" maxlength="3000" rows="5" required placeholder="Conte o que aconteceu e como podemos ajudar."></textarea></div>'+
 '<div class="field"><label for="supportProof">Anexos (opcionais)</label><input type="file" name="proof" id="supportProof" accept="image/png,image/jpeg,image/webp,application/pdf" multiple><small>Até 3 imagens ou PDFs de 5 MB. Os anexos ficam no protocolo privado; não são anexados automaticamente ao e-mail ou WhatsApp.</small></div>'+
 '<div class="field csup-email-choice"><label for="supportProvider">Abrir e-mail com</label><select id="supportProvider" name="provider">'+Object.entries(supportProviders).map(([v,label])=>'<option value="'+v+'">'+label+'</option>').join('')+'</select><small>Destino: '+SUPPORT_EMAIL+'</small></div>'+
 '<p class="csup-privacy">'+ico('lock',15)+' Não inclua senhas, documentos nem dados bancários.</p>'+
 '<button type="submit" class="ui-btn btn-dark csup-submit" '+(data.supportBusy?'disabled':'')+'><span class="csup-email-label">Abrir e-mail preenchido</span><span class="csup-whatsapp-label">Abrir WhatsApp preenchido</span>'+ico('arrow',18)+'</button>'+
 '<p class="csup-note">Você revisa e envia a mensagem no aplicativo escolhido. O CONNECT não envia a mensagem automaticamente.</p></div></form>'+
 (handoff?'<section class="csup-ready" role="status"><h3>Protocolo #'+esc(handoff.id)+' registrado</h3><p>Se o aplicativo não abriu, use o botão abaixo. A mensagem ainda precisa ser enviada por você.</p><a class="ui-btn btn-dark" href="'+esc(handoff.url)+'" rel="noopener noreferrer">Abrir '+(handoff.channel==='whatsapp'?'WhatsApp':'e-mail')+' '+ico('arrow',17)+'</a><label for="supportPreparedMessage">Mensagem preparada</label><textarea id="supportPreparedMessage" readonly rows="5">'+esc(handoff.message.title+'\n\n'+handoff.message.body)+'</textarea></section>':'')+
 (data.support.length?'<section class="csup-history"><h3>Meus protocolos</h3>'+data.support.map(t=>'<article><strong>#'+Number(t.id)+' · '+esc(t.subject)+'</strong><small>'+esc(t.status)+' · '+new Date(t.created_at).toLocaleDateString('pt-BR')+(t.email_status==='sent'?' · E-mail enviado pelo sistema':' · Registrado no CONNECT')+'</small></article>').join('')+'</section>':'')+'</section>';
}
async function loadSupport(){try{const rows=await call('entre_my_support_tickets');data.support=Array.isArray(rows)?rows:[];}catch(e){console.warn('Support',e);}}
async function submitSupport(form){
 if(data.supportBusy)return;
 const uid=state.session?.user?.id;if(!uid)throw Error('Entre na sua conta.');
 const channel=form.elements.channel.value,provider=form.elements.provider.value;
 if(!['email','whatsapp'].includes(channel))throw Error('Escolha o canal de atendimento.');
 const category=form.elements.category.value,subject=form.elements.subject.value.trim(),description=form.elements.description.value.trim();
 if(!Object.hasOwn(supportCategories,category)||subject.length<5||subject.length>120||description.length<20||description.length>3000)throw Error('Confira o assunto e a descrição.');
 const files=[...(form.elements.proof?.files||[])];
 if(files.length>3)throw Error('Anexe no máximo 3 arquivos.');
 for(const file of files)if(file.size>5242880||!['image/png','image/jpeg','image/webp','application/pdf'].includes(file.type))throw Error('Use imagem ou PDF de até 5 MB.');
 const name=state.profile?.display_name,handle=state.profile?.username;
 data.supportBusy=true;const button=form.querySelector('[type=submit]');if(button)button.disabled=true;
 let redirect=null;
 try{
  // The existing server RPC is the authority; the disabled radio is not the security boundary.
  let wa=null;
  if(channel==='whatsapp'){wa=await call('entre_premium_whatsapp');whatsappLink(wa,{body:''});}
  if(state.session?.user?.id!==uid)throw Error('Sua sessão mudou. Tente novamente.');
  const id=await call('entre_support_create',{_category:category==='payment'?'other':category,_subject:subject,_description:description});
  const paths=[];
  for(const file of files){
   const ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','application/pdf':'pdf'}[file.type];
   const path=uid+'/'+id+'/'+crypto.randomUUID()+'.'+ext;
   const response=await db.storage.from('entre-support-evidence').upload(path,file,{contentType:file.type,upsert:false});
   if(response.error)throw response.error;paths.push(path);
  }
  await call('entre_support_submit',{_ticket:Number(id),_paths:paths});
  if(state.session?.user?.id!==uid)return;
  const message=supportMessage({id,category,subject,description,name,handle,channel,files:files.length});
  if(channel==='whatsapp')wa=await call('entre_premium_whatsapp');
  if(state.session?.user?.id!==uid)return;
  const url=channel==='whatsapp'?whatsappLink(wa,message):emailLink(provider,message);
  supportHandoff={uid,id,channel,url,message};redirect=url;
  await loadSupport();
 }finally{data.supportBusy=false;if(button?.isConnected)button.disabled=false;}
 if(state.session?.user?.id!==uid||state.view!=='support'||!redirect)return;
 renderView();toast('Protocolo registrado. Revise e envie a mensagem.',false,'success');
 try{window.location.assign(redirect)}catch(_){/* The explicit link remains visible for browsers that block automatic handoff. */}
}
async function enter(view){
 if(view==='posts')await Promise.allSettled([loadPosts(),window.entreStories?.refresh?.()]);
 if(view==='premium'){await refreshPremium();await window.entreRecurring?.loadStatus?.();renderView();}
 if(view==='support'){await Promise.all([loadSupport(),refreshPremium()]);renderView();}
}
Object.assign(mod,{data,isPremium:premium,badge,loadBadges,refreshPremium,loadPosts,postsView,postAction,postForm,premiumView,checkout,verifyPremium,copyPix,unmountPaymentBrick,openPremiumWhatsapp,supportView,submitSupport,loadSupport,enter});
window.entreExtras=mod;
})();
