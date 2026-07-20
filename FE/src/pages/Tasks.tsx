import { useState, useMemo, useRef, useEffect } from "react";
import { useToast } from "../hooks/useToast";
import { useNavigate } from "react-router-dom";
import type { Task, StatusTask } from "../types/task";
import useTasks, { type TaskFilters } from "../hooks/useTasks";
import useLokasi from "../hooks/useLokasi";
import useKategori from "../hooks/useKategori";
import Can from "../components/auth/Can";
import { StatCardsSkeleton, CardListSkeleton, Skeleton } from "../components/ui/Skeleton";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import TaskFormModal from "../components/tasks/TaskFormModal";
import TaskDetailModal from "../components/tasks/TaskDetailModal";
import Avatar from "../components/ui/Avatar";

type Periode = "Hari Ini" | "Mingguan" | "Bulanan" | "Tahunan";

interface TaskFormValues {
  kategori_id: string;
  nama_tugas: string;
  lokasi_id: string;
  lantai_id: string;
  catatan: string;
}

interface TaskEditInitialData {
  kategori_id: string;
  namaTugas: string;
  lokasi_id: string;
  lantai_id: string;
  catatan: string;
  [key: string]: unknown;
}

// ---------- UI status (mengikuti StatusTask apa adanya, tanpa mengarang bucket baru) ----------
// Alur: Admin buat task → status "Menunggu OB" → OB ambil dari app → status "Dikerjakan"
const UI_STATUS_STYLE: Record<StatusTask, { dot: string; text: string; label: string }> = {
  Belum: { dot: "bg-gray-400", text: "text-gray-500", label: "Menunggu OB" },
  Proses: { dot: "bg-amber-500", text: "text-amber-600", label: "Dikerjakan" },
  Selesai: { dot: "bg-green-500", text: "text-green-600", label: "Selesai" },
  Delayed: { dot: "bg-red-500", text: "text-red-600", label: "Terlewat" },
};

function isToday(tanggal: string) {
  return tanggal === new Date().toISOString().slice(0, 10);
}
function isYesterday(tanggal: string) {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return tanggal === d.toISOString().slice(0, 10);
}
function getPctChange(today: number, yesterday: number): number | null {
  if (yesterday === 0) return null;
  return Math.round(((today - yesterday) / yesterday) * 100);
}
function isInPeriod(tanggal: string, periode: Periode): boolean {
  if (!tanggal) return false;
  const d = new Date(tanggal);
  const now = new Date();
  if (periode === "Hari Ini") return isToday(tanggal);
  if (periode === "Mingguan") {
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    const nextMonday = new Date(monday);
    nextMonday.setDate(monday.getDate() + 7);
    return d >= monday && d < nextMonday;
  }
  if (periode === "Bulanan") return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  return d.getFullYear() === now.getFullYear();
}

const ITEMS_PER_PAGE = 10;

