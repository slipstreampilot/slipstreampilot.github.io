/* Dino Drop: original cartoon dinosaurs, drawn in code (no image files).
   Each piece shape has its own dino and colour. */
'use strict';

window.DINOS = {
  I: { name: 'Brachiosaurus', color: '#4fc3f7', dark: '#0277bd', belly: '#b3e5fc' },
  O: { name: 'Ankylosaurus',  color: '#ffd54f', dark: '#c79100', belly: '#fff3c4' },
  T: { name: 'Triceratops',   color: '#b388ff', dark: '#6a3fc4', belly: '#e5d6ff' },
  S: { name: 'Stegosaurus',   color: '#66bb6a', dark: '#2e7d32', belly: '#c8e6c9' },
  Z: { name: 'Velociraptor',  color: '#ef5350', dark: '#b71c1c', belly: '#ffcdd2' },
  L: { name: 'T. rex',        color: '#ffa726', dark: '#e65100', belly: '#ffe0b2' },
  J: { name: 'Pterodactyl',   color: '#f06292', dark: '#ad1457', belly: '#f8bbd0' },
};

/* Draws a dino of `kind` fitted (centred, aspect kept) into the box x,y,w,h.
   Art is authored on a 120 x 100 grid. */
window.drawDino = function drawDino(ctx, kind, x, y, w, h, opts) {
  const d = DINOS[kind];
  if (!d) return;
  opts = opts || {};
  const s = Math.min(w / 120, h / 100);
  ctx.save();
  ctx.translate(x + (w - 120 * s) / 2, y + (h - 100 * s) / 2);
  ctx.scale(s, s);
  if (opts.flip) { ctx.translate(120, 0); ctx.scale(-1, 1); }
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 3.2;
  ctx.strokeStyle = '#2b1f3a';

  const fill = (c) => { ctx.fillStyle = c; ctx.fill(); ctx.stroke(); };
  const ell = (cx, cy, rx, ry, rot) => { ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, rot || 0, 0, Math.PI * 2); };
  const poly = (pts) => { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); };
  const leg = (lx, top, bottom, wdt) => { ctx.beginPath(); ctx.roundRect(lx - wdt / 2, top, wdt, bottom - top, wdt / 2.4); fill(d.color); };
  const eye = (ex, ey, r) => {
    r = r || 5.5;
    ell(ex, ey, r, r); fill('#fff');
    ctx.beginPath(); ctx.arc(ex + r * 0.25, ey + r * 0.1, r * 0.55, 0, Math.PI * 2); ctx.fillStyle = '#2b1f3a'; ctx.fill();
    ctx.beginPath(); ctx.arc(ex + r * 0.42, ey - r * 0.22, r * 0.2, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
  };
  const cheek = (cx, cy) => { ctx.beginPath(); ctx.arc(cx, cy, 3.4, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,105,135,.55)'; ctx.fill(); };
  const smile = (sx, sy, r) => { ctx.beginPath(); ctx.arc(sx, sy, r, 0.15 * Math.PI, 0.75 * Math.PI); ctx.stroke(); };
  const spots = (list) => { ctx.fillStyle = d.dark; ctx.globalAlpha = 0.35; for (const [sx, sy, r] of list) { ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; };

  switch (kind) {
    case 'L': { // T. rex: big head, tiny arms
      poly([42, 52, 4, 74, 44, 70]); fill(d.color);              // tail
      leg(50, 66, 92, 12); leg(66, 66, 92, 12);                 // legs
      ell(55, 55, 26, 20, -0.35); fill(d.color);                 // body
      ell(52, 60, 14, 11, -0.35); ctx.fillStyle = d.belly; ctx.fill();
      ctx.beginPath(); ctx.moveTo(72, 58); ctx.lineTo(82, 62); ctx.lineTo(84, 58); ctx.stroke(); // tiny arm
      ctx.beginPath(); ctx.roundRect(66, 14, 46, 32, 14); fill(d.color);  // head
      poly([78, 40, 82, 47, 86, 40]); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke(); // teeth
      poly([90, 40, 94, 47, 98, 40]); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
      spots([[48, 44, 4], [40, 56, 3], [60, 40, 3]]);
      eye(86, 25, 6); cheek(102, 32);
      ctx.beginPath(); ctx.moveTo(74, 40); ctx.quadraticCurveTo(92, 44, 110, 36); ctx.stroke(); // mouth
      break;
    }
    case 'T': { // Triceratops: frill + three horns
      poly([28, 58, 4, 66, 30, 70]); fill(d.color);              // tail
      leg(38, 66, 92, 13); leg(66, 66, 92, 13);
      ell(52, 60, 32, 20); fill(d.color);
      ell(52, 68, 20, 9); ctx.fillStyle = d.belly; ctx.fill();
      leg(30, 70, 92, 12); leg(58, 70, 92, 12);
      ell(80, 46, 18, 22, 0.35); fill(d.belly);                  // frill
      ell(92, 60, 17, 14); fill(d.color);                        // head
      poly([92, 48, 108, 28, 100, 50]); fill('#fff8e1');         // brow horns
      poly([84, 46, 92, 26, 92, 48]); fill('#fff8e1');
      poly([104, 60, 116, 52, 108, 64]); fill('#fff8e1');        // nose horn
      spots([[44, 50, 4], [58, 48, 3.5], [36, 60, 3]]);
      eye(94, 56, 5.5); cheek(100, 66); smile(100, 62, 6);
      break;
    }
    case 'S': { // Stegosaurus: back plates + tail spikes
      for (const [px, py, sz] of [[30, 48, 10], [44, 38, 13], [60, 35, 14], [76, 40, 12], [88, 50, 9]]) {
        poly([px - sz * 0.7, py + sz * 0.8, px, py - sz * 0.7, px + sz * 0.7, py + sz * 0.8]); fill('#ffb74d');
      }
      poly([24, 60, 2, 50, 26, 72]); fill(d.color);              // tail
      ctx.beginPath(); ctx.moveTo(8, 50); ctx.lineTo(4, 40); ctx.moveTo(14, 53); ctx.lineTo(12, 43); ctx.stroke(); // spikes
      leg(38, 66, 92, 13); leg(74, 66, 92, 13);
      ell(56, 62, 34, 19); fill(d.color);
      ell(56, 70, 22, 8); ctx.fillStyle = d.belly; ctx.fill();
      leg(30, 70, 92, 12); leg(66, 70, 92, 12);
      ell(100, 70, 13, 10); fill(d.color);                       // head
      spots([[46, 56, 4], [62, 52, 4], [76, 60, 3]]);
      eye(102, 66, 5); cheek(108, 74); smile(106, 70, 5);
      break;
    }
    case 'I': { // Brachiosaurus: very long neck
      poly([28, 64, 2, 80, 30, 76]); fill(d.color);              // tail
      leg(36, 70, 94, 13); leg(64, 70, 94, 13);
      ctx.save(); ctx.lineWidth = 20; ctx.strokeStyle = '#2b1f3a';
      ctx.beginPath(); ctx.moveTo(62, 62); ctx.quadraticCurveTo(80, 50, 84, 20); ctx.stroke();
      ctx.lineWidth = 14; ctx.strokeStyle = d.color; ctx.stroke(); ctx.restore(); // neck
      ell(48, 66, 30, 17); fill(d.color);
      ell(48, 73, 19, 7); ctx.fillStyle = d.belly; ctx.fill();
      leg(28, 74, 94, 12); leg(56, 74, 94, 12);
      ell(90, 16, 15, 10, -0.1); fill(d.color);                  // head
      spots([[40, 58, 4], [56, 56, 3.5], [74, 44, 3]]);
      eye(92, 12, 5); cheek(100, 20); smile(98, 16, 5);
      break;
    }
    case 'O': { // Ankylosaurus: armour bumps + tail club
      ctx.beginPath(); ctx.moveTo(26, 64); ctx.lineTo(10, 60); ctx.stroke();
      ell(9, 60, 8, 7); fill(d.dark);                            // club
      leg(38, 70, 92, 13); leg(74, 70, 92, 13);
      ctx.beginPath(); ctx.ellipse(56, 72, 36, 26, 0, Math.PI, 0); ctx.closePath(); fill(d.color); // shell
      ctx.fillStyle = d.dark; ctx.globalAlpha = 0.5;
      for (const [bx, by] of [[36, 64], [50, 56], [64, 56], [78, 64], [44, 70], [58, 66], [72, 70]]) {
        ctx.beginPath(); ctx.arc(bx, by, 4.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      leg(30, 72, 92, 12); leg(66, 72, 92, 12);
      ell(98, 70, 13, 11); fill(d.color);                        // head
      eye(100, 66, 5); cheek(106, 76); smile(104, 72, 5);
      break;
    }
    case 'Z': { // Velociraptor: slim, crest, long tail
      poly([40, 46, 2, 36, 40, 58]); fill(d.color);              // tail
      ctx.beginPath(); ctx.moveTo(52, 60); ctx.lineTo(48, 80); ctx.lineTo(56, 92); ctx.lineTo(62, 92); ctx.stroke(); // back leg
      ctx.beginPath(); ctx.moveTo(64, 60); ctx.lineTo(66, 80); ctx.lineTo(72, 92); ctx.lineTo(80, 92); ctx.stroke(); // front leg
      ctx.beginPath(); ctx.moveTo(80, 92); ctx.lineTo(84, 88); ctx.stroke();       // toe claw
      ell(58, 52, 22, 13, -0.2); fill(d.color);
      ell(60, 57, 13, 6, -0.2); ctx.fillStyle = d.belly; ctx.fill();
      ctx.beginPath(); ctx.moveTo(74, 56); ctx.lineTo(84, 64); ctx.stroke();       // arm
      ell(90, 34, 18, 10, -0.15); fill(d.color);                 // head
      poly([78, 26, 74, 14, 84, 24]); fill('#ffca28');           // crest feathers
      poly([84, 25, 84, 12, 90, 24]); fill('#ffca28');
      spots([[52, 46, 3.5], [62, 44, 3]]);
      eye(92, 30, 5); cheek(100, 38);
      ctx.beginPath(); ctx.moveTo(86, 40); ctx.quadraticCurveTo(96, 42, 106, 36); ctx.stroke();
      break;
    }
    case 'J': { // Pterodactyl: wings, head crest, beak
      poly([58, 48, 4, 26, 22, 56]); fill(d.color);              // left wing
      poly([62, 48, 116, 26, 98, 56]); fill(d.color);            // right wing
      ctx.globalAlpha = 0.35; ctx.strokeStyle = d.dark;
      ctx.beginPath(); ctx.moveTo(20, 34); ctx.lineTo(40, 52); ctx.moveTo(100, 34); ctx.lineTo(80, 52); ctx.stroke();
      ctx.globalAlpha = 1; ctx.strokeStyle = '#2b1f3a';
      ell(60, 56, 12, 16); fill(d.color);                        // body
      ell(60, 60, 7, 10); ctx.fillStyle = d.belly; ctx.fill();
      ctx.beginPath(); ctx.moveTo(56, 72); ctx.lineTo(54, 84); ctx.moveTo(64, 72); ctx.lineTo(66, 84); ctx.stroke(); // feet
      poly([52, 30, 34, 18, 54, 24]); fill(d.dark);              // crest
      ell(60, 30, 12, 10); fill(d.color);                        // head
      poly([68, 30, 96, 36, 68, 37]); fill('#ffca28');           // beak
      eye(60, 27, 5); cheek(54, 35);
      break;
    }
  }
  ctx.restore();
};

/* Fit a canvas's backing store to its CSS size at device-pixel resolution,
   so drawings stay crisp on Retina screens. Returns a 2D context in CSS pixels. */
window.fitCanvas = function fitCanvas(canvas, cssW, cssH) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  if (cssW != null) { canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px'; }
  const w = cssW != null ? cssW : canvas.clientWidth;
  const h = cssH != null ? cssH : canvas.clientHeight;
  const bw = Math.max(1, Math.round(w * dpr)), bh = Math.max(1, Math.round(h * dpr));
  if (canvas.width !== bw) canvas.width = bw;
  if (canvas.height !== bh) canvas.height = bh;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
};

/* roundRect polyfill for older Safari (< 16) */
if (window.CanvasRenderingContext2D && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(typeof r === 'number' ? r : 0, w / 2, h / 2);
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
  };
}

/* Pip: the baby dino of puzzle mode, still wearing half an eggshell.
   Drawn in a w x h box (2 x 2 board cells). o = { dir: 1|-1, mode: walk|fall|stun|happy, t: ms } */
window.drawPip = function drawPip(ctx, x, y, w, h, o) {
  o = o || {};
  const s = Math.min(w, h) / 100;
  const t = o.t || 0;
  const walking = o.mode === 'walk';
  const step = walking ? Math.sin(t / 110) : 0;
  const bob = walking ? Math.abs(step) * 2.5 : 0;
  ctx.save();
  ctx.translate(x + (w - 100 * s) / 2, y + (h - 100 * s) / 2);
  ctx.scale(s, s);
  if ((o.dir || 1) < 0) { ctx.translate(100, 0); ctx.scale(-1, 1); }
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.lineWidth = 3.4; ctx.strokeStyle = '#2b1f3a';
  const green = '#8bc34a', belly = '#f1f8e9';
  const fill = (c) => { ctx.fillStyle = c; ctx.fill(); ctx.stroke(); };
  // tail
  ctx.beginPath(); ctx.moveTo(26, 66); ctx.quadraticCurveTo(6, 72, 4, 86); ctx.quadraticCurveTo(18, 84, 30, 80); ctx.closePath(); fill(green);
  // legs
  ctx.beginPath(); ctx.roundRect(30, 78 - step * 3, 14, 18, 6); fill(green);
  ctx.beginPath(); ctx.roundRect(52, 78 + step * 3, 14, 18, 6); fill(green);
  ctx.translate(0, -bob);
  // body
  ctx.beginPath(); ctx.ellipse(46, 68, 26, 20, 0, 0, Math.PI * 2); fill(green);
  ctx.beginPath(); ctx.ellipse(50, 72, 14, 11, 0, 0, Math.PI * 2); ctx.fillStyle = belly; ctx.fill();
  // arm
  ctx.beginPath(); ctx.moveTo(62, 66); ctx.lineTo(70, 70); ctx.stroke();
  // head
  ctx.beginPath(); ctx.arc(64, 38, 25, 0, Math.PI * 2); fill(green);
  // spots
  ctx.fillStyle = 'rgba(51,105,30,.35)';
  [[40, 58, 4], [50, 52, 3], [52, 24, 3.5]].forEach(([a, b, r]) => { ctx.beginPath(); ctx.arc(a, b, r, 0, 7); ctx.fill(); });
  // eggshell cap
  ctx.beginPath();
  ctx.moveTo(42, 26);
  ctx.quadraticCurveTo(46, 6, 66, 6);
  ctx.quadraticCurveTo(86, 6, 88, 26);
  ctx.lineTo(82, 21); ctx.lineTo(77, 28); ctx.lineTo(71, 20); ctx.lineTo(65, 28); ctx.lineTo(59, 20); ctx.lineTo(53, 28); ctx.lineTo(47, 21);
  ctx.closePath(); fill('#fffde7');
  ctx.fillStyle = 'rgba(255,183,77,.6)';
  ctx.beginPath(); ctx.arc(60, 13, 2.4, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(74, 15, 2, 0, 7); ctx.fill();
  // face
  const ink = '#2b1f3a';
  if (o.mode === 'stun') {
    ctx.lineWidth = 2.6;
    for (const [ex, r] of [[72, 7]]) {
      ctx.beginPath();
      for (let a = 0; a < 12; a += 0.4) { const rr = r * a / 12; const px = ex + Math.cos(a + t / 120) * rr, py = 38 + Math.sin(a + t / 120) * rr; a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
      ctx.stroke();
    }
    ctx.beginPath(); ctx.ellipse(80, 52, 4, 3, 0, 0, 7); ctx.fillStyle = ink; ctx.fill();
    // dizzy stars
    ctx.fillStyle = '#ffd54f';
    for (let i = 0; i < 3; i++) {
      const a = t / 300 + i * 2.1;
      const sx = 64 + Math.cos(a) * 26, sy = 2 + Math.sin(a) * 5;
      ctx.beginPath();
      for (let k = 0; k < 10; k++) { const rr = k % 2 ? 2.5 : 6; const aa = k * Math.PI / 5 - Math.PI / 2; ctx.lineTo(sx + Math.cos(aa) * rr, sy + Math.sin(aa) * rr); }
      ctx.closePath(); ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke();
    }
  } else if (o.mode === 'happy') {
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(72, 40, 6, 1.1 * Math.PI, 1.9 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(76, 48, 8, 0.1 * Math.PI, 0.9 * Math.PI); ctx.fillStyle = '#e57373'; ctx.fill(); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(72, 36, 9, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(75, 37, 5, 0, 7); ctx.fillStyle = ink; ctx.fill();
    ctx.beginPath(); ctx.arc(77, 34, 1.8, 0, 7); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.beginPath(); ctx.arc(78, 48, 6, 0.15 * Math.PI, 0.75 * Math.PI); ctx.lineWidth = 2.8; ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(64, 50, 4, 0, 7); ctx.fillStyle = 'rgba(255,105,135,.5)'; ctx.fill();
  ctx.restore();
};
