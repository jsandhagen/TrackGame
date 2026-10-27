import { mayRestart } from "./platform/update-policy.js";
import { GAME_VERSION, updateStatus, hasPendingUpdate, checkForUpdates, applyPendingUpdate, markGameHealthy } from "./platform/updates.js";
import "@fontsource/oswald/latin-500.css";
import "@fontsource/oswald/latin-700.css";
import "./styles.css";
import * as G from "./domain/game.js";
import { STAT_NAMES, trackColorOf, styleOf, ITEMS, SKILLS, FACILITIES, STADIUM, LEAGUES, PLANS, RANKS, SECRETS, CLUB_PALETTES, CUSTOMISE, EVENTS, COMBOS, HELPER } from "./game-content.js";
import * as P from "./ui/pages.js";
import { createWorld } from "./render/world.js";
import { createStadium, beatDuration, CUTIN_MS } from "./render/stadium.js";
import { playTraining } from "./render/training.js";
import { portrait as paintPortrait } from "./render/sprites.js";
import { paintIcon } from "./render/icons.js";
import { installIcons, ico } from "./render/uiicons.js";
import { drawFacility } from "./render/buildings.js";
import { canvas as makeCanvas } from "./render/pixel.js";
import { sfx, unlockAudio, setSound } from "./render/audio.js";
import { createPersistence } from "./platform/persistence.js";
import { exportBackup } from "./platform/backups.js";
import { initNative, isNativeApp, setOrientation, exitApp } from "./platform/native.js";
import { validateCampaign, exportCampaign } from "./domain/campaign-save.js";

installIcons();
const $ = (q) => document.querySelector(q);
const { esc, cash } = P;
const store = await createPersistence("ring-sector-leagues-v3");
let state = store.read() ? validateCampaign(JSON.parse(store.read())) : G.newGame();
let saveEnabled = false;
// window: which pop-up is open (null = just the club). selected: what is highlighted on the map.
const view = { window: null, athlete: null, tab: "stats", selected: null, moving: null, shopTab: "shop", playing: false, rival: null, meetSpeed: 1, sig: false, meter: null, skipConfirm: false, hide: null, dayP: 0.25 };
const DAY_MS = [0, 8000, 4000, 2000];
// How dark night gets at each speed, so the fastest speed doesn't strobe.
const NIGHT_AT_SPEED = [1, 1, 0.75, 0.4];
const world = createWorld($("#world")),
  stadium = createStadium($("#stadium"));
let shownInsights = null,
  insightBump = { n: 0, at: -1e9 };
let presenter = null,
  lastDayAt = 0,
  lastFrame = 0,
  dirty = false;
setSound(state.settings.sound);

function save() {
  if (!saveEnabled) return false;
  try {
    store.write(JSON.stringify(state));
    return true;
  } catch {
    toast("Could not save. Export a backup from the Office.", "warn");
    return false;
  }
}
const reduced = () => state.settings.reducedMotion || matchMedia("(prefers-reduced-motion: reduce)").matches;

// ── Toasts ──────────────────────────────────────────────────────────────
function toast(text, kind = "info", icon = null) {
  const box = $("#toasts"),
    el = document.createElement("div");
  el.className = "toast " + kind;
  el.innerHTML = (icon ? ico(icon) : "") + "<span>" + esc(text) + "</span>";
  box.append(el);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => el.classList.add("out"), 3000);
  setTimeout(() => el.remove(), 3500);
}
function announce(before) {
  for (const id of state.goals.slice(before.goals)) {
    const g = G.GOALS.find((x) => x.id === id);
    toast("Goal complete: " + g.name + " · " + G.rewardText(g.reward), "goal", "target");
    sfx("goal");
  }
  for (const key of state.discovered.slice(before.discovered)) {
    const c = COMBOS.find((x) => x.key === key);
    world.banner("COMBO!", c.name.toUpperCase() + " · " + c.desc.toUpperCase());
    toast("Combo discovered: " + c.name + " — " + c.desc, "combo", "spark");
    sfx("combo");
  }
}
const snapshot = () => ({ goals: state.goals.length, discovered: state.discovered.length });

