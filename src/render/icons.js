import { canvas, outlined, shade, ellipse, line } from "./pixel.js";
import { ITEMS } from "../game-content.js";

// 16×16 item icons, shaded from a single base colour and outlined.
const SHAPES = {
  ball(g, c) {
    ellipse(g, 8, 9, 5, 5, c);
    ellipse(g, 7, 8, 3, 3, shade(c, 0.25));
    g.fillStyle = shade(c, 0.6);
    g.fillRect(6, 6, 2, 1);
    g.fillStyle = shade(c, -0.3);
    g.fillRect(9, 12, 3, 1);
  },
  discus(g, c) {
    ellipse(g,8,9,7,4,"#8a9098"); ellipse(g,8,8,5,3,c); ellipse(g,8,8,2,1,shade(c,0.4));
  },
  hammer(g, c) {
    line(g,4,3,10,10,"#b8c0c8"); line(g,2,2,5,2,"#e0e4e8"); line(g,2,2,4,5,"#b8c0c8"); ellipse(g,11,11,4,4,c);
  },
  javelin(g, c) {
    line(g,2,14,14,2,c,2); line(g,14,2,15,1,"#e0e4e8"); line(g,6,10,9,7,"#a87848",2);
  },
  shoe(g, c) {
    g.fillStyle = c;
    g.fillRect(3, 6, 6, 5);
    g.fillRect(3, 9, 11, 3);
    g.fillStyle = shade(c, 0.3);
    g.fillRect(4, 7, 3, 1);
    g.fillStyle = "#f4efe2";
    g.fillRect(3, 12, 11, 2);
    g.fillStyle = shade(c, -0.35);
    g.fillRect(9, 9, 1, 1), g.fillRect(11, 10, 1, 1);
  },
  wing(g, c) {
    SHAPES.shoe(g, c);
    g.fillStyle = "#ffffff";
    g.fillRect(1, 4, 3, 2), g.fillRect(0, 6, 4, 2), g.fillRect(2, 8, 2, 1);
  },
  sock(g, c) {
    g.fillStyle = c;
    g.fillRect(6, 2, 5, 9);
    g.fillRect(3, 9, 8, 4);
    g.fillStyle = "#f4efe2";
    g.fillRect(6, 2, 5, 2);
    g.fillRect(6, 6, 5, 1);
    g.fillStyle = shade(c, 0.3);
    g.fillRect(7, 8, 1, 1);
  },
  pouch(g, c) {
    ellipse(g, 8, 10, 5, 4, c);
    g.fillStyle = shade(c, -0.3);
    g.fillRect(6, 4, 4, 3);
    g.fillStyle = shade(c, 0.4);
    g.fillRect(5, 9, 2, 1);
    g.fillStyle = "#ffffff";
    g.fillRect(7, 2, 1, 1), g.fillRect(9, 3, 1, 1);
  },
  band(g, c) {
    g.fillStyle = c;
    g.fillRect(2, 6, 12, 5);
    g.fillStyle = shade(c, 0.35);
    g.fillRect(2, 6, 12, 1);
    g.fillStyle = shade(c, -0.25);
    g.fillRect(2, 10, 12, 1);
    g.fillRect(12, 11, 2, 3);
  },
  whistle(g, c) {
    ellipse(g, 9, 9, 4, 4, c);
    g.fillStyle = c;
    g.fillRect(2, 6, 7, 3);
    g.fillStyle = shade(c, 0.4);
    g.fillRect(3, 6, 4, 1);
    line(g, 10, 5, 13, 1, "#c84a40");
  },
  clover(g, c) {
    for (const [x, y] of [[5, 4], [10, 4], [5, 9], [10, 9]]) ellipse(g, x, y, 3, 3, c);
    ellipse(g, 7, 7, 2, 2, shade(c, 0.3));
    line(g, 8, 10, 10, 15, shade(c, -0.3));
  },
  megaphone(g, c) {
    g.fillStyle = c;
    for (let i = 0; i < 9; i++) g.fillRect(3 + i, 7 - Math.floor(i / 2), 1, 3 + Math.floor(i / 2) * 2);
    g.fillStyle = shade(c, -0.3);
    g.fillRect(2, 8, 2, 4);
    g.fillStyle = "#ffffff";
    g.fillRect(13, 4, 1, 1), g.fillRect(14, 7, 1, 1), g.fillRect(13, 10, 1, 1);
  },
  medal(g, c) {
    line(g, 5, 1, 8, 7, "#c84a40", 2);
    line(g, 11, 1, 8, 7, "#3a6ac0", 2);
    ellipse(g, 8, 11, 4, 4, c);
    g.fillStyle = shade(c, 0.45);
    g.fillRect(7, 9, 2, 2);
  },
  star(g, c) {
    g.fillStyle = c;
    g.fillRect(7, 1, 2, 14);
    g.fillRect(1, 7, 14, 2);
    g.fillRect(5, 5, 6, 6);
    g.fillStyle = shade(c, 0.5);
    g.fillRect(7, 6, 2, 2);
  },
  bottle(g, c) {
    g.fillStyle = c;
    g.fillRect(5, 5, 6, 10);
    g.fillStyle = "#f4efe2";
    g.fillRect(6, 2, 4, 3);
    g.fillRect(5, 8, 6, 3);
    g.fillStyle = shade(c, 0.35);
    g.fillRect(6, 11, 1, 3);
    g.fillStyle = shade(c, -0.3);
    g.fillRect(6, 9, 4, 1);
  },
  cake(g, c) {
    g.fillStyle = "#f4e2c0";
    g.fillRect(2, 8, 12, 6);
    g.fillStyle = c;
    g.fillRect(2, 7, 12, 3);
    g.fillRect(3, 10, 1, 2), g.fillRect(8, 10, 1, 1), g.fillRect(12, 10, 1, 2);
    g.fillStyle = "#e05040";
    g.fillRect(7, 4, 2, 3);
    g.fillStyle = shade("#f4e2c0", -0.2);
    g.fillRect(2, 13, 12, 1);
  },
  book(g, c) {
    g.fillStyle = c;
    g.fillRect(3, 2, 10, 12);
    g.fillStyle = "#f4efe2";
    g.fillRect(4, 12, 9, 2);
    g.fillStyle = shade(c, -0.35);
    g.fillRect(3, 2, 2, 12);
    g.fillStyle = shade(c, 0.45);
    g.fillRect(7, 5, 4, 1), g.fillRect(7, 7, 3, 1);
  },
  ladder(g, c) {
    g.fillStyle = c;
    g.fillRect(3, 1, 2, 14), g.fillRect(11, 1, 2, 14);
    for (let y = 3; y < 15; y += 3) g.fillRect(5, y, 6, 1);
  },
  puzzle(g, c) {
    g.fillStyle = c;
    g.fillRect(3, 4, 10, 10);
    ellipse(g, 8, 4, 2, 2, c);
    ellipse(g, 13, 9, 2, 2, c);
    g.fillStyle = shade(c, 0.35);
    g.fillRect(4, 5, 3, 1);
  },
  tub(g, c) {
    g.fillStyle = "#e8eef2";
    g.fillRect(2, 7, 12, 6);
    g.fillStyle = c;
    g.fillRect(3, 7, 10, 2);
    g.fillStyle = "#ffffff";
    g.fillRect(5, 3, 1, 3), g.fillRect(9, 2, 1, 4);
    g.fillStyle = "#9aa4aa";
    g.fillRect(3, 13, 2, 2), g.fillRect(11, 13, 2, 2);
  },
  scroll(g, c) {
    g.fillStyle = c;
    g.fillRect(4, 3, 8, 10);
    g.fillStyle = shade(c, -0.3);
    g.fillRect(3, 2, 10, 2), g.fillRect(3, 12, 10, 2);
    g.fillStyle = "#c84a40";
    g.fillRect(6, 6, 4, 1), g.fillRect(6, 8, 3, 1);
  },
  letter(g, c) {
    g.fillStyle = c;
    g.fillRect(2, 4, 12, 9);
    line(g, 2, 4, 8, 9, shade(c, -0.3));
    line(g, 14, 4, 8, 9, shade(c, -0.3));
    ellipse(g, 8, 10, 2, 2, "#c84a40");
  },
  elixir(g, c) {
    ellipse(g, 8, 10, 5, 5, c);
    g.fillStyle = "#e8f4f8";
    g.fillRect(6, 2, 4, 4);
    g.fillStyle = shade(c, 0.5);
    g.fillRect(5, 8, 2, 2);
    g.fillStyle = "#ffffff";
    g.fillRect(9, 11, 1, 1);
  },
};
const cache = new Map();
export function iconCanvas(shape, color) {
  const key = shape + color;
  if (cache.has(key)) return cache.get(key);
  const base = canvas(16, 16);
  (SHAPES[shape] || SHAPES.star)(base.getContext("2d"), color);
  const out = outlined(base);
  cache.set(key, out);
  return out;
}
export const itemIcon = (id) => iconCanvas(ITEMS[id]?.icon || "star", ITEMS[id]?.color || "#f2c94c");
export function paintIcon(cv, id) {
  const g = cv.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, cv.width, cv.height);
  g.drawImage(itemIcon(id), 0, 0, cv.width, cv.height);
}
