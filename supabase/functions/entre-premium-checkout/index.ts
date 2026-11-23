import { createClient } from "jsr:@supabase/supabase-js@2.57.0";

const ORIGIN = "https://appswebb.github.io";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
 status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": ORIGIN }
});
Deno.serve(async (req: Request) => {
 if(req.method === "OPTIONS")return new Response(null, {headers: {
  "Access-Control-Allow-Origin": ORIGIN,"Access-Control-Allow-Methods":"POST,OPTIONS",
  "Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info"
 }});
 if(req.method !== "POST")return json({error:"method_not_allowed"},405);
 try{
  const token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
  if(!token)return json({error:"unauthorized"},401);
  const url=Deno.env.get("SUPABASE_URL")||"";
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  const anon=Deno.env.get("SUPABASE_ANON_KEY")||"";
  if(!url||!serviceKey||!anon)return json({error:"service_configuration_missing"},503);
  const auth=createClient(url,anon,{auth:{persistSession:false}});
  const {data:session,error:authError}=await auth.auth.getUser(token);
  if(authError||!session.user?.email)return json({error:"login_required"},401);
  const mpToken=Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
  const mpSecret=Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET");
  if(!mpToken||!mpSecret)return json({error:"mercadopago_not_configured"},503);
  const service=createClient(url,serviceKey,{auth:{persistSession:false}});
  const {data:settings}=await service.from("entre_premium_settings").select("enabled,monthly_price_cents").eq("id",1).maybeSingle();
  const cents=settings?.monthly_price_cents;
  if(!settings?.enabled||!Number.isInteger(cents)||cents<100)return json({error:"checkout_not_enabled"},503);
  const {data:existing}=await service.from("entre_premium_subscriptions").select("status,paid_until").eq("user_id",session.user.id).maybeSingle();
  if(existing?.status==="authorized"&&new Date(existing.paid_until).getTime()>Date.now())return json({error:"already_premium"},409);
  const response=await fetch("https://api.mercadopago.com/preapproval",{
   method:"POST",headers:{"Authorization":"Bearer "+mpToken,"Content-Type":"application/json","X-Idempotency-Key":crypto.randomUUID()},
   body:JSON.stringify({
    reason:"entre. Premium — assinatura mensal",
    external_reference:session.user.id,
    payer_email:session.user.email,
    back_url:"https://appswebb.github.io/testesite/?premium=return",
    notification_url:url+"/functions/v1/entre-premium-webhook",
    auto_recurring:{frequency:1,frequency_type:"months",transaction_amount:cents/100,currency_id:"BRL"},
    status:"pending"
   })
  });
  const info=await response.json().catch(()=>({}));
  if(!response.ok||!info?.id||!info?.init_point)return json({error:"mercadopago_checkout_unavailable"},502);
  const checkoutUrl=new URL(info.init_point);
  if(checkoutUrl.protocol!=="https:"||!/(^|\.)mercadopago\.(com|com\.br|com\.ar)$/.test(checkoutUrl.hostname))
   return json({error:"invalid_payment_provider"},502);
  const {error:saveError}=await service.from("entre_premium_subscriptions").upsert({
   user_id:session.user.id,provider:"mercadopago",provider_id:String(info.id),status:"pending",paid_until:null,updated_at:new Date().toISOString()
  },{onConflict:"user_id"});
  if(saveError)return json({error:"cannot_register_subscription"},502);
  return json({init_point:checkoutUrl.toString()});
 }catch(err){console.error("entre-premium-checkout",String(err));return json({error:"checkout_unavailable"},500);}
});
