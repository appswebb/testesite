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
 assert.match(settings,/motionForce/);
});
test('comment threads are bounded, expandable, and owner scoped',()=>{
 const js=read('docs/entre-features.js'),css=read('docs/connect-app.css');
 assert.match(js,/post-comments-sheet/);
 assert.match(js,/post-comment-edit-form/);
 assert.match(js,/post-comment-report-form/);
 assert.match(js,/postCommentDelete/);
 assert.match(js,/entre_post_comment_edit/);
 assert.match(css,/\.post-comment-list\{max-height/);
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
