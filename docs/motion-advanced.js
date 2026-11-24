/* Pointer-only 3D depth. Never reads personal data or requests device sensors. */
(()=>{'use strict';
const selector='.landing-demo-tile,.step-card,.live-visual-card,.premium-checkout-card';
const canTilt=()=>document.documentElement.dataset.motionLevel==='high'&&
 document.body?.classList.contains('motion-force')&&
 window.matchMedia?.('(pointer:fine)').matches===true;
let current=null,frame=null;
function reset(el){if(!el)return;el.style.removeProperty('--tilt-x');el.style.removeProperty('--tilt-y');el.style.removeProperty('--lift');}
document.addEventListener('pointermove',event=>{
 if(!canTilt()){reset(current);current=null;return}
 const el=event.target?.closest?.(selector);
 if(el!==current){reset(current);current=el}
 if(!el)return;
 const rect=el.getBoundingClientRect();if(!rect.width||!rect.height)return;
 const x=Math.max(-1,Math.min(1,(event.clientX-rect.left)/rect.width*2-1));
 const y=Math.max(-1,Math.min(1,(event.clientY-rect.top)/rect.height*2-1));
 if(frame)cancelAnimationFrame(frame);
 frame=requestAnimationFrame(()=>{
  if(current!==el)return;
  el.style.setProperty('--tilt-x',(-y*4.5).toFixed(2)+'deg');
  el.style.setProperty('--tilt-y',(x*5).toFixed(2)+'deg');
 });
},{passive:true});
document.addEventListener('pointerout',event=>{
 if(current&&!current.contains(event.relatedTarget)){reset(current);current=null}
},{passive:true});
window.addEventListener('blur',()=>{reset(current);current=null});
window.addEventListener('entre:themechange',()=>{reset(current);current=null});
})();