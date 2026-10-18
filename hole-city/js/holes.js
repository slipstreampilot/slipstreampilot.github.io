// Holes: size levels, movement, scoring, being eaten and respawning.
// Score (leaderboard) and size (xp → level) are separate, like hole.io:
// getting eaten costs you size, never your points.
(function () {
  const CFG = HC.CONFIG, HCFG = CFG.hole, U = HC.U;
  let nextId = 1;

  class Hole {
    constructor(o) {
      this.id = nextId++;
      this.name = o.name; this.isPlayer = !!o.isPlayer; this.skin = o.skin;
      this.x = o.x; this.z = o.z; this.vx = 0; this.vz = 0;
      this.baseSpeed = o.isPlayer ? HCFG.playerSpeed : HCFG.botSpeed;
      this.level = 1; this.xp = 0; this.score = 0; this.kills = 0; this.eaten = 0; this.deaths = 0;
      this.r = HCFG.startRadius; this.rv = this.r;
      this.alive = true; this.protect = HCFG.spawnProtection; this.respawnT = 0; this.dying = null;
      this.biggest = null; this.combo = 0; this.comboT = 0; this.physical = true; this.eliminated = false;
      this.dirX = 0; this.dirZ = 0; this.maxLevel = o.maxLevel || HCFG.maxLevel;
    }
    static radiusFor(level) { return HCFG.startRadius * Math.pow(HCFG.radiusGrowth, level - 1); }
    get speed() { return this.baseSpeed * (this.rubber || 1) * Math.pow(this.r / HCFG.startRadius, HCFG.speedExponent); }
    get progress() { return this.level >= this.maxLevel ? 1 : this.xp / CFG.levelStep(this.level); }

    // Returns number of levels gained.
    addPoints(points, countXp = true) {
      this.score += points;
      if (!countXp) return 0;
      this.xp += points * (this.xpMul || 1);
      let gained = 0;
      while (this.level < this.maxLevel && this.xp >= CFG.levelStep(this.level)) { this.xp -= CFG.levelStep(this.level); this.level++; gained++; }
      if (this.level >= this.maxLevel) this.xp = 0;
      this.r = Hole.radiusFor(this.level);
      return gained;
    }
    // Total xp invested to reach the current state (used to shrink on death).
    totalXp() { let t = this.xp; for (let k = 1; k < this.level; k++) t += CFG.levelStep(k); return t; }
    setTotalXp(total) { this.level = 1; this.xp = 0; while (this.level < this.maxLevel && total >= CFG.levelStep(this.level)) { total -= CFG.levelStep(this.level); this.level++; } this.xp = total; this.r = Hole.radiusFor(this.level); }

    move(dirX, dirZ, dt, bounds, grip = 1) {
      const len = Math.hypot(dirX, dirZ), s = this.speed;
      const tx = len > 0.01 ? dirX / Math.max(1, len) * s : 0, tz = len > 0.01 ? dirZ / Math.max(1, len) * s : 0;
      // Low grip (ice) = slower acceleration and braking, so the hole slides.
      this.vx = U.damp(this.vx, tx, HCFG.accel * grip, dt); this.vz = U.damp(this.vz, tz, HCFG.accel * grip, dt);
      this.x += this.vx * dt; this.z += this.vz * dt;
      const m = Math.min(this.r * 0.6, 120);
      this.x = U.clamp(this.x, bounds.min + m, bounds.max - m); this.z = U.clamp(this.z, bounds.min + m, bounds.max - m);
    }
    tick(dt) {
      this.rv = U.damp(this.rv, this.r, HCFG.radiusEase, dt);
      if (this.protect > 0) this.protect -= dt;
      if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }
      if (this.dying != null) { this.dying += dt * 2.6; if (this.dying >= 1) { this.dying = null; } }
    }
  }
  HC.Hole = Hole;
})();
