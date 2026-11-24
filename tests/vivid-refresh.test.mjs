import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../docs/'+p,import.meta.url),'utf8');
test('updated product landing and original preview assets are present',()=>{
 const app=read('app.js');
 for(const tag of ['landing-product-demo','hero-showcase','preview-encounter.svg','preview-lives.svg','motion-level-picker','toggleEncounterChat'])
  assert.ok(app.includes(tag),'Missing '+tag);
 for(const image of ['preview-encounter.svg','preview-lives.svg']){
  const svg=read(image);
  assert.ok(svg.includes('<svg')&&svg.includes('viewBox='));
  assert.ok(svg.includes('ilustrativa')||svg.includes('ilustrativo'));
 }
});
test('theme includes three intensities, colorful nonblack dark mode and personal accent',()=>{
 const app=read('app.js'),theme=read('theme.js'),css=read('design-refresh.css');
 assert.ok(app.includes("'light','Leve'")&&app.includes("'medium','Média'")&&app.includes("'high','Máxima'"));
 assert.ok(theme.includes("'#B4A6FF'"));
 assert.ok(theme.includes("state.mode==='custom'?state.color"));
 assert.ok(css.includes('html[data-theme="dark"]'));
 assert.ok(css.includes('#141827'));
 assert.ok(css.includes('data-motion-level="high"'));
});
test('private chat media handlers and database RLS are wired',()=>{
 const app=read('app.js'),media=read('chat-media.js');
 assert.doesNotThrow(()=>new vm.Script(media));
 for(const marker of ["entreChatMedia?.gallery","entreChatMedia?.controls","entreChatMedia?.afterRender"])assert.ok(app.includes(marker));
 for(const marker of ['entre_chat_media_add','entre_chat_media_list','entre_chat_media_delete','getUserMedia','MediaRecorder','prepare(file)'])assert.ok(media.includes(marker));
 const sql=readFileSync(new URL('../supabase/migrations/20261124002000_private_pair_media_images_video_audio.sql',import.meta.url),'utf8');
 for(const marker of ["public.entre_chat_pair_allowed","public.entre_pair_media enable row level security","bucket_id='entre-chat-media'","public.entre_chat_media_add"])
  assert.ok(sql.includes(marker),'Missing '+marker);
});
test('admin, shared profile and membership screens include final styles',()=>{
 const admin=read('admin/index.html'),share=read('perfil.html'),home=read('index.html');
 assert.ok(admin.includes('admin-refined.css'));
 assert.ok(share.includes('share-refined.css'));
 assert.ok(home.includes('design-refresh.css'));
 assert.ok(home.includes('chat-media.js'));
 assert.ok(read('entre-features.js').includes('premium-checkout'));
});
