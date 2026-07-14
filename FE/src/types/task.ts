export type StatusTask = "Belum" | "Proses" | "Selesai" | "Delayed";

// TODO: sesuaikan dengan kontrak API asli dari backend
export interface Petugas {
  nama: string;
}

// TODO: sesuaikan dengan kontrak API asli dari backend
export interface Task {
  id: string;
  kategori: string;
  namaTugas: string;
  gedung: string;
  lantai: string;
  petugas: Petugas;
  waktu: string;
  tanggal: string; // yyyy-mm-dd
  catatan?: string;
  status: StatusTask;
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