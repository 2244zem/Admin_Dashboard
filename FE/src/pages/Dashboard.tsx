
import { motion } from "framer-motion";

const Dashboard = () => {
  return (
    <div className="flex h-screen bg-[#FFFFFF] font-sans">
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-8 py-6 bg-white border-b border-[#E2E8F0]">
          <h1 className="text-[2rem] font-bold text-[#0F4C81] tracking-tight">
            Dashboard
          </h1>
          <div className="flex items-center gap-5">
            <motion.button
              whileHover={{ scale: 1.1, rotate: -5 }}
              whileTap={{ scale: 0.9 }}
              className="relative p-1 text-gray-500 hover:text-gray-800 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
            </motion.button>
            <div className="h-10 w-px bg-gray-300 mx-1"></div>   
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 text-[#0F4C81] hover:opacity-80 transition-opacity"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold text-sm">Admin</span>
            </motion.button>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-[#FFFFFF] p-8">
          {/* Nanti card statistik, grafik, dll ditaruh di dalam sini */}
        </main>
        
      </div>
    </div>
  );
};

export default Dashboard;
