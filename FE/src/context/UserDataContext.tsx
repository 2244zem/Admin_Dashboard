import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { AppUser, UserRole, UserStatus } from "../types/user";
import apiClient from "../services/apiClient";
import type { UserListResponse, UserCreateResponse, UserUpdateResponse, UserDeleteResponse, ApiErrorResponse } from "../types/api";

export interface AddUserPayload {
  namaLengkap: string;
  email: string;
  noTelepon: string;
  role: UserRole;
}

export interface EditUserPayload {
  namaLengkap: string;
  username: string;
  email: string;
  noTelepon: string;
  role: UserRole;
  status: UserStatus;
}

interface ActionResult {
  success: boolean;
  message: string;
}

interface UserDataContextType {
  userList: AppUser[];
  usersLoading: boolean;
  usersError: string | null;
  fetchUsers: () => Promise<void>;
  addUser: (payload: AddUserPayload) => Promise<ActionResult>;
  updateUser: (id: number, payload: EditUserPayload) => Promise<ActionResult>;
  deleteUser: (id: number) => Promise<void>;
  getUserById: (id: number) => AppUser | undefined;
  renewToken: (id: number, hours: number) => Promise<void>;
}

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

export function UserDataProvider({ children }: { children: ReactNode }) {
  const [userList, setUserList] = useState<AppUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  // Fetch users from API on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers: UserDataContextType["fetchUsers"] = async () => {
    setUsersLoading(true);
    setUsersError(null);

    try {
      const response = await apiClient.get<UserListResponse>("/admin/user");
      setUserList(response.users);
    } catch (error) {
      const apiError = error as ApiErrorResponse;
      setUsersError(apiError.message || "Gagal memuat data pengguna");
      console.error("Failed to fetch users:", error);
    } finally {
      setUsersLoading(false);
    }
  };

  const getUserById: UserDataContextType["getUserById"] = (id) => userList.find((u) => u.id === id);

  const addUser: UserDataContextType["addUser"] = async (payload) => {
    try {
      const response = await apiClient.post<UserCreateResponse>("/admin/user", payload);
      
      // Refresh user list after successful creation
      await fetchUsers();
      
      return { success: true, message: response.message || "Pengguna Berhasil Disimpan" };
    } catch (error) {
      const apiError = error as ApiErrorResponse;
      return { 
        success: false, 
        message: apiError.message || "Gagal menyimpan pengguna" 
      };
    }
  };

  const updateUser: UserDataContextType["updateUser"] = async (id, payload) => {
    try {
      const response = await apiClient.put<UserUpdateResponse>(`/admin/user/${id}`, payload);
      
      // Refresh user list after successful update
      await fetchUsers();
      
      return { success: true, message: response.message || "Perubahan Berhasil Disimpan" };
    } catch (error) {
      const apiError = error as ApiErrorResponse;
      return { 
        success: false, 
        message: apiError.message || "Gagal menyimpan perubahan" 
      };
    }
  };

  const deleteUser: UserDataContextType["deleteUser"] = async (id) => {
    try {
      await apiClient.delete<UserDeleteResponse>(`/admin/user/${id}`);
      
      // Refresh user list after successful deletion
      await fetchUsers();
    } catch (error) {
      const apiError = error as ApiErrorResponse;
      throw new Error(apiError.message || "Gagal menghapus pengguna");
    }
  };

  const renewToken: UserDataContextType["renewToken"] = async (id, hours) => {
    try {
      // TODO: Implement token renewal endpoint when backend is ready
      // For now, this will be a placeholder
      await apiClient.post(`/admin/user/${id}/renew-token`, { hours });
      
      // Refresh user list after token renewal
      await fetchUsers();
    } catch (error) {
      const apiError = error as ApiErrorResponse;
      throw new Error(apiError.message || "Gagal memperpanjang token");
    }
  };

  return (
    <UserDataContext.Provider
      value={{ userList, usersLoading, usersError, fetchUsers, addUser, updateUser, deleteUser, getUserById, renewToken }}
    >
      {children}
    </UserDataContext.Provider>
  );
}

export function useUserData() {
  const ctx = useContext(UserDataContext);
  if (!ctx) throw new Error("useUserData harus dipakai di dalam <UserDataProvider>");
  return ctx;
}