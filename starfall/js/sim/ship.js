/* STARFALL - Ship / Room / Door / System simulation core (§3, §4).
   Both the player ship and enemy ships run through this same model. */
"use strict";

var Sim = window.Sim || {};
window.Sim = Sim;

// ---------------------------------------------------------------------------
// Door: connects two rooms (roomB === -1 means SPACE / airlock).
// ---------------------------------------------------------------------------
function ShipDoor(id, roomA, roomB, x, y, horizontal) {
  this.id = id;
  this.roomA = roomA;
  this.roomB = roomB;       // -1 = space (airlock)
  this.x = x;               // tile-space coordinates of the door's wall midpoint
  this.y = y;
  this.horizontal = horizontal; // door in a horizontal wall (crew pass vertically)
  this.open = false;
  this.brokenTimer = 0;     // >0: stuck open (broken by boarders)
  this.hitsTaken = 0;
}

// ---------------------------------------------------------------------------
// ShipSystem: one installed system or subsystem.
// ---------------------------------------------------------------------------
function ShipSystem(sysId, level) {
  this.id = sysId;
  this.def = GAME_DATA.systems[sysId];
  this.level = level;       // purchased capacity
  this.damage = 0;          // damaged bars (float while being repaired/damaged)
  this.power = 0;           // allocated reactor bars (excl. Zoltan bars)
  this.ionSec = 0;          // remaining ion lock seconds (cap 25)
  this.repairProgress = 0;  // 0..1 toward removing 1 damage
  this.damageProgress = 0;  // sabotage progress 0..1 toward +1 damage
  this.zoltanBars = 0;      // computed each tick
  this.drainedBars = 0;     // bars pulled by supply shortage (§4.3), auto-restored
  this.destroyedDealtHull = false;
}
ShipSystem.prototype.effectiveLevel = function () {
  return Math.max(0, this.level - Math.ceil(this.damage));
};
ShipSystem.prototype.ionLockedBars = function () {
  return this.ionSec > 0 ? Math.min(this.power + this.zoltanBars, Math.ceil(this.ionSec / 5)) : 0;
};
// Bars actually working right now.
ShipSystem.prototype.effectivePower = function () {
  if (this.def.sub) { // subsystems: powered = effective level, unless ion-locked
    return this.ionSec > 0 ? 0 : this.effectiveLevel();
  }
  var p = this.power + this.zoltanBars - this.drainedBars;
  p = Math.min(p, this.effectiveLevel() + this.zoltanBars);
  if (this.ionSec > 0) {
    var locked = Math.ceil(this.ionSec / 5);
    // Zoltan bars are ion-immune (§4.4)
    p = Math.max(this.zoltanBars, p - locked);
  }
  return Math.max(0, p);
};
ShipSystem.prototype.isOnline = function () { return this.effectivePower() > 0; };

