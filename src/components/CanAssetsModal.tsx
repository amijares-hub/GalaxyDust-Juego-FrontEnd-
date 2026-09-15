import React, { useState } from 'react';
import { X, ShieldAlert, Sparkles, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { GalaxyFrame } from './CanView';

export interface CanAssetItem {
  id: string;
  seed_id: string;
  name: string;
  type: 'Estructuras' | 'Tecnologias' | 'Insignias';
  description?: string;
  effect_bonus?: number;
  image_url?: string;
  is_equipped: boolean;
  level?: number;
}

interface CanAssetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: 'Estructuras' | 'Tecnologias' | 'Insignias' | null;
  assets: CanAssetItem[];
  userId: string;
  onRefresh: () => void;
  triggerNotification?: (msg: string) => void;
}

export const CanAssetsModal: React.FC<CanAssetsModalProps> = ({
  isOpen,
  onClose,
  category,
  assets,
  userId,
  onRefresh,
  triggerNotification
}) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (!isOpen || !category) return null;

  const targetTableMap = {
    Estructuras: ['user_structures'],
    Tecnologias: ['user_technologies'],
    Insignias: ['user_badges_unlocked', 'user_badges']
  };

  const handleToggleEquip = async (asset: CanAssetItem) => {
    setLoadingId(asset.id);
    const nextState = !asset.is_equipped;
    const tablesToUpdate = targetTableMap[asset.type] || [];

    try {
      let updateExecuted = false;

      for (const tableName of tablesToUpdate) {
        const { error } = await supabase
          .from(tableName)
          .update({ is_equipped: nextState, is_active: nextState })
          .eq('id', asset.id)
          .eq('user_id', userId);

        if (!error) {
          updateExecuted = true;
        }
      }

      if (!updateExecuted) {
        const targetTable = tablesToUpdate[0];
        await supabase.rpc('toggle_can_asset_equip_secure', {
          p_user_id: userId,
          p_table_name: targetTable,
          p_asset_id: String(asset.id),
          p_equip_status: nextState
        });
      }

      if (triggerNotification) {
        triggerNotification(
          nextState
            ? `✅ ${asset.name.toUpperCase()} ACTIVADO / EQUIPADO`
            : `⏸️ ${asset.name.toUpperCase()} DESACTIVADO`
        );
      }
      await onRefresh();
    } catch (err: any) {
      console.error('Error al cambiar equipamiento:', err);
      if (triggerNotification) triggerNotification(`⛔ ERROR: ${err.message}`);
    } finally {
      setLoadingId(null);
    }
  };

  const filteredAssets = assets
    .filter((a) => a.type === category)
    .sort((a, b) => (a.is_equipped === b.is_equipped ? 0 : a.is_equipped ? -1 : 1));

  const activeCount = filteredAssets.filter((a) => a.is_equipped).length;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[150] flex items-center justify-center p-2 sm:p-4 font-mono select-none text-white overflow-hidden">
      <GalaxyFrame className="w-full max-w-xl sm:max-w-2xl lg:max-w-3xl my-auto max-h-[88vh] flex flex-col overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.2)]" innerPadding="p-0">
        
        {/* CABECERA */}
        <div className="bg-[#05070a] border-b border-cyan-950 p-3 sm:p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 animate-pulse shrink-0" />
            <h2 className="text-xs sm:text-sm font-black text-white uppercase tracking-widest truncate">
              GESTIÓN DE {category.toUpperCase()} ({activeCount} / {filteredAssets.length} ACTIVOS)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-cyan-950/60 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* LISTADO DE ACTIVOS */}
        <div className="p-2 sm:p-4 flex-1 min-h-0 overflow-x-hidden overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 custom-scrollbar">
          {filteredAssets.length === 0 ? (
            <div className="col-span-full py-12 text-center text-zinc-500 text-xs uppercase tracking-widest">
              NO DISPONER DE {category.toUpperCase()} EN TU INVENTARIO C.A.N.
            </div>
          ) : (
            filteredAssets.map((asset) => {
              const isLoading = loadingId === asset.id;
              return (
                <div
                  key={asset.id}
                  className={`p-2.5 sm:p-3 rounded-xl border flex justify-between items-center gap-2 sm:gap-3 transition-all ${
                    asset.is_equipped
                      ? 'bg-emerald-950/30 border-2 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                      : 'bg-[#040609] border-cyan-950/80 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 overflow-hidden">
                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-black border border-cyan-950 overflow-hidden shrink-0 flex items-center justify-center relative">
                      <img
                        src={asset.image_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=150'}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                      />
                      {asset.is_equipped && (
                        <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col text-left overflow-hidden">
                      <span className="text-[9px] sm:text-[10px] font-black text-white uppercase truncate">
                        {asset.name} {asset.level ? `(NIVEL ${asset.level})` : ''}
                      </span>
                      <span className="text-[7.5px] sm:text-[8px] text-cyan-400 font-mono">
                        EFECTO: +{asset.effect_bonus || 0}%
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleEquip(asset)}
                    disabled={isLoading}
                    className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border shrink-0 ${
                      asset.is_equipped
                        ? 'bg-red-950/80 text-red-300 border-red-800 hover:bg-red-900'
                        : 'bg-emerald-950/80 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
                    }`}
                  >
                    {isLoading ? '...' : asset.is_equipped ? 'DESEQUIPAR' : 'EQUIPAR'}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* PIE DEL MODAL */}
        <div className="bg-[#05070a] border-t border-cyan-950 p-2.5 sm:p-3 flex justify-between items-center text-[7.5px] sm:text-[8.5px] text-zinc-400 shrink-0">
          <span className="flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">LOS CAMBIOS APLICAN AL INSTANTE</span>
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 sm:px-4 sm:py-1.5 bg-cyan-950 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 font-bold uppercase rounded-lg cursor-pointer shrink-0 ml-2"
          >
            CERRAR
          </button>
        </div>

      </GalaxyFrame>
    </div>
  );
};

export default CanAssetsModal;