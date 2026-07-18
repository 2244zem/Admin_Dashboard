import apiClient from "../services/apiClient";

// Types aligned with API spec in CLAUDE.md
export interface AdminLaporanParams {
  page?: number; limit?: number; search?: string; status?: string; prioritas?: string;
  lokasi_id?: string; lantai_id?: string; start_date?: string; end_date?: string;
  sort_by?: "created_at" | "updated_at" | "prioritas" | "status" | "nama_karyawan" | "lokasi";
  sort_order?: "asc" | "desc";
}

// User Profile - spec: GET /api/user/profile returns nested { user: {...}, laporan: {...} }
export interface UserProfileResponse {
  user: {
    id: string; nama_lengkap: string; username: string; email: string;
    role: string; profile_picture: string;
    total_laporan: number; tasksCompleted: number; rejected: number;
  };
  laporan: {
    items: any[];
    next_cursor: string;
    meta: { total_items: number; current_page: number; limit: number; total_pages: number };
  };
}

export async function getUserProfile(params?: { search?: string; status?: string; cursor?: string; limit?: number }) {
  const response = await apiClient.get<UserProfileResponse>("/api/user/profile", { params });
  return response;
}

export async function updateUserProfile(payload: FormData) {
  return apiClient.patch("/api/user/profile", payload);
}

// Admin Laporan - spec: GET /api/admin/laporan returns
// { success, data: { laporan: { items: [...] }, ruangan_terpopuler, laporan_aktif } }
export interface AdminLaporanResponse {
  success: boolean;
  message: string;
  data: {
    laporan: {
      items: any[];
      meta: { total_items: number; current_page: number; limit: number; total_pages: number };
    };
    ruangan_terpopuler: Array<{ ruangan_id: string; nama_ruangan: string; nama_lantai: string; nama_lokasi: string; total_laporan: number }>;
    laporan_aktif: number;
  };
}

export async function getAdminLaporan(params?: AdminLaporanParams) {
  const response = await apiClient.get<AdminLaporanResponse>("/api/admin/laporan", { params });
  // Return items directly, not wrapped
  return response?.data?.laporan?.items ?? [];
}

export async function getAdminLaporanDetail(id: string) {
  const response = await apiClient.get<any>(`/api/admin/laporan/${id}`);
  // Return data directly for detail
  return response?.data ?? response;
}

export async function updateAdminLaporan(id: string, payload: any) {
  return apiClient.patch(`/api/admin/laporan/${id}`, payload);
}

export async function deleteAdminLaporan(id: string) {
  return apiClient.delete(`/api/admin/laporan/${id}`);
}
