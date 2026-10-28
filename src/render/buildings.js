import { rect, poly, ellipse, line, shade, hash, px } from "./pixel.js";
import { text } from "./font.js";
import { figure } from "./sprites.js";

// 2.5D oblique projection: depth runs up and to the right.
export const DX = 0.4,
  DY = 0.5;
let SNOW = false,
  GROUND = -999;
const WALL = "#efe2c0",
  GLASS = "#8fc4d0",
  FRAME = "#5a5a48",
  DOORC = "#6a5040";

export function box(g, x, y, w, h, d, front, opts = {}) {
  const dx = Math.round(d * DX),
    dy = Math.round(d * DY);
  // Boxes standing on the ground cast a soft shadow away from the light (upper left).
  if (Math.abs(y - GROUND) <= 2 && opts.shadow !== false) {
    const len = Math.round(h * 0.6) + 4;
    poly(g, [[x + 2, y + 1], [x + w + len, y + 1], [x + w + dx + len, y - dy], [x + w + dx, y - dy]], "rgba(24,40,24,0.22)");
  }
  poly(g, [[x + w, y], [x + w, y - h], [x + w + dx, y - h - dy], [x + w + dx, y - dy]], opts.side || shade(front, -0.22));
  rect(g, x, y - h, w, h, front);
  poly(g, [[x, y - h], [x + w, y - h], [x + w + dx, y - h - dy], [x + dx, y - h - dy]], SNOW && !opts.noSnow ? "#f6f8fa" : opts.top || shade(front, 0.14));
  if (opts.edge !== false) rect(g, x, y - h, w, 1, shade(front, 0.28));
  // A recessed plinth, corner masonry and sunlit sill give every facade depth.
  rect(g, x, y - 3, w, 2, shade(front, -0.14));
  rect(g, x, y - 1, w, 1, shade(front, -0.38));
  if (w > 28 && h > 12) {
    rect(g,x+1,y-h+2,2,h-5,shade(front,0.12));
    rect(g,x+w-3,y-h+2,2,h-5,shade(front,-0.09));
    rect(g,x+3,y-h+2,w-6,1,shade(front,-0.08));
    for(let yy=y-h+5;yy<y-4;yy+=5) {
      rect(g,x+1,yy,3,1,shade(front,0.23));
      rect(g,x+w-4,yy,3,1,shade(front,-0.18));
    }
  }
}
export function gable(g, x, y, w, d, rise, color, overhang = 2) {
  const dx = Math.round(d * DX),
    dy = Math.round(d * DY),
    rx = x - overhang,
    rw = w + overhang * 2;
  const ry = y - Math.round(dy / 2) - rise,
    rdx = Math.round(dx / 2);
  poly(g, [[x + w, y], [x + w + rdx, ry], [x + w + dx, y - dy]], shade(WALL, -0.25));
  poly(g, [[rx, y + 1], [rx + rw, y + 1], [rx + rw + rdx, ry], [rx + rdx, ry]], SNOW ? "#f2f5f8" : color);
  if (!SNOW) for (let yy = ry + 3; yy < y; yy += 3) rect(g, rx + Math.round(((y - yy) / (y - ry)) * rdx), yy, rw, 1, shade(color, -0.14));
  rect(g, rx + rdx, ry, rw, 1, shade(SNOW ? "#f2f5f8" : color, 0.3));
  // Fascia, gutter and roof seams stay crisp at the smallest map zoom.
  rect(g, rx, y + 1, rw, 2, shade(color, -0.4));
  rect(g, rx, y + 3, rw, 1, "rgba(35,35,28,0.18)");
  if(!SNOW) for(let xx=rx+6;xx<rx+rw;xx+=10) line(g,xx,y,xx+rdx,ry+1,shade(color,0.08));
  rect(g,rx+rdx,ry-1,rw,1,shade(SNOW?"#e8eef2":color,0.18));
  return ry;
}
export function windowAt(g, x, y, w = 6, h = 5, lit = false) {
  rect(g, x - 1, y - 1, w + 2, h + 2, FRAME);
  rect(g, x, y, w, h, lit ? "#f6d878" : GLASS);
  rect(g, x, y, w, 1, lit ? "#fff0b0" : "#cfe6e8");
  if(w>7) line(g,x+1,y+h-2,x+Math.min(w-2,5),y+1,lit?"#ffedb0":"#b9dae1");
  rect(g, x + Math.floor(w / 2), y, 1, h, lit ? "#d4ac57" : "#6f9da9");
  if(h>6) rect(g,x,y+Math.floor(h/2),w,1,lit?"#d4ac57":"#6f9da9");
  rect(g,x-2,y+h+1,w+4,1,"#e7dec8");
  rect(g,x-1,y+h+2,w+3,1,"rgba(30,36,30,0.2)");
}
function door(g, x, y, w = 6, h = 9, c = DOORC) {
  rect(g, x - 1, y - h - 1, w + 2, h + 1, FRAME);
  rect(g, x, y - h, w, h, c);
  if(h>8) {
    rect(g,x+1,y-h+1,w-2,3,"#a0c7cd");
    rect(g,x+1,y-4,w-2,2,shade(c,-0.18));
  }
  rect(g, x + w - 2, y - Math.round(h / 2), 1, 1, "#f2c94c");
  rect(g,x-2,y,w+4,2,"#c0b6a0");
  rect(g,x-3,y+2,w+6,1,"#9c9585");
}
function awning(g, x, y, w, a, b) {
  for (let i = 0; i < w; i += 3) rect(g, x + i, y, Math.min(3, w - i), 4, (i / 3) % 2 ? b : a);
  for (let i = 0; i < w; i += 3) rect(g, x + i + 1, y + 4, 1, 1, (i / 3) % 2 ? b : a);
}
export function tree(g, x, y, s = 1, season = 1, seed = 0) {
  const leaf = [
    ["#5e8a4a", "#78a85a", "#a0c878", "#f2b8c8"],
    ["#3e7a44", "#5a9a50", "#86bc68", null],
    ["#b0602e", "#d8843a", "#f0b050", null],
    ["#6a7a6a", "#8a9a8a", "#f4f6f8", null],
  ][season];
  ellipse(g, x + 2, y, Math.round(8 * s), Math.round(2 * s), "rgba(30,50,30,0.25)");
  rect(g, x - 1, y - Math.round(9 * s), 3, Math.round(9 * s), "#7a5a3a");
  ellipse(g, x, y - Math.round(14 * s), Math.round(8 * s), Math.round(8 * s), leaf[0]);
  ellipse(g, x - 2, y - Math.round(16 * s), Math.round(6 * s), Math.round(6 * s), leaf[1]);
  ellipse(g, x - 3, y - Math.round(19 * s), Math.round(3 * s), Math.round(2 * s), leaf[2]);
  if (leaf[3]) for (let i = 0; i < 5; i++) px(g, x - 6 + Math.round(hash(seed + i) * 12), y - 20 + Math.round(hash(seed + i + 9) * 10), leaf[3]);
}
export function pine(g, x, y, s = 1, season = 1) {
  const c = ["#3e6e48", "#2e6a40", "#4a6e40", "#5a7a66"][season],
    hi = shade(c, 0.22);
  ellipse(g, x + 3, y, Math.round(7 * s), Math.round(2 * s), "rgba(30,50,30,0.25)");
  rect(g, x - 1, y - Math.round(5 * s), 2, Math.round(5 * s), "#6a4a30");
  for (let k = 0; k < 3; k++) {
    const w = Math.round((9 - k * 2.5) * s),
      top = y - Math.round((8 + k * 7) * s),
      h = Math.round(10 * s);
    for (let r = 0; r < h; r++) {
      const half = Math.max(1, Math.round((w * r) / h));
      rect(g, x - half, top + r, half * 2, 1, r === h - 1 ? shade(c, -0.25) : c);
      px(g, x - half, top + r, hi);
    }
    if (season === 3) rect(g, x - Math.round(w * 0.4), top + 1, Math.round(w * 0.8), 2, "#f4f6f8");
  }
}
export function lamp(g, x, y) {
  rect(g, x, y - 16, 1, 16, "#4a4e52");
  rect(g, x - 1, y - 1, 3, 1, "#4a4e52");
  rect(g, x - 1, y - 18, 3, 3, "#4a4e52");
  rect(g, x, y - 17, 1, 1, "#fff0b0");
}
export function bush(g, x, y, season = 1) {
  const c = ["#6a9a50", "#4e8a48", "#c07a3a", "#8a9a8a"][season];
  ellipse(g, x, y - 2, 5, 3, c);
  ellipse(g, x - 1, y - 3, 3, 2, shade(c, 0.25));
}
function flowers(g, x, y, w, rows = 2, seed = 0) {
  const cols = ["#f06a6a", "#f6d04c", "#f2f2f2", "#c890e0", "#f0a050"];
  for (let r = 0; r < rows; r++)
    for (let i = 0; i < w; i += 2) {
      rect(g, x + i, y + r * 3 + 1, 1, 2, "#4e8a48");
      px(g, x + i, y + r * 3, cols[Math.floor(hash(seed + i * 7 + r) * cols.length)]);
    }
}
export function bench(g, x, y) {
  rect(g, x, y - 3, 10, 2, "#b08050");
  rect(g, x, y - 5, 10, 1, "#c89a60");
  rect(g, x + 1, y - 1, 1, 2, "#5a4a3a");
  rect(g, x + 8, y - 1, 1, 2, "#5a4a3a");
}
function table(g, x, y, c) {
  rect(g, x - 3, y - 4, 7, 1, "#f4efe2");
  rect(g, x, y - 3, 1, 3, "#7a6a5a");
  rect(g, x, y - 12, 1, 8, "#7a6a5a");
  poly(g, [[x - 6, y - 10], [x + 7, y - 10], [x + 3, y - 14], [x - 2, y - 14]], c);
  rect(g, x - 6, y - 10, 13, 1, shade(c, -0.25));
}
function flagpole(g, x, y, h = 20) {
  rect(g, x, y - h, 1, h, "#8a8e90");
  px(g, x, y - h - 1, "#f2c94c");
}
function sign(g, x, y, label, bg, fg = "#fff6dc") {
  const w = label.length * 6 + 3;
  rect(g, x - Math.floor(w / 2) - 1, y - 1, w + 2, 11, shade(bg, -0.4));
  rect(g, x - Math.floor(w / 2), y, w, 9, bg);
  text(g, label, x, y + 1, { color: fg, outline: null, align: "center" });
}
function pad(g, x, y, w, h, c) {
  rect(g, x, y, w, h, c);
  rect(g, x, y, w, 1, shade(c, 0.2));
  rect(g, x, y + h - 1, w, 1, shade(c, -0.2));
}

