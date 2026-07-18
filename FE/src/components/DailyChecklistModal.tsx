import { motion, AnimatePresence } from "framer-motion";
import type { Task } from "../types/task";
import Avatar from "../components/ui/Avatar";

export interface OBChecklistDetail {
  nama: string;
  fotoProfil?: string;
  gedung: string;
  lokasi: string;
  tanggal: string;
  items: Task[];
}

function formatTanggalPanjang(tanggal: string) {
  return new Date(tanggal).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function DailyChecklistModal({
  detail,
  onClose,
}: {
  detail: OBChecklistDetail | null;
  onClose: () => void;
}) {
  const handlePrint = () => window.print();

  if (!detail) return null;

  const total = detail.items.length;
  const selesai = detail.items.filter((t) => t.status === "Selesai").length;
  const pct = total === 0 ? 0 : Math.round((selesai / total) * 100);

  return (
    <AnimatePresence>
      {detail && (
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
            className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Avatar name={detail.nama} src={detail.fotoProfil} size="md" />
                <div>
                  <h2 className="text-base font-bold text-gray-900">Detail Daily Checklist</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {detail.gedung} • {detail.lokasi} • {formatTanggalPanjang(detail.tanggal)}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 pt-5">
              <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-[#0F4C81]">Progress: {selesai}/{total} Selesai</span>
                <span className="text-sm font-bold text-[#0F4C81]">{pct}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden -mt-2 mb-4">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 18 }}
                  className="h-full bg-[#0F4C81] rounded-full"
                />
              </div>
            </div>

            <div className="px-6 pb-2">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Item Pekerjaan</p>
            </div>

            <div className="px-6 max-h-72 overflow-y-auto space-y-2 pb-4">
              {detail.items.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">Belum ada item pekerjaan</p>
              )}
              {detail.items.map((item) => {
                const done = item.status === "Selesai";
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {done ? (
                        <span className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      ) : (
                        <span className="h-5 w-5 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0" />
                      )}
                      <span className={`text-sm truncate ${done ? "text-gray-700" : "text-gray-400"}`}>
                        {item.namaTugas}
                      </span>
                    </div>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                        done ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {done ? `Selesai (${item.waktu})` : "Belum Dikerjakan"}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-100">
                Tutup
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-[#0a355c] text-white font-semibold text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Cetak Laporan
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}