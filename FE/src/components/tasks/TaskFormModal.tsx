import { useEffect, useState } from "react";

export interface Option {
  id: string;
  nama: string;
}

export interface TaskFormValues {
  kategori_id: string;
  nama_tugas: string;
  gedung_id: string;
  lantai_id: string;
  frekuensi_kerja: string[]; // dipakai saat variant="rutin"
  tanggal_selesai: string;   // dipakai saat variant="non-rutin" — format yyyy-mm-dd
  jam_selesai: string;       // dipakai saat variant="non-rutin" — format HH:mm
  catatan: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: TaskFormValues) => void;
  mode: "create" | "edit";
  initialData: Record<string, unknown> | null;
  gedungOptions: Option[];
  lantaiOptions: Option[];
  kategoriOptions: Option[];
  variant?: "rutin" | "non-rutin"; // NEW — mengatur field mana yang tampil
}

const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

const emptyForm = (initialData: Record<string, unknown> | null): TaskFormValues => ({
  kategori_id: (initialData?.kategori_id as string) ?? "",
  nama_tugas: (initialData?.namaTugas as string) ?? "",
  gedung_id: (initialData?.gedung_id as string) ?? "",
  lantai_id: (initialData?.lantai_id as string) ?? "",
  frekuensi_kerja: (initialData?.frekuensi_kerja as string[]) ?? [],
  tanggal_selesai: (initialData?.tanggal_selesai as string) ?? "",
  jam_selesai: (initialData?.jam_selesai as string) ?? "",
  catatan: (initialData?.catatan as string) ?? "",
});

const TaskFormModal = ({
  isOpen,
  onClose,
  onSave,
  mode,
  initialData,
  gedungOptions,
  lantaiOptions,
  kategoriOptions,
  variant = "rutin",
}: Props) => {
  const [form, setForm] = useState<TaskFormValues>(emptyForm(initialData));

  useEffect(() => {
    setForm(emptyForm(initialData));
  }, [initialData]);

  if (!isOpen) return null;

  const toggleHari = (hari: string) => {
    setForm((f) => ({
      ...f,
      frekuensi_kerja: f.frekuensi_kerja.includes(hari)
        ? f.frekuensi_kerja.filter((h) => h !== hari)
        : [...f.frekuensi_kerja, hari],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">
            {mode === "edit" ? "Edit Tugas" : "Buat Tugas Baru"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Kategori</label>
              <select
                value={form.kategori_id}
                onChange={(e) => setForm((f) => ({ ...f, kategori_id: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#0F4C81]"
              >
                <option value="">Pilih Kategori</option>
                {kategoriOptions.map((k) => (
                  <option key={k.id} value={k.id}>{k.nama}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Nama Tugas</label>
              <input
                type="text"
                value={form.nama_tugas}
                onChange={(e) => setForm((f) => ({ ...f, nama_tugas: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#0F4C81]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Lokasi Gedung</label>
              <select
                value={form.gedung_id}
                onChange={(e) => setForm((f) => ({ ...f, gedung_id: e.target.value, lantai_id: "" }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#0F4C81]"
              >
                <option value="">Pilih Gedung</option>
                {gedungOptions.map((g) => (
                  <option key={g.id} value={g.id}>{g.nama}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Lokasi Lantai</label>
              <select
                value={form.lantai_id}
                onChange={(e) => setForm((f) => ({ ...f, lantai_id: e.target.value }))}
                disabled={!form.gedung_id}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#0F4C81] disabled:bg-gray-50"
              >
                <option value="">Pilih Lantai</option>
                {lantaiOptions.map((l) => (
                  <option key={l.id} value={l.id}>{l.nama}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ═══ Bagian yang berbeda antara Rutin vs Tidak Rutin ═══ */}
          {variant === "rutin" ? (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">Frekuensi Kerja</label>
              <div className="flex flex-wrap gap-3">
                {HARI.map((hari) => (
                  <label key={hari} className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.frekuensi_kerja.includes(hari)}
                      onChange={() => toggleHari(hari)}
                      className="rounded border-gray-300 text-[#0F4C81] focus:ring-[#0F4C81]"
                    />
                    {hari}
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Tanggal Selesai</label>
                <div className="relative">
                  <input
                    type="date"
                    value={form.tanggal_selesai}
                    onChange={(e) => setForm((f) => ({ ...f, tanggal_selesai: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg pl-9 pr-3 py-2 outline-none focus:border-[#0F4C81]"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Jam Selesai</label>
                <div className="relative">
                  <input
                    type="time"
                    value={form.jam_selesai}
                    onChange={(e) => setForm((f) => ({ ...f, jam_selesai: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg pl-9 pr-3 py-2 outline-none focus:border-[#0F4C81]"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Catatan Khusus</label>
            <textarea
              value={form.catatan}
              onChange={(e) => setForm((f) => ({ ...f, catatan: e.target.value }))}
              placeholder="Jelaskan instruksi khusus di sini..."
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#0F4C81]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="text-sm font-semibold text-gray-600 px-4 py-2 rounded-xl border border-gray-200 cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={() => onSave(form)}
            className="flex items-center gap-2 bg-[#0F4C81] hover:bg-[#0a355c] text-white text-sm font-semibold px-4 py-2 rounded-xl cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Simpan Tugas
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskFormModal;