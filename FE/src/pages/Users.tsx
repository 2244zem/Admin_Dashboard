import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import useUsers from "../hooks/useUsers";
import useRoles from "../hooks/useRoles";
import { useToast } from "../hooks/useToast";
import AddUserModal from "../components/AddUserModal";
import type { AddUserPayload } from "../components/AddUserModal";
import EditUserModal from "../components/EditUserModal";
import type { EditUserPayload } from "../components/EditUserModal";
import { STATUS_USER_COLOR } from "../types/user";
import type { AppUser } from "../types/user";
import { StatCardsSkeleton, TableSkeleton, Skeleton } from "../components/ui/Skeleton";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import Can from "../components/auth/Can";
import Avatar from "../components/ui/Avatar";

const ITEMS_PER_PAGE = 3;

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

// ---------- Action Menu (titik tiga) ----------
function RowActionMenu({
  onDetail,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}: {
  onDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer dark:bg-elevated"
        title="Aksi"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1 z-20 w-36 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden dark:bg-surface"
          >
            <button
              onClick={() => { setOpen(false); onDetail(); }}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer dark:bg-surface"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Lihat Detail
            </button>
            <div className="h-px bg-gray-100 dark:bg-elevated" />
            {canEdit && (
              <>
                <button
                  onClick={() => { setOpen(false); onEdit(); }}
                  className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-yellow-600 hover:bg-yellow-50 transition-colors cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                <div className="h-px bg-gray-100 dark:bg-elevated" />
              </>
            )}
            {canDelete && (
              <button
                onClick={() => { setOpen(false); onDelete(); }}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Hapus
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const Users = () => {
  const { push } = useToast();
  const navigate = useNavigate();

  // --- Filter draft vs applied ---
  const [searchDraft, setSearchDraft] = useState("");
  const [roleDraft, setRoleDraft] = useState("Semua Role");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedRole, setAppliedRole] = useState("");

  const { roles: roleOptions } = useRoles();
  const roleUuidMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of roleOptions) {
      let label = r.nama_role.charAt(0).toUpperCase() + r.nama_role.slice(1);
      if (label.toLowerCase() === "ob") label = "OB";
      if (label.toLowerCase() === "hr") label = "HR";
      map[label] = r.id;
    }
    return map;
  }, [roleOptions]);

  // Search + role filter dijalankan di server (GET /api/admin/user?search=&role_id=)
  const userFilters = useMemo(
    () => ({
      search: appliedSearch,
      role_id: appliedRole && appliedRole !== "Semua Role" ? (roleUuidMap[appliedRole] ?? appliedRole) : undefined,
    }),
    [appliedSearch, appliedRole, roleUuidMap]
  );

  const { userList, isLoading, error, fetchUsers, addUser, updateUser, deleteUser } = useUsers(userFilters);

  const handleApplyFilter = () => {
    setAppliedSearch(searchDraft);
    setAppliedRole(roleDraft);
    setCurrentPage(1);
  };

  const handleResetFilter = () => {
    setSearchDraft("");
    setRoleDraft("Semua Role");
    setAppliedSearch("");
    setAppliedRole("");
    setCurrentPage(1);
  };

  // --- Pagination ---
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(userList.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return userList.slice(start, start + ITEMS_PER_PAGE);
  }, [userList, currentPage]);

  const startIndex = userList.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, userList.length);

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

  const handleAddUserSave = async (payload: AddUserPayload) => {
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

  const handleEditUserSave = async (payload: EditUserPayload) => {
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
    <div className="flex h-screen bg-white font-sans text-gray-800 dark:bg-base dark:text-ink">
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto bg-white p-8 dark:bg-base">
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
              <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 dark:bg-elevated">
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
          <div className="border border-gray-200 rounded-xl p-5 mb-6 flex flex-wrap md:flex-nowrap gap-4 items-end bg-gray-50/50 dark:bg-surface">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Cari User</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Nama Lengkap / Username..."
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  className="w-full bg-white text-gray-800 text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none border border-gray-200 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100 transition-all duration-200 dark:bg-surface"
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
                  onChange={(e) => setRoleDraft(e.target.value)}
                  className="w-full bg-white text-gray-800 text-sm rounded-xl pl-4 pr-10 py-2.5 outline-none border border-gray-200 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100 transition-all duration-200 appearance-none cursor-pointer dark:bg-surface"
                >
                  <option value="Semua Role">Semua Role</option>
                  {roleOptions.map((r) => {
                    let label = r.nama_role.charAt(0).toUpperCase() + r.nama_role.slice(1);
                    if (label.toLowerCase() === "ob") label = "OB";
                    if (label.toLowerCase() === "hr") label = "HR";
                    return <option key={r.id} value={label}>{label}</option>;
                  })}
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
                className="border border-gray-200 bg-white text-gray-500 hover:text-gray-800 text-sm font-semibold rounded-xl px-5 py-2.5 transition-colors cursor-pointer dark:bg-surface"
              >
                Reset
              </button>
            </div>
          </div>

          {userList.length === 0 ? (
            <EmptyState
              title="Pengguna Tidak Ditemukan"
              description="Tidak ada pengguna yang sesuai dengan pencarian atau kriteria penyaringan Anda."
            />
          ) : (
            <React.Fragment>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden mb-6 dark:bg-surface">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="text-[11px] font-bold text-gray-500 uppercase border-b border-gray-200 bg-gray-100/50 dark:bg-elevated">
                    <tr>
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Username</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Status Token</th>
                      <th className="px-6 py-4">Status Akun</th>
                      <th className="px-6 py-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white dark:bg-surface">
                    {paginatedUsers.map((u) => (
                        <motion.tr
                          key={u.id}
                          whileHover={{ backgroundColor: "rgba(15, 76, 129, 0.02)" }}
                          className="transition-colors hover:bg-gray-50 dark:bg-surface"
                        >
                          <td className="px-6 py-4 flex items-center gap-3">
                            <Avatar name={u.namaLengkap} src={u.avatar} size="md" />
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
                            <RowActionMenu
                              onDetail={() => navigate(`/users/${u.backendId}`)}
                              onEdit={() => setEditTarget(u)}
                              onDelete={() => setDeleteTarget(u)}
                              canEdit={u.role === "Admin" || u.role === "HR"}
                              canDelete={u.role === "Admin" || u.role === "HR"}
                            />
                          </td>
                        </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 text-sm text-gray-500 dark:bg-surface">
                <span>
                  Menampilkan {startIndex} sampai {endIndex} dari {userList.length} user
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
