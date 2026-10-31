import { DAY_MS, playbackSpeed, playbackRate, WATCH_SPEED } from "./platform/pacing.js";
import { mayRestart } from "./platform/update-policy.js";
import { GAME_VERSION, updateStatus, hasPendingUpdate, checkForUpdates, applyPendingUpdate, markGameHealthy, updateInfo, onUpdateChange } from "./platform/updates.js";
import "@fontsource/oswald/latin-500.css";
import "@fontsource/oswald/latin-700.css";
import "./styles.css";
import * as G from "./domain/game.js";
import { STAT_NAMES, trackColorOf, styleOf, ITEMS, SKILLS, FACILITIES, STADIUM, LEAGUES, PLANS, RANKS, SECRETS, CLUB_PALETTES, CUSTOMISE, EVENTS, COMBOS, HELPER, SHOPKEEPER, ELITES, NATION_COLORS } from "./game-content.js";
import * as P from "./ui/pages.js";
import { createWorld } from "./render/world.js";
import { createStadium } from "./render/stadium.js";
import { beatDuration, SETUP_MS, CUTIN_MS, LANDING_HOLD_MS, celebrates, hasCutIn, throwOffset, throwTiming, advanceBeatClock } from "./render/meet-presentation.js";
import { playTraining } from "./render/training.js";
import { portrait as paintPortrait } from "./render/sprites.js";
import { paintIcon } from "./render/icons.js";
import { installIcons, ico } from "./render/uiicons.js";
import { drawFacility } from "./render/buildings.js";
import { canvas as makeCanvas } from "./render/pixel.js";
import { sfx, unlockAudio, setSound } from "./render/audio.js";
import { slotStore, activeSlot, setActiveSlot, touchSlot, listSlots, clearSlot } from "./platform/slots.js";
import { exportBackup } from "./platform/backups.js";
import { initNative, isNativeApp, setOrientation, exitApp } from "./platform/native.js";
import { validateCampaign, exportCampaign } from "./domain/campaign-save.js";
import { line as voiceLine, idleSituation } from "./domain/voice.js";

installIcons();
const $ = (q) => document.querySelector(q);
const { esc, cash } = P;
// The career in the active save slot (see platform/slots.js). The main menu switches slots.
let slot = await activeSlot(),
  store = await slotStore(slot);
// A slot that can't be read is never written over: the menu shows it, and a new club or another
// slot has to be picked.
let state,
  unreadable = false;
try {
  state = store.read() ? validateCampaign(JSON.parse(store.read())) : G.newGame();
} catch (error) {
  console.error(error);
  unreadable = true;
  state = G.newGame();
}
let saveEnabled = false,
  touchedAt = 0;
