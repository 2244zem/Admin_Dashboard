import apiClient from "../services/apiClient";

export type PerformancePeriod = "mingguan" | "bulanan" | "tahunan";

export async function getObPerformance(userId: string, period: PerformancePeriod = "mingguan") {
  const response = await apiClient.get<any>(`/api/admin/user/${userId}/performance/ob`, {
    params: { period },
  });
  return response?.data ?? response;
}