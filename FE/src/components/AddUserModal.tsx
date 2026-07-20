import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getAllRoles } from "../api/user";

interface RoleOption { id: string; nama_role: string; label: string }

export interface AddUserPayload {
  namaLengkap: string;
  email: string;
  role: string; // UUID
}

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (payload: AddUserPayload) => Promise<void>;
}

const emptyForm: AddUserPayload = { namaLengkap: "", email: "", role: "" };

const AddUserModal = ({ open, onClose, onSave }: AddUserModalProps) => {
  const [form, setForm] = useState<AddUserPayload>(emptyForm);
  const [roles, setRoles] = useState<RoleOption[]>([]);

  useEffect(() => {
    if (open) {
      getAllRoles()
        .then((data) => {
          const raw = data as Array<{ id: string; nama_role: string }>;
          setRoles(raw.map((r) => ({ ...r, label: r.nama_role.charAt(0).toUpperCase() + r.nama_role.slice(1) })));
        })
        .catch(() => setRoles([]));
    }
  }, [open]);

  const resetAndClose = () => {
    setForm(emptyForm);
    onClose();
  };

  const handleSubmit = async () => {
    if (!form.namaLengkap.trim() || !form.email.trim() || !form.role) {
      alert("Mohon lengkapi semua data pengguna.");
      return;
    }

    try {
      await onSave(form);
      resetAndClose();
    } catch {
      // onSave surfaces the error via a toast; keep the modal open.
      return;
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={resetAndClose}
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
              <h2 className="text-lg font-bold text-gray-900">Tambah Pengguna Baru</h2>
              <button onClick={resetAndClose} className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Lengkap</label>
                <input
                  type="text"
                  placeholder="Contoh: Budi Santoso"
                  value={form.namaLengkap}
                  onChange={(e) => setForm((f) => ({ ...f, namaLengkap: e.target.value }))}
                  className="w-full bg-white text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-300 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  placeholder="budi.s@lapor-ob.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full bg-white text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-300 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Peran</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full bg-white text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-300 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100 cursor-pointer"
                >
                  <option value="">Pilih Peran Pengguna</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Pengguna akan menerima email dengan link aktivasi dan token akan otomatis di-generate.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button onClick={resetAndClose} className="px-6 py-2.5 rounded-xl text-gray-600 font-semibold text-sm hover:bg-gray-100 cursor-pointer">
                Batal
              </button>
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-[#0a355c] text-white font-semibold text-sm cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
                Simpan Pengguna
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddUserModal;
