const createClient = window.supabase?.createClient;
if (!createClient) {
  document.getElementById('app').innerHTML = '<main class="startup" style="display:flex;flex-direction:column;padding:30px;text-align:center"><h1 style="font-size:40px;margin-bottom:12px">entre.</h1><p style="font:16px system-ui">Falha ao carregar a conexão. Confira a internet e atualize a página.</p><button onclick="location.reload()" style="padding:12px 25px;border-radius:20px;border:0;background:#f17e60">Tentar novamente</button></main>';
  throw new Error('Supabase browser bundle is not available');
}

const SUPABASE_URL = 'https://trrakyybnvxpdhxwgjrz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_OJ4wBPPNVBBcrcNl12yonw_hRSlMKsZ'; // public, restricted by database RLS
const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } });
const app = document.getElementById('app');
const iconPaths = {
 arrow:'<path d="M5 12h14m-7-7 7 7-7 7"/>',back:'<path d="M19 12H5m7 7-7-7 7-7"/>',home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
 bolt:'<path d="m13 2-9 11h7l-1 9 10-12h-7z"/>',heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8l8.8 8.5 8.8-8.5a5.5 5.5 0 0 0 0-7.8z"/>',chat:'<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4 8.5 8.5 0 0 1 8.5-8.5A8.5 8.5 0 0 1 21 11.5z"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',settings:'<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="m19.5 12 1.5-1.3-2-3.5-1.9.6a7 7 0 0 0-1.6-1L15 4h-4l-.5 2.8a7 7 0 0 0-1.6 1L7 7.2l-2 3.5L6.5 12 5 13.3l2 3.5 1.9-.6a7 7 0 0 0 1.6 1L11 20h4l.5-2.8a7 7 0 0 0 1.6-1l1.9.6 2-3.5z"/>',
 exit:'<path d="M10 17l5-5-5-5m5 5H3m9-9h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',send:'<path d="m22 2-7 20-4-9-9-4zM22 2 11 13"/>',close:'<path d="M18 6 6 18M6 6l12 12"/>',check:'<path d="m4 12 5 5L20 6"/>',chevron:'<path d="m9 18 6-6-6-6"/>',spark:'<path d="m12 2 2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',trash:'<path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6M10 10v7m4-7v7"/>',edit:'<path d="m4 20 5-.8L20 8.2 15.8 4 4.8 15zM13 6.8l4.2 4.2"/>',volume:'<path d="M4 9h4l5-4v14l-5-4H4zM17 9a4 4 0 0 1 0 6"/>',star:'<path d="m12 2 3 6.7 7.3.7-5.5 4.8 1.7 7.2L12 17.5l-6.5 3.9 1.7-7.2-5.5-4.8L9 8.7z"/>'
};
const ico=(name, size=20)=>`<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]||iconPaths.spark}</svg>`;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nameOf=v=>String(v||'').trim().split(' ')[0]||'alguém';
const genders={woman:'Mulher',man:'Homem',nonbinary:'Não binário',any:'Qualquer pessoa'};
const initials=name=>String(name||'?').trim().split(/\s+/).slice(0,2).map(n=>[...n][0]).join('').toUpperCase();
const colorFor=id=>['#eac8aa','#c9c1ef','#bed6c1','#e8c0c9','#dbdfac'][([...String(id||'')].reduce((n,c)=>n+c.charCodeAt(0),0))%5];
const avatar=(person,size='')=>{
 const id=String(person?.id||'');
 const attrs=' data-avatar-id="'+esc(id)+'"';
 const url=avatarFresh(person)?state.avatarUrls[person.avatar_path]:null;
 if(url?.url&&(url.local||url.expires>Date.now()))
  return '<span class="avatar '+esc(size)+'"'+attrs+'><img loading="eager" decoding="async" referrerpolicy="no-referrer" src="'+esc(url.url)+'" alt="Foto de '+esc(person?.display_name||'perfil')+'"></span>';
 return '<span class="avatar '+esc(size)+'"'+attrs+' style="background:'+colorFor(person?.id)+'">'+esc(initials(person?.display_name))+'</span>';
};
const brand=()=>`<a href="#" class="brand" data-action="logo" aria-label="entre. início"><span class="brand-glyph"><i></i><i></i></span><span>entre<span class="dot">.</span></span></a>`;
const fmtTime=date=>new Date(date).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
const fmtDate=date=>new Date(date).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
let toastTimer;
function toast(message,error=false){const el=document.getElementById('toast');el.textContent=message;el.style.background=error?'#a64c40':'#272a25';el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),4700)}
const state={mode:'landing',view:'home',isAdmin:false,siteSettings:null,session:null,profile:null,avatarUrls:{},avatarPendingFile:null,avatarPreviewUrl:null,pendingCompressedAvatarUrl:null,profileChannel:null,pairs:[],pair:null,peer:null,messages:[],searching:false,preference:'any',activeTab:'all',busy:false,roomReady:false,channel:null,searchLoop:null,timerLoop:null,closedOnce:null,modal:null,signup:null,motionOff:localStorage.getItem('entre.motionOff')==='1',notice:null,suspension:null};
function applyMotion(){document.body.classList.toggle('motion-off',state.motionOff)}
function infoError(e){
 const m=String(e?.message||e||'Não foi possível concluir. Tente novamente.');
 if(/provider is not enabled|unsupported provider|provider_disabled/i.test(m))return 'O Google ainda não está habilitado em Supabase → Authentication → Providers → Google. Alterar apenas as URLs não ativa o provedor.';
 if(/redirect_uri_mismatch|redirect.*not.*allowed|redirect.*not.*permitted|redirect.*allow.list/i.test(m))return 'O endereço de retorno do entre. não está autorizado. Confira https://appswebb.github.io/testesite/ nas Redirect URLs do Supabase e a URL de callback do Supabase no Google Cloud.';
 if(/invalid_client|unauthorized_client|oauth.*client|invalid.*client/i.test(m))return 'As credenciais OAuth do Google não foram aceitas. Confira o Client ID e Client Secret cadastrados no Supabase.';
 if(/access_denied|consent.*denied|permission.*denied/i.test(m))return 'A autenticação com Google foi cancelada ou não foi autorizada.';
 if(/rate limit/i.test(m))return 'Muitas tentativas. Aguarde um pouco.';
 if(/Failed to fetch|NetworkError|network request failed/i.test(m))return 'Sem conexão com o serviço de login. Confira sua internet e tente de novo.';
 return m;
}
function landing(){const scrollWords=Array(2).fill('<span>UMA CONVERSA DE CADA VEZ</span><b>✳</b><span>05:00 MINUTOS</span><b>✳</b><span>SE OS DOIS QUISEREM, CONTINUA</span><b>✳</b>').join('');return `
<header class="home-header"><div class="home-bar wrap">${brand()}<nav aria-label="Navegação"><a href="#como-funciona">Como funciona</a><a href="#experiencia">A experiência</a><a href="#manifesto">Nossa ideia</a></nav><div class="home-actions"><button class="ui-btn btn-quiet" data-action="login">Entrar</button><button class="ui-btn btn-dark btn-sm" data-action="signup">Criar conta ${ico('arrow',16)}</button></div></div></header>
<main>${state.siteSettings?.announcement?`<div class="platform-notice landing-platform-notice">${esc(state.siteSettings.announcement)}</div>`:""}<section class="landing-hero"><div class="wrap hero-grid"><div class="hero-copy scene-enter"><span class="hero-kicker"><span class="spark">✳</span> Um jeito diferente de conhecer alguém</span><h1 class="hero-title">Pode ser<br>um simples <em>oi.</em><br>Pode ser tudo.</h1><p class="hero-text">Uma pessoa de cada vez. Cinco minutos de conversa ao vivo. Se a conexão for recíproca, vocês decidem continuar.</p><div class="hero-cta"><button class="ui-btn btn-dark" data-action="signup">Encontrar alguém ${ico('arrow',19)}</button><button class="ui-btn btn-quiet" data-action="how">Como funciona ${ico('chevron',14)}</button></div><div class="hero-foot"><span class="live-dot"></span> Sem deslizar perfis. Sem colecionar matches. Apenas conversa.</div></div><div class="hero-art" aria-label="Duas pessoas se conhecendo em cinco minutos"><div class="orbit"></div><div class="portrait portrait-a"><div class="portrait-inner"><span class="face"></span></div><div class="portrait-label">A outra pessoa <small>✷ online</small></div></div><div class="portrait portrait-b"><div class="portrait-inner"><span class="face"></span></div><div class="portrait-label">Você <small>✷ online</small></div></div><div class="hero-time"><strong>05:00</strong><span>TEMPO PRA SENTIR</span></div><div class="hero-match-note">se for dos dois...<b>continua ♡</b></div></div></div><div class="scroll-hint">Role para descobrir ${ico('arrow',14)}</div></section>
<div class="ticker"><div class="ticker-track">${scrollWords}</div></div>
<section class="section-pad how-section" id="como-funciona"><div class="wrap"><div class="section-intro"><div><span class="eyebrow">01 / Sem complicação</span><h2 class="section-title">Conhecer gente,<br><i>não colecionar perfis.</i></h2></div><p>Um sistema pensado para voltar à coisa mais natural do mundo: duas pessoas conversando e descobrindo se há sintonia.</p></div><div class="steps-grid"><article class="step-card"><span class="step-number">01 — VOCÊ ESCOLHE</span><span class="step-icon">${ico('user',33)}</span><h3>Seu tipo de conexão.</h3><p>Crie seu perfil, defina com quem deseja conversar e entre na busca com um toque.</p></article><article class="step-card"><span class="step-number">02 — ACONTECE AGORA</span><span class="step-icon">${ico('clock',34)}</span><h3>Cinco minutos reais.</h3><p>A gente conecta vocês em um chat privado por cinco minutos. É uma pessoa por vez.</p></article><article class="step-card"><span class="step-number">03 — DECISÃO DOS DOIS</span><span class="step-icon">${ico('heart',34)}</span><h3>Deu match? Fica.</h3><p>Vocês dois precisam escolher continuar. Só então a conversa fica salva para depois.</p></article></div></div></section>
<section class="manifesto" id="experiencia"><div class="wrap manifesto-inner"><h2>Conexões de verdade não começam com um <em>algoritmo perfeito.</em><br>Começam com coragem.</h2><div class="caption"><strong>O que torna isso diferente</strong><p>Sem feed infinito, sem disputa por curtidas, sem grupos barulhentos. Um encontro novo, uma conversa reservada e a liberdade de escolher.</p><button class="ui-btn btn-coral" data-action="signup">Quero experimentar ${ico('arrow',18)}</button></div></div></section>
<section class="section-pad" id="manifesto"><div class="wrap" style="text-align:center;max-width:840px"><span class="eyebrow">UM CONVITE SIMPLES</span><h2 class="section-title">E se os próximos <i>5 minutos</i><br>mudassem alguma coisa?</h2><p style="color:var(--mute);font-size:15px;line-height:1.8;margin:20px auto 30px">Uma nova pessoa, uma história inesperada, uma conversa que pode continuar — mas só se os dois quiserem.</p><button class="ui-btn btn-dark" data-action="signup">Criar minha conta ${ico('arrow',18)}</button></div></section></main>
<footer class="home-footer"><div class="wrap footer-row">${brand()}<small>Feito para conversas que importam. © 2026 entre.</small><small>Experiência para maiores de 18 anos. <a href="./instalar.html">Instalar</a> · <a href="./dados.html">Retenção</a> · <a href="./privacidade.html">Privacidade</a> · <a href="./termos.html">Termos</a></small></div></footer>`}
const googleLogo="<svg class=\"google-mark\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path fill=\"#4285F4\" d=\"M21.35 12.2c0-.64-.06-1.25-.17-1.85H12v3.5h5.25a4.49 4.49 0 0 1-1.95 2.95v2.45h3.16c1.85-1.71 2.89-4.22 2.89-7.05Z\"/><path fill=\"#34A853\" d=\"M12 21.72c2.64 0 4.86-.87 6.48-2.47l-3.16-2.45c-.87.58-1.98.93-3.32.93-2.56 0-4.72-1.73-5.49-4.06H3.25v2.55A9.78 9.78 0 0 0 12 21.72Z\"/><path fill=\"#FBBC05\" d=\"M6.51 13.67a5.91 5.91 0 0 1 0-3.34V7.78H3.25a9.8 9.8 0 0 0 0 8.44l3.26-2.55Z\"/><path fill=\"#EA4335\" d=\"M12 6.27c1.44 0 2.73.5 3.75 1.47l2.81-2.82A9.58 9.58 0 0 0 12 2.28a9.78 9.78 0 0 0-8.75 5.5l3.26 2.55C7.28 8 9.44 6.27 12 6.27Z\"/></svg>";

