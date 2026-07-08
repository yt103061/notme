// 依存なしの軽量 WebAudio 効果音。AudioContext はユーザー操作後に遅延生成する。

type SoundName = 'flip' | 'fold' | 'stay' | 'exchange' | 'win' | 'lose' | 'tap';

class Sfx {
  private ctx: AudioContext | null = null;
  private muted = false;

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private tone(freq: number, duration: number, type: OscillatorType = 'sine', gainPeak = 0.15) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(gainPeak, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  play(name: SoundName) {
    switch (name) {
      case 'tap':
        this.tone(520, 0.06, 'triangle', 0.08);
        break;
      case 'flip':
        this.tone(660, 0.1, 'triangle');
        break;
      case 'stay':
        this.tone(440, 0.12, 'sine');
        break;
      case 'fold':
        this.tone(220, 0.18, 'sine', 0.1);
        break;
      case 'exchange':
        this.tone(880, 0.08, 'square', 0.06);
        setTimeout(() => this.tone(660, 0.08, 'square', 0.06), 90);
        break;
      case 'win':
        this.tone(523, 0.12);
        setTimeout(() => this.tone(659, 0.12), 100);
        setTimeout(() => this.tone(784, 0.2), 200);
        break;
      case 'lose':
        this.tone(300, 0.15, 'sawtooth', 0.08);
        setTimeout(() => this.tone(220, 0.25, 'sawtooth', 0.08), 120);
        break;
    }
  }
}

export const sfx = new Sfx();
