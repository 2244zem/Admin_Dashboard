import apiClient from "../services/apiClient";
import { unwrapData } from "../lib/response";

export interface Kategori { id: string; nama_kategori: string }

export async function getAllKategori() {
  const data = await apiClient.get<any>("/api/kategori");
  return unwrapData<Kategori[]>(data);
}

export async function getKategoriById(id: string) {
  const data = await apiClient.get<any>(`/api/kategori/${id}`);
  return unwrapData<Kategori>(data);
}

export async function createKategori(payload: { nama_kategori: string }) {
  return apiClient.post("/api/kategori", payload);
}

export async function updateKategori(id: string, payload: { nama_kategori: string }) {
  // Note: API spec says PUT, not PATCH
  return apiClient.put(`/api/kategori/${id}`, payload);
}

export async function deleteKategori(id: string) {
  return apiClient.delete(`/api/kategori/${id}`);
}
