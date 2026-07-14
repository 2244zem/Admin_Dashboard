import { apiClient, unwrapData, type ApiResponse, type QueryParams } from "./client";

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

export interface TugasParams extends QueryParams {
  kategori_id?: string;
}

export async function getAllTugas(params?: TugasParams) {
  const response = await apiClient.get<ApiResponse<Tugas[]> | any>("/api/tugas", params);
  return unwrapData(response);
}

export async function getTugasById(id: string) {
  const response = await apiClient.get<ApiResponse<Tugas> | any>(`/api/tugas/${id}`);
  return unwrapData(response);
}

export async function createTugas(payload: { kategori_id: string; nama_tugas: string }) {
  const response = await apiClient.post<ApiResponse<Tugas> | any>("/api/tugas", payload);
  return unwrapData(response);
}

export async function updateTugas(id: string, payload: { kategori_id?: string; nama_tugas?: string; is_active?: boolean }) {
  const response = await apiClient.patch<ApiResponse<Tugas> | any>(`/api/tugas/${id}`, payload);
  return unwrapData(response);
}

export async function deleteTugas(id: string) {
  const response = await apiClient.delete<ApiResponse<unknown> | unknown>(`/api/tugas/${id}`);
  return unwrapData(response);
}
