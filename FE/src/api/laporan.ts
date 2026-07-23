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
    items: Record<string, unknown>[];
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
      items: Record<string, unknown>[];
      meta: { total_items: number; current_page: number; limit: number; total_pages: number };
    };
    ruangan_terpopuler: Array<{ ruangan_id: string; nama_ruangan: string; nama_lantai: string; nama_lokasi: string; total_laporan: number }>;
    laporan_aktif: number;
  };
}

export interface LaporanStats {
  laporan_baru: number;
  sedang_dikerjakan: number;
  selesai_hari_ini: number;
}

export interface LaporanStatsParams {
  period?: "harian" | "mingguan" | "bulanan" | "tahunan";
  lokasi_id?: string;
}

export interface LaporanHistoryParams {
  page?: number;
  limit?: number;
  search?: string;
  user_id?: string;
}

export interface AdminLaporanResult {
  items: Record<string, unknown>[];
  meta: { total_items: number; current_page: number; limit: number; total_pages: number };
}

export async function getAdminLaporan(params?: AdminLaporanParams): Promise<AdminLaporanResult> {
  const response = await apiClient.get<AdminLaporanResponse>("/api/admin/laporan", { params });
  const laporan = response?.data?.laporan;
  return {
    items: laporan?.items ?? [],
    meta: laporan?.meta ?? { total_items: 0, current_page: params?.page ?? 1, limit: params?.limit ?? 0, total_pages: 1 },
  };
}

export async function getAdminLaporanDetail(id: string) {
  const response = await apiClient.get<Record<string, unknown>>(`/api/admin/laporan/${id}`);
  // Return data directly for detail
  return response?.data ?? response;
}

export async function getLaporanStats(params?: LaporanStatsParams): Promise<LaporanStats> {
  const response = await apiClient.get<{ success: boolean; data: LaporanStats }>("/api/admin/laporan/stats", { params });
  return response?.data ?? { laporan_baru: 0, sedang_dikerjakan: 0, selesai_hari_ini: 0 };
}

export async function getLaporanHistory(params?: LaporanHistoryParams) {
  const response = await apiClient.get<{ success: boolean; data: { items: Record<string, unknown>[]; meta: { total_items: number; current_page: number; limit: number; total_pages: number } } }>("/api/admin/laporan/history", { params });
  return response?.data ?? { items: [], meta: { total_items: 0, current_page: 1, limit: 0, total_pages: 1 } };
}

export async function updateAdminLaporan(id: string, payload: Record<string, unknown>) {
  return apiClient.patch(`/api/admin/laporan/${id}`, payload);
}

export async function deleteAdminLaporan(id: string) {
  return apiClient.delete(`/api/admin/laporan/${id}`);
}
