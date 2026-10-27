// All static game content. Engine code interprets the effect keys documented beside each table.

export const STAT_NAMES = ["Power", "Technique", "Speed", "Focus"];
export const STAT_SHORT = ["POW", "TEC", "SPD", "FOC"];
export const STAT_COLORS = ["#e07a4f", "#5aa4c8", "#8cc152", "#b48ad8"];
// Stats are stored 0–100 and shown ×10 so growth reads as satisfying whole numbers.
export const showStat = (v) => Math.round(v * 10);

export const EVENTS = {
  shot: { name: "Shot put", short: "SHOT", color: "#e5b65b", weights: [0.45, 0.32, 0.1, 0.13], min: 6, max: 24, hint: "Drive through the ring. Power first, technique close behind." },
  discus: { name: "Discus", short: "DISC", color: "#8ac4d0", weights: [0.22, 0.43, 0.22, 0.13], min: 16, max: 77, hint: "Rhythm and release. Technicians shine here." },
  hammer: { name: "Hammer", short: "HAM", color: "#d8a1ae", weights: [0.32, 0.32, 0.27, 0.09], min: 18, max: 89, hint: "Build speed through the turns. Everything matters." },
  jav: { name: "Javelin", short: "JAV", color: "#aac57d", weights: [0.2, 0.36, 0.33, 0.11], min: 18, max: 99, hint: "Turn approach speed into a clean release." },
};
export const EVENT_IDS = ["shot", "discus", "hammer", "jav"];

// Rank-ups are the long-term character arc: higher caps, more skill slots, a new look.
export const RANKS = [
  { name: "Rookie", level: 1, cost: 0, cap: 0, slots: 1, wage: 40 },
  { name: "Pro", level: 6, cost: 400, cap: 6, slots: 2, wage: 65 },
  { name: "Ace", level: 12, cost: 1200, cap: 12, slots: 2, wage: 100 },
  { name: "Star", level: 20, cost: 3000, cap: 20, slots: 3, wage: 150 },
  { name: "Legend", level: 30, cost: 6500, cap: 28, slots: 3, wage: 220, title: true },
];

export const RARITY = {
  common: { name: "Common", color: "#8e9a84", potential: [52, 64], bonus: 0, fee: 0, wage: 0, weight: 70 },
  rare: { name: "Rare", color: "#4f8fd6", potential: [60, 70], bonus: 2, fee: 300, wage: 10, weight: 22 },
  epic: { name: "Epic", color: "#a465d6", potential: [66, 76], bonus: 4, fee: 900, wage: 25, weight: 7 },
  legend: { name: "Legend", color: "#e2a43a", potential: [72, 80], bonus: 6, fee: 2400, wage: 45, weight: 1 },
};
export const RARITY_IDS = ["common", "rare", "epic", "legend"];

// Background effects: train [stat, mult], gain (all), stamina (use mult), restMult,
// foul, xp, cond (daily), condFloor, teamCond (daily, others), final.
export const BACKGROUNDS = {
  farm: { name: "Farm Kid", story: "Hauled hay bales every summer.", desc: "Power training +15%, stamina use −10%", train: [0, 1.15], stamina: 0.9 },
  lumberjack: { name: "Lumberjack", story: "Can split a log with a glance.", desc: "Power training +25%", train: [0, 1.25] },
  gymnast: { name: "Ex-Gymnast", story: "Still lands every dismount.", desc: "Technique training +20%", train: [1, 1.2] },
  dancer: { name: "Ballet Dancer", story: "Spins like a music box.", desc: "Technique & Speed training +10%", train: [1, 1.1], train2: [2, 1.1] },
  sprinter: { name: "Former Sprinter", story: "Ran the 100m for the county.", desc: "Speed training +20%", train: [2, 1.2] },
  chess: { name: "Chess Prodigy", story: "Plans six throws ahead.", desc: "Focus training +20%, foul risk −10%", train: [3, 1.2], foul: 0.9 },
  poker: { name: "Poker Face", story: "Nothing rattles them.", desc: "Foul risk −22%", foul: 0.78 },
  marathon: { name: "Marathoner", story: "Never seems to get tired.", desc: "Rest recovers +50%, stamina use −10%", restMult: 1.5, stamina: 0.9 },
  clown: { name: "Class Clown", story: "Keeps the dressing room laughing.", desc: "Teammates' condition +1 each day", teamCond: 1, condFloor: 20 },
  bloomer: { name: "Late Bloomer", story: "Better every single year.", desc: "XP +30%", xp: 1.3 },
  showboat: { name: "Showboat", story: "Lives for the big night.", desc: "+2% distance in finals", final: 1.02 },
  prodigy: { name: "Prodigy", story: "Born to throw.", desc: "All training +10%, XP +10%", gain: 1.1, xp: 1.1, rare: true },
};

