(()=>{
'use strict';
const markup=body=>'<span class="cw-translation"><button type="button" class="cw-translate" data-cw-translate="'+esc(String(body))+'">Traduzir</button><span class="cw-translated" hidden></span></span>';
document.addEventListener('click',async event=>{
 const btn=event.target.closest?.('[data-cw-translate]');if(!btn||btn.disabled)return;
 const text=btn.dataset.cwTranslate,target=window.connectWorld?.current?.().language||'pt',out=btn.parentElement.querySelector('.cw-translated');
 if(!out.hidden){out.hidden=true;btn.textContent='Traduzir';return;}
 if(out.textContent){out.hidden=false;btn.textContent='Ver original';return;}
 btn.disabled=true;let detector,translator;
 try{
  if(!window.LanguageDetector||!window.Translator)throw Error('local_unavailable');
  if(await LanguageDetector.availability()==='unavailable')throw Error('local_unavailable');
  detector=await LanguageDetector.create();const choices=await detector.detect(text),source=choices[0]?.detectedLanguage;
  if(!source||source==='und')throw Error('local_unavailable');
  if(source===target){out.textContent='A mensagem já está neste idioma.';}else{
   const opts={sourceLanguage:source,targetLanguage:target};if(await Translator.availability(opts)==='unavailable')throw Error('local_unavailable');
   translator=await Translator.create(opts);out.textContent=await translator.translate(text);
  }
  if(btn.isConnected){out.hidden=false;btn.textContent='Ver original';}
 }catch(_){
  if(!btn.isConnected)return;
  if(confirm('A tradução local não está disponível neste navegador. Deseja abrir o Google Tradutor e compartilhar somente esta mensagem com esse serviço externo?')){
   const url=new URL('https://translate.google.com/');url.searchParams.set('sl','auto');url.searchParams.set('tl',target);url.searchParams.set('text',text);url.searchParams.set('op','translate');window.open(url.href,'_blank','noopener,noreferrer');
  }
 }finally{try{detector?.destroy();translator?.destroy();}catch(_){}if(btn.isConnected)btn.disabled=false;}
});
window.connectTranslate={markup};
})();
