(function entreEmailAuth(){
 'use strict';
 const eye=(visible=false)=>'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(visible?'<path d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 5.2A11 11 0 0 1 12 5c5.1 0 9 7 9 7a16 16 0 0 1-2.4 3.2M6.1 6.1C3.9 8 3 12 3 12s3.9 7 9 7a9 9 0 0 0 3.7-.8"/>':'<path d="M2.5 12S6 5 12 5s9.5 7 9.5 7S18 19 12 19s-9.5-7-9.5-7Z"/><circle cx="12" cy="12" r="3"/>')+'</svg>';
 const field=(name,id,label,type,autocomplete,placeholder,minlength='')=>{
  const input=`<input id="${id}" name="${name}" type="${type}" autocomplete="${autocomplete}" ${type==='email'?'inputmode="email" maxlength="254"':'maxlength="128"'} ${minlength?`minlength="${minlength}"`:''} required placeholder="${placeholder}">`;
  return `<div class="field full"><label for="${id}">${label}</label>${type==='password'?`<div class="password-field-wrap cx-access-input"><span class="cx-input-icon">${ico('lock',19)}</span>${input}<button type="button" class="password-visibility-toggle" data-password-toggle="${id}" aria-controls="${id}" aria-pressed="false" aria-label="Mostrar senha" title="Mostrar senha">${eye()}</button></div>`:`<div class="cx-access-input"><span class="cx-input-icon">${ico('mail',19)}</span>${input}</div>`}</div>`;
 };
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-password-toggle]');
  if(!button)return;
  const input=document.getElementById(button.dataset.passwordToggle);
  if(!input||input.tagName!=='INPUT'||!button.closest('form')?.contains(input))return;
  const reveal=input.type==='password';
  if(!reveal&&input.type!=='text')return;
  input.type=reveal?'text':'password';
  button.innerHTML=eye(reveal);
  button.title=reveal?'Ocultar senha':'Mostrar senha';
  button.setAttribute('aria-pressed',String(reveal));
  button.setAttribute('aria-label',reveal?'Ocultar senha':'Mostrar senha');
 });
 document.addEventListener('input',event=>{
  if(!['auth-password','auth-password-confirm'].includes(event.target.id))return;
  const form=event.target.closest('form[data-form="signup"]');if(!form)return;
  const p=form.elements.namedItem('password')?.value||'',c=form.elements.namedItem('password_confirm')?.value||'';
  const rules={length:p.length>=12&&p.length<=128,letter:/[a-zA-ZÀ-ÿ]/.test(p),number:/\d/.test(p),match:!!c&&p===c};
  for(const [name,valid] of Object.entries(rules)){const el=form.querySelector('[data-password-rule="'+name+'"]');if(el){el.classList.toggle('is-valid',valid);el.setAttribute('aria-label',el.textContent+(valid?', atendido':', pendente'));}}
 });
 function fields(signup,forgot){
  const pending=String(window.connectSession?.pendingEmailAddress?.()||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const email=field('email','auth-email','E-mail','email','email','voce@exemplo.com').replace('id="auth-email"','id="auth-email" value="'+pending+'"');
  if(forgot)return `<div class="email-auth-fields"><div class="form-grid">${email}</div>${window.connectTurnstile.markup()}<button class="ui-btn btn-dark auth-email-submit" type="submit" id="authSubmit">Enviar link de recuperação ${ico('arrow',19)}</button><p class="auth-email-hint">Se este e-mail estiver cadastrado, você receberá instruções para recuperar o acesso.</p></div>`;
  const password=field('password','auth-password','Senha','password',signup?'new-password':'current-password',signup?'Pelo menos 12 caracteres':'Sua senha',signup?'12':'');
  const confirm=signup?field('password_confirm','auth-password-confirm','Confirmar senha','password','new-password','Repita sua senha','12'):'';
  return `<div class="email-auth-fields"><div class="form-grid">${email}${password}${confirm}</div>${signup?'<section class="cx-signup-consent"><div class="cx-consent-title"><span class="cx-consent-icon">'+ico('shield',19)+'</span><div><strong>Antes de continuar</strong><small>Confirme sua maioridade e aceite os documentos.</small></div></div><label class="checkbox-line auth-terms"><input type="checkbox" name="adult" required><span>Declaro que tenho 18 anos ou mais.</span></label><label class="checkbox-line auth-terms"><input type="checkbox" name="terms" required><span>Li e aceito os <a href="./termos.html" target="_blank" rel="noopener noreferrer">Termos de uso</a> e a <a href="./privacidade.html" target="_blank" rel="noopener noreferrer">Política de privacidade</a> <small class="cx-consent-version">(25/11/2026).</small></span></label></section><div class="cx-password-rules" aria-live="polite"><span data-password-rule="length">12 caracteres</span><span data-password-rule="letter">Uma letra</span><span data-password-rule="number">Um número</span><span data-password-rule="match">Senhas iguais</span></div>':'<div class="auth-email-links"><button type="button" class="text-link cx-access-forgot-link" data-action="forgot">Esqueci minha senha '+ico('arrow',14)+'</button></div>'}${window.connectTurnstile.markup()}<button class="ui-btn btn-dark auth-email-submit" type="submit" id="authSubmit">${signup?'Criar conta':'Entrar na conta'} ${ico('arrow',19)}</button><button type="button" class="text-link cx-access-resend" data-auth-resend>${ico('mail',17)} <span>Reenviar confirmação de e-mail</span></button></div>`;
 }
 function resetView(){
  return `<div class="auth-shell cx-auth-shell cx-access-shell cx-access-reset"><aside class="auth-visual cx-auth-visual">${brand()}<div class="cx-auth-editorial"><span>SEGURANÇA DA CONTA</span><h2>Recupere seu acesso.</h2></div><img class="cx-reset-mark" src="./connect-glass.svg?v=original-v12" alt="" width="220" height="200"></aside><main class="auth-main"><div class="auth-card">${accessHeader(false)}${accessIntro('SEGURANÇA DA CONTA','Uma nova senha.','Use 12 caracteres ou mais, incluindo letras e números.','lock')}<div id="form-error" class="hidden form-error" role="alert"></div><div id="form-success" class="hidden form-success" role="status"></div><form id="authForm" data-form="reset"><div class="form-grid">${field('password','new-password','Nova senha','password','new-password','Nova senha','12')}${field('password_confirm','new-password-confirm','Confirmar nova senha','password','new-password','Repita a senha','12')}</div><button class="ui-btn btn-dark auth-email-submit" type="submit" id="authSubmit">Atualizar senha ${ico('arrow',19)}</button></form></div></main></div>`;
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
  state.resumeNavigation=true;window.connectSession?.clearEmailPending?.();
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
 let resendBusy=false,lastResend=0;
 async function resend(form,button){
  const main=form.querySelector('[type="submit"]'),input=form.elements.namedItem('email');
  if(resendBusy||main?.disabled||!input)return;
  const email=input.value.trim().toLowerCase();
  if(!email||email.length>254||(input.reportValidity&&!input.reportValidity())){showFormMessage('Informe um e-mail válido.');return;}
  const remaining=Math.max(0,60000-(Date.now()-lastResend),window.connectSession?.pendingEmailCooldown?.(email)||0);
  if(remaining>0){showFormMessage('Aguarde '+Math.ceil(remaining/1000)+' segundos antes de reenviar.');return;}
  document.getElementById('form-error')?.classList.add('hidden');document.getElementById('form-success')?.classList.add('hidden');
  resendBusy=true;busy(main,true);busy(button,true);
  let used=false;
  try{
   const token=await window.connectTurnstile.consume(form);used=true;
   lastResend=Date.now();
   const {error}=await db.auth.resend({type:'signup',email,options:{emailRedirectTo:redirectUrl(),captchaToken:token}});
   if(error){if(error.status===429)throw Error('Muitas solicitações. Aguarde antes de tentar novamente.');if(error.code==='captcha_failed')throw Error('Verificação de segurança recusada.');if(error.status>=500)throw Error('Não foi possível enviar agora. Tente novamente mais tarde.');}
   window.connectSession?.markEmailPending?.(email,true);
   showFormMessage('Se houver um cadastro pendente, enviaremos uma nova confirmação. Confira também o spam. Se o cadastro expirou, crie a conta novamente.',true);
  }catch(error){showFormMessage(infoError(error));}
  finally{if(used)window.connectTurnstile.reset(form);resendBusy=false;busy(main,false);busy(button,false);}
 }
 document.addEventListener('click',event=>{const button=event.target.closest('[data-auth-resend]');if(!button)return;const form=button.closest('#authForm');if(form&&!button.disabled)void resend(form,button);});
 async function submit(form){
  const button=form.querySelector('[type="submit"]');
  const mode=form.dataset.form;
  const fieldValue=name=>form.elements.namedItem(name)?.value||'';
  document.getElementById('form-error')?.classList.add('hidden');
  document.getElementById('form-success')?.classList.add('hidden');
  if(button?.disabled||resendBusy)return;
  busy(button,true);let captchaUsed=false;
  const captcha=async()=>{const token=await window.connectTurnstile.consume(form);captchaUsed=true;return token;};
  try{
   if(mode==='reset'){
    if(!state.session?.user)throw Error('Sua sessão de recuperação expirou. Solicite um novo link.');
    const password=fieldValue('password');
    passwordStrength(password,fieldValue('password_confirm'));
    const {error}=await db.auth.updateUser({password});
    if(error)throw error;
    const {error:signOutError}=await db.auth.signOut({scope:'global'});
    if(signOutError){console.warn('Global session revocation failed');await db.auth.signOut({scope:'local'});}

    state.session=null;state.profile=null;state.isAdmin=false;state.mode='login';
    const clean=new URL(window.location.href);
    clean.searchParams.delete('auth');
    window.history.replaceState(null,'',clean.pathname+clean.search);
    render();
    showFormMessage(signOutError?'Senha alterada. Não foi possível revogar todas as sessões agora. Faça login novamente.':'Senha alterada e sessões anteriores revogadas. Faça login novamente.',true);
    return;
   }
   const email=fieldValue('email').trim().toLowerCase();
   if(!email||email.length>254)throw Error('Informe um e-mail válido.');
   if(mode==='forgot'){
    const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:redirectUrl(true),captchaToken:await captcha()});
    if(error)throw error;
    // Do not reveal whether the account exists.
    showFormMessage('Se o e-mail estiver cadastrado, enviaremos um link para redefinir sua senha. Confira também o spam.',true);
    return;
   }
   const password=fieldValue('password');
   if(mode==='signup'){
    if(!form.elements.namedItem('adult')?.checked||!form.elements.namedItem('terms')?.checked)throw Error('Confirme que tem 18 anos ou mais e aceite os termos.');
    passwordStrength(password,fieldValue('password_confirm'));
    const {data,error}=await db.auth.signUp({email,password,options:{emailRedirectTo:redirectUrl(),captchaToken:await captcha(),data:{connect_adult_declared:true,connect_terms_accepted:true,connect_terms_version:'2026-11-25',connect_privacy_version:'2026-11-25'}}});
    if(error)throw error;
    window.connectSession?.markEmailPending?.(email,true);
    if(data?.session){await acceptSession(data.session);window.connectSound?.play?.('login');return;}
    state.mode='login';render();
    showFormMessage('Cadastro solicitado. Confira o e-mail de confirmação e o spam. Depois entre com sua senha para continuar. Se necessário, use Reenviar e-mail de confirmação.',true);
    return;
   }
   if(mode==='login'){
    const {data,error}=await db.auth.signInWithPassword({email,password,options:{captchaToken:await captcha()}});
    if(error){if(/captcha|turnstile/i.test(error.message||'')||error.code==='captcha_failed')throw Error('Verificação de segurança recusada. Tente novamente.');if(error.status===429)throw Error('Muitas tentativas. Aguarde e tente novamente.');if(error.code==='email_not_confirmed'){window.connectSession?.markEmailPending?.(email);throw Error('Confirme seu e-mail antes de entrar. Se não recebeu, use Reenviar e-mail de confirmação.');}throw Error('Não foi possível entrar. Confira seus dados e tente novamente.');}
    await acceptSession(data.session);
   }
  }catch(error){showFormMessage(error?.status===429?'Muitas solicitações. Aguarde antes de tentar novamente.':error?.code==='captcha_failed'?'O servidor recusou a verificação de segurança. Repita o desafio. Se persistir, informe o erro ao suporte.':infoError(error));}
  finally{if(captchaUsed)window.connectTurnstile.reset(form);busy(button,false);}
 }
 window.entreEmailAuth={fields,resetView,redirectUrl,passwordStrength,acceptSession,isRecovery,submit,resend};
})();
