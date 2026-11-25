/* Temporary profile visits: owner-only, explicit sharing, one bounded page at a time. */
(()=>{
'use strict';
const api=window.entreSocial;
let dialog=null,owner=null,epoch=0,page=0,cursors=[null],busy=false,timer=0,enabled=false;
const uid=()=>typeof state==='undefined'?null:state.session?.user?.id||null;
const allowed=()=>uid()&&state.profile&&!state.suspension&&!maintenanceIsActive();
function close(){epoch++;busy=false;clearTimeout(timer);timer=0;if(dialog){const d=dialog;dialog=null;if(d.open)d.close();d.remove();}owner=null;}
function markup(){return '<div class="cpv-tools"><button type="button" data-cpv="preview">'+ico('eye',18)+'<span>Ver como visitante<small>Visualize seu perfil público</small></span>'+ico('chevron',15)+'</button><button type="button" data-cpv="visitors">'+ico('users',18)+'<span>Quem visitou meu perfil<small>Últimos 5 dias</small></span>'+ico('chevron',15)+'</button></div>';}
async function record(target){if(!allowed()||target===uid())return;try{await api.rpc('connect_profile_visit_record',{_target:target});}catch(e){console.warn('Visit unavailable',e?.code);}}
function note(){return '<p class="cpv-notice">Quando o compartilhamento de visitas estiver ativado no seu perfil, sua visita aparece para esta pessoa por até 5 dias.</p>';}
function schedule(rows){clearTimeout(timer);if(!rows.length)return;const next=Math.min(...rows.map(p=>Date.parse(p.visited_at)+5*86400000));timer=setTimeout(()=>{if(dialog&&owner===uid()){page=0;cursors=[null];void load();}},Math.max(100,Math.min(next-Date.now()+100,2147483647)));}
async function load(){if(!dialog||busy||!allowed()||uid()!==owner)return;busy=true;const token=++epoch,root=dialog,account=owner;
 const list=root.querySelector('.cpv-list'),status=root.querySelector('.cpv-status'),prev=root.querySelector('[data-cpv="prev"]'),next=root.querySelector('[data-cpv="next"]'),toggle=root.querySelector('[data-cpv="toggle"]');
 list.replaceChildren();status.textContent='Carregando…';prev.disabled=next.disabled=toggle.disabled=true;
 try{
 const c=cursors[page], [pref,result]=await Promise.all([api.rpc('connect_profile_visit_preference'),api.rpc('connect_profile_visitors',{_before:c?.visited_at||null,_visitor:c?.id||null})]);
 if(token!==epoch||dialog!==root||uid()!==account)return;
 enabled=pref===true;toggle.checked=enabled;toggle.disabled=false;
 const rows=Array.isArray(result?.rows)?result.rows.filter(p=>Date.parse(p.visited_at)+5*86400000>Date.now()).slice(0,15):[];
 if(!rows.length){list.innerHTML='<div class="cpv-empty">'+ico('users',28)+'<strong>Nenhuma visita nesta página</strong><small>As visitas compartilhadas expiram automaticamente.</small></div>';}else{
 list.innerHTML=rows.map(p=>'<button type="button" class="cpv-row" data-cpv="person" data-id="'+esc(p.id)+'"><span class="cpv-avatar">'+esc(initials(p.display_name))+'</span><span class="cpv-person"><strong>'+esc(p.display_name||'Pessoa do CONNECT')+'</strong><small>@'+esc(p.username||'')+'</small></span><time datetime="'+esc(p.visited_at)+'">'+esc(new Date(p.visited_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}))+'</time>'+ico('chevron',14)+'</button>').join('');}
 if(rows.length&&result?.has_more)cursors[page+1]=rows.at(-1);
 status.textContent='Página '+(page+1)+' · '+rows.length+' visita(s)';prev.disabled=page===0;next.disabled=!(rows.length&&result?.has_more);schedule(rows);
 }catch(e){if(token===epoch&&dialog===root){status.textContent='Não foi possível carregar. Tente atualizar.';prev.disabled=page===0;}}
 finally{if(token===epoch)busy=false;}
}
function open(){if(!allowed())return;close();owner=uid();page=0;cursors=[null];dialog=document.createElement('dialog');dialog.className='cpv-dialog';dialog.setAttribute('aria-labelledby','cpv-title');dialog.innerHTML='<header><div><small>PRIVACIDADE DO PERFIL</small><h2 id="cpv-title">Quem visitou meu perfil</h2></div><button type="button" data-cpv="close" class="cpv-icon" aria-label="Fechar">'+ico('close',20)+'</button></header><p class="cpv-subtitle">Somente você pode consultar estas visitas. Elas desaparecem após 5 dias.</p><label class="cpv-setting"><span><strong>Compartilhar minhas visitas</strong><small>Permita que outras pessoas vejam quando você visita o perfil delas. Desativar apaga suas visitas compartilhadas.</small></span><input type="checkbox" data-cpv="toggle" disabled></label><div class="cpv-list" aria-live="polite"></div><div class="cpv-pagination"><button type="button" data-cpv="prev" disabled>Anterior</button><span class="cpv-status" role="status"></span><button type="button" data-cpv="next" disabled>Próxima</button></div><button type="button" class="cpv-refresh" data-cpv="refresh">'+ico('refresh',15)+' Atualizar visitas</button>';
 document.body.append(dialog);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.showModal();void load();}
document.addEventListener('click',e=>{
 const b=e.target.closest?.('[data-cpv]');if(!b||b.disabled||b.tagName==='INPUT')return;
 e.preventDefault();e.stopImmediatePropagation();if(!allowed()){close();return;}const action=b.dataset.cpv;
 if(action==='preview'){void api.openPerson(uid(),'','',true);return;}
 if(action==='visitors'){open();return;}
 if(action==='close'){close();return;}
 if(action==='person'){const id=b.dataset.id;close();void api.openPerson(id);return;}
 if(busy||!dialog||owner!==uid())return;
 if(action==='prev'&&page>0){page--;void load();}
 if(action==='next'&&cursors[page+1]){page++;void load();}
 if(action==='refresh'){page=0;cursors=[null];void load();}
},true);
document.addEventListener('change',async e=>{
 const input=e.target.closest?.('[data-cpv="toggle"]');if(!input||!dialog||!allowed()||owner!==uid()||busy)return;
 const root=dialog,account=owner;input.disabled=true;try{const r=await api.rpc('connect_profile_visit_preference',{_enabled:input.checked});if(dialog!==root||uid()!==account)return;enabled=r===true;input.checked=enabled;toast(enabled?'Compartilhamento de visitas ativado.':'Compartilhamento desativado.');}
 catch(err){if(dialog===root&&uid()===account){input.checked=enabled;toast('Não foi possível alterar a preferência.',true);}}finally{if(dialog===root)input.disabled=false;}
},true);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&dialog){if(owner!==uid()||!allowed())close();else if(!busy){page=0;cursors=[null];void load();}}});
document.addEventListener('DOMContentLoaded',()=>{const app=document.getElementById('app');if(app)new MutationObserver(()=>{if(dialog&&(owner!==uid()||!allowed()))close();}).observe(app,{childList:true,subtree:true});},{once:true});
window.connectProfileVisits={markup,record,note,close};
})();
