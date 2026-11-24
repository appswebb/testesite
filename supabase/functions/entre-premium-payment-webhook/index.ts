import { createClient } from "jsr:@supabase/supabase-js@2.57.0";
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
const hex=(data:ArrayBuffer)=>[...new Uint8Array(data)].map(x=>x.toString(16).padStart(2,"0")).join("");
async function signatureOk(req:Request,id:string,secret:string){
 const parts=Object.fromEntries((req.headers.get("x-signature")||"").split(",").map(x=>x.trim().split("=")).filter(x=>x.length===2));
 const requestId=req.headers.get("x-request-id")||"";
 const ts=String(parts.ts||""),v1=String(parts.v1||"");
 if(!id||!requestId||!/^[0-9]{10,13}$/.test(ts)||!/^[a-f0-9]{64}$/i.test(v1))return false;
 const millis=Number(ts)*(ts.length===13?1:1000);
 if(Math.abs(Date.now()-millis)>20*60000)return false;
 const manifest="id:"+id.toLowerCase()+";request-id:"+requestId+";ts:"+ts+";";
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const actual=hex(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(manifest)));
 let diff=0;for(let i=0;i<64;i++)diff|=actual.charCodeAt(i)^v1.toLowerCase().charCodeAt(i);
 return diff===0;
}
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return json({error:"method_not_allowed"},405);
 const secret=Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET")||"";
 const access=Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")||"";
 const url=Deno.env.get("SUPABASE_URL")||"";
 const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(!secret||!access||!url||!key)return json({error:"not_configured"},503);
 try{
  const event=await req.json().catch(()=>null);
  const parsed=new URL(req.url);
  const dataId=String(parsed.searchParams.get("data.id")||parsed.searchParams.get("id")||event?.data?.id||"");
  if(!/^[0-9]{5,20}$/.test(dataId))return json({error:"invalid_payment_id"},400);
  if(!await signatureOk(req,dataId,secret))return json({error:"invalid_signature"},401);
  const type=String(event?.type||parsed.searchParams.get("type")||"");
  if(type!=="payment")return json({status:"ignored"});
  const check=await fetch("https://api.mercadopago.com/v1/payments/"+encodeURIComponent(dataId),
    {headers:{"Authorization":"Bearer "+access}});
  if(!check.ok)return json({error:"verification_unavailable"},503);
  const payment=await check.json();
  if(payment.live_mode!==true)return json({status:"test_payment_ignored"});
  if(String(payment.id)!==dataId)return json({error:"payment_mismatch"},409);
  const match=/^connect-premium:([0-9a-f-]{36}):([0-9a-f-]{36})$/i.exec(String(payment.external_reference||""));
  if(!match)return json({status:"ignored"});
  const service=createClient(url,key,{auth:{persistSession:false}});
  const {data:record,error:readError}=await service.from("entre_premium_web_payments")
   .select("id,user_id,amount_cents,status,paid_until").eq("id",match[2]).eq("user_id",match[1]).maybeSingle();
  if(readError||!record)return json({error:"purchase_not_registered"},404);
  if(payment.currency_id!=="BRL"||Math.round(Number(payment.transaction_amount)*100)!==record.amount_cents)
   return json({error:"amount_mismatch"},409);
  const status=String(payment.status||"");
  if(!["approved","pending","in_process","rejected","cancelled"].includes(status))return json({status:"ignored"});
  let paidUntil:string|null=record.paid_until||null;
  if(status==="approved"){
   const at=Date.parse(payment.date_approved||"");
   if(!Number.isFinite(at)||at<Date.now()-45*86400000||at>Date.now()+86400000)return json({error:"invalid_approval_date"},409);
   paidUntil=new Date(at+30*86400000).toISOString();
   const {data:active}=await service.from("entre_premium_subscriptions").select("status,paid_until").eq("user_id",record.user_id).maybeSingle();
   if(active?.status==="authorized"&&active.paid_until&&Date.parse(active.paid_until)>Date.parse(paidUntil))
     paidUntil=active.paid_until;
   const {error:grantError}=await service.from("entre_premium_subscriptions").upsert({
    user_id:record.user_id,provider:"mercadopago_web",provider_id:dataId,status:"authorized",paid_until:paidUntil,
    updated_at:new Date().toISOString()
   },{onConflict:"user_id"});
   if(grantError)return json({error:"activation_failed"},503);
  }
  const {error:updateError}=await service.from("entre_premium_web_payments")
    .update({provider_payment_id:dataId,status,paid_until:paidUntil,updated_at:new Date().toISOString()})
    .eq("id",record.id).eq("user_id",record.user_id);
  if(updateError)return json({error:"update_failed"},503);
  return json({status:status==="approved"?"premium_confirmed":status});
 }catch(error){console.error("premium-payment-webhook",String(error));return json({error:"webhook_failure"},500);}
});
