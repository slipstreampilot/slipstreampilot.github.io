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

// ============ DIALOG SCREENS (HD, Stage 2c 2026-10-08) ============
// EventScreen / LootScreen / WeaponChoiceScreen / AugChoiceScreen, authored on the 1920x1080 design
// grid with the shared KIT, in the ShipMenu idiom: parchment page -> wood panel with a carved title
// band -> parchment cards -> recessed/parchment buttons, the shared top-right instrument strip, and a
// footer row on the page (hint left, action buttons right). Every control is a KIT registration, so
// the drawn rect IS the click rect. Stable ids: event.choice.N / event.continue / loot.continue /
// wchoice.replace.N / wchoice.decline / achoice.replace.N / achoice.decline.
const DLG = {
  W: 1920, H: 1080,
  HEAD_R: { x: 32, y: 16, w: 840, h: 72 },
  TOP_R: { x: 904, y: 16, w: 984, h: 72 },     // == ShipMenu.TOP_R (same strip, same place)
  BODY: { x: 32, y: 104, w: 1856, h: 856 },     // == ShipMenu body
  FOOT_Y: 984, FOOT_H: 64,
  GAIN: '#1f5a4a', LOSS: '#8f2316',

  // page + "Captain's Log · Day N · <sub>" heading top-left + the instrument strip top-right
  chrome(ctx, sub) {
    KIT.page(ctx, this.W, this.H);
    const r = this.HEAD_R, run = Game.run;
    KIT.text(ctx, "Captain's Log", { x: r.x + 4, y: r.y + 4, w: r.w, h: 28 }, { size: 17, display: true, color: COL.inkmd });
    KIT.text(ctx, 'Day ' + ((run && run.day) || 1) + (sub ? ' · ' + sub : ''), { x: r.x + 4, y: r.y + 32, w: r.w - 8, h: 36 }, { size: 26, italic: true, color: COL.inkdk, fit: 'ellipsis' });
    // the very same strip ShipMenu draws (hull · shards · runeshot · candles · region), re-seated
    if (run && Game.ship) ShipMenu.renderTop.call(Object.assign(Object.create(ShipMenu), { TOP_R: this.TOP_R }), ctx);
  },
  finish(ctx) { KIT.flushFrames(ctx); KIT.flushTip(ctx, this.W, this.H); },
  footHint(ctx, text, w) {
    KIT.text(ctx, text, { x: 32, y: this.FOOT_Y, w: w || 1200, h: this.FOOT_H }, { size: 20, italic: true, color: COL.inkfade, fit: 'ellipsis' });
  },

  // ---- text casing: the run's log/notes are authored in CAPS; HD dialogs read in sentence case ----
  _small: new Set(['of', 'the', 'a', 'an', 'in', 'on', 'to', 'and', 'at', 'for', 'by']),
  titleCase(s) {
    s = String(s || '').replace(/\s+-\s+/g, ' — ');
    if (/[a-z]/.test(s)) return s;
    return s.toLowerCase().split(' ').map((w, i) => (i > 0 && this._small.has(w)) ? w : w.replace(/^(\W*)(\w)/, (m, p, c) => p + c.toUpperCase())).join(' ');
  },
  _names() {
    const n = ['Armada', 'Warden', 'Mythril', 'Dawnchaser', 'Veil', 'Mana Hearthstone', 'New World'];
    for (const k in DATA.RACES) n.push(DATA.RACES[k].name);
    for (const r of DATA.REGIONS) n.push(r.name.replace(/^The /, ''));
    for (const k in DATA.WEAPONS) n.push(DATA.WEAPONS[k].name);
    for (const k in DATA.AUGS) n.push(DATA.AUGS[k].name);
    for (const k in DATA.SYSTEMS) n.push(DATA.SYSTEMS[k].name);
    if (Game.ship) for (const c of Game.ship.crew) if (c.name) n.push(c.name);
    return n.sort((a, b) => b.length - a.length);
  },
  prose(s) {
    s = String(s || '').replace(/\s+-\s+/g, ' — ');
    if (/[a-z]/.test(s) || !/[A-Z]/.test(s)) return s; // already mixed case (authored prose): leave it
    let t = s.toLowerCase().replace(/(^|[.!?]\s+)([a-z])/g, (m, p, c) => p + c.toUpperCase());
    for (const nm of this._names()) {
      const esc = nm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      t = t.replace(new RegExp('\\b' + esc + '\\b', 'gi'), nm);
    }
    return t.replace(/\bi\b/g, 'I');
  },

  // ---- framed painting, cover-cropped into a FIXED box ----
  vignette(ctx, name, r) {
    ctx.fillStyle = '#2a1d10'; ctx.fillRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12);
    const e = SPR.artEntry(name) || SPR.artEntry('vig_calm');
    if (e) {
      const iw = e.img.naturalWidth || e.img.width, ih = e.img.naturalHeight || e.img.height;
      const s = Math.max(r.w / iw, r.h / ih), sw = r.w / s, sh = r.h / s;
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(e.img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, r.x, r.y, r.w, r.h);
      ctx.restore();
    } else KIT.parchFill(ctx, r.x, r.y, r.w, r.h);
    // soft inner vignette so the frame sits on shadow, then a thin brass keyline
    const g = ctx.createRadialGradient(r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) * 0.45, r.x + r.w / 2, r.y + r.h / 2, Math.max(r.w, r.h) * 0.72);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(16,9,3,0.38)');
    ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = COL.brassdk; ctx.lineWidth = 2; ctx.strokeRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2); ctx.lineWidth = 1;
    KIT.frame({ x: r.x - 6, y: r.y - 6, w: r.w + 12, h: r.h + 12 });
  },

  // ---- reward / loss chips ----
  // chip = { icon(ctx,R), title, sub, tone: 'gain'|'loss'|'info'|'danger' }
  chipH: 72,
  drawChip(ctx, r, ch) {
    const bad = ch.tone === 'loss' || ch.tone === 'danger';
    KIT.card(ctx, r, { studs: false, tint: ch.tone === 'danger' ? 'rgba(143,35,22,0.10)' : ch.tone === 'gain' ? 'rgba(47,138,114,0.07)' : null, edge: ch.tone === 'danger' ? 'rgba(143,35,22,0.85)' : null });
    const ic = { x: r.x + 12, y: r.y + 12, w: r.h - 24, h: r.h - 24 };
    KIT.iconCell(ctx, ic, R => { if (ch.icon) ch.icon(ctx, R); });
    const tx = ic.x + ic.w + 14, tw = r.x + r.w - 14 - tx;
    const col = ch.tone === 'gain' ? this.GAIN : bad ? this.LOSS : COL.inkdk;
    if (ch.sub) {
      KIT.text(ctx, ch.title, { x: tx, y: r.y + 10, w: tw, h: 30 }, { size: 21, display: true, color: col, fit: 'shrink', minSize: 14 });
      KIT.text(ctx, ch.sub, { x: tx, y: r.y + 40, w: tw, h: 24 }, { size: 16, italic: true, color: COL.inkmd, fit: 'ellipsis' });
    } else KIT.text(ctx, ch.title, { x: tx, y: r.y, w: tw, h: r.h }, { size: 21, display: true, color: col, fit: 'shrink', minSize: 14 });
    if (ch.tip && KIT.hovered('dlg.chip', r)) KIT.tip(ch.tip, Game.mouse.x, Game.mouse.y);
  },
  // lay chips out in `cols` columns from (x,y) across width w; returns the bottom y
  // (a short last row is centred so an odd count never leaves a lopsided hole)
  drawChips(ctx, chips, x, y, w, cols, gap, center) {
    gap = gap == null ? 12 : gap;
    const cw = (w - gap * (cols - 1)) / cols;
    chips.forEach((ch, i) => {
      const row = Math.floor(i / cols), inRow = Math.min(cols, chips.length - row * cols);
      const x0 = center ? x + (w - (inRow * cw + (inRow - 1) * gap)) / 2 : x;
      this.drawChip(ctx, { x: x0 + (i % cols) * (cw + gap), y: y + row * (this.chipH + gap), w: cw, h: this.chipH }, ch);
    });
    return y + Math.ceil(chips.length / cols) * (this.chipH + gap) - (chips.length ? gap : 0);
  },
  // icon painters (each fits the given cell)
  icRes(kind) { return (ctx, R) => UI.drawRes(ctx, kind, R.x + 5, R.y + 5, R.w - 10); },
  icSys(key, col) { return (ctx, R) => drawSysSym(ctx, key, R.x + 6, R.y + 6, R.w - 12, col || COL.inkdk); },
  icWeapon(key) { return (ctx, R) => ShipMenu.drawWeaponArt(ctx, key, { x: R.x - 6, y: R.y, w: R.w + 12, h: R.h }); },
  icAug(key) { return (ctx, R) => UI.drawAugIcon(ctx, key, R.x + 5, R.y + 5, R.w - 10); },
  icCrew(race) {
    return (ctx, R) => {
      const pk = race === 'armada' ? 'admiral' : race === 'ghost' ? 'siren' : race;
      if (!SPR.drawArt(ctx, 'portrait_' + pk, R.x, R.y, R.w, R.h)) SPR.drawCrewIcon(ctx, race, R.x + 8, R.y + 6, R.w - 16);
    };
  },
  icIcon(name) { return (ctx, R) => { const ic = SPR.icon(name); if (ic) { ctx.save(); ctx.imageSmoothingEnabled = false; const s = Math.floor((R.w - 8) / ic.width) || 1; ctx.drawImage(ic, Math.round(R.x + (R.w - ic.width * s) / 2), Math.round(R.y + (R.h - ic.height * s) / 2), ic.width * s, ic.height * s); ctx.restore(); } }; },
  resChip(kind, d) {
    const nm = { shard: 'Mana Shards', runeshot: 'Runeshot', candle: 'Seance Candles' }[kind];
    return { icon: this.icRes(kind), title: (d > 0 ? '+' : '−') + Math.abs(d) + ' ' + nm, sub: d > 0 ? 'Taken aboard' : 'Spent', tone: d > 0 ? 'gain' : 'loss' };
  },
  hullChip(d) { return { icon: this.icSys('hull'), title: (d > 0 ? '+' : '−') + Math.abs(d) + ' Hull', sub: d > 0 ? 'Timbers patched' : 'The hull takes damage', tone: d > 0 ? 'gain' : 'loss' }; },
  weaponChip(key, where) {
    const wd = DATA.WEAPONS[key];
    return { icon: this.icWeapon(key), title: wd.name, sub: where, tone: 'gain', tip: ShipMenu.weaponTip(key) };
  },
  augChip(key, sub) { const a = DATA.AUGS[key]; return { icon: this.icAug(key), title: a.name, sub: sub || 'Augment installed', tone: 'gain', tip: [{ t: a.name, c: TIP.ink }, { t: a.desc, c: TIP.body }] }; },
  crewChip(c, joined) {
    const rn = (DATA.RACES[c.race] || { name: c.race }).name;
    return joined ? { icon: this.icCrew(c.race), title: c.name + ' joins', sub: rn + ' sailor · a new hand aboard', tone: 'gain' }
      : { icon: this.icCrew(c.race), title: c.name + ' is lost', sub: rn + ' sailor', tone: 'loss' };
  },

  // ---- before/after snapshot -> chips (events) ----
  snapshot() {
    const run = Game.run, ship = Game.ship;
    return {
      shards: run.shards, runeshot: run.runeshot, candles: run.candles || 0, hull: ship.hull, manaMax: ship.manaMax, front: run.front,
      alive: ship.aliveCrew().slice(), hp: ship.aliveCrew().reduce((a, c) => a + c.hp, 0),
      guns: ship.weapons.map(w => w.key).concat(run.cargo), augs: run.augs.slice(), sysLv: Object.assign({}, ship.sysLv),
      pw: run.pendingWeapon, pa: run.pendingAug,
    };
  },
  diffChips(b) {
    const run = Game.run, ship = Game.ship, out = [];
    const dS = run.shards - b.shards, dR = run.runeshot - b.runeshot, dC = (run.candles || 0) - b.candles, dH = ship.hull - b.hull;
    if (dS) out.push(this.resChip('shard', dS));
    if (dR) out.push(this.resChip('runeshot', dR));
    if (dC) out.push(this.resChip('candle', dC));
    if (dH) out.push(this.hullChip(dH));
    if (ship.manaMax > b.manaMax) out.push({ icon: this.icSys('core'), title: '+' + (ship.manaMax - b.manaMax) + ' Max mana', sub: 'The Hearthstone burns brighter', tone: 'gain' });
    for (const k in ship.sysLv) if ((ship.sysLv[k] || 0) > (b.sysLv[k] || 0) && DATA.SYSTEMS[k]) out.push({ icon: this.icSys(k), title: DATA.SYSTEMS[k].name + ' upgraded', sub: 'Level ' + ship.sysLv[k] + ', free of charge', tone: 'gain' });
    const alive = ship.aliveCrew();
    for (const c of alive) if (!b.alive.includes(c)) out.push(this.crewChip(c, true));
    for (const c of b.alive) if (!alive.includes(c)) out.push(this.crewChip(c, false));
    const hp = alive.filter(c => b.alive.includes(c)).reduce((a, c) => a + c.hp, 0), hp0 = b.alive.filter(c => alive.includes(c)).reduce((a, c) => a + c.hp, 0);
    if (hp > hp0) out.push({ icon: this.icSys('infirmary'), title: 'Crew healed', sub: 'Wounds dressed, spirits lifted', tone: 'gain' });
    const guns = ship.weapons.map(w => w.key).concat(run.cargo), left = b.guns.slice();
    guns.forEach((k, i) => { const j = left.indexOf(k); if (j >= 0) left.splice(j, 1); else out.push(this.weaponChip(k, i < ship.weapons.length ? 'Mounted and ready to fire' : 'Stowed in the hold')); });
    for (const a of run.augs) if (!b.augs.includes(a)) out.push(this.augChip(a));
    if (run.pendingWeapon && run.pendingWeapon !== b.pw && DATA.WEAPONS[run.pendingWeapon]) out.push(Object.assign(this.weaponChip(run.pendingWeapon, 'No room aboard — you choose what to keep next'), { tone: 'info' }));
    if (run.pendingAug && run.pendingAug !== b.pa && DATA.AUGS[run.pendingAug]) out.push(Object.assign(this.augChip(run.pendingAug, 'Slots full — you choose what to keep next'), { tone: 'info' }));
    if (run.front > b.front) out.push({ icon: this.icIcon('skull'), title: 'The Armada gains', sub: 'Their fleet closes on your wake', tone: 'danger' });
    return out;
  },
  // notes already said by a chip are dropped; the rest (explanations, refusals) read as prose
  COVERED: [/^[+-]?\d+ (SHARDS|RUNESHOT|HULL)$/, /MAX MANA$/, /^CREW HEALED$/, /^WEAPON GAINED:/, /STOWED IN CARGO$/, /^AUGMENT: /, /JOINS YOU!$/, /IS GONE\.$/, /UPGRADED FREE$/, /^THE ARMADA GAINS ON YOU!$/, /^THE DOCK REPAIRS/, /^NO ROOM FOR THE .* YOU WILL CHOOSE/, /^NO AUGMENT SLOT FREE/],
  uncovered(notes) { return (notes || []).filter(n => !this.COVERED.some(re => re.test(n))).map(n => this.prose(n)); },
};

// ============ WEAPON CHOICE (new gun, no room - FTL-style compare & dump) ============
const WeaponChoiceScreen = {
  designW: 1920, designH: 1080,
  enter() {
    this.key = Game.run.pendingWeapon;
    if (!DATA.WEAPONS[this.key]) this.bail(); // R26: a bad key bails out HERE (never from render) and still chains afterNode
  },
  bail() { Game.run.pendingWeapon = null; Game.afterNode(); },
  update() { if (Game.screen === this && !DATA.WEAPONS[this.key]) this.bail(); },
  key(k) { if (k === 'Escape') AUDIO.sfx('deny'); }, // a choice is required: keep, replace, or decline
  statLine(wd) { return UI.weaponStat(wd); },
  declineValue() { return Math.floor(DATA.WEAPONS[this.key].cost / 2); },
  decline() {
    Game.run.shards += this.declineValue();
    Game.run.pendingWeapon = null;
    AUDIO.sfx('coin'); Game.save(); Game.afterNode();
  },
  // dump one of yours (half value), take the new gun
  replace(from, idx) {
    UI.sellWeapon(from, idx);
    Game.run.pendingWeapon = null;
    UI.gainWeapon(this.key);
    AUDIO.sfx('coin'); Game.save(); Game.afterNode();
  },
  slots() {
    const s = Game.ship.weapons.map((w, i) => ({ from: 'mount', idx: i, key: w.key }));
    Game.run.cargo.forEach((k, i) => s.push({ from: 'cargo', idx: i, key: k }));
    return s;
  },
  // the big newcomer card: art, name, the four FTL stats as labelled cells, specials + flavour
  newCard(ctx, r) {
    const wd = DATA.WEAPONS[this.key];
    KIT.card(ctx, r, { tint: 'rgba(212,160,48,0.10)', edge: COL.golddk });
    const ic = { x: r.x + 20, y: r.y + 20, w: 240, h: r.h - 40 };
    KIT.iconCell(ctx, ic, R => ShipMenu.drawWeaponArt(ctx, this.key, R));
    const tx = ic.x + ic.w + 24, tw = r.x + r.w - 24 - tx;
    KIT.text(ctx, 'New gun', { x: tx, y: r.y + 16, w: 300, h: 22 }, { size: 15, display: true, color: ShipMenu.QINK });
    KIT.text(ctx, wd.name, { x: tx, y: r.y + 38, w: 560, h: 38 }, { size: 30, display: true, fit: 'shrink' });
    const fam = (wd.family || 'weapon'), dmg = (wd.dmg || 0) + (wd.shots > 1 ? ' × ' + wd.shots : '') + (wd.type === 'beam' ? ' / room' : '');
    const stats = [['Type', fam.charAt(0).toUpperCase() + fam.slice(1) + (wd.type === 'beam' ? ' beam' : '')], ['Charge', wd.charge + 's'], ['Damage', dmg], ['Mana', '' + (wd.power || 0)]];
    const sw = 150, sg = 10, sx0 = r.x + r.w - 24 - (sw * 4 + sg * 3);
    stats.forEach((st, i) => {
      const R = { x: sx0 + i * (sw + sg), y: r.y + 20, w: sw, h: 64 };
      ctx.fillStyle = 'rgba(70,46,18,0.10)'; ctx.fillRect(R.x, R.y, R.w, R.h);
      ctx.strokeStyle = 'rgba(74,51,24,0.55)'; ctx.strokeRect(R.x + 0.5, R.y + 0.5, R.w - 1, R.h - 1);
      KIT.text(ctx, st[0], { x: R.x, y: R.y + 6, w: R.w, h: 20 }, { size: 14, display: true, color: COL.inkmd, align: 'center' });
      KIT.text(ctx, st[1], { x: R.x, y: R.y + 28, w: R.w, h: 30 }, { size: 22, align: 'center', padX: 6 });
    });
    const sp = UI.weaponSpecials(wd), ty = r.y + 96, avail = r.y + r.h - 18 - ty;
    let y = ty;
    if (sp) { const t = KIT.text(ctx, sp.charAt(0).toUpperCase() + sp.slice(1) + '.', { x: tx, y, w: tw, h: 26 }, { size: 19, color: TIP.special, fit: 'wrap', maxLines: 1, valign: 'top' }); y = t.bottom + 10; }
    if (wd.desc) KIT.text(ctx, wd.desc, { x: tx, y, w: tw, h: Math.max(24, ty + avail - y) }, { size: 18, italic: true, color: COL.inkmd, fit: 'wrap', valign: 'top', lineGap: 5 });
  },
  oldCard(ctx, s, i, r) {
    const wd = DATA.WEAPONS[s.key];
    KIT.card(ctx, r);
    const ic = { x: r.x + 16, y: r.y + 16, w: 168, h: r.h - 32 - 28 };
    KIT.iconCell(ctx, ic, R => ShipMenu.drawWeaponArt(ctx, s.key, R));
    KIT.text(ctx, (s.from === 'mount' ? 'Mount ' : 'Hold ') + (s.idx + 1), { x: ic.x, y: ic.y + ic.h + 4, w: ic.w, h: 24 }, { size: 16, italic: true, color: COL.inklt, align: 'center' });
    const tx = ic.x + ic.w + 20, tw = r.x + r.w - 16 - tx;
    KIT.text(ctx, wd.name, { x: tx, y: r.y + 14, w: tw, h: 32 }, { size: 22, display: true, fit: 'shrink' });
    KIT.text(ctx, ShipMenu.weaponLine(wd), { x: tx, y: r.y + 48, w: tw, h: 26 }, { size: 17, color: COL.inkmd, fit: 'ellipsis' });
    const sp = UI.weaponSpecials(wd), bH = 40, textH = r.h - 80 - bH - 20;
    if (textH >= 20) KIT.text(ctx, sp ? sp.charAt(0).toUpperCase() + sp.slice(1) + '.' : (wd.desc || ''), { x: tx, y: r.y + 78, w: tw, h: textH }, { size: 15, italic: true, color: sp ? TIP.special : COL.inkmd, fit: 'wrap', maxLines: 2, lineGap: 4, valign: 'top' });
    const val = UI.sellWeaponValue(s.key), bR = { x: r.x + r.w - 16 - 210, y: r.y + r.h - 16 - bH, w: 210, h: bH };
    const nw = DATA.WEAPONS[this.key].name;
    KIT.button(ctx, 'wchoice.replace.' + i, bR, 'Replace · +' + val, {
      variant: 'recess', size: 18, sound: false, onClick: () => this.replace(s.from, s.idx),
      icon: (cx, x, cy, sz) => UI.drawRes(cx, 'shard', x - sz / 2, cy - sz / 2, sz),
      tip: [{ t: 'Replace ' + wd.name + ' with ' + nw, c: TIP.ink }, { t: wd.name + ' is sold for half its price (+' + val + ' shards); the ' + nw + ' takes its place.', c: TIP.body }],
    });
    if (KIT.hovered('wchoice.card.' + i, r) && !KIT.inR(Game.mouse.x, Game.mouse.y, bR)) KIT.tip(ShipMenu.weaponTip(s.key), Game.mouse.x, Game.mouse.y);
  },
  render(ctx) {
    DLG.chrome(ctx, 'No room aboard');
    const wd = DATA.WEAPONS[this.key];
    if (!wd) { DLG.finish(ctx); return; } // update() bails out; render never mutates state
    const P = DLG.BODY, c = KIT.panel(ctx, P, { wood: true, title: 'A New Gun — But No Room', titleRightW: 560 });
    ShipMenu.bandNote(ctx, P, 'Every mount and hold slot is full', 540);
    const NH = 196;
    this.newCard(ctx, { x: c.x, y: c.y, w: c.w, h: NH });
    let y = c.y + NH + 18;
    ShipMenu.woodLabel(ctx, { x: c.x, y, w: c.w, h: 28 }, 'Replace One of Yours', 'it is sold for half its price; the new gun takes its slot');
    y += 40;
    const slots = this.slots(), cols = 2, gap = 16, rows = Math.ceil(slots.length / cols);
    const cw = (c.w - gap) / cols, ch = Math.min(176, Math.floor((c.y + c.h - y - (rows - 1) * gap) / rows));
    slots.forEach((s, i) => this.oldCard(ctx, s, i, { x: c.x + (i % cols) * (cw + gap), y: y + Math.floor(i / cols) * (ch + gap), w: cw, h: ch }));
    // footer: what declining means, and the decline button with its value
    const dv = this.declineValue();
    DLG.footHint(ctx, 'Keep your guns and sell the ' + wd.name + ' instead — or replace one of yours above.', 1300);
    KIT.button(ctx, 'wchoice.decline', { x: 1888 - 340, y: DLG.FOOT_Y, w: 340, h: DLG.FOOT_H }, 'Decline · +' + dv, {
      onClick: () => this.decline(), sound: false,
      icon: (cx, x, cy, sz) => UI.drawRes(cx, 'shard', x - sz / 2, cy - sz / 2, sz),
      tip: [{ t: 'Leave the ' + wd.name + ' behind', c: TIP.ink }, { t: 'It is sold for half its price: +' + dv + ' shards. Your guns stay as they are.', c: TIP.body }],
    });
    DLG.finish(ctx);
  },
};

