import React from "react";
import { motion } from "framer-motion";

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

const LaporanUser = () => {
  const dataLaporan = [
    { id: 1, initial: "JD", name: "John Doe", loc: "Toilet Lantai 2", desc: "Wastafel tersumbat", time: "10:45 AM", status: "Menunggu", statusColor: "bg-orange-100 text-orange-600" },
    { id: 2, initial: "AS", name: "Alice Smith", loc: "Lobi Utama", desc: "Tumpahan kopi di dekat area lift.", time: "09:12 AM", status: "Ditugaskan", statusColor: "bg-blue-100 text-blue-600" },
    { id: 3, initial: "RK", name: "Robert King", loc: "Ruang Rapat 4C", desc: "Unit AC mengeluarkan suara berisik.", time: "Kemarin", status: "Selesai", statusColor: "bg-green-100 text-green-600" },
    { id: 4, initial: "ML", name: "Maria Lopez", loc: "Parkir Barat B2", desc: "Lampu neon mati di dekat pilar B22.", time: "08:05 AM", status: "Menunggu", statusColor: "bg-orange-100 text-orange-600" },
  ];

  return (
    <div className="flex h-screen bg-white font-sans text-gray-800">
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-8 py-6 bg-white border-b border-gray-200">
          <h1 className="text-[2rem] font-bold text-[#0F4C81] tracking-tight">
            Laporan User
          </h1>
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Ekspor CSV
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0F4C81] rounded-md hover:bg-[#0a355c] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Laporan Manual
            </motion.button>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-white p-8">
          
          {/* 1. FILTER SECTION */}
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.25 }}
            className="grid grid-cols-4 gap-4 mb-6"
          >
            {/* Filter Status */}
            <motion.div
              whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="border border-gray-200 rounded-xl p-4 transition-shadow"
            >
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Filter Status</label>
              <select className="w-full bg-gray-100 text-gray-700 text-sm rounded-md px-3 py-2 outline-none appearance-none cursor-pointer">
                <option>Semua Status</option>
              </select>
            </motion.div>
            {/* Filter Lokasi */}
            <motion.div
              whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="border border-gray-200 rounded-xl p-4 transition-shadow"
            >
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Filter Lokasi</label>
              <select className="w-full bg-gray-100 text-gray-700 text-sm rounded-md px-3 py-2 outline-none appearance-none cursor-pointer">
                <option>Semua Area</option>
              </select>
            </motion.div>
            {/* Rentang Waktu */}
            <motion.div
              whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="border border-gray-200 rounded-xl p-4 transition-shadow"
            >
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Rentang Waktu</label>
              <select className="w-full bg-gray-100 text-gray-700 text-sm rounded-md px-3 py-2 outline-none appearance-none cursor-pointer">
                <option>Hari Ini</option>
              </select>
            </motion.div>
            {/* Laporan Aktif */}
            <motion.div
              whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="border border-gray-200 rounded-xl p-4 flex items-center justify-between transition-shadow"
            >
              <div>
                <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Laporan Aktif</span>
                <span className="text-base font-bold text-[#0F4C81]">24 Laporan</span>
              </div>
              <motion.div
                whileHover={{ scale: 1.1, rotate: 3 }}
                transition={{ type: "spring", stiffness: 400, damping: 12 }}
                className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-[#0F4C81]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* 2. TABLE SECTION */}
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.25, delay: 0.05 }}
            className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden mb-6"
          >
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="text-[11px] font-bold text-gray-500 uppercase border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Nama Pengguna</th>
                  <th className="px-6 py-4">Lokasi</th>
                  <th className="px-6 py-4">Deskripsi Masalah</th>
                  <th className="px-6 py-4">Bukti</th>
                  <th className="px-6 py-4">Waktu</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dataLaporan.map((row) => (
                  <motion.tr
                    key={row.id}
                    whileHover={{ backgroundColor: "rgba(15, 76, 129, 0.03)" }}
                    className="transition-colors cursor-default"
                  >
                    <td className="px-6 py-4 flex items-center gap-3">
                      <motion.div
                        whileHover={{ scale: 1.15 }}
                        transition={{ type: "spring", stiffness: 400, damping: 12 }}
                        className="h-8 w-8 rounded-full bg-blue-100 text-[#0F4C81] flex items-center justify-center font-bold text-xs"
                      >
                        {row.initial}
                      </motion.div>
                      <span className="font-medium text-gray-800">{row.name}</span>
                    </td>
                    <td className="px-6 py-4 text-blue-500">{row.loc}</td>
                    <td className="px-6 py-4">{row.desc}</td>
                    <td className="px-6 py-4">
                      {/* Placeholder gambar kotak abu-abu */}
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="h-8 w-12 bg-gray-300 rounded-md"
                      ></motion.div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{row.time}</td>
                    <td className="px-6 py-4">
                      <motion.span
                        whileHover={{ scale: 1.05 }}
                        className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold ${row.statusColor}`}
                      >
                        {row.status}
                      </motion.span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 text-sm text-gray-500">
              <span>Menampilkan 1 sampai 4 dari 24 laporan</span>
              <div className="flex items-center gap-1">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="px-2 py-1 hover:text-gray-800 cursor-pointer"
                >{'\u003C'}</motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-3 py-1 bg-[#0F4C81] text-white rounded-md font-medium cursor-pointer"
                >1</motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-3 py-1 hover:bg-gray-200 rounded-md cursor-pointer"
                >2</motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-3 py-1 hover:bg-gray-200 rounded-md cursor-pointer"
                >3</motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="px-2 py-1 hover:text-gray-800 cursor-pointer"
                >{'\u003E'}</motion.button>
              </div>
            </div>
          </motion.div>

          {/* 3. BOTTOM SECTION */}
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.25, delay: 0.1 }}
            className="grid grid-cols-3 gap-6"
          >
            
            {/* Lokasi Terpopuler (Kiri - Lebar 2 Kolom) */}
            <motion.div
              whileHover={{ y: -2, boxShadow: "0 6px 16px rgba(0,0,0,0.06)" }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="col-span-2 border border-gray-200 rounded-xl p-6 transition-shadow"
            >
              <h2 className="text-sm font-bold text-gray-700 mb-4">Lokasi Terpopuler</h2>
              <div className="grid grid-cols-4 gap-4">
                <motion.div
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="bg-gray-50 rounded-lg py-6 flex flex-col items-center justify-center gap-1 cursor-default"
                >
                  <span className="text-[11px] font-bold text-gray-500 uppercase">Toilet</span>
                  <span className="text-2xl font-bold text-red-500">8</span>
                </motion.div>
                <motion.div
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="bg-gray-50 rounded-lg py-6 flex flex-col items-center justify-center gap-1 cursor-default"
                >
                  <span className="text-[11px] font-bold text-gray-500 uppercase">Lobi</span>
                  <span className="text-2xl font-bold text-orange-400">5</span>
                </motion.div>
                <motion.div
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="bg-gray-50 rounded-lg py-6 flex flex-col items-center justify-center gap-1 cursor-default"
                >
                  <span className="text-[11px] font-bold text-gray-500 uppercase">Area Kantor</span>
                  <span className="text-2xl font-bold text-blue-500">4</span>
                </motion.div>
                <motion.div
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="bg-gray-50 rounded-lg py-6 flex flex-col items-center justify-center gap-1 cursor-default"
                >
                  <span className="text-[11px] font-bold text-gray-500 uppercase">Parkir</span>
                  <span className="text-2xl font-bold text-[#0F4C81]">3</span>
                </motion.div>
              </div>
            </motion.div>

            {/* Aktivitas Terbaru (Kanan - Lebar 1 Kolom) */}
            <motion.div
              whileHover={{ y: -2, boxShadow: "0 6px 16px rgba(0,0,0,0.06)" }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="col-span-1 border border-gray-200 rounded-xl p-6 transition-shadow"
            >
              <h2 className="text-sm font-bold text-gray-700 mb-6">Aktivitas Terbaru</h2>
              <div className="relative border-l border-gray-200 ml-3 space-y-6">
                
                {/* Item Timeline 1 */}
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.15 }}
                  className="relative pl-6"
                >
                  <motion.span
                    whileHover={{ scale: 1.5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    className="absolute -left-[5px] top-1 block h-2.5 w-2.5 rounded-full bg-green-500 ring-4 ring-white"
                  ></motion.span>
                  <p className="text-sm font-medium text-gray-800">Tugas Selesai</p>
                  <p className="text-xs text-gray-500 mt-0.5">OB #12 memperbaiki AC di Ruang 4C</p>
                  <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">10 Menit Yang Lalu</p>
                </motion.div>

                {/* Item Timeline 2 */}
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="relative pl-6"
                >
                  <motion.span
                    whileHover={{ scale: 1.5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    className="absolute -left-[5px] top-1 block h-2.5 w-2.5 rounded-full bg-blue-500 ring-4 ring-white"
                  ></motion.span>
                  <p className="text-sm font-medium text-gray-800">Aktivitas Baru</p>
                  <p className="text-xs text-gray-500 mt-0.5">Tumpahan di Lobi dikerjakan oleh OB #05</p>
                  <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">25 Menit Yang Lalu</p>
                </motion.div>

                {/* Item Timeline 3 */}
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.25 }}
                  className="relative pl-6"
                >
                  <motion.span
                    whileHover={{ scale: 1.5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    className="absolute -left-[5px] top-1 block h-2.5 w-2.5 rounded-full bg-orange-400 ring-4 ring-white"
                  ></motion.span>
                  <p className="text-sm font-medium text-gray-800">Laporan Baru</p>
                  <p className="text-xs text-gray-500 mt-0.5">John Doe melaporkan banjir Toilet</p>
                  <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">45 Menit Yang Lalu</p>
                </motion.div>

              </div>
            </motion.div>

          </motion.div>
        </main>
        
      </div>
    </div>
  );
};

export default LaporanUser;
