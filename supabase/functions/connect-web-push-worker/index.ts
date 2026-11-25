import { createClient } from "npm:@supabase/supabase-js@2.117.1";
import webpush from "npm:web-push@3.6.7";
const reply=(status:number,data:object)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
const allowed=(endpoint:string)=>{try{const u=new URL(endpoint);return u.protocol==="https:"&&!u.username&&!u.password&&!u.port&&!u.hash&&(/^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.push\.apple\.com)$/.test(u.hostname));}catch{return false;}};
Deno.serve(async req=>{
 if(req.method!=="POST")return reply(405,{error:"method_not_allowed"});
 const token=req.headers.get("x-connect-push-token")||"";
 if(!/^[a-f0-9]{64}$/.test(token))return reply(403,{error:"forbidden"});
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!key)return reply(503,{error:"configuration_unavailable"});
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const first=await db.rpc("connect_push_worker_config",{_token:token});
 if(first.error)return reply(403,{error:"forbidden"});
 let keys=first.data;
 if(!keys?.public_key&&!keys?.private_key){
  try{const fresh=webpush.generateVAPIDKeys();const saved=await db.rpc("connect_push_worker_config",{_token:token,_public_key:fresh.publicKey,_private_key:fresh.privateKey});if(saved.error)return reply(503,{error:"key_initialization_failed"});keys=saved.data;}catch{return reply(503,{error:"key_initialization_failed"});}
 }
 if(!keys?.public_key||!keys?.private_key)return reply(503,{error:"keys_unavailable"});
 const batch=await db.rpc("connect_push_claim",{_token:token});if(batch.error)return reply(503,{error:"queue_unavailable"});
 const rows=Array.isArray(batch.data)?batch.data:[];let sent=0,retried=0,removed=0;
 for(let offset=0;offset<rows.length;offset+=5){
 await Promise.all(rows.slice(offset,offset+5).map(async row=>{
  let outcome="retry";
  try{
   if(!allowed(row.endpoint)){outcome="gone";}
   else{
    const details=webpush.generateRequestDetails({endpoint:row.endpoint,keys:{p256dh:row.p256dh,auth:row.auth_key}},JSON.stringify({title:"CONNECT",body:"Você tem uma nova atividade.",url:"./?push=1"}),{TTL:3600,urgency:"normal",topic:"connect-activity",vapidDetails:{subject:"mailto:connectapp.w@gmail.com",publicKey:keys.public_key,privateKey:keys.private_key}});
    const headers=new Headers(details.headers as Record<string,string>);headers.delete("Content-Length");
    const res=await fetch(row.endpoint,{method:"POST",headers,body:details.body,redirect:"error",signal:AbortSignal.timeout(7000)});
    outcome=res.ok?"sent":[404,410].includes(res.status)?"gone":"retry";
    await res.body?.cancel();
   }
  }catch{/* No endpoint, keys or notification contents are logged. */}
  if(outcome==="sent")sent++;else if(outcome==="gone")removed++;else retried++;
  await db.rpc("connect_push_complete",{_token:token,_endpoint:row.endpoint,_lease:row.lease_id,_pending:row.pending_at,_outcome:outcome});
 }));
 }
 return reply(200,{ok:true,claimed:rows.length,sent,retried,removed});
});