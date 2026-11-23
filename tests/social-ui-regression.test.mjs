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
test('Mobile menu shows five main sections with unique icons',()=>{
 const app=read('app.js');
 assert.match(app,/tabs.filter\(t=>t\[0\]!=='home'\)/);
 assert.match(app,/\['online','Online','users'\]/);
 assert.match(app,/\['connections','Suas conexões','link'\]/);
 assert.match(app,/class="toolbar-profile"/);
});
test('Closed live connections appear only within 24 hours; conversations require a match',()=>{
 const conv=read('social-conversations.js'),state={
  session:{user:{id:'self'}},pairsProfiles:{
   recent:{id:'other',display_name:'Pessoa Recente'},
   expired:{id:'gone',display_name:'Pessoa Antiga'},
   connected:{id:'matched',display_name:'Match'}},
  pairs:[
   {id:'recent',a:'self',b:'other',status:'closed',origin:'live',closed_at:new Date(Date.now()-3600000).toISOString()},
   {id:'expired',a:'self',b:'gone',status:'closed',origin:'live',closed_at:new Date(Date.now()-90000000).toISOString()},
   {id:'connected',a:'self',b:'matched',status:'connected',origin:'live',created_at:new Date().toISOString()}
  ]};
 const api={data:{filter:'all'},pref:()=>({})};
 const render=new Function('window','state','heading','avatar','esc','ico','genders',conv);
 const heading=(k,t,d)=>k+t+d;
 const avatar=p=>'<div>'+p.display_name+'</div>';
 render({entreSocial:api},state,heading,avatar,String,x=>'icon:'+x,{});
 const temp=api.connectionsView(),msgs=api.conversationsView();
 assert.match(temp,/Pessoa Recente/);
 assert.doesNotMatch(temp,/Pessoa Antiga/);
 assert.doesNotMatch(temp,/Match</);
 assert.match(temp,/data-action="profileOpen"/);
 assert.match(temp,/data-action="socialFollow"/);
 assert.doesNotMatch(temp,/conversationPin|conversationArchive|social-folder/);
 assert.match(msgs,/Match</);
 assert.doesNotMatch(msgs,/Pessoa Recente/);
 assert.match(msgs,/conversationArchive/);
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
 assert.match(app,/function connectView\(\)\{if\(state.pair\?\.status==='active'\)/);
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
