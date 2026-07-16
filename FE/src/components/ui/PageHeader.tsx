import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import NotificationPanel from "../NotificationPanel";

interface PageHeaderProps {
  title: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title }) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAllRead, markRead, fetchNotifications } = useNotifications();
  const navigate = useNavigate();

  const [showNotif, setShowNotif] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevUnreadRef = useRef(unreadCount);

  // Trigger pulse animation when new notification arrives
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 1000);
      return () => clearTimeout(timer);
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  // Tampilkan max 99+, otherwise tampilkan angka actual

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleNotifItemClick = (id: string) => {
    markRead(id);
  };

  const name = user?.namaLengkap || "User Lapor OB";
  const role = user?.role || "OB";
  const avatar = user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0F4C81&color=fff&bold=true`;

  return (
    <header className="flex items-center justify-between px-8 py-6 bg-white border-b border-gray-200 select-none">
      <h1 className="text-[2rem] font-bold text-[#0F4C81] tracking-tight">{title}</h1>
      <div className="flex items-center gap-5">
        {/* Notifikasi */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.1, rotate: -5 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setShowNotif((isOpen) => {
                const nextIsOpen = !isOpen;
                if (nextIsOpen) fetchNotifications().catch(() => {});
                return nextIsOpen;
              });
              setShowAdminMenu(false);
            }}
            className="relative p-1 text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {unreadCount > 0 && (
              <AnimatePresence>
                <motion.span
                  key={unreadCount}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className={`absolute -top-1 -right-1.5 min-w-[20px] h-[20px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white ${isAnimating ? "shadow-lg shadow-red-500/50" : ""}`}
                >
                  <AnimatePresence>
                    {isAnimating && (
                      <motion.span
                        initial={{ scale: 1 }}
                        animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                        transition={{ duration: 0.5, repeat: 1 }}
                        className="absolute inset-0 rounded-full bg-red-400"
                      />
                    )}
                  </AnimatePresence>
                  <span className="relative z-10">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                </motion.span>
              </AnimatePresence>
            )}
          </motion.button>
          {showNotif && (
            <NotificationPanel
              notifications={notifications}
              onMarkAllRead={markAllRead}
              onItemClick={handleNotifItemClick}
            />
          )}
        </div>

        <div className="h-10 w-px bg-gray-300 mx-1"></div>

        {/* Profile menu */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setShowAdminMenu((v) => !v);
              setShowNotif(false);
            }}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity cursor-pointer text-left focus:outline-none"
          >
            <img src={avatar} alt={name} className="h-9 w-9 rounded-full object-cover" />
            <div className="text-left leading-tight hidden sm:block">
              <p className="font-bold text-sm text-gray-900">{name}</p>
              <p className="text-[11px] text-gray-400">{role}</p>
            </div>
          </motion.button>
          {showAdminMenu && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-0 mt-3 w-40 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-20 text-sm"
            >
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-red-500 hover:bg-gray-50 font-medium cursor-pointer"
              >
                Logout
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </header>
  );
};

export default PageHeader;
