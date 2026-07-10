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
    };

    const opts = this.loadJSON(OPTS_KEY) || {};
    AUDIO.muted = !!opts.muted;
    this.displayFit = opts.display !== 'pixel'; // FIT WINDOW is the default

    this.canvas.addEventListener('mousedown', e => {
      AUDIO.init();
      const p = this.toGame(e);
      if (this.screen && this.screen.click) this.screen.click(p.x, p.y, e.button);
      e.preventDefault();
    });
    this.canvas.addEventListener('mouseup', e => {
      const p = this.toGame(e);
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
    // PIXEL-PERFECT: integer scale, crisp. FIT WINDOW: fills the window (slightly soft),
    // and keeps the game playable on small screens by scaling below 1x if needed.
    const raw = Math.min(window.innerWidth / 512, window.innerHeight / 288);
    const s = this.displayFit ? Math.max(0.5, raw) : Math.max(1, Math.floor(raw));
    this.scale = s;
    this.canvas.style.width = Math.round(512 * s) + 'px';
    this.canvas.style.height = Math.round(288 * s) + 'px';
    this.canvas.style.imageRendering = (this.displayFit && s % 1 !== 0) ? 'auto' : 'pixelated';
  },
  saveOpts() { this.saveJSON(OPTS_KEY, { muted: AUDIO.muted, display: this.displayFit ? 'fit' : 'pixel' }); },
  toGame(e) {
    // map a client pixel to the current screen's logical grid (works at any design resolution)
    const r = this.canvas.getBoundingClientRect();
    return {
      x: Math.floor((e.clientX - r.left) / r.width * this.VW),
      y: Math.floor((e.clientY - r.top) / r.height * this.VH),
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
    if (this.screen && this.screen.render) this.screen.render(ctx);
    // mute indicator
    if (AUDIO.muted) TYPE.draw(ctx, 'Muted [M]', 4, this.VH - 10, 11, COL.dkgrey, { italic: true });
    // save/load warning banner (rare; clears on the next successful save).
    // Hidden during combat - saves only happen between nodes, and the top strip
    // there holds the enemy nameplate.
    if (this.saveWarning && this.screenName !== 'combat') {
      const w = TYPE.width(ctx, this.saveWarning, 10) + 16;
      ctx.fillStyle = 'rgba(120,20,20,0.92)'; ctx.fillRect(this.VW / 2 - w / 2, 0, w, 12);
      ctx.strokeStyle = COL.red; ctx.strokeRect(this.VW / 2 - w / 2 + 0.5, 0.5, w - 1, 11);
      TYPE.drawCentered(ctx, this.saveWarning, this.VW / 2, 1, 10, COL.white);
    }
    // pointer cursor over interactive elements (affordance), applied once per frame
    if (this.canvas && this.canvas.style) {
      const cur = this.hot ? 'pointer' : 'default';
      if (this._cursor !== cur) { this.canvas.style.cursor = cur; this._cursor = cur; }
    }
  },

  setScreen(name, args) {
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
    if (this._quitMenu) this.drawQuitMenu(ctx);
  },
  click(x, y, btn) {
    const b = Game.battle; if (!b) return;
    if (this._quitMenu) { this.quitMenuClick(x, y); return; }
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
  HD_SYS_LBL: { hearthstone: ['Hearth', 'm'], wards: ['Wards', 'p'], sails: ['Sails', 'p'], weapons: ['Guns', 'p'], infirmary: ['Surgeon', 'p'], sump: ['Bilge', 'p'], shrine: ['Shrine', 'p'], brinegate: ['Portal', 'p'], fogveil: ['Fog', 'p'], stormhex: ['Storm', 'p'], sirensong: ['Song', 'p'], helm: ['Helm', 's'], doors: ['Doors', 's'], lookout: ['Watch', 's'], open: ['Open', 'o'] },
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
    // DeckScreen ("underway") swaps the combat trio for the station controls
    const lx = this.hdBottom().sys.x; // left edge tracks the SHIP SYSTEMS panel so the whole column lines up
    if (this._deckV) return [ // big icon+label buttons (same treatment as combat's Pause/Stations)
      { x: lx, y: 716, w: 144, h: 100, big: true, icon: 'flag', label: 'Set Stations', fn: () => { b.setStations(); b._deckMsg = 'STATIONS SAVED.'; b._deckMsgT = 2; AUDIO.sfx('click'); } },
      { x: lx + 152, y: 716, w: 144, h: 100, big: true, icon: 'wheel', label: 'To Stations', fn: () => { b._deckMsg = b.returnStations() ? 'ALL HANDS TO STATIONS!' : 'EVERYONE IS AT THEIR STATION.'; b._deckMsgT = 2; AUDIO.sfx('click'); } },
    ];
    // Big icon+label buttons seated just above the SHIP SYSTEMS panel — left edge tracks L.sys.x so
    // the Pause frame lines up with the SHIP SYSTEMS frame. Recall is GONE (it's on the Portal card).
    const a = [
      { x: lx, y: 716, w: 144, h: 100, big: true, icon: 'pause', label: 'Pause', fn: () => b.togglePause() },
      { x: lx + 152, y: 716, w: 144, h: 100, big: true, icon: 'wheel', label: 'Stations', fn: () => b.clickHUD(355, 281, 0) },
    ];
    // (advanced systems — Veil / Board+Recall / Jam / Charm — are activated from a button ON their own
    // system card, above the pips; see hdSysAction. They're no longer crammed into this row.)
    return a;
  },
  // a big PARCHMENT-faced command button (Pause / Stations) — same look as the Retreat button:
  // parchment face + ink icon/label. The ORNATE panel frame is added by the caller (pushed to
  // frameLayer) so it matches the Retreat/gear/resource frames. Pause flips to a play-triangle + "Resume".
  hdBigBtn(ctx, a, parchPat, b, hover) {
    const { x, y, w, h } = a;
    const paused = a.icon === 'pause' && b.paused;
    if (parchPat) { ctx.fillStyle = parchPat; ctx.fillRect(x, y, w, h); ctx.fillStyle = 'rgba(244,232,205,0.30)'; ctx.fillRect(x, y, w, h); }
    else { ctx.fillStyle = COL.paper; ctx.fillRect(x, y, w, h); }
    if (hover) { ctx.fillStyle = 'rgba(255,236,190,0.32)'; ctx.fillRect(x, y, w, h); }
    const col = COL.inkdk;                                                          // dark ink icon + label on parchment
    hdActionIcon(ctx, paused ? 'play' : a.icon, x + w / 2, y + h * 0.40, 46, col);
    TYPE.drawCentered(ctx, paused ? 'Resume' : a.label, x + w / 2, y + h - 30, 20, col, { display: true, maxWidth: w - 12, fit: 'shrink' });
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
        { label: 'Open All', icon: 'open', fn: () => { b.p.setAllDoors(true); note('ALL DOORS THROWN OPEN.'); AUDIO.sfx('click'); }, ready: true, live: false, cd: 0, cdMax: 0 },
        { label: 'Shut All', icon: 'shut', fn: () => { b.p.setAllDoors(false); note('ALL DOORS SEALED — WATERTIGHT.'); AUDIO.sfx('click'); }, ready: true, live: false, cd: 0, cdMax: 0 },
      ];
    }
    if (this._deckV) return []; // no combat activations (Veil/Board/Jam/Charm) while underway
    const p = b.p;
    switch (key) {
      case 'fogveil':   return [{ label: 'Veil', fn: () => b.clickHUD(355, 269, 0), ready: p.powered('fogveil') > 0 && (p.veilCd || 0) <= 0, live: false, cd: p.veilCd || 0, cdMax: p.veilCdMax || 0 }];
      case 'brinegate': return [
        { label: b.gateMode ? 'Board…' : 'Board', fn: () => b.tryGate(), ready: b.gateReady(), live: !!b.gateMode, cd: p.gateCd || 0, cdMax: p.gateCdMax || 0 },
        { label: 'Recall', fn: () => b.tryRecall(), ready: b.gateReady() && b.p.crew.some(c => !c.dead && c.aboard === 'away'), live: false, cd: p.gateCd || 0, cdMax: p.gateCdMax || 0 },
      ];
      case 'stormhex':  return [{ label: 'Jam', icon: 'bolt', fn: () => b.tryStormhex(), ready: b.hexReady(), live: !!b.hexMode, cd: p.hexCd || 0, cdMax: p.hexCdMax || 0 }];
      case 'sirensong': return [{ label: 'Charm', icon: 'heart', fn: () => b.trySong(), ready: b.songReady(), live: !!b.songMode, cd: p.songCd || 0, cdMax: p.songCdMax || 0 }];
      default: return [];
    }
  },
  hdSysBtnRect(L, idx, count, slot) { const cw = L.sys.w / count, x = L.sys.x + idx * cw, cardTop = L.sys.y + 48; return { x: x + 15, y: cardTop + 13 + (slot || 0) * 28, w: cw - 30, h: 23 }; },
  // a recessed BROWN-PAPER slot inset into a parchment card (the in-card button base)
  recessBtn(ctx, r) {
    if (this._parchPat) { ctx.fillStyle = this._parchPat; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.fillStyle = 'rgba(78,50,20,0.5)'; ctx.fillRect(r.x, r.y, r.w, r.h); } // parchment tinted to kraft/brown paper
    else { ctx.fillStyle = '#72512c'; ctx.fillRect(r.x, r.y, r.w, r.h); }
    ctx.fillStyle = 'rgba(30,18,6,0.30)'; ctx.fillRect(r.x, r.y, r.w, 2);                         // soft inner top shadow (recessed)
    ctx.fillStyle = 'rgba(255,238,200,0.14)'; ctx.fillRect(r.x, r.y + r.h - 1.5, r.w, 1.5);       // bottom light lip
    ctx.strokeStyle = 'rgba(46,30,14,0.9)'; ctx.lineWidth = 1; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  },
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
  // HD surrender dialog: while surrenderOffer stands, b.click swallows every click, so the HD
  // view must draw + hit-test its own accept/decline buttons (or "targeting suddenly stops working").
  hdSurrenderRects() {
    const box = { x: 610, y: 388, w: 700, h: 300 };
    return {
      box,
      accept: { x: box.x + 70, y: box.y + box.h - 86, w: 250, h: 64 },
      decline: { x: box.x + box.w - 320, y: box.y + box.h - 86, w: 250, h: 64 },
    };
  },
  drawHdSurrender(ctx) {
    const b = Game.battle, s = this.hdSurrenderRects();
    ctx.fillStyle = 'rgba(14,13,29,0.6)'; ctx.fillRect(0, 0, 1920, 1080);
    ctx.fillStyle = COL.woodfrdk; ctx.fillRect(s.box.x - 5, s.box.y - 5, s.box.w + 10, s.box.h + 10);
    ctx.fillStyle = COL.paper; ctx.fillRect(s.box.x, s.box.y, s.box.w, s.box.h);
    ctx.strokeStyle = COL.brass; ctx.lineWidth = 3; ctx.strokeRect(s.box.x + 1.5, s.box.y + 1.5, s.box.w - 3, s.box.h - 3); ctx.lineWidth = 1;
    TYPE.drawCentered(ctx, 'They signal surrender!', 960, s.box.y + 30, 34, COL.inkdk, { display: true });
    TYPE.drawWrapped(ctx, 'The enemy captain offers tribute if you let them limp home: ' + b.surrenderOffer.shards + ' shards and ' + b.surrenderOffer.rune + ' runeshot.', s.box.x + 50, s.box.y + 96, s.box.w - 100, 24, COL.inkmd, { italic: true, maxLines: 3 }, 3);
    const btn = (r, label, col) => { ctx.fillStyle = COL.brass; ctx.fillRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6); ctx.fillStyle = col; ctx.fillRect(r.x, r.y, r.w, r.h); TYPE.drawCentered(ctx, label, r.x + r.w / 2, r.y + 16, 28, COL.paperhi, { display: true, shadow: COL.black }); };
    btn(s.accept, 'ACCEPT', '#2f6b39'); btn(s.decline, 'FIGHT ON', '#7a2222');
  },
  hdClick(x, y, btn) {
    const b = this.hdB(); if (!b) return;
    const deck = !!this._deckV;
    const inR = (rx, ry, rw, rh) => x >= rx && x < rx + rw && y >= ry && y < ry + rh;
    const L = this.hdBottom();
    // surrender offer stands -> only its buttons are live (forward to classic accept/decline coords)
    if (b.surrenderOffer) {
      const s = this.hdSurrenderRects();
      if (inR(s.accept.x, s.accept.y, s.accept.w, s.accept.h)) b.click(180, 175, 0);
      else if (inR(s.decline.x, s.decline.y, s.decline.w, s.decline.h)) b.click(300, 175, 0);
      return;
    }
    // crew rail -> select crew (toggle, Shift = multi)
    if (x < L.sys.x + 302) for (let i = 0; i < 8; i++) if (inR(L.sys.x, 92 + i * 72, 300, 64)) {
      const c = b.p.crew[i];
      if (c && !c.dead) { if (!Game.keys['Shift']) b.selCrew.clear(); if (b.selCrew.has(c.id)) b.selCrew.delete(c.id); else b.selCrew.add(c.id); AUDIO.sfx('click'); }
      return;
    }
    // action buttons (pause/stations/recall/veil/gate)
    for (const a of this.hdActions(b)) if (inR(a.x, a.y, a.w, a.h)) { a.fn(); return; }
    // settings gear -> quit-to-title menu (back to main menu)
    if (inR(1818, 14, 72, 72)) { this._quitMenu = true; AUDIO.sfx('click'); return; }
    // retreat = flee  ·  decks: the same slot is "To Chart"
    if (inR(1648, 14, 150, 72)) { if (deck) { this._deckV = null; AUDIO.sfx('click'); Game.setScreen('map'); } else b.clickHUD(305, 269, 0); return; }
    // ship systems -> mana allocation (left +, right -); hearthstone + sub systems are no-ops
    if (inR(L.sys.x, L.sys.y + 44, L.sys.w, L.sys.h - 44)) {
      const sysL = this.hdSysList(), cw = L.sys.w / sysL.length, idx = Math.floor((x - L.sys.x) / cw), k = sysL[idx];
      // advanced-system activate button (top of the card, above the pips) — left-click only
      const acts = this.hdSysActions(b, k);
      if (btn === 0 && acts.length) { for (let si = 0; si < acts.length; si++) { const r = this.hdSysBtnRect(L, idx, sysL.length, si); if (inR(r.x, r.y, r.w, r.h)) { acts[si].fn(); return; } } }
      if (k && k !== 'hearthstone' && k !== 'open' && !DATA.SYS_SUB.includes(k)) {
        if (btn === 2) { b.p.setAlloc(k, (b.p.alloc[k] || 0) - 1); AUDIO.sfx('click'); }
        else if (b.p.totalAlloc() < b.p.effMana()) { b.p.setAlloc(k, (b.p.alloc[k] || 0) + 1); AUDIO.sfx('click'); }
        else { b.log('THE HEARTHSTONE IS FULLY COMMITTED - RIGHT-CLICK A SYSTEM TO FREE A BAR.'); AUDIO.sfx('back'); }
      }
      return;
    }
    // weapons -> select/arm (forward to classic weapon-slot coords). Clicking the empty part of the
    // panel (below the last gun) cancels a pending selection — re-clicking the area "deselects".
    const wRows = L.wpn.y + 50;
    if (inR(L.wpn.x, wRows, L.wpn.w, L.wpn.h - 52)) {
      if (deck) return; // weapons are read-only while underway
      const i = Math.floor((y - wRows) / 44);
      if (i >= 0 && i < b.p.weapons.length && b.p.weapons[i]) b.clickHUD(255 + i * 48, 245, btn);
      else if (b.selWeapon >= 0) { b.selWeapon = -1; this._beamAnchor = null; AUDIO.sfx('back'); }
      return;
    }
    // familiars -> spend a Summoner's Candle to deploy / re-bind an orbiting familiar
    if (inR(L.fam.x, L.fam.y + 50, L.fam.w, L.fam.h - 54)) {
      if (deck) return; // familiars are read-only while underway
      const i = Math.floor((y - (L.fam.y + 50)) / 44), fams = Game.run.familiars || [];
      if (i >= 0 && i < fams.length && fams[i] && b.isOrbiting(fams[i])) b.deployFamiliar(fams[i]);
      return;
    }
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
  renderHD(ctx) {
    const b = this.hdB(), run = Game.run || {};
    const deck = !!this._deckV; // DeckScreen "underway" mode: no enemy, station controls, read-only panels
    // shared LEFT-COLUMN edge: nameplate, crew rail, Pause/Stations + SHIP SYSTEMS all line up here.
    const LX = this.hdBottom().sys.x, dL = LX - 20; // track the SHIP SYSTEMS panel's left edge
    let hdTip = null; // {lines:[{t,c}], ax, ay} — scrap tooltip for the hovered HD element
    // AI chrome: 9-slice ornate frame + seamless parchment/stone tiles (fall back to code-drawn if absent)
    const frameArt = SPR.artEntry('ui_panel_frame');
    const pe = SPR.artEntry('ui_parchment'), se = SPR.artEntry('ui_stone'), we = SPR.artEntry('ui_wood');
    const parchPat = pe ? ctx.createPattern(pe.img, 'repeat') : null;
    const stonePat = se ? ctx.createPattern(se.img, 'repeat') : null;
    const woodPat = we ? ctx.createPattern(we.img, 'repeat') : null;
    this._parchPat = parchPat; // shared with recessBtn (brown-paper button face)
    const draw9 = (img, x, y, w, h, si, di) => { // border-only 9-slice (center stays clear)
      const sw = img.naturalWidth, sh = img.naturalHeight, sR = sw - si, sB = sh - si, dR = x + w - di, dB = y + h - di;
      ctx.drawImage(img, 0, 0, si, si, x, y, di, di); ctx.drawImage(img, sR, 0, si, si, dR, y, di, di);
      ctx.drawImage(img, 0, sB, si, si, x, dB, di, di); ctx.drawImage(img, sR, sB, si, si, dR, dB, di, di);
      ctx.drawImage(img, si, 0, sw - 2 * si, si, x + di, y, w - 2 * di, di); ctx.drawImage(img, si, sB, sw - 2 * si, si, x + di, dB, w - 2 * di, di);
      ctx.drawImage(img, 0, si, si, sh - 2 * si, x, y + di, di, h - 2 * di); ctx.drawImage(img, sR, si, si, sh - 2 * si, dR, y + di, di, h - 2 * di);
    };
    // ---- the battle scene is the FULL-BLEED backdrop; panels paint on top of it ----
    // Render scene-only (no classic HUD/hover) into an offscreen sized to the ON-SCREEN width,
    // so the high-res (2x) ship art draws at full detail and the final blit is 1:1 (no blurry
    // 3x upscale). The scene's logical 512xHUD_Y space is scaled up by SS via setTransform.
    if (b) {
      const SX = 330, SW = 1920 - SX, mid = SX + SW / 2, OFF = 120;
      const SS = SW / 512, dh = Math.round(HUD_Y * SS); // SS ~3.1 -> offscreen renders at display res
      if (!this._sc || this._sc.width !== SW) { this._sc = document.createElement('canvas'); this._sc.width = SW; this._sc.height = dh; this._sctx = this._sc.getContext('2d'); }
      const o = this._sctx;
      o.setTransform(SS, 0, 0, SS, 0, 0); o.clearRect(0, 0, 512, HUD_Y);
      o.imageSmoothingEnabled = true; o.imageSmoothingQuality = 'high'; // smooth the art at fractional scale; fillRect sea stays crisp
      b.renderSea(o); if (!deck) b.renderShip(o, b.e); b.renderShip(o, b.p);
      if (!deck) {
        b._aimMouse = { x: (Game.mouse.x - SX) / SS, y: (Game.mouse.y - OFF) / SS }; // scene-logical cursor for aim previews
        b.renderProjectiles(o); b.renderSweeps(o); b.renderTargeting(o); b.renderHazardFx(o);
      }
      for (const pa of b.particles) { o.fillStyle = pa.col; o.fillRect(Math.round(pa.x), Math.round(pa.y), pa.size, pa.size); }
      // dark WALNUT surround (warm wood, not gray stone / digital blue) — panels float on it
      // unframed PARCHMENT page is the chrome background; the wood-framed panels sit on top of it
      if (parchPat) { ctx.fillStyle = parchPat; ctx.fillRect(0, 0, 1920, 1080); ctx.fillStyle = 'rgba(223,205,166,0.12)'; ctx.fillRect(0, 0, 1920, 1080); }
      else { ctx.fillStyle = COL.paper; ctx.fillRect(0, 0, 1920, 1080); }
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this._sc, 0, 0, SW, Math.round(8 * SS), SX, 0, SW, OFF + 2); // stretch top sky band to fill the gap above
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
      for (const l of b.logs) {
        if (l.t <= 0) continue;
        const up = l.msg.toUpperCase();
        const col = (up.startsWith('YOU') || up.startsWith('YOUR')) ? COL.ltblue
          : (up.startsWith('THE ENEMY') || up.startsWith('ENEMY') || up.startsWith('BOARDERS') || (b.e.name && up.includes(b.e.name.toUpperCase()))) ? COL.red : COL.gold;
        const txt = (l.n > 1) ? l.msg + '  ×' + l.n : l.msg;
        // dark scrim pill behind each line so light/cyan text stays legible over the brightest sky
        const tw = TYPE.width(ctx, txt, 26, { display: true });
        ctx.globalAlpha = Math.min(1, l.t) * 0.46; ctx.fillStyle = '#08060e';
        UI.roundRect(ctx, mid - tw / 2 - 16, py - 4, tw + 32, 33, 9); ctx.fill();
        ctx.globalAlpha = Math.min(1, l.t);
        TYPE.drawCentered(ctx, txt, mid, py, 26, col, { display: true, outline: COL.black, outlineW: 2 });
        ctx.globalAlpha = 1; py += 34;
      }
      // underway: the deck status message (Stations saved, doors, etc.) as a centered scene popup
      if (deck && b._deckMsg && b._deckMsgT > 0) {
        ctx.globalAlpha = Math.min(1, b._deckMsgT);
        TYPE.drawCentered(ctx, b._deckMsg, mid, 150, 26, COL.gold, { display: true, outline: COL.black, outlineW: 2 });
        ctx.globalAlpha = 1;
      }
    } else { ctx.fillStyle = COL.cabin; ctx.fillRect(0, 0, 1920, 1080); }

    // brass corner bracket: an L hugging the keyline corner (sx,sy point inward: +1/-1)
    const bracket = (cx, cy, sx, sy) => {
      const A = 20, T = 4;
      const hx = sx > 0 ? cx : cx - A, vy = sy > 0 ? cy : cy - A;
      ctx.fillStyle = COL.brassdk; ctx.fillRect(hx - 1, cy - 1, A + 2, T + 2); ctx.fillRect(cx - 1, vy - 1, T + 2, A + 2);
      ctx.fillStyle = COL.brass; ctx.fillRect(hx, cy, A, T); ctx.fillRect(cx, vy, T, A);
      ctx.fillStyle = COL.brasshi; ctx.fillRect(cx, cy, 3, 3);
    };
    // ornate brass corner art (Greg's reskin): stamp the bracket at a panel's 4 corners, mirrored.
    const cornerArt = SPR.artEntry('ui_corner');
    const stampCorners = (x, y, w, h, S) => {
      if (!cornerArt) return;
      const img = cornerArt.img, ar = img.naturalWidth / img.naturalHeight, sw = S * ar; // keep the bracket's aspect
      const put = (cx, cy, fx, fy) => { ctx.save(); ctx.translate(cx, cy); ctx.scale(fx, fy); ctx.drawImage(img, 0, 0, sw, S); ctx.restore(); };
      put(x, y, 1, 1); put(x + w, y, -1, 1); put(x, y + h, 1, -1); put(x + w, y + h, -1, -1);
    };
    const frameLayer = []; // the dark-wood 9-slice frame (empty frame.png) is drawn LAST so its brass corners sit topmost
    const panel = (x, y, w, h, title, tcol, woodBody) => {
      // interior: WOOD backing for content panels (cards float on it), else a parchment page
      if (woodBody) {
        if (woodPat) {
          ctx.fillStyle = woodPat; ctx.fillRect(x, y, w, h);
          const gi = ctx.createLinearGradient(x, y, x, y + h); // gentle top-light -> shadow for depth (not a flat black wash)
          gi.addColorStop(0, 'rgba(255,236,198,0.10)'); gi.addColorStop(0.5, 'rgba(20,11,3,0.06)'); gi.addColorStop(1, 'rgba(12,6,1,0.24)');
          ctx.fillStyle = gi; ctx.fillRect(x, y, w, h);
        } else { ctx.fillStyle = COL.woodfr; ctx.fillRect(x, y, w, h); }
      } else if (parchPat) { ctx.fillStyle = parchPat; ctx.fillRect(x, y, w, h); ctx.fillStyle = 'rgba(244,232,205,0.30)'; ctx.fillRect(x, y, w, h); }
      else { ctx.fillStyle = COL.paper; ctx.fillRect(x, y, w, h); }
      // brass keyline where wood meets parchment + a faint highlight on the outer wood edge
      // the dark-wood frame (9-sliced empty frame.png) is DEFERRED + painted last, so its brass corners are topmost
      frameLayer.push([x, y, w, h]);
      if (title) {
        // wood-plank header band (mockup look): wood strip behind the title, parchment body below
        let tc = tcol || COL.inkdk;
        if (woodPat) {
          // band sits FLUSH to the panel top/sides; carved-depth lighting (top-light -> shadow) + edges
          ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, 38); ctx.clip();
          ctx.fillStyle = woodPat; ctx.fillRect(x, y, w, 38);
          const gb = ctx.createLinearGradient(x, y, x, y + 38);
          gb.addColorStop(0, 'rgba(255,238,200,0.16)'); gb.addColorStop(0.45, 'rgba(0,0,0,0)'); gb.addColorStop(1, 'rgba(18,9,2,0.44)');
          ctx.fillStyle = gb; ctx.fillRect(x, y, w, 38); ctx.restore();
          ctx.fillStyle = 'rgba(255,240,205,0.22)'; ctx.fillRect(x, y, w, 1.5);    // top highlight
          ctx.fillStyle = 'rgba(0,0,0,0.30)'; ctx.fillRect(x, y + 36.5, w, 1.5);   // bottom shadow groove
          tc = tcol === COL.dkred ? '#ff9a7a' : COL.brasshi; // light title on the wood band
        }
        TYPE.draw(ctx, title, x + 16, y + 11, 24, tc, { display: true, shadow: 'rgba(16,9,3,0.85)', shadowDx: 1.4, shadowDy: 1.4 });
        ctx.strokeStyle = 'rgba(40,26,12,0.7)'; ctx.beginPath(); ctx.moveTo(x + 12, y + 42); ctx.lineTo(x + w - 12, y + 42); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,238,196,0.3)'; ctx.beginPath(); ctx.moveTo(x + 12, y + 43.5); ctx.lineTo(x + w - 12, y + 43.5); ctx.stroke();
      }
    };
    // a discrete PARCHMENT card styled like the aged plaque: rounded, an aged darker rim + a thin ink
    // inner keyline (double border) + small brass corner studs. Floats on the panel's wood interior.
    const card = (cx, cy, cw, ch) => {
      const r = Math.min(6, cw / 2, ch / 2);
      ctx.save(); UI.roundRect(ctx, cx, cy, cw, ch, r); ctx.clip();
      if (parchPat) { ctx.fillStyle = parchPat; ctx.fillRect(cx, cy, cw, ch); ctx.fillStyle = 'rgba(244,232,205,0.28)'; ctx.fillRect(cx, cy, cw, ch); }
      else { ctx.fillStyle = COL.paper; ctx.fillRect(cx, cy, cw, ch); }
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(120,84,40,0.45)'; UI.roundRect(ctx, cx + 2, cy + 2, cw - 4, ch - 4, Math.max(1, r - 1)); ctx.stroke(); // soft aged rim
      ctx.restore();
      ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(90,60,28,0.95)'; UI.roundRect(ctx, cx + 0.75, cy + 0.75, cw - 1.5, ch - 1.5, r); ctx.stroke(); // crisp outer keyline
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(74,51,24,0.5)'; UI.roundRect(ctx, cx + 5.5, cy + 5.5, cw - 11, ch - 11, Math.max(1, r - 3)); ctx.stroke(); // thin ink inner keyline
      if (cw > 24 && ch > 22) { // brass corner studs (skip on tiny cards)
        const m = 8, stud = (sx, sy) => {
          ctx.beginPath(); ctx.arc(sx, sy, 2.6, 0, 7); ctx.fillStyle = COL.brassdk; ctx.fill();
          ctx.beginPath(); ctx.arc(sx, sy, 1.7, 0, 7); ctx.fillStyle = COL.brass; ctx.fill();
          ctx.beginPath(); ctx.arc(sx - 0.5, sy - 0.5, 0.8, 0, 7); ctx.fillStyle = COL.brasshi; ctx.fill();
        };
        stud(cx + m, cy + m); stud(cx + cw - m, cy + m); stud(cx + m, cy + ch - m); stud(cx + cw - m, cy + ch - m);
      }
    };
    const slot = (x, y, w, h) => card(x, y, w, h); // crew-rail card == the same parchment card
    const pips = (x, y, total, on, sz, cOn, cOff) => { for (let i = 0; i < total; i++) { ctx.fillStyle = i < on ? cOn : cOff; ctx.fillRect(x + i * (sz + 1), y, sz, sz + 2); } };
    // vertical pip stack (FTL-style power bars): fills bottom-up from baseY
    const pipsV = (cx, baseY, total, on, w, h, gap, cOn, cOff) => { for (let i = 0; i < total; i++) { ctx.fillStyle = i < on ? cOn : cOff; ctx.fillRect(Math.round(cx - w / 2), baseY - (i + 1) * (h + gap), w, h); } };
    const bar = (x, y, w, h, frac, col) => { ctx.fillStyle = '#2a1d10'; ctx.fillRect(x, y, w, h); ctx.fillStyle = col; ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac || 0)), h); };
    // segmented charge/charge-style meter (the mockup's discrete "boxes")
    const segbar = (x, y, w, h, frac, col, n) => {
      n = n || 8; const g = 2, sw = (w - (n - 1) * g) / n, on = Math.round(Math.max(0, Math.min(1, frac || 0)) * n);
      for (let i = 0; i < n; i++) { ctx.fillStyle = i < on ? col : 'rgba(42,29,16,0.5)'; ctx.fillRect(x + i * (sw + g), y, sw, h); ctx.strokeStyle = 'rgba(42,29,16,0.6)'; ctx.strokeRect(x + i * (sw + g) + 0.5, y + 0.5, sw - 1, h - 1); }
    };
    // a PARCHMENT-faced HUD button (Retreat / settings) with the SAME deferred ornate WOOD frame as
    // panel() (pushed to frameLayer, painted last) — so it matches the resource/nameplate parchment
    // panels exactly and the whole top row aligns at one height. Ink label (dark on parchment).
    const hdBtn = (x, y, w, h, label) => {
      const hov = Game.mouse.x >= x && Game.mouse.x < x + w && Game.mouse.y >= y && Game.mouse.y < y + h;
      if (hov) Game.hot = true;
      if (parchPat) { ctx.fillStyle = parchPat; ctx.fillRect(x, y, w, h); ctx.fillStyle = 'rgba(244,232,205,0.30)'; ctx.fillRect(x, y, w, h); }
      else { ctx.fillStyle = COL.paper; ctx.fillRect(x, y, w, h); }
      if (hov) { ctx.fillStyle = 'rgba(255,236,190,0.32)'; ctx.fillRect(x, y, w, h); }
      frameLayer.push([x, y, w, h]);                                            // identical ornate frame -> aligned
      if (label) TYPE.drawCentered(ctx, label, x + w / 2, y + h / 2 - 11, 22, COL.inkdk, { display: true });
    };
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
    // Retreat — a standard wood+brass button (no more info-panel look, no dead asterisk)
    hdBtn(1648, 14, 150, 72, deck ? 'To Chart' : 'Retreat');
    // settings/menu gear — opens the quit-to-title menu (back to main menu)
    hdBtn(1818, 14, 72, 72, ''); cog(1818 + 36, 14 + 36, 22);

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
    if (b) for (const a of this.hdActions(b)) {
      const hov = Game.mouse.x >= a.x && Game.mouse.x < a.x + a.w && Game.mouse.y >= a.y && Game.mouse.y < a.y + a.h;
      if (hov) Game.hot = true;
      if (a.big) { this.hdBigBtn(ctx, a, parchPat, b, hov); frameLayer.push([a.x, a.y, a.w, a.h]); continue; }
      ctx.fillStyle = COL.brassdk; ctx.fillRect(a.x - 2, a.y - 2, a.w + 4, a.h + 4);
      ctx.fillStyle = woodPat || COL.woodfr; ctx.fillRect(a.x, a.y, a.w, a.h);
      ctx.fillStyle = 'rgba(18,11,4,0.22)'; ctx.fillRect(a.x, a.y, a.w, a.h);
      ctx.fillStyle = 'rgba(255,238,196,0.12)'; ctx.fillRect(a.x, a.y, a.w, 1); // top highlight
      const live = a.live && a.live(), rdy = a.ready ? a.ready() : true;
      if (live) { ctx.strokeStyle = COL.brasshi; ctx.lineWidth = 2; ctx.strokeRect(a.x + 1, a.y + 1, a.w - 2, a.h - 2); ctx.lineWidth = 1; }
      const lblCol = live ? '#fff0c8' : (rdy ? COL.brasshi : '#86744a');
      TYPE.drawCentered(ctx, a.label === 'Pause' && b.paused ? 'Resume' : a.label, a.x + a.w / 2, a.y + 5, 18, lblCol, { display: true, shadow: COL.black });
    }

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
      if (leaks) haz('Breach', leaks, COL.steelblue);
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
            else if (ion) tl.push({ t: 'Ion-jammed — disabled', c: TIP.action });
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
          this.recessBtn(ctx, r);                                          // brown-paper slot carved into the card
          // icon glyphs glow mythril-teal (pops off the brown paper); charged abilities go gold while live; text stays brass.
          const gcol = sAct.live ? COL.gold : sAct.ready ? (sAct.icon ? COL.magiccy : COL.brasshi) : '#7a6b48';
          const mid = r.y + r.h / 2;
          if (sAct.cd > 0) { // recharging: receding dark wipe + the seconds remaining
            const f = sAct.cdMax > 0 ? Math.min(1, sAct.cd / sAct.cdMax) : 1;
            ctx.fillStyle = 'rgba(6,4,2,0.55)'; ctx.fillRect(r.x, r.y, r.w, r.h * f);
            TYPE.drawCentered(ctx, Math.ceil(sAct.cd) + 's', r.x + r.w / 2, mid, 16, '#e7d9b2', { display: true, baseline: 'middle', shadow: COL.black });
          } else if (sAct.icon) {
            this.drawGlyph(ctx, sAct.icon, r.x + r.w / 2, mid, Math.min(r.h - 6, 18), gcol);
          } else {
            TYPE.drawCentered(ctx, sAct.label, r.x + r.w / 2, mid, TYPE.fitSize(ctx, sAct.label, r.w - 8, 16), gcol, { display: true, baseline: 'middle', shadow: COL.black });
          }
          if (sAct.live) { ctx.strokeStyle = COL.gold; ctx.lineWidth = 1.5; ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2); ctx.lineWidth = 1; }
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
        const hovered = Game.mouse.x >= rx && Game.mouse.x < rx + rw && Game.mouse.y >= wy && Game.mouse.y < wy + RH - 4;
        if (hovered) { Game.hot = true; hdTip = { lines: [{ t: wd.name, c: TIP.ink }, { t: b.weaponTip(i) || '', c: TIP.action }], ax: Game.mouse.x, ay: Game.mouse.y }; }
        // parchment card first, then a translucent state tint on top (selected -> brass; hover -> darker)
        card(rx, wy, rw, RH - 4); // parchment card per weapon (floats on the panel's wood backing)
        ctx.fillStyle = b.selWeapon === i ? 'rgba(202,162,74,0.5)' : (w.on ? 'rgba(202,162,74,0.16)' : 'rgba(90,67,34,0.06)');
        ctx.fillRect(rx + 1, wy + 1, rw - 2, RH - 6);
        if (hovered) { ctx.fillStyle = 'rgba(20,12,4,0.12)'; ctx.fillRect(rx + 1, wy + 1, rw - 2, RH - 6); }
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
          const bw = 78, bh = 22, bx = rightX - bw, by = mid - bh / 2, hot = Game.mouse.x >= bx && Game.mouse.x < bx + bw && Game.mouse.y >= by && Game.mouse.y < by + bh;
          if (hot) Game.hot = true;
          this.recessBtn(ctx, { x: bx, y: by, w: bw, h: bh });
          TYPE.draw(ctx, st === 'rebind' ? 'RE-BIND' : 'DEPLOY', bx + 5, by + bh / 2, 13, hot ? COL.gold : COL.brasshi, { baseline: 'middle', display: true, shadow: COL.black });
          UI.drawRes(ctx, 'candle', bx + bw - 15, by + 5, 12);
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
        TYPE.drawCentered(ctx, 'Power a Binding Shrine to wake them.', L.fam.x + L.fam.w / 2, L.fam.y + L.fam.h - 15, 13, COL.inkmd, { italic: true, baseline: 'middle', maxWidth: L.fam.w - 24 });
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
    const frameImg = SPR.artEntry('ui_frame');
    for (const f of frameLayer) { if (frameImg) draw9(frameImg.img, f[0] - 3, f[1] - 3, f[2] + 6, f[3] + 6, 120, 24); else stampCorners(f[0] - 5, f[1] - 5, f[2] + 10, f[3] + 10, 32); }
    TYPE.draw(ctx, deck ? 'Click a sailor, then a room  ·  right-click a hull room to flood  ·  Esc returns to the chart' : 'Space pauses  ·  Q quits', 24, 1070, 15, COL.brasshi, { italic: true });
    // --- the hovered scrap tooltip, painted on top of everything (after a short dwell) ---
    if (hdTip && hdTip.lines && hdTip.lines.length && Game.tipReady()) {
      const TS = 17, LH = 21, MAXINNER = 520; // wrap to MAXINNER so long body lines never overrun the scrap
      // pass 1: wrap every source line to the inner-width budget, keeping per-line size/colour
      const wrapped = [];
      for (let i = 0; i < hdTip.lines.length; i++) {
        const l = hdTip.lines[i], sz = i === 0 ? TS : TS - 2, disp = i === 0;
        if (!l.t) continue;
        for (const seg of TYPE.wrap(ctx, l.t, MAXINNER, sz, { display: disp })) wrapped.push({ t: seg, c: l.c, sz, disp });
      }
      let mw = 0; for (const l of wrapped) mw = Math.max(mw, TYPE.width(ctx, l.t, l.sz, { display: l.disp }));
      const W = Math.min(560, Math.round(mw) + 40);
      const H = 14 + wrapped.length * LH + 10;
      let x = hdTip.ax + 22; if (x + W > 1912) x = hdTip.ax - W - 18; x = U.clamp(x, 8, 1912 - W);
      const y = U.clamp(hdTip.ay - 10, 8, 1072 - H);
      const r = UI.drawScrap(ctx, x, y, W, H);
      let ty = r.iy + 4;
      for (const l of wrapped) { TYPE.draw(ctx, l.t, r.ix, ty, l.sz, l.c, { display: l.disp, maxWidth: r.iw, fit: 'ellipsis' }); ty += LH; }
    }
    if (b && b.surrenderOffer) this.drawHdSurrender(ctx);
  },
  key(k) {
    if (k === 'q' || k === 'Q') { this._quitMenu = !this._quitMenu; return; }
    if (this._quitMenu) { if (k === 'Escape' || k === 'Enter') this._quitMenu = false; return; }
    if (Game.battle) Game.battle.key(k);
  },
  // ---- quit-to-title menu (Q). Scales to the active resolution; no mid-combat save
  // (the run is already saved at the last node, so a resume re-approaches that node). ----
  quitRect() { const w = Math.min(Game.VW * 0.5, 560), h = Math.min(Game.VH * 0.4, 220); return { x: (Game.VW - w) / 2, y: (Game.VH - h) / 2, w, h }; },
  inQR(x, y, r) { return r && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h; },
  drawQuitMenu(ctx) {
    const VW = Game.VW, VH = Game.VH, r = this.quitRect();
    ctx.fillStyle = 'rgba(8,7,16,0.7)'; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = COL.woodfrdk; ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
    ctx.fillStyle = COL.woodfr; ctx.fillRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6);
    ctx.fillStyle = COL.brass; for (const [bx, by] of [[r.x - 3, r.y - 3], [r.x + r.w - 5, r.y - 3], [r.x - 3, r.y + r.h - 5], [r.x + r.w - 5, r.y + r.h - 5]]) ctx.fillRect(bx, by, 8, 8);
    ctx.fillStyle = COL.paper; ctx.fillRect(r.x, r.y, r.w, r.h);
    const ts = Math.round(VH * 0.024) + 4, ss = Math.round(VH * 0.012) + 4, bs = Math.round(VH * 0.016) + 4;
    TYPE.drawCentered(ctx, 'Quit to title?', r.x + r.w / 2, r.y + r.h * 0.16, ts, COL.inkdk, { display: true });
    TYPE.drawCentered(ctx, 'Your voyage is saved at your last port.', r.x + r.w / 2, r.y + r.h * 0.42, ss, COL.inkmd, { italic: true });
    const bw = r.w * 0.36, bh = r.h * 0.24, by = r.y + r.h * 0.6, lx = r.x + r.w * 0.09, qx = r.x + r.w * 0.55;
    const btn = (bx, lab, col) => { ctx.fillStyle = COL.brass; ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4); ctx.fillStyle = col; ctx.fillRect(bx, by, bw, bh); TYPE.drawCentered(ctx, lab, bx + bw / 2, by + bh * 0.28, bs, COL.brasshi, { display: true }); };
    btn(lx, 'Resume', COL.woodfr); btn(qx, 'Quit to title', COL.dkred);
    this._quitRects = { resume: { x: lx, y: by, w: bw, h: bh }, quit: { x: qx, y: by, w: bw, h: bh } };
  },
  quitMenuClick(x, y) {
    const r = this._quitRects;
    // drop the battle on quit: a leaked Game.battle disables Game.checkDoom (it early-returns
    // mid-battle) and points hdSysList at a stale ship after Continue/load. (R3, 2026-07-02)
    if (r && this.inQR(x, y, r.quit)) { this._quitMenu = false; Game.battle = null; if (AUDIO.stopMusic) AUDIO.stopMusic(); Game.setScreen('title'); return; }
    this._quitMenu = false; AUDIO.sfx('back'); // Resume or click-away
  },
};

