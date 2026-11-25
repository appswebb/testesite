package com.connect.community;

import android.app.*;
import android.content.*;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.*;
import android.text.InputType;
import android.view.*;
import android.widget.*;
import org.json.*;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.security.SecureRandom;
import java.text.NumberFormat;
import static com.connect.community.ConnectApi.obj;

/** Native Android screens. No WebView and no remote HTML application shell.
 * Pre-release client; production publication requires the checklist in README. */
public final class MainActivity extends Activity {
 private final ExecutorService io=Executors.newSingleThreadExecutor();
 private final Handler main=new Handler(Looper.getMainLooper());
 private ConnectApi api; private SharedPreferences prefs;
 private LinearLayout root,body; private ScrollView scroller; private TextView status;
 private int fg,bg,panel,muted,line; private boolean dark,foreground,busy,searching,cancelling;
 private String uid="",page="posts",pairId="",room="br",preference="any";
 private JSONObject profile,premium,settings;
 private long requestGeneration,challengeAt,registrationTouch,guardAt;
 private boolean signupConsent;
 private String challengeState,pendingEmail,pendingPassword;private boolean pendingSignup;
 private static final String[] ROUTES={"posts","connect","rooms","conversations","online","notifications","premium","profile","settings","chat"};
 interface Work<T>{T run()throws Exception;}
 interface Result<T>{void done(T value);}
 @Override public void onCreate(Bundle saved){super.onCreate(saved);api=new ConnectApi(getApplicationContext());prefs=getSharedPreferences("connect_ui",MODE_PRIVATE);dark=prefs.getBoolean("dark",false);startup();}
 @Override protected void onResume(){super.onResume();foreground=true;main.removeCallbacks(tick);main.postDelayed(tick,1500);}
 @Override protected void onPause(){foreground=false;main.removeCallbacks(tick);super.onPause();}
 @Override protected void onDestroy(){main.removeCallbacksAndMessages(null);io.shutdownNow();pendingPassword=null;challengeState=null;super.onDestroy();}
 @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);handleChallenge(intent);}
 @Override public void onBackPressed(){if("chat".equals(page)&&!busy){open("conversations");return;}if(!"posts".equals(page)&&profile!=null&&profile.optBoolean("onboarding_plan_selected")&&!busy&&!searching){open("posts");return;}super.onBackPressed();}
 private int dp(float v){return Math.round(v*getResources().getDisplayMetrics().density);}
 private GradientDrawable shape(int color,int radius,int border){GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(dp(radius));if(border!=0)d.setStroke(dp(1),border);return d;}
 private void colors(){fg=dark?0xfff5f5f6:0xff171719;bg=dark?0xff101012:0xfff5f5f6;panel=dark?0xff202024:Color.WHITE;muted=dark?0xffb3b3bb:0xff66666d;line=dark?0xff3a3a40:0xffe1e1e5;getWindow().setStatusBarColor(bg);getWindow().setNavigationBarColor(bg);}
 private LinearLayout column(){LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.VERTICAL);return l;}
 private LinearLayout row(){LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.HORIZONTAL);l.setGravity(Gravity.CENTER_VERTICAL);return l;}
 private TextView txt(String text,int sp,boolean bold,int color){TextView t=new TextView(this);t.setText(text);t.setTextSize(sp);t.setTextColor(color);if(bold)t.setTypeface(Typeface.DEFAULT,Typeface.BOLD);t.setLineSpacing(dp(2),1f);return t;}
 private void add(LinearLayout parent,View v,int top){LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);lp.topMargin=dp(top);parent.addView(v,lp);}
 private void label(LinearLayout l,String text,int sp,boolean bold){add(l,txt(text,sp,bold,bold?fg:muted),6);}
 private LinearLayout card(LinearLayout parent){LinearLayout l=column();l.setBackground(shape(panel,20,line));l.setPadding(dp(16),dp(14),dp(16),dp(14));add(parent,l,10);return l;}
 private Button btn(String text,boolean primary,Runnable click){Button b=new Button(this);b.setText(text);b.setAllCaps(false);b.setTextSize(13);b.setTypeface(Typeface.DEFAULT,Typeface.BOLD);b.setTextColor(primary?bg:fg);b.setBackground(shape(primary?fg:panel,13,primary?0:line));b.setMinHeight(dp(44));b.setPadding(dp(12),dp(6),dp(12),dp(6));b.setOnClickListener(v->{if(!busy)click.run();});return b;}
 private void button(LinearLayout l,String text,boolean primary,Runnable r){add(l,btn(text,primary,r),8);}
 private EditText field(LinearLayout l,String hint,int type,String value){EditText e=new EditText(this);e.setHint(hint);e.setText(value);e.setTextColor(fg);e.setHintTextColor(muted);e.setTextSize(15);e.setInputType(type);e.setPadding(dp(13),dp(12),dp(13),dp(12));e.setBackground(shape(panel,13,line));add(l,e,8);return e;}
 private CheckBox check(LinearLayout l,String text){CheckBox c=new CheckBox(this);c.setText(text);c.setTextSize(13);c.setTextColor(fg);add(l,c,5);return c;}
 private void external(String url){try{Uri u=Uri.parse(url);if(!"https".equals(u.getScheme()))throw new IllegalArgumentException();startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(Exception e){notice("Não foi possível abrir este link.");}}
 private void notice(String msg){if(status!=null)status.setText(msg);Toast.makeText(this,msg,Toast.LENGTH_SHORT).show();}
 private void screen(String title,String caption,boolean navigation){
  colors();root=column();root.setBackgroundColor(bg);root.setOnApplyWindowInsetsListener((v,insets)->{if(Build.VERSION.SDK_INT>=30){android.graphics.Insets i=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.ime());v.setPadding(i.left,i.top,i.right,i.bottom);}else v.setPadding(0,insets.getSystemWindowInsetTop(),0,insets.getSystemWindowInsetBottom());return insets;});
  LinearLayout header=row();header.setPadding(dp(17),dp(12),dp(17),dp(10));ImageView mark=new ImageView(this);mark.setImageResource(R.drawable.connect_mark);header.addView(mark,new LinearLayout.LayoutParams(dp(34),dp(34)));TextView name=txt("CONNECT",19,true,fg);LinearLayout.LayoutParams nameP=new LinearLayout.LayoutParams(0,-2,1);nameP.leftMargin=dp(9);header.addView(name,nameP);if(navigation){Button more=btn("Menu",false,this::menu);header.addView(more,new LinearLayout.LayoutParams(dp(78),dp(39)));}root.addView(header);
  scroller=new ScrollView(this);scroller.setFillViewport(true);body=column();body.setPadding(dp(16),dp(4),dp(16),dp(20));scroller.addView(body);root.addView(scroller,new LinearLayout.LayoutParams(-1,0,1));
  add(body,txt(title,28,true,fg),6);if(!caption.isEmpty())label(body,caption,13,false);
  status=txt("",12,false,muted);add(body,status,4);
  if(navigation){LinearLayout nav=row();nav.setPadding(dp(8),dp(6),dp(8),dp(6));nav.setBackgroundColor(panel);String[][] tabs={{"posts","Início"},{"connect","Ao vivo"},{"rooms","Salas"},{"conversations","Conversas"}};for(String[] t:tabs){Button b=btn(t[1],page.equals(t[0])||(page.equals("chat")&&t[0].equals("conversations")),()->open(t[0]));LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(0,dp(43),1);lp.setMargins(dp(2),0,dp(2),0);nav.addView(b,lp);}root.addView(nav);}
  setContentView(root);root.requestApplyInsets();
 }
 private <T> void task(Work<T> work,Result<T> result){
  if(busy||isFinishing())return;busy=true;long generation=++requestGeneration;
  if(status!=null)status.setText("Carregando…");
  io.execute(()->{try{T v=work.run();main.post(()->{if(isDestroyed()||generation!=requestGeneration)return;busy=false;if(status!=null)status.setText("");result.done(v);});}
   catch(Exception ex){main.post(()->{if(isDestroyed()||generation!=requestGeneration)return;busy=false;String msg=ex instanceof ConnectApi.ApiException?ex.getMessage():ex instanceof Gate?ex.getMessage():"Não foi possível concluir. Confira sua conexão e tente novamente.";if(ex instanceof Gate){searching=false;gate(msg);}else if(ex instanceof ConnectApi.ApiException&&((ConnectApi.ApiException)ex).invalidSession()&&!api.hasSession()){uid="";profile=null;auth(false,"Sua sessão expirou. Entre novamente.");}else {if(cancelling){cancelling=false;searching=true;encounters();}notice(msg);}});}});
 }
 private static class Gate extends Exception{Gate(String m){super(m);}}
 private void guard()throws Exception{
  if(guardAt>0&&SystemClock.elapsedRealtime()-guardAt<30000)return;
  settings=api.settings();if(!settings.has("maintenance_enabled")||settings.optBoolean("maintenance_enabled",true))throw new Gate("Estamos atualizando o CONNECT. "+settings.optString("maintenance_message","Tente novamente mais tarde."));
  if(!uid.isEmpty()){JSONObject s=(JSONObject)api.rpc("entre_my_suspension",null);if(s.optBoolean("suspended"))throw new Gate("Conta suspensa. "+s.optString("reason",""));}guardAt=SystemClock.elapsedRealtime();
 }
 private void gate(String msg){screen("Acesso indisponível",msg,false);button(body,"Verificar novamente",true,this::startup);button(body,"Sair",false,this::logout);}
 private void startup(){
  guardAt=0;screen("Seu próximo oi.","Conectando à comunidade.",false);
  button(body,"Tentar novamente",false,this::startup);
  task(()->{api.restore();settings=api.settings();if(!settings.has("maintenance_enabled")||settings.optBoolean("maintenance_enabled",true))throw new Gate("Estamos em manutenção.");
   if(!api.hasSession())return "login";
   JSONObject user=api.user();uid=user.getString("id");guard();
   JSONArray ps=api.rows("entre_profiles?select=*&id=eq."+ConnectApi.enc(uid));profile=ps.optJSONObject(0);
   if(profile==null||!profile.optBoolean("onboarding_plan_selected")){
    JSONObject resume=(JSONObject)api.rpc("connect_resume_registration",null);
    if("expired".equals(resume.optString("status"))){api.clear();uid="";profile=null;return "expired";}
    registrationTouch=System.currentTimeMillis();
   }
   if(profile==null){signupConsent=Boolean.TRUE.equals(api.rpc("connect_signup_consent_status",null));return "profile";}
   JSONObject legal=(JSONObject)api.rpc("connect_account_data",null);
   if(!legal.optBoolean("accepted"))return "legal";
   premium=(JSONObject)api.rpc("entre_premium_overview",null);
   if(!profile.optBoolean("onboarding_plan_selected")){
    if(!premium.optBoolean("active"))return "plan";
    completePlan();
   }
   return "ready";
  },stage->{switch(stage){case "login":auth(false,"");break;case "expired":auth(true,"Cadastro expirado após 30 minutos sem atividade.");break;case "profile":profileForm();break;case "legal":legalForm();break;case "plan":plan(true);break;default:restorePage();}});
 }
 private void auth(boolean signup,String info){
  profile=null;uid="";screen(signup?"Criar sua conta":"Entre no CONNECT",signup?"01 · Conta     02 · Perfil     03 · Plano":"Conheça novas pessoas, de verdade.",false);
  if(!info.isEmpty())label(body,info,13,true);
  LinearLayout form=card(body);EditText email=field(form,"E-mail",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS,"");
  EditText pass=field(form,"Senha",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD,"");
  EditText confirm=signup?field(form,"Confirmar senha",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD,""):null;
  CheckBox adult=signup?check(form,"Declaro que tenho 18 anos ou mais."):null,terms=signup?check(form,"Li e aceito os Termos de uso e a Política de privacidade."):null;
  if(signup){label(form,"12 caracteres ou mais, incluindo letras e números.",11,false);button(form,"Ler os termos",false,()->external(ConnectApi.WEBSITE+"termos.html"));button(form,"Política de privacidade",false,()->external(ConnectApi.WEBSITE+"privacidade.html"));}
  button(form,signup?"Criar conta":"Entrar",true,()->{
   String em=email.getText().toString().trim().toLowerCase(Locale.ROOT),p=pass.getText().toString();
   if(!android.util.Patterns.EMAIL_ADDRESS.matcher(em).matches()||p.isEmpty()){notice("Confira o e-mail e a senha.");return;}
   if(signup&&(!adult.isChecked()||!terms.isChecked()||p.length()<12||p.length()>128||!p.matches("(?s).*\\p{L}.*")||!p.matches("(?s).*\\d.*")||!p.equals(confirm.getText().toString()))){notice("Confirme os termos e os requisitos da senha.");return;}
   beginChallenge(em,p,signup);
  });
  button(body,signup?"Já tenho conta":"Criar uma conta",false,()->auth(!signup,""));
  if(!signup)button(body,"Recuperar senha",false,()->external(ConnectApi.WEBSITE+"?auth=login"));
 }
 private void beginChallenge(String email,String password,boolean signup){
  byte[] nonce=new byte[32];new SecureRandom().nextBytes(nonce);
  challengeState=android.util.Base64.encodeToString(nonce,android.util.Base64.URL_SAFE|android.util.Base64.NO_WRAP|android.util.Base64.NO_PADDING);
  challengeAt=SystemClock.elapsedRealtime();pendingEmail=email;pendingPassword=password;pendingSignup=signup;
  external(ConnectApi.WEBSITE+"android-captcha.html#"+challengeState);
  notice("Conclua a verificação de segurança e retorne ao aplicativo.");
 }
 private void handleChallenge(Intent intent){
  Uri data=intent.getData();if(data==null||!"connect-native".equals(data.getScheme())||!"captcha".equals(data.getHost()))return;
  String nonce=data.getQueryParameter("state"),captcha=data.getQueryParameter("token");
  if(challengeState==null||!challengeState.equals(nonce)||captcha==null||captcha.length()>4096||SystemClock.elapsedRealtime()-challengeAt>300000||pendingPassword==null||busy){notice("Verificação vencida. Tente novamente.");return;}
  String em=pendingEmail,pass=pendingPassword;boolean signup=pendingSignup;
  pendingEmail=null;pendingPassword=null;challengeState=null;intent.setData(null);
  task(()->{if(signup)return api.signup(em,pass,captcha);api.login(em,pass,captcha);return true;},ok->{if(ok)startup();else auth(false,"Confirme seu e-mail e entre para continuar. O cadastro provisório expira após 30 minutos sem atividade.");});
 }
 private void touch()throws Exception{JSONObject r=(JSONObject)api.rpc("connect_resume_registration",null);if("expired".equals(r.optString("status"))){api.clear();throw new Gate("Cadastro expirado. Crie uma nova conta.");}registrationTouch=System.currentTimeMillis();}
 private void profileForm(){
  screen("Seu perfil","02 · Perfil     03 · Plano",false);
  LinearLayout c=card(body);
  EditText name=field(c,"Seu nome",InputType.TYPE_CLASS_TEXT,""),handle=field(c,"Nome de usuário",InputType.TYPE_CLASS_TEXT,""),age=field(c,"Idade",InputType.TYPE_CLASS_NUMBER,"");
  Spinner genders=new Spinner(this);genders.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,new String[]{"Homem","Mulher","Outro"}));add(c,genders,8);
  CheckBox adult=signupConsent?null:check(c,"Declaro que tenho 18 anos ou mais."),terms=signupConsent?null:check(c,"Aceito os Termos de uso e a Política de privacidade.");
  button(c,"Concluir perfil",true,()->{
   String n=name.getText().toString().trim(),h=handle.getText().toString().trim().toLowerCase(Locale.ROOT);
   int years;try{years=Integer.parseInt(age.getText().toString());}catch(Exception e){years=0;}
   if(n.length()<2||n.length()>42||!h.matches("[a-z][a-z0-9_]{2,19}")||years<18||years>100||(!signupConsent&&(!adult.isChecked()||!terms.isChecked()))){notice("Confira os dados, a idade e os termos.");return;}
   final int y=years;String gender=new String[]{"man","woman","other"}[genders.getSelectedItemPosition()];
   task(()->{guard();touch();api.insert("entre_profiles",obj("id",uid,"display_name",n,"username",h,"age",y,"gender",gender,"preference","any"));if(!signupConsent)api.rpc("connect_accept_legal",obj("_terms","2026-11-25","_privacy","2026-11-25","_adult",true));return true;},ok->startup());
  });button(body,"Sair",false,this::logout);
 }
 private void legalForm(){
  screen("Antes de continuar","Confirme os documentos vigentes.",false);LinearLayout c=card(body);CheckBox adult=check(c,"Tenho 18 anos ou mais."),terms=check(c,"Li e aceito os termos e a política de privacidade.");button(c,"Ler documentos",false,()->external(ConnectApi.WEBSITE+"termos.html"));button(c,"Aceitar e continuar",true,()->{if(!adult.isChecked()||!terms.isChecked()){notice("Marque as duas confirmações.");return;}task(()->{guard();if(!profile.optBoolean("onboarding_plan_selected"))touch();return api.rpc("connect_accept_legal",obj("_terms","2026-11-25","_privacy","2026-11-25","_adult",true));},v->startup());});button(body,"Sair",false,this::logout);
 }
 private void completePlan()throws Exception{
  JSONArray p=api.patch("entre_profiles?id=eq."+ConnectApi.enc(uid)+"&select=onboarding_plan_selected",obj("onboarding_plan_selected",true));if(p.optJSONObject(0)==null||!p.optJSONObject(0).optBoolean("onboarding_plan_selected"))throw new IllegalStateException("Plano não confirmado.");profile.put("onboarding_plan_selected",true);
 }
 private void plan(boolean onboard){
  screen("Mais possibilidades.",onboard?"03 · Plano — última etapa":"Sua assinatura",!onboard);LinearLayout c=card(body);label(c,"CONNECT  /  PREMIUM",12,true);
  int cents=premium==null?0:premium.optInt("price_cents",0);label(c,cents>0?NumberFormat.getCurrencyInstance(new Locale("pt","BR")).format(cents/100.0)+" / mês":"Valor a consultar",28,true);
  for(String b:new String[]{"Encontros ilimitados","Filtro de gênero","Selo Premium","Banner animado GIF"})label(c,"✓  "+b,14,true);
  label(c,"Contratação manual pelo WhatsApp. A liberação depende da confirmação da equipe.",12,false);
  if(premium!=null&&premium.optBoolean("active"))label(c,"Seu Premium está ativo.",13,true);
  button(c,"Comprar pelo WhatsApp",true,()->{String url=premium==null?"":premium.optString("purchase_whatsapp");if(url.matches("https://wa\\.me/[0-9]{10,15}"))external(url);else notice("Contato de compra indisponível.");});
  button(c,"Já paguei · Atualizar acesso",false,()->task(()->{guard();if(onboard)touch();premium=(JSONObject)api.rpc("entre_premium_overview",null);if(onboard&&premium.optBoolean("active"))completePlan();return premium.optBoolean("active");},active->{if(onboard&&active)startup();else plan(onboard);}));
  if(onboard){button(body,"Continuar grátis",false,()->task(()->{guard();touch();completePlan();return true;},v->startup()));label(body,"50 encontros por dia no plano gratuito. Você pode contratar Premium depois.",12,false);button(body,"Sair",false,this::logout);}
 }
 private void restorePage(){
  page=prefs.getString("page."+uid,"posts");pairId=prefs.getString("pair."+uid,"");
  if(!Arrays.asList(ROUTES).contains(page))page="posts";
  if("chat".equals(page)&&pairId.isEmpty())page="conversations";
  open(page);
 }
 private void remember(){if(!uid.isEmpty()){prefs.edit().putString("page."+uid,page).putString("pair."+uid,"chat".equals(page)?pairId:"").apply();}}
 private void menu(){String[] names={"Online","Notificações","Premium","Perfil","Configurações","Sair"};String[] ids={"online","notifications","premium","profile","settings","logout"};new AlertDialog.Builder(this).setTitle("CONNECT").setItems(names,(d,i)->{if(ids[i].equals("logout"))logout();else open(ids[i]);}).show();}
 private void open(String view){
  if(busy)return;if(searching&&!view.equals("connect")){notice("Cancele a busca antes de mudar de página.");return;}if(!Arrays.asList(ROUTES).contains(view))return;
  page=view;remember();
  switch(view){case "posts":posts();break;case "connect":encounters();break;case "rooms":rooms();break;case "conversations":conversations();break;case "chat":chat();break;case "online":online();break;case "notifications":notifications();break;case "premium":task(()->{guard();premium=(JSONObject)api.rpc("entre_premium_overview",null);return true;},v->plan(false));break;case "profile":screen("Meu perfil","Seus dados no CONNECT.",true);LinearLayout c=card(body);label(c,profile.optString("display_name"),22,true);label(c,"@"+profile.optString("username"),13,false);label(c,"Idade: "+profile.optInt("age"),13,false);break;case "settings":screen("Configurações","Sua experiência.",true);button(body,dark?"Usar tema claro":"Usar tema escuro",false,()->{dark=!dark;prefs.edit().putBoolean("dark",dark).apply();open("settings");});button(body,"Política de privacidade",false,()->external(ConnectApi.WEBSITE+"privacidade.html"));button(body,"Sair",false,this::logout);break;}
 }
 private void posts(){
  screen("Comunidade","Compartilhe um momento.",true);
  LinearLayout compose=card(body);EditText e=field(compose,"O que você quer compartilhar?",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_MULTI_LINE,"");
  button(compose,"Publicar",true,()->{String text=e.getText().toString().trim();if(text.length()<3||text.length()>900){notice("Use de 3 a 900 caracteres.");return;}task(()->{guard();return api.rpc("entre_post_create",obj("_body",text));},v->posts());});
  LinearLayout list=column();add(body,list,8);
  task(()->{guard();return (JSONArray)api.rpc("entre_posts_feed",obj("_before",null));},rows->{if(rows.length()==0)label(list,"Ainda não há publicações.",13,false);for(int i=0;i<rows.length();i++){JSONObject p=rows.optJSONObject(i);if(p==null)continue;LinearLayout card=card(list);label(card,p.optString("author_name","Pessoa"),14,true);label(card,p.optString("body",""),15,false);if(!p.isNull("media_path"))label(card,"Publicação com mídia · visualização nativa em desenvolvimento.",11,false);button(card,"Curtir",false,()->task(()->{guard();return api.rpc("entre_post_like",obj("_post",p.getLong("id")));},v->posts()));}});
 }
 private void rooms(){
  screen("Salas","Brasil · Sala global",true);LinearLayout list=column();add(body,list,8);
  EditText e=field(body,"Enviar mensagem",InputType.TYPE_CLASS_TEXT,"");button(body,"Enviar",true,()->{String text=e.getText().toString().trim();if(text.isEmpty())return;task(()->{guard();return api.rpc("entre_room_send",obj("_room",room,"_body",text));},v->rooms());});button(body,"Atualizar",false,this::rooms);
  task(()->{guard();return ((JSONObject)api.rpc("entre_room_messages_page",obj("_room",room,"_before",null))).optJSONArray("items");},rows->{if(rows==null||rows.length()==0)label(list,"Nenhuma mensagem ainda.",13,false);else for(int i=rows.length()-1;i>=0;i--){JSONObject m=rows.optJSONObject(i);if(m==null)continue;LinearLayout c=card(list);label(c,m.optString("display_name","Pessoa"),12,true);label(c,m.optString("body"),14,false);}});
 }
 private void conversations(){
  screen("Conversas","Suas conexões permanentes.",true);LinearLayout list=column();add(body,list,8);
  task(()->{guard();JSONArray pairs=api.rows("entre_pairs?select=id,a,b,status&or=(a.eq."+uid+",b.eq."+uid+")&status=eq.connected&order=created_at.desc&limit=50");JSONArray preferences=(JSONArray)api.rpc("entre_conversation_list",null);Set<String> hidden=new HashSet<>();for(int i=0;i<preferences.length();i++){JSONObject p=preferences.optJSONObject(i);if(p!=null&&!p.isNull("hidden_at"))hidden.add(p.optString("pair_id"));}JSONArray result=new JSONArray();for(int i=0;i<pairs.length();i++){JSONObject p=pairs.getJSONObject(i);if(hidden.contains(p.optString("id")))continue;String other=uid.equals(p.optString("a"))?p.optString("b"):p.optString("a");JSONArray person=api.rows("entre_profiles?select=display_name,username&id=eq."+ConnectApi.enc(other));JSONObject personRow=person.optJSONObject(0);p.put("name",personRow==null?"Conexão":personRow.optString("display_name","Conexão"));result.put(p);}return result;},pairs->{if(pairs.length()==0)label(list,"Nenhuma conversa permanente.",13,false);for(int i=0;i<pairs.length();i++){JSONObject p=pairs.optJSONObject(i);if(p==null)continue;button(list,p.optString("name")+"  ›",false,()->{pairId=p.optString("id");open("chat");});}});
 }
 private void online(){
  screen("Online","Pessoas disponíveis na comunidade.",true);LinearLayout list=column();add(body,list,8);task(()->{guard();return ((JSONObject)api.rpc("entre_online_page",obj("_offset",0,"_limit",12))).optJSONArray("rows");},rows->{if(rows==null||rows.length()==0){label(list,"Ninguém disponível agora.",13,false);return;}for(int i=0;i<rows.length();i++){JSONObject p=rows.optJSONObject(i);if(p==null)continue;LinearLayout c=card(list);label(c,p.optString("display_name"),15,true);label(c,"@"+p.optString("username")+" · "+p.optInt("age")+" anos",12,false);}});
 }
 private void notifications(){
  screen("Notificações","Últimas 24 horas.",true);LinearLayout list=column();add(body,list,8);
  task(()->{guard();return new JSONObject().put("personal",api.rpc("entre_notifications_page",obj("_before",null))).put("official",api.rpc("entre_bulletins_feed",null));},all->{
   JSONObject personal=all.optJSONObject("personal"),official=all.optJSONObject("official");JSONArray notices=official==null?null:official.optJSONArray("items");if(notices!=null)for(int i=0;i<notices.length();i++){JSONObject n=notices.optJSONObject(i);if(n==null)continue;LinearLayout c=card(list);label(c,n.optString("title"),15,true);label(c,n.optString("body"),13,false);JSONArray options=n.optJSONArray("options");if(options!=null&&n.isNull("my_vote"))for(int j=0;j<options.length();j++){final int choice=j;button(c,options.optString(j),false,()->task(()->{guard();return api.rpc("entre_bulletin_vote",obj("_bulletin",n.getLong("id"),"_option",choice));},v->notifications()));}}
   JSONArray rows=personal==null?null:personal.optJSONArray("rows");if(rows==null||rows.length()==0)label(list,"Nenhuma notificação pessoal.",13,false);else for(int i=0;i<rows.length();i++){JSONObject n=rows.optJSONObject(i);if(n==null)continue;LinearLayout c=card(list);label(c,n.optString("actor_name","CONNECT"),14,true);label(c,notificationLabel(n.optString("kind")),12,false);}});
 }
 private String notificationLabel(String k){switch(k){case "message":return "Nova mensagem";case "matched":return "Novo match";case "follow":return "Solicitação para seguir";case "account_suspended":return "Conta suspensa";case "account_restored":return "Conta reativada";case "retention":return "Conversa próxima da expiração";default:return "Atualização na comunidade";}}
 private void encounters(){
  screen("Ao vivo","Uma conversa muda tudo.",true);LinearLayout c=card(body);label(c,"5 minutos · Texto",21,true);label(c,"Encontre uma pessoa nova. Se os dois quiserem continuar, a conversa permanece.",13,false);
  if(searching){label(c,"Buscando alguém…",15,true);button(c,"Cancelar busca",false,this::cancelSearch);return;}
  if(premium!=null&&premium.optBoolean("active")){Spinner gender=new Spinner(this);gender.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,new String[]{"Aleatório","Homens","Mulheres","Outros"}));add(c,gender,8);button(c,"Encontrar alguém",true,()->{preference=new String[]{"any","man","woman","other"}[gender.getSelectedItemPosition()];startSearch();});}else{label(c,"Gênero aleatório",12,false);button(c,"Encontrar alguém",true,()->{preference="any";startSearch();});}
  button(body,"Ver encontros ativos",false,()->task(()->{guard();return api.rows("entre_pairs?select=id&or=(a.eq."+uid+",b.eq."+uid+")&status=eq.active&expires_at=gt."+ConnectApi.enc(Instant.now().toString())+"&limit=1");},rows->{JSONObject p=rows.optJSONObject(0);if(p==null)notice("Nenhum encontro ativo.");else{pairId=p.optString("id");open("chat");}}));
 }
 private void startSearch(){searching=true;cancelling=false;encounters();poll();}
 private void poll(){
  if(!searching||!foreground||busy||cancelling)return;
  task(()->{guard();return (JSONObject)api.rpc("entre_find_mode_location",obj("_preference",preference,"_mode","chat","_target_state",null,"_target_city",null));},r->{
   String s=r.optString("status");if("matched".equals(s)){searching=false;pairId=r.optString("pair_id");open("chat");}else if("daily_limit".equals(s)){searching=false;encounters();notice("Limite diário alcançado.");}
  });
 }
 private void cancelSearch(){
  cancelling=true;searching=false;task(()->api.rpc("connect_cancel_search",null),value->{cancelling=false;JSONObject r=(JSONObject)value;if("matched".equals(r.optString("status"))){pairId=r.optString("pair_id");open("chat");}else encounters();});
 }
 private void chat(){
  if(pairId.isEmpty()){open("conversations");return;}
  screen("Conversa","Mensagens privadas protegidas pelo servidor.",true);LinearLayout list=column();add(body,list,8);EditText e=field(body,"Sua mensagem",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_MULTI_LINE,"");
  button(body,"Enviar",true,()->{String text=e.getText().toString().trim();if(text.isEmpty())return;String pair=pairId;task(()->{guard();return api.insert("entre_messages",obj("pair_id",pair,"sender_id",uid,"body",text));},v->chat());});
  button(body,"Atualizar mensagens",false,this::chat);
  String pair=pairId;task(()->{guard();JSONArray ps=api.rows("entre_pairs?select=id,status,expires_at,mode,a,b&id=eq."+ConnectApi.enc(pair));JSONObject p=ps.optJSONObject(0);if(p==null||"closed".equals(p.optString("status")))return obj("closed",true);return obj("pair",p,"messages",api.rows("entre_messages?select=id,body,sender_id,created_at&pair_id=eq."+ConnectApi.enc(pair)+"&deleted_at=is.null&order=id.desc&limit=40"));},data->{
   if(data.optBoolean("closed")){pairId="";open("conversations");notice("Conversa indisponível.");return;}
   JSONObject p=data.optJSONObject("pair");if(p==null)return;
   if("active".equals(p.optString("status"))&&"video".equals(p.optString("mode"))){screen("Videochamada","A chamada pertence à versão web. O suporte nativo a vídeo ainda não está disponível nesta versão de desenvolvimento.",true);button(body,"Voltar",false,()->open("connect"));return;}
   if("active".equals(p.optString("status"))){
    label(list,"Encontro temporário · termina às "+p.optString("expires_at"),11,false);
    button(list,"Continuar depois do encontro",true,()->task(()->{guard();return api.rpc("entre_vote",obj("_pair",pair,"_accept",true));},v->chat()));
    button(list,"Encerrar encontro",false,()->task(()->{guard();return api.rpc("entre_close",obj("_pair",pair));},v->{pairId="";open("connect");}));
   }
   JSONArray rows=data.optJSONArray("messages");if(rows!=null)for(int i=rows.length()-1;i>=0;i--){JSONObject m=rows.optJSONObject(i);if(m==null)continue;LinearLayout c=card(list);label(c,uid.equals(m.optString("sender_id"))?"Você":"Conexão",11,true);label(c,m.optString("body"),15,false);}
  });
 }
 private final Runnable tick=new Runnable(){@Override public void run(){if(!foreground||isDestroyed())return;if(searching&&!busy)poll();main.postDelayed(this,3500);}};
 private void logout(){String owner=uid;searching=false;task(()->{if(api.hasSession()){try{api.rpc("entre_leave",null);}catch(Exception ignored){}api.logout();}return true;},v->{prefs.edit().remove("page."+owner).remove("pair."+owner).apply();uid="";profile=null;premium=null;pairId="";page="posts";auth(false,"Você saiu da conta.");});}
}
