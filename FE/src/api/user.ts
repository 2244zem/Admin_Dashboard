import apiClient from "../services/apiClient";

export interface AdminUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role_id?: string;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  nama_lengkap: string;
  role_id: string;
}

export type ApiUser = Record<string, any>;
export type ApiOB = Record<string, any>;

export async function getAdminUsers(params?: AdminUsersParams) {
  const response = await apiClient.get<any>("/api/admin/user", { params });
  return (response as any)?.data ?? response;
}

export async function getAllOB() {
  const response = await apiClient.get<any>("/api/admin/user/all-ob");
  return (response as any)?.data ?? response;
}

export async function createUser(payload: CreateUserPayload) {
  const response = await apiClient.post<any>("/api/admin/user", payload);
  return (response as any)?.data ?? response;
}

export async function getUserDetail(id: string) {
  const response = await apiClient.get<any>(`/api/admin/user/${id}`);
  return (response as any)?.data ?? response;
}

export async function updateUser(id: string, payload: FormData) {
  const response = await apiClient.patch<any>(`/api/admin/user/${id}`, payload);
  return (response as any)?.data ?? response;
}

export async function deleteUser(id: string) {
  const response = await apiClient.delete(`/api/admin/user/${id}`);
  return response;
}

/**
 * Renew activation token via admin
 * POST /api/auth/activate-account - regenerate token for user
 */
export async function renewUserToken(id: string, hours: number = 24) {
  // For admin renew token, send user_id and hours in body
  const response = await apiClient.post<any>(`/api/auth/activate-account`, {
    user_id: id,
    hours,
  });
  return response;
}

/**
 * @deprecated Use renewUserToken instead - same endpoint
 */
export async function activateUserToken(id: string) {
  return renewUserToken(id);
}
