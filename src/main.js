import { mayRestart } from "./platform/update-policy.js";
import { GAME_VERSION, updateStatus, hasPendingUpdate, checkForUpdates, applyPendingUpdate, markGameHealthy } from "./platform/updates.js";
import "./styles.css";
import * as G from "./domain/game.js";
import { ITEMS, SKILLS, FACILITIES, LEAGUES, PLANS, RANKS, SECRETS, CLUB_PALETTES, EVENTS, COMBOS, HELPER } from "./game-content.js";
import * as P from "./ui/pages.js";
import { createWorld } from "./render/world.js";
import { createStadium, beatDuration, CUTIN_MS } from "./render/stadium.js";
import { portrait as paintPortrait } from "./render/sprites.js";
import { paintIcon } from "./render/icons.js";
import { drawFacility } from "./render/buildings.js";
import { canvas as makeCanvas } from "./render/pixel.js";
import { sfx, unlockAudio, setSound } from "./render/audio.js";
import { createPersistence } from "./platform/persistence.js";
import { exportBackup } from "./platform/backups.js";
import { initNative } from "./platform/native.js";
import { validateCampaign, exportCampaign } from "./domain/campaign-save.js";

const $ = (q) => document.querySelector(q);
const { esc, cash } = P;
const store = await createPersistence("ring-sector-leagues-v3");
let state = store.read() ? validateCampaign(JSON.parse(store.read())) : G.newGame();
let saveEnabled = false;
const view = { page: "home", athlete: null, tab: "stats", plot: -1, moving: null, shopTab: "shop", playing: false, rival: null, meetSpeed: 1, sig: false, meter: null, skipConfirm: false, hide: null };
const DAY_MS = [0, 2600, 1400, 700];
const world = createWorld($("#world")),
  stadium = createStadium($("#stadium"));
let presenter = null,
  lastDayAt = 0,
  lastFrame = 0,
  dirty = false;
setSound(state.settings.sound);
// Match the canvases' logical height to their frame so the scene fills it.
new ResizeObserver(([entry]) => {
  const { width, height } = entry.contentRect;
  if (!width || !height) return;
  const logical = Math.max(270, Math.min(360, Math.round((480 * height) / width)));
  for (const c of [$("#world"), $("#stadium")]) if (c.height !== logical * 2) c.height = logical * 2;
}).observe($(".canvas-wrap"));

function save() {
  if (!saveEnabled) return;
  try {
    store.write(JSON.stringify(state));
  } catch {
    toast("Could not save. Export a backup from the Club office.", "warn");
  }
}
const reduced = () => state.settings.reducedMotion || matchMedia("(prefers-reduced-motion: reduce)").matches;

// ── Toasts ──────────────────────────────────────────────────────────────
function toast(text, kind = "info") {
  const box = $("#toasts"),
    el = document.createElement("div");
  el.className = "toast " + kind;
  el.textContent = text;
  box.append(el);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => el.classList.add("out"), 3000);
  setTimeout(() => el.remove(), 3500);
}
// Report what an action changed: goals, discoveries and other headline moments.
function announce(before) {
  for (const id of state.goals.slice(before.goals)) {
    const g = G.GOALS.find((x) => x.id === id);
    toast("🎯 Goal complete: " + g.name + " · " + G.rewardText(g.reward), "goal");
    sfx("goal");
  }
  for (const key of state.discovered.slice(before.discovered)) {
    const c = COMBOS.find((x) => x.key === key);
    world.banner("COMBO!", c.name.toUpperCase() + " · " + c.desc.toUpperCase());
    toast("✦ Combo discovered: " + c.name + " — " + c.desc, "combo");
    sfx("combo");
  }
}
const snapshot = () => ({ goals: state.goals.length, discovered: state.discovered.length });

