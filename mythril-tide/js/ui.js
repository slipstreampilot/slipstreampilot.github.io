// MYTHRIL TIDE - ui.js : event / loot / shop / upgrade / inventory screens
'use strict';

const UI = {
  // engraved brass button (age-of-sail). Serif label auto-fits the width (never overflows).
  drawBtn(ctx, x, y, w, h, label, opts) {
    opts = opts || {};
    const hot = Game.mouse.x >= x && Game.mouse.x < x + w && Game.mouse.y >= y && Game.mouse.y < y + h;
    const dis = opts.disabled;
    ctx.fillStyle = COL.woodfrdk; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = dis ? '#8d846c' : opts.blue ? COL.gold : hot ? COL.brasshi : COL.brass;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(x + 1, y + 1, w - 2, 1);
    ctx.fillStyle = COL.brassdk; ctx.fillRect(x + 1, y + h - 2, w - 2, 1);
    const col = dis ? '#5b513a' : COL.woodfrdk;
    const size = h >= 18 ? 12 : h >= 14 ? 11 : 10;
    if (opts.left) { const s = TYPE.fitSize(ctx, label, w - 10, size); TYPE.draw(ctx, label, x + 5, y + (h - s) / 2 - 0.5, s, col, { display: !!opts.display }); }
    else TYPE.label(ctx, label, x + w / 2, y + h / 2, w - 8, size, col, { display: !!opts.display });
    if (hot && !dis) Game.hot = true;
    return hot;
  },
  // FTL-style chunky rounded panel with a tab label
  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },
  // ---- shared tile + 9-slice chrome (the combat look, reused across every menu) ----
  _pat: {},
  // cache ONLY on hit: art decodes async at boot, so caching a miss (null) on an early frame
  // would strip the wood/parchment skin for the whole session. A miss retries next frame. (R4)
  tilePat(ctx, name) {
    if (!this._pat[name]) { const e = SPR.artEntry(name); if (e) this._pat[name] = ctx.createPattern(e.img, 'repeat'); }
    return this._pat[name] || null;
  },
  tileFill(ctx, name, x, y, w, h, tint) {
    const p = this.tilePat(ctx, name); if (!p) return false;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = p; ctx.fillRect(x, y, w, h);
    if (tint) { ctx.fillStyle = tint; ctx.fillRect(x, y, w, h); }
    ctx.restore(); return true;
  },
  // border-only nine-slice (the ornate frame's center is opaque, so we never draw it)
  draw9(ctx, name, x, y, w, h, si, di) {
    const e = SPR.artEntry(name); if (!e) return false;
    const g = e.img, sw = g.naturalWidth, sh = g.naturalHeight, sR = sw - si, sB = sh - si, dR = x + w - di, dB = y + h - di;
    ctx.drawImage(g, 0, 0, si, si, x, y, di, di); ctx.drawImage(g, sR, 0, si, si, dR, y, di, di);
    ctx.drawImage(g, 0, sB, si, si, x, dB, di, di); ctx.drawImage(g, sR, sB, si, si, dR, dB, di, di);
    ctx.drawImage(g, si, 0, sw - 2 * si, si, x + di, y, w - 2 * di, di); ctx.drawImage(g, si, sB, sw - 2 * si, si, x + di, dB, w - 2 * di, di);
    ctx.drawImage(g, 0, si, si, sh - 2 * si, x, y + di, di, h - 2 * di); ctx.drawImage(g, sR, si, si, sh - 2 * si, dR, y + di, di, h - 2 * di);
    return true;
  },
  // the surround behind framed screens — a warm dark-walnut desk (was a cold grey stone tile)
  stoneBg(ctx) {
    if (this.tileFill(ctx, 'ui_wood', 0, 0, 512, 288, 'rgba(10,6,2,0.58)')) return true;
    ctx.fillStyle = COL.cabinlo; ctx.fillRect(0, 0, 512, 288); return true;
  },
  // a uniform TILED-wood border framing the whole 512x288 screen (grain repeats at native
  // scale, never stretched), with a brass inner keyline + corner studs. Returns the inner
  // content rect {ix,iy,iw,ih,t}. Use for full-screen framed views (map, decks, menus).
  woodBorder(ctx, t) {
    t = t || 24; const W = 512, H = 288;
    const wood = (x, y, w, h) => { if (!this.tileFill(ctx, 'ui_wood', x, y, w, h, 'rgba(22,13,5,0.28)')) { ctx.fillStyle = COL.woodfr; ctx.fillRect(x, y, w, h); } };
    wood(0, 0, W, t); wood(0, H - t, W, t); wood(0, t, t, H - 2 * t); wood(W - t, t, t, H - 2 * t);
    // bevel: light top/left, dark bottom/right (reads as a raised wooden frame)
    ctx.fillStyle = 'rgba(255,238,196,0.14)'; ctx.fillRect(0, 0, W, 1); ctx.fillRect(0, 0, 1, H);
    ctx.fillStyle = 'rgba(8,5,2,0.42)'; ctx.fillRect(0, H - 1, W, 1); ctx.fillRect(W - 1, 0, 1, H);
    const ix = t, iy = t, iw = W - 2 * t, ih = H - 2 * t;
    // inner shadow where wood meets the opening (depth)
    ctx.fillStyle = 'rgba(8,5,2,0.32)';
    ctx.fillRect(ix - 2, iy - 2, iw + 4, 2); ctx.fillRect(ix - 2, iy + ih, iw + 4, 2);
    ctx.fillRect(ix - 2, iy - 2, 2, ih + 4); ctx.fillRect(ix + iw, iy - 2, 2, ih + 4);
    // brass keyline around the opening
    ctx.strokeStyle = COL.brassdk; ctx.lineWidth = 1; ctx.strokeRect(ix - 1.5, iy - 1.5, iw + 3, ih + 3);
    ctx.strokeStyle = COL.brasshi; ctx.strokeRect(ix - 0.5, iy - 0.5, iw + 1, ih + 1);
    // brass corner studs
    for (const [cx, cy] of [[ix, iy], [ix + iw, iy], [ix, iy + ih], [ix + iw, iy + ih]]) {
      ctx.fillStyle = COL.brassdk; ctx.fillRect(cx - 3, cy - 3, 6, 6);
      ctx.fillStyle = COL.brass; ctx.fillRect(cx - 2, cy - 2, 4, 4);
      ctx.fillStyle = COL.brasshi; ctx.fillRect(cx - 1, cy - 1, 2, 2);
    }
    return { ix, iy, iw, ih, t };
  },
  // a 2-LAYER framed page: the wood border + a PARCHMENT fill in its opening, with an optional
  // brass title band. No stone, no nested ornate panel. Returns the content rect {x,y,w,h,cx}.
  parchmentScreen(ctx, title) {
    const r = this.woodBorder(ctx, 24);
    if (!this.tileFill(ctx, 'ui_parchment', r.ix, r.iy, r.iw, r.ih, 'rgba(244,232,205,0.18)')) { ctx.fillStyle = COL.paper; ctx.fillRect(r.ix, r.iy, r.iw, r.ih); }
    this.statBar(ctx);
    let cy = r.iy;
    if (title) {
      ctx.fillStyle = COL.brass; ctx.fillRect(r.ix, r.iy, r.iw, 20);
      ctx.fillStyle = COL.brassdk; ctx.fillRect(r.ix, r.iy + 20, r.iw, 1);
      TYPE.label(ctx, title, r.ix + r.iw / 2, r.iy + 10, r.iw - 16, 14, COL.woodfrdk, { display: true });
      cy = r.iy + 22;
    }
    return { x: r.ix, y: cy, w: r.iw, h: r.iy + r.ih - cy, cx: r.ix + r.iw / 2 };
  },
  // tile interior ('wood' = dark for light text, 'parchment' = light for ink) + ornate brass frame
  framePanel(ctx, x, y, w, h, fill) {
    const parch = fill === 'parchment';
    if (!this.tileFill(ctx, parch ? 'ui_parchment' : 'ui_wood', x, y, w, h, parch ? 'rgba(244,232,205,0.20)' : 'rgba(16,10,4,0.32)')) {
      ctx.fillStyle = parch ? COL.paper : COL.cabin; ctx.fillRect(x, y, w, h);
    }
    // frame sits ENTIRELY OUTSIDE the content rect (inner edge == x,y) so it never covers content
    if (!this.draw9(ctx, 'ui_panel_frame', x - 9, y - 9, w + 18, h + 18, 94, 9)) {
      ctx.lineWidth = 2; ctx.strokeStyle = COL.brassdk; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2); ctx.lineWidth = 1;
    }
  },
  // walnut cabin panel with a brass-edged serif title plate (age-of-sail belowdecks)
  ftlPanel(ctx, x, y, w, h, label, labelCol) {
    this.framePanel(ctx, x, y, w, h, 'wood');
    if (label) {
      const lw = TYPE.width(ctx, label, 12, { display: true }) + 16;
      ctx.fillStyle = labelCol || COL.brass;
      ctx.beginPath();
      ctx.moveTo(x + 8, y - 10);
      ctx.lineTo(x + 8 + lw, y - 10);
      ctx.lineTo(x + 8 + lw + 7, y + 2);
      ctx.lineTo(x + 8, y + 2);
      ctx.closePath(); ctx.fill();
      TYPE.draw(ctx, label, x + 14, y - 9, 12, COL.woodfrdk, { display: true });
    }
  },
  panel(ctx, x, y, w, h, title, fill) {
    this.framePanel(ctx, x, y, w, h, fill || 'wood');
    if (title) {
      // frame is outside the rect now, so the title sits at the very top of the content.
      // TYPE.label's y is the VERTICAL CENTER, so center it inside the bar (not at its top).
      ctx.fillStyle = COL.brass;
      ctx.fillRect(x + 1, y + 1, w - 2, 16);
      TYPE.label(ctx, title, x + w / 2, y + 9, w - 12, 12, COL.woodfrdk, { display: true });
    }
  },
  // a clean recessed compartment for screens already inside the wood cabinet frame: a darker
  // walnut recess, a thin brass keyline, and a FLAT brass title bar seated across the top
  // (no slant, no second ornate frame -> nothing collides with the outer border). Returns the
  // content rect that sits BELOW the title bar. TITLE_H is fixed so callers can grid to it.
  TITLE_H: 17,
  compartment(ctx, x, y, w, h, label, labelCol) {
    if (!this.tileFill(ctx, 'ui_wood', x, y, w, h, 'rgba(8,5,2,0.58)')) { ctx.fillStyle = COL.cabinlo; ctx.fillRect(x, y, w, h); }
    // recessed bevel: dark top/left, faint light bottom/right
    ctx.fillStyle = 'rgba(0,0,0,0.40)'; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y, 1, h);
    ctx.fillStyle = 'rgba(255,238,196,0.10)'; ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x + w - 1, y, 1, h);
    ctx.strokeStyle = COL.brassdk; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    let cy = y + 2;
    if (label) {
      const bh = this.TITLE_H;
      ctx.fillStyle = labelCol || COL.brass; ctx.fillRect(x + 2, y + 2, w - 4, bh);
      ctx.fillStyle = 'rgba(255,255,255,0.20)'; ctx.fillRect(x + 2, y + 2, w - 4, 1);
      ctx.fillStyle = COL.brassdk; ctx.fillRect(x + 2, y + 2 + bh, w - 4, 1);
      TYPE.label(ctx, label, x + w / 2, y + 2 + bh / 2, w - 14, 12, COL.woodfrdk, { display: true });
      cy = y + 2 + bh + 2;
    }
    return { x: x + 6, y: cy, w: w - 12, h: y + h - cy - 4 };
  },
  // a ruled LEDGER section drawn on a parchment page: a thin sepia ruled box, an ink serif
  // heading, and a rule beneath it (a manifest/account-book look). No fill — the parchment
  // page shows through. Returns the content rect below the heading rule.
  ledgerSection(ctx, x, y, w, h, title) {
    ctx.strokeStyle = COL.parchln; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.strokeStyle = COL.parchdk; ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5); // inner hairline = double rule
    let cy = y + 4;
    if (title) {
      TYPE.label(ctx, title, x + w / 2, y + 12, w - 16, 13, COL.inkdk, { display: true });
      ctx.fillStyle = COL.parchln; ctx.fillRect(x + 7, y + 21, w - 14, 1);
      ctx.fillStyle = COL.parchdk; ctx.fillRect(x + 7, y + 23, w - 14, 1);
      cy = y + 28;
    }
    return { x: x + 8, y: cy, w: w - 16, h: y + h - cy - 6 };
  },
  // parchment FILE-FOLDER tabs (auto-fit serif labels). Rounded top, flat bottom that
  // meets the content below; the active tab is brighter parchment and stands slightly proud.
  tabBar(ctx, x, y, w, tabs, active) {
    const n = tabs.length, gap = 4, H = 22, r = 7, tw = Math.floor((w - (n - 1) * gap) / n);
    const rects = [];
    for (let i = 0; i < n; i++) {
      const tx = x + i * (tw + gap), on = i === active;
      const hot = Game.mouse.x >= tx && Game.mouse.x < tx + tw && Game.mouse.y >= y && Game.mouse.y < y + H;
      if (hot) Game.hot = true;
      const top = on ? y : y + 3, h = (y + H) - top; // active tab a touch taller
      ctx.fillStyle = COL.woodfrdk; this.folderTab(ctx, tx - 1, top - 1, tw + 2, h + 2, r + 1); ctx.fill(); // frame
      ctx.fillStyle = on ? COL.paperhi : (hot ? COL.papermd : COL.paperlo);
      this.folderTab(ctx, tx, top, tw, h, r); ctx.fill();
      ctx.fillStyle = 'rgba(255,248,220,0.35)'; ctx.fillRect(tx + r, top + 1, tw - 2 * r, 1); // top sheen
      TYPE.label(ctx, tabs[i], tx + tw / 2, top + h / 2 + 1, tw - 10, 12, on ? COL.inkdk : COL.inklt, { display: true });
      rects.push({ x: tx, y, w: tw, h: H });
    }
    return rects;
  },
  // path for a folder tab: rounded TOP corners, square bottom (sits on the content panel)
  folderTab(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
  },

  // ---- torn parchment SCRAP: the shared tooltip container (age-of-sail look) ----
  // Procedural: ragged on all four edges, a dog-eared corner, soft drop shadow that floats
  // it over the scene. Edges are seeded from x/y so a tooltip is stable frame-to-frame but
  // different scraps look different. Returns the inner text rect {ix, iy, iw}.
  // NOTE: callers should leave ~6px bottom padding so text clears the dog-ear corner.
  drawScrap(ctx, x, y, w, h) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const D = Math.min(16, h * 0.3, w * 0.24); // dog-ear size
    // build the ragged outline (deterministic per position)
    const tornPath = () => {
      let s = ((x * 131 + y * 977 + w * 17) >>> 0) || 1;
      const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
      const pts = [];
      const edge = (ax, ay, bx, by, amp) => {
        const len = Math.hypot(bx - ax, by - ay), steps = Math.max(5, Math.round(len / 7));
        let nx = (by - ay), ny = -(bx - ax); const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
        let off = 0;
        for (let i = 0; i <= steps; i++) { const t = i / steps; off = off * 0.55 + (r() - 0.5) * amp; let j = off; if (r() < 0.12) j += (r() - 0.5) * amp * 2; if (i === 0 || i === steps) j *= 0.3; pts.push([ax + (bx - ax) * t + nx * j, ay + (by - ay) * t + ny * j]); }
      };
      edge(x, y, x + w, y, 2.2);              // top
      edge(x + w, y, x + w, y + h - D, 2.0);  // right (stops before the dog-ear)
      pts.push([x + w - D, y + h]);           // dog-ear fold (straight)
      edge(x + w - D, y + h, x, y + h, 2.2);  // bottom
      edge(x, y + h, x, y, 2.0);              // left
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath();
    };
    // soft drop shadow
    ctx.save(); ctx.shadowColor = 'rgba(8,10,22,0.5)'; ctx.shadowBlur = 7; ctx.shadowOffsetX = 1.5; ctx.shadowOffsetY = 4; tornPath(); ctx.fillStyle = COL.paper; ctx.fill(); ctx.restore();
    // parchment gradient
    tornPath(); const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, COL.paperhi); g.addColorStop(0.5, COL.paper); g.addColorStop(1, COL.papermd); ctx.fillStyle = g; ctx.fill();
    // stains + edge vignette (clipped)
    ctx.save(); tornPath(); ctx.clip();
    let ss = ((x * 71 + y * 233) >>> 0) || 1; const sr = () => { ss = (ss * 1664525 + 1013904223) >>> 0; return ss / 4294967296; };
    for (let i = 0; i < 5; i++) { const cx = x + sr() * w, cy = y + sr() * h, rr = 8 + sr() * 20; const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr); rg.addColorStop(0, 'rgba(150,118,66,0.10)'); rg.addColorStop(1, 'rgba(150,118,66,0)'); ctx.fillStyle = rg; ctx.fillRect(x, y, w, h); }
    const vg = ctx.createLinearGradient(x, 0, x + w, 0); vg.addColorStop(0, 'rgba(120,92,46,0.20)'); vg.addColorStop(0.09, 'rgba(120,92,46,0)'); vg.addColorStop(0.91, 'rgba(120,92,46,0)'); vg.addColorStop(1, 'rgba(120,92,46,0.20)'); ctx.fillStyle = vg; ctx.fillRect(x, y, w, h);
    ctx.restore();
    // torn-edge ink line
    tornPath(); ctx.strokeStyle = 'rgba(110,84,42,0.5)'; ctx.lineWidth = 1; ctx.stroke();
    // dog-ear flap (back of the paper catches light)
    ctx.beginPath(); ctx.moveTo(x + w, y + h - D); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - D, y + h); ctx.closePath();
    const fg = ctx.createLinearGradient(x + w - D, y + h - D, x + w, y + h); fg.addColorStop(0, COL.paperhi); fg.addColorStop(1, COL.papermd); ctx.fillStyle = fg; ctx.fill();
    ctx.strokeStyle = 'rgba(110,84,42,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + w, y + h - D); ctx.lineTo(x + w - D, y + h); ctx.stroke();
    return { ix: x + 9, iy: y + 7, iw: w - 18 };
  },
  statBar(ctx) {
    ctx.fillStyle = COL.woodfr; ctx.fillRect(0, 0, 512, 15);
    ctx.fillStyle = COL.woodfrhi; ctx.fillRect(0, 0, 512, 1);
    ctx.fillStyle = COL.woodfrdk; ctx.fillRect(0, 14, 512, 1);
    let sx = 6;
    const stat = (icon, val, col) => { if (icon === 'shard' || icon === 'runeshot' || icon === 'candle') UI.drawRes(ctx, icon, sx, 2, 11); else if (icon === 'hull') drawSysSym(ctx, 'hull', sx, 1, 12, COL.brasshi); else { const ic = SPR.icon(icon); if (ic) ctx.drawImage(ic, sx, 2); } TYPE.draw(ctx, '' + val, sx + 13, 2, 11, col); sx += 13 + TYPE.width(ctx, '' + val, 11) + 14; };
    stat('hull', Game.ship.hull + '/' + Game.ship.hullMax, COL.paperhi);
    stat('shard', Game.run.shards, COL.brasshi);
    stat('runeshot', Game.run.runeshot, COL.pink);
    stat('candle', Game.run.candles || 0, COL.gold);
    const region = UI.regionLabel(Game.run.region);
    const regionLeft = 506 - TYPE.width(ctx, region, 11, { italic: true });
    TYPE.draw(ctx, 'Crew ' + Game.ship.aliveCrew().length + '/8', sx, 2, 11, COL.paperhi, { maxWidth: Math.max(24, regionLeft - 8 - sx), fit: 'shrink' });
    TYPE.drawRight(ctx, region, 506, 2, 11, '#d8c79a', { italic: true });
  },

  // ---------- apply event effects ----------
  applyFx(fx) {
    const notes = [];
    const run = Game.run, ship = Game.ship;
    if (fx.special === 'repair2') {
      const missing = ship.hullMax - ship.hull;
      const afford = Math.min(missing, Math.floor(run.shards / 2));
      run.shards -= afford * 2;
      ship.hull += afford;
      return ['THE DOCK REPAIRS ' + afford + ' HULL FOR ' + (afford * 2) + ' SHARDS.'];
    }
    if (fx.shards) { run.shards = Math.max(0, run.shards + fx.shards); notes.push((fx.shards > 0 ? '+' : '') + fx.shards + ' SHARDS'); }
    if (fx.runeshot) { run.runeshot = Math.max(0, run.runeshot + fx.runeshot); notes.push((fx.runeshot > 0 ? '+' : '') + fx.runeshot + ' RUNESHOT'); }
    if (fx.hull) { ship.hull = U.clamp(ship.hull + fx.hull, 1, ship.hullMax); notes.push((fx.hull > 0 ? '+' : '') + fx.hull + ' HULL'); }
    if (fx.heal) { for (const c of ship.aliveCrew()) c.hp = Math.min(c.maxhp, c.hp + fx.heal); notes.push('CREW HEALED'); }
    if (fx.mana) {
      // clamp to the hard cap (a +2 reward at cap-1 used to overshoot) and keep manaBought accurate
      if (ship.manaMax < DATA.CORE_MAX) { const add = Math.min(fx.mana, DATA.CORE_MAX - ship.manaMax); ship.manaMax += add; run.manaBought += add; notes.push('+' + add + ' MAX MANA'); }
      else notes.push('MANA HEARTHSTONE ALREADY AT PEAK');
    }
    if (fx.sysUp) {
      const k = fx.sysUp;
      if (ship.sysLv[k] > 0 && ship.sysLv[k] < DATA.SYSTEMS[k].max) { ship.sysLv[k]++; notes.push(DATA.SYSTEMS[k].name.toUpperCase() + ' UPGRADED FREE'); }
      else notes.push('NO ROOM TO IMPROVE ' + DATA.SYSTEMS[k].name.toUpperCase());
    }
    if (fx.crew) {
      const race = fx.crew === 'random' ? U.pick(Object.keys(DATA.RACES)) : fx.crew;
      if (ship.aliveCrew().length < 8) {
        const c = ship.addCrew(race);
        c.owner = 'player';
        notes.push(c.name.toUpperCase() + ' THE ' + DATA.RACES[race].name.toUpperCase() + ' JOINS YOU!');
      } else { run.shards += 15; notes.push('NO BUNKS LEFT - THEY PAY 15 SHARDS PASSAGE INSTEAD'); }
    }
    if (fx.loseCrew) {
      const alive = ship.aliveCrew();
      if (alive.length > 1) {
        const c = U.pick(alive);
        c.dead = true; c.hp = 0;
        run.stats.crewLost++;
        notes.push(c.name.toUpperCase() + ' IS GONE.');
      } else notes.push('YOUR LAST SAILOR CLINGS ON.');
    }
    if (fx.weapon) {
      let key = fx.weapon;
      // random rewards must never hand out hidden familiar pseudo-weapons or the
      // playtest cheat cannon (named events may still grant a specific weapon).
      const lootable = k => !DATA.WEAPONS[k].hidden && !DATA.WEAPONS[k].cheat;
      if (key === 'random') key = U.pick(Object.keys(DATA.WEAPONS).filter(lootable));
      else if (key.startsWith('random:')) {
        const race = key.split(':')[1];
        key = U.pick(Object.keys(DATA.WEAPONS).filter(k => DATA.WEAPONS[k].race === race && lootable(k)));
      }
      notes.push(this.gainWeapon(key));
    }
    if (fx.aug) {
      let key = fx.aug;
      const unowned = Object.keys(DATA.AUGS).filter(a => !run.augs.includes(a));
      if (key === 'random') key = unowned.length ? U.pick(unowned) : null;
      if (key && run.augs.includes(key)) { notes.push('YOU ALREADY CARRY THAT AUGMENT'); }
      else if (key && run.augs.length < 3) {
        this.installAug(key);
        notes.push('AUGMENT: ' + DATA.AUGS[key].name.toUpperCase());
      } else if (key) {
        // no slot free: let the captain choose what to keep (never auto-sell the reward)
        run.pendingAug = key;
        notes.push('NO AUGMENT SLOT FREE - YOU WILL CHOOSE WHAT TO KEEP.');
      } else notes.push('NOTHING NEW TO LEARN');
    }
    if (fx.front) { run.front += fx.front; notes.push('THE ARMADA GAINS ON YOU!'); }
    return notes;
  },
  // ---- weapon info (shared by shop, weapon-choice, inventory) ----
  weaponStat(wd) {
    const type = (wd.family || 'weapon').toUpperCase();
    const dmg = (wd.dmg || 0) + (wd.shots > 1 ? 'x' + wd.shots : '');
    return type + '  ' + (wd.power || 0) + ' MANA  ' + wd.charge + 'S CHG  ' + dmg + ' DMG';
  },
  weaponSpecials(wd) {
    const s = [];
    if (wd.type === 'beam') s.push('beam · reach ' + (wd.length || 4) + ' tiles · ' + (wd.dmg || 0) + ' dmg/room · never misses');
    if (wd.type === 'missile') s.push('torpedo - ignores wards');
    else if (wd.type === 'bomb') s.push('ignores wards');
    if (wd.type === 'missile' || wd.type === 'bomb') s.push(wd.noRune ? 'no runeshot needed' : 'costs 1 runeshot');
    if (wd.fire) s.push('ignites (' + Math.round(wd.fire * 100) + '%)');
    if (wd.leak) s.push('breaches hull');
    if (wd.flood) s.push('floods the room');
    if (wd.ion) s.push('drains ' + wd.ion + ' mana');
    if (wd.stun) s.push(Math.round(wd.stun * 100) + '% stun room');
    if (wd.stunRoom) s.push('stuns room ' + wd.stunRoom + 's');
    if (wd.poison) s.push('poisons crew');
    if (wd.crewDmg) s.push(wd.crewDmg + ' crew damage');
    if (wd.pierce) s.push('pierces ' + wd.pierce + ' ward layer' + (wd.pierce > 1 ? 's' : ''));
    if (wd.scatter) s.push('scatters across rooms');
    if (wd.ramp) s.push('charges faster in a streak');
    if (wd.charger) s.push('banks ' + wd.charger + ' shots');
    if (wd.blind) s.push('blinds the helm');
    if (wd.nullMana) s.push('drains the struck system');
    if (wd.sealDoors) s.push('seals doors shut');
    if (wd.lure) s.push('lures ' + wd.lure + ' crew away');
    if (wd.healCrew) s.push('heals your crew');
    if (wd.vsSails) s.push('extra vs sails');
    if (wd.selfCast) s.push('target YOUR ship');
    return s.join(', ');
  },
  // ---- the one canonical item info card, reused by shop + ship menu + choice screens ----
  AUG_ICONS: {
    mythril_plating: 'hull', windrider: 'sails', dwarven_pumps: 'drop', phoenix_ash: 'flame',
    siren_lure: 'runeshot', golden_compass: 'lookout', tidecaller_pearl: 'wards',
    runeforge: 'core', selkie_cloak: 'drop', merchant_seal: 'shard',
    emberheart: 'flame', sirens_crown: 'skull', ghost_figurehead: 'anchor',
    leviathan_pact: 'drop', stormcaller_mast: 'sails', tidal_heart: 'brinegate',
  },
  // draw an augment icon: AI art (icon_aug_<key>) when present, else the procedural fallback
  drawAugIcon(ctx, key, x, y, s) {
    s = s || 14;
    if (SPR.drawArt(ctx, 'icon_aug_' + key, x, y, s, s)) return;
    const ic = SPR.icon(UI.AUG_ICONS[key] || 'shard'); if (ic) ctx.drawImage(ic, x, y);
  },
  // draw a resource icon (shards / runeshot): AI art (icon_res_*) when present, else procedural pixel icon
  drawRes(ctx, kind, x, y, s) {
    s = s || 11;
    if (kind === 'candle') { // Seance Candle: hi-res AI art when present, else a procedural taper
      if (SPR.drawArt(ctx, 'icon_res_candle', x, y, s, s)) return;
      ctx.save();
      ctx.fillStyle = '#ece3c6'; ctx.fillRect(x + s * 0.36, y + s * 0.34, s * 0.28, s * 0.58); // wax body
      ctx.fillStyle = COL.brassdk; ctx.fillRect(x + s * 0.32, y + s * 0.9, s * 0.36, s * 0.08); // holder
      ctx.fillStyle = COL.orange; ctx.beginPath(); ctx.ellipse(x + s * 0.5, y + s * 0.26, s * 0.12, s * 0.2, 0, 0, 7); ctx.fill(); // flame
      ctx.fillStyle = '#ffe6a0'; ctx.beginPath(); ctx.ellipse(x + s * 0.5, y + s * 0.29, s * 0.05, s * 0.1, 0, 0, 7); ctx.fill(); // flame core
      ctx.restore(); return;
    }
    const art = kind === 'shard' ? 'icon_res_manashards' : 'icon_res_runeshot';
    if (SPR.drawArt(ctx, art, x, y, s, s)) return;
    const ic = SPR.icon(kind); if (ic) ctx.drawImage(ic, x, y);
  },
  // region progress label, e.g. "III of VIII" — single source for every top/bottom bar.
  regionLabel(region) { return (['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][region] || (region + 1)) + ' of VIII'; },
  // HD resource triad (Mythril Shards · Runeshot · Seance Candles) — the combat-screen bar:
  // icon+number pairs centered in equal thirds, ink dividers between. Caller draws the panel first.
  // x,y,w = the panel rect (height 72); both combat (game.js) and the HD map (map.js) call this.
  resTriadHD(ctx, x, y, w, run) {
    const third = w / 3;
    ctx.strokeStyle = 'rgba(90,60,28,0.42)'; ctx.lineWidth = 1.5;
    for (const dx of [x + third, x + 2 * third]) { ctx.beginPath(); ctx.moveTo(dx, y + 16); ctx.lineTo(dx, y + 56); ctx.stroke(); }
    ctx.lineWidth = 1;
    const cell = (cx, kind, num, iconW, iconY) => {
      const s = '' + (num || 0), nw = TYPE.width(ctx, s, 34), ix = Math.round(cx - (iconW + 9 + nw) / 2);
      UI.drawRes(ctx, kind, ix, iconY, iconW);
      TYPE.draw(ctx, s, ix + iconW + 9, y + 36, 34, COL.inkdk, { baseline: 'middle' });
    };
    cell(x + third * 0.5, 'shard', run.shards, 46, y + 13);
    cell(x + third * 1.5, 'runeshot', run.runeshot, 46, y + 13);
    cell(x + third * 2.5, 'candle', run.candles, 48, y + 12);
  },
  itemInfo(it) {
    if (it.kind === 'weapon') return { name: DATA.WEAPONS[it.key].name, desc: DATA.WEAPONS[it.key].desc };
    if (it.kind === 'aug') return { name: DATA.AUGS[it.key].name, desc: DATA.AUGS[it.key].desc };
    if (it.kind === 'crew') return { name: DATA.RACES[it.key].name + ' Sailor', desc: DATA.RACES[it.key].desc };
    if (it.kind === 'familiar') return { name: DATA.FAMILIARS[it.key].name, desc: DATA.FAMILIARS[it.key].desc + ' Needs a powered Binding Shrine.' };
    if (it.kind === 'system') return { name: DATA.SYSTEMS[it.key].name, desc: DATA.SYSTEMS[it.key].desc + ' Installs to an open mount (' + DATA.OPEN_MOUNTS + ' max).' };
    if (it.kind === 'candle') return { name: "Seance Candle", desc: 'Lit at the Binding Shrine to deploy or re-bind an orbiting familiar. Each casting burns one.' };
    return { name: 'Runeshot', desc: 'Ammunition for bombs and torpedoes. They slip under enemy wards.' };
  },
  // full hover card near the cursor: name, weapon stats, specials, wrapped desc - never truncated
  itemCard(ctx, it, pinBottom) {
    if (!Game.tipReady()) return;
    const info = this.itemInfo(it);
    const wd = it.kind === 'weapon' ? DATA.WEAPONS[it.key] : null;
    const W = 256, inner = W - 20, lines = [];
    lines.push({ t: info.name, c: TIP.ink, s: 13, it: false });
    if (wd) {
      lines.push({ t: this.weaponStat(wd), c: TIP.stat, s: 11, it: false });
      const spec = this.weaponSpecials(wd);
      if (spec) for (const l of TYPE.wrap(ctx, spec, inner, 10, { italic: true })) lines.push({ t: l, c: TIP.special, s: 10, it: true });
    }
    for (const l of TYPE.wrap(ctx, info.desc, inner, 10, { italic: true })) lines.push({ t: l, c: TIP.body, s: 10, it: true });
    let H = 12; for (const l of lines) H += l.s + 3; H += 6; // bottom pad clears the dog-ear
    let x, y;
    if (pinBottom != null) { // fixed slot (menus): never covers the item being hovered
      x = U.clamp(Math.round((512 - W) / 2), 6, 506 - W);
      y = U.clamp(pinBottom - H, 6, 282 - H);
    } else { // cursor-following (shop)
      x = Game.mouse.x + 14; if (x + W > 506) x = Game.mouse.x - W - 10; x = U.clamp(x, 6, 506 - W);
      y = U.clamp(Game.mouse.y - 6, 6, 282 - H);
    }
    const r = UI.drawScrap(ctx, x, y, W, H);
    let ty = r.iy + 2;
    for (const l of lines) { TYPE.draw(ctx, l.t, r.ix, ty, l.s, l.c, { italic: l.it, display: l.s >= 13 }); ty += l.s + 3; }
  },
  // ---- shared sell/install (was duplicated across 4+ sites) ----
  sellWeaponValue(key) { return Math.floor(DATA.WEAPONS[key].cost / 2); },
  sellWeapon(from, idx) {
    const run = Game.run;
    let key;
    if (from === 'mount') { key = Game.ship.weapons[idx].key; Game.ship.weapons.splice(idx, 1); }
    else { key = run.cargo[idx]; run.cargo.splice(idx, 1); }
    const value = this.sellWeaponValue(key);
    run.shards += value;
    return { key, value };
  },
  installAug(key) {
    Game.run.augs.push(key);
    if (key === 'mythril_plating') { Game.ship.hullMax += 5; Game.ship.hull += 5; }
  },
  sellAug(idx) {
    const key = Game.run.augs[idx];
    const value = Math.floor(DATA.AUGS[key].cost / 2);
    Game.run.augs.splice(idx, 1);
    if (key === 'mythril_plating') {
      Game.ship.hullMax = Math.max(1, Game.ship.hullMax - 5);
      Game.ship.hull = Math.min(Game.ship.hull, Game.ship.hullMax);
    }
    Game.run.shards += value;
    return { key, value };
  },
  sellFamiliar(idx) {
    const key = Game.run.familiars[idx];
    const value = Math.floor(DATA.FAMILIARS[key].cost / 2);
    Game.run.familiars.splice(idx, 1);
    Game.run.shards += value;
    return { key, value };
  },
  // ---- shared loadout model (mounts + 2 cargo) — used by Ship>LOADOUT AND the shop's YOUR GUNS strip ----
  loadoutSlots() {
    const s = [];
    for (let i = 0; i < Game.ship.mounts; i++) s.push({ kind: 'mount', i, key: Game.ship.weapons[i] ? Game.ship.weapons[i].key : null });
    for (let i = 0; i < 2; i++) s.push({ kind: 'cargo', i, key: Game.run.cargo[i] || null });
    return s;
  },
  loadoutSwap(ai, bi) {
    // exchange two slot contents, then rebuild mounts/cargo from the slot order (dense, no lost/dup guns)
    const keys = this.loadoutSlots().map(s => s.key);
    const t = keys[ai]; keys[ai] = keys[bi]; keys[bi] = t;
    const mounts = [], cargo = [];
    for (let i = 0; i < keys.length; i++) { if (keys[i] == null) continue; (i < Game.ship.mounts ? mounts : cargo).push(keys[i]); }
    Game.ship.weapons = mounts.map(k => ({ key: k, charge: 0, on: false, target: -1 }));
    Game.run.cargo = cargo;
  },
  gainWeapon(key) {
    const ship = Game.ship, run = Game.run;
    const wd = DATA.WEAPONS[key];
    if (ship.weapons.length < ship.mounts) {
      ship.weapons.push({ key, charge: 0, on: false, target: -1 });
      return 'WEAPON GAINED: ' + wd.name.toUpperCase();
    }
    if (run.cargo.length < 2) {
      run.cargo.push(key);
      return wd.name.toUpperCase() + ' STOWED IN CARGO';
    }
    // no room anywhere: NEVER silently lose a gun - the captain will choose
    run.pendingWeapon = key;
    return 'NO ROOM FOR THE ' + wd.name.toUpperCase() + ' - YOU WILL CHOOSE WHAT TO KEEP.';
  },
};

// ============ WEAPON CHOICE (new gun, no room - FTL-style compare & dump) ============
const WeaponChoiceScreen = {
  enter() { this.key = Game.run.pendingWeapon; this._rows = []; this.hover = null; },
  update(dt) {},
  statLine(wd) { return UI.weaponStat(wd); },
  click(x, y) {
    const run = Game.run;
    for (const row of (this._rows || [])) {
      const r = row.rect;
      if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) {
        if (row.act === 'discard') {
          run.shards += Math.floor(DATA.WEAPONS[this.key].cost / 2);
          run.pendingWeapon = null;
          AUDIO.sfx('coin');
          Game.save();
          Game.afterNode();
          return;
        }
        // dump one of yours (half value), take the new gun
        UI.sellWeapon(row.from, row.idx);
        run.pendingWeapon = null;
        UI.gainWeapon(this.key);
        AUDIO.sfx('coin');
        Game.save();
        Game.afterNode();
        return;
      }
    }
  },
  render(ctx) {
    if (!UI.stoneBg(ctx)) { ctx.fillStyle = COL.cabin; ctx.fillRect(0, 0, 512, 288); }
    UI.woodBorder(ctx, 24); UI.statBar(ctx); // frame, then resources on the top rail
    this._rows = [];
    this.hover = null; // recomputed each frame from the row under the cursor (no stale text)
    const wd = DATA.WEAPONS[this.key];
    if (!wd) { Game.run.pendingWeapon = null; Game.setScreen('map'); return; }
    UI.ftlPanel(ctx, 76, 32, 360, 230, 'NEW GUN, NO ROOM - CHOOSE, CAPTAIN', COL.orange);
    // the newcomer, big parchment card (highlighted in brass)
    ctx.fillStyle = COL.paperhi;
    UI.roundRect(ctx, 90, 44, 332, 34, 9); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = COL.gold;
    UI.roundRect(ctx, 91, 45, 330, 32, 8); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = COL.parchdk;
    UI.roundRect(ctx, 94, 48, 40, 26, 5); ctx.fill();
    ctx.strokeStyle = COL.inkfade; UI.roundRect(ctx, 94, 48, 40, 26, 5); ctx.stroke();
    const wa = SPR.weaponIcon(this.key);
    if (wa) ctx.drawImage(wa, 98, 54, 32, 16);
    TYPE.draw(ctx, wd.name, 140, 49, 13, COL.inkdk, { display: true });
    TYPE.draw(ctx, this.statLine(wd), 140, 60, 10, COL.inkmd);
    const spec = UI.weaponSpecials(wd);
    TYPE.draw(ctx, (spec || wd.desc), 140, 69, 10, spec ? COL.orange : COL.inkfade, { italic: !spec });
    TYPE.drawCentered(ctx, 'Take it by dumping one of yours (half value back):', 256, 85, 11, COL.ltgrey, { italic: true });
    let y = 96;
    Game.ship.weapons.forEach((w, i) => {
      ShopScreen.sellRow(ctx, w.key, DATA.WEAPONS[w.key].name, 90, y, 332, this._rows, { from: 'mount', idx: i });
      if (Game.mouse.y >= y && Game.mouse.y < y + 20 && Game.mouse.x >= 90 && Game.mouse.x < 422) this.hover = w.key;
      y += 23;
    });
    Game.run.cargo.forEach((k, i) => {
      ShopScreen.sellRow(ctx, k, DATA.WEAPONS[k].name + ' (CARGO)', 90, y, 332, this._rows, { from: 'cargo', idx: i });
      if (Game.mouse.y >= y && Game.mouse.y < y + 20 && Game.mouse.x >= 90 && Game.mouse.x < 422) this.hover = k;
      y += 23;
    });
    // hovered weapon's stats for comparison
    if (this.hover && DATA.WEAPONS[this.hover]) {
      TYPE.drawCentered(ctx, DATA.WEAPONS[this.hover].name + ' — ' + this.statLine(DATA.WEAPONS[this.hover]), 256, Math.min(y + 4, 236), 10, COL.gold);
    }
    const dv = Math.floor(wd.cost / 2);
    UI.drawBtn(ctx, 146, 248, 220, 16, 'DISCARD NEW GUN INSTEAD (+' + dv + ')');
    this._rows.push({ rect: { x: 146, y: 248, w: 220, h: 16 }, act: 'discard' });
  },
};

// ============ AUGMENT CHOICE (new aug, slots full - sell one or decline) ============
const AugChoiceScreen = {
  enter() { this.key = Game.run.pendingAug; this._rows = []; this.hover = null; },
  update(dt) {},
  click(x, y) {
    const run = Game.run;
    for (const row of (this._rows || [])) {
      const r = row.rect;
      if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) {
        if (row.act === 'discard') {
          run.shards += Math.floor(DATA.AUGS[this.key].cost / 2);
          run.pendingAug = null;
          AUDIO.sfx('coin'); Game.save(); Game.afterNode();
          return;
        }
        // sell the chosen augment (half value, mythril gives its hull back), install the new one
        UI.sellAug(row.idx);
        run.pendingAug = null;
        UI.installAug(this.key);
        AUDIO.sfx('coin'); Game.save(); Game.afterNode();
        return;
      }
    }
  },
  render(ctx) {
    if (!UI.stoneBg(ctx)) { ctx.fillStyle = COL.cabin; ctx.fillRect(0, 0, 512, 288); }
    UI.woodBorder(ctx, 24); UI.statBar(ctx); // frame, then resources on the top rail
    this._rows = [];
    this.hover = null;
    const ad = DATA.AUGS[this.key];
    if (!ad) { Game.run.pendingAug = null; Game.afterNode(); return; }
    UI.ftlPanel(ctx, 76, 32, 360, 230, 'NEW AUGMENT, SLOTS FULL - CHOOSE, CAPTAIN', COL.orange);
    // the newcomer parchment card (highlighted in brass)
    ctx.fillStyle = COL.paperhi; UI.roundRect(ctx, 90, 44, 332, 40, 9); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = COL.gold; UI.roundRect(ctx, 91, 45, 330, 38, 8); ctx.stroke(); ctx.lineWidth = 1;
    UI.drawAugIcon(ctx, this.key, 100, 58, 18);
    TYPE.draw(ctx, ad.name, 120, 49, 13, COL.inkdk, { display: true });
    TYPE.drawWrapped(ctx, ad.desc, 120, 62, 294, 10, COL.inkmd, { maxLines: 2 }, 3);
    TYPE.drawCentered(ctx, 'Install it by selling one of yours (half value back):', 256, 91, 11, COL.paperhi, { italic: true });
    let y = 104;
    Game.run.augs.forEach((a, i) => {
      const hot = Game.mouse.y >= y && Game.mouse.y < y + 22 && Game.mouse.x >= 90 && Game.mouse.x < 422;
      if (hot) Game.hot = true;
      ctx.fillStyle = hot ? COL.paperhi : COL.paperlo;
      UI.roundRect(ctx, 90, y, 332, 22, 9); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = hot ? COL.gold : COL.brassdk; UI.roundRect(ctx, 91, y + 1, 330, 20, 8); ctx.stroke(); ctx.lineWidth = 1;
      UI.drawAugIcon(ctx, a, 98, y + 7, 14);
      TYPE.draw(ctx, DATA.AUGS[a].name, 116, y + 5, 11, COL.inkdk);
      ctx.fillStyle = COL.parchdk; UI.roundRect(ctx, 372, y + 4, 44, 14, 6); ctx.fill();
      ctx.strokeStyle = COL.inkfade; UI.roundRect(ctx, 372, y + 4, 44, 14, 6); ctx.stroke();
      UI.drawRes(ctx, 'shard', 374, y + 6, 11);
      TYPE.drawRight(ctx, '+' + Math.floor(DATA.AUGS[a].cost / 2), 413, y + 6, 10, COL.inkdk);
      this._rows.push({ rect: { x: 90, y, w: 332, h: 22 }, act: 'sell', idx: i });
      if (hot) this.hover = a;
      y += 26;
    });
    if (this.hover) TYPE.drawCentered(ctx, DATA.AUGS[this.hover].desc, 256, Math.min(y + 6, 236), 10, COL.gold);
    const dv = Math.floor(ad.cost / 2);
    UI.drawBtn(ctx, 146, 248, 220, 16, 'DECLINE NEW AUGMENT (+' + dv + ')');
    this._rows.push({ rect: { x: 146, y: 248, w: 220, h: 16 }, act: 'discard' });
  },
};

