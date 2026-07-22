import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../services/apiClient";

// Approval list for ad-hoc tasks per CLAUDE.md
export interface TugasApprovalItem {
  id: string; nama_tugas: string; nama_ob: string;
  lokasi: string; kategori: string; selesai_at: string;
}

async function fetchTugasApproval(period = "harian", lokasi_id?: string): Promise<TugasApprovalItem[]> {
  const params: Record<string, string> = { period };
  if (lokasi_id) params.lokasi_id = lokasi_id;
  const res = await apiClient.get<{ data: TugasApprovalItem[] }>("/api/admin/tugas/approval-list", { params });
  const data = res?.data ?? res;
  return Array.isArray(data) ? data : [];
}

export { useTugasApproval };
export default useTugasApproval;
function useTugasApproval(period = "harian", lokasi_id?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-tugas-approval", period, lokasi_id],
    queryFn: () => fetchTugasApproval(period, lokasi_id),
    refetchInterval: 30_000,
  });

  const approve = async (id: string) => {
    await apiClient.patch(`/api/admin/tugas/${id}/approve`);
    qc.invalidateQueries({ queryKey: ["admin-tugas-approval"] });
  };

  return {
    approvalList: query.data ?? [],
    isLoading: query.isPending,
    error: query.error ? String(query.error) : null,
    approve,
  };
}
