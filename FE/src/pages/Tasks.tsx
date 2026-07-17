import { useState, useMemo, useEffect } from "react";
import { useToast } from "../components/Toast";
import type { Task, StatusTask } from "../types/task";
import useTasks, { type TaskFilters } from "../hooks/useTasks";
import useLokasi from "../hooks/useLokasi";
import useUsers from "../hooks/useUsers";
import useKategori from "../hooks/useKategori";
import useTugasOptions from "../hooks/useTugasOptions";
import Can from "../components/auth/Can";
import PageHeader from "../components/ui/PageHeader";
import { StatCardsSkeleton, CardListSkeleton, Skeleton } from "../components/ui/Skeleton";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import TaskFormModal from "../components/tasks/TaskFormModal";
import TaskDetailModal from "../components/tasks/TaskDetailModal";

type Periode = "Hari Ini" | "Mingguan" | "Bulanan" | "Tahunan";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-600",
  "bg-purple-100 text-purple-600",
  "bg-amber-100 text-amber-700",
  "bg-red-100 text-red-600",
  "bg-green-100 text-green-600",
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

// ---------- UI status (mengikuti StatusTask apa adanya, tanpa mengarang bucket baru) ----------
// Alur: Admin buat task → status "Menunggu OB" → OB ambil dari app → status "Dikerjakan"
const UI_STATUS_STYLE: Record<StatusTask, { dot: string; text: string; label: string }> = {
  Belum: { dot: "bg-gray-400", text: "text-gray-500", label: "Menunggu OB" },
  Proses: { dot: "bg-amber-500", text: "text-amber-600", label: "Dikerjakan" },
  Selesai: { dot: "bg-green-500", text: "text-green-600", label: "Selesai" },
  Delayed: { dot: "bg-red-500", text: "text-red-600", label: "Terlewat" },
};

