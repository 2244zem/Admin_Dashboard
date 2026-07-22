import { useQuery } from "@tanstack/react-query";
import apiClient from "../services/apiClient";

// Task stats from API per CLAUDE.md
export interface TugasStats {
  total: number;
  diproses_ob: number;
  menunggu_persetujuan: number;
}

async function fetchTugasStats(period = "harian", lokasi_id?: string): Promise<TugasStats> {
  const params: Record<string, string> = { period };
  if (lokasi_id) params.lokasi_id = lokasi_id;
  const res = await apiClient.get<{ data?: TugasStats } | TugasStats>("/api/admin/tugas/stats", { params });
  if (!res) return { total: 0, diproses_ob: 0, menunggu_persetujuan: 0 };
  // Handle both { data: { ... } } and direct { ... }
  if ("data" in res && res.data) return res.data as TugasStats;
  return res as TugasStats;
}

export function useTugasStats(period = "harian", lokasi_id?: string) {
  const query = useQuery({
    queryKey: ["admin-tugas-stats", period, lokasi_id],
    queryFn: () => fetchTugasStats(period, lokasi_id),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
  // Return stats for backward compat with Tasks.tsx usage
  return { stats: query.data, isLoading: query.isPending, isFetching: query.isFetching, refetch: query.refetch };
}
