package com.connect.community;

import android.content.Context;
import android.graphics.*;
import android.net.Uri;
import java.io.*;

/** Restricts imported media to the current backend's format and size policies. */
final class NativeMedia {
 static final class Item {
  final byte[] bytes; final String type,mime,extension;
  Item(byte[] b,String t,String m,String e){bytes=b;type=t;mime=m;extension=e;}
 }
 static Item read(Context c,Uri uri,int imageLimit,int videoLimit,boolean avatar)throws Exception {
  String mime=c.getContentResolver().getType(uri);
  if(mime==null)throw new IOException("Formato desconhecido.");
  if(mime.startsWith("image/")){
   BitmapFactory.Options bounds=new BitmapFactory.Options();bounds.inJustDecodeBounds=true;
   try(InputStream in=c.getContentResolver().openInputStream(uri)){BitmapFactory.decodeStream(in,null,bounds);}
   if(bounds.outWidth<1||bounds.outHeight<1)throw new IOException("Imagem inválida.");
   BitmapFactory.Options opts=new BitmapFactory.Options();opts.inSampleSize=1;
   while(Math.max(bounds.outWidth,bounds.outHeight)/opts.inSampleSize>1800)opts.inSampleSize*=2;
   Bitmap bitmap;try(InputStream in=c.getContentResolver().openInputStream(uri)){bitmap=BitmapFactory.decodeStream(in,null,opts);}
   if(bitmap==null)throw new IOException("Imagem inválida.");
   try {
    if(avatar){int side=Math.min(bitmap.getWidth(),bitmap.getHeight());Bitmap crop=Bitmap.createBitmap(bitmap,(bitmap.getWidth()-side)/2,(bitmap.getHeight()-side)/2,side,side);if(crop!=bitmap)bitmap.recycle();bitmap=crop;}
    int max=avatar?256:1280;
    float ratio=Math.min(1f,(float)max/Math.max(bitmap.getWidth(),bitmap.getHeight()));
    if(ratio<1){Bitmap scaled=Bitmap.createScaledBitmap(bitmap,Math.max(1,Math.round(bitmap.getWidth()*ratio)),Math.max(1,Math.round(bitmap.getHeight()*ratio)),true);if(scaled!=bitmap)bitmap.recycle();bitmap=scaled;}
    for(int q=avatar?78:82;q>=20;q-=8){ByteArrayOutputStream out=new ByteArrayOutputStream();bitmap.compress(Bitmap.CompressFormat.WEBP,q,out);byte[] bytes=out.toByteArray();if(bytes.length<=imageLimit)return new Item(bytes,"image","image/webp","webp");}
    throw new IOException("Não foi possível reduzir a imagem ao limite permitido.");
   } finally {bitmap.recycle();}
  }
  if(avatar||!("video/mp4".equals(mime)||"video/webm".equals(mime)||"audio/mp4".equals(mime)||"audio/webm".equals(mime)))throw new IOException("Use imagem, MP4 ou WebM compatível.");
  try(InputStream in=c.getContentResolver().openInputStream(uri);ByteArrayOutputStream out=new ByteArrayOutputStream()){
   if(in==null)throw new IOException("Arquivo indisponível.");
   byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1){if(out.size()+n>videoLimit)throw new IOException("Arquivo acima do limite.");out.write(b,0,n);}
   return new Item(out.toByteArray(),mime.startsWith("audio/")?"audio":"video",mime,mime.endsWith("webm")?"webm":mime.startsWith("audio/")?"m4a":"mp4");
  }
 }
}
