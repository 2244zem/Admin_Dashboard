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

export async function login(payload: LoginPayload) {
  const response = await apiClient.post<{ jwt_token: string }>("/api/auth/login", payload);
  return { success: true, data: response };
}

export async function checkActivationToken(token: string) {
  return apiClient.get("/api/auth/check-token", { params: { token } });
}

export async function activateAccount(token: string, payload: ActivateAccountPayload) {
  return apiClient.post<{ success: boolean; message: string }>(`/api/auth/activate-account?token=${encodeURIComponent(token)}`, payload);
}

export async function logout() {
  return apiClient.post("/api/auth/logout");
}
