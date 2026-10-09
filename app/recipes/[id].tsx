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
import { colors, layout } from "@/constants/colors";
import { DetectedFoodItem } from "@/types/meal";
import { isLiquidFood, formatQuantityDisplay } from "@/utils/liquidUnits";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function RecipeDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: recipe, isLoading, error } = useRecipeDetail(id || "");
  const { initializeReview } = useMealReviewStore();

  const handleLogRecipe = () => {
    if (!recipe) return;

    // Convertir ingredientes al formato de items de comida
    const detectedItems: DetectedFoodItem[] = recipe.ingredients.map((ing, idx) => {
      const isLiquid = isLiquidFood(ing.foodName);
      return {
        id: `recipe_ing_${idx}_${Date.now()}`,
        food: ing.foodName,
        grams: ing.grams / recipe.servings,
        unit: isLiquid ? "ml" : "g",
        calories: ing.calories / recipe.servings,
        protein: ing.protein / recipe.servings,
        carbs: ing.carbs / recipe.servings,
        fat: ing.fat / recipe.servings,
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

      {/* Botón de acción: Registrar en comida */}
      <TouchableOpacity accessibilityRole="button" style={styles.logButton} onPress={handleLogRecipe}>
        <Text style={styles.logButtonText}>🍽️ Registrar esta Receta en mi Día</Text>
      </TouchableOpacity>
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
});
