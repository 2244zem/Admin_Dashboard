import type { UserRole } from "./auth";
export type { UserRole };

export type UserStatus = "Aktif" | "Non-Aktif" | "Menunggu" | "Aktivasi Kadaluwarsa";
export type TokenStatus = "Aktif" | "Expired";

export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "Admin", label: "Admin" },
  { value: "HR", label: "HR" },
  { value: "OB", label: "Office Boy (OB)" },
  { value: "Karyawan", label: "Karyawan" },
];

export const STATUS_USER_COLOR: Record<UserStatus, string> = {
  Aktif: "bg-green-100 text-green-600",
  "Non-Aktif": "bg-gray-100 text-gray-500",
  Menunggu: "bg-orange-100 text-orange-600",
  "Aktivasi Kadaluwarsa": "bg-rose-100 text-rose-500",
};

// TODO: sesuaikan dengan kontrak API asli dari backend
export interface ActivityLogItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  colorDot: "blue" | "yellow" | "green" | "red";
}

// TODO: sesuaikan dengan kontrak API asli dari backend
export interface AppUser {
  id: number;
  backendId?: string;
  namaLengkap: string;
  username: string;
  email: string;
  noTelepon: string;
  role: UserRole;
  departemen: string;
  status: UserStatus;
  avatar?: string;
  createdAt: string; // ISO
  tokenStatus: TokenStatus;
  tokenExpiredAt: string; // ISO
  tokenString: string;
  lastLogin?: string; // ISO
  deviceId?: string;
  appVersion?: string;
  stats: {
    tasksCompleted: number;
    avgResponseMinutes: number;
    rejected: number;
  };
  activityLog: ActivityLogItem[];
}

export const TOKEN_DURATION_OPTIONS = [
  { label: "1 Jam", hours: 1 },
  { label: "3 Jam", hours: 3 },
  { label: "6 Jam", hours: 6 },
  { label: "12 Jam", hours: 12 },
  { label: "24 Jam", hours: 24 },
  { label: "3 Hari", hours: 72 },
  { label: "7 Hari", hours: 168 },
];
