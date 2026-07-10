/* STARFALL - all visuals drawn in code: hull generators, room rendering,
   crew sprites, projectiles, backgrounds, panels (§16). No asset files. */
"use strict";

var Art = (function () {
  var P = GAME_DATA.palette;

  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // -------------------------------------------------------------------------
  // Semantic text roles per SURFACE. Rule: never place light accent colors
  // (selection yellow, cyan, bright green) on light surfaces; use these
  // ink-strength equivalents instead. All pairs validated >= 4.5:1.
  // -------------------------------------------------------------------------
  var ROLE = {
    light: {  // parchment / parchmentDim panels
      ink: "#20201E", sub: "#57544E", accent: "#5E4708", good: "#20641E",
      warn: "#8A2A1E", blue: "#0E5578", disabled: "#4A4742"
    },
    dark: {   // dark wells, HUD plates, space
      text: "#E7F3E5", sub: "#B9B4A9", accent: "#FBE667", good: "#7DF780",
      warn: "#FF7B6E", blue: "#5CC9FF", disabled: "#9E9A90"
    },
    mauve: {  // tooltip / item cards (surface darkened to #6E5C5B)
      text: "#FFFFFF", sub: "#F2ECEA", accent: "#FFE99C", good: "#BDF7B4",
      warn: "#FFDFD8", blue: "#CFEAFF"
    },
    rose: {   // enemy TARGET panel (text sits on its dark header band)
      text: "#FFFFFF", band: "rgba(26,26,24,0.72)", warn: "#FFD0CC", good: "#CFF7C8"
    }
  };

  // -------------------------------------------------------------------------
  // Octagonal parchment panel (§16.1 usage rules)
  // -------------------------------------------------------------------------
  var _panelNoise = null;
  function panelNoise() {
    if (_panelNoise) return _panelNoise;
    var c = document.createElement("canvas");
    c.width = 64; c.height = 64;
    var g = c.getContext("2d");
    var img = g.createImageData(64, 64);
    for (var i = 0; i < img.data.length; i += 4) {
      var v = Math.random() < 0.5 ? 0 : 255;
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v;
      img.data[i + 3] = 10; // very faint
    }
    g.putImageData(img, 0, 0);
    _panelNoise = c;
    return c;
  }

  function panel(ctx, x, y, w, h, opts) {
    opts = opts || {};
    var cut = opts.cut != null ? opts.cut : 14;
    var fill = opts.fill || P.uiParchment;
    ctx.save();
    octPath(ctx, x, y, w, h, cut);
    ctx.fillStyle = fill;
    if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
    ctx.fill();
    ctx.globalAlpha = 1;
    // finishing (art bible §5): light from upper-left + faint surface grain
    if (opts.flat !== true) {
      ctx.save();
      octPath(ctx, x, y, w, h, cut);
      ctx.clip();
      var lg = ctx.createLinearGradient(x, y, x, y + h);
      lg.addColorStop(0, "rgba(255,255,255,0.10)");
      lg.addColorStop(0.14, "rgba(255,255,255,0)");
      lg.addColorStop(0.86, "rgba(0,0,0,0)");
      lg.addColorStop(1, "rgba(0,0,0,0.12)");
      ctx.fillStyle = lg;
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = ctx.createPattern(panelNoise(), "repeat");
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    octPath(ctx, x, y, w, h, cut);
    ctx.lineWidth = 3;
    ctx.strokeStyle = opts.stroke || P.outlineDark;
    ctx.stroke();
    // 1px inner light frame
    octPath(ctx, x + 4, y + 4, w - 8, h - 8, Math.max(4, cut - 4));
    ctx.lineWidth = 1;
    ctx.strokeStyle = opts.inner || "rgba(255,255,255,0.7)";
    ctx.stroke();
    ctx.restore();
  }
  function octPath(ctx, x, y, w, h, c) {
    ctx.beginPath();
    ctx.moveTo(x + c, y);
    ctx.lineTo(x + w - c, y);
    ctx.lineTo(x + w, y + c);
    ctx.lineTo(x + w, y + h - c);
    ctx.lineTo(x + w - c, y + h);
    ctx.lineTo(x + c, y + h);
    ctx.lineTo(x, y + h - c);
    ctx.lineTo(x, y + c);
    ctx.closePath();
  }
  function darkWell(ctx, x, y, w, h) {
    ctx.fillStyle = P.uiPanelDarkWell;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = P.outlineDark;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  }

  // Button: returns bounds for hit-testing (caller stores them)
  function button(ctx, x, y, w, h, label, opts) {
    opts = opts || {};
    var hover = opts.hover, disabled = opts.disabled, selected = opts.selected;
    var fill = disabled ? P.uiParchmentDim : selected ? P.selectionYellow : hover ? P.selectionYellow : P.uiParchment;
    panel(ctx, x, y, w, h, { fill: fill, cut: opts.cut != null ? opts.cut : 10 });
    var scale = opts.scale || 2;
    PixelFont.drawText(ctx, label, x + w / 2, y + h / 2, {
      scale: scale, align: "center", valign: "middle",
      color: disabled ? ROLE.light.disabled : "#20201E"
    });
    return { x: x, y: y, w: w, h: h };
  }

  // -------------------------------------------------------------------------
  // Starfields & backgrounds (§16.5) - seeded, cached per beacon
  // -------------------------------------------------------------------------
  var bgCache = {};
  function background(ctx, seed, kind, W, H, t) {
    var key = seed + "|" + kind + "|" + W + "x" + H;
    var c = bgCache[key];
    if (!c) {
      c = document.createElement("canvas");
      c.width = W; c.height = H;
      renderBackground(c.getContext("2d"), seed, kind, W, H);
      // keep cache bounded
      var keys = Object.keys(bgCache);
      if (keys.length > 6) delete bgCache[keys[0]];
      bgCache[key] = c;
    }
    ctx.drawImage(c, 0, 0);
    bgAccents(ctx, kind, W, H, t);
  }

  // Animated background accents (shared by crisp and pixel-mode paths).
  function bgAccents(ctx, kind, W, H, t) {
    if (kind === "sun") {
      var flicker = 0.06 + 0.04 * Math.sin(t * 5.1) + 0.03 * Math.sin(t * 13.7);
      var g = ctx.createRadialGradient(W * 0.5, H + 200, 100, W * 0.5, H + 200, H * 1.1);
      g.addColorStop(0, "rgba(255,140,30," + (0.25 + flicker) + ")");
      g.addColorStop(1, "rgba(255,60,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    } else if (kind === "ionStorm") {
      if (Math.sin(t * 7.3) > 0.96 || Math.sin(t * 3.1 + 2) > 0.985) {
        ctx.fillStyle = "rgba(150,190,255,0.10)";
        ctx.fillRect(0, 0, W, H);
      }
    }
  }

  // Soft desaturated nebula wisps: the mid-value depth layer (art bible §2) —
  // space frames must never be mostly empty black.
  function drawWisps(g, rng, W, H, count, strength) {
    var cols = [
      [112, 130, 168], [138, 118, 146], [104, 140, 144], [144, 126, 112], [118, 122, 158]
    ];
    for (var i = 0; i < count; i++) {
      var c = cols[Math.floor(rng.next() * cols.length)];
      var x = rng.next() * W, y = rng.next() * H;
      var rx = W * (0.25 + rng.next() * 0.4), ry = rx * (0.35 + rng.next() * 0.4);
      var a = strength * (0.6 + rng.next() * 0.8);
      var ng = g.createRadialGradient(x, y, rx * 0.1, x, y, rx);
      ng.addColorStop(0, "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")");
      ng.addColorStop(1, "rgba(" + c[0] + "," + c[1] + "," + c[2] + ",0)");
      g.save();
      g.translate(x, y);
      g.rotate(rng.next() * Math.PI);
      g.scale(1, ry / rx);
      g.translate(-x, -y);
      g.fillStyle = ng;
      g.fillRect(x - rx, y - rx, rx * 2, rx * 2);
      g.restore();
    }
  }
  function drawDustBand(g, rng, W, H) {
    var y0 = H * (0.2 + rng.next() * 0.6);
    var ang = (rng.next() - 0.5) * 0.5;
    g.save();
    g.translate(W / 2, y0);
    g.rotate(ang);
    var bg = g.createLinearGradient(0, -H * 0.2, 0, H * 0.2);
    bg.addColorStop(0, "rgba(0,0,0,0)");
    bg.addColorStop(0.5, "rgba(140,132,150,0.10)");
    bg.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = bg;
    g.fillRect(-W, -H * 0.2, W * 2, H * 0.4);
    // dust speckle
    for (var i = 0; i < 240; i++) {
      var dx = (rng.next() - 0.5) * W * 1.8;
      var dy = (rng.next() - 0.5) * H * 0.24;
      g.fillStyle = "rgba(200,196,210," + (0.05 + rng.next() * 0.10) + ")";
      g.fillRect(dx, dy, 1 + rng.next() * 2, 1 + rng.next() * 2);
    }
    g.restore();
  }

  function renderBackground(g, seed, kind, W, H) {
    var rng = new RngStream(seed);
    g.fillStyle = P.spaceBlack;
    g.fillRect(0, 0, W, H);
    // depth layer first: wisps + dust give the frame its mid-value body
    if (kind !== "sun") drawWisps(g, rng, W, H, kind === "nebula" ? 2 : 4, kind === "map" ? 0.10 : 0.21);
    if (kind !== "map" && rng.chance(70)) drawDustBand(g, rng, W, H);
    // 3 star layers with mixed tints and occasional bright twinkles
    var layers = [[240, 1, 0.5], [130, 2, 0.8], [55, 2, 1.0]];
    for (var L = 0; L < layers.length; L++) {
      var n = layers[L][0], size = layers[L][1], bright = layers[L][2];
      for (var i = 0; i < n; i++) {
        var x = rng.next() * W, y = rng.next() * H;
        var roll = rng.next();
        g.fillStyle = roll < 0.28 ? "rgba(150,190,255," + (0.45 * bright) + ")" :
          roll < 0.38 ? "rgba(255,214,170," + (0.4 * bright) + ")" :
          "rgba(255,255,255," + (0.5 * bright) + ")";
        g.fillRect(x, y, size, size);
        if (L === 2 && rng.chance(9)) { // twinkle cross
          g.fillRect(x - 2, y, 6, 1);
          g.fillRect(x + 0.5, y - 2, 1, 6);
        }
      }
    }
    // large features per scene kind
    if (kind === "nebula") {
      var cols = ["rgba(112,64,146,0.33)", "rgba(160,72,112,0.26)", "rgba(64,112,140,0.24)", "rgba(88,48,130,0.28)"];
      for (var nb = 0; nb < 4; nb++) {
        var nx = rng.next() * W, ny = rng.next() * H, nr = 300 + rng.next() * 500;
        var ng = g.createRadialGradient(nx, ny, 30, nx, ny, nr);
        ng.addColorStop(0, cols[nb % cols.length]);
        ng.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = ng;
        g.fillRect(0, 0, W, H);
      }
    } else if (kind === "sun") {
      drawWisps(g, rng, W, H, 2, 0.10);
      var sg = g.createRadialGradient(W * 0.5, H + 200, 80, W * 0.5, H + 200, H * 1.15);
      sg.addColorStop(0, "#FFD980");
      sg.addColorStop(0.25, "#F08A2C");
      sg.addColorStop(0.6, "rgba(180,60,10,0.5)");
      sg.addColorStop(1, "rgba(80,20,0,0)");
      g.fillStyle = sg;
      g.fillRect(0, 0, W, H);
    } else if (kind === "asteroid") {
      if (rng.chance(60)) drawPlanet(g, rng, W, H);
      for (var ar = 0; ar < 26; ar++) {
        drawRock(g, rng.next() * W, rng.next() * H, 6 + rng.next() * 26, rng);
      }
    } else if (kind === "map") {
      // beacon map: fixed, quiet galaxy-spiral backdrop
      drawGalaxy(g, W * 0.62, H * 0.52, Math.min(W, H) * 0.5, rng, 0.6);
      drawGalaxy(g, W * 0.2, H * 0.2, Math.min(W, H) * 0.14, rng, 0.5);
    } else if (kind === "menu") {
      // title scene: hero planet, distant galaxy, layered depth
      drawWisps(g, rng, W, H, 2, 0.14);
      drawGalaxy(g, W * 0.24, H * 0.22, 240, rng, 0.9);
      drawPlanet(g, rng, W, H, { x: W * 0.7, y: H * 0.74, r: H * 0.52, ring: true });
    } else {
      // plain space: planetary feature most of the time (mid-value body)
      if (rng.chance(90)) drawPlanet(g, rng, W, H, { x: rng.next() * W, y: rng.next() * H, r: 140 + rng.next() * 280 });
      if (rng.chance(35)) drawGalaxy(g, rng.next() * W, rng.next() * H * 0.6, 120 + rng.next() * 160, rng, 0.8);
    }
  }

  function drawPlanet(g, rng, W, H, fixed) {
    var x = fixed ? fixed.x : rng.next() * W;
    var y = fixed ? fixed.y : rng.next() * H;
    var r = fixed ? fixed.r : 90 + rng.next() * 240;
    var hues = [
      ["#3B5E7A", "#16283B", "#7FB3CC"], ["#7A5E3B", "#3B2A16", "#CCA97F"],
      ["#4E7A56", "#1C3B24", "#8FCC9A"], ["#6E4E7A", "#2E1C3B", "#B58FCC"],
      ["#6E6250", "#2E2820", "#C2B49A"]
    ];
    var h = hues[Math.floor(rng.next() * hues.length)];
    var hasRing = (fixed && fixed.ring) || rng.chance(35);
    // far half of the ring renders BEHIND the planet disc (occlusion)
    if (hasRing) {
      g.strokeStyle = "rgba(210,200,170,0.35)";
      g.lineWidth = r * 0.1;
      g.beginPath();
      g.ellipse(x, y, r * 1.6, r * 0.4, -0.4, Math.PI, Math.PI * 2);
      g.stroke();
    }
    // atmosphere rim glow (light from upper-left, art bible §1)
    var ag = g.createRadialGradient(x, y, r * 0.9, x, y, r * 1.16);
    ag.addColorStop(0, "rgba(0,0,0,0)");
    ag.addColorStop(0.55, h[2] + "");
    ag.addColorStop(1, "rgba(0,0,0,0)");
    g.save();
    g.globalAlpha = 0.22;
    g.fillStyle = ag;
    g.beginPath(); g.arc(x, y, r * 1.16, 0, Math.PI * 2); g.fill();
    g.restore();
    // body
    var pg = g.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r * 1.05);
    pg.addColorStop(0, h[0]);
    pg.addColorStop(0.72, h[1]);
    pg.addColorStop(1, "#0A0C10");
    g.fillStyle = pg;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    // surface detail variants (clipped to the disc)
    g.save();
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.clip();
    var variant = rng.next();
    if (variant < 0.4) { // latitude banding: arcs that follow the sphere
      for (var b = 0; b < 7; b++) {
        var lat = -0.8 + (b + 0.5) * (1.6 / 7); // -1..1 across the disc
        var by = y + lat * r;
        var bandRy = r * (0.35 + 0.25 * Math.abs(lat)); // more curve near poles
        g.strokeStyle = "rgba(" + (b % 2 ? "255,255,255" : "0,0,0") + ",0.07)";
        g.lineWidth = r * (0.09 + rng.next() * 0.08);
        g.beginPath();
        g.ellipse(x, by - bandRy * (lat < 0 ? -0.5 : 0.5) * 0.4, r * 0.98, bandRy, 0, lat < 0 ? Math.PI : 0, lat < 0 ? Math.PI * 2 : Math.PI);
        g.stroke();
      }
    } else if (variant < 0.75) { // craters
      for (var c = 0; c < 14; c++) {
        var ca = rng.next() * Math.PI * 2, cd = Math.sqrt(rng.next()) * r * 0.85;
        var cx2 = x + Math.cos(ca) * cd, cy2 = y + Math.sin(ca) * cd;
        var cr = 2 + rng.next() * r * 0.08;
        g.fillStyle = "rgba(0,0,0,0.18)";
        g.beginPath(); g.arc(cx2, cy2, cr, 0, Math.PI * 2); g.fill();
        g.fillStyle = "rgba(255,255,255,0.08)";
        g.beginPath(); g.arc(cx2 - cr * 0.3, cy2 - cr * 0.3, cr * 0.5, 0, Math.PI * 2); g.fill();
      }
    } else { // night-side city lights
      for (var n2 = 0; n2 < 60; n2++) {
        var na = rng.next() * Math.PI - Math.PI / 2;
        var nd = (0.55 + rng.next() * 0.4) * r;
        g.fillStyle = "rgba(255,214,140," + (0.10 + rng.next() * 0.20) + ")";
        g.fillRect(x + Math.cos(na) * nd, y + Math.sin(na) * nd, 1.6, 1.6);
      }
    }
    // speckle
    for (var i = 0; i < r; i++) {
      var a = rng.next() * Math.PI * 2, rr = Math.sqrt(rng.next()) * r * 0.95;
      g.fillStyle = "rgba(255,255,255,0.05)";
      g.fillRect(x + Math.cos(a) * rr, y + Math.sin(a) * rr, 2, 2);
    }
    g.restore();
    if (hasRing) { // near half of the ring passes in FRONT of the disc
      g.strokeStyle = "rgba(210,200,170,0.4)";
      g.lineWidth = r * 0.1;
      g.beginPath();
      g.ellipse(x, y, r * 1.6, r * 0.4, -0.4, 0, Math.PI);
      g.stroke();
    }
  }
  function drawGalaxy(g, x, y, r, rng, strength) {
    strength = strength == null ? 1 : strength;
    var gg = g.createRadialGradient(x, y, 5, x, y, r);
    gg.addColorStop(0, "rgba(255,240,220," + 0.5 * strength + ")");
    gg.addColorStop(0.4, "rgba(190,170,220," + 0.18 * strength + ")");
    gg.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gg;
    g.beginPath(); g.ellipse(x, y, r, r * 0.55, 0.6, 0, Math.PI * 2); g.fill();
    // arms: soft luminous blobs along the spiral (no hard dotted line),
    // with faint star grains sprinkled inside them
    for (var arm = 0; arm < 2; arm++) {
      for (var i = 0; i < 26; i++) {
        var th = i * 0.3 + arm * Math.PI;
        var rr = 8 + i * (r / 30);
        var bx = x + Math.cos(th) * rr;
        var by = y + Math.sin(th) * rr * 0.55;
        var br = r * (0.05 + i * 0.004);
        var bg2 = g.createRadialGradient(bx, by, 1, bx, by, br);
        bg2.addColorStop(0, "rgba(235,222,255," + Math.max(0, 0.16 - i * 0.004) * strength + ")");
        bg2.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = bg2;
        g.beginPath(); g.arc(bx, by, br, 0, Math.PI * 2); g.fill();
        if (rng && rng.chance(40)) {
          g.fillStyle = "rgba(255,255,255," + 0.25 * strength + ")";
          g.fillRect(bx + (rng.next() - 0.5) * br, by + (rng.next() - 0.5) * br, 1.4, 1.4);
        }
      }
    }
  }
  function drawRock(g, x, y, r, rng) {
    g.save();
    g.translate(x, y);
    g.rotate(rng.next() * Math.PI * 2);
    g.beginPath();
    var verts = 7;
    for (var i = 0; i < verts; i++) {
      var a = (i / verts) * Math.PI * 2;
      var rr = r * (0.7 + rng.next() * 0.5);
      if (i === 0) g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    g.closePath();
    g.fillStyle = "#4E4B45";
    g.fill();
    g.strokeStyle = "#22211E";
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = "rgba(255,255,255,0.08)";
    g.beginPath(); g.arc(-r * 0.25, -r * 0.3, r * 0.3, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  var _hangarCache = null;
  function hangarBackground(ctx, W, H) {
    // bright, busy dock interior (art bible §2: hangar mids 38-50%)
    if (_hangarCache && _hangarCache.width === W) {
      ctx.drawImage(_hangarCache, 0, 0);
      return;
    }
    var c = document.createElement("canvas");
    c.width = W; c.height = H;
    var g2 = c.getContext("2d");
    var rng = new RngStream(777);
    // lit wall
    var g = g2.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#57534B");
    g.addColorStop(0.55, "#454138");
    g.addColorStop(0.8, "#38342C");
    g.addColorStop(1, "#2A2722");
    g2.fillStyle = g;
    g2.fillRect(0, 0, W, H);
    // wall panel grid with per-panel value variation
    var pw = 160, ph = 110;
    for (var py = 0; py < H * 0.8; py += ph) {
      for (var px = -40; px < W; px += pw) {
        var v = rng.next() * 0.14 - 0.05;
        g2.fillStyle = v >= 0 ? "rgba(255,255,255," + v + ")" : "rgba(0,0,0," + (-v) + ")";
        g2.fillRect(px + 3, py + 3, pw - 6, ph - 6);
        g2.strokeStyle = "rgba(20,19,17,0.45)";
        g2.lineWidth = 2;
        g2.strokeRect(px + 3, py + 3, pw - 6, ph - 6);
        // occasional lit window / status panel (kept dim: focus stays on the ship)
        if (rng.chance(9)) {
          g2.fillStyle = rng.chance(50) ? "rgba(255,200,120,0.28)" : "rgba(140,220,160,0.22)";
          g2.fillRect(px + pw * 0.3, py + ph * 0.3, pw * 0.34, ph * 0.28);
        }
      }
    }
    // deck floor
    var fg = g2.createLinearGradient(0, H * 0.78, 0, H);
    fg.addColorStop(0, "#5E5A50");
    fg.addColorStop(1, "#3A362E");
    g2.fillStyle = fg;
    g2.fillRect(0, H * 0.78, W, H * 0.22);
    g2.strokeStyle = "rgba(20,19,17,0.4)";
    for (var fl = 0; fl < 9; fl++) { // perspective floor seams
      var fx = W * (fl / 8);
      g2.beginPath();
      g2.moveTo(fx, H);
      g2.lineTo(W / 2 + (fx - W / 2) * 0.7, H * 0.78);
      g2.stroke();
    }
    // caution stripes at floor edge
    for (var cs = 0; cs < W; cs += 48) {
      g2.fillStyle = cs % 96 === 0 ? "rgba(207,124,32,0.75)" : "rgba(26,26,24,0.75)";
      g2.beginPath();
      g2.moveTo(cs, H * 0.78); g2.lineTo(cs + 24, H * 0.78);
      g2.lineTo(cs + 12, H * 0.796); g2.lineTo(cs - 12, H * 0.796);
      g2.closePath(); g2.fill();
    }
    // heavy girders (diagonal trusses)
    g2.strokeStyle = "rgba(30,28,25,0.85)";
    g2.lineWidth = 16;
    for (var i = 0; i < 5; i++) {
      var x = (i + 0.5) * W / 5;
      g2.beginPath();
      g2.moveTo(x - 90, 0); g2.lineTo(x + 60, H * 0.78);
      g2.stroke();
    }
    g2.strokeStyle = "rgba(112,106,94,0.6)";
    g2.lineWidth = 12;
    for (var i2 = 0; i2 < 5; i2++) {
      var x2 = (i2 + 0.5) * W / 5 - 6;
      g2.beginPath();
      g2.moveTo(x2 - 90, 0); g2.lineTo(x2 + 60, H * 0.78);
      g2.stroke();
      // cross braces
      g2.lineWidth = 5;
      for (var br = 1; br < 4; br++) {
        var byy = H * 0.78 * br / 4;
        g2.beginPath();
        g2.moveTo(x2 - 90 + (150 * br / 4) - 40, byy - 40);
        g2.lineTo(x2 - 90 + (150 * br / 4) + 40, byy + 40);
        g2.stroke();
      }
      g2.lineWidth = 12;
    }
    // pipes + cable runs along the top
    for (var pp = 0; pp < 3; pp++) {
      var pyy = 26 + pp * 22;
      g2.strokeStyle = pp === 1 ? "rgba(140,110,70,0.8)" : "rgba(96,92,84,0.8)";
      g2.lineWidth = 8 - pp * 2;
      g2.beginPath();
      g2.moveTo(0, pyy);
      for (var sx2 = 0; sx2 <= W; sx2 += W / 8) {
        g2.lineTo(sx2, pyy + (sx2 / W * 7919 % 13) - 6);
      }
      g2.stroke();
    }
    // hanging work lamps with warm pools of light
    for (var s = 0; s < 4; s++) {
      var sx = (s + 0.5) * W / 4;
      g2.strokeStyle = "rgba(30,28,25,0.9)";
      g2.lineWidth = 3;
      g2.beginPath(); g2.moveTo(sx, 0); g2.lineTo(sx, 64); g2.stroke();
      g2.fillStyle = "#2E2B26";
      g2.fillRect(sx - 22, 64, 44, 14);
      g2.fillStyle = "rgba(255,214,140,0.95)";
      g2.fillRect(sx - 16, 74, 32, 5);
      var sg = g2.createRadialGradient(sx, 80, 20, sx, 80, H * 0.85);
      sg.addColorStop(0, "rgba(255,200,120,0.30)");
      sg.addColorStop(1, "rgba(0,0,0,0)");
      g2.fillStyle = sg;
      g2.fillRect(0, 0, W, H);
    }
    // distant gantry crane silhouette
    g2.fillStyle = "rgba(26,25,22,0.55)";
    g2.fillRect(W * 0.06, H * 0.1, W * 0.02, H * 0.68);
    g2.fillRect(W * 0.02, H * 0.1, W * 0.24, H * 0.03);
    g2.fillRect(W * 0.22, H * 0.13, W * 0.015, H * 0.2);
    _hangarCache = c;
    ctx.drawImage(c, 0, 0);
  }

  // -------------------------------------------------------------------------
  // Hull silhouettes (§16.3): parameterized generator per style, cached.
  // -------------------------------------------------------------------------
  var hullStyles = {
    kestrel:  { trim: P.hullTrimOrange, nacelles: 2, wing: "swept", body: "spine" },
    kestrel2: { trim: "#B4443C", nacelles: 2, wing: "swept", body: "spine" },
    engi:     { trim: P.hullTrimTeal, nacelles: 1, wing: "ring", body: "pod" },
    fed:      { trim: P.hullTrimOrange, nacelles: 3, wing: "delta", body: "spine" },
    zoltan:   { trim: "#9BD34C", nacelles: 1, wing: "oval", body: "pod" },
    mantis:   { trim: "#8C4CD3", nacelles: 2, wing: "claw", body: "spine" },
    slug:     { trim: "#C77BD1", nacelles: 1, wing: "oval", body: "pod" },
    rock:     { trim: "#C1502E", nacelles: 2, wing: "slab", body: "slab" },
    stealth:  { trim: "#4C7ED3", nacelles: 2, wing: "swept", body: "dart" },
    crystal:  { trim: "#7BD1C7", nacelles: 2, wing: "shard", body: "dart" },
    rebel:    { trim: "#C9A227", nacelles: 2, wing: "delta", body: "spine" },
    pirate:   { trim: "#8A8A2E", nacelles: 2, wing: "claw", body: "spine" },
    mantisE:  { trim: "#8C4CD3", nacelles: 2, wing: "claw", body: "spine" },
    engiE:    { trim: P.hullTrimTeal, nacelles: 1, wing: "ring", body: "pod" },
    zoltanE:  { trim: "#9BD34C", nacelles: 1, wing: "oval", body: "pod" },
    rockE:    { trim: "#C1502E", nacelles: 2, wing: "slab", body: "slab" },
    slugE:    { trim: "#C77BD1", nacelles: 1, wing: "oval", body: "pod" },
    auto:     { trim: "#C93B3B", nacelles: 0, wing: "cross", body: "drone" },
    boss:     { trim: "#C93B3B", nacelles: 4, wing: "fortress", body: "slab" }
  };

  var hullCache = {};
  // Draw hull behind a room grid of pixel size (w,h). Anchored at (0,0)-(w,h).
  function drawHull(ctx, style, w, h, facing) {
    var key = style + "|" + Math.round(w) + "x" + Math.round(h) + "|" + facing;
    var c = hullCache[key];
    if (!c) {
      c = document.createElement("canvas");
      // pad must cover full wing extents or silhouettes clip flat at the edge
      var pad = Math.ceil(Math.max(80, h * 0.8, w * 0.3));
      c.width = w + pad * 2; c.height = h + pad * 2;
      c._pad = pad;
      renderHull(c.getContext("2d"), hullStyles[style] || hullStyles.pirate, w, h, pad, facing);
      var keys = Object.keys(hullCache);
      if (keys.length > 24) delete hullCache[keys[0]];
      hullCache[key] = c;
    }
    ctx.drawImage(c, -c._pad, -c._pad);
  }

  // Draw a ship's exterior into the box (0,0)-(w,h): installed PNG sprite
  // when available (aspect-fit, centered), procedural hull otherwise.
  // Used by menus/lists; in-flight ships go through drawShip.
  function drawHullOrSprite(ctx, style, w, h, facing) {
    var spr = (typeof Assets !== "undefined") ? Assets.shipSprite(style) : null;
    if (spr) {
      var fit = Math.min(w / spr.w, h / spr.h);
      var sw = spr.w * fit, sh = spr.h * fit;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      if (facing === "left") {
        ctx.translate(w / 2, h / 2);
        ctx.scale(-1, 1);
        ctx.translate(-w / 2, -h / 2);
      }
      ctx.drawImage(spr.img, (w - sw) / 2, (h - sh) / 2, sw, sh);
      ctx.restore();
    } else {
      drawHull(ctx, style, w, h, facing || "right");
    }
  }

  function renderHull(g, st, w, h, pad, facing) {
    g.save();
    g.translate(pad, pad);
    if (facing === "left") { g.translate(w, 0); g.scale(-1, 1); }
    var cx = w / 2, cy = h / 2;
    // Body always ENCLOSES the room rect (0..w, 0..h) with margin, so the
    // interior never overhangs the silhouette.
    var mX = Math.max(14, w * 0.05);   // side margin
    var mY = Math.max(14, h * 0.16);   // top/bottom margin
    var top = -mY, bot = h + mY, left = -mX, right = w + mX;
    var nose = right + Math.max(26, w * 0.16);
    g.lineJoin = "round";
    g.lineWidth = 4;
    g.strokeStyle = "#141311";
    var grad = g.createLinearGradient(0, top - 20, 0, bot + 20);
    grad.addColorStop(0, "#C9C5BD");
    grad.addColorStop(0.5, P.shipHullGray);
    grad.addColorStop(1, "#57544E");
    g.fillStyle = grad;

    function poly(pts) {
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.closePath();
      g.fill(); g.stroke();
    }

    // ---- wings first (behind body): darker fill so the body reads in front --
    var wingGrad = g.createLinearGradient(0, top - h * 0.6, 0, bot + h * 0.6);
    wingGrad.addColorStop(0, "#A8A49C");
    wingGrad.addColorStop(0.5, "#6E6B64");
    wingGrad.addColorStop(1, "#494640");
    g.fillStyle = wingGrad;
    var wTop = top, wBot = bot;
    if (st.wing === "swept") {
      poly([[w * 0.16, wTop + 4], [w * 0.38, wTop - h * 0.5], [w * 0.60, wTop - h * 0.42], [w * 0.52, wTop + 8]]);
      poly([[w * 0.16, wBot - 4], [w * 0.38, wBot + h * 0.5], [w * 0.60, wBot + h * 0.42], [w * 0.52, wBot - 8]]);
    } else if (st.wing === "delta") {
      poly([[w * 0.18, wTop + 6], [w * 0.04, wTop - h * 0.5], [w * 0.52, wTop + 6]]);
      poly([[w * 0.18, wBot - 6], [w * 0.04, wBot + h * 0.5], [w * 0.52, wBot - 6]]);
    } else if (st.wing === "claw") {
      poly([[w * 0.34, wTop + 6], [w * 0.66, wTop - h * 0.55], [w * 0.9, wTop - h * 0.34], [w * 0.62, wTop + 8]]);
      poly([[w * 0.34, wBot - 6], [w * 0.66, wBot + h * 0.55], [w * 0.9, wBot + h * 0.34], [w * 0.62, wBot - 8]]);
    } else if (st.wing === "ring") {
      g.beginPath();
      g.ellipse(cx, cy, w * 0.62 + mX, h * 0.62 + mY, 0, 0, Math.PI * 2);
      g.lineWidth = 10;
      g.stroke();
      g.lineWidth = 4;
    } else if (st.wing === "slab") {
      poly([[w * 0.14, wTop + 6], [w * 0.2, wTop - h * 0.4], [w * 0.8, wTop - h * 0.4], [w * 0.86, wTop + 6]]);
      poly([[w * 0.14, wBot - 6], [w * 0.2, wBot + h * 0.4], [w * 0.8, wBot + h * 0.4], [w * 0.86, wBot - 6]]);
    } else if (st.wing === "shard") {
      poly([[w * 0.3, wTop + 6], [w * 0.52, wTop - h * 0.6], [w * 0.68, wTop + 6]]);
      poly([[w * 0.3, wBot - 6], [w * 0.52, wBot + h * 0.6], [w * 0.68, wBot - 6]]);
    } else if (st.wing === "cross") {
      poly([[cx - 9, wTop - h * 0.45], [cx + 9, wTop - h * 0.45], [cx + 9, wBot + h * 0.45], [cx - 9, wBot + h * 0.45]]);
    } else if (st.wing === "fortress") {
      poly([[w * 0.04, wTop + 8], [-w * 0.02, wTop - h * 0.6], [w * 0.9, wTop - h * 0.5], [w * 0.96, wTop + 8]]);
      poly([[w * 0.04, wBot - 8], [-w * 0.02, wBot + h * 0.6], [w * 0.9, wBot + h * 0.5], [w * 0.96, wBot - 8]]);
    } else if (st.wing === "oval") {
      g.beginPath();
      g.ellipse(cx, cy, w * 0.56 + mX, h * 0.68 + mY, 0, 0, Math.PI * 2);
      g.fill(); g.stroke();
    }

    // ---- nacelles (rear, tucked against the body) ----
    for (var n = 0; n < st.nacelles; n++) {
      var frac = st.nacelles === 1 ? 0.5 : n / (st.nacelles - 1);
      var ny = top + 10 + frac * (bot - top - 20);
      var nx0 = left - Math.max(22, w * 0.12);
      poly([[nx0, ny - 12], [left + 14, ny - 17], [left + 14, ny + 17], [nx0, ny + 12]]);
      var eg = g.createRadialGradient(nx0, ny, 2, nx0, ny, 24);
      eg.addColorStop(0, "rgba(255,220,120,0.95)");
      eg.addColorStop(1, "rgba(255,120,20,0)");
      g.fillStyle = eg;
      g.beginPath(); g.arc(nx0 - 2, ny, 24, 0, Math.PI * 2); g.fill();
      g.fillStyle = grad;
    }

    // ---- main body: encloses the interior ----
    if (st.body === "pod") {
      g.beginPath();
      g.ellipse(cx + 4, cy, (w / 2) + mX + 8, (h / 2) + mY + 4, 0, 0, Math.PI * 2);
      g.fill(); g.stroke();
      poly([[right - 6, cy - h * 0.18], [nose, cy - h * 0.1], [nose + 8, cy], [nose, cy + h * 0.1], [right - 6, cy + h * 0.18]]);
    } else if (st.body === "slab") {
      poly([[left - 6, top - 4], [right, top - 8], [nose + 6, cy - h * 0.2], [nose + 6, cy + h * 0.2], [right, bot + 8], [left - 6, bot + 4], [left - 16, cy]]);
    } else if (st.body === "dart") {
      poly([[left - 4, top + h * 0.12], [w * 0.7, top - 6], [nose + 10, cy], [w * 0.7, bot + 6], [left - 4, bot - h * 0.12]]);
    } else if (st.body === "drone") {
      poly([[left - 14, cy], [cx, top - h * 0.28], [nose, cy], [cx, bot + h * 0.28]]);
    } else { // spine: rounded prow, tapered tail
      poly([
        [left - 4, top + h * 0.10], [w * 0.22, top - 6], [w * 0.78, top - 2],
        [right + 6, cy - h * 0.26], [nose, cy - h * 0.10], [nose + 6, cy],
        [nose, cy + h * 0.10], [right + 6, cy + h * 0.26],
        [w * 0.78, bot + 2], [w * 0.22, bot + 6], [left - 4, bot - h * 0.10]
      ]);
    }

    // ---- plating seams + rivets (subtle detail) ----
    g.save();
    g.strokeStyle = "rgba(20,19,17,0.35)";
    g.lineWidth = 2;
    var seams = [cy - h * 0.34, cy + h * 0.34];
    for (var sm = 0; sm < seams.length; sm++) {
      g.beginPath();
      g.moveTo(left + w * 0.06, seams[sm]);
      g.lineTo(right - w * 0.04, seams[sm]);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(w * 0.30, top + 4); g.lineTo(w * 0.30, bot - 4);
    g.moveTo(w * 0.62, top + 4); g.lineTo(w * 0.62, bot - 4);
    g.stroke();
    g.fillStyle = "rgba(20,19,17,0.30)";
    for (var rv = 0; rv < 7; rv++) {
      g.fillRect(left + w * 0.1 + rv * w * 0.12, cy - 1.5, 3, 3);
    }
    g.restore();

    // ---- greebles + weathering (art bible §5: 3-7 per ship, deterministic) --
    var grng = new RngStream(hashStr(st.trim + st.body + st.wing));
    g.save();
    // vent clusters (dark slats, upper-left light: bright top edge)
    var ventN = 1 + Math.floor(grng.next() * 2);
    for (var vc = 0; vc < ventN; vc++) {
      var vx = left + w * (0.18 + grng.next() * 0.5);
      var vy2 = grng.chance(50) ? top + h * 0.1 : bot - h * 0.22;
      for (var sl2 = 0; sl2 < 4; sl2++) {
        g.fillStyle = "rgba(20,19,17,0.5)";
        g.fillRect(vx + sl2 * 7, vy2, 4, h * 0.12);
        g.fillStyle = "rgba(255,255,255,0.18)";
        g.fillRect(vx + sl2 * 7, vy2, 4, 2);
      }
    }
    // hatches (circle + cross, top-left highlight)
    var hatchN = 1 + Math.floor(grng.next() * 2);
    for (var ht = 0; ht < hatchN; ht++) {
      var hx = left + w * (0.25 + grng.next() * 0.45);
      var hy = cy + (grng.next() - 0.5) * h * 0.7;
      var hr = 6 + grng.next() * 5;
      g.fillStyle = "rgba(0,0,0,0.16)";
      g.beginPath(); g.arc(hx + 1.5, hy + 1.5, hr, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "rgba(20,19,17,0.6)";
      g.lineWidth = 2;
      g.beginPath(); g.arc(hx, hy, hr, 0, Math.PI * 2); g.stroke();
      g.beginPath();
      g.moveTo(hx - hr, hy); g.lineTo(hx + hr, hy);
      g.moveTo(hx, hy - hr); g.lineTo(hx, hy + hr);
      g.stroke();
      g.strokeStyle = "rgba(255,255,255,0.25)";
      g.lineWidth = 1;
      g.beginPath(); g.arc(hx, hy, hr, Math.PI * 0.8, Math.PI * 1.6); g.stroke();
    }
    // antenna near the nose (rooted with a visible joint mount)
    g.strokeStyle = "rgba(20,19,17,0.85)";
    g.lineWidth = 3;
    var anx = right - w * 0.06, any2 = grng.chance(50) ? top + 4 : bot - 4;
    var anLen = 14 + grng.next() * 12;
    g.beginPath();
    g.moveTo(anx, any2 + (any2 < cy ? 4 : -4));
    g.lineTo(anx + 6, any2 + (any2 < cy ? -anLen : anLen));
    g.stroke();
    g.fillStyle = "#3A3833";
    g.beginPath();
    g.arc(anx, any2 + (any2 < cy ? 3 : -3), 4.5, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "rgba(20,19,17,0.6)";
    g.lineWidth = 1.5;
    g.stroke();
    g.fillStyle = "rgba(255,120,90,0.9)";
    g.fillRect(anx + 4, any2 + (any2 < cy ? -anLen - 3 : anLen), 4, 4);
    // scorch streaks trailing aft of the nacelles (weathering)
    for (var sc = 0; sc < st.nacelles; sc++) {
      var frac2 = st.nacelles === 1 ? 0.5 : sc / (st.nacelles - 1);
      var sy2 = top + 10 + frac2 * (bot - top - 20);
      var sg2 = g.createLinearGradient(left + 10, 0, left + w * 0.3, 0);
      sg2.addColorStop(0, "rgba(30,24,18,0.4)");
      sg2.addColorStop(1, "rgba(30,24,18,0)");
      g.fillStyle = sg2;
      g.beginPath();
      g.moveTo(left + 8, sy2 - 9);
      g.lineTo(left + w * (0.24 + grng.next() * 0.1), sy2 - 2);
      g.lineTo(left + w * (0.24 + grng.next() * 0.1), sy2 + 2);
      g.lineTo(left + 8, sy2 + 9);
      g.closePath();
      g.fill();
    }
    // family accent motifs
    if (st.trim === "#9BD34C") { // zoltan: luminous seam
      g.strokeStyle = "rgba(155,211,76,0.55)";
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(left + w * 0.1, cy);
      g.lineTo(right - w * 0.08, cy);
      g.stroke();
    } else if (st.trim === "#7BD1C7") { // crystal: translucent facets
      g.fillStyle = "rgba(123,209,199,0.20)";
      for (var fc = 0; fc < 3; fc++) {
        var fx2 = left + w * (0.2 + fc * 0.22);
        g.beginPath();
        g.moveTo(fx2, top + 8);
        g.lineTo(fx2 + 20, top + h * 0.3);
        g.lineTo(fx2 - 12, top + h * 0.34);
        g.closePath();
        g.fill();
      }
    } else if (st.body === "slab") { // rock: craggy chips along edges
      g.strokeStyle = "rgba(20,19,17,0.5)";
      g.lineWidth = 3;
      for (var ck = 0; ck < 5; ck++) {
        var kx = left + grng.next() * w;
        var ky = grng.chance(50) ? top + 2 : bot - 2;
        g.beginPath();
        g.moveTo(kx, ky);
        g.lineTo(kx + 8, ky + (ky < cy ? 7 : -7));
        g.lineTo(kx + 16, ky);
        g.stroke();
      }
    } else if (st.wing === "ring") { // engi: segment ticks on the ring
      g.strokeStyle = "rgba(20,19,17,0.55)";
      g.lineWidth = 3;
      for (var rt = 0; rt < 10; rt++) {
        var ra = rt / 10 * Math.PI * 2;
        var rrx = cx + Math.cos(ra) * (w * 0.62 + mX);
        var rry = cy + Math.sin(ra) * (h * 0.62 + mY);
        g.beginPath();
        g.moveTo(rrx - 4, rry - 4);
        g.lineTo(rrx + 4, rry + 4);
        g.stroke();
      }
    }
    g.restore();

    // ---- trim stripes ----
    g.fillStyle = st.trim;
    g.strokeStyle = "#141311";
    g.lineWidth = 2;
    g.fillRect(w * 0.14, top - 2, Math.max(10, w * 0.05), bot - top + 4);
    g.strokeRect(w * 0.14, top - 2, Math.max(10, w * 0.05), bot - top + 4);
    g.fillRect(w * 0.70, top + 2, Math.max(8, w * 0.035), bot - top - 4);
    g.strokeRect(w * 0.70, top + 2, Math.max(8, w * 0.035), bot - top - 4);

    // ---- nose plating: seams converging toward the prow ----
    g.strokeStyle = "rgba(20,19,17,0.3)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(right - w * 0.04, cy - h * 0.22);
    g.lineTo(nose - 4, cy - h * 0.05);
    g.moveTo(right - w * 0.04, cy + h * 0.22);
    g.lineTo(nose - 4, cy + h * 0.05);
    g.stroke();

    // ---- cockpit: domed glass lit from upper-left ----
    var ccx = right + Math.max(12, w * 0.07);
    var crx = Math.max(10, w * 0.05), cry = Math.max(10, h * 0.10);
    g.fillStyle = "#7FB8CC";
    g.beginPath();
    g.ellipse(ccx, cy, crx, cry, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.save();
    g.beginPath();
    g.ellipse(ccx, cy, crx, cry, 0, 0, Math.PI * 2);
    g.clip();
    // lower-right inner shade
    g.fillStyle = "rgba(20,40,60,0.45)";
    g.beginPath();
    g.ellipse(ccx + crx * 0.28, cy + cry * 0.3, crx, cry, 0, 0, Math.PI * 2);
    g.fill();
    // upper-left specular crescent
    g.strokeStyle = "rgba(255,255,255,0.75)";
    g.lineWidth = Math.max(2, crx * 0.22);
    g.beginPath();
    g.ellipse(ccx, cy, crx * 0.62, cry * 0.62, 0, Math.PI * 0.85, Math.PI * 1.55);
    g.stroke();
    // frame strut chord
    g.strokeStyle = "rgba(20,19,17,0.7)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(ccx - crx * 0.9, cy - cry * 0.25);
    g.lineTo(ccx + crx * 0.9, cy - cry * 0.25);
    g.stroke();
    g.restore();
    g.restore();
  }

  // -------------------------------------------------------------------------
  // Crew sprites (§16.3): 16x16 code-drawn pixel figures per race.
  // -------------------------------------------------------------------------
  var crewColors = {
    human: { body: "#C9862C", head: "#E8C39A", acc: "#4C7ED3" },
    engi: { body: "#9AA7A6", head: "#C8D4D2", acc: "#5EBA55" },
    mantis: { body: "#7A9E3B", head: "#5C7A28", acc: "#C13B3B" },
    rock: { body: "#8A6A4E", head: "#A8846A", acc: "#5A4632" },
    zoltan: { body: "#D9E86A", head: "#F4FFA8", acc: "#8CB43C" },
    slug: { body: "#B57BC7", head: "#D9A8E8", acc: "#7A4E8A" },
    crystal: { body: "#7BD1C7", head: "#B0F0E8", acc: "#3C8A82" },
    drone: { body: "#9AA7A6", head: "#666F6E", acc: "#C9862C" },
    intruder: { body: "#B4443C", head: "#E8C39A", acc: "#57544E" }
  };

  var spriteCache = {};
  function crewSprite(race, frame, hostile, isDrone) {
    var key = race + "|" + frame + "|" + (hostile ? 1 : 0) + "|" + (isDrone ? 1 : 0);
    var c = spriteCache[key];
    if (c) return c;
    c = document.createElement("canvas");
    c.width = 16; c.height = 16;
    var g = c.getContext("2d");
    var col = isDrone ? crewColors.drone : crewColors[race] || crewColors.human;
    if (hostile && race === "human") col = crewColors.intruder;
    function px(x, y, w, h, color) { g.fillStyle = color; g.fillRect(x, y, w, h); }
    var legShift = frame % 2 === 0 ? 0 : 1;
    if (isDrone) {
      px(5, 4, 6, 7, col.body);
      px(6, 2, 4, 2, col.head);
      px(4, 6, 1, 3, col.acc); px(11, 6, 1, 3, col.acc);
      px(6, 11, 2, 3, "#57544E"); px(9, 11, 2, 3, "#57544E");
      px(7, 0, 2, 2, col.acc);
    } else if (race === "engi") { // squat dome robot-like
      px(4, 5, 8, 6, col.body);
      px(5, 2, 6, 4, col.head);
      px(6, 3, 1, 1, "#222"); px(9, 3, 1, 1, "#222");
      px(3 + legShift, 11, 3, 3, col.body); px(9 + legShift, 11, 3, 3, col.body);
      px(7, 6, 2, 2, col.acc);
    } else if (race === "mantis") { // angular insectoid
      px(6, 4, 4, 7, col.body);
      px(5, 1, 6, 4, col.head);
      px(5, 1, 1, 2, col.acc); px(10, 1, 1, 2, col.acc);
      px(3, 4, 2, 5, col.body); px(11, 4, 2, 5, col.body); // claw arms
      px(2, 3, 2, 2, col.acc); px(12, 3, 2, 2, col.acc);
      px(5 + legShift, 11, 2, 4, col.body); px(9 - legShift, 11, 2, 4, col.body);
    } else if (race === "rock") { // wide stone block
      px(3, 3, 10, 9, col.body);
      px(5, 1, 6, 3, col.head);
      px(6, 2, 1, 1, "#222"); px(9, 2, 1, 1, "#222");
      px(4, 5, 2, 2, col.acc); px(10, 7, 2, 2, col.acc);
      px(4 + legShift, 12, 3, 3, col.body); px(9 + legShift, 12, 3, 3, col.body);
    } else if (race === "zoltan") { // glowing silhouette
      px(5, 4, 6, 7, col.body);
      px(6, 1, 4, 4, col.head);
      px(6 + legShift, 11, 2, 4, col.body); px(8 - legShift, 11, 2, 4, col.body);
      g.fillStyle = "rgba(244,255,168,0.5)";
      g.fillRect(4, 0, 8, 15);
    } else if (race === "slug") { // gastropod blob
      px(4, 6, 9, 6, col.body);
      px(9, 2, 5, 6, col.head);
      px(10, 3, 1, 1, "#222"); px(12, 3, 1, 1, "#222");
      px(4, 12, 10 - legShift, 2, col.acc);
    } else if (race === "crystal") { // faceted biped
      px(5, 4, 6, 7, col.body);
      px(6, 1, 4, 4, col.head);
      px(4, 2, 2, 3, col.acc); px(10, 2, 2, 3, col.acc); // shoulder shards
      px(7, 0, 2, 2, col.head);
      px(5 + legShift, 11, 2, 4, col.body); px(9 - legShift, 11, 2, 4, col.body);
    } else { // human: helmeted humanoid
      px(5, 5, 6, 6, col.body);
      px(5, 1, 6, 5, col.head);
      px(5, 3, 6, 1, col.acc);
      px(6, 2, 1, 1, "#222"); px(9, 2, 1, 1, "#222");
      px(4, 6, 1, 4, col.body); px(11, 6, 1, 4, col.body);
      px(5 + legShift, 11, 2, 4, "#3A3A3A"); px(9 - legShift, 11, 2, 4, "#3A3A3A");
    }
    spriteCache[key] = c;
    return c;
  }

  // -------------------------------------------------------------------------
  // Ship interior: rooms, doors, crew, fires, breaches (§16.3)
  // Renders the ship (hull + rooms) with origin at ox,oy and tile size ts.
  // -------------------------------------------------------------------------
  function drawShip(ctx, ship, ox, oy, ts, opts) {
    opts = opts || {};
    var i, j, room;
    var b = ship.bounds;
    ctx.save();
    ctx.translate(ox, oy);
    if (ship.cloakActive > 0) ctx.globalAlpha = 0.35;

    // soft occlusion shadow separates the ship from the starfield
    if (!opts.noHull && !opts.noShadow) {
      var scx = (b.x + b.w / 2) * ts, scy = (b.y + b.h / 2) * ts;
      var srx = (b.w / 2 + 2.6) * ts, sry = (b.h / 2 + 2.2) * ts;
      var sg = ctx.createRadialGradient(scx, scy, ts, scx, scy, Math.max(srx, sry));
      sg.addColorStop(0, "rgba(0,0,0,0.5)");
      sg.addColorStop(0.7, "rgba(0,0,0,0.28)");
      sg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.ellipse(scx, scy, srx, sry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // sprite fit transform (shared by flames + hull draw)
    var spr = (typeof Assets !== "undefined") ? Assets.shipSprite(ship.hullStyle) : null;
    var sprFit = null;
    if (spr) {
      var boxW0 = (b.w + 2) * ts, boxH0 = (b.h + 2) * ts;
      var fitS = Math.min((boxW0 * 1.34) / spr.w, (boxH0 * 1.3) / spr.h);
      sprFit = {
        fit: fitS, sw: spr.w * fitS, sh: spr.h * fitS,
        cx: (b.x - 1) * ts + boxW0 / 2, cy: (b.y - 1) * ts + boxH0 / 2
      };
    }

    // animated engine exhaust: structured layered flame anchored at the
    // hull's actual nozzles (sprite anchors when art is installed, procedural
    // nacelle math otherwise). Suppressed while docked (opts.noEngines).
    if (!opts.noHull && !ship.destroyed && !opts.noEngines) {
      var facingLeft = opts.facing === "left";
      var hw = (b.w + 2) * ts, hh = (b.h + 2) * ts;
      var flamePoints = [];
      if (spr && spr.anchors && spr.anchors.length && sprFit) {
        for (var ai = 0; ai < spr.anchors.length; ai++) {
          var an = spr.anchors[ai];
          var nozH = (an[2] || 8) * sprFit.fit;
          if (spr.anchors.length === 1 && nozH > ts * 1.1) {
            // one wide rear block: split into twin exhausts
            flamePoints.push({ ax: an[0], ay: an[1] - (an[2] || 8) * 0.26, h: nozH * 0.42 });
            flamePoints.push({ ax: an[0], ay: an[1] + (an[2] || 8) * 0.26, h: nozH * 0.42 });
          } else {
            flamePoints.push({ ax: an[0], ay: an[1], h: nozH });
          }
        }
        for (var fp = 0; fp < flamePoints.length; fp++) {
          var f2 = flamePoints[fp];
          var sxLocal = f2.ax * sprFit.fit;
          f2.x = facingLeft ? sprFit.cx + sprFit.sw / 2 - sxLocal : sprFit.cx - sprFit.sw / 2 + sxLocal;
          f2.y = sprFit.cy - sprFit.sh / 2 + f2.ay * sprFit.fit;
        }
      } else {
        var emY = Math.max(14, hh * 0.16), emX = Math.max(14, hw * 0.05);
        var hullX0 = (b.x - 1) * ts, hullY0 = (b.y - 1) * ts;
        var rootLocalX = -emX - Math.max(22, hw * 0.12);
        var eTop = -emY, eBot = hh + emY;
        for (var en0 = 0; en0 < 2; en0++) {
          flamePoints.push({
            x: hullX0 + (facingLeft ? hw - rootLocalX : rootLocalX),
            y: hullY0 + eTop + 10 + (en0 / 1) * (eBot - eTop - 20),
            h: ts * 0.84
          });
        }
      }
      for (var en = 0; en < flamePoints.length; en++) {
        var exRoot = flamePoints[en].x;
        var ey = flamePoints[en].y;
        var dirF = facingLeft ? 1 : -1; // exhaust points away from the nose
        var flick = 0.72 + 0.28 * Math.sin((opts.t || 0) * 13 + en * 2.1);
        var fl = Math.max(ts * 0.8, flamePoints[en].h * 1.6) * (0.8 + 0.35 * flick);
        var fw = Math.max(6, flamePoints[en].h * 0.5);
        // outer teardrop
        ctx.fillStyle = "rgba(214,84,30,0.85)";
        ctx.beginPath();
        ctx.moveTo(exRoot, ey - fw);
        ctx.quadraticCurveTo(exRoot + dirF * fl * 0.5, ey - fw * 0.7, exRoot + dirF * fl, ey);
        ctx.quadraticCurveTo(exRoot + dirF * fl * 0.5, ey + fw * 0.7, exRoot, ey + fw);
        ctx.closePath();
        ctx.fill();
        // yellow core
        ctx.fillStyle = "rgba(251,200,80,0.9)";
        ctx.beginPath();
        ctx.moveTo(exRoot, ey - fw * 0.55);
        ctx.quadraticCurveTo(exRoot + dirF * fl * 0.34, ey - fw * 0.35, exRoot + dirF * fl * 0.58, ey);
        ctx.quadraticCurveTo(exRoot + dirF * fl * 0.34, ey + fw * 0.35, exRoot, ey + fw * 0.55);
        ctx.closePath();
        ctx.fill();
        // white hotspot at the nozzle
        ctx.fillStyle = "rgba(255,255,235," + (0.75 * flick) + ")";
        ctx.beginPath();
        ctx.ellipse(exRoot + dirF * ts * 0.16, ey, ts * 0.2, fw * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        // ambient glow
        var eg2 = ctx.createRadialGradient(exRoot, ey, 2, exRoot, ey, fl);
        eg2.addColorStop(0, "rgba(255,180,80," + (0.28 * flick) + ")");
        eg2.addColorStop(1, "rgba(255,80,10,0)");
        ctx.fillStyle = eg2;
        ctx.beginPath();
        ctx.arc(exRoot + dirF * fl * 0.3, ey, fl, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // hull: PNG sprite when one is installed, procedural generator otherwise
    if (!opts.noHull) {
      if (spr && sprFit) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if ((opts.facing || "right") === "left") {
          ctx.translate(sprFit.cx, sprFit.cy);
          ctx.scale(-1, 1);
          ctx.translate(-sprFit.cx, -sprFit.cy);
        }
        ctx.drawImage(spr.img, sprFit.cx - sprFit.sw / 2, sprFit.cy - sprFit.sh / 2, sprFit.sw, sprFit.sh);
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(b.x * ts - ts, b.y * ts - ts);
        drawHull(ctx, ship.hullStyle, (b.w + 2) * ts, (b.h + 2) * ts, opts.facing || "right");
        ctx.restore();
      }
    }
    // mounted weapons: each installed weapon drawn at a hull-edge hardpoint
    // with a per-class firing animation (recoil, muzzle flash, emitter glow).
    if (!opts.noHull && !opts.noWeapons && ship.weapons && ship.weapons.length &&
        typeof Assets !== "undefined") {
      var facingL2 = (opts.facing || "right") === "left";
      var fwd = facingL2 ? -1 : 1;
      var mounts = [];
      if (spr && spr.mounts && spr.mounts.length && sprFit) {
        for (var mi = 0; mi < spr.mounts.length; mi++) {
          var mm = spr.mounts[mi];
          var mxL = mm[0] * sprFit.fit;
          mounts.push({
            x: facingL2 ? sprFit.cx + sprFit.sw / 2 - mxL : sprFit.cx - sprFit.sw / 2 + mxL,
            y: sprFit.cy - sprFit.sh / 2 + mm[1] * sprFit.fit + 2
          });
        }
      } else {
        for (var mi2 = 0; mi2 < 4; mi2++) {
          mounts.push({ x: (b.x + b.w * (0.22 + 0.21 * mi2)) * ts, y: (b.y - 0.55) * ts });
        }
      }
      if (facingL2) mounts.reverse(); // keep slot 1 nearest the nose
      ship._mountTips = [];
      var wsc = ts / 38; // weapon art is authored for the 44px tile view (drawn ~16% up for presence)
      for (var wi = 0; wi < ship.weapons.length; wi++) {
        var slot2 = ship.weapons[wi];
        var mnt = mounts[wi % mounts.length];
        var stack = Math.floor(wi / mounts.length); // >4 weapons: stack upward
        var wspr = Assets.weaponSprite(slot2.id);
        var wW = (wspr ? wspr.w : 46) * wsc, wH = (wspr ? wspr.h : 30) * wsc;
        var mY = mnt.y - stack * wH * 0.55;
        var anim = slot2.fireAnimT || 0;
        var animDur = slot2.def.cls === "beam" ? 0.6 : 0.35;
        var kick = anim > 0 && slot2.def.cls !== "beam" && slot2.def.cls !== "bomb"
          ? Math.sin(Math.min(1, anim / animDur) * Math.PI) * 4.5 * wsc : 0;
        var tipX = mnt.x + fwd * wW * 0.44, tipY = mY - wH * 0.52;
        ship._mountTips[wi] = { lx: tipX, ly: tipY };
        // ready pulse under the hardpoint
        if (slot2.powered && slot2.ready && slot2.ready()) {
          var pulse = 0.35 + 0.2 * Math.sin((opts.t || 0) * 6 + wi);
          ctx.fillStyle = "rgba(125,247,128," + pulse * 0.35 + ")";
          ctx.beginPath();
          ctx.ellipse(mnt.x, mY - wH * 0.4, wW * 0.5, wH * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        if (wspr) {
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          ctx.translate(mnt.x - fwd * kick, mY);
          if (facingL2) ctx.scale(-1, 1);
          ctx.drawImage(wspr.img, -wW / 2, -wH, wW, wH);
          ctx.restore();
        } else {
          // procedural hardpoint: small class-tinted gun silhouette
          var wcol = slot2.def.cls === "missile" ? "#8A4A42" : slot2.def.cls === "ion" ? "#3D6E8A" :
                     slot2.def.cls === "bomb" ? "#6E4A8A" : slot2.def.cls === "railgun" ? "#3D808A" : "#5C5952";
          ctx.save();
          ctx.translate(mnt.x - fwd * kick, mY);
          ctx.fillStyle = wcol;
          ctx.fillRect(-wW * 0.3, -wH * 0.75, wW * 0.6, wH * 0.5);
          ctx.fillRect(fwd > 0 ? 0 : -wW * 0.5, -wH * 0.6, wW * 0.5, wH * 0.2);
          ctx.fillStyle = "#26251F";
          ctx.fillRect(-wW * 0.2, -wH * 0.25, wW * 0.4, wH * 0.25);
          ctx.restore();
        }
        // per-class firing FX at the barrel tip
        if (anim > 0) {
          var ph = anim / animDur; // 1 -> 0
          var cls2 = slot2.def.cls;
          var fxCol = cls2 === "ion" ? "#9ADCFF" : cls2 === "missile" ? "#FFC08A" :
                      cls2 === "railgun" ? "#9AE8FF" : cls2 === "bomb" ? "#D9A8FF" :
                      cls2 === "beam" ? "#FF6E5A" : "#FFE9A8";
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          if (cls2 === "beam") {
            // sustained emitter glow while the beam cuts
            var bg = ctx.createRadialGradient(tipX, tipY, 1, tipX, tipY, wW * 0.7 * ph + 4);
            bg.addColorStop(0, "rgba(255,140,110," + 0.9 * ph + ")");
            bg.addColorStop(1, "rgba(255,60,30,0)");
            ctx.fillStyle = bg;
            ctx.beginPath(); ctx.arc(tipX, tipY, wW * 0.7 * ph + 4, 0, Math.PI * 2); ctx.fill();
          } else if (ph > 0.55) {
            var fr = wW * (0.35 + 0.45 * (1 - ph) / 0.45);
            var fg = ctx.createRadialGradient(tipX, tipY, 1, tipX, tipY, fr);
            fg.addColorStop(0, fxCol);
            fg.addColorStop(1, "rgba(255,180,80,0)");
            ctx.globalAlpha = (ph - 0.55) / 0.45;
            ctx.fillStyle = fg;
            ctx.beginPath(); ctx.arc(tipX, tipY, fr, 0, Math.PI * 2); ctx.fill();
            // forward spike
            ctx.fillStyle = fxCol;
            ctx.fillRect(tipX, tipY - 1.5 * wsc, fwd * fr * 1.3, 3 * wsc);
          }
          ctx.restore();
        }
      }
    }

    if (opts.hideRooms) { ctx.restore(); return; }

    var sensors = opts.sensorLevel != null ? opts.sensorLevel : 3;

    for (i = 0; i < ship.rooms.length; i++) {
      room = ship.rooms[i];
      var rx = room.x * ts, ry = room.y * ts, rw = room.w * ts, rh = room.h * ts;
      var visible = sensors >= 1;
      // room floor
      ctx.fillStyle = visible ? P.roomFloorWhite : "#55524C";
      ctx.fillRect(rx, ry, rw, rh);
      // low O2 striping
      if (visible && room.o2 < 40 && !ship.automated) {
        var alpha = (40 - room.o2) / 40 * 0.4;
        ctx.fillStyle = "rgba(232,106,106," + alpha + ")";
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 2;
        for (var st = -rh; st < rw; st += 12) {
          ctx.beginPath();
          ctx.moveTo(rx + st, ry + rh);
          ctx.lineTo(rx + st + rh, ry);
          ctx.stroke();
        }
      }
      // tile grid
      ctx.strokeStyle = "rgba(120,118,110,0.6)";
      ctx.lineWidth = 1;
      for (j = 1; j < room.w; j++) {
        ctx.beginPath(); ctx.moveTo(rx + j * ts, ry); ctx.lineTo(rx + j * ts, ry + rh); ctx.stroke();
      }
      for (j = 1; j < room.h; j++) {
        ctx.beginPath(); ctx.moveTo(rx, ry + j * ts); ctx.lineTo(rx + rw, ry + j * ts); ctx.stroke();
      }
      // ambient occlusion: soft inner shadow grounds the floor
      if (visible) {
        ctx.strokeStyle = "rgba(40,38,32,0.18)";
        ctx.lineWidth = 5;
        ctx.strokeRect(rx + 3, ry + 3, rw - 6, rh - 6);
      }
      // room outline
      ctx.strokeStyle = "#26251F";
      ctx.lineWidth = 3;
      ctx.strokeRect(rx, ry, rw, rh);
      // lockdown crystal overlay
      if (room.lockdown > 0) {
        ctx.fillStyle = "rgba(123,209,199,0.45)";
        ctx.fillRect(rx, ry, rw, rh);
      }

      // system icon
      if (room.sys && visible) {
        var s = ship.sys(room.sys);
        var color = P.systemIconGreen;
        if (s) {
          if (s.effectiveLevel() === 0) color = P.dangerRed;
          else if (s.damage >= 1) color = P.fireOrange;
          else if (!s.def.sub && s.effectivePower() === 0) color = "#8A8A85";
        }
        var isz = Math.min(ts * 0.9, 26);
        Icons.drawIcon(ctx, room.sys, rx + rw / 2 - isz / 2, ry + rh / 2 - isz / 2, isz, color);
        if (s && s.ionSec > 0) {
          Icons.drawIcon(ctx, "ion", rx + rw / 2 - isz / 2, ry + rh / 2 - isz / 2, isz, P.ionBlue);
          var pips = Math.ceil(s.ionSec / 5);
          ctx.fillStyle = P.ionBlue;
          for (var ip = 0; ip < pips; ip++) ctx.fillRect(rx + 3 + ip * 6, ry + 3, 4, 4);
        }
        if (s && s.damage >= 1) {
          ctx.fillStyle = P.dangerRed;
          for (var dp = 0; dp < Math.floor(s.damage); dp++) ctx.fillRect(rx + rw - 7, ry + 3 + dp * 6, 4, 4);
        }
      }

      // breaches
      if (visible) for (j = 0; j < room.breaches.length; j++) {
        var brt = room.breaches[j].t;
        var bx = rx + (brt % room.w) * ts + ts / 2, by = ry + Math.floor(brt / room.w) * ts + ts / 2;
        Icons.drawIcon(ctx, "breach", bx - 8, by - 8, 16, "#111");
        ctx.fillStyle = "#111";
        ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2); ctx.fill();
        // escaping air pixels
        var tphase = (opts.t || 0) * 6 + j;
        ctx.fillStyle = "rgba(255,255,255," + (0.5 + 0.3 * Math.sin(tphase)) + ")";
        ctx.fillRect(bx + Math.sin(tphase) * 5, by - 8 - (tphase % 5), 2, 2);
      }
      // fires (3-frame flames)
      if (visible) for (j = 0; j < room.fires.length; j++) {
        var ft = room.fires[j].t;
        var fx = rx + (ft % room.w) * ts + ts / 2, fy = ry + Math.floor(ft / room.w) * ts + ts / 2;
        drawFlame(ctx, fx, fy, ts * 0.42, (opts.t || 0) * 8 + j * 1.7);
      }
    }

    // doors
    for (i = 0; i < ship.doors.length; i++) {
      var d = ship.doors[i];
      var dx = d.x * ts, dy = d.y * ts;
      var isBlast = ship.doorLevel() >= 2;
      var col = d.open ? "#3A3A36" : d.brokenTimer > 0 ? "#6E2A24" : isBlast ? "#8A5A18" : P.hullTrimOrange;
      ctx.fillStyle = col;
      if (d.horizontal) {
        if (d.open) {
          ctx.fillRect(dx - ts * 0.28, dy - 3, ts * 0.14, 6);
          ctx.fillRect(dx + ts * 0.14, dy - 3, ts * 0.14, 6);
        } else ctx.fillRect(dx - ts * 0.28, dy - 3, ts * 0.56, 6);
      } else {
        if (d.open) {
          ctx.fillRect(dx - 3, dy - ts * 0.28, 6, ts * 0.14);
          ctx.fillRect(dx - 3, dy + ts * 0.14, 6, ts * 0.14);
        } else ctx.fillRect(dx - 3, dy - ts * 0.28, 6, ts * 0.56);
      }
    }

    // crew sprites
    var all = ship.crew.concat(ship.intruders);
    for (i = 0; i < all.length; i++) {
      var c = all[i];
      if (c.dead || c.ship !== ship) continue;
      room = ship.roomAt(c.room);
      if (!room) continue;
      if (sensors < 1 && !opts.showOccupants) continue;
      var pos = Sim.tilePos(ship, c.room, c.tile);
      var px = pos.x * ts, py = pos.y * ts;
      // walk interp
      if (c.path.length) {
        var nxt = c.path[0];
        var np = Sim.tilePos(ship, nxt.room, nxt.tile);
        var frac = c.moveT / 0.55;
        px = (pos.x + (np.x - pos.x) * frac) * ts;
        py = (pos.y + (np.y - pos.y) * frac) * ts;
      }
      var frame = c.moving ? Math.floor(c.walkFrame) : 0;
      var hostile = c.homeShip !== ship;
      var spr = crewSprite(c.race, frame, hostile && !ship.isPlayer === false, c.isDrone);
      var ss = ts * 0.85;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(spr, px - ss / 2, py - ss / 2, ss, ss);
      // selection ring / hostile marker
      if (opts.selectedCrew && opts.selectedCrew.indexOf(c) >= 0) {
        ctx.strokeStyle = P.selectionYellow;
        ctx.lineWidth = 2;
        ctx.strokeRect(px - ss / 2 - 2, py - ss / 2 - 2, ss + 4, ss + 4);
      }
      if (hostile) {
        ctx.fillStyle = P.dangerRed;
        ctx.fillRect(px - 2, py - ss / 2 - 6, 4, 4);
      }
      // hp bar
      var hpFrac = c.hp / c.maxHp;
      if (hpFrac < 1) {
        ctx.fillStyle = "#222";
        ctx.fillRect(px - ss / 2, py + ss / 2 + 1, ss, 3);
        ctx.fillStyle = hpFrac > 0.6 ? P.crewBarGreen : hpFrac > 0.3 ? P.crewYellowHurt : P.dangerRed;
        ctx.fillRect(px - ss / 2, py + ss / 2 + 1, ss * hpFrac, 3);
      }
    }

    ctx.restore();
    // cloak outline
    if (ship.cloakActive > 0) {
      ctx.save();
      ctx.translate(ox, oy);
      ctx.strokeStyle = "rgba(120,180,255,0.8)";
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x * ts - ts, b.y * ts - ts, (b.w + 2) * ts, (b.h + 2) * ts);
      ctx.restore();
    }
  }

  function drawFlame(ctx, x, y, r, phase) {
    var f = Math.floor(phase) % 3;
    var h = r * (1 + 0.25 * Math.sin(phase * 2));
    ctx.fillStyle = "#D9541E";
    ctx.beginPath();
    ctx.moveTo(x - r * 0.7, y + r * 0.6);
    ctx.quadraticCurveTo(x - r * 0.9, y - h * 0.2, x, y - h);
    ctx.quadraticCurveTo(x + r * 0.9, y - h * 0.2, x + r * 0.7, y + r * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#F0A028";
    ctx.beginPath();
    ctx.moveTo(x - r * 0.4, y + r * 0.55);
    ctx.quadraticCurveTo(x - r * 0.5, y - h * 0.1, x + (f - 1) * 2, y - h * 0.65);
    ctx.quadraticCurveTo(x + r * 0.5, y - h * 0.1, x + r * 0.4, y + r * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#FBE667";
    ctx.beginPath();
    ctx.arc(x + (f - 1), y + r * 0.15, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }

  // shield bubble
  function drawShieldBubble(ctx, ship, ox, oy, ts) {
    if (ship.shieldLayers <= 0 && ship.zoltanShield <= 0) return;
    var b = ship.bounds;
    var cx = ox + (b.x + b.w / 2) * ts, cy = oy + (b.y + b.h / 2) * ts;
    var rx = (b.w / 2 + 1.6) * ts, ry = (b.h / 2 + 1.4) * ts;
    if (ship.zoltanShield > 0) {
      ctx.save();
      var zg = ctx.createRadialGradient(cx, cy, 10, cx, cy, rx);
      zg.addColorStop(0, "rgba(120,230,90,0.10)");
      zg.addColorStop(1, "rgba(120,230,90,0.45)");
      ctx.fillStyle = zg;
      ctx.beginPath(); ctx.ellipse(cx, cy, rx + 8, ry + 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(150,255,110,0.8)";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
      return;
    }
    var alpha = 0.18 + 0.09 * ship.shieldLayers;
    var g = ctx.createRadialGradient(cx, cy, 10, cx, cy, rx);
    g.addColorStop(0, "rgba(79,167,232,0.05)");
    g.addColorStop(0.85, "rgba(79,167,232," + (alpha * 0.5) + ")");
    g.addColorStop(1, "rgba(79,167,232," + alpha + ")");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(79,167,232," + (0.35 + 0.12 * ship.shieldLayers) + ")";
    ctx.lineWidth = 2 + ship.shieldLayers;
    ctx.stroke();
  }

  // projectiles
  function drawProjectile(ctx, p, x, y, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    if (p.asteroid) {
      drawRock(ctx, 0, 0, 9, RNG.vol);
    } else if (p.cls === "missile" || p.asb) {
      ctx.fillStyle = "#C8C4BC";
      ctx.fillRect(-6, -3, 12, 6);
      ctx.fillStyle = P.dangerRed;
      ctx.beginPath(); ctx.moveTo(6, -3); ctx.lineTo(11, 0); ctx.lineTo(6, 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#57544E";
      ctx.fillRect(-9, -4, 3, 8);
      // exhaust
      ctx.fillStyle = "rgba(255,180,80,0.8)";
      ctx.fillRect(-14, -1.5, 5, 3);
    } else if (p.cls === "ion") {
      var g = ctx.createRadialGradient(0, 0, 1, 0, 0, 7);
      g.addColorStop(0, "#DFF6FF");
      g.addColorStop(0.6, P.ionBlue);
      g.addColorStop(1, "rgba(102,204,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
    } else if (p.cls === "bomb") {
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = "#DFF6FF";
      ctx.lineWidth = 2;
      ctx.strokeRect(-5, -5, 10, 10);
    } else if (p.cls === "railgun") {
      // hypervelocity slug: white-hot core with long ion wake
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      var rg = ctx.createLinearGradient(-42, 0, 10, 0);
      rg.addColorStop(0, "rgba(46,159,216,0)");
      rg.addColorStop(0.7, "rgba(154,232,255,0.55)");
      rg.addColorStop(1, "#FFFFFF");
      ctx.fillStyle = rg;
      ctx.fillRect(-42, -3, 52, 6);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(2, -2, 12, 4);
      ctx.fillStyle = "#9AE8FF";
      ctx.fillRect(-6, -1, 8, 2);
      ctx.restore();
    } else { // laser / shard
      ctx.fillStyle = p.from && p.from.isPlayer ? "#FFDF6E" : "#FF5B4E";
      ctx.fillRect(-9, -2, 18, 4);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillRect(-3, -1, 8, 2);
    }
    ctx.restore();
  }

  // FTL jump streaks
  function jumpFlash(ctx, W, H, frac) {
    ctx.fillStyle = "rgba(255,255,255," + Math.max(0, Math.sin(frac * Math.PI)) * 0.85 + ")";
    ctx.fillRect(0, 0, W, H);
  }

  // -------------------------------------------------------------------------
  // Post-processing toolkit (art-direction passes)
  // -------------------------------------------------------------------------
  var _bloomCanvas = null, _grainCanvas = null, _scanCanvas = null;

  // Ordered 4x4 Bayer dither + posterize on a whole (low-res) canvas.
  var BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function bayerDither(canvas, levels) {
    levels = levels || 7;
    var g = canvas.getContext("2d");
    var img;
    try { img = g.getImageData(0, 0, canvas.width, canvas.height); } catch (e) { return; }
    var d = img.data, w = canvas.width;
    var step = 255 / (levels - 1);
    for (var i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue; // transparent: skip (fast path for world layers)
      var p = i >> 2;
      var bx = (p % w) & 3, by = ((p / w) | 0) & 3;
      var th = (BAYER4[by * 4 + bx] / 16 - 0.5) * step * 0.85;
      d[i] = Math.max(0, Math.min(255, Math.round((d[i] + th) / step) * step));
      d[i + 1] = Math.max(0, Math.min(255, Math.round((d[i + 1] + th) / step) * step));
      d[i + 2] = Math.max(0, Math.min(255, Math.round((d[i + 2] + th) / step) * step));
    }
    g.putImageData(img, 0, 0);
  }

  // Generic pixelation pass: draw full-size content into a reusable low-res
  // layer via drawFn(lowCtx), dither it, and blit upscaled with hard pixels.
  var _pixLayers = {};
  function pixelPass(ctx, W, H, id, drawFn, opts) {
    opts = opts || {};
    var s = opts.scale || 3;
    var lw = Math.ceil(W / s), lh = Math.ceil(H / s);
    var key = id + "|" + lw + "x" + lh;
    var c = _pixLayers[key];
    if (!c) {
      c = document.createElement("canvas");
      c.width = lw; c.height = lh;
      _pixLayers[key] = c;
    }
    var g = c.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (!opts.opaque) g.clearRect(0, 0, lw, lh);
    g.setTransform(1 / s, 0, 0, 1 / s, 0, 0);
    g.imageSmoothingEnabled = false;
    drawFn(g);
    if (opts.dither !== false) bayerDither(c, opts.levels || 7);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(c, 0, 0, W, H);
  }

  // Pixel-mode background: dithered low-res copy cached per beacon, so the
  // per-frame cost is a single blit. Animated accents draw after at full res.
  var bgPixCache = {};
  function backgroundPixel(ctx, seed, kind, W, H, t, s) {
    s = s || 3;
    var key = seed + "|" + kind + "|" + W + "x" + H + "|" + s;
    var c = bgPixCache[key];
    if (!c) {
      c = document.createElement("canvas");
      c.width = Math.ceil(W / s);
      c.height = Math.ceil(H / s);
      var g = c.getContext("2d");
      g.setTransform(1 / s, 0, 0, 1 / s, 0, 0);
      g.imageSmoothingEnabled = false;
      renderBackground(g, seed, kind, W, H);
      bayerDither(c, 7);
      var keys = Object.keys(bgPixCache);
      if (keys.length > 6) delete bgPixCache[keys[0]];
      bgPixCache[key] = c;
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(c, 0, 0, W, H);
    bgAccents(ctx, kind, W, H, t);
  }

  // Soft bloom: blurred bright copy composited additively.
  function bloomPass(ctx, W, H, strength) {
    if (!_bloomCanvas) {
      _bloomCanvas = document.createElement("canvas");
      _bloomCanvas.width = Math.floor(W / 4);
      _bloomCanvas.height = Math.floor(H / 4);
    }
    var b = _bloomCanvas.getContext("2d");
    b.save();
    b.filter = "blur(5px) brightness(1.25) saturate(1.5)";
    b.drawImage(ctx.canvas, 0, 0, _bloomCanvas.width, _bloomCanvas.height);
    b.restore();
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = strength != null ? strength : 0.35;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(_bloomCanvas, 0, 0, W, H);
    ctx.restore();
    ctx.imageSmoothingEnabled = false;
  }

  function grain(ctx, W, H, t, alpha) {
    if (!_grainCanvas) {
      _grainCanvas = document.createElement("canvas");
      _grainCanvas.width = 256; _grainCanvas.height = 256;
      var g = _grainCanvas.getContext("2d");
      var img = g.createImageData(256, 256);
      for (var i = 0; i < img.data.length; i += 4) {
        var v = 100 + Math.floor(Math.random() * 100);
        img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = alpha != null ? alpha : 0.05;
    var ox = (Math.floor(t * 61) % 256), oy = (Math.floor(t * 89) % 256);
    for (var x = -ox; x < W; x += 256) {
      for (var y = -oy; y < H; y += 256) ctx.drawImage(_grainCanvas, x, y);
    }
    ctx.restore();
  }

  function scanlines(ctx, W, H, alpha) {
    if (!_scanCanvas) {
      _scanCanvas = document.createElement("canvas");
      _scanCanvas.width = 4; _scanCanvas.height = 3;
      var g = _scanCanvas.getContext("2d");
      g.fillStyle = "rgba(0,0,0,1)";
      g.fillRect(0, 2, 4, 1);
    }
    ctx.save();
    ctx.globalAlpha = alpha != null ? alpha : 0.07;
    ctx.fillStyle = ctx.createPattern(_scanCanvas, "repeat");
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function vignette(ctx, W, H, strength) {
    var g = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.85);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0," + (strength != null ? strength : 0.32) + ")");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // Painterly color grade: cool multiply from below, warm overlay from upper-left.
  function grade(ctx, W, H) {
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    var cool = ctx.createLinearGradient(0, H * 0.35, 0, H);
    cool.addColorStop(0, "rgba(255,255,255,1)");
    cool.addColorStop(1, "rgba(178,190,222,1)");
    ctx.fillStyle = cool;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "overlay";
    var warm = ctx.createRadialGradient(W * 0.3, H * 0.15, 80, W * 0.3, H * 0.15, H * 1.1);
    warm.addColorStop(0, "rgba(255,196,120,0.28)");
    warm.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // Menu-card weapon art: aspect-fit PNG sprite into a box, pixel-crisp.
  // Returns false when no art is installed so callers can fall back to icons.
  function drawWeaponArt(ctx, weaponId, x, y, w, h) {
    var spr = (typeof Assets !== "undefined") ? Assets.weaponSprite(weaponId) : null;
    if (!spr) return false;
    var s = Math.min(w / spr.w, h / spr.h);
    var dw = spr.w * s, dh = spr.h * s;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(spr.img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    ctx.restore();
    return true;
  }
  // Crew portrait art with the same contract.
  function drawCrewArt(ctx, race, x, y, w, h) {
    var spr = (typeof Assets !== "undefined") ? Assets.crewPortrait(race) : null;
    if (!spr) return false;
    var s = Math.min(w / spr.w, h / spr.h);
    var dw = spr.w * s, dh = spr.h * s;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(spr.img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    ctx.restore();
    return true;
  }
  // System icon art; falls back to the procedural glyph via Icons at call
  // sites. dim=true renders greyscale for not-installed / offline states.
  function drawIconArt(ctx, id, x, y, size, dim) {
    var spr = (typeof Assets !== "undefined") ? Assets.iconSprite(id) : null;
    if (!spr) return false;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (dim) {
      try { ctx.filter = "grayscale(1) brightness(0.6)"; } catch (e) { ctx.globalAlpha = 0.45; }
    }
    ctx.drawImage(spr.img, x, y, size, size);
    ctx.restore();
    return true;
  }

  return {
    panel: panel, octPath: octPath, darkWell: darkWell, button: button,
    background: background, hangarBackground: hangarBackground,
    drawHull: drawHull, drawHullOrSprite: drawHullOrSprite,
    drawWeaponArt: drawWeaponArt, drawCrewArt: drawCrewArt, drawIconArt: drawIconArt,
    drawShip: drawShip, drawShieldBubble: drawShieldBubble,
    drawProjectile: drawProjectile, drawFlame: drawFlame, crewSprite: crewSprite,
    jumpFlash: jumpFlash, drawRock: drawRock, ROLE: ROLE,
    bayerDither: bayerDither, bloomPass: bloomPass, grain: grain,
    scanlines: scanlines, vignette: vignette, grade: grade,
    pixelPass: pixelPass, backgroundPixel: backgroundPixel
  };
})();

// ---------------------------------------------------------------------------
// FX: lightweight particle system (art bible §6). Ticks on SIM time (freezes
// with pause), draws inside the world pass so it inherits any art direction.
// ---------------------------------------------------------------------------
var FX = (function () {
  var list = [];
  var MAX = 420;

  function push(p) { if (list.length < MAX) list.push(p); }

  function sparks(x, y, color, n) {
    n = n || 10;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 90 + Math.random() * 260;
      push({
        type: "spark", x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.35 + Math.random() * 0.3, maxLife: 0.65,
        size: 1.5 + Math.random() * 2.5, color: color || "#FFD27A"
      });
    }
  }
  function smoke(x, y, n) {
    n = n || 5;
    for (var i = 0; i < n; i++) {
      push({
        type: "smoke", x: x + (Math.random() - 0.5) * 14, y: y + (Math.random() - 0.5) * 14,
        vx: (Math.random() - 0.5) * 26, vy: -14 - Math.random() * 22,
        life: 0.9 + Math.random() * 0.9, maxLife: 1.8,
        size: 7 + Math.random() * 10
      });
    }
  }
  function flash(x, y, r, color) {
    push({ type: "flash", x: x, y: y, life: 0.18, maxLife: 0.18, size: r || 26, color: color || "#FFF2C8" });
  }
  function ring(x, y, r, color) {
    push({ type: "ring", x: x, y: y, life: 0.4, maxLife: 0.4, size: r || 60, color: color || "#4FA7E8" });
  }
  function muzzle(x, y, dirX, color) {
    flash(x, y, 20, color || "#FFE9A8");
    for (var i = 0; i < 5; i++) {
      push({
        type: "spark", x: x, y: y,
        vx: dirX * (140 + Math.random() * 160), vy: (Math.random() - 0.5) * 90,
        life: 0.16 + Math.random() * 0.12, maxLife: 0.3,
        size: 2, color: color || "#FFE9A8"
      });
    }
  }
  // EM Rail Gun beam: white-hot core lance + cyan sheath + jittering arcs.
  // Drawn as a single particle whose geometry is re-jittered every frame.
  function rail(x1, y1, x2, y2) {
    push({
      type: "rail", x: x1, y: y1, x2: x2, y2: y2,
      life: 0.55, maxLife: 0.55
    });
    // ionized air sparkle along the beam path
    var dx = x2 - x1, dy = y2 - y1;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var steps = Math.min(14, Math.floor(len / 46));
    for (var i = 1; i <= steps; i++) {
      var t = i / (steps + 1);
      push({
        type: "spark",
        x: x1 + dx * t + (Math.random() - 0.5) * 8,
        y: y1 + dy * t + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60,
        life: 0.25 + Math.random() * 0.25, maxLife: 0.5,
        size: 1.5 + Math.random() * 2, color: Math.random() < 0.5 ? "#9AE8FF" : "#FFFFFF"
      });
    }
    flash(x1, y1, 34, "#C9F2FF");
    flash(x2, y2, 52, "#C9F2FF");
    ring(x2, y2, 70, "#9AE8FF");
  }

  function debris(x, y, big) {
    flash(x, y, big ? 120 : 70, "#FFE9A8");
    sparks(x, y, "#FFB25E", big ? 26 : 16);
    smoke(x, y, big ? 12 : 7);
    var n = big ? 10 : 6;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 40 + Math.random() * 130;
      push({
        type: "chunk", x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        rot: Math.random() * Math.PI * 2, vrot: (Math.random() - 0.5) * 8,
        life: 0.8 + Math.random() * 0.8, maxLife: 1.6,
        size: 3 + Math.random() * 6
      });
    }
  }

  function tick(dt) {
    for (var i = list.length - 1; i >= 0; i--) {
      var p = list[i];
      p.life -= dt;
      if (p.life <= 0) { list.splice(i, 1); continue; }
      if (p.vx != null) { p.x += p.vx * dt; p.y += p.vy * dt; }
      if (p.type === "spark") { p.vx *= (1 - 3.4 * dt); p.vy *= (1 - 3.4 * dt); }
      if (p.type === "smoke") { p.size += 16 * dt; p.vx *= (1 - 1.2 * dt); }
      if (p.type === "chunk") p.rot += p.vrot * dt;
    }
  }

  function draw(ctx) {
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      var f = p.life / p.maxLife;
      if (p.type === "spark") {
        ctx.globalAlpha = Math.min(1, f * 1.6);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else if (p.type === "smoke") {
        ctx.globalAlpha = 0.26 * f;
        ctx.fillStyle = "#4A4640";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "flash") {
        var r = p.size * (1.4 - f * 0.4);
        var g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, r);
        g.addColorStop(0, p.color);
        g.addColorStop(1, "rgba(255,180,80,0)");
        ctx.globalAlpha = f;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "ring") {
        var rr = p.size * (1.25 - f);
        ctx.globalAlpha = f * 0.9;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3 + 3 * f;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === "rail") {
        // f: 1 -> 0. Beam widens slightly then collapses; arcs jitter per frame.
        var bx = p.x2 - p.x, by = p.y2 - p.y;
        var blen = Math.sqrt(bx * bx + by * by) || 1;
        var nx = -by / blen, ny = bx / blen; // normal for jitter
        var W = (f > 0.72 ? (1 - f) / 0.28 : f / 0.72); // ramp in fast, fade out
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        // outer cyan sheath
        ctx.globalAlpha = 0.55 * W;
        ctx.strokeStyle = "#2E9FD8";
        ctx.lineWidth = 11 * W + 2;
        ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x2, p.y2); ctx.stroke();
        // mid glow
        ctx.globalAlpha = 0.85 * W;
        ctx.strokeStyle = "#9AE8FF";
        ctx.lineWidth = 5 * W + 1;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x2, p.y2); ctx.stroke();
        // white-hot core
        ctx.globalAlpha = Math.min(1, W * 1.2);
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2 * W + 0.6;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x2, p.y2); ctx.stroke();
        // two crackling arcs snaking around the core
        for (var arc = 0; arc < 2; arc++) {
          ctx.globalAlpha = 0.8 * W;
          ctx.strokeStyle = arc === 0 ? "#D6F6FF" : "#7FDBFF";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          var segs = Math.max(4, Math.floor(blen / 34));
          for (var s = 1; s <= segs; s++) {
            var st = s / segs;
            var amp = Math.sin(st * Math.PI) * (9 + arc * 5) * W;
            var off = (Math.random() * 2 - 1) * amp;
            ctx.lineTo(p.x + bx * st + nx * off, p.y + by * st + ny * off);
          }
          ctx.stroke();
        }
        ctx.restore();
      } else if (p.type === "chunk") {
        ctx.globalAlpha = Math.min(1, f * 1.4);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = "#6E6A62";
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
        ctx.strokeStyle = "#26251F";
        ctx.lineWidth = 1;
        ctx.strokeRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  return {
    sparks: sparks, smoke: smoke, flash: flash, ring: ring,
    muzzle: muzzle, debris: debris, rail: rail, tick: tick, draw: draw,
    clear: function () { list = []; }
  };
})();
