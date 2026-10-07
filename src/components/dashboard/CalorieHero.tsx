import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { Flame, Target, Utensils, CheckCircle2, AlertTriangle, Zap } from "lucide-react-native";
import { colors, shadows } from "@/constants/colors";

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
  const size = 152;
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
  let statusBorderColor = "#A7F3D0";
  let statusText = `${progressPct}% consumido`;
  let StatusIcon = CheckCircle2;

  if (isOverBudget) {
    progressColor = colors.danger;
    statusBadgeBg = colors.dangerLight;
    statusTextColor = colors.danger;
    statusBorderColor = "#FECACA";
    statusText = `+${overCalories} kcal superado`;
    StatusIcon = AlertTriangle;
  } else if (progressPct >= 90) {
    progressColor = colors.warning;
    statusBadgeBg = colors.warningLight;
    statusTextColor = "#B45309";
    statusBorderColor = "#FDE68A";
    statusText = "Cerca de la meta";
    StatusIcon = Target;
  }

  return (
    <View style={styles.card}>
      {/* Header superior */}
      <View style={styles.topRow}>
        <View style={styles.headerLeft}>
          <View style={styles.overlineIconWrap}>
            <Zap size={12} color={colors.primary} />
          </View>
          <Text style={styles.sectionOverline}>ENERGÍA DEL DÍA</Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusBadgeBg, borderColor: statusBorderColor },
          ]}
        >
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
                stroke="#F1F5F9"
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
              {isOverBudget
                ? `+${overCalories.toLocaleString("es-CL")}`
                : Math.round(effectiveRemaining).toLocaleString("es-CL")}
            </Text>
            <Text style={styles.remainingLabel}>
              {isOverBudget ? "kcal extra" : "kcal restantes"}
            </Text>
          </View>
        </View>

        {/* Panel lateral de desglose energético */}
        <View style={styles.sideMetrics}>
          {/* Base Calórica */}
          <View style={styles.metricCard}>
            <View style={styles.metricIconWrap}>
              <Target size={13} color={colors.textSecondary} />
            </View>
            <View style={styles.metricTexts}>
              <Text style={styles.metricLabel}>Meta base</Text>
              <Text style={styles.metricVal}>
                {Math.round(goal).toLocaleString("es-CL")} kcal
              </Text>
            </View>
          </View>

          {/* Consumidas */}
          <View style={styles.metricCard}>
            <View
              style={[
                styles.metricIconWrap,
                { backgroundColor: isOverBudget ? colors.dangerLight : colors.primaryLight },
              ]}
            >
              <Utensils
                size={13}
                color={isOverBudget ? colors.danger : colors.primary}
              />
            </View>
            <View style={styles.metricTexts}>
              <Text style={styles.metricLabel}>Consumidas</Text>
              <Text
                style={[
                  styles.metricVal,
                  isOverBudget && { color: colors.danger },
                ]}
              >
                {Math.round(consumed).toLocaleString("es-CL")} kcal
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
            accessibilityRole="button"
            accessibilityLabel="Registrar o ver ejercicio"
          >
            <View
              style={[
                styles.metricIconWrap,
                burnedCalories > 0
                  ? { backgroundColor: "#FEF3C7" }
                  : { backgroundColor: colors.surfaceMuted },
              ]}
            >
              <Flame
                size={13}
                color={burnedCalories > 0 ? "#D97706" : colors.textMuted}
                fill={burnedCalories > 0 ? "#F59E0B" : "none"}
              />
            </View>
            <View style={styles.metricTexts}>
              <Text style={styles.metricLabel}>Ejercicio</Text>
              <Text
                style={[
                  styles.metricVal,
                  burnedCalories > 0
                    ? { color: "#D97706", fontWeight: "800" }
                    : { color: colors.textMuted },
                ]}
              >
                +{Math.round(burnedCalories).toLocaleString("es-CL")} kcal
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer informativo con presupuesto neto disponible */}
      <View style={styles.cardFooter}>
        <View style={styles.footerItem}>
          <Text style={styles.footerText}>
            Presupuesto diario activo:{" "}
            <Text style={styles.footerHighlight}>
              {totalBudget.toLocaleString("es-CL")} kcal
            </Text>
          </Text>
        </View>
        <View style={styles.footerPill}>
          <Text style={styles.footerPillText}>
            {progressPct > 100 ? `${progressPct}% (Exceso)` : `${100 - progressPct}% libre`}
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
    ...shadows.card,
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
    gap: 7,
  },
  overlineIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionOverline: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 12,
    borderWidth: 1,
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
    width: 152,
    height: 152,
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
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -1.2,
    lineHeight: 36,
  },
  remainingLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  sideMetrics: {
    flex: 1,
    gap: 8,
  },
  metricCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    gap: 8,
  },
  metricIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
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
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.text,
  },
  exerciseCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    gap: 8,
  },
  exerciseCardActive: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  cardFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
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
    fontWeight: "800",
    color: colors.text,
  },
  footerPill: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  footerPillText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: colors.textSecondary,
  },
});
