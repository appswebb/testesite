const createClient = window.supabase?.createClient;
if (!createClient) {
  document.getElementById('app').innerHTML = '<main class="startup" style="display:flex;flex-direction:column;padding:30px;text-align:center"><h1 style="font-size:40px;margin-bottom:12px">CONNECT</h1><p style="font:16px system-ui">Falha ao carregar a conexão. Confira a internet e atualize a página.</p><button onclick="location.reload()" style="padding:12px 25px;border-radius:20px;border:0;background:var(--ui-accent,#111);color:var(--ui-accent-on,#fff)">Tentar novamente</button></main>';
  throw new Error('Supabase browser bundle is not available');
}

const SUPABASE_URL = 'https://trrakyybnvxpdhxwgjrz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_OJ4wBPPNVBBcrcNl12yonw_hRSlMKsZ'; // public, restricted by database RLS
const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } });
const app = document.getElementById('app');
const iconPaths = {
 shareApp:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4m-6.8 7 6.8 4"/>',
 partners:'<path d="m3 12 4-5 5 2 5-2 4 5-6 6a3 3 0 0 1-4 0l-6-5m7-4-3 3 2 2 4-3 3 3"/><path d="m2 13 3-7m17 7-3-7"/>',
 protocol:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/>',
 adminPanel:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16m3-11h6m-6 4h6"/>',

 palette:'<path d="M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 0-4 2 2 0 0 1 0-4h3a4 4 0 0 0 4-4c0-3-4-6-9-6z"/><circle cx="7.5" cy="10" r=".8"/><circle cx="10.5" cy="6.5" r=".8"/><circle cx="15" cy="7" r=".8"/>' ,
 arrow:'<path d="M5 12h14m-7-7 7 7-7 7"/>',back:'<path d="M19 12H5m7 7-7-7 7-7"/>',home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
 bolt:'<path d="m13 2-9 11h7l-1 9 10-12h-7z"/>',heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8l8.8 8.5 8.8-8.5a5.5 5.5 0 0 0 0-7.8z"/>',chat:'<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4 8.5 8.5 0 0 1 8.5-8.5A8.5 8.5 0 0 1 21 11.5z"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',settings:'<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="m19.5 12 1.5-1.3-2-3.5-1.9.6a7 7 0 0 0-1.6-1L15 4h-4l-.5 2.8a7 7 0 0 0-1.6 1L7 7.2l-2 3.5L6.5 12 5 13.3l2 3.5 1.9-.6a7 7 0 0 0 1.6 1L11 20h4l.5-2.8a7 7 0 0 0 1.6-1l1.9.6 2-3.5z"/>',
 exit:'<path d="M10 17l5-5-5-5m5 5H3m9-9h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',send:'<path d="m22 2-7 20-4-9-9-4zM22 2 11 13"/>',close:'<path d="M18 6 6 18M6 6l12 12"/>',check:'<path d="m4 12 5 5L20 6"/>',chevron:'<path d="m9 18 6-6-6-6"/>',spark:'<path d="m12 2 2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',trash:'<path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6M10 10v7m4-7v7"/>',edit:'<path d="m4 20 5-.8L20 8.2 15.8 4 4.8 15zM13 6.8l4.2 4.2"/>',volume:'<path d="M4 9h4l5-4v14l-5-4H4zM17 9a4 4 0 0 1 0 6"/>',star:'<path d="m12 2 3 6.7 7.3.7-5.5 4.8 1.7 7.2L12 17.5l-6.5 3.9 1.7-7.2-5.5-4.8L9 8.7z"/>'
};
Object.assign(iconPaths,{
 users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
 link:'<path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 1 0-7.07-7.07l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3A5 5 0 1 0 11 21.07l1.7-1.7"/>',
 bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
 megaphone:'<path d="m3 11 14-7v16L3 13zM17 8a4 4 0 0 1 0 8M7 14l2 7h4l-3-6"/>',
 flag:'<path d="M4 22V4m0 1c6-4 10 4 16 0v12c-6 4-10-4-16 0"/>',
 refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.7 9A7 7 0 0 1 18 6l2 1M4 17l2 1a7 7 0 0 0 12.3-3"/>'
});
Object.assign(iconPaths,{camera:'<rect x="2" y="5" width="14" height="14" rx="2"/><path d="m16 10 6-4v12l-6-4z"/>',mic:'<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8"/>',crown:'<path d="m2 8 5 4 5-8 5 8 5-4-2 12H4z"/>',more:'<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>'});
Object.assign(iconPaths,{
 'phone-off':'<path d="M10.7 5a14 14 0 0 1 8.3 6l2 3-3 2-3.2-3.3M5 5l14 14M3 13l3 3 3.2-3.2"/>',
 compass:'<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.3 4.7-4.7 2.3 2.3-4.7z"/>',
 'volume-2':iconPaths.volume,
 'refresh-cw':iconPaths.refresh
});
Object.assign(iconPaths,{radio:'<circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19 5a10 10 0 0 1 0 14M5 19A10 10 0 0 1 5 5"/>',mail:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 6 10 7 10-7"/>','arrow-left':iconPaths.back,play:'<path d="m8 5 12 7-12 7z"/>',image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>'});
Object.assign(iconPaths,{rooms:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',sliders:'<path d="M3 6h5m4 0h9M3 12h10m4 0h4M3 18h2m4 0h12"/><circle cx="10" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="7" cy="18" r="2"/>'});
Object.assign(iconPaths,{feather:'<path d="M20 4c-5-1-10 2-12 6s-2 8-5 11m4-4c9 1 14-5 13-13M7 17l8-8"/>',layers:'<path d="m12 3 10 5-10 5L2 8zM2 13l10 5 10-5M2 18l10 5 10-5"/>',cube:'<path d="m12 2 9 5v10l-9 5-9-5V7zm0 10 9-5M12 12 3 7m9 5v10"/>'});
Object.assign(iconPaths,{settings:'<path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.08A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.08A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.08A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.5 1h.1a2 2 0 1 1 0 4h-.08a1.65 1.65 0 0 0-1.52 1Z"/>',exit:'<path d="M10 17l5-5-5-5m5 5H3m9-9h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/>'});
const ico=(name, size=20)=>`<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]||iconPaths.spark}</svg>`;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nameOf=v=>String(v||'').trim().split(' ')[0]||'alguém';
const handleText=p=>p?.username?'@'+esc(p.username):'@ pendente';
const normalizeHandle=v=>String(v||'').trim().replace(/^@/,'').toLowerCase();
const profileShareUrl=username=>new URL('./perfil.html?u='+encodeURIComponent(username),window.location.href).href;
async function copyProfileLink(username){
 if(!username)return toast('Seu @ ainda não foi configurado.',true);
 const url=profileShareUrl(username);
 try{
  if(typeof navigator.share==='function'){await navigator.share({title:'Meu perfil no CONNECT',text:'Conheça meu perfil no CONNECT!',url});return;}
  if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);toast('Link do perfil copiado!',false,'success');return;}
  window.prompt('Copie o link do perfil:',url);
 }catch(e){if(e?.name!=='AbortError')window.prompt('Copie o link do perfil:',url);}
}
const genders={woman:'Mulher',man:'Homem',nonbinary:'Não binário',any:'Qualquer pessoa'};
const initials=name=>String(name||'?').trim().split(/\s+/).slice(0,2).map(n=>[...n][0]).join('').toUpperCase();
const colorFor=id=>['#eac8aa','#c9c1ef','#cfcfcf','#e8c0c9','#dbdfac'][([...String(id||'')].reduce((n,c)=>n+c.charCodeAt(0),0))%5];
const avatar=(person,size='')=>{
 const id=String(person?.id||'');
 const premium=window.entreExtras?.isPremium?.(id)===true, extra=premium?' premium-avatar':'', mark=premium?'<b class="avatar-verified" aria-label="Premium verificado">'+ico('check',10)+'</b>':'';
 const attrs=' data-avatar-id="'+esc(id)+'"';
 const url=avatarFresh(person)?state.avatarUrls[person.avatar_path]:null;
 if(url?.url&&(url.local||url.expires>Date.now()))
  return '<span class="avatar '+esc(size)+extra+'"'+attrs+'><img loading="eager" decoding="async" referrerpolicy="no-referrer" data-avatar-path="'+esc(person.avatar_path)+'" src="'+esc(url.url)+'" alt="Foto de '+esc(person?.display_name||'perfil')+'">'+mark+'</span>';
 return '<span class="avatar '+esc(size)+extra+'"'+attrs+' style="background:'+colorFor(person?.id)+'">'+esc(initials(person?.display_name))+mark+'</span>';
};
try{localStorage.removeItem('connect.menu.appearance');}catch(_){}
const brand=()=>`<a href="#" class="cn-brand" data-action="logo" aria-label="CONNECT início"><img src="./connect-glass.svg?v=showcase-v17" alt="" width="49" height="26"><span>CONNECT</span></a>`;
const fmtTime=date=>new Date(date).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
const fmtDate=date=>new Date(date).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
let toastTimer;
function toast(message,error=false,sound=null){if(error)window.connectSound?.play?.('error');else if(sound)window.connectSound?.play?.(sound);const el=document.getElementById('toast');if(!el)return;el.removeAttribute('style');el.className='toast cp-notice'+(error?' is-error':'');el.innerHTML='<span class="cp-notice-icon">'+ico(error?'info':'check',18)+'</span><span class="cp-notice-text">'+esc(String(message))+'</span>';el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3500)}
const state={mode:'landing',view:'posts',isAdmin:false,siteSettings:null,session:null,profile:null,avatarUrls:{},avatarPendingFile:null,avatarPreviewUrl:null,pendingCompressedAvatarUrl:null,profileChannel:null,pairs:[],pair:null,peer:null,messages:[],searching:false,preference:'any',activeTab:'all',busy:false,roomReady:false,channel:null,searchLoop:null,timerLoop:null,closedOnce:null,modal:null,signup:null,motionOff:localStorage.getItem('entre.motionOff')==='1',notice:null,suspension:null,liveMode:'chat',liveFiltersOpen:false,profileMenuOpen:false,motionForce:localStorage.getItem('entre.motionForce')==='1',motionLevel:(['light','medium','high'].includes(localStorage.getItem('entre.motionLevel'))?localStorage.getItem('entre.motionLevel'):'medium'),encounterChatMin:false};
function applyMotion(){const level=['light','medium','high'].includes(state.motionLevel)?state.motionLevel:'medium';if(window.connectMotionPolicy){window.connectMotionPolicy.apply(level,state.motionOff);return;}document.documentElement.dataset.motionLevel=level;document.documentElement.dataset.connectMotion=state.motionOff?'off':'on';document.body.classList.toggle('motion-off',state.motionOff);document.body.classList.toggle('motion-force',!state.motionOff);}
function infoError(e){
 const m=String(e?.message||e||'Não foi possível concluir. Tente novamente.');
 if(/invalid login credentials|invalid_credentials/i.test(m))return 'E-mail ou senha incorretos.';
 if(/email not confirmed|email_not_confirmed/i.test(m))return 'Confirme seu e-mail antes de entrar. Verifique a caixa de entrada e o spam.';
 if(/weak.password|password.*(weak|short)|should be at least/i.test(m))return 'Senha muito fraca. Use pelo menos 12 caracteres, com letras e números.';
 if(/email signups are disabled|signup.*disabled/i.test(m))return 'O cadastro por e-mail precisa ser habilitado no Supabase Authentication.';
 if(/rate limit|too many requests/i.test(m))return 'Muitas tentativas. Aguarde um pouco.';
 if(/entre_profiles_username_lower_uidx|username.*duplicate key|username.*already exists/i.test(m))return 'Este @ já está em uso. Escolha outro.';
 if(/Failed to fetch|NetworkError|network request failed/i.test(m))return 'Sem conexão com o serviço de login. Confira sua internet e tente de novo.';
 return m;
}
function landing(){if(window.connectShowcase?.render)return window.connectShowcase.render(brand,ico);return `
<header class="cn-public-header cn-public-v7"><div class="cn-wrap cn-public-bar">${brand()}<nav><a href="#como-funciona">Como funciona</a><a href="#experiencia">Experiência</a></nav><div class="cn-cta"><button type="button" class="cn-outline" data-action="login">Entrar</button><button type="button" class="cn-primary" data-action="signup">Criar conta</button></div></div></header>
<main class="cn-landing cn-public-v7"><section class="cn-wrap cn-public-hero"><div class="cn-copy"><span class="cn-public-tag"><i></i> CONHEÇA. CONVERSE. CONECTE-SE.</span><h1>Um encontro.<br>Infinitas <em>possibilidades.</em></h1><p>Conheça alguém novo em cinco minutos, por texto ou vídeo. Continue se a conexão for dos dois.</p><div class="cn-cta"><button type="button" class="cn-primary" data-action="signup">Começar agora ${ico('arrow',18)}</button></div><small>18+ · Encontros privados · Escolha mútua</small></div><div class="cn-art cn-art-fade"><img src="./connect-hero-fade.avif?v=1" width="1200" height="900" fetchpriority="high" alt="Duas pessoas conectadas por uma fita tridimensional"></div></section>
<section id="como-funciona" class="cn-wrap cn-how-v7"><div class="cn-section-title"><small>COMO FUNCIONA</small><h2>Três passos. Uma conexão.</h2></div><div class="cn-how-grid"><article><b>01</b><span>${ico('chat',30)}</span><h3>Escolha</h3><p>Texto ou vídeo.</p></article><article><b>02</b><span>${ico('clock',30)}</span><h3>Converse</h3><p>Cinco minutos para se conhecer.</p></article><article><b>03</b><span>${ico('heart',30)}</span><h3>Conecte-se</h3><p>Os dois decidem se continuam.</p></article></div></section>
<section class="cn-wrap cn-demo" id="experiencia"><div class="cn-section-title"><small>ALÉM DOS ENCONTROS</small><h2>Seu espaço para estar perto.</h2></div><div class="cn-demo-grid"><article><img src="./preview-encounter.svg" loading="lazy" alt="Prévia da interface de encontros"><h3>Encontros ao vivo</h3><p>Uma conversa por vez.</p></article></div></section></main><footer class="cn-footer cn-public-v7"><div class="cn-wrap">${brand()}<small>© 2026 CONNECT · 18+</small><nav><a href="./instalar.html">Instalar</a> · <a href="./dados.html">Seus dados</a> · <a href="./privacidade.html">Privacidade</a> · <a href="./termos.html">Termos</a> · <a href="./parcerias.html">Parcerias e patrocínios</a></nav></div></footer>`}

function connectFeatureTiles(publicPage=false){return [['camera','Chamada de vídeo','Converse cara a cara.','connect'],['bolt','Rápido e prático','Cinco minutos.','connect'],['shield','Privacidade','A escolha é dos dois.','settings'],['crown','Mais recursos','CONNECT Premium.','premium']].map(([icon,title,detail,view])=>`<button type="button" class="cn-feature" data-action="${publicPage?'signup':'nav'}" data-view="${view}"><span class="cn-feature-icon">${ico(icon,22)}</span><span><strong>${title}</strong><small>${detail}</small></span></button>`).join('')}

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
 ctx.fillStyle='#1b1b1b';ctx.fillRect(0,0,p.side,p.side);
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
  if(c.inlineUid){await saveInlineAvatar(cropped,c.inlineUid);if(activeImageCrop===c)closeImageCrop();return;}
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
 const c={dialog,canvas,image,sourceUrl,inlineUid:options.inlineUid||null,zoom:1,dx:0,dy:0,pointers:new Map(),lastPinch:null,saving:false};
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
 const all=[state.profile,state.peer,...Object.values(state.pairsProfiles||{}),...(window.entreSocial?.data?.online||[]),...(window.entreSocial?.data?.follows||[]),...(window.entreSocial?.data?.chats||[])];
 const seen=new Set();
 await Promise.all(all.filter(p=>{
  if(!avatarFresh(p)||seen.has(p.avatar_path))return false;
  seen.add(p.avatar_path);
  return true;
 }).map(p=>signAvatar(p)));
}
// Restore a readable avatar and retry once if a short-lived signed URL fails.
document.addEventListener('error',event=>{
 const img=event.target;
 if(!(img instanceof HTMLImageElement)||!img.closest('[data-avatar-id]'))return;
 const parent=img.closest('[data-avatar-id]');
 const person=[state.profile,state.peer,...Object.values(state.pairsProfiles||{}),...(window.entreSocial?.data?.online||[])].find(p=>p?.id===parent?.dataset.avatarId);
 img.replaceWith(document.createTextNode(initials(person?.display_name)));
 if(!person?.avatar_path||!state.session||maintenanceIsActive())return;
 const path=person.avatar_path;
 state.avatarRetries ||= {};
 if(Date.now()-(state.avatarRetries[path]||0)<90000)return;
 state.avatarRetries[path]=Date.now();
 void signAvatar(person,true);
},true);
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
 const path=p.avatar_path,owner=state.session?.user?.id;
 const existing=state.avatarUrls[path];
 if(!force&&existing&&!existing.local&&existing.expires>Date.now()+100000)return true;
 try{
  // Signed links are short lived. The bucket itself remains private.
  const {data,error}=await db.storage.from(AVATAR_BUCKET).createSignedUrl(path,300);
  if(error)throw error;
  if(!data?.signedUrl)throw Error('O Storage não retornou a foto.');
  if(state.session?.user?.id!==owner)return false;
  state.avatarUrls[path]={url:data.signedUrl,expires:Date.now()+260000,local:false};
  refreshAvatarElements(p);
  if(existing?.local)setTimeout(()=>URL.revokeObjectURL(existing.url),30000); // Keep the preview until the signed photo loads.
  return true;
 }catch(e){
  console.warn('Falha ao abrir foto privada:',e?.message||e);
  // The freshly compressed image still appears immediately in the owner's UI.
  return state.session?.user?.id===owner&&Boolean(existing?.url);
 }
}
function avatarUploader(p){
 const url=state.avatarPreviewUrl||(avatarFresh(p)?state.avatarUrls[p?.avatar_path]?.url:'');
 const label=p?.avatar_path?'Trocar foto':'Adicionar foto';
 return '<div class="avatar-uploader"><div class="avatar-photo-preview">'
 +(url?'<img src="'+esc(url)+'" alt="Prévia da foto de perfil">':'<span aria-hidden="true">'+esc(initials(p?.display_name||'Eu'))+'</span>')
 +'</div><div class="avatar-uploader-info"><strong>'+label+'</strong><p>Escolha uma foto para seu perfil.</p>'
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
 toast('Foto removida do perfil.',false,'delete');
}

