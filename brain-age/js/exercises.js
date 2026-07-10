/* ============================================================
   Exercises. Each: {id,name,blurb,rules,metric,start(right,left,ctx)}
   metric: {type:'time'} or {type:'score', outOf:N}
   ctx (from main.js): elapsed(), addPenalty(ms), progress(n,total),
     mark(ok,x,y), finish(extra), after/every/raf, onKey, destroy,
     setStatus(html)
   ============================================================ */
(function(){
  const rnd=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
  const pick=a=>a[rnd(0,a.length-1)];
  const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=rnd(0,i);[a[i],a[j]]=[a[j],a[i]];}return a;};
  function el(p,tag,cls,css,html){
    const e=document.createElement(tag);
    if(cls)e.className=cls;
    if(css)Object.assign(e.style,css);
    if(html!=null)e.innerHTML=html;
    p.appendChild(e);
    return e;
  }
  function scatter(n,x0,y0,x1,y1,minD){
    const pts=[];let g=0;
    while(pts.length<n&&g<5000){g++;
      const p={x:rnd(x0,x1),y:rnd(y0,y1)};
      if(pts.every(q=>Math.hypot(q.x-p.x,q.y-p.y)>=minD))pts.push(p);
    }
    while(pts.length<n)pts.push({x:rnd(x0,x1),y:rnd(y0,y1)});
    return pts;
  }

  /* ---------- shared keypad ----------
     modes: auto-length submit (ask) or staged fields (Time Lapse) */
  function buildKeypad(parent, ctx, opts){
    opts=opts||{};
    const wrap=el(parent,'div',null,{position:'absolute',left:'50%',bottom:'18px',transform:'translateX(-50%)',
      display:'flex',flexDirection:'column',alignItems:'center',gap:'4px'});
    const entry=el(wrap,'div','kp-entry');
    const pad=el(wrap,'div','keypad');
    const layout=[7,8,9,4,5,6,1,2,3];
    let buf='',expected=null,cb=null,checkCb=null;
    const keys={};
    layout.forEach(d=>{
      keys[d]=el(pad,'button','key',null,String(d));
      keys[d].addEventListener('click',()=>press(d));
    });
    const zero=el(pad,'button','key',null,'0'); keys[0]=zero;
    zero.addEventListener('click',()=>press(0));
    let okKey=null;
    if(opts.withCheck){
      okKey=el(pad,'button','key wide',null,'OK');
      okKey.addEventListener('click',()=>{ if(checkCb) checkCb(buf); });
    } else {
      const back=el(pad,'button','key wide',null,'&#9003;');
      back.addEventListener('click',()=>{ buf=buf.slice(0,-1); entry.textContent=buf; });
    }
    function press(d,fromKb){
      if(expected==null&&!checkCb)return;
      SFX.tap();
      const k=keys[d];
      if(k){k.classList.add('pressed');setTimeout(()=>k.classList.remove('pressed'),90);}
      if(buf.length>=3)return;
      buf+=String(d); entry.textContent=buf;
      if(expected!=null&&buf.length>=expected){
        const v=buf;
        setTimeout(()=>{ if(cb) cb(v); },90);
      }
    }
    ctx.onKey(e=>{
      if(/^[0-9]$/.test(e.key)) press(+e.key);
      else if(e.key==='Backspace'){ buf=buf.slice(0,-1); entry.textContent=buf; }
      else if(e.key==='Enter'&&checkCb) checkCb(buf);
    });
    return {
      ask(len,fn){ buf=''; entry.textContent=''; expected=len; cb=fn; checkCb=null; },
      stage(fn){ buf=''; entry.textContent=''; expected=null; cb=null; checkCb=fn; },
      setEntryLabel(t){ entry.textContent=t; },
      clear(){ buf=''; entry.textContent=''; },
      el:wrap
    };
  }

  /* ---------- calc generator (operands ≤ 9, per original) ---------- */
  function calcProblem(){
    const op=pick(['+','+','-','×']);
    let a=rnd(1,9),b=rnd(1,9);
    if(op==='-'&&b>a)[a,b]=[b,a];
    const ans=op==='+'?a+b:op==='-'?a-b:a*b;
    return {text:`${a} ${op==='-'?'−':op} ${b} =`, ans};
  }

  function calcExercise(id,name,total){
    return {
      id, name, metric:{type:'time'},
      blurb:`Solve ${total} calculations as fast as you can.`,
      rules:`Simple sums appear one at a time. Enter each answer on the keypad — it submits by itself. A wrong answer must be corrected before you move on. Speed and accuracy both matter!`,
      start(right,left,ctx){
        let n=0;
        const probEl=el(right,'div','problem',{position:'absolute',left:'0',right:'0',top:'120px'});
        const pad=buildKeypad(right,ctx,{});
        const next=()=>{
          if(n>=total){ ctx.finish(); return; }
          ctx.progress(n,total);
          const p=calcProblem();
          probEl.innerHTML=`${p.text} <span class="ans">&nbsp;</span>`;
          const ask=()=>pad.ask(String(p.ans).length,v=>{
            if(+v===p.ans){ ctx.mark(true,260,180); n++; next(); }
            else { ctx.mark(false,260,180); ask(); }
          });
          ask();
        };
        next();
      }
    };
  }

  /* ---------- Low to High ----------
     Faithful two-page version: memorise numbers in their boxes on the
     LEFT page (with a visible countdown), then the numbers vanish and
     the SAME box layout appears on the RIGHT page — touch low → high.
     4×4 grid, max 16 boxes; +1 box on success, −1 on miss.
     Values 1–9 until the board reaches 10 boxes, then 1–16. */
  const lowtohigh={
    id:'lowtohigh', name:'Low to High',
    metric:{type:'score', outOf:16},
    gradeThresholds:[12,10,8,6,5],
    scoreLabel:'numbers held',
    usesLeftPanel:true,
    blurb:'Memorise the numbers on the left page, then touch the boxes on the right page from lowest to highest.',
    rules:`Numbers appear in boxes on the LEFT page — memorise where each one is before the countdown runs out. They vanish, and the same boxes appear on the RIGHT page: touch them in order from LOWEST to HIGHEST. Succeed and the next round adds a box (up to a full 4×4 grid of 16); miss and it loses one. 8 rounds — how many numbers can you hold?`,
    start(right,left,ctx){
      const area=ctx.leftArea;
      const TRIALS=8;
      let trial=0, level=4, maxLevel=0, corrects=0;
      // tidy fixed arrangements per box count, matching the original's style:
      // 2×2, quincunx X, staircase, 2-3-2, 3-2-3, 3×3 … up to the full 4×4.
      // coordinates are [col,row] on a 4×4 grid; halves centre between cells.
      const LAYOUTS={
        3:[[0.5,1.5],[1.5,1.5],[2.5,1.5]],
        4:[[1,1],[2,1],[1,2],[2,2]],
        5:[[0.5,0.5],[2.5,0.5],[1.5,1.5],[0.5,2.5],[2.5,2.5]],
        6:[[2.5,0.5],[1.5,1.5],[2.5,1.5],[0.5,2.5],[1.5,2.5],[2.5,2.5]],
        7:[[1,0.5],[2,0.5],[0.5,1.5],[1.5,1.5],[2.5,1.5],[1,2.5],[2,2.5]],
        8:[[0.5,0.5],[1.5,0.5],[2.5,0.5],[1,1.5],[2,1.5],[0.5,2.5],[1.5,2.5],[2.5,2.5]],
        9:[[0.5,0.5],[1.5,0.5],[2.5,0.5],[0.5,1.5],[1.5,1.5],[2.5,1.5],[0.5,2.5],[1.5,2.5],[2.5,2.5]],
        10:[[0.5,0.5],[1.5,0.5],[2.5,0.5],[0,1.5],[1,1.5],[2,1.5],[3,1.5],[0.5,2.5],[1.5,2.5],[2.5,2.5]],
        11:[[0,0.5],[1,0.5],[2,0.5],[3,0.5],[0.5,1.5],[1.5,1.5],[2.5,1.5],[0,2.5],[1,2.5],[2,2.5],[3,2.5]],
        12:[[0,0.5],[1,0.5],[2,0.5],[3,0.5],[0,1.5],[1,1.5],[2,1.5],[3,1.5],[0,2.5],[1,2.5],[2,2.5],[3,2.5]],
        13:[[0,0],[1,0],[2,0],[3,0],[0,1],[1,1],[2,1],[3,1],[0,2],[1,2],[2,2],[3,2],[1.5,3]],
        14:[[0,0],[1,0],[2,0],[3,0],[0,1],[1,1],[2,1],[3,1],[0,2],[1,2],[2,2],[3,2],[1,3],[2,3]],
        15:[[0,0],[1,0],[2,0],[3,0],[0,1],[1,1],[2,1],[3,1],[0,2],[1,2],[2,2],[3,2],[0.5,3],[1.5,3],[2.5,3]],
        16:[[0,0],[1,0],[2,0],[3,0],[0,1],[1,1],[2,1],[3,1],[0,2],[1,2],[2,2],[3,2],[0,3],[1,3],[2,3],[3,3]]
      };
      const positionsFor=n=>LAYOUTS[n].map(([c,r])=>({x:64+c*104, y:18+r*100}));
      const runTrial=()=>{
        if(trial>=TRIALS){
          ctx.finish({score:maxLevel, extra:corrects+' of '+TRIALS+' rounds correct'});
          return;
        }
        ctx.progress(trial,TRIALS);
        ctx.setStatus('Boxes this round: <b>'+level+'</b>');
        area.innerHTML=''; right.innerHTML='';
        // circled trial number, at the same absolute height on both pages
        // (area sits 152px down inside the left panel, so subtract that)
        [[area,148],[right,300]].forEach(([p,top])=>{
          el(p,'div',null,{position:'absolute',left:'50%',top:top+'px',transform:'translate(-50%,-50%)',
            width:'110px',height:'110px',border:'7px solid #22221f',borderRadius:'50%',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontFamily:'var(--serif)',fontWeight:'bold',fontSize:'62px'},String(trial+1));
        });
        SFX.count();
        ctx.after(850,()=>{
          area.innerHTML=''; right.innerHTML='';
          // fixed tidy layout for this count; values assigned at random
          const pts=positionsFor(level);
          const hi=level>=10?16:9;
          const values=shuffle(Array.from({length:hi},(_,v)=>v+1)).slice(0,level);
          const sorted=values.slice().sort((a,b)=>a-b);
          // LEFT page: instruction strip + countdown + boxes with numbers
          const head=el(area,'div',null,{margin:'0 22px 8px',border:'2px solid #b5b2a8',background:'#eceade',
            padding:'0 12px',display:'flex',justifyContent:'space-between',alignItems:'center',
            height:'50px',overflow:'hidden'});   // fixed height: grid never shifts between phases
          const headTxt=el(head,'div',null,{fontSize:'17px',fontWeight:'bold'},'Memorise the numbers.');
          const cd=el(head,'div','serif-num',{fontSize:'36px',lineHeight:'50px',height:'50px'},'');
          const gridL=el(area,'div',null,{position:'relative',height:'420px'});
          const boxesL=pts.map((p,i)=>{
            return el(gridL,'div','num-box',{left:p.x+'px',top:p.y+'px',width:'82px',height:'82px',
              fontSize:'38px',cursor:'default'},String(values[i]));
          });
          let secs=Math.max(2,Math.ceil(level*0.5));
          cd.textContent=secs;
          ctx.every(1000,function tickDown(){
            if(secs<=0) return;
            secs--;
            if(secs>0){ cd.textContent=secs; SFX.tick(); }
            else if(secs===0){ cd.textContent=''; startAnswer(); secs=-1; }
          });
          function startAnswer(){
            headTxt.textContent='Touch #s from low to high.';
            boxesL.forEach(b=>{ b.textContent=''; });   // anchors stay, numbers vanish
            // mirror the left grid's exact panel-relative position so both
            // pages show the boxes at identical heights and columns
            const gridTop=152+gridL.offsetTop;
            const gridR=el(right,'div',null,{position:'absolute',left:'0',right:'0',top:gridTop+'px',height:'420px'});
            let idx=0, dead=false;
            const boxesR=pts.map((p,i)=>{
              const b=el(gridR,'button','num-box',{left:p.x+'px',top:p.y+'px',width:'82px',height:'82px',fontSize:'38px'});
              b.addEventListener('click',()=>{
                if(dead||b.classList.contains('cleared'))return;
                if(values[i]===sorted[idx]){
                  b.textContent=values[i]; b.classList.add('cleared');
                  SFX.tap(); idx++;
                  if(idx===level){
                    dead=true; corrects++;
                    maxLevel=Math.max(maxLevel,level);
                    ctx.mark(true,240,270);
                    level=Math.min(16,level+1);
                    trial++;
                    ctx.after(800,runTrial);
                  }
                } else {
                  dead=true;
                  ctx.mark(false,240,270);
                  boxesR.forEach((bb,j)=>{ bb.textContent=values[j]; }); // show what was where
                  level=Math.max(3,level-1);
                  trial++;
                  ctx.after(1300,runTrial);
                }
              });
              return b;
            });
          }
        });
      };
      runTrial();
    }
  };

  /* ---------- Head Count ---------- */
  const headcount={
    id:'headcount', name:'Head Count',
    metric:{type:'score', outOf:5},
    blurb:'Count the people going in and out of the house.',
    rules:`People walk into and out of the house. Keep a running count of how many are INSIDE. When they stop, enter the number on the keypad. 5 rounds, getting busier.`,
    start(right,left,ctx){
      let round=0, correct=0;
      const runRound=()=>{
        if(round>=5){ ctx.finish({score:correct}); return; }
        ctx.progress(round,5);
        right.innerHTML='';
        const scene=el(right,'div','hc-scene',{top:'30px'});
        el(scene,'div',null,{position:'absolute',left:'88px',top:'40px'},ART.house(300));
        const q=el(right,'div',null,{position:'absolute',left:'0',right:'0',top:'380px',textAlign:'center',
          fontSize:'22px',fontWeight:'bold',opacity:'0'},'How many people are in the house?');
        const pad=buildKeypad(right,ctx,{});
        pad.el.style.opacity='0';
        // build event sequence
        const events=[]; let inside=0;
        const evCount=5+round*2;
        for(let i=0;i<evCount;i++){
          let dir;
          if(inside===0) dir='in';
          else if(inside>=8) dir='out';
          else dir=Math.random()<0.58?'in':'out';
          events.push(dir);
          inside+=dir==='in'?1:-1;
        }
        const answer=inside;
        const evDur=Math.max(620,1050-round*90);
        events.forEach((dir,i)=>{
          ctx.after(400+i*(evDur+140),()=>{
            const fromLeft=Math.random()<0.5;
            const startX=dir==='in'?(fromLeft?-50:520):216;
            const endX=dir==='in'?216:(fromLeft?-50:520);
            const f=el(scene,'div','hc-fig',{left:startX+'px',top:'190px',transitionDuration:evDur+'ms'});
            f.innerHTML=ART.figure(42);
            SFX.tick();
            requestAnimationFrame(()=>requestAnimationFrame(()=>{ f.style.left=endX+'px'; }));
            ctx.after(evDur,()=>f.remove());
          });
        });
        ctx.after(400+evCount*(evDur+140)+300,()=>{
          q.style.opacity='1'; pad.el.style.opacity='1';
          const ask=()=>pad.ask(String(answer).length,v=>{
            const ok=+v===answer;
            ctx.mark(ok,230,240);
            if(ok)correct++; round++;
            ctx.after(600,runRound);
          });
          ask();
        });
      };
      runRound();
    }
  };

  /* ---------- Triangle Math ---------- */
  const triangle={
    id:'triangle', name:'Triangle Math',
    metric:{type:'time'},
    blurb:'Work the triangle down to a single answer.',
    rules:`Three numbers sit on top. Combine the outer pairs (left ○ = first two, right ○ = last two), then combine those two results with the bottom sign for the final answer. Only + and − are used. Enter just the final number. 10 problems.`,
    start(right,left,ctx){
      const total=10; let n=0;
      const area=el(right,'div',null,{position:'absolute',left:'0',right:'0',top:'46px',textAlign:'center'});
      const pad=buildKeypad(right,ctx,{});
      const next=()=>{
        if(n>=total){ ctx.finish(); return; }
        ctx.progress(n,total);
        let a,b,c,o1,o2,o3,d,e,f,guard=0;
        do{
          guard++;
          a=rnd(1,9);b=rnd(1,9);c=rnd(1,9);
          o1=pick(['+','-']);o2=pick(['+','-']);o3=pick(['+','-']);
          d=o1==='+'?a+b:a-b;
          e=o2==='+'?b+c:b-c;
          f=o3==='+'?d+e:d-e;
        }while((d<0||e<0||f<0||f>99)&&guard<400);
        const sym=o=>o==='-'?'−':o;
        area.innerHTML=`
          <div class="serif-num" style="font-size:54px;letter-spacing:2px;">
            ${a} <span style="font-size:38px;">${sym(o1)}</span> ${b} <span style="font-size:38px;">${sym(o2)}</span> ${c}
          </div>
          <svg viewBox="0 0 300 60" width="300" style="margin:-4px 0;">
            <path d="M60 6 L104 50 M150 6 L112 50 M150 6 L188 50 M240 6 L196 50" stroke="#b5b2a8" stroke-width="4" fill="none"/>
          </svg>
          <div class="serif-num" style="font-size:48px;display:flex;justify-content:center;align-items:center;gap:20px;">
            <span style="display:inline-flex;width:74px;height:74px;border:3px solid #22221f;border-radius:50%;align-items:center;justify-content:center;color:#b5b2a8;">?</span>
            <span style="font-size:38px;">${sym(o3)}</span>
            <span style="display:inline-flex;width:74px;height:74px;border:3px solid #22221f;border-radius:50%;align-items:center;justify-content:center;color:#b5b2a8;">?</span>
          </div>
          <svg viewBox="0 0 300 46" width="300" style="margin:-2px 0;">
            <path d="M110 4 L146 40 M190 4 L154 40" stroke="#b5b2a8" stroke-width="4" fill="none"/>
          </svg>
          <div class="serif-num" style="font-size:56px;"><span class="answer-line">&nbsp;</span></div>`;
        const ask=()=>pad.ask(String(f).length,v=>{
          if(+v===f){ ctx.mark(true,240,300); n++; next(); }
          else { ctx.mark(false,240,300); ask(); }
        });
        ask();
      };
      next();
    }
  };

  /* ---------- Time Lapse ---------- */
  const timelapse={
    id:'timelapse', name:'Time Lapse',
    metric:{type:'time'},
    blurb:'How much time has passed between the two clocks?',
    rules:`Two clocks are shown. Work out how much time passed from the LEFT clock to the RIGHT clock (always less than 12 hours). Enter the hours, press OK, then the minutes, and OK again. The right clock becomes the left clock of the next problem. 10 problems.`,
    start(right,left,ctx){
      const total=10; let n=0;
      let h1=rnd(0,11), m1=rnd(0,11)*5;
      const clockRow=el(right,'div','clock-row',{position:'absolute',left:'0',right:'0',top:'34px'});
      const qEl=el(right,'div',null,{position:'absolute',left:'0',right:'0',top:'250px',textAlign:'center',
        fontWeight:'bold',fontSize:'20px'});
      const pad=buildKeypad(right,ctx,{withCheck:true});
      const next=()=>{
        if(n>=total){ ctx.finish(); return; }
        ctx.progress(n,total);
        let dh=rnd(0,11), dm=rnd(0,11)*5;
        if(dh===0&&dm===0)dh=rnd(1,11);
        const t2=(h1*60+m1+dh*60+dm)%(12*60);
        const h2=Math.floor(t2/60), m2=t2%60;
        clockRow.innerHTML=`<div>${ART.clock(h1,m1,196)}</div>
          <div class="serif-num" style="font-size:44px;">&#8594;</div>
          <div>${ART.clock(h2,m2,196)}</div>`;
        let stage='h', H=null;
        qEl.innerHTML='Time passed: enter <b>HOURS</b>, then OK';
        pad.stage(buf=>{
          if(buf===''){ return; }
          if(stage==='h'){
            H=+buf; stage='m';
            qEl.innerHTML='Now enter <b>MINUTES</b>, then OK';
            pad.clear();
          } else {
            const M=+buf;
            if(H===dh&&M===dm){
              ctx.mark(true,240,300);
              h1=h2; m1=m2; n++;
              next();
            } else {
              ctx.mark(false,240,300);
              stage='h'; H=null;
              qEl.innerHTML='Not quite &mdash; enter <b>HOURS</b> again, then OK';
              pad.clear();
            }
          }
        });
      };
      next();
    }
  };

  /* ---------- Sudoku ---------- */
  function makeSolvedGrid(){
    // base pattern then shuffle digits/rows/cols/bands — always valid
    let g=[];
    for(let r=0;r<9;r++){g.push([]);for(let c=0;c<9;c++)g[r].push((r*3+Math.floor(r/3)+c)%9+1);}
    const digs=shuffle([1,2,3,4,5,6,7,8,9]);
    g=g.map(row=>row.map(v=>digs[v-1]));
    // swap rows within bands
    for(let band=0;band<3;band++){
      const ord=shuffle([0,1,2]);
      const rows=[g[band*3],g[band*3+1],g[band*3+2]];
      for(let i=0;i<3;i++)g[band*3+i]=rows[ord[i]];
    }
    // swap cols within stacks
    for(let st=0;st<3;st++){
      const ord=shuffle([0,1,2]);
      for(let r=0;r<9;r++){
        const cols=[g[r][st*3],g[r][st*3+1],g[r][st*3+2]];
        for(let i=0;i<3;i++)g[r][st*3+i]=cols[ord[i]];
      }
    }
    return g;
  }
  function countSolutions(grid,limit){
    // backtracking counter
    const g=grid.map(r=>r.slice());
    let count=0;
    function ok(r,c,v){
      for(let i=0;i<9;i++){
        if(g[r][i]===v||g[i][c]===v)return false;
      }
      const br=r-r%3, bc=c-c%3;
      for(let i=0;i<3;i++)for(let j=0;j<3;j++)if(g[br+i][bc+j]===v)return false;
      return true;
    }
    function solve(){
      if(count>=limit)return;
      for(let r=0;r<9;r++)for(let c=0;c<9;c++){
        if(g[r][c]===0){
          for(let v=1;v<=9;v++){
            if(ok(r,c,v)){ g[r][c]=v; solve(); g[r][c]=0; }
          }
          return;
        }
      }
      count++;
    }
    solve();
    return count;
  }
  function makePuzzle(removals){
    const sol=makeSolvedGrid();
    const puz=sol.map(r=>r.slice());
    const cells=shuffle([...Array(81).keys()]);
    let removed=0;
    for(const idx of cells){
      if(removed>=removals)break;
      const r=Math.floor(idx/9), c=idx%9;
      const keep=puz[r][c];
      puz[r][c]=0;
      if(countSolutions(puz,2)!==1){ puz[r][c]=keep; }
      else removed++;
    }
    return {puz,sol};
  }
  const sudoku={
    id:'sudoku', name:'Sudoku',
    metric:{type:'time'},
    blurb:'The classic number-placement puzzle.',
    rules:`Fill every row, column and 3×3 box with the digits 1–9. Tap a cell, then a number. A wrong number is rejected — and costs a 20-second penalty, so think first! Finish the grid to stop the clock.`,
    hasDifficulty:true,
    start(right,left,ctx,difficulty){
      const removals=difficulty==='hard'?52:difficulty==='medium'?46:38;
      ctx.setStatus('Generating&hellip;');
      right.innerHTML='<div style="text-align:center;margin-top:220px;font-size:20px;color:#5a5850;">Preparing puzzle&hellip;</div>';
      ctx.after(30,()=>{
        const {puz,sol}=makePuzzle(removals);
        ctx.setStatus('Difficulty: <b>'+(difficulty||'easy')+'</b><br>Wrong entry = +20 s');
        right.innerHTML='';
        const gridEl=el(right,'div','sudoku-grid',{marginTop:'22px'});
        let selected=null, remaining=0;
        const cellEls=[];
        for(let r=0;r<9;r++){cellEls.push([]);for(let c=0;c<9;c++){
          const given=puz[r][c]!==0;
          const cell=el(gridEl,'div','sd-cell'+(given?' given':'')+((c===2||c===5)?' b-r':'')+((r===2||r===5)?' b-b':''),
            null, given?String(puz[r][c]):'');
          if(!given){
            remaining++;
            cell.addEventListener('click',()=>{
              if(cell.classList.contains('done'))return;
              if(selected)selected.classList.remove('sel');
              selected=cell; cell.classList.add('sel');
              SFX.tap();
            });
          }
          cell.dataset.r=r; cell.dataset.c=c;
          cellEls[r].push(cell);
        }}
        // number bar
        const bar=el(right,'div',null,{display:'flex',justifyContent:'center',gap:'6px',marginTop:'16px'});
        for(let v=1;v<=9;v++){
          const b=el(bar,'button','key',null,String(v));
          b.style.width='44px';b.style.height='44px';b.style.fontSize='24px';
          b.addEventListener('click',()=>place(v));
        }
        ctx.onKey(e=>{ if(/^[1-9]$/.test(e.key)) place(+e.key); });
        function place(v){
          if(!selected)return;
          const r=+selected.dataset.r, c=+selected.dataset.c;
          if(v===sol[r][c]){
            selected.textContent=v;
            selected.classList.add('user','done');
            selected.classList.remove('sel');
            SFX.correct();
            selected=null;
            remaining--;
            if(remaining===0){ ctx.finish({extra:'Difficulty: '+(difficulty||'easy')}); }
          } else {
            selected.classList.add('conflict');
            const s=selected;
            ctx.after(500,()=>s.classList.remove('conflict'));
            ctx.mark(false,230,240);
            ctx.addPenalty(20000);
          }
        }
      });
    }
  };

  /* ---------- Brain Age Check tests ---------- */
  const STROOP_COLORS=[['RED','#c0392b'],['BLUE','#2e5f9e'],['YELLOW','#c8a415'],['BLACK','#22221f']];
  const stroopTest={
    id:'stroop', name:'Stroop Test',
    metric:{type:'score', outOf:20},
    blurb:'Tap the colour of the INK, not the word.',
    rules:`A colour word appears written in coloured ink. Ignore what the word SAYS — tap the button matching the INK colour it is printed in. 20 rounds, fast as you can.`,
    start(right,left,ctx){
      const total=20; let n=0, correct=0, times=[], t0=0;
      const wordEl=el(right,'div','stroop-word',{position:'absolute',left:'0',right:'0',top:'150px'});
      const btnRow=el(right,'div',null,{position:'absolute',left:'0',right:'0',bottom:'60px',
        display:'flex',justifyContent:'center',gap:'12px'});
      let ink=null;
      STROOP_COLORS.forEach(([name,hex])=>{
        const b=el(btnRow,'button','color-btn',{background:hex},name);
        b.addEventListener('click',()=>{
          if(ink==null)return;
          const ok=hex===ink;
          times.push(performance.now()-t0);
          if(ok)correct++;
          ctx.mark(ok,240,240);
          n++;
          next();
        });
      });
      const next=()=>{
        if(n>=total){
          const avg=times.reduce((a,b)=>a+b,0)/Math.max(1,times.length);
          ctx.finish({score:correct, stats:{avgMs:avg, errors:total-correct}});
          return;
        }
        ctx.progress(n,total);
        const word=pick(STROOP_COLORS);
        const inkPick=Math.random()<0.65? pick(STROOP_COLORS.filter(c=>c[0]!==word[0])) : word;
        ink=inkPick[1];
        wordEl.textContent=word[0];
        wordEl.style.color=ink;
        t0=performance.now();
      };
      next();
    }
  };

  const cruncher={
    id:'cruncher', name:'Number Cruncher',
    metric:{type:'score', outOf:8},
    blurb:'Answer quick questions about the numbers on screen.',
    rules:`Numbers of different colours appear — some slide, some pulse. Answer the question about them on the keypad (it submits by itself). 8 rounds.`,
    start(right,left,ctx){
      const total=8; let n=0, correct=0;
      const field=el(right,'div',null,{position:'absolute',left:'0',top:'0',right:'0',height:'300px',overflow:'hidden'});
      const qEl=el(right,'div',null,{position:'absolute',left:'10px',right:'10px',top:'308px',textAlign:'center',
        fontWeight:'bold',fontSize:'21px'});
      const pad=buildKeypad(right,ctx,{});
      let objs=[];
      ctx.raf(()=>{
        const t=performance.now()/1000;
        objs.forEach(o=>{
          if(o.anim==='slide') o.el.style.left=(o.x+Math.sin(t*o.sp+o.ph)*46)+'px';
          else if(o.anim==='pulse') o.el.style.transform='scale('+(1+Math.sin(t*o.sp*2+o.ph)*0.28)+')';
        });
      });
      const COLS=[['#c0392b','red'],['#2e5f9e','blue'],['#22221f','black']];
      const next=()=>{
        if(n>=total){ ctx.finish({score:correct}); return; }
        ctx.progress(n,total);
        field.innerHTML=''; objs=[];
        const k=rnd(5,9);
        const pts=scatter(k,30,20,410,240,72);
        const items=[];
        for(let i=0;i<k;i++){
          const col=pick(COLS), digit=rnd(0,9), anim=pick(['none','none','slide','pulse']);
          items.push({col:col[1],digit,anim});
          const d=el(field,'div','serif-num',{position:'absolute',left:pts[i].x+'px',top:pts[i].y+'px',
            fontSize:rnd(38,64)+'px',color:col[0]});
          d.textContent=digit;
          objs.push({el:d,x:pts[i].x,anim,sp:1+Math.random()*1.6,ph:Math.random()*6.28});
        }
        const qs=[];
        COLS.forEach(([hex,name])=>{
          const cnt=items.filter(it=>it.col===name).length;
          qs.push({q:`How many ${name.toUpperCase()} numbers?`,a:cnt});
        });
        qs.push({q:'How many numbers are MOVING?',a:items.filter(it=>it.anim!=='none').length});
        qs.push({q:'How many numbers are 5 or MORE?',a:items.filter(it=>it.digit>=5).length});
        const dig=rnd(0,9);
        qs.push({q:`How many ${dig}s do you see?`,a:items.filter(it=>it.digit===dig).length});
        const Q=pick(qs);
        qEl.textContent=Q.q;
        pad.ask(String(Q.a).length===0?1:String(Q.a).length,v=>{
          const ok=+v===Q.a;
          if(ok)correct++;
          ctx.mark(ok,230,160);
          n++;
          ctx.after(450,next);
        });
      };
      next();
    }
  };

  const calc20=calcExercise('calc20','Calculations × 20',20);
  const calc100=calcExercise('calc100','Calculations × 100',100);

  window.EXERCISES={
    list:[calc20,calc100,lowtohigh,headcount,triangle,timelapse,sudoku],
    checkTests:[stroopTest,calc20,cruncher],
    byId:id=>[calc20,calc100,lowtohigh,headcount,triangle,timelapse,sudoku,stroopTest,cruncher].find(e=>e.id===id)
  };
})();
