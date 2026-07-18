import apiClient from "../services/apiClient";

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
  return apiClient.get<ApiLokasi[]>("/api/lokasi");
}

export async function createLokasi(payload: LokasiPayload) {
  return apiClient.post<ApiLokasi>("/api/lokasi", payload);
}

export async function getLokasiDetail(id: string) {
  return apiClient.get<ApiLokasi>(`/api/lokasi/${id}`);
}

export async function updateLokasi(id: string, payload: LokasiPayload) {
  return apiClient.patch<ApiLokasi>(`/api/lokasi/${id}`, payload);
}

export async function deleteLokasi(id: string) {
  return apiClient.delete(`/api/lokasi/${id}`);
}

export async function getLantai(lokasi_id?: string) {
  return apiClient.get<ApiLantai[]>("/api/lantai", { params: { lokasi_id } });
}

export async function createLantai(payload: LantaiPayload) {
  return apiClient.post<ApiLantai>("/api/lantai", payload);
}

export async function getLantaiDetail(id: string, lokasi_id?: string) {
  return apiClient.get<ApiLantai>(`/api/lantai/${id}`, { params: { lokasi_id } });
}

export async function updateLantai(id: string, payload: Pick<LantaiPayload, "nomor_lantai">, lokasi_id?: string) {
  return apiClient.patch<ApiLantai>(`/api/lantai/${id}`, payload, { params: { lokasi_id } });
}

export async function deleteLantai(id: string, lokasi_id?: string) {
  return apiClient.delete(`/api/lantai/${id}`, { params: { lokasi_id } });
}

export async function getRuangan(lantai_id?: string) {
  return apiClient.get<ApiRuangan[]>("/api/ruangan", { params: { lantai_id } });
}

export async function createRuangan(payload: RuanganPayload) {
  return apiClient.post<ApiRuangan>("/api/ruangan", payload);
}

export async function getRuanganDetail(id: string, lantai_id?: string) {
  return apiClient.get<ApiRuangan>(`/api/ruangan/${id}`, { params: { lantai_id } });
}

export async function updateRuangan(id: string, payload: Pick<RuanganPayload, "nama">, lantai_id?: string) {
  return apiClient.patch<ApiRuangan>(`/api/ruangan/${id}`, payload, { params: { lantai_id } });
}

export async function deleteRuangan(id: string, lantai_id?: string) {
  return apiClient.delete(`/api/ruangan/${id}`, { params: { lantai_id } });
}
