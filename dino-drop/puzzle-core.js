/* Dino Drop: puzzle-mode rules (shared by the game and the level builder).
   Modelled on Tetris Plus "Puzzle Mode":
   - 10 x 15 well, pre-built pile of blocks.
   - A 2x2 explorer (Pip the baby dino) walks until he bumps something, then turns.
     He drops through gaps at least 2 wide, is dizzy after a long fall, and climbs on top
     of any block that lands on him.
   - Goal: get him to the bottom of the well.
   - A spiked ceiling comes down one notch every 18 s, destroying blocks; clearing 3 or 4
     rows at once pushes it back up. After 125 s it comes down much faster.
     If it touches the explorer, the level is lost.
   - Score: time bonus, 20,000 for 10 s or less, minus 100 per extra quarter-second. */
(function (root) {
'use strict';

const P = {
  COLS: 10,
  ROWS: 15,
  HIDDEN: 2,
  WALK_MS: 450,        // time to walk one column
  FALL_MS: 65,         // time to fall one row
  STUN_ROWS: 4,        // falls this long make Pip dizzy
  STUN_MS: 1300,
  CEIL_MS: 18000,      // ceiling drops one notch this often...
  FAST_AFTER_MS: 125000,
  FAST_CEIL_MS: 3000,  // ...and this often after 125 s
  BONUS_MAX: 20000,
};
P.TOTAL = P.ROWS + P.HIDDEN;

P.SHAPES = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1],[0,0,0]],
  S: [[0,1,1],[1,1,0],[0,0,0]],
  Z: [[1,1,0],[0,1,1],[0,0,0]],
  L: [[0,0,1],[1,1,1],[0,0,0]],
  J: [[1,0,0],[1,1,1],[0,0,0]],
};
P.KINDS = Object.keys(P.SHAPES);

// Level gravity: ms per row. Level 1 = 800 ms, level 100 = ~190 ms.
P.gravityFor = (n) => Math.round(800 * Math.pow(0.9856, n - 1));

P.timeBonus = (ms) => {
  const over = Math.max(0, ms - 10000);
  return Math.max(0, P.BONUS_MAX - Math.ceil(over / 250) * 100);
};

/* ---- level encoding ----
   A level is { x, dir, rows: [string top->bottom of the pile] } where each string is
   10 chars: '.' empty, or a piece letter for a block. Rows are placed at the bottom. */
P.buildBoard = (level) => {
  const board = Array.from({ length: P.TOTAL }, () => Array(P.COLS).fill(null));
  const rows = level.rows;
  for (let i = 0; i < rows.length; i++) {
    const y = P.TOTAL - rows.length + i;
    for (let x = 0; x < P.COLS; x++) {
      const ch = rows[i][x];
      if (ch && ch !== '.') board[y][x] = { k: ch, face: false };
    }
  }
  return board;
};

P.newState = (level) => ({
  board: P.buildBoard(level),
  ceil: 0,                 // visible rows covered by the ceiling
  ceilTimer: 0,
  time: 0,
  walker: { x: level.x, y: P.HIDDEN, dir: level.dir || 1, mode: 'fall', t: 0, fell: 0, drawY: P.HIDDEN, drawX: level.x },
  status: 'play',          // play | won | lost
  lostWhy: null,
});

const topLimit = (st) => P.HIDDEN + st.ceil;   // first board row below the ceiling

// Is the 2x2 area at (x, y) free of blocks, walls, floor, ceiling and the given extra cells?
P.areaFree = (st, x, y, extra) => {
  if (x < 0 || x + 1 >= P.COLS || y < topLimit(st) || y + 1 >= P.TOTAL) return false;
  for (let dy = 0; dy < 2; dy++)
    for (let dx = 0; dx < 2; dx++)
      if (st.board[y + dy][x + dx]) return false;
  if (extra) for (const [cx, cy] of extra) if (cx >= x && cx <= x + 1 && cy >= y && cy <= y + 1) return false;
  return true;
};
P.walkerCells = (w) => [[w.x, w.y], [w.x + 1, w.y], [w.x, w.y + 1], [w.x + 1, w.y + 1]];
P.isWalkerCell = (st, x, y) => {
  const w = st.walker;
  return st.status === 'play' && x >= w.x && x <= w.x + 1 && y >= w.y && y <= w.y + 1;
};
const onFloor = (w) => w.y + 2 >= P.TOTAL;
const supported = (st, w, extra) => {
  if (onFloor(w)) return true;
  const by = w.y + 2;
  if (st.board[by][w.x] || st.board[by][w.x + 1]) return true;
  if (extra) for (const [cx, cy] of extra) if (cy === by && (cx === w.x || cx === w.x + 1)) return true;
  return false;
};