// ============ EVENT SCREEN ============
const EventScreen = {
  enter(args) {
    this.ev = args.ev;
    this.phase = 'choices';
    this.outcome = null;
    this.notes = [];
    this.pendingFight = null;
    this.imgBot = null; // fixed image-box bottom, computed once on first render
  },
  update(dt) {},
  canChoose(ch) {
    const r = ch.req;
    if (!r) return { ok: true, blue: false };
    if (r.race) return { ok: Game.ship.aliveCrew().some(c => c.race === r.race), blue: true };
    if (r.sys) return { ok: Game.ship.sysLv[r.sys] > 0, blue: true };
    if (r.aug) return { ok: Game.run.augs.includes(r.aug), blue: true };
    if (r.shards !== undefined) return { ok: Game.run.shards >= r.shards, blue: false };
    if (r.runeshot !== undefined) return { ok: Game.run.runeshot >= r.runeshot, blue: false };
    return { ok: true, blue: false };
  },
  choose(ch) {
    if (ch.req && ch.req.shards) Game.run.shards -= ch.req.shards;
    if (ch.req && ch.req.runeshot) Game.run.runeshot -= ch.req.runeshot;
    const res = U.wpick(ch.results.map(r => [r[1], r[0]]));
    this.outcome = res;
    this.notes = res.special || !res.fight ? UI.applyFx(res) : UI.applyFx(Object.assign({}, res, { fight: null }));
    if (res.fight) this.pendingFight = res.fight;
    this.phase = 'outcome';
    AUDIO.sfx('click');
  },
  click(x, y) {
    if (this.phase === 'choices') {
      // hit-test the SAME rects the renderer recorded (no stride/height drift)
      for (const r of (this._choiceRects || [])) {
        if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) {
          const c = this.canChoose(r.ch);
          if (c.ok) this.choose(r.ch);
          else AUDIO.sfx('back');
          return;
        }
      }
    } else {
      if (x >= 196 && x < 316 && y >= 244 && y < 262) {
        if (this.pendingFight) {
          const f = this.pendingFight;
          Game.startBattle(f.race, (f.tier || 0), { elite: f.elite, hazard: f.hazard });
        } else {
          Game.afterNode();
        }
        AUDIO.sfx('click');
      }
    }
  },
  key(k) {
    if (this.phase === 'choices') {
      const n = parseInt(k);
      if (n >= 1 && n <= this.ev.choices.length) {
        const ch = this.ev.choices[n - 1];
        if (this.canChoose(ch).ok) this.choose(ch);
      }
    } else if (k === ' ' || k === 'Enter') this.click(200, 260);
  },
  render(ctx) {
    const a = UI.parchmentScreen(ctx, this.ev.title); // wood frame + parchment page (2 layers)

    // a DOMINANT illustration filling the page above the text. The box is computed ONCE
    // (from the tighter choices-phase layout) and reused in both phases, so the
    // illustration never resizes or jumps between the choices and outcome views.
    const vname = 'vig_' + (this.ev.vig || 'island');
    if (this.imgBot == null) {
      const lines = TYPE.wrap(ctx, this.ev.text, 432, 13, { italic: true });
      const textH = lines.length * 17, nCh = this.ev.choices.length;
      const choicesTop = 254 - nCh * 21, textTop = choicesTop - 8 - textH;
      this.imgBot = textTop - 6;
    }
    // the box is fixed from the choices layout, but the OUTCOME text (result + notes) can be
    // taller and start higher than the choices block — clamp the image bottom so it never
    // overlaps the text shown this phase (the image only ever shrinks on outcome, never grows).
    let effBot = this.imgBot;
    if (this.phase === 'outcome') {
      const lines = TYPE.wrap(ctx, this.outcome.text, 432, 13, { italic: true });
      const textH = lines.length * 17, nNotes = this.notes.length + (this.pendingFight ? 1 : 0);
      const blockTop = 244 - 10 - nNotes * 15 - 6 - textH;
      effBot = Math.min(this.imgBot, blockTop - 6);
    }
    const fitImage = () => {
      const imgTop = a.y + 2;
      const boxH = Math.max(50, effBot - imgTop);
      const e = SPR.artEntry(vname);
      if (!e) return;
      const ar = (e.img.naturalWidth || 16) / (e.img.naturalHeight || 9);
      let iw = a.w - 32, ih = iw / ar;
      if (ih > boxH) { ih = boxH; iw = ih * ar; }
      const ix = Math.round(a.cx - iw / 2), iy = Math.round(imgTop + (boxH - ih) / 2);
      ctx.fillStyle = 'rgba(58,41,18,0.5)'; ctx.fillRect(ix - 3, iy - 3, iw + 6, ih + 6); // recessed mat
      SPR.drawArt(ctx, vname, ix, iy, iw, ih);
      ctx.strokeStyle = COL.brassdk; ctx.lineWidth = 1; ctx.strokeRect(ix - 0.5, iy - 0.5, iw + 1, ih + 1);
      this._imgRect = { x: ix, y: iy, w: iw, h: ih }; // recorded for layout regression tests
    };
    this._imgRect = null;
    fitImage();

    if (this.phase === 'choices') {
      const lines = TYPE.wrap(ctx, this.ev.text, 432, 13, { italic: true });
      const textH = lines.length * 17, nCh = this.ev.choices.length;
      const choicesTop = 254 - nCh * 21, textTop = choicesTop - 8 - textH;
      let ty = textTop;
      for (const l of lines) { TYPE.drawCentered(ctx, l, 256, ty, 13, COL.inkdk, { italic: true }); ty += 17; }
      this.choiceY = choicesTop;
      let by = choicesTop;
      this._choiceRects = [];
      this.ev.choices.forEach((ch, i) => {
        const c = this.canChoose(ch);
        let label = (i + 1) + '. ' + ch.label;
        if (ch.req && ch.req.race && c.ok) label += ' [' + DATA.RACES[ch.req.race].name + ']';
        UI.drawBtn(ctx, 36, by, 440, 18, label, { disabled: !c.ok, blue: c.blue && c.ok, left: true });
        this._choiceRects.push({ x: 36, y: by, w: 440, h: 18, ch });
        by += 21;
      });
    } else {
      const lines = TYPE.wrap(ctx, this.outcome.text, 432, 13, { italic: true });
      const textH = lines.length * 17, nNotes = this.notes.length + (this.pendingFight ? 1 : 0);
      const blockTop = 244 - 10 - nNotes * 15 - 6 - textH;
      this._txtTop = blockTop; // recorded for layout regression tests
      let yy = blockTop;
      for (const l of lines) { TYPE.drawCentered(ctx, l, 256, yy, 13, COL.inkdk, { italic: true }); yy += 17; }
      yy += 6;
      for (const n of this.notes) { TYPE.drawCentered(ctx, '—  ' + n, 256, yy, 12, COL.inkmd); yy += 15; }
      if (this.pendingFight) { TYPE.drawCentered(ctx, '—  Battle stations!', 256, yy, 12, TIP.danger); }
      UI.drawBtn(ctx, 196, 244, 120, 18, this.pendingFight ? 'To Arms!' : 'Continue');
    }
  },
};

