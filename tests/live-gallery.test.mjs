import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../docs/'+p,import.meta.url),'utf8');

test('visual lives show real signed covers or host avatar; not invented viewer totals',()=>{
 const js=read('camera-lives.js');
 assert.doesNotThrow(()=>new vm.Script(js));
 const card=js.slice(js.indexOf('function card(l){'),js.indexOf('function viewer(){'));
 assert.match(card,/live-visual-card/);
 assert.match(card,/live-visual-picture/);
 assert.match(card,/live-visual-badge/);
 assert.match(card,/categoryLabel/);
 assert.match(card,/live-visual-watch/);
 assert.match(card,/fresh\(s.images,l.cover_path\)/);
 assert.match(card,/fresh\(s.avatars,l.host_avatar_path\)/);
 assert.match(card,/data-live-action="join"/);
 assert.doesNotMatch(card,/viewerCount|watchingCount|fakeViewers|\\d+K/);
});
test('filters, thumbnail uploads and start are wired to database with limited signed URLs',()=>{
 const js=read('camera-lives.js');
 for(const key of ['musica','games','criatividade','conversa','outros'])
  assert.match(js,new RegExp("'"+key+"'"));
 for(const action of ['category','region','resetFilters','create','join'])
  assert.match(js,new RegExp("type==='"+action+"'"));
 assert.match(js,/createSignedUrls\(paths,300\)/);
 assert.match(js,/entre_live_start_visual/);
 assert.match(js,/prepareCover/);
 assert.match(js,/3145728/);
 assert.match(js,/cacheControl:'300'/);
 const html=read('index.html');
 assert.match(html,/live-explore.css/);
 assert.ok(html.includes('camera-lives.js?v=20261124-live-moderation-v5'));
 const css=read('live-explore.css');
 assert.match(css,/live-visual-grid/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/var\(--ui-accent\)/);
 assert.match(css,/live-cover-preview/);
});
test('private cover bucket and RPC keep row-level restrictions',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261123235500_visual_live_discovery_covers_categories.sql',import.meta.url),'utf8');
 for(const marker of [
  'public.entre_live_start_visual','auth.uid()','storage.objects',
  "l.status='active' and l.expires_at>now()",
  'not exists(select 1 from public.entre_blocks',
  "bucket_id='entre-live-covers'",'public=false'
 ])assert.ok(sql.includes(marker),'Migration missing '+marker);
});
