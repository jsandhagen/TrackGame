import { canvas, outlined, shade } from "./pixel.js";
import { GLYPH_SIZE, GLYPH_PALETTE, UI_GLYPHS, drawGlyph } from "./glyphs.js";

export const ICON_NAMES = Object.keys(UI_GLYPHS);
const cache = new Map();
const MOOD_COLORS = ["#ce604e", "#da9854", "#e2bf57", "#a1bc65", "#62af7c"];
export function uiIconCanvas(name) {
  if (cache.has(name)) return cache.get(name);
  const base = canvas(GLYPH_SIZE, GLYPH_SIZE), mood = /^m[0-4]$/.test(name) ? Number(name[1]) : null;
  const palette = mood == null ? GLYPH_PALETTE : { ...GLYPH_PALETTE, '#': MOOD_COLORS[mood], h: shade(MOOD_COLORS[mood], 0.15), d: shade(MOOD_COLORS[mood], -0.2) };
  drawGlyph(base.getContext("2d"), UI_GLYPHS[name] || UI_GLYPHS.star, palette);
  const out = outlined(base);
  cache.set(name, out);
  return out;
}

let installed = false;
export function installIcons() {
  if (installed || typeof document === "undefined") return;
  installed = true;
  const style = document.createElement("style");
  style.dataset.pixelIcons = "";
  const urls = Object.fromEntries(ICON_NAMES.map(name => [name, `url(${uiIconCanvas(name).toDataURL()})`]));
  style.textContent = `:root{--glyph-check:${urls.check};--glyph-play:${urls.play}}\n` + ICON_NAMES.map(name => `.ico-${name}{background-image:${urls[name]}}`).join("\n");
  document.head.append(style);
}
export const ico = (name, cls = "") => `<i class="ico ico-${name} ${cls}" aria-hidden="true"></i>`;
export const moodIco = (mood) => ico("m" + mood, "mood");
