import { useMealReviewStore } from "@/stores/useMealReviewStore";
import { useQuickLogStore } from "@/stores/useQuickLogStore";
import { usePersonalPlan } from "@/hooks/usePersonalPlan";
import {
  getDateKey,
  dateForMealRoute,
  loggedAtForDate,
  APP_TIME_ZONE,
} from "@/utils/dates";
import { showAlert } from "@/utils/alerts";
import React, { useState, useEffect, useMemo, Suspense, lazy } from "react";
import { adjustGoalsForActivity } from "@/utils/nutritionCalculator";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ChefHat,
  Camera,
  Mic,
  Barcode,
  Star,
  Target,
  HelpCircle,
  Plus,
  ArrowUpRight,
} from "lucide-react-native";
import { useDailyNutrition } from "@/hooks/useDailyNutrition";
import { useWaterTracker } from "@/hooks/useWaterTracker";
import { useActivitySync } from "@/hooks/useActivitySync";
import { useAdaptiveReminders } from "@/hooks/useAdaptiveReminders";
import { DailySummary } from "@/components/dashboard/DailySummary";
import { DayStrip } from "@/components/dashboard/DayStrip";
import { MealCard } from "@/components/dashboard/MealCard";
import { WaterCard } from "@/components/dashboard/WaterCard";
import { StreakBadge } from "@/components/dashboard/StreakBadge";
import { SmartCoachCard } from "@/components/dashboard/SmartCoachCard";
import { OfflineBanner } from "@/components/common/OfflineBanner";
import { useAuthStore } from "@/stores/useAuthStore";
import { StateCard } from "@/components/common/AppUI";
import { colors, shadows, layout } from "@/constants/colors";

const ActivityModal = lazy(() =>
  import("@/components/dashboard/ActivityModal").then((m) => ({ default: m.ActivityModal }))
);
const TextVoiceModal = lazy(() =>
  import("@/components/meal/TextVoiceModal").then((m) => ({ default: m.TextVoiceModal }))
);
const FavoritesModal = lazy(() =>
  import("@/components/meal/FavoritesModal").then((m) => ({ default: m.FavoritesModal }))
);
const MasterPlanModal = lazy(() =>
  import("@/components/dashboard/MasterPlanModal").then((m) => ({ default: m.MasterPlanModal }))
);
const StreakModal = lazy(() =>
  import("@/components/dashboard/StreakModal").then((m) => ({ default: m.StreakModal }))
);
const AppGuideModal = lazy(() =>
  import("@/components/dashboard/AppGuideModal").then((m) => ({ default: m.AppGuideModal }))
);
import { MealType } from "@/types/meal";

