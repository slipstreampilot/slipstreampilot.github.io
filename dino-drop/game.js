/* Dino Drop: game engine, controls, sound, music and mobile guards.
   Runs entirely in the browser; no libraries, no network. */
'use strict';
(() => {

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
const COLS = 10;
let ROWS = 20;                      // 15 in puzzle mode
const HIDDEN = 2;                 // invisible rows above the board where pieces spawn
let TOTAL_ROWS = ROWS + HIDDEN;

const MODES = {
  // gravity: ms per row at level 1; speedup: multiplier per level; linesPerLevel; lockDelay ms
  easy:   { label: 'Easy',   gravity: 950, speedup: 1.0,  minGravity: 950, linesPerLevel: 10, lockDelay: 900, ghost: true,  next: true,  rescue: true,  das: 260, arr: 110 },
  medium: { label: 'Medium', gravity: 750, speedup: 0.86, minGravity: 120, linesPerLevel: 10, lockDelay: 600, ghost: false, next: true,  rescue: false, das: 220, arr: 85  },
  hard:   { label: 'Hard',   gravity: 420, speedup: 0.82, minGravity: 60,  linesPerLevel: 8,  lockDelay: 450, ghost: false, next: false, rescue: false, das: 180, arr: 60  },
};
const SOFT_DROP_MS = 35;          // speed while the down button is held
const MAX_LOCK_RESETS = 15;       // moves allowed after landing before the piece locks anyway
const CLEAR_ANIM_MS = 380;
const CASCADE_MS = 320;            // how long loose blocks take to tumble down (Cascade option)
const RESCUE_ANIM_MS = 1100;
const RESCUE_ROWS = 5;            // Easy mode's one Dino Stomp clears this many bottom rows
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
const gameOpts = Object.assign({ powers: false, cascade: false }, store.get('options', {}));   // remembered between games

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
    meteor() { const t = ctx.currentTime; noise(t, 0.6, 0.35, 4000, 300); tone(900, t, 0.6, 'sawtooth', 0.12, null, 120); },
    boom()   { const t = ctx.currentTime; noise(t, 0.7, 0.6, 2000, 80); tone(120, t, 0.5, 'sine', 0.9, null, 35); },
    volcano(){ const t = ctx.currentTime; noise(t, 1.0, 0.4, 400, 90); tone(70, t, 1.0, 'sine', 0.7, null, 40); for (let i = 0; i < 5; i++) tone(300 + Math.random() * 300, t + 0.15 * i, 0.08, 'sine', 0.2, null, 600); },
    power()  { const t = ctx.currentTime; [72, 76, 79, 84, 88].forEach((n, i) => tone(midi(n), t + i * 0.06, 0.14, 'square', 0.16)); },
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
let savesLeft = 0;                 // Easy mode: one Dino Stomp per game
let chain = 1;                     // Cascade: 2 = second clear in a chain reaction, etc.
// Powers option: earn one every POWER_EVERY points, hold at most one
const POWER_EVERY = 2000;
const POWERS = { meteor: 'Meteor', volcano: 'Volcano', egg: 'Egg Bomb' };
let power = null, nextPowerAt = POWER_EVERY, powerAnim = null, lastPower = null;
let gravityAcc = 0, lockTimer = 0, lockResets = 0;
let clearingRows = [], animTimer = 0;
let softDrop = false;
let shake = 0;
const particles = [];
const popups = [];

// ----- Puzzle mode -----
const PC = window.PuzzleCore;
const PZ = window.PUZZLE_LEVELS || [];
const ZONES = [
  { name: 'Fern Forest',       color: '#43a047', bg: '#183826', art: 'S' },
  { name: 'Volcano Valley',    color: '#f4511e', bg: '#3b1a16', art: 'L' },
  { name: 'Tar Pit Swamp',     color: '#7e57c2', bg: '#261b38', art: 'T' },
  { name: 'Crystal Ice Cave',  color: '#039be5', bg: '#122c46', art: 'I' },
  { name: 'Secret Egg Island', color: '#f9a825', bg: '#352d12', art: 'J' },
];
let puzzle = null;               // { index, def, st, pipX, pipY, hudTimer }
const pzProgress = store.get('puzzle', {});   // index -> { t: best ms, s: stars }

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
  if (puzzle) return PC.fits(puzzle.st, shape || p.shape, px == null ? p.x : px, py == null ? p.y : py);
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
  if (piece.kind === 'O' || piece.kind === 'EGG') { Sound.play('rotate'); return; }
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
  puzzle = null;
  ROWS = 20; TOTAL_ROWS = ROWS + HIDDEN;
  setHudLabels(false);
  startBest = bests[m];
  board = newBoard();
  bag = null;
  score = 0; lines = 0; level = 1;
  savesLeft = cfg.rescue ? 1 : 0;
  paintSave();
  power = null; nextPowerAt = POWER_EVERY; powerAnim = null;
  $('power-btn').hidden = !gameOpts.powers;
  ui.side.classList.toggle('compact', !!gameOpts.powers);
  paintPower();
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
  if (puzzle) {
    const sp = PC.spawnPos(puzzle.st, piece.shape);
    piece.x = sp.x; piece.y = sp.y;
    if (!fits(piece)) puzzleLose('full');
    return;
  }
  if (!fits(piece)) {
    if (savesLeft > 0) startRescue();
    else gameOver();
  }
}

function lockPiece() {
  if (puzzle) return puzzleLock();
  if (piece.kind === 'EGG') return eggExplode();
  let above = true;
  for (const [x, y, r, c] of cellsOf(piece)) {
    if (y >= 0) board[y][x] = { k: piece.kind, face: piece.faceMap[r][c] };
    if (y >= HIDDEN) above = false;
  }
  score += PIECE_POINTS;
  chain = 1;
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
    if (savesLeft > 0) startRescue(); else gameOver();
  } else {
    spawn();
  }
  updateHud();
}