// window: which pop-up is open (null = just the club). selected: what is highlighted on the map.
const view = { window: null, athlete: null, tab: "stats", selected: null, moving: null, shopTab: "shop", playing: false, rival: null, meetSpeed: state.settings.meetSpeed || 1, sig: false, meter: null, hide: null, dayP: 0.25 };
// At 1× a day is long enough to walk between sessions; faster speeds make people hurry instead.
// 1× is deliberately slow enough to watch a full training day.
// Money and fans roll to their new value in the HUD, and every change floats out beside the counter.
const counters = { money: { shown: state.money, seen: state.money }, fans: { shown: state.fans, seen: state.fans } };
const counterText = (key, n) => (key === "money" ? cash(Math.round(n)) : Math.round(n).toLocaleString());
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
  // Nothing saves while the main menu is up: the club was saved on the way in, and an emptied
  // slot must stay empty until a club is chosen.
  if (!saveEnabled || unreadable || $("#mainMenu").open) return false;
  try {
    store.write(JSON.stringify(state));
    if (performance.now() - touchedAt > 30000) {
      touchedAt = performance.now();
      touchSlot(slot).catch(() => {});
    }
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
  if (state.settings.quietMode !== false) return;
  for (const id of G.systemUnlocked(state,"office") ? state.goals.slice(before.goals) : []) {
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
    canPlay = (state.phase === "planning" && !G.firstMeet(state)) || (state.phase === "season" && days > 0);
  // Insights earned since the last frame float up from the counter. A negative delay keeps the
  // animation smooth when the HUD is redrawn mid-bump.
  const insights = state.coaching.insights;
  if (shownInsights != null && insights > shownInsights) insightBump = { n: insights - shownInsights, at: performance.now() };
  shownInsights = insights;
  const since = performance.now() - insightBump.at,
    bump = since < 1400 ? `style="--since:-${Math.round(since)}ms"` : "";
  $("#hud").innerHTML = `<button class="brand" data-act="window" data-page="club"><span class="crest" style="--p:${state.colors.primary};--s:${state.colors.secondary}">${esc(state.clubName[0])}</span><span><strong>${esc(state.clubName)}</strong><small>${LEAGUES[state.league].name}</small></span></button>
  <button class="hud-date" data-act="window" data-page="calendar" title="${G.longDate(state.day)} · Season ${state.season} · ${G.WEATHER[G.weatherToday(state)].name}" aria-label="Calendar: ${G.longDate(state.day)}, ${G.WEATHER[G.weatherToday(state)].name}">${ico(G.WEATHER[G.weatherToday(state)].icon, "hud-weather")}<span><b><span class="date-text">${G.shortDate(state.day)} </span><span class="clock" id="clock">${G.clockLabel(view.dayP)}</span></b><small>${state.phase === "seasonEnd" ? "Season complete" : state.phase === "planning" ? "Off-season · book a meet" : days <= 0 ? "Meet day!" : "Meet in " + days + (days === 1 ? " day" : " days") + " · keep building"}</small></span></button>
  <div class="seg time" role="group" aria-label="Training speed">${P.speedButtons(speed, "speed", { pause: true, disabled: !canPlay })}</div>
  <div class="hud-wallet"><button class="res fans" data-act="ledger" data-cur="fans" aria-label="${state.fans} fans. Open the ledger">${ico("heart")}<b>${counterText("fans", counters.fans.shown)}</b></button>
  ${G.systemUnlocked(state, "sessions") ? `<button class="res insight ${bump ? "bump" : ""}" ${bump} data-act="ledger" data-cur="insights" aria-label="${insights} Coaching Insights. Open the ledger">${ico("idea")}<b>${insights.toLocaleString()}</b>${bump ? `<em>+${insightBump.n}</em>` : ""}</button>` : ""}
  <button class="res money" data-act="ledger" data-cur="money" aria-label="${cash(state.money)}. Open the ledger">${ico("coin")}<b>${counterText("money", counters.money.shown)}</b></button></div>
  <button class="hud-btn" data-act="game-menu" aria-label="Open game menu"><span aria-hidden="true">☰</span></button>`;
}
function menu() {
  if (state.match) {
    $("#menu").hidden = true;
    return;
  }
  $("#menu").hidden = false;
  const squadBadge = G.systemUnlocked(state, "skills") && state.roster.some((a) => !G.promoteProblem(state, a) || (a.sp > 0 && (Object.keys(SKILLS).some((k) => G.skillAvailable(a, k) && !G.learnProblem(state, a, k)) || Object.keys(state.bag).some((k) => ITEMS[k].kind === "book" && !G.bookProblem(state, a, k)))));
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
        ? `<button class="go" data-act="${G.firstMeet(state) ? "first-duel" : "page"}" data-page="league">${ico("league")}<span>${G.firstMeet(state) ? "First duel" : "Book a meet"}</span></button>`
      : ready
        ? `<button class="go hot" data-act="lobby">${ico("stadium")}<span>Call room</span></button>`
        : view.playing
          ? `<button class="go" data-act="pause">${ico("pause")}<span>Pause</span></button>`
          : `<button class="go" data-act="play">${ico("play")}<span>Train</span></button>`;
  // The next meet, always in sight above the main button: who, and how many days to go.
  const opp = state.phase === "season" && state.matchDay != null && !G.firstMeet(state) ? G.opponent(state) : null,
    left = opp ? state.matchDay - state.day : null;
  const countdown = opp ? `<button class="meet-countdown ${left <= 0 ? "today" : ""}" data-act="window" data-page="home" style="--rival:${opp.color || "#888"}" aria-label="${left <= 0 ? "Meet day" : left + " days to the meet"} against ${esc(opp.name)}"><small>${left <= 0 ? "MEET DAY" : "NEXT MEET"}</small><b>${left <= 0 ? "Today" : left === 1 ? "Tomorrow" : left + " days"}</b><span>vs ${esc(opp.name)}</span></button>` : "";
  $("#menu").innerHTML = `${countdown}<div class="menu-items">${items.filter(([id]) => G.pageUnlocked(state, id)).map(([id, icon, name]) => `<button class="menu-item ${view.window === id || (view.window === "recruit" && id === "squad") ? "active" : ""}" data-act="window" data-page="${id}">${ico(icon)}<span>${name}</span>${(id === "squad" && squadBadge) || (id === "train" && trainBadge) ? "<i class='dot-badge'></i>" : ""}${id === "shop" && (state.saleDay === state.day || (G.shelfRestock(state) === G.BOOK_WEEK && G.bookShelf(state).some((k) => !G.bookSold(state, k)))) ? "<i class='dot-badge'></i>" : ""}</button>`).join("")}</div>${action}`;
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
    club: () => P.club(state, { version: GAME_VERSION, status: updateStatus(), pending: hasPendingUpdate() }, view),
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
  const groupPlans = $("#panel .group-plans");
  if (groupPlans) view.showGroupPlans = groupPlans.open;
  const panel = $("#panel"),
    page = state.match ? "meet:" + state.match.phase : [view.window, view.athlete, view.tab, view.tabs?.[view.window], view.trainTab, view.shopTab, view.drill].join(":"),
    scroll = preserve && page === shownPage ? panel.scrollTop : 0,
    previousPage = shownPage;
  shownPage = page;
  document.documentElement.classList.toggle("reduce-motion", !!state.settings.reducedMotion);
  hud();
  menu();
  tools();
  const m = state.match;
  $("#hud").hidden = m?.phase === "complete";
  $("#world").hidden = !!m;
  $("#stadium").hidden = !m;
  $("#app").classList.toggle("meeting", !!m);
  $("#app").classList.toggle("meet-live", !!m && m.phase !== "complete");
  $("#app").classList.toggle("results", m?.phase === "complete");
  $("#app").classList.toggle("has-window", !m && !!view.window);
  $("#meetbar").hidden = !m || m.phase === "complete";
  if (m && m.phase !== "complete") {
    $("#meetbar").innerHTML = P.meetBar(state, view);
    // A long championship field scrolls; keep whoever is throwing in view.
    const list = $("#meetbar .standings-list"), row = list?.querySelector(".throwing");
    if (row && list.scrollHeight > list.clientHeight) list.scrollTop = row.offsetTop - list.offsetTop - list.clientHeight / 2 + row.offsetHeight / 2;
  }
  const win = windowHTML();
  $("#window").hidden = !win;
  $("#window").classList.toggle("center", !!m);
  $("#window").classList.toggle("low", m?.phase === "decide");
  $("#window").classList.toggle("meet-results", m?.phase === "complete");
  if (win) {
    $("#winTitle").textContent = win[0];
    $(".win-close").innerHTML = ico("close");
    $(".win-close").hidden = !!m;
    // A page class lets wide layouts arrange each window's content.
    const fresh = page !== previousPage;
    panel.innerHTML = `<div class="panel-body page-${m ? "meet" : view.window}${view.window === "squad" && view.athlete != null ? " page-athlete" : ""}${fresh ? " fresh" : ""}">${win[1]}</div>`;
    if (fresh) countUp(panel);
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
// Numbers on a fresh results card or pop-up count up from zero.
function countUp(root) {
  if (reduced()) return;
  root.querySelectorAll("[data-count]").forEach((el) => {
    const to = +el.dataset.count,
      fmt = (n) => (el.hasAttribute("data-cash") ? cash(n) : String(n));
    if (!(to > 0)) return;
    const t0 = performance.now(),
      step = (now) => {
        const p = Math.min(1, (now - t0) / 800);
        el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
      };
    el.textContent = fmt(0);
    requestAnimationFrame(step);
  });
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
  root.querySelectorAll("canvas[data-elite]").forEach((c) => {
    const e = ELITES.find((x) => x.id === c.dataset.elite);
    if (e) paintPortrait(c, { look: e.look, rank: 0 }, { primary: NATION_COLORS[e.nation] || "#888", secondary: "#f4efe2" }, { face: "happy" });
  });
  root.querySelectorAll("canvas[data-shopkeeper]").forEach((c) => paintPortrait(c, { look: SHOPKEEPER.look, rank: 0 }, SHOPKEEPER.colors, { face: "happy" }));
}
// A character pops up in the corner to say something worth knowing: the shopkeeper calling out
// a delivery, the secretary announcing meet day. Tapping them goes where they point.
const SPEAKERS = { shop: { name: SHOPKEEPER.name + " · " + SHOPKEEPER.role, canvas: "data-shopkeeper" }, helper: { name: HELPER + " · club secretary", canvas: "data-helper" } };
let speakerTimer = 0, speaking = null;
const speakQueue = [];
// A dialog opening puts whoever was talking back at the front of the queue until it closes.
function holdSpeaker() {
  const el = $("#speaker");
  if (speaking && !el.hidden) speakQueue.unshift(speaking);
  clearTimeout(speakerTimer);
  el.hidden = true;
  speaking = null;
  $("#dialog").addEventListener("close", () => speakQueue.length && speak(...speakQueue.shift()), { once: true });
}
function speak(who, text, act = "") {
  const el = $("#speaker");
  // One at a time: whoever speaks second waits for the first to finish, and nobody talks over
  // a pop-up the player is reading.
  if ($("#dialog").open || (!el.hidden && !el.classList.contains("out"))) return speakQueue.push([who, text, act]);
  speaking = [who, text, act];
  const sp = SPEAKERS[who];
  el.innerHTML = `<button class="speaker-card" ${act}><span class="medallion"><canvas width="56" height="56" ${sp.canvas} class="portrait"></canvas></span><span class="speech"><b>${esc(sp.name)}</b>${esc(text)}</span></button>`;
  el.hidden = false;
  el.classList.remove("out");
  el.onclick = () => setTimeout(() => { el.hidden = true; clearTimeout(speakerTimer); if (speakQueue.length) speak(...speakQueue.shift()); });
  paint(el);
  clearTimeout(speakerTimer);
  speakerTimer = setTimeout(() => {
    el.classList.add("out");
    speakerTimer = setTimeout(() => { el.hidden = true; speaking = null; if (speakQueue.length && !$("#dialog").open) speak(...speakQueue.shift()); }, 400);
  }, 6500);
}
// Payday, in the secretary's words: what came in, what went out and how the crowd grew.
let fansAtPayday = null;
function paydayNews(week) {
  const fans = fansAtPayday == null ? 0 : state.fans - fansAtPayday;
  fansAtPayday = state.fans;
  const net = week.net >= 0 ? "+$" + week.net.toLocaleString() : "−$" + Math.abs(week.net).toLocaleString();
  speak("helper", `Payday! ${net} this week after wages${week.upkeep ? " and upkeep" : ""}${fans > 0 ? ", and " + fans + " new fans" : ""}. ${week.net < 0 ? "We're spending more than we bring in." : "Nicely done, Coach."}`, `data-act="window" data-page="home"`);
}
// What changed at the kit shop overnight, in the shopkeeper's words.
function shopNews(before) {
  if (!G.systemUnlocked(state, "kit")) return;
  const stock = G.shopStock(state).length, shelf = G.bookShelf(state).join();
  const open = `data-act="window" data-page="shop"`;
  if (before.stock && stock > before.stock) return speak("shop", "New stock just in for a bigger club. Come and have a look!", open);
  if (state.saleDay === state.day) return speak("shop", "Clearance day! Thirty percent off everything, today only.", open);
  if (before.shelf && shelf !== before.shelf) return speak("shop", "Fresh delivery! New skill books: " + G.bookShelf(state).map((k) => SKILLS[ITEMS[k].skill].name).join(", ") + ".", open);
}

// ── Windows and dialogs ─────────────────────────────────────────────────
function openWindow(page, opts = {}) {
  if (state.match) return;
  if (!G.pageUnlocked(state, page)) { toast(G.systemProblem(state, G.pageSystem[page]), "info"); return; }
  // A window opens on its first tab.
  if (page !== view.window) {
    if (view.tabs) delete view.tabs[page];
    if (page === "train") view.trainTab = view.drill = null;
  }
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
  countUp(dlg);
  dlg.querySelectorAll("[data-choice]").forEach(
    (b) =>
      (b.onclick = () => {
        sfx("tap");
        dlg.close();
        choices[+b.dataset.choice].fn?.();
      }),
  );
  dlg.dataset.locked = o.locked ? "1" : "";
  if (!dlg.open) holdSpeaker();
  dlg.showModal();
  dlg.querySelector(".dialog-body").scrollTop = 0;
}
$("#dialog").addEventListener("cancel", (e) => {
  if ($("#dialog").dataset.locked) e.preventDefault();
});
// A new teammate gets a proper arrival: portrait, background and their first words to the club.
function welcomeAthlete(a, secret = false) {
  if (!a) return;
  save();
  render();
  world.replan();
  sfx(secret ? "goal" : "level");
  dialog(secret ? a.name + " joins!" : "Welcome, " + a.name.split(" ")[0] + "!", P.newcomer(state, a), [{ label: "Welcome aboard!", fn: () => (closeWindow(), world.say(a.id, voiceLine(a, "join", a.id + 1), 2600)) }], { eyebrow: secret ? "A secret character signs" : "New teammate", tone: "gold", cls: "newcomer-dialog" });
}
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
// Choosing who fills a meet entry: a picker with every athlete's portrait, stats and forecast.
function pickEntry(ev, k) {
  if (!EVENTS[ev] || state.match) return;
  dialog(EVENTS[ev].name + " · entry " + (k + 1), P.entryPicker(state, ev, k), [{ label: "Cancel", secondary: true }], { eyebrow: "Choose an athlete", tone: "news", cls: "entry-dialog" });
  $("#dialog").querySelectorAll("[data-pick]").forEach(
    (b) =>
      (b.onclick = () => {
        sfx("tap");
        $("#dialog").close();
        if (!G.assignEntry(state, ev, k, +b.dataset.pick)) toast("Choose different athletes; each athlete can enter two events.", "warn");
        save();
        render();
      }),
  );
}
function renameAthlete(id) {
  const a = state.roster.find((x) => x.id === id);
  if (!a) return;
  dialog("Rename " + a.name.split(" ")[0] + "?", P.renameBody(a), [{ label: "Cancel", secondary: true }, { label: "Save name" }], { eyebrow: "Squad", tone: "news", cls: "rename-dialog" });
  const dlg = $("#dialog"),
    input = dlg.querySelector("#athleteName"),
    saveBtn = dlg.querySelector('[data-choice="1"]'),
    problem = dlg.querySelector("#renameProblem");
  // The save button only closes the window for a name that works; otherwise it says why.
  saveBtn.onclick = () => {
    const why = G.renameProblem(state, a.id, input.value);
    if (why) {
      problem.textContent = why;
      problem.hidden = false;
      return input.focus();
    }
    sfx("tap");
    dlg.close();
    const old = a.name;
    G.renameAthlete(state, a.id, input.value);
    save();
    render();
    if (a.name !== old) toast(old + " is now " + a.name + ".");
  };
  input.addEventListener("keydown", (e) => e.key === "Enter" && (e.preventDefault(), saveBtn.click()));
  input.focus();
  input.select();
}
const growthBefore = (a) => ({ stats: [...a.stats], stamina: a.stamina, condition: a.condition, level: a.level, sp: a.sp, injury: a.injury, xp: a.xp, potential: a.potential });
// The payoff moment: a card with the athlete and their bars filling up.
function showGrowth(a, before, eyebrow, extra = []) {
  const ups = a.stats.map((v, i) => v - before.stats[i]),
    best = ups.indexOf(Math.max(...ups));
  const title = ups[best] > 1e-6 ? STAT_NAMES[best] + " up!" : a.level > before.level ? "Level up!" : a.stamina > before.stamina + 0.5 ? "Legs are back!" : a.condition > before.condition + 0.5 ? "Head in the game!" : "Done!";
  sfx("level");
  if (state.settings.quietMode !== false) { toast(a.name + ": " + title, "level"); return; }
  dialog(title, P.growth(a, before, extra), [{ label: "Back to the infield" }], { eyebrow, tone: "gold" });
}
// The ledger behind the top-bar counters: tabs switch currency and period in place.
function openLedger(cur = "money", days = 7) {
  G.reconcileLedger(state);
  dialog("The ledger", P.ledger(state, cur, days), [{ label: "Close" }], { eyebrow: "Club accounts", tone: "news", cls: "ledger-dialog" });
  const body = $("#dialog .dialog-body");
  body.querySelectorAll("[data-ledger-cur]").forEach((b) => (b.onclick = () => (sfx("tap"), openLedger(b.dataset.ledgerCur, days))));
  body.querySelectorAll("[data-ledger-days]").forEach((b) => (b.onclick = () => (sfx("tap"), openLedger(cur, +b.dataset.ledgerDays))));
}
// The item animation (P.itemFx): a small window over everything, which plays its sounds and
// counts each number up as its row arrives, then closes itself. A tap closes it early. It
// always plays, quiet mode or not: it is the answer to the coach's own tap.
const IFX = { land: 420, rows: 700, row: 280, hold: 1500 };
function itemFx(item, a, before) {
  let dlg = $("#item-fx");
  if (!dlg) {
    dlg = document.createElement("dialog");
    dlg.id = "item-fx";
    dlg.className = "item-fx";
    dlg.addEventListener("click", () => dlg.close());
    dlg.addEventListener("close", () => (dlg.timers || []).forEach(clearTimeout));
    document.body.append(dlg);
  }
  if (dlg.open) dlg.close();
  dlg.innerHTML = P.itemFx(state, item, a, before);
  paint(dlg);
  const still = reduced(),
    rows = [...dlg.querySelectorAll(".ifx-row")],
    later = (ms, fn) => dlg.timers.push(setTimeout(fn, still ? 0 : ms));
  dlg.classList.toggle("still", still);
  dlg.timers = [];
  dlg.showModal();
  later(IFX.land, () => sfx("stamp"));
  later(IFX.rows - 60, () => sfx("level"));
  rows.forEach((row, i) =>
    later(IFX.rows + i * IFX.row, () => {
      if (i) sfx("tap");
      const b = row.querySelector("b[data-to]");
      if (!b) return;
      const from = +b.dataset.from,
        to = +b.dataset.to,
        t0 = performance.now(),
        step = (now) => {
          const p = still ? 1 : Math.min(1, (now - t0) / 450);
          b.textContent = String(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))));
          if (p < 1 && dlg.open) requestAnimationFrame(step);
        };
      requestAnimationFrame(step);
    }),
  );
  dlg.timers.push(setTimeout(() => dlg.open && dlg.close(), (still ? 900 : IFX.rows + rows.length * IFX.row) + IFX.hold));
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
  view.drill = null;
  announce(snap);
  save();
  render();
  world.replan();
  // A session the coach just ran always plays out on its stage; quiet notifications only hold
  // back routine rewards, levels and goals.
  dialog(session.name, P.trainingStage(state, session, befores), [{ label: "Hit the showers" }], { eyebrow: "Training ground · step " + G.tierOf(session.level - (session.tierUp ? 1 : 0)) + " of 5", tone: "gold", cls: "training" });
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
    chemistry: session.chemistry,
    upgrade: session.tierUp ? session.levelUp : null,
    onChemistry: () => sfx("combo"),
    onReveal() {
      results.classList.add("show");
      dlg.querySelector(".stage-tap")?.remove();
      sfx(session.results.some((r) => r.quality === "excellent") ? "goal" : "stamp");
      if (session.levelUp) setTimeout(() => sfx(session.tierUp ? "level" : "combo"), 700);
      if (session.coachLevelUp) setTimeout(() => sfx("goal"), 1300);
    },
  });
  cv.onclick = () => player.skip();
  dlg.addEventListener("close", () => player.stop(), { once: true });
}
// Use a consumable and show what it did.
function applyItem(item, aid) {
  const snap = snapshot(),
    a = state.roster.find((x) => x.id === aid),
    before = a && growthBefore(a);
  const problem = G.itemProblem(state, item, aid);
  if (G.useItem(state, item, aid)) itemFx(item, a, before);
  else toast(problem || "That item won't help right now.", "warn");
  announce(snap);
  save();
  render();
}

