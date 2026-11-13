class TassiliAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private droneOsc: OscillatorNode | null = null;
  private musicTimer: number | null = null;
  private muted = false;
  private musicEnabled = true;
  private musicVolume = 0.35;
  private sfxVolume = 0.55;
  private noteStep = 0;

  // Hijaz-inspired dark cavern scale (D3, Eb3, F#3, G3, A3, Bb3, C#4, D4)
  private readonly scaleHz = [146.83, 155.56, 185.0, 196.0, 220.0, 233.08, 277.18, 293.66];
  private readonly melodyPattern = [0, 3, 2, 1, 0, 4, 3, 2, 5, 4, 3, 2, 1, 0, -1, 0];

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.masterGain || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 1, now, 0.04);
    this.musicGain.gain.setTargetAtTime(this.musicEnabled ? this.musicVolume : 0, now, 0.08);
    this.sfxGain.gain.setTargetAtTime(this.sfxVolume, now, 0.04);
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyVolumes();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMusicVolume(v: number): void {
    this.musicVolume = Math.max(0, Math.min(1, v));
    this.applyVolumes();
  }

  public setSfxVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    this.applyVolumes();
  }

  public getVolumes() {
    return { muted: this.muted, musicVolume: this.musicVolume, sfxVolume: this.sfxVolume };
  }

  public startAmbientMusic(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.musicGain) return;

    if (!this.droneOsc) {
      const osc = ctx.createOscillator();
      const droneGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = 'triangle';
      osc.frequency.value = 73.42; // D2 deep cavern resonance
      filter.type = 'lowpass';
      filter.frequency.value = 210;
      droneGain.gain.value = 0.22;

      osc.connect(filter);
      filter.connect(droneGain);
      droneGain.connect(this.musicGain);
      osc.start();
      this.droneOsc = osc;
    }

    if (this.musicTimer === null) {
      this.musicTimer = window.setInterval(() => {
        if (this.muted || !this.ctx || this.ctx.state !== 'running' || !this.musicGain) return;
        const idx = this.melodyPattern[this.noteStep % this.melodyPattern.length];
        this.noteStep++;
        if (idx < 0) return;
        const freq = this.scaleHz[idx];
        this.playCavernNote(freq, 0.65);
      }, 620);
    }
  }

  public stopAmbientMusic(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.droneOsc) {
      try {
        this.droneOsc.stop();
        this.droneOsc.disconnect();
      } catch {
        // ignore
      }
      this.droneOsc = null;
    }
  }

  private playCavernNote(freq: number, duration: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    filter.type = 'lowpass';
    filter.frequency.value = 900;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    volume = 0.25
  ): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(25, freqEnd), now + duration);
    }

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  public menuHover(): void {
    this.playTone(440, 520, 0.05, 'triangle', 0.12);
  }

  public menuClick(): void {
    this.playTone(320, 640, 0.11, 'square', 0.14);
  }

  public jump(): void {
    this.playTone(190, 420, 0.14, 'square', 0.14);
  }

  public attack(): void {
    this.playTone(540, 140, 0.11, 'sawtooth', 0.16);
  }

  public hurt(): void {
    this.playTone(160, 55, 0.24, 'sawtooth', 0.28);
  }

  public heal(): void {
    this.playTone(392, 587, 0.22, 'sine', 0.22);
    setTimeout(() => this.playTone(587, 784, 0.26, 'sine', 0.2), 110);
  }

  public lever(): void {
    this.playTone(110, 82, 0.28, 'sawtooth', 0.22);
  }

  public switchPulse(): void {
    this.playTone(330, 495, 0.16, 'triangle', 0.18);
  }

  public doorOpen(): void {
    this.playTone(98, 146, 0.45, 'triangle', 0.28);
    setTimeout(() => this.playTone(220, 440, 0.35, 'sine', 0.22), 160);
    setTimeout(() => this.playTone(293, 587, 0.45, 'sine', 0.22), 300);
  }

  public plateBlessing(): void {
    const notes = [293.66, 369.99, 440.0, 587.33];
    notes.forEach((f, idx) => {
      setTimeout(() => this.playTone(f, f * 1.01, 0.3, 'triangle', 0.22), idx * 95);
    });
  }

  public signalPing(): void {
    this.playTone(660, 880, 0.12, 'sine', 0.18);
  }

  public schoolBell(): void {
    this.playTone(784, 784, 0.25, 'triangle', 0.16);
    setTimeout(() => this.playTone(659, 659, 0.3, 'triangle', 0.16), 240);
  }

  public fabricRip(): void {
    this.playTone(580, 130, 0.18, 'sawtooth', 0.25);
    setTimeout(() => this.playTone(390, 95, 0.14, 'square', 0.18), 70);
  }

  public dramaticSting(): void {
    this.playTone(146.83, 140, 0.55, 'sawtooth', 0.24);
    this.playTone(207.65, 200, 0.55, 'triangle', 0.22);
    setTimeout(() => this.playTone(293.66, 277.18, 0.5, 'square', 0.16), 90);
  }
}

export const soundFX = new TassiliAudioEngine();
