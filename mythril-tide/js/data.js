// MYTHRIL TIDE - data.js : systems, weapons, augments, races, ships, regions
'use strict';

const DATA = {};

// ============ SYSTEMS ============
// powered systems consume mana bars; subs are always on
DATA.SYSTEMS = {
  wards:     { name: 'Wards',      icon: 'wards',     max: 8, sub: false, costs: [0, 0, 40, 55, 65, 80, 95, 115], desc: 'Magical ward barrier. 2 bars = 1 ward layer. Blocks shots and beams.' },
  sails:     { name: 'Sails',      icon: 'sails',     max: 6, sub: false, costs: [0, 0, 28, 40, 55, 70], desc: 'Enchanted rigging. Each bar +5% evasion. Needed to flee.' },
  weapons:   { name: 'Weapons',    icon: 'weapons',   max: 8, sub: false, costs: [0, 0, 35, 50, 60, 75, 90, 110], desc: 'Gun deck. Bars power your mounted weapons.' },
  infirmary: { name: 'Infirmary',  icon: 'infirmary', max: 3, sub: false, costs: [0, 0, 40, 70], desc: 'Heals crew inside. Higher levels heal faster.' },
  brinegate: { name: 'Portal', icon: 'brinegate', max: 3, sub: false, costs: [55, 0, 45, 70], desc: 'Merfolk portal. Teleport up to 2 crew to board the enemy ship.' },
  fogveil:   { name: 'Fog Veil',   icon: 'fogveil',   max: 3, sub: false, costs: [50, 0, 40, 65], desc: 'Cursed-fog cloak. +60% evasion for a few seconds.' },
  sump:      { name: 'Sump Pumps', icon: 'sump',      max: 3, sub: false, costs: [35, 0, 30, 50], desc: 'Bilge pump network. Each powered bar drains floodwater from every room.' },
  shrine:    { name: 'Binding Shrine', icon: 'shrine', max: 3, sub: false, costs: [60, 0, 45, 70], desc: 'Carved altar for bound spirits. Each powered bar wakes one of your familiars.' },
  helm:      { name: 'Helm',       icon: 'helm',      max: 3, sub: true,  costs: [0, 0, 30, 50], desc: 'Steering. Must be manned for any evasion. Levels add evasion.' },
  doors:     { name: 'Doors',      icon: 'doors',     max: 2, sub: true,  costs: [0, 0, 40], desc: 'Reinforced hatches slow down boarders.' },
  lookout:   { name: 'Lookout',    icon: 'lookout',   max: 2, sub: true,  costs: [0, 0, 35], desc: 'Crow\'s nest. See inside enemy ships. Lv2 sees through fog.' },
  stormhex:  { name: 'Storm Conduit', icon: 'stormhex', max: 3, sub: false, costs: [60, 0, 50, 75], desc: 'Storm-elf galvanic coil. Arc a lightning tether onto one enemy system to jam it (leaps their wards). Higher levels jam harder.' },
  sirensong: { name: "Siren's Song",  icon: 'sirensong', max: 3, sub: false, costs: [65, 0, 50, 80], desc: 'A bound siren\'s song. Charm one enemy sailor to turn on their own crew. Higher levels hold longer; merfolk resist.' },
};
DATA.SYS_POWERED = ['wards', 'sails', 'weapons', 'infirmary', 'sump', 'shrine', 'brinegate', 'fogveil', 'stormhex', 'sirensong'];
DATA.SYS_SUB = ['helm', 'doors', 'lookout'];
// FTL-style slot rules: CORE powered systems are always installed (automatic); ADVANCED systems
// are bought at anchorages and only appear once installed, capped at OPEN_MOUNTS total installed.
DATA.SYS_CORE = ['weapons', 'wards', 'sails', 'infirmary', 'sump'];
DATA.SYS_ADVANCED = ['shrine', 'brinegate', 'fogveil', 'stormhex', 'sirensong'];
DATA.OPEN_MOUNTS = 2;
// reactor bars get dearer as the crystal swells: early bars enable builds,
// the last rows are a victory lap (total to 34 = a whole run's fortune)
DATA.CORE_COST = lv => { const n = lv + 1; return n <= 14 ? 20 : n <= 20 ? 30 : n <= 26 ? 45 : n <= 30 ? 65 : 90; };
DATA.CORE_MAX = 34;
DATA.REPAIR_COST = region => 2 + Math.floor(region / 3); // 2,2,2,3,3,3,4,4
// crew station mastery, FTL-style: experience is earned by DOING the job, and each
// skill ranks at its own pace (weapons is hardest to master, boarding the quickest).
// [events to TRAINED (rank 1), events to GRAND (rank 2)]
DATA.MASTERY = {
  weapons: [14, 40], // +1 per shot fired
  helm:    [9, 24],  // +1 per projectile dodged
  sails:   [9, 24],  // +1 per projectile dodged
  wards:   [10, 28], // +1 per ward layer that soaks a hit
  repair:  [7, 20],  // +1 per system bar repaired
  combat:  [5, 14],  // +1 per boarder slain
};
DATA.SKILL_NAME = { helm: 'the helm', sails: 'the sails', weapons: 'gunnery', wards: 'the wards', repair: 'repairs', combat: 'boarding' };
// what each rank does, for the crew screen legend
DATA.SKILL_EFFECT = {
  helm: '+evasion', sails: '+evasion', weapons: '+charge speed',
  wards: '+ward regen', repair: '+repair speed', combat: '+melee dmg',
};
DATA.crewRank = function (c, key) {
  const x = (c.xp && c.xp[key]) || 0;
  const t = DATA.MASTERY[key] || [12, 36];
  return x >= t[1] ? 2 : x >= t[0] ? 1 : 0;
};

// ============ TUNING ============
// Central balance knobs for the live simulation (ship.js). Pulled out of the
// per-frame loop so they can be tuned in one place. Rates are per-second unless
// noted; thresholds are 0..1 water fractions. Changing a value here changes only
// that knob and nothing else. (Weapon/aug numbers live in WEAPONS/AUGS above;
// crew station-mastery bonuses are applied in ship.js and revisited in Phase 4.)
const TUNING = {
  // --- fire (FTL-style per-tile) ---
  fireSpreadChance: 0.28,  // chance/sec a burning TILE ignites a given neighbour tile (FTL-ish, gentle pace)
  fireToSystem:     0.10,  // system-damage progress/sec PER burning tile in the room
  hullSinge:        0.02,  // hull-damage progress/sec PER burning tile
  newFireHp:        60,    // hp a freshly-lit fire TILE starts (and burns down from)
  fireFightRate:    20,    // fire hp/sec a crew member douses (one sailor can't solo a multi-tile blaze -> a thin crew gets overwhelmed; the enemy AI now actively firefights so fire-kills stay rare)
  fireEngulfedSpread: 0.35, // a room >65% ablaze punches heat through SHUT doors at this fraction of the open-door rate
  fireDouseWater:   0.4,   // room water fraction above which fires drown (our oxygen<10% analog)
  fireBurnoutBase:  13,    // hp/sec an ISOLATED fire tile self-extinguishes (FTL burnout)
  fireNeighbourBonus: 0.85,// each adjacent lit tile slows that tile's burnout (clusters self-feed)
  fireDoorClosedMul: 0.22, // closed-door cross-room spread factor (upgraded Doors slow it further)
  // --- water / flooding ---
  scupperFillRate:  0.35,  // water/sec pouring through an open sea door
  leakRate:         0.07,  // water/sec forced in through an un-patched breach
  pumpBaseDrain:    0.03,  // water/sec natural bailing
  pumpPerBarDrain:  0.05,  // extra water/sec drained per powered Sump bar
  seaFillRate:      0.35,  // water/sec sea-pressure fills a flooded deck
  doorSloshRate:    0.45,  // water/sec equalised sideways through an open door
  deepWaterSys:     0.55,  // water above this damages the room's system
  waterToSystem:    0.05,  // system-damage progress/sec from deep water
  // --- wards ---
  wardRechargeSecs: 3.5,   // seconds to regrow one ward layer
  // --- weapons tempo ---
  weaponTempo:      1.12,  // global charge-rate multiplier (fights resolve faster)
  enrageTempoMul:   1.5,   // charge-rate multiplier while enraged (boss)
  weaponDecayRate:  1.5,   // charge lost/sec when a gun is off / unpowered
  // --- crew ---
  crewMoveSpeed:    30,    // base px/sec crew walk (x race.spd)
  waterMoveMul:     0.6,   // default move multiplier in flooded rooms
  doorSlowPerLv:    0.35,  // boarder slowdown per enemy Doors level
  meleeDps:         7,     // base boarding melee damage/sec (x race.dmg)
  sabotageRate:     0.13,  // system-sabotage progress/sec (x race.dmg)
  repairRate:       0.20,  // system-repair progress/sec (x race.rep)
  patchRate:        0.22,  // breach-patch progress/sec (x race.leakFix)
  poisonDps:        3,     // crew hp/sec lost while poisoned
  crewFireDps:      5,     // crew hp/sec lost standing in fire
  crewWaterDps:     5,     // crew hp/sec lost in deep water
  crewDrawH:        24,    // HD-2D pose render height in LOGICAL px (P1 modest size; P3 raises it)
  crewDrownWater:   0.6,   // water above this drowns non-aquatic crew
  // --- infirmary ---
  infHealBase:      3,     // crew hp/sec healed in a staffed infirmary
  infHealPerBar:    3,     // extra crew hp/sec healed per powered bar
  reefSingerSecs:   15,    // seconds per +1 hull from the reef-singers familiar
  // --- crew station mastery, by rank [manned, trained, grand] (FTL-grounded) ---
  masteryWeaponMul: [1.10, 1.15, 1.20], // weapon charge-rate x when a gunner mans Weapons
  masteryWardMul:   [1.10, 1.20, 1.30], // ward recharge x when a warden mans Wards
  masteryEvasion:   [0, 2, 5],          // +% evasion added at Helm / Sails by mastery
  masteryRepairMul: [1.0, 1.10, 1.20],  // repair + fire-fight speed x by repair rank
  masteryMeleeMul:  [1.0, 1.15, 1.30],  // boarding melee damage x by combat rank
  maxEvasion:       90,    // % cap so no ship (even under fog veil) becomes untouchable
  // --- advanced systems: Storm Conduit (jam) + Siren's Song (charm), indexed by powered bars [0..3] ---
  hexJamSecs:       [0, 5, 8, 11],       // enemy-system jam (ion) duration by Storm Conduit bars
  hexCdSecs:        [0, 20, 17, 14],     // Storm Conduit cooldown by bars
  songCharmSecs:    [0, 14, 20, 28],     // charm duration by Siren's Song bars (FTL mind-control 14/20/28)
  songCdSecs:       [0, 26, 22, 18],     // Siren's Song cooldown by bars
  songBuffMul:      [1, 1.15, 1.30, 1.50], // charmed sailor HP + melee buff by bars (FTL-style)
  // familiars (our drones): orbiting (offensive) familiars are exposed to enemy fire.
  famHp:            3,    // clips it takes before an orbiting familiar is shot down
  famRedeploySecs:  12,   // re-bind delay at the shrine after a familiar is destroyed
  famHitChance:     0.14, // chance an incoming enemy shot clips an orbiting familiar (it body-blocks)
  // djinn fire (emberThrough flag): wards still soak the HULL damage, but the heat bleeds
  // through — ignite chance is multiplied by this per ward layer that soaked the strike, so a
  // heavily-warded ship resists fire but is never immune (the answer to an all-fire faction).
  emberThroughFalloff: 0.6,
};

