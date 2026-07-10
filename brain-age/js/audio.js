/* ===== Minimal synthesized SFX — restrained, pencil-and-paper mood ===== */
(function(){
  let ctx=null, muted=false;
  function ac(){
    if(!ctx){ try{ ctx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ctx=null;} }
    if(ctx && ctx.state==='suspended') ctx.resume();
    return ctx;
  }
  function tone(f,t0,d,type,v,slide){
    const c=ac(); if(!c||muted) return;
    const o=c.createOscillator(), g=c.createGain();
    o.type=type||'sine'; o.frequency.setValueAtTime(f,c.currentTime+t0);
    if(slide) o.frequency.exponentialRampToValueAtTime(slide,c.currentTime+t0+d);
    g.gain.setValueAtTime(0,c.currentTime+t0);
    g.gain.linearRampToValueAtTime(v||0.1,c.currentTime+t0+0.01);
    g.gain.exponentialRampToValueAtTime(0.0006,c.currentTime+t0+d);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime+t0); o.stop(c.currentTime+t0+d+0.05);
  }
  window.SFX={
    unlock(){ac();},
    setMuted(m){muted=m;}, isMuted(){return muted;},
    tap(){tone(520,0,.05,'square',.05);},
    correct(){tone(880,0,.09,'sine',.11);tone(1320,.08,.14,'sine',.09);},
    wrong(){tone(200,0,.18,'square',.08,150);},
    tick(){tone(900,0,.03,'square',.04);},
    count(){tone(600,0,.12,'sine',.09);},
    go(){tone(800,0,.2,'sine',.1,1100);},
    done(){tone(660,0,.12,'sine',.1);tone(880,.11,.12,'sine',.1);tone(1100,.22,.3,'sine',.11);},
    stamp(){tone(300,0,.1,'square',.09,180);}
  };
})();
