export type StatusLaporan = "Menunggu" | "Dalam Proses" | "Menunggu Persetujuan Admin" | "Selesai";
export type AreaLaporan = "Toilet" | "Lobi" | "Area Kantor" | "Parkir";
export type TingkatLaporan = "MENDESAK" | "STANDAR";

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
  tingkat: TingkatLaporan; // Tingkat prioritas (MENDESAK atau STANDAR)
  prioritas?: string; // Fallback field untuk prioritas
  foto: string;
  fotoProfil?: string;
  assignedTo?: string;
  taskId?: string;
}

export const STATUS_COLOR: Record<StatusLaporan, string> = {
  Menunggu: "bg-[#3F4852]/10 text-[#3F4852]",
  "Dalam Proses": "bg-[#FF8D28]/10 text-[#FF8D28]",
  "Menunggu Persetujuan Admin": "bg-[#00629E]/10 text-[#00629E]",
  Selesai: "bg-[#22C55E]/10 text-[#22C55E]",
};
