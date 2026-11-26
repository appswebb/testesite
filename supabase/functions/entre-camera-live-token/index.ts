import {createClient} from "jsr:@supabase/supabase-js@2.57.0";
import {AccessToken,RoomServiceClient} from "npm:livekit-server-sdk@2.20.1";
const allowedOrigins=new Set(["https://connectbr.online","https://www.connectbr.online","https://appswebb.github.io"]);
Deno.serve(async(req:Request)=>{
 const requestOrigin=req.headers.get("origin")||"";
 const origin=allowedOrigins.has(requestOrigin)?requestOrigin:"https://connectbr.online";
 const cors={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"OPTIONS,POST","Cache-Control":"no-store","Vary":"Origin","Content-Type":"application/json; charset=utf-8"};
 const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:cors});
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST")return reply({error:"method_not_allowed"},405);
 const supabaseUrl=Deno.env.get("SUPABASE_URL")||"",anon=Deno.env.get("SUPABASE_ANON_KEY")||"",secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 const liveUrl=Deno.env.get("LIVEKIT_URL")||"",key=Deno.env.get("LIVEKIT_API_KEY")||"",liveSecret=Deno.env.get("LIVEKIT_API_SECRET")||"";
 if(!supabaseUrl||!anon||!secret)return reply({error:"backend_not_configured"},503);
 if(!/^wss:\/\//.test(liveUrl)||!key||!liveSecret)return reply({error:"livekit_not_configured"},503);
 const bearer=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||"";
 if(!bearer)return reply({error:"unauthorized"},401);
 try{
  const {live_id,action,target}=await req.json();
  if(!/^[0-9a-f-]{36}$/i.test(String(live_id||"")))return reply({error:"invalid_live_id"},400);
  const auth=createClient(supabaseUrl,anon,{auth:{persistSession:false}});
  const {data:{user},error}=await auth.auth.getUser(bearer);
  if(error||!user)return reply({error:"unauthorized"},401);
  const service=createClient(supabaseUrl,secret,{auth:{persistSession:false}});
  const caller=createClient(supabaseUrl,anon,{auth:{persistSession:false},global:{headers:{Authorization:"Bearer "+bearer}}});
  const {data:live,error:liveError}=await service.from("entre_lives").select("id,host_id,guest_id,status,expires_at").eq("id",live_id).maybeSingle();
  if(liveError)return reply({error:"unavailable"},503);
  const liveExpiry=live?Date.parse(live.expires_at):NaN;
  if(!live||live.status!=="active"||!Number.isFinite(liveExpiry)||liveExpiry<=Date.now())
   return reply({error:"live_unavailable"},403);
  const [{data:sessionRejected,error:sessionError},{data:site,error:siteError},{data:restriction,error:restrictionError}]=await Promise.all([
   caller.rpc("entre_is_banned"),
   service.from("entre_site_settings").select("maintenance_enabled").eq("id",1).maybeSingle(),
   service.from("connect_live_restrictions").select("banned").eq("live_id",live_id).eq("user_id",user.id).maybeSingle()
  ]);
  if(sessionError||siteError||restrictionError)return reply({error:"unavailable"},503);
  if(sessionRejected===true||site?.maintenance_enabled===true||restriction?.banned)
   return reply({error:"live_unavailable"},403);
  const {data:blocks,error:blocksError}=await service.from("entre_blocks").select("blocker").or("and(blocker.eq."+user.id+",blocked.eq."+live.host_id+"),and(blocker.eq."+live.host_id+",blocked.eq."+user.id+")").limit(1);
  if(blocksError)return reply({error:"unavailable"},503);
  if(blocks?.length)return reply({error:"not_allowed"},403);
  if(action==="ban"){
   if(target===user.id||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(target||"")))return reply({error:"not_allowed"},403);
   const {data:restrictions,error:banError}=await caller.rpc("connect_live_moderate",{_live:live_id,_target:target,_action:"ban"});
   if(banError)return reply({error:"moderation_failed"},403);
   try{const rooms=new RoomServiceClient(liveUrl.replace(/^wss:/,"https:"),key,liveSecret);await rooms.removeParticipant("entre-live-"+live.id,target);}
   catch(e){console.warn("live participant removal",String(e));return reply({restrictions,removed:false});}
   return reply({restrictions,removed:true});
  }
  if(action==="guest_remove"){
   if(live.host_id!==user.id||target===user.id||! /^[0-9a-f-]{36}$/i.test(String(target||"")))return reply({error:"not_allowed"},403);
   const {data:studio,error:removeError}=await caller.rpc("connect_live_studio",{_live:live_id,_action:"guest_remove",_target:target});
   if(removeError)return reply({error:"moderation_failed"},403);
   try{const rooms=new RoomServiceClient(liveUrl.replace(/^wss:/,"https:"),key,liveSecret);await rooms.updateParticipant("entre-live-"+live.id,target,{permission:{canPublish:false,canSubscribe:true,canPublishData:false,canUpdateMetadata:false}});}
   catch(e){console.warn("stage permission update",String(e));return reply({studio,removed:false});}
   return reply({studio,removed:true});
  }
  const participantIds=[...new Set([user.id,live.host_id,live.guest_id].filter((v):v is string=>typeof v==="string"&&v.length>0))];
  const blockFilters:string[]=[];
  for(let i=0;i<participantIds.length;i++){
   for(let j=i+1;j<participantIds.length;j++){
    const a=participantIds[i],b=participantIds[j];
    blockFilters.push("and(blocker.eq."+a+",blocked.eq."+b+")","and(blocker.eq."+b+",blocked.eq."+a+")");
   }
  }
  if(blockFilters.length){
   const {data:participantBlocks,error:participantBlocksError}=await service.from("entre_blocks").select("blocker").or(blockFilters.join(",")).limit(1);
   if(participantBlocksError)return reply({error:"unavailable"},503);
   if(participantBlocks?.length)return reply({error:"not_allowed"},403);
  }
  const otherParticipants=[...new Set([live.host_id,live.guest_id].filter((v):v is string=>typeof v==="string"&&v.length>0))];
  if(otherParticipants.length){
   const {data:participantModeration,error:participantModerationError}=await service.from("entre_moderation").select("user_id,is_banned").in("user_id",otherParticipants);
   if(participantModerationError)return reply({error:"unavailable"},503);
   if(participantModeration?.some((m:any)=>m.is_banned))return reply({error:"live_unavailable"},403);
  }
  const {data:guest,error:guestError}=await service.from("connect_live_stage_guests").select("status").eq("live_id",live_id).eq("user_id",user.id).maybeSingle();
  if(guestError)return reply({error:"unavailable"},503);
  const publisher=live.host_id===user.id||live.guest_id===user.id||guest?.status==="approved";
  const {data:profile}=await service.from("entre_profiles").select("display_name").eq("id",user.id).maybeSingle();
  const token=new AccessToken(key,liveSecret,{identity:user.id,name:String(profile?.display_name||"Pessoa").slice(0,80),ttl:60});
  token.addGrant({roomJoin:true,room:"entre-live-"+live.id,canSubscribe:true,canPublish:publisher,canPublishData:false,canUpdateOwnMetadata:false});
  return reply({url:liveUrl,token:await token.toJwt(),role:live.host_id===user.id?"host":publisher?"guest":"viewer",expires_in:60});
 }catch(e){console.error("entre-camera-live-token",String(e));return reply({error:"token_error"},503)}
});
