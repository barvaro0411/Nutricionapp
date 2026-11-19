import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ArrowUpRight, CalendarDays, Download, Plus, TrendingUp, Flame, PieChart } from "lucide-react-native";
import { useWeeklyStats } from "@/hooks/useWeeklyStats";
import { useDailyNutrition } from "@/hooks/useDailyNutrition";
import { useWeightTracker } from "@/hooks/useWeightTracker";
import { useUserStreak } from "@/hooks/useUserStreak";
import { useAuthStore } from "@/stores/useAuthStore";
import { WeeklyMacroChart } from "@/components/charts/WeeklyMacroChart";
import { WeightTrendCard } from "@/components/charts/WeightTrendCard";
import { PageHeading, StateCard, AppButton } from "@/components/common/AppUI";
import { colors, layout, shadows } from "@/constants/colors";
import { getDateKey, dateForMealRoute, APP_TIME_ZONE } from "@/utils/dates";
import { ProgressPeriod, ProgressMetric } from "@/utils/progressStats";
import { computeMacroEnergySplit } from "@/utils/trendInsights";

const metrics: { key: ProgressMetric; label: string; shortLabel: string; unit: string; color: string }[] = [
  { key: "calories", label: "Energía", shortLabel: "Calorías", unit: "kcal", color: colors.primary },
  { key: "protein", label: "Proteína", shortLabel: "Proteína", unit: "g", color: colors.protein },
  { key: "carbs", label: "Carbohidratos", shortLabel: "Carbos", unit: "g", color: colors.carbs },
  { key: "fat", label: "Grasas", shortLabel: "Grasas", unit: "g", color: colors.fat },
];

const formatDate = (key: string) =>
  dateForMealRoute(key).toLocaleDateString("es-CL", {
    timeZone: APP_TIME_ZONE,
    day: "numeric",
    month: "short",
  });

