/* entre. posts, premium status and evidence-backed support. */
(function(){
'use strict';
const mod={};
const data={posts:[],postLoading:false,postBefore:null,postMore:false,premium:null,premiumIds:new Set(),support:[],supportBusy:false};
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
  const ids=data.posts.filter(p=>p.premium).map(p=>p.author_id);
  for(const id of ids)data.premiumIds.add(id);
  renderView();
 }catch(e){toast(infoError(e),true);}finally{data.postLoading=false;}
}
function postsView(){
 return heading('UMA COMUNIDADE DE VERDADE','Feed <em>da comunidade.</em>','Compartilhe ideias, conheça pontos de vista e converse com respeito. Publicações são públicas para usuários conectados.')+
 '<section class="posts-shell"><div class="posts-stream"><form id="postCreateForm" class="post-compose"><div class="post-compose-top">'+avatar(state.profile)+'<div><strong>O que você quer compartilhar?</strong><small>Seu espaço para começar uma conversa.</small></div>'+badge(state.profile)+'</div>'+
 '<textarea name="body" minlength="3" maxlength="900" placeholder="Uma ideia, uma pergunta ou algo que vale a pena contar…" required></textarea>'+
 '<div class="post-compose-footer"><small>Até 900 caracteres · respeite os outros.</small><button type="submit" class="ui-btn btn-dark btn-sm">Publicar '+ico('arrow',15)+'</button></div></form>'+
 (data.posts.length?data.posts.map(p=>{
  const person={id:p.author_id,display_name:p.author_name,avatar_path:p.author_avatar,avatar_uploaded_at:p.author_avatar_uploaded_at};
  const own=p.author_id===state.session?.user?.id;
  return '<article class="post-card '+(p.premium?'premium-surface':'')+'"><div class="post-card-head">'+avatar(person)+
  '<div class="post-author"><strong>'+esc(p.author_name||'Pessoa')+badge(person)+'</strong><small>'+new Date(p.created_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})+'</small></div>'+
  (own?'<button type="button" class="post-remove" data-action="postDelete" data-id="'+Number(p.id)+'" aria-label="Apagar meu post">'+ico('trash',16)+'</button>':'')+'</div>'+
  '<p class="post-body">'+esc(p.body)+'</p><div class="post-interactions"><button type="button" class="'+(p.liked?'liked':'')+'" data-action="postLike" data-id="'+Number(p.id)+'">'+ico('heart',17)+' '+Number(p.likes||0)+' curtidas</button><span>'+ico('chat',15)+' '+(p.comments?.length||0)+' comentários recentes</span></div>'+
  '<div class="post-comments">'+(Array.isArray(p.comments)?p.comments:[]).map(c=>'<div class="post-comment"><strong>'+esc(c.name)+ (c.premium?'<span class="verified-mark">'+ico('check',11)+'</span>':'')+'</strong><p>'+esc(c.body)+'</p></div>').join('')+
  '<form class="post-comment-form" data-post="'+Number(p.id)+'"><input name="body" required minlength="2" maxlength="420" placeholder="Escreva um comentário…"><button type="submit" aria-label="Comentar">'+ico('send',18)+'</button></form></div></article>';
 }).join(''):'<div class="social-empty"><h3>A comunidade está começando.</h3><p>Seu post pode ser o primeiro. Faça uma pergunta ou compartilhe uma ideia.</p></div>')+
 (data.postMore?'<button class="ui-btn btn-outline" data-action="postsMore">Carregar mais posts</button>':'')+'</div>'+
 '<aside class="posts-aside"><strong>Um espaço para conversas reais</strong><p>Não compartilhe telefone, dados pessoais, endereços nem informações íntimas. Respeito e privacidade são essenciais.</p><button type="button" data-action="nav" data-view="support" class="ui-btn btn-outline btn-sm">Reportar um problema</button></aside></section>';
}
async function postAction(a,btn){
 const id=Number(btn.dataset.id);
 if(a==='postsMore'){await loadPosts(true);return true;}
 if(a==='postDelete'){
  if(!confirm('Apagar esta publicação e seus comentários?'))return true;
  await call('entre_post_delete',{_post:id});await loadPosts();toast('Post apagado.');return true;
 }
 if(a==='postLike'){await call('entre_post_like',{_post:id});await loadPosts();return true;}
 return false;
}
async function postForm(form){
 const body=form.elements.body?.value?.trim();
 if(form.id==='postCreateForm'){
  if(!body||body.length<3||body.length>900)throw Error('Post precisa ter de 3 a 900 caracteres.');
  await call('entre_post_create',{_body:body});await loadPosts();toast('Seu post foi publicado.');return true;
 }
 if(form.classList.contains('post-comment-form')){
  if(!body||body.length<2||body.length>420)throw Error('Comentário precisa ter de 2 a 420 caracteres.');
  await call('entre_post_comment',{_post:Number(form.dataset.post),_body:body});
  await loadPosts();toast('Comentário publicado.');return true;
 }
 return false;
}
const price=()=>Number.isInteger(data.premium?.price_cents)&&data.premium.price_cents>0
 ?(data.premium.price_cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):null;
