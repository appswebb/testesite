/* Browser regression tests for entre. admin, desktop/mobile and maintenance.
   Auth and RPC are mocked; this audits layout and controls, NOT Google OAuth. */
const {chromium}=require('playwright');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const site=path.resolve(__dirname,'..','docs');
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const defaultSettings={matchmaking_enabled:true,reporting_enabled:true,announcement:'',maintenance_enabled:false,maintenance_title:'Tem coisa boa chegando.',maintenance_message:'Estamos preparando uma nova versão do entre.',release_at:new Date().toISOString()};
let settings={...defaultSettings};
const user={id:'0d6a946d-e827-4b87-b1be-b719ac6e2776',email:'l.demelo2004@gmail.com',app_metadata:{provider:'google',providers:['google']}};
const fixture=()=>{
window.__mockedSettings={
 matchmaking_enabled:true,reporting_enabled:true,announcement:new URLSearchParams(location.search).has('announcement_test')?'Aviso importante da comunidade.':'',announcement_version:new URLSearchParams(location.search).has('announcement_test')?77:0,announcement_sent_at:new URLSearchParams(location.search).has('announcement_test')?new Date().toISOString():null,maintenance_enabled:new URLSearchParams(location.search).has('maintenance_test'),
 maintenance_title:'Tem coisa boa chegando.',maintenance_message:'Estamos preparando uma nova versão do entre.',
 release_at:new Date().toISOString()
};
const user={id:'0d6a946d-e827-4b87-b1be-b719ac6e2776',email:'l.demelo2004@gmail.com',app_metadata:{provider:'google',providers:['google']}};
window.supabase={createClient(){return {
auth:{getSession:async()=>({data:{session:{user}}}),getUser:async()=>({data:{user}}),signOut:async()=>({error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
rpc:async(name,params)=>{
const s=window.__mockedSettings;
if(name==='entre_admin_check')return {data:true,error:null};
if(name==='entre_public_settings')return {data:{...s},error:null};
if(name==='entre_admin_overview')return {data:{users:13,new_users_7d:7,waiting:3,active_pairs:2,connected_pairs:4,reports_open:1,messages_24h:12,banned:0,settings:s,signup_trend:Array.from({length:7},(_,i)=>({day:new Date(Date.now()-(6-i)*86400000).toISOString().slice(0,10),count:i+1}))},error:null};
if(name==='entre_admin_set_maintenance'){Object.assign(s,{maintenance_enabled:params._enabled,maintenance_title:params._title,maintenance_message:params._message,release_at:new Date().toISOString()});return {data:{...s},error:null};}
if(name==='entre_admin_users')return {data:{total:0,rows:[]},error:null};
if(name==='entre_admin_reports'||name==='entre_admin_pairs')return {data:[],error:null};
if(name==='entre_admin_save_settings'){Object.assign(s,{matchmaking_enabled:params._matchmaking,reporting_enabled:params._reporting,announcement:params._announcement});return {data:{...s},error:null};}
if(name==='entre_is_banned')return {data:new URLSearchParams(location.search).has('ban_test'),error:null};
if(name==='entre_my_suspension')return {data:{suspended:new URLSearchParams(location.search).has('ban_test'),reason:'Suspensão de teste'},error:null};
if(name==='entre_submit_suspension_appeal')return {data:{id:1,status:'pending'},error:null};
if(name==='entre_admin_appeals'||name==='entre_admin_privacy_requests')return {data:[],error:null};
return {data:null,error:null};
},
from(){return {select(){return {eq(){return {maybeSingle:async()=>({data:null,error:null})}}}}};}
}}};
};
(async()=>{
const server=http.createServer((req,res)=>{
 let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 name=(name.endsWith('/')?name+'index.html':name).replace(/^\/+/,'');
 const file=path.resolve(site,name);
 if(!(file===site||file.startsWith(site+path.sep))||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('not found');return;}
 res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});
 fs.createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const port=server.address().port,host='http://127.0.0.1:'+port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
let total=0;
try{
for(const width of [320,360,390,430,768,1024,1440]){
 const page=await browser.newPage({viewport:{width,height:850},isMobile:false,deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(fixture);
 await page.route(/^https?:\/\/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//,route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
 await page.goto(host+'/admin/',{waitUntil:'domcontentloaded'});
 await page.locator('.release-entry--compact').waitFor({timeout:20000});
 await page.locator('.stat').first().waitFor();
 const result=await page.evaluate(()=>{
  const one=s=>document.querySelector(s),rect=s=>one(s)?.getBoundingClientRect();
  const entry=rect('.release-entry--compact'),icon=rect('.release-entry-icon'),copy=rect('.release-entry-copy'),chevron=rect('.release-entry-chevron');
  const topIcon=rect('.stat:first-child .stat-icon'),topLabel=rect('.stat:first-child .stat-label'),stat=rect('.stat:first-child');
  return {scroll:document.documentElement.scrollWidth,viewport:innerWidth,entryHeight:entry.height,iconWithin:icon.left>=entry.left&&icon.right<=entry.right,iconBeforeText:icon.right<=copy.left+1,chevronInside:chevron.right<=entry.right+1,statIconBeforeLabel:topIcon.right<=topLabel.left+1,statWithin:stat.right<=innerWidth+1,navVisible:innerWidth>820||getComputedStyle(one('.bottom-nav .admin-more-button')).display!=='none'};
 });
 assert(result.scroll<=width+1,width+'px: horizontal overflow '+JSON.stringify(result));
 assert(result.entryHeight<150,width+'px: oversized update shortcut '+JSON.stringify(result));
 assert(result.iconWithin&&result.iconBeforeText&&result.chevronInside,width+'px: update shortcut layout '+JSON.stringify(result));
 assert(result.statIconBeforeLabel&&result.statWithin,width+'px: stat icon layout '+JSON.stringify(result));
 assert(result.navVisible,width+'px: update navigation hidden');
 assert.deepEqual(errors,[],width+'px: page errors');
 total++;
 console.log('PASS admin overview',width+'px',JSON.stringify(result));
 await page.click('.release-entry--compact');
 await page.locator('.release-hero').waitFor();
 assert.equal(await page.locator('.release-hero h2').count(),1);
 assert((await page.evaluate(()=>document.documentElement.scrollWidth))<=width+1,width+'px: update section overflow');
 total++;
 if(width===390){
  page.on('dialog',d=>d.accept());
  await page.click('[data-action="toggle-maintenance"]');
  await page.locator('.release-hero.is-active').waitFor();
  assert((await page.locator('.release-hero').innerText()).includes('Visitantes'));
  await page.click('[data-action="toggle-maintenance"]');
  await page.locator('.release-hero:not(.is-active)').waitFor();
  total+=2;
  console.log('PASS activation and release switches');
 }
 await page.close();
}
const preview=await browser.newPage({viewport:{width:360,height:800}});
preview.on('pageerror',e=>{throw e;});
await preview.addInitScript(fixture);
await preview.route(/^https?:\/\/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//,route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
await preview.goto(host+'/?maintenance_preview=1',{waitUntil:'domcontentloaded'});
await preview.locator('#maintenance-screen').waitFor({timeout:20000});
assert((await preview.evaluate(()=>document.documentElement.scrollWidth))<=361,'maintenance preview horizontal overflow');assert.equal(await preview.locator('.maint-admin-link').count(),0,'Maintenance must hide admin entry');
total++;
await preview.close();
console.log('PASS maintenance mobile preview');
const maintenancePage=await browser.newPage({viewport:{width:390,height:850}});
await maintenancePage.addInitScript(fixture);
await maintenancePage.route(/^https?:\/\/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//,route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
await maintenancePage.goto(host+'/?maintenance_test=1',{waitUntil:'domcontentloaded'});
await maintenancePage.locator('#maintenance-screen').waitFor({timeout:15000});
assert.equal(await maintenancePage.locator('.landing-hero').count(),0,'Authenticated admin bypassed maintenance');
await maintenancePage.evaluate(()=>{window.__mockedSettings.maintenance_enabled=false});
await maintenancePage.click('[data-action="maintenanceRefresh"]');
await maintenancePage.waitForURL(/released=/,{timeout:15000});
await maintenancePage.close();
total+=2;console.log('PASS logged-in admin blocked during maintenance and release reload');

const manifest=JSON.parse(fs.readFileSync(path.join(site,'manifest.webmanifest'),'utf8'));
assert.equal(manifest.display,'standalone');
for(const size of [192,512]){
 const png=fs.readFileSync(path.join(site,'icons','icon-'+size+'.png'));
 assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(png.readUInt32BE(16),size);
}
total++;console.log('PASS installable PWA manifest and valid PNG signatures');
for(const width of [320,390,768]){
 const page=await browser.newPage({viewport:{width,height:850}});
 await page.route(/^https?:\/\/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//,r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
 for(const slug of ['instalar','dados','privacidade','termos']){
  await page.goto(host+'/'+slug+'.html',{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('h1').count(),1,slug+' title missing');
  const w=await page.evaluate(()=>document.documentElement.scrollWidth);
  assert(w<=width+1,slug+' overflows at '+width+'px: '+w);
  total++;
 }
 await page.close();
}
console.log('PASS install and LGPD information pages at 320, 390, 768px');
const banned=await browser.newPage({viewport:{width:320,height:800}});
await banned.addInitScript(fixture);
await banned.route(/^https?:\/\/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//,r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
await banned.goto(host+'/?ban_test=1',{waitUntil:'domcontentloaded'});
await banned.locator('#suspension-title').waitFor({timeout:15000});
assert.equal(await banned.locator('.app-shell').count(),0);
assert((await banned.evaluate(()=>document.documentElement.scrollWidth))<=321,'suspension mobile overflow');
await banned.locator('#suspension-appeal').fill('Peço revisão da suspensão por engano.');
await banned.locator('.suspension-submit').click();
await banned.locator('.suspension-success').waitFor({timeout:9000});
await banned.close();
total+=2;console.log('PASS suspension gate and appeal form on Android-size screen');
const announced=await browser.newPage({viewport:{width:390,height:830}});
await announced.addInitScript(fixture);
await announced.route(/^https?:\/\/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//,r=>r.fulfill({status:200,contentType:'application/javascript',body:''}));
await announced.goto(host+'/?announcement_test=1',{waitUntil:'domcontentloaded'});
await announced.locator('#global-announcement').waitFor({timeout:15000});
assert((await announced.locator('.announcement-text').innerText()).includes('Aviso importante'));
await announced.locator('#global-announcement').waitFor({state:'detached',timeout:14000});
assert.equal(await announced.locator('.landing-hero').count(),0,'Logged-in user unexpectedly saw public landing');
await announced.close();total++;
console.log('PASS fullscreen announcement automatically exits after 10 seconds');

console.log('SUCCESS '+total+' visual and functional checks');
}finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error('FAILED',e);process.exitCode=1;});
