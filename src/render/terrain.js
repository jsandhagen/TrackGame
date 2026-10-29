import { rect, px, shade, hash } from './pixel.js';

// Ground is painted inside an explicit parcel; elevated walls are drawn later.
export function withinGround(g, bounds, paint) {
  g.save();g.beginPath();g.rect(bounds.x,bounds.y,bounds.w,bounds.h);g.clip();
  paint();g.restore();
}
export function surface(g,x,y,w,h,color,material='lawn',seed=0) {
  rect(g,x,y,w,h,color);
  if(material==='paving') {
    for(let yy=y;yy<y+h;yy+=4) {
      rect(g,x,yy,w,1,shade(color,-.16));
      for(let xx=x+((yy-y)%8?4:0);xx<x+w;xx+=8) {
        rect(g,xx,yy,1,4,shade(color,-.12));
        if(hash(xx*3+yy+seed)>.65) rect(g,xx+2,yy+1,4,2,shade(color,.06));
      }
    }
  } else {
    for(let yy=y+2;yy<y+h-1;yy+=5) for(let xx=x+2;xx<x+w-2;xx+=6) {
      const n=hash(xx*7+yy*13+seed);
      if(n<.45) {rect(g,xx,yy,2,1,shade(color,-.13));px(g,xx+1,yy-1,shade(color,.12));}
      else if(n>.8) rect(g,xx,yy,3,2,shade(color,.045));
    }
  }
}
