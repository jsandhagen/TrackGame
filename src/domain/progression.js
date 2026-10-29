// New clubs learn one system after each meet, regardless of the result.
// Saves without this field are established careers and retain all their systems.
export const INTRODUCTIONS = [
  { id: "plans", name: "Daily training plans", desc: "Choose each athlete's daily routine. Automatic rest and tapering keep the squad ready.", page: "train" },
  { id: "sessions", name: "Coached sessions", desc: "Spend Coaching Insights on a focused session. Each athlete can train once per day.", page: "train" },
  { id: "skills", name: "Skills and ranks", desc: "Spend earned skill points and promote athletes when they reach the required level.", page: "squad" },
  { id: "build", name: "Club grounds", desc: "Invest meet earnings in facilities and stadium upgrades to support the squad.", page: "build" },
  { id: "kit", name: "Equipment and items", desc: "Use your saved rewards, equip implements and browse the kit shop.", page: "shop" },
  { id: "recruit", name: "Scouting", desc: "Scout new teammates and add depth to your event entries.", page: "recruit" },
  { id: "chemistry", name: "Training chemistry", desc: "Train compatible teammates together to discover partnerships that improve their gains.", page: "train" },
  { id: "duties", name: "Facility duties", desc: "Assign teammates to help at club facilities and earn money, fans or Coaching Insights.", page: "squad" },
  { id: "office", name: "Club office", desc: "Choose sponsors, review club finances and explore your season goals.", page: "club" },
  { id: "stories", name: "Club decisions", desc: "Stories and choices now arrive between meets. The secretary will explain each decision.", page: "home" },
  { id: "invitations", name: "Invitationals", desc: "Look out for invitations to one-day meets against an All-Star Select.", page: "league" },
];
export const introductionCount = (s) => s.onboarding == null ? INTRODUCTIONS.length : s.onboarding.meets;
export const systemUnlocked = (s, id) => {
  const index = INTRODUCTIONS.findIndex(d => d.id === id);
  return index < 0 || introductionCount(s) > index;
};
export const systemProblem = (s, id) => systemUnlocked(s, id) ? null : "Introduced after meet " + (INTRODUCTIONS.findIndex(d => d.id === id) + 1) + ".";
export const nextIntroduction = (s) => INTRODUCTIONS[introductionCount(s)] || null;
export const firstMeet = (s) => s.onboarding != null && s.onboarding.meets === 0;
export const pageSystem = { train: "plans", build: "build", shop: "kit", recruit: "recruit", club: "office" };
export const pageUnlocked = (s, page) => !pageSystem[page] || systemUnlocked(s, pageSystem[page]);
export function introduceAfterMeet(s) {
  if (!s.onboarding || s.onboarding.meets >= INTRODUCTIONS.length) return null;
  const intro = nextIntroduction(s);
  s.onboarding.meets++;
  return intro;
}
