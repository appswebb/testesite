/* CONNECT commercial contact. Configure only an approved business mailbox. */
(()=>{
'use strict';
const COMMERCIAL_EMAIL='';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={mail:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>',link:'<path d="M10 13a4 4 0 0 0 6 .5l4-4a4 4 0 0 0-6-6l-2 2m2 5a4 4 0 0 0-6-.5l-4 4a4 4 0 0 0 6 6l2-2"/>',spark:'<path d="m12 3 2.8 6.2L21 12l-6.2 2.8L12 21l-2.8-6.2L3 12l6.2-2.8L12 3Z"/>',arrow:'<path d="M7 17 17 7M7 7h10v10"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>'};
const icon=(name,size=20)=>'<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths[name]+'</svg>';
function view(){
 const email=/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(COMMERCIAL_EMAIL)?COMMERCIAL_EMAIL:'';
 const subject=encodeURIComponent('Proposta comercial | CONNECT');
 return '<section class="connect-partner-page" aria-label="Parcerias e patrocínios"><header class="connect-partner-hero"><div class="connect-partner-orbit" aria-hidden="true"><img src="./connect-glass.svg" alt="" width="170" height="110"></div><span class="connect-partner-kicker"><i></i> CONNECT / COMERCIAL</span><h2>Boas conexões.<br>Grandes parcerias.</h2><p>Vamos construir oportunidades juntos. Conheça nosso canal exclusivo para marcas, patrocinadores e parceiros.</p></header><div class="connect-partner-opportunities"><article><span class="connect-partner-icon">'+icon('spark')+'</span><div><h3>Patrocínios</h3><p>Propostas de divulgação, presença de marca e ações patrocinadas.</p></div></article><article><span class="connect-partner-icon">'+icon('link')+'</span><div><h3>Parcerias</h3><p>Colaborações comerciais, projetos conjuntos e oportunidades estratégicas.</p></div></article></div><article class="connect-partner-contact"><div class="connect-partner-contact-heading"><span class="connect-partner-icon">'+icon('mail',22)+'</span><div><small>CONTATO COMERCIAL</small><h3>Envie sua proposta</h3></div></div><p>Apresente sua marca, o objetivo da colaboração e os detalhes da proposta.</p>'+(email?'<a class="connect-partner-email" href="mailto:'+esc(email)+'?subject='+subject+'"><span>'+esc(email)+'</span>'+icon('arrow',18)+'</a>':'<div class="connect-partner-email connect-partner-email-pending">E-mail comercial em breve</div>')+'<div class="connect-partner-notice">'+icon('info',18)+'<p><strong>Exclusivo para parcerias e patrocínios.</strong> Respondemos somente a propostas relacionadas a essas duas finalidades. Não atendemos suporte, denúncias ou dúvidas de usuários por este canal.</p></div></article></section>';
}
window.connectPartnerships={view};
const mount=()=>{const root=document.getElementById('connectPartnershipsPublic');if(root)root.innerHTML=view();};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
