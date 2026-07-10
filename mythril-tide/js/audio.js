// MYTHRIL TIDE - audio.js : richer WebAudio chiptune engine + FTL-style music
// ----------------------------------------------------------------------------
// Path-B "much richer engine": multi-voice instrument presets with ADSR
// envelopes, vibrato, pitch-glide, pulse-width waves, additive partials, simple
// FM, a per-note lowpass for plucks/mallets, and a shared feedback-delay send.
//
// EVERY slot except the title holds THREE songs in the same genre (variants
// 1/2/3). A sea picks one variant per voyage; its EXPLORE and BATTLE layers are
// the SAME variant so the FTL crossfade stays coherent. The Jukebox lets you
// pick a specific variant. Selection: music follows the SEA you are in; fighting
// the Imperial Armada or the Warden overrides the battle slot with their theme.
//
// Token grammar per channel `seq`: "NOTE:LEN", "NOTE:LEN@V" (vel 1-9), "R:LEN"
// rest. Drum channels (inst 'drum') use letters: K kick, S snare, H hat, O open
// hat, T tom, C clap, W woodblock/clave, A anvil, R rim, B shaker. INVARIANT:
// every channel in a layer sums to the same step count, and a theme's explore &
// battle layers match - dev/music_check.js enforces it across all variants.
'use strict';

