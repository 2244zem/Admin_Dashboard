import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Laporan, StatusLaporan, AreaLaporan, LevelLaporan } from "../types/laporan";
import { getAdminLaporan, getAdminLaporanDetail, updateAdminLaporan, deleteAdminLaporan } from "../api/laporan";
import { API_BASE_URL } from "../lib/apiBaseUrl";
import { getErrorMessage, getInitials } from "../lib/utils";
import { laporanSchema, validateList } from "../schemas";

function extractArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const data = payload?.data ?? payload;
  if (Array.isArray(data?.laporan?.items)) return data.laporan.items;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data)) return data;
  if (Array.isArray(payload?.laporan?.items)) return payload.laporan.items;
  return [];
}

function mapStatus(status: unknown): StatusLaporan {
  const value = String(status || "").toUpperCase().replace(/-/g, "_").replace(/ /g, "_");
  if (["BELUM_DIKERJAKAN", "BELUM", "TODO", "TO_DO", "TO-DO"].includes(value)) return "Menunggu";
  if (["DITUGASKAN", "ASSIGNED", "PROSES", "DIPROSES", "PENDING", "IN_PROGRESS", "INPROGRESS"].includes(value)) return "Ditugaskan";
  if (["SELESAI", "DONE", "COMPLETED"].includes(value)) return "Selesai";
  if (["DITOLAK", "DIBATALKAN", "REJECTED", "CANCELLED", "CANCELED"].includes(value)) return "Ditolak";
  return "Menunggu";
}

export function statusToBackend(frontendStatus: StatusLaporan): string {
  switch (frontendStatus) {
    case "Menunggu": return "BELUM_DIKERJAKAN";
    case "Ditugaskan": return "PENDING";
    case "Selesai": return "SELESAI";
    case "Ditolak": return "DIBATALKAN";
    default: return "BELUM_DIKERJAKAN";
  }
}

function mapArea(row: any): AreaLaporan {
  const value = String(row.nama_kategori || row.kategori || row.area || row.ruangan?.nama || "").toLowerCase();
  if (value.includes("toilet")) return "Toilet";
  if (value.includes("lobi") || value.includes("lobby")) return "Lobi";
  if (value.includes("parkir")) return "Parkir";
  return "Area Kantor";
}

function mapLevel(prioritas: unknown): LevelLaporan {
  const value = String(prioritas || "").toUpperCase();
  return ["URGENT", "TINGGI", "HIGH", "DARURAT"].includes(value) ? "URGENT" : "STANDARD";
}

function resolveImageUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim() || value === "null") return undefined;
  if (/^(https?:|data:)/i.test(value)) return value;
  return API_BASE_URL ? `${API_BASE_URL}${value.startsWith("/") ? value : `/${value}`}` : value;
}

export function mapApiLaporanToLaporan(row: any): Laporan {
  const name =
    row.nama_karyawan || row.karyawan?.nama_lengkap ||
    row.user?.nama_lengkap || row.pelapor?.nama_lengkap ||
    row.nama_lengkap || row.nama || row.name || row.username || "Pengguna";

  const lokasi = row.lokasi || "-";

  let fotoUrl: string | undefined;
  if (row.bukti_foto) {
    if (typeof row.bukti_foto === "object" && !Array.isArray(row.bukti_foto)) {
      if (Array.isArray(row.bukti_foto.urls) && row.bukti_foto.urls.length > 0) {
        fotoUrl = resolveImageUrl(row.bukti_foto.urls[0]);
      } else {
        fotoUrl = resolveImageUrl(row.bukti_foto.url || row.bukti_foto.foto_url);
      }
    } else if (typeof row.bukti_foto === "string") {
      fotoUrl = resolveImageUrl(row.bukti_foto);
    }
  }
  if (!fotoUrl) {
    for (const src of [row.foto, row.foto_url, row.foto_bukti, row.bukti_url?.url, row.lampiran?.url, row.image_url]) {
      if (src) { fotoUrl = resolveImageUrl(src); if (fotoUrl) break; }
    }
  }

  let fotoProfil: string | undefined;
  for (const src of [row.foto_profil, row.profile_picture, row.karyawan?.profile_picture, row.pelapor?.profile_picture]) {
    if (src && typeof src === "string" && src.trim() && src !== "null") {
      fotoProfil = resolveImageUrl(src);
      if (fotoProfil) break;
    }
  }

  return {
    id: Number(row.id_numeric || row.no || row.laporan_no) || Number.parseInt(String(row.id || row.laporan_id || "0").replace(/\D/g, ""), 10) || 0,
    backendId: String(row.id || row.laporan_id || row.id_laporan || ""),
    id_laporan: row.id_laporan,
    name,
    initial: getInitials(name || "?"),
    karyawanId: String(
      row.karyawan_id || row.user_id || row.pelapor_id || row.id_karyawan ||
      row.karyawan?.id || row.user?.id || row.pelapor?.id || ""
    ) || undefined,
    loc: lokasi,
    area: mapArea(row),
    lokasi_id: row.lokasi_id || row.kategori || row.area || "Area Kantor",
    lantai_id: row.lantai_id || row.lantai?.id,
    desc: row.deskripsi_kendala || row.deskripsi || row.deskripsi_laporan || row.keterangan || row.desc || row.catatan || row.nama_tugas || "-",
    createdAt: row.created_at || row.createdAt || row.tanggal || new Date().toISOString(),
    status: mapStatus(row.status),
    level: mapLevel(row.prioritas || row.level),
    prioritas: row.prioritas || row.level || "STANDARD",
    foto: fotoUrl || "https://placehold.co/160x120?text=Bukti",
    fotoProfil,
    assignedTo: row.nama_ob || row.ob_ditugaskan || row.assigned_to || row.ob?.nama_lengkap || row.petugas?.nama_lengkap || row.ob?.nama,
    ob_id: row.ob_id || row.ob?.id || row.petugas?.id || row.ob_ditugaskan_id || undefined,
    taskId: row.task_id || row.tugas_id || row.checklist_harian_id,
  };
}

