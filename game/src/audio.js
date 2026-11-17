// WebAudio synthesis only — no audio files. Engine hum, sirens, gunshots,
// pickup chimes and a mission-complete jingle, all generated in code.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.muted = false;
  }

  // Browsers require a user gesture before audio; call from any input.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);

      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 50;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = 320;
      this.engineOsc.connect(filt);
      filt.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();

      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'sine';
      this.sirenOsc.frequency.value = 700;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.master);
      this.sirenOsc.start();
      this.sirenPhase = 0;
    } catch (err) {
      this.ctx = null;
    }
  }

  // speedRatio 0..1 while driving; 0 silences the hum.
  setEngine(speedRatio, driving) {
    if (!this.ctx || !this.engineOsc) return;
    const t = this.ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(driving ? 0.05 + 0.06 * speedRatio : 0, t, 0.08);
    this.engineOsc.frequency.setTargetAtTime(48 + 110 * speedRatio, t, 0.08);
  }

  // Call every frame; wails while wanted > 0.
  setSiren(wanted, dt) {
    if (!this.ctx || !this.sirenOsc) return;
    const t = this.ctx.currentTime;
    if (wanted > 0) {
      this.sirenPhase = (this.sirenPhase || 0) + dt * 2.2;
      const f = 650 + 260 * Math.sin(this.sirenPhase * Math.PI * 2);
      this.sirenOsc.frequency.setTargetAtTime(f, t, 0.05);
      this.sirenGain.gain.setTargetAtTime(0.045, t, 0.2);
    } else {
      this.sirenGain.gain.setTargetAtTime(0, t, 0.2);
    }
  }

  _blip(freq, dur, type, vol, slideTo) {
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (err) { /* audio is decoration; never break the game */ }
  }

  _noise(dur, vol, lowpass) {
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = lowpass || 1800;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(filt); filt.connect(g); g.connect(this.master);
      src.start(t);
    } catch (err) { /* ignore */ }
  }

  shot() { this._noise(0.14, 0.5, 2600); this._blip(160, 0.08, 'square', 0.18, 60); }
  enemyShot() { this._noise(0.11, 0.28, 1800); }
  thud() { this._noise(0.12, 0.4, 500); this._blip(90, 0.12, 'sine', 0.3, 45); }
  pickup() { this._blip(660, 0.1, 'sine', 0.25); setTimeout(() => this._blip(990, 0.16, 'sine', 0.25), 90); }
  denied() { this._blip(180, 0.16, 'square', 0.2, 120); }
  jingle() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => setTimeout(() => this._blip(f, 0.22, 'triangle', 0.3), i * 110));
  }
}
