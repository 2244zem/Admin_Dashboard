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
  console.log("📥 API Response keys:", Object.keys(response || {}));
  console.log("📥 API Response.data:", response?.data);

  if (response && typeof response === "object") {
    // Handle { success: true, data: { data: [...] }, message: "..." }
    if (Array.isArray(response.data?.data)) {
      console.log("📥 unwrapData: Found array in response.data.data, length:", response.data.data.length);
      return response.data.data as T;
    }
    // Handle { success: true, data: { checklist: [...] }, message: "..." }
    if (Array.isArray(response.data?.checklist)) {
      console.log("📥 unwrapData: Found checklist array in response.data.checklist, length:", response.data.checklist.length);
      return response.data.checklist as T;
    }
    // Handle { success: true, data: [...], message: "..." }
    if (Array.isArray(response.data)) {
      console.log("📥 unwrapData: Found array in response.data, length:", response.data.length);
      return response.data as T;
    }
    // Handle raw array
    if (Array.isArray(response)) {
      console.log("📥 unwrapData: Response itself is array, length:", response.length);
      return response as T;
    }
  }

  console.log("📥 unwrapData: Returning response as-is");
  return response as T;
}

export async function getChecklistHarian(params?: ChecklistParams) {
  console.log("📤 GET checklist-harian params:", params);
  const response = await apiClient.get<any>(ENDPOINTS.TASKS_LIST, { params });
  console.log("📤 GET checklist-harian raw response:", response);
  return unwrapData(response);
}

export async function createChecklistHarian(payload: ChecklistPayload) {
  console.log("📤 POST checklist-harian payload:", JSON.stringify(payload, null, 2));
  try {
    const response = await apiClient.post<any>(ENDPOINTS.TASKS_CREATE, payload);
    console.log("✅ POST success:", response);
    return unwrapData(response);
  } catch (error: any) {
    console.error("❌ POST error:", error);
    throw error;
  }
}

export async function getChecklistHarianDetail(id: string) {
  console.log("📤 GET checklist-harian detail:", id);
  const response = await apiClient.get<any>(ENDPOINTS.TASKS_UPDATE(id));
  // For detail, return full response (not just the array)
  const data = response?.data ?? response;
  console.log("📥 GET detail response:", JSON.stringify(data, null, 2));
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