const NOTE_IDX = { C: 0, 'C#': 1, DB: 1, D: 2, 'D#': 3, EB: 3, E: 4, F: 5, 'F#': 6, GB: 6, G: 7, 'G#': 8, AB: 8, A: 9, 'A#': 10, BB: 10, B: 11 };
function noteFreq(tok) {
  const m = /^([A-G][#B]?)(\d)$/.exec(tok.toUpperCase());
  if (!m) return 0;
  const midi = NOTE_IDX[m[1]] + (parseInt(m[2]) + 1) * 12;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const INSTR = {
  pulse:   { wave: 'p25', a: 0.005, d: 0.05, s: 0.72, r: 0.06, gain: 1.0 },
  pulseV:  { wave: 'p25', a: 0.010, d: 0.06, s: 0.78, r: 0.08, gain: 1.0, vib: { r: 5.5, d: 6 }, echo: true },
  thin:    { wave: 'p12', a: 0.004, d: 0.05, s: 0.65, r: 0.05, gain: 0.95 },
  square:  { wave: 'square', a: 0.005, d: 0.04, s: 0.82, r: 0.05, gain: 0.95 },
  whistle: { wave: 'triangle', a: 0.03, d: 0.08, s: 0.85, r: 0.12, gain: 1.15, vib: { r: 5, d: 5 }, echo: true },
  saw:     { wave: 'sawtooth', a: 0.008, d: 0.06, s: 0.70, r: 0.06, gain: 0.8 },
  pluck:   { wave: 'sawtooth', a: 0.002, d: 0.14, s: 0.0, r: 0.08, gain: 1.05, lp: { f: 2800, to: 600 } },
  nylon:   { wave: 'triangle', a: 0.002, d: 0.20, s: 0.0, r: 0.10, gain: 1.2, lp: { f: 3200, to: 800 } },
  bell:    { wave: 'sine', a: 0.001, d: 0.55, s: 0.0, r: 0.35, gain: 1.0, fm: { ratio: 3.0, amp: 2.2, decay: 0.28 }, echo: true },
  glass:   { wave: 'sine', a: 0.001, d: 0.7, s: 0.0, r: 0.45, gain: 0.95, fm: { ratio: 2.0, amp: 1.3, decay: 0.45 }, echo: true },
  organ:   { wave: 'square', a: 0.05, d: 0.1, s: 0.9, r: 0.18, gain: 0.62, harm: [1, 0.5, 0.33], detune: 4 },
  pad:     { wave: 'triangle', a: 0.12, d: 0.2, s: 0.85, r: 0.4, gain: 0.8, detune: 7, echo: true },
  choir:   { wave: 'sine', a: 0.16, d: 0.2, s: 0.9, r: 0.5, gain: 0.95, harm: [1, 0.6, 0.3], detune: 8, vib: { r: 4, d: 4 }, echo: true },
  brass:   { wave: 'sawtooth', a: 0.02, d: 0.06, s: 0.85, r: 0.08, gain: 0.82, harm: [1, 0.5], detune: 6 },
  siren:   { wave: 'sine', a: 0.05, d: 0.2, s: 0.85, r: 0.4, gain: 1.0, vib: { r: 5.5, d: 8 }, glide: 0.06, echo: true },
  bass:    { wave: 'triangle', a: 0.004, d: 0.05, s: 0.8, r: 0.05, gain: 1.25 },
  subbass: { wave: 'sine', a: 0.004, d: 0.05, s: 0.85, r: 0.06, gain: 1.5 },
  sawbass: { wave: 'sawtooth', a: 0.004, d: 0.07, s: 0.7, r: 0.06, gain: 1.05, lp: { f: 950, to: 480 } },
  drum:    { wave: 'drum', gain: 1.0 },
};

// ============================================================================
//  THEMES (sea -> 3 variants, each a synced explore/battle pair) and SOLO tracks
// ============================================================================
const THEMES = {};
const SOLO = {};
// drum-bar shorthands (each 16 steps) reused across variants of a genre
const D = {
  shanty: 'K:2 H:2 S:2 H:2 K:2 K:2 S:2 H:2',
  shantyB:'K:2 H:2 S:2 H:2 K:2 K:2 S:2 H:2 K:2 H:2 S:2 H:2 K:2 K:2 S:2 O:2',
  shFill: 'K:2 H:2 S:2 H:2 K:2 S:2 K:2 S:2',
  aqua:   'K:4 B:2 W:2 S:4 B:2 W:2',
  aquaF:  'K:4 B:2 W:2 S:2 B:2 W:2 W:2',
  war:    'K:2 T:2 C:2 K:2 T:2 C:2 K:2 C:2',
  warB:   'K:2 T:2 C:2 K:2 T:2 K:2 C:2 T:2',
  flam:   'K:2 C:2 W:2 C:2 K:2 C:2 C:2 W:2',
  flamB:  'K:2 C:2 K:2 C:2 W:2 C:2 K:2 C:2',
  reel:   'K:2 T:2 K:2 T:2 K:2 T:2 K:2 T:2',
  reelB:  'K:2 T:2 S:2 T:2 K:2 T:2 S:2 O:2',
  forge:  'K:4 A:4 K:4 A:4',
  forgeB: 'K:2 A:2 K:2 A:2 S:2 A:2 K:2 A:2',
  lull:   'K:4 B:2 W:2 R:4 B:2 W:2',
  lullF:  'K:4 B:2 W:2 K:2 B:2 W:2 W:2',
  march:  'K:4 R:2 S:2 K:2 K:2 S:4',
  marchB: 'K:2 S:2 K:2 S:2 K:2 K:2 S:2 S:2',
};
const rep = (bar, n) => Array(n).fill(bar).join(' ');

// ---- long-form arranger -----------------------------------------------------
// Build FTL-style multi-minute loops from short named sections + an arrangement
// "form". Each section is a normal channels array (internally phase-locked). The
// form lists section letters in order; a form entry may mute voices for that pass
// (arrangement dynamics) as ['A', ['drum','whistle']]. Absent/muted voices get a
// rest of the section's length, so every output channel stays perfectly aligned.
function _seqLen(seq) { return seq.trim().split(/\s+/).reduce((a, t) => a + parseInt(t.split('@')[0].split(':')[1] || '1'), 0); }
function arrange(sections, form) {
  const order = [], vol = {};
  for (const k of Object.keys(sections)) for (const ch of sections[k]) if (!(ch.inst in vol)) { order.push(ch.inst); vol[ch.inst] = ch.vol; }
  const out = order.map(inst => ({ inst, vol: vol[inst], seq: '' }));
  for (const f of form) {
    const k = Array.isArray(f) ? f[0] : f, mute = Array.isArray(f) ? (f[1] || []) : [];
    const len = _seqLen(sections[k][0].seq);
    for (const c of out) {
      const ch = sections[k].find(x => x.inst === c.inst);
      c.seq += (ch && mute.indexOf(c.inst) < 0) ? (ch.seq + ' ') : ('R:' + len + ' ');
    }
  }
  for (const c of out) c.seq = c.seq.trim();
  return out;
}
// theme variant: explore + battle share one form so their sections stay aligned
function V(bpm, ex, ba, form) { return { bpm, explore: arrange(ex, form), battle: arrange(ba, form) }; }
function S(bpm, loop, secs, form) { return { bpm, loop, channels: arrange(secs, form) }; }

// ---- transpose + battle-derivation (used while authoring song 2/3) ----------
const _NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function _midi(tok) { const m = /^([A-G][#B]?)(\d)$/.exec(tok.toUpperCase()); return m ? NOTE_IDX[m[1]] + (parseInt(m[2]) + 1) * 12 : null; }
function _fromMidi(m) { return _NOTE_NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1); }
// transpose only pitched tokens; rests + drum letters pass through untouched
function tr(seq, semis) {
  if (!semis) return seq;
  return seq.trim().split(/\s+/).map(t => { const p = t.split(':'); const m = _midi(p[0]); return m == null ? t : _fromMidi(m + semis) + ':' + p.slice(1).join(':'); }).join(' ');
}
// derive a battle layer from an explore layer: lead an octave up on `lead` inst,
// first non-lead non-bass voice on `harm` inst, bass kept, genre battle drums.
function toBattle(ex, lead, lv, harm, hv, drumSeq, dv, leadShift) {
  const bassCh = ex.find(c => /bass/.test(c.inst));
  const sec = ex.find((c, i) => i > 0 && !/bass/.test(c.inst));
  const out = [{ inst: lead, vol: lv, seq: tr(ex[0].seq, leadShift == null ? 12 : leadShift) }];
  if (sec) out.push({ inst: harm, vol: hv, seq: sec.seq });
  if (bassCh) out.push({ inst: bassCh.inst, vol: bassCh.vol, seq: bassCh.seq });
  out.push({ inst: 'drum', vol: dv, seq: drumSeq });
  return out;
}

// ---------------------------------------------------------------------------
// r1  THE OLD COAST (humans / free pirates): bright hornpipe sea-shanty, D major
// ---------------------------------------------------------------------------
THEMES.r1 = (function () {
  // intro (lead+bass) -> build -> A/B trade with a drum drop -> sparse outro, then loops
  const form = [
    ['A', ['whistle', 'square', 'drum']], ['A', ['drum']], 'A', 'B', ['A', ['whistle', 'square']],
    'B', 'A', ['B', ['drum']], 'A', 'B', ['A', ['whistle', 'square', 'drum']],
  ];
  const dEx = { inst: 'drum', vol: 0.10, seq: rep(D.shanty, 3) + ' ' + D.shFill };
  const dBa = { inst: 'drum', vol: 0.14, seq: rep(D.shantyB, 2) };
  return { variants: [
    V(112,
      { A: [
        { inst: 'pulse', vol: 0.13, seq: 'D5:2 F#5:2 A5:2 F#5:2 D5:2 E5:2 F#5:4 G5:2 F#5:2 E5:2 D5:2 E5:2 C#5:2 D5:4 A4:2 D5:2 F#5:2 A5:2 G5:2 F#5:2 E5:4 D5:2 C#5:2 D5:2 E5:2 F#5:4 D5:4' },
        { inst: 'whistle', vol: 0.085, seq: 'F#4:8 A4:8 B4:8 A4:8 A4:8 F#4:8 E4:8 F#4:8' },
        { inst: 'bass', vol: 0.16, seq: 'D2:4 A2:4 D2:4 A2:4 G2:4 D3:4 G2:4 B2:4 D2:4 A2:4 D2:4 A2:4 A2:4 E3:4 A2:4 A2:4' },
        dEx ],
        B: [
        { inst: 'pulse', vol: 0.13, seq: 'B5:2 A5:2 G5:2 F#5:2 G5:2 A5:2 B5:4 A5:2 G5:2 F#5:2 E5:2 F#5:2 G5:2 A5:4 D6:2 C#6:2 B5:2 A5:2 B5:2 A5:2 G5:4 F#5:2 G5:2 A5:2 F#5:2 D5:2 E5:2 D5:4' },
        { inst: 'whistle', vol: 0.085, seq: 'B4:8 D5:8 A4:8 C#5:8 D5:8 B4:8 A4:8 F#4:8' },
        { inst: 'bass', vol: 0.16, seq: 'G2:4 D3:4 G2:4 B2:4 A2:4 E3:4 A2:4 C#3:4 D2:4 A2:4 D2:4 F#2:4 G2:4 A2:4 D2:4 D2:4' },
        dEx ] },
      { A: [
        { inst: 'thin', vol: 0.13, seq: 'D6:1 E6:1 F#6:1 D6:1 A5:1 D6:1 F#6:1 A6:1 G6:2 F#6:2 E6:2 D6:2 B5:1 C#6:1 D6:1 B5:1 G5:1 B5:1 D6:1 G6:1 A6:2 F#6:2 D6:2 A5:2 A5:1 D6:1 F#6:1 A6:1 G6:1 F#6:1 E6:1 D6:1 E6:2 F#6:2 G6:2 A6:2 F#6:1 E6:1 D6:1 C#6:1 D6:1 E6:1 F#6:1 G6:1 A6:4 D6:4' },
        { inst: 'square', vol: 0.085, seq: 'F#4:4 A4:4 D5:4 A4:4 B4:4 D5:4 G4:4 B4:4 F#4:4 A4:4 D5:4 A4:4 E4:4 G4:4 A4:4 A4:4' },
        { inst: 'bass', vol: 0.17, seq: 'D2:2 D2:2 A2:2 D2:2 D2:2 D2:2 A2:2 D2:2 G2:2 G2:2 D3:2 G2:2 G2:2 B2:2 D3:2 B2:2 D2:2 D2:2 A2:2 D2:2 D2:2 D2:2 A2:2 D2:2 A2:2 A2:2 E3:2 A2:2 A2:2 E3:2 A2:2 A2:2' },
        dBa ],
        B: [
        { inst: 'thin', vol: 0.13, seq: 'B5:2 D6:2 G6:2 D6:2 B5:2 D6:2 A6:2 G6:2 A6:2 G6:2 F#6:2 E6:2 F#6:2 G6:2 A6:2 B6:2 D7:2 B6:2 A6:2 G6:2 A6:2 G6:2 F#6:2 D6:2 A5:2 D6:2 F#6:2 A6:2 F#6:2 D6:2 A5:2 D6:2' },
        { inst: 'square', vol: 0.085, seq: 'G4:4 B4:4 D5:4 B4:4 A4:4 C#5:4 E5:4 C#5:4 G4:4 B4:4 D5:4 A4:4 A4:4 D5:4 F#4:4 D5:4' },
        { inst: 'bass', vol: 0.17, seq: 'G2:2 G2:2 D3:2 G2:2 A2:2 A2:2 E3:2 A2:2 D2:2 D2:2 A2:2 D2:2 G2:2 A2:2 D2:2 D2:2 G2:2 G2:2 D3:2 G2:2 A2:2 A2:2 E3:2 A2:2 D2:2 D2:2 A2:2 D2:2 G2:2 A2:2 D2:2 D2:2' },
        dBa ] },
      form),
    V(112,
      { A: [
        { inst: 'pulse', vol: 0.13, seq: 'A4:2 A4:2 A4:2 D5:2 F#5:2 F#5:2 F#5:2 A5:2 G5:2 F#5:2 E5:2 D5:2 E5:2 F#5:2 G5:4 F#5:2 E5:2 D5:2 E5:2 F#5:2 G5:2 A5:4 D5:2 E5:2 F#5:2 D5:2 A4:2 A4:2 D5:4' },
        { inst: 'whistle', vol: 0.085, seq: 'F#4:8 A4:8 G4:8 B4:8 A4:8 D5:8 F#4:8 A4:8' },
        { inst: 'bass', vol: 0.16, seq: 'D2:4 A2:4 D2:4 A2:4 G2:4 D3:4 G2:4 B2:4 D2:4 A2:4 D2:4 F#2:4 D2:4 A2:4 D2:4 D2:4' },
        dEx ],
        B: [
        { inst: 'pulse', vol: 0.13, seq: 'D6:2 C#6:2 B5:2 A5:2 G5:2 F#5:2 E5:4 F#5:2 G5:2 A5:2 B5:2 A5:2 G5:2 F#5:4 E5:2 F#5:2 G5:2 A5:2 B5:2 C#6:2 D6:4 A5:2 B5:2 G5:2 F#5:2 E5:2 D5:2 D5:4' },
        { inst: 'whistle', vol: 0.085, seq: 'A4:8 D5:8 B4:8 D5:8 A4:8 C#5:8 D5:8 A4:8' },
        { inst: 'bass', vol: 0.16, seq: 'D2:4 A2:4 G2:4 D3:4 A2:4 E3:4 D2:4 A2:4 G2:4 D3:4 A2:4 C#3:4 D2:4 A2:4 D2:4 D2:4' },
        dEx ] },
      { A: [
        { inst: 'thin', vol: 0.13, seq: 'A5:2 D6:2 F#6:2 D6:2 A5:2 D6:2 F#6:2 A6:2 G6:2 F#6:2 E6:2 D6:2 B5:2 D6:2 G6:2 B6:2 A6:2 G6:2 F#6:2 E6:2 D6:2 E6:2 F#6:2 A6:2 D6:2 F#6:2 A6:2 F#6:2 D6:2 A5:2 D6:2 D6:2' },
        { inst: 'square', vol: 0.085, seq: 'D5:4 F#5:4 A4:4 D5:4 G4:4 B4:4 D5:4 G4:4 D5:4 F#5:4 A4:4 D5:4 D5:4 A4:4 F#4:4 D5:4' },
        { inst: 'bass', vol: 0.17, seq: 'D2:2 D2:2 A2:2 A2:2 D2:2 D2:2 A2:2 A2:2 G2:2 G2:2 D3:2 D3:2 G2:2 G2:2 B2:2 B2:2 D2:2 D2:2 A2:2 A2:2 D2:2 D2:2 F#2:2 F#2:2 D2:2 D2:2 A2:2 A2:2 D2:2 D2:2 D2:2 D2:2' },
        dBa ],
        B: [
        { inst: 'thin', vol: 0.13, seq: 'D6:2 A5:2 D6:2 F#6:2 A6:2 F#6:2 D6:2 A5:2 G6:2 F#6:2 E6:2 D6:2 E6:2 F#6:2 G6:2 A6:2 B6:2 A6:2 G6:2 F#6:2 E6:2 D6:2 C#6:2 D6:2 A5:2 D6:2 G6:2 F#6:2 E6:2 D6:2 D6:2 A5:2' },
        { inst: 'square', vol: 0.085, seq: 'D5:4 F#4:4 G4:4 D5:4 A4:4 E5:4 D5:4 A4:4 G4:4 D5:4 A4:4 C#5:4 D5:4 A4:4 D5:4 D5:4' },
        { inst: 'bass', vol: 0.17, seq: 'D2:2 D2:2 A2:2 D2:2 G2:2 G2:2 D3:2 G2:2 A2:2 A2:2 E3:2 A2:2 D2:2 D2:2 A2:2 D2:2 G2:2 G2:2 D3:2 G2:2 A2:2 A2:2 C#3:2 A2:2 D2:2 D2:2 A2:2 D2:2 D2:2 D2:2 A2:2 D2:2' },
        dBa ] },
      form),
    V(116,
      { A: [
        { inst: 'pulse', vol: 0.13, seq: 'D5:2 E5:2 F#5:4 A5:2 G5:2 F#5:4 E5:2 F#5:2 G5:4 B5:2 A5:2 G5:4 F#5:2 G5:2 A5:4 D6:2 C#6:2 B5:4 A5:2 G5:2 F#5:2 E5:2 D5:4 F#5:4' },
        { inst: 'whistle', vol: 0.085, seq: 'A4:8 D5:8 G4:8 B4:8 A4:8 D5:8 D4:8 F#4:8' },
        { inst: 'bass', vol: 0.16, seq: 'D2:4 A2:4 D2:4 A2:4 G2:4 D3:4 A2:4 E3:4 D2:4 A2:4 G2:4 A2:4 D2:4 A2:4 D2:4 D2:4' },
        dEx ],
        B: [
        { inst: 'pulse', vol: 0.13, seq: 'A5:2 B5:2 D6:4 C#6:2 B5:2 A5:4 G5:2 A5:2 B5:4 D6:2 C#6:2 B5:4 A5:2 G5:2 F#5:4 E5:2 F#5:2 G5:4 F#5:2 E5:2 D5:2 C#5:2 B4:2 A4:2 D5:4' },
        { inst: 'whistle', vol: 0.085, seq: 'C#5:8 E5:8 D5:8 B4:8 A4:8 D5:8 F#4:8 A4:8' },
        { inst: 'bass', vol: 0.16, seq: 'D2:4 A2:4 G2:4 A2:4 G2:4 D3:4 A2:4 E3:4 D2:4 A2:4 D2:4 A2:4 D2:4 A2:4 D2:4 D2:4' },
        dEx ] },
      { A: [
        { inst: 'thin', vol: 0.13, seq: 'D6:2 F#6:2 A6:2 F#6:2 A6:2 G6:2 F#6:2 E6:2 E6:2 G6:2 B6:2 G6:2 B6:2 A6:2 G6:2 F#6:2 F#6:2 A6:2 D7:2 A6:2 D7:2 C#7:2 B6:2 A6:2 A6:2 G6:2 F#6:2 E6:2 D6:2 F#6:2 A6:2 F#6:2' },
        { inst: 'square', vol: 0.085, seq: 'D5:4 A4:4 D5:4 A4:4 G4:4 D5:4 A4:4 E5:4 D5:4 A4:4 G4:4 A4:4 D5:4 A4:4 D5:4 D5:4' },
        { inst: 'bass', vol: 0.17, seq: 'D2:2 D2:2 A2:2 A2:2 D2:2 D2:2 A2:2 A2:2 G2:2 G2:2 D3:2 D3:2 A2:2 A2:2 E3:2 E3:2 D2:2 D2:2 A2:2 A2:2 G2:2 G2:2 A2:2 A2:2 D2:2 D2:2 A2:2 A2:2 D2:2 D2:2 D2:2 D2:2' },
        dBa ],
        B: [
        { inst: 'thin', vol: 0.13, seq: 'A6:2 G6:2 F#6:2 E6:2 D6:2 E6:2 F#6:2 A6:2 G6:2 F#6:2 E6:2 D6:2 C#6:2 D6:2 E6:2 G6:2 A6:2 B6:2 A6:2 G6:2 F#6:2 E6:2 D6:2 C#6:2 B5:2 A5:2 D6:2 F#6:2 E6:2 D6:2 A5:2 D6:2' },
        { inst: 'square', vol: 0.085, seq: 'D5:4 A4:4 G4:4 A4:4 G4:4 D5:4 A4:4 E5:4 D5:4 A4:4 D5:4 A4:4 D5:4 A4:4 D5:4 D5:4' },
        { inst: 'bass', vol: 0.17, seq: 'D2:2 D2:2 A2:2 D2:2 G2:2 G2:2 A2:2 G2:2 G2:2 G2:2 D3:2 G2:2 A2:2 A2:2 E3:2 A2:2 D2:2 D2:2 A2:2 D2:2 D2:2 D2:2 A2:2 D2:2 D2:2 D2:2 A2:2 D2:2 D2:2 D2:2 A2:2 D2:2' },
        dBa ] },
      form),
  ] };
})();

// ---------------------------------------------------------------------------
// r2  SAPPHIRE SHALLOWS (merfolk): aquatic gamelan / music-box, D major pentatonic
// ---------------------------------------------------------------------------
THEMES.r2 = { variants: [
  { bpm: 84,
    explore: [
      { inst: 'bell', vol: 0.12, seq: 'D5:4 F#5:4 A5:4 F#5:4 E5:4 A5:4 B5:4 A5:4 F#5:4 A5:4 D6:4 A5:4 E5:4 D5:4 B4:4 A4:4' },
      { inst: 'glass', vol: 0.075, seq: 'R:2 A4:2 R:2 D5:2 R:2 F#5:2 R:2 D5:2 R:2 B4:2 R:2 E5:2 R:2 A5:2 R:2 E5:2 R:2 A4:2 R:2 F#5:2 R:2 A5:2 R:2 F#5:2 R:2 A4:2 R:2 B4:2 R:2 E5:2 R:2 A4:2' },
      { inst: 'pad', vol: 0.075, seq: 'D3:16 A2:16 B2:16 A2:16' },
      { inst: 'subbass', vol: 0.15, seq: 'D2:8 D2:8 A1:8 A1:8 B1:8 B1:8 A1:8 E2:8' },
    ],
    battle: [
      { inst: 'bell', vol: 0.115, seq: 'D5:2 F#5:2 A5:2 D6:2 A5:2 F#5:2 E5:2 D5:2 E5:2 A5:2 B5:2 E6:2 B5:2 A5:2 F#5:2 E5:2 F#5:2 A5:2 D6:2 F#6:2 D6:2 A5:2 F#5:2 E5:2 E5:2 D5:2 B4:2 A4:2 B4:2 D5:2 E5:2 F#5:2' },
      { inst: 'glass', vol: 0.08, seq: 'A4:2 D5:2 A4:2 D5:2 F#5:2 D5:2 A4:2 D5:2 B4:2 E5:2 B4:2 E5:2 A5:2 E5:2 B4:2 E5:2 A4:2 F#5:2 A4:2 F#5:2 D6:2 A5:2 F#5:2 A5:2 A4:2 E5:2 A4:2 E5:2 B4:2 E5:2 A4:2 E5:2' },
      { inst: 'subbass', vol: 0.16, seq: 'D2:4 D2:4 A1:4 D2:4 A1:4 A1:4 E2:4 A1:4 B1:4 B1:4 F#2:4 B1:4 A1:4 E2:4 A1:4 A1:4' },
      { inst: 'drum', vol: 0.10, seq: rep(D.aqua, 3) + ' ' + D.aquaF },
    ],
  },
  (function () { const ex = [ // Song 2 - aquatic gamelan, precise, coral tide cycles (A maj pentatonic)
      { inst: 'bell', vol: 0.12, seq: 'A5:2 C#6:2 E6:2 C#6:2 B5:2 A5:2 F#5:2 A5:2 E5:2 A5:2 C#6:2 A5:2 B5:2 C#6:2 E6:2 B5:2 A5:2 B5:2 C#6:2 B5:2 A5:2 F#5:2 E5:2 F#5:2 A5:2 C#6:2 E6:2 F#6:2 E6:2 C#6:2 A5:2 B5:2' },
      { inst: 'glass', vol: 0.075, seq: 'R:2 E5:2 R:2 A5:2 R:2 C#6:2 R:2 A5:2 R:2 B5:2 R:2 E6:2 R:2 C#6:2 R:2 A5:2 R:2 E5:2 R:2 F#5:2 R:2 A5:2 R:2 C#6:2 R:2 A5:2 R:2 E5:2 R:2 A5:2 R:2 E5:2' },
      { inst: 'pad', vol: 0.075, seq: 'A2:16 F#2:16 E2:16 A2:16' },
      { inst: 'subbass', vol: 0.15, seq: 'A1:8 A1:8 F#1:8 F#1:8 E1:8 E1:8 A1:8 A1:8' },
    ]; return { bpm: 96, explore: ex, battle: toBattle(ex, 'bell', 0.115, 'glass', 0.08, rep(D.aqua, 4), 0.10, 0) }; })(),
  (function () { const ex = [ // Song 3 - solemn underwater court, slow ritual, debts at slack water (E minor)
      { inst: 'bell', vol: 0.12, seq: 'E5:8 B5:8 A5:8 G5:8 D5:8 E5:8 G5:8 E5:8' },
      { inst: 'glass', vol: 0.07, seq: 'R:8 E6:8 R:8 D6:8 R:8 B5:8 R:8 E5:8' },
      { inst: 'pad', vol: 0.08, seq: 'E3:16 C3:16 G3:16 B2:16' },
      { inst: 'subbass', vol: 0.15, seq: 'E1:16 C1:16 G1:16 B1:16' },
    ]; return { bpm: 64, explore: ex, battle: toBattle(ex, 'bell', 0.11, 'glass', 0.07, rep('K:8 R:4 B:2 W:2', 4), 0.07, 0) }; })(),
] };

// ---------------------------------------------------------------------------
// r3  THE SERPENT CAYS (lizardfolk): tribal drum-war, E minor pentatonic (REDONE)
// ---------------------------------------------------------------------------
THEMES.r3 = { variants: [
  { bpm: 110,
    explore: [
      { inst: 'pulse', vol: 0.12, seq: 'E5:4 G5:2 E5:2 B4:4 D5:2 E5:2 G5:4 A5:2 G5:2 E5:4 D5:2 E5:2 E5:4 G5:2 A5:2 B5:4 A5:2 G5:2 A5:2 G5:2 E5:2 D5:2 E5:2 D5:2 E5:4' },
      { inst: 'nylon', vol: 0.085, seq: 'E4:8 B4:8 G4:8 D5:8 E4:8 B4:8 A4:8 E4:8' },
      { inst: 'sawbass', vol: 0.15, seq: 'E2:4 E2:2 B1:2 E2:4 G2:4 D2:4 D2:2 A1:2 E2:4 E2:4 E2:4 B1:2 E2:2 G2:4 A1:4 E2:4 B1:2 E2:2 E2:4 E2:4' },
      { inst: 'drum', vol: 0.14, seq: rep(D.war, 3) + ' ' + D.warB },
    ],
    battle: [
      { inst: 'thin', vol: 0.12, seq: 'E5:2 G5:2 A5:2 B5:2 D6:2 B5:2 A5:2 G5:2 E5:2 G5:2 B5:2 E6:2 D6:2 B5:2 A5:2 G5:2 B5:2 D6:2 E6:2 G6:2 E6:2 D6:2 B5:2 A5:2 G5:2 A5:2 B5:2 G5:2 E5:2 D5:2 E5:2 B4:2' },
      { inst: 'nylon', vol: 0.085, seq: 'E4:8 B4:8 G4:8 D5:8 E4:8 B4:8 A4:8 E4:8' },
      { inst: 'sawbass', vol: 0.16, seq: 'E2:2 E2:2 E2:2 E2:2 B1:2 B1:2 E2:2 E2:2 G2:2 G2:2 D2:2 D2:2 A1:2 A1:2 E2:2 E2:2 E2:2 E2:2 E2:2 E2:2 G2:2 G2:2 A1:2 A1:2 G2:2 G2:2 E2:2 D2:2 E2:2 E2:2 B1:2 E2:2' },
      { inst: 'drum', vol: 0.17, seq: rep(D.warB, 4) },
    ],
  },
  (function () { const ex = [ // Song 2 - drum-war, cross-rhythm, chant stabs, raiders boarding (E minor pent)
      { inst: 'pulse', vol: 0.12, seq: 'E5:2 R:2 G5:2 E5:2 R:2 D5:2 E5:4 B4:2 R:2 D5:2 E5:2 R:2 G5:2 E5:4 A5:2 R:2 G5:2 E5:2 R:2 D5:2 E5:4 E5:2 G5:2 A5:2 G5:2 E5:2 D5:2 B4:4' },
      { inst: 'square', vol: 0.07, seq: 'E4:4 R:4 G4:4 R:4 E4:4 R:4 D4:4 R:4 E4:4 R:4 G4:4 R:4 A4:4 R:4 E4:4 R:4' },
      { inst: 'sawbass', vol: 0.15, seq: 'E2:4 E2:2 E2:2 G2:4 E2:4 D2:4 E2:2 E2:2 E2:4 E2:4 G2:4 E2:2 E2:2 A1:4 E2:4 E2:4 E2:2 G2:2 E2:4 E2:4' },
      { inst: 'drum', vol: 0.16, seq: rep('K:2 T:2 C:2 K:2 K:2 T:2 C:2 C:2', 4) },
    ]; return { bpm: 116, explore: ex, battle: toBattle(ex, 'thin', 0.12, 'square', 0.075, rep('K:2 K:2 T:2 C:2 K:2 T:2 C:2 C:2', 4), 0.17, 12) }; })(),
  (function () { const ex = [ // Song 3 - jungle drum-talk, stalking, interlocking, parley under threat (E minor)
      { inst: 'pulse', vol: 0.115, seq: 'E5:4 R:4 G5:2 E5:2 R:4 R:4 B4:2 D5:2 E5:4 R:4 G5:4 R:4 E5:2 D5:2 R:4 E5:2 G5:2 E5:2 D5:2 B4:4 R:4' },
      { inst: 'nylon', vol: 0.085, seq: 'R:4 E3:4 R:4 G3:4 R:4 A3:4 R:4 E3:4 R:4 D3:4 R:4 E3:4 R:4 G3:4 R:4 E3:4' },
      { inst: 'sawbass', vol: 0.15, seq: 'E2:4 E2:4 R:4 E2:4 G2:4 G2:4 R:4 E2:4 D2:4 D2:4 R:4 A1:4 E2:4 R:4 E2:4 E2:4' },
      { inst: 'drum', vol: 0.13, seq: rep('K:4 R:2 T:2 R:2 C:2 R:2 T:2', 4) },
    ]; return { bpm: 92, explore: ex, battle: toBattle(ex, 'thin', 0.12, 'nylon', 0.085, rep('K:2 T:2 C:2 K:2 T:2 C:2 K:2 C:2', 4), 0.15, 12) }; })(),
] };

// ---------------------------------------------------------------------------
// r4  THE CINDER ISLES (djinn): flamenco fire, E phrygian-dominant (Andalusian)
// ---------------------------------------------------------------------------
THEMES.r4 = { variants: [
  (function () { const ex = [ // Song 1 - upbeat Spanish-guitar flamenco, Andalusian cadence Am-F-G-E, driving claps (Gerudo-style)
      { inst: 'nylon', vol: 0.12, seq: 'A5:1 B5:1 C6:1 D6:1 E6:1 D6:1 C6:1 B5:1 A5:2 C6:2 E6:2 A5:2 C6:1 D6:1 E6:1 F6:1 E6:1 D6:1 C6:1 A5:1 F5:2 A5:2 C6:2 F5:2 D6:1 E6:1 F#6:1 G6:1 F#6:1 E6:1 D6:1 B5:1 G5:2 B5:2 D6:2 G5:2 G#5:1 A5:1 B5:1 C6:1 B5:1 A5:1 G#5:1 F#5:1 E5:2 G#5:2 B5:2 E6:2' },
      { inst: 'pulse', vol: 0.08, seq: 'R:2 A4:2 R:2 E5:2 A4:2 R:2 E5:2 R:2 R:2 F4:2 R:2 C5:2 F4:2 R:2 C5:2 R:2 R:2 G4:2 R:2 D5:2 G4:2 R:2 D5:2 R:2 R:2 E4:2 R:2 B4:2 E4:2 R:2 B4:2 R:2' },
      { inst: 'sawbass', vol: 0.15, seq: 'A1:2 A1:2 A2:2 A1:2 A1:2 E2:2 A1:2 A1:2 F1:2 F1:2 F2:2 F1:2 F1:2 C2:2 F1:2 F1:2 G1:2 G1:2 G2:2 G1:2 G1:2 D2:2 G1:2 G1:2 E1:2 E1:2 E2:2 E1:2 E1:2 B1:2 E1:2 E1:2' },
      { inst: 'drum', vol: 0.15, seq: rep('K:2 C:2 K:2 C:2 C:2 W:2 K:2 C:2', 4) },
    ]; return { bpm: 130, explore: ex, battle: toBattle(ex, 'thin', 0.12, 'pulse', 0.085, rep('K:2 C:2 K:2 C:2 W:2 C:2 K:2 C:2', 4), 0.16, 0) }; })(),
  (function () { const ex = [ // Song 2 - fast flamenco fire, guitar arpeggios, brass hits, forge crackle (E phryg-dom)
      { inst: 'nylon', vol: 0.115, seq: 'E5:2 G#5:2 B5:2 E6:2 B5:2 G#5:2 F5:2 E5:2 A5:2 G#5:2 F5:2 E5:2 D5:2 C5:2 B4:2 C5:2 D5:2 F5:2 A5:2 D6:2 C6:2 A5:2 F5:2 D5:2 E5:2 F5:2 G#5:2 A5:2 G#5:2 F5:2 E5:2 E5:2' },
      { inst: 'brass', vol: 0.08, seq: 'E4:4 R:4 A4:4 R:4 D4:4 R:4 E4:4 R:4 E4:4 R:4 A4:4 R:4 F4:4 R:4 E4:4 R:4' },
      { inst: 'sawbass', vol: 0.15, seq: 'A1:4 A1:4 G1:4 G1:4 F1:4 F1:4 E1:4 E1:4 A1:4 A1:4 G1:4 G1:4 F1:4 F1:4 E1:4 E1:4' },
      { inst: 'drum', vol: 0.14, seq: rep('K:2 C:2 K:2 C:2 C:2 C:2 K:2 C:2', 4) },
    ]; return { bpm: 132, explore: ex, battle: toBattle(ex, 'thin', 0.12, 'brass', 0.085, rep('K:2 C:2 K:2 C:2 W:2 C:2 K:2 C:2', 4), 0.16, 12) }; })(),
  { bpm: 120, // Song 3 - flamenco fire, E phrygian-dominant (the former Song 1)
    explore: [
      { inst: 'nylon', vol: 0.115, seq: 'E5:2 F5:2 G#5:2 F5:2 E5:2 D5:2 C5:2 B4:2 A4:2 B4:2 C5:2 D5:2 E5:4 R:2 E5:2 F5:2 E5:2 D5:2 C5:2 B4:2 C5:2 D5:2 B4:2 A4:4 G#4:2 A4:2 B4:2 A4:2 E4:2 E4:2' },
      { inst: 'pulse', vol: 0.075, seq: 'E4:4 R:4 E4:2 F4:2 E4:4 A4:4 R:4 G#4:2 A4:2 B4:4 C5:4 R:4 B4:2 C5:2 A4:4 E4:4 R:4 F4:2 E4:2 E4:4' },
      { inst: 'sawbass', vol: 0.15, seq: 'A1:4 A1:4 A2:4 A1:4 G1:4 G1:4 G2:4 G1:4 F1:4 F1:4 F2:4 F1:4 E1:4 E1:4 E2:4 E1:4' },
      { inst: 'drum', vol: 0.12, seq: rep(D.flam, 4) },
    ],
    battle: [
      { inst: 'thin', vol: 0.12, seq: 'E6:2 D6:2 C6:2 B5:2 A5:2 G#5:2 A5:2 B5:2 C6:2 B5:2 A5:2 G#5:2 A5:2 B5:2 C6:2 D6:2 E6:2 F6:2 E6:2 D6:2 C6:2 B5:2 A5:2 G#5:2 A5:2 B5:2 C6:2 A5:2 G#5:2 A5:2 E5:2 E5:2' },
      { inst: 'nylon', vol: 0.10, seq: 'A4:2 A4:2 C5:2 E5:2 A4:2 A4:2 E5:2 C5:2 G4:2 G4:2 B4:2 D5:2 G4:2 G4:2 D5:2 B4:2 F4:2 F4:2 A4:2 C5:2 F4:2 F4:2 C5:2 A4:2 E4:2 E4:2 G#4:2 B4:2 E4:2 E4:2 B4:2 G#4:2' },
      { inst: 'sawbass', vol: 0.16, seq: 'A1:2 A1:2 A1:2 A1:2 A2:2 A2:2 A1:2 A1:2 G1:2 G1:2 G1:2 G1:2 G2:2 G2:2 G1:2 G1:2 F1:2 F1:2 F1:2 F1:2 F2:2 F2:2 F1:2 F1:2 E1:2 E1:2 E1:2 E1:2 E2:2 E2:2 E1:2 E1:2' },
      { inst: 'drum', vol: 0.15, seq: rep(D.flamB, 4) },
    ],
  },
] };

// ---------------------------------------------------------------------------
// r5  TEMPEST REACH (storm elves): Celtic reel storm, E dorian
// ---------------------------------------------------------------------------
THEMES.r5 = { variants: [
  { bpm: 132,
    explore: [
      { inst: 'whistle', vol: 0.115, seq: 'E5:2 G5:2 F#5:2 E5:2 B4:2 E5:2 G5:2 B5:2 A5:2 G5:2 F#5:2 E5:2 F#5:2 D5:2 B4:2 D5:2 E5:2 G5:2 F#5:2 G5:2 A5:2 B5:2 C#6:2 B5:2 A5:2 F#5:2 D5:2 F#5:2 E5:2 D5:2 B4:2 E5:2' },
      { inst: 'pluck', vol: 0.09, seq: 'E4:2 B4:2 E4:2 B4:2 E4:2 B4:2 G4:2 B4:2 D4:2 A4:2 D4:2 A4:2 D4:2 A4:2 F#4:2 A4:2 E4:2 B4:2 E4:2 B4:2 G4:2 B4:2 E5:2 B4:2 A3:2 E4:2 A3:2 E4:2 D4:2 A4:2 E4:2 E4:2' },
      { inst: 'bass', vol: 0.155, seq: 'E2:4 B2:4 E2:4 B2:4 D2:4 A2:4 D2:4 A2:4 E2:4 B2:4 G2:4 B2:4 A1:4 E2:4 D2:4 E2:4' },
      { inst: 'drum', vol: 0.11, seq: rep(D.reel, 3) + ' K:2 T:2 K:2 T:2 K:2 T:2 T:2 T:2' },
    ],
    battle: [
      { inst: 'thin', vol: 0.115, seq: 'E6:2 G6:2 F#6:2 E6:2 B5:2 E6:2 G6:2 B6:2 A6:2 G6:2 F#6:2 E6:2 F#6:2 D6:2 B5:2 D6:2 E6:2 G6:2 F#6:2 G6:2 A6:2 B6:2 C#7:2 B6:2 A6:2 F#6:2 D6:2 F#6:2 E6:2 D6:2 B5:2 E6:2' },
      { inst: 'pluck', vol: 0.09, seq: 'E4:2 B4:2 E4:2 B4:2 E4:2 B4:2 G4:2 B4:2 D4:2 A4:2 D4:2 A4:2 D4:2 A4:2 F#4:2 A4:2 E4:2 B4:2 E4:2 B4:2 G4:2 B4:2 E5:2 B4:2 A3:2 E4:2 A3:2 E4:2 D4:2 A4:2 E4:2 E4:2' },
      { inst: 'bass', vol: 0.16, seq: 'E2:2 E2:2 B2:2 E2:2 E2:2 B2:2 E2:2 E2:2 D2:2 D2:2 A2:2 D2:2 D2:2 A2:2 D2:2 D2:2 E2:2 E2:2 B2:2 E2:2 G2:2 G2:2 B2:2 G2:2 A1:2 A1:2 E2:2 A1:2 D2:2 D2:2 E2:2 E2:2' },
      { inst: 'drum', vol: 0.15, seq: rep(D.reelB, 4) },
    ],
  },
  (function () { const ex = [ // Song 2 - fast lightning reel, high fiddle, rapid arpeggios, gusty (E dorian)
      { inst: 'thin', vol: 0.11, seq: 'E5:2 B5:2 E6:2 B5:2 G5:2 B5:2 E6:2 G6:2 F#6:2 E6:2 D6:2 B5:2 A5:2 B5:2 D6:2 F#6:2 E6:2 G6:2 B6:2 G6:2 E6:2 D6:2 B5:2 A5:2 B5:2 A5:2 G5:2 F#5:2 E5:2 F#5:2 G5:2 B5:2' },
      { inst: 'pluck', vol: 0.09, seq: 'E4:2 B4:2 E5:2 B4:2 D4:2 A4:2 D5:2 A4:2 A3:2 E4:2 A4:2 E4:2 B3:2 F#4:2 B4:2 F#4:2 E4:2 B4:2 E5:2 B4:2 G4:2 D5:2 G4:2 D5:2 A3:2 E4:2 A4:2 E4:2 E4:2 B4:2 E5:2 B4:2' },
      { inst: 'bass', vol: 0.155, seq: 'E2:4 E2:4 D2:4 D2:4 A1:4 A1:4 B1:4 B1:4 E2:4 E2:4 G2:4 G2:4 A1:4 B1:4 E2:4 E2:4' },
      { inst: 'drum', vol: 0.13, seq: rep('K:2 O:2 S:2 O:2 K:2 O:2 S:2 O:2', 4) },
    ]; return { bpm: 142, explore: ex, battle: toBattle(ex, 'thin', 0.115, 'pluck', 0.09, rep(D.reelB, 4), 0.15, 0) }; })(),
  (function () { const ex = [ // Song 3 - trickster storm, odd-meter accents, pitch bends, wind bargain (E dorian)
      { inst: 'siren', vol: 0.115, seq: 'E5:3 G5:1 B5:2 R:2 A5:2 G5:2 E5:4 D5:3 E5:1 G5:2 R:2 F#5:2 E5:2 D5:4 B4:3 D5:1 E5:2 G5:2 R:2 A5:2 B5:4 A5:3 G5:1 E5:2 D5:2 E5:2 R:2 E5:4' },
      { inst: 'pluck', vol: 0.09, seq: 'E4:2 R:2 B4:2 E4:2 R:2 G4:2 E4:4 D4:2 R:2 A4:2 D4:2 R:2 F#4:2 D4:4 B3:2 R:2 E4:2 B3:2 R:2 D4:2 B3:4 A3:2 R:2 E4:2 A3:2 R:2 E4:2 E4:4' },
      { inst: 'bass', vol: 0.155, seq: 'E2:4 R:4 E2:4 E2:4 D2:4 R:4 D2:4 A1:4 B1:4 R:4 B1:4 D2:4 A1:4 E2:4 R:4 E2:4' },
      { inst: 'drum', vol: 0.12, seq: rep('K:4 R:2 S:2 K:2 R:2 S:4', 4) },
    ]; return { bpm: 130, explore: ex, battle: toBattle(ex, 'thin', 0.115, 'pluck', 0.09, rep('K:2 T:2 R:2 S:2 K:2 R:2 S:2 O:2', 4), 0.14, 12) }; })(),
] };

// ---------------------------------------------------------------------------
// r6  THE IRON DEEPS (deep dwarves): industrial forge work-song, C minor
// ---------------------------------------------------------------------------
THEMES.r6 = { variants: [
  { bpm: 96,
    explore: [
      { inst: 'brass', vol: 0.11, seq: 'C4:4 EB4:2 F4:2 G4:4 F4:2 EB4:2 C4:4 G4:2 F4:2 EB4:4 C4:4 G4:4 BB4:2 C5:2 EB5:4 C5:2 BB4:2 G4:4 F4:2 EB4:2 D4:4 G3:4' },
      { inst: 'organ', vol: 0.08, seq: 'C3:8 EB3:8 C3:8 G2:8 EB3:8 G3:8 D3:8 G2:8' },
      { inst: 'sawbass', vol: 0.16, seq: 'C2:4 C2:4 G1:4 C2:4 C2:4 C2:4 G1:4 C2:4 EB2:4 EB2:4 BB1:4 EB2:4 G1:4 G1:4 D2:4 G1:4' },
      { inst: 'drum', vol: 0.13, seq: rep(D.forge, 3) + ' K:4 A:2 A:2 K:2 A:2 A:4' },
    ],
    battle: [
      { inst: 'brass', vol: 0.115, seq: 'C5:2 EB5:2 G5:2 EB5:2 F5:2 EB5:2 C5:2 G4:2 C5:2 G4:2 C5:2 EB5:2 D5:2 C5:2 G4:2 G4:2 G5:2 BB5:2 C6:2 BB5:2 EB6:2 C6:2 BB5:2 G5:2 G5:2 F5:2 EB5:2 D5:2 C5:2 EB5:2 D5:2 C5:2' },
      { inst: 'organ', vol: 0.08, seq: 'C3:8 EB3:8 C3:8 G2:8 EB3:8 G3:8 D3:8 G2:8' },
      { inst: 'sawbass', vol: 0.17, seq: 'C2:2 C2:2 C2:2 C2:2 G1:2 G1:2 C2:2 C2:2 C2:2 C2:2 C2:2 C2:2 G1:2 G1:2 C2:2 C2:2 EB2:2 EB2:2 EB2:2 EB2:2 BB1:2 BB1:2 EB2:2 EB2:2 G1:2 G1:2 G1:2 G1:2 D2:2 D2:2 G1:2 G1:2' },
      { inst: 'drum', vol: 0.16, seq: rep(D.forgeB, 4) },
    ],
  },
  (function () { const ex = [ // Song 2 - forge work-song, hammer-and-anvil, low drone, iron toll-fortress (C minor)
      { inst: 'brass', vol: 0.11, seq: 'C4:4 G3:4 C4:4 EB4:4 F4:4 EB4:2 D4:2 C4:4 G3:4 C4:4 EB4:4 G4:4 EB4:4 F4:4 EB4:2 D4:2 C4:8' },
      { inst: 'organ', vol: 0.08, seq: 'C3:16 C3:16 F2:16 G2:16' },
      { inst: 'sawbass', vol: 0.16, seq: 'C2:8 C2:8 F1:8 F1:8 G1:8 G1:8 C2:8 C2:8' },
      { inst: 'drum', vol: 0.15, seq: rep('K:4 A:2 A:2 K:4 A:4', 4) },
    ]; return { bpm: 88, explore: ex, battle: toBattle(ex, 'brass', 0.115, 'organ', 0.08, rep(D.forgeB, 4), 0.16, 12) }; })(),
  (function () { const ex = [ // Song 3 - dark subterranean ledger, ticking percussion, distant hammers, debts (C minor)
      { inst: 'organ', vol: 0.11, seq: 'C4:4 EB4:4 G4:4 EB4:4 AB4:4 G4:4 F4:4 EB4:4 D4:4 EB4:4 F4:4 G4:4 C4:8 BB3:4 C4:4' },
      { inst: 'pluck', vol: 0.08, seq: 'C5:2 R:6 EB5:2 R:6 G4:2 R:6 C5:2 R:6 EB5:2 R:6 G5:2 R:6 C5:2 R:6 G4:2 R:6' },
      { inst: 'subbass', vol: 0.15, seq: 'C1:16 C1:16 AB1:16 G1:16' },
      { inst: 'drum', vol: 0.09, seq: rep('R:4 W:2 R:2 A:4 W:2 R:2', 4) },
    ]; return { bpm: 80, explore: ex, battle: toBattle(ex, 'brass', 0.115, 'pluck', 0.08, rep('K:4 A:4 W:2 R:2 K:2 A:2', 4), 0.13, 12) }; })(),
] };

// ---------------------------------------------------------------------------
// r7  THE SIREN'S MAZE (sirens): enchanted lullaby music-box, A minor
// ---------------------------------------------------------------------------
THEMES.r7 = { variants: [
  { bpm: 92,
    explore: [
      { inst: 'glass', vol: 0.115, seq: 'A4:4 C5:4 E5:4 C5:4 D5:4 C5:4 B4:4 G#4:4 A4:4 E5:4 A5:4 E5:4 F5:4 E5:4 C5:4 A4:4' },
      { inst: 'bell', vol: 0.07, seq: 'R:4 E5:4 R:4 A5:4 R:4 B5:4 R:4 E5:4 R:4 C6:4 R:4 A5:4 R:4 A5:4 R:4 E5:4' },
      { inst: 'pad', vol: 0.08, seq: 'A3:16 E3:16 A3:16 F3:16' },
      { inst: 'subbass', vol: 0.15, seq: 'A1:8 A1:8 E1:8 E1:8 A1:8 A1:8 F1:8 E1:8' },
    ],
    battle: [
      { inst: 'siren', vol: 0.115, seq: 'A4:4 C5:4 E5:4 A5:4 G#5:4 E5:4 D5:4 B4:4 C5:4 E5:4 A5:4 C6:4 B5:4 A5:4 E5:4 A5:4' },
      { inst: 'glass', vol: 0.08, seq: 'E5:2 A5:2 C6:2 A5:2 E5:2 A5:2 C6:2 E5:2 B4:2 E5:2 G#5:2 E5:2 B4:2 E5:2 B5:2 E5:2 A4:2 C5:2 E5:2 A5:2 C6:2 A5:2 E5:2 C5:2 E5:2 A5:2 B5:2 A5:2 E5:2 B5:2 A5:2 E5:2' },
      { inst: 'subbass', vol: 0.155, seq: 'A1:4 A1:4 E2:4 A1:4 E1:4 E1:4 B1:4 E1:4 A1:4 A1:4 C2:4 A1:4 F1:4 F1:4 E2:4 E1:4' },
      { inst: 'drum', vol: 0.085, seq: rep(D.lull, 3) + ' ' + D.lullF },
    ],
  },
  (function () { const ex = [ // Song 2 - enchanted music-box healing lullaby, golden fae, soft arpeggios (A major)
      { inst: 'bell', vol: 0.115, seq: 'A5:4 C#6:4 E6:4 C#6:4 D6:4 C#6:4 B5:4 A5:4 E6:4 D6:4 C#6:4 B5:4 A5:4 E6:4 A6:4 E6:4' },
      { inst: 'glass', vol: 0.075, seq: 'A4:2 C#5:2 E5:2 A5:2 C#5:2 E5:2 A5:2 C#6:2 D5:2 F#5:2 A5:2 D6:2 A5:2 F#5:2 D5:2 A4:2 E5:2 G#5:2 B5:2 E6:2 B5:2 G#5:2 E5:2 B4:2 A4:2 C#5:2 E5:2 A5:2 E5:2 C#5:2 A4:2 E5:2' },
      { inst: 'pad', vol: 0.08, seq: 'A3:16 D3:16 E3:16 A3:16' },
      { inst: 'subbass', vol: 0.15, seq: 'A1:8 A1:8 D1:8 D1:8 E1:8 E1:8 A1:8 A1:8' },
    ]; return { bpm: 100, explore: ex, battle: toBattle(ex, 'siren', 0.115, 'glass', 0.08, rep(D.lull, 4), 0.085, 0) }; })(),
  (function () { const ex = [ // Song 3 - dark fae bargain lullaby, minor turn, dissonant counter, true-name in fog (A minor)
      { inst: 'bell', vol: 0.115, seq: 'A5:4 C6:4 E6:4 C6:4 B5:4 A5:4 G#5:4 F5:4 E5:4 G#5:4 B5:4 E6:4 D6:4 C6:4 B5:4 A5:4' },
      { inst: 'glass', vol: 0.07, seq: 'B4:4 F5:4 A4:4 D#5:4 G#4:4 D5:4 A4:4 D#5:4 B4:4 F5:4 E5:4 A#4:4 A4:4 D#5:4 E5:4 B4:4' },
      { inst: 'pad', vol: 0.08, seq: 'A3:16 F3:16 E3:16 A3:16' },
      { inst: 'subbass', vol: 0.15, seq: 'A1:16 F1:16 E1:16 A1:16' },
    ]; return { bpm: 84, explore: ex, battle: toBattle(ex, 'siren', 0.11, 'glass', 0.075, rep('K:4 B:2 W:2 R:4 B:2 W:2', 4), 0.07, 0) }; })(),
] };

// ---------------------------------------------------------------------------
// r8  THE LAST MERIDIAN (the Armada): cold imperial march at sea, D minor
// ---------------------------------------------------------------------------
THEMES.r8 = { variants: [
  { bpm: 100,
    explore: [
      { inst: 'brass', vol: 0.115, seq: 'D4:4 D4:2 D4:2 F4:4 E4:2 D4:2 A4:4 G4:2 F4:2 E4:4 D4:2 C#4:2 D4:4 F4:2 A4:2 BB4:4 A4:2 G4:2 F4:4 E4:2 D4:2 A3:4 D4:4' },
      { inst: 'organ', vol: 0.08, seq: 'D3:8 A3:8 A2:8 A3:8 D3:8 F3:8 A2:8 D3:8' },
      { inst: 'subbass', vol: 0.16, seq: 'D2:4 D2:4 A1:4 D2:4 A1:4 A1:4 E2:4 A1:4 D2:4 D2:4 F2:4 D2:4 A1:4 A1:4 D2:4 D2:4' },
      { inst: 'drum', vol: 0.12, seq: rep(D.march, 3) + ' K:4 R:2 S:2 K:2 K:2 S:4' },
    ],
    battle: [
      { inst: 'brass', vol: 0.12, seq: 'D5:2 A4:2 D5:2 F5:2 E5:2 D5:2 A4:2 D5:2 A5:2 G5:2 F5:2 E5:2 D5:2 C#5:2 D5:2 A4:2 D5:2 F5:2 A5:2 BB5:2 A5:2 G5:2 F5:2 E5:2 F5:2 E5:2 D5:2 C#5:2 D5:2 A4:2 D5:2 D5:2' },
      { inst: 'organ', vol: 0.085, seq: 'D4:4 D4:4 A3:4 D4:4 A3:4 A3:4 E4:4 A3:4 D4:4 F4:4 D4:4 F4:4 A3:4 A3:4 D4:4 D4:4' },
      { inst: 'subbass', vol: 0.17, seq: 'D2:2 D2:2 D2:2 D2:2 A1:2 A1:2 D2:2 D2:2 A1:2 A1:2 A1:2 A1:2 E2:2 E2:2 A1:2 A1:2 D2:2 D2:2 F2:2 F2:2 A1:2 A1:2 D2:2 D2:2 A1:2 A1:2 D2:2 D2:2 A1:2 A1:2 D2:2 D2:2' },
      { inst: 'drum', vol: 0.15, seq: rep(D.marchB, 4) },
    ],
  },
  (function () { const ex = [ // Song 2 - fife-and-drum march, square fanfare, rigid snare, relentless pursuit (D minor)
      { inst: 'square', vol: 0.11, seq: 'D5:2 D5:2 A4:2 D5:2 F5:2 E5:2 D5:2 A4:2 D5:2 E5:2 F5:2 G5:2 A5:2 G5:2 F5:4 A5:2 A5:2 G5:2 F5:2 E5:2 D5:2 C#5:4 D5:2 F5:2 A5:2 D5:2 A4:2 D5:2 D5:4' },
      { inst: 'brass', vol: 0.085, seq: 'D4:4 R:4 A3:4 R:4 D4:4 R:4 A3:4 R:4 BB3:4 R:4 A3:4 R:4 D4:4 R:4 A3:4 R:4' },
      { inst: 'subbass', vol: 0.16, seq: 'D2:8 D2:8 A1:8 A1:8 BB1:8 BB1:8 A1:8 A1:8' },
      { inst: 'drum', vol: 0.14, seq: rep('K:4 R:2 S:2 K:4 S:4', 4) },
    ]; return { bpm: 114, explore: ex, battle: toBattle(ex, 'thin', 0.12, 'brass', 0.085, rep(D.marchB, 4), 0.16, 12) }; })(),
  (function () { const ex = [ // Song 3 - baroque naval procession, organ chords, formal fanfare, majestic & merciless (D minor)
      { inst: 'organ', vol: 0.105, seq: 'D4:4 A4:4 D5:4 A4:4 BB4:4 A4:4 G4:4 F4:4 G4:4 A4:4 BB4:4 A4:4 D5:4 C#5:4 D5:4 A4:4' },
      { inst: 'brass', vol: 0.085, seq: 'D5:4 R:4 A4:4 R:4 D5:4 R:4 F5:4 R:4 E5:4 R:4 D5:4 R:4 A4:4 R:4 D5:4 R:4' },
      { inst: 'subbass', vol: 0.16, seq: 'D1:16 BB1:16 G1:16 A1:16' },
      { inst: 'drum', vol: 0.10, seq: rep('K:4 R:4 K:4 S:4', 4) },
    ]; return { bpm: 96, explore: ex, battle: toBattle(ex, 'brass', 0.115, 'square', 0.085, rep(D.marchB, 4), 0.15, 12) }; })(),
] };

// ===========================================================================
//  SOLO tracks (each 3 variants, except title which is a single song)
// ===========================================================================

// TITLE / FREE PIRATES - 3 songs. v1 medieval bard tavern; v2/v3 from prompts.
SOLO.title = { variants: [
  { bpm: 120, loop: true, channels: [ // Song 1 - medieval bard tavern, jaunty lute (G major / mixolydian)
    { inst: 'nylon', vol: 0.135, seq:
      'D5:2 G5:2 G5:2 A5:2 B5:2 A5:2 G5:2 D5:2 E5:2 F#5:2 G5:4 D5:2 E5:2 F#5:4 ' +
      'G5:2 A5:2 B5:2 C6:2 B5:2 A5:2 G5:4 A5:2 G5:2 F#5:2 E5:2 D5:4 G5:4 ' +
      'B5:2 A5:2 G5:2 A5:2 B5:2 D6:2 B5:4 A5:2 G5:2 E5:2 F#5:2 G5:8' },
    { inst: 'whistle', vol: 0.075, seq:
      'G4:8 B4:8 A4:8 D5:8 B4:8 D5:8 C5:8 A4:8 D5:8 B4:8 A4:8 G4:8' },
    { inst: 'bass', vol: 0.16, seq:
      'G2:4 D3:4 G2:4 B2:4 C3:4 G2:4 D3:4 D3:4 G2:4 D3:4 E3:4 B2:4 ' +
      'C3:4 G2:4 D3:4 D3:4 G2:4 D3:4 G2:4 D3:4 C3:4 D3:4 G2:4 G2:4' },
    { inst: 'drum', vol: 0.085, seq: rep('T:4 B:2 W:2', 11) + ' T:2 B:2 W:2 W:2' },
  ] },
  { bpm: 124, loop: true, channels: [ // Song 2 - rowdy pirate tavern shanty, stomp-and-clap, scrappy escape (D major)
    { inst: 'nylon', vol: 0.135, seq: 'D5:2 D5:2 F#5:2 A5:2 D6:2 A5:2 F#5:2 D5:2 G5:2 G5:2 B5:2 G5:2 A5:2 F#5:2 D5:4 A5:2 A5:2 D6:2 A5:2 B5:2 A5:2 G5:4 F#5:2 G5:2 A5:2 F#5:2 E5:2 D5:2 D5:4' },
    { inst: 'whistle', vol: 0.075, seq: 'F#4:8 A4:8 G4:8 B4:8 A4:8 D5:8 F#4:8 A4:8' },
    { inst: 'bass', vol: 0.16, seq: 'D2:4 A2:4 D2:4 A2:4 G2:4 D3:4 A2:4 A2:4 D2:4 A2:4 D2:4 A2:4 A2:4 E3:4 A2:4 A2:4' },
    { inst: 'drum', vol: 0.10, seq: rep('K:4 C:4 K:2 K:2 C:4', 4) },
  ] },
  { bpm: 84, loop: true, channels: [ // Song 3 - hopeful outlaw sea ballad, rising melody, warm bass, westward (D major)
    { inst: 'whistle', vol: 0.12, seq: 'D5:4 F#5:4 A5:4 B5:4 A5:4 G5:4 F#5:4 E5:4 F#5:4 A5:4 D6:4 E6:4 D6:4 A5:4 B5:4 A5:4' },
    { inst: 'nylon', vol: 0.09, seq: 'D4:4 A4:4 D5:4 A4:4 B3:4 F#4:4 B4:4 F#4:4 G3:4 D4:4 G4:4 B4:4 A3:4 E4:4 A4:4 C#5:4' },
    { inst: 'bass', vol: 0.16, seq: 'D2:8 D2:8 B1:8 B1:8 G1:8 G1:8 A1:8 A1:8' },
    { inst: 'drum', vol: 0.085, seq: rep('K:4 H:4 S:4 H:4', 4) },
  ] },
] };

// IMPERIAL ARMADA - cold military march (battle override), C minor
SOLO.armada = { variants: [
  { bpm: 116, loop: true, channels: [
    { inst: 'brass', vol: 0.12, seq: 'G4:4 G4:2 G4:2 AB4:4 G4:4 F4:4 EB4:2 F4:2 G4:8 C5:4 BB4:2 AB4:2 G4:4 F4:4 EB4:4 D4:2 EB4:2 C4:8' },
    { inst: 'square', vol: 0.085, seq: 'EB4:4 EB4:4 F4:4 F4:4 EB4:4 D4:4 EB4:8 EB4:4 D4:4 EB4:4 C4:4 AB3:4 G3:4 C4:8' },
    { inst: 'subbass', vol: 0.18, seq: 'C2:4 C2:4 G1:4 C2:4 C2:4 F1:4 G1:4 G1:4 C2:4 C2:4 AB1:4 AB1:4 F1:4 F1:4 G1:4 G1:4' },
    { inst: 'drum', vol: 0.13, seq: 'K:4 R:2 S:2 K:2 K:2 S:4 K:4 R:2 S:2 K:2 K:2 S:4 K:4 R:2 S:2 K:2 K:2 S:4 K:4 R:2 S:2 K:2 S:2 S:4' },
  ] },
  { bpm: 116, loop: true, channels: [ // Song 2 - fife-and-drum march, square fanfare, rigid snare, relentless pursuit (C minor)
    { inst: 'square', vol: 0.11, seq: 'C5:2 C5:2 G4:2 C5:2 EB5:2 D5:2 C5:2 G4:2 C5:2 D5:2 EB5:2 F5:2 G5:2 F5:2 EB5:4 G5:2 G5:2 F5:2 EB5:2 D5:2 C5:2 BB4:4 C5:2 EB5:2 G5:2 C5:2 G4:2 C5:2 C5:4' },
    { inst: 'brass', vol: 0.085, seq: 'C4:4 R:4 G3:4 R:4 C4:4 R:4 G3:4 R:4 AB3:4 R:4 G3:4 R:4 C4:4 R:4 G3:4 R:4' },
    { inst: 'subbass', vol: 0.18, seq: 'C2:8 C2:8 G1:8 G1:8 AB1:8 AB1:8 G1:8 G1:8' },
    { inst: 'drum', vol: 0.14, seq: rep('K:4 R:2 S:2 K:4 S:4', 4) },
  ] },
  { bpm: 100, loop: true, channels: [ // Song 3 - baroque naval procession, organ chords, formal fanfare, majestic (C minor)
    { inst: 'organ', vol: 0.105, seq: 'C4:4 G4:4 C5:4 G4:4 AB4:4 G4:4 F4:4 EB4:4 F4:4 G4:4 AB4:4 G4:4 C5:4 BB4:4 C5:4 G4:4' },
    { inst: 'brass', vol: 0.085, seq: 'C5:4 R:4 G4:4 R:4 C5:4 R:4 EB5:4 R:4 D5:4 R:4 C5:4 R:4 G4:4 R:4 C5:4 R:4' },
    { inst: 'subbass', vol: 0.18, seq: 'C1:16 AB1:16 F1:16 G1:16' },
    { inst: 'drum', vol: 0.11, seq: rep('K:4 R:4 K:4 S:4', 4) },
  ] },
] };

// THE WARDEN - thrilling but scary boss, D minor, fast and menacing
SOLO.warden = { variants: [
  { bpm: 144, loop: true, channels: [
    { inst: 'saw', vol: 0.12, seq: 'D5:2 EB5:2 D5:2 A4:2 D5:2 F5:2 G#5:2 A5:2 BB5:2 A5:2 G#5:2 A5:2 F5:2 D5:2 EB5:2 C#5:2 D5:2 F5:2 A5:2 D6:2 C#6:2 A5:2 F5:2 D5:2 A5:2 G#5:2 A5:2 BB5:2 A5:2 F5:2 D5:2 A4:2' },
    { inst: 'choir', vol: 0.075, seq: 'D4:4 R:4 F4:4 R:4 BB3:4 R:4 A3:4 R:4 D4:4 R:4 F4:4 R:4 GB3:4 R:4 A3:4 R:4' },
    { inst: 'subbass', vol: 0.18, seq: 'D2:2 D2:2 D2:2 D2:2 A1:2 A1:2 D2:2 D2:2 BB1:2 BB1:2 BB1:2 BB1:2 A1:2 A1:2 A1:2 A1:2 D2:2 D2:2 D2:2 D2:2 F1:2 F1:2 D2:2 D2:2 A1:2 A1:2 GB1:2 GB1:2 A1:2 A1:2 A1:2 A1:2' },
    { inst: 'drum', vol: 0.16, seq: 'K:2 S:2 K:2 K:2 S:2 H:2 K:2 S:2 K:2 S:2 K:2 K:2 S:2 K:2 S:2 S:2 K:2 S:2 K:2 K:2 S:2 H:2 K:2 S:2 K:2 K:2 S:2 K:2 S:2 S:2 S:2 S:2' },
  ] },
  { bpm: 80, loop: true, channels: [ // Song 2 - funeral march, corrupted sea shanty, doom bass, cannon percussion (D minor)
    { inst: 'saw', vol: 0.12, seq: 'D5:4 A4:4 D5:4 F5:4 E5:4 D5:4 C#5:4 A4:4 D5:4 F5:4 A5:4 G5:4 F5:4 E5:4 D5:8' },
    { inst: 'choir', vol: 0.075, seq: 'D4:8 F4:8 BB3:8 A3:8 D4:8 G4:8 A3:8 A3:8' },
    { inst: 'subbass', vol: 0.18, seq: 'D1:16 BB1:16 G1:16 A1:16' },
    { inst: 'drum', vol: 0.15, seq: rep('K:8 K:4 S:4', 4) },
  ] },
  { bpm: 76, loop: true, channels: [ // Song 3 - tragic dark reflection, inverted pirate motif, passacaglia bass, ghost bells (D minor)
    { inst: 'saw', vol: 0.115, seq: 'A5:4 F5:4 D5:4 F5:4 A5:4 G5:4 E5:4 G5:4 BB5:4 A5:4 F5:4 D5:4 E5:4 C#5:4 D5:4 A4:4' },
    { inst: 'bell', vol: 0.06, seq: 'R:8 D6:4 A5:4 R:8 F6:4 D6:4 R:8 BB5:4 G5:4 R:8 A5:4 D5:4' },
    { inst: 'subbass', vol: 0.18, seq: 'D1:8 D1:8 C1:8 C1:8 BB1:8 BB1:8 A1:8 A1:8' },
    { inst: 'drum', vol: 0.12, seq: rep('K:8 R:4 S:4', 4) },
  ] },
] };

// GHOST SHIPS - spectral shanty (eerie, detuned, swaying), F# minor
SOLO.ghost = { variants: [
  { bpm: 88, loop: true, channels: [
    { inst: 'siren', vol: 0.10, seq: 'F#4:4 A4:4 C#5:4 A4:4 B4:4 A4:4 G#4:4 E4:4 F#4:4 C#5:4 F#5:4 C#5:4 E5:4 D5:4 B4:4 A4:4' },
    { inst: 'choir', vol: 0.07, seq: 'F#3:8 C#4:8 D4:8 A3:8 B3:8 F#3:8 C#4:8 C#4:8' },
    { inst: 'bell', vol: 0.055, seq: 'R:8 F#5:4 A5:4 R:8 E5:4 C#5:4 R:8 D5:4 F#5:4 R:8 C#5:4 A4:4' },
    { inst: 'subbass', vol: 0.155, seq: 'F#1:8 F#1:8 B1:8 B1:8 D2:8 D2:8 C#2:8 C#2:8' },
    { inst: 'drum', vol: 0.06, seq: rep('K:4 R:4 B:2 W:2 R:4', 4) },
  ] },
  { bpm: 80, loop: true, channels: [ // Song 2 - haunted sea dirge, slowed shanty, detuned square, ship bell, drowned sailors (F# minor)
    { inst: 'square', vol: 0.085, seq: 'F#4:4 A4:4 C#5:4 A4:4 B4:4 A4:4 G#4:4 E4:4 F#4:4 A4:4 D5:4 A4:4 C#5:4 B4:4 A4:4 F#4:4' },
    { inst: 'choir', vol: 0.07, seq: 'F#3:8 C#4:8 D4:8 A3:8 B3:8 F#3:8 C#4:8 C#4:8' },
    { inst: 'bell', vol: 0.055, seq: 'R:8 F#5:8 R:8 E5:8 R:8 D5:8 R:8 C#5:8' },
    { inst: 'subbass', vol: 0.155, seq: 'F#1:16 D2:16 B1:16 C#2:16' },
    { inst: 'drum', vol: 0.06, seq: rep('K:8 R:4 W:2 R:2', 4) },
  ] },
  { bpm: 68, loop: true, channels: [ // Song 3 - fogbound ghost lament, sparse bells, low drone, creaking wood, patient phantoms (F# minor)
    { inst: 'bell', vol: 0.085, seq: 'F#5:8 R:8 A5:8 R:8 E5:8 R:8 C#5:8 R:8' },
    { inst: 'choir', vol: 0.075, seq: 'F#3:16 D3:16 E3:16 C#3:16' },
    { inst: 'subbass', vol: 0.155, seq: 'F#1:16 D1:16 E1:16 C#1:16' },
    { inst: 'drum', vol: 0.05, seq: rep('R:8 W:2 R:4 W:2', 4) },
  ] },
] };

// VICTORY - triumphant fanfares (stingers), C major
SOLO.victory = { variants: [
  { bpm: 120, loop: false, channels: [
    { inst: 'brass', vol: 0.15, seq: 'G4:4 C5:4 E5:4 G5:8 E5:2 G5:2 C6:8 A5:4 G5:4 E5:4 C5:4 D5:4 G5:12' },
    { inst: 'whistle', vol: 0.10, seq: 'E4:8 G4:8 C5:8 E5:8 D5:8 C5:8 G4:8 C5:8' },
    { inst: 'bass', vol: 0.17, seq: 'C3:8 E3:8 G3:8 C3:8 F3:8 G3:8 C3:8 C3:8' },
    { inst: 'drum', vol: 0.11, seq: rep('K:4 S:4 K:4 S:4', 3) + ' K:2 K:2 S:2 S:2 K:4 S:4' },
  ] },
  { bpm: 128, loop: false, channels: [
    { inst: 'brass', vol: 0.15, seq: 'C5:4 E5:4 G5:8 C6:8 G5:4 E5:4 C6:8 D6:4 C6:4 G5:4 E5:4 C6:8' },
    { inst: 'bell', vol: 0.09, seq: 'C5:4 E5:4 G5:4 C6:4 E6:4 C6:4 G5:4 E5:4 G5:4 C6:4 E6:4 G6:4 C6:4 G5:4 E5:4 C5:4' },
    { inst: 'bass', vol: 0.17, seq: 'C3:4 C3:4 G3:4 G3:4 C3:4 E3:4 G3:4 G3:4 C3:4 G3:4 C3:4 G3:4 C3:4 C3:4 G3:4 C3:4' },
    { inst: 'drum', vol: 0.11, seq: rep('K:4 S:4 K:4 S:4', 3) + ' K:2 K:2 S:2 S:2 K:4 S:4' },
  ] },
  { bpm: 116, loop: false, channels: [
    { inst: 'brass', vol: 0.15, seq: 'G4:4 A4:4 G5:8 F5:2 E5:2 D5:2 C5:2 G5:8 E5:4 F5:4 G5:8 E5:4 C5:12' },
    { inst: 'whistle', vol: 0.10, seq: 'G4:8 C5:8 E5:8 D5:8 C5:8 E5:8 C5:8 G4:8' },
    { inst: 'bass', vol: 0.17, seq: 'C3:8 G3:8 C3:8 G3:8 C3:8 G3:8 C3:8 C3:8' },
    { inst: 'drum', vol: 0.11, seq: rep('K:4 S:4 K:4 S:4', 3) + ' K:2 K:2 S:2 S:2 K:4 S:4' },
  ] },
] };

// LOST TO THE TIDE - mournful but dignified close (stingers), A minor
SOLO.gameover = { variants: [
  { bpm: 68, loop: false, channels: [
    { inst: 'choir', vol: 0.12, seq: 'A4:6 E4:6 F4:6 E4:12 R:2 D4:6 C4:6 B3:6 A3:18' },
    { inst: 'organ', vol: 0.085, seq: 'A3:12 G3:12 F3:12 E3:14 A2:18' },
    { inst: 'subbass', vol: 0.17, seq: 'A1:12 F1:12 D1:12 E1:14 A1:18' },
  ] },
  { bpm: 64, loop: false, channels: [
    { inst: 'choir', vol: 0.12, seq: 'E4:8 F4:8 E4:8 D4:8 C4:12 R:2 B3:6 A3:6 E4:6 A3:12' },
    { inst: 'organ', vol: 0.085, seq: 'A3:16 F3:16 G3:16 E3:8 A2:20' },
    { inst: 'subbass', vol: 0.17, seq: 'A1:16 D2:16 E1:16 E1:8 A1:20' },
  ] },
  { bpm: 72, loop: false, channels: [
    { inst: 'choir', vol: 0.12, seq: 'A4:8 G4:4 F4:4 E4:8 D4:4 C4:4 B3:8 E4:4 D4:4 A3:18' },
    { inst: 'organ', vol: 0.085, seq: 'A3:8 E3:8 F3:8 C3:8 G3:8 E3:8 A2:18' },
    { inst: 'subbass', vol: 0.17, seq: 'A1:8 A1:8 F1:8 C2:8 G1:8 E1:8 A1:18' },
  ] },
] };

// ===========================================================================
//  LONG-FORM EXPANSION PASS
//  Every looping track is built from its hand-written loop (section A) plus an
//  auto-derived contrasting section B (the loop lifted to the IV - a classic
//  bridge), arranged intro -> A/B trade with drum/voice drops -> sparse outro.
//  This stretches the ~8-12s loops to ~85-100s before repeating (FTL-scale),
//  with no key clash since explore & battle B share the same lift. Tracks that
//  already carry a bespoke arrangement (r1) or are one-shot stingers are skipped.
// ===========================================================================
// section B = section A transposed by `semis`; battle drops its lead an octave
// (same pitch-class, just lower) so high battle leads don't get squeaky.
function secB(channels, semis, dropLead) {
  return channels.map((c, i) => ({ inst: c.inst, vol: c.vol, seq: tr(c.seq, semis - (dropLead && i === 0 ? 12 : 0)) }));
}
// arrangement timeline of `n` sections: 2-bar sparse intro, A/B trade with a
// melodic drop and a drum-drop breakdown, sparse outro. `secs` = voices to thin.
function buildForm(secs, n) {
  const mAll = secs.concat(['drum']);
  const f = [['A', mAll], ['A', ['drum']]];
  const mid = ['A', 'B', ['A', secs], 'B', 'A', ['B', ['drum']], 'A', 'B'];
  for (let i = 0; i < n - 3; i++) f.push(mid[i % mid.length]);
  f.push(['A', mAll]);
  return f;
}
function _secsOf(chs) { return chs.filter((c, i) => i > 0 && !/bass/.test(c.inst) && c.inst !== 'drum').map(c => c.inst); }
function _formLen(bpm) { return Math.max(7, Math.min(13, Math.round(bpm * 0.095))); } // -> ~85-100s loops
function expandVariant(v, i) {
  if (_seqLen(v.explore[0].seq) > 160) return v; // already arranged (r1)
  const secs = Array.from(new Set(_secsOf(v.explore).concat(_secsOf(v.battle))));
  const iv = [5, 7, 5][i % 3]; // variety: lift to IV / V / IV per variant
  const form = buildForm(secs, _formLen(v.bpm));
  return { bpm: v.bpm,
    explore: arrange({ A: v.explore, B: secB(v.explore, iv, false) }, form),
    battle: arrange({ A: v.battle, B: secB(v.battle, iv, true) }, form) };
}
function expandSolo(tr2) {
  if (tr2.loop === false) return tr2;                 // victory/gameover stingers stay short
  if (_seqLen(tr2.channels[0].seq) > 160) return tr2;
  const secs = _secsOf(tr2.channels);
  const form = buildForm(secs, _formLen(tr2.bpm));
  return { bpm: tr2.bpm, loop: true, channels: arrange({ A: tr2.channels, B: secB(tr2.channels, 5, false) }, form) };
}
Object.keys(THEMES).forEach(k => { THEMES[k].variants = THEMES[k].variants.map(expandVariant); });
Object.keys(SOLO).forEach(k => { SOLO[k].variants = SOLO[k].variants.map(expandSolo); });

// ============================================================================
//  ENGINE
// ============================================================================
const AUDIO = {
  ctx: null, master: null, music: null, muted: false, _noiseBuf: null,
  _active: [], _timer: null, _pending: null, _waves: null, delayIn: null,
  region: 0, regionVar: 0, mode: 'idle', current: null,
  _exGain: null, _btGain: null, _soloGain: null,

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); this._flushPending(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);
      this.music = this.ctx.createGain();
      this.music.gain.value = 0.5;
      this.music.connect(this.master);
      const dl = this.ctx.createDelay(0.6); dl.delayTime.value = 0.26;
      const fb = this.ctx.createGain(); fb.gain.value = 0.30;
      const wet = this.ctx.createGain(); wet.gain.value = 0.22;
      this.delayIn = this.ctx.createGain();
      this.delayIn.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(this.music);
      const len = this.ctx.sampleRate;
      this._noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this._noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this._waves = { p25: this._pulseWave(0.25), p12: this._pulseWave(0.125) };
    } catch (e) { this.ctx = null; }
    this._flushPending();
  },
  _pulseWave(duty) {
    const N = 24, re = new Float32Array(N + 1), im = new Float32Array(N + 1);
    for (let n = 1; n <= N; n++) im[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
    return this.ctx.createPeriodicWave(re, im, { disableNormalization: false });
  },
  _flushPending() { if (this._pending && this.ctx) { const p = this._pending; this._pending = null; p(); } },
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.9; },
  _rand(n) { return Math.floor(Math.random() * n); },

  // ---------------- public music API ----------------
  playMap() {
    const r = (typeof Game !== 'undefined' && Game.run) ? Game.run.region : 0;
    this.enterRegion(r);
  },
  enterRegion(r, variant) {
    if (!this.ctx) { this._pending = () => this.enterRegion(r, variant); return; }
    const th = THEMES['r' + (r + 1)] || THEMES.r1;
    if (variant == null) {
      if (this.region === r && this.current && this.current.indexOf('theme:') === 0 && (this.mode === 'sail' || this.mode === 'fight')) {
        this._fade(this._btGain, 0, 0.6); this._fade(this._exGain, 1, 0.6); this.mode = 'sail'; return;
      }
      variant = this._rand(th.variants.length);
    }
    this.region = r; this.regionVar = variant;
    this._startTheme(th.variants[variant], 'theme:' + r + ':' + variant);
    this.mode = 'sail';
  },
  setCombat(on, faction) {
    if (!this.ctx) { this._pending = () => this.setCombat(on, faction); return; }
    if (on) {
      if (faction === 'armada') { this._startSolo(this._pickVar(SOLO.armada), 'armada'); this.mode = 'override'; return; }
      if (faction === 'boss' || faction === 'warden') { this._startSolo(this._pickVar(SOLO.warden), 'warden'); this.mode = 'override'; return; }
      if (this.mode === 'override' || !this._btGain) this.enterRegion(this.region, this.regionVar);
      this._fade(this._exGain, 0.0, 0.8); this._fade(this._btGain, 1, 0.8); this.mode = 'fight';
    } else {
      if (this.mode === 'override') { this.enterRegion(this.region, this.regionVar); return; }
      this._fade(this._btGain, 0, 0.9); this._fade(this._exGain, 1, 0.9); this.mode = 'sail';
    }
  },
  play(name) {
    if (!this.ctx) { this._pending = () => this.play(name); return; }
    if (name === 'title') { this._startSolo(this._pickVar(SOLO.title), 'title'); return; }
    if (name === 'victory') { this._startSolo(this._pickVar(SOLO.victory), 'victory'); return; }
    if (name === 'gameover') { this._startSolo(this._pickVar(SOLO.gameover), 'gameover'); return; }
    if (name === 'map') { this.playMap(); return; }
    if (name === 'combat') { this.setCombat(true, 'sea'); return; }
    if (name === 'boss') { this.setCombat(true, 'boss'); return; }
  },
  _pickVar(solo) { return solo.variants[this._rand(solo.variants.length)]; },
  // jukebox: spec = {kind:'rexp'|'rbat', r, variant} or {kind:'solo', id, variant}
  audition(spec) {
    if (!this.ctx) { this._pending = () => this.audition(spec); return; }
    if (spec.kind === 'rexp' || spec.kind === 'rbat') {
      const th = THEMES['r' + (spec.r + 1)];
      this._startTheme(th.variants[spec.variant], 'aud:' + spec.kind + spec.r + ':' + spec.variant);
      const ex = spec.kind === 'rexp';
      this._fade(this._exGain, ex ? 1 : 0, 0.12); this._fade(this._btGain, ex ? 0 : 1, 0.12);
    } else {
      const tr = SOLO[spec.id]; if (!tr) return;
      this._startSolo(tr.variants[spec.variant] || tr.variants[0], 'aud:' + spec.id + ':' + spec.variant);
    }
  },

  // ---------------- deck plumbing ----------------
  _startTheme(variant, tag) {
    if (this.current === tag) return;
    this.stopMusic(); this.current = tag;
    this._exGain = this.ctx.createGain(); this._exGain.gain.value = 1; this._exGain.connect(this.music);
    this._btGain = this.ctx.createGain(); this._btGain.gain.value = 0; this._btGain.connect(this.music);
    const t0 = this.ctx.currentTime + 0.1;
    this._spawnDeck(variant.explore, variant.bpm, this._exGain, t0, true);
    this._spawnDeck(variant.battle, variant.bpm, this._btGain, t0, true);
    this._run();
  },
  _startSolo(tr, tag) {
    if (this.current === tag) return;
    this.stopMusic(); this.current = tag;
    this._soloGain = this.ctx.createGain(); this._soloGain.gain.value = 1; this._soloGain.connect(this.music);
    this._spawnDeck(tr.channels, tr.bpm, this._soloGain, this.ctx.currentTime + 0.1, tr.loop !== false);
    this._run();
  },
  _spawnDeck(channels, bpm, out, t0, loop) {
    const stepDur = 60 / bpm / 4;
    for (const ch of channels) {
      const inst = INSTR[ch.inst] || INSTR.pulse;
      const toks = ch.seq.trim().split(/\s+/).map(tk => {
        const at = tk.split('@'); const v = at[1] ? parseInt(at[1]) / 9 : 1;
        const p = at[0].split(':'); return { n: p[0], len: parseInt(p[1] || '1'), vel: v };
      });
      this._active.push({ inst, vol: ch.vol, toks, i: 0, next: t0, done: false, stepDur, loop, out });
    }
  },
  _run() {
    if (this._timer) return;
    const tick = () => {
      if (!this._active.length) { clearInterval(this._timer); this._timer = null; return; }
      const ahead = this.ctx.currentTime + 0.22;
      let any = false;
      for (const st of this._active) {
        while (!st.done && st.next < ahead) {
          const tk = st.toks[st.i]; const dur = tk.len * st.stepDur;
          if (tk.n !== 'R') this._voice(st, tk, st.next, dur);
          st.next += dur; st.i++;
          if (st.i >= st.toks.length) { if (st.loop) st.i = 0; else st.done = true; }
        }
        if (!st.done) any = true;
      }
      if (!any) { clearInterval(this._timer); this._timer = null; }
    };
    this._timer = setInterval(tick, 70); tick();
  },
  _fade(g, to, dt) {
    if (!g) return; const t = this.ctx.currentTime;
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(to, t + dt);
  },
  stopMusic() {
    this.current = null; this.mode = 'idle';
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    this._active = [];
    for (const g of [this._exGain, this._btGain, this._soloGain]) { if (g) try { g.disconnect(); } catch (e) {} }
    this._exGain = this._btGain = this._soloGain = null;
  },

  // ---------------- the voice (one note) ----------------
  _voice(st, tk, t, dur) {
    const c = this.ctx, inst = st.inst;
    if (inst.wave === 'drum') { this._drum(st, tk.n, t, dur, tk.vel); return; }
    const freq = noteFreq(tk.n.replace('S', '#'));
    if (!freq) return;
    const peak = st.vol * inst.gain * (tk.vel || 1);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
    const a = inst.a, d = inst.d, s = inst.s, r = inst.r;
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.linearRampToValueAtTime(Math.max(0.0001, peak * s), t + a + d);
    const off = t + Math.max(a + d, dur);
    g.gain.setValueAtTime(Math.max(0.0001, peak * (s > 0 ? s : 1)) * (s > 0 ? 1 : 0.0001), off - 0.001);
    g.gain.linearRampToValueAtTime(0.0001, off + r);
    let sink = g;
    if (inst.lp) {
      const f = c.createBiquadFilter(); f.type = 'lowpass';
      f.frequency.setValueAtTime(inst.lp.f, t);
      f.frequency.exponentialRampToValueAtTime(Math.max(120, inst.lp.to), t + Math.min(dur, 0.5));
      f.connect(g); sink = f;
    }
    const harms = inst.harm || [1];
    const dets = inst.detune ? [-inst.detune, inst.detune] : [0];
    const stopT = off + r + 0.03;
    for (let hi = 0; hi < harms.length; hi++) {
      for (const dt2 of dets) {
        const o = c.createOscillator();
        this._setWave(o, inst.wave);
        o.frequency.setValueAtTime(freq * (hi + 1), t);
        if (inst.glide && st._pf) { o.frequency.setValueAtTime(st._pf * (hi + 1), t); o.frequency.linearRampToValueAtTime(freq * (hi + 1), t + inst.glide); }
        if (dt2) o.detune.value = dt2;
        const hg = c.createGain(); hg.gain.value = harms[hi] / (dets.length);
        o.connect(hg); hg.connect(sink);
        if (inst.vib) {
          const lfo = c.createOscillator(); lfo.frequency.value = inst.vib.r;
          const lg = c.createGain(); lg.gain.value = inst.vib.d; lfo.connect(lg); lg.connect(o.detune);
          lfo.start(t); lfo.stop(stopT);
        }
        if (inst.fm) {
          const m = c.createOscillator(); m.frequency.value = freq * inst.fm.ratio;
          const mg = c.createGain(); mg.gain.setValueAtTime(freq * inst.fm.amp, t);
          mg.gain.exponentialRampToValueAtTime(1, t + inst.fm.decay);
          m.connect(mg); mg.connect(o.frequency); m.start(t); m.stop(stopT);
        }
        o.start(t); o.stop(stopT);
      }
    }
    g.connect(st.out);
    if (inst.echo && this.delayIn) g.connect(this.delayIn);
    if (inst.glide) st._pf = freq;
  },
  _setWave(o, w) {
    if (w === 'p25') o.setPeriodicWave(this._waves.p25);
    else if (w === 'p12') o.setPeriodicWave(this._waves.p12);
    else o.type = w;
  },
  _drum(st, n, t, dur, vel) {
    const c = this.ctx, V = st.vol * (vel || 1);
    const tone = (wave, f0, f1, d, v) => {
      const o = c.createOscillator(), g = c.createGain(); o.type = wave;
      o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + d);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g); g.connect(st.out); o.start(t); o.stop(t + d + 0.02);
    };
    const noise = (type, f, d, v) => {
      const src = c.createBufferSource(); src.buffer = this._noiseBuf; src.loop = true;
      const ft = c.createBiquadFilter(); ft.type = type; ft.frequency.value = f;
      const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
      src.connect(ft); ft.connect(g); g.connect(st.out); src.start(t); src.stop(t + d + 0.02);
    };
    switch (n) {
      case 'K': noise('lowpass', 160, 0.12, V * 2.0); tone('sine', 150, 45, 0.16, V * 1.6); break;
      case 'S': noise('bandpass', 1800, 0.16, V); tone('triangle', 190, 150, 0.08, V * 0.5); break;
      case 'H': noise('highpass', 8200, 0.04, V * 0.6); break;
      case 'O': noise('highpass', 7600, 0.16, V * 0.5); break;
      case 'T': tone('sine', 220, 90, 0.18, V * 1.3); noise('lowpass', 400, 0.1, V * 0.4); break;
      case 'C': noise('bandpass', 1500, 0.05, V * 0.9); noise('bandpass', 1500, 0.05, V * 0.7); break;
      case 'W': tone('triangle', 1250, 1250, 0.05, V * 0.9); break;
      case 'A': tone('square', 880, 880, 0.18, V * 0.5); tone('square', 1320, 1320, 0.16, V * 0.4); noise('highpass', 5000, 0.12, V * 0.3); break;
      case 'B': noise('highpass', 6500, 0.03, V * 0.4); break;
      case 'R': noise('highpass', 3000, 0.03, V * 0.7); tone('triangle', 400, 400, 0.03, V * 0.4); break;
      default: noise('bandpass', 1200, 0.1, V);
    }
  },

  // ---------------- sfx (unchanged behaviour) ----------------
  sfx(name) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx, t = c.currentTime;
    const osc = (wave, f0, f1, dur, vol, delay) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = wave; const s = t + (delay || 0);
      o.frequency.setValueAtTime(f0, s);
      if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), s + dur);
      g.gain.setValueAtTime(vol, s); g.gain.exponentialRampToValueAtTime(0.001, s + dur);
      o.connect(g); g.connect(this.master); o.start(s); o.stop(s + dur + 0.02);
    };
    const noise = (filterType, freq, dur, vol, delay) => {
      const src = c.createBufferSource(); src.buffer = this._noiseBuf; src.loop = true;
      const f = c.createBiquadFilter(); f.type = filterType; f.frequency.value = freq;
      const g = c.createGain(); const s = t + (delay || 0);
      g.gain.setValueAtTime(vol, s); g.gain.exponentialRampToValueAtTime(0.001, s + dur);
      src.connect(f); f.connect(g); g.connect(this.master); src.start(s); src.stop(s + dur + 0.02);
    };
    switch (name) {
      case 'click': osc('square', 700, 900, 0.05, 0.12); break;
      case 'back': osc('square', 500, 300, 0.07, 0.12); break;
      case 'coin': osc('square', 880, 880, 0.06, 0.14); osc('square', 1320, 1320, 0.09, 0.14, 0.06); break;
      case 'cannon': noise('lowpass', 420, 0.28, 0.5); osc('sine', 110, 40, 0.22, 0.5); break;
      case 'hit': noise('bandpass', 300, 0.18, 0.4); osc('sawtooth', 200, 60, 0.15, 0.2); break;
      case 'wardhit': osc('sine', 700, 350, 0.16, 0.25); noise('highpass', 3000, 0.08, 0.12); break;
      case 'miss': noise('highpass', 2400, 0.16, 0.13); break;
      case 'fire': noise('highpass', 1100, 0.32, 0.25); osc('sawtooth', 300, 120, 0.3, 0.1); break;
      case 'ion': osc('square', 1400, 180, 0.18, 0.2); osc('square', 1800, 240, 0.14, 0.13, 0.04); break;
      case 'beam': osc('sawtooth', 220, 330, 0.45, 0.16); osc('sawtooth', 440, 660, 0.45, 0.08); break;
      case 'bubble': osc('sine', 280, 700, 0.18, 0.2); osc('sine', 350, 900, 0.16, 0.14, 0.09); break;
      case 'note': osc('triangle', 990, 940, 0.22, 0.22); osc('triangle', 1240, 1190, 0.2, 0.15, 0.12); break;
      case 'stun': osc('triangle', 1100, 1100, 0.08, 0.2); osc('triangle', 750, 750, 0.08, 0.2, 0.09); osc('triangle', 1100, 1100, 0.1, 0.2, 0.18); break;
      case 'heal': osc('sine', 523, 523, 0.08, 0.16); osc('sine', 659, 659, 0.08, 0.16, 0.08); osc('sine', 784, 784, 0.12, 0.16, 0.16); break;
      case 'alarm': osc('square', 700, 700, 0.12, 0.12); osc('square', 480, 480, 0.12, 0.12, 0.14); break;
      case 'lightning': noise('highpass', 1500, 0.1, 0.5); noise('lowpass', 500, 0.4, 0.45, 0.05); break;
      case 'splash': noise('bandpass', 700, 0.3, 0.3); break;
      case 'teleport': osc('sine', 250, 1100, 0.25, 0.2); osc('sine', 1100, 250, 0.25, 0.2, 0.22); break;
      case 'explode': noise('lowpass', 250, 0.6, 0.6); osc('sine', 90, 30, 0.5, 0.45); break;
      case 'levelup': osc('square', 523, 523, 0.07, 0.14); osc('square', 659, 659, 0.07, 0.14, 0.07); osc('square', 784, 784, 0.07, 0.14, 0.14); osc('square', 1047, 1047, 0.14, 0.14, 0.21); break;
      case 'torpedo': noise('bandpass', 900, 0.4, 0.25); osc('sawtooth', 600, 200, 0.35, 0.1); break;
      case 'creak': osc('sawtooth', 90, 70, 0.3, 0.1); break;
      case 'drown': osc('sine', 400, 150, 0.3, 0.18); noise('bandpass', 500, 0.25, 0.15); break;
      case 'death': osc('sawtooth', 300, 60, 0.45, 0.25); break;
    }
  },
};

