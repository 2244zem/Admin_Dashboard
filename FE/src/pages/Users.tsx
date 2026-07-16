import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import useUsers from "../hooks/useUsers";
import { useToast } from "../components/Toast";
import AddUserModal from "../components/AddUserModal";
import EditUserModal from "../components/EditUserModal";
import { ROLE_OPTIONS, STATUS_USER_COLOR } from "../types/user";
import type { AppUser, UserRole } from "../types/user";
import PageHeader from "../components/ui/PageHeader";
import { StatCardsSkeleton, TableSkeleton, Skeleton } from "../components/ui/Skeleton";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import Can from "../components/auth/Can";

const ITEMS_PER_PAGE = 3;

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-600",
  "bg-green-100 text-green-600",
  "bg-orange-100 text-orange-600",
  "bg-purple-100 text-purple-600",
  "bg-pink-100 text-pink-600",
  "bg-teal-100 text-teal-600",
];
function avatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function getPaginationRange(current: number, total: number): (number | "...")[] {
  const delta = 1;
  const range: (number | "...")[] = [];
  const left = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);

  range.push(1);
  if (left > 2) range.push("...");
  for (let i = left; i <= right; i++) range.push(i);
  if (right < total - 1) range.push("...");
  if (total > 1) range.push(total);

  return range;
}

