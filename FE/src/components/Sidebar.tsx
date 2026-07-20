import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation, useNavigate, type Location } from "react-router-dom";
import {
  House,
  ListChecks,
  BarChart3,
  Building2,
  CircleUser,
  TrendingUp,
  LogOut,
  ShieldCheck,
  Menu,
  CircleX,
  AlertTriangle,
  CornerDownRight,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../types/auth";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  href: string;
  roles: UserRole[];
  children?: NavItem[];
}

const iconProps = { strokeWidth: 2 } as const;

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: '/dashboard', icon: House, roles: ["Admin", "HR", "Karyawan"] },
  {
    id: "tasks",
    label: "Tugas",
    href: '/tasks',
    icon: ListChecks,
    roles: ["Admin", "HR"],
    children: [
      { id: "tasks-insidental", label: "Tugas Biasa", href: '/tugas-insidental', icon: ListChecks, roles: ["Admin", "HR"] },
    ],
  },
  { id: "reports", label: "Laporan Pengguna", href: '/reports', icon: BarChart3, roles: ["Admin", "HR"] },
  { id: "locations", label: "Lokasi", href: '/datalokasi', icon: Building2, roles: ["Admin", "HR"] },
  { id: "users", label: "Pengguna", href: '/users', icon: CircleUser, roles: ["Admin"] },
  { id: "performa", label: "Performa", href: '/performa', icon: TrendingUp, roles: ["Admin", "HR"] },
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

  return (
    <>
      <div className="md:hidden flex items-center justify-between bg-white border-b border-slate-200/80 p-4 sticky top-0 z-40 shadow-sm dark:bg-elevated dark:border-line">
        <div className="flex items-center gap-2">
          <img src="/src/assets/WGSLogoNoBG.png" alt="Logo WGS" className="h-5" />
          <h1 className="text-lg font-bold text-[#0F4C81] tracking-tight dark:text-ink">Lapor OB</h1>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 rounded-md text-slate-600 hover:text-[#0F4C81] hover:bg-slate-50 transition-colors focus:outline-none cursor-pointer dark:text-muted dark:bg-surface"
          aria-label="Toggle menu"
        >
          {isOpen ? <CircleX className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>
      <aside className="hidden md:block w-56 h-screen sticky top-0 flex-shrink-0 bg-[#F3F7FC] dark:bg-elevated">
        <SidebarContent location={location} setIsOpen={setIsOpen} onLogout={handleLogoutClick} />
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
              className="md:hidden fixed inset-y-0 left-0 w-64 h-full z-50 bg-[#F3F7FC] shadow-2xl dark:bg-elevated"
            >
              <div className="absolute top-5 right-4 z-50">
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 cursor-pointer transition-colors"
                >
                  <CircleX className="w-5 h-5" />
                </button>
              </div>
              <SidebarContent location={location} setIsOpen={setIsOpen} onLogout={handleLogoutClick} />
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
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-surface"
            >
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle
                  className="w-7 h-7 text-red-800"
                  {...iconProps}
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
                  className="w-full py-2.5 rounded-lg bg-white text-slate-700 font-medium text-sm border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer dark:bg-surface"
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

interface SidebarContentProps {
  location: Location;
  setIsOpen: (open: boolean) => void;
  onLogout: () => void;
}

export function SidebarContent({ location, setIsOpen, onLogout }: SidebarContentProps) {
  // Dropdown: parent dengan child (Tugas) otomatis terbuka bila route-nya aktif.
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(
      navItems
        .filter((i) => i.children?.length && (location.pathname === i.href || i.children.some((c) => location.pathname === c.href)))
        .map((i) => i.id)
    )
  );
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Sinkronkan dropdown dengan route: terbuka bila sedang di halaman Tugas/Insidental,
  // tertutup (collapse) saat berpindah ke halaman lain.
  useEffect(() => {
    setExpanded(
      new Set(
        navItems
          .filter((i) => i.children?.length && (location.pathname === i.href || i.children.some((c) => location.pathname === c.href)))
          .map((i) => i.id)
      )
    );
  }, [location.pathname]);

  return (
    <div className="flex flex-col h-full bg-[#F3F7FC] text-slate-800 py-6 px-3 select-none border-r border-slate-200/60 dark:bg-elevated dark:text-ink dark:border-line">
      <div className="flex items-center gap-0.5 mb-0.5 px-1 pb-5 -mt-10">
        <img
          src="/src/assets/WGSLogoNoBG.png"
          alt="Logo WGS"
          className="h-25 object-contain"
        />
        <h1 className="text-lg font-bold tracking-tight text-[#0F4C81] font-sans dark:text-ink">
          Lapor OB
        </h1>
      </div>
      <nav className="flex-1 space-y-1.5 overflow-y-auto -mt-9">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          const hasActiveChild = item.children?.some((c) => location.pathname === c.href);
          const hasChildren = Boolean(item.children?.length);
          // Dropdown: child hanya tampil saat parent "Tugas" dibuka (aktif atau di-klik).
          const isOpen = expanded.has(item.id);

          return (
            <div key={item.id}>
              <motion.div
                whileHover={{ x: 4 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Link
                  to={item.href}
                  onClick={() => { if (hasChildren) toggle(item.id); setIsOpen(false); }}
                  className={`w-full flex items-center gap-4 py-2.5 px-3 rounded-md text-sm transition-all duration-200 cursor-pointer ${
                    isActive || hasActiveChild
                      ? "text-[#0F4C81] bg-[#DCE6F7] font-semibold"
                      : "text-slate-600 font-medium hover:text-slate-800 hover:bg-slate-200/50 dark:text-muted dark:hover:bg-ink/10 dark:hover:text-[#CCD0CF]"
                  }`}
                >
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    <Icon
                      className={`w-[18px] h-[18px] ${
                        isActive || hasActiveChild ? "text-[#0F4C81]" : "text-slate-500"
                      }`}
                      {...iconProps}
                    />
                  </motion.div>
                  <span className="flex-1">{item.label}</span>
                  {hasChildren && (
                    <motion.span animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronRight
                        className={`w-4 h-4 ${isActive || hasActiveChild ? "text-[#0F4C81]" : "text-slate-400"}`}
                        strokeWidth={2}
                      />
                    </motion.span>
                  )}
                </Link>
              </motion.div>

              {/* Sub-navigasi (Tugas Insidental) — dropdown, tersembunyi saat parent tidak aktif/tidak dibuka */}
              <AnimatePresence initial={false}>
                {hasChildren && isOpen && (
                  <motion.div
                    key="children"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="pl-4 overflow-hidden"
                  >
                    {item.children!.map((child, idx) => {
                      const ChildIcon = child.icon;
                      const isChildActive = location.pathname === child.href;
                      return (
                        <motion.div
                          key={child.id}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.03 * idx, type: "spring", stiffness: 300, damping: 20 }}
                          whileHover={{ x: 4 }}
                        >
                          <Link
                            to={child.href}
                            onClick={() => setIsOpen(false)}
                            className={`w-full flex items-center gap-2 py-2 px-3 rounded-md text-[13px] transition-all duration-200 cursor-pointer ${
                              isChildActive
                                ? "text-[#0F4C81] font-semibold"
                                : "text-slate-500 font-medium dark:text-muted"
                            }`}
                          >
                            <CornerDownRight className={`w-3.5 h-3.5 shrink-0 ${isChildActive ? "text-[#0F4C81]" : "text-slate-400"}`} strokeWidth={2} />
                            <ChildIcon
                              className={`w-4 h-4 shrink-0 ${isChildActive ? "text-[#0F4C81]" : "text-slate-400"}`}
                              {...iconProps}
                            />
                            <span>{child.label}</span>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
                : "text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 dark:text-muted dark:hover:bg-ink/10 dark:hover:text-[#CCD0CF]"
            }`}
          >
            <ShieldCheck className="w-[18px] h-[18px]" />
            <span>Privasi &amp; Syarat Ketentuan</span>
          </Link>
        </motion.div>
      </div>

      {/* Logout Button */}
      <div className="pt-4 mt-auto border-t border-transparent">
        <motion.div
          whileHover={{ x: 4 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <button
            onClick={onLogout}
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
}

export default Sidebar;