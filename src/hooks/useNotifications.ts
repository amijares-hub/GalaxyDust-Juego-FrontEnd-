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

  // 🎯 CONSULTA A LA TABLA OFICIAL DE NOTIFICACIONES `user_notifications`
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
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const formatted: NotificationRecord[] = data.map((item: any) => ({
          notification_id: (item.notification_id || item.id)?.toString(),
          category: item.category || 'SYSTEM',
          box_type: item.box_type || item.category || 'SYSTEM',
          title: item.title || 'COMUNICADO C.A.N.',
          message: item.message || 'Sin mensaje especificado.',
          action_url: item.action_url || null,
          is_read: Boolean(item.is_read),
          created_at: item.created_at || new Date().toISOString()
        }));

        setNotifications(formatted);
        setUnreadCount(formatted.filter(n => !n.is_read).length);
      }
    } catch (err) {
      console.error("Error al cargar comunicaciones desde user_notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    await supabase.from('user_notifications').update({ is_read: true }).or(`notification_id.eq.${id},id.eq.${id}`);
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    await supabase.from('user_notifications').update({ is_read: true }).eq('user_id', user.id);
  };

  const deleteNotification = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.notification_id !== id));
    setUnreadCount(prev => {
      const target = notifications.find(n => n.notification_id === id);
      return (target && !target.is_read) ? Math.max(0, prev - 1) : prev;
    });
    await supabase.from('user_notifications').delete().or(`notification_id.eq.${id},id.eq.${id}`);
  };

  useEffect(() => {
    fetchNotifications();

    let channel: any;
    const initRealtimeStream = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`realtime_user_notifications_${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${user.id}` },
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