// Brain Boost: a Brain Age-style math gate before every match.
// 10 multiple-choice problems: addition and subtraction of 1-, 2- and 3-digit numbers (each size equally
// likely; subtraction is never negative), times tables to 12×12, even-or-odd and place value (numbers up
// to 9,999,999). Answers are always listed lowest → highest.
// Score 9/10 or better to play. Stacked column layout for + and −.
(function () {
  const $ = (id) => document.getElementById(id);
  const MB = { on: false };
  const N = 10, PASS = 9;
  // Crypto-grade randomness: unbiased integers via rejection sampling (falls back to Math.random).
  const rand32 = (() => {
    const c = (typeof crypto !== 'undefined' && crypto.getRandomValues) ? crypto : null, buf = new Uint32Array(64); let i = 64;
    return () => { if (!c) return Math.floor(Math.random() * 4294967296); if (i >= 64) { c.getRandomValues(buf); i = 0; } return buf[i++]; };
  })();
  const R = (a, b) => { const span = b - a + 1, lim = Math.floor(4294967296 / span) * span; let x; do { x = rand32(); } while (x >= lim); return a + (x % span); };
  const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = R(0, i); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  const fmtN = (n) => n.toLocaleString('en-US');
  // The number with digit k (0 = ones) wrapped in a span, commas kept.
  function markDigit(p, cls) {
    const t = fmtN(p.n); let seen = -1;
    for (let i = t.length - 1; i >= 0; i--) if (t[i] !== ',' && ++seen === p.k) return `${t.slice(0, i)}<span class="${cls}">${t[i]}</span>${t.slice(i + 1)}`;
    return t;
  }
  // A 1-, 2- or 3-digit number, each size equally likely (1 digit = 0–9, 2 = 10–99, 3 = 100–999).
  const sized = () => { const d = R(1, 3); return d === 1 ? R(0, 9) : d === 2 ? R(10, 99) : R(100, 999); };
  const PLACES = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands', 'hundred thousands', 'millions'];
  MB.TYPES = { add: 'Add', sub: 'Subtract', mul: 'Times tables', parity: 'Even or odd', place: 'Place value' };

  // ---------- problem generation ----------
  function makeProblem(type) {
    if (type === 'parity') {
      const n = R(0, 9999999);
      return { type, n, ans: n % 2 === 0 ? 'Even' : 'Odd', choices: ['Even', 'Odd'] };
    }
    if (type === 'place') {
      // "What place is the underlined digit in?" The digit is underlined and colored in the number.
      const n = R(10, 9999999), len = String(n).length, k = R(0, len - 1);
      // Five neighboring place names that include the answer, listed lowest place → highest.
      const lo = R(Math.max(0, k - 4), Math.min(k, PLACES.length - 5));
      return { type, n, k, digit: Math.floor(n / Math.pow(10, k)) % 10, ans: PLACES[k], choices: PLACES.slice(lo, lo + 5) };
    }
    let a, b, ans, op;
    if (type === 'add') { a = sized(); b = sized(); ans = a + b; op = '+'; }
    // Both numbers are drawn the same way; the larger goes on top, so the answer is never negative
    // (a 1- or 2-digit number is never minus a 3-digit one).
    else if (type === 'sub') { a = sized(); b = sized(); if (b > a) [a, b] = [b, a]; ans = a - b; op = '−'; }
    else { a = R(0, 12); b = R(0, 12); ans = a * b; op = '×'; }
    return { type, a, b, op, ans, choices: choicesFor(type, a, b, ans) };
  }
  // Mistakes a kid might really make, so wrong answers look plausible.
  function digits(n) { return String(n).split('').map(Number); }
  function noCarryAdd(a, b) { const s = String(Math.max(a, b)).length; let r = 0, p = 1; for (let i = 0; i < s; i++, p *= 10) r += ((Math.floor(a / p) % 10 + Math.floor(b / p) % 10) % 10) * p; return r; }
  function noBorrowSub(a, b) { let r = 0, p = 1; for (let i = 0; i < 3; i++, p *= 10) r += Math.abs(Math.floor(a / p) % 10 - Math.floor(b / p) % 10) * p; return r; }
  function choicesFor(type, a, b, ans) {
    const c = new Set([ans]), cand = [];
    if (type === 'mul') {
      cand.push(a * (b + 1), a * Math.max(0, b - 1), (a + 1) * b, Math.max(0, a - 1) * b, a + b, ans + 1, ans - 1, ans + 2, ans + 10, ans - 10);
      if (a > 0 && b > 0) cand.push(ans + a, ans - a, ans + b, ans - b);
    } else {
      cand.push(ans + 10, ans - 10, ans + 1, ans - 1, ans + 100, ans - 100, type === 'add' ? noCarryAdd(a, b) : noBorrowSub(a, b), ans + 9, ans - 9, ans + 11, ans - 11, ans + 110, ans - 90);
      const ds = digits(ans); if (ds.length >= 2) { const sw = ds.slice(); [sw[sw.length - 1], sw[sw.length - 2]] = [sw[sw.length - 2], sw[sw.length - 1]]; cand.push(Number(sw.join(''))); }
    }
    for (const x of shuffle(cand)) { if (c.size >= 5) break; if (x >= 0 && Number.isInteger(x)) c.add(x); }
    let k = 2; while (c.size < 5) { c.add(ans + k); k++; }
    return [...c].sort((x, y) => x - y); // always lowest → highest
  }
  function makeSet() {
    // Two of each of the five kinds, shuffled.
    const types = ['add', 'add', 'sub', 'sub', 'mul', 'mul', 'parity', 'parity', 'place', 'place'];
    return shuffle(types).map(makeProblem);
  }
  MB._makeSet = makeSet;

  // ---------- flow ----------
  MB.enabled = () => HC.Progress.data.mathGate !== false;
  // Called instead of starting a match directly. onPass() runs once 9/10 is reached.
  MB.gate = function (label, onPass) {
    if (!MB.enabled() || (HC.flags && HC.flags.auto)) { onPass(); return; } // demo autopilot (#auto) skips the gate
    MB.onPass = onPass; MB.label = label; MB.on = true;
    $('mbTarget').textContent = label;
    showStage('intro'); $('brain').hidden = false; HC.HUD && HC.HUD.show(false);
    const s = HC.Progress.data.math || {}; $('mbIntroStats').textContent = s.sets ? `${s.solved} problems solved · best ${fmt(s.best || 0)}` : '';
  };
  function showStage(st) { for (const id of ['mbIntro', 'mbPlay', 'mbDone']) $(id).hidden = id !== 'mb' + st[0].toUpperCase() + st.slice(1); }
  const fmt = (s) => s ? `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}` : '—';

  function start() {
    HC.Audio.unlock(); MB.set = makeSet(); MB.i = 0; MB.right = 0; MB.results = []; MB.locked = true;
    showStage('play'); renderDots();
    // 3-2-1 like Brain Age, then the clock starts.
    let n = 3; const cd = $('mbCount'); cd.hidden = false; $('mbCard').classList.add('hide'); $('mbChoices').classList.add('hide');
    const tick = () => {
      if (n > 0) { cd.textContent = n; cd.classList.remove('pop'); void cd.offsetWidth; cd.classList.add('pop'); HC.Audio.count(n); n--; MB.cdT = setTimeout(tick, 600); }
      else { cd.hidden = true; HC.Audio.count(0); MB.t0 = performance.now(); MB.timer = setInterval(() => { $('mbClock').textContent = fmt((performance.now() - MB.t0) / 1000); }, 100); show(); }
    };
    tick();
  }
  function renderDots() {
    $('mbDots').innerHTML = Array.from({ length: N }, (_, i) => `<i class="${MB.results[i] === true ? 'ok' : MB.results[i] === false ? 'bad' : i === MB.i ? 'cur' : ''}"></i>`).join('');
    $('mbScore').textContent = `${MB.right} ✓`;
  }
  MB._show = () => show();
  function show() {
    const p = MB.set[MB.i]; MB.locked = false;
    const card = $('mbCard'); card.classList.remove('hide', 'right', 'wrong'); card.classList.toggle('stack', p.type === 'add' || p.type === 'sub'); card.classList.toggle('word', p.type === 'parity' || p.type === 'place');
    $('mbNum').textContent = `Problem ${MB.i + 1} of ${N}`;
    if (p.type === 'parity') $('mbProb').innerHTML = `<span class="mb-ask">Is this number <b>even</b> or <b>odd</b>?</span><span class="mb-big-n">${fmtN(p.n)}</span>`;
    else if (p.type === 'place') $('mbProb').innerHTML = `<span class="mb-ask">What place is the <u>underlined digit</u> in?</span><span class="mb-big-n">${markDigit(p, 'mb-under')}</span>`;
    else if (p.type === 'mul') $('mbProb').innerHTML = `<span class="inline">${p.a} <em>×</em> ${p.b}</span><span class="eq">= ?</span>`;
    else $('mbProb').innerHTML = `<span class="mb-row">${p.a}</span><span class="mb-row op"><em>${p.op}</em>${p.b}</span><span class="bar"></span><span class="mb-row q">?</span>`;
    const box = $('mbChoices'); box.classList.remove('hide'); box.innerHTML = ''; box.classList.toggle('two', p.choices.length === 2); box.classList.toggle('places', p.type === 'place');
    p.choices.forEach((v, k) => {
      const b = document.createElement('button'); b.className = 'mb-choice c' + (p.choices.length === 2 ? k * 2 : k) + (typeof v === 'string' ? ' word' : ''); b.dataset.v = v; b.innerHTML = `<small>${k + 1}</small>${typeof v === 'number' ? fmtN(v) : v}`;
      b.addEventListener('click', () => answer(v, b)); box.appendChild(b);
    });
    card.classList.remove('enter'); void card.offsetWidth; card.classList.add('enter');
    renderDots();
  }
  function answer(v, btn) {
    if (MB.locked) return; MB.locked = true;
    const p = MB.set[MB.i], ok = v === p.ans;
    MB.results[MB.i] = ok; if (ok) MB.right++;
    const card = $('mbCard'); card.classList.add(ok ? 'right' : 'wrong');
    btn.classList.add(ok ? 'right' : 'wrong');
    if (!ok) [...$('mbChoices').children].forEach((b) => { if (b.dataset.v === String(p.ans)) b.classList.add('right'); });
    const q = $('mbProb').querySelector('.q, .eq'); if (q) q.textContent = (p.type === 'mul' ? '= ' : '') + fmtN(p.ans);
    ok ? chime() : buzz();
    renderDots();
    setTimeout(() => { MB.i++; if (MB.i >= N) finish(); else show(); }, ok ? 420 : 1300);
  }
  function finish() {
    clearInterval(MB.timer); const secs = (performance.now() - MB.t0) / 1000, pass = MB.right >= PASS;
    const d = HC.Progress.data, s = d.math = Object.assign({ sets: 0, passed: 0, solved: 0, correct: 0, best: 0 }, d.math || {});
    s.sets++; s.solved += N; s.correct += MB.right; if (pass) { s.passed++; if (!s.best || secs < s.best) { s.newBest = true; s.best = secs; } else s.newBest = false; }
    HC.Progress.save();
    showStage('done');
    const per = secs / N;
    const brain = per < 3 ? ['🚀', 'Rocket brain!'] : per < 5 ? ['🐆', 'Cheetah brain!'] : per < 8 ? ['🐰', 'Bunny brain!'] : ['🐢', 'Turtle brain — slow and steady!'];
    $('mbBig').textContent = `${MB.right}/${N}`; $('mbBig').className = 'mb-big ' + (pass ? 'pass' : 'fail');
    $('mbBrain').textContent = pass ? `${brain[0]} ${brain[1]}` : MB.right >= 7 ? '😮 So close!' : '💪 Keep practicing!';
    $('mbMsg').textContent = pass ? `You're in! Time ${fmt(secs)}${s.newBest ? ' · New best!' : ''}` : `You need ${PASS} right to play. Try a fresh set!`;
    $('mbGo').hidden = !pass; $('mbRetry').hidden = pass;
    const line = (p) => p.type === 'parity' ? `${fmtN(p.n)} is ${p.ans.toLowerCase()}` : p.type === 'place' ? `${markDigit(p, 'mb-under')} → ${p.ans}` : `${p.a} ${p.op} ${p.b} = ${fmtN(p.ans)}`;
    $('mbReview').innerHTML = MB.set.map((p, i) => `<span class="${MB.results[i] ? 'ok' : 'bad'}">${line(p)}</span>`).join('');
    if (pass) HC.Audio.win(); else HC.Audio.lose();
  }
  function close() { MB.on = false; $('brain').hidden = true; clearInterval(MB.timer); clearTimeout(MB.cdT); }

  function chime() { const A = HC.Audio; if (!A.ctx || !A.sfxOn) return; A.levelUp(); }
  function buzz() { const A = HC.Audio; if (!A.ctx || !A.sfxOn) return; A.death(); A.haptic(120); }

  MB.init = function () {
    $('mbStart').addEventListener('click', start);
    $('mbRetry').addEventListener('click', start);
    $('mbGo').addEventListener('click', () => { close(); const f = MB.onPass; MB.onPass = null; f && f(); });
    for (const id of ['mbBack', 'mbBack2']) $(id).addEventListener('click', () => { close(); HC.Menus.toHome(); });
    window.addEventListener('keydown', (e) => {
      if (!MB.on) return;
      if (!$('mbPlay').hidden && !MB.locked && e.key >= '1' && e.key <= '5') { const b = $('mbChoices').children[Number(e.key) - 1]; b && b.click(); }
      if (e.key === 'Enter') { if (!$('mbIntro').hidden) start(); else if (!$('mbDone').hidden) ($('mbGo').hidden ? $('mbRetry') : $('mbGo')).click(); }
      e.stopPropagation();
    }, true);
  };

  // Grown-ups can switch the gate off in Settings after answering a harder question.
  MB.parentCheck = function () {
    const a = R(12, 29), b = R(13, 28);
    return { q: `${a} × ${b}`, ans: a * b };
  };

  HC.Brain = MB;
})();
