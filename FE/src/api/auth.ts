import apiClient from "../services/apiClient";

// Types - aligned with API spec in CLAUDE.md
export interface LoginPayload { identifier: string; password: string }

export interface LoginResponse {
  success: boolean;
  message: string;
  data: { jwt_token: string };
}

export interface ActivatePayload { password: string; confirmPassword: string }

export interface ActivateResponse {
  success: boolean;
  message: string;
}

// Check token validity (GET /api/auth/check-token?token=...)
export async function checkActivationToken(token: string) {
  return apiClient.get("/api/auth/check-token", { params: { token } });
}

// Login - spec: POST /api/auth/login returns { success, message, data: { jwt_token } }
export async function login(payload: LoginPayload): Promise<string> {
  const response = await apiClient.post<LoginResponse>("/api/auth/login", payload);
  // apiClient.post already unwraps to response.data, so we get { success, message, data: { jwt_token } }
  if (!response?.data?.jwt_token) {
    throw new Error(response?.message || "Email/username atau password salah.");
  }
  return response.data.jwt_token;
}

// Activate account (POST /api/auth/activate-account?token=...)
// spec: returns { success, message }
export async function activateAccount(token: string, payload: ActivatePayload): Promise<ActivateResponse> {
  return apiClient.post<ActivateResponse>(
    `/api/auth/activate-account?token=${encodeURIComponent(token)}`,
    payload
  );
}

// Logout
export async function logout() {
  try { await apiClient.post("/api/auth/logout"); } catch { /* ignore */ }
}
