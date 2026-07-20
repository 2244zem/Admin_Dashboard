import apiClient from "../services/apiClient";
import type { ApiMutationResult } from "../types/api";

// Role UUID mapping - aligned with backend database
export const ROLE_UUID_MAP: Record<string, string> = {
  Admin: "dda2c23a-732c-41c5-80ee-b0818345fa25",
  HR: "eb89b4f9-635f-4e1e-8916-3a96af4e0c72",
  OB: "62c0a9d8-afd7-45f5-9cb3-6dc6e8a9b8da",
  Karyawan: "d25542e0-93ad-4513-87ca-c567319f6187",
};

// Reverse map for converting role name to UUID
export const ROLE_NAME_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(ROLE_UUID_MAP).map(([name, id]) => [id, name])
);

// Admin Users - spec: GET /api/admin/user returns paginated { items: [...] }
export interface AdminUsersResponse {
  success: boolean;
  message: string;
  data: {
    items: Record<string, unknown>[];
    meta: { total_items: number; current_page: number; limit: number; total_pages: number };
  };
}

export async function getAdminUsers(params?: { page?: number; limit?: number; search?: string; role_id?: string }) {
  const response = await apiClient.get<Record<string, unknown>>("/api/admin/user", { params });
  // Try multiple possible response shapes
  const data = response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray((data as Record<string, unknown>)?.items)) return (data as Record<string, unknown>).items;
  if (Array.isArray((data as Record<string, unknown>)?.users)) return (data as Record<string, unknown>).users;
  if (Array.isArray((data as Record<string, unknown>)?.data)) return (data as Record<string, unknown>).data;
  console.warn("[getAdminUsers] Unexpected response shape, returning empty array:", data);
  return [];
}

export async function getAllOB() {
  const response = await apiClient.get<{ success: boolean; data: Record<string, unknown>[] }>("/api/admin/user/all-ob");
  return response?.data ?? [];
}

export async function getAllKaryawan() {
  const response = await apiClient.get<{ success: boolean; data: Record<string, unknown>[] }>("/api/admin/user/all-karyawan");
  return response?.data ?? [];
}

export async function getAllRoles() {
  const response = await apiClient.get<{ success: boolean; data: { id: string; nama_role: string }[] }>("/api/admin/role");
  return response?.data ?? [];
}

export async function createUser(payload: { username: string; email: string; nama_lengkap: string; role_id: string }) {
  return apiClient.post<ApiMutationResult>("/api/admin/user", payload);
}

export async function getUserDetail(id: string) {
  const response = await apiClient.get<unknown>(`/api/admin/user/${id}`);
  return (response as { data?: unknown })?.data ?? response;
}

export async function updateUser(id: string, payload: FormData | Record<string, unknown>) {
  return apiClient.patch<ApiMutationResult>(`/api/admin/user/${id}`, payload);
}

export async function deleteUser(id: string) {
  return apiClient.delete(`/api/admin/user/${id}`);
}

// Renew activation token - POST /api/admin/user/{user_id}/renew-token
export async function renewUserToken(id: string, hours: number = 24) {
  return apiClient.post(`/api/admin/user/${encodeURIComponent(id)}/renew-token`, { hours });
}

export const activateUserToken = renewUserToken;
