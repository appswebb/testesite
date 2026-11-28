import {createClient} from "jsr:@supabase/supabase-js@2.57.0";
const origin="https://appswebb.github.io";
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store","Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS"}});
const env=()=>({mode:Deno.env.get("ASAAS_ENVIRONMENT"),key:Deno.env.get("ASAAS_API_KEY"),hook:Deno.env.get("ASAAS_WEBHOOK_TOKEN"),url:Deno.env.get("SUPABASE_URL"),anon:Deno.env.get("SUPABASE_ANON_KEY"),service:Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")});
const configured=e=>e.mode==="production"&&!!e.key&&!!e.hook&&e.hook.length>=32&&!!e.url&&!!e.anon&&!!e.service;
const api=async(e,path,method="GET",body=undefined)=>{
 const r=await fetch("https://api.asaas.com/v3"+path,{method,headers:{"access_token":e.key,"Content-Type":"application/json","User-Agent":"CONNECT/1.0"},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)});
 const d=await r.json().catch(()=>null);
 if(!r.ok){const err=new Error("asaas_http_"+r.status);err.http=r.status;err.codes=Array.isArray(d?.errors)?d.errors.map(x=>String(x?.code||"")).filter(x=>/^[a-zA-Z0-9_-]{1,80}$/.test(x)).slice(0,5):[];throw err;}return d;
};
const uuid=v=>typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const pid=v=>typeof v==="string"&&/^pay_[A-Za-z0-9_]+$/.test(v);
const cid=v=>typeof v==="string"&&/^cus_[A-Za-z0-9_]+$/.test(v);
const reference=r=>"connect-asaas:"+r.id;
const table="connect_asaas_payments";
const ttl=30*60000;
const expiresAt=row=>new Date(Date.parse(row.created_at)+ttl).toISOString();
const expired=row=>Number.isFinite(Date.parse(row.created_at))&&Date.now()>=Date.parse(row.created_at)+ttl;
const cancellable=s=>["PENDING","OVERDUE","creating"].includes(s);
const identity=(row,p)=>p&&pid(p.id)&&p.externalReference===reference(row)&&p.customer===row.customer_id&&p.billingType===row.method&&Math.round(Number(p.value)*100)===row.amount_cents&&(!row.provider_id||row.provider_id===p.id);
async function sync(e,db,row,p){
 if(!p||!pid(p.id)||p.externalReference!==reference(row)||p.customer!==row.customer_id||p.billingType!==row.method||Math.round(Number(p.value)*100)!==row.amount_cents||(row.provider_id&&row.provider_id!==p.id))throw Error("payment_identity_mismatch");
 const status=p.deleted===true?"DELETED":String(p.status||"PENDING");
 if(!/^[A-Z_]{2,60}$/.test(status))throw Error("unknown_payment_status");
 const {data:ok,error}=await db.rpc("connect_asaas_sync",{_id:row.id,_provider:p.id,_customer:p.customer,_amount:Math.round(Number(p.value)*100),_method:p.billingType,_status:status});if(error||ok!==true)throw Error("db_sync_failed");
 return {status,payment_id:p.id,amount_cents:row.amount_cents,environment:"production",method:row.method,expires_at:expiresAt(row)};
}
async function result(e,db,row,p){
 const out=await sync(e,db,row,p);
 if(["PENDING","OVERDUE"].includes(out.status)&&!expired(row)){
  if(row.method==="PIX"){
   try{const q=await api(e,"/payments/"+p.id+"/pixQrCode");out.pix_code=typeof q.payload==="string"&&q.payload.length<3000?q.payload:null;out.pix_qr_base64=typeof q.encodedImage==="string"&&/^[a-zA-Z0-9+/=]+$/.test(q.encodedImage)&&q.encodedImage.length<250000?q.encodedImage:null;out.expiration=q.expirationDate||null;}catch(_){out.qr_unavailable=true;}
  }else{try{const u=new URL(p.invoiceUrl);if(u.protocol==="https:"&&(u.hostname==="asaas.com"||u.hostname==="www.asaas.com")&&!u.username&&!u.password)out.invoice_url=u.href;}catch(_){}}
 }
 return out;
}
async function recover(e,db,row){
 if(row.status==="DELETED"||row.status==="ERROR")return {status:row.status==="DELETED"&&expired(row)?"EXPIRED":row.status,environment:"production",expires_at:expiresAt(row)};
 let payment=null;
 if(row.provider_id)payment=await api(e,"/payments/"+row.provider_id);
 else if(row.customer_id){
  const list=await api(e,"/payments?externalReference="+encodeURIComponent(reference(row))+"&limit=2");
  if(list?.data?.length>1||list?.hasMore)throw Error("duplicate_provider_payment");
  payment=list?.data?.[0]||null;
 }
 if(!payment){
  if(expired(row)&&row.status==="creating"&&!row.provider_id){
   const {data,error}=await db.from(table).update({status:"ERROR",updated_at:new Date().toISOString()}).eq("id",row.id).eq("status","creating").is("provider_id",null).select("id").maybeSingle();
   if(error||!data)throw Error("expiration_retry");
   return {status:"EXPIRED",environment:"production",expires_at:expiresAt(row)};
  }
  return {status:row.status,environment:"production",expires_at:expiresAt(row)};
 }
 if(!identity(row,payment))throw Error("payment_identity_mismatch");
 if(expired(row)&&payment.deleted!==true&&["PENDING","OVERDUE"].includes(payment.status)){
  try{
   const removed=await api(e,"/payments/"+payment.id,"DELETE");
   if(removed?.deleted!==true||String(removed.id)!==payment.id)throw Error("expiration_retry");
  }catch(err){
   const current=await api(e,"/payments/"+payment.id);
   if(!identity(row,current))throw Error("payment_identity_mismatch");
   if(current.deleted!==true&&["PENDING","OVERDUE"].includes(current.status))throw err;
   return result(e,db,row,current);
  }
  // Only the verified provider deletion releases a pending invoice.
  const out=await sync(e,db,row,{...payment,deleted:true});
  return {...out,status:"EXPIRED"};
 }
 const out=await result(e,db,row,payment);
 if(out.status==="DELETED"&&expired(row))out.status="EXPIRED";
 return out;
}
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

Deno.serve(async req=>{
 if(req.method!=="POST")return reply({error:"method_not_allowed"},405);
 const e=env();if(!configured(e))return reply({error:"production_configuration_missing"},503);
 try{
  const secret=req.headers.get("x-connect-expire-token");if(!secret||secret.length!==64)return reply({error:"unauthorized"},401);
  const db=createClient(e.url,e.service,{auth:{persistSession:false}});
  const {data:allowed,error:authError}=await db.rpc("connect_asaas_expiry_authorize",{_token:secret});if(authError||allowed!==true)return reply({error:"unauthorized"},401);
  const {data:rows,error}=await db.from(table).select("*").in("status",["creating","PENDING","OVERDUE"]).lt("updated_at",new Date(Date.now()-120000).toISOString()).order("updated_at",{ascending:true}).limit(5);
  if(error)throw Error("db_read_failed");let done=0,failed=0;
  for(const row of rows||[]){try{await recover(e,db,row);done++;}catch(err){failed++;console.warn("asaas_reconciliation_retry",String(err.message||"failed"));}finally{await db.from(table).update({updated_at:new Date().toISOString()}).eq("id",row.id).in("status",["creating","PENDING","OVERDUE"]);}}
  let recurringChecked=0;
  const now=Date.now();
  const {data:pending,error:pe}=await db.from(rt).select("*").in("status",["open"]).lt("updated_at",new Date(now-120000).toISOString()).order("updated_at",{ascending:true}).limit(2);
  const {data:active,error:ae}=await db.from(rt).select("*").eq("status","active").lt("updated_at",new Date(now-6*3600000).toISOString()).order("updated_at",{ascending:true}).limit(1);
  if(pe||ae)throw Error("recurring_db_read_failed");
  for(const row of [...(pending||[]),...(active||[])]){
   try{await reconcile(e,db,row);recurringChecked++;}
   catch(err){failed++;console.warn("asaas_recurring_reconciliation_retry",String(err.message||"failed"));}
   finally{await db.from(rt).update({updated_at:new Date().toISOString()}).eq("id",row.id).in("status",["open","active"]);}
  }
  return reply({checked:done,recurring_checked:recurringChecked,failed},failed?503:200);
 }catch(err){console.warn("asaas_expiration_worker",String(err.message||"failed"));return reply({error:"expiration_worker_failed"},503);}
});