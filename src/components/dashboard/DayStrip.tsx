import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/colors";
import { dateForMealRoute, getDateKey } from "@/utils/dates";
import { progressDateKeys } from "@/utils/progressStats";

export function DayStrip({ date, onSelect }: { date: Date; onSelect: (date: Date) => void }) {
  const selected = getDateKey(date);
  const today = getDateKey();
  const recent = progressDateKeys(7, today);
  const days = recent.includes(selected) ? recent : progressDateKeys(7, selected);
  return (
    <View style={styles.row}>
      {days.map(key => {
        const active = key === selected;
        return (
          <Pressable key={key} accessibilityRole="button" accessibilityLabel={"Ver día " + key}
            accessibilityState={{ selected: active }} aria-pressed={active}
            onPress={() => onSelect(dateForMealRoute(key))}
            style={({ pressed }) => [styles.day, active && styles.active, pressed && styles.pressed]}>
            <Text style={[styles.weekday, active && styles.activeText]}>{["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][new Date(`${key}T12:00:00Z`).getUTCDay()]}</Text>
            <Text style={[styles.number, active && styles.activeText]}>{Number(key.slice(8))}</Text>
            <View style={[styles.dot, key === today && { backgroundColor: active ? colors.mint : colors.primary }]} />
          </Pressable>
        );
      })}
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 5, paddingTop: 12, marginTop: 12, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  day: { flex: 1, minWidth: 0, minHeight: 66, borderRadius: 14, alignItems: "center", justifyContent: "center", gap: 5 },
  active: { backgroundColor: colors.forest },
  weekday: { fontSize: 10, fontWeight: "600", color: colors.textSecondary },
  number: { fontSize: 16, fontWeight: "800", color: colors.text },
  activeText: { color: "white" },
  dot: { height: 3, width: 3, borderRadius: 2, backgroundColor: "transparent" },
  pressed: { opacity: 0.75 },
});
