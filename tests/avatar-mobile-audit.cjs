// Integration-like browser regression for onboarding photo uploads, updates,
// tiny WebP conversion and maintenance SVG geometry. All Supabase data is mocked.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..','docs');
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const fixture=()=>{
 const u={id:'0d6a946d-e827-4b87-b1be-b719ac6e2776',email:'test.user@example.com',app_metadata:{provider:'google',providers:['google']}};
 window.__uploads=[];window.__removed=[];window.__profile=null;
 const next=(name)=>({
  select(){return next(name)},
  eq(){return next(name)},
  or(){return next(name)},
  in(){return next(name)},
  order(){return next(name)},
  async limit(){return {data:[],error:null}},
  async maybeSingle(){return {data:name==='entre_profiles'?window.__profile:null,error:null}},
  async single(){return {data:window.__profile,error:null}},
  async upsert(value){window.__profile={...value,bio:value.bio||'',created_at:new Date().toISOString(),updated_at:new Date().toISOString(),avatar_uploaded_at:value.avatar_path?new Date().toISOString():null};return {error:null}},
  update(value){
   window.__profile={...window.__profile,...value,avatar_uploaded_at:('avatar_path' in value)?(value.avatar_path?new Date().toISOString():null):window.__profile?.avatar_uploaded_at};
   return next(name);
  }
 });
 window.supabase={createClient(){return {
  auth:{
   getSession:async()=>({data:{session:{user:u}},error:null}),
   getUser:async()=>({data:{user:u},error:null}),
   onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
   signOut:async()=>({error:null})
  },
  rpc:async(name)=>{
   if(name==='entre_public_settings')return {data:{maintenance_enabled:false,matchmaking_enabled:true,reporting_enabled:true,announcement:''},error:null};
   if(name==='entre_admin_check')return {data:false,error:null};
   return {data:null,error:null};
  },
  from:next,
  channel(){return {on(kind,filter,cb){if(filter.table==='entre_profiles')window.__onAvatarChange=cb;return this;},subscribe(){return this;}};},
  storage:{from:()=>({
   async upload(p,blob,opt){window.__uploads.push({path:p,size:blob.size,type:blob.type,contentType:opt.contentType});
      if(blob.size>40960||blob.type!=='image/webp')return {error:{message:'Too large'}};
      return {data:{path:p},error:null};
   },
   async createSignedUrl(p){return {data:{signedUrl:'https://images.example.invalid/'+p},error:null}},
   async remove(paths){window.__removed.push(...paths);return {data:[],error:null}}
  })}
 }}};
};
async function selectImage(page){
 await page.evaluate(async()=>{
  const c=document.createElement('canvas');c.width=500;c.height=320;
  const ctx=c.getContext('2d');for(let i=0;i<500;i+=12)for(let j=0;j<320;j+=12){
   ctx.fillStyle='hsl('+((i+j)%360)+' 65% 60%)';ctx.fillRect(i,j,12,12);
  }
  const b=await new Promise(resolve=>c.toBlob(resolve,'image/png'));
  const dt=new DataTransfer();dt.items.add(new File([b],'foto.png',{type:'image/png'}));
  const input=document.getElementById('avatarFile');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 });
 await page.locator('#avatarCropDialog').waitFor({timeout:8000});
 await page.locator('#cropZoom').evaluate(el=>{el.value='1.65';el.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.equal(await page.locator('#cropZoomNumber').innerText(),'165%','Zoom slider did not update crop');
 await page.locator('#cropApply').click();
 await page.locator('#avatarCropDialog').waitFor({state:'detached',timeout:10000});
 assert.equal(await page.locator('.avatar-photo-preview img').count(),1,'Cropped preview missing');
}
(async()=>{
 const server=http.createServer((req,res)=>{
  let p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(p.endsWith('/'))p+='index.html';
  const file=path.resolve(root,p.replace(/^\/+/,''));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end('missing');return;}
  res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});let tests=0;
 try{
  for(const width of [320,360,390,430,768]){
   const page=await browser.newPage({viewport:{width,height:840}});
   await page.addInitScript(fixture);
   await page.route(/^https?:\/\/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//,r=>r.fulfill({status:200,body:'',contentType:'application/javascript'}));
   const failures=[];page.on('pageerror',err=>failures.push(err.message));
   await page.goto(base+'/?maintenance_preview=1',{waitUntil:'domcontentloaded'});
   await page.locator('.maint-brand-lockup').waitFor({timeout:15000});
   const status=await page.evaluate(()=>{
    const brand=document.querySelector('.maint-brand-lockup').getBoundingClientRect();
    const icon=document.querySelector('.maint-brand-symbol').getBoundingClientRect();
    const top=document.querySelector('.maint-top-label').getBoundingClientRect();
    return {width:document.documentElement.scrollWidth,iconWithin:icon.left>=brand.left-1&&icon.right<=brand.right+1,
       labelCollision:brand.right>top.left+1,logoWidth:brand.width};
   });
   assert(status.width<=width+1,'Horizontal overflow at '+width+': '+JSON.stringify(status));
   assert(status.iconWithin,'SVG logo clipped at '+width);
   assert(!status.labelCollision,'Maintenance logo collides with headline at '+width);
   assert.deepEqual(failures,[],'Maintenance script failed');
   tests++;console.log('PASS responsive maintenance SVG logo '+width+'px');
   await page.close();
  }
  const profile=await browser.newPage({viewport:{width:390,height:844}});
  await profile.addInitScript(fixture);
  await profile.route(/^https?:\/\/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//,r=>r.fulfill({status:200,body:'',contentType:'application/javascript'}));
  const errors=[];profile.on('pageerror',e=>errors.push(e.message));
  await profile.goto(base+'/',{waitUntil:'domcontentloaded'});
  await profile.locator('#avatarFile').waitFor({timeout:15000});
  assert.equal(await profile.locator('#avatarFile').count(),1,'Onboarding file input absent');
  await selectImage(profile);
  await profile.locator('#display_name').fill('Usuário Teste');
  await profile.locator('#age').fill('25');
  await profile.locator('#gender').selectOption('man');
  await profile.locator('#preference').selectOption('any');
  await profile.locator('[name=adult]').check();
  await profile.locator('#authSubmit').click();
  await profile.locator('.app-shell').waitFor({timeout:9000});
  await profile.locator('.mobile-nav [data-view="profile"]').click();
  await profile.locator('#profileForm').waitFor({timeout:9000}).catch(async err=>{ const diagnostic=await profile.evaluate(()=>({formError:document.querySelector('#form-error')?.textContent,toast:document.getElementById('toast')?.textContent,uploads:window.__uploads,profile:window.__profile,body:document.body.innerText.slice(-600)})); throw new Error('Onboarding failed '+JSON.stringify(diagnostic)+' / '+err.message); });
  const uploaded=await profile.evaluate(()=>window.__uploads);
  assert.equal(uploaded.length,1,'Onboarding upload not sent');
  assert(uploaded[0].size>0&&uploaded[0].size<=40960,'WebP not tiny enough: '+uploaded[0].size);
  assert.equal(uploaded[0].type,'image/webp');
  assert(uploaded[0].path.endsWith('.webp'),'Avatar path invalid');
  tests++;console.log('PASS onboarding compresses photo to '+uploaded[0].size+' bytes and uploads private WebP');
  await profile.waitForFunction(()=>Boolean(document.querySelector('.profile-preview .avatar img')),{timeout:6000});
  const behindClock=await profile.evaluate(()=>avatarFresh({...window.__profile,avatar_uploaded_at:new Date(Date.now()+3600000).toISOString()}));
  assert(behindClock,'Avatar hidden when phone clock is one hour behind the server');
  tests++;console.log('PASS saved photo visible and tolerates phone clock skew');
  await selectImage(profile);
  await profile.locator('#profileForm button[type=submit]').click();
  await profile.waitForFunction(()=>window.__uploads.length===2,{timeout:12000});
  await profile.waitForFunction(()=>window.__removed.length>=1,{timeout:12000});
  const final=await profile.evaluate(()=>({uploads:window.__uploads,removed:window.__removed,photo:window.__profile?.avatar_path}));
  assert(final.uploads[0].path!==final.uploads[1].path,'Photo revision should use immutable paths');
  assert.equal(final.removed[0],final.uploads[0].path,'Old photo not removed');
  assert.equal(final.photo,final.uploads[1].path,'Profile photo path not saved');
  assert.deepEqual(errors,[],'Photo upload script errors');
  tests++;console.log('PASS photo replacement and old-object removal');
  await profile.waitForFunction(()=>{
     const img=document.querySelector('.profile-preview .avatar img');
     return img&&img.src.includes(window.__profile.avatar_path);
  },{timeout:9000});
  assert.equal(await profile.evaluate(()=>typeof window.__onAvatarChange),'function','Realtime profile subscription absent');
  tests++;console.log('PASS updated photo appears immediately and profile subscribes to realtime');
  await profile.evaluate(async()=>{
   await window.__onAvatarChange({new:{id:window.__profile.id,avatar_path:null,avatar_uploaded_at:null}});
  });
  await profile.waitForFunction(()=>!document.querySelector('.profile-preview .avatar img'),{timeout:5000});
  tests++;console.log('PASS remote avatar deletion updates all avatar nodes live');
  await profile.close();
  console.log('SUCCESS '+tests+' photo + maintenance regression checks');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(err=>{console.error(err);process.exitCode=1;});