// All original uploads are downscaled and stripped of metadata in the browser.
// Only a small 160px WebP is ever sent to Supabase (maximum 40 KiB).
const AVATAR_BUCKET='entre-avatars';
const AVATAR_MAX=40960;

// Image editor used before an avatar upload. All edits happen locally on the device.
// The exported image is a tiny metadata-free WebP, never the camera original.
let activeImageCrop=null;
function closeImageCrop(){
 const c=activeImageCrop;
 if(!c)return;
 activeImageCrop=null;
 if(c.sourceUrl)URL.revokeObjectURL(c.sourceUrl);
 c.dialog?.remove();
 document.body.classList.remove('crop-dialog-open');
}
function cropMath(c){
 const side=c.canvas.width,base=Math.max(side/c.image.naturalWidth,side/c.image.naturalHeight);
 const w=c.image.naturalWidth*base*c.zoom,h=c.image.naturalHeight*base*c.zoom;
 c.dx=Math.max(-(w-side)/2,Math.min((w-side)/2,c.dx));
 c.dy=Math.max(-(h-side)/2,Math.min((h-side)/2,c.dy));
 return {side,w,h,x:(side-w)/2+c.dx,y:(side-h)/2+c.dy};
}
function drawImageCrop(){
 const c=activeImageCrop;if(!c)return;
 const p=cropMath(c),ctx=c.canvas.getContext('2d',{alpha:false});
 ctx.fillStyle='#111e17';ctx.fillRect(0,0,p.side,p.side);
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(c.image,p.x,p.y,p.w,p.h);
 const level=c.dialog.querySelector('#cropZoomNumber');
 if(level)level.textContent=Math.round(c.zoom*100)+'%';
}
function updateImageCropZoom(zoom){
 const c=activeImageCrop;if(!c)return;
 c.zoom=Math.max(1,Math.min(3.5,zoom));
 c.dialog.querySelector('#cropZoom').value=String(c.zoom);
 drawImageCrop();
}
async function compressCroppedImage(c){
 const source=c.canvas;
 for(const size of [256,224,192,160]){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)throw Error('Seu navegador não conseguiu preparar o recorte.');
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(source,0,0,source.width,source.height,0,0,size,size);
  for(const quality of [0.78,0.70,0.60]){
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));
   if(!blob||blob.type!=='image/webp')throw Error('Não foi possível converter esta imagem para WebP.');
   if(blob.size<=AVATAR_MAX)return blob;
  }
 }
 throw Error('Não foi possível compactar a imagem para o limite de 40 KB.');
}
async function confirmImageCrop(){
 const c=activeImageCrop;
 if(!c||c.saving)return;
 c.saving=true;
 const button=c.dialog.querySelector('#cropApply');
 if(button){button.disabled=true;button.textContent='Preparando foto...';}
 try{
  const cropped=await compressCroppedImage(c);
  if(activeImageCrop!==c)return;
  clearAvatarDraft();
  state.avatarPendingFile=cropped;
  state.avatarIsCropped=true;
  state.avatarPreviewUrl=URL.createObjectURL(cropped);
  const preview=document.querySelector('.avatar-photo-preview');
  if(preview)preview.innerHTML='<img src="'+esc(state.avatarPreviewUrl)+'" alt="Foto recortada, pronta para salvar">';
  closeImageCrop();
  toast('Recorte pronto! Salve o perfil para atualizar sua foto.');
 }catch(error){
  toast(infoError(error),true);
  c.saving=false;
  if(button){button.disabled=false;button.textContent='Aplicar recorte';}
 }
}
async function openImageCrop(file,options={}){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))
  throw Error('Escolha uma imagem JPG, PNG ou WebP.');
 if(file.size>12*1024*1024)throw Error('A imagem original precisa ter até 12 MB.');
 closeImageCrop();
 const sourceUrl=URL.createObjectURL(file);
 const image=new Image();
 try{image.src=sourceUrl;await image.decode();}
 catch(e){URL.revokeObjectURL(sourceUrl);throw Error('Não foi possível abrir essa imagem. Selecione outra foto.');}
 if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>75000000){
  URL.revokeObjectURL(sourceUrl);
  throw Error('A imagem é grande demais ou está corrompida.');
 }
 const dialog=document.createElement('div');dialog.className='crop-dialog-overlay';
 dialog.id='avatarCropDialog';
 const title=esc(options.title||'Ajustar sua foto');
 dialog.innerHTML='<section class="crop-dialog" role="dialog" aria-modal="true" aria-labelledby="cropTitle">'
  +'<div class="crop-head"><span class="crop-kicker">FOTO DE PERFIL</span><h2 id="cropTitle">'+title+'</h2>'
  +'<p>Arraste para reposicionar. Use dois dedos ou a barra para aproximar e afastar.</p></div>'
  +'<div class="crop-stage"><canvas class="crop-canvas" id="cropCanvas" width="512" height="512" tabindex="0" aria-label="Área para arrastar e posicionar o recorte"></canvas><div class="crop-mask" aria-hidden="true"></div></div>'
  +'<div class="crop-zoom-control"><label for="cropZoom"><span>Zoom</span><output id="cropZoomNumber">100%</output></label>'
  +'<div class="crop-zoom-row"><span aria-hidden="true">−</span><input id="cropZoom" type="range" min="1" max="3.5" step="0.01" value="1" aria-label="Aproximar ou afastar foto"><span aria-hidden="true">+</span></div></div>'
  +'<p class="crop-caption">A foto final fica quadrada e aparece circular no perfil. Otimizada para até 40 KB, sem salvar a imagem original.</p>'
  +'<div class="crop-footer"><button type="button" class="crop-cancel" id="cropCancel">Cancelar</button><button type="button" class="crop-apply" id="cropApply">Aplicar recorte</button></div></section>';
 document.body.append(dialog);
 document.body.classList.add('crop-dialog-open');
 const canvas=dialog.querySelector('#cropCanvas');
 const c={dialog,canvas,image,sourceUrl,zoom:1,dx:0,dy:0,pointers:new Map(),lastPinch:null,saving:false};
 activeImageCrop=c;
 const position=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*512/r.width,y:(e.clientY-r.top)*512/r.height};};
 const distance=()=>{
  const pts=[...c.pointers.values()];
  return pts.length<2?null:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
 };
 canvas.addEventListener('pointerdown',e=>{
  e.preventDefault();canvas.setPointerCapture(e.pointerId);
  c.pointers.set(e.pointerId,position(e));
  c.lastPinch=distance();
 });
 canvas.addEventListener('pointermove',e=>{
  if(!c.pointers.has(e.pointerId))return;
  e.preventDefault();
  const before=c.pointers.get(e.pointerId),after=position(e);
  c.pointers.set(e.pointerId,after);
  if(c.pointers.size===1){c.dx+=after.x-before.x;c.dy+=after.y-before.y;drawImageCrop();}
  else if(c.pointers.size>=2){
   const next=distance();
   if(next&&c.lastPinch)updateImageCropZoom(c.zoom*next/c.lastPinch);
   c.lastPinch=next;
  }
 });
 const pointerEnd=e=>{c.pointers.delete(e.pointerId);c.lastPinch=distance();};
 canvas.addEventListener('pointerup',pointerEnd);
 canvas.addEventListener('pointercancel',pointerEnd);
 canvas.addEventListener('lostpointercapture',pointerEnd);
 canvas.addEventListener('wheel',e=>{e.preventDefault();updateImageCropZoom(c.zoom*(e.deltaY<0?1.08:0.92));},{passive:false});
 canvas.addEventListener('keydown',e=>{
  const step=e.shiftKey?24:8;
  if(e.key==='ArrowLeft')c.dx-=step;
  else if(e.key==='ArrowRight')c.dx+=step;
  else if(e.key==='ArrowUp')c.dy-=step;
  else if(e.key==='ArrowDown')c.dy+=step;
  else return;
  e.preventDefault();drawImageCrop();
 });
 dialog.querySelector('#cropZoom').addEventListener('input',e=>updateImageCropZoom(Number(e.target.value)));
 dialog.querySelector('#cropCancel').addEventListener('click',closeImageCrop);
 dialog.querySelector('#cropApply').addEventListener('click',confirmImageCrop);
 dialog.addEventListener('click',e=>{if(e.target===dialog)closeImageCrop();});
 drawImageCrop();
 dialog.querySelector('#cropApply').focus();
}

