import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AppUser, UserStatus } from "../types/user";
import apiClient from "../services/apiClient";
import { activateUserToken, renewUserToken, getUserDetail as getUserDetailApi } from "../api/user";
import { ENDPOINTS } from "../config/endpoints";
import { getErrorMessage } from "../lib/utils";
import { appUserSchema, validateList } from "../schemas";

// Map UI status (Indonesian labels) -> backend status value.
// TODO: sesuaikan nilai di kanan dengan enum status yang sebenarnya diterima backend.
const STATUS_TO_BACKEND: Record<UserStatus, string> = {
  Aktif: "Aktif",
  "Non-Aktif": "Non-Aktif",
  Menunggu: "Menunggu",
  "Aktivasi Kadaluwarsa": "Aktivasi Kadaluwarsa",
};

function extractUsers(payload: any): any[] {
  // CRITICAL: Backend can return array directly OR wrapped in object
  // Priority order for extraction:

  // 1. If payload itself is already an array -> return it directly
  if (Array.isArray(payload)) {
    return payload;
  }

  // 2. Check common wrapper structures
  const data = payload?.data ?? payload;

  // Check for items array (paginated format)
  if (Array.isArray(data?.items)) {
    return data.items;
  }

  // Check if data itself is array
  if (Array.isArray(data)) {
    return data;
  }

  // Check for other possible formats
  if (Array.isArray(data?.users)) {
    return data.users;
  }
  if (Array.isArray(data?.user)) {
    return data.user;
  }
  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

// Role UUID mapping from backend database
const ROLE_UUID_MAP: Record<string, AppUser["role"]> = {
  "dda2c23a-732c-41c5-80ee-b0818345fa25": "Admin",
  "eb89b4f9-635f-4e1e-8916-3a96af4e0c72": "HR",
  "62c0a9d8-afd7-45f5-9cb3-6dc6e8a9b8da": "OB",
  "d25542e0-93ad-4513-87ca-c567319f6187": "Karyawan",
};

function normalizeRole(roleData: any): AppUser["role"] {
  // Priority 1: Check if we have a role_id (UUID) and map it directly
  if (roleData?.role_id && ROLE_UUID_MAP[roleData.role_id]) {
    return ROLE_UUID_MAP[roleData.role_id];
  }

  // Priority 2: Check if roleData itself is a UUID string
  if (typeof roleData === "string" && ROLE_UUID_MAP[roleData]) {
    return ROLE_UUID_MAP[roleData];
  }

  // Priority 3: Try to extract from nested role object
  const nestedRoleId = roleData?.role?.id || roleData?.role?.role_id;
  if (nestedRoleId && ROLE_UUID_MAP[nestedRoleId]) {
    return ROLE_UUID_MAP[nestedRoleId];
  }

  // Priority 4: Fallback to name-based matching (for legacy/mock data)
  const value = String(roleData?.nama_role || roleData?.name || roleData || "").toLowerCase();
  if (value.includes("admin")) return "Admin";
  if (value.includes("hr") || value.includes("human resource")) return "HR";
  if (value === "ob" || value.includes("office")) return "OB";

  return "Karyawan";
}

function mapApiUserToAppUser(row: any): AppUser {
  const name = row.nama_lengkap || row.namaLengkap || row.name || row.username || "Pengguna";
  // Backend returns id as either UUID string or numeric value - use whatever backend returns
  const rawId = row.id ?? row.user_id ?? "";
  const backendId = String(rawId);
  const numericId = Number.parseInt(backendId.replace(/\D/g, ""), 10) || Date.now();

  // Pass entire row to normalizeRole so it can access role_id
  const mappedRole = normalizeRole(row.role_id || row.role || row);

  return {
    id: numericId,
    backendId,
    namaLengkap: name,
    username: row.username || row.email || "-",
    email: row.email || "",
    noTelepon: row.no_telepon || row.noTelepon || row.phone || "-",
    role: mappedRole,
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
  // Always fetch from the real backend (no mock fallback).
  let data = await apiClient.get<any>(`${ENDPOINTS.USERS_LIST}`);
  let extractedUsers = extractUsers(data);

  if (extractedUsers.length === 0) {
    data = await apiClient.get<any>(`${ENDPOINTS.USERS_LIST}?page=1&limit=100`);
    extractedUsers = extractUsers(data);
  }

  const mappedUsers = extractedUsers.map(mapApiUserToAppUser);
  return validateList<AppUser>(appUserSchema, mappedUsers, "user");
}

async function fetchOBQuery(): Promise<Array<{ id: string; nama: string }>> {
  const data: any = await apiClient.get<any>("/api/admin/user/all-ob");
  const extracted = extractUsers(data);
  return extracted.map((ob: any) => ({
    id: String(ob.id || ob.user_id || ""),
    nama: ob.nama_lengkap || ob.namaLengkap || ob.name || ob.username || "Pengguna",
  }));
}

// Polling interval: 30 detik (lebih manusiawi, tidak DDoS-like)
const USERS_REFETCH_INTERVAL = 30_000;

export function useUsers() {
  const queryClient = useQueryClient();
  const [isMutating, setIsMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const query = useQuery({
    queryKey: USERS_KEY,
    queryFn: fetchUsersQuery,
    // Polling lebih lambat (30 detik) untuk mencegah DDoS
    refetchInterval: USERS_REFETCH_INTERVAL,
    // Jangan refetch saat tab tidak aktif (hemat resources)
    refetchIntervalInBackground: false,
    // Retry dengan backoff exponential
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const userList = query.data ?? [];
  const isLoading = query.isPending || isMutating;
  const error = mutationError ?? (query.error ? getErrorMessage(query.error) : null);

  // Sync state changes on local-data-changed events (local mock mode)
  useEffect(() => {
    const handleLocalChange = () => {
      if (!import.meta.env.VITE_API_BASE_URL) {
        queryClient.invalidateQueries({ queryKey: USERS_KEY });
      }
    };
    window.addEventListener("local-data-changed", handleLocalChange);
    return () => window.removeEventListener("local-data-changed", handleLocalChange);
  }, [queryClient]);

  const fetchUsers = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: USERS_KEY });
  }, [queryClient]);

  const fetchOB = useCallback(async () => {
    try {
      return await queryClient.fetchQuery({
        queryKey: OB_KEY,
        queryFn: fetchOBQuery,
        staleTime: 30_000,
      });
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

  const addUser = async (payload: { namaLengkap: string; email: string; noTelepon: string; role: any }) => {
    try {
      const username = payload.email.split("@")[0];

      const requestPayload = {
        username,
        email: payload.email,
        nama_lengkap: payload.namaLengkap,
        role_id: payload.role, // MUST be UUID
      };

      const res = await apiClient.post<any>(ENDPOINTS.USERS_CREATE, requestPayload);
      return res;
    } catch (err: any) {
      // More specific error message for 502
      const msg = getErrorMessage(err);
      if (msg.includes("502") || msg.includes("Bad Gateway")) {
        throw new Error(
          "Backend server error (502 Bad Gateway).\n\n" +
          "Kemungkinan penyebab:\n" +
          "- Backend crash saat memproses request\n" +
          "- Database constraint violation\n" +
          "- Validation error di backend\n\n" +
          "Solusi:\n" +
          "- Cek backend logs untuk error detail\n" +
          "- Pastikan database connection aktif\n" +
          "- Verifikasi endpoint POST /api/admin/user berfungsi dengan benar"
        );
      }

      throw new Error(msg);
    }
  };

  const updateUser = async (backendId: string, payload: any) => {
    try {
      // Backend PATCH /api/admin/user/{user_id} supports:
      // username, email, password, nama_lengkap, role_id, profile_picture
      // Note: is_active/status support tergantung implementasi backend
      const body: Record<string, unknown> = {};
      if (payload.username) body.username = payload.username;
      if (payload.email) body.email = payload.email;
      if (payload.namaLengkap) body.nama_lengkap = payload.namaLengkap;
      // Map role name (Admin/OB/HR/Karyawan) back to UUID for API
      if (payload.role) {
        const roleUUID = Object.entries(ROLE_UUID_MAP).find(([, r]) => r === payload.role)?.[0];
        if (roleUUID) body.role_id = roleUUID;
      }
      // Only send password if provided (avoid resetting to empty)
      if (payload.password) body.password = payload.password;

      // is_active - kirim tapi backend mungkin tidak support
      if (payload.status) {
        body.is_active = payload.status === "Aktif";
      }

      const endpoint = `/api/admin/user/${encodeURIComponent(backendId)}`;

      const responseData = await apiClient.patch<any>(endpoint, body);

      // Check if backend returned success
      if (responseData && responseData.success === false) {
        throw new Error(responseData.message || "Gagal memperbarui pengguna");
      }

      return responseData;
    } catch (err: any) {
      const msg = getErrorMessage(err);
      throw new Error(msg);
    }
  };

  const deleteUser = async (backendId: string) => {
    try {
      const endpoint = `/api/admin/user/${encodeURIComponent(backendId)}`;

      await apiClient.delete(endpoint);
    } catch (err: any) {
      const baseMsg = getErrorMessage(err);
      const code = err?.statusCode ? ` (HTTP ${err.statusCode})` : "";
      const msg = `${baseMsg}${code}`;
      throw new Error(msg);
    }
  };

  const renewToken = async (backendId: string, hours: number = 24) => {
    try {
      await renewUserToken(backendId, hours);
      return;
    } catch (err: any) {
      const msg = getErrorMessage(err);
      throw new Error(msg);
    }
  };

  const getUserById = (id: number) => {
    return userList.find((u) => u.id === id);
  };

  /**
   * Fetch user detail directly from API by backend UUID
   * This is the primary method for UserDetail page to ensure fresh data
   */
  const getUserDetail = useCallback(async (backendId: string): Promise<AppUser | null> => {
    try {
      const response = await getUserDetailApi(backendId);

      // Handle response that might be wrapped in data object
      const userData = (response as any)?.data ?? response;

      if (!userData || typeof userData !== 'object') {
        return null;
      }

      const mappedUser = mapApiUserToAppUser(userData);
      return mappedUser;
    } catch {
      // If API fails, try to find from cached list as fallback
      const cachedUser = userList.find((u) => u.backendId === backendId);
      if (cachedUser) {
        return cachedUser;
      }
      return null;
    }
  }, [userList]);

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
