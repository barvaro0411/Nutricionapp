import React from "react";
import { View, Text, StyleSheet } from "react-native";

/** Guía visual de calibración de porciones chilenas. */
export function ReviewPortionGuide() {
  return (
    <View style={styles.portionGuideCard}>
      <Text style={styles.portionGuideTitle}>💡 Calibra tus porciones con facilidad</Text>
      <Text style={styles.portionGuideSubtitle}>
        Estas medidas son aproximadas. Si puedes, pesa tu porción para registrarla con mayor precisión:
      </Text>
      <View style={styles.portionPillsRow}>
        <View style={styles.portionPill}>
          <Text style={styles.portionPillText}>✋ Palma: ~120-150g (carnes)</Text>
        </View>
        <View style={styles.portionPill}>
          <Text style={styles.portionPillText}>✊ Puño: ~1 taza (arroz/fideos)</Text>
        </View>
        <View style={styles.portionPill}>
          <Text style={styles.portionPillText}>🥄 Cuchara: ~15g (aceite/aderezo)</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  portionGuideCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    marginBottom: 16,
  },
  portionGuideTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#166534",
    marginBottom: 2,
  },
  portionGuideSubtitle: {
    fontSize: 11,
    color: "#15803D",
    marginBottom: 10,
  },
  portionPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  portionPill: {
    backgroundColor: "#DCFCE7",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  portionPillText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#14532D",
  },
});