const AVATAR_LIFETIME=365*24*60*60*1000; // Local preview only; uploaded profile photos do not expire.

function refreshAvatarElements(person){
 if(!person?.id)return;
 document.querySelectorAll('[data-avatar-id]').forEach(node=>{
  if(node.dataset.avatarId!==person.id)return;
  const size=[...node.classList].filter(c=>c!=='avatar').join(' ');
  node.outerHTML=avatar(person,size);
 });
 if(person.id===state.session?.user?.id&&!state.avatarPendingFile){
  const preview=document.querySelector('.avatar-photo-preview');
  if(preview){
   const url=avatarFresh(person)?state.avatarUrls[person.avatar_path]?.url:null;
   preview.innerHTML=url?'<img src="'+esc(url)+'" alt="Sua foto de perfil atual">':'<span aria-hidden="true">'+esc(initials(person.display_name))+'</span>';
  }
 }
}
function installAvatarRealtime(){
 if(!state.session?.user?.id||state.profileChannel||typeof db.channel!=='function')return;
 const uid=state.session.user.id;
 state.profileChannel=db.channel('entre_avatar_updates_'+uid)
 .on('postgres_changes',{event:'UPDATE',schema:'public',table:'entre_profiles'},async message=>{
  const p=message?.new;
  if(!p?.id||maintenanceIsActive())return;
  const isOwn=p.id===uid;
  const isPeer=state.peer?.id===p.id||Object.values(state.pairsProfiles||{}).some(row=>row?.id===p.id);
  if(!isOwn&&!isPeer)return;
  if(isOwn){
   if(!state.profile)return;
   state.profile={...state.profile,avatar_path:p.avatar_path,avatar_uploaded_at:p.avatar_uploaded_at};
  }else{
   if(state.peer?.id===p.id)state.peer={...state.peer,avatar_path:p.avatar_path,avatar_uploaded_at:p.avatar_uploaded_at};
   for(const pairId of Object.keys(state.pairsProfiles||{})){
    if(state.pairsProfiles[pairId]?.id===p.id)
     state.pairsProfiles[pairId]={...state.pairsProfiles[pairId],avatar_path:p.avatar_path,avatar_uploaded_at:p.avatar_uploaded_at};
   }
  }
  if(p.avatar_path)await signAvatar(p,true);
  refreshAvatarElements(p);
 })
 .subscribe();
}

async function refreshActiveAvatars(){
 if(!state.session||maintenanceIsActive()||document.hidden)return;
 const all=[state.profile,state.peer,...Object.values(state.pairsProfiles||{})];
 const seen=new Set();
 await Promise.all(all.filter(p=>{
  if(!avatarFresh(p)||seen.has(p.avatar_path))return false;
  seen.add(p.avatar_path);
  return true;
 }).map(p=>signAvatar(p)));
}
window.addEventListener('visibilitychange',()=>{
 if(!document.hidden)void refreshActiveAvatars();
});
// Renew private signed links before expiry, without continuously polling while hidden.
setInterval(()=>{void refreshActiveAvatars()},90000);

function commitLocalAvatar(path){
 if(!path||!state.pendingCompressedAvatarUrl)return;
 const existing=state.avatarUrls[path];
 if(existing?.local&&existing.url!==state.pendingCompressedAvatarUrl)URL.revokeObjectURL(existing.url);
 state.avatarUrls[path]={url:state.pendingCompressedAvatarUrl,expires:Date.now()+AVATAR_LIFETIME,local:true};
 state.pendingCompressedAvatarUrl=null;
}

function avatarFresh(p){return Boolean(p?.avatar_path); /* Permanent until replaced or removed */}
async function signAvatar(p,force=false){
 if(!avatarFresh(p)||!p.avatar_path||maintenanceIsActive())return false;
 const path=p.avatar_path;
 const existing=state.avatarUrls[path];
 if(!force&&existing&&!existing.local&&existing.expires>Date.now()+100000)return true;
 try{
  // Signed links are short lived. The bucket itself remains private.
  const {data,error}=await db.storage.from(AVATAR_BUCKET).createSignedUrl(path,300);
  if(error)throw error;
  if(!data?.signedUrl)throw Error('O Storage não retornou a foto.');
  state.avatarUrls[path]={url:data.signedUrl,expires:Date.now()+260000,local:false};
  refreshAvatarElements(p);
  if(existing?.local)requestAnimationFrame(()=>URL.revokeObjectURL(existing.url));
  return true;
 }catch(e){
  console.warn('Falha ao abrir foto privada:',e?.message||e);
  // The freshly compressed image still appears immediately in the owner's UI.
  return Boolean(existing?.url);
 }
}
function avatarUploader(p){
 const url=state.avatarPreviewUrl||(avatarFresh(p)?state.avatarUrls[p?.avatar_path]?.url:'');
 const label=p?.avatar_path?'Trocar foto':'Adicionar foto';
 return '<div class="avatar-uploader"><div class="avatar-photo-preview">'
 +(url?'<img src="'+esc(url)+'" alt="Prévia da foto de perfil">':'<span aria-hidden="true">'+esc(initials(p?.display_name||'Eu'))+'</span>')
 +'</div><div class="avatar-uploader-info"><strong>'+label+'</strong><p>Sua foto fica salva até você trocar ou remover. Recorte com zoom e WebP de até 40 KB, sem metadados.</p>'
 +'<label class="avatar-select" for="avatarFile">'+ico('edit',16)+' Escolher foto <input id="avatarFile" type="file" name="avatar_file" accept="image/jpeg,image/png,image/webp" aria-label="Escolher foto de perfil"></label>'
 +(p?.avatar_path?'<button type="button" class="avatar-remove" data-action="removeAvatar">'+ico('trash',15)+' Remover foto atual</button>':'')
 +'</div></div>';
}
async function compressAvatar(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))
  throw Error('Escolha uma foto JPG, PNG ou WebP.');
 if(file.size>12*1024*1024)throw Error('A foto original precisa ter até 12 MB.');
 let bitmap=null,img=null,tmp=null;
 try{
  if('createImageBitmap' in window){
   bitmap=await createImageBitmap(file);
  }else{
   tmp=URL.createObjectURL(file);
   img=new Image();
   img.src=tmp;
   await img.decode();
  }
  const width=bitmap?.width||img?.naturalWidth,height=bitmap?.height||img?.naturalHeight;
  if(!width||!height||width*height>75000000)throw Error('Essa foto é grande demais ou está corrompida.');
  const canvas=document.createElement('canvas');
  let last;
  for(const target of [160,144,128,112]){
   canvas.width=canvas.height=target;
   const ctx=canvas.getContext('2d',{alpha:false});
   if(!ctx)throw Error('Não foi possível preparar a foto neste aparelho.');
   const side=Math.min(width,height),x=(width-side)/2,y=(height-side)/2;
   ctx.drawImage(bitmap||img,x,y,side,side,0,0,target,target);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',target>=144?.36:.25));
   if(!blob||blob.type!=='image/webp')throw Error('Seu navegador não conseguiu comprimir a foto em WebP.');
   last=blob;
   if(blob.size<=AVATAR_MAX)break;
  }
  if(!last||last.size>AVATAR_MAX)throw Error('Não conseguimos reduzir esta imagem para 40 KB.');
  return last;
 }finally{
  if(bitmap)bitmap.close();
  if(tmp)URL.revokeObjectURL(tmp);
 }
}
async function uploadAvatarFile(file){
 if(!state.session?.user?.id)throw Error('Faça login antes de adicionar a foto.');
 const blob=state.avatarIsCropped&&file.type==='image/webp'&&file.size<=AVATAR_MAX?file:await compressAvatar(file);
 const path=state.session.user.id+'/'+crypto.randomUUID()+'.webp';
 const {error}=await db.storage.from(AVATAR_BUCKET).upload(path,blob,{contentType:'image/webp',upsert:false,cacheControl:'60'});
 if(error)throw error;
 if(state.pendingCompressedAvatarUrl)URL.revokeObjectURL(state.pendingCompressedAvatarUrl);
 state.pendingCompressedAvatarUrl=URL.createObjectURL(blob);
 return path;
}
function clearAvatarDraft(){
 if(state.avatarPreviewUrl){URL.revokeObjectURL(state.avatarPreviewUrl);state.avatarPreviewUrl=null;}
 if(state.pendingCompressedAvatarUrl){URL.revokeObjectURL(state.pendingCompressedAvatarUrl);state.pendingCompressedAvatarUrl=null;}
 state.avatarPendingFile=null;
 state.avatarIsCropped=false;
}
async function removeAvatar(){
 if(!state.profile?.avatar_path)return;
 if(!confirm('Remover a foto do seu perfil?'))return;
 const path=state.profile.avatar_path;
 const {data,error}=await db.from('entre_profiles').update({avatar_path:null,updated_at:new Date().toISOString()})
 .eq('id',state.session.user.id).select('*').single();
 if(error){toast(infoError(error),true);return;}
 state.profile=data;
 delete state.avatarUrls[path];
 clearAvatarDraft();
 render();
 // Best-effort physical delete; scheduled cleanup remains the safety net.
 const removed=await db.storage.from(AVATAR_BUCKET).remove([path]);
 if(removed.error)console.warn('Avatar will be purged by retention job:',removed.error.message);
 toast('Foto removida do perfil.');
}

