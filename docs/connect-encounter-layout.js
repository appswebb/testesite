/* Position the floating window within the actual visible viewport, including keyboard. */
(()=>{
'use strict';
const root=document.documentElement;
let pair=null,position=null,drag=null,frame=0;
const clamp=(v,a,b)=>Math.max(a,Math.min(Math.max(a,b),v));
function viewport(){const vv=window.visualViewport;return {x:vv?.offsetLeft||0,y:vv?.offsetTop||0,w:vv?.width||window.innerWidth,h:vv?.height||window.innerHeight}}
function limits(w,h,v,dockTop){return {left:v.x+6,top:v.y+6,right:Math.max(v.x+6,v.x+v.w-w-6),bottom:Math.max(v.y+6,Math.min(v.y+v.h,dockTop)-h-6)}}
function bounded(x,y,w,h,v,dockTop=Infinity){const a=limits(w,h,v,dockTop);return {x:clamp(x,a.left,a.right),y:clamp(y,a.top,a.bottom)}}
function floating(){return document.querySelector('#app .ce-floating')}
function place(el,x,y){
 const v=viewport(),dock=document.querySelector('#app .cn-dock');
 const dr=dock?.getBoundingClientRect(),dockTop=dr&&dr.height&&dr.top>v.y&&dr.top<v.y+v.h?dr.top:Infinity;
 const r=el.getBoundingClientRect(),p=bounded(x,y,r.width,r.height,v,dockTop);
 el.style.setProperty('--ce-float-x',p.x+'px');el.style.setProperty('--ce-float-y',p.y+'px');el.style.setProperty('--ce-float-right','auto');el.style.setProperty('--ce-float-bottom','auto');position=p;
}
function refresh(){
 frame=0;const v=viewport(),active=!!document.querySelector('#app .ce-session'),keyboard=active&&window.innerHeight-v.h>100;
 root.style.setProperty('--ce-vh',Math.floor(v.h)+'px');root.classList.toggle('ce-keyboard',keyboard);
 const el=floating();
 if(!el){drag=null;return}
 const id=el.dataset.cePair;if(id!==pair){pair=id;position=null;drag=null}
 const r=el.getBoundingClientRect();
 place(el,position?.x??r.left,position?.y??r.top);
}
function schedule(){if(!frame)frame=requestAnimationFrame(refresh)}
document.addEventListener('pointerdown',e=>{
 const handle=e.target.closest?.('[data-ce-drag]');if(!handle||e.button!==0)return;
 const el=handle.closest('.ce-floating');if(!el)return;
 const r=el.getBoundingClientRect();drag={id:e.pointerId,el,handle,dx:e.clientX-r.left,dy:e.clientY-r.top};
 handle.setPointerCapture?.(e.pointerId);e.preventDefault();
});
document.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId||!drag.el.isConnected)return;place(drag.el,e.clientX-drag.dx,e.clientY-drag.dy);e.preventDefault()},{passive:false});
function finish(e){if(drag?.id===e.pointerId)drag=null}
document.addEventListener('pointerup',finish);document.addEventListener('pointercancel',finish);document.addEventListener('lostpointercapture',finish);
document.addEventListener('keydown',e=>{const handle=e.target.closest?.('[data-ce-drag]');if(!handle||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;const el=handle.closest('.ce-floating'),r=el.getBoundingClientRect();e.preventDefault();place(el,r.left+(e.key==='ArrowRight'?16:e.key==='ArrowLeft'?-16:0),r.top+(e.key==='ArrowDown'?16:e.key==='ArrowUp'?-16:0))});
window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);
document.addEventListener('DOMContentLoaded',()=>{const app=document.getElementById('app');if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});schedule()},{once:true});
window.connectEncounterLayout={bounded};
})();
