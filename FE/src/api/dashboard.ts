import apiClient from "../services/apiClient";

export type DashboardPeriod = "harian" | "mingguan" | "bulanan" | "tahunan";

export interface AdminDashboard {
  total_laporan_karyawan: number;
  laporan_selesai: number;
  tugas_belum_diambil: number;
}

export async function getAdminDashboard(period: DashboardPeriod = "mingguan"): Promise<AdminDashboard> {
  const response = await apiClient.get<{ success: boolean; data: AdminDashboard }>(
    "/api/admin/dashboard",
    { params: { period } }
  );
  return (response as any)?.data ?? response ?? {};
}

export async function getUserStats() {
  const data = await apiClient.get<Record<string, unknown>>("/api/admin/user-stats");
  return data?.data ?? data;
}