// ── Rendering ───────────────────────────────────────────────────────────
function hud() {
  const m = state.match;
  if (m) {
    $("#hud").innerHTML = `${P.meetScore(state)}<button class="hud-btn" data-act="game-menu" aria-label="Open game menu"><span aria-hidden="true">☰</span></button>`;
    return;
  }
  const days = state.matchDay == null ? null : state.matchDay - state.day,
    speed = view.playing ? state.settings.speed : 0,
    canPlay = state.phase === "planning" || (state.phase === "season" && days > 0);
  // Insights earned since the last frame float up from the counter. A negative delay keeps the
  // animation smooth when the HUD is redrawn mid-bump.
  const insights = state.coaching.insights;
  if (shownInsights != null && insights > shownInsights) insightBump = { n: insights - shownInsights, at: performance.now() };
  shownInsights = insights;
  const since = performance.now() - insightBump.at,
    bump = since < 1400 ? `style="--since:-${Math.round(since)}ms"` : "";
  $("#hud").innerHTML = `<button class="brand" data-act="window" data-page="club"><span class="crest" style="--p:${state.colors.primary};--s:${state.colors.secondary}">${esc(state.clubName[0])}</span><span><strong>${esc(state.clubName)}</strong><small>${LEAGUES[state.league].name}</small></span></button>
  <button class="hud-date" data-act="window" data-page="calendar" title="${G.longDate(state.day)} · Season ${state.season} · ${G.WEATHER[G.weatherToday(state)].name}" aria-label="Calendar: ${G.longDate(state.day)}, ${G.WEATHER[G.weatherToday(state)].name}">${ico(G.WEATHER[G.weatherToday(state)].icon, "hud-weather")}<span><b><span class="date-text">${G.shortDate(state.day)} </span><span class="clock" id="clock">${G.clockLabel(view.dayP)}</span></b><small>${state.phase === "seasonEnd" ? "Season complete" : state.phase === "planning" ? "Off-season · book a meet" : days <= 0 ? "Meet day!" : "Meet in " + days + (days === 1 ? " day" : " days") + " · keep building"}</small></span></button>
  <div class="seg time">${[["pause", 0], ["play", 1], ["fast", 2], ["fast", 3]].map(([icon, i]) => `<button class="${speed === i ? "active" : ""} ${i === 3 ? "x3" : ""}" data-act="speed" data-speed="${i}" aria-label="${i ? "Speed " + i : "Pause"}" ${canPlay ? "" : "disabled"}>${ico(icon)}${i === 3 ? "<sup>+</sup>" : ""}</button>`).join("")}</div>
  <div class="res fans">${ico("heart")}<b>${state.fans.toLocaleString()}</b></div>
  <button class="res insight ${bump ? "bump" : ""}" ${bump} data-act="window" data-page="train" aria-label="${insights} Coaching Insights. Open training">${ico("idea")}<b>${insights}</b>${bump ? `<em>+${insightBump.n}</em>` : ""}</button>
  <div class="res money">${ico("coin")}<b>${cash(state.money)}</b></div>
  <button class="hud-btn" data-act="game-menu" aria-label="Open game menu"><span aria-hidden="true">☰</span></button>`;
}
function menu() {
  if (state.match) {
    $("#menu").hidden = true;
    return;
  }
  $("#menu").hidden = false;
  const squadBadge = state.roster.some((a) => !G.promoteProblem(state, a) || (a.sp > 0 && Object.keys(SKILLS).some((k) => G.skillAvailable(a, k) && SKILLS[k].sp <= a.sp && SKILLS[k].rank <= a.rank)));
  const trainBadge = state.roster.some((a) => Object.keys(G.DRILLS).some((d) => !G.drillProblem(state, a, d)));
  const items = [
    ["home", "home", "Club"],
    ["squad", "squad", "Squad"],
    ["train", "dumbbell", "Train"],
    ["build", "build", "Build"],
    ["shop", "shop", "Shop"],
    ["league", "league", "Meets"],
    ["club", "office", "Office"],
  ];
  const ready = state.matchDay != null && state.day >= state.matchDay && state.phase === "season";
  const action =
    state.phase === "seasonEnd"
      ? `<button class="go" data-act="page" data-page="home">${ico("trophy")}<span>Season review</span></button>`
      : state.phase === "planning"
        ? `<button class="go" data-act="page" data-page="league">${ico("league")}<span>Book a meet</span></button>`
      : ready
        ? `<button class="go hot" data-act="lobby">${ico("stadium")}<span>Call room</span></button>`
        : view.playing
          ? `<button class="go" data-act="pause">${ico("pause")}<span>Pause</span></button>`
          : `<button class="go" data-act="play">${ico("play")}<span>Train</span></button>`;
  $("#menu").innerHTML = `<div class="menu-items">${items.map(([id, icon, name]) => `<button class="menu-item ${view.window === id || (view.window === "recruit" && id === "squad") ? "active" : ""}" data-act="window" data-page="${id}">${ico(icon)}<span>${name}</span>${(id === "squad" && squadBadge) || (id === "train" && trainBadge) ? "<i class='dot-badge'></i>" : ""}${id === "shop" && state.saleDay === state.day ? "<i class='dot-badge'></i>" : ""}</button>`).join("")}</div>${action}`;
}
function tools() {
  $("#tools").innerHTML = state.match ? "" : `<button data-act="zoom" data-step="0.5" aria-label="Zoom in">${ico("plus")}</button><button data-act="zoom" data-step="-0.5" aria-label="Zoom out">${ico("minus")}</button><button data-act="recenter" aria-label="Centre on the stadium">${ico("stadium")}</button>`;
}
function windowHTML() {
  const m = state.match;
  if (m) {
    if (m.phase === "complete") return ["Full time", P.meetComplete(state, view)];
    if (m.phase === "decide") return [m.last?.clutch ? "Clutch moment" : "Your call, coach", P.decide(state, view)];
    return null;
  }
  if (!view.window) return null;
  const page = view.window;
  const html = {
    home: () => P.home(state, view),
    squad: () => P.squad(state, view),
    train: () => P.train(state, view),
    recruit: () => P.recruit(state, view),
    build: () => P.build(state, view),
    shop: () => P.shop(state, view),
    league: () => P.league(state, view),
    club: () => P.club(state, { version: GAME_VERSION, status: updateStatus(), pending: hasPendingUpdate() }),
    lobby: () => P.lobby(state, view),
    calendar: () => P.calendar(state, view),
  }[page]?.();
  if (html == null) return null;
  const title = page === "home" && state.phase === "seasonEnd" ? "Season review" : page === "squad" && view.athlete ? "Athlete file" : page === "lobby" ? "Call room · " + (G.opponent(state)?.name || "") : P.WINDOW_TITLES[page];
  return [title, html];
}
// A different window (or athlete file) always opens at the top.
let shownPage = null;
function render(preserve = true) {
  const panel = $("#panel"),
    page = state.match ? "meet:" + state.match.phase : view.window + ":" + view.athlete,
    scroll = preserve && page === shownPage ? panel.scrollTop : 0;
  shownPage = page;
  hud();
  menu();
  tools();
  const m = state.match;
  $("#hud").hidden = m?.phase === "complete";
  $("#world").hidden = !!m;
  $("#stadium").hidden = !m;
  $("#app").classList.toggle("meeting", !!m);
  $("#app").classList.toggle("results", m?.phase === "complete");
  $("#meetbar").hidden = !m || m.phase === "complete";
  if (m && m.phase !== "complete") $("#meetbar").innerHTML = P.meetBar(state, view);
  const win = windowHTML();
  $("#window").hidden = !win;
  $("#window").classList.toggle("center", !!m);
  $("#window").classList.toggle("low", m?.phase === "decide");
  $("#window").classList.toggle("meet-results", m?.phase === "complete");
  if (win) {
    $("#winTitle").textContent = win[0];
    $(".win-close").innerHTML = ico("close");
    $(".win-close").hidden = !!m;
    panel.innerHTML = win[1];
    panel.scrollTop = scroll;
  } else panel.innerHTML = "";
  quickAction();
  paint(document.body);
  dirty = false;
}
// Re-render without closing a dropdown the player is using.
function refresh() {
  hud();
  menu();
  const focus = document.activeElement;
  if (focus && $("#window").contains(focus) && ["SELECT", "INPUT"].includes(focus.tagName)) {
    dirty = true;
    return;
  }
  render();
}
function quickAction() {
  const shell = $("#quickAction");
  shell.innerHTML = "";
  const m = state.match;
  const want = m ? (m.phase === "complete" ? [view.resultView === "progress" ? "leave" : "meet-progress"] : view.meter ? ["release"] : []) : view.window === "home" ? (state.phase === "seasonEnd" ? ["season"] : []) : view.window === "lobby" ? ["enter"] : [];
  for (const act of want) {
    const el = $("#panel").querySelector(`[data-act="${act}"]`);
    if (el) shell.append(el);
  }
  shell.hidden = !shell.children.length;
}
const buildingCache = new Map();
function buildingImage(key) {
  const k = key + state.colors.primary;
  if (buildingCache.has(k)) return buildingCache.get(k);
  const [type, level] = key.split(":"),
    c = makeCanvas(104, 66);
  drawFacility(c.getContext("2d"), type, +level, 0, 6, { season: 1, colors: state.colors });
  buildingCache.set(k, c);
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
      cl = G.clubById(state, club);
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

// ── Windows and dialogs ─────────────────────────────────────────────────
function openWindow(page, opts = {}) {
  if (state.match) return;
  view.window = page;
  if (page !== "squad") view.athlete = null;
  if (page !== "build") view.moving = null;
  if (opts.athlete != null) {
    view.athlete = opts.athlete;
    view.tab = "stats";
  }
  if (opts.selected !== undefined) view.selected = opts.selected;
  else if (page !== "build") view.selected = view.athlete != null ? { kind: "athlete", id: view.athlete } : null;
  render(false);
}
function closeWindow() {
  view.window = null;
  view.athlete = null;
  view.selected = null;
  view.moving = null;
  render(false);
}
function openGameMenu(page = "main") {
  stopPlaying();
  const menu = $("#gameMenu");
  menu.innerHTML = P.gameMenu(state, {page, native: isNativeApp()});
  if (!menu.open) menu.showModal();
}
function closeGameMenu() { $("#gameMenu").close(); }
let saving = false;
async function saveFromMenu(exit = false) {
  if (saving) return;
  saving = true;
  const controls = [...$("#gameMenu").querySelectorAll("button, input, select")].map(el => [el, el.disabled]);
  controls.forEach(([el]) => el.disabled = true);
  const status = $("#menuSaveStatus");
  status.textContent = "Saving…";
  try {
    if (!save()) throw Error("Could not save your club. Try again or export a backup before leaving.");
    await store.flush();
    status.textContent = "All progress saved.";
    if (exit && !(await exitApp())) openGameMenu("saved");
  } catch (error) {
    status.textContent = (exit ? "Save & exit could not finish. " : "Save failed. ") + error.message;
  } finally {
    controls.forEach(([el, disabled]) => { if (el.isConnected) el.disabled = disabled; });
    saving = false;
  }
}
$("#gameMenu").addEventListener("cancel", e => { if (saving) e.preventDefault(); });
function dialog(title, body, choices, o = {}) {
  const dlg = $("#dialog");
  // Every pop-up shares the window frame; tone picks the header band (news, celebration, warning).
  dlg.className = "tone-" + (o.tone || "news") + (o.cls ? " " + o.cls : "");
  dlg.innerHTML = `<div class="dialog-head">${o.helper ? `<span class="medallion"><canvas width="64" height="64" data-helper class="portrait helper"></canvas></span>` : ""}<div><span class="eyebrow">${esc(o.eyebrow || HELPER + ", club secretary")}</span><h1>${esc(title)}</h1></div></div><div class="dialog-body">${body}</div><div class="dialog-actions">${choices.map((c, i) => `<button class="button ${c.secondary ? "subtle" : "primary"}" data-choice="${i}" ${c.disabled ? "disabled" : ""}>${esc(c.label)}</button>`).join("")}</div>`;
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
    `${secret ? `<div class="event-athlete"><canvas class="portrait large" width="96" height="96" data-secret="${state.pendingEvent.data.key}"></canvas><span><strong>${esc(secret.name)}</strong><small>${EVENTS[secret.event].name} · ${esc(SKILLS[secret.skill].name)}: ${esc(SKILLS[secret.skill].desc)}</small></span></div>` : ""}${a ? `<div class="event-athlete">${P.portrait(a)}<span><strong>${esc(a.name)}</strong><small>${EVENTS[a.event].name} · potential ${Math.floor(a.potential)}</small></span></div>` : ""}<p>${esc(v.text)}</p>`,
    v.choices.map((c, i) => ({
      label: c.label,
      disabled: !c.ok,
      secondary: i > 0,
      fn: () => {
        const before = snapshot();
        const msg = G.resolveEvent(state, i);
        if (msg) toast(msg, "story", "news");
        if (v.id === "secret") sfx("level");
        announce(before);
        save();
        render();
      },
    })),
    { helper: true, locked: true, eyebrow: v.id === "secret" ? "SECRET CHARACTER" : HELPER + " has news", tone: v.id === "secret" ? "gold" : "news" },
  );
}
function chooseAthlete(title, item, fn, cancel = "Cancel") {
  dialog(title, P.itemTargets(state, item), [{ label: cancel, secondary: true }], { eyebrow: ITEMS[item].name, tone: "shop" });
  $("#dialog").querySelectorAll("[data-pick]").forEach(
    (b) =>
      (b.onclick = () => {
        $("#dialog").close();
        fn(+b.dataset.pick);
      }),
  );
}
const growthBefore = (a) => ({ stats: [...a.stats], stamina: a.stamina, condition: a.condition, level: a.level, sp: a.sp, injury: a.injury });
// The payoff moment: a card with the athlete and their bars filling up.
function showGrowth(a, before, eyebrow, extra = []) {
  const ups = a.stats.map((v, i) => v - before.stats[i]),
    best = ups.indexOf(Math.max(...ups));
  const title = ups[best] > 1e-6 ? STAT_NAMES[best] + " up!" : a.level > before.level ? "Level up!" : a.stamina > before.stamina + 0.5 ? "Legs are back!" : a.condition > before.condition + 0.5 ? "Head in the game!" : "Done!";
  sfx("level");
  dialog(title, P.growth(a, before, extra), [{ label: "Back to the infield" }], { eyebrow, tone: "gold" });
}
// Special training: run the session, then play it out on a little stage with ratings and results.
function runTraining(ids, drill) {
  stopPlaying();
  const athletes = ids.map((id) => state.roster.find((a) => a.id === id));
  const befores = new Map(athletes.filter(Boolean).map((a) => [a.id, { ...growthBefore(a), ovr: G.overall(a) }]));
  const problem = G.groupProblem(state, ids, drill),
    snap = snapshot(),
    session = G.coachGroup(state, ids, drill);
  if (!session) return toast(problem || "That session isn't available right now.", "warn");
  view.trainees = [];
  announce(snap);
  save();
  render();
  world.replan();
  dialog(session.name, P.trainingStage(state, session, befores), [{ label: "Hit the showers" }], { eyebrow: "Training ground · session Lv " + session.level, tone: "gold", cls: "training" });
  const dlg = $("#dialog"),
    results = dlg.querySelector(".stage-results"),
    cv = dlg.querySelector(".stage-canvas");
  sfx("whistle");
  const player = playTraining(cv, {
    drill,
    athletes: session.results.map((r) => {
      const a = state.roster.find((x) => x.id === r.id);
      return { a, quality: r.quality, gains: r.gains, event: a.trainingEvent || a.event };
    }),
    colors: state.colors,
    ctx: { gymLevel: G.facilityLevel(state, "gym"), trackColor: trackColorOf(Math.max(2, state.stadium.track), styleOf(state).track) },
    reduced: reduced(),
    onReveal() {
      results.classList.add("show");
      dlg.querySelector(".stage-tap")?.remove();
      sfx(session.results.some((r) => r.quality === "excellent") ? "goal" : "stamp");
      if (session.levelUp) setTimeout(() => sfx("combo"), 700);
    },
  });
  cv.onclick = () => player.skip();
  dlg.addEventListener("close", () => player.stop(), { once: true });
}
// Use a consumable and show what it did.
function applyItem(item, aid) {
  const d = ITEMS[item],
    snap = snapshot(),
    a = state.roster.find((x) => x.id === aid),
    before = a && growthBefore(a);
  const problem = G.itemProblem(state, item, aid);
  if (G.useItem(state, item, aid)) {
    if (a) showGrowth(a, before, d.name);
    else {
      toast(d.name + ": the whole squad feels great.", "level", "gift");
      sfx("level");
    }
  } else toast(problem || "That item won't help right now.", "warn");
  announce(snap);
  save();
  render();
}