// ---------------------------------------------------------------------------
// Ship
// ---------------------------------------------------------------------------
function Ship(opts) {
  // opts: {def (player ship def) | enemyGen, isPlayer, name}
  this.isPlayer = !!opts.isPlayer;
  this.def = opts.def || null;
  this.name = opts.name || (opts.def ? opts.def.name : "Ship");
  this.cls = opts.cls || (opts.def ? opts.def.cls : "Unknown");
  this.hullStyle = opts.hullStyle || (opts.def ? opts.def.hullStyle : "pirate");
  this.hullMax = opts.hullMax || 30;
  this.hull = this.hullMax;
  this.automated = !!opts.automated;
  this.faction = opts.faction || "player";

  this.rooms = [];
  this.doors = [];
  this.systems = {};        // sysId -> ShipSystem
  this.crew = [];           // Crew entities (crew.js)
  this.intruders = [];      // hostile crew standing on this ship (subset refs)
  this.reactorLevel = opts.reactor || 8;
  this.ionStorm = false;

  this.shieldLayers = 0;
  this.shieldRegenT = 0;
  this.zoltanShield = 0;    // super-shield points
  this.zoltanShieldMax = 0;

  this.weapons = [];        // WeaponSlot list (combat.js)
  this.drones = [];         // DroneSlot list
  this.droneSlots = opts.droneSlots || 3;
  this.weaponSlots = opts.weaponSlots || 4;

  this.augments = [];       // augment ids
  this.cargo = [];          // {type:"weapon"|"drone", id}

  this.cloakActive = 0;     // seconds remaining
  this.cloakCooldown = 0;
  this.cloakFullDuration = 0;

  this.teleportCooldown = 0;
  this.teleporterPads = (opts.def && opts.def.teleporterPads) || 2;

  this.ftlCharge = 0;       // 0..1
  this.ftlChargeGrace = 0;  // out-of-combat instant-ready grace timer
  this.fleeing = false;
  this.fleeTimer = 0;

  this.artilleryCharge = 0;
  this.evasionLastComputed = 0;
  this.destroyed = false;
  this.hitFlash = 0;

  if (opts.layout) this.buildLayout(opts.layout, opts.noAirlocks);
  if (opts.systems) {
    for (var sid in opts.systems) {
      if (opts.systems.hasOwnProperty(sid)) this.installSystem(sid, opts.systems[sid]);
    }
  }
}

Ship.prototype.buildLayout = function (layout, noAirlocks) {
  var i, r;
  this.rooms = [];
  for (i = 0; i < layout.rooms.length; i++) {
    r = layout.rooms[i];
    this.rooms.push({
      id: r.id, x: r.x, y: r.y, w: r.w, h: r.h, sys: r.sys || null,
      o2: 100, fires: [], breaches: [], // fires/breaches: lists of tile indices {t, hp}
      lockdown: 0
    });
  }
  // Bounds
  var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (i = 0; i < this.rooms.length; i++) {
    r = this.rooms[i];
    minX = Math.min(minX, r.x); minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w); maxY = Math.max(maxY, r.y + r.h);
  }
  this.bounds = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };

  // Auto-derive doors between adjacent rooms (shared wall segments).
  this.doors = [];
  var did = 0, a, b, j;
  for (i = 0; i < this.rooms.length; i++) {
    for (j = i + 1; j < this.rooms.length; j++) {
      a = this.rooms[i]; b = this.rooms[j];
      // vertical shared wall (a right edge == b left edge)
      var overlap, mid;
      if (a.x + a.w === b.x || b.x + b.w === a.x) {
        var wallX = (a.x + a.w === b.x) ? b.x : a.x;
        overlap = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (overlap > 0) {
          mid = Math.max(a.y, b.y) + Math.floor(overlap / 2);
          this.doors.push(new ShipDoor(did++, a.id, b.id, wallX, mid + 0.5, false));
        }
      }
      // horizontal shared wall
      if (a.y + a.h === b.y || b.y + b.h === a.y) {
        var wallY = (a.y + a.h === b.y) ? b.y : a.y;
        overlap = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        if (overlap > 0) {
          mid = Math.max(a.x, b.x) + Math.floor(overlap / 2);
          this.doors.push(new ShipDoor(did++, a.id, b.id, mid + 0.5, wallY, true));
        }
      }
    }
  }
  // Airlocks
  if (!noAirlocks && layout.airlocks) {
    for (i = 0; i < layout.airlocks.length; i++) {
      var al = layout.airlocks[i];
      r = this.rooms[al.room];
      if (!r) continue;
      var x = r.x + r.w / 2, y = r.y + r.h / 2, horiz = true;
      if (al.side === "N") { y = r.y; horiz = true; }
      else if (al.side === "S") { y = r.y + r.h; horiz = true; }
      else if (al.side === "W") { x = r.x; horiz = false; }
      else if (al.side === "E") { x = r.x + r.w; horiz = false; }
      if (al.side === "N" || al.side === "S") x = r.x + Math.floor(r.w / 2) + 0.5;
      else y = r.y + Math.floor(r.h / 2) + 0.5;
      this.doors.push(new ShipDoor(did++, r.id, -1, x, y, horiz));
    }
  }
};

