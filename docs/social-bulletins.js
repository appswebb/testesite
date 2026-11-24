/* Official bulletins and optional one-vote polls, separate from social messages. */
(function(){
'use strict';
const api=window.entreSocial, d=api.data;
d.bulletins=[];d.pendingPoll=null;d.bulletinLoaded=false;d.bulletinBusy=false;d.bulletinError='';d.bulletinSignature='';
const safeOptions=b=>Array.isArray(b?.options)?b.options:[];
const active=b=>b&&new Date(b.expires_at).getTime()>Date.now();
const pending=()=>active(d.pendingPoll)?d.pendingPoll:null;
const fmt=iso=>{const date=new Date(iso);return Number.isNaN(date.getTime())?'':date.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});};
async function refreshBulletins(silent=false){
 if(d.bulletinBusy||!state.session?.user||!state.profile||maintenanceIsActive()||state.suspension)return;
 d.bulletinBusy=true;
 try{
  const response=await api.rpc('entre_bulletins_feed'),next=Array.isArray(response?.items)?response.items:[];
  const signature=JSON.stringify(next.map(x=>[x.id,x.my_vote,x.my_reply,x.votes_total]));
  d.bulletins=next;d.pendingPoll=null;
  d.bulletinSignature=signature;d.bulletinError='';d.bulletinLoaded=true;
  if((state.view==='avisos'||(state.view==='notifications'&&['bulletins','polls'].includes(d.notificationTab)))&&!silent&&!document.activeElement?.closest?.('.bulletin-reply-form,.poll-choices'))renderView();
 }catch(e){
  d.bulletinError='Não foi possível atualizar os avisos. Tente novamente.';
  d.bulletinLoaded=true;
  console.warn('Bulletins',e);
  if((state.view==='avisos'||(state.view==='notifications'&&['bulletins','polls'].includes(d.notificationTab)))&&!silent)renderView();
 }finally{d.bulletinBusy=false;}
}
function voteResults(b){
 const counts=Array.isArray(b.votes_by_option)?b.votes_by_option:[],total=Number(b.votes_total)||0;
 return '<div class="bulletin-results">'+safeOptions(b).map((opt,i)=>{
  const count=Number(counts[i])||0,pct=total?Math.round(count*100/total):0;
  return '<div class="bulletin-result"><div><strong>'+esc(opt)+'</strong><small>'+pct+'% · '+count+' voto(s)</small></div><span class="bulletin-result-track"><i style="width:'+pct+'%"></i></span></div>';
 }).join('')+'<small class="bulletin-total">'+total+' voto(s) registrados</small></div>';
}
function bulletinCard(b){
 const poll=b.kind==='poll',voted=b.my_vote!==null&&b.my_vote!==undefined,reply=b.my_reply;
 const remaining=Math.max(1,Math.ceil((new Date(b.expires_at).getTime()-Date.now())/3600000));
 return '<article class="bulletin-card">'+
 '<div class="bulletin-card-top"><span class="notice-label">'+ico(poll?'check':'megaphone',16)+' '+(poll?'ENQUETE OFICIAL':'AVISO DA ADMINISTRAÇÃO')+'</span><small>Disponível por '+remaining+'h</small></div>'+
 '<h3>'+esc(b.title)+'</h3>'+(b.body?'<p class="bulletin-description">'+esc(b.body)+'</p>':'')+
 (poll?(voted?'<div class="bulletin-voted">'+ico('check',17)+' Voto registrado: '+esc(safeOptions(b)[Number(b.my_vote)]||'Opção escolhida')+'</div>'+voteResults(b):
 '<div class="bulletin-optional-vote"><fieldset class="poll-choices"><legend>Escolha uma opção (opcional)</legend>'+safeOptions(b).map((opt,i)=>'<label class="poll-choice"><input type="radio" name="poll-'+Number(b.id)+'" value="'+i+'"><span>'+esc(opt)+'</span></label>').join('')+'</fieldset><button type="button" class="ui-btn btn-dark btn-sm" data-action="bulletinVote" data-id="'+Number(b.id)+'">Confirmar voto</button></div>'):
 '<div class="bulletin-reply-form"><label for="bulletin-reply-'+Number(b.id)+'">'+(reply?'Sua resposta (pode editar)':'Responder ao aviso')+'</label><textarea id="bulletin-reply-'+Number(b.id)+'" maxlength="800" minlength="3" rows="3" placeholder="Escreva sua resposta para a administração…">'+esc(reply||'')+'</textarea><button type="button" class="ui-btn btn-dark btn-sm" data-action="bulletinReply" data-id="'+Number(b.id)+'">'+(reply?'Atualizar resposta':'Enviar resposta')+'</button></div>')+
 '<small class="bulletin-published">Publicado em '+fmt(b.created_at)+' · expira em '+fmt(b.expires_at)+'</small></article>';
}
function bulletinsView(kind='notice'){
 const poll=kind==='poll',name=poll?'enquetes':'avisos',items=d.bulletins.filter(x=>active(x)&&x.kind===kind);
 return heading(poll?'ENQUETES OFICIAIS':'AVISOS DA ADMINISTRAÇÃO',poll?'Enquetes':'Avisos',poll?'Participe se quiser. Votar é opcional.':'Comunicados da administração.')+
 (d.bulletinError?'<div class="bulletin-error" role="status">'+esc(d.bulletinError)+' <button type="button" data-action="bulletinsRefresh">Tentar novamente</button></div>':'')+
 (!d.bulletinLoaded?'<div class="social-empty"><h3>Carregando '+name+'…</h3></div>':items.length?'<div class="bulletin-feed">'+items.map(bulletinCard).join('')+'</div>':'<div class="social-empty">'+ico(poll?'check':'megaphone',27)+'<h3>Nenhum '+(poll?'questionário ativo':'aviso ativo')+'.</h3><p>Publicações disponíveis por 24 horas.</p></div>');
}
function pollGateView(){return '';}
async function action(type,btn){
 if(type==='bulletinsRefresh'){await refreshBulletins();return true;}
 if(type==='bulletinVoteJump'){return true;}
 if(type==='bulletinVote'){
  const poll=d.bulletins.find(x=>x.kind==='poll'&&Number(x.id)===Number(btn.dataset.id)&&active(x)),choice=btn.closest('.bulletin-card')?.querySelector('input[name="poll-'+Number(btn.dataset.id)+'"]:checked');
  if(!poll||Number(btn.dataset.id)!==Number(poll.id)){await refreshBulletins();toast('A enquete mudou. Confira a votação.',true);return true;}
  if(!choice){toast('Escolha uma opção para votar.');return true;}
  if(btn.disabled)return true;
  btn.disabled=true;const old=btn.innerHTML;btn.textContent='Registrando seu voto…';
  try{
   const response=await api.rpc('entre_bulletin_vote',{_bulletin:Number(poll.id),_option:Number(choice.value)});
   if(response?.status==='expired'){d.pendingPoll=null;toast('Esta enquete já encerrou.');}
   else if(response?.status==='voted'){d.pendingPoll=null;toast('Voto registrado!');}
   else throw Error('Não foi possível confirmar seu voto.');
   await refreshBulletins(true);
   renderView();
  }catch(e){toast(infoError(e),true);btn.disabled=false;btn.innerHTML=old;}
  return true;
 }
 if(type==='bulletinReply'){
  const id=Number(btn.dataset.id),box=document.getElementById('bulletin-reply-'+id),body=box?.value?.trim()||'';
  if(body.length<3||body.length>800){toast('Escreva uma resposta de 3 a 800 caracteres.',true);return true;}
  if(btn.disabled)return true;btn.disabled=true;
  try{await api.rpc('entre_bulletin_reply',{_bulletin:id,_body:body});toast('Resposta enviada para a administração.');await refreshBulletins(true);renderView();}
  catch(e){toast(infoError(e),true);btn.disabled=false;}finally{if(btn.isConnected)btn.disabled=false;}
  return true;
 }
 return false;
}
Object.assign(api,{bulletinsView,pollGateView,refreshBulletins,bulletinAction:action,requiredPoll:()=>null});
})();
