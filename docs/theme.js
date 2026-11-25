/* CONNECT appearance: shared light/dark modes, fixed palette. */
(()=>{
'use strict';
const KEY='connect.appearance.v2',OLD='entre.appearance.v1';
const MODES=['light','dark'];
function load(){
 let result={mode:'light'};
 try{
  const now=JSON.parse(localStorage.getItem(KEY)||'null');
  const old=now?null:JSON.parse(localStorage.getItem(OLD)||'null');
  const source=now||old;
  result.mode=MODES.includes(source?.mode)?source.mode:'light';
  localStorage.setItem(KEY,JSON.stringify(result));
  localStorage.removeItem(OLD);
 }catch(_){}
 return result;
}
let state=load(),scope='external';
const rgb=h=>[1,3,5].map(n=>parseInt(h.slice(n,n+2),16));
function readable(h){const c=rgb(h).map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)});return c[0]*.2126+c[1]*.7152+c[2]*.0722>.179?'#111111':'#FFFFFF'}
const normal=()=>state.mode==='dark'?'#F5F5F5':'#000000';
const accent=()=>normal();
const sun='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>';
const moon='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.9 13.4A9 9 0 0 1 10.6 3.1 9 9 0 1 0 20.9 13.4Z"/></svg>';
function toggleMarkup(){return '<button type="button" class="connect-mode-toggle" data-theme-toggle aria-label="'+(state.mode==='dark'?'Ativar modo claro':'Ativar modo escuro')+'" title="'+(state.mode==='dark'?'Modo claro':'Modo escuro')+'">'+(state.mode==='dark'?sun:moon)+'</button>'}
function apply(){
 const root=document.documentElement,dark=state.mode==='dark',color=accent(),ink=readable(color);
 root.dataset.theme=state.mode;root.dataset.themeScope=scope;
 delete root.dataset.connectStyle;delete root.dataset.connectGradient;
 const tokens=dark?{'--ui-bg':'#101012','--ui-panel':'#1A1B1E','--ui-panel-alt':'#25262A','--ui-text':'#F5F5F5','--ui-muted':'#B5B6BD','--ui-line':'#37383E','--ui-danger':'#FF9BAA'}:{'--ui-bg':'#F7F7F7','--ui-panel':'#FFFFFF','--ui-panel-alt':'#EFEFF0','--ui-text':'#171717','--ui-muted':'#626269','--ui-line':'#DEDEE2','--ui-danger':'#BC3C4D'};
 const set=(k,v)=>root.style.setProperty(k,v,'important');
 for(const [k,v] of Object.entries(tokens))set(k,v);
 set('--ui-accent',color);set('--ui-accent-on',ink);set('--cn-ink',ink);
 set('--cn-grad',color);
 for(const [suffix,opacity] of [['soft',.13],['faint',.07],['shadow',.24]])set('--ui-accent-'+suffix,'rgb('+rgb(color).join(' ')+' / '+opacity+')');
 set('--ui-card-shadow',dark?'0 8px 26px #00000024':'0 5px 20px #00000008');set('--ui-theme-surface',tokens['--ui-panel']);set('--ui-theme-text',tokens['--ui-text']);
 root.style.colorScheme=state.mode;
 document.querySelectorAll('meta[name="theme-color"]').forEach(m=>m.setAttribute('content',tokens['--ui-bg']));
 if(document.body){document.body.style.removeProperty('background-color');document.body.style.removeProperty('color')}
 document.querySelectorAll('[data-theme-surface-applied]').forEach(el=>{el.style.removeProperty('background-color');el.style.removeProperty('background');el.style.removeProperty('color');delete el.dataset.themeSurfaceApplied});
 window.dispatchEvent(new CustomEvent('entre:themechange',{detail:{mode:state.mode,accent:color,scope}}));
}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(_){}}
function setScope(next){next=next==='app'?'app':'external';if(next!==scope){scope=next;apply();syncControls()}return scope}
function setMode(mode){if(!MODES.includes(mode))return false;state.mode=mode;persist();apply();syncControls();return true}

function renderControls(){
 return '<section class="appearance-panel" aria-labelledby="appearanceTitle"><div class="appearance-heading"><div><h3 id="appearanceTitle">Aparência</h3><p>Escolha entre claro e escuro.</p></div></div>'+
 '<div class="appearance-mode-grid" role="group" aria-label="Modo de aparência">'+
 MODES.map(mode=>'<button type="button" class="appearance-mode" data-theme-mode="'+mode+'" aria-pressed="'+(state.mode===mode)+'"><span class="appearance-mini '+mode+'"><i></i><b></b></span><strong>'+(mode==='light'?'Claro':'Escuro')+'</strong><small>'+(mode==='light'?'Limpo e suave':'Conforto à noite')+'</small></button>').join('')+'</div>'+
 '</section>';
}
function syncControls(){
 document.querySelectorAll('[data-theme-toggle]').forEach(b=>{b.innerHTML=state.mode==='dark'?sun:moon;b.setAttribute('aria-label',state.mode==='dark'?'Ativar modo claro':'Ativar modo escuro');b.title=state.mode==='dark'?'Modo claro':'Modo escuro'});
 document.querySelectorAll('[data-theme-mode]').forEach(b=>{const yes=b.dataset.themeMode===state.mode;b.setAttribute('aria-pressed',String(yes));b.classList.toggle('is-selected',yes)});
}
document.addEventListener('click',e=>{
 const b=e.target.closest?.('[data-theme-toggle],[data-theme-mode]');if(!b)return;
 if(b.hasAttribute('data-theme-toggle'))setMode(state.mode==='dark'?'light':'dark');
 else if(b.hasAttribute('data-theme-mode'))setMode(b.dataset.themeMode);
},true);
window.addEventListener('storage',e=>{if(e.key===KEY){state=load();apply();syncControls()}});
document.addEventListener('DOMContentLoaded',()=>{
 try{document.body.classList.toggle('motion-off',localStorage.getItem('entre.motionOff')==='1');document.body.classList.toggle('motion-force',localStorage.getItem('entre.motionOff')!=='1')}catch(_){}
 document.querySelectorAll('[data-theme-toggle-slot]').forEach(el=>{el.innerHTML=toggleMarkup()});apply();syncControls();
},{once:true});
window.entreTheme={read:()=>({...state}),setScope,setMode,renderControls,syncControls,toggleMarkup};apply();
})();
