import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { ArrowUpRight, Flame, Target, Utensils } from "lucide-react-native";
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
  const budget = Math.max(1, goal + burnedCalories);
  const remaining = Math.max(0, budget - consumed);
  const over = Math.max(0, consumed - budget);
  const progress = Math.min(1, Math.max(0, consumed / budget));
  const size = useWindowDimensions().width < 380 ? 120 : 144;
  const stroke = 10;
  const center = size / 2;
  const radius = center - stroke;
  const circumference = 2 * Math.PI * radius;
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.overline}>TU BALANCE DIARIO</Text>
          <Text style={styles.title}>Cada registro cuenta.</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {Math.round((consumed / budget) * 100)}%
          </Text>
        </View>
      </View>
      <View style={styles.main}>
        <View
          style={[styles.ring, { width: size, height: size }]}
          accessibilityRole="progressbar"
          accessibilityLabel="Calorías consumidas"
          accessibilityValue={{
            min: 0,
            max: Math.round(budget),
            now: Math.round(Math.min(consumed, budget)),
            text:
              Math.round(consumed) +
              " de " +
              Math.round(budget) +
              " kilocalorías",
          }}
        >
          <Svg width={size} height={size}>
            <G rotation="-90" origin={center + ", " + center}>
              <Circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="#355E4D"
                strokeWidth={stroke}
              />
              <Circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={over > 0 ? "#F5C77B" : colors.mint}
                strokeWidth={stroke}
                strokeDasharray={circumference + " " + circumference}
                strokeDashoffset={circumference * (1 - progress)}
                strokeLinecap="round"
              />
            </G>
          </Svg>
          <View style={styles.ringText}>
            <Text
              style={styles.remaining}
              adjustsFontSizeToFit
              numberOfLines={1}
            >
              {over > 0
                ? "+" + Math.round(over).toLocaleString("es-CL")
                : Math.round(remaining).toLocaleString("es-CL")}
            </Text>
            <Text style={styles.ringLabel}>
              {over > 0 ? "kcal sobre la meta" : "kcal disponibles"}
            </Text>
          </View>
        </View>
        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Utensils size={16} color="#BFD9CA" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.metricLabel}>Consumidas</Text>
              <Text style={styles.metricValue}>
                {Math.round(consumed).toLocaleString("es-CL")}{" "}
                <Text style={styles.metricUnit}>kcal</Text>
              </Text>
            </View>
          </View>
          <View style={styles.metric}>
            <Target size={16} color="#BFD9CA" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.metricLabel}>Meta diaria</Text>
              <Text style={styles.metricValue}>
                {Math.round(goal).toLocaleString("es-CL")}{" "}
                <Text style={styles.metricUnit}>kcal</Text>
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Registrar o ver ejercicio"
            onPress={onExercisePress}
            style={({ pressed }) => [
              styles.exercise,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Flame size={15} color={colors.mint} />
            <Text style={styles.exerciseText}>
              Ejercicio +{Math.round(burnedCalories)}
            </Text>
            <ArrowUpRight size={14} color={colors.mint} />
          </Pressable>
        </View>
      </View>
      <View style={styles.footer}>
        <View style={styles.footerDot} />
        <Text style={styles.footerText}>
          {burnedCalories > 0
            ? "Tu actividad suma " +
              Math.round(burnedCalories) +
              " kcal a la meta."
            : "Tu objetivo diario, a tu ritmo."}
        </Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.forest,
    borderRadius: 26,
    padding: 20,
    marginBottom: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 22,
  },
  overline: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.5,
    color: "#BDDAC8",
    marginBottom: 6,
  },
  title: {
    fontSize: 19,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.4,
  },
  badge: {
    backgroundColor: "#2C5B45",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  badgeText: { color: colors.mint, fontWeight: "700", fontSize: 12 },
  main: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  ring: {
    width: 144,
    height: 144,
    alignItems: "center",
    justifyContent: "center",
  },
  ringText: { position: "absolute", alignItems: "center", maxWidth: 120 },
  remaining: {
    fontSize: 30,
    lineHeight: 35,
    fontWeight: "800",
    letterSpacing: -1,
    color: "#FFFFFF",
  },
  ringLabel: { fontSize: 10, color: "#CBE1D3", marginTop: 4 },
  metrics: { flex: 1, minWidth: 0, gap: 14 },
  metric: { flexDirection: "row", alignItems: "center", gap: 10 },
  metricLabel: { color: "#CBE1D3", fontSize: 11, marginBottom: 3 },
  metricValue: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  metricUnit: { fontSize: 11, color: "#CBE1D3", fontWeight: "400" },
  exercise: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: "#355E4D",
  },
  exerciseText: { fontSize: 11, color: colors.mint, fontWeight: "600" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#355E4D",
  },
  footerDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.mint,
  },
  footerText: { flex: 1, fontSize: 11, lineHeight: 17, color: "#CEE1D6" },
});
