import apiClient from "../services/apiClient";

export type ChecklistStatus = "BELUM_DIKERJAKAN" | "SEDANG_DIKERJAKAN" | "SELESAI" | "TERLEWAT";
export type ApiChecklist = Record<string, any>;

export interface ChecklistParams {
  page?: number;
  limit?: number;
  search?: string;
  lokasi_id?: string;
  lantai_id?: string;
  status?: ChecklistStatus;
}

export interface ChecklistPayload {
  nama_tugas?: string;
  kategori_id?: string;
  lokasi_id?: string;
  lantai_id?: string;
  ob_id?: string;
  status?: ChecklistStatus;
  catatan?: string;
}

export async function getChecklistHarian(params?: ChecklistParams) {
  // axios interceptor sudah unwrap: response = raw payload
  return apiClient.get<any>("/api/checklist-harian", { params });
}

export async function createChecklistHarian(payload: ChecklistPayload) {
  return apiClient.post<any>("/api/checklist-harian", payload);
}

export async function getChecklistHarianDetail(id: string) {
  return apiClient.get<any>(`/api/checklist-harian/${id}`);
}

export async function updateChecklistHarian(id: string, payload: ChecklistPayload) {
  return apiClient.patch<any>(`/api/checklist-harian/${id}`, payload);
}

export async function deleteChecklistHarian(id: string) {
  return apiClient.delete<any>(`/api/checklist-harian/${id}`);
}
