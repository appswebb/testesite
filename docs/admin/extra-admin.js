/* entre. admin: support evidence review + premium price configuration */
(function(){
'use strict';
function premiumPage(config,escape,icon){
 const price=config?.price_cents==null?'':String((Number(config.price_cents)/100).toFixed(2));
 return '<section class="form-card"><h2 class="section-heading">Premium · 30 dias</h2>'+
 '<p class="section-desc">Configure o pagamento Premium de 30 dias, feito pelo navegador com Pix ou cartão. Esta modalidade não renova automaticamente. Confira as Edge Functions e webhooks antes de liberar.</p>'+
 '<form id="premium-config-form" class="extra-admin-form"><div class="field"><label for="premium-price">Valor por 30 dias (R$)</label>'+
 '<input id="premium-price" type="number" name="price" step="0.01" min="1" max="10000" value="'+escape(price)+'" placeholder="Ex.: 19,90" required></div>'+
 '<label class="extra-admin-toggle"><input type="checkbox" name="enabled" '+(config?.enabled?'checked':'')+'><span>Habilitar compra Premium pela web</span></label>'+
 '<div class="admin-note">Antes de habilitar, configure <code>MERCADOPAGO_ACCESS_TOKEN</code> e <code>MERCADOPAGO_WEBHOOK_SECRET</code>, além de <code>MERCADOPAGO_PUBLIC_KEY</code>, no Supabase. Publique também <code>entre-premium-web</code> e <code>entre-premium-payment-webhook</code>. Sem isso, não ocorre cobrança nem desbloqueio do selo.</div>'+
 '<button type="submit" class="btn-main">'+icon('check-circle',17)+' Salvar configuração</button></form></section>'+
 '<section class="form-card extra-admin-summary"><h3 class="section-heading">Benefícios com validação no servidor</h3>'+
 '<p>Busca por gênero exato; brilho e selo Premium; WhatsApp prioritário.</p>'+
 '<p>Os recursos são liberados somente após um pagamento confirmado pela API do Mercado Pago.</p></section>';
}
function supportPage(rows,escape,format,icon,badge){
 const items=Array.isArray(rows)?rows:[];
 return '<section class="data-panel support-admin-panel"><div class="data-tools"><div><h3>Chamados recebidos</h3><small>Relatos com provas anexadas em armazenamento privado.</small></div>'+badge(items.length+' protocolos','neutral')+'</div>'+
 (items.length?items.map(t=>'<article class="support-admin-ticket"><div class="support-admin-top"><strong>Protocolo #'+Number(t.id)+' · '+escape(t.subject)+'</strong>'+badge(({submitted:'AGUARDANDO',reviewing:'EM ATENDIMENTO',resolved:'RESOLVIDO',cancelled:'CANCELADO'})[t.status]||t.status,'neutral')+'</div>'+
 '<small>'+escape(t.user_email||'Conta indisponível')+' · '+format(t.created_at)+' · '+escape(t.category)+'</small>'+
 '<p>'+escape(t.description)+'</p><div class="support-evidence-links">'+(t.evidence||[]).map((path,i)=>'<button type="button" class="small-btn" data-action="evidenceOpen" data-path="'+escape(path)+'">'+icon('external-link',15)+' Prova '+(i+1)+'</button>').join('')+'</div><button type="button" class="small-btn" data-action="supportThread" data-id="'+Number(t.id)+'">Responder protocolo</button></article>').join(''):
 '<p class="section-desc" style="padding:24px">Nenhum chamado com provas por enquanto.</p>')+'</section>';
}
function recurringPage(config,escape){
 const enabled=config?.recurring_enabled===true;
 return '<section class="form-card recurring-admin-config"><h2 class="section-heading">Renovação automática do Premium</h2>'+
 '<p class="section-desc">Modalidade separada do pagamento avulso de 30 dias. O comprador autoriza cobranças mensais no cartão. O acesso só é liberado depois que uma fatura aprovada for confirmada no servidor.</p>'+
 '<form id="premium-recurring-settings-form"><label class="extra-admin-toggle"><input type="checkbox" name="enabled" '+(enabled?'checked':'')+'><span>Permitir assinaturas recorrentes pelo cartão</span></label>'+
 '<div class="admin-note"><strong>Antes de ativar:</strong> configurar as credenciais Mercado Pago, o endpoint de webhook <code>entre-premium-recurring-webhook</code> para os eventos <code>subscription_authorized_payment</code> e <code>subscription_preapproval</code>, e testar com o ambiente de pagamentos do provedor. A modalidade Pix não renova automaticamente.</div>'+
 '<button type="submit" class="btn-main">'+(enabled?'Salvar modo recorrente':'Configurar recorrência')+'</button></form></section>';
}
function priceParams(form){
 const price=Number(form.elements.price.value);
 if(!Number.isFinite(price)||price<1||price>10000)throw Error('Escolha um valor entre R$ 1,00 e R$ 10.000,00.');
 return {_price_cents:Math.round(price*100),_enabled:form.elements.enabled.checked};
}
window.entreAdminExtras={premiumPage,recurringPage,supportPage,priceParams};
})();
