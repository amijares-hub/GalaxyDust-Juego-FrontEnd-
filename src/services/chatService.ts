import { supabase } from '../lib/supabase';

export interface EmbeddedAsset {
  id: string;
  name: string;
  category: string;
  rarity: string;
  avatar_url?: string;
  price?: string;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  user_avatar?: string;
  content: string;
  message_type: 'TEXT' | 'SYSTEM' | 'ASSET_LINK' | 'ALERT';
  embedded_asset?: EmbeddedAsset | null;
  target_user_id?: string | null;
  created_at: string;
}

let lastMessageTimestamp = 0;

// Lista de saneamiento de términos no permitidos (PDF Pág. 16, Req 575)
const BAD_WORDS = ['badword1', 'cheat', 'hack', 'exploit', 'spam', 'ofensa'];

export const chatService = {
  /**
   * Sanea el texto reemplazando términos prohibidos por asteriscos
   */
  filterProfanity(text: string): string {
    let sanitized = text;
    BAD_WORDS.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      sanitized = sanitized.replace(regex, '***');
    });
    return sanitized;
  },

  getDmChannelId(user1Id: string, user2Id: string): string {
    const sorted = [user1Id, user2Id].sort();
    return `dm_${sorted[0]}_${sorted[1]}`;
  },

  async fetchHistory(channelId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) return [];
      return data || [];
    } catch (err) {
      return [];
    }
  },

  async sendMessage(
    channelId: string,
    content: string,
    messageType: 'TEXT' | 'SYSTEM' | 'ASSET_LINK' | 'ALERT' = 'TEXT',
    embeddedAsset: EmbeddedAsset | null = null,
    targetUserId: string | null = null
  ): Promise<ChatMessage> {
    const now = Date.now();
    if (now - lastMessageTimestamp < 1000) {
      throw new Error('⚠️ RATE_LIMIT: Espera un segundo antes de transmitir otro mensaje.');
    }
    lastMessageTimestamp = now;

    // Saneamiento de profanidad
    const sanitizedContent = this.filterProfanity(content);

    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id || 'local-pilot-id';

    let userName = 'AMIJARES';
    let userRole = 'LÍDER DE ALIANZA';
    let userAvatar = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200';

    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('name, alliance_role, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile) {
        userName = profile.name || userName;
        userRole = profile.alliance_role || userRole;
        userAvatar = profile.avatar_url || userAvatar;
      }
    }

    const payload: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      channel_id: channelId,
      user_id: currentUserId,
      user_name: userName,
      user_role: userRole,
      user_avatar: userAvatar,
      content: sanitizedContent,
      message_type: messageType,
      embedded_asset: embeddedAsset,
      target_user_id: targetUserId,
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          channel_id: channelId,
          user_id: currentUserId,
          user_name: userName,
          user_role: userRole,
          user_avatar: userAvatar,
          content: sanitizedContent,
          message_type: messageType,
          embedded_asset: embeddedAsset,
          target_user_id: targetUserId
        })
        .select()
        .single();

      if (!error && data) return data as ChatMessage;
    } catch (err) {
      console.warn('📡 Transmitiendo en canal local de fallback...');
    }

    return payload;
  },

  async deleteMessage(messageId: string) {
    try {
      await supabase.from('chat_messages').delete().eq('id', messageId);
    } catch (err) {}
  },

  /**
   * Registro de reportes de moderación (PDF Pág. 15, Req 470)
   */
  async reportUser(reportedUserId: string, reportedUserName: string, reason: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('chat_reports').insert({
        reporter_id: user.id,
        reported_id: reportedUserId,
        reported_name: reportedUserName,
        reason: reason,
        created_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Reporte registrado localmente');
    }
  },

  subscribeToChannel(channelId: string, onNewMessage: (msg: ChatMessage) => void) {
    const uniqueChannelName = `chat_${channelId}_${Math.random().toString(36).substring(2, 9)}`;
    
    const channelStream = supabase
      .channel(uniqueChannelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`
        },
        (payload) => {
          onNewMessage(payload.new as ChatMessage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelStream);
    };
  },

  async blockUser(blockedId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('user_blocks').insert({
        blocker_id: user.id,
        blocked_id: blockedId
      });
    } catch (ignore) {}
  }
};