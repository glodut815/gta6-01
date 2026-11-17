// Seeded random numbers for Sunspire Bay. A small xorshift generator: the same
// seed always gives the same stream, which is what makes the city layout and the
// staged screenshot scenes repeatable. Normal play seeds from the clock.
var SB = window.SB || (window.SB = {});

SB.makeRng = function (seed) {
  var s = (seed >>> 0) || 1;
  // Mix the seed so nearby seeds give unrelated streams.
  s ^= s << 13; s >>>= 0;
  s ^= s >>> 17; s >>>= 0;
  s ^= s << 5; s >>>= 0;
  function next() {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17; s >>>= 0;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  }
  return {
    next: next,
    // Float in [a, b).
    range: function (a, b) { return a + next() * (b - a); },
    // Integer in [a, b] inclusive.
    int: function (a, b) { return a + Math.floor(next() * (b - a + 1)); },
    // True with probability p.
    chance: function (p) { return next() < p; },
    // One element of an array.
    pick: function (arr) { return arr[Math.floor(next() * arr.length)]; },
    // Shuffle a copy of an array.
    shuffled: function (arr) {
      var copy = arr.slice();
      for (var i = copy.length - 1; i > 0; i -= 1) {
        var j = Math.floor(next() * (i + 1));
        var t = copy[i]; copy[i] = copy[j]; copy[j] = t;
      }
      return copy;
    },
  };
};
