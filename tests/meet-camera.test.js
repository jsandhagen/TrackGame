import test from 'node:test';
import assert from 'node:assert/strict';
import {frameShot, followCamera, clampCamera, throwShot, ZOOM_MAX, MAX_ZOOM_RATE, MAX_PAN_RATE} from '../src/render/meet-camera.js';
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

test('the flight shot keeps the circle, the implement and its shadow in frame, wherever it lands',()=>{
 for(const view of views) for(const angle of [-0.9,0,0.9]) for(const f of [0.1,0.5,0.9,1]) {
  const sector=throwingSector('jav',view.width,90),origin=[sector.origin.x,sector.origin.y];
  const [gx,gy]=sector.point(80*f,angle*sector.halfAngle),air=[gx,gy-80*4*f*(1-f)];
  const shot=throwShot('flight',{origin,implement:air,ground:[gx,gy],upperAt:sector.upperY}),cam=frameShot(shot.rect,view,shot.cap);
  const [x0,y0,x1,y1]=visible(cam,view);
  for(const [x,y] of [air,[gx,gy],origin]) assert(x>=x0-1e-6&&x<=x1+1e-6&&y>=y0-1e-6&&y<=y1+1e-6,`angle=${angle} f=${f}: point in view`);
 }
});

test('a throw is one continuous pull-out: the flight starts on the thrower shot and only widens',()=>{
 for(const view of views) for(const event of ['shot','jav']) {
  const sector=throwingSector(event,view.width,event==='shot'?15:90),origin=[sector.origin.x,sector.origin.y];
  const start=throwShot('thrower',{thrower:origin}).rect,release=throwShot('flight',{origin,implement:[origin[0]+10,origin[1]-60],ground:[origin[0]+10,origin[1]],upperAt:sector.upperY}).rect;
  assert.deepEqual(release.map(Math.round),start.map(Math.round),event+': no jump at release');
  let width=0;
  for(let f=0;f<=1;f+=0.05) {
   const [gx,gy]=sector.point((event==='shot'?11:70)*f),rect=throwShot('flight',{origin,implement:[gx,gy-30*f*(1-f)],ground:[gx,gy],upperAt:sector.upperY}).rect;
   assert(rect[2]-rect[0]>=width-1e-9,'never narrows');width=rect[2]-rect[0];
  }
  const [lx,ly]=sector.point(event==='shot'?11:70);
  assert.deepEqual(throwShot('landing',{origin,landing:[lx,ly],upperAt:sector.upperY}).rect,throwShot('flight',{origin,implement:[lx,ly],ground:[lx,ly],upperAt:sector.upperY}).rect,'landing holds the last flight frame');
 }
});

test('the camera never moves faster than its limits, however far the target is',()=>{
 for(const view of views) {
  let cam={x:view.width/2,y:SCENE_HEIGHT/2,z:1};
  const far=frameShot([20,180,120,250],view);
  for(let i=0;i<60;i++) {
   const next=followCamera(cam,far,16,40,view);
   assert(Math.abs(Math.log(next.z/cam.z))<=Math.log(MAX_ZOOM_RATE)*0.016+1e-9,'zoom step');
   assert(Math.hypot(next.x-cam.x,next.y-cam.y)<=MAX_PAN_RATE*view.width/next.z*0.016+1e-6,'pan step');
   cam=next;
  }
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