// ============ WEAPONS ============
// family: cannon|magic|bomb|beam|horn ; type: shot|missile|bomb|beam
// missile/bomb consume 1 runeshot and bypass wards; bombs can't be dodged
// special flags: ramp {step,floor} = consecutive shots charge faster;
// charger N = banks up to N shots; scatter = may spill to adjacent rooms;
// selfCast = targets YOUR ship; sealDoors = coral-locks the room's doors;
// nullMana = strips all mana from the struck system; poison = crew DOT secs;
// blind = enemy evasion -15% for N secs; healCrew = heals your room's crew;
// lure = pulls N enemy crew off their stations; beams: rooms = sweep length,
// each enemy ward layer SOAKS 1 dmg per room instead of blocking the beam
DATA.WEAPONS = {
  // ---- IRON & POWDER (human): free ammo, volume fire strips ward layers ----
  lightcannon:  { name: 'Light Cannon', race: 'human', family: 'cannon', tint: COL.grey, type: 'shot', power: 1, charge: 9, dmg: 1, shots: 1, cost: 38, rarity: 1, desc: 'A four-pounder and a prayer. 1 dmg.' },
  chainshot:    { name: 'Chainshot', race: 'human', family: 'cannon', tint: COL.ltblue, type: 'shot', power: 1, charge: 9, dmg: 1, shots: 1, vsSails: 2, cost: 38, rarity: 1, desc: '1 dmg, double vs sails. Privateer\'s courtesy.' },
  swivels:      { name: 'Swivel Guns', race: 'human', family: 'cannon', tint: COL.gold, type: 'shot', power: 2, charge: 10, dmg: 1, shots: 2, cost: 50, rarity: 2, desc: 'Rail-mounted spite. Two quick 1-dmg shots.' },
  heavycannon:  { name: 'Heavy Cannon', race: 'human', family: 'cannon', tint: COL.dkred, type: 'shot', power: 2, charge: 13, dmg: 2, shots: 1, leak: 0.3, munScale: 2, cost: 60, rarity: 2, desc: '2 dmg, 30% to breach the hull.' },
  carronade:    { name: 'Carronade', race: 'human', family: 'cannon', tint: COL.orange, type: 'shot', power: 2, charge: 14, dmg: 3, shots: 1, cost: 72, rarity: 3, desc: 'The Smasher. 3 dmg at kissing distance.' },
  grapeshot:    { name: 'Grapeshot Battery', short: 'GRAPE', race: 'human', family: 'cannon', tint: COL.grey, type: 'shot', power: 2, charge: 10, dmg: 1, shots: 3, cost: 65, rarity: 2, desc: 'A fistful of iron. Three quick balls - wards hate arithmetic.' },
  broadside:    { name: 'Broadside Rack', short: 'BRDSIDE', race: 'human', family: 'cannon', tint: COL.gold, type: 'shot', power: 3, charge: 18, dmg: 1, shots: 5, cost: 95, rarity: 3, desc: 'The whole gundeck answers at once. Five balls.' },
  chainculverin:{ name: 'Chain Culverin', short: 'CULVERIN', race: 'human', family: 'cannon', tint: COL.golddk, type: 'shot', power: 2, charge: 11, dmg: 1, shots: 1, ramp: { step: 1.5, floor: 5 }, cost: 70, rarity: 3, desc: 'The gun that learns the rhythm: each shot reloads faster.' },
  langrage:     { name: 'Langrage Sweep', short: 'LANGRAGE', race: 'human', family: 'cannon', tint: COL.grey, type: 'shot', power: 2, charge: 11, dmg: 1, shots: 3, scatter: 1, cost: 48, rarity: 1, desc: 'A bag of nails and broken cutlery. 3 balls, scatter nearby.' },
  runebombard:  { name: 'Rune Bombard', race: 'dwarf', family: 'cannon', tint: COL.golddk, type: 'shot', power: 3, charge: 18, dmg: 3, shots: 1, pierce: 1, cost: 90, rarity: 3, desc: 'Runed shell. 3 dmg, pierces 1 ward.' },
  // ---- RUNESHOT ORDNANCE (dwarf-forged): 1 runeshot per pull, bypasses wards ----
  cogtorpedo:   { name: 'Cog Torpedo', short: 'COG', race: 'dwarf', family: 'bomb', tint: COL.golddk, type: 'missile', power: 1, charge: 10, dmg: 1, shots: 1, leak: 0.1, cost: 45, rarity: 1, desc: 'Clockwork mackerel with a grudge. 1 dmg, swims under wards. Uses 1 runeshot.' },
  seekertorpedo:{ name: 'Seeker Torpedo', race: 'dwarf', family: 'bomb', tint: COL.dkred, type: 'missile', power: 1, charge: 16, dmg: 2, shots: 1, fire: 0.2, cost: 65, rarity: 2, desc: 'It heard your keel. 2 dmg, swims under wards. Uses 1 runeshot.' },
  forgetwins:   { name: 'Forge-Twins', short: 'TWINS', race: 'dwarf', family: 'bomb', tint: COL.orange, type: 'missile', power: 2, charge: 17, dmg: 1, shots: 2, cost: 78, rarity: 3, desc: 'Two fish on ONE runeshot. Dwarves distrust single points of failure.' },
  infernobomb:  { name: 'Inferno Bomb', race: 'djinn', family: 'bomb', tint: COL.fire1, type: 'bomb', power: 1, charge: 14, dmg: 1, shots: 1, fire: 0.9, cost: 55, rarity: 2, desc: 'A djinn\'s breath in a rune-shell. Conjured inside, burns. 1 runeshot.' },
  maelstrom:    { name: 'Maelstrom Bomb', race: 'merfolk', family: 'bomb', tint: COL.cyan, type: 'bomb', power: 1, charge: 15, dmg: 1, shots: 1, flood: 1, cost: 60, rarity: 2, desc: 'A wave folded small, remembering its size indoors. Floods the room. 1 runeshot.' },
  petardrune:   { name: 'Petard Rune', short: 'PETARD', race: 'dwarf', family: 'bomb', tint: COL.gold, type: 'bomb', power: 1, charge: 13, dmg: 1, shots: 1, leak: 1, cost: 58, rarity: 2, desc: 'The rune of passage, miscarved on purpose. 1 dmg + guaranteed breach. 1 runeshot.' },
  nullrune:     { name: 'Null Rune', short: 'NULL', race: 'dwarf', family: 'bomb', tint: COL.ltblue, type: 'bomb', power: 1, charge: 13, dmg: 0, shots: 1, nullMana: 1, ion: 2, cost: 70, rarity: 3, desc: 'Argues a system out of believing in magic. Drains ALL its mana. 1 runeshot.' },
  barnaclebomb: { name: 'Barnacle Bomb', short: 'BARNACLE', race: 'merfolk', family: 'bomb', tint: COL.water, type: 'bomb', power: 1, charge: 12, dmg: 0, shots: 1, sealDoors: 10, cost: 62, rarity: 2, desc: 'Reef-seed. The doors grow shut; what\'s inside stays inside. 1 runeshot.' },
  slumberveil:  { name: 'Slumber Veil', short: 'SLUMBER', race: 'siren', family: 'bomb', tint: COL.pink, type: 'bomb', power: 1, charge: 11, dmg: 0, shots: 1, stunRoom: 6, cost: 48, rarity: 2, desc: 'A lullaby in a shell. Stuns the room\'s crew 6s. 1 runeshot.' },
  mendingtide:  { name: 'Mending Tide', short: 'MENDING', race: 'siren', family: 'bomb', tint: COL.green, type: 'bomb', power: 1, charge: 12, dmg: 0, shots: 1, selfCast: 1, healCrew: 60, cost: 45, rarity: 2, desc: 'Sing the body back the way the sea remembers it. Heals YOUR room\'s crew. 1 runeshot.' },
  // ---- LANCES (djinn + siren): FTL beams — fixed LENGTH (tiles), never miss, dmg PER ROOM the
  //      sweep clips (aim to clip the most rooms), each ward layer soaks 1; fire/crew are per-tile ----
  emberlens:    { name: 'Ember Lens', short: 'EMBER', race: 'djinn', family: 'beam', tint: COL.fire2, type: 'beam', power: 1, charge: 11, dmg: 1, length: 4, rooms: 2, muzzle: [19, 5], cost: 50, rarity: 2, desc: 'A pocket sun behind a brass shutter. 1 dmg/room across a short sweep, one mana bar.' },
  noonglass:    { name: 'Noon Glass', short: 'NOON', race: 'djinn', family: 'beam', tint: COL.gold, type: 'beam', power: 3, charge: 15, dmg: 2, length: 4, rooms: 2, muzzle: [19, 5], cost: 80, rarity: 2, desc: 'A mirror that remembers the desert at midday. 2 dmg/room.' },
  phoenixbeam:  { name: 'Phoenix Ray', race: 'djinn', family: 'beam', tint: COL.fire2, type: 'beam', power: 4, charge: 22, dmg: 3, length: 6, rooms: 3, fire: 0.3, emberThrough: 1, muzzle: [12, 2], cost: 120, rarity: 3, desc: 'The firebird\'s gaze. 3 dmg/room across a long sweep; its heat bleeds through wards.' },
  wildfirebeam: { name: 'Wildfire Beam', short: 'WILDFIRE', race: 'djinn', family: 'beam', tint: COL.fire1, type: 'beam', power: 2, charge: 17, dmg: 1, length: 6, rooms: 3, fire: 0.6, emberThrough: 1, muzzle: [21, 6], cost: 75, rarity: 2, desc: 'It doesn\'t cut deep. It plants. 1 dmg/room + fire per tile across a long sweep, even through wards.' },
  dirgebeam:    { name: 'Dirge Beam', race: 'siren', family: 'beam', tint: COL.pink, type: 'beam', power: 2, charge: 16, dmg: 0, length: 5, rooms: 2, crewDmg: 45, muzzle: [19, 5], cost: 68, rarity: 2, desc: 'A funeral sung in a straight line. Savages crew per tile, spares the hull.' },
  // ---- STORMCALL (storm elf): no hull damage, locks mana out of systems ----
  sparkbolt:    { name: 'Spark Bolt', race: 'stormelf', family: 'magic', tint: COL.cyan, type: 'shot', power: 1, charge: 8, dmg: 0, shots: 1, ion: 1, cost: 42, rarity: 1, desc: 'Lightning, bottled rude. Drains 1 mana from a system.' },
  stormlash:    { name: 'Stormlash', short: 'LASH', race: 'stormelf', family: 'magic', tint: COL.white, type: 'shot', power: 2, charge: 13, dmg: 0, shots: 1, ion: 2, stun: 0.2, stunSecs: 4, cost: 64, rarity: 2, desc: 'A whip of weather. 2 mana drained, 20% stuns the room for 4s.' },
  tempestchain: { name: 'Tempest Chain', race: 'stormelf', family: 'magic', tint: COL.ltblue, type: 'shot', power: 2, charge: 11, dmg: 0, shots: 1, ion: 1, ramp: { step: 1, floor: 6 }, cost: 72, rarity: 2, desc: 'The storm finds your ship\'s rhythm and keeps time. A galvanic charge that quickens.' },
  thunderhead:  { name: 'Thunderhead', short: 'THUNDER', race: 'stormelf', family: 'magic', tint: COL.cyan, type: 'shot', power: 2, charge: 6, dmg: 0, shots: 1, ion: 1, charger: 3, cost: 85, rarity: 3, desc: 'Elves waiting politely. Banks up to 3 bolts, looses them together.' },
  galeshear:    { name: 'Gale Shear', race: 'stormelf', family: 'magic', tint: COL.white, type: 'shot', power: 1, charge: 12, dmg: 1, shots: 1, vsSails: 3, cost: 50, rarity: 2, desc: 'Wind turned sideways. 1 dmg, triple vs sails. The becalmer.' },
  // ---- TIDE & FANG (merfolk + lizard): pierce a ward layer; damage that keeps working ----
  tidelance:    { name: 'Tide Lance', race: 'merfolk', family: 'magic', tint: COL.water, type: 'shot', power: 1, charge: 10, dmg: 1, shots: 1, pierce: 1, leak: 0.3, cost: 44, rarity: 1, desc: 'Seawater under reef-pressure. 1 dmg, slips through 1 ward layer.' },
  augershot:    { name: 'Augershot', short: 'AUGER', race: 'merfolk', family: 'magic', tint: COL.water, type: 'shot', power: 2, charge: 14, dmg: 2, shots: 1, pierce: 1, leak: 0.5, cost: 70, rarity: 2, desc: 'A drill-conch fired flat. 2 dmg, 50% breach - the ocean is the ammunition.' },
  inkjet:       { name: 'Kraken Inkjet', race: 'merfolk', family: 'magic', tint: COL.dkpurple, type: 'shot', power: 1, charge: 12, dmg: 1, shots: 1, blind: 8, cost: 50, rarity: 2, desc: 'Kraken-ink. 1 dmg; on a hull hit (wards stop it) it blinds the helm — evasion -15% for 8s.' },
  brinevolley:  { name: 'Brine Volley', short: 'BRINE', race: 'merfolk', family: 'magic', tint: COL.water, type: 'shot', power: 2, charge: 13, dmg: 1, shots: 3, leak: 0.2, cost: 68, rarity: 2, desc: 'Three waves in close order. The Shallows\' polite knock.' },
  venomdart:    { name: 'Venom Dart', race: 'lizard', family: 'magic', tint: COL.lime, type: 'shot', power: 1, charge: 11, dmg: 1, shots: 1, crewDmg: 10, poison: 10, cost: 46, rarity: 1, desc: '1 dmg; poisons the crew once it lands through the wards. The wound is small; the week is terrible.' },
  quillstorm:   { name: 'Quill Storm', short: 'QUILLS', race: 'lizard', family: 'magic', tint: COL.lime, type: 'shot', power: 1, charge: 13, dmg: 0, shots: 3, crewDmg: 8, poison: 8, cost: 60, rarity: 2, desc: 'An alchemist\'s quiver, exhaled. Strip the wards, then it poisons the crew — never scratches the prize.' },
  // ---- SONGS (siren): skip the hull entirely, strike the minds inside ----
  wailhorn:     { name: 'Wail Horn', race: 'siren', family: 'horn', tint: COL.pink, type: 'bomb', power: 1, charge: 13, dmg: 0, shots: 1, stunRoom: 4, noRune: true, cost: 55, rarity: 2, desc: 'Grief at naval range. Stuns a room\'s crew 4s. Ignores wards.' },
  sirenlure:    { name: 'Siren Lure', short: 'LURE', race: 'siren', family: 'horn', tint: COL.pink, type: 'bomb', power: 2, charge: 16, dmg: 0, shots: 1, lure: 2, noRune: true, cost: 70, rarity: 3, desc: 'Every sailor hears a different name. Pulls 2 crew off their stations.' },
  // ---- djinn fire shots (kept: the fireship's small arms) ----
  flamelance:   { name: 'Flame Lance', race: 'djinn', family: 'magic', tint: COL.fire2, type: 'shot', power: 1, charge: 9, dmg: 1, shots: 1, fire: 0.6, emberThrough: 1, cost: 45, rarity: 1, desc: '1 dmg, 60% to start a fire. The heat bleeds through wards.' },
  cindervolley: { name: 'Cinder Volley', short: 'CINDER', race: 'djinn', family: 'magic', tint: COL.fire2, type: 'shot', power: 2, charge: 12, dmg: 1, shots: 2, fire: 0.3, emberThrough: 1, cost: 70, rarity: 2, desc: 'Two embers, 30% to ignite each. The heat bleeds through wards.' },
  // playtest cheat weapon: one shot, one kill
  depleteduranium: { name: 'EM Rail Gun', short: 'RAIL GUN', cheat: true, race: 'human', family: 'cannon', tint: COL.lime, type: 'bomb', noRune: true, power: 1, charge: 6, dmg: 99, shots: 1, cost: 999, rarity: 3, desc: 'PLAYTEST: anachronistic, unsporting, and final. Destroys any ship in one hit. Ignores wards, cannot miss.' },
  // hidden pseudo-weapons fired by familiars (never sold, never looted)
  famspark: { name: 'Fire-Spark', hidden: true, race: 'djinn', family: 'magic', tint: COL.fire2, type: 'shot', power: 0, charge: 1, dmg: 1, shots: 1, fire: 0.3, cost: 0, rarity: 3, desc: '' },
  famshot:  { name: 'Gull Shot', hidden: true, race: 'dwarf', family: 'cannon', tint: COL.grey, type: 'shot', power: 0, charge: 1, dmg: 1, shots: 1, cost: 0, rarity: 3, desc: '' },
};
// Stamp each weapon with its own id as `.key`. The render code keys per-munition branches on
// `wd.key` (PSPR sprite map, chainshot bola, seeker weave, flamelance fire2) — without this the
// field was undefined and every such branch was dead, so munitions fell back to the generic ball/
// fire sprite. (The EM Rail Gun keys off pr.wkey for belt-and-braces.)
for (const k in DATA.WEAPONS) DATA.WEAPONS[k].key = k;

