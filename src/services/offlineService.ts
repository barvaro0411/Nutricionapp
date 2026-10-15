import { create } from "zustand";
import { Platform } from "react-native";
import {
  getQueuedMutations,
  removeQueuedMutation,
  updateQueuedMutation,
  requestBackgroundSync,
} from "./offlineQueueStore";

interface OfflineState {
  isOffline: boolean;
  pendingSyncCount: number;
  setIsOffline: (offline: boolean) => void;
  setPendingSyncCount: (count: number) => void;
  incrementPendingSync: () => void;
  decrementPendingSync: () => void;
  resetPendingSync: () => void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  isOffline: false,
  pendingSyncCount: 0,
  setIsOffline: (isOffline) => set({ isOffline }),
  setPendingSyncCount: (pendingSyncCount) => set({ pendingSyncCount }),
  incrementPendingSync: () =>
    set((state) => ({ pendingSyncCount: state.pendingSyncCount + 1 })),
  decrementPendingSync: () =>
    set((state) => ({
      pendingSyncCount: Math.max(0, state.pendingSyncCount - 1),
    })),
  resetPendingSync: () => set({ pendingSyncCount: 0 }),
}));

/**
 * Actualiza el contador de mutaciones pendientes desde el almacén persistente
 */
export async function refreshPendingSyncCount(): Promise<number> {
  try {
    const mutations = await getQueuedMutations();
    useOfflineStore.getState().setPendingSyncCount(mutations.length);
    return mutations.length;
  } catch {
    return 0;
  }
}

/**
 * Procesa manualmente la cola en primer plano si Background Sync no está disponible
 */
export async function syncOfflineQueueNow(): Promise<{ success: boolean; syncedCount: number }> {
  try {
    // Si Service Worker está disponible, pedirle que ejecute la sincronización
    if (
      typeof navigator !== "undefined" &&
      "serviceWorker" in navigator &&
      navigator.serviceWorker.controller
    ) {
      navigator.serviceWorker.controller.postMessage({ type: "TRIGGER_OFFLINE_SYNC" });
      await requestBackgroundSync();
    }

    const mutations = await getQueuedMutations();
    if (!mutations.length) {
      useOfflineStore.getState().setPendingSyncCount(0);
      return { success: true, syncedCount: 0 };
    }

    let syncedCount = 0;
    for (const mutation of mutations) {
      try {
        const response = await fetch(mutation.url, {
          method: mutation.method,
          headers: mutation.headers,
          body: JSON.stringify(mutation.body),
        });

        if (response.ok) {
          await removeQueuedMutation(mutation.id);
          syncedCount++;
        } else if (response.status === 401 || response.status === 408 || response.status === 429) {
          // Token expirado o limitación: conservar en la cola
          mutation.attempts = (mutation.attempts || 0) + 1;
          mutation.lastAttemptAt = Date.now();
          await updateQueuedMutation(mutation);
        } else if (response.status >= 400 && response.status < 500) {
          // Error 4xx irrecuperable: descartar para no atascar la cola
          await removeQueuedMutation(mutation.id);
        } else {
          // Error 5xx temporal: reintentar luego
          mutation.attempts = (mutation.attempts || 0) + 1;
          mutation.lastAttemptAt = Date.now();
          await updateQueuedMutation(mutation);
        }
      } catch {
        // Red caída: detener iteración
        break;
      }
    }

    await refreshPendingSyncCount();
    return { success: true, syncedCount };
  } catch {
    return { success: false, syncedCount: 0 };
  }
}

/**
 * Escucha avisos del Service Worker cuando finaliza un Background Sync
 */
export function listenToServiceWorkerSync(onSyncComplete: (count: number) => void): () => void {
  if (
    typeof navigator === "undefined" ||
    !("serviceWorker" in navigator)
  ) {
    return () => {};
  }

  const handler = (event: MessageEvent) => {
    if (event.data && event.data.type === "NUTRICION_SYNC_COMPLETE") {
      const count = Number(event.data.count) || 0;
      void refreshPendingSyncCount();
      onSyncComplete(count);
    }
  };

  navigator.serviceWorker.addEventListener("message", handler);
  return () => {
    navigator.serviceWorker.removeEventListener("message", handler);
  };
}

/**
 * Verifica la conectividad de forma segura tanto en Web/PWA como en móvil
 */
export async function checkConnectivity(): Promise<boolean> {
  // En Web / PWA, usamos la API nativa del navegador y verificamos origen propio
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