// ============ AUGMENT CHOICE (new aug, slots full - sell one or decline) ============
const AugChoiceScreen = {
  designW: 1920, designH: 1080,
  enter() {
    this.key = Game.run.pendingAug;
    if (!DATA.AUGS[this.key]) this.bail();
  },
  bail() { Game.run.pendingAug = null; Game.afterNode(); },
  update() { if (Game.screen === this && !DATA.AUGS[this.key]) this.bail(); },
  key(k) { if (k === 'Escape') AUDIO.sfx('deny'); },
  declineValue() { return Math.floor(DATA.AUGS[this.key].cost / 2); },
  decline() {
    Game.run.shards += this.declineValue();
    Game.run.pendingAug = null;
    AUDIO.sfx('coin'); Game.save(); Game.afterNode();
  },
  // sell the chosen augment (half value, mythril gives its hull back), install the new one
  replace(idx) {
    UI.sellAug(idx);
    Game.run.pendingAug = null;
    UI.installAug(this.key);
    AUDIO.sfx('coin'); Game.save(); Game.afterNode();
  },
  desc(a) { let d = a.desc.replace(/^LEGENDARY:\s*/, ''); return d.charAt(0).toUpperCase() + d.slice(1); },
  render(ctx) {
    DLG.chrome(ctx, 'No room aboard');
    const ad = DATA.AUGS[this.key];
    if (!ad) { DLG.finish(ctx); return; }
    // a centred dialog sized to its content (3 rows at most): the newcomer, then your three to choose from
    const W = 1376, augs = Game.run.augs, n = Math.max(1, augs.length), inner = W - 32;
    const NH = 176, RH = 132, gap = 14;
    const H = 52 + NH + 18 + 40 + n * RH + (n - 1) * gap + 16;
    const P = { x: (1920 - W) / 2, y: DLG.BODY.y + Math.max(0, Math.floor((DLG.BODY.h - H) / 2)), w: W, h: H };
    const c = KIT.panel(ctx, P, { wood: true, title: 'A New Augment — But No Free Slot', titleRightW: 420 });
    ShipMenu.bandNote(ctx, P, 'All 3 augment slots are taken', 400);
    const nr = { x: c.x, y: c.y, w: inner, h: NH };
    KIT.card(ctx, nr, { tint: 'rgba(212,160,48,0.10)', edge: COL.golddk });
    const ic = { x: nr.x + 20, y: nr.y + 20, w: NH - 40, h: NH - 40 };
    KIT.iconCell(ctx, ic, R => UI.drawAugIcon(ctx, this.key, R.x + 10, R.y + 10, R.w - 20));
    const tx = ic.x + ic.w + 28, tw = nr.x + nr.w - 28 - tx;
    const ndl = Math.min(2, TYPE.wrap(ctx, this.desc(ad), tw, 22, { italic: true }).length), nb = 22 + 6 + 38 + 12 + ndl * 30 - 8, ny = nr.y + (NH - nb) / 2;
    KIT.text(ctx, ad.legendary ? 'New legendary augment' : 'New augment', { x: tx, y: ny, w: tw, h: 22 }, { size: 15, display: true, color: ad.legendary ? TIP.special : ShipMenu.QINK });
    KIT.text(ctx, ad.name, { x: tx, y: ny + 28, w: tw, h: 38 }, { size: 30, display: true, fit: 'shrink' });
    KIT.text(ctx, this.desc(ad), { x: tx, y: ny + 78, w: tw, h: ndl * 30 - 8 }, { size: 22, italic: true, color: COL.inkmd, fit: 'wrap', maxLines: 2, lineGap: 8 });
    let y = c.y + NH + 18;
    ShipMenu.woodLabel(ctx, { x: c.x, y, w: inner, h: 28 }, 'Replace One of Yours', 'it is sold for half its price; the new augment takes its slot');
    y += 40;
    augs.forEach((key, i) => {
      const a = DATA.AUGS[key], r = { x: c.x, y: y + i * (RH + gap), w: inner, h: RH };
      KIT.card(ctx, r);
      const ic2 = { x: r.x + 16, y: r.y + 16, w: RH - 32, h: RH - 32 };
      KIT.iconCell(ctx, ic2, R => UI.drawAugIcon(ctx, key, R.x + 8, R.y + 8, R.w - 16));
      const bW = 230, bR = { x: r.x + r.w - 20 - bW, y: r.y + (RH - 48) / 2, w: bW, h: 48 };
      const x2 = ic2.x + ic2.w + 24, w2 = bR.x - 32 - x2;
      const dl = Math.min(2, TYPE.wrap(ctx, this.desc(a), w2, 19, { italic: true }).length);
      const blockH = 32 + (a.legendary ? 24 : 0) + 8 + dl * 26 - 6, by = r.y + (RH - blockH) / 2;
      KIT.text(ctx, a.name, { x: x2, y: by, w: w2, h: 32 }, { size: 23, display: true, fit: 'shrink' });
      if (a.legendary) KIT.text(ctx, 'Legendary', { x: x2, y: by + 32, w: w2, h: 24 }, { size: 15, display: true, color: TIP.special });
      KIT.text(ctx, this.desc(a), { x: x2, y: by + 40 + (a.legendary ? 24 : 0), w: w2, h: dl * 26 - 6 }, { size: 19, italic: true, color: COL.inkmd, fit: 'wrap', maxLines: 2, lineGap: 7 });
      const val = Math.floor(a.cost / 2);
      KIT.button(ctx, 'achoice.replace.' + i, bR, 'Replace · +' + val, {
        variant: 'recess', size: 19, sound: false, onClick: () => this.replace(i),
        icon: (cx, x, cy, sz) => UI.drawRes(cx, 'shard', x - sz / 2, cy - sz / 2, sz),
        tip: [{ t: 'Replace ' + a.name + ' with ' + ad.name, c: TIP.ink }, { t: a.name + ' is sold for half its price (+' + val + ' shards) and its effect ends; ' + ad.name + ' is installed.', c: TIP.body }],
      });
    });
    const dv = this.declineValue();
    DLG.footHint(ctx, 'Keep your augments and sell the ' + ad.name + ' instead — or replace one above.', 1300);
    KIT.button(ctx, 'achoice.decline', { x: 1888 - 340, y: DLG.FOOT_Y, w: 340, h: DLG.FOOT_H }, 'Decline · +' + dv, {
      onClick: () => this.decline(), sound: false,
      icon: (cx, x, cy, sz) => UI.drawRes(cx, 'shard', x - sz / 2, cy - sz / 2, sz),
      tip: [{ t: 'Leave the ' + ad.name + ' behind', c: TIP.ink }, { t: 'It is sold for half its price: +' + dv + ' shards. Your augments stay as they are.', c: TIP.body }],
    });
    DLG.finish(ctx);
  },
};

// ============ EVENT SCREEN ============
const EventScreen = {
  designW: 1920, designH: 1080,
  // fixed layout: the painting NEVER changes size or position between the choices and outcome phases
  VIG_R: { x: 56, y: 174, w: 1088, h: 760 },
  COL_X: 1176, COL_W: 696,
  KIND: { event: 'Strange waters', distress: 'A distress call', empty: 'Open sea' },
  enter(args) {
    this.ev = args.ev;
    this.phase = 'choices';
    this.outcome = null;
    this.notes = [];
    this.chips = [];
    this.picked = null;
    this.msg = null;
    this.pendingFight = null;
    const n = Game.run && Game.run.map && Game.run.map.nodes ? Game.run.map.nodes.find(z => z.id === Game.run.nodeId) : null;
    this.kind = (n && this.KIND[n.type]) || 'Strange waters';
  },
  update(dt) {},
  // validate EVERY requirement key (R26: was first-key-only); returns ok + why not + the badge to show
  canChoose(ch) {
    const r = ch.req, out = { ok: true, blue: false, reason: null, badges: [] };
    if (!r) return out;
    const fail = why => { out.ok = false; if (!out.reason) out.reason = why; };
    if (r.race) {
      const rn = (DATA.RACES[r.race] || { name: r.race }).name, have = Game.ship.aliveCrew().some(c => c.race === r.race);
      out.blue = out.blue || have;
      out.badges.push({ kind: 'race', key: r.race, text: rn, ok: have });
      if (!have) fail('Needs a ' + rn + ' among your crew — you have none aboard.');
    }
    if (r.sys) {
      const sn = (DATA.SYSTEMS[r.sys] || { name: r.sys }).name, have = Game.ship.sysLv[r.sys] > 0;
      out.blue = out.blue || have;
      out.badges.push({ kind: 'sys', key: r.sys, text: sn, ok: have });
      if (!have) fail('Needs a ' + sn + ' installed on your ship.');
    }
    if (r.aug) {
      const an = (DATA.AUGS[r.aug] || { name: r.aug }).name, have = Game.run.augs.includes(r.aug);
      out.blue = out.blue || have;
      out.badges.push({ kind: 'aug', key: r.aug, text: an, ok: have });
      if (!have) fail('Needs the ' + an + ' augment.');
    }
    if (r.shards !== undefined) {
      const have = Game.run.shards >= r.shards;
      out.badges.push({ kind: 'shard', text: '−' + r.shards + ' shards', ok: have });
      if (!have) fail('Costs ' + r.shards + ' shards — you have ' + Game.run.shards + '.');
    }
    if (r.runeshot !== undefined) {
      const have = Game.run.runeshot >= r.runeshot;
      out.badges.push({ kind: 'runeshot', text: '−' + r.runeshot + ' runeshot', ok: have });
      if (!have) fail('Costs ' + r.runeshot + ' runeshot — you have ' + Game.run.runeshot + '.');
    }
    if (!out.ok) out.blue = false;
    return out;
  },
  choose(ch) {
    if (!this.canChoose(ch).ok) { AUDIO.sfx('deny'); return; }
    const before = DLG.snapshot();
    if (ch.req && ch.req.shards) Game.run.shards -= ch.req.shards;
    if (ch.req && ch.req.runeshot) Game.run.runeshot -= ch.req.runeshot;
    const res = U.wpick(ch.results.map(r => [r[1], r[0]]));
    this.outcome = res;
    this.picked = ch;
    this.notes = res.special || !res.fight ? UI.applyFx(res) : UI.applyFx(Object.assign({}, res, { fight: null }));
    if (res.fight) this.pendingFight = res.fight;
    this.chips = DLG.diffChips(before);
    if (this.pendingFight) this.chips.push({ icon: DLG.icSys('weapons', COL.dkred), title: 'Battle stations!', sub: 'An enemy ship moves to engage', tone: 'danger' });
    this.phase = 'outcome';
    AUDIO.sfx('click');
  },
  proceed() {
    if (this.pendingFight) {
      const f = this.pendingFight;
      Game.startBattle(f.race, (f.tier || 0), { elite: f.elite, hazard: f.hazard });
    } else Game.afterNode();
  },
  click() {},
  key(k) {
    if (this.phase === 'choices') {
      const n = parseInt(k, 10);
      if (n >= 1 && n <= this.ev.choices.length) {
        const ch = this.ev.choices[n - 1];
        const c = this.canChoose(ch);
        if (c.ok) this.choose(ch); else { this.msg = c.reason; AUDIO.sfx('deny'); }
      }
    } else if (k === ' ' || k === 'Enter') { AUDIO.sfx('click'); this.proceed(); }
  },
  // label without a trailing "(15 shards)" when the cost badge already says it
  choiceLabel(ch) {
    let s = ch.label;
    if (ch.req && (ch.req.shards || ch.req.runeshot)) s = s.replace(/\s*\(\s*\d+\s*(shards?|runeshot)\s*\)\s*$/i, '');
    return s;
  },
  badgeW(ctx, b) { return 14 + 30 + 8 + TYPE.width(ctx, b.text, 18) + 16; },
  drawBadge(ctx, b, r, dim) {
    ctx.save(); UI.roundRect(ctx, r.x, r.y, r.w, r.h, r.h / 2); ctx.clip();
    ctx.fillStyle = b.ok ? (b.kind === 'shard' || b.kind === 'runeshot' ? 'rgba(70,46,18,0.10)' : 'rgba(47,138,114,0.14)') : 'rgba(143,35,22,0.10)';
    ctx.fillRect(r.x, r.y, r.w, r.h); ctx.restore();
    ctx.strokeStyle = b.ok ? 'rgba(74,51,24,0.6)' : 'rgba(143,35,22,0.65)'; ctx.lineWidth = 1.2;
    UI.roundRect(ctx, r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1, r.h / 2); ctx.stroke(); ctx.lineWidth = 1;
    const icR = { x: r.x + 14, y: r.y + (r.h - 30) / 2, w: 30, h: 30 };
    ctx.save(); if (dim) ctx.globalAlpha = 0.6;
    if (b.kind === 'shard' || b.kind === 'runeshot') UI.drawRes(ctx, b.kind, icR.x, icR.y, 30);
    else if (b.kind === 'race') DLG.icCrew(b.key)(ctx, icR);
    else if (b.kind === 'sys') drawSysSym(ctx, b.key, icR.x + 1, icR.y + 1, 28, COL.inkdk);
    else UI.drawAugIcon(ctx, b.key, icR.x, icR.y, 30);
    ctx.restore();
    KIT.text(ctx, b.text, { x: icR.x + 38, y: r.y, w: r.x + r.w - 14 - icR.x - 38, h: r.h }, { size: 18, color: b.ok ? (b.kind === 'shard' || b.kind === 'runeshot' ? COL.inkdk : DLG.GAIN) : DLG.LOSS });
  },
  // one choice = one card: brass number medallion · wrapped label · right-aligned requirement badge(s)
  choiceLayout(ctx, ch, w) {
    const c = this.canChoose(ch), bw = c.badges.reduce((a, b) => a + this.badgeW(ctx, b) + 8, 0);
    const lx = 84, lw = w - lx - 20 - (bw ? bw + 8 : 0);
    const lines = Math.min(2, TYPE.wrap(ctx, this.choiceLabel(ch), lw, 23).length);
    const rl = c.ok ? 0 : Math.min(2, TYPE.wrap(ctx, c.reason, w - lx - 20, 17, { italic: true }).length);
    const labelH = lines * 31 - 8, reasonH = rl ? rl * 23 - 6 : 0, contentH = labelH + (rl ? 12 + reasonH : 0);
    return { c, bw, lx, lw, lines, rl, labelH, reasonH, contentH, h: Math.max(96, contentH + 52) };
  },
  drawChoice(ctx, ch, i, r, L) {
    const id = 'event.choice.' + i, c = L.c;
    KIT.reg(id, r, { onClick: () => this.choose(ch), disabled: !c.ok, onDenied: () => { this.msg = c.reason; }, sound: false });
    const hov = KIT.hovered(id, r), prs = c.ok && KIT.pressed(id, r);
    if (hov && c.ok) Game.hot = true;
    const ht = KIT.anim(id + ':h', hov && c.ok ? 1 : 0, 18);
    const R = { x: r.x, y: r.y + (prs ? 1.5 : 0), w: r.w, h: r.h };
    if (c.ok) KIT.card(ctx, R, { tint: c.blue ? 'rgba(47,138,114,' + (0.10 + 0.08 * ht).toFixed(3) + ')' : (ht > 0 ? 'rgba(255,240,205,' + (0.30 * ht).toFixed(3) + ')' : null), edge: c.blue ? KIT.C.action : null });
    else KIT.card(ctx, R, { tint: 'rgba(70,46,18,0.24)', studs: false });
    if (c.ok && ht > 0.01) { ctx.strokeStyle = 'rgba(122,82,8,' + (0.8 * ht).toFixed(3) + ')'; ctx.lineWidth = 2.5; UI.roundRect(ctx, R.x + 1.25, R.y + 1.25, R.w - 2.5, R.h - 2.5, 6); ctx.stroke(); ctx.lineWidth = 1; }
    // number medallion, centred on the card
    const mx = R.x + 44, my = R.y + R.h / 2;
    ctx.beginPath(); ctx.arc(mx, my, 23, 0, 7); ctx.fillStyle = c.ok ? COL.brassdk : 'rgba(90,70,45,0.45)'; ctx.fill();
    ctx.beginPath(); ctx.arc(mx, my, 19.5, 0, 7); ctx.fillStyle = c.ok ? (c.blue ? '#d9ece3' : '#f1e3bf') : 'rgba(214,198,166,0.8)'; ctx.fill();
    KIT.text(ctx, '' + (i + 1), { x: mx - 20, y: my - 20, w: 40, h: 40 }, { size: 22, display: true, align: 'center', color: c.ok ? (c.blue ? KIT.C.action : COL.inkdk) : KIT.C.disabled });
    // label (wraps to 2 lines; never under the badge) + the inline reason when unavailable; block centred
    const top = R.y + (R.h - L.contentH) / 2, labelH = L.labelH;
    KIT.text(ctx, this.choiceLabel(ch), { x: R.x + L.lx, y: top, w: L.lw, h: labelH }, { size: 23, color: c.ok ? (c.blue ? KIT.C.action : COL.inkdk) : 'rgba(74,51,24,0.62)', fit: 'wrap', maxLines: 2, lineGap: 8 });
    if (!c.ok) KIT.text(ctx, c.reason, { x: R.x + L.lx, y: top + labelH + 12, w: R.w - L.lx - 20, h: L.reasonH }, { size: 17, italic: true, color: DLG.LOSS, fit: 'wrap', maxLines: 2, lineGap: 6 });
    // requirement badges, right-aligned, centred on the label block
    let bx = R.x + R.w - 20;
    const bcy = top + labelH / 2;
    for (let j = c.badges.length - 1; j >= 0; j--) {
      const b = c.badges[j], bw = this.badgeW(ctx, b); bx -= bw;
      this.drawBadge(ctx, b, { x: bx, y: bcy - 20, w: bw, h: 40 }, !c.ok && b.ok);
      bx -= 8;
    }
    this._choiceRects.push({ x: r.x, y: r.y, w: r.w, h: r.h, ch, label: { x: R.x + L.lx, y: top, w: L.lw, h: labelH }, badgeX: bx + 8 });
    if (hov) {
      const tip = [{ t: this.choiceLabel(ch), c: TIP.ink }];
      for (const b of c.badges) if (b.ok) tip.push({ t: b.kind === 'shard' ? 'Costs ' + ch.req.shards + ' shards.' : b.kind === 'runeshot' ? 'Costs ' + ch.req.runeshot + ' runeshot.' : 'Your ' + b.text + ' opens this option.', c: b.kind === 'shard' || b.kind === 'runeshot' ? TIP.body : TIP.action });
      if (!c.ok) tip.push({ t: c.reason, c: TIP.danger });
      KIT.tip(tip, Game.mouse.x, Game.mouse.y);
    }
  },
  // who is aboard (FTL: crew unlock the blue options) — a sailor whose race opens an order is ringed in teal
  CREW_H: 136,
  crewStrip(ctx, x, y, w) {
    const crew = Game.ship.aliveCrew(), keyRaces = new Set(this.ev.choices.filter(ch => ch.req && ch.req.race && crew.some(c => c.race === ch.req.race)).map(ch => ch.req.race));
    ShipMenu.woodLabel(ctx, { x, y, w, h: 28 }, 'Aboard', crew.length + ' of 8 berths filled' + (keyRaces.size ? ' · teal rings open an order' : ''));
    const S = 72, G = 12;
    crew.slice(0, 8).forEach((c, i) => {
      const R = { x: x + i * (S + G), y: y + 38, w: S, h: S }, key = keyRaces.has(c.race);
      KIT.iconCell(ctx, R, Rc => DLG.icCrew(c.race)(ctx, Rc));
      if (key) { ctx.strokeStyle = KIT.C.actionHi; ctx.lineWidth = 3; UI.roundRect(ctx, R.x - 1.5, R.y - 1.5, R.w + 3, R.h + 3, 7); ctx.stroke(); ctx.lineWidth = 1; }
      KIT.text(ctx, c.name, { x: R.x - 4, y: R.y + S + 2, w: S + 8, h: 22 }, { size: 14, italic: true, align: 'center', color: KIT.C.onWoodMuted, shadow: 'rgba(16,9,3,0.85)', shadowDx: 1, shadowDy: 1, fit: 'ellipsis' });
      if (KIT.hovered('event.crew.' + i, R)) {
        const rn = (DATA.RACES[c.race] || { name: c.race }).name;
        KIT.tip([{ t: c.name, c: TIP.ink }, { t: rn + ' · ' + Math.ceil(c.hp) + ' of ' + c.maxhp + ' health', c: TIP.body }, key ? { t: 'Opens an order in this encounter.', c: TIP.action } : null].filter(Boolean), Game.mouse.x, Game.mouse.y);
      }
    });
  },
  render(ctx) {
    DLG.chrome(ctx, this.kind);
    const P = DLG.BODY;
    KIT.panel(ctx, P, { wood: true, title: DLG.titleCase(this.ev.title) });
    // the painting: one fixed box for both phases
    const V = this.VIG_R;
    DLG.vignette(ctx, 'vig_' + (this.ev.vig || 'island'), V);
    this._imgRect = { x: V.x, y: V.y, w: V.w, h: V.h };
    const cx = this.COL_X, cw = this.COL_W, top = P.y + 60, bot = P.y + P.h - 24;
    this._choiceRects = [];
    if (this.phase === 'choices') {
      // the narrative card, sized to its text
      const lines = TYPE.wrap(ctx, this.ev.text, cw - 64, 24, { italic: true });
      const nh = Math.max(150, 56 + lines.length * 35 + 24);
      const nr = { x: cx, y: top, w: cw, h: nh };
      KIT.card(ctx, nr);
      KIT.text(ctx, this.ev.text, { x: nr.x + 32, y: nr.y + 28, w: nr.w - 64, h: nh - 52 }, { size: 24, italic: true, fit: 'wrap', valign: 'middle', lineGap: 11 });
      this._narr = nr;
      let y = nr.y + nh + 28;
      ShipMenu.woodLabel(ctx, { x: cx, y, w: cw, h: 28 }, 'Your Orders', 'click one, or press its number');
      y += 42;
      this.choiceY = y;
      const Ls = this.ev.choices.map(ch => this.choiceLayout(ctx, ch, cw));
      this.ev.choices.forEach((ch, i) => { const L = Ls[i]; this.drawChoice(ctx, ch, i, { x: cx, y, w: cw, h: L.h }, L); y += L.h + 14; });
      this._choicesBottom = y - 14;
      if (y + 12 <= bot - this.CREW_H) this.crewStrip(ctx, cx, bot - this.CREW_H, cw);
      DLG.footHint(ctx, this.msg || 'Choose your course, Captain. Greyed orders say what they need.', 1500);
    } else {
      // outcome: what you chose · what happened · the chips · Continue
      const lines = TYPE.wrap(ctx, this.outcome.text, cw - 64, 24, { italic: true });
      const oh = 52 + 36 + lines.length * 35 + 20;
      const orr = { x: cx, y: top, w: cw, h: oh };
      KIT.card(ctx, orr);
      KIT.text(ctx, 'You chose: ' + this.choiceLabel(this.picked || { label: '' }), { x: orr.x + 32, y: orr.y + 22, w: orr.w - 64, h: 28 }, { size: 17, display: false, italic: true, color: COL.inkmd, fit: 'ellipsis' });
      KIT.rule(ctx, orr.x + 32, orr.y + 58, orr.x + orr.w - 32, 0.4);
      KIT.text(ctx, this.outcome.text, { x: orr.x + 32, y: orr.y + 74, w: orr.w - 64, h: lines.length * 35 }, { size: 24, italic: true, fit: 'wrap', valign: 'top', lineGap: 11 });
      this._txtTop = orr.y; this._txtRect = orr;
      let y = orr.y + oh + 28;
      const extra = DLG.uncovered(this.notes);
      if (this.chips.length || extra.length) {
        ShipMenu.woodLabel(ctx, { x: cx, y, w: cw, h: 28 }, 'Spoils & Losses', this.chips.length ? '' : 'nothing gained, nothing lost');
        y += 42;
        y = DLG.drawChips(ctx, this.chips, cx, y, cw, 2, 12) + (this.chips.length ? 18 : 0);
        for (const n of extra) {
          const t = KIT.text(ctx, n, { x: cx + 4, y, w: cw - 8, h: 60 }, { size: 18, italic: true, color: KIT.C.onWoodMuted, shadow: 'rgba(16,9,3,0.85)', shadowDx: 1, shadowDy: 1, fit: 'wrap', maxLines: 2, valign: 'top', lineGap: 6 });
          y = t.bottom + 10;
        }
      } else {
        const r = { x: cx, y, w: cw, h: 64 };
        KIT.card(ctx, r, { tint: 'rgba(70,46,18,0.18)', studs: false });
        KIT.text(ctx, 'Nothing gained, nothing lost — the sea lets you pass.', r, { size: 19, italic: true, color: COL.inkmd, align: 'center', padX: 20, fit: 'ellipsis' });
        y += 64 + 18;
      }
      this._outBottom = y;
      if (y + 12 <= bot - this.CREW_H) this.crewStrip(ctx, cx, bot - this.CREW_H, cw);
      const fight = !!this.pendingFight;
      DLG.footHint(ctx, fight ? 'An enemy ship engages — to arms!' : 'Press Enter or Space to sail on.', 1300);
      KIT.button(ctx, 'event.continue', { x: 1888 - 280, y: DLG.FOOT_Y, w: 280, h: DLG.FOOT_H }, fight ? 'To Arms!' : 'Continue', {
        variant: fight ? 'danger' : 'parch', sound: 'click', onClick: () => this.proceed(),
        tip: [{ t: fight ? 'Battle stations' : 'Back to the chart', c: TIP.ink }, { t: fight ? 'The fight begins at once.' : 'Your voyage continues.', c: TIP.body }],
      });
    }
    DLG.finish(ctx);
  },
};

