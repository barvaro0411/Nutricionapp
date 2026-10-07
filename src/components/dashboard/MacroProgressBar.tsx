import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, shadows } from "@/constants/colors";

interface MacroCardProps {
  label: string;
  consumed: number;
  goal: number;
  color: string;
  lightBg: string;
}

function MacroCard({ label, consumed, goal, color, lightBg }: MacroCardProps) {
  const safeGoal = goal || 1;
  const progressPct = Math.min(100, Math.round((consumed / safeGoal) * 100));
  const remaining = Math.max(0, goal - consumed);
  const isComplete = progressPct >= 100;

  return (
    <View style={styles.macroCard}>
      <View style={styles.macroHeader}>
        <View style={styles.headerLeft}>
          <View style={[styles.haloDot, { backgroundColor: lightBg }]}>
            <View style={[styles.innerDot, { backgroundColor: color }]} />
          </View>
          <Text style={styles.macroName}>{label}</Text>
        </View>
        <View style={[styles.pctBadge, { backgroundColor: lightBg }]}>
          <Text style={[styles.pctText, { color }]}>{progressPct}%</Text>
        </View>
      </View>

      <View style={styles.numberRow}>
        <Text style={styles.consumedNumber}>{Math.round(consumed)}</Text>
        <Text style={styles.goalNumber}>/{goal}g</Text>
      </View>

      {/* Barra de progreso moderna tipo cápsula */}
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${progressPct}%`, backgroundColor: color },
          ]}
        />
      </View>

      <Text
        style={[
          styles.remainingText,
          isComplete && { color: colors.primary, fontWeight: "700" },
        ]}
      >
        {isComplete
          ? "Meta lista ✓"
          : `${Math.round(remaining)}g faltan`}
      </Text>
    </View>
  );
}

interface MacroProgressBarProps {
  proteinConsumed: number;
  proteinGoal: number;
  carbsConsumed: number;
  carbsGoal: number;
  fatConsumed: number;
  fatGoal: number;
}

export function MacroProgressBar({
  proteinConsumed,
  proteinGoal,
  carbsConsumed,
  carbsGoal,
  fatConsumed,
  fatGoal,
}: MacroProgressBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionOverline}>MACRONUTRIENTES</Text>
      </View>

      <View style={styles.grid}>
        <MacroCard
          label="Proteína"
          consumed={proteinConsumed}
          goal={proteinGoal}
          color={colors.protein}
          lightBg={colors.proteinLight}
        />
        <MacroCard
          label="Carbos"
          consumed={carbsConsumed}
          goal={carbsGoal}
          color={colors.carbs}
          lightBg={colors.carbsLight}
        />
        <MacroCard
          label="Grasas"
          consumed={fatConsumed}
          goal={fatGoal}
          color={colors.fat}
          lightBg={colors.fatLight}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionOverline: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  grid: {
    flexDirection: "row",
    gap: 10,
  },
  macroCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 13,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.card,
  },
  macroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  haloDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  innerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroName: {
    fontSize: 11.5,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.2,
  },
  pctBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pctText: {
    fontSize: 10,
    fontWeight: "800",
  },
  numberRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 8,
  },
  consumedNumber: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -0.8,
  },
  goalNumber: {
    fontSize: 11.5,
    fontWeight: "600",
    color: colors.textMuted,
    marginLeft: 2,
  },
  track: {
    height: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
  remainingText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: colors.textSecondary,
  },
});
