import { create } from "zustand";

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
 * Verifica la conectividad básica realizando un HEAD request liviano
 */
export async function checkConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch("https://clients3.google.com/generate_204", {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.status === 204 || res.ok;
  } catch (e) {
    return false;
  }
}
