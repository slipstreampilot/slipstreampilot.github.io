/* Dino Drop: game engine, controls, sound, music and mobile guards.
   Runs entirely in the browser; no libraries, no network. */
'use strict';
(() => {

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
const COLS = 10;
const ROWS = 20;
const HIDDEN = 2;                 // invisible rows above the board where pieces spawn
const TOTAL_ROWS = ROWS + HIDDEN;

const MODES = {
  // gravity: ms per row at level 1; speedup: multiplier per level; linesPerLevel; lockDelay ms
  easy:   { label: 'Easy',   gravity: 950, speedup: 1.0,  minGravity: 950, linesPerLevel: 10, lockDelay: 900, ghost: true,  next: true,  rescue: true,  das: 260, arr: 110 },
  medium: { label: 'Medium', gravity: 750, speedup: 0.86, minGravity: 120, linesPerLevel: 10, lockDelay: 600, ghost: false, next: true,  rescue: false, das: 220, arr: 85  },
  hard:   { label: 'Hard',   gravity: 420, speedup: 0.82, minGravity: 60,  linesPerLevel: 8,  lockDelay: 450, ghost: false, next: false, rescue: false, das: 180, arr: 60  },
};
const SOFT_DROP_MS = 35;          // speed while the down button is held
const MAX_LOCK_RESETS = 15;       // moves allowed after landing before the piece locks anyway
const CLEAR_ANIM_MS = 380;
const RESCUE_ANIM_MS = 1100;
const RESCUE_ROWS = 8;
const LINE_POINTS = [0, 100, 300, 500, 800];
const PIECE_POINTS = 10;

const SHAPES = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1],[0,0,0]],
  S: [[0,1,1],[1,1,0],[0,0,0]],
  Z: [[1,1,0],[0,1,1],[0,0,0]],
  L: [[0,0,1],[1,1,1],[0,0,0]],
  J: [[1,0,0],[1,1,1],[0,0,0]],
};
// which cell of each shape (row, col in the spawn orientation) wears the dino face
const FACE_CELL = { I: [1,3], O: [0,1], T: [0,1], S: [0,2], Z: [1,2], L: [0,2], J: [0,0] };
const KINDS = Object.keys(SHAPES);

// ---------------------------------------------------------------------------
// DOM
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const app = $('app');
const boardCanvas = $('board');
const nextCanvas = $('next');
const ui = {
  score: $('score'), best: $('best'), level: $('level'), lines: $('lines'),
  nextName: $('next-name'), side: $('side'), modeBadge: $('mode-badge'),
  menu: $('menu'), pause: $('pause'), over: $('over'), rotateHint: $('rotate-hint'),
  finalScore: $('final-score'), newBest: $('newbest'),
  sound: $('btn-sound'), music: $('btn-music'),
};

// ---------------------------------------------------------------------------
// Saved data (high scores, sound settings). Storage can be unavailable
// (private browsing, blocked site data), so every access is guarded.
// ---------------------------------------------------------------------------
const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem('dinodrop.' + key); return v == null ? fallback : JSON.parse(v); }
    catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('dinodrop.' + key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  },
};
const bests = Object.assign({ easy: 0, medium: 0, hard: 0 }, store.get('best', {}));
const settings = Object.assign({ sound: true, music: true }, store.get('settings', {}));