function finishClear() {
  if (puzzle) return puzzleFinishClear();
  for (const y of clearingRows) { board.splice(y, 1); board.unshift(Array(COLS).fill(null)); }
  const n = clearingRows.length;
  clearingRows = [];
  lines += n;
  score += LINE_POINTS[Math.min(n, 4)] * level * chain;
  const newLevel = Math.floor(lines / cfg.linesPerLevel) + 1;
  if (newLevel > level) {
    level = newLevel;
    gravityMs = Math.max(cfg.minGravity, cfg.gravity * Math.pow(cfg.speedup, level - 1));
    popup('Level ' + level + '!', '#fff59d', 0.9, 0.62);
    Sound.play('levelUp');
  }
  updateHud();
  if (gameOpts.cascade && startCascade()) return;
  resumePlay();
}
function resumePlay() {
  state = 'playing';
  if (!piece) spawn();
}

// ----- Cascade: loose clumps of blocks fall after a clear, possibly completing more rows -----
function startCascade() {
  // find clumps of touching blocks (4-neighbour)
  const seen = board.map((r) => r.map(() => false));
  const clumps = [];
  for (let y = 0; y < TOTAL_ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (!board[y][x] || seen[y][x]) continue;
    const cells = [], stack = [[x, y]]; seen[y][x] = true;
    while (stack.length) {
      const [cx, cy] = stack.pop(); cells.push([cx, cy]);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx >= 0 && nx < COLS && ny >= 0 && ny < TOTAL_ROWS && board[ny][nx] && !seen[ny][nx]) { seen[ny][nx] = true; stack.push([nx, ny]); }
      }
    }
    clumps.push(cells);
  }
  // drop clumps, lowest first, until nothing moves
  let movedAny = false;
  const fromY = new Map();                  // cell object -> original row (for the animation)
  for (let pass = 0; pass < 30; pass++) {
    let moved = false;
    clumps.sort((a, b) => Math.max(...b.map((c) => c[1])) - Math.max(...a.map((c) => c[1])));
    for (const cl of clumps) {
      const objs = cl.map(([x, y]) => board[y][x]);
      for (const [x, y] of cl) board[y][x] = null;
      let d = 0;
      while (cl.every(([x, y]) => y + d + 1 < TOTAL_ROWS && !board[y + d + 1][x])) d++;
      cl.forEach(([x, y], i) => { if (!fromY.has(objs[i])) fromY.set(objs[i], y); board[y + d][x] = objs[i]; cl[i] = [x, y + d]; });
      if (d > 0) moved = movedAny = true;
    }
    if (!moved) break;
  }
  if (!movedAny) return false;
  for (let y = 0; y < TOTAL_ROWS; y++) for (let x = 0; x < COLS; x++) {
    const b = board[y][x];
    if (b && fromY.has(b) && fromY.get(b) !== y) b.fall = y - fromY.get(b); else if (b) delete b.fall;
  }
  state = 'cascading';
  animTimer = CASCADE_MS;
  return true;
}
function finishCascade() {
  for (const row of board) for (const b of row) if (b) delete b.fall;
  const full = [];
  for (let y = 0; y < TOTAL_ROWS; y++) if (board[y].every(Boolean)) full.push(y);
  if (full.length) {
    chain++;
    clearingRows = full;
    animTimer = CLEAR_ANIM_MS;
    state = 'clearing';
    Sound.play('clear', Math.min(4, full.length + 1));
    celebrate(full);
    popup('Chain x' + chain + '!', '#80deea', 0.9, 0.62);
    return;
  }
  Sound.play('land');
  resumePlay();
}

