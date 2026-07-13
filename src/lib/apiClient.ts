import { tokenStorage } from "./tokenStorage";

const BASE_URL = (import.meta.env.DEV ? "" : import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const headers = new Headers(options.headers);

  // Auto token injection
  const token = tokenStorage.getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Default content type
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (!headers.has("ngrok-skip-browser-warning")) {
    headers.set("ngrok-skip-browser-warning", "true");
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        tokenStorage.clear();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        throw new Error("Sesi Anda telah berakhir. Silakan login kembali.");
      }

      if (response.status === 403) {
        throw new Error("Anda tidak memiliki akses untuk melakukan tindakan ini.");
      }

      let errorMessage = "Terjadi kesalahan pada server. Silakan coba lagi.";
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {}

      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return {} as T;
    }

    const text = await response.text();
    if (!text) return {} as T;

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(
        text.includes("ERR_NGROK_6024")
          ? "Ngrok meminta header skip warning. Restart dev server lalu coba lagi."
          : "Response server bukan JSON. Periksa endpoint API yang dipanggil.",
      );
    }
  } catch (err: any) {
    if (err.message && (err.message.includes("Failed to fetch") || err.name === "TypeError")) {
      throw new Error("Tidak dapat terhubung ke server. Periksa koneksi internet Anda.");
    }
    throw err;
  }
}

export const apiClient = {
  get: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: any, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  put: <T>(path: string, body?: any, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  patch: <T>(path: string, body?: any, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: "PATCH",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  delete: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
