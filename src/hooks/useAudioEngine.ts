import { useCallback } from 'react';

export interface AudioSettings {
  master: number; // 0 - 100
  bgm: number;    // 0 - 100
  sfx: number;    // 0 - 100
}

let sharedAudioCtx: AudioContext | null = null;

export function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioCtx) {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (Ctx) {
      sharedAudioCtx = new Ctx();
    }
  }
  return sharedAudioCtx;
}

export const unlockAudioContext = () => {
  try {
    const ctx = getSharedAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  } catch {}
};

// Desbloqueo pasivo global al primer gesto táctil o clic
if (typeof window !== 'undefined') {
  const handleFirstInteraction = () => {
    unlockAudioContext();
    window.removeEventListener('click', handleFirstInteraction);
    window.removeEventListener('touchstart', handleFirstInteraction);
  };
  window.addEventListener('click', handleFirstInteraction, { once: true, passive: true });
  window.addEventListener('touchstart', handleFirstInteraction, { once: true, passive: true });
}

export function getAudioSettings(): AudioSettings {
  try {
    const master = localStorage.getItem('gd_audio_master');
    const bgm = localStorage.getItem('gd_audio_bgm');
    const sfx = localStorage.getItem('gd_audio_sfx');
    return {
      master: master !== null ? Math.max(0, Math.min(100, Number(master))) : 80,
      bgm: bgm !== null ? Math.max(0, Math.min(100, Number(bgm))) : 40,
      sfx: sfx !== null ? Math.max(0, Math.min(100, Number(sfx))) : 80,
    };
  } catch {
    return { master: 80, bgm: 40, sfx: 80 };
  }
}

export function saveAudioSettings(settings: Partial<AudioSettings>) {
  try {
    if (settings.master !== undefined) localStorage.setItem('gd_audio_master', String(Math.round(settings.master)));
    if (settings.bgm !== undefined) localStorage.setItem('gd_audio_bgm', String(Math.round(settings.bgm)));
    if (settings.sfx !== undefined) localStorage.setItem('gd_audio_sfx', String(Math.round(settings.sfx)));
  } catch {}
}

export function useAudioEngine() {
  const playSfx = useCallback((freqOrSound: number | string = 660) => {
    try {
      const { master, sfx } = getAudioSettings();
      const factor = (master / 100) * (sfx / 100);
      if (factor <= 0.001) return; // Mute

      if (typeof freqOrSound === 'string') {
        const audio = new Audio();
        audio.src = freqOrSound === 'heavy_laser'
          ? "https://assets.mixkit.co/active_storage/sfx/2759/2759-84.wav"
          : "https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav";
        audio.volume = Math.min(1, Math.max(0, 0.25 * factor));
        audio.play().catch(() => {});
      } else {
        const ctx = getSharedAudioContext();
        if (!ctx) return;
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freqOrSound, ctx.currentTime);
        const peakGain = 0.12 * factor;
        gain.gain.setValueAtTime(peakGain, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch (_) {}
  }, []);

  return { playSfx, getAudioSettings, saveAudioSettings, unlockAudioContext };
}

