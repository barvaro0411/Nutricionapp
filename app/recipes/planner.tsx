import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CalendarDays,
  Check,
  Minus,
  Plus,
  ShoppingCart,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react-native";
import { colors, layout, shadows } from "@/constants/colors";
import { PageBackHeader } from "@/components/common/AppUI";
import { useDailyNutrition } from "@/hooks/useDailyNutrition";
import { useDietaryPreferences } from "@/hooks/useDietaryPreferences";
import { useRecipes, useUserRecipes } from "@/hooks/useRecipes";
import { useShoppingList } from "@/hooks/useShoppingList";
import { loadWeeklyPlan, saveWeeklyPlan } from "@/services/weeklyPlannerService";
import { useAuthStore } from "@/stores/useAuthStore";
import { MealType } from "@/types/meal";
import { Recipe } from "@/types/recipe";
import { showAlert, showToast } from "@/utils/alerts";
import { isRecipeCompatible } from "@/utils/foodAlerts";
import {
  autoGenerateWeeklyPlan,
  buildShoppingItemsFromWeeklyPlan,
  createEmptyWeeklyPlan,
  recipeToPlannerSlot,
  summarizeDayPlan,
  summarizeWeekPlan,
  WeekdayId,
  WEEKLY_PLANNER_DAYS,
  WEEKLY_PLANNER_MOMENTS,
  WeeklyPlanGrid,
} from "@/utils/weeklyPlanner";