function authView(){const signup=state.mode==='signup';const onboard=state.mode==='onboard';const forgot=state.mode==='forgot';const reg=onboard;const data=state.signup||{};const needsConsent=onboard&&state.signupConsent!==true;return `<div class="auth-shell cx-auth-shell ${onboard?'cx-onboard':signup?'cx-signup-refined':''}"><aside class="auth-visual cx-auth-visual">${brand()}<div class="cx-auth-editorial"><span>O CONNECT COMEÇA COM VOCÊ</span><h2>Conheça. Converse.<br>Continue.</h2><p>O seu espaço para conhecer pessoas e compartilhar momentos.</p></div><div class="connect-auth-emblem"><img src="./connect-glass.svg?v=showcase-v17" alt="" width="160" height="107"></div></aside><main class="auth-main"><div class="auth-card"><div class="hidden-mobile-brand">${brand()}</div><div class="connect-auth-mode">${window.entreTheme?.toggleMarkup?.()||''}</div>
${signup||onboard?`<div class="cx-auth-steps" aria-label="Etapas de cadastro"><div class="${onboard?'done':'current'}"><span>${onboard?ico('check',15):'1'}</span><strong>Conta</strong></div><i aria-hidden="true"></i><div class="${onboard?'current':''}"><span>2</span><strong>Perfil</strong></div><i aria-hidden="true"></i><div><span>3</span><strong>Plano</strong></div></div>`:''}${onboard?'':`<button class="auth-back" data-action="landing">${ico('back',17)} Voltar ao início</button>`}<h1>${onboard?'Complete seu perfil':signup?'Criar conta':forgot?'Recuperar acesso':'Entrar'}</h1><p class="auth-sub">${onboard?'Personalize seu perfil para começar.':signup?'Primeiro, crie seus dados de acesso.':forgot?'Vamos enviar um link para você redefinir sua senha.':'Entre com seu e-mail e senha.'}</p><div id="form-error" class="hidden form-error" role="alert"></div><div id="form-success" class="hidden form-success" role="status"></div>
${onboard?`<div class="auth-verified">${ico("mail",22)}<span>Conta de e-mail conectada</span></div>`:``}${onboard&&state.isAdmin?`<a class="admin-entry" href="./admin/">${ico("shield",16)} Acessar o painel administrativo ${ico("arrow",16)}</a>`:""}<form id="authForm" data-form="${onboard?'profileSetup':signup?'signup':forgot?'forgot':'login'}">${onboard?`<div class="cx-onboard-media"><div class="cx-onboard-cover"><div class="cp-banner" data-cp-owner aria-label="Prévia do banner"></div><button type="button" class="cx-cover-edit" data-action="profileInlineMedia" data-field="banner">${ico('edit',15)} Adicionar banner</button><input hidden id="cpBannerFile" type="file" accept="image/jpeg,image/png,image/webp"></div>${avatarUploader(state.profile)}<small>Foto e banner opcionais. As imagens são comprimidas antes do envio.</small></div>`:''}<div class="form-grid ${reg?'cx-profile-grid':''}">${reg?`<div class="field full"><label for="newusername">Nome de usuário</label><input id="newusername" name="username" required autocapitalize="none" autocomplete="off" spellcheck="false" minlength="3" maxlength="20" pattern="[a-zA-Z][a-zA-Z0-9_]{2,19}" placeholder="ex.: lucas123" value="${esc(data.username||'')}"><small class="handle-helper">3 a 20 caracteres, começando com uma letra.</small><span class="username-feedback" role="status"></span></div>`:``}${reg?`<div class="field full"><label for="display_name">Seu nome</label><input id="display_name" name="display_name" maxlength="42" minlength="2" required autocomplete="nickname" placeholder="Seu nome" value="${esc(data.display_name||'')}"></div>`:''}${reg?`<div class="field"><label for="age">Sua idade</label><input id="age" name="age" type="number" min="18" max="100" required placeholder="18+" value="${esc(data.age||'')}"></div><div class="field"><label for="gender">Você se identifica como</label><select id="gender" name="gender" required>${options({woman:'Mulher',man:'Homem',nonbinary:'Não binário'},data.gender||'')}</select></div><input type="hidden" name="preference" value="any"><div class="cx-premium-register-note">${ico('lock',16)}<span>O filtro de gênero no Ao vivo é exclusivo do Premium. Você começará conhecendo qualquer pessoa.</span></div>`:''}</div>${needsConsent?`<section class="cx-signup-consent"><div class="cx-consent-title">${ico('shield',19)}<div><strong>Antes de continuar</strong><small>Confirme os documentos vigentes.</small></div></div><label class="checkbox-line"><input type="checkbox" name="adult" required><span>Declaro que tenho 18 anos ou mais.</span></label><label class="checkbox-line"><input type="checkbox" name="terms" required><span>Li e aceito os <a href="./termos.html" target="_blank" rel="noopener">Termos de uso</a> e a <a href="./privacidade.html" target="_blank" rel="noopener">Política de privacidade</a> (25/11/2026).</span></label></section>`:''}${onboard?`<button class="ui-btn btn-dark" type="submit" id="authSubmit">Finalizar meu perfil ${ico('arrow',18)}</button>`:`${window.entreEmailAuth.fields(signup,forgot)}`}</form>${!onboard?`<div class="auth-switch">${signup?'Já tem conta?':forgot?'Lembrou sua senha?':'Ainda não tem conta?'} <button class="text-link" data-action="${signup||forgot?'login':'signup'}">${signup||forgot?'Entrar':'Criar conta'}</button></div>`:''}<p class="legal-note" style="margin-top:29px">Não compartilhe dados sensíveis nos chats. A idade é autodeclarada.</p></div></main></div>`}
function options(dict,selected){return Object.entries(dict).map(([key,value])=>`<option value="${key}" ${selected===key?'selected':''}>${esc(value)}</option>`).join('')}
// Public camera broadcasts are preserved but temporarily unavailable.
const PUBLIC_LIVES_ENABLED=false;
const tabs=[['posts','Início','home'],['moments','Moments','camera'],['discover','Descobrir','users'],['connect','Ao vivo','bolt'],['rooms','Salas','rooms'],...(PUBLIC_LIVES_ENABLED?[['lives','Lives','camera']]:[]),['conversations','Conversas','chat'],['online','Online','users'],['search','Pesquisar','search'],['premium','Premium','crown'],['settings','Configurações','settings'],['profile','Perfil','user']];
const mobileTabs=['posts','connect','moments','rooms','conversations'];
const secondaryTabs=[...(PUBLIC_LIVES_ENABLED?[['lives','Lives','camera']]:[]),['online','Online','users'],['discover','Descobrir','users']];
const accountTabs=[['profile','Meu perfil','user'],['settings','Configurações','settings'],['premium','Assinatura Premium','crown'],['support','Relatar problema','flag'],['protocols','Meus protocolos','protocol'],['soon','Em breve','clock'],['shareapp','Compartilhar aplicativo','shareApp'],['partnerships','Parcerias e patrocínios','partners']];
function navButton(view,label,icon,mobile=false){const active=state.view===view||(state.view==='chat'&&view==='conversations');const count=view==='conversations'?(window.connectRelationships?.total?.()||0):0;return `<button type="button" data-action="nav" data-view="${view}" class="cn-nav-link ${active?'is-active':''} ${view==='connect'?'cn-live-nav':''}" ${active?'aria-current="page"':''} aria-label="${esc(label)}"><span class="cn-nav-icon">${mobile&&view==='profile'?avatar(state.profile):ico(icon,20)}</span><span class="cn-nav-label">${label}</span>${view==='conversations'?`<span class="cn-count cp-chat-count" data-chat-unread-total ${count?'':'hidden'}>${count>99?'99+':count||''}</span>`:''}</button>`}
function activeEncounter(){
 return state.pair?.status==='active'&&new Date(state.pair.expires_at).getTime()>Date.now();
}

function encounterMiniMarkup(){
 if(!activeEncounter()||['connect','chat'].includes(state.view))return '';
 const pair=state.pair,peer=state.peer||{display_name:'Sua conexão'};
 if(pair.mode==='video')return window.entreVideo?.miniMarkup?.(pair,peer)||'';
 return `<aside class="encounter-floating encounter-floating-chat" role="status" aria-label="Encontro temporário em andamento">
 <span class="encounter-floating-pulse" aria-hidden="true"></span>
 <div class="encounter-floating-info"><strong>Chat com ${profileName(peer.id,peer.display_name,peer.username)}</strong><small>Encontro ativo · <span class="timer-text">05:00</span> restantes</small></div>
 <button type="button" class="encounter-floating-return" data-action="nav" data-view="connect">Voltar ao chat ${ico('arrow',15)}</button>
 </aside>`;
}

