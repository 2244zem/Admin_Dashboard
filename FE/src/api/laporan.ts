import apiClient from "../services/apiClient";

export interface UserProfileParams {
  search?: string;
  status?: string;
  cursor?: string;
  limit?: number;
}

export interface AdminLaporanParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  prioritas?: string;
  lokasi_id?: string;
  lantai_id?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: "created_at" | "updated_at" | "prioritas" | "status" | "nama_karyawan" | "lokasi";
  sort_order?: "asc" | "desc";
}

export type ApiLaporan = Record<string, unknown>;

export async function getUserProfile(params?: UserProfileParams) {
  return apiClient.get<unknown>("/api/user/profile", { params });
}

export async function updateUserProfile(payload: FormData) {
  return apiClient.patch<unknown>("/api/user/profile", payload);
}

export async function getAdminLaporan(params?: AdminLaporanParams) {
  return apiClient.get<unknown>("/api/admin/laporan", { params });
}

export async function getAdminLaporanDetail(id: string) {
  return apiClient.get<ApiLaporan>(`/api/admin/laporan/${id}`);
}

export async function updateAdminLaporan(id: string, payload: Partial<ApiLaporan>) {
  return apiClient.patch<ApiLaporan>(`/api/admin/laporan/${id}`, payload);
}

export async function deleteAdminLaporan(id: string) {
  return apiClient.delete(`/api/admin/laporan/${id}`);
}
