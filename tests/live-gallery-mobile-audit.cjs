/* Browser coverage for image-based live discovery, real data fields and controls. */
const {chromium}=require('playwright');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const assert=require('node:assert/strict');
const read=p=>readFileSync(resolve(__dirname,'../docs',p),'utf8');
const css=['styles.css','experience-hub.css','theme.css','connect-experience.css','live-explore.css'].map(read).join('\n');
const html='<!doctype html><html lang="pt-BR" data-theme="light"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body><main id="view-content"></main></body></html>';
const testData=[
 {id:'11111111-1111-4111-8111-111111111111',title:'Papo de fim de tarde',category:'conversa',host_name:'Ana',host_username:'ana',state_code:'SP',city_name:'Penápolis',cover_path:'ana/cover.webp',host_avatar_path:null,guest_name:'',is_host:false,is_guest:false,requested:false,started_at:new Date().toISOString()},
 {id:'22222222-2222-4222-8222-222222222222',title:'Jogando hoje',category:'games',host_name:'Bia',host_username:'bia',state_code:'RJ',city_name:'Rio de Janeiro',cover_path:null,host_avatar_path:null,guest_name:'',is_host:false,is_guest:false,requested:false,started_at:new Date().toISOString()}
];
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9FT1UAAAAASUVORK5CYII=';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [320,390,768,1160]){
   const page=await browser.newPage({viewport:{width,height:820}});
   await page.setContent(html);
   await page.addScriptTag({content:[
    'var state={view:"lives",session:{user:{id:"mock-user"}}};',
    'var esc=v=>String(v??"").replace(/[&<>"]/g,"");',
    "var ico=()=>'<svg aria-hidden=\"true\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"8\"/></svg>';",
    'var toast=()=>{}; var infoError=e=>String(e?.message||e);',
    'var mockRows='+JSON.stringify(testData)+',mockImage='+JSON.stringify(png)+';',
    'var db={rpc:async name=>name==="entre_lives_list"?{data:mockRows,error:null}:{data:null,error:null},storage:{from:()=>({createSignedUrls:async paths=>({data:paths.map(()=>({signedUrl:mockImage})),error:null})})}};',
    'var renderView=()=>{document.getElementById("view-content").innerHTML=window.entreLives.view()};'
   ].join('\n')});
   await page.addScriptTag({content:read('camera-lives.js')});
   await page.evaluate(()=>window.entreLives.enter());
   assert.equal(await page.locator('.live-visual-card').count(),2,'Expected two source records '+width);
   assert.equal(await page.locator('.live-visual-picture').count(),1,'Signed cover missing '+width);
   assert.equal(await page.locator('.live-visual-placeholder').count(),1,'Cover fallback missing '+width);
   assert.equal(await page.locator('.live-visual-badge').count(),2,'Live badge missing '+width);
   const grid=await page.locator('.live-visual-grid').evaluate(node=>({cols:getComputedStyle(node).gridTemplateColumns.split(' ').length,scroll:document.documentElement.scrollWidth}));
   assert(grid.scroll<=width+2,'Horizontal overflow '+width+': '+JSON.stringify(grid));
   if(width<=390)assert.equal(grid.cols,2,'Phone must show two cards per row '+width);
   await page.locator('[data-live-action="category"][data-category="games"]').click();
   assert.equal(await page.locator('.live-visual-card').count(),1,'Category filter failed '+width);
   assert.match(await page.locator('.live-visual-details strong').first().textContent(),/Jogando/);
   await page.locator('[data-live-action="category"][data-category="all"]').click();
   await page.locator('[data-live-filter="search"]').fill('Ana');
   assert.equal(await page.locator('.live-visual-card').count(),1,'Search failed '+width);
   await page.locator('[data-live-filter="search"]').fill('');
   await page.locator('[data-live-action="region"]').click();
   await page.locator('[data-live-filter="region"]').selectOption('state');
   await page.locator('[data-live-filter="state"]').selectOption('SP');
   assert.equal(await page.locator('.live-visual-card').count(),1,'Region filter failed '+width);
   await page.locator('[data-live-action="region"]').click();
   await page.locator('[data-live-action="create"]').first().click();
   assert.equal(await page.locator('#cameraLiveStartForm').isVisible(),true,'Create form not visible '+width);
   assert.equal(await page.locator('#cameraLiveCover').count(),1,'Cover input missing '+width);
   assert.equal(await page.locator('select[name="category"]').count(),1,'Category input missing '+width);
   await page.evaluate(()=>window.entreLives.stop());
   console.log('PASS visual live discovery '+width+'px');
   await page.close();
  }
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1;});
