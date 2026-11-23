import { createClient } from "jsr:@supabase/supabase-js@2.57.0";

const response=(body: unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
const hex=(data:ArrayBuffer)=>Array.from(new Uint8Array(data)).map(b=>b.toString(16).padStart(2,"0")).join("");
async function validate(req:Request,dataId:string,secret:string):Promise<boolean>{
 const raw=req.headers.get("x-signature")||"";
 const id=req.headers.get("x-request-id")||"";
 const parts=Object.fromEntries(raw.split(",").map(s=>s.trim().split("=")).filter(x=>x.length===2));
 const ts=parts.ts,signature=parts.v1;
 if(!ts||!/^[0-9]+$/.test(ts)||!signature||!/^[a-f0-9]{64}$/i.test(signature)||!id||!dataId)return false;
 const millis=Number(ts)*(ts.length===13?1:1000);
 if(Math.abs(Date.now()-millis)>20*60*1000)return false;
 const manifest="id:"+dataId.toLowerCase()+";request-id:"+id+";ts:"+ts+";";
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const signed=hex(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(manifest)));
 // Equal-length comparison avoids early character mismatches.
 let difference=0;
 for(let i=0;i<64;i++)difference|=signed.charCodeAt(i)^signature.toLowerCase().charCodeAt(i);
 return difference===0;
}
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return response({error:"method_not_allowed"},405);
 const token=Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
 const secret=Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET");
 const url=Deno.env.get("SUPABASE_URL");
 const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!token||!secret||!url||!key)return response({error:"not_configured"},503);
 try{
  const body=await req.json().catch(()=>null);
  const parsed=new URL(req.url);
  const dataId=parsed.searchParams.get("data.id")||parsed.searchParams.get("id")||String(body?.data?.id||"");
  if(!(await validate(req,dataId,secret)))return response({error:"invalid_signature"},401);
  const type=String(body?.type||parsed.searchParams.get("type")||"");
  if(type!=="subscription_authorized_payment")return response({status:"ignored"});
  if(!/^[0-9a-zA-Z-]{4,80}$/.test(dataId))return response({error:"invalid_id"},400);
  // Never grant Premium directly from webhook fields: verify the invoice with Mercado Pago itself.
  const invoiceResponse=await fetch("https://api.mercadopago.com/authorized_payments/"+encodeURIComponent(dataId),{
   headers:{"Authorization":"Bearer "+token}
  });
  if(!invoiceResponse.ok)return response({error:"cannot_verify_invoice"},503);
  const invoice=await invoiceResponse.json();
  if(invoice?.status!=="approved"||!invoice?.preapproval_id)return response({status:"not_approved"});
  const subscriptionId=String(invoice.preapproval_id);
  const payment=await fetch("https://api.mercadopago.com/preapproval/"+encodeURIComponent(subscriptionId),{
   headers:{"Authorization":"Bearer "+token}
  });
  if(!payment.ok)return response({error:"cannot_verify_subscription"},503);
  const subscription=await payment.json();
  if(subscription?.status!=="authorized"||String(subscription.id)!==subscriptionId)return response({status:"not_authorized"});
  const next=new Date(subscription.next_payment_date||"");
  if(Number.isNaN(next.getTime())||next.getTime()<=Date.now()||next.getTime()>Date.now()+40*86400000)
   return response({status:"invalid_billing_period"});
  const service=createClient(url,key,{auth:{persistSession:false}});
  const {data:registered,error:readError}=await service.from("entre_premium_subscriptions")
   .select("user_id,provider_id,status").eq("provider_id",subscriptionId).maybeSingle();
  if(readError||!registered||String(subscription.external_reference)!==registered.user_id)
   return response({error:"subscription_not_registered"},404);
  const {error:updateError}=await service.from("entre_premium_subscriptions").update({
   status:"authorized",paid_until:next.toISOString(),updated_at:new Date().toISOString()
  }).eq("provider_id",subscriptionId).eq("user_id",registered.user_id);
  if(updateError)return response({error:"activation_failed"},503);
  return response({status:"premium_confirmed"});
 }catch(error){console.error("entre-premium-webhook",String(error));return response({error:"webhook_error"},500);}
});
