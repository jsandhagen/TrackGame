export const CLUBS = [
  [
    "Northgate AC",
    "Harbor Throws",
    "Oakridge TC"
  ],
  [
    "Meadowfield",
    "River City",
    "Stonebridge"
  ],
  [
    "Cedar Valley",
    "Highland Union",
    "Eastbank Elite"
  ],
  [
    "Metro Athletics",
    "Ironwood Club",
    "Capital Union"
  ],
  [
    "Aurora AC",
    "Summit Collective",
    "Pacific Stars"
  ]
];

export const CLUB_COLORS = [
  "#b65b4a",
  "#587eae",
  "#9974a3"
];

export const COMBOS = [
  {
    "a": "rings",
    "b": "gym",
    "name": "Power circuit",
    "desc": "+8% power growth.",
    "key": "power"
  },
  {
    "a": "rings",
    "b": "analysis",
    "name": "The release lab",
    "desc": "12% lower meet foul risk.",
    "key": "precision"
  },
  {
    "a": "garden",
    "b": "recovery",
    "name": "A place to recover",
    "desc": "1 extra fatigue recovery per day.",
    "key": "recovery"
  },
  {
    "a": "stands",
    "b": "club",
    "name": "Home advantage",
    "desc": "+15% weekly income.",
    "key": "fans"
  }
];

export const EVENTS = {
  "shot": {
    "name": "Shot put",
    "short": "SHOT",
    "color": "#e5b65b",
    "weights": [
      0.45,
      0.32,
      0.1,
      0.13
    ],
    "min": 6,
    "max": 24,
    "unit": "m",
    "hint": "Drive through the ring. A controlled opener puts points on the board."
  },
  "discus": {
    "name": "Discus",
    "short": "DISC",
    "color": "#8ac4d0",
    "weights": [
      0.22,
      0.43,
      0.22,
      0.13
    ],
    "min": 16,
    "max": 77,
    "unit": "m",
    "hint": "Rhythm and release matter. Technical athletes reward patient coaching."
  },
  "hammer": {
    "name": "Hammer",
    "short": "HAM",
    "color": "#d8a1ae",
    "weights": [
      0.32,
      0.32,
      0.27,
      0.09
    ],
    "min": 18,
    "max": 89,
    "unit": "m",
    "hint": "Build speed through the turns. Fresh legs help contain the risk."
  },
  "jav": {
    "name": "Javelin",
    "short": "JAV",
    "color": "#aac57d",
    "weights": [
      0.2,
      0.36,
      0.33,
      0.11
    ],
    "min": 18,
    "max": 99,
    "unit": "m",
    "hint": "Turn approach speed into a clean, confident release."
  }
};

export const EVENT_IDS = [
  "shot",
  "discus",
  "hammer",
  "jav"
];

export const FACILITIES = {
  "club": {
    "name": "Clubhouse",
    "cost": 0,
    "league": 0,
    "fixed": true,
    "desc": "Your home. +25 weekly income per extra level.",
    "color": "#b77950"
  },
  "rings": {
    "name": "Throws centre",
    "cost": 260,
    "league": 0,
    "desc": "+12% technique growth per level. Upgrades unlock a focused clinic.",
    "color": "#6a9896",
    "stat": 1
  },
  "gym": {
    "name": "Strength room",
    "cost": 280,
    "league": 0,
    "desc": "+12% power growth per level. Upgrades unlock a focused clinic.",
    "color": "#c2915b",
    "stat": 0
  },
  "sprint": {
    "name": "Sprint lanes",
    "cost": 240,
    "league": 0,
    "desc": "+12% speed growth per level. Upgrades unlock a focused clinic.",
    "color": "#ba7256",
    "stat": 2
  },
  "recovery": {
    "name": "Recovery room",
    "cost": 340,
    "league": 0,
    "desc": "Clear 1 extra fatigue per day per level.",
    "color": "#7baba1"
  },
  "garden": {
    "name": "Club garden",
    "cost": 140,
    "league": 0,
    "desc": "+0.3 daily form per level; a recovery synergy.",
    "color": "#87a468"
  },
  "analysis": {
    "name": "Video studio",
    "cost": 440,
    "league": 1,
    "desc": "+12% focus growth per level; a technical synergy. Upgrades unlock a focused clinic.",
    "color": "#8c83ad",
    "stat": 3
  },
  "workshop": {
    "name": "Kit workshop",
    "cost": 560,
    "league": 2,
    "desc": "Equipment tuning costs 10% less per level.",
    "color": "#9a8468"
  },
  "stands": {
    "name": "Grandstand",
    "cost": 650,
    "league": 3,
    "desc": "+50 sponsor income per week per level.",
    "color": "#617f92"
  }
};