// ============ AUGMENTS ============
DATA.AUGS = {
  // ---- legendary, run-defining finds (rare in shops from region 4 on) ----
  emberheart:      { name: 'Emberheart Core', cost: 140, legendary: true, desc: 'LEGENDARY: begin every battle with all weapons fully charged.' },
  sirens_crown:    { name: "Siren's Crown", cost: 130, legendary: true, desc: 'LEGENDARY: at the start of battle, charm an enemy sailor to fight for you a while.' },
  ghost_figurehead:{ name: 'Ghost Figurehead', cost: 120, legendary: true, desc: 'LEGENDARY: your first volley each battle cannot be evaded or warded.' },
  leviathan_pact:  { name: 'Leviathan Pact', cost: 90, legendary: true, desc: 'LEGENDARY: storms, krakens, and whirlpools strike only your enemy.' },
  stormcaller_mast:{ name: 'Stormcaller Mast', cost: 100, legendary: true, desc: 'LEGENDARY: the mast draws lightning down from your conjured fog — raising the Fog Veil also arcs across enemy guns, draining half their charge.' },
  tidal_heart:     { name: 'Tidal Heart', cost: 110, legendary: true, desc: 'LEGENDARY: Portal recovers twice as fast and boarders mend aboard enemy ships.' },
  mythril_plating: { name: 'Mythril Plating', cost: 70, desc: 'Hull reinforced with mythril. Max hull +5.' },
  windrider:       { name: 'Windrider Figurehead', cost: 55, desc: 'Blessed by storm elves. +5% evasion.' },
  dwarven_pumps:   { name: 'Dwarven Pumps', cost: 45, desc: 'Water drains 2.5x faster, leaks patch quicker.' },
  phoenix_ash:     { name: 'Phoenix Ash', cost: 80, desc: 'Once per battle, a dying crew member revives in the infirmary.' },
  siren_lure:      { name: 'Siren Lure', cost: 50, desc: 'Enemy boarders fight 25% weaker aboard your ship.' },
  golden_compass:  { name: 'Golden Compass', cost: 45, desc: 'Reveals what awaits at each island on the chart.' },
  tidecaller_pearl:{ name: 'Tidecaller Pearl', cost: 65, desc: 'Begin every battle with wards fully charged.' },
  runeforge:       { name: 'Runeforge', cost: 60, desc: '25% chance to not consume runeshot when firing.' },
  selkie_cloak:    { name: 'Selkie Cloak', cost: 40, desc: 'Your crew can breathe in flooded rooms.' },
  merchant_seal:   { name: 'Merchant\'s Seal', cost: 50, desc: 'Shopkeepers charge 15% less.' },
};

// ============ RACES ============
DATA.RACES = {
  human:    { name: 'Human', hp: 100, dmg: 1.0, rep: 1.0, spd: 1.0, cost: 40, desc: 'Steady hands. No magic, no weaknesses.' },
  merfolk:  { name: 'Merfolk', hp: 90, dmg: 1.0, rep: 1.0, spd: 1.0, cost: 50, waterImmune: true, waterSpd: 1.6, leakFix: 3, desc: 'Breathes water, swims fast, patches leaks 3x faster.' },
  djinn:    { name: 'Fire Djinn', hp: 85, dmg: 1.2, rep: 1.0, spd: 1.0, cost: 55, fireImmune: true, igniter: 0.15, desc: 'Fireproof. Strong fighter, may ignite rooms in melee.' },
  stormelf: { name: 'Storm Elf', hp: 70, dmg: 0.8, rep: 1.1, spd: 1.5, cost: 50, sailsBonus: 5, wepBonus: 0.15, desc: 'Fast. +5% evasion at sails, +15% weapon charge at guns.' },
  dwarf:    { name: 'Deep Dwarf', hp: 130, dmg: 1.0, rep: 1.8, spd: 0.75, cost: 55, fireFight: 2, desc: 'Tough and slow. Repairs nearly twice as fast.' },
  lizard:   { name: 'Lizardfolk', hp: 120, dmg: 1.5, rep: 0.8, spd: 1.0, cost: 60, regen: 1, desc: 'Savage fighter. Slowly regenerates health.' },
  siren:    { name: 'Siren', hp: 80, dmg: 0.7, rep: 1.0, spd: 1.0, cost: 55, song: 0.35, healAura: 0.8, desc: 'Her song weakens foes in her room and mends allies.' },
};
DATA.NAMES = {
  human: ['Reyes', 'Marlow', 'Ines', 'Drake', 'Costa', 'Bran', 'Sancha', 'Teodor', 'Wren', 'Galen'],
  merfolk: ['Nerissa', 'Coral', 'Maren', 'Pelagio', 'Sirsha', 'Thalo', 'Una', 'Delmar'],
  djinn: ['Azhar', 'Soraya', 'Kindle', 'Rashan', 'Embra', 'Fahim', 'Cinda'],
  stormelf: ['Zephrine', 'Gale', 'Aelwyn', 'Stratus', 'Virelle', 'Boreas', 'Nimbe'],
  dwarf: ['Brunna', 'Korag', 'Smelt', 'Durra', 'Hagan', 'Pyrite', 'Vorga'],
  lizard: ['Ssasha', 'Krezz', 'Vissk', 'Old Scale', 'Ghaz', 'Ixxi', 'Rax'],
  siren: ['Lorelei', 'Calypsa', 'Echo', 'Maribel', 'Ondine', 'Seline'],
};
DATA.SHIPNAMES = ['Sea Wasp', 'Gull', 'Tradewind', 'Red Eel', 'Saltpeter', 'Vagrant', 'Mako', 'Petrel', 'Black Brig', 'Lampfish', 'Cutlass', 'Warden', 'Old Squall'];

