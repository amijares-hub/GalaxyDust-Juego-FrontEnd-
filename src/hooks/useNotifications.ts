import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface NotificationRecord {
  notification_id: string;
  category: string;
  box_type: string;
  title: string;
  message: string;
  is_read: boolean;
  action_url?: string;
  created_at: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const getReadIds = (userId: string): Set<string> => {
    try {
      const stored = localStorage.getItem(`read_notifs_${userId}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  };

  const saveReadId = (userId: string, id: string) => {
    try {
      const readIds = getReadIds(userId);
      readIds.add(id);
      localStorage.setItem(`read_notifs_${userId}`, JSON.stringify(Array.from(readIds)));
    } catch (e) {
      console.error(e);
    }
  };

  const saveAllReadIds = (userId: string, ids: string[]) => {
    try {
      const readIds = getReadIds(userId);
      ids.forEach(id => readIds.add(id));
      localStorage.setItem(`read_notifs_${userId}`, JSON.stringify(Array.from(readIds)));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      const { data, error } = await supabase
        .from('expedition_logs')
        .select('id, user_id, expedition_id, event_type, title, message, rewards_looted, damage_sustained, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        const readIds = getReadIds(user.id);
        const formatted: NotificationRecord[] = data.map((item: any) => {
          const idStr = String(item.id || '');
          return {
            notification_id: idStr,
            category: (item.event_type || 'EXPEDITION').toUpperCase(),
            box_type: 'EXPEDITION',
            title: item.title || 'INFORME DE EXPEDICIÓN',
            message: item.message || 'Sin mensaje especificado.',
            is_read: readIds.has(idStr),
            created_at: item.created_at || new Date().toISOString()
          };
        });

        setNotifications(formatted);
        setUnreadCount(formatted.filter(n => !n.is_read).length);
      }
    } catch (err) {
      console.error("Error al cargar comunicaciones:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) saveReadId(user.id, id);
    setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    saveAllReadIds(user.id, notifications.map(n => n.notification_id));
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const deleteNotification = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.notification_id !== id));
    setUnreadCount(prev => {
      const target = notifications.find(n => n.notification_id === id);
      return (target && !target.is_read) ? Math.max(0, prev - 1) : prev;
    });
    await supabase.from('expedition_logs').delete().eq('id', id);
  };

  useEffect(() => {
    fetchNotifications();

    let channel: any;
    const initRealtimeStream = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`realtime_notifications_stream_${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'expedition_logs', filter: `user_id=eq.${user.id}` },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();
    };

    initRealtimeStream();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications
  };
};