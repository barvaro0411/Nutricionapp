import React, { useRef } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { DayStat, ProgressMetric } from "@/utils/progressStats";
import { colors } from "@/constants/colors";

interface Props {
  days: DayStat[];
  metric: ProgressMetric;
  target?: number;
  color: string;
  unit: string;
  selectedDate: string;
  onSelectDay: (day: DayStat) => void;
}
export function WeeklyMacroChart({ days, metric, target, color, unit, selectedDate, onSelectDay }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const hasTarget = target !== undefined && target > 0;
  const max = Math.max(hasTarget ? target * 1.2 : 0, ...days.map(day => day[metric]), 1);
  return (
    <View>
      <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={days.length > 7}
        onContentSizeChange={() => { if (days.length > 7) scrollRef.current?.scrollToEnd({ animated: false }); }}>
        <View style={[styles.chartArea, days.length > 7 && { minWidth: days.length * 42 }]}>
          {days.map(day => {
            const selected = day.date === selectedDate;
            return (
              <Pressable key={day.date} accessibilityRole="button"
                accessibilityLabel={day.dayLabel + " " + day.date + ": " + (day.mealCount ? day[metric] + " " + unit : "sin registros")}
                accessibilityState={{ selected }} onPress={() => onSelectDay(day)}
                aria-pressed={selected}
                style={[styles.column, selected && styles.selected]}>
                <Text style={styles.value}>{day.mealCount ? Math.round(day[metric]) : "—"}</Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { height: `${day[metric] > 0 ? Math.max(day[metric] / max * 100, 2) : 0}%`, backgroundColor: color, opacity: selected ? 1 : 0.65 }]} />
                  {hasTarget && <View style={[styles.target, { bottom: `${target / max * 100}%` }]} />}
                </View>
                <Text style={styles.day}>{day.dayLabel}</Text>
                <Text style={styles.date}>{Number(day.date.slice(8))}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: color }]} /><Text style={styles.help}>Consumo registrado</Text></View>
        {hasTarget && <View style={styles.legendItem}><View style={styles.line} /><Text style={styles.help}>Meta de hoy: {Math.round(target)} {unit}</Text></View>}
      </View>
      <Text style={styles.note}>Los días sin comidas no se incluyen en el promedio.{days.length > 7 ? " Desliza para ver todo el periodo." : " Toca una barra para ver ese día."}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  chartArea: { flexDirection: "row", flex: 1, minWidth: "100%", paddingVertical: 8 },
  column: { flex: 1, minWidth: 36, alignItems: "center", paddingVertical: 8, borderRadius: 12 },
  selected: { backgroundColor: colors.surfaceMuted },
  track: { width: 18, height: 128, backgroundColor: colors.background, borderRadius: 9, justifyContent: "flex-end", overflow: "hidden", marginTop: 8 },
  fill: { width: "100%", borderRadius: 9 },
  target: { position: "absolute", left: 0, right: 0, borderTopWidth: 2, borderTopColor: colors.textSecondary, borderStyle: "dashed" },
  value: { fontSize: 10, fontWeight: "600", color: colors.textSecondary },
  day: { fontSize: 11, fontWeight: "700", color: colors.text, marginTop: 10 },
  date: { fontSize: 10, color: colors.textSecondary, marginTop: 3 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  line: { width: 14, borderTopWidth: 2, borderTopColor: colors.textSecondary, borderStyle: "dashed" },
  help: { fontSize: 11, color: colors.textSecondary },
  note: { fontSize: 11, lineHeight: 17, color: colors.textSecondary, marginTop: 10 },
});