// ---------------------------------------------------------------------------
// Sound: everything is synthesised with the Web Audio API (no audio files).
// ---------------------------------------------------------------------------
const Sound = (() => {
  let ctx = null, master, sfxBus, musicBus, noiseBuf;
  let musicTimer = null, nextNoteTime = 0, step = 0, musicPlaying = false;

  function create() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    // Respect the iPhone silent switch and let a parent's podcast keep playing.
    try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch (e) {}
    try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { try { ctx = new AC(); } catch (e2) { return; } }
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = settings.sound ? 0.55 : 0; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = settings.music ? 0.22 : 0; musicBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  // Must be called from inside a tap handler: iOS only allows audio to start
  // (or restart after the phone was locked) in direct response to a touch.
  function unlock() {
    create();
    if (!ctx) return;
    if (ctx.state !== 'running') { try { ctx.resume(); } catch (e) {} }
    // A silent blip fully wakes older iOS versions.
    try {
      const b = ctx.createBufferSource(); b.buffer = ctx.createBuffer(1, 1, 22050);
      b.connect(ctx.destination); b.start(0);
    } catch (e) {}
  }
  const ready = () => ctx && ctx.state === 'running';

  function tone(freq, start, dur, type, vol, bus, slideTo) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'triangle';
    o.frequency.setValueAtTime(freq, start);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g); g.connect(bus || sfxBus);
    o.start(start); o.stop(start + dur + 0.02);
  }
  function noise(start, dur, vol, filterFrom, filterTo, bus) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(filterFrom, start);
    if (filterTo) f.frequency.exponentialRampToValueAtTime(filterTo, start + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(f); f.connect(g); g.connect(bus || sfxBus);
    src.start(start, Math.random() * 0.5); src.stop(start + dur + 0.05);
  }
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  const sfx = {
    move()   { tone(520, ctx.currentTime, 0.05, 'square', 0.12); },
    rotate() { tone(480, ctx.currentTime, 0.09, 'triangle', 0.35, null, 900); },
    land()   { const t = ctx.currentTime; tone(160, t, 0.14, 'sine', 0.6, null, 70); noise(t, 0.08, 0.15, 900, 200); },
    clear(n) {
      const t = ctx.currentTime;
      const notes = [72, 76, 79, 84, 88, 91];
      for (let i = 0; i < 2 + n; i++) tone(midi(notes[i]), t + i * 0.075, 0.18, 'triangle', 0.4);
      if (n >= 3) sfx.roar(t + 0.15);
    },
    roar(t) {
      t = t || ctx.currentTime;
      noise(t, 0.75, 0.5, 1400, 260);
      const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.7);
      lfo.frequency.value = 22; lg.gain.value = 18; lfo.connect(lg); lg.connect(o.frequency);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
      o.connect(f); f.connect(g); g.connect(sfxBus);
      o.start(t); lfo.start(t); o.stop(t + 0.8); lfo.stop(t + 0.8);
    },
    stomp() {
      const t = ctx.currentTime;
      tone(110, t, 0.25, 'sine', 0.8, null, 45); noise(t, 0.3, 0.35, 600, 120);
      tone(110, t + 0.32, 0.25, 'sine', 0.8, null, 45); noise(t + 0.32, 0.3, 0.35, 600, 120);
      noise(t + 0.6, 0.6, 0.3, 300, 80);
    },
    levelUp() { const t = ctx.currentTime; [67, 71, 74, 79].forEach((n, i) => tone(midi(n), t + i * 0.09, 0.16, 'square', 0.18)); },
    gameOver() { const t = ctx.currentTime; [72, 67, 64, 60].forEach((n, i) => tone(midi(n), t + i * 0.2, 0.3, 'triangle', 0.4)); },
    click()  { tone(700, ctx.currentTime, 0.06, 'triangle', 0.3, null, 500); },
  };
  function play(name, arg) {
    if (!ready() || !settings.sound) return;
    try { sfx[name](arg); } catch (e) {}
  }

  // ----- Background music: an original bouncy tune, 8 bars, looping -----
  // 64 eighth-notes. null = rest.
  const MELODY = [
    64,67,69,67,64,62,60,62,  64,67,69,72,69,67,64,null,
    69,null,72,69,67,64,67,null, 69,72,74,72,69,67,69,null,
    65,69,72,69,65,null,67,69, 72,null,74,72,69,67,65,null,
    67,71,74,71,67,null,62,64, 67,69,67,64,62,null,60,null,
  ];
  // one bass note per quarter (2 eighths)
  const BASS = [48,55,48,55, 48,55,48,55, 45,52,45,52, 45,52,45,52, 41,48,41,48, 41,48,41,48, 43,50,43,50, 43,47,50,43];
  const EIGHTH = 0.24; // seconds (125 bpm)

  function scheduleStep(s, t) {
    if (!settings.music) return;
    const m = MELODY[s];
    if (m != null) tone(midi(m), t, EIGHTH * 0.9, 'square', 0.16, musicBus);
    if (s % 2 === 0) tone(midi(BASS[s / 2]), t, EIGHTH * 1.7, 'triangle', 0.5, musicBus);
    if (s % 4 === 0) tone(90, t, 0.12, 'sine', 0.55, musicBus, 45);       // soft kick
    if (s % 2 === 1) noise(t, 0.04, 0.12, 7000, 4000, musicBus);           // hi-hat
  }
  function tick() {
    if (!ready()) return;
    // if the timer was throttled, skip ahead instead of playing a burst of notes
    if (nextNoteTime < ctx.currentTime - 0.1) nextNoteTime = ctx.currentTime + 0.05;
    while (nextNoteTime < ctx.currentTime + 0.12) {
      scheduleStep(step, nextNoteTime);
      nextNoteTime += EIGHTH;
      step = (step + 1) % MELODY.length;
    }
  }
  function startMusic() {
    if (!ctx || musicPlaying) return;
    musicPlaying = true;
    nextNoteTime = ctx.currentTime + 0.08;
    musicTimer = setInterval(tick, 30);
  }
  function stopMusic() {
    musicPlaying = false;
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  }
  function restartMusic() { stopMusic(); step = 0; startMusic(); }
  function applySettings() {
    if (!ctx) return;
    const t = ctx.currentTime;
    sfxBus.gain.setTargetAtTime(settings.sound ? 0.55 : 0, t, 0.02);
    musicBus.gain.setTargetAtTime(settings.music ? 0.22 : 0, t, 0.05);
  }
  function suspend() { stopMusic(); if (ctx && ctx.state === 'running') { try { ctx.suspend(); } catch (e) {} } }

  return { unlock, play, startMusic, stopMusic, restartMusic, applySettings, suspend };
})();

// ---------------------------------------------------------------------------
// Keep the screen awake while playing (Screen Wake Lock API; iOS 18.4+, Android Chrome)
// ---------------------------------------------------------------------------
const Wake = (() => {
  let lock = null;
  async function on() {
    try {
      if ('wakeLock' in navigator && !lock && document.visibilityState === 'visible') {
        lock = await navigator.wakeLock.request('screen');
        lock.addEventListener('release', () => { lock = null; });
      }
    } catch (e) { lock = null; }
  }
  function off() { try { if (lock) lock.release(); } catch (e) {} lock = null; }
  return { on, off };
})();

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------
let state = 'menu';               // menu | playing | clearing | rescue | paused | over
let pausedFrom = 'playing';
let mode = 'easy', cfg = MODES.easy;
let board, piece, nextKind, bag;
let score, lines, level, gravityMs, startBest = 0;
let gravityAcc = 0, lockTimer = 0, lockResets = 0;
let clearingRows = [], animTimer = 0;
let softDrop = false;
let shake = 0;
const particles = [];
const popups = [];

