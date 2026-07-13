import { apiClient, unwrapData, type ApiResponse, type QueryParams } from "./client";

export type ChecklistStatus = "BELUM_DIKERJAKAN" | "SEDANG_DIKERJAKAN" | "SELESAI" | "TERLEWAT";
export type ApiChecklist = Record<string, any>;

export interface ChecklistParams extends QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  lokasi_id?: string;
  lantai_id?: string;
  status?: ChecklistStatus;
}

export interface ChecklistPayload {
  tugas_id?: string;
  kategori_id?: string;
  lokasi_id?: string;
  lantai_id?: string;
  ob_id?: string;
  status?: ChecklistStatus;
  catatan?: string;
}

export async function getChecklistHarian(params?: ChecklistParams) {
  const response = await apiClient.get<ApiResponse<any> | any>("/api/checklist-harian", params);
  return unwrapData(response);
}

export async function createChecklistHarian(payload: ChecklistPayload) {
  const response = await apiClient.post<ApiResponse<ApiChecklist> | ApiChecklist>("/api/checklist-harian", payload);
  return unwrapData(response);
}

export async function getChecklistHarianDetail(id: string) {
  const response = await apiClient.get<ApiResponse<ApiChecklist> | ApiChecklist>(`/api/checklist-harian/${id}`);
  return unwrapData(response);
}

export async function updateChecklistHarian(id: string, payload: ChecklistPayload) {
  const response = await apiClient.patch<ApiResponse<ApiChecklist> | ApiChecklist>(`/api/checklist-harian/${id}`, payload);
  return unwrapData(response);
}

export async function deleteChecklistHarian(id: string) {
  const response = await apiClient.delete<ApiResponse<unknown> | unknown>(`/api/checklist-harian/${id}`);
  return unwrapData(response);
}
