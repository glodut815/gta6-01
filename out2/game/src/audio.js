// All sound is synthesized with WebAudio: no audio files, no network.
// Engine hum, two-tone sirens, gunshots, punches, pickups and a small bass
// groove. Everything is guarded so the game still runs if audio is unavailable.
var SB = window.SB || (window.SB = {});

SB.Audio = (function () {
  var ctx = null;
  var master = null;
  var engineOsc = null;
  var engineGain = null;
  var sirenOsc = null;
  var sirenGain = null;
  var sirenTimer = null;
  var sirenHigh = false;
  var musicTimer = null;
  var musicStep = 0;
  var muted = false;
  var started = false;

  function ensure() {
    if (ctx) return true;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
    } catch (err) {
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    try {
      var t = ctx.currentTime;
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
      g.gain.setValueAtTime(vol || 0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (err) { /* sound is best-effort */ }
  }

  function noise(dur, vol, filterFreq, type) {
    if (!ensure() || muted) return;
    try {
      var t = ctx.currentTime;
      var len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var src = ctx.createBufferSource();
      src.buffer = buf;
      var f = ctx.createBiquadFilter();
      f.type = type || 'lowpass';
      f.frequency.value = filterFreq || 800;
      var g = ctx.createGain();
      g.gain.value = vol || 0.3;
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t);
    } catch (err) { /* sound is best-effort */ }
  }

  // A laid-back bass groove: root notes with a hat tick, one bar = 8 steps.
  var BASSLINE = [55, 0, 55, 65.41, 0, 55, 49, 58.27];
  function musicTick() {
    if (!ctx || muted) return;
    var note = BASSLINE[musicStep % BASSLINE.length];
    if (note) tone(note, 0.22, 'triangle', 0.16);
    if (musicStep % 2 === 0) noise(0.03, 0.05, 6000, 'highpass');
    musicStep += 1;
  }

  return {
    // Call from the first user gesture; browsers block audio before that.
    unlock: function () {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume();
      if (started) return;
      started = true;
      if (!musicTimer) musicTimer = setInterval(musicTick, 230);
    },
    toggleMute: function () {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted: function () { return muted; },
    punch: function () { noise(0.09, 0.35, 300); tone(90, 0.08, 'sine', 0.25, 50); },
    shoot: function () { noise(0.12, 0.4, 2400, 'highpass'); tone(220, 0.1, 'square', 0.12, 60); },
    enemyShoot: function () { noise(0.1, 0.2, 1800, 'highpass'); },
    crash: function () { noise(0.25, 0.45, 500); tone(70, 0.2, 'sine', 0.3, 40); },
    pickup: function () { tone(660, 0.1, 'sine', 0.22); setTimeout(function () { tone(880, 0.16, 'sine', 0.22); }, 90); },
    missionDone: function () {
      var notes = [523, 659, 784, 1047];
      notes.forEach(function (n, i) { setTimeout(function () { tone(n, 0.18, 'triangle', 0.25); }, i * 110); });
    },
    busted: function () { tone(392, 0.3, 'sawtooth', 0.18, 196); },
    wasted: function () { tone(220, 0.6, 'sawtooth', 0.2, 55); },
    carDoor: function () { noise(0.07, 0.25, 900); },
    setEngine: function (on, speed01) {
      if (!ensure()) return;
      try {
        if (on && !engineOsc) {
          engineOsc = ctx.createOscillator();
          engineGain = ctx.createGain();
          engineOsc.type = 'sawtooth';
          engineGain.gain.value = 0.0;
          var f = ctx.createBiquadFilter();
          f.type = 'lowpass'; f.frequency.value = 420;
          engineOsc.connect(f); f.connect(engineGain); engineGain.connect(master);
          engineOsc.start();
        }
        if (!on && engineOsc) {
          var o = engineOsc; var g = engineGain;
          engineOsc = null; engineGain = null;
          g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
          setTimeout(function () { try { o.stop(); } catch (e) { /* already stopped */ } }, 200);
          return;
        }
        if (engineOsc) {
          engineOsc.frequency.value = 55 + speed01 * 130;
          engineGain.gain.value = muted ? 0 : 0.05 + speed01 * 0.05;
        }
      } catch (err) { /* engine hum is best-effort */ }
    },
    setSiren: function (on) {
      if (!ensure()) return;
      try {
        if (on && !sirenOsc) {
          sirenOsc = ctx.createOscillator();
          sirenGain = ctx.createGain();
          sirenOsc.type = 'triangle';
          sirenOsc.frequency.value = 700;
          sirenGain.gain.value = 0.0;
          sirenOsc.connect(sirenGain); sirenGain.connect(master);
          sirenOsc.start();
          sirenHigh = false;
          sirenTimer = setInterval(function () {
            if (!sirenOsc) return;
            sirenHigh = !sirenHigh;
            sirenOsc.frequency.value = sirenHigh ? 950 : 700;
            sirenGain.gain.value = muted ? 0 : 0.045;
          }, 380);
        } else if (!on && sirenOsc) {
          clearInterval(sirenTimer);
          sirenTimer = null;
          var o2 = sirenOsc; var g2 = sirenGain;
          sirenOsc = null; sirenGain = null;
          g2.gain.setValueAtTime(g2.gain.value, ctx.currentTime);
          g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
          setTimeout(function () { try { o2.stop(); } catch (e) { /* already stopped */ } }, 150);
        }
      } catch (err) { /* siren is best-effort */ }
    },
    stopAll: function () {
      this.setEngine(false, 0);
      this.setSiren(false);
    },
  };
})();
