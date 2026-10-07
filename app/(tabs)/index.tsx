import { useMealReviewStore } from "@/stores/useMealReviewStore";
import { useQuickLogStore } from "@/stores/useQuickLogStore";
import { usePersonalPlan } from "@/hooks/usePersonalPlan";
import { getDateKey, loggedAtForDate, APP_TIME_ZONE } from "@/utils/dates";
import { showAlert } from "@/utils/alerts";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ChefHat,
  Camera,
  Mic,
  Barcode,
  Star,
  Target,
  HelpCircle,
} from "lucide-react-native";
import { useDailyNutrition } from "@/hooks/useDailyNutrition";
import { useWaterTracker } from "@/hooks/useWaterTracker";
import { useActivitySync } from "@/hooks/useActivitySync";
import { CalorieHero } from "@/components/dashboard/CalorieHero";
import { MacroProgressBar } from "@/components/dashboard/MacroProgressBar";
import { MealCard } from "@/components/dashboard/MealCard";
import { WaterCard } from "@/components/dashboard/WaterCard";
import { ActivityModal } from "@/components/dashboard/ActivityModal";
import { TextVoiceModal } from "@/components/meal/TextVoiceModal";
import { FavoritesModal } from "@/components/meal/FavoritesModal";
import { MasterPlanModal } from "@/components/dashboard/MasterPlanModal";
import { StreakBadge } from "@/components/dashboard/StreakBadge";
import { StreakModal } from "@/components/dashboard/StreakModal";
import { SmartCoachCard } from "@/components/dashboard/SmartCoachCard";
import { AppGuideModal } from "@/components/dashboard/AppGuideModal";
import { OfflineBanner } from "@/components/common/OfflineBanner";
import { useAuthStore } from "@/stores/useAuthStore";
import { colors } from "@/constants/colors";
import { MealType } from "@/types/meal";

