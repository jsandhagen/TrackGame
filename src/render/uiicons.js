import { canvas, outlined, ellipse, line, shade, poly } from "./pixel.js";

// Hand-drawn 12×12 interface icons. Each is outlined, enlarged ×3 and installed as a CSS class,
// so markup can use <i class="ico ico-coin"></i> anywhere.
const R = (g, x, y, w, h, c) => {
  g.fillStyle = c;
  g.fillRect(x, y, w, h);
};
// Draw a pixel map: "#" marks ink.
function pix(g, rows, color, ox = 0, oy = 0) {
  g.fillStyle = color;
  rows.forEach((row, y) => [...row].forEach((ch, x) => ch === "#" && g.fillRect(ox + x, oy + y, 1, 1)));
}
const SKIN = "#f2c48a",
  INK = "#3a2a24";
function face(g, color, mouth, eyes = "dot") {
  ellipse(g, 6, 6, 5, 5, color);
  R(g, 3, 3, 3, 1, shade(color, 0.35));
  if (eyes === "dot") R(g, 4, 4, 1, 2, INK), R(g, 7, 4, 1, 2, INK);
  if (eyes === "x") R(g, 3, 4, 1, 1, INK), R(g, 4, 5, 1, 1, INK), R(g, 7, 5, 1, 1, INK), R(g, 8, 4, 1, 1, INK);
  if (eyes === "happy") R(g, 3, 5, 1, 1, INK), R(g, 4, 4, 1, 1, INK), R(g, 5, 5, 1, 1, INK), R(g, 7, 5, 1, 1, INK), R(g, 8, 4, 1, 1, INK), R(g, 9, 5, 1, 1, INK);
  mouth(g);
}
const ICONS = {
  home(g) {
    for (let i = 0; i < 6; i++) R(g, 5 - i, 1 + i, 2 + i * 2, 1, "#c8583a");
    R(g, 2, 7, 8, 4, "#f4e6c4");
    R(g, 5, 8, 2, 3, "#7a5034");
    R(g, 8, 2, 1, 3, "#7a5034");
  },
  squad(g) {
    ellipse(g, 8, 4, 3, 3, "#e2b08a");
    R(g, 5, 1, 6, 2, "#1e1e24");
    R(g, 8, 4, 1, 1, INK);
    R(g, 6, 8, 5, 3, "#e2b04a");
    ellipse(g, 4, 6, 3, 3, SKIN);
    R(g, 1, 3, 6, 2, "#8e4c33");
    R(g, 4, 6, 1, 1, INK);
    R(g, 1, 9, 6, 2, "#2f6b52");
  },
  build(g) {
    line(g, 3, 10, 8, 5, "#8a5a34", 2);
    R(g, 6, 1, 5, 3, "#8a8e96");
    R(g, 6, 1, 5, 1, "#c8ccd4");
    R(g, 1, 9, 3, 2, "#c8583a");
  },
  shop(g) {
    R(g, 2, 4, 8, 7, "#e07a3a");
    R(g, 2, 4, 8, 1, shade("#e07a3a", 0.3));
    R(g, 4, 1, 1, 4, "#7a5034");
    R(g, 7, 1, 1, 4, "#7a5034");
    R(g, 4, 1, 4, 1, "#7a5034");
    R(g, 5, 7, 2, 2, "#fff0c8");
  },
  league(g) {
    R(g, 2, 1, 1, 10, "#8a8e96");
    R(g, 3, 1, 7, 5, "#d0503a");
    R(g, 3, 1, 7, 1, shade("#d0503a", 0.3));
    R(g, 5, 3, 3, 1, "#fff0c8");
    R(g, 1, 10, 3, 1, "#5a5e60");
  },
  office(g) {
    R(g, 1, 4, 10, 7, "#9a6a40");
    R(g, 1, 4, 10, 1, shade("#9a6a40", 0.3));
    R(g, 4, 2, 4, 2, "#5a3a24");
    R(g, 1, 7, 10, 1, "#7a5034");
    R(g, 5, 6, 2, 3, "#e2b04a");
  },
  coin(g) {
    ellipse(g, 6, 6, 5, 5, "#e8b030");
    ellipse(g, 6, 6, 3, 3, "#f6d060");
    R(g, 5, 4, 2, 4, "#b8801a");
    R(g, 3, 3, 2, 1, "#fff2b0");
  },
  heart(g) {
    ellipse(g, 4, 4, 3, 3, "#e8506a");
    ellipse(g, 8, 4, 3, 3, "#e8506a");
    for (let i = 0; i < 5; i++) R(g, 1 + i, 5 + i, 10 - i * 2, 1, "#e8506a");
    R(g, 3, 3, 2, 1, "#ffb0c0");
  },
  star(g) {
    pix(g, [".....##.....", "....####....", "############", ".##########.", "..########..", "...######...", "..###..###..", ".###....###.", ".##......##."], "#f2c94c", 0, 1);
    R(g, 5, 2, 1, 2, "#fff4c0");
  },
  mvp(g) {
    // A solid five-point award star, with a bright upper facet and bronze depth.
    // The shared polygon rasterizer is convex-only; this star needs its notches.
    const points=[[6,1],[7.5,4.3],[11,4.6],[8.3,7],[9.2,11],[6,9],[2.8,11],[3.7,7],[1,4.6],[4.5,4.3]];
    g.fillStyle="#f5c84c";
    g.beginPath();g.moveTo(...points[0]);
    for(const point of points.slice(1)) g.lineTo(...point);
    g.closePath();g.fill();
    poly(g, [[6,2],[6,7],[4,6]], "#ffed9a");
    poly(g, [[6,7],[8,7],[9,10],[6,9]], "#cf9423");
  },
  spark(g) {
    R(g, 5, 0, 2, 12, "#f2c94c");
    R(g, 0, 5, 12, 2, "#f2c94c");
    R(g, 4, 4, 4, 4, "#f2c94c");
    R(g, 5, 5, 2, 2, "#fff8d8");
  },
  bolt(g) {
    for (let i = 0; i < 5; i++) R(g, 6 - i, 1 + i, 3, 1, "#f2c94c");
    R(g, 2, 6, 8, 1, "#f2c94c");
    for (let i = 0; i < 4; i++) R(g, 6 - i, 7 + i, 3, 1, "#f2c94c");
    R(g, 6, 1, 1, 2, "#fff4c0");
  },
  trophy(g) {
    R(g, 3, 1, 6, 5, "#e8b030");
    R(g, 4, 6, 4, 1, "#e8b030");
    R(g, 5, 7, 2, 2, "#c89020");
    R(g, 3, 9, 6, 2, "#8a5a34");
    R(g, 1, 2, 2, 3, "#e8b030");
    R(g, 9, 2, 2, 3, "#e8b030");
    R(g, 4, 2, 1, 3, "#fff2b0");
  },
  medal(g) {
    line(g, 3, 0, 5, 5, "#d0503a", 2);
    line(g, 9, 0, 7, 5, "#4f8fd6", 2);
    ellipse(g, 6, 8, 3, 3, "#e8b030");
    R(g, 5, 7, 1, 1, "#fff2b0");
  },
  lock(g) {
    R(g, 3, 1, 6, 1, "#8a8e96");
    R(g, 3, 1, 1, 5, "#8a8e96");
    R(g, 8, 1, 1, 5, "#8a8e96");
    R(g, 2, 5, 8, 6, "#e2b04a");
    R(g, 5, 7, 2, 2, "#7a5034");
  },
  check(g) {
    for (let i = 0; i < 3; i++) R(g, 1 + i, 6 + i, 2, 2, "#5ab05a");
    for (let i = 0; i < 6; i++) R(g, 4 + i, 8 - i, 2, 2, "#5ab05a");
  },
  play(g) {
    for (let y = 1; y <= 10; y++) R(g, 3, y, Math.round((y <= 5.5 ? y : 11 - y) * 1.4), 1, "#fff6dc");
  },
  pause(g) {
    R(g, 3, 2, 2, 8, "#fff6dc");
    R(g, 7, 2, 2, 8, "#fff6dc");
  },
  fast(g) {
    for (let y = 2; y <= 9; y++) {
      const w = (y <= 5.5 ? y - 1 : 10 - y) + 0;
      R(g, 1, y, w, 1, "#fff6dc");
      R(g, 6, y, w, 1, "#fff6dc");
    }
  },
  plus(g) {
    R(g, 5, 2, 2, 8, "#fff6dc");
    R(g, 2, 5, 8, 2, "#fff6dc");
  },
  minus(g) {
    R(g, 2, 5, 8, 2, "#fff6dc");
  },
  close(g) {
    for (let i = 0; i < 8; i++) R(g, 2 + i, 2 + i, 2, 1, "#fff6dc"), R(g, 9 - i, 2 + i, 2, 1, "#fff6dc");
  },
  up(g) {
    for (let i = 0; i < 4; i++) R(g, 5 - i, 1 + i, 2 + i * 2, 1, "#5ab05a");
    R(g, 4, 5, 4, 6, "#5ab05a");
  },
  down(g) {
    for (let i = 0; i < 4; i++) R(g, 5 - i, 10 - i, 2 + i * 2, 1, "#d8603a");
    R(g, 4, 1, 4, 6, "#d8603a");
  },
  even(g) {
    R(g, 2, 3, 8, 2, "#9a9a90");
    R(g, 2, 7, 8, 2, "#9a9a90");
  },
  levelup(g) {
    for (let i = 0; i < 4; i++) R(g, 5 - i, 1 + i, 2 + i * 2, 1, "#e2b04a");
    R(g, 4, 5, 4, 6, "#e2b04a");
    R(g, 5, 2, 1, 6, "#fff2b0");
  },
  idea(g) {
    ellipse(g, 6, 5, 4, 5, "#f6d860");
    R(g, 3, 2, 2, 2, "#fff6c0");
    R(g, 5, 5, 1, 3, "#c88a20");
    R(g, 7, 5, 1, 3, "#c88a20");
    R(g, 6, 7, 1, 1, "#c88a20");
    R(g, 4, 9, 4, 1, "#c8ccd4");
    R(g, 4, 10, 4, 1, "#8a8e9a");
    R(g, 5, 11, 2, 1, "#6a6e7a");
  },
  dumbbell(g) {
    R(g, 0, 4, 2, 4, "#4a5664");
    R(g, 2, 2, 2, 8, "#6a7a8a");
    R(g, 4, 5, 4, 2, "#c8ccd4");
    R(g, 8, 2, 2, 8, "#6a7a8a");
    R(g, 10, 4, 2, 4, "#4a5664");
    R(g, 2, 2, 1, 3, "#9aaabb");
    R(g, 8, 2, 1, 3, "#9aaabb");
  },
  target(g) {
    ellipse(g, 6, 6, 5, 5, "#d0503a");
    ellipse(g, 6, 6, 3, 3, "#fff6dc");
    ellipse(g, 6, 6, 1, 1, "#d0503a");
  },
  bandage(g) {
    line(g, 2, 9, 9, 2, "#f0d8b0", 4);
    R(g, 5, 5, 2, 2, "#c8a878");
  },
  eye(g) {
    ellipse(g, 6, 6, 5, 3, "#fff6dc");
    ellipse(g, 6, 6, 2, 2, "#4f8fd6");
    R(g, 6, 5, 1, 1, "#1e1e24");
  },
  clipboard(g) {
    R(g, 2, 2, 8, 9, "#b8885a");
    R(g, 3, 3, 6, 7, "#fff6dc");
    R(g, 4, 1, 4, 2, "#8a8e96");
    R(g, 4, 5, 4, 1, "#9a9a90");
    R(g, 4, 7, 3, 1, "#9a9a90");
  },
  sprout(g) {
    R(g, 5, 5, 2, 6, "#5a9a40");
    ellipse(g, 3, 4, 3, 2, "#7ac050");
    ellipse(g, 9, 3, 3, 2, "#7ac050");
    R(g, 2, 10, 8, 1, "#8a5a34");
  },
  gift(g) {
    R(g, 1, 4, 10, 7, "#d0503a");
    R(g, 1, 4, 10, 2, shade("#d0503a", 0.2));
    R(g, 5, 4, 2, 7, "#f2c94c");
    R(g, 1, 5, 10, 1, "#f2c94c");
    R(g, 3, 2, 2, 2, "#f2c94c");
    R(g, 7, 2, 2, 2, "#f2c94c");
  },
  news(g) {
    R(g, 1, 4, 3, 4, "#8a8e96");
    for (let i = 0; i < 5; i++) R(g, 4 + i, 4 - i, 1, 4 + i * 2, "#e07a3a");
    R(g, 10, 2, 1, 1, "#fff6dc");
    R(g, 10, 9, 1, 1, "#fff6dc");
  },
  calendar(g) {
    R(g, 1, 2, 10, 9, "#fff6dc");
    R(g, 1, 2, 10, 3, "#d0503a");
    R(g, 3, 1, 1, 2, "#5a5e60");
    R(g, 8, 1, 1, 2, "#5a5e60");
    for (let y = 6; y < 10; y += 2) for (let x = 3; x < 10; x += 2) R(g, x, y, 1, 1, "#9a9a90");
  },
  expand(g) {
    for (const [x, y, dx, dy] of [[1, 1, 1, 1], [10, 1, -1, 1], [1, 10, 1, -1], [10, 10, -1, -1]]) {
      R(g, Math.min(x, x + dx * 3), y, 4, 1, "#fff6dc");
      R(g, x, Math.min(y, y + dy * 3), 1, 4, "#fff6dc");
    }
  },
  help(g) {
    R(g, 3, 1, 6, 2, "#fff6dc");
    R(g, 8, 2, 2, 3, "#fff6dc");
    R(g, 5, 5, 3, 2, "#fff6dc");
    R(g, 5, 7, 2, 1, "#fff6dc");
    R(g, 5, 9, 2, 2, "#fff6dc");
  },
  rest(g) {
    R(g, 1, 6, 5, 1, "#bfe8ff");
    R(g, 4, 7, 1, 1, "#bfe8ff");
    R(g, 3, 8, 1, 1, "#bfe8ff");
    R(g, 1, 9, 5, 1, "#bfe8ff");
    R(g, 7, 1, 4, 1, "#bfe8ff");
    R(g, 9, 2, 1, 1, "#bfe8ff");
    R(g, 8, 3, 1, 1, "#bfe8ff");
    R(g, 7, 4, 4, 1, "#bfe8ff");
  },
  stadium(g) {
    ellipse(g, 6, 7, 6, 4, "#8a9aaa");
    ellipse(g, 6, 7, 4, 2, "#c46a4e");
    ellipse(g, 6, 7, 3, 1, "#6aa04e");
    R(g, 0, 2, 1, 4, "#8a8e96");
    R(g, 11, 2, 1, 4, "#8a8e96");
  },
  shoe(g) {
    R(g, 2, 4, 4, 4, "#d0503a");
    R(g, 2, 6, 9, 3, "#d0503a");
    R(g, 2, 9, 9, 2, "#fff6dc");
    R(g, 3, 5, 2, 1, "#f08a6a");
  },
  ball(g) {
    ellipse(g, 6, 6, 4, 4, "#585c66");
    R(g, 4, 4, 2, 1, "#a8aeb8");
  },
  charm(g) {
    for (const [x, y] of [[4, 4], [8, 4], [4, 8], [8, 8]]) ellipse(g, x, y, 2, 2, "#5cb85c");
    R(g, 6, 6, 1, 5, "#3a8a3a");
  },
  track(g) {
    ellipse(g, 6, 6, 6, 4, "#c46a4e");
    ellipse(g, 6, 6, 4, 2, "#6aa04e");
    R(g, 2, 9, 1, 1, "#fff6dc");
  },
  cage(g) {
    for (let i = 0; i < 5; i++) R(g, 2 + i * 2, 2 + (i % 2), 1, 8, "#5a6a62");
    for (let y = 3; y < 10; y += 2) R(g, 2, y, 9, 1, "#9ab0a4");
    ellipse(g, 6, 10, 3, 1, "#f4f0e0");
  },
  runway(g) {
    R(g, 1, 7, 10, 3, "#c46a4e");
    R(g, 1, 6, 10, 1, "#fff6dc");
    line(g, 2, 5, 10, 1, "#efe6c8");
    R(g, 10, 1, 1, 1, "#5a5a62");
  },
  stands(g) {
    for (let r = 0; r < 4; r++) R(g, r, 3 + r * 2, 12 - r * 2, 2, r % 2 ? "#e2b04a" : "#2f6b52");
    R(g, 0, 1, 12, 2, "#4a5a62");
  },
  lights(g) {
    R(g, 5, 4, 2, 8, "#9aa0a4");
    R(g, 2, 1, 8, 4, "#3b4a4f");
    for (let i = 0; i < 3; i++) R(g, 3 + i * 2, 2, 1, 2, "#fff4cb");
  },
  video(g) {
    R(g, 1, 2, 10, 7, "#3a3e4a");
    R(g, 2, 3, 8, 5, "#6ad0e0");
    R(g, 4, 9, 4, 2, "#5a5e60");
    R(g, 5, 4, 2, 3, "#fff6dc");
  },
  build2(g) {
    R(g, 1, 5, 10, 6, "#e8dcc0");
    for (let i = 0; i < 6; i++) R(g, 5 - i, i, 2 + i * 2, 1, "#b85a3a");
    R(g, 5, 7, 2, 4, "#7a5034");
  },
  sun(g) {
    for (const [x, y] of [[5, 0], [5, 10], [0, 5], [10, 5], [2, 2], [8, 2], [2, 8], [8, 8]]) R(g, x, y, 2, 2, "#f2a830");
    ellipse(g, 6, 6, 3, 3, "#f6d050");
    R(g, 4, 4, 2, 1, "#fff4c0");
  },
  cloud(g) {
    ellipse(g, 4, 7, 3, 2, "#c8d0d8");
    ellipse(g, 7, 5, 3, 3, "#e4e8ee");
    ellipse(g, 8, 8, 3, 2, "#d4dae2");
    R(g, 2, 8, 9, 2, "#d4dae2");
    R(g, 6, 3, 2, 1, "#ffffff");
  },
  rain(g) {
    ellipse(g, 4, 4, 3, 2, "#8a96a6");
    ellipse(g, 7, 3, 3, 3, "#a4aebc");
    R(g, 2, 4, 9, 2, "#98a2b2");
    for (const [x, y] of [[2, 8], [5, 9], [8, 8], [3, 11], [9, 11]]) R(g, x, y, 1, 2, "#5aa0e0");
  },
  snow(g) {
    R(g, 5, 0, 2, 12, "#e8f2ff");
    R(g, 0, 5, 12, 2, "#e8f2ff");
    for (let i = 0; i < 4; i++) R(g, 2 + i * 2, 2 + i * 2, 2, 2, "#c8dcf4"), R(g, 8 - i * 2, 2 + i * 2, 2, 2, "#c8dcf4");
    R(g, 5, 5, 2, 2, "#ffffff");
  },
  wind(g) {
    R(g, 0, 3, 8, 1, "#d8e4ea");
    R(g, 8, 1, 2, 1, "#d8e4ea");
    R(g, 10, 2, 1, 1, "#d8e4ea");
    R(g, 0, 6, 11, 1, "#b8c8d2");
    R(g, 0, 9, 7, 1, "#d8e4ea");
    R(g, 7, 10, 2, 1, "#d8e4ea");
    R(g, 9, 9, 1, 1, "#d8e4ea");
  },
  heat(g) {
    R(g, 5, 0, 3, 9, "#f4f0e8");
    R(g, 6, 3, 1, 6, "#e04a3a");
    ellipse(g, 6, 9, 2, 2, "#e04a3a");
    R(g, 9, 2, 2, 1, "#f2a830");
    R(g, 9, 5, 2, 1, "#f2a830");
    R(g, 1, 3, 2, 1, "#f2a830");
  },
  clock(g) {
    ellipse(g, 6, 6, 5, 5, "#f4efe2");
    R(g, 6, 2, 1, 4, INK);
    R(g, 6, 6, 3, 1, INK);
    R(g, 3, 3, 1, 1, "#ffffff");
  },
  m0(g) {
    face(g, "#e0604a", (g) => (R(g, 4, 8, 4, 1, INK), R(g, 3, 9, 1, 1, INK), R(g, 8, 9, 1, 1, INK)), "x");
  },
  m1(g) {
    face(g, "#e8964a", (g) => (R(g, 4, 8, 4, 1, INK), R(g, 3, 9, 1, 1, INK), R(g, 8, 9, 1, 1, INK)));
  },
  m2(g) {
    face(g, "#e8c050", (g) => R(g, 4, 8, 4, 1, INK));
  },
  m3(g) {
    face(g, "#a8c858", (g) => (R(g, 4, 9, 4, 1, INK), R(g, 3, 8, 1, 1, INK), R(g, 8, 8, 1, 1, INK)));
  },
  m4(g) {
    face(g, "#5ab878", (g) => (R(g, 3, 7, 6, 1, INK), R(g, 4, 8, 4, 2, "#c84a4a")), "happy");
  },
};
export const ICON_NAMES = Object.keys(ICONS);
let installed = false;
export function installIcons() {
  if (installed || typeof document === "undefined") return;
  installed = true;
  const rules = [];
  for (const [name, draw] of Object.entries(ICONS)) {
    const base = canvas(12, 12);
    draw(base.getContext("2d"));
    const out = outlined(base),
      big = canvas(36, 36),
      g = big.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.drawImage(out, 0, 0, 36, 36);
    rules.push(`.ico-${name}{background-image:url(${big.toDataURL()})}`);
  }
  const style = document.createElement("style");
  style.textContent = rules.join("\n");
  document.head.append(style);
}
export const ico = (name, cls = "") => `<i class="ico ico-${name} ${cls}" aria-hidden="true"></i>`;
export const moodIco = (mood) => ico("m" + mood, "mood");
