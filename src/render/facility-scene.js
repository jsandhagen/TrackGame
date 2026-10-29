import { rect, poly, line, ellipse, shade, hash, px } from './pixel.js';
import { text, measure } from './font.js';
import { windowAt, tree, bench, bush } from './buildings.js';
import { figure } from './sprites.js';
import { LOTS, baseOf, streetOf, parcelBounds } from './campus-layout.js';
import { withinGround, surface } from './terrain.js';

// Map buildings are volumes sharing the stadium's oblique ground axes. Their
// courtyards and shadows belong to parcels; walls/roofs belong to the depth scene.
const DX=.4,DY=.5;
const BUILDINGS={
  club:      {label:'CLUB',w:62,h:25,d:28,wall:'#e5d4b5',roof:'#a95139',material:'stone',gable:8},
  gym:       {label:'GYM',w:66,h:25,d:28,wall:'#bd7552',roof:'#657785',material:'brick',gable:5},
  cafe:      {label:'CAFE',w:48,h:23,d:26,wall:'#e9d4b3',roof:'#88604b',material:'stone',gable:7},
  shop:      {label:'KIT',w:54,h:24,d:25,wall:'#dce4dc',roof:'#536b70',material:'stone'},
  spa:       {label:'SPA',w:43,h:22,d:26,wall:'#d7e5df',roof:'#4e8b86',material:'stone',gable:6},
  dorm:      {label:'DORMS',w:60,h:28,d:26,wall:'#c18c6a',roof:'#8c4f3c',material:'brick',gable:7},
  scout:     {label:'SCOUT',w:52,h:23,d:25,wall:'#d4cfab',roof:'#65754b',material:'stone',gable:7},
  workshop:  {label:'KIT WORKS',w:66,h:25,d:28,wall:'#a47c58',roof:'#596c74',material:'timber',gable:6},
  library:   {label:'BOOKS',w:62,h:26,d:28,wall:'#aa6551',roof:'#554f47',material:'brick',gable:7},
  lab:       {label:'LAB',w:60,h:25,d:28,wall:'#dbe5e9',roof:'#7797a4',material:'stone'},
  institute: {label:'SCIENCE',w:66,h:29,d:28,wall:'#cddce4',roof:'#5d7788',material:'stone'},
  indoor:    {label:'THROWS HALL',w:76,h:27,d:28,wall:'#a9c1cc',roof:'#527485',material:'metal',gable:8},
  lodge:     {label:'COACH',w:62,h:26,d:28,wall:'#ae906c',roof:'#685845',material:'timber',gable:8},
  testing:   {label:'TESTING',w:68,h:27,d:28,wall:'#c5d9d5',roof:'#4f7f7e',material:'stone'},
};
export function facilityModel(type,level,index) {
  const [x,top]=LOTS[index],L=Math.min(3,level),b=baseOf(index)-2;
  const bounds=parcelBounds(index);
  const spec=BUILDINGS[type];
  const blocks=spec ? [{...spec,x:x+(type==='indoor'?9:18),y:b,h:spec.h+4+(L-1)*(type==='dorm'||type==='institute'?3:1)}] : [];
  if(spec && L>1 && ['spa','lab','testing'].includes(type)) blocks.push({x:x+80,y:b-2,w:13,h:15,d:19,wall:spec.wall,roof:spec.roof,material:spec.material});
  const entry=spec ? [blocks[0].x+Math.floor(spec.w/2),b+2] : [x+52,b];
  return {type,level,L,index,x,top,b,bounds,blocks,entry,depth:b+3,gate:[x+31,streetOf(index)-12]};
}
export function projectedFootprint(block) {
  const {x,y,w,d}=block,dx=Math.round(d*DX),dy=Math.round(d*DY);
  return {x,y:y-dy,w:w+dx,h:dy};
}
function clippedPolygon(g,points,paint) {
  g.save();g.beginPath();g.moveTo(...points[0]);for(const p of points.slice(1))g.lineTo(...p);g.closePath();g.clip();paint();g.restore();
}
function facade(g,b) {
  const {x,y,w,h,wall,material}=b;
  rect(g,x,y-h,w,h,wall);
  for(let yy=y-h+3;yy<y-2;yy+=material==='brick'?4:5) {
    const c=shade(wall,material==='timber'?-.2:-.12);
    rect(g,x,yy,w,1,c);
    if(material==='brick') for(let xx=x+((yy-y)%8?3:0);xx<x+w;xx+=8) rect(g,xx,yy-3,1,3,c);
  }
  if(material==='metal') for(let xx=x+3;xx<x+w;xx+=5) {rect(g,xx,y-h+2,1,h-3,shade(wall,-.18));rect(g,xx+1,y-h+2,1,h-3,shade(wall,.1));}
  for(let n=0;n<w*h/30;n++) {
    const xx=x+1+hash(n*17+x)*Math.max(1,w-2),yy=y-h+2+hash(n*23+y)*Math.max(1,h-5);
    px(g,xx,yy,shade(wall,n%2?-.09:.12));
  }
  rect(g,x,y-3,w,2,shade(wall,-.25));rect(g,x,y-1,w,1,'#646457');
  rect(g,x,y-h,2,h-3,shade(wall,.16));
}
export function drawBuildingVolume(g,b,season) {
  const {x,y,w,h,d,wall,roof,gable=0}=b,dx=Math.round(d*DX),dy=Math.round(d*DY);
  const side=[[x+w,y],[x+w,y-h],[x+w+dx,y-h-dy],[x+w+dx,y-dy]];
  poly(g,side,shade(wall,-.27));
  clippedPolygon(g,side,()=>{
    for(let yy=y-h-dy;yy<y;yy+=4) line(g,x+w,yy,x+w+dx,yy-dy,shade(wall,-.37));
    for(let xx=x+w+3;xx<x+w+dx;xx+=4) line(g,xx,y-h-dy,xx,y,shade(wall,-.22));
  });
  facade(g,b);
  const cap=season===3?'#edf2ed':roof;
  if(gable) {
    const ridgeY=y-h-dy/2-gable,ridgeX=dx/2;
    poly(g,[[x+dx,y-h-dy],[x+w+dx,y-h-dy],[x+w+ridgeX,ridgeY],[x+ridgeX,ridgeY]],shade(cap,-.2));
    poly(g,[[x+w,y-h],[x+w+ridgeX,ridgeY],[x+w+dx,y-h-dy]],shade(wall,-.2));
    const near=[[x-2,y-h+1],[x+w+2,y-h+1],[x+w+ridgeX+2,ridgeY],[x+ridgeX-2,ridgeY]];
    poly(g,near,cap);
    clippedPolygon(g,near,()=>{
      for(let yy=ridgeY+3;yy<y-h;yy+=3) {rect(g,x-2,yy,w+dx+4,1,shade(cap,-.19));for(let xx=x-3+((Math.floor(yy/3)%2)*4);xx<x+w+dx;xx+=8)rect(g,xx,yy-2,1,2,shade(cap,-.12));}
    });
    line(g,x+ridgeX-2,ridgeY,x+w+ridgeX+2,ridgeY,shade(cap,.22));
    rect(g,x-2,y-h+1,w+4,2,shade(roof,-.4));
  } else {
    const top=[[x,y-h],[x+w,y-h],[x+w+dx,y-h-dy],[x+dx,y-h-dy]];
    poly(g,top,cap);
    clippedPolygon(g,top,()=>{
      for(let xx=x+4;xx<x+w+dx;xx+=7) line(g,xx,y-h,xx+dx,y-h-dy,shade(cap,-.2));
      for(let n=0;n<w;n+=5)px(g,x+n+4,y-h-dy/2+hash(n)*2,shade(cap,.12));
    });
    line(g,x,y-h,x+w,y-h,shade(cap,.25));
  }
}
export function drawFacilityGround(g,m,season) {
  withinGround(g,m.bounds,()=>{
    const paving=season===3?'#dfe4df':'#c7bba0';
    for(const b of m.blocks) {
      const f=projectedFootprint(b);
      surface(g,f.x-3,f.y-2,f.w+6,f.h+6,paving,'paving',m.index);
      const reach=8+Math.round(b.h*.35),dx=Math.round(b.d*DX),dy=Math.round(b.d*DY);
      poly(g,[[b.x+2,b.y+3],[b.x+b.w+reach,b.y+3],[b.x+b.w+dx+reach,b.y-dy+4],[b.x+dx,b.y-dy]],'rgba(30,43,31,.2)');
      rect(g,b.x-1,b.y-1,b.w+2,3,'rgba(30,43,31,.2)');
    }
    // A connected path bends from the actual door to the parcel's gate.
    const [ex,ey]=m.entry,[gx,gy]=m.gate,joint=gy-5;
    surface(g,ex-4,ey,8,Math.max(1,joint-ey+4),paving,'paving',m.index);
    surface(g,Math.min(ex,gx)-4,joint,Math.abs(ex-gx)+8,8,paving,'paving',m.index);
    surface(g,gx-4,joint,8,gy-joint+1,paving,'paving',m.index);
    if(m.type==='cafe') surface(g,m.x+71,m.b-12,29,19,paving,'paving',m.index);
    if(m.type==='garden'||m.type==='fountain'||m.type==='statue') surface(g,m.x+12,m.b-26,86,30,paving,'paving',m.index);
  });
}
function entrance(g,b,colors) {
  const x=b.x+Math.floor(b.w/2)-4,y=b.y;
  rect(g,x-2,y-15,12,15,'#4a5148');rect(g,x,y-13,8,13,colors.primary);
  rect(g,x+1,y-12,6,5,'#a6c7c8');px(g,x+6,y-5,'#f5d47e');
  rect(g,x-3,y,14,2,'#d8cdb5');rect(g,x-4,y+2,16,1,'#9d947e');
  return x;
}
export function drawFacilityStructure(g,m,season,colors,now=0) {
  const {type,L,x,b}=m;
  for(const block of m.blocks) drawBuildingVolume(g,block,season);
  if(m.blocks.length) {
    const main=m.blocks[0],doorX=entrance(g,main,colors),glass=type==='institute'||type==='testing';
    const rows=type==='dorm'||glass?2:1;
    for(let row=0;row<rows;row++) for(let xx=main.x+5;xx<main.x+main.w-8;xx+=12) {
      if(row===0&&Math.abs(xx-doorX)<11)continue;
      windowAt(g,xx,main.y-12-row*9,glass?8:6,6,type==='cafe'||type==='library'||type==='lodge');
    }
    // Architectural nameplate sits on the wall, below the eave.
    const label=main.label,signW=measure(label)+4,sy=main.y-main.h+2;
    rect(g,main.x+3,sy,signW,9,shade(main.roof,-.2));
    text(g,label,main.x+5,sy+1,{color:'#f7edcf',outline:null});
    if(type==='cafe'||type==='shop') {
      for(let xx=main.x+2;xx<main.x+main.w-1;xx+=4) rect(g,xx,main.y-17,4,4,Math.floor((xx-main.x)/4)%2?colors.primary:'#f2e5c6');
      line(g,main.x+2,main.y-13,main.x+main.w-2,main.y-13,'#7a7059');
    }
    if(type==='gym'||type==='workshop'||type==='indoor') {
      rect(g,main.x+5,main.y-15,18,14,'#48514d');
      for(let yy=main.y-13;yy<main.y-1;yy+=3)rect(g,main.x+6,yy,16,1,'#83918b');
    }
    if(type==='lab') {ellipse(g,main.x+main.w-14,main.y-main.h-8,10,7,'#a8c0cc');ellipse(g,main.x+main.w-17,main.y-main.h-10,5,3,'#e0e9eb');}
    if(glass||type==='indoor') for(let n=0;n<L+1;n++) {
      const sx=main.x+8+n*13,sy=main.y-main.h-6;
      poly(g,[[sx,sy],[sx+9,sy],[sx+12,sy-5],[sx+3,sy-5]],'#3d637d');line(g,sx+5,sy,sx+8,sy-5,'#a2c0c7');
    }
    if(type==='spa') {
      drawBuildingVolume(g,{x:x+70,y:b-3,w:23,h:4,d:18,wall:'#b5c4be',roof:'#77b9ca'},season);
      line(g,x+74,b-9,x+91,b-9,'#c6eef0');
    }
    if(type==='cafe') {
      for(const cy of [b-8,b+1]) {ellipse(g,x+85,cy,7,3,'#e6d8b8');rect(g,x+84,cy,2,5,'#79674e');bench(g,x+94,cy+3);}
    }
    if(type==='club'||type==='shop'||type==='lodge') {
      const fx=x+9,fy=b-2,tip=fy-24,wave=Math.round(Math.sin(now/350+m.index));
      rect(g,fx,tip,1,24,'#87958b');poly(g,[[fx+1,tip],[fx+13,tip+3+wave],[fx+1,tip+7]],colors.primary);rect(g,fx+2,tip+3,6,1,colors.secondary);
    }
    if(type==='cafe') for(let n=0;n<2;n++){const p=(now/1800+n/2)%1;px(g,main.x+12+Math.sin(now/500+n)*2,main.y-main.h-7-p*10,`rgba(235,239,227,${.6*(1-p)})`);}
  } else if(type==='garden') {
    for(const [bx,by] of [[x+20,b-13],[x+56,b-21]]) {
      drawBuildingVolume(g,{x:bx,y:by,w:27,h:3,d:13,wall:'#9c7c55',roof:'#625c3b'},season);
      for(let k=0;k<8;k++) {const xx=bx+3+k*3;rect(g,xx,by-6,1,3,'#527347');px(g,xx,by-7,['#e6be64','#e5a68b','#eeead4'][k%3]);}
    }
    tree(g,x+89,b-7,.65,season,m.index);bench(g,x+25,b+1);
  } else if(type==='fountain') {
    ellipse(g,x+55,b-3,27,11,'rgba(32,47,34,.2)');
    ellipse(g,x+52,b-8,26,10,'#8b9689');ellipse(g,x+52,b-11,26,10,'#d4d0b8');ellipse(g,x+52,b-12,21,7,'#69a9bf');
    drawBuildingVolume(g,{x:x+48,y:b-10,w:8,h:15,d:10,wall:'#bdc7b6',roof:'#e8ddbb'},season);
    for(let n=0;n<8;n++){const a=n*Math.PI/4,p=(now/900+n/8)%1;px(g,x+52+Math.cos(a)*p*17,b-29+p*p*18,'#c8e9e8');}
  } else if(type==='statue') {
    drawBuildingVolume(g,{x:x+40,y:b,w:27,h:7,d:19,wall:'#a7a38d',roof:'#d6cab0'},season);
    drawBuildingVolume(g,{x:x+46,y:b-7,w:15,h:13,d:12,wall:'#c4b68f',roof:'#e9d6a9'},season);
    figure(g,{look:{skin:'#cda94f',hair:'#b28d3d',style:0},shirt:'#cda94f',collar:'#f4db88',pose:'cheer',frame:0},x+53,b-23,1);
    if(L>1)for(const dx of [25,82])bush(g,x+dx,b-2,season);
  }
}
