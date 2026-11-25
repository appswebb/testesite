/* entre. admin: support evidence review + premium price configuration */
(function(){
'use strict';
const planLabels={premium:'Premium',free:'Gratuito',expired:'Gratuito · vencido',revoked:'Gratuito · revogado',no_profile:'Sem perfil'};
function planBadge(status,escape,icon){
 const value=planLabels[status]||'Não consultado';
 return '<span class="plan-badge '+(status==='premium'?'is-premium':status==='expired'||status==='revoked'?'is-ended':'')+'">'+(status==='premium'?icon('crown',14):'')+escape(value)+'</span>';
}
function premiumPage(config,escape,icon,directory,query,filter,page,pageSize,format,person){
 const price=config?.price_cents==null?'':String((Number(config.price_cents)/100).toFixed(2));
 const stats=directory?.counts||{},rows=Array.isArray(directory?.rows)?directory.rows:[],total=Number(directory?.total)||0;
 const chips=[['all','Todos'],['premium','Premium'],['free','Gratuitos'],['expired','Vencidos'],['revoked','Revogados']];
 const cards=[['total','Contas no Connect','users'],['premium','Premium ativos','crown'],['free','Plano gratuito','users'],['expired','Premium vencidos','clock']];
 return '<div class="plan-metrics">'+cards.map(([key,label,symbol])=>'<div class="plan-metric"><span>'+icon(symbol,16)+' '+label+'</span><strong>'+escape(stats[key]==null?'—':Number(stats[key]).toLocaleString('pt-BR'))+'</strong></div>').join('')+'</div>'+
 '<section class="data-panel plan-directory"><div class="data-tools"><div><h3>Gerenciar planos</h3><small>Selecione uma conta para liberar, renovar ou retornar ao plano gratuito.</small></div><label class="search-box">'+icon('search',17)+'<input id="plan-search" placeholder="Nome, @usuário ou e-mail…" aria-label="Pesquisar assinantes" maxlength="120" autocomplete="off" value="'+escape(query||'')+'"></label></div><div class="plan-filters" role="group" aria-label="Filtrar por plano">'+chips.map(([key,label])=>'<button type="button" class="small-btn '+(filter===key?'is-selected':'')+'" data-action="plan-filter" data-plan="'+key+'" aria-pressed="'+(filter===key)+'">'+label+'</button>').join('')+'</div>'+
 (directory==null?'<p class="plan-empty">Não foi possível consultar os planos. Use Atualizar dados.</p>':rows.length?rows.map(u=>'<article class="plan-row"><div class="list-main">'+person(u.display_name||u.username||u.email,u.email,false)+'</div><div class="plan-row-details">'+planBadge(u.plan_status,escape,icon)+'<small>'+(u.paid_until?'Vencimento: '+escape(format(u.paid_until)):'Sem prazo de assinatura')+'</small></div><button type="button" class="small-btn plan-manage-btn" data-action="plan-manage" data-id="'+escape(u.id)+'" '+(u.manageable?'':'disabled')+'>'+icon('settings',15)+' Gerenciar</button></article>').join(''):'<p class="plan-empty">Nenhuma conta corresponde a este filtro.</p>')+
 '<div class="table-footer"><span>Página '+(page+1)+' · '+escape(total)+' conta(s)</span><div class="plan-pagination"><button class="small-btn" data-action="plan-prev" '+(page<=0?'disabled':'')+'>Anterior</button><button class="small-btn" data-action="plan-next" '+((page+1)*pageSize>=total?'disabled':'')+'>Próxima</button></div></div></section>'+
 '<section class="form-card plan-price"><h2 class="section-heading">Preço do plano Premium</h2><form id="premium-config-form" class="extra-admin-form"><div class="field"><label for="premium-price">Valor por mês (R$)</label><input id="premium-price" type="number" name="price" step="0.01" min="1" max="10000" value="'+escape(price)+'" required></div><button type="submit" class="btn-main">Salvar valor</button></form><p class="section-desc">Compras pelo WhatsApp. A alteração do plano não gera cobrança nem reembolso automático.</p></section>';
}
function planEditor(account,history,escape,icon,format){
 const active=account.active===true,status=active?'premium':account.revoked?'revoked':account.paid_until?'expired':'free';
 return '<div class="plan-editor"><h2>Gerenciar plano</h2><p>'+escape(account.display_name||'Conta')+' · '+escape(account.email)+'</p><div class="plan-current"><span>Plano atual</span>'+planBadge(status,escape,icon)+'<small>'+(account.paid_until?'Vencimento: '+escape(format(account.paid_until)):'Sem assinatura ativa')+'</small></div>'+
 '<form id="premium-manual-form"><input type="hidden" name="email" value="'+escape(account.email)+'"><div class="field"><label for="manual-months">'+(active?'Meses adicionais':'Meses de acesso Premium')+'</label><input id="manual-months" name="months" type="number" min="1" max="12" value="1" required></div><div class="plan-editor-actions"><button type="submit" name="operation" value="grant" class="btn-main">'+icon('crown',17)+' '+(active?'Renovar Premium':'Ativar Premium')+'</button>'+(active?'<button type="submit" name="operation" value="revoke" formnovalidate class="small-btn danger">Voltar ao gratuito</button>':'')+'</div><p class="section-desc">A renovação soma meses ao período vigente. Voltar ao gratuito revoga os benefícios imediatamente, sem excluir a conta e sem estornar pagamentos.</p></form>'+
 '<div class="plan-audit"><h3>Histórico administrativo</h3>'+(history===null?'<p>Histórico indisponível.</p>':history.length?history.map(h=>'<article><strong>'+escape(h.action==='grant'?'Premium liberado / renovado':'Premium revogado')+'</strong><small>'+escape(format(h.created_at))+' · '+escape(h.actor||'Administrador')+'</small>'+(h.action==='grant'?'<small>'+escape(h.months)+' mês(es) · até '+escape(format(h.paid_until))+'</small>':'')+'</article>').join(''):'<p>Nenhuma alteração registrada.</p>')+'</div><div class="modal-actions"><button type="button" class="btn-outline" data-action="close-modal">Fechar</button></div></div>';
}
function supportPage(rows,escape,format,icon,badge){
 const items=Array.isArray(rows)?rows:[];
 return '<section class="data-panel support-admin-panel"><div class="data-tools"><div><h3>Chamados recebidos</h3><small>Relatos com provas anexadas em armazenamento privado.</small></div>'+badge(items.length+' protocolos','neutral')+'</div>'+
 (items.length?items.map(t=>'<article class="support-admin-ticket"><div class="support-admin-top"><strong>Protocolo #'+Number(t.id)+' · '+escape(t.subject)+'</strong>'+badge(({submitted:'AGUARDANDO',reviewing:'EM ATENDIMENTO',resolved:'RESOLVIDO',cancelled:'CANCELADO'})[t.status]||t.status,'neutral')+'</div>'+
 '<small>'+escape(t.user_email||'Conta indisponível')+' · '+format(t.created_at)+' · '+escape(t.category)+'</small>'+
 '<p>'+escape(t.description)+'</p><div class="support-evidence-links">'+(t.evidence||[]).map((path,i)=>'<button type="button" class="small-btn" data-action="evidenceOpen" data-path="'+escape(path)+'">'+icon('external-link',15)+' Prova '+(i+1)+'</button>').join('')+'</div><button type="button" class="small-btn" data-action="supportThread" data-id="'+Number(t.id)+'">Responder protocolo</button></article>').join(''):
 '<p class="section-desc" style="padding:24px">Nenhum chamado com provas por enquanto.</p>')+'</section>';
}
function recurringPage(){return '';}
function priceParams(form){
 const price=Number(form.elements.price.value);
 if(!Number.isFinite(price)||price<1||price>10000)throw Error('Escolha um valor entre R$ 1,00 e R$ 10.000,00.');
 return {_price_cents:Math.round(price*100),_enabled:false};
}
window.entreAdminExtras={premiumPage,planBadge,planEditor,recurringPage,supportPage,priceParams};
})();
