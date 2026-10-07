import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { Flame, Target, Utensils, CheckCircle2, AlertTriangle } from "lucide-react-native";
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
  const totalBudget = Math.max(1, goal + burnedCalories);
  const effectiveRemaining = Math.max(0, totalBudget - consumed);
  const isOverBudget = consumed > totalBudget;
  const overCalories = Math.round(consumed - totalBudget);

  // Parámetros del anillo SVG
  const size = 146;
  const strokeWidth = 11;
  const center = size / 2;
  const radius = center - strokeWidth - 2;
  const circumference = 2 * Math.PI * radius;

  const rawProgressRatio = consumed / totalBudget;
  const progressRatio = Math.min(1, Math.max(0, rawProgressRatio));
  const strokeDashoffset = circumference * (1 - progressRatio);
  const progressPct = Math.round(rawProgressRatio * 100);

  // Color dinámico según adherencia
  let progressColor = colors.primary;
  let statusBadgeBg = colors.primaryLight;
  let statusTextColor = colors.primaryDark;
  let statusText = `${progressPct}% consumido`;
  let StatusIcon = CheckCircle2;

  if (isOverBudget) {
    progressColor = colors.danger;
    statusBadgeBg = colors.dangerLight;
    statusTextColor = colors.danger;
    statusText = `+${overCalories} kcal superado`;
    StatusIcon = AlertTriangle;
  } else if (progressPct >= 90) {
    progressColor = colors.warning;
    statusBadgeBg = colors.warningLight;
    statusTextColor = "#B45309";
    statusText = "Cerca del límite";
    StatusIcon = Target;
  }

  return (
    <View style={styles.card}>
      {/* Header superior */}
      <View style={styles.topRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.sectionOverline}>ENERGÍA DEL DÍA</Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusBadgeBg }]}>
          <StatusIcon size={12} color={statusTextColor} />
          <Text style={[styles.statusBadgeText, { color: statusTextColor }]}>
            {statusText}
          </Text>
        </View>
      </View>

      {/* Contenido principal: Anillo circular + Desglose de energía */}
      <View style={styles.mainLayout}>
        {/* Anillo de Progreso Circular */}
        <View style={styles.ringWrapper}>
          <Svg width={size} height={size}>
            <G rotation="-90" origin={`${center}, ${center}`}>
              {/* Pista de fondo */}
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke={colors.surfaceMuted}
                strokeWidth={strokeWidth}
                fill="none"
              />
              {/* Barra de progreso activa */}
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke={progressColor}
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
              />
            </G>
          </Svg>

          {/* Información central dentro del anillo */}
          <View style={styles.innerRingContent}>
            <Text
              style={[
                styles.remainingNumber,
                isOverBudget && { color: colors.danger, fontSize: 26 },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {isOverBudget ? `+${overCalories}` : Math.round(effectiveRemaining)}
            </Text>
            <Text style={styles.remainingLabel}>
              {isOverBudget ? "kcal extra" : "kcal restantes"}
            </Text>
          </View>
        </View>

        {/* Panel lateral de desglose energético */}
        <View style={styles.sideMetrics}>
          {/* Base Calórica */}
          <View style={styles.metricRow}>
            <View style={[styles.metricDot, { backgroundColor: colors.textSecondary }]} />
            <View style={styles.metricTexts}>
              <Text style={styles.metricLabel}>Meta base</Text>
              <Text style={styles.metricVal}>{Math.round(goal)} kcal</Text>
            </View>
          </View>

          {/* Consumidas */}
          <View style={styles.metricRow}>
            <View style={[styles.metricDot, { backgroundColor: progressColor }]} />
            <View style={styles.metricTexts}>
              <Text style={styles.metricLabel}>Consumidas</Text>
              <Text style={[styles.metricVal, { color: colors.text }]}>
                {Math.round(consumed)} kcal
              </Text>
            </View>
          </View>

          {/* Ejercicio Quemado */}
          <TouchableOpacity
            style={[
              styles.exerciseCard,
              burnedCalories > 0 && styles.exerciseCardActive,
            ]}
            onPress={onExercisePress}
            activeOpacity={0.75}
          >
            <Flame
              size={15}
              color={burnedCalories > 0 ? "#D97706" : colors.textMuted}
              fill={burnedCalories > 0 ? "#F59E0B" : "none"}
            />
            <View style={styles.exerciseTexts}>
              <Text style={styles.exerciseLabel}>Ejercicio</Text>
              <Text
                style={[
                  styles.exerciseVal,
                  burnedCalories > 0 && { color: "#D97706" },
                ]}
              >
                +{Math.round(burnedCalories)} kcal
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer informativo con presupuesto neto disponible */}
      <View style={styles.cardFooter}>
        <View style={styles.footerItem}>
          <Utensils size={13} color={colors.textMuted} />
          <Text style={styles.footerText}>
            Presupuesto total activo:{" "}
            <Text style={styles.footerHighlight}>{totalBudget} kcal</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 16,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionOverline: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 12,
    gap: 5,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  mainLayout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  ringWrapper: {
    position: "relative",
    width: 146,
    height: 146,
    justifyContent: "center",
    alignItems: "center",
  },
  innerRingContent: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  remainingNumber: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -1,
    lineHeight: 36,
  },
  remainingLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 2,
  },
  sideMetrics: {
    flex: 1,
    gap: 10,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
  },
  metricDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  metricTexts: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  metricVal: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  exerciseCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 14,
    gap: 8,
    marginTop: 2,
  },
  exerciseCardActive: {
    backgroundColor: "#FEF3C7",
  },
  exerciseTexts: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  exerciseLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  exerciseVal: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
  },
  cardFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerText: {
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  footerHighlight: {
    fontWeight: "700",
    color: colors.text,
  },
});
