/* STARFALL - environmental hazards at beacons (§10): asteroid fields, solar
   flares, nebulae, ion storms, anti-ship batteries. */
"use strict";

(function () {

function Hazards() {
  this.type = null;         // "asteroid" | "sun" | "nebula" | "ionStorm" | "asb"
  this.timer = 0;
  this.warnT = 0;           // countdown to imminent pulse (sun/asb)
  this.warning = false;
  this.asbFired = 0;
}

Hazards.prototype.set = function (type) {
  this.type = type || null;
  this.warning = false;
  this.warnT = 0;
  this.asbFired = 0;
  if (this.type === "asteroid") this.timer = RNG.vol.float(6, 14);
  else if (this.type === "sun") this.timer = RNG.vol.float(28, 34);
  else if (this.type === "asb") this.timer = RNG.vol.float(15, 20);
  else this.timer = 0;
  // ion storm halves reactor for the whole encounter (§4.5)
  var stormOn = this.type === "ionStorm";
  Game.player.ionStorm = stormOn;
  if (Game.combat && Game.combat.enemy) Game.combat.enemy.ionStorm = stormOn;
  // nebula: sensors dark (queried by UI)
};

Hazards.prototype.label = function () {
  var T = GAME_DATA.text;
  if (this.type === "asteroid") return T.asteroidField;
  if (this.type === "sun") return T.solarFlare;
  if (this.type === "ionStorm") return T.ionStorm;
  if (this.type === "asb") return T.asb;
  return null;
};

Hazards.prototype.tick = function (dt) {
  if (!this.type) return;
  var player = Game.player;
  var enemy = Game.combat && Game.combat.active ? Game.combat.enemy : null;

  if (this.type === "asteroid") {
    this.timer -= dt;
    if (this.timer <= 0) {
      // strike frequency increases with target's shield layers (§10.1)
      this.timer = RNG.vol.float(6, 14);
      this.asteroidWave(player);
      if (enemy && !enemy.destroyed) this.asteroidWave(enemy);
    }
  } else if (this.type === "sun") {
    if (!this.warning) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.warning = true;
        this.warnT = 5;
        AudioEngine.play("alarm");
      }
    } else {
      this.warnT -= dt;
      if (this.warnT <= 0) {
        this.warning = false;
        this.timer = RNG.vol.float(28, 34);
        this.flareHit(player);
        if (enemy && !enemy.destroyed) this.flareHit(enemy);
      }
    }
  } else if (this.type === "asb") {
    // fires at the PLAYER only (§10.5)
    if (!this.warning) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.warning = true;
        this.warnT = RNG.vol.float(5, 10);
        AudioEngine.play("alarm");
      }
    } else {
      this.warnT -= dt;
      if (this.warnT <= 0) {
        this.warning = false;
        this.timer = RNG.vol.float(15, 20);
        this.asbFired++;
        var def = { cls: "missile", damage: 3, fire: 0, breach: 100, name: "Anti-Ship Battery" };
        var p = Sim.Combat.spawnProjectile({ isPlayer: false, name: "ASB" }, player, def, Sim.Combat.pickRandomRoom(player).id, { asb: true, flight: 1.2 });
      }
    }
  }
};

Hazards.prototype.asteroidWave = function (ship) {
  var n = RNG.vol.int(1, 3);
  // frequency scaling handled by count bonus per layer
  n += Math.floor(ship.shieldLayers / 2);
  for (var i = 0; i < n; i++) {
    var def = { cls: "laser", damage: 1, fire: 5, breach: 10, name: "Asteroid" };
    Sim.Combat.spawnProjectile({ isPlayer: !ship.isPlayer, name: "Field" }, ship, def,
      Sim.Combat.pickRandomRoom(ship).id, { asteroid: true, flight: RNG.vol.float(0.7, 1.4) });
  }
};

Hazards.prototype.flareHit = function (ship) {
  // shields up: 1-2 fires; down: 2-6 (§10.2)
  var n = ship.shieldLayers > 0 ? RNG.vol.int(1, 2) : RNG.vol.int(2, 6);
  for (var i = 0; i < n; i++) {
    var room = Sim.Combat.pickRandomRoom(ship);
    var hadFire = room.fires.length > 0;
    if (room.o2 >= 10) {
      ship.startFire(room.id);
      if (!hadFire && room.fires.length > 0) {
        ship.applyHullDamage(1, room, true);
        ship.applySystemDamage(room, 1, "weapon");
      }
    }
  }
  AudioEngine.play("explosion");
};

Hazards.prototype.sensorsDark = function () { return this.type === "nebula"; };

Sim.Hazards = Hazards;

})();