function compactEncounterView(pair,peer,ownVote,otherVote){
 const video=pair.mode==='video',chatOpen=!video||state.encounterChatMin===false;
 const voteText=ownVote===true?'Aguardando a outra pessoa':otherVote===true?'A outra pessoa quer continuar':'Continuar após o encontro?';
 const decision=ownVote===true?'<span class="ce-vote-wait">'+ico('check',16)+' '+voteText+'</span>':'<span class="ce-vote-label">'+voteText+'</span><div class="ce-vote-buttons"><button type="button" class="ce-control ce-yes" data-action="vote" data-value="yes">'+ico('heart',17)+'<span>Continuar</span></button></div>';
 return `<section class="ce-session ${video?'ce-video':'ce-text'} ${chatOpen?'ce-chat-open':''}" aria-label="Encontro temporário">
 <header class="ce-head"><div class="ce-person">${avatar(peer)}<div><strong>${profileName(peer.id,peer.display_name,peer.username)}${peer.age?', '+peer.age:''}</strong><small>${video?'Videochamada':'Chat temporário'}</small></div></div><span class="ce-timer timer-text" aria-label="Tempo restante">05:00</span><button class="ce-control ce-icon" type="button" data-action="nav" data-view="home" title="Minimizar encontro" aria-label="Minimizar encontro"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4H4v4m12 12h4v-4M4 4l6 6m10 10-6-6"/></svg></button><button class="ce-control ce-end ce-icon" type="button" data-action="endpair" aria-label="Encerrar encontro" title="Encerrar encontro">${ico('phone-off',19)}</button></header>
 <div class="ce-workspace">${video?'<div class="ce-stage">'+(window.entreVideo?.markup?.(pair)||'')+'</div>':''}
 <div class="ce-chat" ${chatOpen?'':'hidden'} aria-label="Mensagens temporárias"><div class="ce-chat-caption">${ico('lock',13)} <span>Privado · só permanece com aceite mútuo</span><button type="button" class="cx-ice" data-cx-next="ice">Quebra-gelo</button>${window.connectNext?.extensionMarkup(pair)||""}</div><div id="messageList" class="pair-messages ce-messages" aria-label="Mensagens">${window.entreSocial?.historyButton?.()||''}${state.messages.length?messagesMarkup(peer):'<div class="ce-empty">'+ico('chat',28)+'<strong>Vocês estão conectados.</strong><small>Envie um oi para começar.</small></div>'}${window.entreChatMedia?.gallery?.()||''}</div><div class="ce-composer">${window.entreChatMedia?.controls?.()||''}<form id="messageForm" class="chat-form ce-form"><label class="sr-only" for="messageInput">Mensagem</label><input id="messageInput" autocomplete="off" maxlength="1500" placeholder="Mensagem…" required><button class="ce-control ce-yes ce-icon" type="submit" aria-label="Enviar mensagem">${ico('send',20)}</button></form></div></div></div>
 <footer class="ce-footer"><div class="ce-tools">${video?`<button class="ce-control ce-chat-button" type="button" data-action="toggleEncounterChat" aria-expanded="${chatOpen}" aria-label="${chatOpen?'Ocultar chat':'Abrir chat'}">${ico('chat',18)}<span class="ce-chat-label">${chatOpen?'Fechar':'Chat'}</span></button>`:''}<button class="ce-control ce-icon" type="button" data-action="report" title="Denunciar" aria-label="Denunciar">${ico('flag',18)}</button><button class="ce-control ce-icon" type="button" data-action="block" title="Bloquear" aria-label="Bloquear">${ico('shield',18)}</button><span class="ce-private">${ico('lock',13)} Privado</span></div><div class="ce-decision">${decision}</div></footer>
 </section>`;
}
function connectMenuRow(view,label,icon){const sub={profile:'Veja e edite seu perfil',settings:'Aparência, sons e privacidade',premium:'Benefícios e assinatura',support:'Envie um relato à equipe',soon:'Recursos que ainda vão chegar',shareapp:'Convide seus amigos',partnerships:'Contato exclusivo para marcas e parceiros'};return `<button type="button" class="cn-menu-item nx-account-row" data-action="nav" data-view="${view}"><span class="nx-menu-icon">${ico(icon,21)}</span><span class="nx-menu-copy"><strong>${esc(label)}</strong><small>${esc(sub[view]||'')}</small></span>${ico('chevron',16)}</button>`}
function connectMenuMarkup(){return `<dialog class="cn-account-dialog" id="cnAccountMenu" aria-labelledby="cnAccountTitle"><div class="cn-account-head"><div>${avatar(state.profile,'large')}<div><h2 id="cnAccountTitle">${esc(state.profile.display_name)}</h2><small>${handleText(state.profile)}</small></div></div><button type="button" class="cn-icon-button" data-action="profileMenuClose" aria-label="Fechar menu da conta">${ico('close',21)}</button></div><div class="cn-account-body"><div class="nx-menu-heading">Sua conta</div>${accountTabs.map(t=>connectMenuRow(...t)).join('')}<button type="button" class="cn-menu-item" data-action="copyUsernameLink" data-username="${esc(state.profile.username||'')}">${ico('link',20)}<span>Compartilhar perfil</span>${ico('chevron',16)}</button>${state.isAdmin?`<a class="cn-menu-item cn-admin-link" href="./admin/">${ico('adminPanel',20)}<span>Entrar no painel</span>${ico('arrow',16)}</a>`:''}<div class="cn-menu-divider"></div><a class="cn-menu-item" href="./instalar.html"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M12 6v8m-3-3 3 3 3-3m-5 8h4"/></svg><span>Instalar aplicativo</span>${ico('chevron',16)}</a><div class="nx-menu-heading">Segurança</div><a class="cn-menu-item" href="./dados.html">${ico('shield',20)}<span>Privacidade e dados</span>${ico('chevron',16)}</a><button type="button" class="cn-menu-item nx-account-row cp-delete-account-menu" data-action="delete1"><span class="nx-menu-icon">${ico('trash',21)}</span><span class="nx-menu-copy"><strong>Excluir conta</strong><small>Remover permanentemente seus dados</small></span>${ico('chevron',16)}</button><button type="button" class="cn-menu-item cn-signout" data-action="logout">${ico('exit',20)}<span>Sair da conta</span></button></div></dialog>`}
function setConnectMenu(open,kind='account'){const menuId=kind==='more'?'cnMoreMenu':'cnAccountMenu';const triggerId=kind==='more'?'cnMoreTrigger':'cnAccountTrigger';for(const id of ['cnAccountMenu','cnMoreMenu']){const d=document.getElementById(id);if(!d)continue;const shouldOpen=Boolean(open)&&id===menuId;if(d.open&&!shouldOpen){if(typeof d.close==='function')d.close();else d.removeAttribute('open')}else if(shouldOpen&&!d.open){if(typeof d.showModal==='function')d.showModal();else d.setAttribute('open','');d.querySelector('[data-action="profileMenuClose"]')?.focus()}}state.profileMenuOpen=Boolean(open)&&kind==='account';document.getElementById('cnAccountTrigger')?.setAttribute('aria-expanded',String(Boolean(open)&&kind==='account'));document.getElementById('cnMoreTrigger')?.setAttribute('aria-expanded',String(Boolean(open)&&kind==='more'));if(!open&&document.getElementById(triggerId)?.isConnected)document.getElementById(triggerId)?.focus()}
function appLayout(){const label=({home:'Início',online:'Online',moments:'Moments',discover:'Descobrir',connect:'Ao vivo',conversations:'Conversas',chat:'Conversa',posts:'Início',rooms:'Salas',lives:'Lives',premium:'Assinatura Premium',appearance:'Aparência',checkout:'Finalizar compra',search:'Pesquisar',settings:'Configurações',profile:'Meu perfil',notifications:'Notificações',avisos:'Avisos oficiais',support:'Relatar problema',protocols:'Meus protocolos',soon:'Em breve',shareapp:'Compartilhar aplicativo',partnerships:'Parcerias e patrocínios'})[state.view]||'Início';const mobile=mobileTabs.map(v=>tabs.find(t=>t[0]===v)).filter(Boolean);const dockTabs=[...mobile,...secondaryTabs];return `<div class="cn-shell app-shell"><aside class="cn-sidebar" aria-label="Menu principal"><div class="cn-side-brand">${brand()}</div><nav class="cn-side-nav" aria-label="Navegação principal">${mobile.map(t=>navButton(...t)).join('')}<div class="cn-side-group">Comunidade</div>${secondaryTabs.map(t=>navButton(...t)).join('')}</nav><div class="cn-side-footer"><div class="cn-side-group">Conta</div>${accountTabs.filter(t=>t[0]!=='profile').map(t=>navButton(...t)).join('')}${state.isAdmin?`<a class="cn-nav-link" href="./admin/"><span class="cn-nav-icon">${ico('shield',20)}</span><span class="cn-nav-label">Painel administrativo</span></a>`:''}<button type="button" class="cn-side-profile" data-action="nav" data-view="profile">${avatar(state.profile)}<span><strong>${esc(state.profile.display_name)}</strong><small>${handleText(state.profile)}</small></span>${ico('chevron',16)}</button></div></aside><main class="cn-main app-main"><header class="cn-toolbar"><div class="cn-toolbar-title"><h1>${label}</h1></div><div class="cn-toolbar-actions">${window.entreTheme?.toggleMarkup?.()||''}<button type="button" class="cn-icon-button toolbar-bell" data-action="nav" data-view="notifications" aria-label="Notificações">${ico('bell',21)}<span class="social-unread">${window.entreSocial?.data?.unread||''}</span></button><button id="cnAccountTrigger" type="button" class="cn-account-trigger" data-action="profileMenu" aria-label="Abrir menu da conta" aria-controls="cnAccountMenu" aria-expanded="false">${avatar(state.profile)}<span class="cn-account-chevron">${ico('chevron',14)}</span></button></div></header><div id="view-content" class="cn-view scene-enter" data-section="${esc(state.view)}">${viewContent()}</div></main><nav class="cn-bottom-nav cn-dock" aria-label="Navegação principal"><div class="cn-dock-viewport" tabindex="0" aria-label="Arraste para ver todas as abas"><div class="cn-dock-track">${dockTabs.map(t=>navButton(...t,true)).join('')}</div></div><div class="cn-dock-fade cn-dock-fade-left" aria-hidden="true"></div><div class="cn-dock-fade cn-dock-fade-right" aria-hidden="true"></div></nav>${connectMenuMarkup()}</div>${encounterMiniMarkup()}${state.modal?modalView():''}`}
function heading(kicker,title,detail=''){return detail?`<p class="cn-section-description">${esc(detail)}</p>`:''}
function avisosView(){return window.entreSocial?.bulletinsView?.()||heading('COMUNICADOS DA PLATAFORMA','Avisos <em>oficiais.</em>','Carregando publicações da administração.');}
function featureView(renderer){if(typeof renderer==='function')return renderer();return `<div class="cn-feature-unavailable" role="status">${ico('refresh',25)}<h2>Não foi possível carregar esta área</h2><p>Atualize a página para tentar novamente.</p><button type="button" class="ui-btn btn-outline" data-action="retryArea">Tentar novamente</button></div>`}
function comingSoonView(){return '<section class="cp-soon"><header><span class="cp-soon-kicker">NOVIDADES DO CONNECT</span><h2>Em breve</h2><p>Novos recursos para compartilhar momentos e se conectar.</p></header><article class="cp-soon-card"><span class="cp-soon-icon">'+ico('camera',26)+'</span><div><h3>Stories</h3><p>Compartilhe fotos e vídeos do seu dia que desaparecem após 24 horas. O recurso está em desenvolvimento e ainda não está disponível.</p></div><span class="cp-soon-status">Em breve</span></article><article class="cp-soon-card"><span class="cp-soon-icon">'+ico('camera',26)+'</span><div><h3>Lives</h3><p>Transmissões públicas de vídeo com participantes e convidados. O recurso está temporariamente indisponível e será retomado futuramente.</p></div><span class="cp-soon-status">Em breve</span></article></section>'}
function viewContent(){const pages={moments:()=>window.connectNext?.momentsView()||'',discover:()=>window.connectNext?.discoverView()||'',home:()=>featureView(window.entreExtras?.postsView),search:()=>featureView(window.entreSearch?.view),rooms:()=>featureView(window.entreRooms?.view),lives:()=>PUBLIC_LIVES_ENABLED?featureView(window.entreLives?.view):comingSoonView(),connect:connectView,online:()=>featureView(window.entreSocial?.onlineView),conversations:()=>window.entreSocial?.conversationsView?.()||conversationsView(),chat:()=>state.pair?pairView():conversationsView(),posts:()=>featureView(window.entreExtras?.postsView),premium:()=>featureView(window.entreExtras?.premiumView),checkout:()=>featureView(window.entreExtras?.checkoutView),support:()=>featureView(window.entreExtras?.supportView),protocols:()=>featureView(window.entreExtras?.protocolsView),avisos:avisosView,notifications:()=>featureView(window.entreSocial?.notificationsView),profile:profileView,settings:settingsView,appearance:settingsView,soon:comingSoonView,shareapp:()=>window.connectRelationships?.shareView?.()||'',partnerships:()=>window.connectPartnerships?.view?.()||''};return (pages[state.view]||pages.posts)()}
function emptyConvos(){return `<div class="empty-list">${ico('heart',31)}<h4>Nenhuma conversa permanente.</h4><p>Se os dois aceitarem continuar, a conversa fica salva.</p><button class="ui-btn btn-outline btn-sm" data-action="nav" data-view="connect">Encontrar alguém ${ico('arrow',16)}</button></div>`}
function profileTarget(id,username=''){return ' data-cp-user="'+esc(id||'')+'" data-cp-handle="'+esc(username||'')+'"';}
function profileName(id,name,username=''){return '<span class="cp-person-link"'+profileTarget(id,username)+'>'+esc(name||'Pessoa')+'</span>';}
function renderConversationRow(pair){if(window.entreSocial?.conversationRow)return window.entreSocial.conversationRow(pair);const other=state.pairsProfiles?.[pair.id]||{display_name:'Sua conexão',id:pair.a===state.session?.user.id?pair.b:pair.a};return `<button class="convo-card" data-action="openpair" data-id="${pair.id}">${avatar(other)}<div><strong>${profileName(other.id,other.display_name,other.username)}</strong><p>${pair.status==='connected'?'Conexão recíproca · conversa liberada':'Encontro encerrado · histórico de texto'}</p></div><div class="right">${ico('chevron')}</div></button>`}
let searchQuota=null,searchQuotaOwner=null,searchQuotaBusy=false;
function applySearchQuota(quota,owner=state.session?.user?.id){if(!quota||!owner||owner!==state.session?.user?.id)return;searchQuota=quota;searchQuotaOwner=owner;}
function currentSearchQuota(){return searchQuotaOwner===state.session?.user?.id&&Date.parse(searchQuota?.reset_at)>Date.now()?searchQuota:null;}
function premiumNotice(feature='Este recurso'){
 const old=document.getElementById('connectPremiumNotice');if(old)old.remove();
 const d=document.createElement('dialog');d.id='connectPremiumNotice';d.className='cp-premium-notice';d.setAttribute('aria-label','Recurso Premium');
 d.innerHTML='<div class="cp-premium-notice-head"><span>'+ico('crown',22)+'</span><button type="button" data-premium-close aria-label="Fechar">'+ico('close',19)+'</button></div><h2>Exclusivo do Premium</h2><p>'+esc(feature)+' faz parte do plano pago. Conheça os benefícios se quiser.</p><div class="cp-premium-notice-actions"><button type="button" data-premium-close>Agora não</button><button type="button" data-premium-plans>Ver plano '+ico('arrow',15)+'</button></div>';
 d.addEventListener('click',e=>{if(e.target===d||e.target.closest('[data-premium-close]'))d.close();else if(e.target.closest('[data-premium-plans]')){d.close();nav('premium');}});d.addEventListener('close',()=>d.remove(),{once:true});document.body.append(d);d.showModal();
}
window.connectPremiumNotice=premiumNotice;
function quotaMarkup(){
 const q=currentSearchQuota();if(!q)return '<div class="cp-search-quota" id="connectSearchQuota"><span>'+ico('clock',14)+' 50 encontros por dia no plano Normal</span></div>';
 if(q.unlimited)return '<div class="cp-search-quota" id="connectSearchQuota"><span>'+ico('crown',14)+' Buscas ilimitadas · Premium</span></div>';
 const left=Math.max(0,Math.min(50,Number(q.remaining)||0));return '<div class="cp-search-quota" id="connectSearchQuota"><span>'+ico('clock',14)+' <strong>'+left+'/50</strong> encontros restantes hoje</span>'+(left===0?'<button type="button" data-action="nav" data-view="premium">Ver Premium '+ico('chevron',13)+'</button>':'')+'</div>';
}
function paintSearchQuota(){const el=document.getElementById('connectSearchQuota');if(el)el.outerHTML=quotaMarkup();const offer=document.getElementById('connectQuotaOffer');if(offer)offer.outerHTML=quotaOfferMarkup();}
async function refreshSearchQuota(){
 const uid=state.session?.user?.id;if(!uid||!state.profile||searchQuotaBusy||maintenanceIsActive())return;searchQuotaBusy=true;
 try{const {data,error}=await db.rpc('connect_search_quota');if(error)throw error;applySearchQuota(data,uid);paintSearchQuota();}catch(e){console.warn('Search quota unavailable');}finally{searchQuotaBusy=false;}
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.view==='connect')void refreshSearchQuota();});
setInterval(()=>{if(!document.hidden&&state.view==='connect'&&state.session?.user&&!activeEncounter()&&!state.searching)void refreshSearchQuota();},60000);
function quotaOfferMarkup(){
 const q=currentSearchQuota();if(!q||q.unlimited||Number(q.remaining)!==0||state.searching)return '<div id="connectQuotaOffer" hidden></div>';
 const cents=window.entreExtras?.data?.premium?.price_cents,price=Number.isInteger(cents)&&cents>0?(cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'';
 return '<article class="cp-quota-offer" id="connectQuotaOffer"><span class="cp-quota-crown">'+ico('crown',20)+'</span><div><small>CONNECT PREMIUM</small><strong>Continue conhecendo pessoas</strong><p>Você usou os 50 encontros de hoje. Com Premium, texto e vídeo são ilimitados. '+(price?esc(price)+' / mês.':'')+'</p><button type="button" data-action="nav" data-view="premium">Conhecer plano Premium '+ico('arrow',15)+'</button></div></article>';
}
function connectView(){
 if(state.pair?.status==='active')return pairView();
 const waiting=state.searching,isPremium=window.entreExtras?.isPremium?.(state.session?.user?.id)===true;
 const mode=state.liveMode||'chat';
 const geo=window.entreGeo?.details?.();
 const area=({any:'Todo o Brasil',my_state:'Meu estado',my_city:'Minha cidade',other_state:'Outro estado',other_city:'Outra cidade'})[geo?.targetMode]||'Todo o Brasil';
 const preference=({any:'Todos',woman:'Mulheres',man:'Homens',nonbinary:'Não binárias'})[state.preference]||'Todos';
 const filters=Object.entries({any:'Todos',woman:'Mulheres',man:'Homens',nonbinary:'Não binárias'}).map(([k,v])=>
  '<button type="button" '+(waiting?'disabled':'')+' data-action="'+(!isPremium&&k!=='any'?'upgradeFilter':'filter')+'" data-value="'+k+'" class="chip '+(state.preference===k?'active':'')+(!isPremium&&k!=='any'?' chip-locked':'')+'">'+(k!=='any'&&!isPremium?ico('lock',12):'')+v+'</button>').join('');
 return '<section class="connect-app-screen connect-action-first" aria-label="Encontros ao vivo">'+
  '<div class="live-app-card cn-unified-match cp-match-full"><div class="cp-match-top"><span class="cp-match-duration">'+ico('clock',14)+' Encontros de 5 min</span><button type="button" class="cp-match-filter-button" data-action="liveFiltersOpen" aria-haspopup="dialog" aria-expanded="'+String(state.liveFiltersOpen)+'" aria-controls="liveFilterSheet" '+(waiting?'disabled':'')+'>'+ico('sliders',18)+' Filtros'+((state.preference!=='any'||geo?.targetMode&&geo.targetMode!=='any')?'<i aria-label="Filtros ativos"></i>':'')+'</button></div><div class="cp-match-controls"><div class="cn-match-art" aria-hidden="true"><span class="cn-match-orbit"></span><span class="cn-match-node cn-match-left">'+ico('user',26)+'</span><img src="./connect-glass.svg?v=showcase-v17" alt="" width="220" height="116"><span class="cn-match-node cn-match-right">'+ico('user',26)+'</span></div>'+
  '<div class="cp-match-intro"><h2>Conheça alguém novo.</h2><p>Uma conversa de cada vez, por texto ou vídeo.</p></div><h3 class="connect-mode-label">Como quer conversar?</h3>'+
  '<div class="live-modes"><button type="button" data-action="liveMode" data-value="chat" aria-pressed="'+(mode==='chat')+'" class="live-mode '+(mode==='chat'?'selected':'')+'" '+(waiting?'disabled':'')+'>'+ico('chat',24)+'<span><strong>Texto</strong><small>Sem câmera</small></span>'+(mode==='chat'?ico('check',20):'')+'</button>'+
  '<button type="button" data-action="liveMode" data-value="video" aria-pressed="'+(mode==='video')+'" class="live-mode '+(mode==='video'?'selected':'')+'" '+(waiting?'disabled':'')+'>'+ico('camera',24)+'<span><strong>Vídeo</strong><small>Com câmera</small></span>'+(mode==='video'?ico('check',20):'')+'</button></div>'+
  (state.liveFiltersOpen?'<section class="live-app-filters cp-match-filter-sheet" id="liveFilterSheet" role="dialog" aria-modal="true" aria-label="Filtros de encontros"><header class="cp-filter-header"><button type="button" data-action="liveFiltersClose" aria-label="Voltar">'+ico('back',20)+'</button><strong>Filtros</strong><button type="button" data-action="liveFiltersClose" aria-label="Fechar filtros">'+ico('close',20)+'</button></header><div class="live-app-filter-body"><div class="filter-bar"><h3>Encontrar</h3><div class="filters">'+filters+'</div>'+(!isPremium?'<p class="premium-filter-hint">Filtro de gênero: Premium.</p>':'')+'</div>'+(window.entreGeo?.compactPanel?.(waiting)||window.entreGeo?.panel?.(waiting)||'')+'</div><div class="live-filter-footer"><button type="button" class="live-filter-find ui-btn btn-dark" data-action="liveFiltersClose">Concluir '+ico('check',17)+'</button></div></section>':'')+
  '</div><div class="cp-match-footer">'+quotaMarkup()+quotaOfferMarkup()+'<button type="button" class="live-app-find" data-action="'+(waiting?'cancelsearch':'startsearch')+'" '+(cancellingSearch?'disabled aria-busy="true"':'')+'>'+ico(waiting?'close':'bolt',19)+' '+(cancellingSearch?'Cancelando…':waiting?'Cancelar busca':'Encontrar alguém')+'</button>'+
  (waiting?'<div class="live-app-progress" role="status"><span class="live-dot"></span> '+(cancellingSearch?'Confirmando cancelamento…':cancelUnconfirmed?'Cancelamento pendente. Tente novamente.':'Buscando alguém por '+(mode==='video'?'vídeo':'texto')+'…')+'</div>':'')+
  '</div><p class="sr-only">Somente encontros encontrados contam no limite diário. Buscas canceladas sem encontrar alguém não descontam do saldo. As buscas de chat e vídeo usam filas separadas. É possível encerrar um encontro a qualquer momento.</p>'+
  '</div></section>';
}
function pairView(){const pair=state.pair, peer=state.peer||{display_name:'Nova conexão',id:pair.a===state.session?.user.id?pair.b:pair.a},connected=pair.status==='connected',archived=pair.status==='closed',meIsA=pair.a===state.session.user.id,ownVote=meIsA?pair.a_wants:pair.b_wants,otherVote=meIsA?pair.b_wants:pair.a_wants;const canChat=!archived&&!window.entreSocial?.isArchived?.(pair.id)&&(connected||new Date(pair.expires_at).getTime()>Date.now());if(pair.status==='active')return compactEncounterView(pair,peer,ownVote,otherVote);return `${activeEncounter()?'':heading(archived?'ENCONTRO ENCERRADO':connected?'A CONEXÃO É RECÍPROCA':'AGORA É ENTRE VOCÊS DOIS',archived?'O encontro <em>terminou.</em>':connected?'Vocês escolheram <em>continuar.</em>':'A conversa <em>começou.</em>',archived?'O encontro terminou. Sem match, a conversa e o contato temporário não ficam salvos.':connected?'O chat está liberado. Esta conexão agora fica nas suas conversas.':'Cinco minutos para se conhecer. Se os dois escolherem continuar, vocês poderão continuar conversando.')}
<div class="pair-card cp-permanent-chat"><div class="pair-topbar"><button type="button" class="cp-chat-back" data-action="nav" data-view="conversations" aria-label="Voltar às conversas" title="Voltar às conversas"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button><div class="pair-partner">${avatar(peer)}<div><strong>${profileName(peer.id,peer.display_name,peer.username)}${window.entreExtras?.badge?.(peer)||''}${peer.age?`, ${peer.age}`:''}</strong><small>${archived?'Histórico · somente leitura':connected?'♡ Conexão salva':'Conversa de cinco minutos'}</small></div></div><div style="display:flex;gap:8px;align-items:center">${archived?`<span class="pill">${ico('check',15)} Encerrada</span>`:connected?`<span class="pill">${ico('check',15)} Match mútuo</span>`:`<span class="pair-timer timer-text">05:00</span>`}<button class="encounter-minimize" type="button" data-action="nav" data-view="home" title="Minimizar conversa">⤢</button><button class="ui-btn btn-quiet" title="Denunciar pessoa" aria-label="Denunciar pessoa" data-action="report">${ico("flag",17)}</button><button class="ui-btn btn-quiet" title="Bloquear pessoa" aria-label="Bloquear pessoa" data-action="block">${ico('shield',17)}</button></div></div>${window.entreSocial?.chatToolbar?.(pair)||''}${connected?'<div class="cx-chat-tools"><button type="button" class="cx-next-plain" data-cx-next="chat-search">Pesquisar mensagens</button></div>':''}${window.entreVideo?.markup?.(pair)||''}<div class="pair-banner">${ico('lock',15)} ${archived?'Chat temporário encerrado':connected?'Só vocês podem acessar esta conversa.':'Conversa exclusiva entre duas pessoas · 5 minutos para decidir'}</div><div id="messageList" class="pair-messages" aria-label="Mensagens da conversa">${window.entreSocial?.historyButton?.()||""}${messagesMarkup(peer)}${window.entreChatMedia?.gallery?.()||''}</div>${canChat?`${window.entreChatMedia?.controls?.()||''}<form id="messageForm" class="chat-form"><label class="sr-only" for="messageInput">Escreva sua mensagem</label><input autocomplete="off" id="messageInput" maxlength="1500" placeholder="Diga alguma coisa legal..." required><button type="submit" class="ui-btn btn-dark" title="Enviar mensagem" aria-label="Enviar mensagem">${ico('send')}</button></form>`:`<div class="pair-banner">Este encontro terminou ou foi arquivado. O histórico pode ser consultado até expirar por inatividade.</div>`}${connected||archived?'':`<div class="decision-bar"><div><strong>Quer continuar conversando?</strong><p>${ownVote===true?'Sua escolha foi registrada. Aguardando a outra pessoa.':otherVote===true?'A outra pessoa já escolheu. E você?':'Só vira conexão se os dois disserem sim.'}</p></div><div class="buttons">${ownVote===true?`<span class="decision-note">${ico('clock',15)} Aguardando resposta</span>`:`<button class="ui-btn btn-outline btn-sm" data-action="vote" data-value="no">Agora não ${ico('close',15)}</button><button class="ui-btn btn-dark btn-sm" data-action="vote" data-value="yes">Quero continuar ${ico('heart',15)}</button>`}</div></div>`}</div><div class="cp-chat-footer" style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin:17px 4px"><small style="color:#a29d93">${archived?'Mensagens temporárias removidas.':connected?'Conversa salva.':'A contagem começa quando vocês são conectados.'}</small><button class="ui-btn btn-quiet btn-sm" data-action="${connected||archived?'nav':'endpair'}" data-view="conversations">${connected||archived?'Minhas conversas':'Encerrar encontro'} ${ico('chevron',14)}</button></div>`}
function messagesMarkup(peer){const visible=state.messages.filter(m=>!m.deleted_at);if(!visible.length){const cleared=Boolean(state.pair?.messages_cleared_at),closed=state.pair?.status==='closed';return `<div class="chat-intro">${avatar(peer,'large')}<strong>${cleared?'Mensagens anteriores removidas.':closed?'Este encontro foi encerrado.':'Vocês estão conectados.'}</strong>${cleared?'Mensagens anteriores foram removidas. A conversa inteira expira após 20 dias sem atividade.':closed?'A conexão continua no seu histórico, mas este encontro não tem mensagens disponíveis.':'Uma mensagem pode ser o começo de alguma coisa. Que tal dizer oi?'}</div>`;}return visible.map(m=>{const mine=m.sender_id===state.session?.user.id;return `<div class="bubble-row ${mine?'mine':'theirs'}"><div class="bubble"><span class="cp-message-body">${esc(m.body)}</span><time class="bubble-time">${m.edited_at&&!m.deleted_at?'Editada · ':''}${fmtTime(m.created_at)}</time></div>${mine&&!m.deleted_at&&['active','connected'].includes(state.pair?.status)?`<button type="button" class="cp-message-menu" data-message-menu="${Number(m.id)}" aria-label="Opções da mensagem">${ico('more',16)}</button>`:''}</div>`}).join('')}
function conversationsView(){const pairs=state.pairs.filter(p=>p.status==='connected');return `${heading('SINTONIA RECÍPROCA','Suas <em>conversas.</em>','Conversas salvas expiram após 20 dias sem novas mensagens ou anexos.')}${pairs.length?`<div class="convo-list">${pairs.map(renderConversationRow).join('')}</div>`:emptyConvos()}`}
function profileView(){
 const p=state.profile;
 const pencil=(key,label)=>'<button type="button" class="pi-pencil" data-action="profileInlineEdit" data-field="'+key+'" aria-label="'+label+'" title="'+label+'">'+ico('edit',16)+'</button>';
 const row=(key,label,value,input,note='')=>'<div class="pi-row"><div class="pi-row-display"><div class="pi-value"><small>'+label+'</small><div>'+value+'</div></div>'+pencil(key,'Editar '+label.toLowerCase())+'</div><form class="pi-field-form" data-inline-profile="'+key+'" hidden><label for="pi-'+key+'">'+label+'</label>'+input+(note?'<small>'+note+'</small>':'')+'<div class="pi-form-actions"><button type="button" class="ui-btn btn-outline" data-action="profileInlineCancel">Cancelar</button><button type="submit" class="ui-btn btn-dark">Salvar '+ico('check',15)+'</button></div></form></div>';
 return heading('É SOBRE QUEM VOCÊ É','Meu <em>perfil.</em>','Gerencie as informações exibidas no seu perfil.')+
 '<section class="profile-page pi-page" aria-label="Meu perfil"><article class="pi-card"><div class="pi-cover"><div class="cp-banner" data-cp-owner aria-label="Banner do perfil"></div><div class="pi-cover-tools"><button class="pi-pencil" type="button" data-action="profileInlineMedia" data-field="banner" aria-label="Editar banner" title="Editar banner">'+ico('edit',17)+'</button><button class="pi-pencil" type="button" data-cp-remove aria-label="Remover banner" title="Remover banner">'+ico('trash',16)+'</button></div><input hidden id="cpBannerFile" type="file" accept="image/jpeg,image/png,image/webp,image/gif"></div>'+
 '<div class="pi-body"><div class="pi-avatar-wrap">'+avatar(p,'xlarge')+'<button type="button" class="pi-pencil pi-avatar-pencil" data-action="profileInlineMedia" data-field="avatar" aria-label="Editar foto de perfil" title="Editar foto de perfil">'+ico('edit',17)+'</button><input hidden id="avatarFile" type="file" accept="image/jpeg,image/png,image/webp"></div>'+
 (p.avatar_path?'<button type="button" class="pi-remove-photo" data-action="removeAvatar">'+ico('trash',13)+' Remover foto</button>':'')+
 (window.connectRelationships?.stats?.(p.id,true)||'')+(window.connectProfileVisits?.markup?.()||'')+'<div class="pi-identity">'+row('display_name','Nome exibido','<strong class="pi-name">'+esc(p.display_name)+'</strong> '+(window.entreExtras?.badge?.(p)||''),'<input id="pi-display_name" name="value" minlength="2" maxlength="42" required value="'+esc(p.display_name)+'">')+
 row('username','Seu @','<strong>'+handleText(p)+'</strong>','<input id="pi-username" name="value" minlength="3" maxlength="20" pattern="[a-zA-Z][a-zA-Z0-9_]{2,19}" autocomplete="off" spellcheck="false" autocapitalize="none" required value="'+esc(p.username||'')+'">','O @ é exclusivo e pode ser alterado uma vez a cada 30 dias.')+
 row('bio','Biografia',esc(p.bio||'Nenhuma biografia adicionada.'),'<textarea id="pi-bio" name="value" maxlength="220" rows="3">'+esc(p.bio||'')+'</textarea>','Até 220 caracteres.')+
 '<div class="pi-two">'+row('age','Idade',esc(p.age)+' anos','<input id="pi-age" name="value" type="number" min="18" max="100" required value="'+esc(p.age)+'">')+
 row('gender','Identidade',esc(genders[p.gender]||''),'<select id="pi-gender" name="value">'+options({woman:'Mulher',man:'Homem',nonbinary:'Não binário'},p.gender)+'</select>')+'</div>'+
 row('preference','Preferência de busca',esc(genders[p.preference]||'Qualquer pessoa'),'<select id="pi-preference" name="value">'+options({any:'Qualquer pessoa',woman:'Mulheres',man:'Homens',nonbinary:'Não binárias'},p.preference)+'</select>')+
 '<button type="button" class="ui-btn btn-outline pi-share" data-action="nav" data-view="discover">'+ico('users',17)+' Meus interesses e descoberta</button><button type="button" class="ui-btn btn-dark pi-share" data-action="copyUsernameLink" data-username="'+esc(p.username||'')+'">'+ico('link',17)+' Compartilhar meu perfil</button></div><small class="pi-banner-note">Banner: foto gratuita · GIF exclusivo Premium.</small></div></article></section>';
}
let inlineProfileBusy=false;
function toggleInlineProfile(btn,open){
 if(inlineProfileBusy)return;
 const row=btn.closest('.pi-row'),form=row?.querySelector('.pi-field-form');if(!form)return;
 if(open){
  document.querySelectorAll('.pi-field-form:not([hidden])').forEach(other=>{if(other!==form){other.reset();other.hidden=true;other.closest('.pi-row').querySelector('.pi-row-display').hidden=false}});
  form.hidden=false;row.querySelector('.pi-row-display').hidden=true;form.elements.value.focus({preventScroll:true});
 }else{form.reset();form.hidden=true;row.querySelector('.pi-row-display').hidden=false;row.querySelector('.pi-pencil').focus({preventScroll:true});window.connectEditing?.wake()}
}
async function saveInlineProfile(form){
 if(inlineProfileBusy||!state.session?.user?.id||!state.profile)return;
 const key=form.dataset.inlineProfile,uid=state.session.user.id;
 if(!['display_name','username','age','gender','preference','bio'].includes(key))return;
 let value=String(form.elements.value.value).trim();
 if(key==='username'){value=normalizeHandle(value);if(!/^[a-z][a-z0-9_]{2,19}$/.test(value))throw Error('Escolha um @ válido de 3 a 20 caracteres.')}
 if(key==='display_name'&&(value.length<2||value.length>42))throw Error('Nome entre 2 e 42 caracteres.');
 if(key==='bio'&&value.length>220)throw Error('Biografia de até 220 caracteres.');
 if(key==='age'){value=Number(value);if(!Number.isInteger(value)||value<18||value>100)throw Error('Informe uma idade entre 18 e 100 anos.')}
 if(key==='gender'&&!['woman','man','nonbinary'].includes(value))throw Error('Identidade inválida.');
 if(key==='preference'&&!['any','woman','man','nonbinary'].includes(value))throw Error('Preferência inválida.');
 inlineProfileBusy=true;const button=form.querySelector('[type=submit]');busy(button,true);
 try{
  const {data,error}=await db.from('entre_profiles').update({[key]:value,updated_at:new Date().toISOString()}).eq('id',uid).select('*').single();
  if(error)throw error;
  if(state.session?.user?.id!==uid)return;
  state.profile=data;state.preference=data.preference;
  if(state.view==='profile')renderView();else refreshAvatarElements(data);
  toast('Perfil atualizado!',false,'success');
 }finally{inlineProfileBusy=false;busy(button,false)}
}
async function saveInlineAvatar(blob,uid){
 if(inlineProfileBusy||!uid||state.session?.user?.id!==uid||!state.profile)throw Error('Aguarde ou entre novamente.');
 inlineProfileBusy=true;const path=uid+'/'+crypto.randomUUID()+'.webp',previous=state.profile.avatar_path;
 let uploaded=false,committed=false;
 try{
  const {error:uploadError}=await db.storage.from(AVATAR_BUCKET).upload(path,blob,{contentType:'image/webp',upsert:false,cacheControl:'60'});
  if(uploadError)throw uploadError;uploaded=true;
  if(state.session?.user?.id!==uid)throw Error('Sua sessão mudou.');
  const {data,error}=await db.from('entre_profiles').update({avatar_path:path,updated_at:new Date().toISOString()}).eq('id',uid).select('*').single();
  if(error)throw error;committed=true;
  if(state.session?.user?.id===uid){
   state.profile=data;state.avatarUrls[path]={url:URL.createObjectURL(blob),expires:Date.now()+AVATAR_LIFETIME,local:true};
   render();void signAvatar(data,true);toast('Foto de perfil atualizada!',false,'success');
  }
  if(previous&&previous!==path)void db.storage.from(AVATAR_BUCKET).remove([previous]).catch(()=>{});
 }catch(e){if(uploaded&&!committed)await db.storage.from(AVATAR_BUCKET).remove([path]);throw e}
 finally{inlineProfileBusy=false}
}
function appearanceView(){return '<section class="cx-appearance-page"><header class="cx-appearance-intro"><span>SEU CONNECT</span><h2>Personalize sua experiência</h2><p>Escolha entre o tema claro e o escuro.</p></header>'+(window.entreTheme?.renderControls?.()||'')+'</section>';}
function settingsView(){return heading('VOCÊ NO CONTROLE','Configurações<em>.</em>','Gerencie sua experiência, privacidade e conta.')+(window.entreTheme?.renderControls?.()||'')+
 
 '<div class="settings-card"><h3>Experiência</h3>'+
 '<div class="motion-level-picker" role="group" aria-label="Intensidade de animações">'+
 [['off','Desligadas','Sem efeitos visuais','close'],['light','Leve','Movimentos discretos','feather'],['medium','Média','Equilibrada','layers'],['high','Máxima','Efeitos 3D e profundidade','cube']].map(([level,label,help,icon])=>
 '<button type="button" data-action="motionLevel" data-value="'+level+'" class="motion-level-option '+((state.motionOff?'off':state.motionLevel)===level?'is-active':'')+'" aria-pressed="'+((state.motionOff?'off':state.motionLevel)===level)+'"><span class="cn-motion-icon">'+ico(icon,23)+'</span><span class="cn-motion-copy"><strong>'+label+'</strong><small>'+help+'</small></span><span class="cn-motion-radio" aria-hidden="true"></span></button>').join('')+
 '</div><p class="motion-level-note">As animações seguem apenas a sua escolha no CONNECT, independentemente da configuração do Android. Sincronizável com a sua conta.</p>'+(window.connectSound?.markup?.()||'')+'</div>'+(window.connectAccountData?.markup?.()||'')+
 '<div class="settings-card"><h3>Privacidade e segurança</h3><div class="setting-row"><div><strong>Conta conectada</strong><p>'+esc(state.session.user.email)+'</p></div><span class="pill">'+ico('shield',15)+' Protegida</span></div>'+
 '</div>';
}
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
  state.modal=null;render();toast('Denúncia enviada para análise. Obrigado por nos avisar.',false,'success');
 }catch(e){toast(infoError(e),true);}
 finally{if(btn&&btn.isConnected)busy(btn,false)}
}