// ============ TITLE ============
const TitleScreen = {
  enter() {
    this.t = 0;
    AUDIO.play('title');
    this.confirmNew = false;
    this.cheatUranium = false;
    this.cheatShards = false;
    this.cheatTeleport = false;
    this.cheatMaxShip = false;
    this.cheatSysSlots = new Array(DATA.OPEN_MOUNTS).fill(null); // chosen advanced systems per mount
  },
  update(dt) { this.t += dt; },
  menuY() { return this.confirmNew ? 108 : 134; }, // lifted up so the cheat note + footer clear the bottom
  click(x, y) {
    // cheat checkboxes + mount-slot cyclers — hit-test the rects drawCheats recorded (no drift)
    if (this.confirmNew) {
      for (const r of (this._cheatRows || [])) {
        if (x >= r.rect.x && x < r.rect.x + r.rect.w && y >= r.rect.y && y < r.rect.y + r.rect.h) {
          if (r.act === 'cycle') this.cycleSysSlot(r.slot);
          else if (r.act === 'uranium') this.cheatUranium = !this.cheatUranium;
          else if (r.act === 'shards') this.cheatShards = !this.cheatShards;
          else if (r.act === 'teleport') this.cheatTeleport = !this.cheatTeleport;
          else if (r.act === 'maxship') this.cheatMaxShip = !this.cheatMaxShip;
          AUDIO.sfx('click'); return;
        }
      }
    }
    const my = this.menuY();
    this.items().forEach((it, i) => {
      if (x >= 186 && x < 326 && y >= my + i * 18 && y < my + 16 + i * 18) it.fn();
    });
  },
  drawCheats(ctx) {
    if (!this.confirmNew) return;
    this._cheatRows = []; // {rect, act, slot} — click() hit-tests these (no geometry drift)
    const slots = this.cheatSysSlots || (this.cheatSysSlots = new Array(DATA.OPEN_MOUNTS).fill(null));
    const rows = 4 + slots.length, ST = 14, noteY = 166, Y0 = noteY + 8; // roomy rows; lifted clear of the footer
    UI.drawScrap(ctx, 164, noteY, 196, 8 + rows * ST + 6); // torn parchment note, sized to the rows
    const rowY = (i) => Y0 + i * ST;
    const box = (i, on, label, act) => {
      const y = rowY(i), by = y + (ST - 9) / 2; // checkbox centred in the row, label on the same midline
      ctx.fillStyle = on ? COL.brass : '#cdbb90'; ctx.fillRect(172, by, 9, 9);
      ctx.strokeStyle = on ? COL.brassdk : COL.inklt; ctx.strokeRect(172.5, by + 0.5, 8, 8);
      if (on) { ctx.fillStyle = COL.inkdk; ctx.fillRect(174, by + 2, 5, 5); }
      TYPE.draw(ctx, label, 186, y + ST / 2, 10, on ? COL.inkdk : COL.inkmd, { italic: true, baseline: 'middle' });
      this._cheatRows.push({ rect: { x: 172, y, w: 184, h: ST }, act });
    };
    box(0, this.cheatUranium, 'Cheat: one-shot EM Rail Gun', 'uranium');
    box(1, this.cheatShards, 'Cheat: 15,000 shards', 'shards');
    box(2, this.cheatTeleport, 'Cheat: magic teleport', 'teleport');
    box(3, this.cheatMaxShip, 'Cheat: fully upgraded ship', 'maxship');
    // optional-system mount cyclers: click a row to cycle its system (none + the 5 advanced)
    slots.forEach((key, i) => {
      const y = rowY(4 + i), cy = y + 1, ch = ST - 2, mid = y + ST / 2;
      const hot = Game.mouse.x >= 172 && Game.mouse.x < 356 && Game.mouse.y >= y && Game.mouse.y < y + ST;
      ctx.fillStyle = COL.parchdk; UI.roundRect(ctx, 172, cy, 184, ch, 3); ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = hot ? COL.golddk : COL.inkfade; UI.roundRect(ctx, 172.5, cy + 0.5, 183, ch - 1, 3); ctx.stroke();
      const name = key ? (DATA.SYSTEMS[key] ? DATA.SYSTEMS[key].name : key) : '— none —';
      TYPE.draw(ctx, 'Mount ' + ['I', 'II', 'III', 'IV'][i] + ' = ' + name, 178, mid, 9, key ? COL.inkdk : COL.inkmd, { italic: !key, baseline: 'middle' });
      ctx.fillStyle = hot ? COL.golddk : COL.inkmd; // right-pointing "click to cycle" cue
      ctx.beginPath(); ctx.moveTo(347, mid - 3); ctx.lineTo(351, mid); ctx.lineTo(347, mid + 3); ctx.closePath(); ctx.fill();
      this._cheatRows.push({ rect: { x: 172, y, w: 184, h: ST }, act: 'cycle', slot: i });
    });
  },
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
  items() {
    const arr = [];
    if (this.confirmNew) {
      const ch = () => ({ uranium: this.cheatUranium, shards: this.cheatShards, teleport: this.cheatTeleport, maxship: this.cheatMaxShip, systems: (this.cheatSysSlots || []).filter(Boolean) });
      arr.push({ label: 'EASY SEAS', fn: () => { Game.newGame('easy', ch()); Game.setScreen('intro'); } });
      arr.push({ label: 'CAPTAIN\'S SEAS', fn: () => { Game.newGame('captain', ch()); Game.setScreen('intro'); } });
      arr.push({ label: 'BACK', fn: () => { this.confirmNew = false; AUDIO.sfx('back'); } });
      return arr;
    }
    arr.push({ label: 'NEW VOYAGE', fn: () => { this.confirmNew = true; AUDIO.sfx('click'); } });
    if (Game.hasSave()) arr.push({ label: 'CONTINUE', fn: () => { if (Game.load()) Game.setScreen('map'); } });
    arr.push({ label: 'LORE', fn: () => Game.setScreen('lore') });
    arr.push({ label: 'MUSIC ROOM', fn: () => { AUDIO.sfx('click'); Game.setScreen('jukebox'); } });
    arr.push({ label: 'HOW TO PLAY', fn: () => Game.setScreen('help') });
    arr.push({ label: AUDIO.muted ? 'SOUND: OFF' : 'SOUND: ON', fn: () => Game.toggleMute() });
    arr.push({ label: Game.displayFit ? 'DISPLAY: FIT WINDOW' : 'DISPLAY: PIXEL-PERFECT', fn: () => { Game.displayFit = !Game.displayFit; Game.resize(); Game.saveOpts(); AUDIO.sfx('click'); } });
    return arr;
  },
  key(k) {
    if (k === 'Enter') this.items()[0].fn();
  },
  render(ctx) {
    // user AI title painting, if provided
    if (SPR.drawArt(ctx, 'title', 0, 0, 512, 288)) {
      this.drawTitleText(ctx);
      const its = this.items(), my = this.menuY();
      this.plaque(ctx, 176, my - 7, 160, its.length * 18 + 10); // warm walnut menu plaque + brass keyline
      its.forEach((it, i) => UI.drawBtn(ctx, 186, my + i * 18, 140, 16, it.label));
      this.drawCheats(ctx);
      TYPE.drawCentered(ctx, 'M to mute   ·   Space pauses battle', 256, 270, 10, COL.paperhi, { shadow: COL.black });
      return;
    }
    // sky + sea
    ctx.fillStyle = '#1a2a52'; ctx.fillRect(0, 0, 512, 70);
    ctx.fillStyle = '#28406e'; ctx.fillRect(0, 70, 512, 50);
    ctx.fillStyle = '#3a5a90'; ctx.fillRect(0, 120, 512, 30);
    ctx.fillStyle = COL.sea; ctx.fillRect(0, 150, 512, 138);
    // stars
    ctx.fillStyle = COL.white;
    for (let i = 0; i < 24; i++) ctx.fillRect((i * 73) % 512, (i * 37) % 60, 1, 1);
    // moon
    ctx.fillStyle = '#e8e8d8'; ctx.beginPath(); ctx.arc(430, 38, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c8c8b8'; ctx.fillRect(425, 32, 4, 4); ctx.fillRect(434, 42, 3, 3);
    // waves
    ctx.fillStyle = COL.seahi;
    for (let x = 0; x < 512; x += 14) {
      ctx.fillRect(x, 152 + Math.round(Math.sin(x * 0.1 + this.t * 2) * 2), 9, 2);
    }
    // the Dawnchaser sailing by
    const sx = 60 + (this.t * 6) % 480;
    const ix = sx - 30, iy = 150 - 32;
    if (SPR.drawFrame(ctx, 'ext_corvette_human', ix - SPR.SHIP_MX, iy - SPR.SHIP_MY)) {
      SPR.drawFrame(ctx, 'int_corvette_human', ix, iy);
    } else {
      const ext = SPR.shipExterior({ style: 'human', rw: 96, rh: 32, masts: 2, sailPct: 1, hullPct: 1 });
      ctx.drawImage(ext, ix - SPR.SHIP_MX, iy - SPR.SHIP_MY);
      ctx.drawImage(SPR.shipInterior('corvette', 'human'), ix, iy);
    }
    // title
    this.drawTitleText(ctx);
    // menu
    const my = this.menuY();
    this.plaque(ctx, 176, my - 7, 160, this.items().length * 18 + 10);
    this.items().forEach((it, i) => {
      UI.drawBtn(ctx, 186, my + i * 18, 140, 16, it.label);
    });
    this.drawCheats(ctx);
    TYPE.drawCentered(ctx, 'M to mute   ·   Space pauses battle', 256, 281, 10, COL.paperhi, { shadow: COL.black });
  },
  // a warm walnut plaque (translucent) + brass keyline — reads as a deliberate panel over the
  // painting instead of the old flat grey/navy scrim.
  plaque(ctx, x, y, w, h) {
    // darker at the top, warmer below — reads as a wooden plaque, not a grey wash, even over bright sky
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(38,25,12,0.72)'); g.addColorStop(1, 'rgba(26,17,8,0.66)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,238,196,0.12)'; ctx.fillRect(x, y, w, 1); // top sheen
    ctx.strokeStyle = 'rgba(202,162,74,0.7)'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5); ctx.lineWidth = 1;
  },
  drawTitleText(ctx) {
    this.plaque(ctx, 96, 28, 320, 64); // warm title plaque (was a flat grey scrim)
    TYPE.label(ctx, 'MYTHRIL TIDE', 256, 50, 460, 36, COL.mythril, { display: true, shadow: COL.black, shadowDx: 1.4, shadowDy: 1.4 });
    TYPE.drawCentered(ctx, 'An Age of Exploration Saga', 256, 74, 13, COL.brasshi, { italic: true, shadow: COL.black });
  },
};

