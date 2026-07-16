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

function unwrapData<T>(response: any): T {
  return response?.data ?? response;
}

export async function getAllTugas(params?: TugasParams) {
  const response = await apiClient.get<any>("/api/tugas", { params });
  return unwrapData<Tugas[]>(response);
}

export async function getTugasById(id: string) {
  const response = await apiClient.get<any>(`/api/tugas/${id}`);
  return unwrapData<Tugas>(response);
}

export async function createTugas(payload: { kategori_id: string; nama_tugas: string }) {
  const response = await apiClient.post<any>("/api/tugas", payload);
  return unwrapData<Tugas>(response);
}

export async function updateTugas(id: string, payload: { kategori_id?: string; nama_tugas?: string; is_active?: boolean }) {
  const response = await apiClient.patch<any>(`/api/tugas/${id}`, payload);
  return unwrapData<Tugas>(response);
}

export async function deleteTugas(id: string) {
  const response = await apiClient.delete<any>(`/api/tugas/${id}`);
  return unwrapData(response);
}
