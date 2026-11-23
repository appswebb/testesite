import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const read=path=>readFileSync(resolve(process.cwd(),path),'utf8');
test('uploaded source audit distinguishes captured landing from unseen product pages',()=>{
 const audit=read('docs/DESIGN_REFERENCE_AUDIT.md');
 assert.match(audit,/68 entradas/);
 assert.match(audit,/1 página HTML capturada/);
 assert.match(audit,/Paytone One/);
 assert.match(audit,/Yellowtail/);
 assert.match(audit,/sem copiar/i);
});
test('source-native typography and theme customizations are wired to every public and internal page',()=>{
 const htmls=['docs/index.html','docs/admin/index.html','docs/perfil.html','docs/privacidade.html','docs/termos.html','docs/dados.html','docs/instalar.html'];
 for(const file of htmls){
  const html=read(file);
  assert.match(html,/once-source-fidelity\.css/,file+' lacks fidelity CSS');
  assert.match(html,/once-source-components\.css/,file+' lacks component CSS');
  assert.match(html,/theme\.css/,file+' lost user-controlled themes');
 }
 const head=read('docs/index.html');
 for(const font of ['Open+Sans','Paytone+One','Yellowtail'])assert(head.includes(font),'Missing captured source family '+font);
 assert.match(read('docs/theme.js'),/entre\.appearance\.v1/);
 assert.match(read('docs/theme.js'),/setMode/);
 assert.match(read('docs/theme.js'),/setColor/);
});
test('landing includes original editorial feature structures reauthored for entre, without copying Once brand assets',()=>{
 const app=read('docs/app.js');
 for(const area of ['conexoes','salas-publicas','transmissoes','comunidade']){
  assert.match(app,new RegExp('id="'+area+'"'));
 }
 for(const x of ['once-extra-card','once-sticker','once-feature-art','auth-step-indicator'])assert(app.includes(x),x);
 const fidelity=read('docs/once-source-fidelity.css');
 for(const x of ['--ef-display','--ef-script','--ef-regular','@media(max-width:375px)','once-feature-art','once-sticker'])assert(fidelity.includes(x),x);
 assert.doesNotMatch(app,/getonce\.com/i);
 assert.doesNotMatch(app,/assets\/img\/1-c6e8/i);
});
test('all secondary features have responsive theme-aware overlays and action controls',()=>{
 const css=read('docs/once-source-components.css');
 for(const selector of ['.comments-dialog','.comments-dialog-footer','.feed-crop-dialog','.feed-crop-dialog footer','.live-app-filters','.encounter-workspace','.encounter-floating','.admin-delete-confirm','.notification-entry','.room-message','.premium-checkout','.recurring-premium-box']){
  assert(css.includes(selector),'Missing coverage of '+selector);
 }
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(css,/env\(safe-area-inset-bottom\)/);
 assert.match(css,/overflow:auto/);
});
test('source-guided theme hardens dark background but keeps light and custom personalization',()=>{
 const css=read('docs/once-source-fidelity.css'),js=read('docs/theme.js');
 assert.match(css,/html\[data-theme="dark"\] body/);
 assert.match(css,/background-color:#101114!important/);
 assert.match(js,/document\.body\.style\.setProperty\('background-color'/);
 assert.match(css,/var\(--ui-accent\)/);
 assert.match(css,/prefers-reduced-motion/);
});
