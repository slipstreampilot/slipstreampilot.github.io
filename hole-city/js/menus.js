// Menus: home (over a live attract-mode city), skins, settings, pause, results.
// One tap from home to playing; one tap from results to the next round.
(function () {
  const $ = (id) => document.getElementById(id);
  const M = {};
  const show = (id, on) => { $(id).hidden = !on; };
  const ord = (n) => n + (['th', 'st', 'nd', 'rd'][(n % 100 >> 3 ^ 1) && n % 10] || 'th');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  M.init = function () {
    const P = HC.Progress, A = HC.Audio;
    $('nameInput').value = P.data.name === 'You' ? '' : P.data.name;
    $('nameInput').placeholder = 'You';
    $('nameInput').addEventListener('input', (e) => { P.data.name = e.target.value.trim().slice(0, 12) || 'You'; P.save(); });
    document.querySelectorAll('.mode').forEach((b) => b.addEventListener('click', () => { P.data.mode = b.dataset.mode; P.save(); M.syncModes(); A.unlock(); A.click(); }));
    $('playBtn').addEventListener('click', () => { A.unlock(); M.requestMatch(P.data.mode); });
    $('lvPrev').addEventListener('click', () => { A.unlock(); A.click(); M.selectLevel(-1); });
    $('lvNext').addEventListener('click', () => { A.unlock(); A.click(); M.selectLevel(1); });
    $('lvCard').addEventListener('click', () => { A.unlock(); A.click(); M.renderLevels(); show('levels', true); });
    $('levelsClose').addEventListener('click', () => { A.click(); show('levels', false); });
    $('nextLvBtn').addEventListener('click', () => { A.unlock(); const L = HC.Levels.list, i = L.findIndex((l) => l.id === P.data.level); P.data.level = L[(i + 1) % L.length].id; P.save(); M.requestMatch(HC.Game.mode === 'attract' ? P.data.mode : HC.Game.mode); });
    // Grown-up switch for the math gate.
    $('mathToggle').addEventListener('change', (e) => {
      if (e.target.checked) { P.data.mathGate = true; P.save(); $('parentBox').hidden = true; return; }
      e.target.checked = true; M.parentQ = HC.Brain.parentCheck(); $('parentQ').textContent = M.parentQ.q; $('parentA').value = ''; $('parentBox').hidden = false; $('parentA').focus();
    });
    $('parentOk').addEventListener('click', () => {
      if (Number($('parentA').value) === M.parentQ.ans) { P.data.mathGate = false; P.save(); $('mathToggle').checked = false; $('parentBox').hidden = true; }
      else { $('parentA').value = ''; $('parentA').placeholder = 'Try again'; }
    });
    $('againBtn').addEventListener('click', () => { A.unlock(); M.requestMatch(HC.Game.mode === 'attract' ? P.data.mode : HC.Game.mode); });
    $('menuBtn').addEventListener('click', () => { A.click(); M.toHome(); });
    $('skinsBtn').addEventListener('click', () => { A.unlock(); A.click(); M.renderSkins(); show('skins', true); });
    $('skinsClose').addEventListener('click', () => { A.click(); show('skins', false); M.syncHome(); });
    $('settingsBtn').addEventListener('click', () => { A.unlock(); A.click(); M.syncSettings(); show('settings', true); });
    $('settingsClose').addEventListener('click', () => { A.click(); show('settings', false); });
    $('soundBtn').addEventListener('click', () => { A.unlock(); const on = !(A.sfxOn || A.musicOn); A.setSfx(on); A.setMusic(on); M.syncHome(); });
    $('musicToggle').addEventListener('change', (e) => { A.unlock(); A.setMusic(e.target.checked); M.syncHome(); });
    $('sfxToggle').addEventListener('change', (e) => { A.unlock(); A.setSfx(e.target.checked); M.syncHome(); });
    $('diffSel').addEventListener('change', (e) => { P.data.difficulty = e.target.value; P.save(); });
    $('qualitySel').addEventListener('change', (e) => { P.data.quality = e.target.value; P.save(); HC.Render.setQuality(e.target.value === 'auto' ? 'high' : e.target.value); M.autoQ = e.target.value === 'auto'; });
    $('resetBtn').addEventListener('click', () => {
      const b = $('resetBtn');
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Tap again to erase rank, skins and stats'; setTimeout(() => { delete b.dataset.armed; b.textContent = 'Reset progress'; }, 4000); return; }
      const name = P.data.name; P.data = Object.assign(P.defaults(), { name }); P.save(); delete b.dataset.armed; b.textContent = 'Progress reset'; M.syncSettings(); M.syncHome();
    });
    $('pauseBtn').addEventListener('click', () => M.pause(true));
    $('resumeBtn').addEventListener('click', () => M.pause(false));
    $('quitBtn').addEventListener('click', () => { M.pause(false, true); M.toHome(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && HC.Game.state === 'play') M.pause(true); });
    window.addEventListener('keydown', (e) => {
      if (HC.Brain && HC.Brain.on) return;
      if (e.key === 'Escape' || e.key === 'p') { if (HC.Game.state === 'play' || HC.Game.state === 'countdown') M.pause(!HC.Game.paused); }
      if (e.key === 'Enter' && !$('results').hidden) $('againBtn').click();
      if (e.key === 'Enter' && !$('home').hidden && document.activeElement !== $('nameInput')) $('playBtn').click();
    });
    HC.Game.onResults = M.showResults;
    M.autoQ = P.data.quality === 'auto';
  };

  M.syncModes = function () { document.querySelectorAll('.mode').forEach((b) => b.classList.toggle('on', b.dataset.mode === HC.Progress.data.mode)); };
  M.syncHome = function () {
    const P = HC.Progress, r = P.rankInfo();
    $('rankNum').textContent = r.rank; $('rankFill').style.width = (r.into / r.need * 100) + '%';
    $('skinCount').textContent = `${P.data.unlocked.length}/${HC.Skins.list.length}`;
    $('soundBtn').textContent = HC.Audio.sfxOn || HC.Audio.musicOn ? '🔊' : '🔇';
    const sk = HC.Skins.get(P.data.skin); $('skinsBtn').style.setProperty('--c', sk.colors[0]);
    M.syncModes(); M.syncLevel();
  };
  const starStr = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
  M.syncLevel = function () {
    const P = HC.Progress, lv = HC.Levels.get(P.data.level);
    $('lvIcon').textContent = lv.icon; $('lvNum').textContent = `Level ${lv.num} of ${HC.Levels.list.length}`; $('lvName').textContent = lv.name;
    $('lvStars').textContent = starStr(P.data.stars[lv.id] || 0);
    $('lvCard').style.setProperty('--a', lv.colors[0]); $('lvCard').style.setProperty('--b', lv.colors[1]);
  };
  // Switch level from the home screen; the live city behind the menu changes with it.
  M.selectLevel = function (step, id) {
    const P = HC.Progress, L = HC.Levels.list;
    const i = L.findIndex((l) => l.id === P.data.level);
    P.data.level = id || L[(i + step + L.length) % L.length].id; P.save();
    M.syncLevel(); HC.Game.setup('attract', { level: P.data.level });
  };
  M.renderLevels = function () {
    const P = HC.Progress, grid = $('levelGrid'); grid.innerHTML = '';
    for (const lv of HC.Levels.list) {
      const b = document.createElement('button');
      b.className = 'lv-tile' + (lv.id === P.data.level ? ' on' : '');
      b.style.setProperty('--a', lv.colors[0]); b.style.setProperty('--b', lv.colors[1]);
      b.innerHTML = `<span class="lv-icon">${lv.icon}</span><small>Level ${lv.num}</small><b>${lv.name}</b><span class="lv-tag">${lv.tagline}</span><span class="lv-stars">${starStr(P.data.stars[lv.id] || 0)}</span>`;
      b.addEventListener('click', () => { HC.Audio.click(); show('levels', false); M.selectLevel(0, lv.id); });
      grid.appendChild(b);
    }
  };
  M.syncSettings = function () {
    $('musicToggle').checked = HC.Audio.musicOn; $('sfxToggle').checked = HC.Audio.sfxOn; $('mathToggle').checked = HC.Progress.data.mathGate !== false; $('parentBox').hidden = true; $('diffSel').value = HC.Progress.data.difficulty || 'easy'; $('qualitySel').value = HC.Progress.data.quality;
    const d = HC.Progress.data; $('statsLine').textContent = `${d.games} games · ${d.wins} wins · best ${d.bestScore} pts · ${d.kills} holes eaten`;
  };

  M.showHome = function () {
    ['results', 'pause', 'skins', 'settings', 'levels'].forEach((id) => show(id, false));
    show('home', true); HC.HUD.show(false); M.syncHome();
    HC.Input.enabled = false;
  };
  M.toHome = function () {
    HC.Audio.stopMusic();
    HC.Game.setup('attract', { level: HC.Progress.data.level }); M.showHome();
  };

  // Every match is earned: Brain Boost (10 problems, 9 right) runs first unless a grown-up turned it off.
  M.requestMatch = function (mode, opts = {}) {
    const lv = HC.Levels.get(opts.level || HC.Progress.data.level);
    ['home', 'results', 'pause', 'skins', 'settings', 'levels'].forEach((id) => show(id, false));
    HC.Brain.gate(`${lv.icon} ${lv.name}`, () => M.startMatch(mode, opts));
  };

  M.startMatch = function (mode, opts = {}) {
    ['home', 'results', 'pause', 'skins', 'settings', 'levels'].forEach((id) => show(id, false));
    const diff = { easy: -0.14, normal: 0, hard: 0.12 }[HC.Progress.data.difficulty || 'easy'] || 0;
    HC.Game.setup(mode, Object.assign({ level: HC.Progress.data.level, botSkillBonus: diff }, opts)); HC.HUD.reset(); HC.HUD.show(true);
    HC.Input.enabled = true; HC.Game.paused = false;
    HC.Audio.startMusic();
    M.perf = { frames: 0, t: 0, checked: false };
  };

  M.pause = function (on, silent) {
    const G = HC.Game; if (G.state !== 'play' && G.state !== 'countdown') { G.paused = false; show('pause', false); return; }
    G.paused = on; show('pause', on); HC.Input.reset();
    if (!silent) HC.Audio.click();
    if (on) HC.Audio.stopMusic(); else HC.Audio.startMusic();
  };

  M.renderSkins = function () {
    const P = HC.Progress, grid = $('skinGrid'); grid.innerHTML = '';
    if (!$('skinInfo').textContent) $('skinInfo').textContent = 'Tap a skin to wear it. Locked ones show how to earn them.';
    for (const s of HC.Skins.list) {
      const un = P.isUnlocked(s.id), b = document.createElement('button');
      b.className = 'skin' + (P.data.skin === s.id ? ' on' : '') + (un ? '' : ' locked');
      const bg = s.pattern === 2 ? 'conic-gradient(red,orange,yellow,lime,cyan,blue,magenta,red)' : s.pattern ? `repeating-conic-gradient(${s.colors[0]} 0 30deg, ${s.colors[1]} 30deg 60deg)` : s.colors[0];
      b.innerHTML = `<span class="ring" style="background:${bg}"><i>${un ? '' : '🔒'}</i></span><b>${s.name}</b>`;
      b.addEventListener('click', () => {
        HC.Audio.click();
        if (un) { P.data.skin = s.id; P.save(); M.renderSkins(); $('skinInfo').textContent = `${s.name} equipped!`; }
        else $('skinInfo').textContent = `🔒 ${s.name}: ${P.unlockText(s)}`;
      });
      grid.appendChild(b);
    }
  };

  M.showResults = function (res) {
    const G = HC.Game, P = HC.Progress, me = res.player;
    HC.Audio.stopMusic(); HC.HUD.show(false); HC.Input.enabled = false;
    // Demo/autopilot rounds never touch the player's saved progress.
    const sum = HC.flags && HC.flags.auto ? { rp: 0, unlocked: [], rank: P.rankInfo() } : P.recordMatch(res);
    let title, sub;
    if (res.mode === 'solo') {
      const pct = (res.percent * 100).toFixed(1); const st = HC.CONFIG.scoring.soloStars, stars = st.filter((v) => res.percent >= v).length;
      title = `${pct}%`; sub = `of the city swallowed ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`;
    } else {
      title = res.place === 1 ? '🏆 1st place!' : `${ord(res.place)} place`;
      sub = res.mode === 'battle' ? (res.place === 1 ? 'Last hole standing!' : 'Battle over') : (res.place === 1 ? 'Biggest hole in the city!' : res.place <= 3 ? 'So close — one more?' : 'The city fights back. Again!');
    }
    $('resTitle').textContent = title; $('resSub').textContent = `${HC.Game.level.icon} ${HC.Game.level.name} · ${sub}`;
    $('resTitle').className = 'res-title' + (res.place === 1 || (res.mode === 'solo' && res.percent >= HC.CONFIG.scoring.soloStars[0]) ? ' win' : '');
    $('resList').innerHTML = res.mode === 'solo' ? '' : res.order.slice(0, 7).map((h, i) => `<li class="${h === me ? 'me' : ''}"><span class="n">${i + 1}</span><i class="dot" style="--c:${h.skin.colors[0]}"></i><span class="nm">${esc(h.name)}</span><span class="lv">Lv ${h.level}</span><b>${h.score}</b></li>`).join('');
    const big = me && me.biggest ? me.biggest.kind.replace(/^\w/, (c) => c.toUpperCase()) : '—';
    $('resStats').innerHTML = me ? `<div><b>${me.score}</b><small>points</small></div><div><b>${me.level}</b><small>max level</small></div><div><b>${me.eaten}</b><small>swallowed</small></div><div><b>${me.kills}</b><small>holes eaten</small></div><div class="wide"><small>Biggest bite</small> <b>${big}</b></div>` +
      `<div class="wide stars-row"><span class="big-stars">${starStr(sum.stars || 0)}</span>${sum.newStars ? ' <em>New best for this level!</em>' : ''}</div>` +
      `<div class="wide rp">+${sum.rp || 0} rank pts · ★ Rank ${sum.rank ? sum.rank.rank : 1}${sum.rankUp ? ' <em>RANK UP!</em>' : ''}${sum.newBest ? ' · <em>New best!</em>' : ''}</div>` : '';
    const u = $('resUnlock');
    if (sum.unlocked && sum.unlocked.length) { u.hidden = false; u.innerHTML = '🎉 New skin unlocked: ' + sum.unlocked.map((s) => `<b>${s.name}</b>`).join(', '); }
    else u.hidden = true;
    show('results', true);
  };

  HC.Menus = M;
})();
