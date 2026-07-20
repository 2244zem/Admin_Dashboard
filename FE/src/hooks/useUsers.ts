import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AppUser } from "../types/user";
import apiClient from "../services/apiClient";
import { getAdminUsers, getAllOB, getAllKaryawan, getUserDetail as getUserDetailApi, renewUserToken, ROLE_UUID_MAP, ROLE_NAME_MAP } from "../api/user";
import { getErrorMessage } from "../lib/utils";
import { resolveAssetUrl } from "../lib/assets";
import { appUserSchema, validateList } from "../schemas";
import type { ApiMutationResult } from "../types/api";

// Separate async function so it can be called directly without useCallback dependency chain
async function fetchUserDetail(id: string): Promise<AppUser | null> {
  try {
    const raw = await getUserDetailApi(id);
    const data = (raw as Record<string, unknown>)?.data ?? raw;
    return mapApiUser(data as Record<string, unknown>);
  }
  catch { return null; }
}

// Normalize role from backend response - aligned with spec
const normalizeRole = (roleData: unknown): AppUser["role"] => {
  const r = roleData as { role_id?: unknown; role?: { id?: unknown }; nama_role?: unknown; name?: unknown } | string | null | undefined;
  // Check for UUID in role_id
  if (r && typeof r !== "string" && r.role_id && ROLE_NAME_MAP[String(r.role_id)]) {
    return ROLE_NAME_MAP[String(r.role_id)] as AppUser["role"];
  }
  // Check for UUID directly
  if (typeof r === "string" && ROLE_NAME_MAP[r]) {
    return ROLE_NAME_MAP[r] as AppUser["role"];
  }
  // Check nested role object
  if (r && typeof r !== "string" && r.role && typeof r.role === "object" && "id" in r.role) {
    const nestedId = (r.role as { id?: unknown }).id;
    if (nestedId && ROLE_NAME_MAP[String(nestedId)]) {
      return ROLE_NAME_MAP[String(nestedId)] as AppUser["role"];
    }
  }
  // Fallback to name-based matching
  const value = String(
    (r && typeof r !== "string" ? (r.nama_role ?? r.name) : r) ?? ""
  ).toLowerCase();
  if (value.includes("admin")) return "Admin";
  if (value.includes("hr") || value.includes("human resource")) return "HR";
  if (value.includes("ob") || value.includes("office")) return "OB";
  return "Karyawan";
};

// Map API row to AppUser
const mapApiUser = (row: Record<string, unknown>): AppUser => {
  const stats = row.stats as { tasksCompleted?: unknown; tasks_completed?: unknown; avgResponseMinutes?: unknown; rejected?: unknown } | undefined;
  const roleId = row.role_id as unknown;
  const role = (row.role as unknown) ?? undefined;
  const backendId = String(row.id ?? "");
  // Generate consistent numeric ID from backend UUID (simple hash)
  const id = backendId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return {
    id,
    backendId,
    namaLengkap: String(row.nama_lengkap ?? row.name ?? row.username ?? "Pengguna"),
    username: String(row.username ?? "-"),
    email: String(row.email ?? ""),
    noTelepon: String(row.no_telepon ?? row.phone ?? "-"),
    role: normalizeRole(roleId !== undefined ? { role_id: roleId } : role),
    departemen: String(row.departemen ?? "-"),
    status: row.is_active === false ? "Non-Aktif" : (row.status as AppUser["status"]) ?? "Aktif",
    avatar: row.profile_picture ? resolveAssetUrl(String(row.profile_picture)) : undefined,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    tokenStatus: row.is_active === false ? "Expired" : "Aktif",
    tokenExpiredAt: String(row.token_expired_at ?? new Date(Date.now() + 86400000).toISOString()),
    tokenString: String(row.activation_token ?? "-"),
    stats: {
      tasksCompleted: Number(stats?.tasksCompleted ?? stats?.tasks_completed ?? 0),
      avgResponseMinutes: Number(stats?.avgResponseMinutes ?? 0),
      rejected: Number(stats?.rejected ?? 0),
    },
    activityLog: [],
  };
};

const USERS_KEY = ["users"] as const;
const OB_KEY = ["ob"] as const;
const KARYAWAN_KEY = ["karyawan"] as const;

