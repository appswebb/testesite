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
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return reply({},200);if(req.method!=="POST")return reply({error:"method_not_allowed"},405);
 const e=env();if(!configured(e))return reply({error:"sandbox_configuration_missing"},503);
 try{
  const token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"");if(!token)return reply({error:"unauthorized"},401);
  const auth=createClient(e.url,e.anon,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false}});
  const {data:{user},error:ue}=await auth.auth.getUser(token);if(ue||!user?.email||!user.email_confirmed_at)return reply({error:"unauthorized"},401);
  const {data:admin,error:ae}=await auth.rpc("entre_admin_check");if(ae||admin!==true)return reply({error:"admin_only"},403);
  const db=createClient(e.url,e.service,{auth:{persistSession:false}});const body=await req.json();const action=body?.action;
  const {data:settings,error:se}=await db.from("entre_premium_settings").select("monthly_price_cents").eq("id",1).single();if(se)return reply({error:"settings_unavailable"},503);
  const cents=Number(settings.monthly_price_cents);if(!Number.isInteger(cents)||cents<100||cents>1000000)return reply({error:"invalid_price"},503);
  if(action==="config"){await api(e,"/customers?limit=1");return reply({enabled:true,environment:"sandbox",price_cents:cents});}
  const {data:row,error:re}=await db.from(table).select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(1).maybeSingle();if(re)throw Error("db_read_failed");
  if(action==="status")return reply(row?await recover(e,db,row):{status:"none",environment:"sandbox"});
  if(action!=="pay")return reply({error:"invalid_action"},400);
  if(row&&["creating","PENDING","AWAITING_RISK_ANALYSIS","AUTHORIZED","OVERDUE"].includes(row.status))return reply(await recover(e,db,row));
  const name=String(body.name||"").trim().slice(0,120),doc=String(body.cpf_cnpj||"").replace(/\D/g,""),method=body.method;
  if(!uuid(body.request_id)||name.length<3||![11,14].includes(doc.length)||!["PIX","CREDIT_CARD"].includes(method))return reply({error:"invalid_buyer_data"},400);
  const reservation={id:body.request_id,user_id:user.id,amount_cents:cents,method,status:"creating"};
  const {error:ie}=await db.from(table).insert(reservation);if(ie)return reply({error:"pending_or_duplicate"},409);
  let customer;
  try{
   const ref="connect-sandbox-user:"+user.id;
   const list=await api(e,"/customers?externalReference="+encodeURIComponent(ref)+"&limit=2");
   if(list?.data?.length>1)throw Error("duplicate_customer");
   customer=list?.data?.[0];if(customer&&String(customer.cpfCnpj||"").replace(/\D/g,"")!==doc)throw Error("customer_document_mismatch");
   if(!customer)customer=await api(e,"/customers","POST",{name,cpfCnpj:doc,email:user.email,externalReference:ref,notificationDisabled:true});
   if(!cid(customer?.id))throw Error("customer_creation_failed");
  }catch(err){await db.from(table).update({status:"ERROR"}).eq("id",reservation.id);throw err;}
  const {error:ce}=await db.from(table).update({customer_id:customer.id}).eq("id",reservation.id);if(ce)throw Error("db_customer_failed");
  const full={...reservation,customer_id:customer.id};
  const due=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  let payment;
  try{payment=await api(e,"/payments","POST",{customer:customer.id,billingType:method,value:cents/100,dueDate:due,description:"CONNECT Premium - TESTE 30 dias",externalReference:reference(full)});}
  catch(err){if([400,401,403,422].includes(err.http))await db.from(table).update({status:"ERROR"}).eq("id",full.id);throw err;}
  return reply(await result(e,db,full,payment));
 }catch(err){const code=String(err.message||"sandbox_failure");console.warn("asaas_sandbox",/^[a-z0-9_]{1,80}$/.test(code)?code:"sandbox_failure");return reply({error:/^[a-z0-9_]{1,80}$/.test(code)?code:"sandbox_failure"},502);}
});