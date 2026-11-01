// All static game content. Engine code interprets the effect keys documented beside each table.

export const STAT_NAMES = ["Power", "Technique", "Speed", "Focus"];
export const STAT_SHORT = ["POW", "TEC", "SPD", "FOC"];
export const STAT_COLORS = ["#e07a4f", "#5aa4c8", "#8cc152", "#b48ad8"];
// Stats are stored as fractions; the player sees whole points from 1 to 100.
export const showStat = (v) => Math.floor(v + 1e-6);

// min: a raw beginner. max: a top-rated thrower before gear, skills and approach bonuses, which
// carry the best Diamond League throwers to real world-class marks. record: the senior men's world
// record, which marks approach but never pass (see realMark).
export const EVENTS = {
  shot: { name: "Shot put", short: "SHOT", color: "#e5b65b", weights: [0.56, 0.29, 0.07, 0.08], min: 7, max: 20.5, record: 23.56, hint: "Drive through the ring. Power first, technique close behind." },
  discus: { name: "Discus", short: "DISC", color: "#8ac4d0", weights: [0.22, 0.49, 0.18, 0.11], min: 18, max: 66, record: 74.35, hint: "Rhythm and release. Technicians shine here." },
  hammer: { name: "Hammer", short: "HAM", color: "#d8a1ae", weights: [0.34, 0.36, 0.24, 0.06], min: 20, max: 79, record: 86.74, hint: "Build speed through the turns. Everything matters." },
  jav: { name: "Javelin", short: "JAV", color: "#aac57d", weights: [0.16, 0.38, 0.38, 0.08], min: 22, max: 86, record: 98.48, hint: "Turn approach speed into a clean release." },
};
export const EVENT_IDS = ["shot", "discus", "hammer", "jav"];

