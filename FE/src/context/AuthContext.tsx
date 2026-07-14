import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { AuthUser, LoginRequest, UserRole } from "../types/auth";
import { tokenStorage } from "../lib/tokenStorage";
import { login as loginRequest } from "../api/auth";

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest, remember: boolean) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized));
  } catch {
    return null;
  }
}

function normalizeRole(role: unknown): UserRole {
  const value = String(role || "Admin").toLowerCase();
  if (value.includes("hr") || value.includes("human resource")) return "HR";
  if (value === "ob" || value.includes("office boy")) return "OB";
  if (value.includes("karyawan")) return "Karyawan";
  return "Admin";
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

    if (!token || tokenStorage.isTokenExpired(token)) {
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

  const logout = () => {
    tokenStorage.clear();
    setUser(null);
  };

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
