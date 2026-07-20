import { useState, useMemo, useEffect, useRef, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
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

// Mapping status menyesuaikan UI pada screenshot (Unassigned, In Progress, Completed)
const UI_STATUS_STYLE: Record<string, { icon: ReactNode; textClass: string; label: string }> = {
  BELUM_DIKERJAKAN: { 
    icon: <div className="h-3.5 w-3.5 rounded-full border-[1.5px] border-gray-300 mr-2" />, 
    textClass: "text-gray-400", 
    label: "Unassigned" 
  },
  SEDANG_DIKERJAKAN: { 
    icon: (
      <svg className="w-4 h-4 mr-1.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ), 
    textClass: "text-amber-500 font-medium", 
    label: "In Progress" 
  },
  SELESAI: { 
    icon: (
      <svg className="w-4 h-4 mr-1.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ), 
    textClass: "text-green-500 font-medium", 
    label: "Completed" 
  },
};
const getStatusStyle = (s?: string) => UI_STATUS_STYLE[s ?? "BELUM_DIKERJAKAN"] ?? UI_STATUS_STYLE.BELUM_DIKERJAKAN;

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
  lokasi_id: string;
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
}

const TasksInsidental = () => {
  const { push } = useToast();
  const location = useLocation();
  const { gedungList } = useLokasi();
  const { kategoriList } = useKategori();

  const [kategoriFilter, setKategoriFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [gedungFilter, setGedungFilter] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("Hari Ini");
  
  // State untuk dropdown Kebab menu di tabel
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { tugasList, isLoading, error, refetch, createTugas, updateTugas, deleteTugas } = useTugasKatalog({
    kategori_id: kategoriFilter || undefined,
    status: statusFilter || undefined,
  });

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

  // Menutup dropdown action jika klik di luar
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
      push("success", "Tugas biasa tersimpan");
      setIsModalOpen(false);
    } catch (e) {
      push("error", getErrorMessage(e) || "Gagal menyimpan tugas biasa");
    }
  };

  const handleSetujui = async (row: Row) => {
    try {
      await updateTugas(row.id, { status: "SELESAI" });
      push("success", "Tugas biasa disetujui");
    } catch (e) {
      push("error", getErrorMessage(e) || "Gagal menyetujui tugas");
    }
    setActiveDropdown(null);
  };

  const handleHapus = async (row: Row) => {
    try {
      await deleteTugas(row.id);
      push("success", "Tugas biasa dihapus");
    } catch (e) {
      push("error", getErrorMessage(e) || "Gagal menghapus tugas");
    }
    setActiveDropdown(null);
  };

  return (
    <div className="flex h-screen bg-white font-sans text-gray-800 dark:bg-base dark:text-ink">
      <div className="flex-1 flex flex-col overflow-hidden">

        <main className="flex-1 overflow-auto bg-[#FAFAFA] p-8 dark:bg-base">
          
          {/* Top Actions & Filters Bar */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm dark:bg-surface">
              {(["Hari Ini", "Mingguan", "Bulanan", "Tahunan"] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab ? "bg-[#0F4C81] text-white" : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-3">
              {/* Dropdown Gedung bergaya button */}
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-[#0F4C81]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <select
                  value={gedungFilter}
                  onChange={(e) => setGedungFilter(e.target.value)}
                  className="appearance-none pl-9 pr-8 py-2 text-sm font-medium bg-blue-50 text-[#0F4C81] border border-blue-100 rounded-md hover:bg-blue-100 transition cursor-pointer outline-none"
                >
                  <option value="">Gedung A</option>
                  {gedungOptions.map((g) => (
                    <option key={g.id} value={g.id}>{g.nama}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-[#0F4C81]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <button
                onClick={openCreate}
                className="px-4 py-2 text-sm font-medium bg-[#0070AF] text-white rounded-md hover:bg-[#005f96] transition shadow-sm"
              >
                + Tambah Tugas Insidental
              </button>
            </div>
          </div>

          {/* Hidden Original Filters to preserve React state without breaking visual design */}
          <div className="hidden">
            <select value={kategoriFilter} onChange={(e) => setKategoriFilter(e.target.value)}><option value="">All</option></select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">All</option></select>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {/* Card 1 */}
            <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-5 relative overflow-hidden dark:bg-surface">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 tracking-wider uppercase mb-2">LAPORAN BARU</h3>
                  <span className="text-4xl font-bold text-gray-900 leading-none">
                    {String(filteredRows.filter((r) => r.status === "BELUM_DIKERJAKAN").length).padStart(2, '0')}
                  </span>
                </div>
                <div className="h-10 w-10 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
              </div>
              <div className="flex items-center mt-3 text-xs text-gray-500">
                <span className="h-2 w-2 rounded-full bg-red-500 mr-2" /> Menunggu
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-5 relative overflow-hidden dark:bg-surface">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 tracking-wider uppercase mb-2">SEDANG DIKERJAKAN</h3>
                  <span className="text-4xl font-bold text-gray-900 leading-none">
                    {String(filteredRows.filter((r) => r.status === "SEDANG_DIKERJAKAN").length).padStart(2, '0')}
                  </span>
                </div>
                <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex items-center mt-3 text-xs text-gray-500">
                <span className="h-2 w-2 rounded-full bg-blue-600 mr-2" /> Proses
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-5 relative overflow-hidden dark:bg-surface">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 tracking-wider uppercase mb-2">SELESAI HARI INI</h3>
                  <span className="text-4xl font-bold text-gray-900 leading-none">
                    {String(filteredRows.filter((r) => r.status === "SELESAI").length).padStart(2, '0')}
                  </span>
                </div>
                <div className="h-10 w-10 bg-green-50 rounded-full flex items-center justify-center text-green-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="flex items-center mt-3 text-xs text-gray-500">
                <svg className="w-3.5 h-3.5 text-green-500 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Terverifikasi admin
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col dark:bg-surface">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Daftar Tugas</h2>
              <p className="text-sm text-gray-500 mt-1">Monitoring antrian tugas real-time.</p>
            </div>

            {isLoading && filteredRows.length === 0 ? (
              <div className="p-6">
                <TableSkeleton columns={5} rows={3} withAvatar />
              </div>
            ) : error ? (
              <ErrorState message={error} onRetry={refetch} />
            ) : filteredRows.length === 0 ? (
              <EmptyState
                title="Belum Ada Tugas Biasa"
                description="Tambahkan tugas biasa (ad-hoc) melalui tombol Tambah Tugas."
                actionText="Tambah Tugas Biasa"
                onAction={openCreate}
              />
            ) : (
              <div className="overflow-x-auto pb-4" ref={dropdownRef}>
                <table className="w-full text-left text-sm text-gray-700">
                  <thead className="text-[12px] font-bold text-gray-700 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 w-32">ID LAPORAN</th>
                      <th className="px-6 py-4">Detail Pekerjaan & Lokasi</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Pekerja</th>
                      <th className="px-6 py-4 text-center w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRows.map((row) => {
                      const st = getStatusStyle(row.status);
                      
                      return (
                        <motion.tr key={row.id} className="hover:bg-gray-50/50 transition-colors group dark:bg-surface">
                          {/* Kolom ID */}
                          <td className="px-6 py-5 align-top">
                            <span className="font-semibold text-[#0070AF]">#OB-{new Date().getFullYear()}-{row.id.slice(0,3).toUpperCase()}</span>
                          </td>
                          
                          {/* Kolom Detail */}
                          <td className="px-6 py-5 align-top">
                            <p className="font-bold text-gray-900 mb-1">{row.namaTugas}</p>
                            <div className="flex items-start text-xs text-gray-500">
                              <svg className="w-3.5 h-3.5 mr-1 mt-0.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span>{row.kategori},<br/>{row.lantai}</span>
                            </div>
                          </td>
                          
                          {/* Kolom Status */}
                          <td className="px-6 py-5 align-middle">
                            <div className={`flex items-center ${st.textClass}`}>
                              {st.icon}
                              {st.label}
                            </div>
                          </td>
                          
                          {/* Kolom Pengerja */}
                          <td className="px-6 py-5 align-middle">
                            {row.ob_id ? (
                              <div className="flex items-center gap-3">
                                {/* Dummy Avatar jika sudah diassign, karena ob_id tidak memuat nama lengkap di interface */}
                                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                                  AP
                                </div>
                                <span className="font-medium text-gray-800 whitespace-nowrap">Agus Pratama</span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400 italic">Waiting for OB...</span>
                            )}
                          </td>
                          
                          {/* Kolom Aksi (Kebab Menu) */}
                          <td className="px-6 py-5 align-middle text-center relative">
                            <button
                              onClick={() => setActiveDropdown(activeDropdown === row.id ? null : row.id)}
                              className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors dark:bg-elevated"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </button>

                            {/* Dropdown Menu */}
                            {activeDropdown === row.id && (
                              <div className="absolute right-8 top-10 w-40 bg-white border border-gray-100 shadow-lg rounded-md py-1 z-10 text-left dark:bg-surface">
                                <button
                                  onClick={() => openEdit(row)}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors dark:bg-surface"
                                >
                                  Edit Tugas
                                </button>
                                {row.status !== "SELESAI" && (
                                  <button
                                    onClick={() => handleSetujui(row)}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition-colors"
                                  >
                                    Setujui Selesai
                                  </button>
                                )}
                                <button
                                  onClick={() => handleHapus(row)}
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  Hapus Tugas
                                </button>
                              </div>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Pagination Footer */}
            {!isLoading && filteredRows.length > 0 && (
              <div className="border-t border-gray-100 p-4 flex items-center justify-between text-sm text-gray-500 bg-white dark:bg-surface">
                <span>Showing 1 to 10 of 40 tasks</span>
                <div className="flex items-center gap-1">
                  <button className="px-2 py-1 text-gray-400 hover:text-gray-700">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-md bg-[#0F4C81] text-white font-medium">1</button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 font-medium dark:bg-elevated">2</button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 font-medium dark:bg-elevated">3</button>
                  <button className="px-2 py-1 text-gray-400 hover:text-gray-700">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
          
        </main>

        <TaskFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          mode={modalMode}
          initialData={modalInitial}
          gedungOptions={gedungOptions}
          lantaiOptions={lantaiOptions}
          kategoriOptions={kategoriOptions}
        />
      </div>
    </div>
  );
};

export default TasksInsidental;