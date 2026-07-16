import { useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../services/apiClient";
import { ENDPOINTS } from "../config/endpoints";
import { getErrorMessage } from "../lib/utils";
import { gedungSchema, validateList } from "../schemas";

// Structures
export interface Ruangan {
  id: string;
  nama: string;
}

export interface Lantai {
  id: string;
  label: string;
  nama: string;
  ruangan: Ruangan[];
}

export interface Gedung {
  id: string;
  nama: string;
  kapasitas: string;
  lantai: Lantai[];
}

// Strip prefix dari ID (backend expect UUID tanpa prefix gd-, lt-, dll)
function stripPrefix(id: string): string {
  if (!id) return id;
  const match = id.match(/^([a-z]+-)?(.+)$/);
  return match ? match[2] : id;
}

function unwrap(payload: any) {
  // Handle { success: true, data: [...] } wrapper
  if (payload?.success && payload?.data !== undefined) {
    return payload.data;
  }
  // Handle direct array or object
  return payload;
}

function extractArray(payload: any, key?: string): any[] {
  const data = unwrap(payload);
  // Handle flat array directly returned by API
  if (Array.isArray(data)) return data;
  // Handle nested array (old format)
  if (key && Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data)) return data.data;
  // Handle wrapped response with success/data
  if (data?.data && Array.isArray(data.data)) return data.data;
  return [];
}

function mapApiToGedungList(lokasiPayload: any, lantaiPayload: any, ruanganPayload: any): Gedung[] {
  const lokasiList = extractArray(lokasiPayload, "lokasi");
  const lantaiList = extractArray(lantaiPayload, "lantai");
  const ruanganList = extractArray(ruanganPayload, "ruangan");

  return lokasiList.map((lokasi: any) => {
    const lokasiId = String(lokasi.id || lokasi.lokasi_id);
    const lantai = lantaiList
      .filter((item: any) => String(item.lokasi_id || item.lokasi?.id) === lokasiId)
      .map((item: any) => {
        const lantaiId = String(item.id || item.lantai_id);
        // Normalize nomor_lantai to number for consistent display
        const nomor = item.nomor_lantai ?? item.nomor ?? item.nama_lantai;
        const nomorNum = typeof nomor === 'string' ? parseInt(nomor, 10) : nomor;
        return {
          id: lantaiId,
          label: `L${nomorNum ?? ""}`,
          nama: item.nama_lantai || (nomorNum !== undefined && !isNaN(nomorNum) ? `Lantai ${nomorNum}` : "Lantai"),
          ruangan: ruanganList
            .filter((ruangan: any) => String(ruangan.lantai_id || ruangan.lantai?.id) === lantaiId)
            .map((ruangan: any) => ({
              id: String(ruangan.id || ruangan.ruangan_id),
              nama: ruangan.nama || ruangan.nama_ruangan || "-",
            })),
        };
      });

    return {
      id: lokasiId,
      nama: lokasi.nama_lokasi || lokasi.nama || "-",
      kapasitas: String(lokasi.jumlah_lantai || lantai.length || 0),
      lantai,
    };
  });
}

const GEDUNG_KEY = ["gedung"] as const;

async function fetchGedungQuery(): Promise<Gedung[]> {
  console.log("🏢 fetchGedungQuery: VITE_API_BASE_URL =", import.meta.env.VITE_API_BASE_URL);

  // Empty VITE_API_BASE_URL = pakai vite proxy → tetap fetch dari API
  // localStorage mock hanya untuk development offline tanpa backend
  console.log("🏢 Fetching from API...");
  const [lokasi, lantai, ruangan] = await Promise.all([
    apiClient.get<any>(ENDPOINTS.LOKASI_GEDUNG_LIST),
    apiClient.get<any>("/api/lantai"),
    apiClient.get<any>("/api/ruangan"),
  ]);
  console.log("🏢✅ API lokasi:", JSON.stringify(lokasi, null, 2));
  console.log("🏢✅ API lantai:", JSON.stringify(lantai, null, 2));
  console.log("🏢✅ API ruangan:", JSON.stringify(ruangan, null, 2));
  const mapped = mapApiToGedungList(lokasi, lantai, ruangan);
  console.log("🏢✅ Mapped gedung:", JSON.stringify(mapped, null, 2));
  return validateList<Gedung>(gedungSchema, mapped, "gedung");
}

// Polling interval: 60 detik (lokasi/gedung jarang berubah)
// Stale time lebih lama karena data gedung relatif stabil
const GEDUNG_STALE_TIME = 60_000;