/* Advance Pip by dt ms. `extra` = cells of the falling piece (he won't walk into it). */
P.stepWalker = (st, dt, extra) => {
  const w = st.walker;
  if (st.status !== 'play') return;
  if (onFloor(w)) { st.status = 'won'; return; }
  w.t += dt;
  // falling
  if (!supported(st, w, extra)) {
    if (w.mode !== 'fall') { w.mode = 'fall'; w.t = 0; w.fell = 0; }
    while (w.t >= P.FALL_MS && !supported(st, w, extra)) {
      w.t -= P.FALL_MS; w.y++; w.fell++;
      if (onFloor(w)) { st.status = 'won'; return; }
    }
    return;
  }
  if (w.mode === 'fall') {
    w.mode = w.fell >= P.STUN_ROWS ? 'stun' : 'walk';
    w.t = 0; w.fell = 0;
    return;
  }
  if (w.mode === 'stun') {
    if (w.t >= P.STUN_MS) { w.mode = 'walk'; w.t = 0; }
    return;
  }
  // walking
  while (w.t >= P.WALK_MS) {
    w.t -= P.WALK_MS;
    const nx = w.x + w.dir;
    if (P.areaFree(st, nx, w.y, extra)) { w.x = nx; if (!supported(st, w, extra)) { w.mode = 'fall'; w.t = 0; w.fell = 0; return; } }
    else w.dir = -w.dir;   // bumped into something: turn around
  }
};

/* Called after a piece locks (cells already written to the board, before line clears).
   If the piece landed on Pip's head, he climbs on top of it. */
P.afterLock = (st, cells) => {
  const w = st.walker;
  if (st.status !== 'play') return;
  const onHead = cells.some(([x, y]) => (x === w.x || x === w.x + 1) && y === w.y - 1);
  const overlap = cells.some(([x, y]) => x >= w.x && x <= w.x + 1 && y >= w.y && y <= w.y + 1);
  if (!onHead && !overlap) return;
  for (let ny = w.y - 1; ny >= topLimit(st); ny--) {
    if (P.areaFree(st, w.x, ny)) { w.y = ny; w.mode = 'walk'; w.t = 0; return; }
  }
  st.status = 'lost'; st.lostWhy = 'squished';
};

/* Remove full rows. Returns the list of cleared row indexes (top->bottom).
   Pip moves down with the rows beneath him. Clearing 3+ rows pushes the ceiling up. */
P.clearLines = (st) => {
  const full = [];
  for (let y = 0; y < P.TOTAL; y++) if (st.board[y].every(Boolean)) full.push(y);
  if (!full.length) return full;
  P.removeRows(st, full);
  return full;
};
P.removeRows = (st, full) => {
  const w = st.walker;
  const below = full.filter((y) => y > w.y + 1).length;
  for (const y of full) { st.board.splice(y, 1); st.board.unshift(Array(P.COLS).fill(null)); }
  if (st.status === 'play') w.y += below;
  if (full.length >= 3) { st.ceil = Math.max(0, st.ceil - (full.length >= 4 ? 2 : 1)); st.ceilTimer = 0; }
  if (st.status === 'play' && onFloor(w)) st.status = 'won';
};

/* Advance the clock and ceiling. Returns true if the ceiling moved down. */
P.stepCeiling = (st, dt) => {
  if (st.status !== 'play') return false;
  st.time += dt;
  st.ceilTimer += dt;
  const interval = st.time >= P.FAST_AFTER_MS ? P.FAST_CEIL_MS : P.CEIL_MS;
  if (st.ceilTimer < interval) return false;
  st.ceilTimer -= interval;
  st.ceil = Math.min(P.ROWS, st.ceil + 1);
  for (let y = 0; y < topLimit(st); y++) st.board[y].fill(null);   // spikes destroy blocks
  if (st.walker.y < topLimit(st)) { st.status = 'lost'; st.lostWhy = 'ceiling'; }
  return true;
};

/* Where a new piece appears: its top occupied row sits just under the ceiling. */
P.spawnPos = (st, shape) => {
  let top = 0;
  while (top < shape.length && !shape[top].some(Boolean)) top++;
  return { x: Math.floor((P.COLS - shape[0].length) / 2), y: topLimit(st) - top };
};

/* Can a piece sit here? Blocks, walls, floor, ceiling and Pip all count as solid. */
P.fits = (st, shape, px, py) => {
  const lim = topLimit(st);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const x = px + c, y = py + r;
      if (x < 0 || x >= P.COLS || y >= P.TOTAL || y < lim) return false;
      if (st.board[y][x]) return false;
      if (P.isWalkerCell(st, x, y)) return false;
    }
  return true;
};

if (typeof module !== 'undefined' && module.exports) module.exports = P;
else root.PuzzleCore = P;
})(typeof window !== 'undefined' ? window : globalThis);
