// MYTHRIL TIDE - combat.js : real-time battle with pause, FTL-style
'use strict';

const SEA_Y = 196;       // waterline on combat screen
const KEEL_Y = 190;      // bottom of interior blocks
const HUD_Y = 224;

class Battle {
  // enemyDef from DATA.makeEnemy / makeBoss ; opts {hazard, canFlee, tier, elite, intro}
  constructor(enemyDef, opts) {
    opts = opts || {};
    this.p = Game.ship;
    this.e = buildEnemyShip(enemyDef);
    this.edef = enemyDef;
    this.tier = opts.tier || 1;
    this.elite = !!opts.elite;
    this.hazard = opts.hazard || 'none';
    this.canFlee = opts.canFlee !== false && !enemyDef.boss;
    this.paused = false;
    this.time = 0;
    this.simTime = 0;     // sim/animation clock — advances ONLY when unpaused, so crew pose
                          // cycles freeze while the game is paused (this.time keeps running for
                          // ambient FX + the pause overlay). The deck view has no simTime and
                          // falls back to this.time (it is never paused).
    this.state = 'fight'; // fight | won | captured | lost | fled | enemyFled | surrendered
    this.stateT = 0;
    this.projectiles = [];
    this.ripples = []; // ward-impact shockwave rings
    this.beams = [];
    this.particles = [];
    this.logs = [];
    this.selCrew = new Set();
    this.selWeapon = -1;
    this.gateMode = false;
    this.hexMode = false;  // Storm Conduit: pick an enemy system to jam
    this.songMode = false; // Siren's Song: pick an enemy room to charm a sailor
    this.aiT = 0;
    this.hazT = U.rf(6, 12);
    this.surrenderOffer = null;
    this.flash = 0;
    this.shake = 0;

    this.p.settle();
    this.e.settle();
    if (this.p.totalAlloc() === 0) this.p.autoAlloc();
    for (const w of this.p.weapons) { w.on = true; w.target = -1; }
    if (Game.run && Game.run.augs.includes('tidecaller_pearl')) {
      this.p.wards.layers = this.p.wardMax();
    }
    // LEGENDARY: Emberheart Core - open with a full broadside
    if (Game.run && Game.run.augs.includes('emberheart')) {
      for (const w of this.p.weapons) w.charge = DATA.WEAPONS[w.key].charge;
      this.log('THE EMBERHEART ROARS - ALL GUNS HOT!');
    }
    // charm registry — Siren's Crown legendary + Siren's Song system, both directions
    this.charms = [];
    if (Game.run && Game.run.augs.includes('sirens_crown') && this.e.aliveCrew().length >= 1 && !enemyDef.boss) {
      const victim = U.pick(this.e.aliveCrew());
      const lone = this.e.aliveCrew().length === 1;
      this.charm(victim, 30, null, true); // hold: a 30s defection that won't auto-capture the ship
      this.log(victim.name + (lone ? ' ABANDONS THE HELM — LOST TO THE CROWN!' : ' HEARS THE CROWN AND TURNS ON THE CREW!'));
    }
    this._ghostUsed = false;
    if (enemyDef.boss) this.e.wards.layers = this.e.wardMax();
    this.log(opts.intro || ('ENEMY SIGHTED: ' + this.e.name));
    if (this.hazard !== 'none') this.log('HAZARD: ' + this.hazardName());
  }

  hazardName() {
    return { storm: 'LIGHTNING STORM', kraken: 'KRAKEN WATERS', whirlpool: 'WHIRLPOOL', fog: 'CURSED FOG', reef: 'RAZOR REEFS' }[this.hazard] || '';
  }
  log(msg) {
    // collapse a repeated message into a counter ("...×2") instead of stacking duplicates
    const last = this.logs[this.logs.length - 1];
    if (last && last.msg === msg) { last.t = 5; last.n = (last.n || 1) + 1; return; }
    this.logs.push({ msg, t: 5, n: 1 });
    if (this.logs.length > 3) this.logs.shift();
  }
  // flip a sailor to the OTHER side for `secs` (both directions); buffMul raises HP + melee.
  charm(victim, secs, buffMul, hold) {
    if (!victim || victim.dead) return;
    const from = victim.owner;
    victim.owner = from === 'player' ? 'enemy' : 'player';
    // hold = a temporary distraction that does NOT count as a capture (Siren's Crown) — vs Siren's
    // Song, which CAN capture by charming the last hostile. So the Crown disrupts; the Song converts.
    const e = { c: victim, until: secs, from, hpAdd: 0, hold: !!hold };
    if (buffMul && buffMul > 1) {
      e.hpAdd = Math.round(victim.maxhp * (buffMul - 1));
      victim.maxhp += e.hpAdd; victim.hp += e.hpAdd; victim._dmgMul = buffMul;
    }
    this.charms.push(e);
  }
  uncharm(e) {
    if (!e.c.dead) { e.c.owner = e.from; if (e.hpAdd) { e.c.maxhp -= e.hpAdd; e.c.hp = Math.min(e.c.hp, e.c.maxhp); } }
    e.c._dmgMul = 1;
  }
  // decision 4(a): a charmed sailor with no one to fight in its room heads toward the
  // nearest hostile (its former crew), reusing pathfinding — light FTL-style roaming.
  roamCharmed() {
    for (const e of this.charms) {
      const c = e.c; if (c.dead || (c.path && c.path.length)) continue;
      const ship = e.from === 'player' ? this.p : this.e; // the deck the charmed sailor stands on
      const foes = ship.crew.filter(o => o !== c && !o.dead && o.aboard === 'home' && o.owner === e.from);
      if (foes.length) { if (!foes.some(o => o.roomId === c.roomId)) ship.orderCrew(c, foes[0].roomId); continue; } // go brawl
      // no crew left to fight -> go wreck a system (FTL mind-control sabotage). Stay if already on a live one.
      const cur = ship.rooms[c.roomId];
      if (cur && cur.key && ship.sysLv[cur.key] && cur.dmg < ship.sysLv[cur.key]) continue;
      const tgt = ship.rooms.find(r => r.key && ship.sysLv[r.key] && r.dmg < ship.sysLv[r.key]) || ship.rooms.find(r => r.key && ship.sysLv[r.key]);
      if (tgt && tgt.id !== c.roomId) ship.orderCrew(c, tgt.id);
    }
  }

  // ---------- geometry ----------
  pX() { return 42; }
  sinkF(ship) {
    // 0..1 sinking progress for a defeated ship (FTL-style death animation, but wet).
    // A CAPTURED ship does NOT sink — you took her intact as a prize; she stays afloat.
    if (this.state === 'won' && ship === this.e) return Math.min(1, this.stateT / 3.8);
    if (this.state === 'lost' && ship === this.p) return Math.min(1, this.stateT / 3.8);
    return 0;
  }
  pY() { return KEEL_Y - this.p.rh + Math.round(Math.sin(this.time * 1.1) * 1.5) + Math.round(Math.pow(this.sinkF(this.p), 2) * 76); }
  eX() { return 512 - 42 - this.e.rw; }
  eY() { return KEEL_Y - this.e.rh + Math.round(Math.sin(this.time * 1.3 + 2) * 1.5) + Math.round(Math.pow(this.sinkF(this.e), 2) * 76); }

  roomRect(ship, r) {
    if (ship === this.p) {
      return { x: this.pX() + r.x * TILE, y: this.pY() + r.y * TILE, w: r.w * TILE, h: r.h * TILE };
    }
    // mirrored
    const x = this.eX() + (this.e.rw - (r.x + r.w) * TILE);
    return { x, y: this.eY() + r.y * TILE, w: r.w * TILE, h: r.h * TILE };
  }
  crewScreenPos(c) {
    const home = this.p.crew.includes(c) ? this.p : this.e;
    const loc = c.aboard === 'home' ? home : (home === this.p ? this.e : this.p);
    if (loc === this.p) return { x: this.pX() + c.px, y: this.pY() + c.py, flip: false, loc };
    return { x: this.eX() + this.e.rw - c.px - 12, y: this.eY() + c.py, flip: true, loc };
  }
  mountPos(ship, i) {
    // guns are mounted on the EXTERIOR weather deck (FTL-style hull mounts);
    // the interior WEAPONS room is only the control room that powers them.
    if (ship === this.p) return { x: this.pX() + 14 + i * 32, y: this.pY() - 12 };
    return { x: this.eX() + ship.rw - 30 - i * 32, y: this.eY() - 12 };
  }
  // The MUZZLE (emitter) of a gun's deck sprite, in world px — where beams/shots/flashes emerge.
  // The sprite is drawn in a 24x12 box at (dx, m.y-5), barrel pointing right; the enemy's is
  // mirrored. `wd.muzzle = [mx,my]` is the emitter point inside that box (default by family); the
  // recoiled `dx` makes the origin shake with the gun. Mirror handled for the enemy.
  muzzleWorld(ship, i, w, wd) {
    const isP = ship === this.p, m = this.mountPos(ship, Math.min(i | 0, 3));
    const rec = (w && w._recoil > 0) ? Math.round(Math.min(0.2, w._recoil) * 15) : 0;
    const dx = isP ? m.x - rec : m.x + rec;
    const def = (wd.family === 'magic' || wd.family === 'horn') ? [20, 3] : (wd.type === 'missile' ? [22, 7] : [22, 6]);
    const mz = wd.muzzle || def;
    return { x: isP ? dx + mz[0] : dx + 24 - mz[0], y: m.y - 5 + mz[1] };
  }

  // ---------- update ----------
  update(dt) {
    this.time += dt;
    if (!this.paused) this.simTime += dt;   // crew animation clock — frozen while paused
    if (this.flash > 0) this.flash -= dt;
    if (this.shake > 0) this.shake -= dt;
    for (const l of this.logs) l.t -= dt;
    // cosmetic timers - decayed here (dt-based) so they no longer run at render
    // frame-rate (~0.016/frame ~= dt at 60fps for the tentacle; 3/s and 2.4/s wards)
    if (this.tentacleT > 0) this.tentacleT -= dt;
    for (const sh of [this.p, this.e]) {
      if (sh._wardFlash > 0) sh._wardFlash -= dt * 3;
      if (sh._wardBreak > 0) sh._wardBreak -= dt * 2.4;
    }

    if (this.state !== 'fight') {
      for (const e of this.charms) this.uncharm(e); this.charms = []; // charms fade when the fight ends
      this.stateT += dt;
      // the loser settles into the sea: rooms flood, bubbles and flotsam rise
      for (const sh of [this.p, this.e]) {
        const f = this.sinkF(sh);
        if (f > 0) {
          for (const r of sh.rooms) r.water = Math.min(1, r.water + dt * 0.9);
          const sx = sh === this.p ? this.pX() : this.eX();
          if (Math.random() < 0.5) this.particles.push({ x: sx + U.rf(0, sh.rw), y: SEA_Y + U.rf(0, 4), vx: U.rf(-12, 12), vy: U.rf(-46, -14), grav: 110, life: 0.7, col: COL.ltblue, size: 2 });
          if (Math.random() < 0.3) this.particles.push({ x: sx + U.rf(0, sh.rw), y: SEA_Y + 2, vx: U.rf(-8, 8), vy: U.rf(-20, -6), grav: 30, life: 1.1, col: '#7a5230', size: 2 });
        }
      }
      this.updateFx(dt);
      // sinking deaths get the full funeral; a capture holds a short prize beat (no sinking)
      const overTime = (this.state === 'won' || this.state === 'lost') ? 4.2 : (this.state === 'captured' ? 2.6 : 1.6);
      if (this.stateT > overTime) Game.endBattle(this);
      return;
    }
    if (this.paused) return;

    // charm timers (both directions: Siren's Crown + Siren's Song)
    for (let i = this.charms.length - 1; i >= 0; i--) {
      const e = this.charms[i];
      e.until -= dt;
      if (e.until <= 0 || e.c.dead) {
        if (!e.c.dead) this.log('THE SONG OVER ' + e.c.name + ' FADES.');
        this.uncharm(e); this.charms.splice(i, 1);
      }
    }

    this.p.owner = 'player'; this.e.owner = 'enemy';
    this.p.tick(dt, this);
    this.e.tick(dt, this);

    // fire ready player weapons (self-cast bombs aim at YOUR ship)
    this.p.weapons.forEach((w, i) => {
      const wd = DATA.WEAPONS[w.key];
      if (w.on && w.target >= 0 && this.weaponReady(w, wd)) {
        this.fireWeapon(this.p, wd.selfCast ? this.p : this.e, w, i);
      }
    });
    // enemy AI
    this.aiT -= dt;
    if (this.aiT <= 0) { this.aiT = 1; this.enemyAI(); this.roamCharmed(); }
    this.e.weapons.forEach((w, i) => {
      const wd = DATA.WEAPONS[w.key];
      if (w.on && this.weaponReady(w, wd)) {
        if (wd.selfCast) {
          // heal-bombs: pick their most wounded manned room
          let best = null, bestHurt = 0;
          for (const r of this.e.rooms) {
            const hurt = occupantsOf(this.e, r.id, this).reduce((a, c) => a + (c.maxhp - c.hp), 0);
            if (hurt > bestHurt) { bestHurt = hurt; best = r; }
          }
          if (!best) return;
          w.target = best.id;
          this.fireWeapon(this.e, this.e, w, i);
        } else {
          if (wd.type === 'beam') {
            w.beamAim = this.pickEnemyBeamAim(wd); w.target = 0;
          } else {
            w.target = this.pickEnemyTarget(wd);
          }
          this.fireWeapon(this.e, this.p, w, i);
        }
      }
    });

    // gunport recoil decay
    for (const w of this.p.weapons.concat(this.e.weapons)) if (w._recoil > 0) w._recoil -= dt;

    this.updateFamiliars(dt);
    this.updateProjectiles(dt);
    this.updateSweeps(dt);
    this.updateFx(dt);

    // hazards
    this.hazT -= dt;
    if (this.hazT <= 0) this.hazardStrike();

    // boss taunts at hull thresholds
    if (this.e.boss) {
      const frac = this.e.hull / this.e.hullMax;
      if (!this._taunt1 && frac < 0.66) {
        this._taunt1 = true;
        this.log('THE WARDEN: "TURN BACK. THE CITY KEEPS ITSELF."');
      }
      if (!this._taunt2 && frac < 0.33) {
        this._taunt2 = true;
        this.log(this.e.stage === 2 ? 'THE WARDEN: "...THE CITY... MUST... KEEP..."' : 'THE WARDEN: "A THOUSAND SHIPS LIE BENEATH US. JOIN THEM."');
      }
    }
    // long battles resolve themselves: enemies disengage, the Warden enrages
    if (this.time > 120) {
      if (this.e.boss && !this.e.enrage) {
        this.e.enrage = true;
        this.log('THE WARDEN BLAZES WITH FURY!');
      } else if (!this.e.boss && !this.e.fleeing && this.e.fleeAt < 0.99) {
        this.e.fleeAt = 0.99;
        this.log('THE ENEMY HAS HAD ENOUGH OF THIS!');
      }
    }

    // player fleeing
    if (this.p.fleeing) {
      const ok = this.p.mannedBy('helm', this) && this.p.powered('sails') > 0;
      if (ok) {
        this.p.escape += dt / Math.max(6, 16 - this.p.powered('sails') * 1.5);
        if (this.p.escape >= 1) { this.state = 'fled'; this.banner = 'YOU SLIP AWAY!'; AUDIO.sfx('splash'); }
      }
    }
    // enemy fleeing
    if (this.e.fleeAt > 0 && this.e.hull <= this.e.hullMax * this.e.fleeAt && !this.e.fleeing) {
      this.e.fleeing = true; this.log('THE ENEMY TURNS TO RUN!');
    }
    if (this.e.fleeing) {
      // a ship can only run with a manned, working helm AND powered sails -
      // wreck their rigging or navigation and they are pinned in place.
      const canRun = this.e.mannedBy('helm', this) && this.e.sysEff('helm') > 0 && this.e.powered('sails') > 0;
      if (canRun) {
        this.e._pinned = false;
        this.e.escape += dt / 17;
        if (this.e.escape >= 1) {
          // kills any boarders you have over there
          for (const c of this.p.crew) if (!c.dead && c.aboard === 'away') this.p.killCrew(c, this);
          this.state = 'enemyFled'; this.banner = 'THE ENEMY ESCAPES!';
        }
      } else if (!this.e._pinned) {
        this.e._pinned = true;
        this.log('THEIR RIGGING IS CRIPPLED - THEY CANNOT RUN!');
      }
    }
    // surrender offer
    if (this.e.surrenders && !this.e.surrendered && !this.surrenderOffer &&
        (this.e.hull <= this.e.hullMax * 0.4 || this.e.aliveCrew().length <= 1) && this.e.hull > 0) {
      this.e.surrendered = true;
      this.surrenderOffer = { shards: Math.round(DATA.REWARD(this.tier, this.elite) * 1.1), rune: U.ri(1, 2) };
      this.paused = true;
      AUDIO.sfx('alarm');
    }
    // enemy boarding
    if (this.edef.boarders && this.e.powered('brinegate') > 0 && this.e.gateCd <= 0) {
      this.e.gateCd = 26;
      const senders = this.e.aliveCrew().filter(c => c.aboard === 'home' && this.e.rooms[c.roomId].key !== 'helm').slice(0, 2);
      const targets = this.p.rooms.filter(r => r.key && this.p.sysLv[r.key]);
      if (senders.length && targets.length) {
        const tr = U.pick(targets);
        for (const c of senders) {
          c.aboard = 'away'; c.path = [];
          c.roomId = tr.id;
          const sp = this.p.slotPos(tr.id, U.ri(0, tr.w - 1));
          c.px = sp.x; c.py = sp.y;
        }
        AUDIO.sfx('teleport');
        this.log('BOARDERS IN THE ' + (DATA.SYSTEMS[tr.key] ? DATA.SYSTEMS[tr.key].name.toUpperCase() : 'HOLD') + '!');
      }
    }
    // enemy fog veil
    if (this.e.sysLv.fogveil > 0 && this.e.powered('fogveil') > 0 && this.e.veilCd <= 0 && this.projectiles.some(pr => pr.targetShip === this.e)) {
      if (U.chance(dt * 1.2)) { this.e.veilT = 4; this.e.veilCd = 18; this.log('THE ENEMY SLIPS INTO FOG!'); }
    }
    // enemy Storm Conduit: jam one of YOUR systems
    if (this.e.sysLv.stormhex > 0 && this.e.powered('stormhex') > 0 && this.e.hexCd <= 0) {
      const bars = this.e.powered('stormhex');
      const targets = this.p.rooms.filter(r => r.key && this.p.sysLv[r.key] && r.ion <= 0);
      if (targets.length && U.chance(dt * 0.5)) {
        const tr = U.pick(targets);
        tr.ion = Math.max(tr.ion, TUNING.hexJamSecs[bars]); this.e.hexCd = TUNING.hexCdSecs[bars];
        this.flash = 0.2; AUDIO.sfx('ion');
        this.log('ENEMY LIGHTNING JAMS YOUR ' + DATA.SYSTEMS[tr.key].name.toUpperCase() + '!');
      }
    }
    // enemy Siren's Song: charm one of your sailors (never your last loyal one; merfolk resist)
    if (this.e.sysLv.sirensong > 0 && this.e.powered('sirensong') > 0 && this.e.songCd <= 0) {
      const bars = this.e.powered('sirensong');
      const loyal = this.p.aliveCrew().filter(c => c.owner === 'player');
      const victims = loyal.filter(c => c.aboard === 'home' && c.race !== 'merfolk');
      if (loyal.length > 1 && victims.length && U.chance(dt * 0.4)) {
        const v = U.pick(victims);
        this.e.songCd = TUNING.songCdSecs[bars];
        this.charm(v, TUNING.songCharmSecs[bars], TUNING.songBuffMul[bars]);
        AUDIO.sfx('teleport');
        this.log('THE ENEMY SONG TURNS ' + v.name.toUpperCase() + ' AGAINST YOU!');
      }
    }

    // win / loss
    if (this.e.hull <= 0 && this.state === 'fight') {
      for (const c of this.p.crew) if (!c.dead && c.aboard === 'away') this.p.killCrew(c, this);
      this.state = 'won'; this.banner = 'ENEMY SHIP DESTROYED!';
      this.boom(this.eX() + this.e.rw / 2, this.eY() + this.e.rh / 2, 26);
      AUDIO.sfx('explode');
    } else if (this.e.crew.filter(c => !c.dead && (c.owner !== 'player' || this.charms.some(ch => ch.c === c && ch.hold))).length === 0 && this.state === 'fight') {
      // captured when no hostile crew remain — killed OR charmed over to us (Siren's Song).
      // a "hold" charm (Siren's Crown) counts as still-aboard, so it disrupts but never auto-captures.
      this.state = 'captured'; this.banner = 'SHIP CAPTURED! THE HOLD IS YOURS!';
      AUDIO.sfx('levelup');
    }
    if ((this.p.hull <= 0 || this.p.aliveCrew().length === 0) && this.state === 'fight') {
      this.state = 'lost'; this.banner = this.p.hull <= 0 ? 'THE DAWNCHASER GOES DOWN!' : 'YOUR CREW IS LOST!';
      this.boom(this.pX() + this.p.rw / 2, this.pY() + this.p.rh / 2, 26);
      AUDIO.sfx('explode');
    }
  }

