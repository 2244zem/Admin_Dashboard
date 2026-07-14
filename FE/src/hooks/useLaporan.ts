import { useState, useEffect, useCallback } from "react";
import type { Laporan, StatusLaporan, AreaLaporan, LevelLaporan } from "../types/laporan";
import { getAdminLaporan, getAdminLaporanDetail, getUserProfile, updateAdminLaporan, deleteAdminLaporan } from "../api/laporan";
import { getAdminUsers } from "../api/user";
import { API_BASE_URL } from "../api/client";
import { getErrorMessage } from "../lib/utils";

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
  } catch (err) {
    console.warn("⚠️ buildUserPhotoMaps: gagal memuat foto profil user:", err);
  }
  return { byId, byName };
}

function extractArray(payload: any): any[] {
  console.log("📋 extractArray: checking payload structure, keys:", Object.keys(payload || {}));

  if (Array.isArray(payload)) {
    console.log("📋 extractArray: payload is array, length:", payload.length);
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    console.warn("⚠️ extractArray: payload is not an object:", payload);
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
      console.log(`📋 extractArray: found array at payload.${field}, length:`, payload[field].length);
      return payload[field];
    }

    // Handle nested { laporan: { items: [...] } } structure
    if (payload[field]?.items && Array.isArray(payload[field].items)) {
      console.log(`📋 extractArray: found array at payload.${field}.items, length:`, payload[field].items.length);
      return payload[field].items;
    }

    // Handle nested { data: { items: [...] } } structure
    if (payload[field]?.data && Array.isArray(payload[field].data)) {
      console.log(`📋 extractArray: found array at payload.${field}.data, length:`, payload[field].data.length);
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
      console.log(`📋 extractArray: found array at payload.data.laporan.items, length:`, payload.data.laporan.items.length);
      return payload.data.laporan.items;
    }
    // Handle { data: { items: [...] } }
    if (Array.isArray(payload.data?.items)) return payload.data.items;
    if (Array.isArray(payload.data?.data)) return payload.data.data;
  }

  // Handle { laporan: { items: [...] } } directly without data wrapper
  if (payload.laporan?.items && Array.isArray(payload.laporan.items)) {
    console.log(`📋 extractArray: found array at payload.laporan.items, length:`, payload.laporan.items.length);
    return payload.laporan.items;
  }

  console.warn("⚠️ extractArray: No array found, payload keys:", Object.keys(payload));
  return [];
}

function extractDetail(payload: any): any {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  if (payload.laporan && !Array.isArray(payload.laporan)) return extractDetail(payload.laporan);
  if (payload.data && !Array.isArray(payload.data)) return extractDetail(payload.data);
  return payload;
}

function mapStatus(status: unknown): StatusLaporan {
  const value = String(status || "").toUpperCase().replace(/-/g, "_").replace(/ /g, "_");
  // Handle backend enum values (both old format and new format)
  if (["BELUM_DIKERJAKAN", "BELUM", "TODO", "TO_DO", "TO-DO"].includes(value)) return "Menunggu";
  if (["DITUGASKAN", "ASSIGNED", "PROSES", "DIPROSES", "PENDING", "IN_PROGRESS", "INPROGRESS"].includes(value)) return "Ditugaskan";
  if (["SELESAI", "DONE", "COMPLETED"].includes(value)) return "Selesai";
  if (["DITOLAK", "REJECTED"].includes(value)) return "Ditolak";
  return "Menunggu";
}

// Convert frontend status to backend API format (UPPERCASE)
export function statusToBackend(frontendStatus: StatusLaporan): string {
  switch (frontendStatus) {
    case "Menunggu": return "BELUM_DIKERJAKAN";
    case "Ditugaskan": return "PENDING";
    case "Selesai": return "SELESAI";
    case "Ditolak": return "DITOLAK";
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
  console.log("📸 mapApiLaporanToLaporan: raw row keys:", Object.keys(row || {}));

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

export function useLaporan(filters?: any) {
  const [laporanList, setLaporanList] = useState<Laporan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLaporan = useCallback(async (activeFilters?: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = activeFilters || filters || {};
      console.log("📋 fetchLaporan: fetching with params:", params);

      // Always use admin endpoint for reports page
      const payload = await getAdminLaporan({
        page: params.page || 1,
        limit: params.limit || 50,  // Increase limit to ensure we get data
        search: params.search,
        status: params.status === "Semua Status" ? undefined : params.status,
        prioritas: params.prioritas,
        lokasi_id: params.lokasi_id,
        lantai_id: params.lantai_id,
        start_date: params.start_date,
        end_date: params.end_date,
        sort_by: params.sort_by,
        sort_order: params.sort_order,
      });

      console.log("📋 fetchLaporan: raw payload type:", typeof payload);
      console.log("📋 fetchLaporan: raw payload keys:", payload ? Object.keys(payload) : "null");
      console.log("📋 fetchLaporan: raw payload:", JSON.stringify(payload)?.slice(0, 1000));

      const extracted = extractArray(payload);
      console.log("📋 fetchLaporan: extracted", extracted.length, "items");
      if (extracted.length > 0) {
        console.log("📋 fetchLaporan: first item:", JSON.stringify(extracted[0])?.slice(0, 500));
      }

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

      setLaporanList(enriched);
    } catch (err: any) {
      console.error("📋 fetchLaporan: error:", err);
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

  const deleteLaporan = async (id: string) => {
    console.log("🗑️ deleteLaporan: deleting laporan with id:", id);
    try {
      await deleteAdminLaporan(id);
      console.log("🗑️ deleteLaporan: success, refreshing list");
      await fetchLaporan();
    } catch (err) {
      console.error("🗑️ deleteLaporan: error:", err);
      throw err;
    }
  };

  const updateLaporan = async (id: string, payload: any) => {
    console.log("✏️ updateLaporan: updating laporan", id, "with payload:", payload);
    try {
      // Backend API supports only: status, prioritas, admin_catatan, ob_id
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
        console.warn("✏️ updateLaporan: no valid fields to update");
        return;
      }

      console.log("✏️ updateLaporan: sending to backend:", backendPayload);
      const result = await updateAdminLaporan(id, backendPayload);
      console.log("✏️ updateLaporan: success, result:", result);
      await fetchLaporan();
      return result;
    } catch (err) {
      console.error("✏️ updateLaporan: error:", err);
      throw err;
    }
  };

  const getLaporanDetail = async (laporan: Laporan): Promise<Laporan> => {
    const laporanId = laporan.backendId || laporan.id_laporan || String(laporan.id);
    // getAdminLaporanDetail already calls unwrapData, so payload is the raw data object
    const payload = await getAdminLaporanDetail(laporanId);
    console.log("📋 getLaporanDetail: raw payload from API:", JSON.stringify(payload, null, 2));
    const mapped = mapApiLaporanToLaporan(payload);
    return {
      ...laporan,
      ...mapped,
      fotoProfil: mapped.fotoProfil || laporan.fotoProfil,
      backendId: laporanId,
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