// Rank-ups are the long-term character arc: higher caps, more skill slots, a new look.
export const RANKS = [
  { name: "Rookie", level: 1, cost: 0, cap: 0, slots: 1, wage: 40 },
  { name: "Pro", level: 6, cost: 400, cap: 6, slots: 2, wage: 75 },
  { name: "Ace", level: 12, cost: 1200, cap: 12, slots: 2, wage: 130 },
  { name: "Star", level: 20, cost: 3000, cap: 20, slots: 3, wage: 220 },
  { name: "Legend", level: 26, cost: 6500, cap: 28, slots: 3, wage: 340, title: true },
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

// Athlete types: how quickly each stat grows (Power, Technique, Speed, Focus). Every type adds up to
// the same total, so a type decides where an athlete grows fastest, not how good they get. `fits`
// names the events whose key stats it grows quickly.
export const GROWTH = [
  { mult: 1.3, name: "Fast" },
  { mult: 1.15, name: "Quick" },
  { mult: 1, name: "Normal" },
  { mult: 0.9, name: "Slow" },
  { mult: 0.8, name: "Very slow" },
];
export const ATHLETE_TYPES = {
  powerhouse: { name: "Powerhouse", desc: "Packs on strength; slow to find speed.", growth: [0, 3, 4, 2], fits: ["shot", "hammer"] },
  technician: { name: "Technician", desc: "Picks up technique fastest; slow to find speed.", growth: [3, 0, 4, 2], fits: ["discus", "jav"] },
  speedster: { name: "Speedster", desc: "Gets quicker by the week; focus comes slowly.", growth: [3, 2, 0, 4], fits: ["jav"] },
  mastermind: { name: "Mastermind", desc: "Focus grows fast; strength comes slowly.", growth: [4, 2, 3, 0], fits: [] },
  thrower: { name: "Born Thrower", desc: "Strength and technique both grow quickly.", growth: [1, 1, 4, 3], fits: ["shot", "discus", "hammer"] },
  natural: { name: "Natural Athlete", desc: "Strength and speed grow quickly.", growth: [1, 3, 1, 4], fits: ["shot", "hammer", "jav"] },
  allrounder: { name: "All-rounder", desc: "Grows every stat at the same pace.", growth: [2, 2, 2, 2], fits: [] },
};

// Training menu. Each focused plan sends the athlete to its facility on the grounds.
export const PLANS = {
  facilities: { name: "Use facilities automatically", short: "Use facilities", load: 0, cond: 0, facilityRole: true, desc: "Choose available club duties automatically to earn money, Coaching Insights or support the squad. Rest when tired; prepare for meets when selected." },
  balanced: { name: "All-round", short: "All-round", load: 0.45, cond: 0, desc: "Light daily preparation: mobility, strength circuits, short runs and throwing drills. Leaves energy for coached sessions." },
  power: { name: "Power", short: "Power", stat: 0, facility: "gym", load: 1, cond: -1, desc: "Lifting in the Strength Room." },
  technique: { name: "Technique", short: "Technique", stat: 1, facility: "event", load: 1, cond: -1, desc: "Throwing drills at their own circle, cage or runway." },
  speed: { name: "Speed", short: "Speed", stat: 2, facility: "track", load: 1, cond: -1, desc: "Sprints and bounds on the track." },
  focus: { name: "Focus", short: "Focus", stat: 3, facility: "studio", load: 0.7, cond: 0, desc: "Film study in the Video room." },
  sharpen: { name: "Sharpen", short: "Sharpen", load: 0.45, cond: 7, desc: "Light competition prep. Lifts condition." },
  rest: { name: "Rest", short: "Rest", facility: "spa", load: 0, cond: 3, desc: "Recover stamina. Better with a Recovery Spa." },
  strengthblock: { name: "Maximum-strength block", short: "Strength block", stat: 0, facility: "gym", load: 1.35, cond: -2, rate: 1.55, course: true, cost: 16, needs: [["gym",2]], desc: "Squats, pulls and presses build force for the delivery. Greater power gains, with a heavier recovery cost." },
  elasticblock: { name: "Elastic-strength block", short: "Elastic strength", stat: 2, facility: "track", load: 1.15, cond: -1, rate: 1.35, secondary: [0,0.35], course: true, cost: 18, needs: [["track",2],["gym",1]], desc: "Bounds, short accelerations and medicine-ball throws develop speed-strength for the ring and runway." },
  technicalblock: { name: "Event technique block", short: "Event technique", stat: 1, facility: "event", load: 1.1, cond: -1, rate: 1.45, course: true, cost: 14, needs: [["event",2]], desc: "Progress from part drills to connected throws with the competition implement. Uses the athlete's own circle, cage or runway." },
  filmblock: { name: "Video feedback block", short: "Video feedback", stat: 3, facility: "studio", load: 0.55, cond: 1, rate: 1.25, secondary: [1,0.3], course: true, cost: 18, needs: [["studio",1]], desc: "Review release positions and rehearse a repeatable pre-throw routine. Focus with some technique, at lower physical load." },
  rhythmblock: { name: "Event rhythm block", short: "Event rhythm", stat: 2, facility: "event", load: 1.2, cond: -1, rate: 1.25, secondary: [1,0.5], course: true, cost: 24, needs: [["event",2],["track",2]], desc: "Connect rhythm and delivery: turn timing in the rotational throws, glide-to-delivery in shot, or crossover-to-block in javelin." },
  competitionblock: { name: "Competition rehearsal", short: "Meet rehearsal", stat: 3, facility: "event", load: 0.8, cond: 3, rate: 1.2, secondary: [1,0.45], course: true, cost: 28, needs: [["event",3],["studio",1]], desc: "Rehearse a three-throw series: call-up, time limit, a legal opener and recovery between attempts. Focus and technique." },
};

// Skill effect keys used by the engine:
//  train:[stat,mult] gain xp stamina condFloor cond mentor  (training)
//  first last foul afterFoul trailing leading variance crowd final attackBoost perfect streak (meet)
//  captain hype teamTrailing (team) · sig (signature, once per meet, never fouls) · mark (always)
// Common skills can be learned by any athlete with skill points. Rare and above come from skill
// books: consumables the shop stocks a few at a time (see BOOK_PRICES and the weekly shelf).
export const SKILLS = {
  gymrat: { name: "Gym Rat", cat: "train", rarity: "common", sp: 1, rank: 0, desc: "Power training +25%.", train: [0, 1.25] },
  formfreak: { name: "Form Freak", cat: "train", rarity: "common", sp: 1, rank: 0, desc: "Technique training +25%.", train: [1, 1.25] },
  fasttwitch: { name: "Fast Twitch", cat: "train", rarity: "common", sp: 1, rank: 0, desc: "Speed training +25%.", train: [2, 1.25] },
  filmjunkie: { name: "Film Junkie", cat: "train", rarity: "common", sp: 1, rank: 0, desc: "Focus training +25%.", train: [3, 1.25] },
  quickstudy: { name: "Quick Study", cat: "train", rarity: "rare", sp: 2, rank: 0, desc: "XP +25%.", xp: 1.25 },
  sunny: { name: "Sunny Side", cat: "train", rarity: "common", sp: 1, rank: 0, desc: "Condition +2 a day and never drops below Low.", cond: 2, condFloor: 30 },
  ironlungs: { name: "Iron Lungs", cat: "train", rarity: "rare", sp: 2, rank: 1, desc: "Training uses 30% less stamina.", stamina: 0.7 },
  workhorse: { name: "Workhorse", cat: "train", rarity: "epic", sp: 3, rank: 2, desc: "All training +15%.", gain: 1.15 },
  mentor: { name: "Mentor", cat: "team", rarity: "epic", sp: 2, rank: 2, desc: "Lower-level teammates earn +15% XP.", mentor: 1.15 },
  opener: { name: "Opening Salvo", cat: "meet", rarity: "common", sp: 1, rank: 0, desc: "First attempt +3%.", first: 1.03 },
  frontrunner: { name: "Front Runner", cat: "meet", rarity: "common", sp: 1, rank: 0, desc: "When ahead: +1.5% and half the foul risk.", leading: 1.015 },
  metronome: { name: "Metronome", cat: "meet", rarity: "common", sp: 1, rank: 0, desc: "Halves the spread of every throw.", variance: 0.5 },
  perfectionist: { name: "Perfectionist", cat: "meet", rarity: "common", sp: 1, rank: 0, desc: "Wider perfect-release window; assisted throws are sometimes perfect.", perfect: true },
  clutch: { name: "Clutch Gene", cat: "meet", rarity: "rare", sp: 2, rank: 0, desc: "Final attempt +4%.", last: 1.04 },
  icevein: { name: "Ice Veins", cat: "meet", rarity: "rare", sp: 2, rank: 0, desc: "Foul risk −40%.", foul: 0.6 },
  secondwind: { name: "Second Wind", cat: "meet", rarity: "rare", sp: 2, rank: 1, desc: "After a foul: +5% and safer.", afterFoul: 1.05 },
  hunter: { name: "Rival Hunter", cat: "meet", rarity: "rare", sp: 2, rank: 1, desc: "While trailing the rival: +3%.", trailing: 1.03 },
  momentum: { name: "Momentum", cat: "meet", rarity: "rare", sp: 2, rank: 1, desc: "Each valid mark adds +1.5% to the next attempt.", streak: 0.015 },
  hype: { name: "Hype Engine", cat: "team", rarity: "rare", sp: 2, rank: 1, desc: "Winning an event lifts every teammate's condition.", hype: true },
  showtime: { name: "Showtime", cat: "meet", rarity: "epic", sp: 2, rank: 2, desc: "Home crowd boost up to +4% (more fans, more boost).", crowd: 0.04 },
  bigstage: { name: "Big Stage", cat: "meet", rarity: "epic", sp: 2, rank: 2, desc: "+3% in finals.", final: 1.03 },
  highroller: { name: "High Roller", cat: "meet", rarity: "epic", sp: 2, rank: 2, desc: "All out reaches 2.5% further.", attackBoost: 0.025 },
  anchor: { name: "Anchor", cat: "team", rarity: "epic", sp: 2, rank: 2, desc: "+2.5% when the club is behind in the meet.", teamTrailing: 1.025 },
  captain: { name: "Captain", cat: "team", rarity: "legend", sp: 3, rank: 3, desc: "The whole team throws 1.5% further. One captain counts.", captain: 1.015 },
  meteor: { name: "Meteor Put", cat: "signature", rarity: "legend", sp: 4, rank: 3, event: "shot", desc: "Once per meet: +8% and cannot foul.", sig: 1.08 },
  cyclone: { name: "Cyclone Disc", cat: "signature", rarity: "legend", sp: 4, rank: 3, event: "discus", desc: "Once per meet: +8% and cannot foul.", sig: 1.08 },
  tempest: { name: "Hammer Tempest", cat: "signature", rarity: "legend", sp: 4, rank: 3, event: "hammer", desc: "Once per meet: +8% and cannot foul.", sig: 1.08 },
  skyspear: { name: "Sky Spear", cat: "signature", rarity: "legend", sp: 4, rank: 3, event: "jav", desc: "Once per meet: +8% and cannot foul.", sig: 1.08 },
  // Unique skills belong to secret characters.
  oldschool: { name: "Old School", cat: "unique", sp: 0, rank: 0, desc: "Condition never below Good. Every throw +2%.", condFloor: 60, mark: 1.02 },
  timber: { name: "TIMBER!", cat: "unique", sp: 0, rank: 0, desc: "Double power training. First attempt +4%.", train: [0, 2], first: 1.04 },
  calibrated: { name: "Calibrated", cat: "unique", sp: 0, rank: 0, desc: "Almost no spread. Foul risk −60%.", variance: 0.25, foul: 0.4 },
  windreader: { name: "Wind Reader", cat: "unique", sp: 0, rank: 0, desc: "First attempt +5% and can never foul.", first: 1.05, safeFirst: true },
  avalanche: { name: "Avalanche", cat: "unique", sp: 0, rank: 0, desc: "+7% in finals. Rest recovers twice as fast.", final: 1.07, restMult: 2 },
  wonderkid: { name: "Wonderkid", cat: "unique", sp: 0, rank: 0, desc: "XP ×1.6 and all training +20%.", xp: 1.6, gain: 1.2 },
};

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
  steelshot: { name: "Turned Steel Shot", event: "shot", kind: "gear", slot: "implement", rarity: "common", price: 200, tier: 0, icon: "ball", color: "#8e9aa4", desc: "Shot only: smooth steel competition shot. Foul risk −20%, distance +0.5%.", foul: 0.8, mark: 1.005 },
  brassshot: { name: "Brass Competition Shot", event: "shot", kind: "gear", slot: "implement", rarity: "epic", price: 1100, tier: 3, icon: "ball", color: "#c8a45a", desc: "Shot only: compact brass shot. Distance +1%; up to another +2% as shot mastery rises from 40 to 80. Foul risk +10%.", mark: 1.01, foul: 1.1, masteryMark: [40, 80, 0.02] },
  lowrim: { name: "Low-Rim-Weight Discus", event: "discus", kind: "gear", slot: "implement", rarity: "rare", price: 320, tier: 1, icon: "discus", color: "#8ab8d0", desc: "Discus only: an accessible rim-weight distribution. Foul risk −20%, throw spread −15%.", foul: 0.8, variance: 0.85 },
  highrim: { name: "High-Rim-Weight Discus", event: "discus", kind: "gear", slot: "implement", rarity: "epic", price: 1200, tier: 3, icon: "discus", color: "#d0a85a", desc: "Discus only: rewards a well-developed release. Distance +1%; up to another +2.5% from mastery 45–85. Foul risk +25%.", mark: 1.01, foul: 1.25, masteryMark: [45, 85, 0.025] },
  steelhammer: { name: "Steel-Head Hammer", event: "hammer", kind: "gear", slot: "implement", rarity: "rare", price: 340, tier: 1, icon: "hammer", color: "#8e9aa4", desc: "Hammer only: steel head, wire and handle. Foul risk −15%, throw spread −10%.", foul: 0.85, variance: 0.9 },
  competitionhammer: { name: "Turned Iron Competition Hammer", event: "hammer", kind: "gear", slot: "implement", rarity: "epic", price: 1250, tier: 3, icon: "hammer", color: "#a8b0b8", desc: "Hammer only: machined iron head, wire and competition handle. Distance +1%; up to another +2% from mastery 45–85. Foul risk +15%.", mark: 1.01, foul: 1.15, masteryMark: [45, 85, 0.02] },
  aluminiumjav: { name: "Aluminium Training Javelin", event: "jav", kind: "gear", slot: "implement", rarity: "common", price: 180, tier: 0, icon: "javelin", color: "#88b0d0", desc: "Javelin only: aluminium practice implement. Training +12%, competition distance −1%.", gain: 1.12, mark: 0.99 },
  stiffjav: { name: "Stiff-Shaft Competition Javelin", event: "jav", kind: "gear", slot: "implement", rarity: "epic", price: 1200, tier: 3, icon: "javelin", color: "#d87850", desc: "Javelin only: a stiffer shaft matched to a developed delivery. Distance +1%; up to another +2.5% from mastery 50–90. Foul risk +20%.", mark: 1.01, foul: 1.2, masteryMark: [50, 90, 0.025] },
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
  shake: { name: "Protein Shake", kind: "use", rarity: "common", price: 90, tier: 0, icon: "bottle", color: "#e0a070", desc: "+2 Power.", stat: [0, 2] },
  manual: { name: "Technique Manual", kind: "use", rarity: "common", price: 90, tier: 0, icon: "book", color: "#5aa4c8", desc: "+2 Technique.", stat: [1, 2] },
  ladder: { name: "Agility Ladder", kind: "use", rarity: "common", price: 90, tier: 0, icon: "ladder", color: "#8cc152", desc: "+2 Speed.", stat: [2, 2] },
  puzzle: { name: "Focus Puzzle", kind: "use", rarity: "common", price: 90, tier: 0, icon: "puzzle", color: "#b48ad8", desc: "+2 Focus.", stat: [3, 2] },
  icebath: { name: "Ice Bath", kind: "use", rarity: "rare", price: 140, tier: 1, icon: "tub", color: "#9ad8f0", desc: "Full stamina and heals injuries.", stamina: 100, heal: true },
  notebook: { name: "Coach's Notebook", kind: "use", rarity: "rare", price: 160, tier: 1, icon: "book", color: "#c89a5a", desc: "+80 XP.", xp: 80 },
  feast: { name: "Team Feast", kind: "use", rarity: "rare", price: 240, tier: 2, team: true, icon: "cake", color: "#f0c060", desc: "Whole team: +25 condition, +20 stamina.", teamCond: 25, teamStamina: 20 },
  scroll: { name: "Skill Scroll", kind: "use", rarity: "epic", price: 650, tier: 3, icon: "scroll", color: "#f0e0b0", desc: "+1 skill point.", sp: 1 },
  goldchalk: { name: "Golden Chalk", kind: "use", rarity: "epic", price: null, icon: "pouch", color: "#f0d050", desc: "Next meet: +3% on every throw.", buff: 1.03 },
  letter: { name: "Promotion Letter", kind: "use", rarity: "epic", price: null, icon: "letter", color: "#f0f0e0", desc: "The next rank-up costs nothing.", promote: true },
  elixir: { name: "Talent Elixir", kind: "use", rarity: "legend", price: null, icon: "elixir", color: "#d070f0", desc: "Potential +4.", potential: 4 },
};
// One skill book for every rare, epic and legend skill. Reading it teaches that skill to one
// athlete (who still spends the skill points), and the book is gone.
export const BOOK_PRICES = { rare: 350, epic: 1000, legend: 2600 };
for (const [id, k] of Object.entries(SKILLS)) {
  if (k.cat === "unique" || k.rarity === "common") continue;
  ITEMS["book_" + id] = { name: k.name + " Book", kind: "book", skill: id, rarity: k.rarity, price: BOOK_PRICES[k.rarity], icon: "book", color: { rare: "#5a8ad0", epic: "#9a5ad0", legend: "#e0a83a" }[k.rarity], desc: "Teaches " + k.name + ": " + k.desc };
}
export const GEAR_SLOTS = ["implement", "shoes", "charm"];
export const SLOT_NAMES = { implement: "Implement", shoes: "Shoes", charm: "Charm" };

