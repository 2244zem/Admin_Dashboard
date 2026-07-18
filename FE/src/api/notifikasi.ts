import apiClient from "../services/apiClient";

export type ApiNotification = Record<string, any>;

export interface NotifikasiGrouped {
  hari_ini: ApiNotification[];
  kemarin: ApiNotification[];
}

export async function getNotifikasi(): Promise<NotifikasiGrouped | null> {
  try {
    // axios interceptor unwraps to { success, message, data: {...} }
    // data = { hari_ini: [...], kemarin: [...] }
    const payload = await apiClient.get<NotifikasiGrouped>("/api/notifikasi");
    const data = (payload as any)?.data ?? payload;
    return {
      hari_ini: Array.isArray(data?.hari_ini) ? data.hari_ini : [],
      kemarin: Array.isArray(data?.kemarin) ? data.kemarin : [],
    };
  } catch {
    return null;
  }
}

export async function markOneRead(id: string): Promise<void> {
  await apiClient.patch(`/api/notifikasi/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.patch("/api/notifikasi/read-all");
}

export async function getUnreadNotificationCount(): Promise<number> {
  try {
    // apiClient sudah unwrap response.data, jadi langsung dapat angka.
    const raw = await apiClient.get<number>("/api/notifikasi/unread-count");
    return typeof raw === "number" ? raw : 0;
  } catch {
    return 0;
  }
}