function help(welcome = false) {
  stopPlaying();
  if (G.firstMeet(state)) return dialog(
    "A club starts here",
    P.opening(state),
    [{ label: welcome ? "To the first meet" : "Back to it", fn: () => {
      state.welcomed = true;
      save();
      if (welcome) startFirstDuel();
    } }],
    { helper: true, eyebrow: "Ring & Sector · Your club story" },
  );
  dialog(
    welcome ? "Welcome home, Coach!" : "How to play",
    `<p>${welcome ? "I'm " + HELPER + ", club secretary. Four throwers, one patchy field, big dreams." : "The drill, one more time:"}</p>
    <ol class="howto"><li><b>Book a meet</b> from the flag. A duel is a good first test.</li>
    <li><b>Train</b> and watch the days roll by. Stats pop up as they grow.</li>
    <li><b>Compete</b>, win prizes, then <b>build</b> and <b>shop</b> to get stronger.</li></ol>
    <p class="hint">Drag to look around and tap anything. Time only runs while you train.</p>${P.leagueTutorial()}<details class="card league-tutorial"><summary>How meets work</summary>${P.meetGuide(state)}</details>`,
    [{ label: welcome ? "Let's throw!" : "Back to it", fn: () => ((state.welcomed = true), save()) }],
    { helper: true },
  );
}

