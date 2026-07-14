/**
 * Status mapping between frontend display and backend API enum
 * Backend enum: BELUM_DIKERJAKAN, PENDING, SELESAI, DITOLAK
 * Frontend display: Menunggu, Ditugaskan/Dikerjakan, Selesai, Ditolak
 */

export type ApiStatus = "BELUM_DIKERJAKAN" | "PENDING" | "SELESAI" | "DITOLAK";
export type DisplayStatus = "Menunggu" | "Ditugaskan" | "Selesai" | "Ditolak";

export const STATUS_API_TO_DISPLAY: Record<string, DisplayStatus> = {
  BELUM_DIKERJAKAN: "Menunggu",
  PENDING: "Ditugaskan",
  SELESAI: "Selesai",
  DITOLAK: "Ditolak",
};

export const STATUS_DISPLAY_TO_API: Record<DisplayStatus, ApiStatus> = {
  Menunggu: "BELUM_DIKERJAKAN",
  Ditugaskan: "PENDING",
  Selesai: "SELESAI",
  Ditolak: "DITOLAK",
};

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

/**
 * Convert API status to display status
 */
export function mapApiStatusToDisplay(apiStatus: string | undefined | null): DisplayStatus {
  if (!apiStatus) return "Menunggu";
  const normalized = apiStatus.toUpperCase().replace(/-/g, "_");
  return STATUS_API_TO_DISPLAY[normalized] ?? "Menunggu";
}

/**
 * Convert display status to API status
 */
export function mapDisplayStatusToApi(displayStatus: DisplayStatus): ApiStatus {
  return STATUS_DISPLAY_TO_API[displayStatus];
}
