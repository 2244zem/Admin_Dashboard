import apiClient from "../services/apiClient";
import { unwrapData } from "../lib/response";

export interface AdminLaporanParams {
  page?: number; limit?: number; search?: string; status?: string; prioritas?: string;
  lokasi_id?: string; lantai_id?: string; start_date?: string; end_date?: string;
  sort_by?: "created_at" | "updated_at" | "prioritas" | "status" | "nama_karyawan" | "lokasi";
  sort_order?: "asc" | "desc";
}

export async function getUserProfile(params?: any) {
  const data = await apiClient.get<any>("/api/user/profile", { params });
  return unwrapData(data);
}

export async function updateUserProfile(payload: FormData) {
  return apiClient.patch("/api/user/profile", payload);
}

export async function getAdminLaporan(params?: AdminLaporanParams) {
  const data = await apiClient.get<any>("/api/admin/laporan", { params });
  return unwrapData(data);
}

export async function getAdminLaporanDetail(id: string) {
  const data = await apiClient.get<any>(`/api/admin/laporan/${id}`);
  return unwrapData(data);
}

export async function updateAdminLaporan(id: string, payload: any) {
  return apiClient.patch(`/api/admin/laporan/${id}`, payload);
}

export async function deleteAdminLaporan(id: string) {
  return apiClient.delete(`/api/admin/laporan/${id}`);
}