function startFirstDuel() {
  if (!G.firstMeet(state) || state.match) return;
  stopPlaying();
  if (state.pendingEvent) return showEvent();
  if (!state.competition && !G.enterCompetition(state, { kind: "duel", tier: 0 })) return;
  state.welcomed = true;
  openWindow(state.day >= state.matchDay ? "lobby" : "home");
  save();
}

// ── Time ────────────────────────────────────────────────────────────────
// Training is the show: once the clock runs, step out of the window so the club is in view.
function watchClub() {
  if (view.playing && view.window) closeWindow();
}
function stopPlaying() {
  if (!view.playing) return;
  view.playing = false;
  refresh();
}
function play(speed = state.settings.speed || 1) {
  if (state.match || !["planning", "season"].includes(state.phase) || (state.matchDay != null && state.day >= state.matchDay)) return;
  if (state.pendingEvent) return showEvent();
  speed = playbackSpeed(speed);
  state.settings.speed = speed;
  view.playing = true;
  // Carry on from the time already on the clock.
  lastDayAt = performance.now() - DAY_MS[speed] * view.dayP;
  save();
  render();
}
function doDay(now) {
  if (state.pendingEvent) return showEvent();
  const before = snapshot(), shopBefore = G.systemUnlocked(state, "kit") ? { stock: G.shopStock(state).length, shelf: G.bookShelf(state).join() } : {};
  const r = G.advanceDay(state);
  if (!r.ok) { if (r.reason) toast(r.reason); return stopPlaying(); }
  lastDayAt = now;
  if (!view.playing) view.dayP = 0.25;
  world.onDay(state, r, now, view.playing ? DAY_MS[state.settings.speed] : 1600);
  if (r.spend.length) setTimeout(() => sfx("coin"), 600);
  // One toast for everyone who levelled up today; the world shows each of them celebrating.
  // Quiet mode keeps routine level-ups in the journal, but a level that opens a rank is news.
  const opened = r.levelUps.filter((l) => state.roster.find((a) => a.id === l.id) && G.levelRewards(state.roster.find((a) => a.id === l.id), l.level).length > 1);
  if (opened.length && state.settings.quietMode !== false && G.systemUnlocked(state, "skills")) {
    toast(opened.map((l) => l.name.split(" ")[0] + " reached Lv. " + l.level + ": " + G.levelRewards(state.roster.find((a) => a.id === l.id), l.level).slice(1).join(", ")).join(" · ") + ".", "level", "levelup");
    sfx("level");
  }
  if (r.levelUps.length && state.settings.quietMode === false) {
    const names = r.levelUps.map((l) => l.name.split(" ")[0]);
    toast((names.length > 1 ? names.slice(0, -1).join(", ") + " and " + names.at(-1) + " levelled up!" : r.levelUps[0].name + " hits level " + r.levelUps[0].level + "!") + (G.systemUnlocked(state, "skills") ? " Skill points to spend." : ""), "level", "levelup");
    sfx("level");
  }
  if (r.invitation && state.settings.quietMode === false) {
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
    speak("helper", "Meet day! " + G.opponent(state)?.name + " are here. The squad's in the call room when you're ready.", `data-act="lobby"`);
    sfx("event");
  }
  if (r.week) paydayNews(r.week);
  if (!(state.matchDay != null && state.day >= state.matchDay)) shopNews(shopBefore);
  refresh();
  if (r.ceremony) stopPlaying(), setTimeout(() => showCeremony(), 600);
  else if (r.event) setTimeout(showEvent, 500);
}

