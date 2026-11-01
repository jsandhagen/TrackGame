import { canvas, outlined, shade } from "./pixel.js";
import { GLYPH_SIZE, GLYPH_PALETTE, ITEM_GLYPHS, drawGlyph } from "./glyphs.js";
import { ITEMS } from "../game-content.js";

export const ITEM_ICON_NAMES = Object.keys(ITEM_GLYPHS);
const cache = new Map();
export function iconCanvas(shape, color = "#f2c94c") {
  const key = shape + color;
  if (cache.has(key)) return cache.get(key);
  const base = canvas(GLYPH_SIZE, GLYPH_SIZE);
  drawGlyph(base.getContext("2d"), ITEM_GLYPHS[shape] || ITEM_GLYPHS.star, {
    ...GLYPH_PALETTE, '#': color, h: shade(color, 0.45), d: shade(color, -0.3),
  });
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
