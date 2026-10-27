import { FACILITIES, LEAGUES, EVENT_IDS, EVENTS } from "../game-content.js";
import { currentAthlete, currentRival, best } from "../domain/game.js";
const C = {
  ink: "#263b38",
  cream: "#fff0cb",
  dark: "#315b49",
  leaf: "#648653",
  light: "#9ab778",
  clay: "#bb7757",
};
export const PLOTS = Array.from({ length: 9 }, (_, i) => ({
  x: 135 + (i % 3) * 110,
  y: 127 + Math.floor(i / 3) * 51,
}));
const rect = (g, x, y, w, h, c) => {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), w, h);
};
function ellipse(g, x, y, rx, ry, c) {
  g.fillStyle = c;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
}
function round(g, x, y, w, h, r, c) {
  g.fillStyle = c;
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fill();
}
function poly(g, points, c) {
  g.fillStyle = c;
  g.beginPath();
  points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.fill();
}
function stroke(g, points, c, w = 1) {
  g.strokeStyle = c;
  g.lineWidth = w;
  g.beginPath();
  points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.stroke();
}
function tree(g, x, y, size = 1) {
  g.save();
  g.translate(x, y);
  g.scale(size, size);
  ellipse(g, 5, 6, 13, 4, "#355a4138");
  rect(g, -2, -19, 5, 22, "#785b3f");
  rect(g, 1, -15, 2, 18, "#a27a4b");
  ellipse(g, 0, -28, 13, 17, "#42674a");
  ellipse(g, -6, -30, 11, 12, "#567c50");
  ellipse(g, 5, -35, 10, 11, "#72985e");
  ellipse(g, -5, -38, 7, 5, "#97b678");
  rect(g, -10, -26, 3, 3, "#99b97c");
  rect(g, 8, -29, 2, 3, "#34563e");
  g.restore();
}
function pine(g, x, y, s = 1) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  rect(g, -1, -14, 3, 18, "#795d42");
  for (let k = 0; k < 4; k++)
    poly(
      g,
      [
        [0, -42 + k * 7],
        [-12 + k, -17 + k * 5],
        [13 - k, -17 + k * 5],
      ],
      k % 2 ? "#4e7854" : "#5b865b",
    );
  stroke(
    g,
    [
      [0, -40],
      [0, -18],
    ],
    "#749769",
  );
  g.restore();
}
function bench(g, x, y) {
  rect(g, x, y + 6, 18, 2, "#304c3e55");
  rect(g, x, y, 18, 3, "#b98c5d");
  rect(g, x, y + 4, 18, 3, "#d6ad75");
  rect(g, x + 2, y + 7, 2, 3, "#425748");
  rect(g, x + 14, y + 7, 2, 3, "#425748");
}
function windowBox(g, x, y, w = 8, h = 7) {
  rect(g, x - 1, y - 1, w + 2, h + 2, "#5b6150");
  rect(g, x, y, w, h, "#93c0be");
  rect(g, x, y, w, 2, "#d4e8d5");
  rect(g, x + 2, y + 2, 1, h - 2, "#c7ded0");
}
function building(g, x, y, type, level) {
  const d = FACILITIES[type],
    w = type === "club" ? 66 : 58,
    h = 25 + (level - 1) * 2;
  ellipse(g, x + 5, y + 2, w * 0.58, 7, "#243d3138");
  if (type === "rings") {
    round(g, x - 34, y - 28, 68, 31, 4, "#a2ae82");
    for (let i = 1; i < 4; i++)
      stroke(
        g,
        [
          [x, y - 2],
          [x - 22 + i * 2, y - 32 + i * 2],
          [x + 22 - i * 2, y - 32 + i * 2],
        ],
        "#dce1bd",
        0.6,
      );
    ellipse(g, x, y - 1, 12, 5, "#62786a");
    ellipse(g, x, y - 3, 11, 5, "#f5ead0");
    ellipse(g, x, y - 3, 8, 3, "#9c9d8a");
    rect(g, x + 8, y - 5, 3, 4, "#fff1d6");
    if (level > 1) {
      stroke(
        g,
        [
          [x - 15, y],
          [x - 18, y - 29],
          [x - 10, y - 36],
          [x + 14, y - 34],
        ],
        "#54746c",
        2,
      );
      for (let j = 0; j < 7; j++)
        stroke(
          g,
          [
            [x - 17 + j * 4, y - 30],
            [x - 14 + j * 4, y - 1],
          ],
          "#6d887455",
          0.8,
        );
    }
    rect(g, x + 25, y - 12, 9, 10, "#9b7953");
    for (let j = 0; j < 3; j++)
      ellipse(g, x + 27 + j * 2, y - 13, 2, 1, "#ded8c3");
    return;
  }
  if (type === "sprint") {
    round(g, x - 35, y - 29, 70, 33, 3, "#bb7659");
    for (let j = 1; j < 4; j++)
      rect(g, x - 34, y - 29 + j * 8, 68, 1, "#f4e8c8");
    rect(g, x - 25, y - 28, 1, 31, "#f4e8c8");
    for (let j = 0; j < 4; j++)
      rect(g, x + 24, y - 27 + j * 8, 3, 3, "#eee6ca");
    for (let j = 0; j < 3; j++) {
      rect(g, x - 16 + j * 14, y - 13, 8, 2, "#4b6558");
      rect(g, x - 15 + j * 14, y - 11, 1, 4, "#45594a");
      rect(g, x - 10 + j * 14, y - 11, 1, 4, "#45594a");
    }
    return;
  }
  if (type === "garden") {
    round(g, x - 33, y - 27, 66, 33, 7, "#6e8f5b");
    stroke(
      g,
      [
        [x - 23, y + 1],
        [x - 5, y - 9],
        [x + 24, y - 5],
      ],
      "#c4b18a",
      5,
    );
    tree(g, x - 20, y - 7, 0.55);
    tree(g, x + 21, y - 6, 0.65);
    bench(g, x - 9, y - 4);
    for (let i = 0; i < 12; i++) {
      const xx = x - 29 + ((i * 17) % 59),
        yy = y - 20 + ((i * 7) % 21);
      rect(g, xx, yy, 2, 2, i % 2 ? "#eed08e" : "#dca799");
    }
    return;
  }
  if (type === "stands") {
    rect(g, x - 35, y - 18, 70, 22, "#667e7c");
    for (let j = 0; j < 4; j++) {
      rect(g, x - 33, y - 17 + j * 5, 66, 3, j % 2 ? "#90a69a" : "#bac0a6");
      for (let k = 0; k < 9; k++) {
        rect(
          g,
          x - 29 + k * 7,
          y - 18 + j * 5,
          3,
          2,
          (k + j) % 2 ? "#d3ae75" : "#6a9086",
        );
      }
    }
    poly(
      g,
      [
        [x - 39, y - 29],
        [x + 32, y - 29],
        [x + 38, y - 20],
        [x - 33, y - 20],
      ],
      "#405e57",
    );
    rect(g, x - 34, y - 28, 2, 32, "#435a50");
    rect(g, x + 32, y - 28, 2, 32, "#435a50");
    return;
  }
  rect(g, x - w / 2, y - h, w, h, "#d4caab");
  rect(g, x - w / 2 + 3, y - h + 3, w - 6, h - 3, "#eae0bf");
  rect(g, x + w / 2 - 6, y - h, 6, h, "#b6b49a");
  rect(g, x - w / 2, y - 3, w, 4, "#aea78e");
  poly(
    g,
    [
      [x - w / 2 - 4, y - h - 7],
      [x + w / 2 - 3, y - h - 7],
      [x + w / 2 + 3, y - h + 1],
      [x - w / 2 + 1, y - h + 1],
    ],
    "#3b4e43",
  );
  poly(
    g,
    [
      [x - w / 2 - 4, y - h - 8],
      [x + w / 2 - 3, y - h - 8],
      [x + w / 2 + 3, y - h],
      [x - w / 2 + 1, y - h],
    ],
    d.color,
  );
  for (let i = 0; i < 6; i++)
    stroke(
      g,
      [
        [x - w / 2 + i * 11, y - h - 7],
        [x - w / 2 + i * 11 + 4, y - h - 1],
      ],
      "#f3e8c344",
    );
  rect(g, x - w / 2 - 2, y - h - 8, w - 1, 2, "#ecd8ab77");
  windowBox(g, x - w / 2 + 6, y - h + 7, 10, 8);
  windowBox(g, x + w / 2 - 17, y - h + 7, 10, 8);
  rect(g, x - 6, y - 15, 12, 15, "#546d58");
  rect(g, x - 4, y - 13, 8, 7, "#8ba894");
  rect(g, x + 2, y - 6, 1, 2, "#efcc7c");
  rect(g, x - 9, y, 18, 3, "#ddd3b0");
  if (type === "club") {
    rect(g, x - 14, y - h - 5, 28, 9, "#f3e8c2");
    g.font = "bold 6px monospace";
    g.textAlign = "center";
    g.fillStyle = "#45624b";
    g.fillText("R & S", x, y - h + 2);
    rect(g, x - 27, y - 6, 8, 5, "#aa7551");
    for (let j = 0; j < 4; j++) rect(g, x - 26 + j * 2, y - 8, 2, 3, "#ccab67");
  }
  if (type === "gym") {
    stroke(
      g,
      [
        [x - 24, y - 10],
        [x - 13, y - 10],
      ],
      "#4b5850",
      2,
    );
    rect(g, x - 25, y - 13, 2, 6, "#48544b");
    rect(g, x - 14, y - 13, 2, 6, "#48544b");
  }
  if (type === "recovery") {
    rect(g, x - 21, y - 14, 3, 9, "#5e9483");
    rect(g, x - 24, y - 11, 9, 3, "#5e9483");
  }
  if (type === "analysis") {
    rect(g, x - 25, y - 15, 12, 9, "#435d63");
    rect(g, x - 24, y - 14, 10, 6, "#a4c9ba");
    rect(g, x - 20, y - 12, 2, 2, "#edf0c5");
  }
  if (type === "workshop") {
    rect(g, x - 25, y - 14, 12, 14, "#887c61");
    for (let j = 0; j < 4; j++)
      rect(g, x - 25, y - 12 + j * 3, 12, 1, "#bfb08c");
  }
  if (level >= 2) {
    rect(g, x + w / 2 - 1, y - 18, 15, 18, "#cac4aa");
    poly(
      g,
      [
        [x + w / 2 - 3, y - 21],
        [x + w / 2 + 14, y - 21],
        [x + w / 2 + 17, y - 17],
        [x + w / 2, y - 17],
      ],
      d.color,
    );
    windowBox(g, x + w / 2 + 3, y - 13, 7, 7);
  }
  if (level >= 3) {
    rect(g, x - w / 2 + 4, y - h - 14, 2, 9, "#a69a79");
    poly(
      g,
      [
        [x - w / 2 + 6, y - h - 14],
        [x - w / 2 + 17, y - h - 12],
        [x - w / 2 + 6, y - h - 8],
      ],
      "#e7c477",
    );
  }
}
export function person(
  g,
  x,
  y,
  a,
  scale = 1,
  pose = "idle",
  phase = 0,
  shirt = "#dba652",
  event = "shot",
) {
  g.save();
  g.translate(Math.round(x), Math.round(y));
  g.scale(scale, scale);
  const skin = a.skin || "#c99770",
    hair = a.hair || "#48362c",
    p = Math.sin(phase),
    walk = pose === "walk",
    throwing = pose === "throw",
    leg = walk ? p * 3 : 0;
  ellipse(g, 1, 1, 6, 2, "#172c3033");
  const limb = (x0, y0, x1, y1, color, w = 3) => {
    g.lineCap = "square";
    stroke(
      g,
      [
        [Math.round(x0), Math.round(y0)],
        [Math.round(x1), Math.round(y1)],
      ],
      color,
      w,
    );
  };
  limb(-3, -10, -4 + leg, -3, "#354e58", 4);
  limb(3, -10, 4 - leg, -3, "#354e58", 4);
  rect(g, -6 + leg, -3, 5, 3, "#f1ead5");
  rect(g, 1 - leg, -3, 5, 3, "#f1ead5");
  rect(g, -5 + leg, -1, 4, 1, "#8b9c8c");
  rect(g, 2 - leg, -1, 4, 1, "#8b9c8c");
  rect(g, -5, -22, 11, 13, shirt);
  rect(g, -5, -22, 11, 2, "#f4e7bc");
  rect(g, -5, -13, 11, 4, "#354e58");
  rect(g, -1, -20, 4, 7, "#f8eed3");
  rect(g, 0, -18, 2, 3, "#3d5c4e");
  let left = [-8, -12],
    right = [9, -13];
  if (walk) {
    left = [-7, -14 + p * 3];
    right = [8, -14 - p * 3];
  }
  if (pose === "train") {
    left = [-8, -21 - p * 4];
    right = [8, -21 - p * 4];
  }
  if (pose === "ready" || throwing) {
    const t = throwing ? Math.min(1, phase) : 0;
    left = [-10 + 8 * t, -16 - 5 * t];
    right =
      event === "jav"
        ? [-12 + 27 * t, -24 - 5 * Math.sin(t * Math.PI)]
        : event === "shot"
          ? [5 + 13 * t, -25 + 4 * t]
          : [Math.cos(t * 5) * 16, -22 + Math.sin(t * 5) * 4];
  }
  limb(-5, -20, left[0], left[1], skin, 3);
  limb(6, -20, right[0], right[1], skin, 3);
  rect(g, -3, -26, 7, 5, skin);
  rect(g, -5, -34, 11, 10, skin);
  rect(g, -5, -34, 11, 4, hair);
  rect(g, -6, -32, 3, 6, hair);
  rect(g, 5, -31, 2, 4, skin);
  rect(g, 3, -29, 1, 2, "#2d3632");
  rect(g, 2, -26, 3, 1, "#ac7656");
  if (a.hairstyle === 1) {
    ellipse(g, -5, -34, 3, 3, hair);
    rect(g, -7, -31, 2, 7, hair);
  }
  if (a.hairstyle === 2) rect(g, -4, -36, 9, 3, hair);
  if ((pose === "ready" || throwing) && (!throwing || phase < 0.5)) {
    g.fillStyle = "#c1baa1";
    if (event === "jav")
      stroke(
        g,
        [
          [right[0] - 15, right[1] + 3],
          [right[0] + 20, right[1] - 4],
        ],
        "#e9dfbd",
        1,
      );
    else if (event === "hammer") {
      stroke(
        g,
        [
          [right[0], right[1]],
          [right[0] + 14, right[1] + 9],
        ],
        "#cbd1b7",
        1,
      );
      ellipse(g, right[0] + 14, right[1] + 9, 2, 2, "#57676a");
    } else
      ellipse(
        g,
        right[0] + 1,
        right[1],
        event === "shot" ? 2 : 4,
        event === "shot" ? 2 : 1,
        "#cec5a4",
      );
  }
  g.restore();
}
let cached = null,
  cacheKey = "";