export default function HistoryScreen() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const [period, setPeriod] = useState<ProgressPeriod>(7);
  const [metric, setMetric] = useState<ProgressMetric>("calories");
  const [selectedDate, setSelectedDate] = useState(getDateKey());
  const [showAllDays, setShowAllDays] = useState(false);

  const { data, error, isLoading, refetch, isRefetching } = useWeeklyStats(period);
  const { data: today, refetch: refetchToday } = useDailyNutrition();
  const {
    stats: weightStats,
    logWeight,
    updateTargetWeight,
    isLoggingWeight,
    refetch: refetchWeight,
  } = useWeightTracker(period === 7 ? 7 : 30);
  const { data: streakData } = useUserStreak();

  const currentStreak = streakData?.currentStreak ?? 0;
  const activeMetric = metrics.find((item) => item.key === metric)!;
  const selected =
    data?.days.find((day) => day.date === selectedDate) ||
    data?.days[data.days.length - 1];
  const loggedDays = data?.loggedDays || 0;
  const targets = today
    ? {
        calories: today.goal.calories,
        protein: today.goal.protein_g,
        carbs: today.goal.carbs_g,
        fat: today.goal.fat_g,
      }
    : undefined;
  const orderedDays = [...(data?.days || [])].reverse();
  const visibleDays = showAllDays ? orderedDays : orderedDays.slice(0, 7);

  const energySplit = useMemo(
    () => computeMacroEnergySplit(loggedDays ? data?.averages : undefined),
    [loggedDays, data?.averages]
  );

  const openDay = (date: string) =>
    router.push({ pathname: "/(tabs)", params: { date } });

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => {
            void Promise.all([refetch(), refetchToday(), refetchWeight()]);
          }}
          tintColor={colors.primary}
        />
      }
    >
      <PageHeading
        eyebrow="Cada registro cuenta"
        title="Tu progreso"
        description="Descubre tus hábitos, sigue tu curva corporal y revisa cómo evoluciona tu alimentación."
      />
      <View style={styles.periodRow}>
        <View style={styles.segment}>
          {([7, 30] as ProgressPeriod[]).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityLabel={`Últimos ${value} días`}
              accessibilityState={{ selected: period === value }}
              onPress={() => {
                setPeriod(value);
                setShowAllDays(false);
              }}
              aria-pressed={period === value}
              style={[styles.periodButton, period === value && styles.periodActive]}
            >
              <Text
                style={[styles.periodText, period === value && styles.periodTextActive]}
              >
                {value} días
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.periodDate}>
          {data?.days?.length
            ? formatDate(data.days[0].date) +
              " – " +
              formatDate(data.days[data.days.length - 1].date)
            : "Cargando periodo…"}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.muted}>Preparando tu progreso…</Text>
        </View>
      ) : error ? (
        <StateCard
          title="Tu progreso no pudo cargarse"
          message="Revisa la conexión y vuelve a intentarlo."
          onRetry={() => void refetch()}
        />
      ) : (
        <>
          {/* Tarjeta de Constancia */}
          <View style={styles.summary}>
            <View style={styles.summaryHeader}>
              <View style={styles.summaryTitleRow}>
                <CalendarDays size={19} color={colors.mint} />
                <Text style={styles.summaryOverline}>TU CONSTANCIA</Text>
              </View>
              {currentStreak > 0 && (
                <View style={styles.streakPill}>
                  <Flame size={13} color="#FB923C" fill="#FB923C" />
                  <Text style={styles.streakPillText}>
                    {currentStreak}{" "}
                    {currentStreak === 1 ? "día seguido" : "días seguidos"}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.summaryMetrics}>
              <View style={styles.summaryMetric}>
                <Text style={styles.summaryNumber}>
                  {loggedDays}
                  <Text style={styles.summaryDenominator}> / {period}</Text>
                </Text>
                <Text style={styles.summaryLabel}>días con registros</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryMetric}>
                <Text style={styles.summaryNumber}>{data?.totalMeals || 0}</Text>
                <Text style={styles.summaryLabel}>comidas guardadas</Text>
              </View>
            </View>
            <View style={styles.consistencyTrack}>
              <View
                style={[
                  styles.consistencyFill,
                  { width: `${Math.min(100, (loggedDays / period) * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.summaryNote}>
              {loggedDays
                ? "Cada comida registrada te ayuda a entender mejor tu rutina."
                : "Empieza con una comida. Tu progreso se construye día a día."}
            </Text>
          </View>

          {/* Seguimiento Corporal con Curva SVG, IMC y Progreso hacia Meta */}
          <WeightTrendCard
            stats={weightStats}
            heightCm={profile?.height_cm}
            onLogWeight={logWeight}
            onUpdateTarget={updateTargetWeight}
            isSaving={isLoggingWeight}
          />

          {/* Tendencias Nutricionales */}
          {loggedDays === 0 ? (
            <View style={styles.empty}>
              <StateCard
                title="Tu historia empieza con una comida"
                message="Aquí aparecerán tus tendencias cuando guardes alimentos en este periodo."
              />
              <AppButton
                title="Añadir alimentos"
                onPress={() => router.push("/(tabs)/record")}
                icon={<Plus size={18} color="white" />}
              />
            </View>
          ) : (
            <View style={styles.chartCard}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.chartOverline}>ANÁLISIS DEL PERIODO</Text>
                  <Text accessibilityRole="header" style={styles.sectionTitle}>
                    Tus tendencias
                  </Text>
                </View>
                <View style={styles.chartHeaderIcon}>
                  <TrendingUp size={18} color={colors.primary} />
                </View>
              </View>

              <View style={styles.metricRow}>
                {metrics.map((item) => (
                  <Pressable
                    key={item.key}
                    accessibilityRole="button"
                    accessibilityLabel={"Ver tendencia de " + item.label}
                    accessibilityState={{ selected: metric === item.key }}
                    onPress={() => setMetric(item.key)}
                    aria-pressed={metric === item.key}
                    style={[
                      styles.metricChip,
                      metric === item.key && {
                        backgroundColor: item.color,
                        borderColor: item.color,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.chipDot,
                        {
                          backgroundColor:
                            metric === item.key ? "#FFFFFF" : item.color,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.metricText,
                        metric === item.key && { color: "#FFFFFF", fontWeight: "800" },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <WeeklyMacroChart
                days={data?.days || []}
                metric={metric}
                target={targets?.[metric]}
                color={activeMetric.color}
                unit={activeMetric.unit}
                selectedDate={selected?.date || getDateKey()}
                onSelectDay={(day) => setSelectedDate(day.date)}
              />

              {/* Panel enriquecido del Día Seleccionado */}
              {selected && (
                <View style={styles.selectedDay}>
                  <View style={styles.selectedHeaderRow}>
                    <View style={styles.selectedCopy}>
                      <Text style={styles.selectedOverline}>DÍA SELECCIONADO</Text>
                      <Text style={styles.dayTitle}>
                        {selected.date === getDateKey()
                          ? "Hoy"
                          : selected.dayLabel + ", " + formatDate(selected.date)}
                      </Text>
                      <Text style={styles.selectedMeta}>
                        {selected.mealCount
                          ? `${selected.mealCount} ${
                              selected.mealCount === 1 ? "comida registrada" : "comidas registradas"
                            }`
                          : "Sin comidas registradas este día"}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={"Abrir día " + selected.date}
                      onPress={() => openDay(selected.date)}
                      style={styles.openButton}
                    >
                      <Text style={styles.link}>Ver día</Text>
                      <ArrowUpRight size={16} color={colors.primary} />
                    </Pressable>
                  </View>

                  {selected.mealCount > 0 && (
                    <View style={styles.selectedMacrosGrid}>
                      {metrics.map((m) => {
                        const val = Math.round(selected[m.key]);
                        const goal = targets?.[m.key];
                        const pct = goal && goal > 0 ? Math.round((val / goal) * 100) : null;
                        const active = m.key === metric;
                        return (
                          <View
                            key={m.key}
                            style={[
                              styles.selectedMacroCell,
                              active && { borderColor: m.color },
                            ]}
                          >
                            <View style={styles.selectedMacroTop}>
                              <View style={[styles.dotSmall, { backgroundColor: m.color }]} />
                              <Text style={styles.selectedMacroLabel}>{m.shortLabel}</Text>
                              {pct !== null && (
                                <Text style={[styles.selectedMacroPct, { color: m.color }]}>
                                  {pct}%
                                </Text>
                              )}
                            </View>
                            <Text style={styles.selectedMacroVal}>
                              {val.toLocaleString("es-CL")}{" "}
                              <Text style={styles.selectedMacroUnit}>{m.unit}</Text>
                            </Text>
                            {pct !== null && (
                              <View style={styles.miniTrack}>
                                <View
                                  style={[
                                    styles.miniFill,
                                    {
                                      width: `${Math.min(100, pct)}%`,
                                      backgroundColor: m.color,
                                    },
                                  ]}
                                />
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Distribución Calórica de Macronutrientes */}
          {energySplit.hasData && (
            <View style={styles.splitCard}>
              <View style={styles.splitHeader}>
                <View style={styles.splitTitleRow}>
                  <PieChart size={16} color={colors.primary} />
                  <Text style={styles.splitTitle}>Balance calórico de tus macros</Text>
                </View>
                <Text style={styles.splitHint}>Promedio {period}d</Text>
              </View>
              <View style={styles.splitBar}>
                <View
                  style={[
                    styles.splitSegment,
                    {
                      width: `${energySplit.proteinPct}%`,
                      backgroundColor: colors.protein,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.splitSegment,
                    {
                      width: `${energySplit.carbsPct}%`,
                      backgroundColor: colors.carbs,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.splitSegment,
                    {
                      width: `${energySplit.fatPct}%`,
                      backgroundColor: colors.fat,
                    },
                  ]}
                />
              </View>
              <View style={styles.splitLegendRow}>
                <View style={styles.splitLegendItem}>
                  <View style={[styles.dot, { backgroundColor: colors.protein }]} />
                  <Text style={styles.splitLegendText}>
                    Proteína <Text style={styles.splitLegendBold}>{energySplit.proteinPct}%</Text>
                  </Text>
                </View>
                <View style={styles.splitLegendItem}>
                  <View style={[styles.dot, { backgroundColor: colors.carbs }]} />
                  <Text style={styles.splitLegendText}>
                    Carbos <Text style={styles.splitLegendBold}>{energySplit.carbsPct}%</Text>
                  </Text>
                </View>
                <View style={styles.splitLegendItem}>
                  <View style={[styles.dot, { backgroundColor: colors.fat }]} />
                  <Text style={styles.splitLegendText}>
                    Grasas <Text style={styles.splitLegendBold}>{energySplit.fatPct}%</Text>
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Promedios Diarios con barra de cumplimiento vs Meta */}
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Tu promedio diario
          </Text>
          <Text style={styles.sectionDescription}>
            {loggedDays
              ? `Solo considera ${
                  loggedDays === 1
                    ? "el día con comidas"
                    : "los " + loggedDays + " días con comidas"
                }; comparado con tu meta diaria.`
              : "Aún no hay datos para calcular promedios."}
          </Text>
          <View style={styles.averageGrid}>
            {metrics.map((item) => {
              const avg = loggedDays ? data?.averages[item.key] ?? 0 : null;
              const goal = targets?.[item.key];
              const pct =
                avg !== null && goal && goal > 0
                  ? Math.round((avg / goal) * 100)
                  : null;
              return (
                <View style={styles.averageCard} key={item.key}>
                  <View style={styles.averageHeading}>
                    <View style={[styles.dot, { backgroundColor: item.color }]} />
                    <Text style={styles.averageLabel}>{item.label}</Text>
                    {pct !== null && (
                      <Text style={[styles.averagePct, { color: item.color }]}>
                        {pct}%
                      </Text>
                    )}
                  </View>
                  <Text style={styles.averageValue}>
                    {avg !== null ? avg.toLocaleString("es-CL") : "—"}{" "}
                    <Text style={styles.averageUnit}>{item.unit}</Text>
                  </Text>
                  {goal && goal > 0 && (
                    <>
                      <View style={styles.avgTrack}>
                        <View
                          style={[
                            styles.avgFill,
                            {
                              width: `${Math.min(100, pct ?? 0)}%`,
                              backgroundColor: item.color,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.avgGoalHint}>
                        Meta: {Math.round(goal).toLocaleString("es-CL")} {item.unit}
                      </Text>
                    </>
                  )}
                </View>
              );
            })}
          </View>

          <View style={styles.sectionHeader}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              Día a día
            </Text>
            <Text style={styles.muted}>Más recientes primero</Text>
          </View>
          <View style={styles.daysCard}>
            {visibleDays.map((day, index) => (
              <Pressable
                key={day.date}
                accessibilityRole="button"
                accessibilityLabel={"Ver registros del " + day.date}
                onPress={() => openDay(day.date)}
                style={({ pressed }) => [
                  styles.dayRow,
                  index > 0 && styles.dayBorder,
                  pressed && { backgroundColor: colors.primaryLight },
                ]}
              >
                <View
                  style={[
                    styles.dateBadge,
                    day.date === getDateKey() && {
                      backgroundColor: colors.primaryLight,
                    },
                  ]}
                >
                  <Text style={styles.dayLabel}>{day.dayLabel}</Text>
                  <Text style={styles.dayNumber}>{Number(day.date.slice(8))}</Text>
                </View>
                <View style={styles.dayInfo}>
                  <Text style={styles.dayTitle}>
                    {day.date === getDateKey() ? "Hoy" : formatDate(day.date)}
                  </Text>
                  <Text style={styles.dayDetail}>
                    {day.mealCount
                      ? day.mealCount +
                        (day.mealCount === 1 ? " comida" : " comidas") +
                        " · " +
                        Math.round(day.protein) +
                        " g proteína"
                      : "Sin registros"}
                  </Text>
                </View>
                <Text style={styles.dayCalories}>
                  {day.mealCount ? Math.round(day.calories).toLocaleString("es-CL") : "—"}
                  <Text style={styles.averageUnit}> kcal</Text>
                </Text>
                <ArrowUpRight size={16} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
          {period > 7 && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowAllDays((value) => !value)}
              style={styles.moreButton}
            >
              <Text style={styles.link}>
                {showAllDays ? "Mostrar menos días" : "Ver los 30 días"}
              </Text>
            </Pressable>
          )}

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
  periodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 20,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  periodButton: {
    minHeight: 42,
    paddingHorizontal: 22,
    justifyContent: "center",
    borderRadius: 11,
  },
  periodActive: { backgroundColor: colors.card, ...shadows.sm },
  periodText: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  periodTextActive: { color: colors.primaryDark, fontWeight: "800" },
  periodDate: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
  summary: {
    backgroundColor: colors.forest,
    borderRadius: 24,
    padding: 24,
    marginBottom: 22,
    ...shadows.card,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 8,
  },
  summaryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  streakPillText: {
    color: "#FED7AA",
    fontSize: 11,
    fontWeight: "700",
  },
  summaryOverline: {
    color: "#CEE1D6",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.3,
  },
  summaryMetrics: { flexDirection: "row", alignItems: "center", gap: 24 },
  summaryMetric: { flex: 1 },
  summaryNumber: {
    color: "white",
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1,
  },
  summaryDenominator: { fontSize: 18, color: "#BDDAC8", fontWeight: "400" },
  summaryLabel: { fontSize: 12, color: "#CEE1D6", marginTop: 6 },
  summaryDivider: { width: 1, height: 44, backgroundColor: "#426456" },
  consistencyTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#426456",
    marginTop: 22,
    overflow: "hidden",
  },
  consistencyFill: { height: "100%", backgroundColor: colors.mint, borderRadius: 3 },
  summaryNote: { color: "#CEE1D6", fontSize: 11, lineHeight: 17, marginTop: 12 },
  empty: { marginBottom: 24 },
  chartCard: {
    backgroundColor: colors.card,
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 22,
    ...shadows.card,
  },
  chartOverline: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 1,
    marginBottom: 2,
  },
  chartHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  sectionDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
  },
  metricRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  metricChip: {
    minHeight: 38,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chipDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  metricText: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
  selectedDay: {
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    marginTop: 16,
    paddingTop: 16,
    gap: 12,
  },
  selectedHeaderRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  selectedOverline: {
    fontSize: 9.5,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  selectedCopy: { flex: 1, minWidth: 150 },
  selectedMeta: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  openButton: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
  },
  link: { color: colors.primaryDark, fontSize: 12.5, fontWeight: "800" },
  selectedMacrosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectedMacroCell: {
    flexGrow: 1,
    flexBasis: "46%",
    minWidth: 120,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 4,
  },
  selectedMacroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  selectedMacroLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
    flex: 1,
  },
  selectedMacroPct: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  selectedMacroVal: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
  },
  selectedMacroUnit: {
    fontSize: 10.5,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  miniTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.card,
    overflow: "hidden",
    marginTop: 2,
  },
  miniFill: {
    height: "100%",
    borderRadius: 2,
  },
  splitCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 22,
    gap: 12,
    ...shadows.card,
  },
  splitHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  splitTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  splitTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  splitHint: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  splitBar: {
    flexDirection: "row",
    height: 10,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: colors.surfaceMuted,
    gap: 2,
  },
  splitSegment: {
    height: "100%",
    borderRadius: 4,
  },
  splitLegendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  splitLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  splitLegendText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  splitLegendBold: {
    fontWeight: "800",
    color: colors.text,
  },
  averageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 26 },
  averageCard: {
    flexGrow: 1,
    flexBasis: "45%",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 18,
    padding: 16,
    minWidth: 0,
    ...shadows.sm,
  },
  averageHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  averageLabel: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, flex: 1 },
  averagePct: { fontSize: 11, fontWeight: "800" },
  averageValue: {
    fontSize: 25,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  averageUnit: { fontSize: 11, fontWeight: "500", color: colors.textSecondary },
  avgTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden",
    marginTop: 10,
  },
  avgFill: {
    height: "100%",
    borderRadius: 3,
  },
  avgGoalHint: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 5,
    fontWeight: "600",
  },
  daysCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: "hidden",
  },
  dayRow: { minHeight: 80, flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  dayBorder: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
  dateBadge: {
    width: 42,
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  dayLabel: { fontSize: 10, color: colors.textSecondary },
  dayNumber: { fontSize: 19, fontWeight: "700", color: colors.text },
  dayInfo: { flex: 1, minWidth: 0 },
  dayTitle: { fontSize: 13.5, fontWeight: "700", color: colors.text, marginBottom: 3 },
  dayDetail: { fontSize: 11, lineHeight: 16, color: colors.textSecondary },
  dayCalories: { fontSize: 17, fontWeight: "700", color: colors.text },
  moreButton: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 8 },
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
  exportTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 5 },
});
