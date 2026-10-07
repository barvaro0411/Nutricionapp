import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Droplets, Plus } from "lucide-react-native";
import { colors, shadows } from "@/constants/colors";

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
        <View style={styles.headerLeft}>
          <View style={styles.iconWrap}>
            <Droplets size={16} color={colors.water} />
          </View>
          <View>
            <Text style={styles.overline}>HIDRATACIÓN</Text>
            <Text style={styles.valueText}>
              {totalMl.toLocaleString("es-CL")}{" "}
              <Text style={styles.targetText}>/ {safeTarget.toLocaleString("es-CL")} ml</Text>
            </Text>
          </View>
        </View>

        <View style={styles.pctBadge}>
          <Text style={styles.pctText}>{progressPct}%</Text>
        </View>
      </View>

      {/* Barra de progreso de agua */}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progressPct}%` }]} />
      </View>

      {/* Botones de acción rápida con estética moderna */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.pillBtn}
          onPress={() => onAddWater(250)}
          disabled={loading}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Añadir 250 ml de agua"
        >
          <Plus size={12} color={colors.water} />
          <Text style={styles.pillText}>250 ml</Text>
          <Text style={styles.pillSubtext}>Vaso</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.pillBtn}
          onPress={() => onAddWater(500)}
          disabled={loading}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Añadir 500 ml de agua"
        >
          <Plus size={12} color={colors.water} />
          <Text style={styles.pillText}>500 ml</Text>
          <Text style={styles.pillSubtext}>Botella</Text>
        </TouchableOpacity>

        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={colors.water} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.card,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.waterLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E0F2FE",
  },
  overline: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  valueText: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -0.6,
    marginTop: 1,
  },
  targetText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
  },
  pctBadge: {
    backgroundColor: colors.waterLight,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  pctText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: colors.water,
  },
  track: {
    height: 8,
    backgroundColor: "#E0F2FE",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 14,
  },
  fill: {
    height: "100%",
    backgroundColor: colors.water,
    borderRadius: 4,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  pillBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 5,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
  },
  pillSubtext: {
    fontSize: 10.5,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  loadingWrap: {
    marginLeft: 6,
  },
});
