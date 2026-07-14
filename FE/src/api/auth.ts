import { apiClient, type ApiResponse, TOKEN_KEY } from "./client";

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface LoginData {
  jwt_token: string;
}

export interface ActivateAccountPayload {
  password: string;
  confirmPassword: string;
}

export async function login(payload: LoginPayload) {
  const response = await apiClient.post<ApiResponse<LoginData>>(
    "/api/auth/login",
    payload,
    { redirectOnUnauthorized: false },
  );

  if (!response.success || !response.data?.jwt_token) {
    throw new Error(response.message || "Email/username atau password salah.");
  }

  return response;
}

export async function checkActivationToken(token: string) {
  return apiClient.get<ApiResponse<unknown> | unknown>("/api/auth/check-token", { token });
}

export async function activateAccount(token: string, payload: ActivateAccountPayload) {
  return apiClient.post<ApiResponse<unknown>>(
    `/api/auth/activate-account?token=${encodeURIComponent(token)}`,
    payload,
    { redirectOnUnauthorized: false },
  );
}

export function storeToken(token: string, remember: boolean) {
  const primary = remember ? localStorage : sessionStorage;
  const secondary = remember ? sessionStorage : localStorage;
  primary.setItem(TOKEN_KEY, token);
  secondary.removeItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}
