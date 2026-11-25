/* Stage existing forms without duplicating authentication, captcha or uploads. */
(()=>{
'use strict';
const tags={musica:'Música',games:'Games',cinema:'Cinema',esportes:'Esportes',tecnologia:'Tecnologia',arte:'Arte',viagens:'Viagens',livros:'Livros',pets:'Pets',gastronomia:'Gastronomia',fitness:'Fitness',natureza:'Natureza',estudos:'Estudos',fotografia:'Fotografia'};
const goals={conversar:'Conversar e conhecer pessoas',amizade:'Novas amizades',relacionamento:'Relacionamento',comunidade:'Participar da comunidade'};
const desc={
 credentials:['Crie seus dados de acesso','Use seu e-mail e uma senha segura.'],
 legal:['Confirme sua conta','Confirme a maioridade, leia os documentos e conclua a verificação de segurança.'],
 identity:['Como podemos chamar você?','Seu nome e @ ajudam outras pessoas a encontrar seu perfil.'],
 personal:['Conte um pouco sobre você','Informe sua idade e como você se identifica.'],
 appearance:['Deixe seu perfil com a sua cara','Foto e banner são opcionais. Você também pode adicionar depois.'],
 interests:['O que você gosta de fazer?','Selecione até 8 interesses ou pule. Você pode conhecer pessoas de todos os tipos.'],
 discovery:['Como você quer descobrir pessoas?','Opcional. Seus objetivos são apenas sinais para recomendações, não filtros obrigatórios.']
};
const controllers=new WeakMap();
function node(html){const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild;}
function stage(key,children){const section=document.createElement('section');section.className='cx-wizard-stage';section.dataset.wizardStage=key;for(const child of children)if(child)section.append(child);return section;}
function preferences(form){if(!form?.querySelector('[name=discovery_goal]'))return null;return {_interests:[...form.querySelectorAll('input[name=interest]:checked')].map(x=>x.value),_goal:form.elements.discovery_goal.value,_visible:form.elements.discovery_visible.checked};}
function mount(){
 const form=document.getElementById('authForm');if(!form||controllers.has(form)||!['signup','profileSetup'].includes(form.dataset.form))return;
 const profile=form.dataset.form==='profileSetup',card=form.closest('.auth-card'),submit=form.querySelector('[type=submit]');
 if(!card||!submit)return;
 const oldProgress=card.querySelector('.cx-auth-steps'),heading=card.querySelector('h1'),sub=card.querySelector('.auth-sub');
 const grid=profile?form.querySelector('.cx-profile-grid'):form.querySelector('.email-auth-fields .form-grid');
 if(!grid)return;
 const container=profile?form:form.querySelector('.email-auth-fields');
 if(!container)return;
 const draft=profile?(state.signup||{}):{};
 let panels=[];
 if(profile){
  const user=grid.querySelector('#newusername')?.closest('.field'),name=grid.querySelector('#display_name')?.closest('.field'),age=grid.querySelector('#age')?.closest('.field'),gender=grid.querySelector('#gender')?.closest('.field');
  if(!user||!name||!age||!gender)return;
  const media=form.querySelector('.cx-onboard-media'),consent=form.querySelector('.cx-signup-consent'),note=grid.querySelector('.cx-premium-register-note');
  const interests=node('<div class="cx-wizard-interest-content"><div class="cx-wizard-optional">OPCIONAL · <span data-wizard-count>0/8</span></div><div class="cx-interest-grid">'+Object.entries(tags).map(([id,label])=>'<label><input type="checkbox" name="interest" value="'+id+'"><span>'+label+'</span></label>').join('')+'</div><p class="cx-wizard-note">Não precisa gostar das mesmas coisas para criar uma conexão.</p></div>');
  for(const input of interests.querySelectorAll('input'))input.checked=Array.isArray(draft.interests)&&draft.interests.includes(input.value);
  const discover=node('<div class="cx-wizard-discovery-content"><label class="field full">Seu objetivo<select name="discovery_goal">'+Object.entries(goals).map(([id,label])=>'<option value="'+id+'">'+label+'</option>').join('')+'</select></label><label class="cx-wizard-visibility"><input type="checkbox" name="discovery_visible"><span><strong>Aparecer na descoberta</strong><small>Permitir que outras pessoas encontrem seu perfil nas recomendações. Você poderá mudar isso depois.</small></span></label><p class="cx-wizard-note">Mesmo sem interesses selecionados, seu perfil pode aparecer se você ativar essa opção.</p></div>');
  discover.querySelector('select').value=Object.hasOwn(goals,draft.goal)?draft.goal:'conversar';
  discover.querySelector('input').checked=draft.visible===true;
  panels=[stage('identity',[user,name]),stage('personal',[age,gender,note,consent]),stage('appearance',[media]),stage('interests',[interests]),stage('discovery',[discover])];
  grid.hidden=true; // hidden preference field remains submitted
 }else{
  const consent=container.querySelector('.cx-signup-consent'),rules=container.querySelector('.cx-password-rules'),captcha=container.querySelector('.connect-turnstile');
  if(!consent||!captcha)return;
  panels=[stage('credentials',[grid,rules]),stage('legal',[consent,captcha])];
 }
 const progress=node('<div class="cx-wizard-progress" aria-label="Progresso do cadastro"><div class="cx-wizard-progress-line"><strong data-wizard-label></strong><span data-wizard-number></span></div><div class="cx-wizard-track" role="progressbar" aria-valuemin="0" aria-valuemax="8"><span></span></div></div>');
 if(oldProgress)oldProgress.replaceWith(progress);else card.prepend(progress);
 const actions=node('<div class="cx-wizard-actions"><button type="button" class="ui-btn btn-outline" data-wizard-back>Voltar</button><button type="button" class="cx-wizard-skip" data-wizard-skip>Pular por enquanto</button></div>');
 for(const panel of panels)container.insertBefore(panel,submit);
 container.insertBefore(actions,submit);
 form.noValidate=true;
 let index=profile?Math.max(0,Math.min(panels.length-1,Number.isInteger(draft.step)?draft.step:0)):0;
 const controller={};
 function save(){if(profile)window.connectSession?.saveDraft(form);}
 function show(focus=false){
  form.dataset.wizardStep=String(index);
  panels.forEach((panel,i)=>{panel.hidden=i!==index;panel.inert=i!==index;});
  const key=panels[index].dataset.wizardStage,[title,subtitle]=desc[key];
  heading.textContent=title;sub.textContent=subtitle;
  const step=profile?index+3:index+1;
  progress.querySelector('[data-wizard-label]').textContent=profile?'Seu perfil':'Sua conta';
  progress.querySelector('[data-wizard-number]').textContent='Etapa '+step+' de 8';
  progress.querySelector('[role=progressbar]').setAttribute('aria-valuenow',String(step));
  progress.querySelector('.cx-wizard-track span').style.width=(step/8*100)+'%';
  actions.querySelector('[data-wizard-back]').hidden=index===0;
  actions.querySelector('[data-wizard-skip]').hidden=!['appearance','interests','discovery'].includes(key);
  submit.textContent=index===panels.length-1?(profile?'Concluir perfil':'Criar conta com e-mail'):'Continuar';
  delete submit.dataset.oldLabel;
  const count=form.querySelector('[data-wizard-count]');if(count)count.textContent=form.querySelectorAll('input[name=interest]:checked').length+'/8';
  document.getElementById('form-error')?.classList.add('hidden');save();
  if(focus){heading.tabIndex=-1;heading.focus({preventScroll:true});heading.scrollIntoView({block:'start',behavior:'instant'});}
 }
 function valid(i){
  const panel=panels[i];
  for(const input of panel.querySelectorAll('input,select,textarea')){if(input.willValidate&&!input.validity.valid){if(index!==i){index=i;show();}input.reportValidity();return false;}}
  if(panel.dataset.wizardStage==='credentials'){
   try{window.entreEmailAuth.passwordStrength(form.elements.password.value,form.elements.password_confirm.value);}
   catch(error){showFormMessage(error.message);return false;}
  }
  if(panel.dataset.wizardStage==='interests'&&form.querySelectorAll('input[name=interest]:checked').length>8){showFormMessage('Selecione até 8 interesses.');return false;}
  return true;
 }
 function next(event){
  if(submit.disabled){event.preventDefault();event.stopImmediatePropagation();return;}
  if(index<panels.length-1){event.preventDefault();event.stopImmediatePropagation();if(valid(index)){index++;show(true);}return;}
  for(let i=0;i<panels.length;i++)if(!valid(i)){event.preventDefault();event.stopImmediatePropagation();return;}
  save();
 }
 controller.next=next;controllers.set(form,controller);
 form.addEventListener('submit',next,true);
 actions.addEventListener('click',event=>{
  if(event.target.closest('[data-wizard-back]')&&index>0&&!submit.disabled){index--;show(true);}
  if(event.target.closest('[data-wizard-skip]')&&!submit.disabled){
   const key=panels[index].dataset.wizardStage;
   if(key==='interests')form.querySelectorAll('input[name=interest]').forEach(x=>x.checked=false);
   if(key==='discovery'){form.elements.discovery_goal.value='conversar';form.elements.discovery_visible.checked=false;}
   if(index<panels.length-1){index++;show(true);}else form.requestSubmit(submit);
  }
 });
 form.addEventListener('change',event=>{
  if(event.target.name==='interest'){
   const selected=form.querySelectorAll('input[name=interest]:checked');
   if(selected.length>8){event.target.checked=false;showFormMessage('Você pode escolher até 8 interesses.');}
   else document.getElementById('form-error')?.classList.add('hidden');
   form.querySelector('[data-wizard-count]').textContent=form.querySelectorAll('input[name=interest]:checked').length+'/8';
  }
  save();
 });
 show();
}
window.connectSignupWizard={mount,preferences};
})();
