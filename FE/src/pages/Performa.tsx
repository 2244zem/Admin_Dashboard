import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import PageHeader from "../components/ui/PageHeader";
import ErrorState from "../components/ui/ErrorState";
import { Skeleton } from "../components/ui/Skeleton";
import useUsers from "../hooks/useUsers";
import { usePerformanceOb, type ObPerformanceRow } from "../hooks/usePerformance";
import type { PerformancePeriod } from "../api/performance";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-600",
  "bg-purple-100 text-purple-600",
  "bg-amber-100 text-amber-700",
  "bg-red-100 text-red-600",
];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const Performa = () => {
  const { fetchOB } = useUsers();
  const { rows, isLoading, error, fetchAll } = usePerformanceOb();
  const [period, setPeriod] = useState<PerformancePeriod>("mingguan");
  const [obList, setObList] = useState<Array<{ id: string; nama: string }>>([]);

  useEffect(() => {
    fetchOB().then(setObList).catch(console.error);
  }, [fetchOB]);

  useEffect(() => {
    if (obList.length > 0) fetchAll(obList, period);
  }, [obList, period, fetchAll]);

  const rankedRows = useMemo(
    () => [...rows].sort((a, b) => (b.tugasDiklaim ?? 0) - (a.tugasDiklaim ?? 0)),
    [rows]
  );

  const maxDiklaim = Math.max(...rows.map((r) => r.tugasDiklaim ?? 0), 1);

  return (
    <div className="flex h-screen bg-white font-sans dark:bg-base">
      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader title="Performa OB" />

        <main className="flex-1 overflow-auto bg-white p-8 font-sans dark:bg-base">
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
            <ErrorState message={error} onRetry={() => fetchAll(obList, period)} />
          ) : (
            <>
              <div className="flex items-start justify-between mb-6">
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
                      <option value="mingguan">7 Hari Terakhir</option>
                      <option value="bulanan">30 Hari Terakhir</option>
                      <option value="tahunan">1 Tahun Terakhir</option>
                    </select>
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
              {/*
                NOTE: "Rata-rata Tingkat Keberhasilan", "Waktu Aktif Sistem", dan
                perubahan persentase (+2.4%) TIDAK ADA di endpoint manapun yang
                terdokumentasi. Ini butuh backend menyediakan metrik agregat
                terpisah. Ditampilkan "Belum tersedia" sampai ada sumber data.
                "Laporan Menunggu" BISA diambil dari GET /api/admin/laporan
                dengan filter status=BELUM_DIKERJAKAN — belum disambungkan di
                sini, tinggal tambahkan hook useLaporan kalau mau data real.
              */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500">Rata-rata Tingkat Keberhasilan</span>
                    <span className="h-7 w-7 rounded-full bg-green-50 text-green-500 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">Belum tersedia</p>
                  <p className="text-[11px] text-gray-400 mt-1">Butuh endpoint metrik agregat dari backend</p>
                </div>

                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500">Waktu Aktif Sistem</span>
                    <span className="h-7 w-7 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                      </svg>
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">Belum tersedia</p>
                  <p className="text-[11px] text-gray-400 mt-1">Butuh monitoring uptime dari backend/infra</p>
                </div>

                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500">Laporan Menunggu</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">-</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Sambungkan ke <code className="text-[10px]">useLaporan</code> filter status BELUM_DIKERJAKAN
                  </p>
                </div>
              </div>

              {/* Perbandingan Penyelesaian Tugas — bar chart sederhana dari tugasDiklaim */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="border border-gray-200 rounded-xl p-6">
                  <h3 className="text-sm font-bold text-gray-700 mb-4">Perbandingan Penyelesaian Tugas</h3>
                  {rows.every((r) => r.tugasDiklaim === undefined) ? (
                    <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center text-sm text-gray-400 dark:bg-surface">
                      Data belum tersedia
                    </div>
                  ) : (
                    <div className="h-48 flex items-end gap-4">
                      {rows.map((r) => (
                        <div key={r.userId} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                          <div className="w-full bg-gray-100 rounded-t-md flex items-end justify-center h-full relative overflow-hidden dark:bg-elevated">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${((r.tugasDiklaim ?? 0) / maxDiklaim) * 100}%` }}
                              transition={{ type: "spring", stiffness: 120, damping: 18 }}
                              className="w-full bg-[#2E6DA4] rounded-t-md"
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-gray-500 truncate w-full text-center">{r.nama}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/*
                  NOTE: "Tren Keluhan" (grafik garis bulanan Jan-Jun) TIDAK ADA
                  sumber datanya di endpoint manapun yang terdokumentasi —
                  tidak ada endpoint historis bulanan untuk jumlah
                  keluhan/laporan. Placeholder "Belum tersedia" dulu.
                */}
                <div className="border border-gray-200 rounded-xl p-6">
                  <h3 className="text-sm font-bold text-gray-700 mb-4">Tren Keluhan</h3>
                  <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center text-sm text-gray-400 dark:bg-surface">
                    Data belum tersedia — butuh endpoint tren bulanan dari backend
                  </div>
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
                        {rankedRows.map((row: ObPerformanceRow, idx: number) => (
                          <tr key={row.userId} className="hover:bg-gray-50/50 transition-colors dark:bg-surface">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-gray-400 w-4">{idx + 1}</span>
                                <span className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(row.nama)}`}>
                                  {getInitials(row.nama)}
                                </span>
                                <span className="font-semibold text-gray-800">{row.nama}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-semibold text-gray-800">
                              {row.tugasDiklaim ?? "-"}
                            </td>
                            <td className="px-6 py-4 text-gray-500">
                              {row.kecepatanRataRata ?? "-"}
                            </td>
                            <td className="px-6 py-4">
                              {row.badge ? (
                                <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600">
                                  {row.badge}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-300">Belum ada badge</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button className="text-gray-400 hover:text-[#0F4C81] transition-colors cursor-pointer">
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