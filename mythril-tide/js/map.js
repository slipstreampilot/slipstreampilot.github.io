// MYTHRIL TIDE - map.js : ocean chart generation + map screen
'use strict';

// ---- chart geometry (the CHART coordinate space the route web is generated in) ----
// MapScreen scales this 464x240 space fit-to-width into its framed chart rect. Nodes are confined
// to NX0..NX1 / NY0..NY1. lx0..lh is a reserved top-right pocket (once the classic Captain's Log
// corner); generation still keeps beacons out of it so every region's fixed chart stays identical.
const CHART = {
  px0: 24, py0: 24, px1: 488, py1: 264,      // chart opening = inside a uniform 24px wood border
  NX0: 46, NX1: 458, NY0: 54, NY1: 242,      // node placement bounds (inset from the border)
  lx0: 356, ly0: 30, lw: 126, lh: 86,        // reserved pocket (kept for chart determinism)
};

// Fixed (deterministic) ocean charts. The geography no longer rerolls each run:
// each region produces the SAME chart every time (seeded by region index), with the
// existing node COUNTS, TYPES and RATIOS preserved exactly. An authored layout in
// MapGen.CHARTS[idx] (positions/types) overrides the seeded one for hand-tuned regions.
const MapGen = {
  CHARTS: {}, // optional per-region authored {cols, nodes:[{col,x,y,type}]}
  genRegion(idx) {
    if (this.CHARTS[idx]) return this._fromAuthored(this.CHARTS[idx], idx);
    const last = idx === 7;
    const cols = last ? 4 : 6, rows = 3;
    // deterministic RNG keyed by region -> the chart is "fixed" (same every voyage)
    const rng = U.mulberry32((0x9e3779b9 ^ Math.imul(idx + 1, 0x85ebca6b)) >>> 0);
    const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
    const rf = (a, b) => a + rng() * (b - a);
    const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const { NX0, NX1, NY0, NY1 } = CHART;
    const ymid = Math.round((NY0 + NY1) / 2);
    const cellW = (NX1 - NX0) / cols, cellH = (NY1 - NY0) / rows;
    const nodes = [];
    let id = 0;
    nodes.push({ id: id++, col: -1, x: NX0 - 12, y: ymid, type: 'start', visited: true, edges: [] });
    // FTL-style beacon field: each grid cell ~80% holds a beacon, jittered within the cell.
    // Every column keeps at least one beacon so the sea is always traversable.
    for (let c = 0; c < cols; c++) {
      let placed = 0;
      for (const r of shuffle([0, 1, 2])) {
        if (rng() >= 0.55 && placed > 0) continue; // sparser field (was too dense)
        const cx = NX0 + c * cellW + cellW * (0.5 + rf(-0.24, 0.24));
        let cy = NY0 + r * cellH + cellH * (0.5 + rf(-0.26, 0.26));
        if (cx > CHART.lx0 - 10 && cy < CHART.ly0 + CHART.lh + 8) cy = CHART.ly0 + CHART.lh + 12 + rf(0, 16); // keep clear of the Log overlay
        nodes.push({ id: id++, col: c, x: Math.round(cx), y: Math.round(U.clamp(cy, NY0 - 2, NY1 + 2)), type: 'tbd', visited: false, edges: [] });
        placed++;
      }
    }
    nodes.push({ id: id++, col: cols, x: NX1 + 12, y: ymid, type: last ? 'boss' : 'exit', visited: false, edges: [] });
    // assign types - SAME ratios as before
    const mid = nodes.filter(n => n.type === 'tbd');
    let shopPlaced = 0;
    for (const n of mid) {
      const roll = rng();
      if (shopPlaced < (last ? 1 : 2) && n.col >= 1 && roll < 0.14) { n.type = 'shop'; shopPlaced++; }
      else if (roll < 0.42) n.type = 'fight';
      else if (roll < 0.70) n.type = 'event';
      else if (roll < 0.80) n.type = 'distress';
      else if (roll < 0.88) n.type = 'elite';
      else n.type = 'empty';
    }
    // guarantee at least one anchorage in EVERY region (incl. the boss region — a refit
    // before the Warden), never in column 0, and deterministically (seeded rng, not Math.random).
    if (shopPlaced === 0) {
      const cand = mid.filter(n => n.col >= 1);
      if (cand.length) { cand[Math.floor(rng() * cand.length)].type = 'shop'; shopPlaced++; }
    }
    this._assignNames(nodes, shuffle, idx);
    this._spaceNodes(nodes, cols);                                      // radius rule: enforce min beacon spacing
    this._connectWeb(nodes, cols, Math.max(cellW, cellH) * 1.5, rng);   // wire AFTER spacing -> routes match final positions
    // NOTE: labels are laid out per-frame at draw time (MapScreen.placeLabels) over only the
    // SHOWN set, moving labels not nodes — so beacon spacing set above is never disturbed.
    return { nodes, cols };
  },
  // Greg review #4: a radius rule guaranteeing a minimum centre-to-centre distance between
  // EVERY pair of beacons, so no chart crowds. Deterministic (no RNG) → charts stay fixed and
  // node counts/types are untouched. Endpoints (start/exit/boss) are anchored; mid beacons
  // slide within the chart bounds and never land under the Captain's Log overlay.
  _spaceNodes(nodes, cols) {
    const C = CHART, MIN = 46;
    const movable = (n) => n.col >= 0 && n.col < cols;
    const place = (n, x, y) => {
      n.x = U.clamp(x, C.NX0 + 4, C.NX1 - 4);
      n.y = U.clamp(y, C.NY0, C.NY1);
      if (n.x > C.lx0 - 10 && n.y < C.ly0 + C.lh + 8) n.y = C.ly0 + C.lh + 12; // keep clear of the Log
    };
    for (let iter = 0; iter < 500; iter++) {
      let moved = false;
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d >= MIN) continue;
        if (d < 0.01) { dx = (i % 2 ? 1 : -1); dy = 1; d = Math.hypot(dx, dy); } // coincident → deterministic nudge
        const ux = dx / d, uy = dy / d, shove = (MIN - d) + 0.5;
        const ma = movable(a), mb = movable(b);
        if (ma && mb) { place(a, a.x - ux * shove / 2, a.y - uy * shove / 2); place(b, b.x + ux * shove / 2, b.y + uy * shove / 2); }
        else if (mb) place(b, b.x + ux * shove, b.y + uy * shove);
        else if (ma) place(a, a.x - ux * shove, a.y - uy * shove);
        moved = true;
      }
      if (!moved) break;
    }
  },
  // (Removed _spreadLabels — U13. Place-name plaques are now laid out per-frame at draw time over
  // only the SHOWN set (MapScreen.placeLabels), moving the LABEL boxes, never the node positions.
  // The old gen-time pass moved node Y to de-overlap labels for ALL nodes — labels that were never
  // shown together — silently undoing the beacon spacing _spaceNodes had just established.)
  // FTL connectivity: link beacons in the SAME or ADJACENT columns that are within range
  // (close => connected, far => not), then guarantee a forward path so no map is a dead end.
  _connectWeb(nodes, cols, thresh, rng) {
    const connect = (a, b) => { if (a.id !== b.id) { if (!a.edges.includes(b.id)) a.edges.push(b.id); if (!b.edges.includes(a.id)) b.edges.push(a.id); } };
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j], dc = Math.abs(a.col - b.col);
        if (dc > 1) continue;                                  // only neighbouring columns
        if (dc === 0) { if (dist(a, b) <= thresh * 0.85 && rng() < 0.55) connect(a, b); } // sparse vertical links
        else if (dist(a, b) <= thresh) connect(a, b);          // proximity link across a column
      }
    }
    // guarantee forward reachability: each column reaches the next (nearest fallback link)
    for (let c = -1; c < cols; c++) {
      const cur = nodes.filter(n => n.col === c), nxt = nodes.filter(n => n.col === c + 1);
      if (!nxt.length) continue;
      const nearest = (n, list) => list.slice().sort((p, q) => dist(p, n) - dist(q, n))[0];
      for (const n of cur) if (!n.edges.some(e => nodes[e].col === c + 1)) connect(n, nearest(n, nxt));
      for (const n of nxt) if (!n.edges.some(e => nodes[e].col === c)) connect(nearest(n, cur), n);
    }
  },
  _fromAuthored(spec, idx) {
    const nodes = [];
    let id = 0;
    for (const nd of spec.nodes) {
      nodes.push({ id: id++, col: nd.col, x: nd.x, y: nd.y, type: nd.type, visited: nd.type === 'start', edges: [] });
    }
    const rng = U.mulberry32(0x1234567);
    const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    this._assignNames(nodes, shuffle, idx || 0);
    this._wire(nodes, spec.cols, p => rng() < p);
    return { nodes, cols: spec.cols };
  },
  // give every node a fixed, evocative chart name (start/exit/boss are special-cased)
  _assignNames(nodes, shuffle, idx) {
    const pool = (DATA.REGION_PLACES && DATA.REGION_PLACES[idx]) || DATA.PLACE_NAMES;
    const names = shuffle(pool);
    let ni = 0;
    for (const n of nodes) {
      if (n.type === 'start') n.name = idx === 0 ? 'Home Waters' : 'Open Sea';
      else if (n.type === 'exit') n.name = 'Onward Passage';
      else if (n.type === 'boss') n.name = 'The Last Meridian';
      else n.name = names[ni++ % names.length];
    }
  },
  // edge wiring shared by seeded + authored charts
  _wire(nodes, cols, chance) {
    const byCol = c => nodes.filter(n => n.col === c);
    const connect = (a, b) => { if (!a.edges.includes(b.id)) a.edges.push(b.id); if (!b.edges.includes(a.id)) b.edges.push(a.id); };
    for (let c = -1; c < cols; c++) {
      const cur = byCol(c), next = byCol(c + 1);
      if (!next.length) continue;
      for (const n of cur) {
        const sorted = next.slice().sort((p, q) => Math.abs(p.y - n.y) - Math.abs(q.y - n.y));
        connect(n, sorted[0]);
        if (sorted[1] && Math.abs(sorted[1].y - n.y) <= 48 && chance(0.5)) connect(n, sorted[1]);
      }
      for (const n of next) {
        if (!n.edges.some(eid => nodes[eid].col === c)) {
          const sorted = cur.slice().sort((p, q) => Math.abs(p.y - n.y) - Math.abs(q.y - n.y));
          if (sorted[0]) connect(sorted[0], n);
        }
      }
    }
    for (let c = 0; c < cols; c++) {
      const cur = byCol(c).sort((a, b) => a.y - b.y);
      for (let i = 0; i + 1 < cur.length; i++) if (chance(0.3)) connect(cur[i], cur[i + 1]);
    }
  },
};

