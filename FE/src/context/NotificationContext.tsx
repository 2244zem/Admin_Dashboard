import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import type { AppNotification, NotifType } from "../types/notification";
import {
  getNotifikasi,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markOneRead,
  type ApiNotification,
} from "../api/notifikasi";
import { connectNotificationSocket } from "../api/websocket";

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

function mapNotifType(type: unknown): NotifType {
  const value = String(type || "").toUpperCase();
  if (value.includes("TUGAS") || value.includes("CHECKLIST")) return "tugas";
  if (value.includes("USER") || value.includes("AKUN")) return "user";
  if (value.includes("INGAT") || value.includes("REMINDER")) return "pengingat";
  return "laporan";
}

export function mapApiNotificationToAppNotification(row: ApiNotification): AppNotification {
  const rawId = row.id ?? row.notification_id ?? row._id ?? row.uuid ?? "";
  const type = row.tipe ?? row.type ?? row.tipe_notif ?? "";
  const title = row.judul ?? row.title ?? "Notifikasi";
  const message = row.pesan ?? row.message ?? "";
  const createdAt = row.created_at ?? row.createdAt ?? new Date().toISOString();
  const isRead = row.is_read ?? row.read ?? false;
  const senderName = row.pengirim?.nama_lengkap ?? "";

  const id = String(rawId) || `notif-${createdAt}`;

  return {
    id: String(id),
    type: mapNotifType(type),
    title: String(title),
    message: String(message),
    highPriority: String(type).toUpperCase().includes("URGENT"),
    createdAt: String(createdAt),
    read: Boolean(isRead),
    senderName: String(senderName),
  };
}

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

      if (grouped) {
        const merged: AppNotification[] = [
          ...grouped.hari_ini.map(mapApiNotificationToAppNotification),
          ...grouped.kemarin.map(mapApiNotificationToAppNotification),
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setNotifications(merged);
      }

      // Use API count if available, otherwise count from list
      setUnreadCount(count > 0 ? count : notifications.filter(n => !n.read).length);
    } catch {
      // Silent fail - keep existing state
    }
  }, []);

  // Initial fetch + WebSocket connection
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const cleanup = connectNotificationSocket({
      onNotification: (payload) => {
        if ((payload as any)?.type === "CONNECTED") {
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
        markAllRead,
        markRead,
        fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications harus digunakan di dalam NotificationProvider");
  }
  return context;
}

export default useNotifications;