// ============ LOOT SCREEN (post battle / ship's log) ============
const LootScreen = {
  designW: 1920, designH: 1080,
  enter(args) {
    this.title = args.title;
    this.rawLines = args.lines || [];
    this.parse();
  },
  update(dt) {},
  click() {},
  key(k) { if (k === ' ' || k === 'Enter') { AUDIO.sfx('click'); Game.afterNode(); } },
  HAZARD: /FIRES STILL BURN|STILL TAKING WATER|SEE TO IT FROM THE DECKS/,
  findWeapon(name) { name = name.trim().toLowerCase(); return Object.keys(DATA.WEAPONS).find(k => DATA.WEAPONS[k].name.toLowerCase() === name); },
  findAug(name) { name = name.trim().toLowerCase(); return Object.keys(DATA.AUGS).find(k => DATA.AUGS[k].name.toLowerCase() === name); },
  // sort the authored CAPS lines into prose paragraphs, spoils chips and hazard warnings
  parse() {
    const prose = [], chips = [], warn = [];
    let para = [];
    const flush = () => { if (para.length) { prose.push(para.join(' ')); para = []; } };
    const tokChip = tok => {
      tok = tok.trim().replace(/\.$/, '');
      let m;
      if ((m = tok.match(/^\+(\d+) SHARDS?$/))) return DLG.resChip('shard', +m[1]);
      if ((m = tok.match(/^\+(\d+) RUNESHOT$/))) return DLG.resChip('runeshot', +m[1]);
      if ((m = tok.match(/^\+(\d+) (SEANCE )?CANDLES?$/))) return DLG.resChip('candle', +m[1]);
      if ((m = tok.match(/^\+(\d+) HULL$/))) return DLG.hullChip(+m[1]);
      if (/^CREW (RESTED|HEALED)$/.test(tok)) return { icon: DLG.icSys('infirmary'), title: 'Crew rested', sub: 'Every sailor back to full health', tone: 'gain' };
      return null;
    };
    for (const raw of this.rawLines) {
      if (!raw) { flush(); continue; }
      if (this.HAZARD.test(raw)) { flush(); warn.push(DLG.prose(raw)); continue; }
      let m;
      if (/^\+\d+/.test(raw)) {
        const toks = raw.split(/,\s*/), cs = toks.map(tokChip);
        if (cs.every(Boolean)) { flush(); chips.push(...cs); continue; }
      }
      if ((m = raw.match(/^WEAPON GAINED: (.+)$/)) && this.findWeapon(m[1])) { flush(); chips.push(DLG.weaponChip(this.findWeapon(m[1]), 'Mounted and ready to fire')); continue; }
      if ((m = raw.match(/^(.+) STOWED IN CARGO$/)) && this.findWeapon(m[1])) { flush(); chips.push(DLG.weaponChip(this.findWeapon(m[1]), 'Stowed in the hold')); continue; }
      if ((m = raw.match(/^NO ROOM FOR THE (.+?) - YOU WILL CHOOSE/)) && this.findWeapon(m[1])) { flush(); chips.push(Object.assign(DLG.weaponChip(this.findWeapon(m[1]), 'No room aboard — you choose what to keep next'), { tone: 'info' })); continue; }
      if ((m = raw.match(/^AUGMENT: (.+)$/)) && this.findAug(m[1])) { flush(); chips.push(DLG.augChip(this.findAug(m[1]))); continue; }
      if (/^NO AUGMENT SLOT FREE/.test(raw) && DATA.AUGS[Game.run.pendingAug]) { flush(); chips.push(Object.assign(DLG.augChip(Game.run.pendingAug, 'Slots full — you choose what to keep next'), { tone: 'info' })); continue; }
      if ((m = raw.match(/^(?:A SURVIVOR DEFECTS: )?(.+?) THE (.+?) JOINS YOU!$/))) {
        const nm = m[1].toLowerCase(), c = Game.ship && Game.ship.crew.find(z => (z.name || '').toLowerCase() === nm);
        if (c) { flush(); chips.push(Object.assign(DLG.crewChip(c, true), /DEFECTS/.test(raw) ? { sub: (DATA.RACES[c.race] || { name: c.race }).name + ' survivor · defects to your crew' } : {})); continue; }
      }
      para.push(DLG.prose(raw));
      if (/[:.!?]$/.test(raw) === false) continue;
      flush();
    }
    flush();
    this.prose = prose; this.chips = chips; this.warn = warn;
  },
  vig() {
    const t = String(this.title || '');
    if (/LOG/.test(t)) { const r = DATA.REGIONS[Game.run ? Game.run.region : 0]; return 'vig_' + ((r && r.vig) || 'calm'); }
    if (/WARDEN/.test(t)) return 'vig_boss';
    if (/QUIET|AWAY/.test(t)) return 'vig_calm';
    return 'vig_wreck';
  },
  render(ctx) {
    DLG.chrome(ctx, /LOG/.test(this.title || '') ? 'A new sea' : 'After the encounter');
    const W = 1280, x = (1920 - W) / 2, inner = W - 32;
    // measure: banner painting · prose card · spoils · warnings
    const VH = 344;
    const proseLines = this.prose.map(p => TYPE.wrap(ctx, p, inner - 64, 23, { italic: true }).length);
    const proseH = this.prose.length ? 52 + proseLines.reduce((a, n) => a + n * 33 - 10, 0) + (this.prose.length - 1) * 18 : 0;
    const nC = this.chips.length, cols = nC === 4 ? 2 : nC > 4 ? 3 : Math.max(2, nC);
    const chipsH = this.chips.length ? 42 + Math.ceil(this.chips.length / cols) * (DLG.chipH + 12) - 12 : 0;
    const warnH = this.warn.length ? Math.max(84, 40 + this.warn.length * 30) : 0;
    const gaps = [proseH, chipsH, warnH].filter(Boolean).length * 20;
    let H = 52 + VH + 20 + proseH + chipsH + warnH + gaps + 4;
    let vh = VH;
    const maxH = DLG.BODY.h;
    if (H > maxH) { vh = Math.max(120, VH - (H - maxH)); H = Math.min(maxH, H - (VH - vh)); }
    const P = { x, y: DLG.BODY.y + Math.max(0, Math.floor((maxH - H) / 2)), w: W, h: H };
    const c = KIT.panel(ctx, P, { wood: true, title: DLG.titleCase(this.title) });
    const V = { x: c.x + 6, y: c.y + 6, w: c.w - 12, h: vh - 12 };
    DLG.vignette(ctx, this.vig(), V);
    let y = c.y + vh + 20;
    if (proseH) {
      const r = { x: c.x, y, w: c.w, h: proseH };
      KIT.card(ctx, r);
      let ty = r.y + 26;
      this.prose.forEach((p, i) => { const ph = proseLines[i] * 33 - 10; KIT.text(ctx, p, { x: r.x + 32, y: ty, w: r.w - 64, h: ph }, { size: 23, italic: true, fit: 'wrap', lineGap: 10, align: 'center' }); ty += ph + 18; });
      y += proseH + 20;
    }
    if (chipsH) {
      ShipMenu.woodLabel(ctx, { x: c.x, y, w: c.w, h: 28 }, 'Spoils', this.chips.length + (this.chips.length === 1 ? ' item' : ' items') + ' taken aboard');
      DLG.drawChips(ctx, this.chips, c.x, y + 42, c.w, cols, 12, true);
      y += chipsH + 20;
    }
    if (warnH) {
      const r = { x: c.x, y, w: c.w, h: warnH };
      KIT.card(ctx, r, { tint: 'rgba(143,35,22,0.10)', edge: 'rgba(143,35,22,0.85)' });
      const ic = { x: r.x + 14, y: r.y + (r.h - 56) / 2, w: 56, h: 56 };
      KIT.iconCell(ctx, ic, Rc => DLG.icIcon('flame')(ctx, Rc));
      const ty0 = r.y + (r.h - this.warn.length * 30) / 2;
      this.warn.forEach((wl, i) => KIT.text(ctx, wl, { x: ic.x + ic.w + 18, y: ty0 + i * 30, w: r.x + r.w - 24 - ic.x - ic.w - 18, h: 30 }, { size: 19, color: DLG.LOSS, fit: 'ellipsis', italic: i === this.warn.length - 1 && this.warn.length > 1 }));
    }
    this._panel = P;
    DLG.footHint(ctx, this.warn.length ? 'Open the Decks from the chart to fight fires and patch leaks.' : 'Press Enter or Space to return to the chart.', 1300);
    KIT.button(ctx, 'loot.continue', { x: 1888 - 280, y: DLG.FOOT_Y, w: 280, h: DLG.FOOT_H }, 'Continue', {
      sound: 'click', onClick: () => Game.afterNode(),
      tip: [{ t: 'Back to the chart', c: TIP.ink }, { t: 'Your voyage continues.', c: TIP.body }],
    });
    DLG.finish(ctx);
  },
};