// ── Rendering ───────────────────────────────────────────────────────────
function header() {
  const L = LEAGUES[state.league];
  $("#topbar").innerHTML = `<div class="brand"><span class="crest home" style="--p:${state.colors.primary};--s:${state.colors.secondary}">${esc(state.clubName[0])}</span><span><strong>${esc(state.clubName)}</strong><small>${L.name.toUpperCase()}</small></span></div>
  <div class="date"><b>Season ${state.season}</b><small>Week ${Math.ceil(state.day / 7)} · Day ${state.day}</small></div>
  <div class="resource fans" title="Fans"><small>FANS</small><b>♥ ${state.fans.toLocaleString()}</b></div>
  <div class="resource money" title="Club funds"><small>FUNDS</small><b>${cash(state.money)}</b></div>
  <button class="icon-button" data-act="fullscreen" aria-label="Full screen">⛶</button><button class="icon-button" data-act="help" aria-label="How to play">?</button>`;
}
function navigation() {
  const items = [
    ["home", "⌂", "Club"],
    ["squad", "♟", "Squad"],
    ["grounds", "▦", "Grounds"],
    ["shop", "🛍", "Shop"],
    ["league", "⚑", "League"],
    ["club", "✦", "Office"],
  ];
  const badge = (id) => {
    if (id === "squad" && state.roster.some((a) => !G.promoteProblem(state, a) || (a.sp > 0 && Object.keys(SKILLS).some((k) => G.skillAvailable(a, k) && SKILLS[k].sp <= a.sp && SKILLS[k].rank <= a.rank)))) return "<i class='dot-badge'></i>";
    if (id === "shop" && state.saleDay === state.day) return "<i class='dot-badge'></i>";
    return "";
  };
  $("#navigation").innerHTML = state.match
    ? `<span class="quiet">${state.match.phase === "complete" ? "Full time · rewards are saved" : "Live meet · progress saves after every throw"}</span>`
    : items.map(([id, ic, name]) => `<button class="nav-item ${view.page === id || (view.page === "recruit" && id === "squad") || (view.page === "lobby" && id === "home") ? "active" : ""}" data-act="page" data-page="${id}"><span aria-hidden="true">${ic}</span><em>${name}</em>${badge(id)}</button>`).join("");
}
function scene() {
  const m = state.match;
  $("#world").hidden = !!m;
  $("#stadium").hidden = !m;
  $("#scene").classList.toggle("meeting", !!m);
  if (m) {
    $("#sceneLabel").innerHTML = `<span class="eyebrow">${m.kind === "final" ? "LEAGUE FINAL" : "CLUB DUEL"} · ${esc(LEAGUES[state.league].venue)}</span><strong>${esc(state.clubName)} <em>vs</em> ${esc(m.name)}</strong>`;
    $("#sceneFoot").innerHTML = `<span class="ticker">${esc(beatText(presenter?.beat || m.last))}</span>`;
    return;
  }
  const days = state.matchDay - state.day,
    speed = view.playing ? state.settings.speed : 0;
  $("#sceneLabel").innerHTML = `<span class="eyebrow">YOUR GROUNDS</span><strong>${esc(LEAGUES[state.league].venue)}</strong><span class="next">${state.phase === "seasonEnd" ? "Season complete" : days <= 0 ? "⚑ Meet day!" : "Next meet in " + days + (days === 1 ? " day" : " days")}</span>`;
  $("#sceneFoot").innerHTML = `<div class="seg time">${["❚❚", "▶", "▶▶", "▶▶▶"].map((l, i) => `<button class="${speed === i ? "active" : ""}" data-act="speed" data-speed="${i}" aria-label="${i ? "Speed " + i : "Pause"}" ${state.phase !== "season" || days <= 0 ? "disabled" : ""}>${l}</button>`).join("")}</div><span class="ticker ${state.log[0]?.kind || ""}">${esc(state.log[0]?.text || "")}</span>`;
}
function beatText(b) {
  if (!b) return "The crowd settles in…";
  const m = state.match;
  if (b.type === "throw") return (b.side === "home" ? "" : m.name + " · ") + b.name + (view.hide ? " is throwing…" : b.mark == null ? " fouls." : " throws " + b.mark.toFixed(2) + " m" + (b.newPb ? " · NEW PB!" : ""));
  if (b.type === "eventStart") return EVENTS[b.event].name + " is up.";
  if (b.type === "eventEnd") return EVENTS[b.event].name + ": " + (b.h === 3 ? "event to us!" : b.a === 3 ? "event to " + m.name + "." : "shared.") + " " + b.score + "–" + b.against;
  if (b.type === "decide") return b.clutch ? "Clutch moment! Your call." : "Choose the approach.";
  if (b.type === "complete") return b.win ? "Victory!" : b.draw ? "A draw." : "Defeat.";
  return "Welcome to the meet!";
}
function panelHTML() {
  if (state.match) return P.match(state, view);
  switch (view.page) {
    case "squad":
      return P.squad(state, view);
    case "recruit":
      return P.recruit(state, view);
    case "grounds":
      return P.grounds(state, view);
    case "shop":
      return P.shop(state, view);
    case "league":
      return P.league(state, view);
    case "club":
      return P.club(state, { version: GAME_VERSION, status: updateStatus(), pending: hasPendingUpdate() });
    case "lobby":
      return P.lobby(state, view);
    default:
      return P.home(state, view);
  }
}
function render(preserve = true) {
  const panel = $("#panel"),
    scroll = preserve ? panel.scrollTop : 0;
  header();
  scene();
  navigation();
  panel.innerHTML = panelHTML();
  panel.scrollTop = scroll;
  quickAction();
  paint(panel);
  dirty = false;
}
// Re-render without closing a dropdown the player is using.
function refresh() {
  header();
  scene();
  const focus = document.activeElement;
  if (focus && $("#panel").contains(focus) && ["SELECT", "INPUT"].includes(focus.tagName)) {
    dirty = true;
    return;
  }
  render();
}
function quickAction() {
  const shell = $("#quickAction");
  shell.innerHTML = "";
  const want = state.match
    ? state.match.phase === "complete"
      ? ["leave"]
      : view.meter
        ? ["release"]
        : []
    : view.page === "home"
      ? state.phase === "seasonEnd"
        ? ["season"]
        : ["lobby", "play", "pause"]
      : view.page === "lobby"
        ? ["enter"]
        : [];
  for (const act of want) {
    const el = $("#panel").querySelector(`[data-act="${act}"]`);
    if (el) shell.append(el);
  }
  shell.hidden = !shell.children.length;
  $("#panelShell").classList.toggle("has-actions", !shell.hidden);
}
const buildingCache = new Map();
function buildingImage(key) {
  if (buildingCache.has(key + state.colors.primary)) return buildingCache.get(key + state.colors.primary);
  const [type, level] = key.split(":"),
    c = makeCanvas(104, 66),
    g = c.getContext("2d");
  drawFacility(g, type, +level, 0, 6, { season: 1, colors: state.colors });
  buildingCache.set(key + state.colors.primary, c);
  return c;
}
function athleteById(id) {
  return state.roster.find((a) => a.id === id) || state.prospects.find((a) => a.id === id) || state.pendingEvent?.data?.athlete;
}
function paint(root) {
  root.querySelectorAll("canvas[data-portrait]").forEach((c) => {
    const a = athleteById(+c.dataset.portrait);
    if (a) paintPortrait(c, a, state.colors);
  });
  root.querySelectorAll("canvas[data-rival]").forEach((c) => {
    const [club, i] = c.dataset.rival.split(":").map(Number),
      cl = state.clubs.find((x) => x.id === club);
    if (cl) paintPortrait(c, cl.athletes[i], { primary: cl.color, secondary: "#f4efe2" });
  });
  root.querySelectorAll("canvas[data-icon]").forEach((c) => paintIcon(c, c.dataset.icon));
  root.querySelectorAll("canvas[data-building]").forEach((c) => {
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(buildingImage(c.dataset.building), 0, 0, c.width, c.height);
  });
  root.querySelectorAll("canvas[data-secret]").forEach((c) => paintPortrait(c, { look: SECRETS[c.dataset.secret].look, rank: 4 }, state.colors, { face: "happy" }));
  root.querySelectorAll("canvas[data-helper]").forEach((c) => paintPortrait(c, { look: { skin: "#f0c6a0", hair: "#5a3a6a", style: 2 }, rank: 2 }, state.colors, { face: "happy" }));
}

