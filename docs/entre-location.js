(function entreLocation(){
 'use strict';
 const UFS=[['AC','Acre'],['AL','Alagoas'],['AP','Amapá'],['AM','Amazonas'],['BA','Bahia'],['CE','Ceará'],['DF','Distrito Federal'],['ES','Espírito Santo'],['GO','Goiás'],['MA','Maranhão'],['MT','Mato Grosso'],['MS','Mato Grosso do Sul'],['MG','Minas Gerais'],['PA','Pará'],['PB','Paraíba'],['PR','Paraná'],['PE','Pernambuco'],['PI','Piauí'],['RJ','Rio de Janeiro'],['RN','Rio Grande do Norte'],['RS','Rio Grande do Sul'],['RO','Rondônia'],['RR','Roraima'],['SC','Santa Catarina'],['SP','São Paulo'],['SE','Sergipe'],['TO','Tocantins']];
 const geo={self:null,homeState:'',homeCity:'',targetState:'',targetCity:'',targetMode:'any',cities:{},failures:{},loading:new Set(),busy:false,ready:false,homeExpanded:false};
 const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 const rpc=async(name,params={})=>{const response=await db.rpc(name,params);if(response.error)throw response.error;return response.data;};
 const notice=()=>geo.self?`Localização de referência: ${esc(geo.self.city)} — ${esc(geo.self.state)}.`:'Defina sua cidade e estado para buscar pessoas por região.';
 const stateSelect=(name,value,disabled=false)=>`<select data-geo-field="${name}" aria-label="Estado" ${disabled?'disabled':''}><option value="">Selecione o estado</option>${UFS.map(([uf,n])=>`<option value="${uf}" ${value===uf?'selected':''}>${esc(n)} (${uf})</option>`).join('')}</select>`;
 const cityControl=(name,uf,value,disabled=false)=>{
  const items=geo.cities[uf]||[];
  const loading=geo.loading.has(uf);
  if(loading)return `<select data-geo-field="${name}" aria-label="Cidade" disabled><option>Carregando cidades…</option></select>`;
  if(items.length)return `<select data-geo-field="${name}" aria-label="Cidade" ${disabled?'disabled':''}><option value="">Selecione a cidade</option>${items.map(city=>`<option value="${esc(city)}" ${city===value?'selected':''}>${esc(city)}</option>`).join('')}</select>`;
  return `<input type="text" data-geo-field="${name}" aria-label="Cidade" placeholder="${uf?'Digite sua cidade':'Selecione o estado primeiro'}" value="${esc(value||'')}" minlength="2" maxlength="100" ${disabled||!uf?'disabled':''}>`;
 };
 function panel(waiting=false){
  const busy=waiting||geo.busy;
  const modes=[['any','Qualquer região do Brasil'],['my_state','Meu estado'],['my_city','Minha cidade'],['other_state','Escolher outro estado'],['other_city','Escolher outra cidade']];
  const custom=geo.targetMode==='other_state'||geo.targetMode==='other_city';
  return `<section class="geo-discovery" aria-label="Localização e proximidade para encontros">
   <div class="geo-discovery-top"><div><span class="geo-eyebrow">${ico('compass',15)} LOCALIZAÇÃO</span><h3>Encontre alguém por região.</h3><p>Escolha sua cidade ou detecte automaticamente. A busca pode usar qualquer estado ou cidade.</p></div><span class="geo-privacy-pill">${ico('lock',14)} Sem GPS salvo</span></div>
   <div class="geo-panel-grid">
    <div class="geo-panel-card">
     <strong>Minha cidade de referência</strong><small>${notice()}</small>
     <div class="geo-input-row"><label>Estado${stateSelect('home-state',geo.homeState,busy)}</label><label>Cidade${cityControl('home-city',geo.homeState,geo.homeCity,busy)}</label></div>
     <div class="geo-actions"><button type="button" data-action="geoSave" ${busy?'disabled':''}>${ico('check',15)} Salvar cidade</button>
     <button type="button" data-action="geoDetect" ${busy?'disabled':''}>${ico('compass',15)} Detectar automaticamente</button></div>
    </div>
    <div class="geo-panel-card">
     <strong>Onde quer conhecer pessoas?</strong><small>As opções por região exigem a sua cidade de referência, e as duas buscas precisam ser compatíveis.</small>
     <label class="geo-target-label">Região de busca<select data-geo-field="target-mode" ${busy?'disabled':''}>${modes.map(([value,label])=>`<option value="${value}" ${geo.targetMode===value?'selected':''}>${esc(label)}</option>`).join('')}</select></label>
     ${custom?`<div class="geo-input-row"><label>Estado${stateSelect('target-state',geo.targetState,busy)}</label>${geo.targetMode==='other_city'?`<label>Cidade${cityControl('target-city',geo.targetState,geo.targetCity,busy)}</label>`:''}</div>`:''}
    </div>
   </div>
   <p class="geo-privacy-note">${ico('shield',14)} Sua cidade não aparece publicamente no perfil. Ao detectar automaticamente, o navegador pedirá autorização e enviará as coordenadas uma única vez ao OpenStreetMap para identificar o município. Guardamos só cidade e UF no Supabase.</p>
  </section>`;
 }
 const modes=[['any','Todo o Brasil'],['my_state','Meu estado'],['my_city','Minha cidade'],['other_state','Outro estado'],['other_city','Outra cidade']];
 let picker='';
 const fieldValue=key=>({'target-mode':geo.targetMode,'target-state':geo.targetState,'target-city':geo.targetCity,'home-state':geo.homeState,'home-city':geo.homeCity})[key]||'';
 function pickerField(key,label,options,placeholder,busy=false,searchable=false){
  const value=fieldValue(key),selected=options.find(([v])=>v===value),expanded=picker===key&&!busy;
  return '<div class="cp-geo-field"><span class="cp-geo-label">'+esc(label)+'</span><button type="button" class="cp-geo-select" data-geo-picker="'+key+'" aria-expanded="'+expanded+'" '+(busy?'disabled':'')+'><span>'+esc(selected?.[1]||value||placeholder)+'</span>'+ico('chevron',16)+'</button>'+
  (expanded?'<div class="cp-geo-options">'+(searchable?'<input type="search" class="cp-geo-search" data-geo-search aria-label="Buscar '+esc(label.toLowerCase())+'" placeholder="Buscar..." autocomplete="off">':'')+'<div class="cp-geo-list" role="group" aria-label="'+esc(label)+'">'+options.map(([v,n])=>'<button type="button" class="cp-geo-choice" data-geo-key="'+key+'" data-geo-choice="'+esc(v)+'" aria-pressed="'+(value===v)+'"><span>'+esc(n)+'</span>'+(value===v?ico('check',16):'')+'</button>').join('')+'<p class="cp-geo-no-results" hidden>Nenhum resultado.</p></div></div>':'')+'</div>';
 }
 function cityPicker(key,uf,busy){
  if(!uf)return '<div class="cp-geo-field"><span class="cp-geo-label">Cidade</span><button type="button" class="cp-geo-select" disabled>Selecione o estado primeiro</button></div>';
  if(geo.loading.has(uf))return '<div class="cp-geo-field"><span class="cp-geo-label">Cidade</span><p class="cp-geo-feedback" role="status">Carregando cidades…</p></div>';
  const items=geo.cities[uf]||[];
  if(items.length)return pickerField(key,'Cidade',items.map(n=>[n,n]),'Selecione a cidade',busy,true);
  if(geo.failures[uf])return '<div class="cp-geo-field"><label class="cp-geo-label" for="cpGeoManualCity">Cidade</label><input id="cpGeoManualCity" class="cp-geo-manual" type="text" data-geo-field="'+key+'" value="'+esc(fieldValue(key))+'" maxlength="100" placeholder="Digite o nome da cidade" '+(busy?'disabled':'')+'><p class="cp-geo-feedback">Não foi possível carregar a lista do IBGE. Você pode tentar novamente ou informar a cidade manualmente.</p><button type="button" class="cp-geo-retry" data-geo-retry="'+esc(uf)+'" '+(busy?'disabled':'')+'>Tentar novamente</button></div>';
  return '<div class="cp-geo-field"><span class="cp-geo-label">Cidade</span><button type="button" class="cp-geo-select" data-geo-retry="'+esc(uf)+'" '+(busy?'disabled':'')+'>Carregar cidades '+ico('chevron',16)+'</button></div>';
 }
 function compactPanel(waiting=false){
  const busy=waiting||geo.busy,custom=['other_state','other_city'].includes(geo.targetMode);
  const states=UFS.map(([uf,n])=>[uf,n+' ('+uf+')']);
  if(geo.homeExpanded)return '<section class="geo-discovery geo-discovery-compact cp-geo-panel geo-edit-mode" aria-label="Editar localização"><div class="cp-geo-heading"><strong>Minha cidade</strong><button type="button" class="cp-geo-link" data-action="geoHomeClose">'+ico('back',15)+' Voltar</button></div><p class="cp-geo-feedback">Escolha sua cidade ou use a detecção automática.</p>'+pickerField('home-state','Estado',states,'Selecione o estado',busy,true)+cityPicker('home-city',geo.homeState,busy)+'<div class="cp-geo-actions"><button type="button" class="cp-geo-primary" data-action="geoSave" '+(busy||!geo.homeState||!geo.homeCity||geo.loading.has(geo.homeState)?'disabled':'')+'>'+ico('check',15)+' Salvar cidade</button><button type="button" class="cp-geo-secondary" data-action="geoDetect" '+(busy?'disabled':'')+'>'+ico('compass',15)+' Detectar</button></div><p class="cp-geo-feedback">'+ico('shield',14)+' Guardamos apenas cidade e estado.</p></section>';
  return '<section class="geo-discovery geo-discovery-compact cp-geo-panel" aria-label="Região do encontro">'+pickerField('target-mode','Onde encontrar pessoas?',modes,'Todo o Brasil',busy)+
   (custom?pickerField('target-state','Estado',states,'Selecione o estado',busy,true)+(geo.targetMode==='other_city'?cityPicker('target-city',geo.targetState,busy):''):'')+
   (!geo.self&&geo.targetMode!=='any'?'<p class="cp-geo-feedback">Configure sua cidade para usar a busca por região.</p>':'')+
   '<div class="cp-geo-home"><span class="cp-geo-home-icon">'+ico('compass',18)+'</span><span><small>Minha cidade</small><strong>'+esc(geo.self?geo.self.city+' · '+geo.self.state:'Não configurada')+'</strong></span><button type="button" class="cp-geo-link" data-action="geoHomeEdit" '+(busy?'disabled':'')+'>'+(geo.self?'Alterar':'Configurar')+' '+ico('chevron',14)+'</button></div></section>';
 }
 function paintCompact(focusKey=''){
  if(state.view!=='connect'||!state.liveFiltersOpen)return;
  const old=document.querySelector('body > .cp-match-filter-sheet .cp-geo-panel');
  if(!old)return;
  old.outerHTML=compactPanel(state.searching);
  if(focusKey)document.querySelector('[data-geo-picker="'+focusKey+'"]')?.focus({preventScroll:true});
 }
 function changeField(key,value){
  picker='';
  switch(key){
   case 'home-state':if(geo.homeState!==value){geo.homeState=value;geo.homeCity='';}if(value)void citiesFor(value);break;
   case 'home-city':geo.homeCity=value;break;
   case 'target-mode':geo.targetMode=value;if(value==='other_city'&&geo.targetState)void citiesFor(geo.targetState);break;
   case 'target-state':if(geo.targetState!==value){geo.targetState=value;geo.targetCity='';}if(value&&geo.targetMode==='other_city')void citiesFor(value);break;
   case 'target-city':geo.targetCity=value;break;
  }
  paintCompact(key);
 }
 document.addEventListener('click',event=>{
  const button=event.target.closest?.('[data-geo-picker],[data-geo-choice],[data-geo-retry]');
  if(!button||button.disabled||!button.closest('.cp-geo-panel')||state.searching||geo.busy)return;
  event.preventDefault();
  if(button.dataset.geoPicker){const key=button.dataset.geoPicker;picker=picker===key?'':key;paintCompact(key);return;}
  if(button.hasAttribute('data-geo-choice')){changeField(button.dataset.geoKey,button.dataset.geoChoice);return;}
  if(button.dataset.geoRetry){void citiesFor(button.dataset.geoRetry);return;}
 });
 document.addEventListener('input',event=>{
  const el=event.target;
  if(el.matches?.('[data-geo-search]')){
   const list=el.closest('.cp-geo-options')?.querySelector('.cp-geo-list');if(!list)return;
   const term=normalize(el.value);let count=0;
   list.querySelectorAll('[data-geo-choice]').forEach(b=>{b.hidden=!normalize(b.textContent).includes(term);if(!b.hidden)count++});
   list.querySelector('.cp-geo-no-results').hidden=count>0;
  }else if(el.matches?.('.cp-geo-manual')){
   if(el.dataset.geoField==='home-city'){geo.homeCity=el.value;const save=el.closest('.cp-geo-panel')?.querySelector('[data-action="geoSave"]');if(save)save.disabled=geo.busy||el.value.trim().length<2;}
   if(el.dataset.geoField==='target-city')geo.targetCity=el.value;
  }
 });
 async function citiesFor(uf){
  if(!uf||geo.cities[uf]||geo.loading.has(uf))return;
  geo.loading.add(uf);delete geo.failures[uf];paintCompact();
  try{
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),9000);
   let response;
   try{response=await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(uf)}/municipios`,{signal:controller.signal});}
   finally{clearTimeout(timeout);}
   if(!response.ok)throw Error('IBGE indisponível');
   const items=await response.json();
   if(!Array.isArray(items)||items.length<1||items.length>1500)throw Error('Lista de cidades indisponível');
   geo.cities[uf]=items.map(x=>String(x.nome||'')).filter(Boolean).sort((a,b)=>a.localeCompare(b,'pt-BR'));
   if(geo.homeState===uf&&geo.homeCity){geo.homeCity=geo.cities[uf].find(x=>normalize(x)===normalize(geo.homeCity))||geo.homeCity;}
   if(geo.targetState===uf&&geo.targetCity){geo.targetCity=geo.cities[uf].find(x=>normalize(x)===normalize(geo.targetCity))||geo.targetCity;}
  }catch(error){geo.failures[uf]=true;console.warn('Municípios IBGE indisponíveis',error);}
  finally{geo.loading.delete(uf);if(state.view==='connect'&&!state.searching&&((geo.homeExpanded&&geo.homeState===uf)||(!geo.homeExpanded&&geo.targetMode==='other_city'&&geo.targetState===uf))){if(!picker)paintCompact();}}
 }
 async function init(){
  if(geo.ready)return;
  geo.ready=true;
  try{
   const current=await rpc('entre_my_location');
   if(current?.state&&current?.city){geo.self=current;geo.homeState=current.state;geo.homeCity=current.city;void citiesFor(current.state);}
  }catch(error){console.warn('Não foi possível carregar cidade de referência',error);}
  if(state.view==='connect')renderView();
 }
 async function save(stateCode,cityName){
  const uf=String(stateCode||'').toUpperCase().trim(),city=String(cityName||'').trim();
  if(!UFS.some(([v])=>v===uf)||city.length<2||city.length>100)throw Error('Selecione um estado e uma cidade válidos.');
  if(geo.cities[uf]?.length&&!geo.cities[uf].some(n=>normalize(n)===normalize(city)))throw Error('Selecione uma cidade da lista do IBGE.');
  const data=await rpc('entre_set_location',{_state:uf,_city:city});
  geo.self=data;geo.homeState=data.state;geo.homeCity=data.city;
  toast('Cidade e estado salvos. Você pode buscar pessoas de outras regiões.');
 }
 async function detect(){
  if(!navigator.geolocation)throw Error('O navegador não permite localização. Escolha seu estado e sua cidade manualmente.');
  const coords=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,timeout:12000,maximumAge:300000}));
  const lat=coords.coords.latitude,lon=coords.coords.longitude;
  if(!Number.isFinite(lat)||!Number.isFinite(lon))throw Error('Não foi possível detectar a localização.');
  const url=new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('lat',String(lat));url.searchParams.set('lon',String(lon));
  url.searchParams.set('format','jsonv2');url.searchParams.set('addressdetails','1');url.searchParams.set('zoom','10');
  const response=await fetch(url.toString(),{headers:{'Accept-Language':'pt-BR'}});
  if(!response.ok)throw Error('A detecção automática está indisponível. Escolha sua cidade manualmente.');
  const result=await response.json();const address=result?.address||{};
  if(address.country_code?.toLowerCase()!=='br')throw Error('A detecção automática de cidades está disponível somente no Brasil.');
  const code=String(address['ISO3166-2-lvl4']||address['ISO3166-2-lvl3']||'').split('-').pop().toUpperCase();
  const stateCode=UFS.some(([uf])=>uf===code)?code:UFS.find(([,name])=>normalize(name)===normalize(address.state))?.[0];
  const name=address.city||address.town||address.village||address.municipality||address.county;
  if(!stateCode||!name)throw Error('Não consegui identificar a cidade. Escolha manualmente.');
  geo.homeState=stateCode;geo.homeCity=String(name).trim();
  await citiesFor(stateCode);
  await save(geo.homeState,geo.homeCity);
 }
 async function action(type){
  if(type==='geoHomeEdit'||type==='geoHomeClose'){
   geo.homeExpanded=type==='geoHomeEdit';picker='';if(geo.homeExpanded&&geo.homeState)void citiesFor(geo.homeState);paintCompact();return;
  }
  if(geo.busy||state.searching)return;
  geo.busy=true;picker='';paintCompact();
  try{
   if(type==='geoDetect')await detect();
   else if(type==='geoSave')await save(geo.homeState,geo.homeCity);
   geo.homeExpanded=false;
  }catch(error){toast(error?.message||'Não foi possível atualizar sua localização.',true);}
  finally{geo.busy=false;paintCompact();}
 }
 function target(){
  if(geo.targetMode==='any')return {_target_state:null,_target_city:null};
  if(!geo.self?.state||!geo.self?.city)throw Error('Salve sua cidade de referência antes de filtrar por região.');
  if(geo.targetMode==='my_state')return {_target_state:geo.self.state,_target_city:null};
  if(geo.targetMode==='my_city')return {_target_state:geo.self.state,_target_city:geo.self.city};
  if(geo.targetMode==='other_state'||geo.targetMode==='other_city'){
   if(!geo.targetState)throw Error('Selecione o estado em que quer encontrar pessoas.');
   if(geo.targetMode==='other_city'&&(!geo.targetCity||geo.targetCity.trim().length<2||geo.loading.has(geo.targetState)))throw Error('Selecione a cidade em que quer encontrar pessoas.');
   return {_target_state:geo.targetState,_target_city:geo.targetMode==='other_city'?geo.targetCity.trim():null};
  }
  return {_target_state:null,_target_city:null};
 }
 document.addEventListener('change',event=>{
  const el=event.target.closest?.('[data-geo-field]');
  if(!el||state.searching||geo.busy||el.closest('.cp-geo-panel'))return;
  switch(el.dataset.geoField){
   case'home-state':geo.homeState=el.value;geo.homeCity='';renderView();void citiesFor(geo.homeState);break;
   case'home-city':geo.homeCity=el.value;break;
   case'target-mode':geo.targetMode=el.value;renderView();break;
   case'target-state':geo.targetState=el.value;geo.targetCity='';renderView();void citiesFor(geo.targetState);break;
   case'target-city':geo.targetCity=el.value;break;
  }
 });
 window.entreGeo={init,panel,compactPanel,action,target,resetPicker:()=>{picker='';geo.homeExpanded=false;},details:()=>({...geo,self:geo.self?{...geo.self}:null})};
})();
