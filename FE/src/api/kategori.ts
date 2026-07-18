import apiClient from "../services/apiClient";

export interface Kategori {
  id: string;
  nama_kategori: string;
  created_at?: string;
  updated_at?: string;
}

export async function getAllKategori() {
  return apiClient.get<Kategori[]>("/api/kategori");
}

export async function getKategoriById(id: string) {
  return apiClient.get<Kategori>(`/api/kategori/${id}`);
}

export async function createKategori(payload: { nama_kategori: string }) {
  return apiClient.post<Kategori>("/api/kategori", payload);
}

export async function updateKategori(id: string, payload: { nama_kategori: string }) {
  return apiClient.put<Kategori>(`/api/kategori/${id}`, payload);
}

export async function deleteKategori(id: string) {
  return apiClient.delete(`/api/kategori/${id}`);
}
