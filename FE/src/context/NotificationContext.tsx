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
import { useAuth } from "./AuthContext";

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
  // Field sesuai kontrak backend:
  // id, tipe, judul, pesan, is_read, created_at, pengirim.nama_lengkap
  const rawId = row.id ?? row.notification_id ?? row._id ?? row.uuid ?? "";
  const type = row.tipe ?? row.type ?? row.tipe_notif ?? "";
  const title = row.judul ?? row.title ?? "Notifikasi";
  const message = row.pesan ?? row.message ?? "";
  const createdAt = row.created_at ?? row.createdAt ?? new Date().toISOString();
  const isRead = row.is_read ?? row.read ?? false;
  const senderName = row.pengirim?.nama_lengkap ?? "";

  // Fallback id agar React key & dedupe tetap unik bila backend tak mengembalikan id.
  const id = String(rawId) || `notif-${String(createdAt)}-${String(title)}-${String(message)}`;

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
  const { isAuthenticated } = useAuth();

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const grouped = await getNotifikasi();
      const unreadPayload: unknown = await getUnreadNotificationCount();

      const merged = [
        ...(grouped?.hari_ini || []),
        ...(grouped?.kemarin || []),
      ].map(mapApiNotificationToAppNotification);

      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setNotifications(merged);

      // Parse unread count - handle different response formats
      let count = 0;
      if (typeof unreadPayload === "number") {
        count = unreadPayload;
      } else if (unreadPayload && typeof unreadPayload === "object") {
        const obj = unreadPayload as { unread_count?: number; unreadCount?: number; count?: number };
        count = obj.unread_count ?? obj.unreadCount ?? obj.count ?? 0;
      }

      setUnreadCount(Number.isFinite(count) ? count : 0);
    } catch {
      // Silent fail for notifications
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    fetchNotifications();

    // Poll setiap 30 detik (backup jika WebSocket gagal)
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchNotifications();
      }
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [isAuthenticated, fetchNotifications]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Cleanup function untuk disconnect WebSocket
    return connectNotificationSocket({
      onNotification: (payload) => {
        // Skip jika CONNECTED event (bukan notifikasi asli)
        if ((payload as any)?.type === "CONNECTED") {
          return;
        }

        try {
          const notification = mapApiNotificationToAppNotification(payload as ApiNotification);

          // Composite key untuk deduplication yang lebih robust
          const getNotifKey = (n: AppNotification) =>
            `${n.title}|${n.message}|${n.createdAt}`;

          // Check if notification already exists (avoid duplicates)
          setNotifications((prev) => {
            const exists =
              prev.some((n) => n.id === notification.id) ||
              prev.some((n) => getNotifKey(n) === getNotifKey(notification));
            if (exists) {
              return prev;
            }
            return [notification, ...prev];
          });

          // Increment unread count only for unread notifications
          if (!notification.read) {
            setUnreadCount((prev) => prev + 1);
          }
        } catch {
          // Silent fail for notification mapping
        }
      },
      onConnected: () => {
        // Connected
      },
      onError: () => {
        // Silent fail for WebSocket errors
      },
    });
  }, [isAuthenticated]);

  const markAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
      setUnreadCount(0);
    } catch {
      // Silent fail for mark all read
    }
  };

  const markRead = async (id: string) => {
    try {
      await markOneRead(id);
      setNotifications((prev) =>
        prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silent fail for mark read
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
