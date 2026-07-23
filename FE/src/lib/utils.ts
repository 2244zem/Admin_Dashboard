export function formatWaktu(createdAt: string): string {
  if (!createdAt) return "";
  return new Date(createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const tgl = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
  const jam = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return `${tgl}, ${jam}`;
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

export const AVATAR_COLORS = [
  "bg-blue-100 text-blue-600",
  "bg-green-100 text-green-600",
  "bg-orange-100 text-orange-600",
  "bg-purple-100 text-purple-600",
  "bg-pink-100 text-pink-600",
  "bg-teal-100 text-teal-600",
];

/** Returns 2-letter initials (first letter of first word + first letter of second word). */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Deterministic avatar color from a name string. */
export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface ErrorWithResponse {
  response?: { data?: unknown };
  message?: string;
}

export function getErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  // Response body bisa berupa HTML (mis. proxy/backend mati mengembalikan
  // halaman error). Jangan stringify mentah — tampilkan pesan bersih.
  const err = error as ErrorWithResponse;
  const resp = err?.response;
  if (resp?.data) {
    const data = resp.data;
    if (typeof data === "string") {
      if (data.trim().startsWith("<")) return "Server tidak merespons (cek koneksi backend).";
      return data;
    }
    if (data && typeof data === "object" && "message" in data) {
      const msg = (data as { message?: unknown }).message;
      if (typeof msg === "string") return msg;
    }
  }
  // Axios sering membungkus error jaringan (502/timeout) di .message
  if (err?.message) {
    const msg = String(err.message);
    if (/Network Error|502|Failed to fetch|timeout/i.test(msg)) {
      return "Gagal terhubung ke server. Pastikan backend sedang berjalan.";
    }
    return msg;
  }
  return "Terjadi kesalahan yang tidak diketahui.";
}
