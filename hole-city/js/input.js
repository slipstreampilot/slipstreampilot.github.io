// Controls: touch/mouse "drag anywhere" virtual joystick (appears under your finger, like hole.io),
// plus WASD / arrow keys. Screen up = north (-z) because the camera looks north.
(function () {
  const I = { keys: new Set(), active: false, id: null, ox: 0, oy: 0, x: 0, y: 0, enabled: false };
  const RADIUS = 62, DEAD = 6;

  I.init = function (el) {
    I.stick = document.getElementById('stick'); I.knob = document.getElementById('stickKnob');
    el.addEventListener('pointerdown', (e) => {
      if (!I.enabled || I.active) return;
      I.active = true; I.touched = true; I.id = e.pointerId; I.ox = e.clientX; I.oy = e.clientY; I.x = I.y = 0;
      try { el.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      I.stick.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`; I.stick.classList.add('on'); I.knob.style.transform = 'translate(0px,0px)';
      HC.Audio && HC.Audio.unlock();
    });
    el.addEventListener('pointermove', (e) => {
      if (!I.active || e.pointerId !== I.id) return;
      let dx = e.clientX - I.ox, dy = e.clientY - I.oy; const d = Math.hypot(dx, dy);
      // Joystick origin trails the finger so long drags never "max out" in a stale direction.
      if (d > RADIUS * 1.6) { I.ox = e.clientX - dx / d * RADIUS * 1.6; I.oy = e.clientY - dy / d * RADIUS * 1.6; dx = e.clientX - I.ox; dy = e.clientY - I.oy; I.stick.style.transform = `translate(${I.ox}px, ${I.oy}px)`; }
      const dd = Math.hypot(dx, dy), k = dd < DEAD ? 0 : Math.min(1, dd / RADIUS);
      I.x = dd ? dx / dd * k : 0; I.y = dd ? dy / dd * k : 0;
      const kx = dd ? dx / dd * Math.min(dd, RADIUS) : 0, ky = dd ? dy / dd * Math.min(dd, RADIUS) : 0;
      I.knob.style.transform = `translate(${kx}px, ${ky}px)`;
    });
    const up = (e) => { if (e.pointerId !== I.id) return; I.active = false; I.id = null; I.x = I.y = 0; I.stick.classList.remove('on'); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    // Mouse wheel: optional zoom override on top of the automatic zoom (which keeps progressing as you
    // grow). Wheel up = closer, down = further out. Middle-click or the 0 key goes back to automatic.
    el.addEventListener('wheel', (e) => {
      if (!I.enabled || !(HC.Progress && HC.Progress.data.wheelZoom !== false)) return;
      e.preventDefault();
      const px = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
      I.zoom = Math.max(Math.log(I.ZOOM_MIN), Math.min(Math.log(I.ZOOM_MAX), I.zoom + px * 0.0016));
      if (Math.abs(I.zoom) < 0.03) I.zoom = 0;
      I.zoomT = 0.5;
    }, { passive: false });
    el.addEventListener('auxclick', (e) => { if (e.button === 1) { e.preventDefault(); I.resetZoom(); } });
    el.addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); });   // no autoscroll
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (k === '0' && I.enabled) I.resetZoom();
      I.keys.add(k); if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) I.touched = true; HC.Audio && HC.Audio.unlock();
    });
    window.addEventListener('keyup', (e) => I.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => { I.keys.clear(); I.active = false; I.x = I.y = 0; I.stick && I.stick.classList.remove('on'); });
  };

  I.dir = function () {
    if (I.active) return [I.x, I.y];
    const k = I.keys;
    const x = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0);
    const y = (k.has('s') || k.has('arrowdown') ? 1 : 0) - (k.has('w') || k.has('arrowup') ? 1 : 0);
    const l = Math.hypot(x, y) || 1;
    return [x / l, y / l];
  };
  // Zoom override as a log-scale factor on the automatic view width (0 = automatic).
  I.zoom = 0; I.zoomT = 0; I.ZOOM_MIN = 0.35; I.ZOOM_MAX = 3;
  I.zoomFactor = () => Math.exp(I.zoom);
  I.resetZoom = function () { if (I.zoom !== 0) { I.zoom = 0; I.zoomT = 0.5; } };
  I.reset = function () { I.active = false; I.x = I.y = 0; I.keys.clear(); I.stick && I.stick.classList.remove('on'); };

  HC.Input = I;
})();
