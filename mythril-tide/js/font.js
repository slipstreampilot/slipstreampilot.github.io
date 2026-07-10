// MYTHRIL TIDE - font.js : utilities, palette, and the vector serif TYPE helper
'use strict';

// ---------- utilities ----------
const U = {
  clamp: (v, a, b) => v < a ? a : (v > b ? b : v),
  lerp: (a, b, t) => a + (b - a) * t,
  ri: (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
  rf: (a, b) => a + Math.random() * (b - a),
  pick: arr => arr[Math.floor(Math.random() * arr.length)],
  chance: p => Math.random() < p,
  shuffle: arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
  inRect: (x, y, rx, ry, rw, rh) => x >= rx && x < rx + rw && y >= ry && y < ry + rh,
  // weighted pick: arr of [item, weight]
  wpick: arr => {
    let t = 0; for (const [, w] of arr) t += w;
    let r = Math.random() * t;
    for (const [it, w] of arr) { r -= w; if (r <= 0) return it; }
    return arr[arr.length - 1][0];
  },
  mulberry32: seed => {
    let s = seed >>> 0;
    return () => {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
};

// ---------- SNES-style palette ----------
const COL = {
  black: '#0e0d1d', ink: '#1a1832', dkblue: '#1b2a52', blue: '#3458a8', ltblue: '#6c9bd2',
  cyan: '#7fd4d2', sea: '#1d4474', seahi: '#2f6da6', sealow: '#142f54', steelblue: '#8aa6c0',
  skytop: '#2a3f73', sky: '#5f88c0', skyhi: '#9fc2e0',
  wood: '#8a5a33', woodlt: '#b27c47', wooddk: '#5e3a22', plank: '#a06a3c', deck: '#c89858',
  sail: '#e8e0c8', saildk: '#bdb392',
  gold: '#f0c050', golddk: '#b08020', orange: '#e07830', red: '#c83232', dkred: '#7c1c28',
  green: '#3f9850', dkgreen: '#1f5c38', lime: '#8fd45a',
  purple: '#7c4ca0', dkpurple: '#4a2c66', pink: '#e08ab0',
  grey: '#8c93a6', dkgrey: '#494f63', ltgrey: '#c5cad6', white: '#f4f4ec',
  skin: '#e8b088', skindk: '#b07850',
  mythril: '#bfe8e4', teal: '#2f8f8a',
  fire1: '#f8d850', fire2: '#f08020', water: '#3a6ec8', waterdk: '#27498f',
  parch: '#d8c498', parchdk: '#b89e6c', parchln: '#8a7048',
  // ---- age-of-sail chart/UI palette (graphics overhaul) ----
  paper: '#e3d2ac', paperhi: '#ecdcb6', papermd: '#d4be90', paperlo: '#c3ad80', paperedge: '#b09060',
  inkdk: '#3a2912', inkmd: '#4a3318', inklt: '#6f5530', inkfade: '#8a6f43',
  woodfr: '#906836', woodfrdk: '#5e3f1f', woodfrhi: '#c9a260',
  brass: '#caa24a', brasshi: '#e6c878', brassdk: '#7d5f25',
  chartsea: '#9fb0a6', chartshallow: '#c0ccb4', chartland: '#bca06a', chartlandln: '#7d6233',
  magiccy: '#7fe3da', magicvi: '#b79bff',
  cabin: '#2a1d10', cabinhi: '#3a2917', cabinlo: '#1c130a', cabinln: '#5a432a',
};

// Tooltip text colors, tuned for the torn-parchment SCRAP background (UI.drawScrap).
// Dark ink body + dark-saturated status colors — bright cyan/gold would wash out on paper.
const TIP = {
  ink: '#2a1d10', body: '#4a3318', stat: '#6f5320', special: '#9a4a16',
  danger: '#8f2316', fire: '#a8541a', action: '#1f5a4a', faint: '#6a5230',
};

// (The legacy 5x7 bitmap FONT was fully retired in the June 2026 font overhaul —
// all text now renders via the vector serif TYPE helper below.)

// ---------- TYPE: vector serif text (age-of-sail era fonts) ----------
// Uses the bundled OFL faces 'Spectral' (body/italic) + 'Cinzel' (display).
// Loaded offline via assets/fonts.js (browser) / dev/snap.js registerFont (node-canvas).
// Sizes are in LOGICAL px (the 2x setTransform makes them crisp on the backing buffer).
const TYPE = {
  BODY: 'Spectral', DISPLAY: 'Cinzel',
  fallback: 'Georgia, "Times New Roman", serif',
  fontStr(size, o) {
    o = o || {};
    const fam = o.display ? this.DISPLAY : this.BODY;
    const style = o.italic ? 'italic ' : '';
    const weight = o.display ? '700 ' : (o.weight ? o.weight + ' ' : '');
    return style + weight + size + 'px "' + fam + '", ' + this.fallback;
  },
  set(ctx, size, o) { ctx.font = this.fontStr(size, o); },
  width(ctx, text, size, o) { ctx.save(); this.set(ctx, size, o); const w = ctx.measureText(String(text)).width; ctx.restore(); return w; },
  // x,y is the LEFT/TOP by default (baseline 'top' to mirror the bitmap FONT)
  // Options: align, baseline, italic, display, weight, shadow(+shadowDx/Dy),
  //   maxWidth (+ fit: 'shrink'|'ellipsis'|'clip', default 'shrink'),
  //   outline (color) + outlineW (logical px, default 2) — a dark ring for text over busy scenes.
  draw(ctx, text, x, y, size, color, o) {
    o = o || {};
    text = String(text);
    // honor maxWidth (this option used to be silently ignored).
    let clipBox = null;
    if (o.maxWidth && o.maxWidth > 0 && this.width(ctx, text, size, o) > o.maxWidth) {
      const fit = o.fit || 'shrink';
      if (fit === 'ellipsis') text = this.clipText(ctx, text, o.maxWidth, size, o);
      else if (fit === 'clip') {
        const al = o.align || 'left';
        const bx = al === 'center' ? x - o.maxWidth / 2 : al === 'right' ? x - o.maxWidth : x;
        clipBox = [bx, y - size, o.maxWidth, size * 2.4];
      } else size = this.fitSize(ctx, text, o.maxWidth, size, o);
    }
    ctx.save();
    if (clipBox) { ctx.beginPath(); ctx.rect(clipBox[0], clipBox[1], clipBox[2], clipBox[3]); ctx.clip(); }
    this.set(ctx, size, o);
    ctx.textBaseline = o.baseline || 'top';
    ctx.textAlign = o.align || 'left';
    if (o.outline) {
      const w = o.outlineW || 2;
      ctx.fillStyle = o.outline;
      const offs = [[-1, 0], [1, 0], [0, -1], [0, 1], [-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]];
      for (const [ox, oy] of offs) ctx.fillText(text, x + ox * w, y + oy * w);
    } else if (o.shadow) { ctx.fillStyle = o.shadow; ctx.fillText(text, x + (o.shadowDx || 0.6), y + (o.shadowDy || 0.6)); }
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  },
  drawCentered(ctx, text, cx, y, size, color, o) { o = Object.assign({}, o, { align: 'center' }); this.draw(ctx, text, cx, y, size, color, o); },
  // largest size <= maxSize whose rendered width fits maxW (min 8)
  fitSize(ctx, text, maxW, maxSize, o) { let s = maxSize; while (s > 8 && this.width(ctx, text, s, o) > maxW) s--; return s; },
  // truncate with a trailing ellipsis so the string fits maxW at the given size
  clipText(ctx, text, maxW, size, o) {
    text = String(text);
    if (this.width(ctx, text, size, o) <= maxW) return text;
    const ell = '…';
    let lo = 0, hi = text.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (this.width(ctx, text.slice(0, mid) + ell, size, o) <= maxW) lo = mid; else hi = mid - 1;
    }
    return lo > 0 ? text.slice(0, lo).replace(/\s+$/, '') + ell : ell;
  },
  // centered label, auto-shrunk to fit maxW, vertically centred on cy (middle baseline)
  label(ctx, text, cx, cy, maxW, maxSize, color, o) {
    o = Object.assign({ align: 'center', baseline: 'middle' }, o);
    this.draw(ctx, text, cx, cy, this.fitSize(ctx, text, maxW, maxSize, o), color, o);
  },
  drawRight(ctx, text, rx, y, size, color, o) { o = Object.assign({}, o, { align: 'right' }); this.draw(ctx, text, rx, y, size, color, o); },
  // word-wrap by measured pixel width; returns array of lines
  wrap(ctx, text, maxWidthPx, size, o) {
    ctx.save(); this.set(ctx, size, o);
    const out = [];
    for (const para of String(text).split('\n')) {
      let line = '';
      for (const word of para.split(' ')) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width <= maxWidthPx || !line) line = test;
        else { out.push(line); line = word; }
      }
      out.push(line);
    }
    ctx.restore();
    return out;
  },
  // draw wrapped paragraph; returns y after last line
  // o.maxLines (optional): clip to N lines; the last visible line gets a trailing ellipsis.
  drawWrapped(ctx, text, x, y, maxWidthPx, size, color, o, lineGap) {
    o = o || {};
    lineGap = lineGap === undefined ? Math.round(size * 0.42) : lineGap;
    let lines = this.wrap(ctx, text, maxWidthPx, size, o);
    if (o.maxLines && lines.length > o.maxLines) {
      lines = lines.slice(0, Math.max(1, o.maxLines));
      const last = lines.length - 1;
      lines[last] = this.clipText(ctx, lines[last] + '…', maxWidthPx, size, o);
    }
    for (const ln of lines) { this.draw(ctx, ln, x, y, size, color, o); y += size + lineGap; }
    return y;
  },
};
