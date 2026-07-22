import { motion, AnimatePresence } from "framer-motion";
import type { Tugas } from "../../api/tugas";

const STATUS_STYLE: Record<string, { dot: string; label: string; color: string }> = {
  BELUM_DIKERJAKAN: { dot: "bg-gray-300", label: "Menunggu", color: "#3F4852" },
  SEDANG_DIKERJAKAN: { dot: "bg-amber-500", label: "Sedang Dikerjakan", color: "#FF8D28" },
  SELESAI: { dot: "bg-green-500", label: "Selesai", color: "#22C55E" },
};

function formatDate(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
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

interface TugasDetailModalProps {
  row: Row | null;
  onClose: () => void;
}

export default function TugasDetailModal({ row, onClose }: TugasDetailModalProps) {
  if (!row) return null;
  const st = STATUS_STYLE[row.status] ?? STATUS_STYLE.BELUM_DIKERJAKAN;

  return (
    <AnimatePresence>
      {row && (
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
            className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col dark:bg-surface"
          >
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-start gap-3">
                <span className="h-9 w-9 rounded-lg bg-blue-50 text-[#0F4C81] flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M9 8h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
                  </svg>
                </span>
                <div>
                  <h2 className="text-base font-bold text-gray-900">{row.namaTugas}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full dark:bg-elevated">
                      #{row.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-semibold"
                      style={{ color: st.color }}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 shrink-0 cursor-pointer dark:bg-elevated"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Kategori</p>
                  <p className="text-sm font-semibold text-gray-700">{row.kategori}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Lokasi</p>
                  <p className="text-sm font-semibold text-gray-700">{row.lantai}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tanggal Dibuat</p>
                  <p className="text-sm font-semibold text-gray-700">{formatDate(row.createdAt)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</p>
                  <span
                    className="inline-flex items-center gap-1 text-xs font-semibold"
                    style={{ color: st.color }}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                    {st.label}
                  </span>
                </div>
              </div>

              {row.catatan && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Catatan</p>
                  <div className="bg-gray-50 border-l-4 border-[#0F4C81] rounded-r-lg px-4 py-3 dark:bg-elevated">
                    <p className="text-sm text-gray-700 italic">"{row.catatan}"</p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Pekerja</p>
                <p className="text-sm font-semibold text-gray-700">
                  {row.ob_id ? "OB Assigned" : "Belum ada OB"}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100">
              <button
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 bg-[#0F4C81] hover:bg-[#0a355c] text-white text-sm font-semibold py-3 rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
