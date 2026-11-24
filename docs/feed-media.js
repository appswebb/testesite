/* entre. Feed media uploads with compact image crop editor. */
(function(){
'use strict';
const bucket='entre-post-media';
const media={file:null,kind:null,blob:null,preview:null,cropImage:null,cropUrl:null,urls:new Map(),posting:false};
const fmtBytes=size=>(size/1024/1024).toFixed(1)+' MB';
function pending(){return Boolean(media.blob&&media.kind);}
function composeMarkup(){
 return '<div class="feed-media-tools">'+
 '<label class="feed-add-media" for="postMediaInput">'+ico('image',18)+' Adicionar mídia'+
 '<input id="postMediaInput" type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/webm" hidden></label>'+
 (pending()?'<button type="button" class="feed-remove-media" data-action="feedMediaRemove">'+ico('close',15)+' Remover mídia</button>':'')+
 '<small>Foto com recorte · Vídeo MP4/WebM até 25 MB</small></div>'+
 (pending()?'<div class="feed-media-preview">'+(media.kind==='image'?'<img alt="Prévia da foto do post" src="'+esc(media.preview)+'">':
 '<video controls playsinline preload="metadata" src="'+esc(media.preview)+'"></video>')+'</div>':'');
}
function postMarkup(p){
 if(!p?.media_path)return '';
 const item=media.urls.get(p.media_path);
 if(!item||item.expires<Date.now())return '<p class="feed-media-loading">Carregando mídia protegida…</p>';
 if(p.media_type==='image')return '<div class="feed-post-media"><img loading="lazy" decoding="async" alt="Foto compartilhada na publicação" src="'+esc(item.url)+'"></div>';
 if(p.media_type==='video')return '<div class="feed-post-media"><video controls playsinline preload="metadata" src="'+esc(item.url)+'"></video></div>';
 return '';
}
async function signPosts(posts){
 const unique=[...new Set((posts||[]).map(p=>p.media_path).filter(Boolean))];
 await Promise.allSettled(unique.map(async path=>{
  if(media.urls.get(path)?.expires>Date.now()+70000)return;
  const {data,error}=await db.storage.from(bucket).createSignedUrl(path,600);
  if(error||!data?.signedUrl){console.warn('Mídia protegida indisponível');return;}
  media.urls.set(path,{url:data.signedUrl,expires:Date.now()+570000});
 }));
}
function clearMedia(){
 if(media.preview){URL.revokeObjectURL(media.preview);media.preview=null;}
 if(media.cropUrl){URL.revokeObjectURL(media.cropUrl);media.cropUrl=null;}
 media.blob=null;media.kind=null;media.file=null;media.cropImage=null;
 document.getElementById('feedCropOverlay')?.remove();
}
function validateFile(file){
 if(!file)throw Error('Selecione um arquivo.');
 if(['image/jpeg','image/png','image/webp'].includes(file.type)){
  if(file.size>12*1024*1024)throw Error('A foto deve ter até 12 MB antes do recorte.');
  return 'image';
 }
 if(['video/mp4','video/webm'].includes(file.type)){
  if(file.size>25*1024*1024)throw Error('O vídeo deve ter no máximo 25 MB.');
  return 'video';
 }
 throw Error('Use foto JPG, PNG ou WebP, ou vídeo MP4/WebM.');
}
function cropSettings(){
 const overlay=document.getElementById('feedCropOverlay');
 return {aspect:Number(overlay?.querySelector('#feedCropAspect')?.value||1),zoom:Number(overlay?.querySelector('#feedCropZoom')?.value||1),x:Number(overlay?.querySelector('#feedCropX')?.value||50)/100,y:Number(overlay?.querySelector('#feedCropY')?.value||50)/100};
}
function drawCrop(canvas,size=600){
 const img=media.cropImage;if(!img)return;
 const {aspect,zoom,x,y}=cropSettings();
 const ctx=canvas.getContext('2d',{alpha:false});
 if(!ctx)return;
 canvas.width=size;canvas.height=Math.round(size/aspect);
 const sw=Math.min(img.naturalWidth,img.naturalHeight*aspect)/zoom;
 const sh=sw/aspect;
 const sx=Math.max(0,img.naturalWidth-sw)*x,sy=Math.max(0,img.naturalHeight-sh)*y;
 ctx.fillStyle='#f6f5ee';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.imageSmoothingQuality='high';
 ctx.drawImage(img,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
}
function redrawPreview(){const canvas=document.getElementById('feedCropCanvas');if(canvas)drawCrop(canvas,560);}
function showCrop(){
 const div=document.createElement('div');div.id='feedCropOverlay';div.className='feed-crop-overlay';
 div.setAttribute('role','dialog');div.setAttribute('aria-modal','true');div.setAttribute('aria-label','Recortar foto para o feed');
 div.innerHTML='<div class="feed-crop-dialog"><header><div><span>ENTRE. · FOTO DO FEED</span><h2>Ajuste sua foto</h2><p>Recorte rápido, independente da foto de perfil.</p></div><button type="button" data-feed-crop="cancel" aria-label="Cancelar">×</button></header>'+
 '<div class="feed-crop-image"><canvas id="feedCropCanvas" aria-label="Prévia do recorte"></canvas></div>'+
 '<div class="feed-crop-options"><label>Formato<select id="feedCropAspect"><option value="1">Quadrado (1:1)</option><option value="0.8">Retrato (4:5)</option><option value="1.7777778">Paisagem (16:9)</option></select></label>'+
 '<label>Zoom<input id="feedCropZoom" type="range" min="1" max="3" step=".05" value="1"></label>'+
 '<label>Horizontal<input id="feedCropX" type="range" min="0" max="100" step="1" value="50"></label>'+
 '<label>Vertical<input id="feedCropY" type="range" min="0" max="100" step="1" value="50"></label></div>'+
 '<footer><button type="button" data-feed-crop="cancel">Cancelar</button><button type="button" class="feed-crop-apply" data-feed-crop="apply">Usar esta foto</button></footer></div>';
 document.body.append(div);
 div.querySelectorAll('input,select').forEach(el=>el.addEventListener('input',redrawPreview));
 redrawPreview();div.querySelector('#feedCropAspect')?.focus();
}
async function choose(file){
 const type=validateFile(file);
 clearMedia();
 if(type==='video'){media.kind='video';media.blob=file;media.preview=URL.createObjectURL(file);renderView();return;}
 media.cropUrl=URL.createObjectURL(file);
 const img=new Image();
 await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Não consegui abrir essa foto.'));img.src=media.cropUrl;});
 media.cropImage=img;showCrop();
}
async function applyCrop(){
 const overlay=document.getElementById('feedCropOverlay');
 if(!overlay||!media.cropImage)return;
 const apply=overlay.querySelector('.feed-crop-apply');apply.disabled=true;
 try{
  const canvas=document.createElement('canvas');drawCrop(canvas,1200);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.83));
  if(!blob||blob.size>5*1024*1024)throw Error('Essa foto ficou grande demais. Escolha outra.');
  media.blob=blob;media.kind='image';media.preview=URL.createObjectURL(blob);
  media.cropImage=null;URL.revokeObjectURL(media.cropUrl);media.cropUrl=null;
  overlay.remove();renderView();
 }catch(error){toast(error.message||'Não foi possível recortar.',true);apply.disabled=false;}
}
async function publish(body){
 if(!pending())throw Error('Escolha uma mídia para publicar.');
 if(media.posting)return;
 const text=String(body||'').trim();if(text.length>900)throw Error('Máximo de 900 caracteres.');
 const blob=media.blob,kind=media.kind;
 const ext=kind==='image'?'webp':blob.type==='video/webm'?'webm':'mp4';
 const mime=kind==='image'?'image/webp':blob.type;
 const path=state.session.user.id+'/'+crypto.randomUUID()+'.'+ext;
 media.posting=true;
 try{
  const {error:uploadError}=await db.storage.from(bucket).upload(path,blob,{contentType:mime,upsert:false,cacheControl:'3600'});
  if(uploadError)throw uploadError;
  try{
   const {error}=await db.rpc('entre_post_create_media',{_body:text,_media_path:path,_media_type:kind});
   if(error)throw error;
  }catch(error){await db.storage.from(bucket).remove([path]).catch(()=>{});throw error;}
  clearMedia();toast(kind==='image'?'Foto publicada no Feed.':'Vídeo publicado no Feed.',false,'publish');
 }finally{media.posting=false;}
}
async function removePostMedia(p){if(p?.media_path&&p.author_id===state.session?.user?.id){await db.storage.from(bucket).remove([p.media_path]).catch(()=>{});media.urls.delete(p.media_path);}}
document.addEventListener('change',async event=>{
 if(event.target?.id!=='postMediaInput')return;
 const file=event.target.files?.[0];event.target.value='';if(!file)return;
 try{await choose(file);}catch(error){clearMedia();toast(error.message||'Não foi possível abrir o arquivo.',true);}
});
document.addEventListener('click',async event=>{
 const action=event.target.closest('[data-feed-crop]')?.dataset.feedCrop;
 if(action==='cancel'){clearMedia();return;}
 if(action==='apply'){await applyCrop();return;}
 if(event.target.closest('[data-action="feedMediaRemove"]')){clearMedia();renderView();}
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.getElementById('feedCropOverlay'))clearMedia();});
window.entreMedia={composeMarkup,postMarkup,signPosts,clearMedia,publish,pending,removePostMedia};
})();