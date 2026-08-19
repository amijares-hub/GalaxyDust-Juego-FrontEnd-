import { useCallback } from 'react';

export function useAudioEngine() {
  const playSfx = useCallback((freqOrSound: number | string = 660) => {
    try {
      if (typeof freqOrSound === 'string') {
        const sfx = new Audio();
        sfx.src = freqOrSound === 'heavy_laser'
          ? "https://assets.mixkit.co/active_storage/sfx/2759/2759-84.wav"
          : "https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav";
        sfx.volume = 0.15;
        sfx.play().catch(() => {});
      } else {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freqOrSound, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch (_) {}
  }, []);

  return { playSfx };
}
