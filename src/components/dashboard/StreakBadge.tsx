import React from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { Flame } from "lucide-react-native";
import { useUserStreak } from "@/hooks/useUserStreak";

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
          size={15}
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
        {streak > 0 ? `${streak} ${streak === 1 ? "día" : "días"}` : "0 días"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  containerActive: {
    backgroundColor: "#FFF7ED", // orange-50
    borderColor: "#FDBA74", // orange-300
  },
  containerPending: {
    backgroundColor: "#FEF3C7", // amber-50
    borderColor: "#FCD34D", // amber-300
  },
  containerZero: {
    backgroundColor: "#F3F4F6", // gray-100
    borderColor: "#E5E7EB", // gray-200
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: "#FFEDD5", // orange-100
  },
  iconWrapPending: {
    backgroundColor: "#FEF9C3", // yellow-100
  },
  iconWrapZero: {
    backgroundColor: "#E5E7EB",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  labelActive: {
    color: "#C2410C", // orange-700
  },
  labelPending: {
    color: "#B45309", // amber-700
  },
  labelZero: {
    color: "#6B7280", // gray-500
  },
});
