import apiClient from "../services/apiClient";
import { extractArray, flattenChecklistItems, unwrapData } from "../lib/response";

export type ChecklistStatus = "BELUM_DIKERJAKAN" | "SEDANG_DIKERJAKAN" | "SELESAI" | "TERLEWAT";

export interface ChecklistParams {
  page?: number; limit?: number; search?: string;
  lokasi_id?: string; lantai_id?: string; status?: ChecklistStatus;
}

export interface ChecklistPayload {
  nama_tugas?: string; kategori_id?: string;
  lantai_id?: string; ob_id?: string; status?: ChecklistStatus; catatan?: string;
}

export type ChecklistRow = Record<string, unknown>;

export interface ChecklistHarianResponse {
  items: ChecklistRow[];
  [key: string]: unknown;
}

const ENDPOINT = "/api/checklist-harian";
const JADWAL_ENDPOINT = "/api/jadwal-checklist";
const COMBINATION_ENDPOINT = "/api/admin/tugas-combination";

export interface TugasCombinationParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface TugasCombinationResponse {
  checklist: {
    items: ChecklistRow[];
    meta: { total_items: number; current_page: number; limit: number; total_pages: number };
  };
  tugas: {
    items: Record<string, unknown>[];
    meta: { total_items: number; current_page: number; limit: number; total_pages: number };
  };
}

// Payload untuk jadwal checklist (sesuai Swagger)
export interface JadwalChecklistPayload {
  nama_tugas: string;
  kategori_id: string;
  lantai_id: string;
  ob_id?: string;
  hari?: string[];
  tanggal_ulang?: number;
  tanggal_spesifik?: string[];
  tanggal_mulai?: string;
  tanggal_selesai?: string;
}

export async function getTugasCombination(params?: TugasCombinationParams): Promise<TugasCombinationResponse> {
  const raw = await apiClient.get<unknown>(COMBINATION_ENDPOINT, { params });
  return unwrapData<TugasCombinationResponse>(raw);
}

// ── Jadwal Checklist ──

export interface JadwalChecklist {
  id: string;
  nama_tugas: string;
  kategori_id: string;
  lantai_id: string;
  ob_id?: string;
  hari: string[];
  created_at?: string;
  updated_at?: string;
}

export async function getAllJadwalChecklist(): Promise<JadwalChecklist[]> {
  const raw = await apiClient.get<unknown>(JADWAL_ENDPOINT);
  return extractArray<JadwalChecklist>(raw);
}

export async function getJadwalChecklistDetail(id: string): Promise<JadwalChecklist> {
  const raw = await apiClient.get<unknown>(`${JADWAL_ENDPOINT}/${id}`);
  return unwrapData<JadwalChecklist>(raw);
}

export async function updateJadwalChecklist(id: string, payload: JadwalChecklistPayload) {
  return apiClient.patch<unknown>(`${JADWAL_ENDPOINT}/${id}`, payload);
}

export async function deleteJadwalChecklist(id: string) {
  return apiClient.delete(`${JADWAL_ENDPOINT}/${id}`);
}

// ── Checklist Harian ──

export async function getChecklistHarian(params?: ChecklistParams): Promise<ChecklistHarianResponse> {
  const data = await apiClient.get<ChecklistHarianResponse>(ENDPOINT, { params });
  const raw = extractArray<ChecklistRow>(data, "checklist");
  const items = flattenChecklistItems(raw);
  return { ...data, items };
}

// Buat jadwal checklist (bukan checklist instance langsung)
export async function createJadwalChecklist(payload: JadwalChecklistPayload) {
  return apiClient.post<unknown>(JADWAL_ENDPOINT, payload);
}

export async function getChecklistHarianDetail(id: string): Promise<ChecklistRow> {
  const data = await apiClient.get<unknown>(`${ENDPOINT}/${id}`);
  return unwrapData<ChecklistRow>(data);
}

export async function updateChecklistHarian(id: string, payload: ChecklistPayload) {
  return apiClient.patch<unknown>(`${ENDPOINT}/${id}`, payload);
}

export async function approveChecklistHarian(id: string) {
  return apiClient.patch<unknown>(`/api/admin/checklist-harian/${id}/approve`);
}

export async function deleteChecklistHarian(id: string) {
  return apiClient.delete(`${ENDPOINT}/${id}`);
}
