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
    <View style={[styles.macroCard, { backgroundColor: lightBg }]} accessible accessibilityRole="progressbar"
      accessibilityLabel={`${label}: ${Math.round(consumed)} de ${goal} gramos`}
      accessibilityValue={{ min: 0, max: goal, now: Math.min(consumed, goal) }}
      aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.min(consumed, goal)}>
      <View style={styles.macroHeader}>
        <View style={styles.headerLeft}>
          <View style={[styles.haloDot, { backgroundColor: lightBg }]}>
            <View style={[styles.innerDot, { backgroundColor: color }]} />
          </View>
          <Text style={styles.macroName}>{label}</Text>
        </View>
      </View>

      <View style={styles.numberRow}>
        <Text style={styles.consumedNumber} numberOfLines={1} adjustsFontSizeToFit>{Math.round(consumed)}<Text style={styles.numberUnit}> g</Text></Text>
      </View>
      <Text style={styles.goalNumber}>Meta {Math.round(goal)} g</Text>

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
          ? "Meta alcanzada"
          : `${Math.round(remaining)} g faltan`}
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
        <Text accessibilityRole="header" style={styles.sectionOverline}>Tus nutrientes</Text>
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
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: colors.text,
  },
  grid: {
    flexDirection: "row",
    gap: 10,
  },
  macroCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.card,
  },
  macroHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
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
  numberRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    marginBottom: 2,
  },
  consumedNumber: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -0.8,
    flex: 1,
    minWidth: 0,
  },
  numberUnit: { fontSize: 12, fontWeight: "500", color: colors.textSecondary },
  goalNumber: {
    fontSize: 11.5,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: 12,
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
