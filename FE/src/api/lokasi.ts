import apiClient from "../services/apiClient";
import { unwrapData } from "../lib/response";

// Payloads
export interface LokasiPayload { nama_lokasi: string; jumlah_lantai: number }
export interface LantaiPayload { lokasi_id: string; nomor_lantai: number }
export interface RuanganPayload { lantai_id: string; nama: string }

// Lokasi
export async function getLokasi() {
  const data = await apiClient.get<unknown>("/api/lokasi");
  return unwrapData<unknown[]>(data);
}

export async function createLokasi(payload: LokasiPayload) {
  return apiClient.post("/api/lokasi", payload);
}

export async function getLokasiDetail(id: string) {
  return apiClient.get<unknown>(`/api/lokasi/${id}`);
}

export async function updateLokasi(id: string, payload: LokasiPayload) {
  return apiClient.patch(`/api/lokasi/${id}`, payload);
}

export async function deleteLokasi(id: string) {
  return apiClient.delete(`/api/lokasi/${id}`);
}

// Lantai
export async function getLantai(lokasi_id?: string) {
  return apiClient.get<unknown>("/api/lantai", { params: { lokasi_id } });
}

export async function createLantai(payload: LantaiPayload) {
  return apiClient.post("/api/lantai", payload);
}

export async function updateLantai(id: string, payload: { nomor_lantai: number }) {
  return apiClient.patch(`/api/lantai/${id}`, payload);
}

export async function deleteLantai(id: string) {
  return apiClient.delete(`/api/lantai/${id}`);
}

// Ruangan
export async function getRuangan(lantai_id?: string) {
  return apiClient.get<unknown>("/api/ruangan", { params: { lantai_id } });
}

export async function createRuangan(payload: RuanganPayload) {
  return apiClient.post("/api/ruangan", payload);
}

export async function updateRuangan(id: string, payload: { nama: string }) {
  return apiClient.patch(`/api/ruangan/${id}`, payload);
}

export async function deleteRuangan(id: string) {
  return apiClient.delete(`/api/ruangan/${id}`);
}
