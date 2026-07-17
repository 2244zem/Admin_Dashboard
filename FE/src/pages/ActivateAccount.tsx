import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { activateAccount, checkActivationToken } from "../api/auth";
import { getErrorMessage } from "../lib/utils";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorState from "../components/ui/ErrorState";

export default function ActivateAccount() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [isChecking, setIsChecking] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ password: "", confirmPassword: "" });

  useEffect(() => {
    let isMounted = true;

    async function validateToken() {
      if (!token) {
        setErrorMsg("Token aktivasi tidak ditemukan.");
        setIsChecking(false);
        return;
      }

      try {
        await checkActivationToken(token);
        if (isMounted) setIsValidToken(true);
      } catch (err) {
        if (isMounted) setErrorMsg(getErrorMessage(err));
      } finally {
        if (isMounted) setIsChecking(false);
      }
    }

    validateToken();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMsg(null);

    if (form.password.length < 8) {
      setErrorMsg("Password minimal 8 karakter.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErrorMsg("Password dan konfirmasi password tidak cocok.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await activateAccount(token, form);
      navigate("/login", {
        replace: true,
        state: {
          successMessage:
            response.message || "Akun berhasil diaktivasi, silahkan login",
        },
      });
    } catch (err) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-100 p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="px-8 pt-8 pb-5 border-b border-gray-100">
          <img src="/src/assets/WGSLogoNoBG.png" alt="Logo WGS" className="h-16 w-auto -ml-3 mb-3" />
          <h1 className="text-xl font-bold text-gray-900">Aktivasi Akun</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isValidToken
              ? "Buat password baru Anda untuk mengaktifkan akun."
              : "Aktivasi atau reset password akun Anda."}
          </p>
        </div>

        <div className="p-8">
          {isChecking ? (
            <LoadingSpinner text="Memeriksa token aktivasi..." />
          ) : !isValidToken ? (
            <ErrorState
              message={errorMsg || "Token aktivasi tidak valid atau sudah kedaluwarsa."}
              onRetry={() => window.location.reload()}
            />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Password Baru
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  className="w-full bg-gray-50 text-gray-800 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-200 hover:border-gray-300 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Konfirmasi Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                  className="w-full bg-gray-50 text-gray-800 text-sm rounded-xl px-4 py-2.5 outline-none border border-gray-200 hover:border-gray-300 focus:border-[#0F4C81] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <AnimatePresence>
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                      {errorMsg}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full text-white font-semibold text-sm py-3 rounded-xl bg-[#2f8fe0] hover:bg-[#0F4C81] disabled:bg-[#4a9fe0] disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? "Mengaktifkan..." : "Aktifkan Akun"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
