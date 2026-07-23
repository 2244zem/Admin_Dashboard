import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, ShieldCheck, Mail, Lock, KeyRound, UserCheck, Ban, AlertOctagon, Printer, Clock } from "lucide-react";

type TabKey = "syarat" | "privasi";

const ADMIN_AVATAR_INITIALS = "AO";

const LAST_UPDATED: Record<TabKey, string> = {
  syarat: "24 Mei 2024",
  privasi: "12 Oktober 2023",
};

function DocInfoPanel() {
  return (
    <div className="flex flex-col gap-4">
      <div className="border border-gray-200 rounded-2xl p-5 bg-white dark:bg-surface">
        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4">Informasi Dokumen</h3>

        <div className="mb-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase mb-1">Status</p>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
            <span>Terverifikasi 2024</span>
          </span>
        </div>

        <div className="mb-5">
          <p className="text-[11px] font-bold text-gray-400 uppercase mb-1">Versi</p>
          <p className="text-sm font-bold text-gray-800">v1.2.0-Latest</p>
        </div>

        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-sm font-bold text-[#0F4C81] mb-1">Butuh Bantuan Legal?</p>
          <p className="text-xs text-gray-500 mb-3">Hubungi tim kepatuhan kami untuk pertanyaan hukum.</p>
          <a href="mailto:legal@laporob.com" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F4C81] hover:underline">
            <Mail className="h-3.5 w-3.5" />
            <span>legal@laporob.com</span>
          </a>
        </div>
      </div>

      <div className="border border-gray-200 rounded-2xl p-5 bg-white dark:bg-surface">
        <div className="flex items-start gap-3">
          <span className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-4 w-4 text-[#0F4C81]" />
          </span>
          <div>
            <p className="text-sm font-bold text-[#0F4C81] mb-1">Trusted Systems</p>
            <p className="text-xs text-gray-500 leading-relaxed">Infrastructure managed by Tier 3 Data Centers with enterprise-grade protection.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SyaratKetentuanContent() {
  return (
    <div>
      <div className="bg-gradient-to-br from-[#0F4C81] to-[#123f6b] rounded-2xl p-7 text-white mb-6">
        <h2 className="text-xl font-bold mb-2">Legalitas Penggunaan Lapor-OB</h2>
        <p className="text-sm text-blue-100 max-w-2xl">Dokumen ini mengatur penggunaan platform Lapor-OB oleh administrator dan staf fasilitas.</p>
      </div>

      <div className="space-y-6">
        <section>
          <h3 className="text-base font-bold text-gray-900 mb-2">1. Ketentuan Umum</h3>
          <p className="text-sm text-gray-600 leading-relaxed">Platform Lapor-OB disediakan untuk memfasilitasi pelaporan operasional Office Boy dan manajemen fasilitas gedung. Penggunaan akun admin hanya diperuntukkan bagi personel yang ditunjuk secara resmi.</p>
        </section>

        <section>
          <h3 className="text-base font-bold text-gray-900 mb-3">2. Akun Administrator</h3>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-sm text-gray-600">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0F4C81] mt-2 shrink-0"></span>
              <span>Anda bertanggung jawab untuk menjaga kerahasiaan kredensial login akun administrator Anda.</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-600">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0F4C81] mt-2 shrink-0"></span>
              <span>Setiap aktivitas yang terjadi di bawah akun Anda dianggap tanggung jawab Anda sepenuhnya.</span>
            </li>
          </ul>
        </section>

        <section>
          <h3 className="text-base font-bold text-gray-900 mb-3">3. Larangan Penggunaan</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-red-100 bg-red-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Ban className="h-4 w-4 text-red-500" />
                <p className="text-sm font-bold text-gray-800">Manipulasi Data</p>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">Mengubah laporan secara curang untuk kepentingan pribadi.</p>
            </div>
            <div className="border border-orange-100 bg-orange-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <AlertOctagon className="h-4 w-4 text-orange-500" />
                <p className="text-sm font-bold text-gray-800">Pelanggaran Sistem</p>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">Mencoba meretas atau mengganggu stabilitas infrastruktur aplikasi.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function KebijakanPrivasiContent() {
  return (
    <div>
      <div className="bg-gradient-to-br from-[#0F4C81] to-[#123f6b] rounded-2xl p-7 text-white mb-6">
        <h2 className="text-xl font-bold mb-2">Komitmen Keamanan Data Admin</h2>
        <p className="text-sm text-blue-100 max-w-2xl">Kami memastikan setiap interaksi dan data operasional di platform Lapor-OB dikelola dengan standar keamanan tertinggi demi integritas fasilitas Anda.</p>
      </div>

      <div className="space-y-6">
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
              <Lock className="h-4 w-4 text-[#0F4C81]" />
            </span>
            <h3 className="text-base font-bold text-gray-900">1. Prinsip Perlindungan Data</h3>
          </div>
          <p className="text-sm text-gray-600 mb-3">Kami berkomitmen untuk:</p>
          <ul className="space-y-2 pl-1">
            <li className="flex items-start gap-2 text-sm text-gray-600">
              <UserCheck className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span>Melakukan enkripsi data pada setiap laporan.</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-600">
              <UserCheck className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span>Membatasi akses data personil OB hanya kepada Admin terotorisasi.</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-600">
              <UserCheck className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span>Menyediakan log audit untuk setiap perubahan status laporan.</span>
            </li>
          </ul>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
              <KeyRound className="h-4 w-4 text-[#0F4C81]" />
            </span>
            <h3 className="text-base font-bold text-gray-900">2. Penggunaan Token dan Sesi</h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">Keamanan login admin dikelola menggunakan sistem berbasis TypeScript. Dilarang keras membagikan kredensial login kepada pihak lain.</p>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-[#0F4C81]" />
            </span>
            <h3 className="text-base font-bold text-gray-900">3. Tanggung Jawab Admin</h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">Admin bertanggung jawab penuh atas kerahasiaan data yang diakses dan validitas setiap validasi laporan yang dilakukan di dalam sistem.</p>
        </section>
      </div>
    </div>
  );
}

export default function PrivacyTerms() {
  const [activeTab, setActiveTab] = useState<TabKey>("syarat");
  const [showNotif, setShowNotif] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex h-screen bg-white font-sans dark:bg-base">
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-8 py-6 bg-white border-b border-gray-200 dark:bg-surface">
          <h1 className="text-[2rem] font-bold text-[#0F4C81] tracking-tight">Privasi dan Syarat Ketentuan</h1>
          <div className="flex items-center gap-5">
            <div className="relative">
              <motion.button whileHover={{ scale: 1.1, rotate: -5 }} whileTap={{ scale: 0.9 }} onClick={() => setShowNotif((v) => !v)} className="relative p-1 text-gray-500 hover:text-gray-800 transition-colors">
                <Bell className="h-6 w-6" />
              </motion.button>
              <AnimatePresence>
                {showNotif ? (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute right-0 mt-3 w-64 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-20 text-sm text-gray-500 dark:bg-surface">
                    Tidak ada notifikasi baru
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="h-10 w-px bg-gray-300 mx-1"></div>

            <div className="flex items-center gap-2.5">
              <div className="text-right leading-tight">
                <p className="font-bold text-sm text-gray-900">Admin</p>
                <p className="text-[11px] text-gray-400">Administrator</p>
              </div>
              <span className="h-9 w-9 rounded-full bg-blue-100 text-[#0F4C81] flex items-center justify-center font-bold text-xs">{ADMIN_AVATAR_INITIALS}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-white p-6 dark:bg-base">
          <div className="flex items-center gap-6 border-b border-gray-200 mb-6">
            <button onClick={() => setActiveTab("syarat")} className={activeTab === "syarat" ? "pb-3 text-sm font-semibold border-b-2 text-[#0F4C81] border-[#0F4C81] cursor-pointer" : "pb-3 text-sm font-semibold border-b-2 text-gray-400 border-transparent hover:text-gray-600 cursor-pointer"}>
              Syarat dan Ketentuan
            </button>
            <button onClick={() => setActiveTab("privasi")} className={activeTab === "privasi" ? "pb-3 text-sm font-semibold border-b-2 text-[#0F4C81] border-[#0F4C81] cursor-pointer" : "pb-3 text-sm font-semibold border-b-2 text-gray-400 border-transparent hover:text-gray-600 cursor-pointer"}>
              Kebijakan Privasi
            </button>
          </div>

          <div className="grid grid-cols-3 gap-6 items-start">
            <div className="col-span-2 border border-gray-200 rounded-2xl p-7 bg-white dark:bg-surface">
              {activeTab === "syarat" ? <SyaratKetentuanContent /> : <KebijakanPrivasiContent />}

              <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100">
                <span className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Terakhir diperbarui: {LAST_UPDATED[activeTab]}</span>
                </span>
                <button onClick={handlePrint} className="flex items-center gap-2 bg-[#0F4C81] hover:bg-[#0a355c] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer">
                  <Printer className="h-4 w-4" />
                  <span>Cetak PDF</span>
                </button>
              </div>
            </div>

            <DocInfoPanel />
          </div>

          <p className="text-center text-xs text-gray-400 mt-8">2024 Lapor-OB Facility Management. Seluruh Hak Cipta Dilindungi.</p>
        </main>
      </div>
    </div>
  );
}