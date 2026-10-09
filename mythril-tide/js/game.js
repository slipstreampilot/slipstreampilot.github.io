// MYTHRIL TIDE - game.js : state machine, title, intro, save/load, main loop
'use strict';

const SAVE_KEY = 'mythril_tide_save_v1';
const OPTS_KEY = 'mythril_tide_opts_v1';
const SAVE_VERSION = 1; // bump only on a breaking save-shape change; additive fields are merged

const Game = {
  canvas: null, ctx: null, scale: 2,
  // current screen's LOGICAL/design resolution. Default 512x288 (the classic grid); a screen
  // may declare designW/designH to author at a finer grid (e.g. combat at 1920x1080 for the
  // HD-2D rebuild). The backing store is fixed; render() scales the logical grid onto it.
  VW: 512, VH: 288,
  saveWarning: null, // surfaced banner when a save/load fails (storage full, blocked, corrupt)
  mouse: { x: 0, y: 0 },
  // info tooltips appear after the cursor settles briefly (affordance/cursor stay instant);
  // _lastMoveAt defaults 0 so headless snaps (no mousemove events) always show tips.
  _lastMoveAt: 0, _lastMx: 0, _lastMy: 0, TIP_DELAY: 120,
  tipReady() { return (performance.now() - this._lastMoveAt) >= this.TIP_DELAY; },
  // single source of hull-bar semantics (G9): green healthy -> orange hurt -> red critical.
  // Used by every hull bar (HD combat, classic HUD, deck Damage Control) so they never disagree.
  hullBarColor(frac) { return frac > 0.5 ? COL.green : frac > 0.25 ? COL.orange : COL.red; },
  keys: {},
  time: 0,
  screen: null, screenName: '',
  screens: {},
  ship: null,
  run: null,
  battle: null,

  boot() {
    this.canvas = document.getElementById('game');
    this.canvas.width = 2048; this.canvas.height = 1152; // 16:9 backing store (~1080p). Classic
    // 512x288 screens render at 4x here; a 1920x1080 screen renders at ~1.07x. Bump to 3840x2160
    // later if combat wants 2x supersampling at 1920x1080.
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    SPR.initAtlas();
    SPR.initArt();
    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.screens = {
      title: TitleScreen, intro: IntroScreen, help: HelpScreen,
      map: MapScreen, decks: DeckScreen, event: EventScreen, loot: LootScreen,
      shop: ShopScreen,
      combat: CombatScreen, gameover: GameOverScreen, victory: VictoryScreen,
      weaponchoice: WeaponChoiceScreen, augchoice: AugChoiceScreen,
      shipmenu: ShipMenu,
      lore: LoreScreen,
      jukebox: JukeboxScreen,
      shipyard: ShipyardScreen,
    };

    const opts = this.loadJSON(OPTS_KEY) || {};
    AUDIO.muted = !!opts.muted;
    this.displayFit = true; // FIT WINDOW only (pixel-perfect retired 2026-10-08; see resize())

    this.canvas.addEventListener('mousedown', e => {
      AUDIO.init();
      const p = this.toGame(e);
      // kit controls (registered from the drawn rects) get first refusal; activation happens on mouse-UP
      if (KIT.down(p.x, p.y, e.button)) { e.preventDefault(); return; }
      if (this.screen && this.screen.click) this.screen.click(p.x, p.y, e.button);
      e.preventDefault();
    });
    this.canvas.addEventListener('mouseup', e => {
      const p = this.toGame(e);
      if (KIT.up(p.x, p.y, e.button)) return;
      if (this.screen && this.screen.mouseup) this.screen.mouseup(p.x, p.y, e.button);
    });
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    this.canvas.addEventListener('mousemove', e => {
      const p = this.toGame(e);
      this.mouse.x = p.x; this.mouse.y = p.y;
      if (Math.abs(p.x - this._lastMx) > 4 || Math.abs(p.y - this._lastMy) > 4) { this._lastMoveAt = performance.now(); this._lastMx = p.x; this._lastMy = p.y; }
    });
    window.addEventListener('keydown', e => {
      this.keys[e.key] = true;
      AUDIO.init();
      if (e.key === 'm' || e.key === 'M') { this.toggleMute(); return; }
      if (this.screen && this.screen.key) this.screen.key(e.key);
      if ([' ', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
    });
    window.addEventListener('keyup', e => { this.keys[e.key] = false; });

    this.setScreen('title');
    let last = performance.now();
    const loop = now => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.time += dt;
      // a thrown frame must NOT kill the rAF chain (that's a hard freeze needing a browser refresh).
      // Log the first error of an episode, keep looping — the next frame (e.g. cursor moved) may recover.
      try {
        if (this.screen && this.screen.update) this.screen.update(dt);
        this.render();
        this._frameErr = false;
      } catch (e) {
        if (!this._frameErr) { this._frameErr = true; console.error('frame error on ' + this.screenName + ':', e); }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  resize() {
    // FIT WINDOW (the only mode since 2026-10-08): the canvas fills the window at 16:9. The BACKING
    // STORE follows the real pixel count (CSS size x devicePixelRatio, capped at 4K) so text, lines
    // and painted art rasterize sharp at 1080p, 1440p and 4K instead of being resampled from a fixed
    // 2048x1152 buffer. (The old "pixel-perfect" mode nearest-neighbour DOWNSCALED that buffer and
    // garbled serif text; it is gone.) Headless harnesses (no devicePixelRatio) keep 2048x1152.
    const raw = Math.min(window.innerWidth / 512, window.innerHeight / 288);
    const s = Math.max(0.5, raw);
    this.scale = s;
    const cssW = Math.round(512 * s), cssH = Math.round(288 * s);
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
    this.canvas.style.imageRendering = 'auto';
    if (typeof window.devicePixelRatio === 'number') {
      const bw = Math.max(1024, Math.min(3840, Math.round(cssW * window.devicePixelRatio)));
      const bh = Math.round(bw * 9 / 16);
      if (this.canvas.width !== bw || this.canvas.height !== bh) { this.canvas.width = bw; this.canvas.height = bh; }
    }
  },
  saveOpts() { this.saveJSON(OPTS_KEY, { muted: AUDIO.muted }); },
  toGame(e) {
    // map a client pixel to the current screen's logical grid (works at any design resolution)
    const r = this.canvas.getBoundingClientRect();
    return {
      x: Math.floor((e.clientX - r.left) * this.VW / r.width),   // multiply first: exact at integer ratios
      y: Math.floor((e.clientY - r.top) * this.VH / r.height),
    };
  },
  toggleMute() {
    AUDIO.setMuted(!AUDIO.muted);
    this.saveOpts();
  },

  render() {
    const ctx = this.ctx;
    this.hot = false; // set true by interactive hover hit-tests this frame -> pointer cursor
    // map this screen's logical grid (VW x VH) onto the backing store. For the classic
    // 512x288 grid on the 2048x1152 backing this is exactly 4x (unchanged); a 1920x1080
    // screen maps at ~1.07x. Aspect is always 16:9, so the scale stays uniform.
    const sx = this.canvas.width / this.VW, sy = this.canvas.height / this.VH;
    ctx.setTransform(sx, 0, 0, sy, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = COL.black;
    ctx.fillRect(0, 0, this.VW, this.VH);
    KIT.beginFrame();
    if (this.screen && this.screen.render) this.screen.render(ctx);
    // mute indicator
    const k = this.VW / 512; // chrome scale: classic 512 grid = 1, HD 1920 grid = 3.75
    if (AUDIO.muted) TYPE.draw(ctx, 'Muted [M]', 4 * k, this.VH - 10 * k, 11 * Math.min(k, 1.8), COL.dkgrey, { italic: true });
    // save/load warning banner (rare; clears on the next successful save).
    // Hidden during combat - saves only happen between nodes, and the top strip
    // there holds the enemy nameplate.
    if (this.saveWarning && this.screenName !== 'combat') {
      const fs = 10 * Math.min(k, 2.4), bh = 12 * Math.min(k, 2.4), w = TYPE.width(ctx, this.saveWarning, fs) + 16 * k;
      ctx.fillStyle = 'rgba(120,20,20,0.92)'; ctx.fillRect(this.VW / 2 - w / 2, 0, w, bh);
      ctx.strokeStyle = COL.red; ctx.strokeRect(this.VW / 2 - w / 2 + 0.5, 0.5, w - 1, bh - 1);
      TYPE.drawCentered(ctx, this.saveWarning, this.VW / 2, bh * 0.08, fs, COL.white);
    }
    KIT.endFrame(ctx); // cross-fade from the previous screen (browser only)
    // pointer cursor over interactive elements (affordance), applied once per frame
    if (this.canvas && this.canvas.style) {
      const cur = this.hot ? 'pointer' : 'default';
      if (this._cursor !== cur) { this.canvas.style.cursor = cur; this._cursor = cur; }
    }
  },

  setScreen(name, args) {
    if (this.screen && name !== this.screenName) KIT.beginTransition(this.canvas); // snapshot -> cross-fade
    KIT._down = null; // a press never survives a screen change
    this.screenName = name;
    this.screen = this.screens[name];
    // adopt the screen's design resolution (defaults to the classic 512x288 grid).
    // designW/designH may be a value OR a function (e.g. combat picks 1920x1080 when HD is on).
    const dw = this.screen && (typeof this.screen.designW === 'function' ? this.screen.designW() : this.screen.designW);
    const dh = this.screen && (typeof this.screen.designH === 'function' ? this.screen.designH() : this.screen.designH);
    this.VW = dw || 512;
    this.VH = dh || 288;
    if (this.screen.enter) this.screen.enter(args || {});
  },

  // ---------- run lifecycle ----------
  newGame(difficulty, cheats) {
    cheats = cheats || {};
    this.battle = null; // defensive: no battle state survives into a fresh voyage (R3)
    this.run = {
      region: 0, nodeId: 0, front: -1.2, day: 1,
      shards: cheats.shards ? 15000 : 16, runeshot: 3,
      candles: cheats.shards ? 99 : 6, // Summoner's Candles: FTL drone-parts analog (deploy/re-bind orbiting familiars)
      augs: [], cargo: [], familiars: [],
      log: [],
      stats: { jumps: 0, kills: 0, shards: 0, crewLost: 0 },
      seenEvents: [],
      bossStage: 0,
      difficulty: difficulty || 'captain',
      manaBought: 0,
      pendingWeapon: null,
      pendingAug: null,
      cheats: { uranium: !!cheats.uranium, shards: !!cheats.shards, teleport: !!cheats.teleport, maxship: !!cheats.maxship, systems: Array.isArray(cheats.systems) ? cheats.systems.slice() : [] },
      map: null, shopStock: null, shopNode: -1,
    };
    this.run.map = MapGen.genRegion(0);
    this.ship = buildPlayerShip();
    if (cheats.uranium) {
      this.ship.weapons.push({ key: 'depleteduranium', charge: 0, on: false, target: -1 });
    }
    if (Array.isArray(cheats.systems) && cheats.systems.length) {
      // playtest cheat: install the CHOSEN optional (advanced) systems at the start (the two New
      // Voyage mount-slot cyclers) instead of buying them at anchorages. Dedup + cap at OPEN_MOUNTS.
      // Runs BEFORE the maxship block so, if that's also ticked, they get powered with everything.
      const want = [...new Set(cheats.systems.filter(k => DATA.SYS_ADVANCED.includes(k)))].slice(0, DATA.OPEN_MOUNTS);
      for (const k of want) this.ship.sysLv[k] = Math.max(1, this.ship.sysLv[k] || 0);
      if (want.length) this.ship.assignMounts(); // seat them into the open mount rooms
    }
    if (cheats.maxship) {
      // playtest cheat: max the Mana Hearthstone + every installable system, top off the hull
      const sh = this.ship;
      sh.manaMax = DATA.CORE_MAX;
      // max the CORE + subsystems only; advanced systems stay uninstalled (mounts "Open")
      // since which advanced systems you take is a choice you buy at anchorages.
      for (const k of DATA.SYS_CORE.concat(DATA.SYS_SUB)) {
        if (DATA.SYSTEMS[k] && DATA.SYSTEMS[k].max) sh.sysLv[k] = DATA.SYSTEMS[k].max;
      }
      sh.assignMounts();
      sh.hull = sh.hullMax;
      // power up everything installed by default (advanced mounts are empty, so they draw nothing)
      sh.alloc = {};
      let pm = sh.effMana();
      for (const k of DATA.SYS_POWERED) { const g = Math.min(sh.sysLv[k] || 0, pm); if (g > 0) { sh.alloc[k] = g; pm -= g; } }
    }
    // open the Captain's Log with the homeland entry
    this.logEntry('We slipped the breakwater before dawn, the Armada\'s lanterns still astern. From here the chart is all we have.');
    this.logEntry(DATA.REGION_LOGS[0]);
    this.save();
  },

  // append a dated Captain's Log entry (presentation only; never affects gameplay)
  logEntry(text) {
    if (!text || !this.run) return;
    if (!this.run.log) this.run.log = [];
    const last = this.run.log[this.run.log.length - 1];
    if (last && last.text === text) return; // no immediate dupes
    this.run.log.push({ day: this.run.day || 1, text: String(text) });
    if (this.run.log.length > 60) this.run.log.splice(0, this.run.log.length - 60);
  },

  save() {
    if (this._sandbox) return; // the Shipyard test room runs on a throwaway run: never let it overwrite the real save
    if (!this.run || !this.ship) return;
    const ok = this.saveJSON(SAVE_KEY, { run: this.run, ship: this.ship.serialize(), v: SAVE_VERSION });
    // a failed write would otherwise lose progress silently (quota full / private mode)
    this.saveWarning = ok ? null : 'COULD NOT SAVE - BROWSER STORAGE IS FULL OR BLOCKED';
  },
  clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} },
  hasSave() { return !!this.loadJSON(SAVE_KEY); },
  // a fresh run skeleton with every field defaulted, so a save written by an older
  // build (missing newer fields) merges cleanly instead of leaving them undefined
  defaultRun() {
    return {
      region: 0, nodeId: 0, front: -1.2, day: 1,
      shards: 0, runeshot: 0, candles: 6,
      augs: [], cargo: [], familiars: [], log: [],
      stats: { jumps: 0, kills: 0, shards: 0, crewLost: 0 },
      seenEvents: [],
      bossStage: 0,
      difficulty: 'captain',
      manaBought: 0,
      pendingWeapon: null, pendingAug: null,
      cheats: { uranium: false, shards: false, teleport: false, maxship: false, systems: [] },
      map: null, shopStock: null, shopNode: -1,
    };
  },
  load() {
    const s = this.loadJSON(SAVE_KEY);
    if (!s) return false;
    if (s.v !== SAVE_VERSION) { // incompatible shape - don't risk loading a broken voyage
      this.saveWarning = 'SAVED VOYAGE IS FROM AN OLDER VERSION - PLEASE START A NEW VOYAGE';
      this.clearSave();
      return false;
    }
    try {
      const run = Object.assign(this.defaultRun(), s.run || {});
      run.stats = Object.assign(this.defaultRun().stats, (s.run && s.run.stats) || {});
      run.cheats = Object.assign(this.defaultRun().cheats, (s.run && s.run.cheats) || {});
      this.run = run;
      this.ship = Ship.restore(s.ship, 'player');
      this.battle = null; // defensive: a loaded voyage never resumes mid-battle (R3)
      this.saveWarning = null;
      return true;
    } catch (e) {
      this.saveWarning = 'SAVED VOYAGE COULD NOT BE LOADED - START A NEW VOYAGE';
      this.clearSave();
      return false;
    }
  },
  saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  loadJSON(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },

  // ---------- map flow ----------
  travelTo(node) {
    AUDIO.sfx('click');
    this.run.stats.jumps++;
    this.run.day = (this.run.day || 1) + U.ri(1, 2); // a day or two between islands
    this.run.front += this.run.difficulty === 'easy' ? 0.34 : 0.48;
    this.run.nodeId = node.id;
    this._wasVisited = node.visited;
    node.visited = true;
    // auto Captain's Log line for non-combat destinations (battles log their own outcome)
    if (!this._wasVisited) {
      const lines = {
        shop: 'Put in at a friendly anchorage to refit and trade.',
        event: 'Bore down on an island flying no colours we knew.',
        distress: 'Ran toward a distress flag on the horizon.',
        empty: 'Crossed quiet, empty water. The watch stayed nervous all the same.',
        exit: 'Cleared the last of these waters and set course onward.',
      };
      if (lines[node.type]) this.logEntry(lines[node.type]);
    }
    this.save();
    this.resolveNode(node);
  },

  rollHazard() {
    return U.wpick(DATA.REGIONS[this.run.region].hazards);
  },

  resolveNode(node) {
    const run = this.run;
    const overtaken = node.col >= 0 && node.col <= Math.floor(run.front) && node.type !== 'boss' && node.type !== 'exit';
    if (overtaken) {
      this.startBattle('armada', 1, { elite: true, intro: 'THE ARMADA VANGUARD HAS RUN YOU DOWN!', canFlee: true });
      return;
    }
    if (this._wasVisited && !['shop', 'boss', 'exit'].includes(node.type)) {
      this._wasVisited = false;
      this.setScreen('loot', {
        title: 'QUIET WATERS',
        lines: ['NOTHING NEW AT THIS ISLAND.', 'THE ARMADA, HOWEVER, KEEPS MOVING.'],
      });
      return;
    }
    this._wasVisited = false;
    switch (node.type) {
      case 'fight':
        this.startBattle(DATA.REGIONS[run.region].race, 0, { hazard: this.rollHazard() });
        break;
      case 'elite':
        this.startBattle(DATA.REGIONS[run.region].race, 2, { elite: true, hazard: this.rollHazard() });
        break;
      case 'event':
        this.setScreen('event', { ev: EVENTS.pick('event', run.region) });
        break;
      case 'distress':
        this.setScreen('event', { ev: EVENTS.pick('distress', run.region) });
        break;
      case 'empty':
        this.setScreen('event', { ev: EVENTS.pick('empty', run.region) });
        break;
      case 'shop':
        // node ids restart per region, so key the stock to region+node or a new
        // region's shop would inherit the previous one's wares (and sold flags)
        if (this.run.shopNode !== this.run.region * 100 + node.id) this.run.shopStock = null;
        this.setScreen('shop');
        break;
      case 'exit':
        this.nextRegion();
        break;
      case 'boss':
        this.startBossStage();
        break;
      default:
        this.setScreen('map');
    }
  },

  afterNode() {
    this.save();
    // a gun / augment is waiting with no room aboard: the captain decides before sailing on
    if (this.run.pendingWeapon) { this.setScreen('weaponchoice'); return; }
    if (this.run.pendingAug) { this.setScreen('augchoice'); return; }
    this.setScreen('map');
  },

  nextRegion() {
    const oldName = DATA.REGIONS[this.run.region].name;
    this.run.region++;
    this.run.front = -1.4;
    this.run.day = (this.run.day || 1) + U.ri(2, 3);
    this.run.map = MapGen.genRegion(this.run.region);
    this.run.nodeId = 0;
    const newReg = DATA.REGIONS[this.run.region];
    this.logEntry('Escaped ' + oldName + '. Made the crossing into ' + newReg.name + '.');
    this.logEntry(DATA.REGION_LOGS[this.run.region] || '');
    this.save();
    const log = DATA.REGION_LOGS[this.run.region] || '';
    const logLines = [log];
    this.setScreen('loot', {
      title: "SHIP'S LOG - " + newReg.name.toUpperCase(),
      lines: ['YOU ESCAPE ' + oldName.toUpperCase() + '.', ''].concat(logLines).concat([
        '',
        this.run.region === 7 ? 'THE CITY OF MYTHRIL IS CLOSE. SO IS ITS WARDEN.' : 'THE ARMADA REGROUPS BEHIND YOU.',
      ]),
    });
  },

  // ---------- battles ----------
  startBattle(race, tierOff, opts) {
    opts = opts || {};
    const tier = U.clamp(this.run.region + 1 + (tierOff || 0), 1, 9);
    const boarders = (race === 'lizard' || race === 'siren') && tier >= 4 && U.chance(0.4);
    const def = DATA.makeEnemy(race, tier, { boarders });
    this.battle = new Battle(def, {
      tier, elite: opts.elite, hazard: opts.hazard || 'none',
      canFlee: opts.canFlee !== false, intro: opts.intro,
    });
    // FTL crossfade: the sea's own theme stays playing and its BATTLE layer
    // fades up - unless the Imperial Armada is aboard, who bring their own march.
    AUDIO.setCombat(true, def.style === 'armada' ? 'armada' : 'sea');
    this.setScreen('combat');
  },

  startBossStage() {
    const stage = this.run.bossStage;
    const def = DATA.makeBoss(stage);
    this.battle = new Battle(def, {
      tier: 9, elite: true, hazard: stage === 2 ? 'storm' : 'none',
      canFlee: false,
      intro: ['THE WARDEN OF THE VEIL BLOCKS THE HARBOR!', 'THE WARDEN RETURNS, WREATHED IN STORM!', 'THE WARDEN\'S FINAL FURY!'][stage],
    });
    AUDIO.setCombat(true, 'boss'); // the Warden overrides with the funeral march
    this.setScreen('combat');
  },

  // FTL rules at sea: the ship can burn or flood to death and the crew can
  // perish BETWEEN battles too. Checked by map + decks screens every frame.
  checkDoom() {
    if (!this.run || !this.ship || this.battle) return;
    if (this.screenName === 'gameover' || this.screenName === 'victory') return;
    if (this.ship.hull <= 0) {
      this.clearSave();
      this.setScreen('gameover', { reason: 'THE DAWNCHASER BURNS TO THE WATERLINE.' });
      return;
    }
    if (this.ship.aliveCrew().length === 0) {
      this.clearSave();
      this.setScreen('gameover', { reason: 'A CREWLESS HULK DRIFTS ON THE TIDE.' });
    }
  },

  endBattle(battle) {
    const run = this.run;
    this.battle = null; // back to open sea - the map/decks sim takes over
    this.ship.settle();
    AUDIO.setCombat(false); // crossfade back from battle to the sea's explore theme
    const lines = [];
    let title = 'AFTERMATH';

    if (battle.state === 'lost') {
      this.clearSave();
      this.setScreen('gameover', { reason: battle.banner });
      return;
    }

    if (battle.edef.boss) {
      if (run.bossStage < 2) {
        run.bossStage++;
        this.ship.hull = Math.min(this.ship.hullMax, this.ship.hull + 8);
        for (const c of this.ship.aliveCrew()) c.hp = c.maxhp;
        run.shards += 20; run.runeshot += 2;
        this.save();
        this.setScreen('loot', {
          title: 'THE WARDEN WITHDRAWS',
          lines: [
            'THE DREADNOUGHT SLIPS INTO THE VEIL TO MEND.',
            'YOU SALVAGE MYTHRIL TIMBERS FROM THE FIGHT:',
            '+8 HULL, +20 SHARDS, +2 RUNESHOT, CREW RESTED.',
            '',
            'IT WILL COME BACK ANGRIER.',
            'CLICK THE CITY WHEN YOU ARE READY.',
          ],
        });
        // re-arm the boss node
        const bossNode = run.map.nodes.find(n => n.type === 'boss');
        if (bossNode) bossNode.visited = false;
        return;
      }
      // final victory
      this.clearSave();
      this.setScreen('victory', {});
      return;
    }

    if (battle.state === 'fled') {
      lines.push('YOU ESCAPE WITH HULL AND PRIDE MOSTLY INTACT.');
      title = 'AWAY CLEAN';
    } else if (battle.state === 'enemyFled') {
      const s = Math.floor(DATA.REWARD(battle.tier, battle.elite) / 2);
      run.shards += s; run.stats.shards += s;
      lines.push('THE ENEMY ESCAPES, JETTISONING CARGO:');
      lines.push('+' + s + ' SHARDS');
      title = 'THEY GOT AWAY';
    } else if (battle.state === 'surrendered') {
      const o = battle.surrenderOffer || { shards: 20, rune: 1 };
      run.shards += o.shards; run.runeshot += o.rune;
      run.stats.shards += o.shards;
      lines.push('TRIBUTE ACCEPTED:');
      lines.push('+' + o.shards + ' SHARDS, +' + o.rune + ' RUNESHOT');
      title = 'COLORS STRUCK';
    } else {
      // won or captured
      const captured = battle.state === 'captured';
      let s = DATA.REWARD(battle.tier, battle.elite);
      if (captured) s = Math.round(s * 1.6);
      if (run.difficulty === 'easy') s = Math.round(s * 1.25);
      run.shards += s; run.stats.shards += s; run.stats.kills++;
      title = captured ? 'PRIZE TAKEN' : 'VICTORY';
      lines.push(captured ? 'YOU STRIP THE PRIZE TO THE WATERLINE:' : 'YOU PICK THE WRECKAGE CLEAN:');
      lines.push('+' + s + ' SHARDS');
      const race = battle.edef.style;
      const rolls = captured ? 2 : 1;
      for (let i = 0; i < rolls; i++) {
        const roll = Math.random();
        if (roll < 0.15) {
          const pool = DATA.RACE_WEAPONS[race] || DATA.RACE_WEAPONS.human;
          lines.push(UI.gainWeapon(U.pick(pool)));
        } else if (roll < 0.24) {
          const notes = UI.applyFx({ aug: 'random' });
          lines.push(...notes);
        } else if (roll < 0.32 && this.ship.aliveCrew().length < 8) {
          const cr = DATA.RACE_CREW[race] || 'human';
          const notes = UI.applyFx({ crew: cr });
          lines.push('A SURVIVOR DEFECTS: ' + (notes[0] || ''));
        } else if (roll < 0.72) { // runeshot keeps the ordnance economy breathing
          const n = U.ri(1, 2);
          run.runeshot += n;
          lines.push('+' + n + ' RUNESHOT');
        }
      }
    }
    // track lost crew
    run.stats.crewLost = Math.max(run.stats.crewLost, 0);
    // lingering hazards follow you out of the fight
    const nFire = this.ship.rooms.filter(r => r.fire > 0).length;
    const nLeak = this.ship.rooms.filter(r => r.leak).length;
    if (nFire || nLeak) {
      lines.push('');
      if (nFire) lines.push('FIRES STILL BURN BELOW DECKS!');
      if (nLeak) lines.push('THE HULL IS STILL TAKING WATER!');
      lines.push('SEE TO IT FROM THE DECKS SCREEN - OR LOSE SHIP AND SOULS.');
    }
    this.save();
    AUDIO.playMap();
    this.setScreen('loot', { title, lines });
  },
};

// ============ FLAT SYSTEM SILHOUETTES ============
// Bold single-colour vector glyphs that stay instantly readable at any size (the painterly
// icon_sys_* art is too detailed to parse small). Designed on a 0..100 box, scaled to fit.
// brass vector glyphs for the big command buttons (pause bars / play triangle / ship's wheel)
function hdActionIcon(ctx, key, cx, cy, s, col) {
  ctx.save(); ctx.translate(cx, cy); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (key === 'pause') {
    const bw = s * 0.24, bh = s * 0.82, gap = s * 0.20;
    ctx.fillRect(-gap / 2 - bw, -bh / 2, bw, bh);
    ctx.fillRect(gap / 2, -bh / 2, bw, bh);
  } else if (key === 'play') {
    ctx.beginPath(); ctx.moveTo(-s * 0.26, -s * 0.44); ctx.lineTo(s * 0.44, 0); ctx.lineTo(-s * 0.26, s * 0.44); ctx.closePath(); ctx.fill();
  } else if (key === 'flag') { // a pennant on a pole = "set / mark the posts"
    ctx.lineWidth = s * 0.1;
    const px = -s * 0.26;
    ctx.beginPath(); ctx.moveTo(px, -s * 0.5); ctx.lineTo(px, s * 0.5); ctx.stroke();                                  // pole
    ctx.beginPath(); ctx.moveTo(px, -s * 0.5); ctx.lineTo(px + s * 0.58, -s * 0.33); ctx.lineTo(px, -s * 0.16); ctx.closePath(); ctx.fill(); // pennant
    ctx.beginPath(); ctx.arc(px, s * 0.5, s * 0.09, 0, Math.PI * 2); ctx.fill();                                       // base knob
  } else { // 'wheel' / 'stations' — a ship's wheel
    const R = s * 0.5;
    ctx.lineWidth = s * 0.1;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.74, 0, Math.PI * 2); ctx.stroke();                   // rim
    for (let i = 0; i < 6; i++) { const an = i * Math.PI / 3, hx = Math.cos(an) * R, hy = Math.sin(an) * R;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(hx, hy); ctx.stroke();                     // spoke
      ctx.beginPath(); ctx.arc(hx, hy, s * 0.09, 0, Math.PI * 2); ctx.fill(); }                // handle knob
    ctx.beginPath(); ctx.arc(0, 0, s * 0.15, 0, Math.PI * 2); ctx.fill();                      // hub
  }
  ctx.restore();
}
function drawSysSym(ctx, key, x, y, s, col) {
  // painted AI icon if one exists for this system; vector silhouette (below) otherwise.
  const img = SPR.sysIcon(key);
  if (img) {
    const c = ('' + (col || '')).toLowerCase();
    const offline = c === '#ff2e2e' || c === ('' + (COL.red || '')).toLowerCase();
    ctx.save();
    if (offline) ctx.globalAlpha = 0.42;
    ctx.drawImage(img, x, y, s, s);
    ctx.restore();
    if (offline) { // a dead system: dim the icon + slash it red so the down-state still reads
      ctx.save();
      ctx.strokeStyle = '#ff2e2e'; ctx.lineWidth = Math.max(1.5, s / 12); ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + s * 0.22, y + s * 0.22); ctx.lineTo(x + s * 0.78, y + s * 0.78);
      ctx.moveTo(x + s * 0.78, y + s * 0.22); ctx.lineTo(x + s * 0.22, y + s * 0.78);
      ctx.stroke();
      ctx.restore();
    }
    return;
  }
  ctx.save();
  ctx.translate(x, y); ctx.scale(s / 100, s / 100);
  ctx.fillStyle = col || COL.inkdk; ctx.strokeStyle = ctx.fillStyle; ctx.lineJoin = 'round';
  const circle = (cx, cy, r) => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); };
  const ring = (cx, cy, r, lw) => { ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); };
  const poly = (pts) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fill(); };
  const rr = (rx, ry, rw, rh, r) => { ctx.beginPath(); ctx.moveTo(rx + r, ry); ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, r); ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, r); ctx.arcTo(rx, ry + rh, rx, ry, r); ctx.arcTo(rx, ry, rx + rw, ry, r); ctx.closePath(); ctx.fill(); };
  switch (key) {
    case 'hearthstone': poly([[50, 6], [70, 44], [58, 72], [50, 94], [42, 72], [30, 44]]); break;       // crystal flame
    case 'wards': ring(50, 50, 42, 9); ring(50, 50, 28, 9); ring(50, 50, 14, 9); break;                // three concentric circles
    case 'sails': ctx.fillRect(45, 8, 8, 84); ctx.beginPath(); ctx.moveTo(53, 12); ctx.quadraticCurveTo(98, 46, 90, 82); ctx.lineTo(53, 82); ctx.closePath(); ctx.fill(); break; // sail on mast
    case 'weapons': rr(13, 40, 64, 18, 5); rr(74, 36, 9, 26, 2); circle(11, 49, 7); circle(24, 70, 13); circle(50, 70, 13); break; // cannon (two wheels, rear-set, touching the barrel)
    case 'infirmary': ctx.fillRect(40, 14, 20, 72); ctx.fillRect(14, 40, 72, 20); break;               // medical cross
    case 'sump': rr(30, 74, 44, 10, 3); rr(45, 32, 12, 44, 3); rr(37, 22, 28, 9, 3); rr(53, 35, 27, 9, 4); rr(70, 39, 9, 21, 3); circle(74, 67, 5); break; // faucet pump
    case 'shrine': { // prayer hands (two palms pressed, fingertips up)
      ctx.beginPath(); ctx.moveTo(50, 8); ctx.bezierCurveTo(36, 24, 30, 46, 32, 60); ctx.bezierCurveTo(33, 74, 40, 83, 49, 89); ctx.lineTo(50, 89); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(50, 8); ctx.bezierCurveTo(64, 24, 70, 46, 68, 60); ctx.bezierCurveTo(67, 74, 60, 83, 51, 89); ctx.lineTo(50, 89); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.strokeStyle = COL.paper; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(50, 16); ctx.lineTo(50, 84); ctx.stroke(); ctx.restore(); break;
    }
    case 'brinegate': { ctx.fillRect(12, 12, 76, 11); for (const bx of [24, 42, 58, 76]) ctx.fillRect(bx - 4, 23, 8, 53); ctx.fillRect(12, 44, 76, 8); for (const bx of [24, 42, 58, 76]) poly([[bx - 6, 76], [bx + 6, 76], [bx, 90]]); break; } // portcullis
    case 'fogveil': circle(34, 60, 16); circle(54, 50, 22); circle(73, 60, 15); circle(50, 66, 19); ctx.fillRect(30, 60, 48, 16); break; // cloud
    case 'helm': { ctx.save(); ctx.translate(50, 50); for (let i = 0; i < 4; i++) { ctx.save(); ctx.rotate(i * Math.PI / 4); ctx.fillRect(-42, -4, 84, 8); ctx.restore(); } ring(0, 0, 41, 7); ring(0, 0, 24, 6); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; circle(Math.cos(a) * 41, Math.sin(a) * 41, 8); } circle(0, 0, 13); ctx.restore(); break; } // ship's wheel (rim + inner ring)
    case 'doors': ctx.beginPath(); ctx.moveTo(24, 92); ctx.lineTo(24, 40); ctx.quadraticCurveTo(24, 14, 50, 14); ctx.quadraticCurveTo(76, 14, 76, 40); ctx.lineTo(76, 92); ctx.closePath(); ctx.fill(); ctx.fillStyle = COL.paper; ctx.fillRect(48, 18, 4, 74); break; // arched double door
    case 'lookout': { ctx.save(); ctx.translate(50, 50); ctx.rotate(-Math.PI / 5); rr(-36, -7, 50, 14, 3); rr(12, -10, 18, 20, 3); rr(-46, -5, 12, 10, 2); ctx.restore(); break; } // spyglass
    case 'stormhex': poly([[58, 6], [27, 56], [46, 56], [40, 94], [75, 40], [54, 40]]); break; // lightning bolt (storm-elf hacking)
    case 'sirensong': { // twin musical notes (the siren's song = mind control)
      circle(31, 75, 9); circle(67, 67, 9);
      ctx.fillRect(38, 30, 5, 47); ctx.fillRect(74, 22, 5, 47);
      ctx.beginPath(); ctx.moveTo(38, 26); ctx.lineTo(79, 18); ctx.lineTo(79, 29); ctx.lineTo(38, 37); ctx.closePath(); ctx.fill();
      break;
    }
    case 'hull': { // age-of-sail warship silhouette, three-masted (hull HP)
      // hull
      ctx.beginPath();
      ctx.moveTo(6, 66); ctx.lineTo(94, 66);                 // deck line, stern -> bow
      ctx.lineTo(86, 82); ctx.quadraticCurveTo(48, 92, 16, 80); // bow down, keel curve, back to stern
      ctx.closePath(); ctx.fill();
      // three masts, each with a square sail billowing downwind
      for (const mx of [24, 48, 72]) {
        ctx.fillRect(mx - 1.5, 12, 3, 54);                   // mast
        ctx.beginPath();
        ctx.moveTo(mx + 1, 16);
        ctx.quadraticCurveTo(mx + 22, 36, mx + 1, 54);       // bulging sail
        ctx.closePath(); ctx.fill();
      }
      // pennant streaming from the foremast
      ctx.beginPath(); ctx.moveTo(72, 12); ctx.lineTo(90, 16); ctx.lineTo(72, 20); ctx.closePath(); ctx.fill();
      break;
    }
    default: rr(20, 20, 60, 60, 6);
  }
  ctx.restore();
}