// Training menu. Each focused plan sends the athlete to its facility on the grounds.
export const PLANS = {
  balanced: { name: "All-round", short: "All-round", load: 0.85, cond: 0, desc: "Steady gains in every stat on the open field." },
  power: { name: "Power", short: "Power", stat: 0, facility: "gym", load: 1, cond: -1, desc: "Lifting in the Strength Room." },
  technique: { name: "Technique", short: "Technique", stat: 1, facility: "rings", load: 1, cond: -1, desc: "Drills in the Throws Centre." },
  speed: { name: "Speed", short: "Speed", stat: 2, facility: "sprint", load: 1, cond: -1, desc: "Sprints and bounds on the lanes." },
  focus: { name: "Focus", short: "Focus", stat: 3, facility: "studio", load: 0.7, cond: 0, desc: "Film study in the Video Studio." },
  sharpen: { name: "Sharpen", short: "Sharpen", load: 0.45, cond: 7, desc: "Light competition prep. Lifts condition." },
  rest: { name: "Rest", short: "Rest", facility: "spa", load: 0, cond: 3, desc: "Recover stamina. Better with a Recovery Spa." },
};

// Skill effect keys used by the engine:
//  train:[stat,mult] gain xp stamina condFloor cond mentor  (training)
//  first last foul afterFoul trailing leading variance crowd final attackBoost perfect streak (meet)
//  captain hype teamTrailing (team) · sig (signature, once per meet, never fouls) · mark (always)
export const SKILLS = {
  gymrat: { name: "Gym Rat", cat: "train", sp: 1, rank: 0, desc: "Power training +25%.", train: [0, 1.25] },
  formfreak: { name: "Form Freak", cat: "train", sp: 1, rank: 0, desc: "Technique training +25%.", train: [1, 1.25] },
  fasttwitch: { name: "Fast Twitch", cat: "train", sp: 1, rank: 0, desc: "Speed training +25%.", train: [2, 1.25] },
  filmjunkie: { name: "Film Junkie", cat: "train", sp: 1, rank: 0, desc: "Focus training +25%.", train: [3, 1.25] },
  quickstudy: { name: "Quick Study", cat: "train", sp: 2, rank: 0, desc: "XP +25%.", xp: 1.25 },
  sunny: { name: "Sunny Side", cat: "train", sp: 1, rank: 0, desc: "Condition +2 a day and never drops below Low.", cond: 2, condFloor: 30 },
  ironlungs: { name: "Iron Lungs", cat: "train", sp: 2, rank: 1, desc: "Training uses 30% less stamina.", stamina: 0.7 },
  workhorse: { name: "Workhorse", cat: "train", sp: 3, rank: 2, desc: "All training +15%.", gain: 1.15 },
  mentor: { name: "Mentor", cat: "team", sp: 2, rank: 2, desc: "Lower-level teammates earn +15% XP.", mentor: 1.15 },
  opener: { name: "Opening Salvo", cat: "meet", sp: 1, rank: 0, desc: "First attempt +3%.", first: 1.03 },
  frontrunner: { name: "Front Runner", cat: "meet", sp: 1, rank: 0, desc: "When ahead: +1.5% and half the foul risk.", leading: 1.015 },
  metronome: { name: "Metronome", cat: "meet", sp: 1, rank: 0, desc: "Halves the spread of every throw.", variance: 0.5 },
  perfectionist: { name: "Perfectionist", cat: "meet", sp: 1, rank: 0, desc: "Wider perfect-release window; assisted throws are sometimes perfect.", perfect: true },
  clutch: { name: "Clutch Gene", cat: "meet", sp: 2, rank: 0, desc: "Final attempt +4%.", last: 1.04 },
  icevein: { name: "Ice Veins", cat: "meet", sp: 2, rank: 0, desc: "Foul risk −40%.", foul: 0.6 },
  secondwind: { name: "Second Wind", cat: "meet", sp: 2, rank: 1, desc: "After a foul: +5% and safer.", afterFoul: 1.05 },
  hunter: { name: "Rival Hunter", cat: "meet", sp: 2, rank: 1, desc: "While trailing the rival: +3%.", trailing: 1.03 },
  momentum: { name: "Momentum", cat: "meet", sp: 2, rank: 1, desc: "Each valid mark adds +1.5% to the next attempt.", streak: 0.015 },
  hype: { name: "Hype Engine", cat: "team", sp: 2, rank: 1, desc: "Winning an event lifts every teammate's condition.", hype: true },
  showtime: { name: "Showtime", cat: "meet", sp: 2, rank: 2, desc: "Home crowd boost up to +4% (more fans, more boost).", crowd: 0.04 },
  bigstage: { name: "Big Stage", cat: "meet", sp: 2, rank: 2, desc: "+3% in finals.", final: 1.03 },
  highroller: { name: "High Roller", cat: "meet", sp: 2, rank: 2, desc: "All out reaches 2.5% further.", attackBoost: 0.025 },
  anchor: { name: "Anchor", cat: "team", sp: 2, rank: 2, desc: "+2.5% when the club is behind in the meet.", teamTrailing: 1.025 },
  captain: { name: "Captain", cat: "team", sp: 3, rank: 3, desc: "The whole team throws 1.5% further. One captain counts.", captain: 1.015 },
  meteor: { name: "Meteor Put", cat: "signature", sp: 4, rank: 3, event: "shot", desc: "Once per meet: +8% and cannot foul.", sig: 1.08 },
  cyclone: { name: "Cyclone Disc", cat: "signature", sp: 4, rank: 3, event: "discus", desc: "Once per meet: +8% and cannot foul.", sig: 1.08 },
  tempest: { name: "Hammer Tempest", cat: "signature", sp: 4, rank: 3, event: "hammer", desc: "Once per meet: +8% and cannot foul.", sig: 1.08 },
  skyspear: { name: "Sky Spear", cat: "signature", sp: 4, rank: 3, event: "jav", desc: "Once per meet: +8% and cannot foul.", sig: 1.08 },
  // Unique skills belong to secret characters.
  oldschool: { name: "Old School", cat: "unique", sp: 0, rank: 0, desc: "Condition never below Good. Every throw +2%.", condFloor: 60, mark: 1.02 },
  timber: { name: "TIMBER!", cat: "unique", sp: 0, rank: 0, desc: "Double power training. First attempt +4%.", train: [0, 2], first: 1.04 },
  calibrated: { name: "Calibrated", cat: "unique", sp: 0, rank: 0, desc: "Almost no spread. Foul risk −60%.", variance: 0.25, foul: 0.4 },
  windreader: { name: "Wind Reader", cat: "unique", sp: 0, rank: 0, desc: "First attempt +5% and can never foul.", first: 1.05, safeFirst: true },
  avalanche: { name: "Avalanche", cat: "unique", sp: 0, rank: 0, desc: "+7% in finals. Rest recovers twice as fast.", final: 1.07, restMult: 2 },
  wonderkid: { name: "Wonderkid", cat: "unique", sp: 0, rank: 0, desc: "XP ×1.6 and all training +20%.", xp: 1.6, gain: 1.2 },
};
export const SKILL_ICONS = { train: "▲", meet: "◎", team: "♥", signature: "✦", unique: "★" };