export function useLokasi() {
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const query = useQuery({
    queryKey: GEDUNG_KEY,
    queryFn: fetchGedungQuery,
    // Always fetch fresh data - don't use stale cache
    staleTime: 0,
    // Polling lebih lambat (60 detik) - data gedung jarang berubah
    refetchInterval: GEDUNG_STALE_TIME,
    // Jangan refetch saat tab tidak aktif
    refetchIntervalInBackground: false,
    // Retry dengan backoff exponential
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const gedungList = query.data ?? [];
  const isLoading = query.isPending;
  const error = query.error ? getErrorMessage(query.error) : null;

  const fetchGedung = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: GEDUNG_KEY });
  }, [queryClient]);

  useEffect(() => {
    const handleLocalChange = () => {
      if (!import.meta.env.VITE_API_BASE_URL) {
        queryClient.invalidateQueries({ queryKey: GEDUNG_KEY });
      }
    };
    window.addEventListener("local-data-changed", handleLocalChange);
    return () => window.removeEventListener("local-data-changed", handleLocalChange);
  }, [queryClient]);

  // Gedung CRUD - selalu panggil API (vite proxy akan redirect ke backend)
  const createGedung = async (payload: { nama: string; kapasitas: string }) => {
    try {
      console.log("🏢➕ createGedung payload:", JSON.stringify({
        nama_lokasi: payload.nama,
        jumlah_lantai: Number(payload.kapasitas) || 0,
      }));
      const result = await apiClient.post(ENDPOINTS.LOKASI_GEDUNG_CREATE, {
        nama_lokasi: payload.nama,
        jumlah_lantai: Number(payload.kapasitas) || 0,
      });
      console.log("🏢✅ createGedung result:", JSON.stringify(result, null, 2));
      await fetchGedung();
    } catch (err: any) {
      console.error("🏢❌ createGedung error:", err);
      const msg = getErrorMessage(err);
      throw new Error(msg);
    }
  };

  const updateGedung = async (id: string, payload: { nama: string; kapasitas: string }) => {
    try {
      console.log("🏢✏️ updateGedung:", stripPrefix(id), payload);
      await apiClient.patch(ENDPOINTS.LOKASI_GEDUNG_UPDATE(stripPrefix(id)), {
        nama_lokasi: payload.nama,
        jumlah_lantai: Number(payload.kapasitas) || 0,
      });
      await fetchGedung();
    } catch (err: any) {
      console.error("🏢❌ updateGedung error:", err);
      const msg = getErrorMessage(err);
      throw new Error(msg);
    }
  };

  const deleteGedung = async (id: string) => {
    try {
      console.log("🏢🗑️ deleteGedung:", stripPrefix(id));
      await apiClient.delete(ENDPOINTS.LOKASI_GEDUNG_DELETE(stripPrefix(id)));
      await fetchGedung();
    } catch (err: any) {
      console.error("🏢❌ deleteGedung error:", err);
      const msg = getErrorMessage(err);
      throw new Error(msg);
    }
  };

  // Lantai CRUD
  const createLantai = async (gedungId: string, payload: { nama: string }) => {
    try {
      const apiPayload = {
        lokasi_id: stripPrefix(gedungId),
        nomor_lantai: Number.parseInt(payload.nama.replace(/\D/g, ""), 10) || 0,
      };
      console.log("🏢➕ createLantai payload:", JSON.stringify(apiPayload));
      const result = await apiClient.post(ENDPOINTS.LOKASI_LANTAI_CREATE(gedungId), apiPayload);
      console.log("🏢✅ createLantai result:", JSON.stringify(result, null, 2));
      await fetchGedung();
    } catch (err: any) {
      console.error("🏢❌ createLantai error:", err);
      const msg = getErrorMessage(err);
      throw new Error(msg);
    }
  };

  const updateLantai = async (id: string, payload: { nama: string }) => {
    try {
      console.log("🏢✏️ updateLantai:", stripPrefix(id), payload);
      await apiClient.patch(ENDPOINTS.LOKASI_LANTAI_UPDATE(stripPrefix(id)), {
        nomor_lantai: Number.parseInt(payload.nama.replace(/\D/g, ""), 10) || 0,
      });
      await fetchGedung();
    } catch (err: any) {
      console.error("🏢❌ updateLantai error:", err);
      const msg = getErrorMessage(err);
      throw new Error(msg);
    }
  };

  const deleteLantai = async (id: string) => {
    try {
      console.log("🏢🗑️ deleteLantai:", stripPrefix(id));
      await apiClient.delete(ENDPOINTS.LOKASI_LANTAI_DELETE(stripPrefix(id)));
      await fetchGedung();
    } catch (err: any) {
      console.error("🏢❌ deleteLantai error:", err);
      const msg = getErrorMessage(err);
      throw new Error(msg);
    }
  };

  // Ruangan CRUD
  const createRuangan = async (lantaiId: string, payload: { nama: string }) => {
    try {
      const apiPayload = {
        lantai_id: stripPrefix(lantaiId),
        nama: payload.nama,
      };
      console.log("🏢➕ createRuangan payload:", JSON.stringify(apiPayload));
      const result = await apiClient.post(ENDPOINTS.LOKASI_RUANGAN_CREATE(lantaiId), apiPayload);
      console.log("🏢✅ createRuangan result:", JSON.stringify(result, null, 2));
      await fetchGedung();
    } catch (err: any) {
      console.error("🏢❌ createRuangan error:", err);
      const msg = getErrorMessage(err);
      throw new Error(msg);
    }
  };

  const updateRuangan = async (id: string, payload: { nama: string }) => {
    try {
      console.log("🏢✏️ updateRuangan:", stripPrefix(id), payload);
      await apiClient.patch(ENDPOINTS.LOKASI_RUANGAN_UPDATE(stripPrefix(id)), {
        nama: payload.nama,
      });
      await fetchGedung();
    } catch (err: any) {
      console.error("🏢❌ updateRuangan error:", err);
      const msg = getErrorMessage(err);
      throw new Error(msg);
    }
  };

  const deleteRuangan = async (id: string) => {
    try {
      console.log("🏢🗑️ deleteRuangan:", stripPrefix(id));
      await apiClient.delete(ENDPOINTS.LOKASI_RUANGAN_DELETE(stripPrefix(id)));
      await fetchGedung();
    } catch (err: any) {
      console.error("🏢❌ deleteRuangan error:", err);
      const msg = getErrorMessage(err);
      throw new Error(msg);
    }
  };

  return {
    gedungList,
    isLoading,
    error,
    fetchGedung,
    createGedung,
    updateGedung,
    deleteGedung,
    createLantai,
    updateLantai,
    deleteLantai,
    createRuangan,
    updateRuangan,
    deleteRuangan,
  };
}

export default useLokasi;
