export type NotifType = "laporan" | "tugas" | "user" | "pengingat";

// TODO: sesuaikan dengan kontrak API asli dari backend
export interface AppNotification {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  highPriority?: boolean;
  createdAt: string;
  read: boolean;
  senderName?: string;
}