export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiErrorPayload {
  success?: boolean;
  message?: string;
  error?: string;
  statusCode?: number;
  errors?: Record<string, string[]>;
}

type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue>;

const API_BASE_URL = (import.meta.env.DEV ? "" : import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const TOKEN_KEY = "token";

function buildUrl(path: string, params?: QueryParams) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const baseUrl =
    API_BASE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  const url = path.startsWith("http") ? new URL(path) : new URL(`${baseUrl}${cleanPath}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return API_BASE_URL || path.startsWith("http") ? url.toString() : `${url.pathname}${url.search}`;
}

function redirectToLogin() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("wgs_auth_user");
  sessionStorage.removeItem("wgs_auth_user");

  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

async function parseJsonSafe(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { params?: QueryParams; redirectOnUnauthorized?: boolean } = {},
): Promise<T> {
  const { params, redirectOnUnauthorized = true, ...requestOptions } = options;
  const headers = new Headers(requestOptions.headers);
  const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (!headers.has("ngrok-skip-browser-warning")) {
    headers.set("ngrok-skip-browser-warning", "true");
  }

  if (!headers.has("Content-Type") && requestOptions.body && !(requestOptions.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path, params), {
    ...requestOptions,
    headers,
  });

  const parsed = await parseJsonSafe(response);

  if (!response.ok) {
    const errorPayload = (typeof parsed === "object" && parsed ? parsed : {}) as ApiErrorPayload;
    const message =
      errorPayload.message ||
      errorPayload.error ||
      (response.status === 401 ? "Email/username atau password salah." : "Terjadi kesalahan pada server.");

    if (response.status === 401 && redirectOnUnauthorized) {
      redirectToLogin();
    }

    throw Object.assign(new Error(message), {
      statusCode: response.status,
      payload: parsed,
    });
  }

  if (typeof parsed === "string") {
    throw new Error(
      parsed.includes("ERR_NGROK_6024")
        ? "Ngrok meminta header skip warning. Restart dev server lalu coba lagi."
        : "Response server bukan JSON. Periksa endpoint API yang dipanggil.",
    );
  }

  return parsed as T;
}

function serializeBody(body?: unknown) {
  if (body === undefined || body instanceof FormData) return body as BodyInit | undefined;
  return JSON.stringify(body);
}

export function unwrapData<T>(response: ApiResponse<T> | T): T {
  if (
    response &&
    typeof response === "object" &&
    "data" in response &&
    ("success" in response || "message" in response)
  ) {
    return (response as ApiResponse<T>).data;
  }

  return response as T;
}

export const apiClient = {
  get: <T>(path: string, params?: QueryParams, options?: RequestInit) =>
    request<T>(path, { ...options, method: "GET", params }),
  post: <T>(path: string, body?: unknown, options?: RequestInit & { redirectOnUnauthorized?: boolean }) =>
    request<T>(path, { ...options, method: "POST", body: serializeBody(body) }),
  put: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, { ...options, method: "PUT", body: serializeBody(body) }),
  patch: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, { ...options, method: "PATCH", body: serializeBody(body) }),
  delete: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { ...options, method: "DELETE" }),
};

export { API_BASE_URL, TOKEN_KEY, buildUrl };
