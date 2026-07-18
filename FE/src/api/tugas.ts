import apiClient from "../services/apiClient";
import { unwrapData } from "../lib/response";

export interface Tugas { id: string; nama_tugas: string; kategori_id: string; is_active?: boolean }

export async function getAllTugas(params?: { kategori_id?: string }) {
  const data = await apiClient.get<any>("/api/tugas", { params });
  return unwrapData<Tugas[]>(data);
}

export async function createTugas(payload: { kategori_id: string; nama_tugas: string }) {
  return apiClient.post("/api/tugas", payload);
}

export async function updateTugas(id: string, payload: Partial<Tugas>) {
  return apiClient.patch(`/api/tugas/${id}`, payload);
}

export async function deleteTugas(id: string) {
  return apiClient.delete(`/api/tugas/${id}`);
}
