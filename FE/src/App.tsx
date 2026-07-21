import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "./components/Sidebar";
import Login from "./pages/Login";
import ActivateAccount from "./pages/ActivateAccount";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import LaporanUser from "./pages/Reports";
import DataLokasi from "./pages/Data_Lokasi";
import ProtectedRoute from "./routes/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { ToastProvider } from "./components/Toast";
import User from "./pages/Users";
import UserDetail from "./pages/UserDetail";
import PrivacyTerms from "./pages/PrivacyTerms";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import NotificationBell from "./components/NotificationBell";
import Avatar from "./components/ui/Avatar";
import { DarkModeProvider, useDarkMode } from "./context/DarkModeContext";
import { Moon, Sun } from "lucide-react";
import { useAuth } from "./hooks/useAuth";
import LupaPassword from "./pages/LupaPassword";
import ResetPassword from "./pages/ResetPassword";
import Performa from "./pages/Performa";

function UnauthorizedPage() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 text-center px-4 dark:bg-surface">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-md p-8 dark:bg-surface">
        <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5 text-red-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Akses Ditolak</h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Anda tidak memiliki izin (role yang sesuai) untuk mengakses halaman ini. Silakan hubungi administrator sistem.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="w-full py-2.5 bg-[#0F4C81] hover:bg-[#0c3c68] text-white font-semibold rounded-xl text-sm transition-colors cursor-pointer"
        >
          Kembali ke Dashboard
        </button>
      </div>
    </div>
  );
}

interface PageHeaderProps {
  title?: string;
}

function PageHeader({ title }: PageHeaderProps) {
  const { user } = useAuth();
  const { isDark, toggle } = useDarkMode();

  return (
    <header className="flex items-center justify-between px-8 py-6 bg-white border-b border-gray-200 dark:bg-base dark:border-line">
      <h1 className="text-[2rem] font-bold text-[#0F4C81] tracking-tight dark:text-ink">
        {title || "Dashboard"}
      </h1>
      <div className="flex items-center gap-4">
        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          title={isDark ? "Mode terang" : "Mode gelap"}
          aria-label="Toggle dark mode"
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-ink/10 text-gray-600 dark:text-ink transition-colors cursor-pointer dark:bg-elevated"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notification Bell */}
        <NotificationBell />

        {/* User Info */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-800 dark:text-ink">{user?.namaLengkap || "User"}</p>
            <p className="text-xs text-gray-500 dark:text-muted">{user?.role || "Admin"}</p>
          </div>
          <Avatar name={user?.namaLengkap || "User"} src={user?.avatar} size="md" />
        </div>
      </div>
    </header>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="flex-1 flex flex-col min-h-screen"
      >
        <Routes location={location}>
          <Route index path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/activate-account" element={<ActivateAccount />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <PageHeader title="Dashboard" />
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/:id"
            element={
              <ProtectedRoute>
                <PageHeader title="Detail Pengguna" />
                <UserDetail />
              </ProtectedRoute>
            }
          />
          <Route path="/lupa-password" element={<LupaPassword />} />
<Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/tasks/*"
            element={
              <ProtectedRoute>
                <PageHeader title="Tugas" />
                <Tasks />
              </ProtectedRoute>
            }
          />
          <Route
  path="/performa"
  element={
    <ProtectedRoute>
      <Performa />
    </ProtectedRoute>
  }
/>
          <Route
            path="/tugas-insidental"
            element={
              <ProtectedRoute>
                <PageHeader title="Tugas" />
                <Tasks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <PageHeader title="Laporan Pengguna" />
                <LaporanUser />
              </ProtectedRoute>
            }
          />
          <Route
            path="/datalokasi"
            element={
              <ProtectedRoute>
                <PageHeader title="Data Lokasi" />
                <DataLokasi />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <PageHeader title="Manajemen Pengguna" />
                <User />
              </ProtectedRoute>
            }
          />
          <Route
            path="/privasisyarat"
            element={
              <ProtectedRoute>
                <PageHeader title="Privasi &amp; Syarat Ketentuan" />
                <PrivacyTerms />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function AppLayout() {
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";
  const isActivateAccountPage = location.pathname === "/activate-account";
  const isUnauthorizedPage = location.pathname === "/unauthorized";
  const hideSidebar = isLoginPage || isActivateAccountPage || isUnauthorizedPage;

  return (
    <div className="flex min-h-screen bg-white w-full dark:bg-base">
      {!hideSidebar && <Sidebar />}
      <main className="flex-1 overflow-y-auto flex flex-col min-h-screen dark:bg-base">
        <AnimatedRoutes />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <DarkModeProvider>
          <AuthProvider>
            <NotificationProvider>
              <ToastProvider>
                <AppLayout />
              </ToastProvider>
            </NotificationProvider>
          </AuthProvider>
        </DarkModeProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