// ============ LOOT SCREEN (post battle) ============
const LootScreen = {
  enter(args) {
    this.title = args.title;
    this.rawLines = args.lines || []; // wrapped at render time with the serif metrics
  },
  update(dt) {},
  click(x, y) {
    if (x >= 196 && x < 316 && y >= 220 && y < 238) { Game.afterNode(); AUDIO.sfx('click'); }
  },
  key(k) { if (k === ' ' || k === 'Enter') this.click(200, 230); },
  render(ctx) {
    const a = UI.parchmentScreen(ctx, this.title); // wood frame + parchment page (2 layers)
    let yy = a.y + 16;
    for (const raw of this.rawLines) {
      if (!raw) { yy += 8; continue; }
      const gold = raw.startsWith('+') || /JOIN|join/.test(raw); // rewards pop; prose reads dark ink
      for (const l of TYPE.wrap(ctx, raw, a.w - 70, 13, { italic: true })) {
        TYPE.drawCentered(ctx, l, a.cx, yy, 13, gold ? TIP.special : COL.inkdk, { italic: true });
        yy += 16;
      }
    }
    UI.drawBtn(ctx, 196, 220, 120, 18, 'Continue');
  },
};

// ============ SHOP ============
const ShopScreen = {
  enter() {
    AUDIO.playMap();
    const shopKey = Game.run.region * 100 + Game.run.nodeId; // node ids restart per region
    if (!Game.run.shopStock || Game.run.shopNode !== shopKey) {
      Game.run.shopNode = shopKey;
      Game.run.shopStock = this.makeStock();
    }
    this.stock = Game.run.shopStock;
    this.showRumors = false;
    this.loreView = null;
    this.tab = 0; // 0 = BUY, 1 = SELL (folder tabs)
    this.sellPrompt = null;
    this.confirmSell = null;
    this.sellSel = -1; // selected gun slot for mount/stow swap on the SELL tab
    this._sellRows = [];
    this.msg = 'WELCOME ABOARD, CAPTAIN. NO REFUNDS. MOSTLY NO CURSES.';
  },
  makeStock() {
    // FTL-style wares: ANY weapon can turn up in ANY port, all run long -
    // rarity weights the draw (common 3 tickets, uncommon 2, rare 1) and one
    // slot usually leans local so each sea still tastes of its people
    const race = DATA.REGIONS[Game.run.region].race;
    const all = Object.keys(DATA.WEAPONS).filter(k => k !== 'depleteduranium' && !DATA.WEAPONS[k].hidden);
    const bag = [];
    for (const k of all) {
      const tickets = Math.max(1, 4 - (DATA.WEAPONS[k].rarity || 1));
      for (let i = 0; i < tickets; i++) bag.push(k);
    }
    const wkeys = [];
    const local = DATA.RACE_WEAPONS[race] || [];
    if (local.length && U.chance(0.7)) wkeys.push(U.pick(local));
    let guard = 200;
    while (wkeys.length < 3 && guard-- > 0) {
      const k = U.pick(bag);
      if (!wkeys.includes(k)) wkeys.push(k);
    }
    const augs = U.shuffle(Object.keys(DATA.AUGS).filter(a => !Game.run.augs.includes(a) && !DATA.AUGS[a].legendary)).slice(0, 2);
    const crewRace = DATA.RACE_CREW[race] || 'human';
    const crews = [crewRace, U.pick(Object.keys(DATA.RACES))];
    const disc = Game.run.augs.includes('merchant_seal') ? 0.85 : 1;
    const stock = [];
    for (const k of wkeys) stock.push({ kind: 'weapon', key: k, price: Math.round(DATA.WEAPONS[k].cost * U.rf(0.9, 1.15) * disc), sold: false });
    // from region 4 on, shops sometimes carry a single legendary find
    if (Game.run.region >= 3 && U.chance(0.4)) {
      const legs = Object.keys(DATA.AUGS).filter(a => DATA.AUGS[a].legendary && !Game.run.augs.includes(a));
      if (legs.length) augs[0] = U.pick(legs);
    }
    for (const a of augs) stock.push({ kind: 'aug', key: a, price: Math.round(DATA.AUGS[a].cost * U.rf(0.9, 1.15) * disc), sold: false });
    for (const r of crews) stock.push({ kind: 'crew', key: r, price: Math.round(DATA.RACES[r].cost * U.rf(0.95, 1.2) * disc), sold: false });
    // carved vessels for the menagerie: 4 always wait on the counter (shown on the FAMILIARS
    // tab, which only appears once a Binding Shrine is aboard). Drawn from the unbound pool.
    const famPool = U.shuffle(Object.keys(DATA.FAMILIARS).filter(k => !(Game.run.familiars || []).includes(k))).slice(0, 4);
    for (const fk of famPool) stock.push({ kind: 'familiar', key: fk, price: Math.round(DATA.FAMILIARS[fk].cost * U.rf(0.9, 1.15) * disc), sold: false });
    // advanced systems: offer ONE uninstalled system if you still have an open mount (FTL: buy systems at stores)
    const installedAdv = DATA.SYS_ADVANCED.filter(k => Game.ship.sysLv[k] > 0).length;
    const advAvail = DATA.SYS_ADVANCED.filter(k => !(Game.ship.sysLv[k] > 0));
    if (installedAdv < DATA.OPEN_MOUNTS && advAvail.length && U.chance(0.7)) {
      const sk = U.pick(advAvail);
      // keep the CREW·AUGMENTS·SYSTEMS panel to 4 rows: drop one aug to make room for the system
      const augItems = stock.filter(s => s.kind === 'aug');
      if (augItems.length > 1) stock.splice(stock.indexOf(augItems[augItems.length - 1]), 1);
      stock.push({ kind: 'system', key: sk, price: Math.round((DATA.SYSTEMS[sk].costs[0] || 60) * U.rf(0.9, 1.15) * disc), sold: false });
    }
    stock.push({ kind: 'rune', key: 'runeshot', price: Math.round(6 * disc), sold: false });
    stock.push({ kind: 'candle', key: 'candle', price: Math.round(8 * disc), sold: false }); // sold on the FAMILIARS tab
    return stock;
  },
  update(dt) { Game.ship.tick(dt, null); },
  buy(it) {
    const run = Game.run;
    if (it.sold) return;
    if (run.shards < it.price) { this.msg = 'NOT ENOUGH SHARDS, CAPTAIN.'; AUDIO.sfx('back'); return; }
    if (it.kind === 'crew' && Game.ship.aliveCrew().length >= 8) { this.msg = 'NO BUNKS LEFT.'; AUDIO.sfx('back'); return; }
    if (it.kind === 'aug' && run.augs.length >= 3) { this.msg = 'AUGMENT SLOTS FULL (3 MAX).'; AUDIO.sfx('back'); return; }
    if (it.kind === 'familiar' && !(Game.ship.sysLv.shrine > 0)) { this.msg = 'YOU NEED A BINDING SHRINE TO BIND A FAMILIAR.'; AUDIO.sfx('back'); return; }
    if (it.kind === 'system') {
      if (Game.ship.sysLv[it.key] > 0) { this.msg = 'ALREADY INSTALLED.'; AUDIO.sfx('back'); return; }
      if (DATA.SYS_ADVANCED.filter(k => Game.ship.sysLv[k] > 0).length >= DATA.OPEN_MOUNTS) { this.msg = 'NO OPEN SYSTEM MOUNTS (' + DATA.OPEN_MOUNTS + ' MAX) - NOTHING TO REMOVE THEM ONTO.'; AUDIO.sfx('back'); return; }
    }
    // full mounts AND full cargo: FTL-style "sell one of yours first" dialog
    if (it.kind === 'weapon' && Game.ship.weapons.length >= Game.ship.mounts && run.cargo.length >= 2) {
      this.sellPrompt = { item: it };
      AUDIO.sfx('click');
      return;
    }
    run.shards -= it.price;
    if (it.kind === 'weapon') { this.msg = UI.gainWeapon(it.key); it.sold = true; }
    else if (it.kind === 'aug') {
      UI.installAug(it.key);
      this.msg = 'AUGMENT INSTALLED: ' + DATA.AUGS[it.key].name.toUpperCase();
      it.sold = true;
    } else if (it.kind === 'crew') {
      const c = Game.ship.addCrew(it.key); c.owner = 'player';
      this.msg = c.name.toUpperCase() + ' SIGNS THE ARTICLES.';
      it.sold = true;
    } else if (it.kind === 'familiar') {
      run.familiars = run.familiars || [];
      if (run.familiars.length >= 3) { run.shards += it.price; this.msg = 'THE SHRINE HOLDS THREE BINDINGS, NO MORE.'; AUDIO.sfx('back'); return; }
      run.familiars.push(it.key);
      this.msg = DATA.FAMILIARS[it.key].name.toUpperCase() + ' BOUND TO YOUR SHIP.';
      it.sold = true;
    } else if (it.kind === 'system') {
      Game.ship.sysLv[it.key] = 1;
      Game.ship.assignMounts(); // seat it into an open mount room
      this.msg = DATA.SYSTEMS[it.key].name.toUpperCase() + ' INSTALLED.';
      it.sold = true;
    } else if (it.kind === 'rune') { run.runeshot++; this.msg = 'RUNESHOT LOADED ABOARD. (' + run.runeshot + ' TOTAL)'; }
    else if (it.kind === 'candle') { run.candles = (run.candles || 0) + 1; this.msg = "A SEANCE CANDLE JOINS YOUR STORES. (" + run.candles + ' TOTAL)'; }
    AUDIO.sfx('coin');
  },
  inRect(x, y, rx, ry, rw, rh) { return U.inRect(x, y, rx, ry, rw, rh); },
  click(x, y) {
    const run = Game.run;
    // rumors overlay: click a myth tale to read its lore; the lore page returns to the
    // list; otherwise clicking away closes the overlay.
    if (this.showRumors) {
      if (this.loreView) { this.loreView = null; AUDIO.sfx('back'); return; }
      for (const row of (this._rumorRows || [])) {
        const r = row.rect;
        if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) { this.loreView = { mythIdx: row.mythIdx }; AUDIO.sfx('click'); return; }
      }
      this.showRumors = false; AUDIO.sfx('back'); return;
    }
    // sell-prompt dialog swallows all clicks
    if (this.sellPrompt) {
      const it = this.sellPrompt.item;
      for (const row of (this._sellRows || [])) {
        const r = row.rect;
        if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) {
          if (row.act === 'cancel') { this.sellPrompt = null; this.msg = 'KEPT YOUR GUNS.'; AUDIO.sfx('back'); return; }
          // sell the chosen mounted/cargo weapon, buy the new one into its place
          const sold = UI.sellWeapon(row.from, row.idx);
          run.shards -= it.price;
          this.msg = UI.gainWeapon(it.key) + ' (SOLD ' + DATA.WEAPONS[sold.key].name.toUpperCase() + ' FOR ' + sold.value + ')';
          it.sold = true;
          this.sellPrompt = null;
          AUDIO.sfx('coin');
          return;
        }
      }
      return;
    }
    // confirm-sell dialog swallows all clicks until you choose
    if (this.confirmSell) {
      for (const r of (this._confirmRects || [])) {
        if (this.inRect(x, y, r.rect.x, r.rect.y, r.rect.w, r.rect.h)) {
          if (r.act === 'sell') { this.confirmSell.do(); AUDIO.sfx('coin'); } else AUDIO.sfx('back');
          this.confirmSell = null; return;
        }
      }
      return;
    }
    // BUY / SELL folder tabs
    for (let i = 0; i < (this._tabRects || []).length; i++) {
      const r = this._tabRects[i];
      if (this.inRect(x, y, r.x, r.y, r.w, r.h)) { if (this.tab !== i) { this.tab = i; this.msg = null; this.sellSel = -1; AUDIO.sfx('click'); } return; }
    }
    // SELL tab: click a gun to sell it for half value
    if (this.tab === 1) {
      for (const row of (this._sellRows2 || [])) if (this.inRect(x, y, row.rect.x, row.rect.y, row.rect.w, row.rect.h)) {
        if (row.kind === 'aug') {
          const idx = row.idx, key = Game.run.augs[idx];
          this.askSell(DATA.AUGS[key].name, Math.floor(DATA.AUGS[key].cost / 2), () => {
            const sold = UI.sellAug(idx); this.msg = 'SOLD ' + DATA.AUGS[sold.key].name.toUpperCase() + ' FOR ' + sold.value + ' SHARDS.';
          });
        } else {
          const from = row.from, idx = row.idx;
          const key = from === 'mount' ? Game.ship.weapons[idx].key : Game.run.cargo[idx];
          this.askSell(DATA.WEAPONS[key].name, UI.sellWeaponValue(key), () => {
            const sold = UI.sellWeapon(from, idx); this.msg = 'SOLD ' + DATA.WEAPONS[sold.key].name.toUpperCase() + ' FOR ' + sold.value + ' SHARDS.';
          });
        }
        return;
      }
      // click a slot body (not the X) to mount/stow: tap one gun, then another, to swap them
      for (const r of (this._loSlotRects || [])) if (this.inRect(x, y, r.rect.x, r.rect.y, r.rect.w, r.rect.h)) {
        if (this.sellSel === -1) { if (r.key) { this.sellSel = r.idx; AUDIO.sfx('click'); } }
        else if (this.sellSel === r.idx) { this.sellSel = -1; AUDIO.sfx('back'); }
        else { UI.loadoutSwap(this.sellSel, r.idx); this.sellSel = -1; this.msg = 'RIGGING ADJUSTED.'; AUDIO.sfx('click'); }
        return;
      }
    }
    // FAMILIARS tab: release (sell) a bound familiar for half value
    if (this.tab === 2) {
      for (const row of (this._sellRows2 || [])) if (this.inRect(x, y, row.rect.x, row.rect.y, row.rect.w, row.rect.h)) {
        const idx = row.idx, key = Game.run.familiars[idx];
        this.askSell('Release ' + DATA.FAMILIARS[key].name, Math.floor(DATA.FAMILIARS[key].cost / 2), () => {
          const sold = UI.sellFamiliar(idx); this.msg = 'RELEASED ' + DATA.FAMILIARS[sold.key].name.toUpperCase() + ' (+' + sold.value + ' SHARDS).';
        });
        return;
      }
    }
    for (const row of (this._rows || [])) {
      const r = row.rect;
      if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) {
        if (row.act === 'buy') this.buy(row.item);
        else if (row.act === 'repair1') {
          const rp = DATA.REPAIR_COST(run.region);
          if (Game.ship.hull >= Game.ship.hullMax) this.msg = 'HULL IS PRISTINE ALREADY.';
          else if (run.shards >= rp) { run.shards -= rp; Game.ship.hull++; this.msg = 'PATCHED 1 HULL.'; AUDIO.sfx('coin'); }
          else this.msg = 'NOT ENOUGH SHARDS.';
        } else if (row.act === 'repairAll') {
          const rp = DATA.REPAIR_COST(run.region);
          let n = 0;
          while (Game.ship.hull < Game.ship.hullMax && run.shards >= rp) { run.shards -= rp; Game.ship.hull++; n++; }
          this.msg = n ? 'PATCHED ' + n + ' HULL FOR ' + n * rp + ' SHARDS.' : 'NOTHING TO PATCH.';
          if (n) AUDIO.sfx('coin');
        } else if (row.act === 'rumors') { this.showRumors = true; AUDIO.sfx('click'); }
        else if (row.act === 'leave') { Game.afterNode(); AUDIO.sfx('back'); }
        return;
      }
    }
  },
  key(k) { if (k === 'Escape') Game.afterNode(); },
  // FTL-style row for things YOU own: icon chip, name, gold value chip
  sellRow(ctx, key, label, x, y, w, rows, payload, h) {
    h = h || 20;
    const isAug = payload && payload.kind === 'aug';
    const isFam = payload && payload.kind === 'familiar';
    const price = Math.floor((isFam ? DATA.FAMILIARS[key].cost : isAug ? DATA.AUGS[key].cost : DATA.WEAPONS[key].cost) / 2);
    const hot = Game.mouse.x >= x && Game.mouse.x < x + w && Game.mouse.y >= y && Game.mouse.y < y + h;
    if (hot) Game.hot = true;
    ctx.fillStyle = hot ? COL.paperhi : COL.parch; // ledger entry row
    UI.roundRect(ctx, x, y, w, h, 6); ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = hot ? COL.golddk : COL.parchln;
    UI.roundRect(ctx, x + 1, y + 1, w - 2, h - 2, 5); ctx.stroke();
    ctx.lineWidth = 1;
    const cy = y + (h - 14) / 2; // 14px cells vertically centred in the row
    // icon in a recessed parchment cell
    ctx.fillStyle = COL.parchdk;
    UI.roundRect(ctx, x + 3, cy, 23, 14, 4); ctx.fill();
    ctx.strokeStyle = COL.inkfade;
    UI.roundRect(ctx, x + 3, cy, 23, 14, 4); ctx.stroke();
    if (isFam) { if (!SPR.drawArt(ctx, 'icon_fam_' + key, x + 6, cy, 14, 14)) ctx.drawImage(SPR.icon('shrine'), x + 7, cy + 2); }
    else if (isAug) { UI.drawAugIcon(ctx, key, x + 7, cy + 1, 13); }
    else { const wa = SPR.weaponIcon(key); if (wa) ctx.drawImage(wa, x + 6, cy + 3, 16, 8); }
    TYPE.draw(ctx, label, x + 30, y + h / 2, TYPE.fitSize(ctx, label, w - 80, 12), COL.inkdk, { baseline: 'middle' });
    // value cell (what the merchant pays), ink amount
    ctx.fillStyle = COL.parchdk;
    UI.roundRect(ctx, x + w - 46, cy, 42, 14, 5); ctx.fill();
    ctx.strokeStyle = COL.inkfade;
    UI.roundRect(ctx, x + w - 46, cy, 42, 14, 5); ctx.stroke();
    UI.drawRes(ctx, 'shard', x + w - 44, cy + 1, 11);
    TYPE.drawRight(ctx, '+' + price, x + w - 7, y + h / 2, 11, COL.inkdk, { baseline: 'middle' });
    rows.push(Object.assign({ rect: { x, y, w, h }, key }, payload));
    return h;
  },

  // one FTL-style pill row with icon, name, price chip
  pillRow(ctx, it, x, y, w) {
    const h = 20;
    const hot = Game.mouse.x >= x && Game.mouse.x < x + w && Game.mouse.y >= y && Game.mouse.y < y + h;
    const afford = Game.run.shards >= it.price;
    if (hot && afford && !it.sold) Game.hot = true;
    ctx.fillStyle = it.sold ? COL.papermd : hot && afford ? COL.paperhi : COL.parch; // ledger entry row
    UI.roundRect(ctx, x, y, w, h, 6); ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = it.sold ? COL.parchdk : hot && afford ? COL.golddk : afford ? COL.parchln : COL.paperedge;
    UI.roundRect(ctx, x + 1, y + 1, w - 2, h - 2, 5); ctx.stroke();
    ctx.lineWidth = 1;
    // icon in a recessed parchment cell (ink-bordered), like a boxed illustration in a manifest
    const info = UI.itemInfo(it);
    ctx.save();
    ctx.globalAlpha = it.sold ? 0.4 : 1;
    ctx.fillStyle = COL.parchdk;
    UI.roundRect(ctx, x + 3, y + 3, 23, 14, 4); ctx.fill();
    ctx.strokeStyle = it.sold ? COL.paperedge : COL.inkfade;
    UI.roundRect(ctx, x + 3, y + 3, 23, 14, 4); ctx.stroke();
    // clip every icon to the recessed cell so nothing (aug glyphs, portraits) spills the frame
    ctx.beginPath(); ctx.rect(x + 3, y + 3, 23, 14); ctx.clip();
    if (it.kind === 'weapon') {
      const wd = DATA.WEAPONS[it.key];
      const wa = SPR.weaponIcon(it.key);
      if (wa) ctx.drawImage(wa, x + 5, y + 6, 16, 8);
      else if (!SPR.drawFrame(ctx, 'wpn_' + wd.family + '_' + wd.tint.replace('#', ''), x + 4, y + 6))
        ctx.drawImage(SPR.weaponSprite(wd.family, wd.tint), x + 4, y + 6);
    } else if (it.kind === 'crew') {
      if (!SPR.drawCrewIcon(ctx, it.key, x + 6, y + 4, 12))
        if (!SPR.drawFrame(ctx, 'portrait_' + it.key, x + 7, y + 4)) ctx.drawImage(SPR.portrait(it.key), x + 7, y + 4, 12, 12);
    } else if (it.kind === 'aug') {
      UI.drawAugIcon(ctx, it.key, x + 8, y + 4, 12);
    } else if (it.kind === 'familiar') {
      SPR.drawFamiliar(ctx, it.key, x + 13, y + 11, 0.62, Game.time || 0, 0, 1); // tiny animated familiar
    } else if (it.kind === 'system') {
      drawSysSym(ctx, it.key, x + 7, y + 4, 12, COL.inkdk);
    } else if (it.kind === 'candle') {
      UI.drawRes(ctx, 'candle', x + 7, y + 4, 13);
    } else {
      UI.drawRes(ctx, 'runeshot', x + 7, y + 5, 11);
    }
    ctx.restore();
    const isLeg = it.kind === 'aug' && DATA.AUGS[it.key] && DATA.AUGS[it.key].legendary;
    const nm = (isLeg ? '* ' : '') + info.name;
    // name starts a few px right of the icon cell (cell ends at x+26) so it isn't flush against the frame
    TYPE.draw(ctx, nm, x + 31, y + h / 2, TYPE.fitSize(ctx, nm, w - 85, 12), it.sold ? COL.inkfade : isLeg ? COL.dkpurple : COL.inkdk, { baseline: 'middle' });
    // price chip / sold stamp
    if (it.sold) {
      TYPE.draw(ctx, 'Sold', x + w - 40, y + h / 2, 11, COL.inkfade, { italic: true, baseline: 'middle' });
    } else {
      ctx.fillStyle = COL.parchdk;
      UI.roundRect(ctx, x + w - 46, y + 3, 42, 14, 5); ctx.fill();
      ctx.strokeStyle = afford ? COL.inkfade : COL.dkred;
      UI.roundRect(ctx, x + w - 46, y + 3, 42, 14, 5); ctx.stroke();
      UI.drawRes(ctx, 'shard', x + w - 44, y + 4, 11);
      TYPE.drawRight(ctx, '' + it.price, x + w - 7, y + 10, 11, afford ? COL.inkdk : COL.dkred, { baseline: 'middle' });
      this._rows.push({ rect: { x, y, w, h }, act: 'buy', item: it });
    }
    if (hot && !it.sold) this._hoverItem = it;
    return h;
  },
  render(ctx) {
    const run = Game.run;
    // the shop is a merchant's tabbed LEDGER: a parchment page bound in the wood frame
    if (!UI.tileFill(ctx, 'ui_parchment', 0, 0, 512, 288, 'rgba(227,210,172,0.22)')) { ctx.fillStyle = COL.paper; ctx.fillRect(0, 0, 512, 288); }
    this._rows = [];
    this._hoverItem = null;
    UI.woodBorder(ctx, 24); // uniform tiled wood + brass frame; chrome rides the bands
    // top band: BUY / SELL folder tabs (left) + key resources (right)
    this._tabRects = UI.tabBar(ctx, 28, 2, 270, ['BUY', 'SELL', 'FAMILIARS'], this.tab);
    // the three run resources travel together: Mythril Shards · Runeshot · Seance Candles
    { let sx = 300;
      const res = (kind, val, col) => { UI.drawRes(ctx, kind, sx, 5, 12); sx += 14; TYPE.draw(ctx, '' + val, sx, 5, 12, col); sx += Math.round(TYPE.width(ctx, '' + val, 12)) + 13; };
      res('shard', run.shards, COL.brasshi);
      res('runeshot', run.runeshot, COL.pink);
      res('candle', run.candles || 0, COL.gold);
    }
    TYPE.drawRight(ctx, UI.regionLabel(run.region), 482, 5, 11, '#d8c79a', { italic: true });
    if (this.tab === 1) { this.renderSell(ctx); this.shopBottomBar(ctx); if (this._hoverItem && !this.sellPrompt && !this.confirmSell) UI.itemCard(ctx, this._hoverItem); if (this.sellPrompt) this.renderSellPrompt(ctx); if (this.confirmSell) this.drawConfirmSell(ctx); if (this.showRumors) this.drawRumorsOverlay(ctx); return; }
    if (this.tab === 2) { this.renderFamiliars(ctx); this.shopBottomBar(ctx); if (this._hoverItem && !this.confirmSell) UI.itemCard(ctx, this._hoverItem); if (this.confirmSell) this.drawConfirmSell(ctx); if (this.showRumors) this.drawRumorsOverlay(ctx); return; }
    const reg = DATA.REGIONS[run.region];

    // ---- left column: merchant, goods, repair (ruled ledger sections on the page) ----
    let c = UI.ledgerSection(ctx, 30, 30, 140, 94, 'MERCHANT');
    const mRace = DATA.RACE_CREW[reg.race] || 'human';
    ctx.fillStyle = COL.parchdk; ctx.fillRect(c.x, c.y, 46, 46);
    if (!SPR.drawArt(ctx, 'portrait_' + (reg.race === 'armada' ? 'admiral' : mRace), c.x, c.y, 46, 46)) {
      ctx.drawImage(SPR.portrait(mRace), c.x, c.y, 46, 46);
    }
    ctx.strokeStyle = COL.inkfade; ctx.strokeRect(c.x - 0.5, c.y - 0.5, 47, 47);
    TYPE.draw(ctx, 'Trading Post', c.x + 54, c.y + 2, TYPE.fitSize(ctx, 'Trading Post', c.w - 54, 12, { display: true }), COL.inkdk, { display: true });
    TYPE.drawWrapped(ctx, reg.name, c.x + 54, c.y + 17, c.w - 54, 11, COL.inkmd, { italic: true }, 2);
    // the MERCHANT box is too short for the full blurb under the portrait — one fitted line, full text on hover
    if (reg.desc) {
      TYPE.draw(ctx, reg.desc, c.x, c.y + 50, 10, COL.inkfade, { italic: true, maxWidth: c.w, fit: 'ellipsis' });
      this._merchHover = (Game.mouse.x >= 30 && Game.mouse.x < 170 && Game.mouse.y >= 30 && Game.mouse.y < 124) ? reg.desc : null;
    }

    c = UI.ledgerSection(ctx, 30, 128, 140, 52, 'GOODS');
    for (const it of this.stock.filter(s => s.kind === 'rune')) this.pillRow(ctx, it, c.x, c.y, c.w);

    c = UI.ledgerSection(ctx, 30, 184, 140, 78, 'REPAIR');
    const missing = Game.ship.hullMax - Game.ship.hull, rp = DATA.REPAIR_COST(run.region);
    TYPE.draw(ctx, 'Hull', c.x, c.y + 1, 11, COL.inkmd);
    ctx.fillStyle = COL.parchdk; ctx.fillRect(c.x + 30, c.y + 1, c.w - 64, 8);
    ctx.strokeStyle = COL.inkfade; ctx.strokeRect(c.x + 30.5, c.y + 1.5, c.w - 65, 7);
    ctx.fillStyle = missing ? COL.orange : COL.green;
    ctx.fillRect(c.x + 31, c.y + 2, Math.round((c.w - 66) * Game.ship.hull / Game.ship.hullMax), 6);
    TYPE.drawRight(ctx, Game.ship.hull + '/' + Game.ship.hullMax, c.x + c.w, c.y + 1, 11, COL.inkdk);
    UI.drawBtn(ctx, c.x, c.y + 18, (c.w - 6) / 2, 16, 'FIX 1', { disabled: !missing || run.shards < rp });
    this._rows.push({ rect: { x: c.x, y: c.y + 18, w: (c.w - 6) / 2, h: 16 }, act: 'repair1' });
    UI.drawBtn(ctx, c.x + (c.w + 6) / 2, c.y + 18, (c.w - 6) / 2, 16, 'FIX ALL', { disabled: !missing || run.shards < rp });
    this._rows.push({ rect: { x: c.x + (c.w + 6) / 2, y: c.y + 18, w: (c.w - 6) / 2, h: 16 }, act: 'repairAll' });
    TYPE.draw(ctx, missing ? rp + ' shards per point' : 'Your hull is sound.', c.x, c.y + 40, 10, missing ? COL.inkfade : COL.green, { italic: true });

    // ---- right column: armaments + crew/augments/systems ----
    c = UI.ledgerSection(ctx, 180, 30, 302, 108, 'ARMAMENTS');
    let y = c.y;
    for (const it of this.stock.filter(s => s.kind === 'weapon')) { this.pillRow(ctx, it, c.x, y, c.w); y += 22; }

    c = UI.ledgerSection(ctx, 180, 142, 302, 120, 'CREW · AUGMENTS · SYSTEMS');
    y = c.y;
    for (const it of this.stock.filter(s => s.kind === 'aug' || s.kind === 'crew' || s.kind === 'system')) { this.pillRow(ctx, it, c.x, y, c.w); y += 22; }

    this.shopBottomBar(ctx);
    if (this._hoverItem && !this.sellPrompt) UI.itemCard(ctx, this._hoverItem);
    else if (this._merchHover && !this.sellPrompt && !this.showRumors) this.drawMerchTip(ctx, this._merchHover);
    if (this.sellPrompt) this.renderSellPrompt(ctx);
    if (this.showRumors) this.drawRumorsOverlay(ctx);
  },
  // full merchant blurb on hover (the MERCHANT box only shows a fitted single line)
  drawMerchTip(ctx, text) {
    const W = 210, lines = TYPE.wrap(ctx, text, W - 18, 10, { italic: true });
    const H = 10 + lines.length * 13 + 6;
    const x = U.clamp(Game.mouse.x + 12, 4, 508 - W), y = U.clamp(Game.mouse.y + 12, 4, 284 - H);
    const r = UI.drawScrap(ctx, x, y, W, H);
    let ty = r.iy + 2;
    for (const ln of lines) { TYPE.draw(ctx, ln, r.ix, ty, 10, TIP.body, { italic: true }); ty += 13; }
  },
  // message + RUMORS + SET SAIL ride the bottom wood band, shared by both tabs.
  // band spans y=264..288 (t=24); everything is centred on its midline (276).
  shopBottomBar(ctx) {
    const bandCY = 276, bh = 18, by = bandCY - bh / 2; // 267
    const txt = this.msg || 'Hover any item for full details';
    TYPE.draw(ctx, txt, 28, bandCY, TYPE.fitSize(ctx, txt, 280, 12), this.msg ? COL.brasshi : '#b6a684', { italic: !this.msg, baseline: 'middle' });
    UI.drawBtn(ctx, 322, by, 62, bh, 'RUMORS');
    this._rows.push({ rect: { x: 322, y: by, w: 62, h: bh }, act: 'rumors' });
    UI.drawBtn(ctx, 392, by, 94, bh, 'SET SAIL >');
    this._rows.push({ rect: { x: 392, y: by, w: 94, h: bh }, act: 'leave' });
  },
  // FFT-style tavern rumors, only reachable from the harbor. Wood-framed parchment page;
  // the italic MYTH lines are clickable and open a longer lore tale (drawLorePage).
  drawRumorsOverlay(ctx) {
    if (this.loreView) { this.drawLorePage(ctx); return; } // the lore tale takes over the modal
    ctx.fillStyle = 'rgba(8,8,16,0.55)'; ctx.fillRect(0, 0, 512, 288);
    const x = 96, y = 28, w = 320, h = 234;
    // wood frame (tiled) + brass keyline + parchment page (tiled)
    if (!UI.tileFill(ctx, 'ui_wood', x - 8, y - 8, w + 16, h + 16, 'rgba(22,13,5,0.32)')) { ctx.fillStyle = COL.woodfr; ctx.fillRect(x - 8, y - 8, w + 16, h + 16); }
    ctx.strokeStyle = COL.brassdk; ctx.lineWidth = 1; ctx.strokeRect(x - 2.5, y - 2.5, w + 5, h + 5);
    ctx.strokeStyle = COL.brasshi; ctx.strokeRect(x - 1.5, y - 1.5, w + 3, h + 3);
    if (!UI.tileFill(ctx, 'ui_parchment', x, y, w, h, 'rgba(227,210,172,0.20)')) { ctx.fillStyle = COL.paper; ctx.fillRect(x, y, w, h); }
    TYPE.drawCentered(ctx, 'Rumors & Discoveries', x + w / 2, y + 13, 16, COL.inkdk, { display: true, baseline: 'middle' });
    ctx.strokeStyle = COL.parchln; ctx.beginPath(); ctx.moveTo(x + 14, y + 26); ctx.lineTo(x + w - 14, y + 26); ctx.stroke();
    ctx.strokeStyle = COL.parchdk; ctx.beginPath(); ctx.moveTo(x + 14, y + 27.5); ctx.lineTo(x + w - 14, y + 27.5); ctx.stroke();
    this._rumorRows = [];
    const region = Game.run.region, loreReg = (DATA.REGION_LORE && DATA.REGION_LORE[region]) || null;
    let ry = y + 38; const tw = w - 38;
    const reg = DATA.REGIONS[region];
    for (const r of MapScreen.rumors(Game.run, reg)) {
      const lines = TYPE.wrap(ctx, r.text, tw, 11, { italic: r.kind === 'myth' });
      const rowH = lines.length * 13 + 6;
      if (ry + rowH > y + h - 22) break;
      const clickable = r.kind === 'myth' && loreReg && loreReg[r.mythIdx];
      const hot = clickable && Game.mouse.x >= x + 10 && Game.mouse.x < x + w - 10 && Game.mouse.y >= ry - 2 && Game.mouse.y < ry - 2 + rowH;
      if (hot) { Game.hot = true; ctx.fillStyle = 'rgba(120,90,40,0.13)'; UI.roundRect(ctx, x + 10, ry - 2, w - 20, rowH, 4); ctx.fill(); }
      // bullet: brass diamond for live intel, ink diamond for a myth
      ctx.fillStyle = r.kind === 'intel' ? COL.brassdk : (hot ? COL.dkpurple : COL.inkfade);
      ctx.beginPath(); ctx.moveTo(x + 17, ry + 4); ctx.lineTo(x + 20, ry + 7); ctx.lineTo(x + 17, ry + 10); ctx.lineTo(x + 14, ry + 7); ctx.closePath(); ctx.fill();
      const col = r.kind === 'myth' ? (hot ? COL.dkpurple : COL.inkmd) : COL.inkdk;
      let fy = ry;
      for (const ln of lines) { TYPE.draw(ctx, ln, x + 26, fy, 11, col, { italic: r.kind === 'myth' }); fy += 13; }
      if (clickable) {
        TYPE.drawRight(ctx, hot ? 'read on »' : '»', x + w - 14, ry + lines.length * 13 - 11, 10, hot ? COL.dkpurple : COL.inkfade, { italic: true });
        this._rumorRows.push({ rect: { x: x + 10, y: ry - 2, w: w - 20, h: rowH }, mythIdx: r.mythIdx });
      }
      ry = fy + 5;
    }
    TYPE.drawCentered(ctx, 'tavern talk — click a tale to hear more, or click away to leave', x + w / 2, y + h - 13, 9, COL.inkfade, { italic: true });
  },
  // a longer tavern tale (FFT-length): the myth a clicked rumor refers to, expanded
  drawLorePage(ctx) {
    // near-opaque walnut wash so the shop top-bar (region numeral, resources) can't bleed through
    if (!UI.tileFill(ctx, 'ui_wood', 0, 0, 512, 288, 'rgba(10,6,2,0.80)')) { ctx.fillStyle = 'rgba(10,6,2,0.9)'; ctx.fillRect(0, 0, 512, 288); }
    const x = 60, y = 18, w = 392, h = 252;
    if (!UI.tileFill(ctx, 'ui_wood', x - 8, y - 8, w + 16, h + 16, 'rgba(22,13,5,0.32)')) { ctx.fillStyle = COL.woodfr; ctx.fillRect(x - 8, y - 8, w + 16, h + 16); }
    ctx.strokeStyle = COL.brassdk; ctx.lineWidth = 1; ctx.strokeRect(x - 2.5, y - 2.5, w + 5, h + 5);
    ctx.strokeStyle = COL.brasshi; ctx.strokeRect(x - 1.5, y - 1.5, w + 3, h + 3);
    if (!UI.tileFill(ctx, 'ui_parchment', x, y, w, h, 'rgba(227,210,172,0.20)')) { ctx.fillStyle = COL.paper; ctx.fillRect(x, y, w, h); }
    // aged book-leaf inner shadow (soft vignette around the page edges)
    { const ig = ctx.createLinearGradient(x, y, x, y + h);
      ig.addColorStop(0, 'rgba(90,67,42,0.28)'); ig.addColorStop(0.12, 'rgba(90,67,42,0)'); ig.addColorStop(0.88, 'rgba(90,67,42,0)'); ig.addColorStop(1, 'rgba(90,67,42,0.30)');
      ctx.fillStyle = ig; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(90,67,42,0.18)'; ctx.fillRect(x, y, 6, h); ctx.fillRect(x + w - 6, y, 6, h); }
    const region = Game.run.region, idx = this.loreView.mythIdx;
    const reg = DATA.REGIONS[region];
    const hook = (DATA.REGION_RUMORS[region] || [])[idx] || '';
    const body = ((DATA.REGION_LORE[region] || [])[idx]) || '';

    // storyteller portrait — brass-framed inset, upper left (the old salt telling the tale)
    const pf = { x: x + 12, y: y + 12, w: 122, h: 176 };
    if (!UI.tileFill(ctx, 'ui_wood', pf.x - 4, pf.y - 4, pf.w + 8, pf.h + 8, 'rgba(22,13,5,0.55)')) { ctx.fillStyle = COL.woodfr; ctx.fillRect(pf.x - 4, pf.y - 4, pf.w + 8, pf.h + 8); }
    const pe = SPR.artEntry('lore_teller');
    ctx.fillStyle = '#1a120a'; ctx.fillRect(pf.x, pf.y, pf.w, pf.h);
    if (pe) {
      const nw = pe.img.naturalWidth, nh = pe.img.naturalHeight, s = Math.min(pf.w / nw, pf.h / nh);
      const dw = Math.round(nw * s), dh = Math.round(nh * s);
      ctx.drawImage(pe.img, Math.round(pf.x + (pf.w - dw) / 2), Math.round(pf.y + (pf.h - dh) / 2), dw, dh);
    }
    { const pg = ctx.createLinearGradient(pf.x, pf.y, pf.x, pf.y + pf.h);
      pg.addColorStop(0, 'rgba(0,0,0,0.30)'); pg.addColorStop(0.16, 'rgba(0,0,0,0)'); pg.addColorStop(0.82, 'rgba(0,0,0,0)'); pg.addColorStop(1, 'rgba(0,0,0,0.42)');
      ctx.fillStyle = pg; ctx.fillRect(pf.x, pf.y, pf.w, pf.h); }
    ctx.strokeStyle = COL.brassdk; ctx.lineWidth = 1; ctx.strokeRect(pf.x - 1.5, pf.y - 1.5, pf.w + 3, pf.h + 3);
    ctx.strokeStyle = COL.brasshi; ctx.strokeRect(pf.x - 0.5, pf.y - 0.5, pf.w + 1, pf.h + 1);

    // title + subtitle + rule, in the right column beside the portrait
    const rx = pf.x + pf.w + 14, rw = x + w - 16 - rx;
    TYPE.draw(ctx, reg.name, rx, y + 12, TYPE.fitSize(ctx, reg.name, rw, 16, { display: true }), COL.inkdk, { display: true });
    TYPE.draw(ctx, 'a tale told in the tavern', rx, y + 31, 9, COL.inkfade, { italic: true });
    ctx.strokeStyle = COL.parchln; ctx.beginPath(); ctx.moveTo(rx, y + 42); ctx.lineTo(x + w - 16, y + 42); ctx.stroke();

    // tale text: flows right of the portrait, then full-width below it (float layout).
    // auto-fit the body size down a step or two so even the longest tale never clips.
    const segs = [{ t: '“' + hook + '”', italic: true, color: COL.dkpurple }, { gap: 6 }];
    for (const para of body.split('\n\n')) segs.push({ t: para, italic: false, color: COL.inkdk }, { gap: 7 });
    const top = y + 48, bot = y + h - 28, marginR = x + w - 16;
    const leftAt = (ty) => (ty < pf.y + pf.h + 4 ? rx : x + 18);
    const layout = (size) => {
      const lh = Math.round(size * 1.28); let ty = top; const out = [];
      for (const seg of segs) {
        if (seg.gap) { ty += seg.gap; continue; }
        const words = String(seg.t).split(' '); let line = '';
        const flush = () => { out.push({ t: line, x: leftAt(ty), y: ty, size, italic: seg.italic, color: seg.color }); ty += lh; };
        for (const wd of words) {
          const test = line ? line + ' ' + wd : wd;
          if (line && TYPE.width(ctx, test, size, { italic: seg.italic }) > marginR - leftAt(ty)) { flush(); line = wd; }
          else line = test;
        }
        if (line) flush();
      }
      return { out, fit: ty <= bot };
    };
    let res; for (const s of [11, 10, 9]) { res = layout(s); if (res.fit) break; }
    for (const ln of res.out) { if (ln.y > bot) break; TYPE.draw(ctx, ln.t, ln.x, ln.y, ln.size, ln.color, { italic: ln.italic }); }

    const bw = 120, bx = x + (w - bw) / 2, byb = y + h - 22;
    UI.drawBtn(ctx, bx, byb, bw, 16, '« Back to rumors');
    this._loreBackRect = { x: bx, y: byb, w: bw, h: 16 };
  },
  // SELL tab: two ledgers — EQUIPPED (mounted guns + augments) and IN THE HOLD (cargo),
  // both at half value. Crew are signed on/off at the Ship screen. Hover any row for full details.
  renderSell(ctx) {
    this._sellRows2 = [];      // X-to-sell rects (weapons + augments), confirm-gated
    this._loSlotRects = [];    // slot bodies for mount/stow swap
    this._hoverItem = null;
    const mx = Game.mouse.x, my = Game.mouse.y;
    // LEFT: YOUR GUNS — mounted (bright + slot number) vs stowed (dim). Click two to swap; X sells.
    const slots = UI.loadoutSlots();
    const c = UI.ledgerSection(ctx, 30, 30, 222, 216, 'YOUR GUNS · TAP TWO TO SWAP');
    const ROWH = Math.max(26, Math.min(32, Math.floor(c.h / slots.length)));
    slots.forEach((s, i) => {
      const x = c.x, y = c.y + i * ROWH, w = c.w, h = ROWH - 3;
      const mounted = s.kind === 'mount', sel = this.sellSel === i;
      ctx.fillStyle = s.key ? (mounted ? COL.paperhi : COL.paperlo) : COL.papermd;
      UI.roundRect(ctx, x, y, w, h, 4); ctx.fill();
      ctx.lineWidth = sel ? 2 : 1;
      ctx.strokeStyle = sel ? COL.gold : (mounted ? COL.brassdk : COL.golddk);
      UI.roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 4); ctx.stroke(); ctx.lineWidth = 1;
      this._loSlotRects.push({ rect: { x, y, w: w - 18, h }, idx: i, key: s.key });
      if (s.key) {
        const wd = DATA.WEAPONS[s.key], wa = SPR.weaponIcon(s.key);
        if (wa) ctx.drawImage(wa, x + 5, y + 6, 16, 8);
        if (mounted) { ctx.fillStyle = COL.golddk; UI.roundRect(ctx, x + 24, y + 4, 13, 9, 2); ctx.fill(); TYPE.drawCentered(ctx, '' + (s.i + 1), x + 30, y + 4, 9, COL.paperhi, { display: true }); TYPE.draw(ctx, 'MOUNTED', x + 40, y + 4, 8, COL.brassdk, { display: true }); }
        else TYPE.draw(ctx, 'STOWED', x + 24, y + 4, 8, COL.inkfade, { display: true });
        TYPE.draw(ctx, wd.name, x + 24, y + 14, TYPE.fitSize(ctx, wd.name, w - 44, 11), mounted ? COL.inkdk : COL.inkmd);
        const dx = x + w - 15, dy = y + Math.round(h / 2) - 5, hotX = this.inRect(mx, my, dx, dy, 12, 12);
        ctx.fillStyle = hotX ? COL.red : '#3a2030'; ctx.fillRect(dx, dy, 12, 12);
        TYPE.draw(ctx, 'X', dx + 3, dy + 1, 9, hotX ? COL.white : '#caa');
        this._sellRows2.push({ rect: { x: dx, y: dy, w: 12, h: 12 }, from: s.kind, idx: s.i });
        if (this.inRect(mx, my, x, y, w - 18, h) && !hotX) this._hoverItem = { kind: 'weapon', key: s.key };
      } else TYPE.drawCentered(ctx, mounted ? 'empty mount' : 'empty hold', x + w / 2, y + h / 2 - 4, 10, COL.inkfade, { italic: true });
    });
    // RIGHT: AUGMENTS (sell for half value)
    const c2 = UI.ledgerSection(ctx, 260, 30, 222, 216, 'AUGMENTS · HALF VALUE');
    const augs = Game.run.augs || [];
    if (!augs.length) TYPE.drawCentered(ctx, '— none aboard —', c2.x + c2.w / 2, c2.y + 16, 11, COL.inkfade, { italic: true });
    else augs.forEach((k, i) => {
      const y = c2.y + i * 24;
      this.sellRow(ctx, k, DATA.AUGS[k].name, c2.x, y, c2.w, this._sellRows2, { kind: 'aug', idx: i }, 22);
      if (this.inRect(mx, my, c2.x, y, c2.w, 22)) this._hoverItem = { kind: 'aug', key: k };
    });
    TYPE.drawCentered(ctx, 'Mounted guns fire in battle; stowed guns ride in the hold.', 256, 252, 10, COL.inkfade, { italic: true });
  },
  // FAMILIARS tab (only shown with a Binding Shrine aboard): FOR SALE (4 vessels) + BOUND ABOARD (sell)
  renderFamiliars(ctx) {
    this._rows = [];
    this._sellRows2 = [];
    this._hoverItem = null;
    const forSale = this.stock.filter(s => s.kind === 'familiar');
    const owned = Game.run.familiars || [];
    let c = UI.ledgerSection(ctx, 30, 30, 222, 216, 'FOR SALE');
    { let y = c.y;
      for (const it of forSale) { this.pillRow(ctx, it, c.x, y, c.w); y += 23; }
      if (!forSale.length) { TYPE.drawCentered(ctx, '— the vessels are spoken for —', c.x + c.w / 2, y + 6, 10, COL.inkfade, { italic: true }); y += 18; }
      // Seance Candles — the deploy / re-bind fuel, restocked here
      const candle = this.stock.find(s => s.kind === 'candle');
      if (candle) { y = Math.min(y + 5, c.y + c.h - 22); ctx.fillStyle = COL.parchln; ctx.fillRect(c.x, y - 3, c.w, 1); this.pillRow(ctx, candle, c.x, y, c.w); } // keep the candle row inside the FOR-SALE box
    }
    c = UI.ledgerSection(ctx, 260, 30, 222, 216, 'BOUND ABOARD  ·  HALF VALUE');
    if (!owned.length) TYPE.drawCentered(ctx, '— none bound yet —', c.x + c.w / 2, c.y + 16, 10, COL.inkfade, { italic: true });
    else { let y = c.y; owned.forEach((k, i) => { const h2 = 21; this.sellRow(ctx, k, DATA.FAMILIARS[k].name, c.x, y, c.w, this._sellRows2, { kind: 'familiar', idx: i }, h2); if (Game.mouse.x >= c.x && Game.mouse.x < c.x + c.w && Game.mouse.y >= y && Game.mouse.y < y + h2) this._hoverItem = { kind: 'familiar', key: k }; y += 23; }); }
    const note = Game.ship.sysLv.shrine > 0
      ? "You hold " + (Game.run.candles || 0) + " Seance Candles — each familiar deploy or re-bind burns one."
      : 'Buy a Binding Shrine (Systems) before you can bind a familiar.';
    TYPE.drawCentered(ctx, note, 256, 252, 10, COL.inkfade, { italic: true });
  },
  // forced "gun deck full" trade-in dialog when buying a weapon with no room
  renderSellPrompt(ctx) {
    this._sellRows = [];
    const it = this.sellPrompt.item;
    ctx.fillStyle = 'rgba(20,12,4,0.7)'; ctx.fillRect(0, 0, 512, 288);
    UI.framePanel(ctx, 96, 40, 320, 212, 'parchment'); // a framed parchment slip
    TYPE.label(ctx, 'GUN DECK FULL — TRADE SOMETHING IN', 256, 51, 300, 13, COL.inkdk, { display: true });
    ctx.fillStyle = COL.parchln; ctx.fillRect(110, 60, 292, 1);
    const wd0 = DATA.WEAPONS[it.key];
    ctx.fillStyle = COL.parch;
    UI.roundRect(ctx, 110, 66, 292, 20, 6); ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = COL.golddk;
    UI.roundRect(ctx, 111, 67, 290, 18, 5); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = COL.parchdk;
    UI.roundRect(ctx, 113, 69, 23, 14, 4); ctx.fill();
    ctx.strokeStyle = COL.inkfade; UI.roundRect(ctx, 113, 69, 23, 14, 4); ctx.stroke();
    const wa0 = SPR.weaponIcon(it.key);
    if (wa0) ctx.drawImage(wa0, 116, 72, 16, 8);
    TYPE.draw(ctx, 'Buying: ' + wd0.name, 140, 72, 11, COL.inkdk);
    TYPE.drawRight(ctx, '-' + it.price, 395, 72, 11, COL.dkred);
    TYPE.drawCentered(ctx, 'Sell one of yours to make room:', 256, 92, 11, COL.inkmd, { italic: true });
    let y = 104;
    Game.ship.weapons.forEach((w, i) => { this.sellRow(ctx, w.key, DATA.WEAPONS[w.key].name, 110, y, 292, this._sellRows, { from: 'mount', idx: i }); y += 22; });
    Game.run.cargo.forEach((k, i) => { this.sellRow(ctx, k, DATA.WEAPONS[k].name + ' (CARGO)', 110, y, 292, this._sellRows, { from: 'cargo', idx: i }); y += 22; });
    const cy = Math.min(y + 6, 234);
    UI.drawBtn(ctx, 196, cy, 120, 16, 'CANCEL');
    this._sellRows.push({ rect: { x: 196, y: cy, w: 120, h: 16 }, act: 'cancel' });
  },
  // ---- confirm-sell guard: one click no longer dumps a weapon/aug/familiar ----
  askSell(name, value, doFn) { this.confirmSell = { name, value, do: doFn }; AUDIO.sfx('click'); },
  drawConfirmSell(ctx) {
    const c = this.confirmSell; this._confirmRects = [];
    ctx.fillStyle = 'rgba(20,12,4,0.7)'; ctx.fillRect(0, 0, 512, 288);
    UI.framePanel(ctx, 116, 92, 280, 104, 'parchment');
    TYPE.label(ctx, 'SELL THIS?', 256, 106, 240, 14, COL.inkdk, { display: true });
    ctx.fillStyle = COL.parchln; ctx.fillRect(132, 118, 248, 1);
    TYPE.label(ctx, c.name, 256, 134, 250, 13, COL.inkmd, { italic: true });
    TYPE.drawCentered(ctx, 'for ' + c.value + ' shards — half value, no refunds', 256, 150, 10, COL.inkfade, { italic: true });
    UI.drawBtn(ctx, 134, 168, 110, 18, 'SELL', { blue: true });
    UI.drawBtn(ctx, 268, 168, 110, 18, 'KEEP');
    this._confirmRects.push({ rect: { x: 134, y: 168, w: 110, h: 18 }, act: 'sell' });
    this._confirmRects.push({ rect: { x: 268, y: 168, w: 110, h: 18 }, act: 'keep' });
  },
};