// ============ SHIP LAYOUTS ============
// rooms: [sysKey|null, x, y, w, h] in tiles (16px); doors: pairs of room indices
DATA.TILE = 16;
DATA.LAYOUTS = {
  dawnchaser: { name: 'The Dawnchaser', masts: 3, big: true, rooms: [['helm',0,0,2,1], ['infirmary',2,0,2,1], ['sails',4,0,3,1], ['lookout',7,0,2,1], ['doors',9,0,2,1], [null,1,1,9,1], ['wards',1,2,3,1], ['core',4,2,2,1], ['weapons',6,2,3,1], ['mount',9,2,2,1]], doors: [[0,1], [0,5], [1,2], [1,5], [2,3], [2,5], [3,4], [3,5], [4,5], [5,6], [5,7], [5,8], [5,9], [6,7], [7,8], [8,9]] },
  sloop: { name: 'Sloop', masts: 1, big: false, rooms: [['helm',0,0,2,1], ['sails',2,0,3,1], ['core',5,0,2,2], ['weapons',7,0,2,1], [null,0,1,2,1], [null,2,1,3,1], ['lookout',7,1,2,1], ['wards',9,1,2,1]], doors: [[0,1], [0,4], [1,2], [1,5], [2,3], [2,5], [2,6], [3,6], [4,5], [6,7]] },
  corvette: { name: 'Corvette', masts: 2, big: false, rooms: [['helm',0,0,2,1], ['sails',2,0,3,1], ['infirmary',6,0,2,1], ['lookout',9,0,2,1], [null,1,1,9,1], ['core',1,2,3,1], ['weapons',4,2,3,1], ['wards',7,2,2,1]], doors: [[0,1], [0,4], [1,4], [2,4], [3,4], [4,5], [4,6], [4,7], [5,6], [6,7]] },
  galleon: { name: 'Galleon', masts: 2, big: false, rooms: [['helm',0,0,2,1], ['sails',2,0,2,1], ['lookout',4,0,2,1], ['infirmary',6,0,3,1], [null,1,1,7,1], ['mount',8,1,1,2], ['core',1,2,2,1], ['weapons',3,2,3,1], ['wards',6,2,2,1]], doors: [[0,1], [0,4], [1,2], [1,4], [2,3], [2,4], [3,4], [3,5], [4,5], [4,6], [4,7], [4,8], [5,8], [6,7], [7,8]] },
  dreadnought: { name: 'Dreadnought', masts: 3, big: true, rooms: [['helm',0,0,2,1], ['sails',2,0,2,1], ['lookout',4,0,2,1], ['infirmary',6,0,2,1], ['wards',0,1,2,1], ['core',2,1,2,1], ['weapons',4,1,2,1], ['mount',6,1,2,1]], doors: [[0,1], [0,4], [1,2], [1,5], [2,3], [2,6], [3,7], [4,5], [5,6], [6,7]] },
  brig: { name: 'Raider Brig', masts: 2, big: false, rooms: [['helm',0,0,2,1], ['sails',2,0,3,1], ['core',5,0,2,2], ['weapons',7,0,4,1], [null,0,1,2,1], [null,2,1,3,1], ['wards',7,1,2,1], [null,9,1,2,1]], doors: [[0,1], [0,4], [1,2], [1,5], [2,3], [2,5], [2,6], [3,6], [3,7], [4,5], [6,7]] },
  manofwar: { name: 'Pursuit Man-of-War', masts: 3, big: true, rooms: [['helm',0,0,2,1], ['sails',2,0,3,1], ['lookout',5,0,2,1], ['infirmary',7,0,2,1], ['wards',9,0,2,1], [null,1,1,9,1], ['core',1,2,3,1], ['weapons',4,2,3,1], ['mount',7,2,2,1], ['mount',9,2,2,1]], doors: [[0,1], [0,5], [1,2], [1,5], [2,3], [2,5], [3,4], [3,5], [4,5], [5,6], [5,7], [5,8], [5,9], [6,7], [7,8], [8,9]] },
  drowner: { name: 'Reef Drowner', masts: 2, big: false, rooms: [['helm',0,0,2,1], ['sails',2,0,2,1], ['weapons',4,0,2,1], ['lookout',6,0,2,1], ['wards',0,1,2,1], ['core',2,1,2,1], ['mount',4,1,2,1], ['mount',6,1,2,1]], doors: [[0,1], [0,4], [1,2], [1,5], [2,3], [2,6], [3,7], [4,5], [5,6], [6,7]] },
  canoe: { name: 'Fang War-Canoe', masts: 1, big: false, rooms: [['helm',0,0,2,1], [null,2,0,4,2], ['sails',6,0,2,1], ['core',8,0,2,1], ['weapons',10,0,2,1], ['mount',0,1,2,1], ['mount',6,1,2,1], ['wards',8,1,4,1]], doors: [[0,1], [0,5], [1,2], [1,5], [1,6], [2,3], [2,6], [3,4], [3,7], [4,7], [6,7]] },
  fireship: { name: 'Brazier Fireship', masts: 2, big: false, rooms: [['helm',0,0,2,1], ['sails',2,0,2,1], ['wards',5,0,2,1], [null,0,1,2,1], ['core',2,1,2,2], ['mount',4,1,1,2], ['weapons',5,1,2,1], [null,0,2,2,1], [null,5,2,2,1]], doors: [[0,1], [0,3], [1,4], [2,6], [3,4], [3,7], [4,5], [4,7], [5,6], [5,8], [6,8]] },
  cutter: { name: 'Galvanic Cutter', masts: 2, big: false, rooms: [['helm',0,0,2,1], ['sails',2,0,3,1], ['weapons',5,0,3,1], ['mount',0,1,2,1], ['core',2,1,2,1], ['wards',4,1,2,1], ['mount',6,1,2,1]], doors: [[0,1], [0,3], [1,2], [1,4], [1,5], [2,5], [2,6], [3,4], [4,5], [5,6]] },
  divingbell: { name: 'Iron Diving-Bell', masts: 1, big: false, rooms: [['helm',0,0,2,1], ['sails',2,0,2,1], ['core',4,0,2,1], ['weapons',6,0,2,1], ['lookout',8,0,2,1], ['mount',0,1,2,1], [null,2,1,3,1], ['wards',5,1,2,1], [null,7,1,3,1]], doors: [[0,1], [0,5], [1,2], [1,6], [2,3], [2,6], [2,7], [3,4], [3,7], [3,8], [4,8], [5,6], [6,7], [7,8]] },
  wreck: { name: 'Singing Wreck', masts: 2, big: false, rooms: [['sails',2,0,2,1], ['mount',4,0,2,1], ['helm',0,1,2,1], ['core',2,1,2,2], ['weapons',4,1,2,1], ['wards',0,2,2,1], ['mount',4,2,2,1]], doors: [[0,1], [0,3], [1,4], [2,3], [2,5], [3,4], [3,5], [3,6], [4,6]] },
  phantom: { name: 'Phantom Wreck', masts: 2, big: false, rooms: [['helm',0,0,2,1], ['weapons',2,0,2,1], ['wards',4,0,2,1], ['sails',6,0,2,1], [null,8,0,1,2], ['core',0,1,2,1], [null,2,1,2,1], [null,6,1,2,1]], doors: [[0,1], [0,5], [1,2], [1,6], [2,3], [3,4], [3,7], [4,7], [5,6]] },
};

// player starting ship
DATA.PLAYER_START = {
  layout: 'dawnchaser', style: 'human', hull: 30,
  sysLv: { helm: 1, infirmary: 1, sails: 2, lookout: 1, doors: 1, weapons: 3, wards: 2, brinegate: 0, fogveil: 0, sump: 1 },
  manaMax: 8,
  weapons: ['lightcannon', 'lightcannon'], // uranium only via the cheat checkbox at new game
  mounts: 4,
  crew: ['human', 'human', 'human'],
};

// ============ ENEMY GENERATION ============
DATA.RACE_WEAPONS = {
  pirate: ['lightcannon', 'chainshot', 'heavycannon', 'swivels', 'grapeshot', 'langrage'],
  human: ['lightcannon', 'chainshot', 'heavycannon', 'swivels', 'grapeshot', 'broadside', 'chainculverin', 'langrage'],
  armada: ['heavycannon', 'carronade', 'seekertorpedo', 'grapeshot', 'broadside', 'chainculverin'],
  merfolk: ['tidelance', 'augershot', 'inkjet', 'brinevolley', 'maelstrom', 'barnaclebomb'],
  lizard: ['venomdart', 'quillstorm', 'venomdart', 'lightcannon', 'flamelance'],
  djinn: ['flamelance', 'emberlens', 'cindervolley', 'infernobomb', 'noonglass', 'wildfirebeam', 'phoenixbeam'],
  stormelf: ['sparkbolt', 'galeshear', 'tempestchain', 'stormlash', 'thunderhead'],
  dwarf: ['heavycannon', 'runebombard', 'cogtorpedo', 'seekertorpedo', 'forgetwins', 'petardrune', 'nullrune'],
  siren: ['wailhorn', 'dirgebeam', 'slumberveil', 'sirenlure', 'galeshear'],
  ghost: ['dirgebeam', 'flamelance', 'wailhorn', 'sparkbolt'],
};

// ============ FAMILIARS (bound spirits in carved vessels - our FTL drones) ============
// the Binding Shrine system wakes them: powered bar 1 runs your 1st familiar,
// bar 2 the 2nd, bar 3 the 3rd. Vessels are bought at shops (max 3 aboard).
DATA.FAMILIARS = {
  emberimp:     { name: 'Ember Imp', race: 'djinn', role: 'attack', cost: 55, rarity: 1, desc: 'A candleflame with opinions. Circles the enemy lobbing fire-sparks (1 dmg, can ignite).' },
  clockworkgull:{ name: 'Clockwork Gull', race: 'dwarf', role: 'attack', cost: 70, rarity: 2, desc: 'It does not eat, sleep, or miss. Drops round shot on the enemy (1 dmg, strips wards).' },
  squallsprite: { name: 'Squall Sprite', race: 'stormelf', role: 'defense', cost: 60, rarity: 2, desc: 'A knot of wind nesting in your rigging. Gusts incoming torpedoes off course (60%).' },
  countersigil: { name: 'Counter-Sigil Wisp', race: 'dwarf', role: 'defense', cost: 65, rarity: 2, desc: 'A floating proofreader. Erases enemy bomb-runes mid-conjure (60%).' },
  tinkerbeetles:{ name: 'Tinker Beetles', race: 'dwarf', role: 'repair', cost: 50, rarity: 1, desc: 'Brass beetles that consider damage a personal insult. Repair systems on their own.' },
  coralsentinel:{ name: 'Coral Sentinel', race: 'merfolk', role: 'guard', cost: 55, rarity: 2, desc: 'Grown, not built. Stomps boarders on your decks; stronger in flooded rooms.' },
  reefsingers:  { name: 'Reef-Singers', race: 'merfolk', role: 'mend', cost: 75, rarity: 3, desc: 'They sing to the wood about being a tree. Slowly regrow hull while you sail.' },
  brassjanissary:{ name: 'Brass Janissary', race: 'djinn', role: 'boarder', cost: 80, rarity: 3, desc: 'A soldier folded out of lamplight. Fights below the enemy\'s decks until broken.' },
};
DATA.RACE_CREW = {
  pirate: 'human', human: 'human', armada: 'human', merfolk: 'merfolk', lizard: 'lizard',
  djinn: 'djinn', stormelf: 'stormelf', dwarf: 'dwarf', siren: 'siren', ghost: 'siren',
};

