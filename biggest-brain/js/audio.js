/* ===== WebAudio sound effects (all synthesized, no files) ===== */
(function(){
  let ctx = null;
  let muted = false;

  function ac(){
    if(!ctx){
      try{ ctx = new (window.AudioContext||window.webkitAudioContext)(); }
      catch(e){ ctx = null; }
    }
    if(ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, t0, dur, type, vol, slideTo){
    const c = ac(); if(!c || muted) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type||'sine'; o.frequency.setValueAtTime(freq, c.currentTime+t0);
    if(slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime+t0+dur);
    g.gain.setValueAtTime(0, c.currentTime+t0);
    g.gain.linearRampToValueAtTime(vol||0.18, c.currentTime+t0+0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, c.currentTime+t0+dur);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime+t0); o.stop(c.currentTime+t0+dur+0.05);
  }

  const SFX = {
    unlock(){ ac(); },
    setMuted(m){ muted = m; },
    isMuted(){ return muted; },
    click(){ tone(680,0,.06,'square',.08); },
    pop(){ tone(420,0,.09,'triangle',.15,700); },
    correct(){ tone(660,0,.11,'triangle',.18); tone(880,.09,.14,'triangle',.18); tone(1320,.19,.22,'triangle',.14); },
    wrong(){ tone(220,0,.22,'sawtooth',.13,160); tone(160,.16,.3,'sawtooth',.12,110); },
    flip(){ tone(500,0,.05,'square',.07,900); },
    tick(){ tone(950,0,.04,'square',.06); },
    count(){ tone(520,0,.16,'square',.14); },
    go(){ tone(780,0,.3,'square',.16,1040); },
    timeup(){ tone(392,0,.25,'square',.15); tone(330,.22,.4,'square',.15); },
    fanfare(){
      tone(523,0,.16,'triangle',.17); tone(659,.14,.16,'triangle',.17);
      tone(784,.28,.16,'triangle',.17); tone(1046,.42,.5,'triangle',.2);
      tone(784,.42,.5,'sine',.1);
    },
    trophy(){
      tone(659,0,.13,'triangle',.16); tone(880,.12,.13,'triangle',.16);
      tone(1174,.24,.35,'triangle',.18);
    },
    hatch(){ tone(900,0,.08,'triangle',.14,1400); },
    whoosh(){ tone(300,0,.25,'sine',.1,90); }
  };

  window.SFX = SFX;
})();
