/* WebRTC temporary one-to-one video: 5-minute sessions, private Supabase signaling. */
(function(){
'use strict';
let session=null;
const activePair=p=>p?.status==='active'&&p.mode==='video'&&new Date(p.expires_at).getTime()>Date.now();
const control=(id,action,icon,label,extra='')=>'<button type="button" class="ce-control ce-media-control '+extra+'" id="'+id+'" data-action="'+action+'" aria-label="'+label+'" title="'+label+'">'+ico(icon,19)+'<span>'+label+'</span></button>';
function markup(pair){
 if(!activePair(pair))return '';
 return '<div class="ce-video-panel"><div class="ce-video-screen"><video id="videoRemote" autoplay playsinline aria-label="Câmera da outra pessoa"></video><div id="videoPlaceholder" class="ce-video-placeholder">'+ico('camera',30)+'<strong>Conectando vídeo…</strong></div><div class="ce-self"><video id="videoSelf" autoplay muted playsinline aria-label="Sua câmera"></video><span class="ce-self-off" hidden>'+ico('camera',19)+' Câmera desligada</span><small>Você</small></div><span class="ce-live-tag"><i></i> AO VIVO</span></div><div class="ce-video-toolbar">'+control('videoMute','videoMute','mic','Microfone')+control('videoCamera','videoCamera','camera','Câmera')+control('videoSound','videoSound','volume-2','Som')+control('videoRetry','videoRetry','refresh-cw','Reconectar')+'</div><p class="ce-connection" id="videoConnectionStatus" aria-live="polite">Preparando conexão…</p></div>';
}
function miniMarkup(pair,peer){
 if(!activePair(pair))return '';
 const name=typeof peer?.display_name==='string'?peer.display_name:'Sua conexão';
 return '<aside class="ce-floating encounter-floating-video" data-ce-pair="'+esc(pair.id)+'" role="region" aria-label="Videochamada minimizada"><div class="ce-float-handle" data-ce-drag tabindex="0" role="button" aria-label="Mover janela de vídeo. Use as setas do teclado."><svg width="18" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="8" cy="6" r="1.5"/><circle cx="16" cy="6" r="1.5"/><circle cx="8" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/><circle cx="8" cy="18" r="1.5"/><circle cx="16" cy="18" r="1.5"/></svg><strong>'+esc(name)+'</strong><span class="timer-text">05:00</span></div><div class="ce-mini-video"><video id="videoRemote" autoplay playsinline aria-label="Câmera da outra pessoa"></video><div id="videoPlaceholder" class="ce-video-placeholder">Conectando…</div><div class="ce-mini-self"><video id="videoSelf" autoplay muted playsinline aria-label="Sua câmera"></video><span class="ce-self-off" hidden>'+ico('camera',13)+'</span></div></div><div class="ce-mini-controls">'+control('videoMute','videoMute','mic','Microfone')+control('videoCamera','videoCamera','camera','Câmera')+control('videoSound','videoSound','volume-2','Som')+'<button type="button" class="ce-control ce-end ce-icon" data-action="endpair" aria-label="Encerrar">'+ico('phone-off',16)+'</button></div><button class="ce-float-return" type="button" data-action="nav" data-view="connect">Voltar à chamada '+ico('arrow',15)+'</button><p id="videoConnectionStatus" class="sr-only" aria-live="polite"></p></aside>';
}
let soundMuted=false,soundBlocked=false;
function paintRemoteCamera(on,known=false){const video=document.getElementById('videoRemote'),p=document.getElementById('videoPlaceholder');if(video)video.style.visibility=on?'visible':'hidden';if(p){p.hidden=on;p.textContent=known?'Câmera da outra pessoa desligada':'Conectando vídeo…';}}
function paintControls(mic,camera){
 const values=[['videoMute',mic,'Silenciar microfone','Ativar microfone','Microfone','Mudo'],['videoCamera',camera,'Desligar câmera','Ativar câmera','Câmera','Desligada'],['videoSound',!soundMuted&&!soundBlocked,'Silenciar som','Ativar som','Som','Sem som']];
 for(const [id,on,disable,enable,label,off] of values){const b=document.getElementById(id);if(!b)continue;b.classList.toggle('is-off',!on);b.setAttribute('aria-pressed',String(!on));b.setAttribute('aria-label',on?disable:enable);b.title=on?disable:enable;const t=b.querySelector('span');if(t)t.textContent=on?label:off;}
 document.querySelectorAll('.ce-self-off').forEach(el=>el.hidden=camera);
}
function applyRemote(video){
 if(!video)return;
 video.muted=soundMuted;
 if(!soundMuted)video.play().then(()=>{soundBlocked=false;const b=document.getElementById('videoSound');if(b){b.classList.remove('is-off');b.setAttribute('aria-pressed','false');b.setAttribute('aria-label','Silenciar som');b.title='Silenciar som';const t=b.querySelector('span');if(t)t.textContent='Som'}}).catch(()=>{soundBlocked=true;const b=document.getElementById('videoSound');if(b){b.classList.add('is-off');b.setAttribute('aria-pressed','true');b.setAttribute('aria-label','Ativar som');b.title='Ativar som';const t=b.querySelector('span');if(t)t.textContent='Sem som'}})
}
async function toggleSound(){const video=document.getElementById('videoRemote');if(!video)return;soundMuted=soundBlocked?false:!soundMuted;soundBlocked=false;applyRemote(video);if(soundMuted){const b=document.getElementById('videoSound');if(b){b.classList.add('is-off');b.setAttribute('aria-pressed','true');b.setAttribute('aria-label','Ativar som');b.title='Ativar som';const t=b.querySelector('span');if(t)t.textContent='Sem som'}}}
function status(message){
 const node=document.getElementById('videoConnectionStatus');
 if(node)node.textContent=message;
}
function attach(){
 if(window.entreLiveKit?.isRunning?.()){window.entreLiveKit.attach();return;}
 if(!session)return;
 const local=document.getElementById('videoSelf'),remote=document.getElementById('videoRemote');
 if(local&&local.srcObject!==session.local) local.srcObject=session.local;
 if(remote&&remote.srcObject!==session.remote){
  remote.srcObject=session.remote;
  applyRemote(remote);
 }
 const placeholder=document.getElementById('videoPlaceholder');
 const remoteOn=session.peerCamera!==false&&session.remote.getVideoTracks().some(t=>t.readyState==='live'&&!t.muted);paintRemoteCamera(remoteOn,session.peerCamera===false);
 const micEnabled=session.local?.getAudioTracks().some(t=>t.enabled)===true;
 const cameraEnabled=session.local?.getVideoTracks().some(t=>t.enabled)===true;
 paintControls(micEnabled,cameraEnabled);
 status(session.status||'Conectando vídeo…');
}
function cleanup(){
 soundMuted=false;soundBlocked=false;
 window.entreLiveKit?.cleanup?.();
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
 if(window.entreLiveKit?.isPair?.(pair.id)){window.entreLiveKit.attach();return;}
 if(session?.pairId===pair.id){attach();return;}
 cleanup();
 if(await window.entreLiveKit?.start?.(pair))return;
 if(!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection){status('Este navegador não permite videochamadas.');return;}
 const room={pairId:pair.id,remote:new MediaStream(),local:null,pc:null,channel:null,queue:[],status:'Solicitando acesso à câmera e ao microfone…',ready:false,interval:null};
 session=room;attach();
 try{room.local=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:{facingMode:'user',width:{ideal:1920},height:{ideal:1080},frameRate:{ideal:30,max:60}}});}
 catch(error){room.status='Câmera ou microfone bloqueados. Verifique as permissões do navegador e toque em Tentar câmera novamente.';status(room.status);return;}
 if(session!==room||!activePair(state.pair)){room.local.getTracks().forEach(t=>t.stop());return;}
 const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]});
 room.pc=pc;room.local.getTracks().forEach(t=>{const sender=pc.addTrack(t,room.local);if(t.kind==='video'){const p=sender.getParameters();if(p.encodings?.length){p.encodings[0].maxBitrate=6000000;void sender.setParameters(p).catch(()=>{});}}});room.announceCamera=()=>send({type:'camera-state',enabled:room.local.getVideoTracks().some(t=>t.enabled)});
 pc.ontrack=ev=>{if(session!==room)return;const streams=ev.streams||[];if(streams[0])room.remote=streams[0];else room.remote.addTrack(ev.track);room.status='Videochamada conectada.';ev.track.onmute=ev.track.onunmute=ev.track.onended=()=>attach();attach();void room.announceCamera?.();};
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
   if(payload.type==='camera-state'&&typeof payload.enabled==='boolean'){room.peerCamera=payload.enabled;attach();return;}if(payload.type==='ready'){void room.announceCamera?.();if(state.session.user.id===pair.a)await offer();}
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
 if(type==='videoSound'){await toggleSound();return true;}
 if(window.entreLiveKit?.isRunning?.())return await window.entreLiveKit.action(type);
 if(!session&&type!=='videoRetry')return false;
 if(type==='videoRetry'){const pair=state.pair;cleanup();await start(pair);return true;}
 if(type==='videoMute'){const tracks=session.local?.getAudioTracks()||[];for(const t of tracks)t.enabled=!t.enabled;attach();return true;}
 if(type==='videoCamera'){const tracks=session.local?.getVideoTracks()||[];for(const t of tracks)t.enabled=!t.enabled;attach();void session.announceCamera?.();return true;}
 if(type==='videoSound'){const video=document.getElementById('videoRemote');if(video){video.muted=false;await video.play().catch(()=>{});}return true;}
 return false;
}
window.entreVideo={markup,miniMarkup,start,attach,cleanup,action,paintControls,applyRemote,paintRemoteCamera,isRunning:()=>Boolean(session)||Boolean(window.entreLiveKit?.isRunning?.())};
})();