function newBoard() {
  return Array.from({ length: TOTAL_ROWS }, () => Array(COLS).fill(null));
}
function refillBag() {
  bag = KINDS.slice();
  for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
}
function takeFromBag() { if (!bag || !bag.length) refillBag(); return bag.pop(); }

function makePiece(kind) {
  const shape = SHAPES[kind].map((r) => r.slice());
  const faceMap = shape.map((r) => r.map(() => false));
  const [fr, fc] = FACE_CELL[kind];
  faceMap[fr][fc] = true;
  return {
    kind, shape, faceMap,
    x: Math.floor((COLS - shape[0].length) / 2),
    y: 1,                        // bottom row of every piece appears at the very top of the board
  };
}
function cellsOf(p, shape, px, py) {
  shape = shape || p.shape; px = px == null ? p.x : px; py = py == null ? p.y : py;
  const out = [];
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      if (shape[r][c]) out.push([px + c, py + r, r, c]);
  return out;
}
function fits(p, shape, px, py) {
  for (const [x, y] of cellsOf(p, shape, px, py)) {
    if (x < 0 || x >= COLS || y >= TOTAL_ROWS) return false;
    if (y >= 0 && board[y][x]) return false;
  }
  return true;
}
const rotateCW = (m) => m[0].map((_, c) => m.map((row) => row[c]).reverse());

function tryMove(dx, dy) {
  if (fits(piece, null, piece.x + dx, piece.y + dy)) {
    piece.x += dx; piece.y += dy;
    return true;
  }
  return false;
}
function onPieceAdjusted() {
  // After a move/turn while resting on the ground, give a little more time (limited).
  if (!fits(piece, null, piece.x, piece.y + 1) && lockResets < MAX_LOCK_RESETS) { lockTimer = 0; lockResets++; }
}
function tryRotate() {
  if (piece.kind === 'O') { Sound.play('rotate'); return; }
  const shape = rotateCW(piece.shape);
  const face = rotateCW(piece.faceMap);
  // simple "wall kicks": if the turned piece bumps something, try nudging it
  const kicks = piece.kind === 'I'
    ? [[0,0],[-1,0],[1,0],[-2,0],[2,0],[0,-1],[0,-2]]
    : [[0,0],[-1,0],[1,0],[0,-1],[-1,-1],[1,-1],[-2,0],[2,0]];
  for (const [kx, ky] of kicks) {
    if (fits(piece, shape, piece.x + kx, piece.y + ky)) {
      piece.shape = shape; piece.faceMap = face; piece.x += kx; piece.y += ky;
      Sound.play('rotate');
      onPieceAdjusted();
      return;
    }
  }
}
function ghostY() {
  let y = piece.y;
  while (fits(piece, null, piece.x, y + 1)) y++;
  return y;
}

function startGame(m) {
  mode = m; cfg = MODES[m];
  startBest = bests[m];
  board = newBoard();
  bag = null;
  score = 0; lines = 0; level = 1;
  gravityMs = cfg.gravity;
  particles.length = 0; popups.length = 0;
  nextKind = takeFromBag();
  ui.side.classList.toggle('no-next', !cfg.next);
  ui.modeBadge.textContent = cfg.label;
  ui.best.textContent = bests[mode];
  show(null);
  state = 'playing';
  releaseAllInput();
  spawn();
  updateHud();
  layout();
  Wake.on();
  Sound.restartMusic();
}

function spawn() {
  piece = makePiece(nextKind);
  nextKind = takeFromBag();
  gravityAcc = 0; lockTimer = 0; lockResets = 0;
  softDrop = false;               // a new piece never inherits a held "down": little fingers get a fresh start
  drawNext();
  if (!fits(piece)) {
    if (cfg.rescue) startRescue();
    else gameOver();
  }
}

function lockPiece() {
  let above = true;
  for (const [x, y, r, c] of cellsOf(piece)) {
    if (y >= 0) board[y][x] = { k: piece.kind, face: piece.faceMap[r][c] };
    if (y >= HIDDEN) above = false;
  }
  score += PIECE_POINTS;
  Sound.play('land');
  const full = [];
  for (let y = 0; y < TOTAL_ROWS; y++) if (board[y].every(Boolean)) full.push(y);
  if (full.length) {
    clearingRows = full;
    animTimer = CLEAR_ANIM_MS;
    state = 'clearing';
    piece = null;
    Sound.play('clear', full.length);
    celebrate(full);
  } else if (above) {
    // landed entirely in the hidden rows above the board: the stack has reached the top
    piece = null;
    if (cfg.rescue) startRescue(); else gameOver();
  } else {
    spawn();
  }
  updateHud();
}

