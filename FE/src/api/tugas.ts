import apiClient from "../services/apiClient";
import { unwrapData } from "../lib/response";

// Ad-hoc Tugas katalog (dokumen CLAUDE.md: /api/tugas) — resource "tugas insidental".
export type TugasStatus = "BELUM_DIKERJAKAN" | "SEDANG_DIKERJAKAN" | "SELESAI";

export interface Tugas {
  id: string;
  nama_tugas: string;
  kategori_id: string;
  lantai_id?: string;
  ob_id?: string | null;
  status?: TugasStatus;
  catatan?: string;
  is_active?: boolean;
  created_at?: string;
}

export interface GetTugasParams {
  kategori_id?: string;
  status?: TugasStatus | string;
}

export async function getAllTugas(params?: GetTugasParams) {
  const data = await apiClient.get<unknown>("/api/tugas", { params });
  return unwrapData<Tugas[]>(data);
}

// POST /api/tugas — body: { kategori_id, nama_tugas, lantai_id, catatan }
export async function createTugas(payload: { kategori_id: string; nama_tugas: string; lantai_id: string; catatan?: string }) {
  return apiClient.post("/api/tugas", payload);
}

// PATCH /api/tugas/{id} — partial: kategori_id, nama_tugas, lantai_id, catatan, is_active, status, ob_id
export async function updateTugas(id: string, payload: Partial<Tugas>) {
  return apiClient.patch(`/api/tugas/${id}`, payload);
}

export async function deleteTugas(id: string) {
  return apiClient.delete(`/api/tugas/${id}`);
}
