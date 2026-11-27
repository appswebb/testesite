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
async function handle(req: Request){
 if(req.method==="OPTIONS")return reply({},200);if(req.method!=="POST")return reply({error:"method_not_allowed"},405);
 const e=env();if(!configured(e))return reply({error:"production_configuration_missing"},503);
 try{
  const token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"");if(!token)return reply({error:"unauthorized"},401);
  const auth=createClient(e.url,e.anon,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false}});
  const {data:{user},error:ue}=await auth.auth.getUser(token);if(ue||!user?.email||!user.email_confirmed_at)return reply({error:"unauthorized"},401);
  const [ban,maintenance]=await Promise.all([auth.rpc("entre_is_banned"),auth.rpc("entre_maintenance_active")]);if(ban.error||maintenance.error||ban.data===true||maintenance.data===true)return reply({error:"account_unavailable"},403);
  const db=createClient(e.url,e.service,{auth:{persistSession:false}});const body=await req.json();const action=body?.action;
  const {data:settings,error:se}=await db.from("entre_premium_settings").select("monthly_price_cents,enabled").eq("id",1).single();if(se)return reply({error:"settings_unavailable"},503);
  const cents=Number(settings.monthly_price_cents);if(!Number.isInteger(cents)||cents<100||cents>1000000)return reply({error:"invalid_price"},503);
  if(action==="config"){return reply({enabled:settings.enabled===true,environment:"production",price_cents:cents});}
  const {data:row,error:re}=await db.from(table).select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(1).maybeSingle();if(re)throw Error("db_read_failed");
  if(action==="status")return reply(row?await recover(e,db,row):{status:"none",environment:"production"});
  if(action!=="pay")return reply({error:"invalid_action"},400);
  if(settings.enabled!==true)return reply({error:"settings_unavailable"},503);
  if(row&&!["CONFIRMED","RECEIVED","REFUNDED","REFUND_REQUESTED","REFUND_IN_PROGRESS","PARTIALLY_REFUNDED","CHARGEBACK_REQUESTED","CHARGEBACK_DISPUTE","AWAITING_CHARGEBACK_REVERSAL","DELETED","ERROR","RECEIVED_IN_CASH"].includes(row.status)){const prior=await recover(e,db,row);if(!["EXPIRED","DELETED","ERROR"].includes(prior.status))return reply(prior);}
  const name=String(body.name||"").trim().slice(0,120),doc=String(body.cpf_cnpj||"").replace(/\D/g,""),method=body.method;
  if(!uuid(body.request_id)||name.length<3||![11,14].includes(doc.length)||!["PIX","CREDIT_CARD"].includes(method))return reply({error:"invalid_buyer_data"},400);
  const reservation={id:body.request_id,user_id:user.id,amount_cents:cents,method,status:"creating"};
  const {data:reserved,error:ie}=await db.rpc("connect_asaas_reserve",{_id:reservation.id,_user:user.id,_cents:cents,_method:method});if(ie||reserved!==true)return reply({error:"pending_or_duplicate"},409);
  let customer;
  try{
   const ref="connect-asaas-user:"+user.id;
   const list=await api(e,"/customers?externalReference="+encodeURIComponent(ref)+"&limit=2");
   if(list?.data?.length>1)throw Error("duplicate_customer");
   customer=list?.data?.[0];if(customer&&String(customer.cpfCnpj||"").replace(/\D/g,"")!==doc)throw Error("customer_document_mismatch");
   if(!customer)customer=await api(e,"/customers","POST",{name,cpfCnpj:doc,email:user.email,externalReference:ref,notificationDisabled:true});
   if(!cid(customer?.id))throw Error("customer_creation_failed");
  }catch(err){await db.from(table).update({status:"ERROR"}).eq("id",reservation.id);throw err;}
  const {error:ce}=await db.from(table).update({customer_id:customer.id}).eq("id",reservation.id);if(ce)throw Error("db_customer_failed");
  const {data:stored,error:storedError}=await db.from(table).select("created_at").eq("id",reservation.id).single();if(storedError||!stored?.created_at)throw Error("db_read_failed");
  const full={...reservation,customer_id:customer.id,created_at:stored.created_at};
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());const part=t=>parts.find(p=>p.type===t)?.value;const due=part("year")+"-"+part("month")+"-"+part("day");
  let payment;
  try{payment=await api(e,"/payments","POST",{customer:customer.id,billingType:method,value:cents/100,dueDate:due,description:"CONNECT Premium - 30 dias",externalReference:reference(full)});}
  catch(err){if([400,401,403,422].includes(err.http))await db.from(table).update({status:"ERROR"}).eq("id",full.id);err.stage="create_payment";throw err;}
  return reply(await result(e,db,full,payment));
 }catch(err){const code=String(err.message||"production_failure");const safe=/^[a-z0-9_]{1,80}$/.test(code)?code:"production_failure";const codes=Array.isArray(err.codes)?err.codes:[];console.warn("asaas_production",safe,err.stage||"",codes.join(","));return reply({error:safe,provider_codes:codes,stage:err.stage||null},502);}
}
const allowedOrigins=new Set(["https://joinconnectbr.vercel.app","https://connectbr.online","https://www.connectbr.online","https://appswebb.github.io"]);
Deno.serve(async req=>{const origin=req.headers.get("origin");if(origin&&!allowedOrigins.has(origin))return new Response(JSON.stringify({error:"origin_not_allowed"}),{status:403,headers:{"Content-Type":"application/json","Cache-Control":"no-store","Vary":"Origin"}});const res=await handle(req);const headers=new Headers(res.headers);headers.set("Vary","Origin");if(origin)headers.set("Access-Control-Allow-Origin",origin);else headers.delete("Access-Control-Allow-Origin");return new Response(res.body,{status:res.status,headers});});
