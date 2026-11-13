import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ArrowUpRight,
  ChefHat,
  Clock3,
  Plus,
  ShoppingCart,
  Sparkles,
  Star,
} from "lucide-react-native";
import {
  AppButton,
  FormField,
  PageHeading,
  StateCard,
} from "@/components/common/AppUI";
import { AiRecipeGeneratorModal } from "@/components/recipes/AiRecipeGeneratorModal";
import { colors, layout } from "@/constants/colors";
import { useDietaryPreferences } from "@/hooks/useDietaryPreferences";
import { useRecipes, useUserRecipes } from "@/hooks/useRecipes";
import { useShoppingList } from "@/hooks/useShoppingList";
import { MealType } from "@/types/meal";
import { RecipeSource } from "@/types/recipe";
import { showToast } from "@/utils/alerts";
import { isRecipeCompatible } from "@/utils/foodAlerts";

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const labels: Record<MealType, string> = {
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  cena: "Once / Cena",
  snack: "Colación",
};

type SourceFilter = "all" | RecipeSource;

export default function RecipesCatalogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const wide = useWindowDimensions().width >= 760;

  const [selectedType, setSelectedType] = useState<MealType | undefined>();
  const [sourceTab, setSourceTab] = useState<SourceFilter>("all");
  const [filterCompatibleOnly, setFilterCompatibleOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [generatorVisible, setGeneratorVisible] = useState(false);

  const { restrictions, customAllergies } = useDietaryPreferences();
  const activePreferencesCount = restrictions.length + customAllergies.length;

  const {
    data: catalogRecipes,
    isLoading: loadingCatalog,
    error: catalogError,
    refetch: refetchCatalog,
  } = useRecipes(selectedType);
  const {
    data: userRecipes,
    isLoading: loadingUser,
    error: userError,
    refetch: refetchUser,
  } = useUserRecipes(selectedType);
  const { pendingCount, addRecipeIngredients } = useShoppingList();

  const combinedRecipes = useMemo(() => {
    const aiList = userRecipes || [];
    const baseList = catalogRecipes || [];
    if (sourceTab === "ai") return aiList;
    if (sourceTab === "catalog") return baseList;
    return [...aiList, ...baseList];
  }, [catalogRecipes, userRecipes, sourceTab]);

  const filtered = useMemo(() => {
    return combinedRecipes.filter((recipe) => {
      const matchesSearch = normalize(
        recipe.title + " " + (recipe.description || "")
      ).includes(normalize(search.trim()));
      if (!matchesSearch) return false;
      if (filterCompatibleOnly && activePreferencesCount > 0) {
        const { compatible } = isRecipeCompatible(
          recipe,
          restrictions,
          customAllergies
        );
        if (!compatible) return false;
      }
      return true;
    });
  }, [
    combinedRecipes,
    search,
    filterCompatibleOnly,
    activePreferencesCount,
    restrictions,
    customAllergies,
  ]);

  const isLoading =
    sourceTab === "ai"
      ? loadingUser
      : sourceTab === "catalog"
      ? loadingCatalog
      : loadingCatalog && loadingUser;
  const error =
    sourceTab === "ai"
      ? userError
      : sourceTab === "catalog"
      ? catalogError
      : catalogError && userError;

  const retryAll = () => {
    void refetchCatalog();
    void refetchUser();
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top, 16) },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topActionsBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver a mi día"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/(tabs)")
          }
          style={styles.back}
        >
          <ArrowLeft size={18} color={colors.primary} />
          <Text style={styles.backText}>Volver</Text>
        </Pressable>

        <View style={styles.topRightBtns}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Abrir lista de compras"
            style={styles.shoppingBtn}
            onPress={() => router.push("/recipes/shopping-list")}
          >
            <ShoppingCart size={16} color={colors.primaryDark} />
            <Text style={styles.shoppingBtnText}>
              Compras{pendingCount > 0 ? ` (${pendingCount})` : ""}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Generar receta con IA"
            style={styles.generateBtn}
            onPress={() => setGeneratorVisible(true)}
          >
            <Sparkles size={16} color="#FFFFFF" />
            <Text style={styles.generateBtnText}>Generar IA</Text>
          </TouchableOpacity>
        </View>
      </View>

      <PageHeading
        eyebrow="Un poco de inspiración"
        title="Ideas para tu próxima comida"
        description="Combina el catálogo chileno con recetas generadas por IA según tus macros y restricciones."
      />

      {/* Tabs de origen */}
      <View style={styles.sourceTabs}>
        {[
          {
            key: "all" as const,
            label: `Todas (${(userRecipes?.length || 0) + (catalogRecipes?.length || 0)})`,
          },
          {
            key: "ai" as const,
            label: `✨ Mis Recetas (${userRecipes?.length || 0})`,
          },
          {
            key: "catalog" as const,
            label: `Catálogo (${catalogRecipes?.length || 0})`,
          },
        ].map((tab) => {
          const active = sourceTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setSourceTab(tab.key)}
              style={[styles.sourceTabChip, active && styles.sourceTabChipActive]}
            >
              <Text
                style={[
                  styles.sourceTabText,
                  active && styles.sourceTabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <FormField
        label="Buscar recetas"
        placeholder="Ej: pollo, avena, porotos…"
        value={search}
        onChangeText={setSearch}
        autoCorrect={false}
        returnKeyType="search"
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {[
          undefined,
          ...(["desayuno", "almuerzo", "cena", "snack"] as MealType[]),
        ].map((type) => (
          <Pressable
            key={type || "all"}
            accessibilityRole="button"
            accessibilityLabel={
              "Filtrar " + (type ? labels[type] : "todas las recetas")
            }
            accessibilityState={{ selected: selectedType === type }}
            onPress={() => setSelectedType(type)}
            style={[styles.chip, selectedType === type && styles.activeChip]}
          >
            <Text
              style={[
                styles.chipText,
                selectedType === type && styles.activeText,
              ]}
            >
              {type ? labels[type] : "Todas"}
            </Text>
          </Pressable>
        ))}

        {activePreferencesCount > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filtrar solo recetas compatibles con mis restricciones"
            accessibilityState={{ selected: filterCompatibleOnly }}
            onPress={() => setFilterCompatibleOnly((v) => !v)}
            style={[styles.chip, filterCompatibleOnly && styles.activeChip]}
          >
            <Text
              style={[
                styles.chipText,
                filterCompatibleOnly && styles.activeText,
              ]}
            >
              🌱 Para mi dieta ({activePreferencesCount})
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator
          color={colors.primary}
          size="large"
          style={styles.loading}
        />
      ) : error ? (
        <StateCard
          title="No pudimos cargar las recetas"
          message="Revisa la conexión y vuelve a intentarlo."
          onRetry={retryAll}
        />
      ) : filtered.length === 0 ? (
        <>
          <StateCard
            title={
              sourceTab === "ai" && !search && !filterCompatibleOnly
                ? "Aún no tienes recetas creadas con IA"
                : search || selectedType || filterCompatibleOnly
                ? "No encontramos esa combinación"
                : "Estamos preparando nuevas ideas"
            }
            message={
              sourceTab === "ai" && !search && !filterCompatibleOnly
                ? "Genera una receta en segundos adaptada a tus calorías restantes y alergias."
                : search || selectedType || filterCompatibleOnly
                ? "Prueba otro ingrediente o cambia los filtros seleccionados."
                : "Las recetas aparecerán aquí cuando estén disponibles."
            }
          />
          {sourceTab === "ai" && !search && !filterCompatibleOnly ? (
            <AppButton
              title="✨ Crear primera receta con IA"
              onPress={() => setGeneratorVisible(true)}
            />
          ) : (
            (search || selectedType || filterCompatibleOnly) && (
              <AppButton
                title="Limpiar filtros"
                onPress={() => {
                  setSearch("");
                  setSelectedType(undefined);
                  setFilterCompatibleOnly(false);
                }}
                secondary
              />
            )
          )}
        </>
      ) : (
        <>
          <Text style={styles.results}>
            {filtered.length}{" "}
            {filtered.length === 1
              ? "receta para inspirarte"
              : "recetas para inspirarte"}
          </Text>
          <View style={styles.grid}>
            {filtered.map((recipe) => {
              const isAi = recipe.source === "ai";
              return (
                <Pressable
                  key={`${recipe.source || "catalog"}-${recipe.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={"Ver receta de " + recipe.title}
                  onPress={() =>
                    router.push({
                      pathname: "/recipes/[id]",
                      params: { id: recipe.id, source: recipe.source || "catalog" },
                    })
                  }
                  style={({ pressed }) => [
                    styles.card,
                    wide && styles.wideCard,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={[styles.icon, isAi && styles.iconAi]}>
                      {isAi ? (
                        <Sparkles size={23} color="#4F46E5" />
                      ) : (
                        <ChefHat size={25} color={colors.primary} />
                      )}
                    </View>
                    <View style={styles.cardHeaderRight}>
                      {isAi && (
                        <View style={styles.aiBadge}>
                          <Text style={styles.aiBadgeText}>
                            {recipe.isFavorite ? "★ IA" : "IA"}
                          </Text>
                        </View>
                      )}
                      {activePreferencesCount > 0 &&
                        (() => {
                          const { compatible, alerts } = isRecipeCompatible(
                            recipe,
                            restrictions,
                            customAllergies
                          );
                          return (
                            <View
                              style={[
                                styles.recipeBadge,
                                compatible
                                  ? styles.recipeBadgeSuccess
                                  : styles.recipeBadgeWarning,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.recipeBadgeText,
                                  compatible
                                    ? styles.recipeBadgeTextSuccess
                                    : styles.recipeBadgeTextWarning,
                                ]}
                              >
                                {compatible
                                  ? "✓ Compatible"
                                  : `⚠️ ${alerts[0]?.label || "Alérgeno"}`}
                              </Text>
                            </View>
                          );
                        })()}
                      <View style={styles.time}>
                        <Clock3 size={13} color={colors.textSecondary} />
                        <Text style={styles.timeText}>
                          {recipe.prepTimeMinutes} min
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.categoryRow}>
                    <Text style={styles.category}>
                      {labels[recipe.mealType]}
                    </Text>
                    {recipe.isFavorite && (
                      <Star size={14} color="#F59E0B" fill="#F59E0B" />
                    )}
                  </View>

                  <Text style={styles.recipeTitle}>{recipe.title}</Text>
                  <Text style={styles.recipeDescription} numberOfLines={2}>
                    {recipe.description || "Receta personalizada para tus objetivos."}
                  </Text>
                  <View style={styles.nutrients}>
                    <Text style={styles.calories}>
                      {Math.round(recipe.caloriesPerServing)}{" "}
                      <Text style={styles.calorieUnit}>kcal / porción</Text>
                    </Text>
                    <Text style={styles.protein}>
                      {Math.round(recipe.proteinPerServing)} g proteína
                    </Text>
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={styles.detailsRow}>
                      <Text style={styles.details}>
                        Ver ingredientes y preparación
                      </Text>
                      <ArrowUpRight size={17} color={colors.primary} />
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Agregar ingredientes de ${recipe.title} a la lista de compras`}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        void addRecipeIngredients({
                          recipe,
                          servings: recipe.servings || 1,
                        })
                          .then(() => {
                            showToast({
                              type: "success",
                              title: "¡Sumada a Compras!",
                              message: `Ingredientes de "${recipe.title}" agregados a tu lista.`,
                            });
                          })
                          .catch((err: any) => {
                            showToast({
                              type: "error",
                              title: "Error al sumar ingredientes",
                              message: err?.message,
                            });
                          });
                      }}
                      style={styles.addToListBtn}
                    >
                      <Plus size={13} color={colors.primary} strokeWidth={2.5} />
                      <Text style={styles.addToListBtnText}>+ Compras</Text>
                    </Pressable>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      <AiRecipeGeneratorModal
        visible={generatorVisible}
        defaultMealType={selectedType}
        onClose={() => setGeneratorVisible(false)}
        onGenerated={(created) => {
          setGeneratorVisible(false);
          setSourceTab("ai");
          router.push({
            pathname: "/recipes/[id]",
            params: { id: created.id, source: "ai" },
          });
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { ...layout.page },
  topActionsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    paddingRight: 8,
  },
  backText: { fontSize: 13, fontWeight: "600", color: colors.primary },
  topRightBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  shoppingBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
  },
  shoppingBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  generateBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  sourceTabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  sourceTabChip: {
    minHeight: 38,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    justifyContent: "center",
  },
  sourceTabChipActive: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  sourceTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  sourceTabTextActive: {
    color: "#FFFFFF",
  },
  filters: { gap: 8, paddingBottom: 12, marginBottom: 10 },
  chip: {
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 13,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  activeChip: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  activeText: { color: "#FFFFFF" },
  loading: { marginVertical: 60 },
  results: { fontSize: 12, color: colors.textSecondary, marginBottom: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  card: {
    width: "100%",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 22,
    padding: 22,
  },
  wideCard: { flexGrow: 1, flexBasis: "45%", maxWidth: "49%" },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  cardHeaderRight: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  aiBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  aiBadgeText: { fontSize: 10, fontWeight: "800", color: "#4F46E5" },
  recipeBadge: { paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6 },
  recipeBadgeSuccess: { backgroundColor: "#DCFCE7" },
  recipeBadgeWarning: { backgroundColor: "#FEF3C7" },
  recipeBadgeText: { fontSize: 10, fontWeight: "700" },
  recipeBadgeTextSuccess: { color: "#166534" },
  recipeBadgeTextWarning: { color: "#92400E" },
  icon: {
    width: 52,
    height: 52,
    backgroundColor: colors.primaryLight,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  iconAi: {
    backgroundColor: "#EEF2FF",
  },
  time: { flexDirection: "row", alignItems: "center", gap: 5 },
  timeText: { fontSize: 11, color: colors.textSecondary },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  category: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.primary,
  },
  recipeTitle: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
    letterSpacing: -0.5,
    color: colors.text,
    marginBottom: 8,
  },
  recipeDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  nutrients: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
    marginBottom: 18,
  },
  calories: { fontSize: 18, fontWeight: "700", color: colors.text },
  calorieUnit: { fontSize: 11, fontWeight: "400", color: colors.textSecondary },
  protein: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.protein,
    backgroundColor: colors.proteinLight,
    padding: 7,
    borderRadius: 9,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: 140,
  },
  details: { fontSize: 12, fontWeight: "600", color: colors.primary },
  addToListBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 10,
    backgroundColor: colors.primaryGhost,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  addToListBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  addToListBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  addToListBtnTextActive: {
    color: colors.primaryDark,
    fontWeight: "800",
  },
});