// tier 1..9 (boss stages use 9)
DATA.makeEnemy = function (race, tier, opts) {
  opts = opts || {};
  const big = tier >= 6;
  // signature faction hulls appear from mid-tier (tier 1-2 stay generic sloops); FACTION_SHIPS_PROPOSAL §8
  const FACTION_HULL = { pirate: 'brig', armada: 'manofwar', merfolk: 'drowner', lizard: 'canoe', djinn: 'fireship', stormelf: 'cutter', dwarf: 'divingbell', siren: 'wreck', ghost: 'phantom' };
  const layout = opts.layout || (tier <= 2 ? 'sloop' : (FACTION_HULL[race] || (tier <= 5 ? 'corvette' : 'galleon')));
  const pool = DATA.RACE_WEAPONS[race] || DATA.RACE_WEAPONS.pirate;
  // early fights are snappy: tier 1 ships carry a single gun
  const nWep = Math.min(layout === 'sloop' ? 2 : 3, Math.max(1, Math.ceil((tier + 1) / 2)));
  const weapons = [];
  for (let i = 0; i < nWep; i++) weapons.push(pool[Math.min(pool.length - 1, U.ri(0, Math.min(pool.length - 1, Math.ceil(tier / 2))))]);
  const crewRace = DATA.RACE_CREW[race] || 'human';
  const nCrew = Math.min(5, 2 + Math.floor(tier / 3) + (opts.boarders ? 1 : 0));
  const crew = []; for (let i = 0; i < nCrew; i++) crew.push(crewRace);
  // a ship can only RUN a room-bound system it has a room for. Several faction hulls
  // (brig/canoe/cutter/wreck/phantom) have no wards/infirmary room, so granting them ward
  // levels showed a ward bubble with no room to target/disable. Gate on the actual layout.
  const roomKeys = new Set((DATA.LAYOUTS[layout].rooms || []).map(r => r[0]));
  const sysLv = {
    helm: 1, sails: Math.min(4, 1 + Math.floor(tier / 3)),
    weapons: Math.min(6, 1 + Math.ceil(tier / 2)),
    wards: roomKeys.has('wards') ? Math.min(6, Math.floor(tier / 2) * 2) : 0,
    infirmary: roomKeys.has('infirmary') ? 1 : 0,
    lookout: layout === 'galleon' ? 1 : 0,
    doors: 1,
    // boarders bring a working Portal whatever hull they sail. (The old `layout === 'galleon'`
    // gate went dead when faction hulls landed: lizard/siren — the only boarder races — sail
    // canoe/wreck from tier 3, so enemy boarding never fired outside the boss. R2, 2026-07-02.)
    // assignMounts seats it in a mount room where the layout has one; roomless fallback otherwise.
    brinegate: opts.boarders ? 1 : 0,
    fogveil: 0,
    // signature advanced systems at high tier: storm-elves jam (Storm Conduit),
    // sirens charm (Siren's Song) — the enemy-side handlers in Battle.update were
    // unreachable before because no def ever granted these. (R2, 2026-07-02)
    stormhex: (race === 'stormelf' && tier >= 5) ? 1 : 0,
    sirensong: (race === 'siren' && tier >= 5) ? 1 : 0,
  };
  // signature systems come with the mana to run them: autoAlloc funds guns/sails/pumps first,
  // so without this bump a boarder's Portal (or a siren's Song) would sit unpowered. (R2)
  let mana = 2 + tier + (big ? 2 : 0) + (sysLv.brinegate || 0) + (sysLv.stormhex || 0) + (sysLv.sirensong || 0);
  return {
    layout, style: race, name: opts.name || U.pick(DATA.SHIPNAMES),
    hull: opts.hull || ((tier <= 2 ? 3 : 5) + tier * 2 + (big ? 4 : 0) - (tier >= 6 ? tier - 5 : 0)),
    sysLv, manaMax: mana, weapons, crew,
    fleeAt: opts.fleeAt !== undefined ? opts.fleeAt : (U.chance(0.35) ? 0.25 : 0),
    boarders: !!opts.boarders,
    surrenders: opts.surrenders !== undefined ? opts.surrenders : U.chance(0.3),
  };
};

// boss stages
DATA.makeBoss = function (stage) {
  const defs = [
    { weapons: ['carronade', 'heavycannon', 'seekertorpedo'], hull: 28, wards: 4, name: 'WARDEN OF THE VEIL', fog: 0 },
    { weapons: ['tempestchain', 'phoenixbeam', 'heavycannon'], hull: 30, wards: 6, name: 'WARDEN OF THE VEIL', boarders: true, fog: 0 },
    { weapons: ['carronade', 'phoenixbeam', 'seekertorpedo', 'wailhorn'], hull: 32, wards: 6, name: 'WARDEN OF THE VEIL', boarders: true, fog: 1 },
  ];
  const d = defs[stage];
  return {
    layout: 'dreadnought', style: 'boss', name: d.name, hull: d.hull,
    sysLv: { helm: 2, sails: 3, weapons: 8, wards: d.wards, infirmary: 2, lookout: 1, doors: stage === 0 ? 1 : 2, brinegate: d.boarders ? 2 : 0, fogveil: d.fog ? 2 : 0 },
    manaMax: 13 + stage * 2, weapons: d.weapons,
    crew: ['human', 'dwarf', 'djinn', 'stormelf', 'lizard'].slice(0, 4 + (stage > 0 ? 1 : 0)),
    fleeAt: 0, boarders: !!d.boarders, surrenders: false, boss: true, stage,
  };
};

// ============ REGIONS ============
DATA.REGIONS = [
  { name: 'The Old Coast', race: 'pirate', vig: 'island', desc: 'Pirate waters off the homeland. The Armada is right behind you.', hazards: [['none', 6], ['storm', 1], ['fog', 1]] },
  { name: 'Sapphire Shallows', race: 'merfolk', vig: 'reef', desc: 'Coral labyrinths of the drowners. Keep your doors shut and your pumps wet.', hazards: [['none', 5], ['reef', 2], ['storm', 1]] },
  { name: 'The Serpent Cays', race: 'lizard', vig: 'jungle', desc: 'Jungle islets of the headhunters. They want your crew, not your hull.', hazards: [['none', 5], ['reef', 1], ['kraken', 1]] },
  { name: 'The Cinder Isles', race: 'djinn', vig: 'volcano', desc: 'Volcanic forges of the djinn. Their lances do not miss. Their fires do not stop.', hazards: [['none', 5], ['storm', 1], ['kraken', 1]] },
  { name: 'Tempest Reach', race: 'stormelf', vig: 'storm', desc: 'The storm elves ride the永 gales here.', hazards: [['none', 3], ['storm', 4], ['fog', 1]] },
  { name: 'The Iron Deeps', race: 'dwarf', vig: 'ruins', desc: 'Dwarven toll straits. Every runeshot on the sea was forged down here.', hazards: [['none', 5], ['whirlpool', 2], ['fog', 1]] },
  { name: "The Siren's Maze", race: 'siren', vig: 'fog', desc: 'A fog where ships go to listen, and stay. Stuff your ears. Watch your posts.', hazards: [['none', 3], ['fog', 4], ['kraken', 1]] },
  { name: 'The Last Meridian', race: 'armada', vig: 'city', desc: 'The New World is in sight. So is the Warden.', hazards: [['none', 4], ['storm', 2], ['whirlpool', 1]] },
];
// fix accidental non-ascii
DATA.REGIONS[4].desc = 'The storm elves ride the endless gales here.';

// ship's log entries shown on entering each region
DATA.REGION_LOGS = [
  "Log, day one. We cleared the breakwater before dawn with the Armada's lanterns still in sight astern. Whatever the chart promises, it has already cost us our names back home.",
  "The water turned to glass and coral. Merfolk watched us pass from the reef-tops, curious as gulls. The bosun swears one of them laughed at our rigging. She was probably right.",
  "Green islands, drum-talk all night. The lizardfolk fly fang-banners from their war canoes. They respect strength and very little else. We will try to look strong.",
  "Ash on the sails by morning. The djinn forge-isles glow like banked coals on the horizon. Everything here is for sale - including the fire that melts ships.",
  "The storm never ends here. The elves ride it like a road. Our charts are useless; we bought new ones from a skiff that outran our best wind without raising a sail.",
  "Dwarven sea-forts on every strait, harbor chains thick as masts. Honest tolls, iron rules. The crew is spending shards on runeshot and regret.",
  "Fog, and singing in the fog. We packed our ears with wax and still hum the tune at supper. Two ships' worth of wreckage drifted past this morning. Nobody spoke.",
  "Land. Great spires of silver-green light where the chart said only rumor. The Warden's hull blots out the harbor mouth. One fight more, and history remembers us.",
];

