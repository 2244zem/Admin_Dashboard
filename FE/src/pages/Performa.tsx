import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/ui/PageHeader";
import ErrorState from "../components/ui/ErrorState";
import { Skeleton } from "../components/ui/Skeleton";
import SmoothLineChart from "../components/ui/SmoothLineChart";
import Avatar from "../components/ui/Avatar";
import { usePerformanceOb } from "../hooks/usePerformance";
import type { PerformancePeriod } from "../api/performance";

// ═══ Badge tier styling — darker/richer = higher tier (image 3 reference) ═══
type BadgeTier = "utama" | "mahir" | "aktif" | "none";

const BADGE_TIER_STYLE: Record<BadgeTier, { bg: string; text: string }> = {
  utama: { bg: "bg-[#3D2B1F]", text: "text-white" },
  mahir: { bg: "bg-[#8B5E3C]", text: "text-white" },
  aktif: { bg: "bg-[#EFD9C2]", text: "text-[#8B5E3C]" },
  none: { bg: "bg-red-50", text: "text-red-500" },
};

function resolveBadgeTier(name: string): BadgeTier {
  const n = name.toLowerCase();
  if (n.includes("utama")) return "utama";
  if (n.includes("mahir")) return "mahir";
  if (n.includes("aktif")) return "aktif";
  return "aktif";
}

function BadgeIcon({ name }: { name: string }) {
  const n = name.toLowerCase();
  const common = "h-3 w-3 shrink-0";
  if (n.includes("cepat") || n.includes("speed") || n.includes("kecepatan"))
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    );
  if (n.includes("rajin") || n.includes("aktif") || n.includes("diligent"))
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  if (n.includes("utama") || n.includes("terbaik") || n.includes("best"))
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className={common} viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 2 3 14h7l-1 8 11-14h-7l1-6z" />
      </svg>
    );
  if (n.includes("mahir") || n.includes("expert") || n.includes("master"))
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  if (n.includes("teliti") || n.includes("akurat") || n.includes("accurate"))
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    );
  if (n.includes("tangguh") || n.includes("kuat") || n.includes("strong"))
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    );
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={common} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2c-3 4-6 8-6 11.5A6 6 0 0012 20a6 6 0 006-6.5C18 10 15 6 12 2z" />
    </svg>
  );
}

function BadgePill({ name }: { name: string }) {
  const tier = resolveBadgeTier(name);
  const style = BADGE_TIER_STYLE[tier];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${style.bg} ${style.text}`}>
      <BadgeIcon name={name} />
      {name}
    </span>
  );
}

function NoBadgePill() {
  const style = BADGE_TIER_STYLE.none;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${style.bg} ${style.text}`}>
      Belum memperoleh badge
    </span>
  );
}

const PERIOD_LABEL: Record<PerformancePeriod, string> = {
  harian: "Hari Ini",
  mingguan: "7 Hari Terakhir",
  bulanan: "30 Hari Terakhir",
  tahunan: "1 Tahun Terakhir",
};

// ═══ Normalisasi data tren — meniru pola getTahunanData/getBulananData di
// Dashboard.tsx: selalu generate label PENUH sesuai periode, lalu isi count
// dari data asli via lookup (default 0). Ini mencegah chart collapse jadi
// 1 titik ketika backend baru punya sedikit data. ═══
function normalizeTrenLaporan(
  raw: { label: string; total: number }[] | undefined,
  period: PerformancePeriod
): { label: string; count: number }[] {
  const byLabel = new Map((raw ?? []).map((r) => [r.label, r.total]));
  const now = new Date();

  if (period === "tahunan") {
    const labels = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    return labels.map((label) => ({ label, count: byLabel.get(label) ?? 0 }));
  }

  if (period === "bulanan") {
    // 6 bulan terakhir termasuk bulan berjalan, format "Jul 2026"
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      return { label, count: byLabel.get(label) ?? 0 };
    });
  }

  if (period === "mingguan") {
    const labels = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
    return labels.map((label) => ({ label, count: byLabel.get(label) ?? 0 }));
  }

  // harian: pakai data asli kalau backend sudah kirim per-jam;
  // padding minimal 2 titik biar tidak collapse
  const fallback = raw ?? [];
  return fallback.length >= 2
    ? fallback.map((r) => ({ label: r.label, count: r.total }))
    : [{ label: "Awal", count: 0 }, ...fallback.map((r) => ({ label: r.label, count: r.total }))];
}