  // advance in-flight shots: familiar defenses, ward/evasion checks, then impact
  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.delay -= dt;
      if (pr.delay > 0) continue;
      pr.t += dt / pr.dur;
      // defensive familiars guard the player's ship
      if (pr.targetShip === this.p && pr.srcShip === this.e && !pr._defChecked && pr.t > 0.45) {
        pr._defChecked = true;
        const act = this.activeFamiliars();
        const wdd = DATA.WEAPONS[pr.wkey];
        if (wdd.type === 'missile' && act.includes('squallsprite') && U.chance(0.6)) {
          this.projectiles.splice(i, 1);
          const pos = this.projPos(pr);
          for (let s = 0; s < 8; s++) this.particles.push({ x: pos.x, y: pos.y, vx: U.rf(-50, 50), vy: U.rf(-40, 10), life: 0.4, col: COL.white, size: 2 });
          this.splashFx(pos.x + U.ri(-6, 6), SEA_Y);
          this._famAct = this._famAct || {}; this._famAct.squallsprite = this.time;
          AUDIO.sfx('miss');
          this.log('THE SQUALL SPRITE GUSTS THE TORPEDO ASIDE!');
          continue;
        }
        if (wdd.type === 'bomb' && wdd.family === 'bomb' && act.includes('countersigil') && U.chance(0.6)) {
          this.projectiles.splice(i, 1);
          this.particles.push({ x: pr.toX, y: pr.toY, vx: 0, vy: -16, life: 0.5, col: COL.ltblue, size: 3 });
          this._famAct = this._famAct || {}; this._famAct.countersigil = this.time;
          AUDIO.sfx('wardhit');
          this.log('THE COUNTER-SIGIL ERASES THE BOMB-RUNE MID-CONJURE!');
          continue;
        }
        // an orbiting (offensive) familiar can be clipped by the incoming shot — it body-blocks
        // the hit (FTL drones in the line of fire), taking a clip and, eventually, getting downed.
        const orb = this.orbitingFamiliars();
        if (orb.length && U.chance(TUNING.famHitChance)) {
          const k = U.pick(orb);
          this._famHp = this._famHp || {}; this._famDown = this._famDown || {};
          this._famHp[k] = (this._famHp[k] == null ? TUNING.famHp : this._famHp[k]) - 1;
          this.projectiles.splice(i, 1);
          const fp = this.familiarPos(k);
          this.boom(fp.x, fp.y, 4);
          if (this._famHp[k] <= 0) {
            this._famDown[k] = this.time;
            this._famAwake.delete(k);
            this.boom(fp.x, fp.y, 9);
            AUDIO.sfx('torpedo');
            this.log(DATA.FAMILIARS[k].name.toUpperCase() + ' IS SHOT DOWN! (RE-BINDS IN ' + Math.round(TUNING.famRedeploySecs) + 'S)');
          } else {
            AUDIO.sfx('wardhit');
            this.log(DATA.FAMILIARS[k].name.toUpperCase() + ' TAKES THE HIT FOR YOU!');
          }
          continue;
        }
      }
      // WARDS catch spell-shot at the bubble's outer edge - a warded munition
      // never reaches the hull. Torpedoes and bombs slip past; ghost volleys ignore all.
      if (pr.t < 1 && !pr.ghost && !pr._pierced) {
        const wdp = DATA.WEAPONS[pr.wkey];
        const dst = pr.targetShip;
        if (wdp.type !== 'missile' && wdp.type !== 'bomb' && dst.wards.layers > 0) {
          const pos = this.projPos(pr);
          const bb = this.wardBubble(dst);
          const ndx = (pos.x - bb.cx) / bb.rx, ndy = (pos.y - bb.cy) / bb.ry;
          if (ndx * ndx + ndy * ndy <= 1) {
            // evasion first, FTL-style: a dodged shot never tests the wards
            let ev = dst.evasion(this);
            if (this.hazard === 'fog') ev += 15;
            if (this.hazard === 'reef' || this.hazard === 'whirlpool') ev = Math.max(0, ev - 10);
            if (U.chance(ev / 100)) {
              this.projectiles.splice(i, 1);
              AUDIO.sfx('miss');
              this.splashFx(pr.toX + U.ri(-8, 8), SEA_Y);
              this.awardDodge(dst);
              this.log(dst === this.e ? 'THE ENEMY EVADES!' : 'YOU EVADE!');
              continue;
            }
            if (dst.wards.layers > (wdp.pierce || 0)) {
              this.projectiles.splice(i, 1);
              const wardsUp = dst.wards.layers; // before the strip, for the falloff
              this.stripWard(dst, pos.x, pos.y);
              this.igniteThroughWards(dst, dst.rooms[pr.roomId], wdp, wardsUp); // djinn heat bleeds through
              continue;
            }
            // pierce: rips a layer off the bubble and punches through (a rune-bright spark burst)
            this.stripWard(dst, pos.x, pos.y);
            pr._pierced = true;
            for (let q = 0; q < 8; q++) this.particles.push({ x: pos.x, y: pos.y, vx: U.rf(-34, 34), vy: U.rf(-34, 34), life: 0.3, col: q % 2 ? (wdp.tint || COL.gold) : COL.gold, size: 2 });
            this.ripples.push({ x: pos.x, y: pos.y, t: 0.3, max: 0.3 });
          }
        }
      }
      if (pr.t >= 1) { this.projectiles.splice(i, 1); this.resolveHit(pr); }
    }
    for (let i = this.beams.length - 1; i >= 0; i--) {
      this.beams[i].t -= dt;
      if (this.beams[i].t <= 0) this.beams.splice(i, 1);
    }
  }

  updateFx(dt) {
    if (this.ripples) for (let i = this.ripples.length - 1; i >= 0; i--) {
      this.ripples[i].t -= dt;
      if (this.ripples[i].t <= 0) this.ripples.splice(i, 1);
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pa = this.particles[i];
      pa.x += pa.vx * dt; pa.y += pa.vy * dt; pa.vy += (pa.grav || 0) * dt;
      pa.life -= dt;
      if (pa.life <= 0) this.particles.splice(i, 1);
    }
  }

  boom(x, y, n) {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x: x + U.rf(-10, 10), y: y + U.rf(-8, 8),
        vx: U.rf(-50, 50), vy: U.rf(-70, 10), grav: 90,
        life: U.rf(0.3, 0.9), col: U.pick([COL.fire1, COL.fire2, COL.grey, COL.white]), size: U.ri(1, 3),
      });
    }
    this.shake = 0.3;
  }
  splashFx(x, y) {
    for (let i = 0; i < 8; i++) this.particles.push({ x, y, vx: U.rf(-30, 30), vy: U.rf(-80, -20), grav: 200, life: 0.5, col: COL.ltblue, size: 1 });
  }

  // ---------- familiars (bound spirits - our drones) ----------
  // the Binding Shrine wakes them: powered bar 1 runs your 1st familiar, etc.
  // The shrine's powered bars assign the slots; a downed (shot-down) familiar is banished
  // until it re-binds (cooldown), so it stays out of the active list while down.
  shrineSlots() {
    if (!Game.run || !Game.run.familiars) return [];
    return Game.run.familiars.slice(0, this.p.powered('shrine'));
  }
  isOrbiting(k) { const f = DATA.FAMILIARS[k]; return !!(f && (f.role === 'attack' || f.role === 'boarder')); }
  activeFamiliars() {
    const s = this.shrineSlots();
    return s.filter(k => {
      if (this._famDown && this._famDown[k] != null) return false;            // shot down, banished
      if (this.isOrbiting(k)) return !!(this._famDeployed && this._famDeployed.has(k)); // orbiting needs a lit candle
      return true;                                                            // onboard/defensive: free
    });
  }
  // offensive familiars orbit the enemy and are exposed to its fire (FTL combat-drone style)
  orbitingFamiliars() {
    return this.activeFamiliars().filter(k => this.isOrbiting(k));
  }
  // deploy state for an orbiting familiar (drives the FAMILIARS panel button + click):
  // 'active' | 'deploy' | 'rebind' | 'cooldown' | 'nofund' | 'asleep' | null(not orbiting/onboard)
  famDeployState(k) {
    if (!this.isOrbiting(k)) return null;                       // onboard/defensive: always free
    if (this.shrineSlots().indexOf(k) < 0) return 'asleep';     // shrine not powered for this slot
    if (this._famDown && this._famDown[k] != null) {
      if (this.time - this._famDown[k] < TUNING.famRedeploySecs) return 'cooldown';
      return (Game.run.candles || 0) > 0 ? 'rebind' : 'nofund';
    }
    if (this._famDeployed && this._famDeployed.has(k)) return 'active';
    return (Game.run.candles || 0) > 0 ? 'deploy' : 'nofund';
  }
  // captain spends one Summoner's Candle to launch (or re-bind) an orbiting familiar
  deployFamiliar(k) {
    const st = this.famDeployState(k);
    if (st !== 'deploy' && st !== 'rebind') {
      if (st === 'nofund') this.log('NO SUMMONER’S CANDLES TO BIND THAT SPIRIT.');
      else if (st === 'cooldown') this.log('THE SPIRIT IS STILL RE-FORMING.');
      else if (st === 'asleep') this.log('POWER THE BINDING SHRINE FIRST.');
      return false;
    }
    Game.run.candles--;
    this._famDeployed = this._famDeployed || new Set(); this._famDeployed.add(k);
    if (this._famDown) delete this._famDown[k];
    this._famHp = this._famHp || {}; this._famHp[k] = TUNING.famHp;
    this._famDeploy = this._famDeploy || {}; this._famDeploy[k] = this.time;
    this._famAwake = this._famAwake || new Set(); this._famAwake.add(k);
    AUDIO.sfx('teleport');
    const nm = (DATA.FAMILIARS[k] ? DATA.FAMILIARS[k].name.toUpperCase() : 'A SPIRIT');
    this.log(nm + (st === 'rebind' ? ' RE-BINDS' : ' DEPLOYS') + '  (−1 CANDLE).');
    return true;
  }

  updateFamiliars(dt) {
    // announce wake/sleep so powering the Binding Shrine has visible payoff
    if (!this._famAwake) this._famAwake = new Set();
    if (!this._famAct) this._famAct = {};      // last action time per familiar (drives act pose)
    if (!this._famDeploy) this._famDeploy = {}; // wake time per familiar (drives spawn animation)
    if (!this._famHp) this._famHp = {};         // clips left before an orbiting familiar is downed
    if (!this._famDown) this._famDown = {};     // time-of-destruction per downed familiar
    if (!this._famDeployed) this._famDeployed = new Set(); // orbiting familiars deployed this battle
    // FTL-style: offensive (orbiting) familiars do NOT auto-deploy. The captain spends a
    // Summoner's Candle to launch each one (and again to re-bind a downed one) by clicking it in
    // the FAMILIARS panel — see deployFamiliar(). Defensive/onboard familiars run free below.
    const act = this.activeFamiliars();
    for (const k of act) if (!this._famAwake.has(k)) {
      this._famAwake.add(k);
      this._famDeploy[k] = this.time;
      if (this._famHp[k] == null) this._famHp[k] = TUNING.famHp;
      this.log((DATA.FAMILIARS[k] ? DATA.FAMILIARS[k].name.toUpperCase() : 'A SPIRIT') + ' AWAKENS AT THE SHRINE.');
    }
    for (const k of [...this._famAwake]) if (!act.includes(k)) this._famAwake.delete(k);
    if (!act.length) return;
    if (!this._famT) this._famT = {};
    for (const k of act) {
      this._famT[k] = (this._famT[k] || U.rf(1, 3)) - dt;
      if (this._famT[k] > 0) continue;
      if (k === 'emberimp') {
        this._famT[k] = 6;
        const tr = U.pick(this.e.rooms);
        const rr = this.roomRect(this.e, tr);
        const fp = this.familiarPos(k);
        this.projectiles.push({ wkey: 'famspark', fromX: fp.x, fromY: fp.y, toX: rr.x + rr.w / 2, toY: rr.y + rr.h / 2, t: 0, dur: 0.5, delay: 0, targetShip: this.e, roomId: tr.id, srcShip: this.p, arc: 14 });
        this._famAct[k] = this.time;
        AUDIO.sfx('bubble');
      } else if (k === 'clockworkgull') {
        this._famT[k] = 7;
        const tr = U.pick(this.e.rooms);
        const rr = this.roomRect(this.e, tr);
        const fp = this.familiarPos(k);
        this.projectiles.push({ wkey: 'famshot', fromX: fp.x, fromY: fp.y, toX: rr.x + rr.w / 2, toY: rr.y + rr.h / 2, t: 0, dur: 0.45, delay: 0, targetShip: this.e, roomId: tr.id, srcShip: this.p, arc: 30 });
        this._famAct[k] = this.time;
        AUDIO.sfx('cannon');
      } else if (k === 'tinkerbeetles') {
        this._famT[k] = 8;
        const r = this.p.rooms.find(rm => rm.key && rm.dmg > 0);
        if (r) {
          r.dmg = Math.max(0, r.dmg - 1);
          const rr = this.roomRect(this.p, r);
          for (let s = 0; s < 5; s++) this.particles.push({ x: rr.x + U.rf(2, rr.w - 2), y: rr.y + U.rf(2, rr.h - 2), vx: U.rf(-10, 10), vy: U.rf(-22, -6), life: 0.4, col: COL.gold, size: 1 });
          this._famAct[k] = this.time;
          this.log('TINKER BEETLES MEND THE ' + DATA.SYSTEMS[r.key].name.toUpperCase() + '.');
        }
      } else if (k === 'brassjanissary') {
        this._famT[k] = 9;
        const targets = this.e.rooms.filter(rm => occupantsOf(this.e, rm.id, this).some(c => c.owner === 'enemy'));
        if (targets.length) {
          const r = U.pick(targets);
          const rr = this.roomRect(this.e, r);
          for (const c of occupantsOf(this.e, r.id, this)) {
            if (c.owner !== 'enemy') continue;
            c.hp -= 15;
            if (c.hp <= 0) this.e.killCrew(c, this);
          }
          this.boom(rr.x + rr.w / 2, rr.y + rr.h / 2, 5);
          this._famAct[k] = this.time;
          this.log('THE BRASS JANISSARY STRIKES BELOW THEIR DECKS!');
        }
      } else {
        this._famT[k] = 1; // passive familiars just keep their timer warm
      }
    }
    // coral sentinel: stomps boarders aboard YOUR ship, faster in the flood
    if (act.includes('coralsentinel')) {
      for (const c of this.e.crew) {
        if (c.dead || c.aboard !== 'away') continue;
        const room = this.p.rooms[c.roomId];
        c.hp -= dt * (room && room.water > 0.3 ? 14 : 8);
        this._famAct.coralsentinel = this.time; // stomp pose while boarders are aboard
        if (c.hp <= 0) this.e.killCrew(c, this);
      }
    }
  }

  // where a familiar sits: offensive spirits ORBIT the enemy ship (FTL combat-drone style);
  // defenders / menders patrol just off your own hull.
  familiarPos(key) {
    const fam = DATA.FAMILIARS[key] || {};
    const act = this.activeFamiliars();
    const slot = Math.max(0, act.indexOf(key));
    const attack = fam.role === 'attack' || fam.role === 'boarder';
    if (attack) {
      const cxv = this.eX() + this.e.rw / 2, cyv = this.eY() + this.e.rh / 2;
      const rad = Math.max(this.e.rw, this.e.rh) / 2 + 22;
      const ang = this.time * 0.7 + slot * 2.3;
      return { x: cxv + Math.cos(ang) * rad, y: cyv + Math.sin(ang) * rad * 0.62 };
    }
    const bob = Math.sin(this.time * 2 + slot * 2.1) * 3;
    return { x: this.pX() + this.p.rw + 14 + slot * 16, y: this.pY() - 24 + bob };
  }

  // a ramp gun's CURRENT reload target (shrinks each shot toward ramp.floor)
  chargeGoal(w, wd) { return wd.ramp ? Math.max(wd.ramp.floor, wd.charge - wd.ramp.step * (w._ramp || 0)) : wd.charge; }
  // 0..1 fill against the CURRENT goal — so a ramped gun's bar always fills to 100% before it
  // fires (drawing against the base wd.charge made it stop part-way and look broken).
  chargeFrac(w, wd) { return Math.min(1, w.charge / this.chargeGoal(w, wd)); }
  // What the on-screen charge METER should show (U14). A charger (Thunderhead) banks N bolts and
  // zeroes w.charge between them, so chargeFrac alone snaps the bar back to empty mid-bank and
  // looks broken. Show bank progress + the in-flight bolt instead, so it climbs across the whole bank.
  displayChargeFrac(w, wd) {
    if (wd.charger) return Math.min(1, ((w._bank || 0) + this.chargeFrac(w, wd)) / wd.charger);
    return this.chargeFrac(w, wd);
  }
  // how ramped a gun is right now, 0..1 (0 = base reload, 1 = fully wound up at ramp.floor)
  rampLevel(w, wd) { if (!wd.ramp || !w._ramp) return 0; return Math.min(1, (wd.charge - this.chargeGoal(w, wd)) / Math.max(1, wd.charge - wd.ramp.floor)); }
  // does this weapon have a full charge (ramp guns finish early, chargers bank)?
  weaponReady(w, wd) {
    if (wd.charger) return (w._bank || 0) >= wd.charger;
    return w.charge >= this.chargeGoal(w, wd);
  }

  // ---------- weapons ----------
  fireWeapon(src, dst, w, idx) {
    const wd = DATA.WEAPONS[w.key];
    // runeshot cost
    if ((wd.type === 'missile' || wd.type === 'bomb') && !wd.noRune && src === this.p) {
      if (Game.run.runeshot <= 0) { w.charge = wd.charge; return; } // hold fire
      if (!(Game.run.augs.includes('runeforge') && U.chance(0.25))) Game.run.runeshot--;
    }
    w._recoil = 0.25; // gunport recoil + muzzle flash
    // resolve the aimed room FIRST - this shot flies where it was ordered
    const tr = dst.rooms[w.target >= 0 ? w.target : 0] || U.pick(dst.rooms);
    // every shot is an order (no autofire): the NEXT shot must be re-ordered
    if (src === this.p) w.target = -1;
    w.charge = 0;
    src.gainXp(src.mannedBy('weapons', this), 'weapons', 1, this); // gunnery mastery: +1 per shot
    // ramp guns find their rhythm; chargers empty the whole bank at once
    if (wd.ramp) w._ramp = (w._ramp || 0) + 1;
    const banked = wd.charger ? (w._bank || 0) : 0;
    if (wd.charger) w._bank = 0;
    const m = this.muzzleWorld(src, idx, w, wd); // shots/beams emerge from the gun's emitter
    if (wd.type === 'beam') {
      AUDIO.sfx('beam');
      this.startBeamSweep(src, dst, wd, w, idx);
      return;
    }
    const rr = this.roomRect(dst, tr);
    const shots = banked || wd.shots || 1;
    // LEGENDARY: Ghost Figurehead - your first volley is unstoppable
    let ghost = false;
    if (src === this.p && !this._ghostUsed && Game.run && Game.run.augs.includes('ghost_figurehead')) {
      ghost = true;
      this._ghostUsed = true;
      this.log('THE GHOST FIGUREHEAD WAILS - THE VOLLEY CANNOT MISS!');
    }
    const isRail = w.key === 'depleteduranium';
    for (let s = 0; s < shots; s++) {
      const speed = wd.type === 'bomb' ? 90 : 170;
      let dur = wd.type === 'bomb' ? 1.0 : Math.max(0.4, Math.abs(rr.x - m.x) / speed);
      if (isRail) dur = 0.32; // a railgun slug is near-instant — a fast straight bolt, not a lobbed charge
      // langrage scatter: each ball may spill into a room next to the aim point
      let trS = tr, rrS = rr;
      if (wd.scatter && U.chance(0.45)) {
        const n = dst.rooms[U.pick(dst.adj[tr.id] || [])];
        if (n) { trS = n; rrS = this.roomRect(dst, n); }
      }
      this.projectiles.push({
        wkey: w.key, fromX: m.x, fromY: m.y, // m is the muzzle (muzzleWorld)
        toX: rrS.x + rrS.w / 2 + (wd.scatter ? U.ri(-4, 4) : 0), toY: rrS.y + rrS.h / 2 + (wd.scatter ? U.ri(-3, 3) : 0),
        t: 0, dur, delay: s * 0.3, ghost,
        targetShip: dst, roomId: trS.id, srcShip: src,
        arc: isRail ? 0 : (wd.type === 'bomb' ? 60 : 26),
      });
    }
    AUDIO.sfx(wd.type === 'missile' ? 'torpedo' : wd.family === 'magic' ? (wd.ion ? 'ion' : 'bubble') : wd.family === 'horn' ? 'note' : wd.family === 'bomb' ? 'torpedo' : 'cannon');
    // muzzle flash — bigger for heavy guns; a ramped gun runs HOT (white sparks) as it quickens
    const dir3 = src === this.p ? 1 : -1;
    this.particles.push({ x: m.x + dir3 * 6, y: m.y, vx: dir3 * 30, vy: 0, life: 0.12, col: isRail ? COL.lime : COL.fire1, size: 2 + Math.min(8, wd.dmg || 1) });
    if (wd.ramp) for (let i = 0; i < 4; i++) this.particles.push({ x: m.x + dir3 * 6, y: m.y, vx: dir3 * U.rf(20, 50), vy: U.rf(-18, 18), life: 0.2, col: i % 2 ? COL.white : COL.fire1, size: 2 });
  }

  // where a projectile is right now, on the same path the renderer draws
  projPos(pr) {
    const wd = DATA.WEAPONS[pr.wkey];
    const t = U.clamp(pr.t, 0, 1);
    const x = U.lerp(pr.fromX, pr.toX, t);
    let y = U.lerp(pr.fromY, pr.toY, t) - Math.sin(t * Math.PI) * pr.arc;
    if (wd.type === 'missile') {
      const skimY = SEA_Y - 4;
      y = t < 0.2 ? U.lerp(pr.fromY, skimY, t / 0.2) : t > 0.8 ? U.lerp(skimY, pr.toY, (t - 0.8) / 0.2) : skimY;
    }
    return { x, y };
  }

  // the ward bubble's ellipse in screen space (must match renderShip's dome)
  wardBubble(ship) {
    const sx = ship === this.p ? this.pX() : this.eX();
    const sy = ship === this.p ? this.pY() : this.eY();
    return { cx: sx + ship.rw / 2, cy: sy + ship.rh / 2 - 8, rx: ship.rw / 2 + 24, ry: ship.rh + 40 };
  }

  // one ward layer gives its life at (ix,iy): shock rings + sparks; if it was
  // the last layer the whole bubble visibly shatters outward
  // +1 mastery to both the helm and the sails whenever this ship dodges a shot (FTL)
  awardDodge(ship) { ship.gainXp(ship.mannedBy('helm', this), 'helm', 1, this); ship.gainXp(ship.mannedBy('sails', this), 'sails', 1, this); }
  stripWard(dst, ix, iy) {
    dst.gainXp(dst.mannedBy('wards', this), 'wards', 1, this); // ward mastery: +1 per soaked hit
    dst.wards.layers = Math.max(0, dst.wards.layers - 1);
    dst._wardFlash = 1;
    AUDIO.sfx('wardhit');
    this.ripples.push({ x: ix, y: iy, t: 0.45, max: 0.45 });
    for (let k = 0; k < 6; k++) {
      this.particles.push({ x: ix, y: iy, vx: U.ri(-40, 40), vy: U.ri(-40, 40), life: 0.3, col: COL.cyan, size: 2 });
    }
    if (dst.wards.layers === 0) {
      dst._wardBreak = 0.8;
      const bb = this.wardBubble(dst);
      for (let k = 0; k < 16; k++) {
        const a = k / 16 * Math.PI * 2;
        this.particles.push({
          x: bb.cx + Math.cos(a) * bb.rx * 0.9, y: bb.cy + Math.sin(a) * bb.ry * 0.9,
          vx: Math.cos(a) * 55, vy: Math.sin(a) * 55 - 12, life: 0.5, col: COL.cyan, size: 2,
        });
      }
      this.log(dst === this.p ? 'YOUR WARDS SHATTER!' : 'THE ENEMY WARDS SHATTER!');
    } else {
      this.log(dst === this.p ? 'YOUR WARDS ABSORB THE SHOT!' : 'THE WARDS ABSORB THE SHOT!');
    }
  }

  // djinn fire (emberThrough): the wards still soak the hull damage, but the HEAT bleeds
  // through. Roll the weapon's fire at a chance reduced by each ward layer that soaked the
  // strike (TUNING.emberThroughFalloff^layers) — heavily-warded ships resist, never immune.
  igniteThroughWards(dst, room, wd, layers) {
    if (!wd || !wd.emberThrough || !wd.fire || !room) return false;
    const chance = wd.fire * Math.pow(TUNING.emberThroughFalloff, Math.max(0, layers || 0));
    // fire-only strike through the standard path (rolls the chance, logs + FX on a catch)
    this.applyEffects(dst, room, { fire: chance, tint: wd.tint, family: wd.family }, null);
    return true;
  }

  // ---------- FTL beams: fixed-length line, animated sweep, per-room dmg + per-tile fire/crew ----------
  // screen <-> ship-local px (the enemy ship is drawn mirrored on x; see roomRect)
  screenToLocal(ship, sx, sy) {
    if (ship === this.p) return { x: sx - this.pX(), y: sy - this.pY() };
    return { x: this.eX() + this.e.rw - sx, y: sy - this.eY() };
  }
  localToScreen(ship, lx, ly) {
    if (ship === this.p) return { x: this.pX() + lx, y: this.pY() + ly };
    return { x: this.eX() + this.e.rw - lx, y: this.eY() + ly };
  }
  beamLen(wd) { return (wd.length || 4) * TILE; }
  // player aim: two SCREEN points (anchor + a point giving the direction) -> store local anchor + angle
  setBeamAim(i, ax, ay, bx, by) {
    const w = this.p.weapons[i]; if (!w) return;
    const a = this.screenToLocal(this.e, ax, ay), b = this.screenToLocal(this.e, bx, by);
    w.beamAim = { x: a.x, y: a.y, angle: Math.atan2(b.y - a.y, b.x - a.x) };
    w.on = true; w.target = 0; this.selWeapon = -1;
    const rooms = this.e.beamPath(a.x, a.y, w.beamAim.angle, this.beamLen(DATA.WEAPONS[w.key])).rooms.length;
    this.log('LANCE ' + (i + 1) + ' WILL RAKE ~' + Math.max(1, rooms) + ' ROOM' + (rooms === 1 ? '' : 'S'));
    AUDIO.sfx('click');
  }
  // enemy aim: a horizontal rake across the player hull toward whichever side clips more rooms
  pickEnemyBeamAim(wd) {
    const start = this.pickEnemyTarget(wd), sr = this.p.rooms[start];
    const ax = sr.x * TILE + 2, ay = (sr.y + sr.h / 2) * TILE, len = this.beamLen(wd);
    const right = this.p.beamPath(ax, ay, 0, len).rooms.length;
    const left = this.p.beamPath(ax, ay, Math.PI, len).rooms.length;
    return { x: ax, y: ay, angle: right >= left ? 0 : Math.PI };
  }
  startBeamSweep(src, dst, wd, w, idx) {
    const aim = w.beamAim || (src === this.e ? this.pickEnemyBeamAim(wd) : null);
    if (!aim) return; // player must aim first
    const len = this.beamLen(wd);
    const path = dst.beamPath(aim.x, aim.y, aim.angle, len);
    this.sweeps = this.sweeps || [];
    this.sweeps.push({ src, dst, wd, w, idx: idx | 0, aim, len, path, t: 0, dur: Math.max(0.6, (wd.length || 4) * 0.18), hitR: new Set(), hitT: new Set() });
  }
  updateSweeps(dt) {
    if (!this.sweeps || !this.sweeps.length) return;
    for (const sw of this.sweeps) {
      sw.t += dt / sw.dur;
      const maxD = Math.min(1, sw.t) * sw.len;
      for (const tile of sw.path.tiles) {
        if (tile.d > maxD) break;
        if (!sw.hitR.has(tile.room.id)) { sw.hitR.add(tile.room.id); this.beamHitRoom(sw, tile.room); }
        const tk = tile.gx + ',' + tile.gy;
        if (!sw.hitT.has(tk)) { sw.hitT.add(tk); this.beamHitTile(sw, tile); }
      }
      if (sw.t >= 1 || sw.dst.hull <= 0) sw.done = true;
    }
    this.sweeps = this.sweeps.filter(s => !s.done);
  }
  beamHitRoom(sw, room) {
    const wd = sw.wd, dst = sw.dst, soak = dst.wards.layers, effDmg = Math.max(0, (wd.dmg || 0) - soak);
    if (soak > 0) dst._wardFlash = 1;
    if (effDmg > 0) {
      dst.damageHull(effDmg); dst.damageSystem(room, effDmg);
      const rr = this.roomRect(dst, room); this.boom(rr.x + rr.w / 2, rr.y + rr.h / 2, 4 + Math.min(effDmg, 6) * 2); AUDIO.sfx('hit');
    } else if (soak > 0 && !sw._soakLog) { sw._soakLog = true; this.log(dst === this.p ? 'YOUR WARDS SOAK THE LANCE!' : 'THE WARDS SOAK THE LANCE!'); }
  }
  beamHitTile(sw, tile) {
    const wd = sw.wd, dst = sw.dst, room = tile.room, soak = dst.wards.layers;
    // fire per tile (ember-through if the room's hull dmg is fully soaked)
    if (wd.fire) {
      const through = ((wd.dmg || 0) - soak) > 0 ? 1 : (wd.emberThrough ? Math.pow(TUNING.emberThroughFalloff, soak) : 0);
      if (through > 0 && room.water <= TUNING.fireDouseWater && room._fires[tile.idx] <= 0 && U.chance(wd.fire * through)) {
        room._fires[tile.idx] = TUNING.newFireHp; AUDIO.sfx('fire');
      }
    }
    // crew per tile (anti-crew lances): a sailor standing on THIS tile takes a chunk
    if (wd.crewDmg) {
      const effCrew = Math.round(wd.crewDmg * Math.max(0, 1 - 0.5 * soak));
      if (effCrew > 0) for (const c of dst.crew.slice()) {
        if (c.dead || c.aboard !== 'home' || c.roomId !== room.id) continue;
        if (dst.crewLocalTile(c, room) === tile.idx) { c.hp -= effCrew; if (c.hp <= 0) dst.killCrew(c, this); }
      }
    }
  }
  // draw the live sweeping beams (anchor -> current tip), bright tinted core + glow + impact sparks
  renderSweeps(ctx) {
    if (!this.sweeps) return;
    for (const sw of this.sweeps) {
      const reach = Math.min(1, sw.t) * sw.len;
      const tipL = { x: sw.aim.x + Math.cos(sw.aim.angle) * reach, y: sw.aim.y + Math.sin(sw.aim.angle) * reach };
      const tip = this.localToScreen(sw.dst, tipL.x, tipL.y);
      const mz = this.muzzleWorld(sw.src, sw.idx, sw.w, sw.wd); // emerges from the gun's emitter (tracks recoil)
      ctx.save(); ctx.lineCap = 'round';
      ctx.globalAlpha = 0.5; ctx.strokeStyle = sw.wd.tint; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(mz.x, mz.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
      ctx.globalAlpha = 1; ctx.strokeStyle = '#fffef6'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(mz.x, mz.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
      ctx.fillStyle = '#fffef6'; ctx.beginPath(); ctx.arc(tip.x, tip.y, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.5; ctx.fillStyle = sw.wd.tint; ctx.beginPath(); ctx.arc(tip.x, tip.y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
  resolveHit(pr) {
    const wd = DATA.WEAPONS[pr.wkey];
    const dst = pr.targetShip;
    const room = dst.rooms[pr.roomId];
    // ghost volley: skips evasion and wards entirely
    if (pr.ghost) { this.applyEffects(dst, room, wd, pr.srcShip); return; }
    // pierced the wards mid-flight: evasion + ward toll already paid at the bubble
    if (pr._pierced) { this.applyEffects(dst, room, wd, pr.srcShip); return; }
    // dodge (bombs can't be dodged)
    if (wd.type !== 'bomb') {
      let ev = dst.evasion(this);
      if (this.hazard === 'fog') ev += 15;
      if (this.hazard === 'reef' || this.hazard === 'whirlpool') ev = Math.max(0, ev - 10);
      if (U.chance(ev / 100)) {
        AUDIO.sfx('miss');
        this.splashFx(pr.toX + U.ri(-8, 8), SEA_Y);
        this.awardDodge(dst);
        if (dst === this.e) this.log('THE ENEMY EVADES!');
        else this.log('YOU EVADE!');
        return;
      }
    }
    // wards fallback (normally caught at the bubble edge mid-flight; this
    // covers wards raised while the shot was already inside the bubble)
    const bypass = wd.type === 'missile' || wd.type === 'bomb';
    if (!bypass && dst.wards.layers > 0) {
      const rr = this.roomRect(dst, room);
      if (dst.wards.layers > (wd.pierce || 0)) {
        const wardsUp = dst.wards.layers;
        this.stripWard(dst, rr.x + rr.w / 2, rr.y - 12);
        this.igniteThroughWards(dst, room, wd, wardsUp); // djinn heat bleeds through
        return;
      }
      this.stripWard(dst, rr.x + rr.w / 2, rr.y - 12);
    }
    this.applyEffects(dst, room, wd, pr.srcShip);
  }

  applyEffects(dst, room, wd, src, hitPt) {
    const RR = this.roomRect(dst, room);
    // spawn a quick burst of effect particles in the struck room (the "what did that do?" cue)
    const fxBurst = (n, opt) => { for (let i = 0; i < n; i++) this.particles.push(Object.assign({ x: RR.x + U.rf(2, RR.w - 2), y: RR.y + U.rf(2, RR.h - 2), vx: U.rf(-12, 12), vy: U.rf(-12, 12), grav: 0, life: 0.7, size: 2 }, typeof opt === 'function' ? opt(i) : opt)); };
    let dmg = wd.dmg || 0;
    if (wd.vsSails && room.key === 'sails') {
      dmg *= wd.vsSails;
      // sail-tear: shredded canvas flutters off the rigging
      fxBurst(10, i => ({ y: RR.y + U.rf(2, RR.h - 2), vx: U.rf(-30, 30), vy: U.rf(-18, 6), grav: 60, life: 0.8, col: i % 2 ? COL.paperhi : '#c9b88c', size: U.ri(2, 3) }));
    }
    if (dmg > 0) {
      dst.damageHull(dmg);
      dst.damageSystem(room, dmg);
      AUDIO.sfx('hit');
      this.boom(RR.x + RR.w / 2, RR.y + RR.h / 2, 6 + Math.min(dmg, 12) * 3); // cap the debris count (the rail gun's dmg 99 spawned 300+ particles)
    }
    if (wd.ion) {
      room.ion = Math.min(10, room.ion + 4 * wd.ion);
      AUDIO.sfx('ion');
    }
    if (wd.fire && U.chance(wd.fire) && room.water < TUNING.fireDouseWater) {
      // ignite a TILE: the exact crossed tile if a local-ship hit point was given (beams, Part D),
      // else a tile in the struck room (shots/bombs land somewhere in the room)
      const lit = hitPt ? dst.igniteTileAt(room, hitPt.x, hitPt.y, TUNING.newFireHp) : dst.igniteRandomTile(room, TUNING.newFireHp);
      if (lit) { AUDIO.sfx('fire'); this.log(dst === this.p ? 'FIRE ON YOUR SHIP!' : 'FIRE TAKES HOLD ABOARD THE ENEMY!'); fxBurst(8, i => ({ y: RR.y + RR.h / 2, vx: U.rf(-22, 22), vy: U.rf(-32, -6), grav: 50, life: 0.5, col: i % 2 ? COL.fire1 : COL.fire2, size: 2 })); }
    }
    if (wd.leak && U.chance(wd.leak)) { room.leak = true; this.log(dst === this.p ? 'YOU ARE TAKING ON WATER!' : 'HULL BREACHED - THE ENEMY TAKES WATER!'); }
    if (wd.flood) { room.water = 1; room.leak = U.chance(0.5); AUDIO.sfx('splash'); this.log(dst === this.p ? 'A ROOM IS FLOODED!' : 'A ROOM ABOARD THE ENEMY FLOODS!'); fxBurst(14, i => ({ x: RR.x + RR.w / 2, y: RR.y + RR.h / 2, vx: U.rf(-44, 44), vy: U.rf(-34, 8), grav: 130, life: 0.5, col: i % 2 ? COL.water : '#96c8f0', size: 2 })); }
    // kraken ink: the helmsman steers blind for a while — a dark ink cloud splatters the room
    if (wd.blind) { dst._blindT = Math.max(dst._blindT || 0, wd.blind); if (dst === this.p) this.log('INK ACROSS THE HELM - EVASION DOWN!'); fxBurst(12, () => ({ vx: U.rf(-14, 14), vy: U.rf(-10, 6), grav: 6, life: 0.9, col: U.chance(0.5) ? '#140f1e' : COL.dkpurple, size: U.ri(2, 4) })); }
    // null rune: argues the system out of its mana — energy is siphoned UP out of the system
    if (wd.nullMana && room.key && dst.sysLv[room.key]) {
      dst.setAlloc(room.key, 0);
      if (dst === this.p) this.log('A NULL RUNE DRAINS YOUR ' + DATA.SYSTEMS[room.key].name.toUpperCase() + '!');
      fxBurst(10, () => ({ x: RR.x + U.rf(4, RR.w - 4), y: RR.y + RR.h - 2, vx: U.rf(-5, 5), vy: U.rf(-46, -26), grav: -14, life: 0.7, col: COL.cyan, size: 2 }));
    }
    // barnacle coral: the room's doors grow shut (persistent crust drawn in renderShip while _sealT)
    if (wd.sealDoors) {
      room._sealT = wd.sealDoors;
      for (let di = 0; di < dst.doors.length; di++) {
        if (dst.doors[di][0] === room.id || dst.doors[di][1] === room.id) dst.doorOpen[di] = false;
      }
      AUDIO.sfx('splash');
      this.log(dst === this.p ? 'CORAL SEALS YOUR DOORS SHUT!' : 'CORAL SEALS THEIR DOORS SHUT!');
      fxBurst(10, i => ({ vx: U.rf(-10, 10), vy: U.rf(-10, 10), grav: 0, life: 0.6, col: i % 2 ? '#6a8a4a' : '#caa24a', size: 2 }));
    }
    // mending tide: the sea sings the crew whole again
    if (wd.healCrew) {
      for (const c of occupantsOf(dst, room.id, this)) {
        if (c.owner === (src ? src.owner : dst.owner)) { c.hp = Math.min(c.maxhp, c.hp + wd.healCrew); c._healT = 0.8; }
      }
      AUDIO.sfx('bubble');
      if (dst === this.p) this.log('THE MENDING TIDE WASHES THROUGH THE ROOM.');
    }
    // siren lure: sailors abandon their posts toward the song
    if (wd.lure) {
      const cands = dst.crew.filter(c => !c.dead && c.aboard === 'home' && c.roomId !== room.id);
      U.shuffle(cands).slice(0, wd.lure).forEach(c => dst.orderCrew(c, room.id));
      AUDIO.sfx('note');
      this.log(dst === this.p ? 'A SONG PULLS YOUR SAILORS FROM THEIR POSTS!' : 'THEIR SAILORS WANDER TOWARD THE LURE...');
      // charm: pink notes rise from the room the song pulls toward
      fxBurst(8, () => ({ x: RR.x + RR.w / 2 + U.rf(-7, 7), y: RR.y + RR.h / 2, vx: U.rf(-9, 9), vy: U.rf(-30, -14), grav: -4, life: 1.0, col: COL.pink, size: 2 }));
    }
    if (wd.crewDmg || wd.stunRoom || wd.poison) {
      for (const c of occupantsOf(dst, room.id, this)) {
        if (wd.crewDmg) {
          c.hp -= wd.crewDmg;
          if (c.hp <= 0) {
            const home = this.p.crew.includes(c) ? this.p : this.e;
            home.killCrew(c, this);
          }
        }
        if (wd.poison && !c.dead) c.poison = Math.max(c.poison || 0, wd.poison);
        if (wd.stunRoom) c.stun = Math.max(c.stun, wd.stunRoom);
      }
      if (wd.stunRoom) AUDIO.sfx('stun');
      // poison: a lingering green haze wells up in the room
      if (wd.poison) fxBurst(10, i => ({ x: RR.x + U.rf(3, RR.w - 3), y: RR.y + RR.h - 2, vx: U.rf(-6, 6), vy: U.rf(-20, -6), grav: -6, life: 1.1, col: i % 2 ? COL.lime : COL.dkgreen, size: 2 }));
    }
    // Stormlash etc.: a CHANCE (wd.stun) to jolt the whole room's crew senseless.
    // One roll for the room (not per-crew), default 4s when it lands.
    if (wd.stun && U.chance(wd.stun)) {
      for (const c of occupantsOf(dst, room.id, this)) c.stun = Math.max(c.stun, wd.stunSecs || 4);
      AUDIO.sfx('stun');
      this.log(dst === this.p ? 'A STORM-JOLT STUNS YOUR CREW!' : 'A STORM-JOLT STUNS THEIR CREW!');
    }
  }

  // ---------- enemy AI ----------
  pickEnemyTarget(wd) {
    const weights = [];
    for (const r of this.p.rooms) {
      const occ = occupantsOf(this.p, r.id, this).length;
      const sys = !!(r.key && this.p.sysLv[r.key]);
      let w = 0.4;
      if (r.key === 'weapons') w = 3;
      else if (r.key === 'wards' && this.p.sysLv.wards) w = 2.6;
      else if (r.key === 'sails') w = 2;
      else if (r.key === 'core') w = 1.8;
      else if (r.key === 'helm') w = 1.4;
      else if (r.key === 'infirmary') w = 1;
      if (wd.vsSails && r.key === 'sails') w *= 3;
      // anti-crew shots / songs aim where the people are
      if (wd.crewDmg || wd.stunRoom || wd.poison) w = 0.3 + occ * 1.6;
      // F17 — utility weapons aim each EFFECT where it actually bites (was: generic system value
      // only, so an enemy dumped null-runes/barnacle/ink/lure/flood wherever the value heuristic
      // landed). Each effect now nudges the weight toward the room it hurts most.
      if ((wd.nullMana || wd.ion) && sys) w += this.p.powered(r.key) * (r.key === 'wards' || r.key === 'weapons' ? 2.2 : 1.0); // strip mana where there IS mana
      if (wd.blind && r.key === 'helm') w += this.p.mannedBy('helm', this) ? 4 : 1.5;                                          // ink the helmsman's eyes
      if (wd.lure) w += 0.5 + occ * 1.4;                                                                                       // pull the most-crowded post off-station
      if (wd.sealDoors) w += occ * 1.5 + (sys ? 1.2 : 0);                                                                      // trap crew at a real post
      if (wd.flood && sys && r.water < 0.5) w += 1.8;                                                                          // drown a dry system room
      if (sys && r.dmg >= this.p.sysLv[r.key]) w *= 0.25; // already broken — don't waste the shot
      weights.push([r.id, w]);
    }
    return U.wpick(weights);
  }

  // enemy beam aiming: pick a valuable start room, then sweep a horizontal line across the
  // hull toward whichever side crosses more rooms, so a lance actually rakes multiple systems
  // (FTL beam behaviour) instead of falling back to target + one random neighbour.

  // status line for player weapon i (the "why won't it fire" answer) — shared by HUD + HD
  weaponTip(i) {
    const w = this.p.weapons[i]; if (!w) return null;
    const wd = DATA.WEAPONS[w.key]; if (!wd) return null;
    const wepBars = this.p.powered('weapons');
    let used = 0; for (let k = 0; k < i; k++) { const ww = this.p.weapons[k]; if (ww && ww.on) used += DATA.WEAPONS[ww.key].power; }
    const hasPower = w.on && used + wd.power <= wepBars;
    const needsRune = (wd.type === 'missile' || wd.type === 'bomb') && !wd.noRune;
    const outOfRune = needsRune && Game.run.runeshot <= 0;
    if (!w.on) return 'Powered down — right-click to arm';
    if (!hasPower) return 'Not enough mana — add mana or turn another gun off';
    if (outOfRune) return 'Out of runeshot — this weapon needs it to fire';
    if (w.target < 0) return 'No target — click this gun, then an enemy room';
    return 'Fires at its target whenever charged';
  }

  enemyAI() {
    const e = this.e;
    // FTL-style enemy crew priorities, in order:
    //   medbay-retreat (elite/boss) > repel boarders > fight fires > patch leaks >
    //   repair systems (by importance) > man stations.
    const crew = e.aliveCrew().filter(c => c.aboard === 'home' && c.owner === 'enemy');
    const busy = new Set();
    const STATIONS = ['helm', 'weapons', 'sails'];
    // a free hand: idle (not pathing), not already tasked, and not the pilot (keep the helm manned)
    const freeHand = () => crew.find(c => !busy.has(c.id) && c.path.length === 0 && e.rooms[c.roomId].key !== 'helm');
    const sendTo = (c, roomId) => { if (c.roomId !== roomId && c.path[c.path.length - 1] !== roomId) e.orderCrew(c, roomId); busy.add(c.id); };

    // C — wounded crew on elite/boss ships break off to heal in a powered infirmary,
    // and won't leave until full (FTL medbay-retreat). Skipped on ordinary ships.
    if (this.elite || e.boss) {
      const inf = e.roomByKey('infirmary');
      if (inf && e.sysLv.infirmary > 0) {
        for (const c of crew) {
          if (busy.has(c.id)) continue;
          if (c.roomId === inf.id && c.hp < c.maxhp) { busy.add(c.id); }          // stay & heal to full
          else if (c.hp < c.maxhp * 0.3) { sendTo(c, inf.id); }                    // badly hurt -> retreat
        }
      }
    }

    // 1 — repel boarders (E: defenders scale with intruder count; always leave the helm manned if crew>2)
    const intruders = this.p.crew.filter(c => !c.dead && c.aboard === 'away');
    if (intruders.length) {
      const room = intruders[0].roomId;
      const want = Math.max(1, Math.min(crew.length - (crew.length > 2 ? 1 : 0), intruders.length + 1));
      let sent = 0;
      for (const c of crew) {
        if (busy.has(c.id)) continue;
        if (e.rooms[c.roomId].key === 'helm' && crew.length > 2) continue;
        if (sent >= want) break;
        sendTo(c, room); sent++;
      }
    }

    // B — fight fire, then patch leaks. Deliberately limited: one hand to the WORST blaze (and
    // one to the worst leak) per pass, so a competent crew contains a normal fire (fire-kills stay
    // rare, FTL-style) but a runaway, multi-room inferno can still overwhelm a thin crew.
    const fires = e.rooms.filter(r => r.fire > 0).sort((a, b) => b.fire - a.fire);
    if (fires.length) { const c = freeHand(); if (c) sendTo(c, fires[0].id); }
    const leak = e.rooms.find(r => r.leak);
    if (leak) { const c = freeHand(); if (c) sendTo(c, leak.id); }

    // A + E — repair damaged systems by IMPORTANCE (wards > weapons > helm/sails > rest),
    // assigning a hand to each in turn while crew remain (not just the single worst-damaged one).
    const PRI = { wards: 6, weapons: 5, helm: 4, sails: 4, sump: 3, infirmary: 3 };
    const damaged = e.rooms.filter(r => r.key && e.sysLv[r.key] && r.dmg > 0)
      .sort((a, b) => (PRI[b.key] || 1) - (PRI[a.key] || 1) || b.dmg - a.dmg);
    for (const dr of damaged) { const c = freeHand(); if (!c) break; sendTo(c, dr.id); }

    // man key stations with whoever's left
    for (const s of STATIONS) {
      const r = e.roomByKey(s);
      if (!r || !e.sysLv[s]) continue;
      if (occupantsOf(e, r.id, this).some(c => c.owner === 'enemy')) continue;
      const c = crew.find(c => !busy.has(c.id) && c.path.length === 0 && !STATIONS.includes(e.rooms[c.roomId].key));
      if (c) sendTo(c, r.id);
    }
  }

  // ---------- hazards ----------
  hazardStrike() {
    this.hazT = U.rf(8, 15);
    // LEGENDARY: Leviathan Pact - the sea fights for you
    const pact = Game.run && Game.run.augs.includes('leviathan_pact');
    if (this.hazard === 'storm') {
      const ship = pact ? this.e : (U.chance(0.5) ? this.p : this.e);
      const room = U.pick(ship.rooms);
      ship.damageSystem(room, 1);
      ship.damageHull(1);
      if (U.chance(0.3)) ship.igniteRandomTile(room, TUNING.newFireHp); // a storm bolt lights a tile
      this.flash = 0.25;
      AUDIO.sfx('lightning');
      this.log('LIGHTNING STRIKES ' + (ship === this.p ? 'YOUR SHIP!' : 'THE ENEMY!'));
      const rr = this.roomRect(ship, room);
      this.boom(rr.x + rr.w / 2, rr.y, 5);
    } else if (this.hazard === 'kraken') {
      const ship = pact ? this.e : (U.chance(0.5) ? this.p : this.e);
      ship.damageHull(1);
      const room = U.pick(ship.rooms);
      ship.damageSystem(room, 1);
      this.shake = 0.4;
      AUDIO.sfx('creak');
      this.log('A TENTACLE SLAMS ' + (ship === this.p ? 'YOUR HULL!' : 'THE ENEMY!'));
      this.tentacleT = 1.2;
      this.tentacleShip = ship;
    } else if (this.hazard === 'whirlpool') {
      const ship = pact ? this.e : (U.chance(0.5) ? this.p : this.e);
      ship.damageHull(1);
      AUDIO.sfx('creak');
      this.log('THE WHIRLPOOL GRINDS ' + (ship === this.p ? 'YOUR HULL!' : 'THE ENEMY!'));
    }
  }

  // ---------- input ----------
  click(x, y, btn) {
    if (this.state !== 'fight') {
      if (this.stateT > 0.8) this.stateT = 99; // impatient captains may skip the funeral
      return;
    }
    // surrender dialog
    if (this.surrenderOffer) {
      if (this.inRect(x, y, 156, 168, 96, 16)) { // accept
        this.state = 'surrendered'; this.banner = 'THEY STRIKE THEIR COLORS!';
        this.paused = false;
        AUDIO.sfx('coin');
      } else if (this.inRect(x, y, 262, 168, 96, 16)) {
        this.surrenderOffer = null; this.paused = false;
        this.log('NO QUARTER!');
        AUDIO.sfx('click');
      }
      return;
    }
    // HUD buttons
    if (y >= HUD_Y) { this.clickHUD(x, y, btn); return; }

    // gate mode: choose enemy room
    if (this.gateMode) {
      const er = this.roomAt(this.e, x, y);
      if (er !== null) { this.doTeleport(er); return; }
      this.gateMode = false;
      return;
    }
    // storm conduit: choose an enemy system to jam
    if (this.hexMode) {
      const er = this.roomAt(this.e, x, y);
      if (er !== null) this.doStormhex(er);
      this.hexMode = false;
      return;
    }
    // siren's song: choose an enemy room; charm a sailor standing in it
    if (this.songMode) {
      const er = this.roomAt(this.e, x, y);
      if (er !== null) this.doSirensong(er);
      this.songMode = false;
      return;
    }
    // weapon targeting
    if (this.selWeapon >= 0) {
      const wsel = this.p.weapons[this.selWeapon];
      const wdsel = DATA.WEAPONS[wsel.key];
      // self-cast bombs aim at YOUR OWN rooms
      if (wdsel.selfCast) {
        const pr2 = this.roomAt(this.p, x, y);
        if (pr2 !== null) {
          const gi = this.selWeapon;
          wsel.target = pr2; wsel.on = true;
          this.selWeapon = -1;
          const rk2 = this.p.rooms[pr2].key;
          this.log('GUN ' + (gi + 1) + ' WILL CAST ON YOUR ' + (rk2 ? DATA.SYSTEMS[rk2].name.toUpperCase() : 'HOLD'));
          AUDIO.sfx('click');
          return;
        }
      }
      const er = this.roomAt(this.e, x, y);
      if (er !== null) {
        const i = this.selWeapon;
        this.p.weapons[i].target = er;
        this.p.weapons[i].on = true;
        this.selWeapon = -1;
        const rk = this.e.rooms[er].key;
        this.log('GUN ' + (i + 1) + ' LOCKED ON ' + (rk ? 'THEIR ' + DATA.SYSTEMS[rk].name.toUpperCase() : 'THEIR HOLD'));
        AUDIO.sfx('click');
        return;
      }
      // missed the enemy ship: KEEP the gun selected (ESC or re-click cancels)
      if (!this.crewAt(x, y) && this.roomAt(this.p, x, y) === null) return;
    }
    // crew selection on player ship
    const cc = this.crewAt(x, y);
    if (cc && cc.owner === 'player') {
      if (!Game.keys['Shift']) this.selCrew.clear();
      if (this.selCrew.has(cc.id)) this.selCrew.delete(cc.id); else this.selCrew.add(cc.id);
      AUDIO.sfx('click');
      return;
    }
    // toggle a door (when not ordering crew around)
    if (this.selCrew.size === 0) {
      const di = this.doorAt(this.p, x, y);
      if (di !== null) {
        this.p.doorOpen[di] = !this.p.doorOpen[di];
        AUDIO.sfx('click');
        this.log(this.p.doorOpen[di] ? 'DOOR OPEN - WATER CAN PASS.' : 'DOOR SHUT - WATERTIGHT.');
        return;
      }
    }
    // order selected crew to player room (and remember mannable stations)
    const prm = this.roomAt(this.p, x, y);
    if (prm !== null && this.selCrew.size > 0) {
      const key = this.p.rooms[prm].key;
      for (const c of this.p.crew) {
        if (this.selCrew.has(c.id) && !c.dead && c.aboard === 'home') {
          this.p.orderCrew(c, prm);
          if (['helm', 'sails', 'weapons', 'lookout'].includes(key)) c.station = prm;
        }
      }
      AUDIO.sfx('click');
      return;
    }
    // click on empty water/sky: drop the current crew selection
    if (btn === 0 && prm === null && this.selCrew.size > 0) {
      this.selCrew.clear();
      AUDIO.sfx('back');
      return;
    }
    // right-click one of your rooms: open/close its SEA DOOR (only hull rooms have one)
    if (btn === 2 && prm !== null) {
      const r = this.p.rooms[prm];
      if (!r.seaDoor) {
        // interior room: right-click swings ALL of this room's doors at once.
        // open them and floodwater pours in from any flooded neighbour.
        const ds = [];
        for (let di = 0; di < this.p.doors.length; di++) {
          if (this.p.doors[di][0] === prm || this.p.doors[di][1] === prm) ds.push(di);
        }
        const open = ds.some(di => !this.p.doorOpen[di]);
        for (const di of ds) this.p.doorOpen[di] = open;
        AUDIO.sfx('click');
        this.log(open ? 'ALL DOORS OPEN - WATER AND CREW CAN PASS.' : 'ALL DOORS SHUT - ROOM IS WATERTIGHT.');
        return;
      }
      r.scupper = !r.scupper;
      AUDIO.sfx('splash');
      this.log(r.scupper ? 'SEA DOOR OPEN - THE OCEAN POURS IN: DOUSES FIRE, DROWNS BOARDERS AND AIR-BREATHERS' : 'SEA DOOR SHUT - SUMP PUMPS TAKE OVER.');
      return;
    }
    this.selWeapon = -1;
  }

  clickHUD(x, y, btn) {
    // system power icons
    if (this.clickPowerPanel(x, y, btn, 6)) return;
    // weapons slots
    for (let i = 0; i < this.p.weapons.length; i++) {
      if (this.inRect(x, y, 232 + i * 48, 230, 46, 30)) {
        if (btn === 2) {
          const w = this.p.weapons[i];
          w.on = !w.on; if (!w.on) w.target = -1;
        } else {
          this.selWeapon = this.selWeapon === i ? -1 : i;
          this.gateMode = false;
        }
        AUDIO.sfx('click');
        return;
      }
    }
    // crew portraits
    const pc = this.p.aliveCrew();
    for (let i = 0; i < pc.length; i++) {
      const cx = 430 + (i % 2) * 16, cy = 228 + Math.floor(i / 2) * 15;
      if (this.inRect(x, y, cx, cy, 15, 14)) {
        const c = pc[i];
        if (!Game.keys['Shift']) this.selCrew.clear();
        if (this.selCrew.has(c.id)) this.selCrew.delete(c.id); else this.selCrew.add(c.id);
        AUDIO.sfx('click');
        return;
      }
    }
    // buttons
    if (this.inRect(x, y, 232, 264, 46, 11)) { this.togglePause(); return; }
    if (this.inRect(x, y, 330, 276, 50, 11)) { // crew stations: L = recall, R = save
      if (btn === 2) { this.setStations(); this.log('STATIONS SAVED - LEFT-CLICK OR R TO RECALL.'); }
      else { if (this.returnStations()) this.log('ALL HANDS TO STATIONS!'); else this.log('EVERYONE IS ALREADY AT THEIR STATION.'); }
      AUDIO.sfx('click'); return;
    }
    if (this.canFlee && this.inRect(x, y, 282, 264, 46, 11)) {
      this.p.fleeing = !this.p.fleeing;
      if (this.p.fleeing) this.log('MAKING FOR OPEN WATER... KEEP THE HELM MANNED!');
      else this.p.escape = 0;
      AUDIO.sfx('click'); return;
    }
    if (this.p.sysLv.fogveil > 0 && this.inRect(x, y, 332, 264, 46, 11)) {
      if (this.p.powered('fogveil') > 0 && this.p.veilCd <= 0) {
        this.p.veilT = 3 + this.p.powered('fogveil') * 1.5;
        this.p.veilCd = this.p.veilCdMax = 20;
        AUDIO.sfx('teleport');
        this.log('YOU VANISH INTO CONJURED FOG!');
        // LEGENDARY: Stormcaller Mast - the veil bites back
        if (Game.run.augs.includes('stormcaller_mast')) {
          for (const w of this.e.weapons) w.charge *= 0.5;
          const wr = this.e.roomByKey('weapons');
          if (wr) wr.ion = Math.min(10, wr.ion + 3);
          AUDIO.sfx('ion');
          this.log('STORMCALLER LIGHTNING ARCS ACROSS THEIR GUNS!');
        }
      }
      return;
    }
    if (this.p.sysLv.brinegate > 0 && this.inRect(x, y, 382, 264, 42, 11)) { this.tryGate(); return; }
    if (this.p.sysLv.brinegate > 0 && this.inRect(x, y, 382, 276, 42, 11)) { this.tryRecall(); return; }
  }

  doTeleport(enemyRoomId) {
    this.gateMode = false;
    const senders = this.gateRoomCrew(); // ONLY crew standing in the brine gate room board
    if (!senders.length) { this.log('NO CREW IN THE PORTAL ROOM.'); AUDIO.sfx('back'); return; }
    const tr = this.e.rooms[enemyRoomId];
    for (const c of senders) {
      c.aboard = 'away'; c.path = [];
      c.roomId = enemyRoomId;
      const sp = this.e.slotPos(enemyRoomId, U.ri(0, tr.w - 1));
      c.px = sp.x; c.py = sp.y;
    }
    this.p.gateCd = this.p.gateCdMax = (22 - this.p.sysLv.brinegate * 4) / (Game.run.augs.includes('tidal_heart') ? 2 : 1);
    AUDIO.sfx('teleport');
    this.log('AWAY TEAM THROUGH THE PORTAL!');
  }

  // ---- Brine Gate: the FTL teleporter. Only crew STANDING IN the brine gate room board — move
  // sailors into that room first. Board arms targeting; Recall pulls boarders back home. ----
  gateReady() { return this.p.sysLv.brinegate > 0 && this.p.powered('brinegate') > 0 && this.p.gateCd <= 0; }
  gateRoomCrew() { const gr = this.p.roomByKey('brinegate'); return gr ? this.p.aliveCrew().filter(c => c.aboard === 'home' && c.roomId === gr.id) : []; }
  tryGate() {
    if (this.p.sysLv.brinegate <= 0) return;
    if (this.p.powered('brinegate') <= 0) { this.log('THE PORTAL HAS NO MANA.'); AUDIO.sfx('back'); return; }
    if (this.p.gateCd > 0) { this.log('THE PORTAL IS RECHARGING.'); AUDIO.sfx('back'); return; }
    if (!this.gateRoomCrew().length) { this.log('NO CREW IN THE PORTAL ROOM.'); AUDIO.sfx('back'); return; }
    this.gateMode = true; this.hexMode = false; this.songMode = false; this.selWeapon = -1;
    this.log('CHOOSE AN ENEMY ROOM TO BOARD'); AUDIO.sfx('click');
  }
  tryRecall() {
    if (this.p.sysLv.brinegate <= 0) return;
    if (this.p.powered('brinegate') <= 0) { this.log('THE PORTAL HAS NO MANA.'); AUDIO.sfx('back'); return; }
    if (this.p.gateCd > 0) { this.log('THE PORTAL IS RECHARGING.'); AUDIO.sfx('back'); return; }
    const away = this.p.crew.filter(c => !c.dead && c.aboard === 'away');
    if (!away.length) { this.log('NO BOARDERS TO RECALL.'); AUDIO.sfx('back'); return; }
    const gr = this.p.roomByKey('brinegate');
    for (const c of away) { c.aboard = 'home'; this.p.placeCrew(c, gr ? gr.id : 0); }
    this.p.gateCd = this.p.gateCdMax = (18 - this.p.sysLv.brinegate * 3) / (Game.run.augs.includes('tidal_heart') ? 2 : 1);
    AUDIO.sfx('teleport'); this.log('AWAY TEAM RECALLED THROUGH THE PORTAL.');
  }

  // ---- Storm Conduit: arc a lightning tether onto an enemy system and jam it ----
  hexReady() { return this.p.sysLv.stormhex > 0 && this.p.powered('stormhex') > 0 && this.p.hexCd <= 0; }
  tryStormhex() {
    if (this.p.sysLv.stormhex <= 0) return;
    if (this.p.powered('stormhex') <= 0) { this.log('STORM CONDUIT HAS NO MANA.'); AUDIO.sfx('back'); return; }
    if (this.p.hexCd > 0) { this.log('STORM CONDUIT IS RECHARGING.'); AUDIO.sfx('back'); return; }
    this.hexMode = true; this.songMode = false; this.gateMode = false; this.selWeapon = -1;
    this.log('CHOOSE AN ENEMY SYSTEM TO JAM'); AUDIO.sfx('click');
  }
  doStormhex(enemyRoomId) {
    const bars = this.p.powered('stormhex');
    if (bars <= 0 || this.p.hexCd > 0) return;
    const r = this.e.rooms[enemyRoomId];
    if (!r || !r.key) { this.log('NOTHING TO JAM THERE.'); AUDIO.sfx('back'); return; }
    r.ion = Math.max(r.ion, TUNING.hexJamSecs[bars]); // leaps wards: applied straight to the system
    this.p.hexCd = this.p.hexCdMax = TUNING.hexCdSecs[bars];
    const m = this.mountPos(this.p, 0), rr = this.roomRect(this.e, r);
    this.beams.push({ x1: m.x, y1: m.y, x2: rr.x + rr.w / 2, y2: rr.y + rr.h / 2, x3: rr.x + rr.w / 2, y3: rr.y + rr.h / 2, t: 0.5, col: COL.ltblue, bolt: true });
    this.flash = 0.2; AUDIO.sfx('ion');
    this.log('LIGHTNING JAMS THEIR ' + DATA.SYSTEMS[r.key].name.toUpperCase() + '!');
  }

  // ---- Siren's Song: charm a sailor standing in the chosen room (merfolk hear no song) ----
  songReady() { return this.p.sysLv.sirensong > 0 && this.p.powered('sirensong') > 0 && this.p.songCd <= 0; }
  trySong() {
    if (this.p.sysLv.sirensong <= 0) return;
    if (this.p.powered('sirensong') <= 0) { this.log('THE SIRENS SONG HAS NO MANA.'); AUDIO.sfx('back'); return; }
    if (this.p.songCd > 0) { this.log('THE SIREN IS CATCHING HER BREATH.'); AUDIO.sfx('back'); return; }
    this.songMode = true; this.hexMode = false; this.gateMode = false; this.selWeapon = -1;
    this.log('CHOOSE A ROOM - CHARM A SAILOR IN IT'); AUDIO.sfx('click');
  }
  doSirensong(enemyRoomId) {
    const bars = this.p.powered('sirensong');
    if (bars <= 0 || this.p.songCd > 0) return;
    const here = this.e.aliveCrew().filter(c => c.aboard === 'home' && c.roomId === enemyRoomId && c.owner === 'enemy');
    if (!here.length) { this.log('NO ONE THERE TO CHARM.'); AUDIO.sfx('back'); return; }
    const victim = U.pick(here);
    this.p.songCd = this.p.songCdMax = TUNING.songCdSecs[bars]; // spent even on a resist (scout for merfolk)
    if (victim.race === 'merfolk') { this.log(victim.name.toUpperCase() + ' HEARS NO SONG - MERFOLK.'); AUDIO.sfx('back'); return; }
    this.charm(victim, TUNING.songCharmSecs[bars], TUNING.songBuffMul[bars]);
    const rr = this.roomRect(this.e, this.e.rooms[enemyRoomId]), m = this.mountPos(this.p, 0);
    this.beams.push({ x1: m.x, y1: m.y, x2: rr.x + rr.w / 2, y2: rr.y + rr.h / 2, x3: rr.x + rr.w / 2, y3: rr.y + rr.h / 2, t: 0.6, col: COL.pink, song: true });
    AUDIO.sfx('teleport');
    this.log(victim.name.toUpperCase() + ' TURNS ON THEIR OWN CREW!');
  }

  key(k) {
    if (k === ' ') { this.togglePause(); return; }
    const n = parseInt(k);
    if (n >= 1 && n <= this.p.weapons.length) {
      this.selWeapon = this.selWeapon === n - 1 ? -1 : n - 1;
      AUDIO.sfx('click');
    }
    if (k === 'r' || k === 'R') { // all hands: return to saved battle stations
      if (this.returnStations()) { this.log('ALL HANDS TO STATIONS!'); AUDIO.sfx('click'); }
      return;
    }
    if (k === 't' || k === 'T') { // save current positions as the stations
      if (this.setStations()) { this.log('STATIONS SAVED - PRESS R TO RECALL.'); AUDIO.sfx('click'); }
      return;
    }
    if (k === 'c' || k === 'C') { this.tryStormhex(); return; } // Storm Conduit
    if (k === 's' || k === 'S') { this.trySong(); return; }     // Siren's Song
    if (k === 'f' || k === 'F') { // deploy/re-bind the next available offensive familiar (1 candle)
      const k2 = this.shrineSlots().find(fk => { const st = this.famDeployState(fk); return st === 'deploy' || st === 'rebind'; });
      if (k2) this.deployFamiliar(k2); else AUDIO.sfx('back');
      return;
    }
    if (k === 'Escape') { this.selWeapon = -1; this.gateMode = false; this.hexMode = false; this.songMode = false; this.selCrew.clear(); }
  }
  togglePause() { this.paused = !this.paused; AUDIO.sfx(this.paused ? 'back' : 'click'); }

  inRect(x, y, rx, ry, rw, rh) { return U.inRect(x, y, rx, ry, rw, rh); }
  // draw fn() in a mirrored frame (enemy ship is flipped on x); ox/oy = the flip origin.
  mirrored(ctx, ox, oy, fn) { ctx.save(); ctx.translate(ox, oy); ctx.scale(-1, 1); fn(); ctx.restore(); }
  roomAt(ship, x, y) {
    for (const r of ship.rooms) {
      const rr = this.roomRect(ship, r);
      if (this.inRect(x, y, rr.x, rr.y, rr.w, rr.h)) return r.id;
    }
    return null;
  }
  crewAt(x, y) {
    for (const c of this.p.crew.concat(this.e.crew)) {
      if (c.dead) continue;
      const sp = this.crewScreenPos(c);
      if (this.inRect(x, y, sp.x - 1, sp.y - 1, 14, 16)) return c;
    }
    return null;
  }

  // ---------- render ----------
  renderSea(ctx) {
    const storm = this.hazard === 'storm', fog = this.hazard === 'fog';
    // baked background plate + animated layers
    const bg = SPR.bgImage(storm ? 'storm' : fog ? 'fog' : 'day');
    if (bg) {
      ctx.drawImage(bg, 0, 0, bg.width, bg.height, 0, 0, 512, 230);
      // animated swells over the baked sea (sparse, gentle)
      for (let row = 0; row < 2; row++) {
        ctx.fillStyle = storm ? 'rgba(70,120,160,0.3)' : ['rgba(150,210,240,0.35)', 'rgba(100,170,215,0.25)'][row];
        for (let x = -8; x < 512; x += 34 + row * 10) {
          const wy = SEA_Y + 3 + row * 10 + Math.round(Math.sin(x * 0.11 + this.time * (2.2 - row * 0.5) + row * 2) * 2);
          ctx.fillRect(x + row * 9, wy, 10, 2);
        }
      }
      if (!storm) {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        for (let i = 0; i < 8; i++) {
          if (Math.floor(this.time * 4 + i * 1.7) % 3 === 0) ctx.fillRect((i * 67 + 23) % 512, SEA_Y + 3 + (i * 29) % 22, 2, 1);
        }
        // gulls
        ctx.fillStyle = 'rgba(20,20,40,0.7)';
        for (let i = 0; i < 3; i++) {
          const bx = ((i * 210 + this.time * 14) % 560) - 20;
          const byy = 50 + i * 16 + Math.round(Math.sin(this.time * 3 + i) * 2);
          ctx.fillRect(bx, byy, 2, 1); ctx.fillRect(bx + 3, byy, 2, 1); ctx.fillRect(bx + 2, byy - 1, 1, 1);
        }
      }
      return;
    }
    // layered sky with dithered band edges
    const bands = storm
      ? ['#1c1c30', '#23233a', '#2c2c46', '#3a3a55', '#454560']
      : fog
        ? ['#4e586c', '#5a6478', '#6c7888', '#7e8a98', '#8e9aa8']
        : ['#16275c', '#23407c', '#33599c', '#4b76b4', '#6f97c9'];
    const bh = [44, 40, 38, 36, SEA_Y];
    let by = 0;
    bands.forEach((col, i) => {
      const h = i < 4 ? bh[i] : SEA_Y - by;
      ctx.fillStyle = col;
      ctx.fillRect(0, by, 512, h);
      if (i > 0) { // dither row
        ctx.fillStyle = bands[i - 1];
        for (let x = (i % 2) * 2; x < 512; x += 4) ctx.fillRect(x, by, 2, 1);
      }
      by += h;
    });
    // sun / moon with halo
    if (!storm && !fog) {
      const g = ctx.createRadialGradient(448, 34, 2, 448, 34, 26);
      g.addColorStop(0, 'rgba(255,236,170,0.85)'); g.addColorStop(0.4, 'rgba(255,236,170,0.25)'); g.addColorStop(1, 'rgba(255,236,170,0)');
      ctx.fillStyle = g; ctx.fillRect(414, 0, 68, 68);
      ctx.fillStyle = '#fff0c0';
      ctx.fillRect(442, 28, 12, 12); ctx.fillRect(444, 26, 8, 16); ctx.fillRect(440, 30, 16, 8);
    }
    // puffy clouds, two layers
    const ct = this.time * 4;
    const cloud = (cx2, cy2, s, col) => {
      ctx.fillStyle = col;
      ctx.fillRect(cx2, cy2 + 4 * s, 34 * s, 6 * s);
      ctx.fillRect(cx2 + 5 * s, cy2 + 1 * s, 14 * s, 5 * s);
      ctx.fillRect(cx2 + 17 * s, cy2 - 2 * s, 12 * s, 8 * s);
      ctx.fillRect(cx2 + 26 * s, cy2 + 2 * s, 8 * s, 4 * s);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(cx2 + 4 * s, cy2 + 4 * s, 24 * s, 2 * s);
    };
    for (let i = 0; i < 3; i++) {
      const cx2 = ((i * 190 + ct * 0.5) % 600) - 50;
      cloud(cx2, 16 + i * 13, 1, storm ? '#15152a' : 'rgba(238,242,248,0.85)');
    }
    for (let i = 0; i < 3; i++) {
      const cx2 = ((i * 170 + 90 + ct) % 620) - 60;
      cloud(cx2, 64 + i * 11, 0.7, storm ? '#1d1d33' : 'rgba(220,230,244,0.5)');
    }
    // distant scenery: far isle chain + cliff town
    if (!fog) {
      ctx.fillStyle = storm ? '#262640' : '#39558e';
      ctx.fillRect(0, SEA_Y - 26, 70, 26);
      ctx.fillRect(40, SEA_Y - 36, 46, 36);
      ctx.fillRect(440, SEA_Y - 30, 72, 30);
      ctx.fillStyle = storm ? '#2e2e4a' : '#46659e';
      ctx.fillRect(456, SEA_Y - 40, 30, 14);
      // tiny town on the cliff
      ctx.fillStyle = storm ? '#3a3a55' : '#5d7cab';
      ctx.fillRect(52, SEA_Y - 44, 6, 9); ctx.fillRect(62, SEA_Y - 41, 5, 6); ctx.fillRect(466, SEA_Y - 47, 6, 8); ctx.fillRect(476, SEA_Y - 44, 5, 5);
      ctx.fillStyle = storm ? '#4a3040' : '#a0524a';
      ctx.fillRect(51, SEA_Y - 46, 8, 2); ctx.fillRect(61, SEA_Y - 43, 7, 2); ctx.fillRect(465, SEA_Y - 49, 8, 2); ctx.fillRect(475, SEA_Y - 46, 7, 2);
      ctx.fillStyle = COL.gold;
      ctx.fillRect(54, SEA_Y - 42, 1, 1); ctx.fillRect(468, SEA_Y - 45, 1, 1);
      // green tops
      ctx.fillStyle = storm ? '#23303a' : '#3f6a55';
      ctx.fillRect(0, SEA_Y - 28, 44, 4); ctx.fillRect(440, SEA_Y - 32, 40, 4);
    }
    // birds
    if (!storm) {
      ctx.fillStyle = 'rgba(20,20,40,0.7)';
      for (let i = 0; i < 3; i++) {
        const bx = ((i * 210 + this.time * 14) % 560) - 20;
        const byy = 50 + i * 16 + Math.round(Math.sin(this.time * 3 + i) * 2);
        ctx.fillRect(bx, byy, 2, 1); ctx.fillRect(bx + 3, byy, 2, 1); ctx.fillRect(bx + 2, byy - 1, 1, 1);
      }
    }
    // horizon haze
    ctx.fillStyle = 'rgba(220,232,244,' + (fog ? 0.4 : 0.18) + ')';
    ctx.fillRect(0, SEA_Y - 3, 512, 3);
    // sea: deep gradient bands + animated swells + sparkle
    const seaCols = storm ? ['#11283e', '#0e2236', '#0b1c2e'] : ['#21558c', '#1a4474', '#14335c'];
    ctx.fillStyle = seaCols[0]; ctx.fillRect(0, SEA_Y, 512, 10);
    ctx.fillStyle = seaCols[1]; ctx.fillRect(0, SEA_Y + 10, 512, 10);
    ctx.fillStyle = seaCols[2]; ctx.fillRect(0, SEA_Y + 20, 512, HUD_Y - SEA_Y - 20);
    for (let row = 0; row < 3; row++) {
      ctx.fillStyle = storm ? 'rgba(60,110,150,0.5)' : ['rgba(127,200,230,0.55)', 'rgba(90,160,210,0.45)', 'rgba(70,130,190,0.35)'][row];
      for (let x = -8; x < 512; x += 14 + row * 5) {
        const wy = SEA_Y + 2 + row * 8 + Math.round(Math.sin(x * 0.11 + this.time * (2.6 - row * 0.5) + row * 2) * 2);
        ctx.fillRect(x + row * 4, wy, 8 + row * 2, 2);
        ctx.fillRect(x + row * 4 + 2, wy + 2, 4, 1);
      }
    }
    // glints
    if (!storm) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 0; i < 9; i++) {
        if (Math.floor(this.time * 4 + i * 1.7) % 3 === 0) {
          ctx.fillRect((i * 67 + 23) % 512, SEA_Y + 3 + (i * 29) % 22, 2, 1);
        }
      }
    }
  }

  renderHazardFx(ctx) {
    if (this.hazard === 'storm') {
      ctx.fillStyle = 'rgba(160,180,210,0.5)';
      for (let i = 0; i < 30; i++) {
        const rx = (i * 67 + Math.floor(this.time * 240)) % 512;
        const ry = (i * 41 + Math.floor(this.time * 380)) % HUD_Y;
        ctx.fillRect(rx, ry, 1, 5);
      }
    }
    if (this.hazard === 'fog') {
      ctx.fillStyle = 'rgba(200,205,215,0.25)';
      const fx = (this.time * 8) % 512;
      ctx.fillRect(fx - 512, 80, 400, 30); ctx.fillRect(fx, 80, 400, 30);
      ctx.fillRect((fx * 1.4) % 512 - 200, 150, 300, 24);
    }
    if (this.hazard === 'whirlpool') {
      ctx.strokeStyle = 'rgba(127,212,210,0.5)';
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const rr = 30 + i * 22 + (this.time * 12 % 22);
        ctx.arc(256, SEA_Y + 16, rr, 0, Math.PI * 2);
      }
      ctx.stroke();
    }
    // tentacle now decays in update(); this block only draws it
    if (this.tentacleT > 0) {
      const ship = this.tentacleShip || this.p;
      const tx = ship === this.p ? this.pX() + ship.rw / 2 : this.eX() + ship.rw / 2;
      ctx.fillStyle = '#2e4438';
      for (let i = 0; i < 26; i++) {
        ctx.fillRect(tx + Math.round(Math.sin(i * 0.4 + this.time * 6) * 5), SEA_Y - i * 3, 7 - Math.floor(i / 5), 3);
      }
    }
  }

  // FTL-style deck plan: pale plank floors, tile grid, thick walls, real doors.
  // Rooms read as rooms; the painted hull keeps the romance around them.
  drawDeckPlan(ctx, ship) {
    // floors
    for (const r of ship.rooms) {
      const rr = this.roomRect(ship, r);
      ctx.fillStyle = '#dccaa4';
      ctx.fillRect(rr.x, rr.y, rr.w, rr.h);
      ctx.fillStyle = '#d2c098';
      for (let yy = rr.y + 4; yy < rr.y + rr.h; yy += 8) ctx.fillRect(rr.x, yy, rr.w, 4);
      ctx.fillStyle = 'rgba(168,146,108,0.55)';
      for (let gx = rr.x + TILE; gx < rr.x + rr.w - 1; gx += TILE) ctx.fillRect(gx, rr.y, 1, rr.h);
    }
    // thick timber walls
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#2a1c10';
    for (const r of ship.rooms) {
      const rr = this.roomRect(ship, r);
      ctx.strokeRect(rr.x, rr.y, rr.w, rr.h);
    }
    ctx.lineWidth = 1;
    // doors: timber jambs on every shared wall. CLOSED = brown slab in the gap,
    // OPEN = clear light gap (and water pours through). Click a door to toggle.
    ship.doors.forEach((d, di) => {
      const pos = this.doorPos(ship, di);
      if (!pos) return;
      const open = ship.doorOpen[di];
      if (pos.o === 'v') {
        ctx.fillStyle = '#e8d8b6'; ctx.fillRect(pos.x - 2, pos.y - 4, 4, 8);
        if (!open) { ctx.fillStyle = '#7a5230'; ctx.fillRect(pos.x - 2, pos.y - 4, 4, 8); ctx.fillStyle = '#4a3018'; ctx.fillRect(pos.x - 1, pos.y - 3, 2, 6); }
        ctx.fillStyle = '#6a4a26'; ctx.fillRect(pos.x - 2, pos.y - 6, 4, 2); ctx.fillRect(pos.x - 2, pos.y + 4, 4, 2);
      } else {
        ctx.fillStyle = '#e8d8b6'; ctx.fillRect(pos.x - 4, pos.y - 2, 8, 4);
        if (!open) { ctx.fillStyle = '#7a5230'; ctx.fillRect(pos.x - 4, pos.y - 2, 8, 4); ctx.fillStyle = '#4a3018'; ctx.fillRect(pos.x - 3, pos.y - 1, 6, 2); }
        ctx.fillStyle = '#6a4a26'; ctx.fillRect(pos.x - 6, pos.y - 2, 2, 4); ctx.fillRect(pos.x + 4, pos.y - 2, 2, 4);
      }
    });
  }

  // screen position + orientation of door di on a ship (shared-wall midpoint)
  doorPos(ship, di) {
    const [a, b] = ship.doors[di];
    const ra = this.roomRect(ship, ship.rooms[a]);
    const rb = this.roomRect(ship, ship.rooms[b]);
    const vertA = Math.abs((ra.x + ra.w) - rb.x) < 1.5, vertB = Math.abs((rb.x + rb.w) - ra.x) < 1.5;
    if (vertA || vertB) {
      const x = vertA ? ra.x + ra.w : rb.x + rb.w;
      const y0 = Math.max(ra.y, rb.y), y1 = Math.min(ra.y + ra.h, rb.y + rb.h);
      return { o: 'v', x, y: Math.round((y0 + y1) / 2) };
    }
    const horA = Math.abs((ra.y + ra.h) - rb.y) < 1.5;
    const y = horA ? ra.y + ra.h : rb.y + rb.h;
    const x0 = Math.max(ra.x, rb.x), x1 = Math.min(ra.x + ra.w, rb.x + rb.w);
    return { o: 'h', x: Math.round((x0 + x1) / 2), y };
  }
  doorAt(ship, x, y) {
    for (let di = 0; di < ship.doors.length; di++) {
      const pos = this.doorPos(ship, di);
      if (pos && Math.abs(x - pos.x) <= 5 && Math.abs(y - pos.y) <= 5) return di;
    }
    return null;
  }

  // crew box-select (drag a rectangle, FTL-style); additive with shift
  boxSelect(x0, y0, x1, y1, additive) {
    const rx0 = Math.min(x0, x1), rx1 = Math.max(x0, x1);
    const ry0 = Math.min(y0, y1), ry1 = Math.max(y0, y1);
    if (!additive) this.selCrew.clear();
    for (const c of this.p.crew) {
      if (c.dead) continue;
      const sp = this.crewScreenPos(c);
      const cx = sp.x + 6, cy = sp.y + 7;
      if (cx >= rx0 && cx <= rx1 && cy >= ry0 && cy <= ry1) this.selCrew.add(c.id);
    }
    if (this.selCrew.size) AUDIO.sfx('click');
  }

  renderShip(ctx, ship) {
    const isP = ship === this.p;
    const sx = isP ? this.pX() : this.eX();
    const sy = isP ? this.pY() : this.eY();
    const sinkF = this.sinkF(ship);
    if (sinkF > 0) {
      ctx.save();
      const cx2 = sx + ship.rw / 2, cy2 = SEA_Y;
      ctx.translate(cx2, cy2);
      ctx.rotate((isP ? -1 : 1) * 0.09 * sinkF); // she lists as she goes down
      ctx.translate(-cx2, -cy2);
    }
    // user AI art takes priority over everything
    const artE = SPR.artShip(ship.layoutKey, ship.style);
    let drewArt = false;
    let intX0 = 0, intW = 0; // the art's interior cutaway band, logical px
    if (artE) {
      const m = artE.meta;
      const D = m.dens || 2; // art density: HD hulls store 4x, legacy 2x
      const lw = m.w / D, lh = m.h / D; // logical size
      // anchor: interior rect center -> room-grid center; tops aligned
      const artY = sy - m.oy / D;
      if (isP) {
        const artX = sx + ship.rw / 2 - (m.ox + m.iw / 2) / D;
        ctx.drawImage(artE.img, Math.round(artX), Math.round(artY), lw, lh);
        intX0 = artX + m.ox / D; intW = m.iw / D;
      } else {
        const oxFlip = m.w - m.ox - m.iw; // interior offset after mirroring
        const artX = sx + ship.rw / 2 - (oxFlip + m.iw / 2) / D;
        this.mirrored(ctx, Math.round(artX) + lw, Math.round(artY), () => ctx.drawImage(artE.img, 0, 0, lw, lh));
        intX0 = artX + oxFlip / D; intW = m.iw / D;
      }
      drewArt = true;
    }
    // exterior (baked if available, procedural fallback)
    const extName = 'ext_' + ship.layoutKey + '_' + ship.style;
    let drewExt = drewArt;
    if (!drewExt && SPR.hasFrame(extName)) {
      if (isP) drewExt = SPR.drawFrame(ctx, extName, sx - SPR.SHIP_MX, sy - SPR.SHIP_MY);
      else {
        const fsz = SPR.frameSize(extName);
        drewExt = SPR.drawFrame(ctx, extName, sx + ship.rw + SPR.SHIP_MX - fsz.w, sy - SPR.SHIP_MY, true);
      }
    }
    if (!drewExt) {
      const ext = SPR.shipExterior({
        style: ship.style, rw: ship.rw, rh: ship.rh, masts: ship.masts, big: ship.big,
        sailPct: 1, hullPct: ship.hull / ship.hullMax,
      });
      if (isP) {
        ctx.drawImage(ext, sx - SPR.SHIP_MX, sy - SPR.SHIP_MY);
      } else {
        this.mirrored(ctx, sx + ship.rw + SPR.SHIP_MX, 0, () => ctx.drawImage(ext, 0, sy - SPR.SHIP_MY));
      }
    }
    // battle damage overlay on the hull
    const hpFrac = ship.hull / ship.hullMax;
    if (hpFrac < 0.65) {
      ctx.fillStyle = '#16101c';
      ctx.fillRect(sx + Math.round(ship.rw * 0.32), sy + ship.rh + 3, 7, 3);
      ctx.fillRect(sx + Math.round(ship.rw * 0.7), sy + ship.rh + 5, 5, 3);
      ctx.fillRect(sx - 8, sy + ship.rh - 2, 4, 4);
    }
    if (hpFrac < 0.35) {
      ctx.fillStyle = '#16101c';
      ctx.fillRect(sx + Math.round(ship.rw * 0.5), sy + ship.rh + 2, 9, 4);
      ctx.fillRect(sx + ship.rw + 4, sy + ship.rh - 3, 5, 4);
      // smoke wisps
      ctx.fillStyle = 'rgba(90,90,105,0.5)';
      const smT = this.time * 14;
      ctx.fillRect(sx + Math.round(ship.rw * 0.5) + Math.round(Math.sin(this.time * 2) * 3), sy + ship.rh - 4 - (smT % 22), 4, 3);
      ctx.fillRect(sx + Math.round(ship.rw * 0.52), sy + ship.rh - 14 - (smT % 16), 3, 2);
    }
    // wake foam at the waterline
    ctx.fillStyle = 'rgba(244,250,252,0.8)';
    for (let fx2 = -6; fx2 < ship.rw + 18; fx2 += 9) {
      const fy2 = SEA_Y + Math.round(Math.sin(fx2 * 0.4 + this.time * 5 + (isP ? 0 : 3)) * 1.5);
      ctx.fillRect(sx + fx2 - 6, fy2, 5, 2);
    }
    ctx.fillStyle = 'rgba(244,250,252,0.4)';
    ctx.fillRect(sx - 12, SEA_Y + 3, ship.rw + 26, 1);

    // veil effect: the interior is NO LONGER dimmed (crew/fires/systems must stay readable);
    // the fog now RINGS the hull instead — drawn at the end of renderShip.

    // interior visible?
    const hidden = !isP && this.enemyInteriorHidden();

    // furnished interior cutaway (skip when AI art provides it; baked, procedural fallback)
    if (drewArt) {
      // FTL-style neutral interior: a baked fill shape that hugs THIS hull's
      // cutaway outline (silhouette ∩ interior band, computed at import time)
      const fillKey = ship.style && SPR.artEntry('ship_' + ship.layoutKey + '_' + ship.style + '_fill')
        ? 'ship_' + ship.layoutKey + '_' + ship.style + '_fill'
        : 'ship_' + ship.layoutKey + '_fill';
      const fe = SPR.artEntry(fillKey);
      if (fe && artE) {
        const m = artE.meta;
        const D = m.dens || 2;
        const lw = m.w / D, lh = m.h / D;
        const artY = sy - m.oy / D;
        if (isP) {
          const artX = sx + ship.rw / 2 - (m.ox + m.iw / 2) / D;
          ctx.drawImage(fe.img, Math.round(artX), Math.round(artY), lw, lh);
        } else {
          const oxFlip = m.w - m.ox - m.iw;
          const artX = sx + ship.rw / 2 - (oxFlip + m.iw / 2) / D;
          this.mirrored(ctx, Math.round(artX) + lw, Math.round(artY), () => ctx.drawImage(fe.img, 0, 0, lw, lh));
        }
      } else {
        // fallback: simple rounded band (older imports without baked fills)
        const fc = ({
          pirate: '#6a5440', human: '#6b5a44', armada: '#5a5266', merfolk: '#2e6b74',
          djinn: '#7a4a30', stormelf: '#4a5e78', dwarf: '#5c5650', lizard: '#55663c',
          siren: '#6e5270', ghost: '#5a7080', boss: '#4a4066',
        })[ship.style] || '#4a443c';
        const fx0 = Math.round(intX0) - 5;
        const fw = Math.round(intW) + 10;
        const fy0 = sy - 3;
        const fh = Math.max(ship.rh + 6, SEA_Y + 2 - fy0);
        ctx.fillStyle = fc;
        UI.roundRect(ctx, fx0, fy0, fw, fh, 6);
        ctx.fill();
      }
      // FTL-style deck plan: flat readable rooms over the neutral fill
      this.drawDeckPlan(ctx, ship);
    } else if (!SPR.drawFrame(ctx, 'int_' + ship.layoutKey + '_' + ship.style, sx, sy, !isP)) {
      const inner = SPR.shipInterior(ship.layoutKey, ship.style);
      if (isP) {
        ctx.drawImage(inner, sx, sy);
      } else {
        this.mirrored(ctx, sx + ship.rw, 0, () => ctx.drawImage(inner, 0, sy));
      }
    }

    // rooms
    for (const r of ship.rooms) {
      const rr = this.roomRect(ship, r);
      if (hidden) {
        ctx.fillStyle = 'rgba(16,14,26,0.88)';
        ctx.fillRect(rr.x, rr.y, rr.w, rr.h);
      }
      // STORM CONDUIT jam: lightning crackles around the room's border while ion runs (fades as it ends)
      if (!hidden && r.ion > 0) {
        ctx.fillStyle = 'rgba(127,212,210,0.16)'; ctx.fillRect(rr.x, rr.y, rr.w, rr.h); // faint residual tint
        const fade = Math.min(1, r.ion / 1.5);            // dim out in the final 1.5s
        const per = 2 * (rr.w + rr.h), step = 4;
        const ptAt = (d) => { // walk the perimeter, jitter the perpendicular axis -> a crawling bolt
          const n = (Math.sin(d * 2.3 + this.time * 13 + r.id) + Math.sin(d * 5.1 - this.time * 9)) * 0.9;
          if (d < rr.w) return [rr.x + d, rr.y + n];
          if (d < rr.w + rr.h) return [rr.x + rr.w + n, rr.y + (d - rr.w)];
          if (d < 2 * rr.w + rr.h) return [rr.x + rr.w - (d - rr.w - rr.h), rr.y + rr.h + n];
          return [rr.x + n, rr.y + rr.h - (d - 2 * rr.w - rr.h)];
        };
        ctx.save(); ctx.lineJoin = 'round';
        for (const pass of [[3, 'rgba(127,212,210,0.55)'], [1.2, '#dff2ff']]) {
          ctx.lineWidth = pass[0]; ctx.strokeStyle = pass[1];
          ctx.globalAlpha = fade * (0.55 + 0.45 * Math.sin(this.time * 22 + r.id)); // electric flicker
          ctx.beginPath();
          for (let d = 0; d <= per; d += step) { const p = ptAt(d); if (d === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); }
          ctx.closePath(); ctx.stroke();
        }
        ctx.globalAlpha = 1; ctx.restore();
      }
      // water (animated surface) — flooding is an externally visible structural failure,
      // so it shows on the enemy even without a Lookout (so breach/flood weapons read).
      if (r.water > 0.02) {
        const wh = Math.round(rr.h * Math.min(1, r.water));
        ctx.fillStyle = 'rgba(48,96,190,0.62)';
        ctx.fillRect(rr.x, rr.y + rr.h - wh, rr.w, wh);
        ctx.fillStyle = 'rgba(150,200,240,0.8)';
        for (let wx2 = 0; wx2 < rr.w; wx2 += 5) {
          ctx.fillRect(rr.x + wx2, rr.y + rr.h - wh + Math.round(Math.sin(wx2 + this.time * 6) * 1), 3, 1);
        }
      }
      // border
      ctx.strokeStyle = 'rgba(36,26,16,0.9)';
      ctx.strokeRect(rr.x + 0.5, rr.y + 0.5, rr.w - 1, rr.h - 1);
      // system icon — flat silhouette (drawSysSym), sized to the room, no surrounding box.
      // Turns bright red when damage has knocked the system OFFLINE (both ships).
      if (r.key && ship.sysLv[r.key] > 0 && !hidden) {
        const eff = ship.sysEff(r.key);
        const isz = Math.max(11, Math.min(rr.w, rr.h, 24) - 4);
        const cx = rr.x + rr.w / 2, cy = rr.y + rr.h / 2;
        const sub = DATA.SYS_SUB && DATA.SYS_SUB.includes(r.key);
        const offline = r.dmg > 0 && eff === 0; // damaged to the point of being down
        drawSysSym(ctx, r.key, cx - isz / 2, cy - isz / 2, isz, offline ? '#ff2e2e' : (sub ? COL.teal : COL.inkdk));
        ctx.globalAlpha = 1;
        if (r.dmg > 0 && !offline) { ctx.fillStyle = COL.orange; ctx.fillRect(rr.x + 1, rr.y + 1, 3, 3); } // damaged but still up
      }
      // HULL BREACH: big jagged hole, blinking ring - crew must patch it.
      // Visible on the enemy even without a Lookout (a breached hull is obvious from outside).
      if (r.leak) {
        const bx = rr.x + rr.w - 11, by = rr.y + 1;
        ctx.drawImage(SPR.icon('breach'), bx, by);
        if (Math.floor(this.time * 3) % 2) {
          ctx.strokeStyle = COL.red;
          ctx.strokeRect(bx - 0.5, by - 0.5, 11, 11);
        }
      }
      // sea door: a hatch on the bottom wall of hull rooms (brown shut, cyan open)
      if (isP && r.seaDoor) {
        const hx = rr.x + Math.floor(rr.w / 2) - 5, hy = rr.y + rr.h - 3;
        ctx.fillStyle = r.scupper ? COL.cyan : '#5a3c20';
        ctx.fillRect(hx, hy, 10, 3);
        ctx.fillStyle = r.scupper ? COL.white : '#8a6a40';
        ctx.fillRect(hx + 4, hy + 1, 2, 1);
      }
      // open sea door: rising bubbles
      if (isP && r.scupper) {
        ctx.fillStyle = 'rgba(191,232,228,0.8)';
        for (let b = 0; b < 3; b++) {
          const by2 = rr.y + rr.h - 3 - ((this.time * 14 + b * 6) % (rr.h - 5));
          ctx.fillRect(rr.x + 5 + b * 5, by2, 2, 2);
        }
      }
      // fire: per-TILE — an orange tint + a flame on EACH burning tile (more fire = more flames, FTL)
      if (r.fire > 0) {
        const tw = rr.w / r.w, th = rr.h / r.h, fr = Math.floor(this.time * 6);
        for (let i = 0; i < r._fires.length; i++) {
          if (r._fires[i] <= 0) continue;
          const lx = i % r.w, ly = (i / r.w) | 0, tx = rr.x + lx * tw, ty = rr.y + ly * th;
          ctx.fillStyle = 'rgba(220,90,30,0.28)'; ctx.fillRect(tx, ty, tw, th);
          const fl = SPR.flame((fr + lx + ly) % 2); // stagger so tiles flicker independently
          ctx.drawImage(fl, Math.round(tx + tw / 2 - fl.width / 2), Math.round(ty + th - fl.height - 1));
        }
      }
      // barnacle coral SEAL: while _sealT runs, a crust of coral grows over the room's edges/doors
      if (r._sealT > 0) {
        const seed = (r.id * 2654435761) >>> 0;
        const rnd = (k) => { const s = (seed ^ (k * 374761393)) >>> 0; return ((s * 1103515245 + 12345) >>> 16) % 1000 / 1000; };
        ctx.fillStyle = 'rgba(74,110,70,0.22)'; ctx.fillRect(rr.x, rr.y, rr.w, rr.h); // greenish wash
        const peri = []; // points around the room border
        for (let s = 0; s < Math.max(6, Math.round((rr.w + rr.h) / 6)); s++) peri.push(s);
        ctx.lineWidth = 1;
        peri.forEach((s, idx) => {
          const along = rnd(idx) * 2 * (rr.w + rr.h);
          let bx, by;
          if (along < rr.w) { bx = rr.x + along; by = rr.y; }
          else if (along < rr.w + rr.h) { bx = rr.x + rr.w; by = rr.y + (along - rr.w); }
          else if (along < 2 * rr.w + rr.h) { bx = rr.x + rr.w - (along - rr.w - rr.h); by = rr.y + rr.h; }
          else { bx = rr.x; by = rr.y + rr.h - (along - 2 * rr.w - rr.h); }
          const rad = 2 + rnd(idx + 99) * 2;
          ctx.fillStyle = idx % 3 === 0 ? '#c98a5a' : (idx % 3 === 1 ? '#6a8a4a' : '#a6b878');
          ctx.beginPath(); ctx.arc(bx, by, rad, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(Math.round(bx - 0.5), Math.round(by - 0.5), 1, 1);
        });
        ctx.strokeStyle = 'rgba(74,110,70,0.7)'; ctx.strokeRect(rr.x + 0.5, rr.y + 0.5, rr.w - 1, rr.h - 1);
      }
      // poison: a faint green miasma over a room whose crew are envenomed
      if (occupantsOf(ship, r.id, this).some(c => c.poison > 0)) {
        ctx.fillStyle = 'rgba(120,200,60,0.16)'; ctx.fillRect(rr.x, rr.y, rr.w, rr.h);
        const wy = rr.y + rr.h - 3 - ((this.time * 8) % (rr.h - 4));
        ctx.fillStyle = 'rgba(150,220,90,0.5)';
        ctx.fillRect(rr.x + (Math.sin(this.time * 3 + r.id) * 0.5 + 0.5) * (rr.w - 4) + 2, wy, 2, 2);
      }
      // kraken ink: a dark smear clouds the blinded helm
      if (r.key === 'helm' && ship._blindT > 0) {
        ctx.fillStyle = 'rgba(20,15,30,0.5)'; ctx.fillRect(rr.x, rr.y, rr.w, rr.h);
        ctx.fillStyle = 'rgba(74,44,102,0.5)';
        for (let d = 0; d < 4; d++) { const dx2 = rr.x + 3 + d * (rr.w - 6) / 3; ctx.fillRect(dx2, rr.y + 2, 2, 3 + ((this.time * 10 + d * 3) % 4)); }
      }
      // weapon target marker
      if (!isP) {
        this.p.weapons.forEach((w, wi) => {
          if (w.target === r.id && w.on) {
            ctx.strokeStyle = ['#f0c050', '#e07830', '#7fd4d2', '#e08ab0'][wi % 4];
            ctx.strokeRect(rr.x + 1.5, rr.y + 1.5, rr.w - 3, rr.h - 3);
          }
        });
        if (this.gateMode || this.selWeapon >= 0) {
          ctx.fillStyle = 'rgba(240,192,80,0.15)';
          ctx.fillRect(rr.x, rr.y, rr.w, rr.h);
        }
      }
    }
    // crew on this ship
    for (const c of this.p.crew.concat(this.e.crew)) {
      if (c.dead) continue;
      const sp = this.crewScreenPos(c);
      if (sp.loc !== ship) continue;
      if (hidden && !this.p.crew.includes(c)) continue;
      // selection / hostility ring
      if (this.selCrew.has(c.id)) {
        ctx.strokeStyle = COL.white; ctx.strokeRect(sp.x - 1.5, sp.y - 1.5, 15, 17);
      }
      const hostileHere = c.owner === 'enemy' && sp.loc === this.p || c.owner === 'player' && sp.loc === this.e;
      // soft shadow under feet
      ctx.fillStyle = 'rgba(20,12,6,0.35)';
      ctx.fillRect(Math.round(sp.x) + 1, Math.round(sp.y) + 13, 10, 2);
      // HD-2D pose animation (state machine); per-crew anim clock from state changes
      const ast = DATA.crewAnimState(c);
      // crew poses run on simTime (frozen while paused); deck view has no simTime -> uses this.time
      const animT = (this.simTime != null) ? this.simTime : this.time;
      if (c._animSt !== ast) { c._animSt = ast; c._animT0 = animT; }
      const aclk = animT - (c._animT0 || 0);
      const pose = DATA.crewAnimFrame(ast, aclk, c.race);
      const footX = Math.round(sp.x) + 6;
      const footY = Math.round(sp.y) + 14 + DATA.crewAnimDY(ast, aclk, c.race);
      // pose kit first; else legacy 2-frame sprite; else baked/procedural fallback
      if (!SPR.drawCrewPose(ctx, c.race, pose, sp.flip, footX, footY, TUNING.crewDrawH)) {
        if (!SPR.drawCrewArt(ctx, c.race, c.frame, sp.flip, Math.round(sp.x), Math.round(sp.y))) {
          if (!SPR.drawFrame(ctx, 'crew_' + c.race + '_' + c.frame, Math.round(sp.x), Math.round(sp.y), sp.flip)) {
            ctx.drawImage(SPR.crew(c.race, c.frame, sp.flip), Math.round(sp.x), Math.round(sp.y));
          }
        }
      }
      // hp pip (only when actually hurt - no silly hats on healthy sailors)
      if (c.hp < c.maxhp - 1) {
        const hpw = Math.max(1, Math.round(10 * c.hp / c.maxhp));
        ctx.fillStyle = COL.black; ctx.fillRect(sp.x, sp.y - 3, 12, 2);
        ctx.fillStyle = c.owner === 'player' ? COL.green : COL.red;
        ctx.fillRect(sp.x + 1, sp.y - 3, hpw, 2);
      }
      if (c.stun > 0) { TYPE.draw(ctx, 'Z', sp.x + 10, sp.y - 10, 11, COL.cyan, { display: true }); }
      if (c._healT > 0 && Math.floor(this.time * 6) % 2) { TYPE.draw(ctx, '+', sp.x + 10, sp.y - 10, 12, COL.green, { display: true }); }
      // busy badge: a tapping hammer chip + progress bar over any sailor who is
      // repairing (gold), patching a breach (timber), or fighting fire (water)
      if (c._task) {
        const bx = Math.round(sp.x) + 1, by = Math.round(sp.y) - 21;
        const swing = Math.floor(this.time * 6) % 2;
        const tcol = c._task === 'fire' ? COL.cyan : c._task === 'patch' ? '#c08a4a' : c._task === 'sabotage' ? COL.red : COL.gold;
        ctx.fillStyle = 'rgba(12,8,4,0.82)';
        ctx.fillRect(bx - 1, by - 1, 11, 11);
        ctx.strokeStyle = tcol;
        ctx.strokeRect(bx - 0.5, by - 0.5, 10, 10);
        ctx.fillStyle = tcol;
        if (c._task === 'fire') {
          // flung water droplets
          ctx.fillRect(bx + 2, by + 2 + swing, 2, 2);
          ctx.fillRect(bx + 6, by + 4 - swing, 2, 2);
          ctx.fillRect(bx + 3, by + 6, 4, 2);
        } else {
          // hammer, tapping away
          ctx.fillRect(bx + 2, by + 2 + swing, 5, 2);
          ctx.fillRect(bx + 4, by + 4 + swing, 2, 4 - swing);
        }
        // progress toward the next fixed bar / sealed breach / dead flame
        const p = U.clamp(c._taskP || 0, 0, 1);
        ctx.fillStyle = COL.black;
        ctx.fillRect(bx - 1, by + 11, 11, 2);
        ctx.fillStyle = tcol;
        ctx.fillRect(bx - 1, by + 11, Math.max(1, Math.round(11 * p)), 2);
      }
      if (hostileHere) { ctx.strokeStyle = COL.red; ctx.strokeRect(sp.x - 0.5, sp.y - 0.5, 13, 15); }
    }
    // GUN DECK: each weapon lives in its own gunport in the weapons room,
    // recoils when it fires, and throws a muzzle flash out of the port.
    ship.weapons.forEach((w, i) => {
      const wd = DATA.WEAPONS[w.key];
      const m = this.mountPos(ship, Math.min(i, 3));
      const mz = this.muzzleWorld(ship, Math.min(i, 3), w, wd); // emitter point for flash/smoke
      const rec = w._recoil > 0 ? Math.round(Math.min(0.2, w._recoil) * 15) : 0;
      // deck-gun carriage: a timber base so the gun sits ON the ship, not in the sky
      ctx.fillStyle = '#241a10';
      ctx.fillRect(m.x - 2, m.y + 7, 26, 3);
      ctx.fillStyle = '#3a2a18';
      ctx.fillRect(m.x, m.y + 9, 22, 2);
      const wa = SPR.weaponArt(w.key);
      const fname = 'wpn_' + wd.family + '_' + wd.tint.replace('#', '');
      const dx = isP ? m.x - rec : m.x + rec;
      // selecting a weapon slot highlights ITS deck gun - you can see what you aim
      if (isP && this.selWeapon === i) {
        ctx.strokeStyle = COL.gold;
        ctx.strokeRect(dx - 3.5, m.y - 8.5, 31, 22);
      }
      if (wa) {
        if (isP) ctx.drawImage(wa, dx, m.y - 5, 24, 12);
        else {
          this.mirrored(ctx, dx + 24, m.y - 5, () => ctx.drawImage(wa, 0, 0, 24, 12));
        }
      } else if (!SPR.drawFrame(ctx, fname, dx, m.y - 1, !isP)) {
        const spr2 = SPR.weaponSprite(wd.family, wd.tint);
        if (isP) ctx.drawImage(spr2, dx, m.y - 1);
        else {
          this.mirrored(ctx, dx + 24, m.y - 1, () => ctx.drawImage(spr2, 0, 0));
        }
      }
      // muzzle flash: gold blast for iron, spell-tinted burst for magic
      if (w._recoil > 0.12) {
        const fx = mz.x, fy = mz.y - 1; // at the gun's emitter
        const fcol = wd.family === 'cannon' ? COL.gold : wd.tint;
        ctx.fillStyle = fcol;
        ctx.fillRect(fx - 1, fy + 1, 4, 4);
        ctx.fillStyle = COL.white;
        ctx.fillRect(fx, fy + 2, 2, 2);
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = fcol;
        ctx.fillRect(fx + (isP ? 3 : -3), fy, 2, 6);
        ctx.fillRect(fx + (isP ? 5 : -5), fy + 2, 2, 3);
        ctx.globalAlpha = 1;
      } else if (w._recoil > 0 && wd.family === 'cannon') {
        // lingering powder smoke drifting from the muzzle
        const fx = mz.x + (isP ? 1 : -1), fy = mz.y - 1;
        const ph = 0.12 - w._recoil;
        ctx.globalAlpha = Math.max(0, 0.4 - ph * 2);
        ctx.fillStyle = '#9aa0ae';
        ctx.fillRect(fx + (isP ? ph * 30 : -ph * 30), fy - ph * 24, 3, 3);
        ctx.fillRect(fx + (isP ? ph * 18 : -ph * 18), fy + 2 - ph * 30, 2, 2);
        ctx.globalAlpha = 1;
      }
      if (!isP && w.on && this.chargeFrac(w, wd) >= 0.8 && Math.floor(this.time * 5) % 2) {
        ctx.fillStyle = this.weaponReady(w, wd) ? COL.red : COL.gold;
        ctx.fillRect(m.x + (isP ? 17 : -4), m.y, 3, 3);
      }
    });
    ctx.globalAlpha = 1;
    // wards: one big FTL-style magic bubble - filled, rim-lit, runes drifting on it.
    // brightness and rim thickness grow with layer count; flashes when recently hit.
    if (ship.wards.layers > 0) {
      const wcx = sx + ship.rw / 2, wcy = sy + ship.rh / 2 - 8;
      const wrx = ship.rw / 2 + 24, wry = ship.rh + 40;
      const L = ship.wards.layers;
      const hitT = ship._wardFlash > 0 ? ship._wardFlash : 0;
      // translucent dome fill
      ctx.fillStyle = 'rgba(78,160,220,' + (0.10 + L * 0.035 + hitT * 0.4) + ')';
      ctx.beginPath(); ctx.ellipse(wcx, wcy, wrx, wry, 0, 0, Math.PI * 2); ctx.fill();
      // bright rim (thicker with more layers)
      ctx.lineWidth = 1 + L;
      ctx.strokeStyle = 'rgba(140,220,240,' + (0.5 + hitT) + ')';
      ctx.beginPath(); ctx.ellipse(wcx, wcy, wrx, wry, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1;
      // inner sheen arc
      ctx.strokeStyle = 'rgba(220,245,255,0.35)';
      ctx.beginPath(); ctx.ellipse(wcx, wcy, wrx - 4, wry - 4, 0, -2.2, -0.9); ctx.stroke();
      // drifting ward runes on the bubble surface
      ctx.fillStyle = 'rgba(190,240,250,' + (0.5 + hitT * 0.5) + ')';
      for (let i = 0; i < 2 + L * 2; i++) {
        const a = this.time * 0.5 + i * (Math.PI * 2 / (2 + L * 2));
        const rx2 = wcx + Math.cos(a) * (wrx - 2), ry2 = wcy + Math.sin(a) * (wry - 2);
        ctx.fillRect(Math.round(rx2) - 1, Math.round(ry2) - 2, 2, 4);
        ctx.fillRect(Math.round(rx2) - 2, Math.round(ry2) - 1, 4, 2);
      }
    }
    // the bubble dies loudly: an expanding, fading, broken rim
    if (ship._wardBreak > 0 && ship.wards.layers === 0) {
      const wcx = sx + ship.rw / 2, wcy = sy + ship.rh / 2 - 8;
      const f = 1 - ship._wardBreak / 0.8;
      ctx.globalAlpha = Math.max(0, 0.75 - f * 0.75);
      ctx.strokeStyle = 'rgba(140,220,240,1)';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.ellipse(wcx, wcy, (ship.rw / 2 + 24) * (1 + f * 0.3), (ship.rh + 40) * (1 + f * 0.3), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 1;
      ctx.globalAlpha = 1;
    }
    if (sinkF > 0) {
      ctx.restore();
      // the sea swallows her: rising foreground water over the hull
      const top = SEA_Y + 2;
      ctx.fillStyle = 'rgba(24,52,96,0.9)';
      ctx.fillRect(sx - 24, top, ship.rw + 48, 130);
      ctx.fillStyle = 'rgba(190,225,240,0.7)';
      for (let fx3 = -24; fx3 < ship.rw + 24; fx3 += 7) {
        ctx.fillRect(sx + fx3, top + Math.round(Math.sin(fx3 * 0.3 + this.time * 6) * 1.5), 5, 2);
      }
    }
    // FOG VEIL: a drifting bank of conjured fog swallows the WHOLE ship (not just a dimmed interior).
    // Layered soft pale blobs build up into a cloud; fades out over the veil's final second.
    if (ship.veilT > 0) {
      const amt = Math.min(1, ship.veilT);
      // a churning bank of fog RINGS the hull — the interior stays clear so crew/fires/systems read.
      const cx = sx + ship.rw / 2, cy = sy + ship.rh / 2 - 4;
      const rx = ship.rw / 2 + 30, ry = ship.rh / 2 + 32; // ring sits just outside the hull
      ctx.save(); ctx.fillStyle = '#d6dee4';
      const N = 30;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 + this.time * 0.25;             // slow swirl around the ship
        const wob = 1 + Math.sin(this.time * 0.9 + i * 1.3) * 0.16;     // radial wobble (churn)
        const px = cx + Math.cos(a) * rx * wob, py = cy + Math.sin(a) * ry * wob;
        const rad = 15 + (Math.sin(i * 2.3) * 0.5 + 0.5) * 14;
        ctx.globalAlpha = amt * (0.13 + 0.10 * (Math.sin(this.time * 0.7 + i) * 0.5 + 0.5));
        ctx.beginPath(); ctx.arc(px, py, rad, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.restore();
    }
    // escape charge
    if (ship.fleeing && ship.escape > 0) {
      const ex2 = sx, ey2 = sy - 64;
      ctx.fillStyle = COL.black; ctx.fillRect(ex2, ey2, 50, 5);
      ctx.fillStyle = COL.gold; ctx.fillRect(ex2 + 1, ey2 + 1, Math.round(48 * ship.escape), 3);
      TYPE.draw(ctx, 'FLEEING', ex2, ey2 - 9, 10, COL.gold, { display: true, shadow: COL.black });
    }
  }

  // ---------- FTL-style targeting visualization ----------
  // every gun shows its plan: numbered tinted reticles pinned on rooms, beam
  // sweep lines, scatter rings, bomb runes, torpedo wakes, and a ward badge
  // whenever the shot would be eaten by the bubble. No cryptic aiming.
  renderTargeting(ctx) {
    if (this.state !== 'fight') return;
    // --- pinned plans: one numbered reticle per aimed weapon ---
    this.p.weapons.forEach((w, i) => {
      if (w.target < 0) return;
      const wd = DATA.WEAPONS[w.key];
      const shipT = wd.selfCast ? this.p : this.e;
      const r = shipT.rooms[w.target];
      if (!r) return;
      const tint = wd.tint || COL.gold;
      // beam: draw the stored FIXED-LENGTH aim line (anchor + angle) it will rake when it fires
      if (wd.type === 'beam' && w.beamAim) {
        const aim = w.beamAim, len = this.beamLen(wd);
        const a = this.localToScreen(this.e, aim.x, aim.y);
        const e2 = this.localToScreen(this.e, aim.x + Math.cos(aim.angle) * len, aim.y + Math.sin(aim.angle) * len);
        ctx.strokeStyle = tint; ctx.globalAlpha = 0.5; ctx.setLineDash([3, 3]); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(e2.x, e2.y); ctx.stroke();
        ctx.setLineDash([]); ctx.lineWidth = 1; ctx.globalAlpha = 1;
        return; // the line is the reticle; skip the room-corner brackets
      }
      const rr = this.roomRect(shipT, r);
      // corner brackets in the weapon's tint
      ctx.strokeStyle = tint;
      ctx.lineWidth = 1;
      const cx0 = rr.x + 1.5, cy0 = rr.y + 1.5, cx1 = rr.x + rr.w - 1.5, cy1 = rr.y + rr.h - 1.5;
      for (const [px, py, dx, dy] of [[cx0, cy0, 1, 1], [cx1, cy0, -1, 1], [cx0, cy1, 1, -1], [cx1, cy1, -1, -1]]) {
        ctx.beginPath();
        ctx.moveTo(px + dx * 4, py); ctx.lineTo(px, py); ctx.lineTo(px, py + dy * 4);
        ctx.stroke();
      }
      // numbered chip (slot 1-4)
      ctx.fillStyle = 'rgba(10,9,20,0.85)';
      ctx.fillRect(rr.x + rr.w - 9, rr.y - 4, 9, 9);
      ctx.strokeStyle = tint;
      ctx.strokeRect(rr.x + rr.w - 8.5, rr.y - 3.5, 8, 8);
      TYPE.drawCentered(ctx, (i + 1) + '', rr.x + rr.w - 4.5, rr.y - 3, 9, tint);
      // bomb rune stamp: conjured ordnance marks its room
      if (wd.type === 'bomb' && wd.family === 'bomb') {
        ctx.strokeStyle = tint;
        ctx.globalAlpha = 0.35 + 0.1 * Math.sin(this.time * 3);
        ctx.beginPath(); ctx.arc(rr.x + rr.w / 2, rr.y + rr.h / 2, 7, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // ward badge: this shot will be EATEN by the bubble - told up front
      const bypass = wd.type === 'missile' || wd.type === 'bomb' || wd.type === 'beam';
      if (!wd.selfCast && !bypass && shipT.wards.layers > (wd.pierce || 0)) {
        ctx.strokeStyle = COL.cyan;
        ctx.beginPath(); ctx.arc(rr.x + 4, rr.y - 0.5, 3, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = COL.cyan;
        ctx.fillRect(rr.x + 3, rr.y - 1, 2, 1);
      }
    });
    // --- live aiming: selected weapon previews under the cursor ---
    if (this.selWeapon < 0) return;
    const w = this.p.weapons[this.selWeapon];
    const wd = DATA.WEAPONS[w.key];
    const tint = wd.tint || COL.gold;
    const am = this._aimMouse || Game.mouse; const mx = am.x, my = am.y; // HD renders into the scene offscreen -> use scene-logical mouse
    const shipT = wd.selfCast ? this.p : this.e;
    // own rooms glow as valid targets for self-cast bombs
    if (wd.selfCast) {
      ctx.strokeStyle = COL.green;
      ctx.globalAlpha = 0.4 + 0.2 * Math.sin(this.time * 4);
      for (const r of this.p.rooms) {
        const rr = this.roomRect(this.p, r);
        ctx.strokeRect(rr.x + 1.5, rr.y + 1.5, rr.w - 3, rr.h - 3);
      }
      ctx.globalAlpha = 1;
    }
    const hr = this.roomAt(shipT, mx, my);
    if (hr !== null) {
      const rr = this.roomRect(shipT, shipT.rooms[hr]);
      ctx.fillStyle = tint;
      ctx.globalAlpha = 0.18;
      ctx.fillRect(rr.x, rr.y, rr.w, rr.h);
      ctx.globalAlpha = 1;
      // scatter ring: langrage shows where the spread can spill
      if (wd.scatter) {
        ctx.strokeStyle = tint;
        ctx.setLineDash([2, 3]);
        ctx.beginPath(); ctx.arc(rr.x + rr.w / 2, rr.y + rr.h / 2, Math.max(rr.w, rr.h) * 0.9, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
      // torpedoes preview their swim along the waterline
      if (wd.type === 'missile') {
        ctx.strokeStyle = tint;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(this.pX() + this.p.rw, SEA_Y - 4);
        ctx.lineTo(rr.x + rr.w / 2, SEA_Y - 4);
        ctx.lineTo(rr.x + rr.w / 2, rr.y + rr.h / 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    // crosshair cursor in the family tint
    ctx.strokeStyle = tint;
    ctx.beginPath(); ctx.arc(mx, my, 5, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = tint;
    ctx.fillRect(mx - 7, my - 0.5, 4, 1); ctx.fillRect(mx + 3, my - 0.5, 4, 1);
    ctx.fillRect(mx - 0.5, my - 7, 1, 4); ctx.fillRect(mx - 0.5, my + 3, 1, 4);
    // beam aiming preview: a FIXED-LENGTH line pivots from the planted anchor to the cursor,
    // lighting up every room the sweep would rake (FTL click->rotate->click)
    const anchor = Game.screen === CombatScreen ? CombatScreen._beamAnchor : null;
    if (anchor && wd.type === 'beam') {
      const a = this.screenToLocal(this.e, anchor.x, anchor.y), cur = this.screenToLocal(this.e, mx, my);
      const angle = Math.atan2(cur.y - a.y, cur.x - a.x), len = this.beamLen(wd);
      const e2 = this.localToScreen(this.e, a.x + Math.cos(angle) * len, a.y + Math.sin(angle) * len);
      for (const r of this.e.beamPath(a.x, a.y, angle, len).rooms) {
        const rb = this.roomRect(this.e, r);
        ctx.fillStyle = tint; ctx.globalAlpha = 0.25; ctx.fillRect(rb.x, rb.y, rb.w, rb.h); ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = tint; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(anchor.x, anchor.y); ctx.lineTo(e2.x, e2.y); ctx.stroke(); ctx.lineWidth = 1;
    }
  }

  renderProjectiles(ctx) {
    for (const pr of this.projectiles) {
      if (pr.delay > 0) continue;
      const wd = DATA.WEAPONS[pr.wkey];
      const t = pr.t;
      let x = U.lerp(pr.fromX, pr.toX, t);
      let y = U.lerp(pr.fromY, pr.toY, t) - Math.sin(t * Math.PI) * pr.arc;
      // EM Rail Gun: a hypervelocity slug — a bright bolt that STREAKS along the path
      // (leading nose + tapering EM tail), crackling arcs, muzzle charge + impact flash.
      if (pr.wkey === 'depleteduranium') {
        const dx = pr.toX - pr.fromX, dy = pr.toY - pr.fromY, len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = dy / len, nx = -uy, ny = ux; // unit + perpendicular
        const lead = Math.min(1, t * 1.3);            // slug nose (reaches the target a hair early)
        const tail = Math.max(0, t * 1.3 - 0.55);     // streak tail trails the nose
        const lx = U.lerp(pr.fromX, pr.toX, lead), ly = U.lerp(pr.fromY, pr.toY, lead);
        const tlx = U.lerp(pr.fromX, pr.toX, tail), tly = U.lerp(pr.fromY, pr.toY, tail);
        ctx.save(); ctx.lineCap = 'round';
        // 3-layer bolt: outer lime glow / mid lime / white-hot core
        ctx.globalAlpha = 0.45; ctx.strokeStyle = COL.lime; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(tlx, tly); ctx.lineTo(lx, ly); ctx.stroke();
        ctx.globalAlpha = 0.9; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(tlx, tly); ctx.lineTo(lx, ly); ctx.stroke();
        ctx.globalAlpha = 1; ctx.strokeStyle = '#f4fff0'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(tlx, tly); ctx.lineTo(lx, ly); ctx.stroke();
        // EM arcs: little jagged zig-zags crackling along the live streak
        ctx.strokeStyle = '#cfffe0'; ctx.lineWidth = 1; ctx.globalAlpha = 0.85;
        for (let k = 0; k < 5; k++) {
          const fr = tail + (lead - tail) * ((k + 0.5) / 5);
          const bx = U.lerp(pr.fromX, pr.toX, fr), by = U.lerp(pr.fromY, pr.toY, fr);
          const amp = U.rf(2, 5) * (U.chance(0.5) ? 1 : -1);
          ctx.beginPath();
          ctx.moveTo(bx - ux * 3, by - uy * 3);
          ctx.lineTo(bx + nx * amp, by + ny * amp);
          ctx.lineTo(bx + ux * 3, by + uy * 3);
          ctx.stroke();
        }
        // bright nose
        ctx.globalAlpha = 0.5; ctx.fillStyle = COL.lime;
        ctx.beginPath(); ctx.arc(lx, ly, 5, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1; ctx.fillStyle = '#f4fff0';
        ctx.beginPath(); ctx.arc(lx, ly, 2.2, 0, Math.PI * 2); ctx.fill();
        // muzzle charge flash (start) and impact flash (end)
        if (t < 0.3) {
          const f = (0.3 - t) / 0.3;
          ctx.globalAlpha = f * 0.6; ctx.fillStyle = COL.lime;
          ctx.beginPath(); ctx.arc(pr.fromX, pr.fromY, 7 + f * 9, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = f; ctx.fillStyle = '#f4fff0';
          ctx.beginPath(); ctx.arc(pr.fromX, pr.fromY, 3 + f * 4, 0, Math.PI * 2); ctx.fill();
        }
        if (t > 0.72) {
          const f = (t - 0.72) / 0.28;
          ctx.globalAlpha = (1 - f) * 0.6; ctx.fillStyle = COL.lime;
          ctx.beginPath(); ctx.arc(pr.toX, pr.toY, 5 + f * 16, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1 - f; ctx.fillStyle = '#f4fff0';
          ctx.beginPath(); ctx.arc(pr.toX, pr.toY, 3 + f * 7, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1; ctx.restore(); continue;
      }
      // CONJURED charges (djinn pots, maelstrom): nothing flies - a rune circle
      // spins down inside the target room and the charge materializes in it
      if (wd.type === 'bomb' && wd.family === 'bomb') {
        const f = Math.min(1, t * 1.15);
        ctx.strokeStyle = wd.tint;
        ctx.globalAlpha = 0.35 + f * 0.5;
        ctx.beginPath(); ctx.arc(pr.toX, pr.toY, 11 - f * 5, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(pr.toX, pr.toY, 5 - f * 2, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = wd.tint;
        for (let g = 0; g < 4; g++) {
          const a = this.time * 3 + g * Math.PI / 2;
          ctx.fillRect(pr.toX + Math.cos(a) * (9 - f * 3) - 1, pr.toY + Math.sin(a) * (9 - f * 3) - 1, 2, 2);
        }
        if (f > 0.6) {
          ctx.globalAlpha = (f - 0.6) / 0.4;
          const spr0 = SPR.proj('bombproj');
          ctx.drawImage(spr0, Math.round(pr.toX - spr0.width / 2), Math.round(pr.toY - spr0.height / 2));
        }
        ctx.globalAlpha = 1;
        continue;
      }
      // torpedoes dive and skim the waterline, leaving a wake
      if (wd.type === 'missile') {
        const skimY = SEA_Y - 4;
        y = t < 0.2 ? U.lerp(pr.fromY, skimY, t / 0.2) : t > 0.8 ? U.lerp(skimY, pr.toY, (t - 0.8) / 0.2) : skimY;
        // seeker torpedo "hears your keel": it weaves as it hunts
        if (pr.wkey === 'seekertorpedo' && t > 0.2 && t < 0.8) y += Math.sin(t * Math.PI * 5) * 3;
        ctx.fillStyle = 'rgba(244,250,252,0.7)';
        const dir = pr.toX > pr.fromX ? 1 : -1;
        for (let k = 1; k <= 4; k++) ctx.fillRect(Math.round(x - k * 5 * dir), Math.round(y) + 3, 3, 1);
      }
      // motion trail (smoke-grey for iron, spell-tinted for everything else)
      const trailN = wd.family === 'cannon' ? 2 : 4;
      for (let k = trailN; k >= 1; k--) {
        const tt = Math.max(0, t - k * 0.05);
        const tx2 = U.lerp(pr.fromX, pr.toX, tt);
        const ty2 = wd.type === 'missile' ? y : U.lerp(pr.fromY, pr.toY, tt) - Math.sin(tt * Math.PI) * pr.arc;
        ctx.globalAlpha = Math.max(0.05, 0.3 - k * 0.06);
        ctx.fillStyle = wd.family === 'cannon' ? '#9aa0ae' : wd.tint;
        const s3 = Math.max(1, 3 - k);
        ctx.fillRect(Math.round(tx2 - s3 / 2), Math.round(ty2 - s3 / 2), s3, s3);
      }
      ctx.globalAlpha = 1;
      // siren song: expanding crescents, no dot
      if (wd.family === 'horn') {
        ctx.strokeStyle = wd.tint;
        const dir2 = pr.toX > pr.fromX ? 0 : Math.PI;
        for (let k = 0; k < 3; k++) {
          const rr2 = 3 + ((this.time * 26 + k * 7) % 18);
          ctx.globalAlpha = Math.max(0.05, 0.55 - rr2 * 0.025);
          ctx.beginPath(); ctx.arc(x, y, rr2, dir2 - 0.9, dir2 + 0.9); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        continue;
      }
      // glow halo for enchanted munitions
      if (wd.family !== 'cannon') {
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = wd.tint;
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      // per-key projectile sprite — each element looks like itself (no generic 'fire' catch-all)
      const PSPR = { tidelance: 'bubble', venomdart: 'venom', augershot: 'drill', quillstorm: 'quill', brinevolley: 'wave', galeshear: 'gust', inkjet: 'ink' };
      let type = 'ball';
      if (wd.family === 'cannon') type = Math.floor(this.time * 10) % 2 ? 'ball' : 'ball2';
      else if (wd.type === 'missile') type = 'torpedo';
      else if (wd.ion) type = 'ion';
      else type = PSPR[pr.wkey] || 'fire'; // NOTE: DATA.WEAPONS has no .key field — branch on pr.wkey
      if (pr.wkey === 'flamelance') type = Math.floor(this.time * 8) % 2 ? 'fire' : 'fire2';
      // chainshot: two linked balls (a spinning bola), not a single shot
      if (pr.wkey === 'chainshot') {
        const a = this.time * 16, dx = Math.cos(a) * 4, dy = Math.sin(a) * 4;
        ctx.strokeStyle = '#6a6f7a'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); ctx.stroke();
        const bsp = SPR.proj('ball');
        ctx.drawImage(bsp, Math.round(x - dx - bsp.width / 2), Math.round(y - dy - bsp.height / 2));
        ctx.drawImage(bsp, Math.round(x + dx - bsp.width / 2), Math.round(y + dy - bsp.height / 2));
        continue;
      }
      const spr = SPR.proj(type);
      const ms = wd.munScale || 1; // bigger guns throw bigger shot (Heavy Cannon = 2x Light Cannon)
      ctx.drawImage(spr, Math.round(x - spr.width * ms / 2), Math.round(y - spr.height * ms / 2), spr.width * ms, spr.height * ms);
    }
    // familiars: bound spirits with per-type animated sprites (deploy / idle / act states)
    for (const k of this.activeFamiliars()) {
      const fp = this.familiarPos(k);
      const dep = (this._famDeploy && this._famDeploy[k] != null) ? U.clamp((this.time - this._famDeploy[k]) / 0.5, 0, 1) : 1;
      const raw = (this._famAct && this._famAct[k] != null) ? this.time - this._famAct[k] : 9;
      const actPhase = Math.max(0, 1 - raw / 0.45);
      SPR.drawFamiliar(ctx, k, fp.x, fp.y, 1.3, this.time, actPhase, dep);
    }
    // ward-impact shockwaves: concentric rings spreading from the strike point
    if (this.ripples) for (const rp of this.ripples) {
      const f = 1 - rp.t / rp.max;
      ctx.strokeStyle = 'rgba(140,220,240,' + Math.max(0, 0.9 - f * 0.9).toFixed(2) + ')';
      ctx.lineWidth = f < 0.5 ? 2 : 1;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, 2 + f * 13 + k * 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.lineWidth = 1;
    }
    for (const b of this.beams) {
      ctx.globalAlpha = Math.min(1, b.t * 3);
      if (b.bolt) {
        // Storm Conduit: a jagged lightning bolt (re-randomised each frame -> it flickers)
        const dx = b.x2 - b.x1, dy = b.y2 - b.y1, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, segs = 8, pts = [];
        for (let i = 0; i <= segs; i++) { const f = i / segs, j = (i > 0 && i < segs) ? U.rf(-7, 7) : 0; pts.push([U.lerp(b.x1, b.x2, f) + nx * j, U.lerp(b.y1, b.y2, f) + ny * j]); }
        const stroke = (col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); };
        stroke(b.col, 3); stroke('#eaffff', 1.2);
      } else {
        ctx.strokeStyle = b.col; ctx.lineWidth = b.song ? 3 : 2;
        ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2);
        if (b.x3 !== undefined) ctx.lineTo(b.x3, b.y3);
        ctx.stroke();
      }
      ctx.lineWidth = 1;
      ctx.globalAlpha = 1;
    }
  }

  // mana + system power panel - shared by the battle HUD and the DECKS screen
  enemyInteriorHidden() {
    return this.p.sysLv.lookout === 0 || (this.hazard === 'fog' && this.p.sysLv.lookout < 2) || this.e.veilT > 0;
  }
  // hovered sailor wins, else the first selected one (enemy crew need a clear deck)
  hoverCrew() {
    // hover-only: the card appears ONLY for the crew under the cursor. It must NOT
    // linger just because a crew is selected (Greg review #6) — no selection fallback.
    const mx = Game.mouse.x, my = Game.mouse.y;
    let crew = my < HUD_Y ? this.crewAt(mx, my) : null;
    if (crew && crew.owner === 'enemy' && this.enemyInteriorHidden()) crew = null;
    return crew && !crew.dead ? crew : null;
  }
  // DeckScreen entry point (crew card only - no enemy to inspect there)
  drawSelectedCrewCard(ctx) { const c = this.hoverCrew(); if (c) this.drawCrewCard(ctx, c); }
  // Combat entry point: a sailor's card, or a room/door tooltip under the cursor.
  roomTip(ship, rid) {
    const r = ship.rooms[rid], isE = ship === this.e, lines = [];
    if (r.key && DATA.SYSTEMS[r.key]) {
      const dmg = r.dmg > 0, ion = r.ion > 0, pow = ship.powered(r.key);
      const tag = dmg ? ' (DAMAGED)' : ion ? ' (JAMMED)' : (!DATA.SYS_SUB.includes(r.key) && pow === 0 ? ' (NO POWER)' : '');
      lines.push({ t: (isE ? 'ENEMY ' : '') + DATA.SYSTEMS[r.key].name.toUpperCase() + tag, c: (dmg || ion) ? TIP.danger : TIP.ink });
    } else lines.push({ t: isE ? 'ENEMY HOLD' : 'HOLD (NO SYSTEM)', c: TIP.ink });
    const haz = [];
    if (r.fire > 0) haz.push('FIRE'); if (r.leak) haz.push('BREACH'); if (r.water > 0.5) haz.push('FLOODED');
    if (haz.length) lines.push({ t: haz.join('  '), c: TIP.danger });
    if (isE && this.selWeapon >= 0) lines.push({ t: 'CLICK TO TARGET', c: TIP.action });
    return lines;
  }
  doorTip(ship, di) {
    const lines = [{ t: 'DOOR - ' + (ship.doorOpen[di] ? 'OPEN' : 'SHUT'), c: TIP.ink }];
    if (ship === this.p) lines.push({ t: 'RIGHT-CLICK A HULL ROOM FOR ITS SEA DOOR', c: TIP.faint });
    return lines;
  }
  drawTip(ctx, mx, my, lines) {
    if (!lines || !lines.length || !Game.tipReady()) return;
    const SZ = 10, lh = 13;
    let maxw = 0; for (const l of lines) maxw = Math.max(maxw, TYPE.width(ctx, l.t, SZ));
    const W = Math.min(300, Math.round(maxw) + 26);
    const H = 12 + lines.length * lh + 6; // +6 bottom pad clears the dog-ear
    const x = U.clamp(mx + 12, 4, 508 - W), y = U.clamp(my - 6, 4, HUD_Y - H - 2);
    const r = UI.drawScrap(ctx, x, y, W, H);
    let ty = r.iy + 2;
    for (const l of lines) { TYPE.draw(ctx, l.t, r.ix, ty, SZ, l.c); ty += lh; }
  }
  drawCrewCard(ctx, c) {
    const ranked = ['weapons', 'helm', 'sails', 'wards', 'repair', 'combat']
      .map(k => ({ k, r: DATA.crewRank(c, k) })).filter(o => o.r > 0);
    const body = ranked.length
      ? ranked.map(o => ({ pips: o.r, t: o.k.toUpperCase() + ': ' + DATA.SKILL_EFFECT[o.k], col: o.r === 2 ? TIP.stat : TIP.action }))
      : [{ pips: 0, t: 'STILL GREEN - NO MASTERY YET', col: TIP.faint }];
    const W = 176, H = 14 + (2 + body.length) * 12 + 6;
    const sp = this.crewScreenPos(c);
    let x = U.clamp(Math.round(sp.x) - W / 2 + 6, 4, 508 - W);
    let y = Math.round(sp.y) - H - 6;
    if (y < 4) y = U.clamp(Math.round(sp.y) + 18, 4, HUD_Y - H - 2);
    const r = UI.drawScrap(ctx, x, y, W, H), ix = r.ix;
    TYPE.draw(ctx, c.name + ' — ' + DATA.RACES[c.race].name, ix, r.iy, 11, TIP.ink, { display: true });
    const hy = r.iy + 15;
    TYPE.draw(ctx, 'HP', ix, hy - 2, 10, TIP.faint);
    ctx.fillStyle = '#2a1d10'; ctx.fillRect(ix + 20, hy - 1, 80, 6);
    const f = Math.max(0, c.hp) / c.maxhp;
    ctx.fillStyle = f > 0.5 ? COL.green : f > 0.25 ? COL.orange : COL.red;
    ctx.fillRect(ix + 21, hy, Math.round(78 * f), 4);
    TYPE.draw(ctx, Math.ceil(Math.max(0, c.hp)) + '/' + c.maxhp, ix + 104, hy - 2, 10, TIP.ink);
    const diamond = (dx, dy, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(dx, dy - 2.4); ctx.lineTo(dx + 2.4, dy); ctx.lineTo(dx, dy + 2.4); ctx.lineTo(dx - 2.4, dy); ctx.closePath(); ctx.fill(); };
    let by = r.iy + 27;
    for (const b of body) {
      let tx = ix;
      for (let i = 0; i < (b.pips || 0); i++) { diamond(tx + 2.4, by + 4.5, b.col); tx += 7; }
      TYPE.draw(ctx, b.t, tx, by, 10, b.col); by += 12;
    }
  }

  // remember where each sailor stands now, so RETURN can snap them back later
  setStations() { let any = false; for (const c of this.p.aliveCrew()) if (c.aboard === 'home') { c.station = c.roomId; any = true; } return any; }
  returnStations() { let any = false; for (const c of this.p.aliveCrew()) if (c.aboard === 'home' && c.station >= 0 && c.roomId !== c.station) { this.p.orderCrew(c, c.station); any = true; } return any; }

  // one source of truth for a system column's hit/draw box (shared by draw + click)
  sysIconRect(ox, i) { return { x: ox + 34 + i * 19, y: 252, w: 17, h: 34 }; }

  drawPowerPanel(ctx, ox) {
    const p = this.p;
    const mm = p.effMana(), used = p.totalAlloc();
    TYPE.draw(ctx, 'MANA', ox, 251, 10, COL.ltgrey);
    for (let i = 0; i < mm; i++) {
      ctx.fillStyle = i < used ? COL.ltblue : COL.dkgrey; // mana = blue (ltblue), not bright digital cyan
      ctx.fillRect(ox + (i % 10) * 3, 262 + Math.floor(i / 10) * 5, 2, 4);
    }
    const sysList = this.sysIconList();
    let tip = null;
    sysList.forEach((k, i) => {
      const rect = this.sysIconRect(ox, i);
      const ix = rect.x;
      const sub = DATA.SYS_SUB.includes(k);
      const eff = p.sysEff(k);
      const pow = p.powered(k);
      const r = p.roomByKey(k);
      const damaged = !!(r && r.dmg > 0);
      const ion = !!(r && r.ion > 0);
      const disabled = damaged || ion; // knocked out: shown RED (matches the red bars)
      const live = pow > 0; // mana/effect actually flowing right now
      // bars: CYAN/GREEN powered, GREY available-but-depowered, RED damaged/knocked-out
      for (let b = 0; b < p.sysLv[k]; b++) {
        const by = 282 - b * 3;
        if (b < pow) ctx.fillStyle = sub ? COL.green : COL.ltblue;
        else if (b < eff) ctx.fillStyle = COL.dkgrey;
        else ctx.fillStyle = COL.red;
        ctx.fillRect(ix + 6, by, 6, 2);
      }
      if (r && r.ion > 0) { ctx.fillStyle = COL.ltblue; ctx.fillRect(ix + 14, 276, 4, 4); }
      // flat-vector system silhouette (matches HD panel + reactor; replaces the busy bitmap icons)
      drawSysSym(ctx, k, ix + 4, 252, 10, disabled ? COL.red : live ? COL.brasshi : COL.grey);
      // status frame around the 10x10 icon: RED = damaged/jammed, GREY = idle/depowered
      const frame = disabled ? COL.red : (!live ? COL.grey : null);
      if (frame) { ctx.strokeStyle = frame; ctx.strokeRect(ix + 3.5, 251.5, 11, 11); }
      if (this.inRect(Game.mouse.x, Game.mouse.y, rect.x, rect.y, rect.w, rect.h)) {
        tip = { k, cx: ix + 9, damaged, ion, live, sub };
      }
    });
    if (tip) this.drawSysTip(ctx, tip);
  }
  // hover card: name (+ status) / what it does / how to power it
  drawSysTip(ctx, tip) {
    if (!Game.tipReady()) return;
    const s = DATA.SYSTEMS[tip.k];
    const tag = tip.damaged ? '  (DAMAGED)' : tip.ion ? '  (JAMMED)' : (!tip.live && !tip.sub ? '  (NO POWER)' : '');
    const name = s.name + tag;
    const hint = tip.sub ? 'Always on — no mana needed' : 'Left-click +mana   ·   right-click −mana';
    // wrap the description so a long blurb (e.g. Storm Conduit) can't run a single line off-screen
    const MAXW = 320, innerW = MAXW - 24;
    const descLines = TYPE.wrap(ctx, s.desc, innerW, 10);
    let widest = Math.max(TYPE.width(ctx, name, 11), TYPE.width(ctx, hint, 10));
    for (const dl of descLines) widest = Math.max(widest, TYPE.width(ctx, dl, 10));
    const tw = Math.min(MAXW, Math.round(widest) + 24);
    const lh = 12, H = 39 + descLines.length * lh;
    const BOT = 248, y = Math.max(4, BOT - H);          // sit just above the system-icon row
    const tx = U.clamp(tip.cx - tw / 2, 4, 508 - tw);   // tw <= MAXW, so this never runs off-screen
    const r = UI.drawScrap(ctx, tx, y, tw, H);
    let ty = r.iy + 1;
    TYPE.draw(ctx, name, r.ix, ty, 11, (tip.damaged || tip.ion) ? TIP.danger : TIP.ink, { display: true }); ty += 13;
    for (const dl of descLines) { TYPE.draw(ctx, dl, r.ix, ty, 10, TIP.body); ty += lh; }
    TYPE.draw(ctx, hint, r.ix, ty + 1, 10, TIP.action, { italic: true });
  }
  clickPowerPanel(x, y, btn, ox) {
    const sysList = this.sysIconList();
    for (let i = 0; i < sysList.length; i++) {
      const rect = this.sysIconRect(ox, i);
      if (this.inRect(x, y, rect.x, rect.y, rect.w, rect.h)) {
        const k = sysList[i];
        if (DATA.SYS_SUB.includes(k)) return true;
        if (btn === 2) this.p.setAlloc(k, (this.p.alloc[k] || 0) - 1);
        else if (this.p.totalAlloc() < this.p.effMana()) {
          this.p.setAlloc(k, (this.p.alloc[k] || 0) + 1);
        } else {
          this.log('THE HEARTHSTONE IS FULLY COMMITTED - RIGHT-CLICK A SYSTEM TO FREE A BAR.');
          AUDIO.sfx('back');
          return true;
        }
        AUDIO.sfx('click');
        return true;
      }
    }
    return false;
  }

  sysIconList() {
    const list = [];
    for (const k of DATA.SYS_POWERED) if (this.p.sysLv[k] > 0) list.push(k);
    for (const k of DATA.SYS_SUB) if (this.p.sysLv[k] > 0) list.push(k);
    return list;
  }
  // the enemy's systems, always shown (FTL target panel): icon dim=depowered,
  // red frame=damaged/jammed, cyan under-bar = powered fraction.
  enemySysList() {
    const e = this.e, list = [];
    for (const k of DATA.SYS_POWERED) if (e.sysLv[k] > 0) list.push(k);
    for (const k of DATA.SYS_SUB) if (e.sysLv[k] > 0) list.push(k);
    return list;
  }
}
