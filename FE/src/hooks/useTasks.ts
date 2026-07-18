import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Task, StatusTask } from "../types/task";
import {
  createChecklistHarian,
  deleteChecklistHarian,
  getChecklistHarian,
  getChecklistHarianDetail,
  updateChecklistHarian,
  type ChecklistStatus,
} from "../api/checklist";
import { getErrorMessage } from "../lib/utils";
import { taskSchema, validateList } from "../schemas";

// Status mappers
const mapApiStatus = (s: unknown): StatusTask => {
  const v = String(s || "").toUpperCase();
  if (v === "SEDANG_DIKERJAKAN") return "Proses";
  if (v === "SELESAI") return "Selesai";
  if (v === "TERLEWAT") return "Delayed";
  return "Belum";
};

const mapUiStatus = (s: StatusTask): ChecklistStatus => ({
  "Proses": "SEDANG_DIKERJAKAN", "Selesai": "SELESAI", "Delayed": "TERLEWAT",
}[s] ?? "BELUM_DIKERJAKAN");

// Map API row to Task
export function mapApiChecklistToTask(row: any): Task {
  const get = (v: any, ...keys: string[]) => keys.reduce((o, k) => o?.[k], v) ?? "";
  const tanggal = row.tanggal || row.created_at || new Date().toISOString();

  return {
    id: String(row.id ?? ""),
    kategori: get(row, "kategori", "nama_kategori") || get(row, "tugas", "kategori", "nama_kategori") || "-",
    namaTugas: get(row, "nama_tugas") || get(row, "tugas", "nama_tugas") || "-",
    gedung: get(row, "nama_lokasi") || get(row, "lokasi", "nama") || "-",
    lantai: get(row, "nama_lantai") || (row.lantai?.nomor_lantai ? `Lantai ${row.lantai.nomor_lantai}` : "-"),
    petugas: { nama: get(row, "ob", "nama_lengkap") || get(row, "nama_ob") || "Belum ditugaskan" },
    waktu: String(tanggal).slice(11, 16) || "-",
    tanggal: String(tanggal).slice(0, 10),
    catatan: row.catatan,
    status: mapApiStatus(row.status),
  };
}

export interface TaskFilters {
  lokasi_id?: string; lantai_id?: string; status?: ChecklistStatus; search?: string;
}

// Strip prefix (gd-, lt-, etc)
const stripPrefix = (id: string) => id?.replace(/^[a-z]+-/, "");

// Build payload for checklist API
const toPayload = (p: any) => ({
  ...(p.nama_tugas && { nama_tugas: p.nama_tugas }),
  ...(p.kategori_id && { kategori_id: stripPrefix(p.kategori_id) }),
  ...(p.lokasi_id && { lokasi_id: stripPrefix(p.lokasi_id) }),
  ...(p.lantai_id && { lantai_id: stripPrefix(p.lantai_id) }),
  ...(p.ob_id != null && p.ob_id !== "" && { ob_id: stripPrefix(p.ob_id) }),
  ...(p.status && { status: mapUiStatus(p.status) }),
  ...(p.catatan && { catatan: p.catatan }),
});

const TASKS_KEY = ["tasks"] as const;

async function fetchTasks(filters?: TaskFilters): Promise<Task[]> {
  const payload = await getChecklistHarian(filters);
  const items = Array.isArray(payload) ? payload : payload?.items ?? [];
  return validateList(taskSchema, items.map(mapApiChecklistToTask), "task");
}

export { useTasks };
export default useTasks;
function useTasks(filters?: TaskFilters) {
  const qc = useQueryClient();
  const [isMutating, setMutating] = useState(false);
  const [mutationError, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: filters ? [...TASKS_KEY, filters] : TASKS_KEY,
    queryFn: () => fetchTasks(filters),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: 2,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 30_000),
  });

  const runMutation = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    setMutating(true); setError(null);
    try { return await fn(); }
    catch (e: any) {
      setError(getErrorMessage(e)); throw e;
    } finally { setMutating(false); }
  }, []);

  const fetchTaskDetail = async (id: string): Promise<Task | null> => {
    try { return mapApiChecklistToTask(await getChecklistHarianDetail(id)); }
    catch { return null; }
  };

  return {
    tasks: query.data ?? [],
    isLoading: query.isPending || isMutating,
    error: mutationError ?? (query.error ? getErrorMessage(query.error) : null),
    fetchTasks: () => qc.invalidateQueries({ queryKey: TASKS_KEY }),
    fetchTaskDetail,
    createTask: (p: any) => runMutation(() => createChecklistHarian(toPayload(p))),
    updateTask: (id: string, p: any) => runMutation(() => updateChecklistHarian(id, toPayload(p))),
    deleteTask: (id: string) => runMutation(() => deleteChecklistHarian(id)),
    updateTaskStatus: async (id: string, status: StatusTask) => {
      await updateChecklistHarian(id, { status: mapUiStatus(status) });
      await qc.invalidateQueries({ queryKey: TASKS_KEY });
    },
  };
}
