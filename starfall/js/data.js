/* STARFALL - GAME_DATA: every balance number, ship, event, and UI string.
   The simulation reads only from this object. All prose is original. */
"use strict";

var GAME_DATA = {};

// ---------------------------------------------------------------------------
// Palette (§16.1)
// ---------------------------------------------------------------------------
GAME_DATA.palette = {
  uiParchment: "#EDF3E9", uiParchmentDim: "#D9D5D4", uiPanelDarkWell: "#362C2B",
  uiTooltipMauve: "#6E5C5B", uiTooltipMauveDk: "#615150", textPrimary: "#E7F3E5",
  textDisabledGray: "#616360", selectionYellow: "#FBE667", selectionYellow2: "#FDE463",
  hullBarGreen: "#7DF780", powerGreen: "#64FF63", reactorGreen: "#73F271",
  systemIconGreen: "#5EBA55", unpoweredKhaki: "#625B41", shieldBlue: "#2E5FA1",
  shieldBlueBright: "#4FA7E8", warningRed: "#B74334", dangerRed: "#C33D32",
  enemyPanelRose: "#C76A65", fleetZoneRed: "#3B1F1E", fleetStripeRed: "#4D2324",
  beaconYellow: "#CABB76", exitTagGreen: "#44A34F", storeTagTeal: "#2E4C4C",
  roomFloorWhite: "#E5E0DA", shipHullGray: "#7B7871", hullTrimOrange: "#CF7C20",
  hullTrimTeal: "#99DDDC", spaceBlack: "#0B0A06", mapBgCharcoal: "#313131",
  crewYellowHurt: "#FFFF09", crewBarGreen: "#12F313", blueOptionCyan: "#5CC9FF",
  ionBlue: "#66CCFF", fireOrange: "#E8842C", oxygenWarnPink: "#E86A6A",
  outlineDark: "#1A1A18"
};

// ---------------------------------------------------------------------------
// Systems & subsystems (§3.2)
// ---------------------------------------------------------------------------
GAME_DATA.systems = {
  shields: { name: "Shields", maxLevel: 8, mannable: true, purchase: 125, sub: false,
    upgradeCost: { 2: 100, 3: 20, 4: 30, 5: 40, 6: 60, 7: 80, 8: 100 },
    desc: "Projects concentric defensive layers around the ship. One layer per two levels of power.",
    levelNote: "1 shield layer per 2 levels. Regen 2.0s per layer (1.72s 3rd, 1.5s 4th).",
    manning: [10, 20, 30] },
  engines: { name: "Engines", maxLevel: 8, mannable: true, purchase: null, sub: false,
    upgradeCost: { 2: 10, 3: 15, 4: 30, 5: 40, 6: 60, 7: 80, 8: 120 },
    desc: "Drives evasion and FTL charge speed. Needs manned piloting or autopilot to dodge.",
    evasion: [5, 10, 15, 20, 25, 28, 31, 35],
    manningEvasion: [5, 7, 10] },
  oxygen: { name: "Oxygen", maxLevel: 3, mannable: false, purchase: 25, sub: false,
    upgradeCost: { 2: 25, 3: 50 },
    desc: "Refills the ship's air. Without power, every room slowly drains.",
    refillRate: [1.2, 4.8, 8.4], drainUnpowered: 1.2 },
  weapons: { name: "Weapon Control", maxLevel: 8, mannable: true, purchase: null, sub: false,
    upgradeCost: { 2: 40, 3: 25, 4: 35, 5: 50, 6: 75, 7: 90, 8: 100 },
    desc: "Supplies power to your weapons. Weapons keep charge when depowered manually.",
    manningCharge: [10, 15, 20] },
  medbay: { name: "Medbay", maxLevel: 3, mannable: false, purchase: 50, sub: false,
    upgradeCost: { 2: 35, 3: 45 },
    desc: "Heals crew standing inside while powered.",
    healRate: [6.4, 9.6, 19.2] },
  droneCtrl: { name: "Drone Control", maxLevel: 8, mannable: false, purchase: 85, sub: false,
    upgradeCost: { 3: 20, 4: 30, 5: 45, 6: 60, 7: 80, 8: 100 },
    desc: "Supplies power to your drones. Comes with two levels installed.",
    purchaseLevels: 2 },
  teleporter: { name: "Teleporter", maxLevel: 3, mannable: false, purchase: 90, sub: false,
    upgradeCost: { 2: 30, 3: 60 },
    desc: "Sends and retrieves crew to and from the enemy ship.",
    cooldown: [20, 15, 10], pads: 2 },
  cloaking: { name: "Cloaking", maxLevel: 3, mannable: false, purchase: 150, sub: false,
    upgradeCost: { 2: 30, 3: 50 },
    desc: "+60% evasion while cloaked. Enemy weapons cannot acquire new locks on you.",
    duration: [5, 10, 15], cooldown: 20 },
  artillery: { name: "Artillery Beam", maxLevel: 4, mannable: false, purchase: null, sub: false,
    shipOnly: "Federation Cruiser",
    upgradeCost: { 2: 30, 3: 50, 4: 80 },
    desc: "Automatic beam that sweeps the enemy ship and pierces all shields.",
    chargeByLevel: [50, 40, 30, 20] },
  piloting: { name: "Piloting", maxLevel: 3, mannable: true, purchase: null, sub: true,
    upgradeCost: { 2: 20, 3: 50 },
    desc: "Steers the ship. Without a pilot the autopilot only works at level 2+.",
    autopilot: [0, 0.5, 0.8], manningEvasion: [5, 7, 10] },
  sensors: { name: "Sensors", maxLevel: 3, mannable: true, purchase: 40, sub: true,
    upgradeCost: { 2: 25, 3: 40 },
    desc: "Level 1 shows your interior; 2 the enemy interior; 3 enemy weapon charge." },
  doors: { name: "Doors", maxLevel: 3, mannable: true, purchase: 60, sub: true,
    upgradeCost: { 2: 35, 3: 50 },
    desc: "Remote door control. Higher levels install blast doors that slow intruders and fire.",
    breakHits: [[8, 12], [8, 12], [12, 16], [18, 20]] } // [normal, easy] by effective level 1..4
};

// Power drain priority when supply shrinks (§4.3)
GAME_DATA.drainOrder = ["weapons", "drones", "medbay", "teleporter", "cloaking", "oxygen", "shields", "engines"];

// Reactor bar purchase cost (§4.2)
GAME_DATA.reactorCost = function (barNumber) {
  if (barNumber <= 5) return 30;
  if (barNumber <= 10) return 20;
  if (barNumber <= 15) return 25;
  if (barNumber <= 20) return 30;
  return 35;
};
GAME_DATA.reactorMax = 25;

// ---------------------------------------------------------------------------
// Races (§5.1)
// ---------------------------------------------------------------------------
GAME_DATA.races = {
  human: { name: "Human", hp: 100, moveMult: 1.0, repairMult: 1.0, combatMult: 1.0, hireCost: 45,
    special: "Learns 10% faster.", xpMult: 0.9 },
  engi: { name: "Engi", hp: 100, moveMult: 1.0, repairMult: 2.0, combatMult: 0.5, hireCost: 50,
    special: "Repairs twice as fast; fights at half damage." },
  mantis: { name: "Mantis", hp: 100, moveMult: 1.2, repairMult: 0.5, combatMult: 1.5, hireCost: 55,
    special: "Moves 20% faster; +50% combat damage; repairs half as fast." },
  rock: { name: "Rock", hp: 150, moveMult: 0.5, repairMult: 1.0, combatMult: 1.0, hireCost: 55,
    special: "Immune to fire; extinguishes fires 67% faster; 150 HP; slow." },
  zoltan: { name: "Zoltan", hp: 70, moveMult: 1.0, repairMult: 1.0, combatMult: 1.0, hireCost: 60,
    special: "+1 power bar to occupied system (ion-immune); explodes on death; only 70 HP." },
  slug: { name: "Slug", hp: 100, moveMult: 1.0, repairMult: 1.0, combatMult: 1.0, hireCost: 45,
    special: "Telepathic: senses nearby crew without sensors; immune to mind effects." },
  crystal: { name: "Crystal", hp: 125, moveMult: 0.8, repairMult: 1.0, combatMult: 1.0, hireCost: 60,
    special: "Lockdown seals the room's doors for 12s (50s recharge); half suffocation damage." }
};
GAME_DATA.crewNames = ["Weston", "Ariel", "Tach", "Remo", "Vex", "Odell", "Prine", "Sable", "Juno", "Kest",
  "Marlow", "Iris", "Corvid", "Bram", "Sorrel", "Nyx", "Halden", "Petra", "Quill", "Rooke",
  "Sylvane", "Torv", "Ulma", "Vann", "Wisp", "Xa", "Yorel", "Zephyr", "Ando", "Brix",
  "Calla", "Dray", "Ember", "Fenn", "Gruel", "Hale", "Isolde", "Jax", "Koda", "Lyra"];

// ---------------------------------------------------------------------------
// Skills (§5.4)
// ---------------------------------------------------------------------------
GAME_DATA.skills = {
  piloting: { name: "Piloting", xpPerLevel: 15, bonusText: ["+5% evasion", "+7% evasion", "+10% evasion"] },
  engines: { name: "Engines", xpPerLevel: 15, bonusText: ["+5% evasion", "+7% evasion", "+10% evasion"] },
  shields: { name: "Shields", xpPerLevel: 55, bonusText: ["+10% recharge", "+20% recharge", "+30% recharge"] },
  weapons: { name: "Weapons", xpPerLevel: 65, bonusText: ["-10% charge time", "-15% charge time", "-20% charge time"] },
  repair: { name: "Repair", xpPerLevel: 18, bonusText: ["+0%", "+10% repair speed", "+20% repair speed"] },
  combat: { name: "Combat", xpPerLevel: 8, bonusText: ["+0%", "+10% crew damage", "+20% crew damage"] }
};

