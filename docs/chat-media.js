/* Private pair-scoped media: photos, short videos and voice notes.
 * Uses signed Storage URLs and RPC permissions; never exposes public bucket links. */
(function(){
'use strict';
const bucket='entre-chat-media';
const mem={pair:null,rows:[],urls:new Map(),loading:null,last:0,busy:false,recording:null,draft:null,requesting:false};
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
 '<span id="encMediaStatus" role="status" aria-live="polite"></span></div><div class="cp-voice-state" id="cpVoiceState" hidden></div>';
}
let statusTimer=0;function status(text){const node=document.getElementById('encMediaStatus');if(node)node.textContent=text||'';clearTimeout(statusTimer);if(text==='Enviado com sucesso.'||text==='Gravação descartada.')statusTimer=setTimeout(()=>{const el=document.getElementById('encMediaStatus');if(el?.textContent===text)el.textContent='';},2500);}
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
 const signature=JSON.stringify(mem.rows.map(r=>[r.id,mem.urls.get(r.media_path)?.url]));if(root.dataset.mediaSignature===signature)return;root.dataset.mediaSignature=signature;
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
 syncVoice();paintVoice();
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
let voiceChannel=null,voicePair=null,voiceOwner=null,voiceSequence=0,remoteUntil=0,signalQueue=Promise.resolve(),lastVoiceMarkup='';
const visiblePair=()=>canSend()&&['chat','connect'].includes(state.view)&&document.getElementById('cpVoiceState')?current():null;
function signal(pair,uid,active){
 signalQueue=signalQueue.catch(()=>{}).then(async()=>{if(owner()!==uid)return;const {error}=await db.rpc('entre_voice_recording',{_pair:pair,_active:active});if(error)console.warn('Voice activity unavailable',error.message);});
}
function clearDraft(){if(mem.draft?.url)URL.revokeObjectURL(mem.draft.url);mem.draft=null;}
function paintVoice(){
 const root=document.getElementById('cpVoiceState'),button=document.querySelector('[data-chat-media-record]');if(!root)return;
 const rec=mem.recording?.pair===current()?mem.recording:null,draft=mem.draft?.pair===current()?mem.draft:null;
 if(button){button.setAttribute('aria-pressed',String(!!rec));button.disabled=!!draft||mem.requesting;const label=button.querySelector('span');if(label)label.textContent=rec?'Parar gravação':'Gravar áudio';}
 const remote=voicePair===current()&&remoteUntil>Date.now();
 const elapsed=rec?Math.min(30,Math.floor((Date.now()-rec.started)/1000)):0;
 const markup=(rec?'<div class="cp-voice-line"><i></i><strong>Gravando áudio</strong><time>0:'+String(elapsed).padStart(2,'0')+'</time><button type="button" data-voice-cancel>Cancelar</button></div>':'')+(draft?'<div class="cp-voice-draft"><audio controls preload="metadata" src="'+esc(draft.url)+'"></audio><button type="button" data-voice-discard>Descartar</button><button type="button" data-voice-send>Enviar áudio</button></div>':'')+(remote?'<div class="cp-voice-remote" role="status"><i></i> A outra pessoa está gravando um áudio…</div>':'');
 if(root.dataset.voiceMarkup!==markup){root.dataset.voiceMarkup=markup;root.innerHTML=markup;}root.hidden=!markup;
}
async function readVoice(pair,uid,seq){
 try{const {data,error}=await db.from('entre_voice_activity').select('user_id,expires_at').eq('pair_id',pair).neq('user_id',uid);if(error)throw error;if(seq===voiceSequence&&voicePair===pair&&owner()===uid){remoteUntil=Math.max(0,...(data||[]).map(x=>new Date(x.expires_at).getTime()));paintVoice();}}catch(e){console.warn('Voice activity read',e?.message);}
}
function syncVoice(){
 const pair=visiblePair(),uid=owner();
 if(mem.recording&&(mem.recording.pair!==pair||mem.recording.uid!==uid))stopRecording(true);
 if(mem.draft&&(mem.draft.pair!==pair||mem.draft.uid!==uid))clearDraft();
 if(pair===voicePair&&uid===voiceOwner)return;
 if(voiceChannel){void db.removeChannel(voiceChannel);voiceChannel=null;}voicePair=pair;voiceOwner=uid;remoteUntil=0;const seq=++voiceSequence;
 if(!pair||!uid)return;
 voiceChannel=db.channel('connect-voice-'+pair+'-'+seq).on('postgres_changes',{event:'INSERT',schema:'public',table:'entre_voice_activity',filter:'pair_id=eq.'+pair},p=>{if(seq===voiceSequence&&p.new?.user_id!==uid){remoteUntil=new Date(p.new.expires_at).getTime();paintVoice();}}).on('postgres_changes',{event:'UPDATE',schema:'public',table:'entre_voice_activity',filter:'pair_id=eq.'+pair},p=>{if(seq===voiceSequence&&p.new?.user_id!==uid){remoteUntil=new Date(p.new.expires_at).getTime();paintVoice();}}).subscribe(status=>{if(status==='SUBSCRIBED')void readVoice(pair,uid,seq);});
 void readVoice(pair,uid,seq);
}
function stopRecording(discard=false){
 const rec=mem.recording;if(!rec)return;
 mem.recording=null;rec.discard=discard;clearTimeout(rec.timer);clearInterval(rec.heartbeat);signal(rec.pair,rec.uid,false);
 if(rec.recorder.state!=='inactive')rec.recorder.stop();else rec.stream.getTracks().forEach(t=>t.stop());
 paintVoice();
}
async function toggleVoice(){
 if(mem.recording){stopRecording();return;}
 if(mem.busy||mem.draft||mem.requesting||!visiblePair())return;
 if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw Error('Gravação de áudio indisponível neste navegador.');
 const pair=current(),uid=owner();mem.requesting=true;paintVoice();let stream;
 try{stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});if(pair!==visiblePair()||uid!==owner()||document.hidden){stream.getTracks().forEach(t=>t.stop());return;}
 const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(x=>MediaRecorder.isTypeSupported?.(x));
 if(!mime)throw Error('Gravação não compatível com o navegador.');
 const recorder=new MediaRecorder(stream,{mimeType:mime}),chunks=[];
 const rec={recorder,stream,pair,uid,started:Date.now(),discard:false,timer:0,heartbeat:0};
 recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
 recorder.onstop=()=>{
  stream.getTracks().forEach(t=>t.stop());
  if(mem.recording===rec){mem.recording=null;clearTimeout(rec.timer);clearInterval(rec.heartbeat);signal(pair,uid,false);}
  if(!rec.discard&&pair===visiblePair()&&uid===owner()){const file=new File(chunks,'mensagem.'+(mime.includes('webm')?'webm':'m4a'),{type:mime.includes('webm')?'audio/webm':'audio/mp4'});if(file.size){clearDraft();mem.draft={file,pair,uid,url:URL.createObjectURL(file)};}}
  paintVoice();
 };
 recorder.onerror=()=>{rec.discard=true;if(mem.recording===rec)stopRecording(true);stream.getTracks().forEach(t=>t.stop());status('A gravação falhou.');};
 recorder.start(350);mem.recording=rec;rec.timer=setTimeout(()=>stopRecording(),30000);rec.heartbeat=setInterval(()=>{if(mem.recording===rec&&visiblePair()===pair)signal(pair,uid,true);},4000);signal(pair,uid,true);
 }catch(e){stream?.getTracks().forEach(t=>t.stop());throw e;}finally{mem.requesting=false;paintVoice();}
}
setInterval(()=>{syncVoice();paintVoice();},500);
setInterval(()=>{if(voicePair&&voiceOwner)void readVoice(voicePair,voiceOwner,voiceSequence);},5000);
document.addEventListener('click',event=>{
 if(event.target.closest?.('[data-voice-cancel]')){stopRecording(true);return;}
 if(event.target.closest?.('[data-voice-discard]')){clearDraft();paintVoice();return;}
 if(event.target.closest?.('[data-voice-send]')){const draft=mem.draft;if(!draft||draft.pair!==visiblePair()||draft.uid!==owner()||mem.busy)return;clearDraft();paintVoice();void upload(draft.file).catch(e=>status(errorText(e)));return;}
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
