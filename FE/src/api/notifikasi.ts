import apiClient from "../services/apiClient";
import { unwrapData } from "../lib/response";

export interface NotifikasiGrouped {
  hari_ini: any[];
  kemarin: any[];
}

export async function getNotifikasi(): Promise<NotifikasiGrouped | null> {
  try {
    const raw = await apiClient.get<any>("/api/notifikasi");
    const data = unwrapData<any>(raw);
    return {
      hari_ini: data?.hari_ini ?? [],
      kemarin: data?.kemarin ?? [],
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