// Rumors & Discoveries: authored MYTH/LEGEND pool per region (FFT bar-rumor style).
// Pure flavor + worldbuilding - NO gameplay effect. The map screen mixes a rotating
// selection of these with live "true intel" lines generated from the current chart.
DATA.REGION_RUMORS = [
  [ // 0 - The Old Coast (pirate homeland; the Armada at your heels)
    'They say the drowned crews of the breakwater still haul phantom lines when the fog rolls in.',
    'An old cartographer in port swears this chart redraws itself past the third cay.',
    'Hang a holed coin in the rigging, the wives say, and the Armada\'s lookouts will glance the wrong way.',
    'A lighthouse keeper on the homeland shore lights no lamp for the King now - only for ships running from him.',
    'The first captain to sail this coast was hanged for it. His ship, they say, still keeps his appointments.',
  ],
  [ // 1 - Sapphire Shallows (merfolk reefs)
    'Pearl-divers speak of a merfolk city beneath the reef, its bells rung by the tide.',
    'Mock the reef-singers and you\'ll wake to find every compass needle bent toward the deep.',
    'A drowned sailor returns once a year to the shallows, they say, to teach the young merfolk our songs.',
    'The coral here grows in the shape of ships it has taken. Sailors read it like a graveyard.',
    'Leave a coin on the gunwale at slack water and the merfolk will tow you off any reef. Forget, and they remember.',
  ],
  [ // 2 - The Serpent Cays (lizardfolk jungle islets)
    'The lizardfolk fly fang-banners cut from the sails of ships that would not parley.',
    'Drums in the jungle keep the count of every keel that ever passed. Yours is being added now.',
    'They say the great isle at the heart of the cays is a sleeping serpent, and the trees are its scales.',
    'A headhunter chief wears a captain\'s hat from a fleet no living chart remembers.',
    'Spill no blood in the lagoons - the water here is said to taste it, and to follow the ship that spilled it.',
  ],
  [ // 3 - The Cinder Isles (djinn volcanoes)
    'A djinn will grant one true wish to the captain who sails into the caldera and asks for nothing.',
    'The ash remembers names here - swear no oath you mean to break.',
    'Forge-smoke from the isles is said to spell the future, if you are fool enough to read it.',
    'They say a djinn lost a wager with the sea and must keep the volcanoes burning until it wins one back.',
    'Glass beads wash up on the black sand - each one, the djinn claim, a sailor\'s last warm thought.',
  ],
  [ // 4 - Tempest Reach (storm elves)
    'The storm elves ride the gale like a road, and pity any captain who asks them for directions.',
    'There is an eye at the center of the endless storm, they say, calm as a chapel, where lost ships gather.',
    'Buy a wind from an elf skiff and it will be true - but it will cost you a memory you liked.',
    'Lightning never strikes an elf mast. The elves say it is courtesy; the sea says it is fear.',
    'A bell with no clapper hangs in the highest cloud, and rings only when a great captain is about to drown.',
  ],
  [ // 5 - The Iron Deeps (dwarven sea-forts & ruins)
    'Every runeshot on the sea was forged down here, and the dwarves keep a ledger of where each one lands.',
    'The harbor chains are older than the dwarves who mind them; no one recalls what they were first built to hold out.',
    'Sink a coin in the straits and a dwarf hand, they say, will surface to test its weight.',
    'There is a drowned forge in the deeps still burning, tended by smiths who forgot how to die.',
    'A dwarf toll is honest to the copper - but the receipts are said to come due in the next life, too.',
  ],
  [ // 6 - The Siren's Maze (fog)
    'Two ships\' worth of wreckage drifts here for every one that sings its way out.',
    'The siren\'s song, they say, is your own mother calling you home to supper.',
    'Wax in the ears keeps you alive; it does not keep you from humming the tune at every supper after.',
    'There is a ship in the fog that has been almost-arriving for a hundred years. Do not wave back.',
    'A siren will trade a safe course for a true name. Captains who paid say it was worth it. Captains who paid are few.',
  ],
  [ // 7 - The Last Meridian (the Armada's city; the Warden)
    'The Warden\'s hull is built from every ship it has ever sunk, and the timbers still argue at night.',
    'The spires of the city run on captured magic - shard-light stolen from a hundred drowned crews.',
    'They say the Warden was a captain once, and took the King\'s commission to keep from being hanged like you.',
    'Pass the harbor mouth and the city bells toll your name, however you have hidden it.',
    'There is a door in the deepest spire, the rumor goes, that opens only for the captain who arrives with nothing left to lose.',
  ],
];