// ---------------------------------------------------------------------------
// Weapons (§6.1) - fire/breach are net percentages; fire rolls first.
// ---------------------------------------------------------------------------
GAME_DATA.weapons = [
  { id: "basic_laser", name: "Basic Laser", cls: "laser", power: 1, charge: 10, damage: 1, shots: 1, pierce: 0, fire: 10, breach: 0, missiles: 0, price: null, sellsFor: 10, rarity: 0,
    flavor: "A dependable workhorse emitter found on half the hulls in space." },
  { id: "dual_lasers", name: "Dual Lasers", cls: "laser", power: 1, charge: 10, damage: 1, shots: 2, pierce: 0, fire: 10, breach: 0, missiles: 0, price: null, sellsFor: 12, rarity: 0,
    flavor: "Twin emitters wired to one trigger. Cheap and cheerful." },
  { id: "burst_laser_1", name: "Burst Laser I", cls: "laser", power: 2, charge: 11, damage: 1, shots: 2, pierce: 0, fire: 10, breach: 0, missiles: 0, price: 50, rarity: 1,
    flavor: "Fires a short volley of light shots." },
  { id: "burst_laser_2", name: "Burst Laser II", cls: "laser", power: 2, charge: 12, damage: 1, shots: 3, pierce: 0, fire: 10, breach: 0, missiles: 0, price: 80, rarity: 4,
    flavor: "The fleet quartermasters call this one 'the argument settler'." },
  { id: "burst_laser_3", name: "Burst Laser III", cls: "laser", power: 4, charge: 19, damage: 1, shots: 5, pierce: 0, fire: 0, breach: 0, missiles: 0, price: 95, rarity: 4,
    flavor: "A five-round storm. Heavy on the reactor, heavier on the target." },
  { id: "heavy_laser_1", name: "Heavy Laser I", cls: "laser", power: 1, charge: 9, damage: 2, shots: 1, pierce: 0, fire: 30, breach: 21, missiles: 0, price: 50, rarity: 2,
    flavor: "One slow bolt that hits like a falling girder." },
  { id: "heavy_laser_2", name: "Heavy Laser II", cls: "laser", power: 3, charge: 13, damage: 2, shots: 2, pierce: 0, fire: 30, breach: 21, missiles: 0, price: 65, rarity: 4,
    flavor: "Two girders." },
  { id: "heavy_pierce_1", name: "Heavy Pierce Laser I", cls: "laser", power: 2, charge: 10, damage: 2, shots: 1, pierce: 1, fire: 30, breach: 21, missiles: 0, price: null, sellsFor: 27, rarity: 0,
    flavor: "A focused heavy bolt that slips through a single shield layer." },
  { id: "hull_laser_1", name: "Hull Smasher Laser I", cls: "laser", power: 2, charge: 14, damage: 1, dmgVsSystemless: 2, shots: 2, pierce: 0, fire: 0, breach: 20, missiles: 0, price: 55, rarity: 2,
    flavor: "Tuned to shatter plating. Doubly cruel to empty rooms." },
  { id: "hull_laser_2", name: "Hull Smasher Laser II", cls: "laser", power: 3, charge: 15, damage: 1, dmgVsSystemless: 2, shots: 3, pierce: 0, fire: 10, breach: 27, missiles: 0, price: 75, rarity: 3,
    flavor: "Wreckers' choice. Leaves hulls looking like sieves." },
  { id: "leto", name: "Leto Missiles", cls: "missile", power: 1, charge: 9, damage: 1, shots: 1, fire: 10, breach: 9, missiles: 1, price: null, sellsFor: 10, rarity: 0,
    flavor: "A quick light missile that ignores shielding entirely." },
  { id: "artemis", name: "Artemis Missiles", cls: "missile", power: 1, charge: 11, damage: 2, shots: 1, fire: 10, breach: 9, missiles: 1, price: null, sellsFor: 19, rarity: 0,
    flavor: "Standard-issue ship-to-ship missile of the Federation fleet." },
  { id: "hermes", name: "Hermes Missiles", cls: "missile", power: 3, charge: 14, damage: 3, shots: 1, fire: 30, breach: 14, missiles: 1, price: 45, rarity: 2,
    flavor: "Fast delivery of bad news." },
  { id: "breach_missiles", name: "Breach Missiles", cls: "missile", power: 3, charge: 22, damage: 4, shots: 1, fire: 30, breach: 56, missiles: 1, price: 65, rarity: 3,
    flavor: "Built to open a ship to the void." },
  { id: "hull_missiles", name: "Hull Missiles", cls: "missile", power: 2, charge: 17, damage: 2, dmgVsSystemless: 4, shots: 1, fire: 10, breach: 27, missiles: 1, price: 65, rarity: 3,
    flavor: "Structural charges. Empty compartments crumple like foil." },
  { id: "pegasus", name: "Pegasus Missiles", cls: "missile", power: 3, charge: 20, damage: 2, shots: 2, fire: 30, breach: 14, missiles: 1, price: 60, rarity: 3,
    flavor: "Two warheads, one missile port, no apologies." },
  { id: "mini_beam", name: "Mini Beam", cls: "beam", power: 1, charge: 12, damage: 1, beamLength: 45, firePerTile: 10, price: null, sellsFor: 10, rarity: 0,
    flavor: "A scalpel, not a sword." },
  { id: "pike_beam", name: "Pike Beam", cls: "beam", power: 2, charge: 16, damage: 1, beamLength: 170, firePerTile: 0, price: 55, rarity: 2,
    flavor: "A long, thin lance of light. Sweep it end to end." },
  { id: "hull_beam", name: "Hull Beam", cls: "beam", power: 2, charge: 14, damage: 1, dmgVsSystemless: 2, beamLength: 100, firePerTile: 0, price: 70, rarity: 3,
    flavor: "Cuts plating twice as deep where nothing important sits behind it." },
  { id: "halberd_beam", name: "Halberd Beam", cls: "beam", power: 3, charge: 17, damage: 2, beamLength: 80, firePerTile: 0, price: 65, rarity: 2,
    flavor: "A heavy cutting arc favored by boarding-shy captains." },
  { id: "glaive_beam", name: "Glaive Beam", cls: "beam", power: 4, charge: 25, damage: 3, beamLength: 80, firePerTile: 0, price: 95, rarity: 5,
    flavor: "The old shipwrights' saying: measure once, cut everything." },
  { id: "fire_beam", name: "Fire Beam", cls: "beam", power: 2, charge: 20, damage: 0, beamLength: 140, firePerTile: 80, price: 50, rarity: 3,
    flavor: "Ignites compartments along its path without scratching the hull." },
  { id: "antibio_beam", name: "Anti-Bio Beam", cls: "beam", power: 2, charge: 16, damage: 0, crewDamagePerTile: 60, beamLength: 140, price: 50, rarity: 5,
    flavor: "Harmless to metal. Everything else should worry." },
  { id: "small_bomb", name: "Small Bomb", cls: "bomb", power: 1, charge: 13, sysDamage: 2, crewDamage: 30, fire: 10, breach: 0, missiles: 1, price: 45, rarity: 1,
    flavor: "Teleports a modest charge directly inside the target room." },
  { id: "breach_bomb_1", name: "Breach Bomb I", cls: "bomb", power: 1, charge: 9, sysDamage: 1, crewDamage: 30, fire: 0, breach: 100, missiles: 1, price: null, sellsFor: 25, rarity: 0,
    flavor: "Punches a hole in the floor from the inside." },
  { id: "breach_bomb_2", name: "Breach Bomb II", cls: "bomb", power: 2, charge: 17, sysDamage: 3, crewDamage: 45, fire: 0, breach: 100, missiles: 1, price: 60, rarity: 4,
    flavor: "Punches a much more expensive hole." },
  { id: "fire_bomb", name: "Fire Bomb", cls: "bomb", power: 2, charge: 15, sysDamage: 0, crewDamage: 30, fire: 100, firesStarted: [1, 2], breach: 0, missiles: 1, price: 50, rarity: 2,
    flavor: "Delivers a small, extremely enthusiastic arson unit." },
  { id: "ion_bomb", name: "Ion Bomb", cls: "bomb", power: 1, charge: 22, ionDamage: 4, missiles: 1, price: 55, rarity: 3,
    flavor: "Four points of silence, delivered anywhere." },
  { id: "healing_burst", name: "Healing Burst", cls: "bomb", power: 1, charge: 18, healsCrew: 150, missiles: 1, price: 40, rarity: 3,
    flavor: "A med-mist charge. Fire it at your own crew, ideally." },
  { id: "ion_blast_1", name: "Ion Blast", cls: "ion", power: 1, charge: 8, shots: 1, ionDamage: 1, price: 30, rarity: 3,
    flavor: "Scrambles a system without leaving a scratch." },
  { id: "ion_blast_2", name: "Ion Blast II", cls: "ion", power: 3, charge: 4, shots: 1, ionDamage: 1, price: 70, rarity: 4,
    flavor: "A relentless four-second drumbeat of static." },
  { id: "heavy_ion", name: "Heavy Ion", cls: "ion", power: 2, charge: 13, shots: 1, ionDamage: 2, price: 45, rarity: 3,
    flavor: "Twice the silence." },
  // Crystal weapons (Crystal ships/sector only)
  { id: "crystal_burst_1", name: "Crystal Burst I", cls: "laser", power: 2, charge: 15, damage: 1, shots: 2, pierce: 1, fire: 0, breach: 10, missiles: 0, price: null, sellsFor: 25, rarity: 0,
    flavor: "Shard-throwers grown, not built. Slip through a single layer." },
  { id: "heavy_crystal_1", name: "Heavy Crystal I", cls: "laser", power: 1, charge: 13, damage: 2, shots: 1, pierce: 1, fire: 0, breach: 10, missiles: 0, price: null, sellsFor: 25, rarity: 0,
    flavor: "One large shard, delivered with feeling." },
  // Cheat weapon (hangar toggle only; never sold or dropped)
  { id: "em_railgun", name: "EM Rail Gun", cls: "railgun", power: 0, charge: 6, damage: 9999, shots: 1, pierce: 99, fire: 0, breach: 0, missiles: 0, price: null, sellsFor: 0, rarity: 0, cheat: true,
    flavor: "Experimental electromagnetic accelerator. One round ends any argument." },
  // Flagship artillery (enemy-only)
  { id: "boss_ion", name: "Ion Battery", cls: "ion", power: 0, charge: 14, shots: 3, ionDamage: 1, price: null, rarity: 9, bossOnly: true,
    flavor: "A triple ion mount." },
  { id: "boss_laser", name: "Laser Battery", cls: "laser", power: 0, charge: 13, damage: 1, shots: 3, pierce: 0, fire: 10, breach: 9, missiles: 0, price: null, rarity: 9, bossOnly: true,
    flavor: "A triple laser mount." },
  { id: "boss_beam", name: "Beam Battery", cls: "beam", power: 0, charge: 17, damage: 2, beamLength: 100, firePerTile: 0, price: null, rarity: 9, bossOnly: true,
    flavor: "A dreadnought's cutting arc." },
  { id: "boss_missiles", name: "Triple Missiles", cls: "missile", power: 0, charge: 16, damage: 1, shots: 3, fire: 30, breach: 14, missiles: 0, price: null, rarity: 9, bossOnly: true,
    flavor: "Three warheads per volley, forever." }
];
GAME_DATA.weaponById = {};
(function () { for (var i = 0; i < GAME_DATA.weapons.length; i++) GAME_DATA.weaponById[GAME_DATA.weapons[i].id] = GAME_DATA.weapons[i]; })();

// ---------------------------------------------------------------------------
// Drones (§8)
// ---------------------------------------------------------------------------
GAME_DATA.drones = [
  { id: "combat_1", name: "Combat Drone Mk I", type: "combat", power: 2, price: 50, rarity: 2, speed: 15,
    desc: "Orbits the enemy ship firing a 1-damage laser (10% fire chance) at random rooms. Shots can miss and are blocked by shields." },
  { id: "combat_2", name: "Combat Drone Mk II", type: "combat", power: 4, price: 75, rarity: 5, speed: 28,
    desc: "As Mk I but moves and fires nearly twice as fast." },
  { id: "beam_drone_1", name: "Anti-Ship Beam Drone I", type: "combat", power: 2, price: 50, rarity: 3, speed: 15, beam: true,
    desc: "Fires a short 1-damage beam; never misses; fully blocked by any shield layer; 10% fire chance." },
  { id: "defense_1", name: "Defense Drone Mk I", type: "defense", power: 2, price: 50, rarity: 1, cooldownMs: 1000,
    desc: "Shoots down incoming missiles, asteroids, and boarding drones. Cannot hit lasers or ion." },
  { id: "defense_2", name: "Defense Drone Mk II", type: "defense", power: 3, price: 70, rarity: 3, cooldownMs: 880,
    desc: "Fires more rapidly than the Mk I, and can also counter enemy lasers and ion blasts." },
  { id: "system_repair", name: "System Repair Drone", type: "crew", power: 1, price: 30, rarity: 1, hp: 25,
    desc: "Roams your ship repairing systems and breaches and extinguishing fires. Ignores intruders." },
  { id: "anti_personnel", name: "Anti-Personnel Drone", type: "crew", power: 2, price: 35, rarity: 2, hp: 150,
    desc: "Patrols your ship and attacks intruders. Takes half damage from enemy crew." },
  { id: "boarding", name: "Boarding Drone", type: "boarding", power: 3, price: 70, rarity: 4, hp: 150, speed: 18,
    desc: "Launches at the enemy hull, punches a breach where it lands, then attacks crew and systems. Ignores shields; shot down by defense drones." },
  { id: "hull_repair", name: "Hull Repair Drone", type: "utility", power: 2, price: 85, rarity: 4,
    desc: "Repairs 3-5 hull points, then departs. Consumes its drone part." }
];
GAME_DATA.droneById = {};
(function () { for (var i = 0; i < GAME_DATA.drones.length; i++) GAME_DATA.droneById[GAME_DATA.drones[i].id] = GAME_DATA.drones[i]; })();

// ---------------------------------------------------------------------------
// Augmentations (§13)
// ---------------------------------------------------------------------------
GAME_DATA.augments = [
  { id: "scrap_arm", name: "Scrap Recovery Arm", price: 50, rarity: 2, effect: "+10% scrap from all combat and event rewards (rounded down)." },
  { id: "auto_reloader", name: "Automated Re-loader", price: 40, rarity: 2, effect: "Weapon charge time divided by 1.1 (stacks additively: two = /1.2)." },
  { id: "pre_igniter", name: "Weapon Pre-Igniter", price: 120, rarity: 5, effect: "All powered weapons arrive fully charged at each new beacon." },
  { id: "shield_booster", name: "Shield Charge Booster", price: 45, rarity: 2, effect: "Shield recharge time divided by 1.15 (stacks additively)." },
  { id: "lr_scanners", name: "Long-Ranged Scanners", price: 30, rarity: 1, effect: "Beacon map shows hazard and ship-presence info at beacons adjacent to your position." },
  { id: "ftl_jammer", name: "FTL Jammer", price: 30, rarity: 2, effect: "Enemy ships take twice as long to charge their FTL to flee." },
  { id: "repair_arm", name: "Repair Arm", price: 50, rarity: 3, effect: "+2 hull per scrap reward collected, but -15% scrap from rewards. No effect at full hull." },
  { id: "ftl_booster", name: "FTL Recharge Booster", price: 50, rarity: 2, effect: "Your FTL drive charges 25% faster (time x0.8; stacks multiplicatively)." },
  { id: "adv_nav", name: "Advanced FTL Navigation", price: 50, rarity: 3, effect: "You may jump to ANY previously visited beacon, even overtaken ones." },
  { id: "rev_ion_field", name: "Reverse Ion Field", price: 45, rarity: 3, effect: "50% chance to fully negate each incoming ion damage point." },
  { id: "stealth_weapons", name: "Stealth Weapons", price: 50, rarity: 3, effect: "Firing weapons no longer reduces your cloak duration." },
  { id: "drone_arm", name: "Drone Recovery Arm", price: 50, rarity: 2, effect: "External drones are recovered (parts refunded) when you jump." },
  { id: "rock_plating", name: "Rock Plating", price: null, sellsFor: 40, rarity: 0, effect: "15% chance to negate hull damage from any weapon hit (system damage still applies)." },
  { id: "titan_casing", name: "Titanium System Casing", price: null, sellsFor: 40, rarity: 0, effect: "15% chance to negate system damage when a room is hit (hull damage still applies)." },
  { id: "medbot_dispersal", name: "Engi Med-bot Dispersal", price: null, sellsFor: 30, rarity: 0, effect: "While the medbay is powered, all crew heal 1.6 HP/s anywhere on your ship." },
  { id: "slug_gel", name: "Slug Repair Gel", price: null, sellsFor: 30, rarity: 0, effect: "Hull breaches on your ship seal themselves automatically." },
  { id: "crystal_vengeance", name: "Crystal Vengeance", price: null, sellsFor: 40, rarity: 0, effect: "10% chance when your hull is hit to fire back a 1-damage shard that ignores shields (10% breach)." },
  { id: "zoltan_shield", name: "Zoltan Shield", price: null, sellsFor: 40, rarity: 0, effect: "A 5-point green super-shield at every new beacon: absorbs all hits (ion counts double, beams tick it twice), blocks enemy teleporting until depleted. Does not regenerate during the fight." },
  { id: "drone_booster", name: "Drone Reactor Booster", price: null, sellsFor: 25, rarity: 0, effect: "Your onboard (crew-type) drones move 25% faster." },
  { id: "mantis_pheromones", name: "Mantis Pheromones", price: null, sellsFor: 25, rarity: 0, effect: "Your crew move 25% faster (your ship and boarding)." },
  { id: "stasis_pod", name: "Damaged Stasis Pod", price: null, sellsFor: 15, rarity: 0, effect: "No obvious function. Something is alive inside...", quest: true }
];
GAME_DATA.augmentById = {};
(function () { for (var i = 0; i < GAME_DATA.augments.length; i++) GAME_DATA.augmentById[GAME_DATA.augments[i].id] = GAME_DATA.augments[i]; })();

// ---------------------------------------------------------------------------
// Prices (§12.3), difficulty (§14.1), reward tiers (§12.5)
// ---------------------------------------------------------------------------
GAME_DATA.prices = {
  fuel: 3, missile: 6, dronePart: 8,
  fuelStock: [3, 7], missileStock: [2, 6], dronePartStock: [2, 4],
  repairPerHullPoint: { s13: 2, s46: 3, s78: 4 },
  sellFactor: 0.5,
  crew: { human: 45, engi: 50, mantis: 55, rock: 55, zoltan: 60, slug: 45 },
  systems: { shields: 125, medbay: 50, teleporter: 90, cloaking: 150, droneCtrl: 85, sensors: 40, doors: 60, oxygen: 25 }
};

GAME_DATA.difficulty = {
  EASY: { startingScrap: 30, scrapTierShift: 1, scoreMult: 1.0, flagshipSurgeDrones: 4, flagshipShieldLayers: 3, budgetShift: -1 },
  NORMAL: { startingScrap: 10, scrapTierShift: 0, scoreMult: 1.25, flagshipSurgeDrones: 6, flagshipShieldLayers: 4, budgetShift: 0 },
  HARD: { startingScrap: 0, scrapTierShift: -1, scoreMult: 1.5, flagshipSurgeDrones: 7, flagshipShieldLayers: 4, budgetShift: 1 }
};

