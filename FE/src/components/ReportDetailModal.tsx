import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Laporan, StatusLaporan } from "../types/laporan";
import { formatWaktu } from "../lib/utils";
import { STATUS_BANNER_STYLE, type DisplayStatus } from "../utils/statusMapper";

const DETAIL_STATUS_OPTIONS: StatusLaporan[] = ["Menunggu", "Ditugaskan", "Selesai", "Ditolak"];

const StatusIcon = ({ status, className }: { status: DisplayStatus; className?: string }) => {
  switch (status) {
    case "Selesai":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "Ditugaskan":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0H21m-1.5 0H12" />
        </svg>
      );
    case "Ditolak":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
};

export default function ReportDetailModal({
  laporan,
  onClose,
  onStatusChange,
}: {
  laporan: Laporan | null;
  onClose: () => void;
  onStatusChange?: (newStatus: StatusLaporan) => void;
}) {
  const [isEditingStatus, setIsEditingStatus] = useState(false);

  if (!laporan) return null;

  const banner = STATUS_BANNER_STYLE[laporan.status as DisplayStatus] ?? STATUS_BANNER_STYLE["Menunggu"];

  const handleDownload = () => {
    window.print();
  };

  const handleStatusChange = (newStatus: StatusLaporan) => {
    if (onStatusChange) {
      onStatusChange(newStatus);
    }
    setIsEditingStatus(false);
  };

  return (
    <AnimatePresence>
      {laporan && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
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
                  Detail Laporan #{laporan.id}
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
              {/* Status banner */}
              <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${banner.bg} ${banner.border}`}>
                <div className="flex items-center gap-2">
                  <StatusIcon status={laporan.status as DisplayStatus} className={`h-4 w-4 flex-shrink-0 ${banner.text}`} />
                  <span className={`font-semibold text-sm ${banner.text}`}>
                    Status: {banner.label}
                  </span>
                </div>
                {onStatusChange && (
                  <div className="flex items-center gap-2">
                    {isEditingStatus ? (
                      <>
                        <select
                          value={laporan.status}
                          onChange={(e) => handleStatusChange(e.target.value as StatusLaporan)}
                          className="text-xs font-semibold rounded-lg px-2 py-1 border border-current outline-none bg-white cursor-pointer dark:bg-surface"
                        >
                          {DETAIL_STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => setIsEditingStatus(false)}
                          className="text-xs font-medium text-gray-500 hover:text-gray-700 px-1"
                        >
                          Batal
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsEditingStatus(true)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                        </svg>
                        Ubah Status
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Nama Karyawan / Lokasi */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Nama Karyawan
                  </p>
                  <div className="flex items-center gap-2">
                    {laporan.fotoProfil ? (
                      <img
                        src={laporan.fotoProfil}
                        alt={laporan.name}
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                        className="h-8 w-8 rounded-full object-cover shrink-0 border border-gray-200"
                      />
                    ) : (
                      <span className="h-8 w-8 rounded-full bg-blue-100 text-[#0F4C81] flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {laporan.initial}
                      </span>
                    )}
                    <span className="text-sm font-medium text-gray-800">{laporan.name}</span>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Lokasi
                  </p>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-blue-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    {laporan.loc}
                  </div>
                </div>
              </div>

              {/* OB yang Ditugaskan / Waktu Laporan */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    OB yang Ditugaskan
                  </p>
                  {laporan.assignedTo ? (
                    <span className="text-sm font-medium text-gray-800">{laporan.assignedTo}</span>
                  ) : (
                    <span className="text-sm text-gray-400">Belum ditugaskan</span>
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Waktu Laporan
                  </p>
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatWaktu(laporan.createdAt)}
                  </div>
                </div>
              </div>

              {/* Deskripsi Laporan */}
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Deskripsi Laporan
                </p>
                <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm text-gray-600 leading-relaxed dark:bg-surface">
                  {laporan.desc}
                </div>
              </div>

              {/* Bukti Foto */}
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Bukti Foto
                </p>
                <div className="rounded-xl overflow-hidden border border-gray-100">
                  <img
                    src={laporan.foto}
                    alt={laporan.desc}
                    className="w-full h-56 object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100 dark:bg-surface">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-100 transition-colors cursor-pointer dark:bg-elevated"
              >
                Tutup
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#0F4C81] hover:bg-[#0c3c68] transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Unduh Laporan (PDF)
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}