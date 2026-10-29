import test from 'node:test';
import assert from 'node:assert/strict';
import { CITY_ROADS, RESIDENTIAL_LOTS } from '../src/render/neighbourhood.js';
import { LOTS, route } from '../src/render/world.js';
import { MAP_H, streetOf, front, LOT_W, BUS_STOP, PARKING, POCKET_PARK, BUS_BAY } from '../src/render/campus-layout.js';

const bounds = r => r.y1 === r.y2
  ? {x:r.x1,y:r.y1-r.width/2,w:r.x2-r.x1,h:r.width}
  : {x:r.x1-r.width/2,y:r.y1,w:r.width,h:r.y2-r.y1};
const overlaps = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
const touches = (a,b) => a.x <= b.x+b.w && a.x+a.w >= b.x && a.y <= b.y+b.h && a.y+a.h >= b.y;

test('town streets, club streets and station approach form one connected carriageway network',()=>{
  const reached=new Set([0]);
  for(let changed=true;changed;) {
    changed=false;
    CITY_ROADS.forEach((r,i)=>{
      if(!reached.has(i) && [...reached].some(j=>touches(bounds(r),bounds(CITY_ROADS[j])))) {reached.add(i);changed=true;}
    });
  }
  assert.equal(reached.size,CITY_ROADS.length,'a disconnected road would strand its neighborhood');
  assert(CITY_ROADS.some(r=>r.x1===280 && r.y2===MAP_H),'station approach must reach the map entrance');
});

test('residential parcels and all thirteen club lots stay clear of carriageways',()=>{
  const clubs=LOTS.map(([x,top],i)=>({x:x+1,y:top+8,w:LOT_W-2,h:streetOf(i)-12-(top+8)}));
  assert.equal(clubs.length,13);
  const parcels=[...clubs,...RESIDENTIAL_LOTS,...PARKING,POCKET_PARK,BUS_BAY];
  for(const lot of parcels) for(const road of CITY_ROADS) assert(!overlaps(lot,bounds(road)),JSON.stringify({lot,road}));
  for(let i=0;i<parcels.length;i++) for(let j=i+1;j<parcels.length;j++) assert(!overlaps(parcels[i],parcels[j]),JSON.stringify({a:parcels[i],b:parcels[j]}));
});

test('walking between club streets leaves and enters through the parcel gates',()=>{
  const start=[380,486],end=[650,236],points=[start,...route(start,end)];
  const xAtY=(a,b,y)=>a[0]===b[0] && Math.min(a[1],b[1])<y && Math.max(a[1],b[1])>y ? a[0] : null;
  const crossings=(y,left,right)=>points.slice(1).map((p,i)=>xAtY(points[i],p,y)).filter(x=>x!=null && x>=left && x<right);
  assert.deepEqual(crossings(488,312,424),[335],'Club Row fence must be crossed at its gate');
  assert.deepEqual(crossings(238,600,712),[631],'North Lane fence must be crossed at its gate');
  assert.deepEqual(points.at(-1),end);
  for(const i of [4,5,8]) {
    const start=front(i),path=[start,...route(start,front(1))],fence=streetOf(i)-12;
    const gates=path.slice(1).map((p,n)=>xAtY(path[n],p,fence)).filter(x=>x!=null && x>=LOTS[i][0] && x<LOTS[i][0]+LOT_W);
    assert.deepEqual(gates,[LOTS[i][0]+31],`lower plot ${i} must use its relocated gate`);
  }
});

test('practice-field and bus-stop visitors use perimeter walks and the marked crossing',()=>{
  const field=route([668,394],[380,486]);
  assert.deepEqual(field[0],[548,394],'the practice-field walk avoids the buildings below it');
  assert(field.some(p=>p[0]===548 && p[1]===500));
  const bus=route(BUS_STOP.waiting,[380,486]);
  assert.deepEqual(bus[0],[548,536]);
  assert.deepEqual(bus[1],[548,500],'cross Club Row at the marked crossing');
  for(const path of [field,bus]) for(let i=1;i<path.length;i++) assert(path[i][0]===path[i-1][0] || path[i][1]===path[i-1][1]);
});