function authView(){const signup=state.mode==='signup';const onboard=state.mode==='onboard';const reg=onboard;const data=state.signup||{};return `<div class="auth-shell"><aside class="auth-visual">${brand()}<div><span class="eyebrow" style="color:#e9b49f">SEU PRÓXIMO OLÁ COMEÇA AQUI</span><h2>É sobre a pessoa <em>do outro lado.</em></h2></div><p class="legal-note">Uma conversa de cada vez. Uma escolha que é dos dois.</p><div class="auth-orbit"></div></aside><main class="auth-main"><div class="auth-card"><div class="hidden-mobile-brand">${brand()}</div>${onboard?'':`<button class="auth-back" data-action="landing">${ico('back',17)} Voltar ao início</button>`}<h1>${onboard?'Complete seu <em>perfil.</em>':signup?'Seu próximo <em>olá.</em>':'Bom ter você <em>de volta.</em>'}</h1><p class="auth-sub">${onboard?'Só faltam alguns detalhes para começar a conhecer alguém.':signup?'Entre com sua conta Google para criar seu espaço, sem senha nova.':'Use sua conta Google para continuar de onde parou.'}</p><div id="form-error" class="hidden form-error"></div><div id="form-success" class="hidden form-success"></div>
${onboard?`<div class="google-verified">${googleLogo}<span>Conta Google conectada</span></div>`:``}${onboard&&state.isAdmin?`<a class="admin-entry" href="./admin/">${ico("shield",16)} Acessar o painel administrativo ${ico("arrow",16)}</a>`:""}<form id="authForm" data-form="${onboard?'profileSetup':signup?'signup':'login'}">${onboard?avatarUploader(state.profile):''}<div class="form-grid">${reg?`<div class="field full"><label for="display_name">Como podemos chamar você?</label><input id="display_name" name="display_name" maxlength="42" minlength="2" required autocomplete="nickname" placeholder="Seu nome" value="${esc(data.display_name||'')}"></div>`:''}${reg?`<div class="field"><label for="age">Sua idade</label><input id="age" name="age" type="number" min="18" max="100" required placeholder="18+" value="${esc(data.age||'')}"></div><div class="field"><label for="gender">Você se identifica como</label><select id="gender" name="gender" required>${options({woman:'Mulher',man:'Homem',nonbinary:'Não binário'},data.gender||'')}</select></div><div class="field full"><label for="preference">Com quem quer conversar?</label><select id="preference" name="preference" required>${options({any:'Qualquer pessoa',woman:'Mulheres',man:'Homens',nonbinary:'Pessoas não binárias'},data.preference||'any')}</select></div>`:''}</div>${reg?`<label class="checkbox-line"><input type="checkbox" name="adult" required><span>Confirmo que tenho 18 anos ou mais e concordo em participar de conversas respeitosas.</span></label>`:''}${onboard?`<button class="ui-btn btn-dark" type="submit" id="authSubmit">Finalizar meu perfil ${ico('arrow',18)}</button>`:`<div class="google-auth-section"><div class="google-auth-label"><span></span>ACESSO EXCLUSIVO VIA GOOGLE<span></span></div><button type="button" class="google-login" id="googleLogin" data-action="google" aria-label="Continuar com Google">${googleLogo}<b>Continuar com Google</b>${ico('arrow',18)}</button><p class="google-auth-caption">Você será direcionado ao Google para selecionar sua conta. Nós não solicitamos sua senha.</p></div>`}</form>${!onboard?`<div class="auth-switch">${signup?'Já tem conta?':'Ainda não tem conta?'} <button class="text-link" data-action="${signup?'login':'signup'}">${signup?'Entrar':'Criar conta'}</button></div>`:''}<p class="legal-note" style="margin-top:29px">Seus dados de perfil são usados para realizar conexões. Não compartilhe dados sensíveis nos chats. A idade é autodeclarada.</p></div></main></div>`}
function options(dict,selected){return Object.entries(dict).map(([key,value])=>`<option value="${key}" ${selected===key?'selected':''}>${esc(value)}</option>`).join('')}
const tabs=[['home','Início','home'],['connect','Conectar','bolt'],['conversations','Conversas','chat'],['profile','Meu perfil','user'],['settings','Ajustes','settings']];
function navButton(view,label,icon,mobile=false){return `<button data-action="nav" data-view="${view}" class="${mobile?'':'nav-item '}${state.view===view?'active':''}" title="${label}" ${state.view===view?'aria-current="page"':''}>${ico(icon)}<span>${label}</span>${!mobile&&view==='conversations'&&state.pairs.filter(p=>p.status==='connected').length?`<span class="count">${state.pairs.filter(p=>p.status==='connected').length}</span>`:''}</button>`}
function appLayout(){const label=tabs.find(t=>t[0]===state.view)?.[1]||'Início';return `<div class="app-shell"><aside class="sidebar"><div class="sidebar-top">${brand()}</div><div class="sidebar-title">Seu espaço</div><nav class="nav-stack" aria-label="Seções">${tabs.map(t=>navButton(...t)).join('')}</nav><div class="side-bottom">${state.isAdmin?`<a class="admin-entry" href="./admin/">${ico("shield",16)} Painel administrativo ${ico("arrow",15)}</a>`:""}<div class="side-status"><span class="live-dot"></span> Sua próxima conexão está por aqui.</div><div class="my-identity">${avatar(state.profile)}<div style="min-width:0;flex:1"><strong style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(state.profile.display_name)}</strong><small>Minha conta</small></div><button class="ui-btn btn-quiet" title="Sair" aria-label="Sair" data-action="logout">${ico('exit',17)}</button></div></div></aside><main class="app-main">${state.siteSettings?.announcement?`<div class="platform-notice">${esc(state.siteSettings.announcement)}</div>`:""}<div class="app-toolbar"><h1>${label}<span class="dot">.</span></h1><div class="toolbar-right"><span class="toolbar-pill"><span class="live-dot"></span> CONEXÕES REAIS</span>${avatar(state.profile)}</div></div><div id="view-content" class="scene-enter">${viewContent()}</div></main><nav class="mobile-nav" aria-label="Navegação principal">${tabs.map(t=>navButton(...t,true)).join('')}</nav></div>${state.modal?modalView():''}`}
function heading(kicker,title,detail=''){return `<div class="app-heading"><span class="eyebrow">${kicker}</span><h2>${title}</h2><p>${detail}</p></div>`}
function viewContent(){return ({home:dashboard,connect:connectView,conversations:conversationsView,profile:profileView,settings:settingsView}[state.view]||dashboard)()}
function dashboard(){const saved=state.pairs.filter(p=>p.status==='connected'||p.status==='closed');return `${heading('O INÍCIO DE ALGO NOVO',`Olá, ${esc(nameOf(state.profile.display_name))}<em>.</em>`,'Sua próxima conversa pode acontecer agora. Sem pressa, sem filtros infinitos — só a chance de conhecer alguém novo.')}
<div class="dash-grid"><div class="dash-hero"><span class="pill" style="color:#e6f1c3;border-color:#ffffff45"><span class="live-dot"></span> UMA CONVERSA POR VEZ</span><div><h3>O próximo <em>oi</em> pode virar uma história.</h3><p>Escolha com quem conversar. Conheça alguém durante 5 minutos. O resto é uma escolha dos dois.</p></div><button class="ui-btn btn-coral" data-action="nav" data-view="connect">Conectar agora ${ico('arrow')}</button></div><div class="insight-card"><span class="eyebrow">COMO VOCÊ SE CONECTA</span><div class="insight-dial"></div><div><h3>Uma chance real. <br>Nada de rolar sem fim.</h3><p>Match não é curtida. É quando duas pessoas querem continuar.</p></div></div></div><section class="sub-section"><div style="display:flex;justify-content:space-between;align-items:center"><h3>Suas conexões</h3><button class="ui-btn btn-quiet btn-sm" data-action="nav" data-view="conversations">Ver conversas ${ico('arrow',15)}</button></div>${saved.length?`<div class="convo-list">${saved.slice(0,3).map(renderConversationRow).join('')}</div>`:emptyConvos()}</section>`}
function emptyConvos(){return `<div class="empty-list">${ico('heart',31)}<h4>Você ainda não tem histórico de conversas.</h4><p>Quando os dois escolherem continuar, a conversa aparece aqui.</p><button class="ui-btn btn-outline btn-sm" data-action="nav" data-view="connect">Encontrar alguém ${ico('arrow',16)}</button></div>`}
function renderConversationRow(pair){const other=state.pairsProfiles?.[pair.id]||{display_name:'Sua conexão',id:pair.a===state.session?.user.id?pair.b:pair.a};return `<button class="convo-card" data-action="openpair" data-id="${pair.id}">${avatar(other)}<div><strong>${esc(other.display_name)}</strong><p>${pair.status==='connected'?'Conexão recíproca · conversa liberada':'Encontro encerrado · histórico de texto'}</p></div><div class="right">${ico('chevron')}</div></button>`}
function connectView(){if(state.pair&&['active','connected','closed'].includes(state.pair.status))return pairView();const waiting=state.searching;return `${heading('UMA PESSOA POR VEZ','Encontrar <em>alguém.</em>','Diga quem gostaria de conhecer e comece. Quando houver outra pessoa compatível na fila, a conversa abre automaticamente.')}
<div class="connect-panel"><div class="filter-bar"><h3>Quero conversar com</h3><div class="filters">${Object.entries({any:'Qualquer pessoa',woman:'Mulheres',man:'Homens',nonbinary:'Não binárias'}).map(([k,v])=>`<button ${waiting?'disabled':''} data-action="filter" data-value="${k}" class="chip ${state.preference===k?'active':''}">${v}</button>`).join('')}</div></div><div class="stage"><div class="stage-art ${waiting?'searching':''}"><div class="ring"></div><div class="ring"></div><div class="ring"></div><div class="center-icon">${waiting?'↝':'e'}</div></div><span class="searching-status"><span class="live-dot"></span> ${waiting?'BUSCANDO UMA CONEXÃO COMPATÍVEL':'PRONTO QUANDO VOCÊ ESTIVER'}</span><h2>${waiting?'Talvez seja agora.':'O próximo oi começa aqui.'}</h2><p>${waiting?'Procurando alguém que também queira se conectar. Mantenha esta aba aberta; nada é simulado.':'Você vai conversar com uma pessoa por cinco minutos. As mensagens de texto são guardadas no histórico, mesmo se o encontro terminar.'}</p><button class="ui-btn ${waiting?'btn-outline':'btn-dark'}" data-action="${waiting?'cancelsearch':'startsearch'}">${waiting?`${ico('close',18)} Cancelar busca`:`${ico('bolt',18)} Começar a conectar`}</button></div></div>`}
function pairView(){const pair=state.pair, peer=state.peer||{display_name:'Nova conexão',id:pair.a===state.session?.user.id?pair.b:pair.a},connected=pair.status==='connected',archived=pair.status==='closed',meIsA=pair.a===state.session.user.id,ownVote=meIsA?pair.a_wants:pair.b_wants,otherVote=meIsA?pair.b_wants:pair.a_wants;const canChat=!archived&&(connected||new Date(pair.expires_at).getTime()>Date.now());return `${heading(archived?'ENCONTRO ENCERRADO':connected?'A CONEXÃO É RECÍPROCA':'AGORA É ENTRE VOCÊS DOIS',connected?'Vocês escolheram <em>continuar.</em>':'A conversa <em>começou.</em>',connected?'O chat está liberado. Esta conexão agora fica nas suas conversas.':'Cinco minutos para se conhecer. Se os dois escolherem continuar, vocês poderão continuar conversando.')}
<div class="pair-card"><div class="pair-topbar"><div class="pair-partner">${avatar(peer)}<div><strong>${esc(peer.display_name)}${peer.age?`, ${peer.age}`:''}</strong><small>${archived?'Histórico · somente leitura':connected?'♡ Conexão salva':'Conversa de cinco minutos'}</small></div></div><div style="display:flex;gap:8px;align-items:center">${connected?`<span class="pill">${ico('check',15)} Match mútuo</span>`:`<span class="pair-timer timer-text">05:00</span>`}<button class="ui-btn btn-quiet" title="Denunciar pessoa" aria-label="Denunciar pessoa" data-action="report">${ico("flag",17)}</button><button class="ui-btn btn-quiet" title="Bloquear pessoa" aria-label="Bloquear pessoa" data-action="block">${ico('shield',17)}</button></div></div><div class="pair-banner">${ico('lock',15)} ${archived?'Histórico preservado · somente leitura':connected?'Só vocês podem acessar esta conversa.':'Conversa exclusiva entre duas pessoas · 5 minutos para decidir'}</div><div id="messageList" class="pair-messages" aria-label="Mensagens da conversa">${messagesMarkup(peer)}</div>${canChat?`<form id="messageForm" class="chat-form"><label class="sr-only" for="messageInput">Escreva sua mensagem</label><input autocomplete="off" id="messageInput" maxlength="1500" placeholder="Diga alguma coisa legal..." required><button type="submit" class="ui-btn btn-dark" title="Enviar mensagem" aria-label="Enviar mensagem">${ico('send')}</button></form>`:`<div class="pair-banner">Este encontro terminou.</div>`}${connected||archived?'':`<div class="decision-bar"><div><strong>Quer continuar conversando?</strong><p>${ownVote===true?'Sua escolha foi registrada. Aguardando a outra pessoa.':otherVote===true?'A outra pessoa já escolheu. E você?':'Só vira conexão se os dois disserem sim.'}</p></div><div class="buttons">${ownVote===true?`<span class="decision-note">${ico('clock',15)} Aguardando resposta</span>`:`<button class="ui-btn btn-outline btn-sm" data-action="vote" data-value="no">Agora não ${ico('close',15)}</button><button class="ui-btn btn-dark btn-sm" data-action="vote" data-value="yes">Quero continuar ${ico('heart',15)}</button>`}</div></div>`}</div><div style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin:17px 4px"><small style="color:#a29d93">${archived?'Mensagens preservadas para consulta.':connected?'Conversa salva.':'A contagem começa quando vocês são conectados.'}</small><button class="ui-btn btn-quiet btn-sm" data-action="${connected||archived?'nav':'endpair'}" data-view="conversations">${connected||archived?'Minhas conversas':'Encerrar encontro'} ${ico('chevron',14)}</button></div>`}
function messagesMarkup(peer){if(!state.messages.length)return `<div class="chat-intro">${avatar(peer,'large')}<strong>Vocês estão conectados.</strong>Uma mensagem pode ser o começo de alguma coisa. Que tal dizer oi?</div>`;return state.messages.map(m=>{const mine=m.sender_id===state.session?.user.id;return `<div class="bubble-row ${mine?'mine':'theirs'}"><div class="bubble">${esc(m.body)}<time class="bubble-time">${fmtTime(m.created_at)}</time></div></div>`}).join('')}
function conversationsView(){const pairs=state.pairs.filter(p=>p.status==='connected');return `${heading('SINTONIA RECÍPROCA','Suas <em>conversas.</em>','Mensagens de texto ficam salvas mesmo após o encerramento do encontro.')}${pairs.length?`<div class="convo-list">${pairs.map(renderConversationRow).join('')}</div>`:emptyConvos()}`}
function profileView(){const p=state.profile;return `${heading('É SOBRE QUEM VOCÊ É','Meu <em>perfil.</em>','É assim que a outra pessoa vai conhecer você depois de uma conexão.')}
<div class="profile-layout"><div class="profile-preview">${avatar(p,'xlarge')}<h3>${esc(p.display_name)}, ${p.age}</h3><p>${esc(p.bio||'Uma conversa de cada vez. Vamos nos conhecer?')}</p><span class="pill">${ico('user',15)} ${esc(genders[p.gender])}</span></div><div class="form-panel"><h3>Editar perfil</h3><form id="profileForm">${avatarUploader(p)}<div class="form-grid"><div class="field full"><label for="myname">Nome exibido</label><input id="myname" name="display_name" minlength="2" maxlength="42" required value="${esc(p.display_name)}"></div><div class="field"><label for="myage">Idade</label><input id="myage" name="age" type="number" min="18" max="100" required value="${p.age}"></div><div class="field"><label for="mygender">Identidade</label><select id="mygender" name="gender">${options({woman:'Mulher',man:'Homem',nonbinary:'Não binário'},p.gender)}</select></div><div class="field full"><label for="mypref">Preferência de busca</label><select id="mypref" name="preference">${options({any:'Qualquer pessoa',woman:'Mulheres',man:'Homens',nonbinary:'Não binárias'},p.preference)}</select></div><div class="field full"><label for="mybio">Sobre você</label><textarea id="mybio" name="bio" maxlength="220" placeholder="Conta algo interessante sobre você...">${esc(p.bio||'')}</textarea><small>Até 220 caracteres. Não informe dados pessoais.</small></div></div><button type="submit" class="ui-btn btn-dark">Salvar alterações ${ico('check',17)}</button></form></div></div>`}
function settingsView(){return `${heading('VOCÊ NO CONTROLE','Configurações<em>.</em>','Seu espaço, suas preferências e o controle da sua experiência.')}
<div class="settings-card"><h3>Preferências</h3><div class="setting-row"><div><strong>Reduzir animações</strong><p>Desativa movimentos e transições para uma experiência mais tranquila.</p></div><button type="button" class="toggle ${state.motionOff?'on':''}" data-action="motion" aria-label="Ativar ou desativar redução de animações" aria-pressed="${state.motionOff}"></button></div><div class="setting-row"><div><strong>Quem você procura</strong><p>${esc(genders[state.profile.preference])} — altere seu filtro na área de perfil.</p></div><button class="ui-btn btn-outline btn-sm" data-action="nav" data-view="profile">Editar ${ico('edit',15)}</button></div></div>
<div class="settings-card"><h3>Sessão e privacidade</h3><div class="setting-row"><div><strong>Conta conectada</strong><p>${esc(state.session.user.email)}</p></div><span class="pill">${ico('shield',15)} Google</span></div><div class="setting-row"><div><strong>Sair da conta</strong><p>Encerra sua sessão neste dispositivo.</p></div><button class="ui-btn btn-outline btn-sm" data-action="logout">${ico('exit',16)} Sair</button></div><div class="danger-zone"><strong>Excluir meu perfil do entre.</strong><p>Remove definitivamente seu perfil, mensagens e conexões deste aplicativo. O cadastro de autenticação compartilhado com outros produtos no mesmo servidor não será excluído.</p><button class="ui-btn btn-danger btn-sm" data-action="delete1">${ico('trash',15)} Excluir meus dados</button></div></div><div class="settings-card"><h3>Instalação e privacidade</h3><div class="setting-row"><div><strong>Usar o entre. como app</strong><p>Adicione um ícone na tela inicial do celular.</p></div><a class="admin-entry" href="./instalar.html">Instalar app</a></div><div class="setting-row"><div><strong>Seus dados e por quanto tempo são guardados</strong><p>Fotos de perfil permanentes, texto das conversas preservado e anexos temporários por 24 horas.</p></div><a class="admin-entry" href="./dados.html">Ver detalhes</a></div></div>${state.isAdmin?`<div class="settings-card"><h3>Painel administrativo</h3><div class="setting-row"><div><strong>Gerenciar o entre.</strong><p>Usuários, denúncias, estatísticas e configurações da plataforma.</p></div><a class="admin-entry" href="./admin/">Abrir painel ${ico("arrow",15)}</a></div></div>`:""}`}