// ----- Powers -----
function checkPowerEarn() {
  if (!gameOpts.powers || puzzle) return;
  while (score >= nextPowerAt) {
    nextPowerAt += POWER_EVERY;
    if (!power) {
      const choices = Object.keys(POWERS).filter((k) => k !== lastPower);
      power = lastPower = choices[Math.floor(Math.random() * choices.length)];
      popup(POWERS[power] + '!', '#ffcc80', 0.9, 0.3);
      Sound.play('power');
    }
  }
  paintPower();
}
function paintPower() {
  const btn = $('power-btn');
  if (btn.hidden) return;
  btn.classList.toggle('empty', !power);
  $('power-name').textContent = power ? POWERS[power] : 'Power';
  btn.setAttribute('aria-label', power ? 'Use ' + POWERS[power] : 'Power charging');
  const pct = Math.max(0, Math.min(1, ((score || 0) - (nextPowerAt - POWER_EVERY)) / POWER_EVERY));
  $('power-fill').style.width = Math.round(pct * 100) + '%';
  const c = $('power-icon');
  const { ctx, w, h } = fitCanvas(c);
  ctx.clearRect(0, 0, w, h);
  if (w > 4) drawPowerIcon(ctx, power || lastPower || 'meteor', 0, 0, w, h);
}
function meteorColumn() {
  const cs = cellsOf(piece);
  return Math.max(0, Math.min(COLS - 1, Math.round(cs.reduce((a, c) => a + c[0], 0) / cs.length)));
}
function usePower() {
  if (!power || state !== 'playing' || !piece || puzzle) return;
  const kind = power;
  power = null;
  if (kind === 'meteor') {
    powerAnim = { type: 'meteor', col: meteorColumn(), t: 0, dur: 650 };
    state = 'power';
    Sound.play('meteor');
  } else if (kind === 'volcano') {
    powerAnim = { type: 'volcano', t: 0, dur: 950 };
    state = 'power';
    Sound.play('volcano');
  } else if (kind === 'egg') {
    // the falling piece turns into an egg bomb where its middle is
    const cs = cellsOf(piece);
    const egg = { kind: 'EGG', shape: [[1]], faceMap: [[false]], x: meteorColumn(), y: Math.max(...cs.map((c) => c[1])) };
    while (!fits(egg) && egg.y > 0) egg.y--;
    piece = egg;
    lockTimer = 0; lockResets = 0;
    popup('Egg Bomb!', '#fff59d', 0.8, 0.3);
    Sound.play('power');
  }
  paintPower();
}
function finishPower() {
  const a = powerAnim;
  powerAnim = null;
  const colors = ['#ff7043', '#ffca28', '#8d6e63', '#ffab40'];
  const burst = (x, y, n) => { for (let i = 0; i < n; i++) particles.push({ x: x + 0.5, y: y - HIDDEN + 0.5, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 12 - 2, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12, life: 1, color: colors[(Math.random() * colors.length) | 0] }); };
  if (a.type === 'meteor') {
    for (let y = 0; y < TOTAL_ROWS; y++) if (board[y][a.col]) { board[y][a.col] = null; burst(a.col, y, 6); }
    shake = 0.9;
    Sound.play('boom');
  } else if (a.type === 'volcano') {
    for (let x = 0; x < COLS; x++) if (board[TOTAL_ROWS - 1][x]) burst(x, TOTAL_ROWS - 1, 4);
    board.pop(); board.unshift(Array(COLS).fill(null));
    // keep the falling piece where it is unless it now overlaps something
    if (piece && !fits(piece)) piece.y = Math.max(0, piece.y - 1);
    shake = 0.7;
  }
  if (gameOpts.cascade && startCascade()) return;
  resumePlay();
}
function eggExplode() {
  const ex = piece.x, ey = piece.y;
  piece = null;
  const colors = ['#fffde7', '#ffca28', '#ff7043', '#81c784'];
  for (let y = ey - 1; y <= ey + 1; y++) for (let x = ex - 1; x <= ex + 1; x++) {
    if (x < 0 || x >= COLS || y < 0 || y >= TOTAL_ROWS) continue;
    board[y][x] = null;
    for (let i = 0; i < 4; i++) particles.push({ x: x + 0.5, y: y - HIDDEN + 0.5, vx: (Math.random() - 0.5) * 18, vy: -Math.random() * 14 - 2, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12, life: 1, color: colors[(Math.random() * colors.length) | 0] });
  }
  shake = 0.8;
  Sound.play('boom');
  popup('BOOM!', '#ffcc80', 1.1, 0.42);
  updateHud();
  if (gameOpts.cascade && startCascade()) return;
  resumePlay();
}

// Easy mode: when the blocks reach the top, a dino stomps away the bottom rows.
function startRescue() {
  savesLeft--;
  paintSave();
  state = 'rescue';
  piece = null;
  animTimer = RESCUE_ANIM_MS;
  shake = 1;
  popup('DINO STOMP!', '#ffcc80', 1.4);
  Sound.play('stomp');
}
function paintSave() {
  const panel = $('save-panel');
  panel.hidden = !(cfg && cfg.rescue) || !!puzzle;
  panel.classList.toggle('used', savesLeft <= 0);
  panel.setAttribute('aria-label', savesLeft > 0 ? 'Dino Stomp save ready' : 'Dino Stomp save used');
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
  if (state !== 'playing' && state !== 'clearing' && state !== 'rescue' && state !== 'cascading' && state !== 'power') return;
  pausedFrom = state;
  state = 'paused';
  releaseAllInput();
  Wake.off();
  Sound.stopMusic();
  $('btn-restart').hidden = !puzzle;
  $('btn-quit').textContent = puzzle ? 'Level map' : 'Main menu';
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
  puzzle = null;
  releaseAllInput();
  Wake.off();
  Sound.stopMusic();
  show(ui.menu);
  refreshMenu();
}

