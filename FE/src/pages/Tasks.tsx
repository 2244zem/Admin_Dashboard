import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useToast } from "../hooks/useToast";
import type { Task, StatusTask } from "../types/task";
import useTasks, { type TaskFilters } from "../hooks/useTasks";
import useLokasi from "../hooks/useLokasi";
import useUsers from "../hooks/useUsers";
import useKategori from "../hooks/useKategori";
import { useTugasStats } from "../hooks/useTugasStats";
import Can from "../components/auth/Can";
import { StatCardsSkeleton, CardListSkeleton, Skeleton } from "../components/ui/Skeleton";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import TaskFormModal from "../components/tasks/TaskFormModal";
import TaskDetailModal from "../components/tasks/TaskDetailModal";
import Avatar from "../components/ui/Avatar";

type Periode = "Hari Ini" | "Mingguan" | "Bulanan" | "Tahunan";

// ---------- Kategori Tugas (Rutin / Tidak Rutin) ----------
// ⚠️ ASUMSI ARSITEKTUR (lihat changelog): halaman ini digabung dari 2 resource
// terpisah — Checklist Harian ("Rutin") dan Tugas ad-hoc katalog ("Tidak Rutin").
// Untuk saat ini, HANYA Checklist Harian (via useTasks) yang benar-benar
// disambungkan — semua baris otomatis ditandai "Rutin". Baris "Tidak Rutin"
// BELUM digabung karena saya tidak punya kode/hook `useTugasKatalog` yang
// sebenarnya (CLAUDE.md hanya menyebutnya ada, tanpa shape detail). Lihat
// TODO di bagian bawah file ini untuk cara menyambungkannya.
type KategoriTugas = "Rutin" | "Tidak Rutin";

interface UnifiedTask extends Task {
  jenis: KategoriTugas;
}

const KATEGORI_TUGAS_STYLE: Record<KategoriTugas, string> = {
  Rutin: "bg-blue-50 text-blue-600",
  "Tidak Rutin": "bg-purple-50 text-purple-600",
};

// ---------- UI status ----------
// NOTE: `approved` dibaca optional — kalau tidak ada di data, "Selesai" dari OB
// dianggap "Menunggu Persetujuan Admin" (butuh review), bukan otomatis final.
function getUiStatusLabel(task: Task): { dot: string; text: string; label: string } {
  const approved = (task as unknown as { approved?: boolean }).approved;
  if (task.status === "Belum") return { dot: "bg-gray-400", text: "text-gray-500", label: "Menunggu" };
  if (task.status === "Proses") return { dot: "bg-amber-500", text: "text-amber-600", label: "Dalam Proses" };
  if (task.status === "Delayed") return { dot: "bg-red-500", text: "text-red-600", label: "Terlewat" };
  if (task.status === "Selesai") {
    return approved === true
      ? { dot: "bg-green-500", text: "text-green-600", label: "Selesai" }
      : { dot: "bg-indigo-500", text: "text-indigo-600", label: "Menunggu Persetujuan Admin" };
  }
  return { dot: "bg-gray-400", text: "text-gray-500", label: "Menunggu" };
}

function isInPeriod(tanggal: string, periode: Periode): boolean {
  if (!tanggal) return false;
  const d = new Date(tanggal);
  const now = new Date();
  if (periode === "Hari Ini") return d.toDateString() === now.toDateString();
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

function formatTanggalWaktu(tanggal: string, waktu: string): string {
  if (!tanggal) return "-";
  const d = new Date(tanggal);
  const tgl = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
  return waktu && waktu !== "-" ? `${tgl}, ${waktu}` : tgl;
}

const ITEMS_PER_PAGE = 10;

function RowActionMenu({
  onEdit,
  onDetail,
  onDelete,
  canEdit,
  canDelete,
}: {
  onEdit: () => void;
  onDetail: () => void;
  onDelete: () => void;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (!triggerRef.current?.closest("[data-dropdown]")?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, left: rect.right - 144 });
    }
    setOpen(true);
  };

  return (
    <>
      <button
        ref={triggerRef}
        onClick={handleOpen}
        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
        title="Aksi"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>
      {createPortal(
        open && (
          <div data-dropdown className="fixed inset-0 z-[9999]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.12 }}
              style={{ top: position.top, left: position.left }}
              className="absolute w-36 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden"
            >
              {canEdit && (
                <>
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
                </>
              )}
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
              {canDelete && (
                <>
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
                </>
              )}
            </motion.div>
          </div>
        ),
        document.body
      )}
    </>
  );
}

