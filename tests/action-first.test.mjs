import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p)=>readFileSync(new URL('../docs/'+p,import.meta.url),'utf8');

test('Lives begins with real controls instead of editorial hero copy',()=>{
 const js=read('camera-lives.js');
 const section=js.slice(js.indexOf('function view(){'),js.indexOf('async function refresh(',js.indexOf('function view(){')));
 assert.match(section,/live-compact-header/);
 assert.match(section,/data-live-action="create"/);
 assert.match(section,/data-live-action="refresh"/);
 assert.match(section,/filterMarkup\(\)/);
 assert.match(section,/liveDiscoverResults/);
 assert.match(section,/liveTotalCount/);
 assert.doesNotMatch(section,/Todo mundo tem uma história/);
 assert.doesNotMatch(section,/Assista a transmissões reais/);
 assert.match(js,/document\.activeElement\?\.closest\?\.\('\.live-create-composer'\)/);
});

test('Ao vivo puts mode choice, filters and search action immediately upfront',()=>{
 const js=read('app.js');
 const section=js.slice(js.indexOf('function connectView(){'),js.indexOf('function pairView()',js.indexOf('function connectView(){')));
 assert.match(section,/connect-action-first/);
 assert.match(section,/data-action="liveMode"/);
 assert.match(section,/data-value="video"/);
 assert.match(section,/data-value="chat"/);
 assert.match(section,/data-action="startsearch"/);
 assert.match(section,/compactPanel/);
 assert.match(section,/targetMode/);
 assert.doesNotMatch(section,/Uma conversa pode mudar seu dia/);
 assert.doesNotMatch(section,/Você controla a experiência/);
 const css=read('connect-experience.css');
 assert.match(css,/\.live-action-first/);
 assert.match(css,/\.connect-action-first/);
 assert.match(css,/@media\(max-width:520px\)/);
});