// ---------------------------------------------------------------------------
// Puzzle mode (Tetris Plus style): get Pip down to the nest before the spikes
// ---------------------------------------------------------------------------
const zoneOf = (i) => Math.floor(i / 20);
const levelLabel = (i) => (zoneOf(i) + 1) + '-' + ((i % 20) + 1);
const fmtTime = (ms) => { const s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
function puzzleCleared(i) { return !!pzProgress[i]; }
function first80Done() { for (let i = 0; i < 80; i++) if (!pzProgress[i]) return false; return true; }
function zoneUnlocked(z) { return z < 4 || first80Done(); }
function levelUnlocked(i) {
  if (!PZ[i] || !zoneUnlocked(zoneOf(i))) return false;
  return i % 20 === 0 || puzzleCleared(i - 1);
}

function setHudLabels(isPuzzle) {
  const lab = (el, t) => { const l = el.parentElement.querySelector('.label'); if (l) l.textContent = t; };
  lab(ui.score, isPuzzle ? 'Time' : 'Score');
  lab(ui.best, 'Best');
  lab(ui.level, 'Level');
  lab(ui.lines, isPuzzle ? 'Spikes' : 'Rows');
}

function startPuzzle(index) {
  const def = PZ[index];
  if (!def) return;
  mode = 'puzzle';
  cfg = { label: ZONES[def.zone].name, gravity: def.g, lockDelay: 500, ghost: false, next: true, rescue: false, das: 200, arr: 70 };
  ROWS = PC.ROWS; TOTAL_ROWS = PC.TOTAL;
  const st = PC.newState(def);
  puzzle = { index, def, st, pipX: st.walker.x, pipY: st.walker.y, ceilDraw: 0, hudTimer: 0, warned: -1, step: 0 };
  board = st.board;
  bag = null;
  score = 0; lines = 0; level = 1;
  gravityMs = def.g;
  particles.length = 0; popups.length = 0;
  nextKind = takeFromBag();
  ui.side.classList.remove('no-next');
  ui.modeBadge.textContent = ZONES[def.zone].name;
  $('save-panel').hidden = true;
  $('power-btn').hidden = true;
  ui.side.classList.remove('compact');
  setHudLabels(true);
  show(null);
  state = 'playing';
  releaseAllInput();
  layout();
  piece = null;
  puzzle.firstSpawn = true;        // first piece appears once Pip has dropped in from the top
  drawNext();
  puzzleHud();
  popup('Get Pip home!', '#fff59d', 0.8, 0.3);
  Wake.on();
  Sound.restartMusic();
}

function puzzleLock() {
  const st = puzzle.st;
  const cells = [];
  for (const [x, y, r, c] of cellsOf(piece)) {
    if (y >= 0) board[y][x] = { k: piece.kind, face: piece.faceMap[r][c] };
    cells.push([x, y]);
  }
  piece = null;
  Sound.play('land');
  const wy = st.walker.y;
  PC.afterLock(st, cells);
  if (st.status === 'lost') return puzzleLose('squished');
  if (st.walker.y < wy) popup('Climb!', '#fff', 0.7, 0.3);
  const full = [];
  for (let y = 0; y < TOTAL_ROWS; y++) if (board[y].every(Boolean)) full.push(y);
  if (full.length) {
    clearingRows = full;
    animTimer = CLEAR_ANIM_MS;
    state = 'clearing';
    Sound.play('clear', full.length);
    celebrate(full);
  } else spawn();
  puzzleHud();
}

function puzzleFinishClear() {
  const st = puzzle.st;
  const n = clearingRows.length;
  const ceilBefore = st.ceil;
  PC.removeRows(st, clearingRows);
  clearingRows = [];
  lines += n;
  if (st.ceil < ceilBefore) popup('Spikes pushed up!', '#80deea', 0.75, 0.62);
  state = 'playing';
  if (st.status === 'won') return puzzleWin();
  spawn();
  puzzleHud();
}

function ceilingInterval(st) { return st.time >= PC.FAST_AFTER_MS ? PC.FAST_CEIL_MS : PC.CEIL_MS; }

function puzzleTick(dt) {
  const st = puzzle.st;
  const cells = piece ? cellsOf(piece).map((c) => [c[0], c[1]]) : null;
  const before = st.walker.mode;
  PC.stepWalker(st, dt, cells);
  if (st.walker.mode === 'stun' && before !== 'stun') Sound.play('land');
  if (PC.stepCeiling(st, dt)) {
    Sound.play('stomp');
    shake = Math.max(shake, 0.35);
    if (piece && !fits(piece)) {
      if (fits(piece, null, piece.x, piece.y + 1)) piece.y++;
      else { piece = null; if (st.status === 'play') spawn(); }   // crushed by the spikes
    }
  }
  if (puzzle.firstSpawn && st.status === 'play' && (st.walker.mode !== 'fall' || st.time > 1500)) { puzzle.firstSpawn = false; spawn(); }
  // smooth movement for drawing
  const w = st.walker;
  puzzle.pipX += (w.x - puzzle.pipX) * Math.min(1, dt / 120);
  puzzle.pipY += (w.y - puzzle.pipY) * Math.min(1, dt / (w.mode === 'fall' ? 40 : 110));
  puzzle.ceilDraw += (st.ceil - puzzle.ceilDraw) * Math.min(1, dt / 160);
  puzzle.step += dt;
  // countdown blips for the last 3 seconds before the spikes drop
  const left = Math.ceil((ceilingInterval(st) - st.ceilTimer) / 1000);
  if (left <= 3 && left !== puzzle.warned && st.status === 'play') { puzzle.warned = left; Sound.play('move'); }
  if (left > 3) puzzle.warned = -1;
  puzzle.hudTimer -= dt;
  if (puzzle.hudTimer <= 0) { puzzle.hudTimer = 200; puzzleHud(); }
  if (st.status === 'won') puzzleWin();
  else if (st.status === 'lost') puzzleLose(st.lostWhy);
}

function puzzleHud() {
  if (!puzzle) return;
  const st = puzzle.st;
  ui.score.textContent = fmtTime(st.time);
  const p = pzProgress[puzzle.index];
  ui.best.textContent = p ? fmtTime(p.t) : '–';
  ui.level.textContent = levelLabel(puzzle.index);
  ui.lines.textContent = Math.max(0, Math.ceil((ceilingInterval(st) - st.ceilTimer) / 1000)) + 's';
}

function puzzleWin() {
  if (state === 'over') return;
  const st = puzzle.st;
  state = 'over';
  piece = null;
  releaseAllInput();
  Wake.off();
  Sound.stopMusic();
  Sound.play('clear', 4);
  const t = st.time, bonus = PC.timeBonus(t);
  const par = puzzle.def.par || 30000;
  const stars = t <= par ? 3 : t <= par * 2 ? 2 : 1;
  const prev = pzProgress[puzzle.index];
  const isBest = !prev || t < prev.t;
  pzProgress[puzzle.index] = { t: prev ? Math.min(prev.t, t) : t, s: Math.max(prev ? prev.s : 0, stars) };
  store.set('puzzle', pzProgress);
  celebrate([TOTAL_ROWS - 1, TOTAL_ROWS - 2]);
  popups.length = 0;
  popup('HOME!', '#fff59d', 1.3, 0.4);
  const idx = puzzle.index;
  setTimeout(() => { if (state === 'over' && puzzle && puzzle.index === idx) showPuzzleResult(true, { t, bonus, stars, isBest }); }, 1100);
}

function puzzleLose(why) {
  if (state === 'over') return;
  state = 'over';
  piece = null;
  releaseAllInput();
  Wake.off();
  Sound.stopMusic();
  Sound.play('gameOver');
  shake = 0.6;
  const idx = puzzle.index;
  setTimeout(() => { if (state === 'over' && puzzle && puzzle.index === idx) showPuzzleResult(false, { why }); }, 1000);
}

function showPuzzleResult(won, info) {
  const i = puzzle.index;
  $('pz-title').textContent = won ? 'Home!' : 'Oh no!';
  $('pz-sub').textContent = won ? 'Pip made it to the nest.'
    : info.why === 'ceiling' ? 'The spiky rocks got Pip.'
    : info.why === 'squished' ? 'Pip got squished!'
    : 'No room for more blocks.';
  const starsEl = $('pz-stars');
  starsEl.innerHTML = won ? [1, 2, 3].map((n) => '<span class="' + (n <= info.stars ? '' : 'off') + '">★</span>').join('') : '';
  starsEl.hidden = !won;
  $('pz-bonus').innerHTML = won ? 'Time ' + fmtTime(info.t) + ' · Bonus <strong>' + info.bonus.toLocaleString() + '</strong>' + (info.isBest ? '<br>New best time!' : '') : '';
  const hasNext = won && (i % 20) < 19 && levelUnlocked(i + 1);
  $('pz-next').hidden = !hasNext;
  $('pz-retry').hidden = false;
  $('pz-retry').textContent = won ? 'Play again' : 'Try again';
  $('pz-retry').classList.toggle('go', !won);
  show($('pz-over'));
  const { ctx, w, h } = fitCanvas($('pz-art'));
  ctx.clearRect(0, 0, w, h);
  drawPip(ctx, (w - h) / 2, 0, h, h, { dir: 1, mode: won ? 'happy' : 'stun', t: 400 });
}

// ----- zone map & level picker -----
let zoneShown = 0;
function openZones() {
  state = 'menu';
  puzzle = null;
  piece = null;
  Wake.off();
  Sound.stopMusic();
  show($('zones'));
  const list = $('zone-list');
  if (!list.children.length) {
    ZONES.forEach((z, zi) => {
      const b = document.createElement('button');
      b.className = 'zone';
      b.style.setProperty('--c', z.color);
      b.innerHTML = '<canvas></canvas><span class="zone-name"></span><span class="zone-count"></span>';
      list.appendChild(b);
      bindTap(b, () => { if (zoneUnlocked(zi)) openLevels(zi); else popupToast(b); });
    });
  }
  ZONES.forEach((z, zi) => {
    const b = list.children[zi];
    const done = Array.from({ length: 20 }, (_, k) => pzProgress[zi * 20 + k]).filter(Boolean);
    const stars = done.reduce((a, p) => a + p.s, 0);
    const open = zoneUnlocked(zi);
    b.classList.toggle('locked', !open);
    b.querySelector('.zone-name').textContent = z.name;
    b.querySelector('.zone-count').textContent = open ? done.length + '/20  ★' + stars : '🔒 Finish 80';
    drawArt(b.querySelector('canvas'), z.art);
  });
}
function popupToast(el) {
  el.querySelector('.zone-count').textContent = 'Beat the other 4 zones first!';
}
function openLevels(zi) {
  zoneShown = zi;
  state = 'menu';
  puzzle = null;
  piece = null;
  Wake.off();
  Sound.stopMusic();
  show($('levels'));
  $('levels-title').textContent = ZONES[zi].name;
  const grid = $('level-grid');
  if (!grid.children.length) {
    for (let k = 0; k < 20; k++) {
      const b = document.createElement('button');
      b.className = 'lvl';
      b.innerHTML = '<span class="num"></span><span class="st"></span>';
      grid.appendChild(b);
      bindTap(b, () => { const i = zoneShown * 20 + k; if (levelUnlocked(i)) startPuzzle(i); });
    }
  }
  let currentMarked = false;
  for (let k = 0; k < 20; k++) {
    const i = zi * 20 + k, b = grid.children[k];
    const p = pzProgress[i], open = levelUnlocked(i);
    b.style.setProperty('--c', ZONES[zi].color);
    b.classList.toggle('locked', !open);
    const cur = open && !p && !currentMarked;
    if (cur) currentMarked = true;
    b.classList.toggle('current', cur);
    b.querySelector('.num').textContent = open ? String(k + 1) : '🔒';
    b.querySelector('.st').textContent = p ? '★'.repeat(p.s) : '';
    b.setAttribute('aria-label', 'Level ' + (k + 1) + (open ? '' : ', locked'));
  }
}

// ----- puzzle drawing -----
function drawNest(ctx) {
  const y = boardH - cell * 0.55;
  ctx.save();
  ctx.fillStyle = 'rgba(255,236,179,.10)';
  ctx.fillRect(0, boardH - cell * 2, boardW, cell * 2);
  ctx.fillStyle = '#8d6e4a'; ctx.strokeStyle = '#5d4037'; ctx.lineWidth = Math.max(1.5, cell * 0.06);
  ctx.beginPath(); ctx.ellipse(boardW / 2, y + cell * 0.2, boardW * 0.42, cell * 0.42, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(93,64,55,.7)';
  for (let i = 0; i < 9; i++) { const x = boardW * (0.12 + i * 0.095); ctx.beginPath(); ctx.moveTo(x, y - cell * 0.05); ctx.lineTo(x + cell * 0.5, y + cell * 0.4); ctx.stroke(); }
  const eggs = ['#fff3e0', '#e1f5fe', '#fce4ec'];
  eggs.forEach((c, i) => {
    ctx.fillStyle = c; ctx.strokeStyle = '#5d4037';
    ctx.beginPath(); ctx.ellipse(boardW * (0.36 + i * 0.14), y - cell * 0.05, cell * 0.24, cell * 0.32, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  });
  ctx.restore();
}

function drawCeiling(ctx) {
  const st = puzzle.st;
  const left = (ceilingInterval(st) - st.ceilTimer) / 1000;
  const warn = st.status === 'play' && left <= 3;
  const jitter = warn ? Math.sin(performance.now() / 40) * cell * 0.05 : 0;
  const h = Math.max(cell * 0.12, puzzle.ceilDraw * cell) + jitter;
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#4e4038'); g.addColorStop(1, '#7a6658');
  ctx.fillStyle = g; ctx.fillRect(-10, -10, boardW + 20, h + 10);
  // rock speckles
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  for (let i = 0; i < puzzle.ceilDraw * 6; i++) {
    const rx = (i * 37 % 100) / 100 * boardW, ry = ((i * 53) % 100) / 100 * h;
    ctx.beginPath(); ctx.arc(rx, ry, cell * 0.12, 0, 7); ctx.fill();
  }
  // spikes
  const n = COLS * 2, sw = boardW / n, sh = cell * 0.36;
  ctx.fillStyle = warn ? '#ef5350' : '#cfd8dc';
  ctx.strokeStyle = '#37474f'; ctx.lineWidth = Math.max(1, cell * 0.05);
  for (let i = 0; i < n; i++) {
    ctx.beginPath(); ctx.moveTo(i * sw, h); ctx.lineTo(i * sw + sw / 2, h + sh); ctx.lineTo(i * sw + sw, h); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

function drawPipOnBoard(ctx) {
  const st = puzzle.st, w = st.walker;
  const won = st.status === 'won';
  const px = puzzle.pipX * cell, py = (puzzle.pipY - HIDDEN) * cell;
  const mode = won ? 'happy' : st.status === 'lost' ? 'stun' : w.mode;
  drawPip(ctx, px, py, cell * 2, cell * 2, { dir: w.dir, mode, t: puzzle.step });
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
    case 'power':
      usePower();
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
  activePresses.clear();
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
// fires on finger-down (no 300 ms delay) and ALWAYS lets go when that finger lifts,
// wherever it lifts. Every press is tracked in one place (activePresses), and lifts are
// caught on the whole page, so a lift that lands somewhere else, a touch the system
// cancels, a touch that couldn't be locked to the button, or an app switch mid-press
// can no longer leave a button stuck "on" or "busy".
const activePresses = new Map();          // pointerId -> { el, onUp }
function endPress(pointerId, e) {
  const pr = activePresses.get(pointerId);
  if (!pr) return;
  activePresses.delete(pointerId);
  pr.el.classList.remove('down');
  pr.onUp && pr.onUp(e);
}
function endAllPresses() {
  for (const id of [...activePresses.keys()]) endPress(id);
}
function bindButton(el, onDown, onUp) {
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    // a new press always wins: drop any older press still registered on this button
    for (const [id, pr] of activePresses) if (pr.el === el) endPress(id, e);
    activePresses.set(e.pointerId, { el, onUp });
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
    el.classList.add('down');
    Sound.unlock();
    onDown && onDown(e);
  });
}
// lifts and cancels are caught for the whole page, before anything else sees them
window.addEventListener('pointerup', (e) => endPress(e.pointerId, e), true);
window.addEventListener('pointercancel', (e) => endPress(e.pointerId, e), true);
// last finger off the screen = nothing can still be held (covers lifts the browser never reports as pointer events)
const allFingersUp = (e) => { if (!e.touches || e.touches.length === 0) endAllPresses(); };
document.addEventListener('touchend', allFingersUp, true);
document.addEventListener('touchcancel', allFingersUp, true);

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
document.querySelectorAll('.mode[data-mode]').forEach((el) => bindTap(el, () => openOptions(el.dataset.mode)));
let optMode = 'easy';
const OPT_ART = { easy: 'I', medium: 'T', hard: 'L' };
function paintOptions() {
  $('opt-powers').setAttribute('aria-checked', String(gameOpts.powers));
  $('opt-cascade').setAttribute('aria-checked', String(gameOpts.cascade));
}
function openOptions(m) {
  optMode = m;
  $('opt-title').textContent = MODES[m].label;
  paintOptions();
  show($('options'));
  drawArt($('opt-art'), OPT_ART[m]);
}
bindTap($('opt-powers'), () => { gameOpts.powers = !gameOpts.powers; store.set('options', gameOpts); paintOptions(); });
bindTap($('opt-cascade'), () => { gameOpts.cascade = !gameOpts.cascade; store.set('options', gameOpts); paintOptions(); });
bindTap($('opt-play'), () => startGame(optMode));
bindTap($('opt-back'), toMenu);
bindTap($('btn-pause'), pauseGame);
bindTap($('btn-resume'), resumeGame);
bindTap($('btn-quit'), () => { if (puzzle) openLevels(zoneOf(puzzle.index)); else toMenu(); });
bindTap($('btn-restart'), () => { if (puzzle) startPuzzle(puzzle.index); });
bindTap($('btn-puzzle'), openZones);
bindButton($('power-btn'), () => usePower());
bindTap($('zones-back'), toMenu);
bindTap($('levels-back'), openZones);
bindTap($('pz-next'), () => { if (puzzle) startPuzzle(puzzle.index + 1); });
bindTap($('pz-retry'), () => { if (puzzle) startPuzzle(puzzle.index); });
bindTap($('pz-map'), () => { const z = puzzle ? zoneOf(puzzle.index) : 0; openLevels(z); });
bindTap($('btn-again'), () => startGame(mode));
bindTap($('btn-menu'), toMenu);
bindTap(ui.sound, () => { settings.sound = !settings.sound; store.set('settings', settings); Sound.applySettings(); paintToggles(); });
bindTap(ui.music, () => {
  settings.music = !settings.music; store.set('settings', settings); Sound.applySettings(); paintToggles();
});

const KEYMAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', ArrowUp: 'rotate', KeyX: 'rotate', KeyA: 'left', KeyD: 'right', KeyS: 'down', KeyW: 'rotate', Space: 'harddrop', KeyE: 'power', Enter: 'power' };
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
  if (document.visibilityState === 'hidden') { pauseGame(); releaseAllInput(); Sound.suspend(); }
});
window.addEventListener('pagehide', () => { pauseGame(); Sound.suspend(); });
window.addEventListener('blur', () => { pauseGame(); releaseAllInput(); });   // e.g. Control Centre pulled down, incoming call

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
  wrap.style.alignItems = puzzle ? 'center' : 'flex-start';
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
  if (!(size >= 2)) return;
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
  ctx.fillStyle = puzzle ? ZONES[puzzle.def.zone].bg : '#1c2a48'; ctx.fillRect(-10, -10, boardW + 20, boardH + 20);
  if (puzzle) drawNest(ctx);
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
      const off = (state === 'cascading' || (state === 'paused' && pausedFrom === 'cascading')) && b.fall
        ? -b.fall * cell * Math.max(0, Math.min(1, animTimer / CASCADE_MS)) : 0;
      drawCell(ctx, b.k, px, py + off, cell, b.face, false, a);
    }
  }

  // ghost (Easy) and falling piece
  if (piece && state !== 'over' && state !== 'menu') {
    if (power === 'meteor' && state === 'playing' && !puzzle) drawMeteorTarget(ctx);
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
      if (piece.kind === 'EGG') drawEggBomb(ctx, x * cell, (y - HIDDEN) * cell, cell);
      else drawCell(ctx, piece.kind, x * cell, (y - HIDDEN) * cell, cell, piece.faceMap[r][c], true);
    }
  }
  if (state === 'power' || (state === 'paused' && pausedFrom === 'power')) drawPowerAnim(ctx);

  if (puzzle) { drawPipOnBoard(ctx); drawCeiling(ctx); }

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

