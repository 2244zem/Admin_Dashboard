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

  const lantai = row.lantai as { nomor_lantai?: unknown } | undefined;

  return {
    id: String(row.id ?? ""),
    kategori: String(get(row, "kategori", "nama_kategori") || get(row, "tugas", "kategori", "nama_kategori") || "-"),
    namaTugas: String(get(row, "nama_tugas") || get(row, "tugas", "nama_tugas") || "-"),
    gedung: String(get(row, "nama_lokasi") || get(row, "lokasi", "nama") || "-"),
    lantai: String(get(row, "nama_lantai") || (lantai?.nomor_lantai ? `Lantai ${lantai.nomor_lantai}` : "-")),
    petugas: { nama: String(get(row, "ob", "nama_lengkap") || get(row, "nama_ob") || "Belum ditugaskan") },
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
const stripPrefix = (id: string) => id?.replace(/^[a-z]+-/, "");

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
  ...(p.kategori_id && { kategori_id: stripPrefix(p.kategori_id) }),
  ...(p.lokasi_id && { lokasi_id: stripPrefix(p.lokasi_id) }),
  ...(p.lantai_id && { lantai_id: stripPrefix(p.lantai_id) }),
  ...(p.ob_id && { ob_id: stripPrefix(p.ob_id) }),
  ...(p.status && { status: mapUiStatus(p.status) }),
  ...(p.catatan ? { catatan: p.catatan } : {}),
});

const TASKS_KEY = ["tasks"] as const;

async function fetchTasks(filters?: TaskFilters): Promise<Task[]> {
  const payload = await getChecklistHarian(filters);
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
    fetchTasks: () => qc.invalidateQueries({ queryKey: TASKS_KEY }),
    fetchTaskDetail,
    createTask: (p: TaskPayload) => runMutation(() => createChecklistHarian(toPayload(p))),
    updateTask: (id: string, p: TaskPayload) => runMutation(() => updateChecklistHarian(id, toPayload(p))),
    deleteTask: (id: string) => runMutation(() => deleteChecklistHarian(id)),
    updateTaskStatus: async (id: string, status: StatusTask) => {
      await updateChecklistHarian(id, { status: mapUiStatus(status) });
      await qc.invalidateQueries({ queryKey: TASKS_KEY });
    },
  };
}
