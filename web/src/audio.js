// 全部音效由 Web Audio API 实时合成，无外部音频资源。
export class AudioManager {
  constructor() {
    this.context = null;
    this.master = null;
    this.enabled = true;
    this.lastShot = 0;
  }

  init() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.context = new Ctx();
    this.master = this.context.createGain();
    this.master.gain.value = 0.34;
    this.master.connect(this.context.destination);
  }

  resume() {
    if (this.context && this.context.state === 'suspended') this.context.resume();
  }

  noiseBurst(duration, volume, filterFreq, decayType = 'exponential') {
    if (!this.context || !this.enabled) return;
    const now = this.context.currentTime;
    const frames = Math.max(1, Math.floor(this.context.sampleRate * duration));
    const buffer = this.context.createBuffer(1, frames, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(volume, now);
    if (decayType === 'exponential') {
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    } else {
      gain.gain.linearRampToValueAtTime(0, now + duration);
    }
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(now);
    source.stop(now + duration);
  }

  tone(freq, duration, volume, type = 'square') {
    if (!this.context || !this.enabled) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + duration);
  }

  gunshot() {
    const now = performance.now();
    if (now - this.lastShot < 40) return;
    this.lastShot = now;
    this.noiseBurst(0.16, 0.85, 2600);
    this.tone(120, 0.08, 0.24, 'sawtooth');
  }

  dryFire() {
    this.tone(980, 0.05, 0.12, 'square');
  }

  reload() {
    this.tone(240, 0.06, 0.12, 'square');
    setTimeout(() => this.tone(420, 0.06, 0.12, 'square'), 500);
    setTimeout(() => this.tone(620, 0.06, 0.12, 'square'), 1100);
  }

  headbutt() {
    this.tone(110, 0.18, 0.42, 'sawtooth');
    this.noiseBurst(0.22, 0.42, 700, 'linear');
  }

  hit() {
    this.noiseBurst(0.06, 0.28, 2200);
    this.tone(680, 0.08, 0.18, 'triangle');
  }

  wolfHurt() {
    this.tone(330, 0.16, 0.18, 'sawtooth');
  }

  snakeHiss() {
    this.noiseBurst(0.42, 0.18, 5000);
  }

  playerHurt() {
    this.tone(90, 0.22, 0.32, 'sawtooth');
    this.noiseBurst(0.14, 0.26, 900);
  }

  jump() {
    this.tone(160, 0.18, 0.08, 'triangle');
  }

  land() {
    this.noiseBurst(0.08, 0.12, 700);
  }

  win() {
    [523, 659, 784, 1046].forEach((freq, i) => {
      setTimeout(() => this.tone(freq, 0.34, 0.2, 'triangle'), i * 130);
    });
  }

  lose() {
    [320, 240, 160, 90].forEach((freq, i) => {
      setTimeout(() => this.tone(freq, 0.34, 0.24, 'sawtooth'), i * 170);
    });
  }
}