// ============ SHIP MENU (FTL-style tabbed: REACTOR / LOADOUT / CREW) ============
// The single between-battle ship window, opened by the map's SHIP button. Replaces the
// old standalone UpgradeScreen + InventoryScreen. REACTOR uses UNDO/ACCEPT batching.
const ShipMenu = {
  TABS: ['HEARTHSTONE', 'LOADOUT', 'CREW'],
  active: 0, // remembered across opens
  // body == the wood border's inner opening; tabs hang from the top band, footer rides
  // the bottom band (mirrors the map's framed-screen idiom).
  BODY: { x: 24, y: 24, w: 464, h: 240 },
  enter(args) {
    if (args && args.tab != null) this.active = U.clamp(args.tab, 0, this.TABS.length - 1);
    this._tabRects = [];
    this.msg = null;
    this.reactorInit();
    this.loInit();
  },
  update(dt) { Game.ship.tick(dt, null); },
  // content sits below the hanging tabs and above the bottom wood band
  paneRect() { const b = this.BODY; return { x: b.x + 10, y: b.y + 22, w: b.w - 20, h: b.h - 34 }; },
  inRect(x, y, rx, ry, rw, rh) { return U.inRect(x, y, rx, ry, rw, rh); },
  footerY() { return 268; }, // buttons ride the bottom wood band
  setTab(i) {
    if (i === this.active) return;
    if (this.active === 0) this.reactorCommit(); // lock queued upgrades in when leaving REACTOR
    this.active = i;
    if (i === 0) this.reactorInit();
    if (i === 1) this.loInit();
    this.msg = null;
    AUDIO.sfx('click');
  },
  leave() { if (this.active === 0) this.reactorCommit(); AUDIO.sfx('back'); Game.setScreen('map'); },
  click(x, y, btn) {
    for (let i = 0; i < this._tabRects.length; i++) {
      const r = this._tabRects[i];
      if (this.inRect(x, y, r.x, r.y, r.w, r.h)) { this.setTab(i); return; }
    }
    if (this.inRect(x, y, 404, this.footerY(), 84, 16)) { this.leave(); return; }
    this.clickPane(x, y, btn);
  },
  key(k) { if (k === 'Escape') this.leave(); },
  renderPane(ctx) {
    const a = this.paneRect();
    if (this.active === 0) { this.reactorRender(ctx, a); return; }
    if (this.active === 1) { this.loRender(ctx, a); return; }
    this.crewRender(ctx, a);
  },
  clickPane(x, y, btn) {
    if (this.active === 0) this.reactorClick(x, y, btn);
    else if (this.active === 1) this.loClick(x, y);
    else if (this.active === 2) this.crewClick(x, y);
  },
  render(ctx) {
    if (!UI.stoneBg(ctx)) { ctx.fillStyle = COL.cabin; ctx.fillRect(0, 0, 512, 288); }
    const b = this.BODY;
    // parchment ledger page fills the opening (matches the shop); the wood frame is the binding
    if (!UI.tileFill(ctx, 'ui_parchment', b.x, b.y, b.w, b.h, 'rgba(227,210,172,0.22)')) { ctx.fillStyle = COL.paper; ctx.fillRect(b.x, b.y, b.w, b.h); }
    UI.woodBorder(ctx, 24); // uniform tiled wood + brass frame around the opening
    // tabs hang from the top band into the content; folder bottoms meet the interior
    this._tabRects = UI.tabBar(ctx, 30, 2, 288, this.TABS, this.active);
    // resources on the top band, right of the tabs
    const run = Game.run, ship = Game.ship;
    const region = UI.regionLabel(run.region);
    const regionLeft = 506 - TYPE.width(ctx, region, 11, { italic: true }) - 6; // resources must stop before the region label
    let sx = 330;
    const stat = (icon, val, col) => {
      if (icon === 'shard' || icon === 'runeshot') UI.drawRes(ctx, icon, sx, 5, 11);
      else if (icon === 'hull') drawSysSym(ctx, 'hull', sx, 4, 12, COL.brasshi);
      const maxW = Math.max(16, regionLeft - (sx + 13));
      TYPE.draw(ctx, '' + val, sx + 13, 5, 11, col, { maxWidth: maxW, fit: 'shrink' });
      sx += 13 + Math.min(TYPE.width(ctx, '' + val, 11), maxW) + 12;
    };
    stat('hull', ship.hull + '/' + ship.hullMax, COL.paperhi);
    stat('shard', run.shards, COL.brasshi);
    stat('runeshot', run.runeshot, COL.pink);
    TYPE.drawRight(ctx, region, 506, 5, 11, '#d8c79a', { italic: true });
    this.renderPane(ctx);
    UI.drawBtn(ctx, 404, this.footerY(), 84, 16, 'DONE');
  },

  // ---------------- REACTOR pane: FTL-style UNDO / ACCEPT batching ----------------
  // Purchases queue into reactorPend (previewed in gold) and only touch the ship on
  // ACCEPT / DONE / leaving the tab; UNDO clears the queue.
  reactorInit() { this.reactorPend = { sys: {}, mana: 0, spent: 0 }; },
  rEffLv(k) { return Game.ship.sysLv[k] + (this.reactorPend.sys[k] || 0); },
  rEffMana() { return Game.ship.manaMax + this.reactorPend.mana; },
  rEffShards() { return Game.run.shards - this.reactorPend.spent; },
  rPending() { const p = this.reactorPend; return p.mana > 0 || p.spent > 0 || Object.keys(p.sys).length > 0; },
  rCostFor(k) {
    const lv = this.rEffLv(k), def = DATA.SYSTEMS[k];
    if (lv >= def.max) return null;
    if (lv === 0) return def.costs[0] || 60;
    return def.costs[lv + 1] || def.costs[lv] || (40 + (lv - 1) * 20);
  },
  reactorCommit() {
    const p = this.reactorPend, had = this.rPending();
    for (const k in p.sys) Game.ship.sysLv[k] += p.sys[k];
    Game.ship.manaMax += p.mana;
    Game.run.shards -= p.spent;
    this.reactorInit();
    if (had) Game.save();
  },
  // reactor lists core/sub systems always; advanced systems only once installed (they're
  // bought at anchorages, cap-gated — never installed from the reactor).
  rSysRows() { return DATA.SYS_POWERED.concat(DATA.SYS_SUB).filter(k => !DATA.SYS_ADVANCED.includes(k) || Game.ship.sysLv[k] > 0); },
  rRowY(a, i) { return a.y + 2 + i * 15; },
  reactorClick(x, y) {
    const a = this.paneRect(), fy = this.footerY();
    if (this.inRect(x, y, 24, fy, 70, 16)) { if (this.rPending()) { this.reactorInit(); this.msg = 'CHANGES UNDONE.'; AUDIO.sfx('back'); } return; }
    if (this.inRect(x, y, 98, fy, 84, 16)) { if (this.rPending()) { this.reactorCommit(); this.msg = 'UPGRADES INSTALLED.'; AUDIO.sfx('levelup'); } return; }
    const rows = this.rSysRows();
    for (let i = 0; i < rows.length; i++) {
      if (this.inRect(x, y, a.x + a.w - 84, this.rRowY(a, i), 80, 14)) { this.reactorBuy(rows[i]); return; }
    }
    if (this.inRect(x, y, a.x + a.w - 84, this.rRowY(a, rows.length) + 4, 80, 14)) this.reactorBuyMana();
  },
  reactorBuy(k) {
    const cost = this.rCostFor(k);
    if (cost === null) { this.msg = 'ALREADY AT MAXIMUM.'; return; }
    const roomless = k === 'sump' || k === 'shrine';
    if (this.rEffLv(k) === 0 && !roomless && !Game.ship.roomByKey(k)) { this.msg = 'NO ROOM FOR THAT SYSTEM.'; AUDIO.sfx('back'); return; }
    if (this.rEffShards() < cost) { this.msg = 'NOT ENOUGH SHARDS.'; AUDIO.sfx('back'); return; }
    this.reactorPend.sys[k] = (this.reactorPend.sys[k] || 0) + 1;
    this.reactorPend.spent += cost;
    this.msg = DATA.SYSTEMS[k].name.toUpperCase() + ' QUEUED -> LV ' + this.rEffLv(k);
    AUDIO.sfx('click');
  },
  reactorBuyMana() {
    if (this.rEffMana() >= DATA.CORE_MAX) { this.msg = 'THE MANA HEARTHSTONE SINGS AT FULL PITCH.'; return; }
    const cost = DATA.CORE_COST(this.rEffMana());
    if (this.rEffShards() < cost) { this.msg = 'NOT ENOUGH SHARDS.'; AUDIO.sfx('back'); return; }
    this.reactorPend.mana++;
    this.reactorPend.spent += cost;
    this.msg = 'MANA HEARTHSTONE QUEUED -> ' + this.rEffMana() + ' BARS';
    AUDIO.sfx('click');
  },
  reactorRender(ctx, a) {
    const ship = Game.ship, rows = this.rSysRows();
    let hoverKey = null;
    rows.forEach((k, i) => {
      const ry = this.rRowY(a, i), def = DATA.SYSTEMS[k];
      const lv = ship.sysLv[k], eff = this.rEffLv(k);
      drawSysSym(ctx, k, a.x + 2, ry + 1, 13, eff > 0 ? COL.inkdk : COL.inkfade); // ink silhouette on the ledger page
      TYPE.draw(ctx, def.name, a.x + 18, ry + 2, 12, eff > 0 ? COL.inkdk : COL.inkfade);
      const cost = this.rCostFor(k), bx = a.x + a.w - 84;
      const pipX = bx - 12 - def.max * 6; // right-align the level pips next to the button (one group)
      for (let b = 0; b < def.max; b++) {
        ctx.fillStyle = b < lv ? COL.inkmd : b < eff ? COL.golddk : COL.parchdk; // installed = ink, queued = gold preview (ledger, not digital navy)
        ctx.fillRect(pipX + b * 6, ry + 4, 4, 7);
      }
      if (cost === null) TYPE.draw(ctx, 'Max', bx + 30, ry + 2, 11, COL.inkfade);
      else UI.drawBtn(ctx, bx, ry, 80, 14, (eff === 0 ? 'INSTALL ' : 'UPGRADE ') + cost, { disabled: this.rEffShards() < cost });
      if (this.inRect(Game.mouse.x, Game.mouse.y, a.x, ry, a.w, 14)) hoverKey = k;
    });
    const my = this.rRowY(a, rows.length) + 4, mbx = a.x + a.w - 84;
    drawSysSym(ctx, 'hearthstone', a.x + 2, my + 1, 13, COL.inkdk);
    TYPE.draw(ctx, 'Mana Hearthstone', a.x + 18, my + 2, TYPE.fitSize(ctx, 'Mana Hearthstone', 96, 12), COL.inkdk);
    const mpipX = mbx - 12 - DATA.CORE_MAX * 5; // right-align mana pips next to the Charge button too
    for (let b = 0; b < DATA.CORE_MAX; b++) {
      // mana pips read in the sanctioned mana-blue — distinct from the ink system-level pips
      ctx.fillStyle = b < ship.manaMax ? COL.water : b < this.rEffMana() ? COL.golddk : COL.parchdk;
      ctx.fillRect(mpipX + b * 5, my + 4, 3, 7);
    }
    if (this.rEffMana() < DATA.CORE_MAX)
      UI.drawBtn(ctx, mbx, my, 80, 14, 'Charge ' + DATA.CORE_COST(this.rEffMana()), { disabled: this.rEffShards() < DATA.CORE_COST(this.rEffMana()) });
    else TYPE.draw(ctx, 'Max', mbx + 30, my + 2, 11, COL.inkfade);
    if (this.inRect(Game.mouse.x, Game.mouse.y, a.x, my, a.w, 14)) hoverKey = 'mana';
    // footer: UNDO / ACCEPT + queued-shard preview / last message
    const fy = this.footerY();
    UI.drawBtn(ctx, 24, fy, 70, 16, 'UNDO', this.rPending() ? { blue: true } : { disabled: true });
    UI.drawBtn(ctx, 98, fy, 84, 16, 'ACCEPT', this.rPending() ? {} : { disabled: true });
    if (this.rPending()) TYPE.draw(ctx, 'Shards ' + this.rEffShards() + '   (-' + this.reactorPend.spent + ' queued)', 190, fy + 3, TYPE.fitSize(ctx, 'Shards ' + this.rEffShards() + '   (-' + this.reactorPend.spent + ' queued)', 205, 11), COL.brasshi);
    else if (this.msg) TYPE.draw(ctx, this.msg, 190, fy + 3, TYPE.fitSize(ctx, this.msg, 205, 11), COL.brasshi);
    else TYPE.draw(ctx, 'Hover a system for what the next level does.', 190, fy + 3, TYPE.fitSize(ctx, 'Hover a system for what the next level does.', 205, 10), COL.inkfade, { italic: true });
    // floating tooltip: the concrete effect of the NEXT level (drawn last so it sits on top)
    if (hoverKey) this.drawReactorTip(ctx, this.reactorTipLines(ctx, hoverKey));
  },
  // what the NEXT upgrade actually buys — concrete numbers pulled from TUNING so it stays accurate.
  reactorTipLines(ctx, k) {
    const ink = COL.inkdk, mid = COL.inkmd, gold = COL.golddk, lines = []; // golddk reads on parchment; brasshi washed out
    const wrapInto = (txt, c) => { for (const w of TYPE.wrap(ctx, txt, 188, 10, {})) lines.push({ t: w, c }); };
    if (k === 'mana') {
      const cur = this.rEffMana();
      lines.push({ t: 'Mana Hearthstone  (' + cur + ' bars)', c: ink });
      wrapInto('Total mana you split across your systems each battle.', mid);
      wrapInto(cur < DATA.CORE_MAX ? 'Charge: +1 bar of mana to allocate (now ' + (cur + 1) + ').' : 'At full pitch.', gold);
      return lines;
    }
    const def = DATA.SYSTEMS[k], cur = this.rEffLv(k), n = cur + 1, T = TUNING;
    lines.push({ t: def.name + '  (Lv ' + cur + ')', c: ink });
    wrapInto(def.desc, mid);
    let nx;
    if (cur >= def.max) nx = 'At maximum level.';
    else switch (k) {
      case 'wards': nx = 'Lv ' + n + ': up to ' + Math.floor(n / 2) + ' ward layer' + (Math.floor(n / 2) === 1 ? '' : 's') + ' — each soaks one hit (2 bars = 1 layer).'; break;
      case 'sails': nx = 'Lv ' + n + ': up to +' + (n * 5) + '% evasion at full power (+5% per bar).'; break;
      case 'weapons': nx = 'Lv ' + n + ': power up to ' + n + ' weapon bars — heavier guns, faster reloads.'; break;
      case 'infirmary': nx = 'Lv ' + n + ': heals ' + (T.infHealBase + n * T.infHealPerBar) + ' HP/s to crew inside (was ' + (T.infHealBase + cur * T.infHealPerBar) + ').'; break;
      case 'sump': nx = 'Lv ' + n + ': drains floodwater faster — +' + T.pumpPerBarDrain + ' water/s per powered bilge bar.'; break;
      case 'stormhex': nx = 'Lv ' + n + ': jam an enemy system for ' + T.hexJamSecs[n] + 's (was ' + T.hexJamSecs[cur] + 's); recharge ' + T.hexCdSecs[n] + 's.'; break;
      case 'sirensong': nx = 'Lv ' + n + ': charm holds ' + T.songCharmSecs[n] + 's (was ' + T.songCharmSecs[cur] + 's); recharge ' + T.songCdSecs[n] + 's.'; break;
      case 'helm': nx = 'Lv ' + n + ': +' + (n * 3) + '% evasion when manned (+3% per level).'; break;
      case 'doors': nx = 'Lv ' + n + ': boarders force your hatches more slowly; fire & flood creep through shut doors slower.'; break;
      case 'lookout': nx = n <= 1 ? 'Lv 1: see inside enemy ships — their systems and crew.' : 'Lv 2: also spot enemy crew through their fog.'; break;
      case 'shrine': nx = 'Lv ' + n + ': wake up to ' + n + ' bound familiar' + (n === 1 ? '' : 's') + ' (1 per powered bar).'; break;
      case 'brinegate': nx = cur === 0 ? 'Lv 1: open the portal — teleport up to 2 crew to board the enemy.' : 'Lv ' + n + ': boards recharge faster.'; break;
      case 'fogveil': nx = cur === 0 ? 'Lv 1: raise a fog cloak — +60% evasion for a few seconds.' : 'Lv ' + n + ': hold the fog longer.'; break;
      default: nx = 'Lv ' + n + '.'; break;
    }
    wrapInto(nx, gold);
    return lines;
  },
  drawReactorTip(ctx, lines) {
    if (!lines || !lines.length) return;
    const SZ = 10, lh = 13;
    let maxw = 0; for (const l of lines) maxw = Math.max(maxw, TYPE.width(ctx, l.t, SZ));
    const W = Math.min(212, Math.round(maxw) + 22), H = 8 + lines.length * lh + 6;
    const x = U.clamp(Game.mouse.x + 12, 4, 508 - W), y = U.clamp(Game.mouse.y + 10, 4, 284 - H);
    const r = UI.drawScrap(ctx, x, y, W, H);
    let ty = r.iy + 2;
    for (const l of lines) { TYPE.draw(ctx, l.t, r.ix, ty, SZ, l.c); ty += lh; }
  },

  // ---------------- LOADOUT pane: weapon mounts + cargo (swap / sell) + augments ----------------
  loInit() { this.loSel = -1; },
  loSlots() { return UI.loadoutSlots(); },
  loSlotRect(a, idx) { return { x: a.x + (idx % 3) * 150, y: a.y + 12 + Math.floor(idx / 3) * 42, w: 142, h: 38 }; },
  loSwap(ai, bi) { UI.loadoutSwap(ai, bi); AUDIO.sfx('click'); this.msg = 'RIGGING ADJUSTED.'; },
  loClick(x, y) {
    for (const row of (this._augSellRows || [])) if (this.inRect(x, y, row.rect.x, row.rect.y, row.rect.w, row.rect.h)) {
      const sold = UI.sellAug(row.i); this.msg = DATA.AUGS[sold.key].name.toUpperCase() + ' SOLD FOR ' + sold.value + '.'; AUDIO.sfx('coin'); return;
    }
    for (const row of (this._dumpRows || [])) if (this.inRect(x, y, row.rect.x, row.rect.y, row.rect.w, row.rect.h)) {
      if (row.kind === 'mount' && !Game.ship.weapons[row.i]) return;
      const sold = UI.sellWeapon(row.kind, row.i); this.msg = DATA.WEAPONS[sold.key].name.toUpperCase() + ' SOLD FOR ' + sold.value + '.'; this.loSel = -1; AUDIO.sfx('coin'); return;
    }
    const a = this.paneRect(), slots = this.loSlots();
    for (let i = 0; i < slots.length; i++) {
      const r = this.loSlotRect(a, i);
      if (this.inRect(x, y, r.x, r.y, r.w, r.h)) {
        if (this.loSel === -1) { if (slots[i].key) { this.loSel = i; AUDIO.sfx('click'); } }
        else if (this.loSel === i) this.loSel = -1;
        else { this.loSwap(this.loSel, i); this.loSel = -1; }
        return;
      }
    }
  },
  loRender(ctx, a) {
    TYPE.draw(ctx, 'Weapons & Cargo  —  click two to swap   /   X sells a gun for half', a.x + 2, a.y - 1, TYPE.fitSize(ctx, 'Weapons & Cargo  —  click two to swap   /   X sells a gun for half', a.w - 4, 11), COL.inkmd, { italic: true });
    this._dumpRows = [];
    let hover = null;
    this.loSlots().forEach((s, i) => {
      const r = this.loSlotRect(a, i);
      ctx.fillStyle = this.loSel === i ? COL.paperhi : COL.paperlo; ctx.fillRect(r.x, r.y, r.w, r.h); // parchment slot (was navy)
      ctx.strokeStyle = s.kind === 'cargo' ? COL.golddk : (this.loSel === i ? COL.gold : COL.brassdk); ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      if (s.key) {
        const wd = DATA.WEAPONS[s.key], wa = SPR.weaponIcon(s.key);
        if (wa) ctx.drawImage(wa, r.x + 4, r.y + 4, 16, 8);
        else if (!SPR.drawFrame(ctx, 'wpn_' + wd.family + '_' + wd.tint.replace('#', ''), r.x + 4, r.y + 4)) ctx.drawImage(SPR.weaponSprite(wd.family, wd.tint), r.x + 4, r.y + 4);
        const dx = r.x + r.w - 13, dy = r.y + 3, hotX = this.inRect(Game.mouse.x, Game.mouse.y, dx, dy, 10, 10);
        ctx.fillStyle = hotX ? COL.red : '#3a2030'; ctx.fillRect(dx, dy, 10, 10);
        TYPE.draw(ctx, 'X', dx + 2, dy + 1, 9, hotX ? COL.white : '#caa');
        this._dumpRows.push({ rect: { x: dx, y: dy, w: 10, h: 10 }, kind: s.kind, i: s.i, key: s.key });
        TYPE.draw(ctx, wd.name, r.x + 4, r.y + 14, TYPE.fitSize(ctx, wd.name, r.w - 8, 11), COL.inkdk);
        TYPE.draw(ctx, (wd.family || '') + ' · ' + wd.power + ' mana · ' + wd.charge + 's', r.x + 4, r.y + 26, TYPE.fitSize(ctx, (wd.family || '') + ' · ' + wd.power + ' mana · ' + wd.charge + 's', r.w - 8, 9), COL.inkmd);
        if (this.inRect(Game.mouse.x, Game.mouse.y, r.x, r.y, r.w, r.h) && !hotX) hover = { kind: 'weapon', key: s.key };
      } else TYPE.drawCentered(ctx, s.kind === 'cargo' ? 'Empty hold' : 'Empty mount', r.x + r.w / 2, r.y + 12, 11, COL.inkfade, { italic: true });
    });
    // augments
    const ay0 = a.y + 102;
    TYPE.draw(ctx, 'Augments  (X sells for half)', a.x + 2, ay0 - 1, 11, COL.inkmd, { italic: true });
    if (!Game.run.augs.length) TYPE.draw(ctx, 'None yet — shops and fortune provide', a.x + 180, ay0 - 1, 10, COL.inkfade, { italic: true });
    this._augSellRows = [];
    Game.run.augs.forEach((aug, i) => {
      const ay = ay0 + 13 + i * 13, hot = this.inRect(Game.mouse.x, Game.mouse.y, a.x + 2, ay - 1, 300, 12);
      UI.drawAugIcon(ctx, aug, a.x + 2, ay - 1, 14);
      TYPE.draw(ctx, DATA.AUGS[aug].name, a.x + 18, ay - 1, TYPE.fitSize(ctx, DATA.AUGS[aug].name, 260, 12), hot ? COL.inkdk : COL.inkmd);
      const xx = a.x + 286, hotX = this.inRect(Game.mouse.x, Game.mouse.y, xx, ay - 1, 10, 10);
      ctx.fillStyle = hotX ? COL.red : '#3a2030'; ctx.fillRect(xx, ay - 1, 10, 10);
      TYPE.draw(ctx, 'X', xx + 2, ay, 9, hotX ? COL.white : '#caa');
      this._augSellRows.push({ rect: { x: xx, y: ay - 1, w: 10, h: 10 }, key: aug, i });
      if (hot && !hotX) hover = { kind: 'aug', key: aug };
    });
    if (this.msg) TYPE.draw(ctx, this.msg, 24, this.footerY() + 3, TYPE.fitSize(ctx, this.msg, 360, 11), COL.brasshi);
    if (hover) UI.itemCard(ctx, hover, this.footerY() - 2); // pinned below the grid, never covers the slots
  },

  // ---------------- CREW pane: roster (HP + station mastery) + dismiss ----------------
  CREW_ABBR: { weapons: 'G', helm: 'H', sails: 'S', wards: 'W', repair: 'R', combat: 'B' },
  CREW_STATION: { weapons: 'Gunnery', helm: 'Helm', sails: 'Sails', wards: 'Wards', repair: 'Repair', combat: 'Boarding' },
  crewClick(x, y) {
    for (const row of (this._dismissRows || [])) if (this.inRect(x, y, row.rect.x, row.rect.y, row.rect.w, row.rect.h)) {
      if (Game.ship.aliveCrew().length <= 1) { this.msg = 'YOU CANNOT SAIL ALONE.'; AUDIO.sfx('back'); return; }
      const idx = Game.ship.crew.findIndex(c => c.id === row.id);
      if (idx >= 0) { Game.ship.crew.splice(idx, 1); this.msg = row.name.toUpperCase() + ' ROWS ASHORE WITH A FAIR REFERENCE.'; AUDIO.sfx('back'); Game.save(); }
      return;
    }
  },
  crewRender(ctx, a) {
    const crew = Game.ship.aliveCrew();
    const mx = Game.mouse.x, my = Game.mouse.y;
    TYPE.draw(ctx, 'Crew  ' + crew.length + '/8', a.x + 2, a.y + 4, 11, COL.inkmd, { italic: true, baseline: 'middle' });
    this._dismissRows = [];
    let hover = null;
    // ROWH 22 keeps a full 8-crew roster inside the pane (8*22=176 < usable ~178);
    // CARDH 21 fits two middle-baselined text lines (name 11 @ ry+6, detail 9 @ ry+15) with no spill.
    const ROWH = 22, CARDH = 21, L1 = 6, L2 = 15;
    crew.forEach((c, i) => {
      const ry = a.y + 16 + i * ROWH;
      ctx.fillStyle = COL.paperlo; ctx.fillRect(a.x, ry - 1, a.w, CARDH); // parchment crew card
      ctx.strokeStyle = COL.brassdk; ctx.strokeRect(a.x + 0.5, ry - 0.5, a.w - 1, CARDH - 1);
      if (this.inRect(mx, my, a.x, ry - 1, a.w, CARDH)) hover = { c, ry };
      if (!SPR.drawCrewIcon(ctx, c.race, a.x + 3, ry + 3, 14))
        if (!SPR.drawFrame(ctx, 'portrait_' + c.race, a.x + 3, ry + 3)) ctx.drawImage(SPR.portrait(c.race), a.x + 3, ry + 3);
      TYPE.draw(ctx, c.name, a.x + 22, ry + L1, TYPE.fitSize(ctx, c.name, 124, 11), COL.inkdk, { baseline: 'middle' });
      TYPE.draw(ctx, DATA.RACES[c.race].name, a.x + 22, ry + L2, 9, COL.inkmd, { italic: true, baseline: 'middle' });
      // HP bar (line 1, right) + number
      const bx = a.x + 150, hpf = Math.max(0, c.hp) / c.maxhp;
      ctx.fillStyle = COL.inkmd; ctx.fillRect(bx, ry + 3, 60, 6);
      ctx.fillStyle = hpf > 0.5 ? COL.green : hpf > 0.25 ? COL.orange : COL.red;
      ctx.fillRect(bx + 1, ry + 4, Math.round(58 * hpf), 4);
      TYPE.draw(ctx, Math.ceil(Math.max(0, c.hp)) + '/' + c.maxhp, bx + 64, ry + L1, 10, COL.inkdk, { baseline: 'middle' });
      // station mastery (line 2, right): station word + warm rank pips (hover row for full detail)
      let tx = bx, any = false;
      for (const k of ['weapons', 'helm', 'sails', 'wards', 'repair', 'combat']) {
        const r = DATA.crewRank(c, k);
        if (r > 0 && tx < a.x + a.w - 92) {
          any = true;
          const col = r === 2 ? COL.golddk : COL.brassdk, word = this.CREW_STATION[k];
          TYPE.draw(ctx, word, tx, ry + L2, 9, col, { baseline: 'middle' });
          let dotx = tx + TYPE.width(ctx, word, 9) + 3;
          for (let s = 0; s < r; s++) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(dotx + s * 5 + 1.8, ry + L2, 1.9, 0, 7); ctx.fill(); }
          tx = dotx + r * 5 + 7;
        }
      }
      if (!any) TYPE.draw(ctx, 'Still green', bx, ry + L2, 9, COL.inkfade, { italic: true, baseline: 'middle' });
      // dismiss
      if (crew.length > 1) {
        const dx = a.x + a.w - 66, dy = ry + (CARDH - 15) / 2;
        UI.drawBtn(ctx, dx, dy, 62, 15, 'DISMISS');
        this._dismissRows.push({ rect: { x: dx, y: dy, w: 62, h: 15 }, id: c.id, name: c.name });
      }
    });
    // empty berths fill the remaining capacity so a short roster reads as "room for more", not a void
    for (let i = crew.length; i < 8; i++) {
      const ry = a.y + 16 + i * ROWH;
      ctx.save(); ctx.strokeStyle = COL.parchln; ctx.setLineDash([4, 3]);
      UI.roundRect(ctx, a.x + 0.5, ry - 0.5, a.w - 1, CARDH - 1, 3); ctx.stroke(); ctx.restore();
      TYPE.drawCentered(ctx, 'empty berth', a.x + a.w / 2, ry + CARDH / 2 - 1, 9, COL.inkfade, { italic: true, baseline: 'middle' });
    }
    // shrunk legend (hover a sailor for the full station list)
    { const lg = '● trained   ●● grand master   ·   hover a sailor for station detail'; TYPE.draw(ctx, lg, a.x + 2, a.y + a.h - 6, TYPE.fitSize(ctx, lg, a.w - 4, 10), COL.inkfade, { italic: true, baseline: 'middle' }); }
    if (this.msg) TYPE.draw(ctx, this.msg, 24, this.footerY() + 3, TYPE.fitSize(ctx, this.msg, 360, 11), COL.brasshi);
    // hover tooltip: full station — rank (effect), painted on top
    if (hover && !(this._dismissRows.some(d => this.inRect(mx, my, d.rect.x, d.rect.y, d.rect.w, d.rect.h)))) {
      const c = hover.c, lines = [];
      for (const k of ['weapons', 'helm', 'sails', 'wards', 'repair', 'combat']) {
        const r = DATA.crewRank(c, k);
        if (r > 0) lines.push(this.CREW_STATION[k] + ' — ' + (r === 2 ? 'Grand Master' : 'Trained') + ' (' + DATA.SKILL_EFFECT[k] + ')');
      }
      if (!lines.length) lines.push('No station mastery yet.');
      const sz = 10, lh = 13, pad = 6;
      let w = 0; for (const l of lines) w = Math.max(w, TYPE.width(ctx, l, sz)); w = Math.round(w) + pad * 2;
      const h = lines.length * lh + pad * 2;
      let tx = U.clamp(mx + 12, 4, 512 - w - 4), ty = U.clamp(my + 10, 4, 288 - h - 4);
      ctx.fillStyle = COL.parch; UI.roundRect(ctx, tx, ty, w, h, 4); ctx.fill();
      ctx.strokeStyle = COL.brassdk; UI.roundRect(ctx, tx + 0.5, ty + 0.5, w - 1, h - 1, 4); ctx.stroke();
      let yy = ty + pad + lh / 2;
      for (const l of lines) { TYPE.draw(ctx, l, tx + pad, yy, sz, COL.inkdk, { baseline: 'middle' }); yy += lh; }
    }
  },
};