// ============ COMBAT SCREEN WRAPPER ============
const CombatScreen = {
  // Combat runs on a fixed 1920x1080 HD design grid.
  designW() { return 1920; },
  designH() { return 1080; },
  enter() { this._dragStart = null; this._beamAnchor = null; this._quitMenu = false; this._deckV = null; },
  // the active battle-like object: a real Battle in combat, or the DeckScreen's borrowed view
  // ("underway" mode). renderHD / hdClick / sceneClick read from here so one renderer serves both.
  hdB() { return this._deckV || Game.battle; },
  update(dt) { if (this._quitMenu) return; if (Game.battle) Game.battle.update(dt); },
  render(ctx) {
    if (!Game.battle) return;
    this.renderHD(ctx);
  },
  click(x, y, btn) {
    const b = Game.battle; if (!b) return;
    if (this._quitMenu) return; // the quit dialog is a KIT modal (its scrim swallows every click)
    this.hdClick(x, y, btn);
  },
  // the classic battle-scene click logic (rooms, crew sprites, doors, targeting, drag-select).
  // HD mode reuses this with center-viewport-translated coordinates -> behavior is identical.
  sceneClick(x, y, btn) {
    const b = this.hdB(); if (!b) return;
    // FTL beam aiming: click 1 plants the anchor on the target ship; the fixed-length line then
    // pivots to follow the cursor; click 2 fires along anchor -> cursor. Right-click cancels.
    if (b.state === 'fight' && b.selWeapon >= 0) {
      const wd = DATA.WEAPONS[b.p.weapons[b.selWeapon].key];
      if (wd && wd.type === 'beam') {
        if (btn === 2) { this._beamAnchor = null; b.selWeapon = -1; return; }
        if (!this._beamAnchor) { if (b.roomAt(b.e, x, y) !== null) this._beamAnchor = { x, y, w: b.selWeapon }; }
        else { b.setBeamAim(this._beamAnchor.w, this._beamAnchor.x, this._beamAnchor.y, x, y); this._beamAnchor = null; }
        return;
      }
    }
    if (btn === 0 && b.state === 'fight' && y < HUD_Y && !b.surrenderOffer && !b.gateMode && b.selWeapon < 0) {
      this._dragStart = { x, y }; return;
    }
    b.click(x, y, btn);
  },
  mouseup(x, y, btn) {
    this.hdUp(x, y, btn);
  },
  sceneUp(x, y, btn) {
    const b = this.hdB();
    const s = this._dragStart;
    if (!b || !s || btn !== 0) return;
    this._dragStart = null;
    if (Math.hypot(x - s.x, y - s.y) > 5) b.boxSelect(s.x, s.y, x, y, Game.keys['Shift']);
    else b.click(s.x, s.y, 0);
  },
  // ---- Stage 3: HD interaction routing. Chrome clicks call the same battle methods/HUD
  // coords classic uses (parity by construction); center clicks translate to battle space. ----
  hdScale() { return (1920 - 330) / 512; }, // center-viewport scale (keep in sync with renderHD SX/SW)
  // panel labels + pip type per system ('m'=mana core, 'p'=powered, 's'=subsystem)
  HD_SYS_LBL: { hearthstone: ['Hearthstone', 'm'], wards: ['Wards', 'p'], sails: ['Sails', 'p'], weapons: ['Weapons', 'p'], infirmary: ['Infirmary', 'p'], sump: ['Pumps', 'p'], shrine: ['Shrine', 'p'], brinegate: ['Portal', 'p'], fogveil: ['Fog', 'p'], stormhex: ['Storm', 'p'], sirensong: ['Song', 'p'], helm: ['Helm', 's'], doors: ['Doors', 's'], lookout: ['Lookout', 's'], open: ['Open', 'o'] },
  // FIXED layout: reactor, 5 core powered, OPEN_MOUNTS mount slots (installed advanced or 'open'
  // placeholder), 3 subsystems. Always the same count -> stable card sizing. Shared by render + click.
  hdSysList() {
    const b = this.hdB(); // deck view or live battle, like every other HD helper (R3)
    const ship = b ? b.p : Game.ship;
    const inst = DATA.SYS_ADVANCED.filter(k => ship && (ship.sysLv[k] || 0) > 0);
    const list = ['hearthstone', 'weapons', 'wards', 'sails', 'infirmary', 'sump'];
    for (let i = 0; i < DATA.OPEN_MOUNTS; i++) list.push(inst[i] || 'open'); // mount slot: installed system or empty
    list.push('helm', 'doors', 'lookout');
    return list;
  },
  hdActions(b) {
    // DeckScreen ("underway") swaps the combat pair for the station controls
    const lx = this.hdBottom().sys.x; // left edge tracks the SHIP SYSTEMS panel so the whole column lines up
    if (this._deckV) return [ // big icon+label buttons (same treatment as combat's Pause/Stations)
      { id: 'deck.setStations', x: lx, y: 716, w: 144, h: 100, big: true, icon: 'flag', label: 'Set Stations',
        tip: [{ t: 'Set Stations', c: TIP.ink }, { t: 'Remember where everyone stands now as their battle stations.', c: TIP.body }],
        fn: () => { b.setStations(); b._deckMsg = 'STATIONS SAVED.'; b._deckMsgT = 2; } },
      { id: 'deck.toStations', x: lx + 152, y: 716, w: 144, h: 100, big: true, icon: 'wheel', label: 'To Stations',
        tip: [{ t: 'To Stations', c: TIP.ink }, { t: 'Send every hand back to their saved station.', c: TIP.body }],
        fn: () => { b._deckMsg = b.returnStations() ? 'ALL HANDS TO STATIONS!' : 'EVERYONE IS AT THEIR STATION.'; b._deckMsgT = 2; } },
    ];
    // Big icon+label buttons seated just above the SHIP SYSTEMS panel — left edge tracks L.sys.x so
    // the Pause frame lines up with the SHIP SYSTEMS frame. (Advanced systems — Veil / Board+Recall /
    // Jam / Charm — are cast from a button ON their own system card; see hdSysActions.)
    return [
      { id: 'combat.pause', x: lx, y: 716, w: 144, h: 100, big: true, icon: 'pause', label: 'Pause', sound: false,
        tip: [{ t: b.paused ? 'Resume' : 'Pause', c: TIP.ink }, { t: 'Orders still work while paused. Space also toggles.', c: TIP.body }],
        fn: () => b.togglePause() },
      { id: 'combat.stations', x: lx + 152, y: 716, w: 144, h: 100, big: true, icon: 'wheel', label: 'Stations', sound: false,
        tip: [{ t: 'All hands to stations', c: TIP.ink }, { t: 'Left-click (or R): everyone returns to their saved post.', c: TIP.body }, { t: 'Right-click (or T): save where everyone stands now.', c: TIP.faint }],
        fn: () => b.returnToStations(), onRight: () => b.saveStations() },
    ];
  },
  // a big PARCHMENT-faced command button (Pause / Stations) — same face + deferred ornate frame as the
  // KIT Retreat button, but icon-over-label. A KIT registration (a.id): hover / press states, mouse-up
  // activation, right-click via a.onRight. Pause flips to a play-triangle + "Resume" (and lights teal).
  hdBigBtn(ctx, a, b) {
    KIT.reg(a.id, a, { onClick: a.fn, onRight: a.onRight, sound: a.sound });
    const hov = KIT.hovered(a.id, a), prs = KIT.pressed(a.id, a);
    if (hov) Game.hot = true;
    const ht = KIT.anim(a.id + ':h', hov ? 1 : 0, 18);
    const x = a.x, y = a.y + (prs ? 1.5 : 0), w = a.w, h = a.h;
    const paused = a.icon === 'pause' && b.paused;
    KIT.parchFill(ctx, x, y, w, h);
    if (paused) { ctx.fillStyle = 'rgba(47,138,114,0.16)'; ctx.fillRect(x, y, w, h); }       // lit while it holds the game
    if (ht > 0) { ctx.fillStyle = 'rgba(255,236,190,' + (0.32 * ht).toFixed(3) + ')'; ctx.fillRect(x, y, w, h); }
    if (prs) { ctx.fillStyle = 'rgba(60,36,12,0.16)'; ctx.fillRect(x, y, w, h); }
    const col = COL.inkdk;                                                          // dark ink icon + label on parchment
    hdActionIcon(ctx, paused ? 'play' : a.icon, x + w / 2, y + h * 0.40, 46, col);
    KIT.text(ctx, paused ? 'Resume' : a.label, { x, y: y + h - 36, w, h: 24 }, { size: 20, display: true, align: 'center', padX: 18, color: col }); // clear of the frame's corner knots
    KIT.frame({ x, y, w, h });
    if (hov && a.tip) KIT.tip(a.tip, Game.mouse.x, Game.mouse.y);
  },
  // Activate-buttons for an advanced system, shown ON its system card (above the pips) — an array
  // so the Brine Gate can stack Board + Recall. Shared by renderHD (draws) and hdClick (handles)
  // so geometry/labels never drift. Each carries cd/cdMax for the cooldown overlay.
  hdSysActions(b, key) {
    if (!b) return [];
    // Doors get global Open All / Shut All buttons — available in combat AND underway (deck mode).
    // (Open All lets crew/water/fire move freely; Shut All seals the ship: contains fire & flooding,
    // slows boarders. Sea doors stay a per-room action — these never flood the ship.)
    if (key === 'doors') {
      const note = (t) => { if (this._deckV) { b._deckMsg = t; b._deckMsgT = 2; } else b.log(t); };
      return [
        { label: 'Open All', icon: 'open', fn: () => { b.p.setAllDoors(true); note('ALL DOORS THROWN OPEN.'); }, snd: 'click', ready: true, live: false, cd: 0, cdMax: 0,
          tip: 'Throw every door open — crew move freely, but fire and water spread.' },
        { label: 'Shut All', icon: 'shut', fn: () => { b.p.setAllDoors(false); note('ALL DOORS SEALED — WATERTIGHT.'); }, snd: 'click', ready: true, live: false, cd: 0, cdMax: 0,
          tip: 'Seal every door — contains fire and flooding, slows boarders.' },
      ];
    }
    if (this._deckV) return []; // no combat activations (Veil/Board/Jam/Charm) while underway
    const p = b.p;
    // the one reason a system button is dark right now (shown as its tooltip; pressing logs it)
    const why = (sys, cd) => p.powered(sys) <= 0 ? 'No mana — left-click this card to power it.' : cd > 0 ? 'Recharging — ' + Math.ceil(cd) + 's left.' : null;
    switch (key) {
      case 'fogveil': return [{ label: 'Veil', fn: () => b.castVeil(), ready: b.veilReady(), live: (p.veilT || 0) > 0, cd: p.veilCd || 0, cdMax: p.veilCdMax || 0,
        reason: why('fogveil', p.veilCd || 0), tip: 'Vanish into conjured fog: enemy shots lose you for a few seconds.' }];
      case 'brinegate': {
        const away = b.p.crew.some(c => !c.dead && c.aboard === 'away');
        return [
          { label: b.gateMode ? 'Board…' : 'Board', fn: () => b.tryGate(), ready: b.gateReady(), live: !!b.gateMode, cd: p.gateCd || 0, cdMax: p.gateCdMax || 0,
            reason: why('brinegate', p.gateCd || 0), tip: 'Send the crew standing in the Portal room to an enemy room.' },
          { label: 'Recall', fn: () => b.tryRecall(), ready: b.gateReady() && away, live: false, cd: p.gateCd || 0, cdMax: p.gateCdMax || 0,
            reason: why('brinegate', p.gateCd || 0) || (away ? null : 'No one is aboard the enemy to recall.'), tip: 'Pull every boarder home through the Portal.' },
        ];
      }
      case 'stormhex': return [{ label: 'Jam', icon: 'bolt', fn: () => b.tryStormhex(), ready: b.hexReady(), live: !!b.hexMode, cd: p.hexCd || 0, cdMax: p.hexCdMax || 0,
        reason: why('stormhex', p.hexCd || 0), tip: 'Arc lightning onto an enemy system and jam it.' }];
      case 'sirensong': return [{ label: 'Charm', icon: 'heart', fn: () => b.trySong(), ready: b.songReady(), live: !!b.songMode, cd: p.songCd || 0, cdMax: p.songCdMax || 0,
        reason: why('sirensong', p.songCd || 0), tip: 'Sing an enemy sailor over to your side for a while.' }];
      default: return [];
    }
  },
  // the familiar DEPLOY / RE-BIND button in slot i (shared by renderHD's draw and the regress hit-rect test)
  famBtnRect(L, i) { const bw = 78, bh = 22, mid = L.fam.y + 50 + i * 44 + 20; return { x: L.fam.x + L.fam.w - 18 - bw, y: mid - bh / 2, w: bw, h: bh }; },
  hdSysBtnRect(L, idx, count, slot) { const cw = L.sys.w / count, x = L.sys.x + idx * cw, cardTop = L.sys.y + 48; return { x: x + 15, y: cardTop + 13 + (slot || 0) * 28, w: cw - 30, h: 23 }; },
  // dispatch an in-button glyph by type (door open/shut, lightning bolt, heart)
  drawGlyph(ctx, type, cx, cy, s, col) {
    if (type === 'open' || type === 'shut') return this.doorGlyph(ctx, cx, cy, s, type === 'open', col);
    ctx.save(); ctx.fillStyle = col;
    if (type === 'bolt') {
      const w = s * 0.62, h = s;
      ctx.beginPath();
      ctx.moveTo(cx + w * 0.18, cy - h * 0.5);
      ctx.lineTo(cx - w * 0.5, cy + h * 0.12);
      ctx.lineTo(cx - w * 0.05, cy + h * 0.12);
      ctx.lineTo(cx - w * 0.22, cy + h * 0.5);
      ctx.lineTo(cx + w * 0.5, cy - h * 0.16);
      ctx.lineTo(cx + w * 0.04, cy - h * 0.16);
      ctx.closePath(); ctx.fill();
    } else if (type === 'heart') {
      const w = s * 0.96, h = s * 0.86, top = cy - h * 0.32;
      ctx.beginPath();
      ctx.moveTo(cx, top + h * 0.28);
      ctx.bezierCurveTo(cx, top, cx - w / 2, top, cx - w / 2, top + h * 0.3);
      ctx.bezierCurveTo(cx - w / 2, top + h * 0.6, cx - w * 0.12, top + h * 0.82, cx, cy + h * 0.5);
      ctx.bezierCurveTo(cx + w * 0.12, top + h * 0.82, cx + w / 2, top + h * 0.6, cx + w / 2, top + h * 0.3);
      ctx.bezierCurveTo(cx + w / 2, top, cx, top, cx, top + h * 0.28);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  },
  // an arch-top door glyph: solid leaf (+ handle) = SHUT; empty outline doorway = OPEN.
  doorGlyph(ctx, cx, cy, s, open, col) {
    const w = Math.round(s * 0.72), h = s, x = Math.round(cx - w / 2), y = Math.round(cy - h / 2), r = w / 2;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y + h); ctx.lineTo(x, y + r); ctx.arc(x + r, y + r, r, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath();
    if (open) {
      ctx.lineWidth = Math.max(1.6, s * 0.13); ctx.strokeStyle = col; ctx.lineJoin = 'round'; ctx.stroke();          // empty doorway
      ctx.beginPath(); ctx.moveTo(x + w * 0.3, y + h - 2); ctx.lineTo(x + w * 0.3, y + r * 0.8); ctx.lineWidth = Math.max(1, s * 0.09); ctx.stroke(); // ajar leaf
    } else {
      ctx.fillStyle = col; ctx.fill();                                                                              // solid door
      ctx.fillStyle = '#1c1206'; ctx.beginPath(); ctx.arc(x + w * 0.74, cy + s * 0.04, Math.max(1.2, s * 0.08), 0, 7); ctx.fill(); // handle
    }
    ctx.restore();
  },
  // shared bottom-panel layout (used by renderHD + hdClick so they never drift).
  // Combat log was removed; its width is redistributed to these three, and they grow
  // UP to just below the water (scene bottom ~815) for extra height.
  hdBottom() {
    // familiars trimmed ~33%; freed width handed to systems + weapons. right edge stays at 1900.
    // gaps between panels are widened so the parchment "page" behind them reads in the gutters.
    return {
      sys: { x: 17, y: 832, w: 955, h: 230 },
      wpn: { x: 1004, y: 832, w: 544, h: 230 },
      fam: { x: 1580, y: 832, w: 312, h: 230 },
    };
  },
  // HD surrender dialog — a KIT modal: its scrim blocks every control beneath, so only Accept / Fight On are live.
  hdSurrenderRects() {
    const box = { x: 610, y: 388, w: 700, h: 300 };
    return {
      box,
      accept: { x: box.x + 70, y: box.y + box.h - 96, w: 250, h: 64 },
      decline: { x: box.x + box.w - 320, y: box.y + box.h - 96, w: 250, h: 64 },
    };
  },
  drawHdSurrender(ctx) {
    const b = Game.battle, s = this.hdSurrenderRects(), o = b.surrenderOffer;
    KIT.scrim(ctx, 1920, 1080, 0.55);
    const c = KIT.panel(ctx, s.box, { title: 'They signal surrender!', wood: true });
    KIT.card(ctx, { x: c.x, y: c.y, w: c.w, h: 112 });
    KIT.text(ctx, 'The enemy captain offers tribute if you let them limp home: ' + o.shards + ' shards and ' + o.rune + ' runeshot.',
      { x: c.x + 24, y: c.y + 14, w: c.w - 48, h: 84 }, { size: 22, italic: true, color: COL.inkmd, fit: 'wrap', align: 'center', maxLines: 3 });
    KIT.button(ctx, 'combat.surrender.accept', s.accept, 'Accept', { onClick: () => b.acceptSurrender(), sound: false, size: 26,
      tip: [{ t: 'Take the tribute', c: TIP.ink }, { t: o.shards + ' shards and ' + o.rune + ' runeshot. They sail away.', c: TIP.body }] });
    KIT.button(ctx, 'combat.surrender.decline', s.decline, 'Fight On', { variant: 'danger', onClick: () => b.declineSurrender(), sound: false, size: 26,
      tip: [{ t: 'No quarter', c: TIP.ink }, { t: 'Refuse and finish the fight.', c: TIP.body }] });
  },
  // clicks that land on NO kit control (the kit registry — Retreat, gear, Pause/Stations, system action
  // buttons, weapon rows, familiar deploy, dialogs — gets first refusal in Game's mousedown).
  hdClick(x, y, btn) {
    const b = this.hdB(); if (!b) return;
    const deck = !!this._deckV;
    const inR = (rx, ry, rw, rh) => x >= rx && x < rx + rw && y >= ry && y < ry + rh;
    const L = this.hdBottom();
    if (b.surrenderOffer) return; // modal (the scrim normally swallows the click first)
    // crew rail -> select crew (toggle, Shift = multi)
    if (x < L.sys.x + 302) for (let i = 0; i < 8; i++) if (inR(L.sys.x, 92 + i * 72, 300, 64)) {
      const c = b.p.crew[i];
      if (c && !c.dead) { if (!Game.keys['Shift']) b.selCrew.clear(); if (b.selCrew.has(c.id)) b.selCrew.delete(c.id); else b.selCrew.add(c.id); AUDIO.sfx('click'); }
      return;
    }
    // ship systems -> mana allocation (left +, right -); hearthstone + sub systems are no-ops
    if (inR(L.sys.x, L.sys.y + 44, L.sys.w, L.sys.h - 44)) {
      const sysL = this.hdSysList(), cw = L.sys.w / sysL.length, idx = Math.floor((x - L.sys.x) / cw), k = sysL[idx];
      if (k && k !== 'hearthstone' && k !== 'open' && !DATA.SYS_SUB.includes(k)) {
        if (btn === 2) { b.p.setAlloc(k, (b.p.alloc[k] || 0) - 1); AUDIO.sfx('click'); }
        else if (b.p.totalAlloc() < b.p.effMana()) { b.p.setAlloc(k, (b.p.alloc[k] || 0) + 1); AUDIO.sfx('click'); }
        else { b.log('THE HEARTHSTONE IS FULLY COMMITTED - RIGHT-CLICK A SYSTEM TO FREE A BAR.'); AUDIO.sfx('back'); }
      }
      return;
    }
    // weapons panel: a click that missed every gun row cancels a pending selection ("click away deselects")
    if (inR(L.wpn.x, L.wpn.y + 50, L.wpn.w, L.wpn.h - 52)) {
      if (!deck && b.selWeapon >= 0) { b.selWeapon = -1; this._beamAnchor = null; AUDIO.sfx('back'); }
      return;
    }
    if (inR(L.fam.x, L.fam.y, L.fam.w, L.fam.h)) return; // familiar panel body is read-only (deploy is a button)
    // enemy box is read-only
    if (inR(1480, 92, 420, 200)) return;
    // center battle viewport -> translate to battle space and run the scene click
    if (x >= 330 && x < 1920 && y >= 120 && y <= 816) { const s = this.hdScale(); this.sceneClick((x - 330) / s, (y - 120) / s, btn); }
  },
  hdUp(x, y, btn) {
    if (x >= 330 && x < 1920 && y >= 120 && y <= 816) { const s = this.hdScale(); this.sceneUp((x - 330) / s, (y - 120) / s, btn); }
  },
  // ---- Stage 0: HD combat scaffold (1920x1080). Framed empty panels + center battle region.
  // Live data lands in Stage 2, interactions in Stage 3, the battle composite in Stage 1.
  // +1 good for the player, -1 bad, 0 neutral — from the message's subject and verb
  logTone(msg, b) {
    const up = String(msg).toUpperCase();
    const ename = b && b.e && b.e.name ? b.e.name.toUpperCase() : '\u0000';
    const mine = /^(YOU|YOUR|ALL HANDS|EVERYONE|OUR)\b/.test(up) || (b && b.p && b.p.name && up.startsWith(b.p.name.toUpperCase()));
    const theirs = /^(THE ENEMY|ENEMY|BOARDERS|THEIR|THE WARDEN|THE ARMADA)\b/.test(up) || up.startsWith(ename);
    const bad = /(SHATTER|BURN|ABLAZE|FLOOD|BREACH|LOST|DIES|DIED|SLAIN|FALLS|DOWNED|JAMMED|STUNNED|BLIND|CHARMED|POISON|SINK|CRIPPL|DESTROY|WRECK|CANNOT|CAN'T|FAILS|NO MANA|OUT OF|FLEE|ESCAPE|BLOCK)/.test(up);
    const good = /(EVADE|DODGE|ABSORB|SOAK|REPAIR|RESIST|HOLD|SAFE|REVIVE|HEAL|CAPTURE|PRIZE|SURRENDER|VICTORY|STRIKE|LANDS|HITS)/.test(up);
    if (mine) return bad ? -1 : good ? 1 : 0;
    if (theirs) return bad ? 1 : good ? -1 : 0;
    if (/(SHIP CAPTURED|PRIZE TAKEN|ENEMY SUNK|VICTORY)/.test(up)) return 1;
    return 0;
  },
  // ALL-CAPS log lines -> sentence case, keeping proper names (ships, crew, systems) capitalised
  sentenceCase(msg, b) {
    msg = String(msg);
    const letters = msg.replace(/[^A-Za-z]/g, '');
    if (!letters || letters !== letters.toUpperCase()) return msg; // already mixed case
    let out = msg.toLowerCase().replace(/(^|[.!?]\s+)([a-z])/g, (m, p, c) => p + c.toUpperCase());
    const names = [];
    if (b) { for (const sh of [b.p, b.e]) { if (sh && sh.name) names.push(sh.name); if (sh && sh.crew) for (const c of sh.crew) if (c.name) names.push(c.name); } }
    for (const k in DATA.SYSTEMS) { const n = DATA.SYSTEMS[k].name; if (n && /\s/.test(n)) names.push(n); } // multi-word proper names only (not 'wards', 'sails'...)
    names.push('Warden', 'Armada', 'Portal', 'Seance Candle', 'Seance Candles', 'Hearthstone', 'Imperial', 'Dawnchaser');
    for (const nm of names) {
      const re = new RegExp('\\b' + nm.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
      out = out.replace(re, nm.charAt(0).toUpperCase() + nm.slice(1));
    }
    return out;
  },
  renderHD(ctx) {
    const b = this.hdB(), run = Game.run || {};
    const deck = !!this._deckV; // DeckScreen "underway" mode: no enemy, station controls, read-only panels
    // shared LEFT-COLUMN edge: nameplate, crew rail, Pause/Stations + SHIP SYSTEMS all line up here.
    const LX = this.hdBottom().sys.x, dL = LX - 20; // track the SHIP SYSTEMS panel's left edge
    let hdTip = null; // {lines:[{t,c}], ax, ay} — scrap tooltip for the hovered HD element
    // AI chrome: 9-slice ornate frame + seamless parchment/stone tiles (fall back to code-drawn if absent)
    // chrome primitives live in the shared KIT (js/kit.js) since 2026-10-08; these are thin local aliases
    const parchPat = KIT.pat(ctx, 'ui_parchment');
    // ---- the battle scene is the FULL-BLEED backdrop; panels paint on top of it ----
    // Render scene-only (no classic HUD/hover) into an offscreen sized to the ON-SCREEN width,
    // so the high-res (2x) ship art draws at full detail and the final blit is 1:1 (no blurry
    // 3x upscale). The scene's logical 512xHUD_Y space is scaled up by SS via setTransform.
    if (b) {
      const SX = 330, SW = 1920 - SX, mid = SX + SW / 2, OFF = 120;
      const SS = SW / 512, dh = Math.round(HUD_Y * SS); // SS ~3.1 -> offscreen renders at display res
      if (!this._sc || this._sc.width !== SW) { this._sc = document.createElement('canvas'); this._sc.width = SW; this._sc.height = dh; this._sctx = this._sc.getContext('2d'); }
      const o = this._sctx;
      o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, SW, dh);
      // camera shake (Stage 1 juice): trauma-driven smooth offset, with a matching overscan zoom about
      // the scene centre so the shaken frame never exposes an edge. Frozen while paused.
      const shk = b.shakeOffset ? b.shakeOffset() : { x: 0, y: 0, mag: 0 };
      const zm = shk.mag > 0 ? 1 + (shk.mag + 0.5) / 110 : 1;
      o.setTransform(SS * zm, 0, 0, SS * zm, SS * (256 * (1 - zm) + shk.x), SS * (HUD_Y / 2 * (1 - zm) + shk.y));
      o.imageSmoothingEnabled = true; o.imageSmoothingQuality = 'high'; // smooth the art at fractional scale; fillRect sea stays crisp
      b._aimMouse = { x: (Game.mouse.x - SX) / SS, y: (Game.mouse.y - OFF) / SS }; // scene-logical cursor (aim previews + crew hover)
      b.renderSea(o); if (!deck) b.renderShip(o, b.e); b.renderShip(o, b.p);
      if (!deck) {
        b.renderProjectiles(o); b.renderSweeps(o); b.renderTargeting(o); b.renderHazardFx(o);
      }
      if (b.renderParticles) b.renderParticles(o);   // life-faded, additive fire/magic sparks
      if (b.renderFloaters) b.renderFloaters(o);     // floating damage numbers / MISS / WARDED
      if (b.flash > 0) { // brief additive full-scene flash (hull hits, lightning)
        o.save(); o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'lighter';
        o.fillStyle = 'rgba(255,240,215,' + (TUNING.sceneFlashMax * Math.min(1, b.flash / 0.25)).toFixed(3) + ')';
        o.fillRect(0, 0, SW, dh); o.restore();
      }
      // dark WALNUT surround (warm wood, not gray stone / digital blue) — panels float on it
      // unframed PARCHMENT page is the chrome background; the wood-framed panels sit on top of it
      if (parchPat) { ctx.fillStyle = parchPat; ctx.fillRect(0, 0, 1920, 1080); ctx.fillStyle = 'rgba(223,205,166,0.12)'; ctx.fillRect(0, 0, 1920, 1080); }
      else { ctx.fillStyle = COL.paper; ctx.fillRect(0, 0, 1920, 1080); }
      ctx.imageSmoothingEnabled = true;
      // sky band above the scene: MIRROR the scene's top strip (continuous clouds, no stretched smear or
      // hard seam), then deepen it slightly toward the top of the screen so it reads as open sky
      ctx.save(); ctx.translate(SX, OFF + 1); ctx.scale(1, -1); ctx.drawImage(this._sc, 0, 0, SW, OFF + 2, 0, 0, SW, OFF + 2); ctx.restore();
      { const g = ctx.createLinearGradient(0, 0, 0, OFF); g.addColorStop(0, 'rgba(36,74,150,0.30)'); g.addColorStop(1, 'rgba(36,74,150,0)'); ctx.fillStyle = g; ctx.fillRect(SX, 0, SW, OFF); }
      ctx.drawImage(this._sc, 0, 0, SW, dh, SX, OFF, SW, dh); // 1:1 blit -> crisp
      // --- hover the scene: room/door tooltips + a room outline (parity with the classic view) ---
      if (b.state === 'fight' && !b.surrenderOffer && Game.mouse.x >= SX) {
        const lx = (Game.mouse.x - SX) / SS, ly = (Game.mouse.y - OFF) / SS; // scene-logical coords
        if (lx >= 0 && lx < 512 && ly >= 0 && ly < HUD_Y) {
          let done = false;
          const hoverShips = deck ? [b.p] : [b.p, b.e]; // deck mode: never probe the dummy enemy (no rooms/doors)
          for (const ship of hoverShips) { const di = b.doorAt(ship, lx, ly); if (di != null) { hdTip = { lines: b.doorTip(ship, di), ax: Game.mouse.x, ay: Game.mouse.y }; Game.hot = true; done = true; break; } }
          if (!done) for (const ship of (deck ? [b.p] : [b.e, b.p])) { const rid = b.roomAt(ship, lx, ly); if (rid != null) {
            hdTip = { lines: b.roomTip(ship, rid), ax: Game.mouse.x, ay: Game.mouse.y }; Game.hot = true;
            const rr = b.roomRect(ship, ship.rooms[rid]);
            ctx.save(); ctx.strokeStyle = 'rgba(246,232,200,0.9)'; ctx.lineWidth = 2.5; ctx.strokeRect(SX + rr.x * SS, OFF + rr.y * SS, rr.w * SS, rr.h * SS); ctx.restore();
            break;
          } }
        }
      }
      if (b.paused && b.state === 'fight') TYPE.drawCentered(ctx, '— PAUSED —', mid, 34, 26, COL.gold, { display: true, outline: COL.black, outlineW: 2 });
      if (b.state !== 'fight' && b.banner) TYPE.drawCentered(ctx, b.banner, mid, 300, 32, COL.gold, { display: true, outline: COL.black, outlineW: 2 });
      if (b.gateMode) TYPE.drawCentered(ctx, 'Click an enemy room to board', mid, 280, 24, COL.ltblue, { italic: true, outline: COL.black, outlineW: 2 });
      else if (b.hexMode) TYPE.drawCentered(ctx, 'Click an enemy system to jam', mid, 280, 24, COL.ltblue, { italic: true, outline: COL.black, outlineW: 2 });
      else if (b.songMode) TYPE.drawCentered(ctx, 'Click a room to charm a sailor', mid, 280, 24, COL.pink, { italic: true, outline: COL.black, outlineW: 2 });
      else if (b.selWeapon >= 0) TYPE.drawCentered(ctx, 'Click an enemy room to target', mid, 280, 24, COL.gold, { italic: true, outline: COL.black, outlineW: 2 });
      // fading event popups in the upper-middle (replaces the old COMBAT LOG panel);
      // start below the tall resource panels so the top line never hides behind them.
      // dark outline (not a sub-pixel shadow) so they read over the brightest sky.
      let py = 150;
      // combat log: newest 3 lines, coloured by what the event MEANS for the player (good teal /
      // bad salmon / neutral gold) rather than by grammatical subject, in sentence case (no shouting).
      const shown = b.logs.filter(l => l.t > 0).slice(-3);
      for (const l of shown) {
        const tone = this.logTone(l.msg, b);
        const col = tone > 0 ? '#a8ecd6' : tone < 0 ? '#ffb39a' : COL.gold;
        const txt = this.sentenceCase(l.msg, b) + ((l.n > 1) ? '  ×' + l.n : '');
        const tw = TYPE.width(ctx, txt, 27, { weight: 600 });
        KIT.pill(ctx, mid - tw / 2 - 18, py - 5, tw + 36, 36, Math.min(1, l.t) * 0.5);
        ctx.globalAlpha = Math.min(1, l.t);
        TYPE.drawCentered(ctx, txt, mid, py, 27, col, { weight: 600, outline: '#0b0805', outlineW: 2 });
        ctx.globalAlpha = 1; py += 38;
      }
      // underway: the deck status message (Stations saved, doors, etc.) as a centered scene popup
      if (deck && b._deckMsg && b._deckMsgT > 0) {
        ctx.globalAlpha = Math.min(1, b._deckMsgT);
        TYPE.drawCentered(ctx, b._deckMsg, mid, 150, 26, COL.gold, { display: true, outline: COL.black, outlineW: 2 });
        ctx.globalAlpha = 1;
      }
    } else { ctx.fillStyle = COL.cabin; ctx.fillRect(0, 0, 1920, 1080); }

    const panel = (x, y, w, h, title, tcol, woodBody) => KIT.panel(ctx, { x, y, w, h }, { title, tcol, wood: woodBody });
    const card = (cx, cy, cw, ch) => KIT.card(ctx, { x: cx, y: cy, w: cw, h: ch });
    const slot = (x, y, w, h) => card(x, y, w, h); // crew-rail card == the same parchment card
    const pips = (x, y, total, on, sz, cOn, cOff) => { for (let i = 0; i < total; i++) { ctx.fillStyle = i < on ? cOn : cOff; ctx.fillRect(x + i * (sz + 1), y, sz, sz + 2); } };
    const pipsV = (cx, baseY, total, on, w, h, gap, cOn, cOff) => KIT.pipsV(ctx, cx, baseY, total, on, w, h, gap, cOn, cOff);
    const bar = (x, y, w, h, frac, col) => KIT.bar(ctx, x, y, w, h, frac, col);
    const segbar = (x, y, w, h, frac, col, n) => KIT.segbar(ctx, x, y, w, h, frac, col, n);
    // a small cog glyph centered in a square button (settings)
    const cog = (cx, cy, R) => { // dark ink gear with a parchment center hole — high contrast, pops on parchment
      ctx.save(); ctx.translate(cx, cy);
      ctx.fillStyle = COL.inkdk; for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-4, -R, 8, 9); }
      ctx.beginPath(); ctx.arc(0, 0, R - 5, 0, 7); ctx.fillStyle = COL.inkdk; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fillStyle = parchPat || COL.paper; ctx.fill();
      ctx.restore();
    };

    // ---- top bar: nameplate + hull + evade, resources, retreat ----
    // width 297 -> frame spans LX-3 .. LX+300, exactly matching the crew status frames below (slot LX-3,w303).
    panel(LX, 14, 297, 72);
    TYPE.draw(ctx, b ? (b.p.name || 'DAWNCHASER') : 'DAWNCHASER', LX + 14, 25, 24, COL.inkdk, { display: true, maxWidth: 168, fit: 'shrink' }); // dropped below the frame
    if (b) {
      TYPE.drawRight(ctx, deck ? 'Underway' : ('Evade ' + Math.round(b.p.evasion(b)) + '%'), LX + 283, 29, 16, COL.inkmd, { italic: true });
      bar(LX + 14, 54, 205, 16, b.p.hull / b.p.hullMax, Game.hullBarColor(b.p.hull / b.p.hullMax));
      TYPE.drawRight(ctx, b.p.hull + '/' + b.p.hullMax, LX + 283, 53, 18, COL.inkdk);
    }
    // resource readouts — Mythril Shards · Runeshot · Seance Candles share ONE parchment, CENTERED on
    // the screen's horizontal midline (960), split into equal thirds by thin ink dividers. Each
    // icon+number pair is centered within its third. Same height (72) as the nameplate + Retreat.
    const RW = 600, RX = Math.round(960 - RW / 2), third = RW / 3; // 660..1260, centered on screen
    panel(RX, 14, RW, 72);
    UI.resTriadHD(ctx, RX, 14, RW, run);
    // hover a resource cell -> name it (the currency is MYTHRIL SHARDS — the metallic crystal that holds
    // enchantment; distinct from "mana", the Hearthstone power you allocate to systems).
    if (Game.mouse.x >= RX && Game.mouse.x < RX + RW && Game.mouse.y >= 14 && Game.mouse.y < 86) {
      Game.hot = true;
      const rinfo = [
        ['Mythril Shards', 'Your coin. Spend at anchorages on weapons, crew, augments, repairs and refits.'],
        ['Runeshot', 'Ordnance for bombs and torpedoes — they slip beneath enemy wards.'],
        ['Seance Candles', 'Lit at the Binding Shrine to deploy or re-bind an orbiting familiar.'],
      ][Math.max(0, Math.min(2, Math.floor((Game.mouse.x - RX) / third)))];
      hdTip = { lines: [{ t: rinfo[0], c: TIP.ink }, { t: rinfo[1], c: TIP.body }], ax: Game.mouse.x, ay: Game.mouse.y };
    }
    // Retreat (underway: To Chart) — a KIT parchment button. R15: when the fight can't be fled it renders
    // DISABLED with the reason as its tooltip, and pressing it logs that reason (failures say WHY).
    const RET = { x: 1648, y: 14, w: 150, h: 72 };
    if (deck) {
      KIT.button(ctx, 'deck.chart', RET, 'To Chart', { size: 22, onClick: () => { this._deckV = null; Game.setScreen('map'); },
        tip: [{ t: 'Back to the chart', c: TIP.ink }, { t: 'Escape also returns to the chart.', c: TIP.body }] });
    } else if (b) {
      const why = b.fleeBlockedReason(), fleeing = !why && b.p.fleeing;
      KIT.button(ctx, 'combat.retreat', RET, 'Retreat', {
        size: 22, sound: false, disabled: !!why, reason: why, live: fleeing,
        sub: fleeing ? 'fleeing ' + Math.floor((b.p.escape || 0) * 100) + '%' : null,
        onClick: () => { if (b.state === 'fight') b.tryFlee(); },
        onDenied: () => b.log(why.toUpperCase()),
        tip: [{ t: fleeing ? 'Retreating' : 'Retreat', c: TIP.ink }].concat(why ? [] : [{ t: fleeing
          ? 'Making for open water. Click again to hold position.'
          : 'Make for open water. Needs a manned Helm and powered Sails.', c: TIP.body }]),
      });
    }
    // settings/menu gear — opens the quit-to-title menu (back to main menu)
    KIT.button(ctx, deck ? 'deck.gear' : 'combat.gear', { x: 1818, y: 14, w: 72, h: 72 }, '', {
      icon: (c2, cx, cy) => cog(cx, cy, 22),
      onClick: () => { this._quitMenu = deck ? this._deckV : true; },
      tip: [{ t: 'Menu', c: TIP.ink }, { t: deck ? 'Quit to the title screen.' : 'Quit to the title screen (Q).', c: TIP.body }],
    });

    // ---- crew rail (live: portrait + name + hp + station) ----
    // FTL-style: size to the roster — one slot per crew member, no reserved empty frames.
    const crew = b ? b.p.crew : [];
    this._hovRailCrew = null;
    for (let i = 0; i < crew.length; i++) {
      const cyc = 92 + i * 72; slot(LX - 3, cyc, 303, 64); // left edge matches the ornate-framed panels (x-3)
      const chov = Game.mouse.x >= LX && Game.mouse.x < LX + 300 && Game.mouse.y >= cyc && Game.mouse.y < cyc + 64;
      if (chov) { Game.hot = true; ctx.fillStyle = 'rgba(255,240,200,0.10)'; ctx.fillRect(LX + 1, cyc + 1, 298, 62); }
      const c = crew[i];
      if (chov && !c.dead) { this._hovRailCrew = c; this._hovRailY = cyc; }
      if (b.selCrew && b.selCrew.has(c.id)) { ctx.strokeStyle = COL.gold; ctx.strokeRect(LX + 1, cyc + 1, 298, 62); }
      if (!SPR.drawArt(ctx, 'portrait_' + c.race, LX + 6, cyc + 8, 48, 48)) { ctx.fillStyle = COL.woodfr; ctx.fillRect(LX + 6, cyc + 8, 48, 48); }
      ctx.globalAlpha = c.dead ? 0.4 : 1;
      const room = b.p.rooms[c.roomId], skey = room && room.key;
      const station = c.dead ? 'lost' : (skey ? (DATA.SYSTEMS[skey] ? DATA.SYSTEMS[skey].name : skey) : 'roaming');
      // name + station on ONE line, same size, dash-separated: "Reyes - Helm". The NAME is bold
      // (faux-bold via double-draw — no Spectral-Bold is bundled — keeps its normal mixed case).
      const ncol = c.dead ? COL.inkfade : COL.inkdk;
      TYPE.draw(ctx, c.name, LX + 64, cyc + 10, 23, ncol);
      TYPE.draw(ctx, c.name, LX + 64.7, cyc + 10, 23, ncol);
      const nw = TYPE.width(ctx, c.name, 23) + 2;
      TYPE.draw(ctx, ' - ' + station, LX + 64 + nw, cyc + 10, 23, ncol, { maxWidth: 232 - nw, fit: 'shrink' });
      bar(LX + 64, cyc + 40, 180, 12, Math.max(0, c.hp) / c.maxhp, (c.hp / c.maxhp) < 0.34 ? COL.red : COL.green);
      ctx.globalAlpha = 1;
    }
    // hover a crew portrait -> which stations they are good at (racial aptitude + earned mastery)
    if (this._hovRailCrew) {
      const c = this._hovRailCrew, W = 330;
      const dlines = TYPE.wrap(ctx, DATA.RACES[c.race].desc, W - 18, 13, { italic: true });
      const ranked = ['weapons', 'helm', 'sails', 'wards', 'repair', 'combat']
        .map(k => ({ k, r: DATA.crewRank(c, k) })).filter(o => o.r > 0);
      const mastery = ranked.length
        ? 'Trained: ' + ranked.map(o => DATA.SKILL_NAME[o.k] + ' ' + '\u2605'.repeat(o.r)).join('   ')
        : 'No station mastery earned yet \u2014 it grows by doing the job.';
      const mlines = TYPE.wrap(ctx, mastery, W - 18, 12);
      const H = 24 + dlines.length * 15 + 6 + mlines.length * 14 + 8;
      const ty = U.clamp(this._hovRailY, 6, 1080 - H - 6);
      const r = UI.drawScrap(ctx, 326, ty, W, H);
      let yy = r.iy + 1;
      TYPE.draw(ctx, c.name + ' \u2014 good at', r.ix, yy, 14, TIP.ink, { display: true }); yy += 23;
      for (const l of dlines) { TYPE.draw(ctx, l, r.ix, yy, 13, TIP.body, { italic: true }); yy += 15; }
      yy += 6;
      for (const l of mlines) { TYPE.draw(ctx, l, r.ix, yy, 12, ranked.length ? TIP.stat : TIP.faint); yy += 14; }
    }

    // ---- command buttons under the crew rail (combat: big Pause/Stations; underway: station controls) ----
    if (b) for (const a of this.hdActions(b)) this.hdBigBtn(ctx, a, b);

    // ---- enemy box (combat) / Damage Control (underway) ----
    if (deck) {
      panel(1480, 92, 420, 200, 'Damage Control', COL.woodfr);
      const ex = 1494, eR = ex + 386, mw = 150, ship = b.p;
      const hfrac = ship.hull / ship.hullMax;
      TYPE.draw(ctx, 'Hull', ex, 150, 19, COL.inkmd, { baseline: 'middle' });
      bar(eR - mw, 142, mw, 16, hfrac, Game.hullBarColor(hfrac));
      TYPE.drawRight(ctx, ship.hull + '/' + ship.hullMax, eR, 150, 16, COL.inkdk, { baseline: 'middle' });
      const fires = ship.totalFireTiles(), leaks = ship.rooms.filter(r => r.leak).length, wet = ship.rooms.filter(r => r.water > 0.5).length;
      let wy = 190;
      const haz = (label, n, col) => { TYPE.draw(ctx, label, ex, wy + 8, 19, col, { baseline: 'middle' }); TYPE.drawRight(ctx, '×' + n, eR, wy + 8, 19, col, { baseline: 'middle' }); wy += 28; };
      if (fires) haz('Fire', fires, Math.floor(b.time * 3) % 2 ? COL.red : COL.orange);
      if (leaks) haz('Breach', leaks, '#2b5a7a'); // R14b: dark sea-blue reads on parchment (was pale steelblue)
      if (wet) haz('Flooding', wet, COL.steelblue);
      if (!fires && !leaks && !wet) TYPE.draw(ctx, 'All quiet — the ship is sound.', ex, wy + 8, 17, COL.inkmd, { italic: true, baseline: 'middle' });
    } else {
    // everything shares one right edge (eR) so the hull bar and the weapon charge meters line up flush.
    const ex = 1494, eR = ex + 386, mw = 150;
    const wn = b ? b.e.weapons.filter(Boolean).length : 0;
    const sysList = b ? b.enemySysList() : [];
    const sysHidden = b ? b.enemyInteriorHidden() : true;      // Watch gates the readout
    const sysDetail = b && b.p.sysLv.lookout >= 2;             // maxed Watch -> full power detail
    const perRow = 6, sysTop = 198 + wn * 26 + 10;
    const sysRows = sysHidden ? 1 : Math.max(1, Math.ceil(sysList.length / perRow));
    const sysBlockH = 20 + sysRows * (sysDetail ? 46 : 38);
    const panelH = Math.max(200, (sysTop - 92) + sysBlockH + 8);
    panel(1480, 92, 420, panelH, b ? b.e.name : 'ENEMY', COL.dkred);
    if (b) {
      // hull: short bar, flush-right to eR (no redundant X/X readout)
      TYPE.draw(ctx, 'Hull', ex, 150, 19, COL.inkmd, { baseline: 'middle' });
      bar(eR - mw, 142, mw, 16, b.e.hull / b.e.hullMax, Game.hullBarColor(b.e.hull / b.e.hullMax));
      // wards: pip row, also flush-right
      TYPE.draw(ctx, 'Wards', ex, 178, 19, COL.inkmd, { baseline: 'middle' });
      pips(eR - mw, 171, b.e.wardMax() || 0, b.e.wards.layers, 14, COL.magicvi, '#3a2d52');
      let wy = 198;
      b.e.weapons.forEach((w) => {
        if (!w) return; const wd = DATA.WEAPONS[w.key]; if (!wd) return;
        TYPE.draw(ctx, wd.name, ex, wy + 8, 19, COL.inkdk, { maxWidth: eR - mw - ex - 8, fit: 'ellipsis', baseline: 'middle' });
        segbar(eR - mw, wy + 2, mw, 13, b.displayChargeFrac(w, wd), b.weaponReady(w, wd) ? COL.green : COL.brass, 6);
        wy += 26;
      });
      // ---- enemy SYSTEMS readout (the payoff for upgrading Watch) ----
      ctx.fillStyle = COL.brassdk; ctx.fillRect(ex, sysTop - 4, eR - ex, 1);
      TYPE.draw(ctx, 'SYSTEMS', ex, sysTop, 13, COL.inkmd, { display: true });
      if (sysHidden) {
        TYPE.draw(ctx, b.e.veilT > 0 ? 'Lost in her fog — can’t scout her decks.' : 'Unknown — man the Lookout to scout her decks.',
          ex, sysTop + 18, 13, COL.inkfade, { italic: true, maxWidth: eR - ex });
      } else {
        const cw = (eR - ex) / perRow, rowH = sysDetail ? 46 : 38, isz = 28;
        sysList.forEach((k, i) => {
          const cx = ex + (i % perRow) * cw + cw / 2, cyy = sysTop + 20 + Math.floor(i / perRow) * rowH;
          const r = b.e.roomByKey(k), sub = DATA.SYS_SUB.includes(k);
          const eff = b.e.sysEff(k), pow = b.e.powered(k);
          const offline = !!(r && r.dmg > 0 && eff === 0), ion = !!(r && r.ion > 0);
          const col = offline ? '#ff2e2e' : ion ? COL.ltblue : (r && r.dmg > 0) ? COL.orange : (pow > 0 || sub) ? COL.brasshi : COL.inkfade;
          drawSysSym(ctx, k, cx - isz / 2, cyy, isz, col);
          if (offline) { ctx.strokeStyle = '#ff2e2e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - isz / 2 + 2, cyy + 2); ctx.lineTo(cx + isz / 2 - 2, cyy + isz - 2); ctx.stroke(); ctx.lineWidth = 1; } // slash a dead system
          if (sysDetail && !sub) { const mx2 = b.e.sysLv[k] || 0; pips(cx - (mx2 * 5) / 2, cyy + isz + 1, mx2, pow, 4, col, '#3a2d52'); }
          // (#2) state BADGE — a word, not just colour, so "did I hurt them?" reads at a glance
          const dmgd = !!(r && r.dmg > 0);
          const badge = offline ? 'OFF' : ion ? 'JAM' : dmgd ? 'DMG' : null;
          if (badge) {
            const bc = offline ? '#ff2e2e' : ion ? COL.ltblue : COL.orange;
            const bw = Math.round(TYPE.width(ctx, badge, 11, { display: true }) + 8), bh = 15;
            const bx = Math.round(cx + isz / 2 - bw + 6), by = Math.round(cyy - 5);
            ctx.fillStyle = 'rgba(26,16,8,0.92)'; ctx.fillRect(bx, by, bw, bh);
            ctx.strokeStyle = bc; ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
            TYPE.draw(ctx, badge, bx + 4, by + bh / 2, 11, bc, { display: true, baseline: 'middle' });
          }
          // (#1) hover tooltip — names the system + state (+ power at maxed Watch) so the row teaches itself
          if (Game.mouse.x >= cx - isz / 2 && Game.mouse.x < cx + isz / 2 && Game.mouse.y >= cyy && Game.mouse.y < cyy + isz) {
            Game.hot = true;
            const sd = DATA.SYSTEMS[k], tl = [{ t: sd ? sd.name : k, c: TIP.ink }];
            if (offline) tl.push({ t: 'OFFLINE — knocked out', c: TIP.danger });
            else if (ion) tl.push({ t: 'Lightning-jammed — disabled', c: TIP.action });
            else if (dmgd) tl.push({ t: 'Damaged', c: TIP.danger });
            if (sub) tl.push({ t: 'Subsystem — always on', c: TIP.faint });
            else if (sysDetail) tl.push({ t: 'Power ' + pow + '/' + (b.e.sysLv[k] || 0), c: pow > 0 ? TIP.action : TIP.faint });
            if (b.e.mannedBy(k, b)) tl.push({ t: 'Manned', c: TIP.action });
            if (sd && sd.desc) tl.push({ t: sd.desc, c: TIP.body });
            hdTip = { lines: tl, ax: Game.mouse.x, ay: Game.mouse.y };
          }
        });
      }
    }
    } // end enemy-box / Damage-Control branch

    const L = this.hdBottom();

    // (no bottom "tray" frame: the chrome background is already unframed parchment, so the wood
    //  panels sit directly on parchment and the gutters between them read as parchment.)
    // ---- ship systems (our 12): name on top, VERTICAL mana-pip stack above the icon, icon on the bottom ----
    panel(L.sys.x, L.sys.y, L.sys.w, L.sys.h, 'SHIP SYSTEMS', undefined, true);
    if (b) {
      const SYS = this.hdSysList().map(k => [k, this.HD_SYS_LBL[k][0], this.HD_SYS_LBL[k][1]]);
      const cw = L.sys.w / SYS.length, ICON = 44;
      const cardTop = L.sys.y + 48, cardH = L.sys.h - 54;
      // order top->bottom: POWER pips (or mana column) / ICON / NAME beneath the icon. Icons shrunk
      // and the whole stack nudged up so the name clears the bottom frame.
      // top inset (~12px) keeps the pip-stack top off the card border; a slightly shorter pip stack
      // (8px tall, 1px gap -> 8 pips = 72px) reclaims the room so the icon + name still clear the bottom.
      const pipW = 34, pipBase = cardTop + 84, iconY = cardTop + 88, nameY = cardTop + 138;
      SYS.forEach((s, i) => {
        const x = L.sys.x + i * cw, cm = x + cw / 2;
        card(x + 3, cardTop, cw - 6, cardH); // per-system parchment card
        if (Game.mouse.x >= x && Game.mouse.x < x + cw && Game.mouse.y >= cardTop && Game.mouse.y < cardTop + cardH) {
          Game.hot = true;
          ctx.fillStyle = 'rgba(255,240,200,0.12)'; ctx.fillRect(x + 3, cardTop, cw - 6, cardH);
          if (s[2] === 'o') hdTip = { lines: [{ t: 'Open mount', c: TIP.ink }, { t: 'Buy an advanced system at an anchorage.', c: TIP.body }], ax: Game.mouse.x, ay: Game.mouse.y };
          else { const sd = DATA.SYSTEMS[s[0]], lines = [{ t: sd ? sd.name : s[1], c: TIP.ink }]; if (sd && sd.desc) lines.push({ t: sd.desc, c: TIP.body });
            if (s[2] === 'm') lines.push({ t: 'Your mana pool — powers every system', c: TIP.action });
            else if (s[2] === 's') lines.push({ t: 'Always on — no mana needed', c: TIP.action });
            else { const on = b.p.powered(s[0]); lines.push({ t: on > 0 ? ('Powered (' + on + ' bars)') : 'No power', c: on > 0 ? TIP.action : TIP.danger }, { t: 'left-click +mana · right-click −mana', c: TIP.faint });
              const hActs = this.hdSysActions(b, s[0]); if (hActs.length) lines.push({ t: hActs.map(a => '“' + a.label.replace('…', '') + '”').join(' / ') + ' button(s) atop this card', c: TIP.action }); }
            hdTip = { lines, ax: Game.mouse.x, ay: Game.mouse.y }; }
        }
        if (s[2] === 'o') { // vacant mount — a deliberate dashed "empty berth", not a hole
          const my = cardTop + cardH / 2;
          ctx.save();
          ctx.strokeStyle = 'rgba(90,67,34,0.45)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
          ctx.strokeRect(x + 12, cardTop + 14, cw - 24, cardH - 28); ctx.setLineDash([]);
          ctx.globalAlpha = 0.85;
          TYPE.drawCentered(ctx, '+', cm, my - 30, 30, COL.inkfade, { display: true });
          TYPE.drawCentered(ctx, 'Open', cm, my, 17, COL.inkfade, { italic: true });
          TYPE.drawCentered(ctx, 'mount', cm, my + 18, 12, COL.inkfade, { italic: true });
          ctx.restore();
          return;
        }
        // POWER in the top region: pips, or the Hearthstone mana column (glowing blue)
        if (s[2] === 'm') {
          TYPE.drawCentered(ctx, b.p.effMana() + '/' + b.p.manaMax, cm, cardTop + 16, 14, COL.ltblue);
          const gTop = cardTop + 34, gh = pipBase - gTop;
          ctx.fillStyle = '#1c2740'; ctx.fillRect(Math.round(cm - 11), gTop, 22, gh);
          const f = b.p.effMana() / Math.max(1, b.p.manaMax);
          ctx.fillStyle = COL.ltblue; ctx.fillRect(Math.round(cm - 11), gTop + gh * (1 - f), 22, gh * f);
        } else {
          const owned = Math.min(b.p.sysLv[s[0]] || 0, 8), on = b.p.powered(s[0]);
          pipsV(cm, pipBase, owned, on, pipW, 8, 1, s[2] === 's' ? COL.teal : '#9a6c2c', '#4a3a22');
        }
        drawSysSym(ctx, s[0], cm - ICON / 2, iconY, ICON, s[2] === 's' ? COL.teal : COL.inkdk); // icon
        TYPE.drawCentered(ctx, s[1], cm, nameY, TYPE.fitSize(ctx, s[1], cw - 4, 18), COL.inkdk); // name BENEATH the icon
        // advanced systems get pressable ACTIVATE button(s) at the top of the card (above the pips);
        // the Brine Gate stacks Board + Recall. A dark wipe + countdown shows the system cooldown.
        this.hdSysActions(b, s[0]).forEach((sAct, si) => {
          const r = this.hdSysBtnRect(L, i, SYS.length, si);
          // a KIT recess button (hover / press / disabled+reason); the glyph, label and cooldown wipe are ours
          const dis = !sAct.ready && !sAct.live;
          const tip = [{ t: sAct.label.replace('…', ''), c: TIP.ink }]; if (sAct.tip) tip.push({ t: sAct.tip, c: TIP.body });
          const res = KIT.button(ctx, 'combat.sys.' + s[0] + '.' + si, r, '', {
            variant: 'recess', live: sAct.live, disabled: dis, reason: sAct.reason, sound: sAct.snd || false, tip,
            onClick: sAct.fn, onDenied: sAct.fn, // the try* command logs the exact reason it can't fire
          });
          const dy = res.pressed ? 1.5 : 0, mid = r.y + r.h / 2 + dy;
          // icon glyphs glow mythril-teal (pops off the brown paper); charged abilities go gold while live; text stays brass.
          const gcol = sAct.live ? COL.gold : !dis ? (sAct.icon ? COL.magiccy : (res.hover ? COL.paperhi : COL.brasshi)) : '#7a6b48';
          if (sAct.cd > 0) { // recharging: receding dark wipe + the seconds remaining
            const f = sAct.cdMax > 0 ? Math.min(1, sAct.cd / sAct.cdMax) : 1;
            ctx.fillStyle = 'rgba(6,4,2,0.55)'; ctx.fillRect(r.x, r.y + dy, r.w, r.h * f);
            KIT.text(ctx, Math.ceil(sAct.cd) + 's', { x: r.x, y: r.y + dy, w: r.w, h: r.h }, { size: 16, display: true, align: 'center', color: '#e7d9b2', shadow: COL.black, shadowDx: 1, shadowDy: 1 });
          } else if (sAct.icon) {
            // glyph AND its word (Greg: no cryptic UI — a bare bolt/heart/door doesn't say what it does)
            const gs = Math.min(r.h - 8, 15);
            this.drawGlyph(ctx, sAct.icon, r.x + 4 + gs / 2, mid, gs, gcol);
            KIT.text(ctx, sAct.label.replace('…', ''), { x: r.x + gs + 6, y: r.y + dy, w: r.w - gs - 8, h: r.h }, { size: 15, display: true, align: 'center', color: dis ? '#7a6b48' : '#ecdcb6', minSize: 10, shadow: COL.black, shadowDx: 1, shadowDy: 1 });
          } else {
            KIT.text(ctx, sAct.label, { x: r.x, y: r.y + dy, w: r.w, h: r.h }, { size: 16, display: true, align: 'center', padX: 4, color: gcol, shadow: COL.black, shadowDx: 1, shadowDy: 1 });
          }
          if (sAct.live) { ctx.strokeStyle = COL.gold; ctx.lineWidth = 1.5; ctx.strokeRect(r.x + 1, r.y + 1 + dy, r.w - 2, r.h - 2); ctx.lineWidth = 1; }
        });
      });
      TYPE.drawRight(ctx, 'left-click +mana  ·  right-click −mana', L.sys.x + L.sys.w - 8, L.sys.y + 10, 15, '#ecdcb6', { italic: true, shadow: 'rgba(16,9,3,0.8)', shadowDx: 1, shadowDy: 1 });
    }

    // ---- our weapons (bigger icons, half-width charge bar) ----
    // a charged, armed gun with no target is "asking" to be aimed -> pulsing gold glow (wordless cue #1)
    let hdAimSrc = null;
    panel(L.wpn.x, L.wpn.y, L.wpn.w, L.wpn.h, 'WEAPONS', undefined, true);
    if (b) {
      const rx = L.wpn.x + 10, rw = L.wpn.w - 20, RH = 44, pulse = 0.5 + 0.5 * Math.sin(b.time * 5); let wy = L.wpn.y + 50;
      // power budget (greedy, in slot order) so a gun that can't be powered reads as NO MANA
      // instead of a silently-frozen bar — same status grammar as the classic HUD.
      const wepBars = b.p.powered('weapons'); let usedBars = 0;
      b.p.weapons.forEach((w, i) => { if (!w) return; const wd = DATA.WEAPONS[w.key]; if (!wd) return;
        const hasPower = w.on && usedBars + wd.power <= wepBars;
        if (hasPower) usedBars += wd.power;
        const needsRune = (wd.type === 'missile' || wd.type === 'bomb') && !wd.noRune;
        const outOfRune = needsRune && (Game.run.runeshot || 0) <= 0;
        const needsAim = hasPower && b.weaponReady(w, wd) && w.target < 0 && !outOfRune;
        // each gun row is a KIT control 'combat.wpn.<i>': left-click arms it for targeting, right-click powers it
        // on/off (read-only while underway). The drawn card rect IS the hit rect.
        const wr = { x: rx, y: wy, w: rw, h: RH - 4 }, wid = 'combat.wpn.' + i;
        if (!deck) KIT.reg(wid, wr, { sound: false, onClick: () => { this._beamAnchor = null; b.selectWeapon(i); }, onRight: () => b.toggleWeapon(i) });
        const hovered = KIT.hovered(wid, wr), wprs = !deck && KIT.pressed(wid, wr);
        if (hovered) { Game.hot = !deck; hdTip = { lines: [{ t: wd.name, c: TIP.ink }, { t: b.weaponTip(i) || '', c: TIP.action }].concat(deck ? [] : [{ t: 'left-click to aim  ·  right-click to power on/off', c: TIP.faint }]), ax: Game.mouse.x, ay: Game.mouse.y }; }
        // parchment card first, then a translucent state tint on top (selected -> brass; hover -> darker)
        card(rx, wy, rw, RH - 4); // parchment card per weapon (floats on the panel's wood backing)
        ctx.fillStyle = b.selWeapon === i ? 'rgba(202,162,74,0.5)' : (w.on ? 'rgba(202,162,74,0.16)' : 'rgba(90,67,34,0.06)');
        ctx.fillRect(rx + 1, wy + 1, rw - 2, RH - 6);
        if (hovered && !deck) { ctx.fillStyle = wprs ? 'rgba(20,12,4,0.2)' : 'rgba(20,12,4,0.12)'; ctx.fillRect(rx + 1, wy + 1, rw - 2, RH - 6); }
        if (needsAim) {
          ctx.save(); ctx.strokeStyle = COL.gold; ctx.lineWidth = 2.5;
          ctx.shadowColor = COL.gold; ctx.shadowBlur = 6 + 12 * pulse; ctx.globalAlpha = 0.55 + 0.45 * pulse;
          ctx.strokeRect(rx + 1.5, wy + 1.5, rw - 3, RH - 7); ctx.restore();
        }
        if (b.selWeapon === i) { ctx.strokeStyle = COL.gold; ctx.strokeRect(rx + 0.5, wy + 0.5, rw - 1, RH - 5); }
        ctx.globalAlpha = w.on ? 1 : 0.55;
        if (!SPR.drawArt(ctx, 'weapon_' + w.key, rx + 6, wy + 5, 60, 30)) { ctx.fillStyle = COL.woodfr; ctx.fillRect(rx + 7, wy + 6, 52, 26); }
        ctx.globalAlpha = 1;
        TYPE.draw(ctx, wd.name, rx + 78, wy + 15, 18, w.on ? COL.inkdk : COL.inkfade, { maxWidth: rw - 200, baseline: 'middle' });
        // mana-cost pips: lit blue when this gun is actually powered, grey when starved/off
        for (let bp = 0; bp < (wd.power || 1); bp++) { ctx.fillStyle = hasPower ? COL.blue : COL.parchdk; ctx.fillRect(rx + 78 + bp * 8, wy + 28, 6, 5); ctx.strokeStyle = COL.inkfade; ctx.strokeRect(rx + 78 + bp * 8 + 0.5, wy + 28.5, 5, 4); }
        // right side: a status word when it can't just charge, else the charge bar
        const barX = L.wpn.x + L.wpn.w - 110;
        let status = null, scol = COL.inkmd;
        if (!w.on) { status = 'OFF'; scol = COL.inkfade; }
        else if (!hasPower) { status = 'NO MANA'; scol = COL.dkred; }
        else if (outOfRune && b.weaponReady(w, wd)) { status = 'NO RUNE'; scol = COL.dkred; }
        else if (needsAim && Math.floor(b.time * 3) % 2) { status = 'AIM!'; scol = COL.golddk; }
        if (status) TYPE.draw(ctx, status, barX, wy + 20, TYPE.fitSize(ctx, status, 70, 15), scol, { baseline: 'middle', display: true });
        else {
          // ramp guns wind UP (reload faster each shot): bar fills to the CURRENT goal and runs
          // hotter (brass→gold→white) the more wound-up it is, so the speed-up reads on purpose.
          const ramp = b.rampLevel(w, wd); // wound-up ramp guns run hotter: brass -> gold -> orange
          const barCol = b.weaponReady(w, wd) ? COL.green : (ramp > 0.5 ? COL.orange : ramp > 0 ? COL.gold : COL.brass);
          segbar(barX, wy + 13, 65, 14, b.displayChargeFrac(w, wd), barCol, 6);
        }
        TYPE.draw(ctx, '' + (i + 1), L.wpn.x + L.wpn.w - 30, wy + 20, 19, COL.inkmd, { baseline: 'middle' });
        if (b.selWeapon === i) hdAimSrc = { x: L.wpn.x + L.wpn.w / 2, y: wy + RH / 2 };
        wy += RH; });
    }

    // ---- familiars ----
    panel(L.fam.x, L.fam.y, L.fam.w, L.fam.h, 'FAMILIARS', undefined, true);
    if (b) {
      const fams = run.familiars || [], awake = b.p.powered('shrine'), fx = L.fam.x + 12;
      // always show the 3 binding slots; empty ones read as capacity, not a void
      const slots = Math.max(3, fams.length);
      for (let i = 0; i < slots; i++) {
        const k = fams[i], fd = k ? DATA.FAMILIARS[k] : null;
        const top = L.fam.y + 50 + i * 44, mid = top + 20; // match the WEAPONS card height (40) + stride (44)
        card(L.fam.x + 8, top, L.fam.w - 16, 40); // bordered parchment card per slot
        if (!k) { TYPE.drawCentered(ctx, 'empty vessel', L.fam.x + L.fam.w / 2, mid, 14, COL.inkfade, { italic: true, baseline: 'middle' }); continue; }
        if (!SPR.drawArt(ctx, 'icon_fam_' + k, fx, top + 6, 28, 28)) { ctx.fillStyle = i < awake ? COL.magiccy : '#6a6256'; ctx.fillRect(fx + 4, top + 12, 18, 18); }
        ctx.globalAlpha = i < awake ? 1 : 0.5;
        TYPE.draw(ctx, fd ? fd.name : k, fx + 40, mid, 18, i < awake ? COL.inkdk : COL.inkfade, { maxWidth: L.fam.w - 160, baseline: 'middle' }); ctx.globalAlpha = 1;
        // right side: onboard familiars just read awake/asleep; orbiting ones get a deploy state.
        // 'deploy'/'rebind' draw a pressable parchment button with a candle (it costs 1 to launch).
        const st = b.famDeployState(k), rightX = L.fam.x + L.fam.w - 18;
        if (st === 'deploy' || st === 'rebind') {
          // a KIT recess button 'combat.fam.<i>' — the hit rect is exactly the drawn button (this.famBtnRect)
          const fr = this.famBtnRect(L, i), fid = 'combat.fam.' + i;
          const res = KIT.button(ctx, fid, fr, '', { variant: 'recess', sound: false, disabled: deck, reason: 'Familiars are launched in battle.',
            onClick: () => b.deployFamiliar(k),
            tip: [{ t: (st === 'rebind' ? 'Re-bind ' : 'Deploy ') + (fd ? fd.name : k), c: TIP.ink }, { t: 'Burns 1 Seance Candle (' + (run.candles || 0) + ' left).', c: TIP.body }] });
          const dy = res.pressed ? 1.5 : 0;
          KIT.text(ctx, st === 'rebind' ? 'RE-BIND' : 'DEPLOY', { x: fr.x + 5, y: fr.y + dy, w: fr.w - 24, h: fr.h }, { size: 13, display: true, color: res.hover ? COL.gold : COL.brasshi, shadow: COL.black, shadowDx: 1, shadowDy: 1 });
          UI.drawRes(ctx, 'candle', fr.x + fr.w - 15, fr.y + 5 + dy, 12);
        } else {
          const map = { active: ['orbiting', COL.green], cooldown: ['reforming', COL.inkfade], nofund: ['no candle', COL.dkred], asleep: ['asleep', COL.inkmd] };
          const m = map[st] || [i < awake ? 'awake' : 'asleep', COL.inkmd];
          TYPE.drawRight(ctx, m[0], rightX, mid, 14, m[1], { italic: true, baseline: 'middle' });
        }
      }
      // U17: owned familiars stay "asleep" with no reason given when no Binding Shrine is powered —
      // say WHY (project rule: player-visible failures must explain themselves). Combat view only.
      this._famHint = !deck && fams.length > 0 && awake === 0;
      if (this._famHint) {
        KIT.text(ctx, 'Power a Binding Shrine to wake them.', { x: L.fam.x + 12, y: L.fam.y + L.fam.h - 32, w: L.fam.w - 24, h: 22 }, { size: 16, italic: true, align: 'center', color: KIT.C.onWoodMuted, shadow: 'rgba(16,9,3,0.85)', shadowDx: 1, shadowDy: 1, fit: 'shrink' }); // light on the wood (ink was invisible)
      }
    }

    // ---- wordless cue #2: a selected gun streams chevrons toward the enemy ship ("aim me there") ----
    if (b && b.selWeapon >= 0 && hdAimSrc && b.state === 'fight') {
      const sc = this.hdScale();
      const tx = 330 + (b.eX() + b.e.rw / 2) * sc, ty = 120 + (b.eY() + b.e.rh / 2) * sc;
      const dx = tx - hdAimSrc.x, dy = ty - hdAimSrc.y, len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len, ang = Math.atan2(dy, dx);
      ctx.save();
      // faint dashed guide line from the gun to the target (reads as "this gun -> there")
      ctx.strokeStyle = 'rgba(240,192,80,0.22)'; ctx.lineWidth = 2; ctx.setLineDash([6, 9]);
      ctx.beginPath(); ctx.moveTo(hdAimSrc.x, hdAimSrc.y); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
      // FILLED arrowheads marching toward the target — unambiguous direction (open chevrons read as stray "7"s)
      ctx.lineJoin = 'round'; ctx.strokeStyle = COL.black; ctx.lineWidth = 1.5;
      for (let k = 0; k < 5; k++) {
        const ph = ((b.time * 0.5 + k / 5) % 1);
        const d = 30 + ph * (len - 60);
        const cx = hdAimSrc.x + ux * d, cy = hdAimSrc.y + uy * d;
        ctx.globalAlpha = 0.9 * Math.sin(ph * Math.PI);
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
        ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-10, -9); ctx.lineTo(-5, 0); ctx.lineTo(-10, 9); ctx.closePath();
        ctx.fillStyle = COL.gold; ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      ctx.globalAlpha = 1; ctx.restore();
    }
    // the dark-wood frame + brass-knot corners as the TOPMOST chrome layer (popups draw after this)
    KIT.flushFrames(ctx);
    TYPE.draw(ctx, deck ? 'Click a sailor, then a room  ·  right-click a hull room to flood  ·  Esc returns to the chart' : 'Space pauses  ·  Q quits', 24, 1056, 15, COL.brasshi, { italic: true });
    // --- the hovered scrap tooltip, painted on top of everything (after a short dwell). A hovered KIT
    // control's own tip (e.g. a disabled button's reason) wins over the panel-level hover tip beneath it. ---
    const modal = (b && b.surrenderOffer && !deck) || this.quitOpen();
    if (!modal && hdTip && hdTip.lines && hdTip.lines.length && !KIT._tip) KIT.tip(hdTip.lines, hdTip.ax, hdTip.ay);
    // modal dialogs: their scrim dims the finished chrome (frames already flushed) and blocks it
    if (b && b.surrenderOffer && !deck) { this.drawHdSurrender(ctx); KIT.flushFrames(ctx); }
    if (this.quitOpen()) { this.drawQuitMenu(ctx); KIT.flushFrames(ctx); }
    KIT.flushTip(ctx, 1920, 1080);
  },
  key(k) {
    if (k === 'q' || k === 'Q') { this._quitMenu = !this._quitMenu; return; }
    if (this._quitMenu) { if (k === 'Escape' || k === 'Enter') this._quitMenu = false; return; }
    if (Game.battle) Game.battle.key(k);
  },
  // ---- quit-to-title menu (Q / the gear). A KIT modal; no mid-combat save (the run is already saved at
  // the last node, so a resume re-approaches that node). Underway (deck mode) it is keyed to that deck view
  // so a menu left open never resurfaces on a later visit. ----
  quitOpen() { return !!this._quitMenu && (this._deckV ? this._quitMenu === this._deckV : this._quitMenu === true); },
  quitRect() { return { x: 660, y: 380, w: 600, h: 300 }; },
  quitToTitle() {
    // drop the battle on quit: a leaked Game.battle disables Game.checkDoom (it early-returns
    // mid-battle) and points hdSysList at a stale ship after Continue/load. (R3, 2026-07-02)
    this._quitMenu = false; this._deckV = null; Game.battle = null;
    if (AUDIO.stopMusic) AUDIO.stopMusic();
    Game.setScreen('title');
  },
  drawQuitMenu(ctx) {
    const r = this.quitRect(), resume = () => { this._quitMenu = false; };
    KIT.scrim(ctx, 1920, 1080, 0.62);
    KIT.reg('combat.quit.away', { x: 0, y: 0, w: 1920, h: 1080 }, { onClick: resume, sound: 'back' }); // click away = resume
    const c = KIT.panel(ctx, r, { title: 'Quit to title?', wood: true });
    KIT.card(ctx, { x: c.x, y: c.y, w: c.w, h: 92 });
    KIT.text(ctx, 'Your voyage is saved at your last port.', { x: c.x + 20, y: c.y + 10, w: c.w - 40, h: 40 }, { size: 22, italic: true, align: 'center', color: COL.inkmd });
    KIT.text(ctx, this._deckV ? 'Fires and floods keep their state.' : 'This fight will begin again when you return.', { x: c.x + 20, y: c.y + 46, w: c.w - 40, h: 32 }, { size: 18, italic: true, align: 'center', color: COL.inkfade });
    const by = r.y + r.h - 96, bw = 236;
    KIT.button(ctx, 'combat.quit.resume', { x: r.x + 48, y: by, w: bw, h: 64 }, 'Resume', { onClick: resume, size: 24, tip: [{ t: 'Back to the ' + (this._deckV ? 'decks' : 'fight'), c: TIP.ink }, { t: 'Escape or Q also resumes.', c: TIP.body }] });
    KIT.button(ctx, 'combat.quit.title', { x: r.x + r.w - 48 - bw, y: by, w: bw, h: 64 }, 'Quit to Title', { variant: 'danger', onClick: () => this.quitToTitle(), sound: 'back', size: 24 });
  },
};

// ============ TITLE ============
// HD title (1920x1080, Stage 2c): the full-bleed painting under soft gradient scrims, the engraved title,
// and a framed wood panel holding a refined KIT button column. New Voyage swaps the column for the two
// difficulties and opens a parchment Playtest Cheats panel beside it. Every control is a KIT id ('title.*').
const TitleScreen = {
  designW: 1920, designH: 1080,
  enter() {
    this.t = 0;
    AUDIO.play('title');
    this.confirmNew = false;
    this.cheatUranium = false;
    this.cheatShards = false;
    this.cheatTeleport = false;
    this.cheatMaxShip = false;
    this.cheatSysSlots = new Array(DATA.OPEN_MOUNTS).fill(null); // chosen advanced systems per mount
    // the saved voyage's sea + day, read once (not per frame) for the Continue button's sub-line
    const sv = Game.loadJSON(SAVE_KEY);
    this._saveMeta = sv && sv.run ? { region: sv.run.region || 0, day: sv.run.day || 1 } : null;
  },
  update(dt) { this.t += dt; },
  click() {}, // every control is a KIT registration
  // cycle a mount slot to the next option (none + each advanced system), skipping a system
  // already chosen in another slot so the two mounts never duplicate.
  cycleSysSlot(i) {
    if (!this.cheatSysSlots) this.cheatSysSlots = new Array(DATA.OPEN_MOUNTS).fill(null);
    const opts = [null].concat(DATA.SYS_ADVANCED);
    let idx = opts.indexOf(this.cheatSysSlots[i]);
    for (let n = 0; n < opts.length; n++) {
      idx = (idx + 1) % opts.length;
      const cand = opts[idx];
      if (cand === null || !this.cheatSysSlots.some((s, j) => j !== i && s === cand)) { this.cheatSysSlots[i] = cand; return; }
    }
  },
  cheats() { return { uranium: this.cheatUranium, shards: this.cheatShards, teleport: this.cheatTeleport, maxship: this.cheatMaxShip, systems: (this.cheatSysSlots || []).filter(Boolean) }; },
  // the menu column: {id, label, sub, fn, tip, half}. 'half' items share the last row (Sound / Display).
  items() {
    const arr = [];
    if (this.confirmNew) {
      arr.push({ id: 'title.easy', label: 'Easy Seas', sub: 'A slower Armada and richer prizes', fn: () => { Game.newGame('easy', this.cheats()); Game.setScreen('intro'); } });
      arr.push({ id: 'title.captain', label: 'Captain’s Seas', sub: 'The voyage as it was meant', fn: () => { Game.newGame('captain', this.cheats()); Game.setScreen('intro'); } });
      arr.push({ id: 'title.back', label: 'Back', fn: () => { this.confirmNew = false; }, sound: 'back' });
      return arr;
    }
    const m = this._saveMeta;
    arr.push({ id: 'title.new', label: 'New Voyage', fn: () => { this.confirmNew = true; } });
    if (Game.hasSave()) arr.push({ id: 'title.continue', label: 'Continue', sub: m ? 'Sea ' + UI.regionLabel(m.region) + '  ·  Day ' + m.day : null, fn: () => { if (Game.load()) Game.setScreen('map'); } });
    arr.push({ id: 'title.lore', label: 'Lore', fn: () => Game.setScreen('lore') });
    arr.push({ id: 'title.music', pair: true, label: 'Music Room', fn: () => Game.setScreen('jukebox') });
    arr.push({ id: 'title.shipyard', pair: true, label: 'Shipyard', fn: () => Game.setScreen('shipyard'), tip: [{ t: 'Shipyard', c: TIP.ink }, { t: 'Test room: every crew animation, weapon, hull and familiar on demand.', c: TIP.body }] });
    arr.push({ id: 'title.help', label: 'How to Play', fn: () => Game.setScreen('help') });
    arr.push({ id: 'title.sound', half: true, label: AUDIO.muted ? 'Sound: Off' : 'Sound: On', fn: () => Game.toggleMute(), tip: [{ t: 'Sound', c: TIP.ink }, { t: 'M toggles it anywhere.', c: TIP.body }] });
    // display: the canvas always fits the window sharply (DPR backing store); this toggles FULLSCREEN
    const fs = typeof document !== 'undefined' && !!document.fullscreenElement;
    arr.push({ id: 'title.display', half: true, label: fs ? 'Fullscreen' : 'Windowed', fn: () => {
      const d = typeof document !== 'undefined' ? document : null;
      try { if (d && d.fullscreenElement) d.exitFullscreen(); else if (d && d.documentElement && d.documentElement.requestFullscreen) d.documentElement.requestFullscreen(); } catch (e) {}
    }, tip: [{ t: 'Display', c: TIP.ink }, { t: 'Switch between a window and fullscreen.', c: TIP.body }] });
    return arr;
  },
  key(k) {
    if (k === 'Escape' && this.confirmNew) { this.confirmNew = false; AUDIO.sfx('back'); return; }
    if (k === 'Enter') this.items()[0].fn();
  },
  // layout: the menu panel (and, in New Voyage, the cheats panel beside it), centred as a pair
  MENU_W: 460, CHEAT_W: 480, GAP: 40, BTN_H: 64, BTN_SUBH: 76, BTN_GAP: 14,
  menuLayout() {
    const its = this.items(), pad = 28;
    let h = pad * 2 + (this.confirmNew ? 52 : 0); // New Voyage: a carved title band
    const full = its.filter(i => !i.half), half = its.filter(i => i.half);
    // 'pair' items share a row two-up (Music Room | Shipyard)
    for (let i = 0; i < full.length; i++) { const it = full[i]; if (it.pair && full[i - 1] && full[i - 1].pair && !full[i - 1]._row2) { it._row2 = true; continue; } it._row2 = false; h += (it.sub ? this.BTN_SUBH : this.BTN_H) + this.BTN_GAP; }
    if (half.length) h += 22 + 54 + this.BTN_GAP;
    h -= this.BTN_GAP;
    const pairW = this.confirmNew ? this.MENU_W + this.GAP + this.CHEAT_W : this.MENU_W;
    const x = Math.round(960 - pairW / 2), y = this.confirmNew ? 420 : 440;
    return { its, full, half, pad, panel: { x, y, w: this.MENU_W, h } };
  },
  render(ctx) {
    const W = 1920, H = 1080;
    if (!KIT.backdrop(ctx, 'title', W, H, { stops: [[0, 0.62], [0.30, 0.18], [0.5, 0.06], [0.78, 0.30], [1, 0.70]], vignette: 0.45 })) {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a2a52'); g.addColorStop(0.55, '#3a5a90'); g.addColorStop(0.56, COL.sea); g.addColorStop(1, COL.sealow);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    this.drawTitleText(ctx);
    const Lm = this.menuLayout(), P = Lm.panel;
    this.dropShadow(ctx, P);
    KIT.panel(ctx, P, { wood: true, title: this.confirmNew ? 'Choose Your Seas' : null });
    // the button column: parchment plaques seated on the wood, hover-lit, mouse-up activated
    let y = P.y + Lm.pad + (this.confirmNew ? 52 : 0);
    const bx = P.x + Lm.pad, bw = P.w - Lm.pad * 2;
    const plaque = (it, r, size) => {
      const res = KIT.button(ctx, it.id, r, it.label, { onClick: it.fn, frame: false, size, sub: it.sub || null, sound: it.sound, tip: it.tip });
      const dy = res.pressed ? 1.5 : 0; // a crisp ink keyline + inner rule so the plaque reads as inlaid
      ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(40,24,8,0.95)'; ctx.strokeRect(r.x + 0.75, r.y + 0.75 + dy, r.w - 1.5, r.h - 1.5);
      ctx.lineWidth = res.hover ? 2 : 1; ctx.strokeStyle = res.hover ? 'rgba(176,128,40,0.95)' : 'rgba(120,84,40,0.45)'; ctx.strokeRect(r.x + 4.5, r.y + 4.5 + dy, r.w - 9, r.h - 9);
      ctx.lineWidth = 1;
    };
    Lm.full.forEach((it, i) => {
      if (it._row2) return; // drawn with its pair
      const h = it.sub ? this.BTN_SUBH : this.BTN_H, nx = Lm.full[i + 1];
      if (it.pair && nx && nx._row2) {
        const hw = (bw - this.BTN_GAP) / 2;
        plaque(it, { x: bx, y, w: hw, h }, 24); plaque(nx, { x: bx + hw + this.BTN_GAP, y, w: hw, h }, 24);
      } else plaque(it, { x: bx, y, w: bw, h }, 26);
      y += h + this.BTN_GAP;
    });
    if (Lm.half.length) {
      KIT.ornRule(ctx, P.x + P.w / 2, y + 4, bw * 0.8, 'rgba(232,206,140,0.75)');
      y += 22;
      const hw = (bw - this.BTN_GAP) / 2;
      Lm.half.forEach((it, i) => plaque(it, { x: bx + i * (hw + this.BTN_GAP), y, w: hw, h: 54 }, 19));
    }
    if (this.confirmNew) this.drawCheats(ctx, { x: P.x + P.w + this.GAP, y: P.y, w: this.CHEAT_W });
    KIT.flushFrames(ctx);
    KIT.text(ctx, 'M mutes the sound   ·   Space pauses a battle', { x: 0, y: 1022, w: W, h: 40 }, { size: 20, italic: true, align: 'center', color: COL.paperhi, shadow: 'rgba(0,0,0,0.85)', shadowDx: 1.5, shadowDy: 1.5 });
    KIT.flushTip(ctx, W, H);
  },
  // the Playtest Cheats panel: four checkboxes + one cycler per open mount (all KIT controls)
  drawCheats(ctx, at) {
    const slots = this.cheatSysSlots || (this.cheatSysSlots = new Array(DATA.OPEN_MOUNTS).fill(null));
    const RH = 52, rows = 4 + slots.length, h = 52 + 20 + rows * RH + 70;
    this.dropShadow(ctx, { x: at.x, y: at.y, w: at.w, h });
    const c = KIT.panel(ctx, { x: at.x, y: at.y, w: at.w, h }, { title: 'Playtest Cheats' });
    let y = c.y + 4;
    const box = (id, on, label, flip, tip) => { KIT.checkbox(ctx, 'title.cheat.' + id, { x: c.x, y, w: c.w, h: RH - 6 }, label, on, { onClick: flip, tip: [{ t: label, c: TIP.ink }, { t: tip, c: TIP.body }] }); y += RH; };
    box('uranium', this.cheatUranium, 'One-shot EM Rail Gun', () => { this.cheatUranium = !this.cheatUranium; }, 'Start with a gun that sinks anything in one hit.');
    box('shards', this.cheatShards, '15,000 shards', () => { this.cheatShards = !this.cheatShards; }, 'Start rich.');
    box('teleport', this.cheatTeleport, 'Magic teleport', () => { this.cheatTeleport = !this.cheatTeleport; }, 'Sail to any island on the chart, not just linked ones.');
    box('maxship', this.cheatMaxShip, 'Fully upgraded ship', () => { this.cheatMaxShip = !this.cheatMaxShip; }, 'Every core system and subsystem at its maximum.');
    KIT.rule(ctx, c.x, y + 2, c.x + c.w, 0.35); y += 10;
    slots.forEach((key, i) => {
      const r = { x: c.x, y, w: c.w, h: RH - 8 }, name = key ? (DATA.SYSTEMS[key] ? DATA.SYSTEMS[key].name : key) : 'none';
      const res = KIT.button(ctx, 'title.mount.' + i, r, '', { variant: 'recess', onClick: () => this.cycleSysSlot(i),
        tip: [{ t: 'Mount ' + ['I', 'II', 'III', 'IV'][i], c: TIP.ink }, { t: 'Click to cycle the advanced system installed at the start.', c: TIP.body }] });
      const dy = res.pressed ? 1.5 : 0;
      KIT.text(ctx, 'Mount ' + ['I', 'II', 'III', 'IV'][i], { x: r.x + 14, y: r.y + dy, w: 130, h: r.h }, { size: 18, display: true, color: '#e8d6ae', shadow: 'rgba(16,9,3,0.85)', shadowDx: 1, shadowDy: 1 });
      KIT.text(ctx, name, { x: r.x + 140, y: r.y + dy, w: r.w - 190, h: r.h }, { size: 20, italic: !key, color: key ? '#f6ead0' : 'rgba(236,222,190,0.6)', fit: 'shrink', shadow: 'rgba(16,9,3,0.85)', shadowDx: 1, shadowDy: 1 });
      const mx = r.x + r.w - 26, my = r.y + r.h / 2 + dy; // "click to cycle" cue
      ctx.fillStyle = res.hover ? COL.gold : COL.brasshi; ctx.beginPath(); ctx.moveTo(mx - 6, my - 8); ctx.lineTo(mx + 5, my); ctx.lineTo(mx - 6, my + 8); ctx.closePath(); ctx.fill();
      y += RH;
    });
    KIT.text(ctx, 'Testing aids — leave them unticked for a true voyage.', { x: c.x, y: y + 2, w: c.w, h: 40 }, { size: 16, italic: true, color: COL.inkfade, align: 'center', fit: 'wrap', maxLines: 2 });
  },
  // a soft dark halo under a panel so it lifts off the painting
  dropShadow(ctx, r) {
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 36; ctx.shadowOffsetY = 10;
    ctx.fillStyle = 'rgba(20,12,4,0.9)'; ctx.fillRect(r.x + 6, r.y + 6, r.w - 12, r.h - 12); ctx.restore();
  },
  drawTitleText(ctx) {
    KIT.text(ctx, 'MYTHRIL TIDE', { x: 160, y: 90, w: 1600, h: 150 }, { size: 136, display: true, align: 'center', color: COL.mythril, shadow: 'rgba(6,4,2,0.9)', shadowDx: 4, shadowDy: 4 });
    KIT.ornRule(ctx, 960, 266, 760, 'rgba(240,214,150,0.9)');
    KIT.text(ctx, 'An Age of Exploration Saga', { x: 360, y: 282, w: 1200, h: 52 }, { size: 36, italic: true, align: 'center', color: COL.brasshi, shadow: 'rgba(6,4,2,0.9)', shadowDx: 2, shadowDy: 2 });
  },
};

// ============ INTRO ============
// HD (1920x1080, Stage 2c): the captain's desk painting under a gradient scrim, a framed vignette plate,
// the tale set in large italic serif, page dots, and KIT Skip / Continue buttons (a click anywhere also turns the page).
const IntroScreen = {
  designW: 1920, designH: 1080,
  enter() {
    this.page = 0;
    // last page = the day-one ship's log; wrapped at render time so it uses real serif metrics
    this.allPages = this.pages.concat([null]);
  },
  pages: [
    ['The Old World is mined hollow.', '', 'Every vein of mythril — the metallic crystal', 'that holds enchantment like a bottle holds rum —', 'was claimed by the Imperial Armada long ago.', '', 'Magic belongs to the Empire now.', 'You own a wooden ship and a debt.'],
    ['Then a dying navigator sold you a chart', 'for the price of a last drink.', '', 'It shows a route west across the uncharted sea', 'to a new world… and a city built of mythril.', '', 'The Armada knows you have it.', 'Their fleet left port an hour after you did.'],
    ['Your ship is the Dawnchaser.', 'No wards. No enchanted sails. No magic at all.', '', 'Between you and the city: seven seas full of', 'merfolk, djinn, storm elves, deep dwarves,', 'lizardfolk, sirens — and everything they sell.', '', 'Buy magic. Hire magic. Steal magic.', 'Outrun the Armada. Reach the city.', '', 'Good hunting, Captain.'],
  ],
  next() { this.page++; if (this.page >= this.allPages.length) Game.setScreen('map'); },
  click() { AUDIO.sfx('click'); this.next(); }, // anywhere off the buttons turns the page
  key(k) { if (k === ' ' || k === 'Enter') this.click(); if (k === 'Escape') { AUDIO.sfx('back'); Game.setScreen('map'); } },
  update() {},
  render(ctx) {
    const W = 1920, H = 1080;
    if (!KIT.backdrop(ctx, 'vig_desk', W, H, { stops: [[0, 0.30], [0.42, 0.42], [0.7, 0.62], [1, 0.78]], tint: '8,6,10', vignette: 0.55 })) { ctx.fillStyle = '#0c0906'; ctx.fillRect(0, 0, W, H); }
    // the framed vignette plate (dark matte + the ornate wood frame)
    const vg = ['armada', 'city', 'island', 'calm'][this.page] || 'island';
    const pr = { x: 600, y: 52, w: 720, h: 405 };
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
    ctx.fillStyle = '#15100a'; ctx.fillRect(pr.x - 10, pr.y - 10, pr.w + 20, pr.h + 20); ctx.restore();
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    if (!SPR.drawArt(ctx, 'vig_' + vg, pr.x, pr.y, pr.w, pr.h)) ctx.drawImage(SPR.vignette(vg), pr.x, pr.y, pr.w, pr.h);
    ctx.restore();
    ctx.strokeStyle = 'rgba(232,206,140,0.7)'; ctx.lineWidth = 1.5; ctx.strokeRect(pr.x - 3.5, pr.y - 3.5, pr.w + 7, pr.h + 7); ctx.lineWidth = 1;
    KIT.frame({ x: pr.x - 10, y: pr.y - 10, w: pr.w + 20, h: pr.h + 20 });
    // the tale (blank lines = a paragraph gap); the log page wraps the region's day-one entry
    const isLog = !this.allPages[this.page];
    let lines = this.allPages[this.page];
    if (isLog) lines = TYPE.wrap(ctx, DATA.REGION_LOGS[0], 1100, 30, { italic: true });
    let y = 506;
    if (isLog) { KIT.text(ctx, 'Ship’s Log, Day One', { x: 0, y, w: W, h: 50 }, { size: 34, display: true, align: 'center', color: COL.brasshi, shadow: 'rgba(0,0,0,0.9)', shadowDx: 2, shadowDy: 2 }); KIT.ornRule(ctx, 960, y + 64, 520, 'rgba(232,206,140,0.8)'); y += 92; }
    for (const line of lines) {
      if (line === '') { y += 16; continue; }
      KIT.text(ctx, line, { x: 160, y, w: W - 320, h: 40 }, { size: 30, italic: true, align: 'center', color: /mythril|dawnchaser/i.test(line) ? COL.mythril : COL.paperhi, shadow: 'rgba(0,0,0,0.9)', shadowDx: 2, shadowDy: 2 });
      y += 40;
    }
    // page dots + Skip / Continue
    const N = this.allPages.length, dx0 = 960 - (N * 22) / 2;
    for (let i = 0; i < N; i++) {
      ctx.beginPath(); ctx.arc(dx0 + i * 22 + 11, 1020, i === this.page ? 7 : 5, 0, 7);
      ctx.fillStyle = i === this.page ? COL.brasshi : 'rgba(232,206,140,0.35)'; ctx.fill();
    }
    const last = this.page >= N - 1;
    KIT.button(ctx, 'intro.skip', { x: 48, y: 984, w: 220, h: 68 }, 'Skip', { onClick: () => Game.setScreen('map'), sound: 'back', size: 24,
      tip: [{ t: 'Skip the tale', c: TIP.ink }, { t: 'Straight to the chart (Escape).', c: TIP.body }] });
    KIT.button(ctx, 'intro.next', { x: 1652, y: 984, w: 220, h: 68 }, last ? 'Set Sail' : 'Continue', { onClick: () => this.next(), size: 24 });
    KIT.flushFrames(ctx);
    KIT.flushTip(ctx, W, H);
  },
};

// ============ HELP ============
// HOW TO SAIL — a 7-page primer. Each page: a title, a subtitle, one real cropped
// screenshot (img) on the right, and 2-3 concept blocks (head + body) on the left.
// Rendered HD (1920x1080) in the combat screen's wood-frame / parchment-card chrome.
const HELP_PAGES = [
  {
    title: 'THE VOYAGE', sub: 'One run, eight seas, the Armada at your heels.', img: 'help_map',
    items: [
      { head: 'The Goal', text: 'Sail west across eight seas to the City of Mythril and sink its Warden. The Armada’s red tide chases you across every chart — linger and it swallows you.' },
      { head: 'Reading the Chart', text: 'Click any island joined to yours by a dotted route. Each is labelled: Hostile and Warship are battles, a Drifting Wreck is a gamble, Distress a call for help, Harbor a trader, Calm Water open sea, and Onward the way to the next sea. (Each sea dresses these in its own names.)' },
      { head: 'Watch the Threat', text: 'The threat bar tracks how close the Armada is behind you. Your day, your shards, and the Captain’s Log all live on the chart — and shop rumours hint at what waits ahead.' },
    ],
  },
  {
    title: 'YOUR SHIP & ITS MAGIC', sub: 'Mana is finite. Rationing it is the whole game.', img: 'help_systems',
    items: [
      { head: 'The Hearthstone', text: 'Your Mana Hearthstone holds a fixed pool of glowing bars. Every powered system draws from that pool — you can never run everything at once.' },
      { head: 'Powering Systems', text: 'Left-click a system to feed it a mana bar; right-click to pull one back. A damaged system must be repaired by crew before mana will bring it back online.' },
      { head: 'Core & Advanced', text: 'Five core systems are always installed. At anchorages you can buy up to two advanced systems — Binding Shrine, Portal, Fog Veil, Storm Conduit, Siren’s Song — into your open mounts.' },
    ],
  },
  {
    title: 'YOUR CREW', sub: 'Click a sailor, then a room. They do the rest.', img: 'help_crew',
    items: [
      { head: 'Give Orders', text: 'Click a sailor, then click a room. They man stations, repair damage, fight fires, patch leaks, and brawl with boarders. Press R to send all hands to battle stations.' },
      { head: 'Stations & Mastery', text: 'A manned station works harder. Each race has natural aptitudes, and sailors earn star-ranked mastery by doing the job — hover a sailor to read theirs.' },
      { head: 'Healing', text: 'Wounded crew recover in the Infirmary. In battle it needs mana to run; between fights, at sea, it always works.' },
    ],
  },
  {
    title: 'REAL-TIME COMBAT', sub: 'Pause, plan every order, then watch it happen.', img: 'help_combat',
    items: [
      { head: 'Pause & Plan', text: 'Combat runs in real time, but SPACE pauses it — and your orders still work while paused. Freeze the action, line up every shot and command, then unpause to watch it unfold.' },
      { head: 'Take Aim', text: 'Click a weapon (or press 1–4), then click an enemy room. A coloured pin marks the plan. A small ward badge on a pin warns the shot will be eaten by their barrier.' },
      { head: 'Every Shot Is an Order', text: 'Each gun fires once at its target, then waits for a fresh order — there is no autofire. Pause freely between volleys; a steady captain aims every broadside.' },
    ],
  },
  {
    title: 'WEAPONS & WARDS', sub: 'Six arsenals, and the barriers that stop them.', img: 'help_weapons',
    items: [
      { head: 'Six Arsenals', text: 'Iron strips a ward layer with every ball. Runeshot ordnance ignores wards but spends runeshot. Lances never miss and sweep rooms. Stormcall drains mana. Tide & Fang breaches hulls and poisons. Songs strike the minds aboard.' },
      { head: 'Wards', text: 'Two mana in Wards raises one shimmering layer that eats a single shot. Bombs and torpedoes slip beneath wards; lances are never blocked — each layer just soaks one damage off the sweep.' },
      { head: 'Reading a Gun', text: 'Each slot shows its state: OFF (right-click to power), NO MANA, NO RUNE, or AIM! — charged with no target. Lances aim by click, rotate, click to set the sweep line.' },
    ],
  },
  {
    title: 'FAMILIARS & BOARDING', sub: 'Bound spirits to fight for you; raiders to take her whole.', img: 'help_familiars',
    items: [
      { head: 'Bound Spirits', text: 'Buy familiars at shops (three aboard at most), then install and power a Binding Shrine — one mana bar wakes each. Imps and gulls bombard, beetles repair, the sentinel stomps boarders, reef-singers regrow hull at sea.' },
      { head: 'Seance Candles', text: 'Attacking familiars orbit the enemy, exposed, and can be shot down. Each costs one Seance Candle to deploy or re-bind per battle; familiars that stay aboard are free.' },
      { head: 'Boarding', text: 'Install a Portal, move up to four crew into the Portal room, press BOARD, then click an enemy room — only sailors standing in that room make the jump. Clear or charm every enemy sailor to capture the ship for a 60% richer haul.' },
    ],
  },
  {
    title: 'THE SEA NEVER PAUSES', sub: 'Fire and floodwater follow you out of the fight.', img: 'help_decks',
    items: [
      { head: 'Damage Carries Over', text: 'Fires, leaks, and floodwater survive the battle. The DECKS button on the chart opens your ship underway with full crew control — untended fires char the hull to nothing and sailors drown. A run can end out here.' },
      { head: 'Breaches & Fire', text: 'Cannonfire punches hull breaches; the sea forces in until a sailor patches them. Deep water drowns non-merfolk and shorts out systems. Fire spreads tile to tile — but a flooded room cannot burn.' },
      { head: 'Doors & Pumps', text: 'Right-click a hull room’s sea door to flood it on purpose — dousing fire, drowning boarders. Open All / Shut All swing every door; seal them to contain fire and flooding. A Bilge Pump drains water shipwide.' },
    ],
  },
];

const HelpScreen = {
  designW: 1920, designH: 1080,
  enter() { this.page = 0; },
  update() {},
  // PREV / BACK / NEXT button rects (KIT ids help.prev / help.back / help.next)
  _btns() {
    return {
      prev: { x: 60, y: 984, w: 230, h: 66 },
      back: { x: 845, y: 984, w: 230, h: 66 },
      next: { x: 1630, y: 984, w: 230, h: 66 },
    };
  },
  click() {}, // every control is a KIT registration
  turn(d) { this.page = U.clamp(this.page + d, 0, HELP_PAGES.length - 1); },
  key(k) {
    if (k === 'Escape') Game.setScreen('title');
    if (k === 'ArrowRight' || k === ' ') this.turn(1);
    if (k === 'ArrowLeft') this.turn(-1);
  },
  render(ctx) {
    const pg = HELP_PAGES[this.page], N = HELP_PAGES.length, W = 1920, H = 1080;
    KIT.page(ctx, W, H);
    // ---- the page: one big wood panel, parchment cards inside ----
    const PX = 46, PY = 36, PW = 1828, PH = 916;
    KIT.panel(ctx, { x: PX, y: PY, w: PW, h: PH }, { title: pg.title, wood: true, titleRightW: 300 });
    KIT.text(ctx, 'How to Sail  ·  ' + (this.page + 1) + ' / ' + N, { x: PX + PW - 316, y: PY + 2, w: 300, h: 36 }, { size: 19, italic: true, align: 'right', color: KIT.C.onWoodMuted, shadow: 'rgba(16,9,3,0.85)', shadowDx: 1, shadowDy: 1 });
    if (pg.sub) KIT.text(ctx, pg.sub, { x: PX + 24, y: PY + 52, w: 900, h: 40 }, { size: 23, italic: true, color: '#f0dcb0', shadow: 'rgba(16,9,3,0.8)', shadowDx: 1, shadowDy: 1, fit: 'ellipsis' });
    // image card on the right (contain-fit, capped so small crops don't blow up)
    const IBX = 968, IBY = PY + 110, IBW = 882, IBH = PH - 150;
    const e = pg.img && SPR.artEntry(pg.img);
    if (e) {
      const nw = e.img.naturalWidth, nh = e.img.naturalHeight, sc = Math.min(IBW / nw, IBH / nh, 1.35);
      const dw = Math.round(nw * sc), dh = Math.round(nh * sc), dx = Math.round(IBX + (IBW - dw) / 2), dy = Math.round(IBY + (IBH - dh) / 2);
      KIT.card(ctx, { x: dx - 16, y: dy - 16, w: dw + 32, h: dh + 32 });
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      UI.roundRect(ctx, dx - 2, dy - 2, dw + 4, dh + 4, 4); ctx.clip();
      ctx.drawImage(e.img, dx, dy, dw, dh);
      ctx.restore();
      ctx.strokeStyle = 'rgba(60,40,18,0.9)'; ctx.lineWidth = 1.5; ctx.strokeRect(dx - 0.5, dy - 0.5, dw + 1, dh + 1); ctx.lineWidth = 1;
    }
    // text concept cards stacked on the left: measure each block, then lay out with even gaps
    const TX = 78, TW = 858, headSz = 27, bodySz = 21, lineH = bodySz + 8, pad = 22, innerW = TW - pad * 2;
    const blocks = pg.items.map((it) => {
      const lines = TYPE.wrap(ctx, it.text, innerW, bodySz);
      return { it, lines, h: pad + headSz + 12 + lines.length * lineH + pad - 4 };
    });
    const top = PY + 112, colH = PH - 158, used = blocks.reduce((a, b) => a + b.h, 0);
    const gap = blocks.length > 1 ? Math.max(16, Math.min(40, (colH - used) / (blocks.length - 1))) : 0;
    let ty = top;
    for (const blk of blocks) {
      KIT.card(ctx, { x: TX, y: ty, w: TW, h: blk.h });
      KIT.text(ctx, blk.it.head, { x: TX + pad, y: ty + pad - 4, w: innerW, h: headSz + 6 }, { size: headSz, display: true, color: COL.inkdk, fit: 'shrink' });
      const ry = ty + pad + headSz + 4; // brass rule under the heading (ledger idiom)
      ctx.strokeStyle = 'rgba(150,108,44,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(TX + pad, ry); ctx.lineTo(TX + TW - pad, ry); ctx.stroke(); ctx.lineWidth = 1;
      let yy = ry + 10;
      for (const ln of blk.lines) { KIT.text(ctx, ln, { x: TX + pad, y: yy, w: innerW, h: lineH }, { size: bodySz, color: COL.inkmd, valign: 'top' }); yy += lineH; }
      ty += blk.h + gap;
    }
    // ---- nav buttons + page dots (on the parchment, below the panel) ----
    const B = this._btns();
    KIT.button(ctx, 'help.prev', B.prev, '‹  Prev', { size: 24, disabled: this.page === 0, reason: 'This is the first page.', tip: [{ t: 'Previous page', c: TIP.ink }], onClick: () => this.turn(-1) });
    KIT.button(ctx, 'help.back', B.back, 'Back to Port', { size: 24, sound: 'back', onClick: () => Game.setScreen('title') });
    KIT.button(ctx, 'help.next', B.next, 'Next  ›', { size: 24, disabled: this.page === N - 1, reason: 'This is the last page.', tip: [{ t: 'Next page', c: TIP.ink }], onClick: () => this.turn(1) });
    const dotsY = 968, dotW = 16, dx0 = 960 - (N * dotW) / 2;
    for (let i = 0; i < N; i++) {
      ctx.beginPath(); ctx.arc(dx0 + i * dotW + dotW / 2, dotsY, i === this.page ? 6 : 4, 0, 7);
      ctx.fillStyle = i === this.page ? COL.brasshi : 'rgba(90,60,28,0.5)'; ctx.fill();
      if (i === this.page) { ctx.strokeStyle = COL.brassdk; ctx.lineWidth = 1.5; ctx.stroke(); ctx.lineWidth = 1; }
    }
    KIT.flushFrames(ctx);
    KIT.text(ctx, '← → turn the page    ·    Esc returns to port', { x: 0, y: 1052, w: W, h: 24 }, { size: 17, italic: true, align: 'center', color: '#7a5a2c' });
    KIT.flushTip(ctx, W, H);
  },
};

// ============ GAME OVER / VICTORY ============
// HD (1920x1080, Stage 2c): full-bleed painting + gradient scrim, the verdict in display type, the voyage's
// numbers as a framed stat card, and KIT buttons.
const EndScreens = {
  // a wood panel holding one parchment card of big numbers over italic labels (+ an optional footer line)
  statCard(ctx, r, title, stats, foot) {
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 36; ctx.shadowOffsetY = 10;
    ctx.fillStyle = 'rgba(20,12,4,0.9)'; ctx.fillRect(r.x + 6, r.y + 6, r.w - 12, r.h - 12); ctx.restore();
    const c = KIT.panel(ctx, r, { title, wood: true });
    const ch = foot ? c.h - 46 : c.h;
    KIT.card(ctx, { x: c.x, y: c.y, w: c.w, h: ch });
    const cw = c.w / stats.length;
    stats.forEach((st, i) => {
      const x = c.x + i * cw;
      if (i) { ctx.strokeStyle = 'rgba(90,60,28,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, c.y + 18); ctx.lineTo(x, c.y + ch - 18); ctx.stroke(); ctx.lineWidth = 1; }
      KIT.text(ctx, String(st[0]), { x, y: c.y + 12, w: cw, h: ch * 0.56 }, { size: 52, display: true, align: 'center', color: COL.inkdk, fit: 'shrink' });
      KIT.text(ctx, st[1], { x, y: c.y + ch * 0.58, w: cw, h: ch * 0.3 }, { size: 20, italic: true, align: 'center', color: COL.inkmd, padX: 8, fit: 'shrink' });
    });
    if (foot) KIT.text(ctx, foot.t, { x: c.x, y: c.y + ch + 8, w: c.w, h: 38 }, { size: 21, italic: true, align: 'center', color: foot.c || COL.brasshi, shadow: 'rgba(16,9,3,0.85)', shadowDx: 1, shadowDy: 1, fit: 'ellipsis' });
  },
  romanSea(r) { return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][r] || String(r + 1); },
};

const GameOverScreen = {
  designW: 1920, designH: 1080,
  enter(args) {
    this.reason = args.reason || 'THE SEA KEEPS ITS SECRETS.';
    AUDIO.play('gameover');
  },
  update() {},
  click() {},
  again() { Game.newGame(Game.run ? Game.run.difficulty : 'captain'); Game.setScreen('intro'); },
  key(k) { if (k === 'Enter') this.again(); if (k === 'Escape') Game.setScreen('title'); },
  render(ctx) {
    const W = 1920, H = 1080;
    if (!KIT.backdrop(ctx, 'vig_gameover', W, H, { stops: [[0, 0.62], [0.34, 0.36], [0.62, 0.42], [1, 0.82]], tint: '8,8,16', vignette: 0.55 })) {
      ctx.fillStyle = '#10101e'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = COL.sealow; ctx.fillRect(0, 680, W, 400);
    }
    KIT.text(ctx, 'Lost With All Hands', { x: 100, y: 110, w: W - 200, h: 120 }, { size: 104, display: true, align: 'center', color: '#d8503e', shadow: 'rgba(0,0,0,0.92)', shadowDx: 4, shadowDy: 4 });
    KIT.ornRule(ctx, 960, 252, 700, 'rgba(216,120,96,0.85)');
    KIT.text(ctx, this.reason, { x: 200, y: 272, w: W - 400, h: 50 }, { size: 30, display: true, align: 'center', color: COL.paperhi, shadow: 'rgba(0,0,0,0.9)', shadowDx: 2, shadowDy: 2, fit: 'shrink' });
    if (Game.run) {
      const s = Game.run.stats;
      EndScreens.statCard(ctx, { x: 510, y: 400, w: 900, h: 300 }, 'The Final Reckoning', [
        ['Sea ' + EndScreens.romanSea(Game.run.region), 'reached'], [s.jumps, 'islands visited'], [s.kills, 'ships sunk'], [s.shards, 'shards won'],
      ], { t: 'The New World remains a rumor.', c: '#d9c49a' });
    }
    KIT.button(ctx, 'gameover.title', { x: 650, y: 780, w: 290, h: 72 }, 'Title', { size: 26, sound: 'back', onClick: () => Game.setScreen('title') });
    KIT.button(ctx, 'gameover.again', { x: 980, y: 780, w: 290, h: 72 }, 'Sail Again', { size: 26, onClick: () => this.again(),
      tip: [{ t: 'A new voyage', c: TIP.ink }, { t: 'Same seas, a fresh ship and crew (Enter).', c: TIP.body }] });
    KIT.flushFrames(ctx);
    KIT.flushTip(ctx, W, H);
  },
};

const VictoryScreen = {
  designW: 1920, designH: 1080,
  enter() {
    AUDIO.play('victory');
    this.t = 0;
  },
  update(dt) { this.t += dt; },
  click() {},
  key(k) { if (k === 'Enter') Game.setScreen('title'); },
  render(ctx) {
    const W = 1920, H = 1080;
    // R14c: one full-frame gradient scrim — dark behind the title + the reckoning, lightest over the city
    if (!KIT.backdrop(ctx, 'vig_city', W, H, { stops: [[0, 0.70], [0.26, 0.40], [0.5, 0.14], [0.66, 0.40], [1, 0.82]], tint: '11,10,22', vignette: 0.35 })) {
      ctx.fillStyle = '#1a2a52'; ctx.fillRect(0, 0, W, 560); ctx.fillStyle = COL.sea; ctx.fillRect(0, 560, W, 520);
    }
    KIT.text(ctx, 'The City of Mythril is Real', { x: 100, y: 52, w: W - 200, h: 110 }, { size: 88, display: true, align: 'center', color: COL.mythril, shadow: 'rgba(0,0,0,0.92)', shadowDx: 4, shadowDy: 4 });
    KIT.ornRule(ctx, 960, 180, 760, 'rgba(240,214,150,0.9)');
    const lines = [['The Warden lies broken in the harbor mouth.', COL.paperhi], ['The Dawnchaser rides low, holds bursting with mythril.', COL.paperhi], ['You are the richest crew in two worlds.', COL.brasshi]];
    lines.forEach((l, i) => KIT.text(ctx, l[0], { x: 200, y: 200 + i * 44, w: W - 400, h: 42 }, { size: 30, italic: true, align: 'center', color: l[1], shadow: 'rgba(0,0,0,0.9)', shadowDx: 2, shadowDy: 2 }));
    if (Game.run) {
      const s = Game.run.stats, names = Game.ship ? Game.ship.aliveCrew().map(c => c.name).join(', ') : '';
      EndScreens.statCard(ctx, { x: 460, y: 664, w: 1000, h: 262 }, 'The Voyage in Full', [
        [s.jumps, 'islands visited'], [s.kills, 'ships bested'], [s.shards, 'shards plundered'],
      ], names ? { t: 'Survivors: ' + names, c: COL.gold } : null); // R14: ellipsis, not a hard cut
    }
    KIT.button(ctx, 'victory.end', { x: 815, y: 962, w: 290, h: 72 }, 'The End', { size: 26, onClick: () => Game.setScreen('title') });
    KIT.flushFrames(ctx);
    KIT.flushTip(ctx, W, H);
  },
};

// ============ JUKEBOX (the Gramophone Room) ============
// A listening room reachable from the title. Every track aboard, grouped by
// sea / battle / faction, click to audition. Pure presentation - no game state.
const JukeboxScreen = {
  // HD (1920x1080, Stage 2c): parchment page, three wood "record cabinets" (one per catalogue group),
  // a parchment record-label card per berth with KIT variant buttons 'jukebox.<kind>:<r|id>.<v>',
  // an engraved brass now-playing plate, and KIT Back / Stop buttons.
  designW: 1920, designH: 1080,
  COLS: [48, 664, 1280], COLW: 592, PANEL_Y: 156, ROW_H: 66, ROW_GAP: 10,
  enter() { AUDIO.stopMusic(); this.nowKey = null; this.nowVar = 0; this.now = null; },
  update() {},
  // one entry per catalogue item with its card rect + variant-button rects (shared by render + tests)
  rows() {
    const out = [];
    MUSIC_CATALOG.forEach((grp, ci) => grp.items.forEach((it, ri) => {
      const x = this.COLS[ci] + 16, y = this.PANEL_Y + 52 + ri * (this.ROW_H + this.ROW_GAP), w = this.COLW - 32, n = it.variants;
      const bw = 46, bg = 8, bx0 = x + w - 14 - n * bw - (n - 1) * bg;
      const vb = [];
      for (let v = 0; v < n; v++) vb.push({ v, x: bx0 + v * (bw + bg), y: y + 13, w: bw, h: this.ROW_H - 26 });
      const key = it.kind === 'solo' ? 'solo:' + it.id : it.kind + ':' + it.r;
      out.push({ it, key, name: it.name, style: it.style, x, y, w, h: this.ROW_H, nameW: bx0 - x - 28, vb });
    }));
    return out;
  },
  specFor(it, v) { return it.kind === 'solo' ? { kind: 'solo', id: it.id, variant: v } : { kind: it.kind, r: it.r, variant: v }; },
  play(r, v) { AUDIO.audition(this.specFor(r.it, v)); this.nowKey = r.key; this.nowVar = v; this.now = r; },
  stop() { AUDIO.stopMusic(); this.nowKey = null; this.now = null; },
  leave() { AUDIO.stopMusic(); AUDIO.play('title'); Game.setScreen('title'); },
  click() {},
  key(k) { if (k === 'Escape') this.leave(); },
  render(ctx) {
    const W = 1920, H = 1080;
    KIT.page(ctx, W, H);
    KIT.text(ctx, 'The Gramophone Room', { x: 0, y: 34, w: W, h: 70 }, { size: 56, display: true, align: 'center', color: COL.inkdk, shadow: 'rgba(255,240,205,0.5)', shadowDx: 1, shadowDy: 1 });
    KIT.ornRule(ctx, 960, 112, 640, 'rgba(120,84,40,0.85)');
    KIT.text(ctx, 'Three songs to every berth — press 1, 2 or 3 to set the needle down.', { x: 0, y: 118, w: W, h: 32 }, { size: 22, italic: true, align: 'center', color: COL.inkmd });
    const ph = 52 + 8 * (this.ROW_H + this.ROW_GAP) + 6;
    MUSIC_CATALOG.forEach((grp, ci) => KIT.panel(ctx, { x: this.COLS[ci], y: this.PANEL_Y, w: this.COLW, h: ph }, { title: grp.group, wood: true }));
    for (const r of this.rows()) {
      const active = r.key === this.nowKey;
      KIT.card(ctx, r, { tint: active ? 'rgba(202,162,74,0.22)' : null, edge: active ? COL.golddk : null });
      KIT.text(ctx, r.name, { x: r.x + 22, y: r.y + 6, w: r.nameW, h: 32 }, { size: 22, color: COL.inkdk, fit: 'shrink', display: active });
      KIT.text(ctx, r.style, { x: r.x + 22, y: r.y + 36, w: r.nameW, h: 22 }, { size: 15, italic: true, color: COL.inkfade, fit: 'ellipsis' });
      for (const b of r.vb) {
        const on = active && b.v === this.nowVar;
        KIT.button(ctx, 'jukebox.' + r.key + '.' + b.v, b, String(b.v + 1), { variant: 'recess', live: on, size: 20, onClick: () => this.play(r, b.v),
          tip: [{ t: r.name + ' — song ' + (b.v + 1), c: TIP.ink }, { t: r.style, c: TIP.body }] });
      }
    }
    // now-playing: an engraved BRASS nameplate (raised plate, dark engraved text)
    const np = { x: 312, y: 834, w: 1296, h: 76 };
    const g = ctx.createLinearGradient(0, np.y, 0, np.y + np.h);
    g.addColorStop(0, COL.brasshi); g.addColorStop(0.5, COL.brass); g.addColorStop(1, COL.brassdk);
    ctx.fillStyle = COL.brassdk; UI.roundRect(ctx, np.x - 3, np.y - 3, np.w + 6, np.h + 6, 10); ctx.fill();
    ctx.fillStyle = g; UI.roundRect(ctx, np.x, np.y, np.w, np.h, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(60,40,10,0.55)'; ctx.lineWidth = 1.5; UI.roundRect(ctx, np.x + 7.5, np.y + 7.5, np.w - 15, np.h - 15, 5); ctx.stroke(); ctx.lineWidth = 1;
    for (const [sx, sy] of [[np.x + 18, np.y + np.h / 2], [np.x + np.w - 18, np.y + np.h / 2]]) { ctx.beginPath(); ctx.arc(sx, sy, 5, 0, 7); ctx.fillStyle = COL.brassdk; ctx.fill(); ctx.beginPath(); ctx.arc(sx - 1, sy - 1, 2, 0, 7); ctx.fillStyle = COL.brasshi; ctx.fill(); }
    const tr = { x: np.x + 40, y: np.y, w: np.w - 80, h: np.h };
    if (this.now) KIT.text(ctx, 'Now playing:  ' + this.now.name + '  ·  song ' + (this.nowVar + 1) + '  ·  ' + this.now.style, tr, { size: 28, align: 'center', color: COL.cabinlo, fit: 'ellipsis', shadow: 'rgba(255,247,220,0.45)', shadowDx: 1, shadowDy: 1 });
    else KIT.text(ctx, 'The needle rests. Choose a record, Captain.', tr, { size: 28, italic: true, align: 'center', color: COL.wooddk, shadow: 'rgba(255,247,220,0.4)', shadowDx: 1, shadowDy: 1 });
    KIT.button(ctx, 'jukebox.back', { x: 48, y: 968, w: 240, h: 72 }, '‹  Back', { size: 26, sound: 'back', onClick: () => this.leave(), tip: [{ t: 'Back to the title', c: TIP.ink }, { t: 'Escape also leaves.', c: TIP.body }] });
    KIT.button(ctx, 'jukebox.stop', { x: 1632, y: 968, w: 240, h: 72 }, 'Stop', { size: 26, sound: 'back', disabled: !this.now, reason: 'Nothing is playing.', onClick: () => this.stop() });
    KIT.flushFrames(ctx);
    KIT.flushTip(ctx, W, H);
  },
};

// boot when DOM ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => Game.boot());
  else Game.boot();
}
