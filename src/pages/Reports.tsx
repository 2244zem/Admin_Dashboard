import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { STATUS_COLOR } from "../types/laporan";
import type { Laporan } from "../types/laporan";
// import { formatWaktu } from "../lib/utils";
import ReportDetailModal from "../components/ReportDetailModal";
import useLaporan from "../hooks/useLaporan";
import PageHeader from "../components/ui/PageHeader";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";
// import EmptyState from "../components/ui/EmptyState";

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

const STATUS_OPTIONS = ["Semua Status", "Menunggu", "Ditugaskan", "Selesai", "Ditolak"];
const LOKASI_OPTIONS = ["Semua Area", "Toilet", "Lobi", "Area Kantor", "Parkir"];
const WAKTU_OPTIONS = ["Semua Waktu", "Hari Ini", "Kemarin"];

const ITEMS_PER_PAGE = 4;

const Reports = () => {
  // --- Filter state ---
  const [filterStatus, setFilterStatus] = useState("Semua Status");
  const [filterLokasi, setFilterLokasi] = useState("Semua Area");
  const [filterWaktu, setFilterWaktu] = useState("Semua Waktu");
  const [currentPage, setCurrentPage] = useState(1);

  const apiFilters = useMemo(() => ({
    status: filterStatus,
    area: filterLokasi,
    waktu: filterWaktu,
    page: currentPage,
    limit: ITEMS_PER_PAGE,
  }), [filterStatus, filterLokasi, filterWaktu, currentPage]);

  const { laporanList, isLoading, error, fetchLaporan, getLaporanDetail } = useLaporan(apiFilters);

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
  const obList: Array<{ id: string; nama: string }> = [];
  const gedungOptions: Array<{ id: string; nama: string }> = [];
  const lantaiOptions: Array<{ id: string; nama: string }> = [];
  const closeAssignModal = () => setAssignTarget(null);
  const handleAssignTask = () => undefined;

  const totalLaporanAktif = useMemo(() => {
    return laporanList.filter(
      (row) => row.status !== "Selesai" && row.status !== "Ditolak"
    ).length;
  }, [laporanList]);

  const lokasiStats = useMemo(() => {
    const counts: Record<string, number> = { Toilet: 0, Lobi: 0, "Area Kantor": 0, Parkir: 0 };
    laporanList.forEach((data) => {
      if (counts[data.area] !== undefined) {
        counts[data.area] += 1;
      }
    });
    return counts;
  }, [laporanList]);

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

  // Pagination
  const totalPages = Math.max(1, Math.ceil(laporanList.length / ITEMS_PER_PAGE));
  const startIndex = laporanList.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, laporanList.length);

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  return (
    <div className="flex h-screen bg-white font-sans text-gray-800">
      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader title="Laporan Pengguna" />

        <main className="flex-1 overflow-auto bg-white p-8">
          {isLoading ? (
            <LoadingSpinner text="Memuat data laporan..." />
          ) : error ? (
            <ErrorState message={error} onRetry={() => fetchLaporan(apiFilters)} />
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
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Rentang Waktu</label>
              <div className="relative">
                <select
                  value={filterWaktu}
                  onChange={(e) => {
                    setFilterWaktu(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-gray-50 hover:bg-white text-gray-700 text-sm font-medium rounded-2xl px-4 py-3 outline-none appearance-none cursor-pointer border-2 border-gray-200 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  {WAKTU_OPTIONS.map((w) => (
                    <option key={w}>{w}</option>
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
                    <th className="px-6 py-4 text-center">BUKTI FOTO</th>
                    <th className="px-6 py-4 w-28 text-center">LEVEL</th>
                    <th className="px-6 py-4 w-32 text-center">STATUS</th>
                    <th className="px-6 py-4 w-20 text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white text-gray-700">
                  {laporanList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                        Belum ada laporan yang sesuai dengan filter saat ini.
                      </td>
                    </tr>
                  ) : (
                    laporanList.map((data) => (
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
                                  event.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=0F4C81&color=fff&bold=true`;
                                }}
                                className="h-8 w-8 rounded-full object-cover shrink-0 border border-gray-200"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-blue-100 text-[#0F4C81] flex items-center justify-center font-bold text-xs shrink-0">
                                {data.initial}
                              </div>
                            )}
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

                        {/* BUKTI FOTO */}
                        <td className="px-6 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => setPreviewFoto({ url: data.foto, desc: data.desc })}
                            className="inline-block h-10 w-14 overflow-hidden rounded-md border border-gray-200 hover:ring-2 hover:ring-[#0F4C81]"
                            title="Lihat foto bukti"
                          >
                            <img
                              src={data.foto}
                              alt={`Bukti laporan: ${data.desc}`}
                              className="h-full w-full object-cover"
                            />
                          </button>
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
                          <div className="flex items-center justify-center gap-1">
                            <motion.button
                              onClick={() => openDetailModal(data)}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-full text-gray-400 hover:text-[#0F4C81] hover:bg-blue-50 transition-colors"
                              title="Lihat detail"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </motion.button>
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
                {laporanList.length === 0
                  ? "Tidak ada laporan"
                  : `Menampilkan ${startIndex} sampai ${endIndex} dari ${laporanList.length} laporan`}
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

      {/* MODAL DETAIL LAPORAN */}
      <ReportDetailModal laporan={detailTarget} onClose={closeDetailModal} />

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

export default Reports;
