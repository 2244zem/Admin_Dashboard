import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Laporan, StatusLaporan } from "../types/laporan";
import { getAdminLaporan, getAdminLaporanDetail, updateAdminLaporan, deleteAdminLaporan, type AdminLaporanParams } from "../api/laporan";
import { getAdminUsers } from "../api/user";
import { getErrorMessage, getInitials } from "../lib/utils";

// Cached user photo maps (5 min TTL)
let _photoMaps: Map<string, string> | null = null;
let _photoMapsTime = 0;
const PHOTO_TTL = 5 * 60_000;

const getPhotoMaps = async (): Promise<Map<string, string>> => {
  const now = Date.now();
  if (_photoMaps && now - _photoMapsTime < PHOTO_TTL) return _photoMaps;

  const map = new Map<string, string>();
  try {
    const rows = await getAdminUsers({ page: 1, limit: 200 });
    for (const u of rows) {
      const photo = u.profile_picture || u.foto_profil;
      if (photo) {
        const photoStr = String(photo);
        map.set(String(u.id ?? ""), photoStr);
        map.set(String(u.nama_lengkap ?? "").toLowerCase().trim(), photoStr);
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
export const mapApiLaporanToLaporan = (row: Record<string, unknown>): Laporan => {
  const get = (v: unknown, ...keys: string[]): unknown =>
    keys.reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), v) ?? "";

  // Handle bukti_foto from various possible structures per spec
  let fotoUrl: string | undefined;
  const buktiFoto = row.bukti_foto as { urls?: unknown; url?: unknown; foto_url?: unknown } | undefined;
  if (buktiFoto) {
    if (Array.isArray(buktiFoto.urls) && buktiFoto.urls.length > 0) {
      fotoUrl = String(buktiFoto.urls[0]);
    } else if (buktiFoto.url || buktiFoto.foto_url) {
      fotoUrl = String(buktiFoto.url ?? buktiFoto.foto_url);
    }
  }
  fotoUrl = fotoUrl || String(row.foto_url ?? row.foto) || "https://placehold.co/160x120?text=Bukti";

  return {
    id: Number.parseInt(String(row.id ?? "").replace(/\D/g, ""), 10) || 0,
    backendId: String(row.id ?? row.laporan_id ?? ""),
    id_laporan: row.id_laporan != null ? String(row.id_laporan) : undefined,
    name: String(get(row, "nama_karyawan") || get(row, "karyawan", "nama_lengkap") || get(row, "user", "nama_lengkap") || "Pengguna"),
    initial: getInitials(String(get(row, "nama_karyawan") || "P")),
    karyawanId: String(row.karyawan_id || row.user_id || get(row, "karyawan", "id") || ""),
    loc: String(row.lokasi || "-"),
    area: (() => {
      const v = String(get(row, "nama_kategori") || "").toLowerCase();
      if (v.includes("toilet")) return "Toilet";
      if (v.includes("lobi") || v.includes("lobby")) return "Lobi";
      if (v.includes("parkir")) return "Parkir";
      return "Area Kantor";
    })(),
    desc: String(row.deskripsi_kendala || row.deskripsi || row.desc || "-"),
    createdAt: String(row.created_at || new Date().toISOString()),
    status: mapStatus(row.status),
    level: ["URGENT", "TINGGI", "HIGH", "DARURAT"].includes(String(row.prioritas ?? "").toUpperCase()) ? "URGENT" : "STANDARD",
    prioritas: row.prioritas != null ? String(row.prioritas) : "STANDARD",
    foto: fotoUrl ?? "https://placehold.co/160x120?text=Bukti",
    fotoProfil: row.profile_picture != null ? String(row.profile_picture) : (row.karyawan as Record<string, unknown> | undefined)?.profile_picture != null ? String((row.karyawan as Record<string, unknown> | undefined)?.profile_picture) : undefined,
    assignedTo: (() => { const a = get(row, "nama_ob") || get(row, "ob", "nama_lengkap"); return a != null ? String(a) : undefined; })(),
    taskId: row.task_id != null ? String(row.task_id) : undefined,
  };
};

export interface LaporanPage {
  items: Laporan[];
  meta: { total_items: number; current_page: number; limit: number; total_pages: number };
}

async function fetchLaporan(params: Record<string, unknown>): Promise<LaporanPage> {
  const str = (v: unknown) => (v != null ? String(v) : undefined);
  const { items, meta } = await getAdminLaporan({
    page: Number(params.page) || 1,
    limit: Number(params.limit) || 50,
    search: str(params.search),
    status: str(params.status),
    prioritas: str(params.prioritas),
    lokasi_id: str(params.lokasi_id),
    lantai_id: str(params.lantai_id),
    start_date: str(params.start_date),
    end_date: str(params.end_date),
    sort_by: str(params.sort_by) as AdminLaporanParams["sort_by"],
    sort_order: str(params.sort_order) as AdminLaporanParams["sort_order"],
  });

  const photoMaps = await getPhotoMaps();
  const mapped = items.map(mapApiLaporanToLaporan);

  // Enrich with cached profile photos (by karyawanId only — matching by name
  // could attach the wrong photo when two people share a name)
  const enriched = mapped.map((l) => {
    if (l.fotoProfil || !l.karyawanId) return l;
    const photo = photoMaps.get(l.karyawanId);
    return photo ? { ...l, fotoProfil: photo } : l;
  });

  return { items: enriched, meta };
}

export { useLaporan };
export default useLaporan;
function useLaporan(filters?: Record<string, unknown>) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["laporan", filters],
    queryFn: () => fetchLaporan(filters ?? {}),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: 2,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 30_000),
  });

  const refetch = () => qc.invalidateQueries({ queryKey: ["laporan"] });

  const emptyMeta = { total_items: 0, current_page: 1, limit: 0, total_pages: 1 };

  return {
    laporanList: query.data?.items ?? [],
    meta: query.data?.meta ?? emptyMeta,
    isLoading: query.isPending,
    error: query.error ? getErrorMessage(query.error) : null,
    fetchLaporan: refetch,
    deleteLaporan: async (id: string) => { await deleteAdminLaporan(id); await refetch(); },
    updateLaporan: async (id: string, payload: Record<string, unknown>) => {
      const body: Record<string, unknown> = {};
      if (payload.status !== undefined) body.status = statusToBackend(payload.status as StatusLaporan);
      if (payload.admin_catatan !== undefined) body.admin_catatan = payload.admin_catatan;
      if (payload.prioritas !== undefined) body.prioritas = payload.prioritas;
      if (payload.ob_id !== undefined && payload.ob_id !== "") body.ob_id = payload.ob_id;
      // Backend requires an OB assigned before status can become PENDING (Ditugaskan).
      // assignedTo (from the current row) means an OB is already set on the server.
      if (body.status === "PENDING" && !body.ob_id && !payload.assignedTo) {
        throw new Error("Pilih OB terlebih dahulu sebelum menetapkan status Ditugaskan.");
      }
      if (Object.keys(body).length === 0) return;
      await updateAdminLaporan(id, body);
      await refetch();
    },
    getLaporanDetail: async (laporan: Laporan) => {
      const id = laporan.backendId || String(laporan.id);
      const mapped = mapApiLaporanToLaporan(await getAdminLaporanDetail(id) as Record<string, unknown>);
      return { ...mapped, id: laporan.id, createdAt: laporan.createdAt, name: laporan.name };
    },
  };
}
