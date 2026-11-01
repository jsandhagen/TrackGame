import test from 'node:test';
import assert from 'node:assert/strict';
import {frameShot, followCamera, clampCamera, throwShot, ZOOM_MAX, MAX_ZOOM_RATE, MAX_PAN_RATE, FLIGHT_LEAD_MS} from '../src/render/meet-camera.js';
import {throwingSector, SCENE_HEIGHT, AIRSPACE} from '../src/render/meet-geometry.js';
import {throwTiming, flightPoint, beatDuration, throwOffset, LANDING_HOLD_MS} from '../src/render/meet-presentation.js';
import {throwReleasePoint} from '../src/render/throw-motion.js';

const views=[{width:640,height:360},{width:480,height:645}].map(v=>({...v,sceneWidth:2700,sceneTop:-AIRSPACE,sceneHeight:SCENE_HEIGHT+240+AIRSPACE,minZoom:v.width/2700}));
const visible=(cam,view)=>[cam.x-view.width/(2*cam.z),cam.y-view.height/(2*cam.z),cam.x+view.width/(2*cam.z),cam.y+view.height/(2*cam.z)];

test('the camera stays inside the extended venue and can pull back to fit the full field',()=>{
 for(const view of views) for(const cam of [{x:-50,y:-50,z:3},{x:900,y:900,z:1.4},{x:320,y:180,z:0.5}]) {
  const c=clampCamera(cam,view),[x0,y0,x1,y1]=visible(c,view);
  assert(c.z>=view.minZoom);
  assert(x0>=-1e-9&&x1<=view.sceneWidth+1e-9);
  if(view.height/c.z<view.sceneHeight) assert(y0>=view.sceneTop-1e-9&&y1<=SCENE_HEIGHT+240+1e-9);
  else assert.equal(c.y,view.sceneTop+view.sceneHeight/2,'a tall screen centres the whole venue');
 }
});

