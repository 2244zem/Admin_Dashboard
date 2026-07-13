import { apiClient, unwrapData, type ApiResponse, type QueryParams } from "./client";

export interface UserProfileParams extends QueryParams {
  search?: string;
  status?: string;
  cursor?: string;
  limit?: number;
}

export interface AdminLaporanParams extends QueryParams {
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
  const response = await apiClient.get<unknown>("/api/user/profile", params);
  return unwrapData(response);
}

export async function updateUserProfile(payload: FormData) {
  const response = await apiClient.patch<unknown>("/api/user/profile", payload);
  return unwrapData(response);
}

export async function getAdminLaporan(params?: AdminLaporanParams) {
  const response = await apiClient.get<unknown>("/api/admin/laporan", params);
  return unwrapData(response);
}

export async function getAdminLaporanDetail(id: string) {
  const response = await apiClient.get<ApiResponse<ApiLaporan> | ApiLaporan>(`/api/admin/laporan/${id}`);
  return unwrapData(response);
}
