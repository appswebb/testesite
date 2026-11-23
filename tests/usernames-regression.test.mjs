import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('scripts de @username têm sintaxe JavaScript válida',()=>{
 for(const path of ['docs/app.js','docs/social-online.js','docs/connect-usernames.js','docs/social-actions.js','docs/social-conversations.js']){
  assert.doesNotThrow(()=>new vm.Script(read(path),{filename:path}),path);
 }
});
test('cadastro, perfil, busca e link usam o mesmo username',()=>{
 const app=read('docs/app.js'),search=read('docs/connect-usernames.js'),html=read('docs/index.html');
 assert.match(app,/id="newusername" name="username"/);
 assert.match(app,/id="myusername" name="username"/);
 assert.match(app,/const profileShareUrl=/);
 assert.match(app,/openUsernameProfile/);
 assert.match(search,/entre_user_search/);
 assert.match(html,/connect-usernames\.js/);
 assert.match(html,/site-search\.js/);
 assert.match(read('docs/social-conversations.js'),/conversationSearchMarkup/);
 assert.doesNotMatch(read('docs/social-online.js'),/peopleSearchInput/);
});
test('SQL reserva usernames e impede enumeração anônima',()=>{
 const sql=read('supabase/migrations/20261123163000_connect_usernames.sql');
 assert.match(sql,/create unique index.*entre_profiles_username_lower_uidx/s);
 assert.match(sql,/30 days/);
 assert.match(sql,/grant execute on function public\.entre_user_search\(text\) to authenticated/);
 assert.match(sql,/revoke all on function public\.entre_user_search\(text\) from public,anon/);
 assert.match(sql,/entre_blocks/);
});
