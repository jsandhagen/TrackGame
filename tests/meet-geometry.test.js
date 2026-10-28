import test from 'node:test';
import assert from 'node:assert/strict';
import {throwingSector, meetCamera, SCENE_HEIGHT} from '../src/render/meet-geometry.js';

test('throwing sectors use the event angle and circular distance arcs on one ground plane', () => {
 for(const [event,angle] of [['shot',34.92],['discus',34.92],['hammer',34.92],['jav',28.96]]) {
  const sector=throwingSector(event,640,100);
  const arc=sector.arc(40);
  const toGround=([x,y])=>{
   const forward=(x-sector.origin.x)/sector.ppm;
   return [forward,(y-sector.origin.y+(x-sector.origin.x)*0.1)/(sector.ppm*0.45)];
  };
  for(const point of arc){const [x,y]=toGround(point);assert(Math.abs(Math.hypot(x,y)-40)<1e-8);}
  const [x,y]=toGround(arc[0]);
  assert(Math.abs(Math.abs(Math.atan2(y,x))*360/Math.PI-angle)<1e-8);
  assert(arc[Math.floor(arc.length/2)][0]>arc[0][0], 'distance lines should curve, not form straight crossbars');
  const end=sector.point(100,sector.halfAngle);
  assert(end[0]<640 && end[1]<SCENE_HEIGHT);
 }
});

test('the complete venue fits between portrait overlays and beside a landscape scoreboard', () => {
 for(const [width,height,insetTop,insetBottom] of [[390,844,80,310],[320,568,80,280],[550,390,0,0],[440,320,0,0],[1000,768,0,0]]) {
  const camera=meetCamera(width,height,{insetTop,insetBottom});
  assert(camera.top*camera.scale>=insetTop-1e-8);
  assert((camera.top+SCENE_HEIGHT)*camera.scale<=height-insetBottom+1e-8);
  const sector=throwingSector('shot',camera.width,25);
  for(const [x,y] of sector.arc(25)) {
   assert(x>=0 && x*camera.scale<=width);
   assert(y>=106 && y<=SCENE_HEIGHT);
  }
 }
});
