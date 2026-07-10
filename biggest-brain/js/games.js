/* ============================================================
   The 12 minigames.
   Each game: {id,name,category,plus,minus,instructions,start(field,ctx)}
   ctx (built by main.js):
     .level          current difficulty (correct answers + start level)
     .award(ok,x,y)  register correct/incorrect (no-op in preview)
     .after(ms,fn) .every(ms,fn) .raf(fn)   auto-cleaned timers
     .onKey(fn)      physical keyboard hook
     .preview        true during the instruction screen
   Scoring values follow the fan-recorded per-game table.
   ============================================================ */
(function(){
  const rnd = (a,b)=>Math.floor(Math.random()*(b-a+1))+a;
  const pick = arr=>arr[rnd(0,arr.length-1)];
  const shuffle = arr=>{const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=rnd(0,i);[a[i],a[j]]=[a[j],a[i]];}return a;};
  let UID = 0;

  function el(parent, tag, cls, css, html){
    const e = document.createElement(tag);
    if(cls) e.className = cls;
    if(css) Object.assign(e.style, css);
    if(html!=null) e.innerHTML = html;
    parent.appendChild(e);
    return e;
  }

  /* scatter n points in box without overlap */
  function scatter(n, x0,y0,x1,y1, minDist){
    const pts=[];
    let guard=0;
    while(pts.length<n && guard<4000){
      guard++;
      const p={x:rnd(x0,x1), y:rnd(y0,y1)};
      if(pts.every(q=>Math.hypot(q.x-p.x,q.y-p.y)>=minDist)) pts.push(p);
    }
    while(pts.length<n) pts.push({x:rnd(x0,x1),y:rnd(y0,y1)});
    return pts;
  }

  /* ---------- shared keypad ---------- */
  function buildKeypad(field, ctx, opts){
    opts = opts||{};
    const wrap = el(field,'div',null,{position:'absolute',left:(opts.x||770)+'px',top:(opts.y||210)+'px',
      display:'flex',flexDirection:'column',alignItems:'center',gap:'6px'});
    const disp = el(wrap,'div','kp-display');
    const pad = el(wrap,'div','keypad');
    let buf='', expected=null, onSubmit=null;
    const layout=[7,8,9,4,5,6,1,2,3,0];
    layout.forEach(d=>{
      const k = el(pad,'button','key'+(d===0?' zero':''),null,String(d));
      k.addEventListener('click',()=>pressDigit(d,k));
    });
    function pressDigit(d, keyEl){
      if(expected==null) return;
      SFX.click();
      if(keyEl){keyEl.classList.add('pressed');setTimeout(()=>keyEl.classList.remove('pressed'),110);}
      buf += String(d);
      disp.textContent = buf;
      if(buf.length >= expected){
        const v = buf; buf='';
        setTimeout(()=>{ if(onSubmit) onSubmit(v); },120);
      }
    }
    ctx.onKey(e=>{
      if(/^[0-9]$/.test(e.key)){
        const idx = layout.indexOf(+e.key);
        pressDigit(+e.key, pad.children[idx]);
      } else if(e.key==='Backspace'){ buf=buf.slice(0,-1); disp.textContent=buf; }
    });
    return {
      ask(len, cb){ buf=''; disp.textContent=''; expected=len; onSubmit=cb; },
      clear(){ buf=''; disp.textContent=''; }
    };
  }

  /* ============================================================
     ANALYSE
     ============================================================ */

  /* ---------- Balance ---------- */
  function scaleSVG(itemL, itemR, leftHeavy, w){
    // SVG rotate(+θ) is clockwise: negative tilt drops the LEFT beam end
    const tilt = leftHeavy?-10:10;
    const rad = tilt*Math.PI/180;
    const arm = 118;
    const lx = 160 - Math.cos(rad)*arm;
    const rx = 160 + Math.cos(rad)*arm;
    const lyy = 96 - Math.sin(rad)*arm, ryy = 96 + Math.sin(rad)*arm;
    return `<svg viewBox="0 0 320 260" width="${w||300}">
      <path d="M148 220 l24 0 12 26 h-48 Z" fill="#8f9596" stroke="#6f7577" stroke-width="3"/>
      <rect x="155" y="100" width="10" height="124" fill="#8f9596" stroke="#6f7577" stroke-width="2"/>
      <g transform="rotate(${tilt} 160 96)">
        <rect x="40" y="90" width="240" height="10" rx="5" fill="#7b8284"/>
      </g>
      <circle cx="160" cy="96" r="10" fill="#5d6365"/>
      <!-- left pan -->
      <path d="M${lx-2} ${lyy} l-34 44 M${lx-2} ${lyy} l34 44" stroke="#7b8284" stroke-width="4"/>
      <path d="M${lx-44} ${lyy+44} h84 l-10 18 h-64 Z" fill="#aab0b2" stroke="#7b8284" stroke-width="3"/>
      <g transform="translate(${lx-36},${lyy-24}) scale(.7)">${ART.items[itemL]()}</g>
      <!-- right pan -->
      <path d="M${rx+2} ${ryy} l-34 44 M${rx+2} ${ryy} l34 44" stroke="#7b8284" stroke-width="4"/>
      <path d="M${rx-42} ${ryy+44} h84 l-10 18 h-64 Z" fill="#aab0b2" stroke="#7b8284" stroke-width="3"/>
      <g transform="translate(${rx-34},${ryy-24}) scale(.7)">${ART.items[itemR]()}</g>
    </svg>`;
  }

  const balance = {
    id:'balance', name:'Balance', category:'analyse', plus:24, minus:16,
    instructions:'LOOK at the scales and WORK OUT which item is heaviest or lightest. TAP the answer below. Ready?',
    start(field, ctx){
      const newProblem = ()=>{
        field.innerHTML='';
        const n = ctx.level<2?3:4;
        const items = shuffle(ART.itemNames).slice(0,n); // items[0] heaviest → items[n-1] lightest
        const askHeavy = ctx.level<2 ? true : Math.random()<0.5;
        el(field,'div','equation',{position:'absolute',left:'175px',top:'70px',fontSize:'34px'},
          'Tap the <b style="color:'+(askHeavy?'#c0392b':'#2d6fb4')+'">'+(askHeavy?'HEAVIEST':'LIGHTEST')+'</b> item!');
        // adjacent comparisons give a full order
        const pairs=[];
        for(let i=0;i<n-1;i++) pairs.push([items[i], items[i+1]]);
        const scales = shuffle(pairs);
        const w = n===3?300:230;
        scales.forEach((p,i)=>{
          const flip = Math.random()<0.5;
          const L = flip?p[1]:p[0], R = flip?p[0]:p[1];
          const leftHeavy = items.indexOf(L)<items.indexOf(R);
          el(field,'div',null,{position:'absolute',left:(50+i*(w+20))+'px',top:'150px'},
            scaleSVG(L,R,leftHeavy,w));
        });
        // options
        const opts = shuffle(items);
        opts.forEach((it,i)=>{
          const b = el(field,'button','gobj',{left:(90+i*150)+'px',top:'470px',width:'118px',height:'118px',
            borderRadius:'50%',background:'#fff',boxShadow:'0 5px 12px rgba(0,0,0,.25)',
            display:'flex',alignItems:'center',justifyContent:'center'});
          b.innerHTML = ART.itemSVG(it, 84);
          b.addEventListener('click',()=>{
            const target = askHeavy?items[0]:items[n-1];
            const ok = it===target;
            ctx.award(ok, 90+i*150+59, 470);
            if(ok) newProblem();
          });
        });
      };
      newProblem();
    }
  };

  /* ---------- Cube Counter ---------- */
  const cubePalettes = [
    ['#e3f0f8','#b6d4e8','#93bcd8'],   // pale blue
    ['#e8f4dc','#c2dfa8','#a3c988'],   // pale green
    ['#f8eef3','#e2c2d4','#cfa4bd'],   // pale pink
    ['#d84a78','#b23560','#96274e'],   // magenta
    ['#fbf8ef','#e4ddc8','#cec5aa']    // cream
  ];
  function isoCubes(heights, W, D){
    const hw=42, hh=21, ch=42;
    let maxH=0; heights.forEach(r=>r.forEach(h=>maxH=Math.max(maxH,h)));
    const svgW = (W+D)*hw + 40, svgH = (W+D)*hh + maxH*ch + 60;
    const ox = D*hw + 20, oy = maxH*ch + 30;
    let out='';
    for(let s=0;s<=(W-1)+(D-1);s++){
      for(let r=0;r<D;r++) for(let c=0;c<W;c++){
        if(r+c!==s) continue;
        const pal = cubePalettes[(r*3+c*5)%cubePalettes.length];
        for(let z=0;z<heights[r][c];z++){
          const x = ox + (c-r)*hw, y = oy + (c+r)*hh - z*ch;
          out += `<g>
            <path d="M${x} ${y-ch} l${hw} ${-hh} l${hw} ${hh} l${-hw} ${hh} Z" fill="${pal[0]}" stroke="#ffffff88" stroke-width="1.5"/>
            <path d="M${x} ${y-ch} l0 ${ch} l${hw} ${hh} l0 ${-ch} Z" fill="${pal[1]}" stroke="#ffffff55" stroke-width="1"/>
            <path d="M${x+2*hw} ${y-ch} l0 ${ch} l${-hw} ${hh} l0 ${-ch} Z" fill="${pal[2]}" stroke="#ffffff55" stroke-width="1"/>
            <path d="M${x+hw-10} ${y-ch-3} l10 ${-5} l10 5 l-10 5 Z" fill="#ffffffaa"/>
          </g>`;
        }
      }
    }
    return `<svg viewBox="0 0 ${svgW} ${svgH}" width="${Math.min(430, svgW)}">${out}</svg>`;
  }
  const cubes = {
    id:'cubes', name:'Cube Counter', category:'analyse', plus:49, minus:33,
    instructions:'COUNT the BLOCKS in the structure. TAP the answer on the on-screen KEYPAD. Ready?',
    start(field, ctx){
      const pad = buildKeypad(field, ctx, {x:665,y:200});
      const newProblem = ()=>{
        const L = ctx.level;
        const W = L<3?2:3, D = L<5?2:3, maxH = L<1?2:(L<4?3:4);
        // monotone staircase (back-left tallest) → every step visible, count fair
        const h=[];
        for(let r=0;r<D;r++){ h.push([]); for(let c=0;c<W;c++){
          let v = rnd(1,maxH);
          if(r>0) v = Math.min(v, h[r-1][c]);
          if(c>0) v = Math.min(v, h[r][c-1]);
          h[r][c]=v;
        }}
        let count=0; h.forEach(r=>r.forEach(v=>count+=v));
        let zone = field.querySelector('.cube-zone');
        if(!zone) zone = el(field,'div','cube-zone',{position:'absolute',left:'120px',top:'150px',width:'440px',
          height:'420px',display:'flex',alignItems:'center',justifyContent:'center'});
        zone.innerHTML = isoCubes(h,W,D);
        const ask = ()=>pad.ask(String(count).length, v=>{
          const ok = +v===count;
          ctx.award(ok, 340, 340);
          if(ok) newProblem(); else ask();
        });
        ask();
      };
      newProblem();
    }
  };

  /* ---------- Car Path ---------- */
  const carpath = {
    id:'carpath', name:'Car Path', category:'analyse', plus:26, minus:17,
    instructions:'FOLLOW the tangled road from the CAR and TAP the garage it leads to. Ready?',
    start(field, ctx){
      const newProblem = ()=>{
        field.innerHTML='';
        const n = ctx.level<2?3:(ctx.level<4?4:5);
        const startYs=[], endYs=[];
        for(let i=0;i<n;i++){ startYs.push(170+i*(380/(n-1))); endYs.push(160+i*(400/(n-1))); }
        const perm = shuffle([...Array(n).keys()]);
        const carSlot = rnd(0,n-1);
        const colors = ['#e8a13c','#5f8fd0','#6db85f','#d84860','#9b6fc4'];
        let paths='';
        for(let i=0;i<n;i++){
          const y0=startYs[i], y1=endYs[perm[i]];
          const c1x=rnd(280,420), c1y=rnd(120,560), c2x=rnd(440,620), c2y=rnd(120,560);
          const d = `M150 ${y0} C ${c1x} ${c1y}, ${c2x} ${c2y}, 760 ${y1}`;
          paths += `<path d="${d}" fill="none" stroke="#7b8284" stroke-width="17" stroke-linecap="round"/>
                    <path d="${d}" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="14 12" opacity=".85"/>`;
        }
        el(field,'div',null,{position:'absolute',left:'0',top:'0',pointerEvents:'none'},
          `<svg width="1024" height="768" viewBox="0 0 1024 768">${paths}</svg>`);
        // dead-end cones at unused starts
        for(let i=0;i<n;i++){
          if(i===carSlot) continue;
          el(field,'div',null,{position:'absolute',left:'118px',top:(startYs[i]-24)+'px',pointerEvents:'none'},
            `<svg viewBox="0 0 60 60" width="48"><path d="M30 6 L46 48 H14 Z" fill="#e8862d" stroke="#b05f10" stroke-width="3"/><path d="M22 32 h16 M26 22 h8" stroke="#fff" stroke-width="4"/><rect x="8" y="46" width="44" height="8" rx="4" fill="#b05f10"/></svg>`);
        }
        el(field,'div',null,{position:'absolute',left:'28px',top:(startYs[carSlot]-34)+'px',pointerEvents:'none'},
          ART.carSVG(112));
        for(let j=0;j<n;j++){
          const g = el(field,'button','gobj',{left:'790px',top:(endYs[j]-52)+'px'});
          g.innerHTML = ART.garageSVG(100, colors[j%colors.length], j+1);
          g.addEventListener('click',()=>{
            const ok = j===perm[carSlot];
            ctx.award(ok, 840, endYs[j]);
            if(ok) newProblem();
          });
        }
      };
      newProblem();
    }
  };

  /* ============================================================
     CALCULATE
     ============================================================ */

  /* ---------- Missing Number ---------- */
  const missingnum = {
    id:'missingnum', name:'Missing Number', category:'calculate', plus:27, minus:18,
    instructions:'WORK OUT the missing number in the equation. TAP the answer on the KEYPAD. Ready?',
    start(field, ctx){
      const pad = buildKeypad(field, ctx, {x:665,y:200});
      const eq = el(field,'div','equation',{position:'absolute',left:'70px',top:'300px',fontSize:'78px'});
      const newProblem = ()=>{
        const L = ctx.level;
        let a,b,c,op,blank;
        const ops = L<4?['+','-']:['+','-','×'];
        op = pick(ops);
        const hi = L<2?9:(L<5?15:25);
        if(op==='+'){ a=rnd(1,hi); b=rnd(1,hi); c=a+b; }
        else if(op==='-'){ a=rnd(2,hi+6); b=rnd(1,a-1); c=a-b; }
        else { a=rnd(2,L<6?6:9); b=rnd(2,9); c=a*b; }
        blank = L<2 ? 2 : rnd(0,2);   // 0:a 1:b 2:c
        const vals=[a,b,c];
        const answer = vals[blank];
        const parts = vals.map((v,i)=> i===blank
          ? `<span style="display:inline-block;min-width:96px;border:6px dashed #b98d63;border-radius:14px;color:#c0392b;padding:0 10px;">?</span>`
          : v);
        eq.innerHTML = `${parts[0]} ${op==='-'?'−':op} ${parts[1]} = ${parts[2]}`;
        const ask = ()=>pad.ask(String(answer).length, v=>{
          const ok = +v===answer;
          ctx.award(ok, 330, 340);
          if(ok) newProblem(); else ask();
        });
        ask();
      };
      newProblem();
    }
  };

  /* ---------- Missing Sign ---------- */
  const missingsign = {
    id:'missingsign', name:'Missing Sign', category:'calculate', plus:20, minus:12,
    instructions:'WHICH sign completes the equation? TAP +, −, × or ÷ to answer. Ready?',
    start(field, ctx){
      const eq = el(field,'div','equation',{position:'absolute',left:'0px',top:'250px',fontSize:'80px',width:'700px',textAlign:'center'});
      const tileWrap = el(field,'div',null,{position:'absolute',left:'110px',top:'430px',display:'flex',gap:'26px'});
      const signCols = {'+':'#e8607c','-':'#5f8fd0','×':'#e8a13c','÷':'#8fce6e'};
      const evalOp = (a,op,b)=>op==='+'?a+b:op==='-'?a-b:op==='×'?a*b:(b!==0&&a%b===0?a/b:NaN);
      let current=null;
      ['+','-','×','÷'].forEach(op=>{
        const t = el(tileWrap,'button','tile',{width:'110px',height:'110px',fontSize:'64px',background:signCols[op]},
          op==='-'?'−':op);
        t.addEventListener('click',()=>{
          if(!current) return;
          const ok = op===current.op;
          ctx.award(ok, 165+['+','-','×','÷'].indexOf(op)*136, 480);
          if(ok) newProblem();
        });
      });
      const newProblem = ()=>{
        const L = ctx.level;
        const ops = L<2?['+','-']:(L<4?['+','-','×']:['+','-','×','÷']);
        let a,b,op,c,guard=0;
        do{
          guard++;
          op = pick(ops);
          if(op==='+'){ a=rnd(1,L<3?9:20); b=rnd(1,L<3?9:20); }
          else if(op==='-'){ a=rnd(2,L<3?12:24); b=rnd(1,a-1); }
          else if(op==='×'){ a=rnd(2,9); b=rnd(2,9); }
          else { b=rnd(2,9); c=rnd(2,9); a=b*c; }
          c = evalOp(a,op,b);
          // reject if another sign gives the same result (ambiguous)
          var ambiguous = ['+','-','×','÷'].some(o=>o!==op && evalOp(a,o,b)===c);
        }while(ambiguous && guard<200);
        current = {a,b,op,c};
        eq.innerHTML = `${a} <span style="display:inline-block;min-width:92px;border:6px dashed #b98d63;border-radius:14px;color:#c0392b;">?</span> ${b} = ${c}`;
      };
      newProblem();
    }
  };

  /* ---------- Math Combination ---------- */
  const mathcombo = {
    id:'mathcombo', name:'Math Combination', category:'calculate', plus:44, minus:29,
    instructions:'TAP the TWO number tiles that COMBINE to make the TARGET. Ready?',
    start(field, ctx){
      const newProblem = ()=>{
        field.innerHTML='';
        const L = ctx.level;
        const count = L<2?4:(L<4?5:6);
        const useMul = L>=5 && Math.random()<0.4;
        let tiles, ti, tj, target, guard=0;
        do{
          guard++;
          tiles = [];
          for(let i=0;i<count;i++) tiles.push(useMul?rnd(2,9):rnd(1,12));
          ti = rnd(0,count-1); tj = rnd(0,count-1);
          if(ti===tj){ continue; }
          target = useMul?tiles[ti]*tiles[tj]:tiles[ti]+tiles[tj];
          // count pairs achieving target — must be exactly achievable and not trivially everywhere
          let pairs=0;
          for(let i=0;i<count;i++)for(let j=i+1;j<count;j++){
            const v = useMul?tiles[i]*tiles[j]:tiles[i]+tiles[j];
            if(v===target) pairs++;
          }
          if(pairs===1) break;
        }while(guard<400);
        el(field,'div','equation',{position:'absolute',left:'0',top:'130px',width:'760px',textAlign:'center',fontSize:'40px'},
          (useMul?'MULTIPLY':'ADD')+' two tiles to make');
        el(field,'div','equation',{position:'absolute',left:'0',top:'185px',width:'760px',textAlign:'center',fontSize:'96px',color:'#c0392b'},
          String(target));
        const wrap = el(field,'div',null,{position:'absolute',left:'0',top:'350px',width:'760px',
          display:'flex',justifyContent:'center',gap:'22px',flexWrap:'wrap'});
        let sel = [];
        tiles.forEach((v,i)=>{
          const t = el(wrap,'button','tile',{width:'104px',height:'104px',fontSize:'54px',
            background:'linear-gradient(180deg,#fff,#e8e8e2)',color:'#232323',border:'4px solid #9aa0a1'},String(v));
          t.addEventListener('click',()=>{
            if(sel.find(s=>s.i===i)){ t.classList.remove('picked'); sel=sel.filter(s=>s.i!==i); return; }
            t.classList.add('picked'); sel.push({i,v,t});
            SFX.click();
            if(sel.length===2){
              const got = useMul?sel[0].v*sel[1].v:sel[0].v+sel[1].v;
              const ok = got===target;
              ctx.award(ok, 380, 400);
              if(ok) newProblem();
              else { sel.forEach(s=>s.t.classList.remove('picked')); sel=[]; }
            }
          });
        });
      };
      newProblem();
    }
  };

  /* ============================================================
     MEMORISE
     ============================================================ */

  /* ---------- Card Pairs ---------- */
  const CARD_SYMBOLS = [['drop','#dce9f6'],['clover','#e4e9b2'],['star','#fdf2cd'],['heart','#f6dce2'],['moon','#f2efd0'],['bolt','#fbe9d4']];
  const cardpairs = {
    id:'cardpairs', name:'Card Pairs', category:'memorise', plus:26, minus:18,
    instructions:'MEMORISE the cards and SELECT MATCHING PAIRS. TAP anywhere to flip them over early. Ready?',
    start(field, ctx){
      // card-shaped non-overlap placement (cards are 110×150 + border)
      const scatterCards = n=>{
        const pts=[]; let guard=0;
        while(pts.length<n && guard<6000){
          guard++;
          const p={x:rnd(60,540), y:rnd(160,530)};
          if(pts.every(q=>Math.abs(q.x-p.x)>=128 || Math.abs(q.y-p.y)>=168)) pts.push(p);
        }
        while(pts.length<n) pts.push({x:rnd(60,540), y:rnd(160,530)});
        return pts;
      };
      const newProblem = ()=>{
        field.innerHTML='';
        const L = ctx.level;
        const nPairs = L<2?2:(L<5?3:4);
        const syms = shuffle(CARD_SYMBOLS).slice(0,nPairs);
        const deck = shuffle(syms.flatMap(s=>[s,s]));
        const pts = scatterCards(deck.length);
        let revealed=[], matched=0, phase='memo';
        const cards = deck.map((sym,i)=>{
          const c = el(field,'div','pcard up',{left:pts[i].x+'px',top:pts[i].y+'px'});
          const back = el(c,'div','face back'); back.innerHTML = ART.cardBack();
          const front = el(c,'div','face front',{background:sym[1],borderRadius:'6px'});
          front.innerHTML = `<svg viewBox="0 0 100 100" width="74">${ART.items[sym[0]]()}</svg>`;
          c.addEventListener('click',()=>{
            if(phase!=='play' || c.classList.contains('up') || revealed.length>=2) return;
            SFX.flip();
            c.classList.add('up');
            revealed.push({c, sym:sym[0]});
            if(revealed.length===2){
              const [r1,r2]=revealed;
              if(r1.sym===r2.sym){
                r1.c.classList.add('matched'); r2.c.classList.add('matched');
                matched++;
                ctx.award(true, pts[i].x+55, pts[i].y+40);
                revealed=[];
                if(matched===nPairs) ctx.after(600, newProblem);
              } else {
                ctx.award(false, pts[i].x+55, pts[i].y+40);
                ctx.after(650,()=>{ r1.c.classList.remove('up'); r2.c.classList.remove('up'); revealed=[]; });
              }
            }
          });
          return c;
        });
        const flipDown = ()=>{
          if(phase!=='memo') return;
          phase='flipping';
          cards.forEach(c=>c.classList.remove('up'));
          SFX.whoosh();
          ctx.after(350,()=>{ phase='play'; });
        };
        const memoMs = ctx.preview? 999999 : (1300 + nPairs*700);
        ctx.after(memoMs, flipDown);
        // tap anywhere during memorisation to flip early (speed play)
        field.addEventListener('click', flipDown);
      };
      newProblem();
    }
  };

  /* ---------- Shape Order ---------- */
  const shapeorder = {
    id:'shapeorder', name:'Shape Order', category:'memorise', plus:18, minus:12,
    instructions:'WATCH the portraits light up, then TAP them in the SAME ORDER. Ready?',
    start(field, ctx){
      const newProblem = ()=>{
        field.innerHTML='';
        const L = ctx.level;
        const n = L<2?3:(L<5?4:5);
        const animals = shuffle(ART.animalNames).slice(0,n);
        const order = shuffle([...Array(n).keys()]);
        const fw = 150, gap = 30;
        const x0 = (760-(n*fw+(n-1)*gap))/2 + 40;
        const status = el(field,'div','equation',{position:'absolute',left:'0',top:'150px',width:'840px',
          textAlign:'center',fontSize:'34px'},'WATCH the order&hellip;');
        let phase='show', progress=0;
        const frames = animals.map((an,i)=>{
          const f = el(field,'div','pframe',{left:(x0+i*(fw+gap))+'px',top:'280px',width:fw+'px',height:'180px'});
          const inner = el(f,'div','inner',{width:(fw-34)+'px',height:'146px'});
          inner.innerHTML = ART.animalSVG(an, 96);
          f.addEventListener('click',()=>{
            if(phase!=='guess') return;
            const ok = order[progress]===i;
            if(ok){
              f.classList.remove('lit'); void f.offsetWidth; f.classList.add('lit');
              SFX.pop();
              progress++;
              if(progress===n){
                phase='done';
                ctx.award(true, x0+i*(fw+gap)+fw/2, 360);
                ctx.after(650, newProblem);
              }
            } else {
              phase='done';
              ctx.award(false, x0+i*(fw+gap)+fw/2, 360);
              ctx.after(750, newProblem);
            }
          });
          return f;
        });
        // play the sequence
        order.forEach((fi,step)=>{
          ctx.after(700+step*750, ()=>{
            frames[fi].classList.remove('lit'); void frames[fi].offsetWidth;
            frames[fi].classList.add('lit');
            SFX.tick();
            ctx.after(560, ()=>frames[fi].classList.remove('lit'));
          });
        });
        if(!ctx.preview) ctx.after(700+n*750+200, ()=>{
          phase='guess';
          status.innerHTML='Now TAP them in the same order!';
        });
      };
      newProblem();
    }
  };

  /* ---------- Action Sequence ---------- */
  const actionseq = {
    id:'actionseq', name:'Action Sequence', category:'memorise', plus:13, minus:8,
    instructions:'WATCH which chicks hatch first, then TAP the eggs in the SAME ORDER. Ready?',
    start(field, ctx){
      const newProblem = ()=>{
        field.innerHTML='';
        const L = ctx.level;
        const n = L<2?3:(L<5?4:5);
        const order = shuffle([...Array(n).keys()]);
        const pts = scatter(n, 90, 240, 640, 520, 150);
        const status = el(field,'div','equation',{position:'absolute',left:'0',top:'150px',width:'840px',
          textAlign:'center',fontSize:'34px'},'WATCH the eggs hatch&hellip;');
        let phase='show', progress=0;
        const eggs = pts.map((p,i)=>{
          const g = el(field,'div','egg',{left:p.x+'px',top:p.y+'px'});
          g.innerHTML = ART.egg(92);
          g.addEventListener('click',()=>{
            if(phase!=='guess') return;
            const ok = order[progress]===i;
            if(ok){
              g.innerHTML = ART.eggHatched(92);
              SFX.hatch();
              progress++;
              if(progress===n){
                phase='done';
                ctx.award(true, p.x+46, p.y+40);
                ctx.after(700, newProblem);
              }
            } else {
              phase='done';
              g.classList.add('jiggle');
              ctx.award(false, p.x+46, p.y+40);
              ctx.after(750, newProblem);
            }
          });
          return g;
        });
        order.forEach((ei,step)=>{
          ctx.after(700+step*900, ()=>{
            const g = eggs[ei];
            g.classList.add('jiggle');
            SFX.tick();
            ctx.after(280,()=>{ g.innerHTML = ART.eggHatched(92); SFX.hatch(); });
            ctx.after(830,()=>{ g.innerHTML = ART.egg(92); g.classList.remove('jiggle'); });
          });
        });
        if(!ctx.preview) ctx.after(700+n*900+200, ()=>{
          phase='guess';
          status.innerHTML='Now TAP the eggs in hatching order!';
        });
      };
      newProblem();
    }
  };

  /* ============================================================
     VISUALISE
     ============================================================ */

  /* ---------- Asteroids ---------- */
  const AST_COLORS = [['#d97a72','#b4514a'],['#b6c94e','#93a52e'],['#8fd0c8','#6b9ec4'],['#c49ad8','#9a6cb4'],['#e8b25c','#c48a2e']];
  const asteroids = {
    id:'asteroids', name:'Asteroids', category:'visualise', plus:11, minus:11,
    instructions:'TAP the asteroids from LOW to HIGH or A to Z. Ready?',
    start(field, ctx){
      let objs=[], nextIdx=0;
      const newSet = ()=>{
        field.querySelectorAll('.asteroid').forEach(a=>a.remove());
        objs=[]; nextIdx=0;
        const L = ctx.level;
        const k = L<2?3:(L<4?4:(L<7?5:6));
        const letters = L>=3 && Math.random()<0.45;
        let labels;
        if(letters){
          const start = rnd(0,20);
          const set=[]; for(let i=0;i<26;i++) set.push(String.fromCharCode(65+i));
          labels = shuffle(set.slice(start, start+Math.min(26-start, k*3))).slice(0,k).sort();
        } else {
          const set=new Set(); while(set.size<k) set.add(rnd(1, L<3?15:40));
          labels = [...set].sort((a,b)=>a-b);
        }
        const disp = shuffle([...Array(k).keys()]);
        const pts = scatter(k, 60, 140, 700, 520, 190);
        disp.forEach((li,i)=>{
          const size = rnd(105,175);
          const col = AST_COLORS[i%AST_COLORS.length];
          const d = el(field,'div','asteroid',{left:pts[i].x+'px',top:pts[i].y+'px',width:size+'px',height:size+'px'});
          d.innerHTML = ART.asteroidSVG(col[0], col[1], size, labels[li], rnd(0,359));
          const o = {el:d, order:li, x:pts[i].x, y:pts[i].y, vx:(Math.random()*2-1)*.5, vy:(Math.random()*2-1)*.5,
            rot:rnd(0,359), vr:(Math.random()*2-1)*.55, size, popped:false};
          d.addEventListener('click',()=>{
            if(o.popped) return;
            const ok = o.order===nextIdx;
            ctx.award(ok, o.x+size/2, o.y+size/2);
            if(ok){
              o.popped = true; nextIdx++;
              d.style.transition='transform .25s ease, opacity .25s ease';
              d.style.transform='scale(1.5)'; d.style.opacity='0';
              ctx.after(260,()=>d.remove());
              if(nextIdx===k) ctx.after(350, newSet);
            }
          });
          objs.push(o);
        });
      };
      ctx.raf(()=>{
        const live = objs.filter(o=>!o.popped);
        live.forEach(o=>{
          o.x+=o.vx; o.y+=o.vy; o.rot+=o.vr;
          if(o.x<20||o.x>860-o.size) o.vx*=-1;
          if(o.y<120||o.y>640-o.size) o.vy*=-1;
        });
        // asteroid-vs-asteroid elastic collisions (mass ~ size²)
        for(let i=0;i<live.length;i++)for(let j=i+1;j<live.length;j++){
          const a=live[i], b=live[j];
          const ax=a.x+a.size/2, ay=a.y+a.size/2;
          const bx=b.x+b.size/2, by=b.y+b.size/2;
          const dx=bx-ax, dy=by-ay;
          const d=Math.hypot(dx,dy), minD=(a.size+b.size)/2;
          if(d>0 && d<minD){
            const nx=dx/d, ny=dy/d, push=(minD-d)/2;
            a.x-=nx*push; a.y-=ny*push;
            b.x+=nx*push; b.y+=ny*push;
            const m1=a.size*a.size, m2=b.size*b.size;
            const v1n=a.vx*nx+a.vy*ny, v2n=b.vx*nx+b.vy*ny;
            if(v1n-v2n>0){ // only if approaching
              const nv1=(v1n*(m1-m2)+2*m2*v2n)/(m1+m2);
              const nv2=(v2n*(m2-m1)+2*m1*v1n)/(m1+m2);
              a.vx+=(nv1-v1n)*nx; a.vy+=(nv1-v1n)*ny;
              b.vx+=(nv2-v2n)*nx; b.vy+=(nv2-v2n)*ny;
            }
          }
        }
        live.forEach(o=>{
          o.el.style.left=o.x+'px'; o.el.style.top=o.y+'px';
          const svg = o.el.firstChild;
          if(svg) svg.style.transform='rotate('+o.rot+'deg)';
        });
      });
      newSet();
    }
  };

  /* ---------- Jigsaw ---------- */
  function piecePath(){
    // rounded square with a knob on right + notch on bottom
    return `M0 0 H100 V34 q-24 -14 -24 16 q0 30 24 16 V100 H66 q14 24 -16 24 q-30 0 -16 -24 H0 Z`;
  }
  const jigsaw = {
    id:'jigsaw', name:'Jigsaw', category:'visualise', plus:19, minus:13,
    instructions:'LOOK at the hole in the picture and TAP the piece that FITS. Ready?',
    start(field, ctx){
      const newProblem = ()=>{
        field.innerHTML='';
        UID++;
        const L = ctx.level;
        const nOpts = L<2?3:4;
        const sw=430, sh=330;
        // build a random scene
        const bgs=['#bde2ee','#f5e3c4','#d8ecc8','#f2d4dc','#e2d8f0'];
        const bg = pick(bgs);
        let shapes='';
        const cols=['#e8607c','#5f8fd0','#6db85f','#e8a13c','#9b6fc4','#f0c93d','#4aa8a0'];
        for(let i=0;i<11;i++){
          const cx=rnd(10,sw-10), cy=rnd(10,sh-10), c=pick(cols);
          const t = rnd(0,2);
          if(t===0) shapes+=`<circle cx="${cx}" cy="${cy}" r="${rnd(16,44)}" fill="${c}" opacity=".9"/>`;
          else if(t===1) shapes+=`<rect x="${cx-30}" y="${cy-16}" width="${rnd(40,90)}" height="${rnd(18,40)}" rx="10" fill="${c}" opacity=".9" transform="rotate(${rnd(-40,40)} ${cx} ${cy})"/>`;
          else shapes+=`<path d="M${cx} ${cy-26} l8 18 20 2 -14 14 3 20 -17 -10 -17 10 3 -20 -14 -14 20 -2 Z" fill="${c}" opacity=".9"/>`;
        }
        const hx=rnd(40,sw-170), hy=rnd(30,sh-170);
        const sceneId='scene'+UID, clipId='pclip'+UID;
        const sceneDef=`<defs>
            <g id="${sceneId}"><rect width="${sw}" height="${sh}" fill="${bg}"/>${shapes}</g>
            <clipPath id="${clipId}"><path d="${piecePath()}"/></clipPath>
          </defs>`;
        // main picture with hole
        el(field,'div',null,{position:'absolute',left:'70px',top:'170px',
          filter:'drop-shadow(0 8px 16px rgba(0,0,0,.28))'},
          `<svg width="${sw}" height="${sh}" viewBox="0 0 ${sw} ${sh}">
            ${sceneDef}
            <use href="#${sceneId}"/>
            <g transform="translate(${hx},${hy})"><path d="${piecePath()}" fill="#fff" stroke="#9aa0a1" stroke-width="3" stroke-dasharray="8 6"/></g>
            <rect width="${sw}" height="${sh}" fill="none" stroke="#fff" stroke-width="8"/>
          </svg>`);
        // candidates
        const offsets=[[0,0]];
        while(offsets.length<nOpts){
          const o=[rnd(-1,1)*rnd(50,120), rnd(-1,1)*rnd(40,100)];
          if(Math.abs(o[0])+Math.abs(o[1])<50) continue;
          if(hx+o[0]<0||hx+o[0]>sw-130||hy+o[1]<0||hy+o[1]>sh-130) continue;
          offsets.push(o);
        }
        const orderIdx = shuffle([...Array(nOpts).keys()]);
        orderIdx.forEach((oi,slot)=>{
          const [dx,dy]=offsets[oi];
          const b = el(field,'button','gobj',{left:'620px',top:(150+slot*128)+'px',width:'132px',height:'132px'});
          b.innerHTML = `<svg width="128" height="128" viewBox="-8 -8 140 140">
            ${sceneDef.replace(new RegExp(sceneId,'g'),sceneId+'c'+slot).replace(new RegExp(clipId,'g'),clipId+'c'+slot)}
            <g clip-path="url(#${clipId}c${slot})"><use href="#${sceneId}c${slot}" transform="translate(${-(hx+dx)},${-(hy+dy)})"/></g>
            <path d="${piecePath()}" fill="none" stroke="#fff" stroke-width="5"/>
            <path d="${piecePath()}" fill="none" stroke="#00000033" stroke-width="2"/>
          </svg>`;
          b.style.filter='drop-shadow(0 5px 8px rgba(0,0,0,.3))';
          b.addEventListener('click',()=>{
            const ok = oi===0;
            ctx.award(ok, 686, 216+slot*128);
            if(ok) newProblem();
          });
        });
      };
      newProblem();
    }
  };

  /* ---------- Hexagon Path ---------- */
  const HEX_ITEMS=[['cheese','#f7e8b0'],['candy','#cdeaf6'],['onion','#efe2c4']];
  const hexpath = {
    id:'hexpath', name:'Hexagon Path', category:'visualise', plus:40, minus:26,
    instructions:'TAP a connected path of touching hexagons that matches the SEQUENCE shown. Ready?',
    start(field, ctx){
      const ROWS=4, COLS=5, R=50;
      const HW = Math.sqrt(3)*R;
      function neighbors(r,c){
        const odd = r%2;
        const n = odd
          ? [[r,c-1],[r,c+1],[r-1,c],[r-1,c+1],[r+1,c],[r+1,c+1]]
          : [[r,c-1],[r,c+1],[r-1,c-1],[r-1,c],[r+1,c-1],[r+1,c]];
        return n.filter(([rr,cc])=>rr>=0&&rr<ROWS&&cc>=0&&cc<COLS);
      }
      function hexPts(cx,cy){
        let p='';
        for(let i=0;i<6;i++){
          const a=(i*60-30)*Math.PI/180;
          p+=(i?' L':'M')+(cx+R*Math.cos(a)).toFixed(1)+' '+(cy+R*Math.sin(a)).toFixed(1);
        }
        return p+' Z';
      }
      const newProblem = ()=>{
        field.innerHTML='';
        const L = ctx.level;
        const segLen = L<2?3:(L<4?4:5);
        // random walk path
        let path, guard=0;
        do{
          guard++;
          path=[[rnd(0,ROWS-1),rnd(0,COLS-1)]];
          while(path.length<segLen){
            const last=path[path.length-1];
            const opts=neighbors(last[0],last[1]).filter(n=>!path.some(p=>p[0]===n[0]&&p[1]===n[1]));
            if(!opts.length) break;
            path.push(pick(opts));
          }
        }while(path.length<segLen && guard<100);
        const seq = Array.from({length:segLen},()=>rnd(0,HEX_ITEMS.length-1));
        const grid=[];
        for(let r=0;r<ROWS;r++){ grid.push([]); for(let c=0;c<COLS;c++) grid[r].push(rnd(0,HEX_ITEMS.length-1)); }
        path.forEach(([r,c],i)=>grid[r][c]=seq[i]);
        // sequence banner
        const banner = el(field,'div',null,{position:'absolute',left:'0',top:'120px',width:'840px',
          display:'flex',justifyContent:'center',alignItems:'center',gap:'8px'});
        seq.forEach((s,i)=>{
          if(i) el(banner,'div',null,{fontSize:'34px',fontWeight:'bold',color:'#3a3d3a',fontFamily:'var(--font-round)'},'&#8594;');
          const chip = el(banner,'div',null,{width:'76px',height:'76px',borderRadius:'12px',background:'#fff',
            display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 8px rgba(0,0,0,.22)'});
          chip.innerHTML = ART.itemSVG(HEX_ITEMS[s][0], 56);
        });
        const seqChips = [...banner.children].filter(e=>e.style.width==='76px');
        // hexes
        const ox=140, oy=270;
        let progress=0, lastCell=null;
        const cellEls={};
        for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
          const cx = ox + c*HW + (r%2?HW/2:0), cy = oy + r*R*1.5;
          const it = HEX_ITEMS[grid[r][c]];
          const h = el(field,'div','hex',{left:(cx-HW/2)+'px',top:(cy-R)+'px',width:HW+'px',height:(2*R)+'px'});
          h.innerHTML = `<svg viewBox="${(-HW/2).toFixed(1)} ${-R} ${HW.toFixed(1)} ${2*R}" width="${HW.toFixed(0)}">
            <path d="${hexPts(0,0)}" fill="${it[1]}" stroke="#fff" stroke-width="5"/>
            <g transform="translate(-33,-33) scale(.66)">${ART.items[it[0]]()}</g></svg>`;
          cellEls[r+','+c]=h;
          h.addEventListener('click',()=>{
            if(progress>=segLen) return;
            const matches = grid[r][c]===seq[progress];
            const adjacent = !lastCell || neighbors(lastCell[0],lastCell[1]).some(([rr,cc])=>rr===r&&cc===c);
            const fresh = !h.classList.contains('done');
            if(matches && adjacent && fresh){
              h.classList.add('done');
              seqChips[progress].style.outline='5px solid #6fca62';
              SFX.pop();
              lastCell=[r,c]; progress++;
              if(progress===segLen){
                ctx.award(true, cx, cy);
                ctx.after(600, newProblem);
              }
            } else {
              ctx.award(false, cx, cy);
              // reset progress
              progress=0; lastCell=null;
              Object.values(cellEls).forEach(e=>e.classList.remove('done'));
              seqChips.forEach(ch=>ch.style.outline='none');
            }
          });
        }
      };
      newProblem();
    }
  };

  const LIST = [balance, cubes, carpath, missingnum, missingsign, mathcombo,
                cardpairs, shapeorder, actionseq, asteroids, jigsaw, hexpath];

  window.GAMES = {
    list: LIST,
    byId: id=>LIST.find(g=>g.id===id),
    byCategory: cat=>LIST.filter(g=>g.category===cat),
    categories: ['analyse','calculate','memorise','visualise'],
    catNames: {analyse:'Analyse', calculate:'Calculate', memorise:'Memorise', visualise:'Visualise'}
  };
})();
