import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Send, X, Globe, Shield, ShoppingBag,
  Search, Ban, AtSign, Smile, MessageCircle, ChevronLeft,
  Trash2, Flag, Swords
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { chatService, ChatMessage } from '../services/chatService';

interface ChatSystemProps {
  userAllianceName?: string;
  triggerNotification?: (text: string, e?: any) => void;
}

type ChannelType = 'GLOBAL' | 'ALLIANCE' | 'MARKET' | 'COMBAT' | 'PRIVADO';

interface DmPartner {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
}

interface UserProfileData {
  avatar_url?: string;
  username?: string;
  role?: string;
}

const QUICK_EMOJIS = ['🚀', '⚔️', '🛡️', '💎', '🔥', '👑', '🌌', '💥', '🛸', '⭐', '😎', '👍', '🎯', '⚡', '🏆', '👽'];
const DEFAULT_COMMANDER_AVATAR = "https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Avatares%20de%20Comandantes/1.png";

const resolveAvatarUrl = (url?: string | null): string => {
  if (!url || typeof url !== 'string' || url.trim() === '') return DEFAULT_COMMANDER_AVATAR;
  const clean = url.trim();

  if (
    clean.includes('unsplash.com') ||
    clean.includes('mixkit') ||
    clean.includes('ui-avatars') ||
    clean.includes('photo-') ||
    clean.includes('svg')
  ) {
    return DEFAULT_COMMANDER_AVATAR;
  }

  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
  const fileName = clean.endsWith('.png') ? clean : `${clean}.png`;
  return `https://qldjeysusithpblfrmtq.supabase.co/storage/v1/object/public/Assets%20para%20la%20Pagina%20Web/Avatares%20de%20Comandantes/${fileName}`;
};