// Tactics for each attempt. Spread is a fraction of the projected mark (one standard deviation).
export const TACTICS = {
  safe: { name: "Bank it", mean: 0.97, sd: 0.012, foul: 0.3, stamina: 0, desc: "Short but reliable" },
  balanced: { name: "Controlled", mean: 1, sd: 0.024, foul: 1, stamina: 0, desc: "Balanced range and risk" },
  attack: { name: "All out", mean: 1.005, sd: 0.032, foul: 3.6, stamina: 6, desc: "Big ceiling · big foul risk" },
};

// Items. kind gear (slot implement|shoes|charm) or use. price null = not sold (found only).
// tier = shop tier (by fans). Gear keys: mark foul gain gainStat stamina rest xp cond teamCond final variance.
// Use keys: stamina stat cond xp sp heal teamCond teamStamina buff potential promote.
export const SHOP_TIERS = [0, 120, 400, 1200, 3000];
export const ITEMS = {
  precision: { name: "Precision Implement", kind: "gear", slot: "implement", rarity: "common", price: 180, tier: 0, icon: "ball", color: "#7fb3c8", desc: "Foul risk −30%, distance −0.5%.", foul: 0.7, mark: 0.995 },
  weighted: { name: "Weighted Trainer", kind: "gear", slot: "implement", rarity: "common", price: 150, tier: 0, icon: "ball", color: "#8a8478", desc: "Training +12%, distance −1.5%.", gain: 1.12, mark: 0.985 },
  competition: { name: "Competition Implement", kind: "gear", slot: "implement", rarity: "rare", price: 340, tier: 1, icon: "ball", color: "#e0b04a", desc: "Distance +2%, foul risk +20%.", mark: 1.02, foul: 1.2 },
  heirloom: { name: "Grandpa's Old Iron", kind: "gear", slot: "implement", rarity: "rare", price: null, icon: "ball", color: "#6b5a4a", desc: "Foul risk −25%, condition +2 a day.", foul: 0.75, cond: 2 },
  carbon: { name: "Carbon Core", kind: "gear", slot: "implement", rarity: "epic", price: 900, tier: 3, icon: "ball", color: "#3c3c46", desc: "Distance +3%.", mark: 1.03 },
  comet: { name: "Comet Core", kind: "gear", slot: "implement", rarity: "legend", price: null, icon: "ball", color: "#f0d070", desc: "Distance +5%, foul risk −10%.", mark: 1.05, foul: 0.9 },
  support: { name: "Support Shoes", kind: "gear", slot: "shoes", rarity: "common", price: 160, tier: 0, icon: "shoe", color: "#88b0d0", desc: "Training uses 20% less stamina.", stamina: 0.8 },
  spikes: { name: "Reactive Spikes", kind: "gear", slot: "shoes", rarity: "rare", price: 280, tier: 1, icon: "shoe", color: "#e06048", desc: "Distance +1.2%, speed training +10%.", mark: 1.012, gainStat: [2, 1.1] },
  thunder: { name: "Thunder Spikes", kind: "gear", slot: "shoes", rarity: "epic", price: 750, tier: 3, icon: "shoe", color: "#f0c030", desc: "Distance +2%, speed training +15%.", mark: 1.02, gainStat: [2, 1.15] },
  cloud: { name: "Cloud Walkers", kind: "gear", slot: "shoes", rarity: "epic", price: 1100, tier: 4, icon: "shoe", color: "#e8eef8", desc: "Stamina use −35%, condition +1 a day.", stamina: 0.65, cond: 1 },
  hermes: { name: "Winged Sandals", kind: "gear", slot: "shoes", rarity: "legend", price: null, icon: "wing", color: "#f4d878", desc: "Distance +3%, stamina use −20%.", mark: 1.03, stamina: 0.8 },
  sock: { name: "Lucky Sock", kind: "gear", slot: "charm", rarity: "common", price: 90, tier: 0, icon: "sock", color: "#e05a6a", desc: "Condition +2 a day.", cond: 2 },
  chalk: { name: "Chalk Pouch", kind: "gear", slot: "charm", rarity: "common", price: 120, tier: 0, icon: "pouch", color: "#efeadc", desc: "Foul risk −15%.", foul: 0.85 },
  sweatband: { name: "Sweatband", kind: "gear", slot: "charm", rarity: "common", price: 100, tier: 0, icon: "band", color: "#5ab0e0", desc: "Rest recovers +10 stamina.", rest: 10 },
  whistle: { name: "Coach's Whistle", kind: "gear", slot: "charm", rarity: "rare", price: 320, tier: 1, icon: "whistle", color: "#d8c050", desc: "XP +15%.", xp: 1.15 },
  clover: { name: "Four-Leaf Clover", kind: "gear", slot: "charm", rarity: "rare", price: 380, tier: 2, icon: "clover", color: "#5cb85c", desc: "Foul risk −25%.", foul: 0.75 },
  megaphone: { name: "Hype Megaphone", kind: "gear", slot: "charm", rarity: "rare", price: 420, tier: 2, icon: "megaphone", color: "#e08840", desc: "Teammates' condition +1 a day.", teamCond: 1 },
  medal: { name: "Old Medal", kind: "gear", slot: "charm", rarity: "epic", price: 950, tier: 3, icon: "medal", color: "#e0b040", desc: "+3% in finals.", final: 1.03 },
  compass: { name: "Star Compass", kind: "gear", slot: "charm", rarity: "epic", price: null, icon: "star", color: "#a0c8f0", desc: "Throw spread −30%, foul risk −10%.", variance: 0.7, foul: 0.9 },
  headband: { name: "Golden Headband", kind: "gear", slot: "charm", rarity: "legend", price: null, icon: "band", color: "#f0c840", desc: "All training +20%, distance +1%.", gain: 1.2, mark: 1.01 },
  drink: { name: "Energy Drink", kind: "use", rarity: "common", price: 40, tier: 0, icon: "bottle", color: "#5ad0a0", desc: "+40 stamina.", stamina: 40 },
  cake: { name: "Pep Talk Cake", kind: "use", rarity: "common", price: 55, tier: 0, icon: "cake", color: "#f0a0b8", desc: "+40 condition.", cond: 40 },
  shake: { name: "Protein Shake", kind: "use", rarity: "common", price: 90, tier: 0, icon: "bottle", color: "#e0a070", desc: "Power +20.", stat: [0, 2] },
  manual: { name: "Technique Manual", kind: "use", rarity: "common", price: 90, tier: 0, icon: "book", color: "#5aa4c8", desc: "Technique +20.", stat: [1, 2] },
  ladder: { name: "Agility Ladder", kind: "use", rarity: "common", price: 90, tier: 0, icon: "ladder", color: "#8cc152", desc: "Speed +20.", stat: [2, 2] },
  puzzle: { name: "Focus Puzzle", kind: "use", rarity: "common", price: 90, tier: 0, icon: "puzzle", color: "#b48ad8", desc: "Focus +20.", stat: [3, 2] },
  icebath: { name: "Ice Bath", kind: "use", rarity: "rare", price: 140, tier: 1, icon: "tub", color: "#9ad8f0", desc: "Full stamina and heals injuries.", stamina: 100, heal: true },
  notebook: { name: "Coach's Notebook", kind: "use", rarity: "rare", price: 160, tier: 1, icon: "book", color: "#c89a5a", desc: "+80 XP.", xp: 80 },
  feast: { name: "Team Feast", kind: "use", rarity: "rare", price: 240, tier: 2, team: true, icon: "cake", color: "#f0c060", desc: "Whole team: +25 condition, +20 stamina.", teamCond: 25, teamStamina: 20 },
  scroll: { name: "Skill Scroll", kind: "use", rarity: "epic", price: 650, tier: 3, icon: "scroll", color: "#f0e0b0", desc: "+1 skill point.", sp: 1 },
  goldchalk: { name: "Golden Chalk", kind: "use", rarity: "epic", price: null, icon: "pouch", color: "#f0d050", desc: "Next meet: +3% on every throw.", buff: 1.03 },
  letter: { name: "Promotion Letter", kind: "use", rarity: "epic", price: null, icon: "letter", color: "#f0f0e0", desc: "The next rank-up costs nothing.", promote: true },
  elixir: { name: "Talent Elixir", kind: "use", rarity: "legend", price: null, icon: "elixir", color: "#d070f0", desc: "Potential +4.", potential: 4 },
};
export const GEAR_SLOTS = ["implement", "shoes", "charm"];
export const SLOT_NAMES = { implement: "Implement", shoes: "Shoes", charm: "Charm" };

