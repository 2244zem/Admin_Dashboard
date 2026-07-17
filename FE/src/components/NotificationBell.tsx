import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "../context/NotificationContext";
import NotificationPanel from "./NotificationPanel";

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications();

  const handleMarkAllRead = async () => {
    await markAllRead();
  };

  const handleItemClick = async (id: string) => {
    await markRead(id);
  };

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
        title="Notifikasi"
      >
        {/* Bell Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-gray-600 hover:text-[#0F4C81]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>

        {/* Unread Badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                transition: { type: "spring", stiffness: 500, damping: 25 }
              }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute -top-1 -right-1 flex items-center justify-center min-w-[22px] h-[22px] px-1.5 text-[11px] font-bold text-white bg-red-500 rounded-full shadow-lg ring-2 ring-white z-20"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Pulse ring animation for new notifications */}
        {unreadCount > 0 && (
          <motion.span
            animate={{
              scale: [1, 1.5],
              opacity: [0.6, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeOut",
            }}
            className="absolute -top-1 -right-1 w-[22px] h-[22px] rounded-full bg-red-500"
          />
        )}
      </motion.button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-20"
            />

            {/* Panel */}
            <div className="absolute right-0 mt-2 z-30">
              <NotificationPanel
                notifications={notifications}
                onMarkAllRead={handleMarkAllRead}
                onItemClick={handleItemClick}
              />
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
