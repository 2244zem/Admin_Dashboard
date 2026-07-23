import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Task, StatusTask, KategoriTugas } from "../types/task";
import {
  approveChecklistHarian,
  getChecklistHarianDetail,
  getTugasCombination,
  updateChecklistHarian,
  type ChecklistStatus,
  type TugasCombinationParams,
} from "../api/checklist";
import { approveTugas, createTugas, getTugasById, updateTugas, deleteTugas } from "../api/tugas";
import { stripIdPrefix } from "../lib/response";
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
export function mapApiChecklistToTask(row: Record<string, unknown>, jenis: KategoriTugas = "Rutin"): Task {
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
    jenis,
    approved: row.approved === true,
    pelapor: row.pelapor != null ? String(row.pelapor) : undefined,
    waktuMulai: row.dikerjakan_at != null ? String(row.dikerjakan_at) : undefined,
    waktuSelesai: row.selesai_at != null ? String(row.selesai_at) : undefined,
  };
}

export interface TaskFilters {
  lokasi_id?: string; lantai_id?: string; status?: ChecklistStatus; search?: string;
}

// Strip prefix (gd-, lt-, etc)
interface TaskPayload {
  nama_tugas?: string;
  kategori_id?: string;
  lantai_id?: string;
  ob_id?: string;
  status?: StatusTask;
  catatan?: string;
  hari?: string[];
  tanggal_ulang?: number;
  tanggal_spesifik?: string[];
  tanggal_mulai?: string;
  tanggal_selesai?: string;
}

const TASKS_KEY = ["tasks"] as const;

async function fetchTasks(filters?: TaskFilters): Promise<Task[]> {
  const params: TugasCombinationParams = {};
  if (filters?.search) params.search = filters.search;

  const data = await getTugasCombination(params).catch(() => null);

  if (!data) return [];

  const rutinTasks = (data.checklist?.items ?? []).map((item) => mapApiChecklistToTask(item as Record<string, unknown>, "Rutin"));
  const tidakRutinTasks = (data.tugas?.items ?? []).map((item) => mapApiTugasToTask(item as Record<string, unknown>));

  return validateList(taskSchema, [...rutinTasks, ...tidakRutinTasks]);
}

// Map API tugas row to Task
function mapApiTugasToTask(row: Record<string, unknown>): Task {
  const get = (v: unknown, ...keys: string[]) =>
    keys.reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), v) ?? "";

  return {
    id: String(row.id ?? ""),
    kategori: String(get(row, "kategori", "nama_kategori") || "-"),
    namaTugas: String(row.nama_tugas || "-"),
    gedung: "-",
    lantai: "-",
    lokasiId: String(row.lantai_id ?? ""),
    lantaiId: String(row.lantai_id ?? ""),
    petugas: { nama: String(get(row, "ob", "nama_lengkap") || row.nama_ob || "Belum ditugaskan") },
    waktu: String(row.created_at ?? "").slice(11, 16) || "-",
    tanggal: String(row.created_at ?? "").slice(0, 10),
    catatan: row.catatan != null ? String(row.catatan) : undefined,
    status: mapApiStatus(row.status),
    jenis: "Tidak Rutin",
    approved: row.approved === true,
    pelapor: row.pelapor != null ? String(row.pelapor) : undefined,
    waktuMulai: row.dikerjakan_at != null ? String(row.dikerjakan_at) : undefined,
    waktuSelesai: row.selesai_at != null ? String(row.selesai_at) : undefined,
  };
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

  const fetchTaskDetail = async (id: string, jenis?: KategoriTugas): Promise<Task | null> => {
    try {
      if (jenis === "Tidak Rutin") {
        return mapApiTugasToTask(await getTugasById(id));
      }
      return mapApiChecklistToTask(await getChecklistHarianDetail(id) as Record<string, unknown>);
    }
    catch { return null; }
  };

  return {
    tasks: query.data ?? [],
    isLoading: query.isPending || isMutating,
    error: mutationError ?? (query.error ? getErrorMessage(query.error) : null),
    fetchTasks: () => qc.invalidateQueries({ queryKey: ["tasks"], refetchType: "all" }),
    fetchTaskDetail,
    createTask: (p: TaskPayload) => runMutation(async () => {
      // Buat tugas Tidak Rutin via /api/tugas
      await createTugas({
        kategori_id: p.kategori_id ?? "",
        nama_tugas: p.nama_tugas ?? "",
        lantai_id: p.lantai_id ?? "",
        catatan: p.catatan,
        tanggal_selesai: p.tanggal_selesai,
      });
      await qc.invalidateQueries({ queryKey: TASKS_KEY, refetchType: "all" });
    }),
    updateTask: (id: string, p: TaskPayload) => runMutation(async () => {
      // Update via /api/tugas (Tidak Rutin)
      await updateTugas(id, {
        kategori_id: p.kategori_id,
        nama_tugas: p.nama_tugas,
        lantai_id: p.lantai_id,
        catatan: p.catatan,
        status: p.status ? (p.status === "Selesai" ? "SELESAI" : p.status === "Proses" ? "SEDANG_DIKERJAKAN" : "BELUM_DIKERJAKAN") : undefined,
      });
      await qc.invalidateQueries({ queryKey: TASKS_KEY });
    }),
    deleteTask: (id: string) => runMutation(async () => {
      // Hapus via /api/tugas
      await deleteTugas(id);
      await qc.invalidateQueries({ queryKey: TASKS_KEY });
    }),
    updateTaskStatus: async (id: string, status: StatusTask) => {
      await updateChecklistHarian(id, { status: mapUiStatus(status) });
      await qc.invalidateQueries({ queryKey: TASKS_KEY });
    },
    approveTask: async (id: string, jenis: KategoriTugas) => {
      if (jenis === "Rutin") {
        await approveChecklistHarian(stripIdPrefix(id));
      } else {
        await approveTugas(stripIdPrefix(id));
      }
      await qc.invalidateQueries({ queryKey: TASKS_KEY });
    },
  };
}
