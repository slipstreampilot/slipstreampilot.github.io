/* STARFALL - sector-select tree, beacon graph generation, rebel fleet pursuit,
   fuel logic (§9). */
"use strict";

(function () {

var GameMap = {};
Sim.GameMap = GameMap;

// ---------------------------------------------------------------------------
// Sector-select tree (§9.1): 8 columns, planar wiring.
// ---------------------------------------------------------------------------
GameMap.generateSectorTree = function (rng) {
  var cols = [];
  var usedOnce = {}; // depth-gated once-per-run names
  for (var c = 0; c < 8; c++) {
    var nodes = [];
    if (c === 0) {
      nodes.push({ name: "Civilian Sector", type: "civilian", col: 0, row: 0 });
    } else if (c === 7) {
      nodes.push({ name: "The Last Stand", type: "lastStand", col: 7, row: 0 });
    } else {
      var count = rng.int(2, 4);
      var hasGreen = false;
      for (var n = 0; n < count; n++) {
        var t = pickSectorType(rng, c, usedOnce);
        if (t.type === "civilian") hasGreen = true;
        nodes.push({ name: t.name, type: t.type, col: c, row: n });
      }
      // guarantee >=1 green option in columns 2-5 (index 1-4)
      if (!hasGreen && c >= 1 && c <= 4) {
        nodes[rng.int(0, nodes.length - 1)] = { name: "Civilian Sector", type: "civilian", col: c, row: 0 };
        for (var rn = 0; rn < nodes.length; rn++) nodes[rn].row = rn;
      }
    }
    cols.push(nodes);
  }
  // planar wiring: each node connects to 1-3 nodes of next column without crossings
  for (var cc = 0; cc < 7; cc++) {
    var a = cols[cc], b = cols[cc + 1];
    for (var i = 0; i < a.length; i++) {
      a[i].next = [];
      // map row range proportionally
      var lo = Math.floor(i * b.length / a.length);
      var hi = Math.floor((i + 1) * b.length / a.length);
      if (hi <= lo) hi = lo + 1;
      hi = Math.min(hi, b.length);
      for (var j = lo; j < hi; j++) a[i].next.push(j);
      // add one extra edge sometimes (stay planar: adjacent index)
      if (hi < b.length && rng.chance(50)) a[i].next.push(hi);
    }
    // ensure every b node reachable
    for (var bj = 0; bj < b.length; bj++) {
      var reachable = false;
      for (var ai = 0; ai < a.length; ai++) if (a[ai].next.indexOf(bj) >= 0) reachable = true;
      if (!reachable) a[a.length - 1].next.push(bj);
    }
  }
  return cols;
};

function pickSectorType(rng, col, usedOnce) {
  var roll = rng.next() * 100;
  var type = roll < 48 ? "civilian" : roll < 80 ? "hostile" : "nebula";
  var names;
  if (type === "civilian") {
    names = ["Civilian Sector", "Engi Controlled Sector", "Zoltan Controlled Sector"];
  } else if (type === "hostile") {
    names = ["Pirate Controlled Sector", "Mantis Controlled Sector", "Rebel Controlled Sector", "Rock Controlled Sector"];
    if (col >= 4 && !usedOnce.stronghold && rng.chance(12)) {
      usedOnce.stronghold = true;
      return { type: "hostile", name: "Rebel Stronghold" };
    }
  } else {
    names = ["Slug Controlled Nebula", "Uncharted Nebula"];
    if (col < 3) names = ["Uncharted Nebula"];
  }
  var name = rng.pick(names);
  // depth gates (§9.1)
  if ((name === "Engi Controlled Sector" || name === "Zoltan Controlled Sector" || name === "Mantis Controlled Sector") && col < 2) name = type === "civilian" ? "Civilian Sector" : "Pirate Controlled Sector";
  if (name === "Rock Controlled Sector" && col < 4) name = "Pirate Controlled Sector";
  if (name === "Slug Controlled Nebula" && col < 3) name = "Uncharted Nebula";
  return { type: type, name: name };
}

// ---------------------------------------------------------------------------
// Beacon graph per sector (§9.2)
// ---------------------------------------------------------------------------
GameMap.generateBeacons = function (sectorName, sectorType, rng, isLastStand) {
  var count = rng.int(19, 24);
  var beacons = [];
  // 6x4 jittered grid in map space (0..1)
  var cells = [];
  for (var gy = 0; gy < 4; gy++) for (var gx = 0; gx < 6; gx++) cells.push({ gx: gx, gy: gy });
  rng.shuffle(cells);
  for (var i = 0; i < count && i < cells.length; i++) {
    var cell = cells[i];
    beacons.push({
      id: i,
      x: (cell.gx + 0.5) / 6 + rng.float(-0.055, 0.055),
      y: (cell.gy + 0.5) / 4 + rng.float(-0.08, 0.08),
      type: "neutral", visited: false, known: false, overtaken: false,
      hazard: null, nebula: false, questEvent: null, edges: [],
      storeStock: null
    });
  }
  // connect neighbors within radius; ensure connected
  var r = 0.28;
  for (var a = 0; a < beacons.length; a++) {
    for (var b = a + 1; b < beacons.length; b++) {
      var dx = beacons[a].x - beacons[b].x, dy = (beacons[a].y - beacons[b].y) * 0.8;
      if (Math.sqrt(dx * dx + dy * dy) < 0.19) {
        beacons[a].edges.push(b);
        beacons[b].edges.push(a);
      }
    }
  }
  // connectivity fix: link each unreached beacon to nearest reached
  var reached = { 0: true };
  var frontier = [0];
  while (frontier.length) {
    var cur = frontier.pop();
    for (var e = 0; e < beacons[cur].edges.length; e++) {
      var nb = beacons[cur].edges[e];
      if (!reached[nb]) { reached[nb] = true; frontier.push(nb); }
    }
  }
  for (var u = 0; u < beacons.length; u++) {
    if (reached[u]) continue;
    var best = -1, bestD = 1e9;
    for (var v = 0; v < beacons.length; v++) {
      if (!reached[v]) continue;
      var ddx = beacons[u].x - beacons[v].x, ddy = beacons[u].y - beacons[v].y;
      var d = ddx * ddx + ddy * ddy;
      if (d < bestD) { bestD = d; best = v; }
    }
    if (best >= 0) {
      beacons[u].edges.push(best);
      beacons[best].edges.push(u);
      reached[u] = true;
      // re-flood
      frontier = [u];
      while (frontier.length) {
        var cur2 = frontier.pop();
        for (var e2 = 0; e2 < beacons[cur2].edges.length; e2++) {
          var nb2 = beacons[cur2].edges[e2];
          if (!reached[nb2]) { reached[nb2] = true; frontier.push(nb2); }
        }
      }
    }
  }

  // START (leftmost third) & EXIT (rightmost sixth)
  var sorted = beacons.slice().sort(function (p, q) { return p.x - q.x; });
  var start = sorted[rng.int(0, Math.floor(sorted.length / 3) - 1)];
  var exit = sorted[sorted.length - 1 - rng.int(0, Math.max(0, Math.floor(sorted.length / 6) - 1))];
  start.type = "start";
  exit.type = "exit";

  // composition (§9.2)
  var comp = compositionFor(sectorName, sectorType, rng, isLastStand);
  var free = [];
  for (var f = 0; f < beacons.length; f++) if (beacons[f].type === "neutral") free.push(beacons[f]);
  rng.shuffle(free);
  function assign(type, n) {
    for (var k = 0; k < n && free.length; k++) free.pop().type = type;
  }
  assign("store", comp.stores);
  assign("quest", comp.quests);
  assign("distress", comp.distress);
  assign("hostile", comp.hostile);
  assign("empty", comp.empty);
  assign("repair", comp.repair || 0);

  // nebula flags
  var nebulaCount = comp.nebula || 0;
  var all = beacons.slice();
  rng.shuffle(all);
  for (var nb3 = 0; nb3 < all.length && nebulaCount > 0; nb3++) {
    if (all[nb3].type !== "start") { all[nb3].nebula = true; nebulaCount--; }
  }
  if (sectorType === "nebula") {
    for (var nn = 0; nn < beacons.length; nn++) if (rng.chance(75)) beacons[nn].nebula = true;
  }
  // hazards on ~20% of non-nebula beacons
  for (var hz = 0; hz < beacons.length; hz++) {
    var bc = beacons[hz];
    if (bc.type === "start") continue;
    if (bc.nebula) {
      if (rng.chance(20)) bc.hazard = "ionStorm";
      else bc.hazard = "nebula";
    } else if (rng.chance(20)) {
      bc.hazard = rng.pick(["asteroid", "sun"]);
    }
  }
  // visibility: store/distress labels known within 1 jump (computed at runtime);
  // EXIT & quest visible map-wide
  exit.known = true;

  return { beacons: beacons, startId: start.id, exitId: exit.id };
};

function compositionFor(name, type, rng, isLastStand) {
  if (isLastStand) return { stores: 1, repair: 3, hostile: 6, distress: 0, quests: 0, empty: 0, nebula: 0 };
  switch (name) {
    case "Engi Controlled Sector": return { stores: rng.int(2, 3), distress: rng.int(1, 3), hostile: rng.int(5, 7), quests: 1, empty: rng.int(1, 2), nebula: 0 };
    case "Zoltan Controlled Sector": return { stores: 2, distress: rng.int(1, 2), hostile: rng.int(6, 8), quests: rng.int(0, 1), empty: 1, nebula: rng.int(2, 6) };
    case "Mantis Controlled Sector": return { stores: rng.int(1, 2), distress: rng.int(1, 3), hostile: rng.int(6, 7), quests: 1, empty: rng.int(2, 3), nebula: 0 };
    case "Rock Controlled Sector": return { stores: 2, distress: rng.int(1, 2), hostile: rng.int(6, 8), quests: rng.int(0, 1), empty: rng.int(2, 3), nebula: 0 };
    case "Pirate Controlled Sector":
    case "Rebel Controlled Sector":
    case "Rebel Stronghold": return { stores: rng.int(1, 2), distress: rng.int(1, 2), hostile: rng.int(6, 8), quests: rng.int(0, 2), empty: 1, nebula: rng.int(0, 5) };
    case "Slug Controlled Nebula": return { stores: rng.int(2, 3), distress: rng.int(3, 4), hostile: rng.int(6, 9), quests: 1, empty: 1, nebula: 99 };
    case "Uncharted Nebula": return { stores: rng.int(1, 2), distress: rng.int(1, 3), hostile: rng.int(5, 6), quests: rng.int(0, 1), empty: 1, nebula: 99 };
    default: // Civilian
      return { stores: rng.int(2, 3), distress: rng.int(1, 2), hostile: rng.int(6, 8), quests: rng.int(0, 2), empty: rng.int(1, 2), nebula: rng.int(0, 3) };
  }
}

// ---------------------------------------------------------------------------
// Runtime map controller (owned by Game.run)
// ---------------------------------------------------------------------------
function MapController(run) {
  this.run = run;
  this.fleetPos = -2.0;    // beacon-columns from left edge (§9.4)
  this.fleetDelay = 0;
  this.doubleAdvanceNext = false;
  this.selectedBeacon = null;
  this.distressToggle = false;
}

MapController.prototype.currentBeacon = function () {
  return this.run.beacons[this.run.currentBeaconId];
};
MapController.prototype.beaconById = function (id) { return this.run.beacons[id]; };

MapController.prototype.reachable = function (fromId) {
  // magic teleport cheat: every beacon is one jump away
  if (this.run.cheats && this.run.cheats.teleport) {
    var all = [];
    for (var t = 0; t < this.run.beacons.length; t++) if (t !== fromId) all.push(t);
    return all;
  }
  var from = this.run.beacons[fromId];
  var out = from.edges.slice();
  if (Game.player.hasAugment("adv_nav")) {
    for (var i = 0; i < this.run.beacons.length; i++) {
      if (this.run.beacons[i].visited && i !== fromId && out.indexOf(i) < 0) out.push(i);
    }
  }
  return out;
};

MapController.prototype.advanceFleet = function (mult) {
  // one full beacon-column per THREE jumps (design tuning: original 1/jump
  // pace overtook the map too quickly)
  var adv = (1 / 3) * (mult || 1);
  if (this.fleetDelay > 0) { this.fleetDelay--; return; }
  var cur = this.currentBeacon();
  var sectorIsNebula = this.run.sector.type === "nebula";
  if (cur && cur.nebula) adv *= sectorIsNebula ? 0.8 : 0.5;
  if (this.doubleAdvanceNext) { adv *= 2; this.doubleAdvanceNext = false; }
  this.fleetPos += adv;
  // mark overtaken beacons
  for (var i = 0; i < this.run.beacons.length; i++) {
    var b = this.run.beacons[i];
    if (b.x * 6 <= this.fleetPos) {
      if (!b.overtaken) {
        b.overtaken = true;
        if (b.nebula) b.hazard = "ionStorm";
        if (b.questEvent) b.questEvent = null; // chain fails silently (§11.4)
      }
    }
  }
};

MapController.prototype.revealBeacons = function (n) {
  var unknown = [];
  for (var i = 0; i < this.run.beacons.length; i++) {
    var b = this.run.beacons[i];
    if (!b.known && !b.visited) unknown.push(b);
  }
  RNG.run.shuffle(unknown);
  for (var k = 0; k < Math.min(n, unknown.length); k++) unknown[k].known = true;
};

MapController.prototype.markQuestBeacon = function (eventId) {
  // pick an unvisited, non-overtaken beacon ahead of the fleet
  var candidates = [];
  for (var i = 0; i < this.run.beacons.length; i++) {
    var b = this.run.beacons[i];
    if (b.visited || b.overtaken || b.type === "exit" || b.type === "start" || b.questEvent) continue;
    if (i === this.run.currentBeaconId) continue;
    candidates.push(b);
  }
  if (!candidates.length) return;
  candidates.sort(function (a, b) { return b.x - a.x; });
  var pick = candidates[RNG.run.int(0, Math.min(4, candidates.length - 1))];
  pick.questEvent = eventId;
  pick.known = true;
};

// Store/distress visibility within one jump (§9.2)
MapController.prototype.updateVisibility = function () {
  var cur = this.currentBeacon();
  if (!cur) return;
  // magic teleport cheat: omniscient map - every beacon known and scanned
  if (this.run.cheats && this.run.cheats.teleport) {
    for (var mi = 0; mi < this.run.beacons.length; mi++) {
      var mb = this.run.beacons[mi];
      mb.known = true;
      mb.adjacentKnown = true;
      mb.scanned = true;
    }
  }
  cur.known = true;
  for (var i = 0; i < cur.edges.length; i++) {
    var b = this.run.beacons[cur.edges[i]];
    b.adjacentKnown = true;
    if (b.type === "store" || b.type === "distress") b.known = true;
    if (Game.player.hasAugment("lr_scanners")) b.scanned = true;
  }
};

Sim.MapController = MapController;

})();
