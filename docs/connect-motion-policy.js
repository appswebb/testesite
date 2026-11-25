/* CONNECT owns motion preferences; do not change native OS/browser settings. */
(()=>{
'use strict';
const root=document.documentElement,levels=['light','medium','high'];
const read=key=>{try{return localStorage.getItem(key)}catch(_){return null}};
const saved=read('entre.motionLevel');
root.dataset.motionLevel=levels.includes(saved)?saved:'medium';
root.dataset.connectMotion=read('entre.motionOff')==='1'?'off':'on';
/* Existing local stylesheets have legacy OS media queries. Neutralize only
   that feature on this app document, preserving device width/hover conditions.
   Native settings and all other sites remain untouched. */
const patched=new WeakSet();
function normalize(query){
 return query.split(',').map(part=>{
  if(/\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/i.test(part))return 'not all';
  if(!/\(\s*prefers-reduced-motion\s*(?::\s*no-preference\s*)?\)/i.test(part))return part.trim();
  return part.replace(/\(\s*prefers-reduced-motion\s*:\s*no-preference\s*\)/gi,'all').replace(/\s+and\s+all\b/gi,'').replace(/^\s*all\s+and\s+/i,'').trim()||'all';
 }).join(', ');
}
function walk(rules){for(const rule of rules||[]){
 if(rule.media&&/prefers-reduced-motion/i.test(rule.media.mediaText)){try{rule.media.mediaText=normalize(rule.media.mediaText)}catch(_){}}
 try{if(rule.cssRules)walk(rule.cssRules);else if(rule.styleSheet)patch(rule.styleSheet)}catch(_){}
}}
function patch(sheet){if(!sheet||patched.has(sheet))return;try{if(sheet.href&&new URL(sheet.href,location.href).origin!==location.origin)return;walk(sheet.cssRules);patched.add(sheet)}catch(_){}}
function scan(){for(const sheet of document.styleSheets)patch(sheet);}
function bodySync(){if(!document.body)return;const off=root.dataset.connectMotion==='off';document.body.classList.toggle('motion-off',off);document.body.classList.toggle('motion-force',!off);}
function apply(level,off){root.dataset.motionLevel=levels.includes(level)?level:'medium';root.dataset.connectMotion=off?'off':'on';bodySync();scan();window.dispatchEvent(new Event('connect:motionchange'));}
document.addEventListener('load',event=>{if(event.target?.tagName==='LINK'&&event.target.rel==='stylesheet')patch(event.target.sheet)},true);
document.addEventListener('DOMContentLoaded',()=>{scan();bodySync()},{once:true});
window.addEventListener('pageshow',()=>{scan();bodySync()});
window.connectMotionPolicy={apply};
})();
