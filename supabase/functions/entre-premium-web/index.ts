import { createClient } from "jsr:@supabase/supabase-js@2.57.0";

const ORIGIN = "https://appswebb.github.io";
const json = (value: unknown, status=200) => new Response(JSON.stringify(value), {status, headers:{
 "Content-Type":"application/json", "Cache-Control":"no-store",
 "Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info",
 "Access-Control-Allow-Methods":"POST,OPTIONS"
}});
const err = (error:string,status=400) => {console.warn("connect-payment-error",error,status);return json({error},status);};
const PAYMENT_API="https://api.mercadopago.com/v1/payments";
const validUUID=(v:unknown)=>typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const validMethod=(v:unknown)=>typeof v==="string"&&/^[a-z0-9_]{2,36}$/.test(v);
const statusDetail=(p:any)=>typeof p?.status_detail==='string'&&/^[a-z0-9_]{1,80}$/.test(p.status_detail)?p.status_detail:null;
const idNum=(v:unknown)=>typeof v==="number"||typeof v==="string"?/^[0-9]{5,20}$/.test(String(v)):false;

Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return json({},200);
 if(req.method!=="POST")return err("method_not_allowed",405);
 try{
  const token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
  if(!token)return err("login_required",401);
  const apiUrl=Deno.env.get("SUPABASE_URL")||"";
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  const anonKey=Deno.env.get("SUPABASE_ANON_KEY")||"";
  const access=Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")||"";
  const webhookSecret=Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET")||"";
  const publicKey=Deno.env.get("MERCADOPAGO_PUBLIC_KEY")||Deno.env.get("MERCADOPAGO_WEB_PUBLIC_KEY")||"";
  if(!apiUrl||!serviceKey||!anonKey)return err("supabase_configuration_missing",503);
  const client=createClient(apiUrl,anonKey,{auth:{persistSession:false}});
  const {data:{user},error:authError}=await client.auth.getUser(token);
  if(authError||!user?.email||!user.email_confirmed_at)return err("login_required",401);
  const service=createClient(apiUrl,serviceKey,{auth:{persistSession:false}});
  const body=await req.json().catch(()=>null);
  if(!body||typeof body!=="object")return err("invalid_request");
  const action=String(body.action||"config");
  if(action==="config")return json({enabled:false,message:"O CONNECT utiliza Asaas."});
  if(action==="pay")return err("provider_retired",410);
  const authorized=createClient(apiUrl,anonKey,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false}});
  const [ban,maintenance]=await Promise.all([authorized.rpc("entre_is_banned"),authorized.rpc("entre_maintenance_active")]);
  if(ban.error||maintenance.error||ban.data===true||maintenance.data===true)return err("account_or_checkout_unavailable",403);
  const {data:settings,error:settingError}=await service.from("entre_premium_settings").select("enabled,monthly_price_cents").eq("id",1).maybeSingle();
  if(settingError)return err("settings_unavailable",503);
  const cents=Number(settings?.monthly_price_cents||0);
  const enabled=settings?.enabled===true&&Number.isSafeInteger(cents)&&cents>=100&&cents<=1000000;
  const productionKeys=access.startsWith("APP_USR-")&&publicKey.startsWith("APP_USR-");
  if(action==="config")return json({enabled:enabled&&productionKeys&&Boolean(webhookSecret),price_cents:cents,
   public_key:enabled&&productionKeys&&webhookSecret?publicKey:null,mode:"one_time_30_days",
   message:!productionKeys||!webhookSecret?"As chaves Mercado Pago para o checkout web precisam ser configuradas no Supabase.":null});
  if(!productionKeys||!enabled||!webhookSecret)return err("web_checkout_not_configured",503);

  async function verifiedPayment(paymentId:string, record:any){
   if(!idNum(paymentId))return {status:"unverified"};
   const res=await fetch(PAYMENT_API+"/"+encodeURIComponent(paymentId),{headers:{"Authorization":"Bearer "+access}});
   if(!res.ok)return {status:"unverified"};
   const payment=await res.json().catch(()=>null);
   if(!payment||payment.live_mode!==true||String(payment.id)!==paymentId||String(payment.external_reference)!=="connect-premium:"+user!.id+":"+record.id||
      payment.currency_id!=="BRL"||Math.round(Number(payment.transaction_amount)*100)!==record.amount_cents)
    return {status:"unverified"};
   const status=String(payment.status||"pending");
   const safeStatus=["approved","pending","in_process","rejected","cancelled"].includes(status)?status:"pending";
   let paidUntil:string|null=null;
   if(status==="approved"){
    const at=Date.parse(payment.date_approved||"");
    if(!Number.isFinite(at)||at<Date.now()-45*86400000||at>Date.now()+86400000)return {status:"unverified"};
    paidUntil=new Date(at+30*86400000).toISOString();
    const {data:current}=await service.from("entre_premium_subscriptions").select("status,paid_until").eq("user_id",user!.id).maybeSingle();
    if(current?.status==="authorized"&&current.paid_until&&new Date(current.paid_until).getTime()>new Date(paidUntil).getTime())
      paidUntil=current.paid_until;
    const {error:grantError}=await service.from("entre_premium_subscriptions").upsert({
      user_id:user!.id,provider:"mercadopago_web",provider_id:paymentId,status:"authorized",paid_until:paidUntil,
      updated_at:new Date().toISOString()
    },{onConflict:"user_id"});
    if(grantError)return {status:"unverified"};
   }
   await service.from("entre_premium_web_payments").update({
      status:safeStatus,paid_until:paidUntil,updated_at:new Date().toISOString(),provider_payment_id:paymentId
   }).eq("id",record.id).eq("user_id",user!.id);
   const qr=payment.payment_method_id==="pix"&&safeStatus==="pending"?payment.point_of_interaction?.transaction_data:null;
   return {status:safeStatus,paid_until:paidUntil,status_detail:statusDetail(payment),pix_code:typeof qr?.qr_code==="string"&&qr.qr_code.length<3000?qr.qr_code:null,pix_qr_base64:typeof qr?.qr_code_base64==="string"&&/^[a-zA-Z0-9+/=]+$/.test(qr.qr_code_base64)&&qr.qr_code_base64.length<120000?qr.qr_code_base64:null};
  }

  if(action==="status"){
   const {data:record,error:recordError}=await service.from("entre_premium_web_payments").select("id,user_id,amount_cents,status,provider_payment_id,method,created_at,paid_until")
    .eq("user_id",user.id).order("created_at",{ascending:false}).limit(1).maybeSingle();
   if(recordError)return err("payment_status_unavailable",503);
   if(!record)return json({status:"none"});
   if(record.provider_payment_id&&(record.status==="pending"||record.status==="in_process"||record.status==="creating"||record.status==="rejected"||record.status==="cancelled")){
    const check=await verifiedPayment(String(record.provider_payment_id),record);
    return json({...check,status:check.status==="unverified"&&["rejected","cancelled"].includes(record.status)?record.status:check.status,payment_id:record.provider_payment_id,paid_until:check.paid_until||record.paid_until});
   }
   return json({status:record.status,payment_id:record.provider_payment_id,paid_until:record.paid_until});
  }
  if(action!=="pay")return err("invalid_action");
  const {data:sub}=await service.from("entre_premium_subscriptions").select("status,paid_until").eq("user_id",user.id).maybeSingle();
  if(sub?.status==="authorized"&&sub.paid_until&&Date.parse(sub.paid_until)>Date.now())return err("premium_already_active",409);
  const requestId=body.request_id;
  if(!validUUID(requestId))return err("invalid_payment_request");
  const form=body.form_data;
  if(!form||typeof form!=="object")return err("invalid_payment_form");
  const method=String(form.payment_method_id||"");
  if(!validMethod(method))return err("invalid_payment_method");
  const isPix=method==="pix";
  const payer=form.payer||{};
  const identification=payer.identification||{};
  const type=String(identification.type||"").toUpperCase();
  const number=String(identification.number||"").replace(/\D/g,"");
  if(!((type==="CPF"&&number.length===11)||(type==="CNPJ"&&number.length===14)))return err("buyer_identification_required");
  const firstName=String(payer.first_name||"").trim().slice(0,80),lastName=String(payer.last_name||"").trim().slice(0,80);
  if(isPix&&(!firstName||!lastName))return err("buyer_name_required");
  const tokenCard=String(form.token||"");
  if(!isPix&&(!/^[A-Za-z0-9_-]{5,256}$/.test(tokenCard)||Number(form.installments||1)!==1))
    return err("invalid_card_token");
  const {data:reserved,error:reserveError}=await service.rpc("connect_reserve_web_payment",{_user:user.id,_request:requestId,_cents:cents,_method:isPix?"pix":"card"});
  if(reserveError)return err("payment_reservation_failed",503);
  if(reserved!==true)return err("payment_already_pending_or_unavailable",409);
  const payload:any={
   transaction_amount:cents/100,description:"CONNECT Premium - 30 dias",
   payment_method_id:method,external_reference:"connect-premium:"+user.id+":"+requestId,
   notification_url:apiUrl+"/functions/v1/entre-premium-payment-webhook",
   payer:{email:user.email,identification:{type,number}}
  };
  if(isPix){payload.payer.first_name=firstName;payload.payer.last_name=lastName;payload.date_of_expiration=new Date(Date.now()+30*60000).toISOString();}
  if(!isPix){
   payload.token=tokenCard;payload.installments=1;
   if(form.issuer_id&&/^[0-9]+$/.test(String(form.issuer_id)))payload.issuer_id=Number(form.issuer_id);
  }
  const result=await fetch(PAYMENT_API,{
   method:"POST",
   headers:{"Authorization":"Bearer "+access,"Content-Type":"application/json","X-Idempotency-Key":requestId},
   body:JSON.stringify(payload)
  });
  const payment=await result.json().catch(()=>({}));
  if(!result.ok||!idNum(payment.id)){
   if(result.status>=400&&result.status<500&&result.status!==429&&result.status!==408)await service.from("entre_premium_web_payments").update({status:"error",updated_at:new Date().toISOString()}).eq("id",requestId);
   const causes=Array.isArray(payment.cause)?payment.cause.map((x:any)=>String(x.code||"")).filter((x:string)=>/^[0-9]{1,8}$/.test(x)).slice(0,8):[];
   console.warn("connect-payment-provider",result.status,causes.join(","));
   return json({error:result.status===401||result.status===403?"provider_credentials_rejected":"payment_rejected_by_provider",provider_status:result.status,provider_codes:causes},502);
  }
  const paymentId=String(payment.id);
  await service.from("entre_premium_web_payments").update({
   status:payment.status==="approved"?"pending":["pending","in_process","rejected","cancelled"].includes(payment.status)?payment.status:"pending",
   provider_payment_id:paymentId,updated_at:new Date().toISOString()
  }).eq("id",requestId);
  const record={id:requestId,amount_cents:cents};
  const check=await verifiedPayment(paymentId,record);
  const qr=payment.point_of_interaction?.transaction_data||{};
  const code=isPix&&typeof qr.qr_code==="string"&&qr.qr_code.length<3000?qr.qr_code:null;
  const image=isPix&&typeof qr.qr_code_base64==="string"&&/^[a-zA-Z0-9+/=]+$/.test(qr.qr_code_base64)&&qr.qr_code_base64.length<120000?qr.qr_code_base64:null;
  return json({status:check.status==="unverified"?"pending":check.status,payment_id:paymentId,
   status_detail:check.status_detail||statusDetail(payment),pix_code:check.status==='pending'?code:null,pix_qr_base64:check.status==='pending'?image:null,paid_until:check.paid_until||null});
 }catch(error){console.error("premium-web-payment",String(error));return err("web_payment_failed",500);}
});
