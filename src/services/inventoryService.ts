import { supabase } from '../lib/supabase';

export const inventoryService = {
  // Conexión real al motor de fundición de planos
  async craftAsset(userId: string, costs: any, assetData: any) {
    const { data, error } = await supabase.rpc('process_blueprint_craft', {
      user_uuid: userId,
      cost_metal: costs.metal || 0,
      cost_crystal: costs.crystal || 0,
      cost_deuterium: costs.deuterium || 0,
      cost_dark_matter: costs.dark_matter || 0,
      cost_organium: costs.organium || 0,
      cost_xenoplasm: costs.xenoplasm || 0,
      cost_gd_coins: costs.gd_coins || 0,
      new_asset_data: assetData
    });

    if (error) throw error;
    return data;
  }
};