// ── Meet presentation ───────────────────────────────────────────────────
// One-time pointers through a club's first meets. A tip stays up until dismissed; one that
// arrives while another is fresh waits its turn.
const tips = { queue: [], shownAt: 0, timer: 0 };
function meetTip(id) {
  // Settled clubs (past the run of club-system introductions) have seen it all.
  if (id !== "champs" && !G.nextIntroduction(state)) return;
  if ((state.settings.meetTips || []).includes(id) || tips.queue.includes(id)) return;
  tips.queue.push(id);
  showTip();
}
function showTip(force = false) {
  const el = $("#meetTip");
  if (!state.match || state.match.phase === "complete" || !tips.queue.length) return;
  if (!el.hidden && !force && performance.now() - tips.shownAt < 6000) return;
  const id = tips.queue.shift();
  state.settings.meetTips = [...(state.settings.meetTips || []), id];
  el.innerHTML = P.meetTip(id);
  el.hidden = false;
  tips.shownAt = performance.now();
  // A tip steps aside by itself after a while, so it never sits over the field for long.
  clearTimeout(tips.timer);
  tips.timer = setTimeout(() => { el.hidden = true; showTip(true); }, 9000);
  save();
}
function hideTip() {
  clearTimeout(tips.timer);
  $("#meetTip").hidden = true;
  tips.queue = [];
}
function meetGuide() {
  dialog("How meets work", P.meetGuide(state), [{ label: state.match && state.match.phase !== "complete" ? "Back to the meet" : "Got it" }], { eyebrow: "Meet guide", cls: "guide-dialog" });
}
function startBeat(beat) {
  presenter = { beat, el: 0, base: beatDuration(beat), cues: [] };
  const cue = (at, fn) => presenter.cues.push({ at, fn });
  if (beat.type === "throw") {
    view.hide = { side: beat.side, eventIndex: beat.eventIndex, attempt: beat.attempt };
    const offset = throwOffset(beat), timing = throwTiming(beat);
    if (hasCutIn(beat)) cue(SETUP_MS, () => sfx("skill"));
    cue(offset + timing.releaseAt, () => sfx("whoosh"));
    if (hasCutIn(beat)) cue(SETUP_MS + CUTIN_MS, () => meetTip("skill"));
    cue(offset + timing.landAt, () => {
      view.hide = null;
      // This mark stays on the board through the next thrower until their mark lands.
      view.lastMark = beat;
      meetTip(beat.foul ? "foul" : "field");
      sfx(beat.mark == null ? "foul" : "land");
      if (beat.side === "home" && beat.mark != null && (beat.newPb || beat.leading || beat.scoringSwing>0)) sfx("cheer");
      if (beat.worldRecord) {
        sfx("win");
        toast("WORLD RECORD! " + beat.name + " · " + beat.mark.toFixed(2) + " m", "goal", "trophy");
      }
      render();
    });
    if (celebrates(beat)) cue(offset + timing.landAt + LANDING_HOLD_MS, () => sfx("goal"));
  } else if (beat.type === "eventEnd") sfx(beat.h > beat.a ? "cheer" : "event"), meetTip("eventEnd");
  else if (beat.type === "eventStart") sfx("event"), (view.lastMark = null);
  else if (beat.type === "meetStart") sfx("cheer"), meetTip(state.match.prelimFinals ? "champs" : "start");
  else if (beat.type === "decide" && beat.clutch) meetTip("clutch");
  else if (beat.type === "complete") {
    hideTip();
    sfx(beat.win ? "win" : beat.draw ? "event" : "lose");
    for (const id of state.settings.quietMode === false ? state.match.rewards?.goals || [] : []) toast("Goal complete: " + G.GOALS.find((g) => g.id === id)?.name, "goal", "target");
  }
  render();
}
// Skip ahead: "mine" runs on to the start of your next throw, "event" to the end of this event.
// Anything that needs you (a coaching call, the meet's end) still stops the skip.
// The speed the current throw plays at: the chosen meet speed, unless this one throw was given
// its own (your throw after "My next throw", or the speed picked in the tactic panel).
const meetSpeedNow = () => (presenter && view.beatSpeed?.beat === presenter.beat ? view.beatSpeed.speed : view.meetSpeed);
function skipMeet(to) {
  const m = state.match;
  if (!m || m.phase === "complete" || m.phase === "decide" || $("#dialog").open) return;
  if (presenter?.beat?.type === "throw") view.lastMark = presenter.beat;
  presenter = null;
  view.hide = null;
  view.meetPaused = false;
  const event = m.eventIndex;
  for (let guard = 0; guard < 4000; guard++) {
    const beat = G.advanceMatch(state);
    if (!beat) break;
    const stop = beat.type === "decide" || beat.type === "complete" || m.phase === "complete" ||
      (to === "mine" && beat.type === "throw" && beat.side === "home") || (to === "event" && beat.type === "eventEnd" && beat.eventIndex === event);
    if (stop) {
      // Skipping to your throw shows it at watch speed, whatever speed the meet is running at;
      // in Coach mode the tactic panel opens with watch speed picked for it.
      if (to === "mine" && beat.type === "throw") view.beatSpeed = { beat, speed: WATCH_SPEED };
      if (to === "mine" && beat.type === "decide") view.throwSpeed = WATCH_SPEED;
      return save(), startBeat(beat);
    }
    if (beat.type === "throw") view.lastMark = beat;
    if (beat.type === "eventStart") view.lastMark = null;
  }
  save();
  render();
}
function pumpMeet(dt) {
  const m = state.match;
  if (!m) return;
  if (view.meetPaused) return;
  if (presenter) {
    presenter.el = advanceBeatClock(presenter.beat, presenter.el, dt, meetSpeedNow(), state.settings);
    for (const c of presenter.cues) if (!c.done && presenter.el >= c.at) (c.done = true), c.fn();
    if (presenter.el < presenter.base) return;
  }
  if ($("#dialog").open || m.phase === "decide" || m.phase === "complete") return;
  const beat = G.advanceMatch(state);
  save();
  if (beat) startBeat(beat);
}
function decide(tactic, quality = "good") {
  const beat = G.decideThrow(state, tactic, quality, view.sig),
    speed = view.throwSpeed;
  view.throwSpeed = null;
  if (beat && speed && speed !== view.meetSpeed) view.beatSpeed = { beat, speed };
  view.sig = false;
  view.meter = null;
  view.meetPaused = false;
  if (beat) {
    save();
    startBeat(beat);
  }
}
const meter = { start: 0 };
const meterPos = (now) => {
  const p = ((now - meter.start) / 2500) % 2;
  return p <= 1 ? p : 2 - p;
};