// scrap tiers (§12.5); S already shifted by difficulty
GAME_DATA.rewardTier = function (tier, S, rng) {
  S = Math.max(1, Math.min(10, S));
  var lo, hi;
  if (tier === "low") { lo = Math.floor(7 + 3 * (S - 1) / 2); hi = Math.floor(10 + 4 * (S - 1) / 2); }
  else if (tier === "high") { lo = Math.floor(19 + 7 * (S - 1) / 2); hi = Math.floor(23 + 9 * (S - 1) / 2); }
  else { lo = Math.floor(12 + 5 * (S - 1) / 2); hi = Math.floor(19 + 6 * (S - 1) / 2); }
  return rng.int(lo, hi);
};

// ---------------------------------------------------------------------------
// Ship layout construction helpers.
// Rooms: {id,x,y,w,h,sys} tile coordinates. Doors are auto-derived between
// adjacent rooms in ship.js; airlocks listed as {room,side} (side: N/S/E/W).
// ---------------------------------------------------------------------------
function _rooms(list) {
  var out = [];
  for (var i = 0; i < list.length; i++) {
    out.push({ id: i, x: list[i][0], y: list[i][1], w: list[i][2], h: list[i][3], sys: list[i][4] || null });
  }
  return out;
}

// The Kestrel (17 rooms, long spine per reference screenshot).
var KESTREL_LAYOUT = {
  rooms: _rooms([
    [0, 2, 2, 2, "engines"],     // 0 rear
    [2, 1, 2, 1, "oxygen"],      // 1
    [2, 2, 2, 2, null],          // 2 rear hold
    [2, 4, 2, 1, null],          // 3
    [4, 2, 2, 2, "weapons"],     // 4
    [4, 0, 2, 2, null],          // 5 upper wing
    [4, 4, 2, 2, null],          // 6 lower wing
    [6, 2, 2, 2, "shields"],     // 7 center
    [6, 0, 2, 2, null],          // 8 upper cross
    [6, 4, 2, 2, null],          // 9 lower cross
    [8, 1, 2, 2, "medbay"],      // 10
    [8, 3, 2, 2, null],          // 11 mid hold
    [10, 1, 2, 1, "doors"],      // 12
    [10, 2, 2, 2, null],         // 13 fore corridor
    [10, 4, 2, 1, "sensors"],    // 14
    [12, 2, 1, 2, null],         // 15 fore airlock room
    [13, 2, 1, 2, "piloting"]    // 16 nose
  ]),
  airlocks: [{ room: 5, side: "N" }, { room: 6, side: "S" }, { room: 8, side: "N" }, { room: 9, side: "S" }, { room: 3, side: "S" }, { room: 15, side: "N" }]
};

// Generic functional layout builder for other ships (original designs).
// Places systems along a two-deck spine; returns {rooms, airlocks}.
function makeLayout(systemIds, opts) {
  opts = opts || {};
  var rooms = [], airlocks = [];
  var order = ["piloting", "sensors", "doors", "medbay", "oxygen", "shields", "weapons", "droneCtrl", "teleporter", "cloaking", "artillery", "engines"];
  var sorted = [];
  for (var oi = 0; oi < order.length; oi++) if (systemIds.indexOf(order[oi]) >= 0) sorted.push(order[oi]);
  for (var si = 0; si < systemIds.length; si++) if (sorted.indexOf(systemIds[si]) < 0) sorted.push(systemIds[si]);
  // Build back-to-front: engines rear, piloting nose.
  var bigSys = { shields: 1, weapons: 1, engines: 1, medbay: 1, teleporter: 1, droneCtrl: 1, cloaking: 1, artillery: 1 };
  var mid = []; var small = [];
  for (var i2 = 0; i2 < sorted.length; i2++) {
    if (sorted[i2] === "piloting" || sorted[i2] === "engines") continue;
    if (bigSys[sorted[i2]]) mid.push(sorted[i2]); else small.push(sorted[i2]);
  }
  var x = 0, id = 0;
  function add(x0, y0, w, h, sys) { rooms.push({ id: id++, x: x0, y: y0, w: w, h: h, sys: sys || null }); return rooms[rooms.length - 1]; }
  // rear: engines 2x2
  if (systemIds.indexOf("engines") >= 0) add(x, 2, 2, 2, "engines"); else add(x, 2, 2, 2, null);
  x += 2;
  // mid systems: 2x2 rooms along spine with 2x1 pockets above/below alternating
  for (var m = 0; m < mid.length; m++) {
    add(x, 2, 2, 2, mid[m]);
    if (m % 2 === 0) { add(x, 1, 2, 1, small.shift() || null); airlocks.push({ room: id - 1, side: "N" }); }
    else { add(x, 4, 2, 1, small.shift() || null); airlocks.push({ room: id - 1, side: "S" }); }
    x += 2;
  }
  // any leftover small systems get pockets
  while (small.length) {
    add(x, 2, 2, 2, null);
    add(x, 1, 2, 1, small.shift());
    airlocks.push({ room: id - 1, side: "N" });
    x += 2;
  }
  // nose corridor + piloting
  add(x, 2, 1, 2, null);
  x += 1;
  add(x, 2, 1, 2, systemIds.indexOf("piloting") >= 0 ? "piloting" : null);
  if (!opts.noAirlocks) {
    airlocks.push({ room: 0, side: "N" });
    airlocks.push({ room: 0, side: "S" });
  } else {
    airlocks = [];
  }
  return { rooms: rooms, airlocks: airlocks };
}

// ---------------------------------------------------------------------------
// Player ships (§14.4)
// ---------------------------------------------------------------------------
GAME_DATA.ships = [
  { id: "kestrel_a", name: "The Kestrel", cls: "Kestrel Cruiser A", family: "kestrel", variant: "A", unlock: "start",
    unlockHint: "Available from the start.",
    reactor: 8, crew: ["human", "human", "human"],
    systems: { shields: 2, engines: 2, medbay: 1, oxygen: 1, weapons: 3, piloting: 1, sensors: 1, doors: 1 },
    weapons: ["artemis", "burst_laser_2"], drones: [], augments: [],
    stores: { fuel: 16, missiles: 8, droneParts: 2 }, layout: KESTREL_LAYOUT, hullStyle: "kestrel" },
  { id: "kestrel_b", name: "Red-Tail", cls: "Kestrel Cruiser B", family: "kestrel", variant: "B", unlock: "achievements",
    unlockHint: "Earn 2 of 3 Kestrel Cruiser achievements.",
    reactor: 8, crew: ["human", "human", "mantis", "zoltan"],
    systems: { shields: 2, engines: 2, medbay: 1, oxygen: 1, weapons: 4, piloting: 1, sensors: 1, doors: 1 },
    weapons: ["basic_laser", "basic_laser", "basic_laser", "basic_laser"], drones: [], augments: [],
    stores: { fuel: 16, missiles: 5, droneParts: 0 }, layout: KESTREL_LAYOUT, hullStyle: "kestrel2" },
  { id: "engi_a", name: "The Torus", cls: "Engi Cruiser A", family: "engi", variant: "A", unlock: "sector5",
    unlockHint: "Reach sector 5.",
    reactor: 10, crew: ["engi", "engi", "human"],
    systems: { shields: 2, engines: 2, medbay: 1, oxygen: 1, weapons: 3, droneCtrl: 3, piloting: 1, sensors: 1, doors: 1 },
    weapons: ["ion_blast_2"], drones: ["combat_1"], augments: ["medbot_dispersal"],
    stores: { fuel: 16, missiles: 0, droneParts: 15 }, droneSlots: 3,
    layout: makeLayout(["engines", "shields", "weapons", "droneCtrl", "medbay", "oxygen", "sensors", "doors", "piloting"]), hullStyle: "engi" },
  { id: "engi_b", name: "The Vortex", cls: "Engi Cruiser B", family: "engi", variant: "B", unlock: "achievements",
    unlockHint: "Earn 2 of 3 Engi Cruiser achievements.",
    reactor: 9, crew: ["engi"],
    systems: { shields: 2, engines: 2, medbay: 1, oxygen: 1, weapons: 3, droneCtrl: 3, piloting: 1, doors: 1 },
    weapons: ["heavy_ion", "heavy_laser_1"], drones: ["anti_personnel", "system_repair", "system_repair"], augments: ["drone_booster"],
    stores: { fuel: 16, missiles: 0, droneParts: 12 }, droneSlots: 3,
    layout: makeLayout(["engines", "shields", "weapons", "droneCtrl", "medbay", "oxygen", "doors", "piloting"]), hullStyle: "engi" },
  { id: "fed_a", name: "The Osprey", cls: "Federation Cruiser A", family: "fed", variant: "A", unlock: "quest",
    unlockHint: "Complete the Rebel Stronghold quest, or win with the Engi Cruiser.",
    reactor: 8, crew: ["human", "mantis", "rock", "engi"],
    systems: { shields: 2, engines: 2, medbay: 1, oxygen: 1, weapons: 2, artillery: 1, piloting: 1, sensors: 1, doors: 1 },
    weapons: ["burst_laser_2"], drones: [], augments: [],
    stores: { fuel: 16, missiles: 5, droneParts: 2 },
    layout: makeLayout(["engines", "shields", "weapons", "artillery", "medbay", "oxygen", "sensors", "doors", "piloting"]), hullStyle: "fed" },
  { id: "fed_b", name: "Nisos", cls: "Federation Cruiser B", family: "fed", variant: "B", unlock: "achievements",
    unlockHint: "Earn 2 of 3 Federation Cruiser achievements.",
    reactor: 9, crew: ["human", "slug", "zoltan"],
    systems: { shields: 2, engines: 2, medbay: 1, oxygen: 1, weapons: 2, artillery: 2, piloting: 1, sensors: 1, doors: 1 },
    weapons: ["dual_lasers", "leto"], drones: [], augments: [],
    stores: { fuel: 16, missiles: 9, droneParts: 0 },
    layout: makeLayout(["engines", "shields", "weapons", "artillery", "medbay", "oxygen", "sensors", "doors", "piloting"]), hullStyle: "fed" },
  { id: "zoltan_a", name: "The Adjudicator", cls: "Zoltan Cruiser A", family: "zoltan", variant: "A", unlock: "quest",
    unlockHint: "Resolve the Zoltan transport peacefully, or win with the Federation Cruiser.",
    reactor: 5, crew: ["zoltan", "zoltan", "zoltan"],
    systems: { shields: 2, engines: 1, medbay: 1, oxygen: 1, weapons: 3, piloting: 1, sensors: 1, doors: 2 },
    weapons: ["halberd_beam", "leto"], drones: [], augments: ["zoltan_shield"],
    stores: { fuel: 16, missiles: 12, droneParts: 2 },
    layout: makeLayout(["engines", "shields", "weapons", "medbay", "oxygen", "sensors", "doors", "piloting"]), hullStyle: "zoltan" },
  { id: "zoltan_b", name: "Noether", cls: "Zoltan Cruiser B", family: "zoltan", variant: "B", unlock: "achievements",
    unlockHint: "Earn 2 of 3 Zoltan Cruiser achievements.",
    reactor: 5, crew: ["zoltan", "zoltan", "zoltan"],
    systems: { shields: 1, engines: 2, medbay: 1, oxygen: 1, weapons: 4, piloting: 1, sensors: 1, doors: 1 },
    weapons: ["ion_blast_1", "ion_blast_1", "pike_beam"], drones: [], augments: ["zoltan_shield"],
    stores: { fuel: 16, missiles: 0, droneParts: 0 }, shieldsL1NoLayer: true, firstShieldUpgrade100: true,
    layout: makeLayout(["engines", "shields", "weapons", "medbay", "oxygen", "sensors", "doors", "piloting"]), hullStyle: "zoltan" },
  { id: "mantis_a", name: "The Gila Monster", cls: "Mantis Cruiser A", family: "mantis", variant: "A", unlock: "quest",
    unlockHint: "Corner the Legendary Thief, or win with the Zoltan Cruiser.",
    reactor: 7, crew: ["mantis", "mantis", "mantis", "engi"],
    systems: { shields: 2, engines: 2, medbay: 1, oxygen: 1, weapons: 1, teleporter: 1, piloting: 1, doors: 1 },
    weapons: ["small_bomb", "basic_laser"], drones: [], augments: ["mantis_pheromones"],
    stores: { fuel: 16, missiles: 16, droneParts: 0 },
    layout: makeLayout(["engines", "shields", "weapons", "teleporter", "medbay", "oxygen", "doors", "piloting"]), hullStyle: "mantis" },
  { id: "mantis_b", name: "The Basilisk", cls: "Mantis Cruiser B", family: "mantis", variant: "B", unlock: "achievements",
    unlockHint: "Earn 2 of 3 Mantis Cruiser achievements.",
    reactor: 11, crew: ["mantis", "mantis"],
    systems: { shields: 4, engines: 2, medbay: 2, oxygen: 1, droneCtrl: 3, teleporter: 1, piloting: 1, doors: 1 },
    weapons: [], drones: ["boarding", "defense_1"], augments: ["mantis_pheromones"],
    stores: { fuel: 16, missiles: 0, droneParts: 15 }, teleporterPads: 4,
    layout: makeLayout(["engines", "shields", "droneCtrl", "teleporter", "medbay", "oxygen", "doors", "piloting"]), hullStyle: "mantis" },
  { id: "slug_a", name: "Man of War", cls: "Slug Cruiser A", family: "slug", variant: "A", unlock: "quest",
    unlockHint: "Survive the Slug home nebula's bargain, or win with the Mantis Cruiser.",
    reactor: 8, crew: ["slug", "slug"],
    systems: { shields: 2, engines: 2, medbay: 1, oxygen: 1, weapons: 3, piloting: 1, doors: 2 },
    weapons: ["antibio_beam", "breach_bomb_1", "dual_lasers"], drones: [], augments: ["slug_gel"],
    stores: { fuel: 16, missiles: 15, droneParts: 0 }, noSensors: true,
    layout: makeLayout(["engines", "shields", "weapons", "medbay", "oxygen", "doors", "piloting"]), hullStyle: "slug" },
  { id: "slug_b", name: "The Stormwalker", cls: "Slug Cruiser B", family: "slug", variant: "B", unlock: "achievements",
    unlockHint: "Earn 2 of 3 Slug Cruiser achievements.",
    reactor: 7, crew: ["slug", "slug", "slug"],
    systems: { shields: 2, engines: 2, oxygen: 1, weapons: 3, teleporter: 1, piloting: 1, doors: 2 },
    weapons: ["healing_burst", "artemis"], drones: [], augments: ["slug_gel"],
    stores: { fuel: 16, missiles: 25, droneParts: 0 }, noSensors: true,
    layout: makeLayout(["engines", "shields", "weapons", "teleporter", "oxygen", "doors", "piloting"]), hullStyle: "slug" },
  { id: "rock_a", name: "Bulwark", cls: "Rock Cruiser A", family: "rock", variant: "A", unlock: "quest",
    unlockHint: "Answer the Rock war vessel's challenge, or win with the Slug Cruiser.",
    reactor: 8, crew: ["rock", "rock", "rock"],
    systems: { shields: 2, engines: 2, medbay: 1, oxygen: 1, weapons: 3, piloting: 1, sensors: 1, doors: 1 },
    weapons: ["artemis", "hull_missiles"], drones: [], augments: ["rock_plating"],
    stores: { fuel: 16, missiles: 28, droneParts: 0 },
    layout: makeLayout(["engines", "shields", "weapons", "medbay", "oxygen", "sensors", "doors", "piloting"]), hullStyle: "rock" },
  { id: "rock_b", name: "Shivan", cls: "Rock Cruiser B", family: "rock", variant: "B", unlock: "achievements",
    unlockHint: "Earn 2 of 3 Rock Cruiser achievements.",
    reactor: 8, crew: ["rock", "rock", "rock", "rock"],
    systems: { shields: 2, engines: 2, medbay: 1, oxygen: 2, weapons: 3, piloting: 1, sensors: 1 },
    weapons: ["heavy_pierce_1", "fire_bomb"], drones: [], augments: ["rock_plating"],
    stores: { fuel: 16, missiles: 18, droneParts: 0 }, noAirlocks: true,
    layout: makeLayout(["engines", "shields", "weapons", "medbay", "oxygen", "sensors", "piloting"], { noAirlocks: true }), hullStyle: "rock" },
  { id: "stealth_a", name: "The Nesasio", cls: "Stealth Cruiser A", family: "stealth", variant: "A", unlock: "quest",
    unlockHint: "Earn the Engi fleet's trust, or win with the Rock Cruiser.",
    reactor: 8, crew: ["human", "human", "human"],
    systems: { engines: 4, cloaking: 1, medbay: 1, oxygen: 1, weapons: 2, piloting: 1, sensors: 2, doors: 1 },
    weapons: ["mini_beam", "dual_lasers"], drones: [], augments: ["titan_casing", "lr_scanners"],
    stores: { fuel: 16, missiles: 0, droneParts: 0 },
    layout: makeLayout(["engines", "cloaking", "weapons", "medbay", "oxygen", "sensors", "doors", "piloting"]), hullStyle: "stealth" },
  { id: "stealth_b", name: "DA-SR 12", cls: "Stealth Cruiser B", family: "stealth", variant: "B", unlock: "achievements",
    unlockHint: "Earn 2 of 3 Stealth Cruiser achievements.",
    reactor: 7, crew: ["human", "human", "zoltan"],
    systems: { engines: 4, cloaking: 2, medbay: 1, oxygen: 1, weapons: 4, piloting: 1, sensors: 2, doors: 1 },
    weapons: ["glaive_beam"], drones: [], augments: ["lr_scanners"],
    stores: { fuel: 16, missiles: 0, droneParts: 0 },
    layout: makeLayout(["engines", "cloaking", "weapons", "medbay", "oxygen", "sensors", "doors", "piloting"]), hullStyle: "stealth" },
  { id: "crystal_a", name: "Bravais", cls: "Crystal Cruiser A", family: "crystal", variant: "A", unlock: "quest",
    unlockHint: "Complete the Crystal questline, or win with layouts A and B of every other ship.",
    reactor: 8, crew: ["human", "human", "crystal", "crystal"],
    systems: { shields: 2, engines: 2, medbay: 1, oxygen: 1, weapons: 3, piloting: 1, sensors: 1, doors: 1 },
    weapons: ["crystal_burst_1", "heavy_crystal_1"], drones: [], augments: ["crystal_vengeance"],
    stores: { fuel: 16, missiles: 0, droneParts: 0 },
    layout: makeLayout(["engines", "shields", "weapons", "medbay", "oxygen", "sensors", "doors", "piloting"]), hullStyle: "crystal" },
  { id: "crystal_b", name: "Carnelian", cls: "Crystal Cruiser B", family: "crystal", variant: "B", unlock: "achievements",
    unlockHint: "Earn 2 of 3 Crystal Cruiser achievements.",
    reactor: 8, crew: ["crystal", "crystal", "crystal"],
    systems: { shields: 2, engines: 2, medbay: 1, oxygen: 1, cloaking: 1, teleporter: 1, piloting: 1, sensors: 1, doors: 1 },
    weapons: [], drones: [], augments: ["crystal_vengeance"],
    stores: { fuel: 16, missiles: 0, droneParts: 0 }, teleporterPads: 4,
    layout: makeLayout(["engines", "shields", "cloaking", "teleporter", "medbay", "oxygen", "sensors", "doors", "piloting"]), hullStyle: "crystal" }
];
GAME_DATA.shipById = {};
(function () { for (var i = 0; i < GAME_DATA.ships.length; i++) GAME_DATA.shipById[GAME_DATA.ships[i].id] = GAME_DATA.ships[i]; })();

