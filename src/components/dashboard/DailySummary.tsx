import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { Flame } from "lucide-react-native";
import { colors, shadows } from "@/constants/colors";
import { adjustGoalsForActivity } from "@/utils/nutritionCalculator";

interface DailySummaryProps {
  calories: number;
  calorieGoal: number;
  protein: number;
  proteinGoal: number;
  carbs: number;
  carbsGoal: number;
  fat: number;
  fatGoal: number;
  burnedCalories: number;
  onExercisePress: () => void;
}

const number = (value: number) => Math.round(value).toLocaleString("es-CL");

function Nutrient({
  label,
  consumed,
  goal,
  color,
  lightColor,
  borderColor,
}: {
  label: string;
  consumed: number;
  goal: number;
  color: string;
  lightColor: string;
  borderColor: string;
}) {
  const progress = goal > 0 ? Math.min(1, Math.max(0, consumed / goal)) : 0;
  const pct = goal > 0 ? Math.round((consumed / goal) * 100) : 0;
  const valueText = `${number(consumed)} de ${number(goal)} gramos`;
  return (
    <View style={[styles.nutrient, { backgroundColor: lightColor, borderColor }]}>
      <View style={styles.nutrientHeader}>
        <View style={styles.nutrientLabel}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={styles.nutrientName}>{label}</Text>
        </View>
        <Text style={[styles.nutrientPct, { color }]}>{pct}%</Text>
      </View>
      <Text style={styles.nutrientValue} numberOfLines={1} adjustsFontSizeToFit>
        {number(consumed)}
        <Text style={styles.nutrientGoal}> / {number(goal)}g</Text>
      </Text>
      <View
        style={styles.nutrientTrack}
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityValue={{
          min: 0,
          max: Math.max(0, goal),
          now: Math.min(Math.max(0, consumed), Math.max(0, goal)),
          text: valueText,
        }}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, goal)}
        aria-valuenow={Math.min(Math.max(0, consumed), Math.max(0, goal))}
        aria-valuetext={valueText}
      >
        <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export function DailySummary(props: DailySummaryProps) {
  const { calories, calorieGoal, burnedCalories, onExercisePress } = props;
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const wide = width >= 820;

  const adjustedGoals = useMemo(() => {
    return adjustGoalsForActivity(
      {
        calories: calorieGoal,
        proteinG: props.proteinGoal,
        carbsG: props.carbsGoal,
        fatG: props.fatGoal,
      },
      burnedCalories
    );
  }, [calorieGoal, props.proteinGoal, props.carbsGoal, props.fatGoal, burnedCalories]);

  const budget = Math.max(0, adjustedGoals.calories);
  const progress = budget > 0 ? Math.min(1, Math.max(0, calories / budget)) : 0;
  const percent = budget > 0 ? Math.round((calories / budget) * 100) : 0;
  const available = Math.max(0, budget - calories);
  const over = Math.max(0, calories - budget);
  const size = compact ? 100 : 112;
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const valueText = `${number(calories)} de ${number(budget)} kilocalorías`;

  return (
    <View testID="daily-summary" style={styles.card}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>Resumen diario</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Registrar o ver ejercicio"
          onPress={onExercisePress}
          style={({ pressed }) => [styles.exercise, pressed && { opacity: 0.7 }]}
        >
          <Flame size={16} color={colors.primary} />
          <Text style={styles.exerciseText}>Actividad</Text>
        </Pressable>
      </View>
      <View style={wide ? styles.bodyWide : undefined}>
        <View style={[styles.energyRow, wide && styles.energyWide]}>
          <View
            style={[styles.ring, { width: size, height: size }]}
            accessibilityRole="progressbar"
            accessibilityLabel="Calorías consumidas"
            accessibilityValue={{
              min: 0,
              max: Math.round(budget),
              now: Math.round(Math.min(Math.max(0, calories), budget)),
              text: valueText,
            }}
            aria-valuemin={0}
            aria-valuemax={Math.round(budget)}
            aria-valuenow={Math.round(Math.min(Math.max(0, calories), budget))}
            aria-valuetext={valueText}
          >
            <Svg width={size} height={size} aria-hidden accessibilityElementsHidden>
              <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="#E3F0E7"
                  strokeWidth={7}
                  fill="none"
                />
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={over > 0 ? colors.warning : colors.primary}
                  strokeWidth={7}
                  fill="none"
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={circumference * (1 - progress)}
                  strokeLinecap="round"
                />
              </G>
            </Svg>
            <View style={styles.ringCopy}>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[styles.calories, compact && { fontSize: 24 }]}
              >
                {number(calories)}
              </Text>
              <Text style={styles.calorieUnit}>kcal consumidas</Text>
            </View>
          </View>
          <View style={styles.energyDetails}>
            <View style={styles.goalRow}>
              <View style={styles.goalCopy}>
                <Text style={styles.goalLabel}>Meta diaria</Text>
                <Text style={styles.goalValue}>
                  {number(calorieGoal)} <Text style={styles.unit}>kcal</Text>
                </Text>
              </View>

              {over > 0 ? (
                <View style={styles.overPill}>
                  <Text style={styles.pillLabel}>SOBRE META</Text>
                  <Text style={styles.overPillValue}>
                    +{number(over)} <Text style={styles.pillUnit}>kcal</Text>
                  </Text>
                </View>
              ) : (
                <View style={styles.availablePill}>
                  <Text style={styles.pillLabel}>DISPONIBLES</Text>
                  <Text style={styles.availablePillValue}>
                    {number(available)} <Text style={styles.pillUnit}>kcal</Text>
                  </Text>
                </View>
              )}
            </View>

            {burnedCalories > 0 && (
              <Text style={styles.activityNote}>
                +{number(burnedCalories)} kcal por actividad · total {number(budget)} kcal
              </Text>
            )}

            <View style={styles.percentRow}>
              <Text style={styles.percent}>{percent}%</Text>
              <Text style={styles.percentLabel}>del presupuesto diario</Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${progress * 100}%`,
                    backgroundColor: over > 0 ? colors.warning : colors.primary,
                  },
                ]}
              />
            </View>
          </View>
        </View>
        <View style={[styles.nutrients, wide && styles.nutrientsWide]}>
          <View style={styles.nutrientsHeaderRow}>
            <Text accessibilityRole="header" style={styles.nutrientsTitle}>Tus nutrientes</Text>
            {burnedCalories > 0 && (
              <Text style={styles.activityBadge}>
                +{Math.round((burnedCalories * 0.75) / 4)}g carbos por actividad
              </Text>
            )}
          </View>
          <View style={styles.nutrientRow}>
            <Nutrient
              label="Proteína"
              consumed={props.protein}
              goal={adjustedGoals.proteinG}
              color={colors.protein}
              lightColor={colors.proteinLight}
              borderColor="#E0E7FF"
            />
            <Nutrient
              label="Carbos"
              consumed={props.carbs}
              goal={adjustedGoals.carbsG}
              color="#D97706"
              lightColor={colors.carbsLight}
              borderColor="#FEF3C7"
            />
            <Nutrient
              label="Grasas"
              consumed={props.fat}
              goal={adjustedGoals.fatG}
              color={colors.fat}
              lightColor={colors.fatLight}
              borderColor="#E0F2FE"
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
    ...shadows.card,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  title: { flex: 1, fontSize: 17, lineHeight: 22, fontWeight: "800", color: colors.text, letterSpacing: -0.3 },
  bodyWide: { flexDirection: "row", alignItems: "center", gap: 24 },
  energyWide: { width: 380 },
  energyRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  ring: { alignItems: "center", justifyContent: "center" },
  ringCopy: { position: "absolute", alignItems: "center", maxWidth: "80%" },
  calories: { fontSize: 27, lineHeight: 32, fontWeight: "800", letterSpacing: -0.8, color: colors.forest },
  calorieUnit: { fontSize: 9.5, lineHeight: 12, color: colors.textSecondary, marginTop: 2, textAlign: "center" },
  energyDetails: { flex: 1, minWidth: 0, gap: 5 },
  goalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  goalCopy: { minWidth: 0 },
  goalLabel: { fontSize: 11.5, lineHeight: 15, color: colors.textSecondary },
  goalValue: { fontSize: 21, lineHeight: 26, fontWeight: "800", color: colors.text },
  availablePill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BAE6C9",
    alignItems: "flex-end",
  },
  overPill: {
    backgroundColor: colors.warningLight,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
    alignItems: "flex-end",
  },
  pillLabel: {
    fontSize: 8.5,
    fontWeight: "800",
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
  availablePillValue: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.primaryDark,
    letterSpacing: -0.3,
  },
  overPillValue: {
    fontSize: 15,
    fontWeight: "900",
    color: "#B45309",
    letterSpacing: -0.3,
  },
  pillUnit: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  activityNote: { fontSize: 10, lineHeight: 14, color: colors.textSecondary },
  unit: { fontSize: 11, fontWeight: "500", color: colors.textSecondary },
  percentRow: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: 5, marginTop: 2 },
  percent: { color: colors.primaryDark, fontSize: 13.5, lineHeight: 17, fontWeight: "800" },
  percentLabel: { color: colors.textSecondary, fontSize: 10.5, lineHeight: 14 },
  track: { height: 6, backgroundColor: colors.surfaceMuted, borderRadius: 3, overflow: "hidden", marginTop: 4 },
  fill: { height: "100%", borderRadius: 3 },
  nutrients: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  nutrientsWide: {
    flex: 1,
    minWidth: 0,
    marginTop: 0,
    paddingTop: 0,
    borderTopWidth: 0,
    paddingLeft: 24,
    borderLeftWidth: 1,
    borderLeftColor: colors.cardBorder,
  },
  nutrientsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  nutrientsTitle: { fontSize: 11.5, lineHeight: 14, color: colors.textSecondary, fontWeight: "700" },
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
  nutrientRow: { flexDirection: "row", gap: 8 },
  nutrient: {
    flex: 1,
    minWidth: 0,
    padding: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  nutrientHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  nutrientLabel: { flexDirection: "row", alignItems: "center", gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  nutrientName: { fontSize: 10.5, lineHeight: 13, fontWeight: "700", color: colors.text },
  nutrientPct: { fontSize: 10, fontWeight: "800" },
  nutrientValue: { fontSize: 14.5, lineHeight: 18, fontWeight: "800", color: colors.text, marginTop: 2 },
  nutrientGoal: { fontSize: 10, fontWeight: "600", color: colors.textSecondary },
  nutrientTrack: { height: 5, backgroundColor: "rgba(0,0,0,0.06)", borderRadius: 2.5, overflow: "hidden", marginTop: 5 },

  exercise: {
    minHeight: 38,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
  },
  exerciseText: { fontSize: 11, lineHeight: 17, color: colors.primaryDark, fontWeight: "600" },
});
