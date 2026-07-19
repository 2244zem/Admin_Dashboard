import { createContext } from "react";

export type ToastType = "success" | "error";

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toasts: ToastItem[];
  push: (type: ToastType, message: string) => void;
  dismiss: (id: number) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);