function finishClear() {
  for (const y of clearingRows) { board.splice(y, 1); board.unshift(Array(COLS).fill(null)); }
  const n = clearingRows.length;
  clearingRows = [];
  lines += n;
  score += LINE_POINTS[Math.min(n, 4)] * level;
  const newLevel = Math.floor(lines / cfg.linesPerLevel) + 1;
  if (newLevel > level) {
    level = newLevel;
    gravityMs = Math.max(cfg.minGravity, cfg.gravity * Math.pow(cfg.speedup, level - 1));
    popup('Level ' + level + '!', '#fff59d', 0.9, 0.62);
    Sound.play('levelUp');
  }
  updateHud();
  state = 'playing';
  spawn();
}

// Easy mode: when the blocks reach the top, a dino stomps away the bottom rows.
function startRescue() {
  state = 'rescue';
  piece = null;
  animTimer = RESCUE_ANIM_MS;
  shake = 1;
  popup('DINO STOMP!', '#ffcc80', 1.4);
  Sound.play('stomp');
}
function finishRescue() {
  for (let i = 0; i < RESCUE_ROWS; i++) { board.pop(); board.unshift(Array(COLS).fill(null)); }
  state = 'playing';
  spawn();
}

function gameOver() {
  state = 'over';
  piece = null;
  releaseAllInput();
  Wake.off();
  Sound.stopMusic();
  Sound.play('gameOver');
  const isBest = score > 0 && score >= bests[mode] && score > startBest;
  saveBestIfNeeded();
  ui.finalScore.textContent = score;
  ui.newBest.hidden = !isBest;
  updateHud();
  setTimeout(() => { if (state === 'over') { show(ui.over); drawArt($('over-art'), 'L'); } }, 700);
}

function pauseGame() {
  if (state !== 'playing' && state !== 'clearing' && state !== 'rescue') return;
  pausedFrom = state;
  state = 'paused';
  releaseAllInput();
  Wake.off();
  Sound.stopMusic();
  show(ui.pause);
}
function resumeGame() {
  if (state !== 'paused') return;
  state = pausedFrom;
  show(null);
  lastTime = performance.now();
  Wake.on();
  Sound.startMusic();
}
function toMenu() {
  state = 'menu';
  piece = null;
  releaseAllInput();
  Wake.off();
  Sound.stopMusic();
  show(ui.menu);
  refreshMenu();
}

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------
const CHEERS = ['', 'Yay!', 'Super!', 'ROAR!', 'DINO-MITE!'];
function celebrate(rows) {
  const n = rows.length;
  popup(CHEERS[Math.min(n, 4)], n >= 3 ? '#ffab40' : '#fff');
  if (n >= 3) shake = 0.6;
  const colors = ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff', '#e040fb', '#ffab40'];
  for (const y of rows) {
    for (let i = 0; i < 18; i++) {
      particles.push({
        x: Math.random() * COLS, y: y - HIDDEN + 0.5,
        vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4,
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12,
        life: 1, color: colors[(Math.random() * colors.length) | 0],
      });
    }
  }
}
function popup(text, color, scale, yFrac) {
  popups.push({ text, color, scale: scale || 1, life: 1, yFrac: yFrac || 0.42 });
}

// ---------------------------------------------------------------------------
// Input: on-screen buttons (pointer events) + keyboard for computers.
// ---------------------------------------------------------------------------
const held = {};                  // action -> { t, repeating }
let lastHorizontal = null;

function press(action) {
  if (state !== 'playing' || !piece) {
    if (action === 'left' || action === 'right' || action === 'down') held[action] = { t: 0, repeating: false };
    return;
  }
  switch (action) {
    case 'left':
    case 'right':
      held[action] = { t: 0, repeating: false };
      lastHorizontal = action;
      if (tryMove(action === 'left' ? -1 : 1, 0)) { Sound.play('move'); onPieceAdjusted(); }
      break;
    case 'rotate':
      tryRotate();
      break;
    case 'down':
      held.down = { t: 0 };
      if (!piece) break;
      softDrop = true;
      gravityAcc = SOFT_DROP_MS; // react immediately
      break;
    case 'harddrop': {
      const gy = ghostY();
      score += (gy - piece.y);
      piece.y = gy;
      lockPiece();
      break;
    }
  }
}
function release(action) {
  delete held[action];
  if (action === 'down') softDrop = false;
  if (lastHorizontal === action) lastHorizontal = held.left ? 'left' : held.right ? 'right' : null;
}
function releaseAllInput() {
  for (const k of Object.keys(held)) delete held[k];
  softDrop = false; lastHorizontal = null;
  document.querySelectorAll('.down').forEach((el) => el.classList.remove('down'));
}
function handleRepeat(dt) {
  const dir = lastHorizontal;
  if (!dir || !held[dir] || !piece) return;
  const h = held[dir];
  h.t += dt;
  const threshold = h.repeating ? cfg.arr : cfg.das;
  if (h.t >= threshold) {
    h.t -= threshold; h.repeating = true;
    if (tryMove(dir === 'left' ? -1 : 1, 0)) { Sound.play('move'); onPieceAdjusted(); }
  }
}