function drawMeteorTarget(ctx) {
  const col = meteorColumn();
  const top = (Math.max(...cellsOf(piece).map((c) => c[1])) + 1 - HIDDEN) * cell;
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 180);
  ctx.save();
  ctx.fillStyle = 'rgba(255,112,67,' + (0.12 + 0.12 * pulse) + ')';
  ctx.fillRect(col * cell, top, cell, boardH - top);
  ctx.strokeStyle = 'rgba(255,171,64,' + (0.5 + 0.4 * pulse) + ')'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
  ctx.strokeRect(col * cell + 1, top, cell - 2, boardH - top - 1);
  ctx.restore();
}
function drawPowerAnim(ctx) {
  const a = powerAnim;
  if (!a) return;
  const k = Math.min(1, a.t / a.dur);
  ctx.save();
  if (a.type === 'meteor') {
    const cx = (a.col + 0.5) * cell, cy = -cell + k * (boardH + cell);
    ctx.fillStyle = 'rgba(255,112,67,.25)'; ctx.fillRect(a.col * cell, 0, cell, cy);
    drawPowerIcon(ctx, 'meteor', cx - cell * 1.2, cy - cell * 1.6, cell * 2.4, cell * 2.2, true);
  } else if (a.type === 'volcano') {
    const h = cell * (0.3 + 1.0 * Math.sin(k * Math.PI / 2));
    const g = ctx.createLinearGradient(0, boardH - h, 0, boardH);
    g.addColorStop(0, '#ffca28'); g.addColorStop(0.4, '#ff7043'); g.addColorStop(1, '#bf360c');
    ctx.fillStyle = 'rgba(255,87,34,' + (0.25 * k) + ')'; ctx.fillRect(0, 0, boardW, boardH);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, boardH);
    for (let x = 0; x <= boardW; x += cell / 2) ctx.lineTo(x, boardH - h - Math.sin(x / cell * 2 + a.t / 90) * cell * 0.15);
    ctx.lineTo(boardW, boardH); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe082';
    for (let i = 0; i < 6; i++) { const bx = ((i * 97 + a.t / 4) % boardW), by = boardH - h * (0.3 + 0.5 * ((i * 37 + a.t / 7) % 100) / 100); ctx.beginPath(); ctx.arc(bx, by, cell * 0.12, 0, 7); ctx.fill(); }
  }
  ctx.restore();
}
function drawEggBomb(ctx, x, y, size) {
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  const s = size / 40;
  ctx.scale(s, s);
  ctx.lineWidth = 2.6; ctx.strokeStyle = '#2b1f3a';
  ctx.beginPath(); ctx.moveTo(0, -17); ctx.bezierCurveTo(12, -17, 16, 2, 16, 6); ctx.bezierCurveTo(16, 15, 9, 18, 0, 18); ctx.bezierCurveTo(-9, 18, -16, 15, -16, 6); ctx.bezierCurveTo(-16, 2, -12, -17, 0, -17); ctx.closePath();
  ctx.fillStyle = '#fffde7'; ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#e57373'; [[-6, -2, 3], [6, 6, 3.4], [-3, 10, 2.4]].forEach(([a, b, r]) => { ctx.beginPath(); ctx.arc(a, b, r, 0, 7); ctx.fill(); });
  // fuse + spark
  ctx.beginPath(); ctx.moveTo(0, -17); ctx.quadraticCurveTo(4, -22, 8, -21); ctx.stroke();
  const f = 3 + Math.sin(performance.now() / 60) * 1.5;
  ctx.fillStyle = '#ffca28'; ctx.beginPath(); ctx.arc(9, -21, f, 0, 7); ctx.fill();
  ctx.restore();
}
function drawPowerIcon(ctx, type, x, y, w, h, flying) {
  ctx.save();
  const s = Math.min(w, h) / 48;
  ctx.translate(x + (w - 48 * s) / 2, y + (h - 48 * s) / 2);
  ctx.scale(s, s);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = '#2b1f3a'; ctx.lineWidth = 2.6;
  if (type === 'meteor') {
    if (flying) { ctx.rotate(Math.PI * 0.75); ctx.translate(-10, -40); }
    ctx.strokeStyle = '#ff7043'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(42, 4); ctx.lineTo(24, 22); ctx.stroke();
    ctx.strokeStyle = '#ffe082'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(38, 4); ctx.lineTo(22, 20); ctx.stroke();
    ctx.strokeStyle = '#2b1f3a'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(18, 30, 13, 0, 7); ctx.fillStyle = '#8d6e63'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#6d4c41'; [[13, 26, 3.2], [22, 35, 2.6], [22, 25, 2]].forEach(([a, b, r]) => { ctx.beginPath(); ctx.arc(a, b, r, 0, 7); ctx.fill(); });
  } else if (type === 'volcano') {
    ctx.fillStyle = 'rgba(158,158,158,.8)'; [[20, 8, 5], [28, 5, 4], [34, 9, 3]].forEach(([a, b, r]) => { ctx.beginPath(); ctx.arc(a, b, r, 0, 7); ctx.fill(); });
    ctx.beginPath(); ctx.moveTo(4, 44); ctx.lineTo(18, 16); ctx.lineTo(30, 16); ctx.lineTo(44, 44); ctx.closePath(); ctx.fillStyle = '#8d6e63'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(18, 16); ctx.lineTo(30, 16); ctx.lineTo(27, 26); ctx.lineTo(24, 22); ctx.lineTo(21, 28); ctx.closePath(); ctx.fillStyle = '#ff5722'; ctx.fill(); ctx.stroke();
  } else {
    drawEggBomb(ctx, 4, 6, 40);
  }
  ctx.restore();
}

