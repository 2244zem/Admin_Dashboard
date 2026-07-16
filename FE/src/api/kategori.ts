import apiClient from "../services/apiClient";

export interface Kategori {
  id: string;
  nama_kategori: string;
  created_at?: string;
  updated_at?: string;
}

function unwrapData<T>(response: any): T {
  return response?.data ?? response;
}

export async function getAllKategori() {
  const response = await apiClient.get<any>("/api/kategori");
  return unwrapData<Kategori[]>(response);
}

export async function getKategoriById(id: string) {
  const response = await apiClient.get<any>(`/api/kategori/${id}`);
  return unwrapData<Kategori>(response);
}

export async function createKategori(payload: { nama_kategori: string }) {
  const response = await apiClient.post<any>("/api/kategori", payload);
  return unwrapData<Kategori>(response);
}

export async function updateKategori(id: string, payload: { nama_kategori: string }) {
  const response = await apiClient.put<any>(`/api/kategori/${id}`, payload);
  return unwrapData<Kategori>(response);
}

export async function deleteKategori(id: string) {
  const response = await apiClient.delete<any>(`/api/kategori/${id}`);
  return unwrapData(response);
}
