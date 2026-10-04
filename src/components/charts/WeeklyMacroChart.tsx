import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { DayStat } from "@/hooks/useWeeklyStats";
import { colors } from "@/constants/colors";

interface WeeklyMacroChartProps {
  days: DayStat[];
  targetCalories: number;
}

export function WeeklyMacroChart({ days, targetCalories }: WeeklyMacroChartProps) {
  const maxCalories = Math.max(
    targetCalories * 1.2,
    ...days.map((d) => d.calories),
    1000
  );

  return (
    <View style={styles.container}>
      <View style={styles.chartArea}>
        {days.map((day) => {
          const heightPct = Math.min(100, Math.round((day.calories / maxCalories) * 100));
          const isOver = day.calories > targetCalories;
          const isZero = day.calories === 0;

          return (
            <View key={day.date} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${isZero ? 4 : heightPct}%`,
                      backgroundColor: isZero
                        ? colors.cardBorder
                        : isOver
                        ? colors.warning
                        : colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.dayLabel}>{day.dayLabel}</Text>
              <Text style={styles.calorieLabel}>
                {day.calories > 0 ? Math.round(day.calories) : "-"}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Leyenda */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>En meta</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
          <Text style={styles.legendText}>Sobre meta</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 20,
  },
  chartArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 180,
    paddingBottom: 8,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
  },
  barTrack: {
    width: 22,
    height: 130,
    backgroundColor: colors.background,
    borderRadius: 11,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    borderRadius: 11,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
    marginTop: 8,
  },
  calorieLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: "500",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
});
