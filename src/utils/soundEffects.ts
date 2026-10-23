/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * High-precision, zero-asset Web Audio synthesizer for tactile micro-interactions.
 * Produces physical-touch clicks, pops, switch ticks, and confirmation chimes.
 */

const STORAGE_MUTE_KEY = 'shopledger_v3_sound_muted';

let audioCtx: AudioContext | null = null;
let isMuted: boolean = (() => {
  try {
    return localStorage.getItem(STORAGE_MUTE_KEY) === 'true';
  } catch {
    return false;
  }
})();

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {
      // Audio resume will succeed on subsequent user gestures
    });
  }
  return audioCtx;
}

export function isSoundMuted(): boolean {
  return isMuted;
}

export function toggleSoundMuted(): boolean {
  isMuted = !isMuted;
  try {
    localStorage.setItem(STORAGE_MUTE_KEY, String(isMuted));
  } catch {
    // Ignore storage errors
  }
  if (!isMuted) {
    playTactilePop();
  }
  return isMuted;
}

export function setSoundMuted(muted: boolean): void {
  isMuted = muted;
  try {
    localStorage.setItem(STORAGE_MUTE_KEY, String(muted));
  } catch {
    // Ignore
  }
}

/**
 * Physical tactile click (button press)
 */
export function playTactileClick(): void {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.025);

    gain.gain.setValueAtTime(0.045, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.025);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.03);
  } catch {
    // Silent fallback
  }
}

/**
 * Organic soft bubble/pop (tab switch, chip select)
 */
export function playTactilePop(): void {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(360, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(740, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  } catch {
    // Silent fallback
  }
}

/**
 * Crisp tick for switches or dropdown toggles
 */
export function playTactileSwitch(): void {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.015);

    gain.gain.setValueAtTime(0.03, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.018);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.02);
  } catch {
    // Silent fallback
  }
}

/**
 * Harmonious dual-tone confirmation chime
 */
export function playTactileSuccess(): void {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [
      { freq: 587.33, delay: 0, dur: 0.12 },
      { freq: 880.0, delay: 0.08, dur: 0.2 },
    ].forEach(({ freq, delay, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0.05, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + dur);
    });
  } catch {
    // Silent fallback
  }
}

/**
 * Subtle low-pitch warning bump
 */
export function playTactileWarning(): void {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.08);

    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  } catch {
    // Silent fallback
  }
}

export type SoundEffectType = 'click' | 'pop' | 'switch' | 'tick' | 'chime' | 'success' | 'warning';

export function playTactileSound(type: SoundEffectType): void {
  switch (type) {
    case 'click':
      playTactileClick();
      break;
    case 'pop':
      playTactilePop();
      break;
    case 'switch':
    case 'tick':
      playTactileSwitch();
      break;
    case 'chime':
    case 'success':
      playTactileSuccess();
      break;
    case 'warning':
      playTactileWarning();
      break;
  }
}

export function playSound(type: SoundEffectType): void {
  playTactileSound(type);
}

