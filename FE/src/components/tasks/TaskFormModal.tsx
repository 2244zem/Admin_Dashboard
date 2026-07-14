import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TaskForm {
  kategori_id: string;
  tugas_id: string;
  namaTugas: string;
  lokasi_id: string;
  lantai_id: string;
  ob_id: string;
  tanggal: string;
  jam: string;
  catatan: string;
}

interface SelectOption {
  id: string;
  nama: string;
  kategori_id?: string; // For tugas options
}

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (form: TaskForm) => void;
  mode: "create" | "edit";
  initialData?: TaskForm | null;
  editingTaskId?: string | null;
  obPrefill?: string;
  kategoriOptions?: SelectOption[];
  tugasOptions?: SelectOption[];
  obOptions?: SelectOption[];
  gedungOptions?: SelectOption[];
  lantaiOptions?: SelectOption[];
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  mode,
  initialData,
  editingTaskId,
  obPrefill,
  kategoriOptions = [],
  tugasOptions = [],
  obOptions = [],
  gedungOptions = [],
  lantaiOptions = [],
}) => {
  const todayISO = () => new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState<TaskForm>({
    kategori_id: "",
    tugas_id: "",
    namaTugas: "",
    lokasi_id: "",
    lantai_id: "",
    ob_id: "",
    tanggal: todayISO(),
    jam: "",
    catatan: "",
  });

  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && initialData) {
        setForm(initialData);
      } else {
        setForm({
          kategori_id: "",
          tugas_id: "",
          namaTugas: "",
          lokasi_id: "",
          lantai_id: "",
          ob_id: obPrefill || "",
          tanggal: todayISO(),
          jam: "",
          catatan: "",
        });
      }
    }
  }, [isOpen, mode, initialData, obPrefill]);

  const handleFormChange = (field: keyof TaskForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSimpan = () => {
    onSave(form);
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
            className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {mode === "edit" ? "Edit Tugas" : "Buat Tugas Baru"}
                </h2>
                {mode === "edit" && editingTaskId && (
                  <p className="text-xs text-gray-400 mt-0.5">Mengubah data tugas {editingTaskId}</p>
                )}
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 cursor-pointer">
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
                    value={form.kategori_id}
                    onChange={(e) => handleFormChange("kategori_id", e.target.value)}
                    className="w-full bg-white text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-300 hover:border-gray-400 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100"
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
                    value={form.namaTugas}
                    onChange={(e) => handleFormChange("namaTugas", e.target.value)}
                    placeholder="Tulis nama tugas..."
                    className="w-full bg-white text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-300 hover:border-gray-400 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Lokasi Gedung</label>
                  <select
                    value={form.lokasi_id}
                    onChange={(e) => handleFormChange("lokasi_id", e.target.value)}
                    className="w-full bg-white text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-300 hover:border-gray-400 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100"
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
                    value={form.lantai_id}
                    onChange={(e) => handleFormChange("lantai_id", e.target.value)}
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">Catatan Khusus</label>
                <textarea
                  value={form.catatan}
                  onChange={(e) => handleFormChange("catatan", e.target.value)}
                  placeholder="Jelaskan instruksi khusus di sini..."
                  rows={3}
                  className="w-full bg-white text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-300 hover:border-gray-400 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-100 cursor-pointer">
                Batal
              </button>
              <button
                onClick={handleSimpan}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-[#0a355c] text-white font-semibold text-sm cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{mode === "edit" ? "Simpan Perubahan" : "Simpan Tugas"}</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TaskFormModal;