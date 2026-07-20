import { useState } from "react";
import type { FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../api/auth";
import { getErrorMessage } from "../lib/utils";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  // No pre-check: skip check-token call to avoid double-use issue.
  // POST /api/auth/reset-password returns 401 if token is invalid — handle it there.
  const [isCheckingToken] = useState(!token); // skip check if no token, else false (form shows, POST handles 401)
  const [isTokenValid] = useState(!!token);
  const [tokenErrorMsg] = useState<string | null>(!token ? "Tautan tidak valid atau tidak ditemukan token." : null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const validate = (): boolean => {
    const errors: { password?: string; confirmPassword?: string } = {};
    if (!password) errors.password = "Password wajib diisi.";
    else if (password.length < 6) errors.password = "Password minimal 6 karakter.";
    if (!confirmPassword) errors.confirmPassword = "Konfirmasi password wajib diisi.";
    else if (password !== confirmPassword) errors.confirmPassword = "Konfirmasi password tidak cocok.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!validate()) return;

    setIsLoading(true);
    try {
      await resetPassword(token, password, confirmPassword);
      navigate("/login", {
        replace: true,
        state: { successMessage: "Password berhasil diubah, silakan masuk dengan password baru Anda." },
      });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr?.response?.status === 401) {
        setErrorMsg("Tautan tidak valid atau sudah kedaluwarsa.");
      } else {
        setErrorMsg(getErrorMessage(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-100 p-4 font-sans dark:bg-elevated">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden dark:bg-surface">
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
            {isCheckingToken ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <svg className="animate-spin h-6 w-6 text-[#0F4C81] mb-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                <p className="text-sm text-gray-500">Memverifikasi tautan...</p>
              </div>
            ) : !isTokenValid ? (
              <div className="text-center py-6">
                <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <h1 className="text-lg font-bold text-gray-900 mb-1">Tautan Tidak Valid</h1>
                <p className="text-sm text-gray-500 mb-6">
                  {tokenErrorMsg || "Tautan reset password ini sudah kedaluwarsa atau tidak valid."}
                </p>
                <button
                  onClick={() => navigate("/lupa-password")}
                  className="inline-flex items-center gap-2 bg-[#0F4C81] hover:bg-[#0a355c] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Minta Tautan Baru
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-bold text-gray-900">Reset Password?</h1>
                <p className="text-sm text-gray-500 mt-1 mb-6">Masukan Password terbaru anda!</p>

                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                        }}
                        placeholder="••••••••"
                        className={`w-full bg-gray-50 text-gray-800 text-sm rounded-xl pl-10 pr-10 py-2.5 outline-none border transition-all duration-200 ${
                          fieldErrors.password
                            ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                            : "border-gray-200 hover:border-gray-300 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                        aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                      >
                        {showPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.584 10.587a2 2 0 002.828 2.83M9.363 5.365A9.466 9.466 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411M6.423 6.423A9.994 9.994 0 002.458 12c1.274 4.057 5.064 7 9.542 7a9.99 9.99 0 004.132-.89" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {fieldErrors.password && <p className="text-xs text-red-500 mt-1.5">{fieldErrors.password}</p>}
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Konfirmasi Password
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <input
                        id="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (fieldErrors.confirmPassword) setFieldErrors((p) => ({ ...p, confirmPassword: undefined }));
                        }}
                        placeholder="••••••••"
                        className={`w-full bg-gray-50 text-gray-800 text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none border transition-all duration-200 ${
                          fieldErrors.confirmPassword
                            ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                            : "border-gray-200 hover:border-gray-300 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100"
                        }`}
                      />
                    </div>
                    {fieldErrors.confirmPassword && (
                      <p className="text-xs text-red-500 mt-1.5">{fieldErrors.confirmPassword}</p>
                    )}
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
                        <span>Memproses...</span>
                      </>
                    ) : (
                      <span>Reset Password</span>
                    )}
                  </motion.button>

                  <AnimatePresence>
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
                </form>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-8 py-4 border-t border-gray-100 bg-gray-50/50 dark:bg-surface">
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

export default ResetPassword;