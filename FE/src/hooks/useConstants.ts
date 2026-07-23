import { useQuery } from "@tanstack/react-query";
import apiClient from "../services/apiClient";

// Constants from API per CLAUDE.md - source of truth for all dropdown values
export interface Constants {
  hari: string[];
  checklist_status: string[];
  tugas_status: string[];
  laporan_status: string[];
  laporan_priority: string[];
  kolaborasi_status: string[];
  user_role: string[];
}

async function fetchConstants(): Promise<Constants> {
  const res = await apiClient.get<Constants>("/api/constants");
  return res ?? {
    hari: [],
    checklist_status: ["BELUM_DIKERJAKAN", "SEDANG_DIKERJAKAN", "SELESAI", "TERLEWAT"],
    tugas_status: ["BELUM_DIKERJAKAN", "SEDANG_DIKERJAKAN", "SELESAI"],
    laporan_status: ["BELUM_DIKERJAKAN", "PENDING", "SELESAI", "DIBATALKAN"],
    laporan_priority: ["STANDAR", "MENDESAK"],
    kolaborasi_status: ["PENDING", "APPROVED", "REJECTED"],
    user_role: ["Admin", "HR", "OB", "Karyawan"],
  };
}

export { useConstants };
export default useConstants;
function useConstants() {
  const query = useQuery({
    queryKey: ["constants"],
    queryFn: fetchConstants,
    staleTime: Infinity, // Constants rarely change
    retry: false,
  });

  return {
    constants: query.data ?? null,
    isLoading: query.isPending,
    error: query.error ? String(query.error) : null,
  };
}
