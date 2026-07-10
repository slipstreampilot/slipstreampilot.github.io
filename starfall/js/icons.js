/* STARFALL - 20x20 code-drawn icon glyphs on octagonal plates.
   Every icon is a drawIcon(ctx, name, x, y, size, color) call; no image files. */
"use strict";

var Icons = (function () {

  function octPlate(ctx, x, y, s, fill, stroke) {
    var c = s * 0.28;
    ctx.beginPath();
    ctx.moveTo(x + c, y);
    ctx.lineTo(x + s - c, y);
    ctx.lineTo(x + s, y + c);
    ctx.lineTo(x + s, y + s - c);
    ctx.lineTo(x + s - c, y + s);
    ctx.lineTo(x + c, y + s);
    ctx.lineTo(x, y + s - c);
    ctx.lineTo(x, y + c);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(1, s * 0.08); ctx.stroke(); }
  }

  // Each glyph drawn in a 20x20 design box then scaled.
  var glyphs = {
    shields: function (g) { // S in a bubble
      g.beginPath(); g.arc(10, 10, 7.5, 0, Math.PI * 2); g.stroke();
      g.beginPath();
      g.moveTo(13, 6); g.bezierCurveTo(8, 4, 6, 8, 10, 10);
      g.bezierCurveTo(14, 12, 12, 16, 7, 14);
      g.stroke();
    },
    engines: function (g) { // thruster cone + motion ticks
      g.beginPath(); g.moveTo(12, 3); g.lineTo(17, 10); g.lineTo(12, 17); g.lineTo(9, 13); g.lineTo(9, 7); g.closePath(); g.stroke();
      g.beginPath(); g.moveTo(2, 7); g.lineTo(6, 7); g.moveTo(1, 10); g.lineTo(6, 10); g.moveTo(2, 13); g.lineTo(6, 13); g.stroke();
    },
    oxygen: function (g) { // O2 glyph
      g.beginPath(); g.arc(8, 9, 5, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(14, 12); g.lineTo(18, 12); g.moveTo(14, 12); g.arc(16, 14.5, 2.5, -Math.PI / 2, Math.PI / 2); g.lineTo(14, 17); g.stroke();
    },
    weapons: function (g) { // crossed barrels
      g.beginPath(); g.moveTo(4, 16); g.lineTo(15, 5); g.moveTo(13, 3); g.lineTo(17, 7); g.stroke();
      g.beginPath(); g.moveTo(16, 16); g.lineTo(5, 5); g.moveTo(7, 3); g.lineTo(3, 7); g.stroke();
      g.beginPath(); g.arc(10, 10, 2, 0, Math.PI * 2); g.stroke();
    },
    medbay: function (g) { // cross
      g.beginPath();
      g.moveTo(8, 3); g.lineTo(12, 3); g.lineTo(12, 8); g.lineTo(17, 8); g.lineTo(17, 12);
      g.lineTo(12, 12); g.lineTo(12, 17); g.lineTo(8, 17); g.lineTo(8, 12); g.lineTo(3, 12);
      g.lineTo(3, 8); g.lineTo(8, 8); g.closePath(); g.stroke();
    },
    droneCtrl: function (g) { // antenna robot head
      g.strokeRect(5, 8, 10, 8);
      g.beginPath(); g.arc(8, 12, 1.2, 0, Math.PI * 2); g.moveTo(13.2, 12); g.arc(12, 12, 1.2, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(10, 8); g.lineTo(10, 4); g.arc(10, 3, 1, 0, Math.PI * 2); g.stroke();
    },
    teleporter: function (g) { // down-arrow pad
      g.beginPath(); g.moveTo(10, 3); g.lineTo(10, 11); g.moveTo(6, 8); g.lineTo(10, 12); g.lineTo(14, 8); g.stroke();
      g.beginPath(); g.ellipse(10, 15, 7, 2.6, 0, 0, Math.PI * 2); g.stroke();
    },
    cloaking: function (g) { // ghost ship outline
      g.setLineDash([2, 2]);
      g.beginPath(); g.moveTo(3, 12); g.lineTo(9, 5); g.lineTo(17, 12); g.lineTo(12, 15) ; g.lineTo(6, 15); g.closePath(); g.stroke();
      g.setLineDash([]);
    },
    artillery: function (g) { // long cannon
      g.beginPath(); g.moveTo(3, 15); g.lineTo(14, 4); g.moveTo(12, 2); g.lineTo(18, 8); g.stroke();
      g.strokeRect(2, 13, 5, 5);
    },
    piloting: function (g) { // steering yoke
      g.beginPath(); g.arc(10, 10, 6.5, Math.PI * 0.15, Math.PI * 0.85, true); g.stroke();
      g.beginPath(); g.moveTo(4, 12) ; g.lineTo(4, 15); g.moveTo(16, 12); g.lineTo(16, 15); g.stroke();
      g.beginPath(); g.arc(10, 10, 2, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(10, 12); g.lineTo(10, 15); g.stroke();
    },
    sensors: function (g) { // dish
      g.beginPath(); g.arc(9, 11, 6, -Math.PI * 0.75, Math.PI * 0.25); g.stroke();
      g.beginPath(); g.moveTo(9, 11); g.lineTo(14, 6); g.stroke();
      g.beginPath(); g.arc(15.5, 4.5, 1.2, 0, Math.PI * 2); g.stroke();
    },
    doors: function (g) { // door leaf
      g.strokeRect(5, 3, 10, 14);
      g.beginPath(); g.moveTo(10, 3); g.lineTo(10, 17); g.stroke();
      g.beginPath(); g.moveTo(7.5, 10) ; g.lineTo(8.5, 10); g.moveTo(11.5, 10); g.lineTo(12.5, 10); g.stroke();
    },
    scrap: function (g) { // gear
      var i;
      g.beginPath();
      for (i = 0; i < 8; i++) {
        var a = (i / 8) * Math.PI * 2;
        g.moveTo(10 + Math.cos(a) * 5, 10 + Math.sin(a) * 5);
        g.lineTo(10 + Math.cos(a) * 8, 10 + Math.sin(a) * 8);
      }
      g.stroke();
      g.beginPath(); g.arc(10, 10, 5, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(10, 10, 1.8, 0, Math.PI * 2); g.stroke();
    },
    fuel: function (g) { // atom
      g.beginPath(); g.ellipse(10, 10, 8, 3.2, Math.PI / 4, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.ellipse(10, 10, 8, 3.2, -Math.PI / 4, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(10, 10, 1.6, 0, Math.PI * 2); g.stroke();
    },
    missiles: function (g) { // dart
      g.beginPath();
      g.moveTo(10, 2); g.lineTo(13, 7); g.lineTo(12, 14); g.lineTo(14, 18); g.lineTo(10, 15);
      g.lineTo(6, 18); g.lineTo(8, 14); g.lineTo(7, 7); g.closePath(); g.stroke();
    },
    droneParts: function (g) { // robot chip
      g.strokeRect(6, 6, 8, 8);
      g.beginPath();
      var i;
      for (i = 0; i < 3; i++) {
        g.moveTo(8 + i * 2, 6); g.lineTo(8 + i * 2, 3);
        g.moveTo(8 + i * 2, 14); g.lineTo(8 + i * 2, 17);
        g.moveTo(6, 8 + i * 2); g.lineTo(3, 8 + i * 2);
        g.moveTo(14, 8 + i * 2); g.lineTo(17, 8 + i * 2);
      }
      g.stroke();
    },
    hull: function (g) { // ship prow shield
      g.beginPath(); g.moveTo(10, 2); g.lineTo(16, 5); g.lineTo(16, 11); g.lineTo(10, 18); g.lineTo(4, 11); g.lineTo(4, 5); g.closePath(); g.stroke();
      g.beginPath(); g.moveTo(10, 5); g.lineTo(10, 14); g.stroke();
    },
    crew: function (g) { // person
      g.beginPath(); g.arc(10, 6, 3, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(5, 17); g.lineTo(5, 13); g.arc(10, 13, 5, Math.PI, 0, false); g.lineTo(15, 17); g.stroke();
    },
    augment: function (g) { // up chevron chip
      g.strokeRect(4, 4, 12, 12);
      g.beginPath(); g.moveTo(7, 12); g.lineTo(10, 8); g.lineTo(13, 12); g.stroke();
    },
    reactor: function (g) { // bolt
      g.beginPath(); g.moveTo(12, 2); g.lineTo(6, 11); g.lineTo(10, 11); g.lineTo(8, 18); g.lineTo(14, 9); g.lineTo(10, 9); g.closePath(); g.stroke();
    },
    ftl: function (g) { // ring w/ streak
      g.beginPath(); g.arc(10, 10, 7, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(3, 10); g.lineTo(17, 10); g.moveTo(13, 6); g.lineTo(17, 10); g.lineTo(13, 14); g.stroke();
    },
    wrench: function (g) {
      g.beginPath(); g.arc(6.5, 6.5, 4, Math.PI * 0.15, Math.PI * 1.6); g.stroke();
      g.beginPath(); g.moveTo(9, 9); g.lineTo(16, 16); g.stroke();
      g.beginPath(); g.arc(15.5, 15.5, 2, 0, Math.PI * 2); g.stroke();
    },
    ship: function (g) { // side ship silhouette
      g.beginPath(); g.moveTo(2, 12); g.lineTo(7, 9); g.lineTo(15, 9); g.lineTo(18, 11); g.lineTo(15, 13); g.lineTo(7, 13); g.closePath(); g.stroke();
      g.beginPath(); g.moveTo(7, 9); g.lineTo(9, 5); g.lineTo(12, 5); g.lineTo(12, 9); g.stroke();
    },
    pause: function (g) {
      g.strokeRect(6, 4, 3, 12); g.strokeRect(11, 4, 3, 12);
    },
    danger: function (g) { // warning triangle
      g.beginPath(); g.moveTo(10, 3); g.lineTo(18, 17); g.lineTo(2, 17); g.closePath(); g.stroke();
      g.beginPath(); g.moveTo(10, 8); g.lineTo(10, 12); g.moveTo(10, 14.5); g.lineTo(10, 15); g.stroke();
    },
    lock: function (g) {
      g.strokeRect(5, 9, 10, 8);
      g.beginPath(); g.arc(10, 9, 3.5, Math.PI, 0); g.stroke();
      g.beginPath(); g.moveTo(10, 12); g.lineTo(10, 14); g.stroke();
    },
    star: function (g) {
      g.beginPath();
      for (var i = 0; i < 10; i++) {
        var a = -Math.PI / 2 + (i * Math.PI) / 5;
        var r = i % 2 === 0 ? 8 : 3.5;
        var px = 10 + Math.cos(a) * r, py = 10 + Math.sin(a) * r;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath(); g.stroke();
    },
    trophy: function (g) {
      g.beginPath(); g.moveTo(6, 3); g.lineTo(14, 3); g.lineTo(13, 10); g.arc(10, 10, 3, 0, Math.PI); g.lineTo(7, 10); g.closePath(); g.stroke();
      g.beginPath(); g.moveTo(10, 13); g.lineTo(10, 15); g.moveTo(6, 17); g.lineTo(14, 17); g.moveTo(6, 17); g.lineTo(10, 15); g.lineTo(14, 17); g.stroke();
      g.beginPath(); g.moveTo(6, 4); g.arc(4, 6, 2.5, -Math.PI / 2, Math.PI / 2, true); g.moveTo(14, 4); g.arc(16, 6, 2.5, -Math.PI / 2, Math.PI / 2); g.stroke();
    },
    skull: function (g) {
      g.beginPath(); g.arc(10, 9, 6, Math.PI, 0); g.lineTo(16, 13); g.lineTo(4, 13); g.closePath(); g.stroke();
      g.beginPath(); g.arc(7.5, 9, 1.4, 0, Math.PI * 2); g.moveTo(13.9, 9); g.arc(12.5, 9, 1.4, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(7, 15); g.lineTo(7, 17); g.moveTo(10, 15); g.lineTo(10, 17); g.moveTo(13, 15); g.lineTo(13, 17); g.stroke();
    },
    fire: function (g) {
      g.beginPath();
      g.moveTo(10, 2);
      g.bezierCurveTo(13, 6, 16, 8, 15, 13);
      g.bezierCurveTo(14.5, 16.5, 12, 18, 10, 18);
      g.bezierCurveTo(8, 18, 5.5, 16.5, 5, 13);
      g.bezierCurveTo(4.5, 9, 8, 6, 10, 2);
      g.stroke();
      g.beginPath(); g.arc(10, 14, 2.2, 0, Math.PI * 2); g.stroke();
    },
    breach: function (g) { // starburst hole
      g.beginPath();
      for (var i = 0; i < 8; i++) {
        var a = (i / 8) * Math.PI * 2;
        var r = i % 2 === 0 ? 7 : 3;
        var px = 10 + Math.cos(a) * r, py = 10 + Math.sin(a) * r;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath(); g.stroke();
    },
    ion: function (g) { // lightning
      g.beginPath(); g.moveTo(11, 2); g.lineTo(5, 11); g.lineTo(9, 11); g.lineTo(7, 18); g.lineTo(15, 8); g.lineTo(11, 8); g.closePath(); g.stroke();
    },
    autofire: function (g) {
      g.beginPath(); g.arc(10, 10, 6, -Math.PI * 0.4, Math.PI * 1.1); g.stroke();
      g.beginPath(); g.moveTo(13, 2); g.lineTo(14.5, 6.5); g.lineTo(10, 6); g.stroke();
      g.beginPath(); g.arc(10, 10, 1.5, 0, Math.PI * 2); g.stroke();
    },
    jump: function (g) {
      g.beginPath(); g.moveTo(3, 15); g.lineTo(10, 4); g.lineTo(17, 15); g.moveTo(10, 4); g.lineTo(10, 18); g.stroke();
    },
    store: function (g) { // market stall
      g.beginPath(); g.moveTo(3, 8); g.lineTo(10, 3); g.lineTo(17, 8); g.stroke();
      g.strokeRect(5, 8, 10, 8);
      g.strokeRect(8, 11, 4, 5);
    },
    exit: function (g) {
      g.strokeRect(4, 3, 9, 14);
      g.beginPath(); g.moveTo(11, 10); g.lineTo(18, 10); g.moveTo(15, 7); g.lineTo(18, 10); g.lineTo(15, 13); g.stroke();
    },
    distress: function (g) {
      g.beginPath(); g.arc(10, 10, 3, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(10, 10, 6.5, -0.5, 0.5); g.arc(10, 10, 6.5, Math.PI - 0.5, Math.PI + 0.5); g.stroke();
    },
    quest: function (g) {
      g.beginPath(); g.moveTo(10, 2); g.lineTo(14, 10); g.lineTo(10, 18); g.lineTo(6, 10); g.closePath(); g.stroke();
      g.beginPath(); g.arc(10, 10, 1.5, 0, Math.PI * 2); g.stroke();
    },
    fleet: function (g) {
      g.beginPath(); g.moveTo(4, 14); g.lineTo(8, 10); g.lineTo(12, 14); g.closePath(); g.stroke();
      g.beginPath(); g.moveTo(9, 10); g.lineTo(13, 6); g.lineTo(17, 10); g.closePath(); g.stroke();
    },
    check: function (g) {
      g.beginPath(); g.moveTo(4, 11); g.lineTo(8, 15); g.lineTo(16, 5); g.stroke();
    },
    arrowL: function (g) {
      g.beginPath(); g.moveTo(13, 4); g.lineTo(7, 10); g.lineTo(13, 16); g.stroke();
    },
    arrowR: function (g) {
      g.beginPath(); g.moveTo(7, 4); g.lineTo(13, 10); g.lineTo(7, 16); g.stroke();
    },
    stations: function (g) { // return-to-stations: 4-way arrows
      g.beginPath(); g.moveTo(10, 3); g.lineTo(10, 17); g.moveTo(3, 10); g.lineTo(17, 10); g.stroke();
      g.beginPath(); g.moveTo(7, 5.5); g.lineTo(10, 2.5); g.lineTo(13, 5.5); g.moveTo(7, 14.5); g.lineTo(10, 17.5); g.lineTo(13, 14.5); g.stroke();
    },
    savepos: function (g) { // people pair
      g.beginPath(); g.arc(7, 7, 2.2, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(13, 7, 2.2, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(3, 16); g.arc(7, 16, 3.4, Math.PI, 0); g.moveTo(9.6, 16); g.arc(13, 16, 3.4, Math.PI, 0); g.stroke();
    }
  };

  function drawIcon(ctx, name, x, y, size, color) {
    var fn = glyphs[name];
    if (!fn) fn = glyphs.scrap;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 20, size / 20);
    ctx.strokeStyle = color || "#E7F3E5";
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    fn(ctx);
    ctx.restore();
  }

  return { drawIcon: drawIcon, octPlate: octPlate, has: function (n) { return !!glyphs[n]; } };
})();
