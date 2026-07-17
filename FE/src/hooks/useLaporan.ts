import { useCallback, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Laporan, StatusLaporan, AreaLaporan, LevelLaporan } from "../types/laporan";
import { getAdminLaporan, getAdminLaporanDetail, updateAdminLaporan, deleteAdminLaporan } from "../api/laporan";
import { getAdminUsers } from "../api/user";
import { API_BASE_URL } from "../lib/apiBaseUrl";
import { getErrorMessage } from "../lib/utils";
import { laporanSchema, validateList } from "../schemas";

function normalizeName(name: unknown): string {
  return String(name || "").trim().toLowerCase().replace(/\s+/g, " ");
}

interface UserPhotoMaps {
  byId: Map<string, string>;
  byName: Map<string, string>;
}

async function buildUserPhotoMaps(): Promise<UserPhotoMaps> {
  const byId = new Map<string, string>();
  const byName = new Map<string, string>();
  try {
    const payload: any = await getAdminUsers({ page: 1, limit: 200 });
    const rows: any[] = extractArray(payload);
    for (const u of rows) {
      const photo = resolveImageUrl(u.profile_picture || u.foto_profil || u.avatar);
      if (!photo) continue;
      const id = String(u.id ?? u.user_id ?? "");
      const name = normalizeName(u.nama_lengkap || u.namaLengkap || u.name || u.username);
      if (id) byId.set(id, photo);
      if (name) byName.set(name, photo);
    }
  } catch {
    // Silently ignore photo map build failures
  }
  return { byId, byName };
}

function extractArray(payload: any): any[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  // Check common wrapper properties - priority order matters!
  const arrayFields = [
    'laporan', 'items', 'data', 'results', 'reports',
    'laporans', 'all_laporan', 'laporan_list', 'riwayat_laporan',
    'data_laporan', 'list', 'all', 'rows'
  ];

  for (const field of arrayFields) {
    // Direct array at field
    if (Array.isArray(payload[field])) {
      return payload[field];
    }

    // Handle nested { laporan: { items: [...] } } structure
    if (payload[field]?.items && Array.isArray(payload[field].items)) {
      return payload[field].items;
    }

    // Handle nested { data: { items: [...] } } structure
    if (payload[field]?.data && Array.isArray(payload[field].data)) {
      return payload[field].data;
    }
  }

  // Check if unwrapData was already called and payload has data property
  if (payload.data !== undefined) {
    if (Array.isArray(payload.data)) {
      return payload.data;
    }
    // Handle { data: { laporan: { items: [...] } } } - nested structure
    if (payload.data?.laporan?.items && Array.isArray(payload.data.laporan.items)) {
      return payload.data.laporan.items;
    }
    // Handle { data: { items: [...] } }
    if (Array.isArray(payload.data?.items)) return payload.data.items;
    if (Array.isArray(payload.data?.data)) return payload.data.data;
  }

  // Handle { laporan: { items: [...] } } directly without data wrapper
  if (payload.laporan?.items && Array.isArray(payload.laporan.items)) {
    return payload.laporan.items;
  }

  return [];
}

function mapStatus(status: unknown): StatusLaporan {
  const value = String(status || "").toUpperCase().replace(/-/g, "_").replace(/ /g, "_");
  // Handle backend enum values (both old format and new format)
  if (["BELUM_DIKERJAKAN", "BELUM", "TODO", "TO_DO", "TO-DO"].includes(value)) return "Menunggu";
  if (["DITUGASKAN", "ASSIGNED", "PROSES", "DIPROSES", "PENDING", "IN_PROGRESS", "INPROGRESS"].includes(value)) return "Ditugaskan";
  if (["SELESAI", "DONE", "COMPLETED"].includes(value)) return "Selesai";
  if (["DITOLAK", "DIBATALKAN", "REJECTED", "CANCELLED", "CANCELED"].includes(value)) return "Ditolak";
  return "Menunggu";
}

