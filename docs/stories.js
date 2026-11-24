/* Stories: 24-hour feed, signed private media, accessible uploader and viewer. */
(function(){
'use strict';
const bucket='entre-story-media';
const data={rows:[],urls:new Map(),loading:false,error:'',busy:false,open:null,previewUrl:null,inFlight:null};
const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const logged=()=>Boolean(window.state?.session|| (typeof state!=='undefined'&&state.session));
const active=()=>typeof state!=='undefined'&&state.view==='posts';
const person=()=>typeof state!=='undefined'?state.session?.user?.id:null;
const failText=e=>String(e?.message||'Não foi possível concluir. Verifique a conexão e tente novamente.');
function markup(){
 const cards=data.rows.map((r,i)=>'<button type="button" class="story-tile" data-story-action="open" data-story-index="'+i+'" aria-label="Ver story de '+safe(r.author_name||'Pessoa')+'"><span class="story-ring">'+(r.media_type==='image'&&data.urls.get(r.media_path)?.until>Date.now()?'<img src="'+safe(data.urls.get(r.media_path).url)+'" alt="" loading="lazy">':safe(String(r.author_name||'P').slice(0,1).toUpperCase()))+'</span><strong>'+safe(r.author_name||'Pessoa')+'</strong></button>').join('');
 return '<div class="cn-feed-stories" aria-label="Stories da comunidade">'+(cards?'<div class="stories-strip">'+cards+'</div>':'')+(data.error?'<div class="stories-alert" role="status">Os stories não puderam ser carregados. <button type="button" data-story-action="retry">Tentar novamente</button></div>':!data.rows.length?'<p class="stories-empty-note">'+(data.loading?'Carregando stories…':'Nenhum story publicado.')+'</p>':'')+'</div>';
}
async function refresh(repaint=true,force=false){
 if(!person())return [];
 if(data.inFlight){if(!force)return data.inFlight;await data.inFlight.catch(()=>{});}
 data.loading=true;data.error='';
 data.inFlight=(async()=>{
  const {data:rows,error}=await db.rpc('entre_stories_list');
  if(error)throw error;
  data.rows=Array.isArray(rows)?rows:[];
  const paths=[...new Set(data.rows.filter(x=>x.media_type==='image').map(x=>x.media_path).filter(Boolean))].slice(0,40).filter(path=>!(data.urls.get(path)?.until>Date.now()));
  if(paths.length)try{
    const {data:images,error:err}=await db.storage.from(bucket).createSignedUrls(paths,300);
    if(err)throw err;
    (images||[]).forEach((item,i)=>{if(item?.signedUrl)data.urls.set(paths[i],{url:item.signedUrl,until:Date.now()+270000});});
  }catch(err){console.warn('Miniaturas privadas indisponíveis:',err);}
  return data.rows;
 })();
 try{return await data.inFlight;}
 catch(e){data.error=failText(e);console.warn('Stories indisponíveis:',e);return [];}
 finally{data.loading=false;data.inFlight=null;if(repaint&&active())renderView();}
}
async function signed(path){
 const cached=data.urls.get(path);
 if(cached&&cached.until>Date.now())return cached.url;
 const {data:result,error}=await db.storage.from(bucket).createSignedUrl(path,300);
 if(error||!result?.signedUrl)throw Error('Não foi possível carregar esta mídia privada.');
 data.urls.set(path,{url:result.signedUrl,until:Date.now()+270000});
 return result.signedUrl;
}
function clearPreview(){if(data.previewUrl){URL.revokeObjectURL(data.previewUrl);data.previewUrl=null;}}
function close(){
 clearPreview();document.getElementById('entreStoriesDialog')?.remove();
 document.body.classList.remove('stories-dialog-open');data.open=null;
}
function dialog(content){
 close();
 const el=document.createElement('div');el.id='entreStoriesDialog';el.className='stories-overlay';
 el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Stories');
 el.innerHTML='<div class="stories-modal"><button class="stories-close" type="button" data-story-action="close" aria-label="Fechar">×</button>'+content+'</div>';
 document.body.appendChild(el);document.body.classList.add('stories-dialog-open');
 el.querySelector('.stories-close')?.focus();
}
function compose(){
 if(!person()){toast('Faça login para publicar stories.',true);return;}
 dialog('<div class="stories-compose"><span class="stories-kicker">COMPARTILHAR UM MOMENTO</span><h3>Novo story</h3><p>Escolha uma foto ou vídeo. O story ficará visível por até 24 horas.</p><form id="storyPublishForm"><label>Foto ou vídeo<input id="storyMediaInput" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" name="media" required></label><div class="story-compose-preview" id="storyComposePreview" hidden></div><label>Legenda (opcional)<input name="caption" maxlength="180" placeholder="Conte algo sobre este momento…"></label><p id="storyComposeError" class="stories-form-error" role="alert" hidden></p><button type="submit">Publicar story</button><small>Até 12 MB por foto ou 25 MB por vídeo · sem localização exata</small></form></div>');
 document.getElementById('storyMediaInput')?.focus();
}
async function show(index){
 const row=data.rows[index];if(!row)return close();
 dialog('<div class="story-viewer"><div class="story-viewer-head"><strong>'+safe(row.author_name||'Pessoa')+'</strong><small>'+new Date(row.created_at).toLocaleString('pt-BR')+'</small></div><div class="story-viewer-media" id="storyMedia" role="status">Carregando story…</div><p>'+safe(row.caption||'')+'</p><div class="story-viewer-controls"><button type="button" data-story-action="previous" '+(index===0?'disabled':'')+'>Anterior</button>'+(row.author_id===person()?'<button type="button" data-story-action="delete">Excluir</button>':'')+'<button type="button" data-story-action="next" '+(index===data.rows.length-1?'disabled':'')+'>Próximo</button></div></div>');
 data.open=index;
 try{
  const url=await signed(row.media_path);
  const target=document.getElementById('storyMedia');
  if(!target||data.open!==index)return;
  const media=row.media_type==='image'?document.createElement('img'):document.createElement('video');
  media.src=url;
  if(row.media_type==='image')media.alt='Story publicado por '+(row.author_name||'Pessoa');
  if(row.media_type==='video'){media.controls=true;media.playsInline=true;media.preload='metadata';}
  media.addEventListener('error',()=>{if(target.isConnected)target.textContent='Não foi possível reproduzir esta mídia.';},{once:true});
  target.replaceChildren(media);
 }catch(e){const target=document.getElementById('storyMedia');if(target&&data.open===index)target.textContent=failText(e);}
}
function checkFile(file){
 if(!file)throw Error('Escolha uma foto ou vídeo.');
 if(['video/mp4','video/webm'].includes(file.type)){
  if(file.size>25*1024*1024)throw Error('O vídeo deve ter no máximo 25 MB.');
  return 'video';
 }
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024)throw Error('Use JPG, PNG ou WebP de até 12 MB.');
 return 'image';
}
function preview(file){
 clearPreview();const type=checkFile(file),parent=document.getElementById('storyComposePreview');if(!parent)return;
 const url=URL.createObjectURL(file);data.previewUrl=url;
 const node=type==='image'?document.createElement('img'):document.createElement('video');
 node.src=url;
 if(type==='image')node.alt='Prévia da foto do story';
 if(type==='video'){node.controls=true;node.playsInline=true;node.preload='metadata';}
 parent.hidden=false;parent.replaceChildren(node);
}
async function prepare(file){
 const kind=checkFile(file);
 if(kind==='video')return {blob:file,ext:file.type==='video/webm'?'webm':'mp4',kind,type:file.type};
 const object=URL.createObjectURL(file);
 try{
  const image=new Image();
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Não foi possível ler a foto.'));image.src=object;});
  if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>40000000)throw Error('Foto muito grande. Escolha outra imagem.');
  const scale=Math.min(1,1280/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
  canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Não foi possível preparar esta foto.');
  ctx.drawImage(image,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.82));
  if(!blob||blob.size>5*1024*1024)throw Error('A foto não pôde ser processada. Escolha outra.');
  return {blob,ext:'webp',kind:'image',type:'image/webp'};
 }finally{URL.revokeObjectURL(object);}
}
async function publish(form){
 if(data.busy)return;
 data.busy=true;const btn=form.querySelector('[type=submit]');const old=btn?.textContent;
 if(btn){btn.disabled=true;btn.textContent='Publicando…';}
 let path='',created=false;
 const errorBox=document.getElementById('storyComposeError');if(errorBox)errorBox.hidden=true;
 try{
  const file=form.elements.namedItem('media')?.files?.[0];
  const item=await prepare(file);
  if(!person())throw Error('Sua sessão expirou. Entre novamente.');
  path=person()+'/'+crypto.randomUUID()+'.'+item.ext;
  const {error:uploadError}=await db.storage.from(bucket).upload(path,item.blob,{contentType:item.type,upsert:false,cacheControl:'3600'});
  if(uploadError)throw uploadError;
  const {error:createError}=await db.rpc('entre_story_create',{_path:path,_type:item.kind,_caption:String(form.elements.namedItem('caption')?.value||'').trim()});
  if(createError)throw createError;
  created=true;close();await refresh(true,true);
  toast('Story publicado com sucesso.');
 }catch(e){
  if(path&&!created)await db.storage.from(bucket).remove([path]).catch(()=>{});
  if(errorBox&&errorBox.isConnected){errorBox.hidden=false;errorBox.textContent=failText(e);}
  toast(failText(e),true);
 }finally{data.busy=false;if(btn?.isConnected){btn.disabled=false;btn.textContent=old;}}
}
async function remove(){
 const row=data.rows[data.open];
 if(!row||row.author_id!==person()||!confirm('Excluir este story?'))return;
 const {data:removed,error}=await db.rpc('entre_story_delete',{_id:row.id});
 if(error||removed!==true)throw error||Error('Este story não pôde ser excluído.');
 await db.storage.from(bucket).remove([row.media_path]).catch(()=>{});
 data.urls.delete(row.media_path);close();await refresh(true,true);toast('Story excluído.');
}
document.addEventListener('change',event=>{
 if(event.target?.id!=='storyMediaInput')return;
 const box=document.getElementById('storyComposeError');if(box)box.hidden=true;
 try{preview(event.target.files?.[0]);}
 catch(e){clearPreview();if(box){box.hidden=false;box.textContent=failText(e);}event.target.value='';}
});
document.addEventListener('click',event=>{
 const btn=event.target.closest?.('[data-story-action]');if(!btn){
  if(event.target.id==='entreStoriesDialog')close();return;
 }
 const action=btn.dataset.storyAction;
 if(action==='compose')compose();else if(action==='close')close();
 else if(action==='open')void show(Number(btn.dataset.storyIndex));
 else if(action==='previous')void show(Math.max(0,data.open-1));
 else if(action==='next')void show(Math.min(data.rows.length-1,data.open+1));
 else if(action==='delete')void remove().catch(e=>toast(failText(e),true));
 else if(action==='retry')void refresh();
});
document.addEventListener('submit',event=>{
 if(event.target?.id!=='storyPublishForm')return;
 event.preventDefault();void publish(event.target);
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.getElementById('entreStoriesDialog'))close();});
window.entreStories={markup,refresh,close};
})();