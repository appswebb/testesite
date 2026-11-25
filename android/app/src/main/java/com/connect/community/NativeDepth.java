package com.connect.community;

import android.content.Context;
import android.graphics.*;
import android.graphics.drawable.Drawable;

/** Native, resolution-independent satin panel with layered highlights and curved contours. */
final class NativeDepth extends Drawable {
 private final Paint p=new Paint(Paint.ANTI_ALIAS_FLAG);
 private final float radius,density;
 NativeDepth(Context context,float radius,boolean dark){this.radius=radius;this.density=context.getResources().getDisplayMetrics().density;}
 @Override public void draw(Canvas c){
  Rect b=getBounds();if(b.isEmpty())return;
  float w=b.width(),h=b.height();RectF r=new RectF(b);
  int save=c.save();Path clip=new Path();clip.addRoundRect(r,radius,radius,Path.Direction.CW);c.clipPath(clip);
  p.setStyle(Paint.Style.FILL);p.setShader(new LinearGradient(r.left,r.top,r.right,r.bottom,new int[]{0xff393b44,0xff1c1e25,0xff111216},new float[]{0,.44f,1},Shader.TileMode.CLAMP));c.drawRect(r,p);
  p.setShader(new RadialGradient(r.left+w*.77f,r.top-h*.1f,Math.max(1,w*.72f),new int[]{0x25c6b393,0x00ffffff},null,Shader.TileMode.CLAMP));c.drawRect(r,p);p.setShader(null);
  p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(Math.max(.7f,density*.65f));for(int i=0;i<4;i++){p.setColor(i==0?0x44d4b88d:0x18ffffff);float delta=i*9*density;Path curve=new Path();curve.moveTo(r.left+w*.58f+delta,r.top-h*.2f);curve.cubicTo(r.left+w*.92f+delta,r.top+h*.03f,r.right-w*.13f+delta,r.bottom+h*.04f,r.right+delta,r.bottom+h*.2f);c.drawPath(curve,p);}
  p.setShader(new LinearGradient(r.left,r.top,r.left,r.bottom,new int[]{0x55ffffff,0x00ffffff,0x55000000},null,Shader.TileMode.CLAMP));p.setStrokeWidth(density);c.drawRoundRect(r,radius,radius,p);p.setShader(null);c.restoreToCount(save);
 }
 @Override public void getOutline(Outline outline){outline.setRoundRect(getBounds(),radius);}
 @Override public void setAlpha(int alpha){p.setAlpha(alpha);invalidateSelf();}
 @Override public void setColorFilter(ColorFilter filter){p.setColorFilter(filter);invalidateSelf();}
 @Override public int getOpacity(){return PixelFormat.TRANSLUCENT;}
}