function premiumView(){
 const active=data.premium?.active,enabled=data.premium?.checkout_enabled&&price();
 return heading('ENTRE. PREMIUM','Uma experiência <em>mais sua.</em>','Conheça uma nova forma de personalizar seus encontros.')+
 '<section class="premium-checkout"><div class="premium-pitch"><span class="premium-label">✧ ENTRE. PREMIUM</span><h3>Seja notado.<br><em>Conecte-se do seu jeito.</em></h3><p>Personalize quem você encontra, destaque seu perfil e tenha um canal direto de suporte.</p>'+
 '<div class="premium-perks"><div>'+ico('check',19)+' <span>Buscar exclusivamente homens, mulheres ou pessoas não binárias no Ao vivo</span></div>'+
 '<div>'+ico('star',19)+' <span>Perfil com brilho suave e selo Premium em todo o site</span></div>'+
 '<div>'+ico('chat',19)+' <span>Atendimento prioritário pelo WhatsApp</span></div></div></div>'+
 '<div class="premium-checkout-card"><span>ASSINATURA RECORRENTE</span><h3>'+ (price()||'Valor a definir')+'</h3><p>'+(price()?'Cobrança mensal, administrada pelo Mercado Pago.':'O valor será definido no painel antes da abertura das assinaturas.')+'</p>'+
 (active?'<div class="premium-confirmed">'+ico('check',19)+' Sua assinatura está ativa.</div>'+
 '<button type="button" class="ui-btn btn-dark premium-whatsapp" data-action="premiumWhatsapp">'+ico('chat',18)+' WhatsApp prioritário</button>'+
 (data.premium.paid_until?'<small>Válida até '+new Date(data.premium.paid_until).toLocaleDateString('pt-BR')+'</small>':''):
 '<button type="button" class="ui-btn btn-dark premium-buy" data-action="premiumCheckout" '+(enabled?'':'disabled')+'>'+ico('shield',17)+' '+(enabled?'Continuar no Mercado Pago':'Aguardando ativação do checkout')+'</button>')+
 '<small>Pagamento processado pelo Mercado Pago. Nenhum dado do cartão é armazenado neste site. Recursos pagos só são liberados após confirmação do pagamento.</small></div></section>';
}
async function openPremiumWhatsapp(){
 if(!data.premium?.active)throw Error('O atendimento prioritário exige Premium ativo.');
 const url=await call('entre_premium_whatsapp');
 if(typeof url!=='string'||!/^https:\/\/wa\.me\/[0-9]{10,15}(?:\?|$)/.test(url))throw Error('Link de suporte não disponível.');
 window.location.assign(url);
}
async function checkout(){
 if(data.premium?.active){toast('Você já é Premium.');return;}
 if(!data.premium?.checkout_enabled||!price()){toast('O checkout ainda está sendo configurado pela administração.',true);return;}
 const {data:response,error}=await db.functions.invoke('entre-premium-checkout',{body:{}});
 if(error)throw error;
 const url=response?.init_point;
 if(typeof url!=='string'||!/^https:\/\/(?:www\.)?mercadopago\.com(?:\.br)?\//.test(url))throw Error('Checkout indisponível. Nenhuma cobrança foi iniciada.');
 window.location.assign(url);
}
function supportView(){
 return heading('CUIDAR DO ENTRE.','Central de <em>suporte.</em>','Relate problemas do site ou da sua conta. Imagens são opcionais e ajudam na análise, mas nunca são obrigatórias.')+
 '<div class="support-layout"><form class="support-ticket-form" id="supportTicketForm">'+
 '<div class="field"><label for="supportCategory">O que aconteceu?</label><select name="category" id="supportCategory" required><option value="bug">Erro no site ou aplicativo</option><option value="account">Problema na conta</option><option value="security">Segurança e privacidade</option><option value="other">Outra dificuldade</option></select></div>'+
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
 if(view==='premium')await refreshPremium();
 if(view==='support'){await loadSupport();renderView();}
}
Object.assign(mod,{data,isPremium:premium,badge,loadBadges,refreshPremium,loadPosts,postsView,postAction,postForm,premiumView,checkout,openPremiumWhatsapp,supportView,submitSupport,loadSupport,enter});
window.entreExtras=mod;
})();