// ============ INTRO ============
const IntroScreen = {
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
  click() {
    this.page++;
    AUDIO.sfx('click');
    if (this.page >= this.allPages.length) Game.setScreen('map');
  },
  key(k) { if (k === ' ' || k === 'Enter') this.click(); },
  update() {},
  render(ctx) {
    ctx.fillStyle = COL.black; ctx.fillRect(0, 0, 512, 288);
    if (SPR.drawArt(ctx, 'vig_desk', 0, 0, 512, 288)) {
      // gentle vignette + a soft scrim behind the text column so light serif stays legible
      ctx.fillStyle = 'rgba(8,6,14,0.32)'; ctx.fillRect(0, 0, 512, 288);
      const g = ctx.createLinearGradient(0, 120, 0, 282);
      g.addColorStop(0, 'rgba(8,6,14,0)'); g.addColorStop(0.5, 'rgba(8,6,14,0.55)'); g.addColorStop(1, 'rgba(8,6,14,0)');
      ctx.fillStyle = g; ctx.fillRect(30, 120, 452, 162);
    }
    // a large framed painting up top (matte + brass keyline so it reads as a mounted plate)
    const vg = ['armada', 'city', 'island', 'calm'][this.page] || 'island';
    const pw = 196, ph = 110, px = (512 - pw) / 2, py = 8;
    ctx.fillStyle = '#15100a'; ctx.fillRect(px - 3, py - 3, pw + 6, ph + 6);
    if (!SPR.drawArt(ctx, 'vig_' + vg, px, py, pw, ph)) ctx.drawImage(SPR.vignette(vg), px, py, pw, ph);
    ctx.strokeStyle = COL.golddk; ctx.strokeRect(px - 3.5, py - 3.5, pw + 7, ph + 7);
    ctx.strokeStyle = COL.brasshi; ctx.strokeRect(px - 1.5, py - 1.5, pw + 3, ph + 3);
    // narrative text below the painting (blank lines = a smaller paragraph gap)
    let y = 130;
    const lines = this.allPages[this.page] ||
      ["— Ship's Log, Day One —", ''].concat(TYPE.wrap(ctx, DATA.REGION_LOGS[0], 430, 13, { italic: true }));
    for (const line of lines) {
      if (line === '') { y += 8; continue; }
      TYPE.drawCentered(ctx, line, 256, y, 13, /mythril|dawnchaser/i.test(line) ? COL.mythril : COL.paperhi, { italic: true, shadow: COL.black });
      y += 15;
    }
    TYPE.drawCentered(ctx, 'click to continue', 256, 276, 11, Math.floor(Game.time * 2) % 2 ? COL.brasshi : COL.brassdk, { italic: true, shadow: COL.black });
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
      { head: 'The Goal', text: 'Sail east across eight seas to the City of Mythril and sink its Warden. The Armada’s red tide chases you across every chart — linger and it swallows you.' },
      { head: 'Reading the Chart', text: 'Click any island joined to yours by a dotted route. Each is labelled: FIGHT and ELITE are battles, EVENT is a gamble, SOS a distress call, SHOP a trader, CALM open water, and EXIT the way on to the next sea.' },
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
      { head: 'Boarding', text: 'Install a Portal, pick up to two crew standing in the portal room, press BOARD, then click an enemy room. Clear or charm every enemy sailor to capture the ship for a 60% richer haul.' },
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
  // PREV / BACK / NEXT button rects — one source, shared by render (draws) and click (hit-tests).
  _btns() {
    return {
      prev: { x: 60, y: 984, w: 230, h: 66 },
      back: { x: 845, y: 984, w: 230, h: 66 },
      next: { x: 1630, y: 984, w: 230, h: 66 },
    };
  },
  click(x, y) {
    const B = this._btns(), inR = (r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
    if (this.page > 0 && inR(B.prev)) { this.page--; AUDIO.sfx('click'); return; }
    if (this.page < HELP_PAGES.length - 1 && inR(B.next)) { this.page++; AUDIO.sfx('click'); return; }
    if (inR(B.back)) { AUDIO.sfx('back'); Game.setScreen('title'); return; }
  },
  key(k) {
    if (k === 'Escape') Game.setScreen('title');
    if (k === 'ArrowRight' || k === ' ') this.page = Math.min(HELP_PAGES.length - 1, this.page + 1);
    if (k === 'ArrowLeft') this.page = Math.max(0, this.page - 1);
  },
  render(ctx) {
    const pg = HELP_PAGES[this.page], N = HELP_PAGES.length;
    // ---- chrome: parchment / wood tiles + ornate frame, mirroring the combat HUD ----
    const pe = SPR.artEntry('ui_parchment'), we = SPR.artEntry('ui_wood'), frameImg = SPR.artEntry('ui_frame');
    const parchPat = pe ? ctx.createPattern(pe.img, 'repeat') : null;
    const woodPat = we ? ctx.createPattern(we.img, 'repeat') : null;
    // full-bleed parchment background
    if (parchPat) { ctx.fillStyle = parchPat; ctx.fillRect(0, 0, 1920, 1080); ctx.fillStyle = 'rgba(223,205,166,0.12)'; ctx.fillRect(0, 0, 1920, 1080); }
    else { ctx.fillStyle = COL.paper; ctx.fillRect(0, 0, 1920, 1080); }
    const frameLayer = [];
    const draw9 = (img, x, y, w, h, si, di) => {
      const s = si, d = di, iw = img.naturalWidth, ih = img.naturalHeight;
      const sx = [0, s, iw - s], sw = [s, iw - 2 * s, s], dxs = [x, x + d, x + w - d], dws = [d, w - 2 * d, d];
      const sy = [0, s, ih - s], sh = [s, ih - 2 * s, s], dys = [y, y + d, y + h - d], dhs = [d, h - 2 * d, d];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        if (r === 1 && c === 1) continue; // border-only (center stays clear)
        ctx.drawImage(img, sx[c], sy[r], sw[c], sh[r], dxs[c], dys[r], dws[c], dhs[r]);
      }
    };
    // a wood-backed panel with a carved title band (same recipe as combat's panel())
    const panel = (x, y, w, h, title) => {
      if (woodPat) {
        ctx.fillStyle = woodPat; ctx.fillRect(x, y, w, h);
        const gi = ctx.createLinearGradient(x, y, x, y + h);
        gi.addColorStop(0, 'rgba(255,236,198,0.10)'); gi.addColorStop(0.5, 'rgba(20,11,3,0.06)'); gi.addColorStop(1, 'rgba(12,6,1,0.24)');
        ctx.fillStyle = gi; ctx.fillRect(x, y, w, h);
      } else { ctx.fillStyle = COL.woodfr; ctx.fillRect(x, y, w, h); }
      frameLayer.push([x, y, w, h]);
      if (title) {
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, 52); ctx.clip();
        if (woodPat) { ctx.fillStyle = woodPat; ctx.fillRect(x, y, w, 52); }
        const gb = ctx.createLinearGradient(x, y, x, y + 52);
        gb.addColorStop(0, 'rgba(255,238,200,0.16)'); gb.addColorStop(0.45, 'rgba(0,0,0,0)'); gb.addColorStop(1, 'rgba(18,9,2,0.44)');
        ctx.fillStyle = gb; ctx.fillRect(x, y, w, 52); ctx.restore();
        ctx.fillStyle = 'rgba(255,240,205,0.22)'; ctx.fillRect(x, y, w, 1.5);
        ctx.fillStyle = 'rgba(0,0,0,0.30)'; ctx.fillRect(x, y + 50.5, w, 1.5);
        TYPE.draw(ctx, title, x + 22, y + 13, 30, COL.brasshi, { display: true, shadow: 'rgba(16,9,3,0.85)', shadowDx: 1.4, shadowDy: 1.4 });
        TYPE.drawRight(ctx, 'How to Sail  ·  ' + (this.page + 1) + ' / ' + N, x + w - 22, y + 18, 22, '#e7d3a0', { italic: true, shadow: 'rgba(16,9,3,0.8)', shadowDx: 1, shadowDy: 1 });
      }
    };
    // a parchment plaque card with aged rims + brass corner studs (combat's card())
    const card = (cx, cy, cw, ch) => {
      const r = Math.min(7, cw / 2, ch / 2);
      ctx.save(); UI.roundRect(ctx, cx, cy, cw, ch, r); ctx.clip();
      if (parchPat) { ctx.fillStyle = parchPat; ctx.fillRect(cx, cy, cw, ch); ctx.fillStyle = 'rgba(244,232,205,0.30)'; ctx.fillRect(cx, cy, cw, ch); }
      else { ctx.fillStyle = COL.paper; ctx.fillRect(cx, cy, cw, ch); }
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(120,84,40,0.45)'; UI.roundRect(ctx, cx + 2, cy + 2, cw - 4, ch - 4, Math.max(1, r - 1)); ctx.stroke();
      ctx.restore();
      ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(90,60,28,0.95)'; UI.roundRect(ctx, cx + 0.75, cy + 0.75, cw - 1.5, ch - 1.5, r); ctx.stroke();
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(74,51,24,0.5)'; UI.roundRect(ctx, cx + 5.5, cy + 5.5, cw - 11, ch - 11, Math.max(1, r - 3)); ctx.stroke();
      const m = 9, stud = (sx, sy) => {
        ctx.beginPath(); ctx.arc(sx, sy, 2.8, 0, 7); ctx.fillStyle = COL.brassdk; ctx.fill();
        ctx.beginPath(); ctx.arc(sx, sy, 1.8, 0, 7); ctx.fillStyle = COL.brass; ctx.fill();
        ctx.beginPath(); ctx.arc(sx - 0.5, sy - 0.5, 0.9, 0, 7); ctx.fillStyle = COL.brasshi; ctx.fill();
      };
      stud(cx + m, cy + m); stud(cx + cw - m, cy + m); stud(cx + m, cy + ch - m); stud(cx + cw - m, cy + ch - m);
    };
    // a parchment-faced wood-framed button (matches combat's hdBtn), hover-lit
    const btn = (r, label, enabled) => {
      const hov = enabled && Game.mouse.x >= r.x && Game.mouse.x < r.x + r.w && Game.mouse.y >= r.y && Game.mouse.y < r.y + r.h;
      if (hov) Game.hot = true;
      ctx.save(); if (!enabled) ctx.globalAlpha = 0.35;
      if (parchPat) { ctx.fillStyle = parchPat; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.fillStyle = 'rgba(244,232,205,0.30)'; ctx.fillRect(r.x, r.y, r.w, r.h); }
      else { ctx.fillStyle = COL.paper; ctx.fillRect(r.x, r.y, r.w, r.h); }
      if (hov) { ctx.fillStyle = 'rgba(255,236,190,0.34)'; ctx.fillRect(r.x, r.y, r.w, r.h); }
      frameLayer.push([r.x, r.y, r.w, r.h]);
      TYPE.drawCentered(ctx, label, r.x + r.w / 2, r.y + r.h / 2 - 13, 24, COL.inkdk, { display: true });
      ctx.restore();
    };

    // ---- the page: one big wood panel, parchment cards inside ----
    const PX = 46, PY = 36, PW = 1828, PH = 916;
    panel(PX, PY, PW, PH, pg.title);
    // subtitle, italic, just under the title band
    if (pg.sub) TYPE.draw(ctx, pg.sub, PX + 24, PY + 60, 23, '#f0dcb0', { italic: true, shadow: 'rgba(16,9,3,0.8)', shadowDx: 1, shadowDy: 1 });

    // image card on the right (contain-fit, capped so small crops don't blow up)
    const IBX = 968, IBY = PY + 110, IBW = 882, IBH = PH - 150;
    const e = pg.img && SPR.artEntry(pg.img);
    if (e) {
      const nw = e.img.naturalWidth, nh = e.img.naturalHeight;
      const s = Math.min(IBW / nw, IBH / nh, 1.35);
      const dw = Math.round(nw * s), dh = Math.round(nh * s);
      const dx = Math.round(IBX + (IBW - dw) / 2), dy = Math.round(IBY + (IBH - dh) / 2);
      card(dx - 16, dy - 16, dw + 32, dh + 32);
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      UI.roundRect(ctx, dx - 2, dy - 2, dw + 4, dh + 4, 4); ctx.clip();
      ctx.drawImage(e.img, dx, dy, dw, dh);
      ctx.restore();
      ctx.strokeStyle = 'rgba(60,40,18,0.9)'; ctx.lineWidth = 1.5; ctx.strokeRect(dx - 0.5, dy - 0.5, dw + 1, dh + 1);
    }

    // text concept cards stacked on the left
    const TX = 78, TW = 858, headSz = 27, bodySz = 21, lineH = bodySz + 8, pad = 22, innerW = TW - pad * 2;
    // measure each block, then lay out with even gaps in the available column height
    const blocks = pg.items.map((it) => {
      const lines = TYPE.wrap(ctx, it.text, innerW, bodySz);
      const h = pad + headSz + 12 + lines.length * lineH + pad - 4;
      return { it, lines, h };
    });
    const top = PY + 112, colH = PH - 158, used = blocks.reduce((a, b) => a + b.h, 0);
    const gap = blocks.length > 1 ? Math.max(16, Math.min(40, (colH - used) / (blocks.length - 1))) : 0;
    let ty = top;
    for (const blk of blocks) {
      card(TX, ty, TW, blk.h);
      TYPE.draw(ctx, blk.it.head, TX + pad, ty + pad - 2, headSz, COL.inkdk, { display: true });
      // brass rule under the heading (ledger idiom)
      const ry = ty + pad + headSz + 4;
      ctx.strokeStyle = 'rgba(150,108,44,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(TX + pad, ry); ctx.lineTo(TX + TW - pad, ry); ctx.stroke();
      let yy = ry + 10;
      for (const ln of blk.lines) { TYPE.draw(ctx, ln, TX + pad, yy, bodySz, COL.inkmd); yy += lineH; }
      ty += blk.h + gap;
    }

    // ---- nav buttons + page dots (on the parchment, below the panel) ----
    const B = this._btns();
    btn(B.prev, '‹  Prev', this.page > 0);
    btn(B.back, 'Back to Port', true);
    btn(B.next, 'Next  ›', this.page < N - 1);
    const dotsY = 968, dotW = 16;
    const dx0 = 960 - (N * dotW) / 2;
    for (let i = 0; i < N; i++) {
      ctx.beginPath(); ctx.arc(dx0 + i * dotW + dotW / 2, dotsY, i === this.page ? 6 : 4, 0, 7);
      ctx.fillStyle = i === this.page ? COL.brasshi : 'rgba(90,60,28,0.5)'; ctx.fill();
      if (i === this.page) { ctx.strokeStyle = COL.brassdk; ctx.lineWidth = 1.5; ctx.stroke(); }
    }

    // topmost: the dark-wood ornate frame (brass knot corners) over every panel + button
    for (const f of frameLayer) { if (frameImg) draw9(frameImg.img, f[0] - 3, f[1] - 3, f[2] + 6, f[3] + 6, 120, 24); }
    // footer hint on the parchment
    TYPE.drawCentered(ctx, '← → turn the page    ·    Esc returns to port', 960, 1058, 17, '#7a5a2c', { italic: true });
  },
};