// ---------------------------------------------------------------------------
// Enemy archetypes (§7.7)
// ---------------------------------------------------------------------------
GAME_DATA.enemyArchetypes = [
  { id: "rebel_fighter", cls: "Rebel Fighter", faction: "rebel", kind: "fighter", hull: [10, 16], crew: [3, 4], hullStyle: "rebel" },
  { id: "rebel_rigger", cls: "Rebel Rigger", faction: "rebel", kind: "scout", hull: [6, 10], crew: [2, 3], hullStyle: "rebel", preferDrones: true },
  { id: "rebel_elite", cls: "Rebel Elite Fighter", faction: "rebel", kind: "assault", hull: [14, 20], crew: [4, 6], hullStyle: "rebel", elite: true },
  { id: "pirate_scout", cls: "Pirate Scout", faction: "pirate", kind: "scout", hull: [6, 10], crew: [2, 3], hullStyle: "pirate" },
  { id: "pirate_fighter", cls: "Pirate Fighter", faction: "pirate", kind: "fighter", hull: [10, 16], crew: [3, 5], hullStyle: "pirate" },
  { id: "mantis_scout", cls: "Mantis Scout", faction: "mantis", kind: "scout", hull: [6, 10], crew: [2, 4], hullStyle: "mantisE", boarders: true },
  { id: "mantis_fighter", cls: "Mantis Fighter", faction: "mantis", kind: "fighter", hull: [10, 16], crew: [4, 6], hullStyle: "mantisE", boarders: true },
  { id: "engi_bomber", cls: "Engi Bomber", faction: "engi", kind: "fighter", hull: [10, 14], crew: [2, 4], hullStyle: "engiE", preferIon: true, preferDrones: true },
  { id: "zoltan_fighter", cls: "Zoltan Fighter", faction: "zoltan", kind: "fighter", hull: [10, 14], crew: [3, 4], hullStyle: "zoltanE" },
  { id: "rock_assault", cls: "Rock Assault", faction: "rock", kind: "assault", hull: [14, 20], crew: [3, 5], hullStyle: "rockE", preferMissiles: true },
  { id: "slug_interceptor", cls: "Slug Interceptor", faction: "slug", kind: "fighter", hull: [10, 15], crew: [2, 4], hullStyle: "slugE" },
  { id: "auto_scout", cls: "Auto-Scout", faction: "auto", kind: "scout", hull: [6, 10], crew: [0, 0], hullStyle: "auto", automated: true },
  { id: "auto_assault", cls: "Auto-Assault", faction: "auto", kind: "assault", hull: [14, 18], crew: [0, 0], hullStyle: "auto", automated: true }
];
GAME_DATA.enemyArchetypeById = {};
(function () { for (var i = 0; i < GAME_DATA.enemyArchetypes.length; i++) GAME_DATA.enemyArchetypeById[GAME_DATA.enemyArchetypes[i].id] = GAME_DATA.enemyArchetypes[i]; })();

// ---------------------------------------------------------------------------
// Sector types (§9.1)
// ---------------------------------------------------------------------------
GAME_DATA.sectorTypes = [
  { id: "civilian", color: "green", weight: 48,
    names: ["Civilian Sector", "Engi Controlled Sector", "Zoltan Controlled Sector"],
    trait: "Fewer hostiles, more stores and quests." },
  { id: "hostile", color: "red", weight: 32,
    names: ["Pirate Controlled Sector", "Mantis Controlled Sector", "Rebel Controlled Sector", "Rock Controlled Sector"],
    trait: "More hostiles, better combat rewards." },
  { id: "nebula", color: "purple", weight: 20,
    names: ["Slug Controlled Nebula", "Uncharted Nebula"],
    trait: "Sensors dark. The rebel fleet advances slower here." }
];
GAME_DATA.sectorFactionOf = {
  "Civilian Sector": "pirate", "Engi Controlled Sector": "engi", "Zoltan Controlled Sector": "zoltan",
  "Pirate Controlled Sector": "pirate", "Mantis Controlled Sector": "mantis", "Rebel Controlled Sector": "rebel",
  "Rock Controlled Sector": "rock", "Rebel Stronghold": "rebel", "Slug Controlled Nebula": "slug",
  "Uncharted Nebula": "slug", "The Last Stand": "rebel"
};

// ---------------------------------------------------------------------------
// Flagship (§15)
// ---------------------------------------------------------------------------
GAME_DATA.flagship = {
  phase1: { hull: 20, reactor: 42, shieldLayers: 4, engines: 2, doors: 3, cloaking: 2,
    crewCount: 11, evasion: { base: 10, manned: 20, ai: 20 },
    weapons: ["boss_ion", "boss_laser", "boss_missiles", "boss_beam"], artilleryLevel: 3 },
  phase2: { hull: 22, reactor: 44, shieldLayers: 4, engines: 3,
    evasion: { base: 15, manned: 25, ai: 25 },
    weapons: ["boss_laser", "boss_missiles", "boss_beam"], artilleryLevel: 3,
    droneCtrl: 8, drones: ["combat_1", "combat_1", "beam_drone_1", "beam_drone_1", "defense_1", "defense_1", "boarding", "boarding"],
    surge: { type: "drones", cooldown: [20, 30], warningSecs: 5 } },
  phase3: { hull: 20, reactor: 32, shieldLayers: 4, engines: 6, teleporter: 2,
    evasion: { base: 28, manned: 38, ai: 38 },
    weapons: ["boss_laser", "boss_missiles"], artilleryLevel: 4,
    superShield: 12,
    surge: { type: "laserBarrage", cooldown: [20, 30], warningSecs: 5 } },
  bossChargeByArtLevel: { 1: 1.4, 2: 1.2, 3: 1.0, 4: 0.85 } // charge time multiplier
};

// ---------------------------------------------------------------------------
// Achievements (§14.6)
// ---------------------------------------------------------------------------
GAME_DATA.achievements = [
  // General progress
  { id: "sector5", row: "General progress", name: "Just Getting Started", req: "Reach sector 5." },
  { id: "sector8", row: "General progress", name: "Base in Range", req: "Reach sector 8." },
  { id: "win_easy", row: "General progress", name: "Victory (Easy)", req: "Win the game on Easy." },
  { id: "win_normal", row: "General progress", name: "Victory (Normal)", req: "Win the game on Normal." },
  { id: "win_hard", row: "General progress", name: "Victory (Hard)", req: "Win the game on Hard." },
  { id: "all_a", row: "General progress", name: "Your Own Fleet", req: "Unlock every layout A ship." },
  { id: "greed", row: "General progress", name: "Greed is Eternal", req: "Collect 10,000 scrap over your career." },
  { id: "warlord", row: "General progress", name: "Warlord", req: "Defeat 1,000 ships over your career." },
  // Going the distance
  { id: "peace_envoy", row: "Going the distance", name: "Peace Envoy", req: "Reach sector 5 without destroying a single ship." },
  { id: "stock_hull", row: "Going the distance", name: "Stock Hull", req: "Reach sector 5 with zero system or reactor upgrades." },
  { id: "field_medic", row: "Going the distance", name: "Field Medic", req: "Reach sector 5 without buying hull repairs at a store." },
  { id: "ballistophobia", row: "Going the distance", name: "Ballistophobia", req: "Reach sector 8 without firing a missile or bomb." },
  { id: "technophobia", row: "Going the distance", name: "Technophobia", req: "Reach sector 8 without deploying a drone." },
  { id: "off_the_land", row: "Going the distance", name: "Living off the Land", req: "Reach sector 8 without buying anything at a store." },
  { id: "no_redshirts", row: "Going the distance", name: "No Redshirts Here", req: "Reach sector 8 without losing a crew member." },
  // Skill and equipment feats
  { id: "scorched", row: "Skill and equipment feats", name: "Scorched Earth", req: "Have every room of an enemy ship on fire at once." },
  { id: "low_odds", row: "Skill and equipment feats", name: "Astronomically Low Odds", req: "Get hit five times in a row at 35% or higher evasion." },
  { id: "drone_rampage", row: "Skill and equipment feats", name: "Drone Rampage", req: "One boarding drone kills 4 crew in a single fight." },
  { id: "never_saw_it", row: "Skill and equipment feats", name: "They Never Saw It Coming", req: "Destroy a ship with a Pre-Igniter alpha strike before it fires." },
  { id: "autopilot", row: "Skill and equipment feats", name: "Trustworthy Autopilot", req: "Win a fight with all your crew on the enemy ship." },
  { id: "slice_dice", row: "Skill and equipment feats", name: "Slice and Dice", req: "Hit every enemy room with one beam sweep." },
  { id: "asphyxiation", row: "Skill and equipment feats", name: "Victory Through Asphyxiation", req: "Reduce a crewed enemy ship's oxygen below 5%." }
];
// Per-ship achievements (Kestrel three per spec; others original, same spirit)
GAME_DATA.shipAchievements = {
  kestrel: [
    { id: "kestrel_1", name: "The United Federation", req: "Have 6 unique races aboard the Kestrel simultaneously." },
    { id: "kestrel_2", name: "Full Arsenal", req: "Have 11 systems and subsystems installed on the Kestrel at once." },
    { id: "kestrel_3", name: "Tough Little Ship", req: "Return to full hull after being at exactly 1 HP." }
  ],
  engi: [
    { id: "engi_1", name: "Robotic Warfare", req: "Destroy a ship while fielding two or more drones." },
    { id: "engi_2", name: "The Quiet Circuit", req: "Win a fight using only ion weapons and drones." },
    { id: "engi_3", name: "Guided Repair", req: "Have a System Repair Drone fix 10 system bars in one run." }
  ],
  fed: [
    { id: "fed_1", name: "Master and Commander", req: "Win a fight using only the Artillery Beam for damage." },
    { id: "fed_2", name: "Diplomatic Immunity", req: "Resolve 4 events peacefully in one run with the Federation Cruiser." },
    { id: "fed_3", name: "Artillery Barrage", req: "Upgrade the Artillery Beam to level 4." }
  ],
  zoltan: [
    { id: "zoltan_1", name: "Shields Holding", req: "Win a fight before your Zoltan Shield fully depletes." },
    { id: "zoltan_2", name: "Givers of Life", req: "Have five Zoltan crew aboard at once." },
    { id: "zoltan_3", name: "Manpower", req: "Keep every system powered with help from Zoltan crew in a fight." }
  ],
  mantis: [
    { id: "mantis_1", name: "Take No Prisoners", req: "Kill the entire crew of a ship using only boarding parties." },
    { id: "mantis_2", name: "Avast, Ye Scurvy Dogs", req: "Kill 5 enemy crew in a single fight without losing any." },
    { id: "mantis_3", name: "Battle Royale", req: "Win a boarding fight inside the enemy medbay." }
  ],
  slug: [
    { id: "slug_1", name: "Home Nebula", req: "Win 3 fights inside nebulae in one run." },
    { id: "slug_2", name: "Disintegration Ray", req: "Kill 3 crew with one Anti-Bio Beam sweep." },
    { id: "slug_3", name: "Creature Comforts", req: "Reach sector 6 without a sensors subsystem." }
  ],
  rock: [
    { id: "rock_1", name: "Tough as Nails", req: "Take 20 hull damage in one fight and survive it." },
    { id: "rock_2", name: "Fire and Stone", req: "Win a fight in which 4 enemy rooms burn at once." },
    { id: "rock_3", name: "Ancestral Pride", req: "Defeat a ship using only missiles." }
  ],
  stealth: [
    { id: "stealth_1", name: "Bird of Prey", req: "Destroy a ship during a single cloak." },
    { id: "stealth_2", name: "Phase Shift", req: "Dodge 9 shots during one cloak." },
    { id: "stealth_3", name: "Tactical Approach", req: "Reach sector 5 without shields installed." }
  ],
  crystal: [
    { id: "crystal_1", name: "Sealed Fate", req: "Kill an enemy crew member inside a locked-down room." },
    { id: "crystal_2", name: "Shard Storm", req: "Trigger Crystal Vengeance three times in one fight." },
    { id: "crystal_3", name: "Ancestry Reclaimed", req: "Win the game with a Crystal crew member aboard." }
  ]
};

