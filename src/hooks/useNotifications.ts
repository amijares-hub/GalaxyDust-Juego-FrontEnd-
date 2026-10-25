import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  const isFetchingRef = useRef(false);

  // Inicializar el usuario activo una sola vez
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id);
    }).catch(() => {});
  }, []);

  // 1. Cargar notificaciones sin forzar tipo en PostgREST (previene Error 400 de tipo de dato)
  const fetchNotifications = useCallback(async (currentUserId?: string) => {
    let uid = currentUserId || userId;
    if (!uid) {
      try {
        const { data } = await supabase.auth.getUser();
        uid = data?.user?.id || null;
      } catch {}
    }
    if (!uid || isFetchingRef.current) return;

    try {
      isFetchingRef.current = true;
      setLoading(true);

      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[NOTIFICATIONS] Consulta silenciada:', error.message);
        return;
      }

      if (data) {
        // Filtrado en memoria: soporta boolean (false), integer (0), o string ('0')
        const unreadList = data.filter((item: any) => {
          const val = item.is_read;
          return val === false || val === 0 || val === '0' || val === null || val === undefined;
        });

        const mapped: NotificationRecord[] = unreadList.map((item: any) => ({
          notification_id: String(item.id || item.notification_id || Math.random()),
          user_id: item.user_id,
          title: item.title || 'COMUNICADO OFICIAL',
          message: item.message || '',
          category: item.category || 'EXPEDITION',
          box_type: item.box_type || item.category,
          is_read: Boolean(item.is_read === true || item.is_read === 1 || item.is_read === '1'),
          created_at: item.created_at || new Date().toISOString(),
          action_url: item.action_url
        }));

        setNotifications(mapped);
      }
    } catch (err: any) {
      console.warn('[NOTIFICATIONS] Fallo de red recuperable:', err?.message || err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [userId]);

  // 2. Suscripción Realtime blindada (evita MaxListenersExceeded y fugas de memoria)
  useEffect(() => {
    if (!userId) return;

    fetchNotifications(userId);
    let channel: any = null;

    const initRealtime = async () => {
      try {
        const channelName = `realtime_user_notifications_${userId}`;

        const existing = supabase.getChannels().find(
          (ch) => (ch as any).name === channelName || ch.topic === channelName || ch.topic === `realtime:${channelName}`
        );
        if (existing) {
          await supabase.removeChannel(existing);
        }

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
          .subscribe();
      } catch (err: any) {
        console.warn('[REALTIME] Error silenciado en canal de notificaciones:', err?.message || err);
      }
    };

    initRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel).catch(() => {});
      }
    };
  }, [userId]); // Depende únicamente de userId para no re-suscribirse en bucle

  // Conteo de comunicados oficiales no leídos
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.is_read && isOfficialComunicado(n)).length;
  }, [notifications]);

  // 3. Métodos de actualización y borrado tolerantes a id / notification_id
  const markAsRead = async (notificationId: string) => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) {
        await supabase
          .from('user_notifications')
          .update({ is_read: true })
          .eq('notification_id', notificationId)
          .eq('user_id', userId);
      }
      fetchNotifications(userId);
    } catch (err) {
      console.warn('[NOTIFICATIONS] Error en markAsRead:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('user_id', userId);

      if (error) {
        await supabase
          .from('user_notifications')
          .update({ is_read: 1 })
          .eq('user_id', userId);
      }
      fetchNotifications(userId);
    } catch (err) {
      console.warn('[NOTIFICATIONS] Error en markAllAsRead:', err);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from('user_notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) {
        await supabase
          .from('user_notifications')
          .delete()
          .eq('notification_id', notificationId)
          .eq('user_id', userId);
      }
      fetchNotifications(userId);
    } catch (err) {
      console.warn('[NOTIFICATIONS] Error en deleteNotification:', err);
    }
  };

  const deleteAllNotifications = async () => {
    if (!userId) return;
    try {
      await supabase
        .from('user_notifications')
        .delete()
        .eq('user_id', userId);
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