function drawNext() {
  if (!nextKind) return;
  const { ctx, w, h } = fitCanvas(nextCanvas);
  ctx.clearRect(0, 0, w, h);
  ui.nextName.textContent = DINOS[nextKind].name;
  if (w < 24 || h < 24) return;          // panel hidden (Hard mode) or not laid out yet
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
  if (size < 4) return;
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
  if (puzzle) return puzzleHud();
  if (state !== 'over' && state !== 'menu') saveBestIfNeeded();
  checkPowerEarn();
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
  for (const o of [ui.menu, ui.pause, ui.over, $('zones'), $('levels'), $('pz-over'), $('options')]) o.classList.toggle('show', o === overlay);
}

function refreshMenu() {
  document.querySelectorAll('[data-best]').forEach((el) => {
    const v = bests[el.dataset.best];
    el.textContent = v ? 'Best: ' + v : 'Tap to play';
  });
  document.querySelectorAll('canvas[data-dino]').forEach((c) => drawArt(c, c.dataset.dino));
  const pipC = document.querySelector('canvas[data-pip]');
  if (pipC) { const r = fitCanvas(pipC); r.ctx.clearRect(0, 0, r.w, r.h); drawPip(r.ctx, (r.w - r.h) / 2, 0, r.h, r.h, { dir: 1, mode: 'walk', t: 0 }); }
  const doneN = Object.keys(pzProgress).length;
  $('puzzle-progress').textContent = doneN ? doneN + '/100 done' : '100 puzzles';
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
  if (state === 'cascading') {
    animTimer -= dt;
    if (animTimer <= 0) finishCascade();
    return;
  }
  if (state === 'power') {
    powerAnim.t += dt;
    if (powerAnim.t >= powerAnim.dur) finishPower();
    return;
  }
  if (puzzle && state === 'playing') { puzzleTick(dt); if (state !== 'playing') return; }
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
  // keep the loop alive no matter what: schedule the next frame first
  requestAnimationFrame(frame);
  // clamp the step so a frozen tab (or a debugger) can't make pieces teleport
  const dt = Math.min(50, Math.max(0, now - lastTime));
  lastTime = now;
  try { update(dt); } catch (e) { console.error(e); }
  try { if (state !== 'menu') render(); } catch (e) { console.error(e); }
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
  get piece() { return piece; }, get board() { return board; }, get puzzle() { return puzzle; }, startPuzzle, get held() { return Object.keys(held); }, get savesLeft() { return savesLeft; }, get chain() { return chain; }, gameOpts, get power() { return power; }, setPower(k) { power = k; paintPower(); }, addScore(n) { score += n; updateHud(); }, testClear(rows) { clearingRows = rows; animTimer = 1; chain = 1; state = 'clearing'; piece = null; }, startGame, press, release, pauseGame, resumeGame };
})();
