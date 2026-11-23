/* entre. Command Center. All privileged access is checked on Supabase RPC functions. */
(function(){
"use strict";
var URL="https://trrakyybnvxpdhxwgjrz.supabase.co";
var KEY="sb_publishable_OJ4wBPPNVBBcrcNl12yonw_hRSlMKsZ";
var app=document.getElementById("console"), toastEl=document.getElementById("toast");
if(!window.supabase || !window.supabase.createClient){
 app.innerHTML='<div class="preload"><h1>Falha de conexão</h1><p>Atualize a página quando estiver conectado à internet.</p></div>';return;
}
var db=window.supabase.createClient(URL,KEY,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
var state={user:null,verified:false,view:"overview",loading:false,busy:false,overview:null,users:{rows:[],total:0},reports:[],pairs:[],settings:null,search:"",userPage:0,reportStatus:"open",modal:null,refreshAt:null,appeals:[],privacyRequests:[]};
var perPage=20, searchTimer=null, toastTimer=null, lastLoad=0;
var sections=[
 ["overview","Visão geral","layout-dashboard"],
 ["updates","Atualização","refresh-cw"],
 ["users","Usuários","users"],
 ["reports","Denúncias","flag"],
 ["pairs","Conexões","heart-handshake"],
 ["settings","Configurações","sliders-horizontal"],
 ["security","Segurança","shield-check"]
];
var shapes={
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
 "settings":'<circle cx="12" cy="12" r="3"/><path d="M12 2v2m0 16v2M4 12H2m20 0h-2M4.9 4.9l1.5 1.5m11.2 11.2 1.5 1.5m0-14.2-1.5 1.5M6.4 17.6l-1.5 1.5"/>'
};
function ico(n,s){return '<svg viewBox="0 0 24 24" width="'+(s||19)+'" height="'+(s||19)+'" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(shapes[n]||shapes["settings"])+'</svg>';}
function e(x){return String(x===null||x===undefined?"":x).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function fmt(date){if(!date)return "—";var d=new Date(date);return isNaN(d)?"—":new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(d);}
function day(date){var d=new Date(String(date).slice(0,10)+"T12:00:00");return isNaN(d)?"—":new Intl.DateTimeFormat("pt-BR",{weekday:"short"}).format(d).replace(".","");}
function badge(text,kind){return '<span class="badge '+(kind||"")+'">'+e(text)+'</span>';}
function person(name,secondary,accent){var n=String(name||"Pessoa");return '<span class="person-avatar '+(accent?"coral":"")+'">'+e(n.slice(0,1).toUpperCase())+'</span><span class="person-details"><strong title="'+e(n)+'">'+e(n)+'</strong><small>'+e(secondary||"")+'</small></span>';}
function errorText(err){var s=String(err&&err.message||err||"Erro desconhecido");if(s.indexOf("42501")>=0||s.toLowerCase().indexOf("administrativo negado")>=0)return "Acesso negado pelo servidor. Esta conta não possui permissão administrativa.";return s;}
function toast(msg,bad){clearTimeout(toastTimer);toastEl.textContent=msg;toastEl.className=(bad?"error ":"")+"show";toastTimer=setTimeout(function(){toastEl.className="";},4200);}
async function rpc(name,params){var r=await db.rpc(name,params||{});if(r.error)throw r.error;return r.data;}
function gate(locked){
 var message=locked?"Esta conta não possui permissão administrativa. Entre com a conta Google autorizada no Supabase.":"Administre o entre. com controle, clareza e segurança — em um único espaço.";
 app.innerHTML='<div class="gate"><div class="gate-copy"><div><a class="brand" style="padding:0" href="../"><span class="brand-mark">e</span><span><span class="brand-text">entre<i>.</i></span><br><span class="brand-sub">COMMAND CENTER</span></span></a></div><div class="gate-inner"><span class="gate-kicker">ACESSO RESTRITO · GOOGLE IDENTITY</span><h1>Seu site,<br><em>sob controle.</em></h1><p>'+e(message)+'</p><div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:27px"><button class="btn-main coral" data-action="google">'+ico("shield-check",19)+' '+(locked?"Trocar conta Google":"Entrar com Google")+' '+ico("arrow-right",19)+'</button><a class="btn-outline" href="../">Ir para o site</a></div>'+(locked&&state.user?'<p style="font-size:11px;margin-top:18px">Conectado como '+e(state.user.email)+'</p>':'')+'</div><div class="gate-small">entre. · Painel privado · Acesso protegido no Supabase</div></div><div class="gate-art"><div class="gate-orbit"><strong>e.</strong><span>CONTROL</span></div><h2>O controle que uma comunidade real merece.</h2><p>Um painel feito para cuidar de conexões, não invadir conversas.</p></div></div>';
}
function navItem(s,compact){return '<button type="button" class="'+(compact?"":"rail-item ")+(state.view===s[0]?"active":"")+'" data-view="'+s[0]+'" aria-label="'+e(s[1])+'">'+ico(s[2],compact?19:19)+'<span>'+e(s[1])+'</span></button>';}
function shell(){
 app.innerHTML='<div class="shell"><aside class="rail"><div class="brand"><span class="brand-mark">e</span><div><div class="brand-text">entre<i>.</i></div><div class="brand-sub">COMMAND CENTER</div></div></div><div class="rail-label">WORKSPACE</div><div class="rail-links">'+sections.map(function(s){return navItem(s,false);}).join("")+'</div><div class="rail-spacer"></div><div class="rail-bottom"><div class="admin-identity"><div class="admin-avatar">'+e((state.user&&state.user.email||"A")[0].toUpperCase())+'</div><div><strong>Admin principal</strong><small>'+e(state.user&&state.user.email||"")+'</small></div></div><div class="rail-out"><a href="../">'+ico("external-link",13)+' Ver site</a><button data-action="signout">'+ico("log-out",13)+' Sair</button></div></div></aside><main class="main"><header class="topbar"><div class="topbar-left"><span class="topbar-label">entre. / ADMIN / <span id="topbar-location">'+e(viewTitle())+'</span></span></div><div class="topbar-right"><span class="topbar-live"><span class="pulse"></span> SISTEMA CONECTADO</span><button class="toolbar-btn" data-action="refresh">'+ico("refresh-cw",16)+' Atualizar</button><a class="toolbar-btn" href="../">'+ico("external-link",16)+' Ver site</a></div></header><div id="admin-view"></div></main><nav class="bottom-nav" aria-label="Navegação administrativa">'+sections.map(function(s){return navItem(s,true);}).join("")+'</nav></div><div id="modal-root"></div>';
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

function overview(){
 var x=state.overview||{},s=x.settings||{},trend=x.signup_trend||[],mx=Math.max(1,...trend.map(function(v){return Number(v.count||0);}));
 var chart=trend.map(function(v){var n=Number(v.count||0);var percent=Math.max(4,Math.round(n/mx*100));return '<div class="chart-col" title="'+n+' cadastros"><div class="chart-bar-box"><div class="chart-bar" style="height:'+percent+'%"></div></div><span class="chart-day">'+e(day(v.day))+'</span></div>';}).join("");
 return heading("VISÃO GERAL · TEMPO REAL","Tudo em <em>perspectiva.</em>","Acompanhe sua comunidade, a qualidade dos encontros e o estado da plataforma.")+
 releaseShortcut(Boolean(s.maintenance_enabled),s.maintenance_enabled?"Site em atualização":"Modo atualização",s.maintenance_enabled?"Visitantes veem a tela especial até você liberar.":"Ative, acompanhe e libere quando quiser.")+'<div class="stat-grid">'+stat("Usuários cadastrados",x.users,"users","Contas de autenticação","accent")+stat("Novos nos últimos 7 dias",x.new_users_7d,"users","Cadastros recentes")+stat("Buscando agora",x.waiting,"zap","Fila ativa (30 segundos)","coral")+stat("Conversas em andamento",x.active_pairs,"message-circle","Pares com tempo restante")+stat("Matches recíprocos",x.connected_pairs,"heart-handshake","Escolha dos dois")+stat("Denúncias pendentes",x.reports_open,"flag","Aguardando moderação")+'</div>'+
 '<div class="panel-grid"><section class="panel"><h3>Crescimento da comunidade</h3><p class="panel-desc">Cadastros por dia · últimos sete dias</p><div class="chart">'+chart+'</div></section><section class="panel"><h3>Saúde da plataforma</h3><p class="panel-desc">Acompanhamento das operações principais</p><div class="health-row"><strong>Novas conexões</strong><span class="health-state '+(!s.matchmaking_enabled?"state-off":"")+'"><span class="pulse"></span>'+(!s.matchmaking_enabled?"Pausadas":"Ativas")+'</span></div><div class="health-row"><strong>Recebimento de denúncias</strong><span class="health-state '+(!s.reporting_enabled?"state-off":"")+'"><span class="pulse"></span>'+(!s.reporting_enabled?"Pausado":"Ativo")+'</span></div><div class="health-row"><strong>Usuários suspensos</strong>'+badge(x.banned||0,(x.banned||0)>0?"warn":"neutral")+'</div><div class="health-row"><strong>Mensagens nas últimas 24h</strong>'+badge(x.messages_24h||0,"neutral")+'</div></section></div>'+
 '<div class="quick-links"><button class="quick" data-view="users">'+ico("users",17)+' Gerenciar usuários '+ico("arrow-right",15)+'</button><button class="quick" data-view="reports">'+ico("flag",17)+' Moderar denúncias '+ico("arrow-right",15)+'</button><button class="quick" data-view="settings">'+ico("sliders-horizontal",17)+' Configurar site '+ico("arrow-right",15)+'</button></div>';
}
function users(){
 var arr=state.users.rows||[],total=state.users.total||0;
 return heading("GERENCIAMENTO","As pessoas <em>do entre.</em>","Pesquise contas Google, acompanhe cadastros e suspenda acessos abusivos.")+
 '<section class="data-panel"><div class="data-tools"><div><h3>Contas cadastradas</h3><small>'+e(total)+' registro(s)</small></div><label class="search-box">'+ico("search",17)+'<input id="user-search" placeholder="Nome ou e-mail…" aria-label="Pesquisar usuários" autocomplete="off" maxlength="120" value="'+e(state.search)+'"></label></div>'+
 (arr.length?arr.map(function(u){return '<div class="list-row"><div class="list-main">'+person(u.display_name||u.email,u.email,u.admin)+'</div><div class="row-meta">'+fmt(u.created_at)+'</div>'+badge(u.admin?"ADMIN":u.banned?"SUSPENSO":u.google?"GOOGLE":"ATIVO",u.banned?"warn":u.admin?"":"neutral")+'<button class="small-btn '+(u.banned?"":"danger")+'" data-action="edit-user" data-id="'+e(u.id)+'">'+(u.admin?"Detalhes":u.banned?"Reativar":"Suspender")+'</button></div>';}).join(""):empty("Nenhuma conta encontrada","Ajuste os termos de busca ou aguarde novos cadastros."))+
 '<div class="table-footer"><span>Página '+(state.userPage+1)+' · '+e(total)+' usuário(s)</span><div style="display:flex;gap:8px"><button class="small-btn" data-action="prev-users" '+(state.userPage<=0?"disabled":"")+'>'+ico("chevron-left",13)+' Anterior</button><button class="small-btn" data-action="next-users" '+((state.userPage+1)*perPage>=total?"disabled":"")+'>Próxima '+ico("chevron-right",13)+'</button></div></div></section>';
}
var reasonNames={harassment:"Assédio / comportamento abusivo",hate:"Discurso de ódio",spam:"Spam / golpes",underage:"Suspeita de menor de idade",fake:"Perfil falso",other:"Outro motivo"};
function reports(){
 var arr=state.reports||[];
 var filters=[["open","Pendentes"],["reviewed","Analisadas"],["dismissed","Descartadas"],["all","Todas"]];
 return heading("MODERAÇÃO","Uma comunidade <em>mais segura.</em>","Denúncias enviadas por participantes reais. Mensagens privadas não são exibidas aqui.")+
 '<section class="data-panel"><div class="data-tools"><div><h3>Central de denúncias</h3><small>Ações de moderação registradas no banco</small></div><div class="filter-row">'+filters.map(function(f){return '<button class="chip '+(state.reportStatus===f[0]?"active":"")+'" data-report-status="'+f[0]+'">'+e(f[1])+'</button>';}).join("")+'</div></div>'+
 (arr.length?arr.map(function(r){return '<div class="list-row"><div class="list-main">'+person(r.reported_name,reasonNames[r.reason]||r.reason,true)+'</div><div class="row-meta">'+fmt(r.created_at)+'</div>'+badge(r.status==="open"?"PENDENTE":r.status==="reviewed"?"ANALISADA":"DESCARTADA",r.status==="open"?"warn":"neutral")+'<button class="small-btn" data-action="review" data-id="'+e(r.id)+'">Analisar '+ico("chevron-right",13)+'</button></div>';}).join(""):empty("Nenhuma denúncia aqui","Quando houver denúncias, elas aparecerão nesta seção."))+'</section>';
}
function pairs(){
 var arr=state.pairs||[];
 return heading("ENCONTROS · 1 A 1","Conexões <em>reais.</em>","Acompanhe sessões e matches sem acessar o conteúdo das mensagens privadas.")+
 '<section class="data-panel"><div class="data-tools"><div><h3>Conexões recentes</h3><small>Últimos 60 encontros · dados de sessão</small></div>'+badge(arr.length+" exibidos","neutral")+'</div>'+
 (arr.length?arr.map(function(p){return '<div class="list-row"><div class="list-main">'+person(p.person_a,"com "+p.person_b,false)+'</div><div class="row-meta">'+fmt(p.created_at)+'</div>'+badge(p.status==="connected"?"MATCH":p.status==="active"?"EM CONVERSA":"ENCERRADA",p.status==="connected"?"":p.status==="active"?"warn":"neutral")+'</div>';}).join(""):empty("Sem encontros ainda","Quando as pessoas se conectarem, os encontros aparecem aqui."))+'</section>';
}
function settings(){
 var x=state.settings||{matchmaking_enabled:true,reporting_enabled:true,announcement:""};
 return heading("CONFIGURAÇÕES","Seu site, <em>suas regras.</em>","Essas alterações são salvas no Supabase e aplicadas pelo servidor.")+
 releaseShortcut(Boolean(x.maintenance_enabled),"Atualizações do site","Ative a tela de manutenção ou libere a nova versão.")+'<form id="settings-form" class="form-card"><h2 class="section-heading">Experiência e segurança</h2><p class="section-desc">Controle operacional da plataforma. Novas regras são aplicadas sem publicar outra versão do site.</p>'+
 '<div class="setting-item"><div><strong>Permitir novas conexões</strong><small>Se desativado, a busca por novas pessoas será pausada no servidor.</small></div><label class="switch"><input type="checkbox" name="matchmaking" '+(x.matchmaking_enabled?"checked":"")+'><span></span></label></div>'+
 '<div class="setting-item"><div><strong>Aceitar denúncias</strong><small>Habilita o formulário de denúncia entre participantes de conversas.</small></div><label class="switch"><input type="checkbox" name="reporting" '+(x.reporting_enabled?"checked":"")+'><span></span></label></div>'+
 '<div class="setting-item" style="display:block"><label class="form-label" for="announcement">Aviso para usuários</label><textarea name="announcement" id="announcement" class="form-textarea" maxlength="240" placeholder="Ex.: Vamos fazer uma atualização rápida em breve…">'+e(x.announcement||"")+'</textarea><span class="form-hint">Até 240 caracteres. Clique em Enviar para mostrar o aviso por 10 segundos.</span><button type="button" class="btn-main coral admin-broadcast-btn" data-action="send-announcement">Enviar aviso · 10 segundos</button></div>'+
 '<div class="setting-actions"><button type="submit" class="btn-main" '+(state.busy?"disabled":"")+'>'+ico("check-circle",17)+' Salvar configurações</button></div></form>';
}

function maintenancePage(){
 var s=state.settings||{},active=Boolean(s.maintenance_enabled);
 return heading("CONTROLE DE LANÇAMENTOS","Atualizações <em>sob seu controle.</em>","Você decide quando mostrar a tela de atualização e quando liberar a nova versão para os usuários.")+
 '<section class="release-hero '+(active?"is-active":"")+'"><div class="release-hero-copy"><span class="release-status">✳ '+(active?"ATUALIZAÇÃO EM ANDAMENTO":"SITE DISPONÍVEL")+'</span><h2>'+(active?"Estamos preparando o próximo capítulo.":"O próximo capítulo começa com você.")+'</h2><p>'+(active?"Visitantes estão vendo a tela especial. Você continua com acesso ao painel.":"Ative o modo de atualização antes de publicar mudanças. Ao finalizar, o site volta automaticamente.")+'</p><div class="release-actions"><button type="button" class="btn-main coral" data-action="toggle-maintenance">'+ico(active?"check-circle":"refresh-cw",17)+" "+(active?"Finalizar atualização e liberar site":"Ativar modo atualização")+'</button><a href="../?maintenance_preview=1" class="btn-outline" target="_blank" rel="noopener">'+ico("external-link",15)+' Visualizar tela</a></div></div><div class="release-art" aria-hidden="true"><div class="release-halo"></div><div class="release-time"><small>ENTRE. / ATUALIZANDO</small><strong>05<span>:</span>00</strong><small>UM NOVO COMEÇO ESTÁ CHEGANDO</small></div></div></section>'
 +'<div class="release-grid"><form id="release-form" class="form-card"><h2 class="section-heading">Mensagem da atualização</h2><p class="section-desc">Personalize o texto exibido aos visitantes. Salvar o texto não muda o estado do site.</p><div class="field"><label class="form-label" for="release-title">Título principal</label><input id="release-title" type="text" name="title" class="form-input" minlength="3" maxlength="90" required value="'+e(s.maintenance_title||"Tem coisa boa chegando.")+'"></div><div class="field"><label class="form-label" for="release-message">Mensagem aos visitantes</label><textarea id="release-message" name="message" class="form-textarea" minlength="6" maxlength="320" required>'+e(s.maintenance_message||"Estamos preparando uma nova versão do entre.")+'</textarea><small class="form-hint">Será atualizada na tela de manutenção durante a próxima verificação.</small></div><div class="setting-actions"><button type="submit" class="btn-main">'+ico("check-circle",17)+' Salvar mensagem</button></div></form>'
 +'<aside class="release-guide"><h3>Seu fluxo de atualização</h3><p><strong>01 · Ativar</strong><br>Exiba a tela de atualização e pause novas interações.</p><p><strong>02 · Publicar</strong><br>Atualize o código no GitHub Pages e confira a publicação.</p><p><strong>03 · Liberar</strong><br>Desative o modo para voltar automaticamente ao site já publicado.</p><div class="release-guide-note">'+ico("shield-check",18)+' Seu painel permanece acessível durante o processo.</div></aside></div>';
}
async function saveRelease(enabled,onlyText){
 if(state.busy)return;
 var form=document.getElementById("release-form"),s=state.settings||{};
 var title=form&&form.elements.title.value.trim()||s.maintenance_title||"Tem coisa boa chegando.";
 var message=form&&form.elements.message.value.trim()||s.maintenance_message||"Estamos preparando uma nova versão do entre.";
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
 return '<section class="form-card admin-appeals"><h2 class="section-heading">Contestações de suspensão</h2><p class="section-desc">Aprovar a contestação reativa a conta.</p>'+
 (arr.length?arr.map(function(a){
  return '<article class="appeal-row"><div><strong>'+e(a.display_name||a.email||'Conta')+'</strong><small>'+e(a.email||'')+' · '+fmt(a.created_at)+'</small><p>'+e(a.message)+'</p>'+badge(a.status==='pending'?'PENDENTE':a.status==='reviewed'?'APROVADA':'REJEITADA',a.status==='pending'?'warn':'neutral')+'</div>'+
  (a.status==='pending'?'<div class="appeal-buttons"><button class="btn-main" data-action="review-appeal" data-id="'+e(a.id)+'">Aprovar e reativar</button><button class="btn-outline" data-action="reject-appeal" data-id="'+e(a.id)+'">Não aprovar</button></div>':'')+'</article>';
 }).join(''):'<p class="section-desc">Nenhuma contestação recebida.</p>')+'</section>';
}
function privacyRequestsPanel(){
 var rows=state.privacyRequests||[];
 return '<section class="form-card admin-appeals"><h2 class="section-heading">Pedidos de privacidade · LGPD</h2><p class="section-desc">Pedidos de pessoas autenticadas. Analise antes de registrar a conclusão.</p>'+
 (rows.length?rows.map(function(r){return '<article class="appeal-row"><div><strong>'+e(r.email||'Conta')+'</strong><small>'+e(r.request_type)+' · '+fmt(r.created_at)+'</small><p>'+e(r.description||'Sem descrição adicional.')+'</p>'+badge(r.status==='pending'?'PENDENTE':r.status==='handled'?'ATENDIDA':'NÃO ATENDIDA',r.status==='pending'?'warn':'neutral')+'</div>'+
 (r.status==='pending'?'<div class="appeal-buttons"><button class="btn-main" data-action="privacy-handled" data-id="'+e(r.id)+'">Marcar atendida</button><button class="btn-outline" data-action="privacy-denied" data-id="'+e(r.id)+'">Não atendida</button></div>':'')+'</article>';}).join(''):'<p class="section-desc">Nenhum pedido recebido.</p>')+'</section>';
}
function security(){
 return heading("ACESSO E PRIVACIDADE","Segurança <em>sem atalhos.</em>","O acesso administrativo é verificado no servidor. Seu navegador nunca recebe a chave secreta do Supabase.")+
 '<section class="form-card"><h2 class="section-heading">Administrador principal</h2><p class="section-desc">Conta reconhecida pela identidade Google e pela lista de autorização do banco.</p><div class="security-card"><span class="admin-avatar">'+e((state.user.email||"A").slice(0,1).toUpperCase())+'</span><div style="flex:1"><strong>'+e(state.user.email)+'</strong><small>Google verificado · administrador autorizado</small></div>'+badge("ACESSO ATIVO")+'</div>'+
 '<div class="security-note"><b>Proteção em camadas.</b> Todas as operações de usuários, denúncias, suspensões e configurações são executadas por funções SQL com verificação administrativa. O controle não depende de esconder botões ou comparar e-mails no JavaScript.</div><div class="health-row"><strong>Autenticação</strong>'+badge("Google OAuth")+'</div><div class="health-row"><strong>Banco de dados</strong>'+badge("Supabase + RLS")+'</div><div class="health-row"><strong>Conteúdo de conversas</strong>'+badge("Não acessível aqui","neutral")+'</div><div class="health-row"><strong>Endereço do painel</strong><span style="overflow-wrap:anywhere;font-size:11px">/testesite/admin/</span></div></section>'+appealsPanel()+privacyRequestsPanel();
}
function spinner(){return '<div class="loading-panel"><div class="loading-indicator"></div>Atualizando dados…</div>';}
function renderView(){
 var target=document.getElementById("admin-view");if(!target)return;
 document.querySelectorAll("[data-view]").forEach(function(el){el.classList.toggle("active",el.getAttribute("data-view")===state.view);});
 var loc=document.getElementById("topbar-location");if(loc)loc.textContent=viewTitle();
 target.innerHTML=state.loading?spinner():(state.view==="overview"?overview():state.view==="updates"?maintenancePage():state.view==="users"?users():state.view==="reports"?reports():state.view==="pairs"?pairs():state.view==="settings"?settings():security());
}
async function load(view){
 state.loading=true;renderView();
 try{
  if(view==="overview"||view==="settings"||view==="updates"||!state.overview){
   state.overview=await rpc("entre_admin_overview");state.settings=state.overview.settings||state.settings;
  }
  if(view==="users")state.users=await rpc("entre_admin_users",{_query:state.search,_limit:perPage,_offset:state.userPage*perPage});
  if(view==="reports")state.reports=await rpc("entre_admin_reports",{_status:state.reportStatus,_limit:100});
  if(view==="pairs")state.pairs=await rpc("entre_admin_pairs",{_limit:60});
  if(view==="security"){state.appeals=await rpc("entre_admin_appeals");state.privacyRequests=await rpc("entre_admin_privacy_requests");}
  state.refreshAt=new Date();lastLoad=Date.now();
 }catch(err){toast(errorText(err),true);}
 finally{state.loading=false;renderView();}
}
async function navigate(view){if(!sections.some(function(s){return s[0]===view;}))return;state.view=view;renderView();await load(view);}
function modal(content){document.getElementById("modal-root").innerHTML='<div class="modal-back" id="modal-back"><div class="modal" role="dialog" aria-modal="true" aria-label="Ação administrativa">'+content+'</div></div>';var el=document.querySelector(".modal input,.modal textarea,.modal select");if(el)el.focus();}
function closeModal(){state.modal=null;var el=document.getElementById("modal-root");if(el)el.innerHTML="";}
function openUser(id){
 var u=(state.users.rows||[]).find(function(x){return x.id===id;});if(!u)return;
 state.modal={type:"user",data:u};
 var body='<h2>'+e(u.display_name||"Conta Google")+'</h2><p>'+e(u.email)+'</p><div class="health-row"><strong>Cadastro</strong><span>'+fmt(u.created_at)+'</span></div><div class="health-row"><strong>Último login</strong><span>'+fmt(u.last_sign_in_at)+'</span></div><div class="health-row"><strong>Autenticado com Google</strong>'+badge(u.google?"SIM":"NÃO",u.google?"":"warn")+'</div><div class="health-row"><strong>Situação</strong>'+badge(u.banned?"SUSPENSO":u.admin?"ADMIN":"ATIVO",u.banned?"warn":"")+'</div>';
 if(!u.admin){body+='<form id="ban-form"><div class="field"><label for="ban-reason">Motivo da '+(u.banned?"reativação":"suspensão")+'</label><textarea class="form-textarea" id="ban-reason" name="reason" maxlength="300" placeholder="Informe um motivo para a equipe.">'+e(u.ban_reason||"")+'</textarea></div><p>'+(u.banned?"Reativar libera a conta para novas conversas.":"Suspender bloqueia novas conexões e o envio de mensagens. Conversas ativas serão encerradas.")+'</p><div class="modal-actions"><button type="button" class="btn-outline" data-action="close-modal">Cancelar</button><button type="submit" class="btn-main '+(u.banned?"":"danger")+'">'+(u.banned?"Reativar conta":"Confirmar suspensão")+'</button></div></form>';}
 else body+='<div class="modal-actions"><button class="btn-outline" data-action="close-modal">Fechar</button></div>';
 modal(body);
}
function openReport(id){
 var r=(state.reports||[]).find(function(x){return String(x.id)===String(id);});if(!r)return;
 state.modal={type:"report",data:r};
 var body='<h2>Denúncia #'+e(r.id)+'</h2><p>Enviada por '+e(r.reporter_name)+' contra '+e(r.reported_name)+'.</p><div class="health-row"><strong>Motivo</strong><span>'+e(reasonNames[r.reason]||r.reason)+'</span></div><div class="health-row"><strong>Data</strong><span>'+fmt(r.created_at)+'</span></div><div class="field"><label>Descrição informada</label><div style="white-space:pre-wrap;border:1px solid var(--line);border-radius:13px;padding:13px;line-height:1.6;overflow-wrap:anywhere;font-size:12px">'+e(r.details||"Sem descrição adicional.")+'</div></div><form id="review-form"><div class="field"><label for="review-status">Resultado da análise</label><select class="form-select" name="status" id="review-status"><option value="reviewed" '+(r.status==="reviewed"?"selected":"")+'>Analisada</option><option value="dismissed" '+(r.status==="dismissed"?"selected":"")+'>Descartada</option><option value="open" '+(r.status==="open"?"selected":"")+'>Manter pendente</option></select></div><div class="field"><label for="review-note">Observação administrativa</label><textarea id="review-note" name="note" class="form-textarea" maxlength="800" placeholder="Resumo da decisão…">'+e(r.admin_note||"")+'</textarea></div><div class="modal-actions"><button type="button" class="btn-outline" data-action="close-modal">Cancelar</button><button type="submit" class="btn-main">Salvar análise</button></div></form>';
 modal(body);
}
async function googleLogin(){
 try{
  localStorage.setItem("entre.admin.return","1");
  var r=await db.auth.signInWithOAuth({provider:"google",options:{redirectTo:"https://appswebb.github.io/testesite/",queryParams:{prompt:"select_account"}}});
  if(r.error)throw r.error;
  if(!r.data||!r.data.url)throw Error("O provedor de login não retornou uma URL.");
 }catch(err){localStorage.removeItem("entre.admin.return");toast(errorText(err),true);}
}
document.addEventListener("click",async function(ev){
 var n=ev.target.closest("[data-view],[data-action],[data-report-status]");if(!n)return;
 if(n.dataset.view){await navigate(n.dataset.view);return;}
 if(n.dataset.reportStatus){state.reportStatus=n.dataset.reportStatus;await load("reports");return;}
 var a=n.dataset.action;
 if(a==="close-modal"){closeModal();return;}
 if(a==="google"){await googleLogin();return;}
 if(a==="refresh"){await load(state.view);toast("Dados atualizados.");return;}
 if(a==="send-announcement"){
  if(state.busy)return;
  var field=document.getElementById('announcement'),notice=field&&field.value.trim();
  if(!notice||notice.length<3||notice.length>240){toast('O aviso deve ter entre 3 e 240 caracteres.',true);return;}
  if(!window.confirm('Mostrar este aviso na tela inteira por 10 segundos?'))return;
  state.busy=true;
  try{var sent=await rpc('entre_admin_publish_announcement',{_message:notice});state.settings=Object.assign({},state.settings,sent);toast('Aviso enviado por 10 segundos!');await load('settings');}
  catch(err){toast(errorText(err),true);}finally{state.busy=false;}
  return;
 }
 if(a==="review-appeal"||a==="reject-appeal"){
  if(!window.confirm(a==="review-appeal"?'Aprovar contestação e reativar?':'Rejeitar contestação?'))return;
  try{await rpc('entre_admin_review_appeal',{_id:Number(n.dataset.id),_approve:a==="review-appeal"});toast('Revisão registrada.');await load('security');}
  catch(err){toast(errorText(err),true);}return;
 }
 if(a==="privacy-handled"||a==="privacy-denied"){
  if(!window.confirm('A análise deste pedido foi concluída?'))return;
  try{await rpc('entre_admin_review_privacy_request',{_id:Number(n.dataset.id),_status:a==="privacy-handled"?'handled':'denied'});toast('Solicitação atualizada.');await load('security');}
  catch(err){toast(errorText(err),true);}return;
 }
 if(a==="toggle-maintenance"){await saveRelease(!Boolean(state.settings?.maintenance_enabled),false);return;}
 if(a==="signout"){await db.auth.signOut({scope:"local"});state.user=null;state.verified=false;gate(false);return;}
 if(a==="edit-user"){openUser(n.dataset.id);return;}
 if(a==="review"){openReport(n.dataset.id);return;}
 if(a==="prev-users"&&state.userPage>0){state.userPage--;await load("users");return;}
 if(a==="next-users"&&(state.userPage+1)*perPage<(state.users.total||0)){state.userPage++;await load("users");return;}
});
document.addEventListener("input",function(ev){
 if(ev.target.id==="user-search"){
  clearTimeout(searchTimer);var input=ev.target;state.search=input.value;state.userPage=0;
  searchTimer=setTimeout(async function(){if(state.view==="users"){var active=document.activeElement===input;await load("users");if(active){var next=document.getElementById("user-search");if(next){next.focus();next.setSelectionRange(next.value.length,next.value.length);}}}},420);
 }
});
document.addEventListener("submit",async function(ev){
 var form=ev.target;if(!(form instanceof HTMLFormElement))return;ev.preventDefault();if(form.id==="release-form"){await saveRelease(Boolean(state.settings?.maintenance_enabled),true);return;}if(state.busy)return;
 state.busy=true;var btn=form.querySelector('[type="submit"]');if(btn)btn.disabled=true;
 try{
  if(form.id==="settings-form"){
   var s=await rpc("entre_admin_save_settings",{_matchmaking:form.elements.matchmaking.checked,_reporting:form.elements.reporting.checked,_announcement:form.elements.announcement.value});
   state.settings=s;if(state.overview)state.overview.settings=s;toast("Configurações salvas no Supabase.");await load("settings");
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
document.addEventListener("keydown",function(ev){if(ev.key==="Escape")closeModal();});
document.addEventListener("click",function(ev){if(ev.target&&ev.target.id==="modal-back")closeModal();});
async function boot(){
 try{
  var s=await db.auth.getSession();if(s.error)throw s.error;
  if(!s.data.session){gate(false);return;}
  var verified=await db.auth.getUser();if(verified.error)throw verified.error;
  if(!verified.data.user){gate(false);return;}
  state.user=verified.data.user;
  var allowed=await rpc("entre_admin_check");
  if(allowed!==true){gate(true);return;}
  state.verified=true;shell();await load("overview");
  db.auth.onAuthStateChange(function(ev){if(ev==="SIGNED_OUT"){state.user=null;state.verified=false;gate(false);}});
  setInterval(function(){if(state.verified&&document.visibilityState==="visible"&&state.view==="overview"&&!state.loading&&Date.now()-lastLoad>28000){load("overview");}},30000);
 }catch(err){console.error("entre admin boot",err);gate(false);toast(errorText(err),true);}
}
boot();
})();