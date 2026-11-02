import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Versión actual del cliente — sincronizada con package.json / tauri.conf.json
export const CLIENT_VERSION = '1.1.2';

/**
 * Compara dos strings SemVer (MAJOR.MINOR.PATCH).
 * Retorna -1 si a < b, 0 si a === b, 1 si a > b.
 */
function compareSemVer(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
}

interface VersionCheckResult {
  showUpdateModal: boolean;
  latestVersion: string;
  isMaintenance: boolean;
  maintenanceMessage: string;
}

export function useVersionCheck(): VersionCheckResult {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [latestVersion, setLatestVersion] = useState('');
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');

  useEffect(() => {
    const checkVersion = async () => {
      const { data, error } = await supabase
        .from('app_system_config')
        .select('min_required_version, current_latest_version, is_maintenance, maintenance_message')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.error('[useVersionCheck] Error consultando app_system_config:', error);
        return;
      }
      if (!data) return;

      setLatestVersion(data.current_latest_version ?? '');
      setIsMaintenance(data.is_maintenance ?? false);
      setMaintenanceMessage(data.maintenance_message ?? '');

      if (compareSemVer(CLIENT_VERSION, data.min_required_version) < 0) {
        console.warn(
          `[useVersionCheck] Versión obsoleta: cliente=${CLIENT_VERSION}, mínima requerida=${data.min_required_version}`
        );
        setShowUpdateModal(true);
      }
    };

    checkVersion();
  }, []);

  return { showUpdateModal, latestVersion, isMaintenance, maintenanceMessage };
}

