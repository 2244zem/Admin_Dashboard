import { motion } from "framer-motion";

const Tasks = () => {
    return (
        <div>
            <div className="flex h-screen bg-[#FFFFFF] font-sans">
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-8 py-6 bg-white border-b border-[#E2E8F0]">
          <h1 className="text-[2rem] font-bold text-[#0F4C81] tracking-tight">
            Manajemen Tugas 
          </h1>
          <div className="flex items-center gap-5">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center justify-center gap-2 bg-[#0F4C81] hover:bg-[#0a355c] text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all duration-200 shadow-sm"
            >
             <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="18" 
            height="18" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth={2.5} >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
                <span>
                    Buat Tugas baru
                </span>
                
            </motion.button>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-[#FFFFFF] p-8">
          {/* Nanti card statistik, grafik, dll ditaruh di dalam sini */}
        </main>     
   </div>
    </div>
        </div>
    );
};

export default Tasks;
