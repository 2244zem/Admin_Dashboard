import { apiClient, unwrapData, type ApiResponse } from "./client";

export type DashboardPeriod = "weekly" | "monthly" | "yearly";

export async function getAdminDashboard(period: DashboardPeriod = "weekly") {
  const response = await apiClient.get<ApiResponse<any> | any>("/api/admin/dashboard", { period });
  return unwrapData(response);
}

export async function getUserStats() {
  const response = await apiClient.get<ApiResponse<any> | any>("/api/admin/user-stats");
  return unwrapData(response);
}
