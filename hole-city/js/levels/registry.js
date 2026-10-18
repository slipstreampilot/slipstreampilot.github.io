// Level registry. Each file in js/levels/ calls HC.Levels.add({...}):
//   id, num, name, tagline, icon (emoji), colors: [a, b] for its menu card,
//   theme:  sky / fog / sea / lighting / glow look (see Render.applyTheme),
//   mods:   gameplay twists, e.g. { gravity: 0.35 } (moon), { grip: 0.25 } (ice), { botSkill: -0.1 } (easier rivals),
//   milestones: [[kind, '🚗 Cars'], …] toasts shown when a new kind starts to fit,
//   kinds(def): optional — register level-specific objects with HC.defKind,
//   generate(T): lay out the level with the HC.Gen toolkit (T.city is returned).
(function () {
  const L = { list: [], byId: {} };
  L.add = function (lv) {
    lv.theme = Object.assign({}, L.defaultTheme, lv.theme || {});
    lv.mods = Object.assign({ gravity: 1, grip: 1, botSkill: 0 }, lv.mods || {});
    if (lv.kinds) lv.kinds(HC.defKind);
    L.list.push(lv); L.byId[lv.id] = lv; L.list.sort((a, b) => a.num - b.num);
  };
  L.get = (id) => L.byId[id] || L.list[0];
  L.build = function (lv, seed) {
    const T = HC.Gen.create(seed, lv);
    lv.generate(T);
    T.city.theme = lv.theme; T.city.levelDef = lv;
    if (!T.city.spawnCandidates.length) for (let i = 0; i < 12; i++) T.spawnAt(600 + T.rng() * 3800, 600 + T.rng() * 3800);
    return T.city;
  };
  L.defaultTheme = {
    sky: '#8FDCFF', fogNear: 9000, fogFar: 22000,
    sea: { show: true, deep: '#1A9EED', shallow: '#5CE0FF', foam: 1 },
    skirt: '#E9B96B', hemiSky: '#E4F6FF', hemiGround: '#B7A6FF', hemi: 1.55, sun: '#FFF1DC', sunI: 2.3, glow: 0, stars: false,
  };
  HC.Levels = L;
})();
