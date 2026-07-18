import apiClient from "../services/apiClient";

export interface Tugas {
  id: string;
  kategori_id: string;
  nama_tugas: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  kategori?: {
    id: string;
    nama_kategori: string;
  };
}

export interface TugasParams {
  kategori_id?: string;
}

export async function getAllTugas(params?: TugasParams) {
  return apiClient.get<Tugas[]>("/api/tugas", { params });
}

export async function getTugasById(id: string) {
  return apiClient.get<Tugas>(`/api/tugas/${id}`);
}

export async function createTugas(payload: { kategori_id: string; nama_tugas: string }) {
  return apiClient.post<Tugas>("/api/tugas", payload);
}

export async function updateTugas(id: string, payload: { kategori_id?: string; nama_tugas?: string; is_active?: boolean }) {
  return apiClient.patch<Tugas>(`/api/tugas/${id}`, payload);
}

export async function deleteTugas(id: string) {
  return apiClient.delete(`/api/tugas/${id}`);
}
