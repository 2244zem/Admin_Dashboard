import { useState } from "react";
import type { ReactNode } from "react";
import type { AuthUser, LoginRequest, UserRole } from "../types/auth";
import { tokenStorage } from "../lib/tokenStorage";
import { login as loginRequest, logout as logoutRequest } from "../api/auth";
import { AuthContext } from "./AuthContextValue";

/**
 * Decode JWT payload for client-side usage only.
 * NOTE: This only DECODES the token for reading claims. Signature verification
 * MUST be done by the backend. A malicious user could modify the token payload
 * and the frontend would still decode it. The backend must always verify the
 * token signature before trusting any claims.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    // Handle URL-safe base64 encoding used in JWT
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");

    // Add padding if needed for atob
    const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);

    // Decode base64 and parse JSON
    const decoded = atob(padded);
    return JSON.parse(decoded) as Record<string, unknown>;
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
  const namaLengkap = String(
    payload.nama_lengkap ||
    payload.namaLengkap ||
    payload.name ||
    payload.username ||
    identifierFallback
  );
  const role = normalizeRole(payload.role || payload.role_name || payload.nama_role);

  return {
    id: String(payload.id || payload.user_id || payload.sub || identifierFallback),
    namaLengkap,
    username: String(payload.username || payload.email || identifierFallback),
    email: String(payload.email || ""),
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
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = tokenStorage.getToken();
    if (!token || tokenStorage.isTokenExpired(token)) return null;
    const remember = !!localStorage.getItem("token");
    const cachedUser = tokenStorage.getUser();
    const activeUser = (cachedUser as AuthUser | null) || userFromToken(token);
    tokenStorage.setUser(activeUser, remember);
    return activeUser;
  });
  const [isLoading] = useState(false);

  const login = async (credentials: LoginRequest, remember: boolean) => {
    // loginRequest now returns the token string directly
    const token = await loginRequest(credentials);
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
        isAuthenticated: !!tokenStorage.getToken(),
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
