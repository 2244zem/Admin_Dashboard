import { apiClient, unwrapData, type ApiResponse } from "./client";

export type ApiLokasi = Record<string, any>;
export type ApiLantai = Record<string, any>;
export type ApiRuangan = Record<string, any>;

export interface LokasiPayload {
  nama_lokasi: string;
  jumlah_lantai: number;
}

export interface LantaiPayload {
  lokasi_id: string;
  nomor_lantai: number;
}

export interface RuanganPayload {
  lantai_id: string;
  nama: string;
}

export async function getLokasi() {
  const response = await apiClient.get<ApiResponse<ApiLokasi[]> | ApiLokasi[]>("/api/lokasi");
  return unwrapData(response);
}

export async function createLokasi(payload: LokasiPayload) {
  const response = await apiClient.post<ApiResponse<ApiLokasi> | ApiLokasi>("/api/lokasi", payload);
  return unwrapData(response);
}

export async function getLokasiDetail(id: string) {
  const response = await apiClient.get<ApiResponse<ApiLokasi> | ApiLokasi>(`/api/lokasi/${id}`);
  return unwrapData(response);
}

export async function updateLokasi(id: string, payload: LokasiPayload) {
  const response = await apiClient.patch<ApiResponse<ApiLokasi> | ApiLokasi>(`/api/lokasi/${id}`, payload);
  return unwrapData(response);
}

export async function deleteLokasi(id: string) {
  const response = await apiClient.delete<ApiResponse<unknown> | unknown>(`/api/lokasi/${id}`);
  return unwrapData(response);
}

export async function getLantai(lokasi_id?: string) {
  const response = await apiClient.get<ApiResponse<ApiLantai[]> | ApiLantai[]>("/api/lantai", { lokasi_id });
  return unwrapData(response);
}

export async function createLantai(payload: LantaiPayload) {
  const response = await apiClient.post<ApiResponse<ApiLantai> | ApiLantai>("/api/lantai", payload);
  return unwrapData(response);
}

export async function getLantaiDetail(id: string, lokasi_id?: string) {
  const response = await apiClient.get<ApiResponse<ApiLantai> | ApiLantai>(`/api/lantai/${id}`, { lokasi_id });
  return unwrapData(response);
}

export async function updateLantai(id: string, payload: Pick<LantaiPayload, "nomor_lantai">, lokasi_id?: string) {
  const suffix = lokasi_id ? `?lokasi_id=${encodeURIComponent(lokasi_id)}` : "";
  const response = await apiClient.patch<ApiResponse<ApiLantai> | ApiLantai>(`/api/lantai/${id}${suffix}`, payload);
  return unwrapData(response);
}

export async function deleteLantai(id: string, lokasi_id?: string) {
  const response = await apiClient.delete<ApiResponse<unknown> | unknown>(
    lokasi_id ? `/api/lantai/${id}?lokasi_id=${encodeURIComponent(lokasi_id)}` : `/api/lantai/${id}`,
  );
  return unwrapData(response);
}

export async function getRuangan(lantai_id?: string) {
  const response = await apiClient.get<ApiResponse<ApiRuangan[]> | ApiRuangan[]>("/api/ruangan", { lantai_id });
  return unwrapData(response);
}

export async function createRuangan(payload: RuanganPayload) {
  const response = await apiClient.post<ApiResponse<ApiRuangan> | ApiRuangan>("/api/ruangan", payload);
  return unwrapData(response);
}

export async function getRuanganDetail(id: string, lantai_id?: string) {
  const response = await apiClient.get<ApiResponse<ApiRuangan> | ApiRuangan>(`/api/ruangan/${id}`, { lantai_id });
  return unwrapData(response);
}

export async function updateRuangan(id: string, payload: Pick<RuanganPayload, "nama">, lantai_id?: string) {
  const suffix = lantai_id ? `?lantai_id=${encodeURIComponent(lantai_id)}` : "";
  const response = await apiClient.patch<ApiResponse<ApiRuangan> | ApiRuangan>(`/api/ruangan/${id}${suffix}`, payload);
  return unwrapData(response);
}

export async function deleteRuangan(id: string, lantai_id?: string) {
  const suffix = lantai_id ? `?lantai_id=${encodeURIComponent(lantai_id)}` : "";
  const response = await apiClient.delete<ApiResponse<unknown> | unknown>(`/api/ruangan/${id}${suffix}`);
  return unwrapData(response);
}
