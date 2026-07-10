/* ============================================================
   Original SVG artwork generators (drawn from scratch to match
   the 2007 game-show cartoon aesthetic — no copied assets).
   ============================================================ */
(function(){
  const ART = {};

  /* ---------- the lab-coat host ----------
     pose: 'arms-up' | 'wave' | 'desk' (hands hidden behind podium)
     face: 'happy' (closed smiling eyes) | 'open' (round eyes)      */
  ART.host = function(pose, face, w){
    pose = pose||'desk'; face = face||'open'; w = w||330;
    const eyes = face==='happy'
      ? `<path d="M118 152 q14 -16 28 0" stroke="#232323" stroke-width="7" fill="none" stroke-linecap="round"/>
         <path d="M204 152 q14 -16 28 0" stroke="#232323" stroke-width="7" fill="none" stroke-linecap="round"/>
         <path d="M155 196 q20 16 40 0" stroke="#b98d63" stroke-width="6" fill="none" stroke-linecap="round"/>`
      : `<ellipse cx="130" cy="152" rx="9" ry="10" fill="#232323"/>
         <ellipse cx="133" cy="148" rx="3" ry="3.4" fill="#fff"/>
         <ellipse cx="220" cy="152" rx="9" ry="10" fill="#232323"/>
         <ellipse cx="223" cy="148" rx="3" ry="3.4" fill="#fff"/>
         <path d="M162 200 q13 6 26 0" stroke="#b98d63" stroke-width="6" fill="none" stroke-linecap="round"/>`;
    const brows = `<path d="M108 128 q22 -12 44 -2" stroke="#232323" stroke-width="10" fill="none" stroke-linecap="round"/>
                   <path d="M198 126 q22 -10 44 2" stroke="#232323" stroke-width="10" fill="none" stroke-linecap="round"/>`;
    let arms = '';
    if(pose==='arms-up'){
      arms = `<path d="M96 320 Q30 300 18 236" stroke="#f6f4ef" stroke-width="44" fill="none" stroke-linecap="round"/>
              <circle cx="18" cy="230" r="24" fill="#f3d9b8"/>
              <path d="M254 320 Q320 300 332 236" stroke="#f6f4ef" stroke-width="44" fill="none" stroke-linecap="round"/>
              <circle cx="332" cy="230" r="24" fill="#f3d9b8"/>`;
    } else if(pose==='wave'){
      arms = `<path d="M254 322 Q322 288 336 210" stroke="#f6f4ef" stroke-width="44" fill="none" stroke-linecap="round"/>
              <circle cx="338" cy="202" r="24" fill="#f3d9b8"/>`;
    }
    return `<svg viewBox="0 0 350 430" width="${w}" xmlns="http://www.w3.org/2000/svg">
      <!-- hair back -->
      <path d="M62 120 Q48 30 122 26 Q140 -4 190 10 Q235 -8 258 34 Q318 40 296 122
               Q330 140 306 186 Q322 210 288 232 L266 210 Q300 150 268 108
               Q276 60 224 52 Q196 30 160 48 Q108 40 100 96 Q66 120 86 176
               Q60 190 78 222 L58 236 Q30 200 52 172 Q28 140 62 120 Z" fill="#26262b"/>
      <!-- body / coat -->
      <path d="M92 430 L92 340 Q96 306 175 300 Q254 306 258 340 L258 430 Z" fill="#f6f4ef"/>
      <path d="M148 306 L175 344 L202 306 L188 300 L162 300 Z" fill="#fff"/>
      <!-- shirt + tie -->
      <path d="M160 302 L175 318 L190 302 Z" fill="#e8e8e2"/>
      <path d="M170 312 L180 312 L186 372 L175 392 L164 372 Z" fill="#2f5d3a"/>
      <!-- coat lapels -->
      <path d="M150 302 L175 346 L146 366 L132 312 Z" fill="#e6e3da"/>
      <path d="M200 302 L175 346 L204 366 L218 312 Z" fill="#e6e3da"/>
      ${arms}
      <!-- neck & head -->
      <rect x="158" y="266" width="34" height="42" rx="14" fill="#f3d9b8"/>
      <ellipse cx="175" cy="170" rx="102" ry="98" fill="#f3d9b8"/>
      <!-- ears -->
      <ellipse cx="72" cy="180" rx="14" ry="18" fill="#f3d9b8"/>
      <ellipse cx="278" cy="180" rx="14" ry="18" fill="#f3d9b8"/>
      <!-- hair front (spiky mop) -->
      <path d="M62 150 Q52 66 128 52 Q150 20 196 34 Q244 22 258 66 Q308 80 288 150
               Q296 128 268 118 Q282 92 240 84 Q244 60 204 64 Q186 46 156 62
               Q118 54 122 88 Q86 88 96 122 Q64 126 62 150 Z" fill="#26262b"/>
      <path d="M60 148 Q40 120 78 104 Q70 72 116 66 Q120 40 162 50 Q186 32 214 52
               Q256 40 258 76 Q298 84 282 120 Q310 140 284 158 Q290 130 254 128
               Q268 96 226 96 Q228 68 190 76 Q170 60 146 78 Q112 72 118 104 Q82 104 92 134 Q66 134 60 148 Z" fill="#2e2e34"/>
      ${brows}
      ${eyes}
      <!-- nose -->
      <ellipse cx="175" cy="176" rx="8" ry="6" fill="#e5c298"/>
      <!-- blush -->
      <ellipse cx="102" cy="182" rx="15" ry="10" fill="#f0a8c0" opacity=".85"/>
      <ellipse cx="248" cy="182" rx="15" ry="10" fill="#f0a8c0" opacity=".85"/>
    </svg>`;
  };

  /* ---------- podium (grey drum with bulbs) ---------- */
  ART.podium = function(w){
    w = w||360;
    let bulbs = '';
    for(let i=0;i<9;i++){
      const x = 40 + i*35, y = 36 - Math.sin((i/8)*Math.PI)*16;
      bulbs += `<ellipse cx="${x}" cy="${y}" rx="11" ry="9" fill="#f6f3b5" stroke="#9aa0a1" stroke-width="2"/>`;
    }
    return `<svg viewBox="0 0 360 150" width="${w}" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 42 Q180 -8 342 42 L342 150 L18 150 Z" fill="#a9aeb0"/>
      <path d="M18 42 Q180 -8 342 42 Q180 78 18 42 Z" fill="#c2c7c8"/>
      <path d="M30 90 L30 150 L46 150 L46 86 Z" fill="#8f9496" opacity=".6"/>
      ${bulbs}
    </svg>`;
  };

  /* ---------- marquee light bulbs column ---------- */
  ART.bulb = (x,y,r)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#f6f3b5" stroke="#8f9596" stroke-width="3"/>`;

  /* ---------- logo ---------- */
  ART.logo = function(){
    return `<div style="text-align:center;line-height:1;">
      <div class="bubble-label white" style="font-size:34px;">WHO HAS THE BIGGEST</div>
      <div class="bubble-label pink" style="font-size:88px;letter-spacing:4px;margin-top:-4px;">BRAIN<span class="bubble-label white" style="font-size:88px;">?</span></div>
      <div style="display:inline-block;margin-top:2px;background:linear-gradient(180deg,#ffe98a,#d4a017);border:3px solid #8a6a10;border-radius:10px;padding:4px 14px;box-shadow:0 3px 6px rgba(0,0,0,.4);">
        <span style="font-family:var(--font-round);font-weight:bold;font-size:20px;color:#fff;-webkit-text-stroke:1px #7a5c0d;letter-spacing:2px;">&#9733; PRO PLAYER CLUB &#9733;</span>
      </div>
    </div>`;
  };

  /* ---------- category circle (used in PLAY icon + backgrounds) ---------- */
  const CAT_COLORS = { analyse:'#e8837a', calculate:'#f0c93d', memorise:'#69bd63', visualise:'#5f8fd0' };
  ART.catColor = c => CAT_COLORS[c];

  function catGlyph(cat, cx, cy, s, fg){
    fg = fg||'#fff';
    if(cat==='calculate') return `<text x="${cx}" y="${cy+s*0.32}" font-family="Comic Sans MS,cursive" font-weight="bold" font-size="${s*0.9}" fill="${fg}" text-anchor="middle">123</text>`;
    if(cat==='analyse') return `<g>${gearPath(cx,cy,s,fg)}</g>`;
    if(cat==='visualise') return `<g><ellipse cx="${cx}" cy="${cy}" rx="${s}" ry="${s*0.62}" fill="${fg}"/><circle cx="${cx}" cy="${cy}" r="${s*0.34}" fill="#3866b0"/><circle cx="${cx+s*0.1}" cy="${cy-s*0.12}" r="${s*0.1}" fill="#fff"/></g>`;
    if(cat==='memorise') return `<g><path d="M${cx-s*0.75} ${cy-s*0.55} L${cx} ${cy-s*0.35} L${cx} ${cy+s*0.6} L${cx-s*0.75} ${cy+s*0.4} Z" fill="${fg}"/><path d="M${cx+s*0.75} ${cy-s*0.55} L${cx} ${cy-s*0.35} L${cx} ${cy+s*0.6} L${cx+s*0.75} ${cy+s*0.4} Z" fill="${fg}" opacity=".85"/></g>`;
    return '';
  }
  function gearPath(cx,cy,s,fg){
    let g = '';
    for(let i=0;i<8;i++){
      const a = i*Math.PI/4;
      g += `<rect x="${cx-s*0.14}" y="${cy-s}" width="${s*0.28}" height="${s*0.34}" rx="${s*0.06}" fill="${fg}" transform="rotate(${a*180/Math.PI} ${cx} ${cy})"/>`;
    }
    g += `<circle cx="${cx}" cy="${cy}" r="${s*0.62}" fill="${fg}"/><circle cx="${cx}" cy="${cy}" r="${s*0.26}" fill="${CAT_COLORS.analyse}"/>`;
    return g;
  }
  ART.catGlyph = catGlyph;

  /* PLAY icon: 4 overlapping category circles */
  ART.iconPlay = function(w){
    w=w||180;
    return `<svg viewBox="0 0 200 190" width="${w}" xmlns="http://www.w3.org/2000/svg">
      <g><circle cx="100" cy="52" r="44" fill="#f0c93d" stroke="#c79a12" stroke-width="3"/>
         <text x="100" y="66" font-family="Comic Sans MS,cursive" font-weight="bold" font-size="34" fill="#fff" text-anchor="middle">123</text></g>
      <g><circle cx="55" cy="102" r="44" fill="#e8728a" stroke="#b4485f" stroke-width="3"/>${gearPath(55,102,30,'#fff')}</g>
      <g><circle cx="145" cy="102" r="44" fill="#5f8fd0" stroke="#3866b0" stroke-width="3"/>
         <ellipse cx="145" cy="102" rx="28" ry="18" fill="#fff"/><circle cx="145" cy="102" r="10" fill="#3866b0"/><circle cx="148" cy="99" r="3.4" fill="#fff"/></g>
      <g><circle cx="100" cy="145" r="40" fill="#69bd63" stroke="#3f8f3d" stroke-width="3"/>
         <path d="M76 132 L100 140 L100 168 L76 160 Z" fill="#fff"/><path d="M124 132 L100 140 L100 168 L124 160 Z" fill="#e8f5e8"/></g>
    </svg>`;
  };

  /* CHALLENGE icon: two boxing gloves */
  ART.iconChallenge = function(w){
    w=w||170;
    return `<svg viewBox="0 0 200 170" width="${w}" xmlns="http://www.w3.org/2000/svg">
      <g transform="rotate(-14 70 80)">
        <path d="M40 40 Q34 96 66 112 L96 112 Q120 100 116 66 Q112 34 78 30 Q46 28 40 40 Z" fill="#4a72c4" stroke="#2d4f96" stroke-width="4"/>
        <rect x="58" y="106" width="42" height="26" rx="9" fill="#3c5fae" stroke="#2d4f96" stroke-width="4"/>
        <path d="M46 52 Q44 84 64 98" stroke="#7da0e0" stroke-width="7" fill="none" stroke-linecap="round"/>
      </g>
      <g transform="rotate(16 130 90)">
        <path d="M104 50 Q98 106 130 122 L160 122 Q184 110 180 76 Q176 44 142 40 Q110 38 104 50 Z" fill="#d8464e" stroke="#a52c34" stroke-width="4"/>
        <rect x="122" y="116" width="42" height="26" rx="9" fill="#c03a42" stroke="#a52c34" stroke-width="4"/>
        <path d="M110 62 Q108 94 128 108" stroke="#eb8a90" stroke-width="7" fill="none" stroke-linecap="round"/>
      </g>
    </svg>`;
  };

  /* INVITE icon: sketchy outline trio (monkey, kid, robot) */
  ART.iconInvite = function(w){
    w=w||190;
    const ink = '#3a3d3a';
    return `<svg viewBox="0 0 220 150" width="${w}" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round">
      <!-- monkey -->
      <circle cx="42" cy="72" r="22"/><circle cx="30" cy="60" r="8"/><circle cx="56" cy="60" r="8"/>
      <ellipse cx="42" cy="80" rx="11" ry="8"/><path d="M36 96 Q30 132 44 140"/><path d="M52 96 Q60 120 50 140"/>
      <path d="M24 88 Q6 96 10 116"/><path d="M60 88 Q78 80 82 64"/>
      <!-- kid with cap -->
      <circle cx="118" cy="52" r="26"/><path d="M92 48 Q118 20 146 46 L150 38 Q120 8 88 40 Z" fill="${ink}"/>
      <path d="M104 58 l6 0 M130 58 l6 0" stroke-width="5"/><path d="M110 68 q9 7 18 0"/>
      <path d="M100 80 Q92 120 104 142"/><path d="M136 80 Q146 118 132 142"/>
      <path d="M96 92 L76 108 M142 92 L162 104"/>
      <path d="M102 84 Q120 96 136 84" />
      <!-- robot -->
      <rect x="172" y="42" width="40" height="34" rx="6"/><rect x="178" y="84" width="30" height="34" rx="5"/>
      <circle cx="184" cy="58" r="5" fill="${ink}"/><circle cx="200" cy="58" r="5" fill="${ink}"/>
      <path d="M180 68 h24 M192 30 v10 M186 122 v14 M200 122 v14"/>
      <circle cx="192" cy="26" r="4"/>
      <path d="M172 92 l-12 12 M212 92 l10 14"/>
      <path d="M182 96 h22 M182 104 h22" stroke-width="3"/>
    </svg>`;
  };

  /* TROPHIES icon: gold cup */
  ART.iconTrophy = function(w){
    w=w||130;
    return `<svg viewBox="0 0 140 140" width="${w}" xmlns="http://www.w3.org/2000/svg">
      <path d="M34 18 h72 l-6 46 q-8 30 -30 30 q-22 0 -30 -30 Z" fill="#f4c430" stroke="#a87d0a" stroke-width="4"/>
      <path d="M34 26 q-26 2 -20 26 q4 20 26 22" fill="none" stroke="#a87d0a" stroke-width="7"/>
      <path d="M106 26 q26 2 20 26 q-4 20 -26 22" fill="none" stroke="#a87d0a" stroke-width="7"/>
      <path d="M44 24 q-2 30 10 48" stroke="#ffe98a" stroke-width="7" fill="none" stroke-linecap="round"/>
      <rect x="62" y="92" width="16" height="16" fill="#d4a017" stroke="#a87d0a" stroke-width="3"/>
      <path d="M46 108 h48 l6 18 h-60 Z" fill="#f4c430" stroke="#a87d0a" stroke-width="4"/>
      <ellipse cx="70" cy="132" rx="34" ry="5" fill="#00000022"/>
    </svg>`;
  };

  /* PROFILE icon: ID card */
  ART.iconProfile = function(w){
    w=w||150;
    return `<svg viewBox="0 0 170 120" width="${w}" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="8" width="158" height="104" rx="10" fill="#f6f4ec" stroke="#8f9596" stroke-width="5"/>
      <rect x="18" y="22" width="44" height="50" rx="5" fill="#cfe0ee" stroke="#8f9596" stroke-width="3"/>
      <circle cx="40" cy="40" r="10" fill="#5f8fd0"/><path d="M24 66 q16 -18 32 0" fill="#5f8fd0"/>
      <rect x="74" y="24" width="76" height="26" rx="4" fill="#69bd63"/>
      <rect x="74" y="58" width="76" height="8" rx="4" fill="#b9bdbe"/>
      <rect x="74" y="72" width="60" height="8" rx="4" fill="#b9bdbe"/>
      <rect x="18" y="86" width="132" height="10" rx="5" fill="#dfe3e4"/>
    </svg>`;
  };

  /* ---------- pinwheel mode icons ---------- */
  function pinwheel(color1,color2,inner,w,vb){
    vb=vb||260; w=w||230;
    let blades='';
    for(let i=0;i<8;i++){
      blades += `<path d="M130 130 L96 18 L164 18 Z" fill="${i%2?color1:color2}" transform="rotate(${i*45} 130 130)"/>`;
    }
    return `<svg viewBox="0 0 260 260" width="${w}" xmlns="http://www.w3.org/2000/svg">
      <g opacity=".95">${blades}</g>${inner}</svg>`;
  }
  ART.iconClassic = function(w){
    const inner = `
      <ellipse cx="98" cy="96" rx="34" ry="27" fill="#4a90d9" stroke="#2d5f9e" stroke-width="3"/>
      <ellipse cx="92" cy="88" rx="14" ry="8" fill="#8ec0ef"/>
      <ellipse cx="166" cy="92" rx="30" ry="24" fill="#e2c23c" stroke="#a88a12" stroke-width="3"/>
      <ellipse cx="160" cy="85" rx="12" ry="7" fill="#f2df8e"/>
      <ellipse cx="112" cy="152" rx="40" ry="32" fill="#c9385e" stroke="#8e1f3d" stroke-width="3"/>
      <ellipse cx="104" cy="142" rx="17" ry="9" fill="#e87d9a"/>
      <ellipse cx="180" cy="150" rx="33" ry="26" fill="#3fa054" stroke="#26703a" stroke-width="3"/>
      <ellipse cx="173" cy="142" rx="13" ry="8" fill="#7fce8e"/>`;
    return pinwheel('#b79fe0','#cdbbec',inner,w);
  };
  ART.iconPro = function(w){
    const inner = `
      <g transform="translate(60,52) scale(.62)"><path d="M20 40 h56 l-8 52 h-40 Z" fill="#f0c93d" stroke="#a8880a" stroke-width="4"/><path d="M30 40 q0 -24 18 -24 q18 0 18 24" fill="none" stroke="#a8880a" stroke-width="6"/></g>
      <g transform="translate(140,34) scale(.6)"><path d="M30 70 q-4 -40 30 -40 q34 0 30 40 q22 30 -30 34 q-52 -4 -30 -34 Z" fill="#fdf7e8" stroke="#c8b88a" stroke-width="4"/><circle cx="60" cy="58" r="22" fill="#f4c430"/><circle cx="53" cy="54" r="4" fill="#232323"/><path d="M70 58 l12 4 l-12 5 Z" fill="#e8862d"/></g>
      <g transform="translate(148,120) scale(.75)"><path d="M8 44 q4 -16 22 -18 l10 -14 q30 -10 52 4 l10 12 q16 4 14 20 l-4 8 h-100 Z" fill="#b03040" stroke="#7d1c29" stroke-width="4"/><circle cx="34" cy="58" r="11" fill="#333"/><circle cx="86" cy="58" r="11" fill="#333"/><path d="M42 26 q22 -8 38 2 l6 10 h-52 Z" fill="#d8dee2"/></g>
      <g transform="translate(52,120) scale(.62)"><rect x="10" y="16" width="58" height="76" rx="8" fill="#dce88e" stroke="#98a83a" stroke-width="4"/><path d="M39 36 q-14 -14 0 -22 q14 8 0 22 q14 -14 22 0 q-8 14 -22 0 q14 14 0 22 q-14 -8 0 -22 q-14 14 -22 0 q8 -14 22 0 Z" fill="#4d8f45"/></g>
      <g transform="translate(104,168) scale(.9)"><rect x="6" y="6" width="34" height="34" rx="6" fill="#c9385e" stroke="#8e1f3d" stroke-width="3"/><path d="M23 13 v20 M13 23 h20" stroke="#fff" stroke-width="6" stroke-linecap="round"/><rect x="44" y="6" width="34" height="34" rx="6" fill="#fff" stroke="#8f9596" stroke-width="3"/><text x="61" y="33" font-family="Comic Sans MS,cursive" font-weight="bold" font-size="26" fill="#232323" text-anchor="middle">3</text></g>`;
    return pinwheel('#e8a13c','#f2bd6a',inner,w);
  };
  ART.iconPractice = function(w){
    const inner = `
      <g transform="rotate(-24 130 130)">
        <rect x="46" y="112" width="168" height="20" rx="10" fill="#4c4f45" stroke="#2e3029" stroke-width="3"/>
        <rect x="34" y="84" width="40" height="76" rx="16" fill="#3a3d34" stroke="#23241f" stroke-width="3"/>
        <rect x="186" y="84" width="40" height="76" rx="16" fill="#3a3d34" stroke="#23241f" stroke-width="3"/>
        <ellipse cx="46" cy="100" rx="9" ry="14" fill="#cfd2c8" opacity=".8"/>
        <ellipse cx="198" cy="100" rx="9" ry="14" fill="#cfd2c8" opacity=".8"/>
      </g>`;
    return pinwheel('#79c7e8','#a5dcf2',inner,w);
  };

  /* ---------- minigame circular icons (practice grid) ---------- */
  const ICON_BG = { analyse:'#e8837a', calculate:'#f0d04a', memorise:'#7cc576', visualise:'#7da7d9' };

  ART.gameIcon = function(gameId, w){
    w=w||132;
    const G = ART._gameIconInner[gameId] || '';
    const cat = window.GAMES ? (window.GAMES.byId(gameId)||{}).category : null;
    const bg = ICON_BG[cat] || '#ccc';
    return `<svg viewBox="0 0 140 140" width="${w}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="70" cy="70" r="66" fill="${bg}"/>
      <circle cx="70" cy="70" r="66" fill="url(#none)"/>
      ${G}
    </svg>`;
  };

  ART._gameIconInner = {
    balance: `<g><path d="M70 46 v34" stroke="#fff" stroke-width="5"/><path d="M36 50 h68" stroke="#fff" stroke-width="5" transform="rotate(-8 70 50)"/>
      <path d="M62 96 a10 10 0 0 1 16 0 l6 14 h-28 Z" fill="#fff"/>
      <g transform="rotate(-8 70 50)"><path d="M28 40 h18 l-3 12 h-12 Z" fill="#f0c93d"/><path d="M33 40 q0 -8 6 -8 q6 0 6 8" stroke="#a8880a" stroke-width="3" fill="none"/>
      <path d="M92 34 q10 -6 14 4 q6 -2 6 6 q4 4 -2 8 h-16 q-8 -8 -2 -18 Z" fill="#8fce6e"/><rect x="106" y="44" width="10" height="10" fill="#5f8fd0"/></g></g>`,
    cubes: `<g transform="translate(24,20)">
      <g><path d="M46 34 l22 -12 22 12 -22 12 Z" fill="#e8607c"/><path d="M46 34 v26 l22 12 v-26 Z" fill="#c23a58"/><path d="M90 34 v26 l-22 12 v-26 Z" fill="#a52c48"/></g>
      <g><path d="M22 62 l22 -12 22 12 -22 12 Z" fill="#cfe8f5"/><path d="M22 62 v24 l22 12 v-24 Z" fill="#a9cfe4"/><path d="M66 62 v24 l-22 12 v-24 Z" fill="#8bb8d4"/></g>
      <g><path d="M66 62 l22 -12 22 12 -22 12 Z" fill="#f0f4f6"/><path d="M66 62 v24 l22 12 v-24 Z" fill="#ccd6dc"/><path d="M110 62 v24 l-22 12 v-24 Z" fill="#aebcc4"/></g></g>`,
    carpath: `<g transform="translate(18,34)"><path d="M4 46 q6 -22 30 -24 l12 -16 q34 -10 58 4 l12 14 q18 4 16 22 l-4 10 h-120 Z" fill="#c0392b" stroke="#8e2418" stroke-width="4"/>
      <path d="M48 8 q24 -8 42 2 l8 12 h-58 Z" fill="#dceef8"/>
      <circle cx="34" cy="60" r="13" fill="#2f3237"/><circle cx="34" cy="60" r="6" fill="#9aa2a8"/>
      <circle cx="94" cy="60" r="13" fill="#2f3237"/><circle cx="94" cy="60" r="6" fill="#9aa2a8"/></g>`,
    missingnum: `<text x="70" y="86" font-family="Comic Sans MS,cursive" font-weight="bold" font-size="40" fill="#232323" text-anchor="middle" transform="rotate(-6 70 70)">2+2 =?</text>`,
    missingsign: `<g><rect x="52" y="26" width="36" height="36" rx="9" fill="#e8607c"/><path d="M70 34 v20 M60 44 h20" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
      <rect x="22" y="54" width="36" height="36" rx="9" fill="#5f8fd0"/><path d="M30 72 h20" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
      <rect x="82" y="54" width="36" height="36" rx="9" fill="#e8a13c"/><path d="M92 64 l16 16 M108 64 l-16 16" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
      <rect x="52" y="82" width="36" height="36" rx="9" fill="#8fce6e"/><path d="M60 100 h20 M70 92 v.1 M70 108 v.1" stroke="#fff" stroke-width="6" stroke-linecap="round"/></g>`,
    mathcombo: `<g><rect x="26" y="40" width="40" height="40" rx="8" fill="#c9385e" stroke="#fff" stroke-width="3"/><path d="M46 50 v20 M36 60 h20" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
      <rect x="72" y="52" width="40" height="40" rx="8" fill="#fff" stroke="#8f9596" stroke-width="3"/><text x="92" y="83" font-family="Comic Sans MS,cursive" font-weight="bold" font-size="30" fill="#232323" text-anchor="middle">3</text>
      <path d="M36 34 l6 8 10 -14" stroke="#3f9e3c" stroke-width="6" fill="none" stroke-linecap="round"/></g>`,
    cardpairs: `<g><g transform="rotate(-14 52 62)"><rect x="30" y="34" width="42" height="56" rx="6" fill="#fff"/><path d="M51 48 l6 12 12 2 -9 9 2 13 -11 -6 -11 6 2 -13 -9 -9 12 -2 Z" fill="#f0c93d"/></g>
      <g transform="rotate(8 88 56)"><rect x="66" y="28" width="42" height="56" rx="6" fill="#fff"/><path d="M87 44 q-12 -12 0 -20 q12 8 0 20 q12 -12 18 0 q-6 12 -18 0 q12 12 0 20 q-12 -8 0 -20 q-12 12 -18 0 q6 -12 18 0 Z" fill="#6db85f"/></g>
      <g transform="rotate(-4 70 96)"><rect x="48" y="68" width="42" height="56" rx="6" fill="#fff"/><path d="M69 112 q-16 -12 -8 -24 q8 -8 8 2 q0 -10 8 -2 q8 12 -8 24 Z" fill="#d84860"/></g></g>`,
    shapeorder: `<g><rect x="34" y="30" width="72" height="84" rx="6" fill="#8a5a2b" stroke="#6b4218" stroke-width="4"/>
      <rect x="44" y="40" width="52" height="64" fill="#fdf7e8"/>
      <ellipse cx="70" cy="86" rx="15" ry="12" fill="#e8e2d4" stroke="#b9ac90" stroke-width="2"/>
      <ellipse cx="63" cy="60" rx="7" ry="17" fill="#e8e2d4" stroke="#b9ac90" stroke-width="2"/>
      <ellipse cx="78" cy="60" rx="7" ry="17" fill="#e8e2d4" stroke="#b9ac90" stroke-width="2"/>
      <circle cx="66" cy="82" r="2" fill="#c0392b"/><circle cx="75" cy="82" r="2" fill="#c0392b"/>
      <g>${[0,1,2,3,4,5,6,7].map(i=>{const a=i*45*Math.PI/180;const x=70+Math.cos(a)*46,y=72+Math.sin(a)*54;return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="4" fill="#f6f3b5"/>`;}).join('')}</g></g>`,
    actionseq: `<g><path d="M40 84 q0 -34 30 -34 q30 0 30 34 l-8 6 -10 -6 -12 8 -12 -8 -10 6 Z" fill="#fdf7e8" stroke="#c8b88a" stroke-width="3"/>
      <path d="M40 86 q-2 28 30 28 q32 0 30 -28 l-8 4 -10 -6 -12 8 -12 -8 -10 6 Z" fill="#f0ead8" stroke="#c8b88a" stroke-width="3"/>
      <circle cx="70" cy="52" r="20" fill="#f4c430"/><circle cx="63" cy="48" r="4" fill="#232323"/><circle cx="77" cy="48" r="4" fill="#232323"/>
      <path d="M66 58 l4 4 l4 -4 Z" fill="#e8862d"/>
      <path d="M52 34 q4 -10 10 -2 M70 28 q6 -8 10 0" stroke="#f4c430" stroke-width="5" fill="none" stroke-linecap="round"/></g>`,
    asteroids: `<g><g transform="translate(18,20)"><path d="M30 6 q26 -10 40 10 q12 20 -4 36 q-20 14 -38 2 q-16 -14 -8 -34 Z" fill="#d98c62"/><ellipse cx="36" cy="22" rx="8" ry="5" fill="#b56a42" transform="rotate(-16 36 22)"/><ellipse cx="56" cy="38" rx="7" ry="4" fill="#b56a42" transform="rotate(12 56 38)"/></g>
      <g transform="translate(62,62)"><path d="M24 4 q22 -8 34 8 q10 18 -4 30 q-16 12 -32 2 q-14 -12 -6 -28 Z" fill="#b6c94e"/><ellipse cx="30" cy="18" rx="7" ry="4" fill="#93a52e" transform="rotate(-10 30 18)"/><ellipse cx="46" cy="30" rx="6" ry="4" fill="#93a52e" transform="rotate(14 46 30)"/></g></g>`,
    jigsaw: `<path d="M38 34 h26 q-8 -18 8 -18 q16 0 8 18 h26 v26 q18 -8 18 8 q0 16 -18 8 v26 h-26 q8 18 -8 18 q-16 0 -8 -18 h-26 v-26 q-18 8 -18 -8 q0 -16 18 -8 Z" fill="#fff" stroke="#9aa0a1" stroke-width="4"/>`,
    hexpath: `<g>${(function(){
        function hx(cx,cy,r,f){let p='';for(let i=0;i<6;i++){const a=(i*60-30)*Math.PI/180;p+=(i?'L':'M')+(cx+r*Math.cos(a)).toFixed(1)+' '+(cy+r*Math.sin(a)).toFixed(1);}return `<path d="${p} Z" fill="${f}" stroke="#fff" stroke-width="3"/>`;}
        return hx(70,44,26,'#f0c93d')+hx(46,84,26,'#5bc2e8')+hx(94,84,26,'#e8a13c')+
          `<path d="M62 40 l6 10 8 -2 -2 -10 Z" fill="#e8b820" stroke="#b8890a" stroke-width="2"/><circle cx="64" cy="42" r="2" fill="#a87d0a"/><circle cx="72" cy="46" r="2" fill="#a87d0a"/>
           <ellipse cx="46" cy="84" rx="12" ry="7" fill="#3aa0cc"/><path d="M32 84 l-6 -5 v10 Z M60 84 l6 -5 v10 Z" fill="#3aa0cc"/>
           <circle cx="94" cy="84" r="10" fill="#d8b56a"/><path d="M94 72 q4 -6 0 -10" stroke="#8a6a30" stroke-width="3" fill="none"/>`;
      })()}</g>`
  };

  /* ---------- misc glyph SVGs ---------- */
  ART.checkMark = (w,color)=>`<svg viewBox="0 0 100 100" width="${w||60}"><path d="M18 52 L42 76 L84 22" stroke="${color||'#fff'}" stroke-width="17" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  ART.crossMark = (w,color)=>`<svg viewBox="0 0 100 100" width="${w||60}"><path d="M24 24 L76 76 M76 24 L24 76" stroke="${color||'#fff'}" stroke-width="16" fill="none" stroke-linecap="round"/></svg>`;
  ART.backArrow = (w)=>`<svg viewBox="0 0 100 100" width="${w||40}"><path d="M62 18 Q28 22 24 50 L14 44 L30 72 L46 46 L34 42 Q40 30 64 30 Q84 30 84 52 Q84 66 70 72 L76 84 Q96 74 96 52 Q94 22 62 18 Z" fill="#fff"/></svg>`;
  ART.powerIcon = (w)=>`<svg viewBox="0 0 100 100" width="${w||30}"><circle cx="50" cy="54" r="30" fill="none" stroke="#d43f51" stroke-width="11"/><rect x="44" y="12" width="12" height="34" rx="6" fill="#d43f51" stroke="#fff" stroke-width="4"/></svg>`;
  ART.globe = (w)=>`<svg viewBox="0 0 100 100" width="${w||34}"><circle cx="50" cy="50" r="38" fill="#fff"/><path d="M50 12 a38 38 0 0 1 0 76 a20 38 0 0 0 0 -76 Z" fill="#0d0d0d"/><path d="M50 12 a20 38 0 0 1 0 76 M12 50 h76 M20 30 h60 M20 70 h60" stroke="#0d0d0d" stroke-width="4" fill="none"/><circle cx="50" cy="50" r="38" fill="none" stroke="#fff" stroke-width="5"/></svg>`;
  ART.eyeIcon = (w)=>`<svg viewBox="0 0 100 60" width="${w||40}"><ellipse cx="50" cy="30" rx="46" ry="27" fill="#fff"/><circle cx="50" cy="30" r="15" fill="#0d0d0d"/><circle cx="55" cy="25" r="5" fill="#fff"/></svg>`;
  ART.speaker = (w,on)=>`<svg viewBox="0 0 100 100" width="${w||36}"><path d="M14 38 h18 L56 16 V84 L32 62 H14 Z" fill="#fff"/>${on?`<path d="M66 32 q12 18 0 36 M76 22 q20 28 0 56" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round"/>`:`<path d="M66 36 l24 28 M90 36 L66 64" stroke="#fff" stroke-width="8" stroke-linecap="round"/>`}</svg>`;

  /* brain (results) */
  ART.brain = function(w,color){
    color = color||'#e0559b';
    return `<svg viewBox="0 0 220 180" width="${w||180}" xmlns="http://www.w3.org/2000/svg">
      <path d="M104 22 q-30 -16 -50 6 q-28 6 -26 34 q-18 16 -6 38 q-4 26 22 32 q10 22 36 16 q16 14 30 2 l0 -122 q-2 -4 -6 -6 Z" fill="${color}" stroke="#a72d6d" stroke-width="5"/>
      <path d="M116 22 q30 -16 50 6 q28 6 26 34 q18 16 6 38 q4 26 -22 32 q-10 22 -36 16 q-16 14 -30 2 l0 -122 q2 -4 6 -6 Z" fill="${color}" stroke="#a72d6d" stroke-width="5" opacity=".92"/>
      <path d="M110 26 v124" stroke="#a72d6d" stroke-width="5"/>
      <path d="M58 44 q20 -4 26 12 M40 80 q16 -8 30 4 M46 116 q18 -6 28 6 M78 58 q-4 20 10 30
               M162 44 q-20 -4 -26 12 M180 80 q-16 -8 -30 4 M174 116 q-18 -6 -28 6 M142 58 q4 20 -10 30"
        stroke="#a72d6d" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <path d="M84 150 q26 14 52 0 l-6 18 q-20 10 -40 0 Z" fill="#d8a0be" stroke="#a72d6d" stroke-width="4"/>
    </svg>`;
  };

  /* ---------- shared item glyphs (balance, hex path, cards) ---------- */
  ART.items = {
    bag: c=>`<g><path d="M20 40 h60 l-8 54 h-44 Z" fill="${c||'#f0c93d'}" stroke="#a8880a" stroke-width="4"/><path d="M32 40 q0 -26 18 -26 q18 0 18 26" fill="none" stroke="#a8880a" stroke-width="6"/></g>`,
    shoe: c=>`<g><path d="M14 66 q2 -18 20 -16 q10 2 18 -8 q10 -14 18 -6 q6 22 22 24 q8 2 6 14 l-2 6 h-78 Z" fill="${c||'#d84860'}" stroke="#9e2c40" stroke-width="4"/><path d="M14 74 h80 v8 h-80 Z" fill="#5a3d2e"/><path d="M50 44 l8 6 M58 36 l8 6" stroke="#fff" stroke-width="3"/></g>`,
    broccoli: c=>`<g><circle cx="38" cy="34" r="16" fill="${c||'#4d8f45'}"/><circle cx="58" cy="26" r="14" fill="#5fa855"/><circle cx="72" cy="38" r="13" fill="#4d8f45"/><circle cx="55" cy="42" r="15" fill="#6db85f"/><path d="M50 54 l4 34 h8 l4 -34" fill="#a8cf70" stroke="#7ca648" stroke-width="3"/></g>`,
    mug: c=>`<g><rect x="26" y="26" width="48" height="58" rx="8" fill="${c||'#5f8fd0'}" stroke="#3866b0" stroke-width="4"/><path d="M74 40 q20 0 20 16 q0 16 -20 16" fill="none" stroke="#3866b0" stroke-width="8"/><ellipse cx="50" cy="28" rx="24" ry="7" fill="#8ab4e4" stroke="#3866b0" stroke-width="3"/></g>`,
    ball: c=>`<g><circle cx="50" cy="52" r="34" fill="${c||'#e8a13c'}" stroke="#b06f14" stroke-width="4"/><path d="M16 52 h68 M50 18 v68 M26 28 q24 24 48 0 M26 76 q24 -24 48 0" stroke="#b06f14" stroke-width="3.5" fill="none"/></g>`,
    book: c=>`<g><path d="M18 26 L50 34 L82 26 L82 76 L50 84 L18 76 Z" fill="${c||'#8fce6e'}" stroke="#4f8f3d" stroke-width="4"/><path d="M50 34 V84" stroke="#4f8f3d" stroke-width="4"/><path d="M26 38 L44 42 M26 48 L44 52 M56 42 L74 38 M56 52 L74 48" stroke="#fff" stroke-width="3"/></g>`,
    cheese: c=>`<g><path d="M14 66 L86 34 L88 72 L14 74 Z" fill="${c||'#f4c430'}" stroke="#b8890a" stroke-width="4"/><circle cx="40" cy="62" r="6" fill="#d8a818"/><circle cx="62" cy="56" r="5" fill="#d8a818"/><circle cx="74" cy="64" r="4" fill="#d8a818"/></g>`,
    candy: c=>`<g><ellipse cx="50" cy="52" rx="24" ry="16" fill="${c||'#5bc2e8'}" stroke="#2d8cb4" stroke-width="4"/><path d="M26 52 l-16 -12 v24 Z M74 52 l16 -12 v24 Z" fill="${c||'#5bc2e8'}" stroke="#2d8cb4" stroke-width="4"/><path d="M42 44 q8 8 0 16 M58 44 q-8 8 0 16" stroke="#bde8f6" stroke-width="4" fill="none"/></g>`,
    onion: c=>`<g><circle cx="50" cy="58" r="26" fill="${c||'#d8b56a'}" stroke="#a3803c" stroke-width="4"/><path d="M50 32 q6 -10 0 -18 M42 34 q-8 -6 -6 -14 M58 34 q8 -6 6 -14" stroke="#8a6a30" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M36 48 q14 -10 28 0 M32 60 q18 -12 36 0" stroke="#b99148" stroke-width="3" fill="none"/></g>`,
    drop: c=>`<path d="M50 14 q30 34 30 52 q0 24 -30 24 q-30 0 -30 -24 q0 -18 30 -52 Z" fill="${c||'#7ba7dc'}"/>`,
    clover: c=>`<path d="M50 52 q-20 -20 -4 -32 q12 -6 12 8 q0 -14 12 -8 q16 12 -4 32 q20 -8 24 8 q0 14 -16 10 q14 6 4 18 q-12 8 -20 -10 q-2 20 -8 20 q-6 0 -8 -20 q-8 18 -20 10 q-10 -12 4 -18 q-16 4 -16 -10 q4 -16 24 -8 Z" fill="${c||'#6db85f'}" transform="translate(2,-4)"/>`,
    star: c=>`<path d="M50 12 l11 24 26 3 -19 18 5 26 -23 -13 -23 13 5 -26 -19 -18 26 -3 Z" fill="${c||'#f0c93d'}" stroke="#c79a12" stroke-width="3"/>`,
    heart: c=>`<path d="M50 84 q-34 -24 -30 -46 q3 -16 18 -16 q9 0 12 10 q3 -10 12 -10 q15 0 18 16 q4 22 -30 46 Z" fill="${c||'#d84860'}"/>`,
    moon: c=>`<path d="M62 14 a38 38 0 1 0 24 62 a30 30 0 0 1 -24 -62 Z" fill="${c||'#e8d44a'}" stroke="#b8a418" stroke-width="3"/>`,
    bolt: c=>`<path d="M56 10 L28 56 h16 L38 92 L74 42 h-18 Z" fill="${c||'#f0a03c'}" stroke="#b8720a" stroke-width="3"/>`
  };
  ART.itemSVG = function(name, w, color){
    return `<svg viewBox="0 0 100 100" width="${w||70}" xmlns="http://www.w3.org/2000/svg">${ART.items[name](color)}</svg>`;
  };
  ART.itemNames = ['bag','shoe','broccoli','mug','ball','book'];

  /* animals for shape order frames */
  ART.animals = {
    rabbit: `<g><ellipse cx="50" cy="70" rx="22" ry="17" fill="#e8e2d4" stroke="#b9ac90" stroke-width="3"/><ellipse cx="41" cy="34" rx="8" ry="22" fill="#e8e2d4" stroke="#b9ac90" stroke-width="3"/><ellipse cx="59" cy="34" rx="8" ry="22" fill="#e8e2d4" stroke="#b9ac90" stroke-width="3"/><ellipse cx="41" cy="34" rx="3.5" ry="14" fill="#f0b8c8"/><ellipse cx="59" cy="34" rx="3.5" ry="14" fill="#f0b8c8"/><circle cx="43" cy="66" r="3" fill="#232323"/><circle cx="57" cy="66" r="3" fill="#232323"/><path d="M47 76 q3 3 6 0" stroke="#c0392b" stroke-width="2.5" fill="none"/></g>`,
    cat: `<g><circle cx="50" cy="60" r="26" fill="#e8a13c" stroke="#b06f14" stroke-width="3"/><path d="M28 44 l-4 -20 16 10 Z M72 44 l4 -20 -16 10 Z" fill="#e8a13c" stroke="#b06f14" stroke-width="3"/><circle cx="41" cy="56" r="3" fill="#232323"/><circle cx="59" cy="56" r="3" fill="#232323"/><path d="M44 68 q6 5 12 0 M30 62 l-12 -2 M30 68 l-12 4 M70 62 l12 -2 M70 68 l12 4" stroke="#232323" stroke-width="2.4" fill="none"/></g>`,
    dog: `<g><ellipse cx="50" cy="58" rx="26" ry="24" fill="#b98d63" stroke="#8a6440" stroke-width="3"/><ellipse cx="26" cy="52" rx="9" ry="16" fill="#8a6440"/><ellipse cx="74" cy="52" rx="9" ry="16" fill="#8a6440"/><circle cx="41" cy="54" r="3.4" fill="#232323"/><circle cx="59" cy="54" r="3.4" fill="#232323"/><ellipse cx="50" cy="66" rx="7" ry="5" fill="#232323"/><path d="M50 70 v6 M44 78 q6 5 12 0" stroke="#232323" stroke-width="2.4" fill="none"/></g>`,
    pig: `<g><circle cx="50" cy="58" r="26" fill="#f0a8c0" stroke="#c86e94" stroke-width="3"/><path d="M28 40 l-4 -14 14 6 Z M72 40 l4 -14 -14 6 Z" fill="#f0a8c0" stroke="#c86e94" stroke-width="3"/><ellipse cx="50" cy="64" rx="11" ry="8" fill="#e086ac"/><circle cx="46" cy="64" r="2.4" fill="#84395c"/><circle cx="54" cy="64" r="2.4" fill="#84395c"/><circle cx="40" cy="50" r="3" fill="#232323"/><circle cx="60" cy="50" r="3" fill="#232323"/></g>`,
    owl: `<g><ellipse cx="50" cy="58" rx="25" ry="27" fill="#8a7a5c" stroke="#5f5340" stroke-width="3"/><circle cx="40" cy="50" r="10" fill="#f6f1e0"/><circle cx="60" cy="50" r="10" fill="#f6f1e0"/><circle cx="40" cy="50" r="4" fill="#232323"/><circle cx="60" cy="50" r="4" fill="#232323"/><path d="M46 62 l4 6 4 -6 Z" fill="#e8a13c"/><path d="M30 36 l6 -10 M70 36 l-6 -10" stroke="#5f5340" stroke-width="3"/><path d="M34 72 q6 6 12 2 M66 72 q-6 6 -12 2" stroke="#5f5340" stroke-width="2.4" fill="none"/></g>`,
    frog: `<g><ellipse cx="50" cy="62" rx="27" ry="21" fill="#6db85f" stroke="#3f8f3d" stroke-width="3"/><circle cx="36" cy="40" r="10" fill="#6db85f" stroke="#3f8f3d" stroke-width="3"/><circle cx="64" cy="40" r="10" fill="#6db85f" stroke="#3f8f3d" stroke-width="3"/><circle cx="36" cy="40" r="4" fill="#232323"/><circle cx="64" cy="40" r="4" fill="#232323"/><path d="M38 68 q12 8 24 0" stroke="#2c6e2c" stroke-width="3" fill="none"/></g>`
  };
  ART.animalSVG = (name,w)=>`<svg viewBox="0 0 100 100" width="${w||72}">${ART.animals[name]}</svg>`;
  ART.animalNames = Object.keys(ART.animals);

  /* egg + chick */
  ART.egg = (w)=>`<svg viewBox="0 0 100 120" width="${w||84}"><path d="M50 8 q34 30 34 66 q0 38 -34 38 q-34 0 -34 -38 q0 -36 34 -66 Z" fill="#fdf7e8" stroke="#c8b88a" stroke-width="4"/><ellipse cx="38" cy="42" rx="9" ry="14" fill="#fff" opacity=".7"/></svg>`;
  ART.eggHatched = (w)=>`<svg viewBox="0 0 100 120" width="${w||84}">
    <path d="M16 74 q0 -20 8 -34 l8 10 10 -12 12 12 12 -12 10 12 8 -10 q8 14 8 34 Z" fill="#fdf7e8" stroke="#c8b88a" stroke-width="4" opacity="0"/>
    <circle cx="50" cy="52" r="24" fill="#f4c430" stroke="#c79a12" stroke-width="3"/>
    <circle cx="42" cy="48" r="4" fill="#232323"/><circle cx="58" cy="48" r="4" fill="#232323"/>
    <path d="M46 58 l4 5 4 -5 Z" fill="#e8862d"/>
    <path d="M16 76 q0 36 34 36 q34 0 34 -36 l-8 -8 -8 10 -9 -10 -9 10 -9 -10 -9 10 -8 -10 Z" fill="#fdf7e8" stroke="#c8b88a" stroke-width="4"/>
  </svg>`;

  /* asteroid with craters; hue base color */
  ART.asteroidSVG = function(color, dark, size, label, rot){
    return `<svg viewBox="0 0 140 140" width="${size}" style="transform:rotate(${rot}deg);overflow:visible;">
      <path d="M42 12 q34 -14 62 6 q26 20 20 52 q-6 34 -38 44 q-34 10 -58 -12 q-22 -22 -12 -54 q8 -26 26 -36 Z" fill="${color}"/>
      <ellipse cx="42" cy="34" rx="12" ry="7" fill="${dark}" transform="rotate(-18 42 34)"/>
      <ellipse cx="92" cy="26" rx="10" ry="6" fill="${dark}" transform="rotate(12 92 26)"/>
      <ellipse cx="112" cy="66" rx="8" ry="12" fill="${dark}"/>
      <ellipse cx="88" cy="108" rx="12" ry="7" fill="${dark}" transform="rotate(8 88 108)"/>
      <ellipse cx="36" cy="96" rx="9" ry="13" fill="${dark}" transform="rotate(-10 36 96)"/>
      <ellipse cx="22" cy="60" rx="7" ry="10" fill="${dark}"/>
      <text x="70" y="86" text-anchor="middle" font-family="Comic Sans MS,cursive" font-weight="bold" font-size="44" fill="#111">${label}</text>
    </svg>`;
  };

  /* card back: grey sunburst + brain doodle */
  ART.cardBack = function(){
    let rays='';
    for(let i=0;i<12;i++){
      rays += `<path d="M50 70 L${(50+90*Math.cos((i*30)*Math.PI/180)).toFixed(1)} ${(70+90*Math.sin((i*30)*Math.PI/180)).toFixed(1)} L${(50+90*Math.cos((i*30+15)*Math.PI/180)).toFixed(1)} ${(70+90*Math.sin((i*30+15)*Math.PI/180)).toFixed(1)} Z" fill="#8f9596"/>`;
    }
    return `<svg viewBox="0 0 100 140" width="100%" height="100%" preserveAspectRatio="none">
      <rect width="100" height="140" fill="#6f7577"/>
      <g clip-path="url(#cb)">${rays}</g>
      <clipPath id="cb"><rect width="100" height="140"/></clipPath>
      <g>${rays}</g>
      <path d="M50 44 q-16 -10 -24 2 q-12 4 -8 16 q-8 8 0 16 q0 12 12 12 q6 8 14 4 q10 6 16 -2 q12 2 14 -10 q10 -6 4 -16 q4 -12 -8 -16 q-6 -12 -20 -6 Z" fill="none" stroke="#fff" stroke-width="4"/>
      <path d="M50 42 v52 M38 54 q8 4 10 12 M62 66 q-8 2 -10 10" stroke="#fff" stroke-width="3" fill="none"/>
    </svg>`;
  };

  /* spotlight beam */
  ART.spotlight = function(x, y, angle, len, w){
    return `<svg class="spotlight" style="left:${x}px;top:${y}px;overflow:visible;" width="10" height="10" viewBox="0 0 10 10">
      <g transform="rotate(${angle})">
        <path d="M0 0 L${-w/2} ${len} L${w/2} ${len} Z" fill="url(#sg${x})"/>
        <defs><linearGradient id="sg${x}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fffef0" stop-opacity=".85"/>
          <stop offset="1" stop-color="#fffef0" stop-opacity="0"/>
        </linearGradient></defs>
        <rect x="-14" y="-18" width="28" height="30" rx="5" fill="#c9ced0"/>
        <rect x="-17" y="6" width="34" height="9" rx="4" fill="#aab0b2"/>
      </g>
    </svg>`;
  };

  /* audience silhouettes */
  ART.audience = function(){
    let heads='';
    for(let i=0;i<14;i++){
      const x = 20 + i*74 + (i%2?18:0), r = 26 + (i*7)%14, y = 150 - (i%3)*12;
      heads += `<circle cx="${x}" cy="${y}" r="${r}" fill="#0a2027"/><rect x="${x-r-8}" y="${y+r*0.6}" width="${2*r+16}" height="60" rx="18" fill="#0a2027"/>`;
    }
    return `<svg class="audience" viewBox="0 0 1060 200" preserveAspectRatio="none">${heads}</svg>`;
  };

  /* car (car path game) */
  ART.carSVG = function(w,color){
    color = color||'#c0392b';
    return `<svg viewBox="0 0 140 80" width="${w||110}">
      <path d="M8 52 q6 -20 28 -22 l12 -16 q30 -10 54 4 l12 14 q18 4 16 20 l-3 8 h-116 Z" fill="${color}" stroke="#7d1c29" stroke-width="4"/>
      <path d="M52 14 q22 -8 40 2 l8 12 h-54 Z" fill="#dceef8" stroke="#7d1c29" stroke-width="3"/>
      <circle cx="38" cy="60" r="14" fill="#2f3237"/><circle cx="38" cy="60" r="6" fill="#9aa2a8"/>
      <circle cx="104" cy="60" r="14" fill="#2f3237"/><circle cx="104" cy="60" r="6" fill="#9aa2a8"/>
    </svg>`;
  };

  /* garage for car path */
  ART.garageSVG = function(w, color, label){
    return `<svg viewBox="0 0 120 110" width="${w||96}">
      <path d="M8 44 L60 10 L112 44 V102 H8 Z" fill="${color}" stroke="#3a3d3a" stroke-width="4"/>
      <rect x="28" y="54" width="64" height="48" rx="4" fill="#3a3d3a"/>
      <rect x="32" y="58" width="56" height="8" fill="#5a5f61"/><rect x="32" y="70" width="56" height="8" fill="#5a5f61"/><rect x="32" y="82" width="56" height="8" fill="#5a5f61"/>
      <circle cx="60" cy="32" r="13" fill="#fff" stroke="#3a3d3a" stroke-width="3"/>
      <text x="60" y="41" text-anchor="middle" font-family="Comic Sans MS,cursive" font-weight="bold" font-size="24" fill="#3a3d3a">${label}</text>
    </svg>`;
  };

  window.ART = ART;
})();
