import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import useUsers from "../hooks/useUsers";
import { useToast } from "../hooks/useToast";
import EditUserModal from "../components/EditUserModal";
import type { EditUserPayload } from "../components/EditUserModal";
import { TOKEN_DURATION_OPTIONS } from "../types/user";
import type { AppUser } from "../types/user";
import { formatTanggal, formatTanggalWaktuWIB, getErrorMessage } from "../lib/utils";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Can from "../components/auth/Can";
import { useObSkills, useSkillDefinitions } from "../hooks/useSkill";
import { getObPerformance, getKaryawanPerformance, getObRanking } from "../api/performance";
import type { ObPerformanceData, KaryawanPerformanceData, ObRankingItem } from "../api/performance";
import { getObAchievements } from "../api/achievement";
import type { ObAchievement } from "../api/achievement";
import { getLaporanHistory, getAdminLaporanDetail, updateAdminLaporan } from "../api/laporan";
import { mapApiLaporanToLaporan, statusToBackend } from "../hooks/useLaporan";
import type { Laporan, StatusLaporan } from "../types/laporan";
import ReportDetailModal from "../components/ReportDetailModal";


const UserDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getUserDetail, renewToken, updateUser, deleteUser } = useUsers();
  const { push } = useToast();

  // === SEMUA HOOKS DI SINI, SEBELUM EARLY RETURNS ===

  // State untuk data user
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);

  // State untuk tab & modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(24);
  const [copiedToken, setCopiedToken] = useState(false);

  // Performance state untuk OB
  const [obPerf, setObPerf] = useState<(ObPerformanceData & KaryawanPerformanceData) | null>(null);
  const [perfLoading, setPerfLoading] = useState(false);
  const [perfError, setPerfError] = useState<string | null>(null);

  // Ranking state untuk OB
  const [obRank, setObRank] = useState<{ rank: number; item: ObRankingItem } | null>(null);

  // Achievement state untuk OB
  const [achievements, setAchievements] = useState<ObAchievement[]>([]);

  // Laporan history untuk karyawan
  const [laporanHistory, setLaporanHistory] = useState<Laporan[]>([]);
  const [laporanHistoryLoading, setLaporanHistoryLoading] = useState(false);

  // Detail modal laporan
  const [detailTarget, setDetailTarget] = useState<Laporan | null>(null);
  const openDetail = async (row: Laporan) => {
    setDetailTarget(row);
    try {
      const raw = await getAdminLaporanDetail(row.backendId || String(row.id));
      setDetailTarget(mapApiLaporanToLaporan(raw as Record<string, unknown>));
    } catch { /* use fallback row data */ }
  };
  const closeDetail = () => setDetailTarget(null);
  const handleDetailStatusChange = async (newStatus: StatusLaporan) => {
    if (!detailTarget) return;
    try {
      await updateAdminLaporan(detailTarget.backendId || String(detailTarget.id), { status: statusToBackend(newStatus) });
      setDetailTarget({ ...detailTarget, status: newStatus });
    } catch { /* non-critical */ }
  };

  // Skill state untuk OB (useObSkills internal enabled guard handles undefined ob_id)
  const { obSkills, assignSkill, refetch: refetchSkills } = useObSkills(user?.backendId);
  const { skillDefinitions } = useSkillDefinitions();
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState("");

  // === FETCH USER DATA ===
  useEffect(() => {
    const loadUserDetail = async () => {
      if (!id) {
        setDetailError("ID pengguna tidak valid");
        setIsLoadingDetail(false);
        return;
      }

      setIsLoadingDetail(true);
      setDetailError(null);

      try {
        const userData = await getUserDetail(id);
        if (userData) {
          setUser(userData);
        } else {
          setDetailError("Pengguna tidak ditemukan");
        }
      } catch (err: unknown) {
        setDetailError(getErrorMessage(err) || "Gagal memuat data pengguna");
      } finally {
        setIsLoadingDetail(false);
      }
    };

    loadUserDetail();
  }, [id, getUserDetail]);

  // === FETCH PERFORMANCE DATA ===
  useEffect(() => {
    if (!user?.backendId) return
    const role = user.role
    setPerfLoading(true)
    setPerfError(null)

    const fn = role === "OB"
      ? getObPerformance(user.backendId, "mingguan")
      : role === "Karyawan"
        ? getKaryawanPerformance(user.backendId, "mingguan")
        : null

    if (!fn) { setPerfLoading(false); return }

    fn.then((data) => setObPerf(data as ObPerformanceData & KaryawanPerformanceData))
      .catch((err) => setPerfError(getErrorMessage(err)))
      .finally(() => setPerfLoading(false))

    if (role === "OB") {
      getObAchievements(user.backendId)
        .then((data) => setAchievements(data as ObAchievement[]))
        .catch(() => { /* non-critical */ })
      getObRanking()
        .then((list: ObRankingItem[]) => {
          const idx = list.findIndex((r: ObRankingItem) => r.ob.id === user.backendId)
          if (idx !== -1) setObRank({ rank: idx + 1, item: list[idx] })
        })
        .catch(() => { /* non-critical */ })
    }

    // Fetch laporan history for all roles
    setLaporanHistoryLoading(true)
    getLaporanHistory({ user_id: user.backendId, limit: 10 })
      .then((data) => setLaporanHistory((data?.items ?? []).map(mapApiLaporanToLaporan)))
      .catch(() => { /* non-critical */ })
      .finally(() => setLaporanHistoryLoading(false))
  }, [user?.backendId, user?.role])

  // === HANDLERS ===
  const handleConfirmDelete = useCallback(async () => {
    if (!user?.backendId) return;
    try {
      await deleteUser(user.backendId);
      push("success", "Pengguna berhasil dihapus");
      navigate("/users");
    } catch (err: unknown) {
      push("error", getErrorMessage(err) || "Gagal menghapus pengguna");
    }
  }, [user, deleteUser, navigate, push]);

  const handleRenewToken = useCallback(async () => {
    if (!user?.backendId) return;
    try {
      await renewToken(user.backendId, selectedDuration);
      push("success", "Token berhasil diperbarui, link aktivasi baru telah dikirim ke email user");
      setShowTokenModal(false);
      const updatedUser = await getUserDetail(user.backendId);
      if (updatedUser) setUser(updatedUser);
    } catch (err: unknown) {
      push("error", getErrorMessage(err) || "Gagal memperpanjang token");
    }
  }, [user, renewToken, selectedDuration, push, getUserDetail]);

  const handleEditSave = useCallback(async (payload: EditUserPayload) => {
    console.log("[handleEditSave] called", payload);
    if (!user?.backendId) { console.log("[handleEditSave] no backendId"); return; }
    try {
      const res = await updateUser(user.backendId, payload);
      if (res && res.success === false) {
        push("error", res.message || "Gagal memperbarui pengguna");
      } else {
        push("success", "Perubahan Berhasil Disimpan");
        setShowEditModal(false);
        // Refresh data user
        const updatedUser = await getUserDetail(user.backendId);
        if (updatedUser) setUser(updatedUser);
      }
    } catch (err: unknown) {
      push("error", getErrorMessage(err) || "Gagal memperbarui pengguna");
    }
  }, [user, updateUser, getUserDetail, push]);

  const handleCopyToken = useCallback(() => {
    if (!user?.tokenString) return;
    navigator.clipboard.writeText(user.tokenString).then(() => {
      setCopiedToken(true);
      push("success", "Disalin");
      setTimeout(() => setCopiedToken(false), 2000);
    });
  }, [user, push]);

  const handleAssignSkill = useCallback(async () => {
    if (!user?.backendId || !selectedSkillId) return;
    try {
      await assignSkill({ ob_id: user.backendId, skill_id: selectedSkillId });
      push("success", "Skill berhasil ditambahkan");
      setShowSkillModal(false);
      setSelectedSkillId("");
      refetchSkills();
    } catch (err: unknown) {
      push("error", getErrorMessage(err) || "Gagal menambahkan skill");
    }
  }, [user, selectedSkillId, assignSkill, refetchSkills, push]);

  // === DERIVED STATE ===
  const isOB = user?.role === "OB";
  const isTokenExpired = user?.tokenStatus === "Expired";

  // === EARLY RETURNS (SETELAH SEMUA HOOKS) ===

  // Loading state
  if (isLoadingDetail) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-surface">
        <LoadingSpinner text="Memuat data detail pengguna..." />
      </div>
    );
  }

  // Error state
  if (detailError || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-surface">
        <div className="text-center">
          <p className="text-gray-500 mb-4 font-semibold">{detailError || "Pengguna tidak ditemukan."}</p>
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

  // === RENDER ===
  return (
    <div className="flex h-screen bg-white font-sans text-gray-800 dark:bg-base dark:text-ink">
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto bg-[#FAFAFA] p-6 dark:bg-base">
          {/* Breadcrumb */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate("/users")}
              className="flex items-center text-sm text-[#0F4C81] font-semibold hover:underline cursor-pointer focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5" />
              </svg>
            </button>
            <div className="text-sm text-gray-500 font-medium select-none">
              <button onClick={() => navigate("/users")} className="hover:text-gray-800 cursor-pointer">Pengguna</button>
              <span className="mx-2">›</span>
              <span className="text-[#0F4C81] font-bold">Detail Pengguna</span>
            </div>
          </div>

          {/* Grid utama */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {isOB ? (
                /* === TAMPILAN PROFIL OB === */
                <div className="relative border border-gray-200 rounded-2xl p-7 bg-white shadow-sm dark:bg-surface">
                  {achievements.length > 0 && (
                    <div className="absolute top-6 right-6 flex flex-wrap gap-1.5">
                      {achievements.slice(0, 2).map((a) => (
                        <span key={a.id} className="bg-[#FEF3C7] text-[#D97706] px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap">
                          {a.nama}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex gap-5">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-xl overflow-hidden shadow-sm">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.namaLengkap} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-3xl font-bold">
                              {user.namaLengkap.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[11px] font-bold px-3 py-0.5 rounded-full border-2 border-white">
                          OB
                        </span>
                      </div>
                      <div className="pt-1">
                        <h2 className="text-2xl font-black text-[#1F2937] tracking-tight uppercase">{user.namaLengkap}</h2>
                        <p className="text-sm font-medium text-gray-500 mb-2">@{user.username || `${user.namaLengkap.toLowerCase()}_OB`}</p>

                        {achievements.map((a) => (
                          <div key={a.id} className="bg-[#382314] text-[#F3E8E0] text-xs font-semibold px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 mb-1.5 mr-1.5 shadow-sm">
                            <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                            </svg>
                            {a.nama}
                          </div>
                        ))}

                        <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                          <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Bergabung {formatTanggal(user.createdAt)}
                          </span>
                           <span className={`flex items-center gap-1.5 ${user.status === "Aktif" ? "text-green-500" : "text-gray-400"}`}>
                             <span className={`h-1.5 w-1.5 rounded-full ${user.status === "Aktif" ? "bg-green-500" : "bg-gray-400"}`}></span>
                             {user.status === "Aktif" ? "Sedang Bertugas" : user.status}
                           </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <hr className="border-gray-100 mb-6" />

                  <div className="grid grid-cols-2 divide-x divide-gray-100">
                    <div className="pr-6">
                      <h3 className="flex items-center gap-2 text-[15px] font-bold text-gray-800 mb-4">
                        <svg className="w-5 h-5 text-[#0F4C81]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Informasi Pribadi
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <svg className="w-4 h-4 text-gray-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Alamat Email</p>
                            <p className="text-sm font-semibold text-gray-800">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <svg className="w-4 h-4 text-gray-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Nomor Telepon</p>
                            <p className="text-sm font-semibold text-gray-800">{user.noTelepon || "-"}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <svg className="w-4 h-4 text-gray-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Jadwal Kerja</p>
                            <p className="text-sm font-semibold text-gray-800">Senin - Jumat, 07:00 - 16:00</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pl-6">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="flex items-center gap-2 text-[15px] font-bold text-gray-800">
                          <svg className="w-5 h-5 text-[#0F4C81]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                          </svg>
                          Skill Spesialisasi
                        </h3>
                        <button
                          onClick={() => setShowSkillModal(true)}
                          className="flex items-center gap-1.5 text-[10px] font-bold text-[#0F4C81] hover:text-[#0c3c68] border border-[#0F4C81] hover:border-[#0c3c68] px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                          </svg>
                          Tambah
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-400 italic mb-4">(Terdeteksi Otomatis Berdasarkan Riwayat)</p>

                      {obSkills.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">Belum ada data spesialisasi.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {obSkills.map((skill) => (
                            <div
                              key={skill.id}
                              className="flex items-center gap-1.5 bg-[#EEF2FF] text-[#4F46E5] px-3 py-1.5 rounded-full text-xs font-semibold border border-[#E0E7FF]"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {skill.nama_skill}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* === TAMPILAN PROFIL KARYAWAN === */
                <div className="border border-gray-200 rounded-2xl p-7 bg-white shadow-sm dark:bg-surface">
                  <div className="flex gap-5 mb-8">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-xl overflow-hidden shadow-sm">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.namaLengkap} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-3xl font-bold">
                            {user.namaLengkap.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#10B981] text-white text-[11px] font-bold px-3 py-0.5 rounded-full border-2 border-white">
                        Karyawan
                      </span>
                    </div>
                    <div className="pt-2">
                      <h2 className="text-2xl font-black text-[#1F2937] tracking-tight uppercase">{user.namaLengkap}</h2>
                      <p className="text-sm font-medium text-gray-500 mb-3">@{user.username}</p>
                      <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Dibuat: {formatTanggal(user.createdAt)}
                        </span>
                        <span className="flex items-center gap-1.5 text-green-500 font-bold">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Aktif
                        </span>
                      </div>
                    </div>
                  </div>

                  <hr className="border-gray-100 mb-6" />

                  <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nama Lengkap</p>
                      <p className="text-sm font-bold text-gray-800 uppercase">{user.namaLengkap}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Username</p>
                      <p className="text-sm font-bold text-gray-800 uppercase">{user.username}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">No Telepon</p>
                      <p className="text-sm font-bold text-gray-800">{user.noTelepon || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email</p>
                      <p className="text-sm font-bold text-gray-800">{user.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* === TABEL SESUAI ROLE === */}
              {isOB ? (
                /* Tabel Detail Laporan untuk OB */
                <div className="border border-gray-200 rounded-2xl bg-white shadow-sm overflow-hidden flex flex-col dark:bg-surface">
                  <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-gray-900">Detail Laporan</h2>
                    <div className="relative">
                      <svg className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Cari laporan..."
                        className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#0F4C81] w-48"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-700">
                      <thead className="text-[10px] font-bold text-gray-500 bg-[#F8FAFC] border-b border-gray-100 uppercase dark:bg-surface">
                        <tr>
                          <th className="px-3 py-2">ID LAPORAN</th>
                          <th className="px-3 py-2">KATEGORI</th>
                          <th className="px-3 py-2">LOKASI</th>
                          <th className="px-3 py-2">TANGGAL</th>
                          <th className="px-3 py-2">STATUS</th>
                          <th className="px-3 py-2 text-center">AKSI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {laporanHistoryLoading ? (
                          <tr><td colSpan={6} className="px-3 py-6 text-center text-xs text-gray-400">Memuat...</td></tr>
                        ) : laporanHistory.length === 0 ? (
                          <tr><td colSpan={6} className="px-3 py-6 text-center text-xs text-gray-400">Belum ada laporan untuk pengguna ini.</td></tr>
                        ) : laporanHistory.map((l) => (
                          <tr key={l.backendId} className="hover:bg-gray-50 transition-colors">
                            <td className="px-3 py-2 font-medium text-gray-800 text-[11px]">{l.id_laporan || `LPR-${l.id}`}</td>
                            <td className="px-3 py-2 text-gray-600">{l.area}</td>
                            <td className="px-3 py-2 text-gray-500">{l.loc}</td>
                            <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{formatTanggal(l.createdAt)}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap ${
                                l.status === "Menunggu" ? "bg-[#3F4852]/10 text-[#3F4852]" :
                                l.status === "Dalam Proses" ? "bg-[#FF8D28]/10 text-[#FF8D28]" :
                                l.status === "Selesai" ? "bg-[#22C55E]/10 text-[#22C55E]" :
                                "bg-[#00629E]/10 text-[#00629E]"
                              }`}>{l.status}</span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button onClick={() => openDetail(l)} className="text-[#0F4C81] text-[10px] font-semibold hover:underline cursor-pointer">Detail</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="border-t border-gray-100 p-3 flex items-center justify-between text-[10px] text-gray-500">
                    <span>{laporanHistory.length === 0 ? "Belum ada laporan" : `${laporanHistory.length} laporan`}</span>
                  </div>
                </div>
              ) : (
                /* Tabel Riwayat Laporan untuk Karyawan */
                <div className="border border-gray-200 rounded-2xl bg-white shadow-sm overflow-hidden flex flex-col dark:bg-surface">
                  <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-gray-900">Riwayat Laporan</h2>
                    <button className="text-[10px] font-bold text-[#0F4C81] hover:underline cursor-pointer">Lihat Semua</button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-700">
                      <thead className="text-[10px] font-bold text-gray-500 bg-[#F8FAFC] border-b border-gray-100">
                        <tr>
                          <th className="px-3 py-2">ID Tugas</th>
                          <th className="px-3 py-2">Deskripsi Tugas</th>
                          <th className="px-3 py-2">Waktu</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {laporanHistoryLoading ? (
                          <tr><td colSpan={5} className="px-3 py-6 text-center text-xs text-gray-400">Memuat...</td></tr>
                        ) : laporanHistory.length === 0 ? (
                          <tr><td colSpan={5} className="px-3 py-6 text-center text-xs text-gray-400">Belum ada riwayat laporan.</td></tr>
                        ) : laporanHistory.map((l) => (
                          <tr key={l.backendId} className="hover:bg-gray-50 transition-colors">
                            <td className="px-3 py-2 font-medium text-gray-800 text-[11px]">{l.id_laporan || `LPR-${l.id}`}</td>
                            <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate">{l.desc}</td>
                            <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{formatTanggal(l.createdAt)}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap ${
                                l.status === "Menunggu" ? "bg-[#3F4852]/10 text-[#3F4852]" :
                                l.status === "Dalam Proses" ? "bg-[#FF8D28]/10 text-[#FF8D28]" :
                                l.status === "Selesai" ? "bg-[#22C55E]/10 text-[#22C55E]" :
                                "bg-[#00629E]/10 text-[#00629E]"
                              }`}>{l.status}</span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button onClick={() => openDetail(l)} className="text-[#0F4C81] text-[10px] font-semibold hover:underline cursor-pointer">Detail</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* KOLOM KANAN */}
            <div className="flex flex-col gap-6">
              
              {/* Metrik Kinerja (Hanya untuk OB) */}
               {isOB && (
                <div className="bg-[#0c6b9d] rounded-2xl p-6 text-white shadow-sm relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 opacity-10">
                    <svg width="150" height="150" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  
                  <h2 className="text-lg font-bold mb-4">Metrik Kinerja</h2>
                  
                  {perfError && (
                    <p className="text-xs text-red-200 mb-2 bg-red-500/20 rounded px-2 py-1">{perfError}</p>
                  )}

                  {perfLoading && !obPerf ? (
                    <div className="space-y-3 animate-pulse">
                      <div className="h-4 w-24 bg-blue-400/30 rounded" />
                      <div className="h-8 w-16 bg-blue-400/30 rounded" />
                      <div className="h-px bg-blue-400/20 my-4" />
                      <div className="h-4 w-32 bg-blue-400/30 rounded" />
                      <div className="h-8 w-20 bg-blue-400/30 rounded" />
                    </div>
                  ) : (
                    <>
                      {obRank && (
                        <div className="flex items-center gap-2 mb-4 bg-white/10 rounded-lg px-3 py-2">
                          <span className="text-lg font-extrabold">#{obRank.rank}</span>
                          <span className="text-[11px] font-medium text-blue-100">Peringkat</span>
                        </div>
                      )}
                      <div className="mb-6">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-100 mb-1">Total Tugas Selesai</p>
                        <p className="text-5xl font-bold">{obRank?.item.total_tugas_selesai ?? obPerf?.tugas_selesai ?? user.stats?.tasksCompleted ?? "-"}</p>
                      </div>

                      <div className="border-t border-blue-400/30 pt-4">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-100 mb-1">Rata-Rata Kecepatan Pengerjaan</p>
                        <p className="text-3xl font-bold">
                          {obRank?.item.rata_rata_kecepatan != null
                            ? `${Math.round(obRank.item.rata_rata_kecepatan / 60)}`
                            : obPerf?.kecepatan_rata_rata != null
                              ? `${Math.round(obPerf.kecepatan_rata_rata / 60)}`
                              : user.stats?.avgResponseMinutes ?? "-"}
                          <span className="text-lg font-medium"> Menit</span>
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Status Token Akses */}
              <div className={`border rounded-2xl p-6 ${isTokenExpired ? "border-red-100 bg-[#FDF7F7]" : "border-gray-200 bg-white"}`}>
                <div className="flex items-center gap-2 mb-5">
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <h3 className="text-sm font-bold text-red-600">Status Token Akses</h3>
                </div>

                <div className="space-y-4 mb-5">
                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 mb-1">Status Saat Ini</p>
                    <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold ${isTokenExpired ? "bg-[#FCE8E8] text-[#C53030]" : "bg-green-100 text-green-700"}`}>
                      {isTokenExpired ? "Expired / Kedaluwarsa" : "Aktif"}
                    </span>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 mb-1">Waktu Kedaluwarsa</p>
                    <p className="text-sm font-bold text-gray-800">{formatTanggalWaktuWIB(user.tokenExpiredAt)}</p>
                  </div>
                  
                  {isTokenExpired && (
                    <p className="text-[10px] text-red-500 italic">
                      Token ini sudah tidak dapat digunakan untuk otentikasi sistem.
                    </p>
                  )}
                </div>

                <button
                  onClick={() => setShowTokenModal(true)}
                  className={`w-full text-center text-xs font-bold py-3 rounded-lg transition-colors cursor-pointer ${
                    isTokenExpired
                      ? "bg-[#FCE8E8] text-[#C53030] hover:bg-red-200"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Lihat detail token
                </button>
              </div>

              {/* Pengaturan Akun */}
              <Can permission="users:all" roles={["Admin", "HR"]} anyOf>
                <div className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm dark:bg-surface">
                  <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4">Pengaturan Akun</h3>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="w-full flex items-center justify-between gap-2 border border-gray-200 text-gray-700 hover:text-gray-900 text-sm font-semibold rounded-xl py-3 px-4 hover:bg-gray-50 transition-colors cursor-pointer shadow-sm dark:bg-surface"
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Edit Data Pengguna
                      </div>
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="w-full flex items-center gap-2 border border-red-200 bg-[#FDF7F7] text-red-600 hover:text-red-700 text-sm font-semibold rounded-xl py-3 px-4 transition-colors cursor-pointer shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Hapus Pengguna
                    </button>
                  </div>
                </div>
              </Can>

              {/* Log Sistem (Mockup visual) */}
              <div className="bg-[#F8F9FA] border border-gray-200 rounded-2xl p-6 text-xs text-gray-500 font-mono">
                <h3 className="flex items-center gap-1.5 font-sans font-bold text-gray-700 mb-4 text-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Log Sistem
                </h3>
                <div className="flex justify-between mb-2">
                  <span>Last Login:</span>
                  <span className="font-bold text-gray-700">N/A</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Device ID:</span>
                  <span className="font-bold text-gray-700">—</span>
                </div>
                <div className="flex justify-between">
                  <span>App Version:</span>
                  <span className="font-bold text-gray-700">—</span>
                </div>
              </div>
              
            </div>
          </div>
        </main>
      </div>

      {/* TOKEN MODAL */}
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
              className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden dark:bg-surface"
            >
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Detail Token</h3>
                <button onClick={() => setShowTokenModal(false)} className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 cursor-pointer dark:bg-elevated">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">Status Token</p>
                  <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${isTokenExpired ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                    {isTokenExpired ? "Expired / Kadaluwarsa" : "Aktif"}
                  </span>
                </div>

                {isTokenExpired && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Aktifkan Kembali untuk:</label>
                    <select
                      value={selectedDuration}
                      onChange={(e) => setSelectedDuration(Number(e.target.value))}
                      className="w-full bg-white text-gray-800 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-200 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer dark:bg-surface"
                    >
                      {TOKEN_DURATION_OPTIONS.map((opt) => (
                        <option key={opt.hours} value={opt.hours}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">String Token</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-200 font-mono text-sm text-gray-700 truncate dark:bg-surface">
                      {user.tokenString || "-"}
                    </div>
                    <button
                      onClick={handleCopyToken}
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer shrink-0 ${
                        copiedToken ? "bg-green-100 text-green-700" : "bg-[#0F4C81] text-white hover:bg-[#0c3c68]"
                      }`}
                    >
                      {copiedToken ? "Disalin" : "Salin"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100 dark:bg-surface">
                <button onClick={() => setShowTokenModal(false)} className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-100 cursor-pointer dark:bg-elevated">
                  Batal
                </button>
                {isTokenExpired && (
                  <button onClick={handleRenewToken} className="px-6 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-[#0c3c68] text-white font-semibold text-sm cursor-pointer">
                    Simpan Perubahan
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ADD SKILL MODAL */}
      <AnimatePresence>
        {showSkillModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setShowSkillModal(false); setSelectedSkillId(""); }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden dark:bg-surface"
            >
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Tambah Skill</h3>
                <button
                  onClick={() => { setShowSkillModal(false); setSelectedSkillId(""); }}
                  className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 cursor-pointer dark:bg-elevated"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-5">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Pilih Skill</label>
                <select
                  value={selectedSkillId}
                  onChange={(e) => setSelectedSkillId(e.target.value)}
                  className="w-full bg-white text-gray-800 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-200 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer dark:bg-surface"
                >
                  <option value="">— Pilih skill —</option>
                  {skillDefinitions
                    .filter((s) => !obSkills.some((ob) => ob.nama_skill === s.nama_skill))
                    .map((s) => (
                      <option key={s.id} value={s.id}>{s.nama_skill}</option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100 dark:bg-surface">
                <button
                  onClick={() => { setShowSkillModal(false); setSelectedSkillId(""); }}
                  className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-100 cursor-pointer dark:bg-elevated"
                >
                  Batal
                </button>
                <button
                  onClick={handleAssignSkill}
                  disabled={!selectedSkillId}
                  className="px-6 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-[#0c3c68] text-white font-semibold text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Tambahkan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDIT MODAL */}
      <EditUserModal
        key={user?.backendId}
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        user={user}
        onSave={handleEditSave}
      />

      {/* DELETE CONFIRM */}
      <ConfirmDialog
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Hapus Akun Pengguna?"
        message={`Apakah Anda yakin ingin menghapus akun ${user?.namaLengkap}? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.`}
      />

      <ReportDetailModal
        laporan={detailTarget}
        onClose={closeDetail}
        onStatusChange={handleDetailStatusChange}
      />
    </div>
  );
};

export default UserDetail;