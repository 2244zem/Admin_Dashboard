import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosError } from "axios";
import type { ApiErrorResponse } from "../types/api";

const BASE_URL = "https://stylar-nonseverable-denver.ngrok-free.dev/api";
const TOKEN_KEY = "wgs_auth_token";

class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor(baseURL: string = BASE_URL) {
    this.axiosInstance = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupRequestInterceptor();
    this.setupResponseInterceptor();
  }

  /**
   * Request Interceptor: Automatically inject auth token
   */
  private setupRequestInterceptor() {
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Get token from localStorage or sessionStorage
        const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

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
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("wgs_user_data");
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem("wgs_user_data");
  }

  /**
   * GET request
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.get<T>(url, config);
    return response.data;
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.post<T>(url, data, config);
    return response.data;
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.put<T>(url, data, config);
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
  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.patch<T>(url, data, config);
    return response.data;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