// ============ LORE BOOK (illustrated encyclopedia) ============
const LORE_PAGES = [
  { title: 'THE MYTHRIL AGE', img: 'vig_city', cap: 'THE RUMORED CITY',
    text: "Mythril is the bone of the old gods, or so the priests say. What is certain: it is the only metallic crystal that holds enchantment the way a bottle holds rum. Every ward, every charmed sail, every flying spark of battle-magic is anchored in a sliver of it. The Old World's veins ran dry a century ago. What remained went to the Imperial Armada - and with it came the law: magic belongs to the Empire." },
  { title: 'HOW MAGIC WORKS', img: 'vig_mana', cap: 'ENCHANTMENT, BOTTLED',
    text: "Mythril holds enchantment the way a bottle holds rum: raw magic bleeds from anything else, but sealed in mythril it keeps. A mana hearthstone feeds what it holds to wards, sails, and guns a bar at a time - and there is never enough. Rationing it is the whole art of command. Crews do not cast spells; they pump, aim, and pray. Each people works it differently: most shape it raw, dwarves bind it into runework, lizardfolk carry it in the blood." },
  { title: 'HUMANS & THE EMPIRE', img: 'portrait_human', cap: 'A FREE CAPTAIN', race: 'human',
    text: "Humans hold no magic of their own — which made them sailors, smugglers, and the world's best customers. The Empire turned that hunger into a fleet: every port pays the mythril tithe, and every captain who skips it is, officially, a pirate. Their answer to a world of magic is the gun deck — saltpeter, iron, and drill. You don't need a wizard to make a hole." },
  { title: 'GRAND ADMIRAL VEY', img: 'portrait_admiral', cap: 'THE PURSUIT FLEET',
    text: "Iron-haired, twice-drowned, and never once late. Corvin Vey commands the Pursuit Fleet, the Armada's long arm beyond the charts. He does not hate you; he files you. His standing order is famous: the chart comes back, the rest is ballast. They say he keeps every chart he has ever recovered in a sealed room - and has never sailed by any of them." },
  { title: 'THE MERFOLK', img: 'portrait_merfolk', cap: 'SAPPHIRE SHALLOWS', race: 'merfolk',
    text: "The reef-cities of the Sapphire Shallows were old when the Empire was a rowboat. Merfolk treat the sea as a commons and ships as amusing guests. Their tide-magic bends water itself: gates of brine, drill-conchs that open hulls below the waterline, coral that grows doors shut, crews that breathe the flood. They will trade with anyone and fight for almost no one. Almost." },
  { title: 'THE LIZARDFOLK', img: 'portrait_lizard', cap: 'THE SERPENT CAYS', race: 'lizard',
    text: "The Serpent Cays raise raiders the way other islands raise fruit. Lizardfolk magic is the body itself: venom, scale, and a patience that outlasts sieges. They fight the crew, never the hull - a sunk prize pays nothing. They prize trophies over treasure and stories over both. A captain who beats them in a fair fight may find them surprisingly good company afterward." },
  { title: 'THE FIRE DJINN', img: 'portrait_djinn', cap: 'THE CINDER ISLES', race: 'djinn',
    text: "The djinn say they were lamplight before they were people. Their forge-isles burn day and night, hammering weather into weapons: flame lances, phoenix rays, bombs that bloom like little suns. Djinn law is contract law - a deal sealed by fire is kept. Cross one, and the fire remembers your name." },
  { title: 'THE STORM ELVES', img: 'portrait_stormelf', cap: 'TEMPEST REACH', race: 'stormelf',
    text: "Tempest Reach is one endless argument between sky and sea, and the elves long ago took the sky's side. They ride gales the way other folk ride horses, and their stormcall does not burn ships - it scrambles the mana that runs them, and leaves whole gundecks dark. An elf becalmed is an elf insulted. They find the rest of us unbearably slow. Mostly, we are." },
  { title: 'THE DEEP DWARVES', img: 'portrait_dwarf', cap: 'THE IRON DEEPS', race: 'dwarf',
    text: "When the land's mines emptied, the dwarves followed the veins under the sea floor. The Iron Deeps are their toll roads: sea-forts, harbor chains, ledgers in triplicate. Their masterpiece is runeshot — a shell carved with a rune of passage that walks politely through any ward. The dwarves sell it to all sides at one honest price. Pay the toll; it's cheaper." },
  { title: 'THE SIRENS', img: 'portrait_siren', cap: "THE SIREN'S MAZE", race: 'siren',
    text: "No one charts the Siren's Maze; the Maze charts you. Sirens sing the oldest weather - song that touches minds, not hulls. Most wish only to be left alone with the fog and their grief. Some take passage on mortal ships, for reasons they rarely explain. Wax in the ears is polite. Listening is fatal. Asking first is friendship." },
  { title: 'THE WARDEN OF THE VEIL', img: 'portrait_warden', cap: 'THE LAST FLEET',
    text: "The last fleet of the city that built the city. The Warden is a dreadnought grown, not built: mythril keel, mythril ribs, a crew that has not aged a day in three hundred years. It does not conquer; it subtracts. Every chart that points west eventually meets it. Yours points west." },
  { title: 'THE CITY OF MYTHRIL', img: 'vig_city', cap: 'ONE CHANCE AN AGE',
    text: "It has a true name, but no one living has heard it twice the same. A city of light on a continent of rumor: harbor gates of woven silver, streets that hum like a struck bell. Whether it stands empty, waiting, or very much lived-in depends on which drowned sailor you ask. Every age gets one chance at it. This one is yours." },
];

