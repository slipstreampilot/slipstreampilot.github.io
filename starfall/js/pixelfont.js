/* STARFALL - code-drawn 5x7 bitmap pixel font. No font files.
   Each glyph = 7 rows x 5 bits (MSB left). drawText renders crisp scaled
   pixels with optional 1px dark outline (heading style). */
"use strict";

var PIXEL_FONT = {
  "A": [14,17,17,31,17,17,17], "B": [30,17,17,30,17,17,30], "C": [14,17,16,16,16,17,14],
  "D": [30,17,17,17,17,17,30], "E": [31,16,16,30,16,16,31], "F": [31,16,16,30,16,16,16],
  "G": [14,17,16,23,17,17,14], "H": [17,17,17,31,17,17,17], "I": [14,4,4,4,4,4,14],
  "J": [7,2,2,2,2,18,12],     "K": [17,18,20,24,20,18,17], "L": [16,16,16,16,16,16,31],
  "M": [17,27,21,21,17,17,17],"N": [17,25,21,19,17,17,17], "O": [14,17,17,17,17,17,14],
  "P": [30,17,17,30,16,16,16],"Q": [14,17,17,17,21,18,13], "R": [30,17,17,30,20,18,17],
  "S": [15,16,16,14,1,1,30],  "T": [31,4,4,4,4,4,4],       "U": [17,17,17,17,17,17,14],
  "V": [17,17,17,17,17,10,4], "W": [17,17,17,21,21,21,10], "X": [17,17,10,4,10,17,17],
  "Y": [17,17,10,4,4,4,4],    "Z": [31,1,2,4,8,16,31],
  "a": [0,0,14,1,15,17,15],   "b": [16,16,30,17,17,17,30], "c": [0,0,14,17,16,17,14],
  "d": [1,1,15,17,17,17,15],  "e": [0,0,14,17,31,16,14],   "f": [6,8,28,8,8,8,8],
  "g": [0,0,15,17,15,1,14],   "h": [16,16,30,17,17,17,17], "i": [4,0,12,4,4,4,14],
  "j": [2,0,6,2,2,18,12],     "k": [16,16,18,20,24,20,18], "l": [12,4,4,4,4,4,14],
  "m": [0,0,26,21,21,21,21],  "n": [0,0,30,17,17,17,17],   "o": [0,0,14,17,17,17,14],
  "p": [0,0,30,17,30,16,16],  "q": [0,0,15,17,15,1,1],     "r": [0,0,22,25,16,16,16],
  "s": [0,0,15,16,14,1,30],   "t": [8,8,28,8,8,9,6],       "u": [0,0,17,17,17,19,13],
  "v": [0,0,17,17,17,10,4],   "w": [0,0,17,17,21,21,10],   "x": [0,0,17,10,4,10,17],
  "y": [0,0,17,17,15,1,14],   "z": [0,0,31,2,4,8,31],
  "0": [14,17,19,21,25,17,14],"1": [4,12,4,4,4,4,14],      "2": [14,17,1,2,4,8,31],
  "3": [31,2,4,2,1,17,14],    "4": [2,6,10,18,31,2,2],     "5": [31,16,30,1,1,17,14],
  "6": [6,8,16,30,17,17,14],  "7": [31,1,2,4,8,8,8],       "8": [14,17,17,14,17,17,14],
  "9": [14,17,17,15,1,2,12],
  " ": [0,0,0,0,0,0,0],       "!": [4,4,4,4,4,0,4],        "\"": [10,10,10,0,0,0,0],
  "'": [4,4,8,0,0,0,0],       "(": [2,4,8,8,8,4,2],        ")": [8,4,2,2,2,4,8],
  "+": [0,4,4,31,4,4,0],      ",": [0,0,0,0,0,4,8],        "-": [0,0,0,31,0,0,0],
  ".": [0,0,0,0,0,12,12],     "/": [1,1,2,4,8,16,16],      ":": [0,12,12,0,12,12,0],
  ";": [0,12,12,0,12,4,8],    "?": [14,17,1,2,4,0,4],      "%": [25,26,2,4,8,11,19],
  "=": [0,0,31,0,31,0,0],     "<": [2,4,8,16,8,4,2],       ">": [8,4,2,1,2,4,8],
  "[": [14,8,8,8,8,8,14],     "]": [14,2,2,2,2,2,14],      "*": [0,21,14,31,14,21,0],
  "#": [10,10,31,10,31,10,10],"$": [4,15,20,14,5,30,4],    "_": [0,0,0,0,0,0,31],
  "|": [4,4,4,4,4,4,4],       "&": [12,18,20,8,21,18,13],  "~": [0,0,8,21,2,0,0],
  "^": [4,10,17,0,0,0,0],     "@": [14,17,23,21,23,16,14], "{": [6,8,8,16,8,8,6],
  "}": [12,2,2,1,2,2,12],     "\\": [16,16,8,4,2,1,1]
};

