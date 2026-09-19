import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { isOfficialComunicado } from '../components/NotificationsView';

export interface NotificationRecord {
  notification_id: string;
  user_id: string;
  title: string;
  message: string;
  category?: string;
  box_type?: string;
  is_read: boolean;
  created_at: string;
  action_url?: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('expedition_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped: NotificationRecord[] = data.map((item: any) => ({
          notification_id: item.id?.toString() || item.notification_id?.toString() || Math.random().toString(),
          user_id: item.user_id,
          title: item.title || 'COMUNICADO OFICIAL',
          message: item.message || '',
          category: item.event_type || item.category || 'EXPEDITION',
          box_type: item.box_type || item.category,
          is_read: item.is_read ?? false,
          created_at: item.created_at || new Date().toISOString(),
          action_url: item.action_url
        }));
        setNotifications(mapped);
      }
    } catch (err) {
      console.error("Error cargando comunicados:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    let channel: any;
    const subscribeRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`realtime_comunicados_count_${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'expedition_logs', filter: `user_id=eq.${user.id}` },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();
    };

    subscribeRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchNotifications]);

  // 🎯 FILTRADO STRICTO: Cuenta ÚNICAMENTE Comunicados Oficiales NO leídos
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.is_read && isOfficialComunicado(n)).length;
  }, [notifications]);

  const markAsRead = async (notificationId: string) => {
    setNotifications(prev => prev.map(n => n.notification_id === notificationId ? { ...n, is_read: true } : n));
    await supabase.from('expedition_logs').update({ is_read: true }).eq('id', notificationId);
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await supabase.from('expedition_logs').update({ is_read: true }).eq('user_id', user.id);
  };

  const deleteNotification = async (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.notification_id !== notificationId));
    await supabase.from('expedition_logs').delete().eq('id', notificationId);
  };

  const deleteAllNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setNotifications([]);
    await supabase.from('expedition_logs').delete().eq('user_id', user.id);
  };

  return {
    notifications,
    unreadCount,
    loading,
    refresh: fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications
  };
};

export default useNotifications;