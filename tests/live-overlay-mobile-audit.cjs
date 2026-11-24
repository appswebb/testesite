/* Test the actual overlay markup and scroll behavior with simulated media only. */
const {chromium}=require('playwright');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const assert=require('node:assert/strict');
const read=p=>readFileSync(resolve(__dirname,'../docs',p),'utf8');
const css=['styles.css','experience-hub.css','theme.css','connect-experience.css','connect-ui.css','live-explore.css'].map(read).join('\n');
const source=read('camera-lives.js').replace('window.entreLives={','window.__testLive={s,interaction,paintInteractions};window.entreLives={');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[320,568],[360,640],[390,844],[844,390],[1280,800]]){
   const page=await browser.newPage({viewport:{width,height}});
   await page.setContent('<!doctype html><html data-theme="light"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body><div id="app"><div class="cn-shell app-shell"><main class="cn-main app-main"><header class="cn-toolbar">Lives</header><div id="view-content" class="cn-view"></div></main><nav class="cn-bottom-nav cn-dock"></nav></div></div></body></html>');
   await page.addScriptTag({content:`var state={view:'lives',session:{user:{id:'mock'}}};var esc=v=>String(v??'').replace(/[&<>"]/g,'');var ico=()=>'<svg width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>';var profileName=(id,name)=>esc(name);var renderView=()=>document.getElementById('view-content').innerHTML=window.entreLives.view();`});
   await page.addScriptTag({content:source});
   await page.evaluate(()=>{const t=window.__testLive;t.s.active={id:'test',title:'Uma transmissão ao vivo',host_name:'Anfitrião',started_at:new Date().toISOString()};t.s.localRole='host';t.interaction.ready=true;renderView();t.paintInteractions();});
   const geometry=await page.evaluate(()=>{const rect=s=>{const x=document.querySelector(s).getBoundingClientRect();return {top:x.top,bottom:x.bottom,left:x.left,right:x.right,width:x.width,height:x.height}};return {stage:rect('.connect-live-overlay'),video:rect('#cameraLiveVideos'),social:rect('.connect-live-social'),form:rect('#connectLiveCommentForm'),header:rect('.camera-live-stage-head'),scroll:document.documentElement.scrollWidth};});
   assert(geometry.scroll<=width+1,'Horizontal overflow '+width);
   assert(Math.abs(geometry.stage.top-geometry.video.top)<1&&Math.abs(geometry.stage.bottom-geometry.video.bottom)<1,'Video not filling stage '+width);
   for(const k of ['social','form','header']){assert(geometry[k].top>=geometry.stage.top-1&&geometry[k].bottom<=geometry.stage.bottom+1,'Overlay outside stage '+k+' '+width);}
   await page.evaluate(()=>{const t=window.__testLive;t.interaction.comments=Array.from({length:25},(_,i)=>({id:String(i),name:'Pessoa',body:'Mensagem '+i,can_delete:false}));t.paintInteractions();});
   const result=await page.evaluate(()=>{const list=document.getElementById('connectLiveMessages');const old=list.querySelector('[data-live-comment-id="24"]');window.__testLive.interaction.comments.push({id:'25',name:'Pessoa',body:'Última mensagem'});window.__testLive.paintInteractions();return {same:old===list.querySelector('[data-live-comment-id="24"]'),newest:list.lastElementChild.lastElementChild.textContent,bottom:list.scrollHeight-list.scrollTop-list.clientHeight};});
   assert(result.same,'Old comment DOM was replaced');assert.match(result.newest,/Última mensagem/);assert(result.bottom<2,'New comment not visible at bottom');
   const before=await page.locator('.connect-live-overlay').boundingBox();
   await page.mouse.move(before.x+before.width/2,before.y+15);await page.mouse.wheel(0,650);
   await page.evaluate(()=>window.scrollTo(0,900));
   const after=await page.locator('.connect-live-overlay').boundingBox();
   assert(Math.abs(before.y-after.y)<1,'Broadcast moved on page scroll '+width);
   assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).overflow),'hidden');
   await page.evaluate(()=>{window.__testLive.s.active=null;renderView();});
   assert.notEqual(await page.evaluate(()=>getComputedStyle(document.documentElement).overflow),'hidden','Scroll lock not released on exit');
   console.log('PASS compact LIVE overlay '+width+'x'+height);
   await page.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