export default function DashboardScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { data: personalPlan } = usePersonalPlan();
  const beginMeal = () => { useMealReviewStore.getState().reset(); useMealReviewStore.getState().setLoggedAt(loggedAtForDate(selectedDate)); };
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const {
    showTextVoice,
    showFavorites,
    closeTextVoice,
    closeFavorites,
  } = useQuickLogStore();
  const [showTextVoiceModal, setShowTextVoiceModal] = useState(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showMasterPlanModal, setShowMasterPlanModal] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [activeMealType, setActiveMealType] = useState<MealType>("almuerzo");

  const { data, error, isLoading, isRefetching, refetch } = useDailyNutrition(selectedDate);
  const { totalMl, targetMl, addWater, isAdding } = useWaterTracker(selectedDate);
  const { burnedCalories, steps, logActivity } = useActivitySync(selectedDate);

  const isToday =
    getDateKey(selectedDate) === getDateKey(new Date());

  const changeDay = (delta: number) => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + delta);
    setSelectedDate(nextDate);
  };

  const handleAddMeal = (mealType: MealType) => {
    beginMeal();
    setActiveMealType(mealType);
    router.push({
      pathname: "/(tabs)/record",
      params: { mealType },
    });
  };

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
            <Text style={styles.greetingTitle}>
              {profile?.full_name ? `¡Hola, ${profile.full_name.split(" ")[0]}!` : "¡Hola!"} 👋
            </Text>
            <Text style={styles.greetingSubtitle}>Tu registro nutricional diario</Text>
          </View>
          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={styles.helpGuideBtn}
              onPress={() => setShowGuideModal(true)}
              activeOpacity={0.8}
              accessibilityLabel="¿Cómo funciona la app?"
            >
              <HelpCircle size={18} color={colors.primary} />
            </TouchableOpacity>
            <StreakBadge onPress={() => setShowStreakModal(true)} />
          </View>
        </View>

        {/* Navegador de Fecha */}
        <View style={styles.dateSelector}>
          <TouchableOpacity style={styles.dateArrow} onPress={() => changeDay(-1)}>
            <ChevronLeft size={18} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.dateCenter}>
            <Text style={styles.dateTitle}>{isToday ? "Hoy" : formattedDate}</Text>
            {isToday && <Text style={styles.dateSubtitle}>{formattedDate}</Text>}
          </View>
          <TouchableOpacity
            style={[styles.dateArrow, isToday && styles.dateArrowDisabled]}
            onPress={() => !isToday && changeDay(1)}
            disabled={isToday}
          >
            <ChevronRight size={18} color={isToday ? colors.textMuted : colors.text} />
          </TouchableOpacity>
        </View>

        {/* Banner Destacado: Coach Nutricional IA y Recetas (Fase 3) */}
        <View style={styles.assistantBannersRow}>
          <TouchableOpacity
            style={styles.coachBanner}
            onPress={() => router.push("/coach")}
            activeOpacity={0.85}
          >
            <View style={styles.bannerIconBadge}>
              <Sparkles size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.coachBannerTitle}>Coach IA</Text>
              <Text style={styles.coachBannerDesc}>¿Qué comer hoy?</Text>
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.recipesBanner}
            onPress={() => router.push("/recipes")}
            activeOpacity={0.85}
          >
            <View style={[styles.bannerIconBadge, { backgroundColor: "#FEF3C7" }]}>
              <ChefHat size={18} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.recipesBannerTitle}>Recetas</Text>
              <Text style={styles.recipesBannerDesc}>Chilenas fitness</Text>
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Banner Mi Plan Maestro */}
        {personalPlan && <TouchableOpacity
          style={styles.masterPlanBanner}
          onPress={() => setShowMasterPlanModal(true)}
          activeOpacity={0.85}
        >
          <View style={styles.masterPlanBadge}>
            <Target size={18} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.masterPlanTitle}>Mi Plan Maestro</Text>
              <View style={styles.masterPlanPill}>
                <Text style={styles.masterPlanPillText}>Activo</Text>
              </View>
            </View>
            <Text style={styles.masterPlanSubtitle}>
              {personalPlan.user.objectiveTitle}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.primary} />
        </TouchableOpacity>}

        {/* Barra de atajos de registro rápido */}
        <View style={styles.quickActionsBar}>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => { beginMeal(); router.push("/meal/camera"); }}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIconWrap, { backgroundColor: colors.primaryLight }]}>
              <Camera size={18} color={colors.primary} />
            </View>
            <Text style={styles.quickActionText}>Foto IA</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => { beginMeal(); setShowTextVoiceModal(true); }}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIconWrap, { backgroundColor: "#EEF2FF" }]}>
              <Mic size={18} color="#6366F1" />
            </View>
            <Text style={styles.quickActionText}>Texto/Voz</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => { beginMeal(); router.push("/meal/barcode"); }}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIconWrap, { backgroundColor: "#F0F9FF" }]}>
              <Barcode size={18} color="#0EA5E9" />
            </View>
            <Text style={styles.quickActionText}>Código</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => { beginMeal(); setShowFavoritesModal(true); }}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIconWrap, { backgroundColor: "#FEF3C7" }]}>
              <Star size={18} color="#F59E0B" />
            </View>
            <Text style={styles.quickActionText}>Frecuentes</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loaderText}>Cargando tu progreso...</Text>
          </View>
        ) : error ? <Text accessibilityRole="alert" style={styles.loaderText}>{error.message}</Text> : (
          <>
            {/* Calorie Hero Dinámico con Calorías de Ejercicio */}
            <CalorieHero
              goal={data?.goal.calories || 2000}
              consumed={data?.consumed.calories || 0}
              remaining={data?.remaining.calories || 0}
              burnedCalories={burnedCalories}
              onExercisePress={() => setShowActivityModal(true)}
            />

            {/* Widget de Agua */}
            <WaterCard
              totalMl={totalMl}
              targetMl={targetMl}
              onAddWater={async (ml) => { try { await addWater(ml); } catch { showAlert("Agua", "No se pudo guardar. Revisa la conexión."); } }}
              loading={isAdding}
            />

            {/* Macronutrientes */}
            <MacroProgressBar
              proteinConsumed={data?.consumed.protein || 0}
              proteinGoal={data?.goal.protein_g || 140}
              carbsConsumed={data?.consumed.carbs || 0}
              carbsGoal={data?.goal.carbs_g || 220}
              fatConsumed={data?.consumed.fat || 0}
              fatGoal={data?.goal.fat_g || 65}
            />

            {/* Smart Coach Proactivo (Fase 3) */}
            <SmartCoachCard
              consumedCalories={data?.consumed.calories || 0}
              goalCalories={data?.goal.calories || 2000}
              remainingCalories={data?.remaining.calories || 0}
              consumedProtein={data?.consumed.protein || 0}
              goalProtein={data?.goal.protein_g || 140}
              remainingProtein={data?.remaining.protein || 0}
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

            {/* Comidas del Día */}
            <Text style={styles.mealsHeaderTitle}>Comidas del Día</Text>

            <MealCard
              mealType="desayuno"
              meals={data?.meals || []}
              onAddPress={handleAddMeal}
            />
            <MealCard
              mealType="almuerzo"
              meals={data?.meals || []}
              onAddPress={handleAddMeal}
            />
            <MealCard
              mealType="cena"
              meals={data?.meals || []}
              onAddPress={handleAddMeal}
            />
            <MealCard
              mealType="snack"
              meals={data?.meals || []}
              onAddPress={handleAddMeal}
            />

            <View style={styles.bottomSpacer} />
          </>
        )}
      </ScrollView>

      {/* Modal de Texto / Voz */}
      <TextVoiceModal
        visible={showTextVoiceModal || showTextVoice}
        mealType={activeMealType}
        onClose={() => {
          setShowTextVoiceModal(false);
          closeTextVoice();
        }}
      />

      {/* Modal de Comidas Frecuentes */}
      <FavoritesModal
        visible={showFavoritesModal || showFavorites}
        onClose={() => {
          setShowFavoritesModal(false);
          closeFavorites();
        }}
      />

      {/* Modal de Actividad Física y Apple Health */}
      <ActivityModal
        visible={showActivityModal}
        currentBurned={burnedCalories}
        currentSteps={steps}
        onClose={() => setShowActivityModal(false)}
        onSave={async (cal, st) => {
          await logActivity({ calories: cal, steps: st });
        }}
      />

      {/* Modal de Mi Plan Maestro */}
      <MasterPlanModal
        visible={showMasterPlanModal}
        onClose={() => setShowMasterPlanModal(false)}
      />

      {/* Modal de Racha de Hábitos (Fase 3) */}
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

      {/* Modal de Guía de la App y Explicación de Botones */}
      <AppGuideModal
        visible={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />
    </>
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
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    marginTop: 4,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  helpGuideBtn: {
    width: 34,
    height: 34,
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
  greetingTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.4,
  },
  greetingSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  dateArrow: {
    width: 32,
    height: 32,
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
    alignItems: "center",
  },
  dateTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.3,
  },
  dateSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
    textTransform: "capitalize",
    fontWeight: "500",
  },
  assistantBannersRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  coachBanner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  bannerIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  coachBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.2,
  },
  coachBannerDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  recipesBanner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  recipesBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.2,
  },
  recipesBannerDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  masterPlanBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
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
  },
  quickActionsBar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  quickActionBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  quickActionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text,
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
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 12,
    marginLeft: 2,
  },
  bottomSpacer: {
    height: 40,
  },
});
