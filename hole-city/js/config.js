// Hole City — central tuning file.
// Every gameplay number lives here so balancing never means hunting through code.
// World units: 1 unit = 5 cm (a person is ~34 units tall). Physics runs in meters (x0.05).
window.HC = window.HC || {};

HC.CONFIG = {
  world: {
    size: 5000,            // playable square (250 m), crossing at start speed ≈ 20 s like hole.io
    unitToMeter: 0.05,
    border: 60,            // holes stay this far inside the land edge
  },

  match: {
    classicSeconds: 120,   // hole.io Classic is a strict 2:00
    soloSeconds: 120,
    battleSeconds: 180,    // Battle: last hole standing, capped so it can never stall
    bots: 6,               // Classic = you + 6 rivals (7 holes, like hole.io)
    battleBots: 5,
    countdown: 3,
    endFreeze: 1.2,
  },

  hole: {
    startRadius: 17,       // diameter 1.7 m: people, cones, hydrants fit at level 1
    radiusGrowth: 1.2,     // radius multiplier per level
    playerSpeed: 250,      // units/s at level 1 (requested)
    botSpeed: 220,         // units/s at level 1 (requested)
    speedExponent: 0.32,   // speed *= (r/startRadius)^exp — big holes cover more ground
    accel: 9,              // velocity easing (1/s)
    radiusEase: 6,         // visual radius easing toward target (1/s)
    eatHoleRatio: 1.1,     // must be 10% bigger to eat another hole
    killPointsMin: 25,
    killScoreShare: 0.3,   // + 30% of the victim's score
    respawnSeconds: 4,
    respawnKeepXp: 0.5,    // respawn keeps half your size progress (hole.io resets to 0 — too punishing for kids)
    spawnProtection: 3,
    maxLevel: 20,
  },

  // Points needed to go from level k to k+1. hole.io's measured cumulative thresholds are
  // 10, 27, 51, 82, 120, 165, 217 … i.e. steps of 10, 17, 24, 31 … (+7 each level).
  // We match it exactly; fast-swallow of small things keeps the pace up.
  levelStep: (k) => Math.round(5.5 * k + 2),   // XP to go from level k to k+1 (tuned for physics-only swallowing)

  physics: {
    gravity: -26,          // m/s², a bit heavier than earth for snappy falls
    suction: 14,            // m/s² pull toward hole center for objects over the hole
    sink: 16,              // extra m/s² downward for objects over the hole
    rimSegments: 22,
    holeSlack: 1.02,       // physical opening is 2% wider than drawn (just enough to absorb rim polygon edges)
    groundFriction: 0.55,
    cornerRound: 0.3,      // collision shapes have corners cut back by 30% of their narrow side
    rimThickness: 0.5,     // metres; a thin lip like a real hole edge, so long things can tip in end-first
    rimFriction: 0.12,
    maxBodies: 170,
    activationPad: 0.4,    // meters beyond the opening at which objects get a physics body
    jamSeconds: 1.0,       // a truly-fitting object stuck on the lip this long gets a small physical wiggle
    tipLength: 2.1,        // simulate things up to 2.1× the opening long (they may tip in end-first, physics decides)
    likelyFlat: 0.85,      // "reliably fits" (bots, off-screen rivals, toasts): outline diagonal < 85% of the opening,
    likelyLong: 1.2,       //   or slim (narrow side < 60% of the opening) and at most 1.2× as long
    likelySlim: 0.6,
    // Fast swallow: anything whose footprint radius is under this fraction of the hole radius drops in
    // the moment it's inside the circle — no need to stop over it, even at full speed.
    captureRatio: 0.34,
    captureDwell: 0.06,    // seconds it must stay inside the circle first   // objects jammed on the rim this long lose rim collision
  },

  camera: {
    fov: 42,
    pitchDeg: 60,          // tilt from horizontal; hole.io sits around 45–60°
    viewHoleDiameters: 16, // how many hole diameters fit across the short screen axis at level 1
    viewHoleDiametersMax: 6.2,
    minView: 600,
    // Zoom-out limit: past `viewKnee` the camera eases toward `viewMax` (world units across the
    // screen's short side) and never goes further, so a giant hole fills more of the screen and you
    // can still see what you're eating.
    seeThrough: false,     // old effect that dithered tall things in front of your hole; off = never translucent
    viewKnee: 1700,
    viewMax: 2700,
    ease: 2.6,
  },

  bots: {
    names: ['Pixel', 'Mochi', 'Zappy', 'Bubba', 'Noodle', 'Kiwi', 'Turbo', 'Waffles', 'Biscuit', 'Gizmo', 'Pickles',
      'Nugget', 'Sprout', 'Boomer', 'Doodle', 'Jellybean', 'Rocket', 'Sushi', 'Tofu', 'Muffin', 'Bingo', 'Cosmo',
      'Peanut', 'Ziggy', 'Pudding', 'Taco', 'Yeti', 'Ollie', 'Maple', 'Chompy', 'Wombat', 'Dumpling', 'Fizz',
      'Luna', 'Nacho', 'Bolt', 'Sir Gulps', 'Captain Crunch', 'Lil Void', 'Big Mouth', 'Snacky', 'MrHungry'],
    thinkInterval: [0.35, 0.7],
    scanRadius: 1600,
    rubberMin: 0.82,       // speed factor for a bot far ahead of the player
    rubberMax: 1.06,       // speed factor for a bot far behind
    growMin: 0.45,         // a bot far ahead of you grows at no less than 45% of the normal rate
    playerHuntFactor: 0.55, // bots are less keen to chase you than each other
    skillBonus: -0.14,     // rival skill offset used for every match (all difficulties)
  },

  // Title-screen difficulty. Hard is the original game; Normal starts you one size bigger; Easy also
  // slows the rival holes by 15%. Rivals always start at level 1.
  difficulty: {
    easy:   { botSpeed: 0.85, playerStartLevel: 2 },
    normal: { botSpeed: 1,    playerStartLevel: 2 },
    hard:   { botSpeed: 1,    playerStartLevel: 1 },
  },

  scoring: {
    rankPoints: [20, 10, 5, 2, 2, 1, 1],
    comboWindow: 0.9,      // seconds between swallows to keep a combo
    soloStars: [0.2, 0.35, 0.5], // share of the whole city (by points) for 1/2/3 stars in Solo
  },
};