export const FIRST = [
  "Mara",
  "Tomas",
  "Noor",
  "Kofi",
  "Liv",
  "Hana",
  "Ezra",
  "Ines",
  "Yuki",
  "Dario",
  "Priya",
  "Ama",
  "Nico",
  "Zofia",
  "Kai",
  "Greta",
  "Owen",
  "Elif",
  "Lars",
  "Rui"
];

export const HAIRS = [
  "#4a3225",
  "#26282b",
  "#bd874b",
  "#8e4c33",
  "#d6c8a6"
];

export const KIT = {
  "standard": {
    "name": "Club issue",
    "cost": 0,
    "slot": "implement",
    "desc": "Reliable standard kit. No tradeoffs.",
    "mark": 1,
    "foul": 1
  },
  "control": {
    "name": "Precision implement",
    "cost": 180,
    "slot": "implement",
    "desc": "−1% distance, 30% lower foul risk.",
    "mark": 0.99,
    "foul": 0.7
  },
  "distance": {
    "name": "Competition implement",
    "cost": 320,
    "slot": "implement",
    "desc": "+2% distance, 25% more foul risk.",
    "mark": 1.02,
    "foul": 1.25
  },
  "development": {
    "name": "Development implement",
    "cost": 140,
    "slot": "implement",
    "desc": "+12% training growth, −1.5% meet distance.",
    "mark": 0.985,
    "gain": 1.12,
    "foul": 1
  },
  "trainers": {
    "name": "Club trainers",
    "cost": 0,
    "slot": "shoes",
    "desc": "Comfortable everyday training shoes.",
    "mark": 1,
    "load": 1
  },
  "support": {
    "name": "Support shoes",
    "cost": 160,
    "slot": "shoes",
    "desc": "15% less training load, −0.5% distance.",
    "mark": 0.995,
    "load": 0.85
  },
  "reactive": {
    "name": "Reactive event shoes",
    "cost": 260,
    "slot": "shoes",
    "desc": "+1.2% distance, 10% more training load.",
    "mark": 1.012,
    "load": 1.1
  }
};

export const LAST = [
  "Kowal",
  "Reyes",
  "Okafor",
  "Lindqvist",
  "Tanaka",
  "Brennan",
  "Moreau",
  "Mensah",
  "Novak",
  "Sato",
  "Duarte",
  "Walsh",
  "Holm",
  "Castro",
  "Ilunga",
  "Vance"
];

export const LEAGUES = [
  {
    "name": "Community League",
    "tag": "A small club. A big beginning.",
    "rating": 24,
    "prize": 650,
    "color": "#7f9f71",
    "venue": "Willow Park",
    "unlock": "New clubs, new ambitions"
  },
  {
    "name": "County League",
    "tag": "The local paper is paying attention.",
    "rating": 36,
    "prize": 1000,
    "color": "#6eaaa8",
    "venue": "Riverside Sports Ground",
    "unlock": "Analysis room & a new training route"
  },
  {
    "name": "Regional League",
    "tag": "Familiar faces. Fiercer competition.",
    "rating": 48,
    "prize": 1600,
    "color": "#9b94bf",
    "venue": "Cedar Valley Stadium",
    "unlock": "Workshop & advanced equipment tuning"
  },
  {
    "name": "National League",
    "tag": "Your little club has made a name.",
    "rating": 60,
    "prize": 2400,
    "color": "#cf986d",
    "venue": "National Athletics Centre",
    "unlock": "Grandstand & national crowds"
  },
  {
    "name": "World League",
    "tag": "One club against the best.",
    "rating": 72,
    "prize": 4000,
    "color": "#c4a458",
    "venue": "Aurora International Arena",
    "unlock": "The world title. Then defend it."
  }
];

