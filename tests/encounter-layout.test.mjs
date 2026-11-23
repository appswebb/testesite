import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('../docs/'+name,import.meta.url),'utf8');
const source=read('app.js');
const videoSource=read('entre-video.js');
const css=read('encounter-ui.css');
const nowPair=mode=>({
  id:'encounter-fixture',status:'active',mode,expires_at:new Date(Date.now()+300000).toISOString(),
  a:'a',b:'b'
});
function helpers(state){
  const start=source.indexOf('function activeEncounter(){'),end=source.indexOf('function appLayout(){',start);
  assert.ok(start>0&&end>start,'Encounter helpers must exist in app.js');
  const text=source.slice(start,end)+'return {activeEncounter,encounterMiniMarkup,videoEncounterView};';
  const window={entreVideo:{miniMarkup:()=>'<aside class="video-mini">chamada ativa</aside>',markup:()=>'<section class="live-video-panel">vídeo</section>'},
    entreSocial:{chatToolbar:()=>'<div class="chat-origin-bar">origem</div>',historyButton:()=>''}};
  const get=new Function('state','window','esc','ico','avatar','messagesMarkup',text);
  return get(state,window,String,n=>'<svg data-icon="'+n+'"></svg>',()=>'<span class="avatar">p</span>',()=>'<div class="bubble">oi</div>');
}
function videoHelpers(){
 const start=videoSource.indexOf('const activePair='),end=videoSource.indexOf('function status(message)',start);
 assert.ok(start>=0&&end>start,'video markup helpers must exist');
 return new Function('ico','esc',videoSource.slice(start,end)+'return {markup,miniMarkup,activePair};')(
   n=>'<svg data-icon="'+n+'"></svg>',String);
}
test('live video shares the same encounter workspace as message history and composer',()=>{
 const state={view:'connect',pair:nowPair('video')};
 const html=helpers(state).videoEncounterView(state.pair,{display_name:'Pessoa Teste'},false,false);
 for(const pattern of [/encounter-workspace/,/encounter-stage/,/live-video-panel/,/encounter-conversation/,
  /id="messageList"/,/id="messageForm"/,/encounter-decision/,/data-action="vote"/,/data-action="report"/,/data-action="block"/]){
  assert.match(html,pattern);
 }
 assert.equal((html.match(/id="messageList"/g)||[]).length,1);
 assert.match(css,/\.encounter-workspace\{display:grid/);
 assert.match(css,/@media\(max-width:850px\)\{\.encounter-workspace\{grid-template-columns:minmax\(0,1fr\)/);
});
test('active video gets a floating mini player on other tabs but not inside the full encounter',()=>{
 const state={view:'posts',pair:nowPair('video'),peer:{display_name:'Pessoa Teste'}};
 let api=helpers(state);
 assert.equal(api.activeEncounter(),true);
 assert.match(api.encounterMiniMarkup(),/class="video-mini"/);
 state.view='connect';
 assert.equal(api.encounterMiniMarkup(),'');
 state.view='posts';
 state.pair={...state.pair,expires_at:new Date(Date.now()-2000).toISOString()};
 assert.equal(api.encounterMiniMarkup(),'');
});
test('temporary text chat remains accessible from any other section',()=>{
 const state={view:'premium',pair:nowPair('chat'),peer:{display_name:'Conexão'}};
 const html=helpers(state).encounterMiniMarkup();
 assert.match(html,/encounter-floating-chat/);
 assert.match(html,/data-view="connect"/);
 assert.match(html,/Chat com Conexão/);
 assert.match(html,/timer-text/);
});
test('WebRTC keeps local and remote videos and controls in full and mini views',()=>{
 const video=videoHelpers(),pair=nowPair('video');
 const full=video.markup(pair),mini=video.miniMarkup(pair,{display_name:'Pessoa Teste'});
 for(const html of [full,mini]){
  assert.match(html,/id="videoSelf"/);
  assert.match(html,/id="videoRemote"/);
  assert.match(html,/id="videoPlaceholder"/);
  assert.match(html,/data-action="videoMute"/);
  assert.match(html,/data-action="videoCamera"/);
  assert.match(html,/data-action="videoSound"/);
 }
 assert.match(mini,/data-view="connect"/);
 assert.match(mini,/data-action="endpair"/);
 assert.match(full,/id="videoRetry"/);
 assert.match(videoSource,/RTCPeerConnection/);
 assert.match(videoSource,/private:true/);
 assert.match(css,/\.encounter-stage \.video-placeholder\[hidden\]/);
 assert.match(css,/display:none!important/);
});
test('navigating tabs does not reject video calls or disconnect WebRTC',()=>{
 const start=source.indexOf('function nav(view){'),end=source.indexOf('function scrollHow()',start);
 const body=source.slice(start,end);
 assert.match(body,/state\.view=view;/);
 assert.match(body,/render\(\)/);
 assert.doesNotMatch(body,/Encerre a videochamada|video\.cleanup|entreVideo\?\.cleanup/);
 assert.match(source,/encounterMiniMarkup\(\)/);
 assert.match(source,/window\.entreVideo\?\.attach\?\.\(\)/);
});
test('incoming and sent messages update video chat without reconstructing the stream',()=>{
 assert.match(source,/function refreshEncounterMessages\(\)/);
 assert.match(source,/list\.innerHTML=/);
 assert.match(source,/if\(!refreshEncounterMessages\(\)&&\['connect','chat'\]\.includes\(state\.view\)\)renderView\(\)/);
 assert.match(source,/previous\[key\]===data\[key\]/);
 assert.match(source,/if\(\['connect','chat'\]\.includes\(state\.view\)\)state\.view='connect'/);
 assert.match(source,/if\(\['connect','chat'\]\.includes\(state\.view\)\)state\.view='chat'/);
});
test('Premium checkout has a bounded card and disabled checkout remains unchanged',()=>{
 assert.match(css,/\.premium-checkout\{grid-template-columns:.*max-width:1020px/);
 assert.match(css,/\.premium-checkout-card.*min-width:0/);
 assert.match(css,/\.premium-checkout-card \.ui-btn\{max-width:100%/);
 const premium=read('entre-features.js');
 assert.match(premium,/enabled\?'':'disabled'/);
 assert.match(premium,/Pagamento Pix\\/cartão no navegador ainda não está configurado/);
 assert.match(premium,/mercadopago/);
});
test('new encounter stylesheet and WebRTC cache version are loaded',()=>{
 const html=read('index.html');
 assert.match(html,/encounter-ui\.css\?v=entre-20261123-encounter-v1/);
 assert.match(html,/entre-video\.js\?v=entre-20261123-encounter-v1/);
 assert.ok(html.indexOf('encounter-ui.css')>html.indexOf('entre-features.css'));
 assert.match(read('app.js'),/function videoEncounterView\(/);
});
