import { apiClient, type ApiResponse } from "./client";

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

/**
 * Login user with credentials
 */
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

/**
 * Check if activation token is valid
 */
export async function checkActivationToken(token: string) {
  return apiClient.get<ApiResponse<unknown> | unknown>("/api/auth/check-token", { token });
}

/**
 * Activate account with new password
 */
export async function activateAccount(token: string, payload: ActivateAccountPayload) {
  return apiClient.post<ApiResponse<unknown>>(
    `/api/auth/activate-account?token=${encodeURIComponent(token)}`,
    payload,
    { redirectOnUnauthorized: false },
  );
}
