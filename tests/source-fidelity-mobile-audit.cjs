/* Source archive design adaptation · real Chromium audit.
 * Layout-only fixtures avoid making requests to private Supabase accounts. */
const {chromium}=require('playwright');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const assert=require('node:assert/strict');
const docs=n=>readFileSync(resolve(__dirname,'../docs',n),'utf8');
const css=[
 'styles.css','motion.css','mobile.css','features.css','social.css',
 'social-online.css','entre-features.css','encounter-ui.css','entre-location.css',
 'functional-updates.css','interface-polish.css','live-experience.css',
 'experience-hub.css','once-ui.css','once-public.css','once-maintenance.css',
 'theme.css','once-source-fidelity.css','once-source-components.css'
].map(docs).join('\n');
const icon='<svg width="22" height="22" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>';
const hero='<header class="home-header"><div class="home-bar wrap"><a class="brand">entre.</a><div class="home-actions"><button class="ui-btn btn-quiet">Entrar</button><button class="ui-btn btn-dark">Criar conta</button></div></div></header>'+
 '<main><section class="landing-hero"><div class="wrap hero-grid"><div class="hero-copy"><span class="hero-kicker">✳ Um jeito diferente</span><h1 class="hero-title">Papo bom.<br><span class="once-subline">Gente real.</span><br><em>Conexões.</em></h1><p class="hero-text">Encontros de cinco minutos, chats pelo Brasil e lives com câmera.</p><div class="hero-cta"><button class="ui-btn btn-dark">Encontrar alguém</button></div><div class="hero-foot">Tudo começa com um oi.</div></div>'+
 '<div class="hero-art"><div class="orbit"></div><div class="portrait portrait-a"><div class="portrait-inner"></div><div class="portrait-label">Outra pessoa</div></div><div class="portrait portrait-b"><div class="portrait-inner"></div><div class="portrait-label">Você</div></div><div class="hero-time"><strong>05:00</strong><span>PARA CONVERSAR</span></div><div class="once-extra-card once-chat-card">'+icon+' Oi!</div><div class="once-extra-card once-location-card">'+icon+' Brasil</div><span class="once-sticker once-sticker-a">✳</span><span class="once-sticker once-sticker-b">♡</span></div></div></section>'+
 '<section class="once-feature-spotlight"><div class="wrap once-feature-inner"><div class="once-feature-copy"><span class="once-feature-eyebrow">A COMUNIDADE</span><h2>Conheça pessoas.<br><em>De verdade.</em></h2><p>Uma conversa por vez.</p><button type="button" class="once-feature-cta">Conversar</button></div><div class="once-feature-art"><div class="once-figure once-figure-a"><strong>05:00</strong></div><div class="once-figure once-figure-b"><strong>Sintonia</strong></div><span class="once-figure-stamp">oi!</span></div></div></section></main>';
const app='<div class="app-shell"><aside class="sidebar"><div class="sidebar-top"><a class="brand">entre.</a></div><nav class="nav-stack"><button class="nav-item active">Feed</button></nav></aside><main class="app-main"><div class="app-toolbar"><h1>Ao vivo.</h1><div class="toolbar-right"><button class="toolbar-global-search">'+icon+'</button><button class="toolbar-bell">'+icon+'</button><button class="toolbar-profile"><span class="avatar">L</span></button></div></div><div id="view-content" class="scene-enter"><div class="app-heading"><h2>Conheça <em>pessoas.</em></h2><p>Comece uma conversa agora.</p></div><section class="connect-app-screen"><div class="live-app-card"><h2>Como você quer conversar?</h2><div class="live-modes"><button class="live-mode selected">Texto</button><button class="live-mode">Vídeo</button></div><details class="live-app-filters"><summary>Filtros</summary></details><button class="live-app-find">Encontrar alguém</button></div></section></div></main><nav class="mobile-nav">'+['Feed','Ao vivo','Salas','Lives','Conversas'].map(x=>'<button title="'+x+'">'+icon+'</button>').join('')+'</nav></div>';
const comments='<div class="comments-overlay"><section class="comments-dialog"><header class="comments-dialog-header"><div><h2>Comentários</h2><p>Conversa no Feed</p></div><button class="comments-dialog-close">✕</button></header><div class="comments-dialog-list">'+
 Array(18).fill('<article class="full-comment"><div class="full-comment-content"><div class="full-comment-top"><strong>Pessoa</strong></div><p>Comentário de teste.</p><div class="full-comment-buttons"><button>Responder</button><button>Denunciar</button></div></div></article>').join('')+
 '</div><footer class="comments-dialog-footer"><form class="post-comment-form"><input placeholder="Escreva um comentário"><button>➤</button></form></footer></section></div>';
