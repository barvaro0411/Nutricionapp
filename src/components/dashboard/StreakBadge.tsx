import React from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { Flame } from "lucide-react-native";
import { useUserStreak } from "@/hooks/useUserStreak";
import { colors } from "@/constants/colors";

interface StreakBadgeProps {
  onPress: () => void;
}

export function StreakBadge({ onPress }: StreakBadgeProps) {
  const { data } = useUserStreak();
  const streak = data?.currentStreak ?? 0;
  const hasLoggedToday = data?.hasLoggedToday ?? false;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        hasLoggedToday ? styles.containerActive : streak > 0 ? styles.containerPending : styles.containerZero,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Racha de ${streak} días`}
    >
      <View
        style={[
          styles.iconWrap,
          hasLoggedToday ? styles.iconWrapActive : streak > 0 ? styles.iconWrapPending : styles.iconWrapZero,
        ]}
      >
        <Flame
          size={16}
          color={hasLoggedToday ? "#EA580C" : streak > 0 ? "#F97316" : "#9CA3AF"}
          fill={hasLoggedToday ? "#EA580C" : streak > 0 ? "#FDBA74" : "none"}
        />
      </View>
      <Text
        style={[
          styles.label,
          hasLoggedToday ? styles.labelActive : streak > 0 ? styles.labelPending : styles.labelZero,
        ]}
      >
        {streak > 0
          ? hasLoggedToday
            ? `${streak} ${streak === 1 ? "día" : "días"}`
            : `${streak}d · ⚠️ En juego`
          : "0 días"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 22,
    borderWidth: 1.5,
    gap: 7,
    shadowColor: "#EA580C",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  containerActive: {
    backgroundColor: colors.carbsLight,
    borderColor: colors.warning,
  },
  containerPending: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warning,
  },
  containerZero: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: colors.warningLight,
  },
  iconWrapPending: {
    backgroundColor: colors.carbsLight,
  },
  iconWrapZero: {
    backgroundColor: colors.surfaceMuted,
  },
  label: {
    fontSize: 12.5,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  labelActive: {
    color: colors.carbs,
  },
  labelPending: {
    color: colors.warning,
  },
  labelZero: {
    color: colors.textSecondary,
  },
});
