import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import useTugasKatalog from "../hooks/useTugasKatalog";
import useLokasi from "../hooks/useLokasi";
import useKategori from "../hooks/useKategori";
import { useToast } from "../hooks/useToast";
import TaskFormModal from "../components/tasks/TaskFormModal";
import type { Option } from "../components/tasks/TaskFormModal";
import { getErrorMessage } from "../lib/utils";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import { TableSkeleton } from "../components/ui/Skeleton";
import Avatar from "../components/ui/Avatar";
import ConfirmDialog from "../components/ui/ConfirmDialog";

type Tab = "Hari Ini" | "Mingguan" | "Bulanan" | "Tahunan";

function inPeriod(dateStr: string | undefined, tab: Tab): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  if (tab === "Hari Ini") return d.toDateString() === now.toDateString();
  if (tab === "Tahunan") return d.getFullYear() === now.getFullYear();
  if (tab === "Bulanan") return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  const dow = now.getDay();
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 7);
  return d >= monday && d < sunday;
}

interface FormValues {
  kategori_id: string;
  nama_tugas: string;
  lantai_id: string;
  catatan: string;
}

interface Row {
  id: string;
  namaTugas: string;
  kategori: string;
  lantai: string;
  status: string;
  catatan: string;
  kategori_id: string;
  lantai_id: string;
  ob_id: string | null;
  createdAt: string;
  pelapor: string;
}

