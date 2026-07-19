import apiClient from "../services/apiClient";
import { unwrapData } from "../lib/response";

// Raw notification shape from REST/WebSocket. Fields kept loose/optional because
// the backend response is not strictly typed and the mapper reads several aliases.
export interface ApiNotification {
  id?: string;
  notification_id?: string;
  _id?: string;
  uuid?: string;
  tipe?: string;
  type?: string;
  tipe_notif?: string;
  judul?: string;
  title?: string;
  pesan?: string;
  message?: string;
  created_at?: string;
  createdAt?: string;
  is_read?: boolean;
  read?: boolean;
  pengirim?: { nama_lengkap?: string } | null;
  [key: string]: unknown;
}

export interface NotifikasiGrouped {
  hari_ini: ApiNotification[];
  kemarin: ApiNotification[];
}

export async function getNotifikasi(): Promise<NotifikasiGrouped | null> {
  try {
    const raw = await apiClient.get<Record<string, unknown>>("/api/notifikasi");
    const data = unwrapData<Record<string, unknown>>(raw);
    return {
      hari_ini: (data?.hari_ini as ApiNotification[] | undefined) ?? [],
      kemarin: (data?.kemarin as ApiNotification[] | undefined) ?? [],
    };
  } catch { return null; }
}

export async function markOneRead(id: string) {
  return apiClient.patch(`/api/notifikasi/${id}/read`);
}

export async function markAllNotificationsRead() {
  return apiClient.patch("/api/notifikasi/read-all");
}

export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const data = await apiClient.get<{ data: number }>("/api/notifikasi/unread-count");
    return typeof data?.data === "number" ? data.data : 0;
  } catch { return 0; }
}
