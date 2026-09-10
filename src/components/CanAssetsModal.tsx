import React, { useState } from 'react';
import { X, ShieldAlert, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
    Estructuras: 'user_structures',
    Tecnologias: 'user_technologies',
    Insignias: 'user_badges_unlocked'
  };

  const handleToggleEquip = async (asset: CanAssetItem) => {
    setLoadingId(asset.id);
    const targetTable = targetTableMap[asset.type];
    const nextState = !asset.is_equipped;

    try {
      const { data, error } = await supabase.rpc('toggle_can_asset_equip_secure', {
        p_user_id: userId,
        p_table_name: targetTable,
        p_asset_id: asset.id,
        p_equip_status: nextState
      });

      if (error) throw error;

      if (data && data.success) {
        if (triggerNotification) {
          triggerNotification(
            nextState
              ? `✅ ${asset.name.toUpperCase()} ACTIVADO / EQUIPADO`
              : `⏸️ ${asset.name.toUpperCase()} DESACTIVADO`
          );
        }
        await onRefresh();
      } else {
        if (triggerNotification) triggerNotification(`⛔ ${data?.error || 'Error al modificar estado'}`);
      }
    } catch (err: any) {
      if (triggerNotification) triggerNotification(`⛔ ERROR: ${err.message}`);
    } finally {
      setLoadingId(null);
    }
  };

  const filteredAssets = assets.filter((a) => a.type === category);
  const activeCount = filteredAssets.filter((a) => a.is_equipped).length;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-center justify-center p-4 font-mono select-none text-white">
      <div className="w-full max-w-3xl bg-[#080b0e] border border-cyan-500/40 rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.2)] flex flex-col overflow-hidden max-h-[85vh]">
        
        <div className="bg-[#05070a] border-b border-cyan-950 p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
            <h2 className="text-sm font-black text-white uppercase tracking-widest">
              GESTIÓN DE {category.toUpperCase()} ({activeCount} / {filteredAssets.length} ACTIVOS)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-cyan-950/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 custom-scrollbar">
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
                  className={`p-3 rounded-xl border flex justify-between items-center gap-3 transition-all ${
                    asset.is_equipped
                      ? 'bg-cyan-950/40 border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                      : 'bg-[#040609] border-cyan-950/80 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-lg bg-black border border-cyan-950 overflow-hidden shrink-0 flex items-center justify-center">
                      <img
                        src={asset.image_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=150'}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col text-left overflow-hidden">
                      <span className="text-[10px] font-black text-white uppercase truncate">
                        {asset.name} {asset.level ? `(NIVEL ${asset.level})` : ''}
                      </span>
                      <span className="text-[8px] text-cyan-400 font-mono">
                        BONO: +{asset.effect_bonus || 0}%
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleEquip(asset)}
                    disabled={isLoading}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border shrink-0 ${
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

        <div className="bg-[#05070a] border-t border-cyan-950 p-3 flex justify-between items-center text-[8.5px] text-zinc-400">
          <span className="flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            LOS CAMBIOS APLICAN AL INSTANTE A LOS MODIFICADORES DE EXTRACCIÓN
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-cyan-950 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 font-bold uppercase rounded-lg cursor-pointer"
          >
            CERRAR
          </button>
        </div>

      </div>
    </div>
  );
};

export default CanAssetsModal;