import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AppUser } from "../types/user";
import apiClient from "../services/apiClient";
import { getAdminUsers, getUserDetail as getUserDetailApi, renewUserToken, ROLE_UUID_MAP } from "../api/user";
import { getErrorMessage } from "../lib/utils";
import { appUserSchema, validateList } from "../schemas";

// Extract users from response
const extractUsers = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  const data = payload?.data ?? payload;
  return data?.items ?? data?.users ?? data?.user ?? data?.data ?? [];
};

// Normalize role from backend response
const normalizeRole = (roleData: any): AppUser["role"] => {
  const fromUUID = (id: string) => ROLE_UUID_MAP[id];
  const fromName = (v: string) => {
    v = v.toLowerCase();
    if (v.includes("admin")) return "Admin";
    if (v.includes("hr")) return "HR";
    if (v.includes("ob") || v.includes("office")) return "OB";
    return "Karyawan";
  };
  return fromUUID(roleData?.role_id ?? roleData?.id) ?? fromName(roleData?.nama_role ?? roleData ?? "");
};

// Map API row to AppUser
const mapApiUser = (row: any): AppUser => ({
  id: Number.parseInt(String(row.id ?? "").replace(/\D/g, ""), 10) || Date.now(),
  backendId: String(row.id ?? ""),
  namaLengkap: row.nama_lengkap || row.name || row.username || "Pengguna",
  username: row.username || "-",
  email: row.email || "",
  noTelepon: row.no_telepon || row.phone || "-",
  role: normalizeRole(row.role_id || row.role),
  departemen: row.departemen || "-",
  status: row.is_active === false ? "Non-Aktif" : row.status || "Aktif",
  avatar: row.profile_picture,
  createdAt: row.created_at || new Date().toISOString(),
  tokenStatus: row.is_active === false ? "Expired" : "Aktif",
  tokenExpiredAt: row.token_expired_at || new Date(Date.now() + 86400000).toISOString(),
  tokenString: row.activation_token || "-",
  stats: {
    tasksCompleted: row.stats?.tasksCompleted ?? row.stats?.tasks_completed ?? 0,
    avgResponseMinutes: row.stats?.avgResponseMinutes ?? 0,
    rejected: row.stats?.rejected ?? 0,
  },
  activityLog: [],
});

const USERS_KEY = ["users"] as const;
const OB_KEY = ["ob"] as const;

async function fetchUsers(): Promise<AppUser[]> {
  const data = await getAdminUsers({ page: 1, limit: 100 });
  return validateList(appUserSchema, extractUsers(data).map(mapApiUser), "user");
}

async function fetchOB(): Promise<Array<{ id: string; nama: string }>> {
  const data = await getAdminUsers({ page: 1, limit: 200 });
  return extractUsers(data).map((u: any) => ({
    id: String(u.id ?? ""),
    nama: u.nama_lengkap || u.username || "Pengguna",
  }));
}

export { useUsers };
export default useUsers;
function useUsers() {
  const qc = useQueryClient();
  const [isMutating, setMutating] = useState(false);
  const [mutationError, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: USERS_KEY,
    queryFn: fetchUsers,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: 2,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 30_000),
  });

  const runMutation = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    setMutating(true); setError(null);
    try { const r = await fn(); await qc.invalidateQueries({ queryKey: USERS_KEY }); return r; }
    catch (e: any) { setError(getErrorMessage(e)); throw e; }
    finally { setMutating(false); }
  }, [qc]);

  const addUser = async (p: { namaLengkap: string; email: string; role: string }) => {
    const body = { username: p.email.split("@")[0], email: p.email, nama_lengkap: p.namaLengkap, role_id: p.role };
    return apiClient.post("/api/admin/user", body);
  };

  const updateUser = async (id: string, p: any) => {
    const body: Record<string, any> = {};
    if (p.username) body.username = p.username;
    if (p.email) body.email = p.email;
    if (p.namaLengkap) body.nama_lengkap = p.namaLengkap;
    if (p.role) body.role_id = Object.entries(ROLE_UUID_MAP).find(([, v]) => v === p.role)?.[0];
    if (p.password) body.password = p.password;
    if (p.status) body.is_active = p.status === "Aktif";
    return apiClient.patch(`/api/admin/user/${encodeURIComponent(id)}`, body);
  };

  const deleteUser = (id: string) => apiClient.delete(`/api/admin/user/${encodeURIComponent(id)}`);

  return {
    userList: query.data ?? [],
    isLoading: query.isPending || isMutating,
    error: mutationError ?? (query.error ? getErrorMessage(query.error) : null),
    fetchUsers: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
    fetchOB: () => qc.fetchQuery({ queryKey: OB_KEY, queryFn: fetchOB, staleTime: 30_000 }).catch(() => []),
    addUser: (p: any) => runMutation(() => addUser(p)),
    updateUser: (id: string, p: any) => runMutation(() => updateUser(id, p)),
    deleteUser: (id: string) => runMutation(() => deleteUser(id)),
    renewToken: (id: string, h?: number) => runMutation(() => renewUserToken(id, h)),
    getUserById: (id: number) => query.data?.find((u) => u.id === id),
    getUserDetail: async (id: string) => {
      try { return mapApiUser(await getUserDetailApi(id)); }
      catch { return query.data?.find((u) => u.backendId === id) ?? null; }
    },
  };
}
