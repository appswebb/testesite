/* Community stories · private, ephemeral media, 24-hour lifetime. */
(function(){
'use strict';
const bucket='entre-story-media';
const data={rows:[],urls:new Map(),loading:false,busy:false,open:null,file:null};
const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const active=()=>state?.view==='posts';
function markup(){
 const cards=data.rows.map((r,i)=>'<button type="button" class="story-tile" data-story-action="open" data-story-index="'+i+'"><span class="story-ring">'+safe(r.author_name.slice(0,1).toUpperCase())+'</span><strong>'+safe(r.author_name)+'</strong></button>').join('');
 return '<section class="stories-shell" aria-label="Stories da comunidade"><div class="stories-head"><h3>Stories <small>24 horas</small></h3><button type="button" data-story-action="compose">+ Criar story</button></div><div class="stories-strip"><button type="button" class="story-tile story-add" data-story-action="compose"><span class="story-ring">+</span><strong>Seu story</strong></button>'+cards+'</div></section>';
}
async function refresh(repaint=true){
 if(data.loading||!state?.session)return;
 data.loading=true;
 try{
  const {data:rows,error}=await db.rpc('entre_stories_list');if(error)throw error;
  data.rows=Array.isArray(rows)?rows:[];
  if(repaint&&active())renderView();
 }catch(error){console.warn('Stories indisponíveis:',error.message||error);}
 finally{data.loading=false;}
}
async function signed(path){
 const cache=data.urls.get(path);
 if(cache&&cache.until>Date.now())return cache.url;
 const {data:result,error}=await db.storage.from(bucket).createSignedUrl(path,300);
 if(error||!result?.signedUrl)throw Error('Não foi possível carregar esta mídia.');
 data.urls.set(path,{url:result.signedUrl,until:Date.now()+260000});
 return result.signedUrl;
}
function dialog(content){close();const el=document.createElement('div');el.id='entreStoriesDialog';el.className='stories-overlay';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Stories');el.innerHTML='<div class="stories-modal"><button class="stories-close" type="button" data-story-action="close" aria-label="Fechar">×</button>'+content+'</div>';document.body.appendChild(el);}
function close(){document.getElementById('entreStoriesDialog')?.remove();data.open=null;}
function compose(){
 dialog('<h3>Criar story</h3><p>Compartilhe uma foto ou vídeo por 24 horas.</p><form id="storyPublishForm"><label>Foto ou vídeo<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" name="media" required></label><label>Legenda (opcional)<input name="caption" maxlength="180" placeholder="Um momento para compartilhar…"></label><button type="submit">Publicar story</button></form>');
}
async function show(index){
 const row=data.rows[index];if(!row)return close();
 data.open=index;
 dialog('<div class="story-viewer"><div class="story-viewer-head"><strong>'+safe(row.author_name)+'</strong><small>'+new Date(row.created_at).toLocaleString('pt-BR')+'</small></div><div class="story-viewer-media" id="storyMedia">Carregando story…</div><p>'+safe(row.caption)+'</p><div class="story-viewer-controls"><button type="button" data-story-action="previous" '+(index===0?'disabled':'')+'>Anterior</button>'+(row.author_id===state.session.user.id?'<button type="button" data-story-action="delete">Excluir</button>':'')+'<button type="button" data-story-action="next" '+(index===data.rows.length-1?'disabled':'')+'>Próximo</button></div></div>');
 data.open=index;
 try{
  const url=await signed(row.media_path);
  const target=document.getElementById('storyMedia');
  if(!target||data.open!==index)return;
  const media=row.media_type==='image'?document.createElement('img'):document.createElement('video');
  media.src=url;media.alt='Story publicado por '+row.author_name;
  if(row.media_type==='video'){media.controls=true;media.playsInline=true;media.autoplay=true;}
  target.replaceChildren(media);
 }catch(e){const target=document.getElementById('storyMedia');if(target)target.textContent=e.message;}
}
async function prepare(file){
 if(['video/mp4','video/webm'].includes(file.type)){if(file.size>25*1024*1024)throw Error('O vídeo deve ter até 25 MB.');return {blob:file,ext:file.type==='video/webm'?'webm':'mp4',kind:'video',type:file.type};}
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024)throw Error('Escolha uma foto JPG, PNG ou WebP de até 12 MB.');
 const object=URL.createObjectURL(file);
 try{
  const img=new Image();await new Promise((res,rej)=>{img.onload=res;img.onerror=()=>rej(Error('Foto inválida.'));img.src=object;});
  const scale=Math.min(1,1280/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
  canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
  const blob=await new Promise(res=>canvas.toBlob(res,'image/webp',.8));if(!blob)throw Error('Não foi possível preparar a imagem.');
  return {blob,ext:'webp',kind:'image',type:'image/webp'};
 }finally{URL.revokeObjectURL(object);}
}
async function publish(form){
 if(data.busy)return;data.busy=true;
 const btn=form.querySelector('[type=submit]');if(btn)btn.disabled=true;
 let path='';
 try{
  const file=form.elements.media.files[0];if(!file)throw Error('Selecione uma foto ou um vídeo.');
  const item=await prepare(file);
  path=state.session.user.id+'/'+crypto.randomUUID()+'.'+item.ext;
  const {error:up}=await db.storage.from(bucket).upload(path,item.blob,{contentType:item.type,upsert:false});
  if(up)throw up;
  const {error}=await db.rpc('entre_story_create',{_path:path,_type:item.kind,_caption:form.elements.caption.value.trim()});
  if(error)throw error;
  close();await refresh();toast('Story publicado por 24 horas.');
 }catch(e){if(path)await db.storage.from(bucket).remove([path]).catch(()=>{});toast(e.message||'Não foi possível publicar o story.',true);}
 finally{data.busy=false;if(btn?.isConnected)btn.disabled=false;}
}
async function remove(){
 const row=data.rows[data.open];if(!row||row.author_id!==state.session.user.id||!confirm('Excluir este story?'))return;
 const {error}=await db.rpc('entre_story_delete',{_id:row.id});if(error)throw error;
 await db.storage.from(bucket).remove([row.media_path]).catch(()=>{});
 close();await refresh();toast('Story excluído.');
}
document.addEventListener('click',event=>{
 const btn=event.target.closest?.('[data-story-action]');if(!btn)return;
 const action=btn.dataset.storyAction;
 if(action==='compose')compose();else if(action==='close')close();
 else if(action==='open')void show(Number(btn.dataset.storyIndex));
 else if(action==='previous')void show(Math.max(0,data.open-1));
 else if(action==='next')void show(Math.min(data.rows.length-1,data.open+1));
 else if(action==='delete')void remove().catch(e=>toast(e.message,true));
});
document.addEventListener('submit',event=>{if(event.target?.id!=='storyPublishForm')return;event.preventDefault();void publish(event.target);});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.getElementById('entreStoriesDialog'))close();});
window.entreStories={markup,refresh,close};
})();