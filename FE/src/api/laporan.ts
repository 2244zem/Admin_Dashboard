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

function unwrapData<T>(response: any): T {
  return response?.data ?? response;
}

export async function getUserProfile(params?: UserProfileParams) {
  const response = await apiClient.get<any>("/api/user/profile", { params });
  return unwrapData<unknown>(response);
}

export async function updateUserProfile(payload: FormData) {
  const response = await apiClient.patch<any>("/api/user/profile", payload);
  return unwrapData<unknown>(response);
}

export async function getAdminLaporan(params?: AdminLaporanParams) {
  const response = await apiClient.get<any>("/api/admin/laporan", { params });
  return unwrapData<unknown>(response);
}

export async function getAdminLaporanDetail(id: string) {
  const response = await apiClient.get<any>(`/api/admin/laporan/${id}`);
  return unwrapData<ApiLaporan>(response);
}

export async function updateAdminLaporan(id: string, payload: Partial<ApiLaporan>) {
  const response = await apiClient.patch<any>(`/api/admin/laporan/${id}`, payload);
  return unwrapData<ApiLaporan>(response);
}

export async function deleteAdminLaporan(id: string) {
  const response = await apiClient.delete<any>(`/api/admin/laporan/${id}`);
  return unwrapData(response);
}