// ── Input ───────────────────────────────────────────────────────────────
// A tap on the map that opens a window must not also press whatever appears under the finger
// (phones deliver the click after the window is drawn). Ignore window taps for a moment.
let tapGuardUntil = 0;
$("#app").addEventListener("click", async (e) => {
  if (performance.now() < tapGuardUntil && e.target.closest("#window")) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }
  const b = e.target.closest("[data-act]");
  if (!b || b.disabled) return;
  unlockAudio();
  const act = b.dataset.act,
    id = +b.dataset.id,
    before = snapshot();
  if (!["release", "tactic"].includes(act)) sfx("tap");
  switch (act) {
    case "ledger":
      return openLedger(b.dataset.cur);
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
    case "main-menu": return showMainMenu();
    case "mm-load": return chooseSlot(+b.dataset.slot);
    case "mm-new": return newClub(+b.dataset.slot);
    case "mm-delete": return deleteSlot(+b.dataset.slot);
    case "mm-import": return importSave(true);
    case "mm-settings": return openGameMenu("settings");
    case "mm-help": return help();
    case "install-update": return installUpdate();
    case "save-exit": return saveFromMenu(true);
    case "zoom":
      return world.zoomBy(+b.dataset.step);
    case "recenter":
      return world.home();
    case "play":
      return play(), watchClub();
    case "pause":
      return stopPlaying(), render();
    case "speed":
      return +b.dataset.speed ? (play(+b.dataset.speed), watchClub()) : (stopPlaying(), render());
    case "first-duel":
      return startFirstDuel();
    case "day":
      if (state.pendingEvent) return showEvent();
      return doDay(performance.now());
    case "lobby":
      if (!state.competition || state.phase !== "season") return openWindow("league");
      stopPlaying();
      if (G.lineupProblem(state)) G.autoLineup(state);
      return openWindow("lobby");
    case "edit-lineup":
      view.editLineup = !view.editLineup;
      break;
    case "pick-entry":
      return pickEntry(b.dataset.event, +b.dataset.slot);
    case "rename-athlete":
      return renameAthlete(+b.dataset.id);
    case "autolineup":
      G.autoLineup(state);
      toast("Strongest lineup entered.");
      break;
    case "medical":
      if (!G.medicalDay(state)) toast("Only available when an injured athlete is in the lineup.");
      break;
    case "enter":
      view.meetStandards=false;
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
      view.lastMark = null;
      view.meter = null;
      view.meetPaused = false;
      break;
    case "meet-skip":
      return skipMeet(b.dataset.to);
    case "meet-pause":
      view.meetPaused = !view.meetPaused;
      break;
    case "meet-guide":
      return meetGuide();
    case "tip-ok":
      clearTimeout(tips.timer);
      $("#meetTip").hidden = true;
      return showTip(true);
    case "meet-mode":
      state.settings.meetMode = b.dataset.value;
      if (state.settings.meetMode === "watch" && state.match?.phase === "decide") return decide(state.match.last?.recommended || "balanced");
      break;
    case "follow-athlete":
      state.settings.followAthlete=state.settings.followAthlete===id?null:id;
      break;
    case "highlights":
      state.settings.highlights=!state.settings.highlights;
      break;
    case "meet-speed":
      view.meetSpeed = state.settings.meetSpeed = playbackSpeed(+b.dataset.speed);
      view.beatSpeed = null;
      break;
    case "throw-speed":
      view.throwSpeed = playbackSpeed(+b.dataset.speed);
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
    case "leave":
      G.leaveMatch(state);
      hideTip();
      presenter = null;
      world.reset();
      // Land on the club desk, which says what comes next, unless a page was asked for.
      view.window = state.phase !== "seasonEnd" && G.pageUnlocked(state, b.dataset.page) && P.WINDOW_TITLES[b.dataset.page] ? b.dataset.page : "home";
      // Straight to an athlete's skills, from their growth card.
      if (view.window === "squad" && b.dataset.athlete) (view.athlete = +b.dataset.athlete), (view.tab = "skills");
      if (state.phase === "seasonEnd") sfx(state.champion ? "win" : "event");
      break;
    case "book-league":
    case "book-duel": {
      stopPlaying();
      if (state.pendingEvent) return showEvent();
      const booked = G.enterCompetition(state, { kind: act === "book-duel" ? "duel" : "league", tier: +b.dataset.tier,
        stage: +(b.dataset.stage || 0), rival: +(b.dataset.rival || 0), preparation: view.preparation || 5, spacing: view.spacing || 7 });
      if (booked) { view.window = G.firstMeet(state) ? "lobby" : "home"; view.rival = null; world.replan(); toast(G.firstMeet(state) ? "Your first rival is ready. Let's throw!" : "Booked for day " + state.matchDay + ". The countdown starts now."); }
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
    case "coach-athlete":
      view.trainees = [id];
      return openWindow("train");
    case "qualification":
      (view.tabs ??= {}).league="qualification";
      openWindow("league");
      (view.tabs ??= {}).league="qualification";
      return render(false);
    case "meet-standards":
      view.meetStandards=!view.meetStandards;
      return render(false);
    case "page-tab":
      (view.tabs ??= {})[b.dataset.page] = b.dataset.tab;
      break;
    case "drill-family":
      view.drillFamily = b.dataset.value;
      break;
    case "pick-drill":
      view.drill = b.dataset.drill || null;
      return render(false);
    case "train-tab":
      view.trainTab = b.dataset.tab;
      break;
    case "trainee": {
      const list = P.trainees(state, view).filter((x) => x !== id);
      if (list.length === P.trainees(state, view).length) list.push(id);
      view.trainees = list.slice(-G.MAX_GROUP);
      break;
    }
    case "apply-group-plan": {
      const ids=G.coachingTargets(state,b.dataset.scope,P.trainees(state,view));
      const result=G.applyTrainingPlanGroup(state,ids,b.dataset.plan);
      if(result.ok) {
        G.setAutoMeetPrep(state,false);
        toast(PLANS[b.dataset.plan].name+" applied to "+result.applied.length+" athletes"+(result.skipped.length?" · "+result.skipped.length+" skipped":"")+".");
        world.replan();
      } else toast(result.problem||"Could not apply this plan.","warn");
      break;
    }
    case "unlock-plan":
      if (G.unlockPlan(state,id,b.dataset.value)) {
        G.setTrainingPlan(state,id,b.dataset.value);
        G.setAutoMeetPrep(state,false);
        world.replan();
        toast("Unlocked and assigned " + PLANS[b.dataset.value].name + ". Manual preparation is active.","level");
      }
      break;
    case "plan": {
      const a = state.roster.find((x) => x.id === id);
      if (a) G.setTrainingPlan(state,a.id,b.dataset.value);
      world.replan();
      break;
    }
    case "buy-book": {
      const item = b.dataset.item;
      return confirmPurchase(item, () => {
        if (G.buyBook(state, item)) { toast(ITEMS[item].name + " is in the kit bag. Read it from an athlete's Skills tab.", "level", "spark"); sfx("coin"); }
        else toast("That book isn't on the shelf any more.", "warn");
      }, "One copy a week: read it from an athlete's Skills tab.");
    }
    case "read-book": {
      const k = b.dataset.item, skill = ITEMS[k]?.skill;
      if (G.readBook(state, id, k)) { toast("Learned " + SKILLS[skill].name + "!", "level", "spark"); sfx("level"); save(); }
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
        const star = (a.stars || 0) > 0;
        if (state.settings.quietMode !== false) { toast(a.name + " promoted to " + G.rankName(a) + ".", "level"); break; }
        dialog(star ? G.rankName(a) + "!" : "A new " + RANKS[a.rank].name + "!", `<div class="promo">${P.portrait(a, "large")}<p><b>${esc(a.name)}</b> is now <b>${esc(G.rankName(a))}</b>. Their limit is higher, every stat gains a point${!star && RANKS[a.rank].slots > RANKS[a.rank - 1].slots ? " and there's a new skill slot" : ""}.</p></div>`, [{ label: "Wonderful!" }], { eyebrow: "PROMOTION", tone: "gold" });
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
      // Pick who it's for first, so the confirmation can say so.
      const buyThenUse = (aid) => confirmPurchase(item, () => {
        if (!G.buyItem(state, item)) return toast("Not enough money.", "warn");
        sfx("coin");
        applyItem(item, aid);
      }, d.team ? "Used on the whole squad straight away." : "Used on " + state.roster.find((x) => x.id === aid)?.name + " straight away.", "Buy & use");
      if (!d.team) return chooseAthlete("Who gets the " + d.name + "?", item, buyThenUse);
      const problem = G.itemProblem(state, item);
      if (problem) toast(problem + ".", "warn");
      else buyThenUse();
      return;
    }
    case "buy-gear": {
      const item = b.dataset.item;
      return confirmPurchase(item, () => {
      if (!G.buyItem(state, item)) return;
      sfx("coin");
      save();
      render();
      chooseAthlete("Equip the " + ITEMS[item].name + " now?", item, (aid) => {
        if (G.equipItem(state, aid, item)) toast(ITEMS[item].name + " equipped on " + state.roster.find((x) => x.id === aid)?.name + ".", "level", "shop");
        save();
        render();
      }, "Keep in the bag");
      }, "Equip it on an athlete next, or keep it in the bag.");
    }
    case "equip": {
      const item = b.dataset.item;
      return chooseAthlete("Equip " + ITEMS[item].name + "…", item, (aid) => {
        if (G.equipItem(state, aid, item)) toast(ITEMS[item].name + " equipped.");
        save();
        render();
      });
    }
    case "buy": {
      const item = b.dataset.item;
      return confirmPurchase(item, () => {
        if (G.buyItem(state, item)) {
          toast(ITEMS[item].name + " packed in the kit bag.", "info", "shop");
          sfx("coin");
        }
      }, "It goes in the kit bag until you use it.");
    }
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
      // Nothing is built or upgraded without a yes.
      const key = b.dataset.key,
        lvl = state.stadium[key];
      if (G.stadiumProblem(state, key)) return toast(G.stadiumProblem(state, key), "warn");
      return dialog((lvl ? "Upgrade the " : "Build the ") + STADIUM[key].name.toLowerCase() + "?", P.stadiumConfirmBody(state, key), [
        { label: (lvl ? "Upgrade · " : "Build · ") + cash(STADIUM[key].cost[lvl]), fn: () => confirmStadium(key) },
        { label: "Not now", secondary: true },
      ], { eyebrow: "Groundskeeping", tone: "shop" });
    }
    case "build": {
      const i = +b.dataset.index,
        type = b.dataset.type;
      return dialog("Build a " + FACILITIES[type].name + " here?", P.buildConfirmBody(state, i, type), [
        { label: "Build · " + cash(FACILITIES[type].cost), fn: () => confirmBuild(i, type), disabled: state.money < FACILITIES[type].cost },
        { label: "Not now", secondary: true },
      ], { eyebrow: "Groundskeeping", tone: "shop" });
    }
    case "upgrade": {
      const i = +b.dataset.index,
        p = state.plots[i];
      if (!p) break;
      return dialog("Upgrade the " + FACILITIES[p.type].name + " to level " + (p.level + 1) + "?", P.upgradeConfirmBody(state, i), [
        { label: "Upgrade · " + cash(G.upgradeCost(p.type, p.level)), fn: () => confirmUpgrade(i), disabled: state.money < G.upgradeCost(p.type, p.level) },
        { label: "Not now", secondary: true },
      ], { eyebrow: "Groundskeeping", tone: "shop" });
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
      if (G.recruit(state, id)) welcomeAthlete(state.roster.at(-1));
      break;
    case "sign-secret":
      if (G.signSecret(state, b.dataset.key)) welcomeAthlete(state.roster.at(-1), true);
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
      const cat = b.dataset.cat, key = b.dataset.key, o = CUSTOMISE[cat]?.options[key];
      if (!o) break;
      const problem = G.customProblem(state, cat, key);
      if (problem) return toast(problem, "warn");
      return dialog("Buy " + o.name + "?", P.lookConfirmBody(state, cat, key), [
        { label: "Buy · " + cash(o.cost), fn: () => {
          if (G.buyCustom(state, cat, key)) { toast(o.name + " bought and in use.", "info", "star"); sfx("coin"); }
          else toast(G.customProblem(state, cat, key) || "Not available.", "warn");
          save();
          render();
        }, disabled: state.money < o.cost },
        { label: "Not now", secondary: true },
      ], { eyebrow: "Kit & stadium", tone: "shop" });
    }
    case "use-look":
      G.useCustom(state, b.dataset.cat, b.dataset.key);
      break;
    case "palette":
      state.colors = { ...state.colors, primary: CLUB_PALETTES[+b.dataset.index].primary, secondary: CLUB_PALETTES[+b.dataset.index].secondary };
      break;
    case "check-update":
      await checkForUpdates({ force: true });
      break;
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
// Confirmed construction: build, then show it off on the map.
// Every shop purchase asks first: what it is, the price, and the money left after.
function confirmPurchase(item, buy, note = "", verb = "Buy") {
  const price = G.itemPrice(state, item);
  dialog(verb + " " + ITEMS[item].name + "?", P.itemConfirmBody(state, item, note), [
    { label: verb + " · " + cash(price), fn: () => (buy(), save(), render()), disabled: state.money < price },
    { label: "Not now", secondary: true },
  ], { eyebrow: "Kit shop", tone: "shop" });
}
function confirmBuild(i, type) {
  const before = snapshot();
  if (!G.build(state, i, type)) return toast("That can't be built here right now.", "warn");
  closeWindow();
  world.flashPlot(i, "BUILT!");
  sfx("build");
  toast("The " + FACILITIES[type].name + " is open!", "info", "build2");
  announce(before);
  save();
  render();
}
function confirmUpgrade(i) {
  const before = snapshot();
  if (!G.upgrade(state, i)) return toast("That upgrade isn't available right now.", "warn");
  closeWindow();
  world.flashPlot(i, "LEVEL " + state.plots[i].level + "!");
  sfx("build");
  announce(before);
  save();
  render();
}
function confirmStadium(key) {
  const before = snapshot(),
    r = G.upgradeStadium(state, key);
  if (!r) return toast(G.stadiumProblem(state, key) || "That upgrade isn't available right now.", "warn");
  closeWindow();
  world.flashSpot(key, r.level === 1 ? "BUILT!" : "LEVEL " + r.level + "!");
  sfx("build");
  toast(STADIUM[key].name + ": " + STADIUM[key].levels[r.level] + "!", "level", "stadium");
  announce(before);
  save();
  render();
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
  if(kind === "auto-prep") {
    G.setAutoMeetPrep(state,el.checked);
    view.showGroupPlans=!state.settings.autoMeetPrep;
    const details=$("#panel .group-plans"); if(details) details.open=view.showGroupPlans;
    world.replan();
  }
  if(kind === "plan-scope") view.planScope=el.value;
  if(kind === "group-plan") view.groupPlan=el.value;
  if (kind === "bulk") {
    const result=G.applyTrainingPlanGroup(state,state.roster.map(a=>a.id),el.value);
    if(result.ok) { G.setAutoMeetPrep(state,false); if(result.skipped.length) toast(result.skipped.length+" athletes skipped: assigned staff or injured."); }
    else toast(result.problem,"warn");
  }
  if (kind === "plan" && a) G.setTrainingPlan(state,a.id,el.value);
  if (kind === "plan" || kind === "bulk") world.replan();
  if (kind === "booking-preparation") view.preparation = +el.value;
  if (kind === "booking-spacing") view.spacing = +el.value;
  if (kind === "loadouts" && a) G.enableLoadouts(state, a.id, el.checked);
  if (kind === "autorest" && a) a.autoRest = el.checked;
  if (kind === "autotaper" && a) a.autoTaper = el.checked;
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
// From the main menu a backup goes into the first empty slot (or replaces the selected club
// when every slot is in use); from the Office it replaces the current club.
function importSave(fromMenu = false) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.onchange = async () => {
    try {
      if (!input.files[0]) return;
      if (input.files[0].size > 3000000) throw Error("The save is too large.");
      const incoming = validateCampaign(JSON.parse(await input.files[0].text()));
      const empty = fromMenu ? (await listSlots(summarise)).findIndex((x) => !x) : -1,
        target = empty >= 0 ? empty : slot;
      dialog("Restore this club?", `<p>${esc(incoming.clubName)} · Season ${incoming.season} · ${LEAGUES[incoming.league].name}</p><p>${empty >= 0 ? `It goes into slot ${target + 1}.` : "This replaces the current club. Export it first to keep it."}</p>`, [
        {
          label: "Restore club",
          fn: async () => {
            await useClub(target, incoming);
            if ($("#mainMenu").open) closeMainMenu();
            else save();
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

// ── Save slots and the main menu ────────────────────────────────────────
const summarise = (raw) => {
  const c = validateCampaign(raw);
  return { clubName: c.clubName, league: c.league, season: c.season, day: c.day, money: c.money, fans: c.fans, colors: c.colors };
};
// Make slot n the one in play, with `incoming` as its club, or whatever it holds (a new club
// when it is empty). The previous club is saved first.
async function useClub(n, incoming = null) {
  stopPlaying();
  if (saveEnabled && !unreadable && store.read() != null) {
    try {
      store.write(JSON.stringify(state));
      await store.flush();
    } catch {}
  }
  const next = await slotStore(n),
    text = next.read();
  state = incoming || (text ? validateCampaign(JSON.parse(text)) : G.newGame());
  store = next;
  slot = n;
  unreadable = false;
  await setActiveSlot(n);
  for (const key of Object.keys(counters)) counters[key] = { shown: state[key], seen: state[key] };
  newsSeen = state.log[0];
  shownInsights = null;
  presenter = null;
  Object.assign(view, { window: null, athlete: null, selected: null, moving: null, meetSpeed: state.settings.meetSpeed || 1 });
  setSound(state.settings.sound);
  world.reset();
  render(false);
}
async function showMainMenu() {
  stopPlaying();
  if ($("#gameMenu").open) closeGameMenu();
  // Leave the current club safely saved, unless it is a new club that was never started.
  if (saveEnabled && (store.read() != null || state.welcomed)) {
    save();
    await store.flush().catch(() => {});
  }
  const box = $("#mainMenu");
  box.innerHTML = P.mainMenu(await listSlots(summarise), { active: slot, update: updateInfo(), native: isNativeApp() });
  if (!box.open) box.showModal();
}
function closeMainMenu() {
  if (!$("#mainMenu").open || unreadable) return;
  $("#mainMenu").close();
  save();
  render(false);
  if (!state.welcomed) help(true);
  else if (state.pendingEvent) showEvent();
}
async function chooseSlot(n) {
  if (n !== slot || unreadable) {
    try {
      await useClub(n);
    } catch {
      return toast("That club could not be opened.", "warn");
    }
  }
  closeMainMenu();
  // A ceremony the club hasn't seen yet still takes place.
  if (state.ceremony) setTimeout(() => showCeremony(), 400);
}
// Awards night: Juno's welcome, each award in turn, then a look at the world's best.
function showCeremony(step = 0) {
  const steps = P.ceremonySteps(state);
  if (!steps.length) return;
  const st = steps[step], last = step === steps.length - 1;
  dialog(st.title, st.body, [{ label: last ? "Back to the club" : step === 0 ? "On with the show" : "Next", fn: () => {
    if (!last) return showCeremony(step + 1);
    state.ceremony = null;
    save();
    render();
    if (state.pendingEvent) setTimeout(showEvent, 400);
  } }], { eyebrow: st.eyebrow, tone: "gold", cls: "ceremony-dialog " + (st.cls || ""), helper: step === 0, locked: true });
  sfx(st.cls === "ceremony-mvp" ? "win" : step === 0 ? "cheer" : last ? "goal" : "level");
}
async function newClub(n) {
  const slots = await listSlots(summarise);
  const start = async () => {
    await clearSlot(n);
    await useClub(n, G.newGame());
    closeMainMenu();
  };
  if (!slots[n]) return start();
  dialog("Start over in this slot?", `<p><b>${esc(slots[n].clubName || "This club")}</b> will be replaced by a new club. Export it first to keep it.</p>`, [
    { label: "Replace with a new club", fn: start },
    { label: "Cancel", secondary: true },
  ], { tone: "warn", eyebrow: "Slot " + (n + 1) });
}
async function deleteSlot(n) {
  const slots = await listSlots(summarise);
  if (!slots[n]) return;
  dialog("Delete this club?", `<p><b>${esc(slots[n].clubName || "This save")}</b> will be removed from slot ${n + 1}. This can't be undone unless you exported a backup.</p>`, [
    {
      label: "Delete club",
      fn: async () => {
        await clearSlot(n);
        // The slot in play stays selected, ready for a new club, but nothing is saved into it.
        if (n === slot) await useClub(n, G.newGame());
        showMainMenu();
        toast("Club deleted.");
      },
    },
    { label: "Cancel", secondary: true },
  ], { tone: "warn", eyebrow: "Slot " + (n + 1) });
}

// ── Updates ─────────────────────────────────────────────────────────────
// A badge under the HUD while an update downloads and once it is ready to install.
function updateBadge(u = updateInfo()) {
  const el = $("#updateBadge");
  const show = u.phase === "downloading" || u.pending;
  el.hidden = !show;
  if (show) el.innerHTML = u.pending ? `<button class="button primary" data-act="install-update">${ico("star")}<span>Update ready · Restart</span></button>` : `<span class="update-downloading">Downloading update · ${u.percent}%<i style="width:${u.percent}%"></i></span>`;
  const box = $("#mmUpdate");
  if (box) box.innerHTML = P.updateBlock(u, isNativeApp());
}
// The main menu stays until a club is chosen.
$("#mainMenu").addEventListener("cancel", (e) => e.preventDefault());
let updatePhase = null;
onUpdateChange((u) => {
  updateBadge(u);
  if (u.phase !== updatePhase && view.window === "club") render(false);
  updatePhase = u.phase;
});
async function installUpdate() {
  if (!hasPendingUpdate()) return;
  if (!mayRestart(state, view.playing)) return toast("Finish the meet or pause training first. The update also installs the next time the app starts.", "warn");
  dialog("Install the update now?", `<p>Your club is saved, then the game restarts into version ${esc(updateInfo().pendingVersion || "")}. It takes a few seconds.</p>`, [
    {
      label: "Restart and install",
      fn: async () => {
        save();
        try {
          await store.flush();
        } catch {
          return toast("Could not save, so the update waits. Try again in a moment.", "warn");
        }
        $("#bootStatus").textContent = "Installing the game update…";
        $("#bootStatus").hidden = false;
        if (!(await applyPendingUpdate())) {
          $("#bootStatus").hidden = true;
          updateBadge();
          toast(updateStatus(), "warn");
        }
      },
    },
    { label: "Later", secondary: true },
  ], { eyebrow: "Game update" });
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
  tapGuardUntil = performance.now() + 450;
  sfx("tap");
  if (hit.kind === "athlete") {
    // A quick hello before their file opens.
    const a = state.roster.find((x) => x.id === hit.id);
    if (a) world.say(a.id, voiceLine(a, idleSituation(state, a), performance.now() / 997), 2000);
    return openWindow("squad", { athlete: hit.id });
  }
  if (hit.kind === "plot") return selectPlot(hit.index);
  if (hit.kind === "stadium") return openWindow("build", { selected: { kind: "stadium", key: hit.key } });
});
worldCanvas.addEventListener("pointercancel", (e) => pointers.delete(e.pointerId));
worldCanvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  world.zoomBy(e.deltaY < 0 ? 0.5 : -0.5, e.clientX, e.clientY);
}, { passive: false });
document.addEventListener("keydown", (e) => {
  if ($("#gameMenu").open || $("#mainMenu").open) return;
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
    if ($("#mainMenu").open && !$("#dialog").open) return true;
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

function floatDelta(key, delta) {
  const box = $("#hud .res." + key);
  if (!box || !delta) return;
  const r = box.getBoundingClientRect(),
    el = document.createElement("span");
  el.className = "hud-delta " + (delta > 0 ? "up" : "down") + " " + key;
  el.textContent = (delta > 0 ? "+" : "−") + counterText(key, Math.abs(delta));
  el.style.left = r.left + r.width / 2 + "px";
  el.style.top = r.bottom + 2 + "px";
  $("#app").append(el);
  setTimeout(() => el.remove(), 1300);
}
function tickCounters(dt) {
  for (const [key, c] of Object.entries(counters)) {
    const target = state[key];
    if (target !== c.seen) {
      floatDelta(key, target - c.seen);
      c.seen = target;
    }
    if (c.shown === target) continue;
    const gap = target - c.shown;
    c.shown = Math.abs(gap) <= 1 || reduced() ? target : c.shown + gap * Math.min(1, dt / 140);
    const el = $("#hud .res." + key + " b");
    if (el) el.textContent = counterText(key, c.shown);
  }
}
// The club news: each new bulletin slides across a ticker under the HUD, one at a time.
let newsSeen = state.log[0],
  newsBusy = false;
const newsQueue = [];
function tickNews() {
  if (state.log[0] !== newsSeen) {
    const fresh = [];
    for (const entry of state.log) {
      if (entry === newsSeen) break;
      fresh.push(entry);
    }
    newsQueue.push(...fresh.reverse().slice(-3));
    newsSeen = state.log[0];
  }
  if (newsBusy || !newsQueue.length || state.match) return;
  const entry = newsQueue.shift(),
    el = $("#ticker"),
    secs = Math.max(5, Math.min(11, entry.text.length / 9));
  newsBusy = true;
  el.innerHTML = `<b>${ico("news")} NEWS</b><span><span style="--dur:${secs}s">${esc(entry.text)}</span></span>`;
  el.hidden = false;
  setTimeout(() => {
    el.hidden = true;
    newsBusy = false;
  }, secs * 1000 + 250);
}
function frame(now) {
  const dt = Math.min(100, now - (lastFrame || now));
  lastFrame = now;
  tickCounters(dt);
  tickNews();
  if (!document.hidden && !$("#gameMenu").open) {
    if (state.match) {
      pumpMeet(dt);
      const bar = $("#meetbar");
      const arena = $("#stadium").getBoundingClientRect();
      const sidePanel = !bar.hidden && bar.getBoundingClientRect().left >= arena.right;
      // The camera keeps clear of the score bar and the meet panel where they actually sit on screen,
      // which includes the safe-area gap above the bar on phones with a notch or status bar.
      const barSpace = (bar.hidden || sidePanel ? 0 : bar.offsetHeight) + "px";
      if (view.barSpace !== barSpace) $("#app").style.setProperty("--meetbar", (view.barSpace = barSpace));
      stadium.draw(state, now, { beat: presenter?.beat || state.match.last, elapsed: presenter ? presenter.el : 1e9, lastMark: view.lastMark, reduced: reduced(), pace: view.meetPaused ? 1 : playbackRate(meetSpeedNow() || state.settings.meetSpeed), insetTop: sidePanel ? 0 : Math.max(0, $("#hud").getBoundingClientRect().bottom - arena.top + 8), insetBottom: bar.hidden || sidePanel ? 0 : Math.max(0, arena.bottom - bar.getBoundingClientRect().top + 8) });
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
      world.draw(state, now, { selected: view.selected, moving: view.moving, dayProgress: view.dayP, dayMs: view.playing ? DAY_MS[state.settings.speed] : null, nightScale: (reduced() ? 0.5 : 1) * NIGHT_AT_SPEED[view.playing ? state.settings.speed : 0], calm: reduced() });
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
if (store.read() != null) save();
if (updateInfo().updated) toast("Updated to " + updateInfo().updated.to + ".", "info", "star");
updateBadge();
await showMainMenu();
// Check now, whenever the game comes back to the front, and every so often while it is open.
checkForUpdates().catch(console.error);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) checkForUpdates().catch(console.error);
});
setInterval(() => checkForUpdates().catch(console.error), 15 * 60 * 1000);