// The stadium: fixed installations that are upgraded in place.
// cost[k] / league[k] = price and league needed to go from level k to k + 1.
export const STADIUM = {
  track: { name: "Track", levels: ["Grass loop", "Gravel track", "Synthetic track", "Championship track"], cost: [0, 900, 2400], league: [0, 1, 3], start: 1, max: 3, desc: "Where speed work happens. Speed training +40% per level. Enables acceleration drills; level 2 supports elastic-strength blocks." },
  shot: { name: "Shot put circle", event: "shot", levels: ["Not built", "Concrete circle", "Twin circles", "Competition circle"], cost: [200, 450, 1800], league: [0, 0, 2], start: 1, max: 3, desc: "Shot putters' technique training +40% per level. Enables event-specific coached drills; level 2 supports technique blocks." },
  discus: { name: "Discus cage", event: "discus", levels: ["Not built", "Practice cage", "Full cage", "Competition cage"], cost: [240, 500, 1900], league: [0, 0, 2], start: 0, max: 3, desc: "Discus throwers' technique training +40% per level. Enables event-specific coached drills; level 2 supports technique blocks." },
  hammer: { name: "Hammer cage", event: "hammer", levels: ["Not built", "Practice cage", "Full cage", "Competition cage"], cost: [260, 520, 2000], league: [0, 0, 2], start: 0, max: 3, desc: "Hammer throwers' technique training +40% per level. Enables event-specific coached drills; level 2 supports technique blocks." },
  jav: { name: "Javelin runway", event: "jav", levels: ["Not built", "Grass runway", "Rubber runway", "Competition runway"], cost: [200, 450, 1800], league: [0, 0, 2], start: 1, max: 3, desc: "Javelin throwers' technique training +40% per level. Enables event-specific coached drills; level 2 supports technique blocks." },
  stands: { name: "Grandstand", levels: ["Open field", "Bleachers", "Covered main stand", "Stands all round", "Olympic stadium"], cost: [450, 1500, 4000, 10000], league: [0, 1, 3, 4], start: 0, max: 4, desc: "+$70 weekly sponsor money, more visitors and a louder home crowd per level. From an open field to metal bleachers, a covered main stand, stands all round and finally an Olympic bowl with a ring roof." , capacity: [200, 800, 2500, 7000, 16000] },
  studio: { name: "Video room", levels: ["None", "Video room", "Analysis suite", "Press & data centre"], cost: [420, 900, 2400], league: [1, 1, 2], start: 0, max: 3, desc: "In the main stand. Focus training +40% per level. Enables video sessions and feedback plans; meet reviews generate extra Insights. +0.4 Coaching Insights a day per level." },
  lights: { name: "Floodlights", levels: ["None", "Floodlights", "Stadium lights"], cost: [1200, 3000], league: [2, 3], start: 0, max: 2, desc: "Evening meets: +20% fans from home wins per level and a brighter crowd." },
};
export const STADIUM_IDS = Object.keys(STADIUM);
export const THROW_SPOTS = ["shot", "discus", "hammer", "jav"];

