import { Building2, EyeOff, LogIn, Mail, LockKeyhole } from "lucide-react";
import logo from "../assets/WGSLogoNoBG.png";

const officeImage =
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80";

const Login = () => {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <div className="min-h-screen flex flex-col border-t-[3px] border-slate-700">
        <header className="h-[47px] flex items-center justify-between px-4 md:px-8 bg-white border-b border-slate-200">
          <div className="flex items-center gap-1.5">
            <img src={logo} alt="WGS" className="h-8 w-auto object-contain" />
            <span className="text-[22px] leading-none font-bold text-[#073b66]">
              Lapor OB
            </span>
          </div>
          <a
            href="#bantuan"
            className="text-xs font-semibold text-slate-600 hover:text-[#1da1f2] transition-colors"
          >
            Bantuan
          </a>
        </header>

        <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1.02fr_1fr] min-h-[368px]">
          <section
            className="relative min-h-[320px] lg:min-h-0 overflow-hidden bg-slate-800"
            style={{
              backgroundImage: `linear-gradient(90deg, rgba(8, 54, 82, 0.74), rgba(60, 151, 194, 0.5)), url(${officeImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-[#0b496d]/20" />
            <div className="relative h-full flex flex-col justify-end px-10 pb-10 md:px-16 md:pb-11">
              <h1 className="max-w-[460px] text-[26px] md:text-[31px] leading-tight font-bold text-white/72">
                Efisiensi Fasilitas di Genggaman Anda
              </h1>
              <p className="mt-4 max-w-[470px] text-sm md:text-[15px] leading-relaxed text-white/58">
                Kelola laporan kebersihan dan kinerja tim Office Boy dengan
                sistem yang transparan dan terukur.
              </p>
            </div>
          </section>

          <section className="flex items-center justify-center px-6 py-10 lg:py-0">
            <div className="w-full max-w-[410px]">
              <div className="mb-5 flex h-8 w-11 items-center justify-center rounded-md bg-[#22a6f2] text-white shadow-sm">
                <Building2 className="h-5 w-5" strokeWidth={2.3} />
              </div>

              <div className="mb-8">
                <h2 className="text-[26px] font-bold tracking-tight text-slate-900">
                  Selamat Datang Kembali
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Masuk ke akun administrator Lapor-OB Anda
                </p>
              </div>

              <form className="space-y-5">
                <div>
                  <label
                    htmlFor="username"
                    className="mb-2 block text-sm font-bold text-slate-800"
                  >
                    Username
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    <input
                      id="username"
                      type="text"
                      placeholder="username"
                      className="h-[43px] w-full rounded-md border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:border-[#22a6f2] focus:ring-2 focus:ring-[#22a6f2]/15"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-bold text-slate-800"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <LockKeyhole className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                    <input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="h-[43px] w-full rounded-md border border-slate-300 bg-white pl-11 pr-11 text-sm text-slate-800 outline-none transition focus:border-[#22a6f2] focus:ring-2 focus:ring-[#22a6f2]/15"
                    />
                    <button
                      type="button"
                      aria-label="Tampilkan password"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      <EyeOff className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-2 text-xs text-slate-500">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-[#22a6f2] focus:ring-[#22a6f2]"
                    />
                    Ingat Saya
                  </label>
                  <a
                    href="#lupa-password"
                    className="text-xs font-semibold text-[#0877bd] hover:text-[#22a6f2]"
                  >
                    Lupa Password?
                  </a>
                </div>

                <button
                  type="submit"
                  className="flex h-[43px] w-full items-center justify-center gap-2 rounded-md bg-[#22a6f2] text-sm font-bold text-white shadow-sm transition hover:bg-[#168bd0] focus:outline-none focus:ring-2 focus:ring-[#22a6f2]/30"
                >
                  Masuk
                  <LogIn className="h-4 w-4" strokeWidth={2.6} />
                </button>
              </form>
            </div>
          </section>
        </main>

        <footer className="h-[44px] flex items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-5 md:px-8 text-xs text-slate-600">
          <div className="flex min-w-0 items-center gap-5">
            <span className="text-[18px] font-bold text-[#075f9b]">Lapor-OB</span>
            <span className="hidden sm:inline truncate">
              © 2026 Lapor-OB Facility Management. All rights reserved.
            </span>
          </div>
          <div className="hidden items-center gap-7 md:flex">
            <a href="#privasi" className="hover:text-[#0877bd]">
              Privasi
            </a>
            <a href="#syarat" className="hover:text-[#0877bd]">
              Syarat & Ketentuan
            </a>
            <a href="#kontak" className="hover:text-[#0877bd]">
              Kontak
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Login;
