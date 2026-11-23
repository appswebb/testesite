/* entre. LiveKit video transport. Supabase verifies active membership before minting tokens.
   Existing WebRTC P2P remains as a fallback when LiveKit is not configured. */
(function(){
'use strict';
let current=null,scriptPromise=null;
const sdkUrl='https://cdn.jsdelivr.net/npm/livekit-client@2.25.0/dist/livekit-client.umd.min.js';
function status(text){const el=document.getElementById('videoConnectionStatus');if(el)el.textContent=text;}
async function sdk(){
 if(window.LivekitClient?.Room)return window.LivekitClient;
 if(!scriptPromise)scriptPromise=new Promise((resolve,reject)=>{
  const el=document.createElement('script');el.src=sdkUrl;el.async=true;
  el.onload=()=>window.LivekitClient?.Room?resolve(window.LivekitClient):reject(Error('LiveKit unavailable'));
  el.onerror=()=>reject(Error('Could not load LiveKit client'));document.head.appendChild(el);
 });
 return scriptPromise;
}
function localTracks(){
 const streams=[];
 if(!current?.room)return streams;
 for(const publication of current.room.localParticipant.trackPublications.values()){
  const track=publication.track?.mediaStreamTrack;
  if(track)streams.push(track);
 }
 return streams;
}
function attach(){
 if(!current)return;
 const own=document.getElementById('videoSelf'),other=document.getElementById('videoRemote');
 const local=new MediaStream(localTracks());
 if(own) {own.srcObject=local;own.muted=true;own.play().catch(()=>{});}
 if(other){other.srcObject=current.remote;other.muted=false;other.play().catch(()=>status('Toque em Ativar som para ouvir a chamada.'));}
 const placeholder=document.getElementById('videoPlaceholder');
 if(placeholder)placeholder.hidden=current.remote.getVideoTracks().length>0;
 const mic=document.getElementById('videoMute'),cam=document.getElementById('videoCamera');
 if(mic){mic.classList.toggle('is-off',!current.mic);mic.setAttribute('aria-pressed',String(!current.mic));mic.title=current.mic?'Silenciar microfone':'Ativar microfone';}
 if(cam){cam.classList.toggle('is-off',!current.camera);cam.setAttribute('aria-pressed',String(!current.camera));cam.title=current.camera?'Desligar câmera':'Ativar câmera';}
 status(current.status||'Chamada conectada pelo LiveKit.');
}
function cleanup(){
 const prev=current;current=null;if(!prev)return;
 try{prev.room.removeAllListeners?.()}catch(e){}
 try{void prev.room.disconnect()}catch(e){}
 for(const id of ['videoSelf','videoRemote']){const el=document.getElementById(id);if(el)el.srcObject=null;}
}
async function start(pair){
 if(current?.pairId===pair.id){attach();return true;}
 cleanup();
 let credentials=null;
 try{
  const {data,error}=await db.functions.invoke('entre-livekit-token',{body:{pair_id:pair.id}});
  if(error||!data?.token||!data?.url)return false;
  credentials=data;
 }catch(error){return false;}
 let room=null,attempt=null;
 try{
  const lk=await sdk();
  room=new lk.Room({adaptiveStream:true,dynacast:true,stopLocalTrackOnUnpublish:true});
  attempt={pairId:pair.id,room,remote:new MediaStream(),camera:true,mic:true,status:'Conectando com LiveKit…'};
  current=attempt;
  room.on(lk.RoomEvent.TrackSubscribed,(track)=>{
   if(current!==attempt)return;
   const mediaTrack=track.mediaStreamTrack;
   if(mediaTrack&&!attempt.remote.getTracks().some(t=>t.id===mediaTrack.id))attempt.remote.addTrack(mediaTrack);
   attempt.status='Videochamada conectada pelo LiveKit.';attach();
  });
  room.on(lk.RoomEvent.TrackUnsubscribed,(track)=>{
   if(current!==attempt)return;
   const mediaTrack=track.mediaStreamTrack;
   if(mediaTrack&&attempt.remote.getTracks().includes(mediaTrack))attempt.remote.removeTrack(mediaTrack);
   attempt.status='Reconectando vídeo…';attach();
  });
  room.on(lk.RoomEvent.Disconnected,()=>{if(current!==attempt)return;attempt.status='A chamada LiveKit foi desconectada.';attach();});
  room.on(lk.RoomEvent.Reconnecting,()=>{if(current!==attempt)return;attempt.status='Reconectando LiveKit…';attach();});
  room.on(lk.RoomEvent.Reconnected,()=>{if(current!==attempt)return;attempt.status='Conexão LiveKit restaurada.';attach();});
  await room.connect(credentials.url,credentials.token,{autoSubscribe:true});
  if(current!==attempt){await room.disconnect();return false;}
  await room.localParticipant.enableCameraAndMicrophone();
  if(current!==attempt){await room.disconnect();return false;}
  attempt.status='Conexão LiveKit ativa.';attach();return true;
 }catch(error){
  console.warn('LiveKit indisponível, tentando conexão direta:',String(error?.message||error));
  if(current===attempt)cleanup();else if(room)try{await room.disconnect()}catch(e){}
  return false;
 }
}
async function action(type){
 if(!current)return false;
 if(type==='videoMute'){current.mic=!current.mic;await current.room.localParticipant.setMicrophoneEnabled(current.mic);attach();return true;}
 if(type==='videoCamera'){current.camera=!current.camera;await current.room.localParticipant.setCameraEnabled(current.camera);attach();return true;}
 if(type==='videoSound'){const video=document.getElementById('videoRemote');if(video){video.muted=false;await video.play().catch(()=>status('Verifique o volume do dispositivo.'));}return true;}
 if(type==='videoRetry'){const id=state.pair;cleanup();if(id)await window.entreVideo.start(id);return true;}
 return false;
}
window.entreLiveKit={start,attach,cleanup,action,isRunning:()=>Boolean(current),isPair:id=>Boolean(current?.pairId===id)};
})();
