import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { Laporan, StatusLaporan } from "../types/laporan";
import type { Task, StatusTask } from "../types/task";
import type { AppNotification } from "../types/notification";
import apiClient from "../services/apiClient";
import type { 
  ReportListResponse, 
  TaskListResponse, 
  ApiErrorResponse,
  TaskCreateResponse,
  TaskUpdateResponse,
  TaskDeleteResponse
} from "../types/api";

interface AssignPayload {
  kategori_id: string;
  ob_id: string;
  lokasi_id: string;
  lantai_id: string;
  waktu?: string;
  catatan?: string;
}

interface AppDataContextType {
  // Reports
  laporanList: Laporan[];
  reportsLoading: boolean;
  reportsError: string | null;
  fetchReports: () => Promise<void>;
  addLaporan: (laporan: Omit<Laporan, "id" | "createdAt" | "status" | "taskId">) => Promise<void>;
  updateLaporanStatus: (id: number, status: StatusLaporan) => Promise<void>;

  // Tasks
  taskList: Task[];
  tasksLoading: boolean;
  tasksError: string | null;
  fetchTasks: (filter?: { startDate?: string; endDate?: string }) => Promise<void>;
  addTask: (task: Omit<Task, "id" | "status">) => Promise<void>;
  updateTask: (id: string, updates: Partial<Omit<Task, "id">>) => Promise<void>;
  updateTaskStatus: (id: string, status: StatusTask) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  assignLaporanToTask: (laporanId: number, details: AssignPayload) => Promise<void>;

  // Notifications
  notifications: AppNotification[];
  notificationsLoading: boolean;
  notificationsError: string | null;
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [laporanList, setLaporanList] = useState<Laporan[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);

