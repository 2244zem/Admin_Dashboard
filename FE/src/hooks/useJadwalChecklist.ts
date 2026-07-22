import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../services/apiClient";
import { stripIdPrefix } from "../lib/response";

export interface JadwalChecklist {
  id: string; nama_tugas: string; kategori_id: string;
  lantai_id: string; ob_id?: string; hari: string[];
  tanggal_ulang?: number; tanggal_spesifik?: string[];
  tanggal_mulai?: string; tanggal_selesai?: string;
  created_at: string; updated_at: string;
}

async function fetchJadwalChecklist(): Promise<JadwalChecklist[]> {
  // Per CLAUDE.md: respons langsung array, tidak dibungkus success/data
  const res = await apiClient.get<JadwalChecklist[]>("/api/jadwal-checklist");
  return Array.isArray(res) ? res : [];
}

export { useJadwalChecklist };
export default useJadwalChecklist;
function useJadwalChecklist() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["jadwal-checklist"],
    queryFn: fetchJadwalChecklist,
    staleTime: 60_000,
  });

  const createJadwal = async (payload: Partial<JadwalChecklist>) => {
    const body: Record<string, unknown> = { ...payload };
    if (body.kategori_id) body.kategori_id = stripIdPrefix(String(body.kategori_id));
    if (body.lantai_id) body.lantai_id = stripIdPrefix(String(body.lantai_id));
    if (body.ob_id) body.ob_id = stripIdPrefix(String(body.ob_id));
    return apiClient.post("/api/jadwal-checklist", body);
  };

  const updateJadwal = async (id: string, payload: Partial<JadwalChecklist>) => {
    const body: Record<string, unknown> = { ...payload };
    if (body.kategori_id) body.kategori_id = stripIdPrefix(String(body.kategori_id));
    if (body.lantai_id) body.lantai_id = stripIdPrefix(String(body.lantai_id));
    if (body.ob_id) body.ob_id = stripIdPrefix(String(body.ob_id));
    return apiClient.patch(`/api/jadwal-checklist/${stripIdPrefix(id)}`, body);
  };

  const deleteJadwal = async (id: string) => {
    return apiClient.delete(`/api/jadwal-checklist/${stripIdPrefix(id)}`);
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: ["jadwal-checklist"] });

  return {
    jadwalList: query.data ?? [],
    isLoading: query.isPending,
    error: query.error ? String(query.error) : null,
    createJadwal: async (p: Partial<JadwalChecklist>) => { await createJadwal(p); invalidate(); },
    updateJadwal: async (id: string, p: Partial<JadwalChecklist>) => { await updateJadwal(id, p); invalidate(); },
    deleteJadwal: async (id: string) => { await deleteJadwal(id); invalidate(); },
  };
}
