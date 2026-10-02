import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useOfflineStore, checkConnectivity } from "@/services/offlineService";
import { colors } from "@/constants/colors";

export function OfflineBanner() {
  const { isOffline, setIsOffline, pendingSyncCount } = useOfflineStore();

  useEffect(() => {
    // Intervalo suave de sondeo de conectividad
    const check = async () => {
      const online = await checkConnectivity();
      setIsOffline(!online);
    };

    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);

  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.icon}>📡</Text>
      <View style={styles.textContainer}>
        <Text style={styles.title}>Modo Sin Conexión</Text>
        <Text style={styles.subtitle}>
          {pendingSyncCount > 0
            ? `${pendingSyncCount} registros pendientes se guardarán al recuperar señal.`
            : "Mostrando datos en caché. Tu progreso no se perderá."}
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
  icon: {
    fontSize: 18,
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