// Buildings on the plots around the stadium.
export const FACILITIES = {
  club: { name: "Clubhouse", cost: 0, league: 0, fixed: true, color: "#c0784a", desc: "Home. Each level: +$60 weekly income and +1 daily condition. +0.15 Coaching Insights a day per level." },
  gym: { name: "Strength Room", cost: 280, league: 0, stat: 0, color: "#d08a50", desc: "Power training +40% per level. Enables coached strength sessions; level 2 supports maximum-strength blocks. +0.1 Coaching Insights a day per level." },
  spa: { name: "Recovery Spa", cost: 340, league: 0, color: "#6ab0b0", desc: "Rest recovers +12 stamina per level. Injuries heal faster. Reduces the stamina cost of coached sessions." },
  cafe: { name: "Canteen Café", cost: 300, league: 0, color: "#e0a050", desc: "Six in ten visitors buy: $2 each, +$1 per level. Serves up to 30 customers a day, +15 per level. +1 daily condition." },
  shop: { name: "Merch Stand", cost: 380, league: 0, color: "#d0605a", desc: "Half of visitors buy: $3 each, +$1.50 per level. Serves up to 20 customers a day, +10 per level. +1 fan a day per level." },
  garden: { name: "Club Garden", cost: 150, league: 0, decor: true, color: "#78a858", desc: "+1 daily team condition per level. Visitors love it. You can plant more than one." },
  fountain: { name: "Fountain", cost: 220, league: 0, decor: true, color: "#7ac0e0", desc: "A landmark: more visitors, +1 daily condition. You can build more than one." },
  dorm: { name: "Dormitory", cost: 450, league: 0, maxLevel: 3, color: "#a08a6a", desc: "Room for +2 athletes per level (base squad of 6)." },
  scout: { name: "Scout Office", cost: 500, league: 1, maxLevel: 3, color: "#7a8a5a", desc: "Rarer recruits and −15% scouting cost per level." },
  workshop: { name: "Kit Workshop", cost: 560, league: 1, maxLevel: 3, color: "#9a7a5a", desc: "Forge gear: +0.6% distance per forge level. −10% forge cost per level." },
  library: { name: "Coaches' Library", cost: 380, league: 0, color: "#8a5a48", desc: "Coaching manuals, notebooks and old meet programmes. +0.5 Coaching Insights a day per level." },
  lab: { name: "Sports Lab", cost: 800, league: 2, color: "#7ab0d0", desc: "XP +10% per level. +0.6 Coaching Insights a day per level from movement data." },
  institute: { name: "Sports Science Institute", cost: 2400, league: 2, color: "#5a7ab0", desc: "Research staff study the squad's training. +1.5 Coaching Insights a day per level." },
  indoor: { name: "Indoor Training Hall", cost: 1800, league: 2, color: "#6c91a0", desc: "Unlocks low-load indoor technical sessions. Each level improves that session's gains; practice still needs competition experience. +0.3 Coaching Insights a day per level." },
  lodge: { name: "Coaching Lodge", cost: 2800, league: 3, color: "#a88760", desc: "Lower-level athletes gain +8% XP per level when a more experienced teammate trains the same event. Enables coached peer review. +0.5 Coaching Insights a day per level." },
  testing: { name: "Equipment Testing Centre", cost: 4500, league: 4, color: "#719d9b", desc: "Enables implement trials: build event mastery and technique with event-matched gear. Levels improve trial gains. No extra distance bonus. +0.6 Coaching Insights a day per level." },
  statue: { name: "Champion Statue", cost: 900, league: 0, needsTitle: true, color: "#c8b078", desc: "Needs a title. +2 fans a day per level; fans from wins +10%." },
};
export const FACILITY_IDS = Object.keys(FACILITIES);
// 13 building plots on the streets around the stadium (positions in src/render/world.js):
// Club Row across the forecourt (7, 9 | main road | 10, 11 · 12, 6, 0), the north lane (1, 2, 3)
// and the boulevard (8, 5, 4). The clubhouse is fixed at plot 9.
export const PLOT_COUNT = 13;
export const CLUB_PLOT = 9;
// Buildings side by side on the same street are neighbours; the main road splits Club Row.
export const NEIGHBOURS = [[6], [2], [1, 3], [2], [5], [8, 4], [12, 0], [9], [5], [7], [11], [10, 12], [11, 6]];
// Plots open in this order as the club climbs leagues.
export const PLOT_ORDER = [9, 10, 8, 11, 7, 12, 6, 0, 5, 1, 4, 2, 3];
export const PLOTS_BY_LEAGUE = [7, 9, 11, 13, 13];

// Neighbouring plots (side by side on a street) form combos; stadium milestones have a rule instead.
export const COMBOS = [
  { a: "cafe", b: "gym", key: "fuel", name: "Fuel Station", desc: "Training uses 15% less stamina." },
  { a: "gym", b: "workshop", key: "ironworks", name: "Iron Works", desc: "Power training +10%." },
  { a: "spa", b: "garden", key: "spaday", name: "Spa Day", desc: "Rest recovers +10 more stamina." },
  { a: "cafe", b: "garden", key: "picnic", name: "Picnic Lawn", desc: "Visitors +20%." },
  { a: "garden", b: "fountain", key: "zen", name: "Zen Corner", desc: "Team condition +2 a day." },
  { a: "shop", b: "cafe", key: "matchday", name: "Matchday Strip", desc: "Merch spending ×1.5." },
  { a: "lab", b: "workshop", key: "techhub", name: "Tech Hub", desc: "Forging costs −25%." },
  { a: "lab", b: "spa", key: "science", name: "Sports Science", desc: "XP +15%." },
  { a: "library", b: "institute", key: "thinktank", name: "Think Tank", desc: "Coaching Insights from buildings +25%." },
  { a: "scout", b: "club", key: "network", name: "Scouting Network", desc: "Rarer recruits." },
  { a: "dorm", b: "spa", key: "dorms", name: "Rest & Reload", desc: "Injury risk −50%, rest +5 stamina." },
  { a: "dorm", b: "cafe", key: "teamspirit", name: "Team Spirit", desc: "Team condition +1 a day." },
  { a: "statue", b: "fountain", key: "legends", name: "Hall of Legends", desc: "Fans from wins +25%." },
  { key: "arena", stadium: true, name: "Complete Arena", desc: "All four throwing areas at level 2: meet foul risk −12%.", hint: "Upgrade every throwing area…" },
  { key: "nightfever", stadium: true, name: "Night Fever", desc: "Floodlights plus covered stands: weekly income +15%.", hint: "Something about the stands after dark…" },
];

// One clear scale: every stat runs 1–100, with a letter grade.
export const GRADES = [
  ["SSS", 130, "#d04ad8"],
  ["SS", 110, "#e07a2a"],
  ["S", 90, "#e2a43a"],
  ["A", 80, "#e0604a"],
  ["B", 70, "#d0803a"],
  ["C", 60, "#8cb040"],
  ["D", 50, "#4aa07a"],
  ["E", 40, "#4f8fd6"],
  ["F", 30, "#7a80b0"],
  ["G", 0, "#9a9a90"],
];
export const gradeOf = (v) => GRADES.find(([, min]) => v >= min) || GRADES.at(-1);

