const {chromium}=require('playwright');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const assert=require('node:assert/strict');
const docs=path=>readFileSync(resolve(__dirname,'../docs',path),'utf8');
const stylePaths=['styles.css','motion.css','mobile.css','features.css','social.css','social-online.css','entre-features.css','encounter-ui.css','entre-location.css','functional-updates.css','interface-polish.css','live-experience.css','experience-hub.css','once-ui.css','once-public.css','once-maintenance.css','theme.css','once-source-fidelity.css','once-source-components.css','color-consistency.css'];
const head='<meta name="viewport" content="width=device-width,initial-scale=1">';
const fixture='<div id="app"><div class="app-shell"><aside class="sidebar"><div class="sidebar-top"><a class="brand"><span class="brand-glyph"><i></i><i></i></span>entre.</a></div><nav class="nav-stack"><button class="nav-item active">Feed</button></nav></aside><main class="app-main"><header class="app-toolbar"><h1>entre.</h1><button class="toolbar-bell" aria-label="Notificações">◉</button></header><div id="view-content"><div class="app-heading"><h2>Configurações.</h2></div><div id="themePanel"></div><section class="settings-card"><h3>Preferências</h3><div class="setting-row"><strong>Experiência</strong><button class="ui-btn btn-dark">Salvar alterações</button></div></section><section class="post-card"><strong>Post no Feed</strong><p>Olá mundo</p></section></div></main><nav class="mobile-nav"><button class="active" title="Feed"><svg width="23" height="23"></svg></button><button title="Ao vivo"><svg width="23" height="23"></svg></button><button title="Conversas"><svg width="23" height="23"></svg></button></nav></div></div>';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [320,375,430,800,1280]){
   const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce'});
   const page=await context.newPage();
   page.setDefaultTimeout(5000);
   await page.route('http://entre-test.local/**',async route=>{
    const url=new URL(route.request().url());
    const name=url.pathname.slice(1);
    if(name==='test')return route.fulfill({status:200,contentType:'text/html',body:'<html lang="pt-BR"><head>'+head+stylePaths.map(p=>'<link rel="stylesheet" href="/'+p+'">').join('')+'<meta name="theme-color" content="#f6f7f7"></head><body>'+fixture+'<script src="/theme.js"></script></body></html>'});
    if(name==='brand-mark.svg')return route.fulfill({status:200,contentType:'image/svg+xml',body:docs(name)});
    if(name==='theme.js'||name.endsWith('.css'))return route.fulfill({status:200,contentType:name.endsWith('.js')?'text/javascript':'text/css',body:docs(name)});
    return route.fulfill({status:404,body:'missing'});
   });
   await page.goto('http://entre-test.local/test',{waitUntil:'load'});
   await page.evaluate(()=>{document.getElementById('themePanel').innerHTML=window.entreTheme.renderControls();});
   assert.equal(await page.locator('[data-theme-mode]').count(),3);
   assert.equal(await page.locator('[data-theme-mode=light]').getAttribute('aria-pressed'),'true');
   await page.locator('[data-theme-mode="dark"]').click();
   const dark=await page.evaluate(()=>({
    mode:document.documentElement.dataset.theme,
    background:getComputedStyle(document.body).backgroundColor,
    post:getComputedStyle(document.querySelector('.post-card')).backgroundColor,
    text:getComputedStyle(document.body).color,
    nav:getComputedStyle(document.querySelector('.mobile-nav')).backgroundColor,
    saved:JSON.parse(localStorage.getItem('entre.appearance.v1')).mode,
    rootBackground:getComputedStyle(document.documentElement).getPropertyValue('--ui-bg').trim(),
    html:document.documentElement.outerHTML.slice(0,240),
    loadedCSS:[...document.styleSheets].map(x=>x.href||'inline').slice(-5),
    inlineBodyStyle:document.body.style.cssText,
    inlinePostStyle:document.querySelector('.post-card').style.cssText,
    postStylePriority:document.querySelector('.post-card').style.getPropertyPriority('background'),
    postTransitionProperty:getComputedStyle(document.querySelector('.post-card')).transitionProperty,
    postTransitionDuration:getComputedStyle(document.querySelector('.post-card')).transitionDuration,
    postAnimations:document.querySelector('.post-card').getAnimations().length,
    bodyBgPriority:document.body.style.getPropertyPriority('background-color'),
    bodyBgInline:document.body.style.getPropertyValue('background-color'),
    hasThemeCSS:[...document.styleSheets].some(sheet=>(sheet.href||'').includes('theme.css')),
    computedRootBg:getComputedStyle(document.documentElement).backgroundColor
   }));
   if(dark.background!=='rgb(16, 17, 20)'||dark.post!=='rgb(25, 28, 33)')console.error('DARK THEME DIAGNOSTIC '+JSON.stringify(dark));
   assert.equal(dark.mode,'dark');
   assert.equal(dark.background,'rgb(16, 17, 20)','Dark background is not applied '+width);
   assert.equal(dark.post,'rgb(25, 28, 33)','Dark card is not applied '+width);
   assert.equal(dark.nav,'rgba(25, 28, 33, 0.98)','Mobile navigation must respect dark mode '+width);
   assert.equal(dark.saved,'dark');
   await page.reload({waitUntil:'load'});
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark','Dark mode must persist after reload '+width);
   await page.evaluate(()=>{document.getElementById('themePanel').innerHTML=window.entreTheme.renderControls();});
   await page.locator('[data-theme-mode=custom]').click();
   await page.evaluate(()=>{
    const p=document.getElementById('appearanceColor');
    p.value='#2977d5';p.dispatchEvent(new Event('input',{bubbles:true}));
   });
   const custom=await page.evaluate(()=>({
    mode:document.documentElement.dataset.theme,
    accent:getComputedStyle(document.documentElement).getPropertyValue('--ui-accent').trim(),
    selected:document.querySelector('[data-theme-mode=custom]').getAttribute('aria-pressed'),
    text:getComputedStyle(document.querySelector('.ui-btn.btn-dark')).color,
    background:getComputedStyle(document.querySelector('.ui-btn.btn-dark')).backgroundColor,
    saved:JSON.parse(localStorage.getItem('entre.appearance.v1'))
   }));
   assert.equal(custom.mode,'custom');
   assert.equal(custom.accent,'#2977D5');
   assert.equal(custom.selected,'true');
   assert.equal(custom.background,'rgb(41, 119, 213)');
   assert.equal(custom.saved.color,'#2977D5');
   await page.locator('[data-theme-mode=light]').click();
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'light');
   await page.evaluate(()=>{
    localStorage.setItem('entre.motionForce','1');
    document.body.classList.add('motion-force');
   });
   await page.addScriptTag({content:docs('motion.js')});
   await page.locator('.ui-btn.btn-dark').click();
   const count=await page.locator('.entre-touch-wave').count();
   assert(count>=1,'Touch feedback did not render despite force-animations setting '+width);
   const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,w:innerWidth,overflow:[...document.querySelectorAll('*')].map(el=>({tag:el.tagName,cls:String(el.className||'').slice(0,65),r:el.getBoundingClientRect().right})).filter(x=>x.r>innerWidth+2).slice(0,8)}));
   assert(dims.scroll<=width+2,'Theme picker caused mobile horizontal scrolling '+width+'px: '+JSON.stringify(dims));
   const brand=await page.evaluate(()=>getComputedStyle(document.querySelector('.brand-glyph')).backgroundImage);
   assert(brand.includes('brand-mark.svg'),'Incorrect app logo styling '+width);
   console.log('PASS theme/light/dark/custom/persistence/logo/motion at '+width+'px');
   await context.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