Ship.prototype.installSystem = function (sysId, level) {
  var def = GAME_DATA.systems[sysId];
  if (!def) return null;
  var s = new ShipSystem(sysId, Math.min(level, def.maxLevel));
  this.systems[sysId] = s;
  return s;
};
Ship.prototype.sys = function (id) { return this.systems[id] || null; };
Ship.prototype.roomOfSystem = function (sysId) {
  for (var i = 0; i < this.rooms.length; i++) if (this.rooms[i].sys === sysId) return this.rooms[i];
  return null;
};
Ship.prototype.roomAt = function (id) { return this.rooms[id] || null; };

// --- Power management (§4) -------------------------------------------------
Ship.prototype.reactorAvailable = function () {
  var total = this.ionStorm ? Math.ceil(this.reactorLevel / 2) : this.reactorLevel;
  return total;
};
Ship.prototype.reactorUsed = function () {
  var used = 0;
  for (var id in this.systems) {
    if (!this.systems.hasOwnProperty(id)) continue;
    var s = this.systems[id];
    if (!s.def.sub) used += Math.max(0, s.power - s.drainedBars);
  }
  // drones and weapons draw from their system pools; pools ARE the allocation
  return used;
};
Ship.prototype.reactorFree = function () { return this.reactorAvailable() - this.reactorUsed(); };

Ship.prototype.canAddPower = function (sysId) {
  var s = this.sys(sysId);
  if (!s || s.def.sub) return false;
  if (s.ionSec > 0) return false;
  if (s.power >= s.effectiveLevel()) return false;
  if (this.reactorFree() <= 0) return false;
  return true;
};
Ship.prototype.addPower = function (sysId, silent) {
  var s = this.sys(sysId);
  if (!this.canAddPower(sysId)) return false;
  s.power++;
  if (sysId === "shields") this.syncShieldLayers();
  if (!silent && this.isPlayer) AudioEngine.play("uiClick");
  return true;
};
Ship.prototype.removePower = function (sysId, silent) {
  var s = this.sys(sysId);
  if (!s || s.def.sub || s.power <= 0) return false;
  if (s.ionSec > 0) return false; // locked (§6.3)
  s.power--;
  if (sysId === "shields") this.syncShieldLayers();
  if (sysId === "weapons") Sim.Combat.onWeaponPoolChanged(this, true /*manual*/);
  if (sysId === "droneCtrl") Sim.Combat.onDronePoolChanged(this);
  if (!silent && this.isPlayer) AudioEngine.play("uiClick");
  return true;
};

// Supply-shortage drain (§4.3): called when available shrinks (ion storm, reactor events)
Ship.prototype.enforcePowerBudget = function () {
  var avail = this.reactorAvailable();
  var order = GAME_DATA.drainOrder;
  // restore first (reverse order) when there's headroom
  var i, s;
  for (i = order.length - 1; i >= 0; i--) {
    s = this.sys(order[i] === "drones" ? "droneCtrl" : order[i]);
    if (!s) continue;
    while (s.drainedBars > 0 && this.reactorUsed() < avail) s.drainedBars--;
  }
  // drain in order until it fits
  for (i = 0; i < order.length && this.reactorUsed() > avail; i++) {
    s = this.sys(order[i] === "drones" ? "droneCtrl" : order[i]);
    if (!s) continue;
    while (this.reactorUsed() > avail && s.drainedBars < s.power) {
      s.drainedBars++;
      if (s.id === "weapons") Sim.Combat.onWeaponPoolChanged(this, false);
      if (s.id === "droneCtrl") Sim.Combat.onDronePoolChanged(this);
    }
  }
  if (this.sys("shields")) this.syncShieldLayers();
};

