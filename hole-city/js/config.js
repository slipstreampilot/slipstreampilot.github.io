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
    soloSeconds: Infinity, // Solo has no clock: the round ends when you've eaten soloGoal of the level
    soloGoal: 0.95,        // share of the level's items (by count) that clears it in Solo
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
  // We match it exactly.
  levelStep: (k) => Math.round(5.5 * k + 2),   // XP to go from level k to k+1 (tuned for physics-only swallowing)

  physics: {
    gravity: -26,          // m/s², a bit heavier than earth for snappy falls
    rimSegments: 22,
    holeSlack: 1.02,       // physical opening is 2% wider than drawn (just enough to absorb rim polygon edges)
    groundFriction: 0.55,
    cornerRound: 0.3,      // collision shapes have corners cut back by 30% of their narrow side
    slenderWidth: 90,
    nearHoleFriction: 0.25, // street friction under things near a hole (the hole's pull slides them; they still pivot on the lip)
    objFriction: 0.08,     // things sliding against each other (a crowd of buildings dropping into one shaft slides apart)
    wallFriction: 0.08,    // shaft walls are slippery: something wedged across the shaft slides down at its angle
    neckDepth: 0.25,       // metres: the flask's vertical neck, flush with the street, as wide as the opening
    flareAngle: 45,        // degrees from vertical: below the neck the flask widens at this angle...
    flareLength: 10,       //   ...for this many metres of slope (7.1 m down, 7.1 m out), then nothing — no floor
    earthBeyond: 2,        // metres of solid ground modelled beyond the cone's widest point
    lipBand: 0.08,         // the outer 8% of the radius beyond the opening can't hold anything whose middle is over it
    lipMax: 0.25,          //   ...at most 25 cm (no sliver catches: an umbrella can't hang by 1 cm of its rim)
    roofRound: 0.25,       // roof edges of buildings and tall thin things are bevelled by this share of the narrow side
    roofRoundMax: 1.5,     //   ...at most this many metres
    groundSkin: 0.2,       // metres: ground contacts deeper than this belong to the shaft and are dropped
    feetGrid: 6,           // up to 6×6 support points under each base
    inertiaScale: 0.4,     // objects turn 2.5× more readily than solid blocks (tipping reads at game speed)
    maxSpeed: 45,          // m/s cap on any simulated object (holes top out around 32 m/s)
    maxRise: 9,            // m/s cap on upward speed: contacts never launch things into the sky
    maxSpin: 6,            // rad/s cap
    freeFallSpinDamp: 8,   // 1/s: once nothing holds it up, its tipping dies away (it falls at the tilt it reached)
    wiggleWindow: 1,       // seconds: two or more direction reversals within this counts as wiggling the hole
    wiggleFlips: 2,
    wiggleMinSpeed: 1.5,   // m/s: slower than this doesn't count as heading anywhere
    wedgeSpit: 6,          // seconds stuck before the hole spits it out
    maxBodies: 170,
    bigReserve: 20,        // bodies small props leave free for anything bigger
    sinkDepth: 0.8,        // something counts as eaten once its top is this many hole radii below the street
    propSize: 150,         // world units: things smaller across than this collide as plain boxes (cheaper)
    sinkMax: 10,           //   ...or this many metres, whichever is less
    deepBudget: 100,       // with more bodies than this in play, things are eaten as soon as they're under the street
    activationPad: 0.4,    // meters beyond the opening at which objects get a physics body
    tipLength: 2.0,        // simulate things up to 2× the opening long: they may tip in end-first (physics decides)
    likelyFlat: 0.85,      // "reliably fits" (bots, off-screen rivals, toasts): outline diagonal < 85% of the opening,
    likelyLong: 1.2,       //   or slim (narrow side < 60% of the opening) and at most 1.2× as long
    likelySlim: 0.6,
    // Overflow swallow, only while every body is in use: a prop whose footprint radius is under this
    // fraction of the hole radius and that's inside the circle takes a scripted drop instead of physics.
    // The same size also decides which things must leave `bigReserve` bodies free.
    captureRatio: 0.34,
    captureHeight: 2.5,    // ...and is shorter than 2.5× the hole radius (a skyscraper always gets real physics)
    captureDwell: 0.06,    // seconds it must stay inside the circle first
  },

  camera: {
    fov: 42,
    pitchDeg: 60,          // tilt from horizontal; hole.io sits around 45–60°
    // How much of the screen's short side your hole fills, by level (interpolated in between). A middle
    // ground between hole.io (≈25% at size 1, ≈60% from size 6 on) and our original far-out camera
    // (≈6% at level 1, 40% at level 20).
    holeShare: [[1, 0.12], [5, 0.18], [10, 0.25], [15, 0.33], [20, 0.46]],
    viewMax: 2700,         // never show more than this many world units across the short side
    seeThrough: false,     // old effect that dithered tall things in front of your hole; off = never translucent
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
    easy:   { botSpeed: 0.85, playerStartLevel: 2, botSkill: -0.16, botDaze: 0.8 }, // dumber rivals too (see bots.js)
    normal: { botSpeed: 1,    playerStartLevel: 2 },
    hard:   { botSpeed: 1,    playerStartLevel: 1 },
  },

  scoring: {
    rankPoints: [20, 10, 5, 2, 2, 1, 1],
    comboWindow: 0.9,      // seconds between swallows to keep a combo
    soloStarTimes: [300, 210], // Solo: clearing = ★; under 5:00 = ★★; under 3:30 = ★★★
  },
};
