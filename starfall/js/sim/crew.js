/* STARFALL - Crew entity: pathfinding (BFS over tiles/doors), skills, melee,
   repair, firefighting, suffocation, medbay healing (§5). */
"use strict";

(function () {

var TILE_TIME = 0.55; // s per tile baseline (§5.3)

function Crew(race, name, ship) {
  this.race = race;
  this.def = GAME_DATA.races[race];
  this.name = name;
  this.homeShip = ship;    // owning side's ship
  this.ship = ship;        // ship the crew is physically on
  this.hp = this.def.hp;
  this.maxHp = this.def.hp;
  this.room = 0;
  this.tile = 0;           // tile index within room
  this.dead = false;
  this.moving = false;
  this.path = [];          // list of {room,tile}
  this.moveT = 0;
  this.atStation = true;
  this.order = null;       // {room} pending move order
  this.fighting = null;    // enemy crew ref
  this.repairingT = 0;
  this.savedStation = null; // {room,tile}
  this.walkFrame = 0;
  this.isDrone = false;
  this.hostileBoarder = false; // true while standing on the enemy's ship
  this.skills = { piloting: 0, engines: 0, shields: 0, weapons: 0, repair: 0, combat: 0 };
  this.lockdownCd = 0;     // crystal ability
  this.suffocating = false;
}

Crew.prototype.skillLevel = function (skill) {
  var xp = this.skills[skill] || 0;
  var per = GAME_DATA.skills[skill].xpPerLevel;
  if (this.race === "human") per = Math.floor(per * 0.9);
  if (xp >= per * 2) return 2;
  if (xp >= per) return 1;
  return 0;
};
Crew.prototype.gainXp = function (skill, amt) {
  var before = this.skillLevel(skill);
  this.skills[skill] = (this.skills[skill] || 0) + (amt || 1);
  var per = GAME_DATA.skills[skill].xpPerLevel;
  if (this.race === "human") per = Math.floor(per * 0.9);
  this.skills[skill] = Math.min(this.skills[skill], per * 2);
  if (this.skillLevel(skill) > before && this.homeShip && this.homeShip.isPlayer) {
    AudioEngine.play("levelUp");
  }
};

Crew.prototype.moveSpeed = function () {
  var mult = this.def.moveMult;
  if (this.homeShip && this.homeShip.hasAugment("mantis_pheromones")) mult *= 1.25;
  if (this.isDrone && this.homeShip && this.homeShip.hasAugment("drone_booster")) mult *= 1.25;
  return mult;
};

// ---- tile graph helpers ----------------------------------------------------
function tileKey(room, tile) { return room * 64 + tile; }
function tilePos(ship, room, tile) {
  var r = ship.roomAt(room);
  return { x: r.x + (tile % r.w) + 0.5, y: r.y + Math.floor(tile / r.w) + 0.5 };
}

// neighbors of a tile: same-room adjacent tiles + through-door tiles
function tileNeighbors(ship, room, tile) {
  var r = ship.roomAt(room);
  var out = [];
  var tx = tile % r.w, ty = Math.floor(tile / r.w);
  var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (var i = 0; i < dirs.length; i++) {
    var nx = tx + dirs[i][0], ny = ty + dirs[i][1];
    if (nx >= 0 && nx < r.w && ny >= 0 && ny < r.h) out.push({ room: room, tile: ny * r.w + nx });
  }
  // doors from this room
  for (var di = 0; di < ship.doors.length; di++) {
    var d = ship.doors[di];
    if (d.roomB === -1) continue;
    var other = d.roomA === room ? d.roomB : d.roomB === room ? d.roomA : null;
    if (other == null) continue;
    if (ship.roomAt(room).lockdown > 0 || ship.roomAt(other).lockdown > 0) continue;
    // door position must touch this tile's edge
    var pos = tilePos(ship, room, tile);
    var near = Math.abs(pos.x - d.x) + Math.abs(pos.y - d.y);
    if (near <= 1.01) {
      // enter the other room at the tile nearest the door
      var ro = ship.roomAt(other);
      var best = 0, bestD = 1e9;
      for (var t = 0; t < ro.w * ro.h; t++) {
        var tp = tilePos(ship, other, t);
        var dd = Math.abs(tp.x - d.x) + Math.abs(tp.y - d.y);
        if (dd < bestD) { bestD = dd; best = t; }
      }
      out.push({ room: other, tile: best, viaDoor: d });
    }
  }
  return out;
}

// BFS path from crew position to target room (any free tile). Doors open on passage.
Crew.prototype.findPath = function (targetRoom, targetTile) {
  var ship = this.ship;
  var start = { room: this.room, tile: this.tile };
  var seen = {};
  seen[tileKey(start.room, start.tile)] = true;
  var q = [{ node: start, prev: null }];
  var goal = null;
  while (q.length) {
    var cur = q.shift();
    if (cur.node.room === targetRoom && (targetTile == null || cur.node.tile === targetTile)) { goal = cur; break; }
    var ns = tileNeighbors(ship, cur.node.room, cur.node.tile);
    for (var i = 0; i < ns.length; i++) {
      var k = tileKey(ns[i].room, ns[i].tile);
      if (seen[k]) continue;
      seen[k] = true;
      q.push({ node: ns[i], prev: cur });
    }
  }
  if (!goal) return null;
  var path = [];
  var n = goal;
  while (n && n.prev) { path.unshift(n.node); n = n.prev; }
  return path;
};

Crew.prototype.orderTo = function (roomId, tile) {
  if (this.dead) return;
  var ship = this.ship;
  var room = ship.roomAt(roomId);
  if (!room) return;
  // pick a free tile
  var target = tile;
  if (target == null) {
    var occupied = {};
    for (var i = 0; i < ship.crew.length; i++) {
      var c = ship.crew[i];
      if (c === this || c.dead) continue;
      var dest = c.path.length ? c.path[c.path.length - 1] : { room: c.room, tile: c.tile };
      if (dest.room === roomId) occupied[dest.tile] = true;
    }
    for (var t = 0; t < room.w * room.h; t++) {
      if (!occupied[t]) { target = t; break; }
    }
    if (target == null) return; // room full
  }
  var path = this.findPath(roomId, target);
  if (!path) return;
  this.path = path;
  this.moving = path.length > 0;
  this.atStation = false;
  this.fighting = null;
  this.order = { room: roomId };
};

Crew.prototype.tick = function (dt) {
  if (this.dead) return;
  var ship = this.ship;
  var room = ship.roomAt(this.room);
  if (!room) return;
  if (this.lockdownCd > 0) this.lockdownCd -= dt;

  // ---- movement ----
  if (this.path.length) {
    this.moveT += dt * this.moveSpeed();
    this.walkFrame += dt * 6;
    if (this.moveT >= TILE_TIME) {
      this.moveT = 0;
      var step = this.path.shift();
      if (step.viaDoor) { step.viaDoor.open = true; setTimeout(function (d) { }, 0); }
      // pass through door: open it transiently
      this.room = step.room;
      this.tile = step.tile;
      if (!this.path.length) {
        this.moving = false;
        this.atStation = true;
        this.order = null;
      }
    }
  } else this.moving = false;

  // ---- environment damage ----
  room = ship.roomAt(this.room);
  // suffocation (§5.2): O2 <= 5%
  if (room.o2 <= 5 && !ship.automated) {
    var suffRate = this.race === "crystal" ? 3.2 : 6.4;
    if (this.isDrone) suffRate = 0;
    this.hp -= suffRate * dt;
    this.suffocating = true;
  } else this.suffocating = false;
  // fire damage (§5.2)
  if (room.fires.length > 0 && this.race !== "rock" && !this.isDrone) {
    this.hp -= 2.128 * room.fires.length * dt;
  }

  // ---- medbay healing ----
  var inMedbay = room.sys === "medbay";
  if (inMedbay && ship.isFriendlyTo(this)) {
    var mb = ship.sys("medbay");
    if (mb && mb.effectivePower() > 0 && room.breaches.length === 0 || (inMedbay && mb && mb.effectivePower() > 0 && room.o2 > 5)) {
      if (mb && mb.effectivePower() > 0 && !(room.breaches.length > 0 && room.o2 <= 5)) {
        this.hp = Math.min(this.maxHp, this.hp + GAME_DATA.systems.medbay.healRate[Math.min(2, mb.effectivePower() - 1)] * dt);
      }
    }
  }
  // med-bot dispersal: heal anywhere on own ship
  if (this.homeShip && this.homeShip === ship && ship.hasAugment("medbot_dispersal")) {
    var mb2 = ship.sys("medbay");
    if (mb2 && mb2.effectivePower() > 0) this.hp = Math.min(this.maxHp, this.hp + 1.6 * dt);
  }

  // ---- combat / work (only when not moving) ----
  if (!this.moving) {
    var enemy = this.findEnemyInRoom();
    if (enemy) {
      this.fightTick(enemy, dt);
    } else if (room.fires.length > 0 && !this.hostileBoarder) {
      this.fightFire(room, dt);
    } else if (room.breaches.length > 0 && !this.hostileBoarder && this.standingOnBreach(room)) {
      this.sealBreach(room, dt);
    } else if (this.hostileBoarder) {
      this.sabotage(room, dt);
    } else if (room.sys) {
      var s = ship.sys(room.sys);
      if (s && s.damage > 0 && room.fires.length === 0) this.repairSystem(s, dt);
    }
  }

  // death
  if (this.hp <= 0) this.die();
};

Crew.prototype.standingOnBreach = function (room) {
  for (var i = 0; i < room.breaches.length; i++) if (room.breaches[i].t === this.tile) return true;
  // walk onto the breach tile if free
  if (room.breaches.length) {
    this.tile = room.breaches[0].t;
    return true;
  }
  return false;
};

Crew.prototype.findEnemyInRoom = function () {
  var ship = this.ship;
  var list = ship.crew.concat(ship.intruders);
  for (var i = 0; i < list.length; i++) {
    var c = list[i];
    if (c.dead || c === this) continue;
    if (c.room === this.room && c.homeShip !== this.homeShip) return c;
  }
  return null;
};

Crew.prototype.fightTick = function (enemy, dt) {
  this.fightT = (this.fightT || 0) + dt;
  if (this.fightT >= 1) {
    this.fightT = 0;
    var dmg = RNG.vol.int(3, 7) * this.def.combatMult;
    var skill = this.skillLevel("combat");
    dmg *= 1 + [0, 0.10, 0.20][skill];
    if (enemy.isDrone && enemy.droneDef && enemy.droneDef.id === "anti_personnel") dmg *= 0.5;
    enemy.hp -= dmg;
    this.gainXp("combat", 1);
    if (enemy.hp <= 0) {
      enemy.die();
      this.gainXp("combat", 2);
    }
  }
};

Crew.prototype.fightFire = function (room, dt) {
  // pick a fire on/near this tile; extinguish rate: fires 100 hp; base 8%/s -> ~10.4s human
  var f = null;
  for (var i = 0; i < room.fires.length; i++) { if (room.fires[i].t === this.tile) { f = room.fires[i]; break; } }
  if (!f) { f = room.fires[0]; this.tile = f.t; }
  var rate = 9.6; // hp/s baseline (~10.4s per fire)
  if (this.race === "rock") rate = 16.1;
  else rate *= this.def.repairMult >= 2 ? 2 : 1;
  f.hp -= rate * dt;
  if (f.hp <= 0) {
    var idx = room.fires.indexOf(f);
    if (idx >= 0) room.fires.splice(idx, 1);
  }
};

Crew.prototype.sealBreach = function (room, dt) {
  var b = null;
  for (var i = 0; i < room.breaches.length; i++) { if (room.breaches[i].t === this.tile) { b = room.breaches[i]; break; } }
  if (!b) return;
  b.progress += (dt / 12.5) * this.def.repairMult;
  if (b.progress >= 1) {
    var idx = room.breaches.indexOf(b);
    if (idx >= 0) room.breaches.splice(idx, 1);
  }
};

Crew.prototype.repairSystem = function (s, dt) {
  var mult = this.def.repairMult;
  var skill = this.skillLevel("repair");
  mult *= 1 + [0, 0.10, 0.20][skill];
  s.repairProgress += (dt / 12.5) * mult;
  if (s.repairProgress >= 1) {
    s.repairProgress = 0;
    var frac = s.damage - Math.floor(s.damage);
    s.damage = Math.max(0, s.damage - (frac > 0.001 ? frac : 1));
    this.gainXp("repair", GAME_DATA.skills.repair.xpPerLevel / 3);
    if (s.effectiveLevel() > 0) s.destroyedDealtHull = false;
    if (this.homeShip && this.homeShip.trackDroneRepairs && this.isDrone) this.homeShip.trackDroneRepairs();
  }
};

Crew.prototype.sabotage = function (room, dt) {
  var ship = this.ship;
  if (!room.sys) return;
  var s = ship.sys(room.sys);
  if (!s || s.damage >= s.level) return;
  s.damageProgress += dt / 12.5;
  if (s.damageProgress >= 1) {
    s.damageProgress = 0;
    ship.applySystemDamage(room, 1, "sabotage");
    this.gainXp("combat", 1);
  }
};

Crew.prototype.die = function () {
  if (this.dead) return;
  this.dead = true;
  this.hp = 0;
  // Zoltan death explosion (§5.2): 15 dmg to enemies in the room
  if (this.race === "zoltan") {
    var ship = this.ship;
    var list = ship.crew.concat(ship.intruders);
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c.dead || c === this) continue;
      if (c.room === this.room && c.homeShip !== this.homeShip) {
        c.hp -= c.isDrone ? 7.5 : 15;
        if (c.hp <= 0) c.die();
      }
    }
  }
  if (this.homeShip && this.homeShip.isPlayer) {
    AudioEngine.play("crewDeath");
    if (Game && Game.onAutoPause) Game.onAutoPause("crewMemberDied");
    if (Game && Game.stats) Game.stats.crewLost = (Game.stats.crewLost || 0) + 1;
  }
  if (Game && Game.onCrewDeath) Game.onCrewDeath(this);
};