// Grounds. stat = trained here; activity = what athletes do in front of the building.
export const FACILITIES = {
  club: { name: "Clubhouse", cost: 0, league: 0, fixed: true, color: "#c0784a", desc: "Home. Each level: +$60 weekly income and +1 daily condition." },
  gym: { name: "Strength Room", cost: 280, league: 0, stat: 0, color: "#d08a50", desc: "Power training +25% per level." },
  rings: { name: "Throws Centre", cost: 260, league: 0, stat: 1, color: "#5f9a8e", desc: "Technique training +25% per level." },
  sprint: { name: "Sprint Lanes", cost: 240, league: 0, stat: 2, color: "#c06a50", desc: "Speed training +25% per level." },
  studio: { name: "Video Studio", cost: 420, league: 1, stat: 3, color: "#8a7fc0", desc: "Focus training +25% per level." },
  spa: { name: "Recovery Spa", cost: 340, league: 0, color: "#6ab0b0", desc: "Rest recovers +12 stamina per level. Injuries heal faster." },
  garden: { name: "Club Garden", cost: 150, league: 0, color: "#78a858", desc: "+1 daily team condition per level. Visitors love it." },
  cafe: { name: "Canteen Café", cost: 300, league: 0, color: "#e0a050", desc: "Visitors spend $2 per level. +1 daily condition." },
  shop: { name: "Merch Stand", cost: 380, league: 0, color: "#d0605a", desc: "Visitors spend $3 per level. +1 fan a day per level." },
  dorm: { name: "Dormitory", cost: 450, league: 0, color: "#a08a6a", desc: "Room for +2 athletes per level (base squad of 6)." },
  scout: { name: "Scout Office", cost: 500, league: 1, color: "#7a8a5a", desc: "Rarer recruits and −15% scouting cost per level." },
  workshop: { name: "Kit Workshop", cost: 560, league: 1, color: "#9a7a5a", desc: "Forge gear: +0.6% distance per forge level. −10% forge cost per level." },
  stands: { name: "Grandstand", cost: 700, league: 2, color: "#5a7a9a", desc: "+$70 weekly sponsor money and more visitors per level." },
  lab: { name: "Sports Lab", cost: 800, league: 2, color: "#7ab0d0", desc: "XP +10% per level." },
  fountain: { name: "Fountain", cost: 220, league: 0, color: "#7ac0e0", desc: "A beloved landmark. More visitors, +1 daily condition." },
  statue: { name: "Champion Statue", cost: 900, league: 0, needsTitle: true, color: "#c8b078", desc: "Needs a title. +2 fans a day per level; fans from wins +10%." },
};
export const FACILITY_IDS = Object.keys(FACILITIES);
export const GRID_COLS = 4;
export const GRID_ROWS = 3;
// Plots open in this order as the club climbs leagues (6, 8, 10, 12).
export const PLOT_ORDER = [0, 1, 2, 4, 5, 6, 3, 7, 8, 9, 10, 11];
export const PLOTS_BY_LEAGUE = [6, 8, 10, 12, 12];

