'use strict';
// ============ THE SHIPYARD — an animation + layout test room (title menu, beside the Music Room) ============
// Four tabs, all drawn with the REAL game renderers so what you see here is what a voyage shows:
//   Crew      — every race x every animation state: a lineup of all races side by side + a large focus view
//               with a filmstrip of the frames.
//   Weapons   — a live mini-battle (fire any weapon once or on loop, force hit / miss / warded, pick the target
//               room) plus a reference grid of every weapon's deck sprite and munition in flight.
//   Ships     — every layout x faction hull, crewed and interactive (walk crew through doors, open/shut doors,
//               set fires, flood, breach, damage systems).
//   Familiars & Effects — each familiar's deploy / idle / act, bound in a live scene, plus one-click combat
//               effects (hull hit, ward hit, lightning, Storm Conduit, Siren's Song, Portal, sinking, capture).
// Shared controls: speed, pause, frame step, zoom / game size, flip, backdrop, side switch, copy a feedback tag.
// The room runs on a SANDBOX run + ship: the real voyage (Game.run/ship/battle) is set aside on enter, restored
// on leave, and Game.save() is a no-op while Game._sandbox is set, so a save can never be overwritten from here.
const ShipyardScreen = {
  designW: 1920, designH: 1080,
  TABS: ['Crew', 'Weapons', 'Ships', 'Familiars & Effects'],
  RACES: ['human', 'merfolk', 'djinn', 'stormelf', 'dwarf', 'lizard', 'siren', 'admiral'],
  STATES: ['idle', 'walk', 'climb', 'operate', 'repair', 'firefight', 'fight', 'drown', 'down', 'poses'],
  STATE_LBL: { idle: 'Idle', walk: 'Walk', climb: 'Climb', operate: 'Operate', repair: 'Repair', firefight: 'Firefight', fight: 'Fight', drown: 'Drown', down: 'Die', poses: 'Every pose' },
  // Operate is per station (each family has its own prop): pressing Operate again steps to the next station
  STATIONS: [['helm', 'Helm'], ['sails', 'Sails'], ['weapons', 'Guns'], ['wards', 'Arcane'], ['sump', 'Pumps'], ['lookout', 'Lookout'], ['doors', 'Doors']],
  stateLabel(st) { return st === 'operate' ? 'Operate · ' + this.STATIONS[this.station || 0][1] : this.STATE_LBL[st]; },
  SPEEDS: [0.25, 0.5, 1, 2], SPEED_LBL: ['¼×', '½×', '1×', '2×'],
  BACKDROPS: ['Sea', 'Deck', 'Parchment'],
  CREW_ZOOMS: [1, 2, 3, 4, 5], SCENE_ZOOMS: [1, 1.5, 2, 3],
  TOOLS: ['Command crew', 'Set fire', 'Flood', 'Breach', 'Damage system', 'Kill sailor'],
  OUTCOMES: ['Hit', 'Miss', 'Warded'],
  SIDE: { x: 32, y: 150, w: 392, h: 724 },
  STAGE: { x: 448, y: 150, w: 1440, h: 724 },
  STEP: 1 / 30,

  // ---------------- lifecycle ----------------
  enter() {
    if (!this._saved) this._saved = { run: Game.run, ship: Game.ship, battle: Game.battle };
    Game._sandbox = true;
    Game.run = this.sandboxRun();
    AUDIO.stopMusic();
    this.tab = this.tab || 0;
    this.speed = this.speed == null ? 2 : this.speed; this.paused = false; this.clock = 0;
    this.crewZoom = this.crewZoom == null ? 3 : this.crewZoom; this.sceneZoom = this.sceneZoom || 0; this.gameSize = false;
    this.flip = false; this.backdrop = this.backdrop || 0; this.enemySide = false;
    this.race = this.race || 0; this.state = this.state || 0; this.station = this.station || 0; this.stateT0 = 0; this.walkAcross = false;
    this.wkey = this.wkey || 'lightcannon'; this.outcome = this.outcome || 0; this.loop = false; this.loopT = 0; this.refGrid = false;
    this.targetRoom = 0; this.wFam = this.wFam || 'cannon';
    this.hull = this.hull == null ? this.hullIndex('dawnchaser', 'human') : this.hull;
    this.tHull = this.tHull == null ? this.hullIndex('galleon', 'pirate') : this.tHull;
    this.crewRace = this.crewRace || 0; this.crewN = this.crewN || 4; this.tool = 0;
    this.bound = this.bound || ['emberimp', 'clockworkgull', 'reefsingers']; this.famAnim = {}; this.lastFx = null;
    this.toast = null; this.listScroll = 0;
    this.buildForTab();
  },
  leave() {
    const s = this._saved || {};
    Game.run = s.run || null; Game.ship = s.ship || null; Game.battle = s.battle || null;
    this._saved = null; Game._sandbox = false; this.b = null;
    AUDIO.play('title');
    Game.setScreen('title');
  },
  sandboxRun() {
    return {
      region: 0, nodeId: 0, front: -1.2, day: 1, shards: 999, runeshot: 999, candles: 999,
      augs: [], cargo: [], familiars: [], log: [], stats: { jumps: 0, kills: 0, shards: 0, crewLost: 0 },
      seenEvents: [], bossStage: 0, difficulty: 'captain', manaBought: 0, pendingWeapon: null, pendingAug: null,
      cheats: { systems: [] }, map: null, shopStock: null, shopNode: -1,
    };
  },

  // ---------------- hull catalogue (every painted layout x faction) ----------------
  hulls() {
    if (this._hulls) return this._hulls;
    const out = [], ships = (typeof window !== 'undefined' && window.ART && window.ART.ships) || {};
    for (const k of Object.keys(ships)) {
      if (/_fill$/.test(k)) continue;
      const rest = k.slice(5), lay = Object.keys(DATA.LAYOUTS).sort((a, b) => b.length - a.length).find(l => rest === l || rest.indexOf(l + '_') === 0);
      if (!lay) continue;
      const style = rest === lay ? (lay === 'dawnchaser' ? 'human' : 'human') : rest.slice(lay.length + 1);
      out.push({ layout: lay, style, name: DATA.LAYOUTS[lay].name, label: DATA.LAYOUTS[lay].name + (rest === lay ? '' : ' · ' + this.styleName(style)) });
    }
    if (!out.length) for (const l of Object.keys(DATA.LAYOUTS)) out.push({ layout: l, style: 'human', name: DATA.LAYOUTS[l].name, label: DATA.LAYOUTS[l].name });
    out.sort((a, b) => a.label.localeCompare(b.label));
    return (this._hulls = out);
  },
  styleName(s) { return ({ pirate: 'Pirate', human: 'Human', armada: 'Armada', merfolk: 'Merfolk', djinn: 'Djinn', stormelf: 'Storm Elf', dwarf: 'Dwarf', lizard: 'Lizardfolk', siren: 'Siren', ghost: 'Ghost' })[s] || s; },
  hullIndex(layout, style) { const i = this.hulls().findIndex(h => h.layout === layout && h.style === style); return i < 0 ? 0 : i; },

  // ---------------- sandbox ships + battle ----------------
  shipDef(h, crewRace, crewN, owner) {
    const L = DATA.LAYOUTS[h.layout], keys = new Set(L.rooms.map(r => r[0]));
    const sysLv = { helm: 1, sails: 2, weapons: 3, wards: keys.has('wards') ? 4 : 0, infirmary: keys.has('infirmary') ? 1 : 0, lookout: keys.has('lookout') ? 1 : 0, doors: keys.has('doors') ? 1 : 1, sump: 1 };
    const crew = []; for (let i = 0; i < crewN; i++) crew.push(crewRace);
    return { layout: h.layout, style: h.style, name: h.label.toUpperCase(), hull: 30, sysLv, manaMax: 16, weapons: ['lightcannon', 'lightcannon'], crew, mounts: 4 };
  },
  // a Battle with the sandbox ships; the enemy never thinks, hazards never strike, nobody flees or surrenders
  makeBattle(pDef, eDef) {
    const p = new Ship(pDef); p.owner = 'player'; for (const c of p.crew) c.owner = 'player'; stationPlayerCrew(p);
    Game.ship = p;
    const b = new Battle(Object.assign({}, eDef, { fleeAt: 0, surrenders: false }), { tier: 3, hazard: 'none', canFlee: false });
    b.enemyAI = () => {}; b.hazardStrike = () => { b.hazT = 1e9; }; b.hazT = 1e9;
    b.enemyInteriorHidden = () => false;
    b.e.fleeAt = 0; b.e.surrenders = false;
    for (const w of b.p.weapons) { w.on = false; w.target = -1; }
    for (const w of b.e.weapons) { w.on = false; w.target = -1; }
    b.logs = [];
    this.b = b; this.clockB = 0;
    return b;
  },
  buildForTab() {
    const H = this.hulls(), t = this.TABS[this.tab];
    this.b = null;
    if (t === 'Weapons') {
      const pd = this.shipDef(H[this.hullIndex('dawnchaser', 'human')] || H[0], 'human', 3);
      const ed = this.shipDef(H[this.tHull] || H[0], DATA.RACE_CREW[H[this.tHull].style] || 'human', 3);
      pd.weapons = [this.wkey]; ed.weapons = [this.wkey];
      this.makeBattle(pd, ed);
      this.targetRoom = Math.min(this.targetRoom, this.recv().rooms.length - 1);
    } else if (t === 'Ships') {
      const h = H[this.hull] || H[0], race = Object.keys(DATA.RACES)[this.crewRace % Object.keys(DATA.RACES).length];
      const me = this.shipDef(h, race, this.crewN), other = this.shipDef(H[this.hullIndex('sloop', 'pirate')] || H[0], 'human', 1);
      if (this.enemySide) this.makeBattle(other, me); else this.makeBattle(me, other);
    } else if (t === 'Familiars & Effects') {
      const pd = this.shipDef(H[this.hullIndex('dawnchaser', 'human')] || H[0], 'human', 4);
      pd.sysLv.shrine = 3; pd.sysLv.brinegate = 1; pd.sysLv.stormhex = 2; pd.sysLv.sirensong = 2;
      const ed = this.shipDef(H[this.tHull] || H[0], DATA.RACE_CREW[H[this.tHull].style] || 'human', 4);
      Game.run.familiars = this.bound.slice(0, 3);
      const b = this.makeBattle(pd, ed);
      const pw = b.p.powered.bind(b.p);
      b.p.powered = k => (k === 'shrine' ? 3 : (k === 'stormhex' || k === 'sirensong' || k === 'brinegate') ? 2 : pw(k));
      for (const k of Game.run.familiars) if (b.isOrbiting(k)) b.deployFamiliar(k);
      b.logs = [];
    }
  },
  // the ship that RECEIVES fire / effects, and the one that shoots
  recv() { const b = this.b; return !b ? null : (this.enemySide ? b.p : b.e); },
  shooter() { const b = this.b; return !b ? null : (this.enemySide ? b.e : b.p); },
  // which ship the Ships tab is showing
  shown() { const b = this.b; return !b ? null : (this.enemySide ? b.e : b.p); },

  // ---------------- clock ----------------
  update(dt) {
    if (this.toast && (this.toast.t -= dt) <= 0) this.toast = null;
    if (!this.paused) this.advance(dt * this.SPEEDS[this.speed]);
  },
  advance(d) {
    this.clock += d;
    const b = this.b; if (!b) return;
    let left = d;
    while (left > 1e-6) { const s = Math.min(1 / 30, left); this.stepBattle(s); left -= s; }
  },
  stepBattle(dt) {
    const b = this.b;
    // a finished battle (sunk / captured) would hand control to Game.endBattle: rebuild the scene first
    if (b.state !== 'fight' && b.stateT + dt > 3.6) { this.buildForTab(); return; }
    const t = this.TABS[this.tab];
    if (t === 'Weapons') {
      const dst = this.recv(), wd = DATA.WEAPONS[this.wkey];
      const o = this.OUTCOMES[this.outcome];
      b.rollDodge = () => o === 'Miss';
      for (const sh of [b.p, b.e]) { if (sh !== dst || o !== 'Warded') sh.wards.layers = 0; }
      if (o === 'Warded') dst.wards.layers = Math.max(dst.wards.layers, 3);
      if (this.loop) { this.loopT -= dt; if (this.loopT <= 0 && !(b.projectiles.length || (b.sweeps && b.sweeps.length))) { this.fire(); this.loopT = 1.1 + (wd.type === 'bomb' ? 0.4 : 0); } }
    }
    if (t !== 'Ships') { for (const sh of [b.p, b.e]) { sh.hull = sh.hullMax; for (const c of sh.crew) if (!c.dead) c.hp = c.maxhp; } }
    else { b.e.hull = b.e.hullMax; if (!this.enemySide) b.p.hull = Math.max(1, b.p.hull); }
    b.update(dt);
  },
  // one frame forward: the next animation frame on the Crew tab, 1/30 s elsewhere
  stepOnce() {
    this.paused = true;
    if (this.TABS[this.tab] === 'Crew') {
      const f = this.frameInfo(this.RACES[this.race], this.STATES[this.state], this.stateClock());
      const fps = f.fps || 10, clk = this.stateClock();
      this.clock += (Math.floor(clk * fps + 1e-6) + 1) / fps - clk + 1e-4;
    } else this.advance(this.STEP);
  },
  stateClock() { return this.clock - this.stateT0; },

  // ---------------- crew frames ----------------
  kit(race) { return (typeof window !== 'undefined' && window.CREW_ART && window.CREW_ART[race]) || {}; },
  frameInfo(race, st, clk) {
    if (st === 'poses') {
      const keys = Object.keys(this.kit(race)), n = keys.length || 1, i = Math.floor(clk * 2) % n;
      return { pose: keys[i], i, n, fps: 2, frames: keys, note: 'every pose in the kit, 2 per second', facesLeft: false, dy: 0 };
    }
    let opNote = null;
    if (st === 'operate') {   // the station picked with the Operate button -> that station's cycle (or what the game falls back to)
      const [key, lbl] = this.STATIONS[this.station || 0];
      st = DATA.stationAnim(key, race);
      if (st === 'idle') opNote = DATA.STATION_ANIM[key] ? 'no ' + lbl.toLowerCase() + ' art yet · stands at the post' : lbl + ': no prop · stands at the post';
      else if (st === 'operate') opNote = 'no helm video yet · the still kit\'s wheel pose';
    }
    const ra = DATA._resolveAnim(st, race), a = ra.a, n = ra.frames.length;
    let c = clk;
    if (a.loop === false) c = clk % (n / (a.fps || 8) + 1.2);       // the death one-shot replays after a beat
    const pose = DATA.crewAnimFrame(st, c, race);
    const have = this.kit(race), hd = ra.frames.some(f => a.frames.includes(f)) && (!a.marker || have[a.marker]);
    let note = (ra.isVideo ? 'video kit' : hd ? 'HD kit' : 'still kit') + ' · ' + n + ' frame' + (n === 1 ? '' : 's') + (a.fps && n > 1 ? ' · ' + a.fps + ' fps' : '');
    if (st === 'firefight' && ra.frames[0] === 'repair') note = 'no firefight art yet · borrows the repair pose';
    if (st === 'drown' && ra.frames[0] === 'idle_side') note = 'no drown art yet · borrows idle';
    if (st === 'down' && ra.frames[0] === 'down') note = 'still kit · 1 death pose';
    if (opNote) note = opNote;
    return { pose, i: Math.max(0, ra.frames.indexOf(pose)), n, fps: a.fps || 0, frames: ra.frames, note, facesLeft: !!ra.facesLeft, dy: DATA.crewAnimDY(st, c, race) };
  },
  raceName(r) { return r === 'admiral' ? 'Admiral' : (DATA.RACES[r] ? DATA.RACES[r].name : r); },
  // one sailor, feet at (x, footY), s = screen px per logical px (game size = CombatScreen.hdScale())
  drawSailor(ctx, race, pose, flip, facesLeft, x, footY, s, dy) {
    ctx.save(); ctx.translate(x, footY); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(20,12,6,0.30)'; ctx.beginPath(); ctx.ellipse(0, 0.6, 6.5, 1.7, 0, 0, 7); ctx.fill();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    if (!SPR.drawCrewPose(ctx, race, pose, flip !== facesLeft, 0, dy || 0, TUNING.crewDrawH) && SPR.artPending('crew_' + race + '_' + pose)) {
      // art still downloading: three pulsing dots where the sailor will stand (instead of an empty shadow)
      const t = (typeof performance !== 'undefined' ? performance.now() : 0) / 1000;
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = 'rgba(255,246,224,' + (0.35 + 0.55 * Math.max(0, Math.sin(t * 5 - i * 0.9))).toFixed(2) + ')';
        ctx.beginPath(); ctx.arc((i - 1) * 3.2, -10, 1.1, 0, 7); ctx.fill();
      }
    }
    ctx.restore();
  },
  gameScale() { return CombatScreen.hdScale(); },

  // ---------------- feedback tag ----------------
  tag() {
    const t = this.TABS[this.tab];
    if (t === 'Crew') {
      const r = this.RACES[this.race], st = this.STATES[this.state], f = (this.walkAcross && (st === 'walk' || st === 'climb') && this._focusFrame) || this.frameInfo(r, st, this.stateClock());
      return this.raceName(r) + ' · ' + this.stateLabel(st).toLowerCase() + ' · frame ' + (f.i + 1) + ' of ' + f.n + ' (' + f.pose + ')' + (this.flip ? ' · flipped' : '');
    }
    if (t === 'Weapons') {
      const wd = DATA.WEAPONS[this.wkey];
      if (this.refGrid) return wd.name + ' · reference grid';
      const dst = this.recv(), room = dst && dst.rooms[this.targetRoom];
      return wd.name + ' · ' + this.OUTCOMES[this.outcome].toLowerCase() + ' · ' + (this.enemySide ? 'enemy fires at you' : 'you fire') + ' · target ' + this.roomName(room);
    }
    if (t === 'Ships') {
      const h = this.hulls()[this.hull], sh = this.shown(), hov = this._hoverRoom != null && sh ? sh.rooms[this._hoverRoom] : null;
      return h.label + ' (' + h.layout + '/' + h.style + ')' + (this.enemySide ? ' · as enemy' : '') + (hov ? ' · room ' + this.roomName(hov) : '');
    }
    return (this.lastFx || 'familiars ' + this.bound.map(k => DATA.FAMILIARS[k].name).join(', ')) + (this.enemySide ? ' · on your ship' : '');
  },
  roomName(r) { return !r ? '—' : r.key ? DATA.SYSTEMS[r.key].name : r.mount ? 'Open mount' : 'Corridor'; },
  copyTag() {
    const s = this.tag();
    try { if (typeof navigator !== 'undefined' && navigator.clipboard) navigator.clipboard.writeText(s); } catch (e) {}
    this.toast = { s: 'Copied: ' + s, t: 2.2 };
  },

  // ---------------- input ----------------
  key(k) {
    if (k === 'Escape') { this.leave(); return; }
    if (k === ' ') { this.paused = !this.paused; return; }
    if (k === '.' || k === 'ArrowRight') { this.stepOnce(); return; }
    if (this.TABS[this.tab] === 'Weapons' && (k === 'f' || k === 'F' || k === 'Enter')) this.fire();
  },
  click(x, y, btn) {
    const R = this._sceneR; if (!R || !this.b || !KIT.inR(x, y, R)) return;
    const p = this.toScene(x, y), b = this.b, t = this.TABS[this.tab];
    if (t === 'Weapons') { const rid = b.roomAt(this.recv(), p.x, p.y); if (rid !== null) { this.targetRoom = rid; AUDIO.sfx('click'); } return; }
    if (t === 'Ships') {
      const sh = this.shown(), tool = this.TOOLS[this.tool];
      if (tool === 'Command crew') { if (!this.enemySide) b.click(p.x, p.y, btn); return; }
      const rid = b.roomAt(sh, p.x, p.y); if (rid === null) return;
      this.applyTool(sh, sh.rooms[rid], p);
      return;
    }
    if (t === 'Familiars & Effects') { const rid = b.roomAt(this.recv(), p.x, p.y); if (rid !== null) this.targetRoom = rid; }
  },
  applyTool(sh, r, p) {
    const tool = this.TOOLS[this.tool], b = this.b;
    if (tool === 'Set fire') { const loc = b.screenToLocal(sh, p.x, p.y); sh.igniteTileAt(r, loc.x, loc.y, TUNING.newFireHp) || sh.igniteRandomTile(r, TUNING.newFireHp); AUDIO.sfx('fire'); }
    else if (tool === 'Flood') { r.water = r.water > 0.5 ? 0 : 1; AUDIO.sfx('splash'); }
    else if (tool === 'Breach') { r.leak = !r.leak; AUDIO.sfx('creak'); }
    else if (tool === 'Damage system') { if (r.key && sh.sysLv[r.key]) { r.dmg = r.dmg >= sh.sysLv[r.key] ? 0 : r.dmg + 1; r._hitFlash = TUNING.roomFlashSecs; AUDIO.sfx('hit'); } }
    else if (tool === 'Kill sailor') { const c = sh.crew.find(c => !c.dead && c.aboard === 'home' && c.roomId === r.id); if (c) sh.killCrew(c, b); }
  },

  // ---------------- weapons ----------------
  weaponList() {
    if (this._wl) return this._wl;
    const FAM = ['cannon', 'missile', 'bomb', 'beam', 'magic', 'horn'];
    const W = DATA.WEAPONS, ks = Object.keys(W).filter(k => !W[k].hidden);
    ks.sort((a, b) => (FAM.indexOf(this.famOf(W[a])) - FAM.indexOf(this.famOf(W[b]))) || ((W[a].cost || 0) - (W[b].cost || 0)));
    return (this._wl = ks);
  },
  famOf(wd) { return wd.type === 'beam' ? 'beam' : wd.type === 'missile' ? 'missile' : wd.family; },
  pickWeapon(k) {
    this.wkey = k;
    if (this.b && this.TABS[this.tab] === 'Weapons') {
      for (const sh of [this.b.p, this.b.e]) { const w = sh.weapons[0]; if (w) { w.key = k; w.charge = 0; w._ramp = 0; w._bank = 0; w.beamAim = null; } }
    }
  },
  fire() {
    const b = this.b; if (!b || this.TABS[this.tab] !== 'Weapons') return;
    const wd = DATA.WEAPONS[this.wkey], src = this.shooter(), dst = wd.selfCast ? src : this.recv();
    const w = src.weapons[0] || (src.weapons[0] = { key: this.wkey, charge: 0, on: false, target: -1 });
    w.key = this.wkey; w.on = false;
    const tr = Math.min(this.targetRoom, dst.rooms.length - 1);
    w.target = tr;
    if (wd.type === 'beam') {
      const r = dst.rooms[tr], ax = r.x * TILE + 2, ay = (r.y + r.h / 2) * TILE, len = b.beamLen(wd);
      const right = dst.beamPath(ax, ay, 0, len).rooms.length, left = dst.beamPath(ax + r.w * TILE - 4, ay, Math.PI, len).rooms.length;
      w.beamAim = right >= left ? { x: ax, y: ay, angle: 0 } : { x: ax + r.w * TILE - 4, y: ay, angle: Math.PI };
    }
    if (wd.charger) w._bank = wd.charger;
    b.fireWeapon(src, dst, w, 0);
    w.target = -1;
  },

  // ---------------- familiars + effects ----------------
  toggleBound(k) {
    const i = this.bound.indexOf(k);
    if (i >= 0) this.bound.splice(i, 1); else { this.bound.push(k); if (this.bound.length > 3) this.bound.shift(); }
    this.buildForTab();
  },
  famDeploy(k) { this.famAnim[k] = Object.assign(this.famAnim[k] || {}, { dep: this.clock }); const b = this.b; if (b && b.activeFamiliars().includes(k)) { b._famDeploy = b._famDeploy || {}; b._famDeploy[k] = b.simTime; } this.lastFx = DATA.FAMILIARS[k].name + ' · deploy'; },
  famAct(k) { this.famAnim[k] = Object.assign(this.famAnim[k] || {}, { act: this.clock }); const b = this.b; if (b) { b._famAct = b._famAct || {}; b._famAct[k] = b.time; } this.lastFx = DATA.FAMILIARS[k].name + ' · act'; },
  EFFECTS: [
    { id: 'hullhit', label: 'Hull hit', tip: 'Shake, flash, hit-stop, −1 floater on the target room' },
    { id: 'wardhit', label: 'Ward hit', tip: 'A light cannon ball breaks against the wards' },
    { id: 'fire', label: 'Fire', tip: 'Light three tiles in the target room' },
    { id: 'flood', label: 'Flood', tip: 'Fill the target room with water' },
    { id: 'breach', label: 'Breach', tip: 'Hole the target room: it leaks until patched' },
    { id: 'lightning', label: 'Lightning', tip: 'A storm bolt strikes the target room' },
    { id: 'storm', label: 'Storm Conduit', tip: 'Lightning tether jams an enemy system', playerOnly: true },
    { id: 'song', label: "Siren's Song", tip: 'Charm an enemy sailor to fight their own crew', playerOnly: true },
    { id: 'portal', label: 'Portal', tip: 'Two of your crew board the enemy (press again to recall)', playerOnly: true },
    { id: 'sink', label: 'Sink', tip: 'The target ship goes down (the scene resets after)' },
    { id: 'capture', label: 'Capture', tip: 'Every enemy sailor falls: the prize beat', playerOnly: true },
    { id: 'reset', label: 'Reset scene', tip: 'Rebuild both ships' },
  ],
  doEffect(id) {
    const b = this.b; if (!b) return;
    const dst = this.recv(), src = dst === b.p ? b.e : b.p;
    const room = dst.rooms[Math.min(this.targetRoom, dst.rooms.length - 1)], rr = b.roomRect(dst, room);
    const fx = this.EFFECTS.find(e => e.id === id); this.lastFx = fx ? fx.label + ' · ' + this.roomName(room) : id;
    if (id === 'hullhit') { dst.damageHull(1); b.hitFeedback(dst, room, 1); AUDIO.sfx('hit'); b.boom(rr.x + rr.w / 2, rr.y + rr.h / 2, 6); }
    else if (id === 'wardhit') {
      dst.wards.layers = 3; b.rollDodge = () => false;
      const w = { key: 'lightcannon', charge: 0, on: false, target: room.id };
      b.fireWeapon(src, dst, w, 0);
    }
    else if (id === 'fire') { for (let i = 0; i < 3; i++) dst.igniteRandomTile(room, TUNING.newFireHp); AUDIO.sfx('fire'); }
    else if (id === 'flood') { room.water = 1; AUDIO.sfx('splash'); }
    else if (id === 'breach') { room.leak = true; AUDIO.sfx('creak'); b.boom(rr.x + rr.w / 2, rr.y + rr.h, 4); }
    else if (id === 'lightning') {
      dst.damageSystem(room, 1); b.flash = 0.25; b.addTrauma(0.3); AUDIO.sfx('lightning'); b.boom(rr.x + rr.w / 2, rr.y, 5);
      b.beams.push({ x1: rr.x + rr.w / 2 + U.rf(-30, 30), y1: -10, x2: rr.x + rr.w / 2, y2: rr.y + rr.h / 2, t: 0.4, col: '#dff6ff', bolt: true });
    }
    else if (id === 'storm') { b.p.hexCd = 0; const er = b.e.rooms.findIndex(r => r.key); b.doStormhex(room.key ? room.id : er); }
    else if (id === 'song') {
      b.p.songCd = 0;
      const here = b.e.aliveCrew().filter(c => c.aboard === 'home' && c.owner === 'enemy' && c.race !== 'merfolk');
      if (here.length) b.doSirensong(here.some(c => c.roomId === room.id) ? room.id : here[0].roomId); else b.log('NO ONE THERE TO CHARM.');
    }
    else if (id === 'portal') {
      b.p.gateCd = 0;
      if (b.p.crew.some(c => !c.dead && c.aboard === 'away')) b.tryRecall();
      else { const gr = b.p.roomByKey('brinegate'); if (gr) { b.p.aliveCrew().slice(0, 2).forEach(c => b.p.placeCrew(c, gr.id)); b.doTeleport(room.id); } }
    }
    else if (id === 'sink') { dst.hull = 0; if (dst === b.e) { b.state = 'won'; b.banner = 'ENEMY SHIP DESTROYED!'; } else { b.state = 'lost'; b.banner = 'THE DAWNCHASER GOES DOWN!'; } b.stateT = 0; b.boom(b.eX() + b.e.rw / 2, b.eY() + b.e.rh / 2, 26); AUDIO.sfx('explode'); }
    else if (id === 'capture') { for (const c of b.e.crew) if (!c.dead) b.e.killCrew(c, b); }
    else if (id === 'reset') this.buildForTab();
  },

  // ---------------- scene rendering (the real battle renderers, any rect, any zoom) ----------------
  // view = { cx, cy, s }: the scene-logical point at the rect centre and screen px per logical px
  sceneView(R) {
    const t = this.TABS[this.tab], b = this.b, z = this.SCENE_ZOOMS[this.sceneZoom];
    if (t === 'Ships') {
      const sh = this.shown(), x0 = sh === b.p ? b.pX() : b.eX(), cx = x0 + sh.rw / 2, cy = (sh === b.p ? b.pY() : b.eY()) + sh.rh / 2 - 22;
      const fit = Math.min(R.w / (sh.rw + 120), R.h / 190);
      return { cx, cy, s: this.gameSize ? this.gameScale() : fit * z };
    }
    const fit = Math.min(R.w / 512, R.h / 200);
    return { cx: 256, cy: 112, s: this.gameSize ? this.gameScale() : fit * z };
  },
  clampView(v, R) {
    const hh = R.h / 2 / v.s;
    if (hh * 2 <= 228) v.cy = U.clamp(v.cy, hh, 228 - hh); // keep the sky/sea plate filling the frame vertically
    return v;
  },
  toScene(x, y) { const v = this._view, R = this._sceneR; return { x: v.cx + (x - R.x - R.w / 2) / v.s, y: v.cy + (y - R.y - R.h / 2) / v.s }; },
  renderScene(ctx, R, only) {
    const b = this.b; if (!b) return;
    const v = this.clampView(this.sceneView(R), R); this._view = v; this._sceneR = R;
    const k = (Game.canvas && Game.canvas.width ? Game.canvas.width / 1920 : 1), W = Math.max(1, Math.round(R.w * k)), H = Math.max(1, Math.round(R.h * k));
    if (!this._sc || this._sc.width !== W || this._sc.height !== H) { this._sc = document.createElement('canvas'); this._sc.width = W; this._sc.height = H; this._sctx = this._sc.getContext('2d'); }
    const o = this._sctx, s = v.s * k;
    o.setTransform(1, 0, 0, 1, 0, 0);
    const g = o.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#6fa9d8'); g.addColorStop(0.62, '#a9d3ec'); g.addColorStop(0.63, '#1f5f96'); g.addColorStop(1, '#0d3560');
    o.fillStyle = g; o.fillRect(0, 0, W, H);
    const shk = b.shakeOffset ? b.shakeOffset() : { x: 0, y: 0 };
    o.setTransform(s, 0, 0, s, W / 2 - v.cx * s + shk.x * s, H / 2 - v.cy * s + shk.y * s);
    o.imageSmoothingEnabled = true; o.imageSmoothingQuality = 'high';
    const m = this.toSceneRaw(Game.mouse.x, Game.mouse.y, R, v); b._aimMouse = m;
    // the painted sea only spans x 0..512: mirror it out to both sides so a zoomed / shifted camera never shows an edge
    o.save(); o.scale(-1, 1); b.renderSea(o); o.restore();
    o.save(); o.translate(1024, 0); o.scale(-1, 1); b.renderSea(o); o.restore();
    b.renderSea(o);
    if (only !== 'p') b.renderShip(o, b.e);
    if (only !== 'e') b.renderShip(o, b.p);
    b.renderProjectiles(o); b.renderSweeps(o); b.renderHazardFx(o);
    if (b.renderParticles) b.renderParticles(o);
    if (b.renderFloaters) b.renderFloaters(o);
    // the aimed / targeted room: a teal outline
    const tgt = this.TABS[this.tab] !== 'Ships' ? this.recv() : null;
    if (tgt && tgt.rooms[this.targetRoom]) { const rr = b.roomRect(tgt, tgt.rooms[this.targetRoom]); o.strokeStyle = 'rgba(95,240,208,0.95)'; o.lineWidth = 1.2; o.strokeRect(rr.x - 0.5, rr.y - 0.5, rr.w + 1, rr.h + 1); o.lineWidth = 1; }
    if (b.flash > 0) { o.save(); o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'lighter'; o.fillStyle = 'rgba(255,240,215,' + (TUNING.sceneFlashMax * Math.min(1, b.flash / 0.25)).toFixed(3) + ')'; o.fillRect(0, 0, W, H); o.restore(); }
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(this._sc, 0, 0, W, H, R.x, R.y, R.w, R.h); ctx.restore();
    ctx.strokeStyle = 'rgba(40,26,12,0.9)'; ctx.lineWidth = 2; ctx.strokeRect(R.x + 1, R.y + 1, R.w - 2, R.h - 2); ctx.lineWidth = 1;
    // the latest battle chatter, so effects that only log (resists, recharges) still read
    const logs = (b.logs || []).slice(-2);
    logs.forEach((l, i) => {
      const txt = CombatScreen.sentenceCase(l.msg, b) + (l.n > 1 ? '  ×' + l.n : ''), y = R.y + R.h - 34 - (logs.length - 1 - i) * 30;
      KIT.pill(ctx, R.x + 14, y - 2, Math.min(R.w - 28, TYPE.width(ctx, txt, 18, {}) + 28), 28, 0.55);
      KIT.text(ctx, txt, { x: R.x + 28, y, w: R.w - 56, h: 24 }, { size: 18, color: '#f3e6c4', fit: 'ellipsis' });
    });
  },
  toSceneRaw(x, y, R, v) { return { x: v.cx + (x - R.x - R.w / 2) / v.s, y: v.cy + (y - R.y - R.h / 2) / v.s }; },

  // ---------------- backdrop for the crew + familiar views ----------------
  drawBackdrop(ctx, R) {
    ctx.save(); ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
    const bd = this.BACKDROPS[this.backdrop];
    if (bd === 'Sea') {
      const bg = SPR.bgImage ? SPR.bgImage('day') : null;
      if (bg) { const sc = Math.max(R.w / bg.width, R.h / bg.height); ctx.imageSmoothingEnabled = true; ctx.drawImage(bg, R.x + (R.w - bg.width * sc) / 2, R.y + (R.h - bg.height * sc) / 2, bg.width * sc, bg.height * sc); }
      else { ctx.fillStyle = '#8fc4e6'; ctx.fillRect(R.x, R.y, R.w, R.h); }
    } else if (bd === 'Deck') {
      ctx.fillStyle = '#dccaa4'; ctx.fillRect(R.x, R.y, R.w, R.h);
      ctx.fillStyle = '#d2c098'; for (let yy = R.y + 12; yy < R.y + R.h; yy += 24) ctx.fillRect(R.x, yy, R.w, 12);
      ctx.fillStyle = 'rgba(168,146,108,0.55)'; for (let gx = R.x + 48; gx < R.x + R.w; gx += 48) ctx.fillRect(gx, R.y, 2, R.h);
    } else { KIT.parchFill(ctx, R.x, R.y, R.w, R.h, 0.2); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(40,26,12,0.9)'; ctx.lineWidth = 2; ctx.strokeRect(R.x + 1, R.y + 1, R.w - 2, R.h - 2); ctx.lineWidth = 1;
  },

  // ---------------- render ----------------
  render(ctx) {
    const W = 1920, H = 1080;
    this._sceneR = null;
    KIT.page(ctx, W, H);
    KIT.text(ctx, 'The Shipyard', { x: 32, y: 26, w: 400, h: 64 }, { size: 50, display: true, color: COL.inkdk, shadow: 'rgba(255,240,205,0.5)', shadowDx: 1, shadowDy: 1, fit: 'shrink' });
    KIT.text(ctx, 'Every sprite, gun and hull, on demand.', { x: 32, y: 90, w: 400, h: 30 }, { size: 19, italic: true, color: COL.inkmd, fit: 'shrink' });
    KIT.tabs(ctx, 'yard.tab', { x: this.STAGE.x, y: 74, w: this.STAGE.w, h: 64 }, this.TABS, this.tab, i => { if (i !== this.tab) { this.tab = i; this.enemySide = false; this.gameSize = false; this.buildForTab(); } }, { size: 24 });
    const t = this.TABS[this.tab];
    if (t === 'Crew') this.renderCrew(ctx);
    else if (t === 'Weapons') this.renderWeapons(ctx);
    else if (t === 'Ships') this.renderShips(ctx);
    else this.renderEffects(ctx);
    this.renderControls(ctx);
    KIT.flushFrames(ctx);
    KIT.flushTip(ctx, W, H);
  },
  // a column of recessed choice buttons; returns the y after the last row
  choices(ctx, idBase, x, y, w, labels, active, onPick, o) {
    o = o || {};
    const cols = o.cols || 2, bh = o.h || 42, gap = 8, bw = (w - gap * (cols - 1)) / cols;
    labels.forEach((lb, i) => {
      const r = { x: x + (i % cols) * (bw + gap), y: y + Math.floor(i / cols) * (bh + gap), w: bw, h: bh };
      KIT.button(ctx, idBase + '.' + i, r, lb, { variant: 'recess', live: Array.isArray(active) ? active.includes(i) : i === active, size: o.size || 18, onClick: () => onPick(i), tip: o.tips ? o.tips[i] : null, disabled: o.disabled ? o.disabled(i) : false, reason: o.reason ? o.reason(i) : null });
    });
    return y + Math.ceil(labels.length / cols) * (bh + gap) - gap;
  },
  heading(ctx, s, x, y, w) { KIT.text(ctx, s, { x, y, w, h: 26 }, { size: 17, display: true, color: COL.brasshi, shadow: 'rgba(16,9,3,0.85)', shadowDx: 1, shadowDy: 1 }); return y + 30; },

  // ---------- CREW ----------
  renderCrew(ctx) {
    const S = this.SIDE, c = KIT.panel(ctx, S, { title: 'Sailors', wood: true });
    let y = this.heading(ctx, 'Race', c.x, c.y, c.w);
    y = this.choices(ctx, 'yard.race', c.x, y, c.w, this.RACES.map(r => this.raceName(r)), this.race, i => { this.race = i; }, { h: 38 }) + 16;
    y = this.heading(ctx, 'Animation', c.x, y, c.w);
    y = this.choices(ctx, 'yard.state', c.x, y, c.w, this.STATES.map(s => this.stateLabel(s)), this.state, i => { if (i === this.state && this.STATES[i] === 'operate') this.station = ((this.station || 0) + 1) % this.STATIONS.length; this.state = i; this.stateT0 = this.clock; }, { h: 38, size: 17 }) + 16;
    const race = this.RACES[this.race], st = this.STATES[this.state], clk = this.stateClock(), f = this.frameInfo(race, st, clk);
    const info = { x: c.x, y, w: c.w, h: 86 };
    KIT.card(ctx, info);
    KIT.text(ctx, this.raceName(race) + ' · ' + this.stateLabel(st), { x: info.x + 16, y: info.y + 10, w: info.w - 32, h: 28 }, { size: 20, display: true, color: COL.inkdk, fit: 'shrink' });
    KIT.text(ctx, f.note, { x: info.x + 16, y: info.y + 40, w: info.w - 32, h: 44 }, { size: 16, italic: true, color: COL.inkmd, fit: 'wrap', lineGap: 3, valign: 'top' });
    y += info.h + 12;
    const moving = st === 'walk' || st === 'climb';
    KIT.button(ctx, 'yard.across', { x: c.x, y, w: c.w, h: 42 }, this.walkAcross ? 'Walking across the deck' : 'Walking in place', { variant: 'recess', live: this.walkAcross, size: 18, disabled: !moving, reason: 'Only Walk and Climb travel.', onClick: () => { this.walkAcross = !this.walkAcross; },
      tip: [{ t: 'Walk across', c: TIP.ink }, { t: 'The focus sailor travels at his battle speed and his frames advance by distance, exactly as in combat, so foot-sliding shows.', c: TIP.body }] });

    // stage: lineup (all races) on top, focus + filmstrip below
    const G = this.STAGE, top = { x: G.x, y: G.y, w: G.w, h: 300 }, bot = { x: G.x, y: G.y + 316, w: G.w, h: G.h - 316 };
    this.drawBackdrop(ctx, top); this.drawBackdrop(ctx, bot);
    const gs = this.gameScale(), lsc = this.gameSize ? gs : gs * 2, n = this.RACES.length, cw = top.w / n;
    const ink = this.BACKDROPS[this.backdrop] === 'Sea' ? '#fff6e0' : COL.inkdk, sub = this.BACKDROPS[this.backdrop] === 'Sea' ? 'rgba(255,246,224,0.85)' : COL.inkmd, shd = this.BACKDROPS[this.backdrop] === 'Sea' ? 'rgba(10,6,2,0.85)' : null;
    for (let i = 0; i < n; i++) {
      const r = this.RACES[i], fi = this.frameInfo(r, st, clk), cx = top.x + cw * (i + 0.5), cell = { x: top.x + cw * i, y: top.y, w: cw, h: top.h };
      KIT.reg('yard.lineup.' + i, cell, { onClick: () => { this.race = i; } });
      if (i === this.race) { ctx.fillStyle = 'rgba(95,240,208,0.14)'; ctx.fillRect(cell.x + 4, cell.y + 4, cell.w - 8, cell.h - 8); }
      ctx.save(); ctx.beginPath(); ctx.rect(cell.x, cell.y, cell.w, cell.h); ctx.clip();
      this.drawSailor(ctx, r, fi.pose, this.flip, fi.facesLeft, cx, top.y + 222, lsc, fi.dy);
      ctx.restore();
      KIT.text(ctx, this.raceName(r), { x: cell.x + 6, y: top.y + 236, w: cell.w - 12, h: 26 }, { size: 19, display: true, align: 'center', color: ink, fit: 'shrink', shadow: shd, shadowDx: 1, shadowDy: 1 });
      KIT.text(ctx, (fi.i + 1) + ' / ' + fi.n + (fi.note.indexOf('borrows') >= 0 ? ' · borrowed' : ''), { x: cell.x + 6, y: top.y + 264, w: cell.w - 12, h: 22 }, { size: 15, italic: true, align: 'center', color: sub, fit: 'shrink', shadow: shd, shadowDx: 1, shadowDy: 1 });
    }
    // focus
    const fz = this.gameSize ? gs : gs * this.CREW_ZOOMS[this.crewZoom], fr = { x: bot.x, y: bot.y, w: 760, h: bot.h };
    let fx = fr.x + fr.w / 2, flip = this.flip, ff = f;
    if (this.walkAcross && moving) {
      const ra = DATA._resolveAnim(st, race), nfr = ra.frames.length, fps = ra.a.fps || 10;
      const stride = st === 'climb' ? TUNING.crewClimbStride : (TUNING.crewStride[race] || TUNING.crewStride.default);
      const spd = TUNING.crewMoveSpeed * ((DATA.RACES[race] || {}).spd || 1), span = (fr.w - 160) / fz;
      const dist = clk * spd, leg = dist % (span * 2), back = leg > span;
      fx = fr.x + 80 + (back ? span * 2 - leg : leg) * fz; flip = back !== this.flip;
      ff = this.frameInfo(race, st, dist / stride * (nfr / fps));
    }
    this._focusFrame = ff;
    ctx.save(); ctx.beginPath(); ctx.rect(fr.x, fr.y, fr.w, fr.h); ctx.clip();
    this.drawSailor(ctx, race, ff.pose, flip, ff.facesLeft, fx, fr.y + fr.h - 40, fz, ff.dy);
    ctx.restore();
    KIT.text(ctx, this.gameSize ? 'Game size' : 'Zoom ' + this.CREW_ZOOMS[this.crewZoom] + '× game size', { x: fr.x + 14, y: fr.y + 10, w: 300, h: 24 }, { size: 16, italic: true, color: sub, shadow: shd, shadowDx: 1, shadowDy: 1 });
    // filmstrip: every frame of this animation; click one to pause on it
    const strip = { x: fr.x + fr.w + 16, y: bot.y + 14, w: bot.w - fr.w - 30, h: bot.h - 28 };
    const frames = ff.frames, nn = frames.length, cols = nn <= 4 ? nn : Math.min(8, Math.ceil(nn / 2)), rows = Math.ceil(nn / cols);
    const tw = Math.min(170, (strip.w - (cols - 1) * 8) / cols), th = Math.min(210, (strip.h - (rows - 1) * 8) / rows);
    frames.forEach((pk, i) => {
      const r = { x: strip.x + (i % cols) * (tw + 8), y: strip.y + Math.floor(i / cols) * (th + 8), w: tw, h: th };
      const on = i === ff.i;
      KIT.card(ctx, r, { tint: on ? 'rgba(95,240,208,0.22)' : null, edge: on ? '#2f8a72' : null, studs: false });
      KIT.reg('yard.frame.' + i, r, { onClick: () => { this.paused = true; const fps = ff.fps || 2; this.clock = this.stateT0 + (i + 0.5) / fps; } });
      ctx.save(); ctx.beginPath(); ctx.rect(r.x + 3, r.y + 3, r.w - 6, r.h - 6); ctx.clip();
      const s = Math.min((th - 44) / (TUNING.crewDrawH * 1.35), (tw - 12) / (TUNING.crewDrawH * 1.2));
      this.drawSailor(ctx, race, pk, this.flip, ff.facesLeft, r.x + r.w / 2, r.y + r.h - 30, s, 0);
      ctx.restore();
      KIT.text(ctx, (i + 1) + ' · ' + pk, { x: r.x + 4, y: r.y + r.h - 26, w: r.w - 8, h: 20 }, { size: 13, align: 'center', color: COL.inkmd, fit: 'shrink', minSize: 10 });
    });
  },

  // ---------- WEAPONS ----------
  renderWeapons(ctx) {
    const S = this.SIDE, c = KIT.panel(ctx, S, { title: 'Armoury', wood: true });
    const ks = this.weaponList(), W = DATA.WEAPONS, cols = 2, bh = 30, gap = 4, bw = (c.w - 8) / cols, rows = Math.ceil(ks.length / cols);
    const rh = Math.min(bh + gap, (c.h + gap) / rows);
    ks.forEach((k, i) => {
      const col = Math.floor(i / rows), row = i % rows, r = { x: c.x + col * (bw + 8), y: c.y + row * rh, w: bw, h: rh - gap };
      KIT.button(ctx, 'yard.wpn.' + k, r, W[k].name, { variant: 'recess', live: k === this.wkey, size: 15, onClick: () => this.pickWeapon(k),
        tip: [{ t: W[k].name, c: TIP.ink }, { t: this.famOf(W[k]) + ' · ' + (W[k].dmg || 0) + ' dmg' + (W[k].shots > 1 ? ' × ' + W[k].shots : '') + ' · charge ' + W[k].charge + 's', c: TIP.body }, { t: W[k].desc || '', c: TIP.body }] });
    });
    const G = this.STAGE, bar = { x: G.x, y: G.y, w: G.w, h: 52 }, wd = W[this.wkey];
    let x = bar.x;
    const B = (id, w, label, o) => { KIT.button(ctx, id, { x, y: bar.y, w, h: bar.h }, label, Object.assign({ size: 20 }, o)); x += w + 10; };
    B('yard.view', 210, this.refGrid ? 'Reference grid' : 'Live battle', { variant: 'wood', onClick: () => { this.refGrid = !this.refGrid; }, tip: [{ t: 'Switch view', c: TIP.ink }, { t: 'Live battle fires the gun between two ships; the reference grid shows every weapon at once.', c: TIP.body }] });
    if (!this.refGrid) {
      B('yard.fire', 150, 'Fire', { onClick: () => this.fire(), tip: [{ t: 'Fire once', c: TIP.ink }, { t: 'F or Enter also fires.', c: TIP.body }] });
      B('yard.loop', 150, this.loop ? 'Looping' : 'Loop', { variant: 'recess', live: this.loop, onClick: () => { this.loop = !this.loop; this.loopT = 0; } });
      this.OUTCOMES.forEach((o, i) => {
        const bomb = wd.type === 'bomb' && o === 'Miss', bypass = (wd.type === 'bomb' || wd.type === 'missile') && o === 'Warded';
        B('yard.out.' + i, 120, o, { variant: 'recess', live: this.outcome === i, onClick: () => { this.outcome = i; }, disabled: bomb || bypass || (wd.type === 'beam' && o === 'Miss'),
          reason: bomb ? 'Runeshot charges appear inside the hull: they cannot be dodged.' : bypass ? 'Torpedoes and runeshot charges pass beneath the wards.' : 'Lances never miss.' });
      });
      B('yard.target', 300, 'Target: ' + this.hulls()[this.tHull].label, { variant: 'wood', size: 17, onClick: () => { this.tHull = (this.tHull + 1) % this.hulls().length; this.buildForTab(); }, onRight: () => { this.tHull = (this.tHull - 1 + this.hulls().length) % this.hulls().length; this.buildForTab(); },
        tip: [{ t: 'Target hull', c: TIP.ink }, { t: 'Click for the next hull, right-click for the previous. Click a room in the scene to aim at it.', c: TIP.body }] });
      B('yard.reset', G.x + G.w - x, 'Reset', { onClick: () => this.buildForTab() });
      this.renderScene(ctx, { x: G.x, y: G.y + 64, w: G.w, h: G.h - 64 });
    } else this.renderRefGrid(ctx, { x: G.x, y: G.y + 64, w: G.w, h: G.h - 64 });
  },
  // every weapon: its deck sprite + its munition flying across the cell, drawn by the REAL renderProjectiles
  renderRefGrid(ctx, R) {
    this.drawBackdrop(ctx, R);
    const ks = this.weaponList(), cols = 6, rows = Math.ceil(ks.length / cols), gap = 8;
    const cw = (R.w - 24 - gap * (cols - 1)) / cols, ch = (R.h - 24 - gap * (rows - 1)) / rows;
    const fake = this._refB || (this._refB = Object.create(Battle.prototype));
    fake.time = this.clock; fake.ripples = []; fake.beams = []; fake.activeFamiliars = () => []; fake.p = { rooms: [] }; fake.e = { rooms: [] };
    ks.forEach((k, i) => {
      const wd = DATA.WEAPONS[k], r = { x: R.x + 12 + (i % cols) * (cw + gap), y: R.y + 12 + Math.floor(i / cols) * (ch + gap), w: cw, h: ch };
      const on = k === this.wkey;
      KIT.card(ctx, r, { tint: on ? 'rgba(95,240,208,0.18)' : null, edge: on ? '#2f8a72' : null, studs: false });
      KIT.reg('yard.ref.' + k, r, { onClick: () => this.pickWeapon(k) });
      ShipMenu.drawWeaponArt(ctx, k, { x: r.x + 8, y: r.y + 8, w: 64, h: 34 });
      KIT.text(ctx, wd.name, { x: r.x + 78, y: r.y + 6, w: r.w - 84, h: 22 }, { size: 15, display: true, color: COL.inkdk, fit: 'shrink', minSize: 10 });
      KIT.text(ctx, this.famOf(wd), { x: r.x + 78, y: r.y + 26, w: r.w - 84, h: 18 }, { size: 13, italic: true, color: COL.inkmd, fit: 'shrink' });
      const lane = { x: r.x + 8, y: r.y + 48, w: r.w - 16, h: r.h - 56 };
      ctx.save(); ctx.beginPath(); ctx.rect(lane.x, lane.y, lane.w, lane.h); ctx.clip();
      ctx.fillStyle = 'rgba(31,95,150,0.18)'; ctx.fillRect(lane.x, lane.y, lane.w, lane.h);
      const sc = 4, lw = lane.w / sc, t = ((this.clock * 0.8 + i * 0.137) % 1.25) / 1.0;
      if (wd.type === 'beam') {
        const tt = Math.min(1, t), x2 = lane.x + 6 + (lane.w - 12) * tt, yy = lane.y + lane.h / 2;
        ctx.strokeStyle = wd.tint || '#ffe9a0'; ctx.globalAlpha = 0.35; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(lane.x + 6, yy); ctx.lineTo(x2, yy); ctx.stroke();
        ctx.globalAlpha = 1; ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff8e6'; ctx.beginPath(); ctx.moveTo(lane.x + 6, yy); ctx.lineTo(x2, yy); ctx.stroke(); ctx.lineWidth = 1;
      } else if (t <= 1) {
        const baseY = wd.type === 'missile' ? SEA_Y - 4 : SEA_Y - 10; // torpedoes skim the sea line
        ctx.translate(lane.x, lane.y + lane.h / 2); ctx.scale(sc, sc); ctx.translate(0, -baseY);
        ctx.imageSmoothingEnabled = false;
        fake.projectiles = [{ wkey: k, fromX: 4, fromY: baseY, toX: lw - 4, toY: baseY, t, dur: 1, delay: 0, arc: wd.type === 'bomb' ? 4 : 3 }];
        try { fake.renderProjectiles(ctx); } catch (e) {}
      }
      ctx.restore();
    });
  },

  // ---------- SHIPS ----------
  renderShips(ctx) {
    const S = this.SIDE, c = KIT.panel(ctx, S, { title: 'Hulls', wood: true }), H = this.hulls(), races = Object.keys(DATA.RACES);
    let y = c.y;
    KIT.button(ctx, 'yard.hull', { x: c.x, y, w: c.w, h: 56 }, H[this.hull].label, { variant: 'wood', size: 18, sub: (this.hull + 1) + ' of ' + H.length + ' · click next, right-click back',
      onClick: () => { this.hull = (this.hull + 1) % H.length; this.buildForTab(); }, onRight: () => { this.hull = (this.hull - 1 + H.length) % H.length; this.buildForTab(); } });
    y += 66;
    y = this.heading(ctx, 'Crew', c.x, y, c.w);
    KIT.button(ctx, 'yard.crewrace', { x: c.x, y, w: c.w - 116, h: 42 }, this.raceName(races[this.crewRace % races.length]), { variant: 'recess', size: 18, onClick: () => { this.crewRace = (this.crewRace + 1) % races.length; this.buildForTab(); }, tip: [{ t: 'Crew race', c: TIP.ink }, { t: 'Click to cycle.', c: TIP.body }] });
    KIT.button(ctx, 'yard.crew-', { x: c.x + c.w - 108, y, w: 50, h: 42 }, '−', { variant: 'recess', size: 22, disabled: this.crewN <= 1, reason: 'At least one sailor.', onClick: () => { this.crewN--; this.buildForTab(); } });
    KIT.button(ctx, 'yard.crew+', { x: c.x + c.w - 50, y, w: 50, h: 42 }, '+', { variant: 'recess', size: 22, disabled: this.crewN >= 8, reason: 'Eight berths at most.', onClick: () => { this.crewN++; this.buildForTab(); } });
    y += 52;
    KIT.text(ctx, this.crewN + ' aboard', { x: c.x, y, w: c.w, h: 22 }, { size: 16, italic: true, color: '#e8d6ae' }); y += 30;
    y = this.heading(ctx, 'Click tool', c.x, y, c.w);
    y = this.choices(ctx, 'yard.tool', c.x, y, c.w, this.TOOLS, this.tool, i => { this.tool = i; }, { cols: 2, h: 40, size: 16,
      disabled: i => this.enemySide && i === 0, reason: () => 'Crew take orders on your own ship only. Switch Side back to command them.' }) + 14;
    const sh = this.shown();
    KIT.button(ctx, 'yard.doorsopen', { x: c.x, y, w: (c.w - 8) / 2, h: 40 }, 'Open all doors', { variant: 'recess', size: 16, onClick: () => sh.setAllDoors(true) });
    KIT.button(ctx, 'yard.doorsshut', { x: c.x + (c.w + 8) / 2, y, w: (c.w - 8) / 2, h: 40 }, 'Shut all doors', { variant: 'recess', size: 16, onClick: () => sh.setAllDoors(false) });
    y += 48;
    KIT.button(ctx, 'yard.shipreset', { x: c.x, y, w: c.w, h: 40 }, 'Reset ship', { variant: 'recess', size: 16, onClick: () => this.buildForTab() });
    y += 52;
    const tips = { 'Command crew': 'Click a sailor, then a room: they walk there through the doors. Click a door to open or shut it; right-click a hull room to open its sea door.', 'Set fire': 'Click a tile to light it.', Flood: 'Click a room to fill or drain it.', Breach: 'Click a room to hole it (click again to patch).', 'Damage system': 'Click a system room to damage it one level (it cycles back to repaired).', 'Kill sailor': 'Click a room to kill one sailor standing in it.' };
    KIT.text(ctx, tips[this.TOOLS[this.tool]], { x: c.x, y, w: c.w, h: S.y + S.h - 16 - y }, { size: 16, italic: true, color: '#e8d6ae', fit: 'wrap', lineGap: 4, valign: 'top' });
    const G = this.STAGE, R = { x: G.x, y: G.y, w: G.w, h: G.h };
    // the hovered room drives the feedback tag
    this._hoverRoom = null;
    this.renderScene(ctx, R, this.enemySide ? 'e' : 'p');
    if (KIT.inR(Game.mouse.x, Game.mouse.y, R) && this._view) { const p = this.toScene(Game.mouse.x, Game.mouse.y); this._hoverRoom = this.b.roomAt(sh, p.x, p.y); }
    KIT.text(ctx, sh.name + ' · ' + DATA.LAYOUTS[sh.layoutKey].name + ' · ' + sh.rooms.length + ' rooms · ' + sh.doors.length + ' doors' + (this.gameSize ? ' · game size' : ''), { x: R.x + 16, y: R.y + 12, w: R.w - 32, h: 26 }, { size: 18, color: '#fff6e0', shadow: 'rgba(10,6,2,0.9)', shadowDx: 1, shadowDy: 1, fit: 'shrink' });
  },

  // ---------- FAMILIARS + EFFECTS ----------
  renderEffects(ctx) {
    const S = this.SIDE, c = KIT.panel(ctx, S, { title: 'Effects', wood: true });
    let y = this.heading(ctx, 'Hits the ' + (this.enemySide ? 'Dawnchaser' : 'enemy') + ' · click a room to aim', c.x, c.y, c.w);
    y = this.choices(ctx, 'yard.fx', c.x, y, c.w, this.EFFECTS.map(e => e.label), -1, i => this.doEffect(this.EFFECTS[i].id), { cols: 2, h: 44, size: 17,
      tips: this.EFFECTS.map(e => [{ t: e.label, c: TIP.ink }, { t: e.tip, c: TIP.body }]),
      disabled: i => this.enemySide && !!this.EFFECTS[i].playerOnly, reason: () => 'Your crew cast this one: switch Side back to the enemy.' }) + 16;
    KIT.text(ctx, 'Click Bind to put up to three familiars into the battle below. Deploy and Act replay each animation on both the card and the familiar in battle.', { x: c.x, y, w: c.w, h: S.y + S.h - 16 - y }, { size: 16, italic: true, color: '#e8d6ae', fit: 'wrap', lineGap: 4, valign: 'top' });
    // gallery: all 8 familiars, each a card with its figure + Deploy / Act / Bind
    const G = this.STAGE, gal = { x: G.x, y: G.y, w: G.w, h: 330 }, ks = Object.keys(DATA.FAMILIARS), cols = 4, gap = 12;
    const cw = (gal.w - gap * (cols - 1)) / cols, ch = (gal.h - gap) / 2;
    ks.forEach((k, i) => {
      const r = { x: gal.x + (i % cols) * (cw + gap), y: gal.y + Math.floor(i / cols) * (ch + gap), w: cw, h: ch }, fam = DATA.FAMILIARS[k];
      const art = { x: r.x, y: r.y, w: 140, h: r.h };
      this.drawBackdrop(ctx, art);
      const A = this.famAnim[k] || {}, dep = A.dep != null ? U.clamp((this.clock - A.dep) / 0.5, 0, 1) : 1, act = A.act != null ? Math.max(0, 1 - (this.clock - A.act) / 0.45) : 0;
      ctx.save(); ctx.beginPath(); ctx.rect(art.x, art.y, art.w, art.h); ctx.clip();
      ctx.translate(art.x + art.w / 2, art.y + art.h / 2); if (this.flip) ctx.scale(-1, 1);
      SPR.drawFamiliar(ctx, k, 0, 0, this.gameSize ? 1.6 * this.gameScale() : 7, this.clock, act, dep);
      ctx.restore();
      const body = { x: r.x + 146, y: r.y, w: r.w - 146, h: r.h };
      KIT.card(ctx, body, { studs: false, tint: this.bound.includes(k) ? 'rgba(95,240,208,0.16)' : null });
      KIT.text(ctx, fam.name, { x: body.x + 12, y: body.y + 8, w: body.w - 24, h: 26 }, { size: 19, display: true, color: COL.inkdk, fit: 'shrink' });
      KIT.text(ctx, (fam.role === 'attack' || fam.role === 'boarder') ? 'orbits the enemy' : 'guards your hull', { x: body.x + 12, y: body.y + 34, w: body.w - 24, h: 20 }, { size: 14, italic: true, color: COL.inkmd });
      const bw = (body.w - 24 - 8) / 2, by = body.y + body.h - 46;
      KIT.button(ctx, 'yard.fam.bind.' + k, { x: body.x + 12, y: by - 44, w: body.w - 24, h: 36 }, this.bound.includes(k) ? 'Bound in the battle' : 'Bind into the battle', { variant: 'recess', size: 15, live: this.bound.includes(k), onClick: () => this.toggleBound(k),
        tip: [{ t: 'Bind', c: TIP.ink }, { t: 'Up to three familiars share the Binding Shrine; binding a fourth releases the oldest.', c: TIP.body }] });
      KIT.button(ctx, 'yard.fam.dep.' + k, { x: body.x + 12, y: by, w: bw, h: 36 }, 'Deploy', { variant: 'recess', size: 15, onClick: () => this.famDeploy(k) });
      KIT.button(ctx, 'yard.fam.act.' + k, { x: body.x + 20 + bw, y: by, w: bw, h: 36 }, 'Act', { variant: 'recess', size: 15, onClick: () => this.famAct(k) });
    });
    this.renderScene(ctx, { x: G.x, y: G.y + gal.h + 14, w: G.w, h: G.h - gal.h - 14 });
  },

  // ---------- shared controls ----------
  renderControls(ctx) {
    const t = this.TABS[this.tab], scene = t !== 'Crew' && !(t === 'Weapons' && this.refGrid);
    // the feedback tag on an engraved plate, with Copy
    const plate = { x: 32, y: 888, w: 1856 - 200, h: 46 };
    KIT.card(ctx, plate, { studs: false });
    KIT.text(ctx, this.toast ? this.toast.s : 'Tag:  ' + this.tag(), { x: plate.x + 16, y: plate.y, w: plate.w - 32, h: plate.h }, { size: 19, color: this.toast ? '#2f8a72' : COL.inkdk, fit: 'ellipsis', italic: !this.toast });
    KIT.button(ctx, 'yard.copy', { x: plate.x + plate.w + 16, y: plate.y, w: 184, h: plate.h }, 'Copy tag', { size: 20, onClick: () => this.copyTag(), tip: [{ t: 'Copy the feedback tag', c: TIP.ink }, { t: 'Paste it into your notes so each comment points at the exact sprite and frame.', c: TIP.body }] });
    const y = 950, h = 72;
    let x = 32;
    const B = (id, w, label, o) => { const r = { x, y, w, h }; KIT.button(ctx, id, r, label, Object.assign({ size: 22 }, o)); x += w + (o && o.gapAfter != null ? o.gapAfter : 10); };
    B('yard.back', 150, '‹  Back', { sound: 'back', onClick: () => this.leave(), tip: [{ t: 'Back to the title', c: TIP.ink }, { t: 'Escape also leaves.', c: TIP.body }], gapAfter: 26 });
    this.SPEED_LBL.forEach((s, i) => B('yard.speed.' + i, 66, s, { variant: 'recess', live: this.speed === i, onClick: () => { this.speed = i; }, gapAfter: i === 3 ? 18 : 6, tip: [{ t: 'Speed ' + s, c: TIP.ink }] }));
    B('yard.pause', 130, this.paused ? 'Play' : 'Pause', { variant: 'wood', onClick: () => { this.paused = !this.paused; }, tip: [{ t: this.paused ? 'Play' : 'Pause', c: TIP.ink }, { t: 'Space also toggles.', c: TIP.body }] });
    B('yard.step', 130, 'Step', { variant: 'wood', onClick: () => this.stepOnce(), gapAfter: 26, tip: [{ t: 'One frame forward', c: TIP.ink }, { t: t === 'Crew' ? 'Jumps to the next animation frame and pauses. Right arrow also steps.' : 'Advances 1/30 of a second and pauses. Right arrow also steps.', c: TIP.body }] });
    const zl = t === 'Crew' ? this.CREW_ZOOMS : this.SCENE_ZOOMS, zi = t === 'Crew' ? this.crewZoom : this.sceneZoom;
    const setZ = v => { if (t === 'Crew') this.crewZoom = v; else this.sceneZoom = v; this.gameSize = false; };
    const noZoom = t === 'Weapons' && this.refGrid;
    B('yard.zoom-', 58, '−', { variant: 'recess', size: 26, disabled: noZoom || (!this.gameSize && zi <= 0), reason: noZoom ? 'The reference grid has a fixed size.' : 'Already at the smallest zoom.', onClick: () => setZ(Math.max(0, zi - 1)), gapAfter: 6 });
    B('yard.zoom+', 58, '+', { variant: 'recess', size: 26, disabled: noZoom || (!this.gameSize && zi >= zl.length - 1), reason: noZoom ? 'The reference grid has a fixed size.' : 'Already at the largest zoom.', onClick: () => setZ(Math.min(zl.length - 1, zi + 1)), gapAfter: 6 });
    B('yard.gamesize', 160, 'Game size', { variant: 'recess', live: this.gameSize, disabled: noZoom, reason: 'The reference grid has a fixed size.', onClick: () => { this.gameSize = !this.gameSize; }, gapAfter: 26,
      tip: [{ t: 'Game size', c: TIP.ink }, { t: 'Show it at exactly the size it appears in battle at 1920×1080.', c: TIP.body }] });
    B('yard.flip', 110, 'Flip', { variant: 'recess', live: this.flip, disabled: scene, reason: 'Ships mirror with Side: the enemy hull is the flipped one.', onClick: () => { this.flip = !this.flip; } });
    B('yard.backdrop', 196, 'Backdrop: ' + this.BACKDROPS[this.backdrop], { variant: 'recess', size: 18, disabled: t === 'Ships' || (t === 'Weapons' && !this.refGrid), reason: 'Battle scenes always use the sea.', onClick: () => { this.backdrop = (this.backdrop + 1) % this.BACKDROPS.length; } });
    const sideLbl = t === 'Weapons' ? (this.enemySide ? 'Enemy fires' : 'You fire') : t === 'Ships' ? (this.enemySide ? 'As enemy' : 'As your ship') : t === 'Crew' ? 'Side' : (this.enemySide ? 'Hits your ship' : 'Hits the enemy');
    B('yard.side', 1888 - x, sideLbl, { variant: 'wood', size: 20, disabled: t === 'Crew', reason: 'Use Flip to mirror a sailor.', onClick: () => { this.enemySide = !this.enemySide; if (t === 'Ships') this.buildForTab(); else this.targetRoom = 0; },
      tip: [{ t: 'Switch sides', c: TIP.ink }, { t: 'Checks the mirrored (enemy) art: the enemy ship fires, or the hull is shown flipped as an enemy.', c: TIP.body }] });
  },
};