// ---------------------------------------------------------------------------
// UI strings (single English string table; §0 label set)
// ---------------------------------------------------------------------------
GAME_DATA.text = {
  title: "STARFALL",
  play: "PLAY", easy: "EASY", normal: "NORMAL", hard: "HARD",
  ship: "SHIP", list: "LIST", randomShip: "RANDOM SHIP", layoutA: "LAYOUT A", layoutB: "LAYOUT B",
  hideRooms: "HIDE ROOMS", rename: "RENAME", crew: "CREW", weapons: "WEAPONS", drones: "DRONES",
  augmentations: "AUGMENTATIONS", customize: "CUSTOMIZE", aeContent: "Advanced Edition Content",
  enabled: "ENABLED", disabled: "DISABLED",
  powerRequired: "Power required", chargeTime: "Charge time", usesMissiles: "Uses missiles",
  damage: "Damage", shieldPiercing: "Shield piercing", fireChance: "Fire chance", breachChance: "Breach chance",
  low: "Low", medium: "Medium", high: "High",
  hull: "HULL", buy: "BUY", sell: "SELL", supplies: "SUPPLIES", systems: "SYSTEMS",
  subsystems: "SUBSYSTEMS", repair: "REPAIR", onePt: "1 PT", all: "ALL", currentHull: "Current hull",
  store: "STORE", jump: "JUMP", ftl: "FTL", charging: "CHARGING...", ready: "READY!",
  autoFire: "AUTO-FIRE", done: "DONE", cancel: "CANCEL", beaconMap: "BEACON MAP",
  sector: "SECTOR", exit: "EXIT", tip: "Tip", warning: "Warning",
  paused: "PAUSED", pausedSub: "Press SPACE to resume",
  continueBtn: "CONTINUE", newGame: "NEW GAME", tutorial: "TUTORIAL", stats: "STATS",
  options: "OPTIONS", credits: "CREDITS", quit: "QUIT",
  chooseShip: "CHOOSE YOUR SHIP", start: "START",
  reactor: "REACTOR", cargo: "CARGO", accept: "ACCEPT", undo: "UNDO", dismiss: "DISMISS",
  target: "TARGET", classLabel: "Class", allegiance: "Allegiance", hostile: "Hostile", neutral: "Neutral",
  hullCritical: "WARNING! HULL CRITICAL", intruders: "WARNING! INTRUDERS DETECTED",
  solarFlare: "SOLAR FLARE", asteroidField: "ASTEROID FIELD", ionStorm: "ION STORM", asb: "ANTI-SHIP BATTERY",
  danger: "DANGER!", enemyFtl: "ENEMY SHIP IS CHARGING ITS FTL DRIVE!",
  wait: "WAIT", noFuel: "NO FUEL", distressBeacon: "DISTRESS SIGNAL",
  voyageOver: "VOYAGE OVER", score: "SCORE", newHighScore: "New high score!",
  victoryHead: "THE DREADNOUGHT IS DESTROYED - THE COALITION PREVAILS",
  restart: "RESTART", hangar: "HANGAR", menu: "MENU", saveQuit: "SAVE + QUIT", controls: "CONTROLS",
  difficultyLabel: "Difficulty", advancedLabel: "Advanced content",
  currentShipAch: "CURRENT SHIP ACHIEVEMENTS",
  highScores: "HIGH SCORES", bestShip: "BEST SHIP", achievements: "ACHIEVEMENTS",
  video: "VIDEO", gameplay: "GAMEPLAY", audio: "AUDIO", deleteProfile: "DELETE PROFILE",
  fullscreen: "Fullscreen", vsync: "V-sync", frameCap: "Frame cap", dynamicBg: "Dynamic backgrounds",
  colorblind: "Colorblind mode", language: "Language", english: "English",
  eventDelay: "Event choice delay", showPaths: "Show beacon paths at cursor",
  achPopups: "Achievement popups", showTips: "Show tips", volume: "Volume", musicVolume: "Music volume",
  leaveSector: "LEAVE SECTOR", teleportSend: "SEND", teleportRetrieve: "RETRIEVE",
  notAvailable: "Not available in this edition.",
  abandonConfirm: "Starting a new game will abandon your current voyage. Continue?",
  abandonRun: "Abandon current run?",
  yes: "YES", no: "NO",
  dismissConfirm: "Dismiss NAME permanently?",
  savingDisabled: "Saving disabled in this browser",
  saveCorrupt: "Save data corrupted",
  youMayClose: "You may close this tab.",
  ftlCharging: "FTL charging",
  jumpDelayed: "ENEMY FTL CHARGING - JUMP DELAYED",
  powerSurge: "POWER SURGE DETECTED",
  baseAttack: "The base is under attack",
  fleetIcon: "REBEL FLEET", storeTag: "STORE", exitTag: "EXIT",
  renameCrewNote: "Note: click a crew member's name to rename them.",
  crewSkills: "CREW SKILLS",
  noDroneSystem: "Warning: you have no drone system. You can buy one at a store.",
  noMissilesWarn: "Warning: this weapon requires missiles.",
  tipLaser: "Tip: each laser shot is blocked by a single shield layer, regardless of the laser's damage.",
  tipBeam: "Tip: beams never miss, but every active shield layer subtracts one damage per room.",
  tipMissile: "Tip: missiles fly straight through shields but can be shot down by defense drones.",
  tipBomb: "Tip: bombs teleport past shields and defense drones. They never damage the hull.",
  tipIon: "Tip: ion damage stacks. Keep hitting the same system to lock it down completely.",
  tipDrone: "Tip: at each new location, defense drones require one drone part to deploy. They keep defending your ship as long as they are supplied with power.",
  tipAugment: "Tip: augmentations work automatically. You can carry at most three.",
  tipCrewSell: "Tip: crew hired at stores walk aboard immediately. Your ship berths at most eight.",
  flagshipRetreat: "The flagship retreats to lick its wounds!",
  flagshipAI: "The flagship's AI seizes control!",
  enemyEscapes: "The enemy escapes.",
  nothingLeft: "Nothing left here but drifting debris. The rebel fleet is closing in."
};

// Tips shown on first occurrence (§2.10)
GAME_DATA.helpTips = {
  firstCombat: "Enemy sighted! Click a weapon (or press 1-4), then click a room on the enemy ship to target it. Press SPACE any time to pause and think.",
  firstDamage: "Your ship took system damage. Click a crew member, then right-click the damaged room to send them to repair it.",
  firstFire: "Fire aboard! Fires spread and eat your oxygen. Send crew to stamp them out, or vent the room to space with your airlocks.",
  firstBreach: "Hull breach! The room is losing air. Crew standing on the breach will seal it.",
  firstStore: "This beacon hosts a store. Trade scrap for weapons, systems, crew, fuel, and repairs. Stores never restock, so buy what you need.",
  firstMap: "The beacon map shows where you can jump. Reach the EXIT beacon before the rebel fleet swallows the sector."
};

GAME_DATA.creditsLines = [
  "STARFALL",
  "",
  "A single-file spaceship roguelike",
  "",
  "Design, code, art and audio",
  "produced entirely in code",
  "",
  "Inspired by the classics of the genre",
  "",
  "Thank you for flying with the Federation."
];

