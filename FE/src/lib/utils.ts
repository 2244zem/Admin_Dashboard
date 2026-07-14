export function formatWaktu(createdAt: string): string {
  if (!createdAt) return "";
  return new Date(createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export function waktuKategori(createdAt: string): "Hari Ini" | "Kemarin" | "Lebih Lama" {
  if (!createdAt) return "Lebih Lama";
  const date = new Date(createdAt);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return "Hari Ini";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Kemarin";
  return "Lebih Lama";
}

export function timeAgo(createdAt: string): string {
  if (!createdAt) return "";
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit yang lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam yang lalu`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} hari yang lalu`;
}

export function formatTanggal(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatTanggalWaktuWIB(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const tgl = d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  const jam = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${tgl}, ${jam} WIB`;
}

export function formatTanggalWaktuAMPM(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const tgl = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  const jam = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  return `${tgl}, ${jam}`;
}

export function generateToken(prefix: string = "LPR"): string {
  const seg = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${seg()}-${seg()}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;
}

export function getErrorMessage(error: any): string {
  if (typeof error === "string") return error;
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.message) return error.message;
  return "Terjadi kesalahan yang tidak diketahui.";
}