// One promotion ladder. Each row owns its event distance bands and entry standards in metres.
// tier/stage are stable save coordinates; the five tiers also retain facility/venue milestones.
export const DIVISIONS = [
  ["Community Division",       [[8,10],[20,28],[22,32],[24,34]],       [8.2,21,24,26]],
  ["Local Division",           [[9,11],[25,33],[28,38],[30,40]],       [8.5,23,26,28]],
  ["District Division",        [[10,12],[30,38],[34,44],[36,46]],      [9.5,28,32,34]],
  ["County Division",          [[11,13],[35,42],[42,51],[44,54]],      [10.5,32,38,40]],
  ["County Premier Division",  [[12,14],[39,46],[47,56],[49,59]],      [11.5,36,43,45]],
  ["Regional Division",        [[13,15],[43,49],[52,60],[54,64]],      [12.5,40,48,50]],
  ["Regional Premier Division",[[14,16],[46,52],[56,64],[58,68]],      [13.5,43,52,54]],
  ["National Division 3",      [[15,17],[49,55],[60,68],[62,72]],      [14.5,46,56,58]],
  ["National Division 2",      [[16,18],[52,58],[64,72],[66,76]],      [15.5,49,60,62]],
  ["National Division 1",      [[17,19],[55,61],[68,75],[70,79]],      [16.5,52,64,66]],
  ["National Premier Division",[[18,20],[57,63],[70,77],[73,82]],      [17.5,54,66,69]],
  ["Continental Division",     [[18.5,20.5],[59,65],[72,79],[76,85]],  [18,56,68,72]],
  ["International Division",   [[19,21],[61,67],[74,81],[79,88]],      [18.5,58,70,75]],
  ["World Tour Division",      [[19.5,21.5],[63,69],[76,83],[82,91]],  [19,60,72,78]],
  ["Diamond Division",         [[20,22],[65,71],[78,85],[85,94]],      [19.5,62,74,81]],
].map(([name, bands, standards], index) => ({
  index, key: `${Math.floor(index/3)}:${index%3}`, name, tier: Math.floor(index/3), stage: index%3,
  marks: Object.fromEntries(EVENT_IDS.map((event,i) => [event,bands[i]])),
  standards: Object.fromEntries(EVENT_IDS.map((event,i) => [event,standards[i]])),
  titlePrize: [325,425,525,625,750,900,1050,1200,1400,1600,1850,2150,2500,3000,4000][index],
}));

// Compatibility metadata for facility, recruiting and venue milestones. Competition names,
// promotion and distance tuning come from the single DIVISIONS ladder above.
export const LEAGUES = [
  { name: DIVISIONS[0].name, entry: 0, tag: "A small club. A big beginning.", rating: 24, prize: 650, color: "#7f9f71", venue: "Willow Park", crowd: 0.25, unlock: "Two new plots, the Video room, Scout Office & Workshop" },
  { name: DIVISIONS[3].name, entry: 250, tag: "The local paper is paying attention.", rating: 46, prize: 1000, color: "#6eaaa8", venue: "Riverside Sports Ground", crowd: 0.4, unlock: "Two new plots, floodlights, competition throwing areas, Sports Lab & Indoor Training Hall" },
  { name: DIVISIONS[6].name, entry: 600, tag: "Familiar faces. Fiercer competition.", rating: 64, prize: 1600, color: "#9b94bf", venue: "National Athletics Centre", crowd: 0.55, unlock: "The last two plots, a championship track & Coaching Lodge" },
  { name: DIVISIONS[9].name, entry: 1500, tag: "Your little club has made a name abroad.", rating: 79, prize: 2400, color: "#cf986d", venue: "Aurora International Arena", crowd: 0.75, unlock: "The world stage & Equipment Testing Centre" },
  { name: DIVISIONS[12].name, entry: 3000, tag: "One club against the best.", rating: 89, prize: 4000, color: "#c4a458", venue: "Diamond Bowl", crowd: 0.95, unlock: "Defend the world title" },
];

export const CLUBS = [
  [
    { name: "Northgate AC", identity: "power", color: "#b65b4a", style: "Power-first club · dangerous in shot put" },
    { name: "Harbor Throws", identity: "control", color: "#587eae", style: "Technical club · discus specialists" },
    { name: "Oakridge TC", identity: "speed", color: "#9974a3", style: "Fast-turning squad · hammer & javelin" },
    { name: "Willow Juniors", identity: "adaptable", color: "#729954", style: "Young all-rounders · secondary-event learners" },
    { name: "Foundry Throws", identity: "power", color: "#9e6b53", style: "Strength specialists · shot and hammer" },
    { name: "Lakeside AC", identity: "control", color: "#507f9c", style: "Reliable legal series · fewer spectacular throws" },
  ],
  [
    { name: "Meadowfield Hares", identity: "speed", color: "#c07a3a", style: "Quick feet · javelin threats" },
    { name: "River City Otters", identity: "control", color: "#3f8f9a", style: "Smooth technicians" },
    { name: "Stonebridge Rams", identity: "power", color: "#7d6a5a", style: "Brute strength in the ring" },
    { name: "Ashgrove Union", identity: "hammer", color: "#8a6961", style: "Hammer specialists · rhythmic turns" },
    { name: "Westhaven AC", identity: "clutch", color: "#ab7851", style: "Late-series threats · strong final attempts" },
    { name: "Birchfield Collective", identity: "depth", color: "#608b78", style: "Versatile supporting scorers" },
  ],
  [
    { name: "Cedar Valley", identity: "depth", color: "#4f7d4a", style: "Deep, balanced roster" },
    { name: "Highland Union", identity: "hammer", color: "#8a4f6e", style: "Hammer royalty" },
    { name: "Eastbank Elite", identity: "clutch", color: "#3d5f8f", style: "Clutch performers" },
    { name: "Southbank Flyers", identity: "speed", color: "#a5914b", style: "Fast approaches · dangerous javelin specialists" },
    { name: "Quarry Athletics", identity: "power", color: "#887467", style: "Shot and hammer power · weaker flight events" },
    { name: "Elmwood Institute", identity: "adaptable", color: "#668e9f", style: "Technical cross-training · adaptable reserves" },
  ],
  [
    { name: "Metro Athletics", identity: "depth", color: "#c0504d", style: "Big-city professionals" },
    { name: "Ironwood Club", identity: "control", color: "#5a5f66", style: "Unflappable veterans" },
    { name: "Capital Union", identity: "clutch", color: "#2f5f9f", style: "National record holders" },
    { name: "Coastal Institute", identity: "adaptable", color: "#527f9e", style: "Versatile technicians · secondary-event coverage" },
    { name: "Granite Athletics", identity: "hammer", color: "#9a6b7f", style: "Hammer specialists · a strong supporting scorer" },
    { name: "Meridian AC", identity: "speed", color: "#7c9160", style: "Fast deliveries · javelin and discus" },
  ],
  [
    { name: "Aurora AC", identity: "depth", color: "#6a4fb0", style: "Reigning world power" },
    { name: "Summit Collective", identity: "power", color: "#2f8f7a", style: "High-altitude monsters" },
    { name: "Pacific Stars", identity: "clutch", color: "#d08a2f", style: "Showtime throwers" },
    { name: "Atlas Throws", identity: "hammer", color: "#9f6756", style: "Hammer contenders · disciplined supporting squad" },
    { name: "Zephyr Athletics", identity: "speed", color: "#598fa3", style: "Fast approach specialists · javelin threats" },
    { name: "Orion Collective", identity: "control", color: "#81916e", style: "Consistent series · precision equipment" },
  ],
];
export const CLUB_BIASES = [
  [2, -1, 0, -2],
  [-1, 3, -1, 0],
  [-2, -1, 2, 2],
];
export const CLUB_EVENT_BIASES = {
  power: [4,-2,3,-3], control: [-2,4,-1,0], speed: [-2,0,2,4], hammer: [0,-2,5,-2],
  adaptable: [-1,2,0,1], depth: [2,0,0,0], clutch: [-2,-1,2,2],
};

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
  olga: { name: "Grandma Olga", event: "shot", skill: "oldschool", type: "thrower", background: "poker", fee: 600, look: { skin: "#f0c6a0", hair: "#d8d8d0", style: 6, special: "granny", expression: "calm" }, stats: 4, potential: 78, hint: "Reach 250 fans", story: "A champion from the old days wants one more season. She brought her own knitting." },
  bjorn: { name: "Bjørn “The Oak”", event: "hammer", skill: "timber", type: "powerhouse", background: "lumberjack", fee: 900, look: { skin: "#e8b890", hair: "#a0522d", style: 1, special: "beard", expression: "grin" }, stats: 5, potential: 80, hint: "Upgrade the Strength Room to level 3", story: "A lumberjack heard your weights clanging from the forest." },
  r7: { name: "R-7 “Throwbot”", event: "discus", skill: "calibrated", type: "technician", background: "chess", fee: 1500, look: { skin: "#b8c4cc", hair: "#7a8a96", style: 0, special: "robot", expression: "smile" }, stats: 6, potential: 82, hint: "Upgrade the Kit Workshop and the Video room to level 2", story: "Your workshop and video room wired themselves together. Something is beeping." },
  yuki: { name: "Yuki Kaze", event: "jav", skill: "windreader", type: "speedster", background: "sprinter", fee: 1200, look: { skin: "#f0d0b0", hair: "#2a2a3a", style: 5, special: "scarf", expression: "calm" }, stats: 6, potential: 82, hint: "Win 10 meets", story: "A quiet javelin thrower who reads the wind like a book." },
  yeti: { name: "The Yeti", event: "hammer", skill: "avalanche", type: "powerhouse", background: "farm", fee: 3000, look: { skin: "#a8c0d8", hair: "#f4f4f4", style: 0, special: "yeti", expression: "grin" }, stats: 9, potential: 88, hint: "Reach the International Division", story: "Enormous footprints lead from the mountains straight to your clubhouse." },
  pip: { name: "Pip", event: "discus", skill: "wonderkid", type: "allrounder", background: "prodigy", fee: 400, look: { skin: "#e0a880", hair: "#e8a040", style: 3, special: "kid", expression: "cheeky" }, stats: -6, potential: 90, hint: "Discover 6 facility combos", story: "The groundskeeper's kid has been copying your athletes for months." },
};

