/* STARFALL - combat resolution: weapon lifecycle, projectiles, shields, ion,
   beams, bombs, drones (§6, §7, §8). */
"use strict";

(function () {

var Combat = {};
Sim.Combat = Combat;

// ---------------------------------------------------------------------------
// WeaponSlot (§7.2)
// ---------------------------------------------------------------------------
function WeaponSlot(weaponId, ship) {
  this.def = GAME_DATA.weaponById[weaponId];
  this.id = weaponId;
  this.ship = ship;
  this.powered = false;
  this.charge = 0;          // seconds accumulated
  this.target = null;       // {ship, room} or beam {ship, path:[roomIds], x1,y1,x2,y2}
  this.firingQueue = 0;     // shots remaining in current volley
  this.shotSpacing = 0;
  this.armed = false;       // player selected, waiting for target click
}
WeaponSlot.prototype.chargeTime = function () {
  var base = this.def.charge;
  var mult = 1;
  var mann = this.ship.manningSkill("weapons");
  if (mann >= 0) mult *= 1 + [0.10, 0.15, 0.20][mann];
  var rel = this.ship.countAugment("auto_reloader");
  if (rel > 0) mult *= (1 + 0.1 * rel);
  if (this.ship.bossChargeMult) mult /= this.ship.bossChargeMult;
  return base / mult;
};
WeaponSlot.prototype.ready = function () { return this.powered && this.charge >= this.chargeTime(); };
WeaponSlot.prototype.chargeFrac = function () { return Math.min(1, this.charge / this.chargeTime()); };

Combat.WeaponSlot = WeaponSlot;

// pool bookkeeping: how much weapon power is in use
function weaponPowerUsed(ship) {
  var used = 0;
  for (var i = 0; i < ship.weapons.length; i++) if (ship.weapons[i].powered) used += ship.weapons[i].def.power;
  return used;
}
Combat.weaponPowerUsed = weaponPowerUsed;

Combat.canPowerWeapon = function (ship, slot) {
  var ws = ship.sys("weapons");
  if (!ws) return false;
  return weaponPowerUsed(ship) + slot.def.power <= ws.effectivePower();
};
Combat.powerWeapon = function (ship, slot) {
  if (slot.powered) return true;
  if (!Combat.canPowerWeapon(ship, slot)) return false;
  slot.powered = true;
  return true;
};
Combat.depowerWeapon = function (ship, slot, manual) {
  if (!slot.powered) return;
  slot.powered = false;
  slot.armed = false;
  if (!manual) slot.charge = 0; // damage/ion depower loses charge (§7.2)
};
// When the weapons pool shrinks (damage/ion/manual), depower rightmost first.
Combat.onWeaponPoolChanged = function (ship, manual) {
  var ws = ship.sys("weapons");
  var cap = ws ? ws.effectivePower() : 0;
  for (var i = ship.weapons.length - 1; i >= 0 && weaponPowerUsed(ship) > cap; i--) {
    if (ship.weapons[i].powered) Combat.depowerWeapon(ship, ship.weapons[i], manual);
  }
};

// ---------------------------------------------------------------------------
// DroneSlot (§8)
// ---------------------------------------------------------------------------
function DroneSlot(droneId, ship) {
  this.def = GAME_DATA.droneById[droneId];
  this.id = droneId;
  this.ship = ship;
  this.powered = false;
  this.deployed = false;    // has consumed its part at this beacon
  this.destroyed = false;
  this.respawnT = 0;        // 10s cooldown after destroyed
  this.entity = null;       // active drone body (external orbiter or crew-drone)
  this.cooldown = 0;        // defense drone shot cooldown
  this.hullRepaired = 0;
  this.lifeT = 0;
}
Combat.DroneSlot = DroneSlot;

function dronePowerUsed(ship) {
  var used = 0;
  for (var i = 0; i < ship.drones.length; i++) if (ship.drones[i].powered) used += ship.drones[i].def.power;
  return used;
}
Combat.canPowerDrone = function (ship, slot) {
  var ds = ship.sys("droneCtrl");
  if (!ds) return false;
  return dronePowerUsed(ship) + slot.def.power <= ds.effectivePower();
};
Combat.powerDrone = function (ship, slot) {
  if (slot.powered || slot.destroyed && slot.respawnT > 0) return false;
  if (!Combat.canPowerDrone(ship, slot)) return false;
  if (!slot.deployed) {
    // deploying consumes 1 drone part (crew drones deploy permanently)
    var res = ship.isPlayer ? Game.run.resources : null;
    if (ship.isPlayer) {
      if (res.droneParts <= 0) return false;
      res.droneParts--;
      if (Game.stats) Game.stats.dronesDeployed = (Game.stats.dronesDeployed || 0) + 1;
      Game.runFlags.usedDrone = true;
    }
    slot.deployed = true;
    slot.destroyed = false;
    spawnDroneEntity(ship, slot);
  }
  slot.powered = true;
  if (slot.entity && slot.entity.crewBody) slot.entity.crewBody.disabled = false;
  return true;
};
Combat.depowerDrone = function (ship, slot) {
  slot.powered = false;
  if (slot.def.type === "utility" && slot.entity) {
    // hull repair drone wasted if depowered mid-flight (§8)
    slot.entity = null;
    slot.deployed = false;
    slot.destroyed = true;
    slot.respawnT = 0;
  }
  if (slot.entity && slot.entity.crewBody) slot.entity.crewBody.disabled = true;
};
Combat.onDronePoolChanged = function (ship) {
  var ds = ship.sys("droneCtrl");
  var cap = ds ? ds.effectivePower() : 0;
  for (var i = ship.drones.length - 1; i >= 0 && dronePowerUsed(ship) > cap; i--) {
    if (ship.drones[i].powered) Combat.depowerDrone(ship, ship.drones[i]);
  }
};

function spawnDroneEntity(ship, slot) {
  var enemy = Game.combat ? (ship.isPlayer ? Game.combat.enemy : Game.player) : null;
  if (slot.def.type === "crew") {
    // walks the ship like crew
    var body = new Sim.Crew("engi", slot.def.name, ship);
    body.isDrone = true;
    body.droneDef = slot.def;
    body.maxHp = slot.def.hp;
    body.hp = slot.def.hp;
    body.def = { name: slot.def.name, hp: slot.def.hp, moveMult: 1.0, repairMult: slot.def.id === "system_repair" ? 2.0 : 1.0, combatMult: 1.0 };
    ship.addCrew(body, ship.rooms[0].id);
    slot.entity = { crewBody: body };
  } else if (slot.def.type === "boarding") {
    if (!enemy || enemy.automated === undefined) {}
    slot.entity = { flight: 1.6, target: enemy };
  } else {
    // external orbiter
    slot.entity = { angle: RNG.vol.float(0, Math.PI * 2), fireT: 0, x: 0, y: 0 };
  }
}

// ---------------------------------------------------------------------------
// Projectiles
// ---------------------------------------------------------------------------
// proj: {cls, def, from:ship, to:ship, room, t (0..1), flight, canMiss, lockedBeforeCloak, visual{...}}
Combat.projectiles = [];

function spawnProjectile(fromShip, toShip, weaponDef, roomId, opts) {
  opts = opts || {};
  var p = {
    cls: weaponDef.cls, def: weaponDef, from: fromShip, to: toShip,
    room: roomId, t: 0,
    flight: weaponDef.cls === "railgun" ? 0.22 : (opts.flight || 0.6),
    canMiss: weaponDef.cls !== "beam" && weaponDef.cls !== "railgun" && !(weaponDef.cls === "bomb" && toShip === fromShip),
    lockedBeforeCloak: toShip.cloakActive <= 0,
    intercepted: false,
    missed: false,
    asteroid: !!opts.asteroid,
    fromDrone: !!opts.fromDrone,
    asb: !!opts.asb,
    shard: !!opts.shard
  };
  if (weaponDef.cls === "bomb") p.flight = 1.0; // warp-in flash 1s (§6.2)
  Combat.projectiles.push(p);
  return p;
}
Combat.spawnProjectile = spawnProjectile;

// Fire one volley from a weapon slot
Combat.fireWeapon = function (ship, slot) {
  var t = slot.target;
  if (!t || !t.ship || t.ship.destroyed) return false;
  var def = slot.def;
  // ammo
  if (def.missiles) {
    if (ship.isPlayer) {
      if (Game.run.resources.missiles < def.missiles) return false;
      Game.run.resources.missiles -= def.missiles;
      Game.runFlags.firedMissile = true;
    }
  }
  slot.charge = 0;
  // stealth: firing non-beam while cloaked cuts cloak (§3.2)
  if (ship.cloakActive > 0 && def.cls !== "beam" && !ship.hasAugment("stealth_weapons")) {
    ship.cloakActive = Math.max(0, ship.cloakActive - ship.cloakFullDuration * 0.2);
  }
  var mann = ship.manningSkill("weapons");
  if (mann >= 0) {
    for (var mi = 0; mi < ship.crew.length; mi++) {
      var mc = ship.crew[mi];
      if (!mc.dead && mc.room === (ship.roomOfSystem("weapons") || {}).id && mc.atStation) { mc.gainXp("weapons", GAME_DATA.skills.weapons.xpPerLevel / 4); break; }
    }
  }
  if (def.cls === "beam") {
    AudioEngine.play("beam");
    slot.fireAnimT = 0.6; // sustained emitter glow on the mount
    resolveBeam(ship, t.ship, def, t, slot);
    return true;
  }
  var shots = def.shots || 1;
  slot.firingQueue = shots;
  slot.queuedTarget = { ship: t.ship, room: t.room };
  slot.shotSpacing = 0; // first immediately
  return true;
};

function emitQueuedShot(ship, slot) {
  var def = slot.def;
  var tgt = slot.queuedTarget;
  if (!tgt || !tgt.ship || tgt.ship.destroyed) { slot.firingQueue = 0; return; }
  slot.fireAnimT = 0.35; // mount recoil + muzzle flash
  if (def.cls === "laser") AudioEngine.play("laser");
  else if (def.cls === "missile") AudioEngine.play("missile");
  else if (def.cls === "ion") AudioEngine.play("ionShot");
  else if (def.cls === "bomb") AudioEngine.play("bombWarp");
  else if (def.cls === "railgun") AudioEngine.play("railgun");
  var mp = null;
  if (window.FX && window.HUD && def.cls !== "bomb") {
    mp = HUD.muzzlePoint(ship, ship.weapons.indexOf(slot));
    FX.muzzle(mp.x, mp.y, ship.isPlayer ? 1 : -1,
      def.cls === "ion" ? "#9ADCFF" : def.cls === "missile" ? "#FFC08A" :
      def.cls === "railgun" ? "#9AE8FF" : "#FFE9A8");
    if (def.cls === "missile") FX.smoke(mp.x, mp.y, 4);
    if (def.cls === "railgun") {
      var tp2 = HUD.worldPoint(tgt.ship, tgt.room);
      FX.rail(mp.x, mp.y, tp2.x, tp2.y);
      FX.flash(mp.x, mp.y, 60, "#CFF2FF");
      if (Game) Game.shake = 0.3;
    }
  }
  var proj = spawnProjectile(ship, tgt.ship, def, tgt.room);
  if (proj && mp) proj.origin = mp;
}

// ---------------------------------------------------------------------------
// Hit resolution (§7.4)
// ---------------------------------------------------------------------------
function resolveHit(p) {
  var defender = p.to;
  var def = p.def;
  if (defender.destroyed) return;

  // EM Rail Gun (cheat): ignores cloak, evasion, all shields and defenses,
  // and detonates the target outright.
  if (p.cls === "railgun") {
    var railRoom = defender.roomAt(p.room) || pickRandomRoom(defender);
    defender.zoltanShield = 0;
    defender.shieldLayers = 0;
    if (window.FX && window.HUD) {
      var rp = HUD.worldPoint(defender, railRoom.id);
      FX.flash(rp.x, rp.y, 110, "#CFF2FF");
      FX.sparks(rp.x, rp.y, "#9AE8FF", 30);
      FX.smoke(rp.x, rp.y, 10);
    }
    AudioEngine.play("explosion");
    if (Game) Game.shake = 0.4;
    defender.applyHullDamage(99999, railRoom, true);
    return;
  }

  // cloak forced miss
  if (defender.cloakActive > 0 && !p.lockedBeforeCloak) { p.missed = true; return; }

  // evasion
  if (p.canMiss && !p.asb) {
    var ev = defender.evasion();
    if (RNG.vol.next() * 100 < ev) {
      p.missed = true;
      onDodge(defender);
      return;
    }
  } else if (p.asb) {
    var ev2 = defender.evasion();
    if (RNG.vol.next() * 100 < ev2) { p.missed = true; onDodge(defender); return; }
  }

  // Zoltan super-shield absorbs everything (bombs teleport past? no: super shield blocks)
  if (defender.zoltanShield > 0) {
    var drain = 1;
    if (def.cls === "ion") drain = (def.ionDamage || 1) * 2;
    else if (def.cls === "missile") drain = def.damage || 1;
    else if (def.cls === "bomb") drain = 1;
    defender.zoltanShield = Math.max(0, defender.zoltanShield - drain);
    AudioEngine.play("shieldHit");
    if (window.FX && window.HUD) {
      var zc = HUD.shipCenterPt(defender);
      FX.ring(zc.x, zc.y, 84, "#7DE65A");
    }
    return;
  }

  // ASB pierces everything (§10.5)
  if (p.asb) {
    var roomA = pickRandomRoom(defender);
    defender.applyHullDamage(3, roomA);
    defender.applySystemDamage(roomA, 3, "weapon");
    defender.startBreach(roomA.id);
    hurtCrewInRoom(defender, roomA, 45);
    AudioEngine.play("hullHit");
    return;
  }

  var room = defender.roomAt(p.room) || pickRandomRoom(defender);

  // shields vs lasers/asteroids
  if (def.cls === "laser" || p.asteroid || p.shard) {
    var pierce = def.pierce || 0;
    if (p.shard) pierce = 99;
    if (defender.shieldLayers > pierce) {
      defender.shieldLayers -= 1;
      defender.shieldRegenT = 0;
      AudioEngine.play("shieldHit");
      if (window.FX && window.HUD) {
        var sc = HUD.shipCenterPt(defender);
        FX.ring(sc.x, sc.y, 84, "#4FA7E8");
      }
      onShieldAbsorb(defender);
      return;
    }
  }
  if (def.cls === "ion") {
    if (defender.shieldLayers > 0) {
      defender.applyIon(defender.roomOfSystem("shields") || room, def.ionDamage || 1);
      AudioEngine.play("shieldHit");
      return;
    }
    defender.applyIon(room, def.ionDamage || 1);
    return;
  }

  // missiles ignore shields entirely; bombs teleport past
  applyWeaponDamage(defender, room, def, p);
}

function onDodge(ship) {
  // XP for pilot & engines manners (§5.4)
  var pilotRoom = ship.roomOfSystem("piloting");
  var engRoom = ship.roomOfSystem("engines");
  for (var i = 0; i < ship.crew.length; i++) {
    var c = ship.crew[i];
    if (c.dead || c.moving) continue;
    if (pilotRoom && c.room === pilotRoom.id) c.gainXp("piloting", GAME_DATA.skills.piloting.xpPerLevel / 5);
    if (engRoom && c.room === engRoom.id) c.gainXp("engines", GAME_DATA.skills.engines.xpPerLevel / 5);
  }
  if (ship.isPlayer && Game.achv) Game.achv.onDodge();
}
function onShieldAbsorb(ship) {
  var r = ship.roomOfSystem("shields");
  if (!r) return;
  for (var i = 0; i < ship.crew.length; i++) {
    var c = ship.crew[i];
    if (!c.dead && !c.moving && c.room === r.id) c.gainXp("shields", GAME_DATA.skills.shields.xpPerLevel / 6);
  }
  if (ship.isPlayer && Game.achv) Game.achv.onShieldAbsorbHit();
}

function pickRandomRoom(ship) {
  return ship.rooms[RNG.vol.int(0, ship.rooms.length - 1)];
}
Combat.pickRandomRoom = pickRandomRoom;

function hurtCrewInRoom(ship, room, dmg) {
  var all = ship.crew.concat(ship.intruders);
  for (var i = 0; i < all.length; i++) {
    var c = all[i];
    if (!c.dead && c.room === room.id) {
      c.hp -= dmg;
      if (c.hp <= 0) c.die();
    }
  }
}
Combat.hurtCrewInRoom = hurtCrewInRoom;

function applyWeaponDamage(defender, room, def, p) {
  var dmg = def.damage || 0;
  // hull-smasher style bonus vs systemless rooms
  if (def.dmgVsSystemless && !room.sys) dmg = def.dmgVsSystemless;

  if (def.cls === "bomb") {
    // bombs: no hull damage ever (§6.2)
    if (def.healsCrew) {
      var all = defender.crew.concat(defender.intruders);
      for (var i = 0; i < all.length; i++) {
        var c = all[i];
        if (!c.dead && c.room === room.id && c.homeShip === p.from) c.hp = Math.min(c.maxHp, c.hp + def.healsCrew);
        else if (!c.dead && c.room === room.id && p.from === defender) c.hp = Math.min(c.maxHp, c.hp + def.healsCrew);
      }
      AudioEngine.play("levelUp");
      return;
    }
    if (window.FX && window.HUD) {
      var bp = HUD.worldPoint(defender, room.id);
      FX.flash(bp.x, bp.y, 26, def.healsCrew ? "#A8F0B8" : "#BCE8FF");
    }
    if (def.ionDamage) { defender.applyIon(room, def.ionDamage); return; }
    if (def.sysDamage) defender.applySystemDamage(room, def.sysDamage, "weapon");
    if (def.crewDamage) hurtCrewInRoom(defender, room, def.crewDamage);
    if (def.fire === 100 && def.firesStarted) {
      var n = RNG.vol.int(def.firesStarted[0], def.firesStarted[1]);
      for (var f = 0; f < n; f++) defender.startFire(room.id);
    } else rollFireBreach(defender, room, def);
    if (def.breach >= 100) defender.startBreach(room.id);
    AudioEngine.play("hullHit");
    return;
  }

  defender.applyHullDamage(dmg, room);
  defender.applySystemDamage(room, dmg, "weapon");
  hurtCrewInRoom(defender, room, 15 * dmg);
  rollFireBreach(defender, room, def);
  AudioEngine.play("hullHit");
  if (window.FX && window.HUD) {
    var hp2 = HUD.worldPoint(defender, room.id);
    FX.flash(hp2.x, hp2.y, 22 + dmg * 8);
    FX.sparks(hp2.x, hp2.y, "#FFB25E", 6 + dmg * 5);
    if (dmg >= 2) FX.smoke(hp2.x, hp2.y, 4);
  }
  if (defender.isPlayer && Game.showTip && dmg > 0) Game.showTip("firstDamage");
  if (p.from && p.from.isPlayer && Game.achv) Game.achv.onPlayerDealtDamage();
}

function rollFireBreach(defender, room, def) {
  // fire rolls first; one shot never causes both (§6.1)
  var fire = def.fire || 0, breach = def.breach || 0;
  if (fire > 0 && RNG.vol.chance(fire)) {
    if (room.o2 >= 10) defender.startFire(room.id);
  } else if (breach > 0 && RNG.vol.chance(breach)) {
    defender.startBreach(room.id);
  }
}
Combat.rollFireBreach = rollFireBreach;

// ---------------------------------------------------------------------------
// Beams (§6.2): instant sweep; each room damaged once on line entry.
// ---------------------------------------------------------------------------
function resolveBeam(attacker, defender, def, target, slot) {
  if (defender.destroyed) return;
  if (defender.cloakActive > 0 && !target.lockedBeforeCloak) return;
  var rooms = target.path || [];
  if (!rooms.length && target.room != null) rooms = [target.room];
  var pierceAll = !!def.pierceAllShields;
  var hitCount = 0;
  if (defender.zoltanShield > 0) {
    defender.zoltanShield = Math.max(0, defender.zoltanShield - 2); // beams tick twice
    AudioEngine.play("shieldHit");
    return;
  }
  for (var i = 0; i < rooms.length; i++) {
    var room = defender.roomAt(rooms[i]);
    if (!room) continue;
    var dmg = def.damage || 0;
    if (def.dmgVsSystemless && !room.sys) dmg = def.dmgVsSystemless;
    if (!pierceAll) dmg = Math.max(0, dmg - defender.shieldLayers);
    if (dmg > 0) {
      defender.applyHullDamage(dmg, room);
      defender.applySystemDamage(room, dmg, "weapon");
    }
    // crew dmg 15 x damage per tile touched; approximate tiles touched = 2
    var crewDmg = def.crewDamagePerTile ? def.crewDamagePerTile * 2 : 15 * (def.damage || 0);
    if (defender.shieldLayers === 0 || pierceAll || def.crewDamagePerTile) {
      if (crewDmg > 0) hurtCrewInRoom(defender, room, crewDmg);
    }
    var fpt = def.firePerTile || 0;
    if (fpt > 0 && (defender.shieldLayers === 0 || pierceAll) && RNG.vol.chance(fpt)) {
      if (room.o2 >= 10) defender.startFire(room.id);
    }
    hitCount++;
  }
  if (attacker.isPlayer && Game.achv) Game.achv.onBeamSweep(hitCount, defender);
  var bOrigin = (window.HUD && slot && attacker.weapons) ? HUD.muzzlePoint(attacker, attacker.weapons.indexOf(slot)) : null;
  Combat.beamVisual = { from: attacker, to: defender, rooms: rooms.slice(), t: 0.5, origin: bOrigin };
}
Combat.resolveBeam = resolveBeam;

// Crystal Vengeance return shard
Combat.crystalVengeance = function (victim) {
  var attacker = victim.isPlayer ? (Game.combat && Game.combat.enemy) : Game.player;
  if (!attacker || attacker.destroyed) return;
  var def = { cls: "laser", damage: 1, fire: 0, breach: 10, shots: 1, name: "Crystal Shard" };
  var p = spawnProjectile(victim, attacker, def, pickRandomRoom(attacker).id);
  p.shard = true;
};

// ---------------------------------------------------------------------------
// Defense drones (§8.1)
// ---------------------------------------------------------------------------
function defenseDroneScan(ship, dt) {
  for (var i = 0; i < ship.drones.length; i++) {
    var slot = ship.drones[i];
    if (slot.def.type !== "defense" || !slot.powered || !slot.deployed || slot.destroyed) continue;
    if (slot.cooldown > 0) { slot.cooldown -= dt * 1000; continue; }
    // scan hostile projectiles inbound to this ship
    for (var pi = 0; pi < Combat.projectiles.length; pi++) {
      var p = Combat.projectiles[pi];
      if (p.to !== ship || p.intercepted || p.missed) continue;
      if (p.cls === "bomb") continue; // bombs bypass defense drones
      var canHit = false;
      if (p.cls === "missile" || p.asteroid || p.boardingDrone) canHit = true;
      if (slot.def.id === "defense_2" && (p.cls === "laser" || p.cls === "ion")) canHit = true;
      if (!canHit) continue;
      if (p.t < 0.25 || p.t > 0.9) continue;
      // Mk II can miss fast projectiles 20%
      if (slot.def.id === "defense_2" && RNG.vol.chance(20)) { slot.cooldown = slot.def.cooldownMs; break; }
      p.intercepted = true;
      slot.cooldown = slot.def.cooldownMs;
      AudioEngine.play("laser");
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Combat encounter object
// ---------------------------------------------------------------------------
function Encounter(enemyShip, opts) {
  opts = opts || {};
  this.enemy = enemyShip;
  this.active = true;
  this.hazard = opts.hazard || null;
  this.surrendered = false;
  this.surrenderOffered = false;
  this.surrenderData = null;
  this.enemyFled = false;
  this.playerFled = false;
  this.overtaken = !!opts.overtaken;
  this.strandedReward = !!opts.strandedReward;
  this.questReward = opts.questReward || null;
  this.crewKillBonus = !!opts.crewKillBonus;
  this.time = 0;
  this.enemyAI = new Sim.EnemyAI(enemyShip, this);
  this.result = null; // "win" | "crewkill" | "fled" | "enemyFled" | "surrender"
}
Combat.Encounter = Encounter;

// ---------------------------------------------------------------------------
// Main combat tick
// ---------------------------------------------------------------------------
Combat.tick = function (dt) {
  var player = Game.player;
  var enc = Game.combat;
  var enemy = enc ? enc.enemy : null;
  var i, slot;

  // ---- weapon charge & fire (both ships) ----
  var ships = [player];
  if (enemy && !enemy.destroyed) ships.push(enemy);
  for (var si = 0; si < ships.length; si++) {
    var ship = ships[si];
    var ws = ship.sys("weapons");
    for (i = 0; i < ship.weapons.length; i++) {
      slot = ship.weapons[i];
      if (!slot.def) continue;
      if (slot.powered && (!ws || ws.effectivePower() >= 0)) {
        if (slot.charge < slot.chargeTime()) {
          slot.charge += dt;
          if (slot.ready() && ship.isPlayer) AudioEngine.play("ftlReady");
        }
      }
      // mount fire animation decay
      if (slot.fireAnimT > 0) slot.fireAnimT -= dt;
      // volley queue
      if (slot.firingQueue > 0) {
        slot.shotSpacing -= dt;
        if (slot.shotSpacing <= 0) {
          slot.shotSpacing = 0.3; // §7.3 spacing
          slot.firingQueue--;
          emitQueuedShot(ship, slot);
        }
      }
      // auto-fire (§7.3)
      if (slot.ready() && slot.target && slot.target.ship && !slot.target.ship.destroyed) {
        var auto = ship.isPlayer ? Game.autoFire : true;
        if (auto && enc && enc.active) Combat.fireWeapon(ship, slot);
      }
    }
    // artillery (Federation Cruiser §3.2)
    var art = ship.sys("artillery");
    if (art && art.effectiveLevel() > 0 && enc && enc.active) {
      var artEnemy = ship.isPlayer ? enemy : player;
      if (artEnemy && !artEnemy.destroyed) {
        ship.artilleryCharge += dt;
        var lvl = art.effectiveLevel();
        var t = GAME_DATA.systems.artillery.chargeByLevel[Math.min(3, lvl - 1)];
        if (art.ionSec > 0) ship.artilleryCharge = Math.min(ship.artilleryCharge, t * 0.99);
        if (ship.artilleryCharge >= t) {
          ship.artilleryCharge = 0;
          var beamDef = { cls: "beam", damage: 1, beamLength: 500, firePerTile: 10, pierceAllShields: true, name: "Artillery Beam" };
          var path = [];
          for (var ri = 0; ri < artEnemy.rooms.length; ri++) path.push(artEnemy.rooms[ri].id);
          AudioEngine.play("beam");
          resolveBeam(ship, artEnemy, beamDef, { path: path, lockedBeforeCloak: artEnemy.cloakActive <= 0 });
        }
      }
    }
  }

  // ---- projectiles ----
  for (i = Combat.projectiles.length - 1; i >= 0; i--) {
    var p = Combat.projectiles[i];
    p.t += dt / p.flight;
    if (p.intercepted) { Combat.projectiles.splice(i, 1); continue; }
    if (p.t >= 1) {
      if (!p.missed) resolveHit(p);
      if (p.missed) {
        // fly-past: keep a moment for visuals
        if (p.t >= 1.5) Combat.projectiles.splice(i, 1);
      } else {
        Combat.projectiles.splice(i, 1);
      }
    }
  }
  if (Combat.beamVisual) {
    Combat.beamVisual.t -= dt;
    if (Combat.beamVisual.t <= 0) Combat.beamVisual = null;
  }

  // ---- drones ----
  Combat.tickDrones(player, dt);
  if (enemy && !enemy.destroyed) Combat.tickDrones(enemy, dt);
  defenseDroneScan(player, dt);
  if (enemy && !enemy.destroyed) defenseDroneScan(enemy, dt);

  // ---- enemy AI ----
  if (enc && enc.active && enemy && !enemy.destroyed) {
    enc.time += dt;
    enc.enemyAI.tick(dt);
  }
};

Combat.tickDrones = function (ship, dt) {
  var enc = Game.combat;
  var enemy = ship.isPlayer ? (enc && enc.enemy) : Game.player;
  for (var i = 0; i < ship.drones.length; i++) {
    var slot = ship.drones[i];
    if (slot.respawnT > 0) slot.respawnT -= dt;
    if (!slot.powered || !slot.deployed || slot.destroyed || !slot.entity) continue;
    var e = slot.entity;
    if (slot.def.type === "combat" && enemy && !enemy.destroyed && enc && enc.active) {
      e.angle += dt * (slot.def.speed / 40);
      e.fireT = (e.fireT || 0) + dt;
      var interval = slot.def.speed >= 25 ? 1.6 : 3.0;
      if (e.fireT >= interval) {
        e.fireT = 0;
        var room = pickRandomRoom(enemy);
        if (slot.def.beam) {
          // short beam: never misses, blocked by any layer
          if (enemy.zoltanShield > 0) { enemy.zoltanShield = Math.max(0, enemy.zoltanShield - 2); }
          else if (enemy.shieldLayers === 0) {
            enemy.applyHullDamage(1, room);
            enemy.applySystemDamage(room, 1, "weapon");
            hurtCrewInRoom(enemy, room, 15);
            if (RNG.vol.chance(10) && room.o2 >= 10) enemy.startFire(room.id);
            AudioEngine.play("beam");
          }
        } else {
          var def = { cls: "laser", damage: 1, fire: 10, breach: 0, shots: 1, name: slot.def.name };
          var p = spawnProjectile(ship, enemy, def, room.id, { fromDrone: true });
          AudioEngine.play("laser");
        }
      }
    } else if (slot.def.type === "boarding" && enemy && !enemy.destroyed) {
      if (e.flight > 0) {
        e.flight -= dt;
        if (e.flight <= 0) {
          // land: breach + become intruder
          var landRoom = pickRandomRoom(enemy);
          if (enemy.zoltanShield > 0) { slot.destroyed = true; slot.entity = null; slot.respawnT = 10; continue; }
          enemy.startBreach(landRoom.id);
          var body = new Sim.Crew("engi", "Boarding Drone", ship);
          body.isDrone = true;
          body.droneDef = slot.def;
          body.maxHp = slot.def.hp; body.hp = slot.def.hp;
          body.def = { name: "Boarding Drone", hp: slot.def.hp, moveMult: 0.8, repairMult: 0, combatMult: 1.0 };
          enemy.addCrew(body, landRoom.id);
          e.crewBody = body;
          if (ship.isPlayer && Game.achv) Game.achv.trackBoardingDrone(body);
        }
      } else if (e.crewBody && e.crewBody.dead) {
        slot.destroyed = true; slot.entity = null; slot.respawnT = 10; slot.deployed = false;
      }
    } else if (slot.def.type === "utility") {
      // hull repair: +1 hull per 2s until 3-5 total
      e.total = e.total == null ? RNG.vol.int(3, 5) : e.total;
      e.repT = (e.repT || 0) + dt;
      if (e.repT >= 2) {
        e.repT = 0;
        if (ship.hull < ship.hullMax && e.total > 0) {
          ship.hull++;
          e.total--;
          AudioEngine.play("coin");
        }
        if (e.total <= 0 || ship.hull >= ship.hullMax) {
          slot.entity = null;
          slot.deployed = false;
          slot.powered = false;
          slot.destroyed = true; // part consumed
          slot.respawnT = 0;
        }
      }
    } else if (slot.def.type === "crew" && e.crewBody) {
      if (e.crewBody.dead) { slot.destroyed = true; slot.entity = null; slot.respawnT = 10; slot.deployed = false; continue; }
      if (e.crewBody.disabled) continue;
      // AI: System Repair -> fires/breaches/damaged systems; Anti-Personnel -> intruders
      var b = e.crewBody;
      if (!b.moving) {
        var targetRoom = null;
        if (slot.def.id === "system_repair") {
          targetRoom = findRoomWith(ship, function (r) { return r.fires.length > 0; }) ||
                       findRoomWith(ship, function (r) { return r.breaches.length > 0; }) ||
                       findRoomWith(ship, function (r) { return r.sys && ship.sys(r.sys).damage > 0; });
        } else {
          var intr = null;
          for (var ii = 0; ii < ship.intruders.length; ii++) if (!ship.intruders[ii].dead) { intr = ship.intruders[ii]; break; }
          if (intr) targetRoom = ship.roomAt(intr.room);
        }
        if (targetRoom && b.room !== targetRoom.id) b.orderTo(targetRoom.id);
      }
    }
  }
};

function findRoomWith(ship, pred) {
  for (var i = 0; i < ship.rooms.length; i++) if (pred(ship.rooms[i])) return ship.rooms[i];
  return null;
}

// ---------------------------------------------------------------------------
// Teleporter (§3.2, §5.3)
// ---------------------------------------------------------------------------
Combat.canTeleport = function (ship, other) {
  var t = ship.sys("teleporter");
  if (!t || t.effectivePower() <= 0 || ship.teleportCooldown > 0) return false;
  if (!other || other.destroyed) return false;
  if (ship.cloakActive > 0 || other.cloakActive > 0) return false;
  if (other.zoltanShield > 0) return false;
  return true;
};
Combat.teleportSend = function (ship, other, targetRoomId) {
  if (!Combat.canTeleport(ship, other)) return false;
  var tRoom = ship.roomOfSystem("teleporter");
  if (!tRoom) return false;
  var pads = ship.teleporterPads || 2;
  var sent = 0;
  for (var i = 0; i < ship.crew.length && sent < pads; i++) {
    var c = ship.crew[i];
    if (c.dead || c.ship !== ship || c.room !== tRoom.id || c.isDrone) continue;
    ship.removeCrew(c);
    other.addCrew(c, targetRoomId);
    sent++;
  }
  if (sent > 0) {
    var t = ship.sys("teleporter");
    ship.teleportCooldown = GAME_DATA.systems.teleporter.cooldown[Math.min(2, t.effectivePower() - 1)];
    AudioEngine.play("teleport");
    return true;
  }
  return false;
};
Combat.teleportRetrieve = function (ship, other, roomId) {
  if (!Combat.canTeleport(ship, other)) return false;
  var retrieved = 0;
  var list = other.intruders.slice();
  for (var i = 0; i < list.length; i++) {
    var c = list[i];
    if (c.homeShip !== ship || c.dead) continue;
    if (roomId != null && c.room !== roomId) continue;
    other.removeCrew(c);
    ship.addCrew(c, (ship.roomOfSystem("teleporter") || ship.rooms[0]).id);
    retrieved++;
  }
  if (retrieved > 0) {
    var t = ship.sys("teleporter");
    ship.teleportCooldown = GAME_DATA.systems.teleporter.cooldown[Math.min(2, t.effectivePower() - 1)];
    AudioEngine.play("teleport");
    return true;
  }
  return false;
};

Combat.reset = function () {
  Combat.projectiles = [];
  Combat.beamVisual = null;
};

})();
