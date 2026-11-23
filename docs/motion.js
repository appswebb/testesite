/* entre. · Motion System / progressive enhancement; no auth, database or private chat access. */
(()=>{'use strict';
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const shouldReduce=()=>document.body.classList.contains('motion-off')||(reduce.matches&&!document.body.classList.contains('motion-force'));
let observer=null, scheduled=false, seenMatch=false, votedRecently=0;
const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>[...root.querySelectorAll(s)];
function reveal(){
 if(shouldReduce()){document.querySelectorAll('[data-motion-reveal]').forEach(el=>el.classList.add('is-revealed'));return;}
 if(!observer){
  observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){entry.target.classList.add('is-revealed');observer.unobserve(entry.target)}}},{rootMargin:'0px 0px -28px 0px',threshold:.07});
 }
 $$('.step-card,.section-intro,.manifesto-inner,.insight-card,.sub-section,.empty-list').forEach(el=>{
  if(el.hasAttribute('data-motion-reveal'))return;
  el.setAttribute('data-motion-reveal','');
  observer.observe(el);
 });
}
function enhance(){
 reveal();
 const chat=$('.pair-card');
 if(chat){const banner=$('.pair-banner',chat);
  const connected=!!banner && banner.textContent.includes('Só vocês podem acessar esta conversa');
  chat.classList.toggle('is-continued',connected);
  if(connected&&!seenMatch&&Date.now()-votedRecently<120000){seenMatch=true;celebrate()}
 } else seenMatch=false;
}
function celebrate(){
 if(shouldReduce())return;
 const container=document.createElement('div');container.className='entre-celebration';container.setAttribute('aria-hidden','true');
 const accent=getComputedStyle(document.documentElement).getPropertyValue('--ui-accent').trim()||'#111111';
 const colors=[accent,'#FFFFFF','#D9DDE5','#FBC5D2',accent];
 for(let i=0;i<34;i++){
  const piece=document.createElement('i');piece.className='entre-confetti';
  const a=i*2.3999632297,dist=80+(i*41%260);
  piece.style.setProperty('--dx',Math.cos(a)*dist+'px');piece.style.setProperty('--dy',Math.sin(a)*dist+'px');
  piece.style.setProperty('--rot',(i*93%650-325)+'deg');
  piece.style.setProperty('--sz',(5+i%5*2)+'px');
  piece.style.setProperty('--r',i%4===0?'50%':'2px');
  piece.style.setProperty('--c',colors[i%colors.length]);
  container.appendChild(piece);
 }
 document.body.appendChild(container);
 setTimeout(()=>container.remove(),1100);
}
/* The original ripple lived INSIDE buttons. Re-rendered views removed it
 * before an animation frame — especially on Android. Render outside the app. */
const INTERACTIVE='button,.ui-btn,.nav-item,.mobile-nav button,.rail-item,.toolbar-btn,[role="button"]';
function wave(target,clientX,clientY){
 if(shouldReduce()||!target||target.disabled)return;
 const box=target.getBoundingClientRect();
 if(!box.width||!box.height)return;
 const el=document.createElement('span');
 el.className='entre-touch-wave';el.setAttribute('aria-hidden','true');
 el.style.setProperty('--x',clientX+'px');el.style.setProperty('--y',clientY+'px');
 el.style.setProperty('--wave-scale',String(Math.max(6,Math.min(14,Math.max(box.width,box.height)/12))));
 // Clip the oversized ripple to the viewport without adding horizontal
 // scroll; fixed transformed children previously made 320px pages 366px wide.
 let layer=document.getElementById('entreTouchLayer');
 if(!layer){
  layer=document.createElement('div');layer.id='entreTouchLayer';
  layer.className='entre-touch-layer';layer.setAttribute('aria-hidden','true');
  document.body.appendChild(layer);
 }
 layer.appendChild(el);
 const cleanup=()=>{el.remove();if(layer.isConnected&&!layer.childElementCount)layer.remove();};
 el.addEventListener('animationend',cleanup,{once:true});
 setTimeout(cleanup,650);
}
document.addEventListener('pointerdown',event=>{
 if(!event.isPrimary||event.button!==0)return;
 const btn=event.target.closest(INTERACTIVE);
 if(!btn||!btn.isConnected)return;
 const rect=btn.getBoundingClientRect();
 wave(btn,event.clientX||rect.left+rect.width/2,event.clientY||rect.top+rect.height/2);
},true);
document.addEventListener('click',event=>{
 const btn=event.target.closest('button');
 if(!btn)return;
 if(btn.dataset.action==='vote'&&btn.dataset.value==='yes')votedRecently=Date.now();
 if(event.detail!==0)return; // keyboard activation: the pointer already handled touch
 const box=btn.getBoundingClientRect();
 wave(btn,box.left+box.width/2,box.top+box.height/2);
},true);
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;enhance()})}
const root=document.getElementById('app');
if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true});
window.addEventListener('entre:themechange',schedule);
reduce.addEventListener?.('change',schedule);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true});else enhance();
})();