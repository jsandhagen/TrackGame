// What the club's people say: short lines for speech bubbles on the grounds and in the circle.
// Each athlete talks in their background's voice; secret characters have their own. Lines stay
// short (18 characters or fewer) so a pixel bubble never covers more than a couple of neighbours.
import { moodOf } from "./core.js";

const GENERAL = {
  idle: ["NICE DAY FOR IT", "ONE MORE REP", "FEELING GOOD", "LET'S GO!", "HUP HUP!", "WHO'S NEXT?"],
  tired: ["PHEW...", "MY LEGS...", "NEED A NAP", "WATER PLEASE", "SO TIRED..."],
  happy: ["GREAT DAY!", "I FEEL FAST!", "LOVE THIS CLUB", "PB INCOMING!"],
  low: ["NOT TODAY...", "MEH.", "SIGH..."],
  rest: ["ZZZ...", "FIVE MINUTES...", "ICE PACK TIME"],
  meetSoon: ["MEET SOON!", "NERVES...", "I'M READY!", "CALL ROOM SOON"],
  levelUp: ["LEVEL UP!", "STRONGER!", "YES!!"],
  pb: ["PERSONAL BEST!", "WHAT A THROW!", "YESSS!!"],
  lead: ["INTO THE LEAD!", "TOP OF THE BOARD", "CATCH ME!"],
  good: ["NICE ONE!", "SOLID.", "GOOD MARK"],
  meh: ["COULD BE BETTER", "HMM...", "NEXT ONE."],
  foul: ["NOOO!", "ARGH!", "OVER THE LINE!", "SO CLOSE..."],
  join: ["HAPPY TO BE HERE!", "LET'S THROW!", "NICE TO MEET YOU!"],
};
// Each background adds a few lines of its own on top of the general ones.
const BACKGROUND = {
  farm: { idle: ["LIKE HAY BALES!", "UP AT DAWN"], tired: ["HARVEST WAS EASIER"], pb: ["BUMPER CROP!"], join: ["FRESH OFF THE FARM"] },
  lumberjack: { idle: ["TIMBER!", "SPLIT IT!"], pb: ["SPLIT LIKE OAK!"], join: ["WHERE'S THE AXE?"] },
  gymnast: { idle: ["STICK THE LANDING", "POINT THE TOES"], foul: ["WOBBLED!"], join: ["READY TO TUMBLE!"] },
  dancer: { idle: ["AND A ONE-TWO...", "PIROUETTE!"], happy: ["LA LA LA ♥"], join: ["SHALL WE DANCE?"] },
  sprinter: { idle: ["GOTTA GO FAST", "ZOOM!"], tired: ["NO MORE LAPS..."], join: ["I'LL RACE YOU!"] },
  chess: { idle: ["AS PLANNED.", "CHECKMATE."], foul: ["MISCALCULATED."], pb: ["AS CALCULATED."], join: ["A FINE OPENING."] },
  poker: { idle: ["...", "HM."], pb: ["...NOT BAD."], foul: ["...", "FOLD."], join: ["...HI."] },
  marathon: { idle: ["ANOTHER 10K?", "STILL WARM UP"], tired: ["JUST A STITCH"], join: ["WHEN'S THE RUN?"] },
  clown: { idle: ["HONK HONK!", "KNOCK KNOCK!", "TA-DA!"], foul: ["MEANT THAT!"], pb: ["HOLD APPLAUSE!"], join: ["SEND IN THE CLOWN!"] },
  bloomer: { idle: ["BETTER EVERY DAY", "MY TIME SOON"], levelUp: ["TOLD YOU SO!"], join: ["WATCH ME GROW!"] },
  showboat: { idle: ["CAMERAS ON ME!", "AUTOGRAPH?"], pb: ["DID YOU FILM IT?"], lead: ["THE STAR IS HERE"], join: ["YOUR NEW STAR!"] },
  prodigy: { idle: ["TOO EASY.", "BORN FOR THIS"], pb: ["OBVIOUSLY."], join: ["LET'S WIN THINGS."] },
};
const SECRET = {
  olga: { idle: ["IN MY DAY...", "EAT YOUR GREENS"], pb: ["STILL GOT IT!"], join: ["MOVE OVER, KIDS"] },
  bjorn: { idle: ["TIMBERRR!", "HMM. YES."], pb: ["MIGHTY OAK!"], join: ["BJORN IS HERE."] },
  r7: { idle: ["BEEP BOOP", "CALIBRATING..."], pb: ["OPTIMAL."], foul: ["ERROR 404"], join: ["UNIT R-7 ONLINE"] },
  yuki: { idle: ["THE WIND SAYS...", "SOFT BREEZE"], pb: ["RODE THE WIND!"], join: ["THE WIND SENT ME"] },
  yeti: { idle: ["RAWR!", "TOO WARM HERE"], pb: ["ROOAAAR!!"], join: ["...RAWR?"] },
  pip: { idle: ["AM I DOING IT?", "WHEEE!"], pb: ["MUM, LOOK!"], join: ["CAN I PLAY TOO?"] },
};
// Visitors and the head coach.
export const CROWD_LINES = ["GO GO GO!", "♥", "NICE THROW!", "WHAT A CLUB!", "COFFEE TIME", "SELFIE!", "WE ♥ YOU!"];
export const COACH_LINES = ["GOOD WORK!", "HIPS FIRST!", "KEEP IT UP!", "WATER BREAK!", "BEAUTIFUL!", "AGAIN!"];

// A short line for an athlete in a given situation; `seed` picks among the options.
export function line(a, situation, seed = 0) {
  const own = (a?.secret && SECRET[a.secret]?.[situation]) || BACKGROUND[a?.background]?.[situation] || [],
    pool = [...own, ...own, ...(GENERAL[situation] || GENERAL.idle)];
  return pool[Math.abs(Math.floor(seed)) % pool.length];
}
// What an athlete on the grounds is likely to say right now.
export function idleSituation(s, a) {
  if (a.injury) return "rest";
  if (a.stamina < 30) return "tired";
  const days = s.matchDay == null ? null : s.matchDay - s.day;
  if (days != null && days >= 0 && days <= 2) return "meetSoon";
  const mood = moodOf(a);
  return mood >= 4 ? "happy" : mood <= 1 ? "low" : "idle";
}
// A small emote instead of words: hearts when happy, sweat when tired, notes when content.
export function emoteFor(s, a) {
  const situation = idleSituation(s, a);
  return { happy: "♥", tired: "~", low: "...", rest: "Z", meetSoon: "!" }[situation] || (moodOf(a) >= 3 ? "♪" : "?");
}
// How an athlete reacts to the throw that just landed.
export function throwSituation(beat) {
  if (beat.mark == null) return "foul";
  if (beat.newPb && beat.previousPb > 0) return "pb";
  if (beat.tookLead) return "lead";
  return beat.improvement > 0 || beat.scoringSwing > 0 ? "good" : "meh";
}
