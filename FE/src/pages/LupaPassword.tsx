import { useState } from "react";
import type { FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { requestPasswordReset } from "../api/auth";
import { getErrorMessage } from "../lib/utils";

const LupaPassword = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  const handleChange = (value: string) => {
    setEmail(value);
    if (emailError) setEmailError(null);
    if (errorMsg) setErrorMsg(null);
  };

  const validate = (): boolean => {
    if (!email.trim()) {
      setEmailError("Email wajib diisi.");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("Format email tidak valid.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!validate()) return;

    setIsLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setIsSent(true);
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-100 p-4 font-sans">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <img
              src="/src/assets/WGSLogoNoBG.png"
              alt="Logo WGS"
              className="h-20 w-auto object-contain transform scale-110 -mt-4"
            />
            <span className="text-3xl font-bold text-[#0F4C81] tracking-tight -mx-3 -mt-6">
              Lapor OB
            </span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row -mt-7">
          <div className="relative w-full md:w-1/2 h-56 md:h-auto overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80"
              alt="Ruang kerja modern"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F4C81]/90 via-[#0F4C81]/40 to-[#0F4C81]/10" />
            <div className="relative h-full flex flex-col justify-end p-8 text-white">
              <h2 className="text-2xl font-bold leading-snug">
                Efisiensi Fasilitas di Genggaman Anda
              </h2>
              <p className="text-sm text-white/80 mt-2 max-w-xs">
                Kelola laporan, tugas OB, dan data lokasi gedung Anda dalam satu sistem terpadu.
              </p>
            </div>
          </div>

          <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col justify-center">
            <h1 className="text-xl font-bold text-gray-900">Lupa Password?</h1>
            <p className="text-sm text-gray-500 mt-1 mb-6">
              Jangan khawatir! Masukkan alamat email yang terdaftar dan kami akan mengirimkan
              tautan untuk mengatur ulang kata sandi Anda.
            </p>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder="nama@gmail.com"
                    className={`w-full bg-gray-50 text-gray-800 text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none border transition-all duration-200 ${
                      emailError
                        ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                        : "border-gray-200 hover:border-gray-300 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100"
                    }`}
                  />
                </div>
                {emailError && <p className="text-xs text-red-500 mt-1.5">{emailError}</p>}
              </div>

              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: isLoading ? 1 : 1.01 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
                className={`w-full flex items-center justify-center gap-2 text-white font-semibold text-sm py-3 rounded-xl transition-colors mt-2 cursor-pointer ${
                  isLoading ? "bg-[#4a9fe0] cursor-not-allowed" : "bg-[#2f8fe0] hover:bg-[#0F4C81]"
                }`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    <span>Mengirim...</span>
                  </>
                ) : (
                  <span>Kirim Tautan</span>
                )}
              </motion.button>

              <AnimatePresence>
                {isSent && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-start gap-2.5 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Kami telah mengirim tautan pemulihan akun, silahkan periksa kotak masuk anda.</span>
                    </div>
                  </motion.div>
                )}

                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                      <span>{errorMsg}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-full text-center text-sm font-semibold text-[#0F4C81] hover:underline cursor-pointer mt-2"
              >
                ← Kembali ke Halaman Masuk
              </button>
            </form>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-8 py-4 border-t border-gray-100 bg-gray-50/50">
          <span className="text-xs text-gray-500">
            <span className="font-semibold text-[#0F4C81]">Lapor-OB</span>{" "}
            &copy; {new Date().getFullYear()} Lapor-OB Facility Management. All rights reserved.
          </span>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <button type="button" onClick={() => navigate("/privasisyarat")} className="hover:text-[#0F4C81] transition-colors cursor-pointer">Privasi</button>
            <button type="button" onClick={() => navigate("/privasisyarat")} className="hover:text-[#0F4C81] transition-colors cursor-pointer">Syarat &amp; Ketentuan</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LupaPassword;