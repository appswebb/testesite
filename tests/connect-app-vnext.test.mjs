import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('app, social and admin scripts parse',()=>{
 for(const path of ['docs/app.js','docs/entre-features.js','docs/social-notifications.js','docs/admin/app.js','docs/motion.js']){
  assert.doesNotThrow(()=>new vm.Script(read(path),{filename:path}));
 }
});
test('live has one compact start action after collapsed filters',()=>{
 const s=read('docs/app.js'),a=s.slice(s.indexOf('function connectView(){'),s.indexOf('function pairView(){'));
 assert.match(a,/live-app-card/);
 assert.match(a,/live-app-filters/);
 assert.match(a,/live-app-find/);
 assert.ok(a.indexOf('live-app-filters')<a.indexOf('live-app-find'));
 assert.doesNotMatch(a,/class="stage"/);
});
test('profiles menu keeps data rules; settings do not duplicate core actions',()=>{
 const s=read('docs/app.js'),settings=s.slice(s.indexOf('function settingsView(){'),s.indexOf('function reportDialog(){'));
 assert.match(s,/role="menuitem" href="\.\/dados\.html"/);
 for(const text of ['Quem você procura','Painel administrativo','Sair da conta'])assert.doesNotMatch(settings,new RegExp(text));
 assert.match(settings,/motionLevel/);
 assert.match(settings,/Leve/);
 assert.match(settings,/Média/);
 assert.match(settings,/Máxima/);
});
test('comment threads are bounded, expandable, and owner scoped',()=>{
 const js=read('docs/entre-features.js'),css=read('docs/functional-updates.css');
 assert.match(js,/comments-overlay/);
 assert.match(js,/entre_post_comments_page/);
 assert.match(js,/postCommentsOpen/);
 assert.match(js,/post-comment-edit-form/);
 assert.match(js,/post-comment-report-form/);
 assert.match(js,/postCommentDelete/);
 assert.match(js,/entre_post_comment_edit/);
 assert.match(read('docs/interface-polish.css'),/\.comments-dialog-list\{flex:1;min-height:0;overflow-y:auto/);
 const sql=read('supabase/migrations/20261123213000_comments_moderation_notices.sql');
 assert.match(sql,/where id=_comment and author_id=uid/);
 assert.match(sql,/create table if not exists public\.entre_comment_reports/);
 assert.match(sql,/enable row level security/);
});
test('banned and restored notifications are persisted and displayed',()=>{
 const sql=read('supabase/migrations/20261123213000_comments_moderation_notices.sql');
 assert.match(sql,/create trigger entre_moderation_notify_trigger/);
 assert.match(sql,/account_suspended/);
 assert.match(sql,/account_restored/);
 assert.match(read('docs/social-notifications.js'),/Sua conta foi reativada/);
});
test('browser payment integration never trusts client pricing or status',()=>{
 const ts=read('supabase/functions/entre-premium-web/index.ts');
 const webhook=read('supabase/functions/entre-premium-payment-webhook/index.ts');
 assert.match(ts,/transaction_amount:cents\/100/);
 assert.match(ts,/payment_method_id:method/);
 assert.match(ts,/MERCADOPAGO_PUBLIC_KEY/);
 assert.match(ts,/external_reference/);
 assert.match(webhook,/signatureOk\(/);
 assert.match(webhook,/transaction_amount/);
 assert.match(webhook,/entre_premium_subscriptions/);
 assert.match(read('docs/entre-features.js'),/sdk\.mercadopago\.com\/js\/v2/);
});

test('updated colorful design covers core app pages without changing billing logic',()=>{
 const html=read('docs/index.html'),admin=read('docs/admin/index.html');
 const manifest=JSON.parse(read('docs/manifest.webmanifest'));
 const app=read('docs/app.js'),extras=read('docs/entre-features.js');
 assert.match(html,/<title>entre\. — O próximo oi pode mudar tudo\.<\/title>/);
 assert.match(html,/functional-updates\.css/);
 assert.doesNotMatch(html,/connect-app\.css/);
 assert.doesNotMatch(admin,/connect-admin\.css/);
 assert.match(admin,/comment-report-updates\.css/);
 assert.equal(manifest.short_name,'entre.');
 assert.equal(manifest.theme_color,'#F6F7F7');
 assert.match(html,/theme\.js/);
 assert.match(html,/theme\.css/);
 assert.match(read('docs/theme.js'),/entre\.appearance\.v1/);
 assert.match(html,/once-ui\.css/);
 assert.match(html,/once-public\.css/);
 assert.match(admin,/once-admin\.css/);
 assert.match(read('docs/perfil.html'),/perfil-once\.css/);
 assert.match(app,/aria-label="entre\. início"/);
 assert.doesNotMatch(app,/aria-label="CONNECT início"/);
 assert.match(extras,/ENTRE\. PREMIUM/);
 assert.match(extras,/entre_post_comment_delete/);
 assert.match(extras,/entre-premium-web/);
});


test('live filters are a contained sheet with the primary search action permanently in its footer',()=>{
 const app=read('docs/app.js');
 const live=app.slice(app.indexOf('function connectView(){'),app.indexOf('function pairView(){'));
 const css=read('docs/functional-updates.css');
 const geo=read('docs/entre-location.js');
 assert.match(live,/class="live-filter-footer"/);
 assert.match(live,/class="live-filter-find"/);
 assert.match(live,/data-action="liveFiltersClose"/);
 assert.match(live,/compactPanel/);
 assert.match(css,/\.live-app-filters\[open\]\s*\{/);
 assert.match(css,/position:fixed;z-index:1001/);
 assert.match(css,/\.live-app-filters\[open\] \.live-filter-footer/);
 assert.match(css,/overflow-y:auto;overflow-x:hidden/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(geo,/function compactPanel\(/);
 assert.match(geo,/geo-location-mini/);
 const original=live.match(/data-action="'\+\(waiting\?'cancelsearch':'startsearch'\)\+'/g)||[];
 assert.equal(original.length,2,'Both default card and filter sheet must start the same search');
});
test('filter state and inner scroll survive rerenders, and search automatically closes the drawer',()=>{
 const app=read('docs/app.js');
 assert.match(app,/liveFiltersOpen:false/);
 assert.match(app,/state\.liveFiltersOpen\?'open'/);
 assert.match(app,/const liveScroll=document\.querySelector/);
 assert.match(app,/body > \.live-app-filters \.live-app-filter-body/);
 assert.match(app,/document\.body\.appendChild\(inline\)/);
 assert.match(app,/syncLiveFilters\(liveScroll\)/);
 assert.match(app,/state\.liveFiltersOpen=false;document\.body\.classList\.remove\('live-filters-open'\);state\.searching=true/);
 assert.match(app,/case'liveFiltersClose'/);
 assert.doesNotMatch(app,/addEventListener\('toggle'/);
 assert.match(app,/case'liveFiltersOpen'/);
 assert.match(app,/live-filter-dismiss-overlay/);
});