// --- Shields (§3.2) ---------------------------------------------------------
Ship.prototype.maxShieldLayers = function () {
  var s = this.sys("shields");
  if (!s) return 0;
  return Math.floor(s.effectivePower() / 2);
};
Ship.prototype.syncShieldLayers = function () {
  var max = this.maxShieldLayers();
  if (this.shieldLayers > max) this.shieldLayers = max; // drop instantly (§4.1)
};
Ship.prototype.shieldRegenTime = function () {
  // per layer: 2.0s (1-2), 1.72s (3rd), 1.5s (4th); manning + booster divide
  var nextLayer = this.shieldLayers + 1;
  var t = nextLayer >= 4 ? 1.5 : nextLayer === 3 ? 1.72 : 2.0;
  var mult = 1;
  var mann = this.manningSkill("shields");
  if (mann >= 0) mult *= 1 + [0.10, 0.20, 0.30][mann];
  var boosters = this.countAugment("shield_booster");
  if (boosters > 0) mult *= (1 + 0.15 * boosters);
  return t / mult;
};

// --- Augments ---------------------------------------------------------------
Ship.prototype.hasAugment = function (id) { return this.augments.indexOf(id) >= 0; };
Ship.prototype.countAugment = function (id) {
  var n = 0;
  for (var i = 0; i < this.augments.length; i++) if (this.augments[i] === id) n++;
  return n;
};

// --- Manning ---------------------------------------------------------------
// returns -1 if unmanned, else the manning crew's skill level (0..2)
Ship.prototype.manningSkill = function (sysId) {
  var room = this.roomOfSystem(sysId);
  var s = this.sys(sysId);
  if (!room || !s) return -1;
  if (s.ionSec > 0 || s.effectiveLevel() === 0) return -1;
  if (room.fires.length > 0 || room.breaches.length > 0) return -1;
  // intruders present -> can't man
  for (var j = 0; j < this.intruders.length; j++) {
    if (this.intruders[j].room === room.id && !this.intruders[j].dead) return -1;
  }
  for (var i = 0; i < this.crew.length; i++) {
    var c = this.crew[i];
    if (c.dead || c.ship !== this) continue;
    if (c.room === room.id && c.atStation && !c.moving) {
      var skillMap = { piloting: "piloting", engines: "engines", shields: "shields", weapons: "weapons", sensors: "repair", doors: "repair" };
      var sk = skillMap[sysId] || "repair";
      return c.skillLevel(sk);
    }
  }
  return -1;
};

// --- Evasion (§7.5) ---------------------------------------------------------
Ship.prototype.evasion = function () {
  var engines = this.sys("engines");
  var piloting = this.sys("piloting");
  var ev = 0;
  var enginesOnline = engines && engines.effectivePower() > 0 && engines.effectiveLevel() > 0;
  var pilotingDestroyed = !piloting || piloting.effectiveLevel() === 0 || piloting.ionSec > 0;
  var enginesDestroyed = !engines || engines.effectiveLevel() === 0;
  if (!pilotingDestroyed && !enginesDestroyed && enginesOnline) {
    var lvl = Math.min(engines.effectivePower(), 8);
    if (lvl > 0) ev = GAME_DATA.systems.engines.evasion[lvl - 1];
    var pilotSkill = this.manningSkill("piloting");
    var engSkill = this.manningSkill("engines");
    if (engSkill >= 0) ev += GAME_DATA.systems.engines.manningEvasion[engSkill];
    if (pilotSkill >= 0) {
      ev += GAME_DATA.systems.piloting.manningEvasion[pilotSkill];
    } else {
      // autopilot factor by piloting level
      var ap = GAME_DATA.systems.piloting.autopilot[Math.min(2, piloting.effectiveLevel() - 1)];
      ev *= ap;
    }
  }
  if (this.automated && !pilotingDestroyed) {
    // automated ships always "manned" by AI
    ev = ev || (engines ? GAME_DATA.systems.engines.evasion[Math.max(0, Math.min(7, (engines.effectivePower() || 1) - 1))] : 0);
  }
  if (this.aiEvasionOverride != null && !pilotingDestroyed && !enginesDestroyed) ev = this.aiEvasionOverride;
  if (this.cloakActive > 0) ev += 60;
  ev = Math.max(0, Math.min(100, ev));
  this.evasionLastComputed = Math.round(ev);
  return ev;
};

