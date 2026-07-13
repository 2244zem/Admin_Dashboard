import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { Laporan } from "../types/laporan";
import ReportDetailModal from "../components/ReportDetailModal";
import DailyChecklistModal, { type OBChecklistDetail } from "../components/DailyChecklistModal";
import * as XLSX from "xlsx";
import useLaporan from "../hooks/useLaporan";
import useTasks from "../hooks/useTasks";
import PageHeader from "../components/ui/PageHeader";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";

type Tab = "Mingguan" | "Bulanan" | "Tahunan";

// ---------- Helper: agregasi grafik "Laporan Masuk" ----------
function getMingguanData(list: Laporan[]) {
  const labels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  const now = new Date();
  const dow = now.getDay();
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  return labels.map((label, i) => {
    const dayStart = new Date(monday);
    dayStart.setDate(monday.getDate() + i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);
    const count = list.filter((l) => {
      const d = new Date(l.createdAt);
      return d >= dayStart && d < dayEnd;
    }).length;
    return { label, count };
  });
}

function getBulananData(list: Laporan[]) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const weeksCount = Math.ceil((lastDay.getDate() + firstDay.getDay()) / 7);
  const buckets = Array.from({ length: weeksCount }, (_, i) => ({ label: `Minggu ${i + 1}`, count: 0 }));

  list.forEach((l) => {
    const d = new Date(l.createdAt);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const weekIndex = Math.floor((d.getDate() + firstDay.getDay() - 1) / 7);
      if (buckets[weekIndex]) buckets[weekIndex].count += 1;
    }
  });

  return buckets;
}

function getTahunanData(list: Laporan[]) {
  const labels = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const year = new Date().getFullYear();
  const counts = labels.map(() => 0);

  list.forEach((l) => {
    const d = new Date(l.createdAt);
    if (d.getFullYear() === year) counts[d.getMonth()] += 1;
  });

  return labels.map((label, i) => ({ label, count: counts[i] }));
}

// ---------- Helper: export Excel ----------
function exportToExcel(list: Laporan[]) {
  const header = ["Nama", "Lokasi", "Area", "Deskripsi", "Status", "Waktu"];
  const rows = list.map((l) => [
    l.name,
    l.loc,
    l.area,
    l.desc,
    l.status,
    new Date(l.createdAt).toLocaleString("id-ID"),
  ]);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws["!cols"] = header.map((_, i) => ({
    wch: Math.max(header[i].length, ...rows.map((r) => String(r[i]).length)) + 2,
  }));
  XLSX.utils.book_append_sheet(wb, ws, "Laporan");
  XLSX.writeFile(wb, `laporan_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ---------- Helper: avatar inisial ----------
const AVATAR_COLORS = [
  { bg: "bg-blue-100", text: "text-blue-600" },
  { bg: "bg-purple-100", text: "text-purple-600" },
  { bg: "bg-orange-100", text: "text-orange-600" },
  { bg: "bg-teal-100", text: "text-teal-600" },
  { bg: "bg-pink-100", text: "text-pink-600" },
];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function LevelBadge({ level }: { level: Laporan["level"] }) {
  if (level === "URGENT") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> URGENT
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-600">
      <span className="h-1.5 w-1.5 rounded-full bg-orange-500" /> STANDARD
    </span>
  );
}

function StatusBadge({ status }: { status: Laporan["status"] }) {
  const map: Record<string, { bg: string; text: string }> = {
    Menunggu: { bg: "bg-orange-100", text: "text-orange-600" },
    Ditugaskan: { bg: "bg-blue-100", text: "text-blue-600" },
    Selesai: { bg: "bg-green-100", text: "text-green-600" },
    Ditolak: { bg: "bg-red-100", text: "text-red-500" },
  };
  const style = map[status] ?? { bg: "bg-gray-100", text: "text-gray-500" };
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${style.bg} ${style.text}`}>
      {status}
    </span>
  );
}