// build encyclopedia: how each people fights - ships & fittings, arsenal, crew.
// written to make a captain daydream about the run they'll try next.
const LORE_BUILDS = {
  human: {
    ships: "THE GUNLINE. A human hull is a floating ledger: guns amidships, powder below, profit aft. Favored fittings: Mythril Plating, the Merchant's Seal, a Runeforge for bought torpedoes. Familiars are purchased like everything else - dwarven Clockwork Gulls and Tinker Beetles, paid in full. The build: volume of iron strips wards faster than any spell.",
    weapons: "Powder answers magic. Light Cannon and Chainshot open, the Grapeshot Battery chews ward layers three balls at a time, Heavy Cannon breaches, Broadside ends arguments. The Chain Culverin reloads faster as the crew finds its rhythm; the Langrage Sweep pays wards in scrap change. When wards must be skipped outright: dwarven torpedoes, bought at the tolls.",
    crew: "Steady hands. No magic, no weaknesses, no surcharges. Humans man any station without complaint and die without glowing. Hire them in pairs - one for the helm, one for the guns - and the powder keeps its own time.",
  },
  merfolk: {
    ships: "THE DROWNER. Merfolk do not sink ships; they invite the sea aboard. Favored fittings: the Portal to board through the flood, Selkie Cloak, Dwarven Pumps for the water YOU carry, Tidecaller Pearl. Familiars are grown, not built: the Coral Sentinel stomps boarders in flooded rooms, Reef-Singers regrow hull at sea. Breach, flood, board what cannot breathe.",
    weapons: "The waterline is the weapon. Tide Lance slips through a ward layer; the Augershot drills below the waterline so the ocean does the killing; the Maelstrom Bomb folds a wave into a room; the Barnacle Bomb grows the doors shut around it. The Kraken Inkjet blinds the helm. Then the Portal opens, and the crew that breathes water meets the crew that doesn't.",
    crew: "They breathe the flood, swim like rumor, and patch leaks three times faster - sailors built for the ship they intend to leave you with. Send them into the rooms you drowned and let the sea finish the argument.",
  },
  djinn: {
    ships: "THE FIRESHIP. Djinn hulls run hot: lances on the rail, fire in the rooms, contracts in the hold. Favored fittings: the Emberheart Core (every battle opens fully charged) and Phoenix Ash. Familiars ARE djinn craft - the Ember Imp harasses, the Brass Janissary boards, folded out of lamplight. Lances that never miss; fires that never stop.",
    weapons: "Poured light and planted flame. The Ember Lens sweeps two rooms on a single mana bar; the Noon Glass remembers the desert at midday; the Phoenix Ray is the firebird's own gaze. The Wildfire Beam doesn't cut - it plants. Flame Lance and Cinder Volley keep small fires coming, and the Inferno Bomb blooms inside the hull like a little sun.",
    crew: "Fireproof, strong, and liable to ignite the room mid-brawl. A djinn in a burning compartment is a djinn at home - send them to fight exactly where you planted the wildfire.",
  },
  stormelf: {
    ships: "THE CONTROLLER. An elf ship wins by never being hit and never letting you act. Favored fittings: Windrider Figurehead, the Stormcaller Mast (the veil jolts enemy guns), a Fog Veil kept warm. Familiar of choice: the Squall Sprite, a knot of wind that swats torpedoes out of the air. High evasion, locked enemy guns, victory by exhaustion.",
    weapons: "Thunder doesn't burn; it silences. The Spark Bolt drains mana rudely, the Stormlash whips whole gundecks dark, the Tempest Chain keeps the storm's time and quickens with it. The Thunderhead waits politely, banks three bolts, and ends a ward stack in one breath. Gale Shear becalms the runners. Nothing sinks - everything stops.",
    crew: "Fast as gossip, fragile as pride. +5% evasion at the sails, +15% charge at the guns - an elf makes the ship around them quicker. Keep them out of melee; they consider it rude.",
  },
  dwarf: {
    ships: "THE MISSILE BOAT. A dwarf hull is a toll-fort that floats: armor, pumps, ledgers, ordnance. Favored fittings: Dwarven Pumps, Mythril Plating, the Runeforge (a quarter of your shots fire free - audited). Familiars of brass: the Clockwork Gull, Tinker Beetles, and the Counter-Sigil Wisp that proofreads enemy bombs out of existence.",
    weapons: "Everything is invoiced. The Cog Torpedo is the budget answer, the Seeker heard your keel, the Forge-Twins ship two fish on ONE runeshot. The Petard Rune opens hulls by agreement, the Null Rune argues a system out of believing in magic, and the Rune Bombard simply pierces. Stock runeshot the way a creditor stocks patience.",
    crew: "Tough, slow, and twice the repairman anyone else is, with no panic in them even on fire. Dwarves keep the missile boat firing while the hull complains. Pay them on time. They notice.",
  },
  lizard: {
    ships: "THE HEADHUNTER. Lizard raiders fight the crew, not the hull - a sunk prize pays nothing. Favored fittings: the Siren Lure (boarders arrive weaker), Phoenix Ash, anything that keeps YOUR boarding party standing. The Coral Sentinel guards the door while you work. Empty the enemy ship, take it whole, collect the 60% capture bounty.",
    weapons: "The wound is small; the week is terrible. Venom Darts poison through the planks, the Quill Storm exhales an alchemist's quiver without scratching the prize, and borrowed iron does the knock-down work. Pair with songs or stuns, then board: a poisoned crew fights the brawl already losing.",
    crew: "Savage in the brawl - the hardest hitters afloat - and they grow their wounds shut. A lizardfolk boarding party is how negotiations end. Feed them trophies and they will follow you west.",
  },
  siren: {
    ships: "THE PUPPETEER. A siren ship conducts the enemy crew like a choir. Favored fittings: the Siren's Crown (charm a sailor each battle), Tidal Heart, a Binding Shrine kept humming. Familiars take the gentle roles - menders and guards - while the song does the cruelty. Stun, lure, board, mend; the hull is rarely touched.",
    weapons: "Songs pass where matter can't. The Wail Horn stuns through the hull, the Slumber Veil hums a room to sleep, the Siren Lure calls sailors from their posts by name. The Dirge Beam is a funeral sung in a straight line - crew only. And the Mending Tide is cast at YOUR OWN decks, washing the crew whole again.",
    crew: "Her song weakens foes in her room and mends allies beside her. One siren turns a boarding brawl; two turn a battle. They ask little - only that you never, ever sing along.",
  },
};

