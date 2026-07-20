import { useCallback, useState } from "react";
import { getObPerformance, type PerformancePeriod } from "../api/performance";
import { getErrorMessage } from "../lib/utils";

export interface ObPerformanceRow {
  userId: string;
  nama: string;
  tugasDiklaim?: number;
  kecepatanRataRata?: string; // contoh: "12.5 min"
  badge?: string;
}

export function usePerformanceOb() {
  const [rows, setRows] = useState<ObPerformanceRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(
    async (obList: Array<{ id: string; nama: string }>, period: PerformancePeriod = "mingguan") => {
      setIsLoading(true);
      setError(null);
      try {
        // N+1 requests — endpoint agregat/leaderboard belum tersedia di API.
        // Kalau jumlah OB banyak, ini perlu diganti endpoint bulk begitu backend menyediakannya.
        const results = await Promise.all(
          obList.map(async (ob) => {
            try {
              const data = await getObPerformance(ob.id, period);
              return {
                userId: ob.id,
                nama: ob.nama,
                tugasDiklaim: data?.tugas_diklaim ?? data?.tugasDiklaim ?? undefined,
                kecepatanRataRata: data?.kecepatan_rata_rata ?? data?.kecepatanRataRata ?? undefined,
                badge: data?.badge ?? undefined,
              } as ObPerformanceRow;
            } catch (err) {
              console.error(`Gagal ambil performa OB ${ob.nama}:`, err);
              return { userId: ob.id, nama: ob.nama } as ObPerformanceRow;
            }
          })
        );
        setRows(results);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { rows, isLoading, error, fetchAll };
}