const Performa = () => {
  const navigate = useNavigate();
  const { rows, dashboard, isLoading, error, fetchAll } = usePerformanceOb();
  const [period, setPeriod] = useState<PerformancePeriod>("bulanan");

  useEffect(() => {
    fetchAll(undefined, period);
  }, [period, fetchAll]);

  const rankedRows = useMemo(
    () => [...rows].sort((a, b) => (b.tugasDiklaim ?? 0) - (a.tugasDiklaim ?? 0)),
    [rows]
  );

  const trenLaporanData = useMemo(
    () => normalizeTrenLaporan(dashboard?.tren_laporan_bulanan, period),
    [dashboard?.tren_laporan_bulanan, period]
  );

  const produktivitasPct = dashboard?.produktivitas ?? 0;
  const tugasTotal = dashboard?.tugas_diselesaikan.total ?? 0;
  const tugasSelesai = dashboard?.tugas_diselesaikan.selesai ?? 0;
  const tugasPct = tugasTotal > 0 ? (tugasSelesai / tugasTotal) * 100 : 0;

  return (
    <div className="flex h-screen bg-white font-sans dark:bg-base">
      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader title="Performa OB" />

        <main className="flex-1 overflow-auto bg-white p-6 font-sans dark:bg-base">
          {isLoading && rows.length === 0 ? (
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-96 mb-6" />
              <div className="grid grid-cols-3 gap-4 mb-6">
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
              </div>
              <Skeleton className="h-64 rounded-xl" />
            </div>
          ) : error ? (
            <ErrorState message={error} onRetry={() => fetchAll(undefined, period)} />
          ) : (
            <>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Analitik Performa</h2>
                  <p className="text-sm text-gray-400 mt-0.5">
                    Pemantauan performa real-time dan metrik efisiensi fasilitas.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative inline-block">
                    <select
                      value={period}
                      onChange={(e) => setPeriod(e.target.value as PerformancePeriod)}
                      className="appearance-none bg-blue-50 text-[#0F4C81] font-semibold text-sm rounded-xl pl-9 pr-9 py-2 outline-none cursor-pointer border border-blue-100"
                    >
                      {Object.entries(PERIOD_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0F4C81]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                  </div>
                  <button className="flex items-center gap-2 bg-[#0F4C81] hover:bg-[#0a355c] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    Ekspor Laporan
                  </button>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {/* Produktivitas — progress bar, no icon circle */}
                <div className="border border-gray-200 rounded-xl p-4">
                  <span className="text-xs font-semibold text-gray-500">Produktivitas</span>
                  <p className="text-2xl font-bold text-[#0F4C81] mt-1">
                    {dashboard ? `${dashboard.produktivitas}%` : "..."}
                  </p>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full mt-3 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(produktivitasPct, 100)}%` }}
                      transition={{ type: "spring", stiffness: 100, damping: 20 }}
                      className="h-full bg-[#2E9BF0] rounded-full"
                    />
                  </div>
                </div>

                {/* Tugas Diselesaikan — progress bar */}
                <div className="border border-gray-200 rounded-xl p-4">
                  <span className="text-xs font-semibold text-gray-500">Tugas Diselesaikan</span>
                  <p className="text-2xl font-bold text-[#0F4C81] mt-1">
                    {dashboard ? `${tugasSelesai}/${tugasTotal}` : "..."}
                  </p>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full mt-3 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(tugasPct, 100)}%` }}
                      transition={{ type: "spring", stiffness: 100, damping: 20 }}
                      className="h-full bg-[#2E9BF0] rounded-full"
                    />
                  </div>
                </div>

                {/* Laporan Menunggu — warning + link */}
                <div className="border border-gray-200 rounded-xl p-4">
                  <span className="text-xs font-semibold text-gray-500">Laporan Menunggu</span>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {dashboard ? dashboard.laporan_menunggu : "..."}
                  </p>
                  <p className="text-[11px] text-amber-600 font-medium mt-2">
                    Perlu tinjauan supervisor segera
                  </p>
                  <button onClick={() => navigate("/reports")} className="text-[11px] font-semibold text-[#0F4C81] mt-1 inline-block hover:underline cursor-pointer">
                    Lihat Laporan &gt;
                  </button>
                </div>
              </div>

              {/* Perbandingan Penyelesaian Tugas + Tren Laporan */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Perbandingan OB */}
                <div className="border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-700">Perbandingan Penyelesaian Tugas</h3>
                    <button className="text-gray-300 hover:text-gray-500 cursor-pointer">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="5" r="1.5" />
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="12" cy="19" r="1.5" />
                      </svg>
                    </button>
                  </div>
                  {!dashboard?.perbandingan_ob?.length ? (
                    <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center text-sm text-gray-400 dark:bg-surface">
                      Data belum tersedia
                    </div>
                  ) : (
                    <div className="h-48 flex items-end gap-4">
                      {dashboard.perbandingan_ob.map((ob) => {
                        const maxTotal = Math.max(...dashboard.perbandingan_ob.map((o) => o.total_tugas), 1);
                        return (
                          <div key={ob.ob_id} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                            <div className="w-full bg-gray-50 rounded-t-md flex items-end justify-center h-full relative overflow-hidden dark:bg-elevated">
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${(ob.tugas_selesai / maxTotal) * 100}%` }}
                                transition={{ type: "spring", stiffness: 120, damping: 18 }}
                                className="w-full bg-[#2E6DA4] rounded-t-md"
                              />
                            </div>
                            <span className="text-[11px] font-semibold text-gray-500 truncate w-full text-center">
                              {ob.nama_ob}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Tren Laporan — smooth line chart, data ternormalisasi */}
                <div className="border border-gray-200 rounded-xl p-6">
                  <h3 className="text-sm font-bold text-gray-700 mb-2">Tren Laporan</h3>
                  <SmoothLineChart legendLabel="Masalah Bulanan" data={trenLaporanData} />
                </div>
              </div>

              {/* Leaderboard */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                  <h3 className="text-base font-bold text-gray-900">Papan Peringkat &amp; Metrik Performa OB</h3>
                  <span className="text-xs font-semibold text-gray-400">{rankedRows.length} / {rankedRows.length}</span>
                </div>

                {rankedRows.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-sm text-gray-400">
                    Belum ada data OB
                  </div>
                ) : (
                  <>
                    <table className="w-full text-left text-sm text-gray-600">
                      <thead className="text-[11px] font-bold text-gray-400 uppercase border-b border-gray-100 bg-gray-50/50 dark:bg-surface">
                        <tr>
                          <th className="px-6 py-3">Peringkat / Staf</th>
                          <th className="px-6 py-3">Tugas Diklaim</th>
                          <th className="px-6 py-3">Kec. Rata-rata</th>
                          <th className="px-6 py-3">Badge Diperoleh</th>
                          <th className="px-6 py-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {rankedRows.map((row, idx) => (
                          <tr key={row.userId} className="hover:bg-gray-50/50 transition-colors dark:bg-surface">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-gray-400 w-4">{idx + 1}</span>
                                <Avatar name={row.nama} src={row.fotoProfil} size="sm" />
                                <span className="font-semibold text-gray-800">{row.nama}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-semibold text-gray-800">
                              {row.tugasDiklaim ?? "-"}
                            </td>
                            <td className="px-6 py-4 text-gray-500">
                              {row.kecepatanRataRata != null ? `${row.kecepatanRataRata} min` : "-"}
                            </td>
                            <td className="px-6 py-4">
                              {row.achievements.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {row.achievements.map((ach, i) => (
                                    <BadgePill key={i} name={ach.nama} />
                                  ))}
                                </div>
                              ) : (
                                <NoBadgePill />
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => navigate(`/users/${row.userId}`)}
                                className="text-gray-400 hover:text-[#0F4C81] transition-colors cursor-pointer"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="px-6 py-4 border-t border-gray-100 text-xs text-gray-400">
                      Menampilkan 1-{rankedRows.length} dari {rankedRows.length} staf
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Performa;