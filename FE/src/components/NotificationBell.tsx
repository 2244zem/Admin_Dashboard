import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "../context/NotificationContext";
import NotificationPanel from "./NotificationPanel";

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications();
  const bellRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      // Don't close if clicking on the bell button itself
      if (bellRef.current?.contains(e.target as Node)) return;
      // Don't close if clicking inside the panel
      if (panelRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
    };

    // Delay to avoid closing immediately on open
    const timer = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) setIsOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Close on navigation
  useEffect(() => {
    const handleNavigation = () => setIsOpen(false);
    window.addEventListener("popstate", handleNavigation);
    return () => window.removeEventListener("popstate", handleNavigation);
  }, []);

  return (
    <div ref={bellRef} className="relative">
      {/* Bell Button - z-50 ensures it's above backdrop */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer z-50"
        title="Notifikasi"
        aria-label={`Notifikasi${unreadCount > 0 ? ` (${unreadCount} belum dibaca)` : ""}`}
      >
        {/* Bell Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-6 w-6 transition-colors ${isOpen ? "text-[#0F4C81]" : "text-gray-600 hover:text-[#0F4C81]"}`}
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
              className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full shadow-lg ring-2 ring-white"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <div ref={panelRef} className="absolute right-0 mt-2 z-50">
            <NotificationPanel
              notifications={notifications}
              onMarkAllRead={markAllRead}
              onItemClick={(id) => {
                markRead(id);
                // Close panel after marking as read
                if (notifications.filter(n => !n.read).length <= 1) {
                  setIsOpen(false);
                }
              }}
              onClose={() => setIsOpen(false)}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
