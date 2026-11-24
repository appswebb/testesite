import {createClient} from "jsr:@supabase/supabase-js@2.57.0";
const origin="https://appswebb.github.io";
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store","Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS"}});
const env=()=>({mode:Deno.env.get("ASAAS_ENVIRONMENT"),key:Deno.env.get("ASAAS_API_KEY"),hook:Deno.env.get("ASAAS_WEBHOOK_TOKEN"),url:Deno.env.get("SUPABASE_URL"),anon:Deno.env.get("SUPABASE_ANON_KEY"),service:Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")});
const configured=e=>e.mode==="sandbox"&&!!e.key&&!!e.hook&&e.hook.length>=32&&!!e.url&&!!e.anon&&!!e.service;
const api=async(e,path,method="GET",body=undefined)=>{
 const r=await fetch("https://api-sandbox.asaas.com/v3"+path,{method,headers:{"access_token":e.key,"Content-Type":"application/json","User-Agent":"CONNECT-Sandbox/1.0"},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)});
 const d=await r.json().catch(()=>null);
 if(!r.ok){const err=new Error("asaas_http_"+r.status);err.http=r.status;throw err;}return d;
};
const uuid=v=>typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const pid=v=>typeof v==="string"&&/^pay_[A-Za-z0-9]+$/.test(v);
const cid=v=>typeof v==="string"&&/^cus_[A-Za-z0-9]+$/.test(v);
const reference=r=>"connect-sandbox:"+r.id;
const table="connect_asaas_test_payments";
async function sync(e,db,row,p){
 if(!p||!pid(p.id)||p.externalReference!==reference(row)||p.customer!==row.customer_id||p.billingType!==row.method||Math.round(Number(p.value)*100)!==row.amount_cents||(row.provider_id&&row.provider_id!==p.id))throw Error("payment_identity_mismatch");
 const status=p.deleted===true?"DELETED":String(p.status||"PENDING");
 if(!/^[A-Z_]{2,60}$/.test(status))throw Error("unknown_payment_status");
 const {error}=await db.from(table).update({status,provider_id:p.id,updated_at:new Date().toISOString()}).eq("id",row.id);if(error)throw Error("db_sync_failed");
 return {status,payment_id:p.id,amount_cents:row.amount_cents,environment:"sandbox",method:row.method};
}
async function result(e,db,row,p){
 const out=await sync(e,db,row,p);
 if(["PENDING","OVERDUE"].includes(out.status)){
  if(row.method==="PIX"){
   try{const q=await api(e,"/payments/"+p.id+"/pixQrCode");out.pix_code=typeof q.payload==="string"&&q.payload.length<3000?q.payload:null;out.pix_qr_base64=typeof q.encodedImage==="string"&&/^[a-zA-Z0-9+/=]+$/.test(q.encodedImage)&&q.encodedImage.length<250000?q.encodedImage:null;out.expiration=q.expirationDate||null;}catch(_){out.qr_unavailable=true;}
  }else{try{const u=new URL(p.invoiceUrl);if(u.protocol==="https:"&&(u.hostname==="sandbox.asaas.com"||u.hostname.endsWith(".asaas.com"))&&!u.username&&!u.password)out.invoice_url=u.href;}catch(_){}}
 }
 return out;
}
async function recover(e,db,row){
 if(row.provider_id)return result(e,db,row,await api(e,"/payments/"+row.provider_id));
 if(!row.customer_id)return {status:row.status,environment:"sandbox"};
 const list=await api(e,"/payments?externalReference="+encodeURIComponent(reference(row))+"&limit=2");
 if(list?.data?.length===1)return result(e,db,row,list.data[0]);
 return {status:row.status,environment:"sandbox"};
}
async function matchToken(a,b){const enc=new TextEncoder(),x=new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(a))),y=new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(b)));let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0;}
Deno.serve(async req=>{
 if(req.method!=="POST")return reply({error:"method_not_allowed"},405);
 const e=env();if(!configured(e))return reply({error:"sandbox_configuration_missing"},503);
 if(!await matchToken(req.headers.get("asaas-access-token")||"",e.hook))return reply({error:"invalid_webhook_token"},401);
 try{
  const b=await req.json(),event=String(b?.event||""),eventId=String(b?.id||""),pay=b?.payment?.id;
  if(!/^PAYMENT_[A-Z_]{1,80}$/.test(event)||!pid(pay)||!eventId||eventId.length>200)return reply({ignored:true});
  const db=createClient(e.url,e.service,{auth:{persistSession:false}});
  const {data:seen,error:ee}=await db.from("connect_asaas_test_events").select("id").eq("id",eventId).maybeSingle();if(ee)throw Error("db_events");if(seen)return reply({duplicate:true});
  const p=await api(e,"/payments/"+pay);
  const ref=String(p?.externalReference||"");if(!ref.startsWith("connect-sandbox:")||!uuid(ref.slice(16)))return reply({ignored:true});
  const {data:row,error:re}=await db.from(table).select("*").eq("id",ref.slice(16)).maybeSingle();if(re)throw Error("db_read");if(!row)return reply({ignored:true});
  await sync(e,db,row,p);
  const {error:ie}=await db.from("connect_asaas_test_events").upsert({id:eventId,provider_id:pay,event},{onConflict:"id",ignoreDuplicates:true});if(ie)throw Error("db_event_write");
  return reply({ok:true,environment:"sandbox"});
 }catch(_){return reply({error:"webhook_retry"},503);}
});