export default function DashboardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  const compact = width < 380;
  const profile = useAuthStore((state) => state.profile);
  const { data: personalPlan } = usePersonalPlan();
  const beginMeal = () => {
    useMealReviewStore.getState().reset();
    useMealReviewStore.getState().setLoggedAt(loggedAtForDate(selectedDate));
  };
  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    dateForMealRoute(params.date),
  );
  useEffect(() => {
    if (params.date) setSelectedDate(dateForMealRoute(params.date));
  }, [params.date]);
  const { showTextVoice, showFavorites, closeTextVoice, closeFavorites } =
    useQuickLogStore();
  const [showTextVoiceModal, setShowTextVoiceModal] = useState(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showMasterPlanModal, setShowMasterPlanModal] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showDays, setShowDays] = useState(false);
  const [activeMealType, setActiveMealType] = useState<MealType>("almuerzo");

  const { data, error, isLoading, isRefetching, refetch } =
    useDailyNutrition(selectedDate);
  const {
    totalMl,
    targetMl,
    addWater,
    isAdding,
    removeWater,
    isRemoving,
    canRemoveWater,
  } = useWaterTracker(selectedDate);
  const { burnedCalories, steps, logActivity } = useActivitySync(selectedDate);
  useAdaptiveReminders();

  const adjustedGoals = useMemo(() => {
    return adjustGoalsForActivity(
      {
        calories: data?.goal.calories ?? 2000,
        proteinG: data?.goal.protein_g ?? 140,
        carbsG: data?.goal.carbs_g ?? 220,
        fatG: data?.goal.fat_g ?? 65,
      },
      burnedCalories
    );
  }, [data?.goal, burnedCalories]);

  const isToday = getDateKey(selectedDate) === getDateKey(new Date());

  const changeDay = (delta: number) => {
    setSelectedDate((current) => {
      const nextDate = new Date(current);
      nextDate.setDate(nextDate.getDate() + delta);
      return getDateKey(nextDate) > getDateKey(new Date()) ? new Date() : nextDate;
    });
  };

  const handleAddMeal = (mealType: MealType) => {
    beginMeal();
    setActiveMealType(mealType);
    router.push({
      pathname: "/(tabs)/record",
      params: { mealType, date: getDateKey(selectedDate) },
    });
  };

  const handleSuggestMeal = (mealType: MealType) => {
    const mealLabel =
      mealType === "desayuno"
        ? "Desayuno"
        : mealType === "almuerzo"
        ? "Almuerzo"
        : mealType === "cena"
        ? "Once / Cena"
        : "Colación";
    const remainingCal = Math.max(
      0,
      adjustedGoals.calories - (data?.consumed.calories || 0)
    );
    const remainingProt = Math.max(
      0,
      adjustedGoals.proteinG - (data?.consumed.protein || 0)
    );
    const calText = Math.round(remainingCal).toLocaleString("es-CL");
    const protText = Math.round(remainingProt).toLocaleString("es-CL");

    router.push({
      pathname: "/coach",
      params: {
        initialPrompt: `Hola Coach, sugiéreme 2 opciones rápidas de ${mealLabel}. Me quedan ${calText} kcal disponibles y ${protText} g de proteína por cubrir hoy.`,
      },
    });
  };

  const distinctMoments = useMemo(() => {
    return new Set((data?.meals || []).map((m) => m.meal_type)).size;
  }, [data?.meals]);

  const totalFoodsCount = useMemo(() => {
    return (data?.meals || []).reduce(
      (acc, m) => acc + (m.items?.length || 0),
      0
    );
  }, [data?.meals]);

  const formattedDate = selectedDate.toLocaleDateString("es-CL", {
    timeZone: APP_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <>
      <OfflineBanner />
      <ScrollView
        testID="dashboard-scroll"
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
        {/* Encabezado con Saludo, Guía y Racha */}
        <View style={styles.topHeader}>
          <View style={styles.greetingWrap}>
            <Text style={styles.greetingEyebrow}>TU DIARIO PERSONAL</Text>
            <Text accessibilityRole="header" style={styles.greetingTitle}>
              {profile?.full_name
                ? `Hola, ${profile.full_name.split(" ")[0]}`
                : "Tu espacio de bienestar"}
            </Text>
            <Text style={styles.greetingSubtitle}>
              Un día a la vez, a tu ritmo.
            </Text>
            {personalPlan && (
              <TouchableOpacity
                onPress={() => setShowMasterPlanModal(true)}
                activeOpacity={0.7}
                style={styles.headerPlanPill}
                accessibilityRole="button"
                accessibilityLabel={`Plan Maestro activo: ${personalPlan.user.objectiveTitle}`}
              >
                <View style={styles.headerPlanDot} />
                <Target size={13} color={colors.primaryDark} />
                <Text style={styles.headerPlanPillText} numberOfLines={1}>
                  {personalPlan.user.objectiveTitle}
                </Text>
                <ChevronRight size={13} color={colors.primaryDark} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={styles.helpGuideBtn}
              onPress={() => setShowGuideModal(true)}
              activeOpacity={0.8}
              accessibilityLabel="¿Cómo funciona la app?"
              accessibilityRole="button"
            >
              <HelpCircle size={18} color={colors.primary} />
            </TouchableOpacity>
            <StreakBadge onPress={() => setShowStreakModal(true)} />
          </View>
        </View>

        {/* Navegador de Fecha */}
        <View style={styles.dateSelector}>
          <View style={styles.dateRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Día anterior"
              style={styles.dateArrow}
              onPress={() => changeDay(-1)}
            >
              <ChevronLeft size={18} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.dateCenter}>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Elegir fecha del diario"
                accessibilityState={{ expanded: showDays }} aria-expanded={showDays}
                onPress={() => setShowDays((value) => !value)} style={styles.datePickerButton}>
                <CalendarDays size={16} color={colors.primary} />
                <View style={styles.dateCopy}>
                  <Text style={styles.dateTitle}>
                    {isToday ? `Hoy, ${selectedDate.toLocaleDateString("es-CL", { timeZone: APP_TIME_ZONE, day: "numeric", month: "short" })}` : formattedDate}
                  </Text>
                </View>
                {showDays ? <ChevronUp size={15} color={colors.textSecondary} /> : <ChevronDown size={15} color={colors.textSecondary} />}
              </TouchableOpacity>
              {!isToday && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Volver a hoy"
                  onPress={() => setSelectedDate(new Date())}
                >
                  <Text style={styles.todayLink}>Volver a hoy</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Día siguiente"
              style={[styles.dateArrow, isToday && styles.dateArrowDisabled]}
              onPress={() => !isToday && changeDay(1)}
              disabled={isToday}
            >
              <ChevronRight
                size={18}
                color={isToday ? colors.textMuted : colors.text}
              />
            </TouchableOpacity>
          </View>
          {showDays && <DayStrip date={selectedDate} onSelect={setSelectedDate} />}
        </View>

        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loaderText}>Cargando tu progreso...</Text>
          </View>
        ) : error ? (
          <StateCard
            title="No pudimos cargar tu día"
            message="Revisa tu conexión e inténtalo de nuevo. Tus registros guardados siguen en tu cuenta."
            onRetry={() => void refetch()}
          />
        ) : (
          <>
            {/* Resumen Diario: Calorías y Macronutrientes primero */}
            <DailySummary
              calorieGoal={data?.goal.calories ?? 2000}
              calories={data?.consumed.calories ?? 0}
              protein={data?.consumed.protein ?? 0}
              proteinGoal={data?.goal.protein_g ?? 140}
              carbs={data?.consumed.carbs ?? 0}
              carbsGoal={data?.goal.carbs_g ?? 220}
              fat={data?.consumed.fat ?? 0}
              fatGoal={data?.goal.fat_g ?? 65}
              burnedCalories={burnedCalories}
              onExercisePress={() => setShowActivityModal(true)}
            />

            {/* Widget de Hidratación compacto con acción de deshacer */}
            <WaterCard
              totalMl={totalMl}
              targetMl={targetMl}
              onAddWater={async (ml) => {
                try {
                  await addWater(ml);
                } catch {
                  showAlert(
                    "Agua",
                    "No se pudo guardar. Revisa la conexión.",
                  );
                }
              }}
              onRemoveWater={async () => {
                try {
                  await removeWater(250);
                } catch {
                  showAlert(
                    "Agua",
                    "No se pudo actualizar el registro.",
                  );
                }
              }}
              canRemoveWater={canRemoveWater}
              loading={isAdding || isRemoving}
            />
            {/* Comidas del Día */}
            <View style={styles.mealsHeading}>
              <View>
                <Text accessibilityRole="header" style={styles.mealsHeaderTitle}>
                  Tus comidas
                </Text>
                <Text style={styles.mealsDescription}>
                  {distinctMoments > 0
                    ? `${distinctMoments} de 4 momentos · ${totalFoodsCount} ${totalFoodsCount === 1 ? "alimento" : "alimentos"}`
                    : "Sin registros aún en este día"}
                </Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Ver tendencias de alimentación"
                onPress={() => router.push("/(tabs)/history")}
                style={styles.progressLink}
              >
                <Text style={styles.progressLinkText}>Ver progreso</Text>
                <ArrowUpRight size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.mealGrid}>
              {(["desayuno", "almuerzo", "cena", "snack"] as MealType[]).map(
                (type) => (
                  <View
                    key={type}
                    style={[
                      styles.mealGridItem,
                      wide && styles.mealGridItemWide,
                    ]}
                  >
                    <MealCard
                      mealType={type}
                      meals={data?.meals || []}
                      onAddPress={handleAddMeal}
                      onSuggestMeal={handleSuggestMeal}
                    />
                  </View>
                ),
              )}
            </View>

            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Añadir comida a este día" activeOpacity={0.85}
              onPress={() => handleAddMeal("almuerzo")} style={styles.addMealAction}>
              <View style={styles.addMealIcon}><Plus size={21} color="white" /></View>
              <View style={styles.addMealCopy}><Text style={styles.addMealTitle}>Añadir comida</Text><Text style={styles.addMealDescription}>Busca, escribe o fotografía tu plato</Text></View>
              <ArrowUpRight size={21} color={colors.primary} />
            </TouchableOpacity>
            <View style={[styles.summaryLayout, wide && styles.summaryWide]}>
              <View style={styles.summaryMain}>
                {/* Barra de atajos de registro rápido */}
                <View style={styles.quickActionsBar}>
                  <TouchableOpacity
                    style={styles.quickActionBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Registrar con foto"
                    onPress={() => {
                      beginMeal();
                      router.push("/meal/camera");
                    }}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.quickActionIconWrap,
                        { backgroundColor: colors.primaryLight },
                      ]}
                    >
                      <Camera size={18} color={colors.primary} />
                    </View>
                    <Text style={styles.quickActionText}>Foto IA</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickActionBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Registrar con texto o voz"
                    onPress={() => {
                      beginMeal();
                      setShowTextVoiceModal(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.quickActionIconWrap,
                        { backgroundColor: "#EEF2FF" },
                      ]}
                    >
                      <Mic size={18} color="#6366F1" />
                    </View>
                    <Text style={styles.quickActionText}>Texto/Voz</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickActionBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Registrar con código de barras"
                    onPress={() => {
                      beginMeal();
                      router.push("/meal/barcode");
                    }}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.quickActionIconWrap,
                        { backgroundColor: "#F0F9FF" },
                      ]}
                    >
                      <Barcode size={18} color="#0EA5E9" />
                    </View>
                    <Text style={styles.quickActionText}>Código</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickActionBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Registrar comida frecuente"
                    onPress={() => {
                      beginMeal();
                      setShowFavoritesModal(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.quickActionIconWrap,
                        { backgroundColor: "#FEF3C7" },
                      ]}
                    >
                      <Star size={18} color="#F59E0B" />
                    </View>
                    <Text style={styles.quickActionText}>Frecuentes</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View
                style={[styles.summarySide, wide && styles.summarySideWide]}
              >
                {isToday && (
                  <>
                    {/* Smart Coach Proactivo (Fase 3) */}
                    <SmartCoachCard
                      consumedCalories={data?.consumed.calories || 0}
                      goalCalories={adjustedGoals.calories}
                      remainingCalories={Math.max(0, adjustedGoals.calories - (data?.consumed.calories || 0))}
                      consumedProtein={data?.consumed.protein || 0}
                      goalProtein={adjustedGoals.proteinG}
                      remainingProtein={Math.max(0, adjustedGoals.proteinG - (data?.consumed.protein || 0))}
                      waterMl={totalMl}
                      targetWaterMl={targetMl}
                      mealCount={data?.meals.length || 0}
                      onAskCoach={(prompt) => {
                        router.push({
                          pathname: "/coach",
                          params: { initialPrompt: prompt },
                        });
                      }}
                    />
                  </>
                )}
                {/* Banner Destacado: Coach Nutricional IA y Recetas (Fase 3) */}
                <View style={[styles.assistantBannersRow, (compact || wide) && styles.assistantBannersStack]}>
                  <TouchableOpacity
                    style={styles.coachBanner}
                    accessibilityRole="button"
                    accessibilityLabel="Hablar con el coach"
                    onPress={() => router.push("/coach")}
                    activeOpacity={0.85}
                  >
                    <View style={styles.bannerIconBadge}>
                      <Sparkles size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.coachBannerTitle}>Coach IA</Text>
                      <Text style={styles.coachBannerDesc}>
                        ¿Qué comer hoy?
                      </Text>
                    </View>
                    <ChevronRight size={16} color={colors.textMuted} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.recipesBanner}
                    accessibilityRole="button"
                    accessibilityLabel="Explorar recetas"
                    onPress={() => router.push("/recipes")}
                    activeOpacity={0.85}
                  >
                    <View
                      style={[
                        styles.bannerIconBadge,
                        { backgroundColor: "#FEF3C7" },
                      ]}
                    >
                      <ChefHat size={18} color="#D97706" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recipesBannerTitle}>Recetas</Text>
                      <Text style={styles.recipesBannerDesc}>
                        Chilenas fitness
                      </Text>
                    </View>
                    <ChevronRight size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Banner Mi Plan Maestro */}
                {personalPlan && (
                  <TouchableOpacity
                    style={styles.masterPlanBanner}
                    onPress={() => setShowMasterPlanModal(true)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.masterPlanBadge}>
                      <Target size={18} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Text style={styles.masterPlanTitle}>
                          Mi Plan Maestro
                        </Text>
                        <View style={styles.masterPlanPill}>
                          <Text style={styles.masterPlanPillText}>Activo</Text>
                        </View>
                      </View>
                      <Text style={styles.masterPlanSubtitle}>
                        {personalPlan.user.objectiveTitle}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.bottomSpacer} />
          </>
        )}
      </ScrollView>

      <Suspense fallback={null}>
        {/* Modal de Texto / Voz */}
        {(showTextVoiceModal || showTextVoice) && (
          <TextVoiceModal
            visible={showTextVoiceModal || showTextVoice}
            mealType={activeMealType}
            onClose={() => {
              setShowTextVoiceModal(false);
              closeTextVoice();
            }}
          />
        )}

        {/* Modal de Comidas Frecuentes */}
        {(showFavoritesModal || showFavorites) && (
          <FavoritesModal
            visible={showFavoritesModal || showFavorites}
            onClose={() => {
              setShowFavoritesModal(false);
              closeFavorites();
            }}
          />
        )}

        {/* Modal de Actividad Física y Apple Health */}
        {showActivityModal && (
          <ActivityModal
            visible={showActivityModal}
            currentBurned={burnedCalories}
            currentSteps={steps}
            onClose={() => setShowActivityModal(false)}
            onSave={async (cal, st) => {
              await logActivity({ calories: cal, steps: st });
            }}
          />
        )}

        {/* Modal de Mi Plan Maestro */}
        {showMasterPlanModal && (
          <MasterPlanModal
            visible={showMasterPlanModal}
            onClose={() => setShowMasterPlanModal(false)}
          />
        )}

        {/* Modal de Racha de Hábitos (Fase 3) */}
        {showStreakModal && (
          <StreakModal
            visible={showStreakModal}
            onClose={() => setShowStreakModal(false)}
            onLogMealPress={() => {
              beginMeal();
              router.push({
                pathname: "/meal/camera",
                params: { suggestedMealType: "almuerzo" },
              });
            }}
          />
        )}

        {/* Modal de Guía de la App y Explicación de Botones */}
        {showGuideModal && (
          <AppGuideModal
            visible={showGuideModal}
            onClose={() => setShowGuideModal(false)}
          />
        )}
      </Suspense>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: { ...layout.page, maxWidth: 820, alignSelf: "center" },
  summaryLayout: { gap: 0 },
  summaryWide: { flexDirection: "row", gap: 24, alignItems: "flex-start" },
  summaryMain: { flex: 1, minWidth: 0, width: "100%" },
  summarySide: { width: "100%" },
  summarySideWide: { width: 300 },
  mealGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  mealGridItem: { width: "100%", minWidth: 0 },
  mealGridItemWide: { width: "48%" },
  todayLink: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "600",
    minHeight: 44,
    paddingVertical: 12,
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    marginTop: 4,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  helpGuideBtn: {
    width: 44,
    height: 44,
    borderRadius: 17,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  greetingWrap: {
    flex: 1,
    marginRight: 10,
  },
  greetingEyebrow: { fontSize: 9, letterSpacing: 1.6, fontWeight: "700", color: colors.primary, marginBottom: 7 },
  greetingTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  greetingSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: "500",
  },
  headerPlanPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  headerPlanDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  headerPlanPillText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: colors.primaryDark,
    maxWidth: 240,
  },
  dateSelector: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.card,
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
  },
  dateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  addMealAction: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: colors.primaryLight, borderRadius: 18, marginBottom: 20, borderWidth: 1, borderColor: "#D3EADB" },
  addMealIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  addMealCopy: { flex: 1, minWidth: 0 },
  addMealTitle: { color: colors.primaryDark, fontSize: 15, fontWeight: "800" },
  addMealDescription: { color: colors.textSecondary, fontSize: 11, lineHeight: 17, marginTop: 3 },
  mealsHeading: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 4, marginBottom: 18 },
  mealsDescription: { color: colors.textSecondary, fontSize: 12, marginTop: 5 },
  progressLink: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, borderRadius: 14, backgroundColor: colors.primaryLight },
  progressLinkText: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  dateArrow: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  dateArrowDisabled: {
    opacity: 0.3,
  },
  dateArrowText: {
    fontSize: 20,
    color: colors.text,
    lineHeight: 22,
    fontWeight: "600",
  },
  dateArrowTextDisabled: {
    color: colors.textMuted,
  },
  dateCenter: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  dateTitle: {
    textAlign: "center",
    fontSize: 14.5,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
  },
  datePickerButton: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 7, maxWidth: "100%" },
  dateCopy: { flexShrink: 1 },
  dateSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
    textTransform: "capitalize",
    fontWeight: "600",
  },
  assistantBannersRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  assistantBannersStack: {
    flexDirection: "column",
  },
  coachBanner: {
    flex: 1,
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.card,
  },
  bannerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  coachBannerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.2,
  },
  coachBannerDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
    fontWeight: "500",
  },
  recipesBanner: {
    flex: 1,
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.card,
  },
  recipesBannerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.2,
  },
  recipesBannerDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
    fontWeight: "500",
  },
  masterPlanBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.card,
    marginBottom: 14,
    gap: 12,
  },
  masterPlanBadge: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  masterPlanTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  masterPlanPill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  masterPlanPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  masterPlanSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: "500",
  },
  quickActionsBar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  quickActionBtn: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.card,
  },
  quickActionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.1,
  },
  loaderContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  loaderText: {
    marginTop: 12,
    fontSize: 13,
    color: colors.textSecondary,
  },
  mealsHeaderTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  bottomSpacer: {
    height: 40,
  },
});
