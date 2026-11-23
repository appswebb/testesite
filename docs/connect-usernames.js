/* CONNECT: user-handle discovery and shareable profile links. */
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
 api.onlineView=function(){
  const html=originalOnline();
  return html.replace('<div class="online-controls">',lookupMarkup()+'<div class="online-controls">');
 };
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
 api.openUsernameProfile=async function(raw){
  const username=clean(raw);
  if(!/^[a-z][a-z0-9_]{2,19}$/.test(username))return;
  if(state.profile?.username===username){nav('profile');return;}
  const results=await queryPeople(username);
  const found=results.find(p=>p.username===username);
  if(!found){toast('Esse @ não foi encontrado ou está indisponível.',true);return;}
  data.peopleQuery='@'+username;
  data.socialProfile=found;
  state.view='online';
  state.modal='socialProfile';
  render();
 };
})();
