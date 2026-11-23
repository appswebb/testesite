/* Browser layout smoke test: no real Supabase session, camera or private data required. */
const {chromium}=require('playwright');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const assert=require('node:assert/strict');

const read=name=>readFileSync(resolve(__dirname,'../docs',name),'utf8');
const styles=['styles.css','motion.css','mobile.css','features.css','social.css',
 'social-online.css','social-animations.css','entre-features.css','encounter-ui.css'].map(read).join('\n');
const app=read('app.js'),video=read('entre-video.js');
const pair={id:'test',a:'a',b:'b',mode:'video',status:'active',expires_at:new Date(Date.now()+300000).toISOString()};
const peer={id:'b',display_name:'Conexão de teste',age:25};
const icon=n=>'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/></svg>';
const videoBlock=video.slice(video.indexOf('const activePair='),video.indexOf('function status(message)'));
const media=new Function('ico','esc',videoBlock+'return {markup,miniMarkup};')(icon,String);
const uiBlock=app.slice(app.indexOf('function activeEncounter(){'),app.indexOf('function appLayout(){'));
const state={pair,peer,view:'connect',session:{user:{id:'a'}}};
const scene=new Function('state','window','esc','ico','avatar','messagesMarkup',
 uiBlock+'return {videoEncounterView,encounterMiniMarkup};')(
 state,{entreVideo:{markup:media.markup,miniMarkup:media.miniMarkup},entreSocial:{chatToolbar:()=>'',historyButton:()=>''}},
 String,icon,()=>'<span class="avatar">CT</span>',()=>'<div class="bubble-row theirs"><div class="bubble">Oi!</div></div>');
const intro='<div class="app-toolbar"><h1>Ao vivo<span class="dot">.</span></h1></div>';
const wrap=(body)=>'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+styles+'</style></head><body>'+
'<div id="app"><div class="app-shell"><aside class="sidebar"><div class="brand">entre.</div></aside><main class="app-main">'+intro+'<div id="view-content">'+body+'</div></main>'+
'<nav class="mobile-nav"><button>Online</button><button>Ao vivo</button><button>Posts</button><button>Conversas</button></nav></div></div></body></html>';

(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 let assertions=0;
 try{
  const page=await browser.newPage();
  for(const width of [390,768,1365]){
   await page.setViewportSize({width,height:880});
   await page.setContent(wrap(scene.videoEncounterView(pair,peer,false,false)),{waitUntil:'load'});
   const dims=await page.evaluate(()=>{
    const sel=s=>document.querySelector(s)?.getBoundingClientRect();
    return {viewport:innerWidth,scroll:document.documentElement.scrollWidth,remote:sel('.video-remote'),
     chat:sel('.encounter-conversation'),stage:sel('.encounter-stage'),workspace:sel('.encounter-workspace'),
     messages:sel('#messageList'),composer:sel('#messageForm')};
   });
   assert.ok(dims.scroll<=width+2,'Horizontal overflow in video encounter at '+width+': '+JSON.stringify(dims));
   assert.ok(dims.remote&&dims.remote.width>140,'Remote video has enough room at '+width);
   assert.ok(dims.chat&&dims.chat.width>180,'Chat remains usable at '+width);
   assert.ok(dims.messages&&dims.composer,'Chat and composer are inside the video encounter at '+width);
   if(width<=768)assert.ok(dims.chat.top>=dims.stage.bottom-2,'Chat should stack below video at '+width);
   else assert.ok(dims.chat.left>=dims.stage.right-2,'Desktop chat should sit beside video');
   assertions+=5;
  }
  const checkout='<section class="premium-checkout"><div class="premium-pitch"><span class="premium-label">ENTRE. PREMIUM</span><h3>Seja notado. Conecte-se do seu jeito.</h3><p>Encontros e preferências personalizadas.</p><div class="premium-perks"><div>Compatibilidade e preferências</div></div></div><div class="premium-checkout-card"><span>ASSINATURA RECORRENTE</span><h3>Valor a definir</h3><p>Pagamento pelo Mercado Pago.</p><button class="ui-btn btn-dark" disabled>Aguardando ativação do checkout</button><small>Nenhum cartão armazenado.</small></div></section>';
  for(const width of [320,390,768,1365]){
   await page.setViewportSize({width,height:880});
   await page.setContent(wrap(checkout),{waitUntil:'load'});
   const dims=await page.evaluate(()=>{
    const box=s=>document.querySelector(s)?.getBoundingClientRect();
    return {scroll:document.documentElement.scrollWidth,card:box('.premium-checkout-card'),
     button:box('.premium-checkout-card .ui-btn'),panel:box('.premium-pitch')};
   });
   assert.ok(dims.scroll<=width+2,'Premium checkout overflows viewport at '+width);
   assert.ok(dims.card.width<=width,'Checkout card too wide at '+width);
   assert.ok(dims.button.width<=dims.card.width,'Checkout button too wide at '+width);
   assert.ok(dims.card.height<520,'Checkout card unexpectedly stretched at '+width);
   assertions+=4;
  }
  state.view='posts';
  await page.setViewportSize({width:390,height:844});
  await page.setContent(wrap('<div>Posts continuam disponíveis.</div>')+'' ,{waitUntil:'load'});
  await page.evaluate(html=>document.body.insertAdjacentHTML('beforeend',html),scene.encounterMiniMarkup());
  const mini=await page.evaluate(()=>{
   const m=document.querySelector('.encounter-floating'),nav=document.querySelector('.mobile-nav');
   return {box:m?.getBoundingClientRect(),nav:nav?.getBoundingClientRect()};
  });
  assert.ok(mini.box&&mini.nav&&mini.box.bottom<mini.nav.top+2,'Mini video should stay above mobile navigation');
  assertions++;
  console.log('PASS encounter browser layouts: '+assertions+' checks (320–1365 px)');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
