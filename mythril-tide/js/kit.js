// MYTHRIL TIDE - kit.js : the shared UI kit (Stage 2 of the "Mediocre to Superb" plan, 2026-10-08)
//
// ONE implementation of every chrome primitive, ported from the HD combat chrome (renderHD), plus the
// interaction layer the game never had: hover / pressed / disabled(+reason) states, activation on
// mouse-UP inside the same control (press-and-drag-off cancels), a hit registry built from the SAME
// rects that are drawn (so draw and click can never drift), per-id eased animation, tooltips with one
// delay rule, modal blocking, and cross-fade screen transitions.
//
// Usage inside a screen's render(ctx) (any design resolution; HD screens use 1920x1080):
//   KIT.panel(ctx, r, { title: 'Crew', wood: true });
//   KIT.card(ctx, r);
//   KIT.button(ctx, 'shop.buy.3', r, 'Buy', { onClick: () => ..., disabled: !afford, reason: 'Not enough shards.' });
//   KIT.text(ctx, 'Hello', r, { size: 20, align: 'center' });
//   KIT.flushFrames(ctx);   // the dark-wood frames are painted LAST so their brass corners sit topmost
//   KIT.flushTip(ctx);      // the queued tooltip, on top of everything
// Input: Game routes mousedown/mouseup through KIT.down/KIT.up first; a hit on a registered control is
// consumed (the legacy screen.click never sees it), anything else falls through to screen.click.
// Tests: H.clickId('shop.buy.3') resolves the registered rect and presses it through the real path.
'use strict';

