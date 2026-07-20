import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { Laporan } from "../types/laporan";
import type { Task } from "../types/task";
import ReportDetailModal from "../components/ReportDetailModal";
import DailyChecklistModal, { type OBChecklistDetail } from "../components/DailyChecklistModal";
import * as XLSX from "xlsx";
import { useLaporan } from "../hooks/useLaporan";
import { useTasks } from "../hooks/useTasks";
import { StatCardsSkeleton, TableSkeleton, Skeleton } from "../components/ui/Skeleton";
import ErrorState from "../components/ui/ErrorState";
import Avatar from "../components/ui/Avatar";

type Tab = "Hari ini" | "Mingguan" | "Bulanan" | "Tahunan";

// ---------- Helper: agregasi grafik ----------
function getMingguanData(list: Laporan[]) {
  const labels = ["Senin", "Selasa", "Rabu", "Kamis", "Jum'at", "Sabtu", "Minggu"];
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

function getHarianData(list: Laporan[]) {
  const labels = Array.from({ length: 11 }, (_, i) => `${String(i + 8).padStart(2, "0")}:00`);
  const counts = labels.map(() => 0);
  const now = new Date();
  list.forEach((l) => {
    const d = new Date(l.createdAt);
    const h = d.getHours();
    if (d.toDateString() === now.toDateString() && h >= 8 && h <= 18) counts[h - 8] += 1;
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

function getDurasiTugas(task: Task): string {
  const raw = (task as unknown as { durasi?: string; duration?: string }).durasi
    ?? (task as unknown as { durasi?: string; duration?: string }).duration;
  if (raw) return raw;
  return task.waktu && task.waktu !== "-" ? task.waktu : "-";
}

// ---------- Komponen Grafik SVG Garis Mulus ----------
const SmoothLineChart = ({ data }: { data: { label: string; count: number }[] }) => {
  const max = Math.max(...data.map(d => d.count), 1);
  const isAllZero = data.every(d => d.count === 0);
  const svgWidth = 800;
  const svgHeight = 220;
  const pt = 20;
  const pb = 10;
  const pl = 0;
  const pr = 0;
  const w = svgWidth - pl - pr;
  const h = svgHeight - pt - pb;

  const points = data.map((d, i) => {
    const x = pl + (i / Math.max(data.length - 1, 1)) * w;
    const y = isAllZero ? pt + h : pt + h - (d.count / max) * h;
    return { x, y, label: d.label };
  });

  let pathD = `M ${points[0]?.x || 0} ${points[0]?.y || 0}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpX = prev.x + (curr.x - prev.x) / 2;
    pathD += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  const areaD = points.length > 0 ? `${pathD} L ${points[points.length - 1].x} ${pt + h} L ${points[0].x} ${pt + h} Z` : "";

  return (
    <div className="w-full mt-4 flex flex-col relative h-[280px]">
      <div className="flex-1 relative w-full h-full">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <defs>
            <linearGradient id="gradientArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
            </linearGradient>
          </defs>
          {points.length > 0 && (
            <>
              <path d={areaD} fill="url(#gradientArea)" />
              <path
                d={pathD}
                fill="none"
                stroke="#0ea5e9"
                strokeWidth="4"
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}
        </svg>
      </div>
      <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase mt-4 px-1 z-10">
        {data.map((d, i) => (
          <span key={i} className="text-center truncate max-w-[60px]">{d.label}</span>
        ))}
      </div>
    </div>
  );
};

function RowActionMenu({
  onDetail,
  onEdit,
  onDelete,
}: {
  onDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer dark:bg-elevated"
        title="Aksi"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1 z-20 w-36 bg-white rounded-xl border border-gray-200 shadow-[0_12px_30px_-8px_rgba(15,76,129,0.22)] overflow-hidden dark:bg-surface"
          >
            <button
              onClick={() => { setOpen(false); onDetail(); }}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer dark:bg-surface"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Lihat Detail
            </button>
            <div className="h-px bg-gray-100 dark:bg-elevated" />
            <button
              onClick={() => { setOpen(false); onEdit(); }}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-yellow-600 hover:bg-yellow-50 transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
            <div className="h-px bg-gray-100 dark:bg-elevated" />
            <button
              onClick={() => { setOpen(false); onDelete(); }}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Hapus
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const Dashboard = () => {
  const navigate = useNavigate();
  const laporanFilters = useMemo(
    () => ({ page: 1, limit: 1000, sort_by: "created_at" as const, sort_order: "desc" as const }),
    [],
  );

  const { laporanList, isLoading: isLaporanLoading, error: laporanError, fetchLaporan, getLaporanDetail, deleteLaporan } = useLaporan(laporanFilters);
  const { tasks: taskList, isLoading: isTasksLoading, error: tasksError, fetchTasks } = useTasks();

  const [detailTarget, setDetailTarget] = useState<Laporan | null>(null);
  const openDetailModal = async (row: Laporan) => {
    setDetailTarget(row);
    try {
      const detail = await getLaporanDetail(row);
      setDetailTarget(detail);
    } catch {
      // Ignored
    }
  };
  const closeDetailModal = () => setDetailTarget(null);

  const [deleteTarget, setDeleteTarget] = useState<Laporan | null>(null);
  const openDeleteConfirm = (row: Laporan) => setDeleteTarget(row);
  const closeDeleteConfirm = () => setDeleteTarget(null);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLaporan(deleteTarget.backendId || String(deleteTarget.id));
      closeDeleteConfirm();
    } catch {
      // Ignored
    }
  };

  const [activeTab, setActiveTab] = useState<Tab>("Hari ini");
  const [checklistDetail, setChecklistDetail] = useState<OBChecklistDetail | null>(null);

  useEffect(() => {
    fetchLaporan();
    fetchTasks();
  }, [fetchLaporan, fetchTasks]);

  const totalLaporan = laporanList.length;
  const laporanSelesai = laporanList.filter((l) => l.status === "Selesai").length;
  const tugasUnassigned = taskList.filter((t) => t.status === "Belum").length;

  const kpiRates = useMemo(() => {
    const total = laporanList.length;
    const urgent = laporanList.filter((l) => l.level === "URGENT").length;
    return {
      urgentRate: total ? Math.round((urgent / total) * 100) : 0,
      selesaiRate: total ? Math.round((laporanSelesai / total) * 100) : 0,
      unassignedRate: taskList.length ? Math.round((tugasUnassigned / taskList.length) * 100) : 0,
    };
  }, [laporanList, taskList, laporanSelesai, tugasUnassigned]);

  const chartData = useMemo(() => {
    if (activeTab === "Hari ini") return getHarianData(laporanList);
    if (activeTab === "Mingguan") return getMingguanData(laporanList);
    if (activeTab === "Bulanan") return getBulananData(laporanList);
    return getTahunanData(laporanList);
  }, [laporanList, activeTab]);

  const donutData = useMemo(() => {
    const total = laporanList.length;
    const items = [
      { key: "Ditugaskan", label: "Masuk", color: "#1d4ed8", count: laporanList.filter((l) => l.status === "Ditugaskan").length },
      { key: "Selesai", label: "Selesai", color: "#22c55e", count: laporanList.filter((l) => l.status === "Selesai").length },
      { key: "Menunggu", label: "Menunggu", color: "#f59e0b", count: laporanList.filter((l) => l.status === "Menunggu").length },
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

  const laporanKaryawanTerbaru = useMemo(() => {
    return [...laporanList]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4);
  }, [laporanList]);

  const riwayatTugasOB = useMemo(() => {
    return [...taskList]
      .filter((t) => Boolean(t.petugas?.nama))
      .sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1))
      .slice(0, 4);
  }, [taskList]);

  const openTaskDetailFromRiwayat = (task: Task) => {
    setChecklistDetail({
      nama: task.petugas.nama,
      fotoProfil: (task.petugas as unknown as { fotoProfil?: string }).fotoProfil,
      gedung: task.gedung,
      lokasi: task.lantai,
      tanggal: task.tanggal,
      items: [task],
    });
  };

  const hasLoadingState = (isLaporanLoading || isTasksLoading) && laporanList.length === 0 && taskList.length === 0;
  const hasErrorState = laporanError || tasksError;

  return (
    <div className="flex h-screen font-sans dark:bg-base bg-white">
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        <main className="flex-1 overflow-auto bg-[#f8fafc] p-6 lg:p-8 dark:bg-base text-gray-800">
          {hasLoadingState ? (
            <div className="max-w-[1600px] mx-auto w-full">
              <Skeleton className="h-64 w-full rounded-2xl mb-8" />
              <div className="flex items-center justify-between mb-6">
                <Skeleton className="h-9 w-64 rounded-xl" />
                <Skeleton className="h-10 w-32 rounded-xl" />
              </div>
              <StatCardsSkeleton count={3} />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mt-8">
                <Skeleton className="lg:col-span-2 h-72 w-full rounded-2xl" />
                <Skeleton className="h-72 w-full rounded-2xl" />
              </div>
            </div>
          ) : hasErrorState ? (
            <ErrorState
              message={laporanError || tasksError || "Gagal memuat dashboard"}
              onRetry={() => {
                fetchLaporan();
                fetchTasks();
              }}
            />
          ) : (
            <div className="max-w-[1600px] mx-auto w-full">
              {/* --- BAGIAN TABEL TERBARU --- */}
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mb-8">
                
                {/* Laporan Terbaru Karyawan */}
                <div className="xl:col-span-3 border border-gray-200 rounded-2xl p-6 bg-white shadow-sm dark:bg-surface flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-gray-800">Laporan Terbaru Karyawan</h2>
                    <button onClick={() => navigate("/reports")} className="text-xs font-semibold text-[#0ea5e9] hover:underline cursor-pointer">
                      Lihat Semua
                    </button>
                  </div>

                  {laporanKaryawanTerbaru.length === 0 ? (
                    <div className="flex-1 min-h-[160px] bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-sm dark:bg-elevated">
                      Data belum tersedia
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col justify-between">
                      <table className="w-full text-sm bg-white dark:bg-surface text-left">
                        <thead>
                          <tr className="text-[11px] font-bold text-gray-500 uppercase border-b border-gray-100">
                            <th className="pb-3 pt-1">ID Laporan</th>
                            <th className="pb-3 pt-1">Nama Karyawan</th>
                            <th className="pb-3 pt-1">Lokasi</th>
                            <th className="pb-3 pt-1">Level</th>
                            <th className="pb-3 pt-1">Status</th>
                            <th className="pb-3 pt-1 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {laporanKaryawanTerbaru.map((l) => (
                            <tr key={l.id} className="border-b border-gray-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                              <td className="py-3.5">
                                <span className="font-semibold text-gray-700 text-xs">
                                  {l.id_laporan || `LPR-${String(l.id).padStart(3, "0")}`}
                                </span>
                              </td>
                              <td className="py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <Avatar name={l.name} src={l.fotoProfil} size="sm" />
                                  <span className="font-medium text-gray-700 text-xs">{l.name}</span>
                                </div>
                              </td>
                              <td className="py-3.5">
                                <span className="text-gray-500 text-xs">{l.loc}</span>
                              </td>
                              <td className="py-3.5">
                                {l.level === "URGENT" ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 rounded-full text-[10px] font-bold text-red-600 border border-red-100">
                                    <span className="w-3.5 h-3.5 rounded-full bg-red-600 text-white flex items-center justify-center text-[8px]">!</span>
                                    URGENT
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 rounded-full text-[10px] font-bold text-amber-600 border border-amber-100">
                                    <span className="w-3.5 h-3.5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[8px]">!</span>
                                    STANDARD
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5">
                                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold ${
                                  l.status === "Menunggu" ? "bg-orange-50 text-orange-500 border border-orange-100" :
                                  l.status === "Ditugaskan" ? "bg-blue-50 text-blue-500 border border-blue-100" :
                                  l.status === "Selesai" ? "bg-green-50 text-green-500 border border-green-100" :
                                  "bg-red-50 text-red-500 border border-red-100"
                                }`}>
                                  {l.status}
                                </span>
                              </td>
                              <td className="py-3.5 text-right">
                                <RowActionMenu
                                  onDetail={() => openDetailModal(l)}
                                  onEdit={() => navigate(`/reports?edit=${l.id}`)}
                                  onDelete={() => openDeleteConfirm(l)}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      
                      <div className="flex items-center justify-between mt-4 px-1 text-xs text-gray-500 font-medium border-t border-gray-100 pt-4">
                        <span>Menampilkan 1 sampai {laporanKaryawanTerbaru.length} dari {laporanList.length} laporan</span>
                        <div className="flex items-center gap-1.5">
                          <button className="p-1 hover:bg-gray-100 rounded text-gray-400 font-bold">&lt;</button>
                          <button className="w-6 h-6 rounded bg-[#1e3a8a] text-white font-semibold flex items-center justify-center shadow-sm">1</button>
                          {laporanList.length > 4 && (
                            <button className="w-6 h-6 rounded hover:bg-gray-100 text-gray-600 font-semibold flex items-center justify-center transition-colors">2</button>
                          )}
                          <button className="p-1 hover:bg-gray-100 rounded text-gray-600 font-bold">&gt;</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Riwayat Tugas OB */}
                <div className="xl:col-span-2 border border-gray-200 rounded-2xl p-6 bg-white shadow-sm dark:bg-surface flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-gray-800">Riwayat Tugas OB</h2>
                    <button onClick={() => navigate("/tasks")} className="text-xs font-semibold text-[#0ea5e9] hover:underline cursor-pointer">
                      Lihat semua
                    </button>
                  </div>

                  {riwayatTugasOB.length === 0 ? (
                    <div className="flex-1 min-h-[160px] bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-sm dark:bg-elevated">
                      Data belum tersedia
                    </div>
                  ) : (
                    <div className="flex-1">
                      <table className="w-full text-sm bg-white dark:bg-surface text-left">
                        <thead>
                          <tr className="text-[11px] font-bold text-gray-500 uppercase border-b border-gray-100">
                            <th className="pb-3 pt-1">Tugas &amp; Pengerja</th>
                            <th className="pb-3 pt-1">Durasi</th>
                            <th className="pb-3 pt-1">Status</th>
                            <th className="pb-3 pt-1 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {riwayatTugasOB.map((task) => (
                            <tr key={task.id} className="border-b border-gray-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                              <td className="py-4">
                                <p className="font-bold text-gray-800 text-[13px]">{task.namaTugas}</p>
                                <p className="text-[11px] font-medium text-gray-400 mt-0.5">{task.petugas.nama}</p>
                              </td>
                              <td className="py-4">
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {getDurasiTugas(task)}
                                </span>
                              </td>
                              <td className="py-4">
                                {task.status === "Selesai" ? (
                                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-green-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Completed
                                  </span>
                                ) : task.status === "Proses" ? (
                                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-amber-500">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> In Progress
                                  </span>
                                ) : task.status === "Delayed" ? (
                                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-red-500">
                                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Delayed
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-gray-400">
                                    <span className="h-1.5 w-1.5 rounded-full bg-gray-400" /> Unassigned
                                  </span>
                                )}
                              </td>
                              <td className="py-4 text-right">
                                <button
                                  onClick={() => openTaskDetailFromRiwayat(task)}
                                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer dark:bg-elevated"
                                  title="Lihat detail tugas"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* --- TABS & EXPORT SECTION --- */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="inline-flex bg-white border border-gray-100 rounded-xl p-1 shadow-sm">
                  {(["Hari ini", "Mingguan", "Bulanan", "Tahunan"] as Tab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                        activeTab === tab
                          ? "bg-[#173f5f] text-white shadow"
                          : "text-gray-500 hover:text-gray-700 hover:bg-slate-50"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => exportToExcel(laporanList)}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl px-4 py-2 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  Export Data
                </button>
              </div>

              {/* --- STAT CARDS SECTION --- */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                
                {/* Total Laporan Karyawan */}
                <div className="border border-gray-100 rounded-2xl p-5 bg-white shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-6">
                    <div className="h-11 w-11 bg-blue-50 rounded-[14px] flex items-center justify-center text-blue-600 shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M9 8h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
                      </svg>
                    </div>
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 text-[11px] font-bold">
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                      </svg>
                      {kpiRates.urgentRate}% URGENT
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[28px] font-extrabold text-gray-900 mb-1 leading-none">{totalLaporan}</h3>
                    <p className="text-xs text-gray-500 font-semibold">Total Laporan Karyawan</p>
                  </div>
                </div>

                {/* Laporan Selesai */}
                <div className="border border-gray-100 rounded-2xl p-5 bg-white shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-6">
                    <div className="h-11 w-11 bg-emerald-50 rounded-[14px] flex items-center justify-center text-emerald-500 shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-bold">
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                        </svg>
                        {kpiRates.selesaiRate}%
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[28px] font-extrabold text-gray-900 mb-1 leading-none">{laporanSelesai}</h3>
                    <p className="text-xs text-gray-500 font-semibold">Laporan Selesai</p>
                  </div>
                </div>

                {/* Tugas Unassigned */}
                <div className="border border-gray-100 rounded-2xl p-5 bg-white shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-6">
                    <div className="h-11 w-11 bg-amber-50 rounded-[14px] flex items-center justify-center text-amber-500 shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-500 text-[11px] font-bold">
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" />
                        </svg>
                        {kpiRates.unassignedRate}%
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[28px] font-extrabold text-gray-900 mb-1 leading-none">{tugasUnassigned}</h3>
                    <p className="text-xs text-gray-500 font-semibold">Tugas Unassigned</p>
                  </div>
                </div>

              </div>

              {/* --- CHARTS SECTION --- */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Tren Laporan (Smooth Line Chart) */}
                <div className="lg:col-span-2 border border-gray-100 rounded-2xl p-6 bg-white shadow-sm dark:bg-surface flex flex-col">
                  <h2 className="text-sm font-bold text-gray-800 mb-2">Tren Laporan</h2>
                  <div className="flex-1 min-h-[300px]">
                    <SmoothLineChart data={chartData} />
                  </div>
                </div>

                {/* Donut Chart Laporan */}
                <div className="border border-gray-100 rounded-2xl p-6 bg-white shadow-sm dark:bg-surface flex flex-col">
                  <h2 className="text-sm font-bold text-gray-800 mb-2">Laporan</h2>
                  <div className="flex-1 flex flex-col items-center justify-center pt-6">
                    <div
                      className="h-40 w-40 rounded-full flex items-center justify-center select-none mb-10 shadow-sm"
                      style={{ background: donutTotal === 0 ? "#e5e7eb" : conicGradient }}
                    >
                      <div className="h-32 w-32 bg-white rounded-full flex flex-col items-center justify-center dark:bg-surface">
                        <span className="text-[17px] font-extrabold text-[#1d4ed8]">{donutTotal}</span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">TOTAL</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6 w-full px-6">
                      {donutData.map((d) => (
                        <div key={d.key} className="flex items-start gap-2.5">
                          <span className="w-3.5 h-3.5 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: d.color }}></span>
                          <div className="flex flex-col">
                            <span className="text-[11px] text-gray-500 font-medium leading-none mb-1.5">{d.label}</span>
                            <span className="text-sm font-bold text-gray-900 leading-none">{d.pct}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}
        </main>
      </div>

      <ReportDetailModal laporan={detailTarget} onClose={closeDetailModal} />
      <DailyChecklistModal detail={checklistDetail} onClose={() => setChecklistDetail(null)} />

      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeDeleteConfirm}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-surface"
            >
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-center text-base font-bold text-gray-900 mb-2">Konfirmasi Hapus Laporan</h3>
              <p className="text-center text-sm text-slate-600 leading-relaxed mb-6">
                Apakah Anda yakin ingin menghapus laporan{" "}
                <span className="font-semibold text-gray-800">
                  {deleteTarget.id_laporan || `LPR-${String(deleteTarget.id).padStart(3, "0")}`}
                </span>
                ? Data yang sudah dihapus tidak dapat dikembalikan.
              </p>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleConfirmDelete}
                  className="w-full py-2.5 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Hapus
                </button>
                <button
                  onClick={closeDeleteConfirm}
                  className="w-full py-2.5 rounded-lg bg-white text-slate-700 font-medium text-sm border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer dark:bg-surface"
                >
                  Batal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;