export const ChatSystem: React.FC<ChatSystemProps> = ({
  userAllianceName = 'NO ALLIANCE',
  triggerNotification
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeChannel, setActiveChannel] = useState<ChannelType>('GLOBAL');
  const [channelId, setChannelId] = useState<string>('global-main');
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputContent, setInputContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [profilesMap, setProfilesMap] = useState<Record<string, UserProfileData>>({});
  const [hasActiveCombat, setHasActiveCombat] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const lastSentTimeRef = useRef<number>(0);

  const [activeDmPartner, setActiveDmPartner] = useState<DmPartner | null>(null);
  const [recentDmPartners, setRecentDmPartners] = useState<DmPartner[]>([]);
  
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeUserMenu, setActiveUserMenu] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUserId(data.user.id);
        checkActiveCombat(data.user.id);
      }
    });
  }, []);

  const fetchAllUserProfiles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const newMap: Record<string, UserProfileData> = {};

      if (user) {
        setCurrentUserId(user.id);
        const authName = user.user_metadata?.username || user.user_metadata?.display_name || user.email?.split('@')[0];
        if (authName) setCurrentUserName(authName);
      }

      const { data, error } = await supabase.from('user_profiles').select('id, username, avatar_url, role');
      if (!error && data && data.length > 0) {
        data.forEach((p: any) => {
          const profileData: UserProfileData = {
            avatar_url: p.avatar_url || undefined,
            username: p.username || undefined,
            role: p.role || undefined
          };
          if (p.id) newMap[p.id] = profileData;
          if (p.username) newMap[p.username.toLowerCase()] = profileData;
        });
      }
      setProfilesMap((prev) => ({ ...prev, ...newMap }));
    } catch (err) {
      console.error("Error al sincronizar perfiles en chat:", err);
    }
  };

  useEffect(() => {
    const handleProfileUpdateEvent = (e: any) => {
      const customAvatar = e?.detail?.avatar_url;
      if (customAvatar && currentUserId) {
        setProfilesMap((prev) => ({
          ...prev,
          [currentUserId]: { ...prev[currentUserId], avatar_url: customAvatar },
          ...(currentUserName ? { [currentUserName.toLowerCase()]: { ...prev[currentUserName.toLowerCase()], avatar_url: customAvatar } } : {})
        }));
      }
      fetchAllUserProfiles();
    };

    window.addEventListener('profile_updated', handleProfileUpdateEvent);
    return () => window.removeEventListener('profile_updated', handleProfileUpdateEvent);
  }, [currentUserId, currentUserName]);

  useEffect(() => {
    fetchAllUserProfiles();
    const channel = supabase
      .channel('public_user_profiles_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, () => { fetchAllUserProfiles(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const checkActiveCombat = async (userId: string) => {
    try {
      const { data: combatData } = await supabase
        .from('combat_logs')
        .select('id')
        .or(`attacker_id.eq.${userId},defender_id.eq.${userId}`)
        .limit(1);

      const inCombat = !!(combatData && combatData.length > 0);
      setHasActiveCombat(inCombat);

      if (!inCombat && activeChannel === 'COMBAT') setActiveChannel('GLOBAL');
    } catch (err) {
      setHasActiveCombat(false);
    }
  };

  useEffect(() => {
    if (activeChannel === 'PRIVADO') {
      if (activeDmPartner && currentUserId) {
        setChannelId(chatService.getDmChannelId(currentUserId, activeDmPartner.id));
      } else {
        setChannelId('dm-none');
      }
    } else if (activeChannel === 'GLOBAL') {
      setChannelId('global-main');
    } else if (activeChannel === 'MARKET') {
      setChannelId('market-main');
    } else if (activeChannel === 'COMBAT') {
      setChannelId('combat-temp-active');
    } else if (activeChannel === 'ALLIANCE') {
      setChannelId(`alliance-${userAllianceName.toLowerCase().replace(/\s+/g, '-')}`);
    }
  }, [activeChannel, activeDmPartner, currentUserId, userAllianceName]);

  useEffect(() => {
    if (channelId === 'dm-none') {
      setMessages([]);
      return;
    }

    let unsubscribe: () => void;
    async function initChat() {
      const history = await chatService.fetchHistory(channelId);
      setMessages(history.slice(-100));

      unsubscribe = chatService.subscribeToChannel(channelId, (newMsg) => {
        setMessages((prev) => [...prev.slice(-99), newMsg]);
        if (!isOpen && newMsg.user_id !== currentUserId) {
          setUnreadCount((prev) => prev + 1);
        }
      });
    }

    initChat();
    return () => { if (unsubscribe) unsubscribe(); };
  }, [channelId, isOpen, currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputContent.trim()) return;

    const now = Date.now();
    if (now - lastSentTimeRef.current < 1200) {
      if (triggerNotification) triggerNotification('⚠️ CANAL SATURADO. ESPERA UN SEGUNDO.');
      return;
    }
    lastSentTimeRef.current = now;

    if (activeChannel === 'PRIVADO' && !activeDmPartner) {
      if (triggerNotification) triggerNotification('⚠️ SELECCIONA UN PILOTO PARA TRANSMITIR');
      return;
    }

    try {
      const sentMsg = await chatService.sendMessage(
        channelId, inputContent, 'TEXT', null, activeChannel === 'PRIVADO' && activeDmPartner ? activeDmPartner.id : null
      );
      setMessages((prev) => prev.some((m) => m.id === sentMsg.id) ? prev : [...prev.slice(-99), sentMsg]);
      setInputContent('');
      setShowEmojiPicker(false);
    } catch (err: any) {
      if (triggerNotification) triggerNotification(err.message || 'Error al transmitir');
    }
  };

  const handleStartPrivateChat = (partner: DmPartner) => {
    setRecentDmPartners((prev) => prev.some((p) => p.id === partner.id) ? prev : [partner, ...prev]);
    setActiveDmPartner(partner);
    setActiveChannel('PRIVADO');
    setActiveUserMenu(null);
  };

  const handleDeleteDmConversation = (partnerId: string, partnerName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentDmPartners((prev) => prev.filter((p) => p.id !== partnerId));
    if (activeDmPartner?.id === partnerId) setActiveDmPartner(null);
  };

  const handleMentionUser = (userName: string) => {
    setInputContent((prev) => `${prev} @${userName} `);
    setActiveUserMenu(null);
    inputRef.current?.focus();
  };

  const handleBlockUser = async (userId: string, userName: string) => {
    await chatService.blockUser(userId);
    setMessages((prev) => prev.filter((m) => m.user_id !== userId));
    setActiveUserMenu(null);
    if (triggerNotification) triggerNotification(`🔴 COMANDANTE ${userName} BLOQUEADO.`);
  };

  const handleReportUser = async (userId: string, userName: string) => {
    await chatService.reportUser(userId, userName, "Conducta inapropiada en chat");
    setActiveUserMenu(null);
    if (triggerNotification) triggerNotification(`🚩 REPORTE ENVIADO CONTRA ${userName}`);
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await chatService.deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      setActiveUserMenu(null);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      setActiveUserMenu(null);
    }
  };

  const handleAddEmoji = (emoji: string) => setInputContent((prev) => prev + emoji);

  const filteredMessages = messages.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const userProf = profilesMap[m.user_id] || (m.user_name ? profilesMap[m.user_name.toLowerCase()] : undefined);
    const nameToFilter = userProf?.username || m.user_name;
    return m.content.toLowerCase().includes(q) || nameToFilter.toLowerCase().includes(q);
  });

  const availableChannels = [
    { id: 'GLOBAL', label: 'GLOBAL', icon: Globe },
    { id: 'ALLIANCE', label: 'ALIANZA', icon: Shield },
    { id: 'MARKET', label: 'MERCADO', icon: ShoppingBag },
    ...(hasActiveCombat ? [{ id: 'COMBAT', label: 'COMBATE', icon: Swords }] : []),
    { id: 'PRIVADO', label: 'PRIVADO', icon: MessageCircle }
  ];

  return (
    <div className="fixed bottom-4 left-4 z-[9999] font-sans select-none">
      
      {!isOpen && (
        <motion.button
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={() => { setIsOpen(true); setUnreadCount(0); }}
          className="relative p-3.5 bg-black/85 hover:bg-black border-2 border-cyan-500/60 hover:border-cyan-400 text-cyan-300 rounded-full shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all cursor-pointer group backdrop-blur-md flex items-center justify-center hover:scale-110 active:scale-95"
        >
          <MessageSquare className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform animate-pulse" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white font-mono text-[9px] font-black min-w-[20px] h-[20px] px-1 rounded-full flex items-center justify-center shadow-[0_0_10px_#ef4444] border-2 border-black animate-bounce">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          <span className="absolute -top-0.5 -left-0.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-black"></span>
          </span>
        </motion.button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-[calc(100vw-2rem)] max-w-[360px] sm:max-w-[460px] h-[520px] max-h-[85dvh] bg-[#06080b]/95 border-2 border-cyan-500/40 rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.25)] backdrop-blur-xl flex flex-col overflow-hidden text-left"
          >
            <div className="flex items-center justify-between px-3 py-2 bg-black/90 border-b border-cyan-900/50 font-mono text-[8.5px] uppercase font-bold shrink-0">
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                {availableChannels.map((ch) => {
                  const Icon = ch.icon;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => setActiveChannel(ch.id as ChannelType)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 border ${
                        activeChannel === ch.id
                          ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 font-black shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                          : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{ch.label}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-zinc-400 hover:text-red-400 hover:bg-red-950/40 border border-transparent hover:border-red-500/30 rounded-lg transition-colors cursor-pointer shrink-0 ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activeChannel === 'PRIVADO' && activeDmPartner ? (
              <div className="px-3 py-1.5 bg-cyan-950/40 border-b border-cyan-500/30 flex items-center justify-between font-mono shrink-0">
                <div className="flex items-center gap-2">
                  <button onClick={() => setActiveDmPartner(null)} className="p-1 text-cyan-400 hover:text-white bg-black/60 rounded border border-cyan-950 cursor-pointer">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-5 h-5 rounded-full border border-cyan-400 overflow-hidden shrink-0">
                    <img 
                      src={resolveAvatarUrl(profilesMap[activeDmPartner.id]?.avatar_url || activeDmPartner.avatar)} 
                      alt={activeDmPartner.name} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] font-bold text-white uppercase">
                      {profilesMap[activeDmPartner.id]?.username || activeDmPartner.name}
                    </span>
                    <span className="text-[7px] text-cyan-400 uppercase font-mono">CANAL PRIVADO SEGURO</span>
                  </div>
                </div>
                <span className="text-[7.5px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded uppercase font-bold">
                  EN LÍNEA
                </span>
              </div>
            ) : (
              <div className="px-3 py-1.5 bg-black/40 border-b border-cyan-950/60 relative shrink-0">
                <Search className="absolute left-5 top-2.5 w-3 h-3 text-cyan-600" />
                <input
                  type="text"
                  placeholder={activeChannel === 'PRIVADO' ? "BUSCAR PILOTO PARA DM..." : "FILTRAR TRANSMISIONES O COMANDANTES..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/80 border border-cyan-950 rounded pl-7 pr-3 py-1 text-[8px] font-mono text-cyan-200 placeholder-zinc-600 outline-none uppercase"
                />
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono text-[9.5px] scrollbar-thin scrollbar-thumb-cyan-950">
              
              {activeChannel === 'PRIVADO' && !activeDmPartner ? (
                <div className="space-y-2">
                  <span className="text-[8px] font-mono text-cyan-400 uppercase tracking-widest block font-bold border-b border-cyan-950 pb-1">
                    CONVERSACIONES PRIVADAS RECIENTES
                  </span>
                  {recentDmPartners.length === 0 ? (
                    <div className="text-center text-zinc-600 uppercase text-[8px] py-12 tracking-widest">NO TIENES CONVERSACIONES PRIVADAS ACTIVAS</div>
                  ) : (
                    recentDmPartners.map((partner) => {
                      const partnerProf = profilesMap[partner.id];
                      const realPartnerAvatar = resolveAvatarUrl(partnerProf?.avatar_url || partner.avatar);
                      const realPartnerName = partnerProf?.username || partner.name;

                      return (
                        <div key={partner.id} onClick={() => handleStartPrivateChat(partner)} className="p-2.5 bg-black/60 hover:bg-cyan-950/50 border border-cyan-950 hover:border-cyan-500/40 rounded-xl flex items-center justify-between cursor-pointer transition-colors group">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full border border-cyan-400/60 overflow-hidden shrink-0 bg-neutral-900">
                              <img src={realPartnerAvatar} alt={realPartnerName} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="text-white font-bold uppercase group-hover:text-cyan-300 text-[9.5px]">{realPartnerName}</span>
                              <span className="text-zinc-500 text-[7.5px] uppercase">{partnerProf?.role || partner.role || 'COMANDANTE'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => handleStartPrivateChat(partner)} className="px-2.5 py-1 bg-cyan-950 group-hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-[7.5px] font-bold uppercase rounded cursor-pointer">
                              ABRIR DM
                            </button>
                            <button onClick={(e) => handleDeleteDmConversation(partner.id, partner.name, e)} className="p-1 bg-red-950/40 hover:bg-red-600 border border-red-500/40 text-red-400 hover:text-white rounded cursor-pointer transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                filteredMessages.length === 0 ? (
                  <div className="text-center text-zinc-600 uppercase text-[8px] py-12 tracking-widest">
                    {activeChannel === 'PRIVADO' ? 'INICIA LA TRANSMISIÓN PRIVADA CON ESTE PILOTO' : 'SIN TRANSMISIONES ACTIVAS EN ESTE CANAL'}
                  </div>
                ) : (
                  filteredMessages.map((msg) => {
                    const userProf = profilesMap[msg.user_id];
                    const realAvatar = resolveAvatarUrl(userProf?.avatar_url || msg.user_avatar);
                    const realName = userProf?.username || msg.user_name;
                    const realRole = userProf?.role || msg.user_role;

                    return (
                      <div key={msg.id} className="flex gap-2.5 items-start group text-left relative">
                        <div className="w-7 h-7 rounded-full border border-cyan-500/40 bg-neutral-900 overflow-hidden shrink-0 mt-0.5 shadow">
                          <img src={realAvatar} alt={realName} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <div className="flex items-center gap-1.5">
                              <span onClick={() => setActiveUserMenu(activeUserMenu === msg.id ? null : msg.id)} className="font-bold text-white hover:text-cyan-300 cursor-pointer uppercase text-[9px] transition-colors">
                                {realName}
                              </span>
                              <span className="text-[7px] bg-cyan-950 text-cyan-400 border border-cyan-800/40 px-1 rounded font-black uppercase">
                                {realRole}
                              </span>
                            </div>
                            <span className="text-[7.5px] text-zinc-600">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {msg.message_type === 'SYSTEM' ? (
                            <div className="p-2 bg-red-950/20 border border-red-500/30 text-red-300 rounded text-[8.5px] font-bold uppercase">
                              📢 {msg.content}
                            </div>
                          ) : (
                            <p className="text-zinc-300 leading-relaxed break-words">{msg.content}</p>
                          )}
                        </div>

                        {activeUserMenu === msg.id && (
                          <div className="absolute right-0 top-6 bg-[#0c1017] border border-cyan-500/50 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 text-[8.5px] font-mono uppercase backdrop-blur-md">
                            <button onClick={() => handleMentionUser(realName)} className="px-2.5 py-1.5 hover:bg-cyan-950 text-cyan-300 rounded-lg flex items-center gap-2 text-left cursor-pointer transition-colors">
                              <AtSign className="w-3.5 h-3.5 text-cyan-400" /> MENCIONAR
                            </button>
                            
                            {msg.user_id !== currentUserId && (
                              <button onClick={() => handleStartPrivateChat({ id: msg.user_id, name: realName, avatar: realAvatar, role: realRole })} className="px-2.5 py-1.5 hover:bg-cyan-950 text-emerald-400 rounded-lg flex items-center gap-2 text-left cursor-pointer font-bold transition-colors">
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" /> MENSAJE PRIVADO
                              </button>
                            )}

                            <button onClick={() => handleDeleteMessage(msg.id)} className="px-2.5 py-1.5 hover:bg-red-950/80 text-red-400 rounded-lg flex items-center gap-2 text-left cursor-pointer font-bold transition-colors">
                              <Trash2 className="w-3.5 h-3.5 text-red-400" /> BORRAR MENSAJE
                            </button>

                            {msg.user_id !== currentUserId && (
                              <>
                                <button onClick={() => handleBlockUser(msg.user_id, realName)} className="px-2.5 py-1.5 hover:bg-red-950/80 text-red-400 rounded-lg flex items-center gap-2 text-left cursor-pointer transition-colors">
                                  <Ban className="w-3.5 h-3.5 text-red-400" /> BLOQUEAR
                                </button>
                                <button onClick={() => handleReportUser(msg.user_id, realName)} className="px-2.5 py-1.5 hover:bg-amber-950/80 text-amber-400 rounded-lg flex items-center gap-2 text-left cursor-pointer transition-colors">
                                  <Flag className="w-3.5 h-3.5 text-amber-400" /> REPORTAR USUARIO
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )
              )}
              <div ref={messagesEndRef} />
            </div>

            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="p-2.5 bg-neutral-950/95 border-t border-cyan-500/40 grid grid-cols-8 gap-1.5 text-center text-sm font-mono backdrop-blur-md relative z-40 shrink-0">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button key={emoji} type="button" onClick={() => handleAddEmoji(emoji)} className="p-1.5 hover:bg-cyan-950/80 rounded border border-transparent hover:border-cyan-500/40 cursor-pointer transition-all hover:scale-110">
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSend} className="p-2.5 bg-black/90 border-t border-cyan-900/50 flex items-center gap-2 shrink-0">
              <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-2 rounded-lg border transition-colors cursor-pointer ${showEmojiPicker ? 'bg-cyan-950 text-cyan-300 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'bg-neutral-900 hover:bg-cyan-950/80 border-cyan-900/60 hover:border-cyan-500/50 text-cyan-400'}`}>
                <Smile className="w-4 h-4" />
              </button>

              <input
                ref={inputRef}
                type="text"
                placeholder={activeChannel === 'PRIVADO' ? activeDmPartner ? `DM A @${profilesMap[activeDmPartner.id]?.username || activeDmPartner.name}...` : "SELECCIONA UN PILOTO..." : `TRANSMITIR A #${activeChannel.toLowerCase()}...`}
                value={inputContent}
                onChange={(e) => setInputContent(e.target.value)}
                disabled={activeChannel === 'PRIVADO' && !activeDmPartner}
                className="flex-1 bg-black border border-cyan-950 focus:border-cyan-500 disabled:opacity-50 rounded-lg px-3 py-2 text-[9px] font-mono text-cyan-200 placeholder-zinc-600 outline-none uppercase"
              />

              <button type="submit" disabled={activeChannel === 'PRIVADO' && !activeDmPartner} className="p-2 bg-gradient-to-br from-cyan-600 to-teal-700 hover:brightness-110 disabled:opacity-50 text-white rounded-lg cursor-pointer transition-all shadow-[0_0_10px_rgba(6,182,212,0.4)]">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ChatSystem;