const Tasks = () => {
  const { push } = useToast();
  const { gedungList, fetchGedung } = useLokasi();
  const { fetchUsers } = useUsers();
  const { kategoriList, fetchKategori } = useKategori();

  useEffect(() => {
    fetchGedung();
    fetchUsers();
    fetchKategori();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gedungOptions = useMemo(() => gedungList.map((g) => ({ id: g.id, nama: g.nama })), [gedungList]);
  const kategoriOptions = useMemo(() => kategoriList, [kategoriList]);

  // --- Filter Gedung (Lantai dihapus dari UI sesuai desain baru — gambar 1 hanya punya 1 dropdown filter) ---
  const [selectedGedung, setSelectedGedung] = useState<string>("Semua Gedung");
  const selectedGedungObj = useMemo(
    () => gedungList.find((g) => g.nama === selectedGedung),
    [gedungList, selectedGedung]
  );

  // --- Tab periode (single declaration — versi sebelumnya double-declare & gagal compile) ---
  const [periode, setPeriode] = useState<Periode>("Hari Ini");
  const periodMap: Record<Periode, string> = { "Hari Ini": "harian", Mingguan: "mingguan", Bulanan: "bulanan", Tahunan: "tahunan" };

  const { stats, isLoading: isStatsLoading } = useTugasStats(periodMap[periode], selectedGedungObj?.id);

  const taskFilters = useMemo((): TaskFilters => {
    const filters: TaskFilters = {};
    if (selectedGedung !== "Semua Gedung" && selectedGedungObj) filters.lokasi_id = selectedGedungObj.id;
    return filters;
  }, [selectedGedung, selectedGedungObj]);

  const { tasks, isLoading: isTasksLoading, error: tasksError, fetchTasks, fetchTaskDetail, createTask, updateTask, deleteTask, updateTaskStatus } = useTasks(taskFilters);

  const lantaiNameById = useMemo(() => {
    const map = new Map<string, string>();
    gedungList.forEach((g) => g.lantai?.forEach((l) => map.set(l.id, l.nama)));
    return map;
  }, [gedungList]);
  const lokasiNameById = useMemo(() => {
    const map = new Map<string, string>();
    gedungList.forEach((g) => map.set(g.id, g.nama));
    return map;
  }, [gedungList]);

  // --- Resolve nama gedung/lantai + tag "Rutin" (semua data useTasks = Checklist Harian) ---
  // TODO (lihat changelog): gabungkan data ad-hoc Tugas ("Tidak Rutin") di sini
  // begitu hook `useTugasKatalog` tersedia — map hasilnya ke `UnifiedTask` dengan
  // `jenis: "Tidak Rutin"`, lalu gabung array-nya sebelum sorting/pagination.
  const unifiedTasks: UnifiedTask[] = useMemo(
    () =>
      tasks.map((t) => ({
        ...t,
        gedung: (t.lokasiId && lokasiNameById.get(t.lokasiId)) || t.gedung,
        lantai: (t.lantaiId && lantaiNameById.get(t.lantaiId)) || t.lantai,
        jenis: "Rutin" as KategoriTugas,
      })),
    [tasks, lokasiNameById, lantaiNameById]
  );

  const periodTasks = useMemo(
    () => unifiedTasks.filter((t) => isInPeriod(t.tanggal, periode)),
    [unifiedTasks, periode]
  );

  // --- Lantai options (dipakai di form modal, walau filter tabel disederhanakan) ---
  const lantaiOptions = useMemo(() => {
    if (selectedGedung === "Semua Gedung") {
      const map = new Map<string, { id: string; nama: string }>();
      gedungList.forEach((g) => g.lantai?.forEach((l) => { if (!map.has(l.id)) map.set(l.id, { id: l.id, nama: l.nama }); }));
      return Array.from(map.values());
    }
    return (selectedGedungObj?.lantai || []).map((l) => ({ id: l.id, nama: l.nama }));
  }, [gedungList, selectedGedung, selectedGedungObj]);

  // --- Statistik dari API (3 kartu, sesuai TaskStats: total, diproses_ob, menunggu_persetujuan) ---
  const totalHariIni = stats?.total ?? 0;
  const prosesCount = stats?.diproses_ob ?? 0;
  const menungguPersetujuan = stats?.menunggu_persetujuan ?? 0;
  const prosesPct = totalHariIni === 0 ? 0 : Math.round((prosesCount / totalHariIni) * 100);

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

  const openEditModal = (task: UnifiedTask) => {
    const selectedKategori = kategoriOptions.find((k) => k.nama === task.kategori);
    const selectedLantai = lantaiOptions.find((l) => l.nama === task.lantai);
    setModalMode("edit");
    setEditingTaskId(task.id);
    setTaskToEditData({
      kategori_id: selectedKategori?.id || "",
      namaTugas: task.namaTugas,
      lantai_id: selectedLantai?.id || "",
      catatan: task.catatan || "",
    });
    setIsModalOpen(true);
  };

  const handleSimpanTugas = async (form: any) => {
    if (!form.kategori_id || !form.nama_tugas || !form.lantai_id) {
      push("error", "Tugas Gagal Disimpan: Mohon lengkapi Kategori, Nama Tugas, dan Lokasi Lantai.");
      return;
    }
    const payload = {
      kategori_id: form.kategori_id,
      nama_tugas: form.nama_tugas,
      lantai_id: form.lantai_id,
      catatan: form.catatan || "",
    };
    try {
      if (modalMode === "edit" && editingTaskId) await updateTask(editingTaskId, payload);
      else await createTask(payload);
      push("success", "Tugas Berhasil Disimpan");
      setIsModalOpen(false);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Tugas Gagal Disimpan");
    }
  };

  const [taskToDelete, setTaskToDelete] = useState<UnifiedTask | null>(null);
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

  const [taskToView, setTaskToView] = useState<Task | null>(null);
  const [detailData, setDetailData] = useState<Task | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const openDetailModal = async (task: UnifiedTask) => {
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
  const isLoadingInitial = (isTasksLoading || isStatsLoading) && tasks.length === 0;

  return (
    <div className="flex h-screen bg-white font-sans">
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto bg-white p-8 font-sans">
          {isLoadingInitial ? (
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
              {/* Tabs periode + filter gedung */}
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

                <div className="relative inline-block">
                  <select
                    value={selectedGedung}
                    onChange={(e) => setSelectedGedung(e.target.value)}
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
              </div>

              {/* Stat Cards — 3 kartu, sesuai gambar 1 */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="h-9 w-9 rounded-lg bg-green-50 text-green-600 flex items-center justify-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="block text-xs font-semibold text-gray-500 mb-1">Total Tugas Hari Ini</span>
                  <span className="text-2xl font-bold text-gray-900">{totalHariIni} Tugas</span>
                </div>

                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-9 w-9 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4" />
                      </svg>
                    </div>
                  </div>
                  <span className="block text-xs font-semibold text-gray-500 mb-1">Diproses OB</span>
                  <span className="text-2xl font-bold text-gray-900">{prosesCount} Tugas</span>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-[#0F4C81] rounded-full" style={{ width: `${prosesPct}%` }} />
                  </div>
                </div>

                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                  </div>
                  <span className="block text-xs font-semibold text-gray-500 mb-1">Menunggu Persetujuan Admin</span>
                  <span className="text-2xl font-bold text-gray-900">{String(menungguPersetujuan).padStart(2, "0")} Tugas</span>
                </div>
              </div>

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

              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-900">Daftar Tugas</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Monitoring antrian tugas.</p>
                </div>

                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="text-[11px] font-bold text-gray-400 uppercase border-b border-gray-100 bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-3">ID &amp; Waktu</th>
                      <th className="px-6 py-3">Detail Pekerjaan &amp; Lokasi</th>
                      <th className="px-6 py-3">Kategori Tugas</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Pekerja</th>
                      <th className="px-6 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paged.map((task) => {
                      const statusStyle = getUiStatusLabel(task);
                      const hasOb = Boolean(task.petugas?.nama) && task.petugas.nama !== "Belum ditugaskan";

                      return (
                        <tr key={task.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="font-semibold text-gray-800">#{task.id}</p>
                            <p className="text-[11px] text-gray-400">{formatTanggalWaktu(task.tanggal, task.waktu)}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-gray-800">{task.namaTugas}</p>
                            <p className="text-xs text-gray-400">{task.gedung}, {task.lantai}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${KATEGORI_TUGAS_STYLE[task.jenis]}`}>
                              {task.jenis}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${statusStyle.text}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                              {statusStyle.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {hasOb ? (
                              <div className="flex items-center gap-2">
                                <Avatar name={task.petugas.nama} src={task.petugas.fotoProfil} size="sm" />
                                <span className="font-medium text-gray-700 whitespace-nowrap">{task.petugas.nama}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic">Menunggu OB...</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <RowActionMenu
                              onEdit={() => openEditModal(task)}
                              onDetail={() => openDetailModal(task)}
                              onDelete={() => setTaskToDelete(task)}
                              canEdit={true}
                              canDelete={true}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 text-xs text-gray-400">
                  <span>Menampilkan {rangeStart} sampai {rangeEnd} dari {sorted.length} tugas</span>
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