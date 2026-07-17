import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { AuthUser, LoginRequest, UserRole } from "../types/auth";
import { tokenStorage } from "../lib/tokenStorage";
import { login as loginRequest, logout as logoutRequest } from "../api/auth";

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Decode JWT payload for client-side usage only.
 * NOTE: This only DECODES the token for reading claims. Signature verification
 * MUST be done by the backend. A malicious user could modify the token payload
 * and the frontend would still decode it. The backend must always verify the
 * token signature before trusting any claims.
 */
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    // Handle URL-safe base64 encoding used in JWT
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");

    // Add padding if needed for atob
    const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);

    // Decode base64 and parse JSON
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function normalizeRole(role: unknown): UserRole {
  const value = String(role || "").toLowerCase();
  if (value.includes("admin")) return "Admin";
  if (value.includes("hr") || value.includes("human resource")) return "HR";
  if (value === "ob" || value.includes("office boy")) return "OB";
  if (value.includes("karyawan")) return "Karyawan";
  // Default ke Karyawan jika role tidak dikenal
  return "Karyawan";
}

function userFromToken(token: string, identifierFallback = "user"): AuthUser {
  const payload = decodeJwtPayload(token) || {};
  const namaLengkap =
    payload.nama_lengkap ||
    payload.namaLengkap ||
    payload.name ||
    payload.username ||
    identifierFallback;
  const role = normalizeRole(payload.role || payload.role_name || payload.nama_role);

  return {
    id: payload.id || payload.user_id || payload.sub || identifierFallback,
    namaLengkap,
    username: payload.username || payload.email || identifierFallback,
    email: payload.email || "",
    role,
    permissions:
      role === "Admin"
        ? ["tasks:create", "tasks:edit", "tasks:delete", "lokasi:create", "lokasi:edit", "lokasi:delete", "users:all"]
        : role === "HR"
          ? ["tasks:create", "tasks:edit", "lokasi:read"]
          : ["tasks:read", "lokasi:read"],
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(namaLengkap)}&background=0F4C81&color=fff&bold=true`,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = tokenStorage.getToken();

    if (!token) {
      setIsLoading(false);
      return;
    }

    // Client-side token expiry check is for UX only
    // Backend MUST verify token signature and expiry on every request
    if (tokenStorage.isTokenExpired(token)) {
      tokenStorage.clear();
      setIsLoading(false);
      return;
    }

    const remember = !!localStorage.getItem("token");
    const cachedUser = tokenStorage.getUser();
    const activeUser = cachedUser || userFromToken(token);
    tokenStorage.setUser(activeUser, remember);
    setUser(activeUser);
    setIsLoading(false);
  }, []);

  const login = async (credentials: LoginRequest, remember: boolean) => {
    const response = await loginRequest(credentials);
    const token = response.data.jwt_token;
    const activeUser = userFromToken(token, credentials.identifier);

    tokenStorage.setToken(token, remember);
    tokenStorage.setUser(activeUser, remember);
    setUser(activeUser);
  };

  const logout = async () => {
    try {
      await logoutRequest();
    } catch {
      // Continue with local logout even if API fails
    } finally {
      tokenStorage.clear();
      setUser(null);
    }
  };

  // NOTE: ini hanya gate UI (UX). Otorisasi final WAJIB divalidasi di backend
  // per-endpoint — hacker bisa panggil API langsung lewat token tanpa peduli
  // pada logika client-side ini.
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === "Admin") return true;
    return !!user.permissions?.includes(permission);
  };

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!tokenStorage.getToken() && !!user,
        isLoading,
        login,
        logout,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth harus digunakan di dalam AuthProvider");
  }
  return context;
}
