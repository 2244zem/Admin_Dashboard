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
import { stripIdPrefix } from "../lib/response";
import { taskSchema, validateList } from "../schemas";

// Status mappers
const mapApiStatus = (s: unknown): StatusTask => {
  const v = String(s || "").toUpperCase();
  if (v === "SEDANG_DIKERJAKAN") return "Proses";
  if (v === "SELESAI") return "Selesai";
  if (v === "TERLEWAT") return "Delayed";
  return "Belum";
};

const UI_TO_CHECKLIST_STATUS: Record<StatusTask, ChecklistStatus> = {
  Belum: "BELUM_DIKERJAKAN",
  Proses: "SEDANG_DIKERJAKAN",
  Selesai: "SELESAI",
  Delayed: "TERLEWAT",
};

const mapUiStatus = (s: StatusTask): ChecklistStatus => UI_TO_CHECKLIST_STATUS[s] ?? "BELUM_DIKERJAKAN";

// Map API row to Task
export function mapApiChecklistToTask(row: Record<string, unknown>): Task {
  const get = (v: unknown, ...keys: string[]): unknown =>
    keys.reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), v) ?? "";
  const tanggal = String(row.tanggal ?? row.created_at ?? new Date().toISOString());

  const lantai = row.lantai as { nomor_lantai?: unknown; nama_lantai?: unknown } | undefined;
  const kategori = typeof row.kategori === "string" ? row.kategori : get(row, "kategori", "nama_kategori");
  const lokasiId = row.lokasi_id ?? get(row, "lokasi", "id") ?? get(row, "lantai", "lokasi", "id");
  const namaLokasi = row.nama_lokasi
    ?? get(row, "lokasi", "nama")
    ?? get(row, "lokasi", "nama_lokasi")
    ?? get(row, "lantai", "lokasi", "nama")
    ?? get(row, "lantai", "lokasi", "nama_lokasi");

  return {
    id: String(row.id ?? ""),
    kategori: String(kategori || get(row, "tugas", "kategori", "nama_kategori") || "-"),
    namaTugas: String(get(row, "nama_tugas") || get(row, "tugas", "nama_tugas") || "-"),
    gedung: String(namaLokasi || "-"),
    lantai: String(get(row, "nama_lantai") || lantai?.nama_lantai || (lantai?.nomor_lantai ? `Lantai ${lantai.nomor_lantai}` : "-")),
    lokasiId: String(lokasiId || ""),
    lantaiId: String(row.lantai_id ?? (get(row, "lantai", "id") || "")),
    petugas: { nama: String(get(row, "ob", "nama_lengkap") || get(row, "_ob", "nama_lengkap") || get(row, "nama_ob") || "Belum ditugaskan") },
    waktu: String(tanggal).slice(11, 16) || "-",
    tanggal: String(tanggal).slice(0, 10),
    catatan: row.catatan != null ? String(row.catatan) : undefined,
    status: mapApiStatus(row.status),
  };
}

export interface TaskFilters {
  lokasi_id?: string; lantai_id?: string; status?: ChecklistStatus; search?: string;
}

// Strip prefix (gd-, lt-, etc)
interface TaskPayload {
  nama_tugas?: string;
  kategori_id?: string;
  lokasi_id?: string;
  lantai_id?: string;
  ob_id?: string;
  status?: StatusTask;
  catatan?: string;
}

// Build payload for checklist API
const toPayload = (p: TaskPayload) => ({
  ...(p.nama_tugas && { nama_tugas: p.nama_tugas }),
  ...(p.kategori_id && { kategori_id: stripIdPrefix(p.kategori_id) }),
  ...(p.lantai_id && { lantai_id: stripIdPrefix(p.lantai_id) }),
  ...(p.ob_id && { ob_id: stripIdPrefix(p.ob_id) }),
  ...(p.status && { status: mapUiStatus(p.status) }),
  ...(p.catatan ? { catatan: p.catatan } : {}),
});

const TASKS_KEY = ["tasks"] as const;

async function fetchTasks(filters?: TaskFilters): Promise<Task[]> {
  const payload = await getChecklistHarian(filters && {
    ...filters,
    lokasi_id: filters.lokasi_id ? stripIdPrefix(filters.lokasi_id) : undefined,
    lantai_id: filters.lantai_id ? stripIdPrefix(filters.lantai_id) : undefined,
  });
  const items = Array.isArray(payload) ? payload : payload?.items ?? [];
  return validateList(taskSchema, items.map(mapApiChecklistToTask));
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
    catch (e: unknown) {
      setError(getErrorMessage(e)); throw e;
    } finally { setMutating(false); }
  }, []);

  const fetchTaskDetail = async (id: string): Promise<Task | null> => {
    try { return mapApiChecklistToTask(await getChecklistHarianDetail(id) as Record<string, unknown>); }
    catch { return null; }
  };

  return {
    tasks: query.data ?? [],
    isLoading: query.isPending || isMutating,
    error: mutationError ?? (query.error ? getErrorMessage(query.error) : null),
    fetchTasks: () => qc.invalidateQueries({ queryKey: ["tasks"], refetchType: "all" }),
    fetchTaskDetail,
    createTask: (p: TaskPayload) => runMutation(async () => {
      await createChecklistHarian(toPayload(p));
      await qc.invalidateQueries({ queryKey: TASKS_KEY, refetchType: "all" });
    }),
    updateTask: (id: string, p: TaskPayload) => runMutation(async () => {
      await updateChecklistHarian(id, toPayload(p));
      await qc.invalidateQueries({ queryKey: TASKS_KEY });
    }),
    deleteTask: (id: string) => runMutation(async () => {
      await deleteChecklistHarian(id);
      await qc.invalidateQueries({ queryKey: TASKS_KEY });
    }),
    updateTaskStatus: async (id: string, status: StatusTask) => {
      await updateChecklistHarian(id, { status: mapUiStatus(status) });
      await qc.invalidateQueries({ queryKey: TASKS_KEY });
    },
  };
}
