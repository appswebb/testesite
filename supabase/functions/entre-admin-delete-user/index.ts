import {createClient} from "jsr:@supabase/supabase-js@2.57.0";
const headers={"Content-Type":"application/json","Access-Control-Allow-Origin":"https://appswebb.github.io","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store"};
const json=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers});
Deno.serve(async(req:Request)=>{
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
  const [{data:subscription,error:subError},{data:recurring,error:recurringError}]=await Promise.all([
   service.from("entre_premium_subscriptions").select("provider,provider_id,status").eq("user_id",id).maybeSingle(),
   service.from("entre_premium_recurring").select("preapproval_id,status").eq("user_id",id)
    .in("status",["creating","pending","authorized","paused"]).limit(5)
  ]);
  if(subError||recurringError)return json({error:"payment_check_failed"},503);
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
  const assets:Record<string,string[]>={};
  for(const bucket of ["entre-avatars","entre-post-media","entre-support-evidence"]){
   try{
    const {data:items,error:listError}=await service.storage.from(bucket).list(id,{limit:1000});
    if(!listError&&items?.length)assets[bucket]=items.filter(x=>x.name&&!x.name.endsWith("/")).map(x=>id+"/"+x.name);
   }catch(e){console.warn("Cannot list old private user files",bucket);}
  }
  const {error:deleteError}=await service.auth.admin.deleteUser(id);
  if(deleteError){console.error("Account deletion rejected",deleteError.message);return json({error:"delete_failed"},409);}
  // Audit is separate from deleted auth user; target is intentionally not a foreign key.
  const audit=await service.from("entre_admin_deletion_audit").insert({actor_id:user.id,target_id:id,target_email:email,reason});
  if(audit.error)console.error("Admin deletion audit failed",audit.error.message);
  let cleanupPending=0;
  for(const [bucket,paths] of Object.entries(assets)){
   if(!paths.length)continue;
   const {error}=await service.storage.from(bucket).remove(paths);
   if(error)cleanupPending+=paths.length;
  }
  return json({deleted:true,cleanup_pending:cleanupPending});
 }catch(e){console.error("admin-delete-user",String(e));return json({error:"unexpected_error"},503)}
});
