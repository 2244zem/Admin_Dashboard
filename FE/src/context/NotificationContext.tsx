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

  // Fetch initial notifications
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
        setNotifications(merged);
      }

      // Use API count if available, otherwise count from list
      setUnreadCount(count > 0 ? count : unreadFromList);
    } catch {
      // Silent fail - keep existing state
    }
  }, []);

  // Initial fetch + WebSocket connection
  useEffect(() => {
    void (async () => {
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
          setNotifications(merged);
        }

        setUnreadCount(count > 0 ? count : unreadFromList);
      } catch {
        // Silent fail - keep existing state
      }
    })();
  }, []);

  useEffect(() => {
    const cleanup = connectNotificationSocket({
      onNotification: (payload) => {
        if ((payload as { type?: unknown })?.type === "CONNECTED") {
          setIsConnected(true);
          return;
        }

        try {
          const notification = mapApiNotificationToAppNotification(payload as ApiNotification);

          // Deduplicate by ID
          setNotifications((prev) => {
            if (prev.some(n => n.id === notification.id)) return prev;
            return [notification, ...prev];
          });

          // Increment unread count only if not already read
          if (!notification.read) {
            setUnreadCount((prev) => prev + 1);
          }
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
