// MYTHRIL TIDE - map.js : ocean chart generation + map screen
'use strict';

// ---- shared chart geometry (graphics overhaul) ----
// The chart panel lives on the LEFT; the captain's journal panel sits to its right.
// Nodes are confined to NX0..NX1 / NY0..NY1 so they never collide with the journal.
const CHART = {
  px0: 24, py0: 24, px1: 488, py1: 264,      // chart opening = inside a uniform 24px wood border
  NX0: 46, NX1: 458, NY0: 54, NY1: 242,      // node placement bounds (inset from the border)
  lx0: 356, ly0: 30, lw: 126, lh: 86,        // compact Captain's Log overlay (top-right corner)
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
    // NOTE: labels are laid out per-frame at draw time (MapScreen.drawNodeLabels) over only the
    // SHOWN set, nudging labels not nodes — so beacon spacing set above is never disturbed.
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
  // only the SHOWN set (MapScreen.drawNodeLabels), nudging the LABEL boxes, never the node positions.
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

const MapScreen = {
  enter() {
    AUDIO.playMap();
    this.msg = null;
    this.msgT = 0;
    this._selId = null;
    this._logOpen = false;
  },
  update(dt) {
    // the sea never pauses: fires burn, water rises, crew repair & heal
    Game.ship.tick(dt, null);
    if (this.msgT > 0) this.msgT -= dt;
    Game.checkDoom();
  },

  nodeAt(x, y) {
    for (const n of Game.run.map.nodes) {
      if (U.dist(x, y, n.x, n.y) < 13) return n;
    }
    return null;
  },
  canTravel(n) {
    if (Game.run.cheats && Game.run.cheats.teleport && n.id !== Game.run.nodeId) return true; // magic teleport
    const cur = Game.run.map.nodes[Game.run.nodeId];
    return cur.edges.includes(n.id);
  },

  designW() { return 1920; },
  designH() { return 1080; },

  // ============ HD MAP (1920x1080, combat-style chrome) ============
  render(ctx) { this.renderHD(ctx); },

  // shared HD chrome helpers (parchment fill / panel / button), built per-frame
  _hdHelpers(ctx) {
    const we = SPR.artEntry('ui_wood'), pe = SPR.artEntry('ui_parchment');
    const woodPat = we ? ctx.createPattern(we.img, 'repeat') : null;
    const parchPat = pe ? ctx.createPattern(pe.img, 'repeat') : null;
    const fillParch = (x, y, w, h) => {
      if (parchPat) { ctx.fillStyle = parchPat; ctx.fillRect(x, y, w, h); ctx.fillStyle = 'rgba(244,232,205,0.30)'; ctx.fillRect(x, y, w, h); }
      else { ctx.fillStyle = COL.paper; ctx.fillRect(x, y, w, h); }
    };
    // EXACTLY the combat frame: border-only ui_panel_frame 9-slice, si=120 di=24, drawn 3px proud.
    const hdFrame = (x, y, w, h) => { if (!UI.draw9(ctx, 'ui_panel_frame', x - 3, y - 3, w + 6, h + 6, 120, 24)) this.frame(ctx, x, y, w, h); };
    const pPanel = (x, y, w, h) => { fillParch(x, y, w, h); hdFrame(x, y, w, h); };
    const hbtn = (x, y, w, h, label, id, on) => {
      const hov = Game.mouse.x >= x && Game.mouse.x < x + w && Game.mouse.y >= y && Game.mouse.y < y + h;
      if (hov) Game.hot = true;
      fillParch(x, y, w, h);
      if (hov) { ctx.fillStyle = 'rgba(255,236,190,0.32)'; ctx.fillRect(x, y, w, h); }
      hdFrame(x, y, w, h);
      if (label) TYPE.drawCentered(ctx, label, x + w / 2, y + h / 2 - 10, 19, on === false ? COL.inkfade : COL.inkdk, { display: true });
      if (id) this._hud[id] = { x, y, w, h };
    };
    return { woodPat, parchPat, fillParch, pPanel, hbtn, hdFrame };
  },

  renderHD(ctx) {
    const run = Game.run, reg = DATA.REGIONS[run.region];
    this._hud = {};
    const H = this._hdHelpers(ctx);
    // dark walnut surround (matches combat exactly)
    if (H.woodPat) { ctx.fillStyle = H.woodPat; ctx.fillRect(0, 0, 1920, 1080); ctx.fillStyle = 'rgba(14,9,4,0.55)'; ctx.fillRect(0, 0, 1920, 1080); }
    else { ctx.fillStyle = COL.woodfrdk; ctx.fillRect(0, 0, 1920, 1080); }

    // ---------- TOP BAR ---------- (16px breathing room between every panel)
    H.pPanel(16, 14, 446, 72);
    // brass region medallion + anchor crest
    ctx.fillStyle = COL.brassdk; ctx.beginPath(); ctx.arc(54, 50, 25, 0, 7); ctx.fill();
    ctx.fillStyle = COL.brass; ctx.beginPath(); ctx.arc(54, 50, 21, 0, 7); ctx.fill();
    ctx.fillStyle = COL.brasshi; ctx.beginPath(); ctx.arc(51, 47, 17, 0, 7); ctx.fill();
    this.drawNodeEmblemBig(ctx, 54, 50, 'shop', 16);
    TYPE.draw(ctx, reg.name.toUpperCase(), 90, 24, 24, COL.inkdk, { display: true });
    { const lines = TYPE.wrap(ctx, reg.desc, 354, 14, { italic: true });
      for (let i = 0; i < Math.min(2, lines.length); i++) TYPE.draw(ctx, lines[i], 90, 52 + i * 16, 14, COL.inkmd, { italic: true }); }
    // centered resource frame
    const RW = 600, RX = 960 - RW / 2, third = RW / 3;
    H.pPanel(RX, 14, RW, 72);
    UI.resTriadHD(ctx, RX, 14, RW, run);
    // top-right buttons
    H.hbtn(1456, 14, 196, 72, "Captain's Log", 'log');
    H.hbtn(1668, 14, 148, 72, 'Menu', 'menu');
    H.hbtn(1832, 14, 72, 72, '', 'gear'); this.cogHD(ctx, 1868, 50, 20);

    // ---------- CENTER CHART ---------- (gaps to the side panels + bars)
    const CV = { x: 336, y: 104, w: 1252, h: 869 };
    ctx.save(); ctx.beginPath(); ctx.rect(CV.x, CV.y, CV.w, CV.h); ctx.clip();
    this.drawChartBg(ctx, run, reg, CV.x, CV.y, CV.w, CV.h);
    // composite the route web (CHART coords) fit-to-width, vertically centered
    const CW = CHART.px1 - CHART.px0, CHt = CHART.py1 - CHART.py0;
    const S = CV.w / CW, tx = CV.x - CHART.px0 * S, ty = CV.y + (CV.h - CHt * S) / 2 - CHART.py0 * S;
    this._cv = { tx, ty, S, CV };
    ctx.save();
    ctx.translate(tx, ty); ctx.scale(S, S);
    const sm = Game.mouse;
    Game.mouse = { x: (sm.x - tx) / S, y: (sm.y - ty) / S };
    this.drawChartFg(ctx, run);
    Game.mouse = sm;
    ctx.restore();
    ctx.restore();
    H.hdFrame(CV.x, CV.y, CV.w, CV.h); // ornate frame ON TOP of the chart edges (brass corners visible)
    // place labels + legend in screen space
    this.drawHdLabels(ctx, run);
    this.drawLegend(ctx, CV);

    // ---------- LEFT + RIGHT columns + BOTTOM bar ----------
    this.drawShipCrewColumn(ctx, run, H);
    this.drawNodePanel(ctx, run, H);
    this.drawHdBottom(ctx, run, H);

    if (this._hov) this._selId = this._hov.id;
    if (this.msgT > 0 && this.msg) TYPE.drawCentered(ctx, this.msg, CV.x + CV.w / 2, CV.y + CV.h - 30, 22, COL.dkred, { display: true, shadow: COL.paperhi, outline: COL.black });
    if (this._logOpen) this.drawHdJournal(ctx, run, H);
  },
  // Captain's Log overlay (HD): a centered parchment page listing the voyage log
  drawHdJournal(ctx, run, H) {
    ctx.fillStyle = 'rgba(10,7,3,0.55)'; ctx.fillRect(0, 0, 1920, 1080);
    const w = 900, h = 720, x = 960 - w / 2, y = 540 - h / 2;
    H.pPanel(x, y, w, h);
    TYPE.drawCentered(ctx, "CAPTAIN'S LOG", 960, y + 26, 28, COL.inkdk, { display: true });
    ctx.strokeStyle = COL.brassdk; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 40, y + 66); ctx.lineTo(x + w - 40, y + 66); ctx.stroke(); ctx.lineWidth = 1;
    const log = (run.log || []).slice(-16);
    let yy = y + 84;
    if (!log.length) TYPE.drawCentered(ctx, 'The log is empty — your voyage has only just begun.', 960, yy + 8, 17, COL.inkfade, { italic: true });
    for (const e of log) {
      TYPE.draw(ctx, 'Day ' + e.day, x + 46, yy, 16, COL.brassdk, { display: true });
      const lines = TYPE.wrap(ctx, e.text, w - 170, 16, { italic: true });
      let ly = yy; for (const l of lines) { TYPE.draw(ctx, l, x + 126, ly, 16, COL.inkmd, { italic: true }); ly += 21; }
      yy = Math.max(yy + 28, ly + 8);
      if (yy > y + h - 56) break;
    }
    TYPE.drawCentered(ctx, 'click anywhere to close', 960, y + h - 30, 14, COL.inkfade, { italic: true });
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
  cogHD(ctx, cx, cy, R) {
    ctx.save(); ctx.translate(cx, cy);
    ctx.fillStyle = COL.inkdk; for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-4, -R, 8, 9); }
    ctx.beginPath(); ctx.arc(0, 0, R - 5, 0, 7); ctx.fillStyle = COL.inkdk; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fillStyle = COL.paper; ctx.fill();
    ctx.restore();
  },
  // place-name plaques at transformed node positions (current + reachable + hovered); de-collided
  // and recorded in _labelRects (screen-space) so they never overlap and stay on the chart.
  drawHdLabels(ctx, run) {
    const cv = this._cv; if (!cv) { this._labelRects = []; return; }
    this._labelRects = [];
    const shown = new Map();
    const cur = run.map.nodes[run.nodeId]; shown.set(cur.id, cur);
    for (const n of run.map.nodes) if (this.canTravel(n) && n.id !== cur.id) shown.set(n.id, n);
    if (this._hov) shown.set(this._hov.id, this._hov);
    const boxes = [];
    for (const n of shown.values()) {
      const tw = Math.max(TYPE.width(ctx, n.name || '', 18, { display: true }), TYPE.width(ctx, this.nodeDesc(n), 14, { italic: true })) + 18;
      const cx = U.clamp(cv.tx + n.x * cv.S, cv.CV.x + tw / 2 + 6, cv.CV.x + cv.CV.w - tw / 2 - 6);
      boxes.push({ n, cx, y: cv.ty + n.y * cv.S + 18, tw, h: 44 });
    }
    for (let it = 0; it < 30; it++) { let moved = false;
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const A = boxes[i], B = boxes[j];
        if (Math.abs(A.cx - B.cx) * 2 < (A.tw + B.tw) && Math.abs(A.y - B.y) < A.h + 2) {
          const push = (A.h + 2 - Math.abs(A.y - B.y)) / 2 + 0.5;
          if (A.y <= B.y) { A.y -= push; B.y += push; } else { A.y += push; B.y -= push; } moved = true;
        }
      }
      if (!moved) break;
    }
    for (const b of boxes) {
      b.y = U.clamp(b.y, cv.CV.y + 2, cv.CV.y + cv.CV.h - b.h - 2);
      this.hdPlaque(ctx, b.n, b.cx, b.y);
      this._labelRects.push({ id: b.n.id, x: Math.round(b.cx - b.tw / 2), y: Math.round(b.y), w: Math.round(b.tw), h: b.h });
    }
  },
  hdPlaque(ctx, n, cx, topY) {
    const isCur = n.id === Game.run.nodeId, seen = n.visited && !isCur && n.type !== 'start';
    const name = n.name || '', desc = this.nodeDesc(n);
    const tw = Math.max(TYPE.width(ctx, name, 18, { display: true }), TYPE.width(ctx, desc, 14, { italic: true })) + 18;
    ctx.fillStyle = 'rgba(236,220,182,0.88)'; ctx.fillRect(cx - tw / 2, topY, tw, 44);
    ctx.strokeStyle = 'rgba(90,60,28,0.7)'; ctx.lineWidth = 1.5; ctx.strokeRect(cx - tw / 2 + 0.75, topY + 0.75, tw - 1.5, 42.5); ctx.lineWidth = 1;
    TYPE.drawCentered(ctx, name, cx, topY + 4, 18, seen ? COL.inkfade : COL.inkdk, { display: true });
    TYPE.drawCentered(ctx, desc, cx, topY + 25, 14, this.descColor(n, seen), { italic: true });
  },
  drawLegend(ctx, CV) {
    const lw = 232, lh = 156, lx = CV.x + CV.w - lw - 16, ly = CV.y + CV.h - lh - 16;
    ctx.fillStyle = 'rgba(236,220,182,0.9)'; ctx.fillRect(lx, ly, lw, lh);
    ctx.strokeStyle = COL.brassdk; ctx.lineWidth = 2; ctx.strokeRect(lx + 1, ly + 1, lw - 2, lh - 2); ctx.lineWidth = 1;
    const rows = [['event', 'Friendly / Traveled'], ['shop', 'Port / Safe Haven'], ['fight', 'Armada / Hostile'], ['distress', 'Story / Objective'], ['start', 'Current Location']];
    let yy = ly + 14;
    for (const [t, lbl] of rows) {
      const cx = lx + 22, cyc = yy + 9;
      ctx.fillStyle = MapScreen.NODE_COL[t] || MapScreen.NODE_COL.event; ctx.beginPath(); ctx.arc(cx, cyc, 8, 0, 7); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = COL.brass; ctx.beginPath(); ctx.arc(cx, cyc, 8, 0, 7); ctx.stroke(); ctx.lineWidth = 1;
      this.drawNodeEmblem(ctx, cx, cyc, t, false);
      TYPE.draw(ctx, lbl, lx + 42, yy + 1, 14, COL.inkdk, { italic: true });
      yy += 28;
    }
  },
  drawShipCrewColumn(ctx, run, H) {
    const ship = Game.ship, LX = 16;
    H.pPanel(LX, 104, 300, 210);
    TYPE.drawCentered(ctx, ship.name || 'DAWNCHASER', LX + 150, 116, 20, COL.inkdk, { display: true });
    if (!SPR.drawArt(ctx, 'mini_dawnchaser', LX + 38, 144, 224, 92)) { ctx.fillStyle = 'rgba(120,84,40,0.2)'; ctx.fillRect(LX + 38, 144, 224, 92); }
    TYPE.draw(ctx, 'Hull', LX + 16, 248, 15, COL.inkmd);
    const hf = ship.hull / ship.hullMax;
    ctx.fillStyle = '#2a1d10'; ctx.fillRect(LX + 16, 266, 210, 14); ctx.fillStyle = Game.hullBarColor(hf); ctx.fillRect(LX + 16, 266, Math.round(210 * hf), 14);
    TYPE.drawRight(ctx, ship.hull + '/' + ship.hullMax, LX + 284, 248, 15, COL.inkdk);
    const stat = (sym, val, sx) => { drawSysSym(ctx, sym, sx, 286, 20, COL.inkdk); TYPE.draw(ctx, '' + val, sx + 24, 288, 16, COL.inkdk, { display: true }); };
    stat('weapons', ship.weapons.filter(Boolean).length, LX + 26);
    stat('sails', ship.sysLv.sails || 0, LX + 120);
    stat('doors', ship.sysLv.doors || 0, LX + 214);
    let cy = 330;
    for (const c of ship.aliveCrew()) {
      H.pPanel(LX, cy, 300, 64);
      if (!SPR.drawArt(ctx, 'portrait_' + c.race, LX + 10, cy + 8, 48, 48)) { ctx.fillStyle = COL.woodfr; ctx.fillRect(LX + 10, cy + 8, 48, 48); }
      const room = ship.rooms[c.roomId], skey = room && room.key;
      const station = skey ? (DATA.SYSTEMS[skey] ? DATA.SYSTEMS[skey].name : skey) : 'Idle';
      TYPE.draw(ctx, c.name, LX + 70, cy + 10, 22, COL.inkdk, { display: true });
      const nw = TYPE.width(ctx, c.name, 22, { display: true }) + 4;
      TYPE.draw(ctx, '- ' + station, LX + 70 + nw, cy + 12, 19, COL.inkmd, { maxWidth: 214 - nw, fit: 'ellipsis' });
      const h2 = Math.max(0, c.hp) / c.maxhp;
      ctx.fillStyle = '#2a1d10'; ctx.fillRect(LX + 70, cy + 42, 198, 12); ctx.fillStyle = h2 < 0.34 ? COL.red : COL.green; ctx.fillRect(LX + 70, cy + 42, Math.round(198 * h2), 12);
      cy += 72;
    }
  },
  nodeVig(type) {
    return { shop: 'vig_shop', fight: 'vig_armada', elite: 'vig_armada', distress: 'vig_wreck', boss: 'vig_boss', exit: 'vig_port', event: 'vig_island', start: 'vig_port', empty: 'vig_calm' }[type] || 'vig_island';
  },
  NODE_FLAVOR: { fight: 'Hostile sails on the horizon. Clear them, or slip past.', elite: 'A heavy Armada hull — dangerous, but well-stocked.', shop: 'A safe harbor. Trade, repair, and refit here.', distress: 'A ship in trouble — or a trap dressed as one.', event: 'Uncharted waters. Anything could be waiting.', boss: 'The Warden bars the way onward.', exit: 'The route onward to the next sea.', empty: 'Calm water. A moment to breathe.', start: 'Your current anchorage.' },
  nodeFlavor(n) { return n.id === Game.run.nodeId ? 'You are anchored here.' : (this.NODE_FLAVOR[n.type] || 'Uncharted waters.'); },
  drawNodePanel(ctx, run, H) {
    let n = run.map.nodes[this._selId]; if (!n) n = run.map.nodes[run.nodeId];
    const isCur = n.id === run.nodeId, seen = n.visited && !isCur && n.type !== 'start';
    const RX = 1604, cx = RX + 150;
    H.pPanel(RX, 104, 300, 645);
    TYPE.drawCentered(ctx, (n.name || 'Uncharted').toUpperCase(), cx, 122, 22, COL.inkdk, { display: true, maxWidth: 276, fit: 'shrink' });
    TYPE.drawCentered(ctx, this.nodeDesc(n), cx, 152, 15, this.descColor(n, seen), { italic: true });
    ctx.save(); ctx.beginPath(); ctx.rect(RX + 22, 182, 256, 150); ctx.clip();
    if (!this.drawCoverArt(ctx, this.nodeVig(n.type), RX + 22, 182, 256, 150)) { ctx.fillStyle = 'rgba(60,44,24,0.3)'; ctx.fillRect(RX + 22, 182, 256, 150); }
    ctx.restore();
    ctx.strokeStyle = COL.brassdk; ctx.lineWidth = 2; ctx.strokeRect(RX + 22, 182, 256, 150); ctx.lineWidth = 1;
    const lines = TYPE.wrap(ctx, this.nodeFlavor(n), 262, 16, { italic: true });
    let yy = 350; for (let i = 0; i < Math.min(6, lines.length); i++) { TYPE.draw(ctx, lines[i], RX + 20, yy, 16, COL.inkmd, { italic: true }); yy += 21; }
    // Set Course = a separate framed button below the info panel (matches the mockup)
    const can = this.canTravel(n) && !isCur;
    H.hbtn(RX, 765, 300, 84, isCur ? 'You Are Here' : (can ? 'Set Course' : 'Unreachable'), can ? 'setcourse' : null, can);
  },
  drawCoverArt(ctx, name, x, y, w, h) { const e = SPR.artEntry(name); if (!e) return false; this.drawCover(ctx, e.img, x, y, w, h); return true; },
  drawHdBottom(ctx, run, H) {
    const by = 992, bh = 72;
    H.pPanel(16, by, 1888, bh);
    H.hbtn(32, by + 8, 150, bh - 16, 'SHIP', 'ship');
    H.hbtn(192, by + 8, 150, bh - 16, 'DECKS', 'decks');
    TYPE.draw(ctx, 'Crew ' + Game.ship.aliveCrew().length, 392, by + 26, 18, COL.inkdk, { display: true });
    TYPE.draw(ctx, 'Hull ' + Game.ship.hull + '/' + Game.ship.hullMax, 566, by + 14, 17, COL.inkdk, { display: true });
    const hf = Game.ship.hull / Game.ship.hullMax;
    ctx.fillStyle = '#2a1d10'; ctx.fillRect(566, by + 42, 180, 14); ctx.fillStyle = Game.hullBarColor(hf); ctx.fillRect(566, by + 42, Math.round(180 * hf), 14);
    TYPE.draw(ctx, 'THREAT: The Armada hunts you', 850, by + 14, 16, COL.dkred, { display: true });
    const tn = 14, tw = 420, segw = tw / tn;
    const tf = Math.max(0, Math.min(1, (run.front || 0) / ((run.map && run.map.cols) || 6)));
    const on = Math.round(tf * tn);
    for (let i = 0; i < tn; i++) { ctx.fillStyle = i < on ? (i < tn * 0.6 ? COL.red : '#c0442e') : 'rgba(60,40,24,0.5)'; ctx.fillRect(850 + i * segw, by + 42, segw - 3, 16); }
  },

  travelOrEnter(n) {
    const run = Game.run;
    if (n.id === run.nodeId && n.type === 'shop') { Game.setScreen('shop'); AUDIO.sfx('click'); return; }
    if (n.id === run.nodeId && n.type === 'boss' && !n.visited) { n.visited = true; Game.startBossStage(); return; }
    if (n.id === run.nodeId) return;
    if (this.canTravel(n)) { Game.travelTo(n); }
    else { this.msg = 'TOO FAR - FOLLOW THE ROUTES FROM YOUR POSITION'; this.msgT = 2; AUDIO.sfx('back'); }
  },
  click(x, y, btn) {
    const hud = this._hud || {};
    const hit = (r) => r && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
    if (hit(hud.log)) { this._logOpen = !this._logOpen; AUDIO.sfx('click'); return; }
    if (this._logOpen) { this._logOpen = false; AUDIO.sfx('click'); return; } // click outside closes the journal
    if (hit(hud.menu) || hit(hud.gear)) { Game.save(); Game.setScreen('title'); AUDIO.sfx('click'); return; }
    if (hit(hud.ship)) { Game.setScreen('shipmenu', { tab: 0 }); AUDIO.sfx('click'); return; }
    if (hit(hud.decks)) { Game.setScreen('decks'); AUDIO.sfx('click'); return; }
    if (hit(hud.setcourse)) { const n = Game.run.map.nodes[this._selId]; if (n) this.travelOrEnter(n); return; }
    const cv = this._cv;
    if (cv && x >= cv.CV.x && x < cv.CV.x + cv.CV.w && y >= cv.CV.y && y < cv.CV.y + cv.CV.h) {
      const n = this.nodeAt((x - cv.tx) / cv.S, (y - cv.ty) / cv.S);
      if (n) this.travelOrEnter(n);
    }
  },

  clickClassic(x, y, btn) {
    // MENU: save the voyage and step out to the title screen
    if (this.inRect(x, y, 452, 4, 54, 16)) {
      Game.save();
      Game.setScreen('title');
      AUDIO.sfx('click');
      return;
    }
    // bottom buttons (SHIP = the tabbed reactor/loadout/crew window; DECKS = live crew)
    if (this.inRect(x, y, 6, 266, 60, 18)) { Game.setScreen('shipmenu', { tab: 0 }); AUDIO.sfx('click'); return; }
    if (this.inRect(x, y, 70, 266, 60, 18)) { Game.setScreen('decks'); AUDIO.sfx('click'); return; }
    const n = this.nodeAt(x, y);
    if (n && n.id === Game.run.nodeId && n.type === 'shop') { Game.setScreen('shop'); AUDIO.sfx('click'); return; }
    if (n && n.id === Game.run.nodeId && n.type === 'boss' && !n.visited) {
      // the Warden awaits another round
      n.visited = true;
      Game.startBossStage();
      return;
    }
    if (n && n.id === Game.run.nodeId) return; // already here — not "too far", just a no-op
    if (n && this.canTravel(n)) {
      Game.travelTo(n);
    } else if (n) {
      this.msg = 'TOO FAR - FOLLOW THE ROUTES FROM YOUR POSITION';
      this.msgT = 2;
      AUDIO.sfx('back');
    }
  },
  key(k) {
    if (k === 's') Game.setScreen('shipmenu', { tab: 0 });
  },
  inRect(x, y, rx, ry, rw, rh) { return U.inRect(x, y, rx, ry, rw, rh); },

  renderClassic(ctx) {
    const run = Game.run;
    const reg = DATA.REGIONS[run.region];
    // stone-desk backdrop so every parchment panel sits on a surface (age-of-sail desk)
    if (!UI.stoneBg(ctx)) { ctx.fillStyle = COL.woodfrdk; ctx.fillRect(0, 0, 512, 288); }

    this.drawChartPanel(ctx, run, reg);
    this.drawLog(ctx, run);
    UI.woodBorder(ctx, 24);          // uniform tiled wood + brass frame ON TOP of the chart edges
    this.drawTitleBar(ctx, run, reg); // title text on the top band
    this.drawBottomBar(ctx, run);     // SHIP/DECKS + stats on the bottom band

    // persistent place-name + type plaques for the current + reachable nodes (and the hovered one)
    this.drawNodeLabels(ctx, run);

    // transient "too far" / status message, centred over the chart
    if (this.msgT > 0 && this.msg) {
      const cx = (CHART.px0 + CHART.px1) / 2;
      TYPE.drawCentered(ctx, this.msg, cx, CHART.py1 - 18, 11, COL.dkred, { shadow: COL.paperhi });
    }
  },

  // ---- wood-framed parchment panel (AI parchment tile + ornate brass 9-slice frame) ----
  panel(ctx, x, y, w, h) {
    if (!UI.tileFill(ctx, 'ui_parchment', x, y, w, h, 'rgba(244,232,205,0.18)')) { ctx.fillStyle = COL.paper; ctx.fillRect(x, y, w, h); }
    this.frame(ctx, x, y, w, h);
  },
  // just the ornate frame (drawn on top of the chart backdrop so it isn't covered)
  frame(ctx, x, y, w, h) {
    if (UI.draw9(ctx, 'ui_panel_frame', x - 9, y - 9, w + 18, h + 18, 94, 9)) return;
    ctx.fillStyle = COL.woodfr; ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = COL.woodfrhi; ctx.fillRect(x - 3, y - 3, w + 6, 1);
    ctx.fillStyle = COL.woodfrdk; ctx.fillRect(x - 3, y + h + 2, w + 6, 1);
    ctx.fillStyle = COL.paper; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = COL.brass;
    for (const [cx, cy] of [[x + 1, y + 1], [x + w - 3, y + 1], [x + 1, y + h - 3], [x + w - 3, y + h - 3]]) ctx.fillRect(cx, cy, 2, 2);
  },

  // ---- the sea chart ----
  drawChartPanel(ctx, run, reg) {
    const C = CHART;
    const w = C.px1 - C.px0, h = C.py1 - C.py0;
    // parchment fill behind the chart (the wood border is drawn later, on top of the edges)
    if (!UI.tileFill(ctx, 'ui_parchment', C.px0, C.py0, w, h, 'rgba(244,232,205,0.18)')) { ctx.fillStyle = COL.paper; ctx.fillRect(C.px0, C.py0, w, h); }
    ctx.save();
    ctx.beginPath(); ctx.rect(C.px0, C.py0, w, h); ctx.clip();
    this.drawChartBg(ctx, run, reg, C.px0, C.py0, w, h);
    this.drawChartFg(ctx, run);
    ctx.restore();
  },
  // chart backdrop (per-region AI chart, else a procedural parchment sea) into an arbitrary rect —
  // reused by the HD center panel so the sea fills the whole panel behind the route web.
  drawChartBg(ctx, run, reg, x, y, w, h) {
    const regParch = SPR.artEntry('parchment_r' + (run.region + 1));
    if (regParch) { this.drawCover(ctx, regParch.img, x, y, w, h); return; }
    ctx.fillStyle = COL.paper; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(159,176,166,0.22)'; ctx.fillRect(x + 6, y + 8, w - 12, h - 16);
    ctx.fillStyle = 'rgba(120,98,52,0.10)';
    for (let i = 0; i < 60; i++) { const wx = x + ((i * 71) % (w - 16)) + 8, wy = y + ((i * 113) % (h - 16)) + 8; ctx.fillRect(wx, wy, 5, 1); }
    this.compassRose(ctx, x + 34, y + h - 34, 18);
  },
  // chart foreground: armada wash + routes + nodes + player ship + hazard warning, in CHART coords.
  drawChartFg(ctx, run) {
    const C = CHART;
    const w = C.px1 - C.px0, h = C.py1 - C.py0;
    // armada front wash (within the chart only)
    const fx = this.frontX();
    if (fx > C.px0 + 4) {
      ctx.fillStyle = 'rgba(168,40,40,0.16)';
      ctx.fillRect(C.px0, C.py0, Math.min(fx, C.px1) - C.px0, h);
      ctx.fillStyle = 'rgba(124,28,40,0.5)';
      for (let yy = C.py0 + 12; yy < C.py1 - 6; yy += 26) {
        const sk = SPR.icon('skull'); if (sk) ctx.drawImage(sk, Math.min(fx, C.px1 - 8) - 6, yy);
      }
    }

    // routes: paper halo, then ink dashes tinted blue (safe) / red (toward danger)
    const danger = t => t === 'fight' || t === 'elite' || t === 'boss';
    for (const n of run.map.nodes) {
      for (const eid of n.edges) {
        if (eid < n.id) continue;
        const m = run.map.nodes[eid];
        ctx.strokeStyle = 'rgba(236,220,182,0.8)'; ctx.lineWidth = 3;
        this.dashLine(ctx, n.x, n.y, m.x, m.y);
        const hot = danger(n.type) || danger(m.type) || n.col <= this.frontCol() || m.col <= this.frontCol();
        ctx.strokeStyle = hot ? 'rgba(150,42,30,0.9)' : 'rgba(40,70,100,0.85)'; ctx.lineWidth = 1.4;
        this.dashLine(ctx, n.x, n.y, m.x, m.y);
      }
    }
    ctx.lineWidth = 1;

    // nodes
    const cur = run.map.nodes[run.nodeId];
    this._hov = null;
    for (const n of run.map.nodes) {
      const reachable = this.canTravel(n);
      const seen = n.visited && n.type !== 'start' && n.id !== run.nodeId;
      this.drawNode(ctx, n, reachable, seen, run);
      if (Math.hypot(Game.mouse.x - n.x, Game.mouse.y - n.y) <= 9) { this._hov = n; if (reachable) Game.hot = true; }
    }

    // player ship marker (miniature Dawnchaser, gently bobbing) — clamped so the full hull
    // stays on the chart even when the start/exit node hugs an edge (was half off-screen)
    const bob = Math.round(Math.sin(Game.time * 2) * 1.5);
    const sx = U.clamp(cur.x, C.px0 + 24, C.px1 - 24);
    ctx.fillStyle = 'rgba(58,40,18,0.35)';
    ctx.beginPath(); ctx.ellipse(sx, cur.y - 1, 17, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    if (SPR.artEntry('mini_dawnchaser')) {
      SPR.drawArt(ctx, 'mini_dawnchaser', sx - 22, cur.y - 31 + bob, 44, 28);
    } else if (!SPR.drawFrame(ctx, 'minishipx', sx - 18, cur.y - 28 + bob, false, 2)) {
      const ms = SPR.miniShip(COL.sail);
      ctx.drawImage(ms, sx - 18, cur.y - 30, ms.width * 2, ms.height * 2);
    }

    // node names + types are HOVER-ONLY now (drawn in render() for the node under the cursor),
    // so the chart stays clean — no always-on plaques.

    // hazards aboard: blinking warning steering you to DECKS (over the chart)
    const nFire = Game.ship.rooms.filter(r => r.fire > 0).length;
    const nLeak = Game.ship.rooms.filter(r => r.leak || r.scupper).length;
    if ((nFire || nLeak) && Math.floor(Game.time * 3) % 2) {
      const warn = nFire && nLeak ? 'Fire and flooding below decks!' : nFire ? 'Fire below decks!' : 'The ship is taking water!';
      TYPE.drawCentered(ctx, warn + '  - click DECKS', (C.px0 + C.px1) / 2, C.py1 - 32, 11, COL.red, { shadow: COL.paperhi });
    }
  },

  // chart medallion: brass-ringed coin, type color, engraved emblem (like the reference chart)
  drawNode(ctx, n, reachable, seen, run) {
    const big = (n.type === 'boss' || n.type === 'exit');
    const r = big ? 8 : 6;
    const TAU = Math.PI * 2;
    if (n.col <= this.frontCol() && n.type !== 'start') {
      ctx.fillStyle = 'rgba(150,42,30,0.4)';
      ctx.beginPath(); ctx.arc(n.x, n.y, r + 4, 0, TAU); ctx.fill();
    }
    // drop shadow on the parchment
    ctx.fillStyle = 'rgba(40,28,12,0.35)';
    ctx.beginPath(); ctx.ellipse(n.x, n.y + r - 1, r * 0.9, 2.5, 0, 0, TAU); ctx.fill();
    // coin: type color, slightly domed
    const col = seen ? '#9c8a64' : (MapScreen.NODE_COL[n.type] || MapScreen.NODE_COL.event);
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.20)'; ctx.beginPath(); ctx.arc(n.x, n.y, r - 1, 0, TAU); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(n.x, n.y - 0.6, r - 2.5, 0, TAU); ctx.fill();
    // brass ring
    ctx.lineWidth = 2; ctx.strokeStyle = COL.brass;
    ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = COL.brassdk;
    ctx.beginPath(); ctx.arc(n.x, n.y, r + 1, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1;
    // engraved emblem (always, in cream)
    this.drawNodeEmblem(ctx, n.x, n.y, n.type, false);
    // small visited tick
    if (seen && n.type !== 'shop' && n.type !== 'exit' && n.type !== 'boss') {
      ctx.strokeStyle = 'rgba(245,238,214,0.9)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(n.x - 2.5, n.y); ctx.lineTo(n.x - 0.5, n.y + 2.5); ctx.lineTo(n.x + 3, n.y - 2.5); ctx.stroke();
      ctx.lineWidth = 1;
    }
    // reachable: pulsing green ring
    if (reachable) {
      ctx.strokeStyle = 'rgba(120,200,140,' + (0.45 + 0.4 * Math.abs(Math.sin(Game.time * 3))).toFixed(2) + ')';
      ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(n.x, n.y, r + 4, 0, TAU); ctx.stroke();
      ctx.lineWidth = 1;
    }
  },

  // region-flavored descriptor under a place name (fight/elite/harbor/warden stay consistent)
  nodeDesc(n) {
    if (n.id === Game.run.nodeId) return 'You are here';
    const feat = DATA.REGION_FEATURE && DATA.REGION_FEATURE[Game.run.region];
    if (feat && feat[n.type]) return feat[n.type];
    return DATA.NODE_DESC[n.type] || 'Uncharted';
  },
  descColor(n, seen) {
    if (n.id === Game.run.nodeId) return COL.magiccy;
    if (seen) return COL.inkfade;
    return { shop: COL.dkgreen, fight: COL.dkred, elite: COL.dkred, distress: COL.orange, boss: COL.dkpurple, event: COL.inklt, exit: COL.brassdk }[n.type] || COL.inkmd;
  },

  // place-name + descriptor plaques (U13). Persistent labels are drawn for the CURRENT node and
  // every REACHABLE node — plus the hovered node, and ALL nodes under the teleport cheat — so the
  // chart reads at a glance without hovering each beacon, FTL-style. drawNodeLabels lays the shown
  // set out with a light vertical de-collision that nudges the LABEL, never the node (so it can't
  // undo the beacon spacing _spaceNodes set). drawPlaceLabel keeps the single-node (hover) entry.
  labeledNodes(run) {
    const set = new Map();
    const cur = run.map.nodes[run.nodeId]; if (cur) set.set(cur.id, cur);
    for (const n of run.map.nodes) if (this.canTravel(n)) set.set(n.id, n);
    if (this._hov) set.set(this._hov.id, this._hov);
    if (run.cheats && run.cheats.teleport) for (const n of run.map.nodes) set.set(n.id, n);
    return [...set.values()];
  },
  labelBox(ctx, n) {
    const r = (n.type === 'boss' || n.type === 'exit') ? 10 : 8;
    const name = n.name || '', desc = this.nodeDesc(n);
    const tw = Math.max(TYPE.width(ctx, name, 10), TYPE.width(ctx, desc, 8, { italic: true })) + 6;
    const cx = U.clamp(n.x, CHART.px0 + tw / 2 + 2, CHART.px1 - tw / 2 - 2);
    let y = n.y + r + 3;
    if (y + 19 > CHART.py1 - 2) y = n.y - r - 20; // flip above near the bottom
    return { n, cx, y, tw, h: 20 };
  },
  drawNodeLabels(ctx, run) {
    this._labelRects = [];
    const boxes = this.labeledNodes(run).map(n => this.labelBox(ctx, n));
    for (let it = 0; it < 24; it++) {                 // de-collide the SHOWN boxes (small set; cheap)
      let moved = false;
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const A = boxes[i], B = boxes[j];
        if (Math.abs(A.cx - B.cx) * 2 < (A.tw + B.tw) && Math.abs(A.y - B.y) < 21) {
          const push = (21 - Math.abs(A.y - B.y)) / 2 + 0.5;
          if (A.y <= B.y) { A.y -= push; B.y += push; } else { A.y += push; B.y -= push; }
          moved = true;
        }
      }
      if (!moved) break;
    }
    for (const b of boxes) {
      b.y = U.clamp(b.y, CHART.py0 + 2, CHART.py1 - b.h - 1); // keep the whole plaque on the chart
      this.drawPlaceLabelAt(ctx, b.n, b.cx, b.y);
      this._labelRects.push({ id: b.n.id, x: Math.round(b.cx - b.tw / 2), y: b.y - 1, w: b.tw, h: b.h });
    }
  },
  drawPlaceLabel(ctx, n) { const b = this.labelBox(ctx, n); this.drawPlaceLabelAt(ctx, n, b.cx, b.y); },
  drawPlaceLabelAt(ctx, n, cx, y) {
    const isCur = n.id === Game.run.nodeId;
    const seen = n.visited && !isCur && n.type !== 'start';
    const name = n.name || '', desc = this.nodeDesc(n);
    const tw = Math.max(TYPE.width(ctx, name, 10), TYPE.width(ctx, desc, 8, { italic: true })) + 6;
    ctx.fillStyle = 'rgba(236,220,182,0.82)'; ctx.fillRect(cx - tw / 2, y - 1, tw, 20);
    TYPE.drawCentered(ctx, name, cx, y, 10, seen ? COL.inkfade : COL.inkdk);
    TYPE.drawCentered(ctx, desc, cx, y + 10, 8, this.descColor(n, seen), { italic: true });
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

  // ---- captain's journal: log + rumors ----
  // Captain's Log: a small tab in the top-right corner; hover it to unfurl the full journal.
  drawLog(ctx, run) {
    const C = CHART, x0 = C.lx0, y0 = C.ly0, w = C.lw, h = C.lh;
    const lw = Math.round(TYPE.width(ctx, "Captain's Log", 10)) + 14;
    // U15: collapsed, only the small tab is drawn — so only the TAB should open the log. The old
    // code used the whole 126x86 panel rect as the hover target, so the journal popped open over
    // empty chart / nearby beacons. Once OPEN, the full panel keeps it open (no flicker).
    this._logTabRect = { x: x0, y: y0, w: lw, h: 16 };
    const inR = (rx, ry, rw, rh) => Game.mouse.x >= rx && Game.mouse.x < rx + rw && Game.mouse.y >= ry && Game.mouse.y < ry + rh;
    const hov = this._logOpen ? inR(x0, y0, w, h) : inR(x0, y0, lw, 16);
    this._logOpen = hov;
    if (!hov) {
      // collapsed: just the words "Captain's Log" (hover the tab to read the entries)
      ctx.fillStyle = 'rgba(231,214,172,0.85)'; ctx.fillRect(x0, y0, lw, 16);
      ctx.strokeStyle = COL.brassdk; ctx.strokeRect(x0 + 0.5, y0 + 0.5, lw - 1, 15);
      ctx.strokeStyle = COL.brass; ctx.strokeRect(x0 + 1.5, y0 + 1.5, lw - 3, 13);
      TYPE.draw(ctx, "Captain's Log", x0 + 7, y0 + 4, 10, COL.inkdk, { italic: true });
      return;
    }
    ctx.fillStyle = 'rgba(231,214,172,0.85)'; ctx.fillRect(x0, y0, w, h);
    ctx.strokeStyle = COL.brassdk; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
    ctx.strokeStyle = COL.brass; ctx.strokeRect(x0 + 1.5, y0 + 1.5, w - 3, h - 3);
    const x = x0 + 6, tw = w - 11;
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
    TYPE.draw(ctx, "Captain's Log", x, y0 + 4, 10, COL.inkdk, { italic: true });
    ctx.strokeStyle = COL.paperedge; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(x, y0 + 16); ctx.lineTo(x0 + w - 5, y0 + 16); ctx.stroke();
    let y = y0 + 19;
    const log = run.log || [], entries = [];
    for (let i = log.length - 1; i >= 0; i--) {
      const e = log[i], lines = TYPE.wrap(ctx, e.text, tw, 8, { italic: true });
      const need = 8 + lines.length * 8 + 2;
      if (entries.reduce((s, en) => s + en.need, 0) + need > h - 22) break;
      entries.unshift({ e, lines, need });
    }
    for (const en of entries) {
      TYPE.draw(ctx, 'Day ' + en.e.day, x, y, 8, COL.inkfade); y += 8;
      for (const ln of en.lines) { TYPE.draw(ctx, ln, x, y, 8, COL.inkmd, { italic: true }); y += 8; }
      y += 2;
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

  // ---- title + bottom bars ----
  drawTitleBar(ctx, run, reg) {
    // (top band is painted by UI.woodBorder; lay the title text centred on the band's midline)
    const cy = 12; // top wood band 0..24 → midline 12
    const rom = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][run.region] || (run.region + 1);
    const label = rom + '.  ' + reg.name;
    TYPE.draw(ctx, label, 8, cy, 15, COL.brasshi, { display: true, baseline: 'middle' });
    const dx = TYPE.width(ctx, label, 15, { display: true }) + 18;
    // subtitle must stop before the MENU button (x=452); budget the width from where it starts
    TYPE.draw(ctx, reg.desc, dx, cy, 10, '#d8c79a', { italic: true, maxWidth: Math.max(40, 446 - dx), fit: 'ellipsis', baseline: 'middle' });
    this.brassBtn(ctx, 452, cy - 8, 54, 16, 'MENU');
  },

  drawBottomBar(ctx, run) {
    // (bottom band is painted by UI.woodBorder; everything is centred on the band midline)
    const cy = 276; // bottom wood band 264..288 → midline 276
    this.brassBtn(ctx, 6, cy - 9, 60, 18, 'SHIP');
    this.brassBtn(ctx, 70, cy - 9, 60, 18, 'DECKS');
    // status readouts (icons + serif numerals), all centred on cy
    let sx = 150;
    const stat = (icon, val, col) => {
      if (icon === 'shard' || icon === 'runeshot' || icon === 'candle') UI.drawRes(ctx, icon, sx, cy - 6, 11);
      else if (icon === 'hull') drawSysSym(ctx, 'hull', sx, cy - 6, 12, COL.brasshi);
      else { const ic = SPR.icon(icon); if (ic) ctx.drawImage(ic, sx, cy - 5); }
      TYPE.draw(ctx, '' + val, sx + 13, cy, 11, col, { baseline: 'middle' }); sx += 18 + TYPE.width(ctx, '' + val, 11) + 14;
    };
    stat('hull', Game.ship.hull + '/' + Game.ship.hullMax, COL.paperhi);
    stat('shard', run.shards, COL.brasshi);
    stat('runeshot', run.runeshot, COL.pink);
    stat('candle', run.candles || 0, COL.gold);
    const crewTxt = 'Crew ' + Game.ship.aliveCrew().length;
    TYPE.draw(ctx, crewTxt, sx, cy, 11, COL.paperhi, { baseline: 'middle' });
    // reserve whatever space is left for the right-aligned warning so 3-digit counters
    // can never push the Crew label into it — the warning shrinks to fit instead.
    const clusterRight = sx + TYPE.width(ctx, crewTxt, 11) + 10;
    const warnBudget = Math.max(40, 506 - clusterRight);
    TYPE.drawRight(ctx, 'The Armada hunts you', 506, cy, 11, this.frontX() > 150 ? COL.red : '#caa24a', { italic: true, maxWidth: warnBudget, baseline: 'middle' });
  },

  // node disc colors (the color reinforces the inked emblem)
  NODE_COL: {
    fight: '#a83232', elite: '#6e1622', shop: '#2e8b4f', distress: '#e08030',
    boss: '#8a3aa0', empty: '#b8a878', exit: '#caa24a', start: '#efe6cc', event: '#4a7ab8',
  },

  // engraved brass button
  brassBtn(ctx, x, y, w, h, label) {
    const hov = Game.mouse.x >= x && Game.mouse.x < x + w && Game.mouse.y >= y && Game.mouse.y < y + h;
    if (hov) Game.hot = true;
    ctx.fillStyle = COL.woodfrdk; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = hov ? COL.brasshi : COL.brass; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x + 1, y + 1, w - 2, 1);
    ctx.fillStyle = COL.brassdk; ctx.fillRect(x + 1, y + h - 2, w - 2, 1);
    TYPE.drawCentered(ctx, label, x + w / 2, y + (h - 11) / 2, 11, COL.woodfrdk, { display: true });
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
    TYPE.drawCentered(ctx, 'N', x, y - r - 9, 8, 'rgba(91,67,38,0.7)');
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
