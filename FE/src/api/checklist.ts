import apiClient from "../services/apiClient";
import { flattenChecklistItems } from "../lib/response";

export type ChecklistStatus = "BELUM_DIKERJAKAN" | "SEDANG_DIKERJAKAN" | "SELESAI" | "TERLEWAT";

export interface ChecklistParams {
  page?: number; limit?: number; search?: string;
  lokasi_id?: string; lantai_id?: string; status?: ChecklistStatus;
}

export interface ChecklistPayload {
  nama_tugas?: string; kategori_id?: string; lokasi_id?: string;
  lantai_id?: string; ob_id?: string; status?: ChecklistStatus; catatan?: string;
}

export type ChecklistRow = Record<string, unknown>;

export interface ChecklistHarianResponse {
  items: ChecklistRow[];
  [key: string]: unknown;
}

const ENDPOINT = "/api/checklist-harian";

export async function getChecklistHarian(params?: ChecklistParams): Promise<ChecklistHarianResponse> {
  const data = await apiClient.get<ChecklistHarianResponse>(ENDPOINT, { params });
  const items = flattenChecklistItems<ChecklistRow>(
    (data?.checklist as { items?: ChecklistRow[] } | undefined)?.items
      ?? (data?.items as ChecklistRow[] | undefined)
      ?? (data?.checklist as ChecklistRow[] | undefined)
      ?? []
  );
  return { ...data, items };
}

export async function createChecklistHarian(payload: ChecklistPayload) {
  return apiClient.post<unknown>(ENDPOINT, payload);
}

export async function getChecklistHarianDetail(id: string): Promise<ChecklistRow> {
  const data = await apiClient.get<ChecklistRow>(`${ENDPOINT}/${id}`);
  return data;
}

export async function updateChecklistHarian(id: string, payload: ChecklistPayload) {
  return apiClient.patch<unknown>(`${ENDPOINT}/${id}`, payload);
}

export async function deleteChecklistHarian(id: string) {
  return apiClient.delete(`${ENDPOINT}/${id}`);
}
