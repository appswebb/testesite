/* entre. admin: support evidence review + premium price configuration */
(function(){
'use strict';
function premiumPage(config,escape,icon,account){
 const price=config?.price_cents==null?'':String((Number(config.price_cents)/100).toFixed(2));
 const found=account?.email?'<div class="admin-note"><strong>'+escape(account.display_name||'Conta')+'</strong><p>'+escape(account.email)+'</p><p>'+ (account.active?'Premium ativo · até '+escape(new Date(account.paid_until).toLocaleString('pt-BR')):'Premium inativo')+'</p></div><div class="field"><label for="manual-months">Meses para liberar ou renovar</label><input id="manual-months" name="months" type="number" min="1" max="12" value="1" required></div><div class="extra-admin-toggle" style="display:flex;gap:8px;flex-wrap:wrap"><button type="submit" name="operation" value="grant" class="btn-main">'+icon('check-circle',17)+' '+(account.active?'Renovar acesso':'Liberar Premium')+'</button>'+(account.active?'<button type="submit" name="operation" value="revoke" class="small-btn">Revogar acesso</button>':'')+'</div>':'';
 return '<section class="form-card"><h2 class="section-heading">Liberação manual por e-mail</h2><p class="section-desc">Após confirmar a compra pelo WhatsApp, localize a conta e libere o período pago. O acesso vence automaticamente, sem cobrança integrada.</p><form id="premium-manual-form" class="extra-admin-form"><div class="field"><label for="manual-email">E-mail cadastrado no CONNECT</label><input id="manual-email" name="email" type="email" autocomplete="off" maxlength="254" required value="'+escape(account?.email||'')+'" placeholder="usuario@exemplo.com"></div><button type="submit" name="operation" value="lookup" class="small-btn">Buscar conta</button>'+found+'</form></section>'+
 '<section class="form-card"><h2 class="section-heading">Valor mensal</h2><form id="premium-config-form" class="extra-admin-form"><div class="field"><label for="premium-price">Valor por mês (R$)</label><input id="premium-price" type="number" name="price" step="0.01" min="1" max="10000" value="'+escape(price)+'" required></div><button type="submit" class="btn-main">Salvar valor</button></form><p class="section-desc">Compras exclusivamente pelo WhatsApp. Não há cobrança automática.</p></section>';
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
window.entreAdminExtras={premiumPage,recurringPage,supportPage,priceParams};
})();
