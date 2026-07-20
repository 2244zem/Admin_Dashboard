import { useEffect, useRef, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { STATUS_COLOR } from "../types/laporan";
import type { Laporan } from "../types/laporan";
import ReportDetailModal from "../components/ReportDetailModal";
import useLaporan from "../hooks/useLaporan";
import { useToast } from "../hooks/useToast";
import { StatCardsSkeleton, TableSkeleton, Skeleton } from "../components/ui/Skeleton";
import ErrorState from "../components/ui/ErrorState";
import Avatar from "../components/ui/Avatar";

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

// Mapping UI label -> Backend API value
const STATUS_MAP: Record<string, string | undefined> = {
  "Semua Status": undefined,
  "Menunggu": "BELUM_DIKERJAKAN",
  "Ditugaskan": "PENDING",
  "Selesai": "SELESAI",
  "Ditolak": "DIBATALKAN",
};

const STATUS_OPTIONS = Object.keys(STATUS_MAP);
const LOKASI_OPTIONS = ["Semua Area", "Toilet", "Lobi", "Area Kantor", "Parkir"];
const LEVEL_OPTIONS = ["Semua Level", "URGENT", "STANDARD"];

const ITEMS_PER_PAGE = 4;

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
            className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-20 w-36 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden dark:bg-surface"
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

const Reports = () => {
  const { push } = useToast();
  // --- Filter state ---
  const [filterStatus, setFilterStatus] = useState("Semua Status");
  const [filterLokasi, setFilterLokasi] = useState("Semua Area");
  const [filterLevel, setFilterLevel] = useState("Semua Level");
  const [currentPage, setCurrentPage] = useState(1);

  const apiFilters = useMemo(() => ({
    // Convert UI status label to backend enum (server-side filter)
    status: STATUS_MAP[filterStatus],
    // NOTE: area (lokasi) & level are filtered client-side below because the
    // API only accepts UUID lokasi_id, not the display names used here.
    page: currentPage,
    limit: ITEMS_PER_PAGE,
  }), [filterStatus, currentPage]);

  const { laporanList, meta, isLoading, error, fetchLaporan, getLaporanDetail, deleteLaporan, updateLaporan } = useLaporan(apiFilters);
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkId = searchParams.get("laporan");

  // Deep-link from a notification: ?laporan=<id> opens the detail modal once,
  // then clears the param so it can't re-trigger (and the same notif can
  // re-open later by navigating again).
  useEffect(() => {
    if (!deepLinkId) return;
    let cancelled = false;
    getLaporanDetail({ backendId: deepLinkId } as Laporan)
      .then((det) => { if (!cancelled) setDetailTarget(det); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setSearchParams({}, { replace: true }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkId]);

  // Client-side filter for area (lokasi) since API only accepts UUID
  const filteredByArea = useMemo(() => {
    if (filterLokasi === "Semua Area") return laporanList;
    return laporanList.filter((row) => row.area === filterLokasi);
  }, [laporanList, filterLokasi]);

  // Client-side filter for level/prioritas
  const filteredByLevel = useMemo(() => {
    if (filterLevel === "Semua Level") return filteredByArea;
    return filteredByArea.filter((row) => row.level === filterLevel);
  }, [filteredByArea, filterLevel]);

  // Foto bukti dan deskripsi ditampilkan melalui modal detail laporan.
  const [previewFoto, setPreviewFoto] = useState<{ url: string; desc: string } | null>(null);

  const totalLaporanAktif = useMemo(() => {
    return filteredByLevel.filter(
      (row) => row.status !== "Selesai" && row.status !== "Ditolak"
    ).length;
  }, [filteredByLevel]);

  const lokasiStats = useMemo(() => {
    const counts: Record<string, number> = { Toilet: 0, Lobi: 0, "Area Kantor": 0, Parkir: 0 };
    filteredByLevel.forEach((data) => {
      if (counts[data.area] !== undefined) {
        counts[data.area] += 1;
      }
    });
    return counts;
  }, [filteredByLevel]);

  // --- Modal Detail Laporan ---
  const [detailTarget, setDetailTarget] = useState<Laporan | null>(null);

  const openDetailModal = async (row: Laporan) => {
    setDetailTarget(row);

    try {
      setDetailTarget(await getLaporanDetail(row));
    } catch {
      // Tetap tampilkan data ringkas apabila detail laporan tidak dapat dimuat.
    }
  };
  const closeDetailModal = () => setDetailTarget(null);

  const handleDetailStatusChange = async (newStatus: "Menunggu" | "Ditugaskan" | "Selesai" | "Ditolak") => {
    if (!detailTarget) return;
    try {
      await updateLaporan(detailTarget.backendId || String(detailTarget.id), {
        ...detailTarget,
        status: newStatus,
      });
      // Refresh detail data
      const refreshed = await getLaporanDetail({ ...detailTarget, status: newStatus });
      setDetailTarget(refreshed);
      push("success", "Status laporan diperbarui");
    } catch (err: unknown) {
      push("error", err instanceof Error ? err.message : "Gagal memperbarui status laporan");
    }
  };

  // --- Modal Edit Laporan ---
  const [editTarget, setEditTarget] = useState<Laporan | null>(null);
  const openEditModal = (row: Laporan) => setEditTarget(row);
  const closeEditModal = () => setEditTarget(null);
  const handleSaveEdit = async (_updated: Laporan) => {
    try {
      // Only send fields supported by backend API: status, admin_catatan
      await updateLaporan(_updated.backendId || String(_updated.id), {
        status: _updated.status,
        admin_catatan: _updated.desc,
        assignedTo: _updated.assignedTo,
      });
      closeEditModal();
      push("success", "Laporan diperbarui");
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Gagal memperbarui laporan");
    }
  };

  // --- Modal Konfirmasi Hapus Laporan ---
  const [deleteTarget, setDeleteTarget] = useState<Laporan | null>(null);
  const openDeleteConfirm = (row: Laporan) => setDeleteTarget(row);
  const closeDeleteConfirm = () => setDeleteTarget(null);
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLaporan(deleteTarget.backendId || String(deleteTarget.id));
      closeDeleteConfirm();
      push("success", "Laporan berhasil dihapus");
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Gagal menghapus laporan");
    }
  };

  // Pagination (server-side via meta). Area/level filters above only narrow the
  // rows already fetched for the current page.
  const totalPages = Math.max(1, meta.total_pages || 1);
  const totalItems = meta.total_items || 0;
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  return (
    <div className="flex h-screen bg-white font-sans text-gray-800 dark:bg-base dark:text-white">
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto bg-white p-8 dark:bg-base">
          {isLoading && filteredByLevel.length === 0 ? (
            <div>
              <div className="flex flex-wrap md:flex-nowrap gap-4 mb-6">
                <Skeleton className="h-24 flex-1 rounded-xl" />
                <Skeleton className="h-24 flex-1 rounded-xl" />
                <Skeleton className="h-24 flex-1 rounded-xl" />
              </div>
              <StatCardsSkeleton count={4} />
              <TableSkeleton columns={6} rows={5} withAvatar />
            </div>
          ) : error ? (
            <ErrorState message={error} onRetry={fetchLaporan} />
          ) : (
            <>
          {/* Filter cards */}
          <div className="flex flex-wrap md:flex-nowrap gap-4 items-stretch">
            <motion.div
              whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="border border-gray-200 rounded-xl p-4 transition-shadow flex-1"
            >
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Filter Status</label>
              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium rounded-2xl px-4 py-3 outline-none appearance-none cursor-pointer border-2 border-gray-200 transition-all duration-200 shadow-sm hover:shadow-md dark:bg-surface dark:text-white"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} className="bg-black text-white">{s}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-[#0F4C81]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="border border-gray-200 rounded-xl p-4 transition-shadow flex-1"
            >
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Filter Lokasi</label>
              <div className="relative">
                <select
                  value={filterLokasi}
                  onChange={(e) => {
                    setFilterLokasi(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium rounded-2xl px-4 py-3 outline-none appearance-none cursor-pointer border-2 border-gray-200 transition-all duration-200 shadow-sm hover:shadow-md dark:bg-surface dark:text-white"
                >
                  {LOKASI_OPTIONS.map((l) => (
                    <option key={l} className="bg-black text-white">{l}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-[#0F4C81]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="border border-gray-200 rounded-xl p-4 transition-shadow flex-1"
            >
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Level</label>
              <div className="relative">
                <select
                  value={filterLevel}
                  onChange={(e) => {
                    setFilterLevel(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium rounded-2xl px-4 py-3 outline-none appearance-none cursor-pointer border-2 border-gray-200 transition-all duration-200 shadow-sm hover:shadow-md dark:bg-surface dark:text-white"
                >
                  {LEVEL_OPTIONS.map((l) => (
                    <option key={l} className="bg-black text-white">{l}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-[#0F4C81]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="border border-gray-200 rounded-xl p-4 flex items-center justify-between transition-shadow flex-1"
            >
              <div>
                <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Laporan Aktif</span>
                <span className="text-base font-bold text-[#0F4C81]">{totalLaporanAktif} Laporan</span>
              </div>
              <motion.div
                whileHover={{ scale: 1.1, rotate: 3 }}
                transition={{ type: "spring", stiffness: 400, damping: 12 }}
                className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-[#0F4C81]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </motion.div>
            </motion.div>
          </div>

          {/* Lokasi Terpopuler */}
          <motion.div
            whileHover={{ y: -2, boxShadow: "0 6px 16px rgba(0,0,0,0.06)" }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="col-span-2 border border-gray-200 rounded-xl p-6 transition-shadow mt-4"
          >
            <h2 className="text-sm font-bold text-gray-700 mb-4">Lokasi Terpopuler</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ type: "spring", stiffness: 300, damping: 15 }} className="bg-gray-50 rounded-lg py-6 flex flex-col items-center justify-center gap-1 cursor-default dark:bg-surface">
                <span className="text-[11px] font-bold text-gray-500 uppercase">Toilet</span>
                <span className="text-2xl font-bold text-red-500">{lokasiStats.Toilet}</span>
              </motion.div>
              <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ type: "spring", stiffness: 300, damping: 15 }} className="bg-gray-50 rounded-lg py-6 flex flex-col items-center justify-center gap-1 cursor-default dark:bg-surface">
                <span className="text-[11px] font-bold text-gray-500 uppercase">Lobi</span>
                <span className="text-2xl font-bold text-orange-400">{lokasiStats.Lobi}</span>
              </motion.div>
              <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ type: "spring", stiffness: 300, damping: 15 }} className="bg-gray-50 rounded-lg py-6 flex flex-col items-center justify-center gap-1 cursor-default dark:bg-surface">
                <span className="text-[11px] font-bold text-gray-500 uppercase">Area Kantor</span>
                <span className="text-2xl font-bold text-blue-500">{lokasiStats["Area Kantor"]}</span>
              </motion.div>
              <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ type: "spring", stiffness: 300, damping: 15 }} className="bg-gray-50 rounded-lg py-6 flex flex-col items-center justify-center gap-1 cursor-default dark:bg-surface">
                <span className="text-[11px] font-bold text-gray-500 uppercase">Parkir</span>
                <span className="text-2xl font-bold text-[#0F4C81]">{lokasiStats.Parkir}</span>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.25, delay: 0.05 }}
            className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden mb-6 mt-6 animate-fadeIn dark:bg-surface"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-center text-sm">
                <thead className="text-[11px] font-bold text-gray-500 uppercase border-b border-gray-200 bg-gray-100/50 dark:bg-elevated">
                  <tr>
                    <th className="px-6 py-4 w-32 text-center">ID LAPORAN</th>
                    <th className="px-6 py-4 text-center">NAMA KARYAWAN</th>
                    <th className="px-6 py-4 text-center">LOKASI</th>
                    <th className="px-6 py-4 w-28 text-center">LEVEL</th>
                    <th className="px-6 py-4 w-32 text-center">STATUS</th>
                    <th className="px-6 py-4 w-36 text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white text-gray-700 dark:bg-surface">
                  {filteredByLevel.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                        Belum ada laporan yang sesuai dengan filter saat ini.
                      </td>
                    </tr>
                  ) : (
                    filteredByLevel.map((data) => (
                      <motion.tr
                        key={data.backendId || data.id}
                        whileHover={{ backgroundColor: "rgba(15, 76, 129, 0.03)" }}
                        className="transition-colors"
                      >
                        {/* ID LAPORAN */}
                        <td className="px-6 py-3 text-center">
                          <div className="font-semibold text-gray-800">
                            {data.id_laporan || `LPR-${String(data.id).padStart(3, '0')}`}
                          </div>
                        </td>

                        {/* NAMA KARYAWAN */}
                        <td className="px-6 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Avatar name={data.name} src={data.fotoProfil} size="md" />
                            <div>
                              <div className="font-medium text-gray-800">{data.name}</div>
                            </div>
                          </div>
                        </td>

                        {/* LOKASI */}
                        <td className="px-6 py-3 text-center">
                          <div>
                            <div className="font-medium text-gray-700">{data.loc}</div>
                          </div>
                        </td>


                        {/* LEVEL */}
                        <td className="px-6 py-3 text-center">
                          {data.level === "URGENT" ? (
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 rounded">
                              <div className="h-2 w-2 bg-red-600 rounded-full"></div>
                              <span className="text-xs font-bold text-red-600">URGENT</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 rounded">
                              <div className="h-2 w-2 bg-orange-600 rounded-full"></div>
                              <span className="text-xs font-bold text-orange-600">STANDARD</span>
                            </div>
                          )}
                        </td>

                        {/* STATUS */}
                        <td className="px-6 py-3 text-center">
                          <div className={`inline-block px-2 py-1 rounded text-xs font-bold ${STATUS_COLOR[data.status]}`}>
                            {data.status}
                          </div>
                        </td>

                        {/* AKSI */}
                        <td className="px-6 py-3 text-right">
                          <RowActionMenu
                            onDetail={() => openDetailModal(data)}
                            onEdit={() => openEditModal(data)}
                            onDelete={() => openDeleteConfirm(data)}
                          />
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 text-sm text-gray-500 dark:bg-surface">
              <span>
                {totalItems === 0
                  ? "Tidak ada laporan"
                  : `Menampilkan ${startIndex} sampai ${endIndex} dari ${totalItems} laporan`}
              </span>
              <div className="flex items-center gap-1">
                <motion.button
                  whileHover={{ scale: currentPage === 1 ? 1 : 1.1 }}
                  whileTap={{ scale: currentPage === 1 ? 1 : 0.9 }}
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-2 py-1 cursor-pointer ${currentPage === 1 ? "text-gray-300 cursor-not-allowed" : "hover:text-gray-800"}`}
                >
                  {"\u003C"}
                </motion.button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <motion.button
                    key={page}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => goToPage(page)}
                    className={`px-3 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                      page === currentPage
                        ? "bg-[#0F4C81] text-white"
                        : "hover:bg-gray-200 text-gray-600"
                    }`}
                  >
                    {page}
                  </motion.button>
                ))}

                <motion.button
                  whileHover={{ scale: currentPage === totalPages ? 1 : 1.1 }}
                  whileTap={{ scale: currentPage === totalPages ? 1 : 0.9 }}
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-2 py-1 cursor-pointer ${currentPage === totalPages ? "text-gray-300 cursor-not-allowed" : "hover:text-gray-800"}`}
                >
                  {"\u003E"}
                </motion.button>
              </div>
            </div>
          </motion.div>
            </>
          )}
        </main>
      </div>

      {/* LIGHTBOX PREVIEW FOTO BUKTI */}
      <AnimatePresence>
        {previewFoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewFoto(null)}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl overflow-hidden shadow-xl max-w-md w-full dark:bg-surface"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-800">Foto Bukti Laporan</h3>
                <button
                  onClick={() => setPreviewFoto(null)}
                  className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer dark:bg-elevated"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <img src={previewFoto.url} alt={previewFoto.desc} className="w-full h-64 object-cover" />
              <div className="px-5 py-4 text-sm text-gray-600">{previewFoto.desc}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DETAIL LAPORAN (read-only) */}
      <ReportDetailModal
        laporan={detailTarget}
        onClose={closeDetailModal}
        onStatusChange={handleDetailStatusChange}
      />

      {/* MODAL EDIT LAPORAN */}
      <EditLaporanModal key={editTarget?.backendId ?? editTarget?.id} laporan={editTarget} onClose={closeEditModal} onSave={handleSaveEdit} />

      {/* MODAL KONFIRMASI HAPUS LAPORAN */}
      <DeleteLaporanModal laporan={deleteTarget} onClose={closeDeleteConfirm} onConfirm={handleConfirmDelete} />

    </div>
  );
};

// ---------- Modal Edit Laporan (lokal, hanya dipakai di halaman ini) ----------
const EDIT_LOKASI_OPTIONS = ["Toilet Lantai 2", "Lobi Utama", "Lantai 4 - Ruang Rapat 4C", "Parkir Barat B2"];
const EDIT_KATEGORI_OPTIONS = ["Kebersihan Fasilitas", "Kerusakan Fasilitas", "Ketersediaan Barang", "Lainnya"];
const EDIT_OB_OPTIONS = ["Rahman", "Slamet Rahardjo", "Samsul Bahri", "Ujang Komar", "Bambang S.", "Iwan Setiawan"];
const EDIT_STATUS_OPTIONS = ["Menunggu", "Ditugaskan", "Selesai", "Ditolak"];

interface EditLaporanModalProps {
  laporan: Laporan | null;
  onClose: () => void;
  onSave: (updated: Laporan) => void;
}

const EditLaporanModal = ({ laporan, onClose, onSave }: EditLaporanModalProps) => {
  // Form diinisialisasi sekali dari laporan. Parent memasang `key` per-laporan
  // sehingga komponen remount (dan form ter-reset) saat laporan target berubah.
  const [form, setForm] = useState<{
    name: string;
    loc: string;
    area: string;
    status: string;
    assignedTo: string;
    desc: string;
    catatanOb: string;
  } | null>(() =>
    laporan
      ? {
          name: laporan.name,
          loc: laporan.loc,
          area: laporan.area ?? EDIT_KATEGORI_OPTIONS[0],
          status: laporan.status,
          assignedTo: laporan.assignedTo ?? "",
          desc: laporan.desc,
          catatanOb: "",
        }
      : null
  );

  if (!laporan || !form) return null;

  const idTransaksi = laporan.id_laporan ?? "-";
  const waktuSelesai = laporan.createdAt;

  const handleSubmit = () => {
    onSave({
      ...laporan,
      name: form.name,
      loc: form.loc,
      area: form.area as Laporan["area"],
      status: form.status as Laporan["status"],
      desc: form.desc,
      assignedTo: form.assignedTo,
    });
  };

  return (
    <AnimatePresence>
      {laporan && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden bg-white rounded-2xl shadow-xl dark:bg-surface"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#0F4C81]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <h2 className="text-base font-bold text-gray-900">
                  Edit Laporan #{laporan.id}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer dark:bg-elevated"
                aria-label="Tutup"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Status (editable) */}
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:bg-surface">
                <div className="flex items-center gap-3">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</p>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="text-sm font-semibold rounded-lg px-3 py-1 border border-gray-200 outline-none focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100 cursor-pointer bg-white dark:bg-surface"
                  >
                    {EDIT_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <span className="text-xs text-gray-500">ID: {idTransaksi}</span>
              </div>

              {/* Nama Karyawan / Lokasi */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Nama Karyawan
                  </p>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full text-sm font-medium text-gray-800 rounded-lg px-3 py-2 border border-gray-200 outline-none focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Lokasi
                  </p>
                  <select
                    value={form.loc}
                    onChange={(e) => setForm({ ...form, loc: e.target.value })}
                    className="w-full text-sm font-medium text-blue-600 rounded-lg px-3 py-2 border border-gray-200 outline-none focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100 cursor-pointer"
                  >
                    {[form.loc, ...EDIT_LOKASI_OPTIONS.filter((l) => l !== form.loc)].map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Kategori / OB yang Mengerjakan */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Area
                  </p>
                  <select
                    value={form.area}
                    onChange={(e) => setForm({ ...form, area: e.target.value })}
                    className="w-full text-sm font-medium text-gray-800 rounded-lg px-3 py-2 border border-gray-200 outline-none focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100 cursor-pointer"
                  >
                    {[form.area, ...EDIT_KATEGORI_OPTIONS.filter((k) => k !== form.area)].map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    OB yang Mengerjakan
                  </p>
                  <select
                    value={form.assignedTo}
                    onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                    className="w-full text-sm font-medium text-gray-800 rounded-lg px-3 py-2 border border-gray-200 outline-none focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100 cursor-pointer"
                  >
                    <option value="">Belum ditugaskan</option>
                    {[form.assignedTo, ...EDIT_OB_OPTIONS.filter((o) => o !== form.assignedTo)]
                      .filter(Boolean)
                      .map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Waktu Laporan / Waktu Selesai (read-only) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Waktu Laporan
                  </p>
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {new Date(laporan.createdAt).toLocaleString("id-ID")}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Waktu Selesai
                  </p>
                  {waktuSelesai ? (
                    <div className="flex items-center gap-1.5 text-sm font-medium text-green-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {new Date(waktuSelesai).toLocaleString("id-ID")}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </div>
              </div>

              {/* Deskripsi Laporan (editable) */}
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Deskripsi Laporan
                </p>
                <textarea
                  value={form.desc}
                  onChange={(e) => setForm({ ...form, desc: e.target.value })}
                  rows={3}
                  className="w-full bg-blue-50/40 border border-blue-100 rounded-lg px-4 py-3 text-sm text-gray-700 leading-relaxed outline-none focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100 resize-none"
                />
              </div>

              {/* Bukti Foto */}
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Bukti Foto {waktuSelesai ? "(Hasil Pengerjaan)" : "(Laporan Awal)"}
                </p>
                <div className="rounded-xl overflow-hidden border border-gray-100">
                  <img
                    src={laporan.foto}
                    alt={laporan.desc}
                    className="w-full h-56 object-cover"
                  />
                </div>
                {form.assignedTo && waktuSelesai && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    Diupload oleh {form.assignedTo} pada {new Date(waktuSelesai).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                  </p>
                )}
              </div>

              {/* Catatan untuk OB */}
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Buat catatan untuk OB
                </p>
                <textarea
                  value={form.catatanOb}
                  onChange={(e) => setForm({ ...form, catatanOb: e.target.value })}
                  rows={3}
                  placeholder="Tulis catatan atau instruksi tambahan..."
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 leading-relaxed outline-none focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100 resize-none dark:bg-surface"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100 dark:bg-surface">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-100 transition-colors cursor-pointer dark:bg-elevated"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#0F4C81] hover:bg-[#0c3c68] transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Simpan Perubahan
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ---------- Modal Konfirmasi Hapus Laporan (lokal, hanya dipakai di halaman ini) ----------
interface DeleteLaporanModalProps {
  laporan: Laporan | null;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteLaporanModal = ({ laporan, onClose, onConfirm }: DeleteLaporanModalProps) => {
  return (
    <AnimatePresence>
      {laporan && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
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
                {laporan.id_laporan || `LPR-${String(laporan.id).padStart(3, "0")}`}
              </span>
              ? Data yang sudah dihapus tidak dapat dikembalikan.
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={onConfirm}
                className="w-full py-2.5 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors cursor-pointer"
              >
                Hapus
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-lg bg-white text-slate-700 font-medium text-sm border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer dark:bg-surface"
              >
                Batal
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Reports;