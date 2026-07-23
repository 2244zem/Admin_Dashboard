import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosError } from "axios";
import type { ApiErrorResponse } from "../types/api";
import { tokenStorage } from "../lib/tokenStorage";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor(baseURL: string = BASE_URL) {
    this.axiosInstance = axios.create({
      baseURL,
      timeout: 30000,
    });

    this.setupRequestInterceptor();
    this.setupResponseInterceptor();
  }

  private setupRequestInterceptor() {
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Get token from tokenStorage (handles both localStorage and sessionStorage)
        const token = tokenStorage.getToken();

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Note: ngrok-skip-browser-warning header should be set on server-side, not here.
        // Setting it client-side triggers CORS preflight which ngrok rejects.

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  /**
   * Response Interceptor: Handle global errors
   */
  private setupResponseInterceptor() {
    this.axiosInstance.interceptors.response.use(
      (response) => {
        return response;
      },
      (error: AxiosError<ApiErrorResponse>) => {
        // Network error
        if (!error.response) {
          return Promise.reject({
            statusCode: 0,
            message: "Tidak dapat terhubung ke server",
            error: "NetworkError",
          } as ApiErrorResponse);
        }

        const statusCode = error.response.status;
        const errorData = error.response.data;

        // Handle specific error codes
        switch (statusCode) {
          case 400:
            return Promise.reject({
              ...errorData,
              statusCode: errorData?.statusCode || 400,
              message: errorData?.message || "Data yang dikirim tidak valid",
              error: errorData?.error || "BadRequest",
            } as ApiErrorResponse);

          case 401:
            // Unauthorized - clear tokens and redirect to login
            this.clearAuthData();
            if (window.location.pathname !== "/login") {
              window.location.href = "/login";
            }
            return Promise.reject({
              statusCode: 401,
              message: "Sesi Anda telah berakhir. Silakan login kembali.",
              error: "Unauthorized",
            } as ApiErrorResponse);

          case 403:
            // Forbidden - user doesn't have permission
            return Promise.reject({
              ...errorData,
              statusCode: errorData?.statusCode || 403,
              message: errorData?.message || "Anda tidak memiliki akses untuk melakukan aksi ini",
              error: errorData?.error || "Forbidden",
            } as ApiErrorResponse);

          case 404:
            // Not found
            return Promise.reject({
              ...errorData,
              statusCode: errorData?.statusCode || 404,
              message: errorData?.message || "Data tidak ditemukan",
              error: errorData?.error || "NotFound",
            } as ApiErrorResponse);

          case 422:
            // Validation error
            return Promise.reject({
              ...errorData,
              statusCode: errorData?.statusCode || 422,
              message: errorData?.message || "Data tidak valid",
              error: errorData?.error || "ValidationError",
            } as ApiErrorResponse);

          case 500:
          case 502:
          case 503:
            // Server error
            return Promise.reject({
              ...errorData,
              statusCode: errorData?.statusCode || statusCode,
              message: errorData?.message || "Terjadi kesalahan pada server. Silakan coba beberapa saat lagi.",
              error: errorData?.error || "ServerError",
            } as ApiErrorResponse);

          default:
            // Other errors
            return Promise.reject({
              ...errorData,
              statusCode: errorData?.statusCode || statusCode,
              message: errorData?.message || "Terjadi kesalahan. Silakan coba lagi.",
              error: errorData?.error || "UnknownError",
            } as ApiErrorResponse);
        }
      }
    );
  }

  /**
   * Clear authentication data from storage
   */
  private clearAuthData() {
    tokenStorage.clear();
  }

  /**
   * GET request
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.get<T>(url, config);
    return response.data;
  }

  /**
   * Ensure FormData bodies are sent as multipart (let the browser set the
   * boundary) instead of being force-converted to JSON by the default
   * application/json Content-Type header.
   */
  private withFormDataConfig(_data: unknown, config?: AxiosRequestConfig): AxiosRequestConfig | undefined {
    return config;
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.post<T>(url, data, this.withFormDataConfig(data, config));
    return response.data;
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.put<T>(url, data, this.withFormDataConfig(data, config));
    return response.data;
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.delete<T>(url, config);
    return response.data;
  }

  /**
   * PATCH request
   */
  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    console.log("[apiClient.patch]", url, data instanceof FormData ? "FormData" : data);
    try {
      const response = await this.axiosInstance.patch<T>(url, data, this.withFormDataConfig(data, config));
      return response.data;
    } catch (err) {
      console.error("[apiClient.patch ERROR]", (err as { response?: unknown })?.response ?? err);
      throw err;
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
