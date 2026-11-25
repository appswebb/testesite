/* CONNECT Command Center. All privileged access is checked on Supabase RPC functions. */
(function(){
"use strict";
var URL="https://trrakyybnvxpdhxwgjrz.supabase.co";
var KEY="sb_publishable_OJ4wBPPNVBBcrcNl12yonw_hRSlMKsZ";
var app=document.getElementById("console"), toastEl=document.getElementById("toast");
if(!window.supabase || !window.supabase.createClient){
 app.innerHTML='<div class="preload"><h1>Falha de conexão</h1><p>Atualize a página quando estiver conectado à internet.</p></div>';return;
}
var db=window.supabase.createClient(URL,KEY,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
var state={user:null,verified:false,view:"overview",loading:false,busy:false,overview:null,users:{rows:[],total:0},reports:[],pairs:[],settings:null,search:"",userPage:0,reportStatus:"open",modal:null,refreshAt:null,appeals:[],privacyRequests:[],bulletins:[],supportTickets:[],commentReports:[],premiumConfig:null,recurringConfig:null,manualPremiumAccount:null,observability:null,planDirectory:null,planSearch:'',planFilter:'all',planPage:0,moreOpen:false,community:null,communityUnavailable:false,loadError:null,platformControls:null,contentKind:"posts",contentPage:0,contentData:null};
var perPage=20, planSearchTimer=null, searchTimer=null, toastTimer=null, lastLoad=0;
var sections=[
 ["overview","Visão geral","layout-dashboard"],
 ["monitor","Monitoramento","activity"],
 ["modules","Controle","grid"],
 ["content","Conteúdo","file-text"],
 ["moments","Moments","video"],
 ["updates","Atualização","activity"],
 ["users","Usuários","users"],
 ["reports","Denúncias","flag"],
 ["pairs","Encontros","heart-handshake"],
 ["appeals","Contestações","alert-circle"],
  ["bulletins","Avisos","message-circle"],
  ["support","Suporte","headset"],
  ["premium","Assinaturas","crown"],
 ["settings","Configurações","sliders-horizontal"],
 ["security","Segurança","shield-check"]
];
var shapes={
 "grid":'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 "trash":'<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/>',
 "menu":'<path d="M4 6h16M4 12h16M4 18h16"/>',
 "headset":'<path d="M3 13v-2a9 9 0 0 1 18 0v2M3 13h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H3zM21 13h-2a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2zM19 19v1a2 2 0 0 1-2 2h-4"/>',
 "activity":'<path d="M2 12h5l3-7 4 14 3-7h5"/>',
 "layout-dashboard":'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 "users":'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
 "flag":'<path d="M4 22V5a2 2 0 0 1 2-2h14l-3 6 3 6H4"/>',
 "heart-handshake":'<path d="M5 8l4-4 4 4 4-4 4 4v7l-8 6-8-6z"/><path d="m9 12 3 3 3-3"/>',
 "sliders-horizontal":'<path d="M4 7h9m4 0h3M4 17h3m4 0h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
 "shield-check":'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
 "refresh-cw":'<path d="M3 12a9 9 0 0 1 15.4-6.4L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.4 6.4L3 16M3 21v-5h5"/>',
 "external-link":'<path d="M15 3h6v6m0-6L10 14"/><path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/>',
 "search":'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
 "arrow-right":'<path d="M5 12h14m-7-7 7 7-7 7"/>',
 "log-out":'<path d="M10 17l5-5-5-5m5 5H3m9-9h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/>',
 "clock":'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
 "check-circle":'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
 "alert-circle":'<circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 4h.01"/>',
 "message-circle":'<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4 8.5 8.5 0 0 1 8.5-8.5A8.5 8.5 0 0 1 21 11.5z"/>',
 "zap":'<path d="m13 2-9 11h7l-1 9 10-12h-7z"/>',
 "ban":'<circle cx="12" cy="12" r="9"/><path d="m5.5 5.5 13 13"/>',
 "filter":'<path d="M4 6h16M7 12h10M10 18h4"/>',
 "chevron-left":'<path d="m15 18-6-6 6-6"/>',
 "chevron-right":'<path d="m9 18 6-6-6-6"/>',

 "crown":'<path d="m2 8 5 4 5-8 5 8 5-4-2 11H4z"/><path d="M4 22h16"/>',
 "credit-card":'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20"/>',
 "wallet":'<rect x="2" y="6" width="20" height="15" rx="3"/><path d="M2 10h20M17 15h2"/>',
 "star":'<path d="m12 2 3 6.7 7.3.8-5.4 4.9 1.5 7.1L12 18l-6.4 3.5 1.5-7.1-5.4-4.9 7.3-.8z"/>',
 "bell":'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
 "file-text":'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
 "database":'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 4 18 4 18 0V5M3 12c0 4 18 4 18 0"/>',
 "calendar-days":'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 14h2M14 14h2"/>',
 "video":'<rect x="2" y="5" width="14" height="14" rx="2"/><path d="m16 10 6-4v12l-6-4"/>',
 "eye":'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 "eye-off":'<path d="m3 3 18 18M10.6 5.1C17 4.2 22 12 22 12c-.9 1.8-2.4 3.5-4.1 4.8M6.3 6.4C3.9 8.2 2 12 2 12s4 7 10 7c1.8 0 3.4-.5 4.9-1.4"/>',
 "download":'<path d="M12 3v12m-4-4 4 4 4-4M3 17v4h18v-4"/>',
 "upload":'<path d="M12 16V4m-4 4 4-4 4 4M3 17v4h18v-4"/>',
 "check":'<path d="m4 12 5 5L20 6"/>',
 "x":'<path d="M18 6 6 18M6 6l12 12"/>',
 "menu":'<path d="M4 6h16M4 12h16M4 18h16"/>',
 "more-horizontal":'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
 "info":'<circle cx="12" cy="12" r="10"/><path d="M12 10v6m0-9h.01"/>',
 "circle-help":'<circle cx="12" cy="12" r="10"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 4h.01"/>',
 "settings":'<circle cx="12" cy="12" r="3"/><path d="M12 2v2m0 16v2M4 12H2m20 0h-2M4.9 4.9l1.5 1.5m11.2 11.2 1.5 1.5m0-14.2-1.5 1.5M6.4 17.6l-1.5 1.5"/>'
};
function ico(n,s){return '<svg viewBox="0 0 24 24" width="'+(s||19)+'" height="'+(s||19)+'" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(shapes[n]||shapes["circle-help"])+'</svg>';}
function e(x){return String(x===null||x===undefined?"":x).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function fmt(date){if(!date)return "—";var d=new Date(date);return isNaN(d)?"—":new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(d);}
function day(date){var d=new Date(String(date).slice(0,10)+"T12:00:00");return isNaN(d)?"—":new Intl.DateTimeFormat("pt-BR",{weekday:"short"}).format(d).replace(".","");}
function badge(text,kind){return '<span class="badge '+(kind||"")+'">'+e(text)+'</span>';}
function person(name,secondary,accent){var n=String(name||"Pessoa");return '<span class="person-avatar '+(accent?"coral":"")+'">'+e(n.slice(0,1).toUpperCase())+'</span><span class="person-details"><strong title="'+e(n)+'">'+e(n)+'</strong><small>'+e(secondary||"")+'</small></span>';}
function errorText(err){var s=String(err&&err.message||err||"Erro desconhecido");if(/invalid login credentials|invalid_credentials/i.test(s))return "E-mail ou senha incorretos.";if(/email not confirmed|email_not_confirmed/i.test(s))return "Confirme seu e-mail antes de entrar.";if(s.indexOf("42501")>=0||s.toLowerCase().indexOf("administrativo negado")>=0)return "Acesso negado pelo servidor. Esta conta não possui permissão administrativa.";return s;}
function toast(msg,bad){if(bad)window.connectSound?.play?.('error');clearTimeout(toastTimer);toastEl.removeAttribute('style');toastEl.className='cp-notice show'+(bad?' is-error':'');const symbol=document.createElement('span');symbol.className='cp-notice-icon';symbol.textContent=bad?'!':'✓';const message=document.createElement('span');message.className='cp-notice-text';message.textContent=String(msg);toastEl.replaceChildren(symbol,message);toastTimer=setTimeout(function(){toastEl.classList.remove('show');},3500);}
async function rpc(name,params){var r=await db.rpc(name,params||{});if(r.error)throw r.error;return r.data;}
function gate(locked){
 var message=locked?"Esta conta não tem acesso ao painel. Entre com o e-mail autorizado e confirmado.":"Entre com o e-mail e a senha do seu cadastro no CONNECT";
 app.innerHTML='<div class="gate"><div class="gate-copy"><div><a class="brand" style="padding:0" href="../?site=1"><span class="brand-mark"><img src="../connect-glass.svg?v=showcase-v17" alt="" /></span><span><span class="brand-text">CONNECT</span><br><span class="brand-sub">ADMINISTRAÇÃO</span></span></a></div>'
 +'<div class="gate-inner"><span class="gate-kicker">ACESSO RESTRITO · SUPABASE AUTH</span><h1>Seu Connect.<br><em>Seu comando.</em></h1><p>'+e(message)+'</p>'
 +'<form id="admin-login-form" class="admin-login-form"><label for="admin-email">E-mail</label><input id="admin-email" type="email" name="email" autocomplete="username" inputmode="email" maxlength="254" required placeholder="E-mail da conta cadastrada">'
 +'<label for="admin-password">Senha</label><div class="admin-password-wrap"><input id="admin-password" type="password" name="password" autocomplete="current-password" required placeholder="Sua senha"><button type="button" class="admin-password-toggle" data-admin-password-toggle aria-controls="admin-password" aria-label="Mostrar senha" aria-pressed="false">Mostrar</button></div>'
 +window.connectTurnstile.markup()+'<button class="btn-main coral" type="submit">'+ico("shield-check",19)+' Entrar no painel '+ico("arrow-right",19)+'</button></form>'
 +'<div class="admin-gate-actions"><a class="btn-outline" href="../?site=1">Ir para o site</a><a href="../?site=1" class="admin-gate-help">Precisa cadastrar ou recuperar a senha? Acesse o site.</a></div>'
 +(locked&&state.user?'<p style="font-size:11px;margin-top:18px">Sessão atual: '+e(state.user.email)+'</p>':'')
 +'</div><div class="gate-small">CONNECT · Painel privado · E-mail confirmado e autorizado no Supabase</div></div>'
 +'<div class="gate-art"><img class="cp-admin-emblem" src="../connect-glass.svg?v=showcase-v17" width="190" height="127" alt=""><h2>CONNECT / ADMIN</h2><p>Uma central. Toda a comunidade.</p></div></div>';
}
function navItem(s,compact){return '<button type="button" class="'+(compact?"":"rail-item ")+(state.view===s[0]?"active":"")+'" data-view="'+s[0]+'" aria-label="'+e(s[1])+'">'+ico(s[2],compact?19:19)+'<span>'+e(s[1])+'</span></button>';}
var mainMobileSections=["overview","modules","users","content"];
function adminMobileNav(){
 return '<nav class="bottom-nav admin-bottom-bar" aria-label="Navegação administrativa">'+
 sections.filter(function(s){return mainMobileSections.includes(s[0]);}).map(function(s){return navItem(s,true);}).join('')+
 '<button type="button" class="admin-more-button" data-action="admin-more" aria-expanded="'+Boolean(state.moreOpen)+'" aria-controls="adminMoreMenu">'+ico("menu",19)+'<span>Mais</span></button></nav>'+
 '<div class="admin-more-menu" id="adminMoreMenu" '+(state.moreOpen?'':'hidden')+' role="dialog" aria-label="Mais áreas do painel">'+
 '<div class="admin-more-header"><strong>Central de navegação</strong><button type="button" class="small-btn" data-action="admin-more">'+ico('x',16)+' Fechar</button></div>'+
 '<div class="admin-more-links">'+sections.filter(function(s){return !mainMobileSections.includes(s[0]);}).map(function(s){return navItem(s,true);}).join('')+'<button type="button" data-action="signout">'+ico("log-out",19)+'<span>Sair</span></button><a class="saas-mobile-open" href="../?site=1">'+ico("external-link",19)+'<span>Abrir aplicativo</span></a></div></div>';
}
function adminRail(){const groups=[['Comando',['overview','modules','monitor']],['Comunidade',['users','content','moments','pairs','reports','appeals']],['Relacionamento',['bulletins','support','premium']],['Sistema',['updates','settings','security']]];return groups.map(function(group){return '<div class="rail-group"><div class="rail-label">'+e(group[0])+'</div><div class="rail-links">'+sections.filter(function(x){return group[1].includes(x[0]);}).sort(function(a,b){return group[1].indexOf(a[0])-group[1].indexOf(b[0]);}).map(function(x){return navItem(x,false);}).join('')+'</div></div>';}).join('');}
function shell(){
 app.innerHTML='<div class="shell"><aside class="rail"><div class="brand"><span class="brand-mark"><img src="../connect-glass.svg?v=showcase-v17" alt="" /></span><div><div class="brand-text">CONNECT</div><div class="brand-sub">CENTRAL DE COMANDO</div></div></div>'+adminRail()+'<div class="rail-spacer"></div><div class="rail-bottom"><div class="admin-identity"><div class="admin-avatar">'+e((state.user&&state.user.email||"A")[0].toUpperCase())+'</div><div><strong>Administrador</strong><small>'+e(state.user&&state.user.email||"")+'</small></div></div><div class="rail-out"><button data-action="signout">'+ico("log-out",13)+' Sair</button></div></div></aside><main class="main"><header class="topbar"><div class="topbar-left"><div class="admin-top-brand"><img src="../connect-glass.svg?v=showcase-v17" alt="" width="35" height="23"></div><div class="admin-top-context"><small>CONNECT / ADMIN</small><strong id="topbar-location">'+e(viewTitle())+'</strong></div></div><div class="topbar-right">'+(window.entreTheme?.toggleMarkup?.()||'')+'<span class="topbar-live" title="Sessão administrativa autorizada"><span class="pulse"></span><span>Admin</span></span><button type="button" class="toolbar-btn admin-icon-action saas-command" data-action="command" title="Localizar ferramentas (Ctrl+K)" aria-label="Localizar ferramentas">'+ico("search",19)+'</button><button type="button" class="toolbar-btn admin-icon-action" data-action="refresh" title="Atualizar dados" aria-label="Atualizar dados">'+ico("refresh-cw",19)+'</button><a class="toolbar-btn admin-icon-action" href="../?site=1" title="Abrir aplicativo" aria-label="Abrir aplicativo">'+ico("external-link",19)+'</a><button type="button" class="toolbar-btn admin-icon-action admin-top-exit" data-action="signout" title="Sair" aria-label="Sair">'+ico("log-out",19)+'</button></div></header><div class="saas-sync" id="saas-sync" role="status"></div><div id="admin-view"></div></main>'+adminMobileNav()+'</div><div id="modal-root"></div>';
}
function viewTitle(){return (sections.find(function(s){return s[0]===state.view;})||sections[0])[1];}
function heading(k,title,desc){return '<div class="page-intro"><span class="eyebrow">'+e(k)+'</span><h1 class="page-title">'+title+'</h1><p>'+e(desc)+'</p></div>';}
function empty(title,desc){return '<div class="empty">'+ico("check-circle",32)+'<strong>'+e(title)+'</strong><span>'+e(desc)+'</span></div>';}
function stat(label,value,ic,small,style){return '<article class="stat '+(style||"")+'"><div class="stat-top"><span class="stat-icon">'+ico(ic,18)+'</span><span class="stat-label">'+e(label)+'</span></div><strong>'+e(Number(value||0).toLocaleString("pt-BR"))+'</strong><small>'+e(small)+'</small></article>';}

function releaseShortcut(active,title,description){
 return '<button type="button" class="release-entry release-entry--compact '+(active?'is-running':'')+'" data-view="updates" aria-label="Abrir controle do modo atualização">'
  +'<span class="release-entry-icon" aria-hidden="true">'+ico("refresh-cw",21)+'</span>'
  +'<span class="release-entry-copy"><strong>'+e(title)+'</strong><small>'+e(description)+'</small></span>'
  +'<span class="release-entry-chevron" aria-hidden="true">'+ico("chevron-right",18)+'</span></button>';
}

const moduleInfo={
 overview:["Visão geral","Indicadores, pendências e ações prioritárias.","Workspace"],
 moments:["Moments","Revisar vídeos de 24 horas e denúncias.","Comunidade"],
 content:["Conteúdo e moderação","Gerenciar posts, comentários, stories, salas, lives e encontros.","Comunidade"],
 monitor:["Monitoramento","Presença, encontros, feed, salas, lives e atividade.","Workspace"],
 modules:["Central de controle","Ative ou pause novos conteúdos e encontre ferramentas.","Workspace"],
 users:["Usuários","Pesquisar, suspender, reativar e excluir contas.","Comunidade"],
 pairs:["Encontros","Consultar sessões, matches e atividade de conexões.","Comunidade"],
 reports:["Denúncias","Revisar relatos de usuários e comentários denunciados.","Comunidade"],
 appeals:["Contestações","Analisar recursos e reativar contas.","Comunidade"],
 bulletins:["Avisos e enquetes","Publicar, acompanhar resultados e remover avisos.","Relacionamento"],
 support:["Suporte","Consultar protocolos, anexos autorizados e responder.","Relacionamento"],
 premium:["Assinaturas","Consultar acesso, liberar ou revogar Premium e ajustar preço.","Relacionamento"],
 updates:["Atualização","Ativar manutenção, editar mensagem e liberar o site.","Sistema"],
 settings:["Configurações","Controlar novas conexões, denúncias e aparência.","Sistema"],
 security:["Segurança e LGPD","Verificar acesso e tratar pedidos de privacidade.","Sistema"]
};
function metric(label,value,icon,note,view,tone="neutral"){
 return '<button type="button" class="saas-metric tone-'+tone+'" data-view="'+e(view)+'"><span class="saas-metric-top"><span>'+e(label)+'</span><i>'+ico(icon,17)+'</i></span><strong>'+e(value==null?'—':Number(value).toLocaleString("pt-BR"))+'</strong><span class="saas-metric-foot">'+e(note)+ico("chevron-right",13)+'</span></button>';
}
function moduleTile(s){
 const info=moduleInfo[s[0]];return '<button type="button" class="saas-module" data-view="'+s[0]+'"><span class="saas-module-icon">'+ico(s[2],19)+'</span><span><strong>'+e(info[0])+'</strong><small>'+e(info[1])+'</small></span>'+ico("chevron-right",16)+'</button>';
}
const contentKinds=[["posts","Publicações","file-text","Novos posts"],["comments","Comentários","message-circle","Novos comentários"],["stories","Stories","eye","Novos stories"],["rooms","Salas","users","Novas mensagens em salas"],["lives","Lives","video","Novas transmissões"],["encounters","Ao vivo","heart-handshake","Encontros temporários"]];
function platformSwitches(){
 const flags=state.platformControls;
 return '<section class="cc-control-board"><div class="cc-section-head"><div><span class="saas-kicker">CONTROLE DE DISPONIBILIDADE</span><h2>Recursos do aplicativo</h2><p>Pause novas interações sem apagar conteúdo ou alterar o código.</p></div>'+ico("sliders-horizontal",22)+'</div><div class="cc-control-grid">'+contentKinds.filter(k=>k[0]!=="encounters").map(([key,label,icon,desc])=>{
 const v=flags?.[key];return '<article class="cc-control-tile"><span class="cc-control-icon">'+ico(icon,21)+'</span><div><strong>'+e(label)+'</strong><small>'+e(desc)+'</small></div><button type="button" class="cc-toggle '+(v===true?'on':'')+'" role="switch" aria-checked="'+String(v===true)+'" aria-label="'+e((v===true?'Pausar ':'Liberar ')+label)+'" data-action="platform-toggle" data-kind="'+key+'" '+(typeof v!=='boolean'?'disabled':'')+'><span></span></button><small class="cc-control-state">'+(v===true?'Liberado':v===false?'Pausado':'Não consultado')+'</small></article>';
 }).join("")+'</div><div class="cc-control-footer">'+healthItem("Novas buscas no Ao vivo",state.settings?.matchmaking_enabled,"settings")+healthItem("Denúncias",state.settings?.reporting_enabled,"settings")+healthItem("Aplicativo disponível",typeof state.settings?.maintenance_enabled==="boolean"?!state.settings.maintenance_enabled:null,"updates")+'</div></section>';
}
function moduleDirectory(){
 return heading("COMANDO / DISPONIBILIDADE","Controle da plataforma","Gerencie recursos, disponibilidade e operações administrativas.")+platformSwitches()+
 ['Workspace','Comunidade','Relacionamento','Sistema'].map(group=>'<section class="saas-directory"><h2>'+e(group==="Workspace"?"Comando":group)+'</h2><div class="saas-module-grid">'+sections.filter(s=>s[0]!=="modules"&&moduleInfo[s[0]][2]===group).map(moduleTile).join("")+'</div></section>').join("")+
 '<div class="saas-inline-note">'+ico("shield-check",17)+' Os controles são validados no servidor. Pausar conteúdo impede novos envios; não encerra transmissões existentes nem apaga históricos.</div>';
}
function contentPage(){
 const kind=state.contentKind,entry=contentKinds.find(k=>k[0]===kind)||contentKinds[0],items=state.contentData?.rows?.slice(0,25)||[],ending=["lives","encounters"].includes(kind);
 return heading("COMUNIDADE / MODERAÇÃO","Conteúdo","Administre conteúdo público e sessões ativas. Conversas privadas não são acessíveis.")+
 '<section class="data-panel cc-content-panel"><div class="data-tools"><div><h3>'+e(entry[1])+'</h3><small>Até 25 registros por página · ordem recente</small></div><button type="button" class="small-btn" data-view="modules">'+ico("sliders-horizontal",15)+' Controles</button></div>'+
 '<div class="cc-segmented" role="group" aria-label="Tipo de conteúdo">'+contentKinds.map(([key,label,ic])=>'<button type="button" class="'+(key===kind?'is-active':'')+'" data-action="content-kind" data-kind="'+key+'" aria-pressed="'+String(key===kind)+'">'+ico(ic,15)+' '+e(label)+'</button>').join("")+'</div>'+
 (!state.contentData?empty("Conteúdo indisponível","Atualize os dados para tentar novamente."):items.length?items.map(row=>'<article class="cc-content-row"><div class="cc-content-icon">'+ico(entry[2],20)+'</div><div class="cc-content-copy"><strong>'+e(row.author)+'</strong><small>'+e(fmt(row.created_at))+(row.detail?' · '+e(row.detail):'')+'</small><p>'+e(row.body||"Conteúdo de mídia")+'</p>'+(row.media_path?'<button type="button" class="small-btn cc-preview" data-action="content-preview" data-id="'+e(row.id)+'">'+ico("eye",15)+' Ver mídia</button>':'')+(row.protected?'<small class="cc-evidence">Denúncia vinculada · evidência preservada</small>':'')+'</div><button type="button" class="small-btn cc-danger-action" data-action="content-moderate" data-id="'+e(row.id)+'" '+(row.protected?'disabled':'')+'>'+ico(ending?"x":"trash",15)+' '+(ending?"Encerrar":"Excluir")+'</button></article>').join(""):empty("Nenhum registro","Não há conteúdo nesta página."))+
 '<div class="table-footer"><span>Página '+(state.contentPage+1)+'</span><div class="cc-pager"><button type="button" class="small-btn" data-action="content-prev" '+(state.contentPage===0?'disabled':'')+'>'+ico("chevron-left",13)+' Anterior</button><button type="button" class="small-btn" data-action="content-next" '+(!state.contentData?.has_more?'disabled':'')+'>Próxima '+ico("chevron-right",13)+'</button></div></div></section>';
}
function healthItem(label,active,view){return '<button type="button" class="saas-health-row" data-view="'+view+'"><span>'+e(label)+'</span><span class="saas-status '+(active===true?'is-ok':active===false?'is-warn':'')+'"><i></i>'+ (active===true?'Ativo':active===false?'Pausado':'Indisponível')+'</span>'+ico("chevron-right",14)+'</button>';}
function overview(){
 const x=state.overview||{},s=x.settings||{},m=state.community||{},trend=Array.isArray(x.signup_trend)?x.signup_trend:[],max=Math.max(1,...trend.map(v=>Number(v.count||0)));
 const total=trend.length?trend.reduce((sum,v)=>sum+Number(v.count||0),0):null;
 const chart=trend.length?trend.map(v=>{const n=Number(v.count||0);return '<div class="cc-chart-col"><div class="cc-chart-value">'+e(n)+'</div><div class="cc-chart-track"><span style="height:'+Math.max(2,n/max*100)+'%"></span></div><small>'+e(day(v.day))+'</small></div>';}).join(""):'<p class="saas-empty">Histórico indisponível.</p>';
 const live=s.maintenance_enabled===false,known=typeof s.maintenance_enabled==="boolean",pending=state.overview&&Array.isArray(state.appeals)?state.appeals.filter(a=>a.status==="pending").length:null;
 const task=(label,value,icon,view)=>'<button type="button" class="cc-task" data-view="'+view+'"><span class="cc-task-icon">'+ico(icon,18)+'</span><span>'+e(label)+'</span><strong>'+e(value==null?"—":Number(value).toLocaleString("pt-BR"))+'</strong>'+ico("chevron-right",14)+'</button>';
 return '<section class="cc-welcome"><div><span class="saas-kicker">CENTRAL DE COMANDO / 01</span><h1>Visão geral<span>.</span></h1><p>Controle da comunidade, em um só lugar.</p></div><button type="button" class="small-btn cc-all-tools" data-view="modules">'+ico("grid",16)+' Controles</button></section>'+
 '<section class="cc-hero"><div class="cc-hero-art" aria-hidden="true"><span class="cc-orbit orbit-one"></span><span class="cc-orbit orbit-two"></span><span class="cc-orbit orbit-three"></span><img src="../connect-glass.svg?v=showcase-v17" alt=""></div><div class="cc-hero-copy"><span class="cc-live-label '+(known&&!live?'paused':'')+'"><i></i>'+(known?(live?'PLATAFORMA DISPONÍVEL':'EM MANUTENÇÃO'):'STATUS NÃO CONSULTADO')+'</span><h2>Você no<br>comando.</h2><p>Gerencie o Connect sem sair do painel.</p><button type="button" class="cc-hero-button" data-view="modules">Central de controle '+ico("arrow-right",17)+'</button></div><div class="cc-hero-tag">CONNECT <span> / ADMIN</span></div></section>'+
 '<div class="cc-metric-strip">'+metric("Perfis",x.profiles,"users","Contas com perfil","users","blue")+metric("Online",m.online_visible,"activity","Visíveis · 5 min","monitor","green")+metric("Ao vivo",x.active_pairs,"heart-handshake","Encontros ativos","pairs","violet")+metric("Premium",m.manual_premium_active,"crown","Assinaturas ativas","premium","amber")+'</div>'+
 '<div class="cc-overview-grid"><section class="cc-growth"><div class="cc-section-head"><div><span class="saas-kicker">CRESCIMENTO</span><h2>Novos cadastros</h2><p>Últimos 7 dias · Auth</p></div><button type="button" class="small-btn" data-view="monitor">'+ico("arrow-right",16)+'</button></div><div class="cc-growth-total"><strong>'+e(total==null?"—":total.toLocaleString("pt-BR"))+'</strong><span>contas criadas</span></div><div class="cc-chart">'+chart+'</div></section><section class="cc-inbox"><div class="cc-section-head"><div><span class="saas-kicker">PENDÊNCIAS</span><h2>Central de trabalho</h2><p>O que precisa da sua atenção.</p></div>'+ico("bell",22)+'</div>'+task("Denúncias",x.reports_open,"flag","reports")+task("Comentários",m.comment_reports_open,"message-circle","reports")+task("Contestações",pending,"alert-circle","appeals")+task("Suporte",m.support_open,"headset","support")+'</section></div>'+
 '<section class="cc-command-deck"><div class="cc-section-head"><div><span class="saas-kicker">OPERAÇÕES</span><h2>O que você quer gerenciar?</h2></div></div><div class="cc-command-grid">'+["users","content","moments","bulletins","premium","updates","security"].map(id=>moduleTile(sections.find(s=>s[0]===id))).join("")+'</div></section>'+
 '<section class="cc-status-board"><div class="cc-section-head"><div><span class="saas-kicker">SISTEMA</span><h2>Estado operacional</h2></div></div>'+healthItem("Novas conexões",s.matchmaking_enabled,"settings")+healthItem("Recebimento de denúncias",s.reporting_enabled,"settings")+healthItem("Disponibilidade",known?live:null,"updates")+'</section>';
}
function monitor(){
 const x=state.overview||{},m=state.community||{};
 return heading("WORKSPACE / ATIVIDADE","Monitoramento","Indicadores agregados de utilização, sem acesso ao conteúdo de conversas privadas.")+
 (state.communityUnavailable?'<div class="saas-inline-note">'+ico("alert-circle",18)+' Alguns indicadores não puderam ser consultados. Use Atualizar para tentar novamente.</div>':'')+
 '<section class="saas-directory"><h2>Conexões e presença</h2><div class="saas-metrics">'+metric("Online visíveis",m.online_visible,"activity","Presença em 5 minutos","monitor","green")+metric("Perfis concluídos",x.profiles,"users","Perfis do CONNECT","users")+metric("Encontros ativos",x.active_pairs,"heart-handshake","Sessões em andamento","pairs")+metric("Fila de busca",x.waiting,"clock","Presença na fila em 30 s","pairs")+metric("Conexões permanentes",x.connected_pairs,"check-circle","Matches existentes","pairs")+metric("Mensagens privadas",x.messages_24h,"message-circle","Últimas 24 horas","monitor")+'</div></section>'+
 '<section class="saas-directory"><h2>Publicações e salas</h2><div class="saas-metrics">'+metric("Publicações",m.posts_total,"file-text","Total atual no feed","monitor")+metric("Novas publicações",m.posts_24h,"file-text","Últimas 24 horas","monitor")+metric("Comentários",m.comments_24h,"message-circle","Últimas 24 horas","monitor")+metric("Salas com atividade",m.rooms_24h,"users","Últimas 24 horas","monitor")+metric("Mensagens em salas",m.room_messages_24h,"message-circle","Últimas 24 horas · não excluídas","monitor")+'</div></section>'+
 '<section class="saas-directory"><h2>Transmissões e assinaturas</h2><div class="saas-metrics">'+metric("Lives ativas",m.lives_active,"video","Transmissões não expiradas","monitor","violet")+metric("Lives iniciadas",m.lives_24h,"video","Últimas 24 horas","monitor")+metric("Premium manual",m.manual_premium_active,"crown","Acessos manuais ativos","premium")+'</div></section><div class="saas-inline-note">'+ico("info",17)+' Os números são consultados no Supabase. Nenhuma atividade ou receita é simulada. Os cartões de monitoramento exibem dados agregados.</div>';
}
function openCommand(){
 if(!state.verified||state.modal)return;
 state.modal={type:"command"};
 modal('<div class="saas-command-dialog"><h2>Localizar ferramenta</h2><p>Pesquise pelo nome ou pela função desejada.</p><div class="field"><label for="admin-module-search">Ferramenta</label><input id="admin-module-search" placeholder="Ex.: usuários, manutenção, Premium…" autocomplete="off"></div><div class="saas-command-results">'+sections.map(s=>moduleTile(s)).join("")+'</div><div class="modal-actions"><button class="btn-outline" type="button" data-action="close-modal">Fechar</button></div></div>');
}
function users(){
 var arr=state.loading?[]:state.users.rows||[],total=state.users.total||0;
 return heading("GERENCIAMENTO","Usuários","Pesquise usuários cadastrados e controle suspensão ou exclusão definitiva.")+
 '<section class="data-panel"><div class="data-tools"><div><h3>Contas cadastradas</h3><small>'+e(total)+' registro(s)</small></div><label class="search-box">'+ico("search",17)+'<input id="user-search" placeholder="Nome, @usuário ou e-mail…" aria-label="Pesquisar usuários" autocomplete="off" maxlength="120" value="'+e(state.search)+'"></label></div>'+
 (state.loading?'<p class="plan-empty" role="status">Consultando usuários…</p>':arr.length?arr.map(function(u){return '<div class="list-row"><div class="list-main">'+person(u.display_name||u.email,(u.username?"@"+u.username+" · ":"")+(u.email||""),u.admin)+'</div><div class="row-meta">'+fmt(u.created_at)+'</div>'+badge(u.admin?"ADMIN":u.banned?"SUSPENSO":"ATIVO",u.banned?"warn":u.admin?"":"neutral")+'<div class="admin-user-plan">'+window.entreAdminExtras.planBadge(u.plan_status,e,ico)+(u.plan_manageable?'<button type="button" class="small-btn" data-action="plan-manage" data-id="'+e(u.id)+'">Gerenciar plano</button>':'')+'</div><div class="admin-user-actions"><button class="small-btn '+(u.banned?"":"danger")+'" data-action="edit-user" data-id="'+e(u.id)+'">'+(u.admin?"Detalhes":u.banned?"Reativar":"Suspender")+'</button>'+(!u.admin?'<button type="button" class="small-btn user-delete-action" data-action="delete-user" data-id="'+e(u.id)+'">Excluir conta</button>':'')+'</div></div>';}).join(""):empty("Nenhuma conta encontrada","Ajuste os termos de busca ou aguarde novos cadastros."))+
 '<div class="table-footer"><span>Página '+(state.userPage+1)+' · '+e(total)+' usuário(s)</span><div style="display:flex;gap:8px"><button class="small-btn" data-action="prev-users" '+(state.userPage<=0?"disabled":"")+'>'+ico("chevron-left",13)+' Anterior</button><button class="small-btn" data-action="next-users" '+((state.userPage+1)*perPage>=total?"disabled":"")+'>Próxima '+ico("chevron-right",13)+'</button></div></div></section>';
}
var reasonNames={harassment:"Assédio / comportamento abusivo",hate:"Discurso de ódio",spam:"Spam / golpes",underage:"Suspeita de menor de idade",fake:"Perfil falso",other:"Outro motivo"};
function retentionControl(area,row){
 if(typeof row.retention_hold!=='boolean')return '';
 return '<button type="button" class="small-btn" data-action="case-hold" data-area="'+e(area)+'" data-id="'+e(row.id)+'" data-hold="'+(row.retention_hold?'0':'1')+'" aria-pressed="'+String(row.retention_hold)+'">'+(row.retention_hold?'Liberar limpeza':'Preservar registro')+'</button>';
}
function commentReportsPanel(){
 var rows=state.commentReports||[];
 return '<section class="data-panel comment-reports-admin"><div class="data-tools"><div><h3>Denúncias de comentários</h3><small>Comentários denunciados · resolvidos: 90 dias, salvo preservação</small></div>'+badge(rows.filter(function(r){return r.status==='open';}).length+' pendentes','neutral')+'</div>'+
 (rows.length?rows.map(function(r){return '<article class="admin-comment-report"><div><strong>Comentário #'+e(r.comment_id)+' · '+e(r.reported_name)+'</strong><small>Denunciado por '+e(r.reporter_name)+' · '+fmt(r.created_at)+' · '+e(r.reason)+'</small><p>'+e(r.comment_body||'Comentário removido')+'</p>'+(r.details?'<p>Relato: '+e(r.details)+'</p>':'')+'</div><div class="admin-report-actions">'+badge(r.status==='open'?'PENDENTE':r.status==='reviewed'?'ANALISADO':'DESCARTADO',r.status==='open'?'warn':'neutral')+(r.status==='open'?'<button type="button" class="small-btn" data-action="commentReview" data-id="'+e(r.id)+'">Analisado</button><button type="button" class="small-btn" data-action="commentDismiss" data-id="'+e(r.id)+'">Descartar</button>':'')+retentionControl('comment_reports',r)+'</div></article>';}).join(''):
 '<div class="social-empty">Nenhuma denúncia de comentários registrada.</div>')+'</section>';
}
function reports(){
 var arr=state.reports||[];
 var filters=[["open","Pendentes"],["reviewed","Analisadas"],["dismissed","Descartadas"],["all","Todas"]];
 return heading("MODERAÇÃO","Moderação","Denúncias enviadas por participantes reais. Mensagens privadas não são exibidas aqui.")+
 '<section class="data-panel"><div class="data-tools"><div><h3>Central de denúncias</h3><small>Resolvidas: 90 dias após a análise, salvo preservação</small></div><div class="filter-row">'+filters.map(function(f){return '<button class="chip '+(state.reportStatus===f[0]?"active":"")+'" data-report-status="'+f[0]+'">'+e(f[1])+'</button>';}).join("")+'</div></div>'+
 (arr.length?arr.map(function(r){return '<div class="list-row"><div class="list-main">'+person(r.reported_name,reasonNames[r.reason]||r.reason,true)+'</div><div class="row-meta">'+fmt(r.created_at)+'</div>'+badge(r.status==="open"?"PENDENTE":r.status==="reviewed"?"ANALISADA":"DESCARTADA",r.status==="open"?"warn":"neutral")+'<button class="small-btn" data-action="review" data-id="'+e(r.id)+'">Analisar '+ico("chevron-right",13)+'</button>'+retentionControl('reports',r)+'</div>';}).join(""):empty("Nenhuma denúncia aqui","Quando houver denúncias, elas aparecerão nesta seção."))+'</section>'+commentReportsPanel();
}
function pairs(){
 var arr=state.pairs||[];
 return heading("ENCONTROS · 1 A 1","Encontros e matches","Acompanhe sessões e matches sem acessar o conteúdo das mensagens privadas.")+
 '<section class="data-panel"><div class="data-tools"><div><h3>Conexões recentes</h3><small>Últimos 60 encontros · dados de sessão</small></div>'+badge(arr.length+" exibidos","neutral")+'</div>'+
 (arr.length?arr.map(function(p){return '<div class="list-row"><div class="list-main">'+person(p.person_a,"com "+p.person_b,false)+'</div><div class="row-meta">'+fmt(p.created_at)+'</div>'+badge(p.status==="connected"?"MATCH":p.status==="active"?"EM CONVERSA":"ENCERRADA",p.status==="connected"?"":p.status==="active"?"warn":"neutral")+'</div>';}).join(""):empty("Sem encontros ainda","Quando as pessoas se conectarem, os encontros aparecem aqui."))+'</section>';
}
function settings(){
 var x=state.settings||{matchmaking_enabled:true,reporting_enabled:true,announcement:""};
 return heading("CONFIGURAÇÕES","Configurações da plataforma","Essas alterações são salvas no Supabase e aplicadas pelo servidor.")+
 (window.entreTheme?.renderControls?.()||'')+
 releaseShortcut(Boolean(x.maintenance_enabled),"Atualizações do site","Ative a tela de manutenção ou libere a nova versão.")+'<form id="settings-form" class="form-card"><h2 class="section-heading">Experiência e segurança</h2><p class="section-desc">Controle operacional da plataforma. Novas regras são aplicadas sem publicar outra versão do site.</p>'+
 '<div class="setting-item"><div><strong>Permitir novas conexões</strong><small>Se desativado, a busca por novas pessoas será pausada no servidor.</small></div><label class="switch"><input type="checkbox" name="matchmaking" '+(x.matchmaking_enabled?"checked":"")+'><span></span></label></div>'+
 '<div class="setting-item"><div><strong>Aceitar denúncias</strong><small>Habilita o formulário de denúncia entre participantes de conversas.</small></div><label class="switch"><input type="checkbox" name="reporting" '+(x.reporting_enabled?"checked":"")+'><span></span></label></div>'+
 '<div class="setting-item" style="display:block"><strong>Comunicação oficial</strong><p class="section-desc">Avisos com respostas e enquetes opcionais, publicados por 24 horas.</p><button type="button" class="btn-main coral" data-view="bulletins">Abrir avisos e enquetes</button></div>'+
 '<div class="setting-actions"><button type="submit" class="btn-main" '+(state.busy?"disabled":"")+'>'+ico("check-circle",17)+' Salvar configurações</button></div></form>';
}

function maintenancePage(){
 var s=state.settings||{},active=Boolean(s.maintenance_enabled);
 return heading("CONTROLE DE LANÇAMENTOS","Atualizações do site","Você decide quando mostrar a tela de atualização e quando liberar a nova versão para os usuários.")+
 '<section class="release-hero '+(active?"is-active":"")+'"><div class="release-hero-copy"><span class="release-status">✳ '+(active?"ATUALIZAÇÃO EM ANDAMENTO":"SITE DISPONÍVEL")+'</span><h2>'+(active?"Atualização em andamento":"Site disponível")+'</h2><p>'+(active?"Visitantes estão vendo a tela especial. Você continua com acesso ao painel.":"Ative o modo de atualização antes de publicar mudanças. Ao finalizar, o site volta automaticamente.")+'</p><div class="release-actions"><button type="button" class="btn-main coral" data-action="toggle-maintenance">'+ico(active?"check-circle":"refresh-cw",17)+" "+(active?"Finalizar atualização e liberar site":"Ativar modo atualização")+'</button><a href="'+(active?'../':'../?maintenance_preview=1')+'" class="btn-outline" target="_blank" rel="noopener">'+ico("external-link",15)+' Visualizar tela</a></div></div><div class="release-art" aria-hidden="true"><div class="release-halo"></div><div class="release-time"><small>CONNECT / ATUALIZANDO</small><strong>05<span>:</span>00</strong><small>UM NOVO COMEÇO ESTÁ CHEGANDO</small></div></div></section>'
 +'<div class="release-grid"><form id="release-form" class="form-card"><h2 class="section-heading">Mensagem da atualização</h2><p class="section-desc">Personalize o texto exibido aos visitantes. Salvar o texto não muda o estado do site.</p><div class="field"><label class="form-label" for="release-title">Título principal</label><input id="release-title" type="text" name="title" class="form-input" minlength="3" maxlength="90" required value="'+e(s.maintenance_title||"Tem coisa boa chegando.")+'"></div><div class="field"><label class="form-label" for="release-message">Mensagem aos visitantes</label><textarea id="release-message" name="message" class="form-textarea" minlength="6" maxlength="320" required>'+e(s.maintenance_message||"Estamos preparando uma nova versão do CONNECT")+'</textarea><small class="form-hint">Será atualizada na tela de manutenção durante a próxima verificação.</small></div><div class="setting-actions"><button type="submit" class="btn-main">'+ico("check-circle",17)+' Salvar mensagem</button></div></form>'
 +'<aside class="release-guide"><h3>Seu fluxo de atualização</h3><p><strong>01 · Ativar</strong><br>Exiba a tela de atualização e pause novas interações.</p><p><strong>02 · Publicar</strong><br>Atualize o código no GitHub Pages e confira a publicação.</p><p><strong>03 · Liberar</strong><br>Desative o modo para voltar automaticamente ao site já publicado.</p><div class="release-guide-note">'+ico("shield-check",18)+' Seu painel permanece acessível durante o processo.</div></aside></div>';
}
async function saveRelease(enabled,onlyText){
 if(state.busy)return;
 var form=document.getElementById("release-form"),s=state.settings||{};
 var title=form&&form.elements.title.value.trim()||s.maintenance_title||"Tem coisa boa chegando.";
 var message=form&&form.elements.message.value.trim()||s.maintenance_message||"Estamos preparando uma nova versão do CONNECT";
 if(title.length<3||title.length>90||message.length<6||message.length>320){toast("Confira o título e a mensagem.",true);return;}
 if(!onlyText){
  var msg=enabled?"Ativar a tela de atualização agora? Novas interações serão pausadas.":"A nova versão já foi publicada no GitHub? A tela sairá quando você confirmar e todos serão redirecionados para o site.";
  if(!window.confirm(msg))return;
 }
 state.busy=true;
 try{
  var result=await rpc("entre_admin_set_maintenance",{_enabled:enabled,_title:title,_message:message});
  state.settings=result;if(state.overview)state.overview.settings=result;
  toast(onlyText?"Texto salvo!":enabled?"Modo atualização ativado!":"Atualização finalizada. Site liberado!");
  await load("updates");
 }catch(err){toast(errorText(err),true);}finally{state.busy=false;}
}

function appealsPanel(){
 var arr=state.appeals||[];
 return '<section class="form-card admin-appeals"><h2 class="section-heading">Contestações de suspensão</h2><p class="section-desc">Aprovar reativa a conta. Contestações concluídas: 90 dias, salvo preservação.</p>'+
 (arr.length?arr.map(function(a){
  return '<article class="appeal-row"><div><strong>'+e(a.display_name||a.email||'Conta')+'</strong><small>'+e(a.email||'')+' · '+fmt(a.created_at)+'</small><p>'+e(a.message)+'</p>'+badge(a.status==='pending'?'PENDENTE':a.status==='reviewed'?'APROVADA':'REJEITADA',a.status==='pending'?'warn':'neutral')+'</div>'+
  (a.status==='pending'?'<div class="appeal-buttons"><button class="btn-main" data-action="review-appeal" data-id="'+e(a.id)+'">Aprovar e reativar</button><button class="btn-outline" data-action="reject-appeal" data-id="'+e(a.id)+'">Não aprovar</button></div>':'')+'<div class="appeal-buttons">'+retentionControl('appeals',a)+'</div></article>';
 }).join(''):'<p class="section-desc">Nenhuma contestação recebida.</p>')+'</section>';
}
function privacyRequestsPanel(){
 var rows=state.privacyRequests||[];
 return '<section class="form-card admin-appeals"><h2 class="section-heading">Pedidos de privacidade · LGPD</h2><p class="section-desc">Analise antes de concluir. Pedidos concluídos: 365 dias, salvo preservação.</p>'+
 (rows.length?rows.map(function(r){return '<article class="appeal-row"><div><strong>'+e(r.email||'Conta')+'</strong><small>'+e(r.request_type)+' · '+fmt(r.created_at)+'</small><p>'+e(r.description||'Sem descrição adicional.')+'</p>'+badge(r.status==='pending'?'PENDENTE':r.status==='handled'?'ATENDIDA':'NÃO ATENDIDA',r.status==='pending'?'warn':'neutral')+'</div>'+
 (r.status==='pending'?'<div class="appeal-buttons"><button class="btn-main" data-action="privacy-handled" data-id="'+e(r.id)+'">Marcar atendida</button><button class="btn-outline" data-action="privacy-denied" data-id="'+e(r.id)+'">Não atendida</button></div>':'')+'<div class="appeal-buttons">'+retentionControl('privacy',r)+'</div></article>';}).join(''):'<p class="section-desc">Nenhum pedido recebido.</p>')+'</section>';
}
function security(){
 return heading("ACESSO E PRIVACIDADE","Segurança e privacidade","O acesso administrativo é verificado no servidor. Seu navegador nunca recebe a chave secreta do Supabase.")+
 '<section class="form-card"><h2 class="section-heading">Administrador principal</h2><p class="section-desc">Conta reconhecida pela identidade E-mail e pela lista de autorização do banco.</p><div class="security-card"><span class="admin-avatar">'+e((state.user.email||"A").slice(0,1).toUpperCase())+'</span><div style="flex:1"><strong>'+e(state.user.email)+'</strong><small>E-mail confirmado · administrador autorizado</small></div>'+badge("ACESSO ATIVO")+'</div>'+
 '<div class="security-note"><b>Proteção em camadas.</b> Todas as operações de usuários, denúncias, suspensões e configurações são executadas por funções SQL com verificação administrativa. O controle não depende de esconder botões ou comparar e-mails no JavaScript.</div><div class="health-row"><strong>Autenticação</strong>'+badge("Supabase Auth")+'</div><div class="health-row"><strong>Banco de dados</strong>'+badge("Supabase + RLS")+'</div><div class="health-row"><strong>Conteúdo de conversas</strong>'+badge("Não acessível aqui","neutral")+'</div><div class="health-row"><strong>Endereço do painel</strong><span style="overflow-wrap:anywhere;font-size:11px">/testesite/admin/</span></div></section>'+privacyRequestsPanel();
}
function spinner(){return '<div class="loading-panel"><div class="loading-indicator"></div>Atualizando dados…</div>';}
function renderView(){
 var target=document.getElementById("admin-view");if(!target)return;
 document.querySelectorAll("[data-view]").forEach(function(el){el.classList.toggle("active",el.getAttribute("data-view")===state.view);});
 var loc=document.getElementById("topbar-location");if(loc)loc.textContent=viewTitle();
 var menu=document.getElementById("adminMoreMenu");if(menu)menu.hidden=!state.moreOpen;var toggle=document.querySelector(".admin-more-button");if(toggle)toggle.setAttribute("aria-expanded",String(state.moreOpen));
 var sync=document.getElementById("saas-sync");if(sync)sync.textContent=state.loading?"Sincronizando…":state.loadError?"Falha na atualização · dados anteriores podem estar desatualizados":state.refreshAt?"Sincronizado às "+state.refreshAt.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}):"Aguardando sincronização";
 const focus=document.activeElement,keepFocus=focus&&["plan-search","user-search"].includes(focus.id)&&target.contains(focus),focusId=keepFocus?focus.id:null,selection=keepFocus?[focus.selectionStart,focus.selectionEnd]:null;
 const errorBanner=state.loadError&&!state.loading?'<div class="cc-load-error" role="alert"><strong>Não foi possível atualizar todos os dados.</strong><span>'+e(state.loadError)+'</span><button type="button" class="small-btn" data-action="refresh">Tentar novamente</button></div>':"";
 target.innerHTML=errorBanner+(state.loading&&!["premium","users"].includes(state.view)?spinner():(state.view==="overview"?overview():state.view==="monitor"?monitor()+window.connectAdminMoments.metrics(state.productMetrics,e)+window.entreAdminExtras.observability(state.observability,e,fmt):state.view==="modules"?moduleDirectory():state.view==="content"?contentPage():state.view==="moments"?window.connectAdminMoments.view(state.momentsData,e,fmt):state.view==="updates"?maintenancePage():state.view==="users"?users():state.view==="reports"?reports():state.view==="appeals"?heading("RECURSOS E MODERAÇÃO","Contestações de suspensão","Confira as solicitações e analise cada recurso.")+appealsPanel():state.view==="pairs"?pairs():state.view==="bulletins"?heading("COMUNICAÇÃO OFICIAL","Avisos e enquetes","Gerencie suas publicações por 24 horas.")+window.entreAdminBulletins.page(state.bulletins,{escape:e,format:fmt,badge,icon:ico}):state.view==="support"?heading("ATENDIMENTO","Central de suporte","Protocolos recebidos dos usuários.")+window.entreAdminExtras.supportPage(state.supportTickets,e,fmt,ico,badge):state.view==="premium"?heading("ASSINATURAS","Planos e assinaturas","Acompanhe os planos de todos os perfis do Connect e gerencie os benefícios Premium.")+window.entreAdminExtras.premiumPage(state.premiumConfig,e,ico,state.planDirectory,state.planSearch,state.planFilter,state.planPage,perPage,fmt,person,state.loading):state.view==="settings"?settings():security()));
 if(state.view==="moments"&&!state.loading)window.connectAdminMoments.bind({db,rpc,toast,refresh:()=>load("moments")});
 if(focusId){const next=document.getElementById(focusId);if(next){next.focus({preventScroll:true});try{next.setSelectionRange(...selection);}catch(_){}}}
}
let adminLoadEpoch=0;
async function load(view,background=false){
 if(!state.verified||state.view!==view)return;
 const epoch=++adminLoadEpoch,owner=state.user?.id;const patch={};
 const requestQuery=view==="premium"?state.planSearch:view==="users"?state.search:null,requestFilter=state.planFilter,requestPage=view==="premium"?state.planPage:state.userPage;
 const valid=()=>epoch===adminLoadEpoch&&state.user?.id===owner&&state.verified&&state.view===view&&(view!=="premium"||(state.planSearch===requestQuery&&state.planFilter===requestFilter&&state.planPage===requestPage))&&(view!=="users"||(state.search===requestQuery&&state.userPage===requestPage));
 let partialError=null;
 if(!background){state.loading=true;state.loadError=null;renderView();}
 try{
  if(view==="overview"||view==="monitor"||view==="settings"||view==="updates"||view==="modules"){
   patch.overview=await rpc("entre_admin_overview");if(!valid())return;patch.settings=patch.overview?.settings||state.settings;
   if(view==="overview")patch.appeals=await rpc("entre_admin_appeals");
   if(view==="overview"||view==="monitor"){try{patch.community=await rpc("connect_admin_community_metrics");patch.communityUnavailable=false;}catch(_){patch.community=null;patch.communityUnavailable=true;}}
  }
  if(!valid())return;
  if(view==="monitor"){try{patch.productMetrics=await rpc("connect_admin_product_metrics");}catch(_){patch.productMetrics=null;}try{patch.observability=await rpc("connect_admin_observability");}catch(_){patch.observability=null;}}
  if(view==="modules"){patch.platformControls=await rpc("connect_admin_platform_controls");}
  if(view==="moments"){patch.momentsData=await rpc("connect_admin_moments");}
   if(view==="content"){patch.contentData=await rpc("connect_admin_content_page",{_kind:state.contentKind,_limit:25,_offset:state.contentPage*25});}
  if(view==="users")patch.users=await rpc("entre_admin_users",{_query:state.search,_limit:perPage,_offset:state.userPage*perPage});
  if(view==="appeals")patch.appeals=await rpc("entre_admin_appeals");
  if(view==="reports"){const results=await Promise.all([rpc("entre_admin_reports",{_status:state.reportStatus,_limit:100}),rpc('entre_admin_comment_reports')]);patch.reports=results[0];patch.commentReports=results[1]||[];}
  if(view==="pairs")patch.pairs=await rpc("entre_admin_pairs",{_limit:60});
  if(view==="bulletins")patch.bulletins=await rpc("entre_admin_bulletins");
  if(view==="support")patch.supportTickets=await rpc("entre_admin_support_tickets");
  if(view==="premium"){const results=await Promise.allSettled([rpc("entre_admin_premium_settings"),rpc("connect_admin_plan_page",{_query:requestQuery,_plan:requestFilter,_limit:perPage,_offset:requestPage*perPage})]);patch.premiumConfig=results[0].status==="fulfilled"?results[0].value:null;patch.planDirectory=results[1].status==="fulfilled"?results[1].value:null;patch.recurringConfig=null;const failed=results.filter(x=>x.status==="rejected");if(failed.length)partialError=failed.map(x=>errorText(x.reason)).join(" · ");}
  if(view==="security"){const results=await Promise.all([rpc("entre_admin_appeals"),rpc("entre_admin_privacy_requests")]);patch.appeals=results[0];patch.privacyRequests=results[1];}
  if(!valid())return;Object.assign(state,patch);state.loadError=partialError;state.refreshAt=new Date();lastLoad=Date.now();
 }catch(err){if(valid()){state.loadError=errorText(err);if(!background)toast(errorText(err),true);else console.warn(errorText(err));}}
 finally{if(valid()){state.loading=false;if(state.view===view){if(background&&view==='bulletins'){const wrapper=document.createElement('div');wrapper.innerHTML=window.entreAdminBulletins.page(state.bulletins,{escape:e,format:fmt,badge,icon:ico});const list=wrapper.querySelector('.bulletin-admin-list'),old=document.querySelector('.bulletin-admin-list');if(list&&old)old.replaceWith(list);else if(!adminEditing())renderView();}else if(!background||!adminEditing())renderView();}}}
}
async function navigate(view){if(!sections.some(function(s){return s[0]===view;}))return;if(state.modal?.type==="command")closeModal();state.moreOpen=false;state.view=view;await load(view);}
function modal(content){document.getElementById("modal-root").innerHTML='<div class="modal-back" id="modal-back"><div class="modal" role="dialog" aria-modal="true" aria-label="Ação administrativa">'+content+'</div></div>';var el=document.querySelector(".modal input,.modal textarea,.modal select");if(el)el.focus();}
async function openSupportThread(id){
 const ticket=state.supportTickets.find(t=>Number(t.id)===id);if(!ticket||!state.verified)return;
 state.modal={type:"support-thread",data:ticket};
 modal('<h2>Protocolo #'+id+'</h2><p>'+e(ticket.subject)+'</p><div class="cp-thread-list" id="adminSupportThread">Carregando…</div><form id="support-reply-form" '+(ticket.status==='cancelled'?'hidden':'')+'><label for="supportReply">Resposta ao usuário</label><textarea id="supportReply" name="body" rows="4" required maxlength="4000"></textarea><label><input type="checkbox" name="resolve"> Marcar como resolvido</label><button type="submit" class="btn-main">Enviar resposta</button></form><button type="button" class="small-btn" data-action="close-modal">Fechar</button>');
 await refreshSupportThread(id);
}
async function refreshSupportThread(id){const rows=await rpc("entre_support_thread",{_ticket:id});if(state.modal?.type!=="support-thread"||Number(state.modal.data.id)!==id)return;const root=document.getElementById("adminSupportThread");if(root){root.innerHTML=rows.map(x=>'<article><strong>'+(x.from_staff?"Equipe CONNECT":"Usuário")+'</strong><p>'+e(x.body)+'</p><small>'+fmt(x.created_at)+'</small>'+(x.from_staff?'<button type="button" class="small-btn" data-action="supportEmailReply" data-id="'+Number(x.id)+'">Enviar também por e-mail</button>':'')+'</article>').join("")||'<p>Nenhuma resposta ainda.</p>';root.scrollTop=root.scrollHeight;}}
function closeModal(){state.modal=null;var el=document.getElementById("modal-root");if(el)el.innerHTML="";}
async function openPlan(id){
 if(!state.verified||state.busy)return;
 const row=(state.view==="users"?state.users.rows:state.planDirectory?.rows||[]).find(u=>u.id===id);
 if(!row||!(row.plan_manageable||row.manageable)){toast("A conta precisa ter um perfil e e-mail confirmado.",true);return;}
 const owner=state.user?.id,context={type:"plan",email:String(row.email).trim().toLowerCase(),account:null,history:null,finance:null,request:null};state.modal=context;
 modal('<h2>Gerenciar plano</h2><p>Consultando a assinatura…</p><button type="button" class="btn-outline" data-action="close-modal">Fechar</button>');
 try{const [account,history,finance]=await Promise.all([rpc("connect_admin_manual_premium",{_email:context.email,_action:"lookup",_months:1}),rpc("connect_admin_plan_history",{_email:context.email}).catch(()=>null),rpc("connect_admin_financial_history",{_email:context.email}).catch(()=>null)]);
 if(state.modal!==context||state.user?.id!==owner||!state.verified)return;
 context.account=account;context.history=history;context.finance=finance;modal(window.entreAdminExtras.planEditor(account,history,e,ico,fmt,finance));
 }catch(err){if(state.modal===context){closeModal();toast(errorText(err),true);}}
}
function openUser(id){
 var u=(state.users.rows||[]).find(function(x){return x.id===id;});if(!u)return;
 state.modal={type:"user",data:u};
 var body='<h2>'+e(u.display_name||"Conta")+'</h2><p>'+e(u.email)+'</p><div class="health-row"><strong>Cadastro</strong><span>'+fmt(u.created_at)+'</span></div><div class="health-row"><strong>Último login</strong><span>'+fmt(u.last_sign_in_at)+'</span></div><div class="health-row"><strong>Forma de acesso</strong>'+badge("E-MAIL")+'</div><div class="health-row"><strong>Situação</strong>'+badge(u.banned?"SUSPENSO":u.admin?"ADMIN":"ATIVO",u.banned?"warn":"")+'</div>';
 if(!u.admin){body+='<form id="ban-form"><div class="field"><label for="ban-reason">Motivo da '+(u.banned?"reativação":"suspensão")+'</label><textarea class="form-textarea" id="ban-reason" name="reason" maxlength="300" placeholder="Informe um motivo para a equipe.">'+e(u.ban_reason||"")+'</textarea></div><p>'+(u.banned?"Reativar libera a conta para novas conversas.":"Suspender bloqueia novas conexões e o envio de mensagens. Conversas ativas serão encerradas.")+'</p><div class="modal-actions"><button type="button" class="btn-outline" data-action="close-modal">Cancelar</button><button type="submit" class="btn-main '+(u.banned?"":"danger")+'">'+(u.banned?"Reativar conta":"Confirmar suspensão")+'</button></div></form>';}
 else body+='<div class="modal-actions"><button class="btn-outline" data-action="close-modal">Fechar</button></div>';
 modal(body);
}
function openDeleteUser(id){
 var u=(state.users.rows||[]).find(function(x){return x.id===id;});
 if(!u||u.admin||u.id===state.user?.id){toast("Não é possível excluir um administrador.",true);return;}
 state.modal={type:"delete-user",data:u};
 modal('<div class="admin-delete-confirm"><span class="admin-critical-label">AÇÃO DEFINITIVA</span><h2>Excluir esta conta?</h2>'+
 '<p>Isso exclui o cadastro, o login e os dados relacionados do aplicativo. Não é o mesmo que suspender. Esta ação não pode ser desfeita.</p>'+
 '<p class="admin-target-email">'+e(u.email)+'</p>'+
 '<form id="admin-delete-user-form"><label class="field" for="adminDeleteConfirm">Para confirmar, digite <strong>EXCLUIR '+e(u.email.toLowerCase())+'</strong></label>'+
 '<input id="adminDeleteConfirm" name="confirmation" autocomplete="off" required placeholder="EXCLUIR '+e(u.email.toLowerCase())+'">'+
 '<label class="field" for="adminDeleteReason">Motivo da exclusão</label><textarea id="adminDeleteReason" name="reason" maxlength="300" placeholder="Opcional para registro interno"></textarea>'+
 '<div class="modal-actions"><button type="button" class="btn-outline" data-action="close-modal">Cancelar</button><button type="submit" class="btn-main danger">Excluir definitivamente</button></div></form></div>');
}
function openReport(id){
 var r=(state.reports||[]).find(function(x){return String(x.id)===String(id);});if(!r)return;
 state.modal={type:"report",data:r};
 var body='<h2>Denúncia #'+e(r.id)+'</h2><p>Enviada por '+e(r.reporter_name)+' contra '+e(r.reported_name)+'.</p><div class="health-row"><strong>Motivo</strong><span>'+e(reasonNames[r.reason]||r.reason)+'</span></div><div class="health-row"><strong>Data</strong><span>'+fmt(r.created_at)+'</span></div><div class="field"><label>Descrição informada</label><div style="white-space:pre-wrap;border:1px solid var(--line);border-radius:13px;padding:13px;line-height:1.6;overflow-wrap:anywhere;font-size:12px">'+e(r.details||"Sem descrição adicional.")+'</div></div><form id="review-form"><div class="field"><label for="review-status">Resultado da análise</label><select class="form-select" name="status" id="review-status"><option value="reviewed" '+(r.status==="reviewed"?"selected":"")+'>Analisada</option><option value="dismissed" '+(r.status==="dismissed"?"selected":"")+'>Descartada</option><option value="open" '+(r.status==="open"?"selected":"")+'>Manter pendente</option></select></div><div class="field"><label for="review-note">Observação administrativa</label><textarea id="review-note" name="note" class="form-textarea" maxlength="800" placeholder="Resumo da decisão…">'+e(r.admin_note||"")+'</textarea></div><div class="modal-actions"><button type="button" class="btn-outline" data-action="close-modal">Cancelar</button><button type="submit" class="btn-main">Salvar análise</button></div></form>';
 modal(body);
}
document.addEventListener("click",function(ev){
 var toggle=ev.target.closest("[data-admin-password-toggle]");
 if(!toggle)return;
 var field=document.getElementById("admin-password");
 if(!field||!toggle.closest("form")?.contains(field))return;
 var reveal=field.type==="password";
 if(!reveal&&field.type!=="text")return;
 field.type=reveal?"text":"password";
 toggle.textContent=reveal?"Ocultar":"Mostrar";
 toggle.setAttribute("aria-label",reveal?"Ocultar senha":"Mostrar senha");
 toggle.setAttribute("aria-pressed",String(reveal));
});
document.addEventListener("click",async function(ev){
 var n=ev.target.closest("[data-view],[data-action],[data-report-status]");if(!n)return;
 if(n.dataset.view){await navigate(n.dataset.view);return;}
 if(n.dataset.reportStatus){state.reportStatus=n.dataset.reportStatus;await load("reports");return;}
 var a=n.dataset.action;
 if(a==="admin-more"){state.moreOpen=!state.moreOpen;var m=document.getElementById("adminMoreMenu");if(m)m.hidden=!state.moreOpen;var t=document.querySelector(".admin-more-button");if(t)t.setAttribute("aria-expanded",String(state.moreOpen));return;}
 if(a==="close-modal"){closeModal();return;}
 if(a==="delete-bulletin"){
  if(!state.verified||state.busy||n.disabled)return;const id=Number(n.dataset.id),item=state.bulletins.find(b=>Number(b.id)===id);if(!item)return;
  if(!window.confirm("Excluir "+(item.kind==="poll"?"a enquete":"o aviso")+" “"+item.title+"”? A publicação, as notificações e as respostas ou votos serão removidos para todos."))return;
  state.busy=true;n.disabled=true;try{const result=await rpc("entre_admin_delete_bulletin",{_id:id});if(result?.deleted!==true&&result?.status!=="not_found")throw Error("Exclusão não confirmada.");state.bulletins=state.bulletins.filter(b=>Number(b.id)!==id);toast(result.deleted?"Publicação excluída.":"Publicação já indisponível.");await load("bulletins");}catch(err){toast(errorText(err),true);}finally{state.busy=false;if(n.isConnected)n.disabled=false;}return;
 }
 if(a==="platform-toggle"){
  const key=n.dataset.kind,old=state.platformControls?.[key];
  if(!state.verified||state.busy||typeof old!=="boolean"||!contentKinds.some(k=>k[0]===key&&key!=="encounters"))return;
  const label=contentKinds.find(k=>k[0]===key)[1];if(!window.confirm((old?"Pausar novos envios de ":"Liberar novos envios de ")+label+"? O conteúdo existente não será excluído."))return;
  const owner=state.user?.id;state.busy=true;n.disabled=true;
  try{const result=await rpc("connect_admin_set_content_enabled",{_feature:key,_enabled:!old});if(state.user?.id!==owner||!state.verified)return;state.platformControls=result;toast(old?"Recurso pausado.":"Recurso liberado.");if(state.view==="modules")renderView();}catch(err){toast(errorText(err),true);}finally{state.busy=false;if(n.isConnected)n.disabled=false;}return;
 }
 if(a==="content-kind"||a==="content-prev"||a==="content-next"){
  if(!state.verified||state.busy||state.view!=="content")return;
  if(a==="content-kind"){if(!contentKinds.some(k=>k[0]===n.dataset.kind))return;state.contentKind=n.dataset.kind;state.contentPage=0;}
  else if(a==="content-prev"&&state.contentPage>0)state.contentPage--;
  else if(a==="content-next"&&state.contentData?.has_more)state.contentPage++;else return;
  state.contentData=null;await load("content");return;
 }
 if(a==="content-preview"){
  if(!state.verified||state.busy||state.view!=="content")return;
  const row=state.contentData?.rows?.slice(0,25).find(x=>x.id===n.dataset.id),kind=state.contentKind,bucket=({posts:"entre-post-media",stories:"entre-story-media",lives:"entre-live-covers"})[kind];
  if(!row?.media_path||!bucket)return;
  const ctx={type:"content-preview"},owner=state.user?.id;state.modal=ctx;modal('<h2>Visualizar mídia</h2><p>Carregando arquivo autorizado…</p><button type="button" class="btn-outline" data-action="close-modal">Fechar</button>');
  try{const {data,error}=await db.storage.from(bucket).createSignedUrl(row.media_path,90);if(error)throw error;if(state.modal!==ctx||state.user?.id!==owner||!state.verified)return;
   const url=new window.URL(data.signedUrl);if(url.protocol!=="https:"||url.origin!==new window.URL(URL).origin)throw Error("Endereço de mídia inválido.");
   const video=row.media_type==="video"||/\.(webm|mp4)$/i.test(row.media_path);
   modal('<h2>Mídia publicada</h2><p>'+e(row.author)+'</p><div class="cc-media-preview">'+(video?'<video controls playsinline preload="metadata" src="'+e(url.href)+'"></video>':'<img alt="Mídia da publicação" src="'+e(url.href)+'">')+'</div><div class="modal-actions"><button type="button" class="btn-outline" data-action="close-modal">Fechar</button></div>');
  }catch(err){if(state.modal===ctx){closeModal();toast(errorText(err),true);}}return;
 }
 if(a==="content-moderate"){
  if(!state.verified||state.busy||state.view!=="content"||n.disabled)return;
  const row=state.contentData?.rows?.slice(0,25).find(x=>x.id===n.dataset.id);if(!row||row.protected)return;
  const kind=state.contentKind,ending=["lives","encounters"].includes(kind);
  if(!window.confirm(ending?"Encerrar esta sessão para todos os participantes?":"Excluir este conteúdo definitivamente para todos?"))return;
  state.busy=true;n.disabled=true;try{const ok=await rpc("connect_admin_moderate_content",{_kind:kind,_id:row.id});toast(ok?(ending?"Sessão encerrada.":"Conteúdo excluído."):"Registro já indisponível.");if(state.view==="content")await load("content");}catch(err){toast(errorText(err),true);}finally{state.busy=false;if(n.isConnected)n.disabled=false;}return;
 }
 if(a==="command"){openCommand();return;}
 if(a==="refresh"){await load(state.view);if(!state.loadError&&!state.loading)toast("Dados atualizados.");return;}
 if(a==="supportEmailReply"){if(!state.verified||n.disabled)return;n.disabled=true;try{var result=await db.functions.invoke("entre-support-email",{body:{reply_id:Number(n.dataset.id)}});if(result.error){let reason="Envio indisponível. Verifique a configuração de e-mail.";try{reason=(await result.error.context.json()).error||reason;}catch(_){}throw Error(reason);}if(result.data?.status!=="sent")throw Error("Envio não confirmado.");toast(result.data.already_sent?"E-mail já enviado.":"E-mail aceito pelo provedor.");}catch(err){toast(errorText(err),true);}finally{n.disabled=false;}return;}
 if(a==="supportThread"){try{await openSupportThread(Number(n.dataset.id));}catch(err){toast(errorText(err),true);}return;}
 if(a==="evidenceOpen"){
  try{var signed=await db.storage.from("entre-support-evidence").createSignedUrl(n.dataset.path,300);if(signed.error)throw signed.error;if(signed.data?.signedUrl)window.open(signed.data.signedUrl,"_blank","noopener,noreferrer");else toast("Prova indisponível.",true);}catch(err){toast(errorText(err),true);}return;
 }
 if(a==="case-hold"){
 const area=n.dataset.area,id=Number(n.dataset.id),hold=n.dataset.hold==="1";
 if(!state.verified||state.busy||!["reports","comment_reports","appeals","privacy"].includes(area)||!Number.isSafeInteger(id)||id<=0)return;
 if(!window.confirm(hold?"Preservar este registro da limpeza automática por necessidade de segurança ou obrigação legal?":"Liberar a limpeza automática? Se o prazo já tiver vencido, o registro poderá ser removido na próxima rotina."))return;
 state.busy=true;n.disabled=true;
 try{const ok=await rpc("connect_admin_case_hold",{_area:area,_id:id,_hold:hold});if(ok!==true)throw Error("Alteração não confirmada.");toast(hold?"Registro preservado.":"Limpeza automática liberada.");await load(state.view);}
 catch(err){toast(errorText(err),true);}finally{state.busy=false;if(n.isConnected)n.disabled=false;}return;
 }
 if(a==="review-appeal"||a==="reject-appeal"){
  if(!window.confirm(a==="review-appeal"?'Aprovar contestação e reativar?':'Rejeitar contestação?'))return;
  try{await rpc('entre_admin_review_appeal',{_id:Number(n.dataset.id),_approve:a==="review-appeal"});toast('Revisão registrada.');await load('appeals');}
  catch(err){toast(errorText(err),true);}return;
 }
 if(a==="privacy-handled"||a==="privacy-denied"){
  if(!window.confirm('A análise deste pedido foi concluída?'))return;
  try{await rpc('entre_admin_review_privacy_request',{_id:Number(n.dataset.id),_status:a==="privacy-handled"?'handled':'denied'});toast('Solicitação atualizada.');await load('security');}
  catch(err){toast(errorText(err),true);}return;
 }
 if(a==="toggle-maintenance"){await saveRelease(!Boolean(state.settings?.maintenance_enabled),false);return;}
 if(a==="signout"){const {error}=await db.auth.signOut({scope:"local"});if(error){toast(errorText(error),true);return;}state.user=null;state.verified=false;gate(false);window.connectSound?.play?.("logout");return;}
 if(a==="commentReview"||a==="commentDismiss"){
  try{await rpc('entre_admin_review_comment_report',{_id:Number(n.dataset.id),_status:a==="commentReview"?"reviewed":"dismissed"});toast("Denúncia atualizada.");await load("reports");}
  catch(err){toast(errorText(err),true);}return;
 }
 if(a==="plan-refund"){const context=state.modal,owner=state.user?.id;if(!state.verified||state.busy||context?.type!=="plan")return;const item=context.finance?.find(x=>x.id===n.dataset.id&&x.kind==="payment");if(!item||Number(item.refundable_cents)<=0)return;const entered=prompt("Valor do reembolso já realizado (R$). Máximo: "+(Number(item.refundable_cents)/100).toFixed(2));if(entered===null)return;const amount=Math.round(Number(entered.replace(",","."))*100);if(!Number.isSafeInteger(amount)||amount<=0||amount>Number(item.refundable_cents)){toast("Valor inválido.",true);return;}if(!confirm("Registrar um reembolso já realizado de R$ "+(amount/100).toFixed(2)+"? Nenhum dinheiro será movimentado."))return;const key=item.id+":"+amount;if(context.refundKey!==key){context.refundKey=key;context.refundRequest=crypto.randomUUID();}state.busy=true;n.disabled=true;try{const ok=await rpc("connect_admin_record_refund",{_payment:item.id,_amount_cents:amount,_request:context.refundRequest});if(ok!==true)throw Error("Registro não confirmado.");if(state.user?.id!==owner||!state.verified)return;context.refundKey=null;const finance=await rpc("connect_admin_financial_history",{_email:context.email});if(state.modal===context){context.finance=finance;modal(window.entreAdminExtras.planEditor(context.account,context.history,e,ico,fmt,finance));}toast("Reembolso registrado.");}catch(err){toast(errorText(err),true);}finally{state.busy=false;if(n.isConnected)n.disabled=false;}return;}
 if(a==="plan-manage"){await openPlan(n.dataset.id);return;}
 if(a==="plan-filter"){if(!state.verified||state.busy||!["all","premium","free","expired","revoked","pending"].includes(n.dataset.plan))return;clearTimeout(planSearchTimer);state.planFilter=n.dataset.plan;state.planPage=0;await load("premium");return;}
 if(a==="plan-prev"&&state.planPage>0){state.planPage--;await load("premium");return;}
 if(a==="plan-next"&&(state.planPage+1)*perPage<(state.planDirectory?.total||0)){state.planPage++;await load("premium");return;}
 if(a==="edit-user"){openUser(n.dataset.id);return;}
 if(a==="delete-user"){openDeleteUser(n.dataset.id);return;}
 if(a==="review"){openReport(n.dataset.id);return;}
 if(a==="prev-users"&&state.userPage>0){state.userPage--;await load("users");return;}
 if(a==="next-users"&&(state.userPage+1)*perPage<(state.users.total||0)){state.userPage++;await load("users");return;}
});
document.addEventListener("change",function(ev){if(ev.target?.id==="bulletin-kind")window.entreAdminBulletins.syncType();});
 document.addEventListener("input",function(ev){
 if(ev.target.id==="admin-module-search"){const q=ev.target.value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g,"");document.querySelectorAll(".saas-command-results .saas-module").forEach(el=>{el.hidden=!el.textContent.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g,"").includes(q);});return;}
 if(ev.target.id==="plan-search"){
  clearTimeout(planSearchTimer);state.planSearch=ev.target.value;state.planPage=0;
  planSearchTimer=setTimeout(()=>{if(state.view==="premium")void load("premium");},300);return;
 }
 if(ev.target.id==="user-search"){
  clearTimeout(searchTimer);state.search=ev.target.value;state.userPage=0;
  searchTimer=setTimeout(()=>{if(state.view==="users")void load("users");},300);
 }
});
document.addEventListener("submit",async function(ev){
 var form=ev.target;if(!(form instanceof HTMLFormElement))return;ev.preventDefault();
 if(form.id==="admin-login-form"){
  if(state.busy)return;
  state.busy=true;
  var submit=form.querySelector('[type="submit"]');if(submit)submit.disabled=true;
  try{
   var email=String(form.elements.email.value||"").trim().toLowerCase();
   var password=String(form.elements.password.value||"");
   var token=await window.connectTurnstile.consume(form);
   var logged=await db.auth.signInWithPassword({email:email,password:password,options:{captchaToken:token}});
   if(logged.error)throw logged.error;
   await boot();
   if(!state.verified)toast("Este e-mail não tem acesso ao painel. Verifique a confirmação e a autorização.",true);
  }catch(err){toast(err?.code==='captcha_failed'?'O servidor recusou a verificação de segurança. Repita o desafio.':errorText(err),true);}
  finally{if(token)window.connectTurnstile.reset(form);state.busy=false;if(submit&&submit.isConnected)submit.disabled=false;}
  return;
 }
 if(form.id==="release-form"){await saveRelease(Boolean(state.settings?.maintenance_enabled),true);return;}if(state.busy)return;
 state.busy=true;var btn=form.querySelector('[type="submit"]');if(btn)btn.disabled=true;
 try{
  if(form.id==="support-reply-form"&&state.modal?.type==="support-thread"){const id=Number(state.modal.data.id);await rpc("entre_support_reply",{_ticket:id,_body:form.elements.body.value,_resolve:form.elements.resolve.checked});form.reset();await refreshSupportThread(id);state.supportTickets=await rpc("entre_admin_support_tickets");toast("Resposta enviada ao protocolo.");}
  else if(form.id==="premium-manual-form"){
   const context=state.modal,owner=state.user?.id,view=state.view,operation=ev.submitter?.value||"grant",months=Number(form.elements.months?.value||1);
   if(!state.verified||context?.type!=="plan"||!context.account||!["grant","revoke"].includes(operation)||context.email!==String(form.elements.email.value||"").trim().toLowerCase())throw Error("Consulte a conta novamente.");
   if(operation==="grant"&&(!Number.isInteger(months)||months<1||months>12))throw Error("Escolha de 1 a 12 meses.");
   if(operation==="revoke"&&!context.account.active)throw Error("O usuário já está no plano gratuito.");
   let transaction=null;if(operation==="grant"){const kind=form.elements.purchase_kind.value,amount=Math.round(Number(form.elements.received.value)*100),discount=Math.round(Number(form.elements.discount.value)*100),method=form.elements.method.value;if(!["payment","courtesy"].includes(kind)||!Number.isSafeInteger(amount)||!Number.isSafeInteger(discount)||amount<0||discount<0||amount>100000000||discount>100000000||(kind==="payment"&&(amount===0||method==="none"))||(kind==="courtesy"&&(amount!==0||method!=="none")))throw Error("Informe corretamente a origem, o valor recebido e a forma de pagamento.");transaction={_email:context.email,_months:months,_kind:kind,_amount_cents:amount,_discount_cents:discount,_method:method};const key=JSON.stringify(transaction);if(context.requestKey!==key){context.requestKey=key;context.request=crypto.randomUUID();}transaction._request=context.request;}
   if(!window.confirm(operation==="grant"?"Liberar ou renovar "+months+" mês(es) de Premium para "+context.email+"?":"Retornar "+context.email+" ao plano gratuito agora? Isso revoga os benefícios Premium e não gera estorno."))return;
   const controls=Array.from(form.querySelectorAll("button"));controls.forEach(b=>b.disabled=true);
   try{
    const account=operation==="grant"?await rpc("connect_admin_plan_transaction",transaction):await rpc("connect_admin_manual_premium",{_email:context.email,_action:"revoke",_months:1});
    if(state.user?.id!==owner||!state.verified)return;
    if(operation==="grant"?account.active!==true:account.active!==false)throw Error("Alteração do plano não confirmada pelo servidor.");
    context.requestKey=null;const [history,finance]=await Promise.all([rpc("connect_admin_plan_history",{_email:context.email}).catch(()=>null),rpc("connect_admin_financial_history",{_email:context.email}).catch(()=>null)]);
    if(state.user?.id!==owner||!state.verified)return;
    if(state.modal===context){context.account=account;context.history=history;context.finance=finance;modal(window.entreAdminExtras.planEditor(account,history,e,ico,fmt,finance));}
    toast(operation==="grant"?"Premium ativo.":"Usuário retornou ao plano gratuito.");
    if(state.view===view)await load(view);
   }finally{controls.forEach(b=>{if(b.isConnected)b.disabled=false;});}
  }else if(form.id==="premium-config-form"){
   var config=await rpc("entre_admin_premium_config",window.entreAdminExtras.priceParams(form));state.premiumConfig=config;toast("Configuração Premium salva.");await load("premium");
  }else if(form.id==="bulletin-form"){
   var payload=window.entreAdminBulletins.params(form);
   if(!window.confirm(payload._kind==="poll"?"Publicar uma enquete opcional para todos por 24 horas?":"Publicar este aviso para todos por 24 horas?"))return;
   var published=await rpc("entre_admin_publish_bulletin",payload);
   toast("Publicado. "+Number(published?.notified||0)+" perfis notificados.");
   await load("bulletins");
  }else if(form.id==="settings-form"){
   var s=await rpc("entre_admin_save_settings",{_matchmaking:form.elements.matchmaking.checked,_reporting:form.elements.reporting.checked,_announcement:state.settings?.announcement||''});
   state.settings=s;if(state.overview)state.overview.settings=s;toast("Configurações salvas no Supabase.");await load("settings");
  }else if(form.id==="admin-delete-user-form"&&state.modal?.type==="delete-user"){
   var u=state.modal.data;
   if(form.elements.confirmation.value!=="EXCLUIR "+u.email.toLowerCase())throw Error("Digite o e-mail completo para confirmar a exclusão.");
   if(!window.confirm("ÚLTIMA CONFIRMAÇÃO: excluir permanentemente a conta de "+u.email+"?"))return;
   var response=await db.functions.invoke("entre-admin-delete-user",{
    body:{user_id:u.id,confirmation:form.elements.confirmation.value,reason:form.elements.reason.value}
   });
   if(response.error||!response.data?.deleted)throw Error(response.data?.error||response.error?.message||"Exclusão não concluída.");
   closeModal();toast("Conta excluída no Supabase."+(response.data.cleanup_pending?" Arquivos pendentes de limpeza.":""));
   await load("users");
  }else if(form.id==="ban-form"&&state.modal&&state.modal.type==="user"){
   var u=state.modal.data,ban=!u.banned;
   await rpc("entre_admin_set_ban",{_user:u.id,_banned:ban,_reason:form.elements.reason.value});
   closeModal();toast(ban?"Usuário suspenso.":"Conta reativada.");await load("users");
  }else if(form.id==="review-form"&&state.modal&&state.modal.type==="report"){
   await rpc("entre_admin_review_report",{_report:state.modal.data.id,_status:form.elements.status.value,_note:form.elements.note.value});
   closeModal();toast("Denúncia analisada.");await load("reports");
  }
 }catch(err){toast(errorText(err),true);}finally{state.busy=false;if(btn&&btn.isConnected)btn.disabled=false;}
});
document.addEventListener("keydown",function(ev){if(ev.key==="Escape")closeModal();if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==="k"&&state.verified){ev.preventDefault();openCommand();}});
document.addEventListener("click",function(ev){if(ev.target&&ev.target.id==="modal-back")closeModal();});
let adminSignalChannel=null,adminSupportChannel=null,adminFallback=0,adminRefreshTimer=0,adminRefreshing=false,adminAuthBound=false;const adminDirty=new Set();
function adminEditing(){const el=document.activeElement;return !!(el?.matches('input,textarea,select,[contenteditable=true]')||document.querySelector('#admin-view form textarea:not([readonly])')?.value?.trim());}
function stopAdminRealtime(){if(adminSignalChannel)void db.removeChannel(adminSignalChannel);if(adminSupportChannel)void db.removeChannel(adminSupportChannel);adminSignalChannel=null;adminSupportChannel=null;clearInterval(adminFallback);clearTimeout(adminRefreshTimer);adminRefreshTimer=0;adminDirty.clear();}
function scheduleAdminRefresh(){if(adminRefreshTimer||adminRefreshing||!state.verified||document.hidden)return;adminRefreshTimer=setTimeout(()=>{adminRefreshTimer=0;void flushAdminRefresh();},400);}
async function flushAdminRefresh(){if(adminRefreshing||!state.verified||document.hidden)return;const view=state.view;const relevant=adminDirty.has('all')||adminDirty.has(view)||(view==='overview'||view==='monitor')&&adminDirty.size>0||view==='updates'&&adminDirty.has('settings')||view==='users'&&adminDirty.has('premium')||view==='security'&&adminDirty.has('appeals');if(!relevant){adminDirty.clear();return;}if(state.busy||state.loading||state.modal||(view!=='bulletins'&&adminEditing())){adminRefreshTimer=setTimeout(()=>{adminRefreshTimer=0;void flushAdminRefresh();},700);return;}adminRefreshing=true;adminDirty.clear();try{await load(view,true);}finally{adminRefreshing=false;if(adminDirty.size)scheduleAdminRefresh();}}
async function boot(){
 try{
  var s=await db.auth.getSession();if(s.error)throw s.error;
  if(!s.data.session){gate(false);return;}
  var verified=await db.auth.getUser();if(verified.error)throw verified.error;
  if(!verified.data.user){gate(false);return;}
  state.user=verified.data.user;
  var allowed=await rpc("entre_admin_check");
  if(allowed!==true){gate(true);return;}
  state.verified=true;state.view="overview";state.moreOpen=false;state.modal=null;state.planDirectory=null;state.premiumConfig=null;state.observability=null;state.planSearch="";state.planFilter="all";state.planPage=0;state.users={rows:[],total:0};state.community=null;state.platformControls=null;state.contentData=null;state.contentKind="posts";state.contentPage=0;state.overview=null;state.loadError=null;state.refreshAt=null;shell();await load("overview");
 stopAdminRealtime();
 adminSupportChannel=db.channel("admin-support-replies").on("postgres_changes",{event:"UPDATE",schema:"public",table:"entre_support_tickets"},async p=>{if(state.modal?.type==="support-thread"&&Number(state.modal.data.id)===Number(p.new?.id)&&p.new.status==="cancelled"){const form=document.getElementById("support-reply-form");if(form){form.hidden=true;form.querySelectorAll("button,textarea,input").forEach(x=>x.disabled=true);}state.modal.data.status="cancelled";}if(state.verified&&!document.hidden&&state.view==="support"&&!state.modal&&!state.loading&&!state.busy&&p.new?.status!=="draft")try{await load("support");}catch(err){console.warn(errorText(err));}}).on("postgres_changes",{event:"INSERT",schema:"public",table:"entre_support_replies"},async p=>{if(!state.verified||document.hidden||state.view!=="support")return;try{if(state.modal?.type==="support-thread")await refreshSupportThread(Number(state.modal.data.id));else if(!state.loading&&!state.busy)await load("support");}catch(err){console.warn(errorText(err));}}).subscribe();
  adminSignalChannel=db.channel("connect-admin-signal").on("postgres_changes",{event:"UPDATE",schema:"public",table:"connect_admin_signal"},p=>{const kind=p.new?.kind;if(kind){adminDirty.add(kind);scheduleAdminRefresh();}}).subscribe(status=>{if(status==="SUBSCRIBED"){adminDirty.add("all");scheduleAdminRefresh();}});
  if(!adminAuthBound){adminAuthBound=true;db.auth.onAuthStateChange(function(ev){if(ev==="SIGNED_OUT"){stopAdminRealtime();state.user=null;state.verified=false;gate(false);}});document.addEventListener("visibilitychange",()=>{if(!document.hidden){if(state.verified&&state.modal?.type==="support-thread")void refreshSupportThread(Number(state.modal.data.id)).catch(err=>console.warn(errorText(err)));adminDirty.add("all");scheduleAdminRefresh();}});document.addEventListener("focusout",scheduleAdminRefresh);window.addEventListener("online",()=>{adminDirty.add("all");scheduleAdminRefresh();});}
  adminFallback=setInterval(()=>{if(state.verified&&!document.hidden){adminDirty.add("all");scheduleAdminRefresh();}},60000);
 }catch(err){console.error("entre admin boot",err);gate(false);toast(errorText(err),true);}
}
boot();
})();