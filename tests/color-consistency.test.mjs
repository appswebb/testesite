import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path, import.meta.url),'utf8');
const pages=['index.html','perfil.html','dados.html','privacidade.html','termos.html','instalar.html','admin/index.html'];

test('shared palette is the final authored stylesheet on every themed page',()=>{
 for(const page of pages){
  const html=read('docs/'+page);
  const tokens=[...html.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"/g)].map(m=>m[1]);
  const palette=tokens.findIndex(url=>url.includes('color-consistency.css'));
  assert(palette>=0,'Missing palette on '+page);
  const legacy=tokens.findIndex(url=>url.includes('once-source-components.css'));
  assert(legacy>=0&&palette>legacy,'Palette must load after legacy styles: '+page);
  assert(!/<meta name="theme-color" content="#ffd633"/i.test(html),'Legacy yellow Android theme on '+page);
 }
});

test('comments, discovery and social components use shared tokens rather than fixed green',()=>{
 const css=read('docs/color-consistency.css');
 for(const key of ['.comments-dialog-empty strong','.comments-dialog-header>div>span',
 '.comments-dialog-footer>small','.comments-dialog-footer .post-comment-form button',
 '.global-search-section h3','.rooms-head h3','.camera-live-list-head h3',
 '.geo-discovery h3','.online-controls strong','.notifications-official .bulletin-card h3',
 '.conversation-menu-panel','.live-app-card h2']){
  assert(css.includes(key),'Missing modern palette coverage for '+key);
 }
 assert(css.includes('var(--ui-accent-on)'));
 assert(css.includes('var(--ui-panel-alt)'));
 assert(css.includes('var(--ui-muted)'));
});

test('light/dark styles are neutral; custom selection remains user-controlled',()=>{
 const js=read('docs/theme.js');
 const css=read('docs/theme.css');
 assert(js.includes("state.mode==='dark'?'#F5F6F8':'#111111'"));
 assert(js.includes("state.mode==='custom'?state.color"));
 assert(css.includes('--ui-accent:#111111'));
 assert(css.includes('--ui-accent:#f5f6f8'));
 assert(!read('docs/offline.html').includes('#ffd633'));
});

test('logo and offline screen do not ship stale aqua/yellow',()=>{
 for(const icon of ['brand-mark.svg','favicon.svg']){
  const svg=read('docs/'+icon);
  assert(!svg.includes('#53D7C9'),'Old teal logo accent: '+icon);
 }
 const html=read('docs/offline.html');
 assert(!html.includes('#ffda39'));
 assert(!html.includes('#1a9d91'));
});