// ============ SHOP (HD harbor market, 2026-10-08) ============
// Authored on the 1920x1080 design grid with the shared KIT, in the ShipMenu idiom: parchment page ->
// folder tabs on a ledger rule (Buy / Sell / Familiars) + the shared instrument strip top-right -> wood
// panels -> parchment ware cards (recessed icon cell, name, one-line summary, recessed price button that
// carries its disabled REASON) -> a footer with the merchant's line, Rumours and Set Sail.
// Modals (trade-in prompt, sell confirm, rumours, lore tale) are KIT dialogs: a scrim makes everything
// beneath inert, Escape peels them one at a time (R10). Every control is a KIT registration, so the drawn
// rect IS the click rect. Stable ids:
//   shop.tab.0..2 · shop.buy.<n> (n = index in this.stock) · shop.goods.runeshot · shop.goods.candle
//   shop.repair.one · shop.repair.all · shop.slot.<i> (sell-tab loadout slot, tap two to swap)
//   shop.sell.<n> (n = index in this._sellList) · shop.fam.buy.<n> · shop.fam.candle · shop.fam.sell.<i>
//   shop.rumors · shop.setsail · shop.trade.<n> · shop.trade.cancel · shop.prompt.confirm · shop.prompt.cancel
//   shop.rumor.<i> · shop.rumors.close · shop.lore.back
const ShopScreen = {
  designW: 1920, designH: 1080,
  TABS: ['Buy', 'Sell', 'Familiars'],
  TAB_R: { x: 32, y: 24, w: 840, h: 64 },
  BODY_Y: 104, BODY_H: 856, FOOT_Y: 984, FOOT_H: 64,
  LEFT_X: 32, LEFT_W: 560, RIGHT_X: 624, RIGHT_W: 1264,   // Buy tab columns
  WIDE_W: 1216, SIDE_X: 1264, SIDE_W: 624,                // Sell / Familiars columns (== ShipMenu)
  // the merchant's greeting, one per sea (the footer shows it until an action replaces it)
  QUIPS: [
    'Welcome aboard, Captain. No refunds. Mostly no curses.',
    'Mind the coral on the gangplank — and the prices. Both bite.',
    'Everything here was traded fairly. Mostly for heads.',
    'Fireproof goods only, friend. We learned that the hard way.',
    'Buy before the next squall — the wind takes what you leave.',
    'Forged below, priced above. Dwarven craft is never cheap.',
    'Speak softly in here. Some of the wares are still listening.',
    'Last port before the Warden. Spend it all — the sea will not.',
  ],

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
    this.tab = 0; // 0 = Buy, 1 = Sell, 2 = Familiars
    this.sellPrompt = null;
    this.confirmSell = null;
    this.sellSel = -1; // selected loadout slot for the mount/stow swap on the Sell tab
    this._sellList = [];
    this.msg = null;
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
    // carved vessels for the menagerie: 4 always wait on the counter (FAMILIARS tab). Drawn from the unbound pool.
    const famPool = U.shuffle(Object.keys(DATA.FAMILIARS).filter(k => !(Game.run.familiars || []).includes(k))).slice(0, 4);
    for (const fk of famPool) stock.push({ kind: 'familiar', key: fk, price: Math.round(DATA.FAMILIARS[fk].cost * U.rf(0.9, 1.15) * disc), sold: false });
    // advanced systems: offer ONE uninstalled system if you still have an open mount (FTL: buy systems at stores)
    const installedAdv = DATA.SYS_ADVANCED.filter(k => Game.ship.sysLv[k] > 0).length;
    const advAvail = DATA.SYS_ADVANCED.filter(k => !(Game.ship.sysLv[k] > 0));
    if (installedAdv < DATA.OPEN_MOUNTS && advAvail.length && U.chance(0.7)) {
      const sk = U.pick(advAvail);
      // keep the CREW·AUGMENTS·SYSTEMS panel to 4 cards: drop one aug to make room for the system
      const augItems = stock.filter(s => s.kind === 'aug');
      if (augItems.length > 1) stock.splice(stock.indexOf(augItems[augItems.length - 1]), 1);
      stock.push({ kind: 'system', key: sk, price: Math.round((DATA.SYSTEMS[sk].costs[0] || 60) * U.rf(0.9, 1.15) * disc), sold: false });
    }
    stock.push({ kind: 'rune', key: 'runeshot', price: Math.round(6 * disc), sold: false });
    stock.push({ kind: 'candle', key: 'candle', price: Math.round(8 * disc), sold: false });
    return stock;
  },
  update(dt) { Game.ship.tick(dt, null); },

  // ---------------- purchase rules (one source for the button state, its reason, and buy()) ----------------
  advInstalled() { return DATA.SYS_ADVANCED.filter(k => Game.ship.sysLv[k] > 0).length; },
  // why this ware can't be bought right now (null = it can). Structural blockers first, then money.
  buyBlock(it) {
    const run = Game.run, ship = Game.ship;
    if (it.sold) return 'Already bought — the merchant has no more.';
    if (it.kind === 'crew' && ship.aliveCrew().length >= 8) return 'Crew berths full (8 of 8) — dismiss a sailor on the Ship screen first.';
    if (it.kind === 'aug' && run.augs.length >= 3) return 'Augment slots full (3 of 3) — sell one on the Sell tab first.';
    if (it.kind === 'familiar') {
      if (!(ship.sysLv.shrine > 0)) return 'Install a Binding Shrine first — familiars cannot be bound without one.';
      if ((run.familiars || []).length >= 3) return 'The shrine holds three bindings, no more — release one first.';
    }
    if (it.kind === 'system') {
      if (ship.sysLv[it.key] > 0) return DATA.SYSTEMS[it.key].name + ' is already installed.';
      if (this.advInstalled() >= DATA.OPEN_MOUNTS) return 'No open system mount (' + DATA.OPEN_MOUNTS + ' of ' + DATA.OPEN_MOUNTS + ' in use).';
    }
    if (run.shards < it.price) return 'Needs ' + (it.price - run.shards) + ' more shard' + (it.price - run.shards === 1 ? '' : 's') + ' — you have ' + run.shards + '.';
    return null;
  },
  gunsFull() { return Game.ship.weapons.length >= Game.ship.mounts && Game.run.cargo.length >= 2; },
  buy(it) {
    const run = Game.run;
    const why = this.buyBlock(it);
    if (why) { this.msg = why; AUDIO.sfx('back'); return; }
    // full mounts AND full cargo: FTL-style "trade one of yours in" dialog
    if (it.kind === 'weapon' && this.gunsFull()) { this.sellPrompt = { item: it }; AUDIO.sfx('click'); return; }
    run.shards -= it.price;
    if (it.kind === 'weapon') { this.msg = DLG.prose(UI.gainWeapon(it.key)) + '.'; it.sold = true; }
    else if (it.kind === 'aug') { UI.installAug(it.key); this.msg = DATA.AUGS[it.key].name + ' installed.'; it.sold = true; }
    else if (it.kind === 'crew') {
      const c = Game.ship.addCrew(it.key); c.owner = 'player';
      this.msg = c.name + ' the ' + DATA.RACES[it.key].name + ' signs the articles.';
      it.sold = true;
    } else if (it.kind === 'familiar') {
      run.familiars = run.familiars || [];
      run.familiars.push(it.key);
      this.msg = DATA.FAMILIARS[it.key].name + ' is bound to your ship.';
      it.sold = true;
    } else if (it.kind === 'system') {
      Game.ship.sysLv[it.key] = 1;
      Game.ship.assignMounts(); // seat it into an open mount room
      this.msg = DATA.SYSTEMS[it.key].name + ' installed — power it from the Hearthstone.';
      it.sold = true;
    } else if (it.kind === 'rune') { run.runeshot++; this.msg = 'Runeshot loaded aboard (' + run.runeshot + ' in the magazine).'; }
    else if (it.kind === 'candle') { run.candles = (run.candles || 0) + 1; this.msg = 'A Seance Candle joins your stores (' + run.candles + ' aboard).'; }
    AUDIO.sfx('coin');
  },
  // trade-in: sell the chosen gun, buy the new one into its place
  trade(from, idx) {
    const it = this.sellPrompt.item, run = Game.run;
    const sold = UI.sellWeapon(from, idx);
    run.shards -= it.price;
    UI.gainWeapon(it.key);
    this.msg = 'Traded the ' + DATA.WEAPONS[sold.key].name + ' (+' + sold.value + ') for the ' + DATA.WEAPONS[it.key].name + '.';
    it.sold = true;
    this.sellPrompt = null;
    AUDIO.sfx('coin');
  },
  repairCost() { return DATA.REPAIR_COST(Game.run.region); },
  repairOne() {
    const rp = this.repairCost(), run = Game.run;
    if (Game.ship.hull >= Game.ship.hullMax) { this.msg = 'The hull is sound already.'; return; }
    if (run.shards < rp) { this.msg = 'Needs ' + (rp - run.shards) + ' more shards.'; return; }
    run.shards -= rp; Game.ship.hull++; this.msg = 'Patched 1 hull for ' + rp + ' shards.'; AUDIO.sfx('coin');
  },
  repairAll() {
    const rp = this.repairCost(), run = Game.run;
    let n = 0;
    while (Game.ship.hull < Game.ship.hullMax && run.shards >= rp) { run.shards -= rp; Game.ship.hull++; n++; }
    this.msg = n ? 'Patched ' + n + ' hull for ' + n * rp + ' shards.' : 'Nothing to patch.';
    if (n) AUDIO.sfx('coin');
  },
  setTab(i) { if (this.tab === i) return; this.tab = i; this.msg = null; this.sellSel = -1; },
  leave() { AUDIO.sfx('back'); Game.afterNode(); },
  // clicks that land on no KIT control: clicking the empty page cancels a pending gun swap
  click() { if (this.sellSel !== -1) this.sellSel = -1; },
  // R10: Escape peels modals off one at a time (lore page -> rumours -> sell confirm / trade-in) and
  // only leaves port when nothing is open.
  key(k) {
    if (k !== 'Escape') return;
    if (this.showRumors && this.loreView) { this.loreView = null; AUDIO.sfx('back'); return; }
    if (this.showRumors) { this.showRumors = false; AUDIO.sfx('back'); return; }
    if (this.confirmSell) { this.confirmSell = null; AUDIO.sfx('back'); return; }
    if (this.sellPrompt) { this.sellPrompt = null; this.msg = 'Kept your guns.'; AUDIO.sfx('back'); return; }
    if (this.sellSel !== -1) { this.sellSel = -1; return; }
    Game.afterNode();
  },

  // ---------------- ware presentation ----------------
  info(it) { return UI.itemInfo(it); },
  ucfirst(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); },
  augDesc(key) { return this.ucfirst(DATA.AUGS[key].desc.replace(/^LEGENDARY:\s*/, '')); },
  famRole(key) {
    const f = DATA.FAMILIARS[key], orbit = f.role === 'attack' || f.role === 'boarder';
    return orbit ? 'Orbits the enemy · 1 candle to deploy' : 'Guards your hull · free to keep';
  },
  // the small heading above a ware's name
  kindLabel(it) {
    if (it.kind === 'weapon') { const wd = DATA.WEAPONS[it.key], f = this.ucfirst(wd.family || 'weapon'); return f + (wd.type === 'beam' && wd.family !== 'beam' ? ' beam' : '') + ' · ' + (DATA.RACES[wd.race] ? DATA.RACES[wd.race].name + ' make' : 'common make'); }
    if (it.kind === 'aug') return DATA.AUGS[it.key].legendary ? 'Legendary augment' : 'Augment';
    if (it.kind === 'crew') return 'New hand · ' + DATA.RACES[it.key].hp + ' health';
    if (it.kind === 'system') return 'Advanced system · fills an open mount';
    if (it.kind === 'familiar') return 'Familiar · ' + (DATA.FAMILIARS[it.key].role === 'attack' || DATA.FAMILIARS[it.key].role === 'boarder' ? 'orbiting' : 'guardian');
    return 'Goods';
  },
  // the one-line (wrapping) summary on a ware card
  summary(it) {
    const run = Game.run;
    if (it.kind === 'weapon') { const sp = UI.weaponSpecials(DATA.WEAPONS[it.key]); return sp ? this.ucfirst(sp) + '.' : DATA.WEAPONS[it.key].desc; }
    if (it.kind === 'aug') return this.augDesc(it.key);
    if (it.kind === 'crew') return DATA.RACES[it.key].desc;
    if (it.kind === 'system') return DATA.SYSTEMS[it.key].desc;
    if (it.kind === 'familiar') return this.famRole(it.key) + '. ' + DATA.FAMILIARS[it.key].desc;
    if (it.kind === 'candle') return 'Burned to deploy or re-bind an orbiting familiar. ' + (run.candles || 0) + ' aboard.';
    return 'Ammunition for bombs and torpedoes. ' + run.runeshot + ' in the magazine.';
  },
  // the full hover detail (the HD equivalent of the old UI.itemCard): never truncated, wraps in the scrap
  detailTip(it) {
    const info = this.info(it), run = Game.run;
    let lines;
    if (it.kind === 'weapon') lines = ShipMenu.weaponTip(it.key);
    else {
      lines = [{ t: info.name, c: TIP.ink }, { t: this.kindLabel(it), c: TIP.stat }];
      if (it.kind === 'aug') lines.push({ t: this.augDesc(it.key), c: TIP.body });
      else if (it.kind === 'crew') { const r = DATA.RACES[it.key]; lines.push({ t: r.desc, c: TIP.body }, { t: 'Health ' + r.hp + ' · melee ×' + r.dmg + ' · repair ×' + r.rep + ' · speed ×' + r.spd, c: TIP.stat }); }
      else if (it.kind === 'familiar') lines.push({ t: DATA.FAMILIARS[it.key].desc, c: TIP.body }, { t: this.famRole(it.key) + '. Woken by a powered Binding Shrine.', c: TIP.special });
      else lines.push({ t: info.desc, c: TIP.body });
    }
    if (it.price != null) lines.push({ t: it.sold ? 'Sold.' : 'Price ' + it.price + ' shards — you have ' + run.shards + '.', c: it.sold ? TIP.faint : run.shards < it.price ? TIP.danger : TIP.action });
    return lines;
  },
  // draw a ware's picture fitted (aspect kept) inside an icon cell with padding — nothing spills the frame
  artFit(ctx, name, R, pad) {
    const e = SPR.artEntry(name); if (!e) return false;
    const iw = e.img.naturalWidth || e.img.width, ih = e.img.naturalHeight || e.img.height;
    const s = Math.min((R.w - 2 * pad) / iw, (R.h - 2 * pad) / ih), w = iw * s, h = ih * s;
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(e.img, R.x + (R.w - w) / 2, R.y + (R.h - h) / 2, w, h); ctx.restore();
    return true;
  },
  drawIcon(ctx, it, R0) {
    if (it.kind === 'weapon') { ShipMenu.drawWeaponArt(ctx, it.key, R0); return; }
    // everything else is square art: fit a centred square so a wide cell never stretches or spills it
    const sq = Math.min(R0.w, R0.h), R = { x: R0.x + (R0.w - sq) / 2, y: R0.y + (R0.h - sq) / 2, w: sq, h: sq };
    const pad = Math.max(6, Math.round(sq * 0.08));
    if (it.kind === 'crew') { if (!this.artFit(ctx, 'portrait_' + it.key, R, 4)) SPR.drawCrewIcon(ctx, it.key, R.x + pad, R.y + pad, R.w - 2 * pad); }
    else if (it.kind === 'aug') UI.drawAugIcon(ctx, it.key, R.x + pad, R.y + pad, R.w - 2 * pad);
    else if (it.kind === 'system') drawSysSym(ctx, it.key, R.x + pad, R.y + pad, R.w - 2 * pad, COL.inkdk);
    else if (it.kind === 'familiar') { if (!this.artFit(ctx, 'icon_fam_' + it.key, R, pad)) SPR.drawFamiliar(ctx, it.key, R.x + R.w / 2, R.y + R.h / 2, R.w / 22, Game.time || 0, 0, 1); }
    else UI.drawRes(ctx, it.kind === 'candle' ? 'candle' : 'runeshot', R.x + pad, R.y + pad, R.w - 2 * pad);
  },
  // an inked "Sold" stamp across a sold ware's picture
  soldStamp(ctx, R) {
    ctx.save(); ctx.translate(R.x + R.w / 2, R.y + R.h / 2); ctx.rotate(-0.2);
    const s = Math.max(16, Math.min(30, R.w * 0.24)), w = s * 3.6, h = s * 1.5;
    ctx.globalAlpha = 0.85; ctx.strokeStyle = KIT.C.danger; ctx.lineWidth = 2.5; ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.lineWidth = 1; ctx.strokeRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);
    KIT.text(ctx, 'Sold', { x: -w / 2, y: -h / 2, w, h }, { size: s, display: true, color: KIT.C.danger, align: 'center' });
    ctx.restore();
  },
  shardIcon(dim) { return (cx, x, cy, sz) => { if (dim) cx.globalAlpha = 0.45; UI.drawRes(cx, 'shard', x - sz / 2, cy - sz / 2, sz); cx.globalAlpha = 1; }; },
  // the recessed price button on every ware card
  buyButton(ctx, it, id, bR, size) {
    const why = this.buyBlock(it), name = this.info(it).name;
    const trade = !why && it.kind === 'weapon' && this.gunsFull();
    KIT.button(ctx, id, bR, it.sold ? 'Sold' : 'Buy · ' + it.price, {
      variant: 'recess', size: size || 19, sound: false, disabled: !!why, reason: it.sold ? null : why,
      icon: it.sold ? null : this.shardIcon(!!why),
      onClick: () => this.buy(it), onDenied: () => { this.msg = why; },
      // the title + price; when disabled KIT appends the reason in red ink (failures say WHY)
      tip: it.sold ? [{ t: name + ' — sold', c: TIP.ink }, { t: why, c: TIP.faint }]
        : [{ t: 'Buy ' + name, c: TIP.ink }, { t: why ? 'Price ' + it.price + ' shards.' : it.price + ' shards — you have ' + Game.run.shards + '.', c: TIP.body }]
          .concat(trade ? [{ t: 'Every mount and hold slot is full: you will trade one of your guns in.', c: TIP.special }] : []),
    });
    this._cardText(id, bR);
  },
  // records every ware card / text box drawn this frame (regress: nothing overflows its card)
  _cardText(id, r) { (this._layout = this._layout || []).push({ id, r: { x: r.x, y: r.y, w: r.w, h: r.h } }); },
  // ware card frame shared by every layout; returns { sold, hov }
  wareCard(ctx, it, r, cardId, bR) {
    const hov = KIT.hovered(cardId, r);
    KIT.card(ctx, r, { tint: it.sold ? 'rgba(70,46,18,0.20)' : hov ? 'rgba(255,240,205,0.20)' : null });
    if (hov && !KIT.inR(Game.mouse.x, Game.mouse.y, bR)) KIT.tip(this.detailTip(it), Game.mouse.x, Game.mouse.y);
    (this._cards = this._cards || []).push({ id: cardId, r: { x: r.x, y: r.y, w: r.w, h: r.h } });
    return hov;
  },
  T(ctx, cardId, str, r, o) { const res = KIT.text(ctx, str, r, o); (this._texts = this._texts || []).push({ card: cardId, str, r: { x: r.x, y: r.y, w: r.w, h: r.h }, bottom: res.bottom, size: res.size, lines: res.lines }); return res; },
  // TALL weapon card: art across the top, name, the four FTL stats as labelled cells, specials, buy button
  // the art gives up height before any text is cut: the tallest art cell that leaves room for the specials and
  // the flavour line in full (the flavour is dropped, never ellipsized, if even the smallest cell can't fit it)
  weaponArtH(ctx, it, r, bR) {
    const wd = DATA.WEAPONS[it.key];
    bR = bR || { y: r.y + r.h - 16 - 44 };
    const iw0 = r.w - 40, bot0 = bR.y - 8, FIXED = 10 + 22 + 40 + 58 + 10;
    const sp0 = UI.weaponSpecials(wd), so = { size: 16, italic: true, lineGap: 5, minSize: 14 };
    const need = (str) => { if (!str) return 0; for (let sz = 16; sz >= 14; sz--) { const m = KIT.text(ctx, str, { x: 0, y: 0, w: iw0, h: 1e4 }, Object.assign({}, so, { size: sz, fit: 'wrap', measure: true })); if (m.lines) return { h: m.lines.length * (sz + 5) - 5 }; } return 0; };
    const nSp = need(sp0 && this.ucfirst(sp0) + '.'), nDs = need(wd.desc);
    const maxIc = Math.round(Math.min(104, r.h * 0.28));
    let icH = maxIc;
    for (const h of [maxIc, 92, 80, 70, 62]) { if (h > maxIc) continue; icH = h; if (bot0 - (r.y + 16 + h + FIXED) >= (nSp ? nSp.h + 7 : 0) + (nDs ? nDs.h : 0)) break; }
    return icH;
  },
  weaponCard(ctx, it, n, r, icHRow) {
    const wd = DATA.WEAPONS[it.key], cid = 'shop.card.' + n;
    const bR = { x: r.x + 16, y: r.y + r.h - 16 - 44, w: r.w - 32, h: 44 };
    this.wareCard(ctx, it, r, cid, bR);
    const icH = icHRow || this.weaponArtH(ctx, it, r, bR);
    const ic = { x: r.x + 16, y: r.y + 16, w: r.w - 32, h: icH };
    KIT.iconCell(ctx, ic, R => { if (it.sold) ctx.globalAlpha = 0.4; this.drawIcon(ctx, it, R); ctx.globalAlpha = 1; });
    if (it.sold) this.soldStamp(ctx, ic);
    const ix = r.x + 20, iw = r.w - 40;
    let y = ic.y + ic.h + 10;
    this.T(ctx, cid, this.kindLabel(it), { x: ix, y, w: iw, h: 20 }, { size: 14, display: true, color: ShipMenu.QINK, fit: 'ellipsis' }); y += 22;
    this.T(ctx, cid, wd.name, { x: ix, y, w: iw, h: 32 }, { size: 24, display: true, fit: 'shrink', minSize: 15, color: it.sold ? COL.inkfade : COL.inkdk }); y += 40;
    const dmg = (wd.dmg || 0) + (wd.shots > 1 ? ' × ' + wd.shots : '') + (wd.type === 'beam' ? ' / room' : '');
    const stats = [['Charge', wd.charge + 's'], ['Damage', dmg], ['Mana', '' + (wd.power || 0)], ['Type', this.ucfirst(wd.type === 'beam' ? 'beam' : wd.type === 'missile' ? 'torpedo' : wd.type || 'shot')]];
    const sg = 8, sw = (r.w - 32 - sg * 3) / 4;
    stats.forEach((st, i) => {
      const R = { x: r.x + 16 + i * (sw + sg), y, w: sw, h: 58 };
      ctx.fillStyle = 'rgba(70,46,18,0.10)'; ctx.fillRect(R.x, R.y, R.w, R.h);
      ctx.strokeStyle = 'rgba(74,51,24,0.5)'; ctx.strokeRect(R.x + 0.5, R.y + 0.5, R.w - 1, R.h - 1);
      this.T(ctx, cid, st[0], { x: R.x, y: R.y + 5, w: R.w, h: 18 }, { size: 13, display: true, color: COL.inkmd, align: 'center', padX: 4 });
      this.T(ctx, cid, st[1], { x: R.x, y: R.y + 25, w: R.w, h: 28 }, { size: 20, align: 'center', padX: 5, minSize: 12 });
    });
    y += 58 + 10;
    // specials first (red ink), then the flavour line in whatever room is left; the hover tip has it all
    const sp = UI.weaponSpecials(wd), bot = bR.y - 8;
    if (sp && bot - y >= 18) { const t = this.T(ctx, cid, this.ucfirst(sp) + '.', { x: ix, y, w: iw, h: bot - y }, { size: 16, italic: true, color: TIP.special, fit: 'wrap', lineGap: 5, valign: 'top', minSize: 14 }); y = t.bottom + 7; }
    if (wd.desc && bot - y >= 18 && KIT.fits(ctx, wd.desc, { x: ix, y, w: iw, h: bot - y }, { size: 16, italic: true, lineGap: 5, minSize: 14 }))
      this.T(ctx, cid, wd.desc, { x: ix, y, w: iw, h: bot - y }, { size: 16, italic: true, color: COL.inkmd, fit: 'wrap', lineGap: 5, valign: 'top', minSize: 14 });
    this.buyButton(ctx, it, 'shop.buy.' + n, bR, 19);
  },
  // GRID card (crew / augments / systems / familiars): square icon left, kind · name · summary, button bottom-right
  gridCard(ctx, it, n, r, id) {
    const cid = 'shop.card.' + n, BW = Math.min(196, Math.round(r.w * 0.34));
    const bR = { x: r.x + r.w - 16 - BW, y: r.y + r.h - 16 - 44, w: BW, h: 44 };
    this.wareCard(ctx, it, r, cid, bR);
    const tall = r.h >= 220, isz = Math.min(r.h - 32, tall ? 220 : 150), ic = { x: r.x + 16, y: r.y + 16, w: isz, h: isz };
    KIT.iconCell(ctx, ic, R => { if (it.sold) ctx.globalAlpha = 0.4; this.drawIcon(ctx, it, R); ctx.globalAlpha = 1; });
    if (it.sold) this.soldStamp(ctx, ic);
    const tx = ic.x + ic.w + 18, tw = r.x + r.w - 18 - tx;
    const leg = it.kind === 'aug' && DATA.AUGS[it.key].legendary;
    this.T(ctx, cid, this.kindLabel(it), { x: tx, y: r.y + 14, w: tw, h: 20 }, { size: 14, display: true, color: leg ? TIP.special : ShipMenu.QINK, fit: 'ellipsis' });
    this.T(ctx, cid, this.info(it).name, { x: tx, y: r.y + 36, w: tw, h: 32 }, { size: 23, display: true, fit: 'shrink', minSize: 15, color: it.sold ? COL.inkfade : leg ? COL.dkpurple : COL.inkdk });
    const sy = r.y + 74;
    if (tall && it.kind === 'familiar') { // role on its own line, then the flavour across the card above the button
      this.T(ctx, cid, this.famRole(it.key), { x: tx, y: sy, w: tw, h: 24 }, { size: 17, color: TIP.special, fit: 'shrink', minSize: 13 });
      const dh = bR.y - 10 - (sy + 32);
      if (dh >= 18) this.T(ctx, cid, DATA.FAMILIARS[it.key].desc, { x: tx, y: sy + 32, w: tw, h: dh }, { size: 17, italic: true, color: COL.inkmd, fit: 'wrap', lineGap: 6, valign: 'top', minSize: 14 });
    } else {
      // the summary is NEVER cut off: beside the button if it fits there, else across the card above the button
      const so = { size: 16, italic: true, color: COL.inkmd, fit: 'wrap', lineGap: 5, valign: 'top', minSize: 14 };
      const fullW = r.x + r.w - 18 - tx, txt = this.summary(it);
      // short cards: the text runs the full width, and the lines that reach the button row flow around it
      const box = tall ? { x: tx, y: sy, w: fullW, h: bR.y - 10 - sy } : { x: tx, y: sy, w: fullW, h: r.y + r.h - 14 - sy };
      if (!tall) so.notch = { y: bR.y - 6, w: bR.x - 14 - tx };
      if (box.h >= 18) this.T(ctx, cid, txt, box, so);
    }
    this.buyButton(ctx, it, id || 'shop.buy.' + n, bR, 19);
  },
  // ROW card (goods): icon, name over summary, price button on the right
  rowCard(ctx, it, n, r, id) {
    const cid = 'shop.card.' + n, BW = 168;
    const bR = { x: r.x + r.w - 14 - BW, y: r.y + (r.h - 44) / 2, w: BW, h: 44 };
    this.wareCard(ctx, it, r, cid, bR);
    const isz = r.h - 24, ic = { x: r.x + 12, y: r.y + 12, w: isz, h: isz };
    KIT.iconCell(ctx, ic, R => this.drawIcon(ctx, it, R));
    const tx = ic.x + ic.w + 14, tw = bR.x - 12 - tx;
    this.T(ctx, cid, this.info(it).name + (it.kind === 'candle' ? 's' : ''), { x: tx, y: r.y + 10, w: tw, h: 30 }, { size: 21, display: true, fit: 'shrink', minSize: 14 });
    const run = Game.run, have = it.kind === 'candle' ? (run.candles || 0) + ' aboard · deploys familiars' : run.runeshot + ' aboard · bombs & torpedoes';
    this.T(ctx, cid, have, { x: tx, y: r.y + 42, w: tw, h: r.h - 52 }, { size: 16, italic: true, color: COL.inkmd, fit: 'ellipsis' });
    this.buyButton(ctx, it, id, bR, 19);
  },

  // ---------------- render ----------------
  render(ctx) {
    const W = 1920, H = 1080;
    this._cards = []; this._texts = []; this._layout = [];
    KIT.page(ctx, W, H);
    this.renderTabs(ctx);
    ShipMenu.renderTop.call(Object.assign(Object.create(ShipMenu), { TOP_R: { x: 904, y: 16, w: 984, h: 72 } }), ctx);
    if (this.tab === 0) this.renderBuy(ctx);
    else if (this.tab === 1) this.renderSell(ctx);
    else this.renderFamiliars(ctx);
    this.renderFooter(ctx);
    // modals: each KIT dialog scrims (and makes inert) everything drawn before it
    if (this.sellPrompt) { KIT.flushFrames(ctx); this.renderTradePrompt(ctx); }
    if (this.confirmSell) { KIT.flushFrames(ctx); this.renderConfirm(ctx); }
    if (this.showRumors) { KIT.flushFrames(ctx); if (this.loreView) this.renderLore(ctx); else this.renderRumors(ctx); }
    KIT.flushFrames(ctx);
    KIT.flushTip(ctx, W, H);
  },
  renderTabs(ctx) {
    const r = this.TAB_R, n = this.TABS.length, tw = Math.min(272, (r.w - 10 * (n - 1)) / n);
    const ax = r.x + this.tab * (tw + 10), ry = r.y + r.h;
    ctx.fillStyle = 'rgba(60,38,14,0.85)';
    ctx.fillRect(r.x, ry, ax - r.x, 2); ctx.fillRect(ax + tw, ry, 1888 - (ax + tw), 2);
    KIT.tabs(ctx, 'shop.tab', r, this.TABS, this.tab, i => this.setTab(i), { maxW: 272, size: 24 });
  },
  renderFooter(ctx) {
    const y = this.FOOT_Y, h = this.FOOT_H;
    const sail = { x: 1888 - 280, y, w: 280, h }, rum = { x: sail.x - 16 - 220, y, w: 220, h };
    KIT.button(ctx, 'shop.setsail', sail, 'Set Sail', {
      onClick: () => this.leave(), sound: false, size: 26, live: true,
      tip: [{ t: 'Leave port', c: TIP.ink }, { t: 'Back to the chart. Escape also sets sail.', c: TIP.body }],
    });
    KIT.button(ctx, 'shop.rumors', rum, 'Rumours', {
      onClick: () => { this.showRumors = true; this.loreView = null; }, size: 24,
      tip: [{ t: 'Tavern talk', c: TIP.ink }, { t: 'What the lookouts saw and what the old salts swear by.', c: TIP.body }],
    });
    const mr = { x: 32, y, w: rum.x - 32 - 32, h };
    const quip = this.QUIPS[Game.run.region] || this.QUIPS[0];
    if (this.msg) KIT.text(ctx, this.msg, mr, { size: 22, color: COL.inkdk, fit: 'ellipsis' });
    else KIT.text(ctx, '“' + quip + '”', mr, { size: 21, italic: true, color: COL.inklt, fit: 'ellipsis' });
  },

  // ---------------- BUY ----------------
  renderBuy(ctx) {
    const run = Game.run, reg = DATA.REGIONS[run.region], ship = Game.ship;
    const X = this.LEFT_X, W = this.LEFT_W;
    // ---- Merchant ----
    const MP = { x: X, y: this.BODY_Y, w: W, h: 268 };
    let c = KIT.panel(ctx, MP, { wood: true, title: 'Merchant' });
    {
      const r = { x: c.x, y: c.y, w: c.w, h: c.h };
      KIT.card(ctx, r);
      const mRace = DATA.RACE_CREW[reg.race] || 'human', pk = reg.race === 'armada' ? 'admiral' : mRace;
      const ic = { x: r.x + 16, y: r.y + 16, w: 112, h: 112 };
      KIT.iconCell(ctx, ic, R => { if (!this.artFit(ctx, 'portrait_' + pk, R, 3)) ctx.drawImage(SPR.portrait(mRace), R.x + 8, R.y + 8, R.w - 16, R.h - 16); });
      const node = run.map && run.map.nodes ? run.map.nodes[run.nodeId] : null;
      const tx = ic.x + ic.w + 18, tw = r.x + r.w - 18 - tx;
      KIT.text(ctx, 'Trading post', { x: tx, y: r.y + 18, w: tw, h: 20 }, { size: 14, display: true, color: ShipMenu.QINK });
      KIT.text(ctx, (node && node.name) || 'The Harbor', { x: tx, y: r.y + 40, w: tw, h: 34 }, { size: 26, display: true, fit: 'shrink', minSize: 16 });
      KIT.text(ctx, reg.name + ' · ' + (DATA.RACES[mRace] ? DATA.RACES[mRace].name + ' merchant' : 'merchant'), { x: tx, y: r.y + 78, w: tw, h: 26 }, { size: 18, italic: true, color: COL.inkmd, fit: 'ellipsis' });
      KIT.rule(ctx, r.x + 16, ic.y + ic.h + 10, r.x + r.w - 16);
      const by = ic.y + ic.h + 18;
      KIT.text(ctx, reg.desc, { x: r.x + 18, y: by, w: r.w - 36, h: r.y + r.h - 12 - by }, { size: 18, italic: true, color: COL.inklt, fit: 'wrap', lineGap: 6, valign: 'middle', minSize: 14 });
    }
    // ---- Goods ----
    const GP = { x: X, y: MP.y + MP.h + 16, w: W, h: 52 + 2 * 92 + 12 + 16 };
    c = KIT.panel(ctx, GP, { wood: true, title: 'Goods' });
    ShipMenu.bandNote(ctx, GP, 'restocked every visit', 240);
    const rune = this.stock.find(s => s.kind === 'rune'), candle = this.stock.find(s => s.kind === 'candle');
    if (rune) this.rowCard(ctx, rune, this.stock.indexOf(rune), { x: c.x, y: c.y, w: c.w, h: 92 }, 'shop.goods.runeshot');
    if (candle) this.rowCard(ctx, candle, this.stock.indexOf(candle), { x: c.x, y: c.y + 104, w: c.w, h: 92 }, 'shop.goods.candle');
    // ---- Repair ----
    const RP = { x: X, y: GP.y + GP.h + 16, w: W, h: this.BODY_Y + this.BODY_H - (GP.y + GP.h + 16) };
    c = KIT.panel(ctx, RP, { wood: true, title: 'Repair' });
    {
      const r = { x: c.x, y: c.y, w: c.w, h: c.h };
      KIT.card(ctx, r);
      const missing = ship.hullMax - ship.hull, rp = this.repairCost(), hf = ship.hull / Math.max(1, ship.hullMax);
      const ic = { x: r.x + 16, y: r.y + 16, w: 64, h: 64 };
      KIT.iconCell(ctx, ic, R => drawSysSym(ctx, 'hull', R.x + 8, R.y + 8, R.w - 16, COL.inkdk));
      const tx = ic.x + ic.w + 16, tw = r.x + r.w - 18 - tx;
      KIT.text(ctx, 'Hull ' + ship.hull + ' / ' + ship.hullMax, { x: tx, y: r.y + 14, w: tw * 0.6, h: 30 }, { size: 22, display: true });
      KIT.text(ctx, missing ? rp + ' shards a point' : 'Sound', { x: tx + tw * 0.6, y: r.y + 14, w: tw * 0.4, h: 30 }, { size: 17, italic: true, color: missing ? COL.inkmd : KIT.C.action, align: 'right', fit: 'shrink' });
      KIT.bar(ctx, tx, r.y + 54, tw, 14, hf, Game.hullBarColor(hf));
      ctx.strokeStyle = 'rgba(58,41,18,0.75)'; ctx.strokeRect(tx - 0.5, r.y + 53.5, tw + 1, 15);
      const canAll = Math.min(missing, Math.floor(run.shards / rp));
      const noneWhy = !missing ? 'Your hull is sound — nothing to patch.' : run.shards < rp ? 'Needs ' + (rp - run.shards) + ' more shards — a point costs ' + rp + '.' : null;
      const bw = (r.w - 32 - 12) / 2, by = r.y + r.h - 16 - 48;
      KIT.button(ctx, 'shop.repair.one', { x: r.x + 16, y: by, w: bw, h: 48 }, 'Fix 1 · ' + rp, {
        variant: 'recess', size: 19, sound: false, disabled: !!noneWhy, reason: noneWhy, icon: this.shardIcon(!!noneWhy),
        onClick: () => this.repairOne(), onDenied: () => { this.msg = noneWhy; },
        tip: [{ t: 'Patch one hull point', c: TIP.ink }, { t: rp + ' shards.', c: TIP.body }],
      });
      KIT.button(ctx, 'shop.repair.all', { x: r.x + 16 + bw + 12, y: by, w: bw, h: 48 }, !missing ? 'Fix all' : canAll && canAll < missing ? 'Fix ' + canAll + ' of ' + missing + ' · ' + canAll * rp : 'Fix all · ' + missing * rp, {
        variant: 'recess', size: 19, sound: false, disabled: !!noneWhy, reason: noneWhy, icon: this.shardIcon(!!noneWhy),
        onClick: () => this.repairAll(), onDenied: () => { this.msg = noneWhy; },
        tip: [{ t: canAll < missing ? 'Patch what you can afford' : 'Patch the whole hull', c: TIP.ink }, { t: canAll + ' of ' + missing + ' missing point' + (missing === 1 ? '' : 's') + ' for ' + canAll * rp + ' shards.', c: TIP.body }],
      });
      const cy = r.y + 80, chh = by - 8 - cy;
      if (chh >= 20) KIT.text(ctx, !missing ? 'The shipwrights find nothing to mend.' : missing + ' point' + (missing === 1 ? '' : 's') + ' of hull missing. The shipwrights will patch what you pay for.', { x: r.x + 18, y: cy, w: r.w - 36, h: chh }, { size: 17, italic: true, color: COL.inklt, fit: 'wrap', lineGap: 5, minSize: 14 });
    }

    // ---- right: Armaments + Crew · Augments · Systems ----
    const weapons = this.stock.filter(s => s.kind === 'weapon');
    const others = this.stock.filter(s => s.kind === 'aug' || s.kind === 'crew' || s.kind === 'system');
    const AP = { x: this.RIGHT_X, y: this.BODY_Y, w: this.RIGHT_W, h: 448 };
    c = KIT.panel(ctx, AP, { wood: true, title: 'Armaments', titleRightW: 560 });
    ShipMenu.bandNote(ctx, AP, this.gunsFull() ? 'Mounts and hold are full — buying trades a gun in' : 'Hover a gun for its full specification', 540);
    {
      const n = Math.max(3, weapons.length), gap = 16, cw = (c.w - gap * (n - 1)) / n;
      // one art height for the whole row, so names and stat cells line up across the cards
      const wR = i => ({ x: c.x + i * (cw + gap), y: c.y, w: cw, h: c.h });
      const rowIc = Math.min(...weapons.map((it, i) => this.weaponArtH(ctx, it, wR(i))));
      weapons.forEach((it, i) => this.weaponCard(ctx, it, this.stock.indexOf(it), wR(i), rowIc));
      if (!weapons.length) KIT.text(ctx, 'The gunsmith is out of stock.', c, { size: 20, italic: true, color: KIT.C.onWoodMuted, align: 'center' });
    }
    const OP = { x: this.RIGHT_X, y: AP.y + AP.h + 16, w: this.RIGHT_W, h: this.BODY_Y + this.BODY_H - (AP.y + AP.h + 16) };
    c = KIT.panel(ctx, OP, { wood: true, title: 'Crew · Augments · Systems', titleRightW: 520 });
    ShipMenu.bandNote(ctx, OP, 'Berths ' + ship.aliveCrew().length + '/8 · Augments ' + run.augs.length + '/3 · Mounts ' + this.advInstalled() + '/' + DATA.OPEN_MOUNTS, 500);
    {
      const cols = 2, rows = Math.max(2, Math.ceil(others.length / cols)), gap = 12;
      const cw = (c.w - gap) / cols, ch = (c.h - gap * (rows - 1)) / rows;
      others.forEach((it, i) => this.gridCard(ctx, it, this.stock.indexOf(it), { x: c.x + (i % cols) * (cw + gap), y: c.y + Math.floor(i / cols) * (ch + gap), w: cw, h: ch }));
    }
  },

  // ---------------- SELL ----------------
  sellValue(kind, key) { return Math.floor((kind === 'aug' ? DATA.AUGS[key].cost : kind === 'familiar' ? DATA.FAMILIARS[key].cost : DATA.WEAPONS[key].cost) / 2); },
  askSell(name, value, doFn, icon) { this.confirmSell = { name, value, do: doFn, icon }; },
  sellGunAsk(from, idx) {
    const key = from === 'mount' ? Game.ship.weapons[idx].key : Game.run.cargo[idx];
    this.askSell(DATA.WEAPONS[key].name, UI.sellWeaponValue(key), () => {
      const sold = UI.sellWeapon(from, idx); this.msg = 'Sold the ' + DATA.WEAPONS[sold.key].name + ' for ' + sold.value + ' shards.'; this.sellSel = -1;
    }, { kind: 'weapon', key });
  },
  sellAugAsk(idx) {
    const key = Game.run.augs[idx];
    this.askSell(DATA.AUGS[key].name, this.sellValue('aug', key), () => {
      const sold = UI.sellAug(idx); this.msg = 'Sold ' + DATA.AUGS[sold.key].name + ' for ' + sold.value + ' shards.';
    }, { kind: 'aug', key });
  },
  pickSlot(i) {
    const slots = UI.loadoutSlots();
    if (this.sellSel === -1) {
      if (slots[i].key) { this.sellSel = i; AUDIO.sfx('click'); }
      else { this.msg = 'That slot is empty — pick a gun first, then click here.'; AUDIO.sfx('deny'); }
    } else if (this.sellSel === i) { this.sellSel = -1; AUDIO.sfx('back'); }
    else { UI.loadoutSwap(this.sellSel, i); this.sellSel = -1; this.msg = 'Rigging adjusted.'; AUDIO.sfx('click'); }
  },
  sellButton(ctx, entry, bR, name) {
    const n = this._sellList.length, id = 'shop.sell.' + n;
    this._sellList.push(Object.assign({ id }, entry));
    KIT.button(ctx, id, bR, 'Sell · ' + entry.value, {
      variant: 'recess', size: 18, sound: 'click', icon: this.shardIcon(false), onClick: entry.ask,
      tip: [{ t: 'Sell ' + name, c: TIP.ink }, { t: 'Half its price: +' + entry.value + ' shards. You will be asked to confirm.', c: TIP.body }],
    });
    this._cardText(id, bR);
  },
  // a gun in a loadout slot (click the card to select / swap; Sell on the button)
  gunSlotCard(ctx, s, i, r) {
    const id = 'shop.slot.' + i, sel = this.sellSel === i, hov = KIT.hovered(id, r);
    if (hov) Game.hot = true;
    KIT.reg(id, r, { onClick: () => this.pickSlot(i), sound: false });
    const tag = (s.kind === 'mount' ? 'Mount ' : 'Hold ') + (s.i + 1);
    (this._cards = this._cards || []).push({ id, r: { x: r.x, y: r.y, w: r.w, h: r.h } });
    if (!s.key) {
      const target = this.sellSel !== -1;
      KIT.card(ctx, r, { tint: target && hov ? 'rgba(47,138,114,0.14)' : 'rgba(70,46,18,0.20)', studs: false });
      ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = 'rgba(74,51,24,0.55)'; ctx.lineWidth = 1.5;
      UI.roundRect(ctx, r.x + 12, r.y + 12, r.w - 24, r.h - 24, 6); ctx.stroke(); ctx.restore();
      this.T(ctx, id, s.kind === 'mount' ? 'Empty mount' : 'Empty hold', { x: r.x + 24, y: r.y + r.h / 2 - 32, w: r.w - 48, h: 32 }, { size: 21, display: true, color: COL.inkfade, align: 'center' });
      this.T(ctx, id, target ? 'Click to move the selected gun here' : tag + ' · tap a gun, then here, to move it', { x: r.x + 24, y: r.y + r.h / 2 + 4, w: r.w - 48, h: 26 }, { size: 16, italic: true, color: target ? KIT.C.action : COL.inklt, align: 'center', fit: 'ellipsis' });
      return;
    }
    const wd = DATA.WEAPONS[s.key];
    KIT.card(ctx, r, { tint: sel ? 'rgba(47,138,114,0.14)' : hov ? 'rgba(255,240,205,0.20)' : null, edge: sel ? KIT.C.action : null });
    if (sel) { ctx.strokeStyle = KIT.C.actionHi; ctx.lineWidth = 3; UI.roundRect(ctx, r.x + 1.5, r.y + 1.5, r.w - 3, r.h - 3, 6); ctx.stroke(); ctx.lineWidth = 1; }
    const iw = Math.min(176, Math.round(r.w * 0.3)), ic = { x: r.x + 16, y: r.y + 16, w: iw, h: r.h - 32 - 30 };
    KIT.iconCell(ctx, ic, R => ShipMenu.drawWeaponArt(ctx, s.key, R));
    this.T(ctx, id, sel ? 'Selected' : tag, { x: ic.x, y: ic.y + ic.h + 4, w: ic.w, h: 24 }, { size: 16, italic: !sel, display: sel, color: sel ? KIT.C.action : COL.inklt, align: 'center' });
    const tx = ic.x + ic.w + 18, tw = r.x + r.w - 16 - tx;
    this.T(ctx, id, wd.name, { x: tx, y: r.y + 14, w: tw, h: 32 }, { size: 22, display: true, fit: 'shrink', minSize: 15 });
    this.T(ctx, id, ShipMenu.weaponLine(wd), { x: tx, y: r.y + 48, w: tw, h: 24 }, { size: 16, color: COL.inkmd, fit: 'shrink', minSize: 13 });
    const val = UI.sellWeaponValue(s.key), bR = { x: r.x + r.w - 16 - 160, y: r.y + r.h - 16 - 42, w: 160, h: 42 };
    const sp = UI.weaponSpecials(wd), th = bR.y - 8 - (r.y + 78);
    if (th >= 18) this.T(ctx, id, sp ? this.ucfirst(sp) + '.' : (wd.desc || ''), { x: tx, y: r.y + 78, w: tw, h: th }, { size: 15, italic: true, color: sp ? TIP.special : COL.inkmd, fit: 'wrap', maxLines: 2, lineGap: 4, valign: 'top', minSize: 13 });
    this.sellButton(ctx, { kind: 'weapon', from: s.kind, idx: s.i, key: s.key, value: val, ask: () => this.sellGunAsk(s.kind, s.i) }, bR, wd.name);
    if (hov && !KIT.inR(Game.mouse.x, Game.mouse.y, bR)) {
      const lines = ShipMenu.weaponTip(s.key);
      if (this.sellSel !== -1 && !sel) { const sk = UI.loadoutSlots()[this.sellSel].key; if (sk) lines.unshift({ t: 'Click to swap with the ' + DATA.WEAPONS[sk].name, c: TIP.action }); }
      KIT.tip(lines, Game.mouse.x, Game.mouse.y);
    }
  },
  // an owned augment or familiar with a Sell button
  ownedCard(ctx, kind, key, r, value, ask, cardId) {
    const hov = KIT.hovered(cardId, r);
    KIT.card(ctx, r, { tint: hov ? 'rgba(255,240,205,0.20)' : null });
    (this._cards = this._cards || []).push({ id: cardId, r: { x: r.x, y: r.y, w: r.w, h: r.h } });
    const it = { kind, key }, name = this.info(it).name;
    const leg = kind === 'aug' && DATA.AUGS[key].legendary;
    const desc = kind === 'aug' ? this.augDesc(key) : this.famRole(key) + '.';
    let bR;
    if (r.h >= 250) { // tall: a plaque — picture across the top, name and effect centred, Sell beneath
      bR = { x: r.x + (r.w - 180) / 2, y: r.y + r.h - 16 - 42, w: 180, h: 42 };
      const ic = { x: r.x + 16, y: r.y + 16, w: r.w - 32, h: Math.min(132, Math.round(r.h * 0.42)) };
      KIT.iconCell(ctx, ic, R => this.drawIcon(ctx, it, R));
      let y = ic.y + ic.h + 12;
      if (leg) { this.T(ctx, cardId, 'Legendary', { x: r.x + 16, y, w: r.w - 32, h: 20 }, { size: 14, display: true, color: TIP.special, align: 'center' }); y += 22; }
      this.T(ctx, cardId, name, { x: r.x + 16, y, w: r.w - 32, h: 32 }, { size: 22, display: true, fit: 'shrink', minSize: 14, align: 'center', color: leg ? COL.dkpurple : COL.inkdk }); y += 38;
      const dh = bR.y - 10 - y;
      if (dh >= 18) this.T(ctx, cardId, desc, { x: r.x + 22, y, w: r.w - 44, h: dh }, { size: 17, italic: true, color: COL.inkmd, fit: 'wrap', lineGap: 5, valign: 'top', align: 'center', minSize: 13 });
    } else {
      bR = { x: r.x + r.w - 16 - 160, y: r.y + r.h - 16 - 42, w: 160, h: 42 };
      const isz = Math.min(r.h - 32, 112), ic = { x: r.x + 16, y: r.y + 16, w: isz, h: isz };
      KIT.iconCell(ctx, ic, R => this.drawIcon(ctx, it, R));
      const tx = ic.x + ic.w + 16, tw = r.x + r.w - 16 - tx;
      this.T(ctx, cardId, name, { x: tx, y: r.y + 14, w: tw, h: 30 }, { size: 21, display: true, fit: 'shrink', minSize: 14, color: leg ? COL.dkpurple : COL.inkdk });
      const dh = bR.y - 8 - (r.y + 50);
      if (dh >= 18) this.T(ctx, cardId, desc, { x: tx, y: r.y + 50, w: tw, h: dh }, { size: 16, italic: true, color: COL.inkmd, fit: 'wrap', lineGap: 4, valign: 'top', minSize: 13 });
    }
    if (kind === 'aug') this.sellButton(ctx, { kind, idx: Game.run.augs.indexOf(key), key, value, ask }, bR, name);
    else { KIT.button(ctx, 'shop.fam.sell.' + (Game.run.familiars || []).indexOf(key), bR, 'Sell · ' + value, { variant: 'recess', size: 18, sound: 'click', icon: this.shardIcon(false), onClick: ask, tip: [{ t: 'Release ' + name, c: TIP.ink }, { t: 'Half its price: +' + value + ' shards. You will be asked to confirm.', c: TIP.body }] }); this._cardText('shop.fam.sell', bR); }
    if (hov && !KIT.inR(Game.mouse.x, Game.mouse.y, bR)) KIT.tip(this.detailTip(it).filter(l => !/^Price /.test(l.t)).concat([{ t: 'Sells for ' + value + ' shards (half price).', c: TIP.action }]), Game.mouse.x, Game.mouse.y);
  },
  emptySlot(ctx, r, label) {
    KIT.card(ctx, r, { tint: 'rgba(70,46,18,0.20)', studs: false });
    ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = 'rgba(74,51,24,0.55)'; ctx.lineWidth = 1.5;
    UI.roundRect(ctx, r.x + 10, r.y + 10, r.w - 20, r.h - 20, 6); ctx.stroke(); ctx.restore();
    KIT.text(ctx, label, { x: r.x + 20, y: r.y, w: r.w - 40, h: r.h }, { size: 18, italic: true, color: COL.inklt, align: 'center', fit: 'ellipsis' });
  },
  renderSell(ctx) {
    this._sellList = [];
    const slots = UI.loadoutSlots(), augs = Game.run.augs;
    const P = { x: 32, y: this.BODY_Y, w: this.WIDE_W, h: this.BODY_H };
    const c = KIT.panel(ctx, P, { wood: true, title: 'Equipped', titleRightW: 600 });
    ShipMenu.bandNote(ctx, P, this.sellSel >= 0 ? 'Now click another slot to swap — or the same one to cancel' : 'The merchant pays half price · click two guns to swap them', 590);
    const LBL = 28, gap = 16, cw = (c.w - gap) / 2;
    const mounts = slots.filter(s => s.kind === 'mount'), rowsM = Math.ceil(mounts.length / 2);
    const AH = 220, avail = c.h - 2 * (LBL + 10) - gap - AH - (rowsM - 1) * gap;
    const ch = Math.min(184, Math.floor(avail / rowsM));
    let y = c.y;
    ShipMenu.woodLabel(ctx, { x: c.x, y, w: c.w, h: LBL }, 'Mounted Guns', 'fire in battle · drawn from Weapons power');
    y += LBL + 10;
    slots.forEach((s, i) => { if (s.kind === 'mount') this.gunSlotCard(ctx, s, i, { x: c.x + (s.i % 2) * (cw + gap), y: y + Math.floor(s.i / 2) * (ch + gap), w: cw, h: ch }); });
    y += rowsM * (ch + gap);
    ShipMenu.woodLabel(ctx, { x: c.x, y, w: c.w, h: LBL }, 'Augments', augs.length + ' of 3 slots · effects end when sold');
    y += LBL + 10;
    const aw = (c.w - 2 * gap) / 3, ah = c.y + c.h - y;
    for (let i = 0; i < 3; i++) {
      const r = { x: c.x + i * (aw + gap), y, w: aw, h: ah };
      if (augs[i]) { const key = augs[i]; this.ownedCard(ctx, 'aug', key, r, this.sellValue('aug', key), () => this.sellAugAsk(i), 'shop.augcard.' + i); }
      else this.emptySlot(ctx, r, 'Empty augment slot');
    }
    // right: the hold
    const Q = { x: this.SIDE_X, y: this.BODY_Y, w: this.SIDE_W, h: this.BODY_H };
    const q = KIT.panel(ctx, Q, { wood: true, title: 'In the Hold', titleRightW: 260 });
    const cargo = slots.filter(s => s.kind === 'cargo');
    ShipMenu.bandNote(ctx, Q, Game.run.cargo.length + ' of ' + cargo.length + ' berths', 240);
    let yy = q.y;
    ShipMenu.woodLabel(ctx, { x: q.x, y: yy, w: q.w, h: LBL }, 'Spare Guns', 'ride below, never fire');
    yy += LBL + 10;
    slots.forEach((s, i) => { if (s.kind === 'cargo') { this.gunSlotCard(ctx, s, i, { x: q.x, y: yy, w: q.w, h: ch }); yy += ch + gap; } });
    // a merchant's ledger note fills the rest of the column
    const nr = { x: q.x, y: yy, w: q.w, h: q.y + q.h - yy };
    if (nr.h > 80) {
      KIT.card(ctx, nr);
      const ix = nr.x + 22, iw = nr.w - 44;
      let ty = nr.y + 18;
      KIT.text(ctx, 'The merchant’s terms', { x: ix, y: ty, w: iw, h: 24 }, { size: 17, display: true, color: COL.inkmd }); ty += 34;
      const terms = ['Every gun, augment and familiar sells for half its price.', 'Mounted guns fire in battle; the hold carries two spares. Click a gun, then another slot, to swap them.', 'Crew are signed off on the Ship screen, not sold.'];
      for (const t of terms) {
        const n = Math.min(3, TYPE.wrap(ctx, t, iw - 16, 17, { italic: true }).length), hh = n * 24;
        if (ty + hh > nr.y + nr.h - 14) break;
        ctx.fillStyle = COL.brassdk; ctx.beginPath(); ctx.arc(ix + 4, ty + 11, 3, 0, 7); ctx.fill();
        KIT.text(ctx, t, { x: ix + 16, y: ty, w: iw - 16, h: hh }, { size: 17, italic: true, color: COL.inklt, fit: 'wrap', valign: 'top', lineGap: 7 });
        ty += hh + 12;
      }
      // what the merchant would pay for everything aboard
      const worth = Game.ship.weapons.reduce((a, w) => a + UI.sellWeaponValue(w.key), 0) + Game.run.cargo.reduce((a, k) => a + UI.sellWeaponValue(k), 0) + augs.reduce((a, k) => a + this.sellValue('aug', k), 0);
      const fy = nr.y + nr.h - 16 - 56;
      if (fy > ty) {
        KIT.rule(ctx, nr.x + 16, fy - 8, nr.x + nr.w - 16);
        UI.drawRes(ctx, 'shard', ix, fy + 10, 36);
        KIT.text(ctx, 'Your guns and augments would fetch ' + worth + ' shards in all.', { x: ix + 50, y: fy, w: iw - 50, h: 56 }, { size: 18, color: COL.inkdk, fit: 'wrap', maxLines: 2, lineGap: 4 });
      }
    }
  },

  // ---------------- FAMILIARS ----------------
  renderFamiliars(ctx) {
    const ship = Game.ship, run = Game.run, shrine = ship.sysLv.shrine > 0;
    const forSale = this.stock.filter(s => s.kind === 'familiar'), owned = run.familiars || [];
    const P = { x: 32, y: this.BODY_Y, w: this.WIDE_W, h: this.BODY_H };
    const c = KIT.panel(ctx, P, { wood: true, title: 'Carved Vessels for Sale', titleRightW: 600 });
    ShipMenu.bandNote(ctx, P, shrine ? 'Bound at your Binding Shrine · 3 at most' : 'Needs a Binding Shrine aboard to bind', 590);
    const CH = 112, gap = 16, gridH = c.h - CH - 16 - 28 - 10;
    const rows = Math.max(2, Math.ceil(forSale.length / 2)), cw = (c.w - gap) / 2, ch = (gridH - gap * (rows - 1)) / rows;
    forSale.forEach((it, i) => this.gridCard(ctx, it, this.stock.indexOf(it), { x: c.x + (i % 2) * (cw + gap), y: c.y + Math.floor(i / 2) * (ch + gap), w: cw, h: ch }, 'shop.fam.buy.' + i));
    if (!forSale.length) KIT.text(ctx, 'The vessels are all spoken for.', { x: c.x, y: c.y, w: c.w, h: gridH }, { size: 22, italic: true, color: KIT.C.onWoodMuted, align: 'center' });
    let y = c.y + gridH + 16;
    ShipMenu.woodLabel(ctx, { x: c.x, y, w: c.w, h: 28 }, 'Seance Candles', 'each orbiting familiar burns one to deploy and one to re-bind');
    y += 38;
    const candle = this.stock.find(s => s.kind === 'candle');
    if (candle) this.rowCard(ctx, candle, this.stock.indexOf(candle), { x: c.x, y, w: c.w, h: c.y + c.h - y }, 'shop.fam.candle');
    // right: bound aboard
    const Q = { x: this.SIDE_X, y: this.BODY_Y, w: this.SIDE_W, h: this.BODY_H };
    const q = KIT.panel(ctx, Q, { wood: true, title: 'Bound Aboard', titleRightW: 200 });
    ShipMenu.bandNote(ctx, Q, owned.length + ' of 3', 180);
    const sh = 150;
    let yy = q.y;
    for (let i = 0; i < 3; i++) {
      const r = { x: q.x, y: yy, w: q.w, h: sh };
      if (owned[i]) { const key = owned[i], val = this.sellValue('familiar', key); this.ownedCard(ctx, 'familiar', key, r, val, () => this.askSell('Release ' + DATA.FAMILIARS[key].name, val, () => { const sold = UI.sellFamiliar(i); this.msg = 'Released the ' + DATA.FAMILIARS[sold.key].name + ' (+' + sold.value + ' shards).'; }, { kind: 'familiar', key }), 'shop.famcard.' + i); }
      else this.emptySlot(ctx, r, shrine ? 'Empty binding — buy a vessel to fill it' : 'Empty binding');
      yy += sh + 12;
    }
    // the shrine's state, and why familiars sleep without it (failures say WHY)
    const nr = { x: q.x, y: yy + 4, w: q.w, h: q.y + q.h - yy - 4 };
    KIT.card(ctx, nr, { tint: shrine ? null : 'rgba(143,35,22,0.08)', edge: shrine ? null : 'rgba(143,35,22,0.7)' });
    const ic = { x: nr.x + 18, y: nr.y + 18, w: 84, h: 84 };
    KIT.iconCell(ctx, ic, R => { if (!shrine) ctx.globalAlpha = 0.5; drawSysSym(ctx, 'shrine', R.x + 8, R.y + 8, R.w - 16, COL.inkdk); ctx.globalAlpha = 1; });
    const tx = ic.x + ic.w + 16, tw = nr.x + nr.w - 18 - tx;
    KIT.text(ctx, shrine ? 'Binding Shrine · Lv ' + ship.sysLv.shrine : 'No Binding Shrine', { x: tx, y: nr.y + 18, w: tw, h: 30 }, { size: 21, display: true, color: shrine ? COL.inkdk : KIT.C.danger, fit: 'shrink', minSize: 14 });
    const msg = shrine ? 'Each powered shrine bar wakes one familiar. You hold ' + (run.candles || 0) + ' Seance Candles.'
      : 'Familiars cannot be bound or woken without one. Buy a Binding Shrine when a harbor sells it (Buy tab, Systems).';
    KIT.text(ctx, msg, { x: tx, y: nr.y + 52, w: tw, h: 50 }, { size: 16, italic: true, color: shrine ? COL.inkmd : TIP.special, fit: 'wrap', valign: 'top', lineGap: 5, minSize: 13, maxLines: 2 });
    // the binding ledger: how the bound spirits will cost you at sea
    const orbit = owned.filter(k => DATA.FAMILIARS[k].role === 'attack' || DATA.FAMILIARS[k].role === 'boarder').length;
    const facts = [
      ['Woken now', shrine ? Math.min(owned.length, ship.sysLv.shrine) + ' of ' + owned.length + ' bound' : 'none — no shrine'],
      ['Orbiting the enemy', orbit + (orbit === 1 ? ' familiar' : ' familiars') + ' · 1 candle each to deploy'],
      ['Guarding your hull', (owned.length - orbit) + ' · free to keep'],
      ['Seance Candles', (run.candles || 0) + ' aboard'],
    ];
    let fy = ic.y + ic.h + 18;
    KIT.rule(ctx, nr.x + 16, fy - 8, nr.x + nr.w - 16);
    for (const [k, v] of facts) {
      if (fy + 30 > nr.y + nr.h - 12) break;
      KIT.text(ctx, k, { x: nr.x + 22, y: fy, w: 220, h: 30 }, { size: 16, display: true, color: COL.inkmd });
      KIT.text(ctx, v, { x: nr.x + 250, y: fy, w: nr.w - 272, h: 30 }, { size: 17, color: COL.inkdk, fit: 'shrink', minSize: 13 });
      fy += 36;
    }
  },

  // ---------------- modal dialogs ----------------
  // trade-in: buying a gun with every mount and hold slot full
  renderTradePrompt(ctx) {
    const it = this.sellPrompt.item, wd0 = DATA.WEAPONS[it.key];
    KIT.scrim(ctx, 1920, 1080, 0.62);
    const guns = Game.ship.weapons.map((w, i) => ({ from: 'mount', idx: i, key: w.key })).concat(Game.run.cargo.map((k, i) => ({ from: 'cargo', idx: i, key: k })));
    const RH = 88, gap = 10, W = 1160, inner = W - 32;
    const H = 52 + 132 + 16 + 40 + guns.length * (RH + gap) - gap + 16 + 56 + 16;
    const P = { x: (1920 - W) / 2, y: Math.max(40, (1080 - H) / 2), w: W, h: H };
    const c = KIT.panel(ctx, P, { wood: true, title: 'Gun Deck Full — Trade One In', titleRightW: 380 });
    ShipMenu.bandNote(ctx, P, 'Every mount and hold slot is taken', 370);
    // the newcomer
    const nr = { x: c.x, y: c.y, w: inner, h: 132 };
    KIT.card(ctx, nr, { tint: 'rgba(212,160,48,0.10)', edge: COL.golddk });
    const ic = { x: nr.x + 16, y: nr.y + 16, w: 180, h: 100 };
    KIT.iconCell(ctx, ic, R => ShipMenu.drawWeaponArt(ctx, it.key, R));
    const tx = ic.x + ic.w + 20, tw = nr.x + nr.w - 20 - 200 - tx;
    KIT.text(ctx, 'Buying', { x: tx, y: nr.y + 16, w: tw, h: 20 }, { size: 14, display: true, color: ShipMenu.QINK });
    KIT.text(ctx, wd0.name, { x: tx, y: nr.y + 38, w: tw, h: 34 }, { size: 26, display: true, fit: 'shrink', minSize: 15 });
    KIT.text(ctx, ShipMenu.weaponLine(wd0), { x: tx, y: nr.y + 76, w: tw, h: 26 }, { size: 17, color: COL.inkmd, fit: 'shrink', minSize: 13 });
    UI.drawRes(ctx, 'shard', nr.x + nr.w - 200, nr.y + 46, 40);
    KIT.text(ctx, '−' + it.price, { x: nr.x + nr.w - 152, y: nr.y + 30, w: 132, h: 72 }, { size: 32, color: KIT.C.danger });
    let y = c.y + 132 + 16;
    ShipMenu.woodLabel(ctx, { x: c.x, y, w: inner, h: 28 }, 'Sell One of Yours', 'it goes for half its price; the new gun takes its place');
    y += 40;
    guns.forEach((g, i) => {
      const r = { x: c.x, y, w: inner, h: RH }, wd = DATA.WEAPONS[g.key], val = UI.sellWeaponValue(g.key);
      KIT.card(ctx, r, { studs: false });
      const gi = { x: r.x + 12, y: r.y + 12, w: 112, h: RH - 24 };
      KIT.iconCell(ctx, gi, R => ShipMenu.drawWeaponArt(ctx, g.key, R));
      const bR = { x: r.x + r.w - 16 - 220, y: r.y + (RH - 46) / 2, w: 220, h: 46 };
      const x2 = gi.x + gi.w + 18, w2 = bR.x - 16 - x2;
      KIT.text(ctx, wd.name, { x: x2, y: r.y + 10, w: w2 * 0.62, h: 34 }, { size: 22, display: true, fit: 'shrink', minSize: 14 });
      KIT.text(ctx, (g.from === 'mount' ? 'Mount ' : 'Hold ') + (g.idx + 1), { x: x2 + w2 * 0.62, y: r.y + 10, w: w2 * 0.38, h: 34 }, { size: 16, italic: true, color: COL.inklt, align: 'right' });
      KIT.text(ctx, ShipMenu.weaponLine(wd), { x: x2, y: r.y + 46, w: w2, h: 28 }, { size: 16, color: COL.inkmd, fit: 'shrink', minSize: 13 });
      KIT.button(ctx, 'shop.trade.' + i, bR, 'Trade · +' + val, {
        variant: 'recess', size: 18, sound: false, icon: this.shardIcon(false), onClick: () => this.trade(g.from, g.idx),
        tip: [{ t: 'Trade the ' + wd.name + ' in', c: TIP.ink }, { t: 'Sold for +' + val + ' shards; the ' + wd0.name + ' (−' + it.price + ') takes its place.', c: TIP.body }],
      });
      y += RH + gap;
    });
    KIT.button(ctx, 'shop.trade.cancel', { x: P.x + (W - 300) / 2, y: P.y + P.h - 16 - 56, w: 300, h: 56 }, 'Keep my guns', {
      onClick: () => { this.sellPrompt = null; this.msg = 'Kept your guns.'; }, sound: 'back', size: 22,
      tip: [{ t: 'Cancel the purchase', c: TIP.ink }, { t: 'Nothing is bought or sold.', c: TIP.body }],
    });
  },
  // confirm guard: one click never dumps a gun / augment / familiar
  renderConfirm(ctx) {
    const cs = this.confirmSell;
    KIT.scrim(ctx, 1920, 1080, 0.62);
    const P = { x: 560, y: 382, w: 800, h: 316 };
    const c = KIT.panel(ctx, P, { wood: true, title: 'Sell This?' });
    const r = { x: c.x, y: c.y, w: c.w, h: 168 };
    KIT.card(ctx, r);
    const ic = { x: r.x + 18, y: r.y + 18, w: 132, h: 132 };
    KIT.iconCell(ctx, ic, R => { if (cs.icon) this.drawIcon(ctx, cs.icon, R); else UI.drawRes(ctx, 'shard', R.x + 20, R.y + 20, R.w - 40); });
    const tx = ic.x + ic.w + 22, tw = r.x + r.w - 22 - tx;
    KIT.text(ctx, cs.name, { x: tx, y: r.y + 24, w: tw, h: 40 }, { size: 28, display: true, fit: 'shrink', minSize: 16 });
    KIT.text(ctx, 'for ' + cs.value + ' shards — half its price. No refunds, mostly no curses.', { x: tx, y: r.y + 74, w: tw, h: 70 }, { size: 19, italic: true, color: COL.inkmd, fit: 'wrap', valign: 'top', lineGap: 6 });
    const bw = 260, by = P.y + P.h - 16 - 64;
    KIT.button(ctx, 'shop.prompt.confirm', { x: P.x + P.w / 2 - 12 - bw, y: by, w: bw, h: 64 }, 'Sell · +' + cs.value, {
      onClick: () => { const f = cs.do; this.confirmSell = null; f(); }, sound: 'coin', size: 24, icon: this.shardIcon(false),
      tip: [{ t: 'Sell ' + cs.name.replace(/^Release /, ''), c: TIP.ink }, { t: '+' + cs.value + ' shards. It leaves the ship for good.', c: TIP.body }],
    });
    KIT.button(ctx, 'shop.prompt.cancel', { x: P.x + P.w / 2 + 12, y: by, w: bw, h: 64 }, 'Keep', {
      onClick: () => { this.confirmSell = null; }, sound: 'back', size: 24,
      tip: [{ t: 'Keep it', c: TIP.ink }, { t: 'Nothing is sold.', c: TIP.body }],
    });
  },
  // FFT-style tavern rumours: live intel from the lookouts + clickable myths that open a longer tale
  renderRumors(ctx) {
    KIT.scrim(ctx, 1920, 1080, 0.62);
    KIT.reg('shop.rumors.away', { x: 0, y: 0, w: 1920, h: 1080 }, { onClick: () => { this.showRumors = false; }, sound: 'back' });
    const run = Game.run, region = run.region, reg = DATA.REGIONS[region];
    const loreReg = (DATA.REGION_LORE && DATA.REGION_LORE[region]) || [];
    const all = MapScreen.rumors(run, reg), intel = all.filter(e => e.kind === 'intel'), myths = all.filter(e => e.kind === 'myth');
    const W = 1120, inner = W - 32, iw = inner - 60;
    const intelH = intel.map(e => Math.max(1, TYPE.wrap(ctx, e.text, iw, 20, {}).length) * 28);
    const mythH = myths.map(e => Math.max(1, TYPE.wrap(ctx, '“' + e.text + '”', iw - 180, 20, { italic: true }).length) * 28 + 36);
    const IC = 18 + 26 + 14 + intelH.reduce((a, b) => a + b + 10, 0) + 8;
    const H = 52 + IC + 18 + 40 + mythH.reduce((a, b) => a + b + 12, 0) + 8 + 56 + 16;
    const P = { x: (1920 - W) / 2, y: Math.max(40, Math.round((1080 - H) / 2)), w: W, h: H };
    KIT.reg('shop.rumors.panel', P, { sound: false }); // clicks on the page itself do nothing
    const c = KIT.panel(ctx, P, { wood: true, title: 'Rumours & Discoveries', titleRightW: 420 });
    const node = run.map && run.map.nodes ? run.map.nodes[run.nodeId] : null;
    ShipMenu.bandNote(ctx, P, 'Tavern talk at ' + ((node && node.name) || 'the harbor'), 400);
    // the lookout's report (true intel)
    const ir = { x: c.x, y: c.y, w: inner, h: IC };
    KIT.card(ctx, ir);
    let y = ir.y + 18;
    KIT.text(ctx, "Lookout's report", { x: ir.x + 24, y, w: ir.w - 48, h: 26 }, { size: 18, display: true, color: COL.inkmd }); y += 40;
    intel.forEach((e, i) => {
      ctx.fillStyle = COL.brassdk; ctx.save(); ctx.translate(ir.x + 34, y + 13); ctx.rotate(Math.PI / 4); ctx.fillRect(-4, -4, 8, 8); ctx.restore();
      KIT.text(ctx, e.text, { x: ir.x + 52, y, w: iw, h: intelH[i] }, { size: 20, color: COL.inkdk, fit: 'wrap', valign: 'top', lineGap: 8 });
      y += intelH[i] + 10;
    });
    y = ir.y + ir.h + 18;
    ShipMenu.woodLabel(ctx, { x: c.x, y, w: inner, h: 28 }, "Sailors' Tales", 'click a tale to hear it told in full');
    y += 40;
    myths.forEach((e, i) => {
      const r = { x: c.x, y, w: inner, h: mythH[i] }, id = 'shop.rumor.' + i, has = !!loreReg[e.mythIdx];
      const hov = has && KIT.hovered(id, r);
      if (has) KIT.reg(id, r, { onClick: () => { this.loreView = { mythIdx: e.mythIdx }; }, sound: 'click' });
      if (hov) Game.hot = true;
      KIT.card(ctx, r, { tint: hov ? 'rgba(47,138,114,0.10)' : null, edge: hov ? KIT.C.action : null });
      KIT.text(ctx, '“' + e.text + '”', { x: r.x + 28, y: r.y + 18, w: iw - 180, h: mythH[i] - 36 }, { size: 20, italic: true, color: hov ? COL.dkpurple : COL.inkmd, fit: 'wrap', valign: 'middle', lineGap: 8 });
      if (has) KIT.text(ctx, 'Hear the tale »', { x: r.x + r.w - 24 - 190, y: r.y, w: 190, h: r.h }, { size: 18, display: true, align: 'right', color: hov ? KIT.C.action : COL.inklt });
      y += mythH[i] + 12;
    });
    KIT.button(ctx, 'shop.rumors.close', { x: P.x + (W - 260) / 2, y: P.y + P.h - 16 - 56, w: 260, h: 56 }, 'Close', {
      onClick: () => { this.showRumors = false; }, sound: 'back', size: 22,
      tip: [{ t: 'Back to the market', c: TIP.ink }, { t: 'Escape or a click outside also closes the rumours.', c: TIP.body }],
    });
  },
  // a longer tavern tale (FFT-length): the myth a clicked rumour refers to, told beside the old salt
  renderLore(ctx) {
    KIT.scrim(ctx, 1920, 1080, 0.72);
    KIT.reg('shop.lore.away', { x: 0, y: 0, w: 1920, h: 1080 }, { onClick: () => { this.loreView = null; }, sound: 'back' });
    const region = Game.run.region, idx = this.loreView.mythIdx, reg = DATA.REGIONS[region];
    const hook = (DATA.REGION_RUMORS[region] || [])[idx] || '';
    const body = ((DATA.REGION_LORE[region] || [])[idx]) || '';
    // the page is sized to the tale: the storyteller framed at the upper left, the tale flowing beside
    // him and then full width beneath; the largest type size that fits a 960px-tall page wins
    const W = 1440, PX = (1920 - W) / 2, MAXH = 1000;
    const page = { x: PX + 16, y: 0, w: W - 32, h: 0 };
    const pfW = 360, pfH = 450, PAD = 32;
    const pf = { x: page.x + PAD, y: 0, w: pfW + 12, h: pfH + 12 };
    const rx = pf.x + pf.w + 40, marginR = page.x + page.w - 40;
    const maxBot = MAXH - 52 - 16 - 56 - 16 - PAD;
    const segs = [{ t: '“' + hook + '”', italic: true, color: COL.dkpurple }, { gap: 14 }];
    for (const para of body.split('\n\n')) segs.push({ t: para, italic: false, color: COL.inkdk }, { gap: 16 });
    // layout in page-relative y (0 = page top); the portrait sits PAD below the page top
    const leftAt = ty => (ty < PAD + pf.h + 8 ? rx : page.x + 40);
    const layout = size => {
      const lh = Math.round(size * 1.42), out = []; let ty = PAD;
      for (const seg of segs) {
        if (seg.gap) { ty += seg.gap; continue; }
        let line = '';
        const flush = () => { out.push({ t: line, x: leftAt(ty), y: ty, size, lh, italic: seg.italic, color: seg.color }); ty += lh; };
        for (const wd of String(seg.t).split(' ')) {
          const test = line ? line + ' ' + wd : wd;
          if (line && TYPE.width(ctx, test, size, { italic: seg.italic }) > marginR - leftAt(ty)) { flush(); line = wd; } else line = test;
        }
        if (line) flush();
      }
      const last = out[out.length - 1], end = last ? last.y + last.lh : PAD;
      return { out, end, fit: end <= maxBot };
    };
    let res; for (const s of [28, 26, 24, 22, 20, 18]) { res = layout(s); if (res.fit) break; }
    page.h = Math.max(PAD + pf.h, Math.min(res.end, maxBot)) + PAD;
    const P = { x: PX, y: 0, w: W, h: 52 + page.h + 16 + 56 + 16 };
    P.y = Math.round((1080 - P.h) / 2);
    page.y = P.y + 52; pf.y = page.y + PAD;
    KIT.reg('shop.lore.panel', P, { sound: false });
    KIT.panel(ctx, P, { wood: true, title: reg.name, titleRightW: 420 });
    ShipMenu.bandNote(ctx, P, 'A tale told in the tavern', 400);
    KIT.card(ctx, page);
    KIT.iconCell(ctx, pf, R => { ctx.fillStyle = '#1a120a'; ctx.fillRect(R.x, R.y, R.w, R.h); this.artFit(ctx, 'lore_teller', R, 6); });
    ctx.strokeStyle = COL.brassdk; ctx.lineWidth = 2; ctx.strokeRect(pf.x - 1, pf.y - 1, pf.w + 2, pf.h + 2); ctx.lineWidth = 1;
    for (const ln of res.out) {
      if (ln.y + ln.lh > maxBot + ln.lh * 0.3) break;
      KIT.text(ctx, ln.t, { x: ln.x, y: page.y + ln.y, w: marginR - ln.x, h: ln.lh }, { size: ln.size, italic: ln.italic, color: ln.color, valign: 'top' });
    }
    this._loreFit = res.fit;
    this._lorePanel = P;
    KIT.button(ctx, 'shop.lore.back', { x: P.x + (P.w - 340) / 2, y: P.y + P.h - 16 - 56, w: 340, h: 56 }, '« Back to rumours', {
      onClick: () => { this.loreView = null; }, sound: 'back', size: 22,
      tip: [{ t: 'Back to the rumours', c: TIP.ink }, { t: 'Escape also returns to the list.', c: TIP.body }],
    });
  },
};

