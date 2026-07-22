export type StatusTask = "Belum" | "Proses" | "Selesai" | "Delayed";
export type KategoriTugas = "Rutin" | "Tidak Rutin";

export interface Petugas {
  nama: string;
  fotoProfil?: string;
}

export interface Task {
  id: string;
  kategori: string;
  namaTugas: string;
  gedung: string;
  lantai: string;
  lokasiId?: string;
  lantaiId?: string;
  petugas: Petugas;
  waktu: string;
  tanggal: string;
  catatan?: string;
  status: StatusTask;
  jenis?: KategoriTugas; // Untuk membedakan Rutin atau Tidak Rutin
}

export const STATUS_TASK_OPTIONS: StatusTask[] = ["Belum", "Proses", "Selesai", "Delayed"];

export const STATUS_TASK_STYLE: Record<StatusTask, string> = {
  Belum: "bg-indigo-100 text-indigo-500",
  Proses: "bg-yellow-100 text-yellow-600",
  Selesai: "bg-green-100 text-green-600",
  Delayed: "bg-red-100 text-red-600",
};

export const STATUS_TASK_LABEL: Record<StatusTask, string> = {
  Belum: "BELUM",
  Proses: "PROSES",
  Selesai: "SELESAI",
  Delayed: "DELAYED",
};