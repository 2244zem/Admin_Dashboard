import { useState, useMemo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import { useToast } from "../hooks/useToast";
import type { Task, KategoriTugas } from "../types/task";
import useTasks, { type TaskFilters } from "../hooks/useTasks";
import useLokasi from "../hooks/useLokasi";
import useUsers from "../hooks/useUsers";
import useKategori from "../hooks/useKategori";
import { useTugasStats } from "../hooks/useTugasStats";
import { useTugasApproval } from "../hooks/useTugasApproval";
import { useChecklistApproval } from "../hooks/useChecklistApproval";
import Can from "../components/auth/Can";
import { StatCardsSkeleton, CardListSkeleton, Skeleton } from "../components/ui/Skeleton";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import TaskFormModal from "../components/tasks/TaskFormModal";
import TaskDetailModal from "../components/tasks/TaskDetailModal";
import type { DetailRow } from "../components/tasks/TaskDetailModal";
import { formatDateTime } from "../lib/utils";
import { createJadwalChecklist, updateJadwalChecklist, getChecklistHarianDetail } from "../api/checklist";
import { getTugasById } from "../api/tugas";
import Avatar from "../components/ui/Avatar";

type Periode = "Hari Ini" | "Mingguan" | "Bulanan" | "Tahunan";

interface UnifiedTask extends Task {
  jenis: KategoriTugas;
}

const KATEGORI_TUGAS_STYLE: Record<KategoriTugas, string> = {
  Rutin: "bg-[#22C55E]/10 text-[#22C55E]",
  "Tidak Rutin": "bg-[#FF8D28]/10 text-[#FF8D28]",
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
      if (!document.querySelector("[data-dropdown]")?.contains(e.target as Node)) {
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
  const { approvalList: tugasApproval, approve: approveTugas } = useTugasApproval(periodMap[periode], selectedGedungObj?.id);
  const { approvalList: checklistApproval, approve: approveChecklist } = useChecklistApproval(periodMap[periode], selectedGedungObj?.id);

  const taskFilters = useMemo((): TaskFilters => {
    const filters: TaskFilters = {};
    if (selectedGedung !== "Semua Gedung" && selectedGedungObj) filters.lokasi_id = selectedGedungObj.id;
    return filters;
  }, [selectedGedung, selectedGedungObj]);

  const { tasks, isLoading: isTasksLoading, error: tasksError, fetchTasks, createTask, updateTask, deleteTask, approveTask } = useTasks(taskFilters);

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

  // --- Resolve nama gedung/lantai + tag jenis dari API (Rutin / Tidak Rutin) ---
  const unifiedTasks: UnifiedTask[] = useMemo(
    () =>
      tasks.map((t) => ({
        ...t,
        gedung: (t.lokasiId && lokasiNameById.get(t.lokasiId)) || t.gedung,
        lantai: (t.lantaiId && lantaiNameById.get(t.lantaiId)) || t.lantai,
        jenis: t.jenis ?? "Rutin" as KategoriTugas,
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
    const selectedGedung = gedungOptions.find((g) => g.nama === task.gedung);
    setModalMode("edit");
    setEditingTaskId(task.id);
    setTaskToEditData({
      kategori_id: selectedKategori?.id || "",
      namaTugas: task.namaTugas,
      gedung_id: selectedGedung?.id ?? "",
      lantai_id: selectedLantai?.id || "",
      // ponytail: `frekuensi_kerja` not available on Task type → upgrade path: fetch jadwal detail from API
      frekuensi_kerja: [],
      catatan: task.catatan || "",
    });
    setIsModalOpen(true);
  };

  const handleSimpanTugas = async (form: {
    kategori_id: string; nama_tugas: string; gedung_id: string; lantai_id: string; frekuensi_kerja: string[]; catatan: string;
  }) => {
    if (!form.kategori_id || !form.nama_tugas || !form.lantai_id) {
      push("error", "Tugas Gagal Disimpan: Mohon lengkapi Kategori, Nama Tugas, dan Lokasi Lantai.");
      return;
    }
    try {
      if (form.frekuensi_kerja.length > 0) {
        // Rutin → create/update Jadwal Checklist
        const jadwalPayload = {
          nama_tugas: form.nama_tugas,
          kategori_id: form.kategori_id,
          lantai_id: form.lantai_id,
          hari: form.frekuensi_kerja,
          catatan: form.catatan || "",
        };
        if (modalMode === "edit" && editingTaskId) {
          await updateJadwalChecklist(editingTaskId, jadwalPayload);
        } else {
          await createJadwalChecklist(jadwalPayload);
        }
      } else {
        // Tidak Rutin → create/update Tugas
        const payload = {
          kategori_id: form.kategori_id,
          nama_tugas: form.nama_tugas,
          lantai_id: form.lantai_id,
          catatan: form.catatan || "",
        };
        if (modalMode === "edit" && editingTaskId) await updateTask(editingTaskId, payload);
        else await createTask(payload);
      }
      push("success", "Tugas Berhasil Disimpan");
      setIsModalOpen(false);
      fetchTasks();
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

  const [detailRow, setDetailRow] = useState<DetailRow | null>(null);

  const openDetailModal = async (task: UnifiedTask) => {
    const base: DetailRow = {
      id: task.id,
      namaTugas: task.namaTugas,
      kategori: task.kategori,
      lantai: task.lantai,
      status: task.status,
      catatan: task.catatan ?? "",
      ob_id: null,
      obNama: task.petugas?.nama ?? null,
      fotoSebelum: null,
      fotoSesudah: null,
      waktuMulai: null,
      waktuSelesai: null,
      catatanOb: null,
      isNonRutin: task.jenis === "Tidak Rutin",
    };

    try {
      if (task.jenis === "Tidak Rutin") {
        const raw = await getTugasById(task.id);
        const ob = raw.ob as { nama_lengkap?: unknown; id?: unknown } | undefined;
        base.obNama = String(ob?.nama_lengkap ?? raw.nama_ob ?? base.obNama ?? "");
        base.ob_id = String(raw.ob_id ?? ob?.id ?? "") || null;
      } else {
        const raw = await getChecklistHarianDetail(task.id);
        base.obNama = String((raw.ob as { nama_lengkap?: string } | undefined)?.nama_lengkap ?? raw.nama_ob ?? base.obNama ?? "");
        base.ob_id = String(raw.ob_id ?? (raw.ob as { id?: string } | undefined)?.id ?? "") || null;
        base.fotoSebelum = String(raw.foto_sebelum ?? "") || null;
        base.fotoSesudah = String(raw.foto_sesudah ?? "") || null;
        base.waktuMulai = String(raw.waktu_mulai ?? "") || null;
        base.waktuSelesai = String(raw.waktu_selesai ?? "") || null;
        base.catatanOb = String(raw.catatan_ob ?? "") || null;
      }
    } catch {}

    setDetailRow(base);
  };

  const handleApprove = async (id: string, _catatanAdmin: string) => {
    setDetailRow(null);
    try {
      await approveTask(id, detailRow?.isNonRutin ? "Tidak Rutin" : "Rutin");
      push("success", "Tugas Disetujui");
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Gagal menyetujui tugas");
    }
  };

  const isEmpty = tasks.length === 0;
  const isLoadingInitial = (isTasksLoading || isStatsLoading) && tasks.length === 0;

  return (
    <div className="flex h-screen bg-white font-sans">
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto bg-white p-6 font-sans">
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
              <div className="flex items-center justify-between mb-4">
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
              <div className="grid grid-cols-3 gap-4 mb-4">
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

              {/* Approval lists */}
              {(tugasApproval.length > 0 || checklistApproval.length > 0) && (
                <div className="border border-amber-200 bg-amber-50/50 rounded-2xl p-4 mb-4">
                  <h3 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    Menunggu Persetujuan
                  </h3>
                  <div className="space-y-2">
                    {checklistApproval.map((item) => (
                      <div key={`cl-${item.id}`} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-amber-100">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-800 truncate">{item.nama_tugas}</p>
                          <p className="text-[11px] text-gray-500">{item.nama_ob} • {item.lokasi} • {item.kategori}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <span className="text-[10px] text-gray-400">{item.selesai_at?.slice(0, 10)}</span>
                          <button
                            onClick={async () => { await approveChecklist(item.id); fetchTasks(); push("success", "Checklist disetujui"); }}
                            className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            Setujui
                          </button>
                        </div>
                      </div>
                    ))}
                    {tugasApproval.map((item) => (
                      <div key={`tg-${item.id}`} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-amber-100">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-800 truncate">{item.nama_tugas}</p>
                          <p className="text-[11px] text-gray-500">{item.nama_ob} • {item.lokasi} • {item.kategori}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <span className="text-[10px] text-gray-400">{item.selesai_at?.slice(0, 10)}</span>
                          <button
                            onClick={async () => { await approveTugas(item.id); fetchTasks(); push("success", "Tugas disetujui"); }}
                            className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            Setujui
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="text-[10px] font-bold text-gray-400 uppercase border-b border-gray-100 bg-gray-50/50">
                    <tr>
                      <th className="px-2 py-2">ID &amp; Waktu</th>
                      <th className="px-2 py-2">Pelapor</th>
                      <th className="px-2 py-2">Detail Pekerjaan</th>
                      <th className="px-2 py-2">Kategori</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2">Pekerja</th>
                      <th className="px-2 py-2 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paged.map((task) => {
                      const statusStyle = getUiStatusLabel(task);
                      const hasOb = Boolean(task.petugas?.nama) && task.petugas.nama !== "Belum ditugaskan";

                      return (
                        <tr key={task.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-2 py-2 whitespace-nowrap">
                            <p className="font-semibold text-gray-800 text-xs">#{task.id}</p>
                            <p className="text-[10px] text-gray-400">{formatDateTime(task.tanggal)}</p>
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap">
                            <span className="text-gray-700">{task.pelapor ?? "Admin"}</span>
                          </td>
                          <td className="px-2 py-2">
                            <p className="font-semibold text-gray-800">{task.namaTugas}</p>
                            <p className="text-[10px] text-gray-400">{task.gedung}, {task.lantai}</p>
                          </td>
                          <td className="px-2 py-2">
                            <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-bold ${KATEGORI_TUGAS_STYLE[task.jenis]}`}>
                              {task.jenis}
                            </span>
                          </td>
                          <td className="px-2 py-2">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${statusStyle.text}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                              {statusStyle.label}
                            </span>
                          </td>
                          <td className="px-2 py-2">
                            {hasOb ? (
                              <div className="flex items-center gap-1">
                                <Avatar name={task.petugas.nama} src={task.petugas.fotoProfil} size="sm" />
                                <span className="font-medium text-gray-700 whitespace-nowrap text-xs">{task.petugas.nama}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic">Menunggu OB...</span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-right">
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
        row={detailRow}
        onClose={() => setDetailRow(null)}
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