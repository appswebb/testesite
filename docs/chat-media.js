/* Private pair-scoped media: photos, short videos and voice notes.
 * Uses signed Storage URLs and RPC permissions; never exposes public bucket links. */
(function(){
'use strict';
const bucket='entre-chat-media';
const mem={pair:null,rows:[],urls:new Map(),loading:null,last:0,busy:false,recording:null};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const current=()=>typeof state!=='undefined'?state.pair?.id:null;
const owner=()=>typeof state!=='undefined'?state.session?.user?.id:null;
const canSend=()=>typeof state!=='undefined'&&state.pair&&
 (state.pair.status==='connected'||(state.pair.status==='active'&&new Date(state.pair.expires_at)>new Date()));
const errorText=e=>String(e?.message||'Não foi possível enviar a mídia.');
function gallery(){return '<section class="enc-media-gallery" id="encMediaGallery" aria-label="Fotos, vídeos e áudios deste encontro" hidden></section>';}
function controls(){
 if(!canSend())return '';
 return '<div class="enc-media-toolbar" aria-label="Compartilhar mídia privada">'+
 '<button type="button" data-chat-media-pick title="Enviar foto ou vídeo"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="9" r="1.5"/><path d="m4 17 5-5 4 4 3-3 5 5"/></svg><span>Foto / vídeo</span></button>'+
 '<button type="button" data-chat-media-record aria-pressed="false" title="Gravar áudio de até 30 segundos"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8"/></svg><span>Gravar áudio</span></button>'+
 '<input type="file" id="encMediaFile" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,audio/webm,audio/mp4" hidden>'+
 '<span id="encMediaStatus" role="status" aria-live="polite"></span></div>';
}
function status(text){const node=document.getElementById('encMediaStatus');if(node)node.textContent=text||'';}
function player(type,url){
 const node=document.createElement(type==='image'?'img':type==='video'?'video':'audio');
 node.src=url;
 if(type==='image'){node.alt='Foto enviada na conversa';node.loading='lazy';}
 else{node.controls=true;node.preload='metadata';if(type==='video')node.playsInline=true;}
 return node;
}
function renderGallery(){
 const root=document.getElementById('encMediaGallery');
 if(!root||!current()||mem.pair!==current())return;
 root.replaceChildren();root.hidden=!mem.rows.length;
 if(!mem.rows.length)return;
 const title=document.createElement('h4');title.textContent='Mídias da conversa';root.append(title);
 const list=document.createElement('div');list.className='enc-media-list';root.append(list);
 for(const row of mem.rows){
  const info=mem.urls.get(row.media_path);if(!info||info.until<Date.now())continue;
  const card=document.createElement('article');card.className='enc-media-item';
  card.append(player(row.media_type,info.url));
  const tail=document.createElement('div');tail.className='enc-media-item-meta';
  const note=document.createElement('span');note.textContent=
   (row.sender_id===owner()?'Você':'Outra pessoa')+' · '+
   new Date(row.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  tail.append(note);
  if(row.sender_id===owner()){
   const del=document.createElement('button');del.type='button';del.dataset.chatMediaDelete=row.id;del.textContent='Excluir';del.title='Excluir mídia enviada';tail.append(del);
  }
  card.append(tail);list.append(card);
 }
}
async function refresh(force=false){
 const pair=current(),node=document.getElementById('encMediaGallery');
 if(!pair||!node||!owner())return;
 if(mem.loading)return mem.loading;
 if(!force&&mem.pair===pair&&Date.now()-mem.last<7000){renderGallery();return;}
 mem.loading=(async()=>{
  const {data,error}=await db.rpc('entre_chat_media_list',{_pair:pair});
  if(error)throw error;
  if(pair!==current())return;
  mem.pair=pair;mem.rows=Array.isArray(data)?data:[];mem.last=Date.now();
  const paths=[...new Set(mem.rows.map(r=>r.media_path).filter(Boolean))].filter(x=>!mem.urls.get(x)||mem.urls.get(x).until<Date.now());
  if(paths.length){
   const {data:links,error:signError}=await db.storage.from(bucket).createSignedUrls(paths,120);
   if(signError)throw signError;
   (links||[]).forEach((obj,i)=>{if(obj?.signedUrl)mem.urls.set(paths[i],{url:obj.signedUrl,until:Date.now()+105000});});
  }
  renderGallery();
 })();
 try{await mem.loading;}catch(e){status('Mídias indisponíveis. Atualize a conversa.');console.warn('Mídias da conversa:',e);}
 finally{mem.loading=null;}
}
function afterRender(){
 if(!document.getElementById('encMediaGallery'))return;
 void refresh();
}
async function prepare(file){
 if(!file)throw Error('Escolha uma foto, um vídeo ou um áudio.');
 if(['video/mp4','video/webm'].includes(file.type)){
  if(file.size>20*1024*1024)throw Error('Vídeo de até 20 MB.');
  return {blob:file,kind:'video',ext:file.type==='video/webm'?'webm':'mp4',mime:file.type};
 }
 if(['audio/webm','audio/mp4'].includes(file.type)){
  if(file.size>7*1024*1024)throw Error('Áudio de até 7 MB.');
  return {blob:file,kind:'audio',ext:file.type==='audio/webm'?'webm':'m4a',mime:file.type};
 }
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024)
  throw Error('Escolha JPG, PNG ou WebP de até 12 MB.');
 const src=URL.createObjectURL(file);
 try{
  const image=new Image();
  await new Promise((ok,bad)=>{image.onload=ok;image.onerror=()=>bad(Error('Imagem inválida.'));image.src=src;});
  if(image.naturalWidth*image.naturalHeight>36000000)throw Error('Imagem grande demais.');
  const scale=Math.min(1,1440/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
  canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Falha ao preparar imagem.');
  ctx.drawImage(image,0,0,canvas.width,canvas.height);
  const blob=await new Promise(ok=>canvas.toBlob(ok,'image/webp',.8));
  if(!blob||blob.size>3000000)throw Error('A imagem compactada excedeu 3 MB.');
  return {blob,kind:'image',ext:'webp',mime:'image/webp'};
 }finally{URL.revokeObjectURL(src);}
}
async function upload(file){
 if(mem.busy)return;
 if(!canSend()||!owner())throw Error('Encontro não está disponível.');
 const pair=current(),uid=owner();
 mem.busy=true;status('Preparando mídia…');
 let path=null,success=false;
 try{
  const item=await prepare(file);
  if(pair!==current()||!canSend())throw Error('O encontro mudou; tente novamente.');
  path=uid+'/'+pair+'/'+crypto.randomUUID()+'.'+item.ext;
  status('Enviando com privacidade…');
  const {error:uploadError}=await db.storage.from(bucket).upload(path,item.blob,{contentType:item.mime,upsert:false,cacheControl:'120'});
  if(uploadError)throw uploadError;
  const {error:saveError}=await db.rpc('entre_chat_media_add',{_pair:pair,_path:path,_kind:item.kind});
  if(saveError)throw saveError;
  success=true;window.connectSound?.play?.('send');status('Enviado com sucesso.');await refresh(true);
 }catch(err){
  if(path&&!success)await db.storage.from(bucket).remove([path]).catch(()=>{});
  status(errorText(err));throw err;
 }finally{mem.busy=false;}
}
function stopRecording(){
 const recording=mem.recording;
 if(!recording)return;
 mem.recording=null;
 if(recording.timer)clearTimeout(recording.timer);
 if(recording.recorder.state!=='inactive')recording.recorder.stop();
 else recording.stream.getTracks().forEach(t=>t.stop());
 document.querySelector('[data-chat-media-record]')?.setAttribute('aria-pressed','false');
}
async function toggleVoice(){
 if(mem.recording){stopRecording();status('Finalizando gravação…');return;}
 if(mem.busy||!canSend())return;
 if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){
  throw Error('Gravação de áudio indisponível neste navegador.');
 }
 const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
 const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(x=>MediaRecorder.isTypeSupported?.(x));
 if(!mime){stream.getTracks().forEach(x=>x.stop());throw Error('Gravação não compatível com o navegador.');}
 const recorder=new MediaRecorder(stream,{mimeType:mime});
 const chunks=[],pair=current();
 recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
 recorder.onstop=()=>{
  stream.getTracks().forEach(x=>x.stop());
  document.querySelector('[data-chat-media-record]')?.setAttribute('aria-pressed','false');
  const file=new File(chunks,'mensagem.'+(mime.includes('webm')?'webm':'m4a'),{type:mime.includes('webm')?'audio/webm':'audio/mp4'});
  if(file.size&&pair===current()&&confirm('Enviar mensagem de áudio?')){
   void upload(file).catch(err=>status(errorText(err)));
  }else status('Gravação descartada.');
 };
 recorder.onerror=()=>{stream.getTracks().forEach(x=>x.stop());mem.recording=null;status('A gravação falhou.');};
 recorder.start(350);
 const timer=setTimeout(stopRecording,30000);
 mem.recording={recorder,stream,timer};
 document.querySelector('[data-chat-media-record]')?.setAttribute('aria-pressed','true');
 status('Gravando… toque de novo para concluir (até 30 s).');
}
document.addEventListener('click',event=>{
 const pick=event.target.closest?.('[data-chat-media-pick]');
 if(pick){document.getElementById('encMediaFile')?.click();return;}
 if(event.target.closest?.('[data-chat-media-record]')){
  void toggleVoice().catch(e=>status(errorText(e)));return;
 }
 const btn=event.target.closest?.('[data-chat-media-delete]');
 if(btn){const row=mem.rows.find(x=>x.id===btn.dataset.chatMediaDelete);
  if(!row||row.sender_id!==owner()||!confirm('Excluir esta mídia?'))return;
  void (async()=>{
   const {data,error}=await db.rpc('entre_chat_media_delete',{_id:row.id});
   if(error||data!==true)throw error||Error('Não foi possível excluir.');
   await db.storage.from(bucket).remove([row.media_path]).catch(()=>{});
   mem.urls.delete(row.media_path);await refresh(true);
  })().catch(e=>status(errorText(e)));
 }
});
document.addEventListener('change',event=>{
 if(event.target?.id!=='encMediaFile')return;
 const file=event.target.files?.[0];event.target.value='';
 if(!file||!confirm('Enviar este arquivo para a outra pessoa?'))return;
 void upload(file).catch(e=>status(errorText(e)));
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mem.recording)stopRecording();});
window.setInterval(()=>{if(document.visibilityState==='visible'&&document.getElementById('encMediaGallery'))void refresh();},9000);
window.entreChatMedia={gallery,controls,afterRender,refresh,stopRecording};
})();
