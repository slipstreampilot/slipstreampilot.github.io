// Small math/random helpers and a uniform spatial grid used by AI and activation queries.
(function () {
  const U = {};
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  // Frame-rate independent exponential easing toward a target.
  U.damp = (a, b, rate, dt) => b + (a - b) * Math.exp(-rate * dt);
  U.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  U.easeOutBack = (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  U.easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  U.angleDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

  U.rng = function (seed) {
    let s = (seed >>> 0) || 1;
    const f = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    f.range = (a, b) => a + (b - a) * f();
    f.int = (a, b) => Math.floor(a + (b - a + 1) * f());
    f.pick = (arr) => arr[Math.floor(f() * arr.length)];
    f.chance = (p) => f() < p;
    return f;
  };

  U.shuffle = (arr, r = Math.random) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

  // Uniform grid over the world for fast "what is near here" queries.
  class Grid {
    constructor(size, cell) { this.cell = cell; this.n = Math.ceil(size / cell); this.cells = Array.from({ length: this.n * this.n }, () => []); }
    key(x, y) { const cx = U.clamp(Math.floor(x / this.cell), 0, this.n - 1), cy = U.clamp(Math.floor(y / this.cell), 0, this.n - 1); return cy * this.n + cx; }
    insert(o) { o._cell = this.key(o.x, o.y); this.cells[o._cell].push(o); }
    remove(o) { if (o._cell == null) return; const c = this.cells[o._cell], i = c.indexOf(o); if (i >= 0) { c[i] = c[c.length - 1]; c.pop(); } o._cell = null; }
    move(o) { const k = this.key(o.x, o.y); if (k !== o._cell) { this.remove(o); o._cell = k; this.cells[k].push(o); } }
    query(x, y, r, out = []) {
      const c = this.cell, x0 = U.clamp(Math.floor((x - r) / c), 0, this.n - 1), x1 = U.clamp(Math.floor((x + r) / c), 0, this.n - 1);
      const y0 = U.clamp(Math.floor((y - r) / c), 0, this.n - 1), y1 = U.clamp(Math.floor((y + r) / c), 0, this.n - 1);
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) { const cell = this.cells[cy * this.n + cx]; for (let i = 0; i < cell.length; i++) out.push(cell[i]); }
      return out;
    }
  }
  U.Grid = Grid;

  U.hexToRgb = (hex) => { let h = hex.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; const n = parseInt(h, 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
  U.formatTime = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

  HC.U = U;
})();
