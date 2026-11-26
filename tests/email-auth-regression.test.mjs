import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read=name=>readFileSync(new URL('../docs/'+name,import.meta.url),'utf8');
function setup(hostname='entre-ruby.vercel.app'){
 const events=[];
 const win={location:{hostname,origin:'https://'+hostname,search:'',hash:''},history:{replaceState(){}}};
 win.connectTurnstile={markup:()=>'<div data-connect-turnstile-widget></div>',consume:()=> 'test-captcha-token',reset:()=>events.push('captcha-reset')};
 const state={session:null,profile:null,isAdmin:false,mode:'signup'};
 const verifiedUser={id:'test-user',email:'test@example.invalid',app_metadata:{provider:'email'}};
 const db={auth:{
  getUser:async()=>({data:{user:verifiedUser},error:null}),
  signUp:async()=>({data:{user:verifiedUser,session:null},error:null}),
  signInWithPassword:async()=>({data:{session:{user:verifiedUser,access_token:'token'}},error:null}),
  resetPasswordForEmail:async()=>({error:null}),
  updateUser:async()=>({error:null}),
  signOut:async()=>({error:null})
 },rpc:async()=>({data:false,error:null})};
 const listeners={};
 const document={getElementById:()=>({classList:{add(){}}}),addEventListener:(type,handler)=>{const prev=listeners[type];listeners[type]=prev?(event)=>{prev(event);handler(event)}:handler}};
 const context={window:win,db,state,document,URL,URLSearchParams,console,
  brand:()=>'<span>entre.</span>',ico:(name)=>'<svg data-icon="'+name+'"></svg>',busy:()=>{},render:()=>events.push('render'),
  showFormMessage:(msg,success=false)=>events.push({msg,success}),infoError:e=>e.message,
  checkSuspension:async()=>false,maintenanceIsActive:()=>false,initializeAccount:async()=>events.push('account-initialized')};
 vm.runInNewContext(read('email-auth.js'),context,{filename:'email-auth.js'});
 return {api:win.entreEmailAuth,db,state,win,events,document,listeners};
}
function form(mode,values){
 const submit={disabled:false};
 return {dataset:{form:mode},querySelector:()=>submit,elements:{namedItem:name=>
   ['adult','terms'].includes(name)?{checked:values[name]??true}:{value:values[name]||''}}};
}
test('email authentication supplies accessible forms and avoids exposing passwords',()=>{
 const {api}=setup();
 const signup=api.fields(true,false),login=api.fields(false,false),forgot=api.fields(false,true);
 assert.match(signup,/type="email"/);
 assert.match(signup,/autocomplete="new-password"/);
 assert.match(signup,/minlength="12"/);
 assert.match(signup,/password_confirm/);
 assert.match(signup,/name="adult"/);assert.match(signup,/name="terms"/);
 assert.match(login,/autocomplete="current-password"/);
 assert.match(login,/Esqueci minha senha/);
 assert.doesNotMatch(forgot,/type="password"/);
 assert.match(api.resetView(),/data-form="reset"/);
 assert.match(read('app.js'),/entreEmailAuth\.submit\(form\)/);
});
test('password eye control toggles visibility without changing typed password',()=>{
 const {api,document,listeners}=setup();
 const signup=api.fields(true,false),login=api.fields(false,false),reset=api.resetView();
 assert.match(signup,/data-password-toggle="auth-password"/);
 assert.match(signup,/data-password-toggle="auth-password-confirm"/);
 assert.match(login,/data-password-toggle="auth-password"/);
 assert.match(reset,/data-password-toggle="new-password"/);
 assert.match(reset,/data-password-toggle="new-password-confirm"/);
 assert.match(signup,/aria-pressed="false"/);
 const input={tagName:'INPUT',type:'password',value:'SenhaTeste2026'};
 const attrs={};
 const button={dataset:{passwordToggle:'auth-password'},textContent:'Mostrar',
  closest:selector=>selector==='form'?{contains:el=>el===input}:null,
  setAttribute:(name,value)=>{attrs[name]=value}};
 document.getElementById=()=>input;
 const event={target:{closest:selector=>selector==='[data-password-toggle]'?button:null}};
 listeners.click(event);
 assert.equal(input.type,'text');
 assert.equal(input.value,'SenhaTeste2026');
 assert.equal(button.textContent,'Ocultar');
 assert.equal(attrs['aria-pressed'],'true');
 assert.equal(attrs['aria-label'],'Ocultar senha');
 listeners.click(event);
 assert.equal(input.type,'password');
 assert.equal(button.textContent,'Mostrar');
 assert.equal(attrs['aria-pressed'],'false');
 assert.equal(attrs['aria-label'],'Mostrar senha');
});
test('admin login has an independent show password control',()=>{
 const admin=read('admin/app.js'),css=read('admin/styles.css');
 assert.match(admin,/data-admin-password-toggle/);
 assert.match(admin,/admin-password-wrap/);
 assert.match(admin,/aria-controls="admin-password"/);
 assert.match(admin,/field\.type=reveal\?"text":"password"/);
 assert.match(css,/\.admin-password-toggle/);
});
test('password strength blocks mismatches and short or letter-only passwords',()=>{
 const {api}=setup();
 assert.throws(()=>api.passwordStrength('Abc123','Abc123'),/12/);
 assert.throws(()=>api.passwordStrength('abcdefghijklmn','abcdefghijklmn'),/números/);
 assert.throws(()=>api.passwordStrength('abcdefghijklmn123','not-the-same'),/coincidem/);
 assert.doesNotThrow(()=>api.passwordStrength('MinhaSenhaSegura2026','MinhaSenhaSegura2026'));
});
test('email redirects use the correct root path on both hosts',()=>{
 const vercel=setup(),pages=setup('appswebb.github.io');
 assert.equal(vercel.api.redirectUrl(),'https://entre-ruby.vercel.app/');
 assert.equal(vercel.api.redirectUrl(true),'https://entre-ruby.vercel.app/?auth=recovery');
 assert.equal(pages.api.redirectUrl(),'https://appswebb.github.io/testesite/');
 assert.equal(pages.api.redirectUrl(true),'https://appswebb.github.io/testesite/?auth=recovery');assert.equal(setup('connectbr.online').api.redirectUrl(true),'https://connectbr.online/?auth=recovery');
});
test('signup requests email confirmation without creating a fake local session',async()=>{
 const {api,db,events,state}=setup();let request;
 db.auth.signUp=async p=>{request=p;return {data:{user:{id:'placeholder'},session:null},error:null}};
 await api.submit(form('signup',{email:' TEST@EXAMPLE.INVALID ',password:'MinhaSenhaSegura2026',password_confirm:'MinhaSenhaSegura2026'}));
 assert.equal(request.email,'test@example.invalid');assert.equal(request.options.data.connect_adult_declared,true);assert.equal(request.options.data.connect_terms_accepted,true);
 assert.equal(request.options.captchaToken,'test-captcha-token');
 assert.equal(request.options.emailRedirectTo,'https://entre-ruby.vercel.app/');
 assert.equal(state.session,null);
 assert.ok(events.some(e=>e.success===true&&/confirmação/.test(e.msg)));
});
test('password login validates real Supabase session before entering app',async()=>{
 const {api,state,events,db}=setup();
 let request;const login=db.auth.signInWithPassword;db.auth.signInWithPassword=async p=>{request=p;return login(p);};
 await api.submit(form('login',{email:'test@example.invalid',password:'MinhaSenhaSegura2026'}));
 assert.equal(request.options.captchaToken,'test-captcha-token');
 assert.equal(state.session.user.id,'test-user');
 assert.equal(state.isAdmin,false);
 assert.ok(events.includes('account-initialized'));
 assert.equal(state.mode,'app');
});
test('password recovery sends a callback URL and hides account existence',async()=>{
 const {api,db,events}=setup();let options;
 db.auth.resetPasswordForEmail=async (email,opts)=>{options=opts;return {error:null}};
 await api.submit(form('forgot',{email:'missing@example.invalid'}));
 assert.equal(options.captchaToken,'test-captcha-token');
 assert.equal(options.redirectTo,'https://entre-ruby.vercel.app/?auth=recovery');
 assert.ok(events.some(e=>e.success===true&&/Se o e-mail estiver cadastrado/.test(e.msg)));
});
test('boot accepts verified Supabase email sessions and rejects Google-only auth paths',()=>{
 const src=read('app.js'),admin=read('admin/app.js');
 assert.doesNotMatch(src,/signInWithOAuth/);
 assert.doesNotMatch(src,/data-action="google"/);
 assert.match(src,/window\.entreEmailAuth\.acceptSession\(data\.session\)/);
 assert.match(admin,/db\.auth\.signInWithPassword/);
 assert.match(read('index.html'),/src="\.\/email-auth\.js/);
});

test('auth refuses to send credentials when CAPTCHA is not ready',async()=>{
 const {api,db,win,events}=setup();let called=false;win.connectTurnstile.consume=()=>{throw Error('Verificação pendente');};
 db.auth.signInWithPassword=async()=>{called=true;};
 await api.submit(form('login',{email:'test@example.invalid',password:'MinhaSenhaSegura2026'}));assert.equal(called,false);assert.ok(events.some(e=>e.msg==='Verificação pendente'));
});
test('public and admin authentication load Turnstile and forward its token',()=>{
 const widget=read('connect-turnstile.js');assert.doesNotThrow(()=>new Function(widget));assert.match(widget,/challenges.cloudflare.com\/turnstile/);assert.match(read('admin/app.js'),/captchaToken:token/);assert.match(read('admin/index.html'),/connect-turnstile.js/);assert.match(read('index.html'),/connect-turnstile.js/);
});

test('auth waits for the async Turnstile token before submitting and resets it afterward',async()=>{
 const {api,db,win,events}=setup();let resolveToken,request;win.connectTurnstile.consume=()=>new Promise(resolve=>{resolveToken=resolve;});db.auth.signInWithPassword=async p=>{request=p;return {error:{status:400,code:'captcha_failed',message:'captcha failed'}};};
 const attempt=api.submit(form('login',{email:'test@example.invalid',password:'MinhaSenhaSegura2026'}));await Promise.resolve();assert.equal(request,undefined);resolveToken('fresh-token');await attempt;assert.equal(request.options.captchaToken,'fresh-token');assert.ok(events.includes('captcha-reset'));
});

test('Turnstile uses the official explicit onload callback and separates network from initialization failures',()=>{const source=read('connect-turnstile.js');assert.match(source,/render=explicit&onload=/);assert.match(source,/window\[name\]=ready/);assert.match(source,/CF-NET/);assert.match(source,/CF-INIT/);assert.match(source,/CF-TIMEOUT/);assert.match(read('index.html'),/connect-turnstile\.js\?v=[^\"]+/);assert.match(read('admin/index.html'),/connect-turnstile\.js\?v=[^\"]+/);});

test('signup refuses missing consent before sending credentials',async()=>{const {api,db,events}=setup();let called=false;db.auth.signUp=async()=>{called=true;};await api.submit(form('signup',{email:'test@example.invalid',password:'MinhaSenhaSegura2026',password_confirm:'MinhaSenhaSegura2026',terms:false}));assert.equal(called,false);assert.ok(events.some(e=>/aceite os termos/i.test(e.msg||'')));});

test('confirmation resend works without a password and uses signup resend, not a new account',async()=>{const {api,db,win,events}=setup();let request;db.auth.resend=async p=>{request=p;return {error:null}};win.connectSession={markEmailPending(){},pendingEmailCooldown:()=>0};await api.resend(form('login',{email:'test@example.invalid'}),{disabled:false});assert.equal(request.type,'signup');assert.equal(request.email,'test@example.invalid');assert.equal(request.options.emailRedirectTo,'https://entre-ruby.vercel.app/');assert.ok(events.some(e=>e.success&&/cadastro pendente/.test(e.msg)));});
test('signup transitions to login and does not persist password',async()=>{const {api,win,state}=setup();let pending;win.connectSession={markEmailPending:(...args)=>pending=args};await api.submit(form('signup',{email:'test@example.invalid',password:'MinhaSenhaSegura2026',password_confirm:'MinhaSenhaSegura2026'}));assert.equal(state.mode,'login');assert.deepEqual(pending,['test@example.invalid',true]);});
