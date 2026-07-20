import type { AppNotification } from "../types/notification";

// Map a notification to the route it should deep-link to (WhatsApp-style).
export function getNotificationPath(n: AppNotification): string {
  switch (n.type) {
    case "laporan":
      // Deep-link straight into the report detail modal.
      return n.refId ? `/reports?laporan=${encodeURIComponent(n.refId)}` : "/reports";
    case "user":
      return n.refId ? `/users/${encodeURIComponent(n.refId)}` : "/users";
    case "tugas":
      return "/tugas-insidental";
    default:
      return "/dashboard";
  }
}