// Cell top-left is (x, y); cells are 104×64. Buildings stand on the line y + 52.
export function drawFacility(g, type, level, x, y, o = {}) {
  SNOW = o.season === 3;
  GROUND = y + 52;
  const b = y + 52,
    season = o.season ?? 1,
    colors = o.colors || { primary: "#2f6b52", secondary: "#e2b04a" },
    L = level;
  // Small serviced courtyards visually connect buildings to the street.
  if(!["garden","fountain","statue"].includes(type)) {
    pad(g,x+7,b-8,88,17,season===3?"#e2e3df":"#c5baa2");
    for(let xx=x+9;xx<x+94;xx+=9) rect(g,xx,b-7,1,14,"rgba(70,65,52,0.12)");
    rect(g,x+8,b+7,86,1,"#e6ddc7");
    if(L>1) {
      box(g,x+82,b+5,8,4,6,"#b4946b",{shadow:false});
      bush(g,x+86,b+1,season);
    }
  }
  const drawers = {
    club() {
      const w = 52 + (L > 1 ? 10 : 0),
        h = 19 + (L > 2 ? 10 : 0),
        lx = x + 18;
      box(g, lx, b, w, h, 22, WALL);
      const ry = gable(g, lx, b - h, w, 22, 8, "#b85a3a");
      rect(g, lx + w - 8, ry - 4, 4, 8, "#9a5a3a");
      for (let i = 0; i < (L > 1 ? 4 : 3); i++) windowAt(g, lx + 4 + i * 12, b - 12);
      if (L > 2) for (let i = 0; i < 4; i++) windowAt(g, lx + 4 + i * 12, b - 23, 6, 5, true);
      door(g, lx + Math.floor(w / 2) - 3, b, 7, 10, colors.primary);
      if (L > 1) {
        awning(g, lx + Math.floor(w / 2) - 9, b - 14, 19, colors.primary, colors.secondary);
        bench(g, lx - 12, b + 2);
      }
      sign(g, lx + Math.floor(w / 2), b - h - 12, "CLUB", colors.primary, colors.secondary);
      flagpole(g, lx - 6, b, L > 2 ? 34 : 24);
      bush(g, lx + w + 6, b + 2, season);
    },
    gym() {
      const w = 54 + (L > 1 ? 10 : 0),
        lx = x + 14;
      box(g, lx, b, w, 21, 22, "#c27a52");
      for (let yy = b - 16; yy < b; yy += 3) for (let xx = lx + (yy % 2 ? 0 : 3); xx < lx + w; xx += 6) rect(g, xx, yy, 5, 1, "#b06a44");
      rect(g, lx + 6, b - 13, 20, 13, "#3a3530");
      rect(g, lx + 7, b - 12, 18, 12, "#5a504a");
      for (let i = 0; i < 3; i++) rect(g, lx + 9 + i * 5, b - 6, 3, 5, "#8a8e96");
      rect(g, lx + 8, b - 9, 16, 1, "#9a9ea6");
      windowAt(g, lx + w - 14, b - 13, 8, 6, L > 2);
      sign(g, lx + 16, b - 28, "GYM", "#3a3e46", "#f2c94c");
      if (L > 1) { box(g, lx + w - 12, b - 18, 8, 5, 6, "#9aa0a8", { noSnow: true });
        for(let n=0;n<4;n++) rect(g,lx+w-11+n*2,b-21,1,3,"#56616a"); }

      if (L > 2) { rect(g, lx + 2, b - 17, w - 4, 2, colors.secondary); sign(g,lx+w-15,b-31,"FIT","#493f34"); }
      // An outdoor rack makes the strength room recognisable without its sign.
      line(g,lx+35,b-9,lx+49,b-9,"#b4b9bb",2);
      for(const xx of [lx+36,lx+46]) rect(g,xx,b-12,3,7,"#424952");
    },
    spa() {
      const lx = x + 10;
      box(g, lx, b, 34, 17, 20, "#e8eef0");
      gable(g, lx, b - 17, 34, 20, 6, "#4a9a9a");
      windowAt(g, lx + 4, b - 10, 6, 5);
      door(g, lx + 18, b, 6, 8, "#5a8a8a");
      ellipse(g, lx + 54, b - 7, 14, 6, "#d8d8cc");
      ellipse(g, lx + 54, b - 7, 12, 5, "#5ab8d8");
      ellipse(g, lx + 52, b - 8, 6, 2, "#8ad8f0");
      if (L > 1) {
        box(g, lx + 66, b + 2, 12, 12, 10, "#a07850");
        rect(g, lx + 69, b - 6, 4, 6, "#6a4a30");
      }
      if (L > 2) {
        tree(g, lx + 40, b - 12, 0.6, 1, 5);
        flowers(g, lx + 2, b + 3, 26, 1, 3);
      }
    },
    garden() {
      const lx = x + 8;
      pad(g, lx, b - 26, 84, 28, "#78a858");
      rect(g,lx,b-27,84,2,"#d1c5aa");rect(g,lx,b+2,84,2,"#9b937e");
      for(let xx=lx;xx<lx+84;xx+=7) rect(g,xx,b-28,1,3,"#e4d8bd");
      line(g, lx + 4, b, lx + 40, b - 14, "#d8c8a0", 3);
      line(g, lx + 40, b - 14, lx + 80, b - 20, "#d8c8a0", 3);
      flowers(g, lx + 4, b - 24, 30, 2, x);
      flowers(g, lx + 50, b - 8, 26, 2, x + 9);
      tree(g, lx + 12, b - 4, 0.7, season, x);
      tree(g, lx + 70, b - 14, 0.6, season, x + 3);
      bench(g, lx + 44, b - 2);
      if (L > 1) {
        ellipse(g, lx + 30, b - 4, 8, 3, "#5aa0c0");
        ellipse(g, lx + 29, b - 5, 4, 1, "#8ad0e8");
      }
      if (L > 2) {
        box(g, lx + 56, b - 12, 14, 10, 10, "#f4efe2", { top: "#c85a4a" });
        rect(g, lx + 57, b - 21, 1, 9, "#d8d0c0");
        rect(g, lx + 68, b - 21, 1, 9, "#d8d0c0");
      }
    },
    cafe() {
      const lx = x + 12,
        w = 40;
      box(g, lx, b, w, 19, 20, "#f2dcc0");
      gable(g, lx, b - 19, w, 20, 6, "#8a5a3a");
      awning(g, lx - 1, b - 17, w + 2, "#e07a3a", "#f8efe0");
      windowAt(g, lx + 3, b - 9, 8, 6, true);
      door(g, lx + 22, b, 7, 9);
      rect(g, lx + 26, b - 30, 3, 6, "#8a5a3a");
      table(g, lx + 46, b + 1, "#e07a3a");
      if (L > 1) table(g, lx + 60, b - 6, colors.secondary);
      if (L > 2) {
        table(g, lx + 70, b + 2, colors.primary);
        sign(g, lx + 16, b - 34, "CAFE", "#8a5a3a");
      }
    },
    shop() {
      const lx = x + 16,
        w = 36 + (L > 1 ? 12 : 0);
      box(g, lx, b, w, 17 + (L > 2 ? 6 : 0), 18, "#f4efe2");
      awning(g, lx - 2, b - 15 - (L > 2 ? 6 : 0), w + 4, colors.primary, colors.secondary);
      rect(g, lx + 2, b - 10, w - 4, 7, "#5a4a3a");
      for (let i = 0; i < Math.floor((w - 4) / 6); i++) {
        rect(g, lx + 3 + i * 6, b - 9, 4, 5, i % 2 ? colors.primary : colors.secondary);
        rect(g, lx + 3 + i * 6, b - 9, 4, 1, shade(i % 2 ? colors.primary : colors.secondary, 0.3));
      }
      flagpole(g, lx + w + 8, b, 18);
      if (L > 2) sign(g, lx + Math.floor(w / 2), b - 34, "SHOP", colors.primary, colors.secondary);
    },
    dorm() {
      const w = 48,
        h = 20 + (L - 1) * 8,
        lx = x + 18;
      box(g, lx, b, w, h, 20, "#e8d8b8");
      gable(g, lx, b - h, w, 20, 7, "#a0503a");
      for (let f = 0; f < 1 + L; f++) for (let i = 0; i < 4; i++) windowAt(g, lx + 3 + i * 10, b - 10 - f * 8, 5, 4, (i + f) % 3 === 0);
      door(g, lx + 17, b, 6, 6);
      if (L > 2) for (let i = 0; i < 3; i++) rect(g, lx + 6 + i * 10, b - h - 6, 8, 3, "#3a4a6a");
    },
    scout() {
      const lx = x + 22,
        w = 40;
      box(g, lx, b, w, 19, 18, "#d8c8a0");
      gable(g, lx, b - 19, w, 18, 6, "#5a6a3a");
      windowAt(g, lx + 4, b - 11, 7, 5);
      door(g, lx + 20, b, 6, 9);
      line(g, lx + 26, b - 30, lx + 34, b - 34, "#3a3e46", 2);
      rect(g, lx + 28, b - 30, 1, 6, "#3a3e46");
      if (L > 1) {
        rect(g, lx - 14, b - 14, 12, 10, "#c8a870");
        rect(g, lx - 13, b - 13, 10, 8, "#e8dcc0");
        line(g, lx - 12, b - 7, lx - 5, b - 11, "#c84a40");
      }
      if (L > 2) ellipse(g, lx + 8, b - 34, 5, 3, "#c8d0d8");
    },
    workshop() {
      const lx = x + 14,
        w = 48 + (L > 2 ? 10 : 0);
      box(g, lx, b, w, 21, 22, "#9a7050");
      for (let i = 0; i < w; i += 4) rect(g, lx + i, b - 21, 1, 21, "#8a6040");
      gable(g, lx, b - 21, w, 22, 7, "#6a4a3a");
      rect(g, lx + 6, b - 13, 16, 13, "#2a2420");
      rect(g, lx + 10, b - 5, 8, 3, "#5a5a62");
      rect(g, lx + 12, b - 7, 4, 2, "#7a7a82");
      if (L > 1) rect(g, lx + w - 8, b - 36, 4, 10, "#5a4a3a");
      windowAt(g, lx + w - 12, b - 12, 7, 5, true);
    },
    lab() {
      const lx = x + 18,
        w = 48;
      box(g, lx, b, w, 20, 20, "#f4f6f8");
      ellipse(g, lx + 20, b - 22, 11 + L, 8 + L, "#d0dce4");
      ellipse(g, lx + 17, b - 25, 5, 3, "#eef4f8");
      rect(g, lx + 18, b - 31 - L, 4, 6, "#3a4a5a");
      for (let i = 0; i < 3; i++) windowAt(g, lx + 4 + i * 12, b - 12, 7, 5, i === 1);
      if (L > 1) for (let i = 0; i < 3; i++) rect(g, lx + w + 4 + i * 3, b - 10, 2, 8, ["#6ad0e0", "#a0e070", "#e070c0"][i]);
    },
    library() {
      // Brick reading room with tall windows and a portico; more shelves and a wing with each level.
      const lx = x + 16, w = 50 + (L > 2 ? 10 : 0), h = 20 + (L > 1 ? 4 : 0);
      box(g, lx, b, w, h, 20, "#b8664c");
      for (let n = 3; n < h; n += 4) rect(g, lx, b - n, w, 1, "#a2553e");
      gable(g, lx, b - h, w, 20, 7, "#4f3d36");
      for (let i = 0; i < (L > 2 ? 4 : 3); i++) windowAt(g, lx + 5 + i * 12, b - h + 5, 6, 10, L > 1);
      rect(g, lx + Math.floor(w / 2) - 8, b - 12, 16, 2, "#efe2c0");
      for (const dx of [-7, 5]) rect(g, lx + Math.floor(w / 2) + dx, b - 10, 2, 10, "#efe2c0");
      door(g, lx + Math.floor(w / 2) - 3, b, 6, 9, colors.primary);
      sign(g, lx + Math.floor(w / 2), b - h - 13, "BOOKS", "#5a3a2e");
      if (L > 1) bench(g, lx - 12, b + 2);
      if (L > 2) for (let i = 0; i < 4; i++) rect(g, lx + w + 3, b - 14 + i * 3, 6, 2, ["#c84a40", "#4a7ac8", "#e2b04a", "#5a9a5a"][i]);
    },
    institute() {
      // Glass-fronted research block with a rooftop dish; extra floors and a data wing as it grows.
      const lx = x + 12, w = 62, h = 22 + L * 5;
      box(g, lx, b, w, h, 22, "#e4eaf2");
      rect(g, lx + 2, b - h + 2, w - 4, 3, "#5a7ab0");
      for (let f = 0; f < 2 + L; f++) for (let i = 0; i < 5; i++) windowAt(g, lx + 4 + i * 11, b - h + 8 + f * 7, 7, 4, f === 0 && i % 2 === 0);
      door(g, lx + 27, b, 9, 11, "#3c5a8a");
      ellipse(g, lx + w - 12, b - h - 6, 6, 3, "#c8d0d8");
      rect(g, lx + w - 13, b - h - 5, 2, 5, "#7a8a9a");
      sign(g, lx + 24, b - h - 12, "SCIENCE", "#3c5a8a");
      if (L > 1) box(g, lx + w + 3, b, 10, 14, 10, "#c8d4e2");
      if (L > 2) flagpole(g, lx - 6, b, 34);
    },
    indoor() {
      const lx=x+8, w=72, h=23+L*2;
      box(g,lx,b,w,h,24,"#c4d4dc");
      gable(g,lx,b-h,w,24,9,"#5f8291");
      for(let n=0;n<6;n++) rect(g,lx+3+n*11,b-h+2,1,h-2,"#92aab8");
      rect(g,lx+10,b-17,24,17,"#354b54");
      for(let n=0;n<5;n++) line(g,lx+12+n*5,b-16,lx+12+n*5,b-1,"#77918d");
      for(let n=0;n<4;n++) line(g,lx+11,b-15+n*4,lx+33,b-15+n*4,"#77918d");
      door(g,lx+51,b,9,14,colors.primary);
      sign(g,lx+42,b-h-12,"HALL","#426574");
      if(L>1) windowAt(g,lx+38,b-17,9,6,true);
      if(L>2) flagpole(g,lx+w+4,b,28);
    },
    lodge() {
      const lx=x+15, w=56, h=20+(L-1)*5;
      box(g,lx,b,w,h,22,"#b9946c");
      gable(g,lx,b-h,w,22,8,"#65513c");
      for(let n=0;n<h;n+=4) rect(g,lx,b-h+n,w,1,"#997752");
      windowAt(g,lx+6,b-15,14,8,true); windowAt(g,lx+35,b-15,14,8,true);
      door(g,lx+25,b,7,12,colors.primary);
      bench(g,lx-10,b+2);
      sign(g,lx+28,b-h-13,"COACH","#65513c");
      rect(g,lx+62,b-21,14,12,"#e5dfcd");
      line(g,lx+65,b-17,lx+72,b-12,"#536f52");
      if(L>1) table(g,lx+65,b+1,colors.secondary);
      if(L>2) flagpole(g,lx-6,b,32);
    },
    testing() {
      const lx=x+12, w=64, h=23+L*2;
      box(g,lx,b,w,h,22,"#dce8e5");
      rect(g,lx+2,b-h+2,w-4,4,"#508780");
      windowAt(g,lx+6,b-20,25,12,true); door(g,lx+43,b,10,17,"#508780");
      for(let n=0;n<3;n++) line(g,lx+9+n*6,b-9,lx+15+n*6,b-17,"#a57c4a",2);
      ellipse(g,lx+20,b-6,4,2,"#b6bdc5");
      sign(g,lx+32,b-h-11,"TEST","#376a65");
      if(L>1) box(g,lx+69,b,9,14,9,"#7a9d98");
      if(L>2) { rect(g,lx+8,b-h-7,35,3,"#457b81"); flagpole(g,lx-5,b,30); }
    },
    fountain() {
      const cx = x + 50,
        cy = b - 10;
      pad(g, x + 16, b - 24, 68, 26, "#d8d0bc");
      for (let i = 0; i < 68; i += 6) rect(g, x + 16 + i, b - 24, 1, 26, "#c8c0ac");
      ellipse(g,cx+2,cy+3,19+L*2,8+L,"rgba(35,45,35,0.2)");
      ellipse(g,cx,cy,18+L*2,8+L,"#d5ccb8");
      ellipse(g, cx, cy, 16 + L * 2, 7 + L, "#a8a090");
      ellipse(g, cx, cy - 1, 14 + L * 2, 6 + L, "#5ab0d8");
      ellipse(g, cx - 3, cy - 2, 6, 2, "#8ad8f0");
      rect(g, cx - 2, cy - 12, 4, 11, "#c8c0ac");
      if (L > 1) ellipse(g, cx, cy - 12, 6, 2, "#a8a090");
      if (L > 2) {
        rect(g, cx - 1, cy - 22, 3, 8, "#d8b85a");
        ellipse(g, cx, cy - 24, 2, 2, "#d8b85a");
      }
    },
    statue() {
      const cx = x + 50;
      pad(g, x + 20, b - 22, 60, 24, "#d8d0bc");
      box(g,cx-12,b,24,4,14,"#aaa594");
      box(g, cx - 8, b - 4, 16, 10, 10, "#c8c0ac");
      rect(g,cx-5,b-10,10,4,"#71634c");
      rect(g,cx-3,b-9,6,1,"#e0c37e");
      figure(g, { look: { skin: "#d8b85a", hair: "#c8a040", style: 0 }, shirt: "#d8b85a", collar: "#f2d070", pose: "cheer", frame: 0 }, cx, b - 14, 1);
      if (L > 1) for (const dx of [-26, 26]) bush(g, cx + dx, b, season);
      if (L > 2) {
        rect(g, cx - 22, b - 40, 3, 36, "#c8c0ac");
        rect(g, cx + 20, b - 40, 3, 36, "#c8c0ac");
        rect(g, cx - 24, b - 42, 48, 4, "#d8b85a");
      }
    },
  };
  (drawers[type] || drawers.club)();
  SNOW = false;
  GROUND = -999;
}

