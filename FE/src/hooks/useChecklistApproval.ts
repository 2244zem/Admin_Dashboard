import { useQuery, useQueryClient } from "@tanstack/react-query";
import { approveChecklistHarian } from "../api/checklist";
import { unwrapData } from "../lib/response";
import apiClient from "../services/apiClient";

// Approval list for daily checklists per CLAUDE.md
export interface ChecklistApprovalItem {
  id: string; nama_tugas: string; nama_ob: string;
  lokasi: string; kategori: string; selesai_at: string;
}

async function fetchChecklistApproval(period = "harian", lokasi_id?: string): Promise<ChecklistApprovalItem[]> {
  const params: Record<string, string> = { period };
  if (lokasi_id) params.lokasi_id = lokasi_id;
  const res = await apiClient.get<unknown>("/api/admin/checklist-harian/approval-list", { params });
  const data = unwrapData<ChecklistApprovalItem[]>(res);
  return Array.isArray(data) ? data : [];
}

export { useChecklistApproval };
export default useChecklistApproval;
function useChecklistApproval(period = "harian", lokasi_id?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-checklist-approval", period, lokasi_id],
    queryFn: () => fetchChecklistApproval(period, lokasi_id),
    refetchInterval: 30_000,
  });

  const approve = async (id: string) => {
    await approveChecklistHarian(id);
    qc.invalidateQueries({ queryKey: ["admin-checklist-approval"] });
  };

  return {
    approvalList: query.data ?? [],
    isLoading: query.isPending,
    error: query.error ? String(query.error) : null,
    approve,
  };
}
