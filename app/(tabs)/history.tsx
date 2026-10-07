import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useWeeklyStats } from "@/hooks/useWeeklyStats";
import { useDailyNutrition } from "@/hooks/useDailyNutrition";
import { WeeklyMacroChart } from "@/components/charts/WeeklyMacroChart";
import { colors } from "@/constants/colors";

export default function HistoryScreen() {
  const { data: weeklyData, isLoading, refetch, isRefetching } = useWeeklyStats();
  const { data: dailyData } = useDailyNutrition();

  const targetCalories = dailyData?.goal.calories || 2000;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Tendencia Semanal</Text>
        <Text style={styles.subtitle}>
          Monitorea tu consistencia calórica y el balance de macronutrientes de los últimos 7 días.
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {/* Gráfico Semanal de Calorías */}
          <WeeklyMacroChart
            days={weeklyData?.days || []}
            targetCalories={targetCalories}
          />

          {/* Tarjetas de Promedios Semanales (Diferenciador Clave) */}
          <Text style={styles.sectionTitle}>Promedio Diario de la Semana</Text>
          <View style={styles.averagesGrid}>
            <View style={styles.averageCard}>
              <Text style={styles.avgLabel}>Calorías</Text>
              <Text style={styles.avgValue}>{weeklyData?.averages.calories || 0}</Text>
              <Text style={styles.avgUnit}>kcal / día</Text>
            </View>

            <View style={styles.averageCard}>
              <View style={[styles.indicator, { backgroundColor: colors.protein }]} />
              <Text style={styles.avgLabel}>Proteína</Text>
              <Text style={styles.avgValue}>{weeklyData?.averages.protein || 0}g</Text>
              <Text style={styles.avgUnit}>promedio</Text>
            </View>

            <View style={styles.averageCard}>
              <View style={[styles.indicator, { backgroundColor: colors.carbs }]} />
              <Text style={styles.avgLabel}>Carbos</Text>
              <Text style={styles.avgValue}>{weeklyData?.averages.carbs || 0}g</Text>
              <Text style={styles.avgUnit}>promedio</Text>
            </View>

            <View style={styles.averageCard}>
              <View style={[styles.indicator, { backgroundColor: colors.fat }]} />
              <Text style={styles.avgLabel}>Grasas</Text>
              <Text style={styles.avgValue}>{weeklyData?.averages.fat || 0}g</Text>
              <Text style={styles.avgUnit}>promedio</Text>
            </View>
          </View>

          {/* Desglose Diario */}
          <Text style={styles.sectionTitle}>Historial Diario</Text>
          <View style={styles.daysList}>
            {(weeklyData?.days || []).map((day) => (
              <View key={day.date} style={styles.dayRow}>
                <View style={styles.dayDateCol}>
                  <Text style={styles.dayRowLabel}>{day.dayLabel}</Text>
                  <Text style={styles.dayRowDate}>{day.date.slice(5)}</Text>
                </View>

                <View style={styles.dayMacrosCol}>
                  <Text style={styles.dayMacrosText}>
                    {Math.round(day.protein)}g P • {Math.round(day.carbs)}g C • {Math.round(day.fat)}g G
                  </Text>
                  <Text style={styles.dayMealsCount}>
                    {day.mealCount} {day.mealCount === 1 ? "comida" : "comidas"}
                  </Text>
                </View>

                <View style={styles.dayCalCol}>
                  <Text style={styles.dayCalNumber}>{Math.round(day.calories)}</Text>
                  <Text style={styles.dayCalUnit}>kcal</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 110,
  },
  header: {
    marginBottom: 20,
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
  loader: {
    paddingVertical: 50,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  averagesGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  averageCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 4,
  },
  avgLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 4,
  },
  avgValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  avgUnit: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  daysList: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: "hidden",
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  dayDateCol: {
    width: 50,
  },
  dayRowLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  dayRowDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  dayMacrosCol: {
    flex: 1,
    paddingHorizontal: 8,
  },
  dayMacrosText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  dayMealsCount: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dayCalCol: {
    alignItems: "flex-end",
  },
  dayCalNumber: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  dayCalUnit: {
    fontSize: 10,
    color: colors.textMuted,
  },
});
