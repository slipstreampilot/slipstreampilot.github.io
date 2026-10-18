// Match orchestration: modes, the fixed-step simulation loop, hole-vs-hole eating, respawns,
// and the hand-off to HUD / FX / audio. Rendering runs every animation frame; simulation at 60 Hz.
(function () {
  const CFG = HC.CONFIG, U = HC.U;
  const G = { state: 'boot', mode: 'classic', holes: [], player: null, time: 0, acc: 0, events: [], paused: false };
  const STEP = 1 / 60;

  const MODES = {
    classic: { label: 'Classic', bots: CFG.match.bots, seconds: CFG.match.classicSeconds, respawn: true },
    solo: { label: 'Solo', bots: 0, seconds: CFG.match.soloSeconds, respawn: true },
    battle: { label: 'Battle', bots: CFG.match.battleBots, seconds: CFG.match.battleSeconds, respawn: false },
    attract: { label: 'Attract', bots: 7, seconds: 1e9, respawn: true },
  };
  G.MODES = MODES;

  G.setup = function (mode, opts = {}) {
    G.mode = mode; G.cfg = MODES[mode];
    G.seed = opts.seed ?? ((Math.random() * 1e9) | 0);
    const rng = U.rng(G.seed);
    G.level = HC.Levels.get(opts.level || G.levelId || (HC.Progress && HC.Progress.data.level));
    G.levelId = G.level.id;
    G.city = HC.Levels.build(G.level, G.seed);
    // Level twists: gravity (moon) and grip (ice).
    HC.Physics.setGravityScale(G.level.mods.gravity);
    G.grip = G.level.mods.grip;
    if (!G.headless) HC.Render.buildCity(G.city);
    HC.World.init(G.city);
    for (const o of HC.World.objects) if (!G.headless) HC.Render.setObject(o);
    if (!G.headless) HC.Coaster.buildVisual(HC.Render.cityGroup);
    HC.Physics.reset();
    if (!G.headless) HC.Render.clearHoles();
    G.holes = []; G.player = null; G.time = G.cfg.seconds; G.elapsed = 0; G.acc = 0; G.events = []; G.killFeed = [];
    const spawns = U.shuffle(G.city.spawnCandidates.slice(), rng);
    const pick = () => {
      for (let i = 0; i < spawns.length; i++) { const s = spawns[i]; if (G.holes.every((h) => Math.hypot(h.x - s.x, h.z - s.z) > 1100)) { spawns.splice(i, 1); return s; } }
      return spawns.pop() || { x: 2500, z: 2500 };
    };
    if (mode !== 'attract') {
      const prof = HC.Progress ? HC.Progress.data : { name: 'You', skin: 'classic' };
      const s = pick();
      G.player = new HC.Hole({ name: prof.name || 'You', isPlayer: true, skin: HC.Skins.get(prof.skin), x: s.x, z: s.z });
      // Easier difficulties start you a size up (and you never respawn smaller than that).
      G.playerMinXp = 0; for (let k = 1; k < (opts.playerStartLevel || 1); k++) G.playerMinXp += CFG.levelStep(k);
      if (G.playerMinXp) { G.player.setTotalXp(G.playerMinXp); G.player.rv = G.player.r; }
      G.holes.push(G.player);
    }
    const names = U.shuffle(CFG.bots.names.slice(), rng);
    const skins = U.shuffle(HC.Skins.botSkins.slice(), rng);
    for (let i = 0; i < G.cfg.bots; i++) {
      const s = pick();
      // Rivals top out a few sizes below you, so a great run always ends on top.
      const bonus = opts.botSkillBonus || 0, cap = bonus < -0.05 ? 16 : bonus > 0.05 ? 20 : 18;
      const h = new HC.Hole({ name: names[i], skin: skins[i % skins.length], x: s.x, z: s.z, maxLevel: mode === 'attract' ? 20 : cap });
      // Skill spread: one shark, a few solid players, a couple of snackers.
      const skill = i === 0 ? 0.84 : i < 3 ? 0.76 : 0.64;
      HC.Bots.init(h, rng, skill + (opts.botSkillBonus || 0) + G.level.mods.botSkill);
      if (opts.botSpeedMul) h.baseSpeed *= opts.botSpeedMul;
      G.holes.push(h);
    }
    if (!G.headless) for (const h of G.holes) HC.Render.addHole(h);
    G.focus = G.player || G.holes[0];
    if (!G.headless) { const f = G.focus; HC.Render.updateCamera(f.x, f.z, G.viewWidth(f), 0, [0, 0], true); }
    G.state = mode === 'attract' ? 'attract' : 'countdown';
    G.countdown = CFG.match.countdown + 0.6;
    G.stats = { startPoints: HC.World.totalPoints };
    HC.Input && HC.Input.reset();
  };

  G.viewWidth = function (h) {
    const C = CFG.camera, lv = (h.level - 1) / (CFG.hole.maxLevel - 1);
    const n = U.lerp(C.viewHoleDiameters, C.viewHoleDiametersMax, Math.pow(lv, 0.7));
    const raw = Math.max(C.minView, h.rv * 2 * n), k = C.viewKnee, span = C.viewMax - k;
    return raw <= k ? raw : k + span * (1 - Math.exp(-(raw - k) / span));
  };

  function emit(type, data) { G.events.push(Object.assign({ type }, data)); if (G.onEvent) G.onEvent(type, data); }

  HC.Physics.onConsume = function (o, h) {
    if (!h) return;
    const gained = h.alive ? h.addPoints(o.def.points) : (h.score += o.def.points, 0);
    h.eaten++;
    if (!h.biggest || o.def.points > h.biggest.def.points) h.biggest = o;
    h.combo = h.comboT > 0 ? h.combo + 1 : 1; h.comboT = CFG.scoring.comboWindow;
    emit('eat', { hole: h, obj: o, points: o.def.points, combo: h.combo });
    if (gained) emit('levelup', { hole: h, level: h.level });
  };

  function isVisible(h) {
    if (G.headless) return !G.nonePhysical && (G.allPhysical || h === G.focus);
    const c = HC.Render.cam, w = c.view;
    return Math.abs(h.x - c.x) < w * 0.9 + h.r && Math.abs(h.z - c.z) < w * 1.5 + h.r;
  }

  function safeSpot(r) {
    for (let tries = 0; tries < 40; tries++) {
      const s = G.city.spawnCandidates[Math.floor(Math.random() * G.city.spawnCandidates.length)];
      const x = s.x + U.lerp(-300, 300, Math.random()), z = s.z + U.lerp(-300, 300, Math.random());
      if (G.holes.every((o) => !o.alive || o.r < r * 1.1 || Math.hypot(o.x - x, o.z - z) > o.r * 3 + 500)) return { x, z };
    }
    return { x: 2500, z: 2500 };
  }

  function killHole(a, b) {
    // Bots get a smaller share from eating each other so one shark can't run away with the match.
    const pts = Math.max(CFG.hole.killPointsMin, Math.round(b.score * (a.isPlayer ? CFG.hole.killScoreShare : CFG.hole.killScoreShare * 0.5)));
    const gained = a.addPoints(pts); a.kills++;
    b.alive = false; b.dying = 0; b.deathTo = a; b.deaths++;
    const keep = b.totalXp() * CFG.hole.respawnKeepXp;
    b.vx = b.vz = 0;
    if (G.cfg.respawn) { b.respawnT = CFG.hole.respawnSeconds; b.keepXp = keep; if (b.isPlayer) b.ghost = { x: b.x, z: b.z }; }
    else { b.eliminated = true; b.placeAt = G.holes.filter((h) => !h.eliminated).length + 1; }
    HC.Physics.removeRim(b);
    emit('kill', { killer: a, victim: b, points: pts });
    if (gained) emit('levelup', { hole: a, level: a.level });
  }

  function respawn(h) {
    if (h.isPlayer) h.keepXp = Math.max(h.keepXp || 0, G.playerMinXp || 0);
    let s = h.isPlayer && h.ghost ? h.ghost : safeSpot(CFG.hole.startRadius);
    // Never respawn inside a bigger hole.
    if (G.holes.some((o) => o !== h && o.alive && Math.hypot(o.x - s.x, o.z - s.z) < o.r + 60)) s = safeSpot(CFG.hole.startRadius);
    h.x = s.x; h.z = s.z; h.setTotalXp(h.keepXp || 0); h.rv = h.r * 0.2; h.alive = true; h.protect = CFG.hole.spawnProtection; h.ghost = null; h.dying = null;
    if (!G.headless && !HC.Render.holesVis.has(h)) HC.Render.addHole(h);
    emit('respawn', { hole: h });
  }

  G.step = function (dt) {
    const playing = G.state === 'play' || G.state === 'attract';
    if (G.state === 'countdown') {
      const prev = Math.ceil(G.countdown - 0.6);
      G.countdown -= dt;
      const cur = Math.ceil(G.countdown - 0.6);
      if (cur !== prev && cur >= 0) emit('count', { n: cur });
      if (G.countdown <= 0.6) { G.state = 'play'; emit('go', {}); }
    }
    const L = G.city.land, bounds = { min: L.min, max: L.max };
    if (playing) {
      G.time -= dt; G.elapsed += dt;
      // Gentle rubber band: bots far ahead of you ease off a little, bots far behind push a little.
      if (G.player && (G.rubT = (G.rubT || 0) - dt) <= 0) {
        G.rubT = 1;
        const ps = Math.max(80, G.player.score);
        for (const h of G.holes) if (!h.isPlayer) { const lead = (h.score - ps) / ps; h.rubber = U.clamp(1 - 0.14 * lead, CFG.bots.rubberMin, CFG.bots.rubberMax); h.xpMul = U.clamp(1 - 0.3 * lead, CFG.bots.growMin, 1.1); }
      }
      for (const h of G.holes) {
        if (!h.alive) {
          if (h.respawnT > 0) {
            h.respawnT -= dt;
            if (h.isPlayer && h.ghost) { const [dx, dz] = HC.Input ? HC.Input.dir() : [0, 0]; h.ghost.x = U.clamp(h.ghost.x + dx * 700 * dt, L.min + 80, L.max - 80); h.ghost.z = U.clamp(h.ghost.z + dz * 700 * dt, L.min + 80, L.max - 80); }
            if (h.respawnT <= 0) respawn(h);
          }
          continue;
        }
        let d;
        if (h.isPlayer) {
          // Demo autopilot (#auto) hands control back the moment you touch a key or the screen.
          if (G.autopilot && HC.Input && HC.Input.touched) G.autopilot = null;
          d = G.autopilot ? G.autopilot(h) : HC.Input.dir();
        }
        else d = HC.Bots.steer(h, G.holes, dt);
        h.move(d[0], d[1], dt, bounds, G.grip);
      }
    }
    for (const h of G.holes) { h.tick(dt); if (h.dying != null && h.deathTo) { h.x = U.lerp(h.x, h.deathTo.x, Math.min(1, dt * 8)); h.z = U.lerp(h.z, h.deathTo.z, Math.min(1, dt * 8)); } }
    HC.Movers.update(dt);
    HC.Coaster.update(dt);
    for (const h of G.holes) h.physical = h.alive && isVisible(h);
    HC.Physics.step(dt, G.holes);
    if (playing) {
      for (const h of G.holes) if (h.alive && !h.physical) HC.Physics.consumeInstant(h, dt);
      // Hole vs hole.
      for (const a of G.holes) {
        if (!a.alive) continue;
        for (const b of G.holes) {
          if (a === b || !b.alive || b.protect > 0 || a.r < b.r * CFG.hole.eatHoleRatio) continue;
          if (Math.hypot(a.x - b.x, a.z - b.z) < a.r - b.r * 0.35) killHole(a, b);
        }
      }
    }
    if (G.state === 'play') checkEnd();
  };

  function checkEnd() {
    let over = G.time <= 0;
    if (G.mode === 'battle') {
      const left = G.holes.filter((h) => !h.eliminated);
      if (left.length <= 1 || G.player.eliminated) over = true;
    }
    if (G.mode === 'solo' && HC.World.eatenPoints >= HC.World.totalPoints) over = true;
    if (over) { G.state = 'end'; G.endT = CFG.match.endFreeze; emit('end', { results: G.results() }); }
  }

  G.results = function () {
    let order;
    if (G.mode === 'battle') {
      const alive = G.holes.filter((h) => !h.eliminated).sort((a, b) => b.r - a.r || b.score - a.score);
      const dead = G.holes.filter((h) => h.eliminated).sort((a, b) => a.placeAt - b.placeAt);
      order = [...alive, ...dead];
    } else order = G.holes.slice().sort((a, b) => b.score - a.score || b.level - a.level);
    return { mode: G.mode, level: G.levelId, order, place: G.player ? order.indexOf(G.player) + 1 : 0, player: G.player,
      percent: HC.World.eatenPoints / HC.World.totalPoints, playerPercent: G.player ? G.player.score / HC.World.totalPoints : 0 };
  };

  G.ranking = function () { return G.holes.slice().sort((a, b) => b.score - a.score || b.level - a.level); };

  // Main loop.
  G.frame = function (now) {
    const dt = Math.min(0.1, (now - (G.last || now)) / 1000); G.last = now;
    if (!G.paused && G.state !== 'boot' && G.state !== 'results') {
      G.acc += dt; let n = 0;
      while (G.acc >= STEP && n < 4) { G.step(STEP); G.acc -= STEP; n++; }
      if (n === 4) G.acc = 0;
      if (G.state === 'end') { G.endT -= dt; if (G.endT <= 0) { G.state = 'results'; G.onResults && G.onResults(G.results()); } }
    }
    // Auto graphics quality: if a match runs slow, step down resolution/shadows.
    if (G.state === 'play' && !G.headless && HC.Progress && HC.Progress.data.quality === 'auto') {
      const q = G.perfQ || (G.perfQ = { t: 0, n: 0, sum: 0 });
      q.t += dt; q.n++; q.sum += dt;
      if (q.t > 4) {
        const avg = q.sum / q.n;
        if (avg > 0.024 && HC.Render.quality !== 'low') HC.Render.setQuality(HC.Render.quality === 'high' ? 'medium' : 'low');
        q.t = 0; q.n = 0; q.sum = 0;
      }
    }
    // While the math gate is open the city behind it just holds still (saves battery, keeps taps snappy).
    if (G.city && !G.headless && !(HC.Brain && HC.Brain.on && G.state !== 'play')) {
      const f = G.focusHole();
      const tx = f.ghost ? f.ghost.x : f.x, tz = f.ghost ? f.ghost.z : f.z;
      const lead = [f.vx * 0.25, f.vz * 0.25];
      let vw = G.viewWidth(f);
      if (G.state === 'attract') vw = 1500;
      if (HC.flags && HC.flags.view) vw = HC.flags.view;
      if (G.state === 'end' || G.state === 'results') vw = Math.min(vw * 1.25, CFG.camera.viewMax * 1.1);
      HC.Render.updateCamera(tx, tz, vw, dt, lead);
      HC.Render.updateHoles(G.holes);
      HC.Render.setFocus(G.state === 'attract' ? null : (G.player && G.player.alive ? G.player : null));
      HC.Render.setGhost && HC.Render.setGhost(G.player && G.player.ghost, G.player);
      HC.HUD && HC.HUD.frame(dt);
      HC.Render.render(dt);
    }
    requestAnimationFrame(G.frame);
  };
  G.focusHole = function () {
    if (G.state === 'attract') {
      // Follow the current leader; switch smoothly when it changes.
      const lead = G.ranking().find((h) => h.alive) || G.holes[0];
      if (!G.attractFocus || (!G.attractFocus.alive) || (lead !== G.attractFocus && Math.random() < 0.002)) G.attractFocus = lead;
      return G.attractFocus;
    }
    return G.player || G.holes[0];
  };

  HC.Game = G;
})();
