/* STARFALL - seeded PRNG (mulberry32) + helpers.
   Two streams: run RNG (deterministic map/eventing, seeded, saved) and
   volatile RNG (combat rolls & cosmetics). */
"use strict";

function mulberry32(seed) {
  var a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function RngStream(seed) {
  this.seed = seed >>> 0;
  this.calls = 0;
  this._f = mulberry32(this.seed);
}
RngStream.prototype.next = function () { this.calls++; return this._f(); };
RngStream.prototype.float = function (lo, hi) { return lo + this.next() * (hi - lo); };
RngStream.prototype.int = function (lo, hi) { // inclusive
  return lo + Math.floor(this.next() * (hi - lo + 1));
};
RngStream.prototype.chance = function (pct) { return this.next() * 100 < pct; };
RngStream.prototype.pick = function (arr) { return arr[Math.floor(this.next() * arr.length)]; };
RngStream.prototype.shuffle = function (arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(this.next() * (i + 1));
    var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
};
RngStream.prototype.weighted = function (items, weightFn) {
  var total = 0, i;
  for (i = 0; i < items.length; i++) total += weightFn(items[i]);
  var r = this.next() * total;
  for (i = 0; i < items.length; i++) {
    r -= weightFn(items[i]);
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
};
// Re-seed and fast-forward (for save restore determinism)
RngStream.prototype.restore = function (seed, calls) {
  this.seed = seed >>> 0; this._f = mulberry32(this.seed); this.calls = 0;
  for (var i = 0; i < calls; i++) this.next();
};

var RNG = {
  run: new RngStream(1234567),
  vol: new RngStream((Math.floor(performance.now() * 1000) ^ 0x9E3779B9) >>> 0),
  newRunSeed: function () { return (Math.floor(performance.now() * 997) ^ Math.floor(Math.random() * 0xFFFFFFFF)) >>> 0; }
};