const Users = () => {
  const { userList, isLoading, error, fetchUsers, addUser, updateUser, deleteUser } = useUsers();
  const { push } = useToast();
  const navigate = useNavigate();

  // --- Filter draft vs applied ---
  const [searchDraft, setSearchDraft] = useState("");
  const [roleDraft, setRoleDraft] = useState<UserRole | "Semua Role">("Semua Role");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedRole, setAppliedRole] = useState<UserRole | "Semua Role">("Semua Role");

  const handleApplyFilter = () => {
    setAppliedSearch(searchDraft);
    setAppliedRole(roleDraft);
    setCurrentPage(1);
  };

  const handleResetFilter = () => {
    setSearchDraft("");
    setRoleDraft("Semua Role");
    setAppliedSearch("");
    setAppliedRole("Semua Role");
    setCurrentPage(1);
  };

  const filteredUsers = useMemo(() => {
    return userList.filter((u) => {
      const q = appliedSearch.trim().toLowerCase();
      const matchSearch =
        q === "" || u.namaLengkap.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
      const matchRole = appliedRole === "Semua Role" || u.role === appliedRole;
      return matchSearch && matchRole;
    });
  }, [userList, appliedSearch, appliedRole]);

  // --- Pagination ---
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  const startIndex = filteredUsers.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length);

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // --- Statistik ---
  const totalUser = userList.length;
  const userAktif = userList.filter((u) => u.status === "Aktif").length;
  const userNonAktif = userList.filter((u) => u.status === "Non-Aktif").length;
  const totalOB = userList.filter((u) => u.role === "OB").length;

  // --- Modal state ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<AppUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.backendId) return;
    try {
      await deleteUser(deleteTarget.backendId);
      push("success", "Data pengguna berhasil dihapus");
      setDeleteTarget(null);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Gagal menghapus data pengguna");
    }
  };

  const handleAddUserSave = async (payload: any) => {
    try {
      const res = await addUser(payload);
      if (res && res.success === false) {
        push("error", res.message || "Gagal menyimpan pengguna");
      } else {
        push("success", "Pengguna Berhasil Disimpan");
        setShowAddModal(false);
      }
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Gagal menyimpan pengguna");
    }
  };

  const handleEditUserSave = async (payload: any) => {
    if (!editTarget?.backendId) return;
    try {
      const res = await updateUser(editTarget.backendId, payload);
      if (res && res.success === false) {
        push("error", res.message || "Gagal memperbarui pengguna");
      } else {
        push("success", "Perubahan Berhasil Disimpan");
        setEditTarget(null);
      }
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Gagal memperbarui pengguna");
    }
  };

  return (
    <div className="flex h-screen bg-white font-sans text-gray-800">
      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader title="Manajemen Pengguna " />

        <main className="flex-1 overflow-auto bg-white p-8">
          {isLoading && userList.length === 0 ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-10 w-40 rounded-lg" />
              </div>
              <StatCardsSkeleton count={4} />
              <Skeleton className="h-20 w-full rounded-xl mb-6" />
              <TableSkeleton columns={6} rows={3} withAvatar />
            </div>
          ) : error ? (
            <ErrorState message={error} onRetry={fetchUsers} />
          ) : (
            <React.Fragment>
              {/* Sub-header: Daftar Pengguna + Tambah Pengguna */}
              <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#0F4C81]">Daftar Pengguna</h2>
            <Can permission="users:all" roles={["Admin", "HR"]} anyOf>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-[#0F4C81] hover:bg-[#0a355c] text-white text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Tambah Pengguna
              </motion.button>
            </Can>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <motion.div whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total User</span>
                <span className="text-xl font-bold text-[#0F4C81]">{totalUser.toLocaleString("id-ID")}</span>
              </div>
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-[#0F4C81]">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477M15.75 8.25a3 3 0 11-6 0 3 3 0 016 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">User Aktif</span>
                <span className="text-xl font-bold text-green-600">{userAktif.toLocaleString("id-ID")}</span>
              </div>
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">User Non-Aktif</span>
                <span className="text-xl font-bold text-gray-500">{userNonAktif.toLocaleString("id-ID")}</span>
              </div>
              <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total OB</span>
                <span className="text-xl font-bold text-purple-600">{totalOB.toLocaleString("id-ID")}</span>
              </div>
              <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286z" />
                </svg>
              </div>
            </motion.div>
          </div>

          {/* Filter Panel */}
          <div className="border border-gray-200 rounded-xl p-5 mb-6 flex flex-wrap md:flex-nowrap gap-4 items-end bg-gray-50/50">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Cari User</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Nama Lengkap / Username..."
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  className="w-full bg-white text-gray-800 text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none border border-gray-200 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100 transition-all duration-200"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="w-full md:w-56">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Filter Role</label>
              <div className="relative">
                <select
                  value={roleDraft}
                  onChange={(e) => setRoleDraft(e.target.value as any)}
                  className="w-full bg-white text-gray-800 text-sm rounded-xl pl-4 pr-10 py-2.5 outline-none border border-gray-200 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100 transition-all duration-200 appearance-none cursor-pointer"
                >
                  <option value="Semua Role">Semua Role</option>
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleApplyFilter}
                className="bg-[#0F4C81] hover:bg-[#0c3c68] text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition-colors cursor-pointer"
              >
                Terapkan
              </button>
              <button
                onClick={handleResetFilter}
                className="border border-gray-200 bg-white text-gray-500 hover:text-gray-800 text-sm font-semibold rounded-xl px-5 py-2.5 transition-colors cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <EmptyState
              title="Pengguna Tidak Ditemukan"
              description="Tidak ada pengguna yang sesuai dengan pencarian atau kriteria penyaringan Anda."
            />
          ) : (
            <React.Fragment>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="text-[11px] font-bold text-gray-500 uppercase border-b border-gray-200 bg-gray-100/50">
                    <tr>
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Username</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Status Token</th>
                      <th className="px-6 py-4">Status Akun</th>
                      <th className="px-6 py-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {paginatedUsers.map((u) => {
                      const color = avatarColor(u.id);
                      return (
                        <motion.tr
                          key={u.id}
                          whileHover={{ backgroundColor: "rgba(15, 76, 129, 0.02)" }}
                          className="transition-colors hover:bg-gray-50"
                        >
                          <td className="px-6 py-4 flex items-center gap-3">
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.namaLengkap} className="h-8 w-8 rounded-full object-cover" />
                            ) : (
                              <span className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${color}`}>
                                {u.namaLengkap.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                            <div>
                              <p className="font-semibold text-gray-800">{u.namaLengkap}</p>
                              <p className="text-xs text-gray-400">{u.email}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-700">@{u.username}</td>
                          <td className="px-6 py-4 text-gray-800">{u.role}</td>
                          <td className="px-6 py-4 text-gray-500 font-mono text-xs">{u.tokenString || "-"}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${STATUS_USER_COLOR[u.status]}`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => navigate(`/users/${u.backendId}`)}
                                className="text-gray-400 hover:text-[#0F4C81] p-1.5 rounded transition-colors cursor-pointer"
                                title="Detail User"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                </svg>
                              </button>
                              <Can permission="users:all" roles={["Admin", "HR"]} anyOf>
                                <button
                                  onClick={() => setEditTarget(u)}
                                  className="text-gray-400 hover:text-yellow-600 p-1.5 rounded transition-colors cursor-pointer"
                                  title="Edit User"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => setDeleteTarget(u)}
                                  className="text-gray-400 hover:text-red-500 p-1.5 rounded transition-colors cursor-pointer"
                                  title="Hapus User"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </Can>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 text-sm text-gray-500">
                <span>
                  Menampilkan {startIndex} sampai {endIndex} dari {filteredUsers.length} user
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-2 py-1 cursor-pointer ${currentPage === 1 ? "text-gray-300 cursor-not-allowed" : "hover:text-gray-800"}`}
                  >
                    Sebelumnya
                  </button>

                  {getPaginationRange(currentPage, totalPages).map((p, idx) =>
                    p === "..." ? (
                      <span key={`dots-${idx}`} className="px-2">...</span>
                    ) : (
                      <button
                        key={`page-${p}`}
                        onClick={() => goToPage(p as number)}
                        className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                          p === currentPage
                            ? "bg-[#0F4C81] text-white"
                            : "hover:bg-gray-200 text-gray-600"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-2 py-1 cursor-pointer ${currentPage === totalPages ? "text-gray-300 cursor-not-allowed" : "hover:text-gray-800"}`}
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            </div>
            </React.Fragment>
          )}
          </React.Fragment>
        )}
        </main>
      </div>

      {/* MODALS */}
      <AddUserModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddUserSave}
      />

      <EditUserModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        user={editTarget}
        onSave={handleEditUserSave}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Pengguna Ini?"
        message="Apakah Anda yakin ingin menghapus data pengguna ini? Data yang telah Anda hapus tidak dapat dikembalikan!"
      />
    </div>
  );
};

export default Users;