// ============ GAME OVER ============
const GameOverScreen = {
  enter(args) {
    this.reason = args.reason || 'THE SEA KEEPS ITS SECRETS.';
    AUDIO.play('gameover');
  },
  update() {},
  click(x, y) {
    if (x >= 130 && x < 250 && y >= 220 && y < 238) { Game.setScreen('title'); }
    if (x >= 262 && x < 382 && y >= 220 && y < 238) { Game.newGame(Game.run ? Game.run.difficulty : 'captain'); Game.setScreen('intro'); }
  },
  key(k) { if (k === 'Enter') { Game.newGame(Game.run ? Game.run.difficulty : 'captain'); Game.setScreen('intro'); } },
  render(ctx) {
    if (SPR.drawArt(ctx, 'vig_gameover', 0, 0, 512, 288)) {
      ctx.fillStyle = 'rgba(10,10,20,0.5)'; ctx.fillRect(0, 0, 512, 288);
    } else {
      ctx.fillStyle = '#10101e'; ctx.fillRect(0, 0, 512, 288);
      ctx.fillStyle = COL.sealow; ctx.fillRect(0, 180, 512, 108);
      ctx.save();
      ctx.translate(256, 200); ctx.rotate(0.5);
      ctx.fillStyle = '#2a2a3a'; ctx.fillRect(-40, -8, 80, 14); ctx.fillRect(-6, -50, 4, 44);
      ctx.restore();
      ctx.fillStyle = COL.seahi;
      for (let x = 0; x < 512; x += 12) ctx.fillRect(x, 182 + Math.round(Math.sin(x * 0.2 + Game.time) * 2), 8, 2);
    }
    TYPE.drawCentered(ctx, 'Lost With All Hands', 256, 52, 30, COL.red, { display: true, shadow: COL.black });
    TYPE.drawCentered(ctx, this.reason, 256, 92, 13, COL.paperhi, { italic: true, shadow: COL.black });
    if (Game.run) {
      const s = Game.run.stats;
      TYPE.drawCentered(ctx, 'Region ' + (Game.run.region + 1) + '  ·  ' + s.jumps + ' islands  ·  ' + s.kills + ' ships sunk  ·  ' + s.shards + ' shards won', 256, 118, 12, '#b6a684', { shadow: COL.black });
    }
    TYPE.drawCentered(ctx, 'The New World remains a rumor.', 256, 142, 12, COL.inkfade, { italic: true, shadow: COL.black });
    UI.drawBtn(ctx, 130, 220, 120, 18, 'Title');
    UI.drawBtn(ctx, 262, 220, 120, 18, 'Sail Again');
  },
};

