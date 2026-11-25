package com.connect.community;
import android.content.Context;
import android.media.AudioAttributes;
import android.media.SoundPool;
import android.os.SystemClock;
import java.io.*;
import java.util.*;
import java.util.concurrent.*;

/** Original web CONNECT sound envelopes, synthesized locally as PCM. No microphone or network. */
final class ConnectSounds {
 private static final int RATE=24000;
 private final SoundPool pool=new SoundPool.Builder().setMaxStreams(6).setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build()).build();
 private final Map<String,Integer> ids=new ConcurrentHashMap<>();
 private final Set<Integer> ready=ConcurrentHashMap.newKeySet();
 private final Map<String,Long> last=new HashMap<>();
 private final Map<String,double[][]> tones=new LinkedHashMap<>();
 private final ExecutorService worker=Executors.newSingleThreadExecutor();
 private final File dir;
 private volatile boolean enabled=true,foreground=true,closed;private volatile int volume=80;
 ConnectSounds(Context c){dir=new File(c.getCacheDir(),"connect-sounds-v2");dir.mkdirs();pool.setOnLoadCompleteListener((p,id,status)->{if(status==0)ready.add(id);});
  add("click",new double[][]{{0,1120,520,.045,.058}});
  add("nav",new double[][]{{0,780,1050,.055,.052}});
  add("select",new double[][]{{0,900,1280,.043,.047}});
  add("open",new double[][]{{0,500,900,.07,.05}});
  add("close",new double[][]{{0,900,460,.07,.05}});
  add("pending",new double[][]{{0,600,480,.043,.035}});
  add("like",new double[][]{{0,660,880,.06,.055},{.045,990,1320,.08,.048}});
  add("send",new double[][]{{0,480,940,.07,.065},{.065,1180,1450,.055,.044}});
  add("receive",new double[][]{{0,880,780,.09,.052},{.085,660,590,.08,.046}});
  add("publish",new double[][]{{0,523,660,.105,.057},{.08,784,1047,.14,.052}});
  add("found",new double[][]{{0,440,660,.09,.056},{.075,660,880,.11,.056},{.16,880,1175,.15,.047}});
  add("match",new double[][]{{0,523,659,.12,.062},{.09,659,784,.14,.057},{.18,1047,1175,.19,.052}});
  add("login",new double[][]{{0,392,523,.1,.055},{.085,659,784,.14,.056}});
  add("logout",new double[][]{{0,784,587,.11,.057},{.1,440,294,.18,.052}});
  add("end",new double[][]{{0,587,440,.1,.05},{.09,349,262,.12,.045}});
  add("success",new double[][]{{0,659,784,.08,.052},{.075,988,1047,.1,.045}});
  add("delete",new double[][]{{0,420,250,.09,.045},{.08,280,160,.09,.035}});
  add("error",new double[][]{{0,330,260,.1,.055},{.09,310,220,.12,.048}});
  add("live",new double[][]{{0,392,660,.1,.054},{.08,784,988,.11,.05},{.16,988,1318,.1,.041}});
  worker.execute(()->{for(Map.Entry<String,double[][]> e:tones.entrySet()){if(closed)return;try{File file=new File(dir,e.getKey()+".wav");if(!file.exists())write(file,e.getValue());if(!closed)ids.put(e.getKey(),pool.load(file.getPath(),1));}catch(Exception ignored){}}});
 }
 private void add(String k,double[][] t){tones.put(k,t);}
 void configure(boolean value,int level){enabled=value;volume=Math.max(20,Math.min(100,level));}
 void foreground(boolean value){foreground=value;if(!value)pool.autoPause();}
 synchronized void play(String kind){if(!enabled||!foreground||closed)return;Integer id=ids.get(kind);if(id==null||!ready.contains(id))return;long now=SystemClock.elapsedRealtime(),gap=kind.equals("error")?1200:kind.equals("receive")?500:Arrays.asList("match","found","end").contains(kind)?700:Arrays.asList("click","nav","select").contains(kind)?45:170;if(now-last.getOrDefault(kind,0L)<gap)return;last.put(kind,now);float v=(float)((.5+volume/100.0)/1.5);pool.play(id,Math.min(v,1f),Math.min(v,1f),1,0,1f);}
 private static void le(DataOutputStream out,int value,int count)throws IOException{for(int i=0;i<count;i++)out.writeByte(value>>(8*i));}
 private void write(File f,double[][] ts)throws IOException{double end=0;for(double[] t:ts)end=Math.max(end,t[0]+t[3]+.006);int n=(int)Math.ceil(end*RATE);double[] samples=new double[n];for(double[] t:ts){int start=(int)(t[0]*RATE),len=(int)(t[3]*RATE);double phase=0;for(int j=0;j<len&&start+j<n;j++){double seconds=j/(double)RATE,freq=t[1]*Math.pow(t[2]/t[1],seconds/t[3]);double gain=seconds<.005?.0001*Math.pow(t[4]/.0001,seconds/.005):t[4]*Math.pow(.0001/t[4],(seconds-.005)/(t[3]-.005));phase+=2*Math.PI*freq/RATE;samples[start+j]+=Math.sin(phase)*gain;}}File tmp=new File(f.getPath()+".tmp");try(DataOutputStream o=new DataOutputStream(new BufferedOutputStream(new FileOutputStream(tmp)))){o.writeBytes("RIFF");le(o,36+n*2,4);o.writeBytes("WAVEfmt ");le(o,16,4);le(o,1,2);le(o,1,2);le(o,RATE,4);le(o,RATE*2,4);le(o,2,2);le(o,16,2);o.writeBytes("data");le(o,n*2,4);for(double s:samples)le(o,(int)(32767*Math.max(-1,Math.min(1,s*1.5))),2);}if(!tmp.renameTo(f))tmp.delete();}
 void destroy(){closed=true;worker.shutdownNow();pool.release();}
}