const wrap=(content,mode='light')=>'<!doctype html><html data-theme="'+mode+'" lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body>'+content+'</body></html>';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [320,360,390,430,768,1280]){
   const page=await browser.newPage({viewport:{width,height:840}});
   await page.setContent(wrap(hero));
   const h=await page.evaluate(()=>{
    const art=document.querySelector('.hero-art'),title=document.querySelector('.hero-title'),feat=document.querySelector('.once-feature-inner');
    return {viewport:innerWidth,scroll:document.documentElement.scrollWidth,
      titleFont:getComputedStyle(title).fontFamily,
      artWidth:art.getBoundingClientRect().width,
      artBox:art.getBoundingClientRect().toJSON(),
      featureWidth:feat.getBoundingClientRect().width};
   });
   assert(h.scroll<=width+2,'Landing horizontally overflows '+width+'px: '+JSON.stringify(h));
   assert(h.titleFont.includes('Paytone One'),'Source display typography missing '+width);
   assert(h.artWidth<=width+2,'Collage wider than viewport '+width);
   await page.setContent(wrap(app));
   const a=await page.evaluate(()=>{
    const btn=document.querySelector('.live-app-find').getBoundingClientRect();
    const card=document.querySelector('.live-app-card').getBoundingClientRect();
    const nav=document.querySelector('.mobile-nav').getBoundingClientRect();
    return {scroll:document.documentElement.scrollWidth,button:btn.toJSON(),card:card.toJSON(),nav:nav.toJSON()};
   });
   assert(a.scroll<=width+2,'App horizontal overflow '+width+'px');
   assert(a.button.bottom<=a.card.bottom+1,'Search button outside compact card '+width);
   if(width<=1020)assert(a.nav.left>=0&&a.nav.right<=width+2,'Floating bar leaves viewport '+width);
   if(width<=430){
    await page.setContent(wrap(comments));
    const c=await page.evaluate(()=>{
     const box=document.querySelector('.comments-dialog').getBoundingClientRect(),
       foot=document.querySelector('.comments-dialog-footer').getBoundingClientRect();
     return {box:box.toJSON(),footer:foot.toJSON(),scroll:document.documentElement.scrollWidth,height:innerHeight};
    });
    assert(c.scroll<=width+2,'Comments overflow '+width);
    assert(c.footer.bottom<=c.height+2,'Comment send button hidden at '+width);
    assert(c.box.height>=340,'Comment overlay unexpectedly tiny '+width);
   }
   await page.setContent(wrap(app,'dark'));
   const dark=await page.evaluate(()=>({
    bg:getComputedStyle(document.body).backgroundColor,
    panel:getComputedStyle(document.querySelector('.live-app-card')).backgroundColor
   }));
   assert.equal(dark.bg,'rgb(16, 17, 20)','Dark mode body must be dark at '+width+': '+JSON.stringify(dark));
   assert.equal(dark.panel,'rgb(25, 28, 33)','Dark mode card must be dark at '+width+': '+JSON.stringify(dark));
   console.log('PASS fidelity / editorial / app / comments / dark at '+width+'px');
   await page.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
