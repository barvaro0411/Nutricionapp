import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ArrowUpRight, CalendarDays, Download, Plus, TrendingUp } from "lucide-react-native";
import { useWeeklyStats } from "@/hooks/useWeeklyStats";
import { useDailyNutrition } from "@/hooks/useDailyNutrition";
import { WeeklyMacroChart } from "@/components/charts/WeeklyMacroChart";
import { PageHeading, StateCard, AppButton } from "@/components/common/AppUI";
import { colors, layout } from "@/constants/colors";
import { getDateKey, dateForMealRoute, APP_TIME_ZONE } from "@/utils/dates";
import { ProgressPeriod, ProgressMetric } from "@/utils/progressStats";

const metrics: { key: ProgressMetric; label: string; unit: string; color: string }[] = [
  { key: "calories", label: "Energía", unit: "kcal", color: colors.primary },
  { key: "protein", label: "Proteína", unit: "g", color: colors.protein },
  { key: "carbs", label: "Carbohidratos", unit: "g", color: colors.carbs },
  { key: "fat", label: "Grasas", unit: "g", color: colors.fat },
];
const formatDate = (key: string) => dateForMealRoute(key).toLocaleDateString("es-CL", {
  timeZone: APP_TIME_ZONE, day: "numeric", month: "short",
});

