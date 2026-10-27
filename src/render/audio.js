// Tiny synthesized sound effects. Nothing plays until the first user gesture.
let ctx = null,
  enabled = true;
export const setSound = (on) => (enabled = on);
export function unlockAudio() {
  if (ctx || typeof AudioContext === "undefined") return;
  try {
    ctx = new AudioContext();
  } catch {
    ctx = null;
  }
}
function tone(freq, start, dur, type = "square", vol = 0.05, slide = 0) {
  const o = ctx.createOscillator(),
    g = ctx.createGain(),
    t = ctx.currentTime + start;
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}
function noise(start, dur, vol = 0.04, filter = 900) {
  const len = Math.floor(ctx.sampleRate * dur),
    buf = ctx.createBuffer(1, len, ctx.sampleRate),
    d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(),
    f = ctx.createBiquadFilter(),
    g = ctx.createGain();
  f.type = "bandpass";
  f.frequency.value = filter;
  g.gain.value = vol;
  src.buffer = buf;
  src.connect(f).connect(g).connect(ctx.destination);
  src.start(ctx.currentTime + start);
}
const SFX = {
  tap: () => tone(660, 0, 0.05, "square", 0.025),
  whistle: () => (tone(2093, 0, 0.09, "square", 0.022), tone(2093, 0.13, 0.26, "square", 0.022, 2350)),
  stamp: () => (noise(0, 0.08, 0.05, 500), tone(784, 0.02, 0.1, "square", 0.03)),
  coin: () => (tone(988, 0, 0.06, "square", 0.03), tone(1319, 0.06, 0.12, "square", 0.03)),
  level: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.12, "square", 0.035)),
  goal: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.08, 0.16, "triangle", 0.05)),
  combo: () => [523, 784, 659, 1047, 1319].forEach((f, i) => tone(f, i * 0.06, 0.14, "square", 0.035)),
  build: () => (noise(0, 0.15, 0.05, 400), tone(392, 0.1, 0.1, "square", 0.03), tone(523, 0.2, 0.15, "square", 0.03)),
  whoosh: () => noise(0, 0.35, 0.05, 1600),
  land: () => (noise(0, 0.12, 0.06, 300), tone(110, 0, 0.12, "triangle", 0.06)),
  foul: () => (tone(220, 0, 0.18, "sawtooth", 0.04), tone(165, 0.18, 0.25, "sawtooth", 0.04)),
  cheer: () => (noise(0, 0.9, 0.05, 1200), noise(0.1, 0.8, 0.03, 2400)),
  skill: () => (tone(440, 0, 0.3, "sawtooth", 0.03, 440), tone(880, 0.25, 0.25, "square", 0.03)),
  win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.2, "square", 0.04)),
  lose: () => [392, 349, 330, 262].forEach((f, i) => tone(f, i * 0.16, 0.22, "triangle", 0.05)),
  event: () => (tone(660, 0, 0.1, "triangle", 0.05), tone(880, 0.1, 0.15, "triangle", 0.05)),
};
export function sfx(name) {
  if (!enabled || !ctx || !SFX[name]) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  try {
    SFX[name]();
  } catch {}
}
