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
  return apiClient.get<unknown>("/api/admin/user", { params });
}

export async function getAllOB() {
  return apiClient.get<ApiOB[]>("/api/admin/user/all-ob");
}

export async function createUser(payload: CreateUserPayload) {
  return apiClient.post<ApiUser>("/api/admin/user", payload);
}

export async function getUserDetail(id: string) {
  return apiClient.get<ApiUser>(`/api/admin/user/${id}`);
}

export async function updateUser(id: string, payload: FormData) {
  return apiClient.patch<ApiUser>(`/api/admin/user/${id}`, payload);
}

export async function deleteUser(id: string) {
  return apiClient.delete(`/api/admin/user/${id}`);
}

export async function renewUserToken(id: string, hours: number = 24) {
  return apiClient.post(`/api/auth/activate-account`, { user_id: id, hours });
}

export async function activateUserToken(id: string) {
  return renewUserToken(id);
}
