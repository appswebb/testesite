import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read=name=>readFileSync(new URL('../docs/'+name,import.meta.url),'utf8');
function setup(hostname='entre-ruby.vercel.app'){
 const events=[];
 const win={location:{hostname,origin:'https://'+hostname,search:'',hash:''},history:{replaceState(){}}};
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
 const document={getElementById:()=>({classList:{add(){}}})};
 const context={window:win,db,state,document,URL,URLSearchParams,console,
  brand:()=>'<span>entre.</span>',busy:()=>{},render:()=>events.push('render'),
  showFormMessage:(msg,success=false)=>events.push({msg,success}),infoError:e=>e.message,
  checkSuspension:async()=>false,maintenanceIsActive:()=>false,initializeAccount:async()=>events.push('account-initialized')};
 vm.runInNewContext(read('email-auth.js'),context,{filename:'email-auth.js'});
 return {api:win.entreEmailAuth,db,state,win,events};
}
function form(mode,values){
 const submit={disabled:false};
 return {dataset:{form:mode},querySelector:()=>submit,elements:{namedItem:name=>
   name==='adult'?{checked:values.adult??true}:{value:values[name]||''}}};
}
test('email authentication supplies accessible forms and avoids exposing passwords',()=>{
 const {api}=setup();
 const signup=api.fields(true,false),login=api.fields(false,false),forgot=api.fields(false,true);
 assert.match(signup,/type="email"/);
 assert.match(signup,/autocomplete="new-password"/);
 assert.match(signup,/minlength="12"/);
 assert.match(signup,/password_confirm/);
 assert.match(signup,/name="adult"/);
 assert.match(login,/autocomplete="current-password"/);
 assert.match(login,/Esqueci minha senha/);
 assert.doesNotMatch(forgot,/type="password"/);
 assert.match(api.resetView(),/data-form="reset"/);
 assert.match(read('app.js'),/entreEmailAuth\.submit\(form\)/);
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
 assert.equal(pages.api.redirectUrl(true),'https://appswebb.github.io/testesite/?auth=recovery');
});
test('signup requests email confirmation without creating a fake local session',async()=>{
 const {api,db,events,state}=setup();let request;
 db.auth.signUp=async p=>{request=p;return {data:{user:{id:'placeholder'},session:null},error:null}};
 await api.submit(form('signup',{email:' TEST@EXAMPLE.INVALID ',password:'MinhaSenhaSegura2026',password_confirm:'MinhaSenhaSegura2026'}));
 assert.equal(request.email,'test@example.invalid');
 assert.equal(request.options.emailRedirectTo,'https://entre-ruby.vercel.app/');
 assert.equal(state.session,null);
 assert.ok(events.some(e=>e.success===true&&/confirmação/.test(e.msg)));
});
test('password login validates real Supabase session before entering app',async()=>{
 const {api,state,events,db}=setup();
 await api.submit(form('login',{email:'test@example.invalid',password:'MinhaSenhaSegura2026'}));
 assert.equal(state.session.user.id,'test-user');
 assert.equal(state.isAdmin,false);
 assert.ok(events.includes('account-initialized'));
 assert.equal(state.mode,'app');
});
test('password recovery sends a callback URL and hides account existence',async()=>{
 const {api,db,events}=setup();let options;
 db.auth.resetPasswordForEmail=async (email,opts)=>{options=opts;return {error:null}};
 await api.submit(form('forgot',{email:'missing@example.invalid'}));
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
