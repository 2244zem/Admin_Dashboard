import apiClient from "./apiClient";
import { tokenStorage } from "../lib/tokenStorage";
import type { LoginResponse, CheckTokenResponse, RefreshTokenResponse } from "../types/api";

export interface User {
  id: number;
  username: string;
  email: string;
  namaLengkap: string;
  role: "Admin" | "HR";
}

class AuthService {
  /**
   * Login user with username and password
   * @param username User's username
   * @param password User's password
   * @param rememberMe Whether to persist login (localStorage) or use session only (sessionStorage)
   * @returns Promise<LoginResponse>
   */
  async login(username: string, password: string, rememberMe: boolean): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>("/auth/login", {
        username,
        password,
      });

      // Store token and user data using tokenStorage for consistency
      tokenStorage.setToken(response.token, rememberMe);
      tokenStorage.setUser(response.user, rememberMe);

      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Logout user - clear all auth data from storage
   */
  logout(): void {
    tokenStorage.clear();
  }

  /**
   * Check if token is valid with backend
   * @returns Promise<boolean>
   */
  async checkToken(): Promise<boolean> {
    const token = tokenStorage.getToken();

    if (!token) {
      return false;
    }

    try {
      const response = await apiClient.get<CheckTokenResponse>("/auth/check-token");

      if (response.valid && response.user) {
        // Update user data if backend returns updated info
        const isRemembered = !!localStorage.getItem("token");
        tokenStorage.setUser(response.user, isRemembered);
        return true;
      }

      // Token is invalid, clear storage
      this.logout();
      return false;
    } catch (error) {
      // If check fails, assume token is invalid
      this.logout();
      return false;
    }
  }

  /**
   * Refresh the authentication token
   * @returns Promise<string> New token
   */
  async refreshToken(): Promise<string> {
    try {
      const response = await apiClient.post<RefreshTokenResponse>("/auth/refresh-token");

      // Update token in the same storage that was used originally
      const isRemembered = !!localStorage.getItem("token");
      tokenStorage.setToken(response.token, isRemembered);

      return response.token;
    } catch (error) {
      // If refresh fails, logout user
      this.logout();
      throw error;
    }
  }

  /**
   * Get current token from storage
   * @returns string | null
   */
  getToken(): string | null {
    return tokenStorage.getToken();
  }

  /**
   * Get current user from storage
   * @returns User | null
   */
  getCurrentUser(): User | null {
    return tokenStorage.getUser() as User | null;
  }

  /**
   * Get current user's role
   * @returns "Admin" | "HR" | null
   */
  getUserRole(): "Admin" | "HR" | null {
    const user = this.getCurrentUser();
    return user?.role || null;
  }

  /**
   * Check if user is authenticated (has valid token in storage)
   * @returns boolean
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getCurrentUser();
    return !!(token && user);
  }

  /**
   * Check if current user has Admin role
   * @returns boolean
   */
  isAdmin(): boolean {
    return this.getUserRole() === "Admin";
  }

  /**
   * Check if current user has HR role
   * @returns boolean
   */
  isHR(): boolean {
    return this.getUserRole() === "HR";
  }

  /**
   * Check if remember me was enabled (token stored in localStorage)
   * @returns boolean
   */
  isRememberMeEnabled(): boolean {
    return !!localStorage.getItem("token");
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