// ============ SHIP MENU (FTL-style tabbed: REACTOR / LOADOUT / CREW) ============
// The single between-battle ship window, opened by the map's SHIP button. Replaces the
// old standalone UpgradeScreen + InventoryScreen. REACTOR uses UNDO/ACCEPT batching.
const ShipMenu = {
  // HD screen (Stage 2b, 2026-10-08): authored on the 1920x1080 design grid with the shared KIT.
  // Parchment page -> folder tabs on a ledger rule -> two wood panels -> parchment cards.
  // Every control is a KIT registration (ids 'ship.*'), so draw rect == click rect by construction.
  designW: 1920, designH: 1080,
  TABS: ['Hearthstone', 'Loadout', 'Crew'],
  active: 0, // remembered across opens
  // layout (8px grid)
  TAB_R: { x: 32, y: 24, w: 840, h: 64 },
  TOP_R: { x: 904, y: 16, w: 984, h: 72 },
  BODY_Y: 104, BODY_H: 856,
  FOOT_Y: 984, FOOT_H: 64,
  LEFT_W: 1216, RIGHT_X: 1264, RIGHT_W: 624,
  QINK: '#7a5208', // queued/gold text: COL.golddk is too pale for body text on parchment
  enter(args) {
    if (args && args.tab != null) this.active = U.clamp(args.tab, 0, this.TABS.length - 1);
    this.msg = null;
    this._armDismiss = null;
    this.reactorInit();
    this.loInit();
  },
  update(dt) { Game.ship.tick(dt, null); },
  setTab(i) {
    if (i === this.active) return;
    if (this.active === 0) this.reactorCommit(); // lock queued upgrades in when leaving the Hearthstone tab
    this.active = i;
    if (i === 0) this.reactorInit();
    if (i === 1) this.loInit();
    this.msg = null;
    this._armDismiss = null;
  },
  leave() { if (this.active === 0) this.reactorCommit(); AUDIO.sfx('back'); Game.setScreen('map'); },
  // clicks that land on no KIT control: clicking empty page cancels a pending swap / dismiss
  click() {
    if (this.loSel !== -1 || this._armDismiss) { this.loSel = -1; this._armDismiss = null; }
  },
  key(k) {
    if (k === 'Escape') {
      // peel transient states first (R10 pattern), then close
      if (this.loSel !== -1) { this.loSel = -1; return; }
      if (this._armDismiss) { this._armDismiss = null; return; }
      this.leave(); return;
    }
    if (k === '1' || k === '2' || k === '3') { this.setTab(+k - 1); AUDIO.sfx('click'); }
  },

  // ---------------- shared chrome ----------------
  render(ctx) {
    const W = 1920, H = 1080;
    KIT.page(ctx, W, H);
    this.renderTabs(ctx);
    this.renderTop(ctx);
    if (this.active === 0) this.reactorRender(ctx);
    else if (this.active === 1) this.loRender(ctx);
    else this.crewRender(ctx);
    this.renderFooter(ctx);
    KIT.flushFrames(ctx);
    KIT.flushTip(ctx, W, H);
  },
  renderTabs(ctx) {
    const r = this.TAB_R, n = this.TABS.length, tw = Math.min(272, (r.w - 10 * (n - 1)) / n);
    // the ledger rule the folder tabs stand on (broken under the active tab so it reads as "open")
    const ax = r.x + this.active * (tw + 10), ry = r.y + r.h;
    ctx.fillStyle = 'rgba(60,38,14,0.85)';
    ctx.fillRect(r.x, ry, ax - r.x, 2); ctx.fillRect(ax + tw, ry, 1888 - (ax + tw), 2);
    KIT.tabs(ctx, 'ship.tab', r, this.TABS, this.active, i => this.setTab(i), { maxW: 272, size: 24 });
  },
  // top-right instrument strip: hull · shards · runeshot · seance candles · region
  renderTop(ctx) {
    const run = Game.run, ship = Game.ship, r = this.TOP_R;
    KIT.panel(ctx, r);
    const cells = [232, 184, 168, 168, 232];
    const div = dx => { ctx.strokeStyle = 'rgba(90,60,28,0.42)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(dx, r.y + 16); ctx.lineTo(dx, r.y + r.h - 16); ctx.stroke(); ctx.lineWidth = 1; };
    let x = r.x;
    // hull: warship glyph + number + a slim hull bar in the shared hull colours (G9)
    const hf = ship.hull / Math.max(1, ship.hullMax);
    drawSysSym(ctx, 'hull', x + 20, r.y + 16, 40, COL.inkdk);
    KIT.text(ctx, ship.hull + ' / ' + ship.hullMax, { x: x + 72, y: r.y + 10, w: cells[0] - 92, h: 34 }, { size: 26 });
    KIT.bar(ctx, x + 74, r.y + 48, cells[0] - 96, 8, hf, Game.hullBarColor(hf));
    if (KIT.hovered('ship.top.hull', { x, y: r.y, w: cells[0], h: r.h })) KIT.tip([{ t: 'Hull ' + ship.hull + ' of ' + ship.hullMax, c: TIP.ink }, { t: 'At zero the ship sinks. Patch it at anchorages and repair stops.', c: TIP.body }], Game.mouse.x, Game.mouse.y);
    x += cells[0]; div(x);
    const res = [
      ['shard', run.shards, 'Mana Shards', 'The coin of the sea: upgrades, crew, guns.'],
      ['runeshot', run.runeshot, 'Runeshot', 'Ammunition for bombs and torpedoes. They slip under enemy wards.'],
      ['candle', run.candles, 'Seance Candles', 'Burned to deploy or re-bind an orbiting familiar.'],
    ];
    res.forEach((rs, j) => {
      const cw = cells[1 + j], s = '' + (rs[1] || 0), nw = TYPE.width(ctx, s, 28), gw = 40 + 10 + nw, ix = Math.round(x + (cw - gw) / 2);
      UI.drawRes(ctx, rs[0], ix, r.y + 16, 40);
      KIT.text(ctx, s, { x: ix + 50, y: r.y + 8, w: nw + 4, h: r.h - 16 }, { size: 28 });
      if (KIT.hovered('ship.top.' + rs[0], { x, y: r.y, w: cw, h: r.h })) KIT.tip([{ t: rs[2] + ': ' + s, c: TIP.ink }, { t: rs[3], c: TIP.body }], Game.mouse.x, Game.mouse.y);
      x += cw; div(x);
    });
    const reg = DATA.REGIONS[run.region];
    KIT.text(ctx, reg ? reg.name : 'The Sea', { x: x + 16, y: r.y + 10, w: cells[4] - 32, h: 24 }, { size: 15, display: true, color: COL.inkmd, align: 'center', fit: 'shrink' });
    KIT.text(ctx, 'Sea ' + UI.regionLabel(run.region), { x: x + 16, y: r.y + 36, w: cells[4] - 32, h: 26 }, { size: 20, italic: true, color: COL.inkdk, align: 'center' });
  },
  renderFooter(ctx) {
    const y = this.FOOT_Y, h = this.FOOT_H;
    const pend = this.active === 0 && this.rPending();
    KIT.button(ctx, 'ship.done', { x: 1688, y, w: 200, h }, 'Done', {
      onClick: () => this.leave(), sound: false,
      tip: [{ t: 'Back to the chart', c: TIP.ink }, { t: pend ? 'Queued upgrades are installed as you leave.' : 'Escape also closes the ship window.', c: TIP.body }],
    });
    let msgW = 1656 - 32;
    if (this.active === 0) {
      const p = this.rPending();
      KIT.button(ctx, 'ship.accept', { x: 1472, y, w: 200, h }, 'Accept', {
        onClick: () => { this.reactorCommit(); this.msg = 'Upgrades installed.'; }, sound: 'levelup',
        disabled: !p, reason: 'Nothing queued yet — press Upgrade on a system first.',
        tip: [{ t: 'Install queued upgrades', c: TIP.ink }, { t: 'Spends ' + this.reactorPend.spent + ' shards.', c: TIP.body }],
      });
      KIT.button(ctx, 'ship.undo', { x: 1256, y, w: 200, h }, 'Undo', {
        onClick: () => { this.reactorInit(); this.msg = 'Changes undone.'; }, sound: 'back',
        disabled: !p, reason: 'Nothing queued to undo.',
        tip: [{ t: 'Clear the queue', c: TIP.ink }, { t: 'Refunds every queued upgrade.', c: TIP.body }],
      });
      msgW = 1232 - 32;
    }
    const mr = { x: 32, y, w: msgW, h };
    if (pend) {
      UI.drawRes(ctx, 'shard', mr.x, y + 14, 36);
      const a = 'Shards ' + this.rEffShards(), aw = TYPE.width(ctx, a, 24);
      KIT.text(ctx, a, { x: mr.x + 48, y, w: aw + 4, h }, { size: 24, color: COL.inkdk });
      KIT.text(ctx, '(−' + this.reactorPend.spent + ' queued)', { x: mr.x + 60 + aw, y, w: mr.w - 60 - aw, h }, { size: 22, italic: true, color: this.QINK, fit: 'ellipsis' });
    } else if (this.msg) {
      KIT.text(ctx, this.msg, mr, { size: 22, color: COL.inkdk, fit: 'ellipsis' });
    } else {
      const hint = ['Hover a system to see what its next level buys.', 'Click a weapon, then another slot, to swap them.', 'Sailors improve at a station by doing its job.'][this.active];
      KIT.text(ctx, hint, mr, { size: 20, italic: true, color: COL.inkfade, fit: 'ellipsis' });
    }
  },
  // right-aligned italic note inside a panel's carved title band
  bandNote(ctx, P, text, w) {
    KIT.text(ctx, text, { x: P.x + P.w - 16 - w, y: P.y + 2, w, h: 36 }, { size: 17, italic: true, align: 'right', color: KIT.C.onWoodMuted, shadow: 'rgba(16,9,3,0.85)', shadowDx: 1, shadowDy: 1, fit: 'ellipsis' });
  },
  // a heading painted straight on a wood panel body (brass display + muted italic gloss)
  woodLabel(ctx, r, title, gloss) {
    const tw = TYPE.width(ctx, title, 20, { display: true });
    KIT.text(ctx, title, { x: r.x, y: r.y, w: tw + 4, h: r.h }, { size: 20, display: true, color: COL.brasshi, shadow: 'rgba(16,9,3,0.85)', shadowDx: 1.2, shadowDy: 1.2 });
    if (gloss) KIT.text(ctx, gloss, { x: r.x + tw + 16, y: r.y, w: r.w - tw - 16, h: r.h }, { size: 17, italic: true, color: KIT.C.onWoodMuted, shadow: 'rgba(16,9,3,0.85)', shadowDx: 1, shadowDy: 1, fit: 'ellipsis' });
  },
  // faux-bold Spectral (no bold face is bundled) — the combat crew-rail idiom
  boldText(ctx, str, r, o) { KIT.text(ctx, str, r, o); KIT.text(ctx, str, { x: r.x + 0.7, y: r.y, w: r.w, h: r.h }, o); },
  // a row of tall level pips: installed (ink) / queued (gold) / empty (outlined)
  levelPips(ctx, x, cy, total, on, pend, w, h, gap, cOn) {
    for (let i = 0; i < total; i++) {
      const px = x + i * (w + gap), py = Math.round(cy - h / 2);
      const st = i < on ? 1 : i < on + pend ? 2 : 0;
      ctx.fillStyle = st === 1 ? (cOn || TIP.body) : st === 2 ? COL.gold : 'rgba(74,51,24,0.10)';
      ctx.fillRect(px, py, w, h);
      ctx.strokeStyle = st === 2 ? COL.golddk : 'rgba(58,41,18,0.75)'; ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, w - 1, h - 1);
      if (st) { ctx.fillStyle = 'rgba(255,245,215,0.22)'; ctx.fillRect(px + 1, py + 1, w - 2, Math.max(1, h * 0.25)); }
    }
  },

  // ---------------- HEARTHSTONE tab: FTL-style UNDO / ACCEPT batching ----------------
  // Purchases queue into reactorPend (previewed in gold) and only touch the ship on
  // ACCEPT / DONE / Escape / leaving the tab; UNDO clears the queue.
  reactorInit() { this.reactorPend = { sys: {}, mana: 0, spent: 0 }; },
  rEffLv(k) { return Game.ship.sysLv[k] + (this.reactorPend.sys[k] || 0); },
  rEffMana() { return Game.ship.manaMax + this.reactorPend.mana; },
  rEffShards() { return Game.run.shards - this.reactorPend.spent; },
  rPending() { const p = this.reactorPend; return p.mana > 0 || p.spent > 0 || Object.keys(p.sys).length > 0; },
  // price of reaching level n (n=1 is the install price)
  rCostAt(k, n) {
    const def = DATA.SYSTEMS[k];
    if (n <= 1) return def.costs[0] || 60;
    return def.costs[n] || def.costs[n - 1] || (40 + (n - 2) * 20);
  },
  rCostFor(k) {
    const lv = this.rEffLv(k), def = DATA.SYSTEMS[k];
    if (lv >= def.max) return null;
    return this.rCostAt(k, lv + 1);
  },
  reactorCommit() {
    const p = this.reactorPend, had = this.rPending();
    for (const k in p.sys) Game.ship.sysLv[k] += p.sys[k];
    Game.ship.manaMax += p.mana;
    Game.run.shards -= p.spent;
    this.reactorInit();
    if (had) Game.save();
  },
  // core/sub systems always; advanced systems only once installed (they're bought at
  // anchorages, cap-gated — never installed from the Hearthstone).
  rSysRows() { return DATA.SYS_POWERED.concat(DATA.SYS_SUB).filter(k => !DATA.SYS_ADVANCED.includes(k) || Game.ship.sysLv[k] > 0); },
  // why a system can't be bought right now (null = it can)
  rBlockReason(k) {
    const def = DATA.SYSTEMS[k], cost = this.rCostFor(k);
    if (cost === null) return def.name + ' is at its maximum level.';
    const roomless = k === 'sump' || k === 'shrine';
    if (this.rEffLv(k) === 0 && !roomless && !Game.ship.roomByKey(k)) return 'No room aboard this hull for ' + def.name + '.';
    if (this.rEffShards() < cost) return 'Needs ' + cost + ' shards — you have ' + this.rEffShards() + (this.reactorPend.spent ? ' after queued upgrades' : '') + '.';
    return null;
  },
  reactorBuy(k) {
    const why = this.rBlockReason(k);
    if (why) { this.msg = why; AUDIO.sfx('back'); return; }
    const cost = this.rCostFor(k);
    this.reactorPend.sys[k] = (this.reactorPend.sys[k] || 0) + 1;
    this.reactorPend.spent += cost;
    this.msg = DATA.SYSTEMS[k].name + ' queued → Lv ' + this.rEffLv(k) + '.';
    AUDIO.sfx('click');
  },
  rManaBlockReason() {
    if (this.rEffMana() >= DATA.CORE_MAX) return 'The Mana Hearthstone sings at full pitch.';
    const cost = DATA.CORE_COST(this.rEffMana());
    if (this.rEffShards() < cost) return 'Needs ' + cost + ' shards — you have ' + this.rEffShards() + (this.reactorPend.spent ? ' after queued upgrades' : '') + '.';
    return null;
  },
  reactorBuyMana() {
    const why = this.rManaBlockReason();
    if (why) { this.msg = why; AUDIO.sfx('back'); return; }
    const cost = DATA.CORE_COST(this.rEffMana());
    this.reactorPend.mana++;
    this.reactorPend.spent += cost;
    this.msg = 'Mana Hearthstone queued → ' + this.rEffMana() + ' bars.';
    AUDIO.sfx('click');
  },
  // concrete effect of level n (= cur+1), pulled from TUNING so it stays accurate
  reactorNext(k, cur) {
    const def = DATA.SYSTEMS[k], n = cur + 1, T = TUNING;
    if (cur >= def.max) return 'At maximum level.';
    switch (k) {
      case 'wards': return 'Lv ' + n + ': up to ' + Math.floor(n / 2) + ' ward layer' + (Math.floor(n / 2) === 1 ? '' : 's') + ' — each soaks one hit (2 bars = 1 layer).';
      case 'sails': return 'Lv ' + n + ': up to +' + (n * 5) + '% evasion at full power (+5% per bar).';
      case 'weapons': return 'Lv ' + n + ': power up to ' + n + ' weapon bars — heavier guns, faster reloads.';
      case 'infirmary': return 'Lv ' + n + ': heals ' + (T.infHealBase + n * T.infHealPerBar) + ' HP/s to crew inside (was ' + (T.infHealBase + cur * T.infHealPerBar) + ').';
      case 'sump': return 'Lv ' + n + ': drains floodwater faster — +' + T.pumpPerBarDrain + ' water/s per powered bilge bar.';
      case 'stormhex': return 'Lv ' + n + ': jam an enemy system for ' + T.hexJamSecs[n] + 's (was ' + T.hexJamSecs[cur] + 's); recharge ' + T.hexCdSecs[n] + 's.';
      case 'sirensong': return 'Lv ' + n + ': charm holds ' + T.songCharmSecs[n] + 's (was ' + T.songCharmSecs[cur] + 's); recharge ' + T.songCdSecs[n] + 's.';
      case 'helm': return 'Lv ' + n + ': +' + (n * 3) + '% evasion when manned (+3% per level).';
      case 'doors': return 'Lv ' + n + ': boarders force your hatches more slowly; fire & flood creep through shut doors slower.';
      case 'lookout': return n <= 1 ? 'Lv 1: see inside enemy ships — their systems and crew.' : 'Lv 2: also spot enemy crew through their fog.';
      case 'shrine': return 'Lv ' + n + ': wake up to ' + n + ' bound familiar' + (n === 1 ? '' : 's') + ' (1 per powered bar).';
      case 'brinegate': return cur === 0 ? 'Lv 1: open the portal — teleport up to 2 crew to board the enemy.' : 'Lv ' + n + ': boards recharge faster.';
      case 'fogveil': return cur === 0 ? 'Lv 1: raise a fog cloak — +60% evasion for a few seconds.' : 'Lv ' + n + ': hold the fog longer.';
      default: return 'Lv ' + n + '.';
    }
  },
  // unwrapped tooltip parts: title, what it does, what the NEXT level buys
  reactorTipParts(k) {
    if (k === 'mana') {
      const cur = this.rEffMana();
      return [
        { t: 'Mana Hearthstone  (' + cur + ' bars)', c: TIP.ink },
        { t: 'Total mana you split across your systems each battle.', c: TIP.body },
        { t: cur < DATA.CORE_MAX ? 'Charge: +1 bar of mana to allocate (now ' + (cur + 1) + ').' : 'At full pitch.', c: TIP.action },
      ];
    }
    const def = DATA.SYSTEMS[k], cur = this.rEffLv(k);
    return [
      { t: def.name + '  (Lv ' + cur + ')', c: TIP.ink },
      { t: def.desc, c: TIP.body },
      { t: this.reactorNext(k, cur), c: TIP.action },
    ];
  },
  // wrapped lines (kept for callers/tests that want pre-wrapped text)
  reactorTipLines(ctx, k) {
    const lines = [];
    for (const p of this.reactorTipParts(k)) for (const w of TYPE.wrap(ctx, p.t, 480, 17, {})) lines.push({ t: w, c: p.c });
    return lines;
  },
  reactorRender(ctx) {
    const ship = Game.ship, rows = this.rSysRows();
    const P = { x: 32, y: this.BODY_Y, w: this.LEFT_W, h: this.BODY_H };
    const c = KIT.panel(ctx, P, { wood: true, title: 'Ship Systems', titleRightW: 470 });
    this.bandNote(ctx, P, 'Upgrades queue in gold until you Accept', 460);
    const valid = rows.concat(['mana']);
    if (!valid.includes(this.rSel)) this.rSel = rows[0];
    const n = rows.length, gap = 8, manaH = 96;
    const rh = Math.min(80, Math.floor((c.h - manaH - 16 - (n - 1) * gap) / n));
    const BW = 200, BH = 44, mx = Game.mouse.x, my = Game.mouse.y;
    let tipKey = null;
    // ---- the Mana Hearthstone card ----
    {
      const r = { x: c.x, y: c.y, w: c.w, h: manaH }, id = 'ship.reactor.row.mana';
      if (KIT.hovered(id, r)) this.rSel = 'mana';
      KIT.reg(id, r, { onClick: () => { this.rSel = 'mana'; }, sound: false });
      const sel = this.rSel === 'mana';
      KIT.card(ctx, r, { tint: sel ? 'rgba(47,138,114,0.10)' : null, edge: sel ? KIT.C.action : null });
      const ic = { x: r.x + 14, y: r.y + 14, w: 68, h: 68 };
      KIT.iconCell(ctx, ic, R => drawSysSym(ctx, 'hearthstone', R.x + 6, R.y + 6, R.w - 12, COL.inkdk));
      const bx = r.x + r.w - 14 - BW, nx = ic.x + ic.w + 16, pipW = 9, pipG = 3;
      const pipsX = bx - 24 - 72 - 8 - DATA.CORE_MAX * (pipW + pipG), nb = pipsX - 16 - nx;
      KIT.text(ctx, 'Mana Hearthstone', { x: nx, y: r.y + 14, w: nb, h: 34 }, { size: 22, display: true });
      KIT.text(ctx, this.rEffMana() + ' bars to share among your systems', { x: nx, y: r.y + 50, w: nb, h: 30 }, { size: 17, italic: true, color: COL.inkmd, fit: 'ellipsis' });
      this.levelPips(ctx, pipsX, r.y + r.h / 2, DATA.CORE_MAX, ship.manaMax, this.reactorPend.mana, pipW, 30, pipG, COL.water);
      KIT.text(ctx, this.rEffMana() + '/' + DATA.CORE_MAX, { x: bx - 24 - 72, y: r.y, w: 72, h: r.h }, { size: 18, color: COL.inkmd });
      const why = this.rManaBlockReason(), cost = DATA.CORE_COST(this.rEffMana());
      const bR = { x: bx, y: r.y + (r.h - BH) / 2, w: BW, h: BH };
      const full = this.rEffMana() >= DATA.CORE_MAX;
      KIT.button(ctx, 'ship.reactor.mana', bR, full ? 'Full pitch' : 'Charge · ' + cost, {
        variant: 'recess', size: 19, disabled: !!why, reason: why, sound: false,
        icon: full ? null : (cx, x, cy, s) => { if (why) cx.globalAlpha = 0.45; UI.drawRes(cx, 'shard', x - s / 2, cy - s / 2, s); cx.globalAlpha = 1; },
        onClick: () => this.reactorBuyMana(), onDenied: () => { this.msg = why; },
        tip: why ? null : [{ t: 'Charge the Hearthstone', c: TIP.ink }, { t: '+1 bar of mana for ' + cost + ' shards. Nothing is spent until you Accept.', c: TIP.body }],
      });
      if (KIT.hovered(id, r) && !KIT.inR(mx, my, bR)) tipKey = 'mana';
    }
    // ---- one card per system ----
    rows.forEach((k, i) => {
      const r = { x: c.x, y: c.y + manaH + 16 + i * (rh + gap), w: c.w, h: rh }, id = 'ship.reactor.row.' + k;
      const def = DATA.SYSTEMS[k], lv = ship.sysLv[k], eff = this.rEffLv(k);
      const hov = KIT.hovered(id, r);
      if (hov) this.rSel = k;
      KIT.reg(id, r, { onClick: () => { this.rSel = k; }, sound: false });
      const sel = this.rSel === k;
      KIT.card(ctx, r, { tint: sel ? 'rgba(47,138,114,0.10)' : null, edge: sel ? KIT.C.action : null, studs: rh >= 56 });
      const isz = Math.min(56, rh - 16), ic = { x: r.x + 14, y: r.y + (rh - isz) / 2, w: isz, h: isz };
      KIT.iconCell(ctx, ic, R => { if (eff === 0) ctx.globalAlpha = 0.45; drawSysSym(ctx, k, R.x + 4, R.y + 4, R.w - 8, eff > 0 ? COL.inkdk : COL.inkfade); ctx.globalAlpha = 1; });
      const bx = r.x + r.w - 14 - BW, nx = ic.x + ic.w + 16, PW = 14, PG = 6;
      const pipsX = bx - 24 - 72 - 8 - 8 * (PW + PG) + PG, nb = pipsX - 16 - nx;
      const half = (rh - 12) / 2;
      KIT.text(ctx, def.name, { x: nx, y: r.y + 6, w: nb, h: half }, { size: 21, display: true, color: eff > 0 ? COL.inkdk : COL.inkfade });
      const nxt = this.reactorNext(k, eff).replace(/^Lv \d+: /, '');
      KIT.text(ctx, (eff >= def.max ? '' : (eff === 0 ? 'Install: ' : 'Next: ')) + nxt, { x: nx, y: r.y + 6 + half, w: nb, h: half }, { size: 17, italic: true, color: COL.inkmd, fit: 'ellipsis' });
      this.levelPips(ctx, pipsX, r.y + rh / 2, def.max, lv, eff - lv, PW, Math.min(26, rh - 24), PG);
      KIT.text(ctx, 'Lv ' + eff + '/' + def.max, { x: bx - 24 - 72, y: r.y, w: 72, h: rh }, { size: 17, color: eff > lv ? this.QINK : COL.inkmd });
      const why = this.rBlockReason(k), cost = this.rCostFor(k);
      const bR = { x: bx, y: r.y + (rh - BH) / 2, w: BW, h: BH };
      KIT.button(ctx, 'ship.reactor.up.' + k, bR, cost === null ? 'Maxed' : (eff === 0 ? 'Install · ' : 'Upgrade · ') + cost, {
        variant: 'recess', size: 19, disabled: !!why, reason: why, sound: false,
        icon: cost === null ? null : (cx, x, cy, s) => { if (why) cx.globalAlpha = 0.45; UI.drawRes(cx, 'shard', x - s / 2, cy - s / 2, s); cx.globalAlpha = 1; },
        onClick: () => this.reactorBuy(k), onDenied: () => { this.msg = why; },
        tip: why ? null : [{ t: (eff === 0 ? 'Install ' : 'Upgrade ') + def.name, c: TIP.ink }, { t: 'Queues Lv ' + (eff + 1) + ' for ' + cost + ' shards. Nothing is spent until you Accept.', c: TIP.body }],
      });
      if (hov && !KIT.inR(mx, my, bR)) tipKey = k;
    });
    this.reactorDetails(ctx, this.rSel);
    if (tipKey) KIT.tip(this.reactorTipParts(tipKey), mx, my);
  },
  // right panel: the hovered/selected system's art, description, next level and level ledger
  reactorDetails(ctx, k) {
    const ship = Game.ship, isMana = k === 'mana', def = isMana ? null : DATA.SYSTEMS[k];
    const title = isMana ? 'Mana Hearthstone' : def.name;
    const P = { x: this.RIGHT_X, y: this.BODY_Y, w: this.RIGHT_W, h: this.BODY_H };
    const c = KIT.panel(ctx, P, { wood: true, title: 'Details' });
    // hero card
    const hero = { x: c.x, y: c.y, w: c.w, h: 176 };
    KIT.card(ctx, hero);
    const ic = { x: hero.x + 16, y: hero.y + 16, w: 144, h: 144 };
    KIT.iconCell(ctx, ic, R => drawSysSym(ctx, isMana ? 'hearthstone' : k, R.x + 14, R.y + 14, R.w - 28, COL.inkdk));
    const tx = ic.x + ic.w + 20, tw = hero.x + hero.w - 20 - tx;
    KIT.text(ctx, title, { x: tx, y: hero.y + 18, w: tw, h: 36 }, { size: 26, display: true });
    const lv = isMana ? ship.manaMax : ship.sysLv[k], eff = isMana ? this.rEffMana() : this.rEffLv(k), max = isMana ? DATA.CORE_MAX : def.max;
    KIT.text(ctx, (isMana ? lv + ' of ' + max + ' bars' : 'Level ' + lv + ' of ' + max), { x: tx, y: hero.y + 60, w: tw, h: 28 }, { size: 20 });
    const kind = isMana ? 'The ship\'s heart: every powered bar comes from here.'
      : def.sub ? 'Subsystem — works without Hearthstone mana.'
      : DATA.SYS_ADVANCED.includes(k) ? 'Advanced system — seated in an open mount.' : 'Core system — powered by Hearthstone mana.';
    if (eff > lv) KIT.text(ctx, 'Queued → ' + (isMana ? eff + ' bars' : 'Lv ' + eff), { x: tx, y: hero.y + 92, w: tw, h: 26 }, { size: 18, color: this.QINK });
    KIT.text(ctx, kind, { x: tx, y: hero.y + (eff > lv ? 122 : 96), w: tw, h: eff > lv ? 40 : 60 }, { size: 16, italic: true, color: COL.inkmd, fit: 'wrap', lineGap: 4 });
    // description + next level
    // description + next level, sized to the wrapped text (no dead space)
    const ix = c.x + 20, iw = c.w - 40, LH = 18 + 6;
    const parts = this.reactorTipParts(k);
    const n1 = Math.min(4, TYPE.wrap(ctx, parts[1].t, iw, 18, {}).length), n2 = Math.min(4, TYPE.wrap(ctx, parts[2].t, iw, 18, {}).length);
    const h1 = n1 * LH, h2 = n2 * LH;
    const dc = { x: c.x, y: hero.y + hero.h + 12, w: c.w, h: 16 + 22 + 10 + h1 + 14 + 22 + 10 + h2 + 12 };
    KIT.card(ctx, dc);
    let yy = dc.y + 16;
    KIT.text(ctx, 'What it does', { x: ix, y: yy, w: iw, h: 22 }, { size: 16, display: true, color: COL.inkmd }); yy += 32;
    KIT.text(ctx, parts[1].t, { x: ix, y: yy, w: iw, h: h1 }, { size: 18, fit: 'wrap', valign: 'top', lineGap: 6, maxLines: 4 }); yy += h1 + 6;
    KIT.rule(ctx, ix, yy, ix + iw); yy += 8;
    KIT.text(ctx, eff >= max ? 'Status' : isMana ? 'Next charge' : (eff === 0 ? 'Installing' : 'Next level'), { x: ix, y: yy, w: iw, h: 22 }, { size: 16, display: true, color: COL.inkmd }); yy += 32;
    KIT.text(ctx, parts[2].t, { x: ix, y: yy, w: iw, h: h2 }, { size: 18, fit: 'wrap', valign: 'top', lineGap: 6, maxLines: 4, color: KIT.C.action });
    // level ledger
    const lc = { x: c.x, y: dc.y + dc.h + 12, w: c.w, h: c.y + c.h - (dc.y + dc.h + 12) };
    KIT.card(ctx, lc);
    const cols = [lc.x + 24, lc.x + 220, lc.x + 380];
    const hdrY = lc.y + 14;
    KIT.text(ctx, isMana ? 'Bars' : 'Level', { x: cols[0], y: hdrY, w: 180, h: 24 }, { size: 16, display: true, color: COL.inkmd });
    KIT.text(ctx, 'Cost', { x: cols[1], y: hdrY, w: 140, h: 24 }, { size: 16, display: true, color: COL.inkmd });
    KIT.text(ctx, 'Status', { x: cols[2], y: hdrY, w: lc.x + lc.w - 24 - cols[2], h: 24 }, { size: 16, display: true, color: COL.inkmd });
    KIT.rule(ctx, lc.x + 16, hdrY + 30, lc.x + lc.w - 16);
    const rowsL = [];
    if (isMana) { // price tiers of CORE_COST
      let start = 1;
      for (let b = 1; b <= DATA.CORE_MAX; b++) {
        const cost = DATA.CORE_COST(b - 1);
        if (b === DATA.CORE_MAX || DATA.CORE_COST(b) !== cost) {
          const cur = eff >= start - 1 && eff < b; // the next bar to buy falls in this tier
          const done = eff >= b;
          rowsL.push([start === b ? '' + b : start + '–' + b, cost + ' each', done ? 'Charged' : cur ? 'Next bar ' + (eff + 1) : '', done ? 1 : cur ? 3 : 0]);
          start = b + 1;
        }
      }
    } else {
      for (let nl = 1; nl <= def.max; nl++) {
        const cost = this.rCostAt(k, nl);
        const st = nl <= lv ? 1 : nl <= eff ? 2 : nl === eff + 1 ? 3 : 0;
        rowsL.push(['Lv ' + nl, (nl === 1 && !def.costs[0]) ? 'Fitted' : '' + cost, ['', 'Installed', 'Queued', 'Next', ][st], st]);
      }
    }
    // footer: what it costs to finish this line from the current (queued) level
    let rest = 0;
    if (isMana) for (let b = eff; b < DATA.CORE_MAX; b++) rest += DATA.CORE_COST(b);
    else for (let nl = eff + 1; nl <= def.max; nl++) rest += this.rCostAt(k, nl);
    const footH = 44;
    KIT.rule(ctx, lc.x + 16, lc.y + lc.h - footH - 4, lc.x + lc.w - 16);
    KIT.text(ctx, rest ? 'To finish: ' + rest + ' shards' : 'Fully upgraded', { x: cols[0], y: lc.y + lc.h - footH, w: lc.w - 48, h: footH - 8 }, { size: 18, italic: true, color: COL.inkmd });
    const top = hdrY + 38, rhh = Math.min(40, Math.floor((lc.y + lc.h - footH - 12 - top) / rowsL.length));
    rowsL.forEach((rw, j) => {
      const y = top + j * rhh, st = rw[3];
      if (st === 3) { ctx.fillStyle = 'rgba(47,138,114,0.12)'; ctx.fillRect(lc.x + 12, y, lc.w - 24, rhh); }
      const col = st === 1 ? COL.inkdk : st === 2 ? this.QINK : st === 3 ? KIT.C.action : COL.inkfade;
      KIT.text(ctx, rw[0], { x: cols[0], y, w: 180, h: rhh }, { size: 18, color: col });
      KIT.text(ctx, rw[1], { x: cols[1], y, w: 140, h: rhh }, { size: 18, color: col });
      KIT.text(ctx, rw[2], { x: cols[2], y, w: lc.x + lc.w - 24 - cols[2], h: rhh }, { size: 18, italic: st !== 1, color: col, fit: 'ellipsis' });
    });
  },

  // ---------------- LOADOUT tab: weapon mounts + hold (swap / sell) + augments ----------------
  loInit() { this.loSel = -1; },
  loSlots() { return UI.loadoutSlots(); },
  loSwap(ai, bi) { UI.loadoutSwap(ai, bi); AUDIO.sfx('click'); this.msg = 'Rigging adjusted.'; },
  loPick(i) {
    const slots = this.loSlots();
    if (this.loSel === -1) {
      if (slots[i].key) { this.loSel = i; AUDIO.sfx('click'); }
      else { this.msg = 'That slot is empty — pick a gun first, then click here.'; AUDIO.sfx('deny'); }
    } else if (this.loSel === i) { this.loSel = -1; AUDIO.sfx('back'); }
    else { this.loSwap(this.loSel, i); this.loSel = -1; }
  },
  loSell(s) {
    const sold = UI.sellWeapon(s.kind, s.i);
    this.msg = DATA.WEAPONS[sold.key].name + ' sold for ' + sold.value + ' shards.';
    this.loSel = -1;
  },
  weaponLine(wd) {
    const fam = (wd.family || 'weapon'); const F = fam.charAt(0).toUpperCase() + fam.slice(1);
    const dmg = wd.type === 'beam' ? (wd.dmg || 0) + ' dmg/room' : (wd.dmg || 0) + (wd.shots > 1 ? '×' + wd.shots : '') + ' dmg';
    return F + ' · ' + (wd.power || 0) + ' mana · ' + wd.charge + 's charge · ' + dmg;
  },
  weaponTip(key) {
    const wd = DATA.WEAPONS[key], lines = [{ t: wd.name, c: TIP.ink }, { t: this.weaponLine(wd), c: TIP.stat }];
    const sp = UI.weaponSpecials(wd);
    if (sp) lines.push({ t: sp.charAt(0).toUpperCase() + sp.slice(1) + '.', c: TIP.special });
    if (wd.desc) lines.push({ t: wd.desc, c: TIP.body });
    return lines;
  },
  // weapon art fitted into a box (full-res art smoothed; pixel fallback integer-scaled)
  drawWeaponArt(ctx, key, R) {
    const img = SPR.weaponIcon(key);
    if (img) {
      const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
      const s = Math.min((R.w - 20) / iw, (R.h - 16) / ih), w = iw * s, h = ih * s;
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, R.x + (R.w - w) / 2, R.y + (R.h - h) / 2, w, h); ctx.restore();
      return;
    }
    const wd = DATA.WEAPONS[key], spr = SPR.weaponSprite(wd.family, wd.tint);
    const s = Math.max(1, Math.floor(Math.min((R.w - 20) / 16, (R.h - 16) / 8)));
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(spr, Math.round(R.x + (R.w - 16 * s) / 2), Math.round(R.y + (R.h - 8 * s) / 2), 16 * s, 8 * s); ctx.restore();
  },
  loCard(ctx, s, i, r) {
    const id = 'ship.lo.slot.' + i, sel = this.loSel === i, hov = KIT.hovered(id, r);
    if (hov) Game.hot = true;
    KIT.reg(id, r, { onClick: () => this.loPick(i), sound: false });
    const tag = (s.kind === 'mount' ? 'Mount ' : 'Hold ') + (s.i + 1);
    if (!s.key) {
      const target = this.loSel !== -1;
      KIT.card(ctx, r, { tint: target && hov ? 'rgba(47,138,114,0.14)' : 'rgba(70,46,18,0.20)', studs: false });
      ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = 'rgba(74,51,24,0.55)'; ctx.lineWidth = 1.5;
      UI.roundRect(ctx, r.x + 14, r.y + 14, r.w - 28, r.h - 28, 6); ctx.stroke(); ctx.restore();
      KIT.text(ctx, s.kind === 'mount' ? 'Empty mount' : 'Empty hold', { x: r.x, y: r.y + r.h / 2 - 34, w: r.w, h: 34 }, { size: 22, display: true, color: COL.inkfade, align: 'center' });
      KIT.text(ctx, target ? 'Click to move the selected gun here' : tag + ' · swap a gun here', { x: r.x + 24, y: r.y + r.h / 2 + 4, w: r.w - 48, h: 28 }, { size: 17, italic: true, color: target ? KIT.C.action : COL.inklt, align: 'center' });
      return;
    }
    const wd = DATA.WEAPONS[s.key];
    KIT.card(ctx, r, { tint: sel ? 'rgba(47,138,114,0.14)' : hov ? 'rgba(255,240,205,0.20)' : null, edge: sel ? KIT.C.action : null });
    if (sel) { ctx.strokeStyle = KIT.C.actionHi; ctx.lineWidth = 3; UI.roundRect(ctx, r.x + 1.5, r.y + 1.5, r.w - 3, r.h - 3, 6); ctx.stroke(); ctx.lineWidth = 1; }
    const ic = { x: r.x + 16, y: r.y + 16, w: 176, h: 96 };
    KIT.iconCell(ctx, ic, R => this.drawWeaponArt(ctx, s.key, R));
    KIT.text(ctx, sel ? 'Selected' : tag, { x: ic.x, y: ic.y + ic.h + 10, w: ic.w, h: 26 }, { size: 16, italic: !sel, display: sel, color: sel ? KIT.C.action : COL.inklt, align: 'center' });
    const tx = ic.x + ic.w + 20, tw = r.x + r.w - 16 - tx;
    KIT.text(ctx, wd.name, { x: tx, y: r.y + 14, w: tw, h: 34 }, { size: 22, display: true });
    KIT.text(ctx, this.weaponLine(wd), { x: tx, y: r.y + 50, w: tw, h: 26 }, { size: 17, color: COL.inkmd, fit: 'ellipsis' });
    const sp = UI.weaponSpecials(wd);
    KIT.text(ctx, sp ? sp.charAt(0).toUpperCase() + sp.slice(1) + '.' : (wd.desc || ''), { x: tx, y: r.y + 80, w: tw, h: 44 }, { size: 15, italic: true, color: sp ? TIP.special : COL.inkmd, fit: 'wrap', maxLines: 2, lineGap: 4, valign: 'top' });
    const val = UI.sellWeaponValue(s.key), bR = { x: r.x + r.w - 16 - 156, y: r.y + r.h - 16 - 40, w: 156, h: 40 };
    KIT.button(ctx, 'ship.lo.sell.' + i, bR, 'Sell · ' + val, {
      variant: 'recess', size: 18, sound: 'coin', onClick: () => this.loSell(s),
      icon: (cx, x, cy, sz) => UI.drawRes(cx, 'shard', x - sz / 2, cy - sz / 2, sz),
      tip: [{ t: 'Sell ' + wd.name, c: TIP.ink }, { t: 'Half its price: +' + val + ' shards. The gun leaves the ship for good.', c: TIP.body }],
    });
    if (hov && !KIT.inR(Game.mouse.x, Game.mouse.y, bR)) {
      const lines = this.weaponTip(s.key);
      if (this.loSel !== -1 && !sel) lines.unshift({ t: 'Click to swap with ' + DATA.WEAPONS[this.loSlots()[this.loSel].key].name, c: TIP.action });
      KIT.tip(lines, Game.mouse.x, Game.mouse.y);
    }
  },
  loRender(ctx) {
    const ship = Game.ship, slots = this.loSlots();
    const P = { x: 32, y: this.BODY_Y, w: this.LEFT_W, h: this.BODY_H };
    const c = KIT.panel(ctx, P, { wood: true, title: 'Armaments', titleRightW: 600 });
    this.bandNote(ctx, P, this.loSel >= 0 ? 'Now click another slot to swap — or the same one to cancel' : 'Click a weapon, then another slot to swap', 590);
    const gap = 16, cw = (c.w - gap) / 2, LBL = 28, notesH = 120;
    const mounts = slots.filter(s => s.kind === 'mount'), cargo = slots.filter(s => s.kind === 'cargo');
    const rowsM = Math.ceil(mounts.length / 2), rowsC = Math.ceil(cargo.length / 2);
    const avail = c.h - 2 * (LBL + 8) - gap - notesH - gap - (rowsM - 1 + rowsC - 1) * gap;
    const ch = Math.min(176, Math.floor(avail / (rowsM + rowsC)));
    let y = c.y;
    this.woodLabel(ctx, { x: c.x, y, w: c.w, h: LBL }, 'Mounted', 'fires in battle · drawn from Weapons power');
    y += LBL + 8;
    slots.forEach((s, i) => {
      if (s.kind !== 'mount') return;
      const col = s.i % 2, row = Math.floor(s.i / 2);
      this.loCard(ctx, s, i, { x: c.x + col * (cw + gap), y: y + row * (ch + gap), w: cw, h: ch });
    });
    y += rowsM * (ch + gap);
    this.woodLabel(ctx, { x: c.x, y, w: c.w, h: LBL }, 'In the Hold', 'spares — swap one onto a mount to fire it');
    y += LBL + 8;
    slots.forEach((s, i) => {
      if (s.kind !== 'cargo') return;
      const col = s.i % 2, row = Math.floor(s.i / 2);
      this.loCard(ctx, s, i, { x: c.x + col * (cw + gap), y: y + row * (ch + gap), w: cw, h: ch });
    });
    // gun-deck power: how much Weapons power the mounted guns want vs what the system holds
    const nr = { x: c.x, y: c.y + c.h - notesH, w: c.w, h: notesH };
    KIT.card(ctx, nr);
    const need = ship.weapons.reduce((a, w) => a + ((DATA.WEAPONS[w.key] || {}).power || 0), 0), have = ship.sysLv.weapons;
    KIT.text(ctx, 'Gun-deck power', { x: nr.x + 24, y: nr.y + 14, w: 360, h: 30 }, { size: 20, display: true });
    // one pip per bar: powered bars the guns use (ink), spare bars (outlined), demand beyond the system (red-ink dashed)
    const tot = Math.min(16, Math.max(need, have, 1)), PW = 18, PG = 6;
    for (let b = 0; b < tot; b++) {
      const px = nr.x + 24 + b * (PW + PG), py = nr.y + 62;
      if (b < have) { ctx.fillStyle = b < need ? TIP.body : 'rgba(74,51,24,0.10)'; ctx.fillRect(px, py, PW, 28); ctx.strokeStyle = 'rgba(58,41,18,0.75)'; ctx.strokeRect(px + 0.5, py + 0.5, PW - 1, 27); }
      else { ctx.save(); ctx.setLineDash([4, 3]); ctx.strokeStyle = TIP.special; ctx.lineWidth = 1.5; ctx.strokeRect(px + 0.75, py + 0.75, PW - 1.5, 26.5); ctx.restore(); }
    }
    const tx = nr.x + 24 + 16 * (PW + PG) + 24, tw = nr.x + nr.w - 24 - tx;
    KIT.text(ctx, 'Mounted guns need ' + need + ' mana; Weapons holds ' + have + ' bar' + (have === 1 ? '' : 's') + '.', { x: tx, y: nr.y + 18, w: tw, h: 32 }, { size: 19, fit: 'ellipsis' });
    KIT.text(ctx, need > have ? 'Not every gun can fire at once — upgrade Weapons on the Hearthstone tab.' : 'Every mounted gun can be powered together.', { x: tx, y: nr.y + 56, w: tw, h: 48 }, { size: 17, italic: true, color: need > have ? TIP.special : COL.inkmd, fit: 'wrap', maxLines: 2, lineGap: 4, valign: 'top' });
    this.augRender(ctx);
  },
  augRender(ctx) {
    const augs = Game.run.augs;
    const P = { x: this.RIGHT_X, y: this.BODY_Y, w: this.RIGHT_W, h: this.BODY_H };
    const c = KIT.panel(ctx, P, { wood: true, title: 'Augments', titleRightW: 160 });
    this.bandNote(ctx, P, augs.length + ' of 3 slots', 150);
    let y = c.y;
    const EH = 72, gap = 12;
    augs.forEach((key, i) => {
      const a = DATA.AUGS[key];
      const dl = Math.min(4, TYPE.wrap(ctx, a.desc.replace(/^LEGENDARY:\s*/, ''), c.w - 16 - 80 - 16 - 16, 17, { italic: true }).length);
      const AH = Math.max(144, (a.legendary ? 72 : 52) + dl * 22 + 8 + 40 + 16), r = { x: c.x, y, w: c.w, h: AH };
      KIT.card(ctx, r);
      const ic = { x: r.x + 16, y: r.y + 16, w: 80, h: 80 };
      KIT.iconCell(ctx, ic, R => UI.drawAugIcon(ctx, key, R.x + 8, R.y + 8, R.w - 16));
      const tx = ic.x + ic.w + 16, tw = r.x + r.w - 16 - tx;
      KIT.text(ctx, a.name, { x: tx, y: r.y + 14, w: tw, h: 32 }, { size: 21, display: true });
      let desc = a.desc.replace(/^LEGENDARY:\s*/, ''); desc = desc.charAt(0).toUpperCase() + desc.slice(1);
      if (a.legendary) KIT.text(ctx, 'Legendary', { x: tx, y: r.y + 46, w: tw, h: 22 }, { size: 15, display: true, color: TIP.special });
      KIT.text(ctx, desc, { x: tx, y: r.y + (a.legendary ? 72 : 52), w: tw, h: dl * 22 }, { size: 17, italic: true, color: COL.inkmd, fit: 'wrap', valign: 'top', lineGap: 5, maxLines: 4 });
      const val = Math.floor(a.cost / 2), bR = { x: r.x + r.w - 16 - 156, y: r.y + r.h - 16 - 40, w: 156, h: 40 };
      KIT.button(ctx, 'ship.aug.sell.' + i, bR, 'Sell · ' + val, {
        variant: 'recess', size: 18, sound: 'coin',
        icon: (cx, x, cy, sz) => UI.drawRes(cx, 'shard', x - sz / 2, cy - sz / 2, sz),
        onClick: () => { const sold = UI.sellAug(i); this.msg = DATA.AUGS[sold.key].name + ' sold for ' + sold.value + ' shards.'; },
        tip: [{ t: 'Sell ' + a.name, c: TIP.ink }, { t: 'Half its price: +' + val + ' shards. Its effect ends at once.', c: TIP.body }],
      });
      y += AH + gap;
    });
    for (let i = augs.length; i < 3; i++) {
      const r = { x: c.x, y, w: c.w, h: EH };
      KIT.card(ctx, r, { tint: 'rgba(70,46,18,0.20)', studs: false });
      ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = 'rgba(74,51,24,0.55)'; ctx.lineWidth = 1.5;
      UI.roundRect(ctx, r.x + 10, r.y + 10, r.w - 20, r.h - 20, 6); ctx.stroke(); ctx.restore();
      KIT.text(ctx, 'Empty augment slot', r, { size: 18, italic: true, color: COL.inklt, align: 'center' });
      y += EH + gap;
    }
    // bound familiars (our FTL drones) — read-only here; bought and sold at shops
    y += 4;
    const fams = Game.run.familiars || [], shrine = Game.ship.sysLv.shrine || 0, FH = 68;
    if (y + 36 + FH <= c.y + c.h) {
      this.woodLabel(ctx, { x: c.x, y, w: c.w, h: 28 }, 'Familiars', fams.length + ' bound' + (fams.length && !shrine ? ' · asleep' : ''));
      y += 36;
      if (!fams.length) {
        const r = { x: c.x, y, w: c.w, h: FH };
        KIT.card(ctx, r, { tint: 'rgba(70,46,18,0.20)', studs: false });
        KIT.text(ctx, shrine ? 'None bound — shops sell familiars on their Familiars tab.' : 'None bound. A Binding Shrine (bought at anchorages) wakes them.', { x: r.x + 20, y: r.y, w: r.w - 40, h: r.h }, { size: 17, italic: true, color: COL.inklt, fit: 'wrap', maxLines: 2, lineGap: 4 });
      }
      fams.forEach(key => {
        if (y + FH > c.y + c.h) return;
        const f = DATA.FAMILIARS[key], r = { x: c.x, y, w: c.w, h: FH };
        KIT.card(ctx, r, { studs: false });
        const ic = { x: r.x + 12, y: r.y + 8, w: 52, h: 52 };
        KIT.iconCell(ctx, ic, R => SPR.drawFamiliar(ctx, key, R.x + R.w / 2, R.y + R.h / 2 + 2, 3.2, Game.time || 0, 0, 1));
        const tx = ic.x + ic.w + 14, tw = r.x + r.w - 16 - tx;
        KIT.text(ctx, f.name, { x: tx, y: r.y + 8, w: tw, h: 28 }, { size: 19, display: true });
        const orbit = f.role === 'attack' || f.role === 'boarder';
        KIT.text(ctx, (orbit ? 'Orbits the enemy · 1 candle to deploy' : 'Guards your hull · free') + (shrine ? '' : ' · asleep: no Shrine'), { x: tx, y: r.y + 36, w: tw, h: 24 }, { size: 15, italic: true, color: shrine ? COL.inkmd : TIP.special, fit: 'ellipsis' });
        if (KIT.hovered('ship.fam.' + key, r)) KIT.tip([{ t: f.name, c: TIP.ink }, { t: f.desc, c: TIP.body }, shrine ? null : { t: 'Power a Binding Shrine to wake it.', c: TIP.danger }].filter(Boolean), Game.mouse.x, Game.mouse.y);
        y += FH + 8;
      });
    }
    const left = c.y + c.h - y;
    if (left >= 96) KIT.text(ctx, 'Augments are permanent ship upgrades, found in shops and by fortune; selling one returns half its price. Familiars are bound and released at shops.', { x: c.x + 8, y: c.y + c.h - 80, w: c.w - 16, h: 80 }, { size: 17, italic: true, color: KIT.C.onWoodMuted, shadow: 'rgba(16,9,3,0.85)', shadowDx: 1, shadowDy: 1, fit: 'wrap', valign: 'bottom', lineGap: 5, maxLines: 3 });
  },

  // ---------------- CREW tab: FTL-style crew sheet (HP + every station's mastery) + dismiss ----------------
  CREW_STATION: { weapons: 'Gunnery', helm: 'Helm', sails: 'Sails', wards: 'Wards', repair: 'Repair', combat: 'Boarding' },
  CREW_ORDER: ['helm', 'weapons', 'sails', 'repair', 'wards', 'combat'], // two columns, read across
  RANK_NAME: ['Untrained', 'Trained', 'Grand Master'],
  XP_HOW: { weapons: '+1 per shot fired', helm: '+1 per shot dodged while at the helm', sails: '+1 per shot dodged while on the sails', wards: '+1 per ward layer that soaks a hit', repair: '+1 per system bar repaired', combat: '+1 per boarder slain' },
  // what rank r does at a station, in TUNING numbers
  masteryFx(k, r) {
    const T = TUNING, x = v => '×' + v.toFixed(2);
    switch (k) {
      case 'weapons': return 'charge ' + x(T.masteryWeaponMul[r]);
      case 'wards': return 'ward regen ' + x(T.masteryWardMul[r]);
      case 'helm': case 'sails': return '+' + T.masteryEvasion[r] + '% evasion';
      case 'repair': return 'repair ' + x(T.masteryRepairMul[r]);
      case 'combat': return 'melee ' + x(T.masteryMeleeMul[r]);
    }
    return '';
  },
  masteryWhere(k) { return { weapons: 'while manning Weapons', wards: 'while manning Wards', helm: 'while steering', sails: 'while on the sails', repair: 'on repairs and fires', combat: 'in melee' }[k] || ''; },
  crewDismiss(c) {
    if (Game.ship.aliveCrew().length <= 1) { this.msg = 'You cannot sail alone.'; AUDIO.sfx('back'); return; }
    if (this._armDismiss !== c.id) { this._armDismiss = c.id; this.msg = 'Press Confirm to send ' + c.name + ' ashore for good.'; AUDIO.sfx('click'); return; }
    this._armDismiss = null;
    const idx = Game.ship.crew.findIndex(x => x.id === c.id);
    if (idx >= 0) { Game.ship.crew.splice(idx, 1); this.msg = c.name + ' rows ashore with a fair reference.'; AUDIO.sfx('back'); Game.save(); }
  },
  crewRender(ctx) {
    const crew = Game.ship.aliveCrew();
    const P = { x: 32, y: this.BODY_Y, w: 1856, h: this.BODY_H };
    const c = KIT.panel(ctx, P, { wood: true, title: 'Crew  ' + crew.length + ' / 8', titleRightW: 620 });
    this.bandNote(ctx, P, 'Sailors master a station by doing its job — hover one for details', 610);
    const gap = 16, cw = (c.w - gap) / 2, ch = 188, rg = 12;
    crew.forEach((cr, i) => this.crewCard(ctx, cr, i, { x: c.x + (i % 2) * (cw + gap), y: c.y + Math.floor(i / 2) * (ch + rg), w: cw, h: ch }, crew.length));
    // a short roster leaves room under the cards for the station-mastery guide (else it lives in the tooltips)
    const used = Math.ceil(Math.min(8, crew.length + 1) / 2) * (ch + rg);
    if (c.h - used >= 300) { const gh = Math.min(336, c.h - used - 16); this.crewGuide(ctx, { x: c.x, y: c.y + c.h - gh, w: c.w, h: gh }); }
    if (crew.length < 8) {
      const i = crew.length, r = { x: c.x + (i % 2) * (cw + gap), y: c.y + Math.floor(i / 2) * (ch + rg), w: cw, h: ch };
      const n = 8 - crew.length;
      KIT.card(ctx, r, { tint: 'rgba(70,46,18,0.20)', studs: false });
      ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = 'rgba(74,51,24,0.55)'; ctx.lineWidth = 1.5;
      UI.roundRect(ctx, r.x + 14, r.y + 14, r.w - 28, r.h - 28, 6); ctx.stroke(); ctx.restore();
      // a little hammock per free berth
      const hw = 44, hg = 12, hx0 = r.x + (r.w - (n * hw + (n - 1) * hg)) / 2, hy = r.y + 44;
      for (let j = 0; j < n; j++) {
        const hx = hx0 + j * (hw + hg);
        ctx.strokeStyle = 'rgba(74,51,24,0.6)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo(hx + hw / 2, hy + 26, hx + hw, hy); ctx.stroke(); ctx.lineWidth = 1;
      }
      KIT.text(ctx, n + ' empty berth' + (n === 1 ? '' : 's'), { x: r.x, y: r.y + 80, w: r.w, h: 34 }, { size: 22, display: true, color: COL.inkmd, align: 'center' });
      KIT.text(ctx, 'Sign on sailors at anchorages — up to 8 aboard.', { x: r.x + 24, y: r.y + 118, w: r.w - 48, h: 28 }, { size: 17, italic: true, color: COL.inklt, align: 'center' });
    }
  },
  // the station-mastery ledger: how each station's XP is earned and what every rank does
  crewGuide(ctx, r) {
    KIT.card(ctx, r);
    const x0 = r.x + 24, cols = [x0, x0 + 200, x0 + 760, x0 + 1110, x0 + 1440], cw = [190, 540, 330, 310, r.x + r.w - 24 - (x0 + 1440)];
    KIT.text(ctx, 'Station Mastery', { x: x0, y: r.y + 14, w: 400, h: 30 }, { size: 22, display: true });
    KIT.text(ctx, 'Experience is earned by doing the job; each rank sharpens that station.', { x: x0 + 300, y: r.y + 14, w: r.w - 48 - 300, h: 30 }, { size: 17, italic: true, color: COL.inkmd, align: 'right', fit: 'ellipsis' });
    const hy = r.y + 54;
    ['Station', 'Earned', 'Untrained', 'Trained', 'Grand Master'].forEach((h, j) => KIT.text(ctx, h, { x: cols[j], y: hy, w: cw[j], h: 22 }, { size: 15, display: true, color: COL.inkmd }));
    KIT.rule(ctx, r.x + 16, hy + 28, r.x + r.w - 16);
    const order = ['helm', 'sails', 'weapons', 'wards', 'repair', 'combat'], rh = Math.floor((r.y + r.h - 14 - (hy + 34)) / order.length);
    order.forEach((k, i) => {
      const y = hy + 34 + i * rh, t = DATA.MASTERY[k];
      if (i % 2) { ctx.fillStyle = 'rgba(74,51,24,0.06)'; ctx.fillRect(r.x + 16, y, r.w - 32, rh); }
      const cells = [this.CREW_STATION[k], this.XP_HOW[k].replace(/^\+1 per /, '') + ' (' + t[0] + ' / ' + t[1] + ' XP)', /\+0%|×1\.00/.test(this.masteryFx(k, 0)) ? 'no bonus' : this.masteryFx(k, 0) + ' ' + this.masteryWhere(k), this.masteryFx(k, 1), this.masteryFx(k, 2)];
      cells.forEach((tx, j) => KIT.text(ctx, tx, { x: cols[j], y, w: cw[j] - 8, h: rh }, { size: 17, color: j === 0 ? COL.inkdk : j === 4 ? this.QINK : j === 3 ? KIT.C.action : COL.inkmd, fit: 'ellipsis', italic: j === 1 }));
    });
  },
  crewCard(ctx, cr, i, r, n) {
    const ship = Game.ship, race = DATA.RACES[cr.race] || { name: cr.race, desc: '' };
    KIT.card(ctx, r);
    // portrait
    const pr = { x: r.x + 16, y: r.y + 16, w: 112, h: 108 };
    KIT.iconCell(ctx, pr, R => {
      const pk = cr.race === 'armada' ? 'admiral' : cr.race === 'ghost' ? 'siren' : cr.race;
      if (!SPR.drawArt(ctx, 'portrait_' + pk, R.x + 2, R.y, R.w - 4, R.h)) SPR.drawCrewIcon(ctx, cr.race, R.x + 20, R.y + 22, R.w - 40);
    });
    // dismiss (danger ink; arm-then-confirm so a misclick can't lose a veteran)
    const dR = { x: pr.x, y: r.y + r.h - 16 - 36, w: pr.w, h: 36 };
    const lone = n <= 1, armed = this._armDismiss === cr.id;
    KIT.button(ctx, 'ship.crew.dismiss.' + i, dR, armed ? 'Confirm' : 'Dismiss', {
      variant: 'danger', frame: false, size: 17, sound: false, live: armed,
      disabled: lone, reason: 'You cannot sail alone — keep at least one sailor.',
      onClick: () => this.crewDismiss(cr),
      tip: lone ? [{ t: 'Dismiss ' + cr.name, c: TIP.ink }] : [{ t: armed ? 'Click again to dismiss ' + cr.name : 'Dismiss ' + cr.name, c: TIP.ink }, { t: 'Rows ashore for good and frees a berth. No refund.', c: TIP.body }],
    });
    ctx.strokeStyle = lone ? 'rgba(90,70,45,0.45)' : armed ? KIT.C.dangerHi : 'rgba(143,35,22,0.75)'; ctx.lineWidth = armed ? 2 : 1.5;
    UI.roundRect(ctx, dR.x + 0.75, dR.y + 0.75, dR.w - 1.5, dR.h - 1.5, 4); ctx.stroke(); ctx.lineWidth = 1;
    // identity + health
    const ix = pr.x + pr.w + 20, iw = 248;
    this.boldText(ctx, cr.name, { x: ix, y: r.y + 12, w: iw, h: 32 }, { size: 24 });
    const room = ship.rooms[cr.roomId], skey = room && room.key;
    const post = skey ? (DATA.SYSTEMS[skey] ? DATA.SYSTEMS[skey].name : skey) : 'roaming';
    KIT.text(ctx, race.name + ' · ' + post, { x: ix, y: r.y + 46, w: iw, h: 24 }, { size: 17, italic: true, color: COL.inkmd, fit: 'ellipsis' });
    const hp = Math.ceil(Math.max(0, cr.hp)), hf = Math.max(0, cr.hp) / cr.maxhp;
    KIT.text(ctx, 'Health', { x: ix, y: r.y + 76, w: 100, h: 22 }, { size: 15, display: true, color: COL.inkmd });
    KIT.text(ctx, hp + ' / ' + cr.maxhp, { x: ix + 100, y: r.y + 76, w: iw - 100, h: 22 }, { size: 17, align: 'right' });
    KIT.meter(ctx, 'ship.crew.hp.' + cr.id, { x: ix, y: r.y + 102, w: iw, h: 12 }, hf, Game.hullBarColor(hf));
    ctx.strokeStyle = 'rgba(42,29,16,0.8)'; ctx.strokeRect(ix + 0.5, r.y + 102.5, iw - 1, 11);
    KIT.text(ctx, race.desc, { x: ix, y: r.y + 124, w: iw, h: 44 }, { size: 15, italic: true, color: COL.inklt, fit: 'wrap', maxLines: 2, lineGap: 4, valign: 'top' });
    // station mastery grid: 2 columns x 3 rows. Each cell: STATION (display) + rank word, a 2-segment
    // XP track (to Trained, to Grand Master), and the rank's concrete effect from TUNING.
    const sx = ix + iw + 28, sw = r.x + r.w - 20 - sx, colW = (sw - 28) / 2, rowH = 56, sy = r.y + 14;
    ctx.strokeStyle = 'rgba(74,51,24,0.30)'; ctx.beginPath(); ctx.moveTo(sx - 14.5, r.y + 18); ctx.lineTo(sx - 14.5, r.y + r.h - 18); ctx.stroke();
    this.CREW_ORDER.forEach((k, j) => {
      const cx = sx + (j % 2) * (colW + 28), cy = sy + Math.floor(j / 2) * rowH, cell = { x: cx, y: cy, w: colW, h: rowH - 4 };
      const rk = DATA.crewRank(cr, k), xp = (cr.xp && cr.xp[k]) || 0, t = DATA.MASTERY[k] || [12, 36];
      KIT.text(ctx, this.CREW_STATION[k], { x: cx, y: cy, w: colW * 0.5, h: 20 }, { size: 15, display: true, color: rk ? COL.inkdk : COL.inkmd });
      const rc = rk === 2 ? this.QINK : rk === 1 ? KIT.C.action : COL.inkfade;
      KIT.text(ctx, this.RANK_NAME[rk], { x: cx + colW * 0.4, y: cy, w: colW * 0.6, h: 20 }, { size: 15, italic: true, align: 'right', color: rc });
      const segW = (colW - 4) / 2, ty = cy + 24;
      const f1 = Math.min(1, xp / t[0]), f2 = U.clamp((xp - t[0]) / (t[1] - t[0]), 0, 1);
      for (let sgi = 0; sgi < 2; sgi++) {
        const bx = cx + sgi * (segW + 4), f = sgi ? f2 : f1;
        ctx.fillStyle = 'rgba(42,29,16,0.18)'; ctx.fillRect(bx, ty, segW, 8);
        ctx.fillStyle = sgi ? COL.golddk : KIT.C.action; ctx.fillRect(bx, ty, segW * f, 8);
        ctx.strokeStyle = 'rgba(42,29,16,0.6)'; ctx.strokeRect(bx + 0.5, ty + 0.5, segW - 1, 7);
      }
      const fx = this.masteryFx(k, rk), base = rk === 0 && /\+0%|×1\.00/.test(fx);
      KIT.text(ctx, base ? 'no bonus yet' : fx, { x: cx, y: cy + 33, w: colW, h: 17 }, { size: 15, italic: base, color: base ? COL.inkfade : COL.inklt, fit: 'ellipsis' });
      if (KIT.hovered('ship.crew.skill.' + cr.id + '.' + k, cell)) {
        const lines = [{ t: this.CREW_STATION[k] + ' — ' + this.RANK_NAME[rk], c: TIP.ink }];
        lines.push({ t: 'Now: ' + this.masteryFx(k, rk) + ' ' + this.masteryWhere(k) + '.', c: TIP.body });
        if (rk < 2) lines.push({ t: (rk === 0 ? 'Trained' : 'Grand Master') + ': ' + this.masteryFx(k, rk + 1) + ' — ' + xp + ' / ' + t[rk] + ' XP.', c: TIP.action });
        lines.push({ t: 'Earned ' + this.XP_HOW[k] + '.', c: TIP.stat });
        KIT.tip(lines, Game.mouse.x, Game.mouse.y);
      }
    });
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
  // HD (1920x1080, Stage 2c): the PAINTED open book plate full-bleed, page content laid FLAT onto its
  // vellum pages in 1080p design px (the old 512-grid positions x3.75), body text box-fitted so a long
  // passage shrinks instead of clipping, and KIT controls: 'lore.prev' / 'lore.close' / 'lore.next' and
  // the race-page tabs 'lore.tab.ships|weapons|crew'. A click on a page half (off any control) flips.
  designW: 1920, designH: 1080,
  enter() { this.page = 0; this.tab = null; },
  update() {},
  flip(dir) {
    const np = U.clamp(this.page + dir, 0, LORE_PAGES.length - 1);
    if (np !== this.page) AUDIO.sfx('click');
    this.page = np; this.tab = null;
  },
  close() { AUDIO.sfx('back'); Game.setScreen('title'); },
  click(x, y) { if (y < 820) this.flip(x < 960 ? -1 : 1); }, // page halves (controls are KIT registrations)
  key(k) {
    if (k === 'ArrowLeft') this.flip(-1);
    if (k === 'ArrowRight' || k === ' ') this.flip(1);
    if (k === 'Escape') Game.setScreen('title');
  },
  // where an image lands when contain-fit + centered in box (bx,by,bw,bh): AI art, atlas frame, or vignette
  imageFitRect(name, bx, by, bw, bh) {
    const e = SPR.artEntry(name);
    if (e) {
      const iw = e.img.naturalWidth, ih = e.img.naturalHeight, s = Math.min(bw / iw, bh / ih), w = iw * s, h = ih * s;
      return { x: bx + (bw - w) / 2, y: by + (bh - h) / 2, w, h };
    }
    if (SPR.hasFrame(name)) {
      const fs = SPR.frameSize(name), s = Math.min(bw / fs.w, bh / fs.h, 8), w = fs.w * s, h = fs.h * s;
      return { x: bx + (bw - w) / 2, y: by + (bh - h) / 2, w, h };
    }
    if (name && name.startsWith('vig_')) { const w = Math.min(bw, 360), h = w * 9 / 16; return { x: bx + (bw - w) / 2, y: by + (bh - h) / 2, w, h }; }
    return null;
  },
  drawImageFit(ctx, name, bx, by, bw, bh) {
    const r = this.imageFitRect(name, bx, by, bw, bh);
    if (!r) return false;
    const e = SPR.artEntry(name);
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    if (e) ctx.drawImage(e.img, r.x, r.y, r.w, r.h);
    else if (SPR.hasFrame(name)) { ctx.imageSmoothingEnabled = false; SPR.drawFrame(ctx, name, r.x, r.y, false, r.w / SPR.frameSize(name).w); }
    else ctx.drawImage(SPR.vignette(name.slice(4)), r.x, r.y, r.w, r.h);
    ctx.restore();
    return true;
  },
  INK: '#3a2912',
  _drawLeft(ctx, P) {
    const lcx = 592; // left-page content centre (nudged toward the spine)
    const box = { x: 292, y: 172, w: 592, h: 555 };
    const fr = this.imageFitRect(P.img, box.x, box.y, box.w, box.h) || box;
    const m = { x: Math.round(fr.x - 14), y: Math.round(fr.y - 14), w: Math.round(fr.w + 28), h: Math.round(fr.h + 28) };
    ctx.fillStyle = COL.parchdk; ctx.fillRect(m.x, m.y, m.w, m.h); // recessed parchment matte (a pasted-in plate)
    this.drawImageFit(ctx, P.img, box.x, box.y, box.w, box.h);
    ctx.lineWidth = 2; ctx.strokeStyle = COL.golddk; ctx.strokeRect(m.x + 1, m.y + 1, m.w - 2, m.h - 2);
    ctx.lineWidth = 1.5; ctx.strokeStyle = COL.gold; ctx.strokeRect(m.x - 2, m.y - 2, m.w + 4, m.h + 4); ctx.lineWidth = 1;
    KIT.text(ctx, P.cap, { x: lcx - 320, y: 742, w: 640, h: 54 }, { size: 42, display: true, align: 'center', color: '#6a5436', fit: 'shrink' });
    ctx.fillStyle = COL.parchln; ctx.fillRect(lcx - 190, 816, 380, 2);
    KIT.text(ctx, 'Page ' + (this.page + 1) + ' of ' + LORE_PAGES.length, { x: lcx - 300, y: 836, w: 600, h: 44 }, { size: 36, italic: true, align: 'center', color: '#5a432a' });
  },
  _drawRight(ctx, P) {
    const rx = 1050, rw = 615;
    const tabTitles = { ships: 'SHIPS & FITTINGS', weapons: 'THE ARSENAL', crew: 'THE CREW' };
    KIT.text(ctx, this.tab && P.race ? tabTitles[this.tab] : P.title, { x: rx, y: 112, w: rw, h: 64 }, { size: 54, display: true, align: 'center', color: this.INK, fit: 'shrink' });
    ctx.fillStyle = COL.parchln; ctx.fillRect(rx, 190, rw, 2);
    const bodyText = (this.tab && P.race && LORE_BUILDS[P.race]) ? LORE_BUILDS[P.race][this.tab] : P.text;
    // box-placed body: wraps to the text well and shrinks (never clips) the longest passages
    KIT.text(ctx, bodyText, { x: rx, y: 210, w: rw, h: (P.race ? 822 : 930) - 210 }, { size: 36, minSize: 24, lineGap: 10, color: this.INK, fit: 'wrap', valign: 'top' });
    // race pages: encyclopedia tabs - how this people sails, shoots, and hires
    if (P.race) {
      [['ships', 'Ships'], ['weapons', 'Weapons'], ['crew', 'Crew']].forEach(([key, label], i) => {
        const r = { x: 1061 + i * 206, y: 840, w: 191, h: 52 }, on = this.tab === key, id = 'lore.tab.' + key;
        KIT.reg(id, r, { onClick: () => { this.tab = this.tab === key ? null : key; } }); // click again for the tale
        const hov = KIT.hovered(id, r); if (hov) Game.hot = true;
        ctx.fillStyle = on ? COL.parchdk : hov ? 'rgba(120,92,46,0.24)' : 'rgba(120,92,46,0.12)'; ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.lineWidth = on ? 2 : 1.5; ctx.strokeStyle = on ? COL.golddk : COL.inkfade; ctx.strokeRect(r.x + 0.75, r.y + 0.75, r.w - 1.5, r.h - 1.5); ctx.lineWidth = 1;
        KIT.text(ctx, label, r, { size: 30, display: true, align: 'center', color: on ? COL.inkdk : COL.inkmd, padX: 8 });
        if (hov) KIT.tip([{ t: on ? 'Back to the tale' : label, c: TIP.ink }, { t: on ? 'Click again to read the page.' : 'How this people ' + { ships: 'fits out a ship', weapons: 'arms it', crew: 'crews it' }[key] + '.', c: TIP.body }], Game.mouse.x, Game.mouse.y);
      });
    }
  },
  render(ctx) {
    const P = LORE_PAGES[this.page], W = 1920, H = 1080, last = LORE_PAGES.length - 1;
    // the open book is a single PAINTED plate (walnut desk, candle, vellum pages, brass corners).
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    const drew = SPR.drawArt(ctx, 'lore_book', 0, 0, W, H);
    ctx.restore();
    if (!drew) {
      ctx.fillStyle = COL.cabinlo; ctx.fillRect(0, 0, W, H);
      KIT.parchFill(ctx, 135, 105, 750, 810); KIT.parchFill(ctx, 1035, 105, 750, 810);
    }
    this._drawLeft(ctx, P);
    this._drawRight(ctx, P);
    // nav (on the desk below the book)
    KIT.button(ctx, 'lore.prev', { x: 105, y: 982, w: 337, h: 68 }, '‹  Previous', { size: 26, disabled: this.page === 0, reason: 'This is the first page.', onClick: () => this.flip(-1), sound: false });
    KIT.button(ctx, 'lore.close', { x: 795, y: 982, w: 330, h: 68 }, 'Close', { size: 26, onClick: () => this.close(), sound: false, tip: [{ t: 'Close the book', c: TIP.ink }, { t: 'Escape also closes it.', c: TIP.body }] });
    KIT.button(ctx, 'lore.next', { x: 1477, y: 982, w: 337, h: 68 }, 'Next  ›', { size: 26, disabled: this.page === last, reason: 'This is the last page.', onClick: () => this.flip(1), sound: false });
    KIT.flushFrames(ctx);
    KIT.flushTip(ctx, W, H);
  },
};

