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

export interface ApiError {
  message: string;
  statusCode?: number;
  errors?: Record<string, string[]>;
}

export interface ApiErrorResponse extends ApiError {
  error?: string;
}

export type LoginResponse = any;
export type CheckTokenResponse = any;
export type RefreshTokenResponse = any;
export type ReportListResponse = any;
export type TaskListResponse = any;
export type NotificationListResponse = any;
export type TaskCreateResponse = any;
export type TaskUpdateResponse = any;
export type TaskDeleteResponse = any;
export type UserListResponse = any;
export type UserCreateResponse = any;
export type UserUpdateResponse = any;
export type UserDeleteResponse = any;
