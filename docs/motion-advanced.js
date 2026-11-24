/* CONNECT — touch and pointer depth. Visual response never dispatches an action. */
(()=>{
'use strict';
const root=document.documentElement;
const controls='button,a[href],summary,[role="button"],[role="tab"],[role="switch"],[data-action],[data-room-action],[data-live-action],[data-story-action],.story-tile';
const cards='.live-mode,.cn-feed-composer,.post-card,.online-person,.online-profile-card,.convo-card,.settings-card,.cp-plan,.csup-channel,.profile-view-card';
const excluded='input,textarea,select,option,label,[contenteditable]:not([contenteditable="false"]),video,audio,[data-ce-drag],.ce-floating,.encounter-floating-video,[draggable="true"],[data-feed-crop],[data-cp-range]';
const inApp=()=>root.dataset.themeScope==='app';
const level=()=>root.dataset.motionLevel||'medium';
const enabled=()=>inApp()&&!document.body?.classList.contains('motion-off');
const slop=10;
let gesture=null,blockedUntil=0,current=null,raf=0,point=null;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
function tilt(x,y,rect,intensity){
 const dx=clamp((x-rect.left)/rect.width*2-1,-1,1),dy=clamp((y-rect.top)/rect.height*2-1,-1,1);
 return {rx:-dy,ry:dx,angle:Math.min(1,Math.hypot(dx,dy))*intensity};
}
function targetAt(x,y){
 const hit=document.elementFromPoint(x,y);
 if(!hit?.closest||!hit.closest('#app')||hit.closest(excluded))return null;
 const el=hit.closest(controls)||hit.closest(cards);
 if(!el||el.matches(':disabled')||el.closest('[aria-disabled="true"],[inert]'))return null;
 // Don't move entire dialogs, video panels, or layout containers.
 if(el.matches('.cn-shell,.cn-main,.cn-view,.ce-session,.cn-dock'))return null;
 return el;
}
function reset(){
 if(current){current.classList.remove('ct-react');for(const p of ['--ct-rx','--ct-ry','--ct-angle','--ct-shine'])current.style.removeProperty(p);current=null}
}
function clear(){point=null;if(raf){cancelAnimationFrame(raf);raf=0}reset()}
function draw(){
 raf=0;
 if(!point||!enabled()){reset();return}
 const {x,y}=point,el=targetAt(x,y);
 if(el!==current){reset();current=el}
 if(!el)return;
 const r=el.getBoundingClientRect();if(r.width<1||r.height<1){reset();return}
 const strength=level()==='high'?7:level()==='medium'?3.5:0;
 const t=tilt(x,y,r,strength);
 el.style.setProperty('--ct-rx',String(t.rx.toFixed(3)));
 el.style.setProperty('--ct-ry',String(t.ry.toFixed(3)));
 el.style.setProperty('--ct-angle',t.angle.toFixed(2)+'deg');
 el.style.setProperty('--ct-shine',level()==='high'?'1.06':'1.025');
 el.classList.add('ct-react');
}
function queue(x,y){point={x,y};if(!raf)raf=requestAnimationFrame(draw)}
function down(e){
 if(e.isPrimary===false||e.button!==0||!inApp())return;
 blockedUntil=0;
 if(e.target?.closest?.(excluded)){gesture=null;clear();return}
 gesture={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};
 if(enabled())queue(e.clientX,e.clientY);
}
function move(e){
 if(!inApp()){clear();return}
 if(gesture&&gesture.id===e.pointerId){
  if(Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>slop)gesture.moved=true;
  if(enabled())queue(e.clientX,e.clientY);
 }else if(e.pointerType==='mouse'||(e.pointerType==='pen'&&e.buttons===0)){
  if(enabled())queue(e.clientX,e.clientY);else clear();
 }
}
function end(e){
 if(!gesture||gesture.id!==e.pointerId)return;
 if(e.type==='pointercancel'||gesture.moved||Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>slop)blockedUntil=Date.now()+700;
 gesture=null;clear();
}
function guard(e){
 // Window capture runs before document click handlers (including sound).
 // Keyboard/accessibility clicks and intentional subsequent taps remain available.
 if(!inApp()||!e.isTrusted||e.detail===0||Date.now()>=blockedUntil)return;
 if(e.target?.closest?.(controls+',label,input,select,textarea')){
  e.preventDefault();e.stopImmediatePropagation();blockedUntil=0;
 }
}
window.addEventListener('pointerdown',down,{capture:true,passive:true});
window.addEventListener('pointermove',move,{capture:true,passive:true});
window.addEventListener('pointerup',end,{capture:true,passive:true});
window.addEventListener('pointercancel',end,{capture:true,passive:true});
window.addEventListener('click',guard,true);
window.addEventListener('pointerout',e=>{if(!gesture&&!e.relatedTarget)clear()},{passive:true});
window.addEventListener('blur',()=>{gesture=null;clear()});
window.addEventListener('scroll',()=>{if(gesture)gesture.moved=true;clear()},{capture:true,passive:true});
window.addEventListener('entre:themechange',clear);
document.addEventListener('visibilitychange',()=>{if(document.hidden){gesture=null;clear()}});
})();
