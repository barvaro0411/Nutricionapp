import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Droplets, Plus, GlassWater, RotateCcw } from "lucide-react-native";
import { colors, shadows } from "@/constants/colors";

interface WaterCardProps {
  totalMl: number;
  targetMl: number;
  onAddWater: (amount: number) => void;
  onRemoveWater?: () => void;
  canRemoveWater?: boolean;
  loading?: boolean;
}

export function WaterCard({
  totalMl,
  targetMl,
  onAddWater,
  onRemoveWater,
  canRemoveWater,
  loading,
}: WaterCardProps) {
  const safeTarget = targetMl || 2000;
  const progressPct = Math.min(100, Math.round((totalMl / safeTarget) * 100));

  const isAfternoonRisk = new Date().getHours() >= 15 && progressPct < 50;

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

        <View style={styles.headerRight}>
          {canRemoveWater && onRemoveWater && (
            <TouchableOpacity
              style={styles.undoBtn}
              onPress={onRemoveWater}
              disabled={loading}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Restar 250 ml de agua"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <RotateCcw size={12} color={colors.textSecondary} />
              <Text style={styles.undoText}>-250 ml</Text>
            </TouchableOpacity>
          )}
          <View style={[styles.pctBadge, isAfternoonRisk && styles.pctBadgeWarning]}>
            <Text style={[styles.pctText, isAfternoonRisk && styles.pctTextWarning]}>{progressPct}%</Text>
          </View>
        </View>
      </View>

      {/* Barra de progreso de agua compacta y sin redundancias */}
      <View style={styles.statusSection}>
        <View style={styles.statusRow}>
          <Text style={[styles.waterMessage, isAfternoonRisk && styles.waterMessageWarning]}>
            {totalMl >= safeTarget
              ? "Meta de agua alcanzada"
              : isAfternoonRisk
              ? "⚠️ Hidratación baja esta tarde"
              : "Un vaso a la vez"}
          </Text>
          <Text style={styles.waterDescription}>
            {totalMl >= safeTarget
              ? "Registro al día"
              : isAfternoonRisk
              ? `Llevas solo ${progressPct}%. Toma un vaso ahora.`
              : `${Math.max(0, safeTarget - totalMl).toLocaleString("es-CL")} ml restantes`}
          </Text>
        </View>
        <View
          style={styles.track}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="Agua registrada"
          accessibilityValue={{
            min: 0,
            max: safeTarget,
            now: Math.min(totalMl, safeTarget),
            text: `${totalMl} de ${safeTarget} mililitros`,
          }}
          aria-valuemin={0}
          aria-valuemax={safeTarget}
          aria-valuenow={Math.min(totalMl, safeTarget)}
        >
          <View style={[styles.fill, { width: `${progressPct}%` }]} />
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
          accessibilityLabel="Añadir 250 ml de agua (un vaso)"
        >
          <GlassWater size={15} color={colors.water} />
          <View>
            <Text style={styles.pillText}>+250 ml</Text>
            <Text style={styles.pillSubtext}>Vaso</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.pillBtn}
          onPress={() => onAddWater(500)}
          disabled={loading}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Añadir 500 ml de agua (botella)"
        >
          <Plus size={15} color={colors.water} />
          <View>
            <Text style={styles.pillText}>+500 ml</Text>
            <Text style={styles.pillSubtext}>Botella</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.pillBtn}
          onPress={() => onAddWater(750)}
          disabled={loading}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Añadir 750 ml de agua (shaker o botilito)"
        >
          <Droplets size={15} color={colors.water} />
          <View>
            <Text style={styles.pillText}>+750 ml</Text>
            <Text style={styles.pillSubtext}>Shaker</Text>
          </View>
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
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.card,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  undoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  undoText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
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
    fontSize: 19,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -0.6,
    marginTop: 1,
  },
  targetText: {
    fontSize: 12.5,
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
  statusSection: {
    marginBottom: 14,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 6,
  },
  waterMessage: {
    color: colors.text,
    fontSize: 12.5,
    fontWeight: "700",
  },
  waterMessageWarning: {
    color: "#B45309",
  },
  waterDescription: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  track: {
    height: 6,
    backgroundColor: colors.waterTrack,
    borderRadius: 3,
    overflow: "hidden",
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
    flexWrap: "wrap",
  },
  pillBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    minHeight: 48,
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
    fontSize: 10,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  loadingWrap: {
    marginLeft: 6,
  },
  pctBadgeWarning: {
    backgroundColor: "#FEF3C7",
  },
  pctTextWarning: {
    color: "#92400E",
  },
});
