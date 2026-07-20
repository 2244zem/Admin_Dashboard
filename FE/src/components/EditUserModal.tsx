import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ROLE_OPTIONS } from "../types/user";
import { getAllRoles } from "../api/user";
import type { AppUser, UserRole, UserStatus } from "../types/user";

export interface EditUserPayload {
  namaLengkap: string;
  username: string;
  email: string;
  noTelepon: string;
  role: UserRole;
  status: UserStatus;
  [key: string]: unknown;
}

interface EditUserModalProps {
  open: boolean;
  user: AppUser | null;
  onClose: () => void;
  onSave: (payload: EditUserPayload) => Promise<void>;
}

// Only Aktif/Non-Aktif map to is_active: true/false
const STATUS_OPTIONS: UserStatus[] = ["Aktif", "Non-Aktif"];

const buildForm = (user: AppUser | null): EditUserPayload | null =>
  user
    ? {
        namaLengkap: user.namaLengkap,
        username: user.username,
        email: user.email,
        noTelepon: user.noTelepon,
        role: user.role,
        status: user.status,
      }
    : null;

const EditUserModal = ({ open, user, onClose, onSave }: EditUserModalProps) => {
  const [form, setForm] = useState<EditUserPayload | null>(() => buildForm(user));
  const [roles, setRoles] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    if (open) {
      getAllRoles()
        .then((data) => {
          const raw = data as Array<{ id: string; nama_role: string }>;
          setRoles(raw.map((r) => ({ id: r.id, label: r.nama_role.charAt(0).toUpperCase() + r.nama_role.slice(1) })));
        })
        .catch(() => setRoles(ROLE_OPTIONS));
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!user || !form) return;
    if (!form.namaLengkap.trim() || !form.username.trim() || !form.email.trim()) {
      alert("Mohon lengkapi semua data pengguna.");
      return;
    }

    try {
      await onSave(form);
    } catch {
      // onSave surfaces the error via a toast; keep the modal open.
      return;
    }
  };

  return (
    <AnimatePresence>
      {open && user && form && (
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
            <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
              <span className="h-9 w-9 rounded-lg bg-blue-100 text-[#0F4C81] flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
              </span>
              <div className="flex-1">
                <h2 className="text-base font-bold text-gray-900">Edit Data Pengguna</h2>
                <p className="text-xs text-gray-400">Perbarui informasi profil dan hak akses pengguna.</p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Lengkap</label>
                  <input
                    type="text"
                    value={form.namaLengkap}
                    onChange={(e) => setForm((f) => f && { ...f, namaLengkap: e.target.value })}
                    className="w-full bg-white text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-300 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm">@</span>
                    <input
                      type="text"
                      value={form.username}
                      onChange={(e) => setForm((f) => f && { ...f, username: e.target.value })}
                      className="w-full bg-white text-gray-700 text-sm rounded-xl pl-7 pr-4 py-2.5 outline-none border border-gray-300 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => f && { ...f, email: e.target.value })}
                  className="w-full bg-white text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-300 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nomor Telepon</label>
                <input
                  type="text"
                  value={form.noTelepon}
                  onChange={(e) => setForm((f) => f && { ...f, noTelepon: e.target.value })}
                  className="w-full bg-white text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-300 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => f && { ...f, role: e.target.value as UserRole })}
                  className="w-full bg-white text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-300 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100 cursor-pointer"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.label}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => f && { ...f, status: e.target.value as UserStatus })}
                  className="w-full bg-white text-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-300 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100 cursor-pointer"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-[#0F4C81] mt-0.5 shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                <p className="text-xs text-gray-500">
                  Pastikan data yang dimasukkan sudah sesuai dengan penugasan operasional di lapangan. Perubahan status akan langsung berdampak pada akses aplikasi mobile pengguna.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-100 cursor-pointer">
                Batal
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-[#0a355c] text-white font-semibold text-sm cursor-pointer"
              >
                Simpan Perubahan
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EditUserModal;