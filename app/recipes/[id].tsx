import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRecipeDetail } from "@/hooks/useRecipes";
import { useMealReviewStore } from "@/stores/useMealReviewStore";
import { useDietaryPreferences } from "@/hooks/useDietaryPreferences";
import { isRecipeCompatible } from "@/utils/foodAlerts";
import { colors, layout } from "@/constants/colors";
import { DetectedFoodItem, MealType } from "@/types/meal";
import { isLiquidFood, formatQuantityDisplay } from "@/utils/liquidUnits";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Minus, Plus, Utensils, ShoppingBasket, Check } from "lucide-react-native";
import { useShoppingListStore } from "@/stores/useShoppingListStore";
import { ShoppingListModal } from "@/components/recipes/ShoppingListModal";
import { showToast } from "@/utils/alerts";

export default function RecipeDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: recipe, isLoading, error } = useRecipeDetail(id || "");
  const { initializeReview } = useMealReviewStore();
  const { restrictions } = useDietaryPreferences();
  const { plannedRecipes, hydrate, addOrUpdateRecipe } = useShoppingListStore();

  const [servingsToLog, setServingsToLog] = React.useState(1);
  const [selectedMealType, setSelectedMealType] = React.useState<MealType>("almuerzo");
  const [showShoppingModal, setShowShoppingModal] = React.useState(false);

  React.useEffect(() => {
    void hydrate();
  }, [hydrate]);

  React.useEffect(() => {
    if (recipe?.mealType) {
      setSelectedMealType(recipe.mealType);
    }
  }, [recipe?.mealType]);

  const compatibility = React.useMemo(() => {
    if (!recipe || restrictions.length === 0) return null;
    return isRecipeCompatible(recipe, restrictions);
  }, [recipe, restrictions]);

  const handleLogRecipe = () => {
    if (!recipe) return;

    const baseServings = Math.max(1, recipe.servings || 1);
    const factor = servingsToLog / baseServings;

    // Convertir ingredientes al formato de items de comida escalados por porción
    const detectedItems: DetectedFoodItem[] = recipe.ingredients.map((ing, idx) => {
      const isLiquid = isLiquidFood(ing.foodName);
      return {
        id: `recipe_ing_${idx}_${Date.now()}`,
        food: ing.foodName,
        grams: Math.round(ing.grams * factor),
        unit: isLiquid ? "ml" : "g",
        calories: Math.round(ing.calories * factor * 10) / 10,
        protein: Math.round(ing.protein * factor * 10) / 10,
        carbs: Math.round(ing.carbs * factor * 10) / 10,
        fat: Math.round(ing.fat * factor * 10) / 10,
        confidence: 1.0,
      };
    });

    useMealReviewStore.getState().reset();
    initializeReview({
      imagePath: "",
      localImageUri: "",
      mealType: selectedMealType,
      items: detectedItems,
    });

    router.push("/meal/review");
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!recipe || error) return <View style={styles.loadingContainer}><Text>{error?.message || "Receta no disponible."}</Text><TouchableOpacity onPress={() => router.back()}><Text>Volver</Text></TouchableOpacity></View>;
  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) + 30 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver al catálogo de recetas" style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace("/recipes")}>
          <Text style={styles.backBtnText}>‹ Catálogo</Text>
        </TouchableOpacity>
        <View style={styles.mealBadge}>
          <Text style={styles.mealBadgeText}>{recipe.mealType.toUpperCase()}</Text>
        </View>
      </View>

      <Text accessibilityRole="header" style={styles.title}>{recipe.title}</Text>
      <Text style={styles.prepTime}>⏱️ Tiempo estimado: {recipe.prepTimeMinutes} minutos</Text>
      {recipe.description && <Text style={styles.description}>{recipe.description}</Text>}

      {compatibility && (
        <View
          style={[
            styles.compatibilityBanner,
            compatibility.compatible
              ? styles.compatibilityBannerSuccess
              : styles.compatibilityBannerWarning,
          ]}
        >
          <Text
            style={[
              styles.compatibilityBannerTitle,
              compatibility.compatible
                ? styles.compatibilityBannerTitleSuccess
                : styles.compatibilityBannerTitleWarning,
            ]}
          >
            {compatibility.compatible
              ? "✓ Compatible con tus restricciones dietéticas"
              : "⚠️ Advertencia de Alérgenos / Restricciones"}
          </Text>
          {!compatibility.compatible && (
            <View style={styles.compatibilityAlertsList}>
              {compatibility.alerts.map((alert, idx) => (
                <Text key={idx} style={styles.compatibilityAlertText}>
                  • {alert.message}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Tarjeta de Macronutrientes por porción */}
      <View style={styles.macrosCard}>
        <View style={styles.calHero}>
          <Text style={styles.calHeroNumber}>{Math.round(recipe.caloriesPerServing)}</Text>
          <Text style={styles.calHeroUnit}>kcal / porción</Text>
        </View>
        <View style={styles.macrosRow}>
          <View style={styles.macroCol}>
            <Text style={[styles.macroValue, { color: colors.protein }]}>
              {Math.round(recipe.proteinPerServing)}g
            </Text>
            <Text style={styles.macroLabel}>Proteína</Text>
          </View>
          <View style={styles.macroCol}>
            <Text style={[styles.macroValue, { color: colors.carbs }]}>
              {Math.round(recipe.carbsPerServing)}g
            </Text>
            <Text style={styles.macroLabel}>Carbohidratos</Text>
          </View>
          <View style={styles.macroCol}>
            <Text style={[styles.macroValue, { color: colors.fat }]}>
              {Math.round(recipe.fatPerServing)}g
            </Text>
            <Text style={styles.macroLabel}>Grasas</Text>
          </View>
        </View>
      </View>

      {/* Ingredientes */}
      <Text style={styles.sectionTitle}>Ingredientes ({recipe.ingredients.length})</Text>
      <View style={styles.ingredientsCard}>
        {recipe.ingredients.map((ing) => (
          <View key={ing.id} style={styles.ingredientRow}>
            <Text style={styles.ingredientName}>• {ing.foodName}</Text>
            <Text style={styles.ingredientGrams}>
              {formatQuantityDisplay(ing.grams, isLiquidFood(ing.foodName) ? "ml" : "g")}
            </Text>
          </View>
        ))}
      </View>

      {/* Preparación paso a paso */}
      <Text style={styles.sectionTitle}>Preparación Paso a Paso</Text>
      <View style={styles.instructionsCard}>
        {recipe.instructions.map((step, idx) => (
          <View key={idx} style={styles.stepRow}>
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumberText}>{idx + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>

      {/* Selector de Porción y Momento del Día */}
      <View style={styles.logConfigCard}>
        <View style={styles.logConfigHeader}>
          <Utensils size={16} color={colors.primary} />
          <Text style={styles.logConfigTitle}>¿Cómo lo registrarás hoy?</Text>
        </View>

        {/* Tipo de comida */}
        <Text style={styles.logConfigLabel}>MOMENTO DEL DÍA</Text>
        <View style={styles.mealTypeChipsRow}>
          {(
            [
              { key: "desayuno", label: "Desayuno" },
              { key: "almuerzo", label: "Almuerzo" },
              { key: "cena", label: "Once / Cena" },
              { key: "snack", label: "Colación" },
            ] as const
          ).map((m) => {
            const active = selectedMealType === m.key;
            return (
              <TouchableOpacity
                key={m.key}
                accessibilityRole="button"
                accessibilityLabel={`Comida: ${m.label}`}
                style={[styles.mealTypeChip, active && styles.mealTypeChipActive]}
                onPress={() => setSelectedMealType(m.key)}
              >
                <Text style={[styles.mealTypeChipText, active && styles.mealTypeChipTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selector de porciones */}
        <View style={styles.servingsRow}>
          <View>
            <Text style={styles.logConfigLabel}>PORCIONES</Text>
            <Text style={styles.servingsCalc}>
              ~{Math.round(recipe.caloriesPerServing * servingsToLog)} kcal en total
            </Text>
          </View>

          <View style={styles.servingsStepper}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Restar 0.5 porción"
              style={styles.servingsBtn}
              onPress={() => setServingsToLog((s) => Math.max(0.5, Math.round((s - 0.5) * 10) / 10))}
            >
              <Minus size={15} color={colors.text} />
            </TouchableOpacity>

            <Text style={styles.servingsValue}>{servingsToLog}</Text>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Sumar 0.5 porción"
              style={styles.servingsBtn}
              onPress={() => setServingsToLog((s) => Math.min(6, Math.round((s + 0.5) * 10) / 10))}
            >
              <Plus size={15} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Botón de acción: Registrar en comida */}
      <TouchableOpacity accessibilityRole="button" style={styles.logButton} onPress={handleLogRecipe}>
        <Text style={styles.logButtonText}>
          🍽️ Registrar en mi {selectedMealType === "desayuno" ? "Desayuno" : selectedMealType === "almuerzo" ? "Almuerzo" : selectedMealType === "cena" ? "Once / Cena" : "Colación"}
        </Text>
      </TouchableOpacity>

      {/* Botón de Lista de Compras */}
      {(() => {
        const inList = plannedRecipes.some((r) => r.recipe.id === recipe.id);
        return (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Agregar ingredientes a mi Lista de Compras"
            style={[
              styles.shoppingListBtn,
              inList && styles.shoppingListBtnActive,
            ]}
            onPress={() => {
              addOrUpdateRecipe(recipe, servingsToLog);
              showToast({
                type: "success",
                title: "¡Ingredientes en tu Lista!",
                message: `Se sumaron ${servingsToLog} porciones de "${recipe.title}" para la feria y supermercado.`,
              });
              setShowShoppingModal(true);
            }}
          >
            {inList ? (
              <Check size={17} color={colors.primaryDark} strokeWidth={3} />
            ) : (
              <ShoppingBasket size={17} color={colors.primary} />
            )}
            <Text style={styles.shoppingListBtnText}>
              {inList
                ? `En tu Lista de Compras (${servingsToLog} porc.) · Ver lista`
                : `🛒 Sumar ingredientes a mi Lista de Compras (${servingsToLog} porc.)`}
            </Text>
          </TouchableOpacity>
        );
      })()}

      <ShoppingListModal
        visible={showShoppingModal}
        onClose={() => setShowShoppingModal(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    ...layout.narrowPage,
    paddingTop: Platform.OS === "ios" ? 48 : 20,
    paddingBottom: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  backBtn: {
    minHeight: 44,
    justifyContent: "center",
    paddingVertical: 6,
  },
  backBtnText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: "700",
  },
  mealBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mealBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 4,
  },
  prepTime: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  macrosCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: 24,
    alignItems: "center",
  },
  calHero: {
    alignItems: "center",
    marginBottom: 16,
  },
  calHeroNumber: {
    fontSize: 34,
    fontWeight: "900",
    color: colors.text,
  },
  calHeroUnit: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "600",
  },
  macrosRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 14,
  },
  macroCol: {
    alignItems: "center",
  },
  macroValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  macroLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 10,
  },
  ingredientsCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 24,
  },
  ingredientRow: {
    gap: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  ingredientName: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
  },
  ingredientGrams: {
    flexShrink: 0,
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  instructionsCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 28,
  },
  stepRow: {
    flexDirection: "row",
    marginBottom: 14,
    gap: 12,
    alignItems: "flex-start",
  },
  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  logButton: {
    minHeight: 52,
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  logButtonText: {
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  compatibilityBanner: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
  },
  compatibilityBannerSuccess: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  compatibilityBannerWarning: {
    backgroundColor: "#FEFCE8",
    borderColor: "#FEF08A",
  },
  compatibilityBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  compatibilityBannerTitleSuccess: {
    color: "#166534",
  },
  compatibilityBannerTitleWarning: {
    color: "#854D0E",
  },
  compatibilityAlertsList: {
    marginTop: 6,
    gap: 4,
  },
  compatibilityAlertText: {
    fontSize: 13,
    color: "#A16207",
    lineHeight: 18,
  },
  logConfigCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: 16,
  },
  logConfigHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  logConfigTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  logConfigLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  mealTypeChipsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  mealTypeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  mealTypeChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  mealTypeChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  mealTypeChipTextActive: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  servingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  servingsCalc: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: "600",
  },
  servingsStepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    padding: 4,
  },
  servingsBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  servingsValue: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    minWidth: 28,
    textAlign: "center",
  },
  shoppingListBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 50,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginTop: 10,
    backgroundColor: colors.primaryGhost,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  shoppingListBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryDark,
  },
  shoppingListBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primaryDark,
  },
});
