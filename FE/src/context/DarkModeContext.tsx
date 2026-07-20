import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type DarkModeCtx = { isDark: boolean; toggle: () => void };
const DarkModeContext = createContext<DarkModeCtx | undefined>(undefined);

const STORAGE_KEY = "theme";

function getInitialDark(): boolean {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return saved === "dark";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

export function DarkModeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(getInitialDark);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
  }, [isDark]);

  return (
    <DarkModeContext.Provider value={{ isDark, toggle: () => setIsDark((v) => !v) }}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkMode(): DarkModeCtx {
  const ctx = useContext(DarkModeContext);
  if (!ctx) throw new Error("useDarkMode must be used within DarkModeProvider");
  return ctx;
}
