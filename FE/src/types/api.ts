export interface ApiResponse<T> {
  success?: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  // TODO: sesuaikan dengan kontrak API asli dari backend
}

export interface ApiMutationResult {
  success?: boolean;
  message?: string;
  data?: unknown;
}

export interface ApiError {
  message: string;
  statusCode?: number;
  errors?: Record<string, string[]>;
}

export interface ApiErrorResponse extends ApiError {
  error?: string;
}

// Loosely-typed API response aliases kept as `unknown` so callers are forced to
// narrow. They are not imported anywhere with concrete usage, so `unknown` is
// the safe default (replaces the previous `any`).
export type LoginResponse = unknown;
export type CheckTokenResponse = unknown;
export type RefreshTokenResponse = unknown;
export type ReportListResponse = unknown;
export type TaskListResponse = unknown;
export type NotificationListResponse = unknown;
export type TaskCreateResponse = unknown;
export type TaskUpdateResponse = unknown;
export type TaskDeleteResponse = unknown;
export type UserListResponse = unknown;
export type UserCreateResponse = unknown;
export type UserUpdateResponse = unknown;
export type UserDeleteResponse = unknown;
