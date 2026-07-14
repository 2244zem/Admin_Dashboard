import apiClient from "./apiClient";
import type { LoginResponse, CheckTokenResponse, RefreshTokenResponse } from "../types/api";

const TOKEN_KEY = "wgs_auth_token";
const USER_DATA_KEY = "wgs_user_data";

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

      // Store token and user data based on rememberMe preference
      const storage = rememberMe ? localStorage : sessionStorage;
      
      storage.setItem(TOKEN_KEY, response.token);
      storage.setItem(USER_DATA_KEY, JSON.stringify(response.user));

      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Logout user - clear all auth data from storage
   */
  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_DATA_KEY);
  }

  /**
   * Check if token is valid with backend
   * @returns Promise<boolean>
   */
  async checkToken(): Promise<boolean> {
    const token = this.getToken();
    
    if (!token) {
      return false;
    }

    try {
      const response = await apiClient.get<CheckTokenResponse>("/auth/check-token");
      
      if (response.valid && response.user) {
        // Update user data if backend returns updated info
        const storage = localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage;
        storage.setItem(USER_DATA_KEY, JSON.stringify(response.user));
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
      const storage = localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage;
      storage.setItem(TOKEN_KEY, response.token);
      
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
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  }

  /**
   * Get current user from storage
   * @returns User | null
   */
  getCurrentUser(): User | null {
    const userDataStr = localStorage.getItem(USER_DATA_KEY) || sessionStorage.getItem(USER_DATA_KEY);
    
    if (!userDataStr) {
      return null;
    }

    try {
      return JSON.parse(userDataStr) as User;
    } catch (error) {
      console.error("Failed to parse user data:", error);
      return null;
    }
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
   * Check if token is stored in localStorage (remember me was enabled)
   * @returns boolean
   */
  isRememberMeEnabled(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
