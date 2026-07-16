import apiClient from "../services/apiClient";
import { ENDPOINTS } from "../config/endpoints";

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
  tugas_id?: string;
  kategori_id?: string;
  lokasi_id?: string;
  lantai_id?: string;
  ob_id?: string;
  status?: ChecklistStatus;
  catatan?: string;
}

// Unwrap data from API response wrapper
function unwrapData<T>(response: any): T {
  if (response && typeof response === "object") {
    // Handle { success: true, data: { data: [...] }, message: "..." }
    if (Array.isArray(response.data?.data)) {
      return response.data.data as T;
    }
    // Handle { success: true, data: { checklist: [...] }, message: "..." }
    if (Array.isArray(response.data?.checklist)) {
      return response.data.checklist as T;
    }
    // Handle { success: true, data: [...], message: "..." }
    if (Array.isArray(response.data)) {
      return response.data as T;
    }
    // Handle raw array
    if (Array.isArray(response)) {
      return response as T;
    }
  }

  return response as T;
}

export async function getChecklistHarian(params?: ChecklistParams) {
  const response = await apiClient.get<any>(ENDPOINTS.TASKS_LIST, { params });
  return unwrapData(response);
}

export async function createChecklistHarian(payload: ChecklistPayload) {
  try {
    const response = await apiClient.post<any>(ENDPOINTS.TASKS_CREATE, payload);
    return unwrapData(response);
  } catch (error: any) {
    throw error;
  }
}

export async function getChecklistHarianDetail(id: string) {
  const response = await apiClient.get<any>(ENDPOINTS.TASKS_UPDATE(id));
  // For detail, return full response (not just the array)
  const data = response?.data ?? response;
  return data;
}

export async function updateChecklistHarian(id: string, payload: ChecklistPayload) {
  const response = await apiClient.patch<any>(ENDPOINTS.TASKS_UPDATE(id), payload);
  return unwrapData(response);
}

export async function deleteChecklistHarian(id: string) {
  const response = await apiClient.delete<any>(ENDPOINTS.TASKS_DELETE(id));
  return unwrapData(response);
}
