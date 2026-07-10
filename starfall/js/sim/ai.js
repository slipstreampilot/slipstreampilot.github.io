/* STARFALL - enemy ship AI (behavior tree, 1/s), enemy crew AI, fleeing and
   surrender logic (§7.8-§7.10). */
"use strict";

(function () {

function EnemyAI(ship, encounter) {
  this.ship = ship;
  this.enc = encounter;
  this.thinkT = 0;
  this.fleeing = false;
  this.fleeCharge = 0;
  this.fleeTime = 15;
  this.surrenderChecked = false;
  this.boardT = 8;
  this.cloakT = 0;
}

EnemyAI.prototype.tick = function (dt) {
  var ship = this.ship;
  var player = Game.player;
  if (ship.destroyed || !this.enc.active) return;

  // flee charge progresses continuously (§7.9)
  if (this.fleeing) {
    var piloting = ship.sys("piloting");
    var engines = ship.sys("engines");
    var frozen = (!piloting || piloting.effectiveLevel() === 0) || (!engines || engines.effectiveLevel() === 0);
    if (!frozen) {
      this.fleeCharge += dt;
      var need = this.fleeTime * (player.hasAugment("ftl_jammer") ? 2 : 1);
      if (this.fleeCharge >= need) {
        this.enc.enemyFled = true;
        this.enc.result = "enemyFled";
        this.enc.active = false;
        if (Game.onEnemyFled) Game.onEnemyFled();
        return;
      }
    }
  }

  this.thinkT -= dt;
  if (this.thinkT > 0) return;
  this.thinkT = 1; // evaluate 1/s

  var hullFrac = ship.hull / ship.hullMax;

  // flee decision
  var fleeThreshold = this.enc.fleeThreshold != null ? this.enc.fleeThreshold :
    ship.faction === "pirate" && ship.cowardly ? 0.40 :
    ship.faction === "rebel" ? 0.15 : 0.25;
  if (!this.fleeing && !ship.isBoss && hullFrac < fleeThreshold && this.canFlee()) {
    this.fleeing = true;
    if (Game.onEnemyFtlCharging) Game.onEnemyFtlCharging();
  }

  // surrender (§7.10) - evaluated once
  if (!this.surrenderChecked && !ship.isBoss && !ship.automated && !ship.elite) {
    var losing = ship.hull / ship.hullMax < player.hull / player.hullMax;
    var aliveCrew = 0;
    for (var ci = 0; ci < ship.crew.length; ci++) if (!ship.crew[ci].dead) aliveCrew++;
    if (hullFrac < 0.4 || (aliveCrew <= 2 && aliveCrew > 0 && losing)) {
      this.surrenderChecked = true;
      this.offerSurrender();
    }
  }

  // cloak use (flagship phase 1 & stealth enemies)
  if (ship.sys("cloaking") && ship.canCloak()) {
    this.cloakT -= 1;
    if (this.cloakT <= 0 && (player.weaponsAboutToFire() || RNG.vol.chance(20))) {
      ship.startCloak();
      this.cloakT = 18;
    }
  }

  // weapons: keep powered, pick targets (§7.8)
  this.manageWeapons();
  // crew management
  this.manageCrew();
  // drones: keep powered (defense first)
  this.manageDrones();
  // boarding
  this.manageBoarding();
};

EnemyAI.prototype.canFlee = function () {
  var p = this.ship.sys("piloting"), e = this.ship.sys("engines");
  return p && p.effectiveLevel() > 0 && e && e.effectiveLevel() > 0;
};

EnemyAI.prototype.offerSurrender = function () {
  var pool = [];
  for (var i = 0; i < GAME_DATA.surrenderOffers.length; i++) {
    var o = GAME_DATA.surrenderOffers[i];
    if (o.slaverOnly && !this.ship.slaver) continue;
    if (o.rare && !RNG.vol.chance(20)) continue;
    pool.push(o);
  }
  var offer = RNG.vol.pick(pool);
  this.enc.surrenderData = offer;
  if (Game.onSurrenderOffer) Game.onSurrenderOffer(offer);
};

EnemyAI.prototype.manageWeapons = function () {
  var ship = this.ship, player = Game.player;
  var ws = ship.sys("weapons");
  if (!ws) return;
  var cap = ws.effectivePower();
  var used = 0, i, slot;
  for (i = 0; i < ship.weapons.length; i++) {
    slot = ship.weapons[i];
    if (used + slot.def.power <= cap) { slot.powered = true; used += slot.def.power; }
    else { if (slot.powered) Sim.Combat.depowerWeapon(ship, slot, false); }
  }
  // targeting priority (§7.8)
  for (i = 0; i < ship.weapons.length; i++) {
    slot = ship.weapons[i];
    if (!slot.powered) continue;
    var targetRoom = this.pickTargetRoom(slot);
    if (targetRoom != null) {
      if (slot.def.cls === "beam") {
        slot.target = { ship: player, path: this.pickBeamPath(slot), lockedBeforeCloak: player.cloakActive <= 0 };
      } else {
        slot.target = { ship: player, room: targetRoom };
      }
    }
  }
};

EnemyAI.prototype.pickTargetRoom = function (slot) {
  var player = Game.player;
  var def = slot.def;
  var wantSys;
  if (player.shieldLayers > 0 || (player.sys("shields") && player.sys("shields").effectivePower() >= 2)) wantSys = "shields";
  else if (player.sys("weapons") && player.sys("weapons").isOnline()) wantSys = "weapons";
  else {
    var opts = ["piloting", "engines", "oxygen"];
    if (player.sys("medbay")) {
      for (var i = 0; i < player.crew.length; i++) if (!player.crew[i].dead && player.crew[i].hp < player.crew[i].maxHp) { opts.push("medbay"); break; }
    }
    wantSys = RNG.vol.pick(opts);
  }
  // missiles/bombs prefer shields/weapons; ion prefers shields (§7.8)
  if (def.cls === "ion" && player.sys("shields")) wantSys = "shields";
  if ((def.cls === "missile" || def.cls === "bomb") && player.sys("shields") && player.shieldLayers > 0) wantSys = "shields";
  var room = player.roomOfSystem(wantSys);
  if (!room) room = Sim.Combat.pickRandomRoom(player);
  return room.id;
};

EnemyAI.prototype.pickBeamPath = function (slot) {
  // sweep the longest available multi-room line avoiding empty rooms (approx:
  // pick 2-3 adjacent system rooms)
  var player = Game.player;
  var sysRooms = [];
  for (var i = 0; i < player.rooms.length; i++) if (player.rooms[i].sys) sysRooms.push(player.rooms[i]);
  if (!sysRooms.length) sysRooms = player.rooms;
  sysRooms.sort(function (a, b) { return a.x - b.x; });
  var start = RNG.vol.int(0, Math.max(0, sysRooms.length - 3));
  var count = Math.max(2, Math.round((slot.def.beamLength || 80) / 60));
  var path = [];
  for (var j = start; j < Math.min(sysRooms.length, start + count); j++) path.push(sysRooms[j].id);
  return path;
};

EnemyAI.prototype.manageCrew = function () {
  var ship = this.ship;
  // man shields > weapons > engines > piloting; idle repair; fight intruders; flee suffocation
  var stations = ["shields", "weapons", "engines", "piloting"];
  var claimed = {};
  var i, c;
  for (i = 0; i < ship.crew.length; i++) {
    c = ship.crew[i];
    if (c.dead || c.ship !== ship || c.isDrone) continue;
    var room = ship.roomAt(c.room);
    // flee suffocating rooms
    if (room && room.o2 <= 10) {
      var safe = null;
      for (var ri = 0; ri < ship.rooms.length; ri++) if (ship.rooms[ri].o2 > 50) { safe = ship.rooms[ri]; break; }
      if (safe && !c.moving) { c.orderTo(safe.id); continue; }
    }
    if (c.moving) continue;
    // fight intruders in room handled by crew tick; if intruders elsewhere & we're melee-strong, converge
    var intr = null;
    for (var ii = 0; ii < ship.intruders.length; ii++) if (!ship.intruders[ii].dead) { intr = ship.intruders[ii]; break; }
    if (intr && c.def.combatMult >= 1.0 && c.room !== intr.room && !claimed["fight" + intr.room]) {
      claimed["fight" + intr.room] = true;
      c.orderTo(intr.room);
      continue;
    }
    // repair damaged systems (priority shields, weapons, engines, O2)
    var repaired = false;
    var repPrio = ["shields", "weapons", "engines", "oxygen", "piloting"];
    for (var rp = 0; rp < repPrio.length; rp++) {
      var s = ship.sys(repPrio[rp]);
      if (s && s.damage >= 1 && !claimed["rep" + repPrio[rp]]) {
        var rRoom = ship.roomOfSystem(repPrio[rp]);
        if (rRoom && c.room !== rRoom.id) { c.orderTo(rRoom.id); }
        claimed["rep" + repPrio[rp]] = true;
        repaired = true;
        break;
      }
    }
    if (repaired) continue;
    // man stations
    for (var st = 0; st < stations.length; st++) {
      var sysId = stations[st];
      if (!ship.sys(sysId) || claimed[sysId]) continue;
      var sRoom = ship.roomOfSystem(sysId);
      if (!sRoom) continue;
      claimed[sysId] = true;
      if (c.room !== sRoom.id) c.orderTo(sRoom.id);
      break;
    }
  }
};

EnemyAI.prototype.manageDrones = function () {
  var ship = this.ship;
  var ds = ship.sys("droneCtrl");
  if (!ds) return;
  // defense drones always powered first (§7.8)
  var sorted = ship.drones.slice().sort(function (a, b) {
    var pa = a.def.type === "defense" ? 0 : 1;
    var pb = b.def.type === "defense" ? 0 : 1;
    return pa - pb;
  });
  for (var i = 0; i < sorted.length; i++) {
    var slot = sorted[i];
    if (!slot.powered && !slot.destroyed && Sim.Combat.canPowerDrone(ship, slot)) {
      if (!slot.deployed) { slot.deployed = true; slot.destroyed = false; spawnEnemyDroneEntity(ship, slot); }
      slot.powered = true;
    }
  }
};

function spawnEnemyDroneEntity(ship, slot) {
  if (slot.def.type === "crew") {
    var body = new Sim.Crew("engi", slot.def.name, ship);
    body.isDrone = true;
    body.droneDef = slot.def;
    body.maxHp = slot.def.hp; body.hp = slot.def.hp;
    body.def = { name: slot.def.name, hp: slot.def.hp, moveMult: 1.0, repairMult: 2.0, combatMult: 1.0 };
    ship.addCrew(body, ship.rooms[0].id);
    slot.entity = { crewBody: body };
  } else if (slot.def.type === "boarding") {
    slot.entity = { flight: 1.6 };
  } else {
    slot.entity = { angle: RNG.vol.float(0, Math.PI * 2), fireT: 0 };
  }
}
EnemyAI.prototype.spawnDroneEntity = spawnEnemyDroneEntity;

EnemyAI.prototype.manageBoarding = function () {
  var ship = this.ship, player = Game.player;
  var tp = ship.sys("teleporter");
  if (!tp || tp.effectivePower() <= 0) return;
  this.boardT -= 1;
  if (this.boardT > 0) return;
  if (!Sim.Combat.canTeleport(ship, player)) return;
  // send pairs to player weapons room, then medbay (§7.8)
  var tRoom = ship.roomOfSystem("teleporter");
  if (!tRoom) return;
  var ready = [];
  for (var i = 0; i < ship.crew.length; i++) {
    var c = ship.crew[i];
    if (!c.dead && c.ship === ship && !c.isDrone && c.hp > c.maxHp * 0.6) ready.push(c);
  }
  if (ready.length < 2 || ship.crew.length - ready.length > 4) { this.boardT = 6; return; }
  // move two into teleporter, then send
  var inTele = 0;
  for (var j = 0; j < ready.length && j < 2; j++) {
    if (ready[j].room === tRoom.id) inTele++;
    else if (!ready[j].moving) ready[j].orderTo(tRoom.id);
  }
  if (inTele >= 2) {
    var target = player.roomOfSystem("weapons") || player.roomOfSystem("medbay") || Sim.Combat.pickRandomRoom(player);
    Sim.Combat.teleportSend(ship, player, target.id);
    if (Game.onIntruders) Game.onIntruders();
    this.boardT = 25;
  } else this.boardT = 2;
};

// Boarder crew AI on the player's ship + retreat logic; also player boarders on enemy.
EnemyAI.boarderTick = function (ship) {
  // called 1/s from main: intruders pick targets (nearest crew in room > sabotage)
  for (var i = 0; i < ship.intruders.length; i++) {
    var b = ship.intruders[i];
    if (b.dead || b.moving) continue;
    var room = ship.roomAt(b.room);
    // flee low O2
    if (room && room.o2 <= 10) {
      for (var ri = 0; ri < ship.rooms.length; ri++) {
        if (ship.rooms[ri].o2 >= 50) { b.orderTo(ship.rooms[ri].id); break; }
      }
      continue;
    }
    // retreat to their ship medbay below 30% (via teleport if possible)
    if (!b.isDrone && b.hp < b.maxHp * 0.3 && b.homeShip && !b.homeShip.destroyed) {
      var homeAI = Game.combat && Game.combat.enemyAI;
      if (b.homeShip !== Game.player && Sim.Combat.canTeleport(b.homeShip, ship)) {
        Sim.Combat.teleportRetrieve(b.homeShip, ship, b.room);
        continue;
      }
    }
    var enemy = b.findEnemyInRoom();
    if (enemy) continue; // fight handled in crew tick
    // seek: nearest room with defender crew, else sabotage best system
    var target = null;
    var all = ship.crew;
    for (var ci = 0; ci < all.length; ci++) {
      if (!all[ci].dead && !all[ci].isDrone) { target = all[ci].room; break; }
    }
    if (room && room.sys && ship.sys(room.sys) && ship.sys(room.sys).damage < ship.sys(room.sys).level) {
      continue; // keep sabotaging here
    }
    if (target == null) {
      // sabotage: prefer weapons, shields
      var pref = ["weapons", "shields", "engines", "piloting", "oxygen", "medbay"];
      for (var pi = 0; pi < pref.length; pi++) {
        var r2 = ship.roomOfSystem(pref[pi]);
        if (r2 && ship.sys(pref[pi]).damage < ship.sys(pref[pi]).level) { target = r2.id; break; }
      }
    }
    if (target != null && b.room !== target) b.orderTo(target);
  }
};

// helper used by AI cloak logic
Sim.Ship.prototype.weaponsAboutToFire = function () {
  for (var i = 0; i < this.weapons.length; i++) {
    var w = this.weapons[i];
    if (w.powered && w.chargeFrac() > 0.8 && w.target) return true;
  }
  return false;
};

Sim.EnemyAI = EnemyAI;

// ---------------------------------------------------------------------------
// Enemy ship generation (§7.7)
// ---------------------------------------------------------------------------
Sim.generateEnemyShip = function (archetypeId, sector, rng) {
  var arch = GAME_DATA.enemyArchetypeById[archetypeId] || RNG.run.pick(GAME_DATA.enemyArchetypes);
  var S = Math.max(1, Math.min(8, sector));
  var diff = GAME_DATA.difficulty[Game.run ? Game.run.difficulty : "NORMAL"];
  var budget = 6 + 2 * S + 2 * (diff ? diff.budgetShift : 0);
  rng = rng || RNG.run;

  var hull = rng.int(arch.hull[0], arch.hull[1]);
  if (arch.kind === "assault" && S > 4) hull += 2 * (S - 4);
  if (arch.elite) { hull += 4; budget += 4; }

  // decide systems from budget
  var maxLayers = Math.min(4, Math.ceil(S / 2) + 1);
  var layers = Math.min(maxLayers, Math.floor(budget / 4));
  if (arch.automated && arch.kind === "scout") layers = Math.min(layers, 1);
  var spent = layers * 4; // 2 pts/layer -> shields level = layers*2
  var engineLvl = Math.min(S + 2, 2 + Math.floor((budget - spent) / 3), 8);
  engineLvl = Math.max(1, engineLvl);
  spent += engineLvl;

  var systems = {
    piloting: 1,
    engines: engineLvl
  };
  if (layers > 0) systems.shields = layers * 2;
  if (!arch.automated) {
    systems.oxygen = 1;
    if (rng.chance(50)) systems.medbay = 1;
    systems.doors = 1;
    if (rng.chance(40)) systems.sensors = 1;
  }
  if (arch.boarders && rng.chance(70)) systems.teleporter = 1;

  // pick weapons
  var weaponBudgetPower = Math.max(1, Math.floor(2 + S / 2));
  var rarityCap = Math.ceil(S / 2) + 1;
  var pool = [];
  for (var i = 0; i < GAME_DATA.weapons.length; i++) {
    var w = GAME_DATA.weapons[i];
    if (w.bossOnly || w.rarity === 0 || w.rarity > rarityCap) continue;
    if (arch.faction === "mantis" && (w.cls === "ion" || w.cls === "bomb")) continue;
    if (arch.preferIon && w.cls !== "ion" && rng.chance(50)) continue;
    if (arch.preferMissiles && w.cls !== "missile" && rng.chance(40)) continue;
    pool.push(w);
  }
  // starting basics always eligible
  pool.push(GAME_DATA.weaponById.basic_laser);
  pool.push(GAME_DATA.weaponById.dual_lasers);
  pool.push(GAME_DATA.weaponById.leto);
  var weapons = [];
  var wpower = 0;
  var guard = 0;
  while (wpower < weaponBudgetPower && weapons.length < 4 && guard++ < 30) {
    var pickw = rng.pick(pool);
    if (wpower + pickw.power > weaponBudgetPower + 1) continue;
    weapons.push(pickw.id);
    wpower += pickw.power;
  }
  if (!weapons.length) weapons.push("basic_laser");
  systems.weapons = Math.max(1, wpower);

  // drones
  var drones = [];
  if ((arch.preferDrones || rng.chance(20)) && S >= 2 && !arch.automated) {
    systems.droneCtrl = 2;
    var dpool = ["combat_1", "defense_1"];
    if (S >= 5) dpool.push("beam_drone_1", "defense_2");
    drones.push(rng.pick(dpool));
    if (arch.preferDrones && rng.chance(50)) drones.push(rng.pick(dpool));
    systems.droneCtrl = Math.max(2, Math.min(8, dronePowerNeed(drones)));
  }

  // build layout: small ships get compact spines
  var sysIds = [];
  for (var sid in systems) if (systems.hasOwnProperty(sid)) sysIds.push(sid);
  var layout = makeEnemyLayout(sysIds, arch.kind, rng);

  var ship = new Sim.Ship({
    isPlayer: false, name: arch.cls, cls: arch.cls, hullStyle: arch.hullStyle,
    hullMax: hull, reactor: 99, layout: layout, systems: systems,
    automated: arch.automated, faction: arch.faction
  });
  ship.reactorLevel = 99; // enemies always have exactly enough power (§7.7)
  ship.elite = !!arch.elite;
  ship.archetypeId = arch.id;
  ship.slaver = !!(arch.faction === "pirate" && rng.chance(25));
  ship.cowardly = arch.faction === "pirate" && rng.chance(50);

  // weapons slots
  for (var wi = 0; wi < weapons.length; wi++) {
    var slot = new Sim.Combat.WeaponSlot(weapons[wi], ship);
    slot.powered = true;
    slot.charge = rng.float(0, 2);
    ship.weapons.push(slot);
  }
  // drone slots
  for (var di = 0; di < drones.length; di++) {
    var dslot = new Sim.Combat.DroneSlot(drones[di], ship);
    ship.drones.push(dslot);
  }
  // crew
  if (!arch.automated) {
    var crewCount = rng.int(arch.crew[0], arch.crew[1]);
    var raceByFaction = { rebel: "human", pirate: "human", mantis: "mantis", engi: "engi", zoltan: "zoltan", rock: "rock", slug: "slug" };
    for (var c = 0; c < crewCount; c++) {
      var race = raceByFaction[arch.faction] || "human";
      if (arch.faction === "pirate" && rng.chance(30)) race = rng.pick(["human", "mantis", "engi", "rock"]);
      var crew = new Sim.Crew(race, GAME_DATA.races[race].name, ship);
      ship.addCrew(crew, ship.rooms[c % ship.rooms.length].id);
    }
  }
  // zoltan shield for zoltan ships in later sectors
  if (arch.faction === "zoltan" && S >= 4) {
    ship.augments.push("zoltan_shield");
    ship.zoltanShield = 5;
    ship.zoltanShieldMax = 5;
  }
  // auto-ships: self repair (handled in main tick)
  ship.selfRepair = arch.automated ? 20 : 0;
  ship.selfRepairT = 0;
  // fill power
  fillEnemyPower(ship);
  return ship;
};

function dronePowerNeed(drones) {
  var p = 0;
  for (var i = 0; i < drones.length; i++) p += GAME_DATA.droneById[drones[i]].power;
  return p;
}

function makeEnemyLayout(sysIds, kind, rng) {
  // compact 2-column layout
  var rooms = [];
  var id = 0;
  var main = [];
  var order = ["engines", "shields", "weapons", "droneCtrl", "teleporter", "medbay", "oxygen"];
  for (var i = 0; i < order.length; i++) if (sysIds.indexOf(order[i]) >= 0) main.push(order[i]);
  var extras = [];
  var subOrder = ["doors", "sensors"];
  for (var j = 0; j < subOrder.length; j++) if (sysIds.indexOf(subOrder[j]) >= 0) extras.push(subOrder[j]);
  var x = 0;
  function add(x0, y0, w, h, sys) { rooms.push({ id: id++, x: x0, y: y0, w: w, h: h, sys: sys || null }); }
  for (var m = 0; m < main.length; m++) {
    if (m % 2 === 0) add(x, 1, 2, 2, main[m]);
    else { add(x, 3, 2, 1, main[m]); x += 2; }
  }
  if (main.length % 2 === 1) x += 2;
  while (extras.length) { add(x, 1, 2, 1, extras.shift()); if (extras.length) add(x, 2, 2, 1, extras.shift()); x += 2; }
  add(x, 1, 1, 2, sysIds.indexOf("piloting") >= 0 ? "piloting" : null);
  return { rooms: rooms, airlocks: [] };
}

function fillEnemyPower(ship) {
  for (var sid in ship.systems) {
    if (!ship.systems.hasOwnProperty(sid)) continue;
    var s = ship.systems[sid];
    if (!s.def.sub) s.power = s.effectiveLevel();
  }
  ship.syncShieldLayers();
  ship.shieldLayers = ship.maxShieldLayers();
}
Sim.fillEnemyPower = fillEnemyPower;

})();