function help(welcome = false) {
  stopPlaying();
  dialog(
    welcome ? "Welcome home, Coach!" : "How to play",
    `<p>${welcome ? "I'm " + HELPER + ", club secretary. Four throwers, one patchy field, big dreams. Here's the drill:" : "The drill, one more time:"}</p>
    <ol class="howto"><li><b>Train.</b> Hit Train and the days roll. Everyone heads to the gym, the track or their own ring, and the stats tick up.</li>
    <li><b>Run sessions.</b> Spend Coaching Insights (the lightbulb) in <b>Train</b>: up to three athletes per session, and sessions level up with reps.</li>
    <li><b>Build.</b> Upgrade the rings, cages, runway, track and stands, then fill the plots outside. Good neighbours make <b>combos</b>.</li>
    <li><b>Book meets.</b> Duels to test yourselves, leagues for trophies. Win Open, Challenger and Championship to move up a level.</li>
    <li><b>Compete.</b> Watch your throwers go, or call every attempt from the infield.</li></ol>
    <p class="hint">Drag to look around, tap anything. The clock only runs while you train.</p>`,
    [{ label: welcome ? "Let's throw!" : "Back to it", fn: () => ((state.welcomed = true), save()) }],
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
  if (state.match || !["planning", "season"].includes(state.phase) || (state.matchDay != null && state.day >= state.matchDay)) return;
  if (state.pendingEvent) return showEvent();
  state.settings.speed = speed;
  view.playing = true;
  // Carry on from the time already on the clock.
  lastDayAt = performance.now() - DAY_MS[speed] * view.dayP;
  render();
}
function doDay(now) {
  if (state.pendingEvent) return showEvent();
  const before = snapshot();
  const r = G.advanceDay(state);
  if (!r.ok) return stopPlaying();
  lastDayAt = now;
  if (!view.playing) view.dayP = 0.25;
  world.onDay(state, r, now, view.playing ? DAY_MS[state.settings.speed] : 1600);
  if (r.spend.length) setTimeout(() => sfx("coin"), 600);
  for (const l of r.levelUps) {
    toast(l.name + " hits level " + l.level + "! Skill points to spend.", "level", "levelup");
    sfx("level");
  }
  if (r.invitation) {
    world.banner("INVITATION!", r.invitation.name.toUpperCase() + " · " + G.shortDate(r.invitation.day).toUpperCase(), "#f2c94c", now, 3200);
    toast("Invitation to the " + r.invitation.name + " on " + G.shortDate(r.invitation.day) + ". Open Meets to accept.", "goal", "star");
    sfx("goal");
  }
  for (const id of r.injuries) toast(state.roster.find((a) => a.id === id)?.name + " pulled up hurt. Recovery first.", "warn", "bandage");
  announce(before);
  save();
  if (state.matchDay != null && state.day >= state.matchDay) {
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
      if (beat.side === "home" && beat.mark != null && (beat.newPb || beat.leading || beat.scoringSwing>0)) sfx("cheer");
      render();
    });
  } else if (beat.type === "eventEnd") sfx(beat.h > beat.a ? "cheer" : "event");
  else if (beat.type === "eventStart") sfx("event");
  else if (beat.type === "meetStart") sfx("cheer");
  else if (beat.type === "complete") {
    sfx(beat.win ? "win" : beat.draw ? "event" : "lose");
    for (const id of state.match.rewards?.goals || []) toast("Goal complete: " + G.GOALS.find((g) => g.id === id)?.name, "goal", "target");
  }
  render();
}
function pumpMeet(dt) {
  const m = state.match;
  if (!m) return;
  if (presenter) {
    const b=presenter.beat;
    const routine=state.settings.highlights && b.athleteId!==state.settings.followAthlete && b.type === "throw" && b.attempt>0 && !b.newPb && !b.signature && !b.scoringSwing && !b.target?.qualification;
    presenter.el += dt * view.meetSpeed * (routine?5:1);
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
    case "window":
    case "page":
      return view.window === b.dataset.page && act === "window" ? closeWindow() : openWindow(b.dataset.page);
    case "close":
      return closeWindow();
    case "deselect":
      view.selected = null;
      break;
    case "help":
      return help();
    case "game-menu": return openGameMenu();
    case "menu-settings": return openGameMenu("settings");
    case "menu-close": if (!saving) closeGameMenu(); return;
    case "menu-help": closeGameMenu(); return help();
    case "save-game": return saveFromMenu();
    case "save-exit": return saveFromMenu(true);
    case "zoom":
      return world.zoomBy(+b.dataset.step);
    case "recenter":
      return world.home();
    case "play":
      return play();
    case "pause":
      return stopPlaying(), render();
    case "speed":
      return +b.dataset.speed ? play(+b.dataset.speed) : (stopPlaying(), render());
    case "day":
      if (state.pendingEvent) return showEvent();
      return doDay(performance.now());
    case "lobby":
      if (!state.competition || state.phase !== "season") return openWindow("league");
      stopPlaying();
      if (G.lineupProblem(state)) G.autoLineup(state);
      return openWindow("lobby");
    case "autolineup":
      G.autoLineup(state);
      toast("Strongest lineup entered.");
      break;
    case "medical":
      if (!G.medicalDay(state)) toast("Only available when an injured athlete is in the lineup.");
      break;
    case "enter":
      view.resultView = "results";
      view.resultEvent = "all";
      if (state.pendingEvent) return showEvent();
      if (!G.startMatch(state)) {
        toast(G.lineupProblem(state) || "The meet can't start yet.", "warn");
        break;
      }
      view.window = null;
      presenter = null;
      view.hide = null;
      view.meter = null;
      break;
    case "meet-mode":
      state.settings.meetMode = b.dataset.value;
      break;
    case "follow-athlete":
      state.settings.followAthlete=state.settings.followAthlete===id?null:id;
      break;
    case "highlights":
      state.settings.highlights=!state.settings.highlights;
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
        return render();
      }
      return decide(b.dataset.value);
    case "release": {
      if (!view.meter) return;
      const half = G.effects(state, G.homeAthlete(state)).perfect ? 0.11 : 0.07,
        off = Math.abs(meterPos(performance.now()) - 0.62);
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
      sfx(G.meetOutcome(state.match) > 0 ? "win" : "event");
      break;
    case "leave":
      G.leaveMatch(state);
      presenter = null;
      world.reset();
      view.window = state.phase === "seasonEnd" ? "home" : null;
      if (state.phase === "seasonEnd") sfx(state.champion ? "win" : "event");
      break;
    case "book-league":
    case "book-duel": {
      stopPlaying();
      if (state.pendingEvent) return showEvent();
      const booked = G.enterCompetition(state, { kind: act === "book-duel" ? "duel" : "league", tier: +b.dataset.tier,
        stage: +(b.dataset.stage || 0), rival: +(b.dataset.rival || 0), preparation: view.preparation || 5, spacing: view.spacing || 7 });
      if (booked) { view.window = "home"; view.rival = null; world.replan(); toast("Booked for day " + state.matchDay + ". The countdown starts now."); }
      else toast("That competition isn't available right now.", "warn");
      break;
    }
    case "accept-invite":
      stopPlaying();
      if (state.pendingEvent) return showEvent();
      if (G.acceptInvitation(state)) { view.window = "home"; world.replan(); toast("Invitation accepted. See you on " + G.shortDate(state.matchDay) + ".", "goal", "star"); }
      else toast(G.invitationProblem(state), "warn");
      break;
    case "cancel-booking":
      stopPlaying();
      if (G.cancelCompetition(state)) { world.replan(); toast("Booking scratched. Pick another meet whenever you're ready."); }
      break;
    case "save-loadout":
      if (G.saveLoadout(state, id, b.dataset.mode)) toast("Saved " + b.dataset.mode + " skill setup.");
      break;
    case "season":
    case "defend": {
      const before = state.league;
      G.nextSeason(state);
      view.window = "league";
      world.replan();
      if (state.league > before) setTimeout(() => world.banner(LEAGUES[state.league].name.toUpperCase(), "NEW INVITATIONS · NEW GROUNDS", "#f2c94c"), 300);
      break;
    }
    case "athlete":
      stopPlaying();
      return openWindow("squad", { athlete: id });
    case "back-squad":
      view.athlete = null;
      view.selected = null;
      return render(false);
    case "meet-progress":
    case "result-view":
      view.resultView = act === "meet-progress" ? "progress" : b.dataset.value;
      return render(false);
    case "result-event":
      view.resultEvent = b.dataset.event;
      render();
      return;
    case "tab":
      view.tab = b.dataset.tab;
      return render(false);
    case "coach-session":
      return runTraining((b.dataset.ids || String(id)).split(",").filter(Boolean).map(Number), b.dataset.drill);
    case "trainee": {
      const list = P.trainees(state, view).filter((x) => x !== id);
      if (list.length === P.trainees(state, view).length) list.push(id);
      view.trainees = list.slice(-G.MAX_GROUP);
      break;
    }
    case "unlock-plan":
      if (G.unlockPlan(state,id,b.dataset.value)) toast("Unlocked " + PLANS[b.dataset.value].name + " for the club. Select it to begin.","level");
      break;
    case "plan": {
      const a = state.roster.find((x) => x.id === id);
      if (a) G.setTrainingPlan(state,a.id,b.dataset.value);
      world.replan();
      break;
    }
    case "learn":
      if (G.learnSkill(state, id, b.dataset.skill)) {
        toast("Learned " + SKILLS[b.dataset.skill].name + "!", "level", "spark");
        sfx("level");
      }
      break;
    case "skill-toggle":
      if (!G.toggleSkill(state, id, b.dataset.skill)) toast("Skill slots are full. Bench one first.");
      break;
    case "promote": {
      const a = state.roster.find((x) => x.id === id);
      if (G.promote(state, id)) {
        sfx("goal");
        dialog("A new " + RANKS[a.rank].name + "!", `<div class="promo">${P.portrait(a, "large")}<p><b>${esc(a.name)}</b> is now a <b>${RANKS[a.rank].name}</b>. Their limit is higher, every stat gains a point${RANKS[a.rank].slots > RANKS[a.rank - 1].slots ? " and there's a new skill slot" : ""}.</p></div>`, [{ label: "Wonderful!" }], { eyebrow: "PROMOTION", tone: "gold" });
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
      if (d.team) applyItem(item);
      else if (b.dataset.id) applyItem(item, +b.dataset.id);
      else chooseAthlete("Use " + d.name + " on…", item, (aid) => applyItem(item, aid));
      return;
    }
    case "buy-use": {
      const item = b.dataset.item,
        d = ITEMS[item];
      const buyThenUse = (aid) => {
        if (!G.buyItem(state, item)) return toast("Not enough money.", "warn");
        sfx("coin");
        applyItem(item, aid);
      };
      if (!d.team) return chooseAthlete("Who gets the " + d.name + "?", item, buyThenUse);
      const problem = G.itemProblem(state, item);
      if (problem) toast(problem + ".", "warn");
      else buyThenUse();
      return;
    }
    case "buy-gear": {
      const item = b.dataset.item;
      if (!G.buyItem(state, item)) break;
      sfx("coin");
      save();
      render();
      return chooseAthlete("Equip the " + ITEMS[item].name + " now?", item, (aid) => {
        if (G.equipItem(state, aid, item)) toast(ITEMS[item].name + " equipped on " + state.roster.find((x) => x.id === aid)?.name + ".", "level", "shop");
        save();
        render();
      }, "Keep in the bag");
    }
    case "equip": {
      const item = b.dataset.item;
      return chooseAthlete("Equip " + ITEMS[item].name + "…", item, (aid) => {
        if (G.equipItem(state, aid, item)) toast(ITEMS[item].name + " equipped.");
        save();
        render();
      });
    }
    case "buy":
      if (G.buyItem(state, b.dataset.item)) {
        toast(ITEMS[b.dataset.item].name + " packed in the kit bag.", "info", "shop");
        sfx("coin");
      }
      break;
    case "forge":
      if (G.forgeItem(state, b.dataset.item)) {
        toast(ITEMS[b.dataset.item].name + " forged to +" + state.forge[b.dataset.item] + ".", "level", "build");
        sfx("build");
      }
      break;
    case "shop-tab":
      view.shopTab = b.dataset.tab;
      return render(false);
    case "plot":
      selectPlot(+b.dataset.index);
      return glide();
    case "spot":
      view.selected = view.selected?.kind === "stadium" && view.selected.key === b.dataset.key ? null : { kind: "stadium", key: b.dataset.key };
      glide();
      break;
    case "upgrade-spot": {
      const key = b.dataset.key,
        r = G.upgradeStadium(state, key);
      if (r) {
        world.flashSpot(key, r.level === 1 ? "BUILT!" : "LEVEL " + r.level + "!");
        sfx("build");
        toast(STADIUM[key].name + ": " + STADIUM[key].levels[r.level] + "!", "level", "stadium");
      }
      break;
    }
    case "build": {
      const i = +b.dataset.index,
        type = b.dataset.type;
      if (G.build(state, i, type)) {
        world.flashPlot(i, "BUILT!");
        sfx("build");
        toast("The " + FACILITIES[type].name + " is open!", "info", "build2");
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
      if (view.moving != null) toast("Tap a plot on the map (or in the list) to move here.", "info", "build");
      break;
    case "sell": {
      const i = +b.dataset.index,
        d = FACILITIES[state.plots[i].type];
      return dialog("Clear this plot?", `<p>Remove the ${esc(d.name)} for a ${cash(d.cost / 2)} refund? Its upgrades are lost.</p>`, [
        { label: "Clear it", fn: () => (G.sellFacility(state, i), save(), render()) },
        { label: "Keep it", secondary: true },
      ], { tone: "warn", eyebrow: "Build" });
    }
    case "scout":
      if (G.scout(state)) sfx("coin");
      break;
    case "recruit":
      if (G.recruit(state, id)) {
        toast("Signed! New bib, new beginnings.", "level", "squad");
        sfx("level");
      }
      break;
    case "sign-secret":
      if (G.signSecret(state, b.dataset.key)) {
        toast(SECRETS[b.dataset.key].name + " joined the club!", "goal", "star");
        sfx("goal");
      }
      break;
    case "release-contract": {
      const a = state.roster.find((x) => x.id === id);
      if (!a) return;
      return dialog("A new chapter?", `<p>Release ${esc(a.name)}? Their gear returns to the bag and their marks stay in club history.</p>`, [
        { label: "Release contract", fn: () => (G.releaseAthlete(state, a.id), (view.athlete = null), save(), render()) },
        { label: "Keep them", secondary: true },
      ], { tone: "warn", eyebrow: "Contract" });
    }
    case "rival":
      view.rival = view.rival === id ? null : id;
      break;
    case "sponsor":
      if (G.chooseSponsor(state, b.dataset.value)) toast("Signed with " + b.querySelector("strong").textContent + ".");
      break;
    case "buy-look": {
      const name = CUSTOMISE[b.dataset.cat]?.options[b.dataset.key]?.name;
      if (G.buyCustom(state, b.dataset.cat, b.dataset.key)) toast(name + " bought and in use.", "info", "star");
      else toast(G.customProblem(state, b.dataset.cat, b.dataset.key) || "Not available.", "warn");
      break;
    }
    case "use-look":
      G.useCustom(state, b.dataset.cat, b.dataset.key);
      break;
    case "palette":
      state.colors = { ...state.colors, primary: CLUB_PALETTES[+b.dataset.index].primary, secondary: CLUB_PALETTES[+b.dataset.index].secondary };
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
// Bring the selected thing into view beside the open window.
function glide() {
  const win = $("#window"),
    cover = win.hidden || innerWidth < innerHeight ? 0 : win.offsetWidth + 20;
  if (innerWidth < innerHeight && view.selected) world.focusOn(view.selected, 0);
  else world.focusOn(view.selected, cover);
}
function selectPlot(i) {
  const before = snapshot();
  if (view.moving != null) {
    if (G.moveFacility(state, view.moving, i)) world.flashPlot(i, "MOVED");
    view.moving = null;
    announce(before);
    save();
  }
  view.selected = { kind: "plot", index: i };
  openWindow("build", { selected: view.selected });
}
$("#app").addEventListener("change", async (e) => {
  const el = e.target,
    kind = el.dataset.change,
    a = state.roster.find((x) => x.id === +el.dataset.id);
  // Plain form fields (the club name) commit on submit; re-rendering here would detach the form first.
  if (!kind) return;
  if (kind === "facility-staff") G.assignDuty(state,el.dataset.site,+el.value);
  if (kind === "athlete-duty" && a) {
    if(el.value === "auto") {
      const previous=G.athleteDuty(state,a.id);if(previous) G.assignDuty(state,previous,0);
      G.setTrainingPlan(state,a.id,"facilities");
    } else if(el.value) G.assignDuty(state,el.value,a.id);
    else { const previous=G.athleteDuty(state,a.id); if(previous) G.assignDuty(state,previous,0); }
  }
  if(kind === "facility-focus" && a && ["balanced","money","insights"].includes(el.value)) a.facilityFocus=el.value;
  if (["facility-staff","athlete-duty","facility-focus"].includes(kind)) world.replan();
  if (kind === "athlete-event" && G.setAthleteEvent(state, a?.id, el.value)) world.replan();
  if(kind === "training-event" && a && EVENTS[el.value] && !state.match) a.trainingEvent=el.value;
  if(kind === "approach" && a && !G.approachProblem(a,el.dataset.event,el.value)) a.approaches[el.dataset.event]=el.value;
  if (kind === "bulk") state.roster.forEach((x) => G.setTrainingPlan(state,x.id,el.value));
  if (kind === "plan" && a) G.setTrainingPlan(state,a.id,el.value);
  if (kind === "plan" || kind === "bulk") world.replan();
  if (kind === "booking-preparation") view.preparation = +el.value;
  if (kind === "booking-spacing") view.spacing = +el.value;
  if (kind === "loadouts" && a) G.enableLoadouts(state, a.id, el.checked);
  if (kind === "autorest" && a) a.autoRest = el.checked;
  if (kind === "autotaper" && a) a.autoTaper = el.checked;
  if (kind === "entry" && !G.assignEntry(state, el.dataset.event, +el.dataset.slot, +el.value)) toast("Choose different athletes; each athlete can enter two events.", "warn");
  if (kind === "lineup" && !G.assign(state, el.dataset.event, +el.value)) toast("An athlete can cover at most two events and must be healthy.", "warn");
  if (kind === "orientation" && ["auto","portrait","landscape"].includes(el.value)) {
    const previous = state.settings.orientation || "auto";
    try { await setOrientation(el.value); state.settings.orientation = el.value; }
    catch { el.value = previous; $("#menuSaveStatus").textContent = "Could not change screen orientation. Please try again."; }
  }
  if (kind === "menu-meet-mode" && ["watch","coach"].includes(el.value)) state.settings.meetMode = el.value;
  if (kind === "setting") {
    state.settings[el.dataset.key] = el.checked;
    setSound(state.settings.sound);
  }
  if (kind === "sig") view.sig = el.checked;
  if (kind === "stadium-name") G.renameStadium(state, el.value);
  save();
  el.blur();
  render();
});
$("#app").addEventListener("focusout", () => setTimeout(() => dirty && !$("#window").contains(document.activeElement) && render(), 0));
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
            view.window = null;
            view.athlete = null;
            world.reset();
            save();
            render(false);
            toast("Club restored.");
          },
        },
        { label: "Cancel", secondary: true },
      ], { tone: "warn", eyebrow: "Backup" });
    } catch (error) {
      toast(error.message, "warn");
    }
  };
  input.click();
}
// Map: drag to pan, pinch or wheel to zoom, tap to pick.
const pointers = new Map();
let drag = null;
const worldCanvas = $("#world");
worldCanvas.addEventListener("pointerdown", (e) => {
  worldCanvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, [e.clientX, e.clientY]);
  drag = { x: e.clientX, y: e.clientY, moved: 0, pinch: pointers.size === 2 ? pinchDistance() : null };
});
worldCanvas.addEventListener("pointermove", (e) => {
  if (!pointers.has(e.pointerId) || !drag) return;
  const [px, py] = pointers.get(e.pointerId);
  pointers.set(e.pointerId, [e.clientX, e.clientY]);
  if (pointers.size === 2) {
    const d = pinchDistance();
    if (drag.pinch && Math.abs(d - drag.pinch) > 40) {
      world.zoomBy(d > drag.pinch ? 0.5 : -0.5);
      drag.pinch = d;
    }
    drag.moved = 99;
    return;
  }
  world.pan(e.clientX - px, e.clientY - py);
  drag.moved += Math.abs(e.clientX - px) + Math.abs(e.clientY - py);
});
function pinchDistance() {
  const [a, b] = [...pointers.values()];
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}
worldCanvas.addEventListener("pointerup", (e) => {
  pointers.delete(e.pointerId);
  if (!drag || drag.moved > 8 || pointers.size) return;
  drag = null;
  unlockAudio();
  const hit = world.pick(e.clientX, e.clientY);
  if (state.match) return;
  if (!hit) return view.window ? closeWindow() : null;
  sfx("tap");
  if (hit.kind === "athlete") return openWindow("squad", { athlete: hit.id });
  if (hit.kind === "plot") return selectPlot(hit.index);
  if (hit.kind === "stadium") return openWindow("build", { selected: { kind: "stadium", key: hit.key } });
});
worldCanvas.addEventListener("pointercancel", (e) => pointers.delete(e.pointerId));
worldCanvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  world.zoomBy(e.deltaY < 0 ? 0.5 : -0.5, e.clientX, e.clientY);
}, { passive: false });
document.addEventListener("keydown", (e) => {
  if ($("#gameMenu").open) return;
  if ($("#dialog").open || ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
  if (e.code === "Space") {
    e.preventDefault();
    if (view.meter) $('#app [data-act="release"]')?.click();
    else if (!state.match) view.playing ? (stopPlaying(), render()) : play();
  }
  if (e.key === "Escape" && view.window && !state.match) closeWindow();
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
  orientation: state.settings.orientation || "auto",
  pause: () => {
    view.playing = false;
    view.meter = null;
    save();
    render();
  },
  back: () => {
    if ($("#gameMenu").open) { if (!saving) closeGameMenu(); return true; }
    if ($("#dialog").open) {
      if (!$("#dialog").dataset.locked) $("#dialog").close();
      return true;
    }
    if (state.match) {
      toast("The meet is saved after every throw. Continue when you're ready.");
      return true;
    }
    if (view.athlete != null && view.window === "squad") {
      view.athlete = null;
      render(false);
      return true;
    }
    if (view.window) closeWindow();
    else openGameMenu();
    return true;
  },
}).catch(console.error);

function frame(now) {
  const dt = Math.min(100, now - (lastFrame || now));
  lastFrame = now;
  if (!document.hidden && !$("#gameMenu").open) {
    if (state.match) {
      pumpMeet(dt);
      const bar = $("#meetbar");
      stadium.draw(state, now, { beat: presenter?.beat || state.match.last, elapsed: presenter ? presenter.el : 1e9, reduced: reduced(), insetTop: $("#hud").offsetHeight + 8, insetBottom: bar.hidden ? 0 : bar.offsetHeight + 8 });
      if (view.meter) {
        const n = $("#needle");
        if (n) n.style.left = meterPos(now) * 100 + "%";
      }
    } else {
      if (view.playing && now - lastDayAt >= DAY_MS[state.settings.speed]) doDay(now);
      // The clock runs from 06:00 to 22:00 across each day and holds while paused.
      if (view.playing) view.dayP = Math.min(1, (now - lastDayAt) / DAY_MS[state.settings.speed]);
      const clock = $("#clock"),
        label = G.clockLabel(view.dayP);
      if (clock && clock.textContent !== label) clock.textContent = label;
      world.draw(state, now, { selected: view.selected, moving: view.moving, dayProgress: view.dayP, nightScale: (reduced() ? 0.5 : 1) * NIGHT_AT_SPEED[view.playing ? state.settings.speed : 0], calm: reduced() });
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
