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

// Unwrap data helper
function unwrapData<T>(response: any): T {
  return response?.data ?? response;
}

export async function getLokasi() {
  const response = await apiClient.get<any>("/api/lokasi");
  return unwrapData<ApiLokasi[]>(response);
}

export async function createLokasi(payload: LokasiPayload) {
  const response = await apiClient.post<any>("/api/lokasi", payload);
  return unwrapData<ApiLokasi>(response);
}

export async function getLokasiDetail(id: string) {
  const response = await apiClient.get<any>(`/api/lokasi/${id}`);
  return unwrapData<ApiLokasi>(response);
}

export async function updateLokasi(id: string, payload: LokasiPayload) {
  const response = await apiClient.patch<any>(`/api/lokasi/${id}`, payload);
  return unwrapData<ApiLokasi>(response);
}

export async function deleteLokasi(id: string) {
  const response = await apiClient.delete<any>(`/api/lokasi/${id}`);
  return unwrapData(response);
}

export async function getLantai(lokasi_id?: string) {
  const response = await apiClient.get<any>("/api/lantai", { params: { lokasi_id } });
  return unwrapData<ApiLantai[]>(response);
}

export async function createLantai(payload: LantaiPayload) {
  const response = await apiClient.post<any>("/api/lantai", payload);
  return unwrapData<ApiLantai>(response);
}

export async function getLantaiDetail(id: string, lokasi_id?: string) {
  const response = await apiClient.get<any>(`/api/lantai/${id}`, { params: { lokasi_id } });
  return unwrapData<ApiLantai>(response);
}

export async function updateLantai(id: string, payload: Pick<LantaiPayload, "nomor_lantai">, lokasi_id?: string) {
  const response = await apiClient.patch<any>(`/api/lantai/${id}`, payload, { params: { lokasi_id } });
  return unwrapData<ApiLantai>(response);
}

export async function deleteLantai(id: string, lokasi_id?: string) {
  const response = await apiClient.delete<any>(`/api/lantai/${id}`, { params: { lokasi_id } });
  return unwrapData(response);
}

export async function getRuangan(lantai_id?: string) {
  const response = await apiClient.get<any>("/api/ruangan", { params: { lantai_id } });
  return unwrapData<ApiRuangan[]>(response);
}

export async function createRuangan(payload: RuanganPayload) {
  const response = await apiClient.post<any>("/api/ruangan", payload);
  return unwrapData<ApiRuangan>(response);
}

export async function getRuanganDetail(id: string, lantai_id?: string) {
  const response = await apiClient.get<any>(`/api/ruangan/${id}`, { params: { lantai_id } });
  return unwrapData<ApiRuangan>(response);
}

export async function updateRuangan(id: string, payload: Pick<RuanganPayload, "nama">, lantai_id?: string) {
  const response = await apiClient.patch<any>(`/api/ruangan/${id}`, payload, { params: { lantai_id } });
  return unwrapData<ApiRuangan>(response);
}

export async function deleteRuangan(id: string, lantai_id?: string) {
  const response = await apiClient.delete<any>(`/api/ruangan/${id}`, { params: { lantai_id } });
  return unwrapData(response);
}
