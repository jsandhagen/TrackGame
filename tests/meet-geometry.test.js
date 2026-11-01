import test from 'node:test';
import assert from 'node:assert/strict';
import {throwingSector, meetCamera, SCENE_HEIGHT, GROUND_SLOPE, SECTOR_DEPTH, METRE_PX} from '../src/render/meet-geometry.js';

test('throwing sectors use the event angle and circular distance arcs on one ground plane', () => {
 for(const [event,angle] of [['shot',34.92],['discus',34.92],['hammer',34.92],['jav',28.96]]) {
  const sector=throwingSector(event,640,100);
  const arc=sector.arc(40);
  const toGround=([x,y])=>{
   const forward=(x-sector.origin.x)/sector.ppm;
   return [forward,(y-sector.origin.y+(x-sector.origin.x)*GROUND_SLOPE)/(sector.ppm*SECTOR_DEPTH)];
  };
  for(const point of arc){const [x,y]=toGround(point);assert(Math.abs(Math.hypot(x,y)-40)<1e-8);}
  const [x,y]=toGround(arc[0]);
  assert(Math.abs(Math.abs(Math.atan2(y,x))*360/Math.PI-angle)<1e-8);
  assert(arc[Math.floor(arc.length/2)][0]>arc[0][0], 'distance lines should curve, not form straight crossbars');
  const end=sector.point(100,sector.halfAngle);
  assert(end[0]<sector.width && end[1]<SCENE_HEIGHT);
 }
});

test('the camera viewport fits between portrait overlays and beside a landscape scoreboard', () => {
 for(const [width,height,insetTop,insetBottom] of [[390,844,80,310],[320,568,80,280],[550,390,0,0],[440,320,0,0],[1000,768,0,0]]) {
  const camera=meetCamera(width,height,{insetTop,insetBottom});
  assert(camera.top*camera.scale>=insetTop-1e-8);
  assert((camera.top+SCENE_HEIGHT)*camera.scale<=height-insetBottom+1e-8);
  const sector=throwingSector('shot',camera.width,25);
  for(const [x,y] of sector.arc(25)) {
   assert(x>=0 && x<=sector.width);
   assert(y>=106 && y<=SCENE_HEIGHT);
  }
 }
});

test('metres keep the same size across events, squad abilities and screen orientations', () => {
 for (const event of ['shot','discus','hammer','jav']) for (const width of [320,480,640,1200]) {
  const novice=throwingSector(event,width,30),elite=throwingSector(event,width,110);
  assert.equal(novice.ppm,METRE_PX);
  assert.deepEqual(novice.point(20),elite.point(20),'a stronger field extends the ground without shrinking it');
  assert.equal(elite.point(70)[0]-elite.origin.x,1400,'70 m covers about thirty athlete heights');
  assert(elite.width>=elite.point(110)[0]+90,'the camera has ground beyond the longest mark');
 }
});
