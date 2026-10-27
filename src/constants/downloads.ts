/**
 * GalaxyDust Online - Enlaces oficiales de descarga cliente nativo (v1.1.0)
 */
export const APP_DOWNLOADS = {
  version: 'v1.1.0',
  releaseTag: 'v1.1.0',
  releaseUrl: 'https://github.com/amijares-hub/GalaxyDust-Juego-FrontEnd-/releases/tag/v1.1.0',
  windows: {
    fileName: 'GalaxyDust_1.1.0_x64-setup.exe',
    url: 'https://github.com/amijares-hub/GalaxyDust-Juego-FrontEnd-/releases/download/v1.1.0/GalaxyDust_1.1.0_x64-setup.exe',
    label: 'Windows 64-bit (.exe)',
    description: 'Instalador oficial para PC / Windows con aceleración gráfica completa.'
  },
  android: {
    fileName: 'GalaxyDust_1.1.0.apk',
    url: 'https://github.com/amijares-hub/GalaxyDust-Juego-FrontEnd-/releases/download/v1.1.0/GalaxyDust_1.1.0.apk',
    label: 'Android APK (.apk)',
    description: 'Paquete de instalación directo para smartphones y tablets Android.'
  }
} as const;
