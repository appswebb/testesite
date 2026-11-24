// entre. Media retention worker: authenticates against a secret stored in Supabase Vault.
// Uses the Storage API for actual object deletion, never a DELETE from storage.objects.
const SUPABASE_URL=Deno.env.get('SUPABASE_URL')||'';
const SERVICE_ROLE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
function respond(value:unknown,status=200):Response{
  return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
}
Deno.serve(async (request:Request)=>{
 if(request.method!=='POST') return respond({error:'not_found'},404);
 if(!SUPABASE_URL||!SERVICE_ROLE)return respond({error:'server_configuration_missing'},500);
 const token=request.headers.get('x-entre-retention-token')||'';
 if(token.length!==64)return respond({error:'unauthorized'},401);
 const authHeaders={'apikey':SERVICE_ROLE,'authorization':'Bearer '+SERVICE_ROLE,'content-type':'application/json'};
 const rpc=async (name:string,payload:Record<string,unknown>={})=>{
  const response=await fetch(SUPABASE_URL+'/rest/v1/rpc/'+name,{method:'POST',headers:authHeaders,body:JSON.stringify(payload)});
  const raw=await response.text();
  if(!response.ok)throw new Error(name+' failed HTTP '+response.status);
  return JSON.parse(raw);
 };
 try{
  const authorized=await rpc('entre_media_retention_authorize',{_token:token});
  if(authorized!==true)return respond({error:'unauthorized'},401);
  let deleted=0;const failures:{bucket:string;status:number}[]=[];
  for(let iteration=0;iteration<3;iteration++){
   const files=await rpc('entre_media_cleanup_candidates') as {bucket:string;path:string}[];
   if(!Array.isArray(files)||files.length===0)break;
   const groups=new Map<string,string[]>();
   for(const f of files){
    if(!f||!['entre-avatars','connect-media','connect-chat'].includes(f.bucket)||typeof f.path!=='string'||!f.path||f.path.length>700)continue;
    groups.set(f.bucket,[...(groups.get(f.bucket)||[]),f.path]);
   }
   if(groups.size===0)break;
   let successful=0;
   for(const [bucket,paths] of groups){
    // Same storage delete endpoint used by supabase.storage.from(bucket).remove(paths)
    const response=await fetch(SUPABASE_URL+'/storage/v1/object/'+encodeURIComponent(bucket),{
      method:'DELETE',headers:authHeaders,body:JSON.stringify({prefixes:paths})
    });
    if(response.ok){deleted+=paths.length;successful+=paths.length;}
    else failures.push({bucket,status:response.status});
   }
   if(!successful||files.length<100)break;
  }
  // Support evidence is erased through Storage API, not by deleting metadata directly.
  let supportDeleted=0;
  for(let iteration=0;iteration<3;iteration++){
   const paths=await rpc('connect_support_cleanup_candidates') as string[];
   if(!Array.isArray(paths)||!paths.length)break;
   const safe=paths.filter(p=>typeof p==='string'&&/^[0-9a-f-]{36}\/\d+\/[0-9a-f-]{36}\.(?:png|jpg|webp|pdf)$/i.test(p));
   if(!safe.length)break;
   const response=await fetch(SUPABASE_URL+'/storage/v1/object/entre-support-evidence',{method:'DELETE',headers:authHeaders,body:JSON.stringify({prefixes:safe})});
   if(!response.ok){failures.push({bucket:'entre-support-evidence',status:response.status});break;}
   supportDeleted+=safe.length;
   if(paths.length<100)break;
  }
  const profileRefsCleared=await rpc('entre_media_cleanup_profile_refs');
  return respond({ok:failures.length===0,deleted,supportDeleted,profileRefsCleared,failures},failures.length?502:200);
 }catch(e){console.error('Media retention error:',e);return respond({ok:false,error:'retention_run_failed'},500);}
});