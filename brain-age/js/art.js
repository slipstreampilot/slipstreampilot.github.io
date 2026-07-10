/* ============================================================
   Original SVG art — a generic low-poly professor guide and
   simple line-art props, all drawn from scratch.
   ============================================================ */
(function(){
  const ART={};

  /* ---------- polygonal professor head (original design) ----------
     mood: 'neutral' | 'happy' | 'think' */
  ART.professor=function(mood,w){
    mood=mood||'neutral'; w=w||190;
    const mouth = mood==='happy'
      ? `<path d="M78 128 Q100 148 122 128 L116 122 Q100 134 84 122 Z" fill="#5f4a3e"/>`
      : mood==='think'
      ? `<path d="M84 132 L116 130 L115 137 L85 139 Z" fill="#5f4a3e"/>`
      : `<path d="M82 132 Q100 140 118 132 L116 126 Q100 132 84 126 Z" fill="#5f4a3e"/>`;
    const brows = mood==='think'
      ? `<path d="M58 74 L88 70 L88 78 L58 82 Z" fill="#8d8d88"/>
         <path d="M112 66 L142 72 L142 80 L112 74 Z" fill="#8d8d88"/>`
      : `<path d="M58 70 L88 68 L88 76 L58 78 Z" fill="#8d8d88"/>
         <path d="M112 68 L142 70 L142 78 L112 76 Z" fill="#8d8d88"/>`;
    return `<svg viewBox="0 0 200 170" width="${w}" xmlns="http://www.w3.org/2000/svg">
      <!-- faceted head -->
      <polygon points="52,34 100,20 148,34 162,72 154,120 128,152 100,160 72,152 46,120 38,72" fill="#e8c8a8"/>
      <polygon points="52,34 100,20 100,58 62,60" fill="#f0d4b6"/>
      <polygon points="100,20 148,34 138,60 100,58" fill="#e2bd9a"/>
      <polygon points="38,72 62,60 58,100 46,120" fill="#dcb28c"/>
      <polygon points="162,72 138,60 142,100 154,120" fill="#d4a880"/>
      <polygon points="46,120 72,152 100,160 100,120" fill="#e2bd9a" opacity=".55"/>
      <polygon points="154,120 128,152 100,160 100,120" fill="#d4a880" opacity=".45"/>
      <!-- gray polygonal hair sides -->
      <polygon points="38,72 52,34 64,40 54,76" fill="#b8b8b2"/>
      <polygon points="162,72 148,34 136,40 146,76" fill="#b0b0aa"/>
      <polygon points="52,34 100,16 148,34 140,26 100,10 60,26" fill="#c2c2bc"/>
      <!-- ears -->
      <polygon points="34,80 46,74 48,100 38,102" fill="#dcb28c"/>
      <polygon points="166,80 154,74 152,100 162,102" fill="#d4a880"/>
      ${brows}
      <!-- round wire glasses -->
      <circle cx="73" cy="90" r="21" fill="#fff" fill-opacity=".55" stroke="#3a3a36" stroke-width="4"/>
      <circle cx="127" cy="90" r="21" fill="#fff" fill-opacity=".55" stroke="#3a3a36" stroke-width="4"/>
      <path d="M94 90 h12" stroke="#3a3a36" stroke-width="4"/>
      <path d="M52 88 L34 82 M148 88 L166 82" stroke="#3a3a36" stroke-width="4"/>
      <!-- eyes -->
      <polygon points="68,88 80,86 80,94 68,96" fill="#33332f"/>
      <polygon points="120,86 132,88 132,96 120,94" fill="#33332f"/>
      <!-- nose -->
      <polygon points="96,96 104,96 108,116 92,116" fill="#d4a880"/>
      <!-- gray mustache, faceted -->
      <polygon points="74,122 100,118 126,122 118,132 100,128 82,132" fill="#a8a8a2"/>
      ${mouth}
    </svg>`;
  };

  /* speed-grade icons: simple line art */
  ART.gradeIcon=function(grade,w){
    w=w||46; const s='stroke="#22221f" stroke-width="4" fill="none" stroke-linecap="round"';
    const inner={
      Walking:`<circle cx="50" cy="24" r="9" ${s}/><path d="M50 33 L50 58 M50 42 L34 52 M50 42 L66 54 M50 58 L38 84 M50 58 L62 84" ${s}/>`,
      Bicycle:`<circle cx="28" cy="66" r="16" ${s}/><circle cx="72" cy="66" r="16" ${s}/><path d="M28 66 L44 40 L64 40 L72 66 M44 40 L54 66 L28 66 M40 34 h12" ${s}/>`,
      Car:`<path d="M14 62 h72 v14 h-72 Z M24 62 L34 44 h32 L76 62" ${s}/><circle cx="32" cy="78" r="8" ${s}/><circle cx="68" cy="78" r="8" ${s}/>`,
      Train:`<rect x="22" y="30" width="56" height="42" rx="6" ${s}/><path d="M22 52 h56 M34 30 v22 M66 30 v22 M30 84 l6 -12 M70 84 l-6 -12" ${s}/><circle cx="38" cy="78" r="5" ${s}/><circle cx="62" cy="78" r="5" ${s}/>`,
      Jet:`<path d="M16 60 L60 52 L84 30 L74 56 L84 62 L60 64 L36 74 Z" ${s}/><path d="M40 62 L28 78" ${s}/>`,
      Rocket:`<path d="M50 12 Q66 34 62 62 L38 62 Q34 34 50 12 Z" ${s}/><circle cx="50" cy="40" r="7" ${s}/><path d="M38 62 L30 78 L42 70 M62 62 L70 78 L58 70 M46 66 L50 84 L54 66" ${s}/>`
    }[grade]||'';
    return `<svg viewBox="0 0 100 96" width="${w}">${inner}</svg>`;
  };

  ART.check=(w,c)=>`<svg viewBox="0 0 100 100" width="${w||70}"><path d="M20 54 L44 76 L82 24" stroke="${c||'#2e8b3a'}" stroke-width="13" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  ART.cross=(w,c)=>`<svg viewBox="0 0 100 100" width="${w||70}"><circle cx="50" cy="50" r="38" stroke="${c||'#c0392b'}" stroke-width="11" fill="none"/></svg>`;
  /* note: Brain Age marks wrong with a red circle? original uses red X-ish scribble; we use a red ring + optional X */
  ART.wrongX=(w)=>`<svg viewBox="0 0 100 100" width="${w||70}"><path d="M26 26 L74 74 M74 26 L26 74" stroke="#c0392b" stroke-width="12" fill="none" stroke-linecap="round"/></svg>`;

  /* analog clock */
  ART.clock=function(h,m,w){
    w=w||170;
    let ticks='';
    for(let i=0;i<12;i++){
      const a=i*30*Math.PI/180;
      const x1=100+78*Math.sin(a), y1=100-78*Math.cos(a);
      const x2=100+88*Math.sin(a), y2=100-88*Math.cos(a);
      ticks+=`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#22221f" stroke-width="${i%3===0?6:3}"/>`;
      const nx=100+64*Math.sin(a), ny=100-64*Math.cos(a);
      const num=i===0?12:i;
      ticks+=`<text x="${nx.toFixed(1)}" y="${(ny+8).toFixed(1)}" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-size="22" fill="#22221f">${num}</text>`;
    }
    const ha=((h%12)+m/60)*30*Math.PI/180;
    const ma=m*6*Math.PI/180;
    return `<svg viewBox="0 0 200 200" width="${w}">
      <circle cx="100" cy="100" r="94" fill="#fff" stroke="#22221f" stroke-width="5"/>
      ${ticks}
      <line x1="100" y1="100" x2="${(100+42*Math.sin(ha)).toFixed(1)}" y2="${(100-42*Math.cos(ha)).toFixed(1)}" stroke="#22221f" stroke-width="9" stroke-linecap="round"/>
      <line x1="100" y1="100" x2="${(100+66*Math.sin(ma)).toFixed(1)}" y2="${(100-66*Math.cos(ma)).toFixed(1)}" stroke="#3a6ea5" stroke-width="6" stroke-linecap="round"/>
      <circle cx="100" cy="100" r="7" fill="#22221f"/>
    </svg>`;
  };

  /* simple house (head count) */
  ART.house=function(w){
    w=w||300;
    return `<svg viewBox="0 0 300 220" width="${w}">
      <polygon points="150,14 286,92 264,92 264,210 36,210 36,92 14,92" fill="#fff" stroke="#22221f" stroke-width="5" stroke-linejoin="round"/>
      <rect x="120" y="140" width="60" height="70" fill="#efede2" stroke="#22221f" stroke-width="4"/>
      <circle cx="168" cy="176" r="4" fill="#22221f"/>
      <rect x="56" y="110" width="44" height="38" fill="#efede2" stroke="#22221f" stroke-width="4"/>
      <rect x="200" y="110" width="44" height="38" fill="#efede2" stroke="#22221f" stroke-width="4"/>
      <path d="M56 129 h44 M78 110 v38 M200 129 h44 M222 110 v38" stroke="#22221f" stroke-width="3"/>
    </svg>`;
  };

  /* stick figure walking */
  ART.figure=function(w,color){
    w=w||44; color=color||'#22221f';
    const s=`stroke="${color}" stroke-width="6" fill="none" stroke-linecap="round"`;
    return `<svg viewBox="0 0 60 100" width="${w}">
      <circle cx="30" cy="16" r="11" ${s}/>
      <path d="M30 27 L30 58 M30 38 L14 50 M30 38 L46 50 M30 58 L18 86 M30 58 L42 86" ${s}/>
    </svg>`;
  };

  /* small pencil doodle for title */
  ART.pencil=function(w){
    w=w||120;
    return `<svg viewBox="0 0 200 60" width="${w}">
      <path d="M10 40 L140 24 L186 30 L142 44 Z" fill="#fff" stroke="#22221f" stroke-width="4" stroke-linejoin="round"/>
      <path d="M140 24 L186 30 L142 44" fill="#e8c8a8" stroke="#22221f" stroke-width="4" stroke-linejoin="round"/>
      <path d="M186 30 L174 27 L176 36 Z" fill="#22221f"/>
      <path d="M30 38 L120 27" stroke="#b5b2a8" stroke-width="3"/>
    </svg>`;
  };

  /* stamp: circular red date stamp */
  ART.stamp=function(w,big){
    w=w||36;
    return `<svg viewBox="0 0 100 100" width="${w}" style="opacity:.85;">
      <circle cx="50" cy="50" r="${big?44:36}" fill="none" stroke="#c0392b" stroke-width="7"/>
      <path d="M32 52 L46 66 L70 34" stroke="#c0392b" stroke-width="9" fill="none" stroke-linecap="round"/>
    </svg>`;
  };

  window.ART=ART;
})();
