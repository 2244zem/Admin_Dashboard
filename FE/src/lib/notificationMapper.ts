import type { AppNotification, NotifType } from "../types/notification";
import type { ApiNotification } from "../api/notifikasi";

function mapNotifType(type: unknown): NotifType {
  const value = String(type || "").toUpperCase();
  if (value.includes("TUGAS") || value.includes("CHECKLIST")) return "tugas";
  if (value.includes("USER") || value.includes("AKUN")) return "user";
  if (value.includes("INGAT") || value.includes("REMINDER")) return "pengingat";
  return "laporan";
}

export function mapApiNotificationToAppNotification(row: ApiNotification): AppNotification {
  const rawId = row.id ?? row.notification_id ?? row._id ?? row.uuid ?? "";
  const type = row.tipe ?? row.type ?? row.tipe_notif ?? "";
  const title = row.judul ?? row.title ?? "Notifikasi";
  const message = row.pesan ?? row.message ?? "";
  const createdAt = row.created_at ?? row.createdAt ?? new Date().toISOString();
  const isRead = row.is_read ?? row.read ?? false;
  const senderName = row.pengirim?.nama_lengkap ?? "";
  const senderId = row.pengirim?.id ?? "";
  const refId = row.ref_id ?? "";
  const refTipe = row.ref_tipe ?? "";

  const id = String(rawId) || `notif-${createdAt}`;

  return {
    id: String(id),
    type: mapNotifType(type),
    title: String(title),
    message: String(message),
    highPriority: String(type).toUpperCase().includes("URGENT"),
    createdAt: String(createdAt),
    read: Boolean(isRead),
    senderName: String(senderName),
    senderId: String(senderId) || undefined,
    refId: String(refId) || undefined,
    refTipe: String(refTipe) || undefined,
  };
}
