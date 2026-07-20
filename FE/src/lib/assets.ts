// Resolve a possibly-relative asset URL (foto bukti, profile picture, uploads)
// against the API origin. In prod, VITE_API_BASE_URL points at the backend.
// In dev, VITE_PROXY_TARGET is the backend the vite proxy forwards to, so we
// use that to build a directly-loadable URL — the proxy only forwards /api, not
// /uploads, so a bare relative path would 404.
const ASSET_ORIGIN =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_PROXY_TARGET ||
  "";

export const ASSET_PLACEHOLDER = "https://placehold.co/160x120?text=Bukti";

export function resolveAssetUrl(url?: string | null): string {
  if (!url) return ASSET_PLACEHOLDER;
  const s = String(url).trim();
  if (/^(https?:|data:|blob:|\/\/)/i.test(s)) return s;
  const base = ASSET_ORIGIN.replace(/\/+$/, "");
  return `${base}${s.startsWith("/") ? s : `/${s}`}`;
}

// Cached user photo lookups (id or lowercased name -> raw photo url).
let _photoMaps: Map<string, string> | null = null;
let _photoMapsTime = 0;
const PHOTO_TTL = 5 * 60_000;

export async function getPhotoMaps(): Promise<Map<string, string>> {
  const now = Date.now();
  if (_photoMaps && now - _photoMapsTime < PHOTO_TTL) return _photoMaps;

  const map = new Map<string, string>();
  try {
    const { getAdminUsers } = await import("../api/user");
    const rows = (await getAdminUsers({ page: 1, limit: 200 })) as Record<string, unknown>[];
    for (const u of rows) {
      const photo = (u as { profile_picture?: unknown }).profile_picture ||
        (u as { foto_profil?: unknown }).foto_profil;
      if (photo) {
        const photoStr = String(photo);
        map.set(String((u as { id?: unknown }).id ?? ""), photoStr);
        map.set(
          String((u as { nama_lengkap?: unknown }).nama_lengkap ?? "").toLowerCase().trim(),
          photoStr,
        );
      }
    }
  } catch {
    // graceful — photos just stay as placeholders
  }
  _photoMaps = map;
  _photoMapsTime = now;
  return map;
}
