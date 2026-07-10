/* ============================================================
   App shell: screens, round flow, scoring, trophies, profile.
   ============================================================ */
(function(){
  const $stage = document.getElementById('stage');
  const $scenery = document.getElementById('scenery');
  const $screen = document.getElementById('screen');
  const $hostL = document.getElementById('host-layer');
  const $chrome = document.getElementById('chrome-layer');
  const $overlay = document.getElementById('overlay-layer');

  /* ---------- stage scaling ---------- */
  function rescale(){
    const s = Math.min(window.innerWidth/1024, window.innerHeight/768);
    $stage.style.transform = 'scale('+s+')';
  }
  window.addEventListener('resize', rescale); rescale();
  // orientation changes can report stale dimensions for a beat on iOS
  window.addEventListener('orientationchange', ()=>{ setTimeout(rescale,80); setTimeout(rescale,350); });
  if(window.visualViewport) window.visualViewport.addEventListener('resize', rescale);
  const rotateHint = document.getElementById('rotate-hint');
  if(rotateHint) rotateHint.addEventListener('click', ()=>rotateHint.remove());

  /* ---------- persistence ---------- */
  const store = (function(){
    let mem = null;
    const KEY='bb_recreation_save';
    function load(){
      if(mem) return mem;
      try{ mem = JSON.parse(localStorage.getItem(KEY)) || null; }catch(e){ mem = null; }
      if(!mem) mem = {best:0, gamesPlayed:0, catBest:{}, trophies:[]};
      return mem;
    }
    function save(){
      try{ localStorage.setItem(KEY, JSON.stringify(mem)); }catch(e){/* memory only */}
    }
    return {load, save};
  })();

  const TROPHIES = [
    {id:'spark',   name:'Bright Spark',    req:'Brain size 800 cm³',  test:s=>s.best>=800},
    {id:'egghead', name:'Egghead',         req:'Brain size 1500 cm³', test:s=>s.best>=1500},
    {id:'mastermind', name:'Mastermind',   req:'Brain size 2500 cm³', test:s=>s.best>=2500},
    {id:'proclub', name:'Pro Player Club', req:'Brain size 4300 cm³', test:s=>s.best>=4300},
    {id:'analyse', name:'Analyse Ace',     req:'350 pts in an Analyse round',   test:s=>(s.catBest.analyse||0)>=350},
    {id:'calculate', name:'Number Cruncher', req:'350 pts in a Calculate round', test:s=>(s.catBest.calculate||0)>=350},
    {id:'memorise', name:'Elephant Memory', req:'350 pts in a Memorise round',  test:s=>(s.catBest.memorise||0)>=350},
    {id:'visualise', name:'Eagle Eye',     req:'350 pts in a Visualise round',  test:s=>(s.catBest.visualise||0)>=350},
    {id:'ten',     name:'Brain Regular',   req:'Play 10 games',       test:s=>s.gamesPlayed>=10},
    {id:'25',      name:'Brain Addict',    req:'Play 25 games',       test:s=>s.gamesPlayed>=25},
    {id:'allgames', name:'Curious Mind',   req:'Try every minigame',  test:s=>GAMES.list.every(g=>(s.played||{})[g.id])},
    {id:'perfect', name:'Big Round',       req:'500 pts in one round', test:s=>(s.bestRound||0)>=500}
  ];

  function el(parent, tag, cls, css, html){
    const e = document.createElement(tag);
    if(cls) e.className = cls;
    if(css) Object.assign(e.style, css);
    if(html!=null) e.innerHTML = html;
    parent.appendChild(e);
    return e;
  }
  function clearAll(){
    $scenery.innerHTML=''; $screen.innerHTML=''; $hostL.innerHTML='';
    $chrome.innerHTML=''; $overlay.innerHTML='';
  }

  /* ---------- audio unlock ---------- */
  document.addEventListener('pointerdown', ()=>SFX.unlock(), {once:true});

  /* ---------- keyboard dispatch ---------- */
  let activeKeyHandlers = [];
  document.addEventListener('keydown', e=>{
    activeKeyHandlers.forEach(fn=>fn(e));
  });

  /* ---------- shared scenery ---------- */
  function stageScenery(){
    $scenery.innerHTML =
      ART.spotlight(120, 40, 35, 700, 300) +
      ART.spotlight(904, 40, -35, 700, 300) +
      ART.spotlight(320, 10, 15, 800, 260) +
      ART.audience();
  }
  function risers(config){
    // config: array of {type:'stripe'|'riser'|'floor', top, h}
    let html='';
    config.forEach(c=>{
      if(c.type==='stripe') html += `<div class="riser-stripe" style="top:${c.top}px;height:${c.h}px;"></div>`;
      else if(c.type==='riser') html += `<div class="riser" style="top:${c.top}px;height:${c.h}px;"></div>`;
      else html += `<div class="stage-floor"></div>`;
    });
    return html;
  }
  const MENU_RISERS = risers([
    {type:'stripe',top:596,h:36},
    {type:'riser',top:632,h:58},
    {type:'stripe',top:690,h:16},
    {type:'riser',top:706,h:56},
    {type:'floor'}
  ]);
  const ROOM_RISERS = risers([
    {type:'stripe',top:618,h:32},
    {type:'riser',top:650,h:62},
    {type:'stripe',top:712,h:14},
    {type:'riser',top:726,h:42}
  ]);
  function greyRoomBG(){
    return `<div style="position:absolute;inset:0;background:linear-gradient(180deg,#9a9d9e 0%,#b9bcbd 45%,#d8dadb 100%);"></div>
      <svg style="position:absolute;inset:0;" width="1024" height="768" viewBox="0 0 1024 768">
        <path d="M-60 40 Q160 -40 320 80 Q460 180 380 300 Q300 420 140 360 Q-40 300 -60 40 Z" fill="#8a8d8e" opacity=".55"/>
        <path d="M480 -40 Q700 -20 680 140 Q660 260 520 220 Q420 180 480 -40 Z" fill="#8a8d8e" opacity=".4"/>
        <path d="M560 340 Q700 300 720 420 Q730 520 600 520 Q490 510 560 340 Z" fill="#a2a5a6" opacity=".5"/>
      </svg>`;
  }

  /* ---------- host & speech ---------- */
  function showHost(opts){
    // opts: pose, face, x, y, w, podium:{x,y,w}, bounce
    let html='';
    if(opts.podium) html += `<div style="position:absolute;left:${opts.podium.x}px;top:${opts.podium.y}px;">${ART.podium(opts.podium.w)}</div>`;
    const hostHtml = `<div class="host ${opts.bounce?'bounce':''}" style="left:${opts.x}px;top:${opts.y}px;">${ART.host(opts.pose,opts.face,opts.w)}</div>`;
    if(opts.podiumInFront){
      html = hostHtml + html;
      $hostL.innerHTML = html;
    } else {
      $hostL.innerHTML = html + hostHtml;
    }
  }
  function speech(text, opts){
    opts = opts||{};
    const s = document.createElement('div');
    s.className = 'speech'+(opts.tailRight?' tail-right':'');
    s.style.left = (opts.x||640)+'px';
    s.style.top = (opts.y||40)+'px';
    s.style.width = (opts.w||330)+'px';
    if(opts.fs) s.style.fontSize = opts.fs+'px';
    s.innerHTML = text;
    $hostL.appendChild(s);
    return s;
  }

  /* ---------- top chrome ---------- */
  function topChrome(){
    const lang = el($chrome,'button','chrome-btn',{right:'196px',width:'86px'},
      ART.globe(26)+'<span>ENGLISH</span>');
    lang.addEventListener('click',()=>{ SFX.click(); toast('This recreation speaks English only!'); });
    const eye = el($chrome,'button','chrome-btn',{right:'108px',width:'76px'}, ART.eyeIcon(44));
    eye.addEventListener('click',()=>{ SFX.click();
      toast('A fan-made tribute, rebuilt from scratch &mdash; every pixel redrawn!'); });
    const snd = el($chrome,'button','chrome-btn'+(SFX.isMuted()?' off':''),{right:'22px',width:'74px'},
      ART.speaker(34,!SFX.isMuted()));
    snd.addEventListener('click',()=>{
      SFX.setMuted(!SFX.isMuted());
      snd.innerHTML = ART.speaker(34,!SFX.isMuted());
      snd.classList.toggle('off', SFX.isMuted());
      SFX.click();
    });
  }
  let toastTimer=null;
  function toast(text){
    let t = $overlay.querySelector('.toast-speech');
    if(t) t.remove();
    t = document.createElement('div');
    t.className = 'speech toast-speech';
    Object.assign(t.style,{left:'312px',top:'20px',width:'400px',fontSize:'18px',zIndex:'20'});
    t.innerHTML = text;
    $overlay.appendChild(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=>t.remove(), 2600);
  }

  function backButton(fn){
    const b = el($chrome,'button','square-btn back-btn',null,ART.backArrow(38));
    b.addEventListener('click',()=>{ SFX.click(); fn(); });
  }
  function quitButton(fn){
    const b = el($chrome,'button','square-btn quit-btn',null,ART.powerIcon(28));
    b.addEventListener('click',()=>{ SFX.click(); fn(); });
  }

  /* ============================================================
     MAIN MENU
     ============================================================ */
  function menuScreen(){
    clearAll();
    stageScenery();
    topChrome();
    const s = $screen;

    // marquee board
    el(s,'div',null,{position:'absolute',left:'64px',top:'148px',width:'846px',height:'478px',
      background:'linear-gradient(180deg,#c8cdce,#a9aeb0)',borderRadius:'18px',
      boxShadow:'0 12px 30px rgba(0,0,0,.45), inset 0 4px 6px rgba(255,255,255,.5)',
      border:'6px solid #8f9596'});
    // bulbs on left edge
    let bulbs='';
    for(let i=0;i<7;i++) bulbs += `<circle cx="20" cy="${34+i*64}" r="13" fill="#f6f3b5" stroke="#8f9596" stroke-width="3"/>`;
    for(let i=0;i<3;i++) bulbs += `<circle cx="62" cy="${34+i*64}" r="13" fill="#f6f3b5" stroke="#8f9596" stroke-width="3"/>`;
    el(s,'div',null,{position:'absolute',left:'80px',top:'168px',pointerEvents:'none'},
      `<svg width="90" height="450">${bulbs}</svg>`);
    // inner mint sunburst panel
    let rays='';
    for(let i=0;i<14;i++){
      const a1=i*(360/14), a2=a1+(360/28);
      const x1=345+560*Math.cos(a1*Math.PI/180), y1=215+560*Math.sin(a1*Math.PI/180);
      const x2=345+560*Math.cos(a2*Math.PI/180), y2=215+560*Math.sin(a2*Math.PI/180);
      rays += `<path d="M345 215 L${x1.toFixed(0)} ${y1.toFixed(0)} L${x2.toFixed(0)} ${y2.toFixed(0)} Z" fill="#cde8cf"/>`;
    }
    el(s,'div',null,{position:'absolute',left:'172px',top:'208px',width:'716px',height:'404px',
      borderRadius:'10px',overflow:'hidden',border:'4px solid #8f9596',pointerEvents:'none',
      background:'linear-gradient(135deg,#e4f2e2,#d2e8d4)'},
      `<svg width="716" height="404" viewBox="0 0 716 404"><g opacity=".6">${rays}</g></svg>`);

    // logo
    el(s,'div',null,{position:'absolute',left:'130px',top:'20px',width:'560px',pointerEvents:'none',zIndex:'3'},
      ART.logo());

    // menu buttons
    function menuButton(x,y,iconHTML,label,fs,fn){
      const b = el(s,'button','menu-btn',{left:x+'px',top:y+'px',zIndex:'4'});
      el(b,'div','icon',null,iconHTML);
      el(b,'div','bubble-label',{fontSize:fs+'px'},label);
      b.addEventListener('click',()=>{ SFX.pop(); fn(); });
      return b;
    }
    menuButton(255,255,ART.iconPlay(175),'PLAY',54, ()=>modeScreen());
    menuButton(545,285,ART.iconChallenge(165),'CHALLENGE',36, ()=>
      toast('CHALLENGE needs friends online &mdash; this offline tribute is solo. Beat your own best brain instead!'));
    menuButton(190,468,ART.iconInvite(180),'INVITE',30, ()=>
      toast('No friends to invite in offline mode &mdash; but the whole game is yours to PLAY!'));
    menuButton(432,462,ART.iconTrophy(112),'TROPHIES',30, ()=>trophyScreen());
    menuButton(648,478,ART.iconProfile(140),'PROFILE',30, ()=>profileScreen());

    el(s,'div',null,{position:'absolute',left:'0',top:'740px',width:'100%',textAlign:'center',
      fontFamily:'var(--font-bold)',fontWeight:'bold',fontSize:'14px',color:'#dfe3e4',pointerEvents:'none'},
      'Fan recreation built from scratch &middot; original game &copy; 2007-2008 Playfish Ltd.');

    el(s,'div',null,{position:'absolute',inset:'0',pointerEvents:'none',zIndex:'2'}, MENU_RISERS);

    showHost({pose:'arms-up',face:'happy',x:762,y:428,w:250,bounce:true,
      podium:{x:748,y:648,w:290}, podiumInFront:true});
    speech('Welcome! Got a big BRAIN? Play Who Has The Biggest Brain? to find out!',
      {x:704,y:128,w:290,fs:19});
  }

  /* ============================================================
     MODE SELECT
     ============================================================ */
  function modeScreen(){
    clearAll();
    $screen.innerHTML = greyRoomBG();
    topChrome();
    backButton(menuScreen);
    el($screen,'div',null,{position:'absolute',inset:'0',pointerEvents:'none'}, ROOM_RISERS);

    function modeBtn(x,y,iconHTML,label,fn){
      const b = el($screen,'button','menu-btn',{left:x+'px',top:y+'px'});
      el(b,'div','icon',null,iconHTML);
      el(b,'div','bubble-label',{fontSize:'42px',marginTop:'-24px'},label);
      b.addEventListener('click',()=>{ SFX.pop(); fn(); });
    }
    modeBtn(160,60,ART.iconClassic(280),'CLASSIC GAME', ()=>startClassic());
    modeBtn(430,300,ART.iconPro(260),'PRO GAME', ()=>startPro());
    modeBtn(60,420,ART.iconPractice(230),'PRACTICE', ()=>practiceScreen());

    showHost({pose:'wave',face:'open',x:700,y:390,w:420});
    speech("Let's play Who Has The Biggest Brain! Start by choosing your game mode",
      {x:664,y:96,w:320});
  }

  /* ============================================================
     PRACTICE GRID
     ============================================================ */
  function practiceScreen(){
    clearAll();
    $screen.innerHTML = greyRoomBG();
    topChrome();
    backButton(modeScreen);
    el($screen,'div',null,{position:'absolute',inset:'0',pointerEvents:'none'}, ROOM_RISERS);

    const iconBGs = {analyse:'#e8837a', calculate:'#f0d04a', memorise:'#7cc576', visualise:'#7da7d9'};
    GAMES.list.forEach((g,i)=>{
      const col=i%3, row=(i/3)|0;
      const x = 130 + col*205, y = 62 + row*142;
      const b = el($screen,'button','pg-icon',{left:x+'px',top:y+'px',background:iconBGs[g.category]});
      b.innerHTML = ART.gameIcon(g.id, 130);
      b.title = g.name;
      b.addEventListener('click',()=>{ SFX.pop(); startPractice(g.id); });
    });

    showHost({pose:'wave',face:'open',x:700,y:390,w:420});
    speech('Choose the minigame you would like to practice',{x:664,y:96,w:320});
  }

  /* ============================================================
     GAME SESSION
     ============================================================ */
  const CAT_BG = {
    analyse:  ['#f6c9b5','#fbeae2'],
    calculate:['#f2e2a8','#faf3d8'],
    memorise: ['#a8d8a4','#d4ecd0'],
    visualise:['#b4cfe8','#e2ecf6']
  };

  const ROUND_SECONDS = 60;
  let session = null;
  let currentCtx = null;

  function startClassic(){
    const ids = GAMES.categories.map(cat=>{
      const g = GAMES.byCategory(cat);
      return g[Math.floor(Math.random()*g.length)].id;
    });
    session = {mode:'classic', ids, idx:0, rounds:[], startLevel:0};
    roundIntro();
  }
  function startPro(){
    const pool = GAMES.list.map(g=>g.id);
    const ids = [];
    while(ids.length<6){
      const c = pool[Math.floor(Math.random()*pool.length)];
      if(!ids.includes(c)) ids.push(c);
    }
    session = {mode:'pro', ids, idx:0, rounds:[], startLevel:3};
    roundIntro();
  }
  function startPractice(id){
    session = {mode:'practice', ids:[id], idx:0, rounds:[], startLevel:0};
    roundIntro();
  }

  function gameBG(cat){
    const [c1,c2] = CAT_BG[cat];
    const glyphCol = 'rgba(255,255,255,.5)';
    let wm = '';
    if(cat==='analyse'){
      wm = `<g opacity=".35">${gearWM(210,210,190)}${gearWM(560,520,120)}</g>
            <path d="M240 560 L420 380 L780 120" stroke="#fff" stroke-width="90" opacity=".28" fill="none" stroke-linecap="round"/>
            <path d="M240 560 L420 380" stroke="#fff" stroke-width="90" opacity=".2" fill="none" stroke-linecap="round"/>`;
    } else if(cat==='calculate'){
      wm = `<text x="180" y="360" font-family="Comic Sans MS,cursive" font-weight="bold" font-size="300" fill="${glyphCol}" opacity=".5" transform="rotate(-12 180 360)">123</text>
            <text x="560" y="620" font-family="Comic Sans MS,cursive" font-weight="bold" font-size="170" fill="${glyphCol}" opacity=".4" transform="rotate(8 560 620)">+ =</text>`;
    } else if(cat==='memorise'){
      wm = `<rect x="90" y="60" width="560" height="600" rx="20" fill="#fff" opacity=".22" transform="rotate(-9 370 360)"/>
            <path d="M300 560 L430 420 L760 150" stroke="#fff" stroke-width="80" opacity=".3" fill="none" stroke-linecap="round"/>`;
    } else {
      wm = `<ellipse cx="330" cy="300" rx="330" ry="280" fill="#fff" opacity=".22"/>
            <ellipse cx="330" cy="300" rx="210" ry="180" fill="#a0c0dc" opacity=".35"/>
            <path d="M-40 620 Q400 480 1060 300 M-40 700 Q460 560 1060 400" stroke="#fff" stroke-width="26" opacity=".4" fill="none"/>`;
    }
    return `<div style="position:absolute;inset:0;background:linear-gradient(160deg,${c1},${c2});"></div>
      <svg style="position:absolute;inset:0;" width="1024" height="768" viewBox="0 0 1024 768">${wm}</svg>`;
  }
  function gearWM(cx,cy,r){
    let t='';
    for(let i=0;i<9;i++){
      t+=`<rect x="${cx-r*0.14}" y="${cy-r*1.18}" width="${r*0.28}" height="${r*0.36}" rx="${r*0.06}" fill="#fff" transform="rotate(${i*40} ${cx} ${cy})"/>`;
    }
    return t+`<circle cx="${cx}" cy="${cy}" r="${r*0.92}" fill="#fff"/>`;
  }

  /* context factory for games */
  function makeCtx(field, game, opts){
    const timers=new Set(), intervals=new Set(), keyFns=[];
    let rafId=null, alive=true, correct=0;
    const ctx = {
      preview: !!opts.preview,
      get level(){ return (opts.startLevel||0) + correct; },
      after(ms,fn){ if(!alive) return; const t=setTimeout(()=>{timers.delete(t); if(alive) fn();},ms); timers.add(t); return t; },
      every(ms,fn){ if(!alive) return; const t=setInterval(()=>{ if(alive) fn(); },ms); intervals.add(t); return t; },
      raf(fn){
        const loop=()=>{ if(!alive) return; fn(); rafId=requestAnimationFrame(loop); };
        rafId=requestAnimationFrame(loop);
      },
      onKey(fn){ if(opts.preview) return; keyFns.push(fn); activeKeyHandlers.push(fn); },
      award(ok,x,y){
        if(!alive || opts.preview) return;
        if(ok){ correct++; }
        const delta = ok? game.plus : -game.minus;
        opts.onScore && opts.onScore(delta, ok);
        showFeedback(ok, x, y, delta);
      },
      destroy(){
        alive=false;
        timers.forEach(clearTimeout); intervals.forEach(clearInterval);
        if(rafId) cancelAnimationFrame(rafId);
        keyFns.forEach(fn=>{
          const i=activeKeyHandlers.indexOf(fn);
          if(i>=0) activeKeyHandlers.splice(i,1);
        });
      },
      get alive(){ return alive; }
    };
    return ctx;
  }

  function showFeedback(ok,x,y,delta){
    x = x==null? 380 : x; y = y==null? 360 : y;
    const m = document.createElement('div');
    m.className='feedback-mark';
    m.style.left=(x-45)+'px'; m.style.top=(y-45)+'px';
    m.innerHTML = ok
      ? `<svg viewBox="0 0 100 100" width="90"><circle cx="50" cy="50" r="46" fill="#4caf50" opacity=".92"/><path d="M28 52 L44 68 L74 32" stroke="#fff" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`
      : `<svg viewBox="0 0 100 100" width="90"><circle cx="50" cy="50" r="46" fill="#d43f51" opacity=".92"/><path d="M32 32 L68 68 M68 32 L32 68" stroke="#fff" stroke-width="12" stroke-linecap="round"/></svg>`;
    $overlay.appendChild(m);
    setTimeout(()=>m.remove(),600);
    const f = document.createElement('div');
    f.className='score-float '+(ok?'plus':'minus');
    f.style.left=(x-30)+'px'; f.style.top=(y-110)+'px';
    f.textContent = (delta>0?'+':'−')+Math.abs(delta);
    $overlay.appendChild(f);
    setTimeout(()=>f.remove(),1050);
    ok? SFX.correct() : SFX.wrong();
  }

  /* ---------- round intro ---------- */
  function roundIntro(){
    clearAll();
    const game = GAMES.byId(session.ids[session.idx]);
    $screen.innerHTML = gameBG(game.category);
    // riser strip at bottom during intro
    el($screen,'div',null,{position:'absolute',inset:'0',pointerEvents:'none'}, risers([
      {type:'stripe',top:648,h:30},{type:'riser',top:678,h:60},{type:'stripe',top:738,h:30}
    ]));
    const field = el($screen,'div','play-field');
    // run the actual game as a living preview
    const pctx = makeCtx(field, game, {preview:true, startLevel:session.startLevel});
    try{ game.start(field, pctx); }catch(e){ console.error(e); }
    // input blocker over the field
    el($screen,'div',null,{position:'absolute',inset:'0',zIndex:'5',background:'transparent'});

    quitButton(()=>{ pctx.destroy(); endToMenu(); });

    showHost({pose:'desk',face:'open',x:880,y:390,w:330,
      podium:{x:900,y:640,w:330}, podiumInFront:true});
    speech('<b>'+game.instructions+'</b>',{x:664,y:92,w:330,tailRight:true,fs:20});

    const chk = el($screen,'button','check-btn',{left:'560px',top:'620px',zIndex:'6'});
    chk.innerHTML = ART.checkMark(58);
    chk.addEventListener('click',()=>{
      SFX.pop();
      pctx.destroy();
      startRoundPlay(game);
    });
  }

  /* ---------- countdown + play ---------- */
  function startRoundPlay(game){
    clearAll();
    $screen.innerHTML = gameBG(game.category);
    const field = el($screen,'div','play-field');
    field.style.pointerEvents='none';

    quitButton(()=>{ if(currentCtx) currentCtx.destroy(); stopTimer(); endToMenu(); });

    let roundScore = 0;
    const ctx = makeCtx(field, game, {
      startLevel: session.startLevel,
      onScore: d=>{ roundScore += d; }
    });
    currentCtx = ctx;

    // countdown
    let n=3;
    const doCount = ()=>{
      if(n>0){
        SFX.count();
        const c = el($overlay,'div','countdown-num',null,String(n));
        setTimeout(()=>c.remove(),820);
        n--; setTimeout(doCount, 830);
      } else {
        SFX.go();
        const c = el($overlay,'div','countdown-num',{fontSize:'150px',color:'#ffd83d'},'GO!');
        setTimeout(()=>c.remove(),700);
        field.style.pointerEvents='auto';
        try{ game.start(field, ctx); }catch(e){ console.error(e); }
        startTimer();
      }
    };
    doCount();

    /* timer */
    let remain = ROUND_SECONDS, timerInt=null;
    const tEl = el($screen,'div','round-timer');
    const pie = el(tEl,'div','pie');
    const num = el(tEl,'div','t-num',null,String(remain));
    tEl.style.display='none';
    function paint(){
      const elapsed = ROUND_SECONDS-remain;
      const deg = (elapsed/ROUND_SECONDS)*360;
      pie.style.background = `conic-gradient(#e03b3b ${deg}deg, transparent ${deg}deg)`;
      num.textContent = remain;
      if(remain<=10) tEl.classList.add('hurry');
    }
    function startTimer(){
      tEl.style.display='flex';
      paint();
      timerInt = setInterval(()=>{
        remain--;
        if(remain<=10 && remain>0) SFX.tick();
        if(remain<=0){ paint(); stopTimer(); timeUp(); return; }
        paint();
      },1000);
    }
    function stopTimer(){ if(timerInt){ clearInterval(timerInt); timerInt=null; } }

    function timeUp(){
      ctx.destroy(); currentCtx=null;
      field.style.pointerEvents='none';
      SFX.timeup();
      const b = el($overlay,'div','big-banner bubble-label',null,"TIME'S UP!");
      session.rounds.push({game, score:roundScore});
      setTimeout(()=>{
        b.remove();
        session.idx++;
        if(session.idx < session.ids.length) roundIntro();
        else resultsScreen();
      },1700);
    }
  }

  function endToMenu(){
    currentCtx=null; session=null;
    menuScreen();
  }

  /* ============================================================
     RESULTS
     ============================================================ */
  function resultsScreen(){
    clearAll();
    stageScenery();
    $screen.innerHTML = `<div style="position:absolute;inset:0;">${''}</div>`;
    el($screen,'div',null,{position:'absolute',inset:'0',pointerEvents:'none'}, MENU_RISERS);
    topChrome();

    const s = store.load();
    const total = Math.max(0, session.rounds.reduce((a,r)=>a+r.score,0));
    const isPractice = session.mode==='practice';

    // update stats
    s.gamesPlayed++;
    s.played = s.played||{};
    session.rounds.forEach(r=>{
      s.played[r.game.id]=true;
      s.bestRound = Math.max(s.bestRound||0, r.score);
      if(!isPractice) s.catBest[r.game.category] = Math.max(s.catBest[r.game.category]||0, r.score);
    });
    let newBest=false;
    if(!isPractice && total>s.best){ s.best=total; newBest=true; }
    const before = new Set(s.trophies||[]);
    s.trophies = TROPHIES.filter(t=>t.test(s)).map(t=>t.id);
    const newTrophies = TROPHIES.filter(t=>s.trophies.includes(t.id)&&!before.has(t.id));
    store.save();

    const panel = el($screen,'div','results-panel');
    el(panel,'div','bubble-label',{fontSize:'40px'}, isPractice?'PRACTICE RESULT':'YOUR BRAIN SIZE');
    const brainRow = el(panel,'div',null,{display:'flex',alignItems:'center',justifyContent:'center',gap:'20px'});
    const scaleF = Math.max(.55, Math.min(1.25, 0.55 + total/3000));
    const bWrap = el(brainRow,'div',null,{width:'190px',height:'150px',display:'flex',alignItems:'center',justifyContent:'center'});
    bWrap.innerHTML = `<div style="transform:scale(${scaleF});transition:transform 1s cubic-bezier(.34,1.56,.64,1);">${ART.brain(170)}</div>`;
    const numDiv = el(brainRow,'div');
    el(numDiv,'div','brain-size-num',null,'0');
    el(numDiv,'div',null,{fontFamily:'var(--font-bold)',fontWeight:'bold',fontSize:'22px',color:'#555'},'cm&sup3;');
    if(newBest) el(numDiv,'div','bubble-label',{fontSize:'22px'},'NEW BEST!');

    // animate count-up
    const numEl = numDiv.firstChild;
    const t0 = performance.now();
    (function count(){
      const p = Math.min(1,(performance.now()-t0)/1200);
      numEl.textContent = Math.round(total*(0.5-Math.cos(p*Math.PI)/2));
      if(p<1) requestAnimationFrame(count);
    })();
    SFX.fanfare();

    const list = el(panel,'div','inner-card');
    session.rounds.forEach(r=>{
      el(list,'div','round-row',null,
        `<span>${r.game.name} <span style="color:#888;font-size:15px;">(${GAMES.catNames[r.game.category]})</span></span><span>${r.score} pts</span>`);
    });
    if(newTrophies.length){
      const tr = el(panel,'div',null,{marginTop:'10px',display:'flex',justifyContent:'center',gap:'14px',alignItems:'center'});
      newTrophies.forEach(t=>{
        el(tr,'div',null,{display:'flex',alignItems:'center',gap:'6px',background:'#fdf3cd',
          borderRadius:'10px',padding:'4px 10px',fontFamily:'var(--font-bold)',fontWeight:'bold',fontSize:'15px'},
          ART.iconTrophy(30)+' '+t.name+'!');
      });
      SFX.trophy();
    }
    const btns = el(panel,'div',null,{marginTop:'16px'});
    const again = el(btns,'button','pill-btn green',null,'PLAY AGAIN');
    again.addEventListener('click',()=>{
      SFX.pop();
      if(session.mode==='classic') startClassic();
      else if(session.mode==='pro') startPro();
      else startPractice(session.ids[0]);
    });
    const menu = el(btns,'button','pill-btn blue',null,'MENU');
    menu.addEventListener('click',()=>{ SFX.click(); endToMenu(); });

    showHost({pose:'arms-up',face:'happy',x:800,y:400,w:270,bounce:true});
  }

  /* ============================================================
     TROPHIES & PROFILE
     ============================================================ */
  function trophyScreen(){
    clearAll();
    stageScenery();
    el($screen,'div',null,{position:'absolute',inset:'0',pointerEvents:'none'}, MENU_RISERS);
    topChrome();
    backButton(menuScreen);
    const s = store.load();
    const panel = el($screen,'div','results-panel',{width:'720px',top:'46%'});
    el(panel,'div','bubble-label',{fontSize:'42px'},'TROPHIES');
    const grid = el(panel,'div','trophy-grid');
    TROPHIES.forEach(t=>{
      const got = (s.trophies||[]).includes(t.id);
      const c = el(grid,'div','trophy-cell'+(got?'':' locked'));
      c.innerHTML = ART.iconTrophy(54)+`<div class="t-name">${t.name}</div><div class="t-req">${t.req}</div>`;
    });
    showHost({pose:'wave',face:(s.trophies||[]).length?'happy':'open',x:840,y:430,w:250});
  }

  function profileScreen(){
    clearAll();
    stageScenery();
    el($screen,'div',null,{position:'absolute',inset:'0',pointerEvents:'none'}, MENU_RISERS);
    topChrome();
    backButton(menuScreen);
    const s = store.load();
    const panel = el($screen,'div','results-panel',{width:'620px'});
    el(panel,'div','bubble-label',{fontSize:'42px'},'PROFILE');
    const row = el(panel,'div',null,{display:'flex',alignItems:'center',justifyContent:'center',gap:'24px'});
    const scaleF = Math.max(.55, Math.min(1.25, 0.55 + (s.best||0)/3000));
    row.innerHTML = `<div style="width:170px;height:140px;display:flex;align-items:center;justify-content:center;">
        <div style="transform:scale(${scaleF});">${ART.brain(150)}</div></div>
      <div><div class="brain-size-num">${s.best||0}</div>
      <div style="font-family:var(--font-bold);font-weight:bold;font-size:20px;color:#555;">best brain (cm&sup3;)</div></div>`;
    const card = el(panel,'div','inner-card');
    el(card,'div','stat-row',null,`<span>Games played</span><span>${s.gamesPlayed||0}</span>`);
    el(card,'div','stat-row',null,`<span>Trophies earned</span><span>${(s.trophies||[]).length} / ${TROPHIES.length}</span>`);
    GAMES.categories.forEach(cat=>{
      el(card,'div','stat-row',null,
        `<span>Best ${GAMES.catNames[cat]} round</span><span>${s.catBest[cat]||0} pts</span>`);
    });
    showHost({pose:'desk',face:'open',x:840,y:430,w:250});
  }

  /* ---------- boot ---------- */
  menuScreen();
})();
