/* CONNECT discovery and encounter tools. Account-scoped requests. */
(()=>{
'use strict';
const interests={musica:'Música',games:'Games',cinema:'Cinema',esportes:'Esportes',tecnologia:'Tecnologia',arte:'Arte',viagens:'Viagens',livros:'Livros',pets:'Pets',gastronomia:'Gastronomia',fitness:'Fitness',natureza:'Natureza',estudos:'Estudos',fotografia:'Fotografia'};
const goals={amizade:'Amizade',relacionamento:'Relacionamento',conversar:'Conversar',comunidade:'Comunidade'};
const questions=['Qual foi a melhor parte do seu dia?','Qual música você ouviria no repeat?','Qual lugar você tem vontade de conhecer?','Qual filme você recomenda?','Se pudesse aprender algo novo agora, o que seria?','O que faz você rir de verdade?','Qual seria seu fim de semana perfeito?','Qual hobby você gostaria de compartilhar?'];
let owner=null,epoch=0,host=null,activeDialog=null;
const uid=()=>state.session?.user?.id||null;
const $=id=>document.getElementById(id);
const alive=(id,view)=>uid()===id&&state.view===view&&!state.suspension&&!maintenanceIsActive();
const safe=(value)=>esc(String(value??''));
async function rpc(name,args={}){const {data,error}=await db.rpc(name,args);if(error)throw error;return data;}
function dispose(){epoch++;if(activeDialog){activeDialog.close?.();activeDialog.remove();activeDialog=null;}host=null;}
function discoverView(){return '<section class="cx-next" id="cxDiscover"><div class="cx-next-head"><div><small>CONNECT · AFINIDADES</small><h2>Descubra pessoas</h2><p>Descubra afinidades e pessoas diferentes de você, mesmo quando não estão online.</p></div></div><div class="connect-community-totals cx-discover-totals" aria-label="Indicadores da comunidade"><span class="cc-stat cc-stat-online" title="Pessoas visíveis nos últimos cinco minutos"><i class="cc-presence-dot" aria-hidden="true"></i><strong data-connect-online-count>—</strong><small>online</small></span><span class="cc-stat cc-stat-accounts" title="Contas existentes com perfil criado no CONNECT"><strong data-connect-account-count>—</strong><small>contas criadas</small></span></div><div class="cx-discover-toolbar"><div class="cx-discover-toolbar-copy"><strong>Para você</strong><span id="cxDiscoverySummary">Sugestões variadas</span></div><button type="button" class="cx-discover-filter" data-cx-next="discover-filter" aria-haspopup="dialog" aria-label="Editar filtros da descoberta">'+ico('sliders',18)+' Filtros <span id="cxDiscoveryCount" hidden></span></button><button type="button" class="cx-discover-refresh" data-cx-next="discover-refresh" title="Novas sugestões" aria-label="Novas sugestões">'+ico('refresh',18)+'</button></div><div class="cx-discover-grid" id="cxDiscoverPeople"><div class="cx-next-empty">Buscando pessoas…</div></div></section>'}
function dialog(title,body){activeDialog?.close?.();activeDialog?.remove();const d=document.createElement('dialog');d.className='cx-next-dialog';d.dataset.cxView=state.view;d.dataset.cxPair=state.pair?.id||'';d.innerHTML='<header><strong>'+safe(title)+'</strong><button type="button" data-cx-next="close-dialog" aria-label="Fechar">×</button></header>'+body;document.body.append(d);activeDialog=d;d.addEventListener('close',()=>{if(activeDialog===d)activeDialog=null;d.remove()},{once:true});d.showModal();return d;}
function interestMarkup(me){return '<form id="cxDiscoveryForm"><div class="cx-filter-content"><div class="cx-filter-section"><div class="cx-filter-title"><strong>Seus interesses</strong><span id="cxDiscoveryPicked">'+(me.interests?.length||0)+'/8</span></div><p>Escolha até 8 ou deixe em branco. São preferências, não restrições.</p><div class="cx-interest-grid">'+Object.entries(interests).map(([key,label])=>'<label><input type="checkbox" name="interest" value="'+key+'" '+(me.interests?.includes(key)?'checked':'')+'><span>'+label+'</span></label>').join('')+'</div></div><div class="cx-filter-section"><label for="cxDiscoveryGoal">O que procura?</label><select id="cxDiscoveryGoal" name="goal">'+Object.entries(goals).map(([key,label])=>'<option value="'+key+'" '+(me.goal===key?'selected':'')+'>'+label+'</option>').join('')+'</select></div><div class="cx-filter-section"><label class="cx-filter-visibility"><input name="visible" type="checkbox" '+(me.visible?'checked':'')+'><span><strong>Aparecer na descoberta</strong><small>Permitir que outras pessoas encontrem seu perfil.</small></span></label></div><p class="cx-filter-note">Você continuará descobrindo pessoas com interesses diferentes. As preferências ficam salvas na sua conta.</p><p id="cxDiscoveryFilterError" role="alert" hidden></p></div><footer class="cx-filter-footer"><button type="button" class="cx-next-plain" data-cx-next="discover-clear">Limpar interesses</button><button type="submit" class="cx-next-btn">Salvar e aplicar</button></footer></form>'}
let discoveryRotation=0,discoveryRequest=0,discoveryPrefRequest=0,discoveryPrefs=null;
function updateDiscoverySummary(){
 const summary=$('cxDiscoverySummary'),count=$('cxDiscoveryCount');if(!summary||!count)return;
 const n=Array.isArray(discoveryPrefs?.interests)?discoveryPrefs.interests.length:0;
 summary.textContent=n?n+(n===1?' interesse selecionado':' interesses selecionados')+' · sugestões variadas':'Sugestões variadas';
 count.hidden=!n;count.textContent=n?String(n):'';
}
async function readDiscoveryPrefs(account,ticket){
 const seq=++discoveryPrefRequest;const me=await rpc('connect_discovery_me');
 if(!alive(account,'discover')||epoch!==ticket||seq!==discoveryPrefRequest)return null;
 if(!me||!Array.isArray(me.interests)||!Object.hasOwn(goals,me.goal)||typeof me.visible!=='boolean')throw Error('Preferências indisponíveis.');
 discoveryPrefs=me;updateDiscoverySummary();return me;
}
async function openDiscoveryFilter(){
 if(state.view!=='discover'||activeDialog?.dataset.cxFilter==='1')return;
 const account=uid(),ticket=epoch,d=dialog('Filtros da descoberta','<div class="cx-filter-loading" role="status">Carregando suas preferências…</div>');
 d.dataset.cxFilter='1';d.classList.add('cx-discover-filter-dialog');
 d.addEventListener('cancel',event=>{if(d.dataset.saving==='1')event.preventDefault();});
 try{
  const me=await readDiscoveryPrefs(account,ticket);
  if(!d.isConnected||activeDialog!==d)return;
  if(!me)throw Error('Não foi possível carregar as preferências.');
  d.querySelector('.cx-filter-loading').outerHTML=interestMarkup(me);
 }catch(error){
  if(d.isConnected&&activeDialog===d){d.querySelector('.cx-filter-loading').innerHTML='<p>Não foi possível carregar as preferências. Nenhum dado foi alterado.</p><button type="button" class="cx-next-btn" data-cx-next="discover-filter-retry">Tentar novamente</button>';}
 }
}
async function saveDiscoveryFilter(form){
 const d=form.closest('dialog'),account=uid(),ticket=epoch;
 if(!d||d!==activeDialog||d.dataset.saving==='1'||!alive(account,'discover'))return;
 const selected=[...form.querySelectorAll('input[name=interest]:checked')].map(x=>x.value),error=form.querySelector('#cxDiscoveryFilterError'),button=form.querySelector('[type=submit]');
 if(selected.length>8){error.hidden=false;error.textContent='Escolha até 8 interesses.';return;}
 const payload={_interests:selected,_goal:form.elements.goal.value,_visible:form.elements.visible.checked};
 d.dataset.saving='1';error.hidden=true;button.textContent='Salvando…';
 for(const el of d.querySelectorAll('input,select,button'))el.disabled=true;
 try{
  const result=await rpc('connect_discovery_save',payload);
  if(result!==true)throw Error('Não foi possível salvar as preferências.');
  if(uid()!==account)return;
  ++discoveryPrefRequest;
  discoveryPrefs={interests:payload._interests,goal:payload._goal,visible:payload._visible};
  if(!alive(account,'discover')||epoch!==ticket)return;
  if(d.isConnected&&activeDialog===d)d.close();
  updateDiscoverySummary();toast('Preferências salvas na sua conta.');
  discoveryRotation=0;await loadDiscover(false);
 }catch(e){if(d.isConnected&&activeDialog===d){error.hidden=false;error.textContent=e.message||'Não foi possível salvar. Tente novamente.';}}
 finally{delete d.dataset.saving;if(d.isConnected){button.textContent='Salvar e aplicar';for(const el of d.querySelectorAll('input,select,button'))el.disabled=false;}}
}
async function loadDiscover(settings=true){
 const account=uid(),ticket=epoch,request=++discoveryRequest;
 if(settings){updateDiscoverySummary();void readDiscoveryPrefs(account,ticket).catch(()=>{});}
 try{
 const people=await rpc('connect_discovery_people_v2',{_rotation:discoveryRotation});if(!alive(account,'discover')||epoch!==ticket||request!==discoveryRequest)return;
 await Promise.allSettled(people.map(signAvatar));if(!alive(account,'discover')||epoch!==ticket||request!==discoveryRequest)return;
 $('cxDiscoverPeople').innerHTML=people.length?people.map(p=>'<article class="cx-next-person">'+avatar(p,'large')+'<div><strong>'+safe(p.display_name)+', '+Number(p.age)+'</strong><small>@'+safe(p.username)+' · '+(p.online?'Online':'Perfil disponível')+'</small><p class="cx-discover-reason">'+safe(p.reason==='shared'?(Number(p.common)===1?'1 interesse em comum':Number(p.common)+' interesses em comum'):p.reason==='goal'?'Objetivos parecidos':'Uma nova possibilidade')+' · '+safe(goals[p.goal]||'Conversar')+'</p><div class="cx-interest-tags">'+p.interests.map(t=>'<span>'+safe(interests[t]||t)+'</span>').join('')+'</div><a class="cx-next-btn" href="./perfil.html?u='+encodeURIComponent(p.username||'')+'">Ver perfil</a></div></article>').join(''):'<div class="cx-next-empty"><strong>A descoberta está começando</strong><p>Quando outras pessoas permitirem aparecer na descoberta, elas serão sugeridas, mesmo sem interesses selecionados.</p><button type="button" class="cx-next-btn" data-action="nav" data-view="connect">Encontrar alguém ao vivo</button></div>';
 }catch(e){if(alive(account,'discover')&&epoch===ticket&&request===discoveryRequest)$('cxDiscoverPeople').textContent='Não foi possível carregar. Tente novamente.';}
}
function afterRender(){
 if(activeDialog&&(activeDialog.dataset.cxView!==state.view||activeDialog.dataset.cxPair!==(state.pair?.id||''))){activeDialog.close();activeDialog=null;}
 const next=$('cxDiscover'),id=uid();
 if(owner!==id){dispose();owner=id;discoveryRotation=0;discoveryPrefs=null;++discoveryPrefRequest;++discoveryRequest;}
 if(next===host)return;dispose();host=next;if(!next)return;
 window.connectRealtime?.paint?.();void window.connectRealtime?.refreshCount?.();void loadDiscover();
}
document.addEventListener('click',async e=>{
 const b=e.target.closest?.('[data-cx-next]');if(!b||b.disabled)return;
 const action=b.dataset.cxNext,account=uid();
 try{
 if(action==='extend'){const pair=state.pair?.id;if(!pair)return;b.disabled=true;const result=await rpc('connect_encounter_extend',{_pair:pair});if(uid()!==account||state.pair?.id!==pair)return;await refreshPair();if(result.status==='waiting')toast('Pedido enviado. A extensão depende do aceite da outra pessoa.');else toast('Mais cinco minutos para vocês!');return;}
 if(action==='chat-search'){if(state.pair?.status!=='connected')return;dialog('Pesquisar mensagens','<form id="cxChatSearch" data-pair="'+safe(state.pair.id)+'"><input name="query" minlength="2" maxlength="80" required placeholder="Buscar nesta conversa"><button type="submit" class="cx-next-btn">Pesquisar</button></form><div id="cxSearchResults" class="cx-next-comments"><p>Digite uma palavra para pesquisar o histórico disponível.</p></div>');return;}
 if(action==='ice'){const input=$('messageInput');if(input&&!input.value){input.value=questions[Math.floor(Math.random()*questions.length)];input.dispatchEvent(new Event('input',{bubbles:true}));input.focus({preventScroll:true});}else if(input)toast('Envie ou apague sua mensagem antes de escolher uma sugestão.');return;}
 if(action==='discover-refresh'){discoveryRotation=(discoveryRotation+1)%100000;await loadDiscover(false);return;}
 if(action==='discover-filter'){await openDiscoveryFilter();return;}
 if(action==='discover-filter-retry'){activeDialog?.close();activeDialog=null;await openDiscoveryFilter();return;}
 if(action==='discover-clear'){const form=b.closest('form');if(form){form.querySelectorAll('input[name=interest]').forEach(x=>x.checked=false);form.querySelector('#cxDiscoveryPicked').textContent='0/8';}return;}
 if(action==='close-dialog'){if(activeDialog?.dataset.saving!=='1')activeDialog?.close();return;}
 }catch(e){toast(e.message||'Não foi possível concluir.',true);}finally{if(b.isConnected)b.disabled=false;}
});
document.addEventListener('change',e=>{
 const input=e.target;if(!input.matches?.('#cxDiscoveryForm input[name=interest]'))return;
 const form=input.closest('form'),error=form.querySelector('#cxDiscoveryFilterError');
 if(form.querySelectorAll('input[name=interest]:checked').length>8){input.checked=false;error.hidden=false;error.textContent='Você pode escolher até 8 interesses.';}else error.hidden=true;
 form.querySelector('#cxDiscoveryPicked').textContent=form.querySelectorAll('input[name=interest]:checked').length+'/8';
});
document.addEventListener('submit',async e=>{
 const form=e.target;if(!['cxDiscoveryForm','cxChatSearch'].includes(form.id))return;e.preventDefault();
 if(form.id==='cxDiscoveryForm'){await saveDiscoveryFilter(form);return;}
 const b=form.querySelector('button[type=submit]');if(b.disabled)return;b.disabled=true;
 try{
 if(form.id==='cxChatSearch'){const d=activeDialog,account=uid(),pair=form.dataset.pair;const result=await rpc('connect_chat_search',{_pair:pair,_query:form.elements.query.value});if(uid()===account&&state.pair?.id===pair&&d?.isConnected){d.querySelector('#cxSearchResults').innerHTML=result.length?result.map(m=>'<article><strong>'+(m.sender_id===account?'Você':'Contato')+' · '+safe(new Date(m.created_at).toLocaleString('pt-BR'))+'</strong><p>'+safe(m.body)+'</p></article>').join(''):'<p>Nenhuma mensagem encontrada.</p>';}return;}
 }catch(e){toast(e.message||'Não foi possível concluir.',true);}finally{if(b.isConnected)b.disabled=false;}
});
const appRoot=document.getElementById('app');if(appRoot)new MutationObserver(()=>{if(host&&!host.isConnected)dispose();if(activeDialog&&typeof state!=='undefined'&&(state.suspension||maintenanceIsActive()||!state.session)){activeDialog.close();activeDialog=null;}}).observe(appRoot,{childList:true,subtree:true});
function extensionMarkup(pair){if(pair.extended_at)return '<span class="cx-extension-note">+5 min</span>';const mine=pair.a===uid()?pair.extension_a:pair.extension_b,other=pair.a===uid()?pair.extension_b:pair.extension_a;return '<button type="button" class="cx-ice cx-extension" data-cx-next="extend" '+(mine?'disabled':'')+'>'+ (mine?'Aguardando +5 min':other?'Aceitar +5 min':'+5 min')+'</button>'}
window.connectNext={discoverView,afterRender,extensionMarkup};
})();
