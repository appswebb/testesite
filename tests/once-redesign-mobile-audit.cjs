const {chromium}=require('playwright');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const assert=require('node:assert/strict');
const docs=file=>readFileSync(resolve(__dirname,'../docs',file),'utf8');
const appCss=['styles.css','motion.css','mobile.css','features.css','social.css','social-online.css','entre-features.css','encounter-ui.css','entre-location.css','functional-updates.css','interface-polish.css','live-experience.css','experience-hub.css','once-ui.css','once-public.css','once-maintenance.css','theme.css'].map(docs).join('\n');
const adminCss=['admin/styles.css','admin/comment-report-updates.css','admin/once-admin.css','theme.css'].map(docs).join('\n');
const publicCss=['perfil.css','perfil-once.css','theme.css'].map(docs).join('\n');
const infoCss=['features.css','once-info.css','theme.css'].map(docs).join('\n');
const icon='<svg viewBox="0 0 24 24" width="23" height="23"><circle cx="12" cy="12" r="8"/></svg>';
const frame=(css,content)=>'<html lang="pt-BR" data-theme="light"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body>'+content+'</body></html>';
async function checkOverflow(page,width,label){
 const value=await page.evaluate(()=>({
  scrollWidth:document.documentElement.scrollWidth,
  bodyWidth:document.body.scrollWidth,
  windowWidth:innerWidth
 }));
 assert(value.scrollWidth<=width+2,label+' horizontal overflow '+width+'px: '+JSON.stringify(value));
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [320,360,390,430,768,1280]){
   const page=await browser.newPage({viewport:{width,height:810}});
   const landing='<header class="home-header"><div class="home-bar wrap"><a class="brand">entre.</a><div class="home-actions"><button class="ui-btn btn-quiet">Entrar</button><button class="ui-btn btn-dark btn-sm">Criar conta</button></div></div></header>'+
   '<section class="landing-hero"><div class="wrap hero-grid"><div class="hero-copy"><span class="hero-kicker">✳ Um jeito diferente</span><h1 class="hero-title">Papo bom.<br><span class="once-subline">Gente real.</span><br><em>Conexões.</em></h1><p class="hero-text">Encontros ao vivo, salas e transmissões.</p><div class="hero-cta"><button class="ui-btn btn-dark">Encontrar alguém</button><button class="ui-btn btn-quiet">Como funciona</button></div></div><div class="hero-art"><div class="orbit"></div><div class="portrait portrait-a"><div class="portrait-inner"></div><div class="portrait-label">Você</div></div><div class="portrait portrait-b"><div class="portrait-inner"></div><div class="portrait-label">Outra pessoa</div></div></div></div></section>';
   await page.setContent(frame(appCss,landing));
   await checkOverflow(page,width,'landing');
   const landingColor=await page.evaluate(()=>getComputedStyle(document.querySelector('.landing-hero')).backgroundColor);
   assert(landingColor==='rgba(0, 0, 0, 0)'||landingColor==='rgb(255, 255, 255)','Accent-gradient hero should replace fixed yellow '+width);
   const auth='<div class="auth-shell"><aside class="auth-visual"><a class="brand">entre.</a><h2>Uma conversa real.</h2></aside><main class="auth-main"><div class="auth-card"><h1>Bom ter você de volta.</h1><form><div class="field"><label for="email">E-mail</label><input id="email"></div><div class="auth-email-links"><button class="text-link" type="button">Esqueci minha senha</button></div><button type="submit" id="authSubmit">Entrar</button></form></div></main></div>';
   await page.setContent(frame(appCss,auth));
   await checkOverflow(page,width,'auth');
   const forgot=await page.locator('.auth-email-links .text-link').boundingBox();
   assert(forgot&&forgot.width>70&&forgot.width<205,'Recovery link must be compact '+width+': '+JSON.stringify(forgot));
   const app='<div class="app-shell"><aside class="sidebar"><div class="sidebar-top"><a class="brand">entre.</a></div><nav class="nav-stack"><button class="nav-item active">Feed</button></nav></aside><main class="app-main"><header class="app-toolbar"><h1>Ao vivo.</h1><div class="toolbar-right"><button class="toolbar-global-search">'+icon+'</button><button class="toolbar-bell">'+icon+'</button><button class="toolbar-profile"><span class="avatar">L</span></button></div></header><div id="view-content"><section class="connect-app-screen"><div class="live-app-card"><span class="live-app-eyebrow">ENCONTRO PRIVADO</span><h2>Como você quer conversar?</h2><div class="live-modes"><button class="live-mode selected">Texto</button><button class="live-mode">Vídeo</button></div><button class="live-app-find">Encontrar alguém</button></div></section></div></main><nav class="mobile-nav">'+['Feed','Ao vivo','Salas','Lives','Conversas'].map((x,i)=>'<button title="'+x+'" class="'+(i===1?'active':'')+'">'+icon+'<span>'+x+'</span></button>').join('')+'</nav></div>';
   await page.setContent(frame(appCss,app));
   await checkOverflow(page,width,'app');
   if(width<=1020){
    const nav=await page.evaluate(()=>{
     const el=document.querySelector('.mobile-nav'),r=el.getBoundingClientRect();
     return {x:r.x,width:r.width,bottom:r.bottom,viewport:innerWidth,height:innerHeight,visible:getComputedStyle(el).display};
    });
    assert(nav.visible!=='none'&&nav.x>=0&&nav.x+nav.width<=width+1,'Floating nav outside viewport '+width+': '+JSON.stringify(nav));
    assert(nav.bottom<=810+1&&nav.bottom>650,'Floating nav not at screen bottom '+width);
    const toolbar=await page.locator('.app-toolbar').boundingBox();
    assert(toolbar&&toolbar.x>=0&&toolbar.x+toolbar.width<=width+1,'Toolbar overflow '+width);
   }
   const share='<div class="share-wrap"><header class="share-topbar"><a class="share-brand"><span class="brand-mark">e.</span>entre.</a><a class="share-home-top">Ir para o site</a></header><main class="share-main"><section class="share-intro"><span class="share-kicker">PERFIL COMPARTILHADO</span><h1>Um novo papo.<br><em>Uma conexão.</em></h1><p>Conheça uma pessoa.</p></section><section class="share-profile-card"><div class="share-cover"><span class="cover-label">CONEXÕES REAIS</span></div><div class="share-profile-content"><div class="share-avatar-wrap"><div class="share-avatar">L</div></div><div class="share-identity"><h2>Uma pessoa</h2><p>@usuario</p></div><div class="share-cta"><a class="share-primary">Ir para o site</a><a class="share-secondary">Criar minha conta</a></div></div></section></main></div>';
   await page.setContent(frame(publicCss,share));
   await checkOverflow(page,width,'share');
   const cover=await page.evaluate(()=>getComputedStyle(document.querySelector('.share-cover')).backgroundColor);
   assert.equal(cover,'rgb(26, 157, 145)','Shared profile cover should use configurable accent '+width);
   const info='<div class="info-page"><header class="info-header"><div class="info-wrap"><a class="info-brand">entre.</a></div></header><section class="info-hero"><div class="info-wrap"><span class="info-kicker">DADOS</span><h1>Seus dados.</h1></div></section></div>';
   await page.setContent(frame(infoCss,info));
   await checkOverflow(page,width,'info');
   const admin='<div class="shell"><aside class="rail"><div class="brand">entre.</div></aside><main class="main"><header class="topbar"><div class="topbar-left">entre. / ADM</div></header><section class="page-intro"><h1 class="page-title">Visão geral.</h1></section><div class="stat-grid"><div class="stat accent"><span class="stat-label">Usuários</span><strong>24</strong></div><div class="stat"><span class="stat-label">Novos</span><strong>12</strong></div></div></main><nav class="bottom-nav admin-bottom-bar">'+['Início','Usuários','Denúncias','Contestações','Mais'].map(n=>'<button data-view="'+n+'">'+icon+'<span>'+n+'</span></button>').join('')+'</nav></div>';
   await page.setContent(frame(adminCss,admin));
   await checkOverflow(page,width,'admin');
   if(width<=1000){
    const nav=await page.locator('.bottom-nav').boundingBox();
    assert(nav&&nav.x>=0&&nav.x+nav.width<=width+2,'Admin mobile navbar outside viewport '+width+': '+JSON.stringify(nav));
   }
   console.log('PASS Yellow Pop UI: landing, login, app, shared profile, info and ADM at '+width+'px');
   await page.close();
  }
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1;});
