// Web Audio Synthesized Sound Engine for Mechanical Keyboards

export type SoundProfile = 'off' | 'cream-linear' | 'holy-panda' | 'model-m';

export interface SoundSettings {
  profile: SoundProfile;
  volume: number; // 0.0 to 1.0
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private masterGain: GainNode | null = null;
  private profile: SoundProfile = 'off';
  private volume: number = 0.5;

  constructor() {
    try {
      const savedProfile = localStorage.getItem('typeblitz_sound_profile') as SoundProfile;
      if (savedProfile && ['off', 'cream-linear', 'holy-panda', 'model-m'].includes(savedProfile)) {
        this.profile = savedProfile;
      } else {
        this.profile = 'cream-linear';
      }
      const savedVol = localStorage.getItem('typeblitz_sound_volume');
      if (savedVol !== null) {
        this.volume = Math.max(0, Math.min(1, parseFloat(savedVol)));
      }
    } catch {
      this.profile = 'cream-linear';
      this.volume = 0.5;
    }
  }

  private initContext() {
    if (this.ctx && this.ctx.state !== 'closed') {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // Pre-generate a 1-second white/pink noise buffer for reuse
    const bufferSize = this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pinkish noise filter
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Gain compensation
    }
  }

  public getSettings(): SoundSettings {
    return {
      profile: this.profile,
      volume: this.volume
    };
  }

  public setProfile(profile: SoundProfile) {
    this.profile = profile;
    try {
      localStorage.setItem('typeblitz_sound_profile', profile);
    } catch {
      // ignore
    }
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.01);
    }
    try {
      localStorage.setItem('typeblitz_sound_volume', this.volume.toString());
    } catch {
      // ignore
    }
  }

  public playKey(key: string, isError: boolean = false) {
    if (this.profile === 'off') return;

    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Slight random pitch fluctuation (humanized tactile variation)
    const pitchJitter = 0.94 + Math.random() * 0.12;
    const isSpace = key === ' ' || key === 'Space';
    const isBackspace = key === 'Backspace';

    if (isError) {
      this.playErrorSound(now);
      return;
    }

    switch (this.profile) {
      case 'cream-linear':
        this.playCreamLinear(now, pitchJitter, isSpace, isBackspace);
        break;
      case 'holy-panda':
        this.playHolyPanda(now, pitchJitter, isSpace, isBackspace);
        break;
      case 'model-m':
        this.playModelM(now, pitchJitter, isSpace, isBackspace);
        break;
    }
  }

  // Cream Linear: Deep, soft, thocky bottom-out sound
  private playCreamLinear(t: number, jitter: number, isSpace: boolean, isBackspace: boolean) {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const ctx = this.ctx;

    // Base thock frequencies (around 120-280Hz)
    const baseFreq = isSpace ? 110 * jitter : isBackspace ? 140 * jitter : 220 * jitter;
    const duration = isSpace ? 0.055 : 0.038;

    // 1. Sine wave for bottom-out thock resonance
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 1.8, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, t + duration);

    oscGain.gain.setValueAtTime(0.4, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + duration);

    // 2. Soft filtered noise burst for key contact
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isSpace ? 480 : 650, t);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.028);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noiseSource.start(t, Math.random() * 0.5, 0.04);
  }

  // Holy Panda: Tactile bump snap + crisp bottom-out
  private playHolyPanda(t: number, jitter: number, isSpace: boolean, isBackspace: boolean) {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const ctx = this.ctx;

    const baseFreq = isSpace ? 160 * jitter : isBackspace ? 210 * jitter : 320 * jitter;
    const duration = 0.032;

    // 1. Crisp tactile snap (triangle wave)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq * 2.5, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, t + duration);

    oscGain.gain.setValueAtTime(0.35, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + duration);

    // 2. Mid-band snap transient (bandpass noise at 1400Hz)
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400 * jitter, t);
    filter.Q.setValueAtTime(3.0, t);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.32, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.022);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noiseSource.start(t, Math.random() * 0.5, 0.03);
  }

  // IBM Model M / Buckling Spring: Signature metallic ping & clicky mechanical switch
  private playModelM(t: number, jitter: number, isSpace: boolean, isBackspace: boolean) {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const ctx = this.ctx;

    // 1. Sharp high-frequency click transient (3200Hz - 4200Hz)
    const clickNoise = ctx.createBufferSource();
    clickNoise.buffer = this.noiseBuffer;
    const highFilter = ctx.createBiquadFilter();
    highFilter.type = 'highpass';
    highFilter.frequency.setValueAtTime(2800 * jitter, t);

    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.45, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);

    clickNoise.connect(highFilter);
    highFilter.connect(clickGain);
    clickGain.connect(this.masterGain);
    clickNoise.start(t, Math.random() * 0.5, 0.02);

    // 2. Buckling Spring metallic ping resonance (square + bandpass)
    const pingOsc = ctx.createOscillator();
    const pingGain = ctx.createGain();
    pingOsc.type = 'square';
    const springFreq = isSpace ? 1450 * jitter : isBackspace ? 1720 * jitter : 2150 * jitter;
    pingOsc.frequency.setValueAtTime(springFreq, t);

    pingGain.gain.setValueAtTime(0.12, t);
    pingGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    pingOsc.connect(pingGain);
    pingGain.connect(this.masterGain);
    pingOsc.start(t);
    pingOsc.stop(t + 0.04);

    // 3. Clack body
    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(240 * jitter, t);
    bodyOsc.frequency.exponentialRampToValueAtTime(90, t + 0.045);

    bodyGain.gain.setValueAtTime(0.28, t);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(this.masterGain);
    bodyOsc.start(t);
    bodyOsc.stop(t + 0.045);
  }

  // Soft subtle thud for error
  private playErrorSound(t: number) {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.08);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.08);
  }
}

export const soundEngine = new SoundEngine();