// Orthogonal neighbours. Effects are read by key in the engine.
export const COMBOS = [
  { a: "gym", b: "rings", key: "power", name: "Power Circuit", desc: "Power & Technique training +10%." },
  { a: "rings", b: "studio", key: "release", name: "Release Lab", desc: "Meet foul risk −12%." },
  { a: "sprint", b: "rings", key: "trackfield", name: "Track & Field", desc: "Speed & Technique training +10%." },
  { a: "spa", b: "garden", key: "spaday", name: "Spa Day", desc: "Rest recovers +10 more stamina." },
  { a: "cafe", b: "gym", key: "fuel", name: "Fuel Station", desc: "Training uses 15% less stamina." },
  { a: "cafe", b: "garden", key: "picnic", name: "Picnic Lawn", desc: "Visitors +20%." },
  { a: "garden", b: "fountain", key: "zen", name: "Zen Corner", desc: "Team condition +2 a day." },
  { a: "shop", b: "stands", key: "fanzone", name: "Fan Zone", desc: "Merch spending ×1.5." },
  { a: "stands", b: "club", key: "fans", name: "Home Advantage", desc: "Weekly income +15%." },
  { a: "studio", b: "workshop", key: "techhub", name: "Tech Hub", desc: "Forging costs −25%." },
  { a: "scout", b: "club", key: "network", name: "Scouting Network", desc: "Rarer recruits." },
  { a: "lab", b: "studio", key: "science", name: "Science Squad", desc: "XP +15%." },
  { a: "dorm", b: "spa", key: "dorms", name: "Rest & Reload", desc: "Injury risk −50%, rest +5 stamina." },
  { a: "statue", b: "fountain", key: "legends", name: "Hall of Legends", desc: "Fans from wins +25%." },
];

