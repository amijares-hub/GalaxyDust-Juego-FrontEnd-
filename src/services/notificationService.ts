import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface NotificationRecord {
  notification_id: string;
  category: string;
  box_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 🎯 Consulta unificada de logs de expedición y notificaciones de sistema
      const { data, error } = await supabase
        .from('expedition_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const formatted: NotificationRecord[] = data.map((item: any) => ({
          notification_id: item.id?.toString(),
          category: item.category || item.event_type || 'EXPEDITION',
          box_type: item.box_type || 'EXPEDITION',
          title: item.title || 'INFORME DE EXPEDICIÓN',
          message: item.message || 'Misión completada con éxito.',
          is_read: Boolean(item.is_read),
          created_at: item.created_at || new Date().toISOString()
        }));

        setNotifications(formatted);
        setUnreadCount(formatted.filter(n => !n.is_read).length);
      }
    } catch (err) {
      console.error("Error al cargar comunicaciones:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    await supabase.from('expedition_logs').update({ is_read: true }).eq('id', id);
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    await supabase.from('expedition_logs').update({ is_read: true }).eq('user_id', user.id);
  };

  const deleteNotification = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.notification_id !== id));
    await supabase.from('expedition_logs').delete().eq('id', id);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification, refresh: fetchNotifications };
};