import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AppUser } from "../types/user";
import apiClient from "../services/apiClient";
import { renewUserToken, getUserDetail as getUserDetailApi } from "../api/user";
import { getErrorMessage } from "../lib/utils";
import { appUserSchema, validateList } from "../schemas";

function extractUsers(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  const data = payload?.data ?? payload;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

// Role UUID mapping — must match actual backend DB UUIDs
const ROLE_UUID_MAP: Record<string, AppUser["role"]> = {
  "dda2c23a-732c-41c5-80ee-b0818345fa25": "Admin",
  "eb89b4f9-635f-4e1e-8916-3a96af4e0c72": "HR",
  "62c0a9d8-afd7-45f5-9cb3-6dc6e8a9b8da": "OB",
  "d25542e0-93ad-4513-87ca-c567319f6187": "Karyawan",
};

function normalizeRole(roleData: any): AppUser["role"] {
  if (roleData?.role_id && ROLE_UUID_MAP[roleData.role_id]) return ROLE_UUID_MAP[roleData.role_id];
  if (typeof roleData === "string" && ROLE_UUID_MAP[roleData]) return ROLE_UUID_MAP[roleData];
  const nestedId = roleData?.role?.id || roleData?.role?.role_id;
  if (nestedId && ROLE_UUID_MAP[nestedId]) return ROLE_UUID_MAP[nestedId];
  const value = String(roleData?.nama_role || roleData?.name || roleData || "").toLowerCase();
  if (value.includes("admin")) return "Admin";
  if (value.includes("hr") || value.includes("human resource")) return "HR";
  if (value === "ob" || value.includes("office")) return "OB";
  return "Karyawan";
}

export function mapApiUserToAppUser(row: any): AppUser {
  const name = row.nama_lengkap || row.namaLengkap || row.name || row.username || "Pengguna";
  const rawId = row.id ?? row.user_id ?? "";
  const backendId = String(rawId);
  // Use backendId as-is for display; numericId only for table key stability
  const numericId = Number.parseInt(backendId.replace(/\D/g, ""), 10) || Date.now();

  return {
    id: numericId,
    backendId,
    namaLengkap: name,
    username: row.username || row.email || "-",
    email: row.email || "",
    noTelepon: row.no_telepon || row.noTelepon || row.phone || "-",
    role: normalizeRole(row.role_id || row.role || row),
    departemen: row.departemen || "-",
    status: row.is_active === false ? "Non-Aktif" : row.status || "Aktif",
    avatar: row.profile_picture || row.avatar,
    createdAt: row.created_at || new Date().toISOString(),
    tokenStatus: row.is_active === false ? "Expired" : "Aktif",
    tokenExpiredAt: row.token_expired_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    tokenString: row.activation_token || "-",
    lastLogin: row.last_login,
    deviceId: row.device_id || "-",
    appVersion: row.app_version || "-",
    stats: {
      tasksCompleted: row.stats?.tasksCompleted || row.stats?.tasks_completed || 0,
      avgResponseMinutes: row.stats?.avgResponseMinutes || row.stats?.avg_response_minutes || 0,
      rejected: row.stats?.rejected || 0,
    },
    activityLog: row.activityLog || row.activity_log || [],
  };
}

const USERS_KEY = ["users"] as const;
const OB_KEY = ["ob"] as const;

async function fetchUsersQuery(): Promise<AppUser[]> {
  const data = await apiClient.get<any>("/api/admin/user");
  const extracted = extractUsers(data);
  return validateList<AppUser>(appUserSchema, extracted.map(mapApiUserToAppUser), "user");
}

async function fetchOBQuery(): Promise<Array<{ id: string; nama: string }>> {
  const data = await apiClient.get<any>("/api/admin/user/all-ob");
  const extracted = extractUsers(data);
  return extracted.map((ob: any) => ({
    id: String(ob.id || ob.user_id || ""),
    nama: ob.nama_lengkap || ob.namaLengkap || ob.name || ob.username || "Pengguna",
  }));
}

const USERS_REFETCH_INTERVAL = 60_000;

export function useUsers() {
  const queryClient = useQueryClient();
  const [isMutating, setIsMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: USERS_KEY,
    queryFn: fetchUsersQuery,
    refetchInterval: USERS_REFETCH_INTERVAL,
    refetchIntervalInBackground: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const userList = query.data ?? [];
  const isLoading = query.isPending || isMutating;
  const error = mutationError ?? (query.error ? getErrorMessage(query.error) : null);

  const fetchUsers = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: USERS_KEY });
  }, [queryClient]);

  const fetchOB = useCallback(async () => {
    try {
      return await queryClient.fetchQuery({ queryKey: OB_KEY, queryFn: fetchOBQuery, staleTime: 60_000 });
    } catch {
      return [];
    }
  }, [queryClient]);

  const runMutation = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      setIsMutating(true);
      setMutationError(null);
      try {
        const result = await fn();
        await queryClient.invalidateQueries({ queryKey: USERS_KEY });
        return result;
      } catch (err: any) {
        const msg = getErrorMessage(err);
        setMutationError(msg);
        throw new Error(msg);
      } finally {
        setIsMutating(false);
      }
    },
    [queryClient]
  );

  const addUser = async (payload: { namaLengkap: string; email: string; noTelepon: string; role: any }): Promise<{ success: boolean; message?: string }> => {
    return apiClient.post<{ success: boolean; message?: string }>("/api/admin/user", {
      username: payload.email.split("@")[0],
      email: payload.email,
      nama_lengkap: payload.namaLengkap,
      role_id: payload.role,
    });
  };

  const updateUser = async (backendId: string, payload: any): Promise<{ success: boolean; message?: string }> => {
    const body: Record<string, unknown> = {};
    if (payload.username) body.username = payload.username;
    if (payload.email) body.email = payload.email;
    if (payload.namaLengkap) body.nama_lengkap = payload.namaLengkap;
    if (payload.role) {
      const roleUUID = Object.entries(ROLE_UUID_MAP).find(([, r]) => r === payload.role)?.[0];
      if (roleUUID) body.role_id = roleUUID;
    }
    if (payload.password) body.password = payload.password;
    if (payload.status) body.is_active = payload.status === "Aktif";

    return apiClient.patch<{ success: boolean; message?: string }>(`/api/admin/user/${encodeURIComponent(backendId)}`, body);
  };

  const deleteUser = async (backendId: string) => {
    await apiClient.delete(`/api/admin/user/${encodeURIComponent(backendId)}`);
  };

  const renewToken = async (backendId: string, hours: number = 24) => {
    await renewUserToken(backendId, hours);
  };

  const getUserById = (id: number) => userList.find((u) => u.id === id);

  // getUserDetail always fetches fresh from API — does NOT depend on userList
  const getUserDetail = useCallback(async (backendId: string): Promise<AppUser | null> => {
    try {
      const userData = await getUserDetailApi(backendId);
      return mapApiUserToAppUser(userData);
    } catch {
      return null;
    }
  }, []);

  return {
    userList,
    isLoading,
    error,
    fetchUsers,
    fetchOB,
    addUser: (payload: any) => runMutation(() => addUser(payload)),
    updateUser: (backendId: string, payload: any) => runMutation(() => updateUser(backendId, payload)),
    deleteUser: (backendId: string) => runMutation(() => deleteUser(backendId)),
    renewToken: (backendId: string, hours?: number) => runMutation(() => renewToken(backendId, hours)),
    getUserById,
    getUserDetail,
  };
}

export default useUsers;
