import { useEffect } from "react";

/**
 * Hook de auto-update para GalaxyDust.
 * Solo se activa en contexto Tauri (Desktop). En navegador/dev web, es un no-op.
 * Se ejecuta con un delay asíncrono para que la interfaz inicial (login/dashboard)
 * se monte y pinte de inmediato sin interferencias.
 */
export function useUpdater(): void {
  useEffect(() => {
    // Guard: solo ejecutar dentro de Tauri Desktop
    if (typeof window === "undefined" || !("__TAURI__" in window)) {
      return;
    }

    // Delay no bloqueante de 3 segundos para garantizar que el DOM y el WebView estén estables
    const timer = setTimeout(() => {
      checkForUpdates();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);
}

async function checkForUpdates(): Promise<void> {
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const { relaunch } = await import("@tauri-apps/plugin-process");

    const update = await check();

    if (update?.available) {
      console.log(`[UPDATER] Nueva versión detectada: ${update.version}`);
      console.log(`[UPDATER] Notas de release: ${update.body ?? "Sin notas"}`);
      await update.downloadAndInstall();
      console.log("[UPDATER] Actualización descargada e instalada. Relanzando aplicación...");
      await relaunch();
    } else {
      console.log("[UPDATER] Terminal sincronizada con la última versión.");
    }
  } catch (error) {
    // Error silencioso: el auto-update en segundo plano nunca debe interrumpir el juego
    console.warn("[UPDATER] Verificación en segundo plano no disponible o completada con aviso:", error);
  }
}
