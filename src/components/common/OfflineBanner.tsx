import React, { useEffect } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { WifiOff } from "lucide-react-native";
import { useOfflineStore, checkConnectivity } from "@/services/offlineService";

export function OfflineBanner() {
  const { isOffline, setIsOffline } = useOfflineStore();

  useEffect(() => {
    // En Web, escuchar directamente los eventos del navegador para máxima precisión y reactividad instantánea
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      // Verificación inicial con la API nativa de red del navegador
      if (typeof navigator !== "undefined" && navigator.onLine !== undefined) {
        setIsOffline(!navigator.onLine);
      }

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }

    // Intervalo suave de sondeo de conectividad para nativo
    const check = async () => {
      const online = await checkConnectivity();
      setIsOffline(!online);
    };

    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, [setIsOffline]);

  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <WifiOff size={18} color="#92400E" />
      <View style={styles.textContainer}>
        <Text style={styles.title}>Modo Sin Conexión</Text>
        <Text style={styles.subtitle}>
          Necesitas conexión para guardar registros y usar la IA.
        </Text>
      </View>
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
});