// ── Dialogs ─────────────────────────────────────────────────────────────
function dialog(title, body, choices, o = {}) {
  const dlg = $("#dialog");
  dlg.innerHTML = `<div class="dialog-head">${o.helper ? `<canvas width="64" height="64" data-helper class="portrait helper"></canvas>` : ""}<div><span class="eyebrow">${esc(o.eyebrow || HELPER + ", club secretary")}</span><h1>${esc(title)}</h1></div></div><div class="dialog-body">${body}</div><div class="dialog-actions">${choices.map((c, i) => `<button class="button ${c.secondary ? "subtle" : "primary"}" data-choice="${i}" ${c.disabled ? "disabled" : ""}>${esc(c.label)}</button>`).join("")}</div>`;
  paint(dlg);
  dlg.querySelectorAll("[data-choice]").forEach(
    (b) =>
      (b.onclick = () => {
        sfx("tap");
        dlg.close();
        choices[+b.dataset.choice].fn?.();
      }),
  );
  dlg.dataset.locked = o.locked ? "1" : "";
  dlg.showModal();
}
$("#dialog").addEventListener("cancel", (e) => {
  if ($("#dialog").dataset.locked) e.preventDefault();
});
function showEvent() {
  const v = G.eventView(state);
  if (!v || $("#dialog").open) return;
  stopPlaying();
  sfx("event");
  const a = state.pendingEvent.data?.athlete,
    secret = v.id === "secret" && SECRETS[state.pendingEvent.data.key];
  dialog(
    v.title,
    `${secret ? `<div class="event-athlete"><canvas class="portrait large" width="96" height="96" data-secret="${state.pendingEvent.data.key}"></canvas><span><strong>${esc(secret.name)}</strong><small>${EVENTS[secret.event].name} · ★ ${esc(SKILLS[secret.skill].name)}: ${esc(SKILLS[secret.skill].desc)}</small></span></div>` : ""}${a ? `<div class="event-athlete">${P.portrait(a)}<span><strong>${esc(a.name)}</strong><small>${EVENTS[a.event].name} · potential ${Math.round(a.potential * 10)}</small></span></div>` : ""}<p>${esc(v.text)}</p>`,
    v.choices.map((c, i) => ({
      label: c.label,
      disabled: !c.ok,
      secondary: i > 0,
      fn: () => {
        const before = snapshot();
        const msg = G.resolveEvent(state, i);
        if (msg) toast(msg, state.pendingEvent ? "info" : "story");
        if (state.pendingEvent?.id === "secret" || v.id === "secret") sfx("level");
        announce(before);
        save();
        render();
      },
    })),
    { helper: true, locked: true, eyebrow: v.id === "secret" ? "★ SECRET CHARACTER" : HELPER + " has news" },
  );
}
function chooseAthlete(title, item, fn) {
  const d = ITEMS[item];
  dialog(
    title,
    `<p>${esc(d.desc)}</p><div class="pick-list">${state.roster.map((a) => `<button class="pick" data-pick="${a.id}">${P.portrait(a)}<span><strong>${esc(a.name)}</strong><small>${EVENTS[a.event].short} · ⚡${Math.round(a.stamina)} · ${G.MOODS[G.moodOf(a)]}${d.slot && a.gear[d.slot] ? " · wearing " + esc(ITEMS[a.gear[d.slot]].name) : ""}</small></span></button>`).join("")}</div>`,
    [{ label: "Cancel", secondary: true }],
    { eyebrow: d.name },
  );
  $("#dialog").querySelectorAll("[data-pick]").forEach(
    (b) =>
      (b.onclick = () => {
        $("#dialog").close();
        fn(+b.dataset.pick);
      }),
  );
}
function help(welcome = false) {
  stopPlaying();
  dialog(
    welcome ? "Welcome home, Coach!" : "How to play",
    `<p>${welcome ? "I'm " + HELPER + ", the club secretary. We're a tiny throwing club with four hopefuls and big dreams. Here's how it works:" : "A quick refresher:"}</p>
    <ol><li><b>Train.</b> Press ▶ and the days roll by. Each athlete trains at the facility for their plan; watch the numbers pop.</li>
    <li><b>Build.</b> Put facilities on the grounds. Neighbours can form <b>combos</b>. Cafés and merch stands earn money from visitors.</li>
    <li><b>Grow.</b> Levels give skill points for skills. Rank up athletes to raise their caps. Items and gear help too.</li>
    <li><b>Compete.</b> Meets are four head-to-head events. Watch the drama, or coach every throw. Win the league final to move up.</li></ol>
    <p>Goals, secret characters and surprise visitors are waiting along the way. Time only moves when you press play.</p>`,
    [{ label: welcome ? "Let's go!" : "Got it", fn: () => ((state.welcomed = true), save()) }],
    { helper: true },
  );
}

