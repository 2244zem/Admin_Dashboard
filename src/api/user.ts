import { apiClient, unwrapData, type ApiResponse, type QueryParams } from "./client";

export interface AdminUsersParams extends QueryParams {
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
  const response = await apiClient.get<ApiResponse<any> | any>("/api/admin/user", params);
  return unwrapData(response);
}

export async function getAllOB() {
  const response = await apiClient.get<ApiResponse<ApiOB[]> | ApiOB[]>("/api/admin/user/all-ob");
  return unwrapData(response);
}

export async function createUser(payload: CreateUserPayload) {
  const response = await apiClient.post<ApiResponse<ApiUser> | ApiUser>("/api/admin/user", payload);
  return unwrapData(response);
}

export async function getUserDetail(id: string) {
  const response = await apiClient.get<ApiResponse<ApiUser> | ApiUser>(`/api/admin/user/${id}`);
  return unwrapData(response);
}

export async function updateUser(id: string, payload: FormData) {
  const response = await apiClient.patch<ApiResponse<ApiUser> | ApiUser>(`/api/admin/user/${id}`, payload);
  return unwrapData(response);
}

export async function deleteUser(id: string) {
  const response = await apiClient.delete<ApiResponse<unknown> | unknown>(`/api/admin/user/${id}`);
  return unwrapData(response);
}
