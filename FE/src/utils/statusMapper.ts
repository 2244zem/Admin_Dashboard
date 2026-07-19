/**
 * Status display styles for laporan (report) UI.
 * Enum <-> display mapping lives in a single place: src/hooks/useLaporan.ts
 * (statusToBackend / mapStatus). Do NOT re-add a mapper here.
 */

export type DisplayStatus = "Menunggu" | "Ditugaskan" | "Selesai" | "Ditolak";

export const STATUS_COLOR: Record<DisplayStatus, { bg: string; text: string }> = {
  Menunggu: { bg: "bg-amber-50", text: "text-amber-700" },
  Ditugaskan: { bg: "bg-blue-50", text: "text-blue-700" },
  Selesai: { bg: "bg-green-50", text: "text-green-700" },
  Ditolak: { bg: "bg-red-50", text: "text-red-700" },
};

export const STATUS_BANNER_STYLE: Record<DisplayStatus, { bg: string; border: string; text: string; label: string }> = {
  Menunggu: {
    bg: "bg-amber-50",
    border: "border-amber-100",
    text: "text-amber-700",
    label: "Menunggu Konfirmasi",
  },
  Ditugaskan: {
    bg: "bg-blue-50",
    border: "border-blue-100",
    text: "text-blue-700",
    label: "Sedang Dikerjakan",
  },
  Selesai: {
    bg: "bg-green-50",
    border: "border-green-100",
    text: "text-green-700",
    label: "Selesai Dikerjakan",
  },
  Ditolak: {
    bg: "bg-red-50",
    border: "border-red-100",
    text: "text-red-700",
    label: "Ditolak",
  },
};
