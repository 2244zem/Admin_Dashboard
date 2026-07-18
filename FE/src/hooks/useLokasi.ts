import { useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../services/apiClient";
import { ENDPOINTS } from "../config/endpoints";
import { getErrorMessage, stripIdPrefix } from "../lib/utils";
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
  // Empty VITE_API_BASE_URL = pakai vite proxy → tetap fetch dari API
  // localStorage mock hanya untuk development offline tanpa backend
  const [lokasi, lantai, ruangan] = await Promise.all([
    apiClient.get<any>(ENDPOINTS.LOKASI_GEDUNG_LIST),
    apiClient.get<any>("/api/lantai"),
    apiClient.get<any>("/api/ruangan"),
  ]);
  const mapped = mapApiToGedungList(lokasi, lantai, ruangan);
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
      await apiClient.post(ENDPOINTS.LOKASI_GEDUNG_CREATE, {
        nama_lokasi: payload.nama,
        jumlah_lantai: Number(payload.kapasitas) || 0,
      });
      await fetchGedung();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      throw new Error(msg);
    }
  };

  const updateGedung = async (id: string, payload: { nama: string; kapasitas: string }) => {
    try {
      await apiClient.patch(ENDPOINTS.LOKASI_GEDUNG_UPDATE(stripIdPrefix(id)), {
        nama_lokasi: payload.nama,
        jumlah_lantai: Number(payload.kapasitas) || 0,
      });
      await fetchGedung();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      throw new Error(msg);
    }
  };

  const deleteGedung = async (id: string) => {
    try {
      await apiClient.delete(ENDPOINTS.LOKASI_GEDUNG_DELETE(stripIdPrefix(id)));
      await fetchGedung();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      throw new Error(msg);
    }
  };

  // Lantai CRUD
  const createLantai = async (gedungId: string, payload: { nama: string }) => {
    try {
      const apiPayload = {
        lokasi_id: stripIdPrefix(gedungId),
        nomor_lantai: Number.parseInt(payload.nama.replace(/\D/g, ""), 10) || 0,
      };
      await apiClient.post(ENDPOINTS.LOKASI_LANTAI_CREATE(gedungId), apiPayload);
      await fetchGedung();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      throw new Error(msg);
    }
  };

  const updateLantai = async (id: string, payload: { nama: string }) => {
    try {
      await apiClient.patch(ENDPOINTS.LOKASI_LANTAI_UPDATE(stripIdPrefix(id)), {
        nomor_lantai: Number.parseInt(payload.nama.replace(/\D/g, ""), 10) || 0,
      });
      await fetchGedung();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      throw new Error(msg);
    }
  };

  const deleteLantai = async (id: string) => {
    try {
      await apiClient.delete(ENDPOINTS.LOKASI_LANTAI_DELETE(stripIdPrefix(id)));
      await fetchGedung();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      throw new Error(msg);
    }
  };

  // Ruangan CRUD
  const createRuangan = async (lantaiId: string, payload: { nama: string }) => {
    try {
      const apiPayload = {
        lantai_id: stripIdPrefix(lantaiId),
        nama: payload.nama,
      };
      await apiClient.post(ENDPOINTS.LOKASI_RUANGAN_CREATE(lantaiId), apiPayload);
      await fetchGedung();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      throw new Error(msg);
    }
  };

  const updateRuangan = async (id: string, payload: { nama: string }) => {
    try {
      await apiClient.patch(ENDPOINTS.LOKASI_RUANGAN_UPDATE(stripIdPrefix(id)), {
        nama: payload.nama,
      });
      await fetchGedung();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      throw new Error(msg);
    }
  };

  const deleteRuangan = async (id: string) => {
    try {
      await apiClient.delete(ENDPOINTS.LOKASI_RUANGAN_DELETE(stripIdPrefix(id)));
      await fetchGedung();
    } catch (err: any) {
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
