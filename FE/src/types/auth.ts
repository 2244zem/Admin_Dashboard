export type UserRole = "Admin" | "HR" | "OB" | "Karyawan";

export interface AuthUser {
  id: string | number;
  namaLengkap: string;
  username: string;
  email: string;
  role: UserRole;
  permissions?: string[];
  avatar?: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface LoginResponseData {
  jwt_token: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: LoginResponseData;
}
