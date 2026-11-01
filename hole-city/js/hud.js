// In-match HUD and event director: leaderboard, timer, the "+N" score tally, big-bite and
// multi-eat callouts, level-ups,
// kill feed, threat arrows, hole name labels, countdown and respawn messages.
// Game events are routed here and fanned out to FX and Audio.
(function () {
  const U = HC.U;
  const H = { labels: new Map(), popPool: [], arrowPool: [], lastSec: null };
  const $ = (id) => document.getElementById(id);
  let UNLOCKS = [];

  H.init = function () {
    H.el = { hud: $('hud'), board: $('board'), timer: $('timer'), mode: $('modeTag'), kills: $('kills'), feed: $('feed'), arrows: $('arrows'),
      center: $('centerMsg'), toast: $('levelToast'), labels: $('labels'), popups: $('popups'), solo: $('soloBar'), callout: $('callout') };
    HC.Game.onEvent = H.onEvent;
  };

  H.show = function (on) {
    H.el.hud.hidden = !on;
    if (!on) { H.el.labels.innerHTML = ''; H.labels.clear(); H.el.feed.innerHTML = ''; H.el.center.className = 'center-msg'; H.el.arrows.innerHTML = ''; H.arrowPool = []; if (T.el) T.el.className = 'tally'; T.hold = T.fade = 0; H.el.callout.className = 'callout'; C.t = 0; C.next = null; }
  };
  H.reset = function () {
    const G = HC.Game;
    H.el.mode.textContent = G.cfg.label.toUpperCase();
    H.el.solo.hidden = G.mode !== 'solo'; H.el.hud.classList.toggle('hud-solo', G.mode === 'solo');
    H.el.kills.hidden = G.mode === 'solo';
    H.el.board.hidden = G.mode === 'solo';
    H.el.feed.innerHTML = ''; H.lastSec = null;
    C.t = 0; C.rank = 0; C.next = null; C.seen.clear(); C.kills = 0; C.lastKill = -99; H.el.callout.className = 'callout';
    T.hold = 0; T.fade = 0; T.sum = 0; if (T.el) T.el.className = 'tally'; H.hudTop = null;
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
  const CFG_MULTI = 8; // seconds between hole kills to keep a multi-eat streak going
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dot = (h) => `<i class="dot" style="--c:${h.skin.colors[0]}"></i>`;

  // Names for the big things worth calling out when you eat your first one in a match.
  const NAMES = {
    shop: '🏪 Shop', church: '⛪ Church', apartment: '🏢 Apartment', townhouses: '🏘️ Townhouses', civic: '🏛️ City Hall',
    office: '🏙️ Office', school: '🏫 School', tower: '🌆 Skyscraper', skyneedle: '🌇 Supertall', skyocta: '🌇 Supertall',
    landmark: '🗼 THE TOWER', mall: '🛍️ THE MEGA MALL',
    beach_ferris: '🎡 Ferris wheel', beach_cruise: '🚢 Cruise ship', beach_hotel: '🏨 Hotel', beach_resort: '🏝️ Resort',
    beach_grand: '🏰 Grand hotel', beach_lighthouse: '🌅 THE LIGHTHOUSE',
    farm_farmhouse: '🏡 Farmhouse', farm_barn: '🏚️ Red barn', farm_dairy: '🐮 Dairy barn', farm_elevator: '🏭 Grain elevator',
    farm_windmill: '🌬️ THE WINDMILL',
    fun_droptower: '🎢 Drop tower', fun_carousel: '🎠 Carousel', fun_funhouse: '🤡 Funhouse', fun_haunted: '👻 Haunted house',
    fun_hotel: '🏨 Hotel', fun_flume: '🌊 Log flume', fun_bigtop: '🎪 Big top', fun_ferris: '🎡 Ferris wheel', fun_castle: '🏰 THE CASTLE',
    frost_chalet: '🏠 Chalet', frost_chapel: '⛪ Ice chapel', frost_gondola: '🚡 Gondola', frost_hotel: '🏨 Snow hotel',
    frost_lodge: '🏔️ Ski lodge', frost_palace: '❄️ THE ICE PALACE',
    neon_arcade: '🕹️ Arcade', neon_capsule: '🏙️ Capsule tower', neon_karaoke: '🎤 Karaoke bar', neon_tower: '🌃 Neon tower',
    neon_skytower: '🌆 Sky tower', neon_needle: '🌇 Supertall', neon_octa: '🌇 Supertall', neon_pagoda: '🏯 THE PAGODA',
    gulch_saloon: '🤠 Saloon', gulch_station: '🚂 Train station', gulch_hotel: '🏨 Hotel', gulch_mine: '⛏️ Gold mine',
    gulch_mesa: '🏜️ Mesa', gulch_butte: '🏜️ THE BUTTE',
    dino_bigtree: '🌳 Giant tree', dino_falls: '💦 Waterfall', dino_longneck: '🦕 Longneck', dino_fossil: '🦴 Giant fossil',
    dino_temple: '🛕 Temple', dino_volcano: '🌋 THE VOLCANO',
    moon_greenhouse: '🌱 Greenhouse', moon_bigdish: '📡 Big dish', moon_mine: '⛏️ Moon mine', moon_hangar: '🚀 Hangar',
    moon_hq: '🛰️ Moon base', moon_rocket: '🚀 THE ROCKET',
  };
  const nameOf = (id) => NAMES[id] || '⭐ ' + id.replace(/^[a-z]+_(?=.)/, '').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
  const MULTI = ['', '', 'DOUBLE EAT!', 'TRIPLE EAT!', 'MEGA EAT!', 'MONSTER EAT!'];

  // One running "+N" tally above your hole instead of a number per object. It counts up while
  // you keep eating and fades out after a short pause.
  const T = { sum: 0, hold: 0, fade: 0, dirty: false, el: null };
  function tally(points) {
    if (!T.el) { T.el = document.createElement('div'); T.el.className = 'tally'; T.el.innerHTML = '<span></span>'; H.el.popups.appendChild(T.el); }
    if (T.fade > 0 || T.hold <= 0) { T.sum = 0; T.fade = 0; }
    T.sum += points; T.hold = CFG_HOLD; T.dirty = true;
  }
  const CFG_HOLD = 0.75, CFG_FADE = 0.35;
  // Lowest edge of the HUD across the top of the screen (timer, solo bar); refreshed on resize.
  function hudBottom() {
    let y = 0;
    for (const el of [H.el.timer, H.el.solo]) if (el && !el.hidden && el.offsetParent !== null) y = Math.max(y, el.getBoundingClientRect().bottom);
    return y;
  }
  addEventListener('resize', () => { H.hudTop = null; });
  function tallyFrame(dt, P) {
    if (!T.el) return;
    if (T.hold > 0) { T.hold -= dt; if (T.hold <= 0) { T.fade = CFG_FADE; T.el.classList.add('out'); } }
    else if (T.fade > 0) { T.fade -= dt; if (T.fade <= 0) { T.el.className = 'tally'; T.sum = 0; } }
    if (T.hold <= 0 && T.fade <= 0) return;
    if (!P || !P.alive) { T.hold = 0; T.fade = 0; T.el.className = 'tally'; return; }
    if (T.dirty) {
      T.dirty = false; T.el.firstChild.textContent = '+' + T.sum;
      T.el.style.setProperty('--s', Math.min(1.45, 0.9 + Math.log10(1 + T.sum) * 0.18).toFixed(2));
      T.el.className = 'tally'; void T.el.offsetWidth; T.el.className = 'tally on bump';
    }
    // Sits just above your name tag, so it never covers the hole or what's falling into it. If the
    // top of the HUD is in the way (short landscape phones), it moves beside the name tag instead.
    const p = HC.Render.project(P.x, 0, P.z - P.rv * 1.12);
    if (H.hudTop == null) H.hudTop = hudBottom();
    if (p.y - 50 - 30 > H.hudTop) T.el.style.transform = `translate(${p.x.toFixed(1)}px, ${(p.y - 50).toFixed(1)}px) translate(-50%, -100%)`;
    else T.el.style.transform = `translate(${(p.x + 40).toFixed(1)}px, ${(p.y - 10).toFixed(1)}px) translate(0, -100%)`;
  }

  // Callouts: one small banner near the top of the screen for moments worth noticing (the first
  // of a big kind of thing each match, giant landmarks, eating several holes in a row). Only one
  // shows at a time; a bigger one waiting its turn takes the next slot.
  const C = { t: 0, rank: 0, next: null, seen: new Set(), kills: 0, lastKill: -99 };
  function callout(html, cls, rank) {
    if (C.t > 0.35 && rank <= C.rank) { if (!C.next || rank > C.next.rank) C.next = { html, cls, rank }; return; }
    const el = H.el.callout; el.innerHTML = html; el.className = 'callout'; void el.offsetWidth; el.className = 'callout show ' + cls;
    C.t = 1.4; C.rank = rank;
  }
  function calloutFrame(dt) {
    if (C.t <= 0) return;
    C.t -= dt;
    if (C.t <= 0) { H.el.callout.className = 'callout'; C.rank = 0; if (C.next) { const n = C.next; C.next = null; callout(n.html, n.cls, n.rank); } }
  }

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
      if (h === P && G.state === 'play') {
        tally(d.points);
        const id = d.obj.def.id;
        if (d.points >= 250 || (d.points >= 25 && !C.seen.has(id))) {
          C.seen.add(id);
          callout(`${esc(nameOf(id))} <b>+${d.points}</b>`, d.points >= 250 ? 'huge' : '', d.points);
        }
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
      if (k === P) { H.feed(`${dot(k)}<b>You</b> ate ${dot(v)}<b>${esc(v.name)}</b> <em>+${d.points}</em>`, 'good'); A.kill(); A.haptic([30, 40, 60]); tally(d.points); F.addShake(0.5);
        // Eating holes close together builds a multi-eat streak, hole.io style.
        const now = G.elapsed || 0; C.kills = now - C.lastKill < CFG_MULTI ? C.kills + 1 : 1; C.lastKill = now;
        if (C.kills >= 2) callout(MULTI[Math.min(C.kills, MULTI.length - 1)], 'multi', 10000 + C.kills);
      }
      else if (v === P) { H.feed(`${dot(k)}<b>${esc(k.name)}</b> ate <b>you</b>!`, 'bad'); A.death(); A.haptic(200); F.addShake(0.6); }
      else H.feed(`${dot(k)}<b>${esc(k.name)}</b> ate ${dot(v)}<b>${esc(v.name)}</b>`);
      if (visible(v)) F.dust(v.x, v.z, v.r);
    } else if (type === 'coasterCrash') {
      if (d.x != null && visible({ x: d.x, z: d.z })) { F && F.addShake(0.7); A && A.kill(); popup(d.x, d.z, 'CRASH!', 'combo', 1.6); }
      H.feed('🎢 <b>The coaster</b> flew off the tracks!', 'bad');
    } else if (type === 'respawn' && d.hole === P) { H.el.center.className = 'center-msg'; }
    else if (type === 'count') { H.message(`<span class="count">${d.n || 'GO!'}</span>`, 'count-wrap', 700); A && A.count(d.n); }
    else if (type === 'go') { H.message('<span class="count go">GO!</span>', 'count-wrap', 650); A && A.count(0); }
    else if (type === 'end') {
      const res = d.results; HC.Input.reset();
      if (G.mode === 'solo') H.message(`<span class="big-word">${res.cleared ? 'CLEARED!' : 'TIME!'}</span>`, 'end', 1400);
      else H.message(`<span class="big-word">${res.place === 1 ? 'WINNER!' : 'TIME!'}</span>`, 'end', 1400);
      if ((res.place === 1 || res.cleared) && P) { F.confetti(P.x, P.z, P.r); A.win(); } else A.lose();
    }
  };

  // Per-frame HUD work.
  H.frame = function (dt) {
    const G = HC.Game, P = G.player;
    if (H.el.hud.hidden) { labels(G, false); return; }
    // Timer.
    const t = Math.max(0, G.time), sec = Math.ceil(t);
    if (G.mode !== 'attract') {
      if (!isFinite(G.cfg.seconds)) {
        // Solo has no time limit: the clock counts up how long you've been eating.
        H.el.timer.textContent = U.formatTime(G.state === 'countdown' ? 0 : Math.floor(G.elapsed)); H.el.timer.classList.remove('urgent');
      } else {
        H.el.timer.textContent = G.state === 'countdown' ? U.formatTime(G.cfg.seconds) : U.formatTime(t);
        H.el.timer.classList.toggle('urgent', G.state === 'play' && t <= 10);
        if (G.state === 'play' && t <= 10 && sec !== H.lastSec && sec > 0) { H.lastSec = sec; HC.Audio.tick(); }
      }
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
      // Progress toward clearing the level: the bar is full at the goal (95% of the items).
      const share = HC.World.itemShare(), goal = HC.CONFIG.match.soloGoal;
      H.el.solo.querySelector('.solo-fill').style.width = Math.min(100, share / goal * 100) + '%';
      H.el.solo.querySelector('span').textContent = `${Math.floor(share * 100)}% eaten · goal ${Math.round(goal * 100)}%`;
    }
    // Respawn / ghost message.
    if (P && !P.alive && G.mode !== 'battle' && P.respawnT > 0) H.message(`<b>Eaten!</b><br>Back in ${Math.ceil(P.respawnT)}… <small>drag to pick your spot</small>`, 'respawn');
    if (P && P.eliminated && !H.elimShown) { H.elimShown = true; H.message('<b>Eliminated!</b>', 'respawn', 2000); }
    if (P && !P.eliminated) H.elimShown = false;
    labels(G, true);
    tallyFrame(dt, P); calloutFrame(dt);
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
