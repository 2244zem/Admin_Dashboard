import { useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../services/apiClient";
import { getLokasi, getLantai, getRuangan } from "../api/lokasi";
import { extractArray, stripIdPrefix } from "../lib/response";
import { getErrorMessage } from "../lib/utils";

export interface Ruangan { id: string; nama: string }
export interface Lantai { id: string; label: string; nama: string; ruangan: Ruangan[] }
export interface Gedung { id: string; nama: string; kapasitas: string; lantai: Lantai[] }

const GEDUNG_KEY = ["gedung"] as const;

async function fetchGedung(): Promise<Gedung[]> {
  const [lokasi, lantai, ruangan] = await Promise.all([
    getLokasi(), getLantai(), getRuangan()
  ]);

  const lokasiList = extractArray(lokasi, "lokasi");
  const lantaiList = extractArray(lantai, "lantai");
  const ruanganList = extractArray(ruangan, "ruangan");

  return lokasiList.map((loc: any) => {
    const lantai = lantaiList
      .filter((l: any) => String(l.lokasi_id) === String(loc.id))
      .map((l: any) => ({
        id: String(l.id),
        label: `L${l.nomor_lantai ?? ""}`,
        nama: l.nama_lantai || `Lantai ${l.nomor_lantai}`,
        ruangan: ruanganList
          .filter((r: any) => String(r.lantai_id) === String(l.id))
          .map((r: any) => ({ id: String(r.id), nama: r.nama || "-" })),
      }));

    return { id: String(loc.id), nama: loc.nama_lokasi || "-", kapasitas: String(loc.jumlah_lantai || lantai.length), lantai };
  });
}

export { useLokasi };
export default useLokasi;
function useLokasi() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: GEDUNG_KEY,
    queryFn: fetchGedung,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: 2,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 30_000),
  });

  const refetch = () => qc.invalidateQueries({ queryKey: GEDUNG_KEY });

  useEffect(() => {
    const h = () => { if (!import.meta.env.VITE_API_BASE_URL) refetch(); };
    window.addEventListener("local-data-changed", h);
    return () => window.removeEventListener("local-data-changed", h);
  }, [qc]);

  const run = (fn: () => Promise<any>) => fn().catch((e: any) => { throw new Error(getErrorMessage(e)); });

  return {
    gedungList: query.data ?? [],
    isLoading: query.isPending,
    error: query.error ? getErrorMessage(query.error) : null,
    fetchGedung: refetch,

    createGedung: (p: { nama: string; kapasitas: string }) =>
      run(async () => { await apiClient.post("/api/lokasi", { nama_lokasi: p.nama, jumlah_lantai: Number(p.kapasitas) || 0 }); await refetch(); }),

    updateGedung: (id: string, p: { nama: string; kapasitas: string }) =>
      run(async () => { await apiClient.patch(`/api/lokasi/${stripIdPrefix(id)}`, { nama_lokasi: p.nama, jumlah_lantai: Number(p.kapasitas) || 0 }); await refetch(); }),

    deleteGedung: (id: string) =>
      run(async () => { await apiClient.delete(`/api/lokasi/${stripIdPrefix(id)}`); await refetch(); }),

    createLantai: (gedungId: string, p: { nama: string }) =>
      run(async () => { await apiClient.post("/api/lantai", { lokasi_id: stripIdPrefix(gedungId), nomor_lantai: Number(p.nama.replace(/\D/g, "")) || 0 }); await refetch(); }),

    updateLantai: (id: string, p: { nama: string }) =>
      run(async () => { await apiClient.patch(`/api/lantai/${stripIdPrefix(id)}`, { nomor_lantai: Number(p.nama.replace(/\D/g, "")) || 0 }); await refetch(); }),

    deleteLantai: (id: string) =>
      run(async () => { await apiClient.delete(`/api/lantai/${stripIdPrefix(id)}`); await refetch(); }),

    createRuangan: (lantaiId: string, p: { nama: string }) =>
      run(async () => { await apiClient.post("/api/ruangan", { lantai_id: stripIdPrefix(lantaiId), nama: p.nama }); await refetch(); }),

    updateRuangan: (id: string, p: { nama: string }) =>
      run(async () => { await apiClient.patch(`/api/ruangan/${stripIdPrefix(id)}`, { nama: p.nama }); await refetch(); }),

    deleteRuangan: (id: string) =>
      run(async () => { await apiClient.delete(`/api/ruangan/${stripIdPrefix(id)}`); await refetch(); }),
  };
}
