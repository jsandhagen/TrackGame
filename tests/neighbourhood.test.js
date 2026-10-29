import test from 'node:test';
import assert from 'node:assert/strict';
import { CITY_ROADS, RESIDENTIAL_LOTS, drawResidentialLots, drawClubParcel } from '../src/render/neighbourhood.js';
import { facilityModel, projectedFootprint, drawFacilityGround } from '../src/render/facility-scene.js';
import { FACILITIES } from '../src/game-content.js';
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

test('every facility and upgrade fits its parcel on the shared ground plane',()=>{
  for(const [type,spec] of Object.entries(FACILITIES)) for(let level=1;level<=(spec.maxLevel||3);level++) for(let i=0;i<LOTS.length;i++) {
    const model=facilityModel(type,level,i),parcel=model.bounds;
    assert.equal(model.blocks.length===0,!!spec.decor||type==='statue',`${type} must have architecture unless it is a garden or monument`);
    for(const block of model.blocks) {
      const f=projectedFootprint(block);
      assert(f.x>=parcel.x && f.y>=parcel.y && f.x+f.w<=parcel.x+parcel.w && f.y+f.h<=parcel.y+parcel.h,`${type} level ${level} footprint must fit plot ${i}`);
    }
    assert(model.entry[0]>=parcel.x && model.entry[0]<parcel.x+parcel.w);
    assert(model.entry[1]<model.gate[1],'front door must leave room for the gate path');
  }
});

test('painted lawns, driveways, paving and shadows never enter an asphalt pixel',()=>{
  // Observe actual integer painting, including clipping, rather than relying on
  // nominal parcel bounds. This catches a driveway or texture extending past it.
  const asphalt=CITY_ROADS.map(bounds),intersect=(a,b)=>({x:Math.max(a.x,b.x),y:Math.max(a.y,b.y),w:Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x),h:Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)});
  let clip={x:0,y:0,w:1000,h:MAP_H},path,stack=[],subject='',painted=0;
  const g={
    save(){stack.push(clip);},restore(){clip=stack.pop();},beginPath(){path=null;},
    rect(x,y,w,h){path={x,y,w,h};},clip(){clip=intersect(clip,path);},
    fillRect(x,y,w,h){
      const paint=intersect({x,y,w,h},clip);if(paint.w<=0||paint.h<=0)return;
      painted++;
      for(const road of asphalt) assert(!overlaps(paint,road),`${subject} painted ${JSON.stringify(paint)} over ${JSON.stringify(road)}`);
    },
  };
  for(let season=0;season<4;season++) {
    subject=`residential season ${season}`;drawResidentialLots(g,season,[]);
    for(let i=0;i<LOTS.length;i++) {
      const [x,top]=LOTS[i];subject=`parcel ${i} season ${season}`;
      drawClubParcel(g,x,top,LOT_W,streetOf(i)-12,true,season,i);
      for(const [type,spec] of Object.entries(FACILITIES)) for(let level=1;level<=(spec.maxLevel||3);level++) {
        subject=`${type} level ${level} plot ${i} season ${season}`;
        drawFacilityGround(g,facilityModel(type,level,i),season);
      }
    }
  }
  assert(painted>10000,'exercise the textured ground painting, not just bounds');
  assert.equal(stack.length,0,'ground clipping must restore the canvas state');
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
