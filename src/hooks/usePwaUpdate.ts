import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";

export interface PwaUpdateState {
  updateAvailable: boolean;
  isUpdating: boolean;
  applyUpdate: () => void;
  dismissUpdate: () => void;
}

export function usePwaUpdate(): PwaUpdateState {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    const handleUpdate = () => {
      setUpdateAvailable(true);
    };

    window.addEventListener("pwa-update-available", handleUpdate);

    // Revisar si ya hay un Service Worker esperando
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          setUpdateAvailable(true);
        }
      }).catch(() => {});

      const messageListener = (event: MessageEvent) => {
        if (event.data?.type === "SW_UPDATE_AVAILABLE") {
          setUpdateAvailable(true);
        }
      };

      navigator.serviceWorker.addEventListener("message", messageListener);

      // Revisar actualizaciones cuando el usuario regresa a la app
      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          navigator.serviceWorker.getRegistration().then((reg) => {
            reg?.update().catch(() => {});
          }).catch(() => {});
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);

      return () => {
        window.removeEventListener("pwa-update-available", handleUpdate);
        navigator.serviceWorker.removeEventListener("message", messageListener);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
    }

    return () => {
      window.removeEventListener("pwa-update-available", handleUpdate);
    };
  }, []);

  const applyUpdate = useCallback(async () => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    setIsUpdating(true);
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      }
    } catch {
      // Ignorar error y recargar de todas formas
    }
    // Breve pausa para que el SW tome el control antes de recargar
    setTimeout(() => {
      window.location.reload();
    }, 150);
  }, []);

  const dismissUpdate = useCallback(() => {
    setUpdateAvailable(false);
  }, []);

  return { updateAvailable, isUpdating, applyUpdate, dismissUpdate };
}
