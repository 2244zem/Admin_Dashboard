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
  const value = String(type || "").toLowerCase();
  if (value.includes("tugas") || value.includes("checklist")) return "tugas";
  if (value.includes("user") || value.includes("akun")) return "user";
  if (value.includes("ingat") || value.includes("reminder")) return "pengingat";
  return "laporan";
}

export function mapApiNotificationToAppNotification(row: ApiNotification): AppNotification {
  return {
    id: String(row.id),
    type: mapNotifType(row.tipe || row.type),
    title: row.judul || row.title || "Notifikasi",
    message: row.pesan || row.message || "",
    highPriority: String(row.tipe || row.type || "").toUpperCase().includes("URGENT"),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    read: Boolean(row.is_read ?? row.read),
  };
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isAuthenticated } = useAuth();

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    const [grouped, unreadPayload] = await Promise.all([
      getNotifikasi(),
      getUnreadNotificationCount(),
    ]);

    const merged = [
      ...(grouped?.hari_ini || []),
      ...(grouped?.kemarin || []),
    ].map(mapApiNotificationToAppNotification);

    merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setNotifications(merged);

    const count =
      typeof unreadPayload === "number"
        ? unreadPayload
        : Number(
            (unreadPayload as { unread_count?: unknown; unreadCount?: unknown; count?: unknown })?.unread_count ??
              (unreadPayload as { unreadCount?: unknown })?.unreadCount ??
              (unreadPayload as { count?: unknown })?.count ??
              0,
          );
    setUnreadCount(Number.isFinite(count) ? count : 0);
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotifications().catch(() => {});
    // Poll every 10 seconds for faster updates (backup if WebSocket fails)
    const interval = window.setInterval(() => {
      fetchNotifications().catch(() => {});
    }, 10000);

    return () => window.clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!isAuthenticated) return;

    return connectNotificationSocket({
      onNotification: (payload) => {
        const notification = mapApiNotificationToAppNotification(payload);
        setNotifications((prev) => [notification, ...prev.filter((item) => item.id !== notification.id)]);
      },
    });
  }, [isAuthenticated]);

  const markAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
    setUnreadCount(0);
  };

  const markRead = async (id: string) => {
    await markOneRead(id);
    setNotifications((prev) =>
      prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    );
    setUnreadCount((count) => Math.max(0, count - 1));
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
