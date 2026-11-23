const {chromium}=require('playwright');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const assert=require('node:assert/strict');
const read=n=>readFileSync(resolve(__dirname,'../docs',n),'utf8');
const styles=['styles.css','motion.css','mobile.css','features.css','social.css','social-online.css','entre-features.css','encounter-ui.css','entre-location.css','functional-updates.css','interface-polish.css','live-experience.css','experience-hub.css'].map(read).join('\n');
const ico=(name,size=20)=>'<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>';
const header='<header class="app-toolbar"><h1>entre.</h1><div class="toolbar-right"><button class="toolbar-global-search">'+ico('search')+'</button><button class="toolbar-bell">'+ico('bell')+'</button><button class="toolbar-profile"><span class="avatar">L</span></button></div></header>';
const mobile='<nav class="mobile-nav">'+['Feed','Ao vivo','Salas','Lives','Conversas'].map(x=>'<button>'+ico(x)+'<span>'+x+'</span></button>').join('')+'</nav>';
const html=()=>'<html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+styles+'</style></head><body><div id="app"><div class="app-shell"><aside class="sidebar"><div class="brand">entre.</div></aside><main class="app-main">'+header+'<div id="view-content" class="scene-enter"></div></main>'+mobile+'</div></div></body></html>';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [320,360,390,430,768,1366]){
   const page=await browser.newPage({viewport:{width,height:820}});
   await page.setContent(html(),{waitUntil:'load'});
   await page.evaluate(()=>{
    window.state={session:{user:{id:'member'}},view:'rooms',profile:{display_name:'Teste'}};
    window.heading=(a,b,c)=>'<div class="app-heading"><span>'+a+'</span><h2>'+b+'</h2><p>'+c+'</p></div>';
    window.ico=n=>'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg>';
    window.esc=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
    window.avatar=p=>'<span class="avatar">X</span>';
    window.entreGeo={details:()=>({self:{state:'SP'}})};
    window.toast=()=>{};
   });
   for(const src of ['site-search.js','rooms.js','camera-lives.js','premium-recurring.js'])await page.addScriptTag({content:read(src)});
   for(const [mode,call] of [['rooms','entreRooms'],['search','entreSearch'],['lives','entreLives']]){
    const sizes=await page.evaluate(([mode,call])=>{
     state.view=mode;
     document.getElementById('view-content').innerHTML=window[call].view();
     const frame=document.querySelector('#view-content'),nav=document.querySelector('.mobile-nav');
     return {window:innerWidth,scroll:document.documentElement.scrollWidth,frame:frame.getBoundingClientRect().width,
     navWidth:nav.getBoundingClientRect().width,roomInput:document.querySelector('#roomText')?.getBoundingClientRect().width,
     title:document.querySelector('.app-heading h2')?.textContent};
    },[mode,call]);
    assert.ok(sizes.scroll<=width+2,mode+' overflow at '+width+': '+JSON.stringify(sizes));
    assert.ok(sizes.frame<=width+2,mode+' content outside viewport '+width);
    if(mode==='rooms')assert.ok(sizes.roomInput>65,'Chat composer squeezed '+width);
   }
   await page.evaluate(()=>{
    document.getElementById('view-content').innerHTML='<div class="auth-card"><form><div class="auth-email-links"><button type="button" class="text-link" data-action="forgot">Esqueci minha senha</button></div></form></div>';
   });
   const forgot=await page.evaluate(()=>{
    const btn=document.querySelector('.auth-email-links .text-link'),rect=btn.getBoundingClientRect();
    return {width:rect.width,height:rect.height,viewport:innerWidth,body:document.documentElement.scrollWidth};
   });
   assert.ok(forgot.width>90&&forgot.width<200,'Forgot password must be link-sized '+width+': '+JSON.stringify(forgot));
   assert.ok(forgot.height<35,'Forgot password should not be giant '+width);
   assert.ok(forgot.body<=width+2,'Password page horizontal overflow '+width);
   console.log('PASS community UI at '+width+'px: Search, Rooms, Lives, recovery');
   await page.close();
  }
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1});
