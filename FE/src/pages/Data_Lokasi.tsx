import { useState } from "react";
import { motion } from "framer-motion";
import useLokasi from "../hooks/useLokasi";
import type { Gedung, Lantai, Ruangan } from "../hooks/useLokasi";
import Can from "../components/auth/Can";
import { Skeleton } from "../components/ui/Skeleton";
import ErrorState from "../components/ui/ErrorState";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import GedungFormModal from "../components/lokasi/GedungFormModal";
import LantaiFormModal from "../components/lokasi/LantaiFormModal";
import RuanganFormModal from "../components/lokasi/RuanganFormModal";
import { useToast } from "../hooks/useToast";

interface GedungFormData { nama: string; kapasitas: string }
interface LantaiFormData { nama: string }
interface RuanganFormData { nama: string }

const DataLokasi = () => {
  const { push } = useToast();
  const {
    gedungList,
    isLoading,
    error,
    fetchGedung,
    createGedung,
    updateGedung,
    deleteGedung,
    createLantai,
    updateLantai,
    deleteLantai,
    createRuangan,
    updateRuangan,
    deleteRuangan,
  } = useLokasi();

  const [selectedGedungId, setSelectedGedungId] = useState<string | null>(null);

  const selectedGedung = gedungList.find((g) => g.id === (selectedGedungId ?? gedungList[0]?.id)) ?? null;


  // ----------------------------------------------------------
  // MODAL: Tambah / Edit Gedung
  // ----------------------------------------------------------
  const [gedungModalOpen, setGedungModalOpen] = useState(false);
  const [gedungModalMode, setGedungModalMode] = useState<"create" | "edit">("create");
  const [editingGedungId, setEditingGedungId] = useState<string | null>(null);
  const [gedungEditData, setGedungEditData] = useState<GedungFormData | null>(null);

  const openCreateGedung = () => {
    setGedungModalMode("create");
    setEditingGedungId(null);
    setGedungEditData(null);
    setGedungModalOpen(true);
  };

  const openEditGedung = (gedung: Gedung) => {
    setGedungModalMode("edit");
    setEditingGedungId(gedung.id);
    setGedungEditData({
      nama: gedung.nama,
      kapasitas: gedung.kapasitas,
    });
    setGedungModalOpen(true);
  };

  const handleSimpanGedung = async (form: GedungFormData) => {
    try {
      if (gedungModalMode === "edit" && editingGedungId) {
        await updateGedung(editingGedungId, form);
        push("success", "Gedung berhasil diperbarui");
      } else {
        await createGedung(form);
        push("success", "Gedung berhasil ditambahkan");
      }
      setGedungModalOpen(false);
    } catch {
      push("error", "Gagal menyimpan gedung");
    }
  };

  // ----------------------------------------------------------
  // MODAL: Konfirmasi Delete Gedung
  // ----------------------------------------------------------
  const [gedungToDelete, setGedungToDelete] = useState<Gedung | null>(null);

  const handleConfirmDeleteGedung = async () => {
    if (!gedungToDelete) return;
    try {
      await deleteGedung(gedungToDelete.id);
      push("success", "Gedung berhasil dihapus");
      if (selectedGedungId === gedungToDelete.id) {
        const remaining = gedungList.filter((g) => g.id !== gedungToDelete.id);
        setSelectedGedungId(remaining[0]?.id ?? null);
      }
      setGedungToDelete(null);
    } catch {
      push("error", "Gagal menghapus gedung");
    }
  };

  // ----------------------------------------------------------
  // MODAL: Tambah / Edit Lantai
  // ----------------------------------------------------------
  const [lantaiModalOpen, setLantaiModalOpen] = useState(false);
  const [lantaiModalMode, setLantaiModalMode] = useState<"create" | "edit">("create");
  const [editingLantaiId, setEditingLantaiId] = useState<string | null>(null);
  const [lantaiEditData, setLantaiEditData] = useState<LantaiFormData | null>(null);

  const openCreateLantai = () => {
    if (!selectedGedung) return;
    setLantaiModalMode("create");
    setEditingLantaiId(null);
    setLantaiEditData(null);
    setLantaiModalOpen(true);
  };

  const openEditLantai = (lantai: Lantai) => {
    setLantaiModalMode("edit");
    setEditingLantaiId(lantai.id);
    setLantaiEditData({ nama: lantai.nama });
    setLantaiModalOpen(true);
  };

  const handleSimpanLantai = async (form: LantaiFormData) => {
    if (!selectedGedung) return;
    try {
      if (lantaiModalMode === "edit" && editingLantaiId) {
        await updateLantai(editingLantaiId, form);
        push("success", "Lantai berhasil diperbarui");
      } else {
        await createLantai(selectedGedung.id, form);
        push("success", "Lantai berhasil ditambahkan");
      }
      setLantaiModalOpen(false);
    } catch {
      push("error", "Gagal menyimpan lantai");
    }
  };

  // ----------------------------------------------------------
  // MODAL: Konfirmasi Delete Lantai
  // ----------------------------------------------------------
  const [lantaiToDelete, setLantaiToDelete] = useState<Lantai | null>(null);

  const handleConfirmDeleteLantai = async () => {
    if (!selectedGedung || !lantaiToDelete) return;
    try {
      await deleteLantai(lantaiToDelete.id);
      push("success", "Lantai berhasil dihapus");
      setLantaiToDelete(null);
    } catch {
      push("error", "Gagal menghapus lantai");
    }
  };

  // ----------------------------------------------------------
  // MODAL: Tambah / Edit Ruangan
  // ----------------------------------------------------------
  const [ruanganModalOpen, setRuanganModalOpen] = useState(false);
  const [ruanganModalMode, setRuanganModalMode] = useState<"create" | "edit">("create");
  const [activeLantaiId, setActiveLantaiId] = useState<string | null>(null);
  const [editingRuanganId, setEditingRuanganId] = useState<string | null>(null);
  const [ruanganEditData, setRuanganEditData] = useState<RuanganFormData | null>(null);

  const openCreateRuangan = (lantaiId: string) => {
    setRuanganModalMode("create");
    setActiveLantaiId(lantaiId);
    setEditingRuanganId(null);
    setRuanganEditData(null);
    setRuanganModalOpen(true);
  };

  const openEditRuangan = (lantaiId: string, ruangan: Ruangan) => {
    setRuanganModalMode("edit");
    setActiveLantaiId(lantaiId);
    setEditingRuanganId(ruangan.id);
    setRuanganEditData({ nama: ruangan.nama });
    setRuanganModalOpen(true);
  };

  const handleSimpanRuangan = async (form: RuanganFormData) => {
    if (!selectedGedung || !activeLantaiId) return;
    try {
      if (ruanganModalMode === "edit" && editingRuanganId) {
        await updateRuangan(editingRuanganId, form);
        push("success", "Ruangan berhasil diperbarui");
      } else {
        await createRuangan(activeLantaiId, form);
        push("success", "Ruangan berhasil ditambahkan");
      }
      setRuanganModalOpen(false);
    } catch {
      push("error", "Gagal menyimpan ruangan");
    }
  };

  // ----------------------------------------------------------
  // MODAL: Konfirmasi Delete Ruangan
  // ----------------------------------------------------------
  const [ruanganToDelete, setRuanganToDelete] = useState<{ lantaiId: string; ruangan: Ruangan } | null>(null);

  const handleConfirmDeleteRuangan = async () => {
    if (!selectedGedung || !ruanganToDelete) return;
    try {
      await deleteRuangan(ruanganToDelete.ruangan.id);
      push("success", "Ruangan berhasil dihapus");
      setRuanganToDelete(null);
    } catch {
      push("error", "Gagal menghapus ruangan");
    }
  };

  return (
    <div className="flex h-screen bg-white font-sans text-gray-800">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* BODY: 2 KOLOM */}
        <main className="flex-1 overflow-hidden flex flex-col md:flex-row gap-6 p-8 bg-white">
          {isLoading && gedungList.length === 0 ? (
            <>
              <div className="w-full md:w-[300px] flex-shrink-0 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
              <div className="flex-1 space-y-3">
                <Skeleton className="h-10 w-48 rounded-lg" />
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            </>
          ) : error ? (
            <ErrorState message={error} onRetry={fetchGedung} />
          ) : (
            <>
              {/* KOLOM KIRI: DAFTAR GEDUNG */}
              <div className="w-full md:w-[300px] flex-shrink-0 flex flex-col overflow-y-auto pr-1">
                <div className="space-y-3">
                  {gedungList.map((gedung) => {
                    const isSelected = gedung.id === selectedGedungId;
                    return (
                      <motion.div
                        key={gedung.id}
                        whileHover={{ y: -1 }}
                        onClick={() => setSelectedGedungId(gedung.id)}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          isSelected
                            ? "border-[#0F4C81] bg-blue-50/40 ring-1 ring-[#0F4C81]"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="h-11 w-11 rounded-lg bg-blue-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#0F4C81]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l8-4v18M13 21V7l6 3v11M9 9v.01M9 12v.01M9 15v.01" />
                          </svg>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{gedung.nama}</p>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Can permission="lokasi:edit">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditGedung(gedung);
                              }}
                              className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-md transition-colors cursor-pointer"
                              title="Edit gedung"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </Can>
                          <Can permission="lokasi:delete">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setGedungToDelete(gedung);
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                              title="Hapus gedung"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </Can>
                        </div>
                      </motion.div>
                    );
                  })}

                  {gedungList.length === 0 && (
                    <div className="flex flex-col items-center justify-center text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
                      <p className="text-sm text-gray-400 font-medium">Belum ada gedung.</p>
                      <p className="text-xs text-gray-400">Klik tombol di bawah untuk menambahkan.</p>
                    </div>
                  )}
                </div>

                <Can permission="lokasi:create">
                  <motion.button
                    onClick={openCreateGedung}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="mt-4 flex items-center justify-center gap-2 bg-[#0F4C81] hover:bg-[#0a355c] text-white text-sm font-semibold px-5 py-3 rounded-xl transition-colors shadow-sm cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Tambah Lokasi</span>
                  </motion.button>
                </Can>
              </div>

              {/* KOLOM KANAN: STRUKTUR LANTAI & RUANGAN */}
              <div className="flex-1 border border-gray-200 rounded-2xl overflow-hidden flex flex-col bg-white">
                {selectedGedung ? (
                  <>
                    {/* Header struktur */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white">
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Struktur</p>
                        <h2 className="text-base font-bold text-gray-800">{selectedGedung.nama}</h2>
                      </div>
                      <Can permission="lokasi:create">
                        <motion.button
                          onClick={openCreateLantai}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          className="flex items-center gap-1.5 text-[#0F4C81] font-semibold text-sm hover:opacity-80 transition-opacity cursor-pointer focus:outline-none"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                          TAMBAH LANTAI
                        </motion.button>
                      </Can>
                    </div>

                    {/* Daftar lantai */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
                      {selectedGedung.lantai && selectedGedung.lantai.length > 0 ? (
                        selectedGedung.lantai.map((lantai) => (
                          <div key={lantai.id} className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                            {/* Header lantai */}
                            <div className="flex items-center justify-between px-4 py-3 bg-gray-100/70">
                              <div className="flex items-center gap-3">
                                <span className="h-7 w-7 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">
                                  {lantai.label}
                                </span>
                                <span className="text-sm font-bold text-gray-800">{lantai.nama}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Can permission="lokasi:edit">
                                  <button
                                    onClick={() => openEditLantai(lantai)}
                                    className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-md transition-colors cursor-pointer"
                                    title="Edit lantai"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                </Can>
                                <Can permission="lokasi:delete">
                                  <button
                                    onClick={() => setLantaiToDelete(lantai)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                    title="Hapus lantai"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </Can>
                              </div>
                            </div>

                            {/* Daftar ruangan */}
                            <div className="divide-y divide-gray-100 bg-white">
                              {lantai.ruangan && lantai.ruangan.length > 0 ? (
                                lantai.ruangan.map((ruangan) => (
                                  <div
                                    key={ruangan.id}
                                    className="flex items-center justify-between px-4 py-3 pl-14 hover:bg-gray-50/50 transition-colors"
                                  >
                                    <span className="text-sm text-gray-600">{ruangan.nama}</span>
                                    <div className="flex items-center gap-1">
                                      <Can permission="lokasi:edit">
                                        <button
                                          onClick={() => openEditRuangan(lantai.id, ruangan)}
                                          className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-md transition-colors cursor-pointer"
                                          title="Edit ruangan"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                          </svg>
                                        </button>
                                      </Can>
                                      <Can permission="lokasi:delete">
                                        <button
                                          onClick={() => setRuanganToDelete({ lantaiId: lantai.id, ruangan })}
                                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                          title="Hapus ruangan"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      </Can>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="px-4 py-3 pl-14 text-sm text-gray-400 italic">
                                  Belum ada ruangan di lantai ini.
                                </div>
                              )}

                              <Can permission="lokasi:create">
                                <button
                                  onClick={() => openCreateRuangan(lantai.id)}
                                  className="w-full text-left px-4 py-3 pl-14 text-sm font-semibold text-[#0F4C81] hover:bg-gray-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                  </svg>
                                  TAMBAH RUANGAN
                                </button>
                              </Can>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center py-16 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l8-4v18M13 21V7l6 3v11" />
                          </svg>
                          <p className="text-sm font-semibold text-gray-500">Gedung ini belum punya lantai.</p>
                          <p className="text-xs text-gray-400 mt-1">Klik "Tambah Lantai" di pojok kanan atas untuk memulai.</p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l8-4v18M13 21V7l6 3v11" />
                    </svg>
                    <p className="text-sm font-semibold text-gray-500">Belum ada gedung dipilih</p>
                    <p className="text-xs text-gray-400 mt-1">Pilih gedung di panel kiri, atau tambahkan gedung baru.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* EXTRACTED LOKASI MODALS */}
      <GedungFormModal
        isOpen={gedungModalOpen}
        onClose={() => setGedungModalOpen(false)}
        onSave={handleSimpanGedung}
        mode={gedungModalMode}
        initialData={gedungEditData}
      />

      <LantaiFormModal
        isOpen={lantaiModalOpen}
        onClose={() => setLantaiModalOpen(false)}
        onSave={handleSimpanLantai}
        mode={lantaiModalMode}
        initialData={lantaiEditData}
        gedungNama={selectedGedung?.nama}
      />

      <RuanganFormModal
        isOpen={ruanganModalOpen}
        onClose={() => setRuanganModalOpen(false)}
        onSave={handleSimpanRuangan}
        mode={ruanganModalMode}
        initialData={ruanganEditData}
        lantaiNama={selectedGedung?.lantai.find((l) => l.id === activeLantaiId)?.nama}
      />

      {/* REFACTORED CONFIRM DIALOGS */}
      <ConfirmDialog
        open={!!gedungToDelete}
        onClose={() => setGedungToDelete(null)}
        onConfirm={handleConfirmDeleteGedung}
        title="Hapus Gedung Ini?"
        message={`${gedungToDelete?.nama} beserta ${gedungToDelete?.lantai?.length || 0} lantai dan seluruh ruangan di dalamnya akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`}
      />

      <ConfirmDialog
        open={!!lantaiToDelete}
        onClose={() => setLantaiToDelete(null)}
        onConfirm={handleConfirmDeleteLantai}
        title="Hapus Lantai Ini?"
        message={`${lantaiToDelete?.nama} beserta ${lantaiToDelete?.ruangan?.length || 0} ruangan di dalamnya akan dihapus permanen.`}
      />

      <ConfirmDialog
        open={!!ruanganToDelete}
        onClose={() => setRuanganToDelete(null)}
        onConfirm={handleConfirmDeleteRuangan}
        title="Hapus Ruangan Ini?"
        message={`${ruanganToDelete?.ruangan?.nama} akan dihapus permanen dari daftar ruangan.`}
      />
    </div>
  );
};

export default DataLokasi;