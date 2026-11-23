import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=name=>readFileSync(new URL('../docs/'+name,import.meta.url),'utf8');
test('Avisos are separate from user notifications in a header bell',()=>{
 const app=read('app.js');
 assert.match(app,/\['avisos','Avisos','megaphone'\]/);
 assert.match(app,/class="toolbar-bell/);
 assert.match(app,/data-view="notifications"/);
 assert.match(app,/function avisosView\(\)/);
 assert.match(app,/announcement_version/);
 assert.doesNotMatch(app,/\['notifications','Avisos'/);
});
test('Main menu has four sections and excludes Suas conexões',()=>{
 const app=read('app.js');
 assert.match(app,/tabs.filter\(t=>t\[0\]!=='home'\)/);
 assert.match(app,/\['online','Online','users'\]/);
 assert.match(app,/\['avisos','Avisos','megaphone'\]/);
 assert.doesNotMatch(app,/\['connections','Suas conexões'/);
 assert.match(app,/class="toolbar-profile/);
});
test('Unmatched temporary encounters do not appear in the conversations view',()=>{
 const source=read('social-conversations.js');
 const api={data:{filter:'all'},pref:()=>({}),isHidden:()=>false};
 const state={session:{user:{id:'self'}},pairsProfiles:{recent:{id:'other',display_name:'Sem Match'},connected:{id:'match',display_name:'Com Match'}},
  pairs:[{id:'recent',a:'self',b:'other',status:'closed',origin:'live',closed_at:new Date().toISOString()},
         {id:'connected',a:'self',b:'match',status:'connected',origin:'live',created_at:new Date().toISOString()}]};
 new Function('window','state','heading','avatar','esc','ico','genders',source)(
  {entreSocial:api},state,(a,b,d)=>a+b+d,p=>'<div>'+p.display_name+'</div>',String,n=>'icon:'+n,{});
 const view=api.conversationsView();
 assert.match(view,/Com Match/);
 assert.doesNotMatch(view,/Sem Match/);
 assert.equal(api.connectionsView,undefined);
 assert.doesNotMatch(view,/recent-connection/);
});
test('Temporary live chat cannot move, pin, archive or save',()=>{
 const effects=read('social-effects.js');
 const api={pref:()=>({}),conversationMenu:pair=>'<div data-social-folder="'+pair.id+'">Organizar</div>'};
 new Function('window','state','ico','esc',effects)({entreSocial:api},{motionOff:true},name=>'icon:'+name,String);
 const temp=api.chatToolbar({id:'1',origin:'live',status:'active'}),perma=api.chatToolbar({id:'2',origin:'live',status:'connected'});
 assert.doesNotMatch(temp,/data-social-folder|conversationPin|conversationArchive|conversationRestore/);
 assert.match(temp,/Chat ao vivo · temporário/);
 assert.match(perma,/data-social-folder/);
 assert.match(read('social-actions.js'),/status==='connected'/);
});
test('Avatars recover after failed signed links and icon names are defined',()=>{
 const app=read('app.js');
 assert.match(app,/document.addEventListener\('error'/);
 assert.match(app,/state.avatarRetries/);
 assert.match(app,/signAvatar\(person,true\)/);
 for(const icon of ['bell','megaphone','users','link','flag','refresh'])assert.match(app,new RegExp(icon+":'<path"));
});

test('When both match, a permanent chat opens outside Ao vivo',()=>{
 const app=read('app.js');
 assert.match(app,/chat:pairView/);
 assert.match(app,/state.view=data.status==='connected'\?'chat':'connect'/);
 assert.match(app,/state.view='chat';render\(\)/);
 assert.match(app,/function connectView\(\)\{\s*if\(state.pair\?\.status==='active'\)/);
});

test('Permanent conversations have one discreet menu and an individual delete action',()=>{
 const source=read('social-conversations.js');
 const actions=read('social-actions.js'),core=read('social-core.js');
 assert.match(source,/conversation-menu/);
 assert.match(source,/data-action="conversationDeletePrompt"/);
 assert.match(source,/api\.isHidden\?\.\(p\.id\)/);
 assert.doesNotMatch(source,/conversation-entry-actions/);
 assert.match(actions,/entre_conversation_delete/);
 assert.match(actions,/conversationDeleteConfirm/);
 assert.match(core,/isHidden/);
 assert.match(read('app.js'),/m==='deleteConversation'/);
});
test('Notifications are dismissible individually or all and describe 24-hour expiry',()=>{
 const source=read('social-notifications.js'),actions=read('social-actions.js');
 assert.match(source,/data-action="notificationsClear"/);
 assert.match(source,/data-action="notificationsDismiss"/);
 assert.match(source,/24 horas/);
 assert.match(actions,/entre_notifications_clear/);
 assert.match(read('social-core.js'),/toolbar-bell \.social-unread/);
});
test('No conversation organization actions are rendered inside temporary live chat',()=>{
 const source=read('social-effects.js');
 const api={pref:()=>({}),conversationMenu:()=>'<details class="conversation-menu"><summary>Opções</summary></details>'};
 new Function('window','state','ico','esc',source)({entreSocial:api},{motionOff:true},name=>'icon:'+name,String);
 assert.doesNotMatch(api.chatToolbar({id:'temporary',origin:'live',status:'active'}),/conversation-menu/);
 assert.match(api.chatToolbar({id:'saved',origin:'live',status:'connected'}),/conversation-menu/);
});

test('Conversation deletion and notification clearing execute the correct owner-scoped RPCs',async()=>{
 const calls=[],state={pairs:[{id:'abc',status:'connected'}],pair:null,channel:null,modal:null};
 let prefRefresh=0,notificationRefresh=0;
 const api={data:{deleteConversationId:null},rpc:async(name,args)=>{calls.push([name,args]);return {ok:true}},
  loadPrefs:async()=>{prefRefresh++},refreshNotifications:async()=>{notificationRefresh++}};
 let navTarget=null;
 new Function('window','state','render','renderView','toast','nav','confirm','db','loadPairs','openPair','infoError',read('social-actions.js'))(
  {entreSocial:api},state,()=>{},()=>{},()=>{},target=>{navTarget=target},()=>true,
  {removeChannel:()=>{}},()=>{},()=>{},error=>String(error)
 );
 await api.action('conversationDeletePrompt',{dataset:{id:'abc'}});
 assert.equal(state.modal,'deleteConversation');
 await api.action('conversationDeleteConfirm',{dataset:{}});
 assert.equal(navTarget,'conversations');
 assert.equal(state.modal,null);
 assert.equal(prefRefresh,1);
 assert.deepEqual(calls[0],['entre_conversation_delete',{_pair:'abc'}]);
 await api.action('notificationsDismiss',{dataset:{id:'12'}});
 await api.action('notificationsClear',{dataset:{}});
 assert.deepEqual(calls[1],['entre_notifications_clear',{_id:12}]);
 assert.deepEqual(calls[2],['entre_notifications_clear',undefined]);
 assert.equal(notificationRefresh,2);
});

test('Mandatory polls block site and release after one confirmed vote',async()=>{
 const code=read('social-bulletins.js'),future=new Date(Date.now()+3600000).toISOString();
 const poll={id:44,title:'Enquete de teste',kind:'poll',body:'Vote para continuar',options:['Sim','Não'],expires_at:future};
 const called=[],viewState={session:{user:{id:'member'}},profile:{id:'member'},pair:null,suspension:null,view:'home'};
 let renders=0,notification='',chosen=true;
 const api={data:{},rpc:async(name,args)=>{
  called.push([name,args]);
  if(name==='entre_bulletin_vote')return {status:'voted',option:0};
  if(name==='entre_bulletins_feed')return {required_poll:null,items:[{...poll,my_vote:0,votes_total:1,votes_by_option:[1,0]}]};
 }};
 const doc={querySelector:sel=>sel==='input[name="required-poll-choice"]:checked'&&chosen?{value:'0'}:null,
  getElementById:()=>({textContent:''}),activeElement:null};
 new Function('window','state','heading','ico','esc','document','maintenanceIsActive','render','renderView','toast','infoError',code)(
  {entreSocial:api},viewState,(a,b,d)=>a+b+d,name=>name,String,doc,()=>false,()=>renders++,()=>{},s=>notification=s,e=>e.message
 );
 api.data.pendingPoll=poll;
 assert.match(api.pollGateView(),/VOTO OBRIGATÓRIO/);
 assert.match(api.pollGateView(),/Confirmar meu voto/);
 await api.bulletinAction('bulletinVote',{dataset:{id:'44'},disabled:false,innerHTML:'Votar',textContent:''});
 assert.equal(api.requiredPoll(),null);
 assert.equal(api.pollGateView(),'');
 assert.deepEqual(called[0],['entre_bulletin_vote',{_bulletin:44,_option:0}]);
 assert.match(notification,/Voto registrado/);
 assert.ok(renders>0);
});
test('Official posts have response forms and polls offer results after voting',()=>{
 const code=read('social-bulletins.js');
 const api={data:{}},now=new Date(Date.now()+3600000).toISOString();
 new Function('window','state','heading','ico','esc',code)({entreSocial:api},{},(a,b,d)=>a+b+d,n=>n,String);
 api.data.bulletinLoaded=true;api.data.bulletins=[
  {id:1,kind:'notice',title:'Aviso',body:'Responda',expires_at:now,created_at:new Date().toISOString(),my_reply:null},
  {id:2,kind:'poll',title:'Pergunta',body:'Voto salvo',options:['Sim','Não'],my_vote:1,votes_total:3,votes_by_option:[1,2],expires_at:now,created_at:new Date().toISOString()}
 ];
 const html=api.bulletinsView();
 assert.match(html,/data-action="bulletinReply"/);
 assert.match(html,/Voto registrado/);
 assert.match(html,/3 voto\(s\)/);
});
test('Admin creates official notices and polls, and can read responses',()=>{
 const admin=read('admin/app.js'),editor=read('admin/bulletins.js');
 assert.match(admin,/entre_admin_publish_bulletin/);
 assert.match(admin,/entre_admin_bulletins/);
 assert.match(admin,/\["bulletins","Avisos","message-circle"\]/);
 assert.match(editor,/Respostas/);
 assert.match(editor,/Enquete obrigatória/);
 assert.match(editor,/Voto único|voto/i);
 assert.doesNotMatch(admin,/data-action="send-announcement"/);
});

test('Posts feed supports publishing, likes, comments and own deletion',()=>{
 const app=read('app.js'),src=read('entre-features.js');
 assert.match(app,/\['posts','Posts','edit'\]/);
 assert.match(src,/entre_posts_feed/);
 for(const action of ['entre_post_create','entre_post_comment','entre_post_like','entre_post_delete'])assert.ok(src.includes(action));
 assert.match(src,/postCreateForm/);
 assert.match(src,/post-comment-form/);
});
test('Live encounters can choose chat or video and request exclusive Premium matching',()=>{
 const app=read('app.js'),video=read('entre-video.js');
 assert.match(app,/data-action="liveMode"/);
 assert.match(app,/data-value="video"/);
 assert.match(app,/data-value="chat"/);
 assert.match(app,/entre_find_mode/);
 assert.match(app,/_mode:state.liveMode/);
 assert.match(app,/upgradeFilter/);
 assert.match(video,/getUserMedia/);
 assert.match(video,/RTCPeerConnection/);
 assert.match(video,/private:true/);
 assert.match(video,/cleanup/);
 assert.match(video,/activePair\(state.pair\)/);
});
test('No 3D effects and subtle two-person introductory animation',()=>{
 const css=read('social-animations.css'),effects=read('social-effects.js');
 assert.doesNotMatch(css,/perspective:|rotateY\(|transform-style:preserve-3d/);
 assert.match(css,/meet-stage/);
 assert.match(effects,/meet-left/);
 assert.match(effects,/1450/);
});
test('Profile toolbar opens menu with profile, settings, Premium and site support',()=>{
 const app=read('app.js');
 assert.match(app,/data-action="profileMenu"/);
 assert.match(app,/class="profile-dropdown"/);
 assert.match(app,/Ver perfil/);
 assert.match(app,/Configurações/);
 assert.match(app,/Assinatura Premium/);
 assert.match(app,/Relatar problema/);
});
test('Premium checkout never claims to charge before an enabled plan and verified payment',()=>{
 const src=read('entre-features.js');
 assert.match(src,/entre_premium_overview/);
 assert.match(src,/entre_premium_badges/);
 assert.match(src,/premiumCheckout/);
 assert.match(src,/checkout_enabled/);
 assert.match(src,/mercadopago/);
 assert.match(src,/paid_until/);
 assert.match(src,/entre_premium_whatsapp/);
 assert.match(src,/data-action="premiumWhatsapp"/);
 assert.doesNotMatch(src,/5518988234267/);
});
test('Support requires evidence and sends a secured ticket to the dedicated mailbox',()=>{
 const src=read('entre-features.js'),admin=read('admin/extra-admin.js');
 assert.match(src,/supportTicketForm/);
 assert.match(src,/entre_support_submit/);
 assert.match(src,/entre-support-evidence/);
 assert.match(src,/entre-support-email/);
 assert.match(src,/connectapp.w@gmail.com/);
 assert.match(admin,/supportPage/);
 assert.match(admin,/priceParams/);
});

test('Posts, temporary video, premium checkout and account support remain wired to the app',()=>{
 const app=read('app.js'),extras=read('entre-features.js'),video=read('entre-video.js');
 assert.match(app,/\['posts','Posts','edit'\]/);
 assert.match(app,/data-action="liveMode"/);
 assert.match(app,/entre_find_mode/);
 assert.match(app,/data-action="profileMenu"/);
 assert.match(app,/data-view="settings"/);
 assert.match(extras,/entre_posts_feed/);
 assert.match(extras,/entre-premium-checkout/);
 assert.match(extras,/entre_support_submit/);
 assert.match(extras,/connectapp.w@gmail.com|support-contact/);
 assert.doesNotMatch(extras,/connectapp\.w@gmail\.com/);
 assert.match(video,/RTCPeerConnection/);
 assert.match(video,/mediaDevices\.getUserMedia/);
 assert.match(video,/private:true/);
});