const Tasks = () => {
  const { push } = useToast();
  const navigate = useNavigate();
  const { gedungList } = useLokasi();
  const { kategoriList } = useKategori();

  const gedungOptions = useMemo(() => gedungList.map((g) => ({ id: g.id, nama: g.nama })), [gedungList]);
  const kategoriOptions = useMemo(() => kategoriList, [kategoriList]);

  // --- Filter Gedung ---
  const [selectedGedung, setSelectedGedung] = useState<string>("Semua Gedung");
  const [selectedLantai, setSelectedLantai] = useState<string>("Semua Lantai");

  // Resolve lokasi_id dari gedung yang dipilih
  const selectedGedungObj = useMemo(
    () => gedungList.find((g) => g.nama === selectedGedung),
    [gedungList, selectedGedung]
  );

  // Build API filter params
  const taskFilters = useMemo((): TaskFilters => {
    const filters: TaskFilters = {};
    if (selectedGedung !== "Semua Gedung" && selectedGedungObj) {
      filters.lokasi_id = selectedGedungObj.id;
    }
    if (selectedLantai !== "Semua Lantai") {
      filters.lantai_id = selectedLantai;
    }
    return filters;
  }, [selectedGedung, selectedGedungObj, selectedLantai]);

  const { tasks, isLoading: isTasksLoading, error: tasksError, fetchTasks, fetchTaskDetail, createTask, updateTask, deleteTask, updateTaskStatus } = useTasks(taskFilters);

  // Lantai options berdasarkan gedung yang dipilih
  const lantaiOptions = useMemo(() => {
    if (selectedGedung === "Semua Gedung") {
      // Semua lantai
      const map = new Map<string, { id: string; nama: string }>();
      gedungList.forEach((g) => {
        g.lantai?.forEach((l) => {
          if (!map.has(l.id)) map.set(l.id, { id: l.id, nama: l.nama });
        });
      });
      return Array.from(map.values());
    }
    // Lantai sesuai gedung
    return (selectedGedungObj?.lantai || []).map((l) => ({ id: l.id, nama: l.nama }));
  }, [gedungList, selectedGedung, selectedGedungObj]);

  // Map lokasi_id -> nama gedung dan lantai_id -> nama lantai (dari endpoint
  // /api/lokasi & /api/lantai) supaya kolom Gedung/Lantai tidak menampilkan
  // raw UUID yang dikembalikan checklist-harian.
  const lokasiNameById = useMemo(() => {
    const map = new Map<string, string>();
    gedungList.forEach((g) => map.set(g.id, g.nama));
    return map;
  }, [gedungList]);

  const lantaiNameById = useMemo(() => {
    const map = new Map<string, string>();
    lantaiOptions.forEach((l) => map.set(l.id, l.nama));
    return map;
  }, [lantaiOptions]);

  // Resolve nama gedung & lantai dari ID mentah checklist via endpoint lokasi/lantai.
  const resolvedTasks = useMemo(
    () =>
      tasks.map((t) => ({
        ...t,
        gedung: (t.lokasiId && lokasiNameById.get(t.lokasiId)) || t.gedung,
        lantai: (t.lantaiId && lantaiNameById.get(t.lantaiId)) || t.lantai,
      })),
    [tasks, lokasiNameById, lantaiNameById]
  );

  // --- Tab periode ---
  const [periode, setPeriode] = useState<Periode>("Hari Ini");
  const periodTasks = useMemo(
    () => resolvedTasks.filter((t) => isInPeriod(t.tanggal, periode)),
    [resolvedTasks, periode]
  );

  // --- Statistik ---
  const totalHariIni = useMemo(() => resolvedTasks.filter((t) => isToday(t.tanggal)).length, [resolvedTasks]);
  const totalKemarin = useMemo(() => resolvedTasks.filter((t) => isYesterday(t.tanggal)).length, [resolvedTasks]);
  const prosesCount = periodTasks.filter((t) => t.status === "Proses").length;
  const selesaiCount = periodTasks.filter((t) => t.status === "Selesai").length;
  const prosesPct = Math.min(100, periodTasks.length === 0 ? 0 : Math.round((prosesCount / periodTasks.length) * 100));

  // --- Badge Kondisional ---
  const pctChangeHariIni = getPctChange(totalHariIni, totalKemarin);
  const needsReview = selesaiCount > 0;

  // --- Pagination ---
  const [page, setPage] = useState(1);
  const sorted = useMemo(() => [...periodTasks].sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1)), [periodTasks]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const pageClamped = Math.min(page, totalPages);
  const paged = sorted.slice((pageClamped - 1) * ITEMS_PER_PAGE, pageClamped * ITEMS_PER_PAGE);
  const rangeStart = sorted.length === 0 ? 0 : (pageClamped - 1) * ITEMS_PER_PAGE + 1;
  const rangeEnd = Math.min(pageClamped * ITEMS_PER_PAGE, sorted.length);

  // --- Modal Buat/Edit ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskToEditData, setTaskToEditData] = useState<TaskEditInitialData | null>(null);

  const openCreateModal = () => {
    setModalMode("create");
    setEditingTaskId(null);
    setTaskToEditData(null);
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    const selectedKategori = kategoriOptions.find((k) => k.nama === task.kategori);
    const selectedGedungOpt = gedungOptions.find((g) => g.nama === task.gedung);
    const selectedLantaiOpt = lantaiOptions.find((l) => l.nama === task.lantai);

    setModalMode("edit");
    setEditingTaskId(task.id);
    setTaskToEditData({
      kategori_id: selectedKategori?.id || "",
      namaTugas: task.namaTugas,
      lokasi_id: selectedGedungOpt?.id || "",
      lantai_id: selectedLantaiOpt?.id || "",
      catatan: task.catatan || "",
    });
    setIsModalOpen(true);
  };

  const handleSimpanTugas = async (form: TaskFormValues) => {
    if (!form.kategori_id || !form.nama_tugas || !form.lokasi_id || !form.lantai_id) {
      push("error", "Tugas Gagal Disimpan: Mohon lengkapi Kategori, Nama Tugas, Lokasi Gedung, dan Lokasi Lantai.");
      return;
    }
    const payload = {
      kategori_id: form.kategori_id,
      nama_tugas: form.nama_tugas,
      lokasi_id: form.lokasi_id,
      lantai_id: form.lantai_id,
      catatan: form.catatan || "",
    };
    try {
      if (modalMode === "edit" && editingTaskId) {
        await updateTask(editingTaskId, payload);
      } else {
        await createTask(payload);
      }
      push("success", "Tugas Berhasil Disimpan");
      setIsModalOpen(false);
      fetchTasks();
    } catch (err: unknown) {
      push("error", err instanceof Error ? err.message : "Tugas Gagal Disimpan");
    }
  };

  // --- Delete ---
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await deleteTask(taskToDelete.id);
      push("success", "Tugas Berhasil Dihapus");
      setTaskToDelete(null);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Tugas Gagal Dihapus");
    }
  };

  // --- Detail ---
  const [taskToView, setTaskToView] = useState<Task | null>(null);
  const [detailData, setDetailData] = useState<Task | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const openDetailModal = async (task: Task) => {
    setTaskToView(task);
    setDetailData(null);
    setIsDetailLoading(true);
    try {
      const fresh = await fetchTaskDetail(task.id);
      setDetailData(fresh ?? task);
    } catch {
      setDetailData(task);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleApprove = async (task: Task) => {
    try {
      await updateTaskStatus(task.id, "Selesai");
      push("success", "Tugas Disetujui");
      setTaskToView(null);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Gagal menyetujui tugas");
    }
  };

  // --- Jadikan Insidental ---
  // Buka halaman Tugas Insidental dengan prefill dari task checklist ini, lalu
  // disimpan lewat endpoint ad-hoc /api/tugas (bukan localStorage).
  const handleJadikanInsidental = (task: Task) => {
    const kategori = kategoriOptions.find((k) => k.nama === task.kategori);
    setOpenMenuId(null);
    navigate("/tugas-insidental", {
      state: {
        prefill: {
          nama_tugas: task.namaTugas,
          kategori_id: kategori?.id ?? "",
          lantai_id: task.lantaiId ?? "",
        },
      },
    });
  };

  // --- Dropdown menu Aksi (⋮) ---
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    if (openMenuId) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuId]);

  const isEmpty = tasks.length === 0;

  return (
    <div className="flex h-screen bg-white font-sans dark:bg-base">
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto bg-white p-8 font-sans dark:bg-base">
          {isTasksLoading && tasks.length === 0 ? (
            <div>
              <Skeleton className="h-9 w-72 rounded-full mb-6" />
              <StatCardsSkeleton count={3} />
              <div className="mt-6">
                <CardListSkeleton count={3} />
              </div>
            </div>
          ) : tasksError ? (
            <ErrorState message={tasksError} onRetry={fetchTasks} />
          ) : isEmpty ? (
            <EmptyState
              title="Belum Ada Tugas Terdaftar"
              description="Mulailah dengan menambahkan personel atau membuat tugas harian baru untuk memantau operasional gedung Anda."
              actionText="Tambah Tugas Baru"
              onAction={openCreateModal}
            />
          ) : (
            <>
              {/* Tabs periode + filter gedung & lantai */}
              <div className="flex items-center justify-between mb-6">
                <div className="inline-flex bg-gray-100 rounded-full p-1 dark:bg-elevated">
                  {(["Hari Ini", "Mingguan", "Bulanan", "Tahunan"] as Periode[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => { setPeriode(p); setPage(1); }}
                      className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors cursor-pointer ${
                        periode === p ? "bg-[#0F4C81] text-white" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {/* Filter Gedung */}
                  <div className="relative inline-block">
                    <select
                      value={selectedGedung}
                      onChange={(e) => { setSelectedGedung(e.target.value); setSelectedLantai("Semua Lantai"); setPage(1); }}
                      className="appearance-none bg-blue-50 text-[#0F4C81] font-semibold text-sm rounded-full pl-4 pr-9 py-2 outline-none cursor-pointer border border-blue-100"
                    >
                      <option value="Semua Gedung">Semua Gedung</option>
                      {gedungOptions.map((g) => (
                        <option key={g.id} value={g.nama}>{g.nama}</option>
                      ))}
                    </select>
                    <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0F4C81]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Filter Lantai */}
                  <div className="relative inline-block">
                    <select
                      value={selectedLantai}
                      onChange={(e) => setSelectedLantai(e.target.value)}
                      className="appearance-none bg-blue-50 text-[#0F4C81] font-semibold text-sm rounded-full pl-4 pr-9 py-2 outline-none cursor-pointer border border-blue-100 disabled:opacity-50"
                      disabled={selectedGedung === "Semua Gedung"}
                    >
                      <option value="Semua Lantai">Semua Lantai</option>
                      {lantaiOptions.map((l) => (
                        <option key={l.id} value={l.id}>{l.nama}</option>
                      ))}
                    </select>
                    <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0F4C81]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Stat Cards (3 kartu, disederhanakan mengikuti desain baru) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-9 w-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    {pctChangeHariIni !== null && pctChangeHariIni > 0 && (
                      <span className="text-[11px] font-bold text-green-600">↗ +{pctChangeHariIni}%</span>
                    )}
                  </div>
                  <span className="block text-xs font-semibold text-gray-500 mb-1">Total Tugas Hari Ini</span>
                  <span className="text-2xl font-bold text-gray-900">{totalHariIni} Tugas</span>
                  <p className="text-[11px] text-gray-400 mt-1">vs {totalKemarin} Kemarin</p>
                </div>

                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-blue-500">{prosesPct}%</span>
                  </div>
                  <span className="block text-xs font-semibold text-gray-500 mb-1">Diproses OB</span>
                  <span className="text-2xl font-bold text-gray-900">{String(prosesCount).padStart(2, "0")} Tugas</span>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2 dark:bg-elevated">
                    <div className="h-full bg-[#0F4C81] rounded-full" style={{ width: `${prosesPct}%` }} />
                  </div>
                </div>

                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                    </div>
                    {needsReview && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Perlu ditinjau</span>
                    )}
                  </div>
                  <span className="block text-xs font-semibold text-gray-500 mb-1">Menunggu Approval Admin</span>
                  <span className="text-2xl font-bold text-gray-900">{String(selesaiCount).padStart(2, "0")} Tugas</span>
                  {needsReview && (
                    <p className="text-[11px] text-amber-600 mt-1 font-medium">Segera butuh verifikasi</p>
                  )}
                </div>
              </div>

              {/* Daftar Tugas */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Daftar Tugas</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Monitoring antrian tugas real-time.</p>
                  </div>
                  <Can permission="tasks:create">
                    <button
                      onClick={openCreateModal}
                      className="flex items-center gap-2 bg-[#0F4C81] hover:bg-[#0a355c] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Tambah Tugas Baru
                    </button>
                  </Can>
                </div>

                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="text-[11px] font-bold text-gray-400 uppercase border-b border-gray-100 bg-gray-50/50 dark:bg-surface">
                    <tr>
                      <th className="px-6 py-3">ID Laporan</th>
                      <th className="px-6 py-3">Detail Pekerjaan &amp; Lokasi</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Pekerja</th>
                      <th className="px-6 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paged.map((task) => {
                      const style = UI_STATUS_STYLE[task.status];
                      const hasOb = Boolean(task.petugas?.nama) && task.petugas.nama !== "Belum ditugaskan";
                      const isMenuOpen = openMenuId === task.id;

                      return (
                        <tr key={task.id} className="hover:bg-gray-50/50 transition-colors dark:bg-surface">
                          <td className="px-6 py-4 font-semibold text-[#0F4C81] whitespace-nowrap">#{task.id}</td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-gray-800">{task.namaTugas}</p>
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                              </svg>
                              {task.gedung}, {task.lantai}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${style.text}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                              {style.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {hasOb ? (
                              <div className="flex items-center gap-2">
                                <Avatar name={task.petugas.nama} src={task.petugas.fotoProfil} size="sm" />
                                <span className="font-medium text-gray-700 whitespace-nowrap">{task.petugas.nama}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic">Waiting for OB...</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right relative">
                            <button
                              onClick={() => setOpenMenuId(isMenuOpen ? null : task.id)}
                              className="text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer dark:bg-elevated"
                              title="Aksi"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 6a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>

                            {isMenuOpen && (
                              <div
                                ref={menuRef}
                                className="absolute right-6 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-20 text-left dark:bg-surface"
                              >
                                <Can roles={["Admin", "HR"]}>
                                  <button
                                    onClick={() => { setOpenMenuId(null); openEditModal(task); }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer dark:bg-surface"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit
                                  </button>
                                </Can>
                                <button
                                  onClick={() => { setOpenMenuId(null); openDetailModal(task); }}
                                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer dark:bg-surface"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  Lihat Detail
                                </button>
                                <Can roles={["Admin", "HR"]}>
                                  <button
                                    onClick={() => handleJadikanInsidental(task)}
                                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer dark:bg-surface"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Jadikan Insidental
                                  </button>
                                </Can>
                                <Can permission="tasks:delete">
                                  <div className="my-1 border-t border-gray-100" />
                                  <button
                                    onClick={() => { setOpenMenuId(null); setTaskToDelete(task); }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Hapus
                                  </button>
                                </Can>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 text-xs text-gray-400">
                  <span>Showing {rangeStart} to {rangeEnd} of {sorted.length} tasks</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageClamped === 1} className="h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 disabled:opacity-40 hover:bg-gray-50 cursor-pointer dark:bg-surface">‹</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`h-7 w-7 flex items-center justify-center rounded-md text-xs font-semibold cursor-pointer ${p === pageClamped ? "bg-[#0F4C81] text-white" : "text-gray-500 hover:bg-gray-50"}`}
                      >
                        {p}
                      </button>
                    ))}
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={pageClamped === totalPages} className="h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 disabled:opacity-40 hover:bg-gray-50 cursor-pointer dark:bg-surface">›</button>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      <TaskFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSimpanTugas}
        mode={modalMode}
        initialData={taskToEditData}
        gedungOptions={gedungOptions}
        lantaiOptions={lantaiOptions}
        kategoriOptions={kategoriOptions}
      />

      <TaskDetailModal
        task={taskToView}
        detailData={detailData}
        isLoading={isDetailLoading}
        onClose={() => setTaskToView(null)}
        onApprove={handleApprove}
      />

      <ConfirmDialog
        open={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Tugas Ini?"
        message={`Tugas ${taskToDelete?.id} (${taskToDelete?.namaTugas}) akan dihapus permanen dan tidak dapat dikembalikan.`}
      />
    </div>
  );
};

export default Tasks;