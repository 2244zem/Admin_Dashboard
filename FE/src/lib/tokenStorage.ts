const TOKEN_KEY = "token";
const USER_KEY = "wgs_auth_user";

// SECURITY: token JWT disimpan di localStorage/sessionStorage (bukan HttpOnly
// cookie) agar bisa dibaca di client. Ini rentan dicuri kalau terjadi XSS.
// Rekomendasi jangka panjang: pindah ke cookie HttpOnly; Secure; SameSite
// (penanganan token diambil alih oleh backend, client tidak pegang JWT).

export const tokenStorage = {
  getToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  },
  
  getUser: (): any | null => {
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setToken: (token: string, remember: boolean): void => {
    if (remember) {
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.removeItem(TOKEN_KEY);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.removeItem(TOKEN_KEY);
    }
  },

  setUser: (user: any, remember: boolean): void => {
    const val = JSON.stringify(user);
    if (remember) {
      localStorage.setItem(USER_KEY, val);
      sessionStorage.removeItem(USER_KEY);
    } else {
      sessionStorage.setItem(USER_KEY, val);
      localStorage.removeItem(USER_KEY);
    }
  },

  clear: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  },

  isTokenExpired: (token: string): boolean => {
    if (!token) return true;
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return false; // Not a JWT, assume valid (expiry handled by server)
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp) {
        return Date.now() >= payload.exp * 1000;
      }
      return false;
    } catch {
      return false;
    }
  }
};
