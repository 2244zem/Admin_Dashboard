import { createContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import type { AppNotification } from "../types/notification";
import {
  getNotifikasi,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markOneRead,
  type ApiNotification,
} from "../api/notifikasi";
import { connectNotificationSocket } from "../api/websocket";
import { mapApiNotificationToAppNotification } from "../lib/notificationMapper";
import { getPhotoMaps, resolveAssetUrl } from "../lib/assets";
import { queryClient } from "../lib/queryClient";

// Attach sender profile photos (resolved against the API origin) to notifications.
async function withSenderPhotos(list: AppNotification[]): Promise<AppNotification[]> {
  if (list.every((n) => n.senderPhoto || (!n.senderId && !n.senderName))) return list;
  const map = await getPhotoMaps();
  return list.map((n) => {
    if (n.senderPhoto) return n;
    const raw = n.senderId
      ? map.get(n.senderId)
      : n.senderName
        ? map.get(n.senderName.toLowerCase())
        : undefined;
    return raw ? { ...n, senderPhoto: resolveAssetUrl(raw) } : n;
  });
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  isConnected: boolean;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch initial notifications (also used by fetchNotifications for manual refresh)
  const fetchNotifications = useCallback(async () => {
    try {
      const [grouped, count] = await Promise.all([
        getNotifikasi(),
        getUnreadNotificationCount(),
      ]);

      let unreadFromList = 0;
      if (grouped) {
        const merged: AppNotification[] = [
          ...grouped.hari_ini.map(mapApiNotificationToAppNotification),
          ...grouped.kemarin.map(mapApiNotificationToAppNotification),
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        unreadFromList = merged.filter((n) => !n.read).length;
        setNotifications(await withSenderPhotos(merged));
      }

      setUnreadCount(count > 0 ? count : unreadFromList);
    } catch {
      // Silent fail - keep existing state
    }
  }, []);

  // Initial fetch + WebSocket connection
  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const cleanup = connectNotificationSocket({
      onNotification: async (payload) => {
        if ((payload as { type?: unknown })?.type === "CONNECTED") {
          setIsConnected(true);
          return;
        }

        try {
          const notification = mapApiNotificationToAppNotification(payload as ApiNotification);

          const map = await getPhotoMaps();
          const raw = notification.senderId
            ? map.get(notification.senderId)
            : notification.senderName
              ? map.get(notification.senderName.toLowerCase())
              : undefined;
          const enriched: AppNotification = raw
            ? { ...notification, senderPhoto: resolveAssetUrl(raw) }
            : notification;

          // Deduplicate by ID
          setNotifications((prev) => {
            if (prev.some(n => n.id === enriched.id)) return prev;
            return [enriched, ...prev];
          });

          // Increment unread count only if not already read
          if (!notification.read) {
            setUnreadCount((prev) => prev + 1);
          }

          // Real-time: invalidate relevant queries based on notification type
          const tipe = (payload as { tipe?: string })?.tipe;
          if (tipe === "LAPORAN_BARU" || tipe === "ADMIN_MENUGASKAN_OB") {
            queryClient.invalidateQueries({ queryKey: ["laporan"] });
          }
          if (tipe === "PENUGASAN_CHECKLIST" || tipe === "LAPORAN_BERES" || tipe === "LAPORAN_DIBATALKAN") {
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
          }
          if (tipe === "ADMIN_MENUGASKAN_OB" || tipe === "LAPORAN_DIKERJAKAN" || tipe === "LAPORAN_BERES") {
            queryClient.invalidateQueries({ queryKey: ["ob"] });
          }
          // Also invalidate users list for user creation/activation events
          queryClient.invalidateQueries({ queryKey: ["users"] });
        } catch {
          // Silent fail
        }
      },
      onConnected: () => setIsConnected(true),
      onError: () => setIsConnected(false),
    });

    return cleanup;
  }, []);

  const markRead = async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await markOneRead(id);
    } catch {
      // Revert on error
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: false } : n))
      );
      setUnreadCount((prev) => prev + 1);
    }
  };

  const markAllRead = async () => {
    const prevNotifications = [...notifications];
    const prevCount = unreadCount;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await markAllNotificationsRead();
    } catch {
      // Revert on error
      setNotifications(prevNotifications);
      setUnreadCount(prevCount);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isConnected,
        markAllRead,
        markRead,
        fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export { NotificationContext };