// ── Time ────────────────────────────────────────────────────────────────
function stopPlaying() {
  if (!view.playing) return;
  view.playing = false;
  refresh();
}
function play(speed = state.settings.speed || 1) {
  if (state.match || state.phase !== "season" || state.day >= state.matchDay) return;
  if (state.pendingEvent) return showEvent();
  state.settings.speed = speed;
  view.playing = true;
  lastDayAt = performance.now() - DAY_MS[speed] * 0.6;
  render();
}
function doDay(now) {
  if (state.pendingEvent) {
    showEvent();
    return;
  }
  const before = snapshot();
  const r = G.advanceDay(state);
  if (!r.ok) {
    stopPlaying();
    return;
  }
  lastDayAt = now;
  world.onDay(state, r, now, view.playing ? DAY_MS[state.settings.speed] : 1600);
  if (r.spend.length) setTimeout(() => sfx("coin"), 600);
  for (const l of r.levelUps) {
    toast("⬆ " + l.name + " reached level " + l.level + "! Skill points to spend.", "level");
    sfx("level");
  }
  for (const id of r.injuries) toast("🩹 " + state.roster.find((a) => a.id === id)?.name + " is injured.", "warn");
  announce(before);
  save();
  if (state.day >= state.matchDay) {
    view.playing = false;
    world.banner("MEET DAY!", "VS " + G.opponent(state)?.name.toUpperCase(), "#f2c94c", now);
    sfx("event");
  }
  refresh();
  if (r.event) setTimeout(showEvent, 500);
}