// Makes any element behave like a responsive game button:
// fires on finger-down (no 300 ms delay), and always "lets go" even if
// the system steals the touch (pointercancel) or the finger slides off.
function bindButton(el, onDown, onUp) {
  let activePointer = null;
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (activePointer !== null) return;
    activePointer = e.pointerId;
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
    el.classList.add('down');
    Sound.unlock();
    onDown && onDown(e);
  });
  const end = (e) => {
    if (activePointer === null || (e && e.pointerId !== activePointer)) return;
    activePointer = null;
    el.classList.remove('down');
    onUp && onUp(e);
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('lostpointercapture', end);
}

// Menu-style buttons act on finger-up, so a child resting a thumb on one
// and sliding away doesn't accidentally start or quit a game.
function bindTap(el, fn) {
  let downId = null, lastUp = 0;
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    downId = e.pointerId;
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
    el.classList.add('down');
    Sound.unlock();
  });
  el.addEventListener('pointerup', (e) => {
    if (downId !== e.pointerId) return;
    downId = null; lastUp = Date.now();
    el.classList.remove('down');
    const r = el.getBoundingClientRect();
    const inside = e.clientX >= r.left - 12 && e.clientX <= r.right + 12 && e.clientY >= r.top - 12 && e.clientY <= r.bottom + 12;
    if (inside) { Sound.play('click'); fn(e); }
  });
  const cancel = () => { downId = null; el.classList.remove('down'); };
  el.addEventListener('pointercancel', cancel);
  // keyboard activation (Enter/Space on a computer)
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); fn(e); } });
}

document.querySelectorAll('.ctl').forEach((el) => {
  const action = el.dataset.action;
  bindButton(el, () => press(action), () => release(action));
});
document.querySelectorAll('.mode').forEach((el) => bindTap(el, () => startGame(el.dataset.mode)));
bindTap($('btn-pause'), pauseGame);
bindTap($('btn-resume'), resumeGame);
bindTap($('btn-quit'), toMenu);
bindTap($('btn-again'), () => startGame(mode));
bindTap($('btn-menu'), toMenu);
bindTap(ui.sound, () => { settings.sound = !settings.sound; store.set('settings', settings); Sound.applySettings(); paintToggles(); });
bindTap(ui.music, () => {
  settings.music = !settings.music; store.set('settings', settings); Sound.applySettings(); paintToggles();
});

const KEYMAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', ArrowUp: 'rotate', KeyX: 'rotate', KeyA: 'left', KeyD: 'right', KeyS: 'down', KeyW: 'rotate', Space: 'harddrop' };
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' || e.code === 'KeyP') { state === 'paused' ? resumeGame() : pauseGame(); return; }
  const a = KEYMAP[e.code];
  if (!a) return;
  e.preventDefault();
  Sound.unlock();
  if (e.repeat) return;
  press(a);
});
window.addEventListener('keyup', (e) => { const a = KEYMAP[e.code]; if (a) release(a); });

// --- Belt-and-braces guards against browser gestures ---
const stop = (e) => e.preventDefault();
document.addEventListener('gesturestart', stop, { passive: false });   // iOS pinch-zoom
document.addEventListener('gesturechange', stop, { passive: false });
document.addEventListener('dblclick', stop, { passive: false });        // double-tap zoom
document.addEventListener('contextmenu', stop);                         // long-press menu
document.addEventListener('selectstart', stop);                         // text selection
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1 || e.cancelable) e.preventDefault(); }, { passive: false }); // scrolling / bounce
// "Ghost taps": after a finger lifts, the browser fires a delayed click on whatever is
// now under it (e.g. a menu that just appeared). All buttons act on pointer events,
// so swallow every click before it reaches anything.
document.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); }, true);
// Any tap re-wakes audio (iOS freezes it when the phone locks or another app plays sound).
document.addEventListener('pointerdown', () => Sound.unlock(), true);

// --- Pause automatically when the game isn't visible ---
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { pauseGame(); Sound.suspend(); }
});
window.addEventListener('pagehide', () => { pauseGame(); Sound.suspend(); });
window.addEventListener('blur', () => pauseGame());   // e.g. Control Centre pulled down, incoming call

// ---------------------------------------------------------------------------
// Layout: size the board to fill the available space with whole-pixel cells.
// ---------------------------------------------------------------------------
let cell = 24, boardW = 240, boardH = 480, bctx = null;
const BOARD_MARGIN = 9; // matches the CSS frame around the board

