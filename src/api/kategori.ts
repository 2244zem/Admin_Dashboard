import { apiClient, unwrapData, type ApiResponse } from "./client";

export interface Kategori {
  id: string;
  nama_kategori: string;
  created_at?: string;
  updated_at?: string;
}

export async function getAllKategori() {
  const response = await apiClient.get<ApiResponse<Kategori[]> | any>("/api/kategori");
  return unwrapData(response);
}

export async function getKategoriById(id: string) {
  const response = await apiClient.get<ApiResponse<Kategori> | any>(`/api/kategori/${id}`);
  return unwrapData(response);
}

export async function createKategori(payload: { nama_kategori: string }) {
  const response = await apiClient.post<ApiResponse<Kategori> | any>("/api/kategori", payload);
  return unwrapData(response);
}

export async function updateKategori(id: string, payload: { nama_kategori: string }) {
  const response = await apiClient.put<ApiResponse<Kategori> | any>(`/api/kategori/${id}`, payload);
  return unwrapData(response);
}

export async function deleteKategori(id: string) {
  const response = await apiClient.delete<ApiResponse<unknown> | unknown>(`/api/kategori/${id}`);
  return unwrapData(response);
}
