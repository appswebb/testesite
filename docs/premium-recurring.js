/* CONNECT · Distinct monthly recurring card plan. Never treats Pix as an automatic renewal. */
(function(){
'use strict';
const d={config:null,subscription:null,open:false,busy:false,brick:null,error:'',last:''};
const price=()=>d.config?.price_cents?(d.config.price_cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'';
function view(){
 const active=window.entreExtras?.data?.premium?.active;
 const status=d.subscription?.status||'none',canCancel=['pending','authorized','paused'].includes(status);
 const enabled=d.config?.enabled===true;
 return '<div class="cp-recurring-inline">'+
 (status==='pending'?'<p>Assinatura autorizada. Aguardando a primeira cobrança.</p>':'')+
 (status==='authorized'?'<p>Renovação automática ativa.</p>':'')+
 (status==='cancelled'?'<p>Renovação cancelada. Acesso pago válido até o vencimento.</p>':'')+
 (d.error?'<p role="alert" class="cp-recurring-error">'+esc(d.error)+'</p>':'')+
 (!canCancel&&!d.open?'<label class="cp-recurring-consent"><input id="recurringConsent" type="checkbox"><span>Autorizo a cobrança mensal automática de '+esc(price()||'valor informado')+' no cartão até cancelar.</span></label><button type="button" class="ui-btn btn-dark" data-recurring-action="open" '+(!enabled||d.busy?'disabled':'')+'>Assinar Premium</button>':'')+
 (canCancel?'<button type="button" class="ui-btn btn-outline" data-recurring-action="verify">Verificar pagamento</button><button type="button" class="cp-plan-verify" data-recurring-action="cancel">Cancelar renovação</button>':'')+
 '<div id="recurringCardBrick" '+(d.open?'':'hidden')+'></div><small>Pagamento seguro pelo Mercado Pago.</small></div>';
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
 }catch(e){d.error=infoError(e);d.open=false;toast(d.error,true);if(state.view==='premium')renderView();}
 finally{d.busy=false;const b=document.querySelector('[data-recurring-action="open"]');if(b&&d.config?.enabled)b.disabled=false;}
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-recurring-action]');if(!b)return;
 void action(b.dataset.recurringAction);
});
window.entreRecurring={view,loadStatus,unmount,isOpen:()=>d.open,price};
})();