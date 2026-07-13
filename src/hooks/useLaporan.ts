import { useState, useEffect, useCallback } from "react";
import type { Laporan, StatusLaporan, AreaLaporan, LevelLaporan } from "../types/laporan";
import { getAdminLaporan, getAdminLaporanDetail, getUserProfile } from "../api/laporan";
import { API_BASE_URL } from "../api/client";
import { getErrorMessage } from "../lib/utils";

function extractArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.laporan)) return payload.laporan;
  if (Array.isArray(payload?.laporan?.data)) return payload.laporan.data;
  if (Array.isArray(payload?.laporan?.items)) return payload.laporan.items;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.laporan)) return payload.data.laporan;
  if (Array.isArray(payload?.riwayat_laporan)) return payload.riwayat_laporan;
  if (Array.isArray(payload?.laporan_list)) return payload.laporan_list;
  return [];
}

function extractDetail(payload: any): any {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  if (payload.laporan && !Array.isArray(payload.laporan)) return extractDetail(payload.laporan);
  if (payload.data && !Array.isArray(payload.data)) return extractDetail(payload.data);
  return payload;
}

function mapStatus(status: unknown): StatusLaporan {
  const value = String(status || "").toUpperCase();
  if (["DITUGASKAN", "ASSIGNED", "PROSES", "DIPROSES"].includes(value)) return "Ditugaskan";
  if (["SELESAI", "DONE", "COMPLETED"].includes(value)) return "Selesai";
  if (["DITOLAK", "REJECTED"].includes(value)) return "Ditolak";
  return "Menunggu";
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

function getInitial(name: string) {
  return (name || "?").trim().charAt(0).toUpperCase() || "?";
}

function resolveImageUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim() || value === "null") return undefined;
  if (/^(https?:|data:)/i.test(value)) return value;
  return API_BASE_URL ? `${API_BASE_URL}${value.startsWith("/") ? value : `/${value}`}` : value;
}

export function mapApiLaporanToLaporan(row: any): Laporan {
  const name =
    row.nama_karyawan ||
    row.karyawan?.nama_lengkap ||
    row.user?.nama_lengkap ||
    row.pelapor?.nama_lengkap ||
    row.nama_lengkap ||
    "Pengguna";
  const lokasi = [
    row.nama_lokasi || row.lokasi?.nama_lokasi || row.lokasi?.nama,
    row.nama_lantai || row.lantai?.nama_lantai || (row.lantai?.nomor_lantai !== undefined ? `Lantai ${row.lantai.nomor_lantai}` : undefined),
    row.nama_ruangan || row.ruangan?.nama_ruangan || row.ruangan?.nama,
  ].filter(Boolean).join(" - ");

  return {
    id: Number(row.id_numeric || row.no || row.laporan_no) || Number.parseInt(String(row.id || row.laporan_id || "0").replace(/\D/g, ""), 10) || 0,
    backendId: String(row.id || row.laporan_id || row.id_laporan || ""),
    id_laporan: row.id_laporan, // Field dari backend service layer
    name,
    initial: getInitial(name),
    loc: lokasi || row.lokasi || row.loc || "-",
    area: mapArea(row),
    lokasi_id: row.nama_kategori || row.kategori || row.lokasi_nama || row.area || row.ruangan?.nama || "Area Kantor", // Untuk grouping di stats
    lantai_id: row.lantai_id || row.lantai?.id || row.lantai?.nama_lantai || row.nama_lantai, // ID lantai
    desc: row.deskripsi || row.deskripsi_laporan || row.keterangan || row.desc || row.catatan || row.nama_tugas || "-",
    createdAt: row.created_at || row.createdAt || row.tanggal || new Date().toISOString(),
    status: mapStatus(row.status),
    level: mapLevel(row.prioritas || row.level),
    prioritas: row.prioritas || row.level || "STANDARD", // Fallback field
    foto:
      resolveImageUrl(
        row.foto ||
          row.foto_url ||
          row.foto_bukti ||
          row.foto_bukti_url ||
          row.foto_laporan ||
          row.foto_laporan_url ||
          row.bukti_foto ||
          row.bukti?.url ||
          row.bukti?.foto_url ||
          row.lampiran?.url ||
          row.lampiran?.file_url ||
          row.image_url ||
          row.image ||
          row.photo_url,
      ) || "https://placehold.co/160x120?text=Bukti",
    fotoProfil: resolveImageUrl(
      row.profile_picture ||
        row.foto_profil ||
        row.foto_profil_url ||
        row.profil_foto ||
        row.avatar ||
        row.karyawan?.profile_picture ||
        row.karyawan?.foto_profil ||
        row.karyawan?.foto ||
        row.user?.profile_picture ||
        row.user?.foto_profil ||
        row.user?.foto ||
        row.pelapor?.profile_picture ||
        row.pelapor?.foto,
    ),
    assignedTo: row.assigned_to || row.ob?.nama_lengkap || row.petugas?.nama_lengkap,
    taskId: row.task_id || row.tugas_id || row.checklist_harian_id,
  };
}

export function useLaporan(filters?: any) {
  const [laporanList, setLaporanList] = useState<Laporan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLaporan = useCallback(async (activeFilters?: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = activeFilters || filters || {};
      const isAdminView = "page" in params || "prioritas" in params || "sort_by" in params;
      const payload = isAdminView
        ? await getAdminLaporan({
            page: params.page,
            limit: params.limit,
            search: params.search,
            status: params.status === "Semua Status" ? undefined : params.status,
            prioritas: params.prioritas,
            lokasi_id: params.lokasi_id,
            lantai_id: params.lantai_id,
            start_date: params.start_date,
            end_date: params.end_date,
            sort_by: params.sort_by,
            sort_order: params.sort_order,
          })
        : await getUserProfile({
            search: params.search,
            status: params.status === "Semua Status" ? undefined : params.status,
            cursor: params.cursor,
            limit: params.limit,
          });

      setLaporanList(extractArray(payload).map(mapApiLaporanToLaporan));
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLaporan();
  }, [fetchLaporan]);

  const updateLaporanStatus = async (_id: number, _status: StatusLaporan) => {
    throw new Error("Endpoint update status laporan belum tersedia di dokumentasi API.");
  };

  const assignLaporan = async (_id: number, _details: any) => {
    throw new Error("Endpoint assign laporan ke OB belum tersedia di dokumentasi API.");
  };

  const getLaporanDetail = async (laporan: Laporan): Promise<Laporan> => {
    const laporanId = laporan.backendId || laporan.id_laporan || String(laporan.id);
    const payload = await getAdminLaporanDetail(laporanId);
    return { ...laporan, ...mapApiLaporanToLaporan(extractDetail(payload)), backendId: laporanId };
  };

  return {
    laporanList,
    isLoading,
    error,
    fetchLaporan,
    updateLaporanStatus,
    assignLaporan,
    getLaporanDetail,
  };
}

export default useLaporan;
