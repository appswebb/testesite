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
  actions.append(button("Ir para o site ↗","./","share-primary"));
  if(logged){actions.append(button("Abrir perfil dentro do entre.","./?profile="+encodeURIComponent(handle),"share-secondary"));}
  else{actions.append(button("Entrar na minha conta","./?auth=login","share-secondary"));actions.append(button("Criar conta gratuita","./?auth=signup","share-secondary"));}
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
  const res=await fetch(endpoint,{headers:{"apikey":"sb_publishable_OJ4wBPPNVBBcrcNl12yonw_hRSlMKsZ","Accept":"application/json"},cache:"no-store"});
  if(!res.ok)throw Error(res.status===404?"Este perfil não está disponível.":"Não foi possível abrir este perfil agora.");
  const data=await res.json(),p=data?.profile;
  if(!p||p.username!==handle)throw Error("Este perfil não está disponível.");
  name.textContent=p.display_name||"Pessoa do entre.";tag.textContent="@"+p.username;bio.textContent=p.bio||"Esta pessoa ainda não escreveu uma apresentação.";
  avatar.setAttribute("aria-label","Foto de "+(p.display_name||"perfil"));
  avatar.textContent=initials(p.display_name);
  if(p.avatar_url&&/^https:\/\/[^\s]+$/.test(p.avatar_url)){
   const img=new Image();img.alt="Foto de "+(p.display_name||"perfil");img.referrerPolicy="no-referrer";
   img.onload=()=>avatar.replaceChildren(img);
   img.onerror=()=>{avatar.textContent=initials(p.display_name);message("Perfil carregado. A foto está temporariamente indisponível.");};
   img.src=p.avatar_url;
  }
  document.title=(p.display_name||"Perfil")+" (@"+p.username+") · entre.";
  copy.hidden=false;message("Perfil compartilhado com segurança pelo entre.");
  copy.onclick=async()=>{
   try{if(navigator.share){await navigator.share({title:document.title,url:location.href});return;}await navigator.clipboard.writeText(location.href);message("Link copiado!");}
   catch(error){if(error?.name!=="AbortError")message("Use a opção compartilhar do navegador.");}
  };
 }catch(error){name.textContent="Perfil indisponível";tag.textContent="@"+handle;avatar.textContent="?";bio.textContent="Esta conta não pode ser exibida ou o link está incorreto.";message(error.message,true)}
})();