test('the moving camera keeps 70 m flights visible at varied frame rates and finishes with the complete span in view',()=>{
 for(const view of views) for(const event of ['discus','hammer','jav']) for(const dt of [16,50]) for(const angle of [-1.2,0,0.5]) {
  const beat={type:'throw',event,mark:70,side:'away'},timing=throwTiming(beat),sector=throwingSector(event,view.width,110),
    origin=[sector.origin.x,sector.origin.y],landing=sector.point(70,angle*sector.halfAngle),release=throwReleasePoint(event,3),start=[origin[0]+release[0],origin[1]+release[1]];
  let cam=frameShot(throwShot('thrower',{thrower:origin}).rect,view);
  for(let ms=-FLIGHT_LEAD_MS;ms<0;ms+=dt) {
   const anticipate=flightPoint(start,landing,(ms+FLIGHT_LEAD_MS)/timing.flightMs,timing.arcHeight);
   const shot=throwShot('thrower',{thrower:origin,anticipate});
   cam=followCamera(cam,frameShot(shot.rect,view),dt,shot.rate,view);
  }
  for(let ms=0;ms<timing.flightMs;ms+=dt) {
   const p=ms/timing.flightMs,implement=flightPoint(start,landing,p,timing.arcHeight),ground=sector.point(70*p,angle*sector.halfAngle);
   const anticipate=flightPoint(start,landing,Math.min(1,p+FLIGHT_LEAD_MS/timing.flightMs),timing.arcHeight);
   const shot=throwShot('flight',{origin,implement,ground,anticipate,upperAt:sector.upperY,chase:true});
   cam=followCamera(cam,frameShot(shot.rect,view),dt,shot.rate,view,shot.pan);
   const [x0,y0,x1,y1]=visible(cam,view);
   for(const [x,y] of [implement,ground])assert(x>=x0 && x<=x1 && y>=y0 && y<=y1,`${event}/${view.width}: flight ${x},${y} outside ${x0},${y0},${x1},${y1} at ${ms} ms`);
  }
  const resultMs=beatDuration(beat)-throwOffset(beat)-timing.landAt;
  for(let ms=0;ms<resultMs;ms+=dt) {
   const shot=throwShot(ms<LANDING_HOLD_MS?'landing':'result',{origin,landing,upperAt:sector.upperY,chase:true});
   cam=followCamera(cam,frameShot(shot.rect,view),dt,shot.rate,view,shot.pan);
  }
  const [x0,y0,x1,y1]=visible(cam,view);
  for(const [x,y] of [origin,landing])assert(x>=x0 && x<=x1 && y>=y0 && y<=y1,`${event}: the result must show the complete measured distance`);
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
  let cam=clampCamera({x:view.width/2,y:SCENE_HEIGHT/2,z:1},view);
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

test('a shot put opens on the athlete and the landing area together, then pulls out without a jump',()=>{
 for(const view of views) {
  const sector=throwingSector('shot',view.width,15),origin=[sector.origin.x,sector.origin.y],[ex]=sector.point(9);
  const close=frameShot(throwShot('thrower',{thrower:origin}).rect,view),shot=throwShot('thrower',{thrower:origin,expect:ex}),cam=frameShot(shot.rect,view);
  assert(cam.z<close.z*0.9,'wider than the close-up');
  const [x0,,x1]=visible(cam,view);
  assert(x0<=origin[0]&&x1>=ex,'the circle and the expected landing are both in frame');
  const release=throwShot('flight',{origin,implement:[origin[0]+10,origin[1]-60],ground:[origin[0]+10,origin[1]],upperAt:sector.upperY,expect:ex}).rect;
  assert.deepEqual(release.map(Math.round),shot.rect.map(Math.round),'no jump at release');
 }
});

test('a long throw is chased down the sector: the implement stays in frame, the circle drops out, the result pulls back',()=>{
 for(const view of views) {
  const sector=throwingSector('jav',view.width,90),origin=[sector.origin.x,sector.origin.y],[ex,ey]=sector.point(80);
  let circleLost=false;
  for(let f=0;f<=1;f+=0.05) {
   const gx=origin[0]+(ex-origin[0])*f,gy=origin[1]+(ey-origin[1])*f,air=[gx,gy-80*4*f*(1-f)];
   const shot=throwShot('flight',{origin,implement:air,ground:[gx,gy],upperAt:sector.upperY,chase:true}),[x0,y0,x1,y1]=visible(frameShot(shot.rect,view,shot.cap),view);
   for(const [x,y] of [air,[gx,gy]]) assert(x>=x0-1e-6&&x<=x1+1e-6&&y>=y0-1e-6&&y<=y1+1e-6,`f=${f.toFixed(2)}: implement and shadow in frame`);
   if(origin[0]<x0) circleLost=true;
   assert(shot.pan>1,'the chase may pan faster than the usual limit');
  }
  assert(circleLost,'by the end of a long flight the circle is behind the camera');
  const land=throwShot('landing',{origin,landing:[ex,ey],upperAt:sector.upperY,chase:true}).rect,result=throwShot('result',{origin,landing:[ex,ey],upperAt:sector.upperY,chase:true}).rect;
  assert(land[0]>origin[0],'the landing holds on the mark, away from the circle');
  assert(result[0]<=origin[0]&&result[2]>=ex,'the result pulls back to show the circle and the mark');
  // A short throw never needs the chase: it stays one pull-out from the circle.
  const [sx,sy]=sector.point(3),short=throwShot('flight',{origin,implement:[sx,sy-10],ground:[sx,sy],upperAt:sector.upperY,chase:true}).rect;
  assert(short[0]<=origin[0],'a short throw keeps the circle in frame');
 }
});

test('a 70 m flight crosses several close-up widths and stays visible through its high arc',()=>{
 for(const view of views) for(const event of ['discus','hammer','jav']) {
  const sector=throwingSector(event,view.width,110),origin=[sector.origin.x,sector.origin.y],landing=sector.point(70),timing=throwTiming({event,mark:70});
  const start=frameShot(throwShot('thrower',{thrower:origin}).rect,view);
  assert((landing[0]-origin[0])/(view.width/start.z)>5,'long throws travel multiple close-up screen widths');
  for(let i=0;i<=100;i++) {
   const p=i/100,implement=flightPoint([origin[0]+12,origin[1]-40],landing,p,timing.arcHeight),ground=sector.point(70*p);
   const shot=throwShot('flight',{origin,implement,ground,upperAt:sector.upperY,chase:true});
   const [x0,y0,x1,y1]=visible(frameShot(shot.rect,view),view);
   for(const [x,y] of [implement,ground]) assert(x>=x0 && x<=x1 && y>=y0 && y<=y1,`${event}: projectile and ground stay visible at ${p}`);
  }
 }
});
