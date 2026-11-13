import { useState, useEffect, useCallback } from 'react';

const AUDIO_MUTED_KEY = 'gd_audio_muted';
const AUDIO_VOLUME_KEY = 'gd_audio_volume';

// 🎵 URL oficial de la música de fondo de GalaxyDust (alojada en Supabase Storage)
export const DEFAULT_BGM_URL =
  'https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Background%20music/GD%20MainMenu%201.0.mp3';

// ── SINGLETON GLOBAL DE AUDIO (COMPARTIDO POR TODA LA APP) ──
let globalAudioCtx: AudioContext | null = null;
let globalBgAudio: HTMLAudioElement | null = null;
let isAudioUnlocked = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!globalAudioCtx) {
    const AudioClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioClass) {
      globalAudioCtx = new AudioClass();
    }
  }
  return globalAudioCtx;
}

function getBgAudio(url: string = DEFAULT_BGM_URL): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!globalBgAudio) {
    globalBgAudio = new Audio(url);
    globalBgAudio.loop = true;
    globalBgAudio.preload = 'auto';

    // Diagnóstico de carga de audio
    globalBgAudio.addEventListener('error', (e) => {
      console.error('[GD_AUDIO_ENGINE] Error al cargar BGM:', e, globalBgAudio?.error);
    });

    globalBgAudio.addEventListener('canplay', () => {
      console.log('[GD_AUDIO_ENGINE] BGM listo para reproducción');
    });
  }
  return globalBgAudio;
}

