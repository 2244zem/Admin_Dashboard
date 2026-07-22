import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../services/apiClient";
import { stripIdPrefix } from "../lib/response";

// Ad-hoc tasks from OB perspective per CLAUDE.md
export interface ObTugas {
  id: string; nama_tugas: string; kategori: string;
  lantai_id: string; lokasi: string; nomor_lantai: string;
  status: string; catatan?: string; created_at: string;
}

async function fetchObTugas(): Promise<ObTugas[]> {
  const res = await apiClient.get<ObTugas[]>("/api/ob/tugas");
  return Array.isArray(res) ? res : [];
}

export { useObTugas };
export default useObTugas;
function useObTugas() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["ob-tugas"],
    queryFn: fetchObTugas,
    refetchInterval: 30_000,
  });

  const claimTugas = async (id: string) => {
    await apiClient.patch(`/api/ob/tugas/${stripIdPrefix(id)}/claim`);
    qc.invalidateQueries({ queryKey: ["ob-tugas"] });
  };

  const selesaiTugas = async (id: string) => {
    await apiClient.patch(`/api/ob/tugas/${stripIdPrefix(id)}/selesai`);
    qc.invalidateQueries({ queryKey: ["ob-tugas"] });
  };

  return {
    tugasList: query.data ?? [],
    isLoading: query.isPending,
    error: query.error ? String(query.error) : null,
    claimTugas,
    selesaiTugas,
  };
}