// Longer LORE (FFT tavern-tale length: 2 short paragraphs). Parallel to REGION_RUMORS:
// REGION_LORE[region][mythIdx] expands the myth a clicked italic rumor refers to. Pure
// flavor, no gameplay effect. Authored to the same length band as Final Fantasy Tactics
// tavern rumors — a hook, then a short turn of the tale.
DATA.REGION_LORE = [
  [ // 0 - The Old Coast
    "When the breakwater was built, a press-ganged crew was lost laying its last stones — caught by a squall the harbormaster swore he never saw coming. The wives buried empty boxes and the port moved on.\n\nBut on fog nights, the watch still hears the creak of capstans nobody is turning, and lines that haul taut against no weight at all. Old hands say the drowned are still bringing the stone home, and will not stop until the work they died for is undone.",
    "A cartographer who drank in every tavern on the coast swore his charts were honest as far as the third cay — and a polite fiction past it. He redrew the same waters nine times and got nine different seas.\n\nHe died convinced the coast itself was hiding something, shuffling its reefs and channels the way a cardsharp shuffles a deck. Captains who laughed at him have since run aground on shoals that were not there yesterday. Nobody laughs now.",
    "It is an old wives' charm: hang a coin with a hole worn through it in the rigging, and the King's lookouts will find their eyes sliding off your hull like rain off oilcloth. The holed coin, they say, is a sailor's eye that the sea took and gave back blind.\n\nThe Armada calls it superstition. Yet every free captain on the coast keeps one aloft, and the press-gangs keep missing ships they should not. Belief costs a copper. Being seen costs everything.",
    "The lighthouse on the homeland shore has kept its lamp dark for the King these three years. Its keeper was a navy man once, until he watched a frigate burn a fishing fleet for flying the wrong colours.\n\nNow he lights the lamp only for ships running FROM the crown — a single low flame, easy to miss unless you know to look for it. The Armada has tried twice to hang him. Both times the fog came in thick enough to lose a noose in.",
    "The first captain to chart this coast was hanged at Gallows Point for piracy, smuggling, and 'conduct unbecoming the King's seas.' He went to the rope laughing, they say, and promised to keep every appointment in his log.\n\nSailors still meet his ship on the worst nights — sails the colour of old teeth, a captain at the rail who tips a hat that is mostly bone. He asks only the date, checks it against a ledger no living hand could read, and sails on.",
  ],
  [ // 1 - Sapphire Shallows
    "Pearl-divers who hold their breath longest tell of a city under the reef — towers of living coral, streets paved in shell, and bells that no hand rings. The tide rings them, swinging slow in the deep current, tolling a hymn felt in the chest more than heard.\n\nFew divers go down twice. Those who do come back changed: humming a tune they cannot place, counting the days to the next slack water. The merfolk, it is said, are patient. They have a city, and they have time, and they are always building.",
    "The reef-singers ask one courtesy of passing ships: do not mock the song. Captains who jeered have woken at dawn to find every compass aboard pointing not north, but DOWN — needles trembling toward the deep like dogs that have heard a whistle.\n\nThose ships are not always lost. But they steer strange ever after, drifting toward shoals and sounding waters no chart marks. The merfolk do not curse, exactly. They simply make sure a discourteous keel never quite trusts its own way again.",
    "Once a year, at the turn of the long tide, a drowned sailor is said to walk back into the shallows — barnacled, patient, and kind. He gathers the young merfolk on the sandbar and teaches them the songs of the surface: forecastle ballads, capstan shanties, the lullabies sung to children who will grow up to drown.\n\nIt is how the reef-singers learned to sound so human. Every cruel hymn that has lured a ship onto the coral began as a sailor's homesick tune, taught with love by a dead man who only wanted the company.",
    "The coral of the shallows does not grow in branches and fans like honest reef. It grows in HULLS — keels and ribs and the suggestion of a mast, the shape of every ship the shallows have taken, fossilised in stone the colour of drowned pearl.\n\nMerfolk read it the way landsmen read a churchyard. Divers who know the trick can find their own grandfather's lost sloop down there, perfect and petrified, and are advised not to linger. The reef is a graveyard that is still accepting tenants.",
    "The bargain is older than the charts: at slack water, leave a single coin on the gunwale, and if your keel kisses the coral the merfolk will tow you off, gentle as a midwife. No words, no thanks — just the coin, gone by the next swell.\n\nForget the coin, and they remember. Not with malice; merfolk do not rage. They simply are not there the next time you need them, and the reef holds you, and holds you, while the tide does its slow patient work. The shallows keep a ledger, and it always balances.",
  ],
  [ // 2 - The Serpent Cays
    "The lizardfolk fly banners cut from sailcloth — and every banner was once a ship that would not stop to parley. They do not raid for plunder so much as for COLOURS, hauling down the canvas of the proud and stitching it into standards that snap over the jungle canopy.\n\nA captain who reads the banners can trace a hundred years of arrogance in them: this frigate's mainsail, that galleon's jib. The cays keep the record openly, flapping in the trade wind, so that every new arrival can see exactly what becomes of those who sail past without a word.",
    "Drums start in the jungle the moment a keel enters the cays, and they do not stop until it leaves — or doesn't. The lizardfolk drummers keep a count older than any ship's log: every hull that has ever threaded these islets, tallied in a rhythm passed mother to hatchling.\n\nListen long enough and you can hear your own ship enter the count — a new figure in the beat, tentative, then settled. Sailors who have heard their keel added say it is the loneliest sound in the world: proof that you are now, forever, a number the jungle remembers.",
    "The great isle at the heart of the cays is no island. So the lizardfolk swear, and they would know — they live upon its back. It is a serpent old as the sea floor, curled and sleeping, and the jungle that clothes it is the pattern of its scales.\n\nThey build no permanent thing upon it, drive no deep stake, ring no loud bell. To wake it would be to watch the cays uncoil and slide beneath the waves, hatchlings and headhunters and all. The lizardfolk walk softly on the world's last dragon, and ask that visitors do the same.",
    "The headhunter chief of the inner cay wears a captain's bicorne — gold-laced, salt-stained, and stitched with the crest of a fleet that no living chart remembers and no archive will name. Where the fleet went, the hat does not say. The chief does not either.\n\nIt is the cays' way of marking a debt paid in full. To wear an enemy's hat is to wear his story, and the lizardfolk wear a great many. A wise captain bows to the bicorne and remembers that somewhere, a once-proud admiral is a footnote, and his hat is doing better than he did.",
    "Spill no blood in the lagoons. The lizardfolk give the warning kindly, the first time. The water here, they say, has a memory and a palate — it tastes what bleeds into it, and it does not forget the flavour of a particular ship.\n\nThereafter the lagoon FOLLOWS. Currents that should not exist nudge the guilty keel back toward the cays, season after season, until the water has had its fill. Sailors call it superstition right up until they find their ship drifting, against wind and helm, back toward a lagoon they swore they'd never see again.",
  ],
  [ // 3 - The Cinder Isles
    "The djinn of the calderas grant wishes — but never to the captain who comes asking. Sail into the burning bowl of an isle and DEMAND, and you will get smoke and scorn. The wish is reserved for the one who sails in and asks for nothing at all.\n\nThat captain, the tale runs, is shown the one true thing he most needs and least wanted to know. Some come out wealthy. Some come out wise. Most come out weeping, having been granted exactly the truth they spent a life avoiding. The djinn find this very funny, in the way fire finds dry wood funny.",
    "The ash of the Cinder Isles falls grey and warm and remembers. Swear an oath here — to a crewmate, a lover, a god — and the ash takes it down, settling the words into the black drifts that never quite cool.\n\nBreak that oath, and the ash gives it back. Sailors have found their own broken promises spelled out in the soot on the rail, in their own hand, in words they thought only they remembered. The djinn keep no court and pass no sentence. They simply make certain a man cannot lie to himself about what he said.",
    "Forge-smoke rises off the isles in columns that twist and knot against the sky, and the djinn-smiths read them like a priest reads entrails. The smoke spells the future, they claim — clear as printed script, for any fool brave enough to learn the letters.\n\nThe trouble is the learning. Every captain who has cracked the smoke-script has come away unable to stop reading it: in cookfires, in pipe-smoke, in the last breath of a snuffed candle. They see what comes, and they cannot look away, and they cannot change a word of it. Knowing, the djinn say, is its own little hell.",
    "There is a wager-tale told on the black sand: that a djinn once bet the SEA itself it could outlast any tide, and lost. The forfeit was the volcanoes — the djinn must keep them burning, stoking the calderas without rest, until it can goad the sea into a second wager and win it back.\n\nSo the isles smoke on, century after century, a gambler working off a debt to an ocean that will not be drawn into a rematch. The sea, being patient and having already won, simply rolls in and out and says nothing. The djinn shovels fire and waits for its chance.",
    "Glass beads wash up on the black strand after every eruption — smooth, warm, and faintly glowing from within. The djinn say each one is a sailor's last warm thought, the final kind notion of a drowned soul, cooled and kept by the fire that loved it.\n\nDivers gather them and will not sell them. To hold one is to feel, for a heartbeat, what its maker felt at the end: a galley fire, a child's hand, a home harbour at dusk. The Cinder Isles burn everything, in time. But the last good thought, they keep — pressed into glass, glowing faintly, washed up gentle on the shore.",
  ],
  [ // 4 - Tempest Reach
    "The storm elves do not weather the gale; they RIDE it, skiffs heeled hard over, running the wind's own roads as easily as a coach runs a turnpike. To them the endless storm is a country with streets and crossings, and they pity any flatlander captain who hails them to ask the way.\n\nFor they will tell you — courteously, precisely — and the directions will be true, and utterly useless, because they are spoken in the geography of the wind. 'Three gusts past the falling glass, bear up where the squall turns left.' Sailors row away more lost than before, while the elves shake their heads at how little the grounded understand the sky.",
    "At the dead centre of the endless storm, the elves swear, there is an eye — a circle of glassy calm wide as a harbour, still as the inside of a chapel. No wind, no rain, only a hush that has not been broken since the storm began.\n\nAnd in that calm, the lost ships gather. Every vessel the Reach has swallowed drifts there at last, dismasted and silent, crews long gone, riding at anchor in a peace they could not find in life. The elves give the eye a wide berth. It is not a harbour, they say. It is a waiting-room, and the storm is in no hurry.",
    "Pull alongside a storm-elf skiff and you may buy a wind — a true one, bottled in a knot of grey silk, that will fill your sails fair and steady to any heading you name. The elves keep their bargains to the letter. The wind will be exactly as promised.\n\nThe price is never coin. It is a MEMORY — and never one you'd part with gladly. The elf reaches into your recollection and takes something you liked: the colour of a sail, a verse of a song, the way someone laughed. You'll have your fair wind. You simply won't remember why the voyage feels a little emptier than it should.",
    "Lightning never strikes an elf mast. Watch a storm-elf flotilla run through the heart of the tempest and you will see bolts fork around them, fastidious, as if the sky were minding its manners. The elves call it courtesy — one old power tipping its hat to another.\n\nThe sea tells it differently. The sea says the storm is AFRAID of them, that the elves learned the wind's true name in some bargain best not asked about, and the lightning gives way the way a bully gives way to someone who knows his real address. Courtesy or fear, the masts stand. That is all a sailor truly needs to know.",
    "High in the tallest thunderhead hangs a bell with no clapper — black iron, green with age, swinging in a wind that should make no sound from an empty bell. And yet it rings. Rarely. Once in a long while, a single deep note rolls down through the storm.\n\nThe elves go quiet when it does. For the clapperless bell tolls only when a great captain is about to drown — not a deckhand, not a fool, but someone whose loss the sea itself will feel. Hear it, and the elves say a prayer for whoever it means. The grim joke is that you can never be sure the bell does not toll for you.",
  ],
  [ // 5 - The Iron Deeps
    "Every runeshot fired on any sea was forged in the Iron Deeps — there is no other forge that can bind the rune into the round. And the dwarves, being dwarves, keep a LEDGER: a great book in a sunken hall recording each shot cast, its mark, and where in all the world it finally fell.\n\nThey can tell you, for a price, exactly how many of your own rounds missed, and into whose hull or hide the strays went home. Captains find this unsettling. The dwarves find it merely good bookkeeping. A thing made, they hold, is a thing owed an accounting — and the Deeps account for everything.",
    "The great chains across the harbour mouth are older than the dwarves who tend them — older than the harbour, some say, older than the forts whose foundations they thread. The dwarves oil them, test them, replace a link an age, and have done so since memory began.\n\nWhat the chains were first raised to hold OUT, no living dwarf recalls. The oldest records only note that they must never all be lowered at once, and that the watch must be kept seaward, not landward. So the dwarves keep it, faithfully, against a thing whose name was lost so long ago that the keeping has become the whole of the point.",
    "Sink a coin in the straits above the Deeps and wait. If the dwarves judge the offering honest, a hand will rise from the black water — grey, broad, ring-knuckled — and weigh the coin on a calloused palm before drawing it down. A fair weight buys safe passage. A clipped or counterfeit coin buys nothing good.\n\nNo one has seen more of the dwarf than the hand. No one cares to. The straits are deep and the forts are quiet and the toll is the toll. Pay it true, sailors say, and the hand is almost gentle. Pay it false, and you learn that a hand which can rise from the deep can also reach.",
    "Somewhere in the Iron Deeps a forge still burns underwater — coals glowing in the black, hammers ringing through the cold current, tended by smiths who simply forgot, somewhere across the long centuries, how to die.\n\nThey do not haunt; they WORK. They take no notice of divers, answer no hail, only strike and fold and strike again at metal that will never leave that drowned hall. The dwarves above speak of the drowned forge with neither fear nor grief, but with something like envy — for the smiths below have what every craftsman wants, which is time without end and a task that is never quite finished.",
    "A dwarf toll is honest to the last copper; cheat them and they will not. But there is a catch the receipts do not advertise. The Deeps deal in long accounts, and a debt to a dwarf is said to follow the ledger past the grave — coming due again in the NEXT life, with the interest a hundred years of patience can compound.\n\nSailors laugh at this in daylight. They laugh less when an old dwarf factor slides a receipt across the counter and notes, dry as dust, that the captain's grandfather still owes three shards on a contract signed before the war. The Deeps do not forget. The Deeps simply wait for you to come around again.",
  ],
  [ // 6 - The Siren's Maze
    "For every ship that sings its way clear of the fog, two ships' worth of wreckage drifts out in its place — spars and casks and ship's boats, nameplates scoured blank, all of it nosing gently out of the mist as if the Maze were tidying up.\n\nThe sirens do not hoard wrecks. They simply have no use for the wood once the crews are gone, and so the fog gives it back, piece by piece, to the open water. Sailors who find a field of drifting wreckage know they are near the edge of the Maze. They also know the arithmetic: somewhere behind them, the song is two-thirds of the way to even.",
    "The siren's song is not a strange music. That is the horror of it. To each sailor it comes in the voice he most aches to hear — and most often, the tale runs, it is a MOTHER's voice, calling him in from the dark the way she did when he was small, supper on the table, the day's play done.\n\nNo grown man thinks himself a fool for steering toward that. That is the trick. The fog finds the one call you have never been able to ignore and gives it back to you, warm and certain, and the rocks are merely where the voice happens to be standing. Wax in the ears is no cure for wanting to go home.",
    "Wax in the ears keeps a sailor alive through the Maze — this much is true, and every captain who runs the fog packs it. But the old hands give a quieter warning: the wax stops you hearing the song. It does not stop the song HEARING you.\n\nMen who have crossed the Maze deaf to it still come out humming. The tune surfaces at supper, at the helm, in the half-sleep of the middle watch — a melody they never consciously heard and cannot now put down. The sirens, it seems, do not need you to listen. They only need you to pass close enough to catch the tune. After that it is yours for life.",
    "There is a ship in the fog that has been almost-arriving for a hundred years. Sailors glimpse her bow gliding out of the mist, sails set, a figure at the rail lifting a hand in greeting — and then the fog closes, and she is gone, no nearer than before.\n\nDo not wave back. That is the whole of the lore, repeated by every captain who runs the Maze. To return the greeting is to answer the question the ship has been asking for a century: is there room for one more? The figure at the rail is patient and lonely and has all the time in the world, and it is looking for a crew that will wave it aboard.",
    "A siren will sell you a safe course through the Maze — the true line, every rock and eddy, fog or no fog. The price is a TRUE NAME: not the name you sail under, but the secret one, the one your mother used when you were in trouble, the one that is really, wholly you.\n\nCaptains who paid say the bargain was honest and the course was sound and they would do it again. There are not many such captains. A name given to a siren does not come back, and a sailor who has sold his own can sometimes no longer quite answer to it — turning a half-second slow when called, as if the word now belonged to someone in the fog.",
  ],
  [ // 7 - The Last Meridian
    "The Warden's dreadnought was not built in any yard. It was ASSEMBLED — hull plate by hull plate, rib by rib, from every ship the Warden has ever sunk, fitted together into a single vast and graceless thing that should not float and does.\n\nAnd the timbers, taken from a hundred drowned vessels, do not sit easy together. On still nights the crew of the city hear them ARGUE: oak of a merchantman grinding against the elm of a privateer, planks that were enemies in life still feuding in death. The Warden sails a ship made of grudges, and it holds together out of pure spite.",
    "The spires of the Armada's city do not burn oil or coal. They run on captured MAGIC — shard-light wrung from the holds of a hundred drowned crews, the bottled enchantment of every ship the crown has taken, piped up through the towers to keep the capital blazing through the long northern night.\n\nStand in the city after dark and the light has a wrongness to it: too cold, faintly blue, flickering as if remembering. Each lamp is some dead crew's stolen power, still glowing, still working, with no say in the matter. The city is bright as day and the brightness is grief, refined and metered and sold by the spire.",
    "They say the Warden was a captain once — a free one, much like you, with a price on his head and the Armada at his heels. Cornered at last, given the choice between the rope and the King's commission, he chose the commission, and put on the crown's grey, and turned his guns on the kind of men he used to be.\n\nThat is the cruelty the city does not advertise: the Warden hunts pirates because the Warden WAS one, and every ship he sinks is a version of the bargain he didn't take. He keeps no portrait of his old self. He does not need to. He meets it, flying its tattered colours, every time a new free captain reaches the city mouth.",
    "Pass the harbour mouth of the Last Meridian and the city bells begin to toll — not a watch-bell, not an alarm, but your NAME, rung out across the water, however carefully you have hidden it these long leagues. The crown's reach is not in its guns alone. It is in knowing exactly who has finally come.\n\nSailors who have heard the bells say it is worse than any broadside: the certainty that the long run is over, that the alias is spent, that the city has been expecting you by your true name all along. The Warden does not ambush. He welcomes. The bells are the welcome, and they have your name letter-perfect.",
    "In the deepest spire, below the shard-lit halls, the rumor goes there is a door. It has no lock and no guard, for none is needed: it opens only for the captain who arrives with NOTHING left to lose — no crew, no cargo, no name worth the bells, no road back to anywhere.\n\nWhat lies beyond it, the rumor will not say, because no one who has earned the right to open it has ever come back to tell. Perhaps it is the King. Perhaps it is the end of the King. The city keeps the door a secret not because it fears thieves, but because it fears the one captain stripped of everything, who can be bought with nothing, and so cannot be stopped.",
  ],
];

