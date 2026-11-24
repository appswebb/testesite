import {createClient} from "jsr:@supabase/supabase-js@2.57.0";
const origin="https://appswebb.github.io";
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store","Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS"}});
const env=()=>({mode:Deno.env.get("ASAAS_ENVIRONMENT"),key:Deno.env.get("ASAAS_API_KEY"),hook:Deno.env.get("ASAAS_WEBHOOK_TOKEN"),url:Deno.env.get("SUPABASE_URL"),anon:Deno.env.get("SUPABASE_ANON_KEY"),service:Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")});
const configured=e=>e.mode==="production"&&!!e.key&&!!e.hook&&e.hook.length>=32&&!!e.url&&!!e.anon&&!!e.service;
const api=async(e,path,method="GET",body=undefined)=>{
 const r=await fetch("https://api.asaas.com/v3"+path,{method,headers:{"access_token":e.key,"Content-Type":"application/json","User-Agent":"CONNECT/1.0"},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)});
 const d=await r.json().catch(()=>null);
 if(!r.ok){const err=new Error("asaas_http_"+r.status);err.http=r.status;throw err;}return d;
};
const uuid=v=>typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const pid=v=>typeof v==="string"&&/^pay_[A-Za-z0-9_]+$/.test(v);
const cid=v=>typeof v==="string"&&/^cus_[A-Za-z0-9_]+$/.test(v);
const reference=r=>"connect-asaas:"+r.id;
const table="connect_asaas_payments";
const sid=v=>typeof v==="string"&&/^sub_[A-Za-z0-9_]+$/.test(v);
const rt="connect_asaas_recurring";
const recRef=r=>"connect-monthly:"+r.id;
const checkoutUrl=id=>"https://asaas.com/checkoutSession/show?id="+encodeURIComponent(id);
const good=["creating","open","active"];
async function lookup(db,key,value){if(!value)return null;const {data,error}=await db.from(rt).select("*").eq(key,value).maybeSingle();if(error)throw Error("recurring_lookup_failed");return data;}
async function updateRec(db,id,patch,allowed){let q=db.from(rt).update({...patch,updated_at:new Date().toISOString()}).eq("id",id);if(allowed)q=q.in("status",allowed);const {error}=await q;if(error)throw Error("recurring_update_failed");}
async function verifyCharge(e,db,p,row=null){
 if(!sid(p?.subscription)||!pid(p?.id))return false;
 if(!row)row=await lookup(db,"subscription_id",p.subscription)||await lookup(db,"checkout_id",p.checkoutSession);
 let sub=null;
 if(!row||!row.subscription_id){
  sub=await api(e,"/subscriptions/"+p.subscription);
  if(!row)row=await lookup(db,"checkout_id",sub?.checkoutSession);
 }
 if(!row)return false;
 if(p.billingType!=="CREDIT_CARD"||!cid(p.customer)||Math.round(Number(p.value)*100)!==row.amount_cents||!/^\d{4}-\d{2}-\d{2}$/.test(p.dueDate||""))throw Error("recurring_charge_identity");
 if(!row.subscription_id&&(!sub||sub.id!==p.subscription||sub.checkoutSession!==row.checkout_id||sub.customer!==p.customer||sub.cycle!=="MONTHLY"||Math.round(Number(sub.value)*100)!==row.amount_cents))throw Error("recurring_subscription_identity");
 const status=p.deleted===true?"DELETED":String(p.status||"");
 if(!/^[A-Z_]{2,60}$/.test(status))throw Error("recurring_invalid_status");
 const {data,error}=await db.rpc("connect_asaas_recurring_sync",{_id:row.id,_checkout:row.checkout_id,_subscription:p.subscription,_customer:p.customer,_payment:p.id,_cents:row.amount_cents,_due:p.dueDate,_status:status});
 if(error||data!==true)throw Error("recurring_sync_failed");return true;
}
async function reconcile(e,db,row){
 if(!row)return null;
 if(row.checkout_id||row.subscription_id){
  const query=row.subscription_id?"subscription="+encodeURIComponent(row.subscription_id):"checkoutSession="+encodeURIComponent(row.checkout_id);
  const list=await api(e,"/payments?"+query+"&limit=10");
  if(!Array.isArray(list?.data))throw Error("recurring_payment_list_failed");
  for(const item of list.data){if(!pid(item.id))continue;const pay=await api(e,"/payments/"+item.id);await verifyCharge(e,db,pay,row);row=await lookup(db,"id",row.id);}
 }
 if(row.subscription_id&&row.status==="active"){
  try{const sub=await api(e,"/subscriptions/"+row.subscription_id);if(sub?.id===row.subscription_id&&(sub.deleted===true||["INACTIVE","EXPIRED"].includes(sub.status)))await updateRec(db,row.id,{status:"cancelled"},["active"]);}
  catch(err){if(err.http!==404)throw err;}
 }
 // A checkout's 30-minute validity is controlled by Asaas. A 5-minute grace
 // period plus an authoritative charge lookup prevents replacing live checkouts.
 if(["creating","open"].includes(row.status)&&Date.now()-Date.parse(row.created_at)>35*60000)await updateRec(db,row.id,{status:"expired"},["creating","open"]);
 return await lookup(db,"id",row.id);
}
const view=row=>row?{status:row.status,amount_cents:row.amount_cents,checkout_url:row.status==="open"&&uuid(row.checkout_id)?checkoutUrl(row.checkout_id):null,can_cancel:["open","active"].includes(row.status),expires_at:new Date(Date.parse(row.created_at)+30*60000).toISOString()}:{status:"none"};

async function sync(e,db,row,p){
 if(!p||!pid(p.id)||p.externalReference!==reference(row)||p.customer!==row.customer_id||p.billingType!==row.method||Math.round(Number(p.value)*100)!==row.amount_cents||(row.provider_id&&row.provider_id!==p.id))throw Error("payment_identity_mismatch");
 const status=p.deleted===true?"DELETED":String(p.status||"PENDING");
 if(!/^[A-Z_]{2,60}$/.test(status))throw Error("unknown_payment_status");
 const {data:ok,error}=await db.rpc("connect_asaas_sync",{_id:row.id,_provider:p.id,_customer:p.customer,_amount:Math.round(Number(p.value)*100),_method:p.billingType,_status:status});if(error||ok!==true)throw Error("db_sync_failed");
 return {status,payment_id:p.id,amount_cents:row.amount_cents,environment:"production",method:row.method};
}
async function result(e,db,row,p){
 const out=await sync(e,db,row,p);
 if(["PENDING","OVERDUE"].includes(out.status)){
  if(row.method==="PIX"){
   try{const q=await api(e,"/payments/"+p.id+"/pixQrCode");out.pix_code=typeof q.payload==="string"&&q.payload.length<3000?q.payload:null;out.pix_qr_base64=typeof q.encodedImage==="string"&&/^[a-zA-Z0-9+/=]+$/.test(q.encodedImage)&&q.encodedImage.length<250000?q.encodedImage:null;out.expiration=q.expirationDate||null;}catch(_){out.qr_unavailable=true;}
  }else{try{const u=new URL(p.invoiceUrl);if(u.protocol==="https:"&&(u.hostname==="asaas.com"||u.hostname==="www.asaas.com")&&!u.username&&!u.password)out.invoice_url=u.href;}catch(_){}}
 }
 return out;
}
async function recover(e,db,row){
 if(row.provider_id)return result(e,db,row,await api(e,"/payments/"+row.provider_id));
 if(!row.customer_id)return {status:row.status,environment:"production"};
 const list=await api(e,"/payments?externalReference="+encodeURIComponent(reference(row))+"&limit=2");
 if(list?.data?.length===1)return result(e,db,row,list.data[0]);
 return {status:row.status,environment:"production"};
}
async function matchToken(a,b){const enc=new TextEncoder(),x=new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(a))),y=new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(b)));let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0;}
Deno.serve(async req=>{
 if(req.method!=="POST")return reply({error:"method_not_allowed"},405);
 const e=env();if(!configured(e))return reply({error:"production_configuration_missing"},503);
 if(!await matchToken(req.headers.get("asaas-access-token")||"",e.hook))return reply({error:"invalid_webhook_token"},401);
 try{
  const b=await req.json(),event=String(b?.event||""),eventId=String(b?.id||""),pay=b?.payment?.id;
  if(!eventId||eventId.length>200)return reply({ignored:true});
  const db=createClient(e.url,e.service,{auth:{persistSession:false}});
  const {data:seen,error:ee}=await db.from("connect_asaas_events").select("id").eq("id",eventId).maybeSingle();if(ee)throw Error("db_events");if(seen)return reply({duplicate:true});
  if(/^CHECKOUT_(CREATED|PAID|CANCELED|EXPIRED)$/.test(event)){
   const co=b.checkout;if(!uuid(co?.id))return reply({ignored:true});
   let row=await lookup(db,"checkout_id",co.id);
   const ref=String(co.externalReference||"");if(!row&&ref.startsWith("connect-monthly:")&&uuid(ref.slice(16)))row=await lookup(db,"id",ref.slice(16));
   if(!row)return reply({ignored:true});
   if(row.checkout_id&&row.checkout_id!==co.id)throw Error("checkout_mismatch");
   if(!row.checkout_id){await updateRec(db,row.id,{checkout_id:co.id,status:"open"},["creating"]);row=await lookup(db,"id",row.id);}
   if(event==="CHECKOUT_PAID"){await reconcile(e,db,row);}
   if(event==="CHECKOUT_CANCELED"||event==="CHECKOUT_EXPIRED"){row=await reconcile(e,db,row);if(!row.subscription_id)await updateRec(db,row.id,{status:event==="CHECKOUT_CANCELED"?"cancelled":"expired"},["creating","open","expired"]);}
   return reply({ok:true});
  }
  if(/^SUBSCRIPTION_[A-Z_]+$/.test(event)&&sid(b?.subscription?.id)){
   const row=await lookup(db,"subscription_id",b.subscription.id)||await lookup(db,"checkout_id",b.subscription.checkoutSession);
   if(row)await reconcile(e,db,row);return reply({ok:true});
  }
  if(!/^PAYMENT_[A-Z_]{1,80}$/.test(event)||!pid(pay))return reply({ignored:true});
  const p=await api(e,"/payments/"+pay);
  if(await verifyCharge(e,db,p)){
   const {error:ie}=await db.from("connect_asaas_events").upsert({id:eventId,provider_id:pay,event},{onConflict:"id",ignoreDuplicates:true});if(ie)throw Error("db_event_write");
   return reply({ok:true,recurring:true});
  }
  const ref=String(p?.externalReference||"");if(!ref.startsWith("connect-asaas:")||!uuid(ref.slice(14)))return reply({ignored:true});
  const {data:row,error:re}=await db.from(table).select("*").eq("id",ref.slice(14)).maybeSingle();if(re)throw Error("db_read");if(!row)return reply({ignored:true});
  await sync(e,db,row,p);
  const {error:ie}=await db.from("connect_asaas_events").upsert({id:eventId,provider_id:pay,event},{onConflict:"id",ignoreDuplicates:true});if(ie)throw Error("db_event_write");
  return reply({ok:true,environment:"production"});
 }catch(_){return reply({error:"webhook_retry"},503);}
});