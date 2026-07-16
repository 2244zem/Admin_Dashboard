import { useState, useCallback, useEffect, useRef } from "react";
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

// Recursively flatten nested items arrays
function flattenItems(arr: any[]): any[] {
  const result: any[] = [];
  for (const item of arr) {
    // Jika item punya property 'items' yang juga array, rekursif flatten
    if (Array.isArray(item.items) && item.items.length > 0) {
      result.push(...flattenItems(item.items));
    } else {
      // Ini adalah task individual, propagate ob info dari parent jika ada
      result.push({
        ...item,
        // Simpan info OB parent jika task tidak punya OB sendiri
        _ob_id: item.ob_id ?? item._ob_id ?? null,
        _ob: item.ob ?? item._ob ?? null,
      });
    }
  }
  return result;
}

function extractArray(payload: any): any[] {
  // Kontrak backend checklist-harian:
  // { success, data: { checklist: { items: [{ob_id, ob, items: [tasks...]}, ...] }, ... }, ... }
  // Struktur nested: items array berisi OB groups, tiap group punya items array of tasks
  if (Array.isArray(payload)) {
    return flattenItems(payload);
  }

  // Check checklist.items (nested structure with OB groups)
  if (Array.isArray(payload?.checklist?.items)) {
    const items = payload.checklist.items;
    // Jika items[0] punya property 'items' (OB group), flatten
    if (items.length > 0 && Array.isArray(items[0]?.items)) {
      return flattenItems(items);
    }
    return items;
  }

  // Check direct checklist array
  if (Array.isArray(payload?.checklist)) {
    return flattenItems(payload.checklist);
  }

  // Check data.checklist.items
  if (Array.isArray(payload?.data?.checklist?.items)) {
    const items = payload.data.checklist.items;
    if (items.length > 0 && Array.isArray(items[0]?.items)) {
      return flattenItems(items);
    }
    return items;
  }

  // Fallback to direct data
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return flattenItems([payload.items]);

  console.warn("📋 extractArray: No array found in payload", payload);
  return [];
}

function mapApiStatus(status: unknown): StatusTask {
  const value = String(status || "").toUpperCase();
  if (value === "SEDANG_DIKERJAKAN") return "Proses";
  if (value === "SELESAI") return "Selesai";
  if (value === "TERLEWAT") return "Delayed";
  return "Belum";
}

function mapUiStatus(status: StatusTask): ChecklistStatus {
  if (status === "Proses") return "SEDANG_DIKERJAKAN";
  if (status === "Selesai") return "SELESAI";
  if (status === "Delayed") return "TERLEWAT";
  return "BELUM_DIKERJAKAN";
}

export function mapApiChecklistToTask(row: any): Task {
  console.log("📋 mapApiChecklistToTask: raw row keys:", Object.keys(row || {}));

  const tanggal = row.tanggal || row.created_at || row.updated_at || row.waktu || new Date().toISOString();
  const tugas = row.tugas || {};
  const kategori = row.kategori || tugas.kategori || {};
  const lokasi = row.lokasi || {};
  const lantai = row.lantai || {};
  const ob = row.ob || row.petugas || row.assignee || {};

  // Nama OB (respons backend pakai field "ob": null / objek ob)
  const namaOb = row.nama_ob || ob?.nama_lengkap || ob?.username || ob?.nama || ob?.name || "Belum ditugaskan";

  // Gedung: backend tidak mengembalikan objek lokasi bersarang; hanya
  // lantai.lokasi_id. Kita tampilkan ID lokasi sebagai fallback agar baris
  // tidak kosong (nama gedung bisa di-resolve di UI via lokasiList jika perlu).
  const namaGedung =
    row.nama_lokasi ||
    lokasi.nama_lokasi ||
    lokasi.nama ||
    lokasi.name ||
    row.gedung ||
    lantai.lokasi_id ||
    "-";
  const namaLantai =
    row.nama_lantai ||
    lantai.nama_lantai ||
    lantai.nama ||
    (lantai.nomor_lantai !== undefined ? `Lantai ${lantai.nomor_lantai}` : row.lantai || "-");

  // Tugas & kategori
  const namaTugas = row.nama_tugas || tugas.nama_tugas || row.tugas_nama || tugas.nama || row.nama || row.name || "-";
  const namaKategori = row.nama_kategori || kategori.nama_kategori || row.kategori_nama || kategori.nama || row.kategori || "-";

  return {
    id: String(row.id || row.checklist_harian_id || row.checklist_id || row.task_id || ""),
    kategori: namaKategori,
    namaTugas: namaTugas,
    gedung: namaGedung,
    lantai: namaLantai,
    // ID mentah untuk resolve nama gedung/lantai di UI via endpoint lokasi/lantai
    lokasiId: lantai.lokasi_id || lokasi.id || row.lokasi_id || undefined,
    lantaiId: lantai.id || row.lantai_id || undefined,
    petugas: {
      nama: namaOb,
    },
    waktu: String(tanggal).slice(11, 16) || row.waktu || "-",
    tanggal: String(tanggal).slice(0, 10) || row.tanggal || new Date().toISOString().slice(0, 10),
    catatan: row.catatan || row.notes || row.description,
    status: mapApiStatus(row.status),
  };
}

// Strip prefix dari ID (gd-, lt-, dll) — tapi JANGAN hapus field kosong secara diam-diam
function stripIdPrefix(id: string): string {
  if (!id) return id;
  const match = String(id).match(/^([a-z]+-)?(.+)$/);
  return match ? match[2] : id;
}

