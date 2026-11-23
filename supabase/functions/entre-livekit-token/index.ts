import {createClient} from "jsr:@supabase/supabase-js@2.57.0";
import {AccessToken} from "npm:livekit-server-sdk@2.20.1";
const cors={"Access-Control-Allow-Origin":"https://appswebb.github.io","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"OPTIONS,POST","Cache-Control":"no-store","Content-Type":"application/json"};
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:cors});
Deno.serve(async(req:Request)=>{
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
  const client=createClient(url,publishable,{auth:{persistSession:false}});
  const {data:{user},error:authError}=await client.auth.getUser(bearer);
  if(authError||!user)return json({error:"login_required"},401);
  const body=await req.json().catch(()=>({}));
  const pairId=String(body.pair_id||"");
  if(!/^[0-9a-f-]{36}$/i.test(pairId))return json({error:"invalid_pair"},400);
  const service=createClient(url,secret,{auth:{persistSession:false}});
  const {data:pair,error:pairError}=await service.from("entre_pairs").select("id,a,b,status,mode,expires_at").eq("id",pairId).maybeSingle();
  if(pairError||!pair||pair.status!=="active"||pair.mode!=="video"||Date.parse(pair.expires_at)<=Date.now()||
     (pair.a!==user.id&&pair.b!==user.id))return json({error:"room_not_allowed"},403);
  const {data:moderation}=await service.from("entre_moderation").select("is_banned").eq("user_id",user.id).maybeSingle();
  if(moderation?.is_banned)return json({error:"account_suspended"},403);
  const at=new AccessToken(apiKey,apiSecret,{identity:user.id,ttl:480});
  at.addGrant({roomJoin:true,room:"entre-"+pair.id,canPublish:true,canPublishData:false,canSubscribe:true});
  const token=await at.toJwt();
  return json({url:liveUrl,token,expires_in:480});
 }catch(e){console.error("livekit-token",String(e));return json({error:"room_unavailable"},503);}
});
