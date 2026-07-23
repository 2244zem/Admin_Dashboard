import { motion } from "framer-motion";
import type { AppNotification } from "../types/notification";
import { timeAgo } from "../lib/utils";
import Avatar from "./ui/Avatar";

const ICON_STYLE: Record<AppNotification["type"], string> = {
  laporan: "bg-red-100 text-red-500",
  tugas: "bg-green-100 text-green-600",
  user: "bg-blue-100 text-blue-500",
  pengingat: "bg-yellow-100 text-yellow-600",
};

function NotifIcon({ type }: { type: AppNotification["type"] }) {
  const paths: Record<AppNotification["type"], string> = {
    laporan: "M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z",
    tugas: "M5 13l4 4L19 7",
    user: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2.121-5.879a3 3 0 10-4.242 4.242 3 3 0 004.242-4.242zM15 21H3v-1a6 6 0 0112 0v1z",
    pengingat: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  };
  return (
    <span className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${ICON_STYLE[type]}`}>
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d={paths[type]} />
      </svg>
    </span>
  );
}

export default function NotificationPanel({
  notifications,
  onMarkAllRead,
  onItemClick,
  onClose,
}: {
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  onItemClick: (n: AppNotification) => void;
  onClose?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="w-96 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden dark:bg-surface"
      style={{ maxHeight: "calc(100vh - 120px)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50 dark:bg-surface">
        <h3 className="text-base font-bold text-gray-900">
          Notifikasi
          {notifications.filter(n => !n.read).length > 0 && (
            <span className="ml-2 text-xs font-medium text-red-500">
              ({notifications.filter(n => !n.read).length} belum dibaca)
            </span>
          )}
        </h3>
        <div className="flex items-center gap-3">
          <button
            onClick={onMarkAllRead}
            className="text-xs font-semibold text-[#0F4C81] hover:underline disabled:opacity-40 disabled:no-underline"
            disabled={notifications.every(n => n.read)}
          >
            Tandai semua dibaca
          </button>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Tutup"
              className="text-gray-400 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors dark:bg-elevated"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto" style={{ maxHeight: "400px" }}>
        {notifications.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3 dark:bg-elevated">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">Tidak ada notifikasi</p>
          </div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => onItemClick(n)}
              className={`w-full text-left flex items-start gap-3 px-5 py-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${
                !n.read ? "bg-blue-50/50" : ""
              }`}
            >
              <NotifIcon type={n.type} />
              {n.senderPhoto ? (
                <Avatar name={n.senderName || n.title} src={n.senderPhoto} size="md" />
              ) : null}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-semibold ${n.type === "laporan" ? "text-red-500" : "text-gray-800"}`}>
                    {n.title}
                  </p>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{n.message}</p>
                {n.senderName && (
                  <p className="text-xs text-gray-400 mt-1">Dari: {n.senderName}</p>
                )}
                {n.highPriority && (
                  <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">
                    MENDESAK
                  </span>
                )}
              </div>
              <span className="text-[11px] text-gray-400 whitespace-nowrap shrink-0 mt-1">
                {timeAgo(n.createdAt)}
              </span>
            </button>
          ))
        )}
      </div>

      {/* Footer hint */}
      {notifications.length > 0 && (
        <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100 dark:bg-surface">
          <p className="text-[11px] text-gray-400 text-center">
            Klik notifikasi untuk menandai sudah dibaca
          </p>
        </div>
      )}
    </motion.div>
  );
}