// ── Meet presentation ───────────────────────────────────────────────────
function startBeat(beat) {
  presenter = { beat, el: 0, base: beatDuration(beat), cues: [] };
  const cue = (at, fn) => presenter.cues.push({ at, fn });
  if (beat.type === "throw") {
    view.hide = { side: beat.side, eventIndex: beat.eventIndex, attempt: beat.attempt };
    const cut = beat.activations.length ? CUTIN_MS : 0;
    if (cut) cue(0, () => sfx("skill"));
    cue(cut + 1000, () => sfx("whoosh"));
    cue(cut + 1900, () => {
      view.hide = null;
      sfx(beat.mark == null ? "foul" : "land");
      if (beat.side === "home" && beat.mark != null && (beat.newPb || beat.leading)) sfx("cheer");
      render();
    });
  } else if (beat.type === "eventEnd") sfx(beat.h === 3 ? "cheer" : "event");
  else if (beat.type === "eventStart") sfx("event");
  else if (beat.type === "meetStart") sfx("cheer");
  else if (beat.type === "complete") {
    sfx(beat.win ? "win" : beat.draw ? "event" : "lose");
    const r = state.match.rewards;
    for (const id of r?.goals || []) toast("🎯 Goal complete: " + G.GOALS.find((g) => g.id === id)?.name, "goal");
  }
  render();
}
function pumpMeet(dt) {
  const m = state.match;
  if (!m) return;
  if (presenter) {
    presenter.el += dt * view.meetSpeed;
    for (const c of presenter.cues) if (!c.done && presenter.el >= c.at) (c.done = true), c.fn();
    if (presenter.el < presenter.base) return;
  }
  if ($("#dialog").open || m.phase === "decide" || m.phase === "complete") return;
  const beat = G.advanceMatch(state);
  save();
  if (beat) startBeat(beat);
}
function decide(tactic, quality = "good") {
  const beat = G.decideThrow(state, tactic, quality, view.sig);
  view.sig = false;
  view.meter = null;
  if (beat) {
    save();
    startBeat(beat);
  }
}
const meter = { start: 0 };
const meterPos = (now) => {
  const p = ((now - meter.start) / 1500) % 2;
  return p <= 1 ? p : 2 - p;
};

