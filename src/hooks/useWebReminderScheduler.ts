import { useEffect } from "react";
import { Platform } from "react-native";
import { checkAndDispatchWebReminders } from "@/services/notificationService";

/**
 * Revisa cada minuto (y al volver a la pestaña/PWA) si hay recordatorios activos
 * cuya hora programada acaba de cumplirse y emite la notificación en Web/PWA.
 */
export function useWebReminderScheduler(userId: string | null) {
  useEffect(() => {
    if (Platform.OS !== "web" || !userId || typeof window === "undefined") return;

    const runCheck = () => {
      void checkAndDispatchWebReminders(userId);
    };

    runCheck();
    const interval = window.setInterval(runCheck, 60000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") runCheck();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [userId]);
}
