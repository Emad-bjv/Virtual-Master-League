/**
 * notificationSound.js
 * Synthesizes crystal alert chimes using the standard Web Audio API (Zero external assets required).
 * Also encapsulates the browser Web Notifications API.
 */

class NotificationSoundService {
  constructor() {
    this.audioCtx = null;
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

  /**
   * Plays a distinct high-priority match kickoff notification chime (D5 -> A5 ascending harmony).
   * Throttled to avoid continuous/looping beeps.
   */
  playMatchAlertChime(force = false) {
    const nowMs = Date.now();
    if (!force && this.lastPlayed && nowMs - this.lastPlayed < 30000) {
      return; // Do not replay chime within 30 seconds
    }
    this.lastPlayed = nowMs;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Note 1: 587.33 Hz (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.35, now + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2: 880.00 Hz (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.0, now + 0.15);
      gain2.gain.setValueAtTime(0, now + 0.15);
      gain2.gain.linearRampToValueAtTime(0.4, now + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.65);
    } catch (e) {
      console.warn('Web Audio playback failed or blocked by browser gesture policy:', e);
    }
  }

  /**
   * Requests browser notification permission if not yet decided.
   */
  async requestPermission() {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'default') {
      try {
        return await Notification.requestPermission();
      } catch (_e) {
        return Notification.permission;
      }
    }
    return Notification.permission;
  }

  /**
   * Dispatches a native OS browser notification.
   */
  sendBrowserNotification(title, options = {}) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return null;

    try {
      return new Notification(title, {
        icon: '/assets/logo.png',
        badge: '/assets/logo.png',
        dir: 'rtl',
        lang: 'fa',
        ...options,
      });
    } catch (e) {
      console.warn('Failed to dispatch native notification:', e);
      return null;
    }
  }
}

export const notificationSoundService = new NotificationSoundService();
export default notificationSoundService;
