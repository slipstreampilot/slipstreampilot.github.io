// Three.js renderer.
// - The ground is real geometry whose fragment shader discards everything inside a hole, so the
//   holes are true openings: you look down into a pit and watch things tumble in.
// - Each object kind is one InstancedMesh (≈45 draw calls for ~2,000 objects).
// - Objects darken as they sink below street level.
(function () {
  const T = THREE, CFG = HC.CONFIG;
  const MAX_HOLES = 10;

  const R = {
    holeUniform: Array.from({ length: MAX_HOLES }, () => new T.Vector4(0, 0, -1, 0)),
    time: { value: 0 },
    focusU: { value: new THREE.Vector4(0, 0, -1, 1) },
    glowU: { value: 0 },
    kinds: {}, holesVis: new Map(), quality: 'high',
  };

  const tintVertex = `
    #if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
      vColor = vec3( 1.0 );
    #endif
    #ifdef USE_COLOR
      vColor *= color;
    #endif
    #ifdef USE_INSTANCING_COLOR
      vColor.xyz *= mix(vec3(1.0), instanceColor.xyz, aTint);
    #endif
  `;

  // Walk cycle: vertices tagged by Geo.limb() swing around their hip/shoulder by an angle driven by
  // the per-instance aWalk = (stride phase, how much it's walking 0..1), set from movers.js.
  const legVertex = `
    #ifdef USE_INSTANCING
      if (aLeg.x != 0.0 && aWalk.y > 0.0) {
        float hcA = aLeg.x * sin(aWalk.x) * 0.62 * aWalk.y, hcC = cos(hcA), hcS = sin(hcA);
        vec2 hcP = transformed.xy - aLeg.yz;
        transformed.xy = aLeg.yz + vec2(hcP.x * hcC - hcP.y * hcS, hcP.x * hcS + hcP.y * hcC);
      }
    #endif`;
  const legNormal = `
    #ifdef USE_INSTANCING
      if (aLeg.x != 0.0 && aWalk.y > 0.0) {
        float hcA = aLeg.x * sin(aWalk.x) * 0.62 * aWalk.y, hcC = cos(hcA), hcS = sin(hcA);
        objectNormal.xy = vec2(objectNormal.x * hcC - objectNormal.y * hcS, objectNormal.x * hcS + objectNormal.y * hcC);
      }
    #endif`;
  const legDecl = 'attribute vec3 aLeg;\nattribute vec2 aWalk;\n';
  // Shadow pass for walkers, so their shadows stride too.
  function legDepthMaterial() {
    const m = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking });
    m.onBeforeCompile = (s) => { s.vertexShader = legDecl + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>' + legVertex); };
    return m;
  }

  function objectMaterial() {
    const m = new T.MeshLambertMaterial({ vertexColors: true });
    m.onBeforeCompile = (s) => {
      s.vertexShader = legDecl + 'attribute float aTint;\nattribute float aGlow;\nvarying float vGlowV;\nvarying float vHcY;\n' + s.vertexShader
        .replace('#include <color_vertex>', tintVertex)
        .replace('#include <begin_vertex>', '#include <begin_vertex>' + legVertex)
        .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>' + legNormal)
        .replace('#include <project_vertex>', `#include <project_vertex>
          vec4 hcW = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            hcW = instanceMatrix * hcW;
          #endif
          vHcY = (modelMatrix * hcW).y; vGlowV = aGlow;`);
      s.uniforms.uFocus = R.focusU; s.uniforms.uGlow = R.glowU;
      s.fragmentShader = 'uniform vec4 uFocus;\nuniform float uGlow;\nvarying float vGlowV;\nvarying float vHcY;\n' + s.fragmentShader.replace('void main() {', `void main() {
          // See-through dither for anything standing between the camera and your hole.
          if (uFocus.z > 0.0 && vHcY > 36.0 && gl_FragCoord.z < uFocus.w) {
            float rr = length(gl_FragCoord.xy - uFocus.xy) / uFocus.z;
            if (rr < 1.0) {
              vec2 p = mod(floor(gl_FragCoord.xy), 4.0);
              float bayer = mod(p.x * 2.0 + p.y * 3.0 + p.x * p.y, 4.0) / 4.0 + 0.12;
              if (bayer < 0.78 * (1.0 - smoothstep(0.6, 1.0, rr))) discard;
            }
          }`).replace('#include <dithering_fragment>', `#include <dithering_fragment>
          gl_FragColor.rgb = mix(gl_FragColor.rgb, vColor * 1.3, clamp(vGlowV * uGlow, 0.0, 1.0));
          float sinkK = clamp(1.0 + vHcY / 70.0, 0.0, 1.0);
          gl_FragColor.rgb = mix(vec3(0.03, 0.02, 0.08), gl_FragColor.rgb, sinkK * sinkK);`);
    };
    return m;
  }

  // Ground: discard fragments inside any hole; slight ambient-occlusion ring around the lip.
  function groundMaterial() {
    const m = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide });
    m.onBeforeCompile = (s) => {
      s.uniforms.uHoles = { value: R.holeUniform };
      s.vertexShader = 'varying vec2 vHcXZ;\n' + s.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
          vHcXZ = (modelMatrix * vec4(transformed, 1.0)).xz;`);
      s.fragmentShader = `uniform vec4 uHoles[${MAX_HOLES}];\nvarying vec2 vHcXZ;\n` + s.fragmentShader.replace('void main() {', `void main() {
          float hcShade = 1.0;
          for (int i = 0; i < ${MAX_HOLES}; i++) {
            vec4 h = uHoles[i];
            if (h.z <= 0.0) continue;
            float d = distance(vHcXZ, h.xy);
            if (d < h.z) discard;
            hcShade = min(hcShade, mix(0.62, 1.0, smoothstep(h.z, h.z * 1.18 + 6.0, d)));
          }`).replace('#include <dithering_fragment>', `#include <dithering_fragment>
          gl_FragColor.rgb *= hcShade;`);
    };
    return m;
  }

  R.init = function (canvas) {
    const r = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.outputColorSpace = T.SRGBColorSpace;
    r.toneMapping = T.NoToneMapping;
    r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap;
    R.renderer = r;
    const scene = new T.Scene(); R.scene = scene;
    scene.background = new T.Color('#8FDcFF');
    scene.fog = new T.Fog('#8FDCFF', 9000, 22000);
    const cam = new T.PerspectiveCamera(CFG.camera.fov, 1, 5, 40000); R.camera = cam;
    // Bright, friendly lighting: cool sky fill + warm sun, bluish shadows.
    R.hemi = new T.HemisphereLight('#E4F6FF', '#B7A6FF', 1.55); scene.add(R.hemi);
    const sun = new T.DirectionalLight('#FFF1DC', 2.3); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 4;
    scene.add(sun); scene.add(sun.target); R.sun = sun;
    R.objMat = objectMaterial(); R.groundMat = groundMaterial();
    R.cam = { x: 2500, z: 2500, view: 700, lx: 0, lz: 0 };
    R.resize();
    window.addEventListener('resize', R.resize);
  };

  R.resize = function () {
    const w = window.innerWidth, h = window.innerHeight;
    R.renderer.setSize(w, h, false); R.camera.aspect = w / h; R.camera.updateProjectionMatrix();
    R.w = w; R.h = h;
  };

  // Per-level look: sky, fog, lights, night glow.
  R.applyTheme = function (th) {
    th = th || HC.Levels.defaultTheme;
    R.scene.background = new T.Color(th.sky); R.scene.fog = new T.Fog(th.sky, th.fogNear, th.fogFar);
    R.hemi.color.set(th.hemiSky); R.hemi.groundColor.set(th.hemiGround); R.hemi.intensity = th.hemi;
    R.sun.color.set(th.sun); R.sun.intensity = th.sunI; R.glowU.value = th.glow || 0;
    document.body.style.background = th.sky;
  };

  R.setQuality = function (q) {
    R.quality = q;
    R.renderer.setPixelRatio(q === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, q === 'high' ? 2 : 1.5));
    R.sun.castShadow = q !== 'low';
    R.resize();
  };

  // ---------------- city ----------------
  R.buildCity = function (city) {
    if (R.cityGroup) { R.scene.remove(R.cityGroup); R.cityGroup.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
    const group = new T.Group(); R.cityGroup = group; R.scene.add(group);
    R.applyTheme(city.theme);
    // Ground decals → one mesh.
    const g = new HC.Geo();
    for (const s of city.ground) {
      if (s.shape === 'rect') g.flat(s.x, s.y, s.z, s.w, s.d, s.color);
      else if (s.shape === 'strip') g.strip(s.x0, s.z0, s.x1, s.z1, s.w, s.y, s.color);
      else if (s.shape === 'disc') g.disc(s.x, s.y, s.z, s.r, s.seg, s.color, { sx: s.sx || 1, sy: s.sz || 1 });
      else if (s.shape === 'ring') g.ring(s.x, s.y, s.z, s.r0, s.r1, s.seg, s.color);
    }
    const ground = new T.Mesh(g.toGeometry(), R.groundMat); ground.receiveShadow = true; group.add(ground);
    // Island skirt so the land reads as a chunky toy island over the sea.
    const L = city.land, sk = new HC.Geo(), span = L.max - L.min + 36, mid = (L.max + L.min) / 2;
    const th = city.theme || HC.Levels.defaultTheme, skc = th.skirt;
    sk.box(mid, -60, L.min - 18 - 1, span, 120, 2, skc); sk.box(mid, -60, L.max + 18 + 1, span, 120, 2, skc);
    sk.box(L.min - 18 - 1, -60, mid, 2, 120, span, skc); sk.box(L.max + 18 + 1, -60, mid, 2, 120, span, skc);
    group.add(new T.Mesh(sk.toGeometry(), R.objMat));
    // Sea.
    const seaMat = new T.ShaderMaterial({
      uniforms: { uTime: R.time, uCenter: { value: new T.Vector2(mid, mid) }, uHalf: { value: (L.max - L.min) / 2 + 18 },
        uDeep: { value: new T.Color(th.sea.deep) }, uShal: { value: new T.Color(th.sea.shallow) }, uFoam: { value: th.sea.foam ?? 1 }, uStars: { value: th.stars ? 1 : 0 } }, fog: false,
      vertexShader: `varying vec2 vXZ; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vXZ=w.xz; gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `uniform float uTime; uniform vec2 uCenter; uniform float uHalf; uniform vec3 uDeep; uniform vec3 uShal; uniform float uFoam; uniform float uStars; varying vec2 vXZ;
        void main(){
          vec2 d = abs(vXZ-uCenter); float edge = max(d.x,d.y)-uHalf;
          if (edge < -2.0) discard;
          float shallow = 1.0-smoothstep(0.0, 900.0, edge);
          vec3 deep = uDeep, shal = uShal;
          vec3 c = mix(deep, shal, shallow);
          float w = sin(vXZ.x*0.012+uTime*1.3)*sin(vXZ.y*0.011-uTime*1.1);
          float foam = smoothstep(0.9,0.99,w) * 0.12 + (1.0-smoothstep(0.0,45.0,edge))*0.55*(0.6+0.4*sin(uTime*2.0+vXZ.x*0.02));
          float sparkle = step(0.995, fract(sin(dot(floor(vXZ/18.0), vec2(12.9898,78.233)))*43758.5453 + uTime*0.15)) * 0.35;
          foam = (foam + sparkle) * uFoam;
          float star = uStars * step(0.985, fract(sin(dot(floor(vXZ/30.0), vec2(41.3,289.1)))*15731.7)) * (0.6 + 0.4*sin(uTime*3.0 + vXZ.x));
          gl_FragColor = vec4(c + foam + star, 1.0);
        }` });
    const sea = new T.Mesh(new T.PlaneGeometry(60000, 60000), seaMat); sea.rotation.x = -Math.PI / 2; sea.position.set(mid, -24, mid); group.add(sea);

    // Instanced meshes per kind.
    R.kinds = {};
    const counts = {};
    for (const o of city.objects) counts[o.kind] = (counts[o.kind] || 0) + 1;
    for (const kind in counts) {
      const def = HC.CATALOG[kind], geo = new HC.Geo(); def.build(geo);
      const bg = geo.toGeometry(); if (def.hs) { bg.scale(1, def.hs, 1); bg.computeBoundingSphere(); }
      const legs = !!bg.attributes.aLeg;
      if (legs && def.hs) { const a = bg.attributes.aLeg; for (let i = 0; i < a.count; i++) a.setZ(i, a.getZ(i) * def.hs); }
      if (legs) bg.setAttribute('aWalk', new T.InstancedBufferAttribute(new Float32Array(counts[kind] * 2), 2).setUsage(T.DynamicDrawUsage));
      const mesh = new T.InstancedMesh(bg, R.objMat, counts[kind]);
      if (legs) { R.legDepth = R.legDepth || legDepthMaterial(); mesh.customDepthMaterial = R.legDepth; }
      mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
      const colors = new Float32Array(counts[kind] * 3).fill(1); mesh.instanceColor = new T.InstancedBufferAttribute(colors, 3);
      R.kinds[kind] = { mesh, next: 0, dirty: true, walk: legs ? bg.attributes.aWalk : null, walkDirty: false };
      group.add(mesh);
    }
    const c = new T.Color();
    for (const o of city.objects) {
      const k = R.kinds[o.kind]; o.inst = k.next++;
      const def = HC.CATALOG[o.kind];
      if (def.tints) { c.set(def.tints[o.tint % def.tints.length]); k.mesh.instanceColor.setXYZ(o.inst, c.r, c.g, c.b); }
    }
  };

  const tmpM = new T.Matrix4(), tmpP = new T.Vector3(), tmpQ = new T.Quaternion(), ONE = new T.Vector3(1, 1, 1), ZERO = new T.Vector3(0, 0, 0);
  // o.p = mesh origin (base center) [x,y,z]; o.q = quaternion [x,y,z,w]
  R.setObject = function (o) {
    const k = R.kinds && R.kinds[o.kind]; if (!k) return;
    tmpP.set(o.p[0], o.p[1], o.p[2]); tmpQ.set(o.q[0], o.q[1], o.q[2], o.q[3]);
    tmpM.compose(tmpP, tmpQ, ONE); k.mesh.setMatrixAt(o.inst, tmpM); k.dirty = true;
  };
  // Stride phase and walking amount (0 = legs at rest) for one walker.
  R.setWalk = function (o, phase, amt) {
    const k = R.kinds && R.kinds[o.kind]; if (!k || !k.walk) return;
    k.walk.setXY(o.inst, phase, amt); k.walkDirty = true;
  };
  R.hideObject = function (o) { const k = R.kinds && R.kinds[o.kind]; if (!k) return; tmpM.compose(tmpP.set(0, -9999, 0), tmpQ.identity(), ZERO); k.mesh.setMatrixAt(o.inst, tmpM); k.dirty = true; };

  // ---------------- holes ----------------
  const pitGeo = (() => { const g = new T.CylinderGeometry(1, 1, 1, 48, 6, true); g.translate(0, -0.5, 0); return g; })();
  const rimGeo = new T.RingGeometry(1, 1.0001, 72, 1);
  const pitMat = new T.ShaderMaterial({
    side: T.BackSide, uniforms: { uTint: { value: new T.Color('#3b2a6b') } },
    vertexShader: `varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uTint; varying float vY; void main(){ float k = smoothstep(0.0, 0.12, -vY); gl_FragColor = vec4(mix(uTint*0.55, vec3(0.0), k), 1.0); }`,
  });
  function rimMaterial(skin) {
    return new T.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uTime: R.time, uA: { value: new T.Color(skin.colors[0]) }, uB: { value: new T.Color(skin.colors[1] || skin.colors[0]) }, uPattern: { value: skin.pattern || 0 }, uAlpha: { value: 1 } },
      vertexShader: `varying vec2 vUv; varying vec2 vP; void main(){ vUv = uv; vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform float uTime; uniform vec3 uA; uniform vec3 uB; uniform float uPattern; uniform float uAlpha; varying vec2 vUv; varying vec2 vP;
        vec3 hsv(float h){ vec3 k = clamp(abs(mod(h*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0,0.0,1.0); return k; }
        void main(){
          float a = atan(vP.y, vP.x);
          vec3 c = uA;
          if (uPattern > 0.5 && uPattern < 1.5) c = mix(uA, uB, step(0.5, fract(a*3.0/3.14159 + uTime*0.6)));
          else if (uPattern > 1.5 && uPattern < 2.5) c = hsv(fract(a/6.28318 + uTime*0.25))*0.9+0.1;
          else if (uPattern > 2.5 && uPattern < 3.5) c = mix(uA, uB, 0.5+0.5*sin(uTime*5.0));
          else if (uPattern > 3.5 && uPattern < 4.5) c = mix(uA, uB, smoothstep(-1.0,1.0,sin(a*8.0 - uTime*6.0)));
          else if (uPattern > 4.5) c = mix(uA, uB, fract(a*5.0/3.14159 - uTime*1.5) );
          gl_FragColor = vec4(c, uAlpha);
        }`,
    });
  }

  R.addHole = function (h) {
    const vis = { group: new T.Group() };
    vis.pit = new T.Mesh(pitGeo, pitMat.clone()); vis.pit.material.uniforms.uTint.value = new T.Color(h.skin.colors[0]).multiplyScalar(0.6);
    vis.rim = new T.Mesh(rimGeo, rimMaterial(h.skin)); vis.rim.rotation.x = -Math.PI / 2; vis.rim.renderOrder = 2;
    vis.group.add(vis.pit); vis.group.add(vis.rim);
    R.scene.add(vis.group); R.holesVis.set(h, vis);
  };
  R.setHoleSkin = function (h) { const v = R.holesVis.get(h); if (!v) return; v.rim.material.dispose(); v.rim.material = rimMaterial(h.skin); v.pit.material.uniforms.uTint.value = new T.Color(h.skin.colors[0]).multiplyScalar(0.6); };
  R.removeHole = function (h) { const v = R.holesVis.get(h); if (!v) return; R.scene.remove(v.group); v.rim.material.dispose(); v.pit.material.dispose(); R.holesVis.delete(h); };
  R.clearHoles = function () { for (const h of [...R.holesVis.keys()]) R.removeHole(h); };

  R.updateHoles = function (holes) {
    let i = 0;
    for (const h of holes) {
      const v = R.holesVis.get(h); if (!v) continue;
      const r = h.rv * (h.dying != null ? Math.max(0, 1 - h.dying) : 1);
      const visible = (h.alive || h.dying != null) && r > 0.5;
      v.group.visible = visible;
      if (!visible) continue;
      v.group.position.set(h.x, 0, h.z);
      v.pit.scale.set(r, Math.max(400, r * 8), r);
      const rimW = Math.max(2.2, r * 0.07);
      v.rim.scale.set(1, 1, 1);
      v.rim.geometry = v.rim.geometry; // shared geometry; width via per-hole ring below
      if (!v.ringGeo || Math.abs(v.ringR - r) > 0.25) {
        if (v.ringGeo) v.ringGeo.dispose();
        v.ringGeo = new T.RingGeometry(r, r + rimW, 72, 1); v.rim.geometry = v.ringGeo; v.ringR = r;
      }
      v.rim.position.y = 3.6;
      v.rim.material.uniforms.uAlpha.value = h.protect > 0 ? 0.35 + 0.65 * (Math.sin(performance.now() / 70) > 0 ? 1 : 0) : 1;
      if (i < MAX_HOLES) R.holeUniform[i++].set(h.x, h.z, r, 0);
    }
    for (; i < MAX_HOLES; i++) R.holeUniform[i].set(0, 0, -1, 0);
  };

  // Ghost circle you steer while waiting to respawn.
  R.setGhost = function (g, h) {
    if (!R.ghost) {
      const geo = new T.RingGeometry(0.82, 1, 48, 1, 0, Math.PI * 2);
      R.ghost = new T.Mesh(geo, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false }));
      R.ghost.rotation.x = -Math.PI / 2; R.ghost.renderOrder = 4; R.scene.add(R.ghost);
    }
    R.ghost.visible = !!g;
    if (!g) return;
    const r = HC.CONFIG.hole.startRadius * 2.2, pulse = 1 + 0.12 * Math.sin(performance.now() / 160);
    R.ghost.position.set(g.x, 5, g.z); R.ghost.scale.set(r * pulse, r * pulse, r * pulse);
    R.ghost.material.color.set(h && h.skin ? h.skin.colors[0] : '#ffffff');
  };

  // ---------------- camera ----------------
  R.updateCamera = function (tx, tz, viewW, dt, lead = [0, 0], snap = false) {
    const c = R.cam, U = HC.U;
    const e = snap ? 1e6 : CFG.camera.ease;
    c.x = U.damp(c.x, tx + lead[0], 6, snap ? 1e3 : dt); c.z = U.damp(c.z, tz + lead[1], 6, snap ? 1e3 : dt);
    c.view = U.damp(c.view, viewW, e, snap ? 1e3 : dt);
    const cam = R.camera, fovV = cam.fov * Math.PI / 180, fovH = 2 * Math.atan(Math.tan(fovV / 2) * cam.aspect);
    const minF = Math.min(fovV, fovH), d = c.view / (2 * Math.tan(minF / 2));
    const pitch = CFG.camera.pitchDeg * Math.PI / 180;
    cam.position.set(c.x, Math.sin(pitch) * d, c.z + Math.cos(pitch) * d);
    cam.lookAt(c.x, 0, c.z);
    cam.near = Math.max(5, d * 0.05); cam.far = d * 12 + 20000; cam.updateProjectionMatrix();
    // Shadow frustum follows the view.
    const s = R.sun, span = c.view * 1.4 + 400;
    s.position.set(c.x - span * 0.55, span * 1.6 + 1200, c.z + span * 0.45); s.target.position.set(c.x, 0, c.z);
    const sc = s.shadow.camera; sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span; sc.near = 10; sc.far = span * 5 + 4000; sc.updateProjectionMatrix();
  };

  // Screen-space circle around the followed hole for the see-through effect.
  R.setFocus = function (h) {
    if (!h || !h.alive) { R.focusU.value.z = -1; return; }
    projV.set(h.x, 0, h.z).project(R.camera);
    const W = R.renderer.domElement.width, Hh = R.renderer.domElement.height;
    projV2.set(h.x + h.rv, 0, h.z).project(R.camera);
    const rpx = Math.abs(projV2.x - projV.x) * 0.5 * W;
    R.focusU.value.set((projV.x * 0.5 + 0.5) * W, (projV.y * 0.5 + 0.5) * Hh, rpx * 2.6 + 70 * R.renderer.getPixelRatio(), projV.z * 0.5 + 0.5);
  };
  const projV = new T.Vector3(), projV2 = new T.Vector3();
  R.project = function (x, y, z) {
    projV.set(x, y, z).project(R.camera);
    return { x: (projV.x * 0.5 + 0.5) * R.w, y: (-projV.y * 0.5 + 0.5) * R.h, behind: projV.z > 1 };
  };

  R.render = function (dt) {
    R.time.value += dt;
    for (const k in R.kinds) { const kk = R.kinds[k]; if (kk.dirty) { kk.mesh.instanceMatrix.needsUpdate = true; kk.dirty = false; } if (kk.walkDirty) { kk.walk.needsUpdate = true; kk.walkDirty = false; } }
    HC.FX && HC.FX.update(dt);
    R.renderer.render(R.scene, R.camera);
  };

  HC.Render = R;
})();
