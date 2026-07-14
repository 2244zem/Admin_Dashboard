import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../lib/apiClient";
import { ENDPOINTS } from "../config/endpoints";
import { getErrorMessage } from "../lib/utils";

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

const mockInitialGedung: Gedung[] = [];

const getStoredGedung = (): Gedung[] => {
  const stored = localStorage.getItem("localGedung");
  if (stored) return JSON.parse(stored);
  localStorage.setItem("localGedung", JSON.stringify(mockInitialGedung));
  return mockInitialGedung;
};

const setStoredGedung = (gedung: Gedung[]) => {
  localStorage.setItem("localGedung", JSON.stringify(gedung));
  window.dispatchEvent(new Event("local-data-changed"));
};

function unwrap(payload: any) {
  return payload?.data ?? payload;
}

function extractArray(payload: any, key?: string): any[] {
  const data = unwrap(payload);
  if (Array.isArray(data)) return data;
  if (key && Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data)) return data.data;
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
        const nomor = item.nomor_lantai ?? item.nomor ?? item.nama_lantai;
        return {
          id: lantaiId,
          label: `L${nomor ?? ""}`,
          nama: item.nama_lantai || (nomor !== undefined ? `Lantai ${nomor}` : "Lantai"),
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

let idCounter = 100;
const genId = (prefix: string) => `${prefix}-${idCounter++}`;

export function useLokasi() {
  const [gedungList, setGedungList] = useState<Gedung[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGedung = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!import.meta.env.VITE_API_BASE_URL) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        setGedungList(getStoredGedung());
        return;
      }

      const [lokasi, lantai, ruangan] = await Promise.all([
        apiClient.get<any>(ENDPOINTS.LOKASI_GEDUNG_LIST),
        apiClient.get<any>("/api/lantai"),
        apiClient.get<any>("/api/ruangan"),
      ]);
      setGedungList(mapApiToGedungList(lokasi, lantai, ruangan));
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGedung();
  }, [fetchGedung]);

  useEffect(() => {
    const handleLocalChange = () => {
      if (!import.meta.env.VITE_API_BASE_URL) {
        setGedungList(getStoredGedung());
      }
    };
    window.addEventListener("local-data-changed", handleLocalChange);
    return () => window.removeEventListener("local-data-changed", handleLocalChange);
  }, []);

  // Gedung CRUD
  const createGedung = async (payload: { nama: string; kapasitas: string }) => {
    setIsLoading(true);
    try {
      if (!import.meta.env.VITE_API_BASE_URL) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const list = getStoredGedung();
        const newGedung: Gedung = {
          id: genId("gd"),
          nama: payload.nama,
          kapasitas: payload.kapasitas,
          lantai: [],
        };
        const updatedList = [...list, newGedung];
        setStoredGedung(updatedList);
        setGedungList(updatedList);
        return;
      }

      await apiClient.post(ENDPOINTS.LOKASI_GEDUNG_CREATE, {
        nama_lokasi: payload.nama,
        jumlah_lantai: Number(payload.kapasitas) || 0,
      });
      await fetchGedung();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const updateGedung = async (id: string, payload: { nama: string; kapasitas: string }) => {
    setIsLoading(true);
    try {
      if (!import.meta.env.VITE_API_BASE_URL) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const list = getStoredGedung();
        const updatedList = list.map((g) =>
          g.id === id ? { ...g, ...payload } : g
        );
        setStoredGedung(updatedList);
        setGedungList(updatedList);
        return;
      }

      await apiClient.patch(ENDPOINTS.LOKASI_GEDUNG_UPDATE(id), {
        nama_lokasi: payload.nama,
        jumlah_lantai: Number(payload.kapasitas) || 0,
      });
      await fetchGedung();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteGedung = async (id: string) => {
    setIsLoading(true);
    try {
      if (!import.meta.env.VITE_API_BASE_URL) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const list = getStoredGedung();
        const updatedList = list.filter((g) => g.id !== id);
        setStoredGedung(updatedList);
        setGedungList(updatedList);
        return;
      }

      await apiClient.delete(ENDPOINTS.LOKASI_GEDUNG_DELETE(id));
      await fetchGedung();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Lantai CRUD
  const createLantai = async (gedungId: string, payload: { nama: string }) => {
    setIsLoading(true);
    try {
      if (!import.meta.env.VITE_API_BASE_URL) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const list = getStoredGedung();
        const updatedList = list.map((g) => {
          if (g.id !== gedungId) return g;
          const nextIndex = g.lantai.length + 1;
          const newLantai: Lantai = {
            id: genId("lt"),
            label: `L${nextIndex}`,
            nama: payload.nama,
            ruangan: [],
          };
          return { ...g, lantai: [...g.lantai, newLantai] };
        });
        setStoredGedung(updatedList);
        setGedungList(updatedList);
        return;
      }

      await apiClient.post(ENDPOINTS.LOKASI_LANTAI_CREATE(gedungId), {
        lokasi_id: gedungId,
        nomor_lantai: Number.parseInt(payload.nama.replace(/\D/g, ""), 10) || 0,
      });
      await fetchGedung();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const updateLantai = async (id: string, payload: { nama: string }) => {
    setIsLoading(true);
    try {
      if (!import.meta.env.VITE_API_BASE_URL) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const list = getStoredGedung();
        const updatedList = list.map((g) => ({
          ...g,
          lantai: g.lantai.map((l) => (l.id === id ? { ...l, nama: payload.nama } : l)),
        }));
        setStoredGedung(updatedList);
        setGedungList(updatedList);
        return;
      }

      await apiClient.patch(ENDPOINTS.LOKASI_LANTAI_UPDATE(id), {
        nomor_lantai: Number.parseInt(payload.nama.replace(/\D/g, ""), 10) || 0,
      });
      await fetchGedung();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteLantai = async (id: string) => {
    setIsLoading(true);
    try {
      if (!import.meta.env.VITE_API_BASE_URL) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const list = getStoredGedung();
        const updatedList = list.map((g) => ({
          ...g,
          lantai: g.lantai.filter((l) => l.id !== id),
        }));
        setStoredGedung(updatedList);
        setGedungList(updatedList);
        return;
      }

      await apiClient.delete(ENDPOINTS.LOKASI_LANTAI_DELETE(id));
      await fetchGedung();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Ruangan CRUD
  const createRuangan = async (lantaiId: string, payload: { nama: string }) => {
    setIsLoading(true);
    try {
      if (!import.meta.env.VITE_API_BASE_URL) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const list = getStoredGedung();
        const updatedList = list.map((g) => ({
          ...g,
          lantai: g.lantai.map((l) => {
            if (l.id !== lantaiId) return l;
            const newRuangan: Ruangan = { id: genId("rg"), nama: payload.nama };
            return { ...l, ruangan: [...l.ruangan, newRuangan] };
          }),
        }));
        setStoredGedung(updatedList);
        setGedungList(updatedList);
        return;
      }

      await apiClient.post(ENDPOINTS.LOKASI_RUANGAN_CREATE(lantaiId), {
        lantai_id: lantaiId,
        nama: payload.nama,
      });
      await fetchGedung();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const updateRuangan = async (id: string, payload: { nama: string }) => {
    setIsLoading(true);
    try {
      if (!import.meta.env.VITE_API_BASE_URL) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const list = getStoredGedung();
        const updatedList = list.map((g) => ({
          ...g,
          lantai: g.lantai.map((l) => ({
            ...l,
            ruangan: l.ruangan.map((r) => (r.id === id ? { ...r, nama: payload.nama } : r)),
          })),
        }));
        setStoredGedung(updatedList);
        setGedungList(updatedList);
        return;
      }

      await apiClient.patch(ENDPOINTS.LOKASI_RUANGAN_UPDATE(id), {
        nama: payload.nama,
      });
      await fetchGedung();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteRuangan = async (id: string) => {
    setIsLoading(true);
    try {
      if (!import.meta.env.VITE_API_BASE_URL) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const list = getStoredGedung();
        const updatedList = list.map((g) => ({
          ...g,
          lantai: g.lantai.map((l) => ({
            ...l,
            ruangan: l.ruangan.filter((r) => r.id !== id),
          })),
        }));
        setStoredGedung(updatedList);
        setGedungList(updatedList);
        return;
      }

      await apiClient.delete(ENDPOINTS.LOKASI_RUANGAN_DELETE(id));
      await fetchGedung();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
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
