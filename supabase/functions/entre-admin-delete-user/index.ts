import {createClient} from "jsr:@supabase/supabase-js@2.57.0";
const allowedOrigins=new Set(["https://joinconnectbr.vercel.app","https://connectbr.online","https://www.connectbr.online","https://appswebb.github.io"]);
Deno.serve(async(req:Request)=>{
 const requestOrigin=req.headers.get("origin")||"";
 const origin=allowedOrigins.has(requestOrigin)?requestOrigin:"https://connectbr.online";
 const headers={"Vary":"Origin","Content-Type":"application/json","Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store"};
 const json=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers});
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return json({error:"method_not_allowed"},405);
 const url=Deno.env.get("SUPABASE_URL")||"",anon=Deno.env.get("SUPABASE_ANON_KEY")||"",secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 const bearer=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||"";
 if(!bearer)return json({error:"unauthorized"},401);
 if(!url||!anon||!secret)return json({error:"unavailable"},503);
 try{
  const auth=createClient(url,anon,{global:{headers:{Authorization:"Bearer "+bearer}},auth:{persistSession:false}});
  const {data:{user},error:authError}=await auth.auth.getUser(bearer);
  if(authError||!user||!user.email_confirmed_at)return json({error:"unauthorized"},401);
  const {data:admin,error:adminError}=await auth.rpc("entre_admin_check");
  if(adminError||admin!==true)return json({error:"forbidden"},403);
  const payload=await req.json().catch(()=>({}));
  const id=String(payload?.user_id||""),reason=String(payload?.reason||"").trim().slice(0,300);
  if(!/^[0-9a-f-]{36}$/i.test(id)||id===user.id)return json({error:"invalid_user"},400);
  const service=createClient(url,secret,{auth:{persistSession:false}});
  const {data:target,error:targetError}=await service.auth.admin.getUserById(id);
  if(targetError||!target?.user?.email)return json({error:"not_found"},404);
  const email=target.user.email.toLowerCase();
  if(String(payload?.confirmation||"")!=="EXCLUIR "+email)return json({error:"confirmation_mismatch"},400);
  const {data:adminAllow,error:allowError}=await service.from("entre_admin_allowlist").select("email").eq("email",email).eq("enabled",true).maybeSingle();
  if(allowError)return json({error:"role_check_failed"},503);
  if(adminAllow)return json({error:"cannot_delete_admin"},403);
  // Cancel every pending/authorized renewal before deleting the Auth user,
  // including subscriptions whose first invoice has NOT yet been approved.
  const [{data:subscription,error:subError},{data:recurring,error:recurringError},{data:asaasRecurring,error:asaasRecurringError},{data:asaasPayments,error:asaasPaymentsError}]=await Promise.all([
   service.from("entre_premium_subscriptions").select("provider,provider_id,status").eq("user_id",id).maybeSingle(),
   service.from("entre_premium_recurring").select("preapproval_id,status").eq("user_id",id)
    .in("status",["creating","pending","authorized","paused"]).limit(5),
   service.from("connect_asaas_recurring").select("status").eq("user_id",id).in("status",["creating","open","active"]).limit(5),
   service.from("connect_asaas_payments").select("status").eq("user_id",id).in("status",["creating","PENDING","OVERDUE"]).limit(5)
  ]);
  if(subError||recurringError||asaasRecurringError||asaasPaymentsError)return json({error:"payment_check_failed"},503);
  if(asaasRecurring?.length||(subscription?.provider==="asaas"&&["pending","authorized","paused"].includes(subscription.status)))
   return json({error:"cancel_asaas_recurring_first"},409);
  if(asaasPayments?.length)return json({error:"pending_asaas_payment_first"},409);
  if(recurring?.some((r:any)=>r.status==="creating"&&!r.preapproval_id))
   return json({error:"recurring_creation_pending_try_later"},409);
  const ids=[...new Set([
   ...(recurring||[]).map((r:any)=>r.preapproval_id).filter(Boolean),
   ...(subscription?.provider==="mercadopago_recurring"&&subscription?.provider_id?[subscription.provider_id]:[])
  ])];
  if(ids.length){
   const key=Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
   if(!key)return json({error:"cancel_recurring_first"},409);
   for(const preapprovalId of ids){
    const cancel=await fetch("https://api.mercadopago.com/preapproval/"+encodeURIComponent(preapprovalId),{
     method:"PUT",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},
     body:JSON.stringify({status:"cancelled"})
    });
    if(!cancel.ok)return json({error:"recurring_cancel_failed"},409);
   }
  }
  // Storage ownership may prevent deleting the Auth user. Clean recursively
  // first; never ignore failures or report a successful deletion prematurely.
  const assets:Record<string,string[]>={};
  async function collect(bucket:string,folder:string,depth=0):Promise<string[]>{
   if(depth>5)throw Error("storage_folder_depth_exceeded");
   const paths:string[]=[];
   for(let offset=0;offset<10000;offset+=1000){
    const {data:items,error}=await service.storage.from(bucket).list(folder,{limit:1000,offset});
    if(error)throw error;
    if(!items?.length)break;
    for(const item of items){
     if(!item?.name||item.name==="."||item.name==="..")continue;
     const child=folder+"/"+item.name;
     if(item.id&&item.metadata)paths.push(child);
     else paths.push(...await collect(bucket,child,depth+1));
    }
    if(items.length<1000)break;
   }
   return paths;
  }
  for(const bucket of ["connect-chat","connect-media","entre-avatars","entre-chat-media","entre-live-covers","entre-post-media","entre-story-media","entre-support-evidence"]){
   try{assets[bucket]=await collect(bucket,id);}
   catch(e){console.error("Storage inventory failure",bucket,String(e));return json({error:"storage_inventory_failed"},503);}
  }
  for(const [bucket,paths] of Object.entries(assets)){
   for(let n=0;n<paths.length;n+=100){
    const {error}=await service.storage.from(bucket).remove(paths.slice(n,n+100));
    if(error){console.error("Storage cleanup failure",bucket,error.message);return json({error:"storage_cleanup_failed"},503);}
   }
  }
  // The admin has explicitly confirmed permanent deletion, including files.
  const {error:deleteError}=await service.auth.admin.deleteUser(id);
  if(deleteError){console.error("Account deletion rejected",deleteError.message);return json({error:"delete_failed_storage_cleaned"},409);}
  // Audit is separate from deleted auth user; target is intentionally not a foreign key.
  const audit=await service.from("entre_admin_deletion_audit").insert({actor_id:user.id,target_id:id,target_email:email,reason});
  if(audit.error)console.error("Admin deletion audit failed",audit.error.message);
  const cleanupPending=0;
  return json({deleted:true,cleanup_pending:cleanupPending});
 }catch(e){console.error("admin-delete-user",String(e));return json({error:"unexpected_error"},503)}
});
