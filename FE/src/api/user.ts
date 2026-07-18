import apiClient from "../services/apiClient";

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
    items: any[];
    meta: { total_items: number; current_page: number; limit: number; total_pages: number };
  };
}

export async function getAdminUsers(params?: { page?: number; limit?: number; search?: string; role_id?: string }) {
  const response = await apiClient.get<AdminUsersResponse>("/api/admin/user", { params });
  return response?.data?.items ?? [];
}

export async function getAllOB() {
  const response = await apiClient.get<any>("/api/admin/user/all-ob");
  return response?.data ?? response;
}

export async function createUser(payload: { username: string; email: string; nama_lengkap: string; role_id: string }) {
  return apiClient.post("/api/admin/user", payload);
}

export async function getUserDetail(id: string) {
  const response = await apiClient.get<any>(`/api/admin/user/${id}`);
  return response?.data ?? response;
}

export async function updateUser(id: string, payload: FormData | Record<string, any>) {
  return apiClient.patch(`/api/admin/user/${id}`, payload);
}

export async function deleteUser(id: string) {
  return apiClient.delete(`/api/admin/user/${id}`);
}

// Renew activation token - POST /api/auth/activate-account with user_id
export async function renewUserToken(id: string, hours: number = 24) {
  return apiClient.post("/api/auth/activate-account", { user_id: id, hours });
}

export const activateUserToken = renewUserToken;
