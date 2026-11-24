/* CONNECT public presentation. No interactive simulations or calls to private APIs. */
(()=>{
'use strict';
const items=[
 ['meet','bolt','Ao vivo','Cinco minutos para conhecer alguém.','Escolha texto ou vídeo, defina a região e suas preferências. Se os dois aceitarem continuar, a conversa vira uma conexão salva.','Texto ou vídeo','5 minutos','Aceite mútuo'],
 ['feed','home','Início','Compartilhe momentos.','Crie posts com texto, foto ou vídeo, curta e comente publicações e publique stories disponíveis por até 24 horas.','Publicações','Stories','Fotos e vídeos'],
 ['chat','chat','Conversas','Continue de onde parou.','Organize suas conversas permanentes, fixe, arquive e envie mensagens, fotos, vídeos ou áudios.','Mídias','Organização','Mensagens de voz'],
 ['rooms','rooms','Salas','Do Brasil à sua cidade.','Converse em grupo na sala global ou em salas por estado e cidade. As mensagens das salas ficam disponíveis por 24 horas.','Brasil','Estado','Cidade'],
 ['lives','camera','Lives','Compartilhe o momento ao vivo.','Explore transmissões por categoria ou região, inicie sua live e aprove pedidos de convidados para participar.','Transmissões','Categorias','Convidados'],
 ['online','users','Online','Conheça novas pessoas.','Veja quem está online e escolheu aparecer. Controle a visibilidade do seu perfil e as solicitações de desconhecidos.','Presença','Perfis','Solicitações'],
 ['notes','bell','Notificações','Acompanhe o que importa.','Veja atividades da conta em Notificações e comunicados e enquetes oficiais em Avisos.','Atividade','Avisos','Enquetes'],
 ['settings','settings','Configurações','O CONNECT do seu jeito.','Escolha modo claro ou escuro, personalize a cor e ajuste a intensidade dos efeitos. Gerencie sua conta e privacidade.','Tema','Cor','Animações']
];
const dark=()=>document.documentElement.dataset.theme==='dark';
const src=(name)=>'./showcase-'+name+(document.documentElement.dataset.connectStyle==='neon'?'-neon':document.documentElement.dataset.connectStyle==='romance'?'-romance':'')+(dark()?'-dark':'')+'.svg?v=neon-v11';
const picture=(name,alt,priority=false)=>'<img class="cx-shot" data-cx-shot="'+name+'" src="'+src(name)+'" alt="'+alt+'" width="320" height="560" '+(priority?'fetchpriority="high"':'loading="lazy" decoding="async"')+'>';
let ico;
const I=(n,s=18)=>ico(n,s);
function render(brand,icon){
 ico=icon;
 const order=['feed','meet','rooms','lives','chat','settings','online','notes'];
 const titles={feed:'Início',meet:'Ao vivo',rooms:'Salas',lives:'Lives',chat:'Conversas',settings:'Configurações',online:'Online',notes:'Notificações'};
 const cards=order.map((id,i)=>{const x=items.find(y=>y[0]===id);const photo=(id==='feed'||id==='meet')?'<div class="nx-photo-preview nx-photo-'+id+'" role="img" aria-label="Ilustração IA de celular com '+x[2]+'"></div>':'<div class="nx-device">'+picture(id,'Prévia ilustrada de '+x[2])+'</div>';return '<article class="nx-feature nx-feature-'+id+'" id="recurso-'+id+'"><div class="nx-feature-copy"><span class="nx-feature-icon">'+I(x[1],23)+'</span><h3>'+titles[id]+'</h3><p>'+x[4]+'</p></div><div class="nx-feature-visual">'+photo+'</div></article>';}).join('');
 return '<header class="nx-header"><div class="nx-wrap nx-nav">'+brand()+'<nav aria-label="Navegação pública"><a href="#inicio">Início</a><a href="#recursos">Recursos</a><a href="#como-funciona">Como funciona</a><a href="./instalar.html">Instalar</a></nav><div class="nx-actions"><button type="button" class="nx-ghost" data-action="login">Entrar</button><button type="button" class="nx-cta" data-action="signup">Criar conta '+I('arrow',17)+'</button></div></div></header>'+
 '<main class="nx-public"><section class="nx-wrap nx-hero" id="inicio"><div class="nx-hero-copy"><img class="nx-hero-logo" src="./connect-glass.svg?v=neon-v11" width="320" height="197" alt=""><div class="nx-hero-name">CONNECT</div><h1>Conheça. Converse.<br><em>Continue.</em></h1><p>O app para conhecer novas pessoas, conversar em tempo real, participar de salas, assistir e fazer lives, compartilhar momentos e muito mais.</p><div class="nx-actions"><button type="button" class="nx-cta nx-main-cta" data-action="signup">Começar agora '+I('arrow',20)+'</button><a class="nx-ghost" href="./instalar.html">'+I('arrow',17)+' Instalar app</a></div><small>18+ · Encontros de 5 minutos · Aceite mútuo</small></div><div class="nx-hero-visual"><img src="./neon-phones.avif?v=11" width="480" height="407" fetchpriority="high" alt="Ilustração gerada por IA: dois celulares mostrando as áreas Início e Ao vivo do CONNECT"><span class="nx-art-caption">Ilustração promocional</span></div></section>'+
 '<section class="nx-wrap nx-resources" id="recursos"><div class="nx-heading"><span>EXPLORE O APLICATIVO</span><h2>Um mundo de conexões.</h2><p>Conheça as áreas disponíveis após o cadastro.</p></div><div class="nx-feature-grid">'+cards+'</div><small class="nx-preview-note">Imagens promocionais e prévias ilustradas; nomes e atividades são exemplos, não dados reais.</small></section>'+
 '<section class="nx-wrap nx-how" id="como-funciona"><div class="nx-heading"><span>O PRIMEIRO ENCONTRO</span><h2>De um oi a uma conexão.</h2></div><div class="nx-steps">'+[['01','chat','Escolha','Texto ou vídeo, com suas preferências.'],['02','clock','Converse','Cinco minutos para conhecer alguém.'],['03','heart','Continue','Se ambos aceitarem, a conversa permanece.']].map(x=>'<article><small>'+x[0]+'</small><span>'+I(x[1],25)+'</span><h3>'+x[2]+'</h3><p>'+x[3]+'</p></article>').join('')+'</div></section>'+
 '<section class="nx-wrap nx-profile-promo"><div class="nx-profile-art"><img src="./neon-logo.avif?v=11" alt="" width="320" height="197" loading="lazy"></div><div><span class="nx-eyebrow">SEU PERFIL, SUA EXPERIÊNCIA</span><h2>O CONNECT do seu jeito.</h2><p>Personalize sua conta e escolha o tema, a cor, o nível de animação e os sons. Controle quem pode conversar com você.</p><div class="nx-perks">'+['Meu perfil','Configurações','Assinatura Premium','Relatar problema','Privacidade e dados'].map((v,i)=>'<span>'+I(['user','settings','crown','flag','shield'][i],18)+v+'</span>').join('')+'</div></div></section>'+
 '<section class="nx-wrap nx-final"><div class="nx-final-copy"><h2>Viva novas conexões.</h2><p>Crie sua conta ou instale o CONNECT no seu aparelho.</p></div><div class="nx-actions"><button type="button" class="nx-cta" data-action="signup">Criar minha conta '+I('arrow',17)+'</button><a class="nx-ghost" href="./instalar.html">Instalar aplicativo</a></div></section></main>'+
 '<footer class="nx-footer"><div class="nx-wrap">'+brand()+'<small>© 2026 CONNECT · 18+</small><nav><a href="./dados.html">Seus dados</a><a href="./privacidade.html">Privacidade</a><a href="./termos.html">Termos</a></nav></div></footer>';
}
window.addEventListener('entre:themechange',()=>{
 document.querySelectorAll('img[data-cx-shot]').forEach(el=>{const url=src(el.dataset.cxShot);if(el.getAttribute('src')!==url)el.setAttribute('src',url)});
 const b=document.querySelector('[data-cx-theme]');if(b&&ico)b.innerHTML=I(dark()?'spark':'settings',19);
});
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-cx-theme]');if(!b)return;window.entreTheme?.setMode(dark()?'light':'dark');});
window.connectShowcase={render};
})();