function reportDialog(){
 const name=esc(state.peer?.display_name||'esta pessoa');
 return '<div class="modal-backdrop" id="modalBackdrop"><div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modalTitle">'
  +'<h2 id="modalTitle">Denunciar pessoa</h2>'
  +'<p>Se você passou por uma situação desrespeitosa com '+name+', conte o motivo. A equipe recebe a denúncia sem acesso automático às mensagens privadas.</p>'
  +'<form id="reportForm"><div class="field"><label for="reportReason">Motivo da denúncia</label>'
  +'<select name="reason" id="reportReason" required class="form-select">'
  +'<option value="harassment">Assédio ou comportamento abusivo</option>'
  +'<option value="hate">Discurso de ódio</option>'
  +'<option value="spam">Spam ou tentativa de golpe</option>'
  +'<option value="underage">Suspeita de menor de idade</option>'
  +'<option value="fake">Perfil falso</option><option value="other">Outro motivo</option></select></div>'
  +'<div class="field"><label for="reportDetails">O que aconteceu? (opcional)</label><textarea id="reportDetails" name="details" class="report-textarea" maxlength="800" placeholder="Descreva o problema, sem compartilhar dados sensíveis."></textarea></div>'
  +'<div class="modal-actions"><button type="button" class="ui-btn btn-outline btn-sm" data-action="closemodal">Cancelar</button>'
  +'<button type="submit" class="ui-btn btn-dark btn-sm">Enviar denúncia '+ico('arrow',15)+'</button></div></form></div></div>';
}
async function sendReport(form){
 const target=state.peer?.id;
 if(!target)throw new Error('Nenhuma conexão selecionada para denunciar.');
 const btn=form.querySelector('button[type=submit]');busy(btn,true);
 try{
  const reason=form.elements.reason.value;
  const details=form.elements.details.value.trim();
  const {error}=await db.rpc('entre_report_user',{_reported:target,_reason:reason,_details:details});
  if(error)throw error;
  state.modal=null;render();toast('Denúncia enviada para análise. Obrigado por nos avisar.');
 }catch(e){toast(infoError(e),true);}
 finally{if(btn&&btn.isConnected)busy(btn,false)}
}

