import { useState, useEffect, useCallback } from "react";
import type { Task, StatusTask } from "../types/task";
import {
  createChecklistHarian,
  deleteChecklistHarian,
  getChecklistHarian,
  updateChecklistHarian,
  type ChecklistStatus,
} from "../api/checklist";
import { getErrorMessage } from "../lib/utils";

function extractArray(payload: any): any[] {
  console.log("📋 extractArray tasks: checking payload structure, keys:", Object.keys(payload || {}));
  if (Array.isArray(payload)) {
    console.log("📋 extractArray: payload is array, length:", payload.length);
    return payload;
  }

  // Handle { checklist: { items: [...] } } structure
  if (Array.isArray(payload?.checklist?.items)) {
    console.log("📋 extractArray: using checklist.items, length:", payload.checklist.items.length);
    return payload.checklist.items;
  }

  // Handle { checklist: [...] } direct array
  if (Array.isArray(payload?.checklist)) return payload.checklist;
  if (Array.isArray(payload?.checklist?.data)) return payload.checklist.data;
  if (Array.isArray(payload?.data)) {
    console.log("📋 extractArray: using payload.data, length:", payload.data.length);
    return payload.data;
  }
  if (Array.isArray(payload?.items)) return payload.items;

  // Additional common structures
  if (Array.isArray(payload?.tasks)) return payload.tasks;
  if (Array.isArray(payload?.task_list)) return payload.task_list;
  if (Array.isArray(payload?.checklist_harian)) return payload.checklist_harian;
  if (Array.isArray(payload?.all_checklist)) return payload.all_checklist;
  if (Array.isArray(payload?.results)) return payload.results;

  console.warn("⚠️ extractArray: No array found in payload");
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

  // More comprehensive name extraction
  const namaOb = row.nama_ob || ob.nama_lengkap || ob.username || ob.nama || ob.name || "Belum ditugaskan";
  console.log("📋 mapApiChecklistToTask: resolved namaOb:", namaOb);

  // More comprehensive gedung/lokasi extraction
  const namaGedung = row.nama_lokasi || lokasi.nama_lokasi || lokasi.nama || lokasi.name || row.gedung || "-";
  const namaLantai = row.nama_lantai || lantai.nama_lantai || lantai.nama ||
    (lantai.nomor_lantai !== undefined ? `Lantai ${lantai.nomor_lantai}` : row.lantai || "-");

  // More comprehensive tugas extraction
  const namaTugas = row.nama_tugas || tugas.nama_tugas || row.tugas_nama || tugas.nama || row.nama || row.name || "-";

  // More comprehensive kategori extraction
  const namaKategori = row.nama_kategori || kategori.nama_kategori || row.kategori_nama || kategori.nama || row.kategori || "-";

  return {
    id: String(row.id || row.checklist_harian_id || row.checklist_id || row.task_id || ""),
    kategori: namaKategori,
    namaTugas: namaTugas,
    gedung: namaGedung,
    lantai: namaLantai,
    petugas: {
      nama: namaOb,
    },
    waktu: String(tanggal).slice(11, 16) || row.waktu || "-",
    tanggal: String(tanggal).slice(0, 10) || row.tanggal || new Date().toISOString().slice(0, 10),
    catatan: row.catatan || row.notes || row.description,
    status: mapApiStatus(row.status),
  };
}

function toChecklistPayload(payload: any) {
  const result: any = {};
  
  // Only include fields that have values (not undefined/null)
  if (payload.tugas_id) result.tugas_id = payload.tugas_id;
  if (payload.kategori_id) result.kategori_id = payload.kategori_id;
  if (payload.lokasi_id) result.lokasi_id = payload.lokasi_id;
  if (payload.lantai_id) result.lantai_id = payload.lantai_id;
  if (payload.ob_id || payload.ob) result.ob_id = payload.ob_id || payload.ob;
  if (payload.status) result.status = mapUiStatus(payload.status);
  if (payload.catatan) result.catatan = payload.catatan;
  
  return result;
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async (params?: any, opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) {
      setIsLoading(true);
      setError(null);
    }
    try {
      // Build clean params object, only include defined values
      const queryParams: any = {};
      if (params?.page !== undefined) queryParams.page = params.page;
      if (params?.limit !== undefined) queryParams.limit = params.limit;
      if (params?.search) queryParams.search = params.search;
      if (params?.lokasi_id) queryParams.lokasi_id = params.lokasi_id;
      if (params?.lantai_id) queryParams.lantai_id = params.lantai_id;
      if (params?.status) queryParams.status = params.status;

      console.log("🔍 Fetching tasks with params:", queryParams);
      const payload = await getChecklistHarian(Object.keys(queryParams).length > 0 ? queryParams : undefined);
      console.log("✅ Fetched tasks raw payload:", JSON.stringify(payload, null, 2)?.slice(0, 1000));

      const extracted = extractArray(payload);
      console.log("✅ Extracted", extracted.length, "tasks from payload");
      if (extracted.length > 0) {
        console.log("✅ First task keys:", Object.keys(extracted[0]));
        console.log("✅ First task sample:", JSON.stringify(extracted[0])?.slice(0, 500));
      }

      setTasks(extracted.map(mapApiChecklistToTask));
    } catch (err: any) {
      console.error("❌ Fetch tasks failed:", err);
      console.error("❌ Error details:", { statusCode: err.statusCode, payload: err.payload });
      if (!silent) setError(getErrorMessage(err));
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(() => fetchTasks(undefined, { silent: true }), 5000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const createTask = async (payload: any) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log("🔍 Creating task with payload:", payload);
      const checklistPayload = toChecklistPayload(payload);
      console.log("🔍 Mapped to checklist payload:", checklistPayload);
      
      await createChecklistHarian(checklistPayload);
      await fetchTasks();
    } catch (err: any) {
      console.error("❌ Create task failed:", err);
      console.error("❌ Error payload:", err.payload);
      const msg = getErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTask = async (id: string, payload: any) => {
    setIsLoading(true);
    setError(null);
    try {
      await updateChecklistHarian(id, toChecklistPayload(payload));
      await fetchTasks();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTask = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await deleteChecklistHarian(id);
      await fetchTasks();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTaskStatus = async (id: string, status: StatusTask) => {
    try {
      await updateChecklistHarian(id, { status: mapUiStatus(status) });
      setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, status } : task)));
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  return {
    tasks,
    isLoading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
  };
}

export default useTasks;
