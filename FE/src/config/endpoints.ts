export const ENDPOINTS = {
  AUTH_LOGIN: "/api/auth/login",
  AUTH_CHECK_TOKEN: "/api/auth/check-token",
  AUTH_ACTIVATE_ACCOUNT: "/api/auth/activate-account",

  TASKS_LIST: "/api/checklist-harian",
  TASKS_CREATE: "/api/checklist-harian",
  TASKS_UPDATE: (id: string) => `/api/checklist-harian/${id}`,
  TASKS_DELETE: (id: string) => `/api/checklist-harian/${id}`,
  TASKS_STATUS: (id: string) => `/api/checklist-harian/${id}`,

  LAPORAN_LIST: "/api/admin/laporan",
  LAPORAN_DETAIL: (id: string) => `/api/admin/laporan/${id}`,

  LOKASI_GEDUNG_LIST: "/api/lokasi",
  LOKASI_GEDUNG_CREATE: "/api/lokasi",
  LOKASI_GEDUNG_UPDATE: (id: string) => `/api/lokasi/${id}`,
  LOKASI_GEDUNG_DELETE: (id: string) => `/api/lokasi/${id}`,
  LOKASI_LANTAI_LIST: (_gedungId: string) => "/api/lantai",
  LOKASI_LANTAI_CREATE: (_gedungId: string) => "/api/lantai",
  LOKASI_LANTAI_UPDATE: (id: string) => `/api/lantai/${id}`,
  LOKASI_LANTAI_DELETE: (id: string) => `/api/lantai/${id}`,
  LOKASI_RUANGAN_LIST: (_lantaiId: string) => "/api/ruangan",
  LOKASI_RUANGAN_CREATE: (_lantaiId: string) => "/api/ruangan",
  LOKASI_RUANGAN_UPDATE: (id: string) => `/api/ruangan/${id}`,
  LOKASI_RUANGAN_DELETE: (id: string) => `/api/ruangan/${id}`,

  USERS_LIST: "/api/admin/user",
  USERS_CREATE: "/api/admin/user",
  USERS_UPDATE: (id: string) => `/api/admin/user/${id}`,
  USERS_DELETE: (id: string) => `/api/admin/user/${id}`,
  USERS_DETAIL: (id: string) => `/api/admin/user/${id}`,

  NOTIFICATIONS_LIST: "/api/notifikasi",
  NOTIFICATIONS_MARK_READ: (id: string) => `/api/notifikasi/${id}/read`,

  DASHBOARD_STATS: "/api/admin/dashboard",
};
