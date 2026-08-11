import React, { useState, useEffect } from 'react';
import {
  User, ShieldCheck, Zap, Swords, Coins, Database, Compass,
  MapPin, BarChart2, CheckCircle2, Lock, ArrowLeft, Layers, Box, Sparkles, X, Edit3, Award
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProfileViewProps {
  onBack?: () => void;
  triggerNotification?: (text: string, e?: any) => void;
  onProfileUpdate?: (updatedFields: { avatar_url?: string; badge_name?: string; badge_image?: string }) => void;
}

const GAME_AVATARS = [
  "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Avatares/1.png",
  "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Avatares/2.png",
  "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Avatares/3.png",
  "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Avatares/4.png",
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300",
  "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=300",
  "https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=300",
  "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=300"
];

const GAME_BADGES = [
  { id: "badge_1", name: "INSIGNIA SUPREMA", image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600" },
  { id: "badge_2", name: "COMANDANTE DE SECTOR", image: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=600" },
  { id: "badge_3", name: "VANGUARDIA GALÁCTICA", image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600" },
  { id: "badge_4", name: "ALIANZA DE LA CORONA", image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600" },
  { id: "badge_5", name: "NEXUS CÓSMICO", image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=600" },
  { id: "badge_6", name: "GUARDIÁN DEL VACÍO", image: "https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=600" }
];

export const ProfileView: React.FC<ProfileViewProps> = ({ onBack, triggerNotification, onProfileUpdate }) => {
  const [activeTab, setActiveTab] = useState<'STATS' | 'PVP-PVE' | 'ECONOMY' | 'ACHIEVEMENTS'>('STATS');
  const [loading, setLoading] = useState(true);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);

  const [profileData, setProfileData] = useState<any>({
    username: 'COMANDANTE',
    avatar_url: '',
    level: 1,
    ep: 0,
    max_ep: 1000,
    power_score: 0,
    metal: 0,
    crystal: 0,
    deuterium: 0,
    dark_matter: 0,
    gd_coin: 0,
    quantum_credit: 0,
    phantom_coin: 0,
    badge_name: 'INSIGNIA SUPREMA',
    badge_image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600'
  });

  const fetchRealUserData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || '9abc737e-9c3d-4349-a976-59af24f51f4d';

      // 👈 CORRECCIÓN ERROR 400: Usar '.eq("id", userId)'
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
        setProfileData({
          username: profile.username || profile.name || user?.email?.split('@')[0] || 'PILOTO IMPERIAL',
          avatar_url: profile.avatar_url || GAME_AVATARS[0],
          level: profile.level || 1,
          ep: profile.exp_points || profile.ep || 0,
          max_ep: (profile.level || 1) * 1000,
          power_score: parseFloat(profile.power_score || 0),
          metal: parseFloat(profile.metal || 0),
          crystal: parseFloat(profile.crystal || 0),
          deuterium: parseFloat(profile.deuterium || 0),
          dark_matter: parseFloat(profile.dark_matter || 0),
          gd_coin: parseFloat(profile.gd_coin || 0),
          quantum_credit: parseFloat(profile.quantum_credit || 0),
          phantom_coin: parseFloat(profile.phantom_coin || 0),
          badge_name: profile.badge_name || GAME_BADGES[0].name,
          badge_image: profile.badge_image || GAME_BADGES[0].image
        });
      }
    } catch (err) {
      console.error("Error al cargar perfil real:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealUserData();
  }, []);

  // ─── CAMBIAR AVATAR INSTANTÁNEAMENTE ───
  const handleSelectAvatar = async (avatarUrl: string) => {
    setProfileData((prev: any) => ({ ...prev, avatar_url: avatarUrl }));
    setIsAvatarModalOpen(false);

    if (onProfileUpdate) {
      onProfileUpdate({ avatar_url: avatarUrl });
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // 👈 CORRECCIÓN ERROR 400: '.eq("id", user.id)'
        await supabase
          .from('user_profiles')
          .update({ avatar_url: avatarUrl })
          .eq('id', user.id);
      }

      if (triggerNotification) {
        triggerNotification("✅ AVATAR CAMBIADO Y GUARDADO EN BD");
      }
    } catch (err) {
      console.error("Error al guardar avatar:", err);
    }
  };

  // ─── CAMBIAR INSIGNIA INSTANTÁNEAMENTE ───
  const handleSelectBadge = async (badge: { name: string; image: string }) => {
    setProfileData((prev: any) => ({
      ...prev,
      badge_name: badge.name,
      badge_image: badge.image
    }));
    setIsBadgeModalOpen(false);

    if (onProfileUpdate) {
      onProfileUpdate({ badge_name: badge.name, badge_image: badge.image });
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // 👈 CORRECCIÓN ERROR 400: '.eq("id", user.id)'
        await supabase
          .from('user_profiles')
          .update({
            badge_name: badge.name,
            badge_image: badge.image
          })
          .eq('id', user.id);
      }

      if (triggerNotification) {
        triggerNotification(`✅ INSIGNIA GUARDADA EN BD: ${badge.name}`);
      }
    } catch (err) {
      console.error("Error al guardar la insignia:", err);
    }
  };

  const epPercentage = Math.min(100, Math.max(0, (profileData.ep / profileData.max_ep) * 100));

  return (
    <div className="w-full max-w-7xl mx-auto bg-[#080b0e] border border-cyan-500/30 p-4 sm:p-6 rounded-2xl shadow-2xl relative font-mono text-left select-none flex flex-col gap-4 text-white">
      
      {/* BARRA SUPERIOR */}
      <div className="w-full bg-[#05070a] border border-cyan-500/30 p-3 rounded-xl flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-1.5 bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 rounded-lg cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <h1 className="text-sm font-black tracking-widest text-white uppercase flex items-center gap-2">
            <User className="w-4 h-4 text-cyan-400" /> PERFIL DE COMANDO IMPERIAL
          </h1>
        </div>
      </div>

      {/* TARJETA PRINCIPAL */}
      <div className="w-full bg-[#05070a] border border-cyan-500/30 p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div 
            onClick={() => setIsAvatarModalOpen(true)}
            className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-black border-2 border-cyan-400/80 hover:border-cyan-300 flex items-center justify-center overflow-hidden shrink-0 shadow-[0_0_15px_rgba(34,211,238,0.3)] cursor-pointer group"
            title="Cambiar Avatar"
          >
            {profileData.avatar_url ? (
              <img src={profileData.avatar_url} alt="Avatar" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            ) : (
              <User className="w-8 h-8 text-cyan-400" />
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Edit3 className="w-5 h-5 text-cyan-300" />
            </div>
          </div>

          <div className="flex flex-col text-left gap-1.5">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white uppercase">{profileData.username}</h2>
              <span className="text-[8px] font-black bg-cyan-950 border border-cyan-500/60 text-cyan-300 px-2 py-0.5 rounded uppercase">LVL {profileData.level}</span>
            </div>

            <div className="w-full max-w-xs space-y-1">
              <div className="flex justify-between text-[7.5px] text-zinc-400 font-mono">
                <span>PUNTOS DE EXPERIENCIA (EP)</span>
                <span className="text-cyan-400 font-bold">{profileData.ep} / {profileData.max_ep}</span>
              </div>
              <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden p-0.5 border border-cyan-950">
                <div className="h-full bg-cyan-400 rounded-full transition-all duration-300" style={{ width: `${epPercentage}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* TARJETA DE INSIGNIA + BOTÓN AZUL */}
        <div 
          className="relative w-full md:w-64 h-16 rounded-xl border border-cyan-500/50 bg-cover bg-center overflow-hidden flex items-center justify-between p-3 shadow-lg shrink-0"
          style={{ backgroundImage: `url('${profileData.badge_image}')` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/90" />
          <span className="relative z-10 text-[10px] font-black text-cyan-300 uppercase truncate max-w-[140px]">{profileData.badge_name}</span>
          <button
            onClick={() => setIsBadgeModalOpen(true)}
            className="relative z-10 px-2.5 py-1 bg-gradient-to-r from-blue-600 to-cyan-600 border border-cyan-400/80 text-white text-[8px] font-black uppercase rounded cursor-pointer"
          >
            CAMBIAR
          </button>
        </div>
      </div>

      {/* MODAL AVATAR */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#080b0e] border border-cyan-500/50 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-cyan-950 pb-2">
              <h3 className="text-xs font-black text-white uppercase">SELECCIONAR AVATAR IMPERIAL</h3>
              <button onClick={() => setIsAvatarModalOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-4 gap-3 py-2 max-h-[260px] overflow-y-auto">
              {GAME_AVATARS.map((url, idx) => (
                <div key={idx} onClick={() => handleSelectAvatar(url)} className="aspect-square rounded-xl bg-black border-2 border-cyan-950 hover:border-cyan-400 cursor-pointer overflow-hidden">
                  <img src={url} className="w-full h-full object-cover" alt="" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL INSIGNIA */}
      {isBadgeModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#080b0e] border border-cyan-500/50 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-cyan-950 pb-2">
              <h3 className="text-xs font-black text-white uppercase">CATÁLOGO DE INSIGNIAS</h3>
              <button onClick={() => setIsBadgeModalOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2 max-h-[300px] overflow-y-auto">
              {GAME_BADGES.map((badge) => (
                <div key={badge.id} onClick={() => handleSelectBadge(badge)} className="relative h-20 rounded-xl border border-cyan-950 hover:border-cyan-400 cursor-pointer overflow-hidden flex items-center justify-center p-3" style={{ backgroundImage: `url('${badge.image}')`, backgroundSize: 'cover' }}>
                  <div className="absolute inset-0 bg-black/70" />
                  <span className="relative z-10 text-[9.5px] font-black text-cyan-300 uppercase">{badge.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileView;