/* entre.: user-handle discovery and shareable profile links. */
(function(){
 'use strict';
 const api=window.entreSocial;
 if(!api)return;
 const data=api.data;
 const originalOnline=api.onlineView;
 let debounce=null,revision=0;
 data.peopleQuery='';
 data.peopleResults=[];
 data.peopleSearching=false;
 data.peopleSearchError='';
 const clean=value=>String(value||'').trim().replace(/^@/,'').toLowerCase();

 function resultsMarkup(){
  const term=clean(data.peopleQuery);
  if(term.length<2)return '<p class="people-search-hint">Digite pelo menos duas letras do nome ou @.</p>';
  if(data.peopleSearching)return '<p class="people-search-hint">Buscando perfis…</p>';
  if(data.peopleSearchError)return '<p class="people-search-hint" role="alert">'+esc(data.peopleSearchError)+'</p>';
  if(!data.peopleResults.length)return '<p class="people-search-hint">Nenhuma pessoa encontrada com esse @ ou nome.</p>';
  return '<div class="online-card-grid people-results">'+data.peopleResults.map(p=>api.personCard(p).replace(' ONLINE AGORA',' '+(p.is_online?'ONLINE AGORA':'PERFIL ENCONTRADO'))).join('')+'</div>';
 }
 function resultsPaint(){
  const el=document.getElementById('peopleSearchResults');
  if(el)el.innerHTML=resultsMarkup();
 }
 function lookupMarkup(){
  return '<section class="people-lookup"><label for="peopleSearchInput">Encontre alguém por @ ou nome</label>'+
   '<div class="people-search-field">'+ico('search',19)+
   '<input type="search" id="peopleSearchInput" maxlength="40" placeholder="@usuario ou nome" aria-label="Buscar por arroba ou nome" autocapitalize="none" autocomplete="off" spellcheck="false" value="'+esc(data.peopleQuery)+'">'+
   '<button class="ui-btn btn-quiet btn-sm" type="button" data-action="peopleClearSearch">Limpar</button></div>'+
   '<div id="peopleSearchResults" aria-live="polite">'+resultsMarkup()+'</div></section>';
 }
 // Profile lookup now lives in Global Search and Conversations, not Online.
 async function queryPeople(raw){
  const term=clean(raw),myRevision=++revision;
  if(term.length<2){data.peopleResults=[];data.peopleSearching=false;resultsPaint();return [];}
  data.peopleSearching=true;data.peopleSearchError='';resultsPaint();
  try{
   const rows=await api.rpc('entre_user_search',{_query:term});
   if(myRevision!==revision)return [];
   const people=Array.isArray(rows)?rows:[];
   data.peopleResults=people;data.peopleSearching=false;resultsPaint();
   await Promise.allSettled([
    Promise.all(people.filter(p=>p.avatar_path).map(p=>signAvatar(p))),
    window.entreExtras?.loadBadges?.(people)
   ]);
   if(myRevision===revision)resultsPaint();
   return people;
  }catch(error){
   if(myRevision===revision){data.peopleResults=[];data.peopleSearching=false;data.peopleSearchError=infoError(error);resultsPaint();}
   return [];
  }
 }
 document.addEventListener('input',e=>{
  if(e.target?.id!=='peopleSearchInput')return;
  data.peopleQuery=e.target.value;
  clearTimeout(debounce);
  ++revision;
  data.peopleResults=[];data.peopleSearchError='';
  data.peopleSearching=clean(data.peopleQuery).length>=2;
  resultsPaint();
  if(data.peopleSearching)debounce=setTimeout(()=>{void queryPeople(data.peopleQuery);},320);
 });
 document.addEventListener('click',e=>{
  if(!e.target.closest('[data-action="peopleClearSearch"]'))return;
  clearTimeout(debounce);++revision;
  data.peopleQuery='';data.peopleResults=[];data.peopleSearching=false;data.peopleSearchError='';
  const input=document.getElementById('peopleSearchInput');
  if(input){input.value='';input.focus();}
  resultsPaint();
 });
document.addEventListener('focusout',async e=>{
 const field=e.target;
 if(!field||!['newusername','myusername'].includes(field.id))return;
 const note=field.closest('.field')?.querySelector('.username-feedback');
 if(!note)return;
 const handle=String(field.value||'').trim().replace(/^@/,'').toLowerCase();
 note.classList.remove('is-error');
 if(!/^[a-z][a-z0-9_]{2,19}$/.test(handle)){
  note.textContent='Use de 3 a 20 caracteres: letras, números e _, começando por letra.';
  note.classList.add('is-error');return;
 }
 if(state.profile?.username===handle){note.textContent='Este é seu @ atual.';return;}
 note.textContent='Verificando disponibilidade…';
 const {data:available,error}=await db.rpc('entre_username_available',{_username:handle});
 if(String(field.value||'').trim().replace(/^@/,'').toLowerCase()!==handle)return;
 note.textContent=error?'Não foi possível verificar agora. Tente salvar para confirmar.':
  available?'@ disponível!':'Este @ está em uso ou é reservado.';
 note.classList.toggle('is-error',Boolean(error||!available));
},true);
 api.openUsernameProfile=async function(raw){
  const username=clean(raw);
  if(!/^[a-z][a-z0-9_]{2,19}$/.test(username))return;
  if(state.profile?.username===username){nav('profile');return;}
  const results=await queryPeople(username);
  const found=results.find(p=>p.username===username);
  if(!found){toast('Esse @ não foi encontrado ou está indisponível.',true);return;}
  if(found.avatar_path){
   try{
    const response=await fetch('https://trrakyybnvxpdhxwgjrz.supabase.co/functions/v1/entre-shared-profile?u='+encodeURIComponent(username),{
     headers:{apikey:'sb_publishable_OJ4wBPPNVBBcrcNl12yonw_hRSlMKsZ'},cache:'no-store'
    });
    if(response.ok){const preview=(await response.json())?.profile;
     if(preview?.avatar_url)state.avatarUrls[found.avatar_path]={url:preview.avatar_url,expires:Date.now()+150000,local:false};
    }
   }catch(error){console.warn('Shared profile avatar temporarily unavailable');}
  }
  data.peopleQuery='@'+username;
  data.socialProfile=found;
  state.modal='socialProfile';
  render();
 };
})();
