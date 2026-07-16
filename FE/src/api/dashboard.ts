import apiClient from "../services/apiClient";

export type DashboardPeriod = "weekly" | "monthly" | "yearly";

export async function getAdminDashboard(period: DashboardPeriod = "weekly") {
  try {
    const response = await apiClient.get<any>("/api/admin/dashboard", { params: { period } });
    return (response as any)?.data ?? response;
  } catch (err) {
    throw err;
  }
}

export async function getUserStats() {
  try {
    const response = await apiClient.get<any>("/api/admin/user-stats");
    return (response as any)?.data ?? response;
  } catch (err) {
    throw err;
  }
}
