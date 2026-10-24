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
  const [userId, setUserId] = useState<string | null>(null);

  // Inicializar el usuario
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id);
    }).catch(() => {});
  }, []);

  // 1. Cargar notificaciones desde la base de datos (Filtro booleano estricto y select general)
  const fetchNotifications = useCallback(async (currentUserId?: string) => {
    let uid = currentUserId || userId;
    if (!uid) {
      try {
        const { data } = await supabase.auth.getUser();
        uid = data?.user?.id || null;
      } catch {}
    }
    if (!uid) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', uid)
        .eq('is_read', false) // <-- DEBE SER BOOLEANO ESTRICTO
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[NOTIFICATIONS] Silenced 400/schema issue in notifications fetch:', error.message);
        return;
      }

      if (data) {
        const mapped: NotificationRecord[] = data.map((item: any) => ({
          notification_id: String(item.notification_id || item.id || Math.random()),
          user_id: item.user_id,
          title: item.title || 'COMUNICADO OFICIAL',
          message: item.message || '',
          category: item.category || 'EXPEDITION',
          box_type: item.box_type || item.category,
          is_read: Boolean(item.is_read),
          created_at: item.created_at || new Date().toISOString(),
          action_url: item.action_url
        }));
        setNotifications(mapped);
      }
    } catch (err: any) {
      // Evita inundar la consola de DevTools ante cortes de red o esquemas en transición
      console.warn('[NOTIFICATIONS] Fallo de red recuperable en notificaciones:', err?.message || err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // 2. Manejo unificado de Realtime (sin funciones independientes)
  useEffect(() => {
    if (!userId) return;
    
    fetchNotifications(userId);
    let channel: any;
    
    const initRealtime = async () => {
      try {
        const channelName = `realtime_user_notifications_${userId}`;
        
        // Desuscribir canal previo si ya existía en la memoria de Supabase
        const existing = supabase.getChannels().find((ch) => (ch as any).name === channelName || ch.topic === channelName || ch.topic === `realtime:${channelName}`);
        if (existing) {
          await supabase.removeChannel(existing);
        }
        
        // Crear nuevo canal de forma sincrónica: .on() SIEMPRE antes de .subscribe()
        channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'user_notifications',
              filter: `user_id=eq.${userId}`,
            },
            () => {
              fetchNotifications(userId);
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('[REALTIME] Suscrito exitosamente a notificaciones');
            }
          });
      } catch (err: any) {
        console.warn('[REALTIME] Error silenciado en suscripción:', err?.message || err);
      }
    };

    initRealtime();
      
    return () => {
      if (channel) supabase.removeChannel(channel).catch(() => {});
    };
  }, [userId, fetchNotifications]);

  // 🎯 FILTRADO STRICTO: Cuenta ÚNICAMENTE Comunicados Oficiales NO leídos
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.is_read && isOfficialComunicado(n)).length;
  }, [notifications]);

  // 3. Métodos auxiliares protegidos
  const markAsRead = async (notificationId: string) => {
    if (!userId) return;
    try {
      await supabase.from('user_notifications').update({ is_read: true }).eq('notification_id', notificationId).eq('user_id', userId);
      fetchNotifications(userId);
    } catch (err) {
      console.warn('[NOTIFICATIONS] Error en markAsRead:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    try {
      await supabase.from('user_notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
      fetchNotifications(userId);
    } catch (err) {
      console.warn('[NOTIFICATIONS] Error en markAllAsRead:', err);
    }
  };
  
  const deleteNotification = async (notificationId: string) => {
    if (!userId) return;
    try {
      await supabase.from('user_notifications').delete().eq('notification_id', notificationId).eq('user_id', userId);
      fetchNotifications(userId);
    } catch (err) {
      console.warn('[NOTIFICATIONS] Error en deleteNotification:', err);
    }
  };

  const deleteAllNotifications = async () => {
    if (!userId) return;
    try {
      await supabase.from('user_notifications').delete().eq('user_id', userId);
      fetchNotifications(userId);
    } catch (err) {
      console.warn('[NOTIFICATIONS] Error en deleteAllNotifications:', err);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    refresh: () => fetchNotifications(userId || undefined),
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications
  };
};

export default useNotifications;