import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Laporan, StatusLaporan } from "../types/laporan";
import { getAdminLaporan, getAdminLaporanDetail, updateAdminLaporan, deleteAdminLaporan } from "../api/laporan";
import { getAdminUsers } from "../api/user";
import { getErrorMessage, getInitials } from "../lib/utils";
import { laporanSchema, validateList } from "../schemas";

// Cached user photo maps (5 min TTL)
let _photoMaps: Map<string, string> | null = null;
let _photoMapsTime = 0;
const PHOTO_TTL = 5 * 60_1000;

const getPhotoMaps = async (): Promise<Map<string, string>> => {
  const now = Date.now();
  if (_photoMaps && now - _photoMapsTime < PHOTO_TTL) return _photoMaps;

  const map = new Map<string, string>();
  try {
    const rows = await getAdminUsers({ page: 1, limit: 200 });
    for (const u of rows) {
      const photo = u.profile_picture || u.foto_profil;
      if (photo) {
        map.set(String(u.id ?? ""), photo);
        map.set(String(u.nama_lengkap ?? "").toLowerCase().trim(), photo);
      }
    }
  } catch { /* graceful */ }
  _photoMaps = map; _photoMapsTime = now;
  return map;
};

// Status mappers - aligned with backend enum
const mapStatus = (s: unknown): StatusLaporan => {
  const v = String(s || "").toUpperCase().replace(/-/g, "_").replace(/ /g, "_");
  if (["BELUM_DIKERJAKAN", "BELUM", "TODO"].includes(v)) return "Menunggu";
  if (["DITUGASKAN", "PENDING", "PROSES", "ASSIGNED", "IN_PROGRESS"].includes(v)) return "Ditugaskan";
  if (["SELESAI", "DONE", "COMPLETED"].includes(v)) return "Selesai";
  if (["DITOLAK", "DIBATALKAN", "REJECTED", "CANCELLED"].includes(v)) return "Ditolak";
  return "Menunggu";
};

// Backend expects: BELUM_DIKERJAKAN | PENDING | SELESAI | DIBATALKAN
export const statusToBackend = (s: StatusLaporan): string =>
  ({ Menunggu: "BELUM_DIKERJAKAN", Ditugaskan: "PENDING", Selesai: "SELESAI", Ditolak: "DIBATALKAN" }[s] ?? "BELUM_DIKERJAKAN");

// Map API row to Laporan - aligned with spec fields
export const mapApiLaporanToLaporan = (row: any): Laporan => {
  const get = (v: any, ...keys: string[]) => keys.reduce((o, k) => o?.[k], v) ?? "";

  // Handle bukti_foto from various possible structures per spec
  let fotoUrl: string | undefined;
  if (row.bukti_foto) {
    if (Array.isArray(row.bukti_foto.urls) && row.bukti_foto.urls.length > 0) {
      fotoUrl = row.bukti_foto.urls[0];
    } else if (row.bukti_foto.url || row.bukti_foto.foto_url) {
      fotoUrl = row.bukti_foto.url || row.bukti_foto.foto_url;
    }
  }
  fotoUrl = fotoUrl || row.foto_url || row.foto || "https://placehold.co/160x120?text=Bukti";

  return {
    id: Number.parseInt(String(row.id ?? "").replace(/\D/g, ""), 10) || 0,
    backendId: String(row.id ?? row.laporan_id ?? ""),
    id_laporan: row.id_laporan,
    name: get(row, "nama_karyawan") || get(row, "karyawan", "nama_lengkap") || get(row, "user", "nama_lengkap") || "Pengguna",
    initial: getInitials(get(row, "nama_karyawan") || "P"),
    karyawanId: String(row.karyawan_id || row.user_id || get(row, "karyawan", "id") || ""),
    loc: row.lokasi || "-",
    area: (() => {
      const v = String(get(row, "nama_kategori") || "").toLowerCase();
      if (v.includes("toilet")) return "Toilet";
      if (v.includes("lobi") || v.includes("lobby")) return "Lobi";
      if (v.includes("parkir")) return "Parkir";
      return "Area Kantor";
    })(),
    desc: row.deskripsi_kendala || row.deskripsi || row.desc || "-",
    createdAt: row.created_at || new Date().toISOString(),
    status: mapStatus(row.status),
    level: ["URGENT", "TINGGI", "HIGH", "DARURAT"].includes(String(row.prioritas ?? "").toUpperCase()) ? "URGENT" : "STANDARD",
    prioritas: row.prioritas || "STANDARD",
    foto: fotoUrl,
    fotoProfil: row.profile_picture || row.karyawan?.profile_picture,
    assignedTo: get(row, "nama_ob") || get(row, "ob", "nama_lengkap") || undefined,
    taskId: row.task_id,
  };
};

async function fetchLaporan(params: any): Promise<Laporan[]> {
  // getAdminLaporan already returns items array directly
  const rows = await getAdminLaporan({
    page: params.page || 1, limit: params.limit || 50,
    search: params.search, status: params.status, prioritas: params.prioritas,
    lokasi_id: params.lokasi_id, lantai_id: params.lantai_id,
    start_date: params.start_date, end_date: params.end_date,
    sort_by: params.sort_by, sort_order: params.sort_order,
  });

  const photoMaps = await getPhotoMaps();
  const mapped = (rows as any[]).map(mapApiLaporanToLaporan);

  // Enrich with cached profile photos
  return mapped.map((l) => {
    if (l.fotoProfil) return l;
    const photo = photoMaps.get(l.karyawanId) || photoMaps.get(l.name.toLowerCase().trim());
    return photo ? { ...l, fotoProfil: photo } : l;
  });
}

export { useLaporan };
export default useLaporan;
function useLaporan(filters?: any) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["laporan", filters],
    queryFn: () => fetchLaporan(filters),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: 2,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 30_000),
  });

  const refetch = () => qc.invalidateQueries({ queryKey: ["laporan"] });

  return {
    laporanList: query.data ?? [],
    isLoading: query.isPending,
    error: query.error ? getErrorMessage(query.error) : null,
    fetchLaporan: refetch,
    updateLaporanStatus: async (_id: number, _status: StatusLaporan) => { throw new Error("Not implemented"); },
    assignLaporan: async (_id: number, _details: any) => { throw new Error("Not implemented"); },
    deleteLaporan: async (id: string) => { await deleteAdminLaporan(id); await refetch(); },
    updateLaporan: async (id: string, payload: any) => {
      const body: Record<string, any> = {};
      if (payload.status !== undefined) body.status = statusToBackend(payload.status);
      if (payload.admin_catatan !== undefined) body.admin_catatan = payload.admin_catatan;
      if (payload.prioritas !== undefined) body.prioritas = payload.prioritas;
      if (payload.ob_id !== undefined) body.ob_id = payload.ob_id;
      if (Object.keys(body).length === 0) return;
      await updateAdminLaporan(id, body);
      await refetch();
    },
    getLaporanDetail: async (laporan: Laporan) => {
      const id = laporan.backendId || String(laporan.id);
      const mapped = mapApiLaporanToLaporan(await getAdminLaporanDetail(id));
      return { ...mapped, id: laporan.id, createdAt: laporan.createdAt, name: laporan.name };
    },
  };
}