// Given names and family names from all over the athletics world. The generator pairs them freely
// and keeps every name in the game distinct.
export const FIRST = [
  "Mara", "Tomas", "Noor", "Kofi", "Liv", "Hana", "Ezra", "Ines", "Dario", "Priya", "Ama", "Nico", "Zofia", "Kai",
  "Greta", "Owen", "Elif", "Lars", "Rui", "Tao", "Sade", "Mateo", "Ilse", "Bo", "Femi", "Anouk", "Ravi", "Odile",
  "Pax", "Wren", "Iker", "Saoirse", "Tariq", "Mina", "Otto", "Ayla", "Sven", "Lupe", "Hugo", "Nia", "Felix", "Rosa",
  "Arjun", "Ida", "Cyrus", "Maeve", "Aiko", "Bram", "Caius", "Dagny", "Esme", "Faisal", "Gideon", "Hollis", "Isolde", "Jonah",
  "Keziah", "Leif", "Marisol", "Nadia", "Orla", "Pavel", "Quentin", "Rhea", "Soren", "Thea", "Ulla", "Vikram", "Wanjiru", "Xavi",
  "Yara", "Zeke", "Adaeze", "Bjorn", "Calla", "Dmitri", "Eamon", "Fleur", "Galen", "Hedda", "Ishaan", "Jada", "Kenji", "Lucia",
  "Magnus", "Nell", "Obi", "Petra", "Rafferty", "Selin", "Tobias", "Una", "Valentin", "Willa", "Yusuf", "Zara", "Amara", "Benedikt",
  "Cleo", "Desmond", "Emeka", "Freya", "Gus", "Halima", "Idris", "Juno", "Kasimir", "Lena", "Malik", "Noemi", "Oskar", "Paloma",
  "Ronan", "Sakura", "Teodor", "Uriel", "Vesna", "Wilhelmina", "Yannick", "Zainab", "Agnes", "Bastian", "Camille", "Dev", "Elodie", "Fintan",
  "Gaia", "Hamid", "Ivo", "Jun", "Kalani", "Linnea", "Marek", "Nayeli", "Olu", "Pilar", "Rasmus", "Siddharth", "Tamsin", "Ugo",
  "Vera", "Wolfe", "Ximena", "Yosef", "Zuri", "Anika", "Basil", "Chidi", "Delphine", "Enzo", "Fern", "Gwen", "Hiro", "Ilaria",
  "Jasper", "Kirra", "Laszlo", "Mirela", "Nils", "Ottilie", "Percy", "Quinlan", "Rocio", "Stellan", "Tilde", "Uma", "Viggo", "Wade",
  "Yuki", "Zelda", "Abebe", "Birgit", "Corin", "Dalia", "Emil", "Farah", "Gunnar", "Hester", "Imani", "Jarrah", "Kwame", "Lorcan",
  "Mei", "Nikolai", "Oona", "Pia", "Reza", "Signe", "Tadeo", "Veda", "Wim", "Ysolde", "Zev",
];
export const LAST = [
  "Kowal", "Reyes", "Haddad", "Mensah", "Okafor", "Lindqvist", "Tanaka", "Brennan", "Moreau", "Novak", "Sato", "Duarte", "Walsh", "Holm",
  "Castro", "Ilunga", "Vance", "Petrov", "Achebe", "Nakamura", "Oduya", "Larsen", "Quinn", "Ferreira", "Kim", "Bauer", "Adeyemi", "Rossi",
  "Stone", "Vega", "Park", "Okoro", "Silva", "Dubois", "Kaur", "Berg", "Mwangi", "Hale", "Ortiz", "Fox", "Abara", "Bjornsson",
  "Calloway", "Delacroix", "Eriksen", "Fontaine", "Gallagher", "Horvath", "Iwasaki", "Jankowski", "Kaminski", "Lacroix", "Marchetti", "Nyberg", "Oyelaran", "Pellegrini",
  "Quiroga", "Ramanathan", "Szabo", "Thorne", "Underwood", "Valdivia", "Whitlock", "Yilmaz", "Zielinski", "Adebayo", "Bellamy", "Chaudhry", "Dragomir", "Espinoza",
  "Falk", "Grieve", "Hakimi", "Ivanova", "Juarez", "Kariuki", "Lund", "Mbeki", "Nowak", "Oyama", "Pruitt", "Rahimi", "Sorensen", "Takahashi",
  "Uchenna", "Varga", "Weller", "Yamada", "Zubiri", "Ashworth", "Bianchi", "Cardenas", "Demir", "Ekwueme", "Fitzgerald", "Gutierrez", "Hollander", "Ibarra",
  "Jovanovic", "Kovacs", "Lindgren", "Mahlangu", "Nasser", "Okonkwo", "Prieto", "Rinaldi", "Strand", "Tembo", "Ueda", "Vasquez", "Wojcik", "Yoon",
  "Zapata", "Amari", "Brandt", "Costa", "Dahl", "Engel", "Farouk", "Gomes", "Hartmann", "Inoue", "Jensen", "Kessler", "Lowe", "Mutua",
  "Nkosi", "Olsen", "Pacheco", "Rao", "Salo", "Tavares", "Ulloa", "Vogel", "Wiley", "Yeboah", "Zeller", "Achterberg", "Birch", "Cruz",
  "Dunmore", "Ellison", "Frost", "Garza", "Haugen", "Ishikawa", "Keane", "Lambert", "Mori", "Nwosu", "Orr", "Pike", "Ramos", "Sinclair",
  "Toivonen", "Vu", "Wainaina", "Asante", "Bose", "Cole", "Drummond",
];
export const SKINS = ["#f0c6a0", "#e2b08a", "#c98f66", "#a06a48", "#7a4e36", "#5e3a2a"];
export const HAIRS = ["#3a2a20", "#1e1e24", "#b8843e", "#8e4c33", "#d8c8a0", "#c8562e", "#4a3a5a"];
// Hair styles a new athlete can have (6 is Grandma Olga's bun and 12 Rudi's bald crown).
export const HAIR_STYLES = [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11];
export const FACIAL_HAIR = ["stubble", "moustache", "full", "goatee", "walrus"];
export const CLUB_PALETTES = [
  { name: "Forest & gold", primary: "#2f6b52", secondary: "#e2b04a" },
  { name: "Brick & cream", primary: "#b0503a", secondary: "#f2e2b8" },
  { name: "Navy & sky", primary: "#2c4a7a", secondary: "#8ac8f0" },
  { name: "Plum & peach", primary: "#6a3a6e", secondary: "#f0a878" },
  { name: "Teal & coral", primary: "#1f7a78", secondary: "#f07860" },
  { name: "Charcoal & lime", primary: "#3a3f44", secondary: "#b8e050" },
];
// Customisation: the kit and the look of the stadium. Purely cosmetic, unlocked by progress
// (fans, league, trophies, stadium upgrades) and then bought with club money.
// req keys: fans, league, trophies, stands (grandstand level), track (track level).
export const CUSTOMISE = {
  kit: {
    name: "Kit pattern",
    options: {
      plain: { name: "Plain", cost: 0 },
      stripes: { name: "Stripes", cost: 300, req: { fans: 120 } },
      hoops: { name: "Hoops", cost: 300, req: { fans: 300 } },
      sash: { name: "Sash", cost: 600, req: { trophies: 1 } },
      halves: { name: "Halves", cost: 800, req: { league: 2 } },
    },
  },
  shorts: {
    name: "Shorts",
    options: {
      dark: { name: "Dark", cost: 0 },
      black: { name: "Black", cost: 100 },
      white: { name: "White", cost: 150, req: { fans: 80 } },
      navy: { name: "Navy", cost: 150, req: { fans: 200 } },
      trim: { name: "Trim colour", cost: 250, req: { league: 1 } },
    },
  },
  seats: {
    name: "Seat colours",
    options: {
      solid: { name: "Solid", cost: 0 },
      stripes: { name: "Striped rows", cost: 400, req: { stands: 2 } },
      twotone: { name: "Two-tone", cost: 500, req: { stands: 2, fans: 600 } },
      blocks: { name: "Alternating blocks", cost: 700, req: { stands: 3 } },
    },
  },
  roof: {
    name: "Roof",
    options: {
      steel: { name: "Steel", cost: 0 },
      white: { name: "White", cost: 400, req: { stands: 2 } },
      slate: { name: "Slate", cost: 400, req: { stands: 2 } },
      club: { name: "Club colour", cost: 900, req: { stands: 2, trophies: 2 } },
    },
  },
  track: {
    name: "Track surface",
    options: {
      auto: { name: "Classic", cost: 0 },
      red: { name: "Red", cost: 300, req: { track: 2 } },
      blue: { name: "Blue", cost: 300, req: { track: 2 } },
      green: { name: "Green", cost: 700, req: { track: 2, fans: 1000 } },
      purple: { name: "Purple", cost: 1000, req: { track: 3 } },
      black: { name: "Black", cost: 1200, req: { track: 3, trophies: 3 } },
    },
  },
  standStyle: {
    name: "Stand style",
    note: "How your stands are built, on the campus and at home meets.",
    options: {
      classic: { name: "Classic seating", cost: 0 },
      terrace: { name: "Standing terraces", cost: 600, req: { stands: 1, fans: 300 } },
      timber: { name: "Heritage timber", cost: 1200, req: { stands: 2, fans: 800 } },
      cantilever: { name: "Modern cantilever", cost: 1800, req: { stands: 3, trophies: 2 } },
    },
  },
  backdrop: {
    name: "Skyline",
    note: "What home crowds see over the stands at meets, until the stands go all the way round.",
    options: {
      town: { name: "Rooftops", cost: 0 },
      trees: { name: "Parkland", cost: 300, req: { fans: 200 } },
      hills: { name: "Rolling hills", cost: 500, req: { league: 1 } },
      sea: { name: "Seafront", cost: 900, req: { fans: 1000 } },
      mountains: { name: "Mountains", cost: 1200, req: { league: 2 } },
      city: { name: "City skyline", cost: 1500, req: { league: 3 } },
    },
  },
  facade: {
    name: "Stadium facade",
    options: {
      auto: { name: "Classic", cost: 0 },
      brick: { name: "Red brick", cost: 900, req: { stands: 3 } },
      glass: { name: "Glass curtain", cost: 1400, req: { stands: 3, fans: 1500 } },
      timber: { name: "Timber slats", cost: 1200, req: { stands: 3, trophies: 2 } },
      club: { name: "Club panels", cost: 1600, req: { stands: 4 } },
    },
  },
  towerStyle: {
    name: "Tower",
    options: {
      spiral: { name: "Spiral", cost: 0 },
      lattice: { name: "Steel lattice", cost: 1500, req: { stands: 4 } },
      clock: { name: "Clock tower", cost: 1500, req: { stands: 4, trophies: 3 } },
    },
  },
  towerColors: {
    name: "Tower colours",
    options: {
      classic: { name: "Signal red", cost: 0 },
      club: { name: "Club colours", cost: 600, req: { stands: 4 } },
      gold: { name: "Champion gold", cost: 1000, req: { stands: 4, trophies: 4 } },
      night: { name: "Night blue", cost: 800, req: { stands: 4 } },
    },
  },
};
export const CUSTOM_IDS = Object.keys(CUSTOMISE);
const SURFACE_COLORS = { red: "#c0604a", blue: "#3d6cae", green: "#4a8a5a", purple: "#7a5aa8", black: "#4a4a52" };
export const SHORTS_COLORS = { black: "#2a2a30", white: "#f0ece4", navy: "#2c3a5a" };
export const STYLE_DEFAULT = { seats: "solid", roof: "steel", track: "auto", standStyle: "classic", backdrop: "town", facade: "auto", towerStyle: "spiral", towerColors: "classic", name: "" };
export const styleOf = (s) => ({ ...STYLE_DEFAULT, ...(s.stadiumStyle || {}) });
export function trackColorOf(level, surface = "auto") {
  if (level <= 0) return "#7aa858";
  if (level === 1) return "#a88a68";
  if (surface !== "auto" && SURFACE_COLORS[surface]) return SURFACE_COLORS[surface];
  return level >= 3 ? SURFACE_COLORS.blue : SURFACE_COLORS.red;
}
export function roofColorOf(s) {
  return { steel: "#b8c0c6", club: s.colors.primary, white: "#e8ecee", slate: "#5a646c" }[styleOf(s).roof] || "#b8c0c6";
}
// The tower's two accent colours.
export function towerColorsOf(s) {
  const c = s.colors;
  return { classic: ["#c8563e", c.primary], club: [c.primary, c.secondary], gold: ["#e2a43a", "#f4e2a0"], night: ["#3d6cae", "#9fe0ff"] }[styleOf(s).towerColors] || ["#c8563e", c.primary];
}
export const stadiumNameOf = (s) => styleOf(s).name.trim() || s.clubName;

