import {createClient} from "jsr:@supabase/supabase-js@2.57.0";
const origin="https://appswebb.github.io";
const headers={"Content-Type":"application/json; charset=utf-8","Access-Control-Allow-Origin":origin,"Access-Control-Allow-Methods":"GET,OPTIONS","Access-Control-Allow-Headers":"apikey,authorization,content-type,x-client-info","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="GET")return json({error:"method_not_allowed"},405);
 const handle=(new URL(req.url).searchParams.get("u")||"").replace(/^@/,"").trim().toLowerCase();
 if(!/^[a-z][a-z0-9_]{2,19}$/.test(handle))return json({error:"invalid_username"},400);
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!key)return json({error:"not_configured"},503);
 try{
  const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:p,error:e}=await sb.from("entre_profiles")
   .select("id,username,display_name,bio,avatar_path")
   .eq("username",handle).maybeSingle();
  if(e||!p)return json({error:"not_found"},404);
  const {data:moderation,error:modError}=await sb.from("entre_moderation").select("is_banned").eq("user_id",p.id).maybeSingle();
  if(modError)return json({error:"unavailable"},503);
  if(moderation?.is_banned===true)return json({error:"not_found"},404);
  let avatar_url:string|null=null;
  // The avatar bucket remains private. Sign only this exact profile's stored asset.
  if(p.avatar_path&&p.avatar_path.startsWith(p.id+"/")&&/^[0-9a-f-]{36}\.webp$/i.test(p.avatar_path.split("/")[1])&&p.avatar_path.split("/").length===2){
   const signed=await sb.storage.from("entre-avatars").createSignedUrl(p.avatar_path,180);
   if(!signed.error&&signed.data?.signedUrl)avatar_url=signed.data.signedUrl;
  }
  let banner=null;
  // Reuse the established public-profile eligibility check above. No other personal data is exposed.
  const {data:cover,error:coverError}=await sb.from("entre_profile_banners").select("mime,image_base64,zoom,pos_x,pos_y").eq("user_id",p.id).maybeSingle();
  if(!coverError&&cover){
   let allowed=cover.mime==="image/jpeg";
   if(cover.mime==="image/gif"){
    const {data:premium,error:premiumError}=await sb.rpc("entre_premium_active",{_uid:p.id});
    allowed=!premiumError&&premium===true;
   }
   if(allowed)banner=cover;
  }
  return json({profile:{username:p.username,display_name:p.display_name,bio:String(p.bio||"").slice(0,250),avatar_url,banner}});
 }catch(error){console.error("shared-profile",String(error));return json({error:"unavailable"},503)}
});