export default function WeeklyPlannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.user?.id || "");
  const { data: catalogRecipes, isLoading: loadingCatalog } = useRecipes();
  const { data: userRecipes, isLoading: loadingUser } = useUserRecipes();
  const { restrictions, customAllergies } = useDietaryPreferences();
  const { data: dailyNutrition } = useDailyNutrition();
  const { addBulkItems, isAdding, pendingCount } = useShoppingList();

  const [plan, setPlan] = useState<WeeklyPlanGrid>(createEmptyWeeklyPlan);
  const [selectedDay, setSelectedDay] = useState<WeekdayId>("lun");
  const [pickerMoment, setPickerMoment] = useState<MealType | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerCompatibleOnly, setPickerCompatibleOnly] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    loadWeeklyPlan(userId).then((loaded) => {
      if (active) {
        setPlan(loaded);
        setHydrated(true);
      }
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const persistPlan = (next: WeeklyPlanGrid) => {
    setPlan(next);
    if (userId) {
      void saveWeeklyPlan(userId, next);
    }
  };

  const allRecipes = useMemo<Recipe[]>(() => {
    return [...(userRecipes || []), ...(catalogRecipes || [])];
  }, [catalogRecipes, userRecipes]);

  const recipesById = useMemo(() => {
    return new Map(allRecipes.map((r) => [r.id, r]));
  }, [allRecipes]);

  const weekSummary = useMemo(() => summarizeWeekPlan(plan), [plan]);
  const daySummary = useMemo(
    () => summarizeDayPlan(plan[selectedDay] || {}),
    [plan, selectedDay]
  );

  const weeklyShoppingItems = useMemo(
    () => buildShoppingItemsFromWeeklyPlan(plan, recipesById),
    [plan, recipesById]
  );

  const targetCalories = dailyNutrition?.goal.calories ?? 2000;
  const targetProtein = dailyNutrition?.goal.protein_g ?? 120;

  const handleAutoBuild = () => {
    if (!allRecipes.length) {
      showAlert(
        "Recetas cargando",
        "Espera un segundo a que carguen tus recetas disponibles."
      );
      return;
    }

    const { plan: generated, compatibleCount } = autoGenerateWeeklyPlan({
      recipes: allRecipes,
      restrictions,
      customAllergies,
      targetCalories,
      targetProtein,
    });

    persistPlan(generated);
    showToast({
      type: "success",
      title: "¡Semana armada!",
      message:
        restrictions.length || customAllergies.length
          ? `Se asignaron comidas compatibles (${compatibleCount} recetas aptas para tus filtros).`
          : "Se armó tu menú de Lunes a Domingo. Toca cualquier comida para cambiarla.",
    });
  };

  const handleClearWeek = () => {
    showAlert(
      "Limpiar planificador",
      "¿Quieres vaciar todas las comidas asignadas de Lunes a Domingo?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Vaciar",
          style: "destructive",
          onPress: () => {
            persistPlan(createEmptyWeeklyPlan());
          },
        },
      ]
    );
  };

  const handleAssignRecipe = (recipe: Recipe) => {
    if (!pickerMoment) return;
    const next: WeeklyPlanGrid = {
      ...plan,
      [selectedDay]: {
        ...plan[selectedDay],
        [pickerMoment]: recipeToPlannerSlot(recipe, 1),
      },
    };
    persistPlan(next);
    setPickerMoment(null);
    setPickerSearch("");
  };

  const handleUpdateSlotServings = (moment: MealType, delta: number) => {
    const currentSlot = plan[selectedDay]?.[moment];
    if (!currentSlot) return;
    const nextServings = Math.max(1, Math.min(8, currentSlot.servings + delta));
    const next: WeeklyPlanGrid = {
      ...plan,
      [selectedDay]: {
        ...plan[selectedDay],
        [moment]: { ...currentSlot, servings: nextServings },
      },
    };
    persistPlan(next);
  };

  const handleRemoveSlot = (moment: MealType) => {
    const nextDay = { ...plan[selectedDay] };
    delete nextDay[moment];
    persistPlan({
      ...plan,
      [selectedDay]: nextDay,
    });
  };

  const handleSendWeekToShopping = async () => {
    if (!weeklyShoppingItems.length) {
      showAlert(
        "Plan vacío",
        "Asigna al menos una receta (o usa Armar semana automática) para generar tu lista de compras."
      );
      return;
    }
    try {
      await addBulkItems(weeklyShoppingItems);
      showToast({
        type: "success",
        title: "¡Lista de compras actualizada!",
        message: `Se agregaron ${weeklyShoppingItems.length} ingredientes consolidados de tu semana.`,
      });
      router.push("/recipes/shopping-list");
    } catch (err: any) {
      showAlert(
        "Error",
        err?.message || "No se pudo enviar la semana a la lista de compras."
      );
    }
  };

  const pickerCandidates = useMemo(() => {
    if (!pickerMoment) return [];
    const q = pickerSearch.trim().toLowerCase();
    return allRecipes
      .filter((r) => {
        if (q && !r.title.toLowerCase().includes(q)) return false;
        if (
          pickerCompatibleOnly &&
          (restrictions.length > 0 || customAllergies.length > 0)
        ) {
          return isRecipeCompatible(r, restrictions, customAllergies).compatible;
        }
        return true;
      })
      .sort((a, b) => {
        // Priorizar recetas del mismo momento del día primero
        const matchA = a.mealType === pickerMoment ? 1 : 0;
        const matchB = b.mealType === pickerMoment ? 1 : 0;
        return matchB - matchA;
      });
  }, [
    allRecipes,
    customAllergies,
    pickerCompatibleOnly,
    pickerMoment,
    pickerSearch,
    restrictions,
  ]);

  const activeDayMeta =
    WEEKLY_PLANNER_DAYS.find((d) => d.id === selectedDay) || WEEKLY_PLANNER_DAYS[0];
  const isLoading = loadingCatalog || loadingUser || !hydrated;

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: Math.max(insets.bottom, 24) + 36,
          },
        ]}
      >
        <PageBackHeader
          title="Planificador Semanal"
          backLabel="Volver a Recetas"
          onBack={() =>
            router.canGoBack() ? router.back() : router.replace("/recipes")
          }
        />

        {/* Banner resumen de la semana + CTA automático */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <CalendarDays size={18} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroOverline}>LUNES A DOMINGO</Text>
              <Text style={styles.heroTitle}>
                {weekSummary.plannedMeals} comidas planificadas
              </Text>
            </View>
            <TouchableOpacity
              style={styles.shoppingHeaderPill}
              onPress={() => router.push("/recipes/shopping-list")}
              accessibilityRole="button"
              accessibilityLabel="Abrir lista de compras"
            >
              <ShoppingCart size={14} color={colors.primaryDark} />
              <Text style={styles.shoppingHeaderText}>
                Compras{pendingCount > 0 ? ` (${pendingCount})` : ""}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroKpis}>
            <View style={styles.heroKpi}>
              <Text style={styles.heroKpiNum}>
                {weekSummary.avgDailyCalories > 0
                  ? `${weekSummary.avgDailyCalories.toLocaleString("es-CL")}`
                  : "—"}
              </Text>
              <Text style={styles.heroKpiLbl}>
                kcal prom/día (meta {Math.round(targetCalories)})
              </Text>
            </View>
            <View style={styles.heroKpi}>
              <Text style={[styles.heroKpiNum, { color: colors.protein }]}>
                {weekSummary.avgDailyProtein > 0
                  ? `${weekSummary.avgDailyProtein} g`
                  : "—"}
              </Text>
              <Text style={styles.heroKpiLbl}>
                proteína/día (meta {Math.round(targetProtein)} g)
              </Text>
            </View>
          </View>

          <View style={styles.heroActionsRow}>
            <TouchableOpacity
              style={styles.autoBtn}
              onPress={handleAutoBuild}
              activeOpacity={0.85}
            >
              <Wand2 size={16} color="#FFFFFF" />
              <Text style={styles.autoBtnText}>Armar semana automática</Text>
            </TouchableOpacity>

            {weekSummary.plannedMeals > 0 && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={handleClearWeek}
                accessibilityRole="button"
                accessibilityLabel="Vaciar semana"
              >
                <Trash2 size={16} color={colors.danger} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tira Lun-Dom */}
        <View style={styles.daysRow}>
          {WEEKLY_PLANNER_DAYS.map((day) => {
            const active = day.id === selectedDay;
            const count = summarizeDayPlan(plan[day.id]).mealCount;
            return (
              <Pressable
                key={day.id}
                onPress={() => setSelectedDay(day.id)}
                style={[styles.dayPill, active && styles.dayPillActive]}
                accessibilityRole="button"
                accessibilityLabel={`Ver ${day.label}`}
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[styles.dayShort, active && styles.dayShortActive]}
                >
                  {day.short}
                </Text>
                <View
                  style={[
                    styles.dayDot,
                    count > 0 && styles.dayDotFilled,
                    active && count > 0 && { backgroundColor: "#FFFFFF" },
                  ]}
                />
                <Text
                  style={[styles.dayCount, active && styles.dayCountActive]}
                >
                  {count}/4
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Encabezado del día elegido */}
        <View style={styles.dayHeader}>
          <View>
            <Text style={styles.dayTitle}>{activeDayMeta.label}</Text>
            <Text style={styles.dayMacrosSub}>
              {daySummary.mealCount > 0
                ? `${daySummary.calories.toLocaleString("es-CL")} kcal · ${daySummary.protein}g P · ${daySummary.carbs}g C · ${daySummary.fat}g G`
                : "Sin recetas asignadas para este día"}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator
            color={colors.primary}
            size="large"
            style={{ marginVertical: 32 }}
          />
        ) : (
          <View style={styles.slotsList}>
            {WEEKLY_PLANNER_MOMENTS.map((moment) => {
              const slot = plan[selectedDay]?.[moment.id];
              return (
                <View key={moment.id} style={styles.slotCard}>
                  <View style={styles.slotHeader}>
                    <Text style={styles.slotMomentLabel}>{moment.label}</Text>
                    {slot ? (
                      <TouchableOpacity
                        onPress={() => handleRemoveSlot(moment.id)}
                        accessibilityLabel={`Quitar receta de ${moment.label}`}
                      >
                        <X size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {slot ? (
                    <>
                      <TouchableOpacity
                        onPress={() => setPickerMoment(moment.id)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.slotTitleRow}>
                          <Text style={styles.slotRecipeTitle} numberOfLines={2}>
                            {slot.title}
                          </Text>
                          {slot.source === "ai" && (
                            <View style={styles.aiBadge}>
                              <Sparkles size={10} color={colors.primaryDark} />
                              <Text style={styles.aiBadgeText}>IA</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.slotMacros}>
                          {slot.caloriesPerServing} kcal · {slot.proteinPerServing}g P / porción
                        </Text>
                      </TouchableOpacity>

                      <View style={styles.slotFooter}>
                        <View style={styles.servingsCtrl}>
                          <TouchableOpacity
                            style={styles.servBtn}
                            onPress={() => handleUpdateSlotServings(moment.id, -1)}
                            disabled={slot.servings <= 1}
                          >
                            <Minus size={13} color={colors.text} />
                          </TouchableOpacity>
                          <Text style={styles.servLabel}>
                            {slot.servings} {slot.servings === 1 ? "porción" : "porciones"}
                          </Text>
                          <TouchableOpacity
                            style={styles.servBtn}
                            onPress={() => handleUpdateSlotServings(moment.id, 1)}
                            disabled={slot.servings >= 8}
                          >
                            <Plus size={13} color={colors.text} />
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                          style={styles.changeBtn}
                          onPress={() => setPickerMoment(moment.id)}
                        >
                          <Text style={styles.changeBtnText}>Cambiar</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={styles.emptySlotBtn}
                      onPress={() => setPickerMoment(moment.id)}
                    >
                      <Plus size={16} color={colors.primaryDark} />
                      <Text style={styles.emptySlotText}>
                        Elegir receta para {moment.label.toLowerCase()}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* CTA principal: Enviar toda la semana a la lista de compras */}
        <TouchableOpacity
          style={[
            styles.exportShoppingBtn,
            (!weeklyShoppingItems.length || isAdding) && { opacity: 0.65 },
          ]}
          onPress={() => void handleSendWeekToShopping()}
          disabled={isAdding}
          activeOpacity={0.85}
        >
          {isAdding ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <ShoppingCart size={18} color="#FFFFFF" />
              <Text style={styles.exportShoppingText}>
                Enviar semana a Compras ({weeklyShoppingItems.length} ingredientes)
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Modal selector de receta */}
      <Modal
        visible={pickerMoment !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerMoment(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.heroOverline}>
                  {activeDayMeta.label.toUpperCase()}
                </Text>
                <Text style={styles.modalTitle}>Elige una receta</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setPickerMoment(null)}
              >
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.pickerInput}
              value={pickerSearch}
              onChangeText={setPickerSearch}
              placeholder="Buscar receta (pollo, avena, ensalada...)"
              placeholderTextColor={colors.textMuted}
            />

            {(restrictions.length > 0 || customAllergies.length > 0) && (
              <TouchableOpacity
                style={[
                  styles.compatFilterBtn,
                  pickerCompatibleOnly && styles.compatFilterBtnActive,
                ]}
                onPress={() => setPickerCompatibleOnly((v) => !v)}
              >
                <Check
                  size={13}
                  color={
                    pickerCompatibleOnly ? colors.primaryDark : colors.textMuted
                  }
                />
                <Text style={styles.compatFilterText}>
                  Solo compatibles con mis preferencias
                </Text>
              </TouchableOpacity>
            )}

            <ScrollView style={{ maxHeight: 420 }}>
              {pickerCandidates.length === 0 ? (
                <Text style={styles.emptyPickerText}>
                  No hay recetas que coincidan con tu búsqueda o filtros.
                </Text>
              ) : (
                pickerCandidates.map((recipe) => {
                  const selected =
                    plan[selectedDay]?.[pickerMoment!]?.recipeId === recipe.id;
                  return (
                    <TouchableOpacity
                      key={recipe.id}
                      style={[
                        styles.pickerRow,
                        selected && styles.pickerRowSelected,
                      ]}
                      onPress={() => handleAssignRecipe(recipe)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pickerRowTitle}>{recipe.title}</Text>
                        <Text style={styles.pickerRowMeta}>
                          {Math.round(recipe.caloriesPerServing)} kcal ·{" "}
                          {Math.round(recipe.proteinPerServing)}g P ·{" "}
                          {recipe.prepTimeMinutes} min
                        </Text>
                      </View>
                      {recipe.source === "ai" && (
                        <View style={styles.aiBadge}>
                          <Sparkles size={10} color={colors.primaryDark} />
                          <Text style={styles.aiBadgeText}>IA</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { ...layout.narrowPage },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 18,
    marginBottom: 16,
    ...shadows.card,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  heroIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  heroOverline: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.9,
    color: colors.primaryDark,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
    marginTop: 2,
  },
  shoppingHeaderPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  shoppingHeaderText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  heroKpis: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  heroKpi: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 10,
  },
  heroKpiNum: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  heroKpiLbl: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  heroActionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  autoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 14,
    ...shadows.glow,
  },
  autoBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  clearBtn: {
    width: 46,
    borderRadius: 14,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  daysRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 16,
  },
  dayPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 4,
  },
  dayPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayShort: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.text,
  },
  dayShortActive: {
    color: "#FFFFFF",
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.cardBorder,
  },
  dayDotFilled: {
    backgroundColor: colors.primary,
  },
  dayCount: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textMuted,
  },
  dayCountActive: {
    color: "#FFFFFF",
  },
  dayHeader: {
    marginBottom: 12,
  },
  dayTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.text,
  },
  dayMacrosSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  slotsList: {
    gap: 10,
    marginBottom: 18,
  },
  slotCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
  },
  slotHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  slotMomentLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: colors.primaryDark,
  },
  slotTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 3,
  },
  slotRecipeTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  slotMacros: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  slotFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  servingsCtrl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  servBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  servLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
  },
  changeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
  },
  changeBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  emptySlotBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.cardBorder,
  },
  emptySlotText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  exportShoppingBtn: {
    minHeight: 54,
    backgroundColor: colors.primary,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...shadows.glow,
  },
  exportShoppingText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(6, 15, 11, 0.62)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 18,
    maxHeight: "82%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerInput: {
    minHeight: 44,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    fontSize: 13,
    color: colors.text,
    marginBottom: 10,
  },
  compatFilterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
  },
  compatFilterBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  compatFilterText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text,
  },
  emptyPickerText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: 24,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  pickerRowSelected: {
    backgroundColor: colors.primaryGhost,
  },
  pickerRowTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  pickerRowMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