// --- Cloak ------------------------------------------------------------------
Ship.prototype.canCloak = function () {
  var c = this.sys("cloaking");
  return c && c.effectivePower() > 0 && this.cloakActive <= 0 && this.cloakCooldown <= 0;
};
Ship.prototype.startCloak = function () {
  if (!this.canCloak()) return false;
  var c = this.sys("cloaking");
  var lvl = Math.min(3, c.effectivePower());
  this.cloakFullDuration = GAME_DATA.systems.cloaking.duration[lvl - 1];
  this.cloakActive = this.cloakFullDuration;
  return true;
};

// --- Damage application ------------------------------------------------------
Ship.prototype.applySystemDamage = function (room, dmg, source) {
  if (!room || !room.sys || dmg <= 0) return;
  var s = this.sys(room.sys);
  if (!s) return;
  // Titanium System Casing: 15% negate system damage
  if (this.hasAugment("titan_casing") && RNG.vol.chance(15)) return;
  var wasZero = s.effectiveLevel() === 0;
  s.damage = Math.min(s.level, s.damage + dmg);
  if (s.effectiveLevel() === 0 && !wasZero) {
    if (source === "fire" || source === "sabotage") {
      if (!s.destroyedDealtHull) {
        s.destroyedDealtHull = true;
        this.applyHullDamage(1, null, true);
      }
    }
    if (s.id === "weapons") Sim.Combat.onWeaponPoolChanged(this, false);
    if (s.id === "droneCtrl") Sim.Combat.onDronePoolChanged(this);
    if (s.id === "shields") this.syncShieldLayers();
  }
  if (s.effectiveLevel() > 0) s.destroyedDealtHull = false;
  if (s.power > s.effectiveLevel()) {
    s.power = s.effectiveLevel();
    if (s.id === "weapons") Sim.Combat.onWeaponPoolChanged(this, false);
    if (s.id === "droneCtrl") Sim.Combat.onDronePoolChanged(this);
    if (s.id === "shields") this.syncShieldLayers();
  }
};

Ship.prototype.applyHullDamage = function (dmg, room, skipPlating) {
  if (dmg <= 0) return;
  if (!skipPlating && this.hasAugment("rock_plating") && RNG.vol.chance(15)) dmg = 0;
  if (dmg <= 0) return;
  this.hull -= dmg;
  this.hitFlash = 0.06;
  if (Game && Game.onHullDamage) Game.onHullDamage(this, dmg);
  // Crystal Vengeance (§13)
  if (this.hasAugment("crystal_vengeance") && RNG.vol.chance(10) && Sim.Combat && Game.combat) {
    Sim.Combat.crystalVengeance(this);
  }
  if (this.hull <= 0) { this.hull = 0; this.destroyed = true; }
};

Ship.prototype.applyIon = function (room, ionPts) {
  if (ionPts <= 0) return;
  if (this.hasAugment("rev_ion_field")) {
    var kept = 0;
    for (var i = 0; i < ionPts; i++) if (!RNG.vol.chance(50)) kept++;
    ionPts = kept;
    if (ionPts <= 0) return;
  }
  var sysId = room && room.sys ? room.sys : null;
  if (this.shieldLayers > 0) sysId = "shields";
  if (!sysId) return;
  var s = this.sys(sysId);
  if (!s) return;
  s.ionSec = Math.min(25, s.ionSec + ionPts * 5);
  if (sysId === "shields") this.syncShieldLayers();
  if (sysId === "weapons") Sim.Combat.onWeaponPoolChanged(this, false);
  if (sysId === "cloaking" && this.cloakCooldown > 0) this.cloakCooldown += 5;
};

