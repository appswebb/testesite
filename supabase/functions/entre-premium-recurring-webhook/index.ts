import {createClient} from "jsr:@supabase/supabase-js@2.57.0";
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
const hex=(a:ArrayBuffer)=>[...new Uint8Array(a)].map(v=>v.toString(16).padStart(2,"0")).join("");
async function signed(req:Request,id:string,secret:string){
 const parts=Object.fromEntries((req.headers.get("x-signature")||"").split(",").map(x=>x.trim().split("=")).filter(x=>x.length===2));
 const rid=req.headers.get("x-request-id")||"",ts=String(parts.ts||""),v1=String(parts.v1||"");
 if(!id||!rid||!/^[0-9]{10,13}$/.test(ts)||!/^[a-f0-9]{64}$/i.test(v1))return false;
 const millis=Number(ts)*(ts.length===13?1:1000);
 if(Math.abs(Date.now()-millis)>20*60000)return false;
 const manifest="id:"+id.toLowerCase()+";request-id:"+rid+";ts:"+ts+";";
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const actual=hex(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(manifest)));
 let diff=0;for(let i=0;i<64;i++)diff|=actual.charCodeAt(i)^v1.toLowerCase().charCodeAt(i);
 return diff===0;
}
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return json({error:"method_not_allowed"},405);
 const url=Deno.env.get("SUPABASE_URL")||"",secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 const access=Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")||"",signature=Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET")||"";
 if(!url||!secret||!access||!signature)return json({error:"not_configured"},503);
 try{
  const event=await req.json().catch(()=>({})),params=new URL(req.url).searchParams;
  const id=String(params.get("data.id")||params.get("id")||event?.data?.id||"");
  const type=String(event?.type||params.get("type")||"");
  if(!/^[a-zA-Z0-9_-]{5,80}$/.test(id))return json({error:"invalid_id"},400);
  if(!await signed(req,id,signature))return json({error:"invalid_signature"},401);
  if(!["subscription_preapproval","subscription_authorized_payment"].includes(type))return json({status:"ignored"});
  const endpoint=type==="subscription_authorized_payment"?"/authorized_payments/":"/preapproval/";
  const response=await fetch("https://api.mercadopago.com"+endpoint+encodeURIComponent(id),{headers:{"Authorization":"Bearer "+access}});
  if(!response.ok)return json({error:"provider_verification_failed"},503);
  const resource=await response.json();
  if(String(resource.id)!==id)return json({error:"mismatched_id"},409);
  const preapproval=type==="subscription_preapproval"?id:String(resource.preapproval_id||"");
  if(!preapproval)return json({status:"ignored"});
  const service=createClient(url,secret,{auth:{persistSession:false}});
  const {data:record,error:readError}=await service.from("entre_premium_recurring").select("*").eq("preapproval_id",preapproval).maybeSingle();
  if(readError)return json({error:"record_unavailable"},503);
  if(!record)return json({status:"ignored"});
  if(type==="subscription_preapproval"){
   if(resource.external_reference!=="entre-recurring:"+record.user_id+":"+record.id)return json({error:"reference_mismatch"},409);
   if(["cancelled","paused"].includes(resource.status)){
    await service.from("entre_premium_recurring").update({status:resource.status,updated_at:new Date().toISOString()}).eq("id",record.id);
   }
   return json({status:"subscription_checked"});
  }
  if(record.status==="cancelled")return json({status:"already_cancelled"});
  if(resource.preapproval_id!==record.preapproval_id||resource.currency_id!=="BRL"||
   Math.round(Number(resource.transaction_amount)*100)!==record.amount_cents)return json({error:"invoice_mismatch"},409);
  if(resource.payment?.status!=="approved")return json({status:"invoice_unpaid"});
  const date=resource.debit_date;
  if(!date||!Number.isFinite(Date.parse(date)))return json({error:"invoice_date_invalid"},409);
  const {data:applied,error:applyError}=await service.rpc("entre_premium_recurring_apply",{
   _preapproval:record.preapproval_id,_invoice:String(resource.id),_debit:date,_amount_cents:record.amount_cents
  });
  if(applyError)return json({error:"grant_unavailable"},503);
  return json({status:applied?"approved_payment_confirmed":"invoice_not_eligible"});
 }catch(e){console.error("premium-recurring-webhook",String(e));return json({error:"webhook_unavailable"},503)}
});