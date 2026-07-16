// Single source of truth untuk base URL API.
// Kosong = gunakan relative path (vite proxy di dev). Jangan hardcode
// fallback ke localhost agar tidak memecah request di environment lain.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
