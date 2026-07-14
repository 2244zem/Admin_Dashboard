import { useState, useEffect, useCallback } from "react";
import type { AppUser, UserStatus } from "../types/user";
import apiClient from "../services/apiClient";
import { activateUserToken, renewUserToken } from "../api/user";
import { ENDPOINTS } from "../config/endpoints";
import { getErrorMessage, generateToken } from "../lib/utils";

// Map UI status (Indonesian labels) -> backend status value.
// TODO: sesuaikan nilai di kanan dengan enum status yang sebenarnya diterima backend.
const STATUS_TO_BACKEND: Record<UserStatus, string> = {
  Aktif: "Aktif",
  "Non-Aktif": "Non-Aktif",
  Menunggu: "Menunggu",
  "Aktivasi Kadaluwarsa": "Aktivasi Kadaluwarsa",
};

const mockInitialUsers: AppUser[] = [];

const getStoredUsers = (): AppUser[] => {
  const stored = localStorage.getItem("localUsers_v2");
  let list = stored ? JSON.parse(stored) : mockInitialUsers;
  
  // Recalculate dynamic statuses based on expiry date
  const now = Date.now();
  let changed = false;
  
  const updatedList = list.map((u: AppUser) => {
    const isExpired = u.tokenExpiredAt ? new Date(u.tokenExpiredAt).getTime() < now : false;
    let tokenStatus = u.tokenStatus;
    let status = u.status;
    
    if (isExpired && u.role !== "Admin" && tokenStatus !== "Expired") {
      tokenStatus = "Expired";
      status = "Aktivasi Kadaluwarsa";
      changed = true;
    }
    
    if (tokenStatus !== u.tokenStatus || status !== u.status) {
      return { ...u, tokenStatus, status };
    }
    return u;
  });
  
  if (changed || !stored) {
    localStorage.setItem("localUsers_v2", JSON.stringify(updatedList));
  }
  return updatedList;
};

const setStoredUsers = (users: AppUser[]) => {
  localStorage.setItem("localUsers_v2", JSON.stringify(users));
  window.dispatchEvent(new Event("local-data-changed"));
};

function extractUsers(payload: any): any[] {
  // CRITICAL: Backend can return array directly OR wrapped in object
  // Priority order for extraction:
  
  // 1. If payload itself is already an array -> return it directly
  if (Array.isArray(payload)) {
    console.log("✅ extractUsers: payload is already an array", payload.length);
    return payload;
  }
  
  // 2. Check common wrapper structures
  const data = payload?.data ?? payload;
  
  // Check for items array (paginated format)
  if (Array.isArray(data?.items)) {
    console.log("✅ extractUsers: found data.items", data.items.length);
    return data.items;
  }
  
  // Check if data itself is array
  if (Array.isArray(data)) {
    console.log("✅ extractUsers: data is array", data.length);
    return data;
  }
  
  // Check for other possible formats
  if (Array.isArray(data?.users)) {
    console.log("✅ extractUsers: found data.users", data.users.length);
    return data.users;
  }
  if (Array.isArray(data?.user)) {
    console.log("✅ extractUsers: found data.user", data.user.length);
    return data.user;
  }
  if (Array.isArray(data?.data)) {
    console.log("✅ extractUsers: found data.data", data.data.length);
    return data.data;
  }
  
  console.warn("⚠️ extractUsers: No array found in payload", payload);
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
    console.log(`✅ normalizeRole: Mapped UUID ${roleData.role_id} → ${ROLE_UUID_MAP[roleData.role_id]}`);
    return ROLE_UUID_MAP[roleData.role_id];
  }
  
  // Priority 2: Check if roleData itself is a UUID string
  if (typeof roleData === "string" && ROLE_UUID_MAP[roleData]) {
    console.log(`✅ normalizeRole: Mapped UUID string ${roleData} → ${ROLE_UUID_MAP[roleData]}`);
    return ROLE_UUID_MAP[roleData];
  }
  
  // Priority 3: Try to extract from nested role object
  const nestedRoleId = roleData?.role?.id || roleData?.role?.role_id;
  if (nestedRoleId && ROLE_UUID_MAP[nestedRoleId]) {
    console.log(`✅ normalizeRole: Mapped nested UUID ${nestedRoleId} → ${ROLE_UUID_MAP[nestedRoleId]}`);
    return ROLE_UUID_MAP[nestedRoleId];
  }
  
  // Priority 4: Fallback to name-based matching (for legacy/mock data)
  const value = String(roleData?.nama_role || roleData?.name || roleData || "").toLowerCase();
  if (value.includes("admin")) return "Admin";
  if (value.includes("hr") || value.includes("human resource")) return "HR";
  if (value === "ob" || value.includes("office")) return "OB";
  
  console.warn("⚠️ normalizeRole: Could not map role, defaulting to Karyawan", roleData);
  return "Karyawan";
}