const KIT = {
  // ---------------- tokens ----------------
  // one spacing scale + one type scale (1080p design px). Colours are semantic names over COL.
  SP: [4, 8, 12, 16, 24, 32, 48],
  TS: { display: 40, h1: 30, h2: 24, body: 20, small: 17, caption: 15, num: 30 },
  get C() {
    return {
      ink: COL.inkdk, inkMd: COL.inkmd, inkLt: '#6a5230',
      onWood: COL.brasshi, onWoodMuted: '#d9c49a',
      action: '#1f5a4a', actionHi: '#2f8a72',   // teal: the ONE saturated accent (actions, links)
      live: COL.gold, danger: '#8f2316', dangerHi: '#c0392b',
      disabled: 'rgba(90,70,45,0.72)', scrim: 'rgba(10,7,4,0.62)',
      paper: COL.paper, wood: COL.woodfr,
    };
  },

  // ---------------- art patterns (cached ONLY on hit: an early frame before the PNG decodes must
  // not lock a tile to null for the session — the R4 bug class) ----------------
  _pats: new WeakMap(),
  pat(ctx, name) {
    let m = this._pats.get(ctx); if (!m) { m = {}; this._pats.set(ctx, m); }
    if (m[name]) return m[name];
    const e = SPR.artEntry(name);
    if (!e) return null;
    m[name] = ctx.createPattern(e.img, 'repeat');
    return m[name];
  },

  // ---------------- frame lifecycle ----------------
  _frames: [], _tip: null, _regs: [], _live: [], _down: null, _anim: {}, _lastT: 0, dt: 0,
  beginFrame() {
    this._live = this._regs;       // input hit-tests against the last COMPLETED frame
    this._regs = []; this._frames = []; this._tip = null; this._blockIdx = 0;
    const t = (typeof Game !== 'undefined' && Game.time) || 0;
    this.dt = Math.max(0, Math.min(0.1, t - this._lastT)); this._lastT = t;
  },
  endFrame(ctx) { this.drawTransition(ctx); },

  // ---------------- hit registry + input ----------------
  inR(x, y, r) { return !!r && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h; },
  // register an interactive rect for this frame. o: {onClick(btn), onRight(), disabled, reason, cursor}
  reg(id, r, o) {
    const e = Object.assign({ id, r: { x: r.x, y: r.y, w: r.w, h: r.h } }, o || {});
    this._regs.push(e);
    return e;
  },
  // everything registered so far this frame becomes inert (a modal dialog is about to draw on top)
  blockBelow() { this._blockIdx = this._regs.length; },
  // the topmost live registration under (x,y), honouring modal blocks
  _hitLive(x, y) {
    const L = this._live, lo = L._blockIdx || 0;
    for (let i = L.length - 1; i >= lo; i--) if (this.inR(x, y, L[i].r)) return L[i];
    return null;
  },
  // hover is evaluated against the CURRENT frame's rect (no lag); modal blocking applies
  hovered(id, r) {
    if (typeof Game === 'undefined') return false;
    const L = this._live, blocked = L && L._blockIdx && L.slice(L._blockIdx).some(e => e.id !== id && this.inR(Game.mouse.x, Game.mouse.y, e.r)) && !L.slice(L._blockIdx).some(e => e.id === id);
    return !blocked && this.inR(Game.mouse.x, Game.mouse.y, r);
  },
  down(x, y, btn) {
    const h = this._hitLive(x, y);
    if (!h) { this._down = null; return false; }
    this._down = { id: h.id, btn };
    return true;
  },
  up(x, y, btn) {
    const d = this._down; this._down = null;
    if (!d) return false;
    const h = this._hitLive(x, y);
    if (h && h.id === d.id) this.activate(h, btn);
    return true; // the press began on a control: consume the release either way (drag-off = cancel)
  },
  activate(h, btn) {
    if (h.disabled) {
      if (typeof AUDIO !== 'undefined') AUDIO.sfx('deny');
      if (h.onDenied) h.onDenied();
      return;
    }
    if (btn === 2) { if (h.onRight) h.onRight(); return; }
    if (h.sound !== false && typeof AUDIO !== 'undefined') AUDIO.sfx(h.sound || 'click');
    if (h.onClick) h.onClick(btn);
  },
  // press state for drawing: the control was pressed and the cursor is still on it
  pressed(id, r) { return !!this._down && this._down.id === id && this.inR(Game.mouse.x, Game.mouse.y, r); },
  // id -> rect of the last completed frame (tests + keyboard focus)
  rectOf(id) { const e = this._live.find(x => x.id === id) || this._regs.find(x => x.id === id); return e ? e.r : null; },
  ids() { return (this._live.length ? this._live : this._regs).map(e => e.id); },

  // ---------------- per-id eased animation ----------------
  // exponential approach toward target at `rate` per second; returns the current value
  anim(id, target, rate) {
    const k = this._anim[id];
    if (k == null) { this._anim[id] = target; return target; }
    const v = k + (target - k) * (1 - Math.exp(-(rate || 14) * this.dt));
    this._anim[id] = Math.abs(v - target) < 0.001 ? target : v;
    return this._anim[id];
  },
  easeOut(t) { t = Math.max(0, Math.min(1, t)); return 1 - Math.pow(1 - t, 3); },

  // ---------------- text: placed INTO a box (never "top + magic offset") ----------------
  _met: {},
  // cap-height + descent for a font, measured once and cached (optical vertical centring)
  metrics(ctx, size, o) {
    const key = TYPE.fontStr(size, o);
    if (this._met[key]) return this._met[key];
    ctx.save(); ctx.font = key; ctx.textBaseline = 'alphabetic';
    const m = ctx.measureText('H'), g = ctx.measureText('g');
    const cap = m.actualBoundingBoxAscent || size * 0.7, desc = g.actualBoundingBoxDescent || size * 0.22;
    ctx.restore();
    return (this._met[key] = { cap, desc });
  },
  // greedy word wrap where line i may be at most widthAt(i) px wide
  _wrapVar(ctx, text, size, font, widthAt) {
    ctx.save(); TYPE.set(ctx, size, font);
    const out = [];
    for (const para of String(text).split('\n')) {
      let line = '';
      for (const word of para.split(' ')) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width <= widthAt(out.length) || !line) line = test;
        else { out.push(line); line = word; }
      }
      out.push(line);
    }
    ctx.restore();
    return out;
  },
  // would this string wrap into the box WITHOUT an ellipsis? (same rules as text(..., {fit:'wrap'}); draws nothing)
  fits(ctx, str, r, o) { return this.text(ctx, str, r, Object.assign({}, o, { fit: 'wrap', measure: true })).fits; },
  // o: size, color, align('left'|'center'|'right'), valign('top'|'middle'|'bottom'), fit('shrink'|'ellipsis'|'wrap'),
  //    display, italic, weight, shadow, outline, padX, maxLines, lineGap, minSize. Returns {lines, size, bottom}.
  text(ctx, str, r, o) {
    o = o || {};
    const padX = o.padX || 0, w = Math.max(1, r.w - padX * 2);
    let size = o.size || this.TS.body;
    const font = { display: o.display, italic: o.italic, weight: o.weight };
    let lines = [String(str)];
    // o.notch {y, w}: lines that reach below y are narrowed to w (text flowing around a control in the box's corner)
    const lg0 = o.lineGap != null ? o.lineGap : Math.round(size * 0.38), lgOf = () => lg0;
    const wOf = (i, sz) => (o.notch && r.y + i * (sz + lgOf(sz)) + sz > o.notch.y) ? Math.max(1, o.notch.w - padX * 2) : w;
    const wrapAt = sz => o.notch ? this._wrapVar(ctx, String(str), sz, font, i => wOf(i, sz)) : TYPE.wrap(ctx, String(str), w, sz, font);
    if (o.fit === 'wrap') {
      lines = wrapAt(size);
      const maxLOf = sz => o.maxLines || Math.max(1, Math.floor((r.h + lgOf(sz)) / (sz + lgOf(sz))));
      while (lines.length > maxLOf(size) && size > (o.minSize || 13)) { size--; lines = wrapAt(size); }
      const maxL = maxLOf(size);
      if (lines.length > maxL) { lines = lines.slice(0, maxL); lines[maxL - 1] = TYPE.clipText(ctx, lines[maxL - 1] + '…', wOf(maxL - 1, size), size, font); if (o.measure) return { fits: false }; }
      if (o.measure) return { fits: true, lines, size };
    } else if (TYPE.width(ctx, lines[0], size, font) > w) {
      if (o.fit === 'ellipsis') lines[0] = TYPE.clipText(ctx, lines[0], w, size, font);
      else size = Math.max(o.minSize || 11, TYPE.fitSize(ctx, lines[0], w, size, font));
      if (TYPE.width(ctx, lines[0], size, font) > w) lines[0] = TYPE.clipText(ctx, lines[0], w, size, font);
    }
    const met = this.metrics(ctx, size, font);
    const lg = o.lineGap != null ? o.lineGap : Math.round(size * 0.38);
    const lineH = size + lg, blockH = met.cap + (lines.length - 1) * lineH;
    const va = o.valign || 'middle';
    let base = va === 'top' ? r.y + met.cap : va === 'bottom' ? r.y + r.h - (lines.length - 1) * lineH - met.desc
      : r.y + (r.h - blockH) / 2 + met.cap;
    const al = o.align || 'left';
    const x = al === 'center' ? r.x + r.w / 2 : al === 'right' ? r.x + r.w - padX : r.x + padX;
    for (const ln of lines) {
      TYPE.draw(ctx, ln, x, base, size, o.color || this.C.ink, Object.assign({}, font, { align: al, baseline: 'alphabetic', shadow: o.shadow, shadowDx: o.shadowDx, shadowDy: o.shadowDy, outline: o.outline, outlineW: o.outlineW }));
      base += lineH;
    }
    return { lines, size, bottom: base - lineH + met.desc };
  },

  // ---------------- primitives (ported verbatim from CombatScreen.renderHD) ----------------
  draw9(ctx, img, x, y, w, h, si, di) { // border-only 9-slice (center stays clear)
    const sw = img.naturalWidth, sh = img.naturalHeight, sR = sw - si, sB = sh - si, dR = x + w - di, dB = y + h - di;
    ctx.drawImage(img, 0, 0, si, si, x, y, di, di); ctx.drawImage(img, sR, 0, si, si, dR, y, di, di);
    ctx.drawImage(img, 0, sB, si, si, x, dB, di, di); ctx.drawImage(img, sR, sB, si, si, dR, dB, di, di);
    ctx.drawImage(img, si, 0, sw - 2 * si, si, x + di, y, w - 2 * di, di); ctx.drawImage(img, si, sB, sw - 2 * si, si, x + di, dB, w - 2 * di, di);
    ctx.drawImage(img, 0, si, si, sh - 2 * si, x, y + di, di, h - 2 * di); ctx.drawImage(img, sR, si, si, sh - 2 * si, dR, y + di, di, h - 2 * di);
  },
  // ornate brass corner art stamped at a rect's 4 corners (fallback when the frame art is absent)
  stampCorners(ctx, x, y, w, h, S) {
    const cornerArt = SPR.artEntry('ui_corner');
    if (!cornerArt) return;
    const img = cornerArt.img, ar = img.naturalWidth / img.naturalHeight, sw = S * ar;
    const put = (cx, cy, fx, fy) => { ctx.save(); ctx.translate(cx, cy); ctx.scale(fx, fy); ctx.drawImage(img, 0, 0, sw, S); ctx.restore(); };
    put(x, y, 1, 1); put(x + w, y, -1, 1); put(x, y + h, 1, -1); put(x + w, y + h, -1, -1);
  },
  // queue a rect for the deferred dark-wood frame layer
  frame(r) { this._frames.push([r.x, r.y, r.w, r.h]); },
  flushFrames(ctx) {
    const frameImg = SPR.artEntry('ui_frame');
    for (const f of this._frames) {
      if (frameImg) this.draw9(ctx, frameImg.img, f[0] - 3, f[1] - 3, f[2] + 6, f[3] + 6, 120, 24);
      else this.stampCorners(ctx, f[0] - 5, f[1] - 5, f[2] + 10, f[3] + 10, 32);
    }
    this._frames = [];
  },
  parchFill(ctx, x, y, w, h, wash) {
    const pp = this.pat(ctx, 'ui_parchment');
    if (pp) { ctx.fillStyle = pp; ctx.fillRect(x, y, w, h); ctx.fillStyle = 'rgba(244,232,205,' + (wash == null ? 0.30 : wash) + ')'; ctx.fillRect(x, y, w, h); }
    else { ctx.fillStyle = COL.paper; ctx.fillRect(x, y, w, h); }
  },
  woodFill(ctx, x, y, w, h) {
    const wp = this.pat(ctx, 'ui_wood');
    if (wp) {
      ctx.fillStyle = wp; ctx.fillRect(x, y, w, h);
      const gi = ctx.createLinearGradient(x, y, x, y + h); // gentle top-light -> shadow for depth
      gi.addColorStop(0, 'rgba(255,236,198,0.10)'); gi.addColorStop(0.5, 'rgba(20,11,3,0.06)'); gi.addColorStop(1, 'rgba(12,6,1,0.24)');
      ctx.fillStyle = gi; ctx.fillRect(x, y, w, h);
    } else { ctx.fillStyle = COL.woodfr; ctx.fillRect(x, y, w, h); }
  },
  // the full-screen parchment page every HD screen sits on
  page(ctx, W, H) {
    const pp = this.pat(ctx, 'ui_parchment');
    if (pp) { ctx.fillStyle = pp; ctx.fillRect(0, 0, W, H); ctx.fillStyle = 'rgba(223,205,166,0.12)'; ctx.fillRect(0, 0, W, H); }
    else { ctx.fillStyle = COL.paper; ctx.fillRect(0, 0, W, H); }
  },
  // PANEL: wood (or parchment) body + optional carved wood title band; frame deferred (topmost).
  // returns the content rect below the title band.
  panel(ctx, r, o) {
    o = o || {};
    const { x, y, w, h } = r;
    if (o.wood) this.woodFill(ctx, x, y, w, h); else this.parchFill(ctx, x, y, w, h);
    this.frame(r);
    if (o.title) {
      let tc = o.tcol || COL.inkdk;
      const wp = this.pat(ctx, 'ui_wood');
      if (wp) {
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, 38); ctx.clip();
        ctx.fillStyle = wp; ctx.fillRect(x, y, w, 38);
        const gb = ctx.createLinearGradient(x, y, x, y + 38);
        gb.addColorStop(0, 'rgba(255,238,200,0.16)'); gb.addColorStop(0.45, 'rgba(0,0,0,0)'); gb.addColorStop(1, 'rgba(18,9,2,0.44)');
        ctx.fillStyle = gb; ctx.fillRect(x, y, w, 38); ctx.restore();
        ctx.fillStyle = 'rgba(255,240,205,0.22)'; ctx.fillRect(x, y, w, 1.5);
        ctx.fillStyle = 'rgba(0,0,0,0.30)'; ctx.fillRect(x, y + 36.5, w, 1.5);
        tc = o.tcol === COL.dkred ? '#ff9a7a' : COL.brasshi;
      }
      TYPE.draw(ctx, o.title, x + 16, y + 11, 24, tc, { display: true, shadow: 'rgba(16,9,3,0.85)', shadowDx: 1.4, shadowDy: 1.4, maxWidth: w - 32 - (o.titleRightW || 0), fit: 'shrink' });
      ctx.strokeStyle = 'rgba(40,26,12,0.7)'; ctx.beginPath(); ctx.moveTo(x + 12, y + 42); ctx.lineTo(x + w - 12, y + 42); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,238,196,0.3)'; ctx.beginPath(); ctx.moveTo(x + 12, y + 43.5); ctx.lineTo(x + w - 12, y + 43.5); ctx.stroke();
      return { x: x + 16, y: y + 52, w: w - 32, h: h - 52 - 16 };
    }
    return { x: x + 16, y: y + 16, w: w - 32, h: h - 32 };
  },
  // CARD: a parchment plaque (aged rim, ink keylines, brass corner studs) floating on wood
  card(ctx, r, o) {
    o = o || {};
    const cx = r.x, cy = r.y, cw = r.w, ch = r.h;
    const rad = Math.min(6, cw / 2, ch / 2);
    ctx.save(); UI.roundRect(ctx, cx, cy, cw, ch, rad); ctx.clip();
    this.parchFill(ctx, cx, cy, cw, ch, 0.28);
    if (o.tint) { ctx.fillStyle = o.tint; ctx.fillRect(cx, cy, cw, ch); }
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(120,84,40,0.45)'; UI.roundRect(ctx, cx + 2, cy + 2, cw - 4, ch - 4, Math.max(1, rad - 1)); ctx.stroke();
    ctx.restore();
    ctx.lineWidth = 1.5; ctx.strokeStyle = o.edge || 'rgba(90,60,28,0.95)'; UI.roundRect(ctx, cx + 0.75, cy + 0.75, cw - 1.5, ch - 1.5, rad); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(74,51,24,0.5)'; UI.roundRect(ctx, cx + 5.5, cy + 5.5, cw - 11, ch - 11, Math.max(1, rad - 3)); ctx.stroke();
    if (cw > 24 && ch > 22 && o.studs !== false) {
      const m = 8, stud = (sx, sy) => {
        ctx.beginPath(); ctx.arc(sx, sy, 2.6, 0, 7); ctx.fillStyle = COL.brassdk; ctx.fill();
        ctx.beginPath(); ctx.arc(sx, sy, 1.7, 0, 7); ctx.fillStyle = COL.brass; ctx.fill();
        ctx.beginPath(); ctx.arc(sx - 0.5, sy - 0.5, 0.8, 0, 7); ctx.fillStyle = COL.brasshi; ctx.fill();
      };
      stud(cx + m, cy + m); stud(cx + cw - m, cy + m); stud(cx + m, cy + ch - m); stud(cx + cw - m, cy + ch - m);
    }
    ctx.lineWidth = 1;
  },
  // RECESS: a brown-paper slot inset into a parchment card (in-card button base)
  recess(ctx, r) {
    const pp = this.pat(ctx, 'ui_parchment');
    if (pp) { ctx.fillStyle = pp; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.fillStyle = 'rgba(78,50,20,0.5)'; ctx.fillRect(r.x, r.y, r.w, r.h); }
    else { ctx.fillStyle = '#72512c'; ctx.fillRect(r.x, r.y, r.w, r.h); }
    ctx.fillStyle = 'rgba(30,18,6,0.30)'; ctx.fillRect(r.x, r.y, r.w, 2);
    ctx.fillStyle = 'rgba(255,238,200,0.14)'; ctx.fillRect(r.x, r.y + r.h - 1.5, r.w, 1.5);
    ctx.strokeStyle = 'rgba(46,30,14,0.9)'; ctx.lineWidth = 1; ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  },
  // meters
  bar(ctx, x, y, w, h, frac, col) { ctx.fillStyle = '#2a1d10'; ctx.fillRect(x, y, w, h); ctx.fillStyle = col; ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac || 0)), h); },
  // a bar that eases toward its value and leaves a lagging pale "damage chunk" when it drops
  meter(ctx, id, r, frac, col) {
    frac = Math.max(0, Math.min(1, frac || 0));
    const shown = this.anim(id + ':v', frac, 16), lag = this.anim(id + ':lag', frac, frac < (this._anim[id + ':lag'] || 0) ? 3 : 40);
    ctx.fillStyle = '#2a1d10'; ctx.fillRect(r.x, r.y, r.w, r.h);
    if (lag > shown) { ctx.fillStyle = 'rgba(255,226,170,0.75)'; ctx.fillRect(r.x, r.y, r.w * lag, r.h); }
    ctx.fillStyle = col; ctx.fillRect(r.x, r.y, r.w * shown, r.h);
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(r.x, r.y, r.w * shown, Math.max(1, r.h * 0.3));
  },
  segbar(ctx, x, y, w, h, frac, col, n) {
    n = n || 8; const g = 2, sw = (w - (n - 1) * g) / n, on = Math.round(Math.max(0, Math.min(1, frac || 0)) * n);
    for (let i = 0; i < n; i++) { ctx.fillStyle = i < on ? col : 'rgba(42,29,16,0.5)'; ctx.fillRect(x + i * (sw + g), y, sw, h); ctx.strokeStyle = 'rgba(42,29,16,0.6)'; ctx.strokeRect(x + i * (sw + g) + 0.5, y + 0.5, sw - 1, h - 1); }
  },
  pipsV(ctx, cx, baseY, total, on, w, h, gap, cOn, cOff) { for (let i = 0; i < total; i++) { ctx.fillStyle = i < on ? cOn : cOff; ctx.fillRect(Math.round(cx - w / 2), baseY - (i + 1) * (h + gap), w, h); } },
  // a row of pips, left to right, pending pips in a third colour
  pipsH(ctx, x, y, total, on, pend, sz, gap, cOn, cPend, cOff) {
    for (let i = 0; i < total; i++) { ctx.fillStyle = i < on ? cOn : i < on + (pend || 0) ? cPend : cOff; ctx.fillRect(x + i * (sz + gap), y, sz, sz); }
  },

  // ---------------- widgets ----------------
  // BUTTON. variants: 'parch' (parchment face + ornate wood frame — the Retreat look; default),
  // 'recess' (brown-paper slot inside a card, light label), 'danger' (parchment, red ink),
  // 'wood' (wood plank face, brass label). o: onClick, onRight, disabled, reason, size, icon(ctx,cx,cy,s,col),
  // sub (second line), frame (default true for parch/danger), live (lit/selected), tip (tooltip lines), sound.
  button(ctx, id, r, label, o) {
    o = o || {};
    const v = o.variant || 'parch';
    const dis = !!o.disabled;
    const reg = this.reg(id, r, { onClick: o.onClick, onRight: o.onRight, disabled: dis, onDenied: o.onDenied, sound: o.sound });
    const hov = this.hovered(id, r), prs = !dis && this.pressed(id, r);
    if (hov) Game.hot = true;
    const ht = this.anim(id + ':h', hov && !dis ? 1 : 0, 18);
    const dy = prs ? 1.5 : 0;
    const R = { x: r.x, y: r.y + dy, w: r.w, h: r.h };
    let lc;
    if (v === 'recess') {
      this.recess(ctx, R);
      if (o.live) { ctx.fillStyle = 'rgba(47,138,114,0.30)'; ctx.fillRect(R.x, R.y, R.w, R.h); }
      if (ht > 0) { ctx.fillStyle = 'rgba(255,236,190,' + (0.18 * ht).toFixed(3) + ')'; ctx.fillRect(R.x, R.y, R.w, R.h); }
      lc = dis ? 'rgba(236,222,190,0.68)' : o.live ? '#bff3e0' : '#f3e6c4';
    } else if (v === 'wood') {
      this.woodFill(ctx, R.x, R.y, R.w, R.h);
      if (ht > 0) { ctx.fillStyle = 'rgba(255,236,190,' + (0.16 * ht).toFixed(3) + ')'; ctx.fillRect(R.x, R.y, R.w, R.h); }
      ctx.strokeStyle = 'rgba(20,10,2,0.8)'; ctx.lineWidth = 1.5; ctx.strokeRect(R.x + 0.75, R.y + 0.75, R.w - 1.5, R.h - 1.5); ctx.lineWidth = 1;
      lc = dis ? 'rgba(236,222,190,0.68)' : COL.brasshi;
    } else {
      this.parchFill(ctx, R.x, R.y, R.w, R.h);
      if (o.live) { ctx.fillStyle = 'rgba(47,138,114,0.16)'; ctx.fillRect(R.x, R.y, R.w, R.h); }
      if (ht > 0) { ctx.fillStyle = 'rgba(255,236,190,' + (0.32 * ht).toFixed(3) + ')'; ctx.fillRect(R.x, R.y, R.w, R.h); }
      if (prs) { ctx.fillStyle = 'rgba(60,36,12,0.16)'; ctx.fillRect(R.x, R.y, R.w, R.h); }
      if (o.frame !== false) this.frame(R);
      lc = dis ? this.C.disabled : v === 'danger' ? this.C.danger : COL.inkdk;
    }
    if (dis && v !== 'recess' && v !== 'wood') { ctx.fillStyle = 'rgba(120,100,70,0.18)'; ctx.fillRect(R.x, R.y, R.w, R.h); }
    const size = o.size || 22;
    let tx = R;
    if (o.icon) {
      const s = Math.min(R.h * 0.62, 34);
      const icx = label ? R.x + 14 + s / 2 : R.x + R.w / 2;
      o.icon(ctx, icx, R.y + R.h / 2, s, lc);
      if (label) tx = { x: R.x + 22 + s, y: R.y, w: R.w - 30 - s, h: R.h };
    }
    if (label) {
      if (o.sub) {
        this.text(ctx, label, { x: tx.x, y: tx.y + 4, w: tx.w, h: tx.h * 0.56 }, { size, color: lc, display: o.display !== false, align: o.icon ? 'left' : 'center', padX: 8 });
        this.text(ctx, o.sub, { x: tx.x, y: tx.y + tx.h * 0.52, w: tx.w, h: tx.h * 0.42 }, { size: Math.round(size * 0.72), color: dis ? lc : (v === 'recess' || v === 'wood' ? '#e8d6ae' : COL.inkmd), italic: true, align: o.icon ? 'left' : 'center', padX: 8, fit: 'ellipsis' });
      } else {
        this.text(ctx, label, tx, { size, color: lc, display: o.display !== false, align: o.icon ? 'left' : 'center', padX: 10, shadow: (v === 'recess' || v === 'wood') ? 'rgba(16,9,3,0.85)' : null, shadowDx: 1, shadowDy: 1 });
      }
    }
    // tooltip: the explicit tip, or the disabled reason (house rule: failures say WHY)
    if (hov) {
      const lines = o.tip ? o.tip.slice() : [];
      if (dis && o.reason) lines.push({ t: o.reason, c: TIP.danger });
      if (lines.length) this.tip(lines, Game.mouse.x, Game.mouse.y);
    }
    return { hover: hov, pressed: prs, reg };
  },
  // FOLDER TABS along the top edge of a page. labels[], active index; onPick(i)
  tabs(ctx, idBase, r, labels, active, onPick, o) {
    o = o || {};
    const n = labels.length, gap = 10, tw = Math.min(o.maxW || 340, (r.w - gap * (n - 1)) / n);
    for (let i = 0; i < n; i++) {
      const on = i === active, x = r.x + i * (tw + gap), R = { x, y: on ? r.y : r.y + 6, w: tw, h: on ? r.h : r.h - 6 };
      const id = idBase + '.' + i;
      const hov = this.hovered(id, R) && !on; if (hov) Game.hot = true;
      this.reg(id, R, { onClick: () => onPick(i) });
      ctx.save(); ctx.beginPath();
      ctx.moveTo(R.x, R.y + R.h); ctx.lineTo(R.x, R.y + 10); ctx.quadraticCurveTo(R.x, R.y, R.x + 10, R.y);
      ctx.lineTo(R.x + R.w - 10, R.y); ctx.quadraticCurveTo(R.x + R.w, R.y, R.x + R.w, R.y + 10); ctx.lineTo(R.x + R.w, R.y + R.h); ctx.closePath();
      ctx.clip();
      this.parchFill(ctx, R.x, R.y, R.w, R.h, on ? 0.42 : 0.12);
      if (!on) { ctx.fillStyle = 'rgba(70,46,18,' + (hov ? 0.12 : 0.26) + ')'; ctx.fillRect(R.x, R.y, R.w, R.h); }
      ctx.restore();
      ctx.strokeStyle = 'rgba(60,38,14,0.9)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(R.x + 0.75, R.y + R.h); ctx.lineTo(R.x + 0.75, R.y + 10); ctx.quadraticCurveTo(R.x + 0.75, R.y + 0.75, R.x + 10, R.y + 0.75);
      ctx.lineTo(R.x + R.w - 10, R.y + 0.75); ctx.quadraticCurveTo(R.x + R.w - 0.75, R.y + 0.75, R.x + R.w - 0.75, R.y + 10); ctx.lineTo(R.x + R.w - 0.75, R.y + R.h); ctx.stroke();
      ctx.lineWidth = 1;
      this.text(ctx, labels[i], R, { size: o.size || 24, display: true, align: 'center', color: on ? COL.inkdk : COL.inkmd, padX: 12 });
    }
  },
  // a recessed icon cell (shop rows, loadout slots)
  iconCell(ctx, r, draw) {
    ctx.save(); UI.roundRect(ctx, r.x, r.y, r.w, r.h, 6); ctx.clip();
    this.parchFill(ctx, r.x, r.y, r.w, r.h, 0.1);
    ctx.fillStyle = 'rgba(70,46,18,0.16)'; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = 'rgba(30,18,6,0.22)'; ctx.fillRect(r.x, r.y, r.w, 2);
    if (draw) draw(r);
    ctx.restore();
    ctx.strokeStyle = 'rgba(74,51,24,0.75)'; ctx.lineWidth = 1; UI.roundRect(ctx, r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1, 6); ctx.stroke();
  },
  // a thin ink rule
  rule(ctx, x1, y, x2, a) {
    ctx.strokeStyle = 'rgba(74,51,24,' + (a == null ? 0.45 : a) + ')'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x1, y + 0.5); ctx.lineTo(x2, y + 0.5); ctx.stroke();
  },
  // dim everything drawn so far and make it inert (dialogs, overlays)
  scrim(ctx, W, H, a) {
    ctx.fillStyle = 'rgba(10,7,4,' + (a == null ? 0.62 : a) + ')'; ctx.fillRect(0, 0, W, H);
    this.blockBelow();
    this.reg('__scrim', { x: 0, y: 0, w: W, h: H }, { sound: false }); // swallow clicks on the dimmed page
  },

  // ---------------- tooltip (one implementation, one delay rule, stays on screen) ----------------
  tip(lines, ax, ay) { this._tip = { lines, ax, ay }; },
  flushTip(ctx, W, H) {
    const t = this._tip; this._tip = null;
    W = W || Game.VW; H = H || Game.VH;
    if (!t || !t.lines || !t.lines.length || !Game.tipReady()) return;
    const k = W / 1920; // scale the scrap for non-HD grids
    const TS = 17 * k, LH = 21 * k, MAXINNER = 520 * k;
    const wrapped = [];
    for (let i = 0; i < t.lines.length; i++) {
      const l = t.lines[i], sz = i === 0 ? TS : TS - 2 * k, disp = i === 0;
      if (!l.t) continue;
      for (const seg of TYPE.wrap(ctx, l.t, MAXINNER, sz, { display: disp })) wrapped.push({ t: seg, c: l.c, sz, disp });
    }
    let mw = 0; for (const l of wrapped) mw = Math.max(mw, TYPE.width(ctx, l.t, l.sz, { display: l.disp }));
    const w = Math.min(560 * k, Math.round(mw) + 40 * k);
    const h = 14 * k + wrapped.length * LH + 10 * k;
    let x = t.ax + 22 * k; if (x + w > W - 8 * k) x = t.ax - w - 18 * k; x = U.clamp(x, 8 * k, W - 8 * k - w);
    const y = U.clamp(t.ay - 10 * k, 8 * k, H - 8 * k - h);
    const r = UI.drawScrap(ctx, x, y, w, h);
    let ty = r.iy + 4 * k;
    for (const l of wrapped) { TYPE.draw(ctx, l.t, r.ix, ty, l.sz, l.c, { display: l.disp, maxWidth: r.iw, fit: 'ellipsis' }); ty += LH; }
  },

  // ---------------- screen transitions ----------------
  _snap: null, _fade: 0, FADE: 0.2,
  canTransition() { return typeof window !== 'undefined' && typeof window.devicePixelRatio === 'number' && typeof document !== 'undefined' && !!document.body; },
  beginTransition(canvas) {
    if (!this.canTransition() || !canvas || this._fade > this.FADE * 0.8) return; // chained setScreens keep the first snapshot
    if (!this._snap) this._snap = document.createElement('canvas');
    if (this._snap.width !== canvas.width || this._snap.height !== canvas.height) { this._snap.width = canvas.width; this._snap.height = canvas.height; }
    const s = this._snap.getContext('2d'); s.setTransform(1, 0, 0, 1, 0, 0); s.drawImage(canvas, 0, 0);
    this._fade = this.FADE;
  },
  drawTransition(ctx) {
    if (this._fade <= 0 || !this._snap) return;
    this._fade = Math.max(0, this._fade - this.dt);
    const a = 1 - this.easeOut(1 - this._fade / this.FADE);
    if (a <= 0.01) return;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a; ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this._snap, 0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  },
};