const LoreScreen = {
  enter() { this.page = 0; this.tab = null; },
  update() {},
  flip(dir) {
    this.page = U.clamp(this.page + dir, 0, LORE_PAGES.length - 1);
    this.tab = null;
    AUDIO.sfx('click');
  },
  click(x, y) {
    if (x >= 28 && x < 118 && y >= 262 && y < 280) { this.flip(-1); return; }
    if (x >= 394 && x < 484 && y >= 262 && y < 280) { this.flip(1); return; }
    if (x >= 212 && x < 300 && y >= 262 && y < 280) { Game.setScreen('title'); AUDIO.sfx('back'); return; }
    // race pages: SHIPS / WEAPONS / CREW encyclopedia tabs
    const P = LORE_PAGES[this.page];
    if (P.race && y >= 224 && y < 238) {
      const tabs = ['ships', 'weapons', 'crew'];
      for (let i = 0; i < 3; i++) {
        const tx = 283 + i * 55;
        if (x >= tx && x < tx + 51) {
          this.tab = this.tab === tabs[i] ? null : tabs[i]; // click again for the tale
          AUDIO.sfx('click');
          return;
        }
      }
    }
    // click halves to flip
    if (y < 220) { this.flip(x < 256 ? -1 : 1); }
  },
  key(k) {
    if (k === 'ArrowLeft') this.flip(-1);
    if (k === 'ArrowRight' || k === ' ') this.flip(1);
    if (k === 'Escape') Game.setScreen('title');
  },
  // where an image will actually land when contain-fit + centered in box (bx,by,bw,bh).
  // mirrors drawImageFit's three cases so the matte can hug the drawn pixels exactly.
  imageFitRect(name, bx, by, bw, bh) {
    const e = SPR.artEntry(name);
    if (e) {
      const iw = e.img.naturalWidth / 2, ih = e.img.naturalHeight / 2;
      const s = Math.min(bw / iw, bh / ih), w = iw * s, h = ih * s;
      return { x: bx + (bw - w) / 2, y: by + (bh - h) / 2, w, h };
    }
    if (SPR.hasFrame(name)) {
      const fs = SPR.frameSize(name);
      const s = Math.min(bw / fs.w, bh / fs.h, 2), w = fs.w * s, h = fs.h * s;
      return { x: bx + (bw - w) / 2, y: by + (bh - h) / 2, w, h };
    }
    if (name && name.startsWith('vig_')) {
      return { x: bx + (bw - 96) / 2, y: by + (bh - 54) / 2, w: 96, h: 54 };
    }
    return null;
  },
  drawImageFit(ctx, name, bx, by, bw, bh) {
    // try AI art (any kind), then atlas frame, then baked vignette canvas
    const r = this.imageFitRect(name, bx, by, bw, bh);
    if (!r) return false;
    const e = SPR.artEntry(name);
    if (e) { ctx.drawImage(e.img, r.x, r.y, r.w, r.h); return true; }
    if (SPR.hasFrame(name)) {
      return SPR.drawFrame(ctx, name, r.x, r.y, false, r.w / SPR.frameSize(name).w);
    }
    const cv = SPR.vignette(name.slice(4));
    ctx.drawImage(cv, r.x, r.y);
    return true;
  },
  // ---- page content, drawn FLAT in absolute logical coords directly onto the painted pages.
  // (A perspective-warp pass was tried and removed: the painted pages are also gently curved, so a
  // planar warp couldn't match both the tilt AND the curl and read worse than flat — Greg, 2026-06-18.)
  // The LEFT column is nudged toward the spine (ix / lcx) per Greg's request. ----
  _drawLeft(ctx, P) {
    const lcx = 158; // left-page content centre (nudged toward the spine)
    const ix = 78;   // illustration plate x (shifted right with the column)
    // illustration plate (parchment matte + gold border HUG the fitted image)
    const fr = this.imageFitRect(P.img, ix, 46, 158, 148) || { x: ix, y: 46, w: 158, h: 148 };
    const mx = Math.round(fr.x - 4), my = Math.round(fr.y - 4),
          mw = Math.round(fr.w + 8), mh = Math.round(fr.h + 8);
    ctx.fillStyle = COL.parchdk; // recessed parchment matte (a pasted-in plate)
    ctx.fillRect(mx, my, mw, mh);
    this.drawImageFit(ctx, P.img, ix, 46, 158, 148);
    ctx.strokeStyle = COL.golddk; ctx.strokeRect(mx + 0.5, my + 0.5, mw - 1, mh - 1);
    ctx.strokeStyle = COL.gold; ctx.strokeRect(mx - 0.5, my - 0.5, mw + 1, mh + 1);
    TYPE.label(ctx, P.cap, lcx, 205, 168, 12, '#6a5436', { display: true });
    ctx.fillStyle = COL.parchln; ctx.fillRect(lcx - 50, 218, 100, 1);
    TYPE.drawCentered(ctx, 'Page ' + (this.page + 1) + ' of ' + LORE_PAGES.length, lcx, 235, 11, '#5a432a', { italic: true, baseline: 'middle' });
  },
  _drawRight(ctx, P) {
    const rcx = 364; // right-page content centre (nudged rightward)
    const tabTitles = { ships: 'SHIPS & FITTINGS', weapons: 'THE ARSENAL', crew: 'THE CREW' };
    TYPE.label(ctx, this.tab && P.race ? tabTitles[this.tab] : P.title, rcx, 38, 164, 15, '#3a2912', { display: true });
    ctx.fillStyle = COL.parchln; ctx.fillRect(280, 51, 164, 1);
    const bodyText = (this.tab && P.race && LORE_BUILDS[P.race]) ? LORE_BUILDS[P.race][this.tab] : P.text;
    // clip to the text well so an over-long passage can never paint over the tabs / page edge.
    // body is size 10 / 164px-wide / 3px gap so the longest passage (13 lines) fits the page.
    ctx.save();
    ctx.beginPath(); ctx.rect(278, 53, 168, (P.race ? 220 : 250) - 53); ctx.clip();
    TYPE.drawWrapped(ctx, bodyText, 280, 56, 164, 10, '#3a2912', {}, 3);
    ctx.restore();
    // race pages: encyclopedia tabs - how this people sails, shoots, and hires
    if (P.race) {
      const tabs = [['ships', 'SHIPS'], ['weapons', 'WEAPONS'], ['crew', 'CREW']];
      tabs.forEach(([key, label], i) => {
        const tx = 283 + i * 55;
        const on = this.tab === key;
        ctx.fillStyle = on ? COL.parchdk : 'rgba(120,92,46,0.12)';
        ctx.fillRect(tx, 224, 51, 14);
        ctx.strokeStyle = COL.inkfade;
        ctx.strokeRect(tx + 0.5, 224.5, 50, 13);
        TYPE.label(ctx, label, tx + 25, 231, 47, 11, on ? COL.inkdk : COL.inkmd, { display: true });
      });
    }
  },
  render(ctx) {
    const P = LORE_PAGES[this.page];
    // the open book is a single PAINTED plate (walnut desk, candle, vellum pages, brass corners).
    if (!SPR.drawArt(ctx, 'lore_book', 0, 0, 512, 288)) {
      ctx.fillStyle = COL.cabinlo; ctx.fillRect(0, 0, 512, 288);
      if (!UI.tileFill(ctx, 'ui_parchment', 36, 28, 200, 216, 'rgba(236,220,182,0.16)')) { ctx.fillStyle = COL.paper; ctx.fillRect(36, 28, 200, 216); }
      if (!UI.tileFill(ctx, 'ui_parchment', 276, 28, 200, 216, 'rgba(236,220,182,0.16)')) { ctx.fillStyle = COL.paper; ctx.fillRect(276, 28, 200, 216); }
    }
    // page content, drawn flat directly onto the painted pages
    this._drawLeft(ctx, P);
    this._drawRight(ctx, P);
    // nav (flat, on the desk below the book)
    UI.drawBtn(ctx, 28, 262, 90, 18, '< PREVIOUS', { disabled: this.page === 0 });
    UI.drawBtn(ctx, 212, 262, 88, 18, 'CLOSE');
    UI.drawBtn(ctx, 394, 262, 90, 18, 'NEXT >', { disabled: this.page === LORE_PAGES.length - 1 });
  },
};
