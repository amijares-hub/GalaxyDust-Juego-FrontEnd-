import { useState, useEffect, useCallback, useRef } from 'react';

const AUDIO_MUTED_KEY = 'gd_audio_muted';
const AUDIO_VOLUME_KEY = 'gd_audio_volume';

export const useAudioEngine = () => {
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(AUDIO_MUTED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [volume, setVolumeState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(AUDIO_VOLUME_KEY);
      return saved !== null ? parseFloat(saved) : 0.8;
    } catch {
      return 0.8;
    }
  });

  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const handleAudioEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ isMuted?: boolean; volume?: number }>;
      if (customEvent.detail) {
        if (typeof customEvent.detail.isMuted === 'boolean') {
          setIsMuted(customEvent.detail.isMuted);
        }
        if (typeof customEvent.detail.volume === 'number') {
          setVolumeState(customEvent.detail.volume);
        }
      }
    };

    window.addEventListener('gd_audio_settings_changed', handleAudioEvent);
    return () => window.removeEventListener('gd_audio_settings_changed', handleAudioEvent);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(AUDIO_MUTED_KEY, String(next));
      } catch (err) {
        console.warn('[AUDIO] Error guardando estado de mute:', err);
      }
      window.dispatchEvent(
        new CustomEvent('gd_audio_settings_changed', { detail: { isMuted: next, volume } })
      );
      return next;
    });
  }, [volume]);

  const setMuted = useCallback((muted: boolean) => {
    setIsMuted(muted);
    try {
      localStorage.setItem(AUDIO_MUTED_KEY, String(muted));
    } catch (err) {
      console.warn('[AUDIO] Error guardando estado de mute:', err);
    }
    window.dispatchEvent(
      new CustomEvent('gd_audio_settings_changed', { detail: { isMuted: muted, volume } })
    );
  }, [volume]);

  const setVolume = useCallback((newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolumeState(clamped);
    try {
      localStorage.setItem(AUDIO_VOLUME_KEY, String(clamped));
    } catch (err) {
      console.warn('[AUDIO] Error guardando volumen:', err);
    }
    window.dispatchEvent(
      new CustomEvent('gd_audio_settings_changed', { detail: { isMuted, volume: clamped } })
    );
  }, [isMuted]);

  const playSfx = useCallback((soundOrFreq?: number | string) => {
    if (isMuted || volume <= 0 || soundOrFreq === undefined || soundOrFreq === null) return;

    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      }

      const ctx = audioCtxRef.current;
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      if (typeof soundOrFreq === 'number') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = soundOrFreq > 800 ? 'sine' : soundOrFreq > 400 ? 'triangle' : 'sawtooth';
        osc.frequency.setValueAtTime(soundOrFreq, ctx.currentTime);

        gain.gain.setValueAtTime(volume * 0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.14);
      } else if (typeof soundOrFreq === 'string') {
        if (soundOrFreq.startsWith('http://') || soundOrFreq.startsWith('https://') || soundOrFreq.startsWith('/')) {
          const audio = new Audio(soundOrFreq);
          audio.volume = volume;
          audio.play().catch(() => {});
        } else {
          const sfxMap: Record<string, { freq: number; type: OscillatorType; dur: number }> = {
            laser_success: { freq: 880, type: 'sine', dur: 0.12 },
            click: { freq: 440, type: 'triangle', dur: 0.08 },
            error: { freq: 180, type: 'sawtooth', dur: 0.25 },
            warp: { freq: 1200, type: 'sine', dur: 0.3 }
          };

          const config = sfxMap[soundOrFreq] || { freq: 520, type: 'sine', dur: 0.1 };
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = config.type;
          osc.frequency.setValueAtTime(config.freq, ctx.currentTime);

          gain.gain.setValueAtTime(volume * 0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + config.dur);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start();
          osc.stop(ctx.currentTime + config.dur);
        }
      }
    } catch {
      // Ignorar bloqueos de directiva de autoplay del navegador
    }
  }, [isMuted, volume]);

  return { isMuted, volume, toggleMute, setMuted, setVolume, playSfx };
};

export default useAudioEngine;