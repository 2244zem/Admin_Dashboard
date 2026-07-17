import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import useTugasOptions from "../../hooks/useTugasOptions";

interface Option { id: string; nama: string }

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (form: {
    kategori_id: string;
    tugas_id: string;
    lokasi_id: string;
    lantai_id: string;
    catatan: string;
  }) => void | Promise<void>;
  mode: "create" | "edit";
  initialData: any;
  gedungOptions: Option[];
  lantaiOptions: Option[];
  kategoriOptions: Option[];
}

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
  const { tugasList, fetchTugas } = useTugasOptions();

  const [kategoriId, setKategoriId] = useState("");
  const [tugasId, setTugasId] = useState("");
  const [lokasiId, setLokasiId] = useState("");
  const [lantaiId, setLantaiId] = useState("");
  const [catatan, setCatatan] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setKategoriId(initialData.kategori_id || "");
      setTugasId(""); // tugas_id lama tidak dikirim balik dari mapper, biarkan user pilih ulang
      setLokasiId(initialData.lokasi_id || "");
      setLantaiId(initialData.lantai_id || "");
      setCatatan(initialData.catatan || "");
    } else {
      setKategoriId("");
      setTugasId("");
      setLokasiId("");
      setLantaiId("");
      setCatatan("");
    }
  }, [isOpen, initialData]);

  // Nama Tugas bergantung pada Kategori dipilih dulu
  useEffect(() => {
    if (kategoriId) fetchTugas(kategoriId);
  }, [kategoriId, fetchTugas]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ kategori_id: kategoriId, tugas_id: tugasId, lokasi_id: lokasiId, lantai_id: lantaiId, catatan });
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
            className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {mode === "edit" ? "Edit Tugas" : "Buat Tugas Baru"}
              </h2>
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
                    value={kategoriId}
                    onChange={(e) => { setKategoriId(e.target.value); setTugasId(""); }}
                    className="w-full bg-white text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-300 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Pilih Kategori</option>
                    {kategoriOptions.map((k) => (
                      <option key={k.id} value={k.id}>{k.nama}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Tugas</label>
                  <select
                    value={tugasId}
                    onChange={(e) => setTugasId(e.target.value)}
                    disabled={!kategoriId}
                    className="w-full bg-white text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-300 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">{kategoriId ? "Pilih Tugas" : "Pilih Kategori dulu"}</option>
                    {tugasList.map((t) => (
                      <option key={t.id} value={t.id}>{t.nama}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Lokasi Gedung</label>
                  <select
                    value={lokasiId}
                    onChange={(e) => setLokasiId(e.target.value)}
                    className="w-full bg-white text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-300 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100"
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
                    onChange={(e) => setLantaiId(e.target.value)}
                    className="w-full bg-white text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-300 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100"
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
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Jelaskan instruksi khusus di sini..."
                  rows={3}
                  className="w-full bg-white text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-300 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-100 cursor-pointer">
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