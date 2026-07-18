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
  // ADMIN_MENUGASKAN_OB, LAPORAN_BARU, LAPORAN_DIKERJAKAN, LAPORAN_DIBATALKAN
  if (value.includes("LAPORAN") || value.includes("ADMIN_MENUGASKAN")) return "laporan";
  // GABUNG_LAPORAN, GABUNG_DISETUJUI, GABUNG_DIBATALKAN, KELUAR_KOLABORASI,
  // DIKELUARKAN_KOLABORASI, KOLABORASI_DIBUKA
  if (value.includes("GABUNG") || value.includes("KOLABORASI") || value.includes("KELUAR") || value.includes("DIKELUARKAN")) return "laporan";
  // PENUGASAN_CHECKLIST
  if (value.includes("CHECKLIST") || value.includes("TUGAS")) return "tugas";
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
      const unreadCountFromApi = await getUnreadNotificationCount();

      const merged = [
        ...(grouped?.hari_ini || []),
        ...(grouped?.kemarin || []),
      ].map(mapApiNotificationToAppNotification);

      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setNotifications(merged);

      // Calculate unread count - use API value, fallback to counting from notifications list
      let count = unreadCountFromApi;
      if (count === 0 && merged.length > 0) {
        // Fallback: count from notifications array (filter unread ones)
        count = merged.filter(n => !n.read).length;
      }

      setUnreadCount(Number.isFinite(count) ? count : 0);
    } catch {
      // Silent fail for notifications
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    fetchNotifications();

    // Polling 60dtk sebagai safety net jika WebSocket terputus/missed message.
    const interval = window.setInterval(fetchNotifications, 60_000);

    return () => window.clearInterval(interval);
  }, [isAuthenticated, fetchNotifications]);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Cleanup function untuk disconnect WebSocket
    return connectNotificationSocket({
      onNotification: (payload) => {
        if ((payload as any)?.type === "CONNECTED") return;

        try {
          const notification = mapApiNotificationToAppNotification(payload as ApiNotification);

          setNotifications((prev) => {
            // Deduplicate by id
            if (prev.some((n) => n.id === notification.id)) return prev;
            return [notification, ...prev];
          });

          if (!notification.read) {
            setUnreadCount((prev) => prev + 1);
          }
        } catch {
          // Silent fail
        }
      },
      onConnected: () => {},
      onError: () => {},
    });
  }, [isAuthenticated]);

  const markAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // API fail — refetch agar count & list tetap sinkron
      fetchNotifications();
    }
  };

  const markRead = async (id: string) => {
    try {
      await markOneRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // API fail — refetch agar count & list tetap sinkron
      fetchNotifications();
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
