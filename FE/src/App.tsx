import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard" ;
import Tasks from "./pages/Tasks";
import Reports from "./pages/Reports";

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
      >
        <Routes location={location}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/location" element={<div className="p-8">Location</div>} />
          <Route path="/users" element={<div className="p-8">Users</div>} />
          <Route path="/token" element={<div className="p-8">Token</div>} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-white">
        <Sidebar /> 
        <main className="flex-1 overflow-y-auto">
          <AnimatedRoutes />
        </main>
      </div>
    </BrowserRouter>
  );
}
