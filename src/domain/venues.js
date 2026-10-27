// Where a meet is held. Home meets use your own stadium; each rival club has its own
// ground whose size follows the level it competes at, from a park with a grass bank
// in the Community League to an Olympic bowl in the World League. League finals go to
// the level's neutral showpiece venue.
import { LEAGUES, stadiumNameOf } from "../game-content.js";

export const GRANDEUR = ["Club ground", "Sports ground", "Covered stadium", "Two-tier arena", "Olympic bowl"];
const SUFFIXES = [
  ["Rec Ground", "Park", "Common", "Fields", "Lane", "Meadow"],
  ["Sports Ground", "Park", "Road", "Lane", "Recreation Ground", "Bowl"],
  ["Stadium", "Park Stadium", "Bowl", "Arena", "Ground", "Field"],
  ["Arena", "Stadium", "Park", "Coliseum", "Bowl", "Grand Stadium"],
  ["International Stadium", "Arena", "Olympic Park", "Coliseum", "Bowl", "Stadium"],
];
// What you see over the back of the stands, read from the club's name.
const BACKDROPS = [
  [/harbor|lake|coast|pacific|bay|quay|river|haven/i, "sea"],
  [/highland|summit|granite|quarry|stone|ridge|alpine|peak/i, "mountains"],
  [/metro|capital|city|bank|institute|union|elite/i, "city"],
  [/oak|willow|cedar|birch|elm|ash|grove|wood/i, "trees"],
  [/meadow|field|hare|ram|flyer/i, "hills"],
];
export const backdropOf = (name) => BACKDROPS.find(([re]) => re.test(name))?.[1] || "town";
export const groundName = (club, tier) => club.name.split(" ")[0] + " " + SUFFIXES[tier][club.id % SUFFIXES[tier].length];
const NEUTRAL_BACKDROPS = ["trees", "town", "hills", "city", "mountains"];

// kind: "duel" | "league" | "final" | "cup"; club: the opponent; invitation: the cup offer.
export function venueFor(s, { home, kind, tier, club, invitation }) {
  if (home)
    return { name: stadiumNameOf(s), home: true, tier, grand: s.stadium.stands, lights: s.stadium.lights > 0, color: s.colors.primary, trim: s.colors.secondary, backdrop: "town", own: true };
  if (kind === "cup" && invitation)
    return { name: invitation.venue, home: false, tier, grand: Math.min(4, Math.max(3, tier + 1)), lights: true, color: "#c9a227", trim: "#fff4cb", backdrop: invitation.backdrop, special: true };
  if (kind === "final")
    return { name: LEAGUES[tier].venue, home: false, tier, grand: Math.min(4, tier + 1), lights: tier >= 1, color: LEAGUES[tier].color, trim: "#f4efe2", backdrop: NEUTRAL_BACKDROPS[tier], neutral: true };
  return { name: club ? groundName(club, tier) : LEAGUES[tier].venue, home: false, tier, grand: tier, lights: tier >= 2, color: club?.color || LEAGUES[tier].color, trim: "#f4efe2", backdrop: backdropOf(club?.name || "") };
}
export const venueLabel = (v) => (v.home ? "at home · " : v.neutral ? "neutral venue · " : v.special ? "" : "away · ") + v.name;
