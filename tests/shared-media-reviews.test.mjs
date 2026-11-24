import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('public profile has meaningful guest and member navigation, secure server avatar',()=>{
 const html=read('docs/perfil.html'),css=read('docs/perfil.css'),js=read('docs/perfil.js');
 assert.match(html,/Ir para o site/);
 assert.match(html,/shareAvatar/);
 assert.match(html,/shareActions/);
 assert.match(html,/shareName/);
 assert.match(js,/entre-shared-profile/);
 assert.match(js,/auth=login/);
 assert.match(js,/auth=signup/);
 assert.match(js,/\?profile=/);
 assert.match(js,/avatar_url/);
 assert.match(js,/name\.textContent=String\(p\.display_name/);
 assert.match(js,/\.slice\(0,90\)/);
 assert.match(css,/\.share-profile-card/);
 assert.match(css,/@media\(max-width:810px\)/);
 assert.doesNotMatch(html,/service.role|service_role|sb_secret_/i);
 assert.doesNotMatch(js,/service.role|service_role|sb_secret_/i);
});
test('server creates an avatar signed link for a valid private .webp path',()=>{
 const source=read('supabase/functions/entre-shared-profile/index.ts');
 assert.ok(source.includes(String.raw`/^[0-9a-f-]{36}\.webp$/i`));
 assert.ok(!source.includes(String.raw`/^[0-9a-f-]{36}\\.webp$/i`));
 assert.match(source,/createSignedUrl/);
 assert.match(source,/startsWith\(p\.id\+"\/"\)/);
});
test('share link keeps legacy ?u= and new high contrast CTA',()=>{
 const app=read('docs/app.js'),index=read('docs/index.html'),css=read('docs/interface-polish.css');
 assert.match(index,/\.\/perfil\.html\?u=/);
 assert.match(app,/\.\/perfil\.html\?u=/);
 assert.match(app,/profile-share-primary/);
 assert.match(app,/navigator\.share/);
 assert.match(css,/\.profile-share-primary/);
 assert.match(css,/background:var\(--ui-accent,#171717\)!important/);
 assert.match(css,/color:var\(--ui-accent-on,#fff\)!important/);
});
test('comments display as fullscreen mobile dialog and paginate securely',()=>{
 const app=read('docs/app.js'),feature=read('docs/entre-features.js'),css=read('docs/interface-polish.css');
 assert.match(feature,/comments-overlay/);
 assert.match(feature,/postCommentsClose/);
 assert.match(feature,/postCommentsMore/);
 assert.match(feature,/entre_post_comments_page/);
 assert.match(feature,/full-comment-content/);
 assert.match(app,/case'postCommentsOpen'/);
 assert.match(css,/\.comments-dialog-list\{flex:1;min-height:0;overflow-y:auto/);
 assert.match(css,/\.comments-dialog\{width:100vw;height:100dvh/);
 const sql=read('supabase/migrations/20261123173000_paginated_comments.sql');
 assert.match(sql,/limit 31/);
 assert.match(sql,/auth\.uid\(\)/);
 assert.match(sql,/entre_blocks/);
 assert.match(sql,/grant execute on function public\.entre_post_comments_page/);
});
test('feed images/videos are validated and kept private',()=>{
 const app=read('docs/feed-media.js'),feature=read('docs/entre-features.js');
 const sql=read('supabase/migrations/20261123183000_feed_media.sql');
 assert.match(app,/image\/webp/);
 assert.match(app,/canvas\.toBlob/);
 assert.match(app,/video\/mp4/);
 assert.match(app,/video\/webm/);
 assert.match(app,/crypto\.randomUUID\(\)/);
 assert.match(app,/entre_post_create_media/);
 assert.match(feature,/entreMedia\.publish/);
 assert.match(feature,/entreMedia\?\.signPosts/);
 assert.match(sql,/public=false/);
 assert.match(sql,/auth\.uid\(\)::text/);
 assert.match(sql,/create policy entre_post_media_insert_own/);
 assert.match(sql,/create policy entre_post_media_read_visible/);
 assert.match(sql,/create policy entre_post_media_delete_own/);
 assert.match(sql,/allowed_mime_types/);
});
test('moderation is isolated and appeals have own tab, compact admin navigation',()=>{
 const admin=read('docs/admin/app.js'),css=read('docs/admin/comment-report-updates.css');
 const revoke=read('supabase/migrations/20261123194000_revoke_moderation_trigger_rpc.sql');
 assert.match(admin,/\["appeals","Contestações","alert-circle"\]/);
 assert.match(admin,/if\(view==="appeals"\)state\.appeals=/);
 assert.match(admin,/adminMobileNav\(/);
 assert.match(admin,/mainMobileSections/);
 assert.match(admin,/data-action="admin-more"/);
 assert.match(css,/\.admin-more-menu\[hidden\]/);
 assert.match(revoke,/revoke all on function public\.entre_notify_moderation_change/);
});
test('LiveKit token is member only and code falls back to existing P2P video',()=>{
 const t=read('supabase/functions/entre-livekit-token/index.ts');
 const client=read('docs/entre-livekit.js'),video=read('docs/entre-video.js');
 assert.match(t,/auth\.getUser/);
 assert.match(t,/pair\.a!==user\.id&&pair\.b!==user\.id/);
 assert.match(t,/pair\.status!=="active"/);
 assert.match(t,/roomJoin:true/);
 assert.match(t,/ttl:480/);
 assert.match(client,/livekit-client@2\.25\.0/);
 assert.match(client,/enableCameraAndMicrophone/);
 assert.match(video,/window\.entreLiveKit\?\.start/);
 assert.match(video,/RTCPeerConnection/);
});
test('frontend scripts compile',()=>{
 for(const path of ['docs/perfil.js','docs/feed-media.js','docs/entre-livekit.js','docs/entre-video.js','docs/app.js','docs/entre-features.js','docs/admin/app.js']){
  assert.doesNotThrow(()=>new vm.Script(read(path),{filename:path}),path);
 }
});
