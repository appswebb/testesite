package com.connect.community;
import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import org.json.*;
import java.net.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;

final class ConnectApi {
 static final String BASE="https://trrakyybnvxpdhxwgjrz.supabase.co";
 static final String ANON="sb_publishable_OJ4wBPPNVBBcrcNl12yonw_hRSlMKsZ"; // Public publishable key. RLS stays on the server.
 static final String WEBSITE="https://appswebb.github.io/testesite/";
 private static final String ALIAS="connect.native.session.v1";
 private final SharedPreferences vault;
 private JSONObject session;
 ConnectApi(Context context){vault=context.getSharedPreferences("encrypted_session",Context.MODE_PRIVATE);}
 static JSONObject obj(Object... args)throws JSONException{JSONObject o=new JSONObject();for(int i=0;i<args.length;i+=2)o.put((String)args[i],args[i+1]==null?JSONObject.NULL:args[i+1]);return o;}
 static String enc(String s)throws Exception{return URLEncoder.encode(s,"UTF-8");}
 static final class ApiException extends IOException{
  final int status;final String code;
  ApiException(int s,String c,String msg){super(msg);status=s;code=c;}
  boolean invalidSession(){return status==401||code.equals("refresh_token_not_found")||code.equals("session_not_found")||code.equals("user_not_found")||code.equals("refresh_token_already_used");}
 }
 private SecretKey key()throws Exception{
  KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);
  if(ks.containsAlias(ALIAS))return (SecretKey)ks.getKey(ALIAS,null);
  KeyGenerator g=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
  g.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());return g.generateKey();
 }
 synchronized void restore()throws Exception{
  if(session!=null)return;String saved=vault.getString("session",null);if(saved==null)return;
  try{String[] parts=saved.split(":",2);Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(parts[0],Base64.NO_WRAP)));session=new JSONObject(new String(c.doFinal(Base64.decode(parts[1],Base64.NO_WRAP)),StandardCharsets.UTF_8));}
  catch(Exception ex){clear();throw new IOException("Sessão local indisponível. Entre novamente.");}
 }
 private void store(JSONObject s)throws Exception{
  if(!s.has("expires_at"))s.put("expires_at",System.currentTimeMillis()/1000+s.optLong("expires_in",3600));
  if(s.optString("access_token").isEmpty()||s.optString("refresh_token").isEmpty())throw new IOException("Sessão inválida.");
  Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,key());
  String saved=Base64.encodeToString(c.getIV(),Base64.NO_WRAP)+":"+Base64.encodeToString(c.doFinal(s.toString().getBytes(StandardCharsets.UTF_8)),Base64.NO_WRAP);
  if(!vault.edit().putString("session",saved).commit())throw new IOException("Não foi possível preservar a sessão.");session=s;
 }
 synchronized void clear(){session=null;vault.edit().remove("session").commit();}
 synchronized boolean hasSession(){return session!=null;}
 private Object http(String method,String path,JSONObject body,String bearer,String prefer)throws Exception{
  if(!path.startsWith("/auth/v1/")&&!path.startsWith("/rest/v1/"))throw new IOException("Endpoint inválido.");
  HttpURLConnection con=(HttpURLConnection)new URL(BASE+path).openConnection();
  try{
   con.setInstanceFollowRedirects(false);con.setConnectTimeout(12000);con.setReadTimeout(15000);con.setRequestMethod(method);con.setRequestProperty("apikey",ANON);if(bearer!=null)con.setRequestProperty("Authorization","Bearer "+bearer);con.setRequestProperty("Accept","application/json");
   if(prefer!=null)con.setRequestProperty("Prefer",prefer);
   if(body!=null){con.setDoOutput(true);con.setRequestProperty("Content-Type","application/json");byte[] bytes=body.toString().getBytes(StandardCharsets.UTF_8);con.setFixedLengthStreamingMode(bytes.length);try(OutputStream os=con.getOutputStream()){os.write(bytes);}}
   int status=con.getResponseCode();InputStream input=status>=200&&status<300?con.getInputStream():con.getErrorStream();String raw="";
   if(input!=null)try(InputStream in=input;ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] buf=new byte[8192];int n;while((n=in.read(buf))!=-1){if(out.size()+n>4194304)throw new IOException("Resposta muito grande.");out.write(buf,0,n);}raw=out.toString("UTF-8");}
   if(status<200||status>=300){JSONObject e;try{e=new JSONObject(raw);}catch(Exception ignored){e=new JSONObject();}String msg=e.optString("message",e.optString("msg",e.optString("error_description","Não foi possível concluir a solicitação.")));if(status>=500)msg="Servidor temporariamente indisponível.";throw new ApiException(status,e.optString("error_code",e.optString("code","")),msg);}
   return raw.isEmpty()?JSONObject.NULL:new JSONTokener(raw).nextValue();
  }finally{con.disconnect();}
 }
 synchronized void login(String email,String password,String captcha)throws Exception{store((JSONObject)http("POST","/auth/v1/token?grant_type=password",obj("email",email,"password",password,"gotrue_meta_security",obj("captcha_token",captcha)),null,null));}
 synchronized boolean signup(String email,String password,String captcha)throws Exception{
  JSONObject response=(JSONObject)http("POST","/auth/v1/signup?redirect_to="+enc(WEBSITE),obj("email",email,"password",password,"gotrue_meta_security",obj("captcha_token",captcha),"data",obj("connect_adult_declared",true,"connect_terms_accepted",true,"connect_terms_version","2026-11-25","connect_privacy_version","2026-11-25")),null,null);
  if(response.optString("access_token","").isEmpty())return false;store(response);return true;
 }
 private synchronized String token()throws Exception{
  if(session==null)throw new IOException("Entre novamente.");
  if(session.optLong("expires_at",0)<=System.currentTimeMillis()/1000+90){try{store((JSONObject)http("POST","/auth/v1/token?grant_type=refresh_token",obj("refresh_token",session.getString("refresh_token")),null,null));}catch(ApiException ex){if(ex.invalidSession())clear();throw ex;}}
  return session.getString("access_token");
 }
 synchronized JSONObject user()throws Exception{try{return (JSONObject)http("GET","/auth/v1/user",null,token(),null);}catch(ApiException ex){if(ex.invalidSession())clear();throw ex;}}
 synchronized Object rpc(String name,JSONObject args)throws Exception{return http("POST","/rest/v1/rpc/"+name,args==null?new JSONObject():args,token(),null);}
 synchronized JSONObject settings()throws Exception{return (JSONObject)http("POST","/rest/v1/rpc/entre_public_settings",new JSONObject(),null,null);}
 synchronized JSONArray rows(String query)throws Exception{return (JSONArray)http("GET","/rest/v1/"+query,null,token(),null);}
 synchronized Object insert(String table,JSONObject data)throws Exception{return http("POST","/rest/v1/"+table,data,token(),"return=representation");}
 synchronized JSONArray patch(String query,JSONObject data)throws Exception{return (JSONArray)http("PATCH","/rest/v1/"+query,data,token(),"return=representation");}
 synchronized void logout()throws Exception{if(session!=null)http("POST","/auth/v1/logout?scope=local",null,token(),null);clear();}
}
