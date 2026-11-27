import {createClient} from "jsr:@supabase/supabase-js@2.57.0";
const allowedOrigins=new Set(["https://joinconnectbr.vercel.app","https://connectbr.online","https://www.connectbr.online","https://appswebb.github.io"]);
Deno.serve(async(req:Request)=>{
 const requestOrigin=req.headers.get("origin")||"";
 const origin=allowedOrigins.has(requestOrigin)?requestOrigin:"https://connectbr.online";
 const headers={"Vary":"Origin","Content-Type":"application/json; charset=utf-8","Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
 const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return json({error:"method_not_allowed"},405);
 if(requestOrigin&&!allowedOrigins.has(requestOrigin))return json({error:"origin_not_allowed"},403);
 const url=Deno.env.get("SUPABASE_URL")||"",anon=Deno.env.get("SUPABASE_ANON_KEY")||"",secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 const bearer=req.headers.get("authorization")?.replace(/^Bearer\\s+/i,"")||"";
 if(!bearer)return json({error:"unauthorized"},401);
 if(!url||!anon||!secret)return json({error:"unavailable"},503);
 try{
  const auth=createClient(url,anon,{global:{headers:{Authorization:"Bearer "+bearer}},auth:{persistSession:false}});
  const {data:{user},error:authError}=await auth.auth.getUser(bearer);
  if(authError||!user||!user.email||!user.email_confirmed_at||user.is_anonymous)return json({error:"unauthorized"},401);
  const {data:verification,error:verificationError}=await auth.rpc("connect_delete_email_status");
  if(verificationError||verification?.verified!==true)return json({error:"email_verification_required"},403);
  const id=user.id,email=user.email.toLowerCase();
  const service=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:adminAllow,error:allowError}=await service.from("entre_admin_allowlist").select("email").eq("email",email).eq("enabled",true).maybeSingle();
  if(allowError)return json({error:"role_check_failed"},503);
  if(adminAllow)return json({error:"admin_account_requires_admin_transfer"},403);

  const [{data:subscription,error:subError},{data:recurring,error:recurringError},{data:asaasRecurring,error:asaasRecurringError},{data:asaasPayments,error:asaasPaymentsError}]=await Promise.all([
   service.from("entre_premium_subscriptions").select("provider,provider_id,status").eq("user_id",id).maybeSingle(),
   service.from("entre_premium_recurring").select("preapproval_id,status").eq("user_id",id).in("status",["creating","pending","authorized","paused"]).limit(5),
   service.from("connect_asaas_recurring").select("status").eq("user_id",id).in("status",["creating","open","active"]).limit(5),
   service.from("connect_asaas_payments").select("status").eq("user_id",id).in("status",["creating","PENDING","OVERDUE","pending","overdue"]).limit(5)
  ]);
  if(subError||recurringError||asaasRecurringError||asaasPaymentsError)return json({error:"payment_check_failed"},503);
  if(recurring?.some((r:any)=>r.status==="creating"&&!r.preapproval_id))
   return json({error:"recurring_creation_pending_try_later"},409);
  if(asaasRecurring?.length||(subscription?.provider==="asaas"&&["pending","authorized","paused"].includes(subscription.status)))
   return json({error:"cancel_asaas_recurring_first"},409);
  if(asaasPayments?.length)return json({error:"pending_asaas_payment_first"},409);

  const preapprovalIds=[...new Set([
   ...(recurring||[]).map((r:any)=>r.preapproval_id).filter(Boolean),
   ...(subscription?.provider==="mercadopago_recurring"&&subscription?.provider_id?[subscription.provider_id]:[])
  ])];
  if(preapprovalIds.length){
   const key=Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
   if(!key)return json({error:"cancel_recurring_first"},409);
   for(const preapprovalId of preapprovalIds){
    const cancel=await fetch("https://api.mercadopago.com/preapproval/"+encodeURIComponent(preapprovalId),{
     method:"PUT",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},
     body:JSON.stringify({status:"cancelled"})
    });
    if(!cancel.ok)return json({error:"recurring_cancel_failed"},409);
   }
  }

  const buckets=["connect-chat","connect-media","entre-avatars","entre-chat-media","entre-live-covers","entre-post-media","entre-story-media","entre-support-evidence"];
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
  for(const bucket of buckets){
   try{assets[bucket]=await collect(bucket,id);}
   catch(e){console.error("Storage inventory failure",bucket,String(e));return json({error:"storage_inventory_failed"},503);}
  }
  for(const [bucket,paths] of Object.entries(assets)){
   for(let n=0;n<paths.length;n+=100){
    const {error}=await service.storage.from(bucket).remove(paths.slice(n,n+100));
    if(error){console.error("Storage cleanup failure",bucket,error.message);return json({error:"storage_cleanup_failed"},503);}
   }
  }
  const {error:verificationDeleteError}=await service.from("connect_account_delete_verification").delete().eq("user_id",id);
  if(verificationDeleteError)return json({error:"verification_cleanup_failed"},503);
  const {error:deleteError}=await service.auth.admin.deleteUser(id);
  if(deleteError){console.error("Self deletion rejected",deleteError.message);return json({error:"delete_failed_storage_cleaned"},409);}
  return json({deleted:true,cleanup_pending:0});
 }catch(e){console.error("entre-self-delete-user",String(e));return json({error:"unexpected_error"},503);}
});