import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Minus, Plus, ShoppingCart, Sparkles, Star, Trash2 } from "lucide-react-native";
import { colors, layout } from "@/constants/colors";
import { useDietaryPreferences } from "@/hooks/useDietaryPreferences";
import {
  useDeleteUserRecipe,
  useRecipeDetail,
  useToggleRecipeFavorite,
} from "@/hooks/useRecipes";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useMealReviewStore } from "@/stores/useMealReviewStore";
import { DetectedFoodItem } from "@/types/meal";
import { RecipeSource } from "@/types/recipe";
import { showAlert, showToast } from "@/utils/alerts";
import { isRecipeCompatible } from "@/utils/foodAlerts";
import { formatQuantityDisplay, isLiquidFood } from "@/utils/liquidUnits";
import { formatShoppingQuantity } from "@/utils/shoppingList";

export default function RecipeDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, source } = useLocalSearchParams<{ id: string; source?: RecipeSource }>();
  const { data: recipe, isLoading, error } = useRecipeDetail(id || "", source);
  const { initializeReview } = useMealReviewStore();
  const { restrictions, customAllergies } = useDietaryPreferences();
  const { addRecipeIngredients, isAdding: isAddingShopping } = useShoppingList();
  const toggleFavorite = useToggleRecipeFavorite();
  const deleteMutation = useDeleteUserRecipe();

  const [plannedServings, setPlannedServings] = useState(1);
  const [addedToShopping, setAddedToShopping] = useState(false);

  useEffect(() => {
    if (recipe) {
      setPlannedServings(recipe.servings || 1);
      setAddedToShopping(false);
    }
  }, [recipe]);

  const compatibility = React.useMemo(() => {
    if (!recipe || (restrictions.length === 0 && customAllergies.length === 0)) return null;
    return isRecipeCompatible(recipe, restrictions, customAllergies);
  }, [recipe, restrictions, customAllergies]);

  const baseServings = recipe?.servings && recipe.servings > 0 ? recipe.servings : 1;
  const scaleFactor = plannedServings / baseServings;

  const handleLogRecipe = () => {
    if (!recipe) return;

    const detectedItems: DetectedFoodItem[] = recipe.ingredients.map((ing, idx) => {
      const isLiquid = ing.unit === "ml" || isLiquidFood(ing.foodName);
      return {
        id: `recipe_ing_${idx}_${Date.now()}`,
        food: ing.foodName,
        grams: Math.round(ing.grams * scaleFactor * 10) / 10,
        unit: isLiquid ? "ml" : "g",
        calories: Math.round(ing.calories * scaleFactor * 10) / 10,
        protein: Math.round(ing.protein * scaleFactor * 10) / 10,
        carbs: Math.round(ing.carbs * scaleFactor * 10) / 10,
        fat: Math.round(ing.fat * scaleFactor * 10) / 10,
        confidence: 1.0,
      };
    });

    useMealReviewStore.getState().reset();
    initializeReview({
      imagePath: "",
      localImageUri: "",
      mealType: recipe.mealType,
      items: detectedItems,
    });

    router.push("/meal/review");
  };

  const handleAddShopping = async () => {
    if (!recipe || isAddingShopping) return;
    try {
      await addRecipeIngredients({ recipe, servings: plannedServings });
      setAddedToShopping(true);
      showToast({
        type: "success",
        title: "Ingredientes agregados",
        message: `${recipe.title} (${plannedServings} ${plannedServings === 1 ? "porción" : "porciones"})`,
      });
    } catch (err: any) {
      showToast({
        type: "error",
        title: "Error al agregar compras",
        message: err?.message,
      });
    }
  };

  const handleDelete = () => {
    if (!recipe || recipe.source !== "ai") return;
    showAlert(
      "Eliminar receta",
      `¿Seguro que deseas eliminar "${recipe.title}" de tus recetas?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            void deleteMutation
              .mutateAsync(recipe.id)
              .then(() => {
                showToast({ type: "success", title: "Receta eliminada" });
                router.replace("/recipes");
              })
              .catch((err: any) =>
                showToast({ type: "error", title: "Error", message: err?.message })
              );
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!recipe || error) {
    return (
      <View style={styles.loadingContainer}>
        <Text>{error?.message || "Receta no disponible."}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) + 30 },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Volver al catálogo de recetas"
          style={styles.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/recipes"))}
        >
          <Text style={styles.backBtnText}>‹ Catálogo</Text>
        </TouchableOpacity>

        <View style={styles.headerRight}>
          {recipe.source === "ai" && (
            <>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={recipe.isFavorite ? "Quitar de favoritas" : "Marcar como favorita"}
                style={styles.iconActionBtn}
                onPress={() =>
                  void toggleFavorite.mutateAsync({
                    recipeId: recipe.id,
                    isFavorite: !recipe.isFavorite,
                  })
                }
              >
                <Star
                  size={18}
                  color={recipe.isFavorite ? "#F59E0B" : colors.textSecondary}
                  fill={recipe.isFavorite ? "#F59E0B" : "transparent"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Eliminar receta"
                style={styles.iconActionBtn}
                onPress={handleDelete}
              >
                <Trash2 size={18} color={colors.danger} />
              </TouchableOpacity>
            </>
          )}
          <View style={styles.mealBadge}>
            <Text style={styles.mealBadgeText}>{recipe.mealType.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.metaLine}>
        {recipe.source === "ai" && (
          <View style={styles.aiPill}>
            <Sparkles size={12} color="#4F46E5" />
            <Text style={styles.aiPillText}>Generada con IA</Text>
          </View>
        )}
        <Text style={styles.prepTime}>⏱️ {recipe.prepTimeMinutes} min · {recipe.servings} {recipe.servings === 1 ? "porción base" : "porciones base"}</Text>
      </View>

      <Text accessibilityRole="header" style={styles.title}>{recipe.title}</Text>
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

      {/* Selector de porciones e Ingredientes */}
      <View style={styles.ingredientsHeader}>
        <Text style={styles.sectionTitle}>Ingredientes ({recipe.ingredients.length})</Text>
        <View style={styles.servingsStepper}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Menos porciones"
            style={styles.stepBtn}
            onPress={() => setPlannedServings((p) => Math.max(1, p - 1))}
            disabled={plannedServings <= 1}
          >
            <Minus size={14} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.stepLabel}>
            {plannedServings} {plannedServings === 1 ? "porción" : "porciones"}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Más porciones"
            style={styles.stepBtn}
            onPress={() => setPlannedServings((p) => Math.min(12, p + 1))}
            disabled={plannedServings >= 12}
          >
            <Plus size={14} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.ingredientsCard}>
        {recipe.ingredients.map((ing) => {
          const scaledGrams = Math.round(ing.grams * scaleFactor * 10) / 10;
          const displayText =
            ing.unit === "unidad" && typeof ing.quantity === "number"
              ? `${formatShoppingQuantity(Math.round(ing.quantity * scaleFactor * 10) / 10, "unidad")} (${Math.round(scaledGrams)} g)`
              : formatQuantityDisplay(
                  scaledGrams,
                  ing.unit === "ml" || isLiquidFood(ing.foodName) ? "ml" : "g"
                );
          return (
            <View key={ing.id} style={styles.ingredientRow}>
              <Text style={styles.ingredientName}>• {ing.foodName}</Text>
              <Text style={styles.ingredientGrams}>{displayText}</Text>
            </View>
          );
        })}
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

      {/* Acciones: Agregar a Lista de Compras + Registrar comida */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Agregar ingredientes a lista de compras"
        style={[styles.shoppingButton, isAddingShopping && styles.disabledBtn]}
        onPress={() => void handleAddShopping()}
        disabled={isAddingShopping}
      >
        {isAddingShopping ? (
          <ActivityIndicator color={colors.primaryDark} size="small" />
        ) : (
          <View style={styles.shoppingBtnContent}>
            <ShoppingCart size={18} color={colors.primaryDark} />
            <Text style={styles.shoppingButtonText}>
              Agregar ingredientes a Compras ({plannedServings} {plannedServings === 1 ? "porción" : "porc."})
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {addedToShopping && (
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.goShoppingLink}
          onPress={() => router.push("/recipes/shopping-list")}
        >
          <Text style={styles.goShoppingText}>✓ Guardado · Ver Lista de Compras →</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity accessibilityRole="button" style={styles.logButton} onPress={handleLogRecipe}>
        <Text style={styles.logButtonText}>
          🍽️ Registrar {plannedServings === 1 ? "1 porción" : `${plannedServings} porciones`} en mi Día
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    ...layout.narrowPage,
    paddingTop: Platform.OS === "ios" ? 48 : 20,
    paddingBottom: 50,
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtn: { minHeight: 44, justifyContent: "center", paddingVertical: 6 },
  backBtnText: { fontSize: 16, color: colors.primary, fontWeight: "700" },
  mealBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mealBadgeText: { fontSize: 11, fontWeight: "800", color: colors.primaryDark },
  metaLine: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  aiPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  aiPillText: { fontSize: 11, fontWeight: "800", color: "#4F46E5" },
  prepTime: { fontSize: 13, color: colors.textSecondary },
  title: { fontSize: 24, fontWeight: "800", color: colors.text, marginBottom: 6 },
  description: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 18 },
  macrosCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: 24,
    alignItems: "center",
  },
  calHero: { alignItems: "center", marginBottom: 16 },
  calHeroNumber: { fontSize: 34, fontWeight: "900", color: colors.text },
  calHeroUnit: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  macrosRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 14,
  },
  macroCol: { alignItems: "center" },
  macroValue: { fontSize: 16, fontWeight: "800" },
  macroLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  ingredientsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  servingsStepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: { fontSize: 12, fontWeight: "700", color: colors.text },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: colors.text, marginBottom: 10 },
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
  ingredientName: { flex: 1, minWidth: 0, fontSize: 14, color: colors.text, fontWeight: "500" },
  ingredientGrams: { flexShrink: 0, fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
  instructionsCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 24,
  },
  stepRow: { flexDirection: "row", marginBottom: 14, gap: 12, alignItems: "flex-start" },
  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumberText: { fontSize: 12, fontWeight: "800", color: colors.primaryDark },
  stepText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 },
  shoppingButton: {
    minHeight: 50,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.mint,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  disabledBtn: { opacity: 0.65 },
  shoppingBtnContent: { flexDirection: "row", alignItems: "center", gap: 8 },
  shoppingButtonText: { fontSize: 14, fontWeight: "800", color: colors.primaryDark },
  goShoppingLink: { alignItems: "center", paddingVertical: 8, marginBottom: 10 },
  goShoppingText: { fontSize: 13, fontWeight: "700", color: colors.primary },
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
  logButtonText: { textAlign: "center", color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  compatibilityBanner: { borderRadius: 16, padding: 14, marginBottom: 20, borderWidth: 1 },
  compatibilityBannerSuccess: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
  compatibilityBannerWarning: { backgroundColor: "#FEFCE8", borderColor: "#FEF08A" },
  compatibilityBannerTitle: { fontSize: 14, fontWeight: "700" },
  compatibilityBannerTitleSuccess: { color: "#166534" },
  compatibilityBannerTitleWarning: { color: "#854D0E" },
  compatibilityAlertsList: { marginTop: 6, gap: 4 },
  compatibilityAlertText: { fontSize: 13, color: "#A16207", lineHeight: 18 },
});
