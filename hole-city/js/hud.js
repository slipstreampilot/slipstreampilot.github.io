// In-match HUD and event director: leaderboard, timer, floating "+N" popups, level-ups,
// kill feed, threat arrows, hole name labels, countdown and respawn messages.
// Game events are routed here and fanned out to FX and Audio.
(function () {
  const U = HC.U;
  const H = { labels: new Map(), popPool: [], arrowPool: [], lastSec: null };
  const $ = (id) => document.getElementById(id);
  let UNLOCKS = [];

  H.init = function () {
    H.el = { hud: $('hud'), board: $('board'), timer: $('timer'), mode: $('modeTag'), kills: $('kills'), feed: $('feed'), arrows: $('arrows'),
      center: $('centerMsg'), toast: $('levelToast'), labels: $('labels'), popups: $('popups'), solo: $('soloBar') };
    HC.Game.onEvent = H.onEvent;
  };

  H.show = function (on) {
    H.el.hud.hidden = !on;
    if (!on) { H.el.labels.innerHTML = ''; H.labels.clear(); H.el.feed.innerHTML = ''; H.el.center.className = 'center-msg'; H.el.arrows.innerHTML = ''; H.arrowPool = []; }
  };
  H.reset = function () {
    const G = HC.Game;
    H.el.mode.textContent = G.cfg.label.toUpperCase();
    H.el.solo.hidden = G.mode !== 'solo';
    H.el.kills.hidden = G.mode === 'solo';
    H.el.board.hidden = G.mode === 'solo';
    H.el.feed.innerHTML = ''; H.lastSec = null;
    for (const [, n] of H.labels) n.remove(); H.labels.clear();
    UNLOCKS = (G.level && G.level.milestones) || [];
    H.fitSeen = new Set(UNLOCKS.filter(([k]) => HC.Physics.likelyFits(HC.CATALOG[k], HC.CONFIG.hole.startRadius)).map(([k]) => k));
  };

  H.message = function (html, cls = '', ms = 0) {
    const c = H.el.center; c.innerHTML = html; c.className = 'center-msg show ' + cls;
    clearTimeout(H.msgT); if (ms) H.msgT = setTimeout(() => { c.className = 'center-msg'; }, ms);
  };
  H.toast = function (html, cls = '') {
    const t = H.el.toast; t.innerHTML = html; t.className = 'level-toast'; void t.offsetWidth; t.className = 'level-toast show ' + cls;
  };
  H.feed = function (html, cls = '') {
    const d = document.createElement('div'); d.className = 'feed-item ' + cls; d.innerHTML = html; H.el.feed.prepend(d);
    while (H.el.feed.children.length > 4) H.el.feed.lastChild.remove();
    setTimeout(() => d.classList.add('out'), 3200); setTimeout(() => d.remove(), 3700);
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dot = (h) => `<i class="dot" style="--c:${h.skin.colors[0]}"></i>`;

  function popup(x, z, text, cls, scale = 1) {
    const p = HC.Render.project(x, 10, z); if (p.behind) return;
    let el = H.popPool.find((e) => !e.busy);
    if (!el) { if (H.popPool.length > 40) return; el = document.createElement('div'); H.el.popups.appendChild(el); H.popPool.push(el); }
    el.busy = true; el.className = 'pop ' + cls; el.textContent = text;
    el.style.left = p.x + (Math.random() - 0.5) * 40 + 'px'; el.style.top = p.y + 'px'; el.style.setProperty('--s', scale);
    void el.offsetWidth; el.classList.add('go');
    clearTimeout(el.t); el.t = setTimeout(() => { el.busy = false; el.className = 'pop'; }, 900);
  }

  H.onEvent = function (type, d) {
    const G = HC.Game, P = G.player, A = HC.Audio, F = HC.FX;
    const visible = (h) => { const c = HC.Render.cam; return Math.abs(h.x - c.x) < c.view && Math.abs(h.z - c.z) < c.view * 1.6; };
    if (G.headless) return;
    if (type === 'eat') {
      const h = d.hole, big = d.points >= 20;
      if (visible(h)) {
        F && F.swallow(h, d.obj, big);
        const distK = h === P ? 1 : 0.35;
        A && A.pop(d.points, h === P ? d.combo : 1, distK);
        if (big && h === P) { F.addShake(Math.min(0.8, d.points / 200)); A.haptic(30); } else if (h === P) A.haptic(8);
      }
      if (h === P || G.state === 'attract') {
        if (h === P) popup(h.x, h.z, '+' + d.points, d.points >= 20 ? 'big' : d.points >= 5 ? 'mid' : '', Math.min(2.2, 1 + Math.log2(d.points) * 0.18));
        if (h === P && d.combo >= 5 && d.combo % 5 === 0) popup(h.x, h.z - h.r, `COMBO x${d.combo}!`, 'combo', 1.2);
      }
    } else if (type === 'levelup') {
      const h = d.hole;
      if (h === P) {
        H.toast(`LEVEL ${h.level}!`); A && A.levelUp(); F && F.shock(h.x, h.z, h.r, h.skin.colors[0]); A.haptic(20);
        // Tell the player when a new kind of thing becomes edible.
        const newly = UNLOCKS.filter(([k]) => !H.fitSeen.has(k) && HC.Physics.likelyFits(HC.CATALOG[k], h.r));
        newly.forEach(([k]) => H.fitSeen.add(k));
        if (newly.length) setTimeout(() => H.toast(`${newly[newly.length - 1][1]} now fit!`, 'unlock'), 900);
      } else if (visible(h)) F && F.shock(h.x, h.z, h.r, h.skin.colors[0]);
    } else if (type === 'kill') {
      const { killer: k, victim: v } = d;
      if (k === P) { H.feed(`${dot(k)}<b>You</b> ate ${dot(v)}<b>${esc(v.name)}</b> <em>+${d.points}</em>`, 'good'); A.kill(); A.haptic([30, 40, 60]); popup(k.x, k.z, `+${d.points}`, 'big', 2); F.addShake(0.5); }
      else if (v === P) { H.feed(`${dot(k)}<b>${esc(k.name)}</b> ate <b>you</b>!`, 'bad'); A.death(); A.haptic(200); F.addShake(0.6); }
      else H.feed(`${dot(k)}<b>${esc(k.name)}</b> ate ${dot(v)}<b>${esc(v.name)}</b>`);
      if (visible(v)) F.dust(v.x, v.z, v.r);
    } else if (type === 'respawn' && d.hole === P) { H.el.center.className = 'center-msg'; }
    else if (type === 'count') { H.message(`<span class="count">${d.n || 'GO!'}</span>`, 'count-wrap', 700); A && A.count(d.n); }
    else if (type === 'go') { H.message('<span class="count go">GO!</span>', 'count-wrap', 650); A && A.count(0); }
    else if (type === 'end') {
      const res = d.results; HC.Input.reset();
      if (G.mode === 'solo') H.message(`<span class="big-word">TIME!</span>`, 'end', 1400);
      else H.message(`<span class="big-word">${res.place === 1 ? 'WINNER!' : 'TIME!'}</span>`, 'end', 1400);
      if (res.place === 1 && P) { F.confetti(P.x, P.z, P.r); A.win(); } else A.lose();
    }
  };

  // Per-frame HUD work.
  H.frame = function (dt) {
    const G = HC.Game, P = G.player;
    if (H.el.hud.hidden) { labels(G, false); return; }
    // Timer.
    const t = Math.max(0, G.time), sec = Math.ceil(t);
    if (G.mode !== 'attract') {
      H.el.timer.textContent = G.state === 'countdown' ? U.formatTime(G.cfg.seconds) : U.formatTime(t);
      H.el.timer.classList.toggle('urgent', G.state === 'play' && t <= 10);
      if (G.state === 'play' && t <= 10 && sec !== H.lastSec && sec > 0) { H.lastSec = sec; HC.Audio.tick(); }
    }
    if (P) H.el.kills.innerHTML = `💀 <b>${P.kills}</b>`;
    // Leaderboard (throttled).
    H.boardT = (H.boardT || 0) - dt;
    if (H.boardT <= 0 && G.mode !== 'solo') {
      H.boardT = 0.25;
      const rank = G.mode === 'battle' ? G.holes.filter((h) => !h.eliminated).sort((a, b) => b.r - a.r) : G.ranking();
      const top = rank.slice(0, 5); const pi = rank.indexOf(P);
      let html = top.map((h, i) => row(h, i + 1, h === P)).join('');
      if (P && pi >= 5) html += `<li class="gap">…</li>` + row(P, pi + 1, true);
      if (G.mode === 'battle') html += `<li class="gap">${rank.length} holes left</li>`;
      H.el.board.innerHTML = html;
    }
    if (G.mode === 'solo') {
      const pct = HC.World.eatenPoints / HC.World.totalPoints * 100;
      H.el.solo.querySelector('.solo-fill').style.width = Math.min(100, pct) + '%';
      H.el.solo.querySelector('span').textContent = pct.toFixed(1) + '%';
    }
    // Respawn / ghost message.
    if (P && !P.alive && G.mode !== 'battle' && P.respawnT > 0) H.message(`<b>Eaten!</b><br>Back in ${Math.ceil(P.respawnT)}… <small>drag to pick your spot</small>`, 'respawn');
    if (P && P.eliminated && !H.elimShown) { H.elimShown = true; H.message('<b>Eliminated!</b>', 'respawn', 2000); }
    if (P && !P.eliminated) H.elimShown = false;
    labels(G, true);
    arrows(G);
  };
  const row = (h, n, me) => `<li class="${me ? 'me' : ''}"><span class="n">${n === 1 ? '👑' : n}</span>${dot(h)}<span class="nm">${esc(h.isPlayer ? h.name || 'You' : h.name)}</span><b>${HC.Game.mode === 'battle' ? 'Lv ' + h.level : h.score}</b></li>`;

  function labels(G, on) {
    const seen = new Set();
    if (on || G.state === 'attract') {
      for (const h of G.holes) {
        if (!h.alive) continue;
        const p = HC.Render.project(h.x, 0, h.z - h.rv * 1.12);
        if (p.behind || p.x < -80 || p.y < -40 || p.x > HC.Render.w + 80 || p.y > HC.Render.h + 40) continue;
        seen.add(h);
        let n = H.labels.get(h);
        if (!n) { n = document.createElement('div'); n.className = 'hlabel'; n.innerHTML = '<span class="lv"></span><span class="nm"></span><span class="bar"><i></i></span>'; H.el.labels.appendChild(n); H.labels.set(h, n); }
        n.classList.toggle('me', h.isPlayer); n.classList.toggle('prot', h.protect > 0);
        n.style.setProperty('--c', h.skin.colors[0]);
        const lv = n.firstChild; if (lv.textContent !== String(h.level)) lv.textContent = h.level;
        const nm = n.children[1]; const name = h.name; if (nm.textContent !== name) nm.textContent = name;
        if (h.isPlayer) n.lastChild.firstChild.style.width = (h.progress * 100).toFixed(1) + '%';
        n.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`;
      }
    }
    for (const [h, n] of H.labels) if (!seen.has(h)) { n.remove(); H.labels.delete(h); }
  }

  // Edge-of-screen arrows: red for bigger holes hunting nearby, green for snack-sized ones.
  function arrows(G) {
    const P = G.player; let used = 0;
    if (P && P.alive && G.state === 'play') {
      const W = HC.Render.w, Hh = HC.Render.h, cx = W / 2, cy = Hh / 2;
      for (const h of G.holes) {
        if (h === P || !h.alive) continue;
        const threat = h.r > P.r * HC.CONFIG.hole.eatHoleRatio, prey = P.r > h.r * HC.CONFIG.hole.eatHoleRatio;
        if (!threat && !prey) continue;
        const d = Math.hypot(h.x - P.x, h.z - P.z);
        if (d > HC.Render.cam.view * (threat ? 2.2 : 1.5)) continue;
        const p = HC.Render.project(h.x, 0, h.z);
        if (!p.behind && p.x > 20 && p.y > 60 && p.x < W - 20 && p.y < Hh - 20) continue;
        let dx = p.x - cx, dy = p.y - cy; if (p.behind) { dx = -dx; dy = -dy; }
        const k = Math.min((W / 2 - 34) / Math.abs(dx || 1e-3), (Hh / 2 - 44) / Math.abs(dy || 1e-3));
        let el = H.arrowPool[used]; if (!el) { el = document.createElement('div'); el.className = 'arrow'; H.el.arrows.appendChild(el); H.arrowPool.push(el); }
        el.className = 'arrow ' + (threat ? 'threat' : 'prey'); el.style.display = 'block';
        el.style.transform = `translate(${cx + dx * k}px, ${cy + dy * k}px) rotate(${Math.atan2(dy, dx)}rad)`;
        el.style.setProperty('--c', h.skin.colors[0]);
        used++;
      }
    }
    for (let i = used; i < H.arrowPool.length; i++) H.arrowPool[i].style.display = 'none';
  }

  HC.HUD = H;
})();
