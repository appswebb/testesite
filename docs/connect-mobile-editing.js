/* Keep native input focus and mobile navigation stable while editing. */
(()=>{
'use strict';
const root=document.documentElement, vv=window.visualViewport;
const textSelector='textarea,input:not([type]),input:is([type=text],[type=search],[type=email],[type=password],[type=tel],[type=url],[type=number]),[contenteditable]:not([contenteditable=false])';
const editable=el=>!!el?.matches?.(textSelector)&&!el.disabled&&!el.readOnly;
const mobile=()=>matchMedia('(max-width:900px) and (pointer:coarse)').matches;
let baseline=0,lastWidth=0,frame=0,pending=null,timer=0;
const dirty=new Set();
const height=()=>Math.round(vv?.height||window.innerHeight);
function viewport(){
 frame=0;
 const h=height(),w=window.innerWidth,active=editable(document.activeElement);
 if(!baseline||Math.abs(w-lastWidth)>50){baseline=h;lastWidth=w;}
 const unzoomed=!vv||Math.abs(vv.scale-1)<0.05;
 if(unzoomed&&!active&&!root.classList.contains('connect-keyboard-open'))baseline=Math.max(baseline,h);
 if(unzoomed&&h>baseline)baseline=h;
 const shrink=Math.max(baseline-h,window.innerHeight-h);
 const open=mobile()&&unzoomed&&(active||root.classList.contains('connect-keyboard-open'))&&shrink>100;
 root.classList.toggle('connect-keyboard-open',open);
 root.style.setProperty('--connect-visible-height',h+'px');
 if(!open&&!active&&unzoomed)baseline=h;
}
function schedule(){if(!frame)frame=requestAnimationFrame(viewport)}
function interacting(){
 const app=document.getElementById('app');
 const active=document.activeElement;
 if(editable(active)&&(app?.contains(active)||active.closest('.live-app-filters')))return true;
 if(app?.querySelector('.pi-field-form:not([hidden]),dialog[open]')||document.querySelector('body > .live-app-filters,body > .cx-discover-filter-dialog[open]'))return true;
 for(const el of dirty){
  if(!el.isConnected||el.value===el.defaultValue){dirty.delete(el);continue;}
  if(app?.contains(el))return true;
 }
 return false;
}
function cancelRefresh(){clearTimeout(timer);timer=0;pending=null;}
function wake(){if(!pending||timer)return;timer=setTimeout(()=>{
 timer=0;if(!pending)return;
 if(interacting())return;
 const fn=pending;pending=null;fn();
},350);}
function deferRefresh(fn){if(!interacting())return false;pending=fn;return true;}
document.addEventListener('input',e=>{if(editable(e.target)&&e.target.closest('form')&&'defaultValue' in e.target){if(e.target.value!==e.target.defaultValue)dirty.add(e.target);else dirty.delete(e.target);}wake();});
document.addEventListener('focusin',schedule);
document.addEventListener('focusout',()=>{schedule();wake();});
document.addEventListener('click',wake);
document.addEventListener('change',wake);
document.addEventListener('close',wake,true);
document.addEventListener('reset',()=>{setTimeout(wake,0);},true);
window.addEventListener('resize',schedule,{passive:true});
vv?.addEventListener('resize',schedule,{passive:true});
vv?.addEventListener('scroll',schedule,{passive:true});
window.addEventListener('pageshow',schedule);
window.connectEditing={deferRefresh,cancelRefresh,wake};
schedule();
})();
