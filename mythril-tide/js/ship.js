// MYTHRIL TIDE - ship.js : ship + crew simulation (rooms, systems, mana, pathfinding)
'use strict';

const TILE = 16;
let CREW_UID = 1;

function makeCrew(race, owner, used) {
  const r = DATA.RACES[race];
  // pick a name not already aboard; if the pool is exhausted, append a regnal numeral
  const pool = DATA.NAMES[race] || DATA.NAMES.human;
  const taken = new Set(used || []);
  let name = U.pick(pool);
  if (taken.has(name)) {
    const free = pool.filter(n => !taken.has(n));
    if (free.length) name = U.pick(free);
    else { const R = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X']; let k = 1; while (k < R.length && taken.has(name + R[k])) k++; name = name + (R[k] || (' ' + (k + 1))); }
  }
  return {
    id: CREW_UID++,
    race, owner, // 'player' | 'enemy'
    name,
    hp: r.hp, maxhp: r.hp,
    roomId: 0, slot: 0,
    px: 0, py: 0,           // local px position on current ship
    path: [],               // room ids to walk through
    aboard: 'home',         // 'home' | 'away' (on the other ship)
    stun: 0, dead: false,
    frame: 0, ft: Math.random(),
    repProg: 0, patchProg: 0,
    poison: 0,
    xp: { helm: 0, sails: 0, weapons: 0, wards: 0, repair: 0, combat: 0 }, // station mastery, earned by doing the job
    station: -1, // remembered battle station room id
  };
}

class Ship {
  constructor(def) {
    this.def = def;
    this.layoutKey = def.layout;
    const L = DATA.LAYOUTS[def.layout];
    this.name = def.name || L.name;
    this.style = def.style;
    this.big = !!L.big;
    this.masts = L.masts;
    this.hullMax = def.hull;
    this.hull = def.hull;
    this.manaMax = def.manaMax;
    this.boss = !!def.boss;
    this.stage = def.stage || 0;
    this.fleeAt = def.fleeAt || 0;
    this.surrenders = !!def.surrenders;
    this.mounts = def.mounts || 3;

    // hand-marked cutaway masks can CULL rooms that poke outside the playable
    // region of this hull's art (the importer writes a kill-list per ship)
    let roomDefs = L.rooms;
    this._killedKeys = [];
    const AM = (typeof window !== 'undefined' && window.ART && window.ART.ships) ? window.ART.ships : null;
    if (AM) {
      const me = AM['ship_' + this.layoutKey + '_' + this.style] || AM['ship_' + this.layoutKey];
      if (me && me.kill && me.kill.length) {
        this._killedKeys = me.kill.map(i => L.rooms[i] && L.rooms[i][0]).filter(Boolean);
        roomDefs = L.rooms.filter((r, i) => !me.kill.includes(i));
      }
    }
    this.rooms = roomDefs.map((r, i) => ({
      id: i, key: r[0] === 'mount' ? null : r[0], mount: r[0] === 'mount', x: r[1], y: r[2], w: r[3], h: r[4],
      dmg: 0, dmgF: 0, water: 0, leak: false, ion: 0, stunT: 0,
    }));
    // Per-tile fire (FTL-style): each room owns a w*h HP grid `_fires` (local tile index -> HP) —
    // the single source of truth. `r.fire` is a permanent DERIVED accessor over it: get = total HP
    // (so `r.fire > 0` = "any tile burning"), set(0) = douse all, set(+) = ignite the centre tile
    // when cold (used only by legacy-save migration). All writers use the tile helpers below.
    for (const r of this.rooms) Ship.initRoomFire(r);
    // doors are generated automatically: EVERY pair of rooms sharing a wall
    // gets one. All of them pass crew freely and water when opened.
    this.doors = [];
    for (let i = 0; i < this.rooms.length; i++) {
      for (let j = i + 1; j < this.rooms.length; j++) {
        const a = this.rooms[i], b = this.rooms[j];
        const vTouch = (a.x + a.w === b.x || b.x + b.w === a.x) && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) >= 1;
        const hTouch = (a.y + a.h === b.y || b.y + b.h === a.y) && Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) >= 1;
        if (vTouch || hTouch) this.doors.push([i, j]);
      }
    }
    this.doorOpen = this.doors.map(() => false); // closed by default; crew pass anyway, WATER does not
    this.adj = {};
    for (const r of this.rooms) this.adj[r.id] = [];
    for (const [a, b] of this.doors) { this.adj[a].push(b); this.adj[b].push(a); }

    // FULL layout extents (art anchoring must not shift when rooms are culled)
    this.rw = Math.max(...L.rooms.map(r => r[1] + r[3])) * TILE;
    this.rh = Math.max(...L.rooms.map(r => r[2] + r[4])) * TILE;

    // sea doors: hull rooms (bottom row + bow/stern ends) have hatches to the sea.
    // only these can be deliberately flooded.
    const maxTX = Math.max(...this.rooms.map(r => r.x + r.w));
    const maxTY = Math.max(...this.rooms.map(r => r.y + r.h));
    for (const r of this.rooms) {
      r.seaDoor = (r.y + r.h === maxTY) || r.x === 0 || (r.x + r.w === maxTX);
    }

    this.sysLv = Object.assign({ helm: 0, sails: 0, weapons: 0, wards: 0, infirmary: 0, doors: 0, lookout: 0, brinegate: 0, fogveil: 0, sump: 0, shrine: 0 }, def.sysLv);
    // every system known to the game gets a level slot (old saves, new systems)
    for (const k of Object.keys(DATA.SYSTEMS)) if (!(k in this.sysLv)) this.sysLv[k] = 0;
    // systems whose room was culled by the cutaway mask don't exist on this hull
    // (pumps and the shrine are distributed - they survive roomless)
    for (const k of this._killedKeys) {
      if (k && k !== 'sump' && k !== 'shrine') this.sysLv[k] = 0;
    }
    this.assignMounts(); // place installed advanced systems into open mount rooms (FTL-style)
    this.alloc = {};
    this.weapons = (def.weapons || []).map(k => ({ key: k, charge: 0, on: false, target: -1 }));
    this.wards = { layers: 0, charge: 0 };
    this.veilT = 0; this.veilCd = 0;
    this.gateCd = 0;
    this.hexCd = 0; this.songCd = 0; // Storm Conduit / Siren's Song cooldowns
    this.escape = 0; this.fleeing = false;
    this.augs = def.augs ? def.augs.slice() : [];
    this.shards = 0; this.runeshot = 0;
    this.phoenixUsed = false;
    this.surrendered = false;

    this.crew = [];
    for (const race of (def.crew || [])) this.addCrew(race);
    this.autoAlloc();
  }

  // ---------- per-tile fire (B0 compat shim) ----------
  // Attach the `_fires` grid + the `r.fire` getter/setter to a freshly-built room.
  static initRoomFire(r) {
    r._fires = new Array(Math.max(1, r.w * r.h)).fill(0);
    Object.defineProperty(r, 'fire', {
      enumerable: true, configurable: true,
      get() { let s = 0; for (const v of this._fires) s += v; return s; },
      set(v) {
        if (v <= 0) { this._fires.fill(0); return; }
        const cur = this.fire;
        if (cur <= 0) { this._fires[(this._fires.length - 1) >> 1] = v; return; } // ignite centre tile
        const k = v / cur; for (let i = 0; i < this._fires.length; i++) this._fires[i] *= k; // scale to new total
      },
    });
  }

  // ---------- per-tile fire geometry ----------
  roomAtTile(gx, gy) { for (const r of this.rooms) if (gx >= r.x && gx < r.x + r.w && gy >= r.y && gy < r.y + r.h) return r; return null; }
  doorBetween(aId, bId) { for (let k = 0; k < this.doors.length; k++) { const d = this.doors[k]; if ((d[0] === aId && d[1] === bId) || (d[0] === bId && d[1] === aId)) return k; } return -1; }
  setAllDoors(open) { for (let i = 0; i < this.doorOpen.length; i++) this.doorOpen[i] = open; } // global Open All / Shut All (interior doors only — sea doors stay per-room)
  litTileCount(r) { let n = 0; for (const v of r._fires) if (v > 0) n++; return n; }
  totalFireTiles() { let n = 0; for (const r of this.rooms) n += this.litTileCount(r); return n; }
  // light a random unlit, un-flooded tile in a room (weapons/igniters that hit a room, not a tile)
  igniteRandomTile(r, hp) {
    if (!r || r.water > TUNING.fireDouseWater) return false;
    const unlit = []; for (let i = 0; i < r._fires.length; i++) if (r._fires[i] <= 0) unlit.push(i);
    if (!unlit.length) return false;
    r._fires[U.pick(unlit)] = hp; return true;
  }
  // light the tile nearest a world point (beam crossings / aimed hits)
  igniteTileAt(r, wx, wy, hp) {
    if (!r || r.water > TUNING.fireDouseWater) return false;
    const lx = U.clamp(Math.floor(wx / TILE) - r.x, 0, r.w - 1), ly = U.clamp(Math.floor(wy / TILE) - r.y, 0, r.h - 1);
    const i = ly * r.w + lx; if (r._fires[i] > 0) return false; r._fires[i] = hp; return true;
  }
  // FTL beam geometry: walk a FIXED-LENGTH line in SHIP-LOCAL px from (x0,y0) at `angle`, length
  // `lenPx`. Returns the ORDERED distinct tile-crossings [{room, idx, gx, gy, x, y, d}] and the
  // ORDERED rooms by first-entry. The reticle and the sweep both read from this (single source).
  beamPath(x0, y0, angle, lenPx) {
    const tiles = [], rooms = [], seenT = new Set(), seenR = new Set();
    const dx = Math.cos(angle), dy = Math.sin(angle), step = TILE / 3, n = Math.ceil(lenPx / step);
    for (let s = 0; s <= n; s++) {
      const d = Math.min(lenPx, s * step), x = x0 + dx * d, y = y0 + dy * d;
      const gx = Math.floor(x / TILE), gy = Math.floor(y / TILE), r = this.roomAtTile(gx, gy);
      if (!r) continue;
      const tk = gx + ',' + gy; if (seenT.has(tk)) continue; seenT.add(tk);
      tiles.push({ room: r, idx: (gy - r.y) * r.w + (gx - r.x), gx, gy, x, y, d });
      if (!seenR.has(r.id)) { seenR.add(r.id); rooms.push(r); }
    }
    return { tiles, rooms };
  }
  // a crew's LOCAL tile index within a room (derived from its ship-local px/py), or -1 if outside it
  crewLocalTile(c, r) {
    const lx = Math.floor(c.px / TILE) - r.x, ly = Math.floor(c.py / TILE) - r.y;
    if (lx < 0 || lx >= r.w || ly < 0 || ly >= r.h) return -1;
    return ly * r.w + lx;
  }
  // the 4-neighbour tiles of a room tile: within-room (mul 1) + across an actual door (mul by openness)
  fireNeighbours(r, idx) {
    const lx = idx % r.w, ly = (idx / r.w) | 0, out = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nlx = lx + dx, nly = ly + dy;
      if (nlx >= 0 && nlx < r.w && nly >= 0 && nly < r.h) { out.push({ room: r, idx: nly * r.w + nlx, mul: 1 }); continue; }
      const gx = r.x + nlx, gy = r.y + nly, ar = this.roomAtTile(gx, gy);
      if (!ar || ar === r) continue;
      const dk = this.doorBetween(r.id, ar.id); if (dk < 0) continue;
      const mul = this.doorOpen[dk] ? 1 : TUNING.fireDoorClosedMul / (1 + (this.sysLv.doors || 0) * 0.6);
      out.push({ room: ar, idx: (gy - ar.y) * ar.w + (gx - ar.x), mul });
    }
    return out;
  }

  // ---------- helpers ----------
  roomByKey(key) { return this.rooms.find(r => r.key === key); }
  // FTL-style: each installed ADVANCED system occupies an open "mount" room (manned, damageable,
  // boardable). Deterministic from sysLv + SYS_ADVANCED order, so it survives save/load.
  // Extras beyond available mounts fall back to roomless/distributed (still function at sysLv).
  assignMounts() {
    const mounts = this.rooms.filter(r => r.mount);
    for (const r of mounts) r.key = null;
    let mi = 0;
    for (const k of DATA.SYS_ADVANCED) {
      if ((this.sysLv[k] || 0) > 0 && mi < mounts.length) { mounts[mi].key = k; mi++; }
    }
  }
  hasAug(a) {
    if (this.augs.includes(a)) return true;
    // run-acquired augments live in Game.run.augs (player ship only) — keep parity with
    // the other run-aug checks in this file (tidal_heart/selkie_cloak/siren_lure/phoenix_ash).
    return this.owner === 'player' && typeof Game !== 'undefined' && Game.run && Array.isArray(Game.run.augs) && Game.run.augs.includes(a);
  }
  effMana() {
    const core = this.roomByKey('core');
    return Math.max(0, this.manaMax - (core ? core.dmg * 2 : 0));
  }
  sysEff(key) { // usable level of a system right now
    if (!this.sysLv[key]) return 0;
    const r = this.roomByKey(key);
    if (!r) return this.sysLv[key]; // distributed systems (sump pumps) have no room to shoot
    if (r.ion > 0) return 0;
    return Math.max(0, this.sysLv[key] - r.dmg);
  }
  powered(key) {
    if (DATA.SYS_SUB.includes(key)) return this.sysEff(key);
    return Math.min(this.alloc[key] || 0, this.sysEff(key));
  }
  totalAlloc() { let t = 0; for (const k of DATA.SYS_POWERED) t += this.alloc[k] || 0; return t; }
  setAlloc(key, bars) {
    bars = U.clamp(bars, 0, this.sysLv[key] || 0);
    this.alloc[key] = bars;
    this.trimAlloc();
  }
  trimAlloc() {
    // cut priority when over mana (e.g. core damaged): luxuries first, core combat last.
    // MUST cover every SYS_POWERED key or over-allocation could get stuck (sump/shrine bug).
    const order = ['stormhex', 'sirensong', 'fogveil', 'shrine', 'brinegate', 'sump', 'infirmary', 'sails', 'weapons', 'wards'];
    let guard = 99;
    while (this.totalAlloc() > this.effMana() && guard-- > 0) {
      let cut = false;
      for (const k of order) if ((this.alloc[k] || 0) > 0) { this.alloc[k]--; cut = true; break; }
      if (!cut) break;
    }
  }
  autoAlloc() {
    // sensible default mana spread (also used by enemies)
    for (const k of DATA.SYS_POWERED) this.alloc[k] = 0;
    let m = this.effMana();
    const give = (k, n) => { const g = Math.min(n, this.sysLv[k] || 0, m); if (g > 0) { this.alloc[k] = (this.alloc[k] || 0) + g; m -= g; } };
    // GUNS FIRST: an enemy that can't power its weapons never shoots back. Wards
    // used to hog the mana, which is why armada/warded ships felt passive.
    give('weapons', this.sysLv.weapons);
    // signature actives right after the guns: a boarder ship POWERS its Portal, a siren her
    // Song — wards used to eat this mana first, leaving the kit dark on warded hulls. (R2)
    give('brinegate', this.sysLv.brinegate);
    give('stormhex', this.sysLv.stormhex);   // Storm Conduit (jam)
    give('sirensong', this.sysLv.sirensong); // Siren's Song (charm)
    give('wards', this.sysLv.wards);
    give('sails', 2);
    give('infirmary', 1);
    give('sump', 1);
    give('shrine', this.sysLv.shrine); // power the Binding Shrine so familiars wake (no-op if none installed)
    give('fogveil', this.sysLv.fogveil);
    give('sails', 99); // pour any leftover mana into extra evasion
  }

  // FTL-style mastery: only the player's crew train; ranking up is announced once.
  gainXp(c, key, n, battle) {
    if (!c || c.owner !== 'player') return;
    if (!c.xp) c.xp = {};
    const before = DATA.crewRank(c, key);
    c.xp[key] = (c.xp[key] || 0) + n;
    const after = DATA.crewRank(c, key);
    if (after > before && battle) {
      if (typeof AUDIO !== 'undefined') AUDIO.sfx('levelup');
      battle.log(c.name + ' MASTERS ' + (DATA.SKILL_NAME[key] || key).toUpperCase() + (after === 2 ? ' (GRAND)' : '') + '!');
    }
  }

  mannedBy(key, battle) {
    const r = this.roomByKey(key);
    if (!r) return null;
    for (const c of occupantsOf(this, r.id, battle)) {
      if (c.owner === this.owner && !c.dead && c.stun <= 0 && c.path.length === 0) return c;
    }
    return null;
  }

  evasion(battle) {
    const helm = this.mannedBy('helm', battle);
    if (!helm) return this.veilT > 0 ? 60 : 0;
    let ev = this.sysEff('helm') > 0 ? this.sysLv.helm * 3 : 0;
    ev += TUNING.masteryEvasion[DATA.crewRank(helm, 'helm')]; // helm mastery (FTL piloting)
    ev += this.powered('sails') * 5;
    const sailC = this.mannedBy('sails', battle);
    if (sailC) {
      ev += 5;
      if (DATA.RACES[sailC.race].sailsBonus) ev += DATA.RACES[sailC.race].sailsBonus;
      ev += TUNING.masteryEvasion[DATA.crewRank(sailC, 'sails')]; // sail mastery (FTL engines)
    }
    if (this.hasAug('windrider')) ev += 5;
    if (this.veilT > 0) ev += 60;
    if (this._blindT > 0) ev -= 15; // kraken ink in the helmsman's eyes
    return U.clamp(ev, 0, TUNING.maxEvasion);
  }

  wardMax() { return Math.floor(this.powered('wards') / 2); }

  addCrew(race) {
    const c = makeCrew(race, this.owner || 'enemy', this.crew.map(o => o.name));
    this.crew.push(c);
    // place in first room with space
    const r = this.rooms[this.crew.length % this.rooms.length] || this.rooms[0];
    this.placeCrew(c, r.id);
    return c;
  }
  placeCrew(c, roomId) {
    c.roomId = roomId;
    const r = this.rooms[roomId];
    const others = this.crew.filter(o => o !== c && o.roomId === roomId && !o.dead).length;
    c.slot = others % r.w;
    c.px = (r.x + c.slot) * TILE + 2;
    c.py = r.y * TILE + 1;
    c.path = [];
  }
  slotPos(roomId, slot) {
    const r = this.rooms[roomId];
    return { x: (r.x + (slot % r.w)) * TILE + 2, y: r.y * TILE + 1 };
  }
  findPath(from, to) {
    if (from === to) return [];
    const prev = {}; const q = [from]; const seen = { [from]: true };
    while (q.length) {
      const cur = q.shift();
      for (const n of this.adj[cur]) {
        if (seen[n]) continue;
        seen[n] = true; prev[n] = cur;
        if (n === to) {
          const path = [to]; let p = to;
          while (prev[p] !== undefined && prev[p] !== from) { p = prev[p]; path.unshift(p); }
          return path;
        }
        q.push(n);
      }
    }
    return null;
  }
  orderCrew(c, roomId) {
    if (c.dead || c.aboard === 'away') return;
    const path = this.findPath(c.roomId, roomId);
    if (path) { c.path = path; c.repProg = 0; c.patchProg = 0; }
  }

  // ---------- per-frame simulation ----------
  // battle may be null (idle on map); enemyShip for boarding context
  tick(dt, battle) {
    const isBattle = !!battle;

    // timers
    if (this.veilT > 0) this.veilT -= dt;
    if (this.veilCd > 0) this.veilCd -= dt;
    if (this.gateCd > 0) this.gateCd -= dt;
    if (this.hexCd > 0) this.hexCd -= dt;
    if (this.songCd > 0) this.songCd -= dt;
    for (const r of this.rooms) {
      if (r.ion > 0) r.ion -= dt;
      if (r.stunT > 0) r.stunT -= dt;
    }

    this.trimAlloc();

    // wards recharge (a trained warden manning Wards regrows layers faster - FTL shields)
    const wm = this.wardMax();
    if (this.wards.layers > wm) this.wards.layers = wm;
    if (this.wards.layers < wm) {
      const warden = isBattle ? this.mannedBy('wards', battle) : null;
      const wardMul = warden ? TUNING.masteryWardMul[DATA.crewRank(warden, 'wards')] : 1;
      this.wards.charge += dt / TUNING.wardRechargeSecs * wardMul;
      if (this.wards.charge >= 1) { this.wards.charge = 0; this.wards.layers++; }
    } else this.wards.charge = 0;

    // weapons charge
    const wepBars = this.powered('weapons');
    let used = 0;
    const gunner = isBattle ? this.mannedBy('weapons', battle) : null;
    let rate = TUNING.weaponTempo; // global tempo: fights resolve faster
    if (gunner) {
      if (DATA.RACES[gunner.race].wepBonus) rate += DATA.RACES[gunner.race].wepBonus;
      rate *= TUNING.masteryWeaponMul[DATA.crewRank(gunner, 'weapons')]; // gunnery mastery: FTL 10/15/20% faster
    }
    if (this.enrage) rate *= TUNING.enrageTempoMul;
    for (const w of this.weapons) {
      const wd = DATA.WEAPONS[w.key];
      // ramp guns (Chain Culverin, Tempest Chain) shorten their reload as they
      // find the rhythm; losing power or toggling off loses the rhythm
      const goal = wd.ramp ? Math.max(wd.ramp.floor, wd.charge - wd.ramp.step * (w._ramp || 0)) : wd.charge;
      if (w.on && used + wd.power <= wepBars) {
        used += wd.power;
        if (w.charge < goal) w.charge = Math.min(goal, w.charge + dt * rate);
        // chargers (Thunderhead) bank a finished bolt and start the next
        if (wd.charger && w.charge >= goal && (w._bank || 0) < wd.charger) {
          w._bank = (w._bank || 0) + 1;
          if (w._bank < wd.charger) w.charge = 0;
        }
      } else {
        w.charge = Math.max(0, w.charge - dt * TUNING.weaponDecayRate);
        w._ramp = 0;
        w._bank = 0;
      }
    }
    // kraken ink: blinded helm steers -15% evasion until it clears
    if (this._blindT > 0) this._blindT -= dt;

    // barnacle coral: sealed rooms keep every door clamped shut until it dies
    for (const r of this.rooms) {
      if (r._sealT > 0) {
        r._sealT -= dt;
        for (let di = 0; di < this.doors.length; di++) {
          if (this.doors[di][0] === r.id || this.doors[di][1] === r.id) this.doorOpen[di] = false;
        }
      }
    }
    // rooms: fire, water, leaks
    for (const r of this.rooms) {
      // ---- per-tile fire (FTL): burn, neighbour-driven burnout, tile->tile + cross-door spread ----
      const litIdx = []; for (let i = 0; i < r._fires.length; i++) if (r._fires[i] > 0) litIdx.push(i);
      if (litIdx.length) {
        if (r.water > TUNING.fireDouseWater) { r._fires.fill(0); } // a flooded room drowns its fires (our O2<10% analog)
        else {
          const litN = litIdx.length;
          // system + hull damage scale with the NUMBER of burning tiles
          if (r.key && this.sysLv[r.key]) {
            r.dmgF += dt * TUNING.fireToSystem * litN;
            while (r.dmgF >= 1) { r.dmgF -= 1; this.damageSystem(r, 1); }
          }
          this.hullF = (this.hullF || 0) + dt * TUNING.hullSinge * litN;
          while (this.hullF >= 1) { this.hullF -= 1; this.damageHull(1); }
          // a room mostly ablaze radiates enough heat to jump SHUT doors (structural failure)
          const engulfed = litN > r._fires.length * 0.65;
          // per-tile burnout + spread (snapshot lit tiles so newly-lit ones wait until next frame)
          for (const i of litIdx) {
            const nbrs = this.fireNeighbours(r, i);
            let adjLit = 0; for (const n of nbrs) if (n.room._fires[n.idx] > 0) adjLit++;
            // isolated tiles gutter out fast; a cluster feeds itself and persists (can char the hull at sea)
            r._fires[i] = Math.max(0, r._fires[i] - dt * TUNING.fireBurnoutBase / (1 + adjLit * TUNING.fireNeighbourBonus));
            for (const n of nbrs) {
              if (n.room._fires[n.idx] > 0 || n.room.water > TUNING.fireDouseWater) continue;
              const mul = (engulfed && n.room !== r) ? Math.max(n.mul, TUNING.fireEngulfedSpread) : n.mul;
              if (U.chance(dt * TUNING.fireSpreadChance * mul)) n.room._fires[n.idx] = TUNING.newFireHp;
            }
          }
        }
      }
      if (r.scupper) {
        // sea door open: the ocean pours in (douses fires, drowns boarders)
        r.water = Math.min(1, r.water + dt * TUNING.scupperFillRate);
      } else if (r.leak) {
        // hull breach: water forces in until the crew patch it
        r.water = Math.min(1, r.water + dt * TUNING.leakRate);
      } else if (r.water > 0) {
        // drainage: slow natural bailing; SUMP PUMPS do the real work
        const pump = TUNING.pumpBaseDrain + TUNING.pumpPerBarDrain * this.powered('sump');
        r.water = Math.max(0, r.water - dt * pump * (this.hasAug('dwarven_pumps') ? 2.5 : 1));
      }
      // deep water damages system — its OWN accumulator (r.dmgW), independent of fire's r.dmgF
      if (r.water > TUNING.deepWaterSys && r.key && this.sysLv[r.key]) {
        r.dmgW = (r.dmgW || 0) + dt * TUNING.waterToSystem;
        while (r.dmgW >= 1) { r.dmgW -= 1; this.damageSystem(r, 1); }
      }
    }
    // SEA PRESSURE: every room reachable from an open sea door through open
    // doors is sea-fed. The sea fills the lowest sea-fed decks first, at full
    // rate, then climbs - open enough doors and the whole ship goes under.
    const seaFed = new Set();
    {
      const q = [];
      for (const r of this.rooms) if (r.scupper) { seaFed.add(r.id); q.push(r.id); }
      while (q.length) {
        const id = q.pop();
        for (let di = 0; di < this.doors.length; di++) {
          if (!this.doorOpen[di]) continue;
          const d = this.doors[di];
          const o = d[0] === id ? d[1] : d[1] === id ? d[0] : -1;
          if (o >= 0 && !seaFed.has(o)) { seaFed.add(o); q.push(o); }
        }
      }
      for (const id of seaFed) {
        const r = this.rooms[id];
        if (r.scupper) continue; // taking water directly already
        // water rises: this room fills only once every sea-fed room below it is full
        let blocked = false;
        for (const oid of seaFed) if (this.rooms[oid].y > r.y && this.rooms[oid].water < 0.95) { blocked = true; break; }
        if (!blocked) r.water = Math.min(1, r.water + dt * TUNING.seaFillRate);
      }
    }
    // sideways sloshing through open doors (equalization for leak water etc.)
    for (let di = 0; di < this.doors.length; di++) {
      if (!this.doorOpen[di]) continue;
      const ra = this.rooms[this.doors[di][0]], rb = this.rooms[this.doors[di][1]];
      if (seaFed.has(ra.id) && seaFed.has(rb.id)) continue; // pressure handles these
      const flow = (ra.water - rb.water) * dt * TUNING.doorSloshRate;
      ra.water = U.clamp(ra.water - flow, 0, 1);
      rb.water = U.clamp(rb.water + flow, 0, 1);
    }

    // crew (own crew on this ship + handle those away in battle.tick via other ship context)
    for (const c of this.crew) {
      if (c.dead) continue;
      const locShip = (c.aboard === 'away' && battle) ? otherShip(this, battle) : this;
      this.tickCrew(c, locShip, dt, battle);
    }

    // infirmary healing - in battle it needs mana; at sea (no battle) a staffed,
    // undamaged infirmary always works at its full level
    // reef-singers familiar: regrows hull while you sail (never in battle). At sea the shrine
    // works at its INSTALLED level (like the infirmary) — no combat mana allocation to depend on.
    if (!isBattle && typeof Game !== 'undefined' && Game.run && this === Game.ship &&
        (Game.run.familiars || []).slice(0, this.sysEff('shrine')).includes('reefsingers')) {
      this._reefT = (this._reefT || 0) + dt;
      if (this._reefT >= TUNING.reefSingerSecs && this.hull < this.hullMax) { this._reefT = 0; this.hull++; }
    }

    let infBars = this.powered('infirmary');
    if (!isBattle && this.sysLv.infirmary > 0) infBars = Math.max(infBars, this.sysEff('infirmary'));
    if (infBars > 0) {
      const ir = this.roomByKey('infirmary');
      if (ir) for (const c of occupantsOf(this, ir.id, battle)) {
        if (c.owner === this.owner && c.hp < c.maxhp) {
          c.hp = Math.min(c.maxhp, c.hp + dt * (TUNING.infHealBase + infBars * TUNING.infHealPerBar));
          c._healT = 0.4; // green cross flash so healing is visible
        }
      }
    }
  }

  tickCrew(c, locShip, dt, battle) {
    if (c._healT > 0) c._healT -= dt;
    c._task = null; // cleared every tick; set below while actually working
    c._fighting = false; c._climbing = false; c._operating = false; // anim flags
    if (c.stun > 0) { c.stun -= dt; return; }
    const race = DATA.RACES[c.race];
    const room = locShip.rooms[c.roomId];
    if (!room) return;

    // poison
    if (c.poison > 0) { c.poison -= dt; c.hp -= dt * TUNING.poisonDps; }
    // regen
    if (race.regen) c.hp = Math.min(c.maxhp, c.hp + dt * race.regen);
    // Tidal Heart: player boarders mend while raiding
    if (c.aboard === 'away' && c.owner === 'player' && typeof Game !== 'undefined' && Game.run && Game.run.augs.includes('tidal_heart')) {
      c.hp = Math.min(c.maxhp, c.hp + dt * 1.5);
    }

    // environment damage — FIRE is per-tile (FTL): only a sailor standing ON a burning tile is hurt
    if (room.fire > 0 && !race.fireImmune) {
      const ti = locShip.crewLocalTile(c, room);
      if (ti >= 0 && room._fires[ti] > 0) c.hp -= dt * TUNING.crewFireDps;
    }
    if (room.water > TUNING.crewDrownWater && !race.waterImmune && !(c.owner === 'player' && Game.run && Game.run.augs.includes('selkie_cloak'))) c.hp -= dt * TUNING.crewWaterDps;

    if (c.hp <= 0) { this.killCrew(c, battle); return; }

    // movement
    if (c.path.length > 0) {
      const nextRoom = locShip.rooms[c.path[0]];
      const tgt = { x: (nextRoom.x + Math.floor(nextRoom.w / 2)) * TILE + 2, y: nextRoom.y * TILE + 1 };
      let spd = TUNING.crewMoveSpeed * race.spd;
      if (room.water > 0.4) spd *= race.waterSpd ? race.waterSpd : TUNING.waterMoveMul;
      // reinforced enemy doors slow boarders
      if (c.aboard === 'away' && locShip.sysLv.doors) spd /= (1 + locShip.sysLv.doors * TUNING.doorSlowPerLv);
      const dx = tgt.x - c.px, dy = tgt.y - c.py;
      const d = Math.hypot(dx, dy);
      if (d < spd * dt) {
        c.px = tgt.x; c.py = tgt.y; c.roomId = c.path.shift();
        if (c.path.length === 0) {
          // settle into a free slot
          const r2 = locShip.rooms[c.roomId];
          const occ = occupantsOf(locShip, c.roomId, battle).filter(o => o !== c);
          c.slot = occ.length % r2.w;
          const sp = locShip.slotPos(c.roomId, c.slot);
          c.px = sp.x; c.py = sp.y;
        }
      } else {
        c.px += dx / d * spd * dt; c.py += dy / d * spd * dt;
        c.ft += dt * 3; c.frame = Math.floor(c.ft) % 2;
        c._climbing = Math.abs(dy) > Math.abs(dx) * 1.5; // vertical move = ladder
      }
      return;
    }

    // combat with hostile crew in same room
    const hostiles = occupantsOf(locShip, c.roomId, battle).filter(o => o.owner !== c.owner && !o.dead);
    if (hostiles.length > 0 && battle) {
      const tgt2 = hostiles[0];
      let dps = TUNING.meleeDps * race.dmg * TUNING.masteryMeleeMul[DATA.crewRank(c, 'combat')] * (c._dmgMul || 1);
      // siren song weakens hostiles fighting in her room
      for (const h of hostiles) if (h.race === 'siren') dps *= (1 - DATA.RACES.siren.song);
      // siren lure aug weakens boarders on player ship
      if (c.aboard === 'away' && locShip.owner === 'player' && Game.run && Game.run.augs.includes('siren_lure')) dps *= 0.75;
      tgt2.hp -= dps * dt;
      c._fighting = true;
      c.ft += dt * 2.5; c.frame = Math.floor(c.ft) % 2;
      if (race.igniter && U.chance(dt * race.igniter)) locShip.igniteRandomTile(locShip.rooms[c.roomId], TUNING.newFireHp);
      if (tgt2.hp <= 0) {
        const tgtHome = tgt2.aboard === 'away' ? otherShip(locShip, battle) : locShip;
        tgtHome.killCrew(tgt2, battle);
        this.gainXp(c, 'combat', 1, battle); // boarding mastery (FTL combat skill)
      }
      return;
    }

    // siren heal aura
    if (race.healAura) {
      for (const o of occupantsOf(locShip, c.roomId, battle)) {
        if (o !== c && o.owner === c.owner && o.hp < o.maxhp) o.hp = Math.min(o.maxhp, o.hp + dt * race.healAura);
      }
    }

    // auto-tasks in current room (only on own ship... or away for sabotage)
    // fire-fighting is gated to crew on their OWN ship - boarders never douse the
    // enemy's fires (and enemy boarders never douse yours).
    // repair mastery speeds both fire-fighting and patching/repairs (FTL repair skill)
    const repMul = TUNING.masteryRepairMul[DATA.crewRank(c, 'repair')];
    const loyal = c.owner === locShip.owner; // a charmed defector is aboard 'home' but disloyal -> sabotages, never helps
    // D (FTL) — the sailor OPERATING a station keeps manning it rather than auto-abandoning to
    // firefight/patch/repair, SO LONG AS a free crewmate in the same room can take the task. A lone
    // operator (no spare hand) still does the job. mannedBy() picks ONE operator, so the others act
    // and there's no stand-off. Fighting boarders is exempt (handled above — you can't man through melee).
    const operating = c.aboard === 'home' && loyal && !!(room.key && locShip.sysLv[room.key]) && locShip.mannedBy(room.key, battle) === c;
    const stayManning = operating && occupantsOf(locShip, c.roomId, battle).some(o =>
      o !== c && !o.dead && o.owner === c.owner && o.aboard === 'home' && o.path.length === 0 && o.stun <= 0);
    if (room.fire > 0 && c.aboard === 'home' && loyal && !stayManning) {
      // throw water on the HOTTEST tile first — one bucket at a time
      const rate = dt * TUNING.fireFightRate * repMul * (race.fireFight || 1) * (race.fireImmune ? 1.6 : 1);
      let bi = -1, bh = 0; for (let i = 0; i < room._fires.length; i++) if (room._fires[i] > bh) { bh = room._fires[i]; bi = i; }
      if (bi >= 0) room._fires[bi] = Math.max(0, room._fires[bi] - rate);
      c.ft += dt * 2.5; c.frame = Math.floor(c.ft) % 2;
      c._task = 'fire'; c._taskP = bh > 0 ? 1 - Math.max(0, room._fires[bi]) / TUNING.newFireHp : 1;
      return;
    }
    if (c.aboard === 'home' && loyal && !stayManning) {
      if (room.leak) {
        c.patchProg += dt * TUNING.patchRate * repMul * (race.leakFix || 1) * (this.hasAug('dwarven_pumps') ? 1.6 : 1);
        c._task = 'patch'; c._taskP = c.patchProg;
        if (c.patchProg >= 1) { c.patchProg = 0; room.leak = false; this.gainXp(c, 'repair', 1, battle); }
        return;
      }
      if (room.key && this.sysLv[room.key] && room.dmg > 0) {
        c.repProg += dt * TUNING.repairRate * repMul * race.rep;
        c._task = 'repair'; c._taskP = c.repProg;
        if (c.repProg >= 1) { c.repProg = 0; room.dmg = Math.max(0, room.dmg - 1); this.gainXp(c, 'repair', 1, battle); }
        return;
      }
    } else if (battle && !loyal) {
      // sabotage: a boarder (away) OR a charmed defector (home but disloyal — Siren's Crown/Song)
      // wrecks the system in their room, FTL mind-control style
      if (room.key && locShip.sysLv[room.key] && room.dmg < locShip.sysLv[room.key]) {
        c.repProg += dt * TUNING.sabotageRate * race.dmg;
        c._task = 'sabotage'; c._taskP = c.repProg;
        if (c.repProg >= 1) { c.repProg = 0; locShip.damageSystem(room, 1); }
      }
    }
    // standing idle: ONLY the single sailor actually manning the station (mannedBy) plays the
    // operate pose — other crew in the same room read as idle (the manning bonus is single-operator).
    c._operating = c.aboard === 'home' && !!(room.key && locShip.sysLv[room.key]) && locShip.mannedBy(room.key, battle) === c;
    c.frame = 0;
  }

  killCrew(c, battle) {
    if (c.dead) return;
    // phoenix ash revival (player only)
    if (c.owner === 'player' && Game.run && Game.run.augs.includes('phoenix_ash') && !this.phoenixUsed && this.roomByKey('infirmary')) {
      this.phoenixUsed = true;
      c.hp = c.maxhp * 0.3;
      c.aboard = 'home';
      this.placeCrew(c, this.roomByKey('infirmary').id);
      if (typeof AUDIO !== 'undefined') AUDIO.sfx('heal');
      if (battle) battle.log('PHOENIX ASH REVIVES ' + c.name + '!');
      return;
    }
    c.dead = true; c.hp = 0;
    if (typeof AUDIO !== 'undefined') AUDIO.sfx('death');
    if (c.owner === 'player' && typeof Game !== 'undefined' && Game.run) Game.run.stats.crewLost++;
    if (battle && c.owner === 'player') battle.log(c.name + ' IS LOST!');
  }

  damageSystem(room, n) {
    if (room.key && this.sysLv[room.key]) room.dmg = U.clamp(room.dmg + n, 0, this.sysLv[room.key]);
  }
  damageHull(n) {
    this.hull = Math.max(0, this.hull - n);
  }

  aliveCrew() { return this.crew.filter(c => !c.dead); }

  // post-battle cleanup - FTL-style: fires, leaks, and floodwater PERSIST.
  // Sail away burning and you had better send sailors to deal with it.
  settle() {
    for (const r of this.rooms) { r.ion = 0; r.stunT = 0; r._sealT = 0; r.dmgF = 0; r.dmgW = 0; } // clear coral-seal + damage accumulators
    for (const c of this.crew) { c.stun = 0; if (!c.dead && c.aboard === 'away') { c.aboard = 'home'; this.placeCrew(c, this.rooms[0].id); } }
    // FTL: the fallen don't linger in the roster between fights. Pruning here (not just in
    // serialize) keeps the in-memory crew clean so corpses can't accumulate and push the
    // living roster past the bunk cap (the rail renders the whole roster).
    this.crew = this.crew.filter(c => !c.dead);
    this.wards.layers = 0; this.wards.charge = 0;
    this.escape = 0; this.fleeing = false;
    this.veilT = 0; this.phoenixUsed = false;
    this.surrendered = false;
    // clear transient combat debuffs + system cooldowns so they don't bleed into the next battle
    this._blindT = 0; this._reefT = 0; this.enrage = 0; this.hullF = 0;
    this.veilCd = 0; this.gateCd = 0; this.hexCd = 0; this.songCd = 0;
    for (const w of this.weapons) { w.charge = 0; w.target = -1; }
  }

  // ---------- save / load ----------
  serialize() {
    return {
      def: this.def, hull: this.hull, hullMax: this.hullMax, manaMax: this.manaMax,
      sysLv: this.sysLv, alloc: this.alloc,
      weapons: this.weapons.map(w => w.key),
      crew: this.crew.filter(c => !c.dead).map(c => ({ race: c.race, name: c.name, hp: Math.round(c.hp), maxhp: c.maxhp, xp: c.xp, station: c.station })),
      rooms: this.rooms.map(r => ({ dmg: r.dmg, water: Math.round(r.water * 100) / 100, fires: r._fires.map(v => Math.round(v)), leak: r.leak ? 1 : 0, scupper: r.scupper ? 1 : 0 })),
      doorOpen: this.doorOpen,
    };
  }
  static restore(s, owner) {
    const ship = new Ship(Object.assign({}, s.def, { hull: s.hull, manaMax: s.manaMax, weapons: s.weapons, crew: [] }));
    ship.owner = owner;
    ship.hullMax = s.hullMax;
    ship.sysLv = Object.assign(ship.sysLv, s.sysLv);
    ship.assignMounts(); // re-seat advanced systems after sysLv is restored
    ship.alloc = Object.assign({}, s.alloc);
    s.crew.forEach((cs, i) => {
      const c = ship.addCrew(cs.race);
      c.name = cs.name; c.hp = cs.hp; c.maxhp = cs.maxhp; c.owner = owner;
      if (cs.xp) c.xp = cs.xp;
      if (cs.station !== undefined) c.station = cs.station;
    });
    s.rooms.forEach((rs, i) => {
      const rm = ship.rooms[i]; if (!rm) return;
      rm.dmg = rs.dmg; rm.water = rs.water; rm.leak = !!rs.leak; rm.scupper = !!rs.scupper;
      if (Array.isArray(rs.fires)) { for (let k = 0; k < rm._fires.length; k++) rm._fires[k] = rs.fires[k] || 0; } // per-tile grid
      else rm.fire = rs.fire || 0; // legacy number save -> seed via the shim setter
    });
    if (s.doorOpen) s.doorOpen.forEach((v, i) => { if (i < ship.doorOpen.length) ship.doorOpen[i] = !!v; });
    if (owner === 'player') stationPlayerCrew(ship);
    return ship;
  }
}

