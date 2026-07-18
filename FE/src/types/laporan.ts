export type StatusLaporan = "Menunggu" | "Ditugaskan" | "Selesai" | "Ditolak";
export type AreaLaporan = "Toilet" | "Lobi" | "Area Kantor" | "Parkir";
export type LevelLaporan = "URGENT" | "STANDARD";

// Interface untuk data laporan yang ditampilkan di frontend
export interface Laporan {
  id: number;
  backendId?: string;
  id_laporan?: string; // Field dari backend service layer (format: LPR-001, etc)
  name: string;
  initial: string;
  karyawanId?: string; // ID karyawan pelapor untuk lookup foto profil dari tabel user
  loc: string; // Lokasi lengkap dalam format string (Gedung - Lantai - Ruangan)
  area: AreaLaporan; // Kategori lokasi (Toilet, Lobi, Area Kantor, Parkir)
  lokasi_id?: string; // ID lokasi untuk grouping di stats
  lantai_id?: string; // ID lantai
  desc: string;
  createdAt: string;
  status: StatusLaporan;
  level: LevelLaporan; // Level prioritas (URGENT atau STANDARD)
  prioritas?: string; // Fallback field untuk prioritas
  foto: string;
  fotoProfil?: string;
  assignedTo?: string;
  ob_id?: string;
  taskId?: string;
}

export const STATUS_COLOR: Record<StatusLaporan, string> = {
  Menunggu: "bg-orange-100 text-orange-600",
  Ditugaskan: "bg-blue-100 text-blue-600",
  Selesai: "bg-green-100 text-green-600",
  Ditolak: "bg-red-100 text-red-600",
};