export const LEAGUES = [
  { name: "Community League", tag: "A small club. A big beginning.", rating: 24, prize: 650, color: "#7f9f71", venue: "Willow Park", crowd: 0.25, unlock: "Two new plots, Video Studio, Scout Office & Workshop" },
  { name: "County League", tag: "The local paper is paying attention.", rating: 38, prize: 1000, color: "#6eaaa8", venue: "Riverside Sports Ground", crowd: 0.4, unlock: "Two new plots, Grandstand & Sports Lab" },
  { name: "Regional League", tag: "Familiar faces. Fiercer competition.", rating: 52, prize: 1600, color: "#9b94bf", venue: "Cedar Valley Stadium", crowd: 0.55, unlock: "The last two plots" },
  { name: "National League", tag: "Your little club has made a name.", rating: 66, prize: 2400, color: "#cf986d", venue: "National Athletics Centre", crowd: 0.75, unlock: "The world stage" },
  { name: "World League", tag: "One club against the best.", rating: 80, prize: 4000, color: "#c4a458", venue: "Aurora International Arena", crowd: 0.95, unlock: "Defend the world title" },
];

export const CLUBS = [
  [
    { name: "Northgate AC", color: "#b65b4a", style: "Power-first club · dangerous in shot put" },
    { name: "Harbor Throws", color: "#587eae", style: "Technical club · discus specialists" },
    { name: "Oakridge TC", color: "#9974a3", style: "Fast-turning squad · hammer & javelin" },
  ],
  [
    { name: "Meadowfield Hares", color: "#c07a3a", style: "Quick feet · javelin threats" },
    { name: "River City Otters", color: "#3f8f9a", style: "Smooth technicians" },
    { name: "Stonebridge Rams", color: "#7d6a5a", style: "Brute strength in the ring" },
  ],
  [
    { name: "Cedar Valley", color: "#4f7d4a", style: "Deep, balanced roster" },
    { name: "Highland Union", color: "#8a4f6e", style: "Hammer royalty" },
    { name: "Eastbank Elite", color: "#3d5f8f", style: "Clutch performers" },
  ],
  [
    { name: "Metro Athletics", color: "#c0504d", style: "Big-city professionals" },
    { name: "Ironwood Club", color: "#5a5f66", style: "Unflappable veterans" },
    { name: "Capital Union", color: "#2f5f9f", style: "National record holders" },
  ],
  [
    { name: "Aurora AC", color: "#6a4fb0", style: "Reigning world power" },
    { name: "Summit Collective", color: "#2f8f7a", style: "High-altitude monsters" },
    { name: "Pacific Stars", color: "#d08a2f", style: "Showtime throwers" },
  ],
];
export const CLUB_BIASES = [
  [2, -1, 0, -2],
  [-1, 3, -1, 0],
  [-2, -1, 2, 2],
];