function toChecklistPayload(payload: any) {
  const result: any = {};

  // Strip prefix dari UUID, tapi tetap kirim field meskipun kosong
  // PENTING: Jangan strip field kosong — backend butuh tau field mana yang kosong vs tidak ada
  if (payload.tugas_id) result.tugas_id = stripIdPrefix(payload.tugas_id);
  if (payload.kategori_id) result.kategori_id = stripIdPrefix(payload.kategori_id);
  if (payload.lokasi_id) result.lokasi_id = stripIdPrefix(payload.lokasi_id);
  if (payload.lantai_id) result.lantai_id = stripIdPrefix(payload.lantai_id);
  if (payload.ob_id !== undefined && payload.ob_id !== null && payload.ob_id !== "") {
    result.ob_id = stripIdPrefix(payload.ob_id);
  }
  if (payload.status) result.status = mapUiStatus(payload.status);
  if (payload.catatan) result.catatan = payload.catatan;

  console.log("📤 toChecklistPayload result:", JSON.stringify(result, null, 2));
  return result;
}

export interface TaskFilters {
  lokasi_id?: string;
  lantai_id?: string;
  status?: ChecklistStatus;
  search?: string;
}

const TASKS_KEY = ["tasks"] as const;

// Polling interval: 30 detik (lebih manusiawi, tidak DDoS-like)
// Bisa di-adjust berdasarkan kebutuhan
const TASKS_REFETCH_INTERVAL = 30_000;

async function fetchTasksQuery(filters?: TaskFilters): Promise<Task[]> {
  try {
    console.log("📋 fetchTasksQuery: fetching tasks with filters:", filters);
    const payload = await getChecklistHarian(filters);
    console.log("📋 fetchTasksQuery: payload type:", typeof payload, "isArray:", Array.isArray(payload));
    console.log("📋 fetchTasksQuery: payload keys:", Object.keys(payload || {}));
    const extracted = extractArray(payload);
    console.log("📋 fetchTasksQuery: extracted array length:", extracted.length);
    if (extracted.length === 0) {
      console.warn("📋 fetchTasksQuery: WARNING - No items extracted from payload!");
    }
    const mapped = extracted.map(mapApiChecklistToTask);
    console.log("📋 fetchTasksQuery: mapped tasks count:", mapped.length);
    return validateList<Task>(taskSchema, mapped, "task");
  } catch (err) {
    console.error("📋 fetchTasksQuery: ERROR:", err);
    throw err;
  }
}

export function useTasks(filters?: TaskFilters) {
  const queryClient = useQueryClient();
  const [isMutating, setIsMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Build dynamic query key with filters
  const queryKey = filters ? [...TASKS_KEY, filters] : TASKS_KEY;

  const query = useQuery({
    queryKey,
    queryFn: () => fetchTasksQuery(filters),
    // Polling lebih lambat (30 detik) untuk mencegah DDoS
    refetchInterval: TASKS_REFETCH_INTERVAL,
    // Jangan refetch saat tab tidak aktif (hemat resources)
    refetchIntervalInBackground: false,
    // Retry dengan backoff exponential
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const tasks = query.data ?? [];
  const isLoading = query.isPending || isMutating;
  const error = mutationError ?? (query.error ? getErrorMessage(query.error) : null);

  const fetchTasks = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: TASKS_KEY });
  }, [queryClient]);

  const runMutation = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      setIsMutating(true);
      setMutationError(null);
      try {
      const result = await fn();
      console.log("📋 runMutation: invalidating tasks to force refetch...");
      // invalidateQueries ignores staleTime and forces the active query to
      // refetch, so newly created/updated tasks always appear in the UI.
      await queryClient.invalidateQueries({ queryKey: TASKS_KEY });
      console.log("📋 runMutation: refetch complete");
      return result;
      } catch (err: any) {
        const msg = getErrorMessage(err);
        setMutationError(msg);
        throw new Error(msg);
      } finally {
        setIsMutating(false);
      }
    },
    [queryClient]
  );

  const createTask = (payload: any) =>
    runMutation(async () => {
      // Validasi field wajib sudah dilakukan di level UI (Tasks.tsx).
      // Tidak perlu verifikasi UUID via 4x GET ke backend — boros dan rentan
      // gagal kalau salah satu endpoint 404. Biarkan backend yang memvalidasi
      // kepemilikan/eksistensi ID saat POST.
      return createChecklistHarian(toChecklistPayload(payload));
    });

  const updateTask = (id: string, payload: any) =>
    runMutation(() => updateChecklistHarian(id, toChecklistPayload(payload)));

  const deleteTask = (id: string) =>
    runMutation(() => deleteChecklistHarian(id));

  const updateTaskStatus = async (id: string, status: StatusTask) => {
    const previous = queryClient.getQueryData<Task[]>(TASKS_KEY);
    queryClient.setQueryData<Task[]>(TASKS_KEY, (old) =>
      (old ?? []).map((task) => (task.id === id ? { ...task, status } : task))
    );
    try {
      await updateChecklistHarian(id, { status: mapUiStatus(status) });
    } catch (err: any) {
      queryClient.setQueryData(TASKS_KEY, previous);
      const msg = getErrorMessage(err);
      setMutationError(msg);
      throw new Error(msg);
    }
  };

  // Fetch fresh task detail from API
  const fetchTaskDetail = async (id: string): Promise<Task | null> => {
    try {
      const data = await getChecklistHarianDetail(id);
      // Handle wrapped response
      const detail = data?.data ?? data;
      if (!detail || typeof detail !== 'object') {
        console.warn("fetchTaskDetail: no valid data in response");
        return null;
      }
      return mapApiChecklistToTask(detail);
    } catch (err) {
      console.error("fetchTaskDetail error:", err);
      return null;
    }
  };

  return {
    tasks,
    isLoading,
    error,
    fetchTasks,
    fetchTaskDetail,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
  };
}

export default useTasks;
