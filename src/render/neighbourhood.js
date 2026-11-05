import { rect, poly, line, ellipse, shade, hash, px, tone, selOut, CAST } from './pixel.js';
import { vehicle, vehicleLength, CAR_COLOURS } from './vehicles.js';
import { windowAt, tree, bush, bench, lamp } from './buildings.js';
import { text } from './font.js';
import { MAP_W, MAP_H, STREETS, LOWER_LOT_TOP, POCKET_PARK, PARKING } from './campus-layout.js';
import { withinGround, surface } from './terrain.js';
import { projectedFootprint } from './facility-scene.js';
import { drawBuildingVolume, windowAt as houseWindow, doorAt, steps, chimney, smoke, laundry, woodpile, chair, wateringCan, bike, barrel, aboard, crate, vine, SHADOW } from './architecture.js';
const BOULEVARD = STREETS.blvd;

// Carriageways are a single connected network. Walking routes use their sidewalks.
export const CITY_ROADS = [
  { x1: 562, y1: 146, x2: MAP_W, y2: 146, width: 20, kind: 'residential' }, // Town Lane
  { x1: 562, y1: 146, x2: 562, y2: 518, width: 20, kind: 'secondary' }, // Club Avenue
  { x1: 562, y1: 268, x2: 976, y2: 268, width: 20, kind: 'secondary' }, // North Lane
  { x1: 0, y1: 518, x2: MAP_W, y2: 518, width: 22, kind: 'main' }, // Club Row
  { x1: 0, y1: BOULEVARD+18, x2: MAP_W, y2: BOULEVARD+18, width: 22, kind: 'main' }, // Stadium Boulevard
  { x1: 976, y1: 146, x2: 976, y2: BOULEVARD+18, width: 20, kind: 'secondary' }, // eastern connection
  { x1: 280, y1: 518, x2: 280, y2: MAP_H, width: 24, kind: 'main' }, // station approach
];
// Road hierarchy, kept gentle: main roads carry a faded cream centre line, secondary roads a
// fainter one, and the residential lane none at all, with cars parked at the kerb. There are no
// signals or stop signs: the lower-ranked arm gives way at a dashed line painted on the road.
const RANK = { main: 3, secondary: 2, residential: 1 };
// Zebra crossings, aligned with the walking routes: [x, y, 'h' if it crosses a horizontal road
// or 'v' a vertical one, width of the road crossed].
export const CROSSINGS = [
  [610,146,'h',20], [610,268,'h',20], [548,518,'h',22],
  [562,250,'v',20], [562,394,'v',20], [562,500,'v',20],
  [280,536,'v',24], [280,BOULEVARD,'v',24], [976,250,'v',20], [976,500,'v',20], [976,BOULEVARD,'v',20],
];
// Signalised junctions where the station approach and Club Avenue meet the main roads.
export const SIGNALS = [];
export const RESIDENTIAL_LOTS = [
  ...Array.from({ length: 6 }, (_, i) => ({ x: 584 + i * 62, y: 58, w: 58, h: 64, kind: i === 2 ? 'bakery' : 'home', seed: i })),
  { x: 736, y: LOWER_LOT_TOP, w: 94, h: BOULEVARD-12-LOWER_LOT_TOP, kind: 'home', seed: 7 },
  { x: 838, y: LOWER_LOT_TOP, w: 94, h: BOULEVARD-12-LOWER_LOT_TOP, kind: 'home', seed: 8 },
];
export const STREET_LAMPS = [
  ...[42, 138, 356, 448, 650, 746, 842, 936].map(x => [x, 501]),
  ...[42, 138, 356, 448, 650, 746, 842, 936].map(x => [x, BOULEVARD]),
  ...[626, 750, 874].map(x => [x, 251]),
  ...[610, 734, 858].map(x => [x, 129]),
  ...[324, 412, 650, 738, 836, 930].map(x => [x, 537]),
];
// Warm, dark tarmac rather than a cool engineering grey.
const ASPHALT = '#6e6a66';
const green = season => ['#8fb76b', '#79a75d', '#a5a36b', '#e1e7de'][season];
const stone = season => season === 3 ? '#e5e6df' : '#d8c8aa';
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
    rect(g, x - 1, y + h, w + 2, 1, tone('#b7b5a8', .2));
    rect(g, x, y, w, h, ASPHALT);
    // Cobbled gutters line both kerbs, so the tarmac reads narrower and warmer; the north and
    // west gutters sit in the kerb's shadow.
    const setts = '#8e8174';
    for (const [gx, gy, gw, gh, dark] of horizontal(r) ? [[x, y, w, 2, true], [x, y + h - 2, w, 2, false]] : [[x, y, 2, h, true], [x + w - 2, y, 2, h, false]]) {
      rect(g, gx, gy, gw, gh, dark ? tone(setts, -.12) : setts);
      for (let k = 0; k < (horizontal(r) ? gw : gh); k += 3) rect(g, horizontal(r) ? gx + k : gx, horizontal(r) ? gy : gy + k, horizontal(r) ? 1 : 2, horizontal(r) ? 2 : 1, tone(setts, -.22));
    }
    // Wear in clusters, not speckle: sealed cracks and patched, sun-bleached tarmac.
    for (let i = 0; i < w * h / 220; i++) {
      const px0 = x + 3 + Math.floor(hash(i * 3 + x) * (w - 8)), py0 = y + 3 + Math.floor(hash(i * 7 + y) * (h - 6)), n = hash(i * 11 + x + y);
      if (n < .4) rect(g, px0, py0, 4, 1, tone(ASPHALT, -.14));
      else if (n < .75) {rect(g, px0, py0, 3, 2, tone(ASPHALT, .07));px(g, px0, py0, tone(ASPHALT, .14));}
      else rect(g, px0, py0, 2, 1, tone(ASPHALT, -.08));
    }
  }
  // Remove kerbs inside the crossing streets, including the approach's T-junction.
  for (const j of JUNCTIONS) {
    rect(g, j.x - j.v.width / 2, j.y - j.h.width / 2, j.v.width, j.h.width, ASPHALT);
  }
  // Centre lines by rank, broken across junction boxes and zebra crossings.
  for (const r of CITY_ROADS) {
    const isH = horizontal(r), start = isH ? r.x1 : r.y1, end = isH ? r.x2 : r.y2, c = isH ? r.y1 : r.x1;
    const gaps = [
      ...JUNCTIONS.filter(j => j.h === r || j.v === r).map(j => { const p = isH ? j.x : j.y, half = (isH ? j.v : j.h).width / 2 + 2; return [p - half, p + half]; }),
      ...CROSSINGS.filter(([x, y, axis]) => (axis === 'h') === isH && Math.abs((isH ? y : x) - c) < 2).map(([x, y]) => { const p = isH ? x : y; return [p - 9, p + 9]; }),
    ];
    const clear = p => !gaps.some(([a, b]) => p >= a && p <= b);
    if (r.kind !== 'residential') {
      const dash = r.kind === 'main' ? 8 : 5, step = r.kind === 'main' ? 14 : 16, paint = r.kind === 'main' ? '#d8ccaa' : '#bdb49c';
      for (let p = start + 7; p < end - 3; p += step) if (clear(p) && clear(p + dash)) {
        const x = isH ? p : r.x1, y = isH ? r.y1 : p;
        rect(g, x - (isH ? 0 : 1), y - (isH ? 1 : 0), isH ? dash : 2, isH ? 2 : dash, paint);
      }
    }
    // Manhole covers in the lanes and gully grates against the kerb, a few to a street.
    const len = end - start;
    for (let k = 1; k * 140 < len; k++) {
      const p = start + k * 140 - 40;
      if (!clear(p) || !clear(p + 8)) continue;
      const lane = Math.round(r.width / 4), mx = isH ? p : r.x1 + lane, my = isH ? r.y1 + lane : p;
      ellipse(g, mx, my, 3, 2, tone(ASPHALT, -.25)); ellipse(g, mx, my, 2, 1, tone(ASPHALT, -.08)); px(g, mx - 1, my - 1, tone(ASPHALT, .12));
      const gx = isH ? p + 60 : r.x1 + r.width / 2 - 3, gy = isH ? r.y1 + r.width / 2 - 2 : p + 60;
      if (clear(isH ? gx : gy)) { rect(g, gx, gy, isH ? 5 : 2, isH ? 2 : 5, '#3e4446'); for (let q = 1; q < 5; q += 2) rect(g, isH ? gx + q : gx, isH ? gy : gy + q, 1, 1, '#7a8486'); }
    }
  }
  // Fallen leaves gather along the kerbs in autumn.
  if (season === 2) for (const r of CITY_ROADS) {
    const [x, y, w, h] = roadRect(r), isH = horizontal(r);
    for (let k = 0; k < (isH ? w : h) / 9; k++) {
      const t = Math.floor(hash(k * 7 + x + y) * (isH ? w : h)), side = k % 2;
      const lx = isH ? x + t : side ? x + w - 3 : x + 1, ly = isH ? (side ? y + h - 2 : y + 2) : y + t;
      px(g, lx, ly, ['#d8843a', '#b0602e', '#e8b040'][k % 3]); px(g, lx + 1, ly, '#c8703a');
    }
  }
  // The neighbourhood's own crossings; world.js lays the crossings over the shared sidewalks
  // and then draws drawRoadMarkings, so stop lines sit outside every zebra.
  for (const [x, y, axis, width] of CROSSINGS.slice(0, 3)) {
    if (axis === 'h') for(let yy=y-width/2+2;yy<y+width/2-1;yy+=4) rect(g,x-4,yy,9,2,'#eee9d8');
  }
  for (const [x, y, , width] of CROSSINGS.filter(c => c[2] === 'v' && (c[0] === 280 || c[0] === 976))) for(let xx=x-width/2+2;xx<x+width/2-1;xx+=4) rect(g,xx,y-4,2,9,'#eee9d8');
  // Drop kerbs and a proper central aisle connect both parking parcels to Club Row.
  for (const p of PARKING) {
    const x=p.x+p.w/2;
    rect(g,x-6,529,12,p.y-529,'#8b9290');
    rect(g,x-6,530,12,2,stone(season));
  }
}
// Junction arms that stop: every arm at a signal, otherwise the lower-ranked road (or the one
// that ends there). Each stop line spans the inbound lane (traffic keeps right) just outside any
// zebra on that arm.
function stopArms() {
  const out = [], signal = j => SIGNALS.some(([x, y]) => x === j.x && y === j.y);
  for (const j of JUNCTIONS) {
    const hr = RANK[j.h.kind], vr = RANK[j.v.kind];
    const arms = [['w', j.h, j.x > j.h.x1], ['e', j.h, j.x < j.h.x2], ['n', j.v, j.y > j.v.y1], ['s', j.v, j.y < j.v.y2]].filter(a => a[2]);
    const minor = hr < vr ? 'h' : vr < hr ? 'v' : (j.x === j.h.x1 || j.x === j.h.x2 ? 'h' : 'v');
    for (const [dir, road] of arms) {
      if (!signal(j) && ((dir === 'w' || dir === 'e') ? 'h' : 'v') !== minor) continue;
      out.push({ j, dir, road, signal: signal(j) });
    }
  }
  return out;
}
export const STOP_ARMS = stopArms();
export function drawRoadMarkings(g, season) {
  for (const { j, dir } of STOP_ARMS) {
    const hh = j.h.width / 2, vh = j.v.width / 2, near = CROSSINGS.filter(([x, y, axis]) => dir === 'w' || dir === 'e' ? axis === 'h' && y === j.y && Math.abs(x - j.x) < 26 && (dir === 'w') === (x < j.x) : axis === 'v' && x === j.x && Math.abs(y - j.y) < 26 && (dir === 'n') === (y < j.y));
    const off = near.length ? Math.abs((dir === 'w' || dir === 'e' ? near[0][0] - j.x : near[0][1] - j.y)) + 9 : (dir === 'w' || dir === 'e' ? vh : hh) + 2;
    const paint = '#ddd2b4', dashes = (x, y, w, h) => { for (let k = 0; k < Math.max(w, h); k += 3) rect(g, w > h ? x + k : x, w > h ? y : y + k, w > h ? 2 : w, w > h ? h : 2, paint); };
    if (dir === 'w') dashes(j.x - off - 1, j.y, 2, hh);
    if (dir === 'e') dashes(j.x + off, j.y - hh, 2, hh);
    if (dir === 'n') dashes(j.x - vh, j.y - off - 1, vh, 2);
    if (dir === 's') dashes(j.x, j.y + off, vh, 2);
  }
  // Tactile paving where every crossing meets the kerb.
  const tactile = season === 3 ? '#e0d4a8' : '#cdb684';
  for (const [x, y, axis, width] of CROSSINGS) {
    const pads = axis === 'h' ? [[x - 4, y - width / 2 - 4], [x - 4, y + width / 2 + 1]] : [[x - width / 2 - 4, y - 4], [x + width / 2 + 1, y - 4]];
    for (const [px0, py0] of pads) {
      const w = axis === 'h' ? 9 : 3, h = axis === 'h' ? 3 : 9;
      rect(g, px0, py0, w, h, tactile);
      for (let a = 0; a < w; a += 2) for (let b = 0; b < h; b += 2) px(g, px0 + a, py0 + b, tone(tactile, -.25));
    }
  }
}
const hydrant = (g, x, y) => { rect(g, x, y - 4, 3, 4, '#d0402e'); rect(g, x - 1, y - 3, 5, 1, '#a8302a'); rect(g, x, y - 5, 3, 1, '#e86a50'); px(g, x, y - 4, '#f08a70'); rect(g, x, y + 1, 3, 1, SHADOW); };
const bin = (g, x, y, c = '#4a6a5a') => { rect(g, x, y - 5, 4, 5, c); rect(g, x, y - 5, 4, 1, tone(c, .3)); rect(g, x + 3, y - 4, 1, 4, selOut(c, .4)); rect(g, x - 1, y - 6, 6, 1, tone(c, -.2)); rect(g, x, y + 1, 4, 1, SHADOW); };
const mailbox = (g, x, y) => { rect(g, x + 1, y - 3, 1, 3, '#4a5054'); rect(g, x, y - 8, 4, 5, '#3a5a9a'); rect(g, x, y - 8, 4, 1, '#6a8ac8'); rect(g, x + 1, y - 6, 2, 1, '#1e2e50'); rect(g, x + 3, y - 7, 1, 4, selOut('#3a5a9a', .4)); };
// A half-barrel tub spilling over with flowers.
function flowerTub(g, x, y, season) {
  rect(g, x, y - 4, 7, 4, '#8a5e3c'); rect(g, x, y - 4, 7, 1, tone('#8a5e3c', .25)); rect(g, x, y - 2, 7, 1, '#5a5450'); rect(g, x + 6, y - 3, 1, 3, selOut('#8a5e3c', .4)); rect(g, x, y + 1, 7, 1, SHADOW);
  if (season === 3) { rect(g, x, y - 5, 7, 1, '#f4f6f8'); return; }
  const leaf = ['#5e9a4a', '#4e8a44', '#8a8a40'][Math.min(season, 2)];
  rect(g, x - 1, y - 7, 9, 3, leaf); rect(g, x, y - 8, 7, 1, tone(leaf, .2));
  for (let k = 0; k < 9; k += 2) px(g, x - 1 + k, y - 7 - (k % 4 ? 1 : 0), ['#e86a6a', '#f6d04c', '#f4f0e6', '#e88aa0', '#c890e0'][(k + x) % 5]);
  px(g, x - 1, y - 4, leaf); px(g, x + 7, y - 5, leaf);
}
// Street furniture where each piece belongs: flower tubs between the lanterns on Club Row,
// hydrants by the kerb along the main roads, bins by the benches, mailboxes on the residential
// lane and Club Row.
export const FURNITURE = [
  ...[90, 186, 404, 600, 698, 794, 890].map(x => ['planter', x, 506]),
  ['hydrant', 92, 506], ['hydrant', 402, 506], ['hydrant', 700, 506], ['hydrant', 880, 541], ['hydrant', 520, 665], ['hydrant', 800, 665], ['hydrant', 700, 135],
  ['bin', 360, 399], ['bin', 640, 399], ['bin', 940, 399], ['bin', 130, 665],
  ['mailbox', 676, 135], ['mailbox', 470, 506],
];
// Cars parked along the residential lane's north kerb, clear of driveways and crossings, all
// facing the way traffic runs on that side.
export const KERB_CARS = [[646, 'sedan'], [734, 'suv'], [842, 'hatch'], [902, 'van']].map(([x, kind], k) => ({ x, y: 145, kind, dir: -1, color: CAR_COLOURS[(k * 3 + 1) % CAR_COLOURS.length] }));
// A delivery van in a marked loading bay on the boulevard, by the kit works.
const LOADING = { x: 392, y: BOULEVARD + 15, w: 36 };
export function drawLoadingBay(g) {
  const { x, y, w } = LOADING;
  for (let k = 0; k < w; k += 4) rect(g, x + k, y - 7, 2, 1, '#e8c04a');
  rect(g, x, y - 7, 1, 8, '#e8c04a'); rect(g, x + w - 1, y - 7, 1, 8, '#e8c04a');
  for (let k = 3; k < w - 3; k += 6) { rect(g, x + k, y - 4, 3, 1, '#e8c04a'); }
}
function fence(g, x, y, w, color) {
  rect(g,x,y-3,w,1,shade(color,-0.1));
  rect(g,x,y-1,w,1,color);
  for(let xx=x;xx<=x+w;xx+=5) rect(g,xx,y-5,1,6,shade(color,0.18));
}
// Climbing roses scrambling along a stretch of fence, in clusters with gaps between.
function roses(g, x, y, w, season, seed) {
  if (season === 3) return;
  const leaf = ['#5a8a46', '#4a7e40', '#8a7a3a'][season], bloom = season === 2 ? ['#c86a3a', '#a8502e'] : seed % 2 ? ['#e86a8a', '#f4a8b8'] : ['#d84a4a', '#f08a7a'];
  for (let k = 0; k < w - 6; k += 9) {
    if (hash(seed * 7 + k) < .35) continue;
    const cx = x + k + Math.round(hash(seed + k) * 4);
    rect(g, cx, y - 6, 6, 3, leaf); rect(g, cx + 1, y - 7, 4, 1, leaf); px(g, cx + 1, y - 7, tone(leaf, .25)); px(g, cx + 5, y - 4, tone(leaf, -.3));
    if (season < 2 || hash(k + seed) > .5) { px(g, cx + 1, y - 6, bloom[0]); px(g, cx + 4, y - 5, bloom[0]); px(g, cx + 2, y - 7, bloom[1]); }
  }
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
    // No two neighbours share a design: each lot has its own form, materials, roof and the
    // things its household leaves outside.
    const form=HOUSE_FORMS[seed%HOUSE_FORMS.length], bakery=lot.kind==='bakery';
    const lx=x+(large?12:4),buildingW=large?44:form.w||34,buildingH=bakery?25:form.h;
    // The front door sits on the facade's centre line (the bakery's beside its shop window), and
    // the windows pair up either side of it.
    const doorX=bakery?lx+buildingW-10:lx+Math.round(buildingW/2)-3, driveX=large?x+62:x+w-14;
    const home={x:lx,y:base,w:buildingW,h:buildingH,d:18,wall:colors[seed],roof:form.roof,material:bakery?'plaster':form.material,roofKind:form.roofKind,gable:form.gable,roofMat:form.roofMat,seed:seed*13+5};
    const garage={x:lx+48,y:base+3,w:20,h:13,d:17,wall:'#c0b9a3',roof:'#6b7879',material:'stone',gable:4};
    withinGround(g,lot,()=>{
      surface(g,x,y,w,h,green(season),'lawn',seed);
      rect(g,x,y,w,1,'#b2b99a');rect(g,x,y,1,h,'#bdbea4');rect(g,x+w-1,y,1,h,'#93a17f');
      rect(g,x+1,y+4,1,h-7,'#b2a68e');rect(g,x+w-2,y+4,1,h-7,'#b2a68e');
      if(large) surface(g,x+7,y+12,25,20,stone(season),'paving',seed);
      for(const block of large?[home,garage]:[home]) {
        const f=projectedFootprint(block);
        surface(g,f.x-2,f.y-2,f.w+4,f.h+5,stone(season),'paving',seed);
        poly(g,[[f.x,base],[f.x+f.w+9,base+4],[f.x+f.w+13,f.y+3],[f.x+7,f.y]],CAST);
      }
      walk(g,doorX,base,5,front-base,season);
      if(lot.kind!=='bakery') {
        // Stop at the property edge; the old length painted over the road.
        rect(g,driveX,base-10,large?14:10,front-(base-10),'#b8b7a7');
        rect(g,driveX+2,base-10,1,front-(base-10),'#aaa999');
      }
    });
    // Gate aprons end at the sidewalk, before the kerb and carriageway.
    walk(g,doorX,front,5,(large?BOULEVARD:130)-front,season);
    if(lot.kind!=='bakery') walk(g,driveX,front,large?14:10,(large?BOULEVARD:130)-front,season);
    items.push({y:y+4,draw:g=>fence(g,x+1,y+4,w-3,'#b8aa8c')});
    if(lot.kind!=='bakery' && seed%2===0) items.push({y:front-5,draw:g=>uprightCar(g,driveX+1,front-23,['#a56650','#718ba1','#c2ad69'][seed%3])});
    const fenceColor=seed%2?'#c4bda6':'#e1dac3';
    // Gate and driveway openings are real gaps, not paint over the footpath.
    const gate=doorX-x-1;
    const edges=lot.kind==='bakery'?[[0,gate],[gate+8,w]]:[[0,gate],[gate+8,driveX-x],[driveX-x+(large?14:10),w]];
    items.push({y:front,draw:g=>{
      for(const [left,right] of edges) if(right>left) {fence(g,x+left,front,right-left,fenceColor);roses(g,x+left,front,right-left,season,seed+left);}
      rect(g,doorX-3,front-6,2,7,shade(fenceColor,-0.12));rect(g,doorX+7,front-6,2,7,fenceColor);
      rect(g,x+7,front-8,1,7,'#7d725c');rect(g,x+5,front-9,6,3,'#6a8c84');
    }});
    for(const dx of large?[8,66]:[7,36]) items.push({y:front-5,draw:g=>bush(g,x+dx,front-5,season)});
    if(large) {
      items.push({y:y+20,draw:g=>tree(g,x+70,y+20,.7,season,seed)});
      items.push({y:y+25,draw:g=>bench(g,x+10,y+25)});
    }
    if(form.laundry&&!bakery) items.push({y:y+16,draw:g=>laundry(g,x+(large?40:40),y+16,large?18:14,['#f4f0e6',colors[(seed+3)%9],'#9ab4d0','#e8a0a0'],0,seed)});
    items.push({y:base,draw:(g,now=0)=>{
      if(form.woodpile) woodpile(g,lx-3,base-1,2);
      drawBuildingVolume(g,home,season);
      const rows=buildingH>=27?2:1, kind=large?'shutter':'sash', inset=large?6:4, slots=[lx+inset,lx+buildingW-inset-6];
      for(let row=0;row<rows;row++) for(const wx of row&&!bakery?[...slots,doorX]:bakery?[lx+buildingW-inset-6]:slots) {
        if(bakery&&row===0) continue;
        houseWindow(g,kind,wx,base-14-row*12,{lit:hash(wx*3+row+seed)<.3,shutter:form.shutter,box:row===0&&form.boxes?(seed%2?'#d99a8b':'#e4cb75'):null,season});
      }
      if(bakery) {
        houseWindow(g,'shop',lx+3,base-13,{lit:true,goods:['#d8a050','#f0d090','#b87a3a']});
        for(let xx=lx-1;xx<lx+buildingW+1;xx+=4) rect(g,xx,base-15,Math.min(4,lx+buildingW+1-xx),3,xx%8?'#efe5c6':'#9b6252');
        rect(g,lx,base-12,buildingW,1,SHADOW);
        rect(g,lx-2,base-buildingH+2,38,9,'#80614d');rect(g,lx-2,base-buildingH+2,38,1,tone('#80614d',.25));text(g,'BAKERY',lx,base-buildingH+3,{color:'#f4ead5',outline:null});
      }
      doorAt(g,'panel',doorX,base,{color:form.door,w:6,h:11});
      steps(g,doorX-1,base,8);
      if(form.porch) {
        // A porch roof on posts over the door.
        rect(g,doorX-6,base-15,18,2,tone(form.roof,.08));rect(g,doorX-6,base-15,18,1,tone(form.roof,.3));rect(g,doorX-5,base-13,16,1,SHADOW);
        for(const px0 of [doorX-5,doorX+10]) rect(g,px0,base-13,1,13,'#e8e0cc');
      }
      if(form.chimney) {
        const cx=lx+Math.round(buildingW*(seed%2?.25:.72)),cy=base-buildingH-6;
        chimney(g,cx,cy,form.chimney,7);
        if(form.smoke) smoke(g,cx+1,cy-8,now,seed);
      }
      if(form.vine) vine(g,lx+buildingW-3,base-buildingH+5,base-1,season,seed);
      if(large) {
        drawBuildingVolume(g,garage,season);
        doorAt(g,'roller',lx+51,base+3,{trim:tone('#c0b9a3',-.3),w:13,h:9});
      }
      // Bins, chairs, bikes and cans belong to the house, not the sidewalk.
      rect(g,lx-1,base-3,3,5,'#63816c');rect(g,lx-1,base-4,3,1,tone('#63816c',.25));rect(g,lx+1,base-3,1,5,selOut('#63816c',.4));
      if(form.chair) chair(g,doorX+(large?14:9),base+4,form.door);
      if(form.can&&season!==3) wateringCan(g,lx+buildingW-8,base+5);
      if(form.bike) bike(g,lx+buildingW-12,base+7,form.door);
      if(form.rainBarrel) barrel(g,lx+buildingW-2,base+1,'#5a7a6a');
      if(bakery) {crate(g,lx+buildingW+2,base+4,'#d8c8a0');aboard(g,doorX+10,base+8);}
    }});
  }
}
// House designs along the residential streets: cottage, two-storey, bungalow, a timber house
// with a porch, a brick semi with dormer-height eaves, and a plaster villa.
const HOUSE_FORMS = [
  {h:20,material:'brick',roof:'#9a5a42',roofKind:'gable',gable:7,roofMat:'tile',chimney:'#8a5040',smoke:true,boxes:true,can:true,door:'#4a6a8a',woodpile:true},
  {h:29,material:'clapboard',roof:'#5f6e7a',roofKind:'gable',gable:6,roofMat:'slate',laundry:true,door:'#a04a3a',shutter:'#4a6a5a'},
  {h:25,material:'plaster',roof:'#a85a3e',roofKind:'gable',gable:7,roofMat:'tile',door:'#5a7a5a'},
  {h:18,w:36,material:'stone',roof:'#6a5a48',roofKind:'hip',gable:7,roofMat:'shingle',porch:true,chair:true,laundry:true,door:'#7a5a8a'},
  {h:28,material:'brick',roof:'#4f5866',roofKind:'hip',gable:6,roofMat:'slate',chimney:'#7a4a3a',bike:true,boxes:true,door:'#2f5a4a'},
  {h:21,material:'timber',roof:'#7a5a40',roofKind:'gable',gable:8,roofMat:'shingle',porch:true,vine:true,rainBarrel:true,chimney:'#8a7a6a',smoke:true,door:'#8a4a3a'},
  {h:22,material:'plaster',roof:'#8b6350',roofKind:'gable',gable:7,roofMat:'tile',vine:true,chair:true,door:'#3a5a7a'},
  {h:28,material:'brick',roof:'#617784',roofKind:'gable',gable:7,roofMat:'slate',chimney:'#8a5040',laundry:true,bike:true,door:'#6a3a3a',shutter:'#3f5a4a'},
  {h:20,material:'clapboard',roof:'#8a7456',roofKind:'hip',gable:8,roofMat:'shingle',porch:true,chair:true,can:true,woodpile:true,door:'#4a7a6a',shutter:'#7a5a3a'},
];
const HEDGE = ['#5f8f4a', '#4d8445', '#8a7a40', '#9aa898'];
export function drawClubParcel(g,x,top,w,front,open,season,index) {
  const color=open?green(season):shade(green(season),-.08),y=top+8,h=front-y;
  withinGround(g,{x:x+1,y,w:w-2,h},()=>surface(g,x+1,y,w-2,h,color,'lawn',index));
  // A clipped hedge closes the back of each plot: sunlit along its top, a cool shadow on the
  // lawn below, and leaf clusters rather than a hard line.
  const hc=open?HEDGE[season]:tone(HEDGE[season],-.12);
  rect(g,x+1,y,w-2,4,hc);rect(g,x+1,y,w-2,1,tone(hc,.24));rect(g,x+1,y+4,w-2,1,CAST);
  for(let xx=x+3;xx<x+w-3;xx+=6) {rect(g,xx,y+1,2,1,tone(hc,.12));px(g,xx+3,y+3,tone(hc,-.24));}
  // Plot edges: lit on the left, shaded on the right.
  rect(g,x+1,y+4,1,h-4,tone(color,.16));
  rect(g,x+w-2,y+4,1,h-4,tone(color,-.2));
}
export const ROSE_SEASON = { v: 1 };
export function drawClubFront(g,x,w,front,open,index) {
  const c=open?'#bfc1a7':'#a7ae95';
  for(const [a,b] of [[2,24],[39,w-2]]) {fence(g,x+a,front,b-a,c);if(open&&index%3!==1)roses(g,x+a,front,b-a,ROSE_SEASON.v,index*5+a);}
  for(const dx of [23,38]) {rect(g,x+dx,front-6,2,8,open?'#b5ad96':'#9b9e87');rect(g,x+dx-1,front-7,4,1,'#e0d8c0');}
  if(open) {
    rect(g,x+7,front-5,10,4,'#6c8178');text(g,String(index+1),x+8,front-5,{scale:.6,color:'#f3ebd6',outline:null});
  }
}
export function drawPocketPark(g,season,items) {
  const {x,y,w,h}=POCKET_PARK;
  withinGround(g,POCKET_PARK,()=>surface(g,x,y,w,h,green(season),'lawn'));
  walk(g,x+6,y+7,w-12,h-14,season);rect(g,x+13,y+14,w-26,h-28,green(season));
  walk(g,x+21,536,7,20,season);walk(g,x+112,y+h-9,7,27,season);
  for(const [a,b] of [[0,20],[31,w]])fence(g,x+a,y,b-a,'#b8ba9c');
  for(const [tx,ty] of [[x+10,y+23],[x+131,y+32],[x+19,y+h-15]])items.push({y:ty,draw:g=>tree(g,tx,ty,.75,season,tx)});
  for(const [bx,by] of [[x+22,y+21],[x+103,y+h-16]])items.push({y:by,draw:g=>bench(g,bx,by)});
  // The entrance: brick piers either side of the gate, a name board and flowers to greet you.
  items.push({y:y+3,draw:g=>{
    for(const px0 of [x+17,x+29]) {rect(g,px0,y-6,4,8,'#a8604a');rect(g,px0,y-6,4,1,tone('#a8604a',.3));rect(g,px0+3,y-5,1,7,selOut('#a8604a',.4));rect(g,px0-1,y-7,6,1,'#d8cdb2');}
    rect(g,x+36,y-2,1,9,'#6a5a44');rect(g,x+43,y-2,1,9,'#6a5a44');rect(g,x+34,y-8,12,7,'#3f655e');rect(g,x+34,y-8,12,1,tone('#3f655e',.3));
    rect(g,x+36,y-6,8,1,'#f2ecd7');rect(g,x+36,y-4,6,1,'#c8d8c8');
  }});
  items.push({y:y+12,draw:g=>{
    // Flowers flank the gate path; a drinking fountain and a bin stand by the loop.
    for(const fx of [x+9,x+31]) {rect(g,fx,y+9,8,3,'#7a5a3e');if(season!==3)for(let k=0;k<8;k+=2)px(g,fx+k,y+8,['#e86a6a','#f6d04c','#f4f0e6','#c890e0'][(k+fx)%4]);}
  }});
  items.push({y:y+h-10,draw:g=>{rect(g,x+64,y+h-17,3,7,'#8a948e');rect(g,x+63,y+h-18,5,2,'#b4bcb6');px(g,x+65,y+h-19,'#8ac8e0');rect(g,x+88,y+h-15,4,5,'#4a6a5a');rect(g,x+88,y+h-15,4,1,'#6a8a7a');}});
  // A little community play corner leaves the pond and walking loop clear.
  items.push({y:y+43,draw:g=>{
    for(const dx of [10,30])line(g,x+dx,y+42,x+dx+3,y+19,'#9d7b51',2);
    line(g,x+13,y+19,x+33,y+19,'#bc9465',2);
    for(const dx of [17,25])line(g,x+dx,y+21,x+dx,y+35,'#7e8680');
    rect(g,x+16,y+35,11,2,'#ac6e51');
  }});
}
export function drawStreetFurniture(g,items,colors={primary:'#2f6b52',secondary:'#f2c94c'},season=1) {
  for(const [x,y] of STREET_LAMPS)items.push({y,draw:g=>lamp(g,x,y)});
  for(const [kind,x,y] of FURNITURE) items.push({y,draw:g=>kind==='planter'?flowerTub(g,x,y,season):kind==='hydrant'?hydrant(g,x,y):kind==='bin'?bin(g,x,y):mailbox(g,x,y)});
  for(const c of KERB_CARS) items.push({y:c.y,draw:g=>vehicle(g,c.kind,c.x,c.y,c.color,c.dir)});
  items.push({y:LOADING.y,draw:g=>{vehicle(g,'delivery',LOADING.x+3,LOADING.y,colors.primary,-1);}});
}