// ============ SEA CHART (1920x1080, built on the shared KIT) ============
// Parchment page -> wood panels (ship + crew left, chart notes right) -> the framed sea chart in the
// middle. Every control is a KIT registration (ids 'map.*'), so the drawn rect IS the click rect:
//   map.log · map.menu · map.settings · map.ship · map.decks · map.setcourse · map.node.<id> · map.label.<id>
// Beacons hover and click through the SAME square (R25). Place-name plaques are laid out per frame over
// the SHOWN set only, greedily, so they never overlap each other, the beacons, the legend or the ship
// token (R24) — labels move, beacons never do. Setting course sails the token along the route before
// Game.travelTo runs (instant in headless harnesses, which cannot animate).
const MapScreen = {
  designW: 1920, designH: 1080,
  // layout (1080p design grid, 16px gutters)
  L: {
    region: { x: 16, y: 16, w: 560, h: 72 },
    res: { x: 660, y: 16, w: 600, h: 72 },
    log: { x: 1424, y: 16, w: 228, h: 72 },
    menu: { x: 1668, y: 16, w: 148, h: 72 },
    gear: { x: 1832, y: 16, w: 72, h: 72 },
    CV: { x: 336, y: 104, w: 1252, h: 869 },
    ship: { x: 16, y: 104, w: 300, h: 304 },
    crew: { x: 16, y: 424, w: 300, h: 549 },
    note: { x: 1604, y: 104, w: 300, h: 757 },
    course: { x: 1604, y: 877, w: 300, h: 96 },
    shipBtn: { x: 16, y: 996, w: 200, h: 68 },
    decksBtn: { x: 232, y: 996, w: 200, h: 68 },
    hint: { x: 456, y: 992, w: 724, h: 72 },
    threat: { x: 1196, y: 992, w: 708, h: 72 },
  },
  NODE_HIT: 12,     // chart units: half-size of a beacon's square target — hover == click (R25)
  SAIL_SECS: 0.8,   // the token's sail to a new island before the node resolves
  LBL_H: 46,        // place-name plaque height (design px)

  enter() {
    AUDIO.playMap();
    this.msg = null;
    this.msgT = 0;
    this._selId = null;
    this._hov = null;
    this._logOpen = false;
    this._sail = null;
  },
  update(dt) {
    // the sea never pauses: fires burn, water rises, crew repair & heal
    Game.ship.tick(dt, null);
    if (this.msgT > 0) this.msgT -= dt;
    if (this._sail && Game.screen === this) {
      this._sail.t += dt;
      if (this._sail.t >= this._sail.dur) { const n = this._sail.node; this._sail = null; Game.travelTo(n); return; }
    }
    Game.checkDoom();
  },

  canTravel(n) {
    if (Game.run.cheats && Game.run.cheats.teleport && n.id !== Game.run.nodeId) return true; // magic teleport
    const cur = Game.run.map.nodes[Game.run.nodeId];
    return cur.edges.includes(n.id);
  },
  // R7 — the Golden Compass augment charts the WHOLE sea: every island is labelled with what
  // awaits there, unreachable ones included (without it only current + reachable + hovered show).
  compassReveal(run) { return !!(run && run.augs && run.augs.includes('golden_compass')); },

  // ---------------- flow ----------------
  travelOrEnter(n) {
    const run = Game.run;
    if (this._sail) return; // underway: orders wait until we drop anchor
    if (n.id === run.nodeId && n.type === 'shop') { Game.setScreen('shop'); AUDIO.sfx('click'); return; }
    if (n.id === run.nodeId && n.type === 'boss' && !n.visited) { n.visited = true; Game.startBossStage(); return; }
    if (n.id === run.nodeId) return;
    if (this.canTravel(n)) this.setSail(n);
    else { this.msg = 'Too far — follow the dotted routes from your position.'; this.msgT = 2.5; AUDIO.sfx('back'); }
  },
  // sail the token along the route, THEN resolve the node. Headless harnesses (no devicePixelRatio)
  // cannot animate, so they travel at once and stay deterministic.
  setSail(n) {
    if (!KIT.canTransition()) { Game.travelTo(n); return; }
    this._sail = { from: Game.run.map.nodes[Game.run.nodeId], node: n, t: 0, dur: this.SAIL_SECS };
    this._selId = n.id;
    AUDIO.sfx('creak');
  },
  click() { /* every live target on the chart is a KIT control; empty water and page do nothing */ },
  key(k) {
    if (this._sail) return;
    if (k === 'Escape' && this._logOpen) { this._logOpen = false; return; }
    if (k === 'l' || k === 'L') { this._logOpen = !this._logOpen; AUDIO.sfx('click'); return; }
    if (k === 's' && !this._logOpen) Game.setScreen('shipmenu', { tab: 0 });
  },

  // ---------------- chart geometry ----------------
  chartXform() {
    const CV = this.L.CV;
    const CW = CHART.px1 - CHART.px0, CHt = CHART.py1 - CHART.py0;
    const S = CV.w / CW, tx = CV.x - CHART.px0 * S, ty = CV.y + (CV.h - CHt * S) / 2 - CHART.py0 * S;
    return { tx, ty, S, CV };
  },
  toScreen(x, y) { const c = this._cv; return { x: c.tx + x * c.S, y: c.ty + y * c.S }; },
  // the ONE target rect of a beacon: hover, click and tests all use it (R25)
  nodeRect(n) {
    const p = this.toScreen(n.x, n.y), h = this.NODE_HIT * this._cv.S;
    return { x: p.x - h, y: p.y - h, w: 2 * h, h: 2 * h };
  },
  nodeRadius(n) { return (n.type === 'boss' || n.type === 'exit') ? 8 : 6; },
  // the ship token's rect at a chart point (screen px, 1x native art), clamped onto the chart
  tokenRect(x, y) {
    const p = this.toScreen(x, y), CV = this.L.CV;
    const cx = U.clamp(p.x, CV.x + 60, CV.x + CV.w - 60);
    return { x: cx - 48, y: p.y - 78, w: 96, h: 62 };
  },
  legendRect(ctx) {
    const items = this.legendItems(), CV = this.L.CV;
    let w = 32;
    for (const it of items) w += 28 + TYPE.width(ctx, it.label, 16, { italic: true }) + 26;
    w = Math.min(CV.w - 48, Math.round(w));
    return { x: Math.round(CV.x + (CV.w - w) / 2), y: CV.y + CV.h - 64, w, h: 44 };
  },
  legendItems() {
    const run = Game.run, feat = (DATA.REGION_FEATURE && DATA.REGION_FEATURE[run.region]) || {};
    const types = ['shop', 'fight', 'elite', 'distress', 'event', 'empty', run.region === 7 ? 'boss' : 'exit'];
    return types.map(t => ({ type: t, label: feat[t] || DATA.NODE_DESC[t] || t })).concat([{ type: 'reach', label: 'In reach' }]);
  },

  // ---------------- place-name plaques (R24) ----------------
  labelSize(ctx, n) {
    const w = Math.max(TYPE.width(ctx, n.name || '', 18, { display: true }), TYPE.width(ctx, this.nodeDesc(n), 15, { italic: true })) + 28;
    return { w: Math.ceil(w), h: this.LBL_H };
  },
  shownLabelNodes(run) {
    const set = new Map();
    const cur = run.map.nodes[run.nodeId]; set.set(cur.id, cur);
    const reach = run.map.nodes.filter(n => this.canTravel(n) && n.id !== cur.id).sort((a, b) => a.x - b.x || a.y - b.y);
    for (const n of reach) set.set(n.id, n);
    if (this.compassReveal(run)) for (const n of run.map.nodes.slice().sort((a, b) => a.x - b.x || a.y - b.y)) set.set(n.id, n);
    return [...set.values()];
  },
  // Greedy placement in priority order: each plaque takes the best candidate spot around its beacon
  // that intersects NO earlier plaque (hard rule), preferring spots clear of every beacon, the legend
  // and the ship token. Beacons never move. Deterministic: same shown set -> same layout.
  placeLabels(ctx, nodes, obstacles, placed) {
    const CV = this.L.CV, S = this._cv.S, pad = 8, gap = 6;
    const inter = (a, b, m) => a.x < b.x + b.w + m && b.x < a.x + a.w + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m;
    const clampR = r => ({ x: U.clamp(r.x, CV.x + pad, CV.x + CV.w - pad - r.w), y: U.clamp(r.y, CV.y + pad, CV.y + CV.h - pad - r.h), w: r.w, h: r.h });
    const out = [];
    for (const n of nodes) {
      const { w, h } = this.labelSize(ctx, n), p = this.toScreen(n.x, n.y), d = (this.nodeRadius(n) + 5) * S;
      const score = r => {
        let s = 0;
        for (const o of obstacles) if (inter(r, o, 2)) s += 1000;
        const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.w)), dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.h));
        return s + Math.hypot(dx, dy);
      };
      const free = r => !placed.some(q => inter(r, q, 4));
      let best = null, bestS = Infinity;
      const tryR = (r, pref) => { r = clampR(r); if (!free(r)) return; const s = score(r) + pref; if (s < bestS) { bestS = s; best = r; } };
      for (const ring of [0, 20, 44, 72, 104]) {
        const dd = d + gap + ring;
        tryR({ x: p.x - w / 2, y: p.y + dd, w, h }, 0);                 // below
        tryR({ x: p.x - w / 2, y: p.y - dd - h, w, h }, 6);             // above
        tryR({ x: p.x + dd, y: p.y - h / 2, w, h }, 12);                // right
        tryR({ x: p.x - dd - w, y: p.y - h / 2, w, h }, 12);            // left
        const k = dd * 0.72;
        tryR({ x: p.x + k * 0.4, y: p.y + k, w, h }, 9);                // below-right
        tryR({ x: p.x - w - k * 0.4, y: p.y + k, w, h }, 9);            // below-left
        tryR({ x: p.x + k * 0.4, y: p.y - k - h, w, h }, 10);           // above-right
        tryR({ x: p.x - w - k * 0.4, y: p.y - k - h, w, h }, 10);       // above-left
        if (best && bestS < 1000) break;                                 // clean spot found at this ring
      }
      if (!best) { // last resort: scan the whole chart for the nearest plaque-free spot
        for (let y = CV.y + pad; y <= CV.y + CV.h - pad - h; y += 8) for (let x = CV.x + pad; x <= CV.x + CV.w - pad - w; x += 8) tryR({ x, y, w, h }, 0);
      }
      if (!best) continue; // (cannot happen on a 1252x869 chart, but never draw an overlapping plaque)
      best = { x: Math.round(best.x), y: Math.round(best.y), w: best.w, h: best.h };
      placed.push(best);
      out.push({ n, r: best, px: p.x, py: p.y, d });
    }
    return out;
  },
  drawPlaque(ctx, b, hot) {
    const n = b.n, r = b.r, isCur = n.id === Game.run.nodeId, seen = n.visited && !isCur && n.type !== 'start';
    // leader line when the plaque had to stand off from its beacon
    const cx = U.clamp(b.px, r.x, r.x + r.w), cy = U.clamp(b.py, r.y, r.y + r.h), dist = Math.hypot(cx - b.px, cy - b.py);
    if (dist > b.d + 14) {
      const ux = (cx - b.px) / dist, uy = (cy - b.py) / dist;
      ctx.strokeStyle = 'rgba(74,51,24,0.7)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(b.px + ux * b.d, b.py + uy * b.d); ctx.lineTo(cx, cy); ctx.stroke();
      ctx.setLineDash([]); ctx.lineWidth = 1;
    }
    ctx.fillStyle = hot ? 'rgba(246,234,204,0.97)' : 'rgba(236,220,182,0.92)'; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = hot ? KIT.C.actionHi : isCur ? '#1f5f5b' : 'rgba(90,60,28,0.75)';
    ctx.lineWidth = hot || isCur ? 2 : 1.5; ctx.strokeRect(r.x + 0.75, r.y + 0.75, r.w - 1.5, r.h - 1.5); ctx.lineWidth = 1;
    KIT.text(ctx, n.name || '', { x: r.x, y: r.y + 4, w: r.w, h: 22 }, { size: 18, display: true, align: 'center', padX: 8, color: seen ? COL.inkfade : COL.inkdk, fit: 'shrink' });
    KIT.text(ctx, this.nodeDesc(n), { x: r.x, y: r.y + 25, w: r.w, h: 17 }, { size: 15, italic: true, align: 'center', padX: 8, color: this.descColor(n, seen), fit: 'shrink' });
  },

  // ---------------- armada pursuit (R23) ----------------
  // The vanguard overtakes you at a column once its front reaches it (Game.resolveNode). "Spare" =
  // how many jumps you could make WITHOUT advancing before it catches you at your current column.
  threatInfo(run) {
    run = run || Game.run;
    const inc = run.difficulty === 'easy' ? 0.34 : 0.48, front = run.front || 0;
    const cur = run.map.nodes[run.nodeId], col = Math.max(0, cur ? cur.col : 0);
    let spare = 0;
    while (spare < 6 && col > Math.floor(front + (spare + 1) * inc)) spare++;
    const frac = U.clamp((3 - spare) / 3, 0, 1);
    const level = frac <= 0 ? 'calm' : frac < 0.6 ? 'gaining' : 'close';
    const color = level === 'calm' ? COL.inkmd : level === 'gaining' ? '#9a5a10' : COL.dkred;
    const word = spare >= 3 ? 'Far astern — no sails in sight' : spare === 2 ? 'Gaining — two jumps to spare'
      : spare === 1 ? 'Close astern — one jump to spare' : 'On your heels — sail west now!';
    return { spare, frac, level, color, word };
  },
  // would the vanguard catch us if we sailed to n now? (mirrors Game.resolveNode)
  overtakenAt(n) {
    const run = Game.run, inc = run.difficulty === 'easy' ? 0.34 : 0.48;
    return n.col >= 0 && n.col <= Math.floor(run.front + inc) && n.type !== 'boss' && n.type !== 'exit';
  },

  // ---------------- render ----------------
  render(ctx) {
    const run = Game.run, reg = DATA.REGIONS[run.region], W = 1920, H = 1080;
    this._cv = this.chartXform();
    KIT.page(ctx, W, H);

    // ---- layout pass FIRST (hover is known before any panel reads it: no one-frame lag, R25) ----
    const nodes = run.map.nodes, cur = nodes[run.nodeId], S = this._cv.S;
    const legend = this.legendRect(ctx);
    const tokAt = this._sail ? this.sailPos() : cur;
    const obstacles = [{ ...legend }, { ...this.tokenRect(tokAt.x, tokAt.y) }];
    for (const n of nodes) {
      const p = this.toScreen(n.x, n.y), d = (this.nodeRadius(n) + 5) * S;
      obstacles.push({ x: p.x - d, y: p.y - d, w: 2 * d, h: 2 * d, own: n.id });
    }
    const placed = [];
    const boxes = this.placeLabels(ctx, this.shownLabelNodes(run), obstacles, placed);
    let hov = null;
    if (!this._sail) {
      for (const b of boxes) if (KIT.hovered('map.label.' + b.n.id, b.r)) hov = b.n;
      for (const n of nodes) if (KIT.hovered('map.node.' + n.id, this.nodeRect(n))) hov = n;
    }
    if (hov && !boxes.some(b => b.n.id === hov.id)) boxes.push(...this.placeLabels(ctx, [hov], obstacles, placed)); // hover label last: never disturbs the others
    this._hov = hov;
    if (hov) this._selId = hov.id;
    this._labelRects = boxes.map(b => ({ id: b.n.id, x: b.r.x, y: b.r.y, w: b.r.w, h: b.r.h }));
    this._legendRect = legend;

    this.renderTop(ctx, run, reg);

    // ---- the chart ----
    const CV = this.L.CV, cv = this._cv;
    ctx.save(); ctx.beginPath(); ctx.rect(CV.x, CV.y, CV.w, CV.h); ctx.clip();
    this.drawChartBg(ctx, run, reg, CV.x, CV.y, CV.w, CV.h);
    ctx.save(); ctx.translate(cv.tx, cv.ty); ctx.scale(cv.S, cv.S);
    this.drawChartFg(ctx, run, hov);
    ctx.restore();
    this.drawToken(ctx, run);
    for (const b of boxes) {
      this.drawPlaque(ctx, b, hov && hov.id === b.n.id);
      KIT.reg('map.label.' + b.n.id, b.r, { onClick: () => this.travelOrEnter(b.n), sound: false });
    }
    for (const n of nodes) KIT.reg('map.node.' + n.id, this.nodeRect(n), { onClick: () => this.travelOrEnter(n), sound: false });
    if (hov && (this.canTravel(hov) || hov.id === run.nodeId)) Game.hot = true;
    this.drawLegend(ctx, legend);
    ctx.restore();
    KIT.frame(CV);

    this.drawShipPanel(ctx, run);
    this.drawCrewPanel(ctx, run);
    this.drawNotePanel(ctx, run);
    this.drawBottom(ctx, run);

    if (this._logOpen) { KIT.flushFrames(ctx); this.drawJournal(ctx, run); }
    KIT.flushFrames(ctx);
    if (this._sail) { KIT.blockBelow(); KIT.reg('map.sailing', { x: 0, y: 0, w: W, h: H }, { sound: false }); } // underway: input waits
    KIT.flushTip(ctx, W, H);
  },

  // ---- top row: region plaque · resources · log / menu / settings ----
  renderTop(ctx, run, reg) {
    const L = this.L, R = L.region;
    KIT.panel(ctx, R);
    ctx.fillStyle = COL.brassdk; ctx.beginPath(); ctx.arc(R.x + 40, R.y + 36, 25, 0, 7); ctx.fill();
    ctx.fillStyle = COL.brass; ctx.beginPath(); ctx.arc(R.x + 40, R.y + 36, 21, 0, 7); ctx.fill();
    ctx.fillStyle = COL.brasshi; ctx.beginPath(); ctx.arc(R.x + 37, R.y + 33, 17, 0, 7); ctx.fill();
    this.drawNodeEmblemBig(ctx, R.x + 40, R.y + 36, 'shop', 16);
    const tx = R.x + 80, tw = R.w - 96;
    KIT.text(ctx, reg.name, { x: tx, y: R.y + 8, w: tw, h: 30 }, { size: 26, display: true, fit: 'shrink' });
    KIT.text(ctx, 'Sea ' + UI.regionLabel(run.region) + ' · ' + reg.desc, { x: tx, y: R.y + 40, w: tw, h: 22 }, { size: 16, italic: true, color: COL.inkmd, fit: 'ellipsis' });
    if (KIT.hovered('map.top.region', R)) KIT.tip([{ t: reg.name + ' — Sea ' + UI.regionLabel(run.region), c: TIP.ink }, { t: reg.desc, c: TIP.body }], Game.mouse.x, Game.mouse.y);

    const P = L.res;
    KIT.panel(ctx, P);
    const res = [
      ['shard', run.shards, 'Mana Shards', 'The coin of the sea: upgrades, crew, guns.'],
      ['runeshot', run.runeshot, 'Runeshot', 'Ammunition for bombs and torpedoes. They slip under enemy wards.'],
      ['candle', run.candles, 'Seance Candles', 'Burned to deploy or re-bind an orbiting familiar.'],
    ];
    const cw = P.w / 3;
    res.forEach((rs, j) => {
      const x = P.x + j * cw, s = '' + (rs[1] || 0), nw = TYPE.width(ctx, s, 30), gw = 42 + 12 + nw, ix = Math.round(x + (cw - gw) / 2);
      if (j) { ctx.strokeStyle = 'rgba(90,60,28,0.42)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, P.y + 16); ctx.lineTo(x, P.y + P.h - 16); ctx.stroke(); ctx.lineWidth = 1; }
      UI.drawRes(ctx, rs[0], ix, P.y + 15, 42);
      KIT.text(ctx, s, { x: ix + 54, y: P.y + 8, w: nw + 4, h: P.h - 16 }, { size: 30 });
      if (KIT.hovered('map.top.' + rs[0], { x, y: P.y, w: cw, h: P.h })) KIT.tip([{ t: rs[2] + ': ' + s, c: TIP.ink }, { t: rs[3], c: TIP.body }], Game.mouse.x, Game.mouse.y);
    });

    KIT.button(ctx, 'map.log', L.log, "Captain's Log", {
      onClick: () => { this._logOpen = !this._logOpen; }, size: 21,
      tip: [{ t: "Captain's Log", c: TIP.ink }, { t: 'Every day of the voyage so far. (L)', c: TIP.body }],
    });
    KIT.button(ctx, 'map.menu', L.menu, 'Menu', {
      onClick: () => { Game.save(); Game.setScreen('title'); }, size: 21,
      tip: [{ t: 'Save and leave', c: TIP.ink }, { t: 'Saves the voyage and returns to the title screen.', c: TIP.body }],
    });
    KIT.button(ctx, 'map.settings', L.gear, '', {
      onClick: () => { Game.save(); Game.setScreen('title'); },
      icon: (c, x, y, s, col) => this.cogHD(c, x, y, s * 0.6, col),
      tip: [{ t: 'Settings', c: TIP.ink }, { t: 'Saves the voyage and opens the title menu (sound, display, help).', c: TIP.body }],
    });
  },

  // ---- left: the ship ----
  // the ship card's inner layout (pure geometry; ui_audit asserts every row fits inside the card)
  shipCardLayout(c) {
    const ix = c.x + 14, iw = c.w - 28;
    const art = { x: Math.round(c.x + (c.w - 192) / 2), y: c.y + 10, w: 192, h: 124 };
    const hull = { x: ix, y: c.y + 140, w: iw, h: 22 };
    const meter = { x: ix, y: c.y + 166, w: iw, h: 10 };
    const sy = c.y + 186, sw = iw / 3, sh = 36;
    const stats = [0, 1, 2].map(i => ({ x: Math.round(ix + i * sw), y: sy, w: Math.round(sw), h: sh }));
    return { art, hull, meter, stats };
  },
  drawShipPanel(ctx, run) {
    const ship = Game.ship, P = this.L.ship;
    const c = KIT.panel(ctx, P, { wood: true, title: ship.name || 'Dawnchaser' });
    KIT.card(ctx, c, { studs: false });
    const Ly = this.shipCardLayout(c);
    if (!SPR.drawArt(ctx, 'mini_dawnchaser', Ly.art.x, Ly.art.y, Ly.art.w, Ly.art.h)) { ctx.fillStyle = 'rgba(120,84,40,0.2)'; ctx.fillRect(Ly.art.x, Ly.art.y, Ly.art.w, Ly.art.h); }
    KIT.text(ctx, 'Hull', Ly.hull, { size: 18, display: true, color: COL.inkmd });
    KIT.text(ctx, ship.hull + ' / ' + ship.hullMax, Ly.hull, { size: 19, align: 'right' });
    const hf = ship.hull / Math.max(1, ship.hullMax);
    KIT.meter(ctx, 'map.hull', Ly.meter, hf, Game.hullBarColor(hf));
    const stats = [
      ['weapons', ship.weapons.filter(Boolean).length, 'Guns mounted', 'Weapons fitted to your gun mounts. Swap them in Ship › Loadout.'],
      ['sails', ship.sysLv.sails || 0, 'Sails level', 'Higher sails mean more evasion in battle.'],
      ['doors', ship.sysLv.doors || 0, 'Doors level', 'Sturdier doors slow boarders, fire and flood.'],
    ];
    stats.forEach((st, i) => {
      const r = Ly.stats[i], s = '' + st[1], nw = TYPE.width(ctx, s, 22, { display: true }), gw = 30 + 8 + nw, ix = Math.round(r.x + (r.w - gw) / 2);
      drawSysSym(ctx, st[0], ix, r.y + 3, 30, COL.inkdk);
      KIT.text(ctx, s, { x: ix + 38, y: r.y, w: nw + 4, h: r.h }, { size: 22, display: true });
      if (KIT.hovered('map.stat.' + st[0], r)) KIT.tip([{ t: st[2] + ': ' + s, c: TIP.ink }, { t: st[3], c: TIP.body }], Game.mouse.x, Game.mouse.y);
    });
  },
  // ---- left: the crew roster ----
  drawCrewPanel(ctx, run) {
    const ship = Game.ship, P = this.L.crew, crew = ship.aliveCrew();
    const c = KIT.panel(ctx, P, { wood: true, title: 'Crew', titleRightW: 110 });
    KIT.text(ctx, crew.length + ' aboard', { x: P.x + P.w - 126, y: P.y + 2, w: 110, h: 36 }, { size: 17, italic: true, align: 'right', color: KIT.C.onWoodMuted, shadow: 'rgba(16,9,3,0.85)', shadowDx: 1, shadowDy: 1 });
    const n = Math.max(1, crew.length), gap = 8, rh = Math.min(72, Math.floor((c.h - gap * (n - 1)) / n));
    crew.forEach((cm, i) => {
      const r = { x: c.x - 4, y: c.y + i * (rh + gap), w: c.w + 8, h: rh };
      KIT.card(ctx, r, { studs: rh >= 60 });
      const ps = rh - 16;
      if (!SPR.drawArt(ctx, 'portrait_' + cm.race, r.x + 8, r.y + 8, ps, ps)) { ctx.fillStyle = COL.woodfr; ctx.fillRect(r.x + 8, r.y + 8, ps, ps); }
      const room = ship.rooms[cm.roomId], skey = room && room.key;
      const station = skey ? (DATA.SYSTEMS[skey] ? DATA.SYSTEMS[skey].name : skey) : 'Idle';
      const nx = r.x + ps + 18, nwid = r.x + r.w - 12 - nx, fs = rh >= 60 ? 21 : 18;
      const nmW = Math.min(nwid * 0.6, TYPE.width(ctx, cm.name, fs, { display: true }) + 2);
      KIT.text(ctx, cm.name, { x: nx, y: r.y + 6, w: nmW + 2, h: rh * 0.5 }, { size: fs, display: true, fit: 'ellipsis' });
      KIT.text(ctx, '- ' + station, { x: nx + nmW + 6, y: r.y + 6, w: nwid - nmW - 6, h: rh * 0.5 }, { size: fs - 3, color: COL.inkmd, fit: 'ellipsis' });
      const h2 = Math.max(0, cm.hp) / cm.maxhp;
      KIT.meter(ctx, 'map.crew.' + i, { x: nx, y: r.y + rh - 20, w: nwid, h: 10 }, h2, h2 < 0.34 ? COL.red : COL.green);
      if (KIT.hovered('map.crew.' + i, r)) KIT.tip([{ t: cm.name + ' — ' + ((DATA.RACES[cm.race] && DATA.RACES[cm.race].name) || cm.race), c: TIP.ink }, { t: 'Health ' + Math.max(0, Math.round(cm.hp)) + ' of ' + cm.maxhp + ' · at ' + station, c: TIP.body }, { t: 'Move crew from the Decks screen.', c: TIP.faint }], Game.mouse.x, Game.mouse.y);
    });
  },

  // ---- right: chart notes for the hovered (or last inspected) island + Set Course ----
  nodeVig(type) {
    return { shop: 'vig_shop', fight: 'vig_armada', elite: 'vig_armada', distress: 'vig_wreck', boss: 'vig_boss', exit: 'vig_port', event: 'vig_island', start: 'vig_port', empty: 'vig_calm' }[type] || 'vig_island';
  },
  NODE_FLAVOR: { fight: 'Hostile sails on the horizon. Clear them, or slip past.', elite: 'A heavy Armada hull — dangerous, but well-stocked.', shop: 'A safe harbor. Trade, repair, and refit here.', distress: 'A ship in trouble — or a trap dressed as one.', event: 'Uncharted waters. Anything could be waiting.', boss: 'The Warden bars the way onward.', exit: 'The route onward to the next sea.', empty: 'Calm water. A moment to breathe.', start: 'Your current anchorage.' },
  nodeFlavor(n) {
    if (n.id === Game.run.nodeId) return n.type === 'shop' ? 'You are anchored in a friendly harbor. Step ashore to trade and refit.' : 'You are anchored here.';
    return this.NODE_FLAVOR[n.type] || 'Uncharted waters.';
  },
  // one plain sentence on whether (and why not) we can sail there
  nodeStatus(n) {
    const run = Game.run;
    if (n.id === run.nodeId) return null; // the descriptor already reads "You are here"
    if (!this.canTravel(n)) return { t: 'Too far — follow the dotted routes from your position.', c: COL.dkred };
    if (this.overtakenAt(n)) return { t: 'The Armada vanguard will catch you there!', c: COL.dkred };
    if (n.visited && n.type !== 'shop') return { t: 'Visited before — only quiet water left.', c: COL.inkfade };
    return { t: 'One jump away. Click the island or Set Course.', c: KIT.C.action };
  },
  drawNotePanel(ctx, run) {
    const n = run.map.nodes[this._selId] || run.map.nodes[run.nodeId];
    this._noteId = n.id;
    const isCur = n.id === run.nodeId, seen = n.visited && !isCur && n.type !== 'start';
    const P = this.L.note;
    const c = KIT.panel(ctx, P, { wood: true, title: isCur ? 'Your Position' : 'Chart Notes' });
    KIT.card(ctx, c);
    const ix = c.x + 16, iw = c.w - 32;
    let y = c.y + 16;
    KIT.text(ctx, n.name || 'Uncharted', { x: ix, y, w: iw, h: 32 }, { size: 25, display: true, align: 'center', fit: 'shrink' }); y += 36;
    KIT.text(ctx, this.nodeDesc(n), { x: ix, y, w: iw, h: 26 }, { size: isCur ? 21 : 18, italic: true, align: 'center', color: this.descColor(n, seen) }); y += 36;
    const vh = Math.round(iw * 9 / 16), vr = { x: ix, y, w: iw, h: vh };
    ctx.save(); ctx.beginPath(); ctx.rect(vr.x, vr.y, vr.w, vr.h); ctx.clip();
    if (!this.drawCoverArt(ctx, this.nodeVig(n.type), vr.x, vr.y, vr.w, vr.h)) { ctx.fillStyle = 'rgba(60,44,24,0.3)'; ctx.fillRect(vr.x, vr.y, vr.w, vr.h); }
    ctx.restore();
    ctx.strokeStyle = COL.brassdk; ctx.lineWidth = 2; ctx.strokeRect(vr.x, vr.y, vr.w, vr.h); ctx.lineWidth = 1;
    y += vh + 18;
    const f = KIT.text(ctx, this.nodeFlavor(n), { x: ix, y, w: iw, h: 104 }, { size: 18, italic: true, color: COL.inkmd, fit: 'wrap', valign: 'top', lineGap: 6, maxLines: 4 });
    y = Math.round(f.bottom) + 14;
    const st = this.nodeStatus(n);
    if (st) { const s2 = KIT.text(ctx, st.t, { x: ix, y, w: iw, h: 52 }, { size: 18, color: st.c, fit: 'wrap', valign: 'top', lineGap: 5, maxLines: 2 }); y = Math.round(s2.bottom) + 16; }
    else y += 4;
    // the lookout's report: live intel about the waters ahead (presentation only)
    const intel = this.rumors(run, DATA.REGIONS[run.region]).filter(e => e.kind === 'intel');
    const bot = c.y + c.h - 16;
    if (intel.length && bot - y > 70) {
      KIT.rule(ctx, ix, y, ix + iw); y += 12;
      KIT.text(ctx, "Lookout's report", { x: ix, y, w: iw, h: 22 }, { size: 16, display: true, color: COL.inkmd }); y += 30;
      for (const e of intel) {
        const lines = TYPE.wrap(ctx, e.text, iw - 14, 16, { italic: true });
        const need = lines.length * 22;
        if (y + need > bot) break;
        ctx.fillStyle = COL.brassdk; ctx.beginPath(); ctx.arc(ix + 3, y + 11, 2.5, 0, 7); ctx.fill();
        KIT.text(ctx, e.text, { x: ix + 14, y, w: iw - 14, h: need }, { size: 16, italic: true, color: COL.inkmd, fit: 'wrap', valign: 'top', lineGap: 6 });
        y += need + 8;
      }
    }
    const myth = this.rumors(run, DATA.REGIONS[run.region]).find(e => e.kind === 'myth');
    if (myth) {
      const lines = TYPE.wrap(ctx, '“' + myth.text + '”', iw, 16, { italic: true }), need = lines.length * 22;
      if (bot - y > need + 52) {
        y += 4; KIT.rule(ctx, ix, y, ix + iw); y += 12;
        KIT.text(ctx, "Sailors' tales", { x: ix, y, w: iw, h: 22 }, { size: 16, display: true, color: COL.inkmd }); y += 30;
        KIT.text(ctx, '“' + myth.text + '”', { x: ix, y, w: iw, h: need }, { size: 16, italic: true, color: COL.inklt, fit: 'wrap', valign: 'top', lineGap: 6 });
      }
    }
    // the action
    const R = this.L.course;
    let label = 'Set Course', on = this.canTravel(n) && !isCur, reason = 'Too far — follow the dotted routes from your position.';
    if (isCur && n.type === 'shop') { label = 'Enter Harbor'; on = true; }
    else if (isCur && n.type === 'boss' && !n.visited) { label = 'Face the Warden'; on = true; }
    else if (isCur) { label = 'You Are Here'; on = false; reason = 'Hover a ringed island on the chart to plan your next jump.'; }
    else if (!on) label = 'Out of Reach';
    KIT.button(ctx, 'map.setcourse', R, label, {
      onClick: () => this.travelOrEnter(n), sound: false, size: 26,
      disabled: !on, reason, onDenied: () => { if (!isCur) { this.msg = reason; this.msgT = 2.5; } },
      tip: on ? [{ t: label + (isCur ? '' : ' for ' + n.name), c: TIP.ink }, { t: isCur ? this.nodeFlavor(n) : 'The Armada advances each time you sail.', c: TIP.body }] : null,
    });
  },
  drawCoverArt(ctx, name, x, y, w, h) { const e = SPR.artEntry(name); if (!e) return false; this.drawCover(ctx, e.img, x, y, w, h); return true; },

  // ---- bottom row: Ship · Decks · the bosun's line · armada pursuit ----
  drawBottom(ctx, run) {
    const L = this.L, ship = Game.ship;
    const nFire = ship.rooms.filter(r => r.fire > 0).length, nLeak = ship.rooms.filter(r => r.leak || r.scupper).length;
    KIT.button(ctx, 'map.ship', L.shipBtn, 'Ship', {
      onClick: () => Game.setScreen('shipmenu', { tab: 0 }), size: 24,
      tip: [{ t: 'Ship', c: TIP.ink }, { t: 'Hearthstone upgrades, loadout and crew. (S)', c: TIP.body }],
    });
    KIT.button(ctx, 'map.decks', L.decksBtn, 'Decks', {
      onClick: () => Game.setScreen('decks'), size: 24, live: !!(nFire || nLeak),
      tip: [{ t: 'Decks', c: TIP.ink }, { t: 'Command the crew below: fight fires, patch leaks, set stations.', c: TIP.body }],
    });
    // the bosun's line: errors say why, hazards point at Decks, otherwise a quiet hint
    const hr = L.hint;
    let line, col = COL.inkfade, italic = true;
    if (this.msgT > 0 && this.msg) { line = this.msg; col = COL.dkred; italic = false; }
    else if (this._sail) { line = 'Under sail for ' + this._sail.node.name + '…'; col = COL.inkmd; }
    else if (nFire || nLeak) { line = (nFire && nLeak ? 'Fire and flooding below decks!' : nFire ? 'Fire below decks!' : 'The ship is taking water!') + ' Open Decks to send the crew.'; col = COL.dkred; italic = false; }
    else line = 'Click a ringed island to set sail. Hover any island to read its chart notes.';
    KIT.text(ctx, line, hr, { size: 20, italic, color: col, fit: 'wrap', maxLines: 2, lineGap: 4 });

    const P = L.threat, ti = this.threatInfo(run);
    this._threat = ti;
    KIT.panel(ctx, P);
    KIT.text(ctx, 'Armada Pursuit', { x: P.x + 20, y: P.y + 8, w: 300, h: 28 }, { size: 21, display: true, color: COL.inkdk });
    KIT.text(ctx, ti.word, { x: P.x + 20, y: P.y + 38, w: 330, h: 24 }, { size: 17, italic: true, color: ti.color, fit: 'shrink' });
    const mr = { x: P.x + 368, y: P.y + 24, w: P.w - 368 - 22, h: 24 }, segs = 12, g = 4, sw = (mr.w - g * (segs - 1)) / segs;
    const shown = KIT.anim('map.threat', ti.frac, 6), on = shown * segs;
    for (let i = 0; i < segs; i++) {
      const sx = mr.x + i * (sw + g), a = U.clamp(on - i, 0, 1);
      ctx.fillStyle = 'rgba(60,40,24,0.22)'; ctx.fillRect(sx, mr.y, sw, mr.h);
      if (a > 0) { ctx.globalAlpha = a; ctx.fillStyle = ti.color; ctx.fillRect(sx, mr.y, sw, mr.h); ctx.globalAlpha = 1; }
      ctx.strokeStyle = 'rgba(60,38,14,0.55)'; ctx.strokeRect(sx + 0.5, mr.y + 0.5, sw - 1, mr.h - 1);
    }
    if (KIT.hovered('map.threat', P)) KIT.tip([
      { t: 'Armada Pursuit: ' + ti.word, c: TIP.ink },
      { t: 'The Armada advances every time you sail. Sailing west keeps you ahead; sailing sideways or back lets it close in.', c: TIP.body },
      { t: 'If its front reaches the island you sail to, the vanguard runs you down.', c: TIP.danger },
    ], Game.mouse.x, Game.mouse.y);
  },

  // ---- Captain's Log: a modal parchment page (click anywhere or Close) ----
  drawJournal(ctx, run) {
    ctx.fillStyle = 'rgba(10,7,4,0.62)'; ctx.fillRect(0, 0, 1920, 1080);
    KIT.blockBelow();
    KIT.reg('map.log.close', { x: 0, y: 0, w: 1920, h: 1080 }, { onClick: () => { this._logOpen = false; } });
    const P = { x: 510, y: 150, w: 900, h: 780 };
    const c = KIT.panel(ctx, P, { wood: true, title: "Captain's Log" });
    KIT.text(ctx, 'Day ' + (run.day || 1), { x: P.x + P.w - 216, y: P.y + 2, w: 200, h: 36 }, { size: 18, italic: true, align: 'right', color: KIT.C.onWoodMuted, shadow: 'rgba(16,9,3,0.85)', shadowDx: 1, shadowDy: 1 });
    const card = { x: c.x, y: c.y, w: c.w, h: c.h - 84 };
    KIT.card(ctx, card);
    const ix = card.x + 28, iw = card.w - 56, dayW = 96, top = card.y + 24, bot = card.y + card.h - 20;
    const log = run.log || [], rows = [];
    let need = 0;
    for (let i = log.length - 1; i >= 0; i--) { // newest entries that fit, shown oldest -> newest
      const lines = TYPE.wrap(ctx, log[i].text, iw - dayW, 18, { italic: true });
      const h = lines.length * 25 + 12;
      if (need + h > bot - top) break;
      need += h; rows.unshift({ e: log[i], h });
    }
    let y = top;
    if (!rows.length) KIT.text(ctx, 'The log is empty — your voyage has only just begun.', { x: ix, y, w: iw, h: 30 }, { size: 19, italic: true, color: COL.inkfade, align: 'center' });
    rows.forEach((r, i) => {
      KIT.text(ctx, 'Day ' + r.e.day, { x: ix, y, w: dayW - 12, h: 22 }, { size: 17, display: true, color: COL.brassdk, valign: 'top' });
      KIT.text(ctx, r.e.text, { x: ix + dayW, y, w: iw - dayW, h: r.h - 12 }, { size: 18, italic: true, color: COL.inkmd, fit: 'wrap', valign: 'top', lineGap: 7 });
      y += r.h;
      if (i < rows.length - 1) KIT.rule(ctx, ix, y - 7, ix + iw, 0.22);
    });
    KIT.button(ctx, 'map.log.done', { x: P.x + P.w / 2 - 110, y: P.y + P.h - 84, w: 220, h: 60 }, 'Close', {
      onClick: () => { this._logOpen = false; }, size: 22, variant: 'wood',
    });
  },

  // ---------------- chart drawing ----------------
  // chart backdrop (per-region AI chart, else a procedural parchment sea) into the chart rect
  drawChartBg(ctx, run, reg, x, y, w, h) {
    const regParch = SPR.artEntry('parchment_r' + (run.region + 1));
    if (regParch) { this.drawCover(ctx, regParch.img, x, y, w, h); return; }
    ctx.fillStyle = COL.paper; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(159,176,166,0.22)'; ctx.fillRect(x + 6, y + 8, w - 12, h - 16);
    ctx.fillStyle = 'rgba(120,98,52,0.10)';
    for (let i = 0; i < 60; i++) { const wx = x + ((i * 71) % (w - 16)) + 8, wy = y + ((i * 113) % (h - 16)) + 8; ctx.fillRect(wx, wy, 5, 1); }
    this.compassRose(ctx, x + 60, y + 70, 36);
  },
  // chart foreground in CHART coords: armada wash + routes + beacons (hover lift/glow)
  drawChartFg(ctx, run, hov) {
    const C = CHART, h = C.py1 - C.py0;
    const fx = this.frontX();
    if (fx > C.px0 + 4) {
      ctx.fillStyle = 'rgba(168,40,40,0.16)';
      ctx.fillRect(C.px0 - 40, C.py0 - 60, Math.min(fx, C.px1) - C.px0 + 40, h + 120);
      ctx.fillStyle = 'rgba(124,28,40,0.5)';
      for (let yy = C.py0 + 12; yy < C.py1 - 6; yy += 26) { const sk = SPR.icon('skull'); if (sk) ctx.drawImage(sk, Math.min(fx, C.px1 - 8) - 6, yy); }
    }
    // routes: paper halo, then ink dashes tinted blue (safe) / red (toward danger)
    const nodes = run.map.nodes, cur = nodes[run.nodeId];
    const danger = t => t === 'fight' || t === 'elite' || t === 'boss';
    const plan = this._sail ? this._sail.node : (hov && this.canTravel(hov) && hov.id !== cur.id ? hov : null);
    for (const n of nodes) {
      for (const eid of n.edges) {
        if (eid < n.id) continue;
        const m = nodes[eid];
        ctx.strokeStyle = 'rgba(236,220,182,0.8)'; ctx.lineWidth = 3;
        this.dashLine(ctx, n.x, n.y, m.x, m.y);
        const hot = danger(n.type) || danger(m.type) || n.col <= this.frontCol() || m.col <= this.frontCol();
        ctx.strokeStyle = hot ? 'rgba(150,42,30,0.9)' : 'rgba(40,70,100,0.85)'; ctx.lineWidth = 1.4;
        this.dashLine(ctx, n.x, n.y, m.x, m.y);
      }
    }
    if (plan) { // the planned leg, inked bold
      ctx.strokeStyle = 'rgba(246,236,210,0.9)'; ctx.lineWidth = 4.2; this.dashLine(ctx, cur.x, cur.y, plan.x, plan.y);
      ctx.strokeStyle = KIT.C.action; ctx.lineWidth = 2.2; this.dashLine(ctx, cur.x, cur.y, plan.x, plan.y);
    }
    ctx.lineWidth = 1;
    for (const n of nodes) {
      const lift = KIT.anim('map.node.' + n.id + ':lift', hov && hov.id === n.id ? 1 : 0, 16);
      this.drawNode(ctx, n, this.canTravel(n), n.visited && n.type !== 'start' && n.id !== run.nodeId, run, lift);
    }
  },
  // eased token position while sailing (chart coords)
  sailPos() {
    const s = this._sail, k = U.clamp(s.t / s.dur, 0, 1), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    return { x: U.lerp(s.from.x, s.node.x, e), y: U.lerp(s.from.y, s.node.y, e), k, e };
  },
  // the Dawnchaser miniature (native 1x art in screen space), bobbing; a wake trails it under sail
  drawToken(ctx, run) {
    const cur = run.map.nodes[run.nodeId], sail = this._sail;
    const at = sail ? this.sailPos() : cur;
    const r = this.tokenRect(at.x, at.y);
    const flip = sail ? sail.node.x < sail.from.x : false;
    const bob = Math.sin(Game.time * 2.2) * (sail ? 2.5 : 1.5);
    const cx = r.x + r.w / 2, wl = r.y + r.h - 6; // waterline
    if (sail) { // wake: foam crescents strung back along the route
      const dx = sail.node.x - sail.from.x, dy = sail.node.y - sail.from.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      for (let i = 1; i <= 6; i++) {
        const back = i * 14, a = (0.5 - i * 0.07) * Math.min(1, at.k * 6);
        if (a <= 0) continue;
        const wx = cx - ux * (back + 20), wy = wl - uy * back + 2;
        ctx.strokeStyle = 'rgba(250,246,232,' + a.toFixed(3) + ')'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(wx, wy, 6 + i * 2.2, 2 + i * 0.5, Math.atan2(uy, ux), 0, Math.PI * 2); ctx.stroke();
      }
      ctx.lineWidth = 1;
    }
    ctx.fillStyle = 'rgba(58,40,18,0.35)';
    ctx.beginPath(); ctx.ellipse(cx, wl + 2, 40, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(cx, r.y + r.h / 2 + bob);
    if (sail) ctx.rotate(Math.sin(Game.time * 3.1) * 0.04);
    if (flip) ctx.scale(-1, 1);
    if (!SPR.drawArt(ctx, 'mini_dawnchaser', -48, -31, 96, 62)) {
      const ms = SPR.miniShip(COL.sail); ctx.drawImage(ms, -ms.width, -ms.height, ms.width * 2, ms.height * 2);
    }
    ctx.restore();
  },
  // chart medallion: brass-ringed coin, type color, engraved emblem (lifts + glows when hovered)
  drawNode(ctx, n, reachable, seen, run, lift) {
    lift = lift || 0;
    const r = this.nodeRadius(n), TAU = Math.PI * 2, y = n.y - lift * 1.6;
    if (n.col <= this.frontCol() && n.type !== 'start') {
      ctx.fillStyle = 'rgba(150,42,30,0.4)';
      ctx.beginPath(); ctx.arc(n.x, n.y, r + 4, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = 'rgba(40,28,12,' + (0.35 - lift * 0.12).toFixed(3) + ')';
    ctx.beginPath(); ctx.ellipse(n.x, n.y + r - 1, r * (0.9 + lift * 0.15), 2.5, 0, 0, TAU); ctx.fill();
    if (lift > 0.01) { // warm glow
      const g = ctx.createRadialGradient(n.x, y, r * 0.6, n.x, y, r + 8);
      g.addColorStop(0, 'rgba(255,226,150,' + (0.55 * lift).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,226,150,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, y, r + 8, 0, TAU); ctx.fill();
    }
    ctx.save(); ctx.translate(n.x, y); const sc = 1 + lift * 0.12; ctx.scale(sc, sc); ctx.translate(-n.x, -y);
    const col = seen ? '#9c8a64' : (MapScreen.NODE_COL[n.type] || MapScreen.NODE_COL.event);
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(n.x, y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.20)'; ctx.beginPath(); ctx.arc(n.x, y, r - 1, 0, TAU); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(n.x, y - 0.6, r - 2.5, 0, TAU); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = COL.brass; ctx.beginPath(); ctx.arc(n.x, y, r, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = COL.brassdk; ctx.beginPath(); ctx.arc(n.x, y, r + 1, 0, TAU); ctx.stroke();
    this.drawNodeEmblem(ctx, n.x, y, n.type, false);
    if (seen && n.type !== 'shop' && n.type !== 'exit' && n.type !== 'boss') {
      ctx.strokeStyle = 'rgba(245,238,214,0.9)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(n.x - 2.5, y); ctx.lineTo(n.x - 0.5, y + 2.5); ctx.lineTo(n.x + 3, y - 2.5); ctx.stroke();
    }
    ctx.restore();
    if (reachable) { // pulsing green ring = in reach
      ctx.strokeStyle = 'rgba(70,170,110,' + (0.5 + 0.4 * Math.abs(Math.sin(Game.time * 3))).toFixed(2) + ')';
      ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(n.x, y, r + 4 + lift, 0, TAU); ctx.stroke();
    }
    ctx.lineWidth = 1;
  },
  // a one-row legend along the chart's empty southern margin, in the chart's own vocabulary
  drawLegend(ctx, r) {
    ctx.fillStyle = 'rgba(236,220,182,0.9)'; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = COL.brassdk; ctx.lineWidth = 1.5; ctx.strokeRect(r.x + 0.75, r.y + 0.75, r.w - 1.5, r.h - 1.5); ctx.lineWidth = 1;
    let x = r.x + 16;
    const cy = r.y + r.h / 2;
    ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    for (const it of this.legendItems()) {
      const cx = x + 10;
      if (it.type === 'reach') {
        ctx.fillStyle = MapScreen.NODE_COL.empty; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(70,170,110,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 11, 0, 7); ctx.stroke();
      } else {
        ctx.fillStyle = MapScreen.NODE_COL[it.type] || MapScreen.NODE_COL.event; ctx.beginPath(); ctx.arc(cx, cy, 9, 0, 7); ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = COL.brass; ctx.beginPath(); ctx.arc(cx, cy, 9, 0, 7); ctx.stroke();
        ctx.save(); ctx.translate(cx, cy); ctx.scale(1.4, 1.4); ctx.translate(-cx, -cy); this.drawNodeEmblem(ctx, cx, cy, it.type, false); ctx.restore();
      }
      ctx.lineWidth = 1;
      const tw = TYPE.width(ctx, it.label, 16, { italic: true });
      KIT.text(ctx, it.label, { x: x + 28, y: r.y, w: tw + 4, h: r.h }, { size: 16, italic: true, color: COL.inkdk });
      x += 28 + tw + 26;
    }
    ctx.restore();
  },

  // big anchor crest engraved on the region medallion
  drawNodeEmblemBig(ctx, x, y, type, R) {
    ctx.save(); ctx.translate(x, y); const s = R / 3.5; ctx.scale(s, s);
    ctx.lineWidth = 1.3 / s; ctx.lineCap = 'round'; ctx.strokeStyle = COL.woodfrdk; ctx.fillStyle = COL.woodfrdk;
    ctx.beginPath(); ctx.arc(0, -2.5, 1.3, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -1.5); ctx.lineTo(0, 3); ctx.moveTo(-2.5, 1); ctx.lineTo(2.5, 1);
    ctx.moveTo(-3, 2.5); ctx.quadraticCurveTo(0, 4.5, 3, 2.5); ctx.stroke();
    ctx.restore();
  },
  cogHD(ctx, cx, cy, R, col) {
    ctx.save(); ctx.translate(cx, cy);
    ctx.fillStyle = col || COL.inkdk; for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-R * 0.2, -R, R * 0.4, R * 0.45); }
    ctx.beginPath(); ctx.arc(0, 0, R * 0.75, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, R * 0.3, 0, 7); ctx.fillStyle = COL.paper; ctx.fill();
    ctx.restore();
  },

  // region-flavored descriptor under a place name (fight/elite/harbor/warden stay consistent)
  nodeDesc(n) {
    if (n.id === Game.run.nodeId) return 'You are here';
    const feat = DATA.REGION_FEATURE && DATA.REGION_FEATURE[Game.run.region];
    if (feat && feat[n.type]) return feat[n.type];
    return DATA.NODE_DESC[n.type] || 'Uncharted';
  },
  descColor(n, seen) {
    if (n.id === Game.run.nodeId) return '#1f5f5b'; // R14a: dark teal ink — the cyan was ~1.4:1 on parchment
    if (seen) return COL.inkfade;
    return { shop: COL.dkgreen, fight: COL.dkred, elite: COL.dkred, distress: COL.orange, boss: COL.dkpurple, event: COL.inklt, exit: COL.brassdk }[n.type] || COL.inkmd;
  },

  // tiny inked chart symbols per node type
  drawNodeEmblem(ctx, x, y, type, seen) {
    if (seen && type !== 'shop' && type !== 'exit' && type !== 'boss') return;
    ctx.save();
    ctx.strokeStyle = 'rgba(245,238,214,0.95)'; ctx.fillStyle = 'rgba(245,238,214,0.95)';
    ctx.lineWidth = 1; ctx.lineCap = 'round';
    if (type === 'shop') { // anchor
      ctx.beginPath(); ctx.arc(x, y - 2.5, 1.3, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - 1.5); ctx.lineTo(x, y + 3); ctx.moveTo(x - 2.5, y + 1); ctx.lineTo(x + 2.5, y + 1);
      ctx.moveTo(x - 3, y + 2.5); ctx.quadraticCurveTo(x, y + 4.5, x + 3, y + 2.5); ctx.stroke();
    } else if (type === 'fight' || type === 'elite') { // crossed cannons
      ctx.beginPath(); ctx.moveTo(x - 3, y - 3); ctx.lineTo(x + 3, y + 3); ctx.moveTo(x + 3, y - 3); ctx.lineTo(x - 3, y + 3); ctx.stroke();
      if (type === 'elite') { ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI * 2); ctx.fill(); }
    } else if (type === 'distress') { // flag
      ctx.beginPath(); ctx.moveTo(x - 1.5, y + 3.5); ctx.lineTo(x - 1.5, y - 3.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 1.5, y - 3.5); ctx.lineTo(x + 3, y - 2); ctx.lineTo(x - 1.5, y - 0.5); ctx.fill();
    } else if (type === 'boss') { // crown / crest
      ctx.beginPath(); ctx.moveTo(x - 3.5, y + 2.5); ctx.lineTo(x - 3.5, y - 1); ctx.lineTo(x - 1.5, y + 0.5); ctx.lineTo(x, y - 2.5);
      ctx.lineTo(x + 1.5, y + 0.5); ctx.lineTo(x + 3.5, y - 1); ctx.lineTo(x + 3.5, y + 2.5); ctx.closePath(); ctx.stroke();
    } else if (type === 'exit') { // arrow onward
      ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x + 3, y); ctx.moveTo(x + 0.5, y - 2.5); ctx.lineTo(x + 3.5, y); ctx.lineTo(x + 0.5, y + 2.5); ctx.stroke();
    } else if (type === 'event') { // unknown isle: small diamond
      ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x + 3, y); ctx.lineTo(x, y + 3); ctx.lineTo(x - 3, y); ctx.closePath(); ctx.stroke();
    } else if (type === 'empty') { // calm: dot
      ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  },

  // mix of LIVE true intel (from the current chart) + authored regional MYTH (flavor)
  rumors(run, reg) {
    const out = [];
    const nodes = run.map.nodes, cur = nodes[run.nodeId];
    const reach = (cur.edges || []).map(id => nodes[id]).filter(n => n && (!n.visited || n.type === 'shop'));
    const types = new Set(reach.map(n => n.type));
    const intel = {
      shop: 'A friendly anchorage lies ahead - a place to refit and trade.',
      fight: 'Hostile sails stand across the route ahead.',
      elite: 'A heavy warship prowls the next waters.',
      distress: 'A distress flag flutters somewhere ahead.',
      event: 'An uncharted island lies along the route.',
      exit: 'Clear water and the way onward lie ahead.',
      boss: "The Warden's dreadnought waits at the city mouth.",
    };
    for (const t of ['boss', 'exit', 'shop', 'elite', 'fight', 'distress', 'event']) {
      if (types.has(t) && intel[t]) { out.push({ text: intel[t], kind: 'intel' }); if (out.length >= 2) break; }
    }
    // a hazard / who-rules line
    const haz = (reg.hazards || []).filter(h => h[0] !== 'none').sort((a, b) => b[1] - a[1])[0];
    const hazTxt = { storm: 'The glass is falling; storms ride these waters.', fog: 'Fog gathers thick enough to lose a fleet in.', reef: 'Reefs and coral foul the shallows here.', kraken: 'Sailors swear something vast moves below.', whirlpool: 'Whirlpools churn the straits ahead.' };
    if (haz && hazTxt[haz[0]]) out.push({ text: hazTxt[haz[0]], kind: 'intel' });
    const race = DATA.RACES[reg.race]; if (race) out.push({ text: race.name + ' hold these waters.', kind: 'intel' });
    // authored myths, rotated by position so they change as you sail (stable per node)
    const pool = (DATA.REGION_RUMORS && DATA.REGION_RUMORS[run.region]) || [];
    if (pool.length) {
      const base = ((run.nodeId * 7 + (run.day || 1) * 3) >>> 0) % pool.length;
      out.push({ text: pool[base], kind: 'myth', mythIdx: base });
      out.push({ text: pool[(base + 1) % pool.length], kind: 'myth', mythIdx: (base + 1) % pool.length });
    }
    return out;
  },

  // node disc colors (the color reinforces the inked emblem)
  NODE_COL: {
    fight: '#a83232', elite: '#6e1622', shop: '#2e8b4f', distress: '#e08030',
    boss: '#8a3aa0', empty: '#b8a878', exit: '#caa24a', start: '#efe6cc', event: '#4a7ab8',
  },

  drawCover(ctx, img, x, y, w, h) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    const s = Math.max(w / iw, h / ih), dw = iw * s, dh = ih * s;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  },

  compassRose(ctx, x, y, r) {
    ctx.save();
    ctx.strokeStyle = 'rgba(125,98,51,0.6)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(138,109,47,0.55)';
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + 3, y); ctx.lineTo(x, y + r); ctx.lineTo(x - 3, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(202,162,74,0.6)';
    ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x, y - 3); ctx.lineTo(x + r, y); ctx.lineTo(x, y + 3); ctx.closePath(); ctx.fill();
    TYPE.drawCentered(ctx, 'N', x, y - r - 16, 14, 'rgba(91,67,38,0.7)');
    ctx.restore();
  },

  dashLine(ctx, x1, y1, x2, y2) {
    const d = U.dist(x1, y1, x2, y2);
    const steps = Math.floor(d / 6);
    for (let i = 0; i < steps; i += 2) {
      const t1 = i / steps, t2 = Math.min(1, (i + 1) / steps);
      ctx.beginPath();
      ctx.moveTo(U.lerp(x1, x2, t1), U.lerp(y1, y2, t1));
      ctx.lineTo(U.lerp(x1, x2, t2), U.lerp(y1, y2, t2));
      ctx.stroke();
    }
  },

  frontCol() { return Math.floor(Game.run.front); },
  frontX() {
    const f = Game.run.front;
    if (f < 0) return 0;
    const cols = (Game.run.map && Game.run.map.cols) || 6;
    return CHART.NX0 + ((f + 0.5) / cols) * (CHART.NX1 - CHART.NX0);
  },
};