// ---------------- Stage 2c additions (title / intro / end screens / jukebox / help / lore) ----------------
Object.assign(KIT, {
  // FULL-BLEED painting with gradient scrims. o.stops: [[t 0..1, alpha], ...] painted top->bottom in
  // o.tint (default warm near-black), o.vignette: corner darkening 0..1. Returns false when the art is absent.
  backdrop(ctx, name, W, H, o) {
    o = o || {};
    const e = SPR.artEntry(name);
    if (!e) return false;
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    const iw = e.img.naturalWidth, ih = e.img.naturalHeight, s = Math.max(W / iw, H / ih); // cover-fit
    ctx.drawImage(e.img, (W - iw * s) / 2, (H - ih * s) / 2, iw * s, ih * s);
    ctx.restore();
    this.scrimGrad(ctx, W, H, o.stops, o.tint);
    if (o.vignette) {
      const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.56);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(8,5,2,' + o.vignette + ')');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
    return true;
  },
  // a vertical gradient scrim over the whole screen (soft, never a hard-edged band)
  scrimGrad(ctx, W, H, stops, tint) {
    if (!stops || !stops.length) return;
    const rgb = tint || '12,8,4', g = ctx.createLinearGradient(0, 0, 0, H);
    for (const [t, a] of stops) g.addColorStop(t, 'rgba(' + rgb + ',' + a + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  },
  // a brass ornamental rule centred on cx: two tapering lines and a small lozenge
  ornRule(ctx, cx, y, w, col) {
    col = col || COL.brasshi;
    for (const d of [-1, 1]) {
      const g = ctx.createLinearGradient(cx + d * 14, 0, cx + d * w / 2, 0);
      g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(Math.min(cx + d * 14, cx + d * w / 2), y - 1, w / 2 - 14, 2);
    }
    ctx.save(); ctx.translate(cx, y); ctx.rotate(Math.PI / 4); ctx.fillStyle = col; ctx.fillRect(-5, -5, 10, 10); ctx.restore();
  },
  // CHECKBOX row: a whole-row KIT control (box + label), id-registered. o: onClick, tip, size
  checkbox(ctx, id, r, label, on, o) {
    o = o || {};
    this.reg(id, r, { onClick: o.onClick });
    const hov = this.hovered(id, r); if (hov) Game.hot = true;
    if (hov) { ctx.fillStyle = 'rgba(120,84,40,0.10)'; ctx.fillRect(r.x, r.y, r.w, r.h); }
    const bs = Math.min(26, r.h - 12), bx = r.x + 8, by = r.y + (r.h - bs) / 2;
    ctx.fillStyle = on ? COL.brass : 'rgba(244,232,205,0.75)'; ctx.fillRect(bx, by, bs, bs);
    ctx.lineWidth = 1.5; ctx.strokeStyle = on ? COL.brassdk : 'rgba(74,51,24,0.85)'; ctx.strokeRect(bx + 0.75, by + 0.75, bs - 1.5, bs - 1.5);
    if (on) { // an inked tick
      ctx.strokeStyle = COL.inkdk; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath();
      ctx.moveTo(bx + bs * 0.22, by + bs * 0.52); ctx.lineTo(bx + bs * 0.42, by + bs * 0.74); ctx.lineTo(bx + bs * 0.80, by + bs * 0.26); ctx.stroke();
      ctx.lineCap = 'butt';
    }
    ctx.lineWidth = 1;
    this.text(ctx, label, { x: bx + bs + 12, y: r.y, w: r.w - bs - 28, h: r.h }, { size: o.size || 20, italic: !on, color: on ? COL.inkdk : COL.inkmd, fit: 'shrink' });
    if (hov && o.tip) this.tip(o.tip, Game.mouse.x, Game.mouse.y);
  },
});

// soft dark rounded pill behind floating scene text (combat log, banners) so it reads over bright sky
KIT.pill = function (ctx, x, y, w, h, a) {
  ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, a == null ? 0.5 : a));
  ctx.fillStyle = '#0b0805'; UI.roundRect(ctx, x, y, w, h, Math.min(12, h / 2)); ctx.fill();
  ctx.globalAlpha *= 0.5; ctx.strokeStyle = 'rgba(214,180,110,0.9)'; ctx.lineWidth = 1; UI.roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, Math.min(12, h / 2)); ctx.stroke();
  ctx.restore();
};
