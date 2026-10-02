import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useRecipes } from "@/hooks/useRecipes";
import { colors } from "@/constants/colors";
import { MealType } from "@/types/meal";
import { Recipe } from "@/services/recipeService";

export default function RecipesCatalogScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<MealType | undefined>(undefined);

  const { data: recipes, isLoading } = useRecipes(selectedType);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recetas Saludables Chilenas</Text>
        <View style={{ width: 50 }} />
      </View>

      <Text style={styles.subtitle}>
        Comida tradicional chilena adaptada con alto contenido proteico y balance calórico óptimo.
      </Text>

      {/* Filtros */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, !selectedType && styles.filterChipActive]}
          onPress={() => setSelectedType(undefined)}
        >
          <Text style={[styles.filterChipText, !selectedType && styles.filterChipTextActive]}>
            Todas
          </Text>
        </TouchableOpacity>
        {(["desayuno", "almuerzo", "cena"] as MealType[]).map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.filterChip, selectedType === type && styles.filterChipActive]}
            onPress={() => setSelectedType(type)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedType === type && styles.filterChipTextActive,
              ]}
            >
              {type === "cena" ? "Once/Cena" : type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista de Recetas */}
      {isLoading ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginVertical: 40 }} />
      ) : (
        <View style={styles.recipesList}>
          {(recipes || []).map((recipe: Recipe) => (
            <TouchableOpacity
              key={recipe.id}
              style={styles.recipeCard}
              onPress={() => router.push(`/recipes/${recipe.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.mealBadge}>
                  <Text style={styles.mealBadgeText}>{recipe.mealType.toUpperCase()}</Text>
                </View>
                <Text style={styles.prepTime}>⏱️ {recipe.prepTimeMinutes} min</Text>
              </View>

              <Text style={styles.recipeTitle}>{recipe.title}</Text>
              <Text style={styles.recipeDesc} numberOfLines={2}>
                {recipe.description}
              </Text>

              <View style={styles.cardFooter}>
                <View style={styles.calPill}>
                  <Text style={styles.calPillText}>{Math.round(recipe.caloriesPerServing)} kcal</Text>
                </View>
                <Text style={styles.macroSummary}>
                  {Math.round(recipe.proteinPerServing)}g P • {Math.round(recipe.carbsPerServing)}g C • {Math.round(recipe.fatPerServing)}g G
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
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
    paddingTop: Platform.OS === "ios" ? 48 : 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  backBtn: {
    paddingVertical: 6,
  },
  backBtnText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  recipesList: {
    gap: 14,
  },
  recipeCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  mealBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mealBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  prepTime: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  recipeTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 6,
  },
  recipeDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  calPill: {
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  calPillText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
  },
  macroSummary: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
});
