import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { STATUS_COLOR } from "../types/laporan";
import type { Laporan } from "../types/laporan";
// import { formatWaktu } from "../lib/utils";
import ReportDetailModal from "../components/ReportDetailModal";
import useLaporan from "../hooks/useLaporan";
import useUsers from "../hooks/useUsers";
import { useToast } from "../components/Toast";
import { StatCardsSkeleton, TableSkeleton, Skeleton } from "../components/ui/Skeleton";
import ErrorState from "../components/ui/ErrorState";
// import EmptyState from "../components/ui/EmptyState";

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

const Reports = () => {
  // --- Filter state ---
  const [filterStatus, setFilterStatus] = useState("Semua Status");
  const [filterLokasi, setFilterLokasi] = useState("Semua Area");
  const [filterLevel, setFilterLevel] = useState("Semua Level");
  const [currentPage, setCurrentPage] = useState(1);

  const apiFilters = useMemo(() => ({
    // Convert UI status label to backend enum
    status: STATUS_MAP[filterStatus],
    // API only accepts lokasi_id (UUID) for location filter, not area name
    // We'll do client-side filtering for area display names
    level: filterLevel === "Semua Level" ? undefined : filterLevel,
    page: currentPage,
    limit: ITEMS_PER_PAGE,
  }), [filterStatus, filterLokasi, filterLevel, currentPage]);

  const { push } = useToast();
  const { fetchOB } = useUsers();
  const [obList, setObList] = useState<Array<{ id: string; nama: string }>>([]);

  useEffect(() => {
    fetchOB().then((list) => {
      setObList(list || []);
    });
  }, [fetchOB]);

  const { laporanList, isLoading, error, fetchLaporan, getLaporanDetail, deleteLaporan, updateLaporan } = useLaporan(apiFilters);

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
  const [assignTarget, setAssignTarget] = useState<Laporan | null>(null);
  const [assignForm, setAssignForm] = useState({
    kategori_id: "",
    ob_id: "",
    lokasi_id: "",
    lantai_id: "",
    waktu: "",
    catatan: "",
  });
  const kategoriOptions: Array<{ id: string; nama: string }> = [];
  const gedungOptions: Array<{ id: string; nama: string }> = [];
  const lantaiOptions: Array<{ id: string; nama: string }> = [];
  const closeAssignModal = () => setAssignTarget(null);
  const handleAssignTask = () => undefined;

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
      const isPendingStatus = newStatus === "Ditugaskan";
      if (isPendingStatus && !detailTarget.ob_id) {
        push("error", "Status 'Ditugaskan' memerlukan OB yang ditugaskan. Harap gunakan menu Edit untuk menetapkan OB.");
        return;
      }
      
      const payload: any = {
        status: newStatus,
        admin_catatan: detailTarget.desc,
      };
      if (detailTarget.ob_id) {
        payload.ob_id = detailTarget.ob_id;
      }

      await updateLaporan(detailTarget.backendId || String(detailTarget.id), payload);
      push("success", "Status laporan berhasil diubah");
      
      // Refresh detail data
      const refreshed = await getLaporanDetail({ ...detailTarget, status: newStatus });
      setDetailTarget(refreshed);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Gagal mengubah status laporan");
    }
  };

  // --- Modal Edit Laporan ---
  const [editTarget, setEditTarget] = useState<Laporan | null>(null);
  const openEditModal = (row: Laporan) => setEditTarget(row);
  const closeEditModal = () => setEditTarget(null);
  const handleSaveEdit = async (_updated: Laporan) => {
    try {
      const payload: any = {
        status: _updated.status,
        admin_catatan: _updated.desc,
      };

      if (_updated.ob_id !== undefined) {
        payload.ob_id = _updated.ob_id || null;
      }

      if (_updated.status === "Ditugaskan" && !payload.ob_id) {
        push("error", "Gagal menyimpan: Mengubah status menjadi 'Ditugaskan' memerlukan OB yang ditugaskan.");
        return;
      }

      await updateLaporan(_updated.backendId || String(_updated.id), payload);
      push("success", "Laporan berhasil diperbarui");
      closeEditModal();
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
    } catch {
      // Error handled by hook
    }
  };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredByLevel.length / ITEMS_PER_PAGE));
  const startIndex = filteredByLevel.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, filteredByLevel.length);

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  return (
    <div className="flex h-screen bg-white font-sans text-gray-800">
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto bg-white p-8">
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
                  className="w-full bg-gray-50 hover:bg-white text-gray-700 text-sm font-medium rounded-2xl px-4 py-3 outline-none appearance-none cursor-pointer border-2 border-gray-200 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s}>{s}</option>
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
                  className="w-full bg-gray-50 hover:bg-white text-gray-700 text-sm font-medium rounded-2xl px-4 py-3 outline-none appearance-none cursor-pointer border-2 border-gray-200 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  {LOKASI_OPTIONS.map((l) => (
                    <option key={l}>{l}</option>
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
                  className="w-full bg-gray-50 hover:bg-white text-gray-700 text-sm font-medium rounded-2xl px-4 py-3 outline-none appearance-none cursor-pointer border-2 border-gray-200 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  {LEVEL_OPTIONS.map((l) => (
                    <option key={l}>{l}</option>
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
              <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ type: "spring", stiffness: 300, damping: 15 }} className="bg-gray-50 rounded-lg py-6 flex flex-col items-center justify-center gap-1 cursor-default">
                <span className="text-[11px] font-bold text-gray-500 uppercase">Toilet</span>
                <span className="text-2xl font-bold text-red-500">{lokasiStats.Toilet}</span>
              </motion.div>
              <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ type: "spring", stiffness: 300, damping: 15 }} className="bg-gray-50 rounded-lg py-6 flex flex-col items-center justify-center gap-1 cursor-default">
                <span className="text-[11px] font-bold text-gray-500 uppercase">Lobi</span>
                <span className="text-2xl font-bold text-orange-400">{lokasiStats.Lobi}</span>
              </motion.div>
              <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ type: "spring", stiffness: 300, damping: 15 }} className="bg-gray-50 rounded-lg py-6 flex flex-col items-center justify-center gap-1 cursor-default">
                <span className="text-[11px] font-bold text-gray-500 uppercase">Area Kantor</span>
                <span className="text-2xl font-bold text-blue-500">{lokasiStats["Area Kantor"]}</span>
              </motion.div>
              <motion.div whileHover={{ y: -4, scale: 1.02 }} transition={{ type: "spring", stiffness: 300, damping: 15 }} className="bg-gray-50 rounded-lg py-6 flex flex-col items-center justify-center gap-1 cursor-default">
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
            className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden mb-6 mt-6 animate-fadeIn"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-center text-sm">
                <thead className="text-[11px] font-bold text-gray-500 uppercase border-b border-gray-200 bg-gray-100/50">
                  <tr>
                    <th className="px-6 py-4 w-32 text-center">ID LAPORAN</th>
                    <th className="px-6 py-4 text-center">NAMA KARYAWAN</th>
                    <th className="px-6 py-4 text-center">LOKASI</th>
                    <th className="px-6 py-4 w-28 text-center">LEVEL</th>
                    <th className="px-6 py-4 w-32 text-center">STATUS</th>
                    <th className="px-6 py-4 w-36 text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white text-gray-700">
                  {filteredByLevel.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                        Belum ada laporan yang sesuai dengan filter saat ini.
                      </td>
                    </tr>
                  ) : (
                    filteredByLevel.map((data) => (
                      <motion.tr
                        key={data.id}
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
                            {data.fotoProfil ? (
                              <img
                                src={data.fotoProfil}
                                alt={data.name}
                                onError={(event) => {
                                  event.currentTarget.style.display = 'none';
                                  event.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                                className="h-8 w-8 rounded-full object-cover shrink-0 border border-gray-200"
                              />
                            ) : null}
                            <div className={`h-8 w-8 rounded-full bg-blue-100 text-[#0F4C81] flex items-center justify-center font-bold text-xs shrink-0 ${data.fotoProfil ? 'hidden' : ''}`}>
                              {data.initial}
                            </div>
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
                        <td className="px-6 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <motion.button
                              onClick={() => openEditModal(data)}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-full text-gray-400 hover:text-[#0F4C81] hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Edit laporan"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6.75l1.5 1.5" />
                              </svg>
                            </motion.button>
                            <motion.button
                              onClick={() => openDeleteConfirm(data)}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Hapus laporan"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </motion.button>
                            <button
                              onClick={() => openDetailModal(data)}
                              className="text-xs font-semibold text-[#0F4C81] border border-[#0F4C81] rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors cursor-pointer whitespace-nowrap"
                            >
                              Lihat Detail
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 text-sm text-gray-500">
              <span>
                {filteredByLevel.length === 0
                  ? "Tidak ada laporan"
                  : `Menampilkan ${startIndex} sampai ${endIndex} dari ${filteredByLevel.length} laporan`}
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
              className="bg-white rounded-2xl overflow-hidden shadow-xl max-w-md w-full"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-800">Foto Bukti Laporan</h3>
                <button
                  onClick={() => setPreviewFoto(null)}
                  className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
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
      <EditLaporanModal laporan={editTarget} onClose={closeEditModal} onSave={handleSaveEdit} obList={obList} />

      {/* MODAL KONFIRMASI HAPUS LAPORAN */}
      <DeleteLaporanModal laporan={deleteTarget} onClose={closeDeleteConfirm} onConfirm={handleConfirmDelete} />

      {/* MODAL TUGASKAN LAPORAN */}
      <AnimatePresence>
        {assignTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeAssignModal}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Tugaskan Laporan</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Laporan #{assignTarget.id} - {assignTarget.name}</p>
                </div>
                <button
                  onClick={closeAssignModal}
                  className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Kategori Tugas</label>
                  <select
                    value={assignForm.kategori_id}
                    onChange={(e) => setAssignForm({ ...assignForm, kategori_id: e.target.value })}
                    className="w-full bg-white text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-300 hover:border-gray-400 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100"
                  >
                    {kategoriOptions.map((k) => (
                      <option key={k.id} value={k.id}>{k.nama}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Pilih OB</label>
                  <select
                    value={assignForm.ob_id}
                    onChange={(e) => setAssignForm({ ...assignForm, ob_id: e.target.value })}
                    className="w-full bg-white text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-300 hover:border-gray-400 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Pilih OB</option>
                    {obList.map((ob) => (
                      <option key={ob.id} value={ob.id}>{ob.nama}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Gedung</label>
                    <select
                      value={assignForm.lokasi_id}
                      onChange={(e) => setAssignForm({ ...assignForm, lokasi_id: e.target.value })}
                      className="w-full bg-white text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-300 hover:border-gray-400 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Pilih Gedung</option>
                      {gedungOptions.map((g) => (
                        <option key={g.id} value={g.id}>{g.nama}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Lantai</label>
                    <select
                      value={assignForm.lantai_id}
                      onChange={(e) => setAssignForm({ ...assignForm, lantai_id: e.target.value })}
                      className="w-full bg-white text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-300 hover:border-gray-400 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Pilih Lantai</option>
                      {lantaiOptions.map((l) => (
                        <option key={l.id} value={l.id}>{l.nama}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Waktu (Opsional)</label>
                  <input
                    type="time"
                    value={assignForm.waktu}
                    onChange={(e) => setAssignForm({ ...assignForm, waktu: e.target.value })}
                    className="w-full bg-white text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-300 hover:border-gray-400 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Catatan</label>
                  <textarea
                    value={assignForm.catatan}
                    onChange={(e) => setAssignForm({ ...assignForm, catatan: e.target.value })}
                    rows={3}
                    className="w-full bg-white text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-300 hover:border-gray-400 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100 resize-none"
                    placeholder="Catatan tambahan..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
                <button
                  onClick={closeAssignModal}
                  className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleAssignTask}
                  className="px-5 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-[#0a355c] text-white font-semibold text-sm transition-colors cursor-pointer"
                >
                  Tugaskan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ---------- Modal Edit Laporan (lokal, hanya dipakai di halaman ini) ----------
const EDIT_LOKASI_OPTIONS = ["Toilet Lantai 2", "Lobi Utama", "Lantai 4 - Ruang Rapat 4C", "Parkir Barat B2"];
const EDIT_KATEGORI_OPTIONS = ["Kebersihan Fasilitas", "Kerusakan Fasilitas", "Ketersediaan Barang", "Lainnya"];
const EDIT_STATUS_OPTIONS = ["Menunggu", "Ditugaskan", "Selesai", "Ditolak"];

interface EditLaporanModalProps {
  laporan: Laporan | null;
  onClose: () => void;
  onSave: (updated: Laporan) => void;
  obList: Array<{ id: string; nama: string }>;
}

const EditLaporanModal = ({ laporan, onClose, onSave, obList }: EditLaporanModalProps) => {
  const [form, setForm] = useState<{
    name: string;
    loc: string;
    area: string;
    status: string;
    ob_id: string;
    assignedTo: string;
    desc: string;
    catatanOb: string;
  } | null>(null);

  // Sinkronkan form setiap kali laporan target berubah (modal dibuka untuk laporan baru).
  const laporanId = laporan?.id;
  useMemo(() => {
    if (laporan) {
      let resolvedObId = laporan.ob_id || "";
      if (!resolvedObId && laporan.assignedTo && obList.length > 0) {
        const found = obList.find(
          (o) => o.nama.trim().toLowerCase() === laporan.assignedTo?.trim().toLowerCase()
        );
        if (found) {
          resolvedObId = found.id;
        }
      }

      setForm({
        name: laporan.name,
        loc: laporan.loc,
        area: laporan.area ?? EDIT_KATEGORI_OPTIONS[0],
        status: laporan.status,
        ob_id: resolvedObId,
        assignedTo: laporan.assignedTo ?? "",
        desc: laporan.desc,
        catatanOb: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [laporanId, obList]);

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
      ob_id: form.ob_id,
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
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden bg-white rounded-2xl shadow-xl"
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
                className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Tutup"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Status (editable) */}
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</p>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="text-sm font-semibold rounded-lg px-3 py-1 border border-gray-200 outline-none focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100 cursor-pointer bg-white"
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
                    value={form.ob_id}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const ob = obList.find((o) => o.id === selectedId);
                      setForm({
                        ...form,
                        ob_id: selectedId,
                        assignedTo: ob ? ob.nama : "",
                      });
                    }}
                    className="w-full text-sm font-medium text-gray-800 rounded-lg px-3 py-2 border border-gray-200 outline-none focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100 cursor-pointer"
                  >
                    <option value="">Belum ditugaskan</option>
                    {obList.map((ob) => (
                      <option key={ob.id} value={ob.id}>{ob.nama}</option>
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
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 leading-relaxed outline-none focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-100 transition-colors cursor-pointer"
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
                className="w-full py-2.5 rounded-lg bg-white text-slate-700 font-medium text-sm border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
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