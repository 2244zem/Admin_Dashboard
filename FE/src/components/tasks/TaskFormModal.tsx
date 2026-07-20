import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export interface Option { id: string; nama: string }

interface TaskFormValues {
  kategori_id: string;
  nama_tugas: string;
  lokasi_id: string;
  lantai_id: string;
  catatan: string;
}

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (form: TaskFormValues) => void | Promise<void>;
  mode: "create" | "edit";
  initialData: Record<string, unknown> | null;
  gedungOptions: Option[];
  lantaiOptions: Option[];
  kategoriOptions: Option[];
}

const buildState = (initialData: Record<string, unknown> | null) => ({
  kategoriId: String(initialData?.kategori_id ?? ""),
  namaTugas: String(initialData?.namaTugas ?? ""),
  lokasiId: String(initialData?.lokasi_id ?? ""),
  lantaiId: String(initialData?.lantai_id ?? ""),
  catatan: String(initialData?.catatan ?? ""),
});

export default function TaskFormModal({
  isOpen,
  onClose,
  onSave,
  mode,
  initialData,
  gedungOptions,
  lantaiOptions,
  kategoriOptions,
}: TaskFormModalProps) {
  const [{ kategoriId, namaTugas, lokasiId, lantaiId, catatan }, setForm] = useState(() => buildState(initialData));
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ kategori_id: kategoriId, nama_tugas: namaTugas, lokasi_id: lokasiId, lantai_id: lantaiId, catatan });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden dark:bg-surface"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {mode === "edit" ? "Edit Tugas" : "Buat Tugas Baru"}
              </h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 cursor-pointer dark:bg-elevated">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Kategori</label>
                  <select
                    value={kategoriId}
                    onChange={(e) => setForm((s) => ({ ...s, kategoriId: e.target.value }))}
                    className="w-full bg-white text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-300 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100 dark:bg-surface"
                  >
                    <option value="">Pilih Kategori</option>
                    {kategoriOptions.map((k) => (
                      <option key={k.id} value={k.id}>{k.nama}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Tugas</label>
                  <input
                    type="text"
                    value={namaTugas}
                    onChange={(e) => setForm((s) => ({ ...s, namaTugas: e.target.value }))}
                    placeholder="Masukkan nama tugas..."
                    className="w-full bg-white text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-300 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100 dark:bg-surface"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Lokasi Gedung</label>
                  <select
                    value={lokasiId}
                    onChange={(e) => setForm((s) => ({ ...s, lokasiId: e.target.value }))}
                    className="w-full bg-white text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-300 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100 dark:bg-surface"
                  >
                    <option value="">Pilih Gedung</option>
                    {gedungOptions.map((g) => (
                      <option key={g.id} value={g.id}>{g.nama}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Lokasi Lantai</label>
                  <select
                    value={lantaiId}
                    onChange={(e) => setForm((s) => ({ ...s, lantaiId: e.target.value }))}
                    className="w-full bg-white text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-300 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100 dark:bg-surface"
                  >
                    <option value="">Pilih Lantai</option>
                    {lantaiOptions.map((l) => (
                      <option key={l.id} value={l.id}>{l.nama}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Catatan Khusus</label>
                <textarea
                  value={catatan}
                  onChange={(e) => setForm((s) => ({ ...s, catatan: e.target.value }))}
                  placeholder="Jelaskan instruksi khusus di sini..."
                  rows={3}
                  className="w-full bg-white text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-300 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100 resize-none dark:bg-surface"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100 dark:bg-surface">
              <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-100 cursor-pointer dark:bg-elevated">
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-[#0a355c] disabled:opacity-60 text-white font-semibold text-sm cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {isSaving ? "Menyimpan..." : mode === "edit" ? "Simpan Perubahan" : "Simpan Tugas"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}