function modalView(){const m=state.modal;if(!m)return '';if(['delete1','delete2','deleteVerified'].includes(m))return deleteEmailModal(m);if(m==='socialProfile')return window.entreSocial?.profileModal?.()||'';if(m==='deleteConversation'){const id=window.entreSocial?.data?.deleteConversationId,peer=state.pairsProfiles?.[id];return `<div class="modal-backdrop" id="modalBackdrop"><div class="modal-card" role="alertdialog" aria-modal="true" aria-labelledby="modalTitle"><h2 id="modalTitle">Apagar conversa?</h2><p>Você vai apagar o histórico com <strong>${esc(peer?.display_name||'esta pessoa')}</strong> apenas da sua conta. A outra pessoa mantém o histórico dela. Se chegar uma nova mensagem, o chat poderá reaparecer sem as mensagens antigas.</p><div class="modal-actions"><button type="button" class="ui-btn btn-outline btn-sm" data-action="closemodal">Cancelar</button><button type="button" class="ui-btn btn-danger btn-sm" data-action="conversationDeleteConfirm">${ico('trash',16)} Apagar conversa</button></div></div></div>`;}if(m==='report')return reportDialog();const del=m==='delete1'||m==='delete2';return `<div class="modal-backdrop" id="modalBackdrop"><div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><h2 id="modalTitle">${m==='delete1'?'Excluir seus dados?':m==='delete2'?'Confirma a exclusão?':m==='block'?'Bloquear esta pessoa?':'Encerrar encontro?'}</h2><p>${m==='delete1'?'Seu perfil, suas conversas e suas conexões deste aplicativo serão removidos permanentemente. Isso também pode apagar mensagens compartilhadas com outras pessoas.':m==='delete2'?'Esta é a confirmação final. Digite EXCLUIR abaixo. O login do servidor compartilhado continuará existindo, mas sua conta no CONNECT não.':m==='block'?'Vocês não serão conectados de novo por este sistema. A conversa temporária será encerrada.':'O encontro será encerrado e as mensagens temporárias apagadas. Você poderá seguir a pessoa nas próximas 24 horas.'}</p>${m==='delete2'?`<div class="field"><label for="deleteConfirm">Digite EXCLUIR para confirmar</label><input id="deleteConfirm" autocomplete="off" placeholder="EXCLUIR"></div>`:''}<div class="modal-actions"><button class="ui-btn btn-outline btn-sm" data-action="closemodal">Cancelar</button><button class="ui-btn ${del?'btn-danger':'btn-dark'} btn-sm" data-action="${m==='delete1'?'delete2':m==='delete2'?'deleteFinal':m==='block'?'blockFinal':'endpairFinal'}">${del?'Excluir':'Confirmar'} ${ico('arrow',15)}</button></div></div></div>`}
function syncLiveFilters(scrollTop=0){
 const previous=document.querySelector('body > .live-app-filters');
 const inline=state.view==='connect'?document.querySelector('#view-content .live-app-filters'):null;
 if(previous&&previous!==inline)previous.remove();
 if(!state.liveFiltersOpen||!inline){
  document.querySelector('.live-filter-dismiss-overlay')?.remove();
  document.body.classList.remove('live-filters-open');
  return;
 }
 let backdrop=document.querySelector('.live-filter-dismiss-overlay');
 if(!backdrop){
  backdrop=document.createElement('button');backdrop.type='button';
  backdrop.className='live-filter-dismiss-overlay';backdrop.dataset.action='liveFiltersClose';
  backdrop.setAttribute('aria-label','Fechar filtros');
  document.body.appendChild(backdrop);
 }
 document.body.appendChild(inline);
 document.body.classList.add('live-filters-open');
 const inner=inline.querySelector('.live-app-filter-body');
 if(inner)inner.scrollTop=scrollTop;
}

