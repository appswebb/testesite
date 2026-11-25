package com.connect.community;
import android.content.Context;
import android.graphics.*;
import android.net.Uri;
import android.view.*;
import java.io.*;

/** Native crop preview: drag to reposition, slider zoom, bounded bitmap decoding. */
final class NativeCrop extends View {
 final Bitmap bitmap; final float ratio; final Paint paint=new Paint(3); float zoom=1,x=.5f,y=.5f; private float lastX,lastY;
 NativeCrop(Context c,Bitmap b,float ratio){super(c);bitmap=b;this.ratio=ratio;setContentDescription("Prévia de recorte. Arraste para ajustar a posição.");}
 static Bitmap decode(Context c,Uri uri)throws Exception{BitmapFactory.Options bounds=new BitmapFactory.Options();bounds.inJustDecodeBounds=true;try(InputStream in=c.getContentResolver().openInputStream(uri)){BitmapFactory.decodeStream(in,null,bounds);}if(bounds.outWidth<1||bounds.outHeight<1)throw new IOException("Imagem inválida.");BitmapFactory.Options o=new BitmapFactory.Options();o.inSampleSize=1;while(Math.max(bounds.outWidth,bounds.outHeight)/o.inSampleSize>2048)o.inSampleSize*=2;try(InputStream in=c.getContentResolver().openInputStream(uri)){Bitmap b=BitmapFactory.decodeStream(in,null,o);if(b==null)throw new IOException("Imagem inválida.");return b;}}
 private RectF region(){float w=Math.min(bitmap.getWidth(),bitmap.getHeight()*ratio)/zoom,h=w/ratio;return new RectF((bitmap.getWidth()-w)*x,(bitmap.getHeight()-h)*y,(bitmap.getWidth()-w)*x+w,(bitmap.getHeight()-h)*y+h);}
 @Override protected void onDraw(Canvas c){super.onDraw(c);c.drawColor(0xff141416);float w=Math.min(getWidth(),getHeight()*ratio),h=w/ratio;RectF dest=new RectF((getWidth()-w)/2,(getHeight()-h)/2,(getWidth()+w)/2,(getHeight()+h)/2);RectF reg=region();c.drawBitmap(bitmap,new Rect(Math.max(0,(int)reg.left),Math.max(0,(int)reg.top),Math.min(bitmap.getWidth(),Math.max(1,(int)Math.ceil(reg.right))),Math.min(bitmap.getHeight(),Math.max(1,(int)Math.ceil(reg.bottom)))),dest,paint);}
 void zoom(float z){zoom=Math.max(1,Math.min(3,z));invalidate();}
 private float clamp(float n){return Math.max(0,Math.min(1,n));}
 @Override public boolean onTouchEvent(android.view.MotionEvent e){if(e.getActionMasked()==MotionEvent.ACTION_DOWN){lastX=e.getX();lastY=e.getY();return true;}if(e.getActionMasked()==MotionEvent.ACTION_MOVE){RectF r=region();float dx=e.getX()-lastX,dy=e.getY()-lastY;float width=Math.max(1,Math.min(getWidth(),getHeight()*ratio));float height=width/ratio;x=clamp(x-dx*r.width()/width/Math.max(1,bitmap.getWidth()-r.width()));y=clamp(y-dy*r.height()/height/Math.max(1,bitmap.getHeight()-r.height()));lastX=e.getX();lastY=e.getY();invalidate();return true;}return true;}
 NativeMedia.Item encode(boolean banner,boolean avatar)throws Exception{int w=banner?900:avatar?256:1280,h=banner?300:avatar?256:Math.max(1,Math.round(w/ratio));if(h>1280){w=Math.max(1,Math.round(w*1280f/h));h=1280;}Bitmap out=Bitmap.createBitmap(w,h,Bitmap.Config.ARGB_8888);try{Canvas c=new Canvas(out);c.drawColor(Color.WHITE);RectF r=region();c.drawBitmap(bitmap,new Rect((int)r.left,(int)r.top,Math.max((int)r.left+1,(int)Math.ceil(r.right)),Math.max((int)r.top+1,(int)Math.ceil(r.bottom))),new RectF(0,0,w,h),paint);int max=banner?180000:avatar?40960:3000000;for(int q=86;q>=18;q-=8){ByteArrayOutputStream bytes=new ByteArrayOutputStream();out.compress(banner?Bitmap.CompressFormat.JPEG:Bitmap.CompressFormat.WEBP,q,bytes);if(bytes.size()<=max)return new NativeMedia.Item(bytes.toByteArray(),"image",banner?"image/jpeg":"image/webp",banner?"jpg":"webp");}throw new IOException("Não foi possível reduzir a imagem.");}finally{out.recycle();}}
}