function layout() {
  // Old iOS: set the real visible height (dvh fallback).
  document.documentElement.style.setProperty('--app-h', window.innerHeight + 'px');

  // Phones turned sideways don't have room for the buttons.
  const landscapePhone = window.innerWidth > window.innerHeight && window.innerHeight < 500;
  ui.rotateHint.classList.toggle('show', landscapePhone);
  if (landscapePhone) pauseGame();

  const wrap = $('board-wrap');
  const availW = wrap.clientWidth - BOARD_MARGIN * 2;
  const availH = wrap.clientHeight - BOARD_MARGIN * 2;
  if (availW <= 0 || availH <= 0) return;
  cell = Math.max(8, Math.floor(Math.min(availW / COLS, availH / ROWS)));
  boardW = cell * COLS; boardH = cell * ROWS;
  bctx = fitCanvas(boardCanvas, boardW, boardH).ctx;
  // centre the board when the side panel is hidden (Hard mode) or space is wide
  wrap.style.justifyContent = 'center';
  const nextSize = Math.min(80, $('next-panel').clientWidth - 8, Math.max(56, Math.floor(cell * 3)));
  fitCanvas(nextCanvas, nextSize, Math.round(nextSize * 1.25));   // dino on top, block shape below
  drawNext();
  render();
}
let layoutTimer = null;
function scheduleLayout() {
  layout();
  clearTimeout(layoutTimer);
  layoutTimer = setTimeout(layout, 250); // again once the browser bars settle
}
window.addEventListener('resize', scheduleLayout);
window.addEventListener('orientationchange', scheduleLayout);
if (window.visualViewport) window.visualViewport.addEventListener('resize', scheduleLayout);

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (v) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
  return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
}
const cellCache = {};
function cellSprite(kind, size, face, awake) {
  const key = kind + size + (face ? (awake ? 'A' : 'S') : '');
  if (cellCache[key]) return cellCache[key];
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const c = document.createElement('canvas');
  c.width = c.height = Math.round(size * dpr);
  const x = c.getContext('2d');
  x.scale(dpr, dpr);
  const d = DINOS[kind];
  const pad = Math.max(1, size * 0.04), r = size * 0.24, s = size - pad * 2;
  x.beginPath(); x.roundRect(pad, pad, s, s, r);
  const g = x.createLinearGradient(0, pad, 0, size - pad);
  g.addColorStop(0, shade(d.color, 0.25)); g.addColorStop(1, shade(d.color, -0.08));
  x.fillStyle = g; x.fill();
  x.lineWidth = Math.max(1.5, size * 0.07); x.strokeStyle = shade(d.color, -0.45); x.stroke();
  // shine
  x.beginPath(); x.roundRect(pad + s * 0.16, pad + s * 0.1, s * 0.42, s * 0.16, s * 0.08);
  x.fillStyle = 'rgba(255,255,255,.55)'; x.fill();
  // dino-skin spots
  x.fillStyle = shade(d.color, -0.3); x.globalAlpha = 0.35;
  x.beginPath(); x.arc(pad + s * 0.72, pad + s * 0.7, s * 0.09, 0, 7); x.fill();
  x.beginPath(); x.arc(pad + s * 0.32, pad + s * 0.74, s * 0.06, 0, 7); x.fill();
  x.globalAlpha = 1;
  if (face) {
    const ink = '#2b1f3a';
    if (awake) {
      for (const ex of [0.34, 0.66]) {
        x.beginPath(); x.arc(pad + s * ex, pad + s * 0.46, s * 0.13, 0, 7); x.fillStyle = '#fff'; x.fill();
        x.lineWidth = Math.max(1, s * 0.04); x.strokeStyle = ink; x.stroke();
        x.beginPath(); x.arc(pad + s * (ex + 0.03), pad + s * 0.48, s * 0.07, 0, 7); x.fillStyle = ink; x.fill();
      }
      x.beginPath(); x.arc(pad + s * 0.5, pad + s * 0.62, s * 0.14, 0.15 * Math.PI, 0.85 * Math.PI);
      x.lineWidth = Math.max(1, s * 0.05); x.strokeStyle = ink; x.stroke();
    } else {
      // sleepy eyes once the piece has landed
      x.lineWidth = Math.max(1, s * 0.05); x.strokeStyle = ink;
      for (const ex of [0.34, 0.66]) { x.beginPath(); x.arc(pad + s * ex, pad + s * 0.48, s * 0.1, 0.1 * Math.PI, 0.9 * Math.PI); x.stroke(); }
    }
  }
  cellCache[key] = c;
  return c;
}
function drawCell(ctx, kind, cx, cy, size, face, awake, alpha) {
  if (alpha != null) ctx.globalAlpha = alpha;
  ctx.drawImage(cellSprite(kind, size, face, awake), cx, cy, size, size);
  ctx.globalAlpha = 1;
}