// crew of BOTH ships that are physically located on `ship` in `roomId`
function occupantsOf(ship, roomId, battle) {
  let list = ship.crew.filter(c => !c.dead && c.aboard === 'home' && c.roomId === roomId);
  if (battle) {
    const other = otherShip(ship, battle);
    if (other) list = list.concat(other.crew.filter(c => !c.dead && c.aboard === 'away' && c.roomId === roomId));
  }
  return list;
}
function otherShip(ship, battle) {
  if (!battle) return null;
  return battle.p === ship ? battle.e : battle.p;
}

function stationPlayerCrew(ship) {
  const stations = ['helm', 'weapons', 'sails', 'lookout', 'infirmary', 'wards', 'doors', 'core'];
  ship.crew.forEach((c, i) => {
    const r = (c.station >= 0 && ship.rooms[c.station]) ? ship.rooms[c.station] : ship.roomByKey(stations[i % stations.length]);
    if (r) { ship.placeCrew(c, r.id); c.station = r.id; }
  });
}

function buildPlayerShip() {
  const def = Object.assign({}, DATA.PLAYER_START, { name: 'DAWNCHASER' });
  const ship = new Ship(def);
  ship.owner = 'player';
  for (const c of ship.crew) c.owner = 'player';
  stationPlayerCrew(ship);
  return ship;
}
function buildEnemyShip(def) {
  const ship = new Ship(def);
  ship.owner = 'enemy';
  for (const c of ship.crew) c.owner = 'enemy';
  // enemies: power weapons on
  for (const w of ship.weapons) w.on = true;
  // station crew
  const stations = ['helm', 'weapons', 'sails', 'wards', 'infirmary'];
  ship.crew.forEach((c, i) => {
    const r = ship.roomByKey(stations[i % stations.length]);
    if (r) ship.placeCrew(c, r.id);
  });
  return ship;
}
