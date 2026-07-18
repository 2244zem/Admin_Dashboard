import apiClient from "../services/apiClient";

export interface LoginPayload { identifier: string; password: string }
export interface LoginResponse { jwt_token: string }
export interface ActivatePayload { password: string; confirmPassword: string }

// Check token validity (GET /api/auth/check-token)
export async function checkActivationToken(token: string) {
  return apiClient.get("/api/auth/check-token", { params: { token } });
}

// Login
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const data = await apiClient.post<{ data: LoginResponse }>("/api/auth/login", payload);
  if (!data?.jwt_token) throw new Error("Email/username atau password salah.");
  return data;
}

// Activate account (POST /api/auth/activate-account?token=...)
export async function activateAccount(token: string, payload: ActivatePayload) {
  return apiClient.post<{ message?: string }>(
    `/api/auth/activate-account?token=${encodeURIComponent(token)}`,
    payload
  );
}

// Logout
export async function logout() {
  try { await apiClient.post("/api/auth/logout"); } catch { /* ignore */ }
}