// ---------- Urgency ----------
// NOTE: Task type saat ini TIDAK punya field urgency/prioritas dari mapApiChecklistToTask.
// Dibaca secara optional agar siap begitu backend/mapper menyediakannya; fallback "Standard".
type Urgency = "URGENT" | "Standard";
function getUrgency(task: Task): Urgency {
  const raw = (task as unknown as { urgency?: string; prioritas?: string }).urgency
    ?? (task as unknown as { urgency?: string; prioritas?: string }).prioritas;
  return raw === "URGENT" ? "URGENT" : "Standard";
}
const URGENCY_STYLE: Record<Urgency, string> = {
  URGENT: "bg-red-100 text-red-600",
  Standard: "bg-amber-100 text-amber-700",
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
  const { gedungList, fetchGedung } = useLokasi();
  const { fetchUsers } = useUsers();
  const { kategoriList, fetchKategori } = useKategori();
  const { fetchTugas } = useTugasOptions();

  useEffect(() => {
    fetchGedung();
    fetchUsers();
    fetchKategori();
    fetchTugas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const belumCount = periodTasks.filter((t) => t.status === "Belum").length;
  const prosesCount = periodTasks.filter((t) => t.status === "Proses").length;
  const selesaiCount = periodTasks.filter((t) => t.status === "Selesai").length;
  const prosesPct = periodTasks.length === 0 ? 0 : Math.round((prosesCount / periodTasks.length) * 100);

  // --- Badge Kondisional ---
  const pctChangeHariIni = getPctChange(totalHariIni, totalKemarin);
  const hasUrgentBelum = periodTasks.some((t) => t.status === "Belum" && getUrgency(t) === "URGENT");
  const needsReview = selesaiCount > 0;

  // --- Pagination ---
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [selectedGedung, periode]);
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
  const [taskToEditData, setTaskToEditData] = useState<any>(null);

  const openCreateModal = () => {
    setModalMode("create");
    setEditingTaskId(null);
    setTaskToEditData(null);
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    const selectedKategori = kategoriOptions.find((k) => k.nama === task.kategori);
    const selectedGedungOpt = gedungOptions.find((g) => g.nama === task.gedung);
    const selectedLantai = lantaiOptions.find((l) => l.nama === task.lantai);

    setModalMode("edit");
    setEditingTaskId(task.id);
    setTaskToEditData({
      kategori_id: selectedKategori?.id || "",
      namaTugas: task.namaTugas,
      lokasi_id: selectedGedungOpt?.id || "",
      lantai_id: selectedLantai?.id || "",
      catatan: task.catatan || "",
    });
    setIsModalOpen(true);
  };

  const handleSimpanTugas = async (form: any) => {
    if (!form.kategori_id || !form.tugas_id || !form.lokasi_id || !form.lantai_id) {
      push("error", "Tugas Gagal Disimpan: Mohon lengkapi Kategori, Nama Tugas, Lokasi Gedung, dan Lokasi Lantai.");
      return;
    }
    const payload = {
      kategori_id: form.kategori_id,
      tugas_id: form.tugas_id,
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
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Tugas Gagal Disimpan");
    }
  };

  const handleChangeStatus = async (id: string, status: StatusTask) => {
    try {
      await updateTaskStatus(id, status);
      push("success", "Status Tugas Diperbarui");
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Gagal memperbarui status tugas");
    }
  };

  void handleChangeStatus;

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

  const isEmpty = tasks.length === 0;

  return (
    <div className="flex h-screen bg-white font-sans">
      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader title="Manajemen Tugas" />

        <main className="flex-1 overflow-auto bg-white p-8 font-sans">
          {isTasksLoading && tasks.length === 0 ? (
            <div>
              <Skeleton className="h-9 w-72 rounded-full mb-6" />
              <StatCardsSkeleton count={4} />
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
                <div className="inline-flex bg-gray-100 rounded-full p-1">
                  {(["Hari Ini", "Mingguan", "Bulanan", "Tahunan"] as Periode[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriode(p)}
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
                      onChange={(e) => { setSelectedGedung(e.target.value); setSelectedLantai("Semua Lantai"); }}
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
                      className="appearance-none bg-blue-50 text-[#0F4C81] font-semibold text-sm rounded-full pl-4 pr-9 py-2 outline-none cursor-pointer border border-blue-100"
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

              {/* Stat Cards */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-9 w-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M9 8h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
                      </svg>
                    </div>
                    {pctChangeHariIni !== null && pctChangeHariIni > 0 && (
                      <span className="text-[11px] font-bold text-green-600">↗ +{pctChangeHariIni}%</span>
                    )}
                  </div>
                  <span className="block text-xs font-semibold text-gray-500 mb-1">Total Tugas Hari Ini</span>
                  <span className="text-2xl font-bold text-gray-900">{totalHariIni} Tugas</span>
                  <p className="text-[11px] text-gray-400 mt-1">vs {totalKemarin} kemarin</p>
                </div>

                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-9 w-9 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                    </div>
                    {hasUrgentBelum && (
                      <span className="text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">HIGH PRIORITY</span>
                    )}
                  </div>
                  <span className="block text-xs font-semibold text-gray-500 mb-1">Belum Diklaim / In Pool</span>
                  <span className="text-2xl font-bold text-gray-900">{String(belumCount).padStart(2, "0")} Tugas</span>
                  <p className="text-[11px] text-gray-400 mt-1">Menunggu dialokasikan</p>
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
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-[#0F4C81] rounded-full" style={{ width: `${prosesPct}%` }} />
                  </div>
                </div>

                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M12 22a10 10 0 100-20 10 10 0 000 20z" />
                      </svg>
                    </div>
                    {needsReview && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Review Required</span>
                    )}
                  </div>
                  <span className="block text-xs font-semibold text-gray-500 mb-1">Selesai (Menunggu Approval)</span>
                  <span className="text-2xl font-bold text-gray-900">{String(selesaiCount).padStart(2, "0")} Tugas</span>
                </div>
              </div>

              {/* Tombol Tambah Tugas — di atas tabel */}
              <div className="flex justify-end mb-4">
                <Can permission="tasks:create">
                  <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 bg-[#0F4C81] hover:bg-[#0a355c] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Tambah Tugas Baru
                  </button>
                </Can>
              </div>

              {/* Daftar Tugas */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-900">Daftar Tugas</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Monitoring antrian tugas real-time.</p>
                </div>

                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="text-[11px] font-bold text-gray-400 uppercase border-b border-gray-100 bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-3">ID Laporan</th>
                      <th className="px-6 py-3">Detail Pekerjaan &amp; Lokasi</th>
                      <th className="px-6 py-3">Urgency</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Pengerja</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paged.map((task) => {
                      const style = UI_STATUS_STYLE[task.status];
                      const urgency = getUrgency(task);
                      const hasOb = Boolean(task.petugas?.nama) && task.petugas.nama !== "Belum ditugaskan";
                      const avatarColor = hasOb ? getAvatarColor(task.petugas.nama) : "bg-gray-100 text-gray-400";

                      return (
                        <tr key={task.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-gray-800 whitespace-nowrap">#{task.id}</td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-gray-800">{task.namaTugas}</p>
                            <p className="text-xs text-gray-400">{task.gedung}, {task.lantai}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${URGENCY_STYLE[urgency]}`}>
                              {urgency}
                            </span>
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
                                <span className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${avatarColor}`}>
                                  {getInitials(task.petugas.nama)}
                                </span>
                                <span className="font-medium text-gray-700 whitespace-nowrap">{task.petugas.nama}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic">Waiting for OB...</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openDetailModal(task)}
                                className="text-gray-400 hover:text-[#0F4C81] p-1.5 rounded transition-colors cursor-pointer"
                                title="Lihat Detail"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </button>
                              <Can roles={["Admin", "HR"]}>
                                <button
                                  onClick={() => openEditModal(task)}
                                  className="text-gray-400 hover:text-[#0F4C81] p-1.5 rounded transition-colors cursor-pointer"
                                  title="Edit"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              </Can>
                              <Can permission="tasks:delete">
                                <button
                                  onClick={() => setTaskToDelete(task)}
                                  className="text-gray-400 hover:text-red-500 p-1.5 rounded transition-colors cursor-pointer"
                                  title="Hapus"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </Can>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 text-xs text-gray-400">
                  <span>Showing {rangeStart} to {rangeEnd} of {sorted.length} tasks</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageClamped === 1} className="h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 disabled:opacity-40 hover:bg-gray-50 cursor-pointer">‹</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`h-7 w-7 flex items-center justify-center rounded-md text-xs font-semibold cursor-pointer ${p === pageClamped ? "bg-[#0F4C81] text-white" : "text-gray-500 hover:bg-gray-50"}`}
                      >
                        {p}
                      </button>
                    ))}
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={pageClamped === totalPages} className="h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 disabled:opacity-40 hover:bg-gray-50 cursor-pointer">›</button>
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