/* entre. · one global search across people, posts, and app areas. */
(function(){
'use strict';
const s={term:'',people:[],posts:[],busy:false,error:'',pending:0,convoTerm:'',convoPeople:[],convoBusy:false};
const clean=q=>String(q||'').trim().slice(0,60);
const personList=(people,small=false)=>people.length?people.map(p=>'<article class="global-result"><div class="global-result-avatar">'+avatar(p)+'</div><div class="global-result-info"><strong>'+esc(p.display_name)+'</strong><small>@'+esc(p.username||'')+(p.is_online?' · online':'')+'</small></div><button type="button" data-site-search="profile" data-username="'+esc(p.username||'')+'">Perfil '+ico('arrow',14)+'</button></article>').join(''):
 '<p class="global-search-empty">'+(s.busy?'Buscando pessoas…':'Nenhum perfil encontrado.')+'</p>';
function view(){
 return heading('PESQUISA','Pesquisar','Pesquise pessoas, publicações, salas e lives.')+
 '<section class="global-search-shell"><div class="global-search-field">'+ico('search',22)+'<label class="sr-only" for="globalSearchInput">Pesquisar no CONNECT</label><input id="globalSearchInput" type="search" maxlength="60" placeholder="Pesquisar no CONNECT · @, pessoas e posts" value="'+esc(s.term)+'" autocomplete="off" spellcheck="false" autocapitalize="none"><button data-site-search="clear" type="button" aria-label="Limpar pesquisa">'+ico('close',18)+'</button></div>'+
 '<div class="global-search-shortcuts"><button type="button" data-site-search="open" data-target="rooms">🇧🇷 Salas do Brasil</button><button type="button" data-site-search="open" data-target="lives">'+ico('camera',16)+' Lives</button><button type="button" data-site-search="open" data-target="online">'+ico('users',16)+' Pessoas online</button></div>'+
 '<div id="globalSearchContents" aria-live="polite">'+results()+'</div></section>';
}
function results(){
 if(s.term.trim().length<2)return '<div class="global-search-welcome"><span class="cn-search-empty-icon">'+ico('search',29)+'</span><h3>Pesquisar</h3><p>Digite um nome, @ ou palavra.</p></div>';
 return (s.error?'<p class="global-search-error" role="alert">'+esc(s.error)+'</p>':'')+
 '<section class="global-search-section"><h3>Pessoas <span>'+s.people.length+'</span></h3>'+personList(s.people)+'</section>'+
 '<section class="global-search-section"><h3>Publicações <span>'+s.posts.length+'</span></h3>'+
 (s.posts.length?s.posts.map(p=>'<article class="search-post-hit"><div><strong>'+esc(p.display_name||'Pessoa')+'</strong><small> @'+esc(p.username||'')+'</small></div><p>'+esc(p.body||'Publicação com mídia')+'</p><button type="button" data-site-search="open" data-target="posts">Abrir Feed '+ico('arrow',14)+'</button></article>').join(''):
 '<p class="global-search-empty">'+(s.busy?'Buscando publicações…':'Nenhuma publicação correspondente.')+'</p>')+'</section>';
}
function update(id,html){const el=document.getElementById(id);if(el)el.innerHTML=html;}
async function searchAll(){
 const term=clean(s.term);const rev=++s.pending;
 if(term.length<2){s.people=[];s.posts=[];s.error='';s.busy=false;update('globalSearchContents',results());return;}
 s.busy=true;s.error='';update('globalSearchContents',results());
 const [a,b]=await Promise.allSettled([
  db.rpc('entre_user_search',{_query:term.replace(/^@/,'')}),
  db.rpc('entre_site_posts_search',{_query:term})
 ]);
 if(s.pending!==rev)return;
 s.people=a.status==='fulfilled'&&!a.value.error&&Array.isArray(a.value.data)?a.value.data:[];
 s.posts=b.status==='fulfilled'&&!b.value.error&&Array.isArray(b.value.data)?b.value.data:[];
 s.busy=false;
 if(a.status==='rejected'||b.status==='rejected')s.error='Parte da pesquisa ficou indisponível. Tente novamente.';
 update('globalSearchContents',results());
 await Promise.allSettled(s.people.filter(p=>p.avatar_path).map(p=>signAvatar(p)));
 if(s.pending===rev)update('globalSearchContents',results());
}
function conversationSearchMarkup(){
 return '<section class="conversation-person-lookup"><label for="conversationSearchInput">'+ico('search',18)+' Encontre alguém pelo @</label><div class="global-search-field"><input id="conversationSearchInput" maxlength="40" type="search" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="@usuario ou nome" value="'+esc(s.convoTerm)+'"></div><div id="conversationSearchResults" aria-live="polite">'+conversationResults()+'</div></section>';
}
function conversationResults(){
 if(s.convoTerm.length<2)return '<small>Busque um perfil para seguir ou começar uma conversa.</small>';
 if(s.convoBusy)return '<small>Buscando perfis…</small>';
 return personList(s.convoPeople,true);
}
let timer,convoTimer;
document.addEventListener('input',e=>{
 if(e.target?.id==='globalSearchInput'){
  s.term=e.target.value;clearTimeout(timer);const rev=++s.pending;
  if(clean(s.term).length<2){s.people=[];s.posts=[];s.busy=false;update('globalSearchContents',results());return;}
  s.busy=true;update('globalSearchContents',results());timer=setTimeout(()=>void searchAll(),280);
 }
 if(e.target?.id==='conversationSearchInput'){
  s.convoTerm=e.target.value.trim();clearTimeout(convoTimer);
  const req=++s.pending;s.convoPeople=[];s.convoBusy=s.convoTerm.length>=2;
  update('conversationSearchResults',conversationResults());
  if(s.convoBusy)convoTimer=setTimeout(async()=>{
   const r=await db.rpc('entre_user_search',{_query:s.convoTerm.replace(/^@/,'')});
   if(req!==s.pending)return;
   s.convoPeople=Array.isArray(r.data)?r.data:[];s.convoBusy=false;
   update('conversationSearchResults',conversationResults());
   await Promise.allSettled(s.convoPeople.filter(p=>p.avatar_path).map(p=>signAvatar(p)));
   update('conversationSearchResults',conversationResults());
  },280);
 }
});
document.addEventListener('click',e=>{
 const btn=e.target.closest('[data-site-search]');if(!btn)return;
 if(btn.dataset.siteSearch==='clear'){s.term='';s.people=[];s.posts=[];document.getElementById('globalSearchInput').value='';update('globalSearchContents',results());document.getElementById('globalSearchInput').focus();}
 if(btn.dataset.siteSearch==='open')nav(btn.dataset.target);
 if(btn.dataset.siteSearch==='profile')void window.entreSocial?.openUsernameProfile?.(btn.dataset.username);
});
window.entreSearch={view,conversationSearchMarkup,search:searchAll};
})();