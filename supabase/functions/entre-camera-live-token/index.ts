import {createClient} from "jsr:@supabase/supabase-js@2.57.0";
import {AccessToken,RoomServiceClient} from "npm:livekit-server-sdk@2.20.1";
const cors={"Access-Control-Allow-Origin":"https://appswebb.github.io","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"OPTIONS,POST","Cache-Control":"no-store","Content-Type":"application/json; charset=utf-8"};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:cors});
Deno.serve(async(req:Request)=>{
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
  const [{data:live,error:liveError},{data:mod,error:modError}]=await Promise.all([
   service.from("entre_lives").select("id,host_id,guest_id,status,expires_at").eq("id",live_id).maybeSingle(),
   service.from("entre_moderation").select("is_banned").eq("user_id",user.id).maybeSingle()
  ]);
  if(liveError||modError)return reply({error:"unavailable"},503);
  if(!live||live.status!=="active"||Date.parse(live.expires_at)<=Date.now()||mod?.is_banned)
   return reply({error:"live_unavailable"},403);
  const {data:blocks,error:blocksError}=await service.from("entre_blocks").select("blocker").or("and(blocker.eq."+user.id+",blocked.eq."+live.host_id+"),and(blocker.eq."+live.host_id+",blocked.eq."+user.id+")").limit(1);
  if(blocksError)return reply({error:"unavailable"},503);
  if(blocks?.length)return reply({error:"not_allowed"},403);
  if(action==="ban"){
   if(live.host_id!==user.id||target===user.id||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(target||"")))return reply({error:"not_allowed"},403);
   const caller=createClient(supabaseUrl,anon,{auth:{persistSession:false},global:{headers:{Authorization:"Bearer "+bearer}}});
   const {data:restrictions,error:banError}=await caller.rpc("connect_live_moderate",{_live:live_id,_target:target,_action:"ban"});
   if(banError)return reply({error:"moderation_failed"},403);
   try{const rooms=new RoomServiceClient(liveUrl.replace(/^wss:/,"https:"),key,liveSecret);await rooms.removeParticipant("entre-live-"+live.id,target);}
   catch(e){console.warn("live participant removal",String(e));return reply({restrictions,removed:false});}
   return reply({restrictions,removed:true});
  }
  const {data:restriction,error:restrictionError}=await service.from("connect_live_restrictions").select("banned").eq("live_id",live_id).eq("user_id",user.id).maybeSingle();
  if(restrictionError)return reply({error:"unavailable"},503);
  if(restriction?.banned)return reply({error:"live_banned"},403);
  const publisher=live.host_id===user.id||live.guest_id===user.id;
  const token=new AccessToken(key,liveSecret,{identity:user.id,name:"Pessoa no entre.",ttl:60});
  token.addGrant({roomJoin:true,room:"entre-live-"+live.id,canSubscribe:true,canPublish:publisher,canPublishData:false,canUpdateOwnMetadata:false});
  return reply({url:liveUrl,token:await token.toJwt(),role:live.host_id===user.id?"host":live.guest_id===user.id?"guest":"viewer",expires_in:60});
 }catch(e){console.error("entre-camera-live-token",String(e));return reply({error:"token_error"},503)}
});
