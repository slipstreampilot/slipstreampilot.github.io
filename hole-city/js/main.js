// Boot: load save, init renderer/physics/input/audio/UI, start the attract-mode city behind the menu.
// URL flags for testing: ?mode=classic|solo|battle (skip menu), ?auto=1 (autopilot player), ?seed=N, ?fast=1
(function () {
  const q = new URLSearchParams(location.search);
  // Hash tokens also work (e.g. index.html#auto.fps) because some hosts strip query strings.
  const hash = location.hash.replace(/^#/, '').split(/[#&,.~]/);
  for (const t of hash) if (t && !q.has(t)) q.set(t, '1');
  HC.flags = { mode: q.get('mode'), auto: q.get('auto') === '1', seed: q.get('seed') ? Number(q.get('seed')) : undefined, debug: q.get('debug') === '1', view: q.get('view') ? Number(q.get('view')) : 0, headless: q.get('headless') === '1', level: q.get('level') || null, unlock: q.get('unlock') === '1' };

  // Simple greedy autopilot used by playtest tools (and handy for demos).
  HC.autopilot = function (h) {
    const near = HC.World.query(h.x, h.z, 1200);
    let best = null, bs = -1;
    for (const o of near) {
      if (o.state === 'riding' || !HC.Physics.likelyFits(o.def, h.r, 0.95)) continue;
      const d = Math.hypot(o.x - h.x, o.z - h.z), s = o.def.points / (d + 80);
      if (s > bs) { bs = s; best = o; }
    }
    for (const o of HC.Game.holes) if (o !== h && o.alive && o.r > h.r * 1.1 && Math.hypot(o.x - h.x, o.z - h.z) < o.r * 2.5 + 200) return [h.x - o.x, h.z - o.z];
    if (!best) return [2500 - h.x, 2500 - h.z];
    return [best.x - h.x, best.z - h.z];
  };

  // Headless simulation for balance testing: runs N seconds of a match as fast as possible.
  HC.sim = function (mode, seconds, opts = {}) {
    const G = HC.Game; G.headless = true; G.allPhysical = !!opts.allPhysical; G.nonePhysical = !!opts.nonePhysical;
    G.setup(mode, { seed: opts.seed, level: opts.level, botSkillBonus: opts.botSkillBonus || 0, botSpeedMul: opts.botSpeedMul, playerStartLevel: opts.playerStartLevel }); G.state = 'play'; G.autopilot = opts.idle ? (() => [0, 0]) : HC.autopilot;
    if (opts.botPilot && G.player) { HC.Bots.init(G.player, HC.U.rng(5), opts.botPilot); G.autopilot = (h) => HC.Bots.steer(h, G.holes, 1 / 60); }
    const t0 = performance.now(), log = [], lv = {};
    let steps = Math.round(seconds * 60);
    for (let i = 0; i < steps && (G.state === 'play'); i++) {
      G.step(1 / 60);
      const p = G.player; if (p && !lv[p.level]) lv[p.level] = +(i / 60).toFixed(1);
      if (i % 600 === 0) log.push({ t: i / 60, ranking: G.ranking().map((h) => `${h.name}:${h.level}/${h.score}`).join(' '), bodies: HC.Physics.active.length });
    }
    const res = G.results();
    return { ms: Math.round(performance.now() - t0), levelAt: lv, order: res.order.map((h) => ({ n: h.name, lv: h.level, s: h.score, k: h.kills, d: h.deaths, e: h.eaten })), place: res.place, percent: +(res.percent * 100).toFixed(1), log };
  };

  function boot() {
    HC.Progress.load();
    if (HC.flags.headless) { HC.Physics.init(); HC.Render.kinds = null; document.body.classList.add('ready'); return; }
    const canvas = document.getElementById('game');
    try { HC.Render.init(canvas); } catch (e) { document.getElementById('bootError').textContent = 'Hole City needs WebGL. ' + e.message; document.getElementById('bootError').hidden = false; return; }
    HC.Physics.init();
    HC.Input.init(canvas);
    HC.Audio && HC.Audio.init();
    HC.FX && HC.FX.init();
    HC.HUD && HC.HUD.init();
    HC.Menus && HC.Menus.init();
    HC.Brain && HC.Brain.init();
    const quality = HC.Progress.data.quality;
    if (quality !== 'auto') HC.Render.setQuality(quality);
    if (HC.flags.auto) HC.Game.autopilot = HC.autopilot;
    if (HC.flags.level) HC.Progress.data.level = HC.flags.level;
    if (HC.flags.mode) { HC.Menus ? HC.Menus.startMatch(HC.flags.mode, { seed: HC.flags.seed, level: HC.flags.level }) : HC.Game.setup(HC.flags.mode, { seed: HC.flags.seed, level: HC.flags.level }); }
    else { HC.Game.setup('attract', { seed: HC.flags.seed, level: HC.flags.level }); HC.Menus && HC.Menus.showHome(); }
    requestAnimationFrame(HC.Game.frame);
    document.body.classList.add('ready');
    if (q.get('fps') === '1') {
      const el = document.createElement('div'); el.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:20;background:#2B1B5A;color:#fff;font:600 12px/1.3 monospace;padding:4px 8px;border-radius:8px;pointer-events:none;white-space:pre';
      document.body.appendChild(el); let n = 0, t0 = performance.now(), worst = 0, last = t0;
      const loop = (t) => { n++; worst = Math.max(worst, t - last); last = t; if (t - t0 > 1000) { const info = HC.Render.renderer.info.render; el.textContent = `${Math.round(n * 1000 / (t - t0))} fps  worst ${worst.toFixed(0)}ms\nbodies ${HC.Physics.active.length}  calls ${info.calls}  tris ${(info.triangles / 1000).toFixed(0)}k`; n = 0; t0 = t; worst = 0; } requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    }
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', boot); else boot();
})();
