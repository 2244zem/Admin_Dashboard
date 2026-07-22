import { useQuery } from "@tanstack/react-query";
import apiClient from "../services/apiClient";

export async function getTugasStats(period: string, lokasiId?: string) {
  const params: Record<string, string> = { period };
  if (lokasiId) params.lokasi_id = lokasiId;
  const { data } = await apiClient.get("/admin/tugas/stats", { params });
  return data;
}

export function useTugasStats(period: string, lokasiId?: string) {
  const query = useQuery({
    queryKey: ["admin-tugas-stats", period, lokasiId],
    queryFn: () => getTugasStats(period, lokasiId),
    refetchInterval: 30_000,
  });

  return {
    stats: query.data ?? { total: 0, diproses_ob: 0, menunggu_persetujuan: 0 },
    isLoading: query.isPending,
    error: query.error,
  };
}