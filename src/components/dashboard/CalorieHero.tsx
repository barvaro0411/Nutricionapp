import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Flame } from "lucide-react-native";
import { colors } from "@/constants/colors";

interface CalorieHeroProps {
  goal: number;
  consumed: number;
  remaining: number;
  burnedCalories?: number;
  onExercisePress?: () => void;
}

export function CalorieHero({
  goal,
  consumed,
  burnedCalories = 0,
  onExercisePress,
}: CalorieHeroProps) {
  // Ajuste dinámico de energía: Meta + Quemadas - Consumidas
  const effectiveRemaining = Math.max(0, goal + burnedCalories - consumed);
  const totalBudget = goal + burnedCalories;
  const progressPct = Math.min(100, Math.round((consumed / (totalBudget || 1)) * 100));

  return (
    <View style={styles.card}>
      {/* Header superior minimalista */}
      <View style={styles.topRow}>
        <Text style={styles.sectionOverline}>PRESUPUESTO CALÓRICO</Text>
        {burnedCalories > 0 && (
          <TouchableOpacity
            style={styles.exerciseBadge}
            onPress={onExercisePress}
            activeOpacity={0.8}
          >
            <Flame size={13} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.exerciseBadgeText}>+{burnedCalories} kcal activas</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Número principal de alto impacto */}
      <View style={styles.mainNumberContainer}>
        <Text style={styles.mainNumber}>{Math.round(effectiveRemaining)}</Text>
        <Text style={styles.mainLabel}>kcal restantes</Text>
      </View>

      {/* Barra de progreso minimalista y delgada */}
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${progressPct}%`,
              backgroundColor:
                consumed > totalBudget ? colors.danger : colors.primaryAccent,
            },
          ]}
        />
      </View>

      {/* Estadísticas inferiores en formato métrica limpia */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Consumidas</Text>
          <Text style={styles.metricValue}>{Math.round(consumed)}</Text>
        </View>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.metricItem}
          onPress={onExercisePress}
          activeOpacity={onExercisePress ? 0.7 : 1}
        >
          <Text style={styles.metricLabel}>Ejercicio</Text>
          <Text style={[styles.metricValue, { color: colors.primaryAccent }]}>
            +{Math.round(burnedCalories)}
          </Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Meta Total</Text>
          <Text style={styles.metricValue}>{totalBudget}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
    marginBottom: 16,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionOverline: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  exerciseBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 6,
  },
  flameDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primaryAccent,
  },
  exerciseBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  mainNumberContainer: {
    alignItems: "flex-start",
    marginBottom: 18,
  },
  mainNumber: {
    fontSize: 54,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -2,
    lineHeight: 58,
  },
  mainLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
    marginTop: 2,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden",
    marginBottom: 20,
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
  metricsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  metricItem: {
    flex: 1,
    alignItems: "flex-start",
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: "500",
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.3,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: colors.cardBorder,
    marginHorizontal: 8,
  },
});