Ship.prototype.startFire = function (roomId, tile) {
  var room = this.roomAt(roomId);
  if (!room) return;
  var maxTiles = room.w * room.h;
  if (room.fires.length >= maxTiles) return;
  var used = {};
  for (var i = 0; i < room.fires.length; i++) used[room.fires[i].t] = true;
  var t = tile;
  if (t == null || used[t]) {
    var free = [];
    for (var k = 0; k < maxTiles; k++) if (!used[k]) free.push(k);
    if (!free.length) return;
    t = RNG.vol.pick(free);
  }
  room.fires.push({ t: t, hp: 100, spreadT: 5 });
  if (this.isPlayer) {
    AudioEngine.play("fireStart");
    if (Game && Game.onAutoPause) Game.onAutoPause("fireStarted");
    if (Game && Game.showTip) Game.showTip("firstFire");
  }
};

Ship.prototype.startBreach = function (roomId, tile) {
  var room = this.roomAt(roomId);
  if (!room) return;
  var maxTiles = room.w * room.h;
  if (room.breaches.length >= maxTiles) return;
  var used = {};
  for (var i = 0; i < room.breaches.length; i++) used[room.breaches[i].t] = true;
  var t = tile;
  if (t == null || used[t]) {
    var free = [];
    for (var k = 0; k < maxTiles; k++) if (!used[k]) free.push(k);
    if (!free.length) return;
    t = RNG.vol.pick(free);
  }
  room.breaches.push({ t: t, progress: 0 });
  if (this.isPlayer) {
    AudioEngine.play("breachPunch");
    if (Game && Game.onAutoPause) Game.onAutoPause("hullBreach");
    if (Game && Game.showTip) Game.showTip("firstBreach");
  }
};

// --- Door / oxygen graph -----------------------------------------------------
Ship.prototype.doorsBetween = function (roomA, roomB) {
  var out = [];
  for (var i = 0; i < this.doors.length; i++) {
    var d = this.doors[i];
    if ((d.roomA === roomA && d.roomB === roomB) || (d.roomA === roomB && d.roomB === roomA)) out.push(d);
  }
  return out;
};
Ship.prototype.setAllDoors = function (open, includeAirlocks) {
  for (var i = 0; i < this.doors.length; i++) {
    var d = this.doors[i];
    if (d.roomB === -1 && !includeAirlocks) continue;
    d.open = open;
  }
  AudioEngine.play("door");
};
Ship.prototype.doorLevel = function () {
  var s = this.sys("doors");
  if (!s) return 0;
  var lvl = s.effectiveLevel();
  if (lvl > 0 && this.manningSkill("doors") >= 0) lvl = Math.min(4, lvl + 1);
  return lvl;
};

// --- Per-tick update (called from main loop; §1.3 steps 4,6,7 pieces) --------
Ship.prototype.tick = function (dt) {
  var i, j, room;

  // shield regen (§1.3 step 4)
  var maxL = this.maxShieldLayers();
  if (this.shieldLayers < maxL) {
    this.shieldRegenT += dt;
    var need = this.shieldRegenTime();
    if (this.shieldRegenT >= need) {
      this.shieldRegenT = 0;
      this.shieldLayers++;
    }
  } else this.shieldRegenT = 0;

  // ion timers
  for (var sid in this.systems) {
    if (!this.systems.hasOwnProperty(sid)) continue;
    var s = this.systems[sid];
    if (s.ionSec > 0) {
      s.ionSec -= dt;
      if (s.ionSec <= 0) {
        s.ionSec = 0;
        if (sid === "shields") this.syncShieldLayers();
      }
    }
  }

  // cloak timers
  if (this.cloakActive > 0) {
    this.cloakActive -= dt;
    if (this.cloakActive <= 0) {
      this.cloakActive = 0;
      this.cloakCooldown = GAME_DATA.systems.cloaking.cooldown;
    }
  } else if (this.cloakCooldown > 0) this.cloakCooldown -= dt;
  if (this.teleportCooldown > 0) this.teleportCooldown -= dt;

  // door broken timers
  for (i = 0; i < this.doors.length; i++) {
    var d = this.doors[i];
    if (d.brokenTimer > 0) {
      d.brokenTimer -= dt;
      if (d.brokenTimer <= 0) { d.brokenTimer = 0; d.open = false; d.hitsTaken = 0; }
    }
  }

  // Zoltan bars recompute (§4.4)
  this.recomputeZoltanBars();

  // oxygen (§3.3, §7.6)
  this.tickOxygen(dt);

  // fire (§7.6)
  this.tickFires(dt);

  // room lockdown timers
  for (i = 0; i < this.rooms.length; i++) {
    if (this.rooms[i].lockdown > 0) this.rooms[i].lockdown = Math.max(0, this.rooms[i].lockdown - dt);
  }

  // budget enforcement each tick (cheap; handles ion storm etc.)
  this.enforcePowerBudget();
};

