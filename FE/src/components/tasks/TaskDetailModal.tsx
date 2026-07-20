import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { Task } from "../../types/task";

// NOTE: fotoSebelum/fotoSesudah/claimedAt/completedAt/catatanOb TIDAK ada di
// mapApiChecklistToTask saat ini. Diakses optional; tampil "Belum tersedia"
// sampai backend + mapper diperluas untuk membawa field ini.
interface ExtendedTask extends Task {
  fotoSebelum?: string;
  fotoSesudah?: string;
  claimedAt?: string;
  completedAt?: string;
  catatanOb?: string;
}

function formatJam(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function formatDurasi(claimedAt?: string, completedAt?: string) {
  if (!claimedAt || !completedAt) return "-";
  const diffMs = new Date(completedAt).getTime() - new Date(claimedAt).getTime();
  if (isNaN(diffMs) || diffMs < 0) return "-";
  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

interface TaskDetailModalProps {
  task: Task | null;
  detailData: Task | null;
  isLoading: boolean;
  onClose: () => void;
  onApprove: (task: Task) => void | Promise<void>;
}

export default function TaskDetailModal({ task, detailData, isLoading, onClose, onApprove }: TaskDetailModalProps) {
  const [adminNote, setAdminNote] = useState("");
  const [isApproving, setIsApproving] = useState(false);

  if (!task) return null;
  const display = (detailData ?? task) as ExtendedTask;

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await onApprove(task);
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <AnimatePresence>
      {task && (
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
            className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col dark:bg-surface"
          >
            <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-start gap-3">
                <span className="h-9 w-9 rounded-lg bg-blue-50 text-[#0F4C81] flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M9 8h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
                  </svg>
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-gray-900">Detail Tugas: {display.namaTugas}</h2>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full dark:bg-elevated">#{display.id}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {display.gedung}, {display.lantai} • Dikerjakan oleh: {display.petugas?.nama || "Belum ditugaskan"}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 shrink-0 cursor-pointer dark:bg-elevated">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {isLoading ? (
              <div className="flex-1 flex items-center justify-center py-16 text-sm text-gray-400">
                Memuat detail tugas...
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                <div className="grid grid-cols-3 gap-6">
                  <div className="col-span-2">
                    <p className="text-xs font-bold text-gray-500 mb-2">Bukti Foto</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        {display.fotoSebelum ? (
                          <img src={display.fotoSebelum} alt="Sebelum" className="w-full h-32 object-cover rounded-lg" />
                        ) : (
                          <div className="w-full h-32 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-400 dark:bg-elevated">
                            Belum tersedia
                          </div>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1">Captured at {formatJam(display.claimedAt)}</p>
                      </div>
                      <div>
                        {display.fotoSesudah ? (
                          <img src={display.fotoSesudah} alt="Sesudah" className="w-full h-32 object-cover rounded-lg" />
                        ) : (
                          <div className="w-full h-32 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-400 dark:bg-elevated">
                            Belum tersedia
                          </div>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1">Captured at {formatJam(display.completedAt)}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-2">Time Performance</p>
                    <div className="border border-gray-100 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Claimed</span>
                        <span className="font-semibold text-gray-700">{formatJam(display.claimedAt)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Completed</span>
                        <span className="font-semibold text-gray-700">{formatJam(display.completedAt)}</span>
                      </div>
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-[10px] text-gray-400">Total Duration</p>
                        <p className="text-lg font-bold text-[#0F4C81]">{formatDurasi(display.claimedAt, display.completedAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-500 mb-2">Catatan OB</p>
                  <div className="bg-blue-50 border-l-4 border-[#0F4C81] rounded-r-lg px-4 py-3">
                    <p className="text-sm text-gray-700 italic">
                      {display.catatanOb ? `"${display.catatanOb}"` : display.catatan ? `"${display.catatan}"` : "Belum ada catatan."}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-500 mb-2">Catatan Admin</p>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Add observations or feedback for the OB..."
                    rows={3}
                    className="w-full text-sm rounded-xl px-3 py-2.5 border border-gray-200 outline-none focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100 resize-none"
                  />
                </div>
              </div>
            )}

            <div className="px-6 py-4 border-t border-gray-100">
              <button
                onClick={handleApprove}
                disabled={isApproving || isLoading}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold py-3 rounded-xl transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {isApproving ? "Memproses..." : "Setujui / Approve"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}