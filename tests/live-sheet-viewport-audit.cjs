/* Real Chromium viewport audit: Live filters must not get clipped by scene transforms. */
const {chromium}=require('playwright');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const read=file=>readFileSync(resolve(__dirname,'../docs',file),'utf8');
const app=read('app.js');
const geo=read('entre-location.js');
const icon=name=>'<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="8"/></svg>';
const context={window:{},document:{addEventListener(){}},navigator:{},db:{},state:{searching:false,view:'connect'},esc:s=>String(s),ico:icon,renderView(){},console};
vm.runInNewContext(geo,context,{filename:'entre-location.js'});
const compact=context.window.entreGeo.compactPanel(false);
const start=app.indexOf('function connectView(){'),end=app.indexOf('function pairView(){');
const live=new Function('state','window','esc','ico',app.slice(start,end)+'return connectView;');
const uiState={pair:null,searching:false,session:{user:{id:'self'}},liveMode:'chat',preference:'any',liveFiltersOpen:false};
const liveMarkup=live(uiState,{entreExtras:{isPremium:()=>false},entreGeo:{compactPanel:()=>compact}},x=>String(x),icon)();
const syncBlock=app.slice(app.indexOf('function syncLiveFilters('),app.indexOf('function render(){'));
const css=['styles.css','motion.css','mobile.css','features.css','social.css','entre-location.css','functional-updates.css','interface-polish.css','live-experience.css'].map(read).join('\n');
const html='<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"/><style>'+css+'</style></head><body><div id="app"><div class="app-shell"><main class="app-main"><header class="app-toolbar"><h1>Ao vivo.</h1><div class="toolbar-right"><button class="toolbar-bell">'+icon('bell')+'</button><button class="toolbar-profile"><span class="avatar">L</span></button></div></header><div id="view-content" class="scene-enter">'+liveMarkup+'</div></main></div></div></body></html>';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [width,height] of [[320,640],[360,740],[390,840],[430,850],[768,1024]]){
   const page=await browser.newPage({viewport:{width,height}});
   await page.setContent(html,{waitUntil:'load'});
   const before=await page.evaluate(()=>{
    const box=s=>document.querySelector(s)?.getBoundingClientRect();
    return {card:box('.live-app-card'),button:box('.live-app-find'),bodyScroll:document.documentElement.scrollWidth,toolbarBg:getComputedStyle(document.querySelector('.toolbar-profile')).backgroundColor};
   });
   assert(before.button&&before.card&&before.button.bottom<before.card.bottom,'Main search action inside card');
   assert(before.bodyScroll<=width+2,'No horizontal overflow '+width);
   assert(before.card.height<530,'Compact card must not use most of a phone screen '+width+': '+before.card.height);
   assert.match(before.toolbarBg,/rgba\(0, 0, 0, 0\)|transparent/,'Profile icon has no white background');
   await page.evaluate(source=>{
    const state={view:'connect',liveFiltersOpen:true};
    document.querySelector('.live-app-filters').open=true;
    const sync=new Function('state',source+';return syncLiveFilters;')(state);
    sync();
    window.__sync=sync;
   },syncBlock);
   const after=await page.evaluate(()=>{
    const modal=document.querySelector('body > .live-app-filters'),footer=modal?.querySelector('.live-filter-footer'),btn=modal?.querySelector('.live-filter-find');
    const m=modal?.getBoundingClientRect(),f=footer?.getBoundingClientRect(),b=btn?.getBoundingClientRect();
    return {bodyDirect:modal?.parentElement===document.body,overlay:document.body.classList.contains('live-filters-open'),m,f,b,oldGeo:!!modal?.querySelector('.geo-home-settings'),miniGeo:!!modal?.querySelector('.geo-location-mini'),scrollWidth:document.documentElement.scrollWidth};
   });
   assert(after.bodyDirect,'Drawer must be portaled to document.body '+width);
   assert(after.overlay,'Background is blocked when filter sheet is visible '+width);
   assert(after.b&&after.b.height>=44,'Find button must remain large '+width);
   assert(after.b.bottom<=height+2,'Find button clipped below viewport at '+width+': '+JSON.stringify(after));
   assert(after.f.bottom<=height+2,'Filter footer clipped at '+width);
   assert(after.m.top>=-2,'Top of drawer outside viewport '+width);
   assert(!after.oldGeo&&after.miniGeo,'Location editor must be collapsed into shortcut '+width);
   assert(after.scrollWidth<=width+2,'Drawer causes horizontal overflow '+width);
   console.log('PASS Live filter footer, compact card, toolbar, geo '+width+'x'+height);
   await page.close();
  }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1;});
