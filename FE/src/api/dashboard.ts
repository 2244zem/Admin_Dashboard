import apiClient from "../services/apiClient";

// Backend accepts: harian | mingguan | bulanan | tahunan (default: mingguan)
export type DashboardPeriod = "harian" | "mingguan" | "bulanan" | "tahunan";

export async function getAdminDashboard(period: DashboardPeriod = "mingguan") {
  const data = await apiClient.get<Record<string, unknown>>("/api/admin/dashboard", { params: { period } });
  return data?.data ?? data;
}

export async function getUserStats() {
  const data = await apiClient.get<Record<string, unknown>>("/api/admin/user-stats");
  return data?.data ?? data;
}
