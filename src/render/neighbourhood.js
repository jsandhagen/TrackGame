import { rect, ellipse, line, shade, hash, px } from './pixel.js';
import { box, gable, windowAt, tree, bush, bench, lamp } from './buildings.js';
import { text } from './font.js';

// Carriageways are a single connected network. Walking routes use their sidewalks.
export const CITY_ROADS = [
  { x1: 562, y1: 146, x2: 1000, y2: 146, width: 20 }, // Town Lane
  { x1: 562, y1: 146, x2: 562, y2: 518, width: 20 }, // Club Avenue
  { x1: 562, y1: 268, x2: 976, y2: 268, width: 20 }, // North Lane
  { x1: 0, y1: 518, x2: 1000, y2: 518, width: 22 }, // Club Row
  { x1: 0, y1: 708, x2: 1000, y2: 708, width: 22 }, // Stadium Boulevard
  { x1: 976, y1: 146, x2: 976, y2: 708, width: 20 }, // eastern connection
  { x1: 280, y1: 518, x2: 280, y2: 740, width: 24 }, // station approach
];
export const RESIDENTIAL_LOTS = [
  ...Array.from({ length: 6 }, (_, i) => ({ x: 584 + i * 62, y: 58, w: 58, h: 64, kind: i === 2 ? 'bakery' : 'home', seed: i })),
  { x: 752, y: 552, w: 94, h: 126, kind: 'home', seed: 7 },
  { x: 854, y: 552, w: 94, h: 126, kind: 'home', seed: 8 },
];
export const STREET_LAMPS = [
  ...[42, 138, 356, 448, 650, 746, 842, 936].map(x => [x, 501]),
  ...[42, 138, 356, 448, 650, 746, 842, 936].map(x => [x, 690]),
  ...[626, 750, 874].map(x => [x, 251]),
  ...[610, 734, 858].map(x => [x, 129]),
  ...[324, 412, 650, 738, 836, 930].map(x => [x, 537]),
];
const green = season => ['#8fb76b', '#79a75d', '#a5a36b', '#e1e7de'][season];
const stone = season => season === 3 ? '#e5e6df' : '#d4c9b1';
function walk(g, x, y, w, h, season) {
  const c = stone(season);
  rect(g, x, y, w, h, c);
  rect(g, x, y, w, 1, shade(c, 0.16));
  rect(g, x, y + h - 1, w, 1, shade(c, -0.17));
  if (w > h) for (let xx = x + 6; xx < x + w; xx += 9) rect(g, xx, y + 1, 1, h - 2, shade(c, -0.08));
  else for (let yy = y + 6; yy < y + h; yy += 9) rect(g, x + 1, yy, w - 2, 1, shade(c, -0.08));
}
const horizontal = r => r.y1 === r.y2;
const roadRect = r => horizontal(r) ? [r.x1, r.y1 - r.width / 2, r.x2 - r.x1, r.width] : [r.x1 - r.width / 2, r.y1, r.width, r.y2 - r.y1];
function junctions() {
  const out = [];
  for (const h of CITY_ROADS.filter(horizontal)) for (const v of CITY_ROADS.filter(r => !horizontal(r))) {
    if (v.x1 >= h.x1 && v.x1 <= h.x2 && h.y1 >= v.y1 && h.y1 <= v.y2) out.push({ x: v.x1, y: h.y1, h, v });
  }
  return out;
}
const JUNCTIONS = junctions();
export function drawStreetNetwork(g, season) {
  // Draw the whole asphalt union before adding kerbs and markings, so no seam closes a junction.
  for (const r of CITY_ROADS) {
    const [x, y, w, h] = roadRect(r);
    walk(g, x - 7, y - 7, w + 14, h + 14, season);
  }
  for (const r of CITY_ROADS) {
    const [x, y, w, h] = roadRect(r);
    rect(g, x - 1, y - 1, w + 2, h + 2, '#b7b5a8');
    rect(g, x, y, w, h, '#737c7b');
    for (let i = 0; i < w * h / 55; i++) px(g, x + hash(i * 3 + x) * w, y + hash(i * 7 + y) * h, '#6e7776');
  }
  // Remove kerbs inside the crossing streets, including the approach's T-junction.
  for (const j of JUNCTIONS) {
    rect(g, j.x - j.v.width / 2, j.y - j.h.width / 2, j.v.width, j.h.width, '#737c7b');
  }
  for (const r of CITY_ROADS) {
    const isH = horizontal(r), start = isH ? r.x1 : r.y1, end = isH ? r.x2 : r.y2;
    for (let p = start + 7; p < end - 3; p += 17) {
      const x = isH ? p : r.x1, y = isH ? r.y1 : p;
      if (JUNCTIONS.some(j => Math.abs(x - j.x) < 29 && Math.abs(y - j.y) < 29)) continue;
      rect(g, x - (isH ? 0 : 1), y - (isH ? 1 : 0), isH ? 7 : 2, isH ? 2 : 7, '#d9d5bb');
    }
  }
  // These crossings line up with the existing walking routes rather than the road centres.
  for (const [x, y, axis, width] of [[610,146,'h',20], [610,268,'h',20], [548,518,'h',22], [280,536,'v',24], [280,690,'v',24], [976,250,'v',20], [976,500,'v',20], [976,690,'v',20]]) {
    if (axis === 'h') for(let yy=y-width/2+2;yy<y+width/2-1;yy+=4) rect(g,x-4,yy,9,2,'#eee9d8');
    else for(let xx=x-width/2+2;xx<x+width/2-1;xx+=4) rect(g,xx,y-4,2,9,'#eee9d8');
  }
  // A paved crossing on the Avenue follows Club Row's north sidewalk.
  for (let xx=554;xx<572;xx+=4) rect(g,xx,496,2,9,'#eee9d8');
  for (const [x,y] of [[548,132],[548,250],[548,500],[280,690],[976,250],[976,500]]) {
    rect(g,x-4,y-3,8,2,'#d6b66b');
    for(let k=0;k<3;k++) px(g,x-3+k*2,y-3,'#a18c5e');
  }
  // Drop kerbs and a proper central aisle connect both parking parcels to Club Row.
  for (const x of [213,337]) {
    rect(g,x-6,529,12,27,'#8b9290');
    rect(g,x-6,530,12,2,stone(season));
  }
}
function fence(g, x, y, w, color) {
  rect(g,x,y-3,w,1,shade(color,-0.1));
  rect(g,x,y-1,w,1,color);
  for(let xx=x;xx<=x+w;xx+=5) rect(g,xx,y-5,1,6,shade(color,0.18));
}
function uprightCar(g,x,y,color) {
  rect(g,x+1,y+2,9,19,'rgba(25,35,28,0.2)');
  rect(g,x,y,8,18,shade(color,-0.25));rect(g,x+1,y,6,17,color);
  rect(g,x+1,y+4,6,4,'#a5c6ce');rect(g,x+1,y+12,6,3,'#829fa8');
  rect(g,x-1,y+3,1,3,'#38413f');rect(g,x+8,y+3,1,3,'#38413f');
  for(const dx of [1,5]) rect(g,x+dx,y+1,2,1,'#e5d9aa');
}
export function drawResidentialLots(g,season,items) {
  const colors=['#d7cab3','#c2d1c8','#dfc3a3','#c4b8a5','#d9d4bc','#b4c8ce','#d1b49a','#c4caba','#e1c8ae'];
  for(const lot of RESIDENTIAL_LOTS) {
    const {x,y,w,h,seed}=lot, large=w>60, base=large?y+69:y+48, front=y+h;
    rect(g,x,y,w,h,green(season));
    rect(g,x,y,w,1,'#b2b99a');rect(g,x,y,1,h,'#bdbea4');rect(g,x+w-1,y,1,h,'#93a17f');
    // Rear and side fences define the parcel even when the garden is mostly lawn.
    fence(g,x+1,y+4,w-3,'#b8aa8c');
    rect(g,x+1,y+4,1,h-7,'#b2a68e');rect(g,x+w-2,y+4,1,h-7,'#b2a68e');
    const doorX=x+(large?27:21), driveX=large?x+62:x+w-14;
    walk(g,doorX,base,5,front-base+8,season);
    if(lot.kind!=='bakery') {
      rect(g,driveX,base-10,large?14:10,front-base+(large?30:24),'#b8b7a7');
      rect(g,driveX+2,base-10,1,front-base+(large?30:24),'#aaa999');
      if(seed%2===0) uprightCar(g,driveX+1,front-23,['#a56650','#718ba1','#c2ad69'][seed%3]);
    }
    const fenceColor=seed%2?'#c4bda6':'#e1dac3';
    // Gate and driveway openings are real gaps, not paint over the footpath.
    const gate=doorX-x-1;
    const edges=lot.kind==='bakery'?[[0,gate],[gate+8,w]]:[[0,gate],[gate+8,driveX-x],[driveX-x+(large?14:10),w]];
    for(const [left,right] of edges) if(right>left) fence(g,x+left,front,right-left,fenceColor);
    rect(g,doorX-3,front-6,2,7,shade(fenceColor,-0.12));rect(g,doorX+7,front-6,2,7,fenceColor);
    rect(g,x+7,front-8,1,7,'#7d725c');rect(g,x+5,front-9,6,3,'#6a8c84');
    for(const dx of large?[8,66]:[7,36]) items.push({y:front-5,draw:g=>bush(g,x+dx,front-5,season)});
    if(large) {
      items.push({y:y+20,draw:g=>tree(g,x+70,y+20,.7,season,seed)});
      walk(g,x+7,y+12,25,20,season); // backyard patio
      items.push({y:y+25,draw:g=>bench(g,x+10,y+25)});
    }
    items.push({y:base,draw:g=>{
      const lx=x+(large?12:4), buildingW=large?43:34, buildingH=seed%3===1?27:20;
      box(g,lx,base,buildingW,buildingH,18,colors[seed],{shadow:false});
      gable(g,lx,base-buildingH,buildingW,18,6,['#8b6350','#617784','#8a7456'][seed%3]);
      if(season===3) {rect(g,lx+3,base-buildingH-6,buildingW-3,2,'#f0f3ef');}
      for(let row=0;row<(buildingH>20?2:1);row++) for(let n=0;n<2;n++) windowAt(g,lx+4+n*23,base-13-row*10,5,5,seed%3===0);
      rect(g,doorX,base-11,6,11,'#657b70');rect(g,doorX+1,base-10,4,3,'#b7d4d4');px(g,doorX+4,base-5,'#ead29a');
      rect(g,doorX-2,base,10,2,'#c3b99e');
      rect(g,lx+buildingW-5,base-buildingH-12,3,7,'#956f57');
      if(lot.kind==='bakery') {
        for(let xx=lx-1;xx<lx+buildingW+1;xx+=4) rect(g,xx,base-14,4,4,xx%8?'#efe5c6':'#9b6252');
        rect(g,lx+2,base-buildingH-2,30,7,'#80614d');text(g,'BAKERY',lx+3,base-buildingH-1,{scale:.7,color:'#f4ead5',outline:null});
      }
      if(large) {
        box(g,lx+48,base+3,20,13,17,'#c0b9a3',{shadow:false});gable(g,lx+48,base-10,20,17,4,'#6b7879');
        rect(g,lx+51,base-6,13,9,'#969e96');for(let yy=base-4;yy<base+2;yy+=3)rect(g,lx+51,yy,13,1,'#77867e');
      }
      // Bins and flower boxes belong to the house, not the sidewalk.
      rect(g,lx-1,base-3,3,5,'#63816c');rect(g,lx-1,base-4,3,1,'#435e4f');
      if(season!==3) for(const dx of [3,26]) {rect(g,lx+dx,base-7,7,2,'#9d7753');for(let j=0;j<3;j++)px(g,lx+dx+j*2,base-8,seed%2?'#d99a8b':'#e4cb75');}
    }});
  }
}
export function drawClubParcel(g,x,top,w,front,open,season,index) {
  const color=open?green(season):shade(green(season),-.08);
  rect(g,x+1,top+8,w-2,front-top-8,color);
  rect(g,x+1,top+8,w-2,1,open?'#c4c3a7':'#a9ad94');
  rect(g,x+1,top+8,1,front-top-8,'#a2ac90');
  rect(g,x+w-1,top+8,1,front-top-8,'#a2ac90');
  const c=open?'#bfc1a7':'#a7ae95';
  for(const [a,b] of [[2,24],[39,w-2]]) fence(g,x+a,front,b-a,c);
  for(const dx of [23,38]) {rect(g,x+dx,front-6,2,8,open?'#b5ad96':'#9b9e87');rect(g,x+dx-1,front-7,4,1,'#e0d8c0');}
  if(open) {
    rect(g,x+7,front-5,10,4,'#6c8178');text(g,String(index+1),x+8,front-5,{scale:.6,color:'#f3ebd6',outline:null});
  }
}
export function drawPocketPark(g,season,items) {
  const x=16,y=548,w=146,h=126;
  rect(g,x,y,w,h,green(season));
  walk(g,x+6,y+7,w-12,h-14,season);rect(g,x+13,y+14,w-26,h-28,green(season));
  walk(g,x+21,536,7,20,season);walk(g,x+112,665,7,31,season);
  for(const [a,b] of [[0,20],[31,w]])fence(g,x+a,y,b-a,'#b8ba9c');
  for(const [tx,ty] of [[x+10,y+23],[x+131,y+32],[x+19,y+111]])items.push({y:ty,draw:g=>tree(g,tx,ty,.75,season,tx)});
  for(const [bx,by] of [[x+22,y+21],[x+103,y+110]])items.push({y:by,draw:g=>bench(g,bx,by)});
  // A little community play corner leaves the pond and walking loop clear.
  items.push({y:y+43,draw:g=>{
    for(const dx of [25,52])line(g,x+dx,y+42,x+dx+3,y+19,'#9d7b51',2);
    line(g,x+28,y+19,x+55,y+19,'#bc9465',2);
    for(const dx of [35,45])line(g,x+dx,y+21,x+dx,y+35,'#7e8680');
    rect(g,x+34,y+35,13,2,'#ac6e51');
  }});
}
export function drawStreetFurniture(g,items) {
  for(const [x,y] of STREET_LAMPS)items.push({y,draw:g=>lamp(g,x,y)});
}