// ============ VICTORY ============
const VictoryScreen = {
  enter() {
    AUDIO.play('victory');
    this.t = 0;
  },
  update(dt) { this.t += dt; },
  click(x, y) {
    if (y >= 248 && y < 276 && x >= 196 && x < 316) Game.setScreen('title');
  },
  key(k) { if (k === 'Enter') Game.setScreen('title'); },
  render(ctx) {
    // AI city panorama backdrop when available
    if (SPR.drawArt(ctx, 'vig_city', 0, 0, 512, 288)) {
      ctx.fillStyle = 'rgba(11,10,22,0.55)';
      ctx.fillRect(0, 0, 512, 110);
      ctx.fillRect(0, 222, 512, 66);
      TYPE.drawCentered(ctx, 'The City of Mythril is Real', 256, 14, 22, COL.mythril, { display: true, shadow: COL.black });
      TYPE.drawCentered(ctx, 'The Warden lies broken in the harbor mouth.', 256, 50, 12, COL.paperhi, { italic: true, shadow: COL.black });
      TYPE.drawCentered(ctx, 'The Dawnchaser rides low, holds bursting with mythril.', 256, 64, 12, COL.paperhi, { italic: true, shadow: COL.black });
      TYPE.drawCentered(ctx, 'You are the richest crew in two worlds.', 256, 78, 12, COL.brasshi, { italic: true, shadow: COL.black });
      if (Game.run) {
        const s = Game.run.stats;
        TYPE.drawCentered(ctx, s.jumps + ' islands  ·  ' + s.kills + ' ships bested  ·  ' + s.shards + ' shards plundered', 256, 230, 12, COL.paperhi, { shadow: COL.black });
        const names = Game.ship.aliveCrew().map(c => c.name).join(', ');
        TYPE.drawCentered(ctx, 'Survivors: ' + names.slice(0, 72), 256, 244, 11, COL.gold, { italic: true, shadow: COL.black });
      }
      UI.drawBtn(ctx, 196, 256, 120, 18, 'The End');
      return;
    }
    ctx.fillStyle = '#1a2a52'; ctx.fillRect(0, 0, 512, 150);
    ctx.fillStyle = COL.sea; ctx.fillRect(0, 150, 512, 138);
    // mythril city skyline
    ctx.fillStyle = COL.teal;
    ctx.fillRect(0, 120, 512, 30);
    ctx.fillStyle = COL.mythril;
    for (let i = 0; i < 9; i++) {
      const bx = 30 + i * 55, bh = 16 + (i * 37) % 26;
      ctx.fillRect(bx, 150 - bh, 18, bh);
      ctx.fillStyle = COL.white; ctx.fillRect(bx + 6, 150 - bh - 4, 4, 4);
      ctx.fillStyle = COL.mythril;
    }
    // sparkles
    for (let i = 0; i < 16; i++) {
      if (Math.floor(this.t * 3 + i) % 3 === 0) {
        ctx.fillStyle = COL.white;
        ctx.fillRect((i * 101 + 40) % 500, 40 + (i * 53) % 90, 2, 2);
      }
    }
    // mythril pile on deck
    ctx.fillStyle = COL.wood; ctx.fillRect(150, 210, 212, 16);
    ctx.fillStyle = COL.mythril;
    for (let i = 0; i < 30; i++) {
      ctx.fillRect(180 + (i * 17) % 150, 196 - (i * 7) % 18, 8, 6);
    }
    ctx.fillStyle = COL.white;
    ctx.fillRect(220, 186, 3, 3); ctx.fillRect(280, 192, 3, 3);

    TYPE.drawCentered(ctx, 'THE CITY OF MYTHRIL', 256, 8, 22, COL.mythril, { display: true, shadow: COL.black });
    TYPE.drawCentered(ctx, 'IS REAL', 256, 34, 22, COL.gold, { display: true, shadow: COL.black });
    TYPE.drawCentered(ctx, 'The Warden lies broken in the harbor mouth.', 256, 64, 12, COL.ltgrey, { italic: true, shadow: COL.black });
    TYPE.drawCentered(ctx, 'The Dawnchaser rides low, holds bursting with mythril.', 256, 78, 12, COL.ltgrey, { italic: true, shadow: COL.black });
    TYPE.drawCentered(ctx, 'You are the richest crew in two worlds.', 256, 92, 12, COL.gold, { italic: true, shadow: COL.black });
    if (Game.run) {
      const s = Game.run.stats;
      TYPE.drawCentered(ctx, s.jumps + ' islands  —  ' + s.kills + ' ships bested  —  ' + s.shards + ' shards plundered', 256, 230, 12, COL.ltgrey, { shadow: COL.black });
      const names = Game.ship.aliveCrew().map(c => c.name).join(', ');
      TYPE.drawCentered(ctx, 'Survivors: ' + names, 256, 244, 12, COL.gold, { italic: true, shadow: COL.black });
    }
    UI.drawBtn(ctx, 196, 250, 120, 18, 'THE END');
  },
};