const Dashboard = () => {
  const navigate = useNavigate();
  const laporanFilters = useMemo(
    () => ({ page: 1, limit: 100, sort_by: "created_at" as const, sort_order: "desc" as const }),
    [],
  );

  const { laporanList, isLoading: isLaporanLoading, error: laporanError, fetchLaporan } = useLaporan(laporanFilters);
  const { tasks: taskList, isLoading: isTasksLoading, error: tasksError, fetchTasks } = useTasks();

  const [activeTab, setActiveTab] = useState<Tab>("Mingguan");
  const [detailTarget, setDetailTarget] = useState<Laporan | null>(null);
  const [checklistDetail, setChecklistDetail] = useState<OBChecklistDetail | null>(null);

  useEffect(() => {
    fetchLaporan();
    fetchTasks();
  }, [fetchLaporan, fetchTasks]);

  // ---- Statistik kartu atas ----
  const totalLaporan = laporanList.length;
  const laporanSelesai = laporanList.filter((l) => l.status === "Selesai").length;
  const laporanBerjalan = laporanList.filter((l) => l.status === "Ditugaskan").length;
  const laporanDitolak = laporanList.filter((l) => l.status === "Ditolak").length;

  // ---- Grafik batang ----
  const chartData = useMemo(() => {
    if (activeTab === "Mingguan") return getMingguanData(laporanList);
    if (activeTab === "Bulanan") return getBulananData(laporanList);
    return getTahunanData(laporanList);
  }, [laporanList, activeTab]);

  const totalDalamPeriode = chartData.reduce((sum, d) => sum + d.count, 0);
  const maxCount = Math.max(...chartData.map((d) => d.count), 1);

  // ---- Donut ----
  const donutData = useMemo(() => {
    const total = laporanList.length;
    const items = [
      { key: "Ditugaskan", label: "Masuk", color: "#2563eb", count: laporanList.filter((l) => l.status === "Ditugaskan").length },
      { key: "Selesai", label: "Selesai", color: "#22c55e", count: laporanList.filter((l) => l.status === "Selesai").length },
      { key: "Menunggu", label: "Menunggu", color: "#f97316", count: laporanList.filter((l) => l.status === "Menunggu").length },
      { key: "Ditolak", label: "Ditolak", color: "#ef4444", count: laporanList.filter((l) => l.status === "Ditolak").length },
    ];
    return items.map((item) => ({ ...item, pct: total === 0 ? 0 : Math.round((item.count / total) * 100) }));
  }, [laporanList]);

  const donutTotal = laporanList.length;
  const conicGradient = useMemo(() => {
    let acc = 0;
    const stops = donutData.map((d) => {
      const start = acc;
      acc += d.pct;
      return `${d.color} ${start}% ${acc}%`;
    });
    return `conic-gradient(${stops.join(", ")})`;
  }, [donutData]);

  // ---- Lima laporan karyawan paling baru ----
  const laporanKaryawanTerbaru = useMemo(() => {
    return [...laporanList]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [laporanList]);
  const laporanKaryawanSorted = laporanKaryawanTerbaru;
  const [, setKaryawanPage] = useState(1);
  const karyawanTotalPages = 1;
  const karyawanPageClamped = 1;
  const karyawanRangeStart = laporanKaryawanTerbaru.length === 0 ? 0 : 1;
  const karyawanRangeEnd = laporanKaryawanTerbaru.length;

  // ---- Daily Checklist OB (dihitung dari taskList grouped by OB) ----
  const checklistOB = useMemo(() => {
    const map = new Map<string, typeof taskList>();
    taskList.forEach((t) => {
      const key = t.petugas.nama;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return Array.from(map.entries()).map(([nama, items]) => {
      const selesai = items.filter((t) => t.status === "Selesai").length;
      const gedungLantai = Array.from(new Set(items.map((t) => `${t.gedung}: Lantai ${t.lantai.replace("Lantai", "").trim()}`)));
      return {
        nama,
        area: gedungLantai.join(" & "),
        gedung: items[0]?.gedung || "-",
        lokasi: items[0]?.lantai || "-",
        selesai,
        total: items.length,
        items,
      };
    });
  }, [taskList, checklistDetail]);

  const openChecklistDetail = (ob: (typeof checklistOB)[number]) => {
    setChecklistDetail({
      nama: ob.nama,
      gedung: ob.gedung,
      lokasi: ob.lokasi,
      tanggal: new Date().toISOString().slice(0, 10),
      items: ob.items,
    });
  };

  const hasLoadingState = isLaporanLoading || isTasksLoading;
  const hasErrorState = laporanError || tasksError;

  return (
    <div className="flex h-screen bg-white font-sans">
      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader title="Dashboard" />

        <main className="flex-1 overflow-auto bg-white p-8">
          {hasLoadingState ? (
            <LoadingSpinner text="Memuat data statistik dashboard..." />
          ) : hasErrorState ? (
            <ErrorState
              message={laporanError || tasksError || "Gagal memuat dashboard"}
              onRetry={() => {
                fetchLaporan();
                fetchTasks();
              }}
            />
          ) : (
            <>
              {/* Tabs + Export */}
              <div className="flex items-center justify-between mb-6">
                <div className="inline-flex bg-gray-100 rounded-full p-1">
                  {(["Mingguan", "Bulanan", "Tahunan"] as Tab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors cursor-pointer ${
                        activeTab === tab ? "bg-[#0F4C81] text-white" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => exportToExcel(laporanList)}
                  className="flex items-center gap-2 text-sm font-semibold text-[#0F4C81] border border-gray-200 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  Export Data
                </motion.button>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <motion.div whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Laporan User</span>
                    <span className="text-xl font-bold text-[#0F4C81]">{totalLaporan}</span>
                  </div>
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-[#0F4C81]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M9 8h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
                    </svg>
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Laporan Selesai</span>
                    <span className="text-xl font-bold text-green-600">{laporanSelesai}</span>
                  </div>
                  <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Laporan Berjalan</span>
                    <span className="text-xl font-bold text-blue-600">{laporanBerjalan}</span>
                  </div>
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </motion.div>

                <motion.div whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Laporan Ditolak</span>
                    <span className="text-xl font-bold text-red-500">{laporanDitolak}</span>
                  </div>
                  <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center text-red-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </motion.div>
              </div>

              {/* Baris 1: Laporan Masuk + Donut */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start my-6">
                <div className="lg:col-span-2 border border-gray-200 rounded-xl p-6 bg-white">
                  <h2 className="text-sm font-bold text-gray-700 mb-4">Laporan Masuk</h2>
                  {totalDalamPeriode === 0 ? (
                    <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm select-none">
                      Data belum tersedia
                    </div>
                  ) : (
                    <div className="h-48 flex items-end gap-4">
                      {chartData.map((d) => (
                        <div key={d.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end select-none">
                          <div className="w-full bg-gray-100 rounded-t-md flex items-end justify-center h-full relative overflow-hidden">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${(d.count / maxCount) * 100}%` }}
                              transition={{ type: "spring", stiffness: 120, damping: 18 }}
                              className="w-full bg-[#2E6DA4] rounded-t-md"
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-gray-500">{d.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border border-gray-200 rounded-xl p-6 bg-white">
                  <h2 className="text-sm font-bold text-gray-700 mb-4">Laporan</h2>
                  <div className="flex flex-col items-center">
                    <div
                      className="h-32 w-32 rounded-full flex items-center justify-center select-none"
                      style={{ background: donutTotal === 0 ? "#e5e7eb" : conicGradient }}
                    >
                     <div className="h-20 w-20 bg-white rounded-full flex flex-col items-center justify-center">
                      <span className="text-lg font-bold text-gray-800">{donutTotal}</span>
                        <span className="text-[10px] text-gray-400">Total Laporan</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-5 w-full">
                      {donutData.map((d) => (
                        <div key={d.key} className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }}></span>
                          <span>{d.label}</span>
                          <span className="ml-auto font-semibold">{d.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Baris 2: Laporan Terbaru Karyawan + Daily Checklist OB (sejajar 2 kolom) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-6 items-start">
                {/* Laporan Terbaru Karyawan */}
                <div className="border border-gray-200 rounded-xl p-6 bg-white">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-gray-700">Laporan Terbaru Karyawan</h2>
                    <button onClick={() => navigate("/reports")} className="text-xs font-semibold text-[#0F4C81] hover:underline cursor-pointer">
                      Lihat Semua
                    </button>
                  </div>

                  {laporanKaryawanTerbaru.length === 0 ? (
                    <div className="h-40 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                      Data belum tersedia
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm bg-white">
                          <thead>
                            <tr className="text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
                              <th className="py-2.5 px-3">ID Laporan</th>
                              <th className="py-2.5 px-3">Nama Karyawan</th>
                              <th className="py-2.5 px-3">Lokasi</th>
                              <th className="py-2.5 px-3">Level</th>
                              <th className="py-2.5 px-3">Status</th>
                              <th className="py-2.5 px-3 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {laporanKaryawanTerbaru.map((l) => {
                              const avatar = getAvatarColor(l.name);
                              return (
                                <tr key={l.id} className="border-b border-gray-50 last:border-0 bg-white hover:bg-gray-50/30 transition-colors">
                                  <td className="py-3 px-3 text-gray-500 whitespace-nowrap">LPR-{String(l.id).slice(-3).padStart(3, "0")}</td>
                                  <td className="py-3 px-3">
                                    <div className="flex items-center gap-2">
                                      <span className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${avatar.bg} ${avatar.text}`}>
                                        {getInitials(l.name)}
                                      </span>
                                      <span className="font-semibold text-gray-800 whitespace-nowrap">{l.name}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 text-gray-600 whitespace-nowrap">{l.loc}</td>
                                  <td className="py-3 px-3"><LevelBadge level={l.level} /></td>
                                  <td className="py-3 px-3"><StatusBadge status={l.status} /></td>
                                  <td className="py-3 px-3 text-right">
                                    <button onClick={() => setDetailTarget(l)} className="text-gray-400 hover:text-[#0F4C81] transition-colors cursor-pointer">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      </svg>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <span className="text-xs text-gray-400">
                          Menampilkan {karyawanRangeStart} sampai {karyawanRangeEnd} dari {laporanKaryawanSorted.length} laporan
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setKaryawanPage((p) => Math.max(1, p - 1))}
                            disabled={karyawanPageClamped === 1}
                            className="h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 disabled:opacity-40 hover:bg-gray-50 cursor-pointer"
                          >
                            ‹
                          </button>
                          {Array.from({ length: karyawanTotalPages }, (_, i) => i + 1).map((p) => (
                            <button
                              key={p}
                              onClick={() => setKaryawanPage(p)}
                              className={`h-7 w-7 flex items-center justify-center rounded-md text-xs font-semibold cursor-pointer ${
                                p === karyawanPageClamped ? "bg-[#0F4C81] text-white" : "text-gray-500 hover:bg-gray-50"
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                          <button
                            onClick={() => setKaryawanPage((p) => Math.min(karyawanTotalPages, p + 1))}
                            disabled={karyawanPageClamped === karyawanTotalPages}
                            className="h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 disabled:opacity-40 hover:bg-gray-50 cursor-pointer"
                          >
                            ›
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Daily Checklist OB */}
                <div className="border border-gray-200 rounded-xl p-6 bg-white">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-gray-700">Daily Checklist OB</h2>
                    <button onClick={() => navigate("/tasks")} className="text-xs font-semibold text-[#0F4C81] hover:underline cursor-pointer">
                      Lihat Semua
                    </button>
                  </div>

                  {checklistOB.length === 0 ? (
                    <div className="h-40 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                      Data belum tersedia
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-y-4">
                        {checklistOB.map((ob) => {
                          const pctProgress = ob.total === 0 ? 0 : Math.round((ob.selesai / ob.total) * 100);
                          const barColor = pctProgress >= 70 ? "bg-green-500" : "bg-red-500";
                          const textColor = pctProgress >= 70 ? "text-green-600" : "text-red-500";
                          return (
                            <div key={ob.nama} className="flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{ob.nama}</p>
                                <p className="text-xs text-gray-400 truncate">{ob.area}</p>
                                <div className="h-1.5 w-full bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pctProgress}%` }}
                                    transition={{ type: "spring", stiffness: 120, damping: 18 }}
                                    className={`h-full rounded-full ${barColor}`}
                                  />
                                </div>
                              </div>
                              <div className="text-right shrink-0 select-none">
                                <p className="text-xs font-semibold text-gray-600">{ob.selesai}/{ob.total}</p>
                                <p className={`text-[11px] font-bold ${textColor}`}>{pctProgress}%</p>
                              </div>
                              <button
                                onClick={() => openChecklistDetail(ob)}
                                className="text-gray-400 hover:text-[#0F4C81] transition-colors shrink-0 cursor-pointer"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-4 pt-3 border-t border-gray-100 select-none">
                        Terakhir diperbarui: {new Date().toLocaleString("id-ID")}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      <ReportDetailModal laporan={detailTarget} onClose={() => setDetailTarget(null)} />
      <DailyChecklistModal detail={checklistDetail} onClose={() => setChecklistDetail(null)} />
    </div>
  );
};

export default Dashboard;