// Small animated details layered on top of the cached ground.
export function animateFacility(g, type, level, x, y, t) {
  const b = y + 52;
  if (type === "fountain") {
    const cx = x + 50,
      cy = b - 10 - (level > 1 ? 12 : 0);
    for (let i = 0; i < 8; i++) {
      const p = ((t / 700 + i / 8) % 1),
        ang = (i / 8) * Math.PI * 2;
      px(g, cx + Math.cos(ang) * p * 10, cy - 12 + p * p * 14 - Math.sin(p * Math.PI) * 6, "#c8f0ff");
    }
  }
  if (type === "spa") for (let i = 0; i < 3; i++) {
    const p = ((t / 1600 + i / 3) % 1);
    px(g, x + 60 + i * 4 + Math.sin(t / 400 + i) * 2, b - 10 - p * 14, `rgba(255,255,255,${0.7 * (1 - p)})`);
  }
  if (type === "cafe") for (let i = 0; i < 2; i++) {
    const p = ((t / 2000 + i / 2) % 1);
    rect(g, x + 41 + Math.sin(t / 500 + i) * 2, b - 34 - p * 12, 2, 2, `rgba(240,240,240,${0.6 * (1 - p)})`);
  }
  if (type === "workshop" && Math.floor(t / 180) % 5 === 0) for (let i = 0; i < 3; i++) px(g, x + 30 + hash(Math.floor(t / 180) + i) * 6, b - 8 - hash(i + t) * 6, "#f8c050");
  if (type === "lab" && Math.floor(t / 500) % 2) px(g, x + 42, b - 32 - level, "#e85a50");
  if (type === "institute" && Math.floor(t / 700) % 2) px(g, x + 62, b - 33 - level * 5, "#e85a50");
  if (type === "studio") px(g, x + 54, b - 33 - (level > 2 ? 6 : 0), Math.floor(t / 600) % 2 ? "#e85a50" : "#6a2a2a");
}
// A plot the club doesn't own yet: rough meadow, a few shrubs and a sign naming the league it opens in.
export function lockedPlot(g, x, y, label, season = 1) {
  const b = y + 52,
    rough = ["#6e9a50", "#5e8e46", "#8e9648", "#d0d8d0"][season];
  for (let i = 0; i < 46; i++) {
    const tx = x + 10 + Math.round(hash(x + i * 3) * 84),
      ty = b - 28 + Math.round(hash(y + i * 5) * 30);
    rect(g, tx, ty, 1, 2, rough);
    px(g, tx + 1, ty, shade(rough, 0.2));
  }
  bush(g, x + 20, b - 12, season);
  bush(g, x + 84, b - 4, season);
  for (const [px_, py] of [[x + 10, b - 26], [x + 94, b - 26], [x + 10, b + 2], [x + 94, b + 2]]) rect(g, px_, py - 4, 1, 5, "#a08060");
  const w = label.length * 6 + 6;
  rect(g, x + 52, b - 10, 1, 10, "#7a5a3a");
  rect(g, x + 52 - w / 2 - 1, b - 22, w + 2, 12, "#7a5a3a");
  rect(g, x + 52 - w / 2, b - 21, w, 10, "#e8d8b0");
  text(g, label, x + 52, b - 20, { color: "#7a5a3a", outline: null, align: "center" });
}
export function emptyPlot(g, x, y, highlight = false) {
  const b = y + 52;
  pad(g, x + 10, b - 26, 84, 28, highlight ? "#9cbc78" : "#86a866");
  g.fillStyle = "#b8cc98";
  for (let i = 0; i < 84; i += 4) {
    g.fillRect(x + 10 + i, b - 26, 2, 1);
    g.fillRect(x + 10 + i, b + 1, 2, 1);
  }
  for (let j = 0; j < 28; j += 4) {
    g.fillRect(x + 10, b - 26 + j, 1, 2);
    g.fillRect(x + 93, b - 26 + j, 1, 2);
  }
  rect(g, x + 50, b - 16, 5, 1, "#d8e4c0");
  rect(g, x + 52, b - 18, 1, 5, "#d8e4c0");
}
