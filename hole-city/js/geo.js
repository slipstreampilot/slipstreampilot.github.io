// Low-poly geometry builder. Primitives are merged into one flat-shaded, vertex-colored
// BufferGeometry per object kind, so each kind renders as a single instanced draw call.
// The extra attribute `aTint` (0/1) marks vertices that take the per-instance body color.
(function () {
  const T = THREE;
  const tmpY = new T.Matrix4(), tmpM = new T.Matrix4(), tmpQ = new T.Quaternion(), tmpE = new T.Euler(), tmpS = new T.Vector3(), tmpP = new T.Vector3();

  class Geo {
    constructor() { this.pos = []; this.nor = []; this.col = []; this.tint = []; this.glow = []; this.leg = []; this._leg = null; this.hasLegs = false; }

    // Mark everything drawn inside fn() as glowing (lit windows, neon, lanterns) for night levels.
    glowing(fn) { this._glow = 1; fn(); this._glow = 0; return this; }
    // Mark everything drawn inside fn() as a swinging limb for the walk cycle. `swing` is the signed
    // share of the stride (+1 / -1 for legs in opposite phase, about ∓0.6 for arms), and (px, py) is
    // the hip or shoulder it pivots around. Models face +x, so limbs swing in the x-y plane.
    // Turn everything drawn inside fn() about the vertical axis (used to make older models face +x).
    turned(yaw, fn) { const prev = this._yaw || 0; this._yaw = prev + yaw; fn(); this._yaw = prev; return this; }
    limb(swing, px, py, fn) { const prev = this._leg; this._leg = [swing, px, py]; this.hasLegs = true; fn(); this._leg = prev; return this; }
    _add(geom, x, y, z, rx, ry, rz, sx, sy, sz, color, tint, shade) {
      let g = geom.index ? geom.toNonIndexed() : geom;
      tmpE.set(rx, ry, rz); tmpQ.setFromEuler(tmpE); tmpP.set(x, y, z); tmpS.set(sx, sy, sz);
      tmpM.compose(tmpP, tmpQ, tmpS); if (this._yaw) tmpM.premultiply(tmpY.makeRotationY(this._yaw)); g.applyMatrix4(tmpM); g.computeVertexNormals();
      const p = g.attributes.position.array, n = g.attributes.normal.array;
      // Colors are authored in sRGB; three.js expects linear vertex colors.
      const c = (typeof color === 'string' ? HC.U.hexToRgb(color) : color).map((v) => Math.pow(v, 2.2));
      for (let i = 0; i < p.length; i += 3) {
        this.pos.push(p[i], p[i + 1], p[i + 2]); this.nor.push(n[i], n[i + 1], n[i + 2]);
        // Gentle top-lit shading baked into vertex color keeps flat faces readable even in shadow.
        const up = n[i + 1], k = shade === false ? 1 : 0.9 + 0.1 * up;
        this.col.push(c[0] * k, c[1] * k, c[2] * k); this.tint.push(tint ? 1 : 0); this.glow.push(this._glow || 0);
        const L = this._leg; if (L) this.leg.push(L[0], L[1], L[2]); else this.leg.push(0, 0, 0);
      }
      g.dispose(); if (g !== geom) geom.dispose();
      return this;
    }
    box(x, y, z, w, h, d, color, o = {}) { return this._add(new T.BoxGeometry(1, 1, 1), x, y, z, o.rx || 0, o.ry || 0, o.rz || 0, w, h, d, color, o.tint, o.shade); }
    // Box positioned by its bottom face (y = base).
    block(x, base, z, w, h, d, color, o = {}) { return this.box(x, base + h / 2, z, w, h, d, color, o); }
    cyl(x, base, z, rTop, rBot, h, seg, color, o = {}) { return this._add(new T.CylinderGeometry(rTop, rBot, h, seg, 1), x, base + h / 2, z, o.rx || 0, o.ry || 0, o.rz || 0, 1, 1, 1, color, o.tint, o.shade); }
    cone(x, base, z, r, h, seg, color, o = {}) { return this.cyl(x, base, z, 0.001, r, h, seg, color, o); }
    ball(x, y, z, r, color, o = {}) { return this._add(new T.IcosahedronGeometry(r, o.detail ?? 0), x, y, z, o.rx || 0, o.ry || 0, o.rz || 0, o.sx || 1, o.sy || 1, o.sz || 1, color, o.tint, o.shade); }
    // A flat rectangle facing +y (ground decals) or a facade panel.
    flat(x, y, z, w, d, color, o = {}) { return this._add(new T.PlaneGeometry(1, 1), x, y, z, -Math.PI / 2, o.ry || 0, 0, w, d, 1, color, o.tint, false); }
    // Flat quadrilateral on the ground from four [x, z] corners (counter-clockwise seen from above).
    quadXZ(pts, y, color) {
      const c = (typeof color === 'string' ? HC.U.hexToRgb(color) : color).map((v) => Math.pow(v, 2.2));
      // Wind every triangle so it faces up (+y), whatever order the corners came in.
      const tri = (a, b, d) => { if ((b[1] - a[1]) * (d[0] - a[0]) - (b[0] - a[0]) * (d[1] - a[1]) < 0) [b, d] = [d, b]; for (const p of [a, b, d]) { this.pos.push(p[0], y, p[1]); this.nor.push(0, 1, 0); this.col.push(c[0], c[1], c[2]); this.tint.push(0); this.glow.push(0); this.leg.push(0, 0, 0); } };
      tri(pts[0], pts[1], pts[2]); tri(pts[0], pts[2], pts[3]);
      return this;
    }
    strip(x0, z0, x1, z1, w, y, color) {
      const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz) || 1, nx = -dz / l * w / 2, nz = dx / l * w / 2;
      return this.quadXZ([[x0 + nx, z0 + nz], [x1 + nx, z1 + nz], [x1 - nx, z1 - nz], [x0 - nx, z0 - nz]], y, color);
    }
    disc(x, y, z, r, seg, color, o = {}) { return this._add(new T.CircleGeometry(r, seg), x, y, z, -Math.PI / 2, 0, 0, o.sx || 1, o.sy || 1, 1, color, o.tint, false); }
    ring(x, y, z, r0, r1, seg, color, o = {}) { return this._add(new T.RingGeometry(r0, r1, seg), x, y, z, -Math.PI / 2, 0, 0, 1, 1, 1, color, o.tint, false); }
    // Panel on a wall: face is 'x+','x-','z+','z-'.
    panel(face, x, y, z, w, h, color, o = {}) {
      const ry = { 'z+': 0, 'x+': Math.PI / 2, 'z-': Math.PI, 'x-': -Math.PI / 2 }[face];
      return this._add(new T.PlaneGeometry(1, 1), x, y, z, 0, ry, 0, w, h, 1, color, o.tint, false);
    }
    // Gable roof spanning along x.
    gable(x, base, z, w, d, h, color, o = {}) {
      const s = new T.Shape(); s.moveTo(-d / 2, 0); s.lineTo(d / 2, 0); s.lineTo(0, h); s.lineTo(-d / 2, 0);
      const g = new T.ExtrudeGeometry(s, { depth: w, bevelEnabled: false });
      g.translate(0, 0, -w / 2); g.rotateY(Math.PI / 2);
      return this._add(g, x, base, z, 0, o.ry || 0, 0, 1, 1, 1, color, o.tint, o.shade);
    }
    // Repeating windows on all four sides of a w×d block between y0..y1.
    windows(x, z, w, d, y0, y1, rows, cols, color, o = {}) {
      const inset = 0.6, ww = (w / cols) * (o.fill || 0.55), dw = (d / cols) * (o.fill || 0.55), hh = ((y1 - y0) / rows) * (o.fillY || 0.55);
      for (let r = 0; r < rows; r++) {
        const y = y0 + (r + 0.5) * (y1 - y0) / rows;
        for (let c = 0; c < cols; c++) {
          const fx = x - w / 2 + (c + 0.5) * w / cols, fz = z - d / 2 + (c + 0.5) * d / cols;
          const lit = o.litColor && ((r * 7 + c * 13 + (o.seed || 0)) % 5 === 0);
          const col = lit ? o.litColor : color; const g0 = this._glow; if (lit) this._glow = 1;
          this.panel('z+', fx, y, z + d / 2 + inset, ww, hh, col); this.panel('z-', fx, y, z - d / 2 - inset, ww, hh, col);
          this.panel('x+', x + w / 2 + inset, y, fz, dw, hh, col); this.panel('x-', x - w / 2 - inset, y, fz, dw, hh, col);
          this._glow = g0;
        }
      }
      return this;
    }
    toGeometry() {
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(this.pos, 3));
      g.setAttribute('normal', new T.Float32BufferAttribute(this.nor, 3));
      g.setAttribute('color', new T.Float32BufferAttribute(this.col, 3));
      g.setAttribute('aTint', new T.Float32BufferAttribute(this.tint, 1));
      g.setAttribute('aGlow', new T.Float32BufferAttribute(this.glow, 1));
      if (this.hasLegs) g.setAttribute('aLeg', new T.Float32BufferAttribute(this.leg, 3));
      g.computeBoundingSphere(); g.computeBoundingBox();
      return g;
    }
  }
  HC.Geo = Geo;
})();