// ── DESBLOQUEADOR GLOBAL DE AUTOPLAY (POINTERDOWN / KEYDOWN / CLICK) ──
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    isAudioUnlocked = true;

    // 1. Resumir AudioContext si estaba suspendido
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => {
        console.log('[GD_AUDIO_ENGINE] AudioContext desbloqueado con éxito');
      }).catch((err) => {
        console.warn('[GD_AUDIO_ENGINE] No se pudo resumir AudioContext:', err);
      });
    }

    // 2. Intentar reproducir música si no está silenciada
    let muted = false;
    let vol = 0.8;
    try {
      muted = localStorage.getItem(AUDIO_MUTED_KEY) === 'true';
      const savedVol = localStorage.getItem(AUDIO_VOLUME_KEY);
      if (savedVol !== null) vol = parseFloat(savedVol);
    } catch {}

    const bg = getBgAudio();
    if (bg && !muted && vol > 0 && bg.paused) {
      bg.muted = false;
      bg.volume = vol * 0.5;
      bg.play().then(() => {
        console.log('[GD_AUDIO_ENGINE] BGM iniciado por interacción del usuario');
      }).catch((err) => {
        console.warn('[GD_AUDIO_ENGINE] BGM play diferido:', err);
      });
    }

    // Remover listeners una vez desbloqueado con éxito
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('click', unlockAudio);
  };

  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
  window.addEventListener('click', unlockAudio, { passive: true });
}

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

  // 1. SINCRONIZAR BGM ELEMENT
  useEffect(() => {
    const bg = getBgAudio(defaultBgmUrl);
    if (!bg) return;

    bg.muted = isMuted;
    bg.volume = isMuted ? 0 : volume * 0.5;

    // Si ya hubo interacción previa y no está silenciado, intentar play
    if (isAudioUnlocked && !isMuted && volume > 0 && bg.paused) {
      bg.play().catch(() => {});
    }
  }, [defaultBgmUrl, isMuted, volume]);

  const playBgMusic = useCallback((customUrl?: string) => {
    const bg = getBgAudio(customUrl || defaultBgmUrl);
    if (!bg) return;

    if (customUrl && bg.src !== customUrl) {
      bg.src = customUrl;
    }

    bg.muted = isMuted;
    bg.volume = isMuted ? 0 : volume * 0.5;

    // Resumir AudioContext paralelamente
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if (!isMuted && volume > 0) {
      bg.play().catch((err) => {
        console.warn('[GD_AUDIO_ENGINE] Autoplay pendiente de interacción:', err);
      });
    }
  }, [defaultBgmUrl, isMuted, volume]);

  const stopBgMusic = useCallback(() => {
    const bg = getBgAudio();
    if (bg) {
      bg.pause();
    }
  }, []);

  // 2. LISTENERS GLOBALES ENTRE VENTANAS / COMPONENTES
  useEffect(() => {
    const handlePlayMusic = (e: Event) => {
      const customEvent = e as CustomEvent<{ url?: string }>;
      playBgMusic(customEvent.detail?.url);
    };

    const handleStopMusic = () => stopBgMusic();

    const handleAudioEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ isMuted?: boolean; volume?: number }>;
      if (customEvent.detail) {
        if (typeof customEvent.detail.isMuted === 'boolean') {
          setIsMuted(customEvent.detail.isMuted);
          const bg = getBgAudio();
          if (bg) bg.muted = customEvent.detail.isMuted;
        }
        if (typeof customEvent.detail.volume === 'number') {
          setVolumeState(customEvent.detail.volume);
          const bg = getBgAudio();
          if (bg) bg.volume = customEvent.detail.volume * 0.5;
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
      try { localStorage.setItem(AUDIO_MUTED_KEY, String(next)); } catch {}
      const bg = getBgAudio();
      if (bg) {
        bg.muted = next;
        if (!next && bg.paused && volume > 0) {
          bg.play().catch(() => {});
        }
      }
      window.dispatchEvent(new CustomEvent('gd_audio_settings_changed', { detail: { isMuted: next, volume } }));
      return next;
    });
  }, [volume]);

  const setMuted = useCallback((muted: boolean) => {
    setIsMuted(muted);
    try { localStorage.setItem(AUDIO_MUTED_KEY, String(muted)); } catch {}
    const bg = getBgAudio();
    if (bg) {
      bg.muted = muted;
      if (!muted && bg.paused && volume > 0) {
        bg.play().catch(() => {});
      }
    }
    window.dispatchEvent(new CustomEvent('gd_audio_settings_changed', { detail: { isMuted: muted, volume } }));
  }, [volume]);

  const setVolume = useCallback((newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolumeState(clamped);
    try { localStorage.setItem(AUDIO_VOLUME_KEY, String(clamped)); } catch {}
    const bg = getBgAudio();
    if (bg) {
      bg.volume = clamped * 0.5;
      if (!isMuted && clamped > 0 && bg.paused) {
        bg.play().catch(() => {});
      }
    }
    window.dispatchEvent(new CustomEvent('gd_audio_settings_changed', { detail: { isMuted, volume: clamped } }));
  }, [isMuted]);

  // 3. SINTETIZADOR DE SFX (FRECUENCIA DIRECTA O NOMBRE CLAVE)
  const playSfx = useCallback((soundOrFreq?: number | string) => {
    if (isMuted || volume <= 0 || soundOrFreq === undefined || soundOrFreq === null) return;

    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // Si es un número (frecuencia en Hz)
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
        return;
      }

      // Si es una cadena
      if (typeof soundOrFreq === 'string') {
        if (soundOrFreq.startsWith('http') || soundOrFreq.startsWith('/') || soundOrFreq.startsWith('./')) {
          const a = new Audio(soundOrFreq);
          a.volume = volume;
          a.play().catch(() => {});
          return;
        }

        // Sintetizador procedural para SFX con nombre
        const sfxName = soundOrFreq.toLowerCase();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        if (sfxName.includes('success') || sfxName.includes('confirm')) {
          // Tono ascendente dual
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(587, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
          gain.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.16);
        } else if (sfxName.includes('fail') || sfxName.includes('error')) {
          // Tono descendente grave
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(320, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.2);
          gain.gain.setValueAtTime(volume * 0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.22);
        } else {
          // Click suave / genérico
          osc.type = 'sine';
          osc.frequency.setValueAtTime(660, ctx.currentTime);
          gain.gain.setValueAtTime(volume * 0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.06);
        }
      }
    } catch (err) {
      console.warn('[GD_AUDIO_ENGINE] Error al generar SFX:', err);
    }
  }, [isMuted, volume]);

  return {
    isMuted,
    volume,
    toggleMute,
    setMuted,
    setVolume,
    playSfx,
    playBgMusic,
    stopBgMusic,
  };
};

export default useAudioEngine;
