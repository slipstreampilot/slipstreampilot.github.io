/* ============================================================
   Shell: screens, exercise flow, stopwatch, grades, brain age
   check, records & stamps.
   ============================================================ */
(function(){
  const $L=document.getElementById('panel-left');
  const $R=document.getElementById('panel-right');
  const $OV=document.getElementById('overlay-layer');
  const $stage=document.getElementById('stage');

  /* ---------- scaling ---------- */
  function rescale(){
    const s=Math.min(window.innerWidth/1180, window.innerHeight/710);
    $stage.style.transform='scale('+Math.min(s,1.25)+')';
  }
  window.addEventListener('resize',rescale);
  window.addEventListener('orientationchange',()=>{setTimeout(rescale,80);setTimeout(rescale,350);});
  if(window.visualViewport)window.visualViewport.addEventListener('resize',rescale);
  rescale();
  const hint=document.getElementById('rotate-hint');
  if(hint)hint.addEventListener('click',()=>hint.remove());
  document.addEventListener('pointerdown',()=>SFX.unlock(),{once:true});

  /* ---------- persistence ---------- */
  const store=(function(){
    let mem=null; const KEY='brain_age_recreation_save';
    function load(){
      if(mem)return mem;
      try{mem=JSON.parse(localStorage.getItem(KEY))||null;}catch(e){mem=null;}
      if(!mem)mem={bests:{}, ages:[], stamps:{}};
      return mem;
    }
    function save(){ try{localStorage.setItem(KEY,JSON.stringify(mem));}catch(e){} }
    return {load,save};
  })();
  const todayKey=()=>{
    const d=new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  };

  /* ---------- helpers ---------- */
  function el(p,tag,cls,css,html){
    const e=document.createElement(tag);
    if(cls)e.className=cls;
    if(css)Object.assign(e.style,css);
    if(html!=null)e.innerHTML=html;
    p.appendChild(e);
    return e;
  }
  function clearPanels(){ $L.innerHTML=''; $R.innerHTML=''; $OV.innerHTML=''; }
  function timeStr(ms){
    const s=Math.max(0,ms)/1000;
    const m=Math.floor(s/60);
    const sec=(s-m*60);
    return m+':'+(sec<10?'0':'')+sec.toFixed(1);
  }

  let keyHandlers=[];
  document.addEventListener('keydown',e=>keyHandlers.forEach(f=>f(e)));

  function muteBtn(panel){
    const b=el(panel,'button','mute-link',null,SFX.isMuted()?'sound: off':'sound: on');
    b.addEventListener('click',()=>{
      SFX.setMuted(!SFX.isMuted());
      b.textContent=SFX.isMuted()?'sound: off':'sound: on';
    });
  }
  function backBtn(panel,fn,label){
    const b=el(panel,'button','back-link',null,'&larr; '+(label||'back'));
    b.addEventListener('click',()=>{SFX.tap();fn();});
  }

  /* ---------- grades ---------- */
  const GRADE_ORDER=['Rocket','Jet','Train','Car','Bicycle','Walking'];
  const TIME_GRADES={
    calc20:[25,40,60,90,130],
    calc100:[130,190,270,380,520],
    triangle:[45,70,100,140,200],
    timelapse:[55,85,120,170,240],
    sudoku:[300,480,720,1080,1500]
  };
  function gradeFor(ex,res){
    if(ex.gradeThresholds){
      for(let i=0;i<ex.gradeThresholds.length;i++)
        if(res.score>=ex.gradeThresholds[i]) return GRADE_ORDER[i];
      return 'Walking';
    }
    if(ex.metric.type==='time'){
      const t=res.ms/1000, th=TIME_GRADES[ex.id]||[60,90,120,180,240];
      for(let i=0;i<5;i++) if(t<th[i]) return GRADE_ORDER[i];
      return 'Walking';
    } else {
      const frac=res.score/ex.metric.outOf;
      if(frac>=1)return 'Rocket';
      if(frac>=0.85)return 'Jet';
      if(frac>=0.7)return 'Train';
      if(frac>=0.55)return 'Car';
      if(frac>=0.4)return 'Bicycle';
      return 'Walking';
    }
  }
  const GRADE_SPEED={Rocket:'Rocket speed!',Jet:'Jet speed!',Train:'Train speed.',Car:'Car speed.',Bicycle:'Bicycle speed.',Walking:'Walking speed.'};

  /* ---------- professor panel ---------- */
  function professorSay(panel,mood,text,extraTopPad){
    const wrap=el(panel,'div','panel-pad center-col',{paddingTop:(extraTopPad||64)+'px'});
    const pw=el(wrap,'div','prof-wrap');
    el(pw,'div',null,null,ART.professor(mood,200));
    el(pw,'div','prof-say',null,text);
    return wrap;
  }

  /* ---------- feedback ---------- */
  function mark(ok,x,y){
    const m=el($OV,'div','fb-mark',{left:(($R.offsetLeft||606)+x-35)+'px',top:(34+y-35)+'px'});
    m.innerHTML=ok?ART.check(78):ART.wrongX(72);
    setTimeout(()=>m.remove(),520);
    ok?SFX.correct():SFX.wrong();
  }

  /* ---------- exercise context ---------- */
  function makeCtx(opts){
    const timers=new Set(), intervals=new Set(); let rafId=null, alive=true;
    const myKeys=[];
    const ctx={
      after(ms,fn){ if(!alive)return; const t=setTimeout(()=>{timers.delete(t);if(alive)fn();},ms); timers.add(t); },
      every(ms,fn){ if(!alive)return; const t=setInterval(()=>{if(alive)fn();},ms); intervals.add(t); },
      raf(fn){ const loop=()=>{ if(!alive)return; fn(); rafId=requestAnimationFrame(loop); }; rafId=requestAnimationFrame(loop); },
      onKey(fn){ myKeys.push(fn); keyHandlers.push(fn); },
      destroy(){
        alive=false;
        timers.forEach(clearTimeout); intervals.forEach(clearInterval);
        if(rafId)cancelAnimationFrame(rafId);
        myKeys.forEach(fn=>{const i=keyHandlers.indexOf(fn);if(i>=0)keyHandlers.splice(i,1);});
      },
      get alive(){return alive;},
      mark, progress:opts.progress||(()=>{}), setStatus:opts.setStatus||(()=>{}),
      elapsed:opts.elapsed||(()=>0), addPenalty:opts.addPenalty||(()=>{}),
      finish:opts.finish||(()=>{})
    };
    return ctx;
  }

  /* ============================================================
     TITLE
     ============================================================ */
  function titleScreen(){
    clearPanels();
    const wrap=professorSay($L,'happy',
      "Welcome! I'm your training guide. A few minutes of daily exercise keeps the mind sharp. Shall we begin?");
    el(wrap,'div',null,{marginTop:'18px'},ART.pencil(150));
    el(wrap,'div','small-label',{marginTop:'20px'},'a fan-made tribute &middot; original game &copy; Nintendo');
    muteBtn($L);

    const r=el($R,'div','panel-pad center-col');
    el(r,'div','title-serif',{fontSize:'44px',marginTop:'6px'},'BRAIN');
    el(r,'div','title-serif',{fontSize:'44px',marginTop:'-10px',marginBottom:'4px'},'TRAINING');
    el(r,'div','small-label',{marginBottom:'22px'},'minutes a day');
    const menu=el(r,'div','menu-list');
    const s=store.load();
    const lastAge=s.ages.length?s.ages[s.ages.length-1].age:null;
    const items=[
      ['Brain Age Check', lastAge?('last result: '+lastAge):'measure your brain age', checkIntro],
      ['Training','daily exercises', trainingMenu],
      ['Sudoku','number placement puzzles', ()=>exerciseIntro(EXERCISES.byId('sudoku'))],
      ['Records','bests, history & stamps', recordsScreen]
    ];
    items.forEach(([t,sub,fn])=>{
      const b=el(menu,'button','flat-btn',null,t+'<span class="sub">'+sub+'</span>');
      b.addEventListener('click',()=>{SFX.tap();fn();});
    });
  }

  /* ============================================================
     TRAINING MENU
     ============================================================ */
  function trainingMenu(){
    clearPanels();
    backBtn($L,titleScreen);
    const s=store.load();
    professorSay($L,'neutral',
      'Pick an exercise. Your best result is kept for each one — try to beat it! One exercise a day earns a stamp on the calendar.');
    muteBtn($L);

    const r=el($R,'div','panel-pad');
    el(r,'div','title-serif',{fontSize:'26px',textAlign:'center',marginBottom:'14px'},'Training');
    const menu=el(r,'div','menu-list');
    EXERCISES.list.filter(e=>e.id!=='sudoku').forEach(ex=>{
      const best=s.bests[ex.id];
      const sub=best
        ? (ex.metric.type==='time'? 'best: '+timeStr(best.ms)+' — '+best.grade : 'best: '+best.score+'/'+ex.metric.outOf+' — '+best.grade)
        : ex.blurb;
      const b=el(menu,'button','flat-btn',null,ex.name+'<span class="sub">'+sub+'</span>');
      b.addEventListener('click',()=>{SFX.tap();exerciseIntro(ex);});
    });
  }

  /* ============================================================
     EXERCISE INTRO
     ============================================================ */
  function exerciseIntro(ex, checkFlow){
    clearPanels();
    backBtn($L, checkFlow? titleScreen : (ex.id==='sudoku'? titleScreen : trainingMenu));
    professorSay($L,'think','<b>'+ex.name+'</b><br><br>'+ex.rules);
    muteBtn($L);

    const s=store.load();
    const r=el($R,'div','panel-pad center-col',{paddingTop:'90px'});
    el(r,'div','title-serif',{fontSize:'30px',marginBottom:'8px'},ex.name);
    const best=s.bests[ex.id];
    if(best){
      el(r,'div',null,{fontSize:'17px',color:'#5a5850',marginBottom:'20px'},
        'Best: <b>'+(ex.metric.type==='time'? timeStr(best.ms) : best.score+'/'+ex.metric.outOf)+'</b> ('+best.grade+')');
    } else {
      el(r,'div',null,{fontSize:'17px',color:'#5a5850',marginBottom:'20px'},'No record yet.');
    }
    if(ex.hasDifficulty){
      ['easy','medium','hard'].forEach(d=>{
        const b=el(r,'button','flat-btn',{width:'240px',marginTop:'12px'},d[0].toUpperCase()+d.slice(1));
        b.addEventListener('click',()=>{SFX.tap();runExercise(ex,null,d);});
      });
    } else {
      const b=el(r,'button','flat-btn',{width:'240px',marginTop:'16px'},'Begin');
      b.addEventListener('click',()=>{SFX.tap();runExercise(ex, checkFlow);});
    }
  }

  /* ============================================================
     RUN EXERCISE
     ============================================================ */
  let currentCtx=null;
  function runExercise(ex, checkFlow, difficulty){
    clearPanels();
    // left status panel
    const lp=el($L,'div','panel-pad',{paddingTop:'52px'});
    const head=el(lp,'div','status-head');
    const watch=el(head,'div','stopwatch',null,'0:00.0');
    const prog=el(head,'div','progress-count',null,'');
    el(lp,'div','divider');
    const status=el(lp,'div',null,{fontSize:'17px',lineHeight:'1.5',color:'#5a5850'},ex.blurb);
    let leftArea=null;
    if(ex.usesLeftPanel){
      leftArea=el($L,'div',null,{position:'absolute',top:'152px',left:'0',right:'0',bottom:'0'});
    } else {
      const profSmall=el(lp,'div',null,{position:'absolute',bottom:'20px',left:'0',right:'0',textAlign:'center'});
      profSmall.innerHTML=ART.professor('neutral',120);
    }
    backBtn($L,()=>{ if(currentCtx)currentCtx.destroy(); stop=true; checkFlow? titleScreen(): (ex.id==='sudoku'? titleScreen(): trainingMenu()); },'quit');

    let t0=null, penalty=0, stop=false, errors=0;
    const ctx=makeCtx({
      progress(n,total){ prog.textContent=n+'/'+total; },
      setStatus(h){ status.innerHTML=h; },
      elapsed(){ return t0? performance.now()-t0+penalty : 0; },
      addPenalty(ms){ penalty+=ms; },
      finish(extra){ endExercise(extra||{}); }
    });
    ctx.leftArea=leftArea;
    currentCtx=ctx;
    const origMark=ctx.mark;
    ctx.mark=(ok,x,y)=>{ if(!ok)errors++; origMark(ok,x,y); };

    // countdown then start
    let n=3;
    (function count(){
      if(stop)return;
      if(n>0){
        SFX.count();
        const c=el($OV,'div','count-num',null,String(n));
        setTimeout(()=>c.remove(),780);
        n--; setTimeout(count,800);
      } else {
        SFX.go();
        const c=el($OV,'div','count-num',{fontSize:'110px'},'Begin!');
        setTimeout(()=>c.remove(),650);
        t0=performance.now();
        ctx.every(100,()=>{ watch.textContent=timeStr(ctx.elapsed()); });
        try{ ex.start($R,$L,ctx,difficulty); }catch(e){ console.error(e); }
      }
    })();

    function endExercise(extra){
      const ms=ctx.elapsed();
      ctx.destroy(); currentCtx=null;
      SFX.done();
      const res={ms, score:extra.score, errors};
      const grade=gradeFor(ex,res);
      // save best + stamp
      const s=store.load();
      const prev=s.bests[ex.id];
      let isBest=false;
      if(ex.metric.type==='time'){
        if(!prev||ms<prev.ms){ s.bests[ex.id]={ms,grade,date:todayKey()}; isBest=true; }
      } else {
        if(!prev||extra.score>prev.score){ s.bests[ex.id]={score:extra.score,grade,date:todayKey()}; isBest=true; }
      }
      s.stamps[todayKey()]=(s.stamps[todayKey()]||0)+1;
      store.save();
      if(checkFlow){ checkFlow({ms,score:extra.score,errors,stats:extra.stats}); return; }
      resultsScreen(ex,res,grade,isBest,extra,difficulty);
    }
  }

  function resultsScreen(ex,res,grade,isBest,extra,difficulty){
    clearPanels();
    const comments={
      Rocket:"Outstanding! Your prefrontal cortex is in top form!",
      Jet:"Excellent work! You're flying through these.",
      Train:"Good, steady progress. Keep training daily!",
      Car:"A solid effort. A little practice every day works wonders.",
      Bicycle:"Nice and steady. You'll speed up with practice.",
      Walking:"Everyone starts somewhere — try this one again tomorrow!"
    };
    professorSay($L, grade==='Rocket'||grade==='Jet'?'happy':'neutral', comments[grade]||'');
    muteBtn($L);

    const r=el($R,'div','panel-pad center-col',{paddingTop:'56px'});
    el(r,'div','title-serif',{fontSize:'24px'},ex.name);
    if(ex.metric.type==='time'){
      el(r,'div','result-big',null,timeStr(res.ms));
      el(r,'div','small-label',null,'time'+(res.errors?(' &middot; '+res.errors+' error'+(res.errors>1?'s':'')):''));
    } else {
      el(r,'div','result-big',null,res.score+' / '+ex.metric.outOf);
      el(r,'div','small-label',null,ex.scoreLabel||'correct');
    }
    if(extra&&extra.extra) el(r,'div',null,{fontSize:'16px',color:'#5a5850',marginTop:'6px'},extra.extra);
    const gr=el(r,'div',null,{display:'flex',alignItems:'center',gap:'10px',marginTop:'16px'});
    gr.innerHTML=ART.gradeIcon(grade,52)+'<span class="result-grade">'+GRADE_SPEED[grade]+'</span>';
    if(isBest) el(r,'div','best-note',{marginTop:'10px'},'&#9733; New personal best!');
    el(r,'div',null,{marginTop:'8px'},ART.stamp(40));
    el(r,'div','small-label',null,'stamped for today');
    const row=el(r,'div',null,{display:'flex',gap:'14px',marginTop:'22px'});
    const again=el(row,'button','flat-btn small',null,'Try again');
    again.addEventListener('click',()=>{SFX.tap();runExercise(ex,null,difficulty);});
    const done=el(row,'button','flat-btn small',null,'Done');
    done.addEventListener('click',()=>{SFX.tap(); ex.id==='sudoku'? titleScreen() : trainingMenu();});
  }

  /* ============================================================
     BRAIN AGE CHECK
     ============================================================ */
  function checkIntro(){
    clearPanels();
    backBtn($L,titleScreen);
    professorSay($L,'think',
      "The <b>Brain Age Check</b> runs three quick tests: the Stroop test, twenty calculations, and number crunching. Work fast and accurately — then I'll estimate your brain age. The ideal is <b>20</b>.");
    muteBtn($L);
    const r=el($R,'div','panel-pad center-col',{paddingTop:'110px'});
    el(r,'div','title-serif',{fontSize:'30px',marginBottom:'6px'},'Brain Age Check');
    el(r,'div',null,{fontSize:'16px',color:'#5a5850',marginBottom:'26px',textAlign:'center'},
      '1. Stroop Test<br>2. Calculations &times; 20<br>3. Number Cruncher');
    const b=el(r,'button','flat-btn',{width:'240px'},'Start the check');
    b.addEventListener('click',()=>{SFX.tap();runCheck();});
  }

  function runCheck(){
    const tests=EXERCISES.checkTests;
    const results=[];
    let i=0;
    const nextTest=()=>{
      if(i>=tests.length){ checkResults(results); return; }
      const ex=tests[i];
      clearPanels();
      professorSay($L,'neutral','Test '+(i+1)+' of 3: <b>'+ex.name+'</b><br><br>'+ex.rules);
      muteBtn($L);
      const r=el($R,'div','panel-pad center-col',{paddingTop:'140px'});
      el(r,'div','title-serif',{fontSize:'26px',marginBottom:'20px'},ex.name);
      const b=el(r,'button','flat-btn',{width:'220px'},'Ready');
      b.addEventListener('click',()=>{
        SFX.tap();
        runExercise(ex,(res)=>{ results.push({ex,res}); i++; nextTest(); });
      });
    };
    nextTest();
  }

  function checkResults(results){
    // approximate formula (documented in NOTES.md)
    let age=20;
    results.forEach(({ex,res})=>{
      if(ex.id==='stroop'){
        const avg=res.stats?res.stats.avgMs:1400;
        age+=Math.max(0,(avg-750)/70);
        age+=(res.errors||0)*2.2;
      } else if(ex.id==='calc20'){
        age+=Math.max(0,(res.ms/1000-28)*0.55);
        age+=(res.errors||0)*1.6;
      } else if(ex.id==='cruncher'){
        age+=(8-(res.score||0))*2.6;
        age+=Math.max(0,(res.ms/1000-55)*0.18);
      }
    });
    age=Math.round(Math.max(20,Math.min(80,age)));
    const s=store.load();
    s.ages.push({date:todayKey(),age});
    store.save();

    clearPanels();
    const mood=age<=30?'happy':age<=50?'neutral':'think';
    const remark=age<=25?"Phenomenal! Your brain is as sharp as they come."
      :age<=35?"A fine result! Keep up the daily training."
      :age<=50?"Not bad at all — regular training will bring this down."
      :"There's plenty of room to improve. A little practice each day!";
    professorSay($L,mood,remark);
    muteBtn($L);
    const r=el($R,'div','panel-pad center-col',{paddingTop:'70px'});
    el(r,'div','small-label',null,'your brain age is');
    el(r,'div','serif-num',{fontSize:'150px',lineHeight:'1.05'},String(age));
    el(r,'div','small-label',{marginBottom:'14px'},'ideal: 20 &middot; range: 20&ndash;80');
    const list=el(r,'div',null,{width:'88%',marginTop:'6px'});
    results.forEach(({ex,res})=>{
      el(list,'div','rec-row',null,
        '<span>'+ex.name+'</span><span>'+
        (ex.metric.type==='time'? timeStr(res.ms) : res.score+'/'+ex.metric.outOf)+
        (res.errors?(' &middot; '+res.errors+' err'):'')+'</span>');
    });
    const b=el(r,'button','flat-btn small',{marginTop:'20px'},'Back to menu');
    b.addEventListener('click',()=>{SFX.tap();titleScreen();});
  }

  /* ============================================================
     RECORDS
     ============================================================ */
  function recordsScreen(){
    clearPanels();
    backBtn($L,titleScreen);
    const s=store.load();
    const lp=el($L,'div','panel-pad',{paddingTop:'52px'});
    el(lp,'div','title-serif',{fontSize:'24px',textAlign:'center',marginBottom:'10px'},'Personal Bests');
    const list=el(lp,'div');
    let any=false;
    EXERCISES.list.forEach(ex=>{
      const b=s.bests[ex.id]; if(!b)return; any=true;
      el(list,'div','rec-row',null,
        '<span>'+ex.name+'</span><span>'+
        (ex.metric.type==='time'? timeStr(b.ms) : b.score+'/'+ex.metric.outOf)+' &middot; '+b.grade+'</span>');
    });
    if(!any) el(list,'div',null,{color:'#5a5850',textAlign:'center',padding:'16px'},'No records yet — go train!');
    el(lp,'div','title-serif',{fontSize:'20px',textAlign:'center',margin:'18px 0 8px'},'Brain Age History');
    const ages=s.ages.slice(-6);
    if(!ages.length) el(lp,'div',null,{color:'#5a5850',textAlign:'center'},'Not checked yet.');
    else ages.forEach(a=>el(lp,'div','rec-row',null,'<span>'+a.date+'</span><span>'+a.age+'</span>'));
    muteBtn($L);

    // stamp calendar
    const r=el($R,'div','panel-pad',{paddingTop:'52px'});
    const now=new Date();
    const monthName=now.toLocaleString('en',{month:'long'});
    el(r,'div','title-serif',{fontSize:'24px',textAlign:'center',marginBottom:'14px'},
      monthName+' '+now.getFullYear());
    const cal=el(r,'div','stamp-cal');
    ['S','M','T','W','T','F','S'].forEach(d=>el(cal,'div',null,{textAlign:'center',fontWeight:'bold',
      fontSize:'13px',color:'#5a5850',display:'flex',alignItems:'center',justifyContent:'center'},d));
    const first=new Date(now.getFullYear(),now.getMonth(),1).getDay();
    const days=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
    for(let i=0;i<first;i++)el(cal,'div');
    for(let d=1;d<=days;d++){
      const key=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
      const cell=el(cal,'div','stamp-day',null,'<span style="position:absolute;top:2px;left:5px;">'+d+'</span>');
      const cnt=s.stamps[key]||0;
      if(cnt>0){
        const st=el(cell,'div','stamp');
        st.innerHTML=ART.stamp(cnt>=3?40:30,cnt>=3);
      }
    }
    el(r,'div','small-label',{textAlign:'center',marginTop:'14px'},
      'one exercise a day earns a stamp &middot; three make it bigger');
  }

  /* ---------- boot ---------- */
  titleScreen();
})();
