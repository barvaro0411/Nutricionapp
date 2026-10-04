import { create } from "zustand";
import { Platform } from "react-native";

interface OfflineState {
  isOffline: boolean;
  pendingSyncCount: number;
  setIsOffline: (offline: boolean) => void;
  incrementPendingSync: () => void;
  decrementPendingSync: () => void;
  resetPendingSync: () => void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  isOffline: false,
  pendingSyncCount: 0,
  setIsOffline: (isOffline) => set({ isOffline }),
  incrementPendingSync: () =>
    set((state) => ({ pendingSyncCount: state.pendingSyncCount + 1 })),
  decrementPendingSync: () =>
    set((state) => ({
      pendingSyncCount: Math.max(0, state.pendingSyncCount - 1),
    })),
  resetPendingSync: () => set({ pendingSyncCount: 0 }),
}));

/**
 * Verifica la conectividad de forma segura tanto en Web/PWA como en móvil
 */
export async function checkConnectivity(): Promise<boolean> {
  // En Web / PWA, usamos la API nativa del navegador y verificamos origen propio para evitar bloqueos por CORS
  if (Platform.OS === "web" || typeof window !== "undefined") {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return false;
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch("/favicon.ico", {
        method: "HEAD",
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      // Fallback a navigator.onLine si fetch local falla
      return typeof navigator !== "undefined" ? navigator.onLine : true;
    }
  }

  // En móvil nativo
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch("https://clients3.google.com/generate_204", {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.status === 204 || res.ok;
  } catch {
    return false;
  }
}