// The world's elite: nods to the sport's real champions, with altered names, who compete for the
// Diamond League clubs (club: index into CLUBS[4]). level is their mark as a share of the event's
// world record in a good year. Their looks follow the real athletes' own: a mullet, a beard, braids.
export const ELITES = [
  { id: "krauser", name: "Rian Krauser", nation: "USA", event: "shot", club: 1, level: 0.985, look: { skin: "#f0c6a0", hair: "#6a4630", style: 6, gear: "band", gearColor: "#2a6ad0", facial: "full", build: "broad", expression: "determined" }, blurb: "A rotational giant. The shot looks like a marble in his hand." },
  { id: "walshe", name: "Tom Walshe", nation: "NZL", event: "shot", club: 2, level: 0.965, look: { skin: "#e8b890", hair: "#4a3424", style: 0, facial: "full", build: "broad", expression: "grin" }, blurb: "Kiwi grit. Has thrown through every kind of weather the Pacific can invent." },
  { id: "fabri", name: "Leo Fabri", nation: "ITA", event: "shot", club: 4, level: 0.958, look: { skin: "#e2b08a", hair: "#2a2420", style: 4, facial: "full", gear: "band", gearColor: "#2a6ad0", build: "broad", expression: "cheeky" }, blurb: "Plays to the crowd before, during and after every put." },
  { id: "jaxon", name: "Chase Jaxon", nation: "USA", event: "shot", club: 0, level: 0.94, look: { skin: "#7a4e36", hair: "#1a1a1a", style: 5, lashes: true, shadow: "#b050c0", build: "broad", expression: "fierce" }, blurb: "Fast and fierce through the ring, and saves her best for the last round." },
  { id: "aleknas", name: "Mykolas Aleknas", nation: "LTU", event: "discus", club: 5, level: 0.975, look: { skin: "#f0c6a0", hair: "#9a6a40", style: 1, expression: "smile" }, blurb: "Born into a discus dynasty, and writing his own chapter." },
  { id: "che", name: "Kristjan Che", nation: "SLO", event: "discus", club: 3, level: 0.962, look: { skin: "#f0c6a0", hair: "#2a2420", style: 0, facial: "stubble", expression: "determined" }, blurb: "A towering Slovenian with a release like a whip crack." },
  { id: "stol", name: "Daniel Stol", nation: "SWE", event: "discus", club: 1, level: 0.955, look: { skin: "#f0c6a0", hair: "#d8b060", style: 6, facial: "full", build: "broad", expression: "grin" }, blurb: "So big he makes the cage look like a phone box." },
  { id: "allmon", name: "Valerie Allmon", nation: "USA", event: "discus", club: 5, level: 0.94, look: { skin: "#f0c6a0", hair: "#e8d090", style: 9, lashes: true, expression: "calm" }, blurb: "A former dancer. Her spin is pure choreography." },
  { id: "katzberger", name: "Ethan Katzberger", nation: "CAN", event: "hammer", club: 0, level: 0.975, look: { skin: "#f0c6a0", hair: "#9a6a3a", style: 7, facial: "moustache", expression: "grin" }, blurb: "Spins faster than anyone alive, mullet flying." },
  { id: "nowicky", name: "Wojtek Nowicky", nation: "POL", event: "hammer", club: 3, level: 0.962, look: { skin: "#f0c6a0", hair: "#8a6a4a", style: 8, build: "broad", expression: "calm" }, blurb: "Calm as a pond, consistent as a clock, deadly in a final." },
  { id: "wlodarek", name: "Anita Wlodarek", nation: "POL", event: "hammer", club: 4, level: 0.95, look: { skin: "#f0c6a0", hair: "#9a6a40", style: 9, lashes: true, gear: "band", gearColor: "#d03040", expression: "smile" }, blurb: "A legend of the ring with more titles than she can carry." },
  { id: "rodgers", name: "Camryn Rodgers", nation: "CAN", event: "hammer", club: 2, level: 0.94, look: { skin: "#7a4e36", hair: "#2a1a10", style: 10, lashes: true, expression: "smile" }, blurb: "Smooth, fast and fearless when the medals are on the line." },
  { id: "chopra", name: "Neerav Chopra", nation: "IND", event: "jav", club: 5, level: 0.97, look: { skin: "#c98f66", hair: "#1a1a1a", style: 0, facial: "stubble", expression: "calm" }, blurb: "Calm and precise. Often wins it with his very first throw." },
  { id: "nadim", name: "Arshad Nadim", nation: "PAK", event: "jav", club: 1, level: 0.965, look: { skin: "#a06a48", hair: "#1a1a1a", style: 0, facial: "full", expression: "smile" }, blurb: "Learned on a dirt runway. Now he owns the biggest stages." },
  { id: "vadlech", name: "Jakub Vadlech", nation: "CZE", event: "jav", club: 3, level: 0.952, look: { skin: "#f0c6a0", hair: "#5a3a2a", style: 8, facial: "stubble", expression: "smirk" }, blurb: "A rangy Czech with an approach as long as a summer evening." },
  { id: "webber", name: "Julian Webber", nation: "GER", event: "jav", club: 5, level: 0.94, look: { skin: "#f0c6a0", hair: "#7a5a3a", style: 0, expression: "grin" }, blurb: "German precision with a crowd-pleaser's grin." },
];
// Kits the elites wear for their nations: vest and trim.
export const NATION_KITS = {
  USA: ["#2a4a9a", "#d03040"], NZL: ["#1e1e24", "#f4efe2"], ITA: ["#2a6ad0", "#f4efe2"], LTU: ["#e0b030", "#2a8a4a"],
  SLO: ["#f4efe2", "#2a5ab0"], SWE: ["#2a6ab0", "#f2c94c"], CAN: ["#d03040", "#f4efe2"], POL: ["#f4efe2", "#d03040"],
  IND: ["#2a5ab0", "#e08a2a"], PAK: ["#2a7a4a", "#f4efe2"], CZE: ["#2a4a9a", "#d03040"], GER: ["#2a2a2a", "#d03040"],
};
export const HELPER = "Juno";
// Juno keeps the club's diary in a cardigan in the club's colours.
export const HELPER_LOOK = { skin: "#f0c6a0", hair: "#5a3a6a", style: 2, lashes: true, expression: "happy" };
// The club's kit-shop keeper, who also calls out each delivery and sale.
// Rudi has run the shop for thirty years: bald on top, a walrus moustache, reading glasses, a
// pencil behind the ear and a canvas apron over a checked shirt.
export const SHOPKEEPER = { name: "Rudi", role: "kit shop", look: { skin: "#d8a47a", hair: "#9a9088", brow: "#6a625c", style: 12, facial: "walrus", glasses: true, glassesColor: "#4a3428", expression: "happy" }, colors: { primary: "#4a6a8a", secondary: "#f4efe2", kit: "check" }, apron: "#2f6b52" };
