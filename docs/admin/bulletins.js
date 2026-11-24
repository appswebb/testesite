/* Admin UI for 24-hour official notices and one-vote polls; authorization lives in SQL. */
(function(){
'use strict';
function page(bulletins,helpers){
 const {escape,format,badge,icon}=helpers,items=Array.isArray(bulletins)?bulletins:[];
 return '<section class="admin-bulletin-composer form-card"><h2 class="section-heading">Publicar aviso ou enquete</h2>'+
 '<p class="section-desc">Todos os perfis cadastrados serão notificados. Publicações e respostas duram 24 horas. O voto é opcional. Usuários que estiverem no aplicativo recebem um aviso temporário.</p>'+
 '<form id="bulletin-form"><div class="field"><label for="bulletin-kind">Tipo</label><select class="form-select" id="bulletin-kind" name="kind"><option value="notice">Aviso com respostas</option><option value="poll">Enquete opcional</option></select></div>'+
 '<div class="field"><label for="bulletin-title">Título</label><input id="bulletin-title" class="form-input" name="title" minlength="3" maxlength="120" placeholder="Ex.: O que acha do novo design?" required></div>'+
 '<div class="field"><label for="bulletin-body">Mensagem</label><textarea id="bulletin-body" class="form-textarea" name="body" minlength="3" maxlength="1500" placeholder="Escreva seu aviso ou descreva a enquete…" required></textarea></div>'+
 '<div id="bulletinOptionsField" class="field" hidden><label for="bulletin-options">Opções (uma por linha)</label><textarea id="bulletin-options" class="form-textarea" name="options" rows="5" maxlength="650" placeholder="Sim&#10;Não&#10;Talvez"></textarea><small class="form-hint">Entre 2 e 6 opções diferentes, até 100 caracteres cada. Voto único e opcional.</small></div>'+
 '<div class="setting-actions"><button type="submit" class="btn-main coral">'+icon('arrow-right',17)+' Publicar por 24 horas</button></div></form></section>'+
 '<section class="data-panel bulletin-admin-list"><div class="data-tools"><div><h3>Publicações ativas</h3><small>Gerencie avisos enviados, respostas e resultados. Você pode excluir uma publicação a qualquer momento.</small></div>'+badge(String(items.length)+' ativa(s)',"neutral")+'</div>'+
 (items.length?items.map(function(b){
  const poll=b.kind==='poll',options=Array.isArray(b.options)?b.options:[],counts=Array.isArray(b.votes_by_option)?b.votes_by_option:[],total=Number(b.votes_total)||0;
  return '<article class="bulletin-admin-entry"><div class="bulletin-admin-head">'+badge(poll?'ENQUETE':'AVISO')+'<small>Encerra '+format(b.expires_at)+'</small></div><div class="bulletin-admin-actions"><button type="button" class="small-btn bulletin-delete" data-action="delete-bulletin" data-id="'+Number(b.id)+'">'+icon('trash',16)+' Excluir '+(poll?'enquete':'aviso')+'</button></div>'+
  '<h4>'+escape(b.title)+'</h4>'+(b.body?'<p>'+escape(b.body)+'</p>':'')+
  (poll?'<div class="bulletin-admin-results">'+options.map(function(opt,i){const votes=Number(counts[i])||0,pct=total?Math.round(votes*100/total):0;return '<div class="bulletin-admin-option"><div><strong>'+escape(opt)+'</strong><small>'+votes+' voto(s) · '+pct+'%</small></div><div class="bulletin-admin-bar"><i style="width:'+pct+'%"></i></div></div>';}).join('')+'<strong>'+total+' voto(s) registrados</strong></div>':
   '<div class="bulletin-admin-replies"><strong>Respostas ('+(b.responses?.length||0)+')</strong>'+
   ((b.responses||[]).length?b.responses.map(r=>'<div class="bulletin-admin-reply"><span>'+escape(r.name)+' · '+format(r.updated_at)+'</span><p>'+escape(r.body)+'</p></div>').join(''):'<p>Sem respostas por enquanto.</p>')+'</div>')+'</article>';
 }).join(''):'<p class="section-desc" style="padding:20px">Nenhuma publicação ativa.</p>')+'</section>';
}
function syncType(){
 const isPoll=document.getElementById('bulletin-kind')?.value==='poll',field=document.getElementById('bulletinOptionsField'),body=document.getElementById('bulletin-body');
 if(field)field.hidden=!isPoll;
 if(body)body.required=!isPoll;
}
function params(form){
 const kind=form.elements.kind.value,title=form.elements.title.value.trim(),body=form.elements.body.value.trim();
 const options=kind==='poll'?form.elements.options.value.split(/\r?\n/).map(v=>v.trim()).filter(Boolean):[];
 if(kind==='poll'&&(options.length<2||options.length>6||options.some(x=>x.length>100)))throw Error('Informe entre 2 e 6 opções diferentes de até 100 caracteres cada.');
 if(kind==='poll'&&new Set(options.map(x=>x.toLowerCase())).size!==options.length)throw Error('As opções precisam ser diferentes.');
 return {_kind:kind,_title:title,_body:body,_options:options};
}
window.entreAdminBulletins={page,syncType,params};
})();