async function fetchUsers(filters?: { search?: string; role_id?: string }): Promise<AppUser[]> {
  // Forward search + role_id ke API (GET /api/admin/user mendukung keduanya);
  // ambil hingga 1000 row agar filter/pagination bekerja di sisi client.
  const rows = await getAdminUsers({ page: 1, limit: 1000, search: filters?.search, role_id: filters?.role_id });
  const mapped = (rows as Record<string, unknown>[]).map(mapApiUser);
  return validateList(appUserSchema, mapped);
}

async function fetchOB(): Promise<Array<{ id: string; nama: string; isActive: boolean }>> {
  const rows = await getAllOB();
  return (rows as Record<string, unknown>[]).map((u) => ({
    id: String(u.id ?? ""),
    nama: String(u.nama_lengkap ?? u.username ?? "Pengguna"),
    isActive: u.is_active !== false,
  }));
}

async function fetchKaryawan(): Promise<Array<{ id: string; nama: string }>> {
  const rows = await getAllKaryawan();
  return (rows as Record<string, unknown>[]).map((u) => ({
    id: String(u.id ?? ""),
    nama: String(u.nama_lengkap ?? u.username ?? "Pengguna"),
  }));
}

export { useUsers };
export default useUsers;
function useUsers(filters?: { search?: string; role_id?: string }) {
  const qc = useQueryClient();
  const [isMutating, setMutating] = useState(false);
  const [mutationError, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: filters ? [...USERS_KEY, filters] : USERS_KEY,
    queryFn: () => fetchUsers(filters),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: 2,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 30_000),
  });

  const runMutation = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    setMutating(true); setError(null);
    try { const r = await fn(); await qc.invalidateQueries({ queryKey: USERS_KEY }); return r; }
    catch (e: unknown) { setError(getErrorMessage(e)); throw e; }
    finally { setMutating(false); }
  }, [qc]);

  const addUser = async (p: { namaLengkap: string; email: string; role: string }) => {
    const body = { username: p.email.split("@")[0], email: p.email, nama_lengkap: p.namaLengkap, role_id: p.role };
    return apiClient.post<ApiMutationResult>("/api/admin/user", body);
  };

  const updateUser = async (id: string, p: Record<string, unknown>) => {
    const body: Record<string, unknown> = {};
    if (p.username) body.username = p.username;
    if (p.email) body.email = p.email;
    if (p.namaLengkap) body.nama_lengkap = p.namaLengkap;
    // Map role name to UUID if needed
    if (p.role) {
      body.role_id = ROLE_UUID_MAP[String(p.role)] || p.role;
    }
    if (p.password) body.password = p.password;
    // is_active must be a proper boolean, not a string — backend expects boolean (true/false)
    if (p.status) body.is_active = p.status === "Aktif";
    return apiClient.patch<ApiMutationResult>(`/api/admin/user/${encodeURIComponent(id)}`, body);
  };

  const deleteUser = (id: string) => apiClient.delete(`/api/admin/user/${encodeURIComponent(id)}`);

  return {
    userList: query.data ?? [],
    isLoading: query.isPending || isMutating,
    error: mutationError ?? (query.error ? getErrorMessage(query.error) : null),
    fetchUsers: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
    fetchOB: () => qc.fetchQuery({ queryKey: OB_KEY, queryFn: fetchOB, staleTime: 30_000 }).catch(() => []),
    fetchKaryawan: () => qc.fetchQuery({ queryKey: KARYAWAN_KEY, queryFn: fetchKaryawan, staleTime: 30_000 }).catch(() => []),
    addUser: (p: { namaLengkap: string; email: string; role: string }) => runMutation(() => addUser(p)),
    updateUser: (id: string, p: Record<string, unknown>) => runMutation(() => updateUser(id, p)),
    deleteUser: (id: string) => runMutation(() => deleteUser(id)),
    renewToken: (id: string, h?: number) => runMutation(() => renewUserToken(id, h)),
    getUserById: (id: number) => query.data?.find((u) => u.id === id),
    // ponytail: return stable ref (not a wrapping arrow) so consumers'
    // useEffect([..., getUserDetail]) don't re-run every render → fetch/loading loop.
    getUserDetail: fetchUserDetail,
  };
}
