import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  House,
  ListChecks,
  BarChart3,
  Building2,
  CircleUser,
  LogOut,
  ShieldCheck,
  Menu,
  CircleX,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types/auth";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: '/dashboard', icon: House, roles: ["Admin", "HR", "Karyawan"] },
  { id: "tasks", label: "Tugas", href: '/tasks', icon: ListChecks, roles: ["Admin", "HR"] },
  { id: "reports", label: "Laporan Pengguna", href: '/reports', icon: BarChart3, roles: ["Admin", "HR"] },
  { id: "locations", label: "Lokasi", href: '/datalokasi', icon: Building2, roles: ["Admin", "HR"] },
  { id: "users", label: "Pengguna", href: '/users', icon: CircleUser, roles: ["Admin"] },
];

interface SidebarProps {
  onCreateTask?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Tampilkan semua menu sidebar (filter role ditangani oleh ProtectedRoute di level halaman)
  const visibleNavItems = navItems;

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = async () => {
    // Use auth context logout (revokes session on backend)
    await logout();
    setShowLogoutConfirm(false);
    setIsOpen(false);
    navigate("/login");
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#F3F7FC] text-slate-800 py-6 px-3 select-none border-r border-slate-200/60">
      <div className="flex items-center gap-0.5 mb-0.5 px-1 pb-5 -mt-10">
        <img 
          src="/src/assets/WGSLogoNoBG.png" 
          alt="Logo WGS" 
          className="h-25 object-contain" 
        />
        <h1 className="text-lg font-bold tracking-tight text-[#0F4C81] font-sans">
          Lapor OB
        </h1>
      </div>
      <nav className="flex-1 space-y-1.5 overflow-y-auto -mt-9">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;

          return (
            <motion.div
              key={item.id}
              whileHover={{ x: 4 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Link
                to={item.href}
                onClick={() => setIsOpen(false)}
                className={`w-full flex items-center gap-4 py-2.5 px-3 rounded-md text-sm transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "text-[#0F4C81] bg-[#DCE6F7] font-semibold"
                    : "text-slate-600 font-medium hover:text-slate-800 hover:bg-slate-200/50"
                }`}
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  <Icon
                    className={`w-[18px] h-[18px] ${
                      isActive ? "text-[#0F4C81]" : "text-slate-500"
                    }`}
                    {...({ strokeWidth: 2 } as any)}
                  />
                </motion.div>
                <span>{item.label}</span>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Privasi & Syarat Ketentuan */}
<div className="pt-2">
  <motion.div whileHover={{ x: 4 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
    <Link
      to="/privasisyarat"
      onClick={() => setIsOpen(false)}
      className={`w-full flex items-center gap-4 py-1 px-3 rounded-md text-sm transition-all duration-200 cursor-pointer ${
        location.pathname === "/privasisyarat"
          ? "text-black"
          : "text-slate-600 hover:text-slate-800 hover:bg-slate-200/50"
      }`}
    >
      <ShieldCheck className="w-[18px] h-[18px]" />
      <span>Privasi &amp; syarat ketentuan</span>
    </Link>
  </motion.div>
</div>

{/* Logout Button */}

      {/* Logout Button */}
      <div className="pt-4 mt-auto border-t border-transparent">
        <motion.div
          whileHover={{ x: 4 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center gap-4 py-2.5 px-3 text-slate-500 hover:text-white hover:bg-red-400 rounded-md font-medium text-sm transition-all duration-200 cursor-pointer group"
          >
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 12 }}
            >
              <LogOut className="w-[18px] h-[18px]" />
            </motion.div>
            <span>Logout</span>
          </button>
        </motion.div>
      </div>
    </div>
  );

  return (
    <>
      <div className="md:hidden flex items-center justify-between bg-white border-b border-slate-200/80 p-4 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2">
          <img src="/src/assets/WGSLogoNoBG.png" alt="Logo WGS" className="h-5" />
          <h1 className="text-lg font-bold text-[#0F4C81] tracking-tight">Lapor OB</h1>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 rounded-md text-slate-600 hover:text-[#0F4C81] hover:bg-slate-50 transition-colors focus:outline-none cursor-pointer"
          aria-label="Toggle menu"
        >
          {isOpen ? <CircleX className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>
      <aside className="hidden md:block w-56 h-screen sticky top-0 flex-shrink-0 bg-[#F3F7FC]">
        <SidebarContent />
      </aside>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="md:hidden fixed inset-0 bg-black z-40"
            />

            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
              className="md:hidden fixed inset-y-0 left-0 w-64 h-full z-50 bg-[#F3F7FC] shadow-2xl"
            >
              <div className="absolute top-5 right-4 z-50">
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 cursor-pointer transition-colors"
                >
                  <CircleX className="w-5 h-5" />
                </button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4"
            onClick={handleCancelLogout}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            >
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle
                    className="w-7 h-7 text-red-800"
                    {...({ strokeWidth: 2 } as any)}
                    fill="currentColor"
                    fillOpacity={0}
                  />
                </div>
              </div>

              <p className="text-center text-sm text-slate-600 leading-relaxed mb-6">
                Apakah Anda yakin ingin keluar dari sistem? Anda harus masuk
                kembali untuk mengakses dashboard management.
              </p>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleConfirmLogout}
                  className="w-full py-2.5 rounded-lg bg-[#0F2F6B] text-white font-semibold text-sm hover:bg-[#0c2657] transition-colors cursor-pointer"
                >
                  Keluar
                </button>
                <button
                  onClick={handleCancelLogout}
                  className="w-full py-2.5 rounded-lg bg-white text-slate-700 font-medium text-sm border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;