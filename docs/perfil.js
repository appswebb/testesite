(async function(){
 "use strict";
 const q=new URLSearchParams(location.search);
 const handle=String(q.get('u')||"").replace(/^@/,"").trim().toLowerCase();
 const pick=id=>document.getElementById(id);
 const status=pick("shareStatus"),avatar=pick("shareAvatar"),name=pick("shareName"),tag=pick("shareHandle"),bio=pick("shareBio"),actions=pick("shareActions"),copy=pick("shareAgain");
 const safe=/^[a-z][a-z0-9_]{2,19}$/;
 function message(text,bad=false){status.textContent=text;status.classList.toggle('is-error',bad)}
 function initials(text){return String(text||"?").trim().split(/\s+/).slice(0,2).map(s=>s[0]||'').join('').toUpperCase()}
 function button(text,href,type){const el=document.createElement("a");el.className=type;el.href=href;el.textContent=text;return el}
 function setActions(logged){
  actions.replaceChildren();
  if(logged){actions.append(button("Abrir no CONNECT","./?profile="+encodeURIComponent(handle),"share-primary"));}
  else{actions.append(button("Entrar na minha conta","./?auth=login&profile="+encodeURIComponent(handle),"share-primary"));actions.append(button("Criar conta gratuita","./?auth=signup&profile="+encodeURIComponent(handle),"share-secondary"));}
 }
 if(!safe.test(handle)){name.textContent="Link inválido";message("Confira o link compartilhado.",true);setActions(false);return;}
 // Guest previews are fully independent of Supabase Auth. Never await
 // session initialization before fetching the publicly shareable profile.
 setActions(false);
 void (async()=>{
  try{
   if(!window.supabase?.createClient)return;
   const sb=window.supabase.createClient("https://trrakyybnvxpdhxwgjrz.supabase.co","sb_publishable_OJ4wBPPNVBBcrcNl12yonw_hRSlMKsZ",{auth:{autoRefreshToken:false,persistSession:true,detectSessionInUrl:false}});
   const {data}=await sb.auth.getSession();
   if(data?.session)setActions(true);
  }catch(error){console.warn("Session detection unavailable; continuing in visitor mode.");}
 })();
 try{
  const endpoint="https://trrakyybnvxpdhxwgjrz.supabase.co/functions/v1/entre-shared-profile?u="+encodeURIComponent(handle);
  const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),12000);
  let res;try{res=await fetch(endpoint,{signal:ctrl.signal,headers:{"apikey":"sb_publishable_OJ4wBPPNVBBcrcNl12yonw_hRSlMKsZ","Accept":"application/json"},cache:"no-store"});}finally{clearTimeout(timeout);}
  if(!res.ok)throw Error(res.status===404?"Este perfil não está disponível.":"Não foi possível abrir este perfil agora.");
  const data=await res.json(),p=data?.profile;
  if(!p||p.username!==handle)throw Error("Este perfil não está disponível.");
  window.connectBanners?.paint?.(pick("shareBanner"),p.banner);
  name.textContent=String(p.display_name||"Pessoa do CONNECT").slice(0,90);tag.textContent="@"+p.username;bio.textContent=String(p.bio||"Esta pessoa ainda não escreveu uma apresentação.").slice(0,900);
  avatar.setAttribute("aria-label","Foto de "+(p.display_name||"perfil"));
  avatar.textContent=initials(p.display_name);
  if(p.avatar_url&&/^https:\/\/[^\s]+$/.test(p.avatar_url)){
   const img=new Image();img.alt="Foto de "+(p.display_name||"perfil");img.referrerPolicy="no-referrer";
   img.onload=()=>avatar.replaceChildren(img);
   img.onerror=()=>{avatar.textContent=initials(p.display_name);message("Perfil carregado. A foto está temporariamente indisponível.");};
   img.src=p.avatar_url;
  }
  document.title=(p.display_name||"Perfil")+" (@"+p.username+") · CONNECT";
  copy.hidden=false;message("Perfil compartilhado com segurança pelo CONNECT");
  copy.onclick=async()=>{
   try{if(navigator.share){await navigator.share({title:document.title,url:location.href});return;}await navigator.clipboard.writeText(location.href);message("Link copiado!");}
   catch(error){if(error?.name!=="AbortError")message("Use a opção compartilhar do navegador.");}
  };
 }catch(error){name.textContent="Perfil indisponível";tag.textContent="@"+handle;avatar.textContent="?";bio.textContent="Esta conta não pode ser exibida ou o link está incorreto.";message(error?.name==="AbortError"?"A conexão demorou. Atualize e tente novamente.":error.message,true)}
})();
