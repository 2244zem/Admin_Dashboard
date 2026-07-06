import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import {
  House,
  ListChecks,
  BarChart3,
  Building2,
  User,
  LogOut,
  Menu,
  X
} from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: '/', icon: House },
  { id: "tasks", label: "Tasks", href: '/tasks', icon: ListChecks },
  { id: "reports", label: "Reports", href: '/reports', icon: BarChart3 },
  { id: "locations", label: "Locations", href: '/locations', icon: Building2 },
  { id: "users", label: "Users", href: '/users', icon: User },
];

interface SidebarProps {
  onCreateTask?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#F3F7FC] text-slate-800 py-6 px-3 select-none border-r border-slate-200/60">
      
      {/* Logo & Title */}
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

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto -mt-9">
        {navItems.map((item) => {
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

      {/* Logout Button */}
      <div className="pt-4 mt-auto border-t border-transparent">
        <motion.div
          whileHover={{ x: 4 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <button
            className="w-full flex items-center gap-4 py-2.5 px-3 text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 rounded-md font-medium text-sm transition-all duration-200 cursor-pointer group"
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
      {/* Mobile Header */}
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
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-56 h-screen sticky top-0 flex-shrink-0 bg-[#F3F7FC]">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar (Animated) */}
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
                  <X className="w-5 h-5" />
                </button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
