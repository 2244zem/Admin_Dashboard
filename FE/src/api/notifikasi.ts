import apiClient from "../services/apiClient";

export type ApiNotification = Record<string, any>;

export interface NotifikasiGrouped {
  hari_ini: ApiNotification[];
  kemarin: ApiNotification[];
}

function unwrapData<T>(response: any): T {
  return response?.data ?? response;
}

function toArray(value: unknown): ApiNotification[] {
  return Array.isArray(value) ? (value as ApiNotification[]) : [];
}

/**
 * Ekstrak notifikasi grouped dari response.
 * Kontrak resmi: { success, message, data: { hari_ini: [...], kemarin: [...] } }
 */
function extractNotifications(payload: any): { hari_ini: ApiNotification[]; kemarin: ApiNotification[] } {
  const data = payload?.data ?? payload;
  return {
    hari_ini: toArray(data?.hari_ini),
    kemarin: toArray(data?.kemarin),
  };
}

export async function getNotifikasi(): Promise<NotifikasiGrouped | null> {
  try {
    const raw = await apiClient.get<any>("/api/notifikasi");
    console.log("📬 Raw notifikasi response:", raw);

    // unwrapData: { success, message, data: {...} } -> { hari_ini, kemarin }
    const payload = unwrapData<NotifikasiGrouped>(raw);
    const grouped = extractNotifications(payload);
    console.log("📬 Parsed notifikasi grouped:", grouped);

    return grouped;
  } catch (err) {
    console.error("❌ Failed to fetch notifications:", err);
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
    const raw = await apiClient.get<any>("/api/notifikasi/unread-count");
    console.log("🔢 Raw unread count response:", raw);

    // unwrapData: { success, message, data: 0 } -> 0
    const data = unwrapData<number>(raw);
    if (typeof data === "number") return data;
    return 0;
  } catch (err) {
    console.error("❌ Failed to fetch unread count:", err);
    return 0;
  }
}