export const SPONSORS = {
  bakery: { name: "Corner Bakery", fans: 0, weekly: 160, desc: "$160 a week. Simple and friendly." },
  fizz: { name: "Fizz Sports Drinks", fans: 60, weekly: 110, gift: "drink", desc: "$110 a week plus two Energy Drinks." },
  radio: { name: "Radio 98.4", fans: 150, weekly: 130, fanBoost: 1.5, desc: "$130 a week. Fans from wins +50%." },
  outfitter: { name: "Summit Outfitters", fans: 400, weekly: 200, winBonus: 150, desc: "$200 a week plus $150 per meet win." },
  tv: { name: "Channel 9 Sport", fans: 1000, weekly: 420, desc: "$420 a week." },
  apex: { name: "Apex Global", fans: 3000, weekly: 800, lossPenalty: 300, desc: "$800 a week, but $300 back for every meet loss." },
};

// Secret characters arrive as story events once their condition is met.
export const SECRETS = {
  olga: { name: "Grandma Olga", event: "shot", skill: "oldschool", background: "poker", fee: 600, look: { skin: "#f0c6a0", hair: "#d8d8d0", style: 6, special: "granny" }, stats: 4, potential: 78, hint: "Reach 250 fans", story: "A champion from the old days wants one more season. She brought her own knitting." },
  bjorn: { name: "Bjørn “The Oak”", event: "hammer", skill: "timber", background: "lumberjack", fee: 900, look: { skin: "#e8b890", hair: "#a0522d", style: 1, special: "beard" }, stats: 5, potential: 80, hint: "Upgrade the Strength Room to level 3", story: "A lumberjack heard your weights clanging from the forest." },
  r7: { name: "R-7 “Throwbot”", event: "discus", skill: "calibrated", background: "chess", fee: 1500, look: { skin: "#b8c4cc", hair: "#7a8a96", style: 0, special: "robot" }, stats: 6, potential: 82, hint: "Build a Kit Workshop and a Video Studio, both level 2", story: "Your workshop and studio wired themselves together. Something is beeping." },
  yuki: { name: "Yuki Kaze", event: "jav", skill: "windreader", background: "sprinter", fee: 1200, look: { skin: "#f0d0b0", hair: "#2a2a3a", style: 5, special: "scarf" }, stats: 6, potential: 82, hint: "Win 10 meets", story: "A quiet javelin thrower who reads the wind like a book." },
  yeti: { name: "The Yeti", event: "hammer", skill: "avalanche", background: "farm", fee: 3000, look: { skin: "#a8c0d8", hair: "#f4f4f4", style: 0, special: "yeti" }, stats: 9, potential: 88, hint: "Reach the World League", story: "Enormous footprints lead from the mountains straight to your clubhouse." },
  pip: { name: "Pip", event: "discus", skill: "wonderkid", background: "prodigy", fee: 400, look: { skin: "#e0a880", hair: "#e8a040", style: 3, special: "kid" }, stats: -6, potential: 90, hint: "Discover 6 facility combos", story: "The groundskeeper's kid has been copying your athletes for months." },
};

