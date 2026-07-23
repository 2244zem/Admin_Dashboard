import { useCallback, useState } from "react";
import {
  getObPerformanceDashboard,
  getObRanking,
  type ObPerformanceDashboard,
  type ObRankingItem,
  type PerformancePeriod,
} from "../api/performance";
import { getErrorMessage } from "../lib/utils";
import { resolveAssetUrl } from "../lib/assets";

export interface ObPerformanceRow {
  userId: string;
  nama: string;
  fotoProfil?: string;
  tugasDiklaim?: number;
  kecepatanRataRata?: string;
  achievements: Array<{ nama: string; icon?: string }>;
}

export function usePerformanceOb() {
  const [dashboard, setDashboard] = useState<ObPerformanceDashboard | null>(null);
  const [rows, setRows] = useState<ObPerformanceRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(
    async (_obList: unknown, period: PerformancePeriod = "bulanan") => {
      setIsLoading(true);
      setError(null);
      try {
        const [dashData, rankingData] = await Promise.all([
          getObPerformanceDashboard(period),
          getObRanking(),
        ]);
        // eslint-disable-next-line no-console
        console.log("[usePerformanceOb] dashboard:", dashData, "ranking:", rankingData);

        const ranking = (rankingData as ObRankingItem[]) ?? [];

        const enrichedRows: ObPerformanceRow[] = ranking.map((item) => {
          const achievements = (item.ob.skills ?? []).map((s) => ({
            nama: s.nama_skill,
            icon: undefined,
          }));

          return {
            userId: item.ob.id,
            nama: item.ob.nama_lengkap,
            fotoProfil: resolveAssetUrl(item.ob.profile_picture),
            tugasDiklaim: item.total_tugas_claimed,
            kecepatanRataRata:
              item.rata_rata_kecepatan > 0
                ? `${(item.rata_rata_kecepatan / 60).toFixed(1)}`
                : undefined,
            achievements,
          };
        });

        setDashboard(dashData as ObPerformanceDashboard);
        setRows(enrichedRows);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[usePerformanceOb] error:", err);
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { dashboard, rows, isLoading, error, fetchAll };
}