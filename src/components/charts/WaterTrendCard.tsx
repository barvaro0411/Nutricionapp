import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Droplets, CheckCircle2 } from "lucide-react-native";
import { colors, shadows } from "@/constants/colors";
import { WaterPeriodStats } from "@/utils/qualityStats";

interface WaterTrendCardProps {
  stats: WaterPeriodStats;
  period: 7 | 30;
}

export function WaterTrendCard({ stats, period }: WaterTrendCardProps) {
  const peak = useMemo(
    () => Math.max(stats.targetMl, ...stats.days.map((d) => d.totalMl), 500),
    [stats.days, stats.targetMl]
  );

  const visibleDays = stats.days;
  const isCompact = visibleDays.length > 10;
  const targetBottomPct = Math.min(92, Math.max(8, (stats.targetMl / peak) * 100));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.overline}>HIDRATACIÓN · {period} DÍAS</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Tendencia de agua
          </Text>
        </View>
        <View style={styles.iconCircle}>
          <Droplets size={18} color={colors.water} />
        </View>
      </View>

      {/* KPIs */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>PROMEDIO</Text>
          <Text style={styles.kpiValue}>
            {stats.loggedDays > 0 ? stats.avgMl.toLocaleString("es-CL") : "—"}
            <Text style={styles.kpiUnit}>{stats.loggedDays > 0 ? " ml" : ""}</Text>
          </Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>EN META</Text>
          <Text style={[styles.kpiValue, { color: colors.water }]}>
            {stats.goalDaysCount}
            <Text style={styles.kpiUnit}>/{period} d</Text>
          </Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>MEJOR DÍA</Text>
          <Text style={styles.kpiValue}>
            {stats.maxMl > 0 ? stats.maxMl.toLocaleString("es-CL") : "—"}
            <Text style={styles.kpiUnit}>{stats.maxMl > 0 ? " ml" : ""}</Text>
          </Text>
        </View>
      </View>

      {/* Gráfico de barras diario con línea de meta */}
      {stats.loggedDays === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            Aún no registras vasos de agua en este período. Suma agua desde tu diario en Inicio.
          </Text>
        </View>
      ) : (
        <View style={styles.chartWrap}>
          <View style={styles.barsArea}>
            <View
              pointerEvents="none"
              style={[styles.targetLine, { bottom: `${targetBottomPct}%` }]}
            >
              <View style={styles.targetTag}>
                <Text style={styles.targetTagText}>
                  Meta {stats.targetMl.toLocaleString("es-CL")} ml
                </Text>
              </View>
            </View>

            {visibleDays.map((day, index) => {
              const heightPct = day.totalMl > 0 ? Math.max(8, (day.totalMl / peak) * 100) : 0;
              const showLabel =
                !isCompact ||
                index === 0 ||
                index === visibleDays.length - 1 ||
                index % 5 === 0;
              return (
                <View key={day.date} style={styles.barCol}>
                  <View style={styles.barTrack}>
                    {day.metGoal && (
                      <View style={styles.metDot}>
                        <CheckCircle2 size={isCompact ? 8 : 11} color={colors.water} />
                      </View>
                    )}
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${heightPct}%`,
                          backgroundColor: day.metGoal ? colors.water : colors.water + "88",
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel} numberOfLines={1}>
                    {showLabel ? (isCompact ? day.date.slice(8) : day.dayLabel) : ""}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    ...shadows.card,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  overline: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.water,
    letterSpacing: 0.9,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.text,
    marginTop: 2,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.waterLight,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.7,
    color: colors.textMuted,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  kpiUnit: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  emptyBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  chartWrap: {
    paddingTop: 18,
  },
  barsArea: {
    height: 124,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    position: "relative",
  },
  targetLine: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.water + "70",
    zIndex: 1,
  },
  targetTag: {
    position: "absolute",
    right: 0,
    top: -17,
    backgroundColor: colors.waterLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  targetTagText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.water,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    height: "100%",
  },
  barTrack: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  barFill: {
    width: "100%",
    borderRadius: 8,
  },
  metDot: {
    position: "absolute",
    top: 4,
    zIndex: 2,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 5,
    height: 14,
  },
});
