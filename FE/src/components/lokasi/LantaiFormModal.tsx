import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LantaiForm {
  nama: string;
}

interface LantaiFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (form: LantaiForm) => void;
  mode: "create" | "edit";
  initialData?: LantaiForm | null;
  gedungNama?: string;
}

export const LantaiFormModal: React.FC<LantaiFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  mode,
  initialData,
  gedungNama,
}) => {
  const [form, setForm] = useState<LantaiForm>({ nama: "" });

  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && initialData) {
        setForm(initialData);
      } else {
        setForm({ nama: "" });
      }
    }
  }, [isOpen, mode, initialData]);

  const handleSimpan = () => {
    if (!form.nama.trim()) {
      alert("Nama Lantai wajib diisi.");
      return;
    }
    onSave(form);
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {mode === "edit" ? "Edit Lantai" : "Tambah Lantai Baru"}
                </h2>
                {gedungNama && (
                  <p className="text-xs text-gray-400 mt-0.5">di {gedungNama}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Lantai</label>
                <input
                  type="text"
                  value={form.nama}
                  onChange={(e) => setForm({ nama: e.target.value })}
                  placeholder="Contoh: Lantai 1 - Main Lobby"
                  className="w-full bg-white text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-300 hover:border-gray-400 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100 transition-all duration-200"
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  Label lantai (L1, L2, dst) dibuat otomatis sesuai urutan penambahan.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSimpan}
                className="px-6 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-[#0a355c] text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                {mode === "edit" ? "Simpan Perubahan" : "Simpan Lantai"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LantaiFormModal;