function modalView(){const m=state.modal;if(!m)return '';if(m==='report')return reportDialog();const del=m==='delete1'||m==='delete2';return `<div class="modal-backdrop" id="modalBackdrop"><div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><h2 id="modalTitle">${m==='delete1'?'Excluir seus dados?':m==='delete2'?'Confirma a exclusão?':m==='block'?'Bloquear esta pessoa?':'Encerrar encontro?'}</h2><p>${m==='delete1'?'Seu perfil, suas conversas e suas conexões deste aplicativo serão removidos permanentemente. Isso também pode apagar mensagens compartilhadas com outras pessoas.':m==='delete2'?'Esta é a confirmação final. Digite EXCLUIR abaixo. O login do servidor compartilhado continuará existindo, mas sua conta no entre. não.':m==='block'?'Vocês não serão conectados de novo por este sistema. A conversa temporária será encerrada.':'Este encontro será encerrado, mas o texto ficará salvo no histórico da conversa.'}</p>${m==='delete2'?`<div class="field"><label for="deleteConfirm">Digite EXCLUIR para confirmar</label><input id="deleteConfirm" autocomplete="off" placeholder="EXCLUIR"></div>`:''}<div class="modal-actions"><button class="ui-btn btn-outline btn-sm" data-action="closemodal">Cancelar</button><button class="ui-btn ${del?'btn-danger':'btn-dark'} btn-sm" data-action="${m==='delete1'?'delete2':m==='delete2'?'deleteFinal':m==='block'?'blockFinal':'endpairFinal'}">${del?'Excluir':'Confirmar'} ${ico('arrow',15)}</button></div></div></div>`}
function render(){applyMotion();if(maintenanceIsActive()){dismissPublicNotice();app.innerHTML=maintenanceView();return;}if(state.suspension){dismissPublicNotice();app.innerHTML=suspensionView();return;}if(!state.session){app.innerHTML=state.mode==='login'||state.mode==='signup'?authView():landing()}else if(!state.profile){state.mode='onboard';app.innerHTML=authView()}else{app.innerHTML=appLayout();updateTimerText()}if(state.view==='connect'&&state.pair){const el=document.getElementById('messageList');if(el)el.scrollTop=el.scrollHeight}}
function renderView(){if(maintenanceIsActive())return;if(state.session&&state.profile){const el=document.getElementById('view-content');if(el){el.innerHTML=viewContent();updateTimerText();const m=document.getElementById('messageList');if(m)m.scrollTop=m.scrollHeight}}}
function showFormMessage(msg,success=false){const id=success?'form-success':'form-error';const target=document.getElementById(id);if(target){target.classList.remove('hidden');target.textContent=msg}}
function busy(btn,value){if(btn){btn.disabled=value;btn.dataset.oldLabel ||= btn.innerHTML;if(value)btn.textContent='Só um instante...';else btn.innerHTML=btn.dataset.oldLabel}}
async function getProfile(){const uid=state.session?.user.id;if(!uid)return null;const {data,error}=await db.from('entre_profiles').select('*').eq('id',uid).maybeSingle();if(error)throw error;return data}
async function loadPairs(){if(!state.session||!state.profile)return;const uid=state.session.user.id;const {data,error}=await db.from('entre_pairs').select('*').or(`a.eq.${uid},b.eq.${uid}`).in('status',['active','connected','closed']).order('created_at',{ascending:false}).limit(50);if(error)throw error;state.pairs=data||[];const ids=[...new Set(state.pairs.map(p=>p.a===uid?p.b:p.a))];state.pairsProfiles={};if(ids.length){const {data:profiles}=await db.from('entre_profiles').select('id,display_name,age,bio,gender,avatar_path,avatar_uploaded_at').in('id',ids);if(profiles?.length)await Promise.all(profiles.map(signAvatar));for(const pair of state.pairs){state.pairsProfiles[pair.id]=profiles?.find(p=>p.id===(pair.a===uid?pair.b:pair.a))||{id:pair.a===uid?pair.b:pair.a,display_name:'Conta indisponível'}}}return state.pairs}
async function initializeAccount(){state.profile=await getProfile();if(state.profile)await signAvatar(state.profile);installAvatarRealtime();state.pair=null;state.peer=null;state.searching=false;state.messages=[];if(state.profile){state.preference=state.profile.preference;await loadPairs();const active=state.pairs.find(p=>p.status==='active'&&new Date(p.expires_at)>Date.now());if(active){state.pair=active;state.peer=state.pairsProfiles[active.id]||null;state.view='connect';await loadMessages();subscribePair(active.id)}}render()}
function hasGoogleIdentity(user){const providers=user?.app_metadata?.providers;return user?.app_metadata?.provider==='google'||(Array.isArray(providers)&&providers.includes('google'))||user?.identities?.some(i=>i.provider==='google')===true}
async function signInGoogle(btn){
 busy(btn,true);
 try{
  // Use the exact allow-listed production URL; GitHub Pages also works when opening /index.html.
  const redirectTo=window.location.hostname==='appswebb.github.io'
   ? 'https://appswebb.github.io/testesite/'
   : new URL(window.location.pathname,window.location.origin).href;
  const {data,error}=await db.auth.signInWithOAuth({provider:'google',options:{redirectTo,queryParams:{prompt:'select_account'}}});
  if(error)throw error;
  if(!data?.url)throw new Error('O provedor não retornou um endereço para autenticação. Verifique a configuração do Google no Supabase.');
 }catch(e){showFormMessage(infoError(e));busy(btn,false)}
}
function getProfileData(form){return {display_name:form.display_name.value.trim(),age:Number(form.age.value),gender:form.gender.value,preference:form.preference.value}}
async function createProfile(data){const {error}=await db.from('entre_profiles').upsert({id:state.session.user.id,display_name:data.display_name,age:data.age,gender:data.gender,preference:data.preference,...(data.avatar_path?{avatar_path:data.avatar_path}:{})},{onConflict:'id'});if(error)throw error;sessionStorage.removeItem('entre.pendingProfile')}
async function profileSetup(form){
 const submit=form.querySelector('[type=submit]');busy(submit,true);
 let uploaded=null;
 try{
  const profile=getProfileData(form);
  if(!form.adult.checked||profile.age<18)throw Error('Você deve ter pelo menos 18 anos.');
  if(state.avatarPendingFile){uploaded=await uploadAvatarFile(state.avatarPendingFile);profile.avatar_path=uploaded;}
  await createProfile(profile);
  if(uploaded)commitLocalAvatar(uploaded);
  clearAvatarDraft();
  state.view='home';await initializeAccount();
  toast('Perfil concluído. Bem-vindo ao entre.!');
 }catch(e){
  if(uploaded)await db.storage.from(AVATAR_BUCKET).remove([uploaded]);
  showFormMessage(infoError(e));
 }finally{busy(submit,false)}
}
async function saveProfile(form){
 const submit=form.querySelector('[type=submit]');busy(submit,true);
 let uploaded=null;
 try{
  const p=getProfileData(form);
  const previous=state.profile?.avatar_path;
  if(state.avatarPendingFile){uploaded=await uploadAvatarFile(state.avatarPendingFile);p.avatar_path=uploaded;}
  const {data,error}=await db.from('entre_profiles')
   .update({...p,bio:form.bio.value.trim(),updated_at:new Date().toISOString()})
   .eq('id',state.session.user.id).select('*').single();
  if(error)throw error;
  state.profile=data;state.preference=data.preference;
  if(uploaded)commitLocalAvatar(uploaded);
  clearAvatarDraft();render();
  if(uploaded)void signAvatar(data,true);
  toast(uploaded?'Foto comprimida e perfil atualizados!':'Perfil atualizado!');
  if(uploaded&&previous&&previous!==uploaded){
   db.storage.from(AVATAR_BUCKET).remove([previous]).then(r=>{if(r.error)console.warn('Old image cleanup deferred:',r.error)});
  }
 }catch(e){
  if(uploaded)await db.storage.from(AVATAR_BUCKET).remove([uploaded]);
  toast(infoError(e),true);
 }finally{busy(submit,false)}
}
function clearSearchTimer(){if(state.searchLoop){clearInterval(state.searchLoop);state.searchLoop=null}}
async function startSearch(){if(maintenanceIsActive())return;if(!state.session||!state.profile)return;state.searching=true;state.pair=null;state.peer=null;state.view='connect';render();await pollSearch();if(state.searching&&!state.searchLoop)state.searchLoop=setInterval(pollSearch,3500)}
let polling=false;
async function pollSearch(){if(polling||!state.searching)return;polling=true;try{const {data,error}=await db.rpc('entre_find',{_preference:state.preference});if(error)throw error;if(data?.status==='matched'&&data.pair_id){state.searching=false;clearSearchTimer();await openPair(data.pair_id);toast('Você encontrou uma conexão!')}}catch(e){toast(infoError(e),true);state.searching=false;clearSearchTimer();renderView()}finally{polling=false}}
async function cancelSearch(){state.searching=false;clearSearchTimer();try{const {error}=await db.rpc('entre_leave');if(error)throw error}catch(e){toast(infoError(e),true)}renderView()}
async function openPair(id){const {data,error}=await db.from('entre_pairs').select('*').eq('id',id).single();if(error)throw error;state.pair=data;state.searching=false;clearSearchTimer();const other=data.a===state.session.user.id?data.b:data.a;const {data:profile}=await db.from('entre_profiles').select('id,display_name,age,bio,gender,avatar_path,avatar_uploaded_at').eq('id',other).maybeSingle();if(profile)await signAvatar(profile);state.peer=profile||{id:other,display_name:'Esta pessoa'};state.view='connect';await loadMessages();if(data.status!=='closed')subscribePair(id);render()}
async function loadMessages(){if(!state.pair)return;const {data,error}=await db.from('entre_messages').select('id,body,sender_id,created_at').eq('pair_id',state.pair.id).order('id',{ascending:true}).limit(1000);if(error){console.warn(error);return}state.messages=data||[]}
function subscribePair(id){if(state.channel){db.removeChannel(state.channel);state.channel=null}state.channel=db.channel(`entre_pair_${id}_${Math.random().toString(36).slice(2,7)}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'entre_messages',filter:`pair_id=eq.${id}`},async()=>{if(state.pair?.id===id){await loadMessages();renderView()}}).on('postgres_changes',{event:'UPDATE',schema:'public',table:'entre_pairs',filter:`id=eq.${id}`},async()=>{if(state.pair?.id===id)await refreshPair()}).subscribe()}
async function refreshPair(){if(!state.pair)return;const id=state.pair.id;const {data,error}=await db.from('entre_pairs').select('*').eq('id',id).maybeSingle();if(error)return;if(!data||data.status==='closed'){state.pair=null;state.messages=[];state.peer=null;state.view='connect';if(state.channel){db.removeChannel(state.channel);state.channel=null}render();toast('Este encontro foi encerrado.');return}const oldStatus=state.pair.status;state.pair=data;if(data.status==='connected'&&oldStatus!=='connected'){toast('Os dois disseram sim! Conexão salva. ♡');await loadPairs()}renderView()}
async function sendMessage(form){if(maintenanceIsActive())return;if(!state.pair)return;const input=form.querySelector('#messageInput');const body=input.value.trim();if(!body)return;input.value='';const {data,error}=await db.from('entre_messages').insert({pair_id:state.pair.id,sender_id:state.session.user.id,body}).select('id,body,sender_id,created_at').single();if(error){input.value=body;toast(infoError(error),true);return}if(!state.messages.some(m=>m.id===data.id)){state.messages.push(data);renderView()}setTimeout(()=>document.getElementById('messageInput')?.focus(),0)}
async function vote(accept){if(maintenanceIsActive())return;if(!state.pair)return;try{const {data,error}=await db.rpc('entre_vote',{_pair:state.pair.id,_accept:accept});if(error)throw error;if(data==='closed'){state.pair=null;state.peer=null;state.messages=[];await loadPairs();render();toast('Conversa encerrada. Você pode conhecer outra pessoa.');return}await refreshPair();if(accept&&data==='active')toast('Sua escolha foi registrada. Falta a outra pessoa.')}catch(e){toast(infoError(e),true)}}
async function endPair(){if(!state.pair)return;try{const {error}=await db.rpc('entre_close',{_pair:state.pair.id});if(error)throw error;state.pair=null;state.messages=[];state.peer=null;state.modal=null;if(state.channel){db.removeChannel(state.channel);state.channel=null}await loadPairs();state.view='connect';render();toast('Encontro encerrado.')}catch(e){toast(infoError(e),true)}}
async function blockPartner(){if(!state.peer)return;try{const {error}=await db.rpc('entre_block',{_user:state.peer.id});if(error)throw error;state.modal=null;state.pair=null;state.peer=null;state.messages=[];await loadPairs();state.view='connect';render();toast('Pessoa bloqueada. Vocês não serão reconectados.')}catch(e){toast(infoError(e),true)}}
async function logout(){try{if(state.searching)await db.rpc('entre_leave');clearSearchTimer();if(state.channel){await db.removeChannel(state.channel);state.channel=null}const {error}=await db.auth.signOut({scope:'local'});if(error)throw error;state.session=null;state.profile=null;state.pair=null;state.peer=null;state.pairs=[];state.suspension=null;state.searching=false;state.mode='landing';state.view='home';render();toast('Você saiu da conta.')}catch(e){toast(infoError(e),true)}}
async function deleteData(){const val=document.getElementById('deleteConfirm')?.value||'';if(val!=='EXCLUIR'){toast('Digite EXCLUIR para confirmar.',true);return}try{const {error}=await db.rpc('entre_delete_my_profile');if(error)throw error;state.modal=null;await logout();toast('Seus dados do entre. foram excluídos.')}catch(e){toast(infoError(e),true)}}
function updateTimerText(){if(!state.pair||state.pair.status!=='active')return;const seconds=Math.max(0,Math.ceil((new Date(state.pair.expires_at).getTime()-Date.now())/1000));const mm=String(Math.floor(seconds/60)).padStart(2,'0'),ss=String(seconds%60).padStart(2,'0');document.querySelectorAll('.timer-text').forEach(el=>{el.textContent=`${mm}:${ss}`;el.classList.toggle('urgent',seconds<=30)});if(seconds===0&&state.closedOnce!==state.pair.id){state.closedOnce=state.pair.id;db.rpc('entre_close',{_pair:state.pair.id}).then(()=>refreshPair()).catch(()=>{})}}
function nav(view){if(view==='connect'&&state.pair?.status==='closed'){state.pair=null;state.peer=null;state.messages=[];}state.view=view;if(view!=='connect'&&state.pair?.status==='active'){toast('Sua conversa de 5 minutos continua ativa na aba Conectar.')}render();window.scrollTo({top:0,behavior:state.motionOff?'instant':'smooth'})}
function scrollHow(){document.getElementById('como-funciona')?.scrollIntoView({behavior:'smooth'})}
async function clickAction(event){const btn=event.target.closest('[data-action]');if(!btn||btn.disabled)return;const action=btn.dataset.action;try{switch(action){case'logo':event.preventDefault();if(state.session&&state.profile)nav('home');else{state.mode='landing';render()}break;case'landing':state.mode='landing';render();break;case'how':scrollHow();break;case'login':state.mode='login';render();break;case'signup':state.mode='signup';render();break;case'google':await signInGoogle(btn);break;case'maintenanceRefresh':await maintenanceCheck(true);break;case'nav':nav(btn.dataset.view);break;case'filter':state.preference=btn.dataset.value;renderView();break;case'startsearch':await startSearch();break;case'cancelsearch':await cancelSearch();break;case'openpair':await openPair(btn.dataset.id);break;case'vote':await vote(btn.dataset.value==='yes');break;case'endpair':state.modal='endpair';render();break;case'endpairFinal':await endPair();break;case'report':state.modal='report';render();break;case'removeAvatar':await removeAvatar();break;case'block':state.modal='block';render();break;case'blockFinal':await blockPartner();break;case'closemodal':state.modal=null;render();break;case'logout':await logout();break;case'motion':state.motionOff=!state.motionOff;localStorage.setItem('entre.motionOff',state.motionOff?'1':'0');render();break;case'delete1':state.modal='delete1';render();break;case'delete2':state.modal='delete2';render();break;case'deleteFinal':await deleteData();break;default:break}}catch(e){toast(infoError(e),true)}}
document.addEventListener('click',clickAction);
document.addEventListener('change',async e=>{
 if(e.target?.id!=='avatarFile')return;
 const file=e.target.files?.[0];
 e.target.value='';
 if(!file)return;
 try{await openImageCrop(file,{title:'Ajustar sua foto'});}catch(error){toast(infoError(error),true)}
});
document.addEventListener('submit',async e=>{const form=e.target;if(!(form instanceof HTMLFormElement))return;e.preventDefault();const name=form.id;try{if(name==='authForm'&&form.dataset.form==='profileSetup')await profileSetup(form);else if(name==='profileForm')await saveProfile(form);else if(name==='suspensionAppeal')await submitSuspensionAppeal(form);else if(name==='messageForm')await sendMessage(form);else if(name==='reportForm')await sendReport(form)}catch(err){toast(infoError(err),true)}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&activeImageCrop){closeImageCrop();return;}if(e.key==='Escape'&&state.modal){state.modal=null;render()}});
window.addEventListener('beforeunload',()=>{if(state.searching)db.rpc('entre_leave').catch(()=>{})});

function maintenanceIsPreview(){return new URLSearchParams(location.search).has('maintenance_preview')}
function maintenanceIsActive(){return maintenanceIsPreview()||state.siteSettings?.maintenance_enabled!==false}

/* Server-controlled suspension and timed announcements. Static HTML never authorizes access. */
function suspensionView(){
 const value=state.suspension||{};
 return '<main class="suspension-screen"><div class="suspension-glow" aria-hidden="true"></div>'
 +'<header class="suspension-header"><a href="./" class="suspension-logo" aria-label="entre.">entre<span>.</span></a><span>SEGURANÇA DA COMUNIDADE</span></header>'
 +'<section class="suspension-card" role="alert" aria-labelledby="suspension-title">'
 +'<div class="suspension-sign" aria-hidden="true">!</div><span class="suspension-eyebrow">ACESSO TEMPORARIAMENTE BLOQUEADO</span>'
 +'<h1 id="suspension-title">Sua conta está <em>suspensa.</em></h1>'
 +'<p>O acesso ao entre. está bloqueado enquanto esta decisão estiver ativa. Você não pode entrar em conversas nem buscar novas conexões.</p>'
 +'<div class="suspension-reason"><strong>Motivo informado</strong><p>'+esc(value.reason||'Esta conta não atende às regras de segurança da comunidade.')+'</p></div>'
 +'<p class="suspension-explain">Acredita que houve um engano? Solicite uma revisão. Sua contestação será recebida pela administração, sem reativação automática.</p>'
 +'<form id="suspensionAppeal" class="suspension-form"><label for="suspension-appeal">Pedir revisão da suspensão</label>'
 +'<textarea id="suspension-appeal" name="appeal" minlength="15" maxlength="1000" required placeholder="Explique sua situação com pelo menos 15 caracteres…"></textarea>'
 +'<button class="suspension-submit" type="submit">Enviar contestação</button><small>Limite: uma contestação a cada 24 horas.</small></form>'
 +'<div class="suspension-footer-actions"><button type="button" data-action="logout" class="suspension-signout">Sair desta conta</button>'
 +'<a href="./dados.html">Privacidade e retenção</a><a href="./termos.html">Regras da comunidade</a></div></section>'
 +'<footer class="suspension-footer">entre. · Segurança, respeito e transparência.</footer></main>';
}
let publicNoticeInterval=null;
function dismissPublicNotice(){
 if(publicNoticeInterval){clearInterval(publicNoticeInterval);publicNoticeInterval=null;}
 document.getElementById('global-announcement')?.remove();
 state.notice=null;
}
function considerPublicAnnouncement(settings){
 if(!settings||maintenanceIsActive()||state.suspension)return;
 const version=Number(settings.announcement_version)||0, sent=Date.parse(settings.announcement_sent_at||'');
 if(!version||!settings.announcement||!Number.isFinite(sent))return;
 if(Date.now()-sent>20000||sent-Date.now()>60000)return;
 if(sessionStorage.getItem('entre.notice.last')===String(version)||state.notice?.version===version)return;
 dismissPublicNotice();
 sessionStorage.setItem('entre.notice.last',String(version));
 const message=String(settings.announcement||'').slice(0,240);
 state.notice={version,message,endsAt:Date.now()+10000};
 const overlay=document.createElement('div');overlay.id='global-announcement';overlay.className='announcement-screen';
 overlay.setAttribute('role','alertdialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','global-announcement-title');
 overlay.innerHTML='<div class="announcement-backdrop" aria-hidden="true"></div><div class="announcement-dialog">'
 +'<div class="announcement-identity">entre<span>.</span></div><div class="announcement-icon" aria-hidden="true">✳</div>'
 +'<span class="announcement-kicker">COMUNICADO DA PLATAFORMA</span><h2 id="global-announcement-title">Um aviso pra você<span>.</span></h2>'
 +'<p class="announcement-text">'+esc(message)+'</p>'
 +'<div class="announcement-timer"><div class="announcement-timer-bar"><div id="announcement-progress"></div></div>'
 +'<div class="announcement-timer-copy">O site volta em <strong id="announcement-seconds">10</strong> segundos</div></div>'
 +'</div>';
 document.body.appendChild(overlay);
 const update=()=>{
  if(!state.notice||state.notice.version!==version){dismissPublicNotice();return;}
  const left=Math.max(0,state.notice.endsAt-Date.now());
  const seconds=Math.ceil(left/1000);
  const number=document.getElementById('announcement-seconds'),bar=document.getElementById('announcement-progress');
  if(number)number.textContent=String(seconds);
  if(bar)bar.style.width=(left/100)+'%';
  if(left<=0)dismissPublicNotice();
 };
 update();publicNoticeInterval=setInterval(update,100);
}
async function checkSuspension(){
 if(!state.session?.user)return false;
 const response=await db.rpc('entre_my_suspension');
 if(response.error)throw response.error;
 const suspended=response.data?.suspended===true;
 if(suspended){
  const was=!!state.suspension;
  state.suspension=response.data;
  state.searching=false;clearSearchTimer();
  if(state.channel){db.removeChannel(state.channel);state.channel=null;}
  if(!was)render();
 }else if(state.suspension){
  state.suspension=null;
  window.location.reload();return false;
 }
 return suspended;
}
async function submitSuspensionAppeal(form){
 const btn=form.querySelector('[type="submit"]');
 if(btn){btn.disabled=true;btn.textContent='Enviando…';}
 try{
  const {error}=await db.rpc('entre_submit_suspension_appeal',{_message:form.elements.appeal.value.trim()});
  if(error)throw error;
  form.innerHTML='<p class="suspension-success" role="status">Contestação enviada. A administração poderá avaliar seu pedido.</p>';
 }catch(error){toast(infoError(error),true);if(btn){btn.disabled=false;btn.textContent='Enviar contestação';}}
}

function maintenanceView(){
 const s=state.siteSettings||{};
 const title=esc(!state.siteSettings?'Verificando o site…':s.maintenance_title||'Tem coisa boa chegando.');
 const message=esc(!state.siteSettings?'Não conseguimos confirmar o status da plataforma. Por segurança, o acesso permanece pausado enquanto tentamos novamente.':s.maintenance_message||'Estamos preparando uma nova versão do entre. Seu próximo oi merece uma experiência ainda melhor.');
 const preview=maintenanceIsPreview();
 return '<main class="maintenance-screen" id="maintenance-screen" role="main">'
  +'<div class="maint-grain" aria-hidden="true"></div><div class="maint-halo maint-halo-one" aria-hidden="true"></div><div class="maint-halo maint-halo-two" aria-hidden="true"></div>'
  +'<header class="maint-header"><div class="maint-brand-lockup" aria-label="entre."><svg class="maint-brand-symbol" viewBox="0 0 60 60" aria-hidden="true"><path d="M11 30c-2-12 4-19 14-18 13 1 11 21 18 27" fill="none" stroke="#F69C7B" stroke-width="9" stroke-linecap="round"/><path d="M49 30c2 12-4 19-14 18-13-1-11-21-18-27" fill="none" stroke="#E6F0D5" stroke-width="9" stroke-linecap="round"/></svg><span class="maint-brand-name">entre<span>.</span></span></div><span class="maint-top-label">UM NOVO CAPÍTULO</span></header>'
  +'<div class="maint-container"><div class="maint-copy"><div class="maint-eyebrow"><span class="maint-beat"></span> '+(preview?'VISUALIZAÇÃO DA TELA':'MODO ATUALIZAÇÃO ATIVO')+'</div>'
  +'<h1 id="maintenance-title">'+title+'</h1><p class="maint-lead" id="maintenance-message">'+message+'</p>'
  +'<div class="maint-promise"><span class="maint-promise-glyph">✳</span><span>Estamos cuidando de cada detalhe para deixar seus próximos cinco minutos ainda mais especiais.</span></div>'
  +'<div class="maint-status"><span class="maint-status-light"></span><div><strong>Preparando novidades</strong><small id="maintenance-status-text">A página verifica automaticamente quando tudo estiver pronto.</small></div><span class="maint-live-dots" aria-hidden="true"><i></i><i></i><i></i></span></div>'
  +'<div class="maint-actions"><button type="button" data-action="maintenanceRefresh" class="maint-refresh">'+ico("refresh",18)+' Verificar agora</button></div>'
  +'</div><div class="maint-visual" aria-hidden="true"><div class="maint-orbit orbit-outer"></div><div class="maint-orbit orbit-mid"></div><div class="maint-orbit orbit-inner"></div>'
  +'<span class="maint-visual-star star-one">✳</span><span class="maint-visual-star star-two">✴</span><span class="maint-visual-star star-three">✧</span>'
  +'<div class="maint-visual-card"><div class="maint-mini-tag">UMA CONEXÃO DE CADA VEZ</div><div class="maint-center"><span class="maint-big-five">05<span>:</span>00</span><div class="maint-center-sub">CINCO MINUTOS. UMA POSSIBILIDADE.</div></div><div class="maint-card-footer"><span class="maint-avatar first">e</span><span class="maint-connection">↝</span><span class="maint-avatar second">♡</span></div></div>'
  +'<div class="maint-float-pill pill-one">algo especial está chegando <span>✷</span></div><div class="maint-float-pill pill-two">feito pra sentir. ♡</div></div></div>'
  +'<footer class="maint-footer"><span>ENTRE. — GENTE DE VERDADE, CONEXÕES REAIS.</span><span>VOLTAMOS QUANDO A ATUALIZAÇÃO FOR LIBERADA.</span></footer>'
  +'<div class="maint-line" aria-hidden="true"><span></span></div></main>';
}
let maintenancePolling=false;
async function maintenanceCheck(manual=false){
 if(maintenancePolling)return;
 maintenancePolling=true;
 try{
  const previous=maintenanceIsActive();
  const response=await db.rpc('entre_public_settings');
  if(response.error)throw response.error;
  if(!response.data)return;
  const before=state.siteSettings;
  state.siteSettings=response.data;
  const active=maintenanceIsActive();
  if(state.session&&!active)await checkSuspension();
  if(!active&&!state.suspension)considerPublicAnnouncement(response.data);
  if(previous&&!active&&!maintenanceIsPreview()){
   const status=document.getElementById('maintenance-status-text');
   if(status)status.textContent='Atualização liberada! Abrindo a nova versão…';
   const target=new URL(window.location.href);
   target.searchParams.delete('maintenance_preview');
   target.searchParams.set('released',new Date(response.data.release_at||Date.now()).getTime().toString());
   setTimeout(()=>window.location.replace(target.href),800);
   return;
  }
  if(active&&!previous){
   state.searching=false;clearSearchTimer();
   if(state.channel){db.removeChannel(state.channel);state.channel=null;}
   state.pair=null;state.peer=null;state.modal=null;
   render();
  }else if(active){
   const title=document.getElementById('maintenance-title'),msg=document.getElementById('maintenance-message');
   if(title)title.textContent=response.data.maintenance_title||'Tem coisa boa chegando.';
   if(msg)msg.textContent=response.data.maintenance_message||'Uma nova versão está chegando.';
   if(manual){const status=document.getElementById('maintenance-status-text');if(status)status.textContent='A atualização continua ativa. Esta página será liberada automaticamente.';}
  }else if(before?.maintenance_enabled!==response.data.maintenance_enabled){render();}
 }catch(err){
  if(manual){const target=document.getElementById('maintenance-status-text');if(target)target.textContent='Não foi possível verificar agora. Continuaremos tentando.';}
  console.warn('Maintenance status check failed',err);
 }finally{maintenancePolling=false;}
}

function getOAuthError(){
 const query=new URLSearchParams(window.location.search);
 const hash=new URLSearchParams(window.location.hash.replace(/^#/,''));
 const code=hash.get('error')||query.get('error')||hash.get('error_code')||query.get('error_code');
 if(!code)return null;
 const message=hash.get('error_description')||query.get('error_description')||hash.get('error_code')||query.get('error_code')||code;
 return infoError({message});
}
async function loadSiteSettings(){try{const {data,error}=await db.rpc('entre_public_settings');if(!error&&data)state.siteSettings=data}catch(e){console.warn('Public settings unavailable')}}
async function boot(){
 state.signup=null;sessionStorage.removeItem('entre.pendingProfile');applyMotion();
 const oauthError=getOAuthError();
 try{
  await loadSiteSettings();
  // Public maintenance is for EVERYONE, including the account that owns the admin panel.
  // Start polling even when authentication is deliberately skipped during maintenance.
  setInterval(()=>maintenanceCheck(false),6000);
  if(maintenanceIsActive()){
    render();
    // The only exception is an admin OAuth callback that must return to /admin/.
    // The site itself is never rendered as an admin-only backdoor.
    if(localStorage.getItem('entre.admin.return')!=='1')return;
  }
  const {data,error}=await db.auth.getSession();if(error)throw error;
  if(data.session){
   const verified=await db.auth.getUser();if(verified.error)throw verified.error;
   if(!hasGoogleIdentity(verified.data.user)){
    await db.auth.signOut({scope:'local'});state.session=null;state.mode='login';render();showFormMessage('O entre. aceita somente login pelo Google.');
   }else{state.session={...data.session,user:verified.data.user};const {data:admin}=await db.rpc('entre_admin_check');state.isAdmin=admin===true;if(state.isAdmin&&localStorage.getItem('entre.admin.return')==='1'){localStorage.removeItem('entre.admin.return');window.location.replace('./admin/');return;}state.mode='app';const suspended=await checkSuspension();if(maintenanceIsActive()||suspended)render();else await initializeAccount()}
  }else{state.mode=oauthError?'login':'landing';render();if(oauthError)showFormMessage(oauthError)}
  db.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'&&state.session){state.session=null;state.profile=null;state.isAdmin=false;state.mode='landing';render()}});
  if(!maintenanceIsActive()&&!state.suspension)considerPublicAnnouncement(state.siteSettings);
  state.timerLoop=setInterval(updateTimerText,1000);
  setInterval(async()=>{if(state.session?.user&&state.pair&&document.visibilityState==='visible'){await refreshPair()}},12000)
 }catch(e){state.mode='login';render();showFormMessage(oauthError||infoError(e));console.error(e)}
}
boot();