  const [taskList, setTaskList] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);

  // Fetch data on mount
  useEffect(() => {
    fetchReports();
    fetchTasks();
    fetchNotifications();
  }, []);

  const fetchReports: AppDataContextType["fetchReports"] = async () => {
    setReportsLoading(true);
    setReportsError(null);

    try {
      const response = await apiClient.get<ReportListResponse>("/admin/laporan");
      setLaporanList(response.reports);
    } catch (error) {
      const apiError = error as ApiErrorResponse;
      setReportsError(apiError.message || "Gagal memuat data laporan");
    } finally {
      setReportsLoading(false);
    }
  };

  const addLaporan: AppDataContextType["addLaporan"] = async (laporan) => {
    try {
      await apiClient.post("/admin/laporan", laporan);
      // Refresh reports list
      await fetchReports();
    } catch (error) {
      const apiError = error as ApiErrorResponse;
      throw new Error(apiError.message || "Gagal menambahkan laporan");
    }
  };

  const updateLaporanStatus: AppDataContextType["updateLaporanStatus"] = async (id, status) => {
    try {
      await apiClient.put(`/admin/laporan/${id}`, { status });
      // Optimistic update
      setLaporanList((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    } catch (error) {
      // Rollback on error
      await fetchReports();
      const apiError = error as ApiErrorResponse;
      throw new Error(apiError.message || "Gagal mengupdate status laporan");
    }
  };
            
  const fetchTasks: AppDataContextType["fetchTasks"] = async (filter) => {
    setTasksLoading(true);
    setTasksError(null);

    try {
      const params = filter ? { params: filter } : undefined;
      const response = await apiClient.get<TaskListResponse>("/tugas", params);
      setTaskList(response.tasks);
    } catch (error) {
      const apiError = error as ApiErrorResponse;
      setTasksError(apiError.message || "Gagal memuat data tugas");
    } finally {
      setTasksLoading(false);
    }
  };

  const addTask: AppDataContextType["addTask"] = async (task) => {
    try {
      await apiClient.post<TaskCreateResponse>("/tugas", { ...task, status: "Belum" });
      // Refresh tasks list
      await fetchTasks();
    } catch (error) {
      const apiError = error as ApiErrorResponse;
      throw new Error(apiError.message || "Gagal menambahkan tugas");
    }
  };

  const updateTask: AppDataContextType["updateTask"] = async (id, updates) => {
    try {
      await apiClient.put<TaskUpdateResponse>(`/tugas/${id}`, updates);
      
      // Optimistic update
      setTaskList((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
      
      // Update related laporan if petugas changed
      if (updates.petugas) {
        setLaporanList((prev) =>
          prev.map((l) => (l.taskId === id ? { ...l, assignedTo: updates.petugas!.nama } : l))
        );
      }
    } catch (error) {
      // Rollback on error
      await fetchTasks();
      const apiError = error as ApiErrorResponse;
      throw new Error(apiError.message || "Gagal mengupdate tugas");
    }
  };

  const updateTaskStatus: AppDataContextType["updateTaskStatus"] = async (id, status) => {
    try {
      await apiClient.put<TaskUpdateResponse>(`/tugas/${id}`, { status });
      
      // Optimistic update
      setTaskList((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
      
      // Update related laporan status
      setLaporanList((prev) =>
        prev.map((l) => {
          if (l.taskId !== id) return l;
          return { ...l, status: status === "Selesai" ? "Selesai" : "Ditugaskan" };
        })
      );
    } catch (error) {
      // Rollback on error
      await fetchTasks();
      await fetchReports();
      const apiError = error as ApiErrorResponse;
      throw new Error(apiError.message || "Gagal mengupdate status tugas");
    }
  };

  const deleteTask: AppDataContextType["deleteTask"] = async (id) => {
    try {
      await apiClient.delete<TaskDeleteResponse>(`/tugas/${id}`);
      
      // Remove from local state
      setTaskList((prev) => prev.filter((t) => t.id !== id));
      
      // Update related laporan
      setLaporanList((prev) =>
        prev.map((l) =>
          l.taskId === id ? { ...l, status: "Menunggu", assignedTo: undefined, taskId: undefined } : l
        )
      );
    } catch (error) {
      const apiError = error as ApiErrorResponse;
      throw new Error(apiError.message || "Gagal menghapus tugas");
    }
  };

  const assignLaporanToTask: AppDataContextType["assignLaporanToTask"] = async (laporanId, details) => {
    try {
      // Create new task with ID-based payload
      const newTaskPayload = {
        kategori_id: details.kategori_id,
        lokasi_id: details.lokasi_id,
        lantai_id: details.lantai_id,
        ob_id: details.ob_id,
        catatan: details.catatan,
      };

      const response = await apiClient.post<TaskCreateResponse>("/tugas", newTaskPayload);
      const newTaskId = response.task.id;

      // Update laporan with task assignment  
      await apiClient.put(`/admin/laporan/${laporanId}`, {
        status: "Ditugaskan",
        taskId: newTaskId,
      });

      // Refresh both lists
      await fetchTasks();
      await fetchReports();
    } catch (error) {
      const apiError = error as ApiErrorResponse;
      throw new Error(apiError.message || "Gagal menugaskan laporan");
    }
  };

  // ============================================================
  // NOTIFICATIONS
  // ============================================================

  const fetchNotifications: AppDataContextType["fetchNotifications"] = async () => {
    setNotificationsLoading(true);
    setNotificationsError(null);

    try {
      const response = await apiClient.get("/api/notifikasi") as any;
      
      // Backend returns { success, message, data: { hari_ini: [], kemarin: [] } }
      const responseData = response.data || response;
      const hariIni = responseData.hari_ini || [];
      const kemarin = responseData.kemarin || [];
      
      // Combine and map to AppNotification format
      const allNotifications = [...hariIni, ...kemarin].map((n: any) => ({
        id: n.id,
        type: mapNotificationType(n.tipe),
        title: n.judul,
        message: n.pesan,
        read: n.is_read,
        createdAt: n.created_at,
        highPriority: n.tipe === "URGENT" || n.tipe === "WARNING",
      }));
      
      setNotifications(allNotifications);
    } catch (error: any) {
      // Graceful degradation for notifications - don't block app if endpoint unavailable
      if (error?.statusCode === 502 || error?.statusCode === 503) {
        setNotifications([]);
        setNotificationsError(null); // Don't show error to user for non-critical feature
      } else {
        const apiError = error as ApiErrorResponse;
        setNotificationsError(apiError.message || "Gagal memuat notifikasi");
      }
    } finally {
      setNotificationsLoading(false);
    }
  };
  
  // Helper function to map backend notification types to frontend types
  function mapNotificationType(backendType: string): AppNotification["type"] {
    const typeMap: Record<string, AppNotification["type"]> = {
      "LAPORAN": "laporan",
      "TUGAS": "tugas",
      "USER": "user",
      "PENGINGAT": "pengingat",
      "URGENT": "laporan",
      "WARNING": "pengingat",
    };
    return typeMap[backendType] || "pengingat";
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead: AppDataContextType["markAllRead"] = async () => {
    try {
      await apiClient.patch("/api/notifikasi/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      const apiError = error as ApiErrorResponse;
      throw new Error(apiError.message || "Gagal menandai semua notifikasi sebagai dibaca");
    }
  };

  const markRead: AppDataContextType["markRead"] = async (id) => {
    try {
      await apiClient.patch(`/api/notifikasi/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (error) {
      const apiError = error as ApiErrorResponse;
      throw new Error(apiError.message || "Gagal menandai notifikasi sebagai dibaca");
    }
  };

  return (
    <AppDataContext.Provider
      value={{
        laporanList,
        reportsLoading,
        reportsError,
        fetchReports,
        addLaporan,
        updateLaporanStatus,
        taskList,
        tasksLoading,
        tasksError,
        fetchTasks,
        addTask,
        updateTask,
        updateTaskStatus,
        deleteTask,
        assignLaporanToTask,
        notifications,
        notificationsLoading,
        notificationsError,
        unreadCount,
        fetchNotifications,
        markAllRead,
        markRead,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData harus dipakai di dalam <AppDataProvider>");
  return ctx;
}

export function useLaporan() {
  const { laporanList, addLaporan, updateLaporanStatus } = useAppData();
  return { laporanList, addLaporan, updateStatus: updateLaporanStatus };
}