// ---- region names/styles for the Jukebox (audio.js loads before data.js) ----
const REGION_MUSIC = [
  { name: 'The Old Coast', style: 'Hornpipe sea-shanty' },
  { name: 'Sapphire Shallows', style: 'Aquatic gamelan / music-box' },
  { name: 'The Serpent Cays', style: 'Tribal drum-war' },
  { name: 'The Cinder Isles', style: 'Flamenco fire' },
  { name: 'Tempest Reach', style: 'Celtic reel storm' },
  { name: 'The Iron Deeps', style: 'Industrial forge work-song' },
  { name: "The Siren's Maze", style: 'Enchanted lullaby music-box' },
  { name: 'The Last Meridian', style: 'Cold imperial march' },
];
// Jukebox catalogue: every item carries how many variants it has (title = 1).
const MUSIC_CATALOG = [
  { group: 'The Seas', items: REGION_MUSIC.map((r, i) => ({ kind: 'rexp', r: i, name: r.name, style: r.style, variants: 3 })) },
  { group: 'Battle Stations', items: REGION_MUSIC.map((r, i) => ({ kind: 'rbat', r: i, name: r.name, style: r.style + ' - to arms', variants: 3 })) },
  { group: 'Factions & Frame', items: [
    { kind: 'solo', id: 'armada', name: 'Imperial Armada', style: 'Cold military march', variants: 3 },
    { kind: 'solo', id: 'warden', name: 'The Warden', style: 'Thrilling, fearful boss', variants: 3 },
    { kind: 'solo', id: 'ghost', name: 'Ghost Ships', style: 'Spectral shanty', variants: 3 },
    { kind: 'solo', id: 'title', name: 'Title / Free Pirates', style: 'Bard tavern / pirate shanty / outlaw ballad', variants: 3 },
    { kind: 'solo', id: 'victory', name: 'Victory', style: 'Triumphant fanfare', variants: 3 },
    { kind: 'solo', id: 'gameover', name: 'Lost to the Tide', style: 'Mournful close', variants: 3 },
  ] },
];