export const PLANS = {
  "balanced": {
    "name": "All-round",
    "short": "Balanced",
    "gain": 1,
    "load": 1,
    "form": 0.5,
    "desc": "Steady gains across all four stats. A reliable default."
  },
  "power": {
    "name": "Power block",
    "short": "Strength",
    "stat": 0,
    "gain": 1.35,
    "load": 1.05,
    "form": 0.35,
    "desc": "Prioritize power with a demanding, focused block."
  },
  "technique": {
    "name": "Technical work",
    "short": "Technique",
    "stat": 1,
    "gain": 1.35,
    "load": 1.05,
    "form": 0.35,
    "desc": "Prioritize technique with a focused training block."
  },
  "speed": {
    "name": "Explosive work",
    "short": "Speed",
    "stat": 2,
    "gain": 1.35,
    "load": 1.05,
    "form": 0.35,
    "desc": "Prioritize speed with a focused training block."
  },
  "sharpen": {
    "name": "Meet preparation",
    "short": "Sharpen",
    "gain": 0.6,
    "load": 0.65,
    "form": 2.3,
    "desc": "Trade some growth for competition form."
  },
  "recover": {
    "name": "Recover",
    "short": "Recovery",
    "gain": 0.18,
    "load": 0.12,
    "form": 0.9,
    "desc": "Restore energy, clear fatigue, and return ready."
  }
};

export const SKILLS = {
  "student": {
    "name": "Good habits",
    "sessions": 3,
    "meets": 0,
    "level": 1,
    "desc": "+8% training growth. Build a foundation.",
    "gain": 1.08
  },
  "steady": {
    "name": "Steady hands",
    "sessions": 0,
    "meets": 1,
    "level": 1,
    "desc": "20% lower foul risk. A reliable opener.",
    "foul": 0.8
  },
  "closer": {
    "name": "Last-throw nerve",
    "sessions": 6,
    "meets": 2,
    "level": 2,
    "desc": "+2.5% distance on the final attempt.",
    "mark": 1.025
  },
  "rhythm": {
    "name": "Rhythm engine",
    "tier": 1,
    "sessions": 12,
    "meets": 4,
    "level": 4,
    "desc": "At 70+ form: +2% distance and 10% lower foul risk.",
    "formMark": 1.02
  },
  "explosive": {
    "name": "Explosive foundation",
    "tier": 1,
    "sessions": 15,
    "meets": 4,
    "level": 5,
    "desc": "Power and speed blocks give 18% more stat growth.",
    "focusedGain": 1.18
  },
  "chain": {
    "name": "Kinetic chain",
    "tier": 2,
    "sessions": 24,
    "meets": 7,
    "level": 7,
    "desc": "At 30 or less fatigue, All out adds another 3% distance.",
    "attackMark": 1.03
  },
  "comeback": {
    "name": "Reset & respond",
    "tier": 2,
    "sessions": 24,
    "meets": 8,
    "level": 7,
    "desc": "After a foul: +4% distance and 20% lower foul risk.",
    "comebackMark": 1.04
  },
  "captain": {
    "name": "Captain’s standard",
    "tier": 3,
    "sessions": 35,
    "meets": 10,
    "level": 10,
    "desc": "Four different, 80% ready teammates gain 1.5% distance. One captain bonus per team.",
    "teamMark": 1.015
  },
  "limitbreak": {
    "name": "Signature release",
    "tier": 4,
    "sessions": 50,
    "meets": 14,
    "level": 12,
    "desc": "Once per meet: activate +6.5% distance with lower risk. Needs 70 form and fatigue below 50.",
    "signature": 1.065
  }
};

export const SKINS = [
  "#f0c6a0",
  "#d8a47e",
  "#ac7753",
  "#7f5138",
  "#613d2d"
];

export const TACTICS = {
  "safe": {
    "name": "Bank a mark",
    "mark": 0.997,
    "foul": 0.4,
    "noise": [
      0.995,
      1.005
    ],
    "desc": "Steady distance · low foul risk"
  },
  "balanced": {
    "name": "Controlled",
    "mark": 1,
    "foul": 1,
    "noise": [
      0.97,
      1.03
    ],
    "desc": "Balanced range and risk"
  },
  "attack": {
    "name": "All out",
    "mark": 1.025,
    "foul": 3.8,
    "noise": [
      0.935,
      1.035
    ],
    "desc": "Higher ceiling · variable distance · high risk"
  }
};

export const TRAITS = {
  "technician": {
    "name": "Natural technician",
    "desc": "+12% technique growth",
    "stat": 1
  },
  "powerhouse": {
    "name": "Powerhouse",
    "desc": "+12% power growth",
    "stat": 0
  },
  "explosive": {
    "name": "Quick feet",
    "desc": "+12% speed growth",
    "stat": 2
  },
  "composed": {
    "name": "Cool head",
    "desc": "Lower foul risk in pressure moments",
    "foul": 0.78
  },
  "resilient": {
    "name": "Bounces back",
    "desc": "2 extra fatigue recovery per day",
    "recovery": 2
  }
};
