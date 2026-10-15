import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Platform, TouchableOpacity } from "react-native";
import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  useOfflineStore,
  checkConnectivity,
  listenToServiceWorkerSync,
  syncOfflineQueueNow,
  refreshPendingSyncCount,
} from "@/services/offlineService";
import { updateAccessTokens } from "@/services/offlineQueueStore";
import { useAuthStore } from "@/stores/useAuthStore";

export function OfflineBanner() {
  const { isOffline, setIsOffline, pendingSyncCount } = useOfflineStore();
  const { session } = useAuthStore();
  const queryClient = useQueryClient();
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  useEffect(() => {
    // Inicializar contador de pendientes
    void refreshPendingSyncCount();

    // Actualizar tokens si hay sesión activa
    if (session?.access_token) {
      void updateAccessTokens(session.access_token);
    }
  }, [session?.access_token]);

  useEffect(() => {
    // Escuchar avisos de Background Sync desde el Service Worker
    const unsubscribeSW = listenToServiceWorkerSync((count) => {
      setSyncNotice(`✓ ${count} registro${count > 1 ? "s" : ""} sincronizado${count > 1 ? "s" : ""} en segundo plano`);
      void queryClient.invalidateQueries({ queryKey: ["dailyNutrition"] });
      void queryClient.invalidateQueries({ queryKey: ["waterLogs"] });
      void queryClient.invalidateQueries({ queryKey: ["recentMeals"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setTimeout(() => setSyncNotice(null), 4000);
    });

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const handleOnline = () => {
        setIsOffline(false);
        // Sincronizar cola al recuperar internet
        void syncOfflineQueueNow().then((res) => {
          if (res.syncedCount > 0) {
            setSyncNotice(`✓ ${res.syncedCount} registro${res.syncedCount > 1 ? "s" : ""} sincronizado${res.syncedCount > 1 ? "s" : ""}`);
            void queryClient.invalidateQueries({ queryKey: ["dailyNutrition"] });
            void queryClient.invalidateQueries({ queryKey: ["waterLogs"] });
            void queryClient.invalidateQueries({ queryKey: ["recentMeals"] });
            setTimeout(() => setSyncNotice(null), 4000);
          }
        });
      };

      const handleOffline = () => setIsOffline(true);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      if (typeof navigator !== "undefined" && navigator.onLine !== undefined) {
        setIsOffline(!navigator.onLine);
      }

      return () => {
        unsubscribeSW();
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }

    const check = async () => {
      const online = await checkConnectivity();
      setIsOffline(!online);
      if (online) {
        void syncOfflineQueueNow();
      }
    };

    void check();
    const interval = setInterval(check, 15000);
    return () => {
      unsubscribeSW();
      clearInterval(interval);
    };
  }, [setIsOffline, queryClient]);

  // Aviso de sincronización completada en segundo plano
  if (syncNotice) {
    return (
      <View style={styles.syncBanner}>
        <CheckCircle2 size={16} color="#15803D" />
        <Text style={styles.syncText}>{syncNotice}</Text>
      </View>
    );
  }

  // Si no está offline y no hay pendientes, ocultar
  if (!isOffline && pendingSyncCount === 0) return null;

  return (
    <View style={styles.banner}>
      {isOffline ? (
        <WifiOff size={18} color="#92400E" />
      ) : (
        <RefreshCw size={18} color="#92400E" />
      )}
      <View style={styles.textContainer}>
        <Text style={styles.title}>
          {isOffline ? "Modo Sin Conexión" : "Sincronizando registros"}
        </Text>
        <Text style={styles.subtitle}>
          {isOffline
            ? pendingSyncCount > 0
              ? `${pendingSyncCount} registro${pendingSyncCount > 1 ? "s" : ""} guardado${pendingSyncCount > 1 ? "s" : ""} localmente. Se sincronizarán al volver la conexión.`
              : "Tus registros se guardarán localmente y se sincronizarán al volver internet."
            : `Sincronizando ${pendingSyncCount} registro${pendingSyncCount > 1 ? "s" : ""} en segundo plano...`}
        </Text>
      </View>
      {!isOffline && pendingSyncCount > 0 && (
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => void syncOfflineQueueNow()}
          accessibilityRole="button"
          accessibilityLabel="Sincronizar ahora"
        >
          <Text style={styles.retryBtnText}>Sincronizar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#FEF3C7", // Amber 100
    borderBottomWidth: 1,
    borderColor: "#FCD34D", // Amber 300
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  syncBanner: {
    backgroundColor: "#DCFCE7", // Green 100
    borderBottomWidth: 1,
    borderColor: "#86EFAC", // Green 300
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  syncText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#15803D",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: "#92400E", // Amber 800
  },
  subtitle: {
    fontSize: 11,
    color: "#B45309", // Amber 700
    marginTop: 1,
  },
  retryBtn: {
    backgroundColor: "#D97706",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
});
