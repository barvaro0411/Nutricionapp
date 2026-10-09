import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Droplets, Plus, GlassWater } from "lucide-react-native";
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
          <View style={styles.headerCopy}>
            <Text accessibilityRole="header" style={styles.overline}>Tu hidratación</Text>
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
      <View style={styles.waterVisual}>
        <View style={styles.glass} accessible accessibilityRole="progressbar" accessibilityLabel="Agua registrada"
          accessibilityValue={{ min: 0, max: safeTarget, now: Math.min(totalMl, safeTarget), text: totalMl + " de " + safeTarget + " mililitros" }}
          aria-valuemin={0} aria-valuemax={safeTarget} aria-valuenow={Math.min(totalMl, safeTarget)}>
          <View style={[styles.glassFill, { height: `${progressPct}%` }]} />
          <View style={styles.glassIcon}><Droplets size={23} color={colors.water} /></View>
        </View>
        <View style={styles.waterCopy}><Text style={styles.waterMessage}>{totalMl >= safeTarget ? "Meta de agua alcanzada" : "Un vaso a la vez"}</Text>
          <Text style={styles.waterDescription}>{totalMl >= safeTarget ? "Tu registro de agua está al día." : `${Math.max(0, safeTarget - totalMl).toLocaleString("es-CL")} ml para tu meta`}</Text>
          <View style={styles.track}><View style={[styles.fill, { width: `${progressPct}%` }]} /></View>
        </View>
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
          <GlassWater size={16} color={colors.water} />
          <View><Text style={styles.pillText}>250 ml</Text><Text style={styles.pillSubtext}>Añadir un vaso</Text></View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.pillBtn}
          onPress={() => onAddWater(500)}
          disabled={loading}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Añadir 500 ml de agua"
        >
          <Plus size={16} color={colors.water} />
          <View><Text style={styles.pillText}>500 ml</Text><Text style={styles.pillSubtext}>Añadir botella</Text></View>
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
    flex: 1,
    minWidth: 0,
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
  headerCopy: { flex: 1, minWidth: 0 },
  overline: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.2,
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
    height: 5,
    backgroundColor: "#E0F2FE",
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 12,
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
    flexWrap: "wrap",
  },
  pillBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 10,
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: colors.waterLight,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 8,
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
  waterVisual: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 18 },
  glass: { width: 52, height: 68, borderRadius: 14, borderWidth: 2, borderColor: "#BAE6FD", backgroundColor: colors.waterLight, overflow: "hidden", justifyContent: "flex-end" },
  glassFill: { width: "100%", backgroundColor: "#BAE6FD", borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  glassIcon: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, alignItems: "center", justifyContent: "center" },
  waterCopy: { flex: 1, minWidth: 0 },
  waterMessage: { color: colors.text, fontSize: 13, fontWeight: "700" },
  waterDescription: { fontSize: 11, color: colors.textSecondary, marginTop: 5, lineHeight: 17 },
});
