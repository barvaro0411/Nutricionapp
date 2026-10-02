import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Droplets } from "lucide-react-native";
import { colors } from "@/constants/colors";

interface WaterCardProps {
  totalMl: number;
  targetMl: number;
  onAddWater: (amount: number) => void;
  loading?: boolean;
}

export function WaterCard({ totalMl, targetMl, onAddWater, loading }: WaterCardProps) {
  const safeTarget = targetMl || 2000;
  const progressPct = Math.min(100, Math.round((totalMl / safeTarget) * 100));

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <View style={styles.titleRow}>
            <Droplets size={14} color={colors.water} />
            <Text style={styles.overline}>HIDRATACIÓN</Text>
          </View>
          <Text style={styles.valueText}>
            {totalMl.toLocaleString("es-CL")} <Text style={styles.targetText}>/ {targetMl.toLocaleString("es-CL")} ml</Text>
          </Text>
        </View>
        <View style={styles.pctBadge}>
          <Text style={styles.pctText}>{progressPct}%</Text>
        </View>
      </View>

      {/* Barra de progreso de agua */}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progressPct}%` }]} />
      </View>

      {/* Botones de acción rápida minimalistas */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.pillBtn}
          onPress={() => onAddWater(250)}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.pillText}>+250 ml</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.pillBtn}
          onPress={() => onAddWater(500)}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.pillText}>+500 ml</Text>
        </TouchableOpacity>

        {loading && <ActivityIndicator size="small" color={colors.water} style={{ marginLeft: 6 }} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  overline: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  valueText: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  targetText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textMuted,
  },
  pctBadge: {
    backgroundColor: colors.waterLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pctText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.water,
  },
  track: {
    height: 6,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 16,
  },
  fill: {
    height: "100%",
    backgroundColor: colors.water,
    borderRadius: 3,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  pillBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
});
