/* STARFALL - event engine: schema interpreter, blue options, weighted
   outcomes, quest chains, reward application (§11, §12.5). */
"use strict";

(function () {

var Events = {};
Sim.Events = Events;

// ---------------------------------------------------------------------------
// Blue-option requirement check (§11.1 grammar)
// ---------------------------------------------------------------------------
Events.blueMet = function (blue) {
  if (!blue) return true;
  var ship = Game.player;
  var run = Game.run;
  if (blue.race || blue.raceOr) {
    var hasRace = false;
    for (var i = 0; i < ship.crew.length; i++) {
      if (!ship.crew[i].dead && (ship.crew[i].race === blue.race || ship.crew[i].race === blue.raceOr)) { hasRace = true; break; }
    }
    if (blue.race && !blue.weaponOr && !hasRace) return false;
    if (blue.raceOr && blue.weaponOr) {
      var hasW = hasWeapon(ship, blue.weaponOr);
      if (!hasRace && !hasW) return false;
    } else if (blue.race && !hasRace) return false;
  }
  if (blue.weaponOr && !blue.raceOr) {
    if (!hasWeapon(ship, blue.weaponOr)) return false;
  }
  if (blue.system) {
    var m = blue.system.match(/^(\w+)>=(\d+)$/);
    if (m) {
      var s = ship.sys(m[1]);
      if (!s || s.level < parseInt(m[2], 10)) return false;
    }
  }
  if (blue.augment && !ship.hasAugment(blue.augment)) return false;
  if (blue.drone) {
    var found = false;
    for (var d = 0; d < ship.drones.length; d++) {
      if (blue.drone === "any" || ship.drones[d].def.type === blue.drone || ship.drones[d].id === blue.drone) { found = true; break; }
    }
    if (!found) return false;
  }
  if (blue.weaponPowerMin != null) {
    var ok = false;
    for (var w = 0; w < ship.weapons.length; w++) {
      var wd = ship.weapons[w].def;
      if (wd.cls === "ion" || (wd.damage || 0) >= 3 || wd.power >= blue.weaponPowerMin) { ok = true; break; }
    }
    if (!ok) return false;
  }
  return true;
};

function hasWeapon(ship, idOrCls) {
  for (var i = 0; i < ship.weapons.length; i++) {
    if (ship.weapons[i].id === idOrCls || ship.weapons[i].def.cls === idOrCls) return true;
  }
  for (var c = 0; c < ship.cargo.length; c++) {
    if (ship.cargo[c].type === "weapon" && ship.cargo[c].id === idOrCls) return true;
  }
  return false;
}

Events.choiceVisible = function (choice) {
  if (choice.blue && !Events.blueMet(choice.blue)) return false; // hidden when unmet (§2.8)
  return true;
};
Events.choiceEnabled = function (choice) {
  if (choice.requiresResource) {
    var res = Game.run.resources;
    for (var k in choice.requiresResource) {
      if (!choice.requiresResource.hasOwnProperty(k)) continue;
      if ((res[k] || 0) < choice.requiresResource[k]) return false;
    }
  }
  return true;
};

// ---------------------------------------------------------------------------
// Resolve a chosen option -> returns {text, startedFight, openedStore}
// ---------------------------------------------------------------------------
Events.resolveChoice = function (event, choice) {
  var outcome = RNG.run.weighted(choice.outcomes, function (o) { return o.weight; });
  var result = Events.applyEffects(outcome.effects || {}, event);
  result.text = outcome.text || "";
  return result;
};

Events.applyEffects = function (fx, event) {
  var run = Game.run;
  var res = run.resources;
  var ship = Game.player;
  var out = { startedFight: false, openedStore: false, rewards: [] };
  var S = run.sectorNumber + GAME_DATA.difficulty[run.difficulty].scrapTierShift;

  function gainScrap(n) {
    if (n === 0) return;
    if (n > 0) {
      if (ship.hasAugment("scrap_arm")) n = Math.floor(n * 1.1);
      if (ship.hasAugment("repair_arm")) {
        if (ship.hull < ship.hullMax) {
          ship.hull = Math.min(ship.hullMax, ship.hull + 2);
        }
        n = Math.floor(n * 0.85);
      }
      Game.stats.scrapCollected += n;
      run.scoreScrap += n;
      AudioEngine.play("coin");
    }
    res.scrap = Math.max(0, res.scrap + n);
    if (n > 0) out.rewards.push("+" + n + " scrap");
    else out.rewards.push(n + " scrap");
  }

  if (fx.tier) gainScrap(GAME_DATA.rewardTier(fx.tier, S, RNG.run));
  if (fx.scrap) gainScrap(Array.isArray(fx.scrap) ? RNG.run.int(fx.scrap[0], fx.scrap[1]) : fx.scrap);
  if (fx.scrapPct) gainScrap(Math.floor(res.scrap * fx.scrapPct / 100));
  if (fx.fuel) {
    var f = Array.isArray(fx.fuel) ? RNG.run.int(fx.fuel[0], fx.fuel[1]) : fx.fuel;
    res.fuel = Math.max(0, res.fuel + f);
    if (f) out.rewards.push((f > 0 ? "+" : "") + f + " fuel");
  }
  if (fx.missiles) {
    var mi = Array.isArray(fx.missiles) ? RNG.run.int(fx.missiles[0], fx.missiles[1]) : fx.missiles;
    res.missiles = Math.max(0, res.missiles + mi);
    if (mi) out.rewards.push((mi > 0 ? "+" : "") + mi + " missiles");
  }
  if (fx.droneParts) {
    var dp = Array.isArray(fx.droneParts) ? RNG.run.int(fx.droneParts[0], fx.droneParts[1]) : fx.droneParts;
    res.droneParts = Math.max(0, res.droneParts + dp);
    if (dp) out.rewards.push((dp > 0 ? "+" : "") + dp + " drone parts");
  }
  if (fx.hull) {
    if (fx.hull < 0) ship.applyHullDamage(-fx.hull, null, true);
    else ship.hull = Math.min(ship.hullMax, ship.hull + fx.hull);
    out.rewards.push((fx.hull > 0 ? "+" : "") + fx.hull + " hull");
  }
  if (fx.crewDamage) {
    // hurt 1-2 random crew
    var victims = [];
    for (var i = 0; i < ship.crew.length; i++) if (!ship.crew[i].dead && !ship.crew[i].isDrone) victims.push(ship.crew[i]);
    RNG.run.shuffle(victims);
    for (var v = 0; v < Math.min(2, victims.length); v++) {
      victims[v].hp -= fx.crewDamage;
      if (victims[v].hp <= 0) victims[v].die();
    }
  }
  if (fx.loseCrew) {
    var alive = [];
    for (var a = 0; a < ship.crew.length; a++) if (!ship.crew[a].dead && !ship.crew[a].isDrone) alive.push(ship.crew[a]);
    if (alive.length > 1) RNG.run.pick(alive).die();
  }
  if (fx.gainCrew) {
    if (ship.crew.length < 8) {
      var race = fx.gainCrew === "random" ? RNG.run.pick(["human", "human", "engi", "mantis", "rock", "zoltan", "slug"]) : fx.gainCrew;
      var c = new Sim.Crew(race, RNG.run.pick(GAME_DATA.crewNames), ship);
      ship.addCrew(c, ship.rooms[0].id);
      Game.stats.crewHired = (Game.stats.crewHired || 0) + 1;
      out.rewards.push("+1 crew (" + GAME_DATA.races[race].name + ")");
      if (Game.achv) Game.achv.check();
    } else out.rewards.push("crew offer (ship full)");
  }
  if (fx.gainWeapon) {
    var wid = fx.gainWeapon === "dropTable" ? Events.rollWeaponDrop(S) : fx.gainWeapon;
    if (wid) { Events.giveWeapon(wid); out.rewards.push("+" + GAME_DATA.weaponById[wid].name); }
  }
  if (fx.gainDrone) {
    var did = fx.gainDrone === "dropTable" ? Events.rollDroneDrop(S) : fx.gainDrone;
    if (did) { Events.giveDrone(did); out.rewards.push("+" + GAME_DATA.droneById[did].name); }
  }
  if (fx.gainAugment) {
    Events.giveAugment(fx.gainAugment);
    out.rewards.push("+" + GAME_DATA.augmentById[fx.gainAugment].name);
  }
  if (fx.removeAugment) {
    var ai = ship.augments.indexOf(fx.removeAugment);
    if (ai >= 0) ship.augments.splice(ai, 1);
  }
  if (fx.systemDamage) {
    for (var sd in fx.systemDamage) {
      if (!fx.systemDamage.hasOwnProperty(sd)) continue;
      var room = ship.roomOfSystem(sd);
      if (room) ship.applySystemDamage(room, fx.systemDamage[sd], "weapon");
    }
  }
  if (fx.startFires) {
    for (var sf = 0; sf < fx.startFires; sf++) ship.startFire(Sim.Combat.pickRandomRoom(ship).id);
  }
  if (fx.revealMap) Game.map.revealBeacons(fx.revealMap);
  if (fx.delayFleet) Game.map.fleetDelay += fx.delayFleet;
  if (fx.advanceFleet) Game.map.advanceFleet(fx.advanceFleet);
  if (fx.markQuestBeacon) Game.map.markQuestBeacon(fx.markQuestBeacon);
  if (fx.questFlag) run.questFlags[fx.questFlag] = true;
  if (fx.unlockShip) Game.unlockShip(fx.unlockShip, out);
  if (fx.revealCrystalSector) run.questFlags.crystal_gate = true;
  if (fx.trade) out.trade = fx.trade;
  if (fx.openStore) out.openedStore = true;
  if (fx.startFight) {
    out.startedFight = true;
    out.fight = fx.startFight;
  }
  return out;
};

// Drop rolls (§12.5): rarity-gated by sector
Events.rollWeaponDrop = function (S) {
  var cap = Math.min(5, 2 + Math.ceil(S / 2));
  var pool = [];
  for (var i = 0; i < GAME_DATA.weapons.length; i++) {
    var w = GAME_DATA.weapons[i];
    if (w.bossOnly || w.rarity === 0 || w.rarity > cap) continue;
    pool.push(w);
  }
  if (!pool.length) return null;
  return RNG.run.weighted(pool, function (w) { return 6 - w.rarity; }).id;
};
Events.rollDroneDrop = function (S) {
  var cap = Math.min(5, 2 + Math.ceil(S / 2));
  var pool = [];
  for (var i = 0; i < GAME_DATA.drones.length; i++) {
    var d = GAME_DATA.drones[i];
    if (d.rarity > cap) continue;
    pool.push(d);
  }
  if (!pool.length) return null;
  return RNG.run.weighted(pool, function (d) { return 6 - d.rarity; }).id;
};
Events.rollAugmentDrop = function (S) {
  var pool = [];
  for (var i = 0; i < GAME_DATA.augments.length; i++) {
    var a = GAME_DATA.augments[i];
    if (a.rarity === 0 || a.quest || a.price == null) continue;
    pool.push(a);
  }
  return pool.length ? RNG.run.pick(pool).id : null;
};

Events.giveWeapon = function (wid) {
  var ship = Game.player;
  if (ship.weapons.length < ship.weaponSlots) {
    var slot = new Sim.Combat.WeaponSlot(wid, ship);
    ship.weapons.push(slot);
  } else if (ship.cargo.length < 4) {
    ship.cargo.push({ type: "weapon", id: wid });
  } else {
    // convert to scrap
    var w = GAME_DATA.weaponById[wid];
    Game.run.resources.scrap += Math.floor((w.price || w.sellsFor * 2 || 20) / 2);
  }
};
Events.giveDrone = function (did) {
  var ship = Game.player;
  if (ship.sys("droneCtrl") && ship.drones.length < ship.droneSlots) {
    ship.drones.push(new Sim.Combat.DroneSlot(did, ship));
  } else if (ship.cargo.length < 4) {
    ship.cargo.push({ type: "drone", id: did });
  } else {
    var d = GAME_DATA.droneById[did];
    Game.run.resources.scrap += Math.floor(d.price / 2);
  }
};
Events.giveAugment = function (aid) {
  var ship = Game.player;
  if (ship.hasAugment(aid) && aid !== "auto_reloader" && aid !== "shield_booster" && aid !== "ftl_booster") {
    Game.run.resources.scrap += 25; // duplicate -> 25 scrap (§13)
    return;
  }
  if (ship.augments.length < 3) ship.augments.push(aid);
  else Game.run.resources.scrap += 25;
};

// ---------------------------------------------------------------------------
// Event selection per beacon (§11.2, §9.2)
// ---------------------------------------------------------------------------
Events.pickForBeacon = function (beacon) {
  var run = Game.run;
  var sector = run.sector;
  var faction = GAME_DATA.sectorFactionOf[sector.name] || "pirate";

  if (beacon.visited) {
    if (RNG.run.chance(15)) return GAME_DATA.eventById.revisit_ambush;
    return GAME_DATA.eventById.revisit;
  }
  if (beacon.overtaken) return GAME_DATA.eventById.overtaken;
  if (beacon.questEvent) {
    var qe = GAME_DATA.eventById[beacon.questEvent];
    if (qe) return qe;
  }
  if (beacon.type === "store") return GAME_DATA.eventById.store_generic;
  if (beacon.type === "exit" || beacon.type === "start") {
    return beacon.type === "exit" && RNG.run.chance(30) ? Events.pickFromPool("hostile", faction) : GAME_DATA.eventById.empty_1;
  }
  if (beacon.type === "hostile") {
    var roll = RNG.run.next() * 100;
    if (roll < 70) return Events.pickFromPool("hostile", faction);
    if (roll < 85) return RNG.run.pick([GAME_DATA.eventById.fight_hazard_ast, GAME_DATA.eventById.fight_hazard_sun]);
    return Events.pickFromPool("hostile", faction, true);
  }
  if (beacon.type === "distress") return Events.pickFromPool("distress", faction);
  if (beacon.type === "quest") return Events.pickQuestStart(faction);
  if (beacon.type === "empty") return RNG.run.pick([GAME_DATA.eventById.empty_1, GAME_DATA.eventById.empty_2, GAME_DATA.eventById.empty_3]);
  return Events.pickFromPool("neutral", faction);
};

Events.pickFromPool = function (pool, faction, flavored) {
  var candidates = [];
  var used = Game.run.usedEvents || (Game.run.usedEvents = {});
  for (var i = 0; i < GAME_DATA.events.length; i++) {
    var e = GAME_DATA.events[i];
    if (e.pools.indexOf(pool) < 0) continue;
    if (e.pools.indexOf("questTarget") >= 0) continue;
    // faction gating
    var hasFactionTag = false, matches = false;
    for (var p = 0; p < e.pools.length; p++) {
      if (e.pools[p].indexOf("faction:") === 0) {
        hasFactionTag = true;
        if (e.pools[p] === "faction:" + faction) matches = true;
      }
      if (e.pools[p].indexOf("requiresAugment:") === 0) {
        if (!Game.player.hasAugment(e.pools[p].split(":")[1])) { hasFactionTag = true; matches = false; break; }
      }
      if (e.pools[p].indexOf("requiresQuestFlag:") === 0) {
        if (!Game.run.questFlags[e.pools[p].split(":")[1]]) { hasFactionTag = true; matches = false; break; }
      }
    }
    if (hasFactionTag && !matches) continue;
    var weight = used[e.id] ? 1 : 10;
    candidates.push({ e: e, w: weight });
  }
  if (!candidates.length) return GAME_DATA.eventById.empty_1;
  var chosen = RNG.run.weighted(candidates, function (c) { return c.w; }).e;
  used[chosen.id] = (used[chosen.id] || 0) + 1;
  return chosen;
};

Events.pickQuestStart = function (faction) {
  var run = Game.run;
  var flags = run.questFlags;
  var pool = [];
  // ship-unlock chains gated by sector faction & profile
  var profile = Game.profile;
  function locked(id) { return !profile.unlockedShips[id]; }
  if (faction === "rebel" && locked("fed_a") && !flags.stronghold_done) pool.push("stronghold_1");
  if (faction === "zoltan" && locked("zoltan_a")) pool.push("zoltan_transport");
  if (faction === "mantis" && locked("mantis_a")) pool.push("legendary_raider");
  if (faction === "slug" && locked("slug_a")) pool.push("slug_home");
  if (faction === "rock" && locked("rock_a")) pool.push("rock_crypt");
  if (faction === "engi" && locked("stealth_a")) pool.push("engi_fleet");
  if (faction === "zoltan" && Game.player.hasAugment("stasis_pod")) pool.push("zoltan_lab");
  if (faction === "rock" && flags.crystal_awake && !flags.crystal_gate) pool.push("ancient_device");
  pool.push("lost_exp_1", "defector_1", "merc_contract", "mercenary_delay");
  var used = run.usedEvents || (run.usedEvents = {});
  var fresh = [];
  for (var i = 0; i < pool.length; i++) if (!used[pool[i]]) fresh.push(pool[i]);
  var id = RNG.run.pick(fresh.length ? fresh : pool);
  used[id] = (used[id] || 0) + 1;
  return GAME_DATA.eventById[id];
};

})();
