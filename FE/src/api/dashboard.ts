import apiClient from "../services/apiClient";

export type DashboardPeriod = "weekly" | "monthly" | "yearly";

export async function getAdminDashboard(period: DashboardPeriod = "weekly") {
  return apiClient.get<unknown>("/api/admin/dashboard", { params: { period } });
}

export async function getUserStats() {
  return apiClient.get<unknown>("/api/admin/user-stats");
}