export const FIRST = ["Mara", "Tomas", "Noor", "Kofi", "Liv", "Hana", "Ezra", "Ines", "Yuki", "Dario", "Priya", "Ama", "Nico", "Zofia", "Kai", "Greta", "Owen", "Elif", "Lars", "Rui", "Tao", "Sade", "Mateo", "Ilse", "Bo", "Femi", "Anouk", "Ravi", "Juno", "Odile", "Pax", "Wren", "Iker", "Saoirse", "Tariq", "Mina", "Otto", "Ayla", "Sven", "Lupe", "Hugo", "Nia", "Felix", "Rosa", "Arjun", "Ida", "Cyrus", "Maeve"];
export const LAST = ["Kowal", "Reyes", "Haddad", "Mensah", "Okafor", "Lindqvist", "Tanaka", "Brennan", "Moreau", "Novak", "Sato", "Duarte", "Walsh", "Holm", "Castro", "Ilunga", "Vance", "Petrov", "Achebe", "Nakamura", "Oduya", "Larsen", "Quinn", "Ferreira", "Kim", "Bauer", "Adeyemi", "Rossi", "Stone", "Vega", "Park", "Okoro", "Silva", "Dubois", "Kaur", "Berg", "Mwangi", "Hale", "Ortiz", "Fox"];
export const SKINS = ["#f0c6a0", "#e2b08a", "#c98f66", "#a06a48", "#7a4e36", "#5e3a2a"];
export const HAIRS = ["#3a2a20", "#1e1e24", "#b8843e", "#8e4c33", "#d8c8a0", "#c8562e", "#4a3a5a"];
export const HAIR_STYLES = 6;
export const CLUB_PALETTES = [
  { name: "Forest & gold", primary: "#2f6b52", secondary: "#e2b04a" },
  { name: "Brick & cream", primary: "#b0503a", secondary: "#f2e2b8" },
  { name: "Navy & sky", primary: "#2c4a7a", secondary: "#8ac8f0" },
  { name: "Plum & peach", primary: "#6a3a6e", secondary: "#f0a878" },
  { name: "Teal & coral", primary: "#1f7a78", secondary: "#f07860" },
  { name: "Charcoal & lime", primary: "#3a3f44", secondary: "#b8e050" },
];
export const HELPER = "Juno";