// ============ DECKS (FTL-style ship management between battles) ============
// Full crew control while sailing: move sailors, fight fires, patch leaks,
// repair systems, open scuppers. The sea does not pause for you - fires
// spread, water rises, and sailors can die out here.
const DeckScreen = {
  // Stage 7: the decks screen IS the HD combat chrome in "underway" mode (enemy + firing removed,
  // station controls + damage-control added). Always HD — the classic 512x288 decks layout was retired.
  designW: 1920, designH: 1080,
  enter() {
    const v = Object.create(Battle.prototype); // borrow the battle renderer + logic for our ship
    v.p = Game.ship;
    v.e = { crew: [], rooms: [], weapons: [], doors: [], doorOpen: [], alloc: {}, rw: 0, rh: 0, veilT: 0, sysLv: {}, hull: 1, hullMax: 1, name: '', wards: { layers: 0 } };
    v.time = Game.time;
    v.selCrew = new Set();
    v.selWeapon = -1; v.gateMode = false; v.hexMode = false; v.songMode = false;
    v.particles = []; v.projectiles = []; v.logs = []; v.ripples = []; v.beams = []; v.sweeps = [];
    v.state = 'fight'; v.banner = null; v.paused = false;
    v.hazard = 'none'; v.shake = 0; v.tentacleT = 0;
    v.surrenderOffer = null;
    v._deckMsg = null; v._deckMsgT = 0;
    this.v = v;
    CombatScreen._deckV = v; // route the shared HD renderer / click handler at our ship
  },
  update(dt) {
    this.v.time += dt;
    Game.ship.tick(dt, null); // the sea doesn't pause: fires spread, water rises
    if (this.v._deckMsgT > 0) this.v._deckMsgT -= dt;
    Game.checkDoom();
  },
  click(x, y, btn) { CombatScreen.hdClick(x, y, btn); },
  mouseup(x, y, btn) { CombatScreen.hdUp(x, y, btn); },
  key(k) {
    const v = this.v;
    if (k === 'Escape') { if (v.selCrew.size) v.selCrew.clear(); else { CombatScreen._deckV = null; Game.setScreen('map'); } }
    else if (k === 'r' || k === 'R') { if (v.returnStations()) { v._deckMsg = 'ALL HANDS TO STATIONS!'; v._deckMsgT = 2; AUDIO.sfx('click'); } }
    else if (k === 't' || k === 'T') { if (v.setStations()) { v._deckMsg = 'STATIONS SAVED.'; v._deckMsgT = 2; AUDIO.sfx('click'); } }
  },
  render(ctx) { CombatScreen.renderHD(ctx); }, // the shared HD chrome in deck mode (CombatScreen._deckV is set)
};
