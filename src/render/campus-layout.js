// Shared map geometry: drawing, walking routes and picking use the same lots.
export const MAP_W = 1000, MAP_H = 680, LOT_W = 112;
export const STREETS = { row:500, north:250, blvd:630, plaza:398, avenue:548, nearRow:536, practice:394 };
export const LOWER_LOT_TOP = 540;
export const LOTS = [
  [808,410], [600,160], [720,160], [840,160], [600,LOWER_LOT_TOP], [488,LOWER_LOT_TOP], [696,410],
  [16,410], [376,LOWER_LOT_TOP], [128,410], [304,410], [416,410], [584,410],
];
const LOT_STREETS = ["row","north","north","north","blvd","blvd","row","row","blvd","row","row","row","row"];
export const streetOf = i => STREETS[LOT_STREETS[i]];
export const baseOf = i => LOTS[i][1] + 66;
export const parcelBounds = i => ({x:LOTS[i][0]+3,y:LOTS[i][1]+8,w:LOT_W-6,h:streetOf(i)-12-(LOTS[i][1]+8)});
export const front = i => [LOTS[i][0] + 30, baseOf(i) + 10];
export const POCKET_PARK = { x:16, y:548, w:146, h:70 };
export const PARKING = [
  { x:172, y:550, w:82, h:56, seed:3 },
  { x:306, y:576, w:62, h:30, seed:9 },
];
export const BUS_BAY = { x:306, y:530, w:62, h:27 };
export const BUS_STOP = { x:342, y:563, waiting:[356,STREETS.nearRow] };
