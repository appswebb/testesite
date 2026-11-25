package com.connect.community;

import android.content.Context;
import android.graphics.*;
import android.view.View;

/** Native vector rendering of CONNECT's web mark and outline icon vocabulary. */
final class ConnectIcon extends View {
 private final String kind;private final int color;private final Paint p=new Paint(3);
 ConnectIcon(Context c,String kind,int color){super(c);this.kind=kind;this.color=color;setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);}
 private void line(Canvas c,float... points){Path a=new Path();a.moveTo(points[0],points[1]);for(int i=2;i<points.length;i+=2)a.lineTo(points[i],points[i+1]);c.drawPath(a,p);}
 private void circle(Canvas c,float x,float y,float r){c.drawCircle(x,y,r,p);}
 private void rect(Canvas c,float l,float t,float r,float b,float rad){c.drawRoundRect(l,t,r,b,rad,rad,p);}
 @Override protected void onDraw(Canvas canvas){super.onDraw(canvas);float s=Math.min(getWidth(),getHeight());canvas.save();canvas.translate((getWidth()-s)/2,(getHeight()-s)/2);canvas.scale(s/24f,s/24f);p.setColor(color);p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(1.65f);p.setStrokeCap(Paint.Cap.ROUND);p.setStrokeJoin(Paint.Join.ROUND);
 switch(kind){
 case "brand":canvas.scale(24f/64,24f/64);canvas.translate(7,1);p.setStrokeWidth(4.5f);Path bubble=new Path();bubble.moveTo(12,9);bubble.lineTo(36,9);bubble.cubicTo(44,9,50,15,50,23);bubble.lineTo(50,31);bubble.cubicTo(50,39,44,45,36,45);bubble.lineTo(23,45);bubble.lineTo(13,53);bubble.lineTo(13,45);bubble.lineTo(12,45);bubble.cubicTo(4,45,0,39,0,31);bubble.lineTo(0,23);bubble.cubicTo(0,15,4,9,12,9);bubble.close();canvas.drawPath(bubble,p);p.setStyle(Paint.Style.FILL);circle(canvas,17.5f,27,3.7f);circle(canvas,32.5f,27,3.7f);break;
 case "pin":{Path pin=new Path();pin.moveTo(12,22);pin.cubicTo(9,17,3.5f,13,4.5f,8);pin.cubicTo(5.5f,0,18.5f,0,19.5f,8);pin.cubicTo(20.5f,13,15,17,12,22);canvas.drawPath(pin,p);circle(canvas,12,9,2.5f);break;}
 case "radio":circle(canvas,12,12,8);break;
 case "edit":line(canvas,4,20,5,14,16,3,21,8,10,19,4,20);line(canvas,14,5,19,10);break;
 case "mail":rect(canvas,3,5,21,19,2.5f);line(canvas,3,6,12,13,21,6);break;
 case "lock":rect(canvas,5,10,19,21,3);canvas.drawArc(8,3,16,15,180,180,false,p);line(canvas,8,9,8,10);line(canvas,16,9,16,10);circle(canvas,12,15,1);break;
 case "eye":case "eye-off":{Path eye=new Path();eye.moveTo(2,12);eye.quadTo(12,-1,22,12);eye.quadTo(12,25,2,12);canvas.drawPath(eye,p);circle(canvas,12,12,3);if("eye-off".equals(kind))line(canvas,3,3,21,21);break;}
 case "home":line(canvas,3,10,12,3,21,10,21,21,15,21,15,14,9,14,9,21,3,21,3,10);break;
 case "bolt":line(canvas,13,2,4,13,11,13,10,22,20,10,13,10,13,2);break;
 case "rooms":rect(canvas,3,3,21,21,3);line(canvas,8,3,8,21);line(canvas,8,11,21,11);break;
 case "chat":Path chat=new Path();chat.moveTo(5,19);chat.lineTo(3,22);chat.lineTo(3,8);chat.quadTo(3,4,7,4);chat.lineTo(17,4);chat.quadTo(21,4,21,8);chat.lineTo(21,15);chat.quadTo(21,19,17,19);chat.close();canvas.drawPath(chat,p);line(canvas,7,9,17,9);line(canvas,7,13,14,13);break;
 case "user":circle(canvas,12,7.5f,3.6f);canvas.drawArc(4,12,20,26,180,180,false,p);break;
 case "users":circle(canvas,9,7,3.2f);canvas.drawArc(2,12,16,25,180,180,false,p);canvas.drawArc(13,4,20,11,-80,160,false,p);canvas.drawArc(15,13,24,25,180,100,false,p);break;
 case "bell":Path bell=new Path();bell.moveTo(4,18);bell.lineTo(6,15);bell.lineTo(6,10);bell.cubicTo(6,3,18,3,18,10);bell.lineTo(18,15);bell.lineTo(20,18);bell.close();canvas.drawPath(bell,p);canvas.drawArc(9,18,15,23,0,180,false,p);break;
 case "moon":Path moon=new Path();moon.moveTo(15,3);moon.cubicTo(2,-1,-2,19,12,21);moon.cubicTo(17,22,21,18,22,14);moon.cubicTo(12,17,7,8,15,3);canvas.drawPath(moon,p);break;
 case "sun":circle(canvas,12,12,4);for(int i=0;i<8;i++){double a=i*Math.PI/4;line(canvas,12+(float)Math.cos(a)*7,12+(float)Math.sin(a)*7,12+(float)Math.cos(a)*10,12+(float)Math.sin(a)*10);}break;
 case "camera":rect(canvas,2,6,15,18,3);line(canvas,15,10,22,6,22,18,15,14);break;
 case "crown":line(canvas,3,5,8,10,12,3,16,10,21,5,18,18,6,18,3,5);line(canvas,6,21,18,21);break;
 case "image":rect(canvas,3,3,21,21,3);circle(canvas,8,8,1.5f);line(canvas,4,17,10,11,15,16,18,13,21,16);break;
 case "settings":circle(canvas,12,12,3.2f);for(int i=0;i<8;i++){double a=i*Math.PI/4;line(canvas,12+(float)Math.cos(a)*7,12+(float)Math.sin(a)*7,12+(float)Math.cos(a)*10,12+(float)Math.sin(a)*10);}circle(canvas,12,12,8);break;
 case "search":circle(canvas,10,10,6);line(canvas,15,15,21,21);break;
 case "chevron":line(canvas,9,5,16,12,9,19);break;
 case "back":line(canvas,15,5,8,12,15,19);break;
 case "close":line(canvas,6,6,18,18);line(canvas,18,6,6,18);break;
 case "check":line(canvas,4,12,9,17,20,6);break;
 case "clock":circle(canvas,12,12,9);line(canvas,12,6,12,12,16,14);break;
 case "filter":line(canvas,3,6,21,6);line(canvas,3,12,21,12);line(canvas,3,18,21,18);p.setStyle(Paint.Style.FILL);circle(canvas,8,6,2.3f);circle(canvas,16,12,2.3f);circle(canvas,10,18,2.3f);break;
 case "heart":Path h=new Path();h.moveTo(12,20);h.cubicTo(-5,10,6,-1,12,8);h.cubicTo(18,-1,29,10,12,20);canvas.drawPath(h,p);break;
 case "refresh":canvas.drawArc(4,4,20,20,30,290,false,p);line(canvas,20,3,20,9,14,9);break;
 case "arrow":line(canvas,3,12,20,12,14,6);line(canvas,20,12,14,18);break;
 case "plus":line(canvas,12,4,12,20);line(canvas,4,12,20,12);break;
 case "shield":line(canvas,12,2,21,6,20,14,16,19,12,22,8,19,4,14,3,6,12,2);line(canvas,8,12,11,15,16,9);break;
 case "exit":rect(canvas,3,4,13,20,2);line(canvas,9,12,22,12,17,7);line(canvas,22,12,17,17);break;
 case "more":p.setStyle(Paint.Style.FILL);circle(canvas,5,12,1.5f);circle(canvas,12,12,1.5f);circle(canvas,19,12,1.5f);break;
 default:circle(canvas,12,12,8);line(canvas,12,8,12,13);circle(canvas,12,16,0.6f);
 }canvas.restore();}
}
