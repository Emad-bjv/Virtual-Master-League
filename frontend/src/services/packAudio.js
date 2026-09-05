/**
 * Synthesizes cinematic EA Sports FC 26 pack opening audio effects
 * using the standard Web Audio API (Zero external assets required).
 */
class PackAudioSynthesizer {
  constructor() {
    this.audioCtx = null;
    this.isMuted = false;
    try {
      const stored = localStorage.getItem('vml_pack_audio_muted');
      if (stored !== null) {
        this.isMuted = stored === 'true';
      }
    } catch (_e) {}
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('vml_pack_audio_muted', String(this.isMuted));
    } catch (_e) {}
    return this.isMuted;
  }

  /**
   * Tension Riser (Opening anticipation)
   */
  playTensionRiser(duration = 1.2) {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Low swell oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(65, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + duration);

      // Low-pass filter rising
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.exponentialRampToValueAtTime(1200, now + duration);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.22, now + duration * 0.8);
      gain.gain.linearRampToValueAtTime(0.01, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (_e) {}
  }

  /**
   * Step 1: Position Reveal (Sub-bass slam + metallic strike)
   */
  playPositionSlam() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Sub-bass punch
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(140, now);
      sub.frequency.exponentialRampToValueAtTime(38, now + 0.35);

      subGain.gain.setValueAtTime(0.4, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      sub.connect(subGain);
      subGain.connect(ctx.destination);
      sub.start(now);
      sub.stop(now + 0.5);

      // Neon metallic ping
      const ping = ctx.createOscillator();
      const pingGain = ctx.createGain();
      ping.type = 'triangle';
      ping.frequency.setValueAtTime(520, now);
      ping.frequency.exponentialRampToValueAtTime(440, now + 0.3);

      pingGain.gain.setValueAtTime(0.2, now);
      pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      ping.connect(pingGain);
      pingGain.connect(ctx.destination);
      ping.start(now);
      ping.stop(now + 0.4);
    } catch (_e) {}
  }

  /**
   * Step 2: OVR Rating Slam (Heavy punch + dramatic octave riser)
   */
  playOvrImpact() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Heavy resonant kick
      const kick = ctx.createOscillator();
      const kickGain = ctx.createGain();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(180, now);
      kick.frequency.exponentialRampToValueAtTime(45, now + 0.4);

      kickGain.gain.setValueAtTime(0.5, now);
      kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      kick.connect(kickGain);
      kickGain.connect(ctx.destination);
      kick.start(now);
      kick.stop(now + 0.6);

      // Gold brass chime
      [587.33, 739.99, 880.00].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + i * 0.05);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, now);

        gain.gain.setValueAtTime(0.12, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5 + i * 0.05);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.05);
        osc.stop(now + 0.6);
      });
    } catch (_e) {}
  }

  /**
   * Step 3: Nationality Fanfare (Anthem fanfare chime)
   */
  playNationalityFanfare() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Rising tri-tone fanfare
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + idx * 0.08;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.18, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.5);
      });
    } catch (_e) {}
  }

  /**
   * Step 4: Card Slam Explosion & Stadium Celebration
   */
  playCardDropExplosion() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // 1. Massive sub-bass drop
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(220, now);
      sub.frequency.exponentialRampToValueAtTime(28, now + 0.8);

      subGain.gain.setValueAtTime(0.7, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      sub.connect(subGain);
      subGain.connect(ctx.destination);
      sub.start(now);
      sub.stop(now + 1.2);

      // 2. White noise burst (stadium fireworks / flare roar)
      const bufferSize = ctx.sampleRate * 0.8;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(1000, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(300, now + 0.8);
      noiseFilter.Q.setValueAtTime(1.5, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.28, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      whiteNoise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.8);

      // 3. Celebratory crystalline sparkle arpeggio
      const sparkles = [880, 1108.73, 1318.51, 1760];
      sparkles.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const sTime = now + 0.15 + idx * 0.07;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, sTime);

        gain.gain.setValueAtTime(0.15, sTime);
        gain.gain.exponentialRampToValueAtTime(0.001, sTime + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(sTime);
        osc.stop(sTime + 0.65);
      });
    } catch (_e) {}
  }
}

export const packAudio = new PackAudioSynthesizer();
export default packAudio;
