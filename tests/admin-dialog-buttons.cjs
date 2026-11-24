/* Render real admin confirmation markup using the exact production stylesheet order.
 * No credentials, network calls, or real user deletion. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../docs/admin');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=[...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map(m=>m[1]).filter(x=>!x.startsWith('http')).map(x=>fs.readFileSync(path.resolve(root,x.split('?')[0]),'utf8')).join('\n');
const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
const extract=(start,end)=>{const a=js.indexOf('function '+start+'('),b=js.indexOf('function '+end+'(',a+1);assert(a>=0&&b>a,start);return js.slice(a,b);};
const user={id:'fixture-member',email:'long.fixture.account@example.invalid',display_name:'Conta de teste',admin:false,banned:false,created_at:'2026-11-24',last_sign_in_at:'2026-11-24'};
let content='';
const state={users:{rows:[user]},user:{id:'fixture-admin'},reports:[{id:1,reporter_name:'Pessoa A',reported_name:'Pessoa B',reason:'spam',status:'open'}]};
const e=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reportStart=js.indexOf('function openReport('),reportEnd=js.indexOf('document.addEventListener("click"',reportStart);
assert(reportStart>=0&&reportEnd>reportStart);
const build=new Function('state','modal','e','toast','fmt','badge','reasonNames',extract('openUser','openDeleteUser')+extract('openDeleteUser','openReport')+js.slice(reportStart,reportEnd)+';return {openUser,openDeleteUser,openReport};');
const actions=build(state,x=>{content=x;},e,()=>{},x=>e(x),x=>'<span>'+e(x)+'</span>',{});
const fixtures=[];
for(const [name,fn] of [['delete',()=>actions.openDeleteUser(user.id)],['suspend',()=>actions.openUser(user.id)],['review',()=>actions.openReport(1)]]){fn();fixtures.push([name,content]);}
user.banned=true;actions.openUser(user.id);fixtures.push(['restore',content]);
fixtures.push(['support','<h2>Protocolo #42</h2><p>Solicitação de teste</p><form><textarea rows="4"></textarea><label><input type="checkbox"> Marcar como resolvido</label><button type="submit" class="btn-main">Enviar resposta</button></form><button type="button" class="small-btn">Fechar</button>'],['appeal','<h2>Contestações</h2><div class="appeal-buttons"><button class="btn-main">Aprovar e reativar</button><button class="btn-outline">Não aprovar</button></div>']);
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 let count=0;
 try{
 for(const [width,height] of [[320,568],[360,740],[390,844],[430,932],[768,390],[1024,768],[1440,900]]){
  const page=await browser.newPage({viewport:{width,height}});
  for(const theme of ['light','dark'])for(const [name,markup] of fixtures){
   await page.setContent('<!doctype html><html data-theme="'+theme+'"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body><div id="console"><div id="modal-root"><div class="modal-back"><div class="modal" role="dialog">'+markup+'</div></div></div></div></body></html>');
   const result=await page.evaluate(()=>{const dialog=document.querySelector('.modal'),r=dialog.getBoundingClientRect();const buttons=[...dialog.querySelectorAll('button')].map(b=>{const x=b.getBoundingClientRect();return {text:b.textContent.trim(),height:x.height,width:x.width,left:x.left,right:x.right};});return {buttons,modal:{left:r.left,right:r.right,top:r.top,bottom:r.bottom},scroll:dialog.scrollWidth,client:dialog.clientWidth,viewport:innerWidth};});
   const label=name+' '+theme+' '+width+'x'+height;
   assert(result.modal.left>=-1&&result.modal.right<=width+1&&result.modal.top>=-1&&result.modal.bottom<=height+1,label+' modal overflow '+JSON.stringify(result));
   assert(result.scroll<=result.client+1,label+' horizontal modal overflow');
   assert(result.buttons.length>0,label+' missing buttons');
   for(const b of result.buttons){assert(b.height>=40&&b.height<=64,label+' invalid button height '+JSON.stringify(b));assert(b.width>0&&b.left>=result.modal.left-1&&b.right<=result.modal.right+1,label+' button overflow '+JSON.stringify(b));}
   count++;
  }
  await page.close();
 }
 console.log('PASS '+count+' admin dialog layout cases (mocked markup; no live data)');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