// Convert frontend status to backend API format (UPPERCASE)
// Backend only accepts: BELUM_DIKERJAKAN | PENDING | SELESAI | DIBATALKAN
export function statusToBackend(frontendStatus: StatusLaporan): string {
  switch (frontendStatus) {
    case "Menunggu": return "BELUM_DIKERJAKAN";
    case "Ditugaskan": return "PENDING";
    case "Selesai": return "SELESAI";
    case "Ditolak": return "DIBATALKAN"; // Backend uses DIBATALKAN, not DITOLAK
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
    row.nama ||
    row.name ||
    row.username ||
    "Pengguna";

  // Build lokasi - use row.lokasi directly as it's already formatted
  const lokasi = row.lokasi || "-";

  // Handle bukti_foto from various possible structures
  let fotoUrl: string | undefined;
  if (row.bukti_foto) {
    if (typeof row.bukti_foto === "object" && !Array.isArray(row.bukti_foto)) {
      if (Array.isArray(row.bukti_foto.urls) && row.bukti_foto.urls.length > 0) {
        fotoUrl = resolveImageUrl(row.bukti_foto.urls[0]);
      } else if (row.bukti_foto.url || row.bukti_foto.foto_url) {
        fotoUrl = resolveImageUrl(row.bukti_foto.url || row.bukti_foto.foto_url);
      }
    } else if (typeof row.bukti_foto === "string") {
      fotoUrl = resolveImageUrl(row.bukti_foto);
    }
  }

  // Additional foto sources
  if (!fotoUrl) {
    const fotoSources = [
      row.foto, row.foto_url, row.foto_bukti, row.foto_bukti_url,
      row.foto_laporan, row.foto_laporan_url, row.bukti, row.bukti_url,
      row.bukti_url?.url, row.bukti?.url, row.bukti?.foto_url,
      row.lampiran, row.lampiran?.url, row.lampiran?.file_url,
      row.image_url, row.image, row.photo_url, row.gambar,
    ];
    for (const src of fotoSources) {
      if (src) {
        fotoUrl = resolveImageUrl(src);
        if (fotoUrl) break;
      }
    }
  }

  // Foto profil - try to get from various possible API field names
  let fotoProfil: string | undefined;
  const fotoProfilSources = [
    row.foto_profil,
    row.profile_picture,
    row.profilePicture,
    row.foto_profil_karyawan,
    row.karyawan?.foto_profil,
    row.karyawan?.profile_picture,
    row.user?.foto_profil,
    row.user?.profile_picture,
    row.pelapor?.foto_profil,
    row.pelapor?.profile_picture,
  ];
  for (const src of fotoProfilSources) {
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
    initial: getInitial(name),
    karyawanId: String(
      row.karyawan_id ||
        row.user_id ||
        row.pelapor_id ||
        row.id_karyawan ||
        row.karyawan?.id ||
        row.user?.id ||
        row.pelapor?.id ||
        ""
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
    taskId: row.task_id || row.tugas_id || row.checklist_harian_id,
  };
}

async function fetchLaporanQuery(params: any): Promise<Laporan[]> {
  const payload = await getAdminLaporan({
    page: params.page || 1,
    limit: params.limit || 50,
    search: params.search,
    // status already converted to backend enum in component, pass as-is
    status: params.status,
    prioritas: params.prioritas,
    lokasi_id: params.lokasi_id,
    lantai_id: params.lantai_id,
    start_date: params.start_date,
    end_date: params.end_date,
    sort_by: params.sort_by,
    sort_order: params.sort_order,
  });

  const extracted = extractArray(payload);
  const mapped = extracted.map(mapApiLaporanToLaporan);

  // Enrich foto profil dari tabel user (endpoint laporan tidak selalu mengembalikan foto profil)
  const photoMaps = await buildUserPhotoMaps();
  const enriched = mapped.map((l) => {
    if (l.fotoProfil) return l;
    const fotoProfil =
      (l.karyawanId && photoMaps.byId.get(l.karyawanId)) ||
      photoMaps.byName.get(normalizeName(l.name)) ||
      undefined;
    return fotoProfil ? { ...l, fotoProfil } : l;
  });

  return validateList<Laporan>(laporanSchema, enriched, "laporan");
}

// Polling interval: 30 detik (lebih manusiawi, tidak DDoS-like)
const LAPORAN_REFETCH_INTERVAL = 30_000;

export function useLaporan(filters?: any) {
  const queryClient = useQueryClient();
  const laporanFilters = filters || {};
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const query = useQuery({
    queryKey: ["laporan", laporanFilters],
    queryFn: () => fetchLaporanQuery(laporanFilters),
    // Polling lebih lambat (30 detik) untuk mencegah DDoS
    refetchInterval: LAPORAN_REFETCH_INTERVAL,
    // Jangan refetch saat tab tidak aktif (hemat resources)
    refetchIntervalInBackground: false,
    // Retry dengan backoff exponential
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const laporanList = query.data ?? [];
  const isLoading = query.isPending;
  const error = query.error ? getErrorMessage(query.error) : null;

  const fetchLaporan = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["laporan"] });
  }, [queryClient]);

  const updateLaporanStatus = async (_id: number, _status: StatusLaporan) => {
    throw new Error("Endpoint update status laporan belum tersedia di dokumentasi API.");
  };

  const assignLaporan = async (_id: number, _details: any) => {
    throw new Error("Endpoint assign laporan ke OB belum tersedia di dokumentasi API.");
  };

  const deleteLaporan = async (id: string) => {
    try {
      await deleteAdminLaporan(id);
      await fetchLaporan();
    } catch (err) {
      throw err;
    }
  };

  const updateLaporan = async (id: string, payload: any) => {
    try {
      // Backend API supports: status, admin_catatan, prioritas, ob_id
      // See CLAUDE.md API Reference for full spec
      const backendPayload: Record<string, unknown> = {};

      if (payload.status !== undefined) {
        backendPayload.status = statusToBackend(payload.status);
      }
      if (payload.admin_catatan !== undefined) {
        backendPayload.admin_catatan = payload.admin_catatan;
      }
      if (payload.prioritas !== undefined) {
        backendPayload.prioritas = payload.prioritas;
      }
      if (payload.ob_id !== undefined) {
        backendPayload.ob_id = payload.ob_id;
      }

      // Check if there's at least one field to update
      if (Object.keys(backendPayload).length === 0) {
        return;
      }

      const result = await updateAdminLaporan(id, backendPayload);
      await fetchLaporan();
      return result;
    } catch (err) {
      throw err;
    }
  };

  const getLaporanDetail = async (laporan: Laporan): Promise<Laporan> => {
    const laporanId = laporan.backendId || laporan.id_laporan || String(laporan.id);
    // getAdminLaporanDetail already calls unwrapData, so payload is the raw data object
    const payload = await getAdminLaporanDetail(laporanId);
    const mapped = mapApiLaporanToLaporan(payload);

    // Preserve original fields from list data - don't let mapped overwrite critical fields
    // The detail API might have different field names (e.g., waktu_laporan vs created_at)
    return {
      ...mapped,
      // Keep original values from list row (these are already correct)
      id: laporan.id,
      backendId: laporanId,
      id_laporan: laporan.id_laporan,
      createdAt: laporan.createdAt, // Preserve original created time
      name: laporan.name,
      fotoProfil: mapped.fotoProfil || laporan.fotoProfil,
    };
  };

  return {
    laporanList,
    isLoading,
    error,
    fetchLaporan,
    updateLaporanStatus,
    assignLaporan,
    getLaporanDetail,
    deleteLaporan,
    updateLaporan,
  };
}

export default useLaporan;