async function fetchLaporanQuery(params: any): Promise<Laporan[]> {
  const payload = await getAdminLaporan({
    page: params.page || 1,
    limit: params.limit || 50,
    search: params.search,
    status: params.status,
    prioritas: params.prioritas,
    lokasi_id: params.lokasi_id,
    lantai_id: params.lantai_id,
    start_date: params.start_date,
    end_date: params.end_date,
    sort_by: params.sort_by,
    sort_order: params.sort_order,
  });
  return validateList<Laporan>(laporanSchema, extractArray(payload).map(mapApiLaporanToLaporan), "laporan");
}

export function useLaporan(filters?: any) {
  const queryClient = useQueryClient();
  const laporanFilters = filters || {};

  const query = useQuery({
    queryKey: ["laporan", laporanFilters],
    queryFn: () => fetchLaporanQuery(laporanFilters),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const laporanList = query.data ?? [];
  const isLoading = query.isPending;
  const error = query.error ? getErrorMessage(query.error) : null;

  const fetchLaporan = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["laporan"] });
  }, [queryClient]);

  const deleteLaporan = async (id: string) => {
    await deleteAdminLaporan(id);
    await fetchLaporan();
  };

  const updateLaporan = async (id: string, payload: any) => {
    const backendPayload: Record<string, unknown> = {};
    if (payload.status !== undefined) backendPayload.status = statusToBackend(payload.status);
    if (payload.admin_catatan !== undefined) backendPayload.admin_catatan = payload.admin_catatan;
    if (payload.prioritas !== undefined) backendPayload.prioritas = payload.prioritas;
    if (payload.ob_id !== undefined) backendPayload.ob_id = payload.ob_id;
    if (Object.keys(backendPayload).length === 0) return;

    const result = await updateAdminLaporan(id, backendPayload);
    await fetchLaporan();
    return result;
  };

  const getLaporanDetail = async (laporan: Laporan): Promise<Laporan> => {
    const id = laporan.backendId || laporan.id_laporan || String(laporan.id);
    const detail = await getAdminLaporanDetail(id);
    return {
      ...mapApiLaporanToLaporan(detail),
      id: laporan.id,
      backendId: id,
      id_laporan: laporan.id_laporan,
      createdAt: laporan.createdAt,
      name: laporan.name,
      fotoProfil: mapApiLaporanToLaporan(detail).fotoProfil || laporan.fotoProfil,
      ob_id: mapApiLaporanToLaporan(detail).ob_id || laporan.ob_id,
    };
  };

  return {
    laporanList,
    isLoading,
    error,
    fetchLaporan,
    deleteLaporan,
    updateLaporan,
    getLaporanDetail,
    // these use the same updateLaporan with ob_id/status
    updateLaporanStatus: (id: number, status: StatusLaporan) => updateLaporan(String(id), { status }),
    assignLaporan: (id: number, ob_id: string) => updateLaporan(String(id), { ob_id }),
  };
}

export default useLaporan;
