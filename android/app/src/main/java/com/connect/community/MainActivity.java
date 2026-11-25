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
 private JSONObject profile,premium,settings,currentPair;
 private NativeVideo video; private final NativeRealtime realtime=new NativeRealtime(); private String matchMode="chat",targetState="",targetCity="",liveId=""; private boolean livePublisher,dirty,mediaPicker,videoActive,cancelPending,restricted; private long lastPoll; private JSONObject accountPrefs; private LinearLayout liveMessages; private String mediaTarget="",mediaCaption="",mediaPair=""; private String draftChat=""; private final Map<String,String> chatDrafts=new HashMap<>(); private String draftPair=""; private long lastSync,lastChat,lastPresence,lastRoom; private LinearLayout chatList,roomList; private EditText chatInput; private TextView countdown; private FrameLayout videoFrame; private Runnable permissionAction;
 private long requestGeneration,challengeAt,registrationTouch,guardAt;
 private boolean signupConsent; private volatile boolean mandatoryUpdate; private JSONObject requiredRelease; private long lastReleaseCheck;
 private String challengeState,pendingEmail,pendingPassword;private boolean pendingSignup;
 private static final String[] ROUTES={"posts","connect","rooms","conversations","online","notifications","premium","profile","settings","chat","stories","lives","search","support"};
 interface Work<T>{T run()throws Exception;}
 interface Result<T>{void done(T value);}
 @Override public void onCreate(Bundle saved){super.onCreate(saved);api=new ConnectApi(getApplicationContext());video=new NativeVideo(this);prefs=getSharedPreferences("connect_ui",MODE_PRIVATE);dark=prefs.getBoolean("dark",false);startup();}
 @Override protected void onResume(){super.onResume();foreground=true;guardAt=0;dirty=true;main.removeCallbacks(tick);main.postDelayed(tick,1500);}
 @Override protected void onPause(){foreground=false;realtime.stop();stopVideo();main.removeCallbacks(tick);super.onPause();}
 @Override protected void onDestroy(){realtime.stop();video.destroy();main.removeCallbacksAndMessages(null);io.shutdownNow();pendingPassword=null;challengeState=null;super.onDestroy();}
 @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);handleChallenge(intent);}
 @Override public void onBackPressed(){if("chat".equals(page)&&!busy){open("conversations");return;}if(searching||cancelPending){cancelSearch();return;}if(!"posts".equals(page)&&profile!=null&&profile.optBoolean("onboarding_plan_selected")&&!busy&&!searching){open("posts");return;}super.onBackPressed();}
 private int dp(float v){return Math.round(v*getResources().getDisplayMetrics().density);}
 private GradientDrawable shape(int color,int radius,int border){GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(dp(radius));if(border!=0)d.setStroke(dp(1),border);return d;}
 private void colors(){fg=dark?0xfff5f5f6:0xff171719;bg=dark?0xff101012:0xfff5f5f6;panel=dark?0xff202024:Color.WHITE;muted=dark?0xffb3b3bb:0xff66666d;line=dark?0xff3a3a40:0xffe1e1e5;getWindow().setStatusBarColor(bg);getWindow().setNavigationBarColor(bg);}
 private LinearLayout column(){LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.VERTICAL);return l;}
 private LinearLayout row(){LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.HORIZONTAL);l.setGravity(Gravity.CENTER_VERTICAL);return l;}
 private TextView txt(String text,int sp,boolean bold,int color){TextView t=new TextView(this);t.setText(text);t.setTextSize(sp);t.setTextColor(color);if(bold)t.setTypeface(Typeface.DEFAULT,Typeface.BOLD);t.setLineSpacing(dp(2),1f);return t;}
 private void add(LinearLayout parent,View v,int top){LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);lp.topMargin=dp(top);parent.addView(v,lp);}
 private void label(LinearLayout l,String text,int sp,boolean bold){add(l,txt(text,sp,bold,bold?fg:muted),6);}
 private LinearLayout card(LinearLayout parent){LinearLayout l=column();l.setBackground(shape(panel,20,line));l.setPadding(dp(16),dp(14),dp(16),dp(14));add(parent,l,10);return l;}
 private Button btn(String text,boolean primary,Runnable click){Button b=new Button(this);b.setText(text);b.setAllCaps(false);b.setTextSize(13);b.setTypeface(Typeface.DEFAULT,Typeface.BOLD);b.setTextColor(primary?bg:fg);b.setBackground(shape(primary?fg:panel,13,primary?0:line));b.setMinHeight(dp(44));b.setPadding(dp(12),dp(6),dp(12),dp(6));b.setOnClickListener(v->{if(!busy||"Cancelar busca".equals(text))click.run();});return b;}
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
   catch(Exception ex){main.post(()->{if(isDestroyed()||generation!=requestGeneration)return;busy=false;String msg=errorMessage(ex);if(ex instanceof Gate){searching=false;gate(msg);}else if(ex instanceof ConnectApi.ApiException&&((ConnectApi.ApiException)ex).invalidSession()&&!api.hasSession()){uid="";profile=null;auth(false,"Sua sessão expirou. Entre novamente.");}else {if(cancelling){cancelling=false;cancelPending=true;searching=false;encounters();}notice(msg);}});}});
 }
 private String errorMessage(Exception ex){if(ex instanceof Gate)return ex.getMessage();if(ex instanceof ConnectApi.ApiException){ConnectApi.ApiException a=(ConnectApi.ApiException)ex;switch(a.code){case "captcha_failed":return "A verificação de segurança falhou. Faça o desafio novamente.";case "invalid_credentials":return "E-mail ou senha incorretos.";case "email_not_confirmed":return "Confirme seu e-mail antes de entrar.";case "over_email_send_rate_limit":case "over_request_rate_limit":return "Muitas tentativas. Aguarde antes de tentar novamente.";case "weak_password":return "A senha não atende aos requisitos de segurança.";case "23505":return "Este nome de usuário já está em uso. Escolha outro.";default:return a.getMessage();}}if(ex instanceof org.json.JSONException)return "O servidor retornou dados inesperados. Tente novamente.";return "Não foi possível concluir. Confira sua conexão e tente novamente.";}
 private static class Gate extends Exception{Gate(String m){super(m);}}
 private void guard()throws Exception{
  if(mandatoryUpdate||SystemClock.elapsedRealtime()-lastReleaseCheck>=30000)checkRelease();
  if(guardAt>0&&SystemClock.elapsedRealtime()-guardAt<30000)return;
  settings=api.settings();if(!settings.has("maintenance_enabled")||settings.optBoolean("maintenance_enabled",true))throw new Gate("Estamos atualizando o CONNECT. "+settings.optString("maintenance_message","Tente novamente mais tarde."));
  if(!uid.isEmpty()){JSONObject s=(JSONObject)api.rpc("entre_my_suspension",null);if(s.optBoolean("suspended"))throw new Gate("Conta suspensa. "+s.optString("reason",""));}guardAt=SystemClock.elapsedRealtime();
 }
 private void gate(String msg){restricted=true;realtime.stop();stopVideo();if(mandatoryUpdate){updateScreen();return;}screen("Acesso indisponível",msg,false);button(body,"Verificar novamente",true,this::startup);button(body,"Sair",false,this::logout);}
 private void startup(){
  restricted=true;guardAt=0;screen("Seu próximo oi.","Conectando à comunidade.",false);
  button(body,"Tentar novamente",false,this::startup);
  task(()->{checkRelease();api.restore();settings=api.settings();if(!settings.has("maintenance_enabled")||settings.optBoolean("maintenance_enabled",true))throw new Gate("Estamos em manutenção.");
   if(!api.hasSession())return "login";
   JSONObject user=api.user();uid=user.getString("id");guard();
   JSONArray ps=api.rows("entre_profiles?select=*&id=eq."+ConnectApi.enc(uid));profile=ps.optJSONObject(0);
   if(profile==null||!profile.optBoolean("onboarding_plan_selected")){
    JSONObject resume=(JSONObject)api.rpc("connect_resume_registration",null);
    if("expired".equals(resume.optString("status"))){api.clear();uid="";profile=null;return "expired";}
    registrationTouch=System.currentTimeMillis();
   }
   if(profile==null){signupConsent=Boolean.TRUE.equals(api.rpc("connect_signup_consent_status",null));return "profile";}
   JSONObject legal=(JSONObject)api.rpc("connect_account_data",null);accountPrefs=legal.optJSONObject("preferences");if(accountPrefs!=null)dark="dark".equals(accountPrefs.optString("theme"));
   if(!legal.optBoolean("accepted"))return "legal";
   premium=(JSONObject)api.rpc("entre_premium_overview",null);
   if(!profile.optBoolean("onboarding_plan_selected")){
    if(!premium.optBoolean("active"))return "plan";
    completePlan();
   }
   return "ready";
  },stage->{switch(stage){case "login":auth(false,"");break;case "expired":auth(true,"Cadastro expirado após 30 minutos sem atividade.");break;case "profile":profileForm();break;case "legal":legalForm();break;case "plan":plan(true);break;default:restricted=false;restorePage();}});
 }
 private void auth(boolean signup,String info){
  challengeState=null;pendingPassword=null;pendingEmail=null;restricted=true;realtime.stop();stopVideo();profile=null;uid="";screen(signup?"Criar sua conta":"Entre no CONNECT",signup?"01 · Conta     02 · Perfil     03 · Plano":"Conheça novas pessoas, de verdade.",false);
  if(!info.isEmpty())label(body,info,13,true);
  LinearLayout form=card(body);EditText email=field(form,"E-mail",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS,"");
  EditText pass=field(form,"Senha",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD,"");
  EditText confirm=signup?field(form,"Confirmar senha",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD,""):null;
  CheckBox reveal=check(form,"Mostrar senha");reveal.setOnCheckedChangeListener((b,checked)->{for(EditText input:new EditText[]{pass,confirm})if(input!=null){int pos=input.getSelectionEnd();input.setTransformationMethod(checked?null:android.text.method.PasswordTransformationMethod.getInstance());input.setSelection(Math.max(0,Math.min(input.length(),pos)));}});
  CheckBox adult=signup?check(form,"Declaro que tenho 18 anos ou mais."):null,terms=signup?check(form,"Li e aceito os Termos de uso e a Política de privacidade."):null;
  if(signup){label(form,"12 caracteres ou mais, incluindo letras e números.",11,false);button(form,"Ler os termos",false,()->external(ConnectApi.WEBSITE+"termos.html"));button(form,"Política de privacidade",false,()->external(ConnectApi.WEBSITE+"privacidade.html"));}
  button(form,signup?"Criar conta":"Entrar",true,()->{
   String em=email.getText().toString().trim().toLowerCase(Locale.ROOT),p=pass.getText().toString();
   if(!android.util.Patterns.EMAIL_ADDRESS.matcher(em).matches()||p.isEmpty()){notice("Confira o e-mail e a senha.");return;}
   if(signup){
    if(!adult.isChecked()){notice("Confirme que você tem 18 anos ou mais.");return;}
    if(!terms.isChecked()){notice("Marque o aceite dos Termos de uso e da Política de privacidade.");return;}
    if(p.length()<12||p.length()>128||!p.matches("(?s).*[a-zA-ZÀ-ÿ].*")||!p.matches("(?s).*\\d.*")){notice("A senha precisa ter de 12 a 128 caracteres, com letras e números.");return;}
    if(!p.equals(confirm.getText().toString())){notice("As senhas não coincidem.");return;}
   }
   beginChallenge(em,p,signup);
  });
  button(body,signup?"Já tenho conta":"Criar uma conta",false,()->auth(!signup,""));
  if(!signup)button(body,"Recuperar senha",false,()->external(ConnectApi.WEBSITE+"?auth=login"));
 }
 private void beginChallenge(String email,String password,boolean signup){
  if(mandatoryUpdate){updateScreen();return;}
  byte[] nonce=new byte[32];new SecureRandom().nextBytes(nonce);
  challengeState=android.util.Base64.encodeToString(nonce,android.util.Base64.URL_SAFE|android.util.Base64.NO_WRAP|android.util.Base64.NO_PADDING);
  challengeAt=SystemClock.elapsedRealtime();pendingEmail=email;pendingPassword=password;pendingSignup=signup;
  external(ConnectApi.WEBSITE+"android-captcha.html#"+challengeState);
  notice("Conclua a verificação de segurança e retorne ao aplicativo.");
 }
 private void handleChallenge(Intent intent){
  Uri data=intent.getData();if(data==null||!"connect-native".equals(data.getScheme())||!"captcha".equals(data.getHost()))return;
  String nonce=data.getQueryParameter("state"),captcha=data.getQueryParameter("token");
  if(challengeState==null||!challengeState.equals(nonce)||captcha==null||captcha.isEmpty()||captcha.length()>4096||SystemClock.elapsedRealtime()-challengeAt>300000||pendingPassword==null||busy){intent.setData(null);notice("A verificação não pôde ser concluída. Toque em Entrar ou Criar conta para tentar novamente.");return;}
  String em=pendingEmail,pass=pendingPassword;boolean signup=pendingSignup;
  pendingEmail=null;pendingPassword=null;challengeState=null;intent.setData(null);
  task(()->{checkRelease();if(signup)return api.signup(em,pass,captcha);api.login(em,pass,captcha);return true;},ok->{if(ok)startup();else auth(false,"Confirme seu e-mail e entre para continuar. O cadastro provisório expira após 30 minutos sem atividade.");});
 }
 private void touch()throws Exception{JSONObject r=(JSONObject)api.rpc("connect_resume_registration",null);if("expired".equals(r.optString("status"))){api.clear();throw new Gate("Cadastro expirado. Crie uma nova conta.");}registrationTouch=System.currentTimeMillis();}
 private void profileForm(){
  screen("Seu perfil","02 · Perfil     03 · Plano",false);
  LinearLayout c=card(body);
  JSONObject saved=registrationDraft();EditText name=field(c,"Seu nome",InputType.TYPE_CLASS_TEXT,saved.optString("name")),handle=field(c,"Nome de usuário",InputType.TYPE_CLASS_TEXT,saved.optString("handle")),age=field(c,"Idade",InputType.TYPE_CLASS_NUMBER,saved.optString("age"));
  Spinner genders=new Spinner(this);genders.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,new String[]{"Homem","Mulher","Outro"}));add(c,genders,8);genders.setSelection(Math.max(0,Math.min(2,saved.optInt("gender",0))));
  android.text.TextWatcher watcher=new android.text.TextWatcher(){public void beforeTextChanged(CharSequence s,int a,int count,int after){}public void onTextChanged(CharSequence s,int a,int before,int count){saveRegistrationDraft(name,handle,age,genders);registrationInteraction();}public void afterTextChanged(android.text.Editable e){}};name.addTextChangedListener(watcher);handle.addTextChangedListener(watcher);age.addTextChangedListener(watcher);
  CheckBox adult=signupConsent?null:check(c,"Declaro que tenho 18 anos ou mais."),terms=signupConsent?null:check(c,"Aceito os Termos de uso e a Política de privacidade.");
  button(c,"Concluir perfil",true,()->{
   String n=name.getText().toString().trim(),h=handle.getText().toString().trim().toLowerCase(Locale.ROOT);
   int years;try{years=Integer.parseInt(age.getText().toString());}catch(Exception e){years=0;}
   if(n.length()<2||n.length()>42){notice("Informe um nome de 2 a 42 caracteres.");return;}
   if(!h.matches("[a-z][a-z0-9_]{2,19}")){notice("Use um @usuário de 3 a 20 caracteres, começando com letra, sem espaços.");return;}
   if(years<18||years>100){notice("Informe sua idade entre 18 e 100 anos.");return;}
   if(!signupConsent&&(!adult.isChecked()||!terms.isChecked())){notice("Confirme a maioridade e aceite os termos.");return;}
   final int y=years;String gender=new String[]{"man","woman","nonbinary"}[genders.getSelectedItemPosition()];
   task(()->{guard();touch();JSONArray existing=api.rows("entre_profiles?select=id&id=eq."+ConnectApi.enc(uid));if(existing.length()==0)api.insert("entre_profiles",obj("id",uid,"display_name",n,"username",h,"age",y,"gender",gender,"preference","any"));if(!signupConsent)api.rpc("connect_accept_legal",obj("_terms","2026-11-25","_privacy","2026-11-25","_adult",true));return true;},ok->{prefs.edit().remove("registration."+uid).apply();startup();});
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
 private void menu(){String[] names={"Online","Buscar pessoas","Stories","Lives","Notificações","Premium","Perfil","Configurações","Suporte","Sair"};String[] ids={"online","search","stories","lives","notifications","premium","profile","settings","support","logout"};new AlertDialog.Builder(this).setTitle("CONNECT").setItems(names,(d,i)->{if(ids[i].equals("logout"))logout();else open(ids[i]);}).show();}
 private void open(String view){
  if(mandatoryUpdate){updateScreen();return;}if(busy)return;if((searching||cancelPending)&&!view.equals("connect")){notice("Cancele a busca antes de mudar de página.");return;}if(!Arrays.asList(ROUTES).contains(view))return;
  if(!page.equals(view)){stopVideo();liveId="";liveMessages=null;if("chat".equals(page)&&chatInput!=null&&!draftPair.isEmpty())chatDrafts.put(uid+":"+draftPair,chatInput.getText().toString());}page=view;remember();dirty=true;
  switch(view){case "stories":stories();break;case "lives":lives();break;case "search":peopleSearch();break;case "support":support();break;case "posts":posts();break;case "connect":encounters();break;case "rooms":rooms();break;case "conversations":conversations();break;case "chat":chat();break;case "online":online();break;case "notifications":notifications();break;case "premium":task(()->{guard();premium=(JSONObject)api.rpc("entre_premium_overview",null);return true;},v->plan(false));break;case "profile":myProfile();break;case "settings":settingsPage();break;}
 }
 private void posts(){
  screen("Comunidade","Compartilhe um momento.",true);button(body,"Stories · 24 horas",false,()->open("stories"));button(body,"Lives",false,()->open("lives"));
  LinearLayout compose=card(body);EditText e=field(compose,"O que você quer compartilhar?",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_MULTI_LINE,"");
  button(compose,"Publicar",true,()->{String text=e.getText().toString().trim();if(text.length()<3||text.length()>900){notice("Use de 3 a 900 caracteres.");return;}task(()->{guard();return api.rpc("entre_post_create",obj("_body",text));},v->posts());});
  button(compose,"Adicionar foto ou vídeo",false,()->chooseMedia("post",e.getText().toString()));
  LinearLayout list=column();add(body,list,8);
  task(()->{guard();return (JSONArray)api.rpc("entre_posts_feed",obj("_before",null));},rows->{if(rows.length()==0)label(list,"Ainda não há publicações.",13,false);for(int i=0;i<rows.length();i++){JSONObject p=rows.optJSONObject(i);if(p==null)continue;LinearLayout card=card(list);label(card,p.optString("author_name","Pessoa"),14,true);label(card,p.optString("body",""),15,false);if(!p.isNull("media_path"))button(card,"Ver mídia",false,()->preview("entre-post-media",p.optString("media_path"),p.optString("media_type")));button(card,"Comentários",false,()->comments(p.optLong("id")));button(card,"Ver perfil",false,()->person(p.optString("author_id")));if(uid.equals(p.optString("author_id")))button(card,"Editar publicação",false,()->editPost(p));if(uid.equals(p.optString("author_id")))button(card,"Excluir publicação",false,()->confirm("Excluir publicação?",()->task(()->api.rpc("entre_post_delete",obj("_post",p.optLong("id"))),v->posts())));button(card,"Curtir",false,()->task(()->{guard();return api.rpc("entre_post_like",obj("_post",p.getLong("id")));},v->posts()));}});
 }
 private void rooms(){
  screen("Salas",room.equals("br")?"Brasil · Sala global":room,true);button(body,"Escolher sala",false,this::roomChoice);LinearLayout list=column();roomList=list;add(body,list,8);
  EditText e=field(body,"Enviar mensagem",InputType.TYPE_CLASS_TEXT,"");button(body,"Enviar",true,()->{String text=e.getText().toString().trim();if(text.isEmpty())return;task(()->{guard();return api.rpc("entre_room_send",obj("_room",room,"_body",text));},v->{e.setText("");refreshRoom();});});button(body,"Atualizar",false,this::refreshRoom);
  refreshRoom();
 }
 private void conversations(){
  screen("Conversas","Suas conexões permanentes.",true);LinearLayout list=column();add(body,list,8);
  task(()->{guard();JSONArray pairs=api.rows("entre_pairs?select=id,a,b,status&or=(a.eq."+uid+",b.eq."+uid+")&status=eq.connected&order=created_at.desc&limit=50");JSONArray preferences=(JSONArray)api.rpc("entre_conversation_list",null);Set<String> hidden=new HashSet<>();for(int i=0;i<preferences.length();i++){JSONObject p=preferences.optJSONObject(i);if(p!=null&&!p.isNull("hidden_at"))hidden.add(p.optString("pair_id"));}JSONArray result=new JSONArray();for(int i=0;i<pairs.length();i++){JSONObject p=pairs.getJSONObject(i);if(hidden.contains(p.optString("id")))continue;String other=uid.equals(p.optString("a"))?p.optString("b"):p.optString("a");JSONArray person=api.rows("entre_profiles?select=display_name,username&id=eq."+ConnectApi.enc(other));JSONObject personRow=person.optJSONObject(0);p.put("name",personRow==null?"Conexão":personRow.optString("display_name","Conexão"));result.put(p);}return result;},pairs->{if(pairs.length()==0)label(list,"Nenhuma conversa permanente.",13,false);for(int i=0;i<pairs.length();i++){JSONObject p=pairs.optJSONObject(i);if(p==null)continue;button(list,p.optString("name")+"  ›",false,()->{pairId=p.optString("id");open("chat");});}});
 }
 private void online(){
  screen("Online","Pessoas disponíveis na comunidade.",true);button(body,"Solicitações recebidas",false,this::inbox);button(body,"Buscar",false,()->open("search"));LinearLayout list=column();add(body,list,8);task(()->{guard();return ((JSONObject)api.rpc("entre_online_page",obj("_offset",0,"_limit",12))).optJSONArray("rows");},rows->{if(rows==null||rows.length()==0){label(list,"Ninguém disponível agora.",13,false);return;}for(int i=0;i<rows.length();i++){JSONObject p=rows.optJSONObject(i);if(p==null)continue;LinearLayout c=card(list);label(c,p.optString("display_name"),15,true);label(c,"@"+p.optString("username")+" · "+p.optInt("age")+" anos",12,false);button(c,"Ver perfil",false,()->person(p.optString("id")));}});
 }
 private void notifications(){
  screen("Notificações","Últimas 24 horas.",true);button(body,"Marcar como lidas",false,()->task(()->api.rpc("entre_notifications_read",obj("_until",null)),v->notifications()));button(body,"Limpar notificações",false,()->confirm("Limpar notificações pessoais?",()->task(()->api.rpc("entre_notifications_clear",obj("_id",null)),v->notifications())));LinearLayout list=column();add(body,list,8);
  task(()->{guard();return new JSONObject().put("personal",api.rpc("entre_notifications_page",obj("_before",null))).put("official",api.rpc("entre_bulletins_feed",null));},all->{
   JSONObject personal=all.optJSONObject("personal"),official=all.optJSONObject("official");JSONArray notices=official==null?null:official.optJSONArray("items");if(notices!=null)for(int i=0;i<notices.length();i++){JSONObject n=notices.optJSONObject(i);if(n==null)continue;LinearLayout c=card(list);label(c,n.optString("title"),15,true);label(c,n.optString("body"),13,false);JSONArray options=n.optJSONArray("options");if(options!=null&&n.isNull("my_vote"))for(int j=0;j<options.length();j++){final int choice=j;button(c,options.optString(j),false,()->task(()->{guard();return api.rpc("entre_bulletin_vote",obj("_bulletin",n.getLong("id"),"_option",choice));},v->notifications()));}}
   JSONArray rows=personal==null?null:personal.optJSONArray("rows");if(rows==null||rows.length()==0)label(list,"Nenhuma notificação pessoal.",13,false);else for(int i=0;i<rows.length();i++){JSONObject n=rows.optJSONObject(i);if(n==null)continue;LinearLayout c=card(list);label(c,n.optString("actor_name","CONNECT"),14,true);label(c,notificationLabel(n.optString("kind")),12,false);}});
 }
 private String notificationLabel(String k){switch(k){case "message":return "Nova mensagem";case "matched":return "Novo match";case "follow":return "Solicitação para seguir";case "account_suspended":return "Conta suspensa";case "account_restored":return "Conta reativada";case "retention":return "Conversa próxima da expiração";default:return "Atualização na comunidade";}}
 private void encounters(){
  screen("Ao vivo","Uma conversa muda tudo.",true);LinearLayout c=card(body);label(c,"5 minutos · Texto ou vídeo",21,true);label(c,"Encontre uma pessoa nova. Se os dois quiserem continuar, a conversa permanece.",13,false);
  if(searching||cancelPending){label(c,cancelPending?"Cancelamento pendente · tente novamente":"Buscando alguém…",15,true);button(c,"Cancelar busca",false,this::cancelSearch);return;}
  Spinner modes=new Spinner(this);modes.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,new String[]{"Chat por texto","Chamada de vídeo"}));add(c,modes,8);EditText uf=field(c,"Estado (opcional, ex. SP)",InputType.TYPE_CLASS_TEXT,targetState),city=field(c,"Cidade (opcional)",InputType.TYPE_CLASS_TEXT,targetCity);Runnable search=()->{matchMode=modes.getSelectedItemPosition()==1?"video":"chat";targetState=uf.getText().toString().trim().toUpperCase(Locale.ROOT);targetCity=city.getText().toString().trim();if(!targetCity.isEmpty()&&targetState.isEmpty()){notice("Selecione o estado da cidade.");return;}if(matchMode.equals("video"))withCamera(this::startSearch);else startSearch();};
  if(premium!=null&&premium.optBoolean("active")){Spinner gender=new Spinner(this);gender.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,new String[]{"Aleatório","Homens","Mulheres","Outros"}));add(c,gender,8);button(c,"Encontrar alguém",true,()->{preference=new String[]{"any","man","woman","nonbinary"}[gender.getSelectedItemPosition()];search.run();});}else{label(c,"Gênero aleatório",12,false);button(c,"Encontrar alguém",true,()->{preference="any";search.run();});}
  button(body,"Ver encontros ativos",false,()->task(()->{guard();return api.rows("entre_pairs?select=id&or=(a.eq."+uid+",b.eq."+uid+")&status=eq.active&expires_at=gt."+ConnectApi.enc(Instant.now().toString())+"&limit=1");},rows->{JSONObject p=rows.optJSONObject(0);if(p==null)notice("Nenhum encontro ativo.");else{pairId=p.optString("id");open("chat");}}));
 }
 private void startSearch(){if(settings!=null&&!settings.optBoolean("matchmaking_enabled",true)){notice("Novos encontros estão temporariamente pausados.");return;}searching=true;cancelling=false;cancelPending=false;encounters();poll();}
 private void poll(){
  if(!searching||!foreground||busy||cancelling||SystemClock.elapsedRealtime()-lastPoll<3500)return;lastPoll=SystemClock.elapsedRealtime();
  task(()->{guard();return (JSONObject)api.rpc("entre_find_mode_location",obj("_preference",preference,"_mode",matchMode,"_target_state",targetState.isEmpty()?null:targetState,"_target_city",targetCity.isEmpty()?null:targetCity));},r->{
   if(cancelPending){cancelSearch();return;}String s=r.optString("status");if("matched".equals(s)){searching=false;pairId=r.optString("pair_id");open("chat");}else if("daily_limit".equals(s)){searching=false;encounters();notice("Limite diário alcançado.");}
  });
 }
 private void cancelSearch(){
  cancelPending=true;searching=false;if(busy)return;cancelling=true;task(()->api.rpc("connect_cancel_search",null),value->{cancelling=false;cancelPending=false;JSONObject r=(JSONObject)value;if("matched".equals(r.optString("status"))){pairId=r.optString("pair_id");open("chat");}else encounters();});
 }
 private void chat(){
  if(pairId.isEmpty()){open("conversations");return;}
  if(chatInput!=null&&!draftPair.isEmpty())chatDrafts.put(uid+":"+draftPair,chatInput.getText().toString());draftPair=pairId;draftChat=chatDrafts.getOrDefault(uid+":"+pairId,"");screen("Conversa","Mensagens privadas protegidas pelo servidor.",true);countdown=txt("",12,true,muted);add(body,countdown,5);
  LinearLayout actions=column();add(body,actions,4);button(actions,"Aceitar continuar",true,()->task(()->api.rpc("entre_vote",obj("_pair",pairId,"_accept",true)),v->refreshChat()));button(actions,"Encerrar encontro",false,()->confirm("Encerrar encontro?",()->task(()->api.rpc("entre_close",obj("_pair",pairId)),v->{stopVideo();pairId="";currentPair=null;open("connect");})));actions.setVisibility(View.GONE);chatActions=actions;
  videoFrame=new FrameLayout(this);videoFrame.setBackground(shape(0xff151518,16,0));LinearLayout.LayoutParams vp=new LinearLayout.LayoutParams(-1,dp(215));body.addView(videoFrame,vp);videoFrame.setVisibility(View.GONE);
  videoControls=column();add(body,videoControls,5);videoControls.setVisibility(View.GONE);button(videoControls,"Conectar vídeo",true,()->withCamera(()->joinVideo(pairId,false,true)));button(videoControls,"Câmera",false,()->video.toggleCamera());button(videoControls,"Microfone",false,()->video.toggleMic());
  chatList=column();add(body,chatList,8);chatInput=field(body,"Sua mensagem",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_MULTI_LINE,draftChat);button(body,"Enviar",true,()->{String text=chatInput.getText().toString().trim();if(text.isEmpty())return;String pair=pairId;task(()->{guard();return api.insert("entre_messages",obj("pair_id",pair,"sender_id",uid,"body",text));},v->{draftChat="";chatDrafts.remove(uid+":"+pairId);chatInput.setText("");refreshChat();});});button(body,"Anexar mídia",false,()->chooseMedia("chat",""));button(body,"Atualizar mensagens",false,this::refreshChat);button(body,"Opções da conversa",false,this::conversationOptions);
  refreshChat();
 }
 private LinearLayout chatActions,videoControls;
 private void refreshChat(){
  if(busy||!"chat".equals(page)||pairId.isEmpty()||chatList==null)return;String pair=pairId;lastChat=SystemClock.elapsedRealtime();
  task(()->{guard();JSONObject p=api.rows("entre_pairs?select=id,status,expires_at,mode,a,b&id=eq."+ConnectApi.enc(pair)).optJSONObject(0);if(p==null||"closed".equals(p.optString("status"))||("active".equals(p.optString("status"))&&Instant.parse(p.getString("expires_at")).isBefore(Instant.now())))return obj("closed",true);
   JSONArray messages=api.rows("entre_messages?select=id,body,sender_id,created_at&pair_id=eq."+ConnectApi.enc(pair)+"&deleted_at=is.null&order=id.desc&limit=40");
   JSONArray media=(JSONArray)api.rpc("entre_chat_media_list",obj("_pair",pair));
   JSONObject last=messages.optJSONObject(0);if("connected".equals(p.optString("status"))&&last!=null)try{api.rpc("entre_chat_mark_read",obj("_pair",pair,"_last",last.optLong("id")));}catch(Exception ignored){}
   return obj("pair",p,"messages",messages,"media",media);
  },data->{
   if(!pairId.equals(pair)||!"chat".equals(page))return;
   if(data.optBoolean("closed")){stopVideo();pairId="";currentPair=null;draftChat="";open("conversations");notice("Conversa encerrada ou expirada.");return;}
   JSONObject p=data.optJSONObject("pair");if(p==null)return;currentPair=p;
   boolean active="active".equals(p.optString("status")),isVideo=active&&"video".equals(p.optString("mode"));chatActions.setVisibility(active?View.VISIBLE:View.GONE);videoFrame.setVisibility(isVideo?View.VISIBLE:View.GONE);videoControls.setVisibility(isVideo?View.VISIBLE:View.GONE);if(!isVideo)stopVideo();updateCountdown();
   JSONArray rows=data.optJSONArray("messages"),media=data.optJSONArray("media");chatList.removeAllViews();
   if(rows!=null)for(int i=rows.length()-1;i>=0;i--){JSONObject m=rows.optJSONObject(i);if(m==null)continue;LinearLayout cc=card(chatList);boolean mine=uid.equals(m.optString("sender_id"));label(cc,mine?"Você":"Conexão",11,true);label(cc,m.optString("body"),15,false);if(mine)button(cc,"Editar ou excluir",false,()->messageOptions(m));}
   if(media!=null)for(int i=0;i<media.length();i++){JSONObject m=media.optJSONObject(i);if(m!=null)button(chatList,"Ver "+m.optString("media_type","anexo"),false,()->preview("entre-chat-media",m.optString("media_path"),m.optString("media_type","image")));}
  });
 }
 private void updateCountdown(){
  if(countdown==null||currentPair==null||!"chat".equals(page))return;
  if(!"active".equals(currentPair.optString("status"))){countdown.setText("Conversa permanente · expira após 20 dias sem atividade");return;}
  try{long secs=Math.max(0,(Instant.parse(currentPair.getString("expires_at")).toEpochMilli()-System.currentTimeMillis()+999)/1000);countdown.setText(String.format(Locale.ROOT,"%02d:%02d · encontro temporário",secs/60,secs%60));if(secs==0){stopVideo();dirty=true;}}catch(Exception ignored){}
 }
 private void messageOptions(JSONObject m){
  EditText input=new EditText(this);input.setText(m.optString("body"));new AlertDialog.Builder(this).setTitle("Sua mensagem").setView(input).setPositiveButton("Salvar",(d,i)->task(()->api.rpc("entre_message_mutate",obj("_pair",pairId,"_id",m.optLong("id"),"_body",input.getText().toString(),"_delete",false)),v->refreshChat())).setNegativeButton("Excluir",(d,i)->confirm("Excluir mensagem?",()->task(()->api.rpc("entre_message_mutate",obj("_pair",pairId,"_id",m.optLong("id"),"_body","", "_delete",true)),v->refreshChat()))).setNeutralButton("Voltar",null).show();
 }
 private void conversationOptions(){
  if(currentPair==null)return;String other=uid.equals(currentPair.optString("a"))?currentPair.optString("b"):currentPair.optString("a");
  new AlertDialog.Builder(this).setItems(new String[]{"Ver perfil","Denunciar","Bloquear","Arquivar","Fixar","Apagar meu histórico"},(d,i)->{switch(i){case 0:person(other);break;case 1:report(other);break;case 2:confirm("Bloquear esta pessoa?",()->task(()->api.rpc("entre_block",obj("_user",other)),v->open("conversations")));break;case 3:case 4:if("connected".equals(currentPair.optString("status")))task(()->api.rpc("entre_conversation_update",obj("_pair",pairId,"_folder",null,"_pinned",i==4?true:null,"_archived",i==3?true:null)),v->open("conversations"));break;case 5:confirm("Apagar o histórico da sua conta?",()->task(()->api.rpc("entre_conversation_delete",obj("_pair",pairId)),v->open("conversations")));break;}}).show();
 }
 private void refreshRoom(){
  if(busy||!"rooms".equals(page)||roomList==null)return;String selected=room;lastRoom=SystemClock.elapsedRealtime();task(()->{guard();return ((JSONObject)api.rpc("entre_room_messages_page",obj("_room",selected,"_before",null))).optJSONArray("items");},rows->{if(!room.equals(selected)||!"rooms".equals(page))return;roomList.removeAllViews();if(rows==null||rows.length()==0)label(roomList,"Nenhuma mensagem ainda.",13,false);else for(int i=rows.length()-1;i>=0;i--){JSONObject m=rows.optJSONObject(i);if(m==null)continue;LinearLayout cc=card(roomList);label(cc,m.optString("display_name","Pessoa"),12,true);label(cc,m.optString("body"),14,false);if(uid.equals(m.optString("sender")))button(cc,"Excluir",false,()->confirm("Excluir mensagem?",()->task(()->api.rpc("entre_room_message_mutate",obj("_room",room,"_id",m.optLong("id"),"_body","","_delete",true)),v->refreshRoom())));}});
 }
 private void roomChoice(){EditText input=new EditText(this);input.setHint("br, s:sp ou c:sp:penapolis");input.setText(room);new AlertDialog.Builder(this).setTitle("Sala oficial · Brasil, estado ou cidade").setView(input).setPositiveButton("Entrar",(d,i)->{String key=input.getText().toString().trim().toLowerCase(Locale.ROOT);task(()->api.rpc("entre_room_messages_page",obj("_room",key,"_before",null)),v->{room=key;rooms();});}).setNegativeButton("Voltar",null).show();}
 private void confirm(String title,Runnable action){new AlertDialog.Builder(this).setMessage(title).setPositiveButton("Confirmar",(d,i)->action.run()).setNegativeButton("Cancelar",null).show();}
 private void syncNative(){lastSync=SystemClock.elapsedRealtime();String owner=uid,channelPair="chat".equals(page)?pairId:"";task(()->{guard();String token=api.token();if(SystemClock.elapsedRealtime()-lastPresence>=30000){api.rpc("entre_online_ping",null);lastPresence=SystemClock.elapsedRealtime();}return obj("token",token,"premium",api.rpc("entre_premium_overview",null));},r->{if(!foreground||!uid.equals(owner))return;premium=r.optJSONObject("premium");realtime.start(owner,channelPair,r.optString("token"),()->{dirty=true;guardAt=0;});});}
 private void withCamera(Runnable action){if(checkSelfPermission(android.Manifest.permission.CAMERA)==android.content.pm.PackageManager.PERMISSION_GRANTED&&checkSelfPermission(android.Manifest.permission.RECORD_AUDIO)==android.content.pm.PackageManager.PERMISSION_GRANTED){action.run();return;}permissionAction=action;requestPermissions(new String[]{android.Manifest.permission.CAMERA,android.Manifest.permission.RECORD_AUDIO},42);}
 @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] results){super.onRequestPermissionsResult(request,permissions,results);if(request!=42)return;Runnable action=permissionAction;permissionAction=null;if(results.length==2&&results[0]==0&&results[1]==0&&action!=null)action.run();else notice("Permita câmera e microfone para participar com vídeo.");}
 private void stopVideo(){if(video!=null)video.stop();videoActive=false;}
 private void joinVideo(String id,boolean live,boolean publisher){if(videoFrame==null||videoActive)return;task(()->{guard();return api.edge(live?"entre-camera-live-token":"entre-livekit-token",obj(live?"live_id":"pair_id",id));},credentials->{if(!foreground||videoFrame==null)return;videoActive=true;video.start(videoFrame,credentials.optString("url"),credentials.optString("token"),publisher,s->{if(status!=null)status.setText(s);if(s.contains("Não foi possível")||s.contains("encerrada"))videoActive=false;});});}
 private void lives(){stopVideo();liveId="";liveMessages=null;screen("Lives","Transmissões da comunidade.",true);EditText title=field(body,"Título da sua live",InputType.TYPE_CLASS_TEXT,"");button(body,"Iniciar live",true,()->withCamera(()->task(()->{guard();return api.rpc("entre_live_start_visual",obj("_title",title.getText().toString(),"_category","conversa","_cover_path",null));},id->{liveId=String.valueOf(id);liveScreen(liveId,true);})));LinearLayout list=column();add(body,list,5);task(()->{guard();return (JSONArray)api.rpc("entre_lives_list",null);},rows->{for(int i=0;i<rows.length();i++){JSONObject l=rows.optJSONObject(i);if(l==null)continue;LinearLayout cc=card(list);label(cc,l.optString("title"),18,true);label(cc,l.optString("host_name"),12,false);button(cc,"Assistir",true,()->liveScreen(l.optString("id"),l.optBoolean("is_host")||l.optBoolean("is_guest")));}});}
 private void liveScreen(String id,boolean publisher){stopVideo();liveId=id;livePublisher=publisher;screen("Transmissão ao vivo","Vídeo nativo · LiveKit",true);videoFrame=new FrameLayout(this);videoFrame.setBackgroundColor(0xff18181a);body.addView(videoFrame,new LinearLayout.LayoutParams(-1,dp(250)));button(body,"Conectar",true,()->{if(publisher)withCamera(()->joinVideo(id,true,true));else joinVideo(id,true,false);});if(publisher){button(body,"Câmera",false,()->video.toggleCamera());button(body,"Microfone",false,()->video.toggleMic());button(body,"Encerrar / sair",false,()->confirm("Encerrar sua participação?",()->task(()->api.rpc("entre_live_exit",obj("_live",id)),v->{stopVideo();liveId="";lives();})));}else{button(body,"Pedir para participar",false,()->task(()->api.rpc("entre_live_request_guest",obj("_live",id)),v->notice("Solicitação enviada.")));button(body,"Sair da live",false,()->{stopVideo();liveId="";lives();});}EditText comment=field(body,"Comentar na live",InputType.TYPE_CLASS_TEXT,"");button(body,"Enviar comentário",true,()->{refreshLive("comment",comment.getText().toString(),null);comment.setText("");});button(body,"Enviar coração",false,()->refreshLive("heart","",null));if(publisher){button(body,"Revisar pedido de convidado",false,()->new AlertDialog.Builder(this).setTitle("Convidado").setItems(new String[]{"Aceitar","Recusar"},(d,i)->task(()->api.rpc("entre_live_review_guest",obj("_live",id,"_approve",i==0)),v->notice("Pedido processado."))).show());}liveMessages=column();add(body,liveMessages,8);refreshLive("read","",null);}
 private void chooseMedia(String kind,String caption){if(mediaPicker)return;mediaPicker=true;mediaTarget=kind;mediaCaption=caption;mediaPair=pairId;Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("*/*").addCategory(Intent.CATEGORY_OPENABLE);i.putExtra(Intent.EXTRA_MIME_TYPES,kind.equals("avatar")?new String[]{"image/*"}:kind.equals("chat")?new String[]{"image/*","video/mp4","video/webm","audio/mp4","audio/webm"}:new String[]{"image/*","video/mp4","video/webm"});try{startActivityForResult(i,44);}catch(Exception e){mediaPicker=false;notice("Seletor de mídia indisponível.");}}
 @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request!=44)return;mediaPicker=false;if(result!=RESULT_OK||data==null||data.getData()==null)return;Uri uri=data.getData();String kind=mediaTarget,caption=mediaCaption,pair=mediaPair,owner=uid;task(()->{guard();if(owner.isEmpty()||!owner.equals(uid))throw new Gate("Sessão alterada.");NativeMedia.Item item=NativeMedia.read(this,uri,kind.equals("avatar")?40960:3000000,kind.equals("chat")?20971520:26214400,kind.equals("avatar"));String bucket=kind.equals("chat")?"entre-chat-media":kind.equals("story")?"entre-story-media":kind.equals("avatar")?"entre-avatars":"entre-post-media";String path=owner+"/"+(kind.equals("chat")?pair+"/":"")+UUID.randomUUID()+"."+item.extension;api.upload(bucket,path,item.bytes,item.mime);try{switch(kind){case "chat":api.rpc("entre_chat_media_add",obj("_pair",pair,"_path",path,"_kind",item.type));break;case "story":api.rpc("entre_story_create",obj("_path",path,"_type",item.type,"_caption",caption));break;case "avatar":api.patch("entre_profiles?id=eq."+ConnectApi.enc(owner),obj("avatar_path",path));break;default:api.rpc("entre_post_create_media",obj("_body",caption,"_media_path",path,"_media_type",item.type));}}catch(Exception e){try{api.removeMedia(bucket,path);}catch(Exception ignored){}throw e;}return true;},v->{notice("Mídia enviada.");if(kind.equals("avatar"))startup();else if(kind.equals("story"))stories();else if(kind.equals("chat"))refreshChat();else posts();});}
 private void preview(String bucket,String path,String kind){if(path.isEmpty())return;task(()->api.signed(bucket,path),url->{LinearLayout content=column();AlertDialog dialog=new AlertDialog.Builder(this).setTitle("Mídia").setView(content).setNegativeButton("Fechar",null).create();if("video".equals(kind)||"audio".equals(kind)){VideoView view=new VideoView(this);content.addView(view,new LinearLayout.LayoutParams(-1,dp(260)));MediaController controller=new MediaController(this);view.setMediaController(controller);view.setVideoURI(Uri.parse(url));view.setOnPreparedListener(mp->view.start());dialog.setOnDismissListener(d->view.stopPlayback());dialog.show();}else{ImageView image=new ImageView(this);image.setAdjustViewBounds(true);image.setMaxHeight(dp(440));content.addView(image,new LinearLayout.LayoutParams(-1,-2));dialog.show();io.execute(()->{try(java.io.InputStream in=new java.net.URL(url).openStream()){android.graphics.Bitmap b=android.graphics.BitmapFactory.decodeStream(in);main.post(()->{if(dialog.isShowing())image.setImageBitmap(b);});}catch(Exception e){main.post(()->notice("Mídia indisponível."));}});}});}
 private void stories(){screen("Stories","Momentos que duram 24 horas.",true);EditText caption=field(body,"Legenda",InputType.TYPE_CLASS_TEXT,"");button(body,"Novo story",true,()->chooseMedia("story",caption.getText().toString()));LinearLayout list=column();add(body,list,5);task(()->api.rpc("entre_stories_list",null),value->{JSONArray rows=(JSONArray)value;for(int i=0;i<rows.length();i++){JSONObject s=rows.optJSONObject(i);if(s==null)continue;LinearLayout cc=card(list);label(cc,s.optString("author_name"),15,true);label(cc,s.optString("caption"),13,false);button(cc,"Ver story",true,()->preview("entre-story-media",s.optString("media_path"),s.optString("media_type")));if(uid.equals(s.optString("author_id")))button(cc,"Excluir",false,()->confirm("Excluir story?",()->task(()->api.rpc("entre_story_delete",obj("_id",s.optString("id"))),v->stories())));}});}
 private void comments(long post){screen("Comentários","Publicação",true);EditText comment=field(body,"Escrever comentário",InputType.TYPE_CLASS_TEXT,"");button(body,"Enviar",true,()->task(()->api.rpc("entre_post_comment",obj("_post",post,"_body",comment.getText().toString())),v->comments(post)));button(body,"Voltar ao feed",false,this::posts);LinearLayout list=column();add(body,list,5);task(()->api.rpc("entre_post_comments_page",obj("_post",post,"_before",null)),value->{JSONArray items=value instanceof JSONArray?(JSONArray)value:((JSONObject)value).optJSONArray("items");if(items==null&&value instanceof JSONObject)items=((JSONObject)value).optJSONArray("rows");if(items==null)return;for(int i=0;i<items.length();i++){JSONObject m=items.optJSONObject(i);if(m==null)continue;LinearLayout cc=card(list);label(cc,m.optString("name","Pessoa"),13,true);label(cc,m.optString("body"),14,false);if(uid.equals(m.optString("author_id")))button(cc,"Excluir",false,()->confirm("Excluir comentário?",()->task(()->api.rpc("entre_post_comment_delete",obj("_comment",m.optLong("id"))),v->comments(post))));}});}
 private void peopleSearch(){screen("Buscar pessoas","Nome ou @usuário",true);EditText term=field(body,"@usuário",InputType.TYPE_CLASS_TEXT,"");LinearLayout list=column();button(body,"Buscar",true,()->task(()->api.rpc("entre_user_search",obj("_query",term.getText().toString())),v->{list.removeAllViews();JSONArray rows=(JSONArray)v;for(int i=0;i<rows.length();i++){JSONObject p=rows.optJSONObject(i);if(p!=null)button(list,p.optString("display_name")+" · @"+p.optString("username"),false,()->person(p.optString("id")));}}));add(body,list,6);}
 private void person(String id){if(id.isEmpty())return;task(()->{guard();Object p=api.rpc("entre_profile_for_member",obj("_target",id));if(p instanceof JSONObject&&!id.equals(uid))try{api.rpc("connect_profile_visit_record",obj("_target",id));}catch(Exception ignored){}return p;},v->{if(!(v instanceof JSONObject)){notice("Perfil indisponível.");return;}JSONObject p=(JSONObject)v;LinearLayout content=column();content.setPadding(dp(16),dp(8),dp(16),dp(16));label(content,"@"+p.optString("username")+" · "+p.optInt("age")+" anos",14,true);label(content,p.optString("bio"),14,false);AlertDialog d=new AlertDialog.Builder(this).setTitle(p.optString("display_name")).setView(content).setNegativeButton("Fechar",null).create();if(!id.equals(uid)){button(content,"Seguir",true,()->{d.dismiss();task(()->api.rpc("entre_follow_request",obj("_target",id)),x->notice("Solicitação processada."));});button(content,"Conversar",false,()->{d.dismiss();task(()->api.rpc("entre_chat_request",obj("_target",id)),x->{JSONObject a=(JSONObject)x;if("open".equals(a.optString("status"))){pairId=a.optString("pair_id");open("chat");}else notice(a.optString("message","Solicitação processada."));});});button(content,"Denunciar",false,()->{d.dismiss();report(id);});button(content,"Bloquear",false,()->{d.dismiss();confirm("Bloquear esta pessoa?",()->task(()->api.rpc("entre_block",obj("_user",id)),x->notice("Pessoa bloqueada.")));});}d.show();});}
 private void report(String id){String[] reasons={"Assédio","Discurso de ódio","Spam","Menor de idade","Perfil falso","Outro"};String[] keys={"harassment","hate","spam","underage","fake","other"};new AlertDialog.Builder(this).setTitle("Motivo da denúncia").setItems(reasons,(d,i)->{EditText details=new EditText(this);details.setHint("Detalhes");new AlertDialog.Builder(this).setTitle("Denunciar").setView(details).setPositiveButton("Enviar",(a,b)->task(()->api.rpc("entre_report_user",obj("_reported",id,"_reason",keys[i],"_details",details.getText().toString())),v->notice("Denúncia enviada."))).setNegativeButton("Cancelar",null).show();}).show();}
 private void inbox(){task(()->api.rpc("entre_social_inbox",null),v->{JSONObject x=(JSONObject)v;LinearLayout content=column();AlertDialog dialog=new AlertDialog.Builder(this).setTitle("Solicitações").setView(content).setNegativeButton("Fechar",null).create();for(String type:new String[]{"follows","chats"}){JSONArray rows=x.optJSONArray(type);if(rows==null)continue;for(int i=0;i<rows.length();i++){JSONObject p=rows.optJSONObject(i);if(p==null)continue;label(content,p.optString("display_name"),14,true);for(boolean accept:new boolean[]{true,false})button(content,accept?"Aceitar":"Recusar",accept,()->{dialog.dismiss();task(()->type.equals("follows")?api.rpc("entre_follow_respond",obj("_follower",p.optString("sender"),"_accept",accept)):api.rpc("entre_chat_respond",obj("_request",p.optLong("id"),"_accept",accept)),a->inbox());});}}dialog.show();});}
 private void myProfile(){screen("Meu perfil","Seus dados no CONNECT.",true);if(profile==null)return;EditText name=field(body,"Nome",InputType.TYPE_CLASS_TEXT,profile.optString("display_name")),bio=field(body,"Biografia",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_MULTI_LINE,profile.optString("bio",""));label(body,"@"+profile.optString("username"),13,false);button(body,"Salvar perfil",true,()->task(()->api.patch("entre_profiles?id=eq."+ConnectApi.enc(uid),obj("display_name",name.getText().toString(),"bio",bio.getText().toString())),v->startup()));if(!profile.isNull("avatar_path"))button(body,"Ver foto",false,()->preview("entre-avatars",profile.optString("avatar_path"),"image"));button(body,"Alterar foto",false,()->chooseMedia("avatar",""));button(body,"Compartilhar perfil",false,()->{Intent share=new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT,ConnectApi.WEBSITE+"perfil.html?u="+Uri.encode(profile.optString("username")));startActivity(Intent.createChooser(share,"Compartilhar perfil"));});button(body,"Visitas ao perfil",false,this::visitors);EditText uf=field(body,"Estado",InputType.TYPE_CLASS_TEXT,""),city=field(body,"Cidade",InputType.TYPE_CLASS_TEXT,"");button(body,"Salvar localização",false,()->task(()->api.rpc("entre_set_location",obj("_state",uf.getText().toString(),"_city",city.getText().toString())),v->notice("Localização atualizada.")));CheckBox visible=check(body,"Aparecer online"),requests=check(body,"Aceitar solicitações");button(body,"Salvar visibilidade",false,()->task(()->api.rpc("entre_online_settings",obj("_visible",visible.isChecked(),"_allow_requests",requests.isChecked())),v->notice("Preferências atualizadas.")));}
 private void support(){screen("Suporte","Fale com a equipe do CONNECT.",true);EditText subject=field(body,"Assunto",InputType.TYPE_CLASS_TEXT,""),details=field(body,"Descreva o problema",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_MULTI_LINE,"");button(body,"Enviar chamado",true,()->task(()->{Object id=api.rpc("entre_support_create",obj("_category","bug","_subject",subject.getText().toString(),"_description",details.getText().toString()));return api.rpc("entre_support_submit",obj("_ticket",id,"_paths",new JSONArray()));},v->{notice("Chamado registrado.");support();}));LinearLayout list=column();add(body,list,5);task(()->api.rpc("entre_my_support_tickets",null),v->{JSONArray rows=(JSONArray)v;for(int i=0;i<rows.length();i++){JSONObject t=rows.optJSONObject(i);if(t!=null){LinearLayout cc=card(list);label(cc,t.optString("subject"),14,true);label(cc,t.optString("status"),12,false);button(cc,"Consultar respostas",false,()->task(()->api.rpc("entre_support_thread",obj("_ticket",t.optLong("id"))),x->new AlertDialog.Builder(this).setTitle("Respostas do suporte").setMessage(formatReplies((JSONArray)x)).setPositiveButton("Fechar",null).show()));}}});}
 private String formatReplies(JSONArray rows){StringBuilder b=new StringBuilder();for(int i=0;i<rows.length();i++){JSONObject r=rows.optJSONObject(i);if(r!=null)b.append(r.optBoolean("from_staff")?"Equipe: ":"Você: ").append(r.optString("body")).append("\n\n");}return b.length()==0?"Nenhuma resposta ainda.":b.toString();}
 private void settingsPage(){
  screen("Configurações","Preferências da sua conta.",true);JSONObject p=accountPrefs==null?new JSONObject():accountPrefs;
  CheckBox theme=check(body,"Tema escuro");theme.setChecked(dark);CheckBox sound=check(body,"Sons do aplicativo");sound.setChecked(p.optBoolean("sound",true));
  CheckBox msg=check(body,"Notificações de mensagens");msg.setChecked(p.optBoolean("notify_messages",true));CheckBox soc=check(body,"Notificações sociais");soc.setChecked(p.optBoolean("notify_social",true));CheckBox match=check(body,"Notificações de matches");match.setChecked(p.optBoolean("notify_matches",true));
  Spinner motion=new Spinner(this);motion.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,new String[]{"Desativado","Leve","Médio","Alto"}));String[] levels={"off","light","medium","high"};int n=Arrays.asList(levels).indexOf(p.optString("motion","medium"));motion.setSelection(Math.max(0,n));add(body,motion,8);
  button(body,"Salvar preferências",true,()->task(()->api.rpc("connect_save_preferences",obj("_theme",theme.isChecked()?"dark":"light","_motion",levels[motion.getSelectedItemPosition()],"_sound",sound.isChecked(),"_volume",p.optInt("volume",80),"_messages",msg.isChecked(),"_social",soc.isChecked(),"_matches",match.isChecked())),v->{accountPrefs=(JSONObject)v;dark=theme.isChecked();prefs.edit().putBoolean("dark",dark).apply();settingsPage();}));
  button(body,"Compartilhar visitas",false,()->new AlertDialog.Builder(this).setTitle("Visitas ao perfil").setItems(new String[]{"Ativar compartilhamento","Desativar compartilhamento"},(d,i)->task(()->api.rpc("connect_profile_visit_preference",obj("_enabled",i==0)),v->notice("Preferência atualizada."))).show());
  button(body,"Política de privacidade",false,()->external(ConnectApi.WEBSITE+"privacidade.html"));button(body,"Termos de uso",false,()->external(ConnectApi.WEBSITE+"termos.html"));button(body,"Sair",false,this::logout);
 }
 private void editPost(JSONObject post){EditText edit=new EditText(this);edit.setText(post.optString("body"));new AlertDialog.Builder(this).setTitle("Editar publicação").setView(edit).setPositiveButton("Salvar",(d,i)->task(()->api.rpc("connect_post_edit",obj("_post",post.optLong("id"),"_body",edit.getText().toString())),v->posts())).setNegativeButton("Cancelar",null).show();}
 private void visitors(){task(()->api.rpc("connect_profile_visitors",obj("_before",null,"_visitor",null)),v->{JSONObject result=v instanceof JSONObject?(JSONObject)v:new JSONObject();JSONArray rows=v instanceof JSONArray?(JSONArray)v:result.optJSONArray("rows");if(rows==null)rows=result.optJSONArray("items");LinearLayout content=column();AlertDialog d=new AlertDialog.Builder(this).setTitle("Visitas · últimos 5 dias").setView(content).setNegativeButton("Fechar",null).create();if(rows==null||rows.length()==0)label(content,"Nenhuma visita disponível.",13,false);else for(int i=0;i<rows.length();i++){JSONObject p=rows.optJSONObject(i);if(p!=null)button(content,p.optString("display_name"),false,()->{d.dismiss();person(p.optString("id"));});}d.show();});}
 private void refreshLive(String action,String text,String comment){if(liveId.isEmpty()||liveMessages==null||busy)return;String id=liveId;lastRoom=SystemClock.elapsedRealtime();task(()->api.rpc("connect_live_interact",obj("_live",id,"_action",action,"_body",text,"_comment",comment)),v->{if(!id.equals(liveId)||liveMessages==null)return;JSONObject d=(JSONObject)v;if(d.optBoolean("banned")){stopVideo();lives();notice("Acesso à live bloqueado.");return;}liveMessages.removeAllViews();label(liveMessages,d.optLong("hearts")+" corações",13,true);JSONArray rows=d.optJSONArray("comments");if(rows!=null)for(int i=0;i<rows.length();i++){JSONObject m=rows.optJSONObject(i);if(m==null)continue;LinearLayout cc=card(liveMessages);label(cc,m.optString("name","Pessoa"),12,true);label(cc,m.optString("body"),13,false);if(m.optBoolean("can_delete"))button(cc,"Excluir",false,()->refreshLive("delete","",m.optString("id")));}});}
 private boolean registrationDirty; private long lastRegistrationActivity;
 private JSONObject registrationDraft(){try{JSONObject d=new JSONObject(prefs.getString("registration."+uid,"{}"));if(System.currentTimeMillis()-d.optLong("at",0)<1800000)return d;}catch(Exception ignored){}prefs.edit().remove("registration."+uid).apply();return new JSONObject();}
 private void saveRegistrationDraft(EditText name,EditText handle,EditText age,Spinner gender){if(uid.isEmpty())return;try{prefs.edit().putString("registration."+uid,obj("at",System.currentTimeMillis(),"name",name.getText().toString(),"handle",handle.getText().toString(),"age",age.getText().toString(),"gender",gender.getSelectedItemPosition()).toString()).apply();}catch(Exception ignored){}}
 private void registrationInteraction(){if(restricted&&api.hasSession()&&!uid.isEmpty()&&(profile==null||!profile.optBoolean("onboarding_plan_selected")))registrationDirty=true;}
 @Override public boolean dispatchTouchEvent(android.view.MotionEvent event){if(event.getActionMasked()==android.view.MotionEvent.ACTION_DOWN)registrationInteraction();return super.dispatchTouchEvent(event);}
 private long installedVersion()throws Exception{android.content.pm.PackageInfo info=getPackageManager().getPackageInfo(getPackageName(),0);return Build.VERSION.SDK_INT>=28?info.getLongVersionCode():info.versionCode;}
 private void checkRelease()throws Exception{
  lastReleaseCheck=SystemClock.elapsedRealtime();
  JSONObject release=api.release();
  if(release.optBoolean("mandatory")&&release.optLong("version_code",0)>installedVersion()){
   String url=release.optString("apk_url"),hash=release.optString("sha256");
   if(!url.matches("https://github[.]com/appswebb/testesite/releases/download/[A-Za-z0-9._-]+/[A-Za-z0-9._-]+[.]apk")||!hash.matches("[a-f0-9]{64}"))throw new Gate("Atualização indisponível. Tente novamente.");
   requiredRelease=release;mandatoryUpdate=true;throw new Gate("Atualização obrigatória.");
  }
  mandatoryUpdate=false;requiredRelease=null;
 }
 private void updateScreen(){
  restricted=true;searching=false;cancelPending=false;realtime.stop();stopVideo();
  screen("Atualização obrigatória","Instale a nova versão do CONNECT para continuar.",false);
  JSONObject release=requiredRelease;
  if(release!=null){
   LinearLayout card=card(body);label(card,"Versão "+release.optString("version_name"),22,true);
   if(!release.optString("notes").isEmpty())label(card,release.optString("notes"),14,false);
   button(card,"Baixar atualização",true,()->external(release.optString("apk_url")));
   label(card,"Abra o APK baixado e confirme a instalação. Não desinstale o CONNECT: a atualização deve manter seus dados e a mesma assinatura digital.",13,false);
  }
  button(body,"Verificar novamente",false,this::startup);
 }
 private final Runnable tick=new Runnable(){@Override public void run(){if(!foreground||isDestroyed())return;if(!busy&&(!restricted||mandatoryUpdate)&&SystemClock.elapsedRealtime()-lastReleaseCheck>=30000){task(()->{checkRelease();return true;},v->{if(mandatoryUpdate)updateScreen();});}updateCountdown();long now=SystemClock.elapsedRealtime();if(!busy&&!mandatoryUpdate&&restricted&&api.hasSession()&&!uid.isEmpty()&&(profile==null||!profile.optBoolean("onboarding_plan_selected"))&&registrationDirty&&SystemClock.elapsedRealtime()-lastRegistrationActivity>=15000){registrationDirty=false;lastRegistrationActivity=SystemClock.elapsedRealtime();task(()->{touch();return true;},v->{});}if(!busy&&!restricted){if(cancelPending&&!cancelling){/* explicit retry only */}else if(searching)poll();else if(profile!=null&&profile.optBoolean("onboarding_plan_selected")){if(now-lastSync>=30000)syncNative();else if("chat".equals(page)&&(dirty||now-lastChat>= (realtime.active()?30000:5000))){dirty=false;refreshChat();}else if("rooms".equals(page)&&(dirty||now-lastRoom>=30000)){dirty=false;refreshRoom();}else if("lives".equals(page)&&!liveId.isEmpty()&&liveMessages!=null&&(dirty||now-lastRoom>=15000)){dirty=false;refreshLive("read","",null);}}}main.postDelayed(this,1000);}};
 private void logout(){String owner=uid;searching=false;cancelPending=false;realtime.stop();stopVideo();task(()->{if(api.hasSession()){try{api.rpc("entre_leave",null);}catch(Exception ignored){}api.logout();}return true;},v->{prefs.edit().remove("page."+owner).remove("pair."+owner).apply();chatDrafts.clear();draftPair="";chatInput=null;uid="";profile=null;premium=null;pairId="";page="posts";auth(false,"Você saiu da conta.");});}
}
