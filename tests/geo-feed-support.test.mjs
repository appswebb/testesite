import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=name=>readFileSync(new URL('../docs/'+name,import.meta.url),'utf8');
const app=read('app.js'),features=read('entre-features.js'),geo=read('entre-location.js');
test('Feed is first in navigation and becomes the initial authenticated section',()=>{
 assert.match(app,/const tabs=\[\['posts','Feed','edit'\]/);
 assert.match(app,/const state=\{mode:'landing',view:'posts'/);
 assert.match(features,/Feed <em>social/);
 assert.ok(features.indexOf('entreStories?.markup')<features.indexOf('Feed <em>social'),'Stories should precede the feed header');
});
test('administrator menu shortcut is conditional and settings is not repeated inside profile',()=>{
 assert.match(app,/state\.isAdmin\?'<a role="menuitem" class="profile-menu-admin"/);
 assert.match(app,/Entrar no painel/);
 const i=app.indexOf('function profileView()'),j=app.indexOf('function settingsView()',i);
 assert.ok(i>=0&&j>i);
 assert.doesNotMatch(app.slice(i,j),/data-view="settings"/);
 assert.match(read('entre-location.css'),/\.profile-dropdown a\.profile-menu-admin/);
});
test('support allows reports without images and keeps the private proof storage',()=>{
 assert.match(features,/Anexos \(opcionais\)/);
 assert.doesNotMatch(features,/multiple required/);
 assert.doesNotMatch(features,/if\(files\.length<1/);
 assert.match(features,/if\(files\.length>3\)/);
 assert.match(features,/entre_support_submit/);
 assert.match(features,/entre-support-evidence/);
});
test('geo client keeps only city/state and uses reciprocal matching service',()=>{
 assert.match(geo,/entre_my_location/);
 assert.match(geo,/entre_set_location/);
 assert.match(geo,/navigator\.geolocation\.getCurrentPosition/);
 assert.match(geo,/nominatim\.openstreetmap\.org\/reverse/);
 assert.match(geo,/servicodados\.ibge\.gov\.br/);
 assert.match(geo,/Sem GPS salvo/);
 assert.doesNotMatch(geo,/localStorage\.(setItem|getItem)/);
 assert.match(app,/entre_find_mode_location/);
 assert.match(app,/window\.entreGeo\?\.target\?\.\(\)/);
 assert.match(app,/As buscas de chat e vídeo usam filas separadas/);
});
function setup(){
 let onChange=null;
 let locationCalls=[];
 const locationState={view:'connect',searching:false};
 const context={
  window:{},document:{addEventListener:(name,cb)=>{if(name==='change')onChange=cb}},
  navigator:{geolocation:{}},state:locationState,
  URL,console,setTimeout,clearTimeout,
  esc:s=>String(s),ico:()=>'<svg/>',renderView:()=>{},toast:()=>{},
  db:{rpc:async(name,p)=>{locationCalls.push({name,p});if(name==='entre_my_location')return {data:null,error:null};
   if(name==='entre_set_location')return {data:{state:p._state,city:p._city},error:null};
   return {data:null,error:null};}},
  fetch:async()=>({ok:true,json:async()=>[{nome:'Penápolis'},{nome:'São Paulo'}]})
 };
 vm.runInNewContext(geo,context,{filename:'entre-location.js'});
 const change=(field,value)=>{
  const element={dataset:{geoField:field},value,closest:selector=>selector==='[data-geo-field]'?element:null};
  onChange({target:element});
 };
 return {api:context.window.entreGeo,change,locationCalls};
}
test('user can choose a state and city manually and filter their own region',async()=>{
 const {api,change,locationCalls}=setup();
 await api.init();
 assert.deepEqual(JSON.parse(JSON.stringify(api.target())),{_target_state:null,_target_city:null});
 assert.match(api.panel(false),/data-action="geoDetect"/);
 assert.match(api.panel(false),/data-action="geoSave"/);
 change('home-state','SP');change('home-city','Penápolis');
 await api.action('geoSave');
 assert.equal(locationCalls.at(-1).name,'entre_set_location');
 assert.equal(locationCalls.at(-1).p._state,'SP');
 assert.equal(locationCalls.at(-1).p._city,'Penápolis');
 change('target-mode','my_city');
 assert.equal(api.target()._target_state,'SP');
 assert.equal(api.target()._target_city,'Penápolis');
 change('target-mode','other_state');change('target-state','RJ');
 assert.equal(api.target()._target_state,'RJ');
 assert.equal(api.target()._target_city,null);
});
test('checkout waits for a real price, prevents duplicate attempts, and never self-approves',()=>{
 assert.match(features,/checkoutBusy/);
 assert.match(features,/if\(data\.checkoutBusy\)return/);
 assert.match(features,/mercadopago/);
 assert.match(features,/checkout_enabled/);
 assert.match(app,/premiumReturn/);
 assert.match(app,/assinatura será liberada apenas após confirmação do pagamento/);
});