const FONT = getComputedStyle(document.body).fontFamily;
function render() {
  if (!bctx || !board) return;
  const ctx = bctx;
  ctx.save();
  ctx.clearRect(0, 0, boardW, boardH);
  if (shake > 0) ctx.translate((Math.random() - 0.5) * 10 * shake, (Math.random() - 0.5) * 8 * shake);

  // background grid
  ctx.fillStyle = '#1c2a48'; ctx.fillRect(-10, -10, boardW + 20, boardH + 20);
  ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 1; c < COLS; c++) { ctx.moveTo(c * cell + 0.5, 0); ctx.lineTo(c * cell + 0.5, boardH); }
  for (let r = 1; r < ROWS; r++) { ctx.moveTo(0, r * cell + 0.5); ctx.lineTo(boardW, r * cell + 0.5); }
  ctx.stroke();

  // settled blocks
  const flashing = state === 'clearing' ? clearingRows : [];
  const flashOn = state === 'clearing' && Math.floor(animTimer / 70) % 2 === 0;
  const rescueRows = state === 'rescue';
  for (let y = HIDDEN; y < TOTAL_ROWS; y++) {
    const isFlash = flashing.includes(y);
    for (let x = 0; x < COLS; x++) {
      const b = board[y][x];
      if (!b) continue;
      const px = x * cell, py = (y - HIDDEN) * cell;
      if (isFlash && flashOn) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(px + 1, py + 1, cell - 2, cell - 2, cell * 0.24); ctx.fill(); continue; }
      let a = null;
      if (isFlash) a = Math.max(0.15, animTimer / CLEAR_ANIM_MS);
      if (rescueRows && y >= TOTAL_ROWS - RESCUE_ROWS) a = Math.max(0.1, animTimer / RESCUE_ANIM_MS);
      drawCell(ctx, b.k, px, py, cell, b.face, false, a);
    }
  }

  // ghost (Easy) and falling piece
  if (piece && (state === 'playing' || state === 'paused')) {
    if (cfg.ghost) {
      const gy = ghostY();
      if (gy !== piece.y) {
        ctx.fillStyle = 'rgba(255,255,255,.14)';
        ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
        for (const [x, y] of cellsOf(piece, null, piece.x, gy)) {
          if (y < HIDDEN) continue;
          ctx.beginPath(); ctx.roundRect(x * cell + 3, (y - HIDDEN) * cell + 3, cell - 6, cell - 6, cell * 0.2);
          ctx.fill(); ctx.stroke();
        }
        ctx.setLineDash([]);
      }
    }
    for (const [x, y, r, c] of cellsOf(piece)) {
      if (y < HIDDEN) continue;
      drawCell(ctx, piece.kind, x * cell, (y - HIDDEN) * cell, cell, piece.faceMap[r][c], true);
    }
  }

  // confetti
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.5));
    ctx.translate(p.x * cell, p.y * cell); ctx.rotate(p.rot);
    ctx.fillStyle = p.color; ctx.fillRect(-cell * 0.16, -cell * 0.08, cell * 0.32, cell * 0.16);
    ctx.restore();
  }
  // cheer text
  for (const p of popups) {
    const t = 1 - p.life;
    let size = Math.round(cell * 1.5 * p.scale * (0.8 + Math.min(t * 4, 1) * 0.3));
    ctx.save();
    ctx.globalAlpha = Math.min(1, p.life * 2.5);
    ctx.font = '900 ' + size + 'px ' + FONT;
    const tw = ctx.measureText(p.text).width;                // shrink to fit narrow boards
    if (tw > boardW * 0.9) { size = Math.floor(size * boardW * 0.9 / tw); ctx.font = '900 ' + size + 'px ' + FONT; }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const y = boardH * p.yFrac - t * cell * 2;
    ctx.lineWidth = Math.max(4, size * 0.16); ctx.strokeStyle = '#2b1f3a'; ctx.lineJoin = 'round';
    ctx.strokeText(p.text, boardW / 2, y);
    ctx.fillStyle = p.color; ctx.fillText(p.text, boardW / 2, y);
    ctx.restore();
  }
  // dino stomping across during an Easy-mode rescue
  if (state === 'rescue') {
    const prog = 1 - animTimer / RESCUE_ANIM_MS;
    const w = cell * 5, h = cell * 4.2;
    const hop = Math.abs(Math.sin(prog * Math.PI * 4)) * cell * 0.8;
    drawDino(ctx, 'L', -w + prog * (boardW + w), boardH - h - cell * 0.5 - hop, w, h);
  }
  ctx.restore();
}

function drawNext() {
  if (!nextKind) return;
  const { ctx, w, h } = fitCanvas(nextCanvas);
  ctx.clearRect(0, 0, w, h);
  // top: the dino picture
  const dinoH = Math.round(h * 0.46);
  drawDino(ctx, nextKind, 2, 0, w - 4, dinoH);
  // bottom: the actual block shape that will fall next, with its face
  const shape = SHAPES[nextKind];
  let minR = 9, maxR = -1, minC = 9, maxC = -1;
  shape.forEach((row, r) => row.forEach((v, c) => {
    if (v) { minR = Math.min(minR, r); maxR = Math.max(maxR, r); minC = Math.min(minC, c); maxC = Math.max(maxC, c); }
  }));
  const rowsN = maxR - minR + 1, colsN = maxC - minC + 1;
  const areaTop = dinoH + 4, areaH = h - areaTop - 2, areaW = w - 4;
  const size = Math.floor(Math.min(areaW / Math.max(colsN, 3), areaH / Math.max(rowsN, 2), 26));
  const ox = Math.round((w - colsN * size) / 2), oy = Math.round(areaTop + (areaH - rowsN * size) / 2);
  const [fr, fc] = FACE_CELL[nextKind];
  for (let r = minR; r <= maxR; r++)
    for (let c = minC; c <= maxC; c++)
      if (shape[r][c]) drawCell(ctx, nextKind, ox + (c - minC) * size, oy + (r - minR) * size, size, r === fr && c === fc, true);
  ui.nextName.textContent = DINOS[nextKind].name;
}
function drawArt(canvas, kind, flip) {
  const { ctx, w, h } = fitCanvas(canvas);
  ctx.clearRect(0, 0, w, h);
  drawDino(ctx, kind, 0, 0, w, h, { flip });
}

function saveBestIfNeeded() {
  if (score > bests[mode]) { bests[mode] = score; store.set('best', bests); return true; }
  return false;
}
function updateHud() {
  if (state !== 'over' && state !== 'menu') saveBestIfNeeded();
  ui.score.textContent = score;
  ui.level.textContent = level;
  ui.lines.textContent = lines;
  ui.best.textContent = Math.max(bests[mode], score);
}

