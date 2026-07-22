// Laporan status: backend → UI display
// Values: menunggu (#3F4852), dalam proses (#FF8D28), menunggu persetujuan admin (#00629E), selesai (#22C55E)
export type DisplayStatus = "Menunggu" | "Dalam Proses" | "Menunggu Persetujuan Admin" | "Selesai";

export const STATUS_COLOR: Record<DisplayStatus, { bg: string; text: string }> = {
  "Menunggu": { bg: "bg-[#3F4852]/10", text: "text-[#3F4852]" },
  "Dalam Proses": { bg: "bg-[#FF8D28]/10", text: "text-[#FF8D28]" },
  "Menunggu Persetujuan Admin": { bg: "bg-[#00629E]/10", text: "text-[#00629E]" },
  "Selesai": { bg: "bg-[#22C55E]/10", text: "text-[#22C55E]" },
};

export const STATUS_BANNER_STYLE: Record<DisplayStatus, { bg: string; border: string; text: string; label: string }> = {
  "Menunggu": {
    bg: "bg-[#3F4852]/10",
    border: "border-[#3F4852]/20",
    text: "text-[#3F4852]",
    label: "Menunggu",
  },
  "Dalam Proses": {
    bg: "bg-[#FF8D28]/10",
    border: "border-[#FF8D28]/20",
    text: "text-[#FF8D28]",
    label: "Dalam Proses",
  },
  "Menunggu Persetujuan Admin": {
    bg: "bg-[#00629E]/10",
    border: "border-[#00629E]/20",
    text: "text-[#00629E]",
    label: "Menunggu Persetujuan Admin",
  },
  "Selesai": {
    bg: "bg-[#22C55E]/10",
    border: "border-[#22C55E]/20",
    text: "text-[#22C55E]",
    label: "Selesai",
  },
};