// ---------------------------------------------------------------------------
// Events (§11) - every line of prose is original to STARFALL.
// effects vocabulary: tier:"low|medium|high" or scrap:[lo,hi], fuel:[lo,hi]|n,
// missiles, droneParts, hull, crewDamage, gainCrew:"random|<race>", loseCrew:1,
// gainWeapon:"dropTable"|id, gainDrone, gainAugment, startFight:{...},
// systemDamage:{sys:n}, revealMap:n, delayFleet:n, markQuestBeacon:"chainId",
// goto:"eventId", unlockShip:"shipId", startFires:n
// ---------------------------------------------------------------------------
GAME_DATA.events = [

  // ===== NEUTRAL ============================================================
  { id: "empty_1", pools: ["neutral"], text: "The beacon hangs in silence. Nothing answers your hails, and the scanner sweep returns only dust and starlight.",
    choices: [{ label: "Continue...", outcomes: [{ weight: 100, effects: {}, text: "You log the coordinates and spin up the FTL drive." }] }] },
  { id: "empty_2", pools: ["neutral"], text: "A dead relay buoy tumbles past, its antennae snapped off decades ago. Whatever signal it once carried is long gone.",
    choices: [{ label: "Continue...", outcomes: [{ weight: 100, effects: {}, text: "The buoy drifts on. So do you." }] }] },
  { id: "empty_3", pools: ["neutral"], text: "Your navigator flags an old battle site: carbonized plating, a ring of frozen coolant, no survivors. The war has been here before you.",
    choices: [
      { label: "Sift the wreckage.", outcomes: [
        { weight: 60, effects: { tier: "low" }, text: "You pull a few unbent struts and a sealed parts crate from the field." },
        { weight: 40, effects: {}, text: "Scavengers beat you here by years. Nothing remains worth the fuel to grab it." }] },
      { label: "Leave the dead in peace.", outcomes: [{ weight: 100, effects: {}, text: "You cut engines briefly in salute, then move on." }] }] },
  { id: "derelict_1", pools: ["neutral"], text: "A gutted freighter drifts nose-down, cargo doors yawning. Your sensors read no heat, no motion - and one intact hold.",
    choices: [
      { label: "Board the hold.", outcomes: [
        { weight: 55, effects: { tier: "medium" }, text: "The hold yields sealed containers of salvageable alloy. A good haul." },
        { weight: 25, effects: { tier: "low", crewDamage: 15 }, text: "A pressure door fails mid-sweep and slams into your boarding party. They limp back with a modest load." },
        { weight: 20, effects: { startFires: 1, tier: "medium" }, text: "A booby-trapped crate flares as you cut it loose. Fire licks through your airlock before the doors seal. You keep the salvage anyway." }] },
      { label: "Scan it and move on.", outcomes: [{ weight: 100, effects: {}, text: "Better cautious than combustible." }] }] },
  { id: "derelict_2", pools: ["neutral"], text: "A colony seed-ship, centuries old, coasts on a dead heading. Its cryo bays are dark. Someone has already cut the locks.",
    choices: [
      { label: "Search the bays.", outcomes: [
        { weight: 50, effects: { tier: "low", fuel: [1, 2] }, text: "The looters missed the fuel bunker. You drain it gratefully." },
        { weight: 30, effects: { tier: "medium" }, text: "Behind a false bulkhead you find the crew's emergency reserve, untouched." },
        { weight: 20, effects: {}, text: "Empty. Every bay, every locker, every pocket." }] },
      { label: "Leave.", outcomes: [{ weight: 100, effects: {}, text: "The seed-ship sails on toward a harbor it will never reach." }] }] },
  { id: "derelict_3", pools: ["neutral"], text: "An escape pod pings weakly at the beacon's edge. Frost stars its viewport. There is a heartbeat inside - slow, but steady.",
    choices: [
      { label: "Thaw the pod.", outcomes: [
        { weight: 60, effects: { gainCrew: "random" }, text: "The sleeper wakes with a gasp and a debt. They sign onto your crew on the spot." },
        { weight: 40, effects: { tier: "low" }, text: "The pod's occupant is beyond help, but its survival cache is not." }] },
      { label: "Too risky. Leave it.", outcomes: [{ weight: 100, effects: {}, text: "The pod's ping fades behind you." }] }] },
  { id: "trader_1", pools: ["neutral"], text: "An independent trader hails you, holds open, prices scrolling across your screen before you can say hello.",
    choices: [
      { label: "Buy fuel (3 scrap each).", outcomes: [{ weight: 100, effects: { trade: { buy: "fuel", price: 3, qty: 3 } }, text: "Fuel cells thump into your bunker." }] },
      { label: "Buy missiles (6 scrap each).", outcomes: [{ weight: 100, effects: { trade: { buy: "missiles", price: 6, qty: 2 } }, text: "Fresh warheads slot into the racks." }] },
      { label: "Decline and jump on.", outcomes: [{ weight: 100, effects: {}, text: "The trader shrugs and closes the channel." }] }] },
  { id: "trader_2", pools: ["neutral"], text: "A scrap barge flags you down. Its captain wants missiles more than money and is willing to overpay.",
    choices: [
      { label: "Sell 2 missiles for 16 scrap.", outcomes: [{ weight: 100, effects: { trade: { sell: "missiles", qty: 2, gain: 16 } }, text: "The barge captain counts out your scrap with theatrical care." }] },
      { label: "Keep your ammunition.", outcomes: [{ weight: 100, effects: {}, text: "The captain grumbles something about hoarders and disengages." }] }] },
  { id: "refugees", pools: ["neutral"], text: "A convoy of refugee shuttles crawls between beacons, overloaded and underpowered. One family offers everything they have if you will carry their eldest, a trained technician, somewhere safer.",
    choices: [
      { label: "Take the technician aboard (they work for passage).", outcomes: [{ weight: 100, effects: { gainCrew: "random" }, text: "A new name goes on your crew roster. The convoy flashes its running lights in thanks." }] },
      { label: "Give them 10 scrap instead.", requiresResource: { scrap: 10 }, outcomes: [{ weight: 100, effects: { scrap: [-10, -10] }, text: "It is not much, but it will keep their scrubbers running another month." }] },
      { label: "You cannot help everyone.", outcomes: [{ weight: 100, effects: {}, text: "The convoy dwindles in your aft viewport." }] }] },
  { id: "depot", pools: ["neutral"], text: "An abandoned supply depot clings to a shattered asteroid. Its docking clamps still cycle, patient as ever, for ships that stopped coming.",
    choices: [
      { label: "Dock and strip the shelves.", outcomes: [
        { weight: 45, effects: { tier: "medium", missiles: [0, 2] }, text: "Half the racks are bare, but the other half pay for the detour." },
        { weight: 35, effects: { fuel: [1, 3] }, text: "You find fuel and little else. Fuel is enough." },
        { weight: 20, effects: { startFight: { archetype: "pirate_scout" } }, text: "The depot was bait. A pirate scout detaches from the asteroid's shadow, guns hot." }] },
      { label: "Keep your distance.", outcomes: [{ weight: 100, effects: {}, text: "Patience is a trap-setter's favorite tool. Not today." }] }] },
  { id: "auto_sighting", pools: ["neutral"], text: "A rebel auto-scout flickers across your long-range plot, cataloguing beacons ahead of the fleet.",
    choices: [
      { label: "Ignore it.", outcomes: [{ weight: 100, effects: {}, text: "It slips away to report. The fleet will know your heading soon enough." }] },
      { label: "Chase it down.", outcomes: [{ weight: 100, effects: { startFight: { archetype: "auto_scout" } }, text: "You burn hard and force the drone to turn and fight." }] },
      { label: "(Cloaking) Shadow it through its survey run.", blue: { system: "cloaking>=1" }, outcomes: [{ weight: 100, effects: { revealMap: 3, delayFleet: 1 }, text: "Cloaked, you ghost along behind the scout and copy its survey feed - three beacons mapped, and its false report buys you time against the fleet." }] }] },
  { id: "diplomat", pools: ["neutral", "sectorType:civilian"], text: "A Federation diplomat's courier requests escort formation for one leg of her route. Her pilot looks fresh out of the academy and terrified.",
    choices: [
      { label: "Fly the leg with them.", outcomes: [
        { weight: 70, effects: { tier: "medium" }, text: "The leg passes quietly. The diplomat transfers an escort fee with a formal note of thanks." },
        { weight: 30, effects: { startFight: { archetype: "rebel_rigger" }, tier: "medium" }, text: "A rebel rigger drops in on the courier. You are already between them when its weapons charge. The fee arrives mid-fight." }] },
      { label: "Decline.", outcomes: [{ weight: 100, effects: {}, text: "The courier's pilot swallows hard and burns off alone." }] }] },
  { id: "color_1", pools: ["neutral"], text: "You pass a monastery ship in silent transit, hull etched stem to stern with the names of ships lost to the war. Your own class of cruiser appears twice.",
    choices: [{ label: "Continue...", outcomes: [{ weight: 100, effects: {}, text: "Not three times. Not today." }] }] },
  { id: "color_2", pools: ["neutral"], text: "A pulsar lighthouse sweeps its beam across your bow, tagging your transponder with an automated blessing from a civilization that no longer exists.",
    choices: [{ label: "Continue...", outcomes: [{ weight: 100, effects: {}, text: "You keep the blessing. It weighs nothing." }] }] },
  { id: "color_3", pools: ["neutral"], text: "Local miners have painted an enormous grinning face on a passing comet. Your sensors officer refuses to explain why this improves morale, but it does.",
    choices: [{ label: "Continue...", outcomes: [{ weight: 100, effects: {}, text: "The comet grins its way toward the outer dark." }] }] },
  { id: "barge_race", pools: ["neutral"], text: "Two ore barges are drag-racing between beacons, engines glowing dangerously past tolerance. Their crews wave bets at you over open comms.",
    choices: [
      { label: "Bet 10 scrap on the lead barge.", requiresResource: { scrap: 10 }, outcomes: [
        { weight: 50, effects: { scrap: [10, 10] }, text: "The lead barge holds it together and wins by a hull length. You double your stake." },
        { weight: 50, effects: { scrap: [-10, -10] }, text: "The lead barge blows a coupling at the finish line. Your scrap changes hands amid howls of laughter." }] },
      { label: "Decline to gamble.", outcomes: [{ weight: 100, effects: {}, text: "The barges thunder off. Somewhere, a coupling fails musically." }] }] },
  { id: "observatory", pools: ["neutral"], text: "A one-man observatory station asks for a moment of your time: its astronomer needs a second ship's parallax reading to finish a decade of work.",
    choices: [
      { label: "Hold position for the reading.", outcomes: [{ weight: 100, effects: { revealMap: 2 }, text: "The astronomer, delighted, pays you in the only currency he has: exquisite charts of the surrounding beacons." }] },
      { label: "No time for science.", outcomes: [{ weight: 100, effects: {}, text: "The astronomer sighs and resets his instruments for the next decade." }] }] },

  // ===== DISTRESS ===========================================================
  { id: "stranded_civ", pools: ["distress"], text: "A civilian shuttle floats dead at the beacon, batteries flat, cabin lights dimming. A family of four waves through the viewport.",
    choices: [
      { label: "Transfer a fuel cell.", requiresResource: { fuel: 1 }, outcomes: [
        { weight: 70, effects: { fuel: [-1, -1], tier: "medium" }, text: "They insist on paying in salvage their reactor cannot use. Everyone leaves richer." },
        { weight: 30, effects: { fuel: [-1, -1] }, text: "They have nothing to give but thanks. It turns out to be enough." }] },
      { label: "Leave them for the next ship.", outcomes: [{ weight: 100, effects: {}, text: "You tell yourself another ship is coming. You do not check the traffic logs." }] }] },
  { id: "plague_colony", pools: ["distress"], text: "A mining colony broadcasts a quarantine plea: an engineered blight is racing through their habitat ring and their med-lab crew are already down.",
    choices: [
      { label: "Send help in suits.", outcomes: [
        { weight: 60, effects: { tier: "medium", crewDamage: 20 }, text: "Your team stabilizes the ring, though two of them come back coughing. The colony pays what it can." },
        { weight: 40, effects: { crewDamage: 30, tier: "low" }, text: "The blight chews through your team's filters. You pull them out early with a token payment and a hard lesson." }] },
      { label: "(Engi Crew) Send your Engi to run the quarantine systems.", blue: { race: "engi" }, outcomes: [
        { weight: 100, effects: { tier: "high", revealMap: 3 }, text: "Immune to the blight, your Engi reroutes the ring's air cycle in an afternoon. The grateful miners upload their survey charts and empty their strongbox." }] },
      { label: "(Medbay Level 2) Synthesize a cure aboard.", blue: { system: "medbay>=2" }, outcomes: [
        { weight: 75, effects: { tier: "high" }, text: "Your medbay brews a counteragent from the blight's own samples. The colony declares a holiday in your ship's name." },
        { weight: 25, effects: { tier: "high", gainCrew: "human" }, text: "The cure works. A young colony medic, awestruck, begs to join your crew - and does." }] },
      { label: "Respect the quarantine and leave.", outcomes: [{ weight: 100, effects: {}, text: "The colony's beacon keeps pleading behind you until the jump cuts it off." }] }] },
  { id: "hulk_loot", pools: ["distress"], text: "An automated distress loop leads you to a cruiser hulk, holed and cold. The loop was set by its dying crew to guide salvagers to their cargo - so their debts would die with them.",
    choices: [
      { label: "Honor the arrangement. Take the cargo.", outcomes: [
        { weight: 60, effects: { tier: "medium" }, text: "The cargo is intact and the manifest heartbreaking. You take both aboard." },
        { weight: 25, effects: { tier: "high" }, text: "Beneath the listed cargo you find an unlisted strongroom. The dead crew's debts are more than paid." },
        { weight: 15, effects: { hull: -2, tier: "low" }, text: "A corroded fuel line ruptures as you dock, scorching your hull. You still recover part of the cargo." }] },
      { label: "Leave the hulk sealed.", outcomes: [{ weight: 100, effects: {}, text: "The loop plays on for the next ship, and the next." }] }] },
  { id: "station_asteroids", pools: ["distress"], text: "A relay station wedged in an asteroid stream is being hammered flat. Its shield generator is failing between impacts.",
    choices: [
      { label: "Fly cover and take the hits.", outcomes: [
        { weight: 100, effects: { hull: -2, tier: "high" }, text: "You park your hull between the station and the stream until its generator restarts. The dents are expensive; the gratitude is more so." }] },
      { label: "(Defense Drone) Screen the station with your drone.", blue: { drone: "defense" }, outcomes: [
        { weight: 100, effects: { tier: "high" }, text: "Your defense drone swats rocks out of the black until the generator spins back up. Not a scratch on anyone." }] },
      { label: "(Shields Level 6) Extend your shield envelope over the station.", blue: { system: "shields>=6" }, outcomes: [
        { weight: 100, effects: { tier: "high" }, text: "Your triple-layer envelope shrugs off the stream while the station patches itself. Their engineers applaud over open comms." }] },
      { label: "The stream is too dangerous. Withdraw.", outcomes: [{ weight: 100, effects: {}, text: "The station's calls chase you out of the system." }] }] },
  { id: "fuel_trader_dry", pools: ["distress"], text: "A long-haul trader is down to fumes and drifting. He offers well over market rate for fuel - or your silence, if you intend to leave him here.",
    choices: [
      { label: "Sell 2 fuel at 6 scrap each.", requiresResource: { fuel: 2 }, outcomes: [{ weight: 100, effects: { fuel: [-2, -2], scrap: [12, 12] }, text: "The trader pays double market without blinking. Desperation is bad for bargaining." }] },
      { label: "Donate 1 fuel.", requiresResource: { fuel: 1 }, outcomes: [
        { weight: 60, effects: { fuel: [-1, -1] }, text: "He promises to remember your transponder. Traders' memories are long." },
        { weight: 40, effects: { fuel: [-1, -1], gainWeapon: "dropTable" }, text: "Speechless, he opens his sample case and presses a piece of his stock into your cargo bay." }] },
      { label: "Leave him adrift.", outcomes: [{ weight: 100, effects: {}, text: "His comm light blinks until it is only one more star behind you." }] }] },
  { id: "burning_station", pools: ["distress"], text: "A habitat station burns from its docking ring inward, evacuation pods jammed in their cradles. Screams and static share the channel.",
    choices: [
      { label: "Dock and pull survivors through the fire.", outcomes: [
        { weight: 70, effects: { tier: "medium" }, text: "Your crew drag a dozen souls out through the smoke. The station master empties the till for you." },
        { weight: 30, effects: { startFires: 1, tier: "medium" }, text: "Flames chase your rescue party back through the airlock and aboard. You seal the deck and count heads - all present, plus twelve grateful strangers." }] },
      { label: "(Fire Bomb or Rock Crew) Make a controlled entry through the burn line.", blue: { weaponOr: "fire_bomb", raceOr: "rock" }, outcomes: [
        { weight: 100, effects: { tier: "medium", gainCrew: "random" }, text: "Fireproof expertise turns a death trap into a corridor. You walk the survivors out in single file, and one of them - a steady-handed dock engineer - signs on with you." }] },
      { label: "Stand off. It is already lost.", outcomes: [{ weight: 100, effects: {}, text: "The station folds in on its own glow. The channel goes quiet one voice at a time." }] }] },
  { id: "pinned_freighter", pools: ["distress"], text: "A freighter sits pinned in an asteroid shadow, engine cones crumpled. The rocks around it shift like slow teeth.",
    choices: [
      { label: "Tow it clear.", outcomes: [
        { weight: 100, effects: { hull: -2, tier: "medium" }, text: "The tow line holds; your hull takes the scraping instead. The freighter's captain settles up fairly." }] },
      { label: "(Rock Crew) Send your Rock across for an EVA rescue.", blue: { race: "rock" }, outcomes: [
        { weight: 100, effects: { tier: "high", fuel: [1, 2] }, text: "Impacts that would pulp a human bounce off your Rock crewman as he walks the hull and frees the intakes. The captain pays in scrap and tops off your fuel." }] },
      { label: "(Long-Ranged Scanners) Plot a safe lane through the rocks.", blue: { augment: "lr_scanners" }, outcomes: [
        { weight: 100, effects: { tier: "medium" }, text: "Your scanners thread a needle through the field. The freighter follows your wake out, no risk, full fee." }] },
      { label: "Leave before the teeth close.", outcomes: [{ weight: 100, effects: {}, text: "You watch the shadow swallow the freighter's running lights." }] }] },
  { id: "pod_nebula", pools: ["distress", "sectorType:nebula"], text: "Somewhere in the fog a voice repeats coordinates that do not match your charts. It sounds tired. It sounds close.",
    choices: [
      { label: "Follow the voice.", outcomes: [
        { weight: 50, effects: { gainCrew: "slug" }, text: "You find a Slug freighter-pilot in a leaking pod, three days from dead. She joins your crew before she is fully thawed." },
        { weight: 30, effects: { tier: "low" }, text: "The voice is a recording tied to a cache of supplies - an old nebula smuggler's insurance policy, unclaimed." },
        { weight: 20, effects: { startFight: { archetype: "slug_interceptor" } }, text: "The voice is a lure. A Slug interceptor rises out of the fog beneath you." }] },
      { label: "Nothing good repeats in a nebula. Move on.", outcomes: [{ weight: 100, effects: {}, text: "The voice recites its coordinates to the fog long after you stop listening." }] }] },
  { id: "trapped_miners", pools: ["distress"], text: "A mining rig's crew barricaded themselves in the ore hold when their reactor started venting. The rig's own repair drone is walking in circles, confused.",
    choices: [
      { label: "Board and fix the vent.", outcomes: [
        { weight: 65, effects: { tier: "medium" }, text: "Your engineers wrestle the vent shut and the miners emerge, blinking and generous." },
        { weight: 35, effects: { crewDamage: 25, tier: "medium" }, text: "The vent flash-burns your boarding team before they choke it off. The miners pay for the burn cream and then some." }] },
      { label: "Talk their drone through the repair.", outcomes: [
        { weight: 50, effects: { tier: "low" }, text: "After an hour of patient instruction, the drone succeeds. The miners send what they can spare." },
        { weight: 50, effects: {}, text: "The drone walks into a bulkhead and shuts down. The miners eventually fix the vent themselves and are too embarrassed to pay." }] },
      { label: "Leave.", outcomes: [{ weight: 100, effects: {}, text: "The rig shrinks behind you, still venting." }] }] },
  { id: "distress_trap", pools: ["distress"], text: "A textbook distress call: right frequency, right cadence, right amount of fear. Your comms officer notes it is also a word-for-word repeat of one you heard two sectors ago.",
    choices: [
      { label: "Answer it anyway.", outcomes: [
        { weight: 70, effects: { startFight: { archetype: "pirate_fighter" } }, text: "The 'sinking ship' powers weapons the moment you are in range. Pirates never change." },
        { weight: 30, effects: { tier: "medium" }, text: "Astonishingly, it is real this time - a captain whose distress recording was stolen and sold. He pays you for the rescue and the irony." }] },
      { label: "Jump past it.", outcomes: [{ weight: 100, effects: {}, text: "The recording loops on, fishing for a softer heart." }] }] },
  { id: "medical_convoy", pools: ["distress"], text: "A medical convoy lost its escort two jumps back and its lead ship is bleeding atmosphere. They cannot pay much. They say so up front.",
    choices: [
      { label: "Weld the leak.", outcomes: [{ weight: 100, effects: { tier: "low", gainAugment_chance: null }, text: "An hour of hull work buys a convoy full of vaccines its next jump. They pay in scrap and blessings." }] },
      { label: "Escort them to the next beacon instead.", outcomes: [
        { weight: 60, effects: { tier: "medium" }, text: "The leg is quiet. Their quartermaster rounds the fee up." },
        { weight: 40, effects: { startFight: { archetype: "pirate_scout" }, tier: "medium" }, text: "A pirate scout tries its luck against the convoy. Your presence makes it a short story." }] },
      { label: "Decline.", outcomes: [{ weight: 100, effects: {}, text: "The convoy limps on, praying its patches hold." }] }] },
  { id: "satellite_repair", pools: ["distress", "sectorType:civilian"], text: "A farming world's weather satellite is tumbling, and the harvest guidance it provides feeds three systems. Ground control's voice cracks asking for help.",
    choices: [
      { label: "Stabilize the satellite.", outcomes: [
        { weight: 100, effects: { tier: "medium" }, text: "A gentle grapple and a new gyro later, the satellite steadies. Ground control transfers the repair bounty with audible relief." }] },
      { label: "Not your field.", outcomes: [{ weight: 100, effects: {}, text: "Ground control thanks you anyway, which somehow makes it worse." }] }] },

  // ===== HOSTILE ============================================================
  { id: "fight_pirate", pools: ["hostile", "faction:pirate"], text: "A pirate ship swings out from behind the beacon's debris shadow, weapons already glowing. No hail, no demands.",
    ship: { archetype: "auto", hostile: true },
    choices: [{ label: "Charge weapons.", outcomes: [{ weight: 100, effects: { startFight: {} }, text: "Battle stations." }] }] },
  { id: "fight_rebel", pools: ["hostile", "faction:rebel"], text: "A rebel patrol ship identifies your transponder and opens fire mid-sentence. The Federation's bounty on your hull is apparently generous.",
    ship: { archetype: "auto", hostile: true },
    choices: [{ label: "Engage.", outcomes: [{ weight: 100, effects: { startFight: {} }, text: "The rebellion sends its regards. Return them." }] }] },
  { id: "fight_hazard_ast", pools: ["hostile"], hazard: "asteroid", text: "You drop into a rolling asteroid stream - and so does the ship that was waiting for you inside it.",
    ship: { archetype: "auto", hostile: true },
    choices: [{ label: "Fight among the rocks.", outcomes: [{ weight: 100, effects: { startFight: { hazard: "asteroid" } }, text: "Shields up. Watch the rocks. Watch them." }] }] },
  { id: "fight_hazard_sun", pools: ["hostile"], hazard: "sun", text: "The beacon orbits scorchingly close to a star - close enough that someone desperate might ambush passing ships here, betting they flee before fighting.",
    ship: { archetype: "auto", hostile: true },
    choices: [{ label: "They bet wrong.", outcomes: [{ weight: 100, effects: { startFight: { hazard: "sun" } }, text: "The star flares. So do your weapons." }] }] },
  { id: "pirate_toll", pools: ["hostile", "faction:pirate"], text: "A pirate cutter blocks the jump lane and broadcasts a toll schedule, as if extortion were a public utility. 'Fifteen percent of your scrap, travelers. Cheaper than a fight.'",
    choices: [
      { label: "Pay the toll.", outcomes: [{ weight: 100, effects: { scrapPct: -15 }, text: "The pirates wave you through with infuriating courtesy." }] },
      { label: "Refuse and fight.", outcomes: [{ weight: 100, effects: { startFight: { archetype: "pirate_fighter" } }, text: "The toll booth opens fire." }] },
      { label: "(Impressive Weaponry) Flash your guns and dare them.", blue: { weaponPowerMin: 3 }, outcomes: [
        { weight: 100, effects: { tier: "low" }, text: "Your weapon capacitors whine loud enough to hear across the void. The pirates suddenly remember an appointment elsewhere - and jettison a goodwill bribe on their way out." }] }] },
  { id: "slaver_ship", pools: ["hostile", "faction:pirate", "faction:mantis"], text: "A slaver hull looms at the beacon, pens visible through its cargo lattice. Its captain offers to sell you 'labor' with the tone of a man selling produce.",
    choices: [
      { label: "Attack the slavers.", outcomes: [{ weight: 100, effects: { startFight: { archetype: "pirate_fighter", surrenderCrew: true } }, text: "Some cargo cannot be bought. Weapons free." }] },
      { label: "Trade 40 scrap for a crew member.", requiresResource: { scrap: 40 }, outcomes: [{ weight: 100, effects: { scrap: [-40, -40], gainCrew: "random" }, text: "You buy one contract and burn it in front of its former owner. Your new crewmate watches it curl with an unreadable expression." }] },
      { label: "(Mantis Crew) Let your Mantis do the negotiating.", blue: { race: "mantis" }, outcomes: [
        { weight: 100, effects: { gainCrew: "random" }, text: "Your Mantis crewman simply stands in the viewscreen frame, cleaning a claw. The slavers release a captive as a 'gift to the honored hunter' and leave very quickly." }] }] },
  { id: "mantis_hunger", pools: ["hostile", "faction:mantis"], text: "A Mantis raider transmits a single image: your crew roster, annotated with cooking times.",
    ship: { archetype: "auto", hostile: true },
    choices: [{ label: "Disappoint them.", outcomes: [{ weight: 100, effects: { startFight: {} }, text: "The raider comes on fast and hungry." }] }] },
  { id: "rebel_scan", pools: ["hostile", "faction:rebel"], text: "A rebel picket demands you hold for inspection. Their scanner sweep is already crawling across your hull, cataloguing everything the fleet will want to know.",
    choices: [
      { label: "Hold and comply.", outcomes: [
        { weight: 60, effects: { advanceFleet: 1 }, text: "They inspect, sneer, and go - straight to the fleet with your capabilities. The pursuit tightens." },
        { weight: 40, effects: { startFight: { archetype: "rebel_fighter" } }, text: "Halfway through the scan they find the Federation registry flags. The conversation ends abruptly." }] },
      { label: "Burn the scanner with a targeting ping and run to jump.", outcomes: [
        { weight: 50, effects: {}, text: "Your ping blinds their array long enough to spool the drive. Clean getaway." },
        { weight: 50, effects: { startFight: { archetype: "rebel_fighter" } }, text: "The picket recovers faster than hoped and cuts off your jump lane." }] },
      { label: "Open fire first.", outcomes: [{ weight: 100, effects: { startFight: { archetype: "rebel_fighter" } }, text: "Inspection cancelled." }] }] },
  { id: "zoltan_customs", pools: ["hostile", "faction:zoltan"], text: "A Zoltan peacekeeper requires a cargo declaration before you may proceed. Its captain radiates the special patience of someone who has never once been argued out of a regulation.",
    choices: [
      { label: "Submit to the inspection.", outcomes: [
        { weight: 80, effects: {}, text: "The inspection is slow, thorough, and mercifully uneventful. You are waved along." },
        { weight: 20, effects: { tier: "low" }, text: "The inspectors find a clerical error in your favor - an old Zoltan tariff refund attached to your registry. They pay it out on the spot, of course. Regulations." }] },
      { label: "Refuse on principle.", outcomes: [{ weight: 100, effects: { startFight: { archetype: "zoltan_fighter" } }, text: "The peacekeeper's shield flares green. Principle, meet procedure." }] }] },
  { id: "slug_ambush", pools: ["hostile", "faction:slug", "sectorType:nebula"], hazard: "nebula", text: "The fog ahead thins to reveal a Slug ship idling with its weapons warm. Its captain compliments your cargo manifest - the one you never transmitted.",
    ship: { archetype: "slug_interceptor", hostile: true },
    choices: [{ label: "Fight.", outcomes: [{ weight: 100, effects: { startFight: { archetype: "slug_interceptor", hazard: "nebula" } }, text: "The Slug sighs theatrically and opens fire." }] }] },
  { id: "rock_zealots", pools: ["hostile", "faction:rock"], text: "A Rock warship demands you leave 'sacred ground' - apparently this entire beacon - and cites a treaty your Federation charts have never heard of.",
    choices: [
      { label: "Leave quietly. Spool the FTL.", outcomes: [{ weight: 100, effects: {}, text: "You withdraw with your dignity lightly bruised and your hull intact." }] },
      { label: "Stand your ground.", outcomes: [{ weight: 100, effects: { startFight: { archetype: "rock_assault" } }, text: "The warship's answer is scripture, delivered at missile velocity." }] }] },
  { id: "auto_fight", pools: ["hostile", "faction:auto", "faction:rebel"], text: "A rebel automated ship pivots toward you with mechanical indifference, weapons cycling up in perfect rhythm.",
    ship: { archetype: "auto_scout", hostile: true },
    choices: [{ label: "Engage the drone.", outcomes: [{ weight: 100, effects: { startFight: { archetype: "auto_scout" } }, text: "No crew, no mercy, no surrender. Simple." }] }] },
  { id: "engi_distress_fake", pools: ["hostile", "faction:engi"], text: "What broadcasts as an Engi repair tender turns out to be a pirated hull wearing a stolen transponder. Its ion mounts are very real.",
    ship: { archetype: "engi_bomber", hostile: true },
    choices: [{ label: "Engage.", outcomes: [{ weight: 100, effects: { startFight: { archetype: "engi_bomber" } }, text: "Whoever they robbed for that transponder, you will settle the account." }] }] },
  { id: "pirate_ambush_2", pools: ["hostile", "faction:pirate"], text: "Two contacts: one pirate ship closing, one pre-recorded gloat playing on loop. They have clearly done this before.",
    ship: { archetype: "auto", hostile: true },
    choices: [{ label: "Make this time different.", outcomes: [{ weight: 100, effects: { startFight: {} }, text: "The gloat track cuts off mid-laugh." }] }] },

  // ===== QUESTS (generic chains, §11.4) ====================================
  { id: "lost_exp_1", pools: ["quest"], text: "A weathered expedition buoy chirps a fragment of a survey log and coordinates deeper into the sector. The log's final line: 'Cache secured. Tell my brother.'",
    choices: [
      { label: "Follow the coordinates.", outcomes: [{ weight: 100, effects: { markQuestBeacon: "lost_exp_2" }, text: "You commit the coordinates to the nav plot. A quest marker glows on your beacon map." }] },
      { label: "Ignore it.", outcomes: [{ weight: 100, effects: {}, text: "Some stories stay unfinished." }] }] },
  { id: "lost_exp_2", pools: ["questTarget"], text: "The second buoy is scorched but legible, pointing on toward a rubble field. Something out here did not want the expedition heard from.",
    choices: [{ label: "Continue the trail.", outcomes: [{ weight: 100, effects: { markQuestBeacon: "lost_exp_3" }, text: "One more waypoint. The nav plot updates." }] }] },
  { id: "lost_exp_3", pools: ["questTarget"], text: "In the rubble you find the expedition's cache intact: sealed weapon crates under a dead man's lock, which your engineers politely defeat.",
    choices: [{ label: "Open the cache.", outcomes: [{ weight: 100, effects: { gainWeapon: "dropTable", tier: "medium" }, text: "The cache yields a serviceable weapon and enough salvage to matter. You transmit the log toward the expedition leader's brother, wherever he is." }] }] },
  { id: "defector_1", pools: ["quest", "sectorType:hostile"], text: "An encrypted whisper on a Federation code: a rebel logistics officer wants out, and will trade fleet intelligence for extraction at a rendezvous beacon.",
    choices: [
      { label: "Agree to the rendezvous.", outcomes: [{ weight: 100, effects: { markQuestBeacon: "defector_2" }, text: "The rendezvous is marked. Expect company." }] },
      { label: "Too likely a trap.", outcomes: [{ weight: 100, effects: {}, text: "The whisper never repeats." }] }] },
  { id: "defector_2", pools: ["questTarget"], text: "The defector's shuttle is right where promised - and so is the rebel escort hunting it. Their guns swing toward the shuttle first.",
    choices: [{ label: "Cover the extraction.", outcomes: [{ weight: 100, effects: { startFight: { archetype: "rebel_fighter", questReward: "defector" } }, text: "You slide between hunter and prey. The shuttle burns for your bay doors." }] }] },
  { id: "merc_contract", pools: ["quest"], text: "A mercenary broker posts an open contract: a pirate captain with too many grudges has a bounty large enough to interest honest ships. Last known heading attached.",
    choices: [
      { label: "Take the contract.", outcomes: [{ weight: 100, effects: { markQuestBeacon: "merc_target" }, text: "The target beacon is marked. The bounty waits." }] },
      { label: "You are not a bounty hunter.", outcomes: [{ weight: 100, effects: {}, text: "Someone else will collect it. Probably." }] }] },
  { id: "merc_target", pools: ["questTarget"], text: "The bounty's ship idles at the beacon exactly as the broker promised, arrogant enough not to run.",
    choices: [{ label: "Collect the bounty.", outcomes: [{ weight: 100, effects: { startFight: { archetype: "pirate_fighter", questReward: "bounty" } }, text: "The pirate captain finally learns his own market value." }] }] },
  { id: "mercenary_delay", pools: ["quest", "neutral"], text: "A freelance gunship offers a service: for 20 scrap it will fly a false-flag run behind you and tangle the rebel fleet's vanguard for a while.",
    choices: [
      { label: "Pay 20 scrap.", requiresResource: { scrap: 20 }, outcomes: [{ weight: 100, effects: { scrap: [-20, -20], delayFleet: 2 }, text: "The gunship peels away toward the red edge of your map. The fleet's advance falters for two full jumps." }] },
      { label: "Decline.", outcomes: [{ weight: 100, effects: {}, text: "The gunship shrugs off in search of other customers." }] }] },

  // ===== SHIP-UNLOCK QUEST CHAINS (§14.5) ==================================
  { id: "stronghold_1", pools: ["quest", "sectorType:hostile", "faction:rebel"], text: "Federation intelligence flags a lightly defended rebel staging post in this sector - and something larger behind it: a stronghold assembling a prototype dreadnought.",
    choices: [
      { label: "Strike the staging post.", outcomes: [{ weight: 100, effects: { markQuestBeacon: "stronghold_2" }, text: "The staging post's coordinates go on your plot. This is what the Federation pays you for. Theoretically." }] },
      { label: "You have a war to outrun.", outcomes: [{ weight: 100, effects: {}, text: "The stronghold will keep. Probably not for the better." }] }] },
  { id: "stronghold_2", pools: ["questTarget"], text: "The staging post's defense grid wakes as you arrive. Beyond it, gantry lights outline a half-built copy of the rebel flagship.",
    choices: [{ label: "Fight through.", outcomes: [{ weight: 100, effects: { startFight: { archetype: "rebel_elite", questReward: "stronghold" } }, text: "First the guard ship. Then the prototype." }] }] },
  { id: "stronghold_3", pools: ["questTarget"], text: "The prototype dreadnought detaches from its gantry, two-thirds armed and wholly hostile.",
    choices: [{ label: "Destroy the prototype.", outcomes: [{ weight: 100, effects: { startFight: { boss: "prototype", questReward: "fed_unlock" } }, text: "Kill it in the cradle." }] }] },
  { id: "zoltan_transport", pools: ["quest", "faction:zoltan", "sectorType:civilian"], text: "An unarmed Zoltan transport is being shaken down by a pirate cutter in violation of every treaty in the codex. The transport's envoy requests aid - specifically, aid without bloodshed, if you can manage it.",
    choices: [
      { label: "Destroy the pirates.", outcomes: [{ weight: 100, effects: { startFight: { archetype: "pirate_fighter" } }, text: "The envoy watches your gunnery with polite disappointment." }] },
      { label: "Interpose your ship and open negotiation.", outcomes: [
        { weight: 60, effects: { tier: "medium", questFlag: "zoltan_peace" }, text: "Facing two hulls instead of one, the pirates take a token payment from the envoy and withdraw. The envoy transmits a Zoltan honor-bond - and a quiet recommendation to the Adjudicator's shipwrights.", unlockShip: "zoltan_a" },
        { weight: 40, effects: { startFight: { archetype: "pirate_fighter" } }, text: "The pirates mistake diplomacy for weakness. Correct them." }] }] },
  { id: "legendary_raider", pools: ["quest", "faction:mantis"], text: "Every cantina in the sector tells the same story: the Legendary Thief KazaaakplethKilik, whose ship has never been boarded, is hunting these lanes. His trophy wall is famous. Your ship would look good on it, he has apparently said.",
    choices: [
      { label: "Hunt him first.", outcomes: [{ weight: 100, effects: { markQuestBeacon: "raider_fight" }, text: "You put his last sighting on the plot. Trophy walls work both ways." }] },
      { label: "Stay off the wall. Avoid him.", outcomes: [{ weight: 100, effects: {}, text: "Somewhere, a Mantis sharpens something." }] }] },
  { id: "raider_fight", pools: ["questTarget"], text: "KazaaakplethKilik's ship uncoils from the beacon shadow, hull scarred with tally marks. He opens the channel just to laugh.",
    choices: [{ label: "Board him. Take the ship intact.", outcomes: [{ weight: 100, effects: { startFight: { archetype: "mantis_fighter", questReward: "mantis_unlock", crewKillBonus: true } }, text: "His crew has never lost a boarding fight. Neither have his victims, until they did." }] }] },
  { id: "slug_home", pools: ["quest", "faction:slug", "sectorType:nebula"], text: "Deep in the fog, a Slug matriarch's barge signals surrender before any shot is fired - an old nebula gambit. Her 'tribute' is information: safe lanes, fleet movements, and an offer to broker something rarer if you spare her network.",
    choices: [
      { label: "Take the tribute and spare the network.", outcomes: [{ weight: 100, effects: { revealMap: 4, tier: "medium", questFlag: "slug_peace", unlockShip: "slug_a" }, text: "The matriarch's charts are flawless and her gratitude is practical: coordinates to a mothballed Slug cruiser, keys included." }] },
      { label: "Trust nothing in a nebula. Attack.", outcomes: [{ weight: 100, effects: { startFight: { archetype: "slug_interceptor" } }, text: "The surrender was real. The grudge now is too." }] }] },
  { id: "rock_crypt", pools: ["quest", "faction:rock"], text: "A Rock war vessel challenges you to stand watch with it over an ancestral crypt-asteroid through one 'night' - a ritual vigil against grave-robbers, held in silence.",
    choices: [
      { label: "Stand the vigil.", outcomes: [
        { weight: 70, effects: { questFlag: "rock_honor", tier: "medium", unlockShip: "rock_a" }, text: "Hours pass. Robbers come; your presence alone turns them back. At dawn-cycle the Rock captain names you crypt-kin and transmits the berth codes of an old war vessel, the Bulwark." },
        { weight: 30, effects: { startFight: { archetype: "pirate_scout" }, questFlag: "rock_honor", unlockShip: "rock_a" }, text: "Grave-robbers test the watch and you burn them back. The Rock captain says nothing for an hour, then sends you the Bulwark's berth codes without explanation." }] },
      { label: "Decline the ritual.", outcomes: [{ weight: 100, effects: {}, text: "The war vessel turns its back on you, slowly and with great ceremony." }] }] },
  { id: "engi_fleet", pools: ["quest", "faction:engi", "sectorType:civilian"], text: "An Engi flotilla pauses its convoy to study your ship. Their speaker-unit asks precisely eleven questions about your engine tuning, then falls silent, computing.",
    choices: [
      { label: "Answer honestly and share your telemetry.", outcomes: [{ weight: 100, effects: { questFlag: "engi_trust", tier: "medium", unlockShip: "stealth_a" }, text: "Consensus arrives: you are 'acceptably optimized.' The flotilla gifts you refit credit - and registry access to an experimental hull their yards keep dark: the Nesasio." }] },
      { label: "Refuse. Your tuning is proprietary.", outcomes: [{ weight: 100, effects: {}, text: "The speaker-unit emits what can only be described as a disappointed carrier tone." }] }] },
  // Crystal chain
  { id: "stasis_pod_find", pools: ["distress", "hazard:asteroid"], hazard: "asteroid", text: "Wedged in an asteroid's frozen heart your crew find a stasis pod of no catalogued design, its glyphs older than the Federation. Something inside is still alive.",
    choices: [
      { label: "Bring the pod aboard.", outcomes: [{ weight: 100, effects: { gainAugment: "stasis_pod" }, text: "The pod goes into your cargo bay, humming very faintly, like a held breath." }] },
      { label: "Leave it in the ice.", outcomes: [{ weight: 100, effects: { tier: "low" }, text: "You take the nearby salvage instead and try to forget the humming." }] }] },
  { id: "zoltan_lab", pools: ["quest", "faction:zoltan", "requiresAugment:stasis_pod"], text: "A Zoltan research facility hails you mid-scan, uncharacteristically excited: the object in your cargo bay matches glyphs from their oldest survey archives. They ask, almost humbly, to open it.",
    choices: [
      { label: "Let them open the pod.", outcomes: [{ weight: 100, effects: { removeAugment: "stasis_pod", gainCrew: "crystal", questFlag: "crystal_awake" }, text: "The pod exhales a cloud of mineral frost - and a Crystal being steps out, alive, disoriented, and very far from a home that may no longer exist. They join your crew; the researchers speak of an 'Ancient device' in the Rock Homeworlds that might open the way back." }] },
      { label: "Refuse. The pod stays sealed.", outcomes: [{ weight: 100, effects: {}, text: "The researchers accept your refusal with visible grief." }] }] },
  { id: "ancient_device", pools: ["quest", "faction:rock", "requiresQuestFlag:crystal_awake"], text: "In a crypt-hollow of the Rock Homeworlds stands the Ancient device: a ring of crystal older than the mountains around it. Your Crystal crewmate's hands are shaking.",
    choices: [
      { label: "Activate the device.", outcomes: [{ weight: 100, effects: { questFlag: "crystal_gate", revealCrystalSector: true }, text: "The ring wakes, and space folds politely aside. A hidden sector glitters beyond - the Crystal Worlds. Your crewmate says a word you do not know, twice." }] },
      { label: "Not yet.", outcomes: [{ weight: 100, effects: {}, text: "The device sleeps on. Your crewmate does not speak for a day." }] }] },
  { id: "ancestry", pools: ["questTarget", "crystalSector"], text: "The Ancestry beacon: a living city of crystal, singing at frequencies your hull turns into light. Your crewmate is welcomed home by name - a name recorded before the Federation existed.",
    choices: [{ label: "Accept their gratitude.", outcomes: [{ weight: 100, effects: { unlockShip: "crystal_a", tier: "high" }, text: "The Crystal shipwrights place the Bravais at your disposal - grown, not built, and unlike anything in Federation space." }] }] },

  // ===== STORE / FILLER =====================================================
  { id: "store_generic", pools: ["store"], text: "A fortified trade platform extends its docking clamps. Its shopkeeper's greeting is the same in every sector: 'Buying or browsing?'",
    choices: [
      { label: "Open the store.", outcomes: [{ weight: 100, effects: { openStore: true }, text: "" }] },
      { label: "Leave.", outcomes: [{ weight: 100, effects: {}, text: "Browsing, apparently." }] }] },
  { id: "revisit", pools: ["revisit"], text: "Nothing left here but drifting debris and your own old engine wake. The rebel fleet is closing in.",
    choices: [{ label: "Continue...", outcomes: [{ weight: 100, effects: {}, text: "Time to move." }] }] },
  { id: "revisit_ambush", pools: ["revisitAmbush"], text: "Your return trip is anticipated: a rebel ship is waiting at the beacon you already emptied.",
    ship: { archetype: "rebel_fighter", hostile: true },
    choices: [{ label: "Fight.", outcomes: [{ weight: 100, effects: { startFight: { archetype: "rebel_fighter" } }, text: "They studied your route. They did not study your gunnery." }] }] },

  // ===== ZERO-FUEL RESPONDERS (§9.5) =======================================
  { id: "fuel_responder_trader", pools: ["fuelWait"], text: "A passing trader answers your distress toggle and offers fuel at a stranded-ship discount - for him, not you.",
    choices: [
      { label: "Buy fuel at 2 scrap each.", outcomes: [{ weight: 100, effects: { trade: { buy: "fuel", price: 2, qty: 4 } }, text: "Fuel flows. Dignity is negotiable." }] },
      { label: "Refuse the price.", outcomes: [{ weight: 100, effects: {}, text: "The trader wishes you luck with impressive insincerity." }] }] },
  { id: "fuel_responder_donor", pools: ["fuelWait"], text: "A Federation sympathizer running dark answers your signal, transfers fuel without docking, and leaves before you can thank them.",
    choices: [{ label: "Continue...", outcomes: [{ weight: 100, effects: { fuel: [2, 3] }, text: "Somebody out here still remembers whose side they are on." }] }] },
  { id: "fuel_responder_pirate", pools: ["fuelWait"], text: "Your distress signal is answered by exactly the wrong kind of ship. The pirate captain calls your stranded hull 'a gift basket.'",
    ship: { archetype: "pirate_scout", hostile: true },
    choices: [{ label: "Fight.", outcomes: [{ weight: 100, effects: { startFight: { archetype: "pirate_scout", strandedReward: true } }, text: "Unwrap this." }] }] },
  { id: "fuel_rebel_catchup", pools: ["fuelCatch"], text: "The rebel vanguard finds you drifting. An elite fighter detaches to finish the Federation's errand ship personally.",
    ship: { archetype: "rebel_elite", hostile: true },
    choices: [{ label: "Fight for your life.", outcomes: [{ weight: 100, effects: { startFight: { archetype: "rebel_elite", strandedReward: true } }, text: "Out of fuel is not out of fight." }] }] },

  // ===== OVERTAKEN BEACON (§9.4) ===========================================
  { id: "overtaken", pools: ["overtaken"], hazard: "asb", text: "The beacon is deep inside rebel-held space now. An elite fighter vectors in immediately, and somewhere planetside an anti-ship battery clears its throat.",
    ship: { archetype: "rebel_elite", hostile: true },
    choices: [{ label: "Survive.", outcomes: [{ weight: 100, effects: { startFight: { archetype: "rebel_elite", hazard: "asb", overtaken: true } }, text: "In and out. Nothing here is worth dying for." }] }] }
];

GAME_DATA.eventById = {};
(function () { for (var i = 0; i < GAME_DATA.events.length; i++) GAME_DATA.eventById[GAME_DATA.events[i].id] = GAME_DATA.events[i]; })();

// Surrender offer text pool (§7.10)
GAME_DATA.surrenderOffers = [
  { text: "Enough! Cease fire - take our scrap and let us limp home.", reward: { tier: "medium" } },
  { text: "We yield! Our hold is yours: scrap and fuel, just stop shooting.", reward: { tier: "low", fuel: [2, 3] } },
  { text: "Hold your fire! We surrender our munitions stores - every missile aboard.", reward: { tier: "low", missiles: [2, 4] } },
  { text: "Mercy! Take the indentured crewman - a skilled hand, unharmed - and our scrap. Just let us go.", reward: { tier: "low", gainCrew: "random" }, slaverOnly: true },
  { text: "We surrender! Take the weapon from our rack - it is worth more than our lives to you.", reward: { tier: "low", gainWeapon: "dropTable" }, rare: true }
];

