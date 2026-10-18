// All sound is synthesized with Web Audio — no files, works offline.
// Swallow "bloops" drop in pitch and get chunkier with object size, and climb with combos.
// A light, bouncy music loop plays during matches (toggle in settings).
(function () {
  const A = { ctx: null, sfxOn: true, musicOn: true, musicPlaying: false };

  A.init = function () {
    const d = HC.Progress.data; A.sfxOn = d.sound !== false; A.musicOn = d.music !== false;
  };
  A.unlock = function () {
    if (!A.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      A.ctx = new AC();
      A.master = A.ctx.createGain(); A.master.gain.value = 0.9; A.master.connect(A.ctx.destination);
      A.sfx = A.ctx.createGain(); A.sfx.gain.value = 0.55; A.sfx.connect(A.master);
      A.mus = A.ctx.createGain(); A.mus.gain.value = 0.0; A.mus.connect(A.master);
      // Shared noise buffer.
      const len = A.ctx.sampleRate; const buf = A.ctx.createBuffer(1, len, A.ctx.sampleRate); const ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
      A.noise = buf;
    }
    if (A.ctx.state === 'suspended') A.ctx.resume();
    if (A.wantMusic && !A.musicPlaying) A.startMusic();
  };
  const now = () => A.ctx.currentTime;
  const ok = () => A.ctx && A.sfxOn && A.ctx.state === 'running';

  function tone(freq, t0, dur, type = 'sine', vol = 0.3, freqEnd = null, dest = A.sfx) {
    const o = A.ctx.createOscillator(), g = A.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(dest); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(t0, dur, vol, fFrom, fTo, q = 1, dest = A.sfx) {
    const s = A.ctx.createBufferSource(); s.buffer = A.noise; s.loop = true;
    const f = A.ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q; f.frequency.setValueAtTime(fFrom, t0); f.frequency.exponentialRampToValueAtTime(Math.max(30, fTo), t0 + dur);
    const g = A.ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f).connect(g).connect(dest); s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.05);
  }

  let lastPop = 0;
  A.pop = function (points, combo, distK = 1) {
    if (!ok()) return;
    const t = now(); if (t - lastPop < 0.03) return; lastPop = t;
    const size = Math.log2(1 + points);           // 1 → 1, 140 → 7
    const semis = Math.min(14, (combo - 1) * 1.0);
    const base = 760 / (1 + size * 0.55) * Math.pow(2, semis / 12);
    const v = 0.22 * distK;
    tone(base * 1.6, t, 0.09 + size * 0.03, 'sine', v, base * 0.7);
    tone(base * 2.4, t + 0.015, 0.05, 'triangle', v * 0.35, base * 1.2);
    if (size > 2.5) { noise(t, 0.25 + size * 0.12, v * 0.9, 900, 120, 0.8); tone(90, t, 0.3 + size * 0.1, 'sine', v * 1.1, 40); }
    if (size > 5) noise(t + 0.05, 1.2, v * 0.7, 300, 50, 0.5);
  };
  A.levelUp = function () {
    if (!ok()) return; const t = now();
    [523, 659, 784, 1047].forEach((f, i) => { tone(f, t + i * 0.06, 0.22, 'triangle', 0.18); tone(f * 2, t + i * 0.06, 0.12, 'sine', 0.05); });
  };
  A.kill = function () { if (!ok()) return; const t = now(); tone(220, t, 0.45, 'sawtooth', 0.12, 55); noise(t, 0.5, 0.25, 2000, 100, 0.7); tone(880, t + 0.25, 0.25, 'triangle', 0.15, 1320); };
  A.death = function () { if (!ok()) return; const t = now(); [523, 466, 392, 330].forEach((f, i) => tone(f, t + i * 0.12, 0.25, 'triangle', 0.16)); noise(t, 0.6, 0.2, 1500, 80, 0.7); };
  A.count = function (n) { if (!ok()) return; tone(n > 0 ? 660 : 990, now(), n > 0 ? 0.12 : 0.35, 'square', 0.08); };
  A.tick = function () { if (!ok()) return; tone(1400, now(), 0.04, 'square', 0.05); };
  A.win = function () { if (!ok()) return; const t = now(); [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, t + i * 0.11, 0.3, 'triangle', 0.17)); };
  A.lose = function () { if (!ok()) return; const t = now(); [392, 349, 330, 262].forEach((f, i) => tone(f, t + i * 0.16, 0.3, 'triangle', 0.14)); };
  A.click = function () { if (!ok()) return; tone(880, now(), 0.05, 'sine', 0.1, 660); };
  A.haptic = function (ms) { if (navigator.vibrate) try { navigator.vibrate(ms); } catch (_) { /* ignore */ } };

  // ---- music: bouncy I–V–vi–IV loop with plucked arpeggios, bass and soft hats ----
  const BPM = 116, STEP = 60 / BPM / 2; // eighth notes
  const CH = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]];
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const MEL = [76, null, 79, 76, 74, null, 72, 74, 74, null, 79, null, 74, 71, 72, null, 72, null, 76, 72, 71, null, 69, 71, 72, null, 77, 76, 74, null, 72, null];
  A.startMusic = function () {
    A.wantMusic = true;
    if (!A.ctx || !A.musicOn || A.musicPlaying) return;
    A.musicPlaying = true; A.step = 0; A.nextT = now() + 0.1;
    A.mus.gain.cancelScheduledValues(now()); A.mus.gain.setTargetAtTime(0.32, now(), 0.4);
    A.timer = setInterval(schedule, 60);
  };
  A.stopMusic = function () {
    A.wantMusic = false; if (!A.ctx || !A.musicPlaying) return;
    A.mus.gain.setTargetAtTime(0, now(), 0.25);
    setTimeout(() => { clearInterval(A.timer); A.musicPlaying = false; }, 600);
  };
  function schedule() {
    while (A.nextT < now() + 0.25) {
      const s = A.step, bar = Math.floor(s / 8) % 4, chord = CH[bar], t = A.nextT;
      // Arpeggio.
      const note = chord[(s % 8) % 3] + 12 * (s % 8 >= 3 ? 1 : 0);
      tone(mtof(note), t, STEP * 0.9, 'triangle', 0.05, null, A.mus);
      // Bass on beats.
      if (s % 4 === 0) tone(mtof(chord[0] - 24), t, STEP * 1.8, 'sine', 0.16, null, A.mus);
      if (s % 4 === 2) tone(mtof(chord[0] - 12), t, STEP * 0.8, 'sine', 0.07, null, A.mus);
      // Melody.
      const m = MEL[s % MEL.length]; if (m && Math.floor(s / 32) % 2 === 1) tone(mtof(m), t, STEP * 1.6, 'square', 0.025, null, A.mus);
      // Hats & claps.
      noise(t, 0.04, s % 2 ? 0.03 : 0.015, 9000, 7000, 2, A.mus);
      if (s % 8 === 4) noise(t, 0.12, 0.06, 1800, 900, 1, A.mus);
      A.step++; A.nextT += STEP;
    }
  }
  A.setSfx = function (on) { A.sfxOn = on; HC.Progress.data.sound = on; HC.Progress.save(); };
  A.setMusic = function (on) { A.musicOn = on; HC.Progress.data.music = on; HC.Progress.save(); if (!on) { const w = A.wantMusic; A.stopMusic(); A.wantMusic = w; } else if (A.wantMusic) { A.musicPlaying = false; A.startMusic(); } };

  HC.Audio = A;
})();