function mapApiUserToAppUser(row: any): AppUser {
  const name = row.nama_lengkap || row.namaLengkap || row.name || row.username || "Pengguna";
  // Backend returns id as either UUID string or numeric value - use whatever backend returns
  const rawId = row.id ?? row.user_id ?? "";
  const backendId = String(rawId);
  const numericId = Number.parseInt(backendId.replace(/\D/g, ""), 10) || Date.now();

  console.log(`👤 Mapping user: ${name} → rawId: ${rawId} (${typeof rawId}) → backendId: ${backendId}`);

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

export function useUsers() {
  const [userList, setUserList] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!import.meta.env.VITE_API_BASE_URL) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        setUserList(getStoredUsers());
        return;
      }

      console.log("🔍 Fetching users from /api/admin/user with params:", { page: 1, limit: 100 });
      
      // Try without parameters first to see all users
      let data = await apiClient.get<any>(`${ENDPOINTS.USERS_LIST}`);
      console.log("✅ Fetched users RAW data (no params):", JSON.stringify(data, null, 2));
      
      let extractedUsers = extractUsers(data);
      console.log("🔍 Extracted users array (no params):", extractedUsers);
      console.log("🔍 Extracted users count (no params):", extractedUsers.length);
      
      // If still empty, try with pagination
      if (extractedUsers.length === 0) {
        console.log("🔄 Trying with pagination params...");
        data = await apiClient.get<any>(`${ENDPOINTS.USERS_LIST}?page=1&limit=100`);
        console.log("✅ Fetched users RAW data (with params):", JSON.stringify(data, null, 2));
        extractedUsers = extractUsers(data);
        console.log("🔍 Extracted users array (with params):", extractedUsers);
      }
      
      if (extractedUsers.length === 0) {
        console.warn("⚠️ Backend returned EMPTY array even without params!");
        console.warn("💡 This means:");
        console.warn("   - No users exist in database, OR");
        console.warn("   - Backend filters out all inactive users, OR");
        console.warn("   - Backend requires user activation before showing in list");
        console.warn("🔧 Solution: Contact backend developer to:");
        console.warn("   1. Check if user was actually created in database");
        console.warn("   2. Add parameter to include inactive users");
        console.warn("   3. Or modify endpoint to return all users regardless of status");
      }
      
      const mappedUsers = extractedUsers.map(mapApiUserToAppUser);
      console.log("✅ Mapped users:", mappedUsers);
      
      setUserList(mappedUsers);
    } catch (err: any) {
      console.error("❌ Failed to fetch users:", err);
      console.error("❌ Error details:", { statusCode: err.statusCode, payload: err.payload });
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchOB = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!import.meta.env.VITE_API_BASE_URL) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const allUsers = getStoredUsers();
        const obUsers = allUsers.filter((u) => u.role === "OB");
        return obUsers.map((u) => ({
          id: String(u.backendId || u.id),
          nama: u.namaLengkap,
        }));
      }

      // Use dedicated endpoint for all OB users without pagination
      console.log("👷 fetchOB: Calling /api/admin/user/all-ob");

      const data: any = await apiClient.get<any>("/api/admin/user/all-ob");
      console.log("👷 fetchOB: RAW response from backend:", JSON.stringify(data, null, 2));

      // Extract users - handles array directly or any nested wrapper shape
      let extracted = extractUsers(data);

      console.log(`✅ fetchOB: Extracted ${extracted.length} OB users`, extracted);

      if (extracted.length === 0) {
        console.warn("⚠️ fetchOB: Backend returned NO OB users!");
      }
      
      const mapped = extracted.map((ob: any) => ({
        id: String(ob.id || ob.user_id || ""),
        nama: ob.nama_lengkap || ob.namaLengkap || ob.name || ob.username || "Pengguna",
      }));
      
      console.log(`✅ fetchOB: Returning ${mapped.length} OB options:`, mapped);
      return mapped;
    } catch (err: any) {
      console.error("❌ fetchOB failed:", err);
      console.error("❌ Error details:", { 
        message: err.message, 
        statusCode: err.statusCode,
        payload: err.payload 
      });
      setError(getErrorMessage(err));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Sync state changes on local-data-changed events
  useEffect(() => {
    const handleLocalChange = () => {
      if (!import.meta.env.VITE_API_BASE_URL) {
        setUserList(getStoredUsers());
      }
    };
    window.addEventListener("local-data-changed", handleLocalChange);
    return () => window.removeEventListener("local-data-changed", handleLocalChange);
  }, []);

  const addUser = async (payload: { namaLengkap: string; email: string; noTelepon: string; role: any }) => {
    setIsLoading(true);
    try {
      if (!import.meta.env.VITE_API_BASE_URL) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const list = getStoredUsers();
        const emailTaken = list.some((u) => u.email.toLowerCase() === payload.email.trim().toLowerCase());
        if (emailTaken) {
          throw new Error("Gagal menyimpan pengguna. Email sudah digunakan.");
        }

        const newUser: AppUser = {
          id: Date.now(),
          namaLengkap: payload.namaLengkap.trim(),
          username: `${payload.namaLengkap.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${payload.role.toLowerCase()}`,
          email: payload.email.trim(),
          noTelepon: payload.noTelepon.trim(),
          role: payload.role,
          departemen: payload.role === "OB" ? "Facility Services" : "Operasional Kantor",
          status: "Menunggu",
          createdAt: new Date().toISOString(),
          tokenStatus: "Aktif",
          tokenExpiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          tokenString: generateToken(payload.role.toUpperCase().slice(0, 2)),
          deviceId: "-",
          appVersion: "-",
          stats: { tasksCompleted: 0, avgResponseMinutes: 0, rejected: 0 },
          activityLog: [],
        };

        const updatedList = [newUser, ...list];
        setStoredUsers(updatedList);
        setUserList(updatedList);
        return { success: true, message: "Pengguna Berhasil Disimpan" };
      }

      // Backend API spec (POST /api/admin/user):
      // Content-Type: application/json
      // Body: { username, email, nama_lengkap, role_id (UUID) }
      const username = payload.email.split("@")[0];
      
      const requestPayload = {
        username,
        email: payload.email,
        nama_lengkap: payload.namaLengkap,
        role_id: payload.role, // MUST be UUID
      };
      
      console.log("🔍 Creating user with payload:", requestPayload);
      console.log("📋 Payload details:", {
        username: `"${requestPayload.username}" (${typeof requestPayload.username})`,
        email: `"${requestPayload.email}" (${typeof requestPayload.email})`,
        nama_lengkap: `"${requestPayload.nama_lengkap}" (${typeof requestPayload.nama_lengkap})`,
        role_id: `"${requestPayload.role_id}" (${typeof requestPayload.role_id})`,
      });

      const res = await apiClient.post<any>(ENDPOINTS.USERS_CREATE, requestPayload);
      console.log(" User created successfully:", res);
      console.log(" Refreshing user list...");
      await fetchUsers();
      console.log(" User list refreshed");
      return res;
    } catch (err: any) {
      console.error(" Failed to create user:", err);
      console.error(" Error details:", {
        message: err.message,
        statusCode: err.statusCode,
        stack: err.stack,
      });
      
      const msg = getErrorMessage(err);
      setError(msg);
      
      // More specific error message for 502
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
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (backendId: string, payload: any) => {
    setIsLoading(true);
    try {
      if (!import.meta.env.VITE_API_BASE_URL) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const list = getStoredUsers();
        const emailTaken = list.some(
          (u) => u.backendId !== backendId && u.email.toLowerCase() === payload.email.trim().toLowerCase()
        );
        if (emailTaken) {
          throw new Error("Gagal menyimpan perubahan. Email sudah digunakan pengguna lain.");
        }

        const updatedList = list.map((u) => {
          if (u.backendId === backendId) {
            let tokenStatus = u.tokenStatus;
            let tokenExpiredAt = u.tokenExpiredAt;
            if (payload.status === "Aktif" && u.status !== "Aktif") {
              tokenStatus = "Aktif";
              tokenExpiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            } else if (payload.status === "Aktivasi Kadaluwarsa") {
              tokenStatus = "Expired";
            }
            return {
              ...u,
              namaLengkap: payload.namaLengkap.trim(),
              username: payload.username.trim(),
              email: payload.email.trim(),
              noTelepon: payload.noTelepon.trim(),
              role: payload.role,
              status: payload.status as UserStatus,
              tokenStatus,
              tokenExpiredAt,
            };
          }
          return u;
        });

        setStoredUsers(updatedList);
        setUserList(updatedList);
        return { success: true, message: "Perubahan Berhasil Disimpan" };
      }

      // Backend expects application/json for PATCH /api/admin/user/{user_id}
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

      // Send both is_active (boolean) and status (string) for account state
      if (payload.status) {
        body.is_active = payload.status === "Aktif";
        body.status = STATUS_TO_BACKEND[payload.status as UserStatus] ?? payload.status;
        console.log("🔍 Setting status:", payload.status, "-> is_active:", body.is_active, "status:", body.status);
      }

      const endpoint = `/api/admin/user/${encodeURIComponent(backendId)}`;
      console.log("🔍 Updating user with backendId:", backendId, "endpoint:", endpoint, "body:", body);

      const responseData = await apiClient.patch<any>(endpoint, body);
      console.log("🔍 PATCH success response:", responseData);

      await fetchUsers();
      return responseData;
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUser = async (backendId: string) => {
    setIsLoading(true);
    try {
      if (!import.meta.env.VITE_API_BASE_URL) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const list = getStoredUsers();
        const updatedList = list.filter((u) => u.backendId !== backendId);
        setStoredUsers(updatedList);
        setUserList(updatedList);
        return;
      }

      console.log("🗑️ Deleting user with backendId:", backendId, "type:", typeof backendId);
      const endpoint = `/api/admin/user/${encodeURIComponent(backendId)}`;
      console.log("🗑️ Full DELETE endpoint:", endpoint);

      await apiClient.delete(endpoint);
      await fetchUsers();
    } catch (err: any) {
      console.error("🗑️ Delete user error:", err);
      console.error("🗑️ Error details:", { statusCode: err?.statusCode, message: err?.message, payload: err?.payload });
      const baseMsg = getErrorMessage(err);
      const code = err?.statusCode ? ` (HTTP ${err.statusCode})` : "";
      const msg = `${baseMsg}${code}`;
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const renewToken = async (backendId: string, hours: number = 24) => {
    setIsLoading(true);
    try {
      if (!import.meta.env.VITE_API_BASE_URL) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const list = getStoredUsers();
        const updatedList = list.map((u) => {
          if (u.backendId !== backendId) return u;
          const now = Date.now();
          const currentExpiry = new Date(u.tokenExpiredAt).getTime();
          const base = u.tokenStatus === "Aktif" && currentExpiry > now ? currentExpiry : now;
          return {
            ...u,
            tokenStatus: "Aktif" as const,
            status: "Aktif" as UserStatus,
            tokenExpiredAt: new Date(base + hours * 60 * 60 * 1000).toISOString(),
          };
        });
        setStoredUsers(updatedList);
        setUserList(updatedList);
        return;
      }

      console.log("🔑 Renewing token for backendId:", backendId, "hours:", hours);

      // Use documented endpoints: prefer renew-token, fall back to activate.
      try {
        await renewUserToken(backendId, hours);
        console.log("✅ Token renewed via /renew-token");
      } catch (renewErr: any) {
        console.log("⚠️ /renew-token failed:", renewErr?.statusCode, renewErr?.message, "- trying /activate");
        await activateUserToken(backendId);
        console.log("✅ Token activated via /activate");
      }

      await fetchUsers();
    } catch (err: any) {
      console.error("❌ renewToken error:", err);
      const msg = getErrorMessage(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserById = (id: number) => {
    return userList.find((u) => u.id === id);
  };

  return {
    userList,
    isLoading,
    error,
    fetchUsers,
    fetchOB,
    addUser,
    updateUser,
    deleteUser,
    renewToken,
    getUserById,
  };
}

export default useUsers;
