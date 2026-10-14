import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, shadows } from "@/constants/colors";
import { adjustGoalsForActivity } from "@/utils/nutritionCalculator";

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
  burnedCalories?: number;
}

export function MacroProgressBar({
  proteinConsumed,
  proteinGoal,
  carbsConsumed,
  carbsGoal,
  fatConsumed,
  fatGoal,
  burnedCalories = 0,
}: MacroProgressBarProps) {
  const adjusted = useMemo(() => {
    return adjustGoalsForActivity(
      {
        calories: 0,
        proteinG: proteinGoal,
        carbsG: carbsGoal,
        fatG: fatGoal,
      },
      burnedCalories
    );
  }, [proteinGoal, carbsGoal, fatGoal, burnedCalories]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text accessibilityRole="header" style={styles.sectionOverline}>Tus nutrientes</Text>
        {burnedCalories > 0 && (
          <Text style={styles.activityBadge}>
            +{Math.round((burnedCalories * 0.75) / 4)}g carbos por actividad
          </Text>
        )}
      </View>

      <View style={styles.grid}>
        <MacroCard
          label="Proteína"
          consumed={proteinConsumed}
          goal={adjusted.proteinG}
          color={colors.protein}
          lightBg={colors.proteinLight}
        />
        <MacroCard
          label="Carbos"
          consumed={carbsConsumed}
          goal={adjusted.carbsG}
          color={colors.carbs}
          lightBg={colors.carbsLight}
        />
        <MacroCard
          label="Grasas"
          consumed={fatConsumed}
          goal={adjusted.fatG}
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
    flexWrap: "wrap",
    gap: 6,
  },
  sectionOverline: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: colors.text,
  },
  activityBadge: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "700",
    color: colors.primaryDark,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
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
