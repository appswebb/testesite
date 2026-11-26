import {createClient} from "jsr:@supabase/supabase-js@2.57.0";
import {AccessToken} from "npm:livekit-server-sdk@2.20.1";
const allowedOrigins=new Set(["https://connectbr.online","https://www.connectbr.online","https://appswebb.github.io"]);
Deno.serve(async(req:Request)=>{
 const requestOrigin=req.headers.get("origin")||"";
 const origin=allowedOrigins.has(requestOrigin)?requestOrigin:"https://connectbr.online";
 const cors={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"OPTIONS,POST","Cache-Control":"no-store","Vary":"Origin","Content-Type":"application/json"};
 const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:cors});
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST")return json({error:"method_not_allowed"},405);
 const url=Deno.env.get("SUPABASE_URL")||"";
 const publishable=Deno.env.get("SUPABASE_ANON_KEY")||"";
 const secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 const liveUrl=Deno.env.get("LIVEKIT_URL")||"";
 const apiKey=Deno.env.get("LIVEKIT_API_KEY")||"";
 const apiSecret=Deno.env.get("LIVEKIT_API_SECRET")||"";
 if(!liveUrl||!/^wss:\/\//i.test(liveUrl)||!apiKey||!apiSecret)return json({error:"livekit_not_configured"},503);
 if(!url||!publishable||!secret)return json({error:"supabase_not_configured"},503);
 const bearer=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||"";
 if(!bearer)return json({error:"login_required"},401);
 try{
  const caller=createClient(url,publishable,{auth:{persistSession:false},global:{headers:{Authorization:"Bearer "+bearer}}});
  const {data:{user},error:authError}=await caller.auth.getUser(bearer);
  if(authError||!user)return json({error:"login_required"},401);
  const body=await req.json().catch(()=>({}));
  const pairId=String(body.pair_id||"");
  if(!/^[0-9a-f-]{36}$/i.test(pairId))return json({error:"invalid_pair"},400);
  const service=createClient(url,secret,{auth:{persistSession:false}});
  const {data:pair,error:pairError}=await service.from("entre_pairs").select("id,a,b,status,mode,expires_at").eq("id",pairId).maybeSingle();
  const expiresAt=pair?Date.parse(pair.expires_at):NaN;
  if(pairError||!pair||pair.status!=="active"||pair.mode!=="video"||!Number.isFinite(expiresAt)||expiresAt<=Date.now()||
     (pair.a!==user.id&&pair.b!==user.id))return json({error:"room_not_allowed"},403);
  const peerId=pair.a===user.id?pair.b:pair.a;
  const [{data:sessionRejected,error:sessionError},{data:pairAllowed,error:pairAllowedError},{data:peerModeration,error:peerModerationError},{data:site,error:siteError}]=await Promise.all([
   caller.rpc("entre_is_banned"),
   caller.rpc("entre_chat_pair_allowed",{_pair:pairId}),
   service.from("entre_moderation").select("is_banned").eq("user_id",peerId).maybeSingle(),
   service.from("entre_site_settings").select("maintenance_enabled").eq("id",1).maybeSingle()
  ]);
  if(sessionError||pairAllowedError||peerModerationError||siteError)return json({error:"security_check_unavailable"},503);
  if(sessionRejected===true||pairAllowed!==true||peerModeration?.is_banned||site?.maintenance_enabled===true)return json({error:"room_not_allowed"},403);
  const remainingSeconds=Math.floor((expiresAt-Date.now())/1000);
  if(remainingSeconds<=0)return json({error:"room_expired"},403);
  const ttl=Math.min(300,remainingSeconds);
  const at=new AccessToken(apiKey,apiSecret,{identity:user.id,ttl});
  at.addGrant({roomJoin:true,room:"entre-"+pair.id,canPublish:true,canPublishData:false,canSubscribe:true});
  const token=await at.toJwt();
  return json({url:liveUrl,token,expires_in:ttl});
 }catch(e){console.error("livekit-token",String(e));return json({error:"room_unavailable"},503);}
});
