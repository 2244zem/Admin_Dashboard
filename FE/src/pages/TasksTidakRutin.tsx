import { useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import useLokasi from "../hooks/useLokasi";
import useKategori from "../hooks/useKategori";
import { useToast } from "../hooks/useToast";
import { getTugasCombination } from "../api/checklist";
import { createTugas, updateTugas, deleteTugas, getTugasById, approveTugas } from "../api/tugas";
import TaskFormModal from "../components/tasks/TaskFormModal";
import type { Option, TaskFormValues } from "../components/tasks/TaskFormModal";
import TaskDetailModal from "../components/tasks/TaskDetailModal";
import type { DetailRow } from "../components/tasks/TaskDetailModal";
import { getErrorMessage, formatDateTime } from "../lib/utils";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import { TableSkeleton } from "../components/ui/Skeleton";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import RowActionMenu from "../components/ui/RowActionMenu";

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

// Sama seperti di TasksRutin.tsx — palet warna avatar stabil berdasarkan nama
const AVATAR_COLORS = [
  "bg-purple-100 text-purple-600",
  "bg-blue-100 text-blue-600",
  "bg-orange-100 text-orange-600",
  "bg-emerald-100 text-emerald-600",
  "bg-pink-100 text-pink-600",
];
function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

interface Row {
  id: string;
  namaTugas: string;
  kategori: string;
  lantai: string;
  status: string;
  approved: boolean;
  catatan: string;
  kategori_id: string;
  gedung_id: string;
  lantai_id: string;
  ob_id: string | null;
  obNama: string | null;
  createdAt: string;
  pelapor: string;
}

const UI_STATUS_STYLE: Record<string, { pill: string; label: string }> = {
  BELUM_DIKERJAKAN: { pill: "bg-gray-100 text-gray-500", label: "Menunggu" },
  SEDANG_DIKERJAKAN: { pill: "bg-amber-100 text-amber-600", label: "Dalam Proses" },
  MENUNGGU_APPROVAL: { pill: "bg-blue-100 text-blue-600", label: "Menunggu Persetujuan Admin" },
  SELESAI: { pill: "bg-green-100 text-green-600", label: "Selesai" },
};
const getStatusStyle = (s?: string) => UI_STATUS_STYLE[s ?? "BELUM_DIKERJAKAN"] ?? UI_STATUS_STYLE.BELUM_DIKERJAKAN;

const PAGE_SIZE = 4;

const TasksTidakRutin = () => {
  const { push } = useToast();
  const location = useLocation();
  const { gedungList } = useLokasi();
  const { kategoriList } = useKategori();

  const [gedungFilter, setGedungFilter] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("Hari Ini");
  const [detailRow, setDetailRow] = useState<DetailRow | null>(null);
  const [page, setPage] = useState(1);

  const { data: comboData, isLoading, error, refetch } = useQuery({
    queryKey: ["tugas-tidakrutin-kombinasi"],
    queryFn: () => getTugasCombination(),
    refetchInterval: 30_000,
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

  const rawTugasItems = useMemo(() => (comboData?.tugas?.items ?? []), [comboData]);

  const rows: Row[] = useMemo(
    () =>
      rawTugasItems.map((t: Record<string, unknown>) => {
        const ob = t.ob as { id?: unknown; nama_lengkap?: unknown } | undefined;
        const obId = String(t.ob_id ?? ob?.id ?? "");
        return {
          id: String(t.id ?? ""),
          namaTugas: String(t.nama_tugas ?? "-"),
          kategori: kategoriNameById.get(String(t.kategori_id ?? "")) ?? "-",
          lantai: t.lantai_id ? (lantaiNameById.get(String(t.lantai_id)) ?? "-") : "-",
          status: String(t.status ?? "BELUM_DIKERJAKAN"),
          approved: t.approved === true,
          catatan: t.catatan != null ? String(t.catatan) : "",
          kategori_id: String(t.kategori_id ?? ""),
          gedung_id: String(t.gedung_id ?? ""),
          lantai_id: String(t.lantai_id ?? ""),
          ob_id: obId || null,
          obNama: String(ob?.nama_lengkap ?? t.nama_ob ?? "") || null,
          createdAt: String(t.created_at ?? ""),
          pelapor: t.pelapor != null ? String(t.pelapor) : "Admin",
        };
      }),
    [rawTugasItems, kategoriNameById, lantaiNameById]
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

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = useMemo(
    () => filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredRows, page]
  );

  const laporanBaruCount = filteredRows.filter((r) => r.status === "BELUM_DIKERJAKAN").length;
  const sedangDikerjakanCount = filteredRows.filter((r) => r.status === "SEDANG_DIKERJAKAN").length;
  const selesaiHariIniCount = filteredRows.filter(
    (r) => r.status === "SELESAI" && new Date(r.createdAt).toDateString() === new Date().toDateString()
  ).length;

  const prefill = (location.state as { prefill?: { nama_tugas: string; kategori_id: string; lantai_id: string } } | null)?.prefill;
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(Boolean(prefill));
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalInitial, setModalInitial] = useState<Record<string, unknown> | null>(
    prefill
      ? { kategori_id: prefill.kategori_id, namaTugas: prefill.nama_tugas, lantai_id: prefill.lantai_id, catatan: "" }
      : null
  );

  const openDetail = async (row: Row) => {
    const base: DetailRow = {
      id: row.id, namaTugas: row.namaTugas, kategori: row.kategori, lantai: row.lantai,
      status: row.status, catatan: row.catatan, ob_id: row.ob_id, obNama: row.obNama,
      fotoSebelum: null, fotoSesudah: null, waktuMulai: null, waktuSelesai: null, catatanOb: null,
      isNonRutin: true,
    };
    setDetailRow(base);
    try {
      const raw = await getTugasById(row.id);
      const ob = raw.ob as { nama_lengkap?: string; id?: string } | undefined;
      setDetailRow((prev) => prev ? {
        ...prev,
        obNama: String(ob?.nama_lengkap ?? raw.nama_ob ?? prev.obNama ?? ""),
        ob_id: String(raw.ob_id ?? ob?.id ?? "") || null,
      } : prev);
    } catch {}
  };

  const handleApprove = async (id: string, _catatanAdmin: string) => {
    setDetailRow(null);
    try {
      await approveTugas(id);
      push("success", "Tugas Disetujui");
      queryClient.invalidateQueries({ queryKey: ["tugas-tidakrutin-kombinasi"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    } catch (e) {
      push("error", getErrorMessage(e) || "Gagal menyetujui tugas");
    }
  };

  const openCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setModalInitial(null);
    setIsModalOpen(true);
  };

  const openEdit = (row: Row) => {
    setModalMode("edit");
    setEditingId(row.id);
    setModalInitial({
      kategori_id: row.kategori_id,
      namaTugas: row.namaTugas,
      gedung_id: row.gedung_id,
      lantai_id: row.lantai_id,
      catatan: row.catatan,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (form: TaskFormValues) => {
    if (!form.kategori_id || !form.nama_tugas || !form.lantai_id) {
      push("error", "Lengkapi Kategori, Nama Tugas, dan Lantai.");
      return;
    }
    const payload = {
      kategori_id: form.kategori_id,
      nama_tugas: form.nama_tugas,
      lantai_id: form.lantai_id,
      tanggal_selesai: form.tanggal_selesai, // NEW — deadline, ganti dari frekuensi_kerja
      jam_selesai: form.jam_selesai, // NEW
      catatan: form.catatan || "",
    };
    try {
      if (modalMode === "edit" && editingId) await updateTugas(editingId, payload);
      else await createTugas(payload);
      push("success", "Tugas berhasil disimpan");
      setIsModalOpen(false);
      refetch();
    } catch (e) {
      push("error", getErrorMessage(e) || "Gagal menyimpan tugas");
    }
  };

  const [rowToDelete, setRowToDelete] = useState<Row | null>(null);
  const handleConfirmDelete = async () => {
    if (!rowToDelete) return;
    try {
      await deleteTugas(rowToDelete.id);
      push("success", "Tugas berhasil dihapus");
      refetch();
    } catch (e) {
      push("error", getErrorMessage(e) || "Gagal menghapus tugas");
    }
    setRowToDelete(null);
  };

  return (
    <div className="flex h-screen bg-white font-sans dark:bg-base">
      <style>{`
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          15% { transform: scale(1.3); }
          30% { transform: scale(1); }
          45% { transform: scale(1.25); }
          60% { transform: scale(1); }
        }
        .animate-heartbeat { animation: heartbeat 1.6s ease-in-out infinite; }
      `}</style>

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto bg-white p-6 dark:bg-base">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-[#0F4C81]">Tugas Tidak Rutin</h1>
          </div>

          {/* Tabs + filter */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex bg-gray-100 rounded-full p-1 dark:bg-elevated">
              {(["Hari Ini", "Mingguan", "Bulanan", "Tahunan"] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setPage(1);
                  }}
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
                  onChange={(e) => {
                    setGedungFilter(e.target.value);
                    setPage(1);
                  }}
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
                Tambah Tugas
              </button>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-400 uppercase">Laporan Baru</span>
                <div className="h-9 w-9 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                </div>
              </div>
              <span className="text-2xl font-bold text-gray-900">{String(laporanBaruCount).padStart(2, "0")}</span>
              <p className="text-xs font-medium text-red-500 mt-1 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Menunggu
              </p>
            </div>

            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-400 uppercase">Sedang Dikerjakan</span>
                <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2.13a4 4 0 10-4-4 4 4 0 004 4z" />
                  </svg>
                </div>
              </div>
              <span className="text-2xl font-bold text-gray-900">{String(sedangDikerjakanCount).padStart(2, "0")}</span>
              <p className="text-xs font-medium text-blue-500 mt-1 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Proses
              </p>
            </div>

            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-400 uppercase">Selesai Hari Ini</span>
                <div className="h-9 w-9 rounded-full bg-green-50 text-green-600 flex items-center justify-center animate-heartbeat">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <span className="text-2xl font-bold text-gray-900">{String(selesaiHariIniCount).padStart(2, "0")}</span>
              <p className="text-xs font-medium text-green-600 mt-1 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Terverifikasi admin
              </p>
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
                <TableSkeleton columns={5} rows={3} />
              </div>
            ) : error ? (
              <ErrorState message={error instanceof Error ? error.message : "Terjadi kesalahan"} onRetry={refetch} />
            ) : filteredRows.length === 0 ? (
              <EmptyState
                title="Belum Ada Tugas"
                description="Tambahkan tugas tidak rutin baru melalui tombol Tambah Tugas."
                actionText="Tambah Tugas"
                onAction={openCreate}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="text-[11px] font-bold text-gray-400 uppercase border-b border-gray-100 bg-gray-50/50 dark:bg-surface">
                    <tr>
                      <th className="px-2 py-2">ID &amp; Waktu</th>
                      <th className="px-2 py-2">Pelapor</th>
                      <th className="px-2 py-2">Detail Pekerjaan</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2">Pekerja</th>
                      <th className="px-2 py-2 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pagedRows.map((row) => {
                      const pillStatus = row.status === "SELESAI" && !row.approved ? "MENUNGGU_APPROVAL" : row.status;
                      const st = getStatusStyle(pillStatus);
                      return (
                        <tr key={row.id} className="hover:bg-gray-50/50 transition-colors dark:bg-surface">
                          <td className="px-2 py-2 whitespace-nowrap">
                            <p className="font-semibold text-[#0F4C81] text-xs">#{row.id.slice(0, 8).toUpperCase()}</p>
                            <p className="text-[10px] text-gray-400">{formatDateTime(row.createdAt)}</p>
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap">
                            <span className="text-xs text-gray-700">{row.pelapor}</span>
                          </td>
                          <td className="px-2 py-2">
                            <p className="font-semibold text-gray-800 text-xs">{row.namaTugas}</p>
                            <p className="text-[10px] text-gray-400 flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                              </svg>
                              {row.kategori}, {row.lantai}
                            </p>
                          </td>
                          <td className="px-2 py-2">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.pill}`}>
                              {st.label}
                            </span>
                          </td>
                          <td className="px-2 py-2">
                            {row.ob_id && row.obNama ? (
                              <div className="flex items-center gap-1">
                                <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${avatarColor(row.obNama)}`}>
                                  {initials(row.obNama)}
                                </span>
                                <span className="text-xs text-gray-700">{row.obNama}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic">Menunggu OB....</span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-right">
                            <RowActionMenu
                              onDetail={() => openDetail(row)}
                              onEdit={() => openEdit(row)}
                              onDelete={() => setRowToDelete(row)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 text-xs text-gray-400">
              <span>
                Menampilkan {filteredRows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} sampai{" "}
                {Math.min(page * PAGE_SIZE, filteredRows.length)} dari {filteredRows.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 disabled:opacity-40 cursor-pointer dark:bg-surface"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`h-7 w-7 flex items-center justify-center rounded-md font-semibold cursor-pointer ${
                      p === page ? "bg-[#0F4C81] text-white" : "border border-gray-200 text-gray-500 dark:bg-surface"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 disabled:opacity-40 cursor-pointer dark:bg-surface"
                >
                  ›
                </button>
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
          variant="non-rutin"
        />

        <TaskDetailModal row={detailRow} onClose={() => setDetailRow(null)} onApprove={handleApprove} />

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

export default TasksTidakRutin;