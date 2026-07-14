import { motion } from "framer-motion";
import { useState, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import * as XLSX from "xlsx";
import { useToast } from "../components/Toast";
import {
  STATUS_TASK_STYLE,
  STATUS_TASK_LABEL,
} from "../types/task";
import type { Task, StatusTask } from "../types/task";
import useTasks from "../hooks/useTasks";
import useLokasi from "../hooks/useLokasi";
import useUsers from "../hooks/useUsers";
import useKategori from "../hooks/useKategori";
import useTugasOptions from "../hooks/useTugasOptions";
import Can from "../components/auth/Can";
import PageHeader from "../components/ui/PageHeader";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import TaskFormModal from "../components/tasks/TaskFormModal";

type Periode = "Hari Ini" | "Mingguan" | "Bulanan" | "Tahunan";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-600",
  "bg-purple-100 text-purple-600",
  "bg-yellow-100 text-yellow-600",
  "bg-red-100 text-red-600",
  "bg-green-100 text-green-600",
];

const todayISO = () => new Date().toISOString().slice(0, 10);

function isInPeriod(tanggal: string, periode: Periode): boolean {
  if (!tanggal) return false;
  const d = new Date(tanggal);
  const now = new Date();

  if (periode === "Hari Ini") return d.toDateString() === now.toDateString();

  if (periode === "Mingguan") {
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - dowToMon(day);
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    const nextMonday = new Date(monday);
    nextMonday.setDate(monday.getDate() + 7);
    return d >= monday && d < nextMonday;
  }

  if (periode === "Bulanan") {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }

  return d.getFullYear() === now.getFullYear();
}

function dowToMon(day: number) {
  return day;
}

function gedungSummary(list: Task[]): string {
  const map = new Map<string, Set<string>>();
  list.forEach((t) => {
    if (!map.has(t.gedung)) map.set(t.gedung, new Set());
    map.get(t.gedung)!.add(t.lantai.replace("Lantai", "").trim());
  });
  return Array.from(map.entries())
    .map(([gedung, lantais]) => `${gedung}: Lantai ${Array.from(lantais).join(" & ")}`)
    .join(" • ");
}

