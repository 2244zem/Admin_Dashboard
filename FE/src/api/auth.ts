import apiClient from "../services/apiClient";

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
  try {
    const response = await apiClient.post<any>("/api/auth/login", payload);

    // Try to extract data from wrapper
    const data = response?.data ?? response;

    if (!data?.jwt_token) {
      throw new Error(response?.message || "Email/username atau password salah.");
    }

    return { success: true, data };
  } catch (err: any) {
    throw new Error(err?.message || err?.response?.data?.message || "Login gagal. Silakan coba lagi.");
  }
}

/**
 * Check if activation token is valid
 */
export async function checkActivationToken(token: string) {
  const response = await apiClient.get<any>("/api/auth/check-token", { params: { token } });
  return (response as any)?.data ?? response;
}

/**
 * Activate account with new password
 */
export async function activateAccount(token: string, payload: ActivateAccountPayload) {
  const response = await apiClient.post<any>(
    `/api/auth/activate-account?token=${encodeURIComponent(token)}`,
    payload,
  );
  return (response as any)?.data ?? response;
}

/**
 * Logout & revoke current session
 */
export async function logout() {
  try {
    const response = await apiClient.post<any>("/api/auth/logout");
    return (response as any)?.data ?? response;
  } catch (err: any) {
    // Even if API fails, clear local state
    throw new Error(err?.response?.data?.message || "Logout gagal");
  }
}
