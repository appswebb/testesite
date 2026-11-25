package com.connect.community;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.view.View;
import android.widget.LinearLayout;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.io.FileOutputStream;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicReference;

/** Test APK only: exercises the production screen renderers using local synthetic records. */
public final class PrototypeCapture extends Instrumentation {
 private MainActivity app;
 private File output;
 interface Step {void run() throws Exception;}
 @Override public void onCreate(Bundle args){super.onCreate(args);start();}
 private Object get(String name)throws Exception{Field f=MainActivity.class.getDeclaredField(name);f.setAccessible(true);return f.get(app);}
 private void set(String name,Object value)throws Exception{Field f=MainActivity.class.getDeclaredField(name);f.setAccessible(true);f.set(app,value);}
 private void call(String name,Class<?>[] types,Object... args)throws Exception{Method m=MainActivity.class.getDeclaredMethod(name,types);m.setAccessible(true);m.invoke(app,args);}
 private void call(String name)throws Exception{call(name,new Class<?>[0]);}
 private void main(Step step)throws Exception{AtomicReference<Throwable> problem=new AtomicReference<>();runOnMainSync(()->{try{step.run();}catch(Throwable e){problem.set(e);}});if(problem.get()!=null)throw new Exception(problem.get());waitForIdleSync();}
 private JSONObject json(String value)throws Exception{return new JSONObject(value);}
 private LinearLayout list()throws Exception{LinearLayout body=(LinearLayout)get("body");return (LinearLayout)body.getChildAt(body.getChildCount()-1);}
 private void capture(String name)throws Exception{Thread.sleep(350);Bitmap image=getUiAutomation().takeScreenshot();if(image==null)throw new IllegalStateException("Screenshot indisponível");try(FileOutputStream file=new FileOutputStream(new File(output,name+".png"))){if(!image.compress(Bitmap.CompressFormat.PNG,100,file))throw new IllegalStateException("Falha ao salvar");}finally{image.recycle();}}
 @Override public void onStart(){
  Bundle result=new Bundle();
  try{
   Intent intent=new Intent(getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
   app=(MainActivity)startActivitySync(intent);output=getTargetContext().getExternalFilesDir("visual-qa");if(output==null||(!output.exists()&&!output.mkdirs()))throw new IllegalStateException("Diretório indisponível");
   main(()->{set("requestGeneration",((Long)get("requestGeneration"))+1);set("busy",true);set("foreground",false);set("dark",false);call("auth",new Class<?>[]{boolean.class,String.class},false,"");});capture("01-login");
   main(()->call("auth",new Class<?>[]{boolean.class,String.class},true,""));capture("02-cadastro");
   main(()->{set("uid","visual-qa");set("profile",json("{\"id\":\"visual-qa\",\"display_name\":\"Conta de teste\",\"username\":\"visual.qa\",\"bio\":\"Perfil fictício para revisão da interface.\",\"age\":25,\"gender\":\"man\",\"premium\":true}"));set("premium",json("{\"active\":true}"));set("accountPrefs",json("{\"motion\":\"off\"}"));set("page","posts");call("posts");});
   main(()->call("renderFeed",new Class<?>[]{LinearLayout.class,Long.class,JSONArray.class},list(),null,new JSONArray("[{\"id\":1,\"author_name\":\"Perfil de teste\",\"author_id\":\"qa-2\",\"author_username\":\"teste\",\"premium\":true,\"body\":\"Publicação fictícia para conferir o layout.\",\"likes\":3}]")));capture("03-inicio");
   main(()->{set("page","connect");call("encounters");});capture("04-ao-vivo");
   main(()->{set("page","online");call("online");});
   main(()->call("renderOnline",new Class<?>[]{LinearLayout.class,JSONObject.class},list(),json("{\"rows\":[{\"id\":\"qa-1\",\"display_name\":\"Perfil A\",\"username\":\"teste.a\",\"age\":24,\"bio\":\"Biografia de teste para revisão visual.\",\"allow_requests\":true,\"premium\":false},{\"id\":\"qa-2\",\"display_name\":\"Perfil B\",\"username\":\"teste.b\",\"age\":29,\"follow_status\":\"pending\",\"premium\":false,\"bio\":\"Solicitação pendente.\"},{\"id\":\"qa-3\",\"display_name\":\"Perfil C\",\"username\":\"teste.c\",\"age\":27,\"follow_status\":\"accepted\",\"premium\":true,\"bio\":\"Perfil Premium de teste.\"}]}")));capture("05-online");
   main(()->{set("page","chat");set("pairId","qa-pair");call("chat");JSONObject pair=json("{\"id\":\"qa-pair\",\"status\":\"active\",\"mode\":\"chat\",\"a\":\"visual-qa\",\"b\":\"qa-2\"}");pair.put("expires_at",Instant.now().plusSeconds(300).toString());JSONArray messages=new JSONArray();for(int i=3;i>=1;i--){JSONObject m=new JSONObject();m.put("id",i);m.put("sender_id",i%2==0?"visual-qa":"qa-2");m.put("body",i%2==0?"Tudo ótimo! E você?":"Mensagem fictícia de teste.");m.put("created_at",Instant.now().toString());messages.put(m);}JSONObject data=new JSONObject();data.put("pair",pair);data.put("messages",messages);data.put("media",new JSONArray());data.put("peer",json("{\"id\":\"qa-2\",\"display_name\":\"Perfil de teste\",\"username\":\"teste\",\"premium\":true}"));call("renderChat",new Class<?>[]{String.class,JSONObject.class},"qa-pair",data);});capture("06-conversa");
   main(()->{set("page","rooms");set("uid","");call("rooms");JSONArray messages=new JSONArray();for(int i=1;i<=5;i++){JSONObject m=new JSONObject();m.put("id",i);m.put("sender","qa-"+i);m.put("display_name","Perfil "+i);m.put("body","Mensagem de teste da sala.");m.put("created_at",Instant.now().toString());messages.put(m);}call("renderRoom",new Class<?>[]{String.class,JSONArray.class},"br",messages);});capture("07-salas");
   main(()->{set("uid","visual-qa");set("page","profile");call("myProfile");});capture("08-perfil");
   result.putString("stream","8 capturas das telas reais com dados sintéticos. Sem teste de autenticação/servidor.");
   finish(Activity.RESULT_OK,result);
  }catch(Throwable e){result.putString("stream",android.util.Log.getStackTraceString(e));finish(Activity.RESULT_CANCELED,result);}
 }
}