const ICONS = {
  soundOn: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke-width="2" stroke-linecap="round"/></svg>',
  soundOff: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l6 6M22 9l-6 6" fill="none" stroke-width="2" stroke-linecap="round"/></svg>',
  musicOn: '<svg viewBox="0 0 24 24"><path d="M9 17V5l11-2v12" fill="none" stroke-width="2"/><circle cx="6.5" cy="17.5" r="3"/><circle cx="17.5" cy="15.5" r="3"/></svg>',
  musicOff: '<svg viewBox="0 0 24 24"><path d="M9 17V5l11-2v12" fill="none" stroke-width="2"/><circle cx="6.5" cy="17.5" r="3"/><circle cx="17.5" cy="15.5" r="3"/><path d="M3 3l18 18" fill="none" stroke-width="2.4" stroke-linecap="round"/></svg>',
};
function paintToggles() {
  ui.sound.innerHTML = settings.sound ? ICONS.soundOn : ICONS.soundOff;
  ui.music.innerHTML = settings.music ? ICONS.musicOn : ICONS.musicOff;
  ui.sound.classList.toggle('off', !settings.sound);
  ui.music.classList.toggle('off', !settings.music);
  ui.sound.setAttribute('aria-pressed', String(settings.sound));
  ui.music.setAttribute('aria-pressed', String(settings.music));
}

function show(overlay) {
  for (const o of [ui.menu, ui.pause, ui.over]) o.classList.toggle('show', o === overlay);
}

function refreshMenu() {
  document.querySelectorAll('[data-best]').forEach((el) => {
    const v = bests[el.dataset.best];
    el.textContent = v ? 'Best: ' + v : 'Tap to play';
  });
  document.querySelectorAll('canvas[data-dino]').forEach((c) => drawArt(c, c.dataset.dino));
  const t = $('title-art');
  const { ctx, w, h } = fitCanvas(t);
  ctx.clearRect(0, 0, w, h);
  const kinds = ['S', 'J', 'L', 'T', 'Z'];
  const each = w / kinds.length;
  kinds.forEach((k, i) => drawDino(ctx, k, i * each, 0, each, h));
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
let lastTime = performance.now();
function update(dt) {
  // effects keep animating in every state
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.vy += 30 * dt / 1000; p.x += p.vx * dt / 1000; p.y += p.vy * dt / 1000; p.rot += p.vr * dt / 1000;
    p.life -= dt / 1300;
    if (p.life <= 0 || p.y > ROWS + 2) particles.splice(i, 1);
  }
  for (let i = popups.length - 1; i >= 0; i--) { popups[i].life -= dt / 1100; if (popups[i].life <= 0) popups.splice(i, 1); }
  if (shake > 0) shake = Math.max(0, shake - dt / 600);

  if (state === 'clearing') {
    animTimer -= dt;
    if (animTimer <= 0) finishClear();
    return;
  }
  if (state === 'rescue') {
    animTimer -= dt;
    if (animTimer <= 0) finishRescue();
    return;
  }
  if (state !== 'playing' || !piece) return;

  handleRepeat(dt);
  if (!piece) return;

  const grounded = !fits(piece, null, piece.x, piece.y + 1);
  if (grounded) {
    gravityAcc = 0;
    lockTimer += dt;
    // holding "down" on the ground locks a bit sooner, but never instantly
    const delay = softDrop ? Math.min(cfg.lockDelay, 250) : cfg.lockDelay;
    if (lockTimer >= delay) lockPiece();
  } else {
    lockTimer = 0;
    const interval = softDrop ? Math.min(SOFT_DROP_MS, gravityMs) : gravityMs;
    gravityAcc += dt;
    while (gravityAcc >= interval) {
      gravityAcc -= interval;
      if (!tryMove(0, 1)) { gravityAcc = 0; break; }
    }
  }
}

function frame(now) {
  // clamp the step so a frozen tab (or a debugger) can't make pieces teleport
  const dt = Math.min(50, Math.max(0, now - lastTime));
  lastTime = now;
  update(dt);
  if (state !== 'menu') render();
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------------------
// Home-screen install
// ---------------------------------------------------------------------------
const standalone = window.matchMedia('(display-mode: standalone)').matches ||
  window.matchMedia('(display-mode: fullscreen)').matches || window.navigator.standalone === true;
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
if (!standalone && isIOS) {
  $('install-hint').textContent = 'Grown-ups: tap Share, then "Add to Home Screen" to play full-screen and offline.';
}
let installEvent = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvent = e;
  $('btn-install').hidden = false;
});
bindTap($('btn-install'), async () => {
  if (!installEvent) return;
  installEvent.prompt();
  try { await installEvent.userChoice; } catch (e) {}
  installEvent = null;
  $('btn-install').hidden = true;
});
window.addEventListener('appinstalled', () => { $('btn-install').hidden = true; });

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
paintToggles();
refreshMenu();
board = newBoard();
score = 0; lines = 0; level = 1;
layout();
requestAnimationFrame((t) => { lastTime = t; frame(t); });

// small hook for automated tests
window.__dino = { get state() { return state; }, get score() { return score; }, get lines() { return lines; },
  get piece() { return piece; }, get board() { return board; }, startGame, press, release, pauseGame, resumeGame };
})();