let dockScroll=0;
function onboardingPlanPending(){return Boolean(state.session?.user?.id&&state.profile?.onboarding_plan_selected===false);}
async function recordOnboardingPlan(){
 const uid=state.session?.user?.id;if(!uid||state.profile?.id!==uid)throw Error('Entre novamente para continuar.');
 const {data,error}=await db.from('entre_profiles').update({onboarding_plan_selected:true}).eq('id',uid).select('onboarding_plan_selected').single();
 if(error||data?.onboarding_plan_selected!==true)throw error||Error('Não foi possível concluir a escolha do plano.');
 if(state.session?.user?.id!==uid)throw Error('Sua sessão mudou.');
 state.profile.onboarding_plan_selected=true;
}
function onboardingPlanView(){
 return '<main class="onboarding-plans"><header class="onboarding-plans-top">'+brand()+'<div>'+ (window.entreTheme?.toggleMarkup?.()||'')+'<button type="button" class="ui-btn btn-outline" data-action="logout">Sair</button></div></header><div class="onboarding-plan-progress"><span>'+ico('check',14)+' Conta</span><i></i><span>'+ico('check',14)+' Perfil</span><i></i><strong>3 · Plano</strong></div><div class="onboarding-plan-body">'+(window.entreExtras?.premiumView?.(true)||'<p>Não foi possível carregar os planos.</p><button class="ui-btn btn-outline" data-action="onboardingFree">Continuar gratuitamente</button>')+'</div></main>';
}
async function finishOnboarding(btn){if(!onboardingPlanPending()||state.onboardingBusy)return;state.onboardingBusy=true;busy(btn,true);try{if(!await window.connectSession.touch(true))return;await recordOnboardingPlan();state.resumeNavigation=false;window.connectSession.clearDraft(state.session?.user?.id);state.view='posts';state.mode='app';render();void window.entreExtras?.enter?.('posts');void window.connectRealtime?.resume?.();void window.entreGeo?.init?.();toast('Bem-vindo ao CONNECT!',false,'success');}catch(e){toast(infoError(e),true);}finally{state.onboardingBusy=false;if(btn?.isConnected)busy(btn,false);}}
const messageDrafts=new Map();
function messageDraftKey(){return state.session?.user?.id&&state.pair?.id?state.session.user.id+':'+state.pair.id:null;}
function rememberMessageDraft(key,value){if(!key)return;if(value){messageDrafts.delete(key);messageDrafts.set(key,value);while(messageDrafts.size>20)messageDrafts.delete(messageDrafts.keys().next().value);}else messageDrafts.delete(key);}
document.addEventListener('input',event=>{const input=event.target;if(input?.id==='messageInput'&&input.dataset.draftKey===messageDraftKey())rememberMessageDraft(input.dataset.draftKey,input.value);});
function snapshotMessageUI(){
 const input=document.getElementById('messageInput'),list=document.getElementById('messageList'),key=input?.dataset.draftKey;
 if(key&&key===messageDraftKey())rememberMessageDraft(key,input.value);
 return {key,focus:!!input&&document.activeElement===input,start:input?.selectionStart,end:input?.selectionEnd,scroll:list?.scrollTop,nearBottom:!list||list.scrollHeight-list.scrollTop-list.clientHeight<130};
}
function restoreMessageUI(snapshot){
 const input=document.getElementById('messageInput'),list=document.getElementById('messageList'),key=messageDraftKey();
 if(!input||!key)return;input.dataset.draftKey=key;input.value=messageDrafts.get(key)||'';
 if(snapshot?.key===key){if(list&&!snapshot.nearBottom&&Number.isFinite(snapshot.scroll))list.scrollTop=snapshot.scroll;if(snapshot.focus){input.focus({preventScroll:true});try{input.setSelectionRange(snapshot.start,snapshot.end);}catch(_){}}}
}
function render(){window.connectEditing?.cancelRefresh();window.connectSession?.rememberPublic?.();const messageUI=snapshotMessageUI();const previousDock=document.querySelector('.cn-dock-viewport');if(previousDock)dockScroll=previousDock.scrollLeft;state.profileMenuOpen=false;window.entreTheme?.setScope?.(state.session&&state.profile&&state.mode!=='reset'&&!maintenanceIsActive()&&!state.suspension?'app':'external');applyMotion();if(state.mode==='reset'){app.innerHTML=window.entreEmailAuth.resetView();return;}if(maintenanceIsActive()){dismissPublicNotice();app.innerHTML=maintenanceView();return;}if(state.suspension){dismissPublicNotice();app.innerHTML=suspensionView();return;}if(!state.session){app.innerHTML=['login','signup','forgot'].includes(state.mode)?authView():landing()}else if(!state.profile){state.mode='onboard';app.innerHTML=authView()}else if(window.connectAccountData?.pending?.()){app.innerHTML=window.connectAccountData.gate();return;}else if(onboardingPlanPending()){app.innerHTML=onboardingPlanView();return;}else{app.innerHTML=appLayout();restoreDockScroll();updateTimerText();window.connectSession?.rememberPage?.()}if(['connect','chat'].includes(state.view)&&state.pair){const el=document.getElementById('messageList');if(el)el.scrollTop=el.scrollHeight;window.entreSocial?.afterRender?.();window.entreChatMedia?.afterRender?.()}if(activeEncounter()&&state.pair.mode==='video')window.entreVideo?.attach?.();syncLiveFilters();restoreMessageUI(messageUI);window.connectNext?.afterRender();}
function renderView(background=false){if(maintenanceIsActive()||state.suspension)return;if(background&&window.connectEditing?.deferRefresh(()=>renderView(true)))return;window.connectEditing?.cancelRefresh();const messageUI=snapshotMessageUI();if(state.session&&state.profile){const el=document.getElementById('view-content');if(el){const liveScroll=document.querySelector('body > .live-app-filters .live-app-filter-body')?.scrollTop||el.querySelector('.live-app-filter-body')?.scrollTop||0;el.dataset.section=state.view;el.innerHTML=viewContent();window.connectSession?.rememberPage?.();syncLiveFilters(liveScroll);updateTimerText();const m=document.getElementById('messageList');if(m)m.scrollTop=m.scrollHeight;window.entreSocial?.afterRender?.();window.entreChatMedia?.afterRender?.();if(activeEncounter()&&state.pair?.mode==='video')window.entreVideo?.attach?.();restoreMessageUI(messageUI);window.connectNext?.afterRender();}}}
function showFormMessage(msg,success=false){window.connectSound?.play?.(success?'success':'error');const id=success?'form-success':'form-error';const target=document.getElementById(id);if(target){target.classList.remove('hidden');target.textContent=msg}}
function busy(btn,value){if(btn){btn.disabled=value;btn.dataset.oldLabel ||= btn.innerHTML;if(value)btn.textContent='Só um instante...';else btn.innerHTML=btn.dataset.oldLabel}}
async function getProfile(){const uid=state.session?.user.id;if(!uid)return null;const {data,error}=await db.from('entre_profiles').select('*').eq('id',uid).maybeSingle();if(error)throw error;return data}
let pairsLoadSeq=0;
async function loadPairs(){
 const uid=state.session?.user?.id;if(!uid||!state.profile)return;
 const seq=++pairsLoadSeq;
 const valid=()=>state.session?.user?.id===uid&&seq===pairsLoadSeq;
 const {data,error}=await db.from('entre_pairs').select('*').or(`a.eq.${uid},b.eq.${uid}`).in('status',['active','connected','closed']).order('created_at',{ascending:false}).limit(50);
 if(!valid())return;if(error)throw error;
 const pairs=data||[],ids=[...new Set(pairs.map(p=>p.a===uid?p.b:p.a))],map={};
 let profiles=[];
 if(ids.length){const result=await db.from('entre_profiles').select('id,username,display_name,age,bio,gender,avatar_path,avatar_uploaded_at').in('id',ids);if(!valid())return;profiles=result.data||[];await Promise.allSettled(profiles.map(signAvatar));if(!valid())return;await window.entreExtras?.loadBadges?.(profiles);}
 if(!valid())return;
 for(const pair of pairs){const other=pair.a===uid?pair.b:pair.a;map[pair.id]=profiles.find(p=>p.id===other)||{id:other,display_name:'Conta indisponível'};}
 state.pairs=pairs;state.pairsProfiles=map;return pairs;
}
async function initializeAccount(){
 const uid=state.session?.user?.id;if(!uid)return;const profile=await getProfile();if(state.session?.user?.id!==uid)return;
 state.profile=profile;if(!profile||profile.onboarding_plan_selected===false){if(!await window.connectSession.touch(true)||state.session?.user?.id!==uid)return;}state.signup=profile?null:window.connectSession.readDraft(uid);state.signupConsent=false;if(!profile){try{const {data,error}=await db.rpc('connect_signup_consent_status');if(state.session?.user?.id!==uid)return;state.signupConsent=!error&&data===true;}catch(_){if(state.session?.user?.id!==uid)return;}}window.entreSocial?.resetAccount?.();window.entreRooms?.resetAccount?.();state.pairs=[];state.pairsProfiles={};
 if(state.profile){try{await signAvatar(state.profile);}catch(e){console.warn('Avatar load unavailable',e);}}
 if(state.session?.user?.id!==uid)return;
 try{installAvatarRealtime();}catch(e){console.warn('Avatar updates unavailable',e);}
 state.pair=null;state.peer=null;state.searching=false;state.messages=[];
 if(state.profile&&window.connectAccountData){const accepted=await window.connectAccountData.prepare(uid);if(state.session?.user?.id!==uid)return;if(!accepted){render();return;}}
 if(state.profile){
  await window.entreExtras?.refreshPremium?.();if(state.session?.user?.id!==uid)return;
  state.preference=window.entreExtras?.isPremium?.(state.session.user.id)?state.profile.preference:'any';
  // A temporary problem in the chat/notification service must not invalidate
  // an already confirmed session or force the admin back to the login page.
  try{await loadPairs();}catch(e){console.warn('Conversations unavailable',e);state.pairs=[];state.pairsProfiles={};}
  try{await window.entreSocial?.refreshBulletins?.(true);}catch(e){console.warn('Bulletin feed unavailable',e);}
  try{await window.entreSocial?.init?.();}catch(e){console.warn('Social services unavailable',e);}
  if(state.session?.user?.id!==uid)return;
  const active=state.pairs.find(p=>p.status==='active'&&new Date(p.expires_at)>Date.now());
  if(active){
   state.pair=active;state.peer=state.pairsProfiles[active.id]||null;state.view='connect';
   try{subscribePair(active.id);await loadMessages();}catch(e){console.warn('Temporary chat unavailable',e);state.pair=null;state.peer=null;state.view='posts';}
   state.liveMode=active.mode||'chat';
  }
 }
 const params=new URLSearchParams(window.location.search);const premiumReturn=params.get('premium')==='return';const onboardingReturn=params.get('onboarding')==='1';
 if(onboardingPlanPending()&&window.entreExtras?.data?.premium?.active===true){try{await recordOnboardingPlan();state.view='posts';}catch(e){console.warn('Plan completion unavailable',e);}}
 if(onboardingReturn&&state.profile&&!state.pair?.id)state.view='posts';
 if(premiumReturn&&!onboardingReturn&&!state.pair?.id)state.view=new URLSearchParams(window.location.search).get('checkoutSupport')==='1'?'support':'premium';
 if(premiumReturn||onboardingReturn){
  const clean=new URL(window.location.href);clean.searchParams.delete('premium');clean.searchParams.delete('checkoutSupport');clean.searchParams.delete('onboarding');
  window.history.replaceState(null,'',clean.pathname+clean.search+clean.hash);
 }
 const saved=state.resumeNavigation&&!premiumReturn&&!onboardingReturn&&state.profile&&!onboardingPlanPending()?window.connectSession.readPage(uid):null;
 if(saved){
  if(saved.view==='chat'&&saved.pair&&!activeEncounter()){
   try{if(!await openPair(saved.pair))state.view='conversations';}catch(_){state.view='conversations';}
   if(state.session?.user?.id!==uid)return;
  }else if(saved.view==='chat'){state.view=activeEncounter()?'connect':'conversations';}
  else state.view=saved.view==='lives'&&!PUBLIC_LIVES_ENABLED?'soon':saved.view;
  if(state.view==='notifications'&&window.entreSocial?.data)window.entreSocial.data.notificationTab=saved.notificationTab==='bulletins'?'bulletins':'personal';
 }
 if(state.profile&&!onboardingPlanPending()){state.resumeNavigation=false;window.connectSession.clearDraft(uid);try{const check=await deleteEmailStatus();if(state.session?.user?.id!==uid)return;if(check.verified)state.modal='deleteVerified';}catch(e){console.warn('Deletion verification unavailable',e?.message);}}
 render();
 if(state.profile&&!onboardingPlanPending()){
  void window.connectRealtime?.resume?.();
  void window.entreGeo?.init?.();
  if(['posts','premium','support','protocols','checkout'].includes(state.view))void window.entreExtras?.enter?.(state.view);
  if(['online','conversations','notifications'].includes(state.view))void window.entreSocial?.enter?.(state.view);
  if(state.view==='rooms')void window.entreRooms?.enter?.();
  if(state.view==='lives'&&PUBLIC_LIVES_ENABLED)void window.entreLives?.enter?.();
  if(state.view==='connect')void refreshSearchQuota();
  if(premiumReturn&&!onboardingReturn)toast('O Premium é contratado pelo WhatsApp e liberado pela equipe após confirmação.');
  const requestedHandle=new URLSearchParams(window.location.search).get('profile');
  if(requestedHandle&&!activeEncounter())void window.entreSocial?.openUsernameProfile?.(requestedHandle);
 }
 if(state.pair?.mode==='video'&&state.pair.status==='active')void window.entreVideo?.start?.(state.pair);
}
function getProfileData(form){return {display_name:form.display_name.value.trim(),username:normalizeHandle(form.username?.value),age:Number(form.age.value),gender:form.gender.value,preference:window.entreExtras?.isPremium?.(state.session?.user?.id)?(form.preference?.value||'any'):'any'}}
async function createProfile(data){const {error}=await db.from('entre_profiles').upsert({id:state.session.user.id,display_name:data.display_name,username:data.username,age:data.age,gender:data.gender,preference:data.preference,...(data.avatar_path?{avatar_path:data.avatar_path}:{})},{onConflict:'id'});if(error)throw error;sessionStorage.removeItem('entre.pendingProfile')}
async function profileSetup(form){
 const submit=form.querySelector('[type=submit]');busy(submit,true);
 let uploaded=null;
 try{
  const profile=getProfileData(form);
  window.connectSession.saveDraft(form);if(!await window.connectSession.touch(true))return;
  if(profile.age<18||!Number.isInteger(profile.age)||profile.age>100)throw Error('Informe uma idade válida a partir de 18 anos.');
  const declared=form.elements.adult?.checked===true&&form.elements.terms?.checked===true;
  if(state.signupConsent!==true&&!declared)throw Error('Confirme a maioridade e aceite os termos.');
  if(state.avatarPendingFile){uploaded=await uploadAvatarFile(state.avatarPendingFile);profile.avatar_path=uploaded;}
  await createProfile(profile);window.connectSession.clearDraft(state.session?.user?.id);
  if(declared&&state.signupConsent!==true){try{const {data,error}=await db.rpc('connect_accept_legal',{_terms:'2026-11-25',_privacy:'2026-11-25',_adult:true});state.signupConsent=!error&&data===true;}catch(_){state.signupConsent=false;}}
  let bannerFailed=false;try{await window.connectBanners?.commitRegistration?.();}catch(_){bannerFailed=true;}
  if(uploaded)commitLocalAvatar(uploaded);
  clearAvatarDraft();
  state.view='posts';await initializeAccount();
  toast(bannerFailed?'Perfil criado. Não foi possível salvar o banner; tente novamente no seu perfil.':'Perfil concluído. Escolha seu plano.',bannerFailed,bannerFailed?null:'success');
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
async function startSearch(){if(maintenanceIsActive())return;if(!state.session||!state.profile||state.searching||cancellingSearch||activeEncounter())return;window.entreGeo?.target?.();if(state.preference!=='any'&&!window.entreExtras?.isPremium?.(state.session.user.id)){state.preference='any';renderView();premiumNotice('O filtro de gênero');return;}cancelUnconfirmed=false;state.liveFiltersOpen=false;document.body.classList.remove('live-filters-open');state.searching=true;if(state.channel){void db.removeChannel(state.channel);state.channel=null;}state.pair=null;state.peer=null;state.messages=[];state.view='connect';render();await pollSearch();if(state.searching&&!cancellingSearch&&!cancelUnconfirmed&&!state.searchLoop)state.searchLoop=setInterval(pollSearch,3500)}
let polling=false,cancellingSearch=false,cancelUnconfirmed=false,pendingSearchRequest=null;
async function pollSearch(){if(polling||!state.searching||cancellingSearch||cancelUnconfirmed)return;polling=true;const uid=state.session?.user?.id;try{pendingSearchRequest=Promise.resolve(db.rpc('entre_find_mode_location',{_preference:state.preference,_mode:state.liveMode,...(window.entreGeo?.target?.()||{_target_state:null,_target_city:null})}));const {data,error}=await pendingSearchRequest;if(error)throw error;if(state.session?.user?.id!==uid||cancellingSearch||cancelUnconfirmed)return;applySearchQuota(data?.quota,uid);paintSearchQuota();if(data?.status==='daily_limit'){state.searching=false;clearSearchTimer();if(state.view==='connect')renderView();toast('Você atingiu 50 encontros hoje. Assine o Premium para encontros ilimitados ou volte amanhã.',true);return;}if(!state.searching)return;if(data?.status==='matched'&&data.pair_id){state.searching=false;clearSearchTimer();if(await openPair(data.pair_id)){window.entreSocial?.showMatchAnimation?.(state.peer);toast('Você encontrou uma conexão!',false,'found')}}}catch(e){if(state.session?.user?.id===uid&&!cancellingSearch&&!cancelUnconfirmed){toast(infoError(e),true);state.searching=false;clearSearchTimer();renderView()}}finally{polling=false;pendingSearchRequest=null}}
async function cancelSearch(){
 if(cancellingSearch||!state.searching)return;
 const uid=state.session?.user?.id;if(!uid)return;
 cancellingSearch=true;cancelUnconfirmed=false;clearSearchTimer();
 if(state.view==='connect')renderView();
 try{
  if(pendingSearchRequest)await pendingSearchRequest.catch(()=>{});
  if(state.session?.user?.id!==uid)return;
  const {data,error}=await db.rpc('connect_cancel_search');if(error)throw error;
  if(state.session?.user?.id!==uid)return;
  if(!data||!['cancelled','matched'].includes(data.status)||(data.status==='matched'&&!data.pair_id))throw Error('Resposta de cancelamento inválida.');
  if(data.quota)applySearchQuota(data.quota,uid);
  state.searching=false;cancelUnconfirmed=false;
  if(data.status==='matched'){
   try{
    if(await openPair(data.pair_id)){window.entreSocial?.showMatchAnimation?.(state.peer);toast('O encontro foi confirmado antes do cancelamento. Você pode encerrá-lo a qualquer momento.',false,'found');}
   }catch(e){toast('Encontro confirmado. Toque em Encontrar alguém para recuperar a conexão, se ainda estiver ativa.',true);console.warn('Encontro confirmado durante cancelamento',e);}
  }
 }catch(e){
  if(state.session?.user?.id===uid){state.searching=true;cancelUnconfirmed=true;toast('Não foi possível confirmar o cancelamento. Toque em Cancelar busca para tentar novamente.',true);console.warn('Cancelamento não confirmado',e);}
 }finally{
  cancellingSearch=false;
  if(state.session?.user?.id===uid&&state.view==='connect')renderView();
 }
}
let openPairSeq=0,messageLoadSeq=0,messageRevision=0;
async function openPair(id){
 if(activeEncounter()&&state.pair.id!==id){toast('Encerre o encontro atual antes de abrir outra conversa.',true);return false;}
 const uid=state.session?.user?.id;if(!uid)return false;const seq=++openPairSeq;
 const valid=()=>state.session?.user?.id===uid&&seq===openPairSeq&&!maintenanceIsActive()&&!state.suspension;
 const {data,error}=await db.from('entre_pairs').select('*').eq('id',id).maybeSingle();if(!valid())return false;if(error)throw error;
 if(!data||data.status==='closed'){const permanent=state.pairs.some(p=>p.id===id&&p.status==='connected');state.pairs=state.pairs.filter(p=>p.id!==id);delete state.pairsProfiles[id];if(window.entreSocial?.data?.prefs)delete window.entreSocial.data.prefs[id];toast(permanent?'Esta conversa não está mais disponível.':'Este encontro temporário já terminou.',true);nav(permanent?'conversations':'connect');return false;}
 if(state.channel){void db.removeChannel(state.channel);state.channel=null;}
 state.pair=data;state.messages=[];state.peer=null;state.encounterChatMin=true;state.searching=false;clearSearchTimer();
 const other=data.a===uid?data.b:data.a;const {data:profile}=await db.from('entre_profiles').select('id,username,display_name,age,bio,gender,avatar_path,avatar_uploaded_at').eq('id',other).maybeSingle();
 if(!valid()||state.pair?.id!==id)return false;
 if(profile)await signAvatar(profile);
 if(!valid()||state.pair?.id!==id)return false;
 state.peer=profile||{id:other,display_name:'Esta pessoa'};state.view=data.status==='connected'?'chat':'connect';
 subscribePair(id);await loadMessages();
 if(!valid()||state.pair?.id!==id)return false;
 render();void window.connectRelationships?.tick?.();if(state.pair.status==='active'&&state.pair.mode==='video')void window.entreVideo?.start?.(state.pair);
 return true;
}
async function loadMessages(){
 const pairId=state.pair?.id,uid=state.session?.user?.id;if(!pairId||!uid)return;
 const seq=++messageLoadSeq,revision=messageRevision;
 const valid=()=>state.pair?.id===pairId&&state.session?.user?.id===uid&&seq===messageLoadSeq;
 const {data,error}=await db.from('entre_messages').select('id,body,sender_id,created_at,edited_at,deleted_at').eq('pair_id',pairId).is('deleted_at',null).order('id',{ascending:false}).limit(40);
 if(!valid())return;if(error){console.warn(error);return;}
 // An INSERT/UPDATE during the fetch makes the snapshot stale. Reconcile again
 // rather than overwriting the event that already reached the client.
 if(revision!==messageRevision){void loadMessages().then(()=>refreshEncounterMessages()).catch(e=>console.warn(e));return;}
 state.messages=(data||[]).reverse();if(window.entreSocial)window.entreSocial.data.hasEarlier=(data||[]).length===40;
}
function refreshEncounterMessages(){
 if(!(activeEncounter()&&state.view==='connect')&&!(state.view==='chat'&&state.pair?.status==='connected'))return false;
 const list=document.getElementById('messageList');
 if(!list)return false;
 const wasNearBottom=list.scrollHeight-list.scrollTop-list.clientHeight<130;
 const gallery=list.querySelector('#encMediaGallery');list.innerHTML=(window.entreSocial?.historyButton?.()||'')+(state.messages.length||state.view==='chat'?messagesMarkup(state.peer):'<div class="ce-empty">'+ico('chat',28)+'<strong>Vocês estão conectados.</strong><small>Envie um oi para começar.</small></div>');if(gallery)list.append(gallery);else list.insertAdjacentHTML('beforeend',window.entreChatMedia?.gallery?.()||'');
 if(wasNearBottom)list.scrollTop=list.scrollHeight;
 void window.connectRelationships?.tick?.();
 return true;
}
function subscribePair(id){const owner=state.session?.user?.id;if(state.channel){db.removeChannel(state.channel);state.channel=null}state.channel=db.channel(`entre_pair_${id}_${Math.random().toString(36).slice(2,7)}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'entre_messages',filter:`pair_id=eq.${id}`},async(payload)=>{if(state.session?.user?.id===owner&&state.pair?.id===id){messageRevision++;const row=payload?.new;if(row?.id&&row.pair_id===id&&!row.deleted_at){if(!state.messages.some(m=>m.id===row.id)){state.messages.push(row);state.messages.sort((a,b)=>Number(a.id)-Number(b.id));if(state.messages.length>120){state.messages=state.messages.slice(-120);if(window.entreSocial)window.entreSocial.data.hasEarlier=true;}if(row.sender_id!==state.session?.user?.id)window.connectSound?.play?.('receive');}}else await loadMessages();if(!refreshEncounterMessages()&&['connect','chat'].includes(state.view))renderView()}}) .on('postgres_changes',{event:'UPDATE',schema:'public',table:'entre_messages',filter:`pair_id=eq.${id}`},async(payload)=>{if(state.session?.user?.id===owner&&state.pair?.id===id){messageRevision++;const m=state.messages.find(x=>String(x.id)===String(payload.new.id));if(payload.new.deleted_at){state.messages=state.messages.filter(x=>String(x.id)!==String(payload.new.id));refreshEncounterMessages();void window.connectRelationships?.tick?.();}else if(m){Object.assign(m,payload.new);refreshEncounterMessages();}else{await loadMessages();refreshEncounterMessages();}}}).on('postgres_changes',{event:'UPDATE',schema:'public',table:'entre_pairs',filter:`id=eq.${id}`},async()=>{if(state.session?.user?.id===owner&&state.pair?.id===id)await refreshPair()}).subscribe(status=>{if(status==='SUBSCRIBED'&&state.session?.user?.id===owner&&state.pair?.id===id){void loadMessages().then(()=>refreshEncounterMessages()).catch(e=>console.warn(e));void refreshPair();}})}
let refreshingPair=false,pairRefreshQueued=false;
async function refreshPair(){
 if(!state.pair)return;if(refreshingPair){pairRefreshQueued=true;return;}refreshingPair=true;try{
 const id=state.pair.id,prior=state.pair.status,previous=state.pair,owner=state.session?.user?.id;
 const {data,error}=await db.from('entre_pairs').select('*').eq('id',id).maybeSingle();
 if(error||state.pair?.id!==id||state.session?.user?.id!==owner)return;
 if(!data){window.entreVideo?.cleanup?.();if(state.channel){void db.removeChannel(state.channel);state.channel=null;}messageDrafts.delete(owner+':'+id);state.pair=null;state.messages=[];state.peer=null;state.pairs=state.pairs.filter(p=>p.id!==id);delete state.pairsProfiles[id];if(window.entreSocial?.data?.prefs)delete window.entreSocial.data.prefs[id];if(['connect','chat'].includes(state.view))state.view=prior==='connected'?'conversations':'connect';render();void window.connectRelationships?.tick?.();if(prior==='active')toast('Encontro encerrado.',false,'end');else if(prior==='connected')toast('Esta conversa não está mais disponível.',false);return;}
 state.pair=data;
 if(data.status==='closed'&&prior!=='closed'){window.entreVideo?.cleanup?.();
  if(state.channel){db.removeChannel(state.channel);state.channel=null;}
  messageDrafts.delete(owner+':'+id);state.pair=null;state.peer=null;state.messages=[];
  await loadPairs().catch(e=>console.warn(e));if(state.session?.user?.id!==owner||state.pair)return;if(['connect','chat'].includes(state.view))state.view='connect';render();
  toast('Encontro encerrado.',false,'end');
  return;
 }
 if(data.status==='connected'&&prior!=='connected'){window.entreVideo?.cleanup?.();
  await loadPairs().catch(e=>console.warn(e));if(state.session?.user?.id!==owner||state.pair?.id!==id)return;
  if(['connect','chat'].includes(state.view))state.view='chat';render();toast('Match confirmado! Esta é uma conversa permanente.',false,'match');
  return;
 }
 if(data.status==='active'&&state.view==='connect'&&['status','a_wants','b_wants','expires_at','extension_a','extension_b','extended_at'].every(key=>previous[key]===data[key])){updateTimerText();return;}
 if(data.status==='connected'&&prior==='connected'&&state.view==='chat'&&['messages_cleared_at','mode'].every(key=>previous[key]===data[key]))return;
 if(['chat','connect'].includes(state.view))renderView(true);
 }finally{refreshingPair=false;if(pairRefreshQueued){pairRefreshQueued=false;void refreshPair();}}
}
async function sendMessage(form){
 if(maintenanceIsActive())return;
 if(!state.pair||!(state.pair.status==='connected'||(state.pair.status==='active'&&new Date(state.pair.expires_at)>Date.now()))){toast('O chat temporário foi encerrado.',true);return;}
 const input=form.querySelector('#messageInput'),body=input?.value.trim();if(!body)return;
 const sendingPair=state.pair.id,owner=state.session?.user?.id;if(!owner)return;
 const same=()=>state.pair?.id===sendingPair&&state.session?.user?.id===owner;
 const draftKey=owner+':'+sendingPair;rememberMessageDraft(draftKey,'');input.value='';
 try{
  const {data,error}=await db.from('entre_messages').insert({pair_id:sendingPair,sender_id:owner,body}).select('id,body,sender_id,created_at,edited_at,deleted_at').single();
  if(error)throw error;if(!same())return;
  messageRevision++;window.connectSound?.play?.('send');
  if(!state.messages.some(m=>String(m.id)===String(data.id))){state.messages.push(data);state.messages.sort((a,b)=>Number(a.id)-Number(b.id));if(state.messages.length>120){state.messages=state.messages.slice(-120);if(window.entreSocial)window.entreSocial.data.hasEarlier=true;}if(!refreshEncounterMessages()&&['connect','chat'].includes(state.view))renderView();}
 }catch(error){if(same()){const current=document.getElementById('messageInput');if(!messageDrafts.get(draftKey)){rememberMessageDraft(draftKey,body);if(current&&!current.value)current.value=body;}toast(infoError(error),true);}}
}
async function vote(accept){if(maintenanceIsActive())return;if(!state.pair)return;try{const {data,error}=await db.rpc('entre_vote',{_pair:state.pair.id,_accept:accept});if(error)throw error;if(data==='closed'){await refreshPair();await loadPairs();toast('Encontro encerrado. O chat temporário foi apagado.');return}await refreshPair();if(accept&&data==='active')toast('Sua escolha foi registrada. Falta a outra pessoa.',false,'success')}catch(e){toast(infoError(e),true)}}
async function endPair(){if(!state.pair)return;try{const {error}=await db.rpc('entre_close',{_pair:state.pair.id});if(error)throw error;window.entreVideo?.cleanup?.();state.pair=null;state.messages=[];state.peer=null;state.modal=null;if(state.channel){db.removeChannel(state.channel);state.channel=null}await loadPairs();if(['connect','chat'].includes(state.view))state.view='connect';render();toast('Encontro encerrado.',false,'end')}catch(e){toast(infoError(e),true)}}
async function blockPartner(){if(!state.peer)return;try{const {error}=await db.rpc('entre_block',{_user:state.peer.id});if(error)throw error;window.entreVideo?.cleanup?.();if(state.channel){void db.removeChannel(state.channel);state.channel=null;}state.modal=null;state.pair=null;state.peer=null;state.messages=[];await loadPairs();if(['connect','chat'].includes(state.view))state.view='connect';render();toast('Pessoa bloqueada. Vocês não serão reconectados.',false,'delete')}catch(e){toast(infoError(e),true)}}
async function logout({silent=false}={}){window.entreSocial?.resetForeground?.();await window.connectRealtime?.depart?.();window.entreVideo?.cleanup?.();window.entreRooms?.stop?.();await window.entreLives?.leave?.();try{const wasSearching=state.searching;state.searching=false;clearSearchTimer();if(pendingSearchRequest)await pendingSearchRequest.catch(()=>{});if(wasSearching)await db.rpc('entre_leave');if(state.channel){await db.removeChannel(state.channel);state.channel=null}if(state.profileChannel){await db.removeChannel(state.profileChannel);state.profileChannel=null}for(const item of Object.values(state.avatarUrls)){if(item.local)URL.revokeObjectURL(item.url)}state.avatarUrls={};clearAvatarDraft();messageDrafts.clear();const departing=state.session?.user?.id;const {error}=await db.auth.signOut({scope:'local'});if(error)throw error;window.connectSession.clearAccount(departing);state.resumeNavigation=false;state.signup=null;state.session=null;state.isAdmin=false;state.modal=null;state.profile=null;state.pair=null;state.peer=null;state.pairs=[];state.pairsProfiles={};state.messages=[];state.suspension=null;window.entreSocial?.resetAccount?.();window.entreRooms?.resetAccount?.();window.entreExtras?.resetAccount?.();state.searching=false;state.mode='landing';state.view='posts';dockScroll=0;render();toast('Você saiu da conta.',false,silent?null:'logout')}catch(e){toast(infoError(e),true)}}
let deleteEmailBusy=false,deleteEmailPending=false;
async function deleteEmailStatus(){const {data,error}=await db.rpc('connect_delete_email_status');if(error)throw error;return data||{};}
function deleteEmailModal(mode){
 const email=String(state.session?.user?.email||'');
 const safe=esc(email.replace(/^(.{1,2})[^@]*(@.*)$/,'$1•••$2'));
 const shell=(title,body)=>'<div class="modal-backdrop" id="modalBackdrop"><div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><h2 id="modalTitle">'+title+'</h2>'+body+'</div></div>';
 const cancel='<button type="button" class="ui-btn btn-outline btn-sm" data-action="closemodal">Cancelar</button>';
 if(mode==='delete1')return shell('Excluir sua conta?','<p>Seu perfil e os dados do CONNECT serão removidos conforme as regras de exclusão do aplicativo. Para sua segurança, confirme o e-mail cadastrado antes de continuar.</p><div class="modal-actions">'+cancel+'<button type="button" class="ui-btn btn-danger btn-sm" data-action="delete2">Continuar '+ico('arrow',15)+'</button></div>');
 if(mode==='deleteVerified')return shell('E-mail verificado','<p>Você confirmou o acesso ao e-mail da conta. Esta ação é irreversível. O login do servidor compartilhado continuará existindo, mas sua conta no CONNECT será excluída.</p><div class="field"><label for="deleteConfirm">Digite EXCLUIR para confirmar</label><input id="deleteConfirm" autocomplete="off" placeholder="EXCLUIR"></div><div class="modal-actions">'+cancel+'<button type="button" class="ui-btn btn-danger btn-sm" data-action="deleteFinal">'+ico('trash',16)+' Excluir conta</button></div>');
 return shell('Confirme seu e-mail','<p>Enviaremos uma verificação para <strong>'+safe+'</strong>. A confirmação expira em 10 minutos. Abrir o link não exclui a conta.</p>'+
 (deleteEmailPending?'<p role="status">Se já recebeu o e-mail, abra o link ou informe o código, caso tenha sido enviado.</p><form id="deleteCodeForm"><div class="field"><label for="deleteEmailCode">Código do e-mail (se disponível)</label><input id="deleteEmailCode" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,10}" minlength="6" maxlength="10" required placeholder="Código de verificação"></div><div class="modal-actions"><button type="submit" class="ui-btn btn-dark btn-sm">Verificar código</button></div></form>':'')+
 '<form id="deleteEmailForm">'+(window.connectTurnstile?.markup?.()||'')+'<div class="modal-actions">'+cancel+'<button type="submit" class="ui-btn btn-dark btn-sm">'+(deleteEmailPending?'Reenviar e-mail':'Enviar verificação')+'</button></div></form>');
}
async function openDeleteEmail(){
 if(deleteEmailBusy)return;const uid=state.session?.user?.id;if(!uid)return;
 const result=await deleteEmailStatus();if(state.session?.user?.id!==uid)return;
 deleteEmailPending=result.pending===true;state.modal=result.verified?'deleteVerified':deleteEmailPending?'delete2':'delete1';render();
}
async function sendDeleteEmail(form){
 if(deleteEmailBusy||state.modal!=='delete2')return;const uid=state.session?.user?.id;if(!uid)return;
 deleteEmailBusy=true;const button=form.querySelector('[type=submit]');busy(button,true);
 try{
  const captchaToken=await window.connectTurnstile.consume(form);
  if(state.session?.user?.id!==uid||state.modal!=='delete2')return;
  const {data,error}=await db.rpc('connect_delete_email_begin');if(error)throw error;
  if(state.session?.user?.id!==uid||state.modal!=='delete2')return;
  const {error:sendError}=await db.auth.signInWithOtp({email:data.email,options:{shouldCreateUser:false,captchaToken,emailRedirectTo:new URL('./',location.href).href}});
  if(sendError)throw sendError;
  if(state.session?.user?.id!==uid||state.modal!=='delete2')return;
  deleteEmailPending=true;render();toast('Verificação enviada. Confira seu e-mail e a pasta de spam.',false,'success');
 }catch(e){if(state.session?.user?.id===uid)toast(infoError(e),true);}
 finally{deleteEmailBusy=false;if(form.isConnected){window.connectTurnstile?.reset?.(form);busy(button,false);}}
}
async function verifyDeleteCode(form){
 if(deleteEmailBusy||state.modal!=='delete2')return;const uid=state.session?.user?.id,email=state.session?.user?.email;
 const code=String(form.elements.code.value||'').trim();if(!uid||!email||!/^\d{6,10}$/.test(code))return;
 deleteEmailBusy=true;const btn=form.querySelector('[type=submit]');busy(btn,true);
 try{
  const {data,error}=await db.auth.verifyOtp({email,token:code,type:'email'});if(error)throw error;
  if(data?.user?.id!==uid||!data.session)throw Error('A verificação não corresponde à sua conta.');
  state.session=data.session;const result=await deleteEmailStatus();if(!result.verified)throw Error('Verificação vencida ou inválida. Solicite outro e-mail.');
  if(state.session?.user?.id!==uid)return;state.modal='deleteVerified';render();
 }catch(e){toast(infoError(e),true);}
 finally{deleteEmailBusy=false;if(btn?.isConnected)busy(btn,false);}
}
async function cancelDeleteEmail(){
 const uid=state.session?.user?.id;
 try{if(uid){const {error}=await db.rpc('connect_delete_email_cancel');if(error)throw error;}}
 catch(e){toast(infoError(e),true);return;}
 if(state.session?.user?.id!==uid)return;
 deleteEmailPending=false;state.modal=null;render();
}
async function deleteData(btn){
 if(deleteEmailBusy||state.modal!=='deleteVerified')return;
 const val=document.getElementById('deleteConfirm')?.value||'';
 if(val!=='EXCLUIR'){toast('Digite EXCLUIR para confirmar.',true);return;}
 deleteEmailBusy=true;busy(btn,true);
 try{const result=await deleteEmailStatus();if(!result.verified)throw Error('Confirmação vencida. Solicite uma nova verificação por e-mail.');
 const {error}=await db.rpc('entre_delete_my_profile');if(error)throw error;
 deleteEmailPending=false;state.modal=null;await logout({silent:true});toast('Seus dados do CONNECT foram excluídos.',false,'delete');
 }catch(e){toast(infoError(e),true);}finally{deleteEmailBusy=false;if(btn?.isConnected)busy(btn,false);}
}
function updateTimerText(){if(!state.pair||state.pair.status!=='active')return;const seconds=Math.max(0,Math.ceil((new Date(state.pair.expires_at).getTime()-Date.now())/1000));const mm=String(Math.floor(seconds/60)).padStart(2,'0'),ss=String(seconds%60).padStart(2,'0');document.querySelectorAll('.timer-text').forEach(el=>{el.textContent=`${mm}:${ss}`;el.classList.toggle('urgent',seconds<=30)});if(seconds===0&&state.closedOnce!==state.pair.id){state.closedOnce=state.pair.id;db.rpc('connect_encounter_expire',{_pair:state.pair.id}).then(async({data,error})=>{if(error)throw error;await refreshPair();if(data!==true)state.closedOnce=null;}).catch(()=>{state.closedOnce=null;})}}
function nav(view){
 if(onboardingPlanPending())return;
 if(view==='home')view='posts';
 if(view==='appearance')view='settings';
 if(view==='lives'&&!PUBLIC_LIVES_ENABLED)view='soon';

 if(view==='avisos'){if(window.entreSocial?.data)window.entreSocial.data.notificationTab='bulletins';view='notifications';}
 if(!tabs.some(t=>t[0]===view)&&!['chat','notifications','avisos','support','protocols','soon','shareapp','checkout','appearance','partnerships'].includes(view))return;
 if(view==='chat'&&!state.pair)view='conversations';
 setConnectMenu(false);state.profileMenuOpen=false;

 if(view==='connect'&&['closed','connected'].includes(state.pair?.status)){
  state.pair=null;state.peer=null;state.messages=[];
  if(state.channel){db.removeChannel(state.channel);state.channel=null;}
 }
 const previousView=state.view;state.view=view;
 if(previousView==='rooms'&&view!=='rooms')window.entreRooms?.stop?.();
 if(previousView==='lives'&&view!=='lives'){window.entreLives?.stop?.();if(window.entreLives?.isActive?.())void window.entreLives?.leave?.();}
 if(view!=='connect'){state.liveFiltersOpen=false;window.entreGeo?.resetPicker?.();document.body.classList.remove('live-filters-open');}
 if(previousView==='checkout'&&view!=='checkout')void window.entreExtras?.leavePremium?.();
 if(previousView==='premium'&&view!=='premium')void window.entreRecurring?.leave?.();
 render();
 if(window.entreSocial?.enter&&['online','conversations','avisos','notifications'].includes(view))void window.entreSocial.enter(view);
 if(view==='connect')void refreshSearchQuota();
 if(view==='rooms')void window.entreRooms?.enter?.();
 if(view==='lives'&&PUBLIC_LIVES_ENABLED)void window.entreLives?.enter?.();

 if(window.entreExtras?.enter&&['posts','premium','support','protocols','checkout'].includes(view))void window.entreExtras.enter(view);
 window.scrollTo({top:0,behavior:state.motionOff?'instant':'smooth'});
}
function scrollHow(){document.getElementById('como-funciona')?.scrollIntoView({behavior:'smooth'})}
async function clickAction(event){const btn=event.target.closest('[data-action]');if(!btn||btn.disabled)return;const action=btn.dataset.action;try{switch(action){case'onboardingFree':await finishOnboarding(btn);break;case'profileInlineEdit':toggleInlineProfile(btn,true);break;case'profileInlineCancel':toggleInlineProfile(btn,false);break;case'profileInlineMedia':if(!inlineProfileBusy)document.getElementById(btn.dataset.field==='banner'?'cpBannerFile':'avatarFile')?.click();break;case'logo':event.preventDefault();if(state.session&&state.profile)nav('home');else{state.mode='landing';render()}break;case'landing':state.mode='landing';render();break;case'how':scrollHow();break;case'login':state.mode='login';render();break;case'signup':state.mode='signup';render();break;case'forgot':state.mode='forgot';render();break;case'maintenanceRefresh':await maintenanceCheck(true);break;case'nav':if(btn.dataset.view==='notifications'&&btn.classList.contains('toolbar-bell')&&window.entreSocial?.data)window.entreSocial.data.notificationTab='personal';nav(btn.dataset.view);break;case'profileMenu':setConnectMenu(!document.getElementById('cnAccountMenu')?.open);break;case'profileMenuClose':setConnectMenu(false,document.getElementById('cnMoreMenu')?.open?'more':'account');break;case'retryArea':window.location.reload();break;case'copyUsernameLink':setConnectMenu(false);await copyProfileLink(btn.dataset.username);break;case'liveMode':if(!state.searching){state.liveMode=btn.dataset.value==='video'?'video':'chat';renderView();}break;case'upgradeFilter':premiumNotice('O filtro de gênero');break;case'premiumFeatureNotice':premiumNotice(btn.dataset.feature||'Este recurso');break;case'liveFiltersOpen':if(!state.searching){state.liveFiltersOpen=true;renderView();document.querySelector('body > .live-app-filters .cp-filter-header button')?.focus();}break;case'liveFiltersClose':{state.liveFiltersOpen=false;window.entreGeo?.resetPicker?.();document.querySelector('body > .live-app-filters')?.remove();document.querySelector('.live-filter-dismiss-overlay')?.remove();document.body.classList.remove('live-filters-open');renderView();document.querySelector('[data-action="liveFiltersOpen"]')?.focus();break;}case'filter':if(btn.dataset.value==='any'||window.entreExtras?.isPremium?.(state.session?.user?.id)){state.preference=btn.dataset.value;renderView();}else premiumNotice('O filtro de gênero');break;case'geoHomeEdit':case'geoHomeClose':case'geoSave':case'geoDetect':await window.entreGeo?.action?.(action);break;case'premiumCheckout':await window.entreExtras?.checkout?.();break;case'premiumVerify':await window.entreExtras?.verifyPremium?.();break;case'premiumCopyPix':await window.entreExtras?.copyPix?.();break;case'premiumWhatsapp':await window.entreExtras?.openPremiumWhatsapp?.();break;case'postCommentsOpen':case'postCommentsClose':case'postCommentsMore':case'postsRefresh':case'feedComposeFocus':case'postsMore':case'postLike':case'postEdit':case'postDelete':case'postCommentEdit':case'postCommentDelete':case'postCommentReport':case'postCommentCancel':await window.entreExtras?.postAction?.(action,btn);break;case'videoMute':case'videoCamera':case'videoSound':case'videoRetry':await window.entreVideo?.action?.(action);break;case'startsearch':await startSearch();break;case'cancelsearch':await cancelSearch();break;case'openpair':await openPair(btn.dataset.id);break;case'vote':await vote(btn.dataset.value==='yes');break;case'endpair':state.modal='endpair';render();break;case'endpairFinal':await endPair();break;case'report':state.modal='report';render();break;case'removeAvatar':await removeAvatar();break;case'block':state.modal='block';render();break;case'blockFinal':await blockPartner();break;case'closemodal':if(['delete1','delete2','deleteVerified'].includes(state.modal)){if(deleteEmailBusy)return;await cancelDeleteEmail();break;}if(state.modal==='socialProfile'){state.modal=null;document.getElementById('modalBackdrop')?.remove();window.connectProfileReturnFocus?.();}else{state.modal=null;render();}break;case'logout':setConnectMenu(false);await logout();break;case'toggleEncounterChat':{state.encounterChatMin=state.encounterChatMin===false;const card=document.querySelector('.ce-session');const chat=card?.querySelector('.ce-chat');if(chat){chat.hidden=state.encounterChatMin;card.classList.toggle('ce-chat-open',!state.encounterChatMin);btn.setAttribute('aria-expanded',String(!state.encounterChatMin));btn.querySelector('span').textContent=state.encounterChatMin?'Chat':'Fechar';btn.setAttribute('aria-label',state.encounterChatMin?'Abrir chat':'Ocultar chat');if(!state.encounterChatMin){const list=document.getElementById('messageList');if(list)list.scrollTop=list.scrollHeight;window.entreChatMedia?.afterRender?.()}}break;}case'motionLevel':if(['off','light','medium','high'].includes(btn.dataset.value)){state.motionOff=btn.dataset.value==='off';if(!state.motionOff)state.motionLevel=btn.dataset.value;localStorage.setItem('entre.motionOff',state.motionOff?'1':'0');localStorage.setItem('entre.motionLevel',state.motionLevel);applyMotion();document.querySelectorAll('.motion-level-option').forEach(el=>{const active=el.dataset.value===(state.motionOff?'off':state.motionLevel);el.classList.toggle('is-active',active);el.setAttribute('aria-pressed',String(active));});}break;case'motion':state.motionOff=!state.motionOff;localStorage.setItem('entre.motionOff',state.motionOff?'1':'0');render();break;case'motionForce':state.motionForce=!state.motionForce;localStorage.setItem('entre.motionForce',state.motionForce?'1':'0');render();break;case'delete1':setConnectMenu(false);await openDeleteEmail();break;case'delete2':state.modal='delete2';render();break;case'deleteFinal':await deleteData(btn);break;default:if(window.entreSocial?.action)await window.entreSocial.action(action,btn);break}}catch(e){toast(infoError(e),true)}}
function syncDockEdges(){const v=document.querySelector('.cn-dock-viewport');if(!v)return;const dock=v.closest('.cn-dock');dock?.classList.toggle('can-scroll-left',v.scrollLeft>3);dock?.classList.toggle('can-scroll-right',v.scrollLeft+v.clientWidth<v.scrollWidth-3)}
function restoreDockScroll(){const v=document.querySelector('.cn-dock-viewport');if(!v)return;v.scrollLeft=dockScroll;const item=v.querySelector('.is-active');if(item&&v.clientWidth){const bounds=v.getBoundingClientRect(),r=item.getBoundingClientRect();if(r.left<bounds.left)v.scrollLeft-=bounds.left-r.left+4;else if(r.right>bounds.right)v.scrollLeft+=r.right-bounds.right+4;}syncDockEdges()}
let dockDrag=null,dockSuppressClick=0;
document.addEventListener('pointerdown',e=>{const v=e.target.closest?.('.cn-dock-viewport');if(!v||e.pointerType!=='mouse'||e.button!==0)return;dockDrag={v,id:e.pointerId,x:e.clientX,start:v.scrollLeft,moved:false}});
document.addEventListener('pointermove',e=>{const d=dockDrag;if(!d||d.id!==e.pointerId)return;const delta=e.clientX-d.x;if(!d.moved&&Math.abs(delta)<6)return;if(!d.moved){d.moved=true;d.v.classList.add('is-dragging');d.v.setPointerCapture?.(e.pointerId)}d.v.scrollLeft=d.start-delta;e.preventDefault()},{passive:false});
function finishDockDrag(e){const d=dockDrag;if(!d||d.id!==e.pointerId)return;if(d.moved){dockSuppressClick=Date.now()+350;d.v.classList.remove('is-dragging');if(d.v.hasPointerCapture?.(e.pointerId))d.v.releasePointerCapture(e.pointerId)}dockDrag=null}
document.addEventListener('pointerup',finishDockDrag);document.addEventListener('pointercancel',finishDockDrag);
document.addEventListener('scroll',e=>{if(e.target.matches?.('.cn-dock-viewport')){dockScroll=e.target.scrollLeft;syncDockEdges()}},true);
document.addEventListener('wheel',e=>{const v=e.target.closest?.('.cn-dock-viewport');if(!v||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;const max=v.scrollWidth-v.clientWidth;if(max>0&&((e.deltaY>0&&v.scrollLeft<max-1)||(e.deltaY<0&&v.scrollLeft>0))){v.scrollLeft+=e.deltaY;e.preventDefault()}},{passive:false});
document.addEventListener('click',e=>{if(Date.now()<dockSuppressClick&&e.target.closest?.('.cn-dock')){e.preventDefault();e.stopImmediatePropagation()}},true);
window.addEventListener('resize',syncDockEdges);
document.addEventListener('click',clickAction);
document.addEventListener('click',event=>{const d=event.target;if(!['cnAccountMenu','cnMoreMenu'].includes(d?.id)||!d.open)return;const r=d.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)setConnectMenu(false,d.id==='cnMoreMenu'?'more':'account')});
document.addEventListener('cancel',event=>{if(['cnAccountMenu','cnMoreMenu'].includes(event.target.id)){event.preventDefault();setConnectMenu(false,event.target.id==='cnMoreMenu'?'more':'account')}},true);
document.addEventListener('close',event=>{if(event.target.id==='cnAccountMenu'){state.profileMenuOpen=false;document.getElementById('cnAccountTrigger')?.setAttribute('aria-expanded','false')}else if(event.target.id==='cnMoreMenu'){document.getElementById('cnMoreTrigger')?.setAttribute('aria-expanded','false')}},true);
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&state.liveFiltersOpen){
  event.preventDefault();
  state.liveFiltersOpen=false;
  document.querySelector('body > .live-app-filters')?.remove();
  document.querySelector('.live-filter-dismiss-overlay')?.remove();
  document.body.classList.remove('live-filters-open');
  if(state.view==='connect'){renderView();document.querySelector('[data-action="liveFiltersOpen"]')?.focus();}
 }
});

document.addEventListener('change',async e=>{
 if(e.target?.id!=='avatarFile')return;
 const file=e.target.files?.[0];
 e.target.value='';
 if(!file)return;
 try{await openImageCrop(file,{title:'Ajustar sua foto',inlineUid:state.view==='profile'&&state.profile?state.session?.user?.id:null});}catch(error){toast(infoError(error),true)}
});
document.addEventListener('submit',async e=>{const form=e.target;if(!(form instanceof HTMLFormElement))return;e.preventDefault();const name=form.id;try{if(name==='deleteEmailForm')await sendDeleteEmail(form);else if(name==='deleteCodeForm')await verifyDeleteCode(form);else if(name==='authForm'&&form.dataset.form==='profileSetup')await profileSetup(form);else if(name==='authForm'&&['login','signup','forgot','reset'].includes(form.dataset.form))await window.entreEmailAuth.submit(form);else if(form.hasAttribute('data-inline-profile'))await saveInlineProfile(form);else if(name==='profileForm')await saveProfile(form);else if(name==='suspensionAppeal')await submitSuspensionAppeal(form);else if(name==='messageForm')await sendMessage(form);else if(name==='reportForm')await sendReport(form);else if(name==='postCreateForm'||form.classList.contains('post-comment-form')||form.classList.contains('post-comment-edit-form')||form.classList.contains('post-comment-report-form'))await window.entreExtras?.postForm?.(form);else if(name==='supportTicketForm')await window.entreExtras?.submitSupport?.(form)}catch(err){toast(infoError(err),true)}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&activeImageCrop){closeImageCrop();return;}if(e.key==='Escape'&&state.modal){state.modal=null;render()}});
window.addEventListener('beforeunload',()=>{if(state.searching)db.rpc('entre_leave').catch(()=>{})});

function maintenanceIsPreview(){return new URLSearchParams(location.search).has('maintenance_preview')}
function maintenanceIsActive(){return maintenanceIsPreview()||state.siteSettings?.maintenance_enabled!==false}

/* Server-controlled suspension and timed announcements. Static HTML never authorizes access. */
function suspensionView(){
 const value=state.suspension||{};
 return '<main class="suspension-screen"><div class="suspension-glow" aria-hidden="true"></div>'
 +'<header class="suspension-header">'+brand()+(window.entreTheme?.toggleMarkup?.()||'')+'</header>'
 +'<section class="suspension-card" role="alert" aria-labelledby="suspension-title">'
 +'<div class="suspension-sign" aria-hidden="true">!</div><span class="suspension-eyebrow">ACESSO TEMPORARIAMENTE BLOQUEADO</span>'
 +'<h1 id="suspension-title">Sua conta está <em>suspensa.</em></h1>'
 +'<p>O acesso ao CONNECT está bloqueado enquanto esta decisão estiver ativa. Você não pode entrar em conversas nem buscar novas conexões.</p>'
 +'<div class="suspension-reason"><strong>Motivo informado</strong><p>'+esc(value.reason||'Esta conta não atende às regras de segurança da comunidade.')+'</p></div>'
 +'<p class="suspension-explain">Acredita que houve um engano? Solicite uma revisão. Sua contestação será recebida pela administração, sem reativação automática.</p>'
 +'<form id="suspensionAppeal" class="suspension-form"><label for="suspension-appeal">Pedir revisão da suspensão</label>'
 +'<textarea id="suspension-appeal" name="appeal" minlength="15" maxlength="1000" required placeholder="Explique sua situação com pelo menos 15 caracteres…"></textarea>'
 +'<button class="suspension-submit" type="submit">Enviar contestação</button><small>Limite: uma contestação a cada 24 horas.</small></form>'
 +'<div class="suspension-footer-actions"><button type="button" data-action="logout" class="suspension-signout">Sair desta conta</button>'
 +'<a href="./dados.html">Privacidade e retenção</a><a href="./termos.html">Regras da comunidade</a></div></section>'
 +'<footer class="suspension-footer">CONNECT · Segurança, respeito e transparência.</footer></main>';
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
 +'<div class="announcement-identity">CONNECT</div><div class="announcement-icon" aria-hidden="true">✳</div>'
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
 const uid=state.session?.user?.id;if(!uid)return false;
 const response=await db.rpc('entre_my_suspension');
 if(state.session?.user?.id!==uid)return false;if(response.error)throw response.error;
 const suspended=response.data?.suspended===true;
 if(suspended){
  const was=!!state.suspension;
  state.suspension=response.data;
  state.searching=false;clearSearchTimer();
  if(state.channel){db.removeChannel(state.channel);state.channel=null;}
  if(!was){window.entreVideo?.cleanup?.();render();}
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
 const s=state.siteSettings||{},preview=maintenanceIsPreview(),known=Boolean(state.siteSettings);
 const title=esc(!known?'Verificando a plataforma':s.maintenance_title||'Estamos atualizando o CONNECT');
 const message=esc(!known?'Não foi possível confirmar o status. O acesso permanece pausado enquanto tentamos novamente.':s.maintenance_message||'Estamos preparando melhorias. Assim que a atualização for liberada, você poderá voltar a conversar.');
 return '<main class="cp-service-page cp-maint-refined" id="maintenance-screen" data-status="'+(preview?'preview':known?'updating':'checking')+'" aria-labelledby="maintenance-title">'+
 '<header class="cp-service-header">'+brand()+'<div class="cp-maint-header-right">'+(window.entreTheme?.toggleMarkup?.()||'')+'</div></header>'+
 '<section class="cp-service-card cp-maint-layout"><div class="cp-maint-art" aria-hidden="true"><div class="cp-maint-orbit cp-maint-orbit-a"></div><div class="cp-maint-orbit cp-maint-orbit-b"></div><div class="cp-maint-orbit cp-maint-orbit-c"></div><div class="cp-maint-emblem"><img src="./connect-glass.svg?v=showcase-v17" width="84" height="84" alt=""></div><span class="cp-maint-satellite cp-maint-satellite-a">'+ico('refresh',20)+'</span><span class="cp-maint-satellite cp-maint-satellite-b">'+ico('chat',18)+'</span><span class="cp-maint-satellite cp-maint-satellite-c">'+ico('check',17)+'</span><div class="cp-maint-art-caption"><span></span> CONNECT <i></i> SISTEMA</div></div>'+
 '<div class="cp-maint-content"><span class="cp-service-label"><span class="cp-maint-dot"></span><span id="maintenance-state-label">'+(preview?'PRÉVIA DA TELA':known?'ATUALIZAÇÃO EM ANDAMENTO':'VERIFICANDO STATUS')+'</span></span>'+
 '<h1 id="maintenance-title">'+title+'</h1><p id="maintenance-message">'+message+'</p>'+
 '<div class="cp-service-status cp-maint-status" role="status" aria-live="polite"><span class="cp-maint-status-icon">'+ico('refresh',19)+'</span><div><strong id="maintenance-status-heading">Verificação automática</strong><small id="maintenance-status-text">Assim que o acesso for liberado, você voltará automaticamente.</small></div><span class="cp-maint-live-indicator" aria-hidden="true"><i></i><i></i><i></i></span></div>'+
 '<div class="cp-maint-actions"><button type="button" data-action="maintenanceRefresh" class="ui-btn btn-dark cp-service-btn">'+ico('refresh',17)+' <span>Verificar agora</span></button><span id="maintenance-last-check" class="cp-maint-last">'+(preview?'Modo de prévia':'Aguardando verificação')+'</span>'+(preview?'<a class="cp-service-link" href="./">Sair da prévia</a>':'')+'</div></div></section>'+
 '<footer class="cp-maint-footer"><span>CONNECT · Até logo.</span><a class="cp-service-link" href="./privacidade.html">Privacidade</a></footer></main>';
}
function paintMaintenanceStatus(status,manual=false){
 const root=document.getElementById('maintenance-screen');if(!root)return;
 const btn=root.querySelector('[data-action="maintenanceRefresh"]'),label=document.getElementById('maintenance-state-label'),head=document.getElementById('maintenance-status-heading'),line=document.getElementById('maintenance-status-text'),last=document.getElementById('maintenance-last-check');
 if(btn){btn.disabled=status==='checking'||status==='released';btn.setAttribute('aria-busy',String(status==='checking'));const span=btn.querySelector('span');if(span)span.textContent=status==='checking'?'Verificando…':maintenanceIsPreview()?'Verificar e sair':'Verificar agora';}
 if(status==='checking'){root.dataset.check='checking';if(manual&&line)line.textContent='Consultando o status da plataforma…';return;}
 root.dataset.check=status;
 if(status==='released'){if(label)label.textContent='ATUALIZAÇÃO LIBERADA';if(head)head.textContent='Tudo pronto';if(line)line.textContent='Abrindo o CONNECT automaticamente…';return;}
 if(status==='error'){if(head)head.textContent='Verificação indisponível';if(line)line.textContent='Não foi possível verificar agora. Continuaremos tentando.';return;}
 if(label)label.textContent=maintenanceIsPreview()?'PRÉVIA DA TELA':'ATUALIZAÇÃO EM ANDAMENTO';
 if(head)head.textContent='Verificação automática';
 if(line)line.textContent=maintenanceIsPreview()?'Esta é uma prévia da tela de atualização.':manual?'A atualização continua ativa. O acesso será liberado automaticamente.':'Assim que o acesso for liberado, você voltará automaticamente.';
 if(last)last.textContent='Verificado às '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
}
let maintenancePolling=false,maintenanceQueued=false,maintenanceTimer=0,maintenanceLeaving=false,maintenanceInitial=null,maintenanceManualQueued=false;
function normalizeMaintenancePreview(settings){
 if(settings?.maintenance_enabled===true&&maintenanceIsPreview()){
  const target=new URL(location.href);target.searchParams.delete('maintenance_preview');
  history.replaceState(history.state,'',target.href);
 }
}
function leaveMaintenance(){
 if(maintenanceLeaving)return;
 maintenanceLeaving=true;clearTimeout(maintenanceTimer);
 paintMaintenanceStatus('released');
 const target=new URL(location.href);
 target.searchParams.delete('maintenance_preview');
 target.searchParams.set('released',String(Date.now()));
 location.replace(target.href);
}
async function readMaintenanceSettings(){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
 try{
  const request=db.rpc('entre_public_settings');
  const response=await (typeof request.abortSignal==='function'?request.abortSignal(controller.signal):request);
  if(response.error)throw response.error;
  if(typeof response.data?.maintenance_enabled!=='boolean')throw Error('Status indisponível');
  return response.data;
 }finally{clearTimeout(timer);}
}
function scheduleMaintenanceCheck(){
 clearTimeout(maintenanceTimer);if(maintenanceLeaving||document.hidden)return;
 maintenanceTimer=setTimeout(()=>void maintenanceCheck(false),document.getElementById('maintenance-screen')?2000:30000);
}
async function maintenanceCheck(manual=false){
 if(maintenanceLeaving||(!manual&&document.hidden&&!state.searching&&!activeEncounter()&&!window.entreLives?.isActive?.()))return;
 if(maintenancePolling||maintenanceInitial){maintenanceQueued=true;maintenanceManualQueued=maintenanceManualQueued||manual;return;}
 maintenancePolling=true;paintMaintenanceStatus('checking',manual);
 try{
  const previous=maintenanceIsActive(),before=state.siteSettings;
  const settings=await readMaintenanceSettings();
  state.siteSettings=settings;normalizeMaintenancePreview(settings);
  const screen=document.getElementById('maintenance-screen');
  if(settings.maintenance_enabled===false&&screen&&(!maintenanceIsPreview()||manual)){
   leaveMaintenance();return;
  }
  const active=maintenanceIsActive();
  if(active&&!previous){
   window.entreVideo?.cleanup?.();state.searching=false;clearSearchTimer();
   if(state.channel){void db.removeChannel(state.channel);state.channel=null;}
   state.pair=null;state.peer=null;state.modal=null;
   render();paintMaintenanceStatus('active');
  }else if(active){
   const title=document.getElementById('maintenance-title'),msg=document.getElementById('maintenance-message');
   if(title)title.textContent=settings.maintenance_title||'Tem coisa boa chegando.';
   if(msg)msg.textContent=settings.maintenance_message||'Uma nova versão está chegando.';
   paintMaintenanceStatus('active',manual);
  }else{
   if(state.session)await checkSuspension();
   if(!state.suspension)considerPublicAnnouncement(settings);
   if(state.view==='avisos'&&before?.announcement_version!==settings.announcement_version)renderView();
  }
 }catch(err){paintMaintenanceStatus('error',manual);console.warn('Maintenance status check failed',err);}
 finally{
  maintenancePolling=false;
  if(maintenanceQueued&&!maintenanceLeaving){const manualNext=maintenanceManualQueued;maintenanceQueued=false;maintenanceManualQueued=false;clearTimeout(maintenanceTimer);maintenanceTimer=setTimeout(()=>void maintenanceCheck(manualNext),50);}
  else scheduleMaintenanceCheck();
 }
}
async function loadSiteSettings(){
 maintenanceInitial=readMaintenanceSettings();
 try{state.siteSettings=await maintenanceInitial;normalizeMaintenancePreview(state.siteSettings);}
 catch(e){console.warn('Public settings unavailable');}
 finally{maintenanceInitial=null;}
}
async function boot(){
 const recovery=window.entreEmailAuth.isRecovery();
 state.signup=null;applyMotion();
 try{
  await loadSiteSettings();
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(maintenanceTimer);else void maintenanceCheck(false);});
  window.addEventListener('online',()=>void maintenanceCheck(false));
  window.addEventListener('pageshow',e=>{if(e.persisted)void maintenanceCheck(false);});
  if(maintenanceIsActive()){
   render();scheduleMaintenanceCheck();
   if(!recovery)return;
  }
  scheduleMaintenanceCheck();
  const {data,error}=await db.auth.getSession();if(error)throw error;
  if(data.session){
   // Previously removed Google accounts may still have tokens on this device.
   // Remove the expired local session so the same email can sign up again.
   const checked=await db.auth.getUser();
   if(checked.error||!checked.data?.user){
    if(checked.error&&!window.connectSession.invalidSession(checked.error)){app.innerHTML=window.connectSession.retryScreen();return;}
    await db.auth.signOut({scope:'local'});
    state.session=null;state.isAdmin=false;state.mode='login';render();
    showFormMessage('Sua sessão anterior expirou. Crie uma conta com e-mail e senha para continuar.',true);
   }else if(recovery){
    const verified=await db.auth.getUser();if(verified.error||!verified.data?.user)throw verified.error||Error('Link inválido.');
    state.session={...data.session,user:verified.data.user};state.isAdmin=false;state.mode='reset';render();
   }else await window.entreEmailAuth.acceptSession(data.session);
  }else{
   const authIntent=new URLSearchParams(window.location.search).get('auth');
   const pendingEmail=window.connectSession.emailPending();state.mode=recovery?'forgot':authIntent==='signup'?'signup':authIntent==='login'?'login':pendingEmail?'login':window.connectSession.publicMode()||'landing';
   render();if(pendingEmail&&!recovery)showFormMessage('Confirme seu e-mail e entre para continuar seu cadastro. O cadastro incompleto expira após 30 minutos sem atividade.',true);
   if(recovery)showFormMessage('O link de recuperação expirou ou é inválido. Solicite outro.');
  }
  db.auth.onAuthStateChange((event,session)=>{
   if(event==='SIGNED_OUT'&&state.session){state.session=null;state.profile=null;state.isAdmin=false;state.signup=null;state.resumeNavigation=false;state.mode='landing';render();}else if(event==='TOKEN_REFRESHED'&&session?.user?.id===state.session?.user?.id){state.session=session;}
  });
  if(!maintenanceIsActive()&&!state.suspension)considerPublicAnnouncement(state.siteSettings);
  state.timerLoop=setInterval(updateTimerText,1000);
  setInterval(async()=>{if(state.session?.user&&state.pair&&(document.visibilityState==='visible'||activeEncounter())&&(activeEncounter()||['chat','connect'].includes(state.view))){await refreshPair()}},20000);
 }catch(error){if(state.session||!window.connectSession.invalidSession(error)){app.innerHTML=window.connectSession.retryScreen();}else{state.mode='login';render();showFormMessage(infoError(error));}console.error(error);}
}
boot();
