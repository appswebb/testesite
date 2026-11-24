import {createClient} from "jsr:@supabase/supabase-js@2.57.0";
const cors={"Content-Type":"application/json","Access-Control-Allow-Origin":"https://appswebb.github.io","Access-Control-Allow-Headers":"apikey,authorization,content-type,x-client-info","Access-Control-Allow-Methods":"OPTIONS,POST","Cache-Control":"no-store"};
const reply=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers:cors});
const mp=(access:string,path:string,options?:RequestInit)=>fetch("https://api.mercadopago.com"+path,{...options,headers:{"Authorization":"Bearer "+access,"Content-Type":"application/json",...(options?.headers||{})}});
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST")return reply({error:"method_not_allowed"},405);
 const url=Deno.env.get("SUPABASE_URL")||"",anon=Deno.env.get("SUPABASE_ANON_KEY")||"",secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 const access=Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")||"",pub=Deno.env.get("MERCADOPAGO_PUBLIC_KEY")||"";
 if(!url||!anon||!secret)return reply({error:"supabase_not_configured"},503);
 const bearer=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||"";
 if(!bearer)return reply({error:"unauthorized"},401);
 try{
  const auth=createClient(url,anon,{auth:{persistSession:false}});
  const {data:{user},error}=await auth.auth.getUser(bearer);
  if(error||!user?.email)return reply({error:"unauthorized"},401);
  const service=createClient(url,secret,{auth:{persistSession:false}});
  const {data:cfg,error:cfgError}=await service.from("entre_premium_settings").select("monthly_price_cents,enabled,recurring_enabled").eq("id",1).maybeSingle();
  if(cfgError||!cfg)return reply({error:"settings_unavailable"},503);
  const request=await req.json().catch(()=>({})),action=String(request.action||"status");
  const {data:row,error:readError}=await service.from("entre_premium_recurring").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(readError)return reply({error:"account_status_unavailable"},503);
  if(action==="config")return reply({enabled:false,public_key:pub||null,
   price_cents:cfg.monthly_price_cents,message:!access||!pub?"Mercado Pago ainda não configurado para cartão recorrente.":!cfg.recurring_enabled?"Recorrência aguardando ativação no painel.":null});
  if(!access)return reply({error:"mercadopago_unavailable"},503);
  if(action==="start"){return reply({error:"provider_retired"},410);
   if(!cfg.enabled||!cfg.recurring_enabled||!pub)return reply({error:"recurring_not_enabled"},403);
   const token=String(request.card_token_id||"").trim(),requestId=String(request.request_id||"");
   if(!/^[0-9a-f-]{36}$/i.test(requestId)||token.length<10||token.length>1024)return reply({error:"invalid_card_token"},400);
   if(row&&["creating","pending","authorized","paused"].includes(row.status))return reply({error:"already_subscribed_or_pending"},409);
   const {data:current}=await service.from("entre_premium_subscriptions").select("status,paid_until").eq("user_id",user.id).maybeSingle();
   if(current?.status==="authorized"&&Date.parse(current.paid_until)>Date.now())return reply({error:"premium_already_active"},409);
   const record={id:requestId,user_id:user.id,amount_cents:cfg.monthly_price_cents,status:"creating"};
   const {error:insertError}=await service.from("entre_premium_recurring").insert(record);
   if(insertError)return reply({error:"recurring_already_started"},409);
   const payload={
    reason:"entre. Premium — cobrança mensal recorrente",
    external_reference:"entre-recurring:"+user.id+":"+requestId,
    payer_email:user.email,card_token_id:token,status:"authorized",
    back_url:"https://appswebb.github.io/testesite/?premiumReturn=1",
    auto_recurring:{frequency:1,frequency_type:"months",transaction_amount:cfg.monthly_price_cents/100,currency_id:"BRL"}
   };
   const response=await mp(access,"/preapproval",{method:"POST",headers:{"X-Idempotency-Key":requestId},body:JSON.stringify(payload)});
   const saved=await response.json().catch(()=>({}));
   if(!response.ok||!saved.id||!["authorized","pending"].includes(saved.status)){
    await service.from("entre_premium_recurring").update({status:"error",updated_at:new Date().toISOString()}).eq("id",requestId);
    return reply({error:"subscription_provider_rejected"},409);
   }
   const {error:updateError}=await service.from("entre_premium_recurring").update({preapproval_id:String(saved.id),status:"pending",updated_at:new Date().toISOString()}).eq("id",requestId);
   if(updateError){
    await mp(access,"/preapproval/"+encodeURIComponent(String(saved.id)),{method:"PUT",body:JSON.stringify({status:"cancelled"})});
    return reply({error:"subscription_record_failed"},503);
   }
   // Authorization does not prove that the first monthly invoice has been paid.
   return reply({status:"pending",next_step:"verify_invoice",message:"Assinatura autorizada. Aguardando a primeira cobrança ser aprovada."});
  }
  if(action==="cancel"){
   if(!row?.preapproval_id||!["authorized","pending","paused"].includes(row.status))return reply({error:"no_active_recurring"},409);
   const response=await mp(access,"/preapproval/"+encodeURIComponent(row.preapproval_id),{method:"PUT",body:JSON.stringify({status:"cancelled"})});
   if(!response.ok)return reply({error:"provider_cancel_failed"},503);
   await service.from("entre_premium_recurring").update({status:"cancelled",updated_at:new Date().toISOString()}).eq("id",row.id);
   return reply({status:"cancelled",message:"Renovação automática cancelada. Acesso pago permanece até a validade atual."});
  }
  if(action==="status"){
   if(!row?.preapproval_id)return reply({status:row?.status||"none",last_invoice_at:row?.last_invoice_at||null});
   const response=await mp(access,"/preapproval/"+encodeURIComponent(row.preapproval_id));
   if(!response.ok)return reply({error:"provider_unavailable"},503);
   const info=await response.json();
   if(info.id!==row.preapproval_id||info.external_reference!=="entre-recurring:"+user.id+":"+row.id)
    return reply({error:"provider_reference_mismatch"},403);
   if(["cancelled","paused"].includes(info.status)&&row.status!=="cancelled"){
    await service.from("entre_premium_recurring").update({status:info.status,updated_at:new Date().toISOString()}).eq("id",row.id);
   }
   let applied=0;
   if(info.status==="authorized"&&row.status!=="cancelled"){
    const search=await mp(access,"/authorized_payments/search?preapproval_id="+encodeURIComponent(row.preapproval_id)+"&limit=20");
    if(search.ok){
     const invoices=await search.json(),results=(Array.isArray(invoices.results)?invoices.results:[])
       .filter((x:any)=>x.preapproval_id===row.preapproval_id&&x.payment?.status==="approved"&&x.currency_id==="BRL"&&Math.round(Number(x.transaction_amount)*100)===row.amount_cents&&x.debit_date&&x.id)
       .sort((a:any,b:any)=>Date.parse(a.debit_date)-Date.parse(b.debit_date));
     for(const inv of results){
      const {data:ok,error:err}=await service.rpc("entre_premium_recurring_apply",{
       _preapproval:row.preapproval_id,_invoice:String(inv.id),_debit:inv.debit_date,_amount_cents:row.amount_cents
      });
      if(!err&&ok===true)applied++;
     }
    }
   }
   const {data:latest}=await service.from("entre_premium_recurring").select("status,last_invoice_at").eq("id",row.id).maybeSingle();
   const {data:paid}=await service.from("entre_premium_subscriptions").select("status,paid_until").eq("user_id",user.id).maybeSingle();
   return reply({status:latest?.status||row.status,last_invoice_at:latest?.last_invoice_at||null,
    premium_active:paid?.status==="authorized"&&Date.parse(paid.paid_until)>Date.now(),paid_until:paid?.paid_until||null,
    invoices_checked:applied});
  }
  return reply({error:"invalid_action"},400);
 }catch(e){console.error("premium-recurring",String(e));return reply({error:"recurring_unavailable"},503)}
});