function baseWorld(s) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 320;
  const g = c.getContext("2d");
  const sky = g.createLinearGradient(0, 0, 0, 90);
  sky.addColorStop(0, "#a8c6bb");
  sky.addColorStop(1, "#e6e5c1");
  g.fillStyle = sky;
  g.fillRect(0, 0, 512, 320);
  ellipse(g, 417, 26, 18, 18, "#f4dda3");
  for (let i = 0; i < 3; i++) {
    const pts = [[0, 80]];
    for (let x = 0; x <= 512; x += 8)
      pts.push([
        x,
        52 + i * 13 + Math.sin(x * 0.02 + i) * 10 + Math.cos(x * 0.044 + i) * 5,
      ]);
    pts.push([512, 100]);
    poly(g, pts, ["#97b49e", "#7b9d83", "#61866d"][i]);
  }
  for (let i = 0; i < 18; i++) {
    const x = 18 + i * 29,
      h = 10 + ((i * 7) % 19);
    rect(g, x, 72 - h, 18, h, "#c6c8ad");
    poly(
      g,
      [
        [x - 2, 72 - h],
        [x + 9, 65 - h],
        [x + 20, 72 - h],
      ],
      i % 2 ? "#8b8c71" : "#9b8267",
    );
    rect(g, x + 5, 74 - h, 3, 5, "#728e82");
  }
  rect(g, 0, 78, 512, 242, "#779466");
  for (let j = 0; j < 90; j++)
    rect(
      g,
      (j * 79) % 512,
      85 + ((j * 37) % 235),
      2,
      1,
      j % 3 ? "#a1b57b" : "#547b52",
    );
  round(g, 12, 84, 488, 223, 95, "#d6c6a0");
  round(g, 17, 88, 478, 214, 91, "#ad674e");
  for (let k = 0; k < 4; k++) {
    g.strokeStyle = "#eddbb7";
    g.lineWidth = 0.8;
    g.beginPath();
    g.roundRect(21 + k * 5, 92 + k * 5, 470 - k * 10, 206 - k * 10, 87 - k * 5);
    g.stroke();
  }
  round(g, 43, 113, 426, 166, 60, "#809c63");
  for (let j = 0; j < 10; j++) rect(g, 58, 121 + j * 14, 394, 6, "#89a66a");
  for (let row = 0; row < 3; row++) {
    rect(g, 95, 138 + row * 51, 319, 5, "#c3b690");
    rect(g, 96, 139 + row * 51, 317, 1, "#ddcba1");
    for (let x = 98; x < 409; x += 13)
      rect(g, x, 140 + row * 51, 1, 2, "#b09e7c");
  }
  for (const x of [187, 297]) rect(g, x, 113, 5, 139, "#c3b690");
  // Railings, entrance, benches and landscaped perimeter.
  for (let x = 31; x < 486; x += 11) {
    rect(g, x, 81, 1, 9, "#e2d6b3");
  }
  rect(g, 29, 83, 458, 1, "#e5dbbb");
  for (const [x, y, size] of [
    [30, 103, 0.8],
    [489, 118, 0.7],
    [27, 282, 0.8],
    [478, 292, 0.9],
    [60, 64, 0.75],
    [450, 66, 0.7],
    [12, 49, 0.7],
  ])
    tree(g, x, y, size);
  for (const [x, y] of [
    [87, 69],
    [130, 67],
    [365, 68],
    [395, 68],
    [478, 72],
  ])
    pine(g, x, y, 0.7);
  bench(g, 53, 170);
  bench(g, 427, 175);
  bench(g, 61, 235);
  bench(g, 428, 234);
  ellipse(g, 62, 295, 21, 7, "#557c66");
  ellipse(g, 62, 293, 18, 5, "#95b6a4");
  stroke(
    g,
    [
      [47, 292],
      [59, 291],
      [66, 293],
    ],
    "#d4dfbf",
    1,
  );
  for (let i = 0; i < 15; i++) {
    const x = 25 + ((i * 31) % 470),
      y = i % 2 ? 313 : 76;
    rect(g, x, y, 3, 2, "#d8b787");
    rect(g, x + 1, y - 2, 2, 2, "#e9d2a0");
  }
  rect(g, 232, 300, 49, 14, "#d5c29b");
  rect(g, 231, 299, 3, 20, "#6f7e65");
  rect(g, 279, 299, 3, 20, "#6f7e65");
  rect(g, 232, 299, 49, 3, "#ead5a9");
  g.font = "bold 7px monospace";
  g.fillStyle = "#405c48";
  g.textAlign = "center";
  g.fillText("RING & SECTOR", 257, 310);
  for (let i = 0; i < 9; i++) {
    const p = PLOTS[i],
      f = s.plots[i];
    if (f) building(g, p.x, p.y, f.type, f.level);
    else {
      round(g, p.x - 36, p.y - 30, 72, 38, 3, "#76945f");
      g.setLineDash([2, 3]);
      g.strokeStyle = "#c6cea277";
      g.strokeRect(p.x - 32, p.y - 27, 64, 32);
      g.setLineDash([]);
      rect(g, p.x - 4, p.y - 12, 9, 1, "#cbd3a4");
      rect(g, p.x, p.y - 16, 1, 9, "#cbd3a4");
    }
  }
  return c;
}
export function drawWorld(canvas, s, now, selected = -1, training = false) {
  const g = canvas.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.setTransform(2, 0, 0, 2, 0, 0);
  const key =
    s.plots.map((p) => (p ? p.type + p.level : "-")).join("|") + s.league;
  if (key !== cacheKey) {
    cached = baseWorld(s);
    cacheKey = key;
  }
  g.drawImage(cached, 0, 0);
  for (let i = 0; i < 3; i++) {
    const x = ((now * 0.004 + i * 180) % 600) - 50;
    ellipse(g, x, 20 + i * 9, 16, 4, "#f6edcd77");
    ellipse(g, x + 8, 16 + i * 9, 8, 6, "#f6edcd77");
  }
  // A flag, migrating birds and a lap runner give the club a pulse.
  rect(g, 462, 70, 2, 33, "#4b6d5b");
  poly(
    g,
    [
      [464, 71],
      [479, 73 + Math.sin(now / 400)],
      [476, 79],
      [464, 79],
    ],
    "#e4bf6c",
  );
  const runnerX = 256 + 232 * Math.cos(now * 0.0001),
    runnerY = 195 + 99 * Math.sin(now * 0.0001);
  person(
    g,
    runnerX,
    runnerY,
    { skin: "#bd8960", hair: "#53402e", hairstyle: 0 },
    0.47,
    "walk",
    now / 120,
    "#b95f4b",
  );
  s.roster.forEach((a, i) => {
    const target = training
      ? ((i + Math.floor(now / 5500)) % 3) + 1
      : (i % 3) + 3;
    const p = PLOTS[target];
    const move = Math.sin(now / 2400 + i) * 10;
    person(
      g,
      p.x + 18 + move,
      p.y + 5 + (i % 2) * 6,
      a,
      0.65,
      training ? "train" : "walk",
      now / (training ? 230 : 180) + i,
      "#d8ad60",
      a.event,
    );
  });
  if (selected >= 0) {
    const p = PLOTS[selected];
    g.strokeStyle = "#f9d77c";
    g.lineWidth = 2;
    g.strokeRect(p.x - 38, p.y - 40, 76, 48);
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
}
export function drawPortrait(canvas, a, size = 2) {
  const g = canvas.getContext("2d");
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.imageSmoothingEnabled = false;
  g.setTransform(1, 0, 0, 1, 0, 0);
  person(
    g,
    canvas.width / 2,
    canvas.height - 4,
    a,
    size,
    "idle",
    0,
    "#d8ad60",
    a.event,
  );
}
export function hitPlot(canvas, clientX, clientY) {
  const r = canvas.getBoundingClientRect(),
    scale = Math.min(r.width / 512, r.height / 320),
    x = (clientX - r.left - (r.width - 512 * scale) / 2) / scale,
    y = (clientY - r.top - (r.height - 320 * scale) / 2) / scale;
  return PLOTS.findIndex(
    (p) => x > p.x - 42 && x < p.x + 42 && y > p.y - 42 && y < p.y + 8,
  );
}
export function drawStadium(canvas, s, now, animation = null) {
  const m = s.match;
  if (!m) return;
  const g = canvas.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.setTransform(2, 0, 0, 2, 0, 0);
  const ev = EVENT_IDS[m.eventIndex],
    a = currentAthlete(s),
    r = currentRival(s),
    e = EVENTS[ev];
  const sky = g.createLinearGradient(0, 0, 0, 104);
  sky.addColorStop(0, "#9cbec7");
  sky.addColorStop(1, "#e5e5cb");
  g.fillStyle = sky;
  g.fillRect(0, 0, 600, 330);
  ellipse(g, 515, 39, 24, 24, "#f3dda5");
  for (let i = 0; i < 6; i++) {
    const x = i * 110 - 10,
      h = 20 + (i % 3) * 12;
    poly(
      g,
      [
        [x, 100],
        [x + 70, 45 + h],
        [x + 140, 100],
      ],
      "#8caaa0",
    );
    rect(g, x + 12, 96 - h, 37, h, "#9aafa1");
  }
  // Roof and crowd in discrete tiers.
  rect(g, 0, 93, 600, 60, "#47655d");
  for (let row = 0; row < 6; row++) {
    rect(g, 0, 96 + row * 9, 600, 8, row % 2 ? "#6e8a78" : "#7e9580");
    for (let col = 0; col < 85; col++) {
      const x = col * 7 + (row % 2) * 3,
        y = 98 + row * 9,
        bob = Math.sin(now / 600 + col + row) > 0.97 ? 1 : 0;
      rect(
        g,
        x,
        y - bob,
        3,
        3,
        ["#d8b58f", "#e9c4a0", "#ad7a53"][(col + row) % 3],
      );
      rect(
        g,
        x,
        y + 3 - bob,
        3,
        3,
        ["#c78b62", "#ded0a3", "#466b65", m.color, "#bb9f72"][
          (col * 3 + row) % 5
        ],
      );
    }
  }
  poly(
    g,
    [
      [0, 81],
      [600, 81],
      [600, 91],
      [0, 91],
    ],
    "#36594d",
  );
  rect(g, 0, 81, 600, 2, "#a9b89a");
  for (let x = 8; x < 600; x += 95) rect(g, x, 91, 3, 62, "#3b5e52");
  rect(g, 0, 151, 600, 21, "#e1d6b1");
  for (let j = 0; j < 6; j++) {
    rect(g, j * 100 + 1, 153, 98, 17, j % 2 ? "#305749" : "#b67950");
    g.font = "bold 7px monospace";
    g.textAlign = "center";
    g.fillStyle = "#f8e8c3";
    g.fillText(
      [
        "RING & SECTOR",
        "FIELDWORK",
        "A BETTER CLUB",
        "THROW TOGETHER",
        "EVERY MARK MATTERS",
        "CLUB ATHLETICS",
      ][j],
      j * 100 + 50,
      164,
    );
  }
  rect(g, 0, 172, 600, 158, "#80a161");
  for (let x = 0; x < 600; x += 28) rect(g, x, 173, 14, 157, "#87a96a");
  // Sector and runway follow a single coherent camera plane.
  const ox = 115,
    oy = 281;
  poly(
    g,
    [
      [ox, oy],
      [600, 187],
      [600, 325],
    ],
    "#8eae6c",
  );
  stroke(
    g,
    [
      [ox, oy],
      [600, 187],
    ],
    "#ecedcf",
    1.3,
  );
  stroke(
    g,
    [
      [ox, oy],
      [600, 325],
    ],
    "#ecedcf",
    1.3,
  );
  const ppm = 440 / (e.max * 1.02);
  for (
    let mark = e.max > 30 ? 20 : 8;
    mark < e.max;
    mark += e.max > 30 ? 10 : 4
  ) {
    const x = ox + mark * ppm;
    stroke(
      g,
      [
        [x, oy - (x - ox) * 0.194],
        [x, oy + (x - ox) * 0.09],
      ],
      "#d1dbaf88",
      0.8,
    );
    round(g, x - 12, oy - (x - ox) * 0.194 - 16, 25, 12, 2, "#f3e6c5");
    g.fillStyle = "#46634e";
    g.font = "bold 7px monospace";
    g.textAlign = "center";
    g.fillText(mark + " m", x, oy - (x - ox) * 0.194 - 7);
  }
  if (ev === "jav") {
    poly(
      g,
      [
        [0, 269],
        [115, 275],
        [115, 289],
        [0, 298],
      ],
      "#b87857",
    );
    stroke(
      g,
      [
        [0, 269],
        [115, 275],
        [115, 289],
        [0, 298],
      ],
      "#f1e7c9",
      1.2,
    );
  } else {
    ellipse(g, 115, 283, 25, 9, "#466b59");
    ellipse(g, 115, 280, 24, 8, "#f1e8c7");
    ellipse(g, 115, 280, 19, 6, "#a9ae95");
    if (ev === "shot") rect(g, 132, 276, 5, 7, "#fbefd1");
  }
  if (ev === "hammer" || ev === "discus") {
    for (let j = 0; j < 5; j++) {
      const x = 83 + j * 8;
      stroke(
        g,
        [
          [x, 278],
          [x - 5, 207],
          [x + 8, 203],
        ],
        "#45695b88",
        2,
      );
    }
    stroke(
      g,
      [
        [78, 207],
        [112, 203],
      ],
      "#45695b",
      2,
    );
  }
  const target = best(m.awayMarks[m.eventIndex]);
  if (target != null) {
    const x = ox + target * ppm;
    stroke(
      g,
      [
        [x, oy - (x - ox) * 0.194],
        [x, oy + (x - ox) * 0.09],
      ],
      "#e5be6888",
      2,
    );
    g.fillStyle = "#6e6a3f";
    g.font = "bold 7px monospace";
    g.textAlign = "left";
    g.fillText("RIVAL " + target.toFixed(2), x + 4, oy - (x - ox) * 0.194 + 12);
  }
  const pb = a.pb[ev];
  if (pb) {
    const x = ox + pb * ppm;
    stroke(
      g,
      [
        [x, oy - (x - ox) * 0.194],
        [x, oy + (x - ox) * 0.09],
      ],
      "#f1edd399",
      1,
    );
  }
  const t = animation ? (now - animation.start) / animation.duration : 0;
  let playerX = 105,
    pose = m.phase === "timing" ? "ready" : "idle",
    frame = 0;
  if (animation && t < 0.35) {
    pose = "throw";
    frame = t / 0.35;
    if (ev === "jav") playerX = 35 + (70 * t) / 0.35;
  } else if (animation) {
    pose = "throw";
    frame = 1;
  }
  person(g, playerX, 279, a, 1.9, pose, frame, "#d8ad60", ev);
  person(g, 36, 228, r, 1.05, "idle", 0, m.color, ev);
  person(
    g,
    554,
    244,
    { skin: "#d5ac87", hair: "#d0d0b7" },
    0.9,
    "idle",
    0,
    "#f0e9cf",
  );
  if (animation && t >= 0.3) {
    const flight = clamp01((t - 0.3) / 0.6),
      distance = animation.mark ?? e.min + (e.max - e.min) * 0.22,
      endX = ox + distance * ppm,
      x = ox + (endX - ox) * flight,
      y = 252 + (285 - 252) * flight - Math.sin(flight * Math.PI) * 82;
    if (flight < 1) {
      ellipse(
        g,
        x,
        y + 12 + Math.sin(flight * Math.PI) * 82,
        4,
        1,
        "#254a3c33",
      );
      if (ev === "jav")
        stroke(
          g,
          [
            [x - 13, y + 4],
            [x + 14, y - 4],
          ],
          "#ece6ca",
          2,
        );
      else if (ev === "discus") ellipse(g, x, y, 5, 2, "#ddd0a7");
      else {
        ellipse(g, x, y, 3, 3, "#53625c");
        if (ev === "hammer")
          stroke(
            g,
            [
              [x, y],
              [x - 10, y - 6],
            ],
            "#ddd8bb",
            1,
          );
      }
    } else {
      ellipse(g, endX, 285, 9, 3, "#9c947055");
      for (let k = 0; k < 5; k++)
        rect(g, endX - 7 + k * 3, 281 + (k % 3), 2, 2, "#c2b887");
    }
  }
  // A bright on-canvas title is concise; all essential match data is in the HTML panel.
  round(g, 12, 12, 228, 38, 5, "#244c43ed");
  g.fillStyle = "#f7ebc9";
  g.textAlign = "left";
  g.font = "bold 11px monospace";
  g.fillText(e.name.toUpperCase(), 23, 29);
  g.font = "8px monospace";
  g.fillStyle = "#c6d5b7";
  g.fillText(LEAGUES[s.league].venue, 23, 42);
  g.setTransform(1, 0, 0, 1, 0, 0);
}
function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}