Crew.prototype.useLockdown = function () {
  if (this.race !== "crystal" || this.lockdownCd > 0 || this.dead) return false;
  this.ship.lockdownRoom(this.room);
  this.lockdownCd = 50;
  return true;
};

// Ship helper: is this crew allowed to use our medbay etc.
Sim.Ship.prototype.isFriendlyTo = function (crew) {
  return crew.homeShip === this;
};

// Register crew on a ship (position in start room or free tile)
Sim.Ship.prototype.addCrew = function (crew, roomId) {
  crew.ship = this;
  if (crew.homeShip === this) {
    if (this.crew.indexOf(crew) < 0) this.crew.push(crew);
  } else {
    if (this.intruders.indexOf(crew) < 0) this.intruders.push(crew);
    crew.hostileBoarder = true;
  }
  // find a free tile
  var room = roomId != null ? this.roomAt(roomId) : null;
  if (!room) {
    // prefer their system rooms / any room
    room = this.rooms[RNG.vol.int(0, this.rooms.length - 1)];
  }
  var occupied = {};
  var all = this.crew.concat(this.intruders);
  for (var i = 0; i < all.length; i++) {
    var c = all[i];
    if (c === crew || c.dead) continue;
    if (c.room === room.id) occupied[c.tile] = true;
  }
  crew.room = room.id;
  crew.tile = 0;
  for (var t = 0; t < room.w * room.h; t++) if (!occupied[t]) { crew.tile = t; break; }
  crew.path = [];
  crew.moving = false;
};

Sim.Ship.prototype.removeCrew = function (crew) {
  var i = this.crew.indexOf(crew);
  if (i >= 0) this.crew.splice(i, 1);
  i = this.intruders.indexOf(crew);
  if (i >= 0) this.intruders.splice(i, 1);
  crew.hostileBoarder = false;
};

Sim.Crew = Crew;
Sim.tilePos = tilePos;

})();
