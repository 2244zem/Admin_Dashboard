import { apiClient, unwrapData, type ApiResponse } from "./client";

export type ApiNotification = Record<string, any>;

export interface NotifikasiGrouped {
  hari_ini: ApiNotification[];
  kemarin: ApiNotification[];
}

export async function getNotifikasi() {
  const response = await apiClient.get<ApiResponse<NotifikasiGrouped> | NotifikasiGrouped>("/api/notifikasi");
  return unwrapData(response);
}

export async function markOneRead(id: string) {
  const response = await apiClient.patch<ApiResponse<unknown> | unknown>(`/api/notifikasi/${id}/read`);
  return unwrapData(response);
}

export async function markAllNotificationsRead() {
  const response = await apiClient.patch<ApiResponse<unknown> | unknown>("/api/notifikasi/read-all");
  return unwrapData(response);
}

export async function getUnreadNotificationCount() {
  const response = await apiClient.get<ApiResponse<unknown> | unknown>("/api/notifikasi/unread-count");
  return unwrapData(response);
}
