/* WebRTC temporary one-to-one video: 5-minute sessions, private Supabase signaling. */
(function(){
'use strict';
let session=null;
const activePair=p=>p?.status==='active'&&p.mode==='video'&&new Date(p.expires_at).getTime()>Date.now();
function markup(pair){
 if(!activePair(pair))return '';
 return `<section class="live-video-panel" aria-label="Vídeo do encontro temporário">
 <div class="live-video-top"><span class="live-video-tag">${ico('camera',15)} VIDEOCHAMADA</span><span class="live-video-note">${ico('lock',13)} Conexão privada entre vocês</span></div>
 <div class="live-video-grid">
  <div class="video-frame video-remote"><video id="videoRemote" autoplay playsinline></video><div class="video-placeholder" id="videoPlaceholder"><span aria-hidden="true">✦</span><strong>Aguardando conexão de vídeo</strong><small>A câmera da outra pessoa aparece aqui.</small></div><span>Outra pessoa</span></div>
  <div class="video-frame video-self"><video id="videoSelf" autoplay muted playsinline></video><span>Você</span></div>
 </div>
 <div class="live-video-bottom">
  <p id="videoConnectionStatus" aria-live="polite">Preparando uma conexão segura…</p>
  <div class="live-video-controls">
   <button type="button" class="video-control" data-action="videoMute" id="videoMute" title="Silenciar microfone" aria-label="Silenciar microfone">${ico('mic',19)}<span>Microfone</span></button>
   <button type="button" class="video-control" data-action="videoCamera" id="videoCamera" title="Desligar câmera" aria-label="Desligar câmera">${ico('camera',19)}<span>Câmera</span></button>
   <button type="button" class="video-control video-sound" data-action="videoSound" id="videoSound">${ico('volume-2',17)}<span>Ativar som</span></button>
   <button type="button" class="video-control video-retry" data-action="videoRetry" id="videoRetry">${ico('refresh-cw',16)}<span>Tentar novamente</span></button>
  </div>
 </div>
 </section>`;
}
function miniMarkup(pair,peer){
 if(!activePair(pair))return '';
 const name=typeof peer?.display_name==='string'?peer.display_name:'Sua conexão';
 return `<aside class="encounter-floating encounter-floating-video" role="region" aria-label="Videochamada em andamento">
  <div class="encounter-mini-screen">
   <video id="videoRemote" autoplay playsinline aria-label="Câmera da outra pessoa"></video>
   <div class="video-placeholder" id="videoPlaceholder"><span>Conectando vídeo…</span></div>
   <div class="encounter-mini-self"><video id="videoSelf" autoplay muted playsinline aria-label="Sua câmera"></video></div>
   <span class="encounter-mini-live"><i aria-hidden="true"></i> AO VIVO</span>
  </div>
  <div class="encounter-mini-details"><div><strong>${esc(name)}</strong><small>Termina em <span class="timer-text">05:00</span></small></div>
   <button type="button" class="encounter-floating-return" data-action="nav" data-view="connect">Voltar ${ico('arrow',14)}</button></div>
  <div class="encounter-mini-controls"><p id="videoConnectionStatus" aria-live="polite">Chamada em andamento</p>
   <div><button type="button" class="video-control" id="videoMute" data-action="videoMute" title="Silenciar microfone" aria-label="Silenciar microfone">${ico('mic',16)}</button>
   <button type="button" class="video-control" id="videoCamera" data-action="videoCamera" title="Desligar câmera" aria-label="Desligar câmera">${ico('camera',16)}</button>
   <button type="button" class="video-control" id="videoSound" data-action="videoSound" title="Ativar som">${ico('volume-2',16)}</button>
   <button type="button" class="video-control video-control-end" data-action="endpair" title="Encerrar encontro" aria-label="Encerrar encontro">${ico('phone-off',16)}</button></div>
  </div>
 </aside>`;
}
function status(message){
 const node=document.getElementById('videoConnectionStatus');
 if(node)node.textContent=message;
}
function attach(){
 if(!session)return;
 const local=document.getElementById('videoSelf'),remote=document.getElementById('videoRemote');
 if(local&&local.srcObject!==session.local) local.srcObject=session.local;
 if(remote&&remote.srcObject!==session.remote){
  remote.srcObject=session.remote;
  remote.muted=false;
  remote.play().catch(()=>status('Toque em Ativar som para ouvir a outra pessoa.'));
 }
 const placeholder=document.getElementById('videoPlaceholder');
 if(placeholder)placeholder.hidden=session.remote.getTracks().length>0;
 const micEnabled=session.local?.getAudioTracks()[0]?.enabled!==false;
 const cameraEnabled=session.local?.getVideoTracks()[0]?.enabled!==false;
 const mic=document.getElementById('videoMute'),camera=document.getElementById('videoCamera');
 if(mic){mic.classList.toggle('is-off',!micEnabled);mic.setAttribute('aria-pressed',String(!micEnabled));mic.setAttribute('aria-label',micEnabled?'Silenciar microfone':'Ativar microfone');mic.title=micEnabled?'Silenciar microfone':'Ativar microfone';}
 if(camera){camera.classList.toggle('is-off',!cameraEnabled);camera.setAttribute('aria-pressed',String(!cameraEnabled));camera.setAttribute('aria-label',cameraEnabled?'Desligar câmera':'Ativar câmera');camera.title=cameraEnabled?'Desligar câmera':'Ativar câmera';}
 status(session.status||'Conectando vídeo…');
}
function cleanup(){
 if(!session)return;
 const old=session;session=null;
 if(old.interval)clearInterval(old.interval);
 if(old.channel){try{db.removeChannel(old.channel)}catch(_){}}
 if(old.pc){try{old.pc.onicecandidate=null;old.pc.ontrack=null;old.pc.close()}catch(_){}}
 old.local?.getTracks().forEach(t=>t.stop());
 old.remote?.getTracks().forEach(t=>t.stop());
 for(const id of ['videoSelf','videoRemote']){const el=document.getElementById(id);if(el)el.srcObject=null;}
}
async function start(pair){
 if(!activePair(pair)){cleanup();return;}
 if(session?.pairId===pair.id){attach();return;}
 cleanup();
 if(!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection){status('Este navegador não permite videochamadas.');return;}
 const room={pairId:pair.id,remote:new MediaStream(),local:null,pc:null,channel:null,queue:[],status:'Solicitando acesso à câmera e ao microfone…',ready:false,interval:null};
 session=room;attach();
 try{room.local=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:{facingMode:'user',width:{ideal:640},height:{ideal:480}}});}
 catch(error){room.status='Câmera ou microfone bloqueados. Verifique as permissões do navegador e toque em Tentar câmera novamente.';status(room.status);return;}
 if(session!==room||!activePair(state.pair)){room.local.getTracks().forEach(t=>t.stop());return;}
 const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]});
 room.pc=pc;room.local.getTracks().forEach(t=>pc.addTrack(t,room.local));
 pc.ontrack=ev=>{if(session!==room)return;const streams=ev.streams||[];if(streams[0])room.remote=streams[0];else room.remote.addTrack(ev.track);room.status='Videochamada conectada.';attach();};
 pc.onicecandidate=ev=>{if(ev.candidate&&room.ready)void send({type:'ice',candidate:ev.candidate.toJSON()});};
 pc.onconnectionstatechange=()=>{
  if(session!==room)return;
  if(pc.connectionState==='connected')room.status='Videochamada conectada.';
  else if(pc.connectionState==='failed')room.status='Falha de conexão entre dispositivos. Encerre e tente novamente.';
  else if(pc.connectionState==='disconnected')room.status='Reconectando vídeo…';
  attach();
 };
 async function send(payload){
  if(session!==room||!room.ready)return;
  try{await room.channel.send({type:'broadcast',event:'signal',payload});}catch(e){console.warn('Signal send',e);}
 }
 async function offer(){
  if(session!==room||!room.ready||!activePair(state.pair)||pc.remoteDescription)return;
  try{
   if(pc.signalingState==='have-local-offer'&&pc.localDescription){await send({type:'offer',sdp:pc.localDescription.toJSON()});return;}
   if(pc.signalingState!=='stable')return;
   const desc=await pc.createOffer();await pc.setLocalDescription(desc);
   await send({type:'offer',sdp:pc.localDescription.toJSON()});
  }catch(e){console.warn('Offer error',e);}
 }
 async function receive(payload){
  if(session!==room||!activePair(state.pair)||!payload)return;
  try{
   if(payload.type==='ready'&&state.session.user.id===pair.a){await offer();}
   if(payload.type==='offer'&&state.session.user.id===pair.b){
    await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    while(room.queue.length){await pc.addIceCandidate(room.queue.shift());}
    const answer=await pc.createAnswer();await pc.setLocalDescription(answer);
    await send({type:'answer',sdp:pc.localDescription.toJSON()});
   }
   if(payload.type==='answer'&&state.session.user.id===pair.a&&pc.signalingState==='have-local-offer'){
    await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    while(room.queue.length){await pc.addIceCandidate(room.queue.shift());}
   }
   if(payload.type==='ice'&&payload.candidate){
    if(pc.remoteDescription)await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
    else room.queue.push(new RTCIceCandidate(payload.candidate));
   }
  }catch(e){console.warn('Video signaling',e);room.status='Reconectando vídeo…';attach();}
 }
 room.channel=db.channel('entre_video_'+pair.id,{config:{private:true,broadcast:{self:false}}})
 .on('broadcast',{event:'signal'},ev=>void receive(ev.payload))
 .subscribe(async statusValue=>{
  if(session!==room)return;
  if(statusValue==='SUBSCRIBED'){
   room.ready=true;room.status='Aguardando a outra câmera…';attach();
   if(state.session.user.id===pair.b)await send({type:'ready'});
   if(state.session.user.id===pair.a)await offer();
  }else if(statusValue==='CHANNEL_ERROR'||statusValue==='TIMED_OUT'){
   room.status='Não foi possível conectar o vídeo. Verifique sua rede.';attach();
  }
 });
 room.interval=setInterval(()=>{if(session!==room||!activePair(state.pair)){cleanup();return;}if(state.session.user.id===pair.a&&!pc.remoteDescription)void offer();},3500);
 room.status='Conectando chamada privada…';attach();
}
async function action(type){
 if(!session&&type!=='videoRetry')return false;
 if(type==='videoRetry'){const pair=state.pair;cleanup();await start(pair);return true;}
 if(type==='videoMute'){const tracks=session.local?.getAudioTracks()||[];for(const t of tracks)t.enabled=!t.enabled;attach();return true;}
 if(type==='videoCamera'){const tracks=session.local?.getVideoTracks()||[];for(const t of tracks)t.enabled=!t.enabled;attach();return true;}
 if(type==='videoSound'){const video=document.getElementById('videoRemote');if(video){video.muted=false;await video.play().catch(()=>{});}return true;}
 return false;
}
window.entreVideo={markup,miniMarkup,start,attach,cleanup,action,isRunning:()=>Boolean(session)};
})();
