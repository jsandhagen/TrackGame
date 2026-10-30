import test from 'node:test';
import assert from 'node:assert/strict';
import {frameShot, followCamera, clampCamera, throwShot, ZOOM_MAX} from '../src/render/meet-camera.js';
import {throwingSector, SCENE_HEIGHT} from '../src/render/meet-geometry.js';

const views=[{width:640,height:360,sceneHeight:SCENE_HEIGHT},{width:480,height:645,sceneHeight:SCENE_HEIGHT}];
const visible=(cam,view)=>[cam.x-view.width/(2*cam.z),cam.y-view.height/(2*cam.z),cam.x+view.width/(2*cam.z),cam.y+view.height/(2*cam.z)];

test('the camera never shows past the edges of the venue and never zooms out past the full view',()=>{
 for(const view of views) for(const cam of [{x:-50,y:-50,z:3},{x:900,y:900,z:1.4},{x:320,y:180,z:0.5}]) {
  const c=clampCamera(cam,view),[x0,y0,x1,y1]=visible(c,view);
  assert(c.z>=1);
  assert(x0>=-1e-9&&x1<=view.width+1e-9);
  if(view.height/c.z<SCENE_HEIGHT) assert(y0>=-1e-9&&y1<=SCENE_HEIGHT+1e-9);
  else assert.equal(c.y,SCENE_HEIGHT/2,'a tall screen centres the whole venue');
 }
});

test('the thrower close-up is much bigger than the full view on both orientations',()=>{
 for(const view of views) {
  const shot=throwShot('thrower',{thrower:[96,266]}),cam=frameShot(shot.rect,view,shot.cap);
  assert(cam.z>=2.4&&cam.z<=ZOOM_MAX);
  const [x0,y0,x1,y1]=visible(cam,view);
  assert(x0<=96&&x1>=96+20&&y0<=266-72&&y1>=266,'the whole thrower is in frame');
 }
});

test('the flight shot keeps the implement and its shadow in frame as it travels',()=>{
 for(const view of views) for(const f of [0.1,0.5,0.9]) {
  const sector=throwingSector('jav',view.width,90);
  const [gx,gy]=sector.point(80*f),air=[gx,gy-80*4*f*(1-f)];
  const shot=throwShot('flight',{implement:air,ground:[gx,gy]}),cam=frameShot(shot.rect,view,shot.cap);
  const [x0,y0,x1,y1]=visible(cam,view);
  for(const [x,y] of [air,[gx,gy]]) assert(x>=x0&&x<=x1&&y>=y0&&y<=y1,`f=${f}: point in view`);
 }
});

test('the result shot frames the circle and the mark, and the camera eases between shots',()=>{
 for(const view of views) {
  const sector=throwingSector('shot',view.width,15),landing=sector.point(11),origin=[sector.origin.x,sector.origin.y];
  const shot=throwShot('result',{origin,landing,lead:sector.point(12)[0],upperAt:sector.upperY}),cam=frameShot(shot.rect,view,shot.cap);
  const [x0,,x1]=visible(cam,view);
  assert(x0<=origin[0]&&x1>=landing[0]);
  const from=frameShot(throwShot('thrower',{thrower:origin}).rect,view);
  const mid=followCamera(from,cam,100,shot.rate,view),end=followCamera(from,cam,10000,shot.rate,view);
  assert(mid.z<from.z&&mid.z>cam.z,'zoom moves part of the way each frame');
  assert(Math.abs(end.z-cam.z)<1e-6&&Math.abs(end.x-cam.x)<1e-6,'and settles on the shot');
 }
});
