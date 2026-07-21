import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Laporan, StatusLaporan } from "../types/laporan";
import { getAdminLaporan, getAdminLaporanDetail, updateAdminLaporan, deleteAdminLaporan, type AdminLaporanParams } from "../api/laporan";
import { getErrorMessage, getInitials } from "../lib/utils";
import { getPhotoMaps, resolveAssetUrl } from "../lib/assets";
import { stripIdPrefix } from "../lib/response";

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

  // Handle bukti_foto from various possible structures per spec.
  // Laporan photos arrive under different keys depending on the endpoint:
  // bukti_foto.{urls,url,foto_url} (detail), foto_masalah[] (list per spec), or foto/foto_url.
  const fotoMasalah = row.foto_masalah;
  const buktiFoto = row.bukti_foto as { urls?: unknown; url?: unknown; foto_url?: unknown } | undefined;
  const buktiUrls = Array.isArray(buktiFoto?.urls) ? (buktiFoto!.urls as unknown[]) : [];
  const fotoCandidates = [
    buktiUrls[0],
    buktiFoto?.url,
    buktiFoto?.foto_url,
    row.foto_url,
    row.foto,
    Array.isArray(fotoMasalah) ? fotoMasalah[0] : undefined,
    typeof fotoMasalah === "string" ? fotoMasalah : undefined,
  ].filter((v): v is string | number | boolean => v != null && v !== "").map(String);

  const fotoUrl = resolveAssetUrl(fotoCandidates[0] ?? "");

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
    foto: fotoUrl,
    fotoProfil: row.profile_picture != null ? resolveAssetUrl(String(row.profile_picture)) : (row.karyawan as Record<string, unknown> | undefined)?.profile_picture != null ? resolveAssetUrl(String((row.karyawan as Record<string, unknown> | undefined)?.profile_picture)) : undefined,
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
    lokasi_id: params.lokasi_id ? stripIdPrefix(str(params.lokasi_id)!) : undefined,
    lantai_id: params.lantai_id ? stripIdPrefix(str(params.lantai_id)!) : undefined,
    start_date: str(params.start_date),
    end_date: str(params.end_date),
    sort_by: str(params.sort_by) as AdminLaporanParams["sort_by"],
    sort_order: str(params.sort_order) as AdminLaporanParams["sort_order"],
  });

  // ponytail-debug: dump one raw laporan row so we can find the real foto field
  if (import.meta.env.DEV && items.length) {
    console.log("[laporan raw row]", JSON.stringify(items[0]));
  }

  const photoMaps = await getPhotoMaps();
  const mapped = items.map(mapApiLaporanToLaporan);

  // Enrich with cached profile photos (by karyawanId only — matching by name
  // could attach the wrong photo when two people share a name)
  const enriched = mapped.map((l) => {
    if (l.fotoProfil || !l.karyawanId) return l;
    const photo = photoMaps.get(l.karyawanId);
    return photo ? { ...l, fotoProfil: resolveAssetUrl(photo) } : l;
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
      const raw = await getAdminLaporanDetail(id) as Record<string, unknown>;
      if (import.meta.env.DEV) console.log("[laporan detail raw]", JSON.stringify(raw));
      const mapped = mapApiLaporanToLaporan(raw);
      // Preserve detail-fetched fields; only keep caller values when present
      // (a deep-link passes only backendId, so name/createdAt come from detail).
      return {
        ...mapped,
        ...(laporan.id ? { id: laporan.id } : {}),
        ...(laporan.createdAt ? { createdAt: laporan.createdAt } : {}),
        ...(laporan.name ? { name: laporan.name } : {}),
      };
    },
  };
}
