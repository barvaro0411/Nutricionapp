import React from "react";
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { Flame } from "lucide-react-native";
import { colors, shadows } from "@/constants/colors";

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

function Nutrient({ label, consumed, goal, color }: {
  label: string; consumed: number; goal: number; color: string;
}) {
  const progress = goal > 0 ? Math.min(1, Math.max(0, consumed / goal)) : 0;
  const valueText = `${number(consumed)} de ${number(goal)} gramos`;
  return (
    <View style={styles.nutrient}>
      <View style={styles.nutrientLabel}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.nutrientName}>{label}</Text>
      </View>
      <Text style={styles.nutrientValue} numberOfLines={1} adjustsFontSizeToFit>{number(consumed)}<Text style={styles.nutrientGoal}> / {number(goal)} g</Text></Text>
      <View style={styles.track} accessibilityRole="progressbar"
        accessibilityLabel={label} accessibilityValue={{ min: 0, max: Math.max(0, goal), now: Math.min(Math.max(0, consumed), Math.max(0, goal)), text: valueText }}
        aria-valuemin={0} aria-valuemax={Math.max(0, goal)} aria-valuenow={Math.min(Math.max(0, consumed), Math.max(0, goal))} aria-valuetext={valueText}>
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
  const budget = Math.max(0, calorieGoal + burnedCalories);
  const progress = budget > 0 ? Math.min(1, Math.max(0, calories / budget)) : 0;
  const percent = budget > 0 ? Math.round((calories / budget) * 100) : 0;
  const over = Math.max(0, calories - budget);
  const size = compact ? 100 : 112;
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const valueText = `${number(calories)} de ${number(budget)} kilocalorías`;
  return (
    <View testID="daily-summary" style={styles.card}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>Resumen diario</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Registrar o ver ejercicio" onPress={onExercisePress}
          style={({ pressed }) => [styles.exercise, pressed && { opacity: 0.7 }]}>
          <Flame size={16} color={colors.primary} />
          <Text style={styles.exerciseText}>Actividad</Text>
        </Pressable>
      </View>
      <View style={wide ? styles.bodyWide : undefined}>
        <View style={[styles.energyRow, wide && styles.energyWide]}>
          <View style={[styles.ring, { width: size, height: size }]} accessibilityRole="progressbar"
            accessibilityLabel="Calorías consumidas"
            accessibilityValue={{ min: 0, max: Math.round(budget), now: Math.round(Math.min(Math.max(0, calories), budget)), text: valueText }}
            aria-valuemin={0} aria-valuemax={Math.round(budget)} aria-valuenow={Math.round(Math.min(Math.max(0, calories), budget))} aria-valuetext={valueText}>
            <Svg width={size} height={size} aria-hidden accessibilityElementsHidden>
              <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
                <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#E3F0E7" strokeWidth={7} fill="none" />
                <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.primary} strokeWidth={7} fill="none"
                  strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - progress)} strokeLinecap="round" />
              </G>
            </Svg>
            <View style={styles.ringCopy}>
              <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.calories, compact && { fontSize: 25 }]}>{number(calories)}</Text>
              <Text style={styles.calorieUnit}>kcal consumidas</Text>
            </View>
          </View>
          <View style={styles.energyDetails}>
            <Text style={styles.goalLabel}>Meta diaria</Text>
            <Text style={styles.goalValue}>{number(calorieGoal)} <Text style={styles.unit}>kcal</Text></Text>
            {burnedCalories > 0 && <Text style={styles.activityNote}>+{number(burnedCalories)} de actividad · total {number(budget)}</Text>}
            <View style={styles.percentRow}>
              <Text style={styles.percent}>{percent}%</Text>
              <Text style={styles.percentLabel}>registrado</Text>
            </View>
            <View style={styles.track}><View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} /></View>
            <Text style={styles.remaining}>{over > 0 ? `${number(over)} kcal sobre la meta` : `${number(budget - calories)} kcal disponibles`}</Text>
          </View>
        </View>
        <View style={[styles.nutrients, wide && styles.nutrientsWide]}>
          <Text accessibilityRole="header" style={styles.nutrientsTitle}>Tus nutrientes</Text>
          <View style={styles.nutrientRow}>
            <Nutrient label="Proteína" consumed={props.protein} goal={props.proteinGoal} color={colors.protein} />
            <Nutrient label="Carbos" consumed={props.carbs} goal={props.carbsGoal} color={colors.carbs} />
            <Nutrient label="Grasas" consumed={props.fat} goal={props.fatGoal} color={colors.fat} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, padding: 18, borderRadius: 24, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 18, ...shadows.card },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  title: { flex: 1, fontSize: 17, lineHeight: 22, fontWeight: "800", color: colors.text, letterSpacing: -0.3 },
  bodyWide: { flexDirection: "row", alignItems: "center", gap: 24 },
  energyWide: { width: 360 },
  energyRow: { flexDirection: "row", alignItems: "center", gap: 18 },
  ring: { alignItems: "center", justifyContent: "center" },
  ringCopy: { position: "absolute", alignItems: "center", maxWidth: "80%" },
  calories: { fontSize: 29, lineHeight: 34, fontWeight: "800", letterSpacing: -0.8, color: colors.forest },
  calorieUnit: { fontSize: 9, lineHeight: 12, color: colors.textSecondary, marginTop: 3 },
  energyDetails: { flex: 1, minWidth: 0, gap: 4 },
  goalLabel: { fontSize: 12, lineHeight: 16, color: colors.textSecondary },
  goalValue: { fontSize: 23, lineHeight: 28, fontWeight: "800", color: colors.text },
  activityNote: { fontSize: 10, lineHeight: 14, color: colors.textSecondary },
  unit: { fontSize: 11, fontWeight: "500", color: colors.textSecondary },
  percentRow: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: 5, marginTop: 2 },
  percent: { color: colors.primaryDark, fontSize: 14, lineHeight: 18, fontWeight: "800" },
  percentLabel: { color: colors.textSecondary, fontSize: 10, lineHeight: 14 },
  remaining: { color: colors.textSecondary, fontSize: 10, lineHeight: 15, marginTop: 2 },
  track: { height: 6, backgroundColor: colors.surfaceMuted, borderRadius: 3, overflow: "hidden", marginTop: 5 },
  fill: { height: "100%", borderRadius: 3 },
  nutrients: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  nutrientsWide: { flex: 1, minWidth: 0, marginTop: 0, paddingTop: 0, borderTopWidth: 0, paddingLeft: 24, borderLeftWidth: 1, borderLeftColor: colors.cardBorder },
  nutrientsTitle: { fontSize: 11, lineHeight: 14, color: colors.textSecondary, fontWeight: "600", marginBottom: 10 },
  nutrientRow: { flexDirection: "row", gap: 14 },
  nutrient: { flex: 1, minWidth: 0 },
  nutrientLabel: { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" },
  dot: { width: 6, height: 6, borderRadius: 3 },
  nutrientName: { fontSize: 11, lineHeight: 14, fontWeight: "600", color: colors.textSecondary },
  nutrientValue: { fontSize: 18, lineHeight: 24, fontWeight: "800", color: colors.text, marginTop: 5 },
  nutrientGoal: { fontSize: 10, fontWeight: "500", color: colors.textSecondary },
  exercise: { minHeight: 44, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.primaryLight, borderRadius: 12 },
  exerciseText: { fontSize: 11, lineHeight: 17, color: colors.primaryDark, fontWeight: "600" },
});
