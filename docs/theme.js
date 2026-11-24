/* CONNECT appearance: one shared light/dark mode, private app-only accent. */
(()=>{
'use strict';
const KEY='connect.appearance.v2',OLD='entre.appearance.v1';
const MODES=['light','dark'];
const PRESETS=[['#7757F4','Violeta'],['#2977D5','Azul'],['#F07C55','Coral'],['#AE63CF','Lavanda'],['#DAA520','Dourado'],['#EA5386','Rosa']];
const hex=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v.toUpperCase():null;
function load(){
 try{
  const now=JSON.parse(localStorage.getItem(KEY)||'null');
  if(now)return {mode:MODES.includes(now.mode)?now.mode:'light',color:hex(now.color)};
  const old=JSON.parse(localStorage.getItem(OLD)||'null');
  const factory=old&&((old.style==='neon'&&hex(old.color)==='#C33DF0')||(old.style==='romance'&&hex(old.color)==='#D16A8A'));
  const result={mode:!factory&&old?.mode==='dark'?'dark':'light',color:factory?null:hex(old?.color)};
  localStorage.setItem(KEY,JSON.stringify(result));return result;
 }catch{return {mode:'light',color:null};}
}
let state=load(),scope='external';
const rgb=h=>[1,3,5].map(n=>parseInt(h.slice(n,n+2),16));
function readable(h){const c=rgb(h).map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)});return c[0]*.2126+c[1]*.7152+c[2]*.0722>.179?'#111111':'#FFFFFF'}
const normal=()=>state.mode==='dark'?'#F5F6F8':'#20232A';
const accent=()=>scope==='app'&&state.color?state.color:normal();
const sun='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>';
const moon='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.9 13.4A9 9 0 0 1 10.6 3.1 9 9 0 1 0 20.9 13.4Z"/></svg>';
function toggleMarkup(){return '<button type="button" class="connect-mode-toggle" data-theme-toggle aria-label="'+(state.mode==='dark'?'Ativar modo claro':'Ativar modo escuro')+'" title="'+(state.mode==='dark'?'Modo claro':'Modo escuro')+'">'+(state.mode==='dark'?sun:moon)+'</button>'}
function apply(){
 const root=document.documentElement,dark=state.mode==='dark',color=accent(),ink=readable(color);
 root.dataset.theme=state.mode;root.dataset.themeScope=scope;
 delete root.dataset.connectStyle;delete root.dataset.connectGradient;
 const tokens=dark?{'--ui-bg':'#15171B','--ui-panel':'#20232A','--ui-panel-alt':'#2B2F37','--ui-text':'#F5F6F8','--ui-muted':'#B7BDC8','--ui-line':'#393E49'}:{'--ui-bg':'#F5F6F9','--ui-panel':'#FFFFFF','--ui-panel-alt':'#EEF0F4','--ui-text':'#20232A','--ui-muted':'#606978','--ui-line':'#DFE3EB'};
 const set=(k,v)=>root.style.setProperty(k,v,'important');
 for(const [k,v] of Object.entries(tokens))set(k,v);
 set('--ui-accent',color);set('--ui-accent-on',ink);set('--cn-ink',ink);
 set('--cn-grad',scope==='app'&&state.color?'linear-gradient(145deg,color-mix(in srgb,'+color+' 92%,white),'+color+')':color);
 for(const [suffix,opacity] of [['soft',.13],['faint',.07],['shadow',.24]])set('--ui-accent-'+suffix,'rgb('+rgb(color).join(' ')+' / '+opacity+')');
 set('--ui-theme-surface',tokens['--ui-panel']);set('--ui-theme-text',tokens['--ui-text']);
 root.style.colorScheme=state.mode;
 document.querySelectorAll('meta[name="theme-color"]').forEach(m=>m.setAttribute('content',tokens['--ui-bg']));
 if(document.body){document.body.style.removeProperty('background-color');document.body.style.removeProperty('color')}
 document.querySelectorAll('[data-theme-surface-applied]').forEach(el=>{el.style.removeProperty('background-color');el.style.removeProperty('background');el.style.removeProperty('color');delete el.dataset.themeSurfaceApplied});
 window.dispatchEvent(new CustomEvent('entre:themechange',{detail:{mode:state.mode,accent:color,scope}}));
}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(_){}}
function setScope(next){next=next==='app'?'app':'external';if(next!==scope){scope=next;apply();syncControls()}return scope}
function setMode(mode){if(!MODES.includes(mode))return false;state.mode=mode;persist();apply();syncControls();return true}
function setColor(value){if(scope!=='app')return false;const color=value===null?null:hex(value);if(value!==null&&!color)return false;state.color=color;persist();apply();syncControls();return true}
function renderControls(){
 const custom=scope==='app',value=state.color||normal();
 return '<section class="appearance-panel" aria-labelledby="appearanceTitle"><div class="appearance-heading"><div><h3 id="appearanceTitle">Aparência</h3><p>'+(custom?'Escolha o modo e, se quiser, uma cor de destaque.':'Escolha entre claro e escuro.')+'</p></div></div>'+
 '<div class="appearance-mode-grid" role="group" aria-label="Modo de aparência">'+
 MODES.map(mode=>'<button type="button" class="appearance-mode" data-theme-mode="'+mode+'" aria-pressed="'+(state.mode===mode)+'"><span class="appearance-mini '+mode+'"><i></i><b></b></span><strong>'+(mode==='light'?'Claro':'Escuro')+'</strong><small>'+(mode==='light'?'Limpo e suave':'Conforto à noite')+'</small></button>').join('')+'</div>'+
 (custom?'<div class="appearance-custom-settings"><label for="appearanceColor">Cor personalizada</label><div class="appearance-color-line"><input id="appearanceColor" data-theme-color type="color" value="'+value+'" aria-label="Escolher cor personalizada"><output id="appearanceHex">'+value+'</output><button type="button" class="connect-color-reset" data-theme-reset-color>Restaurar padrão</button></div><div class="appearance-swatches" role="group" aria-label="Cores sugeridas">'+PRESETS.map(([color,label])=>'<button type="button" class="appearance-swatch" data-theme-swatch="'+color+'" style="--swatch:'+color+'" aria-label="'+label+'" aria-pressed="'+(state.color===color)+'"><span></span></button>').join('')+'</div></div>':'')+'</section>';
}
function syncControls(){
 document.querySelectorAll('[data-theme-toggle]').forEach(b=>{b.innerHTML=state.mode==='dark'?sun:moon;b.setAttribute('aria-label',state.mode==='dark'?'Ativar modo claro':'Ativar modo escuro');b.title=state.mode==='dark'?'Modo claro':'Modo escuro'});
 document.querySelectorAll('[data-theme-mode]').forEach(b=>{const yes=b.dataset.themeMode===state.mode;b.setAttribute('aria-pressed',String(yes));b.classList.toggle('is-selected',yes)});
 document.querySelectorAll('[data-theme-color]').forEach(b=>b.value=state.color||normal());
 document.querySelectorAll('#appearanceHex').forEach(b=>b.textContent=state.color||normal());
 document.querySelectorAll('[data-theme-swatch]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.themeSwatch===state.color)));
}
document.addEventListener('click',e=>{
 const b=e.target.closest?.('[data-theme-toggle],[data-theme-mode],[data-theme-swatch],[data-theme-reset-color]');if(!b)return;
 if(b.hasAttribute('data-theme-toggle'))setMode(state.mode==='dark'?'light':'dark');
 else if(b.hasAttribute('data-theme-mode'))setMode(b.dataset.themeMode);
 else if(b.hasAttribute('data-theme-reset-color'))setColor(null);
 else if(b.hasAttribute('data-theme-swatch'))setColor(b.dataset.themeSwatch);
},true);
document.addEventListener('input',e=>{if(e.target.matches?.('[data-theme-color]'))setColor(e.target.value)},true);
window.addEventListener('storage',e=>{if(e.key===KEY){state=load();apply();syncControls()}});
document.addEventListener('DOMContentLoaded',()=>{
 try{document.body.classList.toggle('motion-off',localStorage.getItem('entre.motionOff')==='1');document.body.classList.toggle('motion-force',localStorage.getItem('entre.motionForce')==='1'&&localStorage.getItem('entre.motionOff')!=='1')}catch(_){}
 document.querySelectorAll('[data-theme-toggle-slot]').forEach(el=>{el.innerHTML=toggleMarkup()});apply();syncControls();
},{once:true});
window.entreTheme={read:()=>({...state}),setScope,setMode,setColor,renderControls,syncControls,toggleMarkup,PRESETS};apply();
})();