function exportToExcel(tasks: Task[]) {
  const rows = tasks.map((t) => ({
    "ID Tugas": t.id,
    Kategori: t.kategori,
    "Nama Tugas": t.namaTugas,
    Gedung: t.gedung,
    Lantai: t.lantai,
    OB: t.petugas.nama,
    Tanggal: t.tanggal,
    Jam: t.waktu,
    Status: t.status,
    Catatan: t.catatan || "",
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Tugas");
  XLSX.writeFile(workbook, `laporan-tugas-${todayISO()}.xlsx`);
}

const Tasks = () => {
  const location = useLocation();
  const { push } = useToast();
  const {
    tasks,
    isLoading: isTasksLoading,
    error: tasksError,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
  } = useTasks();

  const { gedungList, fetchGedung } = useLokasi();
  const { fetchUsers, fetchOB } = useUsers();
  const { kategoriList, fetchKategori } = useKategori();
  const { tugasList, fetchTugas } = useTugasOptions();
  const [obList, setObList] = useState<Array<{ id: string; nama: string }>>([]);

  // Get initial filter from navigation state (from Dashboard)
  const initialFilter = (location.state as any)?.filter === "today" ? "Hari Ini" : "Mingguan";

  // Load locations and users to build dynamic options in modals
  useEffect(() => {
    fetchGedung();
    fetchUsers();
    fetchKategori();
    fetchTugas();
    // fetchOB returns Promise<Array<{id, nama}>>
    fetchOB().then(setObList).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Extract option lists dynamically from locations and users
  const gedungOptions = useMemo(() => {
    return gedungList.map((g) => ({ id: g.id, nama: g.nama }));
  }, [gedungList]);

  const lantaiOptions = useMemo(() => {
    const lantaiMap = new Map<string, { id: string; nama: string }>();
    gedungList.forEach((g) => {
      g.lantai?.forEach((l) => {
        if (!lantaiMap.has(l.id)) {
          lantaiMap.set(l.id, { id: l.id, nama: l.nama });
        }
      });
    });
    return Array.from(lantaiMap.values());
  }, [gedungList]);

  const obOptions = useMemo(() => {
    return obList.filter((u) => u.id);
  }, [obList]);

  // Kategori options from backend
  const kategoriOptions = useMemo(() => kategoriList, [kategoriList]);

  // Tugas options from backend
  const tugasOptions = useMemo(() => tugasList, [tugasList]);

  // --- Tab periode ---
  const [periode, setPeriode] = useState<Periode>(initialFilter as Periode);

  const periodTasks = useMemo(
    () => tasks.filter((t) => isInPeriod(t.tanggal, periode)),
    [tasks, periode]
  );

  // --- Statistik ---
  const total = periodTasks.length;
  const selesaiCount = periodTasks.filter((t) => t.status === "Selesai").length;
  const prosesCount = periodTasks.filter((t) => t.status === "Proses").length;
  const delayedCount = periodTasks.filter((t) => t.status === "Delayed").length;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

  // --- Grouping per OB ---
  const groupedByOb = useMemo(() => {
    const map = new Map<string, Task[]>();
    periodTasks.forEach((t) => {
      const key = t.petugas.nama;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return Array.from(map.entries()).map(([nama, list]) => ({ nama, list }));
  }, [periodTasks]);

  // --- Modal Buat/Edit Tugas ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [obPrefill, setObPrefill] = useState("");
  const [taskToEditData, setTaskToEditData] = useState<any>(null);

  const openCreateModal = (obPrefillName?: string) => {
    const selectedOb = obOptions.find((ob) => ob.nama === obPrefillName);
    setModalMode("create");
    setEditingTaskId(null);
    setObPrefill(selectedOb?.id || "");
    setTaskToEditData(null);
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    const selectedOb = obOptions.find((ob) => ob.nama === task.petugas.nama);
    const selectedKategori = kategoriOptions.find((k) => k.nama === task.kategori);
    const selectedGedung = gedungOptions.find((g) => g.nama === task.gedung);
    const selectedLantai = lantaiOptions.find((l) => l.nama === task.lantai);
    
    setModalMode("edit");
    setEditingTaskId(task.id);
    setTaskToEditData({
      kategori_id: selectedKategori?.id || "",
      namaTugas: task.namaTugas,
      lokasi_id: selectedGedung?.id || "",
      lantai_id: selectedLantai?.id || "",
      ob_id: selectedOb?.id || "",
      tanggal: task.tanggal,
      jam: task.waktu,
      catatan: task.catatan || "",
    });
    setIsModalOpen(true);
  };

  const handleSimpanTugas = async (form: any) => {
    // Form now contains IDs directly from dropdowns
    if (!form.kategori_id || !form.tugas_id || !form.lokasi_id || !form.lantai_id || !form.ob_id) {
      push("error", "Tugas Gagal Disimpan: Mohon lengkapi semua field wajib.");
      return;
    }

    // Build payload with IDs for backend
    const payload = {
      kategori_id: form.kategori_id,
      tugas_id: form.tugas_id,
      lokasi_id: form.lokasi_id,
      lantai_id: form.lantai_id,
      ob_id: form.ob_id,
      catatan: form.catatan || "",
    };

    try {
      if (modalMode === "edit" && editingTaskId) {
        await updateTask(editingTaskId, payload);
        push("success", "Tugas Berhasil Disimpan");
      } else {
        await createTask(payload);
        push("success", "Tugas Berhasil Disimpan");
      }
      setIsModalOpen(false);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Tugas Gagal Disimpan");
    }
  };

  // --- Ubah status cepat ---
  const handleChangeStatus = async (id: string, status: StatusTask) => {
    try {
      await updateTaskStatus(id, status);
      push("success", "Status Tugas Diperbarui");
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Gagal memperbarui status tugas");
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

  const isEmpty = tasks.length === 0;

  return (
    <div className="flex h-screen bg-white font-sans">
      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader title="Manajemen Tugas" />

        <main className="flex-1 overflow-auto bg-white p-8 font-sans">
          {isTasksLoading && tasks.length === 0 ? (
            <LoadingSpinner text="Memuat data tugas..." />
          ) : tasksError ? (
            <ErrorState message={tasksError} onRetry={fetchTasks} />
          ) : isEmpty ? (
            <EmptyState
              title="Belum Ada Tugas Terdaftar"
              description="Mulailah dengan menambahkan personel atau membuat tugas harian baru untuk memantau operasional gedung Anda."
              actionText="Tambah Tugas Baru"
              onAction={() => openCreateModal()}
            />
          ) : (
            <>
              {/* Tabs Periode */}
              <div className="inline-flex bg-gray-100 rounded-full p-1 mb-6">
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

              {/* Stat Cards */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-9 w-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M9 8h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
                      </svg>
                    </div>
                    <span className="text-[11px] font-bold text-gray-400 uppercase">{periode}</span>
                  </div>
                  <span className="block text-xs font-semibold text-gray-500 mb-1">Total Tugas</span>
                  <span className="text-2xl font-bold text-gray-900">{total}</span>
                </div>

                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-9 w-9 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-green-600">{pct(selesaiCount)}%</span>
                  </div>
                  <span className="block text-xs font-semibold text-gray-500 mb-1">Selesai</span>
                  <span className="text-2xl font-bold text-gray-900">{selesaiCount}</span>
                </div>

                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-9 w-9 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-yellow-600">{pct(prosesCount)}%</span>
                  </div>
                  <span className="block text-xs font-semibold text-gray-500 mb-1">Dalam Proses</span>
                  <span className="text-2xl font-bold text-gray-900">{prosesCount}</span>
                </div>

                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-9 w-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-red-600">{pct(delayedCount)}%</span>
                  </div>
                  <span className="block text-xs font-semibold text-gray-500 mb-1">Terlambat</span>
                  <span className="text-2xl font-bold text-gray-900">{delayedCount}</span>
                </div>
              </div>

              {/* Header Daftar Tugas OB */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[#0F4C81]">Daftar Tugas OB</h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => exportToExcel(periodTasks)}
                    className="flex items-center gap-2 text-sm font-semibold text-[#0F4C81] border border-[#0F4C81] rounded-xl px-4 py-2 hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    Export Laporan
                  </button>
                  <Can permission="tasks:create">
                    <button
                      onClick={() => openCreateModal()}
                      className="flex items-center gap-2 bg-[#0F4C81] hover:bg-[#0a355c] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Tambah Tugas
                    </button>
                  </Can>
                </div>
              </div>

              {/* Grid Kartu OB */}
              {groupedByOb.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-200 rounded-xl">
                  <span className="text-gray-400 font-semibold text-sm">Tidak ada tugas pada periode ini</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {groupedByOb.map(({ nama, list }, idx) => {
                    const done = list.filter((t) => t.status === "Selesai").length;
                    const progressPct = list.length === 0 ? 0 : Math.round((done / list.length) * 100);
                    const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];

                    return (
                      <motion.div
                        key={nama}
                        whileHover={{ y: -2, boxShadow: "0 6px 16px rgba(0,0,0,0.06)" }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="bg-white border border-gray-200 rounded-2xl p-5"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${avatarColor}`}>
                              {nama.charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <p className="font-bold text-gray-800 text-sm">{nama} OB</p>
                              <p className="text-xs text-gray-400">{gedungSummary(list)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Can permission="tasks:create">
                              <button
                                onClick={() => openCreateModal(nama)}
                                title="Tambah tugas untuk OB ini"
                                className="h-7 w-7 rounded-lg border border-gray-200 text-gray-400 hover:text-[#0F4C81] hover:border-[#0F4C81] flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                            </Can>
                            <span className="text-[11px] font-bold text-blue-500">Progress: {done}/{list.length}</span>
                          </div>
                        </div>

                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPct}%` }}
                            transition={{ type: "spring", stiffness: 120, damping: 18 }}
                            className="h-full bg-[#0F4C81] rounded-full"
                          />
                        </div>

                        <table className="w-full text-left text-xs text-gray-600">
                          <thead className="text-[10px] font-bold text-gray-400 uppercase border-b border-gray-100">
                            <tr>
                              <th className="pb-2">Tugas</th>
                              <th className="pb-2">Waktu</th>
                              <th className="pb-2">Status</th>
                              <Can roles={["Admin", "HR"]}>
                                <th className="pb-2 text-right">Aksi</th>
                              </Can>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {list.map((task) => (
                              <tr key={task.id}>
                                <td className="py-2.5 font-medium text-gray-700">{task.namaTugas}</td>
                                <td className="py-2.5 text-gray-500">{task.waktu}</td>
                                <td className="py-2.5">
                                  <Can roles={["Admin", "HR"]} fallback={
                                    <span className={`text-[10px] font-bold uppercase rounded-full px-2 py-1 ${STATUS_TASK_STYLE[task.status]}`}>
                                      {STATUS_TASK_LABEL[task.status]}
                                    </span>
                                  }>
                                    <select
                                      value={task.status}
                                      onChange={(e) => handleChangeStatus(task.id, e.target.value as StatusTask)}
                                      className={`text-[10px] font-bold uppercase rounded-full px-2 py-1 border-0 outline-none cursor-pointer ${STATUS_TASK_STYLE[task.status]}`}
                                    >
                                      <option value="Belum">{STATUS_TASK_LABEL.Belum}</option>
                                      <option value="Proses">{STATUS_TASK_LABEL.Proses}</option>
                                      <option value="Selesai">{STATUS_TASK_LABEL.Selesai}</option>
                                      <option value="Delayed">{STATUS_TASK_LABEL.Delayed}</option>
                                    </select>
                                  </Can>
                                </td>
                                <Can roles={["Admin", "HR"]}>
                                  <td className="py-2.5 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        onClick={() => openEditModal(task)}
                                        className="text-gray-400 hover:text-[#0F4C81] p-1 rounded transition-colors cursor-pointer"
                                        title="Edit"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                      <Can permission="tasks:delete">
                                        <button
                                          onClick={() => setTaskToDelete(task)}
                                          className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors cursor-pointer"
                                          title="Hapus"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      </Can>
                                    </div>
                                  </td>
                                </Can>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </motion.div>
                    );
                  })}
                </div>
              )}
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
        editingTaskId={editingTaskId}
        obPrefill={obPrefill}
        obOptions={obOptions}
        gedungOptions={gedungOptions}
        lantaiOptions={lantaiOptions}
        kategoriOptions={kategoriOptions}
        tugasOptions={tugasOptions}
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
