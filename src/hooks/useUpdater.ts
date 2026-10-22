import { useEffect } from "react";

/**
 * Hook de auto-update para GalaxyDust.
 * Solo se activa en contexto Tauri (Desktop). En navegador/dev web, es un no-op.
 */
export function useUpdater(): void {
  useEffect(() => {
    // Guard: solo ejecutar dentro de Tauri Desktop
    if (typeof window === "undefined" || !("__TAURI__" in window)) {
      return;
    }
    checkForUpdates();
  }, []);
}

async function checkForUpdates(): Promise<void> {
  try {
    // Importación dinámica para evitar errores en modo web/dev
    const { check } = await import("@tauri-apps/plugin-updater");
    const { relaunch } = await import("@tauri-apps/plugin-process");

    const update = await check();

    if (update?.available) {
      console.log(`[UPDATER] Nueva versión disponible: ${update.version}`);
      console.log(`[UPDATER] Notas de release: ${update.body ?? "Sin notas"}`);
      await update.downloadAndInstall();
      console.log("[UPDATER] Actualización instalada. Relanzando...");
      await relaunch();
    } else {
      console.log("[UPDATER] La aplicación está actualizada.");
    }
  } catch (error) {
    // Error silencioso: el auto-update nunca debe bloquear el arranque del juego
    console.error("[UPDATER] Error al comprobar actualizaciones:", error);
  }
}