// ============ JUKEBOX (the Gramophone Room) ============
// A listening room reachable from the title. Every track aboard, grouped by
// sea / battle / faction, click to audition. Pure presentation - no game state.
const JukeboxScreen = {
  COLS: [32, 184, 336], COLW: 144, ROW_Y: 88, ROW_H: 17, PLATE_H: 15,
  enter() { AUDIO.stopMusic(); this.nowKey = null; this.nowVar = 0; this.now = null; },
  update() {},
  // one entry per catalogue item with its name rect + variant-button rects
  rows() {
    const out = [];
    MUSIC_CATALOG.forEach((grp, ci) => grp.items.forEach((it, ri) => {
      const x = this.COLS[ci], y = this.ROW_Y + ri * this.ROW_H, n = it.variants;
      const bw = 12, bg = 2, btot = n * bw + (n - 1) * bg, bx0 = x + this.COLW - btot - 7;
      const vb = [];
      for (let v = 0; v < n; v++) vb.push({ v, x: bx0 + v * (bw + bg), y: y + 1, w: bw, h: 13 });
      const key = it.kind === 'solo' ? 'solo:' + it.id : it.kind + ':' + it.r;
      out.push({ it, key, name: it.name, style: it.style, x, y, w: this.COLW, nameMax: bx0 - x - 12, vb });
    }));
    return out;
  },
  specFor(it, v) { return it.kind === 'solo' ? { kind: 'solo', id: it.id, variant: v } : { kind: it.kind, r: it.r, variant: v }; },
  inRect(x, y, rx, ry, rw, rh) { return U.inRect(x, y, rx, ry, rw, rh); },
  click(x, y) {
    if (this.inRect(x, y, 32, 268, 90, 16)) { AUDIO.stopMusic(); AUDIO.play('title'); Game.setScreen('title'); AUDIO.sfx('back'); return; }
    if (this.inRect(x, y, 390, 268, 90, 16)) { AUDIO.stopMusic(); this.nowKey = null; this.now = null; AUDIO.sfx('back'); return; }
    for (const r of this.rows()) for (const b of r.vb) if (this.inRect(x, y, b.x, b.y, b.w, b.h)) {
      AUDIO.audition(this.specFor(r.it, b.v)); this.nowKey = r.key; this.nowVar = b.v; this.now = r; AUDIO.sfx('click'); return;
    }
  },
  key(k) { if (k === 'Escape') { AUDIO.stopMusic(); AUDIO.play('title'); Game.setScreen('title'); } },
  render(ctx) {
    // a real WALNUT gramophone-cabinet interior (no flat digital void) — tiled wood darkened
    // so the parchment record-labels pop on it, with a soft vignette; then the brass frame.
    if (!UI.tileFill(ctx, 'ui_wood', 0, 0, 512, 288, 'rgba(18,11,4,0.58)')) {
      const g = ctx.createLinearGradient(0, 0, 0, 288);
      g.addColorStop(0, COL.cabinhi); g.addColorStop(0.5, COL.cabin); g.addColorStop(1, COL.cabinlo);
      ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 288);
    }
    { const vg = ctx.createRadialGradient(256, 150, 80, 256, 150, 300); // gentle cabinet vignette
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(8,5,2,0.45)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, 512, 288); }
    UI.woodBorder(ctx, 24);
    TYPE.label(ctx, 'THE GRAMOPHONE ROOM', 256, 40, 420, 22, COL.gold, { display: true, shadow: COL.black, shadowDx: 1.2, shadowDy: 1.2 });
    TYPE.drawCentered(ctx, 'three songs per berth - tap 1, 2 or 3 to listen', 256, 58, 11, COL.brasshi, { italic: true, shadow: COL.black });
    const mx = Game.mouse.x, my = Game.mouse.y;
    // column headers with the rule placed BELOW the text (no descender clipping)
    MUSIC_CATALOG.forEach((grp, ci) => {
      const cx = this.COLS[ci] + this.COLW / 2;
      TYPE.drawCentered(ctx, grp.group, cx, 70, 12, COL.brasshi, { shadow: COL.black });
      ctx.strokeStyle = COL.brassdk; ctx.beginPath(); ctx.moveTo(this.COLS[ci] + 6, 84.5); ctx.lineTo(this.COLS[ci] + this.COLW - 6, 84.5); ctx.stroke();
    });
    for (const r of this.rows()) {
      const itemActive = r.key === this.nowKey;
      const hoverRow = this.inRect(mx, my, r.x, r.y, r.w, this.PLATE_H);
      // parchment "record label" card (dark ink text), brass keyline when playing
      ctx.fillStyle = itemActive ? COL.paperhi : (hoverRow ? COL.papermd : COL.paperlo);
      UI.roundRect(ctx, r.x, r.y, r.w, this.PLATE_H, 3); ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = itemActive ? COL.gold : COL.brassdk;
      UI.roundRect(ctx, r.x + 0.5, r.y + 0.5, r.w - 1, this.PLATE_H - 1, 3); ctx.stroke();
      const ns = TYPE.fitSize(ctx, r.name, r.nameMax, 11);
      TYPE.draw(ctx, r.name, r.x + 7, r.y + this.PLATE_H / 2, ns, itemActive ? COL.inkdk : (hoverRow ? COL.inkdk : COL.inkmd), { baseline: 'middle' });
      for (const b of r.vb) {
        const on = itemActive && b.v === this.nowVar;
        const bh = this.inRect(mx, my, b.x, b.y, b.w, b.h);
        // raised brass selector chip
        ctx.fillStyle = on ? COL.gold : (bh ? COL.brass : COL.brassdk);
        UI.roundRect(ctx, b.x, b.y, b.w, b.h, 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,247,220,0.30)'; ctx.fillRect(b.x + 2, b.y + 1, b.w - 4, 1); // top sheen
        ctx.strokeStyle = on ? COL.brasshi : (bh ? COL.brasshi : COL.brassdk);
        UI.roundRect(ctx, b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, 2); ctx.stroke();
        TYPE.drawCentered(ctx, String(b.v + 1), b.x + b.w / 2, b.y + b.h / 2 - 0.5, 9, on ? COL.inkdk : (bh ? COL.woodfrdk : COL.ink), { baseline: 'middle' });
      }
    }
    // now-playing: an engraved BRASS nameplate (raised plate, dark engraved text)
    ctx.fillStyle = COL.brassdk; UI.roundRect(ctx, 32, 232, 448, 22, 4); ctx.fill();
    ctx.fillStyle = COL.brass; UI.roundRect(ctx, 33, 233, 446, 20, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,247,220,0.28)'; ctx.fillRect(36, 234, 440, 1); // top sheen
    ctx.strokeStyle = COL.brasshi; UI.roundRect(ctx, 32.5, 232.5, 447, 21, 4); ctx.stroke();
    if (this.now) TYPE.draw(ctx, 'Now playing:  ' + this.now.name + '  -  variant ' + (this.nowVar + 1) + '  -  ' + this.now.style, 42, 237, 13, COL.cabinlo, { maxWidth: 432, fit: 'ellipsis', shadow: 'rgba(255,247,220,0.4)', shadowDx: 0.6, shadowDy: 0.6 });
    else TYPE.draw(ctx, 'The needle rests. Choose a record, Captain.', 42, 237, 13, COL.wooddk, { italic: true, shadow: 'rgba(255,247,220,0.35)', shadowDx: 0.6, shadowDy: 0.6 });
    UI.drawBtn(ctx, 32, 268, 90, 16, '< BACK');
    UI.drawBtn(ctx, 390, 268, 90, 16, 'STOP');
  },
};

// boot when DOM ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => Game.boot());
  else Game.boot();
}
