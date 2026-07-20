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
import useUsers from "../hooks/useUsers";
import { StatCardsSkeleton, TableSkeleton, Skeleton } from "../components/ui/Skeleton";
import ErrorState from "../components/ui/ErrorState";
import Avatar from "../components/ui/Avatar";

type Tab = "Hari Ini" | "Mingguan" | "Bulanan" | "Tahunan";

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

function getHarianData(list: Laporan[]) {
  // Grafik jam per jam untuk "Hari Ini" (00-NOW), hanya jam yang sudah lewat
  const now = new Date();
  const currentHour = now.getHours();
  const labels = Array.from({ length: currentHour + 1 }, (_, i) => `${String(i).padStart(2, "0")}:00`);
  const counts = labels.map(() => 0);
  list.forEach((l) => {
    const d = new Date(l.createdAt);
    if (d.toDateString() === now.toDateString() && d.getHours() <= currentHour) counts[d.getHours()] += 1;
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

function isToday(dateStr: string) {
  return new Date(dateStr).toDateString() === new Date().toDateString();
}
function isYesterday(dateStr: string) {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return new Date(dateStr).toDateString() === d.toDateString();
}
function pctChange(today: number, yesterday: number): number | null {
  if (yesterday === 0) return today > 0 ? null : 0;
  return Math.round(((today - yesterday) / yesterday) * 100);
}

// ---------- Durasi tugas ----------
// NOTE: Tipe `Task` saat ini TIDAK punya field durasi/timestamp klaim-selesai
// eksplisit. Dibaca secara optional; kalau backend/mapper belum menyediakannya,
// fallback ke `waktu` (jam) sebagai penanda, bukan durasi asli.
function getDurasiTugas(task: Task): string {
  const raw = (task as unknown as { durasi?: string; duration?: string }).durasi
    ?? (task as unknown as { durasi?: string; duration?: string }).duration;
  if (raw) return raw;
  return task.waktu && task.waktu !== "-" ? task.waktu : "-";
}

// ---------- Action Menu (titik tiga) ----------
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
        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
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
            className="absolute right-0 top-full mt-1 z-20 w-36 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden"
          >
            <button
              onClick={() => { setOpen(false); onDetail(); }}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Lihat Detail
            </button>
            <div className="h-px bg-gray-100" />
            <button
              onClick={() => { setOpen(false); onEdit(); }}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-yellow-600 hover:bg-yellow-50 transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
            <div className="h-px bg-gray-100" />
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

function PctBadge({ value }: { value: number | null }) {
  if (value === null) return null;
  const isPositive = value >= 0;
  return (
    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${isPositive ? "text-green-600 bg-green-50" : "text-red-500 bg-red-50"}`}>
      {isPositive ? "↑" : "↓"} {Math.abs(value)}%
    </span>
  );
}

const Dashboard = () => {
  const navigate = useNavigate();
  const laporanFilters = useMemo(
    () => ({ page: 1, limit: 100, sort_by: "created_at" as const, sort_order: "desc" as const }),
    [],
  );

  const { laporanList, isLoading: isLaporanLoading, error: laporanError, fetchLaporan, getLaporanDetail, deleteLaporan } = useLaporan(laporanFilters);
  const { tasks: taskList, isLoading: isTasksLoading, error: tasksError, fetchTasks } = useTasks();
  const { fetchOB } = useUsers();

  const [obTotalCount, setObTotalCount] = useState<number | null>(null);

  // Modal state for detail
  const [detailTarget, setDetailTarget] = useState<Laporan | null>(null);

  const openDetailModal = async (row: Laporan) => {
    setDetailTarget(row);
    try {
      const detail = await getLaporanDetail(row);
      setDetailTarget(detail);
    } catch {
      // Tetap tampilkan data ringkas apabila detail tidak dapat dimuat
    }
  };
  const closeDetailModal = () => setDetailTarget(null);

  // Modal state for delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Laporan | null>(null);
  const openDeleteConfirm = (row: Laporan) => setDeleteTarget(row);
  const closeDeleteConfirm = () => setDeleteTarget(null);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLaporan(deleteTarget.backendId || String(deleteTarget.id));
      closeDeleteConfirm();
    } catch {
      // Error handled silently
    }
  };

  const [activeTab, setActiveTab] = useState<Tab>("Hari Ini");
  const [checklistDetail, setChecklistDetail] = useState<OBChecklistDetail | null>(null);

  useEffect(() => {
    fetchLaporan();
    fetchTasks();
    fetchOB()
      .then((list) => setObTotalCount(list.length))
      .catch(() => setObTotalCount(null));
  }, [fetchLaporan, fetchTasks, fetchOB]);

  // ---- Statistik kartu atas ----
  const totalLaporan = laporanList.length;
  const laporanSelesai = laporanList.filter((l) => l.status === "Selesai").length;
  const tugasUnassigned = taskList.filter((t) => t.status === "Belum").length;

  const totalLaporanHariIni = laporanList.filter((l) => isToday(l.createdAt)).length;
  const totalLaporanKemarin = laporanList.filter((l) => isYesterday(l.createdAt)).length;
  const totalLaporanPct = pctChange(totalLaporanHariIni, totalLaporanKemarin);

  const selesaiHariIni = laporanList.filter((l) => l.status === "Selesai" && isToday(l.createdAt)).length;
  const selesaiKemarin = laporanList.filter((l) => l.status === "Selesai" && isYesterday(l.createdAt)).length;
  const selesaiPct = pctChange(selesaiHariIni, selesaiKemarin);

  const unassignedHariIni = taskList.filter((t) => t.status === "Belum" && isToday(t.tanggal)).length;
  const unassignedKemarin = taskList.filter((t) => t.status === "Belum" && isYesterday(t.tanggal)).length;
  const unassignedPct = pctChange(unassignedHariIni, unassignedKemarin);

  // OB Active: OB unik yang punya minimal 1 tugas aktif (bukan "Belum") hari ini
  const obActiveCount = useMemo(() => {
    const activeNames = new Set(
      taskList
        .filter((t) => t.status !== "Belum" && isToday(t.tanggal))
        .map((t) => t.petugas?.nama)
        .filter(Boolean)
    );
    return activeNames.size;
  }, [taskList]);

  // ---- Grafik batang ----
  const chartData = useMemo(() => {
    if (activeTab === "Hari Ini") return getHarianData(laporanList);
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
      .slice(0, 4);
  }, [laporanList]);

  // ---- Riwayat Tugas OB (dulu "Daily Checklist OB") ----
  // Sekarang berbentuk daftar tugas individual terbaru (bukan lagi progress bar
  // per-OB) — mengikuti desain baru "Riwayat Tugas OB".
  const riwayatTugasOB = useMemo(() => {
    return [...taskList]
      .filter((t) => Boolean(t.petugas?.nama))
      .sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1))
      .slice(0, 5);
  }, [taskList]);

  const openTaskDetailFromRiwayat = (task: Task) => {
    // Reuse modal detail checklist yang sudah ada, dibungkus jadi shape OBChecklistDetail
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
    <div className="flex h-screen bg-white font-sans">
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto bg-white p-8">
          {hasLoadingState ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <Skeleton className="h-9 w-64 rounded-full" />
                <Skeleton className="h-10 w-32 rounded-lg" />
              </div>
              <StatCardsSkeleton count={4} />
              <Skeleton className="h-64 w-full rounded-xl my-5" />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2">
                  <TableSkeleton columns={6} rows={4} withAvatar />
                </div>
                <Skeleton className="h-64 w-full rounded-xl" />
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
            <>
              {/* Tabs + Export */}
              <div className="flex items-center justify-between mb-6">
                <div className="inline-flex bg-gray-100 rounded-full p-1">
                  {(["Hari Ini", "Mingguan", "Bulanan", "Tahunan"] as Tab[]).map((tab) => (
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

              {/* Stat Cards — lebih besar, dengan badge persentase */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4 auto-rows-fr">
                <motion.div
                  whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
                  className="h-full border border-gray-200 rounded-2xl p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-11 w-11 bg-blue-100 rounded-xl flex items-center justify-center text-[#0F4C81] shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M9 8h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
                      </svg>
                    </div>
                    <PctBadge value={totalLaporanPct} />
                  </div>
                  <span className="block text-2xl font-bold text-gray-900">{totalLaporan}</span>
                  <span className="block text-xs font-semibold text-gray-500 mt-1">Total Laporan Karyawan</span>
                </motion.div>

                <motion.div
                  whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
                  className="h-full border border-gray-200 rounded-2xl p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-11 w-11 bg-green-100 rounded-xl flex items-center justify-center text-green-600 shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <PctBadge value={selesaiPct} />
                  </div>
                  <span className="block text-2xl font-bold text-gray-900">{laporanSelesai}</span>
                  <span className="block text-xs font-semibold text-gray-500 mt-1">Laporan Selesai</span>
                </motion.div>

                <motion.div
                  whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
                  className="h-full border border-gray-200 rounded-2xl p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-11 w-11 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M9 8h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
                      </svg>
                    </div>
                    <PctBadge value={unassignedPct} />
                  </div>
                  <span className="block text-2xl font-bold text-gray-900">{tugasUnassigned}</span>
                  <span className="block text-xs font-semibold text-gray-500 mt-1">Tugas Unassigned</span>
                </motion.div>

                <motion.div
                  whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
                  className="h-full border border-gray-200 rounded-2xl p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-11 w-11 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4" />
                      </svg>
                    </div>
                    <span className="text-[11px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Aktif</span>
                  </div>
                  <span className="block text-2xl font-bold text-gray-900">
                    {obActiveCount}{obTotalCount !== null ? `/${obTotalCount}` : ""}
                  </span>
                  <span className="block text-xs font-semibold text-gray-500 mt-1">OB Active</span>
                </motion.div>
              </div>

              {/* Laporan Masuk + Donut */}
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

              {/* Laporan Terbaru Karyawan + Riwayat Tugas OB */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start my-5">
                {/* Laporan Terbaru Karyawan */}
                <div className="lg:col-span-2 border border-gray-200 rounded-xl p-5 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-gray-700">Laporan Terbaru Karyawan</h2>
                    <button onClick={() => navigate("/reports")} className="text-xs font-semibold text-[#0F4C81] hover:underline cursor-pointer">
                      Lihat Semua
                    </button>
                  </div>

                  {laporanKaryawanTerbaru.length === 0 ? (
                    <div className="h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                      Data belum tersedia
                    </div>
                  ) : (
                    <table className="w-full text-sm bg-white">
                      <thead>
                        <tr className="text-[10px] font-bold text-gray-500 uppercase border-b border-gray-200">
                          <th className="py-2 text-left">ID Laporan</th>
                          <th className="py-2 text-left">Nama Karyawan</th>
                          <th className="py-2 text-left">Lokasi</th>
                          <th className="py-2 text-left">Level</th>
                          <th className="py-2 text-left">Status</th>
                          <th className="py-2 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {laporanKaryawanTerbaru.map((l) => (
                          <tr key={l.id} className="border-b border-gray-100 last:border-0 bg-white hover:bg-blue-50/30 transition-colors">
                            <td className="py-3">
                              <span className="font-semibold text-gray-700 text-xs">
                                {l.id_laporan || `LPR-${String(l.id).padStart(3, "0")}`}
                              </span>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <Avatar name={l.name} src={l.fotoProfil} size="sm" />
                                <span className="font-medium text-gray-700 text-xs">{l.name}</span>
                              </div>
                            </td>
                            <td className="py-3">
                              <span className="font-medium text-gray-600 text-xs">{l.loc}</span>
                            </td>
                            <td className="py-3">
                              {l.level === "URGENT" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 rounded-full text-[10px] font-bold text-red-600">
                                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> URGENT
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 rounded-full text-[10px] font-bold text-orange-600">
                                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500" /> STANDARD
                                </span>
                              )}
                            </td>
                            <td className="py-3">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                l.status === "Menunggu" ? "bg-orange-100 text-orange-600" :
                                l.status === "Ditugaskan" ? "bg-blue-100 text-blue-600" :
                                l.status === "Selesai" ? "bg-green-100 text-green-600" :
                                "bg-red-100 text-red-600"
                              }`}>
                                {l.status}
                              </span>
                            </td>
                            <td className="py-3 text-right">
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
                  )}
                </div>

                {/* Riwayat Tugas OB (sebelumnya "Daily Checklist OB") */}
                <div className="border border-gray-200 rounded-xl p-5 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-gray-700">Riwayat Tugas OB</h2>
                    <button onClick={() => navigate("/tasks")} className="text-xs font-semibold text-[#0F4C81] hover:underline cursor-pointer">
                      Lihat Semua
                    </button>
                  </div>

                  {riwayatTugasOB.length === 0 ? (
                    <div className="h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                      Data belum tersedia
                    </div>
                  ) : (
                    <table className="w-full text-sm bg-white">
                      <thead>
                        <tr className="text-[10px] font-bold text-gray-500 uppercase border-b border-gray-200">
                          <th className="py-2 text-left">Tugas &amp; Pengerja</th>
                          <th className="py-2 text-left">Durasi</th>
                          <th className="py-2 text-left">Status</th>
                          <th className="py-2 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {riwayatTugasOB.map((task) => (
                          <tr key={task.id} className="border-b border-gray-100 last:border-0 hover:bg-blue-50/30 transition-colors">
                            <td className="py-3">
                              <p className="font-semibold text-gray-800 text-xs">{task.namaTugas}</p>
                              <p className="text-[11px] text-gray-400">{task.petugas.nama}</p>
                            </td>
                            <td className="py-3 text-xs text-gray-500 whitespace-nowrap">
                              {getDurasiTugas(task)}
                            </td>
                            <td className="py-3">
                              {task.status === "Selesai" ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-600">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Completed
                                </span>
                              ) : task.status === "Proses" ? (
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-600">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> In Progress
                                </span>
                              ) : task.status === "Delayed" ? (
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-500">
                                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Delayed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
                                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400" /> Unassigned
                                </span>
                              )}
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => openTaskDetailFromRiwayat(task)}
                                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
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
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      <ReportDetailModal laporan={detailTarget} onClose={closeDetailModal} />
      <DailyChecklistModal detail={checklistDetail} onClose={() => setChecklistDetail(null)} />

      {/* MODAL KONFIRMASI HAPUS LAPORAN */}
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
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
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
                  className="w-full py-2.5 rounded-lg bg-white text-slate-700 font-medium text-sm border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
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