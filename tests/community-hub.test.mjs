import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('all community modules and admin scripts parse',()=>{
 for(const f of ['docs/site-search.js','docs/rooms.js','docs/camera-lives.js','docs/premium-recurring.js','docs/app.js','docs/entre-features.js','docs/admin/app.js','docs/admin/extra-admin.js']){
  assert.doesNotThrow(()=>new vm.Script(read(f),{filename:f}),f);
 }
});
test('global search is available from the toolbar, and Conversations owns the @ lookup',()=>{
 const app=read('docs/app.js'),index=read('docs/index.html');
 assert.match(app,/mobileTabs=\['posts','connect','rooms','lives','conversations'\]/);
 assert.match(app,/toolbar-global-search/);
 assert.match(app,/window\.entreSearch\?\.view/);
 assert.match(index,/experience-hub\.css/);
 for(const file of ['site-search.js','rooms.js','camera-lives.js','premium-recurring.js'])assert.ok(index.includes(file),file);
 assert.match(read('docs/site-search.js'),/entre_user_search/);
 assert.match(read('docs/site-search.js'),/entre_site_posts_search/);
 assert.match(read('docs/social-conversations.js'),/conversationSearchMarkup/);
 assert.doesNotMatch(read('docs/social-online.js'),/peopleSearchInput/);
});
test('server manages exactly the Brazilian official chat keys and a 5s global cooldown',()=>{
 const sql=read('supabase/migrations/20261123190000_official_geo_chat_rooms.sql');
 assert.match(sql,/if _room='br'/);
 assert.match(sql,/if _room ~ '\^s:/);
 assert.match(sql,/if _room ~ '\^c:/);
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.match(sql,/interval '5 seconds'/);
 assert.match(sql,/interval '24 hours'/);
 assert.match(sql,/cron\.schedule\('entre-room-messages-24h'/);
 assert.match(sql,/revoke all on public\.entre_room_messages from public,anon,authenticated/);
 assert.match(sql,/revoke all on function public\.entre_room_send/);
 assert.match(read('docs/rooms.js'),/entre_room_send/);
 assert.match(read('docs/rooms.js'),/servicodados\.ibge\.gov\.br/);
 assert.match(read('docs/rooms.js'),/flags-brasil\/flags\/uf/);
});
test('camera LiveKit broadcaster supports one approved guest and viewer-only permissions',()=>{
 const sql=read('supabase/migrations/20261123192000_camera_lives.sql');
 const token=read('supabase/functions/entre-camera-live-token/index.ts');
 const ui=read('docs/camera-lives.js');
 assert.match(sql,/guest_id uuid references/);
 assert.match(sql,/entre_live_review_guest/);
 assert.match(sql,/entre_live_request_guest/);
 assert.match(sql,/entre_live_expire/);
 assert.match(token,/canPublish:publisher/);
 assert.match(token,/roomJoin:true/);
 assert.match(token,/room:"entre-live-"/);
 assert.match(ui,/enableCameraAndMicrophone/);
 assert.match(ui,/camera-live-grid/);
 assert.match(ui,/data-live-action="request"/);
});
test('admin deletion is protected and separate from banning',()=>{
 const edge=read('supabase/functions/entre-admin-delete-user/index.ts');
 const adm=read('docs/admin/app.js');
 assert.match(edge,/entre_admin_check/);
 assert.match(edge,/auth\.admin\.deleteUser/);
 assert.match(edge,/cannot_delete_admin/);
 assert.match(edge,/confirmation_mismatch/);
 assert.match(edge,/cancel_recurring_first/);
 assert.match(adm,/admin-delete-user-form/);
 assert.match(adm,/entre-admin-delete-user/);
 assert.match(adm,/EXCLUIR /);
 assert.doesNotMatch(adm,/\["pairs","Conexões"/);
});
test('recurring payment is opt-in and only verified invoices unlock Premium',()=>{
 const sql=read('supabase/migrations/20261123194000_recurring_premium_verified.sql');
 const api=read('supabase/functions/entre-premium-recurring/index.ts');
 const hook=read('supabase/functions/entre-premium-recurring-webhook/index.ts');
 const ui=read('docs/premium-recurring.js');
 assert.match(sql,/recurring_enabled boolean not null default false/);
 assert.match(sql,/service_role/);
 assert.match(sql,/status='authorized'/);
 assert.match(api,/preapproval/);
 assert.match(api,/cancelled/);
 assert.match(api,/payment\?\.status==="approved"/);
 assert.match(hook,/signed\(req,id,signature\)/);
 assert.match(hook,/entre_premium_recurring_apply/);
 assert.match(ui,/recurringConsent/);
 assert.match(ui,/Cancela?r/);
 assert.match(read('docs/admin/extra-admin.js'),/recurringPage/);
});
test('password recovery is small on mobile and no screen has desktop-only overflow',()=>{
 const css=read('docs/experience-hub.css');
 assert.match(css,/\.auth-email-links \.text-link/);
 assert.match(css,/width:auto!important/);
 assert.match(css,/@media\(max-width:355px\)/);
 assert.match(css,/minmax\(0,1fr\)/);
});
