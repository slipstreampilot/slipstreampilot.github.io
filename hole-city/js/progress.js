// Skins, player profile, rank stars and unlocks (saved in localStorage; fails safe in private mode).
// Rank points per Classic finish follow hole.io: 20 / 10 / 5 / 2 / 2 / 1 / 1.
(function () {
  // pattern: 0 solid, 1 rotating stripes, 2 rainbow, 3 pulse, 4 waves, 5 spinning segments
  const SKINS = [
    { id: 'classic', name: 'Bubblegum', colors: ['#FF5FA2', '#FFFFFF'], pattern: 0, unlock: { type: 'free' } },
    { id: 'mint', name: 'Mint', colors: ['#2EF2B4', '#FFFFFF'], pattern: 0, unlock: { type: 'free' } },
    { id: 'sky', name: 'Sky', colors: ['#38B6FF', '#FFFFFF'], pattern: 0, unlock: { type: 'free' } },
    { id: 'sunny', name: 'Sunny', colors: ['#FFD23F', '#FFFFFF'], pattern: 0, unlock: { type: 'free' } },
    { id: 'candy', name: 'Candy Cane', colors: ['#FF3B5C', '#FFFFFF'], pattern: 1, unlock: { type: 'rank', value: 20 } },
    { id: 'lava', name: 'Lava', colors: ['#FF4D00', '#FFD000'], pattern: 4, unlock: { type: 'rank', value: 45 } },
    { id: 'ocean', name: 'Ocean', colors: ['#00C2FF', '#7B61FF'], pattern: 4, unlock: { type: 'rank', value: 80 } },
    { id: 'disco', name: 'Disco', colors: ['#FF00E5', '#00F0FF'], pattern: 3, unlock: { type: 'rank', value: 120 } },
    { id: 'zebra', name: 'Zebra', colors: ['#111111', '#FFFFFF'], pattern: 5, unlock: { type: 'kills', value: 10 } },
    { id: 'rainbow', name: 'Rainbow', colors: ['#FF0000', '#00FF00'], pattern: 2, unlock: { type: 'win', value: 1 } },
    { id: 'gold', name: 'Gold', colors: ['#FFC400', '#FFF3B0'], pattern: 3, unlock: { type: 'wins', value: 5 } },
    { id: 'galaxy', name: 'Galaxy', colors: ['#7B2FF7', '#00E5FF'], pattern: 5, unlock: { type: 'level', value: 18 } },
    { id: 'tidy', name: 'Clean Sweep', colors: ['#B6FF3B', '#2ED573'], pattern: 1, unlock: { type: 'solo', value: 0.5 } },
    { id: 'champ', name: 'Last Hole', colors: ['#FF8C00', '#FF2E63'], pattern: 5, unlock: { type: 'battle', value: 1 } },
  ];
  const BOT_SKINS = [
    { colors: ['#FF7A00', '#FFFFFF'], pattern: 0 }, { colors: ['#7B61FF', '#FFFFFF'], pattern: 0 }, { colors: ['#00D26A', '#FFFFFF'], pattern: 0 },
    { colors: ['#FF2E63', '#FFFFFF'], pattern: 0 }, { colors: ['#00B8FF', '#FFFFFF'], pattern: 0 }, { colors: ['#FFC400', '#FFFFFF'], pattern: 0 },
    { colors: ['#B44DFF', '#FFFFFF'], pattern: 0 }, { colors: ['#00E0C6', '#FFFFFF'], pattern: 0 },
  ];
  HC.Skins = { list: SKINS, botSkins: BOT_SKINS, get: (id) => SKINS.find((s) => s.id === id) || SKINS[0] };

  const KEY = 'holecity.v2';
  const P = {};
  P.defaults = () => ({ name: 'You', skin: 'classic', rankPoints: 0, wins: 0, games: 0, kills: 0, bestScore: 0, bestLevel: 1, bestSolo: 0, battleWins: 0, unlocked: SKINS.filter((s) => s.unlock.type === 'free').map((s) => s.id), sound: true, music: true, quality: 'auto', mode: 'classic', tutorialDone: false, level: 'city', stars: {}, bestByLevel: {}, mathGate: true, math: null, difficulty: 'easy' });
  P.load = function () {
    let d = {};
    try { d = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { d = {}; }
    P.data = Object.assign(P.defaults(), d);
    if (!Array.isArray(P.data.unlocked)) P.data.unlocked = P.defaults().unlocked;
    if (!P.data.stars || typeof P.data.stars !== 'object') P.data.stars = {};
    if (!P.data.bestByLevel || typeof P.data.bestByLevel !== 'object') P.data.bestByLevel = {};
  };
  P.save = function () { try { localStorage.setItem(KEY, JSON.stringify(P.data)); } catch (_) { /* private mode */ } };

  // Stars: every 50 rank points (+50 more each time) earns a star, like hole.io's rank ladder.
  P.rankInfo = function (pts = P.data.rankPoints) {
    let rank = 1, need = 50, base = 0;
    while (pts >= base + need) { base += need; rank++; need += 50; }
    return { rank, into: pts - base, need };
  };

  P.isUnlocked = (id) => P.data.unlocked.includes(id);
  P.checkUnlocks = function (ctx = {}) {
    const d = P.data, newly = [];
    for (const s of SKINS) {
      if (P.isUnlocked(s.id)) continue;
      const u = s.unlock; let ok = false;
      if (u.type === 'rank') ok = d.rankPoints >= u.value;
      if (u.type === 'kills') ok = d.kills >= u.value;
      if (u.type === 'win') ok = d.wins >= 1;
      if (u.type === 'wins') ok = d.wins >= u.value;
      if (u.type === 'level') ok = d.bestLevel >= u.value;
      if (u.type === 'solo') ok = d.bestSolo >= u.value;
      if (u.type === 'battle') ok = d.battleWins >= u.value;
      if (ok) { d.unlocked.push(s.id); newly.push(s); }
    }
    return newly;
  };
  P.unlockText = function (s) {
    const u = s.unlock;
    return { free: 'Free', rank: `Reach ${u.value} rank pts`, kills: `Eat ${u.value} holes`, win: 'Win a Classic match', wins: `Win ${u.value} matches`, level: `Reach level ${u.value}`, solo: `Eat ${Math.round(u.value * 100)}% in Solo`, battle: 'Win a Battle' }[u.type];
  };

  // Apply a finished match; returns a summary for the results screen.
  P.recordMatch = function (res) {
    const d = P.data, p = res.player; if (!p) return {};
    const before = P.rankInfo();
    let rp = 0;
    if (res.mode === 'classic') rp = HC.CONFIG.scoring.rankPoints[res.place - 1] || 0;
    if (res.mode === 'battle') rp = [25, 12, 6, 3, 2, 1][res.place - 1] || 0;
    if (res.mode === 'solo') rp = Math.round(res.percent * 40);
    d.rankPoints += rp; d.games++; d.kills += p.kills;
    if (res.mode === 'classic' && res.place === 1) d.wins++;
    if (res.mode === 'battle' && res.place === 1) d.battleWins++;
    if (res.mode === 'solo') d.bestSolo = Math.max(d.bestSolo, res.percent);
    const newBest = p.score > d.bestScore; d.bestScore = Math.max(d.bestScore, p.score); d.bestLevel = Math.max(d.bestLevel, p.level);
    // Level stars: Classic/Battle 1st = 3, 2nd = 2, 3rd = 1; Solo by share of the city eaten.
    const lv = res.level || 'city';
    const stars = res.mode === 'solo' ? HC.CONFIG.scoring.soloStars.filter((v) => res.percent >= v).length : Math.max(0, 4 - res.place);
    const prevStars = d.stars[lv] || 0; d.stars[lv] = Math.max(prevStars, stars);
    d.bestByLevel[lv] = Math.max(d.bestByLevel[lv] || 0, p.score);
    const unlocked = P.checkUnlocks();
    P.save();
    const after = P.rankInfo();
    return { rp, unlocked, newBest, rankUp: after.rank > before.rank, rank: after, stars, newStars: stars > prevStars };
  };

  HC.Progress = P;
})();
