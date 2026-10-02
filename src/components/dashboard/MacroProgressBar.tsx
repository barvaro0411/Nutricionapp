import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/constants/colors";

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

  return (
    <View style={styles.macroCard}>
      <View style={styles.macroHeader}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.macroName}>{label}</Text>
      </View>

      <View style={styles.numberRow}>
        <Text style={styles.consumedNumber}>{Math.round(consumed)}</Text>
        <Text style={styles.goalNumber}>/{goal}g</Text>
      </View>

      {/* Barra de progreso delgada */}
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${progressPct}%`, backgroundColor: color },
          ]}
        />
      </View>

      <Text style={styles.remainingText}>
        {remaining > 0 ? `-${Math.round(remaining)}g` : "Completado"}
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
    fontWeight: "700",
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  grid: {
    flexDirection: "row",
    gap: 10,
  },
  macroCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  macroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroName: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  numberRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 10,
  },
  consumedNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  goalNumber: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textMuted,
    marginLeft: 2,
  },
  track: {
    height: 4,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 6,
  },
  fill: {
    height: "100%",
    borderRadius: 2,
  },
  remainingText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted,
  },
});
