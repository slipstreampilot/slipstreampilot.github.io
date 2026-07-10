/* STARFALL - tooltip rendering + stat-card formatting (§2.2.1). */
"use strict";

var Tooltips = (function () {
  var P = GAME_DATA.palette;
  var T = GAME_DATA.text;

  function bucket(pct) {
    if (pct >= 50) return T.high;
    if (pct >= 20) return T.medium;
    if (pct > 0) return T.low;
    return null;
  }

  // Build the stat line list for a weapon (§2.2.1)
  function weaponStats(def) {
    var lines = [];
    lines.push(T.powerRequired + ": " + def.power);
    lines.push(T.chargeTime + ": " + def.charge + " seconds");
    if (def.missiles) lines.push(T.usesMissiles);
    if ((def.shots || 1) > 1) lines.push("Shots per charge: " + def.shots);
    if (def.damage != null && def.damage > 0) lines.push(T.damage + ": " + def.damage);
    if (def.sysDamage) lines.push("System damage: " + def.sysDamage);
    if (def.crewDamage) lines.push("Crew damage: " + def.crewDamage);
    if (def.ionDamage) lines.push("Ion damage: " + def.ionDamage);
    if (def.healsCrew) lines.push("Heals crew: " + def.healsCrew);
    if (def.pierce) lines.push(T.shieldPiercing + ": " + def.pierce);
    if (def.beamLength) lines.push("Beam length: " + def.beamLength);
    var f = bucket(def.fire || def.firePerTile || 0);
    if (f) lines.push(T.fireChance + ": " + f);
    var b = bucket(def.breach || 0);
    if (b) lines.push(T.breachChance + ": " + b);
    return lines;
  }

  function tipForClass(cls) {
    if (cls === "laser" || cls === "flak") return T.tipLaser;
    if (cls === "beam") return T.tipBeam;
    if (cls === "missile") return T.tipMissile;
    if (cls === "bomb") return T.tipBomb;
    if (cls === "ion") return T.tipIon;
    return null;
  }

  // Draw an info card: title, flavor, stat lines. Returns height used.
  function drawCard(ctx, x, y, w, title, flavor, lines, opts) {
    opts = opts || {};
    var pad = 12;
    var scale = 2;
    var lh = PixelFont.lineHeight(scale);
    var flavorLines = flavor ? PixelFont.wrap(flavor, scale, w - pad * 2) : [];
    var h = pad * 2 + lh * 1.4 + flavorLines.length * lh + (lines ? lines.length * lh : 0) + 6;
    Art.panel(ctx, x, y, w, h, { fill: opts.fill || P.uiTooltipMauve, cut: 10 });
    var cy = y + pad;
    PixelFont.drawText(ctx, title, x + pad, cy, { scale: 2, color: "#FFF" });
    cy += lh * 1.4;
    for (var i = 0; i < flavorLines.length; i++) {
      PixelFont.drawText(ctx, flavorLines[i], x + pad, cy, { scale: scale, color: Art.ROLE.mauve.sub });
      cy += lh;
    }
    if (lines) {
      for (var j = 0; j < lines.length; j++) {
        PixelFont.drawText(ctx, lines[j], x + pad, cy, { scale: scale, color: P.textPrimary });
        cy += lh;
      }
    }
    return h;
  }

  function drawTipCard(ctx, x, y, w, text) {
    var scale = 2;
    var pad = 12;
    var lines = PixelFont.wrap(text, scale, w - pad * 2);
    var lh = PixelFont.lineHeight(scale);
    var h = pad * 2 + lines.length * lh;
    Art.panel(ctx, x, y, w, h, { fill: P.uiTooltipMauveDk, cut: 10 });
    for (var i = 0; i < lines.length; i++) {
      PixelFont.drawText(ctx, lines[i], x + pad, y + pad + i * lh, { scale: scale, color: Art.ROLE.mauve.sub });
    }
    return h;
  }

  // simple hover tooltip near cursor
  function hover(ctx, mx, my, text, W, H) {
    var scale = 2;
    var lines = PixelFont.wrap(text, scale, 380);
    var lh = PixelFont.lineHeight(scale);
    var w = 0;
    for (var i = 0; i < lines.length; i++) w = Math.max(w, PixelFont.textWidth(lines[i], scale));
    w += 20;
    var h = lines.length * lh + 16;
    var x = Math.min(mx + 18, W - w - 8), y = Math.min(my + 18, H - h - 8);
    Art.panel(ctx, x, y, w, h, { fill: P.uiTooltipMauve, cut: 8 });
    for (var j = 0; j < lines.length; j++) {
      PixelFont.drawText(ctx, lines[j], x + 10, y + 8 + j * lh, { scale: scale, color: "#FFF" });
    }
  }

  return { weaponStats: weaponStats, tipForClass: tipForClass, drawCard: drawCard, drawTipCard: drawTipCard, hover: hover, bucket: bucket };
})();
