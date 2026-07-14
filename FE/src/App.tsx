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

function UnauthorizedPage() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 text-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-md p-8">
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
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/users/:id" 
            element={
              <ProtectedRoute allowedRoles={["Admin"]}>
                <UserDetail />
              </ProtectedRoute>
            } 
          />
          <Route
            path="/tasks"
            element={
              <ProtectedRoute>
                <Tasks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <LaporanUser />
              </ProtectedRoute>
            }
          />
          <Route
            path="/datalokasi"
            element={
              <ProtectedRoute allowedRoles={["Admin"]}>
                <DataLokasi />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={["Admin"]}>
                <User />
              </ProtectedRoute>
            } 
          /> 
          <Route
  path="/privasisyarat"
  element={
    <ProtectedRoute>
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
    <div className="flex min-h-screen bg-white w-full">
      {!hideSidebar && <Sidebar />}
      <main className="flex-1 overflow-y-auto flex flex-col min-h-screen">
        <AnimatedRoutes />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <ToastProvider>
            <AppLayout />
          </ToastProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
