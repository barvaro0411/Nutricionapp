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
import { OfflineBanner } from "@/components/common/OfflineBanner";
import { colors } from "@/constants/colors";
import { MealType } from "@/types/meal";

export default function DashboardScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showTextVoiceModal, setShowTextVoiceModal] = useState(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activeMealType, setActiveMealType] = useState<MealType>("almuerzo");

  const { data, isLoading, isRefetching, refetch } = useDailyNutrition(selectedDate);
  const { totalMl, targetMl, addWater, isAdding } = useWaterTracker(selectedDate);
  const { burnedCalories, steps, logActivity } = useActivitySync(selectedDate);

  const isToday =
    selectedDate.toDateString() === new Date().toDateString();

  const changeDay = (delta: number) => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + delta);
    setSelectedDate(nextDate);
  };

  const handleAddMeal = (mealType: MealType) => {
    setActiveMealType(mealType);
    router.push({
      pathname: "/meal/camera",
      params: { suggestedMealType: mealType },
    });
  };

  const formattedDate = selectedDate.toLocaleDateString("es-CL", {
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
        {/* Navegador de Fecha */}
        <View style={styles.dateSelector}>
          <TouchableOpacity style={styles.dateArrow} onPress={() => changeDay(-1)}>
            <Text style={styles.dateArrowText}>‹</Text>
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
            <Text style={[styles.dateArrowText, isToday && styles.dateArrowTextDisabled]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Banner Destacado: Coach Nutricional IA y Recetas (Fase 3) */}
        <View style={styles.assistantBannersRow}>
          <TouchableOpacity
            style={styles.coachBanner}
            onPress={() => router.push("/coach")}
            activeOpacity={0.85}
          >
            <Text style={styles.coachBannerIcon}>🤖</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.coachBannerTitle}>Coach Nutricional IA</Text>
              <Text style={styles.coachBannerDesc}>¿Qué comer hoy según tus metas?</Text>
            </View>
            <Text style={styles.coachBannerAction}>Chatear ›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.recipesBanner}
            onPress={() => router.push("/recipes")}
            activeOpacity={0.85}
          >
            <Text style={styles.coachBannerIcon}>📖</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.recipesBannerTitle}>Recetas Chilenas</Text>
              <Text style={styles.recipesBannerDesc}>Opciones altas en proteína</Text>
            </View>
            <Text style={styles.recipesBannerAction}>Ver ›</Text>
          </TouchableOpacity>
        </View>

        {/* Barra de atajos de registro rápido */}
        <View style={styles.quickActionsBar}>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => router.push("/meal/camera")}
          >
            <Text style={styles.quickActionIcon}>📸</Text>
            <Text style={styles.quickActionText}>Foto IA</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => setShowTextVoiceModal(true)}
          >
            <Text style={styles.quickActionIcon}>🎙️</Text>
            <Text style={styles.quickActionText}>Texto/Voz</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => router.push("/meal/barcode")}
          >
            <Text style={styles.quickActionIcon}>📦</Text>
            <Text style={styles.quickActionText}>Código</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => setShowFavoritesModal(true)}
          >
            <Text style={styles.quickActionIcon}>⭐</Text>
            <Text style={styles.quickActionText}>Frecuentes</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loaderText}>Cargando tu progreso...</Text>
          </View>
        ) : (
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
              onAddWater={(ml) => addWater(ml)}
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
        visible={showTextVoiceModal}
        mealType={activeMealType}
        onClose={() => setShowTextVoiceModal(false)}
      />

      {/* Modal de Comidas Frecuentes */}
      <FavoritesModal
        visible={showFavoritesModal}
        onClose={() => setShowFavoritesModal(false)}
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
    paddingBottom: 90,
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
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  coachBannerIcon: {
    fontSize: 18,
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
  coachBannerAction: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
    marginLeft: 4,
  },
  recipesBanner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    padding: 14,
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
  recipesBannerAction: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
    marginLeft: 4,
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
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  quickActionIcon: {
    fontSize: 18,
    marginBottom: 4,
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
