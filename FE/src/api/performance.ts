import apiClient from "../services/apiClient";

export type PerformancePeriod = "harian" | "mingguan" | "bulanan" | "tahunan";

// ── Per-OB performance — GET /api/admin/user/{user_id}/performance/ob ──
export interface ObPerformanceData {
  total_tugas?: number
  tugas_selesai?: number
  kecepatan_rata_rata?: number
  [key: string]: unknown
}

export interface ObPerformanceResponse {
  success: boolean
  message: string
  data: ObPerformanceData
}

export async function getObPerformance(userId: string, period: PerformancePeriod = "mingguan") {
  const res = await apiClient.get<ObPerformanceResponse>(
    `/api/admin/user/${userId}/performance/ob`,
    { params: { period } }
  )
  return res.data ?? (res as unknown as ObPerformanceData)
}

// ── Per-Karyawan performance — GET /api/admin/user/{user_id}/performance/karyawan ──
export interface KaryawanPerformanceData {
  laporan_terkirim: number
  [key: string]: unknown
}

export async function getKaryawanPerformance(userId: string, period: PerformancePeriod = "mingguan") {
  const res = await apiClient.get<{ success: boolean; message: string; data: KaryawanPerformanceData }>(
    `/api/admin/user/${userId}/performance/karyawan`,
    { params: { period } }
  )
  return res.data ?? (res as unknown as KaryawanPerformanceData)
}

// ── Aggregate dashboard (replaces N+1) ─────────────────────────────────────
export interface ObPerformanceDashboard {
  produktivitas: number; // 0-100 percentage
  tugas_diselesaikan: { selesai: number; total: number };
  laporan_menunggu: number;
  perbandingan_ob: Array<{
    ob_id: string;
    nama_ob: string;
    total_tugas: number;
    tugas_selesai: number;
    persentase: number;
  }>;
  tren_laporan_bulanan: Array<{
    bulan: string;
    label: string;
    total: number;
    baru: number;
    pending: number;
    selesai: number;
    dibatalkan: number;
  }>;
}

export async function getObPerformanceDashboard(period: PerformancePeriod = "bulanan") {
  const data = await apiClient.get<{ success: boolean; data: ObPerformanceDashboard }>(
    "/api/admin/ob/performance-dashboard",
    { params: { period } }
  );
  return (data as any)?.data ?? data;
}

// ── Leaderboard ranking ──────────────────────────────────────────────────────
export interface ObRankingItem {
  ob: {
    id: string;
    nama_lengkap: string;
    profile_picture: string | null;
    skills: Array<{ id: string; nama_skill: string; diperoleh_at: string }>;
  };
  total_tugas_claimed: number;
  total_tugas_selesai: number;
  rata_rata_kecepatan: number; // seconds
}

export async function getObRanking() {
  const data = await apiClient.get<{ success: boolean; data: ObRankingItem[] }>(
    "/api/admin/ob/ranking"
  );
  return (data as any)?.data ?? data;
}