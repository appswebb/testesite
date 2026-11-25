package com.connect.community;
import okhttp3.*;
import org.json.*;
import android.os.*;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/** Account-scoped Realtime notifications; consumers reload authorized data through REST/RPC. */
final class NativeRealtime {
 private final OkHttpClient client=new OkHttpClient.Builder().readTimeout(0,TimeUnit.SECONDS).build();
 private final Handler main=new Handler(Looper.getMainLooper());
 private final AtomicInteger refs=new AtomicInteger();
 private WebSocket socket;
 private String topic,identity,pair,access;
 private boolean joined;
 private Runnable listener;
 private long lastEvent;
 private int generation;
 void start(String uid,String pairId,String token,Runnable changed){
  if(socket!=null&&uid.equals(identity)&&pairId.equals(pair)&&token.equals(access))return;
  stop();identity=uid;pair=pairId;access=token;listener=changed;
  int gen=++generation;topic="realtime:connect-android-"+uid;
  Request request=new Request.Builder().url(ConnectApi.BASE.replace("https://","wss://")+"/realtime/v1/websocket?apikey="+ConnectApi.ANON+"&vsn=1.0.0").build();
  socket=client.newWebSocket(request,new WebSocketListener(){
   @Override public void onOpen(WebSocket ws,Response response){
    if(gen!=generation){ws.cancel();return;}
    try{
     JSONArray changes=new JSONArray().put(filter("connect_account_signal","user_id=eq."+uid)).put(filter("entre_notifications","user_id=eq."+uid)).put(filter("entre_community_signal",null)).put(filter("connect_public_signal","id=eq.1"));
     if(!pairId.isEmpty())changes.put(filter("entre_messages","pair_id=eq."+pairId)).put(filter("entre_pairs","id=eq."+pairId));
     send(ws,topic,"phx_join",ConnectApi.obj("config",ConnectApi.obj("broadcast",ConnectApi.obj("self",false),"presence",ConnectApi.obj("key",""),"postgres_changes",changes),"access_token",token));
    }catch(Exception e){ws.cancel();}
   }
   @Override public void onMessage(WebSocket ws,String raw){
    if(gen!=generation)return;
    try{JSONObject m=new JSONObject(raw);String event=m.optString("event");if("phx_reply".equals(event)&&topic.equals(m.optString("topic"))&&"ok".equals(m.optJSONObject("payload").optString("status")))joined=true;
     if("postgres_changes".equals(event)){main.post(()->{if(gen!=generation)return;long now=SystemClock.elapsedRealtime();if(now-lastEvent>800){lastEvent=now;if(listener!=null)listener.run();}});}
    }catch(Exception ignored){}
   }
   @Override public void onFailure(WebSocket ws,Throwable t,Response response){main.post(()->{if(gen==generation){socket=null;joined=false;}});}
   @Override public void onClosed(WebSocket ws,int code,String reason){main.post(()->{if(gen==generation){socket=null;joined=false;}});}
  });
  main.postDelayed(heartbeat,25000);
 }
 private JSONObject filter(String table,String filter)throws JSONException{JSONObject o=ConnectApi.obj("event","*","schema","public","table",table);if(filter!=null)o.put("filter",filter);return o;}
 private void send(WebSocket ws,String topic,String event,JSONObject payload)throws JSONException{ws.send(ConnectApi.obj("topic",topic,"event",event,"payload",payload,"ref",Integer.toString(refs.incrementAndGet())).toString());}
 private final Runnable heartbeat=new Runnable(){public void run(){if(socket==null)return;try{send(socket,"phoenix","heartbeat",new JSONObject());}catch(Exception ignored){}main.postDelayed(this,25000);}};
 boolean active(){return joined&&socket!=null;}
 void stop(){++generation;main.removeCallbacks(heartbeat);if(socket!=null){socket.close(1000,"leave");socket=null;}joined=false;listener=null;access=null;}
}
