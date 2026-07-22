import apiClient from "../services/apiClient";
import type { ApiMutationResult } from "../types/api";

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

// Per CLAUDE.md: GET /api/admin/role returns all roles
export async function getAllRoles() {
  const response = await apiClient.get<{ success: boolean; data: { id: string; nama_role: string; created_at?: string }[] }>("/api/admin/role");
  // Try unwrapping from various response shapes
  const data = response?.data ?? response;
  if (Array.isArray(data)) return data;
  if (Array.isArray((data as Record<string, unknown>)?.items)) return (data as Record<string, unknown>).items;
  return [];
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
