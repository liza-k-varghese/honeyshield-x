class HorologyAcoustics {
  private ctx: AudioContext | null = null;
  private isMuted = true;
  private timer: number | null = null;
  private isHighBeat = false;

  public toggleMute(): boolean {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isMuted = !this.isMuted;

    if (!this.isMuted) {
      this.startTicking();
    } else {
      this.stopTicking();
    }

    return !this.isMuted;
  }

  public getStatus(): boolean {
    return !this.isMuted;
  }

  private startTicking() {
    if (this.timer) clearInterval(this.timer);
    // 4Hz = 28,800 vph = 8 ticks per second = 125ms per impulse
    this.timer = window.setInterval(() => {
      this.playTickImpulse();
    }, 125);
  }

  private stopTicking() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private playTickImpulse() {
    if (this.isMuted || !this.ctx) return;

    const t = this.ctx.currentTime;
    this.isHighBeat = !this.isHighBeat;

    // Dual pallet acoustic tone (Tick has slightly higher resonance than Tack)
    const baseFreq = this.isHighBeat ? 3800 : 3200;

    // 1. High frequency jewel impact ping
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.015);

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.025);

    // 2. Escapement metal click (white noise burst)
    const bufferSize = this.ctx.sampleRate * 0.012;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2500, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.04, t);
    noiseGain.gain.linearRampToValueAtTime(0.0001, t + 0.012);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noise.start(t);
  }
}

export const horologyAudio = new HorologyAcoustics();
