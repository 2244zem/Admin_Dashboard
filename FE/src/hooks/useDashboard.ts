import { useQuery } from "@tanstack/react-query";
import { getAdminDashboard, type AdminDashboard, type DashboardPeriod } from "../api/dashboard";

export function useDashboard(period: DashboardPeriod = "mingguan") {
  const query = useQuery({
    queryKey: ["admin-dashboard", period],
    queryFn: () => getAdminDashboard(period),
    refetchInterval: 30_000,
    retry: 2,
  });

  return {
    dashboard: query.data as AdminDashboard | null,
    isLoading: query.isPending,
    error: query.error ? (query.error as Error).message : null,
  };
}
