import { create } from "zustand";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastState {
  currentToast: ToastItem | null;
  showToast: (params: { type?: ToastType; title: string; message?: string; duration?: number }) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  currentToast: null,
  showToast: ({ type = "info", title, message, duration = 3000 }) => {
    const id = Math.random().toString(36).substring(7);
    set({ currentToast: { id, type, title, message, duration } });
  },
  hideToast: () => set({ currentToast: null }),
}));
