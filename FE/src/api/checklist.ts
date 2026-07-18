import apiClient from "../services/apiClient";
import { unwrapData, flattenChecklistItems } from "../lib/response";

export type ChecklistStatus = "BELUM_DIKERJAKAN" | "SEDANG_DIKERJAKAN" | "SELESAI" | "TERLEWAT";

export interface ChecklistParams {
  page?: number; limit?: number; search?: string;
  lokasi_id?: string; lantai_id?: string; status?: ChecklistStatus;
}

export interface ChecklistPayload {
  nama_tugas?: string; kategori_id?: string; lokasi_id?: string;
  lantai_id?: string; ob_id?: string; status?: ChecklistStatus; catatan?: string;
}

const ENDPOINT = "/api/checklist-harian";

export async function getChecklistHarian(params?: ChecklistParams) {
  const data = await apiClient.get<any>(ENDPOINT, { params });
  const items = flattenChecklistItems(
    data?.checklist?.items ?? data?.items ?? data?.checklist ?? data ?? []
  );
  return { ...data, items };
}

export async function createChecklistHarian(payload: ChecklistPayload) {
  return apiClient.post<any>(ENDPOINT, payload);
}

export async function getChecklistHarianDetail(id: string) {
  const data = await apiClient.get<any>(`${ENDPOINT}/${id}`);
  return unwrapData(data);
}

export async function updateChecklistHarian(id: string, payload: ChecklistPayload) {
  return apiClient.patch<any>(`${ENDPOINT}/${id}`, payload);
}

export async function deleteChecklistHarian(id: string) {
  return apiClient.delete(`${ENDPOINT}/${id}`);
}
