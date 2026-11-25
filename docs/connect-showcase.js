/* CONNECT public presentation. No interactive simulations or calls to private APIs. */
(()=>{
'use strict';
const items=[
 ['meet','bolt','Ao vivo','Cinco minutos para conhecer alguém.','Escolha texto ou vídeo, defina a região e suas preferências. Se os dois aceitarem continuar, a conversa vira uma conexão salva.','Texto ou vídeo','5 minutos','Aceite mútuo'],
 ['feed','home','Início','Compartilhe momentos.','Crie posts com texto, foto ou vídeo, curta e comente publicações.','Publicações','Comentários','Fotos e vídeos'],
 ['chat','chat','Conversas','Continue de onde parou.','Organize suas conversas permanentes, fixe, arquive e envie mensagens, fotos, vídeos ou áudios.','Mídias','Organização','Mensagens de voz'],
 ['rooms','rooms','Salas','Do Brasil à sua cidade.','Converse em grupo na sala global ou em salas por estado e cidade. As mensagens das salas ficam disponíveis por 24 horas.','Brasil','Estado','Cidade'],
 ['online','users','Online','Conheça novas pessoas.','Veja quem está online e escolheu aparecer. Controle a visibilidade do seu perfil e as solicitações de desconhecidos.','Presença','Perfis','Solicitações'],
 ['notes','bell','Notificações','Acompanhe o que importa.','Veja atividades da conta em Notificações e comunicados e enquetes oficiais em Avisos.','Atividade','Avisos','Enquetes'],
 ['settings','settings','Configurações','O CONNECT do seu jeito.','Escolha modo claro ou escuro, personalize a cor e ajuste a intensidade dos efeitos. Gerencie sua conta e privacidade.','Tema','Cor','Animações']
];
let ico;
const I=(n,s=18)=>ico(n,s);
const artLabels={meet:'Ao vivo: escolha de texto ou vídeo',feed:'Início: publicações e comentários',chat:'Conversas: organização de contatos',rooms:'Salas: conversa regional',lives:'Lives: busca de transmissões',online:'Online: perfis e solicitações',notes:'Notificações e avisos',settings:'Configurações: temas, animações e sons'};
const phone=(id,priority=false)=>'<div class="cl-phone" role="img" aria-label="'+artLabels[id]+' — demonstração com dados fictícios"><div class="cl-phone-screen"><iframe class="cl-demo-frame" src="./demo-'+id+'.html?v='+(id==='meet'?'20261124-current-live':'20261124-no-stories')+'" title="'+artLabels[id]+'" width="390" height="760" sandbox="allow-same-origin" tabindex="-1" aria-hidden="true" '+(priority?'loading="eager"':'loading="lazy"')+'></iframe></div></div>';
const image=(id,priority=false)=>id==='hero'?'<div class="cl-phone-pair">'+phone('feed',true)+phone('meet',true)+'</div>':phone(id,priority);
let raf=0;
const watched=new WeakSet();
const resize=typeof ResizeObserver==='function'?new ResizeObserver(entries=>entries.forEach(({target})=>scale(target))):null;
function syncDemo(frame){
 try{
  const doc=frame.contentDocument,root=doc?.documentElement;
  if(!root||!doc.querySelector('#app'))return;
  const sheet=doc.querySelector('link[href*="connect-demo-neutral.css"]');
  if(sheet&&!sheet.href.includes('neutral-v4'))sheet.setAttribute('href','./connect-demo-neutral.css?v=20261124-neutral-v4');
  root.dataset.theme=document.documentElement.dataset.theme==='dark'?'dark':'light';
 }catch(_){/* frame not ready */}
}
function scale(el){if(!el.isConnected)return;const frame=el.querySelector('.cl-demo-frame');if(frame){frame.style.transform='scale('+(el.clientWidth/390)+')';syncDemo(frame);if(!frame.dataset.themeSynced){frame.dataset.themeSynced='1';frame.addEventListener('load',()=>syncDemo(frame));}}}
window.addEventListener('entre:themechange',schedule);
function layout(){raf=0;document.querySelectorAll('.cl-phone-screen').forEach(el=>{if(!watched.has(el)){watched.add(el);resize?.observe(el)}scale(el)})}
function schedule(){if(!raf)raf=requestAnimationFrame(layout)}
document.addEventListener('DOMContentLoaded',()=>{const app=document.getElementById('app');if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});schedule()},{once:true});
window.addEventListener('resize',schedule);
function render(brand,icon){
 ico=icon;
 const cards=items.map((x,i)=>'<article class="cl-demo"><div class="cl-demo-art">'+image(x[0])+'</div><div class="cl-demo-copy"><span>'+I(x[1],20)+' '+x[2]+'</span><h3>'+x[3]+'</h3><p>'+x[4]+'</p></div></article>').join('');
 return '<header class="cl-header"><div class="cl-wrap cl-nav"><a class="cl-wordmark" href="#" data-action="logo" aria-label="CONNECT início"><img src="./connect-glass.svg?v=showcase-v17" width="32" height="32" alt=""><span>CONNECT</span></a><nav class="cl-header-links" aria-label="Navegação da homepage"><a href="#recursos">Recursos</a><a href="./instalar.html">Instalar</a></nav><div class="cl-header-actions">'+(window.entreTheme?.toggleMarkup?.()||'')+'<button data-action="login" type="button" class="cl-login-button">Entrar</button></div></div></header>'+
 '<main class="cl-public"><section class="cl-wrap cl-hero"><div><span class="cl-kicker">UMA CONVERSA MUDA TUDO</span><div class="connect-community-totals" aria-label="Indicadores da comunidade"><span class="cc-stat cc-stat-online" title="Pessoas visíveis nos últimos cinco minutos"><i class="cc-presence-dot" aria-hidden="true"></i><strong data-connect-online-count>—</strong><small>online</small></span><span class="cc-stat cc-stat-accounts" title="Contas existentes com perfil criado no CONNECT"><strong data-connect-account-count>—</strong><small>contas criadas</small></span></div><h1>O próximo oi<br> começa aqui.</h1><p>Conheça novas pessoas por texto ou vídeo. Cinco minutos para conversar. Se os dois quiserem continuar, a conexão fica.</p><div class="cl-actions"><button class="cl-primary" type="button" data-action="signup">Criar conta '+I('arrow',18)+'</button><a class="cl-secondary" href="#recursos">Conhecer o app</a></div><small>18+ · Encontros privados · Escolha mútua</small></div><div class="cl-hero-art">'+image('hero',true)+'</div></section>'+
 '<section class="cl-wrap cl-resources" id="recursos"><div class="cl-heading"><span class="cl-kicker">POR DENTRO DO CONNECT</span><h2>Mais do que um encontro.</h2><p>Explore os recursos disponíveis no aplicativo.</p></div><div class="cl-grid">'+cards+'</div><small class="cl-note">Demonstrações das telas do próprio CONNECT, com dados fictícios. Nenhuma atividade real é exibida.</small></section>'+
 '<section class="cl-wrap cl-end"><h2>Pronto para conversar?</h2><div class="cl-actions"><a class="cl-primary" href="./instalar.html">Instalar aplicativo</a></div></section></main><footer class="cl-footer"><div class="cl-wrap">'+brand()+'<span>© 2026 CONNECT</span><nav><a href="./privacidade.html">Privacidade</a><a href="./termos.html">Termos</a><a href="./dados.html">Seus dados</a><a href="./parcerias.html">Parcerias e patrocínios</a></nav></div></footer>';
}
window.connectShowcase={render};
})();