// Evocative chart place-names (assigned deterministically per region, fixed maps).
DATA.PLACE_NAMES = [
  'Whispering Shoals', 'Stormcrest Atoll', 'Saltwind Isles', 'Cursed Reefs', 'Driftwood Ruins',
  'Veil of Mist', 'Bleakwater Cay', 'Forsaken Anchorage', 'The Gloomreach', 'Gallows Point',
  'Tidewrack', 'Mournful Sound', "Wreckers' Bar", 'Kraken Deep', 'Sable Cay', 'Brine Hollow',
  'Fathom Rest', "Widow's Reach", 'Coldwater Roads', 'Ashen Spit', 'Serpent Coil', 'Ghostlight Bank',
  'Drowned Bell', 'Mistral Keys', 'Wyrmsgrave', 'Lantern Rocks', "Hangman's Reef", 'Pale Strand',
  'Rimefall', 'Thornwake', 'Echo Hollow', 'Sunken Vesper', 'Marrow Cay', 'Stillwater', 'Gravewind',
  'Hollow Tide', 'Frosthaven', 'Direswell', 'Glasswater', 'Moonless Bar', 'Saltgrave',
  'Witchlight Reef', 'Cinderfall', 'Duskmere', 'Vael Strand', 'Coral Gate', 'Nightreef', 'Waverest',
];
// consistent descriptors (fight/elite/harbor/warden read the same in every region)
DATA.NODE_DESC = {
  shop: 'Harbor', fight: 'Hostile', elite: 'Warship', event: 'Unknown', distress: 'Distress',
  empty: 'Calm Water', boss: 'The Warden', exit: 'Onward', start: 'Your Wake',
};
// region-flavored descriptors for the AMBIENT nodes (empty/event/distress) so each map
// reads as its own place - the node TYPE/mechanics are identical, only the flavor changes.
DATA.REGION_FEATURE = [
  { empty: 'Calm Water', event: 'Drifting Wreck', distress: 'Castaways' },        // 0 Old Coast
  { empty: 'Coral Reef', event: 'Sunken Wreck', distress: 'Foundering Ship' },    // 1 Sapphire Shallows
  { empty: 'Jungle Lagoon', event: 'War-Canoe Camp', distress: 'Marooned Crew' },// 2 Serpent Cays
  { empty: 'Ashfall', event: 'Forge-Market', distress: 'Burning Hulk' },          // 3 Cinder Isles
  { empty: 'Lightning Squall', event: 'Stormwake', distress: 'Dismasted Ship' },  // 4 Tempest Reach
  { empty: 'Whirlpool', event: 'Dwarven Toll', distress: 'Stranded Barge' },      // 5 Iron Deeps
  { empty: 'Fogbank', event: 'Singing Rocks', distress: 'Ghost Ship' },           // 6 Siren's Maze
  { empty: 'Patrolled Water', event: 'Blockade Run', distress: 'Refugee Ship' },  // 7 Last Meridian
];
// region-themed place-name pools (assigned deterministically -> fixed, lore-distinct charts)
DATA.REGION_PLACES = [
  ['Gallows Point', 'Saltgrave', "Wreckers' Bar", "Hangman's Reef", 'Tarwater', 'Cutthroat Cove', 'Old Breakwater', "Mutineer's Rock", 'Pressgang Bay', "Smuggler's Notch", 'Driftwood Roads', 'Dead Reckoning'],
  ['Coral Gate', 'Pearl Lagoon', 'Drowned Bell', 'Nautilus Reef', 'Glasswater', "Mermaid's Rest", 'Bluefathom', 'Reefsong', 'Tidewrack', 'Anemone Bar', 'Coldwater Roads', 'Sapphire Strand'],
  ['Fangbanner', 'Drumfire Isle', 'Greenmaw', 'Serpent Coil', 'Bonewood', 'War-Canoe Cay', 'Old Scale', 'Venom Hollow', 'Thornwake', "Headhunter's Reach", 'Jaguar Spit', 'Mistjungle'],
  ['Cinderfall', 'Emberlight', 'Forge Atoll', 'Ashen Spit', 'Brass Bazaar', 'Smokereach', 'Caldera Gate', "Wishmonger's Rock", 'Sulfur Roads', 'Lampblack Cay', 'Pyre Isle', 'Glasswater'],
  ['Stormcrest', 'Thunderhead', 'Galesong', 'The Maelstrom', 'Riftcloud', 'Skyreef', 'Windward Roads', 'Lightning Spit', 'Stormwrack', 'Eye of the Gale', 'Mistral Keys', 'Tempest Gate'],
  ['Iron Gate', 'Tollwater', 'Anvil Rock', 'Deepforge', 'Chainstrait', 'Runehold', 'Whirlpool Roads', 'Sunken Foundry', 'Greyfathom', 'Bastion Cay', 'Coldhammer', 'Gravewind'],
  ['Veil of Mist', 'Mournful Sound', 'Echo Hollow', 'Lorelei Rock', 'Ghostlight Bank', 'Fogbound Cay', 'Lament Reef', 'Whisper Strait', 'Pale Strand', 'Drowned Choir', 'Hushwater', "Siren's Gate"],
  ['The Gloomreach', "Warden's Gate", 'Mythril Roads', 'Spire Anchorage', 'Armada Picket', 'Silverlight Bank', 'Customs Reef', 'Blockade Point', 'Lantern Rocks', 'Tribunal Cay', 'New World Strand', 'Last Light'],
];

DATA.REWARD = function (tier, elite) {
  let s = 14 + tier * 5 + U.ri(0, 10);
  if (elite) s = Math.round(s * 1.5);
  return s;
};

// ============ CREW ANIMATION (HD-2D pose state machine) ============
// FTL-grounded: a small set of key poses; the engine makes the motion (frame
// swap + procedural bob/breathe). Art makes the poses, code makes the life.
// Frame keys map to crew_<race|hero>_<pose>.png (see assets/crew_anim_manifest.js).
// Missing art falls back gracefully (see SPR.drawCrewPose), so races without a
// pose kit keep using the legacy 2-frame sprite.
// Each state carries the PREFERRED (new HD kit) frame names + a `legacy` fallback (the older
// kit names other races still use). `crewAnimFrame` resolves PER RACE: a race that has the new
// frames plays them; everyone else falls back to legacy — so the human video kit (8-frame
// walk/repair/firefight/fight) coexists with the 7 legacy races without breaking them. States
// flagged `videoMotion` have the bob/bounce baked into the frames (extracted from video), so the
// procedural bob is suppressed when those frames are in use. WALK needs a `marker` because its
// legacy names (walk1-4) are a subset of the new names (walk1-8); the marker (walk8) distinguishes
// a true 8-frame video kit from a 4-frame legacy walk. See docs/CREW_ANIM_SHEET_PLAN.md.
DATA.CREW_ANIM = {
  idle:    { frames: ['idle_side1', 'idle_side2'], legacy: ['idle_side'], fps: 2, breathe: true },
  walk:    { frames: ['walk1', 'walk2', 'walk3', 'walk4', 'walk5', 'walk6', 'walk7', 'walk8'],
             legacy: ['walk1', 'walk2', 'walk3', 'walk4'], marker: 'walk8', fps: 10, bob: 1.5, videoMotion: true },
  climb:   { frames: ['climb1', 'climb2', 'climb3', 'climb4'], legacy: ['climb_a', 'climb_b'], fps: 6 },
  operate: { frames: ['operate1', 'operate2'], legacy: ['operate'], fps: 3, bob: 0.6 },
  repair:  { frames: ['repair1', 'repair2', 'repair3', 'repair4', 'repair5', 'repair6', 'repair7', 'repair8'],
             legacy: ['repair'], fps: 10, bob: 0.8, videoMotion: true },
  // bucket-of-water firefighting: its own 8-frame throw cycle from video; legacy races reuse 'repair'.
  firefight: { frames: ['firefight1', 'firefight2', 'firefight3', 'firefight4', 'firefight5', 'firefight6', 'firefight7', 'firefight8'],
             legacy: ['repair'], fps: 10, bob: 1.3, videoMotion: true },
  fight:   { frames: ['fight1', 'fight2', 'fight3', 'fight4', 'fight5', 'fight6', 'fight7', 'fight8'],
             legacy: ['attack1', 'attack2', 'attack3', 'attack4'], fps: 10, videoMotion: true },
  drown:   { frames: ['drown1', 'drown2', 'drown3', 'drown4'], legacy: ['idle_side'], fps: 5, bob: 0.8 },
  down:    { frames: ['die1', 'die2', 'die3', 'die4', 'die5'], legacy: ['down'], fps: 8, loop: false },
};
// derive the animation state from sim flags already maintained in tickCrew
DATA.crewAnimState = function (c) {
  if (c.dead) return 'down';
  if (c._fighting) return 'fight';
  if (c.path && c.path.length > 0) return c._climbing ? 'climb' : 'walk';
  if (c._task === 'fire') return 'firefight';   // dousing a blaze (bucket toss)
  if (c._task) return 'repair';
  if (c._operating) return 'operate';
  return 'idle';
};
// resolve a state to the frames a given race actually has (new HD kit, else legacy).
// returns { a, frames, isVideo }. `race` optional — without manifest info, prefers legacy.
DATA._resolveAnim = function (state, race) {
  const a = DATA.CREW_ANIM[state] || DATA.CREW_ANIM.idle;
  const have = (typeof window !== 'undefined' && window.CREW_ART && window.CREW_ART[race]) ? window.CREW_ART[race] : null;
  if (have) {
    const nu = a.frames.filter(function (n) { return have[n]; });
    const newOk = nu.length > 0 && (a.marker ? have[a.marker] != null : true);
    if (newOk) return { a: a, frames: nu, isVideo: !!a.videoMotion };
    if (a.legacy) { const lg = a.legacy.filter(function (n) { return have[n]; }); if (lg.length) return { a: a, frames: lg, isVideo: false }; }
  }
  return { a: a, frames: a.legacy || a.frames, isVideo: false };
};
// pick the pose key for a state at a given state-clock (seconds in that state)
DATA.crewAnimFrame = function (state, clock, race) {
  const r = DATA._resolveAnim(state, race), a = r.a, f = r.frames;
  if (f.length <= 1 || !a.fps) return f[0];
  if (a.loop === false) return f[Math.min(Math.floor(clock * a.fps), f.length - 1)];  // one-shot: hold last
  return f[Math.floor(clock * a.fps) % f.length];
};
// procedural vertical offset (LOGICAL px, applied to the draw position)
DATA.crewAnimDY = function (state, clock, race) {
  const r = DATA._resolveAnim(state, race), a = r.a;
  if (r.isVideo) return 0;                          // motion (incl. bob) is baked into the frames
  if (a.breathe) return -Math.sin(clock * 2) * 0.6;
  if (a.bob && r.frames.length > 1) {               // step bob: body lifts on the passing frames
    const i = Math.floor(clock * a.fps) % r.frames.length;
    return (i % 2 === 1) ? -a.bob : 0;
  }
  if (a.bob) return -Math.abs(Math.sin(clock * 3)) * a.bob;  // gentle work bob (single-frame)
  return 0;
};