export default function HistoryScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState<ProgressPeriod>(7);
  const [metric, setMetric] = useState<ProgressMetric>("calories");
  const [selectedDate, setSelectedDate] = useState(getDateKey());
  const [showAllDays, setShowAllDays] = useState(false);
  const { data, error, isLoading, refetch, isRefetching } = useWeeklyStats(period);
  const { data: today, refetch: refetchToday } = useDailyNutrition();
  const activeMetric = metrics.find(item => item.key === metric)!;
  const selected = data?.days.find(day => day.date === selectedDate) || data?.days[data.days.length - 1];
  const loggedDays = data?.loggedDays || 0;
  const targets = today ? { calories: today.goal.calories, protein: today.goal.protein_g, carbs: today.goal.carbs_g, fat: today.goal.fat_g } : undefined;
  const orderedDays = [...(data?.days || [])].reverse();
  const visibleDays = showAllDays ? orderedDays : orderedDays.slice(0, 7);
  const openDay = (date: string) => router.push({ pathname: "/(tabs)", params: { date } });
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { void Promise.all([refetch(), refetchToday()]); }} tintColor={colors.primary} />}>
      <PageHeading eyebrow="Cada registro cuenta" title="Tu progreso"
        description="Descubre tus hábitos y revisa cómo cambia tu alimentación con el tiempo." />
      <View style={styles.periodRow}>
        <View style={styles.segment}>
          {([7, 30] as ProgressPeriod[]).map(value => (
            <Pressable key={value} accessibilityRole="button" accessibilityLabel={`Últimos ${value} días`}
              accessibilityState={{ selected: period === value }} onPress={() => { setPeriod(value); setShowAllDays(false); }}
              aria-pressed={period === value}
              style={[styles.periodButton, period === value && styles.periodActive]}>
              <Text style={[styles.periodText, period === value && styles.periodTextActive]}>{value} días</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.periodDate}>{data ? formatDate(data.days[0].date) + " – " + formatDate(data.days[data.days.length - 1].date) : "Cargando periodo…"}</Text>
      </View>
      {isLoading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.muted}>Preparando tu progreso…</Text></View>
      ) : error ? (
        <StateCard title="Tu progreso no pudo cargarse" message="Revisa la conexión y vuelve a intentarlo." onRetry={() => void refetch()} />
      ) : (
        <>
          <View style={styles.summary}>
            <View style={styles.summaryHeader}><CalendarDays size={19} color={colors.mint} /><Text style={styles.summaryOverline}>TU CONSTANCIA</Text></View>
            <View style={styles.summaryMetrics}>
              <View style={styles.summaryMetric}><Text style={styles.summaryNumber}>{loggedDays}<Text style={styles.summaryDenominator}> / {period}</Text></Text><Text style={styles.summaryLabel}>días con registros</Text></View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryMetric}><Text style={styles.summaryNumber}>{data?.totalMeals || 0}</Text><Text style={styles.summaryLabel}>comidas guardadas</Text></View>
            </View>
            <View style={styles.consistencyTrack}><View style={[styles.consistencyFill, { width: `${loggedDays / period * 100}%` }]} /></View>
            <Text style={styles.summaryNote}>{loggedDays ? "Cada comida registrada te ayuda a entender mejor tu rutina." : "Empieza con una comida. Tu progreso se construye día a día."}</Text>
          </View>
          {loggedDays === 0 ? (
            <View style={styles.empty}>
              <StateCard title="Tu historia empieza con una comida" message="Aquí aparecerán tus tendencias cuando guardes alimentos en este periodo." />
              <AppButton title="Añadir alimentos" onPress={() => router.push("/(tabs)/record")} icon={<Plus size={18} color="white" />} />
            </View>
          ) : (
            <View style={styles.chartCard}>
              <View style={styles.sectionHeader}><Text accessibilityRole="header" style={styles.sectionTitle}>Tus tendencias</Text><TrendingUp size={20} color={colors.primary} /></View>
              <View style={styles.metricRow}>
                {metrics.map(item => (
                  <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={"Ver tendencia de " + item.label}
                    accessibilityState={{ selected: metric === item.key }} onPress={() => setMetric(item.key)}
                    aria-pressed={metric === item.key}
                    style={[styles.metricChip, metric === item.key && { backgroundColor: item.color, borderColor: item.color }]}>
                    <Text style={[styles.metricText, metric === item.key && { color: "white" }]}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>
              <WeeklyMacroChart days={data?.days || []} metric={metric} target={targets?.[metric]}
                color={activeMetric.color} unit={activeMetric.unit} selectedDate={selected?.date || getDateKey()} onSelectDay={day => setSelectedDate(day.date)} />
              {selected && (
                <View style={styles.selectedDay}>
                  <View style={styles.selectedCopy}><Text style={styles.dayTitle}>{selected.date === getDateKey() ? "Hoy" : selected.dayLabel + ", " + formatDate(selected.date)}</Text>
                    <Text style={styles.sectionDescription}>{selected.mealCount ? selected.mealCount + (selected.mealCount === 1 ? " comida · " : " comidas · ") + Math.round(selected[metric]) + " " + activeMetric.unit + " registrados" : "Sin comidas registradas"}</Text>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel={"Abrir día " + selected.date} onPress={() => openDay(selected.date)} style={styles.openButton}>
                    <Text style={styles.link}>Ver día</Text><ArrowUpRight size={17} color={colors.primary} />
                  </Pressable>
                </View>
              )}
            </View>
          )}
          <Text accessibilityRole="header" style={styles.sectionTitle}>Tu promedio diario</Text>
          <Text style={styles.sectionDescription}>{loggedDays ? `Solo considera ${loggedDays === 1 ? "el día con comidas" : "los " + loggedDays + " días con comidas"}; puede incluir registros parciales.` : "Aún no hay datos para calcular promedios."}</Text>
          <View style={styles.averageGrid}>
            {metrics.map(item => (
              <View style={styles.averageCard} key={item.key}>
                <View style={styles.averageHeading}><View style={[styles.dot, { backgroundColor: item.color }]} /><Text style={styles.averageLabel}>{item.label}</Text></View>
                <Text style={styles.averageValue}>{loggedDays ? data?.averages[item.key] : "—"} <Text style={styles.averageUnit}>{item.unit}</Text></Text>
              </View>
            ))}
          </View>
          <View style={styles.sectionHeader}><Text accessibilityRole="header" style={styles.sectionTitle}>Día a día</Text><Text style={styles.muted}>Más recientes primero</Text></View>
          <View style={styles.daysCard}>
            {visibleDays.map((day, index) => (
              <Pressable key={day.date} accessibilityRole="button" accessibilityLabel={"Ver registros del " + day.date}
                onPress={() => openDay(day.date)} style={({ pressed }) => [styles.dayRow, index > 0 && styles.dayBorder, pressed && { backgroundColor: colors.primaryLight }]}>
                <View style={[styles.dateBadge, day.date === getDateKey() && { backgroundColor: colors.primaryLight }]}>
                  <Text style={styles.dayLabel}>{day.dayLabel}</Text><Text style={styles.dayNumber}>{Number(day.date.slice(8))}</Text>
                </View>
                <View style={styles.dayInfo}><Text style={styles.dayTitle}>{day.date === getDateKey() ? "Hoy" : formatDate(day.date)}</Text>
                  <Text style={styles.dayDetail}>{day.mealCount ? day.mealCount + (day.mealCount === 1 ? " comida" : " comidas") + " · " + Math.round(day.protein) + " g proteína" : "Sin registros"}</Text>
                </View>
                <Text style={styles.dayCalories}>{day.mealCount ? Math.round(day.calories) : "—"}<Text style={styles.averageUnit}> kcal</Text></Text>
                <ArrowUpRight size={16} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
          {period > 7 && <Pressable accessibilityRole="button" onPress={() => setShowAllDays(value => !value)} style={styles.moreButton}><Text style={styles.link}>{showAllDays ? "Mostrar menos días" : "Ver los 30 días"}</Text></Pressable>}
          <View style={styles.exportCard}>
            <View style={styles.exportCopy}><Text style={styles.exportTitle}>Comparte tu progreso</Text><Text style={styles.sectionDescription}>Un resumen para ti o tu nutricionista.</Text></View>
            <AppButton title="Exportar" onPress={() => router.push("/export")} secondary icon={<Download size={16} color={colors.primary} />} />
          </View>
        </>
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { ...layout.page },
  loading: { paddingVertical: 60, alignItems: "center", gap: 16 },
  muted: { fontSize: 11, lineHeight: 16, color: colors.textSecondary },
  periodRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 20 },
  segment: { flexDirection: "row", backgroundColor: colors.surfaceMuted, borderRadius: 14, padding: 4 },
  periodButton: { minHeight: 44, paddingHorizontal: 22, justifyContent: "center", borderRadius: 11 },
  periodActive: { backgroundColor: colors.card },
  periodText: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  periodTextActive: { color: colors.primaryDark, fontWeight: "800" },
  periodDate: { color: colors.textSecondary, fontSize: 12 },
  summary: { backgroundColor: colors.forest, borderRadius: 24, padding: 24, marginBottom: 22 },
  summaryHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  summaryOverline: { color: "#CEE1D6", fontSize: 10, fontWeight: "700", letterSpacing: 1.3 },
  summaryMetrics: { flexDirection: "row", alignItems: "center", gap: 24 },
  summaryMetric: { flex: 1 },
  summaryNumber: { color: "white", fontSize: 36, fontWeight: "800", letterSpacing: -1 },
  summaryDenominator: { fontSize: 18, color: "#BDDAC8", fontWeight: "400" },
  summaryLabel: { fontSize: 12, color: "#CEE1D6", marginTop: 6 },
  summaryDivider: { width: 1, height: 44, backgroundColor: "#426456" },
  consistencyTrack: { height: 5, borderRadius: 3, backgroundColor: "#426456", marginTop: 24, overflow: "hidden" },
  consistencyFill: { height: "100%", backgroundColor: colors.mint, borderRadius: 3 },
  summaryNote: { color: "#CEE1D6", fontSize: 11, lineHeight: 17, marginTop: 12 },
  empty: { marginBottom: 24 },
  chartCard: { backgroundColor: colors.card, padding: 18, borderRadius: 24, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.text, marginBottom: 6 },
  sectionDescription: { fontSize: 12, lineHeight: 18, color: colors.textSecondary, marginBottom: 10 },
  sectionHeader: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 },
  metricRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  metricChip: { minHeight: 44, borderRadius: 12, justifyContent: "center", paddingHorizontal: 10, borderWidth: 1, borderColor: colors.cardBorder },
  metricText: { fontSize: 11, fontWeight: "600", color: colors.textSecondary },
  selectedDay: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, borderTopWidth: 1, borderTopColor: colors.cardBorder, marginTop: 16, paddingTop: 16 },
  selectedCopy: { flex: 1, minWidth: 150 },
  openButton: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.primaryLight },
  link: { color: colors.primary, fontSize: 13, fontWeight: "700" },
  averageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 26 },
  averageCard: { flexGrow: 1, flexBasis: "45%", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 18, padding: 18, minWidth: 0 },
  averageHeading: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  averageLabel: { fontSize: 12, color: colors.textSecondary },
  averageValue: { fontSize: 27, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
  averageUnit: { fontSize: 11, fontWeight: "500", color: colors.textSecondary },
  daysCard: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, overflow: "hidden" },
  dayRow: { minHeight: 82, flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  dayBorder: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
  dateBadge: { width: 42, minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", gap: 3 },
  dayLabel: { fontSize: 10, color: colors.textSecondary },
  dayNumber: { fontSize: 19, fontWeight: "700", color: colors.text },
  dayInfo: { flex: 1, minWidth: 0 },
  dayTitle: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 4 },
  dayDetail: { fontSize: 11, lineHeight: 16, color: colors.textSecondary },
  dayCalories: { fontSize: 17, fontWeight: "700", color: colors.text },
  moreButton: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 8 },
  exportCard: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 16, backgroundColor: colors.primaryLight, borderRadius: 20, padding: 20, marginTop: 24 },
  exportCopy: { flex: 1, minWidth: 140 },
  exportTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 5 },
});
