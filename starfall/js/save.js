/* STARFALL - save / load: profile + suspended run in localStorage with
   in-memory fallback (§20). */
"use strict";

var Save = (function () {
  var PROFILE_KEY = "starfall.profile.v1";
  var RUN_KEY = "starfall.run.v1";
  var mem = {};
  var storageOk = true;

  function store() {
    try {
      var t = "__starfall_test__";
      window.localStorage.setItem(t, "1");
      window.localStorage.removeItem(t);
      return window.localStorage;
    } catch (e) {
      storageOk = false;
      return {
        getItem: function (k) { return mem[k] || null; },
        setItem: function (k, v) { mem[k] = v; },
        removeItem: function (k) { delete mem[k]; }
      };
    }
  }
  var S = store();

  function defaultProfile() {
    return {
      version: 1,
      unlockedShips: { kestrel_a: true },
      achievements: {},
      tipsShown: {},
      highScores: [],
      stats: { shipsDefeated: 0, beaconsExplored: 0, scrapCollected: 0, crewHired: 0, gamesWon: 0, gamesLost: 0 },
      options: {
        artDir: "vector",
        fullscreen: false, frameCap: true, dynamicBg: true, colorblind: false,
        eventDelay: "none", showPaths: true, achPopups: true, showTips: true,
        apEnemy: true, apIntruders: true, apBreach: true, apFire: true, apCrewDeath: true,
        sfxVolume: 70, musicVolume: 60
      }
    };
  }

  function loadProfile() {
    try {
      var raw = S.getItem(PROFILE_KEY);
      if (!raw) return defaultProfile();
      var p = JSON.parse(raw);
      if (!p || p.version !== 1 || !p.options || !p.unlockedShips) return defaultProfile();
      // merge defaults for new keys
      var d = defaultProfile();
      for (var k in d.options) if (d.options.hasOwnProperty(k) && p.options[k] == null) p.options[k] = d.options[k];
      if (!p.stats) p.stats = d.stats;
      if (!p.highScores) p.highScores = [];
      if (!p.tipsShown) p.tipsShown = {};
      return p;
    } catch (e) {
      return defaultProfile();
    }
  }

  function saveProfile() {
    try { S.setItem(PROFILE_KEY, JSON.stringify(Game.profile)); } catch (e) { storageOk = false; }
  }

  function hasRun() {
    try { return !!S.getItem(RUN_KEY); } catch (e) { return false; }
  }

  // --------------------------------------------------------------------------
  // Run serialization
  // --------------------------------------------------------------------------
  function serializeCrew(c) {
    return {
      race: c.race, name: c.name, hp: c.hp, room: c.room, tile: c.tile,
      skills: c.skills, dead: c.dead,
      saved: c.savedStation
    };
  }

  function serializeShip(ship) {
    var systems = {};
    for (var sid in ship.systems) {
      if (!ship.systems.hasOwnProperty(sid)) continue;
      var s = ship.systems[sid];
      systems[sid] = { level: s.level, damage: s.damage, power: s.power };
    }
    var weapons = [];
    for (var i = 0; i < ship.weapons.length; i++) {
      weapons.push({ id: ship.weapons[i].id, powered: ship.weapons[i].powered, charge: ship.weapons[i].charge });
    }
    var drones = [];
    for (var d = 0; d < ship.drones.length; d++) {
      drones.push({ id: ship.drones[d].id });
    }
    var crew = [];
    for (var c = 0; c < ship.crew.length; c++) {
      if (!ship.crew[c].isDrone && !ship.crew[c].dead) crew.push(serializeCrew(ship.crew[c]));
    }
    return {
      hull: ship.hull, reactor: ship.reactorLevel, systems: systems,
      weapons: weapons, drones: drones, crew: crew,
      augments: ship.augments.slice(), cargo: ship.cargo.slice()
    };
  }

  function saveRun() {
    var run = Game.run;
    if (!run) return;
    var payload = {
      version: 1,
      runSeed: run.runSeed,
      rngCalls: RNG.run.calls,
      difficulty: run.difficulty,
      sectorNumber: run.sectorNumber,
      sectorRow: run.sectorRow,
      sectorName: run.sector.name,
      sectorType: run.sector.type,
      sectorTree: run.sectorTree,
      beacons: run.beacons,
      startId: run.startId,
      exitId: run.exitId,
      currentBeaconId: run.currentBeaconId,
      fleetPos: Game.map.fleetPos,
      fleetDelay: Game.map.fleetDelay,
      shipId: run.shipId,
      shipName: run.shipName,
      shipFamily: run.shipFamily,
      resources: run.resources,
      questFlags: run.questFlags,
      usedEvents: run.usedEvents,
      scoreScrap: run.scoreScrap,
      beaconsVisited: run.beaconsVisited,
      shipsDefeated: run.shipsDefeated,
      jumpsSinceFlagship: run.jumpsSinceFlagship,
      flagship: run.flagship,
      cheats: run.cheats || null,
      runFlags: Game.runFlags,
      stats: Game.stats,
      ship: serializeShip(Game.player),
      savedAt: Date.now()
    };
    try { S.setItem(RUN_KEY, JSON.stringify(payload)); } catch (e) { storageOk = false; }
  }

  function loadRun() {
    try {
      var raw = S.getItem(RUN_KEY);
      if (!raw) return null;
      var p = JSON.parse(raw);
      if (!p || p.version !== 1 || !p.ship || !p.beacons) return "corrupt";
      return p;
    } catch (e) {
      return "corrupt";
    }
  }

  function clearRun() {
    try { S.removeItem(RUN_KEY); } catch (e) {}
  }

  function deleteProfile() {
    try { S.removeItem(PROFILE_KEY); S.removeItem(RUN_KEY); } catch (e) {}
    Game.profile = defaultProfile();
    saveProfile();
  }

  return {
    loadProfile: loadProfile, saveProfile: saveProfile,
    saveRun: saveRun, loadRun: loadRun, clearRun: clearRun, hasRun: hasRun,
    deleteProfile: deleteProfile,
    get storageWarning() { return !storageOk; }
  };
})();
