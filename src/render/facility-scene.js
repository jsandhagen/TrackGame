import { rect, poly, line, ellipse, shade, hash, px, tone, selOut, CAST } from './pixel.js';
import { text, measure } from './font.js';
import { windowAt, tree, bench, bush, lamp } from './buildings.js';
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
// Walls are textured in clusters, never single-pixel noise: brick courses, stone blocks, timber
// boards or metal ribs, each shaded on the same upper-left light as the volume.
function facade(g,b) {
  const {x,y,w,h,wall,material}=b,top=y-h,joint=tone(wall,-.16);
  rect(g,x,top,w,h,wall);
  g.save();g.beginPath();g.rect(x,top,w,h-3);g.clip();
  if(material==='brick') for(let yy=top+2,row=0;yy<y-3;yy+=3,row++) {
    rect(g,x,yy,w,1,joint);
    for(let xx=x+(row%2?3:0);xx<x+w;xx+=6) {
      rect(g,xx,yy+1,1,2,joint);
      // A few bricks a shade off their neighbours read as fired clay, in two-pixel clusters.
      const n=hash(xx*7+yy*13+x);
      if(n<.16) rect(g,xx+1,yy+1,5,2,tone(wall,-.08));
      else if(n>.9) rect(g,xx+1,yy+1,5,1,tone(wall,.1));
    }
  } else if(material==='stone') for(let yy=top+3,row=0;yy<y-3;yy+=5,row++) {
    rect(g,x,yy,w,1,joint);
    for(let xx=x+(row%2?5:1);xx<x+w;xx+=10) {
      rect(g,xx,yy+1,1,4,joint);
      rect(g,xx+1,yy+1,3,1,tone(wall,.12));
    }
  } else if(material==='timber') {
    for(let xx=x+3;xx<x+w;xx+=4) {rect(g,xx,top,1,h,tone(wall,-.22));rect(g,xx+1,top,1,h,tone(wall,.07));}
    rect(g,x,top+2,w,1,tone(wall,-.3));
  } else if(material==='metal') for(let xx=x+3;xx<x+w;xx+=5) {rect(g,xx,top+2,1,h-3,tone(wall,-.2));rect(g,xx+1,top+2,1,h-3,tone(wall,.12));}
  g.restore();
  // A darker plinth and a contact line where the wall meets the ground (ambient occlusion).
  rect(g,x,y-3,w,2,tone(wall,-.28));rect(g,x,y-1,w,1,selOut(wall,.7));
  rect(g,x+1,top,1,h-3,tone(wall,.2));
}
// Selective outline: each edge takes a dark from the surface beside it, darkest on the shadow
// side (right and bottom) and softest on the lit left, so buildings stand off grass and paving.
function outline(g,edges) {
  for(const [x0,y0,x1,y1,c] of edges) line(g,x0,y0,x1,y1,c);
}
export function drawBuildingVolume(g,b,season) {
  const {x,y,w,h,d,wall,roof,gable=0}=b,dx=Math.round(d*DX),dy=Math.round(d*DY);
  const side=[[x+w,y],[x+w,y-h],[x+w+dx,y-h-dy],[x+w+dx,y-dy]],sideC=tone(wall,-.32);
  poly(g,side,sideC);
  clippedPolygon(g,side,()=>{
    for(let yy=y-h-dy;yy<y;yy+=4) line(g,x+w,yy,x+w+dx,yy-dy,tone(wall,-.4));
    // The shadow side darkens toward the ground.
    line(g,x+w,y-2,x+w+dx,y-dy-2,tone(wall,-.44));
  });
  facade(g,b);
  const cap=season===3?'#edf2ed':roof,capEdge=selOut(cap,.55),wallEdge=selOut(wall,.66);
  if(gable) {
    const ridgeY=y-h-dy/2-gable,ridgeX=dx/2;
    poly(g,[[x+dx,y-h-dy],[x+w+dx,y-h-dy],[x+w+ridgeX,ridgeY],[x+ridgeX,ridgeY]],tone(cap,-.26));
    poly(g,[[x+w,y-h],[x+w+ridgeX,ridgeY],[x+w+dx,y-h-dy]],tone(wall,-.24));
    const near=[[x-2,y-h+1],[x+w+2,y-h+1],[x+w+ridgeX+2,ridgeY],[x+ridgeX-2,ridgeY]];
    poly(g,near,cap);
    clippedPolygon(g,near,()=>{
      for(let yy=ridgeY+3;yy<y-h;yy+=3) {rect(g,x-2,yy,w+dx+4,1,tone(cap,-.2));for(let xx=x-3+((Math.floor(yy/3)%2)*4);xx<x+w+dx;xx+=8)rect(g,xx,yy-2,1,2,tone(cap,-.13));}
      // Sunlit upper courses, nearest the ridge.
      rect(g,x-2,ridgeY+1,w+dx+4,1,tone(cap,.16));
    });
    line(g,x+ridgeX-2,ridgeY,x+w+ridgeX+2,ridgeY,tone(cap,.3));
    rect(g,x-2,y-h+1,w+4,2,tone(roof,-.48));
    outline(g,[
      [x-2,y-h+2,x+ridgeX-2,ridgeY,capEdge],
      [x+w+ridgeX+2,ridgeY,x+w+dx,y-h-dy,capEdge],
      [x+w+dx,y-h-dy,x+w+dx,y-dy,wallEdge],
      [x+w+dx,y-dy,x+w,y,wallEdge],
      [x,y-h+3,x,y-1,selOut(wall,.42)],
    ]);
  } else {
    const top=[[x,y-h],[x+w,y-h],[x+w+dx,y-h-dy],[x+dx,y-h-dy]];
    poly(g,top,cap);
    clippedPolygon(g,top,()=>{
      for(let xx=x+4;xx<x+w+dx;xx+=7) line(g,xx,y-h,xx+dx,y-h-dy,tone(cap,-.18));
    });
    line(g,x,y-h,x+w,y-h,tone(cap,.3));
    line(g,x,y-h,x+dx,y-h-dy,tone(cap,.2));
    outline(g,[
      [x+dx,y-h-dy,x+w+dx,y-h-dy,capEdge],
      [x+w+dx,y-h-dy,x+w+dx,y-dy,wallEdge],
      [x+w+dx,y-dy,x+w,y,wallEdge],
      [x,y-h+1,x,y-1,selOut(wall,.42)],
    ]);
  }
}
export function drawFacilityGround(g,m,season) {
  withinGround(g,m.bounds,()=>{
    const paving=season===3?'#dfe4df':'#c7bba0';
    for(const b of m.blocks) {
      const f=projectedFootprint(b);
      surface(g,f.x-3,f.y-2,f.w+6,f.h+6,paving,'paving',m.index);
      // The top level lays a kerbed apron: a cool edge on the far side, a sunlit one in front.
      if(m.L>=3) {rect(g,f.x-3,f.y-2,f.w+6,1,tone(paving,-.28));rect(g,f.x-3,f.y+f.h+3,f.w+6,1,tone(paving,.22));}
      const reach=8+Math.round(b.h*.35),dx=Math.round(b.d*DX),dy=Math.round(b.d*DY);
      poly(g,[[b.x+2,b.y+3],[b.x+b.w+reach,b.y+3],[b.x+b.w+dx+reach,b.y-dy+4],[b.x+dx,b.y-dy]],CAST);
      rect(g,b.x-1,b.y-1,b.w+2,3,CAST);
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
// Text on a coloured plate: dark ink on light club colours, cream on dark ones.
const ink=c=>{const n=parseInt(c.slice(1,7),16);return .3*(n>>16&255)+.59*(n>>8&255)+.11*(n&255)>150?'#2a2420':'#f7edcf';};
// Upgrades read on the building itself, not only in the menu. Level 2 adds a canopy over the
// door, planters and roof plant; level 3 adds the club's banners, solar panels or roof lights,
// a plated nameboard in club colours and a lamp on the path. Every addition keeps the map's
// upper-left light: lit tops and left edges, cool shadows below and to the right.
function upgrades(g,m,main,doorX,colors,season) {
  const {type,L}=m,{x,y,w,h,d,wall,gable=0}=main,dx=Math.round(d*DX),dy=Math.round(d*DY),primary=colors.primary;
  if(L>=2) {
    if(type!=='cafe'&&type!=='shop') {
      rect(g,doorX-3,y-16,14,1,tone(wall,-.34));
      rect(g,doorX-4,y-19,16,3,primary);rect(g,doorX-4,y-19,16,1,tone(primary,.3));
      rect(g,doorX-4,y-17,16,1,selOut(primary,.5));px(g,doorX-4,y-18,tone(primary,.18));
    }
    const leaves=['#6a9a50','#4e8a48','#c07a3a','#e8ece6'][season];
    for(const px0 of [doorX-9,doorX+12]) {
      if(px0<x+2||px0+5>x+w-1||(px0<x+24&&['gym','workshop','indoor'].includes(type))) continue;
      rect(g,px0,y-4,5,4,'#8a6a4a');rect(g,px0,y-4,5,1,tone('#8a6a4a',.25));rect(g,px0+4,y-3,1,3,selOut('#8a6a4a',.4));
      rect(g,px0,y-7,5,3,leaves);rect(g,px0+1,y-7,2,1,tone(leaves,.25));px(g,px0+4,y-5,tone(leaves,-.35));
    }
    if(gable) {
      // A chimney stack on the near roof slope.
      const cx=x+Math.round(w*.72),ridgeY=y-h-dy/2-gable,cy=Math.round(ridgeY+3);
      rect(g,cx,cy-6,4,8,tone(wall,-.05));rect(g,cx,cy-6,1,8,tone(wall,.2));rect(g,cx+3,cy-6,1,8,selOut(wall,.5));
      rect(g,cx-1,cy-7,6,1,selOut(wall,.55));
    } else {
      // Rooftop plant set back toward the far parapet, clear of roof lights.
      const bx=x+w-13+Math.round(dx/2),by=y-h-Math.round(dy/2)+2;
      rect(g,bx,by-4,8,4,'#9aa3a4');rect(g,bx,by-4,8,1,tone('#9aa3a4',.3));rect(g,bx+7,by-3,1,3,selOut('#9aa3a4',.5));
      rect(g,bx+2,by-3,3,1,'#5d6669');rect(g,bx,by,9,1,'rgba(26,32,66,.3)');
    }
  }
  if(L>=3) {
    if(gable) {
      // Roof lights set into the near slope.
      for(const rx of [x+6,x+Math.round(w*.42)]) {
        const ry=y-h-3;
        poly(g,[[rx,ry],[rx+7,ry],[rx+9,ry-3],[rx+2,ry-3]],'#3d6680');line(g,rx+3,ry-1,rx+6,ry-1,'#a9cfd8');
        line(g,rx,ry,rx+7,ry,selOut('#3d6680',.4));
      }
    } else if(!['institute','testing','indoor'].includes(type)) {
      // Solar panels across the flat roof, angled to the light.
      for(let n=0;n<3;n++) {
        const sx=x+5+n*11,sy=y-h-3;
        poly(g,[[sx,sy],[sx+8,sy],[sx+10,sy-4],[sx+2,sy-4]],'#2f4a6e');
        line(g,sx+2,sy-4,sx+10,sy-4,'#8fb3d0');line(g,sx+5,sy,sx+6,sy-4,'#486a8c');
      }
    }
    // The club's banners hang from the eave at both corners.
    for(const bx of [x+3,x+w-6]) {
      const by=y-h+(gable?3:2);
      rect(g,bx,by,3,10,primary);rect(g,bx,by,1,10,tone(primary,.25));rect(g,bx+2,by,1,10,selOut(primary,.4));
      rect(g,bx,by+4,3,2,colors.secondary);px(g,bx+1,by+10,primary);
    }
    // A lamp at the garden gate.
    lamp(g,m.gate[0]-10,m.gate[1]-2);
  }
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
    upgrades(g,m,main,doorX,colors,season);
    // Architectural nameplate on the wall below the eave: a timber board, framed once upgraded,
    // and plated in club colours at the top level.
    const label=main.label,signW=measure(label)+4,sx=main.x+(L>=3?7:3),sy=main.y-main.h+2,plate=L>=3?colors.primary:tone(main.roof,-.25);
    rect(g,sx,sy,signW,9,plate);
    if(L>=2) {rect(g,sx,sy,signW,1,tone(plate,.28));rect(g,sx,sy+8,signW,1,selOut(plate,.45));}
    text(g,label,sx+2,sy+1,{color:ink(plate),outline:null});
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
