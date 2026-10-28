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

  // 1. INICIALIZAR ELEMENTO DE MÚSICA DE FONDO (BGM)
  useEffect(() => {
    if (!bgMusicRef.current && typeof window !== 'undefined') {
      const bgAudio = new Audio(defaultBgmUrl);
      bgAudio.loop = true;
      bgAudio.preload = 'auto';
      bgAudio.volume = isMuted ? 0 : volume * 0.5;
      bgMusicRef.current = bgAudio;
    }

    return () => {
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        bgMusicRef.current = null;
      }
    };
  }, [defaultBgmUrl]);

  // 2. SINCRONIZAR VOLUMEN Y SILENCIO EN TIEMPO REAL
  useEffect(() => {
    if (bgMusicRef.current) {
      bgMusicRef.current.muted = isMuted;
      bgMusicRef.current.volume = isMuted ? 0 : volume * 0.5;
    }
  }, [isMuted, volume]);

  // 3. REPRODUCIR MÚSICA DE FONDO CON BYPASS DE POLÍTICA AUTOPLAY
  const playBgMusic = useCallback((customUrl?: string) => {
    if (!bgMusicRef.current) return;

    if (customUrl && bgMusicRef.current.src !== customUrl) {
      bgMusicRef.current.src = customUrl;
    }

    const audio = bgMusicRef.current;
    audio.muted = isMuted;
    audio.volume = isMuted ? 0 : volume * 0.5;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Si el navegador bloquea el autoplay antes de la interacción del jugador,
        // se activa al primer clic o pulsación en cualquier parte de la pantalla
        const unlockAudio = () => {
          audio.play().catch(() => {});
          window.removeEventListener('click', unlockAudio);
          window.removeEventListener('touchstart', unlockAudio);
          window.removeEventListener('keydown', unlockAudio);
        };
        window.addEventListener('click', unlockAudio, { once: true });
        window.addEventListener('touchstart', unlockAudio, { once: true });
        window.addEventListener('keydown', unlockAudio, { once: true });
      });
    }
  }, [isMuted, volume]);

  // 4. DETENER MÚSICA DE FONDO
  const stopBgMusic = useCallback(() => {
    if (bgMusicRef.current) {
      bgMusicRef.current.pause();
      bgMusicRef.current.currentTime = 0;
    }
  }, []);

  // 5. ESCUCHADORES DE EVENTOS GLOBALES
  useEffect(() => {
    const handlePlayMusic = (e: Event) => {
      const customEvent = e as CustomEvent<{ url?: string }>;
      playBgMusic(customEvent.detail?.url);
    };

    const handleStopMusic = () => {
      stopBgMusic();
    };

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

  // 6. EFECTOS DE SONIDO (SFX)
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
      // Directiva de autoplay
    }
  }, [isMuted, volume]);

  return { isMuted, volume, toggleMute, setMuted, setVolume, playSfx, playBgMusic, stopBgMusic };
};

export default useAudioEngine;