var PixelFont = (function () {
  var cache = {}; // key -> canvas per (char|scale|color|outline)
  var GW = 5, GH = 7;

  function glyph(ch) { return PIXEL_FONT[ch] || PIXEL_FONT["?"]; }

  function renderGlyph(ch, scale, color, outline) {
    var key = ch + "|" + scale + "|" + color + "|" + (outline || "");
    var c = cache[key];
    if (c) return c;
    var pad = outline ? 1 : 0;
    c = document.createElement("canvas");
    c.width = (GW + pad * 2) * scale;
    c.height = (GH + pad * 2) * scale;
    var g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    var rows = glyph(ch), x, y;
    if (outline) {
      g.fillStyle = outline;
      for (y = 0; y < GH; y++) for (x = 0; x < GW; x++) {
        if (rows[y] & (16 >> x)) {
          for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
            g.fillRect((x + pad + dx) * scale, (y + pad + dy) * scale, scale, scale);
          }
        }
      }
    }
    g.fillStyle = color;
    for (y = 0; y < GH; y++) for (x = 0; x < GW; x++) {
      if (rows[y] & (16 >> x)) g.fillRect((x + pad) * scale, (y + pad) * scale, scale, scale);
    }
    cache[key] = c;
    return c;
  }

  // ---- contrast auditor (debug builds/tests only; enable with window.SF_AUDIT) ----
  function relLum(r, g, b) {
    function lin(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  }
  function parseColor(str) {
    if (!str) return null;
    var m = /^#([0-9a-f]{6})$/i.exec(str);
    if (m) {
      var n = parseInt(m[1], 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(str);
    if (m) return [+m[1], +m[2], +m[3]];
    return null;
  }
  function auditContrast(ctx, text, sx, sy, wpx, hpx, color, scale) {
    if (!text || !text.trim()) return;
    if (window.SF_TRANSIENT) return; // mid-animation frames sample shifted backgrounds
    var rgb = parseColor(color);
    if (!rgb) return;
    var data;
    try {
      data = ctx.getImageData(Math.max(0, sx), Math.max(0, sy), Math.max(1, Math.min(wpx, 600)), Math.max(1, hpx)).data;
    } catch (e) { return; }
    var lum = 0, n = 0;
    for (var i = 0; i < data.length; i += 32) { // sample every 8th pixel
      lum += relLum(data[i], data[i + 1], data[i + 2]);
      n++;
    }
    if (!n) return;
    lum /= n;
    var tl = relLum(rgb[0], rgb[1], rgb[2]);
    var ratio = (Math.max(lum, tl) + 0.05) / (Math.min(lum, tl) + 0.05);
    var min = scale >= 3 ? 3.0 : 4.5;
    if (ratio < min) {
      var log = window.SF_CONTRAST_LOG = window.SF_CONTRAST_LOG || {};
      var key = (window.SF_SCREEN || "?") + "|" + color + "|" + text.substring(0, 20);
      if (!log[key] || ratio < log[key].ratio) {
        log[key] = {
          screen: window.SF_SCREEN || "?", text: text.substring(0, 32), color: color,
          ratio: Math.round(ratio * 100) / 100, x: sx, y: sy, scale: scale, bgLum: Math.round(lum * 100) / 100
        };
      }
    }
  }

  // opts: {scale, color, outline, align:"left|center|right", valign:"top|middle"}
  function drawText(ctx, text, x, y, opts) {
    opts = opts || {};
    var scale = opts.scale || 2;
    var color = opts.color || "#E7F3E5";
    var outline = opts.outline || null;
    var adv = (GW + 1) * scale;
    var w = textWidth(text, scale);
    var sx = x;
    if (opts.align === "center") sx = x - w / 2;
    else if (opts.align === "right") sx = x - w;
    var sy = y;
    if (opts.valign === "middle") sy = y - (GH * scale) / 2;
    sx = Math.round(sx); sy = Math.round(sy);
    if (window.SF_AUDIT && !outline) auditContrast(ctx, text, sx, sy, w, GH * scale, color, scale);
    var pad = outline ? scale : 0;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (ch !== " ") {
        var img = renderGlyph(ch, scale, color, outline);
        ctx.drawImage(img, sx - pad, sy - pad);
      }
      sx += adv;
    }
    return w;
  }

  function textWidth(text, scale) {
    scale = scale || 2;
    return text.length * (GW + 1) * scale - scale;
  }

  function lineHeight(scale) { return (GH + 3) * (scale || 2); }

  // Word wrap into lines that fit maxWidth at scale.
  function wrap(text, scale, maxWidth) {
    var out = [];
    var paras = String(text).split("\n");
    for (var p = 0; p < paras.length; p++) {
      var words = paras[p].split(" ");
      var line = "";
      for (var i = 0; i < words.length; i++) {
        var t = line ? line + " " + words[i] : words[i];
        if (textWidth(t, scale) > maxWidth && line) {
          out.push(line);
          line = words[i];
        } else line = t;
      }
      out.push(line);
    }
    return out;
  }

  function drawParagraph(ctx, text, x, y, opts) {
    opts = opts || {};
    var scale = opts.scale || 2;
    var lines = wrap(text, scale, opts.maxWidth || 400);
    var lh = lineHeight(scale);
    for (var i = 0; i < lines.length; i++) {
      drawText(ctx, lines[i], x, y + i * lh, opts);
    }
    return lines.length * lh;
  }

  return {
    drawText: drawText,
    textWidth: textWidth,
    lineHeight: lineHeight,
    wrap: wrap,
    drawParagraph: drawParagraph
  };
})();