// ── Input ───────────────────────────────────────────────────────────────
function navigate(page) {
  if (state.match) return;
  view.page = page;
  view.athlete = null;
  view.moving = null;
  if (page !== "grounds") view.plot = -1;
  render(false);
}
$("#app").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-act]");
  if (!b || b.disabled) return;
  unlockAudio();
  const act = b.dataset.act,
    id = +b.dataset.id,
    before = snapshot();
  if (act !== "skip") view.skipConfirm = false;
  if (!["release", "tactic"].includes(act)) sfx("tap");
  switch (act) {
    case "page":
      return navigate(b.dataset.page);
    case "help":
      return help();
    case "fullscreen":
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen({ navigationUI: "hide" });
      } catch {
        toast("Full screen is unavailable here. The Android app opens full screen.");
      }
      return;
    case "play":
      return play();
    case "pause":
      return stopPlaying(), render();
    case "speed":
      return +b.dataset.speed ? play(+b.dataset.speed) : (stopPlaying(), render());
    case "day":
      if (state.pendingEvent) return showEvent();
      doDay(performance.now());
      return;
    case "lobby":
      stopPlaying();
      if (G.lineupProblem(state)) G.autoLineup(state);
      return navigate("lobby");
    case "autolineup":
      G.autoLineup(state);
      toast("Best available lineup selected.");
      break;
    case "medical":
      if (!G.medicalDay(state)) toast("Only available when an injured athlete is in the lineup.");
      break;
    case "enter":
      if (state.pendingEvent) return showEvent();
      if (!G.startMatch(state)) {
        toast(G.lineupProblem(state) || "The meet can't start yet.", "warn");
        break;
      }
      presenter = null;
      view.hide = null;
      view.meter = null;
      break;
    case "meet-mode":
      state.settings.meetMode = b.dataset.value;
      break;
    case "meet-speed":
      view.meetSpeed = +b.dataset.speed;
      break;
    case "tactic":
      if (state.match?.phase !== "decide") return;
      sfx("tap");
      if (state.settings.manualRelease) {
        view.meter = { tactic: b.dataset.value };
        meter.start = performance.now();
        render();
        return;
      }
      return decide(b.dataset.value);
    case "release": {
      if (!view.meter) return;
      const p = meterPos(performance.now()),
        a = G.homeAthlete(state),
        half = G.effects(state, a).perfect ? 0.11 : 0.07;
      const off = Math.abs(p - 0.62);
      return decide(view.meter.tactic, off < half ? "perfect" : off < 0.2 ? "good" : "poor");
    }
    case "skip":
      if (!view.skipConfirm) {
        view.skipConfirm = true;
        break;
      }
      G.simulateMatch(state);
      presenter = null;
      view.hide = null;
      view.meter = null;
      view.skipConfirm = false;
      sfx(state.match.score > state.match.against ? "win" : "event");
      break;
    case "leave":
      G.leaveMatch(state);
      presenter = null;
      view.page = "home";
      world.reset();
      if (state.phase === "seasonEnd") sfx(state.champion ? "win" : "event");
      break;
    case "season":
    case "defend": {
      const promoted = state.champion && act === "season" && state.league < 4;
      G.nextSeason(state, act === "defend");
      view.page = "home";
      if (promoted) setTimeout(() => world.banner(LEAGUES[state.league].name.toUpperCase(), "NEW RIVALS · NEW PLOTS", "#f2c94c"), 300);
      break;
    }
    case "athlete":
      stopPlaying();
      view.page = "squad";
      view.athlete = id;
      view.tab = "stats";
      return render(false);
    case "back-squad":
      view.athlete = null;
      return render(false);
    case "tab":
      view.tab = b.dataset.tab;
      return render(false);
    case "plan": {
      const a = state.roster.find((x) => x.id === id);
      if (a && PLANS[b.dataset.value]) a.plan = b.dataset.value;
      world.replan();
      break;
    }
    case "learn":
      if (G.learnSkill(state, id, b.dataset.skill)) {
        toast("✦ Learned " + SKILLS[b.dataset.skill].name + "!", "level");
        sfx("level");
      }
      break;
    case "skill-toggle":
      if (!G.toggleSkill(state, id, b.dataset.skill)) toast("All skill slots are full. Unequip one first.");
      break;
    case "promote": {
      const a = state.roster.find((x) => x.id === id);
      if (G.promote(state, id)) {
        sfx("goal");
        dialog("A new " + RANKS[a.rank].name + "!", `<div class="promo">${P.portrait(a, "large")}<p><b>${esc(a.name)}</b> is now a <b>${RANKS[a.rank].name}</b>. Stat cap raised, +10 to every stat${RANKS[a.rank].slots > RANKS[a.rank - 1].slots ? " and a new skill slot" : ""}.</p></div>`, [{ label: "Wonderful!" }], { eyebrow: "PROMOTION" });
      }
      break;
    }
    case "gear-on":
      G.equipItem(state, id, b.dataset.item);
      break;
    case "gear-off":
      G.unequipItem(state, id, b.dataset.slot);
      break;
    case "use": {
      const item = b.dataset.item,
        d = ITEMS[item];
      const apply = (aid) => {
        const snap = snapshot();
        if (G.useItem(state, item, aid)) {
          toast("Used " + d.name + (aid ? " on " + state.roster.find((x) => x.id === aid)?.name : "") + ".", "level");
          sfx("level");
        } else toast("That item won't help right now.");
        announce(snap);
        save();
        render();
      };
      if (d.team) apply();
      else if (b.dataset.id) apply(+b.dataset.id);
      else chooseAthlete("Use " + d.name + " on…", item, apply);
      return;
    }
    case "equip": {
      const item = b.dataset.item;
      chooseAthlete("Equip " + ITEMS[item].name + "…", item, (aid) => {
        if (G.equipItem(state, aid, item)) toast(ITEMS[item].name + " equipped.");
        save();
        render();
      });
      return;
    }
    case "buy":
      if (G.buyItem(state, b.dataset.item)) {
        toast("Bought " + ITEMS[b.dataset.item].name + ". It's in the bag.");
        sfx("coin");
      }
      break;
    case "forge":
      if (G.forgeItem(state, b.dataset.item)) {
        toast("🔨 " + ITEMS[b.dataset.item].name + " forged to +" + state.forge[b.dataset.item] + ".", "level");
        sfx("build");
      }
      break;
    case "shop-tab":
      view.shopTab = b.dataset.tab;
      return render(false);
    case "plot": {
      const i = +b.dataset.index;
      if (view.moving != null) {
        const moved = G.moveFacility(state, view.moving, i);
        if (moved) world.flashPlot(i, "MOVED");
        view.moving = null;
      }
      view.plot = i;
      break;
    }
    case "build": {
      const i = +b.dataset.index,
        type = b.dataset.type;
      if (G.build(state, i, type)) {
        world.flashPlot(i, "BUILT!");
        sfx("build");
        toast("The " + FACILITIES[type].name + " is open!");
      }
      break;
    }
    case "upgrade": {
      const i = +b.dataset.index;
      if (G.upgrade(state, i)) {
        world.flashPlot(i, "LEVEL " + state.plots[i].level + "!");
        sfx("build");
      }
      break;
    }
    case "move":
      view.moving = view.moving === +b.dataset.index ? null : +b.dataset.index;
      break;
    case "sell": {
      const i = +b.dataset.index,
        name = FACILITIES[state.plots[i].type].name;
      dialog("Clear this plot?", `<p>Remove the ${esc(name)} for a ${cash(FACILITIES[state.plots[i].type].cost / 2)} refund? Its upgrades are lost.</p>`, [
        { label: "Clear it", fn: () => (G.sellFacility(state, i), save(), render()) },
        { label: "Keep it", secondary: true },
      ]);
      return;
    }
    case "scout":
      if (G.scout(state)) sfx("coin");
      break;
    case "recruit":
      if (G.recruit(state, id)) {
        toast("Welcome to the club!", "level");
        sfx("level");
      }
      break;
    case "sign-secret":
      if (G.signSecret(state, b.dataset.key)) {
        toast("★ " + SECRETS[b.dataset.key].name + " joined the club!", "goal");
        sfx("goal");
      }
      break;
    case "release-contract": {
      const a = state.roster.find((x) => x.id === id);
      if (!a) return;
      dialog("A new chapter?", `<p>Release ${esc(a.name)}? Their gear returns to the bag and their marks stay in club history.</p>`, [
        { label: "Release contract", fn: () => (G.releaseAthlete(state, a.id), (view.athlete = null), save(), render()) },
        { label: "Keep them", secondary: true },
      ]);
      return;
    }
    case "rival":
      view.rival = view.rival === id ? null : id;
      break;
    case "sponsor":
      if (G.chooseSponsor(state, b.dataset.value)) toast("Signed with " + b.querySelector("strong").textContent + ".");
      break;
    case "palette":
      state.colors = { primary: CLUB_PALETTES[+b.dataset.index].primary, secondary: CLUB_PALETTES[+b.dataset.index].secondary };
      break;
    case "check-update":
      await checkForUpdates();
      break;
    case "apply-update":
      if (mayRestart(state, view.playing)) {
        save();
        await store.flush();
        await applyPendingUpdate();
      }
      return;
    case "export":
      await exportBackup(JSON.stringify(exportCampaign(state), null, 2)).catch(() => toast("Export failed. Please try again.", "warn"));
      return;
    case "import":
      return importSave();
  }
  announce(before);
  save();
  render();
});
$("#app").addEventListener("change", (e) => {
  const el = e.target,
    kind = el.dataset.change,
    a = state.roster.find((x) => x.id === +el.dataset.id);
  if (kind === "bulk" && PLANS[el.value]) state.roster.forEach((x) => (x.plan = el.value));
  if (kind === "plan" && a && PLANS[el.value]) a.plan = el.value;
  if (kind === "plan" || kind === "bulk") world.replan();
  if (kind === "autorest" && a) a.autoRest = el.checked;
  if (kind === "autotaper" && a) a.autoTaper = el.checked;
  if (kind === "lineup" && !G.assign(state, el.dataset.event, +el.value)) toast("An athlete can cover at most two events and must be healthy.", "warn");
  if (kind === "setting") {
    state.settings[el.dataset.key] = el.checked;
    setSound(state.settings.sound);
  }
  if (kind === "sig") view.sig = el.checked;
  save();
  el.blur();
  render();
});
$("#app").addEventListener("focusout", () => setTimeout(() => dirty && !$("#panel").contains(document.activeElement) && render(), 0));
$("#app").addEventListener("submit", (e) => {
  if (e.target.id !== "clubNameForm") return;
  e.preventDefault();
  state.clubName = new FormData(e.target).get("name").trim().slice(0, 24) || "Ring & Sector";
  save();
  render();
  toast("The club has a new name.");
});
function importSave() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.onchange = async () => {
    try {
      if (!input.files[0]) return;
      if (input.files[0].size > 3000000) throw Error("The save is too large.");
      const incoming = validateCampaign(JSON.parse(await input.files[0].text()));
      dialog("Restore this club?", `<p>${esc(incoming.clubName)} · Season ${incoming.season} · ${LEAGUES[incoming.league].name}</p><p>This replaces the current club. Export it first to keep it.</p>`, [
        {
          label: "Restore club",
          fn: () => {
            state = incoming;
            presenter = null;
            view.page = "home";
            view.athlete = null;
            world.reset();
            save();
            render(false);
            toast("Club restored.");
          },
        },
        { label: "Cancel", secondary: true },
      ]);
    } catch (error) {
      toast(error.message, "warn");
    }
  };
  input.click();
}
$("#world").addEventListener("pointerup", (e) => {
  if (state.match) return;
  const i = world.hit(e.clientX, e.clientY);
  if (i < 0) return;
  unlockAudio();
  sfx("tap");
  view.page = "grounds";
  view.athlete = null;
  if (view.moving != null) {
    const before = snapshot();
    if (G.moveFacility(state, view.moving, i)) world.flashPlot(i, "MOVED");
    view.moving = null;
    announce(before);
    save();
  }
  view.plot = i;
  render(false);
});
document.addEventListener("keydown", (e) => {
  if ($("#dialog").open || ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
  if (e.code === "Space") {
    e.preventDefault();
    if (view.meter) $('#app [data-act="release"]')?.click();
    else if (!state.match) view.playing ? (stopPlaying(), render()) : play();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    view.playing = false;
    view.meter = null;
    save();
  }
});
window.addEventListener("save-error", () => toast("Save failed. Export your club before leaving.", "warn"));
window.addEventListener("pagehide", save);
initNative({
  pause: () => {
    view.playing = false;
    view.meter = null;
    save();
    render();
  },
  back: () => {
    if ($("#dialog").open) {
      if (!$("#dialog").dataset.locked) $("#dialog").close();
      return true;
    }
    if (state.match) {
      toast("The meet is saved after every throw. Continue when you're ready.");
      return true;
    }
    if (view.athlete) {
      view.athlete = null;
      render(false);
      return true;
    }
    navigate("home");
    return true;
  },
}).catch(console.error);

function frame(now) {
  const dt = Math.min(100, now - (lastFrame || now));
  lastFrame = now;
  if (!document.hidden) {
    if (state.match) {
      pumpMeet(dt);
      stadium.draw(state, now, { beat: presenter?.beat || state.match.last, elapsed: presenter ? presenter.el : 1e9, reduced: reduced() });
      if (view.meter) {
        const n = $("#needle");
        if (n) n.style.left = meterPos(now) * 100 + "%";
      }
    } else {
      if (view.playing && now - lastDayAt >= DAY_MS[state.settings.speed]) doDay(now);
      const p = view.playing ? Math.min(1, (now - lastDayAt) / DAY_MS[state.settings.speed]) : 0.45;
      world.draw(state, now, { selected: view.page === "grounds" ? view.plot : -1, moving: view.moving, dayProgress: p });
    }
  }
  requestAnimationFrame(frame);
}
render(false);
await new Promise((resolve, reject) =>
  requestAnimationFrame((now) => {
    try {
      frame(now);
      resolve();
    } catch (error) {
      reject(error);
    }
  }),
);
$("#bootStatus").hidden = true;
await markGameHealthy();
saveEnabled = true;
if (!state.welcomed) help(true);
else if (state.pendingEvent) showEvent();
save();
checkForUpdates().catch(console.error);
