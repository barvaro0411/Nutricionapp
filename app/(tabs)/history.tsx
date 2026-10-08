import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowUpRight, CalendarDays, Download } from "lucide-react-native";
import { useWeeklyStats } from "@/hooks/useWeeklyStats";
import { useDailyNutrition } from "@/hooks/useDailyNutrition";
import { WeeklyMacroChart } from "@/components/charts/WeeklyMacroChart";
import { PageHeading, StateCard, AppButton } from "@/components/common/AppUI";
import { colors, layout } from "@/constants/colors";

export default function HistoryScreen() {
  const router = useRouter();
  const {
    data: weeklyData,
    error,
    isLoading,
    refetch,
    isRefetching,
  } = useWeeklyStats();
  const { data: dailyData } = useDailyNutrition();
  const loggedDays =
    weeklyData?.days.filter((day) => day.mealCount > 0).length || 0;
  const averages = [
    {
      label: "Energía",
      value: weeklyData?.averages.calories,
      unit: "kcal",
      color: colors.primary,
    },
    {
      label: "Proteína",
      value: weeklyData?.averages.protein,
      unit: "g",
      color: colors.protein,
    },
    {
      label: "Carbohidratos",
      value: weeklyData?.averages.carbs,
      unit: "g",
      color: colors.carbs,
    },
    {
      label: "Grasas",
      value: weeklyData?.averages.fat,
      unit: "g",
      color: colors.fat,
    },
  ];
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={colors.primary}
        />
      }
    >
      <PageHeading
        eyebrow="Una mirada a tu semana"
        title="Tu progreso"
        description="Observa tus hábitos de los últimos 7 días. La constancia se construye paso a paso."
      />
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.muted}>Cargando tu semana…</Text>
        </View>
      ) : error ? (
        <StateCard
          title="Tu progreso no pudo cargarse"
          message="Revisa la conexión y vuelve a intentarlo."
          onRetry={() => void refetch()}
        />
      ) : (
        <>
          <View style={styles.summary}>
            <View style={styles.summaryHeader}>
              <CalendarDays size={20} color={colors.mint} />
              <Text style={styles.summaryOverline}>TU SEMANA EN NÚMEROS</Text>
            </View>
            <View style={styles.summaryMetrics}>
              <View style={styles.summaryMetric}>
                <Text style={styles.summaryNumber}>
                  {loggedDays}
                  <Text style={styles.summaryDenominator}> / 7</Text>
                </Text>
                <Text style={styles.summaryLabel}>días con registros</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryMetric}>
                <Text style={styles.summaryNumber}>
                  {weeklyData?.totalMeals || 0}
                </Text>
                <Text style={styles.summaryLabel}>comidas registradas</Text>
              </View>
            </View>
          </View>
          {loggedDays === 0 ? (
            <StateCard
              title="Tu historia empieza con una comida"
              message="Cuando guardes tu primer registro, aquí verás tus tendencias y el balance de tus nutrientes."
            />
          ) : (
            <WeeklyMacroChart
              days={weeklyData?.days || []}
              targetCalories={dailyData?.goal.calories || 2000}
            />
          )}
          {loggedDays === 0 && (
            <View style={styles.firstMeal}>
              <AppButton
                title="Registrar mi primera comida"
                onPress={() => router.push("/(tabs)/record")}
              />
            </View>
          )}
          <Text style={styles.sectionTitle}>Promedio por día registrado</Text>
          <Text style={styles.sectionDescription}>
            {loggedDays > 0
              ? "Calculado sobre " +
                loggedDays +
                " " +
                (loggedDays === 1 ? "día con comidas." : "días con comidas.")
              : "Aún no hay datos para calcular promedios."}
          </Text>
          <View style={styles.averageGrid}>
            {averages.map((metric) => (
              <View style={styles.averageCard} key={metric.label}>
                <View style={[styles.dot, { backgroundColor: metric.color }]} />
                <Text style={styles.averageLabel}>{metric.label}</Text>
                <Text style={styles.averageValue}>
                  {loggedDays > 0 ? metric.value : "—"}{" "}
                  <Text style={styles.averageUnit}>{metric.unit}</Text>
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Día a día</Text>
            <Text style={styles.muted}>Toca un día para abrirlo</Text>
          </View>
          <View style={styles.daysCard}>
            {(weeklyData?.days || []).map((day, index) => (
              <Pressable
                key={day.date}
                accessibilityRole="button"
                accessibilityLabel={"Ver registros del " + day.date}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)",
                    params: { date: day.date },
                  })
                }
                style={({ pressed }) => [
                  styles.dayRow,
                  index > 0 && styles.dayBorder,
                  pressed && { backgroundColor: colors.primaryLight },
                ]}
              >
                <View style={styles.dateBadge}>
                  <Text style={styles.dayLabel}>{day.dayLabel}</Text>
                  <Text style={styles.dayNumber}>
                    {Number(day.date.slice(8))}
                  </Text>
                </View>
                <View style={styles.dayInfo}>
                  <Text style={styles.dayTitle}>
                    {day.mealCount === 0
                      ? "Sin registros"
                      : day.mealCount +
                        " " +
                        (day.mealCount === 1 ? "comida" : "comidas")}
                  </Text>
                  <Text style={styles.dayDetail}>
                    {day.mealCount > 0
                      ? Math.round(day.protein) +
                        " g proteína · " +
                        Math.round(day.carbs) +
                        " g carbos"
                      : "Puedes añadir una comida para este día"}
                  </Text>
                </View>
                <View style={styles.dayEnergy}>
                  <Text style={styles.dayCalories}>
                    {day.mealCount > 0 ? Math.round(day.calories) : "—"}
                  </Text>
                  <Text style={styles.muted}>kcal</Text>
                </View>
                <ArrowUpRight size={16} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
          <View style={styles.exportCard}>
            <View style={styles.exportCopy}>
              <Text style={styles.exportTitle}>Comparte tu progreso</Text>
              <Text style={styles.sectionDescription}>
                Un resumen para ti o tu nutricionista.
              </Text>
            </View>
            <AppButton
              title="Exportar"
              onPress={() => router.push("/export")}
              secondary
              icon={<Download size={16} color={colors.primary} />}
            />
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
  summary: {
    backgroundColor: colors.forest,
    borderRadius: 24,
    padding: 24,
    marginBottom: 22,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 22,
  },
  summaryOverline: {
    color: "#CEE1D6",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.3,
  },
  summaryMetrics: { flexDirection: "row", alignItems: "center", gap: 24 },
  summaryMetric: { flex: 1 },
  summaryNumber: {
    color: "#FFFFFF",
    fontSize: 35,
    fontWeight: "800",
    letterSpacing: -1,
  },
  summaryDenominator: { fontSize: 18, color: "#BDDAC8", fontWeight: "400" },
  summaryLabel: { fontSize: 12, color: "#CEE1D6", marginTop: 6 },
  summaryDivider: { width: 1, height: 44, backgroundColor: "#426456" },
  firstMeal: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  sectionDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  averageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 26,
  },
  averageCard: {
    flexGrow: 1,
    flexBasis: "45%",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 18,
    padding: 18,
    minWidth: 0,
  },
  dot: { width: 7, height: 7, borderRadius: 4, marginBottom: 12 },
  averageLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
  averageValue: {
    fontSize: 27,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  averageUnit: { fontSize: 12, fontWeight: "500", color: colors.textSecondary },
  sectionHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 10,
  },
  daysCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: "hidden",
  },
  dayRow: {
    minHeight: 86,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
  },
  dayBorder: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
  dateBadge: { width: 42, alignItems: "center", gap: 3 },
  dayLabel: { fontSize: 10, color: colors.textSecondary },
  dayNumber: { fontSize: 19, fontWeight: "700", color: colors.text },
  dayInfo: { flex: 1, minWidth: 0 },
  dayTitle: { fontSize: 13, fontWeight: "600", color: colors.text },
  dayDetail: {
    fontSize: 10,
    lineHeight: 15,
    color: colors.textSecondary,
    marginTop: 4,
  },
  dayEnergy: { alignItems: "flex-end" },
  dayCalories: { fontSize: 17, fontWeight: "700", color: colors.text },
  exportCard: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 16,
    backgroundColor: colors.primaryLight,
    borderRadius: 20,
    padding: 20,
    marginTop: 24,
  },
  exportCopy: { flex: 1, minWidth: 140 },
  exportTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 5,
  },
});
