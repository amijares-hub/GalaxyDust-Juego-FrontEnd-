import { useState, useEffect, useCallback, useRef } from 'react';

const AUDIO_MUTED_KEY = 'gd_audio_muted';
const AUDIO_VOLUME_KEY = 'gd_audio_volume';

// 🎵 URL oficial de la música de fondo de GalaxyDust
export const DEFAULT_BGM_URL = 'https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Background%20music/GD%20MainMenu%201.0.mp3';

export const useAudioEngine = (defaultBgmUrl: string = DEFAULT_BGM_URL) => {
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
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);

  // 1. INICIALIZAR BGM CON AUTOSTART AL PRIMER CLIC (BYPASS AUTOPLAY)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!bgMusicRef.current) {
      const bgAudio = new Audio(defaultBgmUrl);
      bgAudio.loop = true;
      bgAudio.preload = 'auto';
      bgAudio.volume = isMuted ? 0 : volume * 0.5;
      bgMusicRef.current = bgAudio;
    }

    const audio = bgMusicRef.current;

    const startAudio = () => {
      if (!isMuted && audio.paused) {
        audio.play().catch(() => {});
      }
    };

    // Intento directo
    startAudio();

    // Desbloqueo universal al primer clic o pulsación del jugador
    const unlockListener = () => {
      startAudio();
      window.removeEventListener('pointerdown', unlockListener);
      window.removeEventListener('keydown', unlockListener);
    };

    window.addEventListener('pointerdown', unlockListener);
    window.addEventListener('keydown', unlockListener);

    return () => {
      window.removeEventListener('pointerdown', unlockListener);
      window.removeEventListener('keydown', unlockListener);
    };
  }, [defaultBgmUrl, isMuted, volume]);

  // 2. SINCRONIZAR VOLUMEN EN VIVO
  useEffect(() => {
    if (bgMusicRef.current) {
      bgMusicRef.current.muted = isMuted;
      bgMusicRef.current.volume = isMuted ? 0 : volume * 0.5;
    }
  }, [isMuted, volume]);

  const playBgMusic = useCallback((customUrl?: string) => {
    if (!bgMusicRef.current) return;
    if (customUrl && bgMusicRef.current.src !== customUrl) {
      bgMusicRef.current.src = customUrl;
    }
    bgMusicRef.current.muted = isMuted;
    bgMusicRef.current.volume = isMuted ? 0 : volume * 0.5;
    bgMusicRef.current.play().catch(() => {});
  }, [isMuted, volume]);

  const stopBgMusic = useCallback(() => {
    if (bgMusicRef.current) {
      bgMusicRef.current.pause();
    }
  }, []);

  // 3. LISTENERS GLOBALES
  useEffect(() => {
    const handlePlayMusic = (e: Event) => {
      const customEvent = e as CustomEvent<{ url?: string }>;
      playBgMusic(customEvent.detail?.url);
    };

    const handleStopMusic = () => stopBgMusic();

    const handleAudioEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ isMuted?: boolean; volume?: number }>;
      if (customEvent.detail) {
        if (typeof customEvent.detail.isMuted === 'boolean') setIsMuted(customEvent.detail.isMuted);
        if (typeof customEvent.detail.volume === 'number') setVolumeState(customEvent.detail.volume);
      }
    };

    window.addEventListener('gd_play_bg_music', handlePlayMusic);
    window.addEventListener('gd_stop_bg_music', handleStopMusic);
    window.addEventListener('gd_audio_settings_changed', handleAudioEvent);

    return () => {
      window.removeEventListener('gd_play_bg_music', handlePlayMusic);
      window.removeEventListener('gd_stop_bg_music', handleStopMusic);
      window.removeEventListener('gd_audio_settings_changed', handleAudioEvent);
    };
  }, [playBgMusic, stopBgMusic]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      try { localStorage.setItem(AUDIO_MUTED_KEY, String(next)); } catch {}
      window.dispatchEvent(new CustomEvent('gd_audio_settings_changed', { detail: { isMuted: next, volume } }));
      return next;
    });
  }, [volume]);

  const setMuted = useCallback((muted: boolean) => {
    setIsMuted(muted);
    try { localStorage.setItem(AUDIO_MUTED_KEY, String(muted)); } catch {}
    window.dispatchEvent(new CustomEvent('gd_audio_settings_changed', { detail: { isMuted: muted, volume } }));
  }, [volume]);

  const setVolume = useCallback((newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolumeState(clamped);
    try { localStorage.setItem(AUDIO_VOLUME_KEY, String(clamped)); } catch {}
    window.dispatchEvent(new CustomEvent('gd_audio_settings_changed', { detail: { isMuted, volume: clamped } }));
  }, [isMuted]);

  // SFX sintetizados
  const playSfx = useCallback((soundOrFreq?: number | string) => {
    if (isMuted || volume <= 0 || soundOrFreq === undefined || soundOrFreq === null) return;
    try {
      if (!audioCtxRef.current) {
        const AudioClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioClass) audioCtxRef.current = new AudioClass();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

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
        if (soundOrFreq.startsWith('http') || soundOrFreq.startsWith('/')) {
          const a = new Audio(soundOrFreq);
          a.volume = volume;
          a.play().catch(() => {});
        }
      }
    } catch {}
  }, [isMuted, volume]);

  return { isMuted, volume, toggleMute, setMuted, setVolume, playSfx, playBgMusic, stopBgMusic };
};

export default useAudioEngine;