/* STARFALL - AudioEngine: all sound synthesized at runtime via Web Audio API.
   No audio files. Master -> music gain + sfx gain (persisted 0-100). */
"use strict";

var AudioEngine = (function () {
  var ctx = null;
  var master, sfxGain, musicGain;
  var started = false;
  var musicState = { mode: "explore", sectorFlavor: "civilian", timer: null, combatMix: 0, nodes: [] };
  var loops = { fire: null, breach: null, alarm: null };
  var volumes = { sfx: 70, music: 60 };

  function ensure() {
    if (ctx) return true;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.connect(ctx.destination);
      sfxGain = ctx.createGain();
      musicGain = ctx.createGain();
      sfxGain.connect(master);
      musicGain.connect(master);
      applyVolumes();
      return true;
    } catch (e) { return false; }
  }

  function applyVolumes() {
    if (!ctx) return;
    sfxGain.gain.value = Math.pow(volumes.sfx / 100, 1.6) * 0.9;
    musicGain.gain.value = Math.pow(volumes.music / 100, 1.6) * 0.5;
  }

  function unlock() { // first user gesture
    if (!ensure()) return;
    if (ctx.state === "suspended") ctx.resume();
    if (!started) { started = true; startMusic(); }
  }

  function now() { return ctx ? ctx.currentTime : 0; }

  // ---- SFX primitives ----------------------------------------------------
  function env(node, t0, a, peak, d, sustain, r) {
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain), t0 + a + d);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d + r);
    node.connect(g);
    g.connect(sfxGain);
    return g;
  }

  function osc(type, f0, t0, dur, sweepTo) {
    var o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (sweepTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, sweepTo), t0 + dur);
    o.start(t0);
    o.stop(t0 + dur + 0.35);
    return o;
  }

  function noiseBuffer(brown) {
    var len = ctx.sampleRate * 1.5;
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    var last = 0;
    for (var i = 0; i < len; i++) {
      var w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else d[i] = w;
    }
    return buf;
  }
  var noiseBufWhite = null, noiseBufBrown = null;

  function noise(t0, dur, brown, filterFreq, filterType, sweepTo) {
    if (!noiseBufWhite) noiseBufWhite = noiseBuffer(false);
    if (!noiseBufBrown) noiseBufBrown = noiseBuffer(true);
    var src = ctx.createBufferSource();
    src.buffer = brown ? noiseBufBrown : noiseBufWhite;
    src.loop = true;
    var f = ctx.createBiquadFilter();
    f.type = filterType || "lowpass";
    f.frequency.setValueAtTime(filterFreq || 4000, t0);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
    src.connect(f);
    src.start(t0);
    src.stop(t0 + dur + 0.3);
    return f;
  }

  // ---- SFX recipes (§17 table) -------------------------------------------
  var sfx = {
    uiClick: function (t) { env(osc("square", 880, t, 0.05), t, 0.002, 0.25, 0.02, 0.02, 0.03); },
    uiHover: function (t) { env(osc("triangle", 1320, t, 0.03), t, 0.002, 0.06, 0.01, 0.01, 0.02); },
    laser: function (t) {
      env(osc("sawtooth", 900, t, 0.12, 200), t, 0.004, 0.3, 0.06, 0.05, 0.08);
      env(noise(t, 0.08, false, 3000, "bandpass"), t, 0.002, 0.12, 0.04, 0.02, 0.04);
    },
    missile: function (t) {
      env(noise(t, 0.3, false, 900, "bandpass", 300), t, 0.02, 0.3, 0.18, 0.08, 0.12);
      env(osc("sine", 90, t, 0.3, 50), t, 0.02, 0.22, 0.2, 0.05, 0.1);
    },
    beam: function (t) {
      var o1 = osc("sawtooth", 180, t, 1.5), o2 = osc("sawtooth", 183, t, 1.5);
      var lfo = osc("sine", 7, t, 1.5);
      var lg = ctx.createGain(); lg.gain.value = 0.12;
      lfo.connect(lg);
      var g1 = env(o1, t, 0.05, 0.14, 1.1, 0.05, 0.35);
      lg.connect(g1.gain);
      env(o2, t, 0.05, 0.12, 1.1, 0.05, 0.35);
    },
    ionShot: function (t) {
      env(osc("sine", 1200, t, 0.15, 700), t, 0.003, 0.25, 0.08, 0.03, 0.1);
      env(noise(t, 0.12, false, 5000, "highpass"), t, 0.003, 0.08, 0.05, 0.02, 0.06);
    },
    bombWarp: function (t) { env(osc("sine", 400, t, 0.22, 1600), t, 0.01, 0.2, 0.12, 0.06, 0.1); },
    shieldHit: function (t) {
      var car = osc("sine", 400, t, 0.18);
      var mod = osc("sine", 620, t, 0.18);
      var mg = ctx.createGain(); mg.gain.value = 300;
      mod.connect(mg); mg.connect(car.frequency);
      env(car, t, 0.002, 0.3, 0.1, 0.03, 0.08);
    },
    hullHit: function (t) {
      env(osc("sine", 60, t, 0.22, 40), t, 0.003, 0.5, 0.15, 0.05, 0.1);
      env(noise(t, 0.2, true, 1200, "lowpass"), t, 0.003, 0.35, 0.12, 0.05, 0.1);
    },
    explosion: function (t) {
      env(noise(t, 1.2, true, 3000, "lowpass", 120), t, 0.01, 0.7, 0.7, 0.1, 0.5);
      env(osc("sine", 70, t, 0.9, 30), t, 0.01, 0.5, 0.6, 0.08, 0.4);
    },
    alarm: function (t) {
      env(osc("square", 660, t, 0.22), t, 0.005, 0.12, 0.15, 0.05, 0.05);
      env(osc("square", 520, t + 0.25, 0.22), t + 0.25, 0.005, 0.12, 0.15, 0.05, 0.05);
    },
    door: function (t) { env(osc("square", 300, t, 0.035, 700), t, 0.002, 0.1, 0.02, 0.02, 0.02); },
    crewDeath: function (t) { env(osc("triangle", 500, t, 0.4, 250), t, 0.01, 0.25, 0.28, 0.05, 0.12); },
    levelUp: function (t) {
      env(osc("triangle", 523, t, 0.08), t, 0.005, 0.2, 0.05, 0.05, 0.05);
      env(osc("triangle", 659, t + 0.07, 0.08), t + 0.07, 0.005, 0.2, 0.05, 0.05, 0.05);
      env(osc("triangle", 784, t + 0.14, 0.1), t + 0.14, 0.005, 0.2, 0.06, 0.05, 0.08);
    },
    coin: function (t) {
      env(osc("square", 1046, t, 0.06), t, 0.003, 0.15, 0.04, 0.03, 0.04);
      env(osc("square", 1568, t + 0.07, 0.09), t + 0.07, 0.003, 0.15, 0.05, 0.03, 0.06);
    },
    ftlReady: function (t) {
      env(osc("sine", 523, t, 0.12), t, 0.005, 0.2, 0.08, 0.05, 0.08);
      env(osc("sine", 784, t + 0.12, 0.2), t + 0.12, 0.005, 0.22, 0.12, 0.05, 0.12);
    },
    ftlJump: function (t) {
      env(noise(t, 1.0, false, 300, "bandpass", 4000), t, 0.1, 0.35, 0.6, 0.1, 0.3);
      env(osc("sawtooth", 80, t, 1.0, 900), t, 0.1, 0.25, 0.6, 0.08, 0.3);
    },
    achievement: function (t) {
      var f = [523, 659, 784, 1046];
      for (var i = 0; i < 4; i++) env(osc("square", f[i], t + i * 0.09, 0.09), t + i * 0.09, 0.004, 0.13, 0.06, 0.04, 0.05);
    },
    fireStart: function (t) { env(noise(t, 0.25, false, 1800, "bandpass"), t, 0.01, 0.2, 0.15, 0.05, 0.1); },
    breachPunch: function (t) {
      env(osc("sine", 120, t, 0.15, 60), t, 0.003, 0.4, 0.1, 0.05, 0.08);
      env(noise(t, 0.4, false, 6000, "highpass"), t, 0.01, 0.15, 0.25, 0.04, 0.15);
    },
    teleport: function (t) { env(osc("sine", 300, t, 0.4, 1800), t, 0.02, 0.2, 0.25, 0.06, 0.15); },
    railgun: function (t) {
      // capacitor whine ramping up, then a violent electromagnetic crack
      env(osc("sawtooth", 220, t, 0.18, 2400), t, 0.01, 0.18, 0.12, 0.04, 0.06);
      env(noise(t + 0.14, 0.5, false, 6500, "highpass"), t + 0.14, 0.002, 0.5, 0.3, 0.05, 0.25);
      env(noise(t + 0.14, 0.7, true, 2200, "lowpass", 100), t + 0.14, 0.004, 0.6, 0.45, 0.08, 0.35);
      env(osc("sine", 55, t + 0.14, 0.6, 28), t + 0.14, 0.004, 0.5, 0.4, 0.06, 0.3);
      env(osc("square", 1760, t + 0.15, 0.22, 440), t + 0.15, 0.002, 0.14, 0.14, 0.03, 0.1);
    }
  };

  function play(name) {
    if (!ctx || ctx.state !== "running") return;
    var fn = sfx[name];
    if (fn) { try { fn(now() + 0.001); } catch (e) { /* pool exhaustion safe */ } }
  }

  // ---- Looping ambience (fire crackle / breach hiss / alarm) --------------
  function setLoop(kind, on) {
    if (!ctx || ctx.state !== "running") return;
    if (on && !loops[kind]) {
      var g = ctx.createGain();
      g.gain.value = 0;
      g.connect(sfxGain);
      var src;
      if (kind === "fire") {
        src = noise(now(), 3600, false, 1400, "bandpass");
        src.disconnect(); src.connect(g);
        g.gain.linearRampToValueAtTime(0.09, now() + 0.5);
        var lfo = osc("square", 11, now(), 3600);
        var lg = ctx.createGain(); lg.gain.value = 0.05;
        lfo.connect(lg); lg.connect(g.gain);
        loops[kind] = { g: g };
      } else if (kind === "breach") {
        src = noise(now(), 3600, false, 5000, "highpass");
        src.disconnect(); src.connect(g);
        g.gain.linearRampToValueAtTime(0.05, now() + 0.5);
        loops[kind] = { g: g };
      } else if (kind === "alarm") {
        loops[kind] = { g: g, iv: setInterval(function () { play("alarm"); }, 1000) };
      }
    } else if (!on && loops[kind]) {
      try {
        loops[kind].g.gain.linearRampToValueAtTime(0.0001, now() + 0.4);
        if (loops[kind].iv) clearInterval(loops[kind].iv);
        (function (entry) { setTimeout(function () { try { entry.g.disconnect(); } catch (e) {} }, 600); })(loops[kind]);
      } catch (e) {}
      loops[kind] = null;
    }
  }

  // ---- Generative music (§17): explore pads + combat pulse ---------------
  var SCALES = {
    civilian: [220, 261.6, 293.7, 329.6, 392],      // brighter minor pentatonic
    nebula: [196, 220, 246.9, 293.7, 329.6],        // darker dorian coloring
    hostile: [174.6, 207.7, 233.1, 261.6, 311.1],
    boss: [155.6, 185, 207.7, 233.1, 277.2]
  };
  var musicIv = null, pulseIv = null, pulseGain = null, step = 0;

  function padChord(t) {
    if (!ctx || ctx.state !== "running") return;
    var scale = SCALES[musicState.sectorFlavor] || SCALES.civilian;
    var root = scale[Math.floor(Math.random() * scale.length)];
    var freqs = [root, root * 1.5, root * (Math.random() < 0.5 ? 1.189 : 1.335)];
    for (var i = 0; i < freqs.length; i++) {
      var o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
      o1.type = "triangle"; o2.type = "triangle";
      o1.frequency.value = freqs[i];
      o2.frequency.value = freqs[i] * 1.004;
      var f = ctx.createBiquadFilter();
      f.type = "lowpass"; f.frequency.value = 900;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.05, t + 2.5);
      g.gain.linearRampToValueAtTime(0.0001, t + 8);
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(musicGain);
      o1.start(t); o2.start(t); o1.stop(t + 8.2); o2.stop(t + 8.2);
    }
  }

  function combatPulse() {
    if (!ctx || ctx.state !== "running" || musicState.combatMix <= 0.02) return;
    var t = now();
    var amp = musicState.combatMix;
    step++;
    // kick: sine drop (every beat), hat: noise tick (offbeat), arp line
    var k = osc("sine", 130, t, 0.12, 45);
    var kg = ctx.createGain();
    kg.gain.setValueAtTime(0.3 * amp, t);
    kg.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    k.connect(kg); kg.connect(musicGain);
    if (step % 2 === 1) {
      var h = noise(t + 0.3, 0.04, false, 8000, "highpass");
      var hg = ctx.createGain();
      hg.gain.setValueAtTime(0.06 * amp, t + 0.3);
      hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
      h.disconnect(); h.connect(hg); hg.connect(musicGain);
    }
    var scale = SCALES[musicState.sectorFlavor] || SCALES.civilian;
    var f = scale[(step * 3) % scale.length] * 2;
    var a = osc("square", f, t + 0.15, 0.1);
    var ag = ctx.createGain();
    ag.gain.setValueAtTime(0.035 * amp, t + 0.15);
    ag.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    a.connect(ag); ag.connect(musicGain);
  }

  function startMusic() {
    if (musicIv) return;
    padChord(now() + 0.2);
    musicIv = setInterval(function () { if (ctx && ctx.state === "running") padChord(now()); }, 8000);
    pulseIv = setInterval(function () {
      // crossfade combat layer over ~2s (0.05 per 100ms tick... use 0.03/60ms)
      var target = musicState.mode === "combat" ? 1 : 0;
      musicState.combatMix += (target - musicState.combatMix) * 0.08;
    }, 100);
    setInterval(combatPulse, 600); // 100 BPM beat
  }

  return {
    unlock: unlock,
    play: play,
    setLoop: setLoop,
    setCombat: function (on) { musicState.mode = on ? "combat" : "explore"; },
    setSectorFlavor: function (f) { musicState.sectorFlavor = SCALES[f] ? f : "civilian"; },
    setVolumes: function (s, m) { volumes.sfx = s; volumes.music = m; applyVolumes(); },
    getVolumes: function () { return { sfx: volumes.sfx, music: volumes.music }; },
    isRunning: function () { return !!ctx && ctx.state === "running"; }
  };
})();