const TasksTidakRutin = () => {
  const { push } = useToast();
  const location = useLocation();
  const { gedungList } = useLokasi();
  const { kategoriList } = useKategori();

  const [gedungFilter, setGedungFilter] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("Hari Ini");
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { tugasList, isLoading, error, refetch, createTugas, updateTugas, deleteTugas } = useTugasKatalog();

  const kategoriOptions: Option[] = useMemo(() => kategoriList.map((k) => ({ id: k.id, nama: k.nama })), [kategoriList]);
  const gedungOptions: Option[] = useMemo(() => gedungList.map((g) => ({ id: g.id, nama: g.nama })), [gedungList]);

  const lantaiOptions: Option[] = useMemo(() => {
    const map = new Map<string, Option>();
    gedungList.forEach((g) => g.lantai?.forEach((l) => map.set(l.id, { id: l.id, nama: l.nama })));
    return Array.from(map.values());
  }, [gedungList]);

  const kategoriNameById = useMemo(() => new Map(kategoriOptions.map((o) => [o.id, o.nama])), [kategoriOptions]);
  const lantaiNameById = useMemo(() => new Map(lantaiOptions.map((o) => [o.id, o.nama])), [lantaiOptions]);

  const lantaiToGedung = useMemo(() => {
    const m = new Map<string, string>();
    gedungList.forEach((g) => g.lantai?.forEach((l) => m.set(l.id, g.id)));
    return m;
  }, [gedungList]);

  const rows: Row[] = useMemo(
    () =>
      tugasList.map((t) => ({
        id: t.id,
        namaTugas: t.nama_tugas,
        kategori: kategoriNameById.get(t.kategori_id) ?? "-",
        lantai: (t.lantai_id && lantaiNameById.get(t.lantai_id)) ?? "-",
        status: t.status ?? "BELUM_DIKERJAKAN",
        catatan: t.catatan ?? "",
        kategori_id: t.kategori_id,
        lantai_id: t.lantai_id ?? "",
        ob_id: t.ob_id ?? null,
        createdAt: t.created_at ?? "",
        pelapor: "Admin",
      })),
    [tugasList, kategoriNameById, lantaiNameById]
  );

  const filteredRows = useMemo(
    () =>
      rows.filter((r) => {
        if (gedungFilter && lantaiToGedung.get(r.lantai_id) !== gedungFilter) return false;
        if (!inPeriod(r.createdAt, activeTab)) return false;
        return true;
      }),
    [rows, gedungFilter, activeTab, lantaiToGedung]
  );

  const prefill = (location.state as { prefill?: { nama_tugas: string; kategori_id: string; lantai_id: string } } | null)?.prefill;

  const [isModalOpen, setIsModalOpen] = useState(Boolean(prefill));
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalInitial, setModalInitial] = useState<Record<string, unknown> | null>(
    prefill ? { kategori_id: prefill.kategori_id, namaTugas: prefill.nama_tugas, lantai_id: prefill.lantai_id, catatan: "" } : null
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setModalInitial(null);
    setIsModalOpen(true);
  };

  const openEdit = (row: Row) => {
    setModalMode("edit");
    setEditingId(row.id);
    setModalInitial({ kategori_id: row.kategori_id, namaTugas: row.namaTugas, lantai_id: row.lantai_id, catatan: row.catatan });
    setIsModalOpen(true);
    setActiveDropdown(null);
  };

  const handleSave = async (form: FormValues) => {
    if (!form.kategori_id || !form.nama_tugas || !form.lantai_id) {
      push("error", "Lengkapi Kategori, Nama Tugas, dan Lantai.");
      return;
    }
    const payload = { kategori_id: form.kategori_id, nama_tugas: form.nama_tugas, lantai_id: form.lantai_id, catatan: form.catatan || "" };
    try {
      if (modalMode === "edit" && editingId) await updateTugas(editingId, payload);
      else await createTugas(payload);
      push("success", "Tugas berhasil disimpan");
      setIsModalOpen(false);
    } catch (e) {
      push("error", getErrorMessage(e) || "Gagal menyimpan tugas");
    }
  };

  const handleSetujui = async (row: Row) => {
    try {
      await updateTugas(row.id, { status: "SELESAI" });
      push("success", "Tugas disetujui");
    } catch (e) {
      push("error", getErrorMessage(e) || "Gagal menyetujui tugas");
    }
    setActiveDropdown(null);
  };

  const [rowToDelete, setRowToDelete] = useState<Row | null>(null);
  const handleConfirmDelete = async () => {
    if (!rowToDelete) return;
    try {
      await deleteTugas(rowToDelete.id);
      push("success", "Tugas berhasil dihapus");
    } catch (e) {
      push("error", getErrorMessage(e) || "Gagal menghapus tugas");
    }
    setRowToDelete(null);
    setActiveDropdown(null);
  };

  return (
    <div className="flex h-screen bg-white font-sans dark:bg-base">
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto bg-white p-8 dark:bg-base">

          {/* Tabs + filter */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex bg-gray-100 rounded-full p-1 dark:bg-elevated">
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

            <div className="flex items-center gap-2">
              <div className="relative inline-block">
                <select
                  value={gedungFilter}
                  onChange={(e) => setGedungFilter(e.target.value)}
                  className="appearance-none bg-blue-50 text-[#0F4C81] font-semibold text-sm rounded-full pl-4 pr-9 py-2 outline-none cursor-pointer border border-blue-100"
                >
                  <option value="">Semua Gedung</option>
                  {gedungOptions.map((g) => (
                    <option key={g.id} value={g.id}>{g.nama}</option>
                  ))}
                </select>
                <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0F4C81]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 bg-[#0F4C81] hover:bg-[#0a355c] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Tambah Tugas Baru
              </button>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="h-9 w-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <span className="block text-xs font-semibold text-gray-500 mb-1">Total Tugas</span>
              <span className="text-2xl font-bold text-gray-900">{String(filteredRows.length).padStart(2, "0")} Tugas</span>
            </div>

            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2.13a4 4 0 10-4-4 4 4 0 004 4z" />
                  </svg>
                </div>
              </div>
              <span className="block text-xs font-semibold text-gray-500 mb-1">Sedang Diproses</span>
              <span className="text-2xl font-bold text-gray-900">
                {String(filteredRows.filter((r) => r.status === "SEDANG_DIKERJAKAN").length).padStart(2, "0")} Tugas
              </span>
            </div>

            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="h-9 w-9 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <span className="block text-xs font-semibold text-gray-500 mb-1">Selesai</span>
              <span className="text-2xl font-bold text-gray-900">
                {String(filteredRows.filter((r) => r.status === "SELESAI").length).padStart(2, "0")} Tugas
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">Daftar Tugas</h2>
                <p className="text-xs text-gray-400 mt-0.5">Monitoring antrian tugas real-time.</p>
              </div>
            </div>

            {isLoading && filteredRows.length === 0 ? (
              <div className="p-6">
                <TableSkeleton columns={6} rows={3} />
              </div>
            ) : error ? (
              <ErrorState message={error} onRetry={refetch} />
            ) : filteredRows.length === 0 ? (
              <EmptyState
                title="Belum Ada Tugas"
                description="Tambahkan tugas tidak rutin baru melalui tombol Tambah Tugas Baru."
                actionText="Tambah Tugas Baru"
                onAction={openCreate}
              />
            ) : (
              <div className="overflow-x-auto" ref={dropdownRef}>
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="text-[11px] font-bold text-gray-400 uppercase border-b border-gray-100 bg-gray-50/50 dark:bg-surface">
                    <tr>
                      <th className="px-6 py-3">ID Laporan</th>
                      <th className="px-6 py-3">Pelapor</th>
                      <th className="px-6 py-3">Detail Pekerjaan &amp; Lokasi</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Pekerja</th>
                      <th className="px-6 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredRows.map((row) => {
                      const st = getStatusStyle(row.status);
                      const isMenuOpen = activeDropdown === row.id;

                      return (
                        <tr key={row.id} className="hover:bg-gray-50/50 transition-colors dark:bg-surface">
                          <td className="px-6 py-4 font-semibold text-[#0F4C81] whitespace-nowrap">#{row.id.slice(0, 8).toUpperCase()}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Avatar name={row.pelapor} size="sm" />
                              <span className="font-medium text-gray-700 whitespace-nowrap">{row.pelapor}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-gray-800">{row.namaTugas}</p>
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                              </svg>
                              {row.kategori}, {row.lantai}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${st.text}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                              {st.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {row.ob_id ? (
                              <span className="text-sm text-gray-400 italic">OB Assigned</span>
                            ) : (
                              <span className="text-xs text-gray-400 italic">Waiting for OB...</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right relative">
                            <button
                              onClick={() => setActiveDropdown(isMenuOpen ? null : row.id)}
                              className="text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer dark:bg-elevated"
                              title="Aksi"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 6a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>

                            {isMenuOpen && (
                              <div
                                ref={dropdownRef}
                                className="absolute right-6 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-20 text-left dark:bg-surface"
                              >
                                <button
                                  onClick={() => { setActiveDropdown(null); openEdit(row); }}
                                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Edit
                                </button>
                                {row.status !== "SELESAI" && (
                                  <button
                                    onClick={() => { setActiveDropdown(null); handleSetujui(row); }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors cursor-pointer"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Setujui Selesai
                                  </button>
                                )}
                                <div className="my-1 border-t border-gray-100" />
                                <button
                                  onClick={() => { setActiveDropdown(null); setRowToDelete(row); }}
                                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Hapus
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 text-xs text-gray-400">
              <span>Showing 1 to {filteredRows.length} of {filteredRows.length} tasks</span>
              <div className="flex items-center gap-1">
                <button className="h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 opacity-40 cursor-pointer dark:bg-surface">‹</button>
                <button className="h-7 w-7 flex items-center justify-center rounded-md bg-[#0F4C81] text-white font-semibold cursor-pointer">1</button>
                <button className="h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 opacity-40 cursor-pointer dark:bg-surface">›</button>
              </div>
            </div>
          </div>
        </main>

        <TaskFormModal
          key={`${modalMode}-${editingId ?? "new"}-${isModalOpen}`}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          mode={modalMode}
          initialData={modalInitial}
          gedungOptions={gedungOptions}
          lantaiOptions={lantaiOptions}
          kategoriOptions={kategoriOptions}
        />

        <ConfirmDialog
          open={!!rowToDelete}
          onClose={() => setRowToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Hapus Tugas Ini?"
          message={`Tugas "${rowToDelete?.namaTugas}" akan dihapus permanen dan tidak dapat dikembalikan.`}
        />
      </div>
    </div>
  );
};

// Status helper — kept outside component
const UI_STATUS_STYLE: Record<string, { dot: string; text: string; label: string }> = {
  BELUM_DIKERJAKAN: { dot: "bg-gray-300", text: "text-gray-500", label: "Menunggu OB" },
  SEDANG_DIKERJAKAN: { dot: "bg-amber-500", text: "text-amber-600", label: "Dikerjakan" },
  SELESAI: { dot: "bg-green-500", text: "text-green-600", label: "Selesai" },
};
const getStatusStyle = (s?: string) => UI_STATUS_STYLE[s ?? "BELUM_DIKERJAKAN"] ?? UI_STATUS_STYLE.BELUM_DIKERJAKAN;

export default TasksTidakRutin;
