(()=>{'use strict';
const root=document.documentElement,KEY='connect.menu.appearance',styles=['none','aura','fire','water'],colors={none:'#8d8dff',aura:'#a991ff',fire:'#ff7437',water:'#38bdf8'};
let pref={effect:'none',colors:{...colors},intensity:75,speed:60};
try{const old=JSON.parse(localStorage.getItem(KEY)||'null');if(old){const effect=old.effect==='glow'?'aura':old.effect;if(styles.includes(effect))pref.effect=effect;if(/^#[0-9a-f]{6}$/i.test(old.color||''))pref.colors[effect]=old.color;for(const key of styles)if(/^#[0-9a-f]{6}$/i.test(old.colors?.[key]||''))pref.colors[key]=old.colors[key];for(const key of ['intensity','speed'])if(Number.isFinite(old[key]))pref[key]=Math.max(20,Math.min(100,old[key]));}}catch{}
const targets='.cn-account-dialog,.cn-dock,.cn-menu-preview';
const ns='http://www.w3.org/2000/svg';
let queued=false;const observed=new WeakSet();
const svg=(name,attributes={})=>{const node=document.createElementNS(ns,name);for(const [k,v] of Object.entries(attributes))node.setAttribute(k,String(v));return node;};
function draw(target){
 const existing=target.querySelector(':scope > .cn-element-effect');
 if(pref.effect==='none'){existing?.remove();return;}
 const w=Math.round(target.clientWidth),h=Math.round(target.clientHeight);if(w<30||h<30)return;
 const key=pref.effect+':'+w+':'+h;if(existing?.dataset.signature===key)return;
 existing?.remove();const layer=svg('svg',{class:'cn-element-effect cn-element-'+pref.effect,viewBox:'0 0 '+w+' '+h,preserveAspectRatio:'none','aria-hidden':'true',focusable:'false'});layer.dataset.signature=key;
 const rad=Math.min(23,h/3,w/4),x=5,y=5,W=w-10,H=h-10;
 const outline=(inset=0)=>svg('rect',{x:x+inset,y:y+inset,width:Math.max(1,W-2*inset),height:Math.max(1,H-2*inset),rx:Math.max(3,rad-inset),fill:'none',class:'cn-element-rim'});
 if(pref.effect==='water'){
  layer.append(outline(),outline(3));
  for(let i=0;i<Math.min(24,Math.ceil((w+h)/33));i++){
   const t=i/(Math.min(24,Math.ceil((w+h)/33))),p=point(t,w,h,rad);
   const group=svg('g',{transform:'translate('+p.x+' '+p.y+') rotate('+p.a+')',class:'cn-water-segment'});
   const wave=svg('path',{d:'M-16 0 Q-10 -7 -4 0 T8 0 T20 0 M-15 4 Q-8 -1 -2 4 T11 4',fill:'none',class:'cn-water-wave'});wave.style.setProperty('--phase',(-i*.13)+'s');group.append(wave);
   const bubble=svg('circle',{cx:(i%3)*5-5,cy:-4,r:1.5+(i%3)*.8,class:'cn-water-bubble'});bubble.style.setProperty('--phase',(-i*.21)+'s');group.append(bubble);layer.append(group);
  }
 }else if(pref.effect==='fire'){
  layer.append(outline());
  const count=Math.min(38,Math.ceil((w+h)/20));
  for(let i=0;i<count;i++){const p=point(i/count,w,h,rad);const group=svg('g',{transform:'translate('+p.x+' '+p.y+') rotate('+p.a+')'});const flame=svg('path',{d:'M-8 4 C-12 -2 -8 -6 -3 -9 C-4 -4 0 -5 1 -14 C8 -9 10 -3 6 4 Z',class:'cn-flame'});flame.style.setProperty('--phase',(-i*.17)+'s');flame.style.setProperty('--flame-size',.55+(i%5)*.16);group.append(flame);const core=svg('path',{d:'M-3 3 Q-4 -1 1 -6 Q5 -1 3 3 Z',class:'cn-flame-core'});core.style.setProperty('--phase',(-i*.11)+'s');group.append(core);layer.append(group);}
 }else{
  for(let i=0;i<3;i++){const r=outline(i*3);r.classList.add('cn-aura-ribbon');r.style.setProperty('--phase',(-i*.7)+'s');layer.append(r);}
  const count=Math.min(22,Math.ceil((w+h)/40));for(let i=0;i<count;i++){const p=point(i/count,w,h,rad),g=svg('g',{transform:'translate('+p.x+' '+p.y+') rotate('+p.a+')'});const ribbon=svg('path',{d:'M-12 3 Q-6 -10 0 -5 T12 3 Q5 -1 0 1 T-12 3Z',class:'cn-aura-wisp'});ribbon.style.setProperty('--phase',(-i*.26)+'s');g.append(ribbon);layer.append(g);}
 }
 target.prepend(layer);
}
function point(t,w,h,r){const x=r+5,y=5,X=w-r-5,Y=h-5,a=Math.max(1,X-x),b=Math.max(1,h-2*r-10),p=t*2*(a+b);if(p<a)return{x:x+p,y,a:0};if(p<a+b)return{x:w-5,y:r+5+p-a,a:90};if(p<2*a+b)return{x:X-(p-a-b),y:Y,a:180};return{x:5,y:h-r-5-(p-2*a-b),a:270};}
const observer=typeof ResizeObserver==='function'?new ResizeObserver(()=>schedule()):null;
function sync(){queued=false;document.querySelectorAll(targets).forEach(t=>{if(observer&&!observed.has(t)){observed.add(t);observer.observe(t);}draw(t);});}
function schedule(){if(!queued){queued=true;requestAnimationFrame(sync);}}
function apply(){root.dataset.cnMenuEffect=pref.effect;root.style.setProperty('--cn-menu-effect-color',pref.colors[pref.effect]||colors[pref.effect]);root.style.setProperty('--cn-effect-opacity',pref.intensity/100);root.style.setProperty('--cn-effect-duration',(4.2-pref.speed*.032)+'s');try{localStorage.setItem(KEY,JSON.stringify(pref));}catch{}schedule();}
function controls(){return '<section class="settings-card cn-menu-style"><h3>Elementos do menu</h3><p>Escolha um efeito que acompanha o contorno da navegação e do menu da conta.</p><div class="cn-menu-preview"><span>PRÉVIA DO MENU</span><strong>Seu estilo, em movimento.</strong><div class="cn-preview-dock"><i></i><i></i><i></i><i></i><i></i></div></div><div class="cn-effect-options" role="group" aria-label="Efeito do menu">'+styles.map((v,i)=>'<button type="button" data-menu-effect="'+v+'" aria-pressed="'+(pref.effect===v)+'"><span class="cn-effect-sample sample-'+v+'"></span>'+['Sem efeito','Aura','Fogo','Água'][i]+'</button>').join('')+'</div><label class="cn-menu-color">Cor do efeito <input type="color" data-menu-effect-color value="'+pref.colors[pref.effect]+'" aria-label="Cor do menu"></label><label class="cn-effect-range">Intensidade <input type="range" min="20" max="100" value="'+pref.intensity+'" data-menu-effect-range="intensity"></label><label class="cn-effect-range">Velocidade <input type="range" min="20" max="100" value="'+pref.speed+'" data-menu-effect-range="speed"></label><small>Preferências locais. A opção de movimento reduzido mantém os elementos estáticos.</small></section>';}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-menu-effect]');if(!b||!styles.includes(b.dataset.menuEffect))return;pref.effect=b.dataset.menuEffect;apply();document.querySelectorAll('[data-menu-effect]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.menuEffect===pref.effect)));document.querySelectorAll('[data-menu-effect-color]').forEach(x=>x.value=pref.colors[pref.effect]);});
document.addEventListener('input',e=>{if(e.target.matches?.('[data-menu-effect-color]')&&/^#[0-9a-f]{6}$/i.test(e.target.value)){pref.colors[pref.effect]=e.target.value;apply();}const k=e.target.dataset?.menuEffectRange;if(['intensity','speed'].includes(k)){pref[k]=Math.max(20,Math.min(100,Number(e.target.value)||60));apply();}});
new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&!n.closest?.('.cn-element-effect')&&(n.matches?.(targets)||n.querySelector?.(targets)))))schedule();}).observe(document.body,{childList:true,subtree:true});
document.addEventListener('toggle',e=>{if(e.target.matches?.(targets))schedule();},true);
window.connectMenuStyle={controls};apply();
})();