/* CONNECT profile covers. Photos are flattened to JPEG; GIFs retain animation and a viewport crop. */
(()=>{
'use strict';
if(window.connectBanners)return;
const HANDLE=/^[a-z][a-z0-9_]{2,19}$/,B64=/^[A-Za-z0-9+/]+={0,2}$/;
const MAX_GIF=2097152,MAX_PHOTO=358400,ratio=3;
const cache=new Map(),pending=new Map();
let editor=null,saving=false,registrationDraft=null;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const number=(v,def,min,max)=>Number.isFinite(Number(v))?clamp(Number(v),min,max):def;
function position(img,b){
 const x=number(b.pos_x,.5,0,1)*100,y=number(b.pos_y,.5,0,1)*100;
 img.style.objectPosition=x+'% '+y+'%';img.style.transformOrigin=x+'% '+y+'%';img.style.transform='scale('+number(b.zoom,1,1,3)+')';
}
function paint(el,b){
 if(!el)return;
 el.replaceChildren();el.classList.toggle('cp-has-banner',false);
 if(!b||!['image/jpeg','image/gif'].includes(b.mime)||typeof b.image_base64!=='string'||b.image_base64.length>2796204||!B64.test(b.image_base64))return;
 const img=new Image();img.alt='';img.decoding='async';img.src='data:'+b.mime+';base64,'+b.image_base64;
 position(img,b);img.onerror=()=>{if(img.parentNode===el){el.replaceChildren();el.classList.remove('cp-has-banner')}};
 el.append(img);el.classList.add('cp-has-banner');
}
const uid=()=>typeof state!=='undefined'?state.session?.user?.id:null;
const owner=()=>uid()?'owner:'+uid():null;
async function fetchOwner(){
 if(!uid())return null;
 if(registrationDraft?.user_id===uid()&&!state.profile)return registrationDraft;
 const {data,error}=await db.from('entre_profile_banners').select('mime,image_base64,zoom,pos_x,pos_y').eq('user_id',uid()).maybeSingle();
 if(error)throw error;
 if(data?.mime==='image/gif'){const {data:active,error:err}=await db.rpc('entre_premium_active',{_uid:uid()});if(err||active!==true)return null;}
 return data;
}
async function fetchShared(handle){
 if(!HANDLE.test(handle))return null;
 const res=await fetch('https://trrakyybnvxpdhxwgjrz.supabase.co/functions/v1/entre-shared-profile?u='+encodeURIComponent(handle),{headers:{apikey:'sb_publishable_OJ4wBPPNVBBcrcNl12yonw_hRSlMKsZ',Accept:'application/json'},cache:'no-store'});
 if(!res.ok)return null;
 const data=await res.json();return data?.profile?.username===handle?data.profile.banner:null;
}
function get(key,loader){
 const old=cache.get(key);if(old&&Date.now()-old.at<30000)return Promise.resolve(old.data);
 if(pending.has(key))return pending.get(key);
 const job=Promise.resolve().then(loader).then(data=>{if(cache.size>=16)cache.delete(cache.keys().next().value);cache.set(key,{data,at:Date.now()});return data}).finally(()=>pending.delete(key));
 pending.set(key,job);return job;
}
function scan(){
 document.querySelectorAll('.cp-banner[data-cp-owner],.cp-banner[data-cp-handle]').forEach(el=>{
  if(el.dataset.cpLoading)return;
  const own=el.hasAttribute('data-cp-owner'),handle=el.dataset.cpHandle||'',key=own?owner():'public:'+handle;
  if(!key||(!own&&!HANDLE.test(handle)))return;
  el.dataset.cpLoading='1';get(key,own?fetchOwner:()=>fetchShared(handle)).then(b=>{if(el.isConnected&&(!own||owner()===key))paint(el,own&&cache.get(key)?.data!==b?cache.get(key)?.data:b)}).catch(()=>{if(el.isConnected)delete el.dataset.cpLoading});
 });
}
function refresh(b){
 const key=owner();if(key){cache.set(key,{data:b,at:Date.now()});document.querySelectorAll('.cp-banner[data-cp-owner]').forEach(el=>{el.dataset.cpLoading='1';paint(el,b)})}
 if(typeof state!=='undefined'&&state.profile?.username)cache.delete('public:'+state.profile.username);
}
function data64(blob){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]);r.onerror=()=>rej(Error('Não foi possível ler a imagem.'));r.readAsDataURL(blob)})}
function loadImage(url){return new Promise((res,rej)=>{const img=new Image();img.onload=()=>res(img);img.onerror=()=>rej(Error('Imagem inválida ou não suportada.'));img.src=url})}
async function allowedGIF(){const id=uid();if(!id)return false;const {data,error}=await db.rpc('entre_premium_active',{_uid:id});return !error&&data===true}
function notify(msg,bad=false){if(typeof toast==='function')toast(msg,bad,bad?null:'success')}
function cropRect(w,h,z,x,y){const bw=Math.min(w,h*ratio),bh=bw/ratio,cw=bw/z,ch=bh/z;return {x:(w-cw)*x,y:(h-ch)*y,w:cw,h:ch}}
async function photoBlob(img,b){
 const c=document.createElement('canvas');c.width=900;c.height=300;
 const ctx=c.getContext('2d',{alpha:false});if(!ctx)throw Error('Não foi possível preparar a foto.');
 const r=cropRect(img.naturalWidth,img.naturalHeight,b.zoom,b.pos_x,b.pos_y);
 ctx.fillStyle='#ffffff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,r.x,r.y,r.w,r.h,0,0,c.width,c.height);
 for(const quality of [.86,.75,.6,.42]){const blob=await new Promise(resolve=>c.toBlob(resolve,'image/jpeg',quality));if(blob?.type==='image/jpeg'&&blob.size<=Math.min(MAX_PHOTO,180000))return blob}
 throw Error('Não foi possível reduzir a foto para 180 KB.');
}
function closeEditor(force=false){
 if(saving&&!force)return;
 const old=editor;editor=null;if(!old)return;
 if(old.dialog.open)old.dialog.close();old.dialog.remove();URL.revokeObjectURL(old.url);
}
async function open(file){
 if(!file||saving)return;
 if(!uid())throw Error('Entre na sua conta.');
 if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type))throw Error('Escolha JPG, PNG, WebP ou GIF.');
 const head=new Uint8Array(await file.slice(0,12).arrayBuffer()),gif=String.fromCharCode(...head.slice(0,6));
 const isGif=gif==='GIF87a'||gif==='GIF89a';
 if(isGif!== (file.type==='image/gif'))throw Error('O tipo do arquivo não corresponde ao conteúdo.');
 if(isGif){if(file.size>MAX_GIF)throw Error('GIF de até 2 MB.');if(!await allowedGIF()){window.connectPremiumNotice?.('O banner animado em GIF');return;}}
 else if(file.size>12*1024*1024)throw Error('Foto de até 12 MB.');
 closeEditor();const url=URL.createObjectURL(file);let img;
 try{img=await loadImage(url);const w=img.naturalWidth,h=img.naturalHeight;
 if(!w||!h||w*h>40000000||(isGif&&(w>2048||h>2048||w*h>2500000)))throw Error('As dimensões da imagem excedem o limite.');
 }catch(e){URL.revokeObjectURL(url);throw e}
 const dialog=document.createElement('dialog');dialog.className='cp-crop-dialog';dialog.setAttribute('aria-labelledby','cpCropTitle');
 dialog.innerHTML='<div class="cp-crop-head"><div><h2 id="cpCropTitle">Recortar banner</h2><p>O enquadramento abaixo é o mesmo do perfil (3:1).</p></div><button type="button" class="cp-icon-button" data-cp-close aria-label="Fechar">×</button></div><div class="cp-banner cp-crop-preview" aria-label="Prévia do banner"></div><div class="cp-crop-controls"><label>Zoom <input type="range" data-cp-range="zoom" min="1" max="3" step=".01" value="1"></label><label>Horizontal <input type="range" data-cp-range="pos_x" min="0" max="1" step=".005" value=".5"></label><label>Vertical <input type="range" data-cp-range="pos_y" min="0" max="1" step=".005" value=".5"></label></div><p class="cp-crop-note">'+(isGif?'GIF animado · o original é preservado com o recorte visual.':'Foto · salva em 900 × 300 pixels.')+'</p><p class="cp-crop-error" role="alert"></p><div class="cp-crop-actions"><button type="button" class="cp-small-button" data-cp-close>Cancelar</button><button type="button" class="cp-save-button" data-cp-save>Salvar banner</button></div>';
 editor={dialog,file,img,url,isGif,uid:uid(),crop:{zoom:1,pos_x:.5,pos_y:.5}};
 const preview=dialog.querySelector('.cp-crop-preview');const displayed=new Image();displayed.alt='';displayed.src=url;preview.append(displayed);position(displayed,editor.crop);
 dialog.addEventListener('input',e=>{if(!editor||!e.target.dataset.cpRange)return;editor.crop[e.target.dataset.cpRange]=Number(e.target.value);position(displayed,editor.crop)});
 dialog.addEventListener('cancel',e=>{e.preventDefault();closeEditor()});
 dialog.addEventListener('close',()=>{if(editor?.dialog===dialog)closeEditor(true)});
 dialog.addEventListener('click',e=>{if(e.target.closest('[data-cp-close]'))closeEditor();else if(e.target.closest('[data-cp-save]'))void save()});
 document.body.append(dialog);dialog.showModal();
}
async function save(){
 const e=editor;if(!e||saving)return;saving=true;
 const button=e.dialog.querySelector('[data-cp-save]'),error=e.dialog.querySelector('.cp-crop-error');button.disabled=true;button.textContent='Salvando…';error.textContent='';
 try{
  if(!uid()||uid()!==e.uid)throw Error('Sua sessão mudou. Entre novamente.');
  if(e.isGif&&!await allowedGIF()){window.connectPremiumNotice?.('O banner animado em GIF');return;}
  const blob=e.isGif?e.file:await photoBlob(e.img,e.crop);
  const row={user_id:e.uid,mime:e.isGif?'image/gif':'image/jpeg',image_base64:await data64(blob),...(e.isGif?e.crop:{zoom:1,pos_x:.5,pos_y:.5})};
  if(uid()!==e.uid)throw Error('Sua sessão mudou.');
  if(state.mode==='onboard'&&!state.profile){registrationDraft=row;refresh(row);notify('Banner preparado. Será salvo ao concluir o perfil.');closeEditor(true);return;}
  const {data,error:err}=await db.from('entre_profile_banners').upsert(row,{onConflict:'user_id'}).select('mime,image_base64,zoom,pos_x,pos_y').single();
  if(err)throw err;
  if(uid()===e.uid){refresh(data);notify('Banner atualizado!')}
  closeEditor(true);
 }catch(err){error.textContent=String(err?.message||'Não foi possível salvar o banner.');}
 finally{saving=false;button.disabled=false;button.textContent='Salvar banner'}
}
async function remove(){
 if(saving||!uid()||!confirm('Remover o banner do perfil?'))return;
 const id=uid();saving=true;
 try{const {error}=await db.from('entre_profile_banners').delete().eq('user_id',id);if(error)throw error;if(uid()===id){refresh(null);notify('Banner removido.')}}
 catch(e){notify(e.message||'Não foi possível remover o banner.',true)}finally{saving=false}
}
document.addEventListener('change',e=>{if(e.target.id!=='cpBannerFile')return;const file=e.target.files?.[0];e.target.value='';void open(file).catch(err=>notify(err.message||'Não foi possível abrir a imagem.',true))});
document.addEventListener('click',e=>{if(e.target.closest?.('[data-cp-remove]'))void remove()});
const observer=new MutationObserver(scan);document.addEventListener('DOMContentLoaded',()=>{if(document.getElementById('app')){observer.observe(document.getElementById('app'),{childList:true,subtree:true});scan()}},{once:true});
async function commitRegistration(){const row=registrationDraft;if(!row||row.user_id!==uid())return true;const {data,error}=await db.from('entre_profile_banners').upsert(row,{onConflict:'user_id'}).select('mime,image_base64,zoom,pos_x,pos_y').single();if(error)throw error;registrationDraft=null;refresh(data);return true;}
window.connectBanners={paint,cropRect,scan,commitRegistration};
})();
