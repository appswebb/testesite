/* entre. · Motion System / progressive enhancement; no auth, database or private chat access. */
(()=>{'use strict';
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
let observer=null, scheduled=false, seenMatch=false, votedRecently=0;
const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>[...root.querySelectorAll(s)];
function reveal(){
 if(reduce.matches)return;
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
 if(reduce.matches)return;
 const container=document.createElement('div');container.className='entre-celebration';container.setAttribute('aria-hidden','true');
 const colors=['#F17E60','#D6E9AE','#CABCF3','#F6E5CF','#FFA985'];
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
document.addEventListener('click',event=>{
 const btn=event.target.closest('button');
 if(!btn)return;
 if(btn.dataset.action==='vote'&&btn.dataset.value==='yes')votedRecently=Date.now();
 if(reduce.matches||!btn.matches('.ui-btn,.google-login,.chip,.nav-item,.mobile-nav button'))return;
 const b=btn.getBoundingClientRect();
 if(!b.width||!b.height)return;
 const p=document.createElement('span');p.className='press-ripple';p.setAttribute('aria-hidden','true');
 const x=(event.clientX||b.left+b.width/2)-b.left,y=(event.clientY||b.top+b.height/2)-b.top;
 p.style.left=x+'px';p.style.top=y+'px';p.style.setProperty('--press-scale',Math.max(10,Math.ceil(Math.max(b.width,b.height)/15)));
 btn.appendChild(p);setTimeout(()=>p.remove(),700);
},true);
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;enhance()})}
const root=document.getElementById('app');
if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true});else enhance();
})();