Ship.prototype.recomputeZoltanBars = function () {
  var sid, i;
  for (sid in this.systems) if (this.systems.hasOwnProperty(sid)) this.systems[sid].zoltanBars = 0;
  for (i = 0; i < this.crew.length; i++) {
    var c = this.crew[i];
    if (c.dead || c.race !== "zoltan" || c.ship !== this) continue;
    var room = this.roomAt(c.room);
    if (room && room.sys) {
      var s = this.sys(room.sys);
      if (s && !s.def.sub) s.zoltanBars++;
    }
  }
  this.syncShieldLayers();
};

Ship.prototype.tickOxygen = function (dt) {
  var i, room;
  var o2sys = this.sys("oxygen");
  var refill = 0;
  if (this.automated) return; // auto-ships have no O2 (§7.7)
  if (o2sys && o2sys.effectivePower() > 0) {
    refill = GAME_DATA.systems.oxygen.refillRate[Math.min(2, o2sys.effectivePower() - 1)];
  } else {
    refill = -GAME_DATA.systems.oxygen.drainUnpowered;
  }
  for (i = 0; i < this.rooms.length; i++) {
    room = this.rooms[i];
    var delta = refill * dt;
    // breach drain 3%/s per breach
    delta -= 3 * room.breaches.length * dt;
    // fire consumes O2 0.96%/s per fire
    delta -= 0.96 * room.fires.length * dt;
    room.o2 = Math.max(0, Math.min(100, room.o2 + delta));
  }
  // venting via open airlocks: 6%/s
  for (i = 0; i < this.doors.length; i++) {
    var d = this.doors[i];
    if (d.roomB === -1 && d.open) {
      room = this.roomAt(d.roomA);
      if (room) room.o2 = Math.max(0, room.o2 - 6 * dt);
    }
  }
  // diffusion through open internal doors: 4%/s difference-proportional
  for (i = 0; i < this.doors.length; i++) {
    var dd = this.doors[i];
    if (dd.roomB === -1 || !dd.open) continue;
    var a = this.roomAt(dd.roomA), b = this.roomAt(dd.roomB);
    if (!a || !b) continue;
    var diff = a.o2 - b.o2;
    var flow = diff * 0.04 * 4 * dt; // proportional equalization
    a.o2 = Math.max(0, Math.min(100, a.o2 - flow));
    b.o2 = Math.max(0, Math.min(100, b.o2 + flow));
  }
  // slug repair gel: auto-seal breaches
  if (this.hasAugment("slug_gel")) {
    for (i = 0; i < this.rooms.length; i++) {
      room = this.rooms[i];
      for (var bi = room.breaches.length - 1; bi >= 0; bi--) {
        room.breaches[bi].progress += dt / (12.5 / 0.75);
        if (room.breaches[bi].progress >= 1) room.breaches.splice(bi, 1);
      }
    }
  }
};

