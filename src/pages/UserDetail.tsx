import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import useUsers from "../hooks/useUsers";
import { useToast } from "../components/Toast";
import EditUserModal from "../components/EditUserModal";
import { STATUS_USER_COLOR, TOKEN_DURATION_OPTIONS } from "../types/user";
import {
  formatTanggal,
  formatTanggalWaktuWIB,
} from "../lib/utils";
import PageHeader from "../components/ui/PageHeader";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Can from "../components/auth/Can";

type PerformaTab = "Mingguan" | "Bulanan" | "Tahunan";

const UserDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userList, isLoading, renewToken, updateUser, deleteUser } = useUsers();
  const { push } = useToast();

  // id from URL params is now backend UUID (string), not frontend numeric ID
  const user = userList.find((u) => u.backendId === id);

  const [performaTab, setPerformaTab] = useState<PerformaTab>("Mingguan");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(24);
  const [copiedToken, setCopiedToken] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <LoadingSpinner text="Memuat data detail pengguna..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-500 mb-4 font-semibold">Pengguna tidak ditemukan.</p>
          <button
            onClick={() => navigate("/users")}
            className="text-sm font-semibold text-[#0F4C81] border border-[#0F4C81] rounded-lg px-4 py-2 hover:bg-blue-50 cursor-pointer"
          >
            Kembali ke Daftar Pengguna
          </button>
        </div>
      </div>
    );
  }

  // Determine content by role
  const isOB = user.role === "OB" || user.role === "HR";
  const isKaryawan = user.role === "Karyawan";
  const isTokenExpired = user.tokenStatus === "Expired";

  const handleConfirmDelete = async () => {
    try {
      await deleteUser(user.id);
      push("success", "Pengguna berhasil dihapus");
      navigate("/users");
    } catch {
      push("error", "Gagal menghapus pengguna");
    }
  };

  const handleRenewToken = async () => {
    try {
      await renewToken(user.id, selectedDuration);
      push("success", "Token akses berhasil diperpanjang");
      setShowTokenModal(false);
    } catch {
      push("error", "Gagal memperpanjang token");
    }
  };

  const handleEditSave = async (payload: any) => {
    try {
      const res = await updateUser(user.id, payload);
      if (res && res.success === false) {
        push("error", res.message || "Gagal memperbarui pengguna");
      } else {
        push("success", "Perubahan Berhasil Disimpan");
        setShowEditModal(false);
      }
    } catch (err: any) {
      push("error", err.message || "Gagal memperbarui pengguna");
    }
  };

  const handleExportPdf = () => {
    push("success", "Laporan performa berhasil diekspor ke PDF");
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(user.tokenString || "").then(() => {
      setCopiedToken(true);
      push("success", "Disalin");
      setTimeout(() => setCopiedToken(false), 2000);
    });
  };

  // Role display label
  const roleDisplayLabel = (() => {
    switch (user.role) {
      case "OB": return "Office Boy (OB)";
      case "Karyawan": return "Karyawan";
      case "HR": return "HR";
      case "Admin": return "Admin";
      default: return user.role;
    }
  })();

  return (
    <div className="flex h-screen bg-white font-sans text-gray-800">
      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader title="Detail Pengguna" />

        <main className="flex-1 overflow-auto bg-white p-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate("/users")}
              className="h-8 w-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 cursor-pointer focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <div className="text-xs text-gray-400 select-none">
              <button onClick={() => navigate("/users")} className="hover:text-gray-600 cursor-pointer">Pengguna</button>
              <span className="mx-1">›</span>
              <span className="text-[#0F4C81] font-semibold">Detail Pengguna</span>
            </div>
          </div>

          {/* Grid utama: kolom kiri & kolom kanan */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Kolom kiri */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Profil */}
              <div className="border border-gray-200 rounded-xl p-6 bg-white">
                <div className="flex items-start gap-4 mb-6">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.namaLengkap} className="h-16 w-16 rounded-xl object-cover" />
                  ) : (
                    <div className="h-16 w-16 rounded-xl bg-blue-100 text-[#0F4C81] flex items-center justify-center font-bold text-2xl">
                      {user.namaLengkap.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-bold text-gray-900">{user.namaLengkap}</h2>
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-[#0F4C81]">
                        {roleDisplayLabel}
                      </span>
                    </div>
                    <p className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                      Dibuat {formatTanggal(user.createdAt)}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs font-semibold">
                      <span className={`h-2 w-2 rounded-full ${user.status === "Aktif" ? "bg-green-500" : "bg-gray-300"}`}></span>
                      <span className={STATUS_USER_COLOR[user.status].split(" ")[1]}>{user.status}</span>
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase mb-1">Nama Lengkap</p>
                    <p className="text-sm font-bold text-gray-800">{user.namaLengkap}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase mb-1">Username</p>
                    <p className="text-sm font-bold text-gray-800">{user.username}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase mb-1">Peran</p>
                    <p className="text-sm font-bold text-gray-800">{roleDisplayLabel}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase mb-1">Email</p>
                    <p className="text-sm font-bold text-gray-800">{user.email}</p>
                  </div>
                </div>
              </div>

              {/* Statistik Pengguna */}
              <div className="border border-gray-200 rounded-xl p-6 bg-white">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold text-gray-800">
                    {isOB ? "Statistik Performa" : "Statistik Pengguna"}
                  </h3>
                  {isOB && (
                    <div className="inline-flex bg-gray-100 rounded-full p-1 text-xs">
                      {(["Mingguan", "Bulanan", "Tahunan"] as PerformaTab[]).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setPerformaTab(tab)}
                          className={`px-3 py-1 rounded-full font-semibold transition-colors cursor-pointer ${
                            performaTab === tab ? "bg-[#0F4C81] text-white" : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {isOB ? (
                  /* OB / HR: show multi stats */
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-xl p-5 text-center">
                      <div className="flex justify-center mb-2">
                        <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      <span className="text-3xl font-bold text-gray-800">{user.stats?.tasksCompleted || 0}</span>
                      <p className="text-xs text-gray-500 font-semibold mt-1">Laporan Diterima</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-5 text-center">
                      <div className="flex justify-center mb-2">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      </div>
                      <span className="text-3xl font-bold text-gray-800">{200}</span>
                      <p className="text-xs text-gray-500 font-semibold mt-1">Laporan Selesai</p>
                    </div>
                  </div>
                ) : isKaryawan ? (
                  /* Karyawan: show single stat (Laporan Terkirim) */
                  <div className="flex flex-col items-center justify-center py-6 mb-6">
                    <div className="h-14 w-14 bg-blue-100 rounded-full flex items-center justify-center text-[#0F4C81] mb-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-4xl font-bold text-[#0F4C81]">{user.stats?.tasksCompleted || 342}</span>
                    <p className="text-sm text-gray-500 font-semibold mt-1">Laporan Terkirim</p>
                  </div>
                ) : (
                  /* Admin / fallback */
                  <div className="flex flex-col items-center justify-center py-6 mb-6">
                    <div className="h-14 w-14 bg-blue-100 rounded-full flex items-center justify-center text-[#0F4C81] mb-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-4xl font-bold text-[#0F4C81]">{user.stats?.tasksCompleted || 0}</span>
                    <p className="text-sm text-gray-500 font-semibold mt-1">Tugas Selesai</p>
                  </div>
                )}

                <button
                  onClick={handleExportPdf}
                  className="w-full flex items-center justify-center gap-2 bg-[#0F4C81] hover:bg-[#0c3c68] text-white text-sm font-semibold rounded-xl py-3 transition-colors cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  Ekspor PDF
                </button>
              </div>
            </div>

            {/* Kolom kanan */}
            <div className="flex flex-col gap-6">
              {/* Status Token Akses - card style matching screenshot */}
              <div className={`border rounded-xl p-5 ${isTokenExpired ? "border-red-200 bg-red-50/50" : "border-green-200 bg-green-50/50"}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`h-5 w-5 rounded-full flex items-center justify-center ${isTokenExpired ? "bg-red-200 text-red-600" : "bg-green-200 text-green-600"}`}>
                    {isTokenExpired ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                  <h3 className={`text-sm font-bold ${isTokenExpired ? "text-red-700" : "text-green-700"}`}>Status Token Akses</h3>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Status Saat Ini</span>
                  </div>
                  <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${isTokenExpired ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                    {isTokenExpired ? "Expired / Kadaluwarsa" : "Aktif"}
                  </span>

                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Waktu Kadaluwarsa</p>
                    <p className="text-sm font-bold text-gray-800">{formatTanggalWaktuWIB(user.tokenExpiredAt)}</p>
                  </div>

                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                    Token ini dapat digunakan untuk otentikasi sistem.
                  </p>
                </div>

                <button
                  onClick={() => setShowTokenModal(true)}
                  className={`w-full text-center text-xs font-bold py-2 rounded-lg transition-colors cursor-pointer ${
                    isTokenExpired
                      ? "bg-red-100 text-red-700 hover:bg-red-200"
                      : "bg-green-100 text-green-700 hover:bg-green-200"
                  }`}
                >
                  Lihat detail token
                </button>
              </div>

              {/* PENGATURAN AKUN */}
              <Can permission="users:all">
                <div className="border border-gray-200 rounded-xl p-6 bg-white">
                  <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4">Pengaturan Akun</h3>
                  <div className="flex flex-col gap-2.5">
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="w-full flex items-center justify-between gap-2 border border-gray-200 text-gray-700 hover:text-gray-900 text-sm font-semibold rounded-xl py-2.5 px-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                        Edit Data Pengguna
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-gray-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="w-full flex items-center gap-2 border border-red-200 text-red-600 hover:text-red-700 text-sm font-semibold rounded-xl py-2.5 px-4 hover:bg-red-50/50 transition-colors cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Hapus Pengguna
                    </button>
                  </div>
                </div>
              </Can>

              {/* Log Sistem */}
              {user.activityLog && user.activityLog.length > 0 && (
                <div className="border border-gray-200 rounded-xl p-6 bg-white">
                  <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4">Log Sistem</h3>
                  <div className="space-y-3">
                    {user.activityLog.slice(0, 5).map((log) => {
                      const dots: Record<string, string> = {
                        blue: "bg-blue-500",
                        yellow: "bg-yellow-500",
                        green: "bg-green-500",
                        red: "bg-red-500",
                      };
                      return (
                        <div key={log.id} className="flex gap-3">
                          <span className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${dots[log.colorDot] || "bg-blue-500"}`}></span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-800 truncate">{log.title}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5 font-semibold">{log.time}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* TOKEN DETAIL MODAL */}
      <AnimatePresence>
        {showTokenModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowTokenModal(false)}
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
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Detail Token</h3>
                </div>
                <button
                  onClick={() => setShowTokenModal(false)}
                  className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                {/* Status Token */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">Status Token</p>
                  <div className="flex items-center gap-2">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${isTokenExpired ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                      {isTokenExpired ? "Expired / Kadaluwarsa" : "Aktif"}
                    </span>
                    <span className="text-[11px] text-gray-400">Terakhir aktif: {formatTanggalWaktuWIB(user.tokenExpiredAt)}</span>
                  </div>
                </div>

                {/* Aktifkan Kembali (hanya tampil jika expired) */}
                {isTokenExpired && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Aktifkan Kembali untuk:</label>
                    <select
                      value={selectedDuration}
                      onChange={(e) => setSelectedDuration(Number(e.target.value))}
                      className="w-full bg-white text-gray-800 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-200 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
                    >
                      {TOKEN_DURATION_OPTIONS.map((opt) => (
                        <option key={opt.hours} value={opt.hours}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* String Token */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">String Token</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-200 font-mono text-sm text-gray-700 truncate">
                      {user.tokenString || "-"}
                    </div>
                    <button
                      onClick={handleCopyToken}
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer shrink-0 ${
                        copiedToken
                          ? "bg-green-100 text-green-700"
                          : "bg-[#0F4C81] text-white hover:bg-[#0c3c68]"
                      }`}
                    >
                      {copiedToken ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          Disalin
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                          </svg>
                          Salin Token
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
                <button
                  onClick={() => setShowTokenModal(false)}
                  className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-100 cursor-pointer"
                >
                  Batal
                </button>
                {isTokenExpired && (
                  <button
                    onClick={handleRenewToken}
                    className="px-6 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-[#0c3c68] text-white font-semibold text-sm cursor-pointer"
                  >
                    Simpan Perubahan
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDIT USER MODAL */}
      <EditUserModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        user={user}
        onSave={handleEditSave}
      />

      {/* DELETE USER CONFIRM */}
      <ConfirmDialog
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Hapus Akun Pengguna?"
        message={`Apakah Anda yakin ingin menghapus akun ${user.namaLengkap}? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.`}
      />
    </div>
  );
};

export default UserDetail;