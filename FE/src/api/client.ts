import { tokenStorage } from "../lib/tokenStorage";
import { API_BASE_URL } from "../lib/apiBaseUrl";

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

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

// Base URL: single-sourced dari lib/apiBaseUrl (tidak ada fallback localhost).
const BASE_URL = API_BASE_URL || "";

/**
 * Build URL with query parameters
 */
function buildUrl(path: string, params?: QueryParams): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = path.startsWith("http") ? new URL(path) : new URL(`${BASE_URL}${cleanPath}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }

  // For relative paths, return pathname + search for compatibility
  if (!path.startsWith("http")) {
    return `${url.pathname}${url.search}`;
  }

  return url.toString();
}

/**
 * Clear auth data and redirect to login
 */
function redirectToLogin(): void {
  tokenStorage.clear();

  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

/**
 * Safely parse JSON response, handling empty responses
 */
async function parseJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Core request function with auth token injection and error handling
 */
async function request<T>(
  path: string,
  options: RequestInit & { params?: QueryParams; redirectOnUnauthorized?: boolean } = {},
): Promise<T> {
  const { params, redirectOnUnauthorized = true, ...requestOptions } = options;
  const headers = new Headers(requestOptions.headers);
  const token = tokenStorage.getToken();

  // Inject auth token
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Set default headers
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
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

    // Handle 401 - unauthorized
    if (response.status === 401 && redirectOnUnauthorized) {
      redirectToLogin();
    }

    throw Object.assign(new Error(message), {
      statusCode: response.status,
      payload: parsed,
    });
  }

  // Handle non-JSON response (e.g., Ngrok warning page)
  if (typeof parsed === "string") {
    if (parsed.includes("ERR_NGROK_6024")) {
      throw new Error("Ngrok meminta header skip warning. Restart dev server lalu coba lagi.");
    }
    throw new Error("Response server bukan JSON. Periksa endpoint API yang dipanggil.");
  }

  return parsed as T;
}

/**
 * Serialize body for request
 */
function serializeBody(body?: unknown): BodyInit | undefined {
  if (body === undefined || body instanceof FormData) {
    return body as BodyInit | undefined;
  }
  return JSON.stringify(body);
}

/**
 * Unwrap data from API response wrapper
 */
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

/**
 * API client using native fetch
 * Note: Consider using services/apiClient.ts (axios-based) for better error handling
 */
export const apiClient = {
  get: <T>(path: string, params?: QueryParams, options?: RequestInit) =>
    request<T>(path, { ...options, method: "GET", params }),

  post: <T>(path: string, body?: unknown, options?: RequestInit & { redirectOnUnauthorized?: boolean }) =>
    request<T>(path, {
      ...options,
      method: "POST",
      body: serializeBody(body),
    }),

  put: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, { ...options, method: "PUT", body: serializeBody(body) }),

  patch: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, { ...options, method: "PATCH", body: serializeBody(body) }),

  delete: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { ...options, method: "DELETE" }),
};

// Re-export untuk kompatibilitas (sumber tunggal ada di lib/apiBaseUrl)
export { API_BASE_URL };
