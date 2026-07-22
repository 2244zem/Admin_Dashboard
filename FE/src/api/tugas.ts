import apiClient from "../services/apiClient";
import { stripIdPrefix, unwrapData } from "../lib/response";

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
  tanggal_selesai?: string;
  is_active?: boolean;
  created_at?: string;
}

export interface GetTugasParams {
  kategori_id?: string;
  status?: TugasStatus | string;
}

function normalizeTugasIds(payload: Partial<Tugas>): Partial<Tugas> {
  return {
    ...payload,
    ...(payload.kategori_id && { kategori_id: stripIdPrefix(payload.kategori_id) }),
    ...(payload.lantai_id && { lantai_id: stripIdPrefix(payload.lantai_id) }),
    ...(payload.ob_id && { ob_id: stripIdPrefix(payload.ob_id) }),
  };
}

export async function getAllTugas(params?: GetTugasParams) {
  const data = await apiClient.get<unknown>("/api/tugas", {
    params: { ...params, kategori_id: params?.kategori_id ? stripIdPrefix(params.kategori_id) : undefined },
  });
  return unwrapData<Tugas[]>(data);
}

// POST /api/tugas — body: { kategori_id, nama_tugas, lantai_id, catatan, tanggal_selesai }
export async function createTugas(payload: { kategori_id: string; nama_tugas: string; lantai_id: string; catatan?: string; tanggal_selesai?: string }) {
  const { catatan, ...body } = normalizeTugasIds(payload);
  return apiClient.post("/api/tugas", {
    ...body,
    tanggal_selesai: body.tanggal_selesai || new Date().toISOString(),
    ...(catatan ? { catatan } : {}),
  });
}

// PATCH /api/tugas/{id} — partial: kategori_id, nama_tugas, lantai_id, catatan, is_active, status, ob_id
export async function updateTugas(id: string, payload: Partial<Tugas>) {
  return apiClient.patch(`/api/tugas/${stripIdPrefix(id)}`, normalizeTugasIds(payload));
}

export async function deleteTugas(id: string) {
  return apiClient.delete(`/api/tugas/${stripIdPrefix(id)}`);
}
