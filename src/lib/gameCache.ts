import { supabase } from './supabase';

const CACHE_KEY_PREFIX = 'GD_GAME_CACHE_';
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutos de validez en memoria local

// Assets multimedia críticos que se precargarán en RAM
const CRITICAL_ASSETS = [
    "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Phatom%20Station/Skin%20Original/phantom%20station.png",
    "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Monedas%20y%20Recursos/Phantom%20Coin.png",
    "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Monedas%20y%20Recursos/GD%20Coin.png",
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300",
    "https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?q=80&w=300"
];

export const getCachedData = (key: string) => {
    try {
        const raw = localStorage.getItem(CACHE_KEY_PREFIX + key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
            localStorage.removeItem(CACHE_KEY_PREFIX + key);
            return null;
        }
        return parsed.data;
    } catch (e) {
        return null;
    }
};

export const setCachedData = (key: string, data: any) => {
    try {
        localStorage.setItem(
            CACHE_KEY_PREFIX + key,
            JSON.stringify({ timestamp: Date.now(), data })
        );
    } catch (e) {
        console.warn("No se pudo guardar en caché local:", e);
    }
};

export const preloadGameDataAndAssets = async (
    onProgress: (pct: number, status: string) => void
): Promise<void> => {
    try {
        // 1. Sincronizar catálogo semilla de Clústeres (20%)
        onProgress(15, "CONECTANDO CON LA MATRIZ DE DATOS C.A.N...");
        let clusters = getCachedData('GALAXY_CLUSTERS');
        if (!clusters) {
            const { data } = await supabase.from('seed_galaxy_clusters').select('*');
            if (data) {
                clusters = data;
                setCachedData('GALAXY_CLUSTERS', data);
            }
        }

        // 2. Sincronizar Herramientas y Semillas (40%)
        onProgress(40, "SINCRONIZANDO CATÁLOGOS DE HERRAMIENTAS Y NAVES...");
        let tools = getCachedData('SEED_TOOLS');
        if (!tools) {
            const { data } = await supabase.from('seed_tools').select('*');
            if (data) {
                tools = data;
                setCachedData('SEED_TOOLS', data);
            }
        }

        // 3. Precargar Multimedia en memoria RAM (80%)
        onProgress(65, "CARGANDO TEXTURAS MULTIMEDIA Y INTERFAZ...");
        const imagePromises = CRITICAL_ASSETS.map((src) => {
            return new Promise<void>((resolve) => {
                const img = new Image();
                img.src = src;
                img.onload = () => resolve();
                img.onerror = () => resolve(); // Previene bloqueos por fallos de imagen
            });
        });

        await Promise.all(imagePromises);

        // 4. Finalizar precarga (100%)
        onProgress(100, "SISTEMAS ONLINE. ACCEDIENDO A LA DAPP...");
    } catch (error) {
        console.error("Error durante el Preloader:", error);
        onProgress(100, "INICIANDO EN MODO DIRECTO...");
    }
};