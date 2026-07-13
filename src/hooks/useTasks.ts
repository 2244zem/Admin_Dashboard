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
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.checklist)) return payload.checklist;
  if (Array.isArray(payload?.checklist?.data)) return payload.checklist.data;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
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
  const tanggal = row.tanggal || row.created_at || row.updated_at || new Date().toISOString();
  const tugas = row.tugas || {};
  const kategori = row.kategori || tugas.kategori || {};
  const lokasi = row.lokasi || {};
  const lantai = row.lantai || {};
  const ob = row.ob || row.petugas || {};

  return {
    id: String(row.id || row.checklist_harian_id || row.checklist_id),
    kategori: row.nama_kategori || kategori.nama_kategori || row.kategori_nama || "-",
    namaTugas: row.nama_tugas || tugas.nama_tugas || row.tugas_nama || "-",
    gedung: row.nama_lokasi || lokasi.nama_lokasi || lokasi.nama || "-",
    lantai:
      row.nama_lantai ||
      lantai.nama_lantai ||
      (lantai.nomor_lantai !== undefined ? `Lantai ${lantai.nomor_lantai}` : "-"),
    petugas: {
      nama: row.nama_ob || ob.nama_lengkap || ob.username || "Belum ditugaskan",
    },
    waktu: String(tanggal).slice(11, 16) || "-",
    tanggal: String(tanggal).slice(0, 10),
    catatan: row.catatan,
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

  const fetchTasks = useCallback(async (params?: any) => {
    setIsLoading(true);
    setError(null);
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
      console.log("✅ Fetched tasks payload:", payload);
      setTasks(extractArray(payload).map(mapApiChecklistToTask));
    } catch (err: any) {
      console.error("❌ Fetch tasks failed:", err);
      console.error("❌ Error details:", { statusCode: err.statusCode, payload: err.payload });
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
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
