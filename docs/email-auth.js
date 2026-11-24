(function entreEmailAuth(){
 'use strict';
 const field=(name,id,label,type,autocomplete,placeholder,minlength='')=>{
  const input=`<input id="${id}" name="${name}" type="${type}" autocomplete="${autocomplete}" ${type==='email'?'inputmode="email" maxlength="254"':'maxlength="128"'} ${minlength?`minlength="${minlength}"`:''} required placeholder="${placeholder}">`;
  return `<div class="field full"><label for="${id}">${label}</label>${type==='password'?`<div class="password-field-wrap">${input}<button type="button" class="password-visibility-toggle" data-password-toggle="${id}" aria-controls="${id}" aria-pressed="false" aria-label="Mostrar senha">Mostrar</button></div>`:input}</div>`;
 };
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-password-toggle]');
  if(!button)return;
  const input=document.getElementById(button.dataset.passwordToggle);
  if(!input||input.tagName!=='INPUT'||!button.closest('form')?.contains(input))return;
  const reveal=input.type==='password';
  if(!reveal&&input.type!=='text')return;
  input.type=reveal?'text':'password';
  button.textContent=reveal?'Ocultar':'Mostrar';
  button.setAttribute('aria-pressed',String(reveal));
  button.setAttribute('aria-label',reveal?'Ocultar senha':'Mostrar senha');
 });
 function fields(signup,forgot){
  const email=field('email','auth-email','E-mail','email','email','voce@exemplo.com');
  if(forgot)return `<div class="email-auth-fields"><div class="form-grid">${email}</div><button class="ui-btn btn-dark auth-email-submit" type="submit" id="authSubmit">Enviar link de recuperação</button><p class="auth-email-hint">Se este e-mail estiver cadastrado, você receberá instruções para recuperar o acesso.</p></div>`;
  const password=field('password','auth-password','Senha','password',signup?'new-password':'current-password',signup?'Pelo menos 12 caracteres':'Sua senha',signup?'12':'');
  const confirm=signup?field('password_confirm','auth-password-confirm','Confirmar senha','password','new-password','Repita sua senha','12'):'';
  return `<div class="email-auth-fields"><div class="form-grid">${email}${password}${confirm}</div>${signup?'<label class="checkbox-line auth-terms"><input type="checkbox" name="adult" required><span>Confirmo que tenho 18 anos ou mais e aceito os <a href="./termos.html" target="_blank" rel="noopener noreferrer">Termos de uso</a> e a <a href="./privacidade.html" target="_blank" rel="noopener noreferrer">Política de privacidade</a>.</span></label><p class="auth-email-hint">Crie uma senha com pelo menos 12 caracteres, incluindo letras e números.</p>':'<div class="auth-email-links"><button type="button" class="text-link" data-action="forgot">Esqueci minha senha</button></div>'}<button class="ui-btn btn-dark auth-email-submit" type="submit" id="authSubmit">${signup?'Criar conta com e-mail':'Entrar com e-mail'}</button></div>`;
 }
 function resetView(){
  return `<div class="auth-shell"><aside class="auth-visual">${brand()}<div><span class="eyebrow" style="color:#e9b49f">SEGURANÇA DA SUA CONTA</span><h2>De volta ao <em>CONNECT</em></h2></div><p class="legal-note">Seus dados de login são protegidos pelo Supabase.</p></aside><main class="auth-main"><div class="auth-card"><div class="hidden-mobile-brand">${brand()}</div><h1>Uma <em>nova senha.</em></h1><p class="auth-sub">Use 12 caracteres ou mais, incluindo letras e números.</p><div id="form-error" class="hidden form-error" role="alert"></div><div id="form-success" class="hidden form-success" role="status"></div><form id="authForm" data-form="reset"><div class="form-grid">${field('password','new-password','Nova senha','password','new-password','Nova senha','12')}${field('password_confirm','new-password-confirm','Confirmar nova senha','password','new-password','Repita a senha','12')}</div><button class="ui-btn btn-dark auth-email-submit" type="submit" id="authSubmit">Atualizar senha</button></form></div></main></div>`;
 }
 function redirectUrl(recovery=false){
  const url=new URL(window.location.hostname==='appswebb.github.io'?'/testesite/':'/',window.location.origin);
  if(recovery)url.searchParams.set('auth','recovery');
  return url.href;
 }
 function passwordStrength(password,confirmation){
  if(password!==confirmation)throw Error('As senhas não coincidem.');
  if(password.length<12||password.length>128||!/[a-zA-ZÀ-ÿ]/.test(password)||!/\d/.test(password))throw Error('A senha deve ter entre 12 e 128 caracteres, incluindo letras e números.');
 }
 async function acceptSession(session,adminOAuthReturn=false){
  if(!session?.user)throw Error('Não foi possível criar uma sessão de login.');
  const verified=await db.auth.getUser();
  if(verified.error||!verified.data?.user)throw verified.error||Error('Sessão não validada.');
  state.session={...session,user:verified.data.user};
  const {data:admin,error:adminError}=await db.rpc('entre_admin_check');
  if(adminError)console.warn('Não foi possível consultar o painel administrativo');
  state.isAdmin=!adminError&&admin===true;
  if(state.isAdmin&&adminOAuthReturn){window.location.replace('./admin/');return;}
  state.mode='app';
  const suspended=await checkSuspension();
  if(maintenanceIsActive()||suspended)render();
  else await initializeAccount();
 }
 function isRecovery(){
  const query=new URLSearchParams(window.location.search);
  const hash=new URLSearchParams(window.location.hash.replace(/^#/,''));
  return query.get('auth')==='recovery'||hash.get('type')==='recovery';
 }
 async function submit(form){
  const button=form.querySelector('[type="submit"]');
  const mode=form.dataset.form;
  const fieldValue=name=>form.elements.namedItem(name)?.value||'';
  document.getElementById('form-error')?.classList.add('hidden');
  document.getElementById('form-success')?.classList.add('hidden');
  busy(button,true);
  try{
   if(mode==='reset'){
    if(!state.session?.user)throw Error('Sua sessão de recuperação expirou. Solicite um novo link.');
    const password=fieldValue('password');
    passwordStrength(password,fieldValue('password_confirm'));
    const {error}=await db.auth.updateUser({password});
    if(error)throw error;
    await db.auth.signOut({scope:'local'});
    state.session=null;state.profile=null;state.isAdmin=false;state.mode='login';
    const clean=new URL(window.location.href);
    clean.searchParams.delete('auth');
    window.history.replaceState(null,'',clean.pathname+clean.search);
    render();
    showFormMessage('Senha alterada. Faça login com seu e-mail e a nova senha.',true);
    return;
   }
   const email=fieldValue('email').trim().toLowerCase();
   if(!email||email.length>254)throw Error('Informe um e-mail válido.');
   if(mode==='forgot'){
    const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:redirectUrl(true)});
    if(error&&/rate limit|too many requests|429/i.test(error.message||''))throw error;
    // Do not reveal whether the account exists.
    showFormMessage('Se o e-mail estiver cadastrado, enviaremos um link para redefinir sua senha. Confira também o spam.',true);
    return;
   }
   const password=fieldValue('password');
   if(mode==='signup'){
    if(!form.elements.namedItem('adult')?.checked)throw Error('Confirme que tem 18 anos ou mais e aceite os termos.');
    passwordStrength(password,fieldValue('password_confirm'));
    const {data,error}=await db.auth.signUp({email,password,options:{emailRedirectTo:redirectUrl()}});
    if(error)throw error;
    if(data?.session){await acceptSession(data.session);return;}
    showFormMessage('Cadastro solicitado. Se a conta puder ser criada, você receberá um e-mail de confirmação. Confira também o spam.',true);
    return;
   }
   if(mode==='login'){
    const {data,error}=await db.auth.signInWithPassword({email,password});
    if(error)throw error;
    await acceptSession(data.session);
   }
  }catch(error){showFormMessage(infoError(error));}
  finally{busy(button,false);}
 }
 window.entreEmailAuth={fields,resetView,redirectUrl,passwordStrength,acceptSession,isRecovery,submit};
})();
