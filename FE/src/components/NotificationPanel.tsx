import { motion } from "framer-motion";
import type { AppNotification } from "../types/notification";
import { timeAgo } from "../lib/utils";

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
}: {
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  onItemClick: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute right-0 mt-3 w-96 bg-white border border-gray-200 rounded-2xl shadow-xl z-30 overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="text-base font-bold text-gray-900">Notifikasi</h3>
        <button onClick={onMarkAllRead} className="text-xs font-semibold text-[#0F4C81] hover:underline">
          Tandai semua dibaca
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
        {notifications.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">Tidak ada notifikasi</div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => onItemClick(n.id)}
              className={`w-full text-left flex items-start gap-3 px-5 py-4 hover:bg-gray-50 transition-colors ${
                !n.read ? "bg-blue-50/40" : ""
              }`}
            >
              <NotifIcon type={n.type} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${n.type === "laporan" ? "text-red-500" : "text-gray-800"}`}>
                  {n.title}
                </p>
                <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                {n.senderName && (
                  <p className="text-xs text-gray-400 mt-0.5">Dari: {n.senderName}</p>
                )}
                {n.highPriority && (
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">
                    HIGH PRIORITY
                  </span>
                )}
              </div>
              <span className="text-[11px] text-gray-400 whitespace-nowrap shrink-0">{timeAgo(n.createdAt)}</span>
            </button>
          ))
        )}
      </div>
    </motion.div>
  );
}