/* CONNECT · Distinct monthly recurring card plan. Never treats Pix as an automatic renewal. */
(function(){
'use strict';
const d={config:null,subscription:null,open:false,busy:false,brick:null,error:'',last:''};
const price=()=>d.config?.price_cents?(d.config.price_cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'';
function view(){
 const active=window.entreExtras?.data?.premium?.active;
 const status=d.subscription?.status||'none',canCancel=['pending','authorized','paused'].includes(status);
 const enabled=d.config?.enabled===true;
 return '<section class="recurring-premium-box"><div class="recurring-premium-header"><span class="recurring-kicker">✳ PLANO MENSAL</span><h3>Premium que <em>renova sozinho.</em></h3><p>Assinatura mensal recorrente em cartão. Você autoriza a cobrança automática e pode cancelar a renovação quando quiser, sem precisar do aplicativo do Mercado Pago.</p>'+
 '<div class="recurring-premium-price"><strong>'+esc(price()||'Preço no painel')+'</strong><small>/ mês · cartão de crédito</small></div></div>'+
 '<div class="recurring-premium-actions">'+
 (status==='pending'?'<p class="recurring-pending">Assinatura cadastrada. A primeira cobrança pode levar até cerca de uma hora; o Premium só ativa depois da confirmação do pagamento.</p>':'')+
 (status==='authorized'?'<p class="recurring-success">Renovação mensal ativa. Último pagamento confirmado: '+(d.subscription?.last_invoice_at?new Date(d.subscription.last_invoice_at).toLocaleDateString('pt-BR'):'aguardando atualização')+'.</p>':'')+
 (status==='cancelled'?'<p>Renovação mensal cancelada. Seu acesso pago continua válido até a data já confirmada.</p>':'')+
 (d.error?'<p class="recurring-error" role="alert">'+esc(d.error)+'</p>':'')+
 (!canCancel&&!active?'<label class="recurring-consent"><input id="recurringConsent" type="checkbox"><span>Autorizo a cobrança automática mensal de '+esc(price()||'valor definido no painel')+' no cartão, até que eu cancele. Entendo que Pix é apenas para pagamentos avulsos.</span></label>'+
 '<button type="button" class="ui-btn btn-dark" data-recurring-action="open" '+(!enabled||d.busy?'disabled':'')+'>'+ico('credit-card',18)+' '+(enabled?'Assinar mensalmente no cartão':'Recorrência aguardando ativação')+'</button>':'')+
 (canCancel?'<button type="button" class="ui-btn btn-outline" data-recurring-action="verify">Verificar última cobrança</button><button type="button" class="recurring-cancel" data-recurring-action="cancel">Cancelar renovação automática</button>':'')+
 '<div id="recurringCardBrick" '+(d.open?'':'hidden')+' class="recurring-card-brick"></div>'+
 '<p class="recurring-premium-note">O cartão é tokenizado pelo Mercado Pago. O CONNECT não recebe o número completo do cartão. O plano avulso de 30 dias com Pix/cartão continua disponível acima.</p></div></section>';
}
async function loadStatus(paint=false){
 if(!state.session?.user)return;
 try{
  const [{data:cfg,error:ce},{data:status,error:se}]=await Promise.all([
   db.functions.invoke('entre-premium-recurring',{body:{action:'config'}}),
   db.rpc('entre_premium_recurring_overview')
  ]);
  if(!ce&&cfg)d.config=cfg;
  if(!se&&status)d.subscription=status;
  if(paint&&state.view==='premium')renderView();
 }catch(error){console.warn('Recurring status unavailable');}
}
async function sdk(){
 if(window.MercadoPago)return;
 await new Promise((resolve,reject)=>{
  const el=document.createElement('script');el.src='https://sdk.mercadopago.com/js/v2';
  el.onload=resolve;el.onerror=()=>reject(Error('Mercado Pago não carregou.'));document.head.appendChild(el);
 });
}
async function unmount(){
 const brick=d.brick;d.brick=null;
 if(brick?.unmount)try{await brick.unmount();}catch(e){}
}
async function show(){
 if(!d.config?.enabled||!d.config.public_key)throw Error('A administração ainda precisa habilitar a assinatura mensal.');
 if(!document.getElementById('recurringConsent')?.checked)throw Error('Marque o consentimento de cobrança mensal antes de continuar.');
 d.open=true;d.error='';renderView();
 await sdk();
 const node=document.getElementById('recurringCardBrick');
 if(!node)return;
 const mp=new window.MercadoPago(d.config.public_key,{locale:'pt-BR'});
 d.brick=await mp.bricks().create('cardPayment','recurringCardBrick',{
  initialization:{amount:Number(d.config.price_cents)/100},
  callbacks:{
   onReady:()=>{},
   onError:(error)=>{console.warn('Card Payment Brick',error);d.error='Não foi possível iniciar o pagamento recorrente.';const msg=document.querySelector('.recurring-error');if(msg)msg.textContent=d.error;},
   onSubmit:async({formData})=>{
    const card=String(formData?.token||formData?.card_token_id||'');
    if(!card)throw Error('Não foi possível validar o cartão.');
    const {data,error}=await db.functions.invoke('entre-premium-recurring',{body:{action:'start',request_id:crypto.randomUUID(),card_token_id:card}});
    if(error||data?.error)throw Error(data?.error||'Assinatura indisponível.');
    d.open=false;await unmount();
    d.subscription={status:'pending'};renderView();
    toast('Assinatura autorizada. Aguarde a aprovação da primeira cobrança.');
   }
  }
 });
}
async function action(which){
 if(d.busy)return;d.busy=true;
 try{
  if(which==='open')await show();
  if(which==='verify'){
   const {data,error}=await db.functions.invoke('entre-premium-recurring',{body:{action:'status'}});
   if(error||data?.error)throw Error(data?.error||'Não foi possível verificar o pagamento.');
   await loadStatus();
   if(data.premium_active){await window.entreExtras?.refreshPremium?.();toast('Pagamento confirmado. Premium ativo!');}
   else toast('Aguardando cobrança aprovada no Mercado Pago.');
   renderView();
  }
  if(which==='cancel'){
   if(!confirm('Cancelar a renovação mensal? O acesso já pago permanece até o vencimento.'))return;
   const {data,error}=await db.functions.invoke('entre-premium-recurring',{body:{action:'cancel'}});
   if(error||data?.error)throw Error(data?.error||'Não foi possível cancelar.');
   await loadStatus();d.open=false;await unmount();renderView();
   toast('Renovação automática cancelada no Mercado Pago.');
  }
 }catch(e){d.error=infoError(e);toast(d.error,true);if(state.view==='premium')renderView();}
 finally{d.busy=false;}
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-recurring-action]');if(!b)return;
 void action(b.dataset.recurringAction);
});
window.entreRecurring={view,loadStatus,unmount,isOpen:()=>d.open};
})();