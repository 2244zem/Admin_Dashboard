export type NotifType = "laporan" | "tugas" | "user" | "pengingat";

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