Ship.prototype.tickFires = function (dt) {
  var i, j, room;
  for (i = 0; i < this.rooms.length; i++) {
    room = this.rooms[i];
    for (j = room.fires.length - 1; j >= 0; j--) {
      var f = room.fires[j];
      // fire dies below 10% O2
      if (room.o2 < 10) {
        f.hp -= 8 * dt / 0.08 * 0.01; // starved: fade out ~ few seconds
        f.hp -= 25 * dt;
      }
      if (f.hp <= 0) { room.fires.splice(j, 1); continue; }
      // damage room system 0.08 bars/s
      if (room.sys) this.applyFireSystemDamage(room, 0.08 * dt);
      // spread roll every 5s
      f.spreadT -= dt;
      if (f.spreadT <= 0) {
        f.spreadT = 5;
        var p = 20 * (room.o2 / 100); // base spread probability % scaled by O2
        if (RNG.vol.chance(p)) this.spreadFireFrom(room);
      }
    }
  }
};
Ship.prototype.applyFireSystemDamage = function (room, amount) {
  var s = this.sys(room.sys);
  if (!s || s.damage >= s.level) return;
  var wasUp = s.effectiveLevel() > 0;
  s.damage = Math.min(s.level, s.damage + amount);
  if (wasUp && s.effectiveLevel() === 0) {
    if (!s.destroyedDealtHull) {
      s.destroyedDealtHull = true;
      this.applyHullDamage(1, null, true);
    }
    if (s.id === "weapons") Sim.Combat.onWeaponPoolChanged(this, false);
    if (s.id === "shields") this.syncShieldLayers();
  }
  if (s.power > s.effectiveLevel()) { s.power = s.effectiveLevel(); this.syncShieldLayers(); }
};
Ship.prototype.spreadFireFrom = function (room) {
  // same room free tile first, else adjacent room through doors (closed x0.57, blast x0.1)
  var maxTiles = room.w * room.h;
  if (room.fires.length < maxTiles && RNG.vol.chance(50)) {
    this.startFire(room.id);
    return;
  }
  var neighbors = [];
  for (var i = 0; i < this.doors.length; i++) {
    var d = this.doors[i];
    if (d.roomB === -1) continue;
    var other = null;
    if (d.roomA === room.id) other = d.roomB;
    else if (d.roomB === room.id) other = d.roomA;
    if (other == null) continue;
    var mult = 1;
    if (!d.open) mult = this.doorLevel() >= 2 ? 0.1 : 0.57;
    neighbors.push({ room: other, mult: mult });
  }
  if (!neighbors.length) return;
  var pick = RNG.vol.pick(neighbors);
  if (RNG.vol.chance(100 * pick.mult)) {
    var target = this.roomAt(pick.room);
    if (target && target.o2 >= 10) this.startFire(pick.room);
  }
};

// --- FTL --------------------------------------------------------------------
Ship.prototype.ftlChargeTime = function () {
  // §9.6 table by engine level; interpolate manned skill
  var base = [
    [67.9, 54.3], [53.1, 42.6], [43.6, 34.9], [36.9, 29.5],
    [32.1, 25.7], [28.3, 22.6], [25.4, 20.3], [23.0, 18.4]
  ];
  var engines = this.sys("engines");
  var lvl = engines ? Math.max(1, Math.min(8, engines.effectivePower() || 1)) : 1;
  var row = base[lvl - 1];
  var pilotSkill = this.manningSkill("piloting");
  var t = row[0];
  if (pilotSkill >= 0) t = row[0] + (row[1] - row[0]) * ((pilotSkill + 1) / 3);
  if (this.hasAugment("ftl_booster")) {
    var n = this.countAugment("ftl_booster");
    for (var i = 0; i < n; i++) t *= 0.8;
  }
  return t;
};
Ship.prototype.canChargeFtl = function () {
  var piloting = this.sys("piloting");
  if (!piloting || piloting.effectiveLevel() === 0) return false;
  if (this.manningSkill("piloting") < 0 && !this.automated) return false; // FTL needs manned piloting
  return true;
};

// --- Crystal lockdown --------------------------------------------------------
Ship.prototype.lockdownRoom = function (roomId) {
  var room = this.roomAt(roomId);
  if (room) room.lockdown = 12;
};

Sim.Ship = Ship;
Sim.ShipDoor = ShipDoor;
Sim.ShipSystem = ShipSystem;
