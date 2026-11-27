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
const sid=v=>typeof v==="string"&&/^sub_[A-Za-z0-9_]+$/.test(v);
const pid=v=>typeof v==="string"&&/^pay_[A-Za-z0-9_]+$/.test(v);
const cid=v=>typeof v==="string"&&/^cus_[A-Za-z0-9_]+$/.test(v);
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
async function handle(req: Request){
 if(req.method==="OPTIONS")return reply({});if(req.method!=="POST")return reply({error:"method_not_allowed"},405);
 const e=env();if(!configured(e))return reply({error:"production_configuration_missing"},503);
 try{
  const token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"");if(!token)return reply({error:"unauthorized"},401);
  const auth=createClient(e.url,e.anon,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false}});
  const {data:{user},error:ue}=await auth.auth.getUser(token);if(ue||!user?.email_confirmed_at)return reply({error:"unauthorized"},401);
  const db=createClient(e.url,e.service,{auth:{persistSession:false}}),body=await req.json(),action=body?.action;
  const {data:initial,error:re}=await db.from(rt).select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(1).maybeSingle();if(re)throw Error("recurring_lookup_failed");
  let row=initial;
  if(action==="status")return reply(view(await reconcile(e,db,row)));
  if(action==="cancel"){
   if(!row||!good.includes(row.status))return reply(view(row));
   row=await reconcile(e,db,row);
   if(!row||!good.includes(row.status))return reply(view(row));
   if(row.subscription_id){
    const sub=await api(e,"/subscriptions/"+row.subscription_id);
    if(sub.id!==row.subscription_id||sub.customer!==row.customer_id||sub.cycle!=="MONTHLY")throw Error("recurring_subscription_identity");
    if(sub.deleted!==true){const removed=await api(e,"/subscriptions/"+row.subscription_id,"DELETE");if(removed?.deleted!==true||removed.id!==row.subscription_id)throw Error("recurring_cancel_unconfirmed");}
   }else if(row.checkout_id){
    await api(e,"/checkouts/"+row.checkout_id+"/cancel","POST");
    row=await reconcile(e,db,row);if(row.subscription_id)throw Error("recurring_cancel_retry");
   }else return reply({error:"recurring_creation_in_progress"},409);
   await updateRec(db,row.id,{status:"cancelled"},good);return reply(view(await lookup(db,"id",row.id)));
  }
  if(action!=="start"||body.consent!==true||!uuid(body.request_id))return reply({error:"invalid_consent_or_request"},400);
  const [ban,maintenance]=await Promise.all([auth.rpc("entre_is_banned"),auth.rpc("entre_maintenance_active")]);if(ban.error||maintenance.error||ban.data===true||maintenance.data===true)return reply({error:"account_unavailable"},403);
  if(row&&good.includes(row.status)){row=await reconcile(e,db,row);if(good.includes(row.status))return reply(view(row));}
  const {data:settings,error:se}=await db.from("entre_premium_settings").select("monthly_price_cents,enabled,asaas_recurring_enabled").eq("id",1).single();
  const cents=Number(settings?.monthly_price_cents);if(se||!settings?.enabled||!Number.isInteger(cents)||cents<100||cents>1000000)return reply({error:"settings_unavailable"},503);
  if(settings.asaas_recurring_enabled!==true)return reply({error:"recurring_provider_unavailable"},503);
  if(Number(body.amount_cents)!==cents)return reply({error:"price_changed"},409);
  const {data:ok,error:ie}=await db.rpc("connect_asaas_recurring_reserve",{_id:body.request_id,_user:user.id,_cents:cents});if(ie||ok!==true)return reply({error:"pending_or_duplicate"},409);
  const ref=recRef({id:body.request_id});
  const callbackOrigin=req.headers.get("origin");const callbackBase=callbackOrigin==="https://appswebb.github.io"?callbackOrigin+"/testesite":(callbackOrigin==="https://www.connectbr.online"||callbackOrigin==="https://joinconnectbr.vercel.app")?callbackOrigin:"https://connectbr.online";
  const base=callbackBase+"/checkout.html?"+(body.onboarding===true?"onboarding=1&":"")+"result=";
  const date=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  let checkout;
  try{checkout=await api(e,"/checkouts","POST",{billingTypes:["CREDIT_CARD"],chargeTypes:["RECURRENT"],minutesToExpire:30,externalReference:ref,callback:{successUrl:base+"success",cancelUrl:base+"cancel",expiredUrl:base+"expired"},items:[{name:"CONNECT Premium",description:"Assinatura mensal com renovação automática até cancelamento",quantity:1,value:cents/100}],subscription:{cycle:"MONTHLY",nextDueDate:date+" 00:00:00"}});}
  catch(err){if([400,401,403,422].includes(err.http))await updateRec(db,body.request_id,{status:"error"},["creating"]);throw err;}
  if(!uuid(checkout?.id))throw Error("recurring_checkout_identity");
  await updateRec(db,body.request_id,{checkout_id:checkout.id,status:"open"},["creating"]);row=await lookup(db,"id",body.request_id);
  if(row?.checkout_id!==checkout.id)throw Error("recurring_checkout_not_saved");
  return reply(view(row));
 }catch(err){const code=String(err.message||"recurring_failure");console.warn("asaas_recurring",/^[a-z0-9_]{1,80}$/.test(code)?code:"recurring_failure");return reply({error:/^[a-z0-9_]{1,80}$/.test(code)?code:"recurring_failure"},502);}
}
const allowedOrigins=new Set(["https://joinconnectbr.vercel.app","https://connectbr.online","https://www.connectbr.online","https://appswebb.github.io"]);
Deno.serve(async req=>{const origin=req.headers.get("origin");if(origin&&!allowedOrigins.has(origin))return new Response(JSON.stringify({error:"origin_not_allowed"}),{status:403,headers:{"Content-Type":"application/json","Cache-Control":"no-store","Vary":"Origin"}});const res=await handle(req);const headers=new Headers(res.headers);headers.set("Vary","Origin");if(origin)headers.set("Access-Control-Allow-Origin",origin);else headers.delete("Access-Control-Allow-Origin");return new Response(res.body,{status:res.status,headers});});
